import React from 'react';
import { StyleSheet, View, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * SafeAreaWrapper - Component to handle safe area insets and status bar
 * This ensures content doesn't overlap with the status bar or device notches
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {Object} props.style - Additional style for the container
 * @param {string} props.backgroundColor - Background color for the component
 * @param {string} props.statusBarStyle - Status bar style ('dark-content', 'light-content', 'auto')
 * @returns {React.ReactNode}
 */
const SafeAreaWrapper = ({
  children,
  style,
  backgroundColor = '#FFFFFF',
  statusBarStyle = 'dark-content',
}) => {
  // Get safe area insets
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      style={[
        styles.container,
        {
          backgroundColor,
          // Apply insets as padding
          paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={backgroundColor}
        translucent={true}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeAreaWrapper; 