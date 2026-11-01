import { resolve, extname } from 'node:path';
// Static Expo hosting needs isolation headers for SQLite's web worker.
const root = resolve('dist');
const server = Bun.serve({
  port: Number(process.env.WEB_PORT || 8080),
  hostname: process.env.HOST || '127.0.0.1',
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    const target = resolve(root, '.' + path);
    if (!target.startsWith(root + '/') && target !== root)
      return new Response('Not found', { status: 404 });
    const candidates = extname(target)
      ? [target]
      : [target + '.html', resolve(target, 'index.html')];
    if (/^\/(todo|note)\/[^/]+$/.test(path))
      candidates.push(resolve(root, path.split('/')[1], '[id].html'));
    for (const candidate of candidates) {
      const file = Bun.file(candidate);
      if (await file.exists())
        return new Response(file, {
          headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
          },
        });
    }
    return new Response('Not found', { status: 404 });
  },
});
console.log(`2du web: ${server.url}`);
