import { ThemeColors } from './types';

export const lightTheme: ThemeColors = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  accent: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',
  text: {
    primary: '#000000',
    secondary: '#6E6E73',
    tertiary: '#8E8E93',
  },
  border: '#D1D1D6',
  shadow: '#000000',
};

export const darkTheme: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  accent: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',
  text: {
    primary: '#FFFFFF',
    secondary: '#AEAEB2',
    tertiary: '#8E8E93',
  },
  border: '#38383A',
  shadow: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 12,
  md: 16,
  lg: 28,
  xl: 32,
};

export const typography = {
  fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif',
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 34,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};
