import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { QrGeneratorContent } from '../../components/generator/QrGeneratorContent';
import { TabBar } from '../../components/ui/TabBar';
import { darkTheme, lightTheme } from '../../constants/theme';

export default function GenerateScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
