# Connect an AI agent

No model provider is built into 2du. Bring your agent and give it an account-scoped key from
**Settings → Agents & keys**. A key is shown once and can be revoked at any time. Keys can expire
and show when they were last used.

## Key types

| Type          | What it can do                                                                             |
| ------------- | ------------------------------------------------------------------------------------------ |
| Read          | Read tasks, notes, calendars and goals.                                                    |
| Write         | Read, create, edit and delete. Give it only to agents you trust.                           |
| Add only      | Create tasks and notes, and list calendars and goals.                                      |
| Booking only  | Only the agent booking routes (`/v1/agent/*`).                                             |
| Calendar feed | A read-only ICS link for Google, Apple or Outlook Calendar. Every `/v1` route returns 403. |

Create a calendar feed under **Settings → Calendars → Add 2du to your calendar app**. The feed URL contains the
key, so treat it like a password.

Every request needs `Authorization: Bearer YOUR_KEY`. The routes, fields and the exact access of
each key type are documented in the server repo:

- [../2duServer/docs/API.md](../../2duServer/docs/API.md) (see "Key scopes")
- [../2duServer/README.md](../../2duServer/README.md)
