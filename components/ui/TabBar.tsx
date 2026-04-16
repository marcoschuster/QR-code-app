import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { spacing, typography } from '../../constants/theme';

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hidden?: boolean;
  onToggleHidden?: () => void;
}

export function TabBar({ activeTab, onTabChange, hidden = false, onToggleHidden }: TabBarProps) {
  const { theme, isDark } = useAppTheme();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy } = gestureState;
        const swipeThreshold = 50;

        if (dy > swipeThreshold) {
          onToggleHidden?.();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: hidden ? 120 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: hidden ? 0 : 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [hidden, opacity, translateY]);

  const tabs = [
    { id: 'scan', icon: 'camera-outline', activeIcon: 'camera', label: 'Scan' },
    { id: 'generate', icon: 'qr-code-outline', activeIcon: 'qr-code', label: 'Generate' },
    { id: 'history', icon: 'time-outline', activeIcon: 'time', label: 'History' },
  ];

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
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.shell,
          {
            backgroundColor: isDark ? 'rgba(8,8,8,0.94)' : 'rgba(255,255,255,0.96)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            shadowColor: theme.shadow,
          },
        ]}
      >
        <View style={styles.tabBar}>
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
                <View style={styles.iconContainer}>
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
    borderRadius: 28,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: 248,
    gap: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 24,
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
    fontSize: 12,
  },
});
