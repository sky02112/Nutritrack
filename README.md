

<div align="center">

# NutriTrack 📊 🥗 📱
  
![NutriTrack Logo](https://img.shields.io/badge/NutriTrack-Student%20Health%20Monitoring-blue?style=for-the-badge)

**A comprehensive mobile application for monitoring the health and development of grade school students**

[![React Native](https://img.shields.io/badge/React%20Native-0.76.9-61dafb?style=flat-square&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-52.0.x-000000?style=flat-square&logo=expo)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-11.6.x-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)

</div>

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Recent Updates](#-recent-updates)
- [Development Practices](#-development-practices)

## 🔍 Overview

NutriTrack is a mobile application designed for St. Michael Academy of Valenzuela to monitor the wellness and development of grade school students. The app enables teachers, administrators, and health professionals to track student health metrics, visualize growth trends, and generate comprehensive reports to improve student wellness.

## ✨ Features

### User Management

- 🔐 **Secure Authentication** - Role-based access for teachers, administrators, and health staff
- 👥 **Student Profiles** - Detailed student information with health history

### Health Monitoring

- 📏 **Growth Tracking** - Record and monitor height, weight, and BMI
- 📊 **BMI Calculation** - Automatic calculation with status indicators (normal, underweight, overweight)
- 📋 **Health Records** - Maintain complete history of student health measurements
- 🥗 **Health Recommendations** - Personalized health advice based on BMI status

### Analytics and Reporting

- 📈 **Visual Dashboard** - Interactive charts showing student health trends
- 📑 **Automated Reports** - Generate individual student and class reports
- 🔍 **Data Filtering** - Filter students by health status, class, or section

### User Experience

- 📱 **Modern Interface** - Clean, intuitive UI for easy navigation
- 🔄 **Offline Support** - Work without internet connection with data syncing
- 🌙 **Cross-Platform** - Works on both Android and iOS devices

## 📸 Screenshots

<div align="center">
<!-- Placeholder for screenshots -->
<p>Screenshots coming soon</p>
</div>

## 🔧 Technology Stack

### Frontend

- **React Native** - Cross-platform mobile framework
- **Expo** - Development toolchain for React Native
- **React Navigation** - Routing and navigation
- **Formik & Yup** - Form handling and validation
- **React Native Chart Kit** - Data visualization

### Backend & Services

- **Firebase Authentication** - User management and authentication
- **Cloud Firestore** - NoSQL database for data storage
- **Firebase Storage** - File storage for reports and images
- **Firebase Cloud Functions** - Serverless computing for backend logic

## 📂 Project Structure

```
Nutritrack/
├── src/
│   ├── assets/         # Images, fonts, and other static assets
│   ├── components/     # Reusable UI components
│   │   ├── common/     # Shared components (buttons, inputs, etc.)
│   │   └── specialized/ # Feature-specific components
│   ├── navigation/     # Navigation configuration and screens
│   ├── screens/        # Main application screens
│   │   ├── dashboard/  # Dashboard screen components
│   │   ├── login/      # Authentication screens
│   │   ├── students/   # Student management screens
│   │   └── reports/    # Reporting screens
│   ├── services/       # API calls, Firebase integration
│   ├── store/          # State management (contexts, providers)
│   ├── theme/          # UI theme, colors, and styling
│   └── utils/          # Helper functions and utilities
├── App.js              # Main application entry point
├── app.json            # Expo configuration
└── firebase.json       # Firebase configuration
```

## 📥 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/nutritrack.git
   cd nutritrack
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Prepare environment files**
   ```bash
   # Example: Create a .env file with your configurations
   cp .env.example .env
   ```

## ⚙️ Configuration

### Firebase Setup

1. Create a project in [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and Firestore
3. Add web app to your Firebase project
4. Copy the Firebase config to `src/services/firebase.js`

### Google Sign-In Setup

1. Follow the detailed instructions in [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md)
2. Configure Web Client ID in the authentication settings

## 🚀 Usage

### Development Mode

```bash
# Start the Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Using Expo Go

1. Install Expo Go app on your mobile device
2. Ensure your device is on the same network as your development machine
3. Scan the QR code displayed after running `npm start`

## 🔄 Recent Updates

### May 2025

- Added modern health records display with better visualization
- Implemented personalized health recommendations based on BMI status
- Updated UI with improved card layouts and visual hierarchy
- Added status badges with color-coding for easier identification

### April 2025

- Improved offline support with data synchronization
- Enhanced student filtering capabilities
- Fixed performance issues when loading large datasets
- Optimized for tablet display

### March 2025

- Released initial version with core functionality
- Basic student health tracking and reporting

## 👨‍💻 Development Practices

- **Code Quality** - Consistent styling with ESLint and Prettier
- **Version Control** - Git with feature branch workflow
- **Security** - GPG signed commits for verification
- **Documentation** - Comprehensive inline documentation and API references

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

<div align="center">
  <p>Developed for St. Michael Academy of Valenzuela</p>
  <p>© 2025 NutriTrack Team</p>
</div>
