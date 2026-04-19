import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { spacing, borderRadius } from '../../constants/theme';
import { LiquidGlassSurface } from './LiquidGlassSurface';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  margin?: number;
}

export function Card({ children, style, padding, margin = 0 }: CardProps) {
  const cardRadius = borderRadius.lg;
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const {
    padding: stylePadding,
    paddingHorizontal,
    paddingVertical,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    ...layoutStyle
  } = flattenedStyle;
  const hasStylePadding =
    stylePadding !== undefined ||
    paddingHorizontal !== undefined ||
    paddingVertical !== undefined ||
    paddingTop !== undefined ||
    paddingRight !== undefined ||
    paddingBottom !== undefined ||
    paddingLeft !== undefined;
  const contentPaddingStyle =
    padding !== undefined
      ? { padding }
      : hasStylePadding
        ? {
            ...(stylePadding !== undefined ? { padding: stylePadding } : {}),
            ...(paddingHorizontal !== undefined ? { paddingHorizontal } : {}),
            ...(paddingVertical !== undefined ? { paddingVertical } : {}),
            ...(paddingTop !== undefined ? { paddingTop } : {}),
            ...(paddingRight !== undefined ? { paddingRight } : {}),
            ...(paddingBottom !== undefined ? { paddingBottom } : {}),
            ...(paddingLeft !== undefined ? { paddingLeft } : {}),
          }
        : { padding: spacing.md };

  return (
    <LiquidGlassSurface
      style={[
        styles.card,
        {
          margin,
          borderRadius: cardRadius,
        },
        layoutStyle,
      ]}
      contentStyle={contentPaddingStyle}
      borderRadius={cardRadius}
    >
      {children}
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {},
});
