import { useThemeStore, THEME_COLORS, FONT_FAMILIES } from '@/store/themeStore';

export function useColors() {
  const themeKey = useThemeStore((s) => s.themeKey);
  return THEME_COLORS[themeKey];
}

export function useFontFamily() {
  const fontKey = useThemeStore((s) => s.fontKey);
  return FONT_FAMILIES[fontKey];
}

/** Spacing scale (dp). Tight inside a group, generous between groups. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Corner radii: controls, fields and chips, cards and sheets. */
export const radius = { sm: 8, md: 12, lg: 16 } as const;

/** The display serif, used only for screen titles and the focus timer. */
export const DISPLAY_FONT = 'PlayfairDisplay_400Regular';

/** Type roles. Sizes come from here so screens share one scale. */
export const type = {
  display: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  title: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;
