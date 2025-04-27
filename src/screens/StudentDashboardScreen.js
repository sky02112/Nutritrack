import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, useTheme } from 'react-native-paper';
import { useAuth } from '../store/AuthContext';
import { getStudentNutritionData, getStudentExerciseData } from '../services/dataService';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import LoadingScreen from '../components/LoadingScreen';
import StudentDashboard from '../components/StudentDashboard';
import { useSyncContext } from '../store/SyncContext';

const StudentDashboardScreen = ({ navigation }) => {
  const { user, userDetails } = useAuth();
  const { syncData, isSyncing } = useSyncContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    // Initial data loading
    loadDashboardData();
  }, []);

  // Listen for sync events
  useEffect(() => {
    const syncHandler = () => {
      loadDashboardData();
    };
    
    if (global.eventEmitter) {
      global.eventEmitter.addListener('SYNC_DATA', syncHandler);
    }
    
    return () => {
      if (global.eventEmitter) {
        global.eventEmitter.removeListener('SYNC_DATA', syncHandler);
      }
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (user && user.uid) {
        // Fetch actual data for the student
        const nutritionData = await getStudentNutritionData(user.uid);
        const exerciseData = await getStudentExerciseData(user.uid);
        
        // We don't actually need to set state here since the StudentDashboard component
        // fetches its own data, but in a real app you might want to set state with this data
        console.log('Dashboard data loaded successfully');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing || isSyncing} 
          onRefresh={onRefresh} 
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Student Dashboard</Text>
        <Text style={styles.subHeaderText}>Welcome, {userDetails?.displayName || user?.displayName || 'Student'}</Text>
      </View>

      {/* We're reusing the StudentDashboard component here */}
      <StudentDashboard userDetails={userDetails || user} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F6FF',
  },
  header: {
    padding: 20,
    backgroundColor: '#1565C0',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subHeaderText: {
    fontSize: 16,
    color: 'white',
    marginTop: 5,
  },
});

export default StudentDashboardScreen; 