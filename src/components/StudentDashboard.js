import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions, 
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { FontAwesome5 } from '@expo/vector-icons';
import { getStudentDashboardData } from '../services/studentService';
import { Card, Title, Paragraph, Button, useTheme } from 'react-native-paper';
import { getStudentData, getStudentNutritionData, getStudentExerciseData } from '../services/dataService';
import { formatDate } from '../utils/dateUtils';

// Helper functions outside the component
const getBmiStatusColor = (status) => {
  switch(status?.toLowerCase()) {
    case 'underweight': return '#FFC107'; // Amber
    case 'normal': return '#4CAF50';      // Green
    case 'overweight': return '#FF9800'; // Orange
    case 'obese': return '#F44336';      // Red
    default: return '#9E9E9E';           // Grey
  }
};

const StudentDashboard = ({ userDetails }) => {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [nutritionData, setNutritionData] = useState([]);
  const [exerciseData, setExerciseData] = useState([]);
  const [error, setError] = useState(null);
  const theme = useTheme();
  
  useEffect(() => {
    loadStudentData();
  }, [userDetails]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userDetails?.uid) {
        console.error('User ID not found in userDetails:', userDetails);
        throw new Error('User ID not found');
      }
      
      console.log('Loading student data for user:', userDetails.uid);
      
      // Fetch student profile data
      const data = await getStudentData(userDetails.uid);
      console.log('Received student data:', {
        hasStudent: !!data?.student,
        nutritionLogsCount: data?.nutritionLogs?.length || 0,
        exerciseLogsCount: data?.exerciseLogs?.length || 0
      });
      
      if (!data) {
        throw new Error('Failed to load student data');
      }
      setStudentData(data);
      
      // Fetch nutrition data
      const nutrition = await getStudentNutritionData(userDetails.uid);
      console.log('Received nutrition data:', nutrition?.length || 0, 'records');
      setNutritionData(nutrition || []);
      
      // Fetch exercise data
      const exercise = await getStudentExerciseData(userDetails.uid);
      console.log('Received exercise data:', exercise?.length || 0, 'records');
      setExerciseData(exercise || []);
      
    } catch (error) {
      console.error("Error loading student data:", error);
      setError(error.message || 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  // Chart rendering functions
  const renderNutritionChart = () => {
    if (!nutritionData || nutritionData.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>No nutrition data available</Text>
        </View>
      );
    }

    // Format data for the chart
    const labels = nutritionData.map(item => item.date);
    const data = nutritionData.map(item => item.calories);

    const chartData = {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(50, 150, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Calories'],
    };

    return (
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 40}
        height={220}
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: theme.colors.surface,
          backgroundGradientFrom: theme.colors.surface,
          backgroundGradientTo: theme.colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(50, 150, 255, ${opacity})`,
          labelColor: (opacity = 1) => theme.colors.text,
          style: {
            borderRadius: 16,
          },
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  const renderExerciseChart = () => {
    if (!exerciseData || exerciseData.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>No exercise data available</Text>
        </View>
      );
    }

    // Format data for the chart
    const labels = exerciseData.map(item => item.date);
    const data = exerciseData.map(item => item.minutes);

    const chartData = {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Minutes'],
    };

    return (
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 40}
        height={220}
        yAxisSuffix=" min"
        chartConfig={{
          backgroundColor: theme.colors.surface,
          backgroundGradientFrom: theme.colors.surface,
          backgroundGradientTo: theme.colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`,
          labelColor: (opacity = 1) => theme.colors.text,
          style: {
            borderRadius: 16,
          },
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  // Helper calculation functions
  const calculateAverageCalories = () => {
    if (!nutritionData || nutritionData.length === 0) return 0;
    const sum = nutritionData.reduce((total, item) => total + item.calories, 0);
    return Math.round(sum / nutritionData.length);
  };

  const calculateAverageExerciseMinutes = () => {
    if (!exerciseData || exerciseData.length === 0) return 0;
    const sum = exerciseData.reduce((total, item) => total + item.minutes, 0);
    return Math.round(sum / exerciseData.length);
  };

  const calculateGoalProgress = () => {
    // This is a simple example - you can implement a more complex calculation
    // based on your app's specific goals
    const calorieGoal = 2000; // Example daily calorie goal
    const exerciseGoal = 30;  // Example daily exercise goal in minutes
    
    const avgCalories = calculateAverageCalories();
    const avgExercise = calculateAverageExerciseMinutes();
    
    const calorieProgress = Math.min(100, Math.max(0, 100 - Math.abs((avgCalories - calorieGoal) / calorieGoal * 100)));
    const exerciseProgress = Math.min(100, (avgExercise / exerciseGoal) * 100);
    
    // Average the two progress metrics
    return Math.round((calorieProgress + exerciseProgress) / 2);
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.loadingText}>Loading your health data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <FontAwesome5 name="exclamation-circle" size={40} color="#F44336" />
          <Text style={styles.errorTitle}>Unable to load data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadStudentData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render empty state
  if (!studentData || !studentData.student) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <FontAwesome5 name="user-alt" size={40} color="#1565C0" />
          <Text style={styles.emptyTitle}>No Health Records Found</Text>
          <Text style={styles.emptyText}>Your health information hasn't been added yet.</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Extract data
  const { student, records, latestRecord, bmiTrend } = studentData;
  
  // Prepare chart data if we have enough records
  const chartData = {
    labels: [],
    datasets: [
      {
        data: [0],
        color: () => '#1565C0',
        strokeWidth: 2
      }
    ]
  };
  
  // Only prepare chart data if we have records
  if (records && records.length > 1) {
    chartData.labels = records.slice(0, 6).reverse().map(r => {
      const date = r.date && r.date.toDate ? r.date.toDate() : new Date(r.date);
      return `${date.getMonth()+1}/${date.getDate()}`;
    });
    
    chartData.datasets[0].data = records.slice(0, 6).reverse().map(r => r.bmi || 0);
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {student.firstName || userDetails.displayName || 'Student'}</Text>
          <Text style={styles.subtitle}>Your Health Dashboard</Text>
        </View>
        
        {/* Latest Health Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Latest Health Stats</Text>
          
          {latestRecord ? (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{latestRecord.height} cm</Text>
                <Text style={styles.statLabel}>Height</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{latestRecord.weight} kg</Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{latestRecord.bmi?.toFixed(1) || 'N/A'}</Text>
                <Text style={styles.statLabel}>BMI</Text>
              </View>
              
              <View style={styles.statItem}>
                <View style={[styles.statusBadge, { backgroundColor: getBmiStatusColor(latestRecord.bmiStatus) }]}>
                  <Text style={styles.statusText}>{latestRecord.bmiStatus || 'N/A'}</Text>
                </View>
                <Text style={styles.statLabel}>Status</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No records available yet</Text>
          )}
          
          {latestRecord && latestRecord.date && (
            <Text style={styles.lastUpdatedText}>
              Last updated: {latestRecord.date.toDate 
                ? latestRecord.date.toDate().toLocaleDateString() 
                : new Date(latestRecord.date).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        {/* BMI Trend - Only show if we have multiple records */}
        {records && records.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your BMI Trend</Text>
            
            <LineChart
              data={chartData}
              width={Dimensions.get("window").width - 40}
              height={220}
              chartConfig={{
                backgroundColor: "#FFFFFF",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#1565C0"
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
            />
            
            {bmiTrend && (
              <View style={styles.trendContainer}>
                <Text style={styles.trendText}>
                  Your BMI has {' '}
                  <Text style={[
                    styles.trendValueText,
                    {color: bmiTrend.direction === 'up' 
                      ? '#F44336' 
                      : bmiTrend.direction === 'down' 
                        ? '#4CAF50' 
                        : '#757575'}
                  ]}>
                    {bmiTrend.direction === 'up' 
                      ? 'increased' 
                      : bmiTrend.direction === 'down' 
                        ? 'decreased' 
                        : 'remained stable'}{' '}
                    ({Math.abs(bmiTrend.change).toFixed(2)})
                  </Text>
                  {' '}since your first record.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Health Tips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health Tips</Text>
          <View style={styles.tipContainer}>
            <FontAwesome5 name="lightbulb" size={20} color="#FFC107" style={styles.tipIcon} />
            <Text style={styles.tipText}>Drink at least 8 glasses of water daily</Text>
          </View>
          <View style={styles.tipContainer}>
            <FontAwesome5 name="apple-alt" size={20} color="#4CAF50" style={styles.tipIcon} />
            <Text style={styles.tipText}>Include fruits and vegetables in every meal</Text>
          </View>
          <View style={styles.tipContainer}>
            <FontAwesome5 name="running" size={20} color="#2196F3" style={styles.tipIcon} />
            <Text style={styles.tipText}>Try to be active for at least 60 minutes each day</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Nutrition Tracking</Title>
            <Paragraph>Your daily calorie intake over the last week</Paragraph>
            
            {renderNutritionChart()}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Exercise Tracking</Title>
            <Paragraph>Your daily exercise minutes over the last week</Paragraph>
            
            {renderExerciseChart()}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Progress Summary</Title>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{calculateAverageCalories()}</Text>
                <Text style={styles.statLabel}>Avg. Daily Calories</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{calculateAverageExerciseMinutes()}</Text>
                <Text style={styles.statLabel}>Avg. Exercise (min)</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{calculateGoalProgress()}%</Text>
                <Text style={styles.statLabel}>Goal Progress</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Nutrition Tips</Title>
            <Paragraph>• Try to include protein with every meal</Paragraph>
            <Paragraph>• Aim for 5 servings of vegetables daily</Paragraph>
            <Paragraph>• Stay hydrated with at least 8 glasses of water</Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F6FF',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1565C0',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#1565C0',
    borderRadius: 8,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
    marginTop: 8,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    padding: 20,
  },
  trendContainer: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 8,
  },
  trendText: {
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
  },
  trendValueText: {
    fontWeight: 'bold',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIcon: {
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#1565C0',
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default StudentDashboard; 