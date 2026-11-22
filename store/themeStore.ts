import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/database';
import { contrastText, mix } from '@/utils/palette';

export type Mode = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';
export type AccentKey = 'violet' | 'coral' | 'lime' | 'sky' | 'pink';

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
  /** The accent mixed softly into the surface, for selected chips and highlights. */
  accentSoft: string;
  success: string;
  warning: string;
  /** Tinted shadow colour for raised cards and the tab bar. */
  shadow: string;
}

// Sky and pink are a touch deeper than the brief's #0A84D6 and #E6338A in light mode, so white
// text on them reaches 4.5:1.
export const ACCENTS: { key: AccentKey; label: string; light: string; dark: string }[] = [
  { key: 'violet', label: 'Violet', light: '#6C4DFF', dark: '#9B85FF' },
  { key: 'coral', label: 'Coral', light: '#FF5A3C', dark: '#FF8A70' },
  { key: 'lime', label: 'Lime', light: '#3F9E1A', dark: '#9BE15D' },
  { key: 'sky', label: 'Sky', light: '#0979C5', dark: '#5CC2FF' },
  { key: 'pink', label: 'Pink', light: '#D42F7F', dark: '#FF7DBE' },
];

const BASE: Record<
  Scheme,
  Omit<
    ThemeColors,
    'primary' | 'primaryContainer' | 'primaryDim' | 'onPrimary' | 'secondary' | 'accentSoft'
  >
> = {
  light: {
    surface: '#FFFBF5',
    surfaceDim: '#FFF7EE',
    surfaceContainerLow: '#FFFFFF',
    surfaceContainer: '#FFF4E6',
    surfaceContainerHigh: '#FBE9D7',
    surfaceContainerHighest: '#F4DCC4',
    onSurface: '#1A1530',
    onSurfaceVariant: '#5B5470',
    outline: '#8A8399',
    outlineVariant: '#EDE3D6',
    error: '#C62828',
    errorContainer: '#FFE1DC',
    onErrorContainer: '#5C0B0B',
    success: '#2E8B3E',
    warning: '#B86E00',
    shadow: 'rgba(76, 50, 200, 0.12)',
  },
  dark: {
    surface: '#14112A',
    surfaceDim: '#100E22',
    surfaceContainerLow: '#1A1634',
    surfaceContainer: '#1F1B3D',
    surfaceContainerHigh: '#28234D',
    surfaceContainerHighest: '#332D5E',
    onSurface: '#F5F2FF',
    onSurfaceVariant: '#B4ADD0',
    outline: '#8C84AD',
    outlineVariant: '#2E2856',
    error: '#FF8A80',
    errorContainer: '#4A1F2A',
    onErrorContainer: '#FFD9D4',
    success: '#7EE29A',
    warning: '#FFC266',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
};

export function buildColors(scheme: Scheme, accent: AccentKey): ThemeColors {
  const base = BASE[scheme];
  const i = Math.max(
    0,
    ACCENTS.findIndex((a) => a.key === accent)
  );
  const primary = ACCENTS[i][scheme];
  const soft = mix(base.surface, primary, 0.16);
  return {
    ...base,
    primary,
    primaryContainer: soft,
    accentSoft: soft,
    onPrimary: contrastText(primary),
    primaryDim: mix(primary, scheme === 'light' ? '#000000' : '#FFFFFF', 0.15),
    secondary: ACCENTS[(i + 1) % ACCENTS.length][scheme],
  };
}

export interface NotePaper {
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  outline: string;
}

// Notebook surfaces: butter, mint, lilac, peach. Ink and muted text keep 4.5:1 on each.
export const NOTE_PAPERS: Record<Scheme, NotePaper[]> = {
  light: [
    { surface: '#FFF1B8', ink: '#1A1530', muted: '#5B5040', accent: '#8A6400', outline: '#F2DE8A' },
    { surface: '#D6F5E3', ink: '#1A1530', muted: '#3F5A4C', accent: '#1E7A4A', outline: '#B2E6C8' },
    { surface: '#E9E0FF', ink: '#1A1530', muted: '#55497A', accent: '#5A3FD6', outline: '#D2C4FA' },
    { surface: '#FFE0CC', ink: '#1A1530', muted: '#6A4A3A', accent: '#B8461E', outline: '#F7C6A8' },
  ],
  dark: [
    { surface: '#3A3218', ink: '#FFF6D6', muted: '#D9CC9C', accent: '#FFD95C', outline: '#574B26' },
    { surface: '#16362A', ink: '#E2FFF0', muted: '#A6D9BE', accent: '#6EE7A8', outline: '#24513F' },
    { surface: '#2C2452', ink: '#F1EBFF', muted: '#C4B8EE', accent: '#B9A6FF', outline: '#433874' },
    { surface: '#3C2418', ink: '#FFEDE2', muted: '#E3BFA8', accent: '#FFA37A', outline: '#5A3826' },
  ],
};

const MODES: Mode[] = ['system', 'light', 'dark'];

interface ThemeState {
  mode: Mode;
  accent: AccentKey;
  zenMode: boolean;
  /** Tasks screen shows one card per calendar instead of a flat list. */
  groupByCalendar: boolean;
  showGreeting: boolean;
  isLoading: boolean;
  setMode: (mode: Mode) => Promise<void>;
  setAccent: (accent: AccentKey) => Promise<void>;
  setZenMode: (v: boolean) => Promise<void>;
  setGroupByCalendar: (v: boolean) => Promise<void>;
  setShowGreeting: (v: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  accent: 'violet',
  zenMode: false,
  groupByCalendar: false,
  showGreeting: false,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      let savedMode = await getSetting('theme_mode');
      const savedAccent = await getSetting('theme_accent');
      const savedZen = await getSetting('zenMode');
      const savedGroup = await getSetting('groupByCalendar');
      const savedGreeting = await getSetting('showGreeting');

      // Installs from before modes existed kept one of three named themes.
      if (!savedMode) {
        const legacy = await getSetting('theme');
        const migrated =
          legacy === 'silver' ? 'light' : legacy === 'quest' || legacy === 'gold' ? 'dark' : null;
        if (migrated) {
          savedMode = migrated;
          await setSetting('theme_mode', migrated);
        }
      }

      const updates: Partial<ThemeState> = { isLoading: false };
      if (savedMode && (MODES as string[]).includes(savedMode)) updates.mode = savedMode as Mode;
      if (savedAccent && ACCENTS.some((a) => a.key === savedAccent))
        updates.accent = savedAccent as AccentKey;
      if (savedZen === 'true') updates.zenMode = true;
      if (savedGroup === 'true') updates.groupByCalendar = true;
      if (savedGreeting === 'true') updates.showGreeting = true;

      set(updates);
    } catch (error) {
      console.error('Failed to load theme settings:', error);
      set({ isLoading: false });
    }
  },

  setMode: async (mode) => {
    set({ mode });
    try {
      await setSetting('theme_mode', mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  },

  setAccent: async (accent) => {
    set({ accent });
    try {
      await setSetting('theme_accent', accent);
    } catch (error) {
      console.error('Failed to save accent:', error);
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
