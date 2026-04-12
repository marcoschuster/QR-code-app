import React from 'react';
import { View, StyleSheet, StatusBar, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { HistoryScreen } from '../../components/ui/HistoryScreen';
import { TabBar } from '../../components/ui/TabBar';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function HistoryTab() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const { swipeNavigation } = useSettingsStore();

  const handleTabChange = (tab: string) => {
    if (tab === 'scan') {
      router.push('/');
      return;
    }
    if (tab === 'generate') {
      router.push('/(tabs)/generate');
      return;
    }
  };

  const tabs = ['scan', 'history', 'generate'];
  const currentTabIndex = tabs.indexOf('history');

  const panResponder = swipeNavigation ? PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderRelease: (_, gestureState) => {
      const { dx } = gestureState;
      const swipeThreshold = 50;

      if (dx > swipeThreshold && currentTabIndex > 0) {
        // Swipe right - go to previous tab
        handleTabChange(tabs[currentTabIndex - 1]);
      } else if (dx < -swipeThreshold && currentTabIndex < tabs.length - 1) {
        // Swipe left - go to next tab
        handleTabChange(tabs[currentTabIndex + 1]);
      }
    },
  }) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} {...(panResponder?.panHandlers || {})}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <HistoryScreen />
      <TabBar activeTab="history" onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
