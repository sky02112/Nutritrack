import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { db, auth, functions } from '../services/firebase';
import { useAuth } from '../store/AuthContext';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';

const AdminScreen = () => {
  const { isAdmin, userDetails } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editedRole, setEditedRole] = useState('');
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page');
      return;
    }
    
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersCollection = collection(db, 'users');
      const userSnapshot = await getDocs(usersCollection);
      const usersList = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setEditedRole(user.role || '');
    setModalVisible(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        role: editedRole
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id ? { ...user, role: editedRole } : user
      ));
      
      Alert.alert('Success', 'User role updated successfully');
      setModalVisible(false);
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const userRef = doc(db, 'users', userId);
              await deleteDoc(userRef);
              
              // Update local state
              setUsers(users.filter(user => user.id !== userId));
              
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleResetPassword = (user) => {
    setUserToResetPassword(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setResetPasswordModalVisible(true);
  };

  const confirmResetPassword = async () => {
    if (!userToResetPassword) return;
    
    setLoading(true);
    try {
      // Instead of sending directly, generate reset instructions for the admin
      // to provide to the user
      
      // Log the admin action in the password_resets collection (which admins have permission to access)
      const resetLogRef = collection(db, 'password_resets');
      await addDoc(resetLogRef, {
        adminId: auth.currentUser.uid,
        userEmail: userToResetPassword.email,
        userId: userToResetPassword.id,
        timestamp: new Date(),
        status: 'instructed',
        method: 'manual_instructions'
      });

      Alert.alert(
        'Password Reset Instructions', 
        `Please provide these instructions to the user:\n\n1. Go to the login screen in the app\n2. Tap "Forgot Password"\n3. Enter email: ${userToResetPassword.email}\n\nThe user will receive an email with instructions to reset their password.`,
        [
          { 
            text: 'OK',
            onPress: () => {
              setResetPasswordModalVisible(false);
              setNewPassword('');
              setConfirmPassword('');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error preparing reset instructions:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setPasswordError(`Failed to prepare reset instructions: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const displayName = user.displayName || '';
    const email = user.email || '';
    const role = user.role || '';
    const query = searchQuery.toLowerCase();
    
    return displayName.toLowerCase().includes(query) || 
           email.toLowerCase().includes(query) || 
           role.toLowerCase().includes(query);
  });

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return styles.adminBadge;
      case 'teacher':
        return styles.teacherBadge;
      case 'nurse':
        return styles.nurseBadge;
      case 'student':
        return styles.studentBadge;
      default:
        return styles.defaultBadge;
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.badgeContainer}>
          <View style={[styles.roleBadge, getRoleBadgeStyle(item.role)]}>
            <Text style={styles.roleBadgeText}>{item.role || 'Unknown'}</Text>
          </View>
          {item.createdAt && (
            <Text style={styles.createdDate}>
              Joined: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleResetPassword(item)}
        >
          <FontAwesome5 name="key" size={16} color="#1565C0" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditRole(item)}
        >
          <FontAwesome5 name="edit" size={16} color="#1565C0" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteUser(item.id)}
        >
          <FontAwesome5 name="trash-alt" size={16} color="#E53935" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAdmin) {
    return (
      <SafeAreaWrapper backgroundColor="#EAF2FF" statusBarStyle="dark-content">
        <View style={styles.centeredContainer}>
          <FontAwesome5 name="lock" size={50} color="#1565C0" />
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>
            You do not have permission to access this page
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (loading && users.length === 0) {
    return (
      <SafeAreaWrapper backgroundColor="#EAF2FF" statusBarStyle="dark-content">
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper backgroundColor="#F0F6FF" statusBarStyle="dark-content">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {loading && users.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1565C0" />
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            )}
          />
        )}
        
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Edit User Role</Text>
              
              {selectedUser && (
                <View style={styles.selectedUserInfo}>
                  <Text style={styles.selectedUserName}>{selectedUser.displayName}</Text>
                  <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                </View>
              )}
              
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Select Role:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editedRole}
                    onValueChange={(itemValue) => setEditedRole(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Administrator" value="admin" />
                    <Picker.Item label="Teacher" value="teacher" />
                    <Picker.Item label="School Nurse" value="nurse" />
                    <Picker.Item label="Student" value="student" />
                  </Picker>
                </View>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleUpdateRole}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        <Modal
          animationType="fade"
          transparent={true}
          visible={resetPasswordModalVisible}
          onRequestClose={() => setResetPasswordModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Reset User Password</Text>
              
              {userToResetPassword && (
                <View style={styles.selectedUserInfo}>
                  <Text style={styles.selectedUserName}>{userToResetPassword.displayName}</Text>
                  <Text style={styles.selectedUserEmail}>{userToResetPassword.email}</Text>
                </View>
              )}
              
              <Text style={styles.resetPasswordInfo}>
                You'll receive instructions on how to guide this user through 
                resetting their password using the standard forgot password flow.
              </Text>
              
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setResetPasswordModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={confirmResetPassword}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Preparing...' : 'Get Instructions'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F6FF',
  },
  header: {
    padding: 15,
    backgroundColor: '#1565C0',
    borderBottomWidth: 1,
    borderBottomColor: '#0D47A1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#E3F2FD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    elevation: 2,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  list: {
    padding: 15,
  },
  userItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 10,
  },
  adminBadge: {
    backgroundColor: '#1565C0',
  },
  teacherBadge: {
    backgroundColor: '#1976D2',
  },
  nurseBadge: {
    backgroundColor: '#42A5F5',
  },
  studentBadge: {
    backgroundColor: '#64B5F6',
  },
  defaultBadge: {
    backgroundColor: '#90CAF9',
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  createdDate: {
    fontSize: 12,
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 10,
    marginLeft: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 15,
    textAlign: 'center',
  },
  selectedUserInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedUserEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  formField: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#1565C0',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1565C0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#F0F8FF',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  errorText: {
    color: '#E53935',
    fontSize: 14,
    marginBottom: 15,
  },
  resetPasswordInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  textInput: {
    backgroundColor: '#F0F8FF',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#EAF2FF',
  },
  accessDeniedText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1565C0',
    marginTop: 20,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#555',
    marginTop: 15,
  },
});

export default AdminScreen; 