import { expect, test } from 'bun:test';
import { friendlyAuthError } from '../shared/authError';

test('sign-in failures read as friendly text', () => {
  expect(friendlyAuthError({ message: 'x', network: true })).toBe(
    "Couldn't reach the server. Check your connection or the server address."
  );
  expect(friendlyAuthError({ message: 'Username taken', status: 409 })).toBe(
    'That username is taken'
  );
  expect(
    friendlyAuthError({ message: 'Registration is disabled on this server', status: 403 })
  ).toBe("This server doesn't allow new accounts");
  expect(friendlyAuthError({ message: 'This server is full', status: 403 })).toBe(
    'This server is full'
  );
  const limited = 'Too many sign-ups from this network. Try again later.';
  expect(friendlyAuthError({ message: limited, status: 429 })).toBe(limited);
});
