import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions, 
  TouchableOpacity, 
  Alert,
  Modal,
  TextInput,
  Platform,
  Button,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { 
  getAggregateHealthData, 
  addStudent, 
  calculateBMI, 
  getBMIStatus,
  calculateAge,
  getAggregateHealthDataSimple
} from '../services/studentService';
import { StatusBar } from 'expo-status-bar';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useSyncContext } from '../store/SyncContext';
import { FontAwesome5 } from '@expo/vector-icons';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import StudentDashboard from '../components/StudentDashboard';

// Memoized form input component to prevent unnecessary re-renders
const FormInput = memo(({ label, value, onChangeText, placeholder, keyboardType, maxLength, autoCapitalize, icon }) => {
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
        {icon && (
          <View style={styles.inputIcon}>
            <Text style={styles.inputIconText}>{icon}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const DashboardScreen = () => {
  const { userDetails, isAdmin, isTeacher, isStudent, isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const { lastSyncTime, isSyncing, syncData } = useSyncContext();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState('3');
  const [isAddStudentModalVisible, setIsAddStudentModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState('');
  const [bmiPreview, setBmiPreview] = useState(null);
  const [nutritionCounts, setNutritionCounts] = useState({ normal: 0, underweight: 0, overweight: 0 });
  const [healthDataCache, setHealthDataCache] = useState({}); // Cache for health data by grade
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

  // Add useEffect to check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace('Login');
    }
  }, [isAuthenticated, navigation]);

  // Redirect student users to StudentDashboardScreen
  useEffect(() => {
    if (isAuthenticated && userDetails?.role === 'student') {
      navigation.replace('StudentDashboard');
    }
  }, [isAuthenticated, userDetails, navigation]);

  // Optimized fetchHealthData with useCallback to prevent unnecessary recreations
  const fetchHealthData = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.replace('Login');
      return;
    }

    // Skip this for student users
    if (userDetails?.role === 'student') {
      setLoading(false);
      return;
    }

    // Check if we have cached data for this grade and it's recent (less than 1 minute old)
    const cachedData = healthDataCache[selectedGrade];
    const isCacheValid = cachedData && 
      (new Date() - new Date(cachedData.lastUpdated)) < 1 * 60 * 1000;

    if (isCacheValid) {
      console.log('Using cached health data for grade:', selectedGrade);
      setHealthData(cachedData.processedData);
      setNutritionCounts(cachedData.nutritionCounts);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { records, error } = await getAggregateHealthDataSimple(selectedGrade);
      
      if (error) {
        console.error('Error fetching health data:', error);
        if (error.code === 'permission-denied') {
          navigation.replace('Login');
          return;
        }
        Alert.alert("Error", "Could not load health data. Please try again later.");
        setHealthData(null);
        setNutritionCounts({ normal: 0, underweight: 0, overweight: 0 });
      } else if (records) {
        console.log('Processing records:', records.length);
        const processedData = processHealthData(records);
        const nutritionCounts = processedData.nutritionCounts || { normal: 0, underweight: 0, overweight: 0 };
        
        // Cache the processed data
        setHealthDataCache(prev => ({
          ...prev,
          [selectedGrade]: {
            processedData,
            nutritionCounts,
            lastUpdated: new Date()
          }
        }));
        
        setHealthData(processedData);
        setNutritionCounts(nutritionCounts);
      }
    } catch (error) {
      console.error('Error in dashboard:', error);
      if (error.code === 'permission-denied') {
        navigation.replace('Login');
        return;
      }
      Alert.alert("Error", "An unexpected error occurred. Please try again later.");
      setHealthData(null);
      setNutritionCounts({ normal: 0, underweight: 0, overweight: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedGrade, isAuthenticated, navigation, userDetails, healthDataCache]);

  // Effect to fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchHealthData();
    }
  }, [selectedGrade, isAuthenticated, fetchHealthData]);

  // Listen for sync events
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncHandler = () => {
      fetchHealthData();
    };
    
    if (global.eventEmitter) {
      global.eventEmitter.addListener('SYNC_DATA', syncHandler);
    }
    
    return () => {
      if (global.eventEmitter) {
        global.eventEmitter.removeListener('SYNC_DATA', syncHandler);
      }
    };
  }, [selectedGrade, isAuthenticated, fetchHealthData]);

  // Check for showAddStudentModal parameter and show modal if present
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = navigation.getState().routes.find(r => r.name === 'Dashboard')?.params;
      if (params?.showAddStudentModal) {
        setIsAddStudentModalVisible(true);
        // Reset the parameter to prevent reopening on future navigations
        navigation.setParams({ showAddStudentModal: undefined });
      }
    });

    return unsubscribe;
  }, [navigation]);
  
  // Optimized handler functions with useCallback - MOVED ABOVE CONDITIONAL RETURNS
  const handleAddStudent = useCallback(async () => {
    // Validate inputs
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.studentId || !newStudent.section) {
      Alert.alert("Error", "Please fill in all required fields (First Name, Last Name, Student ID, and Section).");
      return;
    }

    // Validate height and weight if provided
    if (newStudent.height && (isNaN(newStudent.height) || Number(newStudent.height) <= 0 || Number(newStudent.height) > 250)) {
      Alert.alert("Error", "Height must be a valid number between 1 and 250 cm.");
      return;
    }

    if (newStudent.weight && (isNaN(newStudent.weight) || Number(newStudent.weight) <= 0 || Number(newStudent.weight) > 150)) {
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
              }
            },
            {
              text: "Go to Student",
              onPress: () => {
                // Reset form data
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
                
                // Navigate to student tracking screen with the new student ID
                navigation.navigate('Students', {
                  screen: 'StudentTracking',
                  initial: false,
                  params: { studentId: id }
                });
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
  }, [newStudent, navigation]);
  
  // Optimized input handlers to reduce rendering delays
  const handleInputChange = useCallback((field, value) => {
    setNewStudent(prev => {
      const updated = {...prev, [field]: value};
      
      // Calculate BMI preview when height or weight changes
      if ((field === 'height' || field === 'weight') && (updated.height || updated.weight)) {
        const height = parseFloat(updated.height);
        const weight = parseFloat(updated.weight);
        
        // If either height or weight is missing, show appropriate message
        if (!updated.height || !updated.weight) {
          setBmiPreview({ 
            bmi: null, 
            status: `Enter ${!updated.height ? 'height' : 'weight'}`
          });
          return updated;
        }
        
        // If we have both values, calculate BMI
        if (!isNaN(height) && !isNaN(weight) && height > 0 && weight > 0) {
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
          setBmiPreview({ 
            bmi: null, 
            status: 'Enter valid height/weight'
          });
        }
      }
      
      return updated;
    });
  }, []);

  const handleBirthDateChange = useCallback((text) => {
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
      const birthDate = new Date(year, month - 1, day); // month is 0-based in Date constructor
      const age = calculateAge(birthDate);
      if (age !== null) {
        setNewStudent(prev => ({...prev, age: age.toString()}));
        setCalculatedAge(age.toString());
      } else {
        setCalculatedAge('');
      }
    } else {
      setCalculatedAge('');
    }
  }, []);
  
  const handleGradeChange = useCallback((value) => {
    setNewStudent(prev => ({...prev, grade: value}));
  }, []);
  
  const handleGenderChange = useCallback((value) => {
    setNewStudent(prev => ({...prev, gender: value}));
  }, []);
  
  const processHealthData = (records) => {
    // This is a simplified example - in a real app, you would process data more thoroughly
    // Group by month/week based on timeFrame
    const bmiData = [];
    const heightData = [];
    const weightData = [];
    const months = [];
    
    // Initialize sections data structure
    const sections = {};
    
    // No records case
    if (!records || records.length === 0) {
      for (let i = 1; i <= 6; i++) {
        months.push(`Month ${i}`);
        bmiData.push(0);
        heightData.push(0);
        weightData.push(0);
      }
      
      return {
        bmiData,
        heightData,
        weightData,
        months,
        averageBmi: 0,
        averageHeight: 0,
        averageWeight: 0,
        nutritionCategories: {
          normal: 0,
          underweight: 0,
          overweight: 0
        },
        sections: []
      };
    }
    
    // Group records by month
    const recordsByMonth = {};
    const currentYear = new Date().getFullYear();
    
    // Initialize months (last 6 months)
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${d.getMonth()+1}`;
      const monthName = d.toLocaleString('default', { month: 'short' });
      recordsByMonth[monthKey] = { 
        records: [], 
        name: monthName 
      };
      months.push(monthName);
    }
    
    // Process each record
    records.forEach(record => {
      try {
        const recordDate = record.date.toDate ? record.date.toDate() : new Date(record.date);
        const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth()+1}`;
        
        if (recordsByMonth[monthKey]) {
          recordsByMonth[monthKey].records.push(record);
        }

        // Process section data
        if (record.section) {
          if (!sections[record.section]) {
            sections[record.section] = {
              name: record.section,
              count: 0,
              normal: 0,
              underweight: 0,
              overweight: 0
            };
          }
          
          sections[record.section].count++;
          
          // Calculate BMI and categorize
          const height = Number(record.height || 0);
          const weight = Number(record.weight || 0);
          
          if (height > 0 && weight > 0) {
            const heightM = height / 100;
            const bmi = weight / (heightM * heightM);
            
            if (bmi >= 18.5 && bmi <= 24.9) {
              sections[record.section].normal++;
            } else if (bmi < 18.5) {
              sections[record.section].underweight++;
            } else {
              sections[record.section].overweight++;
            }
          }
        }
      } catch (e) {
        console.error("Error processing record date:", e);
      }
    });
    
    // Calculate averages per month
    Object.keys(recordsByMonth).forEach(month => {
      const monthData = recordsByMonth[month];
      if (monthData.records.length > 0) {
        const totalHeight = monthData.records.reduce((sum, r) => sum + Number(r.height || 0), 0);
        const totalWeight = monthData.records.reduce((sum, r) => sum + Number(r.weight || 0), 0);
        const totalBmi = monthData.records.reduce((sum, r) => {
          const height = Number(r.height || 0);
          const weight = Number(r.weight || 0);
          if (height > 0 && weight > 0) {
            const heightM = height / 100;
            return sum + (weight / (heightM * heightM));
          }
          return sum;
        }, 0);
        
        heightData.push(Number((totalHeight / monthData.records.length).toFixed(1)));
        weightData.push(Number((totalWeight / monthData.records.length).toFixed(1)));
        bmiData.push(Number((totalBmi / monthData.records.length).toFixed(1)));
      } else {
        heightData.push(0);
        weightData.push(0);
        bmiData.push(0);
      }
    });
    
    // Calculate overall averages
    const averageBmi = bmiData.filter(v => v > 0).length > 0 ? 
                       Number((bmiData.filter(v => v > 0).reduce((sum, val) => sum + val, 0) / 
                       bmiData.filter(v => v > 0).length).toFixed(1)) : 0;
                       
    const averageHeight = heightData.filter(v => v > 0).length > 0 ? 
                          Number((heightData.filter(v => v > 0).reduce((sum, val) => sum + val, 0) / 
                          heightData.filter(v => v > 0).length).toFixed(1)) : 0;
                          
    const averageWeight = weightData.filter(v => v > 0).length > 0 ? 
                          Number((weightData.filter(v => v > 0).reduce((sum, val) => sum + val, 0) / 
                          weightData.filter(v => v > 0).length).toFixed(1)) : 0;
    
    // Calculate nutrition categories based on BMI
    const nutritionCounts = { normal: 0, underweight: 0, overweight: 0 };
    
    records.forEach(record => {
      try {
        const height = Number(record.height || 0);
        const weight = Number(record.weight || 0);
        
        if (height > 0 && weight > 0) {
          const heightM = height / 100;
          const bmi = weight / (heightM * heightM);
          
          // Updated BMI categories to match the image
          if (bmi >= 18.5 && bmi <= 24.9) {
            nutritionCounts.normal++;
          } else if (bmi < 18.5) {
            nutritionCounts.underweight++;
          } else {
            nutritionCounts.overweight++;
          }
        }
      } catch (e) {
        console.error("Error calculating nutrition category:", e);
      }
    });
    
    // Convert to percentages
    const total = Object.values(nutritionCounts).reduce((sum, val) => sum + val, 0) || 1;
    const nutritionCategories = {
      normal: Math.round((nutritionCounts.normal / total) * 100),
      underweight: Math.round((nutritionCounts.underweight / total) * 100),
      overweight: Math.round((nutritionCounts.overweight / total) * 100)
    };
    
    return {
      bmiData,
      heightData,
      weightData,
      months,
      averageBmi,
      averageHeight,
      averageWeight,
      nutritionCategories,
      nutritionCounts,
      sections: Object.values(sections)
    };
  };
  
  const screenWidth = Dimensions.get('window').width - 40;
  
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 1, // Ensure only 1 decimal place
    formatYLabel: (value) => Math.round(Number(value)).toString() // Format Y labels as integers
  };
  
  // Add getBmiStatusColor helper function
  const getBmiStatusColor = (status) => {
    switch (status) {
      case 'Normal':
        return '#1565C0';
      case 'Underweight':
        return '#FFC107';
      case 'At Risk of Overweight':
        return '#FF9800';
      case 'Overweight':
      case 'Obese':
        return '#F44336';
      default:
        return '#757575';
    }
  };
  
  // If not authenticated, show loading or redirect
  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Redirecting to login...</Text>
      </View>
    );
  }
  
  // For student users, we no longer need this code as we're redirecting them
  // in the useEffect above, but we'll keep a fallback just in case
  if (userDetails?.role === 'student') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading student dashboard...</Text>
      </View>
    );
  }
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaWrapper backgroundColor="#F0F6FF" statusBarStyle="dark-content">
      <StatusBar style="dark" />
      
      {/* Header with title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.syncTimeText}>
          Last updated: {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
        </Text>
      </View>
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Overall Statistics */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardContainerTitle}>Overall Statistics</Text>
          <View style={styles.statisticsGrid}>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Total Students</Text>
              <Text style={styles.statsValue}>
                {Object.values(nutritionCounts).reduce((sum, val) => sum + val, 0)}
              </Text>
            </View>
            
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Normal Weight</Text>
              <Text style={[styles.statsValue, { color: '#4CAF50' }]}>
                {nutritionCounts?.normal || 0}({healthData?.nutritionCategories?.normal || 0}%)
              </Text>
            </View>
            
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Underweight</Text>
              <Text style={[styles.statsValue, { color: '#FFC107' }]}>
                {nutritionCounts?.underweight || 0}({healthData?.nutritionCategories?.underweight || 0}%)
              </Text>
            </View>
            
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Overweight</Text>
              <Text style={[styles.statsValue, { color: '#F44336' }]}>
                {nutritionCounts?.overweight || 0}({healthData?.nutritionCategories?.overweight || 0}%)
              </Text>
            </View>
          </View>
        </View>
        
        {/* Nutrition Status Distribution */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Nutrition Status Distribution</Text>
          <View style={styles.nutritionChart}>
            {Object.values(nutritionCounts).reduce((sum, val) => sum + val, 0) > 0 ? (
              <>
                <View style={styles.pieChartWrapper}>
                  <PieChart
                    data={[
                      {
                        name: 'Normal',
                        population: nutritionCounts.normal || 0.001,
                        color: '#4CAF50',
                        legendFontColor: '#666',
                        legendFontSize: 13
                      },
                      {
                        name: 'Underweight',
                        population: nutritionCounts.underweight || 0.001,
                        color: '#FFC107',
                        legendFontColor: '#666',
                        legendFontSize: 13
                      },
                      {
                        name: 'Overweight',
                        population: nutritionCounts.overweight || 0.001,
                        color: '#F44336',
                        legendFontColor: '#666',
                        legendFontSize: 13
                      }
                    ]}
                    width={screenWidth * 0.8}
                    height={130}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                   
                    absolute={false}
                    hasLegend={false}
                  />
                </View>
                <View style={styles.nutritionLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.legendText}>
                      <Text style={styles.legendPercent}>{healthData?.nutritionCategories?.normal || 0}%</Text> Normal ({nutritionCounts.normal || 0})
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                    <Text style={styles.legendText}>
                      <Text style={styles.legendPercent}>{healthData?.nutritionCategories?.underweight || 0}%</Text> Underweight ({nutritionCounts.underweight || 0})
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                    <Text style={styles.legendText}>
                      <Text style={styles.legendPercent}>{healthData?.nutritionCategories?.overweight || 0}%</Text> Overweight ({nutritionCounts.overweight || 0})
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyChartText}>No nutrition data available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Students by Section */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Students by Section</Text>
          <View style={styles.sectionContainer}>
            {healthData?.sections?.map((section, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.sectionItem}
                onPress={() => navigation.navigate('Students', { sectionFilter: section.name })}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.name}</Text>
                  <Text style={styles.sectionCount}>
                    {section.count} {section.count === 1 ? 'student' : 'students'}
                  </Text>
                </View>
                <View style={styles.sectionProgressBar}>
                  <View 
                    style={[
                      styles.sectionProgressSegment, 
                      styles.normalSegment,
                      { flex: section.normal || 0.1 }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.sectionProgressSegment, 
                      styles.underweightSegment,
                      { flex: section.underweight || 0.1 }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.sectionProgressSegment, 
                      styles.overweightSegment,
                      { flex: section.overweight || 0.1 }
                    ]} 
                  />
                </View>
                <View style={styles.sectionLegend}>
                  <View style={styles.sectionLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.sectionLegendText}>Normal: {section.normal}</Text>
                  </View>
                  <View style={styles.sectionLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                    <Text style={styles.sectionLegendText}>Underweight: {section.underweight}</Text>
                  </View>
                  <View style={styles.sectionLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                    <Text style={styles.sectionLegendText}>Overweight: {section.overweight}</Text>
                  </View>
                </View>
                <View style={styles.sectionArrow}>
                  <Text style={styles.sectionArrowText}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
            {(!healthData?.sections || healthData.sections.length === 0) && (
              <View style={styles.emptySectionContainer}>
                <Text style={styles.emptySectionText}>No section data available</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Quick Actions Card */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Students')}
          >
            <Text style={styles.actionButtonText}>View All Students</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.actionButtonText}>Generate Reports</Text>
          </TouchableOpacity>
          
          {/* Add Student Button - Only visible to admins and teachers */}
          {(isAdmin || isTeacher) && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setIsAddStudentModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>+ Add Student</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Footer space */}
        <View style={{ height: 40 }} />
      </ScrollView>
      
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
                <View style={[styles.bmiPreviewContainer, styles.bmiPreviewLower]}>
                  <Text style={styles.bmiPreviewTitle}>BMI Preview</Text>
                  <View style={styles.bmiPreviewContent}>
                    <Text style={styles.bmiPreviewValue}>
                      BMI: <Text style={styles.bmiPreviewNumber}>{bmiPreview.bmi.toFixed(1)}</Text>
                    </Text>
                    <Text style={[
                      styles.bmiPreviewStatus,
                      { color: getBmiStatusColor(bmiPreview.status) }
                    ]}>
                      Status: {bmiPreview.status}
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1565C0',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  inputIcon: {
    backgroundColor: '#E3F2FD',
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  inputIconText: {
    fontSize: 16,
  },
  requiredFieldsNote: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1565C0',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0D47A1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  syncTimeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollContainer: {
    backgroundColor: '#F0F6FF',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  cardContainerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 15,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 10,
    textAlign: 'left',
  },
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 15,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#1565C0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
    width: '100%',
    maxHeight: '85%',
  },
  modalDivider: {
    height: 2,
    backgroundColor: '#E8F5E9',
    marginBottom: 15,
    marginHorizontal: -25,
  },
  requiredFieldsNote: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsItem: {
    width: '48%',
    marginVertical: 8,
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  nutritionChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  pieChartWrapper: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 0.8,
  },
  nutritionLegend: {
    flex: 1.2,
    justifyContent: 'center',
    paddingLeft: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#333',
  },
  legendPercent: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyChartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 16,
    color: '#888',
  },
  bmiPreviewLower: {
    marginTop: 15,
    marginBottom: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
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
  disabledButton: {
    backgroundColor: '#A5D6A7',
    shadowOpacity: 0,
  },
  sectionContainer: {
    marginTop: 10,
  },
  sectionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
  },
  sectionProgressBar: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  sectionProgressSegment: {
    height: '100%',
  },
  normalSegment: {
    backgroundColor: '#4CAF50',
  },
  underweightSegment: {
    backgroundColor: '#FFC107',
  },
  overweightSegment: {
    backgroundColor: '#F44336',
  },
  sectionLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  sectionLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  sectionLegendText: {
    fontSize: 12,
    color: '#666',
  },
  sectionArrow: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -12,
  },
  sectionArrowText: {
    fontSize: 24,
    color: '#999',
  },
  emptySectionContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  emptySectionText: {
    fontSize: 16,
    color: '#888',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
});

// Export the component directly without withSafeArea
export default DashboardScreen; 