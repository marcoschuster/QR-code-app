import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, darkTheme, spacing, borderRadius, typography } from '../../constants/theme';
import { useSettingsStore } from '../../store/useSettingsStore';

const { width: screenWidth } = Dimensions.get('window');

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { appearance } = useSettingsStore();
  
  const actualTheme = appearance === 'system' ? colorScheme : appearance;
  const isDark = actualTheme === 'dark';

  const tabs = [
    { id: 'scan', icon: 'camera-outline', activeIcon: 'camera', label: 'Scan' },
    { id: 'generate', icon: 'qr-code-outline', activeIcon: 'qr-code', label: 'Generate' },
    { id: 'history', icon: 'time-outline', activeIcon: 'time', label: 'History' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.blurView, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={({ pressed }) => [
                  styles.tab,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => onTabChange(tab.id)}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={(isActive ? tab.activeIcon : tab.icon) as any}
                    size={24}
                    color={isActive ? theme.accent : theme.text.secondary}
                  />
                  {isActive && (
                    <View
                      style={[
                        styles.activeDot,
                        { backgroundColor: theme.accent },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: isActive ? theme.accent : theme.text.secondary,
                      fontFamily: typography.fontFamily,
                      fontWeight: isActive ? '600' : '500',
                      fontSize: 12,
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
    </View>
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
  blurView: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: 240,
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
  },
});
