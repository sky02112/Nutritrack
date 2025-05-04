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

## Expo Go Configuration

This project is configured to run in Expo Go without requiring native builds. This provides several advantages:

- No need for Android Studio or Xcode
- Faster development cycle
- Easier testing on physical devices
- Pure JavaScript implementation (no Kotlin or Java code)

### Running in Expo Go

1. Install Expo Go from your device's app store
2. Ensure your device is on the same network as your development machine
3. Run `npm start` to start the development server
4. Scan the QR code with your device

## Changelog

### 2023-11-25

- **Project Configuration**:

  - Made project 100% JavaScript by removing all Kotlin files
  - Optimized project to work with Expo Go
  - Updated package.json scripts to use Expo start commands
  - Disabled new architecture to prevent native build requirements
  - Added Hermes JavaScript engine for better performance
  - Created metro.config.js for proper bundling
  - Updated app.json for Expo Go compatibility

- **Development Workflow**:
  - Removed dependency on Android emulator
  - Simplified development process using Expo Go on physical devices
  - Fixed build issues related to Kotlin and Gradle

## Supported Versions

| Software     | Supported Versions        |
| ------------ | ------------------------- |
| Expo Go      | 52.0.x :white_check_mark: |
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

## Development Practices

All commits to this repository are signed with GPG for enhanced security and verification. The GPG signing ensures that commits are authenticated and unmodified, providing an additional layer of trust.
