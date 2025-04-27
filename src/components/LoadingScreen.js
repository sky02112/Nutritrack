import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Loading screen component to display during async operations
 * @param {Object} props - Component props
 * @param {string} props.message - Optional custom message to display
 * @param {string} props.color - Optional color for the activity indicator
 * @returns {React.ReactElement} Loading screen component
 */
const LoadingScreen = ({ message = 'Loading...', color = '#1565C0' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
  },
});

export default LoadingScreen; 