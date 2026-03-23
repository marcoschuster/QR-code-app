import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, spacing, borderRadius, typography } from '../../constants/theme';

interface ChipProps {
  title: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ title, selected = false, onPress }: ChipProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const chipStyle = {
    backgroundColor: selected ? theme.accent : 'transparent',
    borderWidth: 1,
    borderColor: selected ? theme.accent : theme.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  };

  const textStyle = {
    color: selected ? '#FFFFFF' : theme.text.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fontFamily,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        chipStyle,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={textStyle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
