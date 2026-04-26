import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';

interface LiquidProgressProps {
  value: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function LiquidProgress({ value }: LiquidProgressProps) {
  const { isDark } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const widthRef = useRef(0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamp(value),
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const waveLoop = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    shimmerLoop.start();
    waveLoop.start();

    return () => {
      shimmerLoop.stop();
      waveLoop.stop();
    };
  }, [shimmer, wave]);

  const animatedWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 240],
  });

  const waveTranslateX = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -72],
  });

  return (
    <View
      style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)' }]}
      onLayout={(event) => {
        widthRef.current = event.nativeEvent.layout.width;
      }}
    >
      <Animated.View style={[styles.fillShell, { width: animatedWidth }]}>
        <LinearGradient
          colors={['#06b6d4', '#4f46e5', '#7c3aed'] as any}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.28)',
              transform: [{ translateX: shimmerTranslateX }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.waveWrap,
            {
              transform: [{ translateX: waveTranslateX }],
            },
          ]}
        >
          <View style={[styles.waveA, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.32)' }]} />
          <View style={[styles.waveB, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)' }]} />
          <View style={[styles.waveA, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.32)' }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fillShell: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  shimmer: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    width: 56,
    backgroundColor: 'rgba(255,255,255,0.28)',
    opacity: 0.7,
    transform: [{ skewX: '-18deg' as any }],
  },
  waveWrap: {
    position: 'absolute',
    left: 0,
    right: -72,
    bottom: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    opacity: 0.42,
  },
  waveA: {
    width: 36,
    height: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.32)',
    marginBottom: -2,
  },
  waveB: {
    width: 36,
    height: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 0,
  },
});
