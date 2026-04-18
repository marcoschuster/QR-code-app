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
import Svg, { Polygon, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useLiquidGlassBlurTarget } from './LiquidGlassContext';

type Shard = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  points: string;
  tilt: number;
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

      // Generate random size
      const size = 60 + Math.random() * 80; // 60-140px
      const width = size;
      const height = size;

      // Generate random 3-to-5 sided polygon points
      const numPoints = 3 + Math.floor(Math.random() * 3);
      const pointsArray = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = (Math.PI * 2 / numPoints) * i + (Math.random() - 0.5) * 1.2;
        const r = 30 + Math.random() * 20;
        const px = 50 + Math.cos(angle) * r;
        const py = 50 + Math.sin(angle) * r;
        pointsArray.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      }
      const pointsString = pointsArray.join(' ');

      // Generate random tilt (-5deg to +5deg)
      const tilt = (Math.random() - 0.5) * 10;

      const shard: Shard = {
        id,
        x: locationX,
        y: locationY,
        width,
        height,
        points: pointsString,
        tilt,
        scale: new Animated.Value(0),
        opacity: new Animated.Value(0),
      };

      shardsRef.current = [...shardsRef.current, shard];
      setShards(shardsRef.current);

      // Crack pop animation: scale 0 -> 1.1 -> 1.0
      Animated.sequence([
        Animated.timing(shard.scale, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shard.scale, {
          toValue: 1.0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Fade in then out
      Animated.sequence([
        Animated.timing(shard.opacity, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shard.opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        shardsRef.current = shardsRef.current.filter((entry) => entry.id !== id);
        setShards([...shardsRef.current]);
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
                styles.shardContainer,
                {
                  left: shard.x - shard.width / 2,
                  top: shard.y - shard.height / 2,
                  width: shard.width,
                  height: shard.height,
                  opacity: shard.opacity,
                  transform: [
                    { scale: shard.scale as any },
                    { rotate: `${shard.tilt}deg` },
                  ],
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 100 100">
                <Defs>
                  <SvgLinearGradient id={`shard-grad-${shard.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={theme.accent} stopOpacity="0.8" />
                    <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.4" />
                    <Stop offset="100%" stopColor={theme.accent} stopOpacity="0.6" />
                  </SvgLinearGradient>
                </Defs>
                <Polygon
                  points={shard.points}
                  fill={`url(#shard-grad-${shard.id})`}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
              </Svg>
            </Animated.View>
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
  shardContainer: {
    position: 'absolute',
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
