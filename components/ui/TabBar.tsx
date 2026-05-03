import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { spacing, typography } from '../../constants/theme';
import { LiquidGlassSurface } from './LiquidGlassSurface';

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hidden?: boolean;
  onToggleHidden?: () => void;
}

type TabBarMotionState = 'shown' | 'showing' | 'hidden' | 'hiding';
const TAB_BAR_WIDTH = 270;
const TAB_BAR_HORIZONTAL_PADDING = 20;
const TAB_GAP = 12;
const ACTIVE_DARK_PILL_WIDTH = 76;
const ACTIVE_DARK_PILL_HEIGHT = 62;
const ACTIVE_LIGHT_PILL_WIDTH = 76;
const ACTIVE_LIGHT_PILL_HEIGHT = 62;

export function TabBar({ activeTab, onTabChange, hidden = false, onToggleHidden }: TabBarProps) {
  const { theme, isDark } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const activeProgress = useRef(new Animated.Value(0)).current;
  const motionState = useRef<TabBarMotionState>('shown');
  const [tabBarWidth, setTabBarWidth] = useState(TAB_BAR_WIDTH);
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  useEffect(() => {
    const nextValue = hidden ? 1 : 0;
    const nextState: TabBarMotionState = hidden ? 'hiding' : 'showing';

    if (
      (hidden && (motionState.current === 'hidden' || motionState.current === 'hiding')) ||
      (!hidden && (motionState.current === 'shown' || motionState.current === 'showing'))
    ) {
      return;
    }

    motionState.current = nextState;
    progress.stopAnimation((currentValue) => {
      if (Math.abs(currentValue - nextValue) < 0.01) {
        progress.setValue(nextValue);
        motionState.current = hidden ? 'hidden' : 'shown';
        return;
      }

      Animated.timing(progress, {
        toValue: nextValue,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }

        motionState.current = hidden ? 'hidden' : 'shown';
      });
    });
  }, [hidden, progress]);

  const tabs = [
    { id: 'scan', icon: 'camera-outline', activeIcon: 'camera', label: 'Scan' },
    { id: 'history', icon: 'time-outline', activeIcon: 'time', label: 'History' },
    { id: 'generate', icon: 'qr-code-outline', activeIcon: 'qr-code', label: 'Generate' },
  ];
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
  const tabSlotWidth =
    (tabBarWidth - TAB_BAR_HORIZONTAL_PADDING * 2 - TAB_GAP * (tabs.length - 1)) / tabs.length;
  const activeBubbleWidth = isDark ? ACTIVE_DARK_PILL_WIDTH : ACTIVE_LIGHT_PILL_WIDTH;
  const activePillTranslateX = activeProgress.interpolate({
    inputRange: tabs.map((_, index) => index),
    outputRange: tabs.map(
      (_, index) =>
        TAB_BAR_HORIZONTAL_PADDING +
        index * (tabSlotWidth + TAB_GAP) +
        (tabSlotWidth - activeBubbleWidth) / 2
    ),
  });
  useEffect(() => {
    Animated.spring(activeProgress, {
      toValue: activeIndex,
      friction: 9,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, activeProgress]);

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'auto'}
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={styles.shell}
      >
        <LiquidGlassSurface borderRadius={32} style={styles.shellSurface} blurIntensity={50} showHighlight>
          <View
            style={styles.tabBar}
            onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)',
                  borderColor: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.9)',
                  shadowColor: isDark ? 'rgba(255,255,255,0.36)' : 'rgba(32,48,84,0.18)',
                  shadowOffset: { width: 0, height: isDark ? 4 : 8 },
                  shadowOpacity: isDark ? 0.28 : 0.22,
                  shadowRadius: isDark ? 24 : 18,
                  top: 15,
                  width: activeBubbleWidth,
                  height: isDark ? ACTIVE_DARK_PILL_HEIGHT : ACTIVE_LIGHT_PILL_HEIGHT,
                  borderRadius: isDark ? ACTIVE_DARK_PILL_HEIGHT / 2 : ACTIVE_LIGHT_PILL_HEIGHT / 2,
                  overflow: 'hidden',
                  transform: [
                    { translateX: activePillTranslateX },
                    { scale: 1 },
                  ],
                },
              ]}
            >
              {isDark ? (
                <>
                  <View style={styles.activePillTopGlow} />
                  <View style={styles.activePillBottomGlow} />
                  <View style={styles.activePillCenterSheen} />
                </>
              ) : (
                <>
                  <LinearGradient
                    style={StyleSheet.absoluteFill}
                    colors={[
                      'rgba(255,255,255,0.98)',
                      'rgba(255,255,255,0.78)',
                      'rgba(238,244,255,0.62)',
                      'rgba(255,255,255,0.88)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                  <LinearGradient
                    pointerEvents="none"
                    style={styles.activePillLightInnerShade}
                    colors={['rgba(42,60,96,0)', 'rgba(42,60,96,0.11)']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                  />
                  <View style={styles.activePillLightTopGlow} />
                  <View style={styles.activePillLightHighlight} />
                  <View style={styles.activePillLightCenterSheen} />
                  <View style={styles.activePillLightSideSheen} />
                  <View style={styles.activePillLightBottomRim} />
                </>
              )}
            </Animated.View>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={({ pressed }) => [
                    styles.tab,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                  ]}
                  onPress={() => onTabChange(tab.id)}
                >
                  <View
                    style={[
                      styles.iconContainer,
                    ]}
                  >
                    <Ionicons
                      name={(isActive ? tab.activeIcon : tab.icon) as keyof typeof Ionicons.glyphMap}
                      size={isActive ? 28 : 26}
                      color={isActive ? theme.accent : theme.text.secondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: isActive ? theme.accent : theme.text.secondary,
                        fontWeight: isActive ? '600' : '500',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LiquidGlassSurface>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shell: {
    borderRadius: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },
  shellSurface: {
    borderRadius: 32,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: 270,
    gap: 12,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 40,
    height: 32,
    borderRadius: 16,
  },
  activePill: {
    position: 'absolute',
    left: 0,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  activePillTopGlow: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  activePillBottomGlow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  activePillCenterSheen: {
    position: 'absolute',
    top: 6,
    left: 8,
    right: 8,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.065)',
  },
  activePillLightTopGlow: {
    position: 'absolute',
    top: 1,
    left: 13,
    right: 13,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  activePillLightHighlight: {
    position: 'absolute',
    top: 5,
    left: 12,
    right: 16,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  activePillLightCenterSheen: {
    position: 'absolute',
    top: 18,
    left: 8,
    right: 8,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  activePillLightInnerShade: {
    ...StyleSheet.absoluteFillObject,
  },
  activePillLightSideSheen: {
    position: 'absolute',
    top: 6,
    left: 7,
    width: 13,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    transform: [{ rotate: '9deg' }],
  },
  activePillLightBottomRim: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 3,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(48,64,96,0.08)',
  },
  label: {
    marginTop: 2,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
    fontSize: 12,
  },
});
