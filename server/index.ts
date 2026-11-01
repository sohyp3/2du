import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { entities, fields, validateChange, type Change, type Entity } from '../shared/records';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const secret = () => randomBytes(32).toString('hex');
export function createApp(path = process.env.DATABASE_PATH || 'server/data/2du.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new Database(path, { create: true });
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, scope TEXT NOT NULL, expires INTEGER, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS records(user_id TEXT, entity TEXT, id TEXT, data TEXT, updated_at TEXT, PRIMARY KEY(user_id,entity,id));
    CREATE TABLE IF NOT EXISTS history(user_id TEXT, entity TEXT, id TEXT, data TEXT, updated_at TEXT, archived_at TEXT);
  `);
  const allowed = (
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:8081,http://127.0.0.1:8081,http://localhost:8080,http://127.0.0.1:8080'
  ).split(',');
  const attempts = new Map<string, { count: number; until: number }>();
  const merge = db.transaction((uid: string, changes: Change[]) => {
    for (const c of changes) {
      const old = db
        .query('SELECT * FROM records WHERE user_id=? AND entity=? AND id=?')
        .get(uid, c.entity, c.id) as any;
      const data = c.data === null ? null : JSON.stringify(c.data);
      if (old && old.data === data && old.updated_at === c.updated_at) continue;
      // Concurrent edits are deterministic; both versions remain recoverable in history.
      const wins =
        !old ||
        c.updated_at > old.updated_at ||
        (c.updated_at === old.updated_at && String(data) > String(old.data));
      if (old)
        db.query('INSERT INTO history VALUES(?,?,?,?,?,?)').run(
          uid,
          c.entity,
          c.id,
          wins ? old.data : data,
          wins ? old.updated_at : c.updated_at,
          new Date().toISOString()
        );
      if (wins)
        db.query('INSERT OR REPLACE INTO records VALUES(?,?,?,?,?)').run(
          uid,
          c.entity,
          c.id,
          data,
          c.updated_at
        );
    }
  });
  const record = (r: any): Change => ({
    entity: r.entity,
    id: r.id,
    data: r.data === null ? null : JSON.parse(r.data),
    updated_at: r.updated_at,
  });
  async function fetch(req: Request): Promise<Response> {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS';
    const send = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    try {
      if (origin && !allowed.includes(origin)) return send({ error: 'Origin is not allowed' }, 403);
      if (req.method === 'OPTIONS') return send({ ok: true });
      const url = new URL(req.url),
        parts = url.pathname.split('/').filter(Boolean);
      if (url.pathname === '/health') return send({ ok: true });
      if (parts[0] !== 'v1') return send({ error: 'Not found' }, 404);
      const body = async () => {
        const raw = await req.text();
        if (raw.length > 5_000_000) throw new Error('Request too large');
        return JSON.parse(raw);
      };
      if (parts[1] === 'auth' && req.method === 'POST') {
        const { username, password } = await body();
        if (
          typeof username !== 'string' ||
          !/^[a-zA-Z0-9_.-]{3,64}$/.test(username) ||
          typeof password !== 'string' ||
          password.length < 10 ||
          password.length > 1024
        )
          return send(
            { error: 'Use a 3–64 character username and a password of at least 10 characters.' },
            400
          );
        const key = username.toLowerCase();
        const now = Date.now();
        if (attempts.size > 10000)
          for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
        const a = attempts.get(key);
        if (a && a.until > now && a.count >= 10)
          return send({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
        attempts.set(key, { count: (a && a.until > now ? a.count : 0) + 1, until: now + 900000 });
        let user = db.query('SELECT * FROM users WHERE username=?').get(key) as any;
        if (parts[2] === 'register') {
          if (process.env.ALLOW_REGISTRATION !== 'true')
            return send({ error: 'Registration is disabled on this server' }, 403);
          if (user) return send({ error: 'Username is unavailable' }, 409);
          user = {
            id: crypto.randomUUID(),
            username: key,
            password: await Bun.password.hash(password),
          };
          db.query('INSERT INTO users VALUES(?,?,?)').run(user.id, key, user.password);
        } else if (parts[2] !== 'login') return send({ error: 'Not found' }, 404);
        if (!user || !(await Bun.password.verify(password, user.password)))
          return send({ error: 'Invalid username or password' }, 401);
        attempts.delete(key);
        const token = secret();
        db.query('INSERT INTO tokens VALUES(?,?,?,?,?,?)').run(
          hash(token),
          user.id,
          'Device session',
          'session',
          Date.now() + 30 * 86400000,
          new Date().toISOString()
        );
        return send({ token, username: key });
      }
      const bearer = req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
      const token = db.query('SELECT * FROM tokens WHERE hash=?').get(hash(bearer)) as any;
      if (!token || (token.expires && token.expires < Date.now()))
        return send({ error: 'Sign in again to sync' }, 401);
      const uid = token.user_id;
      if (req.method !== 'GET' && token.scope === 'read')
        return send({ error: 'This key is read-only' }, 403);
      if (parts[1] === 'session' && req.method === 'DELETE') {
        db.query('DELETE FROM tokens WHERE hash=?').run(hash(bearer));
        return send({ ok: true });
      }
      if (parts[1] === 'keys') {
        if (token.scope !== 'session') return send({ error: 'Sign in to manage keys' }, 403);
        if (req.method === 'GET')
          return send(
            db
              .query(
                "SELECT hash as id,name,scope,created_at FROM tokens WHERE user_id=? AND scope!='session'"
              )
              .all(uid)
          );
        if (req.method === 'POST') {
          const b = await body();
          if (
            typeof b.name !== 'string' ||
            !b.name.trim() ||
            b.name.length > 100 ||
            !['read', 'write'].includes(b.scope)
          )
            return send({ error: 'Provide a key name and read/write scope' }, 400);
          const key = secret();
          db.query('INSERT INTO tokens VALUES(?,?,?,?,?,?)').run(
            hash(key),
            uid,
            b.name,
            b.scope,
            null,
            new Date().toISOString()
          );
          return send({ key, id: hash(key), name: b.name, scope: b.scope }, 201);
        }
        if (req.method === 'DELETE' && parts[2]) {
          db.query("DELETE FROM tokens WHERE hash=? AND user_id=? AND scope!='session'").run(
            parts[2],
            uid
          );
          return send({ ok: true });
        }
      }
      if (parts[1] === 'sync' && req.method === 'POST') {
        if (token.scope !== 'session')
          return send(
            { error: 'Sync requires a device session; agents use record endpoints' },
            403
          );
        const b = await body();
        if (!Array.isArray(b.changes) || b.changes.length > 10000)
          return send({ error: 'Invalid sync batch' }, 400);
        const changes = b.changes.map(validateChange);
        if (changes.some((c: Change) => Date.parse(c.updated_at) > Date.now() + 300000))
          return send({ error: 'Device clock is ahead. Correct it before syncing.' }, 400);
        merge(uid, changes);
        return send({
          records: db.query('SELECT * FROM records WHERE user_id=?').all(uid).map(record),
        });
      }
      if (parts[1] === 'history' && req.method === 'GET')
        return send(
          db
            .query(
              'SELECT entity,id,data,updated_at,archived_at FROM history WHERE user_id=? ORDER BY archived_at DESC LIMIT 200'
            )
            .all(uid)
            .map((r: any) => ({ ...r, data: r.data && JSON.parse(r.data) }))
        );
      if (!entities.includes(parts[1] as Entity)) return send({ error: 'Not found' }, 404);
      const entity = parts[1] as Entity,
        id = parts[2];
      const oldRow = id
        ? (db
            .query('SELECT * FROM records WHERE user_id=? AND entity=? AND id=?')
            .get(uid, entity, id) as any)
        : null;
      const old = oldRow?.data ? JSON.parse(oldRow.data) : null;
      if (req.method === 'GET') {
        if (id) return old ? send(old) : send({ error: 'Not found' }, 404);
        let rows = db
          .query('SELECT * FROM records WHERE user_id=? AND entity=? AND data IS NOT NULL')
          .all(uid, entity)
          .map((r: any) => JSON.parse(r.data));
        if (entity === 'todos')
          rows = rows.filter(
            (r: any) =>
              (!url.searchParams.has('calendar_id') ||
                r.calendar_id === url.searchParams.get('calendar_id')) &&
              (!url.searchParams.has('from') || r.datetime >= url.searchParams.get('from')!) &&
              (!url.searchParams.has('to') || r.datetime <= url.searchParams.get('to')!) &&
              (!url.searchParams.has('status') || r.status === url.searchParams.get('status'))
          );
        const q = url.searchParams.get('q')?.toLowerCase();
        if (q) rows = rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(q));
        if (url.searchParams.get('random') === '1')
          rows = rows.length ? [rows[Math.floor(Math.random() * rows.length)]] : [];
        return send(rows);
      }
      if (req.method === 'DELETE' && id) {
        if (!old) return send({ error: 'Not found' }, 404);
        if (
          entity === 'calendars' &&
          db
            .query(
              "SELECT id FROM records WHERE user_id=? AND entity='todos' AND json_extract(data,'$.calendar_id')=? LIMIT 1"
            )
            .get(uid, id)
        )
          return send({ error: 'Move tasks out of this calendar before deleting it' }, 409);
        merge(uid, [{ entity, id, data: null, updated_at: new Date().toISOString() }]);
        return send({ ok: true });
      }
      if ((req.method === 'POST' && !id) || (req.method === 'PATCH' && id)) {
        if (id && !old) return send({ error: 'Not found' }, 404);
        const b = await body();
        if (
          !b ||
          typeof b !== 'object' ||
          Array.isArray(b) ||
          Object.keys(b).some(
            (k) => !fields[entity].includes(k) || ['id', 'created_at', 'updated_at'].includes(k)
          )
        )
          return send({ error: 'Invalid fields' }, 400);
        const now = new Date().toISOString(),
          rid = id || crypto.randomUUID();
        const defaults =
          entity === 'todos'
            ? {
                description: null,
                priority: 'moderate',
                status: 'pending',
                datetime: now,
                remind_me: false,
                parent_id: null,
                time_needed: null,
                calendar_id: 'daily',
              }
            : entity === 'notes'
              ? { content: '', pinned: false }
              : { color: '#a7c968' };
        const data = {
          ...defaults,
          ...old,
          ...b,
          id: rid,
          created_at: old?.created_at || now,
          updated_at: now,
        };
        const change = validateChange({ entity, id: rid, data, updated_at: now });
        merge(uid, [change]);
        return send(data, id ? 200 : 201);
      }
      return send({ error: 'Not found' }, 404);
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        (error instanceof Error && /Invalid|Unknown|too large/.test(error.message))
      )
        return send({ error: error.message }, 400);
      console.error(error);
      return send({ error: 'Server error' }, 500);
    }
  }
  return { fetch, db };
}
if (import.meta.main) {
  const app = createApp();
  const server = Bun.serve({
    hostname: process.env.HOST || '127.0.0.1',
    port: Number(process.env.PORT || 3000),
    maxRequestBodySize: 5_000_000,
    fetch: app.fetch,
  });
  console.log(`2du server listening on ${server.url}`);
}
