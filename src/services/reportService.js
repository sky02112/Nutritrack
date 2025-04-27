import { getHealthRecords, getStudentById, getStudentsByGrade, calculateBMI } from './studentService';

// Generate individual student report
export const generateStudentReport = async (studentId) => {
  try {
    // Get student data
    const { student, error: studentError } = await getStudentById(studentId);
    if (studentError) return { error: studentError };
    
    // Get health records
    const { records, error: recordsError } = await getHealthRecords(studentId);
    if (recordsError) return { error: recordsError };
    
    // Process health records to track progress
    const processedRecords = records.map(record => {
      const bmi = calculateBMI(record.weight, record.height);
      return {
        ...record,
        bmi: parseFloat(bmi.toFixed(2)),
        date: record.date.toDate()
      };
    });
    
    // Sort by date (oldest to newest)
    const sortedRecords = processedRecords.sort((a, b) => a.date - b.date);
    
    // Calculate trends
    const trends = calculateTrends(sortedRecords);
    
    return {
      report: {
        student,
        records: sortedRecords,
        trends,
        generatedAt: new Date()
      }
    };
  } catch (error) {
    return { error };
  }
};

// Generate class report
export const generateClassReport = async (grade) => {
  try {
    // Get all students in the grade
    const { students, error: studentsError } = await getStudentsByGrade(grade);
    if (studentsError) return { error: studentsError };
    
    // Check if students array is empty
    if (!students || students.length === 0) {
      return { error: { message: `No students found in grade ${grade}. Please add students before generating a report.` } };
    }
    
    // Process data for each student
    const studentReports = await Promise.all(
      students.map(async (student) => {
        const { report, error } = await generateStudentReport(student.id);
        if (error) return null;
        return report;
      })
    );
    
    // Filter out any nulls from errors
    const validReports = studentReports.filter(report => report !== null);
    
    // Check if we have any valid reports
    if (validReports.length === 0) {
      return { error: { message: `Unable to generate report. No valid health records found for students in grade ${grade}.` } };
    }
    
    // Calculate class averages
    const classAverages = calculateClassAverages(validReports);
    
    return {
      report: {
        grade,
        studentCount: validReports.length,
        students: validReports,
        classAverages,
        generatedAt: new Date()
      }
    };
  } catch (error) {
    console.error('Error generating class report:', error);
    return { error: { message: 'Failed to generate class report due to a system error.' } };
  }
};

// Helper function to calculate trends from health records
const calculateTrends = (records) => {
  if (records.length < 2) {
    return {
      heightChange: 0,
      weightChange: 0,
      bmiChange: 0
    };
  }
  
  const first = records[0];
  const last = records[records.length - 1];
  
  return {
    heightChange: parseFloat((last.height - first.height).toFixed(2)),
    weightChange: parseFloat((last.weight - first.weight).toFixed(2)),
    bmiChange: parseFloat((last.bmi - first.bmi).toFixed(2))
  };
};

// Helper function to calculate class averages
const calculateClassAverages = (reports) => {
  if (reports.length === 0) return {};
  
  let totalHeight = 0;
  let totalWeight = 0;
  let totalBmi = 0;
  let count = 0;
  
  // Sum up the latest measurements for each student
  reports.forEach(report => {
    if (report.records && report.records.length > 0) {
      const latestRecord = report.records[report.records.length - 1];
      totalHeight += latestRecord.height;
      totalWeight += latestRecord.weight;
      totalBmi += latestRecord.bmi;
      count++;
    }
  });
  
  // Calculate averages
  return {
    averageHeight: parseFloat((totalHeight / count).toFixed(2)),
    averageWeight: parseFloat((totalWeight / count).toFixed(2)),
    averageBmi: parseFloat((totalBmi / count).toFixed(2))
  };
}; 