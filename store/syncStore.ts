import { AuthError, fetchJSON, NetworkError } from '@/utils/http';
import { create } from 'zustand';
import { AppState, Platform } from 'react-native';
import {
  clearLocalData,
  db,
  getSetting,
  queueAllLocalData,
  setSetting,
  withDatabaseWrite,
} from '@/db/database';
import { readCredential, writeCredential, deleteCredential } from '@/utils/credentials';
import { entities, fields, validateChange, type Change, type Entity } from '@/shared/records';
import { useTodoStore } from './todoStore';
import { useNoteStore } from './noteStore';
import { useGoalStore } from './goalStore';
import { useCalendarsStore } from './calendarsStore';
import { useBriefStore } from './briefStore';
import { useGoalCategoriesStore } from './goalCategoriesStore';
interface Outbox {
  entity: Entity;
  id: string;
  data: string | null;
  updated_at: string;
}
// The app polls every 15s; persisting the timestamp each time is a needless disk
// write. Keep the in-memory value fresh for the UI and flush it periodically.
const SYNC_LAST_WRITE_MS = 60_000;
let lastSyncWrite = 0;
// A server without incremental sync rejects the `since` field. Remembered until restart.
let legacyServer = false;
const ID_CHUNK = 500;
/** The shared server new devices sign in to. A custom server lives under Advanced. */
export const DEFAULT_SERVER = 'https://2du.hyp3.cafe';
/** Thrown by `connect()` when this device's data belongs to another account or server. Retry
 * with `mode` 'merge' (upload it into the new account) or 'fresh' (remove it first). */
