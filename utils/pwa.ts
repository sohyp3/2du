/** Web only. Skipped in development, where a cached build would hide code changes. */
export function registerServiceWorker() {
  if (__DEV__ || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('/sw.js')
    .catch((error) => console.error('Service worker registration failed:', error));
  // The workspace lives in browser storage; ask the browser not to evict it under pressure.
  void navigator.storage?.persist?.();
}
