// Mis Finanzas · app del teléfono · guarda la app para abrirla sin internet.
// Cambiar VERSION en cada entrega: así el teléfono baja los archivos nuevos.
const VERSION = "mf-telefono-3.0.1";
const APP = ["./", "./index.html", "./manifest.webmanifest", "./js/gas-local.js", "./js/motor.js", "./js/local.js",
  "./icons/icon.svg", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
  "./icons/atajo-gasto.png", "./icons/atajo-ingreso.png"];
// Íconos y fuentes del panel: se guardan si se puede (no impiden instalar la app)
const TABLER = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/";
const FUENTES = "https://ambilor.github.io/ambilorlab/fuentes/";
const EXTERNOS = [TABLER + "tabler-icons.min.css", TABLER + "fonts/tabler-icons.woff2?v3.19.0",
  FUENTES + "inter-400.woff2", FUENTES + "inter-500.woff2", FUENTES + "inter-600.woff2", FUENTES + "inter-700.woff2", FUENTES + "jetbrains-mono-500.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)
    .then(() => Promise.all(EXTERNOS.map(u => c.add(new Request(u, { mode: "cors" })).catch(() => {})))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k.indexOf("mf-") === 0 && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Abrir la app (también con ?a=registrar… o #pwa=…): siempre la copia guardada
  if (req.mode === "navigate" && url.origin === location.origin && url.pathname.startsWith(new URL("./", location).pathname)) {
    e.respondWith(caches.match("./index.html").then(r => r || fetch(req)));
    return;
  }
  const propio = url.origin === location.origin && url.pathname.startsWith(new URL("./", location).pathname);
  if (propio || url.href.startsWith(TABLER) || url.href.startsWith(FUENTES)) {
    e.respondWith(caches.match(req, { ignoreSearch: propio }).then(g => g || fetch(req).then(res => {
      if (res && res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
      return res;
    })));
  }
  // Lo demás (mindicador.cl, la planilla de Google) va directo a la red
});
