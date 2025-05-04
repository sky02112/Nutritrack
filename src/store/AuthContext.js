import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Platform } from 'react-native';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Use a simpler auth state listener with better error handling
  useEffect(() => {
    console.log("Setting up auth state listener");
    let unsubscribe = () => {};
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log("Auth state changed", user ? "User signed in" : "No user");
        setCurrentUser(user);
        setIsAuthenticated(!!user);
        
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              setUserDetails(userDoc.data());
            } else {
              console.log("User document does not exist in Firestore");
              setUserDetails(null);
            }
          } catch (error) {
            console.error('Error fetching user details:', error);
            setUserDetails(null);
          }
        } else {
          setUserDetails(null);
        }
        
        setLoading(false);
      }, (error) => {
        console.error("Auth state changed error", error);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      setLoading(false);
    }
    
    // Return cleanup function
    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing from auth state", error);
      }
    };
  }, []);
  
  // Function to check if the user has a specific role
  const hasRole = (role) => {
    return userDetails?.role === role;
  };
  
  // Specific role checking functions
  const isAdmin = () => hasRole('admin');
  const isTeacher = () => hasRole('teacher');
  const isNurse = () => hasRole('nurse');
  const isStudent = () => hasRole('student');
  
  // Sign in with email and password
  const login = async (email, password) => {
    try {
      console.log("Attempting login with email:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful");
      setIsAuthenticated(true);
      return { user: userCredential.user };
    } catch (error) {
      console.error('Login error:', error);
      setIsAuthenticated(false);
      return { error };
    }
  };

  // Sign in with Google
  const loginWithGoogle = async (idToken) => {
    try {
      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Sign in with credential
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      // Check if this is a new user
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || '',
          photoURL: userCredential.user.photoURL || null,
          role: 'student', // Default role
          createdAt: serverTimestamp()
        });
      }
      
      setIsAuthenticated(true);
      return { user: userCredential.user };
    } catch (error) {
      console.error('Google sign-in error:', error);
      setIsAuthenticated(false);
      return { error };
    }
  };
  
  // Create a new account
  const signup = async (email, password, userInfo) => {
    try {
      // Validate access key for admin and teacher roles
      if ((userInfo.role === 'admin' || userInfo.role === 'teacher') && userInfo.accessKey) {
        // Predefined access keys for simplicity
        const ADMIN_KEY = 'NUTRITRACKADMIN';
        const TEACHER_KEY = 'NUTRITRACKTEACHER';
        
        const expectedKey = userInfo.role === 'admin' ? ADMIN_KEY : TEACHER_KEY;
        if (userInfo.accessKey !== expectedKey) {
          return { error: { message: 'Invalid access key' } };
        }
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        displayName: userInfo.displayName || '',
        role: userInfo.role || 'student',
        studentId: userInfo.studentId || null,
        createdAt: serverTimestamp()
      });
      
      setIsAuthenticated(true);
      return { user: userCredential.user };
    } catch (error) {
      console.error('Signup error:', error);
      setIsAuthenticated(false);
      return { error };
    }
  };
  
  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserDetails(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { error };
    }
  };
  
  const value = {
    currentUser,
    userDetails,
    login,
    loginWithGoogle,
    signup,
    logout,
    isAdmin: userDetails?.role === 'admin',
    isTeacher: userDetails?.role === 'teacher', 
    isNurse: userDetails?.role === 'nurse',
    isStudent: userDetails?.role === 'student',
    loading,
    isAuthenticated
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 