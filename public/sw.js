// Serves the app from a local cache so it opens at once, online or not. A new build
// downloads in the background and takes over on the next launch. Sync requests go to
// another origin or are POSTs, so they always reach the network.
const { version, files } = self.__BUILD__; // Filled in by scripts/precache.ts.
const CACHE = `2du-${version}`;

// Everything under these paths has a content hash in its name, so it never changes.
const isHashed = (file) => file.startsWith('/assets/') || file.startsWith('/_expo/');

async function download(file) {
  const response = await fetch(file, { cache: 'reload' });
  if (!response.ok) throw new Error(`Could not cache ${file}: ${response.status}`);
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        files.map(async (file) => {
          const known = isHashed(file) ? await caches.match(file) : undefined;
          await cache.put(file, known ?? (await download(file)));
        })
      );
      // An open page already has its code loaded, so replacing the worker cannot break it.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('2du-') && n !== CACHE).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// Mirrors the routing in server/web.ts.
function pageFor(path) {
  const dynamic = path.match(/^\/(todo|note)\/[^/]+\/?$/);
  if (dynamic) return `/${dynamic[1]}/[id].html`;
  return path === '/' ? '/index.html' : `${path.replace(/\/$/, '')}.html`;
}

async function respond(request, path) {
  const cache = await caches.open(CACHE);
  if (request.mode === 'navigate')
    return (
      (await cache.match(pageFor(path))) ?? (await cache.match('/index.html')) ?? fetch(request)
    );
  // Safari needs real partial responses for audio, which only the network can give.
  if (request.headers.has('range'))
    return fetch(request).catch(async () => (await cache.match(request)) ?? Response.error());
  return (await cache.match(request)) ?? fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { origin, pathname } = new URL(event.request.url);
  if (event.request.method === 'GET' && origin === location.origin)
    event.respondWith(respond(event.request, pathname));
});
