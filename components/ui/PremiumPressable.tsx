import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PremiumPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  borderRadius?: number;
  shadowColor?: string;
  pressScale?: number;
  pressTranslateY?: number;
  enableSheen?: boolean;
}

export function PremiumPressable({
  children,
  onPress,
  style,
  disabled = false,
  borderRadius = 18,
  shadowColor = '#000000',
  pressScale = 0.975,
  pressTranslateY = 1,
  enableSheen = true,
}: PremiumPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const sheenOpacity = useRef(new Animated.Value(0)).current;
  const sheenTranslate = useRef(new Animated.Value(-140)).current;

  const handlePressIn = useCallback(() => {
    if (disabled) {
      return;
    }

    sheenTranslate.setValue(-140);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressScale,
        friction: 7,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: pressTranslateY,
        friction: 7,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheenOpacity, {
        toValue: enableSheen ? 0.34 : 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(sheenTranslate, {
        toValue: 140,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();
  }, [disabled, enableSheen, pressScale, pressTranslateY, scale, sheenOpacity, sheenTranslate, translateY]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 160,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 6,
        tension: 160,
        useNativeDriver: true,
      }),
      Animated.timing(sheenOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, sheenOpacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        styles.root,
        {
          borderRadius,
          shadowColor,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        android_ripple={{ color: 'transparent' }}
        style={[styles.pressable, { borderRadius }]}
      >
        {children}
        {enableSheen ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sheenWrap,
              {
                borderRadius,
                opacity: sheenOpacity,
                transform: [{ translateX: sheenTranslate }, { rotate: '14deg' }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sheen}
            />
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  pressable: {
    overflow: 'hidden',
  },
  sheenWrap: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    width: 96,
  },
  sheen: {
    flex: 1,
  },
});
