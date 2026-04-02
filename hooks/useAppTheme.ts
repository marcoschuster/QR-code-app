import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../constants/theme';
import { useSettingsStore } from '../store/useSettingsStore';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const appearance = useSettingsStore((state) => state.appearance);

  const resolvedAppearance =
    appearance === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : appearance;

  return {
    theme: resolvedAppearance === 'dark' ? darkTheme : lightTheme,
    isDark: resolvedAppearance === 'dark',
    colorScheme: resolvedAppearance,
  };
}
