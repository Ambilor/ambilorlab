/* Mis Finanzas · Ambilor.Lab
   Service worker: red primero, caché como respaldo.
   Así el teléfono siempre ve la última versión cuando hay internet,
   y sigue funcionando sin conexión con lo último que descargó. */
const CACHE = 'mis-finanzas-v8';
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './manifest.webmanifest',
  './js/mf-gas.js',
  './js/mf-server.js',
  './js/mf-run.js',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Uno por uno: si un archivo falla, no se cae toda la instalación.
    await Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Solo lo propio: los iconos vienen de un CDN y los maneja el navegador.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-store' });
      if (res && res.status === 200 && res.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw e;
    }
  })());
});
