import { create } from 'zustand';
import {
  Todo,
  Priority,
  StatusFilter,
  insertTodo,
  getTodosByDateRange,
  getTodoById,
  updateTodo,
  deleteTodo,
} from '@/db/todos';
import { FilterPeriod, getDateRange, shiftDate } from '@/utils/dates';
import {
  scheduleTodoReminders,
  cancelTodoReminders,
  snoozeTodoReminder,
} from '@/utils/notifications';
import { DatabaseError, getSetting, setSetting } from '@/db/database';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export interface AddTodoParams {
  name: string;
  description?: string | null;
  priority?: Priority;
  datetime?: string;
  time_needed?: number | null;
  remind_me?: boolean;
  parent_id?: string | null;
}

interface TodoState {
  todos: Todo[];
  period: FilterPeriod;
  referenceDate: Date;
  statusFilter: StatusFilter;
  isLoading: boolean;
  error: string | null;

  loadTodos: () => Promise<void>;
  addTodo: (params: AddTodoParams) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  snoozeTodo: (id: string, minutes: number) => Promise<void>;
  setPeriod: (period: FilterPeriod) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  navigatePeriod: (direction: 'prev' | 'next') => Promise<void>;
  goToToday: () => Promise<void>;
  loadSettings: () => Promise<void>;
  clearError: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  period: 'day',
  referenceDate: new Date(),
  statusFilter: 'all',
  isLoading: false,
  error: null,

  loadTodos: async () => {
    set({ isLoading: true, error: null });
    try {
      const { period, referenceDate, statusFilter } = get();
      const { start, end } = getDateRange(period, referenceDate);
      const todos = await getTodosByDateRange(start.toISOString(), end.toISOString(), statusFilter);
      set({ todos, isLoading: false });
    } catch (error) {
      const message = error instanceof DatabaseError ? error.message : 'Failed to load todos';
      set({ error: message, isLoading: false });
      console.error('Error loading todos:', error);
    }
  },

  addTodo: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date().toISOString();
      const todo: Todo = {
        id: generateId(),
        name: params.name,
        description: params.description ?? null,
        time_needed: params.time_needed ?? null,
        priority: params.priority ?? 'moderate',
        datetime: params.datetime ?? now,
        status: 'pending',
        parent_id: params.parent_id ?? null,
        remind_me: params.remind_me ?? true,
        created_at: now,
        updated_at: now,
      };
      await insertTodo(todo);
      await scheduleTodoReminders(todo);
      await get().loadTodos();
    } catch (error) {
      const message = error instanceof DatabaseError ? error.message : 'Failed to add todo';
      set({ error: message, isLoading: false });
      console.error('Error adding todo:', error);
    }
  },

  toggleComplete: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const todo = get().todos.find((t) => t.id === id);
      if (!todo) return;
      const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
      await updateTodo(id, { status: newStatus });

      if (newStatus === 'completed') {
        await cancelTodoReminders(id);
      } else {
        // Re-schedule reminders when uncompleting
        const refreshed = await getTodoById(id);
        if (refreshed) await scheduleTodoReminders(refreshed);
      }

      await get().loadTodos();
    } catch (error) {
      const message = error instanceof DatabaseError ? error.message : 'Failed to update todo';
      set({ error: message, isLoading: false });
      console.error('Error toggling complete:', error);
    }
  },

  updateTodo: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await updateTodo(id, updates);

      // Reschedule if remind_me or datetime changed
      if (updates.remind_me !== undefined || updates.datetime !== undefined) {
        await cancelTodoReminders(id);
        const refreshed = await getTodoById(id);
        if (refreshed && refreshed.remind_me) await scheduleTodoReminders(refreshed);
      }

      await get().loadTodos();
    } catch (error) {
      const message = error instanceof DatabaseError ? error.message : 'Failed to update todo';
      set({ error: message, isLoading: false });
      console.error('Error updating todo:', error);
    }
  },

  deleteTodo: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await cancelTodoReminders(id);
      await deleteTodo(id);
      await get().loadTodos();
    } catch (error) {
      const message = error instanceof DatabaseError ? error.message : 'Failed to delete todo';
      set({ error: message, isLoading: false });
      console.error('Error deleting todo:', error);
    }
  },

  snoozeTodo: async (id, minutes) => {
    try {
      const todo = get().todos.find((t) => t.id === id) ?? (await getTodoById(id));
      if (todo) await snoozeTodoReminder(todo, minutes);
    } catch (error) {
      console.error('Error snoozing todo:', error);
    }
  },

  setPeriod: (period) => {
    set({ period, error: null });
    get().loadTodos();
  },

  setStatusFilter: (statusFilter) => {
    set({ statusFilter, error: null });
    setSetting('statusFilter', statusFilter).catch(() => {});
    get().loadTodos();
  },

  navigatePeriod: async (direction) => {
    const { period, referenceDate } = get();
    set({ referenceDate: shiftDate(period, referenceDate, direction), error: null });
    await get().loadTodos();
  },

  goToToday: async () => {
    set({ referenceDate: new Date(), error: null });
    await get().loadTodos();
  },

  loadSettings: async () => {
    try {
      const savedFilter = await getSetting('statusFilter');
      if (savedFilter && ['active', 'completed', 'all'].includes(savedFilter)) {
        set({ statusFilter: savedFilter as StatusFilter });
      }
    } catch {}
  },

  clearError: () => set({ error: null }),
}));
