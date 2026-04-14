// FitLog SW - sin caché, siempre sirve la versión más reciente
const VERSION = 'fitlog-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sin caché: siempre va a la red
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => new Response('Sin conexión', { status: 503 })));
});
