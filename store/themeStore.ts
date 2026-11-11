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

// Palettes are quiet on purpose: close surface steps, hairline outlines that recede, softer ink,
// and one muted accent per theme that marks only the current or primary thing on a screen.
// Text pairs are checked for 4.5:1 (body) against every surface they sit on.

// "Paper": warm light paper with a deep ink-green accent. Key stays `silver` for saved settings.
const SILVER_COLORS: ThemeColors = {
  surface: '#f7f5f0',
  surfaceDim: '#f1eee8',
  surfaceContainer: '#ebe7df',
  surfaceContainerLow: '#f0ede6',
  surfaceContainerHigh: '#e3dfd5',
  surfaceContainerHighest: '#d8d3c8',
  onSurface: '#1d1c19',
  onSurfaceVariant: '#5c574e',
  primary: '#2e5a4c',
  primaryContainer: '#d8e5de',
  primaryDim: '#1f4237',
  onPrimary: '#f7f5f0',
  outline: '#6b655a',
  outlineVariant: '#e2ded5',
  secondary: '#6b4f7a',
  error: '#b3261e',
  errorContainer: '#f6dcd7',
  onErrorContainer: '#410e0b',
};

// Deep umber with soft brass.
const GOLD_COLORS: ThemeColors = {
  surface: '#14120f',
  surfaceDim: '#110f0d',
  surfaceContainer: '#1d1a16',
  surfaceContainerLow: '#181613',
  surfaceContainerHigh: '#26231e',
  surfaceContainerHighest: '#302c26',
  onSurface: '#ece4d4',
  onSurfaceVariant: '#a89f8e',
  primary: '#d2b26e',
  primaryContainer: '#3a2f17',
  primaryDim: '#e6cd93',
  onPrimary: '#2a2108',
  outline: '#938a7a',
  outlineVariant: '#2a2621',
  secondary: '#c9b79a',
  error: '#eba69a',
  errorContainer: '#3e231e',
  onErrorContainer: '#f5cbc2',
};

// Warm charcoal with muted moss.
const QUEST_COLORS: ThemeColors = {
  surface: '#121110',
  surfaceDim: '#0f0e0d',
  surfaceContainer: '#1b1a17',
  surfaceContainerLow: '#161513',
  surfaceContainerHigh: '#23221e',
  surfaceContainerHighest: '#2d2b26',
  onSurface: '#ede8de',
  onSurfaceVariant: '#a39d92',
  primary: '#a8c27c',
  primaryContainer: '#26301b',
  primaryDim: '#c3d6a0',
  onPrimary: '#151c0b',
  outline: '#8e887c',
  outlineVariant: '#26241f',
  secondary: '#b9a2cc',
  error: '#e8a598',
  errorContainer: '#3b221e',
  onErrorContainer: '#f5cbc2',
};
export const THEME_COLORS: Record<ThemeKey, ThemeColors> = {
  quest: QUEST_COLORS,
  silver: SILVER_COLORS,
  gold: GOLD_COLORS,
};

export const THEMES: { key: ThemeKey; label: string; preview: { bg: string; accent: string } }[] = [
  {
    key: 'quest',
    label: 'Moss',
    preview: { bg: QUEST_COLORS.surface, accent: QUEST_COLORS.primary },
  },
  {
    key: 'silver',
    label: 'Paper',
    preview: { bg: SILVER_COLORS.surface, accent: SILVER_COLORS.primary },
  },
  {
    key: 'gold',
    label: 'Brass',
    preview: { bg: GOLD_COLORS.surface, accent: GOLD_COLORS.primary },
  },
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
