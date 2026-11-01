import { expect, test } from 'bun:test';
import { databaseStartupMessage } from './initializationError';

test('explains the browser storage lock without suggesting data deletion', () => {
  const error = new Error("Failed to execute 'createSyncAccessHandle': The file is locked");
  expect(databaseStartupMessage(error)).toContain('another 2du tab');
  expect(databaseStartupMessage(error)).toContain('saved data');
});

test('preserves unexpected startup details for diagnosis', () => {
  expect(databaseStartupMessage(new Error('no such column: calendar_id'))).toContain(
    'no such column: calendar_id'
  );
});
