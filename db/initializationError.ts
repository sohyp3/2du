/** Matches errors thrown while another page/worker still holds the web SQLite file. */
export const DATABASE_LOCKED =
  /NoModificationAllowedError|createSyncAccessHandle|access handle|modifications.*not allowed|Invalid VFS state/i;

export function databaseStartupMessage(error: unknown): string {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (DATABASE_LOCKED.test(detail))
    return 'Your local database is open in another 2du tab or window. Close the other tabs, then retry. Your saved data is still on this device.';
  return `Could not open your local database. ${detail}`;
}
