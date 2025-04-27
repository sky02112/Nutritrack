import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { generateStudentReport, generateClassReport } from '../services/reportService';
import { getStudentById, getStudentsByGrade, checkFirestoreConnection } from '../services/studentService';
import { StatusBar } from 'expo-status-bar';
import { useSyncContext } from '../store/SyncContext';
import withSafeArea from '../components/withSafeArea';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const ReportsScreen = () => {
  const { lastSyncTime, isSyncing } = useSyncContext(); // Access sync context
  const [reportType, setReportType] = useState('class'); // 'class' or 'individual'
  const [selectedGrade, setSelectedGrade] = useState('3');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [firestoreConnected, setFirestoreConnected] = useState(true);
  
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
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
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
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
        
        {/* Report Display */}
        {report && (
          <View style={styles.reportContainer}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>
                {reportType === 'class' ? `Grade ${selectedGrade} Report` : 'Student Report'}
              </Text>
              <Text style={styles.reportDate}>
                Generated: {formatDate(report.generatedAt)}
              </Text>
            </View>
            
            {reportType === 'class' ? (
              // Class Report Content
              <View style={styles.reportContent}>
                <View style={styles.reportSummary}>
                  <Text style={styles.reportLabel}>Total Students:</Text>
                  <Text style={styles.reportValue}>{report.studentCount}</Text>
                </View>
                
                {report.classAverages && (
                  <>
                    <Text style={styles.reportSectionTitle}>Class Averages</Text>
                    
                    <View style={styles.reportSummary}>
                      <Text style={styles.reportLabel}>Average Height:</Text>
                      <Text style={styles.reportValue}>
                        {report.classAverages.averageHeight} cm
                      </Text>
                    </View>
                    
                    <View style={styles.reportSummary}>
                      <Text style={styles.reportLabel}>Average Weight:</Text>
                      <Text style={styles.reportValue}>
                        {report.classAverages.averageWeight} kg
                      </Text>
                    </View>
                    
                    <View style={styles.reportSummary}>
                      <Text style={styles.reportLabel}>Average BMI:</Text>
                      <Text style={styles.reportValue}>
                        {report.classAverages.averageBmi}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ) : (
              // Individual Report Content
              <View style={styles.reportContent}>
                {report.student && (
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {report.student.firstName} {report.student.lastName}
                    </Text>
                    <Text style={styles.studentDetails}>
                      Grade {report.student.grade} | ID: {report.student.studentId}
                    </Text>
                  </View>
                )}
                
                {report.records && report.records.length > 0 ? (
                  <>
                    <Text style={styles.reportSectionTitle}>Latest Measurements</Text>
                    
                    {report.records[report.records.length - 1] && (
                      <View style={styles.measurementItem}>
                        <Text style={styles.measurementDate}>
                          {formatDate(report.records[report.records.length - 1].date)}
                        </Text>
                        
                        <View style={styles.measurementDetails}>
                          <View style={styles.reportSummary}>
                            <Text style={styles.reportLabel}>Height:</Text>
                            <Text style={styles.reportValue}>
                              {report.records[report.records.length - 1].height} cm
                            </Text>
                          </View>
                          
                          <View style={styles.reportSummary}>
                            <Text style={styles.reportLabel}>Weight:</Text>
                            <Text style={styles.reportValue}>
                              {report.records[report.records.length - 1].weight} kg
                            </Text>
                          </View>
                          
                          <View style={styles.reportSummary}>
                            <Text style={styles.reportLabel}>BMI:</Text>
                            <Text style={styles.reportValue}>
                              {report.records[report.records.length - 1].bmi}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                    
                    <Text style={styles.reportSectionTitle}>Growth Trends</Text>
                    
                    {report.trends && (
                      <View style={styles.trendsContainer}>
                        <View style={styles.reportSummary}>
                          <Text style={styles.reportLabel}>Height Change:</Text>
                          <Text style={[
                            styles.reportValue,
                            report.trends.heightChange > 0 ? styles.positiveChange : 
                            report.trends.heightChange < 0 ? styles.negativeChange : {}
                          ]}>
                            {report.trends.heightChange > 0 ? '+' : ''}
                            {report.trends.heightChange} cm
                          </Text>
                        </View>
                        
                        <View style={styles.reportSummary}>
                          <Text style={styles.reportLabel}>Weight Change:</Text>
                          <Text style={[
                            styles.reportValue,
                            report.trends.weightChange > 0 ? styles.positiveChange : 
                            report.trends.weightChange < 0 ? styles.negativeChange : {}
                          ]}>
                            {report.trends.weightChange > 0 ? '+' : ''}
                            {report.trends.weightChange} kg
                          </Text>
                        </View>
                        
                        <View style={styles.reportSummary}>
                          <Text style={styles.reportLabel}>BMI Change:</Text>
                          <Text style={[
                            styles.reportValue,
                            report.trends.bmiChange > 0 ? styles.positiveChange : 
                            report.trends.bmiChange < 0 ? styles.negativeChange : {}
                          ]}>
                            {report.trends.bmiChange > 0 ? '+' : ''}
                            {report.trends.bmiChange}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noDataText}>
                    No health records available for this student.
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => Alert.alert('Export', 'This feature is coming soon!')}
            >
              <Text style={styles.exportButtonText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: 20,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
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
    backgroundColor: '#455A64',
    padding: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

// Wrap ReportsScreen with SafeAreaWrapper
export default withSafeArea(ReportsScreen, {
  backgroundColor: '#F5F7FA',
  statusBarStyle: 'dark-content'
}); 