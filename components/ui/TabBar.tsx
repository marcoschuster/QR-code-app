import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
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
const ACTIVE_PILL_WIDTH = 72;
const ACTIVE_PILL_HEIGHT = 68;

export function TabBar({ activeTab, onTabChange, hidden = false, onToggleHidden }: TabBarProps) {
  const { theme } = useAppTheme();
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
    { id: 'generate', icon: 'qr-code-outline', activeIcon: 'qr-code', label: 'Generate' },
    { id: 'history', icon: 'time-outline', activeIcon: 'time', label: 'History' },
  ];
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
  const tabSlotWidth =
    (tabBarWidth - TAB_BAR_HORIZONTAL_PADDING * 2 - TAB_GAP * (tabs.length - 1)) / tabs.length;
  const activePillTranslateX = activeProgress.interpolate({
    inputRange: tabs.map((_, index) => index),
    outputRange: tabs.map(
      (_, index) =>
        TAB_BAR_HORIZONTAL_PADDING +
        index * (tabSlotWidth + TAB_GAP) +
        (tabSlotWidth - ACTIVE_PILL_WIDTH) / 2
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
        <LiquidGlassSurface borderRadius={32} style={styles.shellSurface} blurIntensity={46}>
          <View
            style={styles.tabBar}
            onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                {
                  backgroundColor: theme.glassHighlight,
                  shadowColor: theme.accent,
                  transform: [{ translateX: activePillTranslateX }],
                },
              ]}
            />
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
                      size={24}
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
    top: 5,
    left: 0,
    width: ACTIVE_PILL_WIDTH,
    height: ACTIVE_PILL_HEIGHT,
    borderRadius: ACTIVE_PILL_HEIGHT / 2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  label: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
    fontSize: 12,
  },
});
