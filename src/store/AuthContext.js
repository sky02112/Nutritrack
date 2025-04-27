import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthenticated(!!user);
      
      if (user) {
        // Fetch additional user details from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserDetails(userDoc.data());
          } else {
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
    });
    
    return unsubscribe;
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setIsAuthenticated(true);
      return { user: userCredential.user };
    } catch (error) {
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
      setIsAuthenticated(false);
      return { error };
    }
  };
  
  // Sign out
  const logout = async () => {
    try {
      // First sign out from Firebase
      await signOut(auth);
      
      // Then clear all state
      setCurrentUser(null);
      setUserDetails(null);
      setIsAuthenticated(false);
      
      // Add a small delay to ensure state is cleared before returning
      await new Promise(resolve => setTimeout(resolve, 100));
      
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