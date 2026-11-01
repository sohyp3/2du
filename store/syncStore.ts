import { fetchJSON } from '@/utils/http';
import { create } from 'zustand';
import { AppState } from 'react-native';
import { db, getSetting, setSetting, withDatabaseWrite } from '@/db/database';
import { readCredential, writeCredential, deleteCredential } from '@/utils/credentials';
import { fields, validateChange, type Change, type Entity } from '@/shared/records';
import { useTodoStore } from './todoStore';
import { useNoteStore } from './noteStore';
import { useCalendarsStore } from './calendarsStore';
interface Outbox {
  entity: Entity;
  id: string;
  data: string | null;
  updated_at: string;
}
interface ApiKey {
  id: string;
  name: string;
  scope: string;
  created_at: string;
}
interface SyncState {
  url: string;
  username: string;
  token: string;
  busy: boolean;
  error: string | null;
  lastSync: string | null;
  pending: number;
  keys: ApiKey[];
  init: () => Promise<void>;
  connect: (url: string, username: string, password: string, register: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
  sync: () => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  loadKeys: () => Promise<void>;
  createKey: (name: string, scope: string) => Promise<string>;
  revokeKey: (id: string) => Promise<void>;
}
export const useSyncStore = create<SyncState>((set, get) => ({
  url: '',
  username: '',
  token: '',
  busy: false,
  error: null,
  lastSync: null,
  pending: 0,
  keys: [],
  init: async () => {
    const url = (await getSetting('sync_url')) || '',
      username = (await getSetting('sync_username')) || '';
    const token = (await readCredential('2du_session')) || '';
    set({ url, username, token, lastSync: await getSetting('sync_last') });
    if (token) await get().sync();
  },
  connect: async (input, username, password, register) => {
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
      if (bound && bound !== binding)
        throw new Error(
          'This local workspace is linked to another account or server. Use a separate browser profile or app installation for a different account.'
        );
      const body = await fetchJSON(`${url}/v1/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      await writeCredential('2du_session', body.token);
      await setSetting('sync_url', url);
      await setSetting('sync_username', body.username);
      await setSetting('sync_binding', binding);
      set({ url, username: body.username, token: body.token, busy: false });
      await get().sync();
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : 'Connection failed' });
      throw e;
    }
  },
  request: async (path, options = {}) => {
    const { url, token } = get();
    return fetchJSON(`${url}/v1/${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  },
  disconnect: async () => {
    if (get().busy) return;
    try {
      await get().request('session', { method: 'DELETE' });
    } catch {
      /* local sign-out also works offline */
    }
    await deleteCredential('2du_session');
    set({ token: '', keys: [], error: null });
  },
  sync: async () => {
    if (!get().token || get().busy) return;
    set({ busy: true, error: null });
    try {
      const pending = await db.getAllAsync<Outbox>('SELECT * FROM sync_outbox');
      set({ pending: pending.length });
      const changes = pending.map((r) => ({
        ...r,
        data: r.data === null ? null : JSON.parse(r.data),
      }));
      const result = await get().request('sync', {
        method: 'POST',
        body: JSON.stringify({ changes }),
      });
      const records: Change[] = result.records.map(validateChange);
      const sentById = new Map(pending.map((p) => [`${p.entity}:${p.id}`, p]));
      await withDatabaseWrite(() =>
        db.withTransactionAsync(async () => {
          const tx = db;
          await tx.runAsync('UPDATE sync_control SET applying=1 WHERE id=1');
          for (const r of records) {
            const local = await tx.getFirstAsync<Outbox>(
              'SELECT * FROM sync_outbox WHERE entity=? AND id=?',
              r.entity,
              r.id
            );
            const sent = sentById.get(`${r.entity}:${r.id}`);
            if (
              local &&
              (!sent || local.updated_at !== sent.updated_at || local.data !== sent.data)
            )
              continue;
            if (r.data === null) await tx.runAsync(`DELETE FROM ${r.entity} WHERE id=?`, r.id);
            else {
              const cols = fields[r.entity];
              const vals = cols.map((k) => {
                const v = r.data![k];
                return typeof v === 'boolean'
                  ? Number(v)
                  : ((v ?? (k === 'calendar_id' ? 'daily' : null)) as string | number | null);
              });
              await tx.runAsync(
                `INSERT OR REPLACE INTO ${r.entity} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
                vals
              );
            }
            if (local)
              await tx.runAsync('DELETE FROM sync_outbox WHERE entity=? AND id=?', r.entity, r.id);
          }
          await tx.runAsync('UPDATE sync_control SET applying=0 WHERE id=1');
        })
      );
      const lastSync = new Date().toISOString();
      await setSetting('sync_last', lastSync);
      await Promise.all([
        useTodoStore.getState().loadTodos(),
        useNoteStore.getState().loadNotes(),
        useCalendarsStore.getState().load(),
      ]);
      const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM sync_outbox');
      set({ lastSync, busy: false, pending: count?.n || 0 });
    } catch (e) {
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
  createKey: async (name, scope) => {
    const result = await get().request('keys', {
      method: 'POST',
      body: JSON.stringify({ name, scope }),
    });
    await get().loadKeys();
    return result.key;
  },
  revokeKey: async (id) => {
    await get().request(`keys/${id}`, { method: 'DELETE' });
    await get().loadKeys();
  },
}));
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
