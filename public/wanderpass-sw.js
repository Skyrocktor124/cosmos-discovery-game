// Wanderpass offline cache.
//
// Scope is the whole site (the script sits at the site root so it can reach the
// shared /assets/ bundle), but the fetch handler deliberately only touches two
// things: the wallet's own pages, and content-hashed build assets. Everything
// else on this domain is left entirely alone.

const CACHE = 'wanderpass-v1';

const owns = url =>
  url.origin === self.location.origin &&
  (url.pathname.includes('/trip-wallet/') || url.pathname.includes('/assets/'));

const shellUrl = new URL('trip-wallet/index.html', self.registration.scope).href;

// Static hosts commonly answer with `Vary: Origin`, and a cached entry stored
// without an Origin header would then never match the CORS-mode requests Vite's
// module scripts make — which is exactly the offline case this cache exists for.
const MATCH = { ignoreVary: true };

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll([shellUrl]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k.startsWith('wanderpass-') && k !== CACHE).map(k => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// The page reports the resources it loaded before this worker took control.
self.addEventListener('message', event => {
  const { type, urls } = event.data ?? {};
  if (type !== 'cache-urls' || !Array.isArray(urls)) return;
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(
        urls
          .filter(u => {
            try {
              return owns(new URL(u));
            } catch {
              return false;
            }
          })
          .map(u => cache.add(u).catch(() => undefined)),
      ),
    ),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (!owns(url)) return;

  // Navigations: prefer the network so a redeploy is picked up immediately,
  // fall back to the cached shell when there is no signal.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(shellUrl, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(shellUrl, MATCH).then(hit => hit ?? Response.error())),
    );
    return;
  }

  // Build assets carry a content hash in the filename, so a cache hit can never
  // be stale — serve it and skip the network entirely.
  event.respondWith(
    caches.match(request, MATCH).then(hit => {
      if (hit) return hit;
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      });
    }),
  );
});
