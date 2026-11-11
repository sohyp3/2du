import { test, expect } from 'bun:test';
import { isRtlText } from '../shared/textDirection';

test('isRtlText follows the first letter with a strong direction', () => {
  expect(isRtlText('صباح الخير! الأربعاء')).toBe(true);
  expect(isRtlText('2026-11-11, صباح الخير')).toBe(true);
  expect(isRtlText('# اليوم\n- 05:00 Duolingo lesson')).toBe(true);
  expect(isRtlText('Good morning, صباح الخير')).toBe(false);
  expect(isRtlText('## Today\n- 05:00 Duolingo')).toBe(false);
  expect(isRtlText('12:00 — 13:00')).toBe(false);
  expect(isRtlText(null)).toBe(false);
});
