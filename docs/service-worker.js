const CACHE = "nexoterracore-mobile-v15";

const APP_SHELL = [
  "./",
  "./painel/",
  "./turing/",
  "./turing/manifest.webmanifest",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/turing.js",
  "./js/projetos.js",
  "./js/loteamento-campanha.js",
  "./js/projeto-turing.js",
  "./js/contas-seguranca.js",
  "./js/admin-control.js",
  "./js/control-plane.js",
  "./icons/nexoterracore-192.png",
  "./icons/nexoterracore-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const copia = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copia));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
