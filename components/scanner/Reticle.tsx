import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_SIZE = 260;
const DEFAULT_TOP = (SCREEN_HEIGHT - DEFAULT_SIZE) / 2 - 70;
const DEFAULT_LEFT = (SCREEN_WIDTH - DEFAULT_SIZE) / 2;
const CORNER_LENGTH = 32;
const STROKE_WIDTH = 4;
const RADIUS = 8;
const IDLE_DELAY_MS = 3000;
const IDLE_PAUSE_MS = 900;
type IdleMode = 'shiver' | 'ripple' | 'morph' | 'tilt' | 'orbit' | 'glide';

const IDLE_MODES: IdleMode[] = ['shiver', 'ripple', 'morph', 'tilt', 'orbit', 'glide'];
const BASE_ANCHORS = [
  { x: 0, y: 0 },
  { x: DEFAULT_SIZE - CORNER_LENGTH, y: 0 },
  { x: 0, y: DEFAULT_SIZE - CORNER_LENGTH },
  { x: DEFAULT_SIZE - CORNER_LENGTH, y: DEFAULT_SIZE - CORNER_LENGTH },
] as const;
const DIRECTIONS = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
] as const;
const MODE_DURATIONS: Record<IdleMode, number> = {
  shiver: 1900,
  ripple: 2500,
  morph: 3200,
  tilt: 2400,
  orbit: 3900,
  glide: 2600,
};
const ORBIT_INPUT_RANGE = [0, 0.12, 0.28, 0.5, 0.7, 0.84, 0.94, 1];
const ORBIT_POINTS = [
  [
    { x: 0, y: 0 },
    { x: 88, y: 26 },
    { x: 194, y: 34 },
    { x: 202, y: 182 },
    { x: 42, y: 200 },
    { x: 82, y: 146 },
    { x: 44, y: 78 },
    { x: 0, y: 0 },
  ],
  [
    { x: DEFAULT_SIZE - CORNER_LENGTH, y: 0 },
    { x: 106, y: 24 },
    { x: 212, y: 38 },
    { x: 194, y: 190 },
    { x: 52, y: 188 },
    { x: 92, y: 136 },
    { x: 116, y: 78 },
    { x: DEFAULT_SIZE - CORNER_LENGTH, y: 0 },
  ],
  [
    { x: 0, y: DEFAULT_SIZE - CORNER_LENGTH },
    { x: 98, y: 42 },
    { x: 202, y: 48 },
    { x: 210, y: 198 },
    { x: 40, y: 206 },
    { x: 80, y: 158 },
    { x: 32, y: 126 },
    { x: 0, y: DEFAULT_SIZE - CORNER_LENGTH },
  ],
  [
    { x: DEFAULT_SIZE - CORNER_LENGTH, y: DEFAULT_SIZE - CORNER_LENGTH },
    { x: 118, y: 46 },
    { x: 214, y: 54 },
    { x: 204, y: 204 },
    { x: 50, y: 198 },
    { x: 92, y: 154 },
    { x: 110, y: 124 },
    { x: DEFAULT_SIZE - CORNER_LENGTH, y: DEFAULT_SIZE - CORNER_LENGTH },
  ],
] as const;

interface Bounds {
  origin: { x: number; y: number };
  size: { width: number; height: number };
}

interface ReticleProps {
  targetBounds: Bounds | null;
  isLocking: boolean;
}

function pickNextMode(previousMode: IdleMode | null) {
  const choices = IDLE_MODES.filter((mode) => mode !== previousMode);
  return choices[Math.floor(Math.random() * choices.length)] || IDLE_MODES[0];
}

function getShiverOffsets(index: number) {
  const xOffsets = [
    [0, -2, 2, -1, 1, 0],
    [0, 2, -2, 1, -1, 0],
    [0, -1, 2, -2, 1, 0],
    [0, 2, -1, 2, -2, 0],
  ] as const;
  const yOffsets = [
    [0, -1, 1, -2, 1, 0],
    [0, -2, 1, -1, 2, 0],
    [0, 1, -2, 1, -1, 0],
    [0, 2, -1, 2, -2, 0],
  ] as const;

  return {
    x: xOffsets[index] ?? xOffsets[0],
    y: yOffsets[index] ?? yOffsets[0],
  };
}

function getModeEasing(mode: IdleMode) {
  switch (mode) {
    case 'shiver':
      return Easing.inOut(Easing.sin);
    case 'ripple':
      return Easing.inOut(Easing.cubic);
    case 'morph':
      return Easing.inOut(Easing.cubic);
    case 'tilt':
      return Easing.inOut(Easing.quad);
    case 'orbit':
      return Easing.bezier(0.2, 0.72, 0.16, 1);
    case 'glide':
      return Easing.inOut(Easing.sin);
    default:
      return Easing.inOut(Easing.ease);
  }
}

