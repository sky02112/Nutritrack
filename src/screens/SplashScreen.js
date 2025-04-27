import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SafeAreaWrapper from '../components/SafeAreaWrapper';

const SplashScreen = ({ onFinish }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const leftBarAnim = useRef(new Animated.Value(0)).current;
  const rightBarAnim = useRef(new Animated.Value(0)).current;
  const middleBarAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const accentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('SplashScreen mounted - professional logo design');
    
    // Sequence the animations
    Animated.sequence([
      // First fade in the base
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      
      // Then grow the logo with spring effect
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      
      // Animate the logo parts in sequence
      Animated.stagger(100, [
        Animated.timing(leftBarAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(middleBarAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(rightBarAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(accentAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(2)),
        }),
      ]),
      
      // Fade in the text
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic),
      }),
      
      // Final pause
      Animated.delay(400),
    ]).start(() => {
      console.log('Animation sequence complete, triggering finish');
      if (onFinish) {
        onFinish();
      }
    });
    
    return () => {
      console.log('SplashScreen unmounted');
    };
  }, []);
  
  return (
    <SafeAreaWrapper
      backgroundColor="#1565C0"
      statusBarStyle="light-content"
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Logo container */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {/* Modern N logo */}
            <View style={styles.logoBase}>
              {/* Left bar */}
              <Animated.View 
                style={[
                  styles.bar,
                  styles.leftBar,
                  { 
                    opacity: leftBarAnim,
                    transform: [
                      { translateY: leftBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}
                    ]
                  }
                ]}
              />
              
              {/* Middle connecting bar */}
              <Animated.View 
                style={[
                  styles.bar,
                  styles.middleBar,
                  { 
                    opacity: middleBarAnim,
                    transform: [
                      { scaleX: middleBarAnim }
                    ]
                  }
                ]}
              />
              
              {/* Right bar */}
              <Animated.View 
                style={[
                  styles.bar,
                  styles.rightBar,
                  { 
                    opacity: rightBarAnim,
                    transform: [
                      { translateY: rightBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0]
                      })}
                    ]
                  }
                ]}
              />
              
              {/* Accent dot */}
              <Animated.View 
                style={[
                  styles.accent,
                  { 
                    opacity: accentAnim,
                    transform: [{ scale: accentAnim }]
                  }
                ]}
              />
            </View>
          </Animated.View>
          
          {/* App name and tagline */}
          <Animated.View style={{ opacity: textFadeAnim }}>
            <Text style={styles.appName}>NutriTrack</Text>
            <Text style={styles.tagline}>Smart Wellness Platform</Text>
          </Animated.View>
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBase: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  leftBar: {
    width: 14,
    height: 80,
    left: 30,
    borderRadius: 7,
  },
  rightBar: {
    width: 14,
    height: 80,
    right: 30,
    borderRadius: 7,
  },
  middleBar: {
    width: 60,
    height: 14,
    borderRadius: 7,
    transform: [{ rotate: '30deg' }],
  },
  accent: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    top: 25,
    right: 36,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8,
  }
});

export default SplashScreen;