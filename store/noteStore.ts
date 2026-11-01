import { create } from 'zustand';
import {
  Note,
  getAllNotes,
  insertNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
} from '@/db/notes';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface NoteState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;

  loadNotes: () => Promise<void>;
  addNote: (title: string, content?: string) => Promise<string>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,

  loadNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const notes = await getAllNotes();
      set({ notes, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to load notes', isLoading: false });
      console.error('Failed to load notes:', error);
    }
  },

  addNote: async (title, content = '') => {
    const now = new Date().toISOString();
    const note: Note = {
      id: generateId(),
      title,
      content,
      pinned: false,
      created_at: now,
      updated_at: now,
    };
    try {
      await insertNote(note);
      set({ notes: [note, ...get().notes] });
      return note.id;
    } catch (error) {
      set({ error: 'Failed to add note' });
      throw error;
    }
  },

  updateNote: async (id, updates) => {
    set({ error: null });
    try {
      await dbUpdateNote(id, updates);
      set({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
        ),
      });
    } catch (error) {
      set({ error: 'Failed to update note' });
      console.error('Failed to update note:', error);
    }
  },

  deleteNote: async (id) => {
    set({ error: null });
    try {
      await dbDeleteNote(id);
      set({ notes: get().notes.filter((n) => n.id !== id) });
    } catch (error) {
      set({ error: 'Failed to delete note' });
      console.error('Failed to delete note:', error);
    }
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const pinned = !note.pinned;
    try {
      await dbUpdateNote(id, { pinned });
      const updated = get().notes.map((n) => (n.id === id ? { ...n, pinned } : n));
      updated.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updated_at.localeCompare(a.updated_at);
      });
      set({ notes: updated });
    } catch (error) {
      set({ error: 'Failed to pin note' });
      console.error('Failed to toggle pin:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
