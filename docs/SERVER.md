# Sync server

The sync server lives in the sibling repo `2duServer`. This repo no longer bundles one.

- Setup, deployment and backups: [../2duServer/README.md](../../2duServer/README.md)
- API reference: [../2duServer/docs/API.md](../../2duServer/docs/API.md)

In the app, sign in under **Settings → Account & sync**. The shared server is
https://2du.hyp3.cafe; to use your own, open **Advanced** and enter its HTTPS origin.

Sync runs on launch, on returning to the app, and every 15 seconds while it is open. Records
merge by `updated_at`, latest wins, and overwritten versions are kept in server history.
Reminders and device preferences stay on the device.
