const CACHE_NAME = 'ierihon-app-shell-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx'
];

// Install: pre-cache critical shell assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-cache non-fatal error:', err);
      });
    })
  );
});

// Activate: clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for app assets, bypass for external APIs & Firebase
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET requests, Firebase / Google APIs, Telegram WebApp scripts, and backend API endpoints
  if (
    request.method !== 'GET' ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('telegram.org') ||
    url.pathname.startsWith('/api/') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // Stale-While-Revalidate strategy for static resources & HTML
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and no network, return cached version or fallback
          return cachedResponse;
        });

      // If we have a cached version, return it immediately (0ms delay), network updates in background
      return cachedResponse || fetchPromise;
    })
  );
});
