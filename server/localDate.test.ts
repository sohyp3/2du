import { test, expect } from 'bun:test';
import { localDateKey } from '../shared/localDate';

test('localDateKey uses the local date around midnight', () => {
  expect(localDateKey(new Date(2026, 10, 9, 23, 59, 59))).toBe('2026-11-09');
  expect(localDateKey(new Date(2026, 10, 10, 0, 0, 1))).toBe('2026-11-10');
});
