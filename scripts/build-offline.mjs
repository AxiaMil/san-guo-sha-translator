import fs from "node:fs";
import crypto from "node:crypto";
const assets = fs
  .readdirSync("dist/assets")
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => `/assets/${f}`);
const files = [
  "/",
  "/catalog.json",
  "/rules.json",
  "/icon.svg",
  "/manifest.webmanifest",
  ...assets,
];
const revision = crypto.createHash("sha256");
for (const file of files)
  revision.update(
    fs.readFileSync(`dist/${file === "/" ? "index.html" : file.slice(1)}`),
  );
const version = revision.digest("hex").slice(0, 14);
fs.writeFileSync(
  "dist/sw.js",
  `
const CACHE = 'sha-${version}';
const ART = 'sha-art-${version}';
const PRECACHE = ${JSON.stringify(files)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' }))))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('sha-') && key !== CACHE && key !== ART) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => { if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') { event.respondWith(caches.open(CACHE).then(cache => cache.match('/').then(cached => cached || fetch(request)))); return; }
  if (PRECACHE.includes(url.pathname)) { event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname).then(cached => cached || fetch(request)))); return; }
  if (url.pathname.startsWith('/images/')) {
    event.respondWith((async () => {
      const cache = await caches.open(ART), cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await (async () => {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        for (const key of keys.slice(0, Math.max(0, keys.length - 120))) await cache.delete(key);
      })().catch(() => {});
      return response;
    })());
  }
});
`,
);
console.log(
  `Offline shell ${version}: ${files.length} files; artwork cache limited to 120 images`,
);
