// Service worker du QG des Daronnes — réseau d'abord (les mises à jour
// du site s'affichent tout de suite), cache en secours hors-ligne.
const CACHE_NAME = "qgd-v1";
const ASSETS = ["./", "./index.html", "./manifest.json", "./logo-qgd.png", "./logo-qgd-192.png", "./logo-qgd-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // On ne touche qu'aux fichiers du site lui-même (jamais Apps Script, polices, etc.)
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
