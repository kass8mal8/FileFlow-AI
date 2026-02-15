import { useTheme } from './ThemeContext';

export function useColorScheme() {
  const { theme, colors } = useTheme();
  return { theme, colors };
}
