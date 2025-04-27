import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { SyncProvider, useSyncContext } from '../store/SyncContext';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SafeAreaWrapper from '../components/SafeAreaWrapper';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import StudentTrackingScreen from '../screens/StudentTrackingScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminScreen from '../screens/AdminScreen';
import StudentDashboardScreen from '../screens/StudentDashboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Navigator - Handles authentication flow
const AuthNavigator = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: '#FFFFFF' }
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Student Tab Navigator - For student users
const StudentTabNavigator = () => {
  const { isAuthenticated } = useAuth();
  const { syncData } = useSyncContext();
  
  // If not authenticated, return null to prevent rendering
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'StudentDashboard') {
            iconName = 'chart-line';
          } else if (route.name === 'Profile') {
            iconName = 'user-circle';
          }

          return <FontAwesome5 name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          paddingVertical: 5,
          height: 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          ...(Platform.OS === 'ios' ? { height: 85 } : { height: 60 }),
        },
      })}
      screenListeners={({ navigation }) => ({
        tabPress: (e) => {
          if (!e.defaultPrevented) {
            // syncData(); // Commented out to prevent sync on tab press
          }
        },
      })}
    >
      <Tab.Screen 
        name="StudentDashboard" 
        component={StudentDashboardScreen} 
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Dashboard Tab Navigator - Main app screens for admins and teachers
const DashboardTabNavigator = () => {
  const { isAdmin, isAuthenticated, isStudent } = useAuth();
  const { syncData } = useSyncContext();
  
  // If not authenticated, return null to prevent rendering
  if (!isAuthenticated) {
    return null;
  }
  
  // If student user, use the student tab navigator
  if (isStudent) {
    return <StudentTabNavigator />;
  }
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'chart-bar';
          } else if (route.name === 'Students') {
            iconName = 'user-friends';
          } else if (route.name === 'Reports') {
            iconName = 'file-alt';
          } else if (route.name === 'Profile') {
            iconName = 'user-circle';
          } else if (route.name === 'Admin') {
            iconName = 'users-cog';
          }

          return <FontAwesome5 name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          paddingVertical: 5,
          height: 60,
          // Add bottom padding on iOS to handle the home indicator
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          // Ensure tab bar doesn't overlap with content at the bottom
          ...(Platform.OS === 'ios' ? { height: 85 } : { height: 60 }),
        },
      })}
      screenListeners={({ navigation }) => ({
        tabPress: (e) => {
          if (!e.defaultPrevented) {
            // syncData(); // Commented out to prevent sync on tab press
          }
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Students" component={StudentTrackingScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminScreen} />}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Loading component
const LoadingScreen = () => (
  <SafeAreaWrapper
    backgroundColor="#F5F7FA"
    statusBarStyle="dark-content"
  >
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1565C0" />
    </View>
  </SafeAreaWrapper>
);

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          dark: false,
          colors: {
            primary: '#1565C0',
            background: '#F5F7FA',
            card: '#FFFFFF',
            text: '#1F2937',
            border: '#E5E7EB',
            notification: '#1565C0',
          },
          fonts: {
            regular: {
              fontFamily: undefined,
              fontWeight: 'normal',
            },
            medium: {
              fontFamily: undefined,
              fontWeight: '500',
            },
            light: {
              fontFamily: undefined,
              fontWeight: '300',
            },
            thin: {
              fontFamily: undefined,
              fontWeight: '100',
            },
          }
        }}
      >
        <SyncProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              <Stack.Screen name="MainApp" component={DashboardTabNavigator} />
            ) : (
              <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
          </Stack.Navigator>
        </SyncProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator; 