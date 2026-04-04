import { useThemeStore, THEME_COLORS, FONT_FAMILIES } from '@/store/themeStore';

export function useColors() {
  const themeKey = useThemeStore((s) => s.themeKey);
  return THEME_COLORS[themeKey];
}

export function useFontFamily() {
  const fontKey = useThemeStore((s) => s.fontKey);
  return FONT_FAMILIES[fontKey];
}
