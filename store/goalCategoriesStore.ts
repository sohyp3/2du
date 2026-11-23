import { create } from 'zustand';
import {
  getCategories,
  saveCategory,
  deleteCategory,
  type GoalCategory,
} from '@/db/goalCategories';
import { reuseUnchanged } from '@/utils/reuse';
import { useGoalStore } from './goalStore';

export const useGoalCategoriesStore = create<{
  categories: GoalCategory[];
  load: () => Promise<void>;
  save: (name: string, color: string, id?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}>((set, get) => ({
  categories: [],
  load: async () => {
    const categories = await getCategories();
    set((s) => ({ categories: reuseUnchanged(s.categories, categories) }));
  },
  save: async (name, color, id) => {
    const now = new Date().toISOString();
    await saveCategory({
      id: id || Date.now().toString(36) + Math.random().toString(36).slice(2),
      name,
      color,
      created_at: get().categories.find((c) => c.id === id)?.created_at || now,
      updated_at: now,
    });
    await get().load();
  },
  remove: async (id) => {
    await deleteCategory(id);
    await get().load();
    // Removing a category unlinks its goals, so the goal list must reload too.
    await useGoalStore.getState().load();
  },
}));
