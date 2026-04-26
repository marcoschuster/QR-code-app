import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ChipProps {
  title: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ title, selected = false, onPress }: ChipProps) {
  const { theme, isDark } = useAppTheme();
  const hasGradient = selected && theme.accentGradient && theme.accentGradient.length >= 2;

  const chipStyle = {
    backgroundColor: selected && !hasGradient ? theme.accent : isDark ? 'rgba(20, 20, 30, 0.7)' : theme.surfaceStrong,
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

  const chipContent = <Text style={textStyle}>{title}</Text>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        chipStyle,
        pressed && { opacity: 0.8 },
      ]}
    >
      {hasGradient ? (
        <>
          <LinearGradient
            colors={theme.accentGradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.absoluteGradient, { borderRadius: borderRadius.lg }]}
          />
          {chipContent}
        </>
      ) : (
        chipContent
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  absoluteGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientBackground: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientWrapper: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradientContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
