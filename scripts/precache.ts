// Runs after `expo export`: writes the build's file list into sw.js. The bytes of sw.js
// change whenever any file does, which is how browsers notice a new build.
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const root = 'build/web';
// Route-group duplicates and pages the service worker never serves.
const skip = /^(sw\.js$|\(tabs\)\/|_sitemap\.html$|\+not-found\.html$)|\.map$/;

const files = [...new Bun.Glob('**/*').scanSync({ cwd: root })].filter((f) => !skip.test(f)).sort();
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(await Bun.file(join(root, file)).bytes());
}

const worker = join(root, 'sw.js');
const source = await Bun.file(worker).text();
const placeholder = 'self.__BUILD__';
if (!source.includes(placeholder)) throw new Error(`${worker} has no ${placeholder} placeholder`);
const build = { version: hash.digest('hex').slice(0, 16), files: files.map((f) => `/${f}`) };
await Bun.write(
  worker,
  source.replace(placeholder, () => JSON.stringify(build))
);
console.log(`sw.js: ${files.length} files, version ${build.version}`);
