import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { HistoryScreen } from '../../components/ui/HistoryScreen';
import { TabBar } from '../../components/ui/TabBar';
import { useAppTheme } from '../../hooks/useAppTheme';

export default function HistoryTab() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
