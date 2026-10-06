// Service worker : va toujours chercher la dernière version sur le réseau
// en priorité (site à jour tant qu'il y a du réseau), et ne se rabat sur
// le cache que si le réseau est indisponible (site quand même utilisable
// hors-ligne). Les données du planning passent par Apps Script et gèrent
// déjà leur propre repli via localStorage dans l'app elle-même.

const CACHE_NAME = "qgd-shell-v4";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./logo-qgd.png?v=3",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll échouerait entièrement si un seul fichier manque : on met
      // donc chaque fichier en cache indépendamment, sans bloquer les autres.
      Promise.all(
        SHELL_FILES.map((file) =>
          cache.add(file).catch(() => {
            // Ce fichier n'existe pas/plus : tant pis, on continue avec les autres.
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // On ne gère que les fichiers de la coquille de l'app (même origine).
  // Les appels vers Google Sheets / Apps Script passent toujours en direct.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Réseau OK : on sert la version fraîche, et on met à jour le cache
        // au passage pour le prochain accès hors-ligne.
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        // Pas de réseau : on se rabat sur la dernière version connue en cache.
        caches.match(event.request)
      )
  );
});
