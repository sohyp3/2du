# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

Life management app with: todos, reminders, calendar, project management, and quick-capture mini notes. Performance is critical — the app must stay fast and responsive as data grows.

## Commands

- `bun start` — Start Expo dev server
- `bun run android` / `bun run ios` / `bun run web` — Start for specific platform
- `bun run lint` — Run ESLint + Prettier check
- `bun run format` — Auto-fix ESLint + Prettier issues
- `bun run prebuild` — Generate native project files

## Architecture

Expo Router app (SDK 54) with file-based routing, NativeWind (TailwindCSS) for styling, and Zustand for state management.

- **`app/`** — Expo Router file-based routes. `_layout.tsx` is the root layout (Stack navigator wrapped in SafeAreaProvider).
- **`components/`** — Shared UI components. Import via `@/components/` path alias.
- **`store/`** — Zustand stores (`todoStore.ts`).
- **`db/`** — SQLite database layer (`database.ts` for init, `todos.ts` for CRUD + types).
- **`utils/`** — Shared utilities (`dates.ts` for date range/filter helpers).
- **`global.css`** — TailwindCSS entry point, imported in root layout.

## Data Layer

Local SQLite via `expo-sqlite`. Database is initialized in `app/_layout.tsx` on mount. Zustand stores read/write through the `db/` module. Sync will be added later.

### Todo Model

Fields: `id`, `name`, `description`, `time_needed` (minutes), `priority` (low/medium/high/urgent), `datetime` (ISO), `status` (pending/in_progress/completed/cancelled), `parent_id` (subtodos), `remind_me` (bool, default false — sends notification 30min before + on time, can delay 5/10/30/custom), `created_at`, `updated_at`.

Home page shows todos filtered by day (default) / week / month with prev/next navigation. Quick add creates a todo with just a name, defaulting to end of day.

## Code Rules

- Always use NativeWind/TailwindCSS `className` for styling. Only fall back to `StyleSheet` or inline styles when absolutely necessary.
- Use CSS variables / Tailwind custom colors for theming so themes can be swapped easily. Each theme is one pastel color with its shades. Default theme: pastel yellow. Design all color usage through theme tokens, not hardcoded color classes.
- Always use function components (no class components).
- Keep code as simple as possible — minimal abstractions, no over-engineering.
- Performance is a priority: memoize expensive computations, avoid unnecessary re-renders, use `React.memo`/`useMemo`/`useCallback` where it matters.
- Target both phones (iOS/Android) and web — ensure components work cross-platform.

## Key Config

- TypeScript with `@/` path alias mapped to project root
- ESLint flat config (`eslint-config-expo`) with Prettier
- Prettier with `prettier-plugin-tailwindcss` for class sorting
- Package manager: bun
