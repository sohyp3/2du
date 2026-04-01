import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('2du.db');

export function initDatabase() {
  db.execSync(`
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
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_todos_datetime ON todos(datetime);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);`);
}
