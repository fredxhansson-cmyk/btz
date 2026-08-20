// BTZ service worker.
//
// Keeps the studio installable and usable offline.
const CACHE = 'flow-studio-v4';
const CORE = [
  '/',
  '/flow-clock.worklet.js',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStudioAsset = (url) => url.pathname.startsWith('/_next/static/')
  || url.pathname === '/flow-clock.worklet.js'
  || url.pathname === '/manifest.webmanifest'
  || url.pathname.startsWith('/icon-')
  || url.pathname === '/apple-touch-icon.png';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The app shell: network first so a new build always wins, with the cached
  // copy as the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((hit) => hit || Response.error())),
    );
    return;
  }

  // Build assets and studio files: serve from cache, refresh in the background.
  if (isStudioAsset(url)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || network;
      }),
    );
  }
});
