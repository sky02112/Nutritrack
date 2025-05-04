# NutriTrack

Mobile application for monitoring the wellness and development of grade 3 students in St. Michael Academy of Valenzuela.

## Overview

NutriTrack is a comprehensive mobile application designed to track, analyze, and report on student health metrics. The app enables school administrators, teachers, and health professionals to monitor growth trends, generate reports, and make data-driven decisions to improve student wellness.

## Core Features

- **User Authentication**: Secure login with role-based access control
- **Data Analytics Dashboard**: Visual representation of student development through interactive charts
- **Automated Reporting**: Generate wellness reports for individual students and classes
- **Student Health Tracking**: Input and monitor students' weight, height, and calculate BMI

## Technology Stack

- React Native & Expo
- Firebase (Authentication, Firestore)
- React Navigation
- React Native Chart Kit
- Formik & Yup for form validation

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure Firebase:

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication and Firestore
   - Update the Firebase configuration in `src/services/firebase.js`

4. Run the app:
   ```
   npm start
   ```
5. Use Expo Go app on your mobile device to scan the QR code

Supported Versions

| Software     | Supported Versions        |
| ------------ | ------------------------- |
| Expo go      | 52.0.x :white_check_mark: |
| Firebase     | 11.6.x :white_check_mark: |
| React Native | 0.76.9 :white_check_mark: |

## Project Structure

```
Nutritrack/
├── src/
│   ├── assets/         # Images, fonts, etc.
│   ├── components/     # Reusable UI components
│   ├── navigation/     # Navigation configuration
│   ├── screens/        # App screens
│   ├── services/       # API calls, authentication, etc.
│   ├── store/          # State management
│   ├── utils/          # Helper functions
│   └── App.js          # Main app component
```
