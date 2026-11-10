import { create } from 'zustand';
import { getGoals, saveGoal, removeGoal, type Goal, type GoalStatus } from '@/db/goals';
import { reuseUnchanged } from '@/utils/reuse';
import { useTodoStore } from './todoStore';

export const useGoalStore = create<{
  goals: Goal[];
  load: () => Promise<void>;
  save: (input: {
    id?: string;
    name: string;
    description?: string | null;
    importance: number;
    weekly_target: number | null;
    status?: GoalStatus;
  }) => Promise<void>;
  remove: (id: string) => Promise<void>;
}>((set, get) => ({
  goals: [],
  load: async () => {
    const goals = await getGoals();
    set((s) => ({ goals: reuseUnchanged(s.goals, goals) }));
  },
  save: async (input) => {
    const now = new Date().toISOString();
    const existing = input.id ? get().goals.find((g) => g.id === input.id) : undefined;
    await saveGoal({
      id: input.id || Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: input.name,
      description: input.description?.trim() || null,
      importance: input.importance,
      weekly_target: input.weekly_target,
      status: input.status ?? existing?.status ?? 'active',
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
    await get().load();
  },
  remove: async (id) => {
    await removeGoal(id);
    await get().load();
    // Removing a goal unlinks its tasks, so the open task list must reload too.
    await useTodoStore.getState().loadTodos();
  },
}));
