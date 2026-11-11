import { test, expect } from 'bun:test';
import { defaultLink, linkErrors, slugify } from '../shared/bookingLink';

test('slugify makes a clean link name', () => {
  expect(slugify('  Coffee  Chat! ')).toBe('coffee-chat');
  expect(slugify('a -- b')).toBe('a-b');
  expect(slugify('--x--')).toBe('x');
  expect(slugify('x'.repeat(60))).toHaveLength(40);
});

test('linkErrors reports each problem', () => {
  const ok = { ...defaultLink('UTC', 'daily'), slug: 'coffee' };
  expect(linkErrors(ok)).toEqual([]);
  expect(linkErrors({ ...ok, slug: 'ab' })).toHaveLength(1);
  expect(linkErrors({ ...ok, slug: '-abc' })).toHaveLength(1);
  expect(linkErrors({ ...ok, title: ' ' })).toHaveLength(1);
  expect(linkErrors({ ...ok, days: [] })).toHaveLength(1);
  expect(linkErrors({ ...ok, end: '09:00' })).toHaveLength(1);
});
