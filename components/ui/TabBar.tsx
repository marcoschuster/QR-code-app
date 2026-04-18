import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
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

export function TabBar({ activeTab, onTabChange, hidden = false, onToggleHidden }: TabBarProps) {
  const { theme } = useAppTheme();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

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
    >
      <View
        style={styles.shell}
      >
        <LiquidGlassSurface borderRadius={32} style={styles.shellSurface} blurIntensity={46}>
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
                  <View
                    style={[
                      styles.iconContainer,
                      isActive && {
                        backgroundColor: theme.glassHighlight,
                        borderColor: theme.border,
                      },
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
    borderWidth: 1,
    borderColor: 'transparent',
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
