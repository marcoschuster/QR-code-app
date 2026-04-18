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
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useLiquidGlassBlurTarget } from './LiquidGlassContext';

type Shard = {
  id: number;
  x: number;
  y: number;
  rotation: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
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
  const [shards, setShards] = useState<Shard[]>([]);
  const shardsRef = useRef<Shard[]>([]);
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

      // Create multiple shards for glass breaking effect
      const newShards: Shard[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * 360;
        const distance = 30 + Math.random() * 50;
        const shard: Shard = {
          id: id + i,
          x: locationX,
          y: locationY,
          rotation: new Animated.Value(0),
          scale: new Animated.Value(0),
          opacity: new Animated.Value(0.8),
          translateX: new Animated.Value(0),
          translateY: new Animated.Value(0),
        };
        newShards.push(shard);

        Animated.parallel([
          Animated.timing(shard.rotation, {
            toValue: angle,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(shard.scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(shard.translateX, {
            toValue: Math.cos(angle * Math.PI / 180) * distance,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(shard.translateY, {
            toValue: Math.sin(angle * Math.PI / 180) * distance,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(shard.opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          shardsRef.current = shardsRef.current.filter((entry) => entry.id !== shard.id);
          setShards([...shardsRef.current]);
        });
      }

      shardsRef.current = [...shardsRef.current, ...newShards];
      setShards(shardsRef.current);
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
          backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
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
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
                borderRadius,
              },
            ]}
          />
        </BlurView>
      </View>

      {/* Iridescent gloss overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.4)'] as any}
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
          {shards.map((shard) => (
            <Animated.View
              key={shard.id}
              style={[
                styles.shard,
                {
                  left: shard.x,
                  top: shard.y,
                  width: 20,
                  height: 8,
                  backgroundColor: theme.accent,
                  opacity: shard.opacity,
                  transform: [
                    { rotate: shard.rotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }) as any },
                    { scale: shard.scale as any },
                    { translateX: shard.translateX as any },
                    { translateY: shard.translateY as any },
                  ],
                },
              ]}
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
    opacity: 0.6,
  },
  shard: {
    position: 'absolute',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
