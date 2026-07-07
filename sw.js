/* CARNET QUEST — Service Worker offline-first.
   Estrategia: precache del shell + cache-first con actualización en segundo plano. */
const VERSION = 'cq-v8';
const PRECACHE = [
  './',
  'index.html',
  'landing.html',
  'exito.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/app.css',
  'fonts/anton-latin.woff2',
  'fonts/overpass-latin-var.woff2',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/main.js',
  'js/state.js',
  'js/data.js',
  'js/srs.js',
  'js/mission.js',
  'js/predictor.js',
  'js/audio.js',
  'js/juice.js',
  'js/signs.js',
  'js/sharecard.js',
  'js/screens.js',
  'datos/strings.es.json',
  'datos/mundos.json',
  'datos/senales.json',
  'datos/senales.expanded.json',
  // banco completo: los 15 mundos
  'datos/preguntas/mundo-01.json',
  'datos/preguntas/mundo-02.json',
  'datos/preguntas/mundo-03.json',
  'datos/preguntas/mundo-04.json',
  'datos/preguntas/mundo-05.json',
  'datos/preguntas/mundo-06.json',
  'datos/preguntas/mundo-07.json',
  'datos/preguntas/mundo-08.json',
  'datos/preguntas/mundo-09.json',
  'datos/preguntas/mundo-10.json',
  'datos/preguntas/mundo-11.json',
  'datos/preguntas/mundo-12.json',
  'datos/preguntas/mundo-13.json',
  'datos/preguntas/mundo-14.json',
  'datos/preguntas/mundo-15.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const red = fetch(e.request)
        .then((resp) => {
          if (resp && resp.status === 200) cache.put(e.request, resp.clone());
          return resp;
        })
        .catch(() => cached);
      // cache-first: instantáneo y offline; la red refresca para la próxima
      return cached || red;
    })
  );
});
