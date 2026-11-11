import { Platform } from 'react-native';
import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/database';
import { getTodoById, type TodoStatus } from '@/db/todos';
import { cancelFocusEnd, scheduleFocusEnd } from '@/utils/notifications';
import { useTodoStore } from './todoStore';

export const DEFAULT_FOCUS_MINUTES = 25;
const KEY = 'focus_session';
const MIN = 60_000;

export interface FocusSession {
  todoId: string;
  name: string;
  /** Epoch ms when the timer reaches zero. Remaining time is always derived from it. */
  endsAt: number;
  /** Total planned length, for the progress line. Grows and shrinks with ±5. */
  minutes: number;
  /** Status before Start, restored by Cancel. */
  prevStatus: TodoStatus;
}

interface FocusState {
  session: FocusSession | null;
  loaded: boolean;
  load: () => Promise<void>;
  /** Starts (or resumes, for the same task) a focus session and marks the task in progress. */
  start: (todoId: string, minutes?: number | null) => Promise<FocusSession | null>;
  adjust: (deltaMinutes: number) => void;
  /** Marks the task done and ends its session. `todoId` defaults to the session's task. */
  finish: (todoId?: string) => Promise<void>;
  /** Ends the session and puts the task back the way it was. */
  cancel: () => Promise<void>;
  /** Forgets the session without touching the task (it was finished elsewhere). */
  clear: () => void;
}

function persist(session: FocusSession | null) {
  setSetting(KEY, session ? JSON.stringify(session) : '').catch((error) =>
    console.error('Failed to save focus session:', error)
  );
}

function parse(raw: string | null): FocusSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as FocusSession;
    return typeof s?.todoId === 'string' && typeof s.endsAt === 'number' ? s : null;
  } catch {
    return null;
  }
}

export const useFocusStore = create<FocusState>((set, get) => ({
  session: null,
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      set({ session: parse(await getSetting(KEY)), loaded: true });
    } catch (error) {
      console.error('Failed to load focus session:', error);
      set({ loaded: true });
    }
  },

  start: async (todoId, minutes) => {
    await get().load();
    const current = get().session;
    if (current?.todoId === todoId) return current;
    if (current) await get().cancel();
    const todo = await getTodoById(todoId);
    if (!todo || todo.status === 'completed') return null;
    const length = minutes || todo.time_needed || DEFAULT_FOCUS_MINUTES;
    const session: FocusSession = {
      todoId,
      name: todo.name,
      endsAt: Date.now() + length * MIN,
      minutes: length,
      prevStatus: todo.status,
    };
    set({ session });
    persist(session);
    if (todo.status !== 'in_progress')
      void useTodoStore.getState().updateTodo(todoId, { status: 'in_progress' });
    void scheduleFocusEnd(todo, session.endsAt).catch((e) =>
      console.error('Failed to schedule focus end:', e)
    );
    if (Platform.OS === 'web' && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') void Notification.requestPermission();
    }
    return session;
  },

  adjust: (delta) => {
    const s = get().session;
    if (!s) return;
    const now = Date.now();
    // Once time is up, +5 counts from now rather than from the moment it ended.
    const endsAt = Math.max(Math.max(s.endsAt, now) + delta * MIN, now + MIN);
    const elapsed = s.minutes * MIN - (s.endsAt - now);
    const session = { ...s, endsAt, minutes: Math.max(1, (elapsed + endsAt - now) / MIN) };
    set({ session });
    persist(session);
    void scheduleFocusEnd({ id: s.todoId, name: s.name }, endsAt).catch((e) =>
      console.error('Failed to reschedule focus end:', e)
    );
  },

  finish: async (todoId) => {
    await get().load();
    const s = get().session;
    const id = todoId ?? s?.todoId;
    if (!id) return;
    if (s?.todoId === id) get().clear();
    const todo = await getTodoById(id);
    if (todo && todo.status !== 'completed') await useTodoStore.getState().toggleComplete(id);
  },

  cancel: async () => {
    const s = get().session;
    if (!s) return;
    get().clear();
    const todo = await getTodoById(s.todoId);
    if (todo?.status === 'in_progress' && s.prevStatus !== 'in_progress')
      await useTodoStore.getState().updateTodo(s.todoId, { status: s.prevStatus });
  },

  clear: () => {
    const s = get().session;
    if (!s) return;
    set({ session: null });
    persist(null);
    void cancelFocusEnd(s.todoId);
  },
}));
