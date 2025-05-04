# Google Sign-In Setup Guide for NutriTrack

This guide will walk you through the process of setting up Google Sign-In for your NutriTrack app using Firebase Authentication.

## Prerequisites

- Firebase project (already set up for NutriTrack)
- Android Studio (for generating SHA-1 certificate)

## Firebase Console Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: "nutritrack-a15df"
3. In the left sidebar, navigate to **Authentication**
4. Click on the "Sign-in method" tab
5. Find "Google" in the list of providers and click on it
6. Toggle the "Enable" switch to enable Google Sign-In
7. Configure your OAuth consent screen if prompted (usually just requires entering an app name and email)
8. Add your SHA-1 certificate fingerprint (see below)
9. Click "Save"

## Get SHA-1 Certificate Fingerprint

For Android, you need to provide the SHA-1 fingerprint of your signing certificate:

### Using Android Studio:

1. Open your Android project in Android Studio
2. Select the "Gradle" tab on the right side
3. Navigate to `Tasks > android > signingReport`
4. Double-click signingReport
5. Look for the SHA-1 fingerprint in the debug keystore in the output

### Using Command Line:

```bash
cd android
./gradlew signingReport
```

Look for the SHA-1 fingerprint in the debug keystore output.

## Download google-services.json

After setting up Google Sign-In in Firebase:

1. Go to Project Settings (gear icon in the top left of Firebase Console)
2. Under "Your apps" section, select your Android app
3. Click "Download google-services.json"
4. Place this file in the `android/app/` directory of your NutriTrack project

## Verify Web Client ID

1. In Firebase Console > Project Settings > General tab
2. Scroll down to "Your apps" section and find your Web app
3. Copy the Web Client ID (looks like: `826604945403-63aqe1dh2k73fmtt9tkd2gj8v8jmmjrl.apps.googleusercontent.com`)
4. Open `src/screens/LoginScreen.js` in your project
5. Verify that the webClientId in GoogleSignin.configure() matches your Web Client ID:

```javascript
GoogleSignin.configure({
  webClientId:
    "826604945403-63aqe1dh2k73fmtt9tkd2gj8v8jmmjrl.apps.googleusercontent.com", // replace with your actual web client ID
});
```

## Testing Google Sign-In

1. Run the app using `npm run android` or via Expo
2. On the login screen, tap the "Sign in with Google" button
3. You should see the Google account picker dialog
4. After selecting an account, you should be authenticated and logged in

## Troubleshooting

If you encounter issues:

1. **SHA-1 Fingerprint Issues**: Make sure you've added the correct SHA-1 fingerprint to Firebase.
2. **Web Client ID Issues**: Verify the webClientId in GoogleSignin.configure() matches the one in Firebase.
3. **google-services.json**: Make sure this file is placed in the correct location.
4. **Build Issues**: Make sure you have the latest versions of dependencies.

For more information, see:

- [React Native Google Signin Documentation](https://github.com/react-native-google-signin/google-signin)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
