// Pure colour helpers and the shared swatch palette. No React Native imports, so `bun test` can
// load this module.

/** Saturated colours for calendars and goal categories. */
export const SWATCHES = [
  '#6C4DFF',
  '#FF5A3C',
  '#FFB020',
  '#3FBF6F',
  '#1FA2FF',
  '#FF4FA3',
  '#00B8A9',
  '#8E5CF7',
  '#F2683C',
  '#7BC83A',
] as const;

/** The dark ink used on light fills. Matches the light theme's `onSurface`. */
export const DARK_INK = '#1A1530';

function parse(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((ch) => ch + ch).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: number[]): string {
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
      .toUpperCase()
  );
}

/** Mix `a` toward `b` by `t` (0 gives `a`, 1 gives `b`). */
export function mix(a: string, b: string, t: number): string {
  const x = parse(a),
    y = parse(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The text colour that reads best on `hex`. */
export function contrastText(hex: string): typeof DARK_INK | '#FFFFFF' {
  return contrast(hex, '#FFFFFF') >= contrast(hex, DARK_INK) ? '#FFFFFF' : DARK_INK;
}
