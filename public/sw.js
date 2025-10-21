// Offline-capable service worker with cache-first runtime strategy
const CACHE_VERSION = 'diapaudio-v1-2025-10-21';
const CACHE_NAME = CACHE_VERSION;

function buildAppShellList() {
  // Ensure correct base path (e.g., https://user.github.io/diapaudio/)
  const base = self.registration.scope; // absolute URL ending with '/'
  const urls = ['', 'index.html', 'manifest.webmanifest', 'favicon.svg', 'logo.svg'];
  return urls.map((p) => new URL(p, base).toString());
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(buildAppShellList()))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // SPA navigation requests -> serve cached index.html (app shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(new URL('index.html', self.registration.scope).toString()).then((cached) => {
        return (
          cached || fetch(new URL('index.html', self.registration.scope).toString())
        );
      })
    );
    return;
  }

  // Same-origin assets: cache-first with lazy population
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((resp) => {
            const respClone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone)).catch(() => {});
            return resp;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Cross-origin: network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then((resp) => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req))
  );
});
