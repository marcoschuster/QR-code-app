import { ThemeColors } from './types';

export const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F4F4F5',
  accent: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',
  text: {
    primary: '#000000',
    secondary: '#5F5F67',
    tertiary: '#86868F',
  },
  border: '#D7D7DC',
  shadow: '#000000',
};

export const darkTheme: ThemeColors = {
  background: '#000000',
  surface: '#111214',
  accent: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',
  text: {
    primary: '#FFFFFF',
    secondary: '#B6B6BC',
    tertiary: '#8B8B93',
  },
  border: '#26272B',
  shadow: '#000000',
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
