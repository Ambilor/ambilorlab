// La app se mudó: este service worker reemplaza al anterior, borra su copia guardada y se da de baja.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.indexOf("mf-") === 0).map(k => caches.delete(k))))
    .then(() => self.registration.unregister())
    .then(() => self.clients.matchAll({ type: "window" }))
    .then(cs => cs.forEach(c => c.navigate(c.url))));
});
