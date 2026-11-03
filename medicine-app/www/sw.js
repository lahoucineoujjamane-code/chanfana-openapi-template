/* يعمل التطبيق بالكامل دون إنترنت */
const CACHE = "tabib-v1";
const ASSETS = [
  "./", "./index.html", "./manifest.json", "./css/style.css",
  "./js/engine.js", "./js/app.js",
  "./js/data/symptoms.js", "./js/data/cultures.js", "./js/data/herbs.js",
  "./js/data/oils.js", "./js/data/drugs.js", "./js/data/diseases.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
