import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';

export function LiquidGlassBackground() {
  const { theme } = useAppTheme();
  const blobColors = theme.backgroundBlobs || [
    'rgba(79,70,229,0.42)',
    'rgba(124,58,237,0.3)',
    'rgba(6,182,212,0.24)',
  ];
  const blobOne = useRef(new Animated.Value(0)).current;
  const blobTwo = useRef(new Animated.Value(0)).current;
  const blobThree = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBlobLoop = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [
      createBlobLoop(blobOne, 12000),
      createBlobLoop(blobTwo, 15000),
      createBlobLoop(blobThree, 18000),
    ];

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [blobOne, blobTwo, blobThree]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={(theme.backgroundGradient || ['#070912', '#141A39', '#0A2740']) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={(theme.backgroundAccentGradient || ['rgba(79,70,229,0.34)', 'transparent', 'rgba(6,182,212,0.16)']) as any}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.accentWash]}
      />

      <Animated.View
        style={[
          styles.blob,
          styles.blobOne,
          {
            backgroundColor: blobColors[0],
            shadowColor: blobColors[0],
            transform: [
              {
                translateX: blobOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 42],
                }),
              },
              {
                translateY: blobOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 46],
                }),
              },
              {
                scale: blobOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.08],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.blob,
          styles.blobTwo,
          {
            backgroundColor: blobColors[1],
            shadowColor: blobColors[1],
            transform: [
              {
                translateX: blobTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, -36],
                }),
              },
              {
                translateY: blobTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, -32],
                }),
              },
              {
                scale: blobTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1.12],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.blob,
          styles.blobThree,
          {
            backgroundColor: blobColors[2],
            shadowColor: blobColors[2],
            transform: [
              {
                translateX: blobThree.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-22, 30],
                }),
              },
              {
                translateY: blobThree.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, -28],
                }),
              },
              {
                scale: blobThree.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1.1],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  accentWash: {
    opacity: 0.68,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.78,
    shadowOffset: { width: 0, height: 32 },
    shadowOpacity: 0.42,
    shadowRadius: 140,
    elevation: 22,
  },
  blobOne: {
    width: 320,
    height: 320,
    top: -120,
    left: -110,
  },
  blobTwo: {
    width: 360,
    height: 360,
    right: -140,
    bottom: -160,
  },
  blobThree: {
    width: 280,
    height: 280,
    top: '42%',
    left: '38%',
  },
});
