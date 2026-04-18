import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
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

type Ping = {
  id: number;
  x: number;
  y: number;
  scale: Animated.Value;
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
  const [pings, setPings] = useState<Ping[]>([]);
  const pingsRef = useRef<Ping[]>([]);
  const scale = useRef(new Animated.Value(1)).current;
  const borderOpacity = useRef(new Animated.Value(0.3)).current;

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.985,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0.8,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      if (!enableRipple) {
        return;
      }

      const { locationX, locationY } = event.nativeEvent;
      const id = Date.now() + Math.floor(Math.random() * 1000);

      const ping: Ping = {
        id,
        x: locationX,
        y: locationY,
        scale: new Animated.Value(0),
        opacity: new Animated.Value(0.7),
      };

      pingsRef.current = [...pingsRef.current, ping];
      setPings(pingsRef.current);

      // Crystal ping animation
      Animated.parallel([
        Animated.timing(ping.scale, {
          toValue: 1.8,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ping.opacity, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        pingsRef.current = pingsRef.current.filter((entry) => entry.id !== id);
        setPings([...pingsRef.current]);
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
        toValue: 0.3,
        duration: 180,
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
          backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.9)',
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
                backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.9)',
                borderRadius,
              },
            ]}
          />
        </BlurView>
      </View>

      {/* Iridescent gloss overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0.35)', 'rgba(180,200,255,0.1)', 'rgba(255,180,220,0.08)', 'rgba(255,255,255,0.25)'] as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, styles.iridescentOverlay, { borderRadius }]}
      />

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
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
          {pings.map((ping) => (
            <Animated.View
              key={ping.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: ping.x - 50,
                top: ping.y - 50,
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: theme.accent,
                borderWidth: 1,
                borderColor: theme.accent,
                opacity: ping.opacity,
                transform: [{ scale: ping.scale }],
              }}
            />
          ))}
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
  iridescentOverlay: {
    opacity: 0.75,
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
    height: 1.5,
    opacity: 1.0,
  },
});
