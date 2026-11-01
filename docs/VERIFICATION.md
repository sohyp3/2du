# Verification

Checked 2026-10-31. Browser accounts/data used here were synthetic and live only in a temporary test database/browser profiles.

- TypeScript: `bun run check`.
- ESLint across app, components, store, db, utils, shared, server.
- Server: five Bun tests, 26 assertions (CRUD, auth, account isolation, key scopes/revocation, conflict history, tombstones, malformed input, CORS, React Native-compatible fetch timeout).
- Production web export and Android Hermes JavaScript export.
- Browser: task capture, completion, custom calendar creation, server registration/sign-in, agent key generation and revocation, read-only write denial, agent-created note arriving in the app.
- Two independent browser contexts: second device signs in, receives a task, completes it; first device syncs and receives completion.
- Browser forced offline: task saves locally, uploads after reconnect, and survives reload.
- Note typing followed immediately by leaving: latest title/body remain visible on the notes list.
- Desktop 1440×1000 and mobile 390×844: tasks, calendar, notes, settings visually inspected. Snapshot and screenshot artifacts are under `.impeccable/review/` (ignored).
- Impeccable mechanical detector: one run, no findings. Motion properties/thread choices reviewed from source; see MOTION.md.

Not verified: physical iOS/Android release install, native notification delivery, low-end-device frame recordings, Safari/Firefox, OS background termination. Android export validates bundling, not a native APK/store build. Web testing uses Chromium. The deployment URLs, TLS proxy, and production accounts belong to the owner and have not been provisioned.

Independent Impeccable review: initial Calendar fixes applied; final verdict scored contrast, touch targets/accessibility, and icon consistency all resolved (`ship` for those fixes). Native device verification remains outside that review.

Production static web serving also verified task creation/persistence and reloading a task detail deep link.

Follow-up UI checks: calendar remains mounted across eight consecutive empty day selections; Notes and Settings gutters use the current navigation theme; Notes quick capture, search, and pin filters work. Browser computed styles confirmed card hover, button press, save confirmation, and reduced motion. Captures at390,820,1440,1920 widths are in `.impeccable/review/notes-followup/`. Synthetic notes were created only in the test browser's local database.

Follow-up independent review: `ship` for scoped web Notes/calendar/theme/motion changes. Seven required captures are valid with no material overflow or pale gutters. Physical native appearance/performance remains outside this review. Final web and Android JavaScript exports pass.
Production follow-up: the exported static web build also passed quick capture, persistence after reload, themed gutters, live note-card hover transform(-4px), and named save-confirm animation checks.

Individual note follow-up: verified Write/Read switching and Markdown rendering, then changed a draft and left immediately; reopening preserved the latest text. Inspected reader/editor at desktop and390px width. Priority selection exposes distinct red/amber/green fills and selected state in task creation and shares the same component with task editing. TypeScript, targeted ESLint and web export pass. Physical-device editor/keyboard behavior remains unverified.
