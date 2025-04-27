import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Logo = ({ size = 120, showText = true }) => {
  const containerSize = { width: size, height: size };
  
  return (
    <View style={[styles.container, containerSize]}>
      <View style={styles.logoInner}>
        <View style={styles.leaf1} />
        <View style={styles.leaf2} />
        <View style={styles.apple} />
      </View>
      {showText && <Text style={styles.text}>NutriTrack</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: '80%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  apple: {
    width: '70%',
    height: '70%',
    borderRadius: 100,
    backgroundColor: '#1565C0',
  },
  leaf1: {
    position: 'absolute',
    top: '10%',
    right: '30%',
    width: '30%',
    height: '20%',
    borderRadius: 20,
    backgroundColor: '#1565C0',
    transform: [{ rotate: '-45deg' }],
  },
  leaf2: {
    position: 'absolute',
    top: '5%',
    right: '25%',
    width: '15%',
    height: '30%',
    borderRadius: 20,
    backgroundColor: '#1565C0',
    transform: [{ rotate: '45deg' }],
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
  }
});

export default Logo; 