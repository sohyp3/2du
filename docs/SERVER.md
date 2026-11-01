# Self-hosted sync

Requires Bun 1.3+ and a persistent disk. From the repository root:

```sh
bun install
ALLOW_REGISTRATION=true bun run server
```

The server listens on `127.0.0.1:3000`. In 2du → Settings → Sync enter its URL, username, and a password of at least 10 characters; choose **Create an account** on the first device. Sign in with the same account on the other devices. Local data joins that account at first sync. Each installation/browser profile is bound to the first server/account to prevent cross-account uploads. Disconnect keeps local data and the binding.

After registering the accounts you need, restart without `ALLOW_REGISTRATION=true`. Registration is disabled by default. Passwords are Argon2-hashed; session and API tokens are stored only as SHA-256 hashes on the server. Device sessions expire after 30 days. Native session tokens use SecureStore; browser session tokens use sessionStorage and end with the tab. Passwords are never persisted by the app.

## Deployment

Copy `server/.env.example` to `.env` at the repository root (Bun loads it automatically). Set the database path to persistent storage. Set `ALLOWED_ORIGINS` to the exact web app origins, comma-separated. No wildcard. Native clients have no Origin header. For LAN testing set `HOST=0.0.0.0`, use the computer's LAN IP on the phone, and keep the service on a trusted network. On a phone, localhost refers to the phone.

Use an HTTPS reverse proxy (Caddy example):

```caddyfile
sync.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Use HTTPS for both the web app and server outside localhost. Native builds also enforce platform transport policies; prefer HTTPS for LAN access rather than disabling those protections. The server defaults to loopback. Do not expose an unencrypted service publicly. No end-to-end encryption: the server can read the synced records.

Health: `GET /health`. Run with a process supervisor, for example systemd with `WorkingDirectory` set to the project and `ExecStart=/absolute/path/to/bun run server/index.ts`. Restrict the data directory to the service user.

## Sync behavior

SQLite remains the source for on-device editing. SQLite triggers queue every task, note, and calendar mutation, including deletions and imports. The foreground app syncs on launch, on returning to the app, and every 15 seconds; **Sync now** is available in Settings → Sync. There is no background OS sync or real-time push. Network failures preserve queued changes. Remote changes reload the visible stores; calendar views refresh on focus and sync.

Records merge by ISO `updated_at`, latest wins. Equal timestamps use a deterministic payload ordering. This is **record-level**, not field-level: simultaneous edits to different fields of the same note can overwrite each other. Correct device clocks matter; writes more than five minutes in the future are rejected. Previous/losing versions are retained in server history and accessible through `GET /v1/history` (latest 200). Recover one by copying its fields into a PATCH; omit id/timestamps. Tombstones are retained indefinitely so an offline device cannot resurrect an older deletion. An intentional newer edit can restore a record.

This first version sends a full account snapshot each round (up to 10,000 queued changes and 5 MB per request). It is intended for a personal workspace. For larger archives, add cursor-based pulls and bounded batches before increasing these limits. Settings, themes, local notification identifiers, credentials, and device preferences are not synced. Reminders are device-local; remotely received tasks do not automatically schedule notifications. Web does not schedule native reminders.

## Backup and restore

Use SQLite's online backup facility, or stop the service and copy the database together with any `-wal`/`-shm` companions. Back up the whole database: it contains accounts, hashed tokens, records, tombstones, and recovery history. Restore with the service stopped. Keep file permissions restrictive. In-app JSON export excludes sync/account settings and includes calendars. Import validates records before writing and merges them; it does not delete unrelated local records. Imported records become new local edits and sync normally. Device preferences are not restored by the merged import.

## Verification

```sh
bun test server
bun run check
```

Tests cover agent CRUD, key permissions/revocation, authentication, registration control, account isolation, conflict history, retry convergence, deletion tombstones, malformed records, and CORS. The server is a personal deployment, not a multi-tenant public service; public abuse controls beyond login throttling belong at your reverse proxy.
