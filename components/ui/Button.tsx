import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, typography } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';

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
  const { theme } = useAppTheme();
  const hasGradient = variant === 'primary' && theme.accentGradient && theme.accentGradient.length >= 2;

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
        backgroundColor: hasGradient ? undefined : (disabled ? theme.text.tertiary : theme.accent),
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
      flexShrink: 1,
      textAlign: 'center' as const,
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

  const buttonContent = (
    <>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={getTextStyle()} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
    </>
  );

  const buttonStyle = getButtonStyle();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        hasGradient && !disabled ? { ...buttonStyle, borderWidth: 0 } : buttonStyle,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {hasGradient && !disabled ? (
        <>
          <LinearGradient
            colors={theme.accentGradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.absoluteGradient, { borderRadius: borderRadius.sm, borderWidth: 1, borderColor: theme.accent }]}
          />
          {buttonContent}
        </>
      ) : (
        buttonContent
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    gap: spacing.sm,
  },
  buttonWrapper: {
    borderWidth: 1,
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
    flex: 1,
  },
  gradientWrapper: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradientContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
