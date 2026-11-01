import { create } from 'zustand';
import { getCalendars, saveCalendar, removeCalendar, type Calendar } from '@/db/calendars';
export const useCalendarsStore = create<{
  calendars: Calendar[];
  selected: string | null;
  revision: number;
  load: () => Promise<void>;
  select: (id: string | null) => void;
  save: (name: string, color: string, id?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}>((set, get) => ({
  calendars: [],
  selected: null,
  revision: 0,
  load: async () => {
    const calendars = await getCalendars();
    set((s) => ({ calendars, revision: s.revision + 1 }));
  },
  select: (selected) => set({ selected }),
  save: async (name, color, id) => {
    const now = new Date().toISOString();
    await saveCalendar({
      id: id || Date.now().toString(36) + Math.random().toString(36).slice(2),
      name,
      color,
      created_at: get().calendars.find((c) => c.id === id)?.created_at || now,
      updated_at: now,
    });
    await get().load();
  },
  remove: async (id) => {
    await removeCalendar(id);
    if (get().selected === id) set({ selected: null });
    await get().load();
  },
}));
