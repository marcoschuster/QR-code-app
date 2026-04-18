import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { spacing, borderRadius } from '../../constants/theme';
import { LiquidGlassSurface } from './LiquidGlassSurface';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
}

export function Card({ children, style, padding = spacing.md, margin = 0 }: CardProps) {
  const cardRadius = borderRadius.lg;

  return (
    <LiquidGlassSurface
      style={[
        styles.card,
        {
          padding,
          margin,
          borderRadius: cardRadius,
        },
        style,
      ]}
      borderRadius={cardRadius}
    >
      {children}
    </LiquidGlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {},
});