export class BindingConflict extends Error {
  constructor() {
    super('This device has data from another account');
    this.name = 'BindingConflict';
  }
}
export type ConnectMode = 'merge' | 'fresh';
export type KeyScope = 'read' | 'write' | 'add' | 'book' | 'feed';
export interface ApiKey {
  id: string;
  name: string;
  scope: string;
  created_at: string;
  expires: number | null;
  last_used: string | null;
  meta: { calendar_ids?: string[] } | null;
}
async function reloadStores() {
  await Promise.all([
    useTodoStore.getState().loadTodos(),
    useNoteStore.getState().loadNotes(),
    useCalendarsStore.getState().load(),
    useGoalStore.getState().load(),
    useBriefStore.getState().load(),
    useGoalCategoriesStore.getState().load(),
  ]);
}
interface SyncState {
  url: string;
  username: string;
  token: string;
  busy: boolean;
  error: string | null;
  /** The server rejected the session; local data and the outbox are kept. */
  needsLogin: boolean;
  lastSync: string | null;
  pending: number;
  /** Bumped whenever a sync changes local data. */
  revision: number;
  keys: ApiKey[];
  init: () => Promise<void>;
  connect: (
    url: string,
    username: string,
    password: string,
    register: boolean,
    mode?: ConnectMode
  ) => Promise<void>;
  /** Signs out. With `keepData` false, also removes this device's local data. */
  disconnect: (keepData?: boolean) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  /** Permanently deletes the account on the server, then removes local data. */
  deleteAccount: (password: string) => Promise<void>;
  sync: () => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  loadKeys: () => Promise<void>;
  createKey: (
    name: string,
    scope: KeyScope,
    opts?: { expires_days?: number | null; calendar_ids?: string[] }
  ) => Promise<{ key: string; id: string }>;
  revokeKey: (id: string) => Promise<void>;
}
export const useSyncStore = create<SyncState>((set, get) => {
  /** The session is dead: drop the token only. Queued edits upload after the next sign-in. */
  const expire = async () => {
    await deleteCredential('2du_session');
    await setSetting('sync_needs_login', 'true');
    set({ token: '', keys: [], busy: false, error: null, needsLogin: true });
  };
  /** Ends the session on this device only; the server side is the caller's job. */
  const signOutLocal = async (keepData: boolean) => {
    await deleteCredential('2du_session');
    await setSetting('sync_needs_login', 'false');
    await db.runAsync("DELETE FROM settings WHERE key='sync_cursor'");
    set({ token: '', keys: [], error: null, needsLogin: false });
    if (keepData) return;
    await clearLocalData();
    await db.runAsync("DELETE FROM settings WHERE key='sync_binding'");
    set({ pending: 0 });
    await reloadStores();
    set((s) => ({ revision: s.revision + 1 }));
  };
  /** An account call that checks a password: a 401 means a wrong password, not a dead session. */
  const accountRequest = async (path: string, method: string, body: object) => {
    const { url, token } = get();
    try {
      return await fetchJSON(`${url}/v1/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (e instanceof AuthError) throw Object.assign(new Error(e.message), { status: 401 });
      throw e;
    }
  };
  return {
    url: '',
    username: '',
    token: '',
    busy: false,
    error: null,
    needsLogin: false,
    lastSync: null,
    pending: 0,
    revision: 0,
    keys: [],
    init: async () => {
      const url = (await getSetting('sync_url')) || DEFAULT_SERVER,
        username = (await getSetting('sync_username')) || '';
      const token = (await readCredential('2du_session')) || '';
      set({
        url,
        username,
        token,
        lastSync: await getSetting('sync_last'),
        needsLogin: !token && (await getSetting('sync_needs_login')) === 'true',
      });
      if (token) await get().sync();
    },
    connect: async (input, username, password, register, mode) => {
      set({ busy: true, error: null });
      try {
        const url = input.trim().replace(/\/+$/, '');
        const parsed = new URL(url);
        if (
          !['https:', 'http:'].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password ||
          parsed.search ||
          parsed.hash ||
          parsed.pathname !== '/'
        )
          throw new Error('Enter a server origin, such as https://sync.example.com');
        const bound = await getSetting('sync_binding');
        const binding = `${url}|${username.trim().toLowerCase()}`;
        const conflict = !!bound && bound !== binding;
        if (conflict && !mode) throw new BindingConflict();
        // Sign in first, so a wrong password never removes or re-queues anything.
        const body = await fetchJSON(`${url}/v1/auth/${register ? 'register' : 'login'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        if (conflict && mode === 'fresh') {
          await clearLocalData();
          await reloadStores();
          set((s) => ({ revision: s.revision + 1 }));
        } else if (conflict) await queueAllLocalData();
        await writeCredential('2du_session', body.token);
        await setSetting('sync_url', url);
        await setSetting('sync_username', body.username);
        await setSetting('sync_binding', binding);
        await setSetting('sync_needs_login', 'false');
        set({ url, username: body.username, token: body.token, busy: false, needsLogin: false });
        // Lowers the chance the browser evicts the token and the local database.
        if (Platform.OS === 'web') void navigator.storage?.persist?.().catch(() => {});
        // A fresh sign-in always starts with one full sync.
        await db.runAsync("DELETE FROM settings WHERE key='sync_cursor'");
        await get().sync();
      } catch (e) {
        set({ busy: false, error: e instanceof Error ? e.message : 'Connection failed' });
        throw e;
      }
    },
    request: async (path, options = {}) => {
      const { url, token } = get();
      try {
        return await fetchJSON(`${url}/v1/${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        });
      } catch (e) {
        if (e instanceof AuthError) await expire();
        throw e;
      }
    },
    disconnect: async (keepData = true) => {
      if (get().busy) return;
      try {
        await get().request('session', { method: 'DELETE' });
      } catch {
        /* local sign-out also works offline */
      }
      await signOutLocal(keepData);
    },
    changePassword: async (current, next) => {
      await accountRequest('account/password', 'POST', { current, next });
    },
    deleteAccount: async (password) => {
      await accountRequest('account', 'DELETE', { password });
      // The server already revoked every token, so there is no session to delete.
      await signOutLocal(false);
    },
    sync: async () => {
      if (!get().token || get().busy) return;
      set({ busy: true, error: null });
      try {
        const pending = await db.getAllAsync<Outbox>('SELECT * FROM sync_outbox');
        if (get().pending !== pending.length) set({ pending: pending.length });
        const changes = pending.map((r) => ({
          ...r,
          data: r.data === null ? null : JSON.parse(r.data),
        }));
        const stored = legacyServer ? null : await getSetting('sync_cursor');
        const since = stored && /^\d+$/.test(stored) ? Number(stored) : null;
        const post = (body: object) =>
          get().request('sync', { method: 'POST', body: JSON.stringify(body) });
        let result;
        try {
          result = await post(since === null ? { changes } : { changes, since });
        } catch (e) {
          if (since === null || !(e instanceof Error) || e.message !== 'Unknown field') throw e;
          legacyServer = true;
          result = await post({ changes });
        }
        const cursor: number | null = Number.isInteger(result.cursor) ? result.cursor : null;
        const records: Change[] = result.records.map(validateChange);
        const sentById = new Map(pending.map((p) => [`${p.entity}:${p.id}`, p]));
        // With a cursor the server answers with only what changed since the last sync (an
        // old server still sends everything). Only touch rows that really differ, and only
        // reload the stores whose data changed, so an idle sync costs one small request.
        const changed = new Set<Entity>();
        if (!records.length) {
          if (cursor !== null && cursor !== since) await setSetting('sync_cursor', String(cursor));
        } else
          await withDatabaseWrite(() =>
            db.withTransactionAsync(async () => {
              const tx = db;
              const outbox = new Map(
                (await tx.getAllAsync<Outbox>('SELECT * FROM sync_outbox')).map((o) => [
                  `${o.entity}:${o.id}`,
                  o,
                ])
              );
              const localRows = new Map<string, Record<string, unknown>>();
              for (const entity of entities) {
                const ids = records.filter((r) => r.entity === entity).map((r) => r.id);
                for (let i = 0; i < ids.length; i += ID_CHUNK) {
                  const chunk = ids.slice(i, i + ID_CHUNK);
                  for (const row of await tx.getAllAsync<Record<string, unknown>>(
                    `SELECT ${fields[entity].join(',')} FROM ${entity} WHERE id IN (${chunk.map(() => '?').join(',')})`,
                    chunk
                  ))
                    localRows.set(`${entity}:${row.id}`, row);
                }
              }
              let applying = false;
              const beginApply = async () => {
                if (applying) return;
                applying = true;
                await tx.runAsync('UPDATE sync_control SET applying=1 WHERE id=1');
              };
              for (const r of records) {
                const key = `${r.entity}:${r.id}`;
                const local = outbox.get(key);
                const sent = sentById.get(key);
                if (
                  local &&
                  (!sent || local.updated_at !== sent.updated_at || local.data !== sent.data)
                )
                  continue;
                const row = localRows.get(key);
                if (r.data === null) {
                  if (row) {
                    await beginApply();
                    await tx.runAsync(`DELETE FROM ${r.entity} WHERE id=?`, r.id);
                    changed.add(r.entity);
                  }
                } else {
                  const cols = fields[r.entity];
                  const vals = cols.map((k) => {
                    const v = r.data![k];
                    return typeof v === 'boolean'
                      ? Number(v)
                      : ((v ?? (k === 'calendar_id' ? 'daily' : null)) as string | number | null);
                  });
                  if (!row || cols.some((k, i) => row[k] !== vals[i])) {
                    await beginApply();
                    await tx.runAsync(
                      `INSERT OR REPLACE INTO ${r.entity} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
                      vals
                    );
                    changed.add(r.entity);
                  }
                }
                if (local)
                  await tx.runAsync(
                    'DELETE FROM sync_outbox WHERE entity=? AND id=?',
                    r.entity,
                    r.id
                  );
              }
              if (applying) await tx.runAsync('UPDATE sync_control SET applying=0 WHERE id=1');
              // Last statement, so the cursor and the data it covers commit together.
              if (cursor !== null)
                await tx.runAsync(
                  'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                  'sync_cursor',
                  String(cursor)
                );
            })
          );
        const lastSync = new Date().toISOString();
        if (Date.now() - lastSyncWrite >= SYNC_LAST_WRITE_MS) {
          lastSyncWrite = Date.now();
          try {
            await setSetting('sync_last', lastSync);
          } catch (error) {
            console.error('Failed to save last sync time:', error);
          }
        }
        if (changed.size) {
          await Promise.all([
            changed.has('todos') && useTodoStore.getState().loadTodos(),
            changed.has('notes') && useNoteStore.getState().loadNotes(),
            changed.has('calendars') && useCalendarsStore.getState().load(),
            changed.has('goals') && useGoalStore.getState().load(),
            changed.has('briefs') && useBriefStore.getState().load(),
            changed.has('goal_categories') && useGoalCategoriesStore.getState().load(),
          ]);
          set((s) => ({ revision: s.revision + 1 }));
        }
        const count = await db.getFirstAsync<{ n: number }>(
          'SELECT COUNT(*) as n FROM sync_outbox'
        );
        set({ lastSync, busy: false, pending: count?.n || 0 });
      } catch (e) {
        // Not reaching the server is normal here: edits stay queued for the next poll.
        // request() already expired the session; calling it again is harmless.
        if (e instanceof AuthError) return expire();
        if (e instanceof NetworkError) return set({ busy: false });
        set({
          busy: false,
          error:
            e instanceof Error
              ? e.message
              : 'Sync unavailable. Your changes are saved on this device.',
        });
      }
    },
    loadKeys: async () => set({ keys: await get().request('keys') }),
    createKey: async (name, scope, opts = {}) => {
      // JSON.stringify leaves out undefined fields.
      const result = await get().request('keys', {
        method: 'POST',
        body: JSON.stringify({ name, scope, ...opts }),
      });
      await get().loadKeys();
      return { key: result.key, id: result.id };
    },
    revokeKey: async (id) => {
      await get().request(`keys/${id}`, { method: 'DELETE' });
      await get().loadKeys();
    },
  };
});
export function startSync() {
  void useSyncStore
    .getState()
    .init()
    .catch((e) => useSyncStore.setState({ error: String(e) }));
  const timer = setInterval(() => {
    if (AppState.currentState === 'active') void useSyncStore.getState().sync();
  }, 15000);
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') void useSyncStore.getState().sync();
  });
  return () => {
    clearInterval(timer);
    sub.remove();
  };
}
