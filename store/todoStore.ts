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

  loadTodos: () => void;
  addTodo: (params: AddTodoParams) => void;
  toggleComplete: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  snoozeTodo: (id: string, minutes: number) => void;
  setPeriod: (period: FilterPeriod) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  navigatePeriod: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  period: 'day',
  referenceDate: new Date(),
  statusFilter: 'active',

  loadTodos: () => {
    const { period, referenceDate, statusFilter } = get();
    const { start, end } = getDateRange(period, referenceDate);
    const todos = getTodosByDateRange(start.toISOString(), end.toISOString(), statusFilter);
    set({ todos });
  },

  addTodo: (params) => {
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
    insertTodo(todo);
    scheduleTodoReminders(todo);
    get().loadTodos();
  },

  toggleComplete: (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    updateTodo(id, { status: newStatus });

    if (newStatus === 'completed') {
      cancelTodoReminders(id);
    } else {
      // Re-schedule reminders when uncompleting
      const refreshed = getTodoById(id);
      if (refreshed) scheduleTodoReminders(refreshed);
    }

    get().loadTodos();
  },

  updateTodo: (id, updates) => {
    updateTodo(id, updates);

    // Reschedule if remind_me or datetime changed
    if (updates.remind_me !== undefined || updates.datetime !== undefined) {
      cancelTodoReminders(id).then(() => {
        const refreshed = getTodoById(id);
        if (refreshed && refreshed.remind_me) scheduleTodoReminders(refreshed);
      });
    }

    get().loadTodos();
  },

  deleteTodo: (id) => {
    cancelTodoReminders(id);
    deleteTodo(id);
    get().loadTodos();
  },

  snoozeTodo: (id, minutes) => {
    const todo = get().todos.find((t) => t.id === id) ?? getTodoById(id);
    if (todo) snoozeTodoReminder(todo, minutes);
  },

  setPeriod: (period) => {
    set({ period });
    get().loadTodos();
  },

  setStatusFilter: (statusFilter) => {
    set({ statusFilter });
    get().loadTodos();
  },

  navigatePeriod: (direction) => {
    const { period, referenceDate } = get();
    set({ referenceDate: shiftDate(period, referenceDate, direction) });
    get().loadTodos();
  },

  goToToday: () => {
    set({ referenceDate: new Date() });
    get().loadTodos();
  },
}));
