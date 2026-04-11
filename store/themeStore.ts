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
  surface: '#F8F9FA',
  surfaceDim: '#E9ECEF',
  surfaceContainer: '#FFFFFF',
  surfaceContainerLow: '#F1F3F5',
  surfaceContainerHigh: '#DEE2E6',
  surfaceContainerHighest: '#CED4DA',
  onSurface: '#1A1C1E',
  onSurfaceVariant: '#44474E',
  primary: '#5D5E61',
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
  surface: '#141311',
  surfaceDim: '#0F0E0D',
  surfaceContainer: '#1F1D1A',
  surfaceContainerLow: '#1A1816',
  surfaceContainerHigh: '#2A2723',
  surfaceContainerHighest: '#35322E',
  onSurface: '#E6E1D9',
  onSurfaceVariant: '#CDC6B4',
  primary: '#D4AF37',
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
  debugMode: boolean;
  zenMode: boolean;
  isLoading: boolean;
  setTheme: (key: ThemeKey) => Promise<void>;
  setFont: (key: FontKey) => Promise<void>;
  setDebugMode: (v: boolean) => Promise<void>;
  setZenMode: (v: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeKey: 'silver',
  fontKey: 'inter',
  debugMode: false,
  zenMode: false,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const savedTheme = await getSetting('theme');
      const savedFont = await getSetting('font');
      const savedPlus = await getSetting('debugMode');
      const savedZen = await getSetting('zenMode');

      const updates: Partial<ThemeState> = { isLoading: false };

      if (savedTheme && (savedTheme === 'silver' || savedTheme === 'gold')) {
        updates.themeKey = savedTheme as ThemeKey;
      }
      if (
        savedFont &&
        (savedFont === 'inter' || savedFont === 'playfair' || savedFont === 'cormorant')
      ) {
        updates.fontKey = savedFont as FontKey;
      }
      if (savedPlus === 'true') updates.debugMode = true;
      if (savedZen === 'true') updates.zenMode = true;

      set(updates);
    } catch (error) {
      console.error('Failed to load theme settings:', error);
      set({ isLoading: false });
    }
  },

  setTheme: async (key) => {
    set({ themeKey: key });
    try {
      await setSetting('theme', key);
    } catch (error) {
      console.error('Failed to save theme setting:', error);
    }
  },

  setFont: async (key) => {
    set({ fontKey: key });
    try {
      await setSetting('font', key);
    } catch (error) {
      console.error('Failed to save font setting:', error);
    }
  },

  setDebugMode: async (v) => {
    set({ debugMode: v });
    try {
      await setSetting('debugMode', v ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to save plus setting:', error);
    }
  },

  setZenMode: async (v) => {
    set({ zenMode: v });
    try {
      await setSetting('zenMode', v ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to save zen mode setting:', error);
    }
  },
}));
