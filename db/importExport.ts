import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { db } from './database';
import { Todo, insertTodo } from './todos';
import { Note, insertNote } from './notes';

export interface ExportData {
  version: 1;
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
      'SELECT key, value FROM settings'
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
      version: 1,
      exportedAt: new Date().toISOString(),
      todos,
      notes,
      settings,
      calendarSettings,
    };

    const fileName = `2du-backup-${new Date().toISOString().split('T')[0]}.json`;
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
  const { overwriteTodos = true, overwriteNotes = true, overwriteSettings = true } = options;

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
    const content = await importFile.text();
    const data = JSON.parse(content) as ExportData;

    if (!data.version || data.version !== 1) {
      throw new Error('Invalid or unsupported backup file version');
    }

    let todosImported = 0;
    let notesImported = 0;

    if (overwriteTodos && data.todos) {
      await db.runAsync('DELETE FROM todos');
      for (const todo of data.todos) {
        await insertTodo(todo);
        todosImported++;
      }
    }

    if (overwriteNotes && data.notes) {
      await db.runAsync('DELETE FROM notes');
      for (const note of data.notes) {
        await insertNote(note);
        notesImported++;
      }
    }

    if (overwriteSettings) {
      if (data.settings) {
        await db.runAsync('DELETE FROM settings');
        for (const [key, value] of Object.entries(data.settings)) {
          await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
            key,
            value,
          ]);
        }
      }
      if (data.calendarSettings) {
        await db.runAsync('DELETE FROM calendar_settings');
        for (const [key, value] of Object.entries(data.calendarSettings)) {
          await db.runAsync('INSERT OR REPLACE INTO calendar_settings (key, value) VALUES (?, ?)', [
            key,
            value,
          ]);
        }
      }
    }

    return { todosImported, notesImported, success: true };
  } catch (error) {
    throw new ImportExportError(
      'Failed to import data',
      'import',
      error instanceof Error ? error : undefined
    );
  }
}
