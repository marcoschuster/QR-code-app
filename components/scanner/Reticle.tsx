import React from 'react';
import { View, StyleSheet } from 'react-native';

const SIZE = 260;
const CORNER = 32;
const STROKE = 4;
const RADIUS = 8;

interface ReticleProps {
  locked?: boolean;
}

export function Reticle({ locked = false }: ReticleProps) {
  const color = locked ? '#30D158' : '#FFFFFF';

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Main container - guaranteed centered */}
      <View style={styles.container}>
        
        {/* Bright full border glow for visibility */}
        <View style={[styles.glow, { borderColor: color }]} />

        {/* Top-left corner - thicker and more visible */}
        <View style={[
          styles.corner,
          styles.topLeft,
          {
            borderColor: color,
            borderTopWidth: STROKE,
            borderLeftWidth: STROKE,
            borderTopLeftRadius: RADIUS,
          }
        ]} />

        {/* Top-right corner */}
        <View style={[
          styles.corner,
          styles.topRight,
          {
            borderColor: color,
            borderTopWidth: STROKE,
            borderRightWidth: STROKE,
            borderTopRightRadius: RADIUS,
          }
        ]} />

        {/* Bottom-left corner */}
        <View style={[
          styles.corner,
          styles.bottomLeft,
          {
            borderColor: color,
            borderBottomWidth: STROKE,
            borderLeftWidth: STROKE,
            borderBottomLeftRadius: RADIUS,
          }
        ]} />

        {/* Bottom-right corner */}
        <View style={[
          styles.corner,
          styles.bottomRight,
          {
            borderColor: color,
            borderBottomWidth: STROKE,
            borderRightWidth: STROKE,
            borderBottomRightRadius: RADIUS,
          }
        ]} />

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // Ensure it's on top of camera
    elevation: 10, // Android elevation
  },
  container: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: RADIUS,
    opacity: 0.4, // Increased for visibility
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    backgroundColor: 'transparent',
  },
  topLeft: {
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
});
