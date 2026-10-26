// Mis Finanzas · app sin conexión · guarda la app en el teléfono para abrirla sin internet.
// Cambiar VERSION en cada entrega: así el teléfono baja los archivos nuevos.
const VERSION = "mf-app-1.0";
const APP = ["./", "./index.html", "./manifest.webmanifest", "./css/app.css", "./js/app.js", "./js/db.js", "./js/utils.js",
  "./icons/icon.svg", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
  "./icons/atajo-gasto.png", "./icons/atajo-ingreso.png", "./icons/atajo-subir.png"];
const FUENTES = "https://ambilor.github.io/ambilorlab/fuentes/";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Abrir la app (también con ?nuevo=…, ?atajo=… o #pwa=…): siempre la copia guardada, con o sin internet
  if (req.mode === "navigate" && url.origin === location.origin) {
    e.respondWith(caches.match("./index.html").then(r => r || fetch(req)));
    return;
  }
  // Archivos de la app y fuentes de la marca: primero lo guardado; lo que falte se guarda al bajarlo
  if (url.origin === location.origin || url.href.startsWith(FUENTES)) {
    e.respondWith(caches.match(req, { ignoreSearch: url.origin === location.origin }).then(guardado => guardado || fetch(req).then(res => {
      if (res && res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
      return res;
    })));
  }
  // Todo lo demás (el panel de Google) pasa directo a la red
});
