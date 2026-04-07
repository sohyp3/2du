import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/database';

export type ThemeKey = 'silver' | 'gold';
export type FontKey = 'inter' | 'playfair' | 'cormorant';

export interface ThemeColors {
  surface: string;
  surfaceDim: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  primaryContainer: string;
  primaryDim: string;
  onPrimary: string;
  outline: string;
  outlineVariant: string;
  secondary: string;
  error: string;
  errorContainer: string;
  onErrorContainer: string;
}

const SILVER_COLORS: ThemeColors = {
  surface: '#fafafa',
  surfaceDim: '#f0f0f0',
  surfaceContainer: '#ffffff',
  surfaceContainerLow: '#f5f5f5',
  surfaceContainerHigh: '#ebebeb',
  surfaceContainerHighest: '#dedede',
  onSurface: '#1a1a1a',
  onSurfaceVariant: '#5a5a5a',
  primary: '#787878',
  primaryContainer: '#b0b0b0',
  primaryDim: '#5e5e5e',
  onPrimary: '#ffffff',
  outline: '#a0a0a0',
  outlineVariant: '#d4d4d4',
  secondary: '#6e6e6e',
  error: '#c4402a',
  errorContainer: '#fbd5cc',
  onErrorContainer: '#3d1304',
};

const GOLD_COLORS: ThemeColors = {
  surface: '#121110',
  surfaceDim: '#0d0c0b',
  surfaceContainer: '#1c1a17',
  surfaceContainerLow: '#171614',
  surfaceContainerHigh: '#252320',
  surfaceContainerHighest: '#302d28',
  onSurface: '#ece4d4',
  onSurfaceVariant: '#a89e8a',
  primary: '#c9a84c',
  primaryContainer: '#8a7432',
  primaryDim: '#b5953e',
  onPrimary: '#1a1508',
  outline: '#6e6450',
  outlineVariant: '#3d372c',
  secondary: '#9a8c6e',
  error: '#e05a40',
  errorContainer: '#3d1c14',
  onErrorContainer: '#ffdad4',
};

export const THEME_COLORS: Record<ThemeKey, ThemeColors> = {
  silver: SILVER_COLORS,
  gold: GOLD_COLORS,
};

export const THEMES: { key: ThemeKey; label: string; preview: { bg: string; accent: string } }[] = [
  { key: 'silver', label: 'Silver', preview: { bg: '#fafafa', accent: '#9e9e9e' } },
  { key: 'gold', label: 'Gold', preview: { bg: '#151310', accent: '#c9a84c' } },
];

export const FONTS: { key: FontKey; label: string; family: string }[] = [
  { key: 'inter', label: 'Inter', family: 'Inter_400Regular' },
  { key: 'playfair', label: 'Playfair Display', family: 'PlayfairDisplay_400Regular' },
  { key: 'cormorant', label: 'Cormorant Garamond', family: 'CormorantGaramond_400Regular' },
];

export const FONT_FAMILIES: Record<FontKey, { regular: string; medium: string; bold: string }> = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    bold: 'Inter_700Bold',
  },
  playfair: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    bold: 'PlayfairDisplay_700Bold',
  },
  cormorant: {
    regular: 'CormorantGaramond_400Regular',
    medium: 'CormorantGaramond_500Medium',
    bold: 'CormorantGaramond_700Bold',
  },
};

interface ThemeState {
  themeKey: ThemeKey;
  fontKey: FontKey;
  setTheme: (key: ThemeKey) => void;
  setFont: (key: FontKey) => void;
  loadSettings: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeKey: 'silver',
  fontKey: 'inter',

  loadSettings: () => {
    const savedTheme = getSetting('theme') as ThemeKey | null;
    const savedFont = getSetting('font') as FontKey | null;
    if (savedTheme && (savedTheme === 'silver' || savedTheme === 'gold')) {
      set({ themeKey: savedTheme });
    }
    if (
      savedFont &&
      (savedFont === 'inter' || savedFont === 'playfair' || savedFont === 'cormorant')
    ) {
      set({ fontKey: savedFont });
    }
  },

  setTheme: (key) => {
    set({ themeKey: key });
    setSetting('theme', key);
  },

  setFont: (key) => {
    set({ fontKey: key });
    setSetting('font', key);
  },
}));
