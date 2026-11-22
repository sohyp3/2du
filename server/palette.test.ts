import { test, expect, mock } from 'bun:test';
import { contrast, contrastText, mix, SWATCHES } from '../utils/palette';

// The theme store saves settings through SQLite; the palette only needs the pure parts.
const settings = new Map<string, string>();
mock.module('@/db/database', () => ({
  getSetting: async (key: string) => settings.get(key) ?? null,
  setSetting: async (key: string, value: string) => void settings.set(key, value),
}));
const { ACCENTS, buildColors, NOTE_PAPERS, useThemeStore } = await import('../store/themeStore');

test('old named themes migrate to a mode', async () => {
  for (const [legacy, mode] of [
    ['quest', 'dark'],
    ['gold', 'dark'],
    ['silver', 'light'],
  ]) {
    settings.clear();
    settings.set('theme', legacy);
    useThemeStore.setState({ mode: 'system' });
    await useThemeStore.getState().loadSettings();
    expect(useThemeStore.getState().mode).toBe(mode as 'light' | 'dark');
    expect(settings.get('theme_mode')).toBe(mode);
  }
});

const SURFACES = [
  'surface',
  'surfaceDim',
  'surfaceContainer',
  'surfaceContainerLow',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'primaryContainer',
  'accentSoft',
] as const;

test('contrast matches WCAG reference values', () => {
  expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  expect(contrastText('#FFFFFF')).toBe('#1A1530');
  expect(contrastText('#000000')).toBe('#FFFFFF');
  expect(SWATCHES).toHaveLength(10);
});

for (const scheme of ['light', 'dark'] as const) {
  for (const { key } of ACCENTS) {
    test(`${scheme} ${key} text reaches 4.5:1`, () => {
      const c = buildColors(scheme, key);
      for (const s of SURFACES) {
        expect(contrast(c.onSurface, c[s])).toBeGreaterThanOrEqual(4.5);
        expect(contrast(c.onSurfaceVariant, c[s])).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.onErrorContainer, c.errorContainer)).toBeGreaterThanOrEqual(4.5);
    });
  }

  test(`${scheme} note papers keep their text readable`, () => {
    for (const p of NOTE_PAPERS[scheme]) {
      expect(contrast(p.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
}
