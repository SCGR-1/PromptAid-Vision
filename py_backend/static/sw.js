const STATIC_CACHE = 'static-v3';
const DYNAMIC_CACHE = 'dynamic-v3';

const isHttpGet = (req) => {
  try {
    if (!req || req.method !== 'GET') return false;
    const u = new URL(req.url);
    return (u.protocol === 'http:' || u.protocol === 'https:');
  } catch { return false; }
};
const isSameOrigin = (req) => {
  try { return new URL(req.url).origin === self.location.origin; } catch { return false; }
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(['/','/index.html','/vite.svg']);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // If you enabled navigationPreload in page code, either keep it:
    // await self.registration.navigationPreload.enable();
    // or disable to remove the warning:
    try { await self.registration.navigationPreload.disable(); } catch {}
    const names = await caches.keys();
    await Promise.all(names.map((n) => (n === STATIC_CACHE || n === DYNAMIC_CACHE) ? null : caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignore non-http(s) or non-GET (extensions, blob:, data:, etc.)
  if (!isHttpGet(req)) return;

  const url = new URL(req.url);

  // Handle navigations (SPA shell) + optional preload
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      // If preload is enabled, prefer it
      const pre = await event.preloadResponse;
      if (pre) return pre;
      try {
        const net = await fetch(req);
        return net;
      } catch {
        const cached = await caches.match('/index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // API: network-first, cache successful same-origin GETs
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      try {
        const resp = await fetch(req);
        if (resp.ok && isSameOrigin(req)) {
          try {
            const c = await caches.open(DYNAMIC_CACHE);
            await c.put(req, resp.clone());
          } catch {}
        }
        return resp;
      } catch {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // Assets (script/style/image/font): cache-first
  const dest = req.destination;
  const isAsset = dest === 'script' || dest === 'style' || dest === 'image' || dest === 'font';
  if (isAsset) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const resp = await fetch(req);
      if (resp.ok && isSameOrigin(req)) {
        try {
          const c = await caches.open(STATIC_CACHE);
          await c.put(req, resp.clone());
        } catch {}
      }
      return resp;
    })());
    return;
  }

  // Default: network-first with safe cache
  event.respondWith((async () => {
    try {
      const resp = await fetch(req);
      if (resp.ok && isSameOrigin(req)) {
        try {
          const c = await caches.open(DYNAMIC_CACHE);
          await c.put(req, resp.clone());
        } catch {}
      }
      return resp;
    } catch {
      const cached = await caches.match(req);
      return cached || Response.error();
    }
  })());
});
