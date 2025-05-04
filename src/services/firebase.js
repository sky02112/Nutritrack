import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkLjbzvLlLpIwCKulGFZ4F35_0k-yLzck",
  authDomain: "nutritrack-a15df.firebaseapp.com",
  projectId: "nutritrack-a15df",
  storageBucket: "nutritrack-a15df.appspot.com",
  messagingSenderId: "826604945403",
  appId: "1:826604945403:android:b165d102c12aaedaab955e"
};

// Initialize Firebase
console.log("Initializing Firebase...");
const app = initializeApp(firebaseConfig);

// Initialize Auth with platform detection
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
  console.log("Using web auth");
} else {
  // For React Native, use AsyncStorage persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log("Using React Native auth with AsyncStorage persistence");
  } catch (error) {
    console.error("Error initializing auth with persistence:", error);
    // Fallback to standard auth
    auth = getAuth(app);
    console.log("Fallback: Using standard auth without persistence");
  }
}

// Initialize Firestore
const db = getFirestore(app);
console.log("Firebase services initialized");

export { app, auth, db };

// Helper functions
export const isFirebaseAvailable = () => {
  return app != null;
};

export const handleFirebaseError = (error) => {
  console.error("Firebase error:", error);
  return { error };
}; 