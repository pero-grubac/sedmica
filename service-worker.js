const CACHE_NAME = "sedmica-v1";

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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
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