export function Reticle({ targetBounds, isLocking }: ReticleProps) {
  const animatedTop = useRef(new Animated.Value(DEFAULT_TOP)).current;
  const animatedLeft = useRef(new Animated.Value(DEFAULT_LEFT)).current;
  const animatedSize = useRef(new Animated.Value(DEFAULT_SIZE)).current;
  const animatedColor = useRef(new Animated.Value(0)).current;
  const idleProgress = useRef(new Animated.Value(0)).current;
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const previousModeRef = useRef<IdleMode | null>(null);
  const lockingRef = useRef(isLocking);
  const mountedRef = useRef(true);
  const [idleMode, setIdleMode] = useState<IdleMode | null>(null);

  const clearIdleTimer = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  };

  const stopIdleAnimation = () => {
    clearIdleTimer();
    idleAnimationRef.current?.stop();
    idleAnimationRef.current = null;
    idleProgress.stopAnimation();
    idleProgress.setValue(0);
    previousModeRef.current = idleMode;
    if (mountedRef.current) {
      setIdleMode(null);
    }
  };

  const scheduleIdleMode = (delayMs: number) => {
    clearIdleTimer();

    if (lockingRef.current) {
      return;
    }

    idleTimeoutRef.current = setTimeout(() => {
      if (lockingRef.current || !mountedRef.current) {
        return;
      }

      const nextMode = pickNextMode(previousModeRef.current);
      previousModeRef.current = nextMode;
      idleProgress.setValue(0);
      setIdleMode(nextMode);

      const animation = Animated.timing(idleProgress, {
        toValue: 1,
        duration: MODE_DURATIONS[nextMode],
        easing: getModeEasing(nextMode),
        useNativeDriver: false,
      });

      idleAnimationRef.current = animation;
      animation.start(({ finished }) => {
        idleAnimationRef.current = null;

        if (!finished || lockingRef.current || !mountedRef.current) {
          return;
        }

        idleProgress.setValue(0);
        setIdleMode(null);
        scheduleIdleMode(IDLE_PAUSE_MS);
      });
    }, delayMs);
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearIdleTimer();
      idleAnimationRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    lockingRef.current = isLocking;
  }, [isLocking]);

  useEffect(() => {
    if (isLocking && targetBounds) {
      stopIdleAnimation();

      const { origin, size } = targetBounds;
      const targetSize = Math.max(size.width, size.height) + 16;

      Animated.parallel([
        Animated.spring(animatedTop, {
          toValue: origin.y,
          useNativeDriver: false,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(animatedLeft, {
          toValue: origin.x,
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
        Animated.spring(animatedColor, {
          toValue: 1,
          useNativeDriver: false,
          friction: 8,
          tension: 100,
        }),
      ]).start();

      return;
    }

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
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();

    stopIdleAnimation();
    scheduleIdleMode(IDLE_DELAY_MS);

    return () => {
      stopIdleAnimation();
    };
  }, [animatedColor, animatedLeft, animatedSize, animatedTop, idleProgress, isLocking, targetBounds]);

  const borderColor = animatedColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#30D158'],
  });

  const stageRotate = (() => {
    switch (idleMode) {
      case 'tilt':
        return idleProgress.interpolate({
          inputRange: [0, 0.2, 0.46, 0.72, 0.9, 1],
          outputRange: ['0deg', '-3deg', '2.5deg', '-1.5deg', '-0.4deg', '0deg'],
        });
      case 'morph':
        return idleProgress.interpolate({
          inputRange: [0, 0.22, 0.5, 0.78, 0.92, 1],
          outputRange: ['0deg', '-0.8deg', '0.9deg', '-0.35deg', '-0.1deg', '0deg'],
        });
      default:
        return '0deg';
    }
  })();

  const stageScale = (() => {
    switch (idleMode) {
      case 'morph':
        return idleProgress.interpolate({
          inputRange: [0, 0.2, 0.5, 0.78, 0.92, 1],
          outputRange: [1, 1.008, 0.988, 1.003, 0.998, 1],
        });
      default:
        return 1;
    }
  })();

  const stageTranslateY = idleMode === 'tilt'
    ? idleProgress.interpolate({
        inputRange: [0, 0.2, 0.46, 0.72, 0.9, 1],
        outputRange: [0, -3, 1.5, -0.8, -0.2, 0],
      })
    : 0;

  const getCornerMotionStyle = (index: number) => {
    const direction = DIRECTIONS[index];
    const baseAnchor = BASE_ANCHORS[index];
    let translateX: number | Animated.AnimatedInterpolation<number> = 0;
    let translateY: number | Animated.AnimatedInterpolation<number> = 0;
    let rotate: string | Animated.AnimatedInterpolation<string | number> = '0deg';
    let scale: number | Animated.AnimatedInterpolation<number> = 1;

    if (idleMode === 'shiver') {
      const offsets = getShiverOffsets(index);
      translateX = idleProgress.interpolate({
        inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
        outputRange: [...offsets.x],
      });
      translateY = idleProgress.interpolate({
        inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
        outputRange: [...offsets.y],
      });
    }

    if (idleMode === 'ripple') {
      translateX = idleProgress.interpolate({
        inputRange: [0, 0.2, 0.48, 0.78, 1],
        outputRange: [0, direction.x * 2, direction.x * 5, direction.x * 1.6, 0],
      });
      translateY = idleProgress.interpolate({
        inputRange: [0, 0.2, 0.48, 0.78, 1],
        outputRange: [0, direction.y * 2, direction.y * 5, direction.y * 1.6, 0],
      });
      scale = idleProgress.interpolate({
        inputRange: [0, 0.24, 0.5, 0.8, 1],
        outputRange: [1, 1.02, 1.06, 1.02, 1],
      });
    }

    if (idleMode === 'morph') {
      translateX = idleProgress.interpolate({
        inputRange: [0, 0.18, 0.42, 0.7, 0.9, 1],
        outputRange: [0, direction.x * 4, direction.x * 6, direction.x * 3, direction.x * 0.8, 0],
      });
      translateY = idleProgress.interpolate({
        inputRange: [0, 0.18, 0.42, 0.7, 0.9, 1],
        outputRange: [0, direction.y * 4, direction.y * 6, direction.y * 3, direction.y * 0.8, 0],
      });
      scale = idleProgress.interpolate({
        inputRange: [0, 0.18, 0.42, 0.7, 0.9, 1],
        outputRange: [1, 0.95, 1.04, 1.01, 0.99, 1],
      });
      rotate = idleProgress.interpolate({
        inputRange: [0, 0.2, 0.45, 0.72, 1],
        outputRange:
          index === 0
            ? ['0deg', '-4deg', '6deg', '-2deg', '0deg']
            : index === 1
              ? ['0deg', '4deg', '-6deg', '2deg', '0deg']
              : index === 2
                ? ['0deg', '3deg', '-5deg', '1deg', '0deg']
                : ['0deg', '-3deg', '5deg', '-1deg', '0deg'],
      });
    }

    if (idleMode === 'tilt') {
      translateX = idleProgress.interpolate({
        inputRange: [0, 0.2, 0.46, 0.72, 0.9, 1],
        outputRange: [0, -2.5, 1.8, -0.9, -0.2, 0],
      });
      translateY = idleProgress.interpolate({
        inputRange: [0, 0.2, 0.46, 0.72, 0.9, 1],
        outputRange: [0, -0.8, 0.8, -0.6, -0.15, 0],
      });
    }

    if (idleMode === 'orbit') {
      const points = ORBIT_POINTS[index];
      translateX = idleProgress.interpolate({
        inputRange: ORBIT_INPUT_RANGE,
        outputRange: points.map((point) => point.x - baseAnchor.x),
      });
      translateY = idleProgress.interpolate({
        inputRange: ORBIT_INPUT_RANGE,
        outputRange: points.map((point) => point.y - baseAnchor.y),
      });
      rotate = idleProgress.interpolate({
        inputRange: [0, 0.18, 0.48, 0.78, 0.92, 1],
        outputRange: ['0deg', '8deg', '112deg', '242deg', '334deg', '360deg'],
      });
      scale = idleProgress.interpolate({
        inputRange: [0, 0.18, 0.46, 0.74, 0.9, 1],
        outputRange: [1, 0.97, 1.02, 0.965, 0.992, 1],
      });
    }

    if (idleMode === 'glide') {
      const glideX = [
        [0, 8, 8, 0, 0],
        [0, 0, -8, -8, 0],
        [0, 8, 8, 0, 0],
        [0, 0, -8, -8, 0],
      ] as const;
      const glideY = [
        [0, 0, 8, 8, 0],
        [0, 8, 8, 0, 0],
        [0, -8, -8, 0, 0],
        [0, 0, -8, -8, 0],
      ] as const;

      translateX = idleProgress.interpolate({
        inputRange: [0, 0.24, 0.52, 0.8, 1],
        outputRange: [...(glideX[index] ?? glideX[0])],
      });
      translateY = idleProgress.interpolate({
        inputRange: [0, 0.24, 0.52, 0.8, 1],
        outputRange: [...(glideY[index] ?? glideY[0])],
      });
      rotate = idleProgress.interpolate({
        inputRange: [0, 0.28, 0.55, 0.82, 1],
        outputRange: ['0deg', '2deg', '0deg', '-2deg', '0deg'],
      });
    }

    return {
      transform: [
        { translateX },
        { translateY },
        { rotate },
        { scale },
      ],
    };
  };

  const getCornerStrokeStyle = (index: number) => {
    const bloomProgress = idleProgress.interpolate({
      inputRange: [0, 0.16, 0.38, 0.68, 0.86, 1],
      outputRange: idleMode === 'morph' ? [0, 0.18, 0.9, 1, 0.32, 0] : [0, 0, 0, 0, 0, 0],
    });

    let strokeScaleX: number | Animated.AnimatedInterpolation<number> = 1;
    let strokeScaleY: number | Animated.AnimatedInterpolation<number> = 1;
    let strokeTranslateX: number | Animated.AnimatedInterpolation<number> = 0;
    let strokeTranslateY: number | Animated.AnimatedInterpolation<number> = 0;
    let strokeOpacity: number | Animated.AnimatedInterpolation<number> = 1;

    if (idleMode === 'morph') {
      const xDirections = [-1, 1, -1, 1] as const;
      const yDirections = [-1, -1, 1, 1] as const;
      const xDirection = xDirections[index] ?? 1;
      const yDirection = yDirections[index] ?? 1;

      strokeScaleX = bloomProgress.interpolate({
        inputRange: [0, 0.35, 0.65, 1],
        outputRange:
          index % 2 === 0
            ? [1, 0.88, 1.12, 1]
            : [1, 1.12, 0.9, 1],
      });
      strokeScaleY = bloomProgress.interpolate({
        inputRange: [0, 0.35, 0.65, 1],
        outputRange:
          index % 2 === 0
            ? [1, 1.08, 0.92, 1]
            : [1, 0.9, 1.1, 1],
      });
      strokeTranslateX = bloomProgress.interpolate({
        inputRange: [0, 0.35, 0.7, 1],
        outputRange: [0, xDirection * 2.5, xDirection * 1, 0],
      });
      strokeTranslateY = bloomProgress.interpolate({
        inputRange: [0, 0.35, 0.7, 1],
        outputRange: [0, yDirection * 2.5, yDirection * 1, 0],
      });
      strokeOpacity = bloomProgress.interpolate({
        inputRange: [0, 0.84, 1],
        outputRange: [1, 0.7, 0.25],
      });
    }

    if (idleMode === 'ripple') {
      strokeOpacity = idleProgress.interpolate({
        inputRange: [0, 0.2, 0.5, 0.82, 1],
        outputRange: [1, 0.96, 0.82, 0.94, 1],
      });
    }

    return {
      strokeStyle: {
        borderColor,
        opacity: strokeOpacity,
        transform: [
          { translateX: strokeTranslateX },
          { translateY: strokeTranslateY },
          { scaleX: strokeScaleX },
          { scaleY: strokeScaleY },
        ],
      },
    };
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          top: animatedTop,
          left: animatedLeft,
          width: animatedSize,
          height: animatedSize,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.reticleStage,
          {
            transform: [
              { translateY: stageTranslateY },
              { rotate: stageRotate },
              { scale: stageScale },
            ],
          },
        ]}
      >
        {BASE_ANCHORS.map((_, index) => {
          const { strokeStyle } = getCornerStrokeStyle(index);

          return (
            <Animated.View
              key={`corner-${index}`}
              style={[
                styles.cornerContainer,
                index === 0 && styles.topLeft,
                index === 1 && styles.topRight,
                index === 2 && styles.bottomLeft,
                index === 3 && styles.bottomRight,
                getCornerMotionStyle(index),
              ]}
            >
              <Animated.View
                style={[
                  styles.cornerStroke,
                  index === 0 && styles.topLeftStroke,
                  index === 1 && styles.topRightStroke,
                  index === 2 && styles.bottomLeftStroke,
                  index === 3 && styles.bottomRightStroke,
                  strokeStyle,
                ]}
              />
            </Animated.View>
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 10,
    elevation: 10,
  },
  reticleStage: {
    width: '100%',
    height: '100%',
    overflow: 'visible',
  },
  cornerContainer: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  },
  cornerStroke: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: STROKE_WIDTH,
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
  topLeftStroke: {
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: RADIUS,
  },
  topRightStroke: {
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: RADIUS,
  },
  bottomLeftStroke: {
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS,
  },
  bottomRightStroke: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: RADIUS,
  },
});
