import { create } from 'zustand';
import { useCalendarsStore } from './calendarsStore';
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
import { reuseUnchanged } from '@/utils/reuse';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export interface AddTodoParams {
  name: string;
  calendar_id?: string;
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
  /** Resolves false when the change could not be saved (and was reverted). */
  toggleComplete: (id: string) => Promise<boolean>;
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
      set((state) => ({ todos: reuseUnchanged(state.todos, todos), isLoading: false }));
    } catch (error) {
      const message = error instanceof DatabaseError ? error.message : 'Failed to load todos';
      set({ error: message, isLoading: false });
      console.error('Error loading todos:', error);
    }
  },

  addTodo: async (params) => {
    const now = new Date().toISOString();
    const todo: Todo = {
      id: generateId(),
      name: params.name,
      calendar_id: params.calendar_id ?? useCalendarsStore.getState().selected ?? 'daily',
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

    const { period, referenceDate, statusFilter } = get();
    const { start, end } = getDateRange(period, referenceDate);
    const todoDate = new Date(todo.datetime);
    const inRange = todoDate >= start && todoDate <= end;
    const matchesStatus = statusFilter === 'all' || statusFilter === 'active';

    if (inRange && matchesStatus && !todo.parent_id) {
      set((state) => ({
        todos: [...state.todos, todo].sort(
          (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        ),
        error: null,
      }));
    }

    try {
      await insertTodo(todo);
      scheduleTodoReminders(todo).catch((e) => console.error('reminder schedule failed:', e));
    } catch (error) {
      set((state) => ({
        todos: state.todos.filter((t) => t.id !== todo.id),
        error: error instanceof DatabaseError ? error.message : 'Failed to add todo',
      }));
      console.error('Error adding todo:', error);
    }
  },

  toggleComplete: async (id) => {
    const todo = get().todos.find((t) => t.id === id) ?? (await getTodoById(id));
    if (!todo) return false;
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';

    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    }));

    try {
      await updateTodo(id, { status: newStatus });
    } catch (error) {
      set((state) => ({
        todos: state.todos.map((t) => (t.id === id ? { ...t, status: todo.status } : t)),
        error: error instanceof DatabaseError ? error.message : 'Failed to update todo',
      }));
      console.error('Error toggling complete:', error);
      return false;
    }
    const reminders =
      newStatus === 'completed'
        ? cancelTodoReminders(id)
        : getTodoById(id).then((refreshed) => refreshed && scheduleTodoReminders(refreshed));
    reminders.catch((e) => console.error('reminder update failed:', e));
    return true;
  },

  updateTodo: async (id, updates) => {
    // Show the edit right away; persist and re-query in the background.
    const previous = get().todos;
    set((state) => ({
      error: null,
      todos: state.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    try {
      await updateTodo(id, updates);

      // Reschedule if remind_me or datetime changed
      if (updates.remind_me !== undefined || updates.datetime !== undefined) {
        void (async () => {
          await cancelTodoReminders(id);
          const refreshed = await getTodoById(id);
          if (refreshed && refreshed.remind_me) await scheduleTodoReminders(refreshed);
        })().catch((e) => console.error('reminder reschedule failed:', e));
      }

      await get().loadTodos();
    } catch (error) {
      const message = error instanceof DatabaseError ? error.message : 'Failed to update todo';
      set({ todos: previous, error: message, isLoading: false });
      console.error('Error updating todo:', error);
    }
  },

  deleteTodo: async (id) => {
    const previous = get().todos;
    set((state) => ({ error: null, todos: state.todos.filter((t) => t.id !== id) }));
    try {
      await deleteTodo(id);
      cancelTodoReminders(id).catch((e) => console.error('reminder cancel failed:', e));
    } catch (error) {
      const message = error instanceof DatabaseError ? error.message : 'Failed to delete todo';
      set({ todos: previous, error: message });
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
