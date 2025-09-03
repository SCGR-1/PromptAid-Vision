const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

// Precache minimal shell (optional — you can skip if serving hashed assets)
const PRECACHE = ['/', '/index.html', '/vite.svg'];

const isHttpGet = (req) => {
  try {
    if (req.method !== 'GET') return false;
    const u = new URL(req.url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((n) => {
          if (n !== STATIC_CACHE && n !== DYNAMIC_CACHE) return caches.delete(n);
        })
      )
    )
  );
  self.clients.claim();
});

// Core fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET or non-http(s)
  if (!isHttpGet(request)) return;

  const url = new URL(request.url);

  // 1) SPA navigation fallback: serve index.html for client routes
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2) API: Network-first, cache successful responses
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.ok && isHttpGet(request)) {
            const copy = resp.clone();
            caches.open(DYNAMIC_CACHE).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3) Static assets: Cache-first for script/style/image/font
  const dest = request.destination;
  const isAsset =
    dest === 'script' || dest === 'style' || dest === 'image' || dest === 'font';

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((resp) => {
          if (resp && resp.ok && isHttpGet(request)) {
            const copy = resp.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
          }
          return resp;
        });
      })
    );
    return;
  }

  // 4) Everything else: network-first with safe cache
  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp && resp.ok && isHttpGet(request)) {
          const copy = resp.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, copy));
        }
        return resp;
      })
      .catch(() => caches.match(request))
  );
});
