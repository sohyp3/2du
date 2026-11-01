import { test, expect, spyOn } from 'bun:test';
import { fetchJSON } from '../utils/http';
test('client HTTP works without AbortSignal.timeout and surfaces server errors', async () => {
  const mockedFetch = spyOn(globalThis, 'fetch');
  const originalTimeout = AbortSignal.timeout;
  try {
    Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: undefined });
    mockedFetch.mockImplementation(
      Object.assign(async () => Response.json({ token: 'device-token' }), {
        preconnect: fetch.preconnect,
      })
    );
    expect(await fetchJSON('http://localhost/login')).toEqual({ token: 'device-token' });
    expect(mockedFetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    mockedFetch.mockImplementation(
      Object.assign(async () => Response.json({ error: 'Sign in again' }, { status: 401 }), {
        preconnect: fetch.preconnect,
      })
    );
    await expect(fetchJSON('http://localhost/sync')).rejects.toThrow('Sign in again');
  } finally {
    mockedFetch.mockRestore();
    Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: originalTimeout });
  }
});
