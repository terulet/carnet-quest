/* sw.js — Service Worker: PWA offline-first para Carnet Quest.
   Cachea el "app shell" + los datos. Estrategia: cache-first con
   actualización en segundo plano (stale-while-revalidate) para los JSON. */
var VERSION = 'carnetquest-v1';
var CORE = [
  './',
  './index.html',
  './css/style.css',
  './js/contenido.js',
  './js/senales.js',
  './js/store.js',
  './js/banco.js',
  './js/motor-repaso.js',
  './js/radar.js',
  './js/mezclador.js',
  './js/gamification.js',
  './js/juice.js',
  './js/app.js',
  './manifest.webmanifest'
];
// datos
for (var i = 1; i <= 15; i++) {
  CORE.push('./datos/tema-' + (i < 10 ? '0' + i : i) + '.json');
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      // No fallar la instalación si un recurso opcional no está
      return Promise.allSettled(CORE.map(function (u) { return c.add(u); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
