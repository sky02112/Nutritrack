import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  ScrollView, 
  Platform, 
  Modal,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { useAuth } from '../store/AuthContext';
import { getStudentByStudentId } from '../services/studentService';
import { serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('student');
  const [accessKey, setAccessKey] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentDataFetched, setStudentDataFetched] = useState(false);
  const [fetchingStudentData, setFetchingStudentData] = useState(false);
  const navigation = useNavigation();
  const { login, signup, isAuthenticated } = useAuth();
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  
  // Remove animation effect
  useEffect(() => {
    // Animation removed
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('MainApp');
    }
  }, [isAuthenticated, navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { user, error } = await login(email, password);
      
      if (error) {
        Alert.alert('Login Error', error.message);
      }
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentIdChange = async (value) => {
    setStudentId(value);
    
    // Auto-verify after 5 characters for better UX
    if (value && value.length >= 5 && !studentDataFetched && !fetchingStudentData) {
      setFetchingStudentData(true);
      
      try {
        const { student, error, devMode } = await getStudentByStudentId(value);
        
        if (student) {
          setStudentDataFetched(true);
          // If we found a student and they don't have a name, use student ID
          if (!displayName.trim()) {
            setDisplayName(`Student ${value}`);
          }
        } else if (error) {
          console.log('Error fetching student data:', error);
        }
      } catch (error) {
        console.error('Error checking student ID:', error);
      } finally {
        setFetchingStudentData(false);
      }
    }
  };

  const handleRegister = async () => {
    // Validate inputs - different validation based on role
    if (role === 'student') {
      // For students, only email, password and student ID are required
      if (!registerEmail || !registerPassword || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      if (!studentId) {
        Alert.alert('Error', 'Student ID is required');
        return;
      }
    } else {
      // For other roles, display name is also required
      if (!registerEmail || !registerPassword || !confirmPassword || !displayName) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    }

    if (registerPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (registerPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Validate access key for admin and teacher roles
    if ((role === 'admin' || role === 'teacher') && !accessKey) {
      Alert.alert('Error', 'Access key is required for admin and teacher registration');
      return;
    }
    
    // For student role, use student ID as display name if no name provided
    let finalDisplayName = displayName;
    if (role === 'student' && !displayName.trim()) {
      finalDisplayName = `Student ${studentId}`;
    }
    
    setLoading(true);
    try {
      const userInfo = {
        displayName: finalDisplayName,
        role,
        studentId: role === 'student' ? studentId : null,
        accessKey: (role === 'admin' || role === 'teacher') ? accessKey : null,
        createdAt: serverTimestamp()
      };

      const { user, error } = await signup(registerEmail, registerPassword, userInfo);
      
      if (error) {
        Alert.alert('Registration Error', error.message);
      } else {
        Alert.alert('Success', 'Account created successfully');
        // Clear registration form
        setRegisterEmail('');
        setRegisterPassword('');
        setConfirmPassword('');
        setDisplayName('');
        setRole('student');
        setAccessKey('');
        setStudentId('');
        setStudentDataFetched(false);
        // Close registration modal
        setShowRegister(false);
      }
    } catch (error) {
      Alert.alert('Registration Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Password Reset', 'Check your email for password reset instructions');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaWrapper backgroundColor="transparent" statusBarStyle="light-content">
      <LinearGradient
        colors={['#1565C0', '#0D47A1']}
        style={styles.gradientContainer}
      >
        <StatusBar style="light" />
        
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.logoContainer,
                {
                  opacity: 1,
                  transform: [{ translateY: 0 }]
                }
              ]}
            >
              <Text style={styles.appTitle}>NutriTrack</Text>
              <Text style={styles.appTagline}>Smart Wellness Platform</Text>
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.formCard,
                {
                  opacity: 1,
                  transform: [{ translateY: 0 }]
                }
              ]}
            >
              <Text style={styles.welcomeText}>Welcome</Text>
              <Text style={styles.instructionText}>Sign in to continue</Text>
              
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <FontAwesome5 name="envelope" size={18} color="#1565C0" style={styles.inputIcon} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#A0A0A0"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <FontAwesome5 name="lock" size={18} color="#1565C0" style={styles.inputIcon} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#A0A0A0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              
              <TouchableOpacity 
                style={styles.loginButton} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.forgotPasswordLink}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
              
              <View style={styles.registerContainer}>
                <Text style={styles.noAccountText}>Don't have an account?</Text>
                <TouchableOpacity 
                  onPress={() => setShowRegister(true)}
                >
                  <Text style={styles.registerText}>Register</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Registration Modal */}
        <Modal
          visible={showRegister}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRegister(false)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Account</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    setShowRegister(false);
                    // Reset form
                    setRegisterEmail('');
                    setRegisterPassword('');
                    setConfirmPassword('');
                    setDisplayName('');
                    setRole('student');
                    setAccessKey('');
                    setStudentId('');
                    setStudentDataFetched(false);
                  }}
                >
                  <FontAwesome5 name="times" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Account Information</Text>
                
                  {/* Only show name field for non-student roles */}
                  {role !== 'student' && (
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Full Name"
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="words"
                    />
                  )}
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Email Address"
                    value={registerEmail}
                    onChangeText={setRegisterEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Password (min 6 characters)"
                    value={registerPassword}
                    onChangeText={setRegisterPassword}
                    secureTextEntry
                  />
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
                
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Account Type</Text>
                
                  {/* Role Selection */}
                  <View style={styles.roleSelectionContainer}>
                    <Text style={styles.roleLabel}>Select Role:</Text>
                    
                    {/* Custom Role Selector */}
                    <TouchableOpacity 
                      style={styles.customRoleSelector}
                      onPress={() => {
                        // This TouchableOpacity wraps the Picker to ensure it's visible
                        // The actual Picker should still be clickable
                      }}
                    >
                      <View style={styles.roleSelectorContent}>
                        <View style={styles.pickerIcon}>
                          <FontAwesome5 
                            name={
                              role === 'student' ? 'user-graduate' :
                              role === 'nurse' ? 'user-md' :
                              role === 'teacher' ? 'chalkboard-teacher' : 'user-shield'
                            } 
                            size={16} 
                            color="#1565C0" 
                          />
                        </View>
                        <Text style={styles.selectedRoleText}>
                          {role === 'student' ? 'Student' :
                           role === 'nurse' ? 'School Nurse' :
                           role === 'teacher' ? 'Teacher' : 'Administrator'}
                        </Text>
                        <View style={styles.dropdownIcon}>
                          <FontAwesome5 name="chevron-down" size={14} color="#1565C0" />
                        </View>
                      </View>
                      
                      {/* The actual Picker is transparent and positioned on top of our custom UI */}
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={role}
                          onValueChange={(itemValue) => {
                            setRole(itemValue);
                            // Clear access key if switching to non-admin/teacher role
                            if (itemValue !== 'admin' && itemValue !== 'teacher') {
                              setAccessKey('');
                            }
                            // Reset student data if not a student
                            if (itemValue !== 'student') {
                              setStudentId('');
                              setStudentDataFetched(false);
                            }
                          }}
                          style={styles.invisiblePicker}
                          dropdownIconColor="transparent"
                        >
                          <Picker.Item label="Student" value="student" />
                          <Picker.Item label="School Nurse" value="nurse" />
                          <Picker.Item label="Teacher" value="teacher" />
                          <Picker.Item label="Administrator" value="admin" />
                        </Picker>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Role-specific Information */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>
                    {role === 'student' 
                      ? 'Student Information' 
                      : (role === 'admin' || role === 'teacher') 
                        ? 'Authentication' 
                        : 'Additional Information'}
                  </Text>

                  {/* Student ID field - only shown for student role */}
                  {role === 'student' && (
                    <View style={styles.studentIdWrapper}>
                      <View style={styles.studentIdContainer}>
                        <TextInput
                          style={styles.studentIdInput}
                          placeholder="Enter Student ID"
                          value={studentId}
                          onChangeText={handleStudentIdChange}
                          keyboardType="numeric"
                        />
                        <View style={styles.studentIdStatus}>
                          {studentDataFetched ? (
                            <FontAwesome5 name="check-circle" size={20} color="#4CAF50" />
                          ) : null}
                        </View>
                      </View>
                      <Text style={styles.studentIdHint}>
                        Enter your student ID to link your account
                      </Text>
                    </View>
                  )}
                  
                  {/* Access key field - only shown for admin/teacher roles */}
                  {(role === 'admin' || role === 'teacher') && (
                    <View>
                      <TextInput
                        style={styles.modalInput}
                        placeholder={`${role === 'admin' ? 'Admin' : 'Teacher'} Access Key`}
                        value={accessKey}
                        onChangeText={setAccessKey}
                        secureTextEntry
                      />
                      <Text style={styles.accessKeyHint}>
                        Contact administrator for access key
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Register Button */}
                <TouchableOpacity 
                  style={[styles.registerFullButton, loading && styles.disabledButton]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  appTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2.22,
    overflow: 'hidden',
  },
  inputIconContainer: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 101, 192, 0.08)',
  },
  inputIcon: {
    width: 20,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordLink: {
    alignSelf: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAccountText: {
    color: '#666',
    fontSize: 14,
    marginRight: 5,
  },
  registerText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '90%',
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    padding: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  closeButton: {
    padding: 5,
  },
  modalScrollView: {
    padding: 15,
  },
  formSection: {
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    marginBottom: 10,
  },
  roleSelectionContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  customRoleSelector: {
    height: 50,
    borderWidth: 1,
    borderColor: '#1565C0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roleSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
  },
  pickerIcon: {
    marginRight: 10,
  },
  selectedRoleText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  dropdownIcon: {
    paddingRight: 5,
  },
  pickerWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  invisiblePicker: {
    opacity: 0,
    height: '100%',
    width: '100%',
  },
  studentIdWrapper: {
    marginBottom: 5,
  },
  studentIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  studentIdInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  studentIdStatus: {
    width: 40,
    alignItems: 'center',
  },
  studentIdHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  accessKeyHint: {
    fontSize: 12,
    color: '#666',
    marginTop: -5,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  registerFullButton: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#90CAF9',
  },
});

export default LoginScreen;