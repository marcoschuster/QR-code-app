import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, typography } from '../../constants/theme';

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text.primary }]}>
        Scan History
      </Text>
      <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
        Coming soon - View your scan history
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
  },
});
