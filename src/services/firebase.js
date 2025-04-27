import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkLjbzvLlLpIwCKulGFZ4F35_0k-yLzck",
  authDomain: "nutritrack-a15df.firebaseapp.com",
  projectId: "nutritrack-a15df",
  storageBucket: "nutritrack-a15df.appspot.com",
  messagingSenderId: "826604945403",
  appId: "1:826604945403:android:b165d102c12aaedaab955e",
  functionsRegion: "us-central1"
};

// Initialize Firebase with error handling
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  
  db = getFirestore(app);
  
  // Try to enable persistence but handle errors gracefully
  if (__DEV__) {
    console.log('Firebase initialized in development mode');
  } else {
    // In production, try to enable persistence for offline support
    try {
      enableIndexedDbPersistence(db)
        .catch((err) => {
          if (err.code === 'failed-precondition') {
            console.log('Persistence failed - multiple tabs open');
          } else if (err.code === 'unimplemented') {
            console.log('Persistence not available in this browser');
          }
        });
    } catch (error) {
      console.log('Error enabling persistence:', error);
    }
  }
} catch (initError) {
  console.error('Error initializing Firebase:', initError);
  // Create fallback dummy implementations to prevent app crashes
  if (!app) app = { name: 'FIREBASE_INIT_FAILED' };
  if (!auth) auth = { 
    currentUser: null,
    onAuthStateChanged: (callback) => { callback(null); return () => {}; },
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase auth not available')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase auth not available')),
    signOut: () => Promise.resolve()
  };
  if (!db) db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Firebase Firestore not available')),
        set: () => Promise.reject(new Error('Firebase Firestore not available'))
      }),
      add: () => Promise.reject(new Error('Firebase Firestore not available')),
      where: () => ({
        get: () => Promise.reject(new Error('Firebase Firestore not available'))
      })
    })
  };
}

export { app, auth, db };

// Add a helper function to check if Firebase is properly initialized
export const isFirebaseAvailable = () => {
  return app && app.name !== 'FIREBASE_INIT_FAILED';
};

// Add a helper to handle permission errors gracefully
export const handleFirebaseError = (error) => {
  if (error?.code === 'permission-denied') {
    console.log('Permission denied error:', error.message);
    if (__DEV__) {
      console.log('DEV MODE: Permission errors can be ignored in development');
      return { devModeBypass: true };
    }
  }
  return { error };
}; 