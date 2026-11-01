import * as SQLite from 'expo-sqlite';
import { entities, fields } from '../shared/records';
import { Platform } from 'react-native';
import { databaseStartupMessage } from './initializationError';

export let db: SQLite.SQLiteDatabase;

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
    if (Platform.OS === 'web') {
      if (!window.isSecureContext)
        throw new Error('Open 2du over HTTPS or localhost so this browser can save your data.');
      if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined')
        throw new Error(
          'The web host is missing the isolation headers needed for local storage. Use the bundled web server or configure COOP: same-origin and COEP: require-corp.'
        );
      if (!navigator.storage?.getDirectory)
        throw new Error(
          'This browser does not support local file storage. Try a current Chrome, Edge, Firefox, or Safari browser with storage enabled.'
        );
    }
    db ??= await SQLite.openDatabaseAsync('2du.db');
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
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

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
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(todos)');
    if (!columns.some((c) => c.name === 'calendar_id'))
      await db.execAsync("ALTER TABLE todos ADD COLUMN calendar_id TEXT NOT NULL DEFAULT 'daily'");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS calendars (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sync_outbox (entity TEXT, id TEXT, data TEXT, updated_at TEXT, PRIMARY KEY(entity,id));
      CREATE TABLE IF NOT EXISTS sync_control (id INTEGER PRIMARY KEY, applying INTEGER NOT NULL DEFAULT 0);
      INSERT OR IGNORE INTO sync_control VALUES(1,0);
      UPDATE sync_control SET applying=0 WHERE id=1;
    `);
    for (const entity of entities) {
      const json = fields[entity].map((f) => `'${f}',NEW.${f}`).join(',');
      for (const event of ['INSERT', 'UPDATE'])
        await db.execAsync(`
        CREATE TRIGGER IF NOT EXISTS sync_${entity}_${event} AFTER ${event} ON ${entity}
        WHEN (SELECT applying FROM sync_control WHERE id=1)=0 BEGIN
          INSERT OR REPLACE INTO sync_outbox VALUES('${entity}',NEW.id,json_object(${json}),NEW.updated_at);
        END;
      `);
      await db.execAsync(`CREATE TRIGGER IF NOT EXISTS sync_${entity}_DELETE AFTER DELETE ON ${entity}
        WHEN (SELECT applying FROM sync_control WHERE id=1)=0 BEGIN
          INSERT OR REPLACE INTO sync_outbox VALUES('${entity}',OLD.id,NULL,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
        END;`);
    }
    if (!(await getSetting('sync_bootstrapped'))) {
      const now = '1970-01-01T00:00:00.000Z';
      await db.runAsync(
        "INSERT OR IGNORE INTO calendars VALUES('daily','Daily tasks','#a7c968',?,?)",
        now,
        now
      );
      await db.runAsync(
        "INSERT OR IGNORE INTO calendars VALUES('work','Work','#bb8ed6',?,?)",
        now,
        now
      );
      for (const entity of entities) {
        const json = fields[entity].map((f) => `'${f}',${f}`).join(',');
        await db.execAsync(
          `INSERT OR IGNORE INTO sync_outbox SELECT '${entity}',id,json_object(${json}),updated_at FROM ${entity}`
        );
      }
      await setSetting('sync_bootstrapped', 'true');
    }
  } catch (error) {
    throw new DatabaseError(
      databaseStartupMessage(error),
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

// Serialize local writes with remote merges so trigger suppression never hides a user edit.
let writeQueue: Promise<unknown> = Promise.resolve();
export function withDatabaseWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}
