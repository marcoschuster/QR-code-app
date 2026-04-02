import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

interface BadgeProps {
  title: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  size?: 'small' | 'medium';
  onPress?: () => void;
}

export function Badge({ title, variant = 'default', size = 'medium', onPress }: BadgeProps) {
  const { theme } = useAppTheme();

  const getBadgeStyle = () => {
    const baseStyle = {
      borderRadius: borderRadius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      alignSelf: 'flex-start' as const,
    };

    const sizeStyles = {
      small: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        minHeight: 24,
      },
      medium: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 32,
      },
    };

    const variantStyles = {
      default: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
      },
      success: {
        backgroundColor: theme.success + '20',
        borderWidth: 1,
        borderColor: theme.success,
      },
      danger: {
        backgroundColor: theme.danger + '20',
        borderWidth: 1,
        borderColor: theme.danger,
      },
      warning: {
        backgroundColor: theme.warning + '20',
        borderWidth: 1,
        borderColor: theme.warning,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyle = () => {
    const baseStyle = {
      fontFamily: typography.fontFamily,
      fontWeight: typography.weights.medium,
    };

    const sizeStyles = {
      small: { fontSize: typography.sizes.xs },
      medium: { fontSize: typography.sizes.sm },
    };

    const variantStyles = {
      default: { color: theme.text.secondary },
      success: { color: theme.success },
      danger: { color: theme.danger },
      warning: { color: theme.warning },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const BadgeComponent = (
    <View style={getBadgeStyle()}>
      <Text style={getTextStyle()}>{title}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
        {BadgeComponent}
      </Pressable>
    );
  }

  return BadgeComponent;
}
