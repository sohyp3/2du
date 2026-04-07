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
  surface: '#F8F9FA', // Brighter, cleaner base
  surfaceDim: '#E9ECEF',
  surfaceContainer: '#FFFFFF', // Elevated elements
  surfaceContainerLow: '#F1F3F5',
  surfaceContainerHigh: '#DEE2E6',
  surfaceContainerHighest: '#CED4DA',
  onSurface: '#1A1C1E', // High contrast text
  onSurfaceVariant: '#44474E', // Secondary text
  primary: '#5D5E61', // Sophisticated Silver-Grey
  primaryContainer: '#E1E2E5',
  primaryDim: '#2E3133',
  onPrimary: '#FFFFFF',
  outline: '#74777F',
  outlineVariant: '#C4C7CF',
  secondary: '#585E66',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
};

const GOLD_COLORS: ThemeColors = {
  surface: '#141311', // Deep charcoal-gold
  surfaceDim: '#0F0E0D',
  surfaceContainer: '#1F1D1A', // Elevated cards
  surfaceContainerLow: '#1A1816',
  surfaceContainerHigh: '#2A2723',
  surfaceContainerHighest: '#35322E',
  onSurface: '#E6E1D9', // Soft cream (easier on eyes than pure white)
  onSurfaceVariant: '#CDC6B4', // Muted gold-grey for secondary text
  primary: '#D4AF37', // Refined Metallic Gold
  primaryContainer: '#4F4218',
  primaryDim: '#EFCB68',
  onPrimary: '#3A2E00',
  outline: '#979080',
  outlineVariant: '#4B4639',
  secondary: '#D0C6B0',
  error: '#FFB4AB',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
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
  isPlus: boolean;
  zenMode: boolean;
  setTheme: (key: ThemeKey) => void;
  setFont: (key: FontKey) => void;
  setIsPlus: (v: boolean) => void;
  setZenMode: (v: boolean) => void;
  loadSettings: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeKey: 'silver',
  fontKey: 'inter',
  isPlus: false,
  zenMode: false,

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
    const savedPlus = getSetting('isPlus');
    if (savedPlus === 'true') set({ isPlus: true });
    const savedZen = getSetting('zenMode');
    if (savedZen === 'true') set({ zenMode: true });
  },

  setTheme: (key) => {
    set({ themeKey: key });
    setSetting('theme', key);
  },

  setFont: (key) => {
    set({ fontKey: key });
    setSetting('font', key);
  },

  setIsPlus: (v) => {
    set({ isPlus: v });
    setSetting('isPlus', v ? 'true' : 'false');
  },

  setZenMode: (v) => {
    set({ zenMode: v });
    setSetting('zenMode', v ? 'true' : 'false');
  },
}));
