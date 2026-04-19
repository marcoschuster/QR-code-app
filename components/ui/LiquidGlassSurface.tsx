import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useLiquidGlassBlurTarget } from './LiquidGlassContext';

interface LiquidGlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  blurIntensity?: number;
  enableRipple?: boolean;
  showHighlight?: boolean;
  showOutline?: boolean;
}

export function LiquidGlassSurface({
  children,
  style,
  contentStyle,
  borderRadius = 28,
  blurIntensity,
  enableRipple = true,
  showHighlight = true,
  showOutline = true,
}: LiquidGlassSurfaceProps) {
  const { theme, isDark } = useAppTheme();
  const blurTargetRef = useLiquidGlassBlurTarget();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const borderOpacity = useRef(new Animated.Value(0.3)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  }, []);

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      if (!enableRipple || dimensions.width === 0) return;

      const { locationX, locationY } = event.nativeEvent;
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // Calculate offset from center (-1 to 1)
      const offsetX = (locationX - centerX) / centerX;
      const offsetY = (locationY - centerY) / centerY;

      // Map offset to rotation degrees (Max 8 degrees)
      const targetRotateY = offsetX * 8;
      const targetRotateX = offsetY * -8;

      Animated.parallel([
        Animated.spring(tiltX, {
          toValue: targetRotateX,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(tiltY, {
          toValue: targetRotateY,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.98,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.35,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(pulseScale, {
          toValue: 1.08,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [tiltX, tiltY, scale, borderOpacity, pulseOpacity, pulseScale, dimensions, enableRipple]
  );

  const handleTouchEnd = useCallback(() => {
    Animated.parallel([
      Animated.spring(tiltX, {
        toValue: 0,
        friction: 10,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(tiltY, {
        toValue: 0,
        friction: 10,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(borderOpacity, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pulseOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(pulseScale, {
        toValue: 1.3,
        friction: 5,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start(() => {
      pulseScale.setValue(1);
    });
  }, [tiltX, tiltY, scale, borderOpacity, pulseOpacity, pulseScale]);

  // Specular highlight interpolations
  const specularX = tiltY.interpolate({
    inputRange: [-8, 8],
    outputRange: [30, -30],
  });

  const specularY = tiltX.interpolate({
    inputRange: [-8, 8],
    outputRange: [-30, 30],
  });

  const whitePulseOpacity = pulseOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.48],
  });

  const accentPulseOpacity = pulseOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.42],
  });

  return (
    <View
      style={style}
      onLayout={handleLayout}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Depth pulse glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseBase,
          {
            borderRadius: borderRadius + 24,
            opacity: whitePulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseAccent,
          {
            borderRadius: borderRadius + 32,
            opacity: accentPulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseLift,
          {
            borderRadius: borderRadius + 18,
            shadowColor: theme.accent,
            opacity: accentPulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.shell,
          {
            borderRadius,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow,
            borderWidth: showOutline ? 1 : 0,
            transform: [
              { perspective: 800 },
              { rotateX: tiltX.interpolate({
                inputRange: [-8, 8],
                outputRange: ['-8deg', '8deg'],
              }) as any },
              { rotateY: tiltY.interpolate({
                inputRange: [-8, 8],
                outputRange: ['-8deg', '8deg'],
              }) as any },
              { scale },
            ],
          },
        ]}
      >
      {/* Blurred background */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.blurClip, { borderRadius }]}
      >
        <BlurView
          intensity={blurIntensity ?? (isDark ? 42 : 34)}
          tint={isDark ? 'dark' : 'light'}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          blurTarget={Platform.OS === 'android' ? blurTargetRef ?? undefined : undefined}
          blurReductionFactor={Platform.OS === 'android' ? 3 : undefined}
            style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        >
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: theme.surface,
                borderRadius,
              },
            ]}
          />
        </BlurView>
      </View>

      {/* Iridescent gloss overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0.45)', 'rgba(180,200,255,0.15)', 'rgba(255,180,220,0.12)', 'rgba(255,255,255,0.3)'] as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, styles.iridescentOverlay, { borderRadius }]}
      />

      {showOutline ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.borderOverlay,
              {
                borderRadius,
                borderColor: theme.glassHighlight,
                opacity: borderOpacity,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.innerGlow,
              {
                borderRadius,
                borderColor: theme.glassHighlight,
              },
            ]}
          />
        </>
      ) : null}

      {showHighlight && showOutline ? (
        <View
          pointerEvents="none"
          style={[
            styles.topHighlight,
            {
              backgroundColor: theme.glassHighlight,
            },
          ]}
        />
      ) : null}

      {/* Specular highlight */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius,
            overflow: 'hidden',
          },
        ]}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: '20%',
            left: '20%',
            width: '60%',
            height: '60%',
            borderRadius: 999,
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            transform: [
              { translateX: specularX },
              { translateY: specularY },
              { scale: 1.5 },
            ],
          }}
        />
      </Animated.View>

      <View style={contentStyle}>{children}</View>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 14,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  blurClip: {
    overflow: 'hidden',
  },
  iridescentOverlay: {
    opacity: 0.45,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    opacity: 0.18,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 2,
    opacity: 0.72,
  },
  pulseBase: {
    position: 'absolute',
    top: -3,
    right: -3,
    bottom: -10,
    left: -3,
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 34,
    elevation: 26,
  },
  pulseAccent: {
    position: 'absolute',
    top: -7,
    right: -7,
    bottom: -15,
    left: -7,
    backgroundColor: 'rgba(255,255,255,0.014)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.96,
    shadowRadius: 40,
    elevation: 30,
  },
  pulseLift: {
    position: 'absolute',
    top: 8,
    right: -2,
    bottom: -14,
    left: -2,
    backgroundColor: 'rgba(255,255,255,0.012)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 28,
  },
});
