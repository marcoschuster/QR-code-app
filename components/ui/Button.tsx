import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, spacing, borderRadius, typography } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false,
  icon 
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const getButtonStyle = () => {
    const baseStyle = {
      borderRadius: borderRadius.sm,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
    };

    const sizeStyles = {
      small: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 44,
      },
      large: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        minHeight: 52,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: disabled ? theme.text.tertiary : theme.accent,
      },
      secondary: {
        backgroundColor: disabled ? theme.text.tertiary : theme.surface,
        borderWidth: 1,
        borderColor: disabled ? theme.text.tertiary : theme.border,
      },
      danger: {
        backgroundColor: disabled ? theme.text.tertiary : theme.danger,
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
      fontWeight: typography.weights.semibold,
    };

    const sizeStyles = {
      small: { fontSize: typography.sizes.sm },
      medium: { fontSize: typography.sizes.base },
      large: { fontSize: typography.sizes.lg },
    };

    const variantStyles = {
      primary: {
        color: disabled ? theme.text.tertiary : '#FFFFFF',
      },
      secondary: {
        color: disabled ? theme.text.tertiary : theme.text.primary,
      },
      danger: {
        color: disabled ? theme.text.tertiary : '#FFFFFF',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        getButtonStyle(),
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={getTextStyle()}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
