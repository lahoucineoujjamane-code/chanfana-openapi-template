/* يعمل التطبيق بالكامل دون إنترنت */
const CACHE = "tabib-v3";
const ASSETS = [
  "./", "./index.html", "./manifest.json", "./css/style.css",
  "./js/i18n/ui.js",
  "./js/i18n/en-meta.js", "./js/i18n/en-herbs.js", "./js/i18n/en-oils-drugs.js", "./js/i18n/en-diseases-1.js", "./js/i18n/en-diseases-2.js", "./js/i18n/fr-meta.js", "./js/i18n/fr-herbs.js", "./js/i18n/fr-oils-drugs.js", "./js/i18n/fr-diseases-1.js", "./js/i18n/fr-diseases-2.js",
  "./js/engine.js", "./js/app.js",
  "./js/data/symptoms.js", "./js/data/cultures.js", "./js/data/herbs.js", "./js/data/herbs-extra.js", "./js/data/diseases-extra.js",
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
