const CACHE = "elimu-owner-pwa-20261021-v13";
const CORE = ["./", "./index.html", "./styles.css?v=20261021-m1", "./app.js?v=20261021-m1", "./config.js?v=20261021-m1", "./manifest.webmanifest", "./assets/school-logo.png", "./assets/static/elimu-logo.png", "./assets/static/icon-192.png", "./assets/static/icon-512.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u)))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
// Réseau d'abord ; cache en secours. Les appels Apps Script (autre origine) ne sont jamais mis en cache.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))));
});
