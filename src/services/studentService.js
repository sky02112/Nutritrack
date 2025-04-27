import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp,
  deleteDoc,
  onSnapshotExternal,
  limit 
} from 'firebase/firestore';
import { db, handleFirebaseError, isFirebaseAvailable } from './firebase';

// Check Firestore connection
export const checkFirestoreConnection = async () => {
  try {
    // Try to get a small document or collection to check connectivity
    const testQuery = query(studentsRef, limit(1));
    await getDocs(testQuery);
    return { connected: true };
  } catch (error) {
    console.error('Firestore connection check failed:', error);
    return { connected: false, error };
  }
};

// Collection references
const studentsRef = collection(db, 'students');
const healthRecordsRef = collection(db, 'healthRecords');

// Add a new student
export const addStudent = async (studentData) => {
  try {
    // Extract health data
    const { height, weight, ...studentInfo } = studentData;
    
    // Add student to database
    const studentRef = await addDoc(studentsRef, {
      ...studentInfo,
      createdAt: Timestamp.now()
    });

    // If height and weight are provided, create initial health record
    if (height && weight) {
      const birthDate = studentInfo.birthDate ? new Date(studentInfo.birthDate) : null;
      const age = birthDate ? calculateAge(birthDate) : null;
      const bmi = calculateBMI(parseFloat(weight), parseFloat(height));
      const bmiStatus = getBMIStatus(bmi);

      // Create initial health record
      const healthRecordRef = await addDoc(healthRecordsRef, {
        studentId: studentRef.id,
        height: parseFloat(height),
        weight: parseFloat(weight),
        bmi: bmi,
        bmiStatus: bmiStatus,
        date: Timestamp.now(),
        createdAt: Timestamp.now()
      });

      // Update student document with initial health data
      await updateDoc(studentRef, {
        lastHealthRecordId: healthRecordRef.id,
        lastHealthRecordDate: Timestamp.now()
      });
    }

    return { id: studentRef.id };
  } catch (error) {
    console.error('Error adding student:', error);
    return { error };
  }
};

// Get all students
export const getAllStudents = async () => {
  try {
    const q = query(studentsRef, orderBy('lastName'));
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return { students };
  } catch (error) {
    return { error };
  }
};

// Get students by grade level
export const getStudentsByGrade = async (grade) => {
  try {
    // Create a query that only filters by grade without sorting
    const q = query(studentsRef, where('grade', '==', grade));
    const querySnapshot = await getDocs(q);
    
    // Get all students and sort them client-side to avoid index issues
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by lastName client-side
    students.sort((a, b) => {
      const lastNameA = (a.lastName || '').toLowerCase();
      const lastNameB = (b.lastName || '').toLowerCase();
      return lastNameA.localeCompare(lastNameB);
    });
    
    return { students };
  } catch (error) {
    console.error('Error in getStudentsByGrade:', error);
    // Check if it's an index error
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      return { 
        error: {
          message: 'Database index issue. Using fallback method.',
          isIndexError: true
        }
      };
    }
    return { error };
  }
};

