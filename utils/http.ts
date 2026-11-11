/** The server never answered: offline, unreachable, or timed out. navigator.onLine can't
 * tell these apart, since it stays true on a network with no route to the server. */
export class NetworkError extends Error {}

/** The server answered 401: the session token is missing, expired or revoked. */
export class AuthError extends Error {}

export async function fetchJSON(url: string, options: RequestInit = {}) {
  // React Native's AbortSignal polyfill has no timeout() static method.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal }).catch(() => {
      throw new NetworkError('Could not reach the server. Check your connection and try again.');
    });
    const body = await response.json();
    if (response.status === 401) throw new AuthError(body.error || 'Sign in again to sync');
    if (!response.ok)
      throw Object.assign(new Error(body.error || 'Server request failed'), {
        status: response.status,
      });
    return body;
  } finally {
    clearTimeout(timer);
  }
}
