import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { View, Text, StatusBar } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import SafeAreaWrapper from './src/components/SafeAreaWrapper';

// Hide the native splash screen immediately
ExpoSplashScreen.hideAsync().catch(e => {
  console.log('Error hiding Expo splash screen:', e);
});

// Create a custom event emitter for React Native
class CustomEventEmitter {
  constructor() {
    this.listeners = {};
    this.maxListeners = 10;
  }

  emit(eventName, ...args) {
    if (!this.listeners[eventName]) {
      return false;
    }
    
    this.listeners[eventName].forEach(callback => {
      callback(...args);
    });
    return true;
  }

  addListener(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    
    this.listeners[eventName].push(callback);
    return {
      remove: () => this.removeListener(eventName, callback)
    };
  }

  removeListener(eventName, callback) {
    if (!this.listeners[eventName]) {
      return;
    }
    
    const index = this.listeners[eventName].indexOf(callback);
    if (index !== -1) {
      this.listeners[eventName].splice(index, 1);
    }
  }

  removeAllListeners(eventName) {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      this.listeners = {};
    }
  }

  setMaxListeners(n) {
    this.maxListeners = n;
  }
}

// Create a global event emitter for app-wide events
global.eventEmitter = new CustomEventEmitter();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  // Initialize app resources
  useEffect(() => {
    const prepare = async () => {
      try {
        // Set up event emitter
        if (global.eventEmitter) {
          global.eventEmitter.setMaxListeners(20);
        }
        
        // Simulate resource loading
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        // Let the app know we're ready
        setAppIsReady(true);
      }
    };

    prepare();

    return () => {
      // Clean up event listeners
      if (global.eventEmitter) {
        global.eventEmitter.removeAllListeners();
      }
    };
  }, []);

  // Handle splash screen completion
  const handleSplashComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  if (!appIsReady) {
    return (
      <SafeAreaProvider>
        <SafeAreaWrapper
          backgroundColor="#1565C0"
          statusBarStyle="light-content"
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white' }}>Loading...</Text>
          </View>
        </SafeAreaWrapper>
      </SafeAreaProvider>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={handleSplashComplete} />
      </SafeAreaProvider>
    );
  }
  
  return (
    <SafeAreaProvider>
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
