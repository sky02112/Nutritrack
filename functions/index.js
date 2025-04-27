/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.adminResetPassword = functions.https.onCall(async (data, context) => {
  // Check if the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to reset passwords'
    );
  }

  // Verify the caller is an admin
  try {
    const callerRef = admin.firestore().collection('users').doc(context.auth.uid);
    const caller = await callerRef.get();
    
    if (!caller.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User not found'
      );
    }

    const callerData = caller.data();
    if (callerData.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can reset passwords'
      );
    }

    // Validate input data
    if (!data.userId || !data.newPassword || (!data.email && !data.userEmail)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: userId, newPassword, and email are required'
      );
    }

    if (data.newPassword.length < 6) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Password must be at least 6 characters long'
      );
    }

    // Get the email from either parameter name (for backward compatibility)
    const userEmail = data.email || data.userEmail;

    // Verify the user exists and matches the provided email
    const userRecord = await admin.auth().getUser(data.userId);
    if (userRecord.email !== userEmail) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'User ID and email do not match'
      );
    }

    // Reset the password
    await admin.auth().updateUser(data.userId, {
      password: data.newPassword
    });

    // Log the password reset for audit
    await admin.firestore().collection('password_reset_logs').add({
      adminId: context.auth.uid,
      userId: data.userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error in adminResetPassword:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to reset password: ' + error.message
    );
  }
});
