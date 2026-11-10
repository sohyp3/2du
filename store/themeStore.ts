import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/database';

export type ThemeKey = 'quest' | 'silver' | 'gold';
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

const QUEST_COLORS: ThemeColors = {
  surface: '#0d0c0a',
  surfaceDim: '#0b0a09',
  surfaceContainer: '#171613',
  surfaceContainerLow: '#12110f',
  surfaceContainerHigh: '#23211c',
  surfaceContainerHighest: '#302d26',
  onSurface: '#fbf7ef',
  onSurfaceVariant: '#b3aa9a',
  primary: '#a7c968',
  primaryContainer: '#29351d',
  primaryDim: '#c0d895',
  onPrimary: '#17200e',
  outline: '#a39a8b',
  outlineVariant: '#343129',
  secondary: '#bb8ed6',
  error: '#eeaba0',
  errorContainer: '#42241f',
  onErrorContainer: '#f7c7be',
};
export const THEME_COLORS: Record<ThemeKey, ThemeColors> = {
  quest: QUEST_COLORS,
  silver: SILVER_COLORS,
  gold: GOLD_COLORS,
};

export const THEMES: { key: ThemeKey; label: string; preview: { bg: string; accent: string } }[] = [
  { key: 'quest', label: 'Quest', preview: { bg: '#0d0c0a', accent: '#a7c968' } },
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
  /** Tasks screen shows one card per calendar instead of a flat list. */
  groupByCalendar: boolean;
  showGreeting: boolean;
  isLoading: boolean;
  setTheme: (key: ThemeKey) => Promise<void>;
  setFont: (key: FontKey) => Promise<void>;
  setDebugMode: (v: boolean) => Promise<void>;
  setZenMode: (v: boolean) => Promise<void>;
  setGroupByCalendar: (v: boolean) => Promise<void>;
  setShowGreeting: (v: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeKey: 'quest',
  fontKey: 'inter',
  debugMode: false,
  zenMode: false,
  groupByCalendar: false,
  showGreeting: false,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const savedTheme = await getSetting('theme');
      const savedFont = await getSetting('font');
      const savedPlus = await getSetting('debugMode');
      const savedZen = await getSetting('zenMode');
      const savedGroup = await getSetting('groupByCalendar');
      const savedGreeting = await getSetting('showGreeting');

      const updates: Partial<ThemeState> = { isLoading: false };

      if (
        savedTheme &&
        (savedTheme === 'quest' || savedTheme === 'silver' || savedTheme === 'gold')
      ) {
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
      if (savedGroup === 'true') updates.groupByCalendar = true;
      if (savedGreeting === 'true') updates.showGreeting = true;

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

  setGroupByCalendar: async (v) => {
    set({ groupByCalendar: v });
    try {
      await setSetting('groupByCalendar', v ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to save group by calendar setting:', error);
    }
  },

  setShowGreeting: async (v) => {
    set({ showGreeting: v });
    try {
      await setSetting('showGreeting', v ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to save greeting setting:', error);
    }
  },
}));

// Notebook surfaces keep the text and its tint together across themes.
const DARK_NOTE_PAPERS = [
  { surface: '#30291e', ink: '#f9edda', muted: '#c9bda5', accent: '#e6c77e', outline: '#504636' },
  { surface: '#252d23', ink: '#edf2dd', muted: '#b5c2a8', accent: '#b9d68a', outline: '#3d4b36' },
  { surface: '#2d2530', ink: '#f1e5ef', muted: '#c7b1c5', accent: '#dab4dc', outline: '#4c3c50' },
  { surface: '#222c30', ink: '#e2eff2', muted: '#acc2ca', accent: '#a4d5e1', outline: '#3c4d53' },
];
export const NOTE_PAPERS = {
  quest: DARK_NOTE_PAPERS,
  gold: DARK_NOTE_PAPERS,
  silver: [
    { surface: '#f4ead8', ink: '#332b1d', muted: '#685a43', accent: '#786027', outline: '#ddceb3' },
    { surface: '#e7eddf', ink: '#283320', muted: '#526344', accent: '#506b32', outline: '#c8d5bd' },
    { surface: '#eee4ef', ink: '#38273b', muted: '#6e5674', accent: '#795584', outline: '#d8c6dc' },
    { surface: '#e2edf0', ink: '#24343a', muted: '#4f6670', accent: '#396777', outline: '#c0d6de' },
  ],
};
