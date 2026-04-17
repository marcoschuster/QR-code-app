import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
}

export function Card({ children, style, padding = spacing.md, margin = 0 }: CardProps) {
  const { theme } = useAppTheme();
  const cardRadius = borderRadius.lg;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceStrong,
          padding,
          margin,
          borderRadius: cardRadius,
          shadowColor: theme.shadow,
          borderWidth: 1,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={(theme.surfaceGradient || [theme.surfaceStrong, theme.surface]) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <View style={[styles.highlight, { backgroundColor: theme.glassHighlight }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    opacity: 0.9,
  },
});