// Get a single student by ID
export const getStudentById = async (studentId) => {
  try {
    const docRef = doc(db, 'students', studentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { student: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { error: 'No student found with that ID' };
    }
  } catch (error) {
    return { error };
  }
};

// Validate height range for different age groups (in cm)
const isValidHeight = (height, age) => {
  if (!height || !age) return false;
  
  // For children (2-9 years)
  if (age >= 2 && age <= 9) {
    return height >= 80 && height <= 150;
  }
  // For pre-teens (10-12 years)
  if (age >= 10 && age <= 12) {
    return height >= 120 && height <= 170;
  }
  // For teenagers (13-19 years)
  if (age >= 13 && age <= 19) {
    return height >= 140 && height <= 200;
  }
  // For adults (20+ years)
  return height >= 140 && height <= 250;
};

// Validate weight range for different age groups (in kg)
const isValidWeight = (weight, age) => {
  if (!weight || !age) return false;
  
  // For children (2-9 years)
  if (age >= 2 && age <= 9) {
    return weight >= 10 && weight <= 50;
  }
  // For pre-teens (10-12 years)
  if (age >= 10 && age <= 12) {
    return weight >= 25 && weight <= 80;
  }
  // For teenagers (13-19 years)
  if (age >= 13 && age <= 19) {
    return weight >= 35 && weight <= 120;
  }
  // For adults (20+ years)
  return weight >= 35 && weight <= 150;
};

// Calculate BMI based on weight (kg) and height (cm)
export const calculateBMI = (weightKg, heightCm) => {
  // Basic input validation
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  // Convert height to meters
  const heightM = heightCm / 100;
  
  // Calculate BMI using the standard formula: weight(kg) / height(m)²
  const bmi = weightKg / (heightM * heightM);
  
  // Round to one decimal place
  return Number(bmi.toFixed(1));
};

// Get weight status message based on measurements
export const getWeightStatusMessage = (weight, height, age) => {
  if (!isValidHeight(height, age)) {
    if (age >= 2 && age <= 9) {
      return 'Height should be between 80-150 cm for this age';
    } else if (age >= 10 && age <= 12) {
      return 'Height should be between 120-170 cm for this age';
    } else if (age >= 13 && age <= 19) {
      return 'Height should be between 140-200 cm for this age';
    } else {
      return 'Height should be between 140-250 cm';
    }
  }

  if (!isValidWeight(weight, age)) {
    if (age >= 2 && age <= 9) {
      return 'Weight should be between 10-50 kg for this age';
    } else if (age >= 10 && age <= 12) {
      return 'Weight should be between 25-80 kg for this age';
    } else if (age >= 13 && age <= 19) {
      return 'Weight should be between 35-120 kg for this age';
    } else {
      return 'Weight should be between 35-150 kg';
    }
  }

  return null; // Return null if measurements are valid
};

// Get BMI status based on BMI value using WHO standard ranges
export const getBMIStatus = (bmi) => {
  // Handle invalid BMI
  if (!bmi || isNaN(bmi)) return 'Enter valid height/weight';

  // WHO standard BMI classifications
  if (bmi < 16) return 'Severely Underweight';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obese Class I';
  if (bmi < 40) return 'Obese Class II';
  return 'Obese Class III';
};

// Calculate age from birthdate
export const calculateAge = (birthdate) => {
  if (!birthdate || !(birthdate instanceof Date)) {
    return null;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const birthYear = birthdate.getFullYear();
  const birthMonth = birthdate.getMonth();
  const birthDay = birthdate.getDate();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  let age = currentYear - birthYear;

  // Adjust age if birthday hasn't occurred this year
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age--;
  }

  return age;
};

// Add a health record for a student
export const addHealthRecord = async (studentId, healthData) => {
  try {
    // Get student data to calculate age-appropriate BMI status
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    if (!studentDoc.exists()) {
      throw new Error('Student not found');
    }

    const studentData = studentDoc.data();
    const birthdate = studentData.birthdate?.toDate() || new Date();
    const age = calculateAge(birthdate);
    const bmi = calculateBMI(healthData.weight, healthData.height);
    const bmiStatus = getBMIStatus(bmi);

    const docRef = await addDoc(healthRecordsRef, {
      studentId,
      ...healthData,
      bmi,
      bmiStatus,
      date: Timestamp.now()
    });
    return { id: docRef.id };
  } catch (error) {
    return { error };
  }
};

// Get health records for a student
export const getHealthRecords = async (studentId) => {
  try {
    // Change the query to use a simpler approach that might not require an index
    // First, only filter by studentId without ordering
    const q = query(healthRecordsRef, where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    const records = [];
    
    // Then manually sort the results after they've been retrieved
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort records by date in descending order (manually)
    records.sort((a, b) => {
      // Handle Firestore Timestamp or string date
      const dateA = a.date && a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
      const dateB = b.date && b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
      return dateB - dateA; // Descending order
    });
    
    return { records };
  } catch (error) {
    console.error('Error fetching health records:', error);
    // If the error is about needing an index, show a more helpful error message
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      return { 
        error: { 
          message: 'Database configuration issue. Please contact the administrator.' 
        },
        records: [] 
      };
    }
    return { error, records: [] };
  }
};

// Get aggregate health data for reporting
export const getAggregateHealthData = async (grade) => {
  try {
    console.log('Fetching aggregate health data for grade:', grade);
    
    // Helper function to process a batch of students
    const processStudentBatch = async (studentDocs) => {
      const records = [];
      const batchSize = 10; // Process 10 students at a time
      
      for (let i = 0; i < studentDocs.length; i += batchSize) {
        const batch = studentDocs.slice(i, i + batchSize);
        const batchPromises = batch.map(studentDoc => {
          const studentId = studentDoc.id;
          return getHealthRecords(studentId).then(result => {
            if (result.records && !result.error) {
              records.push(...result.records);
            }
            return null;
          }).catch(err => {
            console.error(`Error fetching health records for student ${studentId}:`, err);
            return null;
          });
        });
        
        // Wait for this batch to complete before moving to the next
        await Promise.all(batchPromises);
      }
      
      return records;
    };
    
    if (grade) {
      // Get students from specific grade
      console.log('Querying students in grade:', grade);
      const gradeStudentsQuery = query(studentsRef, where('grade', '==', grade));
      const gradeStudentsSnapshot = await getDocs(gradeStudentsQuery);
      
      console.log('Found students count:', gradeStudentsSnapshot.size);
      
      if (gradeStudentsSnapshot.size === 0) {
        console.log('No students found in grade:', grade);
        return { records: [] };
      }
      
      const records = await processStudentBatch(gradeStudentsSnapshot.docs);
      console.log('Combined records count:', records.length);
      return { records };
    } else {
      // For the "all grades" case
      const allStudentsSnapshot = await getDocs(studentsRef);
      console.log('Found all students count:', allStudentsSnapshot.size);
      
      if (allStudentsSnapshot.size === 0) {
        return { records: [] };
      }
      
      const records = await processStudentBatch(allStudentsSnapshot.docs);
      console.log('Combined records count for all grades:', records.length);
      return { records };
    }
  } catch (error) {
    console.error('Error in getAggregateHealthData:', error);
    return { error };
  }
};

// Delete a student by ID
export const deleteStudent = async (studentId) => {
  try {
    // First, get all health records for this student
    const q = query(healthRecordsRef, where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    
    // Delete all health records for the student
    const deletePromises = [];
    querySnapshot.forEach((healthRecord) => {
      deletePromises.push(deleteDoc(doc(db, 'healthRecords', healthRecord.id)));
    });
    
    // Wait for all health records to be deleted
    await Promise.all(deletePromises);
    
    // Delete the student record
    await deleteDoc(doc(db, 'students', studentId));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting student:', error);
    return { error };
  }
};

// Delete a health record by ID
export const deleteHealthRecord = async (recordId) => {
  try {
    await deleteDoc(doc(db, 'healthRecords', recordId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting health record:', error);
    return { error };
  }
};

// Add this function as a temporary workaround for permission issues
export const getAggregateHealthDataSimple = async (grade) => {
  try {
    console.log('Starting getAggregateHealthDataSimple for grade:', grade);
    
    // First get all students in the grade
    const studentsQuery = query(
      collection(db, 'students'),
      where('grade', '==', grade)
    );
    const studentsSnapshot = await getDocs(studentsQuery);
    
    console.log('Total students found:', studentsSnapshot.size);
    
    if (studentsSnapshot.empty) {
      console.log('No students found for grade:', grade);
      return { records: [] };
    }

    // Create a map of student data by ID
    const studentMap = {};
    studentsSnapshot.docs.forEach(doc => {
      studentMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    const studentIds = Object.keys(studentMap);
    console.log('Student IDs:', studentIds);

    // Get all health records for these students
    const healthRecords = [];
    const batchSize = 10;
    
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);
      console.log('Processing batch:', batch);
      
      try {
        const recordsQuery = query(
          collection(db, 'healthRecords'),
          where('studentId', 'in', batch)
        );
        const recordsSnapshot = await getDocs(recordsQuery);
        
        console.log('Records found in batch:', recordsSnapshot.size);
        // Include student data with each health record
        healthRecords.push(...recordsSnapshot.docs.map(doc => {
          const recordData = doc.data();
          const studentData = studentMap[recordData.studentId] || {};
          return {
            id: doc.id,
            ...recordData,
            section: studentData.section, // Include student's section
            studentName: `${studentData.firstName} ${studentData.lastName}`,
            gender: studentData.gender
          };
        }));
      } catch (error) {
        console.error('Error fetching batch:', error);
        // If batch fetch fails, try individual fetches
        for (const studentId of batch) {
          try {
            const recordQuery = query(
              collection(db, 'healthRecords'),
              where('studentId', '==', studentId)
            );
            const recordSnapshot = await getDocs(recordQuery);
            
            console.log(`Records found for student ${studentId}:`, recordSnapshot.size);
            // Include student data with each health record
            healthRecords.push(...recordSnapshot.docs.map(doc => {
              const recordData = doc.data();
              const studentData = studentMap[studentId] || {};
              return {
                id: doc.id,
                ...recordData,
                section: studentData.section, // Include student's section
                studentName: `${studentData.firstName} ${studentData.lastName}`,
                gender: studentData.gender
              };
            }));
          } catch (individualError) {
            console.error(`Error fetching records for student ${studentId}:`, individualError);
          }
        }
      }
    }

    console.log('Total health records found:', healthRecords.length);
    return { records: healthRecords };
  } catch (error) {
    console.error('Error in getAggregateHealthDataSimple:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return { error };
  }
};

// Fetch student data by student ID (for registration)
export const getStudentByStudentId = async (studentIdNumber) => {
  try {
    if (!studentIdNumber) return { student: null };
    
    // Check if Firebase is available
    if (!isFirebaseAvailable()) {
      console.log('Firebase not available, bypassing student verification in dev mode');
      // In development mode, pretend the student exists
      if (__DEV__ && studentIdNumber.length >= 4) {
        return { 
          student: { 
            id: 'mock-id-' + studentIdNumber,
            firstName: 'Test',
            lastName: 'Student',
            grade: '3',
            section: 'A',
            studentId: studentIdNumber 
          },
          devMode: true
        };
      }
      return { student: null, error: new Error('Firebase not available') };
    }
    
    // Try to query the students collection
    try {
      const q = query(studentsRef, where('studentId', '==', studentIdNumber));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // In development mode, pretend the student exists if ID is long enough
        if (__DEV__ && studentIdNumber.length >= 5) {
          console.log('DEV MODE: Creating mock student record for ID:', studentIdNumber);
          return { 
            student: { 
              id: 'mock-id-' + studentIdNumber,
              firstName: 'Test',
              lastName: 'Student',
              grade: '3',
              section: 'A',
              studentId: studentIdNumber 
            },
            devMode: true
          };
        }
        return { student: null };
      }
      
      // There should only be one student with this ID
      const doc = querySnapshot.docs[0];
      return { 
        student: { 
          id: doc.id, 
          ...doc.data() 
        } 
      };
    } catch (permissionError) {
      // Use our improved error handler
      const result = handleFirebaseError(permissionError);
      
      // If we're in dev mode and can bypass, create a mock student
      if (result.devModeBypass && studentIdNumber.length >= 5) {
        console.log('DEV MODE: Creating mock student record for ID:', studentIdNumber);
        return { 
          student: { 
            id: 'mock-id-' + studentIdNumber,
            firstName: 'Test',
            lastName: 'Student',
            grade: '3',
            section: 'A',
            studentId: studentIdNumber 
          },
          devMode: true
        };
      }
      
      return { student: null, error: permissionError };
    }
  } catch (error) {
    console.error('Error fetching student by ID:', error);
    return { error, student: null };
  }
};

// Get student's own health data for their dashboard
export const getStudentDashboardData = async (studentId) => {
  try {
    // Get student document
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    
    if (!studentDoc.exists()) {
      return { error: { message: 'Student not found' } };
    }
    
    const studentData = { id: studentDoc.id, ...studentDoc.data() };
    
    // Get their health records
    const { records, error } = await getHealthRecords(studentId);
    
    if (error) {
      return { error };
    }
    
    // Calculate statistical data
    const sortedRecords = records.sort((a, b) => {
      // Handle Firestore Timestamp or string date
      const dateA = a.date && a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
      const dateB = b.date && b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
      return dateB - dateA; // Most recent first
    });
    
    const latestRecord = sortedRecords.length > 0 ? sortedRecords[0] : null;
    
    // Calculate BMI trend if we have enough records
    let bmiTrend = null;
    if (sortedRecords.length >= 2) {
      const firstBmi = sortedRecords[sortedRecords.length - 1].bmi;
      const latestBmi = sortedRecords[0].bmi;
      bmiTrend = {
        change: latestBmi - firstBmi,
        direction: latestBmi > firstBmi ? 'up' : (latestBmi < firstBmi ? 'down' : 'stable')
      };
    }
    
    return {
      student: studentData,
      records: sortedRecords,
      latestRecord,
      bmiTrend
    };
  } catch (error) {
    console.error('Error getting student dashboard data:', error);
    return { error };
  }
}; 