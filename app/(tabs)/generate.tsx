import React from 'react';
import { StatusBar, View, StyleSheet, PanResponder } from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { QrGeneratorContent } from '../../components/generator/QrGeneratorContent';
import { TabBar } from '../../components/ui/TabBar';
import { darkTheme, lightTheme } from '../../constants/theme';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function GenerateScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { swipeNavigation } = useSettingsStore();

  const handleTabChange = (tab: string) => {
    if (tab === 'scan') {
      router.push('/');
      return;
    }

    if (tab === 'history') {
      router.push('/(tabs)/history');
      return;
    }
  };

  const tabs = ['scan', 'history', 'generate'];
  const currentTabIndex = tabs.indexOf('generate');

  const panResponder = swipeNavigation ? PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10;
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx } = gestureState;
      const swipeThreshold = 30;

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
      <StatusBar hidden />
      <QrGeneratorContent />
      <TabBar activeTab="generate" onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
