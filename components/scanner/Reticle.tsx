import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default reticle position (centered)
const DEFAULT_SIZE = 260;
const DEFAULT_TOP = (SCREEN_HEIGHT - DEFAULT_SIZE) / 2;
const DEFAULT_LEFT = (SCREEN_WIDTH - DEFAULT_SIZE) / 2;

interface Bounds {
  origin: { x: number; y: number };
  size: { width: number; height: number };
}

interface ReticleProps {
  targetBounds: Bounds | null;
  isLocking: boolean;
}

export function Reticle({ targetBounds, isLocking }: ReticleProps) {
  // Animated values
  const animatedTop = useRef(new Animated.Value(DEFAULT_TOP)).current;
  const animatedLeft = useRef(new Animated.Value(DEFAULT_LEFT)).current;
  const animatedSize = useRef(new Animated.Value(DEFAULT_SIZE)).current;
  const animatedColor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLocking && targetBounds) {
      // Calculate center position from bounds
      const { origin, size } = targetBounds;
      const targetTop = origin.y;
      const targetLeft = origin.x;
      const targetWidth = size.width;
      const targetHeight = size.height;
      // Use the larger dimension for a square reticle, or use both for rectangle
      const targetSize = Math.max(targetWidth, targetHeight) + 16; // Add small padding

      // Run all animations in parallel
      Animated.parallel([
        Animated.spring(animatedTop, {
          toValue: targetTop,
          useNativeDriver: false,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(animatedLeft, {
          toValue: targetLeft,
          useNativeDriver: false,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(animatedSize, {
          toValue: targetSize,
          useNativeDriver: false,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(animatedColor, {
          toValue: 1, // 0 = white, 1 = green
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Reset to default position
      Animated.parallel([
        Animated.spring(animatedTop, {
          toValue: DEFAULT_TOP,
          useNativeDriver: false,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(animatedLeft, {
          toValue: DEFAULT_LEFT,
          useNativeDriver: false,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(animatedSize, {
          toValue: DEFAULT_SIZE,
          useNativeDriver: false,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(animatedColor, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isLocking, targetBounds]);

  // Interpolate color from white to green
  const borderColor = animatedColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#30D158'],
  });

  const cornerStyle = {
    borderColor,
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          top: animatedTop,
          left: animatedLeft,
          width: animatedSize,
          height: animatedSize,
        },
      ]}
      pointerEvents="none"
    >
      {/* Corner brackets */}
      <Animated.View style={[styles.corner, styles.topLeft, cornerStyle]} />
      <Animated.View style={[styles.corner, styles.topRight, cornerStyle]} />
      <Animated.View style={[styles.corner, styles.bottomLeft, cornerStyle]} />
      <Animated.View style={[styles.corner, styles.bottomRight, cornerStyle]} />
    </Animated.View>
  );
}

const CORNER_LENGTH = 32;
const STROKE_WIDTH = 4;
const RADIUS = 8;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 10,
    elevation: 10,
  },
  corner: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    backgroundColor: 'transparent',
    borderWidth: STROKE_WIDTH,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: RADIUS,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: RADIUS,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: RADIUS,
  },
});
