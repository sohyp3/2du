import { Platform } from 'react-native';
import { fields, validateChange, type Entity } from '@/shared/records';
import type { Calendar } from './calendars';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { db, withDatabaseWrite } from './database';
import { Todo } from './todos';
import { Note } from './notes';

export interface ExportData {
  version: 1 | 2;
  calendars?: Calendar[];
  exportedAt: string;
  todos: Todo[];
  notes: Note[];
  settings: Record<string, string>;
  calendarSettings: Record<string, string>;
}

export class ImportExportError extends Error {
  constructor(
    message: string,
    public readonly operation: 'export' | 'import',
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ImportExportError';
  }
}

export async function exportData(): Promise<void> {
  try {
    const todos = await db.getAllAsync<Todo>('SELECT * FROM todos');
    const notes = await db.getAllAsync<Note>('SELECT * FROM notes');
    const settingsRows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM settings WHERE key NOT LIKE 'sync_%'"
    );
    const calendarSettingsRows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM calendar_settings'
    );

    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    const calendarSettings: Record<string, string> = {};
    for (const row of calendarSettingsRows) {
      calendarSettings[row.key] = row.value;
    }

    const exportData: ExportData = {
      version: 2,
      calendars: await db.getAllAsync<Calendar>('SELECT * FROM calendars'),
      exportedAt: new Date().toISOString(),
      todos,
      notes,
      settings,
      calendarSettings,
    };

    const fileName = `2du-backup-${new Date().toISOString().split('T')[0]}.json`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const file = new File(Paths.document, fileName);
    await file.write(JSON.stringify(exportData, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export 2du Data',
      });
    }
  } catch (error) {
    throw new ImportExportError(
      'Failed to export data',
      'export',
      error instanceof Error ? error : undefined
    );
  }
}

export async function importData(
  options: {
    overwriteTodos?: boolean;
    overwriteNotes?: boolean;
    overwriteSettings?: boolean;
  } = {}
): Promise<{ todosImported: number; notesImported: number; success: boolean }> {
  const { overwriteTodos = true, overwriteNotes = true } = options;

  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { todosImported: 0, notesImported: 0, success: false };
    }

    const file = result.assets[0];
    if (!file) {
      return { todosImported: 0, notesImported: 0, success: false };
    }

    const importFile = new File(file.uri);
    const content =
      Platform.OS === 'web' ? await (await fetch(file.uri)).text() : await importFile.text();
    const data = JSON.parse(content) as ExportData;

    if (![1, 2].includes(data.version) || !Array.isArray(data.todos) || !Array.isArray(data.notes))
      throw new Error('Invalid or unsupported backup');
    const groups: [Entity, Record<string, unknown>[]][] = [];
    if (overwriteTodos) groups.push(['todos', data.todos as unknown as Record<string, unknown>[]]);
    if (overwriteNotes) groups.push(['notes', data.notes as unknown as Record<string, unknown>[]]);
    if (data.calendars)
      groups.unshift(['calendars', data.calendars as unknown as Record<string, unknown>[]]);
    // Validate the entire file before the first write; imports are additive and sync as local edits.
    for (const [entity, rows] of groups) {
      if (!Array.isArray(rows)) throw new Error('Invalid backup records');
      for (const row of rows) {
        if (entity === 'todos') row.calendar_id ??= 'daily';
        validateChange({ entity, id: row.id, data: row, updated_at: row.updated_at });
      }
    }
    await withDatabaseWrite(() =>
      db.withTransactionAsync(async () => {
        for (const [entity, rows] of groups)
          for (const row of rows) {
            const cols = fields[entity];
            const values = cols.map((k) => {
              const v = k === 'updated_at' ? new Date().toISOString() : row[k];
              return typeof v === 'boolean' ? Number(v) : ((v ?? null) as string | number | null);
            });
            await db.runAsync(
              `INSERT OR REPLACE INTO ${entity} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
              values
            );
          }
      })
    );
    const todosImported = overwriteTodos ? data.todos.length : 0;
    const notesImported = overwriteNotes ? data.notes.length : 0;
    return { todosImported, notesImported, success: true };
  } catch (error) {
    throw new ImportExportError(
      error instanceof Error ? error.message : 'Failed to import data',
      'import',
      error instanceof Error ? error : undefined
    );
  }
}
