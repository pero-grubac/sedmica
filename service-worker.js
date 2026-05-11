const CACHE_NAME = "sedmica-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/fonts/playfair-display-v40-latin-600.woff2",
  "./assets/fonts/playfair-display-v40-latin-700.woff2",
  "./assets/fonts/source-sans-3-v19-latin-300.woff2",
  "./assets/fonts/source-sans-3-v19-latin-regular.woff2",
  "./assets/fonts/source-sans-3-v19-latin-600.woff2",
  "./assets/fonts/source-sans-3-v19-latin-700.woff2",
];

const isLocal =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  if (isLocal) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (isLocal) {
    self.clients.claim();
    return;
  }
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // On localhost — always go to network, never cache
  if (isLocal) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        })
      );
    }),
  );
});
