import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../store/AuthContext';
import { changePassword } from '../services/authService';
import { addNutritionLog } from '../services/dataService';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';

const ProfileScreen = () => {
  const { currentUser, userDetails, isAdmin, isTeacher, isNurse, isStudent, logout } = useAuth();
  const navigation = useNavigation();
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [isAddNutritionVisible, setIsAddNutritionVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Nutrition log state
  const [nutritionData, setNutritionData] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    notes: ''
  });
  const [nutritionError, setNutritionError] = useState('');
  
  const handleLogout = async () => {
    try {
      setLoading(true);
      const { success, error } = await logout();
      if (error) {
        Alert.alert('Logout Error', error.message);
      } else {
        // Navigate to Auth screen which contains the Login screen
        // Use replace to prevent going back to the authenticated screens
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    } catch (error) {
      Alert.alert('Logout Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const getUserRole = () => {
    if (isAdmin) return 'Administrator';
    if (isTeacher) return 'Teacher';
    if (isNurse) return 'School Nurse';
    if (isStudent) return 'Student';
    return 'Unknown Role';
  };
  
  const handleChangePassword = async () => {
    setPasswordError('');
    
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const { success, error } = await changePassword(currentPassword, newPassword);
      
      if (error) {
        if (error.code === 'auth/wrong-password') {
          setPasswordError('Current password is incorrect');
        } else {
          setPasswordError(error.message);
        }
      } else {
        Alert.alert('Success', 'Password updated successfully');
        setIsChangePasswordVisible(false);
        resetPasswordForm();
      }
    } catch (error) {
      setPasswordError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };
  
  const resetNutritionForm = () => {
    setNutritionData({
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      notes: ''
    });
    setNutritionError('');
  };
  
  const handleNutritionChange = (field, value) => {
    setNutritionData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleAddNutrition = async () => {
    setNutritionError('');
    
    // Validate inputs
    if (!nutritionData.calories) {
      setNutritionError('Calories field is required');
      return;
    }
    
    // Convert string values to numbers
    const nutritionPayload = {
      calories: parseInt(nutritionData.calories) || 0,
      protein: parseInt(nutritionData.protein) || 0,
      carbs: parseInt(nutritionData.carbs) || 0,
      fat: parseInt(nutritionData.fat) || 0,
      notes: nutritionData.notes || '',
      date: new Date() // Use current date
    };
    
    setLoading(true);
    try {
      const { success, error, id } = await addNutritionLog(currentUser.uid, nutritionPayload);
      
      if (error) {
        setNutritionError('Failed to add nutrition log: ' + error.message);
      } else {
        Alert.alert('Success', 'Nutrition log added successfully');
        setIsAddNutritionVisible(false);
        resetNutritionForm();
        
        // Navigate to the dashboard to see the updated logs
        navigation.navigate('StudentDashboard');
      }
    } catch (error) {
      setNutritionError('Failed to add nutrition log. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaWrapper
      backgroundColor="#F5F7FA"
      statusBarStyle="dark-content"
    >
      <StatusBar style="dark" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <FontAwesome5 name="user-alt" size={40} color="#1565C0" />
            </View>
          </View>
          
          <Text style={styles.userName}>
            {userDetails?.displayName || currentUser?.displayName || 'User'}
          </Text>
          <Text style={styles.userRole}>{getUserRole()}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoItem}>
            <FontAwesome5 name="envelope" size={16} color="#1565C0" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{currentUser?.email}</Text>
          </View>
          
          {userDetails?.createdAt && (
            <View style={styles.infoItem}>
              <FontAwesome5 name="calendar-alt" size={16} color="#1565C0" style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Joined:</Text>
              <Text style={styles.infoValue}>
                {new Date(userDetails.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        
        {isStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition Tracking</Text>
            
            <TouchableOpacity 
              style={styles.nutritionButton}
              onPress={() => setIsAddNutritionVisible(true)}
            >
              <FontAwesome5 name="apple-alt" size={16} color="#4CAF50" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Add Nutrition Log</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.nutritionButton}
              onPress={() => navigation.navigate('StudentDashboard')}
            >
              <FontAwesome5 name="chart-line" size={16} color="#2196F3" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>View My Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.infoItem}>
            <FontAwesome5 name="info-circle" size={16} color="#1565C0" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoItem}>
            <FontAwesome5 name="school" size={16} color="#1565C0" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>School:</Text>
            <Text style={styles.infoValue}>St. Michael Academy of Valenzuela</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity 
            style={styles.securityButton}
            onPress={() => setIsChangePasswordVisible(true)}
          >
            <FontAwesome5 name="lock" size={16} color="#1565C0" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome5 name="sign-out-alt" size={16} color="#fff" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 NutriTrack - All rights reserved
          </Text>
        </View>
      </ScrollView>
      
      {/* Change Password Modal */}
      <Modal
        visible={isChangePasswordVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setIsChangePasswordVisible(false);
          resetPasswordForm();
        }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password (min 6 characters)</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
              />
            </View>
            
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setIsChangePasswordVisible(false);
                  resetPasswordForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Add Nutrition Log Modal */}
      <Modal
        visible={isAddNutritionVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setIsAddNutritionVisible(false);
          resetNutritionForm();
        }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Nutrition Log</Text>
            <Text style={styles.modalSubtitle}>Enter your daily nutrition information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Calories (required)</Text>
              <TextInput
                style={styles.input}
                value={nutritionData.calories}
                onChangeText={(value) => handleNutritionChange('calories', value)}
                keyboardType="numeric"
                placeholder="Enter calories (e.g., 2000)"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={nutritionData.protein}
                onChangeText={(value) => handleNutritionChange('protein', value)}
                keyboardType="numeric"
                placeholder="Enter protein in grams"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Carbohydrates (g)</Text>
              <TextInput
                style={styles.input}
                value={nutritionData.carbs}
                onChangeText={(value) => handleNutritionChange('carbs', value)}
                keyboardType="numeric"
                placeholder="Enter carbs in grams"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Fat (g)</Text>
              <TextInput
                style={styles.input}
                value={nutritionData.fat}
                onChangeText={(value) => handleNutritionChange('fat', value)}
                keyboardType="numeric"
                placeholder="Enter fat in grams"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={nutritionData.notes}
                onChangeText={(value) => handleNutritionChange('notes', value)}
                placeholder="Enter any notes about your meals"
                multiline={true}
                numberOfLines={3}
              />
            </View>
            
            {nutritionError ? (
              <Text style={styles.errorText}>{nutritionError}</Text>
            ) : null}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setIsAddNutritionVisible(false);
                  resetNutritionForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={handleAddNutrition}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Log</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1565C0',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 16,
    color: '#1565C0',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoIcon: {
    marginRight: 10,
    width: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#555',
    width: 60,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  buttonIcon: {
    marginRight: 10,
    width: 20,
  },
  buttonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  securityNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1565C0',
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#90CAF9',
  },
  debugContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  debugInfo: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  nutritionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
});

// Export the component directly
export default ProfileScreen; 