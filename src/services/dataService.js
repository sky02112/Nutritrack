import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, setDoc, Timestamp, addDoc } from 'firebase/firestore';

/**
 * Get student data including nutrition and exercise information
 * @param {string} userId - The student's user ID
 * @returns {Promise<Object>} Student data object
 */
export const getStudentData = async (userId) => {
  try {
    console.log('Fetching student data for user:', userId);
    
    // Get the student document from Firestore
    const studentRef = doc(db, 'students', userId);
    const studentSnap = await getDoc(studentRef);
    
    let studentData = {};
    
    if (!studentSnap.exists()) {
      console.log('Student document not found, creating one for:', userId);
      // If the student document doesn't exist, create a default one
      studentData = {
        firstName: 'New',
        lastName: 'Student',
        grade: '5',
        section: 'A',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Save the default student data
      await setDoc(studentRef, studentData);
      console.log('Created default student document for:', userId, 'with data:', studentData);
    } else {
      studentData = studentSnap.data();
      console.log('Found existing student document:', studentData);
    }
    
    // Get the student's nutrition logs
    let nutritionLogs = [];
    try {
      console.log('Fetching nutrition logs for user:', userId);
      const nutritionLogsRef = collection(db, 'nutritionLogs');
      // First try the query with both conditions
      const nutritionQuery = query(
        nutritionLogsRef,
        where('userid', '==', userId),
        orderBy('date', 'desc'),
        orderBy('__name__', 'desc'),
        limit(7)
      );
      
      const nutritionSnap = await getDocs(nutritionQuery);
      nutritionSnap.forEach(doc => {
        nutritionLogs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('Found nutrition logs:', nutritionLogs.length);
    } catch (indexError) {
      console.log('Index error for nutrition logs, using fallback query');
      // Fallback: Just get the documents without ordering
      const nutritionLogsRef = collection(db, 'nutritionLogs');
      const nutritionQuery = query(
        nutritionLogsRef,
        where('userid', '==', userId),
        limit(7)
      );
      
      const nutritionSnap = await getDocs(nutritionQuery);
      nutritionSnap.forEach(doc => {
        nutritionLogs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort the logs manually
      nutritionLogs.sort((a, b) => {
        const dateA = a.date && a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const dateB = b.date && b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      });
      console.log('Found nutrition logs (fallback):', nutritionLogs.length);
    }
    
    // Get the student's exercise logs
    let exerciseLogs = [];
    try {
      console.log('Fetching exercise logs for user:', userId);
      const exerciseLogsRef = collection(db, 'exerciseLogs');
      // First try the query with both conditions
      const exerciseQuery = query(
        exerciseLogsRef,
        where('userid', '==', userId),
        orderBy('date', 'desc'),
        orderBy('__name__', 'desc'),
        limit(7)
      );
      
      const exerciseSnap = await getDocs(exerciseQuery);
      exerciseSnap.forEach(doc => {
        exerciseLogs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('Found exercise logs:', exerciseLogs.length);
    } catch (indexError) {
      console.log('Index error for exercise logs, using fallback query');
      // Fallback: Just get the documents without ordering
      const exerciseLogsRef = collection(db, 'exerciseLogs');
      const exerciseQuery = query(
        exerciseLogsRef,
        where('userid', '==', userId),
        limit(7)
      );
      
      const exerciseSnap = await getDocs(exerciseQuery);
      exerciseSnap.forEach(doc => {
        exerciseLogs.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort the logs manually
      exerciseLogs.sort((a, b) => {
        const dateA = a.date && a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const dateB = b.date && b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      });
      console.log('Found exercise logs (fallback):', exerciseLogs.length);
    }
    
    // Return the combined data with the student object
    const result = {
      student: studentData,
      nutritionLogs,
      exerciseLogs,
      // Add empty records array for compatibility with StudentDashboard component
      records: []
    };
    
    console.log('Returning student data:', {
      student: result.student,
      nutritionLogsCount: result.nutritionLogs.length,
      exerciseLogsCount: result.exerciseLogs.length
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching student data:', error);
    throw error;
  }
};

/**
 * Get nutrition data for a student
 * @param {string} userId - The student's user ID
 * @param {number} days - Number of days of data to retrieve
 * @returns {Promise<Array>} Array of nutrition data points
 */
export const getStudentNutritionData = async (userId, days = 7) => {
  try {
    const nutritionLogsRef = collection(db, 'nutritionLogs');
    const nutritionQuery = query(
      nutritionLogsRef,
      where('userid', '==', userId),
      orderBy('date', 'desc'),
      orderBy('__name__', 'desc'),
      limit(days)
    );
    
    const nutritionSnap = await getDocs(nutritionQuery);
    const nutritionData = [];
    
    nutritionSnap.forEach(doc => {
      const data = doc.data();
      nutritionData.push({
        id: doc.id,
        date: data.date.toDate().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0
      });
    });
    
    return nutritionData.reverse();
  } catch (error) {
    console.error('Error fetching nutrition data:', error);
    // Return sample data for development
    return [
      { date: '01/15', calories: 2100, protein: 120, carbs: 180, fat: 70 },
      { date: '01/16', calories: 1950, protein: 110, carbs: 160, fat: 65 },
      { date: '01/17', calories: 2200, protein: 130, carbs: 190, fat: 75 },
      { date: '01/18', calories: 2050, protein: 125, carbs: 170, fat: 70 },
      { date: '01/19', calories: 1900, protein: 105, carbs: 155, fat: 60 },
      { date: '01/20', calories: 2150, protein: 125, carbs: 185, fat: 72 },
      { date: '01/21', calories: 2000, protein: 115, carbs: 165, fat: 68 }
    ];
  }
};

/**
 * Get exercise data for a student
 * @param {string} userId - The student's user ID
 * @param {number} days - Number of days of data to retrieve
 * @returns {Promise<Array>} Array of exercise data points
 */
export const getStudentExerciseData = async (userId, days = 7) => {
  try {
    const exerciseLogsRef = collection(db, 'exerciseLogs');
    const exerciseQuery = query(
      exerciseLogsRef,
      where('userid', '==', userId),
      orderBy('date', 'desc'),
      orderBy('__name__', 'desc'),
      limit(days)
    );
    
    const exerciseSnap = await getDocs(exerciseQuery);
    const exerciseData = [];
    
    exerciseSnap.forEach(doc => {
      const data = doc.data();
      exerciseData.push({
        id: doc.id,
        date: data.date.toDate().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        minutes: data.minutes || 0,
        caloriesBurned: data.caloriesBurned || 0,
        activityType: data.activityType || 'Not specified'
      });
    });
    
    return exerciseData.reverse();
  } catch (error) {
    console.error('Error fetching exercise data:', error);
    // Return sample data for development
    return [
      { date: '01/15', minutes: 30, caloriesBurned: 180, activityType: 'Running' },
      { date: '01/16', minutes: 45, caloriesBurned: 250, activityType: 'Cycling' },
      { date: '01/17', minutes: 20, caloriesBurned: 120, activityType: 'Walking' },
      { date: '01/18', minutes: 60, caloriesBurned: 350, activityType: 'Swimming' },
      { date: '01/19', minutes: 40, caloriesBurned: 220, activityType: 'HIIT' },
      { date: '01/20', minutes: 35, caloriesBurned: 200, activityType: 'Running' },
      { date: '01/21', minutes: 25, caloriesBurned: 150, activityType: 'Yoga' }
    ];
  }
};

/**
 * Add a nutrition log for a student
 * @param {string} userId - The student's user ID
 * @param {Object} nutritionData - The nutrition data to add
 * @returns {Promise<Object>} Result with id or error
 */
export const addNutritionLog = async (userId, nutritionData) => {
  try {
    const nutritionLogsRef = collection(db, 'nutritionLogs');
    
    // Ensure we have a date
    if (!nutritionData.date) {
      nutritionData.date = Timestamp.now();
    } else if (!(nutritionData.date instanceof Timestamp)) {
      // Convert date string or Date object to Timestamp
      nutritionData.date = Timestamp.fromDate(
        nutritionData.date instanceof Date 
          ? nutritionData.date 
          : new Date(nutritionData.date)
      );
    }
    
    // Add user ID to the data
    const logData = {
      ...nutritionData,
      userid: userId,
      createdAt: Timestamp.now()
    };
    
    // Add nutrition log to Firestore
    const docRef = await addDoc(nutritionLogsRef, logData);
    
    return { 
      id: docRef.id,
      success: true 
    };
  } catch (error) {
    console.error('Error adding nutrition log:', error);
    return { error };
  }
};

/**
 * Add an exercise log for a student
 * @param {string} userId - The student's user ID
 * @param {Object} exerciseData - The exercise data to add
 * @returns {Promise<Object>} Result with id or error
 */
export const addExerciseLog = async (userId, exerciseData) => {
  try {
    const exerciseLogsRef = collection(db, 'exerciseLogs');
    
    // Ensure we have a date
    if (!exerciseData.date) {
      exerciseData.date = Timestamp.now();
    } else if (!(exerciseData.date instanceof Timestamp)) {
      // Convert date string or Date object to Timestamp
      exerciseData.date = Timestamp.fromDate(
        exerciseData.date instanceof Date 
          ? exerciseData.date 
          : new Date(exerciseData.date)
      );
    }
    
    // Add user ID to the data
    const logData = {
      ...exerciseData,
      userid: userId,
      createdAt: Timestamp.now()
    };
    
    // Add exercise log to Firestore
    const docRef = await addDoc(exerciseLogsRef, logData);
    
    return { 
      id: docRef.id,
      success: true 
    };
  } catch (error) {
    console.error('Error adding exercise log:', error);
    return { error };
  }
}; 