// Service Worker für die installierte App „Planner“.
// Lädt immer zuerst frisch aus dem Netz (Updates nach einem Push sind sofort da);
// nur ohne Netz wird die zuletzt geladene Version aus dem Zwischenspeicher gezeigt.
// Daten von Supabase (andere Adresse) werden nie zwischengespeichert.
var CACHE = 'planner-v1';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) { return hit || caches.match('/'); });
  }));
});
