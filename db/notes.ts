import { db, DatabaseError, withDatabaseWrite } from './database';

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  pinned: number;
  created_at: string;
  updated_at: string;
}

function rowToNote(row: NoteRow): Note {
  return { ...row, pinned: row.pinned === 1 };
}

export async function getAllNotes(): Promise<Note[]> {
  try {
    const rows = await db.getAllAsync<NoteRow>(
      'SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC'
    );
    return rows.map(rowToNote);
  } catch (error) {
    throw new DatabaseError(
      'Failed to fetch notes',
      'getAllNotes',
      error instanceof Error ? error : undefined
    );
  }
}

export async function getNoteById(id: string): Promise<Note | null> {
  try {
    const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
    return row ? rowToNote(row) : null;
  } catch (error) {
    throw new DatabaseError(
      'Failed to fetch note',
      'getNoteById',
      error instanceof Error ? error : undefined
    );
  }
}

async function insertNoteLocal(note: Note): Promise<void> {
  try {
    await db.runAsync(
      'INSERT INTO notes (id, title, content, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [note.id, note.title, note.content, note.pinned ? 1 : 0, note.created_at, note.updated_at]
    );
  } catch (error) {
    throw new DatabaseError(
      'Failed to insert note',
      'insertNote',
      error instanceof Error ? error : undefined
    );
  }
}

async function updateNoteLocal(id: string, updates: Partial<Note>): Promise<void> {
  try {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.pinned !== undefined) {
      fields.push('pinned = ?');
      values.push(updates.pinned ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, values);
  } catch (error) {
    throw new DatabaseError(
      'Failed to update note',
      'updateNote',
      error instanceof Error ? error : undefined
    );
  }
}

async function deleteNoteLocal(id: string): Promise<void> {
  try {
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  } catch (error) {
    throw new DatabaseError(
      'Failed to delete note',
      'deleteNote',
      error instanceof Error ? error : undefined
    );
  }
}

export const insertNote: typeof insertNoteLocal = (...args) =>
  withDatabaseWrite(() => insertNoteLocal(...args));

export const updateNote: typeof updateNoteLocal = (...args) =>
  withDatabaseWrite(() => updateNoteLocal(...args));

export const deleteNote: typeof deleteNoteLocal = (...args) =>
  withDatabaseWrite(() => deleteNoteLocal(...args));
