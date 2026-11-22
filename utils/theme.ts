import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { buildColors, useThemeStore, type Scheme } from '@/store/themeStore';

/** The colour scheme in effect: the saved mode, or the OS scheme when the mode is `system`. */
export function useScheme(): Scheme {
  const mode = useThemeStore((s) => s.mode);
  const os = useColorScheme();
  if (mode === 'system') return os === 'dark' ? 'dark' : 'light';
  return mode;
}

export function useIsDark() {
  return useScheme() === 'dark';
}

export function useColors() {
  const scheme = useScheme();
  const accent = useThemeStore((s) => s.accent);
  return useMemo(() => buildColors(scheme, accent), [scheme, accent]);
}

const INTER = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
} as const;

export function useFontFamily() {
  return INTER;
}

/** Spacing scale (dp). Tight inside a group, generous between groups. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Corner radii: controls, fields and chips, cards and sheets, and fully round. */
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

/** The display face, used for screen titles and the focus timer. */
export const DISPLAY_FONT = 'BricolageGrotesque_800ExtraBold';
/** The display face at 600, for smaller headings. */
export const DISPLAY_FONT_SEMI = 'BricolageGrotesque_600SemiBold';

/** Type roles. Sizes come from here so screens share one scale. */
export const type = {
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontSize: 20, lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;
