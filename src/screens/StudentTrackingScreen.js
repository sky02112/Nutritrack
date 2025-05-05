import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Modal,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Platform,
  BackHandler
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { 
  getAllStudents, 
  addHealthRecord, 
  getHealthRecords, 
  calculateBMI,
  getBMIStatus,
  calculateAge,
  deleteStudent,
  deleteHealthRecord,
  addStudent
} from '../services/studentService';
import { useAuth } from '../store/AuthContext';
import { PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { useSyncContext } from '../store/SyncContext';
import { Picker } from '@react-native-picker/picker';
import SafeAreaWrapper from '../components/SafeAreaWrapper';

const getBMIPercentile = (bmi, records) => {
  if (!records || records.length === 0) return 0;
  
  const allBMIs = records.map(record => {
    const height = parseFloat(record.height);
    const weight = parseFloat(record.weight);
    return calculateBMI(weight, height);
  }).filter(bmi => !isNaN(bmi));
  
  const belowCurrent = allBMIs.filter(b => b <= bmi).length;
  return ((belowCurrent / allBMIs.length) * 100).toFixed(2);
};

// Get status color based on BMI status
const getStatusColor = (status) => {
  if (!status) return '#757575';
  
  switch (status) {
    case 'Normal':
      return '#4CAF50';
    case 'Severely Underweight':
    case 'Underweight':
      return '#FFC107';
    case 'At Risk of Overweight':
      return '#FF9800';
    case 'Overweight':
    case 'Obese':
    case 'Obese Class I':
    case 'Obese Class II':
    case 'Obese Class III':
      return '#F44336';
    default:
      return '#757575';
  }
};

// A simple form input component
const FormInput = ({ label, value, onChangeText, placeholder, keyboardType, maxLength, autoCapitalize, icon }) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType || 'default'}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize || 'none'}
        />
        <View style={styles.inputIcon}>
          <Text style={styles.inputIconText}>{icon}</Text>
        </View>
      </View>
    </View>
  );
};

