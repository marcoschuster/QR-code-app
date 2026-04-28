import { ThemeColors, AccentColor } from './types';

export const accentColors: Record<AccentColor, { primary: string; gradient?: string[] }> = {
  red: { primary: '#FF3B30' },
  blue: { primary: '#007AFF' },
  green: { primary: '#34C759' },
  purple: { primary: '#AF52DE' },
  orange: { primary: '#FF9500' },
  pink: { primary: '#FF2D55' },
  teal: { primary: '#5AC8FA' },
  indigo: { primary: '#5856D6' },
  sunset: { primary: '#FF6B35', gradient: ['#FF4500', '#FF6B35', '#FFD700'] },
  ocean: { primary: '#0066CC', gradient: ['#0066CC', '#1E90FF', '#00BFFF'] },
  forest: { primary: '#228B22', gradient: ['#228B22', '#32CD32', '#7CFC00'] },
  berry: { primary: '#8A2BE2', gradient: ['#8A2BE2', '#9400D3', '#DA70D6'] },
  aurora: { primary: '#00F5D4', gradient: ['#00CED1', '#00F5D4', '#7FFF00'] },
  peach: { primary: '#FF8A4C', gradient: ['#FF8A4C', '#FFC3A0', '#FF6FAE'] },
};

export const getAccentColor = (accentColor: AccentColor): string => {
  return accentColors[accentColor]?.primary ?? accentColors.red.primary;
};

export const getAccentGradient = (accentColor: AccentColor): string[] | undefined => {
  return accentColors[accentColor]?.gradient;
};

// Stronger gradients for small UI elements (chips, sort buttons, navigation icons, etc.)
export const getStrongAccentGradient = (accentColor: AccentColor): string[] | undefined => {
  const strongGradients: Record<AccentColor, string[] | undefined> = {
    red: undefined,
    blue: undefined,
    green: undefined,
    purple: undefined,
    orange: undefined,
    pink: undefined,
    teal: undefined,
    indigo: undefined,
    sunset: ['#8B0000', '#FF0000', '#FFFF00'],
    ocean: ['#000033', '#0000FF', '#00FFFF'],
    forest: ['#003300', '#00FF00', '#FFFF00'],
    berry: ['#2E0854', '#9400D3', '#FF69B4'],
    aurora: ['#006666', '#00FFFF', '#00FF00'],
    peach: ['#D94A1F', '#FF9F72', '#FF3D8E'],
  };
  return strongGradients[accentColor];
};

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  return {
    r: parseInt(fullHex.slice(0, 2), 16),
    g: parseInt(fullHex.slice(2, 4), 16),
    b: parseInt(fullHex.slice(4, 6), 16),
  };
}

function mixHex(baseHex: string, mixHexColor: string, weight: number) {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHexColor);

  return `#${[base.r, base.g, base.b]
    .map((channel, index) => {
      const mixChannel = [mix.r, mix.g, mix.b][index];
      const blended = channel + (mixChannel - channel) * weight;
      return clampChannel(blended).toString(16).padStart(2, '0');
    })
    .join('')}`;
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getAmbientStops(accentColor: AccentColor) {
  const primary = getAccentColor(accentColor);
  const gradient = getAccentGradient(accentColor);

  if (gradient && gradient.length >= 3) {
    return gradient.slice(0, 3);
  }

  return [
    mixHex(primary, '#ffffff', 0.2),
    primary,
    mixHex(primary, '#7dd3fc', 0.28),
  ];
}

export const getAmbientAccentGradient = (accentColor: AccentColor, isDark: boolean): string[] => {
  const [first, second, third] = getAmbientStops(accentColor);

  return isDark
    ? [
        rgbaFromHex(first, 0.22),
        rgbaFromHex(second, 0.18),
        rgbaFromHex(third, 0.14),
      ]
    : [
        rgbaFromHex(first, 0.18),
        rgbaFromHex(second, 0.14),
        rgbaFromHex(third, 0.1),
      ];
};

export const getAmbientBlobColors = (accentColor: AccentColor, isDark: boolean): string[] => {
  const [first, second, third] = getAmbientStops(accentColor);

  return isDark
    ? [
        rgbaFromHex(first, 0.4),
        rgbaFromHex(second, 0.34),
        rgbaFromHex(third, 0.26),
      ]
    : [
        rgbaFromHex(first, 0.34),
        rgbaFromHex(second, 0.28),
        rgbaFromHex(third, 0.22),
      ];
};

export const lightTheme: ThemeColors = {
  background: '#E8E8F0',
  surface: 'rgba(255,255,255,0.85)',
  surfaceStrong: 'rgba(255,255,255,0.95)',
  accent: '#FF0000',
  surfaceGradient: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'],
  backgroundGradient: ['#E8E8F0', '#F0F0F8', '#E0E8F0'],
  backgroundAccentGradient: ['rgba(79,70,229,0.12)', 'rgba(124,58,237,0.08)', 'rgba(6,182,212,0.06)'],
  backgroundBlobs: ['rgba(79,70,229,0.15)', 'rgba(124,58,237,0.15)', 'rgba(6,182,212,0.15)'],
  glassHighlight: 'rgba(255,255,255,0.9)',
  backdrop: 'rgba(232, 232, 240, 0.5)',
  danger: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',
  text: {
    primary: '#1A1A2E',
    secondary: 'rgba(26,26,46,0.6)',
    tertiary: 'rgba(26,26,46,0.4)',
  },
  border: 'rgba(26,26,46,0.12)',
  shadow: 'rgba(0,0,0,0.1)',
};

export const darkTheme: ThemeColors = {
  background: 'rgba(5, 5, 10, 0.95)',
  surface: 'rgba(8, 8, 14, 0.88)',
  surfaceStrong: 'rgba(12, 12, 18, 0.94)',
  accent: '#FF0000',
  surfaceGradient: ['rgba(15, 15, 22, 0.5)', 'rgba(8, 8, 14, 0.3)'],
  backgroundGradient: ['#050508', '#080810', '#040406'],
  backgroundAccentGradient: ['rgba(79,70,229,0.08)', 'rgba(124,58,237,0.05)', 'rgba(6,182,212,0.04)'],
  backgroundBlobs: ['rgba(79,70,229,0.18)', 'rgba(124,58,237,0.18)', 'rgba(6,182,212,0.18)'],
  glassHighlight: 'rgba(255,255,255,0.05)',
  backdrop: 'rgba(2, 4, 12, 0.8)',
  danger: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.6)',
    tertiary: 'rgba(255,255,255,0.4)',
  },
  border: 'rgba(255,255,255,0.06)',
  shadow: '#010205',
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
