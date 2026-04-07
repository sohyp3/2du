import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('2du.db');

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export async function initDatabase(): Promise<void> {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        time_needed INTEGER,
        priority TEXT NOT NULL DEFAULT 'medium',
        datetime TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        parent_id TEXT,
        remind_me INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES todos(id)
      );
    `);

    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_todos_datetime ON todos(datetime);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);`);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Create calendar settings table for persistence
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS calendar_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  } catch (error) {
    throw new DatabaseError(
      'Failed to initialize database',
      'initDatabase',
      error instanceof Error ? error : undefined
    );
  }
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  } catch (error) {
    console.error(`Failed to get setting '${key}':`, error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  } catch (error) {
    throw new DatabaseError(
      `Failed to set setting '${key}'`,
      'setSetting',
      error instanceof Error ? error : undefined
    );
  }
}

// Calendar settings helpers for persistence
export async function getCalendarSetting(key: string): Promise<string | null> {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM calendar_settings WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  } catch (error) {
    console.error(`Failed to get calendar setting '${key}':`, error);
    return null;
  }
}

export async function setCalendarSetting(key: string, value: string): Promise<void> {
  try {
    await db.runAsync('INSERT OR REPLACE INTO calendar_settings (key, value) VALUES (?, ?)', [
      key,
      value,
    ]);
  } catch (error) {
    console.error(`Failed to set calendar setting '${key}':`, error);
  }
}
