/* Fichário de Inglês — service worker: abre sem internet e mantém a versão mais nova quando há conexão. */
const VERSION = 'fichario-v2.0.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './qrcode.js', './icon-192.png', './icon-512.png', './maskable-512.png', './apple-touch-icon.png', './favicon-64.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fichario-v') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(
        Promise.race([fetch(req), timeout(3500)])
          .then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); } return res; })
          .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
      );
      return;
    }
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; });
      return hit || net;
    }));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('fichario-fonts').then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
