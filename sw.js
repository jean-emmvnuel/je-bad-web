// Service worker On Bade : app hors ligne, chargement instantané, clic sur les notifications.
// Change VERSION à chaque mise en ligne pour que les visiteurs reçoivent la nouvelle version.
const VERSION = 'jebade-web-v8';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/pwa.js', 'js/store.js', 'js/components.js', 'js/ui.js', 'js/faces.js', 'js/icons-data.js', 'js/notify.js', 'js/cropper.js', 'js/stickers.js',
  'js/views/auth.js', 'js/views/bading.js', 'js/views/compose.js', 'js/views/feed.js', 'js/views/notifications.js',
  'js/views/onboarding.js', 'js/views/privacy.js', 'js/views/profile.js', 'js/views/settings.js',
  'data/privacy.json', 'assets/favicon.svg', 'assets/favicon.ico', 'assets/apple-touch-icon.png', 'assets/icon-192.png', 'assets/icon-512.png',
];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages (liens partagés compris) : réseau d'abord, la coquille en cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); return res; })
        .catch(() => caches.match('index.html')),
    );
    return;
  }

  // Polices et GSAP : cache d'abord (ils ne changent pas).
  if (CDN.test(req.url)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })),
    );
    return;
  }

  // Fichiers du site : réponse immédiate du cache, mise à jour en arrière-plan.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })),
    );
  }
});

// Clic sur une notification : ouvre l'écran concerné dans la fenêtre existante, sinon en ouvre une.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const path = e.notification.data?.path || '/';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
    if (win) { await win.focus(); win.postMessage({ type: 'navigate', path }); return; }
    await self.clients.openWindow(`./#${path}`);
  })());
});
