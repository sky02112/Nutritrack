import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { generateStudentReport, generateClassReport } from '../services/reportService';
import { getStudentById, getStudentsByGrade, checkFirestoreConnection } from '../services/studentService';
import { StatusBar } from 'expo-status-bar';
import { useSyncContext } from '../store/SyncContext';
import withSafeArea from '../components/withSafeArea';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ReportsScreen = () => {
  const { lastSyncTime, isSyncing } = useSyncContext(); // Access sync context
  const [reportType, setReportType] = useState('class'); // 'class' or 'individual'
  const [selectedGrade, setSelectedGrade] = useState('3');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [firestoreConnected, setFirestoreConnected] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Animation value for report container
  const reportAnimation = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  
  // Check Firestore connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const { connected } = await checkFirestoreConnection();
      setFirestoreConnected(connected);
      
      if (!connected) {
        Alert.alert(
          'Connection Error',
          'Could not connect to the database. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    };
    
    checkConnection();
  }, []);
  
  // Load student data when component mounts or grade changes
  useEffect(() => {
    if (reportType === 'individual') {
      fetchStudentsByGrade(selectedGrade);
    }
  }, [selectedGrade, reportType, firestoreConnected]);
  
  // Listen for sync events
  useEffect(() => {
    // Set up event listener for sync data events
    const syncHandler = () => {
      if (report) {
        // Re-generate the current report when sync is triggered
        handleGenerateReport();
      } else {
        // Just refresh student list if no report is currently shown
        if (reportType === 'individual') {
          fetchStudentsByGrade(selectedGrade);
        }
      }
    };
    
    // Add event listener
    if (global.eventEmitter) {
      global.eventEmitter.addListener('SYNC_DATA', syncHandler);
    }
    
    // Clean up event listener
    return () => {
      if (global.eventEmitter) {
        global.eventEmitter.removeListener('SYNC_DATA', syncHandler);
      }
    };
  }, [report, reportType, selectedGrade]);
  
  // Fetch students for a specific grade
  const fetchStudentsByGrade = async (grade) => {
    if (!firestoreConnected) {
      Alert.alert(
        'Connection Error',
        'Not connected to database. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const { students, error } = await getStudentsByGrade(grade);
      
      if (error) {
        console.error('Error fetching students:', error);
        // Try a direct Firestore query fallback if the service method fails
        try {
          console.log('Using direct Firestore query fallback');
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('grade', '==', grade));
          const querySnapshot = await getDocs(q);
          
          const fallbackStudents = [];
          querySnapshot.forEach((doc) => {
            fallbackStudents.push({ id: doc.id, ...doc.data() });
          });
          
          // Sort the students by last name
          fallbackStudents.sort((a, b) => {
            const lastNameA = (a.lastName || '').toLowerCase();
            const lastNameB = (b.lastName || '').toLowerCase();
            return lastNameA.localeCompare(lastNameB);
          });
          
          console.log('Fallback query found:', fallbackStudents.length, 'students');
          
          if (fallbackStudents.length > 0) {
            setStudents(fallbackStudents);
            setSelectedStudentId(fallbackStudents[0].id);
          } else {
            setStudents([]);
            setSelectedStudentId('');
            Alert.alert('No Students', `No students found in Grade ${grade}. Please add students first.`);
          }
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
          Alert.alert('Error', 'Failed to fetch students. Please check your connection and try again.');
          setStudents([]);
          setSelectedStudentId('');
        }
      } else {
        setStudents(students || []);
        if (students && students.length > 0) {
          setSelectedStudentId(students[0].id);
        } else {
          setSelectedStudentId('');
          // Only show alert if we actually got an empty array (not error)
          if (Array.isArray(students)) {
            Alert.alert('No Students', `No students found in Grade ${grade}. Please add students first.`);
          }
        }
      }
    } catch (error) {
      console.error('Exception in fetchStudentsByGrade:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      setStudents([]);
      setSelectedStudentId('');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle grade selection change
  const handleGradeChange = (grade) => {
    setSelectedGrade(grade);
    setReport(null);
    fetchStudentsByGrade(grade);
  };
  
  // Generate report based on selected type
  const handleGenerateReport = async () => {
    setLoading(true);
    setReport(null);
    
    try {
      if (reportType === 'class') {
        const { report, error } = await generateClassReport(selectedGrade);
        
        if (error) {
          console.error('Class report generation error:', error);
          
          // Fallback: Try to manually generate a simpler class report
          try {
            console.log('Attempting fallback class report generation');
            // Get students directly from Firestore
            const studentsRef = collection(db, 'students');
            const q = query(studentsRef, where('grade', '==', selectedGrade));
            const querySnapshot = await getDocs(q);
            
            const students = [];
            querySnapshot.forEach((doc) => {
              students.push({ id: doc.id, ...doc.data() });
            });
            
            if (students.length === 0) {
              Alert.alert('No Data', `No students found in Grade ${selectedGrade}. Please add students first.`);
              setLoading(false);
              return;
            }
            
            // Create a simplified report
            const fallbackReport = {
              grade: selectedGrade,
              studentCount: students.length,
              generatedAt: new Date(),
              classAverages: {
                averageHeight: 0,
                averageWeight: 0,
                averageBmi: 0
              }
            };
            
            setReport(fallbackReport);
          } catch (fallbackError) {
            console.error('Fallback report generation failed:', fallbackError);
            Alert.alert(
              'Report Generation Failed', 
              error.message || 'Failed to generate class report. Please try again later.'
            );
          }
        } else if (report) {
          setReport(report);
          setShowReportModal(true);
        } else {
          Alert.alert('Report Error', 'No data available to generate report');
        }
      } else {
        if (!selectedStudentId) {
          Alert.alert('Input Required', 'Please select a student');
          setLoading(false);
          return;
        }
        
        const { report, error } = await generateStudentReport(selectedStudentId);
        if (error) {
          console.error('Student report generation error:', error);
          Alert.alert(
            'Report Generation Failed', 
            error.message || 'Failed to generate student report. Please try again later.'
          );
        } else if (report) {
          setReport(report);
          setShowReportModal(true);
        } else {
          Alert.alert('Report Error', 'No data available to generate report');
        }
      }
    } catch (error) {
      console.error('Report generation exception:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Close the report modal
  const closeReportModal = () => {
    setShowReportModal(false);
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };
  
  // Render BMI status indicator
  const renderBmiStatus = (bmi) => {
    let statusColor = '#4CAF50'; // Default green
    let statusText = 'Normal';
    
    if (bmi < 18.5) {
      statusColor = '#FF9800'; // Orange
      statusText = 'Underweight';
    } else if (bmi >= 25) {
      statusColor = '#F44336'; // Red
      statusText = 'Overweight';
    }
    
    return (
      <View style={styles.bmiStatusContainer}>
        <View style={[styles.bmiStatusIndicator, { backgroundColor: statusColor }]} />
        <Text style={[styles.bmiStatusText, { color: statusColor }]}>{statusText}</Text>
      </View>
    );
  };
  
  // Health recommendations based on BMI status
  const getHealthRecommendations = (bmi) => {
    if (bmi < 18.5) {
      return {
        title: 'Underweight Recommendations',
        suggestions: [
          'Increase calorie intake with nutrient-dense foods like nuts, avocados, and whole grains',
          'Eat frequent, smaller meals throughout the day',
          'Include protein-rich foods with each meal (eggs, lean meats, legumes)',
          'Consider strength training to build healthy muscle mass',
          'Consult a nutritionist for personalized guidance'
        ]
      };
    } else if (bmi >= 25) {
      return {
        title: 'Overweight Recommendations',
        suggestions: [
          'Focus on whole, unprocessed foods (vegetables, fruits, lean proteins)',
          'Reduce portion sizes and limit sugary drinks',
          'Aim for 150+ minutes of moderate exercise weekly',
          'Practice mindful eating and reduce snacking',
          'Stay hydrated and get adequate sleep'
        ]
      };
    } else {
      return {
        title: 'Healthy Weight Maintenance',
        suggestions: [
          'Maintain balanced diet with variety of food groups',
          'Continue regular physical activity (30+ minutes most days)',
          'Monitor portion sizes to prevent gradual weight gain',
          'Stay hydrated with water instead of sugary drinks',
          'Get regular health check-ups'
        ]
      };
    }
  };

  // Render health recommendations
  const renderHealthRecommendations = (bmi) => {
    const { title, suggestions } = getHealthRecommendations(bmi);
    
    return (
      <View style={styles.reportCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="heart" size={24} color="#1565C0" />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        
        <View style={styles.recommendationsContainer}>
          {suggestions.map((item, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.recommendationIcon} />
              <Text style={styles.recommendationText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  // Render report content
  const renderReportContent = () => {
    if (!report) return null;
    
    return (
      <>
        {reportType === 'class' ? (
          // Class Report Content
          <View style={styles.reportContent}>
            <View style={styles.reportCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={24} color="#1565C0" />
                <Text style={styles.cardTitle}>Class Overview</Text>
              </View>
              
              <View style={styles.reportSummary}>
                <Text style={styles.reportLabel}>Total Students:</Text>
                <Text style={styles.reportValue}>{report.studentCount}</Text>
              </View>
            </View>
            
            {report.classAverages && (
              <View style={styles.reportCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="stats-chart" size={24} color="#1565C0" />
                  <Text style={styles.cardTitle}>Class Averages</Text>
                </View>
                
                <View style={styles.reportSummary}>
                  <Text style={styles.reportLabel}>Average Height:</Text>
                  <Text style={styles.reportValue}>
                    {report.classAverages.averageHeight} <Text style={styles.unit}>cm</Text>
                  </Text>
                </View>
                
                <View style={styles.reportSummary}>
                  <Text style={styles.reportLabel}>Average Weight:</Text>
                  <Text style={styles.reportValue}>
                    {report.classAverages.averageWeight} <Text style={styles.unit}>kg</Text>
                  </Text>
                </View>
                
                <View style={styles.reportSummary}>
                  <Text style={styles.reportLabel}>Average BMI:</Text>
                  <View style={styles.valueWithStatus}>
                    <Text style={styles.reportValue}>
                      {report.classAverages.averageBmi}
                    </Text>
                    {renderBmiStatus(report.classAverages.averageBmi)}
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          // Individual Report Content
          <View style={styles.reportContent}>
            {report.student && (
              <View style={styles.reportCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person" size={24} color="#1565C0" />
                  <Text style={styles.cardTitle}>Student Information</Text>
                </View>
                
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>
                    {report.student.firstName} {report.student.lastName}
                  </Text>
                  <View style={styles.studentDetailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="school-outline" size={16} color="#666" style={styles.detailIcon} />
                      <Text style={styles.studentDetails}>
                        Grade {report.student.grade}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="key-outline" size={16} color="#666" style={styles.detailIcon} />
                      <Text style={styles.studentDetails}>
                        ID: {report.student.studentId}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.studentDetailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name={report.student.gender === 'male' ? "male-outline" : "female-outline"} 
                        size={16} color="#666" style={styles.detailIcon} />
                      <Text style={styles.studentDetails}>
                        {report.student.gender ? (report.student.gender.charAt(0).toUpperCase() + report.student.gender.slice(1)) : 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={16} color="#666" style={styles.detailIcon} />
                      <Text style={styles.studentDetails}>
                        Age: {report.student.age || 'Unknown'} years
                      </Text>
                    </View>
                  </View>

                  {report.student.section && (
                    <View style={styles.studentDetailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="people-outline" size={16} color="#666" style={styles.detailIcon} />
                        <Text style={styles.studentDetails}>
                          Section: {report.student.section}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
            
            {report.records && report.records.length > 0 ? (
              <>
                <View style={styles.reportCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="calendar" size={24} color="#1565C0" />
                    <Text style={styles.cardTitle}>Latest Measurements</Text>
                  </View>
                  
                  {report.records[report.records.length - 1] && (
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementDate}>
                        {formatDate(report.records[report.records.length - 1].date)}
                      </Text>
                      
                      <View style={styles.measurementDetails}>
                        <View style={styles.measureRow}>
                          <View style={styles.measureBox}>
                            <Ionicons name="resize" size={20} color="#1565C0" />
                            <Text style={styles.measureLabel}>Height</Text>
                            <Text style={styles.measureValue}>
                              {report.records[report.records.length - 1].height}
                              <Text style={styles.unit}> cm</Text>
                            </Text>
                          </View>
                          
                          <View style={styles.measureBox}>
                            <Ionicons name="fitness" size={20} color="#1565C0" />
                            <Text style={styles.measureLabel}>Weight</Text>
                            <Text style={styles.measureValue}>
                              {report.records[report.records.length - 1].weight}
                              <Text style={styles.unit}> kg</Text>
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.bmiContainer}>
                          <View style={styles.bmiBox}>
                            <View style={styles.bmiHeader}>
                              <Ionicons name="body" size={20} color="#1565C0" />
                              <Text style={styles.bmiTitle}>BMI</Text>
                            </View>
                            <Text style={styles.bmiValue}>
                              {report.records[report.records.length - 1].bmi}
                            </Text>
                            {renderBmiStatus(report.records[report.records.length - 1].bmi)}
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={styles.reportCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="trending-up" size={24} color="#1565C0" />
                    <Text style={styles.cardTitle}>Growth Trends</Text>
                  </View>
                  
                  {report.trends && (
                    <View style={styles.trendsContainer}>
                      <View style={styles.trendItem}>
                        <View style={styles.trendIconContainer}>
                          <Ionicons name="resize" size={20} color="#1565C0" />
                        </View>
                        <View style={styles.trendContent}>
                          <Text style={styles.trendLabel}>Height Change:</Text>
                          <Text style={[
                            styles.trendValue,
                            report.trends.heightChange > 0 ? styles.positiveChange : 
                            report.trends.heightChange < 0 ? styles.negativeChange : {}
                          ]}>
                            {report.trends.heightChange > 0 ? '+' : ''}
                            {report.trends.heightChange} cm
                            {report.trends.heightChange > 0 && (
                              <Ionicons name="arrow-up" size={16} color="#4CAF50" style={styles.trendIcon} />
                            )}
                            {report.trends.heightChange < 0 && (
                              <Ionicons name="arrow-down" size={16} color="#F44336" style={styles.trendIcon} />
                            )}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.trendItem}>
                        <View style={styles.trendIconContainer}>
                          <Ionicons name="fitness" size={20} color="#1565C0" />
                        </View>
                        <View style={styles.trendContent}>
                          <Text style={styles.trendLabel}>Weight Change:</Text>
                          <Text style={[
                            styles.trendValue,
                            report.trends.weightChange > 0 ? styles.positiveChange : 
                            report.trends.weightChange < 0 ? styles.negativeChange : {}
                          ]}>
                            {report.trends.weightChange > 0 ? '+' : ''}
                            {report.trends.weightChange} kg
                            {report.trends.weightChange > 0 && (
                              <Ionicons name="arrow-up" size={16} color="#4CAF50" style={styles.trendIcon} />
                            )}
                            {report.trends.weightChange < 0 && (
                              <Ionicons name="arrow-down" size={16} color="#F44336" style={styles.trendIcon} />
                            )}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.trendItem}>
                        <View style={styles.trendIconContainer}>
                          <Ionicons name="body" size={20} color="#1565C0" />
                        </View>
                        <View style={styles.trendContent}>
                          <Text style={styles.trendLabel}>BMI Change:</Text>
                          <Text style={[
                            styles.trendValue,
                            report.trends.bmiChange > 0 ? styles.positiveChange : 
                            report.trends.bmiChange < 0 ? styles.negativeChange : {}
                          ]}>
                            {report.trends.bmiChange > 0 ? '+' : ''}
                            {report.trends.bmiChange}
                            {report.trends.bmiChange > 0 && (
                              <Ionicons name="arrow-up" size={16} color="#4CAF50" style={styles.trendIcon} />
                            )}
                            {report.trends.bmiChange < 0 && (
                              <Ionicons name="arrow-down" size={16} color="#F44336" style={styles.trendIcon} />
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.reportCard}>
                <View style={styles.noDataContainer}>
                  <Ionicons name="information-circle-outline" size={48} color="#BDBDBD" />
                  <Text style={styles.noDataText}>
                    No health records available for this student.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Add health recommendations at the end */}
        {reportType === 'individual' && report.records && report.records.length > 0 && (
          renderHealthRecommendations(report.records[report.records.length - 1].bmi)
        )}
        {reportType === 'class' && report.classAverages && (
          renderHealthRecommendations(report.classAverages.averageBmi)
        )}
      </>
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {isSyncing && (
        <View style={styles.syncingContainer}>
          <ActivityIndicator size="small" color="#1565C0" />
          <Text style={styles.syncingText}>Synchronizing data...</Text>
        </View>
      )}
      
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Report Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <View style={styles.reportTypeButtons}>
            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                reportType === 'class' && styles.reportTypeButtonActive
              ]}
              onPress={() => {
                setReportType('class');
                setReport(null);
              }}
            >
              <Text
                style={[
                  styles.reportTypeButtonText,
                  reportType === 'class' && styles.reportTypeButtonTextActive
                ]}
              >
                Class Report
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                reportType === 'individual' && styles.reportTypeButtonActive
              ]}
              onPress={() => {
                setReportType('individual');
                setReport(null);
                fetchStudentsByGrade(selectedGrade);
              }}
            >
              <Text
                style={[
                  styles.reportTypeButtonText,
                  reportType === 'individual' && styles.reportTypeButtonTextActive
                ]}
              >
                Individual Report
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Parameter Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Parameters</Text>
          
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Grade Level</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedGrade}
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
          
          {reportType === 'individual' && (
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Student</Text>
              <View style={styles.pickerContainer}>
                {loading ? (
                  <ActivityIndicator size="small" color="#1565C0" />
                ) : (
                  <Picker
                    selectedValue={selectedStudentId}
                    onValueChange={(value) => setSelectedStudentId(value)}
                    style={styles.picker}
                    enabled={students.length > 0}
                  >
                    {students.length === 0 ? (
                      <Picker.Item label="No students available" value="" />
                    ) : (
                      students.map((student) => (
                        <Picker.Item
                          key={student.id}
                          label={`${student.firstName} ${student.lastName}`}
                          value={student.id}
                        />
                      ))
                    )}
                  </Picker>
                )}
              </View>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateReport}
            disabled={loading}
          >
            <Text style={styles.generateButtonText}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Full-screen Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeReportModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient
            colors={['#1976D2', '#1565C0']}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <RNStatusBar backgroundColor="#1976D2" barStyle="light-content" />
            <View style={styles.headerTop}>
              <Text style={styles.modalTitle}>
                {reportType === 'class' ? `Grade ${selectedGrade} Report` : 'Student Report'}
              </Text>
              
         
            </View>
            <Text style={styles.modalSubtitle}>
              Generated: {report ? formatDate(report.generatedAt) : ''}
            </Text>
          </LinearGradient>
          
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderReportContent()}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => Alert.alert('Export', 'This feature is coming soon!')}
            >
              <Ionicons name="download-outline" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.exportButtonText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  syncingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    backgroundColor: '#E3F2FD',
    marginTop: 5,
    marginBottom: 5,
  },
  syncingText: {
    fontSize: 12,
    color: '#1565C0',
    marginLeft: 5,
  },
  scrollContent: {
    padding: 20,
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
  },
  reportTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportTypeButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    marginHorizontal: 5,
  },
  reportTypeButtonActive: {
    backgroundColor: '#1565C0',
  },
  reportTypeButtonText: {
    color: '#555',
    fontWeight: '500',
  },
  reportTypeButtonTextActive: {
    color: '#fff',
  },
  formField: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 5,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  generateButton: {
    backgroundColor: '#1565C0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reportHeader: {
    backgroundColor: '#1565C0',
    padding: 15,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  reportDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  reportContent: {
    padding: 15,
  },
  reportSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reportLabel: {
    fontSize: 14,
    color: '#555',
  },
  reportValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginTop: 20,
    marginBottom: 10,
  },
  studentInfo: {
    paddingBottom: 12,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  studentDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    flex: 1,
  },
  detailIcon: {
    marginRight: 6,
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
  },
  measurementItem: {
    marginBottom: 15,
  },
  measurementDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1565C0',
    marginBottom: 10,
  },
  measurementDetails: {
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    padding: 10,
  },
  trendsContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    padding: 10,
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginVertical: 30,
  },
  exportButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  modalHeader: {
    padding: 20,
    position: 'relative',
    paddingTop: Platform.OS === 'android' ? 4 : 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  // Card styles
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  
  // Report content styles
  reportContent: {
    width: '100%',
  },
  reportSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reportLabel: {
    fontSize: 15,
    color: '#555',
  },
  reportValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  unit: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'normal',
  },
  valueWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Student info styles
  studentInfo: {
    paddingBottom: 12,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  studentDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    flex: 1,
  },
  detailIcon: {
    marginRight: 6,
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
  },
  
  // Measurement styles
  measurementItem: {
    width: '100%',
  },
  measurementDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1565C0',
    marginBottom: 16,
  },
  measurementDetails: {
    width: '100%',
  },
  measureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  measureBox: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  measureLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    marginBottom: 4,
  },
  measureValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // BMI specific styles
  bmiContainer: {
    width: '100%',
  },
  bmiBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bmiTitle: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 6,
  },
  bmiValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bmiStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  bmiStatusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  bmiStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Trend styles
  trendsContainer: {
    width: '100%',
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  trendIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trendContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 15,
    color: '#555',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    marginLeft: 4,
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  
  // No data styles
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 16,
  },
  
  // New styles
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});

// Wrap ReportsScreen with SafeAreaWrapper
export default withSafeArea(ReportsScreen, {
  backgroundColor: '#F5F7FA',
  statusBarStyle: 'dark-content'
}); 