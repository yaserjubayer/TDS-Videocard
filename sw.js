const CACHE_NAME = 'tds-videocard-studio-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './videocard.html',
  './manifest.json',
  './TDS%20Logo%20no%20background.png'
];

// 1. Install: Pre-cache core studio files and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
});

// 2. Activate: Purge all old caches (v1-v3) and take control of open pages immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Network-First for same-origin files with offline cache fallback
self.addEventListener('fetch', (event) => {
  // Never intercept local video blob: URLs or non-GET requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const isSameOrigin = new URL(event.request.url).origin === self.location.origin;
  const networkFetch = isSameOrigin
    ? fetch(event.request, { cache: 'no-cache' })
    : fetch(event.request);

  event.respondWith(
    networkFetch
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
