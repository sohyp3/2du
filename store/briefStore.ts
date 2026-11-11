import { create } from 'zustand';
import { getRecentBriefs, type Brief } from '@/db/briefs';
import { localDateKey } from '@/shared/localDate';
import { reuseUnchanged } from '@/utils/reuse';

export const useBriefStore = create<{
  today: Brief | null;
  recent: Brief[];
  load: () => Promise<void>;
}>((set) => ({
  today: null,
  recent: [],
  load: async () => {
    const recent = await getRecentBriefs();
    const key = localDateKey(new Date());
    set((s) => {
      const next = reuseUnchanged(s.recent, recent);
      return { recent: next, today: next.find((b) => b.date === key) ?? null };
    });
  },
}));
