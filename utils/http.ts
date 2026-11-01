export async function fetchJSON(url: string, options: RequestInit = {}) {
  // React Native's AbortSignal polyfill has no timeout() static method.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Server request failed');
    return body;
  } finally {
    clearTimeout(timer);
  }
}
