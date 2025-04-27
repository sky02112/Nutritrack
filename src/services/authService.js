import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseAvailable } from './firebase';
import { getStudentByStudentId } from './studentService';

// Predefined access keys
const ACCESS_KEYS = {
  admin: 'NUTRITRACKADMIN',
  teacher: 'NUTRITRACKTEACHER'
};

// Validate access key
export const validateAccessKey = async (accessKey, role) => {
  // Check if the access key matches the predefined key for the role
  return accessKey === ACCESS_KEYS[role];
};

// User registration
export const registerUser = async (email, password, displayName, role, accessKey = null, studentId = null) => {
  try {
    // Check for Firebase initialization
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not initialized - running in dev mode');
      return { user: { email, displayName, role, studentId }, error: null };
    }
    
    // Validate admin/teacher access keys
    if (role === 'admin' || role === 'teacher') {
      // This would be replaced with a real validation against your database
      const isValidKey = await validateAccessKey(role, accessKey);
      if (!isValidKey) {
        return { user: null, error: { message: 'Invalid access key' } };
      }
    }
    
    // For student role, use studentId if displayName is empty
    const finalDisplayName = role === 'student' && (!displayName || !displayName.trim())
      ? `Student ${studentId}` 
      : displayName;
    
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set display name
    await updateProfile(userCredential.user, {
      displayName: finalDisplayName
    });
    
    // Add user data to Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      displayName: finalDisplayName,
      role,
      studentId: role === 'student' ? studentId : null,
      createdAt: serverTimestamp()
    });
    
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error('Registration error:', error);
    return { user: null, error };
  }
};

// User login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if user document exists
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Create user document if it doesn't exist
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        role: 'student', // Default role
        createdAt: serverTimestamp()
      });
    }
    
    return { user };
  } catch (error) {
    return { error };
  }
};

// Password reset
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { error };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Change password
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    
    // Re-authenticate user before changing password
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error) {
    return { error };
  }
}; 