const StudentTrackingScreen = ({ route, navigation }) => {
  const { userDetails, isAdmin, isTeacher } = useAuth();
  const { lastSyncTime, isSyncing } = useSyncContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [bmiStats, setBmiStats] = useState({ good: 0, average: 0, needsImprovement: 0 });
  const [bmiPreview, setBmiPreview] = useState({ bmi: null, status: null });
  const [showHealthRecords, setShowHealthRecords] = useState(false);
  const [healthRecordsModalVisible, setHealthRecordsModalVisible] = useState(false);
  const [healthRecord, setHealthRecord] = useState({
    height: '',
    weight: '',
    bloodPressure: '',
    notes: '',
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const [studentHealthData, setStudentHealthData] = useState({});  // Cache for student health data
  
  // Add student modal state
  const [isAddStudentModalVisible, setIsAddStudentModalVisible] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState('');
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    grade: '3',
    studentId: '',
    gender: 'male',
    birthDate: '',
    age: '',
    section: '',
    height: '',
    weight: ''
  });
  
  // Filter options
  const filters = [
    { id: 'all', label: 'All Status' },
    { id: 'normal', label: 'Normal' },
    { id: 'underweight', label: 'Underweight' },
    { id: 'overweight', label: 'Overweight' }
  ];

  // Function to handle filter selection
  const handleFilterSelect = (filterId) => {
    setActiveFilter(filterId);
  };
  
  // Handle form input changes for add student
  const handleInputChange = (field, value) => {
    setNewStudent(prev => {
      const updated = {...prev, [field]: value};
      
      // Calculate BMI preview when height or weight changes
      if ((field === 'height' || field === 'weight') && (updated.height || updated.weight)) {
        const height = parseFloat(updated.height);
        const weight = parseFloat(updated.weight);
        
        // Only calculate and show BMI when both values are reasonable
        if (!isNaN(height) && !isNaN(weight) && height >= 50 && weight >= 10) {
          const bmi = calculateBMI(weight, height);
          
          // Get age from birthdate if available
          let birthDate = null;
          if (updated.birthDate && updated.birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = updated.birthDate.split('-').map(Number);
            birthDate = new Date(year, month - 1, day);
          }
          
          // Get BMI status based on age (if available) and gender
          const age = birthDate ? calculateAge(birthDate) : null;
          const status = getBMIStatus(bmi, age, updated.gender);
          setBmiPreview({ bmi, status });
        } else {
          // Hide BMI preview if values aren't reasonable
          setBmiPreview({ bmi: null, status: null });
        }
      }
      
      return updated;
    });
  };

  const handleBirthDateChange = (text) => {
    // Format the text as the user types to enforce YYYY-MM-DD pattern
    // Only allow digits and hyphens
    const cleaned = text.replace(/[^\d-]/g, '');
    
    // Auto-add hyphens after YYYY and MM
    let formatted = cleaned;
    if (cleaned.length === 4 && !cleaned.includes('-') && text.length < cleaned.length + 1) {
      formatted = `${cleaned}-`;
    } else if (cleaned.length === 7 && cleaned.charAt(4) === '-' && cleaned.charAt(7) !== '-' && text.length < cleaned.length + 1) {
      formatted = `${cleaned}-`;
    }
    
    // Store the formatted text
    setNewStudent(prev => ({...prev, birthDate: formatted}));
    
    // Try to calculate age if the format is complete
    if (formatted.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = formatted.split('-').map(Number);
      const birthdate = new Date(year, month - 1, day); // month is 0-based in Date constructor
      const age = calculateAge(birthdate);
      if (age !== null) {
        setNewStudent(prev => ({...prev, age: age.toString()}));
        setCalculatedAge(age.toString());
      } else {
        setCalculatedAge('');
      }
    } else {
      setCalculatedAge('');
    }
  };
  
  const handleGradeChange = (value) => {
    setNewStudent(prev => ({...prev, grade: value}));
  };
  
  const handleGenderChange = (value) => {
    setNewStudent(prev => ({...prev, gender: value}));
  };
  
  // Handle add student form submission
  const handleAddStudent = async () => {
    // Validate inputs
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.studentId || !newStudent.section) {
      Alert.alert("Error", "Please fill in all required fields (First Name, Last Name, Student ID, and Section).");
      return;
    }

    // Validate height and weight if provided
    if (newStudent.height && (isNaN(newStudent.height) || parseFloat(newStudent.height) <= 0 || parseFloat(newStudent.height) > 250)) {
      Alert.alert("Error", "Height must be a valid number between 1 and 250 cm.");
      return;
    }

    if (newStudent.weight && (isNaN(newStudent.weight) || parseFloat(newStudent.weight) <= 0 || parseFloat(newStudent.weight) > 150)) {
      Alert.alert("Error", "Weight must be a valid number between 1 and 150 kg.");
      return;
    }

    setLoading(true);
    try {
      const { id, error } = await addStudent(newStudent);
      
      if (error) {
        Alert.alert("Error", "Failed to add student: " + error.message);
      } else {
        // Close modal and reset form
        setIsAddStudentModalVisible(false);
        
        // Show success message
        Alert.alert(
          "Success",
          `Student ${newStudent.firstName} ${newStudent.lastName} has been added successfully.`,
          [
            {
              text: "OK",
              onPress: () => {
                // Reset form data after user acknowledges
                setNewStudent({
                  firstName: '',
                  lastName: '',
                  grade: '3',
                  studentId: '',
                  gender: 'male',
                  birthDate: '',
                  age: '',
                  section: '',
                  height: '',
                  weight: ''
                });
                setCalculatedAge('');
                setBmiPreview(null);
                // Refresh the student list
                fetchStudents();
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  useFocusEffect(
    useCallback(() => {
      fetchStudents().then(() => {
        if (route.params?.studentId) {
          const student = students.find(s => s.id === route.params.studentId);
          if (student) {
            handleStudentSelect(student);
          }
        } else if (route.params?.sectionFilter) {
          // If section filter is provided, set the active filter to 'all' to show all statuses
          // but we'll filter by section in filteredStudents
          setActiveFilter('all');
          setSearchQuery('');
        } else {
          fetchAllHealthRecords();
        }
      });
    }, [route.params?.studentId, route.params?.sectionFilter, fetchAllHealthRecords])
  );
  
  useEffect(() => {
    const syncHandler = () => {
      if (selectedStudent) {
        fetchStudentHealthRecords(selectedStudent.id);
      } else {
        fetchStudents();
      }
    };
    
    if (global.eventEmitter) {
      global.eventEmitter.addListener('SYNC_DATA', syncHandler);
    }
    
    return () => {
      if (global.eventEmitter) {
        global.eventEmitter.removeListener('SYNC_DATA', syncHandler);
      }
    };
  }, [selectedStudent]);
  
  useEffect(() => {
    // Add hardware back button handler for Android
    const backHandler = () => {
      if (selectedStudent) {
        setSelectedStudent(null);
        return true; // Prevent default behavior (exiting the app)
      }
      return false; // Allow default behavior when no student is selected
    };
    
    // Subscribe to hardware back button press events
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', backHandler);
    }
    
    return () => {
      if (Platform.OS === 'android') {
        BackHandler.removeEventListener('hardwareBackPress', backHandler);
      }
    };
  }, [selectedStudent]);
  
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { students, error } = await getAllStudents();
      if (error) {
        console.error('Error fetching students:', error);
      } else {
        setStudents(students || []);
        
        // Fetch health records for each student
        await Promise.all(
          students.map(async (student) => {
            await fetchAndCacheHealthRecords(student.id);
          })
        );

        if (route.params?.studentId && !selectedStudent) {
          const student = students.find(s => s.id === route.params.studentId);
          if (student) {
            handleStudentSelect(student);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateBmiStats = (records) => {
    const stats = {
      normal: 0,
      underweight: 0,
      atRisk: 0,
      overweight: 0
    };
    
    if (!selectedStudent) return stats;
    
    const birthdate = selectedStudent.birthdate?.toDate() || new Date();
    const age = calculateAge(birthdate);
    
    records.forEach(record => {
      try {
        const height = parseFloat(record.height);
        const weight = parseFloat(record.weight);
        
        if (!isNaN(height) && !isNaN(weight) && height > 0) {
          const bmi = calculateBMI(weight, height);
          const status = getBMIStatus(bmi, age, selectedStudent.gender);
          
          switch (status) {
            case 'Normal':
              stats.normal++;
              break;
            case 'Underweight':
              stats.underweight++;
              break;
            case 'At Risk of Overweight':
              stats.atRisk++;
              break;
            case 'Overweight':
            case 'Obese':
              stats.overweight++;
              break;
          }
        }
      } catch (e) {
        console.error("Error calculating BMI category:", e);
      }
    });
    
    return stats;
  };
  
  const calculateAverageMetrics = (records) => {
    if (!records || records.length === 0) {
      return { avgHeight: 0, avgWeight: 0, avgBmi: 0, lastRecord: null };
    }
    
    let totalHeight = 0;
    let totalWeight = 0;
    let totalBmi = 0;
    let validRecords = 0;
    
    const lastRecord = records[0];
    
    records.forEach(record => {
      const height = parseFloat(record.height);
      const weight = parseFloat(record.weight);
      
      if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
        totalHeight += height;
        totalWeight += weight;
        totalBmi += calculateBMI(weight, height);
        validRecords++;
      }
    });
    
    return {
      avgHeight: validRecords > 0 ? (totalHeight / validRecords).toFixed(1) : 0,
      avgWeight: validRecords > 0 ? (totalWeight / validRecords).toFixed(1) : 0,
      avgBmi: validRecords > 0 ? (totalBmi / validRecords).toFixed(1) : 0,
      lastRecord
    };
  };
  
  const fetchStudentHealthRecords = async (studentId) => {
    try {
      const { records, error } = await getHealthRecords(studentId);
      if (error) {
        console.error('Error fetching health records:', error);
      } else {
        // Deduplicate records by ID
        const uniqueRecords = [];
        const seenIds = new Set();
        
        // Only add records with unique IDs
        records.forEach(record => {
          if (record.id && !seenIds.has(record.id)) {
            seenIds.add(record.id);
            uniqueRecords.push(record);
          }
        });
        
        // Sort records by date (most recent first)
        uniqueRecords.sort((a, b) => {
          const dateA = a.date?.toDate?.() || new Date(a.date);
          const dateB = b.date?.toDate?.() || new Date(b.date);
          return dateB - dateA;
        });

        // Get the latest record
        const latestRecord = uniqueRecords[0] || null;
        
        setHealthRecords(uniqueRecords);
        setBmiStats(calculateBmiStats(uniqueRecords));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  const fetchAllHealthRecords = useCallback(async () => {
    try {
      const { students, error } = await getAllStudents();
      if (error) {
        console.error('Error fetching students for health records:', error);
      } else {
        const promises = students.map(student => getHealthRecords(student.id));
        const results = await Promise.all(promises);
        
        let allRecords = [];
        results.forEach(result => {
          if (result.records && result.records.length > 0) {
            allRecords = [...allRecords, ...result.records];
          }
        });
        
        setHealthRecords(allRecords || []);
      }
    } catch (error) {
      console.error('Error fetching all health records:', error);
    }
  }, []);
  
  const handleStudentSelect = async (student) => {
    setSelectedStudent(student);
    
    // Check if we have cached data and it's recent (less than 5 minutes old)
    const cachedData = studentHealthData[student.id];
    const isCacheValid = cachedData && 
      (new Date() - new Date(cachedData.lastUpdated)) < 5 * 60 * 1000;

    if (isCacheValid) {
      setHealthRecords(cachedData.records);
    } else {
      // Fetch fresh data
      const { records } = await fetchAndCacheHealthRecords(student.id);
      setHealthRecords(records);
    }
  };
  
  const handleAddHealthRecord = async (values, { resetForm }) => {
    try {
      const height = parseFloat(values.height.replace(',', '.'));
      const weight = parseFloat(values.weight.replace(',', '.'));
      
      if (isNaN(height) || isNaN(weight)) {
        Alert.alert('Error', 'Please enter valid numbers for height and weight');
        return;
      }
      
      const { id, error } = await addHealthRecord(selectedStudent.id, {
        height,
        weight,
        notes: values.notes
      });
      
      if (error) {
        Alert.alert('Error', 'Failed to save health record');
      } else {
        Alert.alert('Success', 'Health record saved successfully');
        await fetchStudentHealthRecords(selectedStudent.id);
        setModalVisible(false);
        resetForm();
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  const handleDeleteStudent = useCallback((student) => {
    Alert.alert(
      "Delete Student",
      `Are you sure you want to delete ${student.firstName} ${student.lastName}? This will also delete all health records for this student.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { success, error } = await deleteStudent(student.id);
              
              if (error) {
                Alert.alert("Error", "Failed to delete student. Please try again.");
              } else {
                if (selectedStudent && selectedStudent.id === student.id) {
                  setSelectedStudent(null);
                  setHealthRecords([]);
                }
                
                Alert.alert("Success", "Student deleted successfully");
                fetchStudents();
              }
            } catch (error) {
              Alert.alert("Error", error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [selectedStudent]);
  
  const handleDeleteHealthRecord = useCallback((recordId) => {
    Alert.alert(
      "Delete Health Record",
      "Are you sure you want to delete this health record?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { success, error } = await deleteHealthRecord(recordId);
              
              if (error) {
                Alert.alert("Error", "Failed to delete health record. Please try again.");
              } else {
                Alert.alert("Success", "Health record deleted successfully");
                if (selectedStudent) {
                  fetchStudentHealthRecords(selectedStudent.id);
                }
              }
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  }, [selectedStudent]);
  
  const filteredStudents = students.filter(student => {
    // First apply the search filter
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    
    // If not matching search, return false right away
    if (!matchesSearch) return false;
    
    // Filter by section if sectionFilter is provided in route params
    if (route.params?.sectionFilter) {
      const studentSection = student.section || '';
      if (studentSection !== route.params.sectionFilter) {
        return false;
      }
    }
    
    // If filter is "all", return all students that match the search
    if (activeFilter === 'all') return true;
    
    // Find this student's health records to determine BMI status
    const studentRecords = healthRecords.filter(record => {
      if (record.studentId === student.id) return true;
      if (record.id === student.id) return true;
      if (record.student && record.student.id === student.id) return true;
      return false;
    });
    
    // Also check if student has height/weight directly on their record
    if (student.height && student.weight) {
      const height = parseFloat(student.height);
      const weight = parseFloat(student.weight);
      
      if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
        const bmi = calculateBMI(weight, height);
        const age = student.age || 9; // Default age if not provided
        const status = getBMIStatus(bmi, age, student.gender || 'unknown');
        
        // Check if status matches the active filter
        if (
          (activeFilter === 'normal' && status.includes('Normal')) ||
          (activeFilter === 'underweight' && status.includes('Underweight')) ||
          (activeFilter === 'overweight' && (status.includes('Overweight') || status.includes('Obese')))
        ) {
          return true;
        }
      }
    }
    
    // If we have health records, check those
    if (studentRecords && studentRecords.length > 0) {
      // Sort to get the latest record
      const latestRecord = studentRecords.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
        return dateB - dateA;
      })[0];
      
      if (latestRecord) {
        const height = parseFloat(latestRecord.height);
        const weight = parseFloat(latestRecord.weight);
        
        if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
          const bmi = calculateBMI(weight, height);
          const age = student.age || 9;
          const status = getBMIStatus(bmi, age, student.gender || 'unknown');
          
          // Check if status matches the active filter
          return (
            (activeFilter === 'normal' && status.includes('Normal')) ||
            (activeFilter === 'underweight' && status.includes('Underweight')) ||
            (activeFilter === 'overweight' && (status.includes('Overweight') || status.includes('Obese')))
          );
        }
      }
    }
    
    // If we get here, the student doesn't match the active filter
    return false;
  });
  
  const validationSchema = Yup.object().shape({
    height: Yup.number()
      .required('Height is required')
      .positive('Height must be positive')
      .max(250, 'Height cannot exceed 250 cm'),
    weight: Yup.number()
      .required('Weight is required')
      .positive('Weight must be positive')
      .max(150, 'Weight cannot exceed 150 kg'),
    notes: Yup.string()
  });
  
  const renderStudentItem = ({ item }) => {
    const cachedData = studentHealthData[item.id] || {};
    const latestRecord = cachedData.latestRecord || {};
    
    return (
    <TouchableOpacity 
        style={styles.studentCard}
      onPress={() => handleStudentSelect(item)}
    >
        <View style={styles.studentCardContent}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>
              {item.firstName ? item.firstName.charAt(0).toUpperCase() : '?'}
        </Text>
          </View>
          
          <View style={styles.studentCardInfo}>
            <Text style={styles.studentCardName}>{item.firstName} {item.lastName}</Text>
            <View style={styles.studentCardDetails}>
              <Text style={styles.studentCardDetail}>
                👦 {item.age || 9} yrs
              </Text>
              <Text style={styles.studentCardDetail}>
                🔴 {item.section || item.grade || 'C'}
        </Text>
      </View>
            <View style={styles.studentCardDetails}>
              <Text style={styles.studentCardDetail}>
                📏 {latestRecord.height ? `${latestRecord.height} cm` : 'N/A'}
              </Text>
              <Text style={styles.studentCardDetail}>
                ⚖️ {latestRecord.weight ? `${latestRecord.weight} kg` : 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.studentCardBmi}>
            {latestRecord.bmi ? (
              <>
                <Text style={styles.studentCardBmiValue}>
                  {parseFloat(latestRecord.bmi).toFixed(1)}
                </Text>
                <Text style={[
                  styles.studentCardBmiStatus,
                  { color: latestRecord.bmiStatus?.includes('Normal') ? '#4CAF50' : 
                           latestRecord.bmiStatus?.includes('Underweight') ? '#FFC107' : '#F44336' }
                ]}>
                  {latestRecord.bmiStatus?.includes('Normal') ? 'Normal' : 
                   latestRecord.bmiStatus?.includes('Underweight') ? 'Underweight' : 'Overweight'}
                </Text>
              </>
            ) : (
              <Text style={styles.studentCardBmiValue}>N/A</Text>
            )}
          </View>
      </View>
    </TouchableOpacity>
  );
  };
  
  const renderHealthRecordItem = ({ item }) => {
    try {
      let date;
      try {
        if (item.date?.toDate) {
          date = item.date.toDate();
        } else if (item.date) {
          date = new Date(item.date);
        } else {
          console.warn('No date provided for health record');
          date = new Date();
        }
        
        if (isNaN(date.getTime())) {
          console.warn('Invalid date detected in health record');
          date = new Date();
        }
      } catch (error) {
        console.warn('Error processing health record date:', error);
        date = new Date();
      }
      
      const height = parseFloat(item.height);
      const weight = parseFloat(item.weight);
      
      let bmi = '';
      let status = '';
      if (!isNaN(height) && !isNaN(weight) && height > 0) {
        bmi = calculateBMI(weight, height).toFixed(1);
        
        // Calculate status based on student's age and gender
        if (selectedStudent) {
          const age = selectedStudent.age || 9;
          const gender = selectedStudent.gender || 'unknown';
          status = getBMIStatus(parseFloat(bmi), age, gender);
        }
      } else {
        bmi = 'N/A';
        status = 'N/A';
      }
      
      return (
        <View style={styles.modernRecordItem}>
          <View style={styles.modernRecordHeader}>
            <Text style={styles.modernRecordDate}>
              {date.toLocaleDateString()}
            </Text>
            {(isAdmin || isTeacher) && (
              <TouchableOpacity
                style={styles.modernRecordDeleteButton}
                onPress={() => handleDeleteHealthRecord(item.id)}
              >
                <Text style={styles.modernRecordDeleteButtonText}>✖</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.modernRecordBody}>
            <View style={styles.modernRecordRow}>
              <View style={styles.modernRecordMetricContainer}>
                <Text style={styles.modernRecordMetricLabel}>Height</Text>
                <Text style={styles.modernRecordMetricValue}>
                  {isNaN(height) ? 'N/A' : height.toFixed(1)} cm
                </Text>
              </View>
              
              <View style={styles.modernRecordMetricContainer}>
                <Text style={styles.modernRecordMetricLabel}>Weight</Text>
                <Text style={styles.modernRecordMetricValue}>
                  {isNaN(weight) ? 'N/A' : weight.toFixed(1)} kg
                </Text>
              </View>
            </View>
            
            <View style={styles.modernRecordRow}>
              <View style={styles.modernRecordMetricContainer}>
                <Text style={styles.modernRecordMetricLabel}>BMI</Text>
                <Text style={styles.modernRecordMetricValue}>{bmi}</Text>
              </View>
              
              <View style={styles.modernRecordMetricContainer}>
                <Text style={styles.modernRecordMetricLabel}>Status</Text>
                <View style={[styles.modernStatusBadge, { backgroundColor: getStatusColorLight(status) }]}>
                  <Text style={[styles.modernStatusText, { color: getStatusColor(status) }]}>
                    {status}
                  </Text>
                </View>
              </View>
            </View>
            
            {item.notes && (
              <View style={styles.modernRecordNotesContainer}>
                <Text style={styles.modernRecordNotesLabel}>Notes</Text>
                <Text style={styles.modernRecordNotesText}>{item.notes}</Text>
              </View>
            )}
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering health record:', error);
      return (
        <View style={styles.modernRecordItem}>
          <View style={styles.modernRecordHeader}>
            <Text style={styles.modernRecordDate}>Error displaying record</Text>
          </View>
        </View>
      );
    }
  };
  
  const renderCurrentStats = () => {
    if (!healthRecords || healthRecords.length === 0 || !selectedStudent) return null;
    
    const latestRecord = healthRecords[0];
    if (!latestRecord) return null;

    const height = parseFloat(latestRecord.height);
    const weight = parseFloat(latestRecord.weight);
    
    let bmi = null;
    let status = 'Unknown';
    let age = 0;
    
    if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
      bmi = calculateBMI(weight, height);
      
      try {
        if (typeof selectedStudent.age === 'number' && selectedStudent.age > 0) {
          age = selectedStudent.age;
        } 
        else if (selectedStudent.birthDate || selectedStudent.dateOfBirth || selectedStudent.birthdate) {
          const birthdateValue = selectedStudent.birthDate || selectedStudent.dateOfBirth || selectedStudent.birthdate;
          let birthdate;
          
          if (birthdateValue?.toDate) {
            birthdate = birthdateValue.toDate();
          } else if (birthdateValue) {
            birthdate = new Date(birthdateValue);
          }
          
          if (birthdate && !isNaN(birthdate.getTime())) {
            age = calculateAge(birthdate);
          }
        }
        
        if (age > 0) {
          status = getBMIStatus(bmi, age, selectedStudent.gender || 'unknown');
        } else {
          status = 'Age data unavailable';
          console.warn('Unable to determine age for BMI status calculation');
        }
      } catch (error) {
        console.warn('Error calculating age or BMI status:', error);
        status = 'Calculation error';
      }
    }
    
    const percentile = bmi ? getBMIPercentile(bmi, healthRecords) : '0.00';
    
    return (
      <View style={styles.currentStatsContainer}>
        <Text style={styles.currentStatsTitle}>Current Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>📏</Text>
            </View>
            <Text style={styles.statValue}>{!isNaN(height) ? height.toFixed(1) : 'N/A'} cm</Text>
            <Text style={styles.statLabel}>Height</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>⚖️</Text>
            </View>
            <Text style={styles.statValue}>{!isNaN(weight) ? weight.toFixed(1) : 'N/A'} kg</Text>
            <Text style={styles.statLabel}>Weight</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>📊</Text>
            </View>
            <Text style={styles.statValue}>{bmi !== null ? bmi.toFixed(1) : 'N/A'}</Text>
            <Text style={styles.statLabel}>BMI</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.statIcon}>✓</Text>
            </View>
            <Text style={status === 'Underweight' ? [styles.statValue, styles.smallerStatus] : styles.statValue}>
              {status}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
        
        <View style={styles.percentileContainer}>
          <Text style={styles.percentileLabel}>BMI Percentile:</Text>
          <View style={styles.percentileBarContainer}>
            <View style={[styles.percentileBar, { width: `${percentile}%` }]} />
          </View>
          <Text style={styles.percentileValue}>{percentile}%</Text>
        </View>

        <Text style={styles.ageNote}>
          {age > 0 ? `Age: ${age} years (${age < 20 ? 'Child/Teen' : 'Adult'} BMI Scale)` : 'Age: Not available'}
        </Text>
      </View>
    );
  };
  
  const getBmiStatusColor = (status) => {
    switch (status) {
      case 'Normal':
        return '#4CAF50';
      case 'Average':
        return '#FFC107';
      case 'Needs Improvement':
        return '#F44336';
      default:
        return '#333';
    }
  };
  
  // Function to get light background color for status
  const getStatusColorLight = (status) => {
    if (status.includes('Normal')) {
      return '#E8F5E9'; // Light green
    } else if (status.includes('Underweight')) {
      return '#FFF8E1'; // Light yellow
    } else if (status.includes('Overweight') || status.includes('Obese')) {
      return '#FBE9E7'; // Light red/orange
    } else {
      return '#F5F5F5'; // Light gray for unknown
    }
  };

  // Function to render health recommendations
  const renderHealthRecommendations = () => {
    if (!selectedStudent || !healthRecords.length) return null;
    
    const latestRecord = healthRecords[0];
    if (!latestRecord) return null;
    
    const height = parseFloat(latestRecord.height);
    const weight = parseFloat(latestRecord.weight);
    
    let bmi = null;
    let status = 'Unknown';
    
    if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
      bmi = calculateBMI(weight, height);
      
      try {
        const age = selectedStudent.age || 9;
        status = getBMIStatus(bmi, age, selectedStudent.gender || 'unknown');
      } catch (error) {
        console.warn('Error calculating BMI status:', error);
        status = 'Calculation error';
      }
    }
    
    let recommendations = [];
    let headerColor = '#1565C0';
    let headerIcon = '❤️';
    let headerText = 'Healthy Weight Maintenance';
    
    // Customize recommendations based on BMI status
    if (status.includes('Normal')) {
      headerColor = '#4CAF50';
      headerIcon = '❤️';
      headerText = 'Healthy Weight Maintenance';
      recommendations = [
        'Maintain balanced diet with variety of food groups',
        'Continue regular physical activity (30+ minutes most days)',
        'Monitor portion sizes to prevent gradual weight gain',
        'Stay hydrated with water instead of sugary drinks',
        'Get regular health check-ups'
      ];
    } else if (status.includes('Underweight')) {
      headerColor = '#FFC107';
      headerIcon = '⚠️';
      headerText = 'Healthy Weight Gain Plan';
      recommendations = [
        'Increase calorie intake with nutrient-dense foods',
        'Include protein-rich foods in every meal',
        'Add healthy fats like nuts, avocados and olive oil',
        'Eat smaller meals more frequently throughout the day',
        'Incorporate strength training exercises',
        'Consult with a healthcare provider for personalized advice'
      ];
    } else if (status.includes('Overweight') || status.includes('Obese')) {
      headerColor = '#FF5722';
      headerIcon = '⚠️';
      headerText = 'Healthy Weight Management Plan';
      recommendations = [
        'Focus on whole foods (fruits, vegetables, lean proteins)',
        'Reduce processed foods and sugary drinks',
        'Practice portion control using smaller plates',
        'Increase physical activity to 60 minutes daily',
        'Limit screen time and sedentary activities',
        'Ensure adequate sleep (8-10 hours)',
        'Consult with a healthcare provider for personalized advice'
      ];
    }
    
    return (
      <View style={styles.healthRecommendationsContainer}>
        <Text style={styles.currentStatsTitle}>Health Recommendations</Text>
        
        <View style={[styles.recommendationsHeaderCard, { backgroundColor: headerColor }]}>
          <View style={styles.recommendationsHeaderContent}>
            <Text style={styles.recommendationsIcon}>{headerIcon}</Text>
            <Text style={styles.recommendationsTitle}>{headerText}</Text>
          </View>
        </View>
        
        <View style={styles.recommendationsList}>
          {recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <View style={styles.recommendationCheckContainer}>
                <Text style={styles.recommendationCheck}>✓</Text>
              </View>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const handleHealthRecordChange = (name, value) => {
    setHealthRecord(prev => ({ ...prev, [name]: value }));
    
    if (name === 'height' || name === 'weight') {
      const height = parseFloat((name === 'height' ? value : healthRecord.height) || '0');
      const weight = parseFloat((name === 'weight' ? value : healthRecord.weight) || '0');
      
      // Only calculate and show BMI when both values are reasonable
      if (!isNaN(height) && !isNaN(weight) && height >= 50 && weight >= 10) {
        // Use the proper BMI calculation function from services
        const bmi = calculateBMI(weight, height);
        
        if (bmi !== null) {
          // Get the proper BMI status using the service function
          const status = getBMIStatus(bmi);
          
          setBmiPreview({ bmi, status });
        } else {
          setBmiPreview({ bmi: null, status: null });
        }
      } else {
        // Hide the preview if values are not reasonable
        setBmiPreview({ bmi: null, status: null });
      }
    }
  };
  
  // Fetch health records for a student and cache them
  const fetchAndCacheHealthRecords = useCallback(async (studentId) => {
    try {
      const { records, error } = await getHealthRecords(studentId);
      if (!error && records) {
        // Deduplicate records by ID
        const uniqueRecords = [];
        const seenIds = new Set();
        
        // Only add records with unique IDs
        records.forEach(record => {
          if (record.id && !seenIds.has(record.id)) {
            seenIds.add(record.id);
            uniqueRecords.push(record);
          }
        });
        
        // Sort records by date (most recent first)
        uniqueRecords.sort((a, b) => {
          const dateA = a.date?.toDate?.() || new Date(a.date);
          const dateB = b.date?.toDate?.() || new Date(b.date);
          return dateB - dateA;
        });

        // Get the latest record
        const latestRecord = uniqueRecords[0] || null;
        
        // Cache the health data
        setStudentHealthData(prev => ({
          ...prev,
          [studentId]: {
            records: uniqueRecords,
            latestRecord,
            lastUpdated: new Date()
          }
        }));

        // If this is the selected student, update their records
        if (selectedStudent?.id === studentId) {
          setHealthRecords(uniqueRecords);
        }

        return { records: uniqueRecords, latestRecord };
      }
      return { records: [], latestRecord: null };
    } catch (error) {
      console.error('Error fetching health records:', error);
      return { records: [], latestRecord: null };
    }
  }, [selectedStudent]);
  
  // Add this to the modal open/close functions
  const openAddHealthRecordModal = () => {
    // Reset BMI preview when opening the modal
    setBmiPreview({ bmi: null, status: null });
    setModalVisible(true);
  };

  const closeAddHealthRecordModal = () => {
    // Reset BMI preview when closing the modal
    setBmiPreview({ bmi: null, status: null });
    setModalVisible(false);
  };
  
  // Add function to open the Add Student modal
  const openAddStudentModal = () => {
    // Reset student form data
    setNewStudent({
      firstName: '',
      lastName: '',
      grade: '3',
      studentId: '',
      gender: 'male',
      birthDate: '',
      age: '',
      section: '',
      height: '',
      weight: ''
    });
    // Reset BMI preview
    setBmiPreview({ bmi: null, status: null });
    setCalculatedAge('');
    setIsAddStudentModalVisible(true);
  };
  
  // Add a ref for the scrollView
  const scrollViewRef = React.useRef();
  
  // Function to toggle health records view
  const navigateToHealthRecords = () => {
    setShowHealthRecords(true);
    setHealthRecordsModalVisible(true);
  };
  
  if (loading && students.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaWrapper
      backgroundColor="#F0F6FF"
      statusBarStyle="dark-content"
    >
      <StatusBar style="dark" />
      
      {isSyncing && (
        <View style={styles.syncingContainer}>
          <ActivityIndicator size="small" color="#1565C0" />
          <Text style={styles.syncingText}>Synchronizing data...</Text>
        </View>
      )}
      
      {selectedStudent ? (
        <ScrollView style={styles.scrollContainer} ref={scrollViewRef}>
          <View style={styles.profileContainer}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {selectedStudent.firstName ? selectedStudent.firstName.charAt(0).toUpperCase() : ''}
                  {selectedStudent.lastName ? selectedStudent.lastName.charAt(0).toUpperCase() : ''}
                </Text>
              </View>
              <Text style={styles.profileName}>
                {selectedStudent.firstName || ''} {selectedStudent.lastName || ''}
              </Text>
            </View>
            
            <View style={styles.profileDetailsContainer}>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Grade:</Text>
                <Text style={styles.profileDetailValue}>{selectedStudent.grade || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Section:</Text>
                <Text style={styles.profileDetailValue}>{selectedStudent.section || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>STUDENT ID:</Text>
                <Text style={styles.profileDetailValue}>{selectedStudent.studentId || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Gender:</Text>
                <Text style={styles.profileDetailValue}>
                  {selectedStudent.gender 
                    ? selectedStudent.gender.charAt(0).toUpperCase() + selectedStudent.gender.slice(1) 
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Age:</Text>
                <Text style={styles.profileDetailValue}>{selectedStudent.age || 'N/A'} years</Text>
              </View>
            </View>
          </View>
          
          {renderCurrentStats()}
          
          {renderHealthRecommendations()}
          
          <View style={styles.actionsCard}>
            {(isAdmin || isTeacher) && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={openAddHealthRecordModal}
                >
                  <Text style={styles.actionButtonText}>Add Record</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteActionButton]}
                  onPress={() => handleDeleteStudent(selectedStudent)}
                >
                  <Text style={styles.actionButtonText}>Delete Student</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.historyActionButton]}
                  onPress={navigateToHealthRecords}
                >
                  <Text style={styles.actionButtonText}>Health Record History</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={closeAddHealthRecordModal}
          >
            <View style={styles.modalBackground}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Add Health Record</Text>
                <View style={styles.modalDivider}></View>
                
                <ScrollView style={styles.modalScrollView}>
                  <Text style={styles.requiredFieldsNote}>* Required fields</Text>
                  
                  <Formik
                    initialValues={{ height: '', weight: '', notes: '' }}
                    validationSchema={validationSchema}
                    onSubmit={handleAddHealthRecord}
                  >
                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                      <View style={styles.form}>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Height (cm) *</Text>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={styles.input}
                              onChangeText={(text) => {
                                handleChange('height')(text);
                                handleHealthRecordChange('height', text);
                              }}
                              onBlur={handleBlur('height')}
                              value={values.height}
                              keyboardType="numeric"
                              placeholder="Enter height in cm"
                            />
                            <View style={styles.inputIcon}>
                              <Text style={styles.inputIconText}>📏</Text>
                            </View>
                          </View>
                          {errors.height && touched.height && (
                            <Text style={styles.errorText}>{errors.height}</Text>
                          )}
                        </View>
                        
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Weight (kg) *</Text>
                          <View style={styles.inputWrapper}>
                            <TextInput
                              style={styles.input}
                              onChangeText={(text) => {
                                handleChange('weight')(text);
                                handleHealthRecordChange('weight', text);
                              }}
                              onBlur={handleBlur('weight')}
                              value={values.weight}
                              keyboardType="numeric"
                              placeholder="Enter weight in kg"
                            />
                            <View style={styles.inputIcon}>
                              <Text style={styles.inputIconText}>⚖️</Text>
                            </View>
                          </View>
                          {errors.weight && touched.weight && (
                            <Text style={styles.errorText}>{errors.weight}</Text>
                          )}
                        </View>

                        {bmiPreview && bmiPreview.bmi > 0 && (
                          <View style={styles.bmiPreviewContainer}>
                            <Text style={styles.bmiPreviewTitle}>BMI Preview</Text>
                            <View style={styles.bmiPreviewContent}>
                              <Text style={styles.bmiPreviewValue}>
                                BMI: <Text style={styles.bmiPreviewNumber}>
                                  {bmiPreview.bmi}
                                </Text>
                              </Text>
                              <Text style={styles.bmiPreviewStatus}>
                                Status: {bmiPreview.status || 'N/A'}
                              </Text>
                            </View>
                            {calculatedAge && (
                              <Text style={styles.bmiPreviewNote}>
                                Based on {calculatedAge} years old {newStudent.gender || 'student'}
                              </Text>
                            )}
                          </View>
                        )}
                        
                        <View style={styles.modalButtons}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={closeAddHealthRecordModal}
                          >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.saveButton, loading && styles.disabledButton]}
                            onPress={handleSubmit}
                            disabled={loading}
                          >
                            {loading ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.saveButtonText}>Save Record</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </Formik>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </ScrollView>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {route.params?.sectionFilter ? `Section ${route.params.sectionFilter}` : "Student List"}
            </Text>
            {route.params?.sectionFilter && (
              <TouchableOpacity 
                style={styles.backToAllButton}
                onPress={() => navigation.navigate('Students')}
              >
                <Text style={styles.backToAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <View style={styles.searchIconContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
              </View>
            <TextInput
              style={styles.searchInput}
                placeholder="Search by name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            </View>
          </View>
          
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersLabel}>Filters:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
              {filters.map(filter => (
                <TouchableOpacity 
                  key={filter.id}
                  style={[
                    styles.filterChip, 
                    activeFilter === filter.id && styles.filterChipActive
                  ]}
                  onPress={() => handleFilterSelect(filter.id)}
                >
                  <Text 
                    style={activeFilter === filter.id ? 
                      styles.filterChipTextActive : 
                      styles.filterChipText}
                  >
                    {activeFilter === filter.id ? `✓ ${filter.label}` : filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <FlatList
            data={filteredStudents}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.studentList}
          />
          
          {(isAdmin || isTeacher) && (
            <TouchableOpacity 
              style={styles.fabButton}
              onPress={openAddStudentModal}
            >
              <Text style={styles.fabButtonText}>+</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      
      {/* Add Student Modal */}
      <Modal
        visible={isAddStudentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddStudentModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Student</Text>
            <View style={styles.modalDivider}></View>
            
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.requiredFieldsNote}>* Required fields</Text>
              
              <FormInput
                label="First Name *"
                value={newStudent.firstName}
                onChangeText={(text) => handleInputChange('firstName', text)}
                placeholder="Enter first name"
                maxLength={30}
                autoCapitalize="words"
                icon="👤"
              />
              
              <FormInput
                label="Last Name *"
                value={newStudent.lastName}
                onChangeText={(text) => handleInputChange('lastName', text)}
                placeholder="Enter last name"
                maxLength={30}
                autoCapitalize="words"
                icon="👤"
              />
              
              <FormInput
                label="Student ID *"
                value={newStudent.studentId}
                onChangeText={(text) => handleInputChange('studentId', text)}
                placeholder="Enter student ID"
                keyboardType="numeric"
                maxLength={10}
                icon="🆔"
              />
              
              <FormInput
                label="Section *"
                value={newStudent.section}
                onChangeText={(text) => handleInputChange('section', text)}
                placeholder="Enter section"
                maxLength={5}
                autoCapitalize="characters"
                icon="🏫"
              />
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={newStudent.height}
                    onChangeText={(text) => handleInputChange('height', text)}
                    placeholder="Enter height in centimeters"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <View style={styles.inputIcon}>
                    <Text style={styles.inputIconText}>📏</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={newStudent.weight}
                    onChangeText={(text) => handleInputChange('weight', text)}
                    placeholder="Enter weight in kilograms"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <View style={styles.inputIcon}>
                    <Text style={styles.inputIconText}>⚖️</Text>
                  </View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Grade Level</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newStudent.grade}
                    onValueChange={handleGradeChange}
                    style={styles.picker}
                  >
                    <Picker.Item label="Grade 1" value="1" />
                    <Picker.Item label="Grade 2" value="2" />
                    <Picker.Item label="Grade 3" value="3" />
                    <Picker.Item label="Grade 4" value="4" />
                    <Picker.Item label="Grade 5" value="5" />
                    <Picker.Item label="Grade 6" value="6" />
                  </Picker>
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newStudent.gender}
                    onValueChange={handleGenderChange}
                    style={styles.picker}
                  >
                    <Picker.Item label="Male" value="male" />
                    <Picker.Item label="Female" value="female" />
                  </Picker>
                </View>
              </View>

              {bmiPreview && bmiPreview.bmi > 0 && (
                <View style={styles.bmiPreviewContainer}>
                  <Text style={styles.bmiPreviewTitle}>BMI Preview</Text>
                  <View style={styles.bmiPreviewContent}>
                    <Text style={styles.bmiPreviewValue}>
                      BMI: <Text style={styles.bmiPreviewNumber}>
                        {bmiPreview.bmi}
                      </Text>
                    </Text>
                    <Text style={styles.bmiPreviewStatus}>
                      Status: {bmiPreview.status || 'N/A'}
                    </Text>
                  </View>
                  {calculatedAge && (
                    <Text style={styles.bmiPreviewNote}>
                      Based on {calculatedAge} years old {newStudent.gender || 'student'}
                    </Text>
                  )}
                </View>
              )}
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Birth Date (YYYY-MM-DD)</Text>
                <View style={styles.dateInputContainer}>
                  <TextInput
                    style={styles.input}
                    value={newStudent.birthDate}
                    onChangeText={handleBirthDateChange}
                    placeholder="YYYY-MM-DD"
                    maxLength={10}
                    keyboardType="numeric"
                  />
                  <View style={styles.calendarIcon}>
                    <Text style={styles.calendarIconText}>📅</Text>
                  </View>
                </View>
                <Text style={styles.dateHelperText}>Format: YYYY-MM-DD (e.g., 2012-05-21)</Text>
              </View>
              
              {calculatedAge ? (
                <View style={styles.ageContainer}>
                  <Text style={styles.ageLabel}>Age:</Text>
                  <Text style={styles.ageValue}>{calculatedAge} years</Text>
                </View>
              ) : null}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setIsAddStudentModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, loading && styles.disabledButton]}
                  onPress={handleAddStudent}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Student</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Health Records History Modal */}
      <Modal
        visible={healthRecordsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHealthRecordsModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modernModalContainer}>
            <View style={styles.modernModalHeader}>
              <Text style={styles.modernModalTitle}>Health Records History</Text>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {healthRecords.length > 0 ? (
                <>
                  <View style={styles.modalRecordsContainer}>
                    <Text style={styles.modernSectionTitle}>Health Records</Text>
                    
                    {healthRecords.map((record) => (
                      <View key={record.id}>
                        {renderHealthRecordItem({ item: record })}
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.emptyRecordsContainer}>
                  <Text style={styles.emptyRecordsText}>No health records found</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.modernCloseButton}
              onPress={() => setHealthRecordsModalVisible(false)}
            >
              <Text style={styles.modernCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F6FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  header: {
    backgroundColor: '#1565C0',
    padding: 15,
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  searchIconContainer: {
    marginRight: 10,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  filtersLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    color: '#666',
  },
  filterChipTextActive: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  studentList: {
    padding: 10,
    paddingBottom: 80,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  studentCardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentCardInfo: {
    flex: 1,
  },
  studentCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  studentCardDetails: {
    flexDirection: 'row',
    marginTop: 2,
  },
  studentCardDetail: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  studentCardBmi: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  studentCardBmiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  studentCardBmiStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  syncingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    backgroundColor: '#1565C0',
  },
  syncingText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 15,
    marginTop: 0,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionsCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#1565C0',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  historyActionButton: {
    backgroundColor: '#2196F3',
  },
  deleteActionButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  recordItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recordDate: {
    backgroundColor: '#1565C0',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordDateText: {
    color: '#fff',
    fontWeight: '500',
  },
  recordDetails: {
    padding: 15,
  },
  recordMetric: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  recordValue: {
    color: '#333',
    fontWeight: '500',
  },
  recordStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordNotes: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
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
    padding: 25,
    width: '90%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalDivider: {
    height: 2,
    backgroundColor: '#E3F2FD',
    marginBottom: 15,
    marginHorizontal: -25,
  },
  requiredFieldsNote: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  form: {
    marginBottom: 18,
    width: '100%',
  },
  inputContainer: {
    marginBottom: 18,
    width: '100%',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#424242',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  inputIconText: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 5,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  calendarIcon: {
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  calendarIconText: {
    fontSize: 16,
  },
  dateHelperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    marginLeft: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1565C0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#90CAF9',
    shadowOpacity: 0,
  },
  ageContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1565C0',
    marginRight: 5,
  },
  ageValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  bmiPreviewContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
  },
  bmiPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bmiPreviewContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  bmiPreviewValue: {
    fontSize: 14,
    color: '#333',
  },
  bmiPreviewNumber: {
    fontWeight: '600',
    fontSize: 16,
  },
  bmiPreviewStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  bmiPreviewNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 5,
  },
  currentStatsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  percentileContainer: {
    marginTop: 10,
  },
  percentileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  percentileBarContainer: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  percentileBar: {
    height: '100%',
    backgroundColor: '#1565C0',
    borderRadius: 4,
  },
  percentileValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
  },
  ageNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  healthRecordsContainer: {
    marginHorizontal: 15,
    marginTop: 10,
  },
  healthRecordsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  emptyRecordsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  emptyRecordsText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  backToAllButton: {
    position: 'absolute',
    right: 15,
    top: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  backToAllText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#1565C0',
    padding: 15,
    paddingTop: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  profileDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileDetailLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
    width: 100,
  },
  profileDetailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  closeModalButton: {
    backgroundColor: '#1565C0',
    padding: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'center',
    width: '80%',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  recommendationsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingVertical: 12,
  },
  recommendationsIcon: {
    fontSize: 24,
    color: '#fff',
    marginRight: 10,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  recommendationsList: {
    padding: 15,
    paddingTop: 5,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationCheck: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 10,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: 16,
    color: '#555',
    flex: 1,
    lineHeight: 22,
  },
  healthTipsContainer: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  healthTipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  healthRecommendationsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationsHeaderCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  recommendationsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationsIcon: {
    fontSize: 24,
    color: '#fff',
    marginRight: 10,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  recommendationsList: {
    marginTop: 5,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationCheckContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recommendationCheck: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  recommendationText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
    lineHeight: 22,
  },
  smallerStatus: {
    fontSize: 12,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 5,
  },
  modalRecordsContainer: {
    marginTop: 0,
  },
  recordStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Modern health record styles
  modernRecordItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  modernRecordHeader: {
    backgroundColor: '#1976D2',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernRecordDate: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modernRecordDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernRecordDeleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modernRecordBody: {
    padding: 15,
  },
  modernRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modernRecordMetricContainer: {
    flex: 1,
    padding: 5,
  },
  modernRecordMetricLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  modernRecordMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modernStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  modernStatusText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  modernRecordNotesContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  modernRecordNotesLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  modernRecordNotesText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  modernModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  modernModalHeader: {
    backgroundColor: '#1565C0',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modernModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  modalScrollView: {
    padding: 15,
  },
  modernSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  modernCloseButton: {
    backgroundColor: '#1565C0',
    padding: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 15,
    alignSelf: 'center',
    width: '80%',
  },
  modernCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default StudentTrackingScreen;