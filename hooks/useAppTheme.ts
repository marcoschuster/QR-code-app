import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, getAccentColor, getAccentGradient, getStrongAccentGradient } from '../constants/theme';
import { useSettingsStore } from '../store/useSettingsStore';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const appearance = useSettingsStore((state) => state.appearance);
  const accentColor = useSettingsStore((state) => state.accentColor);

  const resolvedAppearance =
    appearance === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : appearance;

  const baseTheme = resolvedAppearance === 'dark' ? darkTheme : lightTheme;
  const dynamicAccent = getAccentColor(accentColor);
  const dynamicGradient = getAccentGradient(accentColor);
  const dynamicStrongGradient = getStrongAccentGradient(accentColor);

  return {
    theme: {
      ...baseTheme,
      accent: dynamicAccent,
      accentGradient: dynamicGradient,
      accentStrongGradient: dynamicStrongGradient,
    },
    isDark: resolvedAppearance === 'dark',
    colorScheme: resolvedAppearance,
  };
}
