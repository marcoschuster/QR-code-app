import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useLiquidGlassBlurTarget } from './LiquidGlassContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Ripple = {
  id: number;
  x: number;
  y: number;
  radius: Animated.Value;
  opacity: Animated.Value;
};

interface LiquidGlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  blurIntensity?: number;
  enableRipple?: boolean;
  showHighlight?: boolean;
}

export function LiquidGlassSurface({
  children,
  style,
  contentStyle,
  borderRadius = 28,
  blurIntensity,
  enableRipple = true,
  showHighlight = true,
}: LiquidGlassSurfaceProps) {
  const { theme, isDark } = useAppTheme();
  const blurTargetRef = useLiquidGlassBlurTarget();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const gradientId = useRef(`liquid-ripple-${Math.random().toString(36).slice(2)}`).current;
  const scale = useRef(new Animated.Value(1)).current;
  const borderOpacity = useRef(new Animated.Value(0)).current;

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.985,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0.6,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      if (!enableRipple) {
        return;
      }

      const { locationX, locationY } = event.nativeEvent;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const ripple: Ripple = {
        id,
        x: locationX,
        y: locationY,
        radius: new Animated.Value(18),
        opacity: new Animated.Value(0.38),
      };

      ripplesRef.current = [...ripplesRef.current, ripple];
      setRipples(ripplesRef.current);

      Animated.parallel([
        Animated.timing(ripple.radius, {
          toValue: 124,
          duration: 650,
          useNativeDriver: false,
        }),
        Animated.timing(ripple.opacity, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]).start(() => {
        ripplesRef.current = ripplesRef.current.filter((entry) => entry.id !== id);
        setRipples([...ripplesRef.current]);
      });
    },
    [borderOpacity, enableRipple, scale]
  );

  const handleTouchEnd = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(borderOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [borderOpacity, scale]);

  return (
    <Animated.View
      style={[
        styles.shell,
        {
          borderRadius,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          borderColor: theme.border,
          shadowColor: theme.shadow,
          transform: [{ scale }],
        },
        style,
      ]}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Blurred blobs for color */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.blobClip, { borderRadius }]}
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
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                borderRadius,
              },
            ]}
          />
        </BlurView>
      </View>

      {/* Color blobs - larger, blurrier, more transparent */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.blobClip, { borderRadius }]}>
        <View style={[styles.blob1, { backgroundColor: isDark ? 'rgba(79,70,229,0.04)' : 'rgba(79,70,229,0.03)' }]} />
        <View style={[styles.blob2, { backgroundColor: isDark ? 'rgba(6,182,212,0.05)' : 'rgba(6,182,212,0.04)' }]} />
        <View style={[styles.blob3, { backgroundColor: isDark ? 'rgba(124,58,237,0.03)' : 'rgba(124,58,237,0.02)' }]} />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.borderOverlay,
          {
            borderRadius,
            opacity: borderOpacity,
          },
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: isDark ? 'rgba(79,70,229,0.6)' : 'rgba(79,70,229,0.5)',
            },
          ]}
        />
      </Animated.View>

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

      {showHighlight ? (
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

      {enableRipple ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={isDark ? "#FFFFFF" : "#000000"} stopOpacity="0.55" />
                <Stop offset="55%" stopColor={isDark ? "#FFFFFF" : "#000000"} stopOpacity="0.14" />
                <Stop offset="100%" stopColor={isDark ? "#FFFFFF" : "#000000"} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {ripples.map((ripple) => (
              <AnimatedCircle
                key={ripple.id}
                cx={ripple.x}
                cy={ripple.y}
                r={ripple.radius as any}
                fill={`url(#${gradientId})`}
                opacity={ripple.opacity as any}
              />
            ))}
          </Svg>
        </View>
      ) : null}

      <View style={contentStyle}>{children}</View>
    </Animated.View>
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
    padding: 1,
  },
  blurClip: {
    overflow: 'hidden',
  },
  blobClip: {
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 176,
    height: 176,
    borderRadius: 88,
  },
  blob2: {
    position: 'absolute',
    bottom: -32,
    left: -32,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  blob3: {
    position: 'absolute',
    top: '30%',
    left: '40%',
    width: 208,
    height: 208,
    borderRadius: 104,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    opacity: 0.3,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    opacity: 0.9,
  },
});
