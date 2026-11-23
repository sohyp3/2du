import { test, expect } from 'bun:test';
import { feedUrls } from '../shared/feedUrl';

test('feedUrls builds the https, webcal and Google links', () => {
  const u = feedUrls('https://2du.hyp3.cafe', 'abc123');
  expect(u.https).toBe('https://2du.hyp3.cafe/feed/abc123.ics');
  expect(u.webcal).toBe('webcal://2du.hyp3.cafe/feed/abc123.ics');
  expect(u.google).toBe(
    'https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2F2du.hyp3.cafe%2Ffeed%2Fabc123.ics'
  );
});

test('feedUrls works with a local http server', () => {
  const u = feedUrls('http://localhost:3000', 'k');
  expect(u.https).toBe('http://localhost:3000/feed/k.ics');
  expect(u.webcal).toBe('webcal://localhost:3000/feed/k.ics');
  expect(u.google).toBe(
    `https://calendar.google.com/calendar/r?cid=${encodeURIComponent('webcal://localhost:3000/feed/k.ics')}`
  );
});

test('feedUrls ignores a trailing slash on the server', () => {
  expect(feedUrls('https://x.test/', 'k').https).toBe('https://x.test/feed/k.ics');
});
