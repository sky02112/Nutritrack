import React from 'react';
import SafeAreaWrapper from './SafeAreaWrapper';

/**
 * Higher-order component to wrap screens with SafeAreaWrapper
 * @param {React.Component} WrappedComponent - The component to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.backgroundColor - Background color for the safe area
 * @param {string} options.statusBarStyle - Status bar style ('dark-content' or 'light-content')
 * @returns {React.Component} - The wrapped component with safe area handling
 */
const withSafeArea = (
  WrappedComponent,
  { 
    backgroundColor = '#FFFFFF',
    statusBarStyle = 'dark-content'
  } = {}
) => {
  // Return a new component with the SafeAreaWrapper
  const WithSafeArea = (props) => {
    return (
      <SafeAreaWrapper
        backgroundColor={backgroundColor}
        statusBarStyle={statusBarStyle}
      >
        <WrappedComponent {...props} />
      </SafeAreaWrapper>
    );
  };

  // Set display name for debugging
  WithSafeArea.displayName = `withSafeArea(${getDisplayName(WrappedComponent)})`;
  
  return WithSafeArea;
};

// Helper function to get component display name
const getDisplayName = (WrappedComponent) => {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
};

export default withSafeArea; 