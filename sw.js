/* Terrain Viewer service worker — lets the app open and show saved offline areas with no signal.
   Put this file next to index.html in your GitHub repo. */
const SHELL = 'tv-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const LIB_HOSTS = /(^|\.)unpkg\.com$|(^|\.)cdn\.jsdelivr\.net$/;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // the app page itself: always try for the newest version, fall back to the saved copy offline
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(SHELL); c.put(url.origin + url.pathname, res.clone()); }
        return res;
      } catch (err) {
        return (await caches.match(url.origin + url.pathname)) || (await caches.match(req, { ignoreSearch: true })) ||
          new Response('<h3 style="font-family:system-ui;padding:20px">No signal, and this page has not been saved for offline use yet.</h3>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // map libraries: versioned files that never change — saved copy first
  if (LIB_HOSTS.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(SHELL), hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    })());
    return;
  }

  // map tiles, elevation, saved treeshade: use a saved offline-area copy when there is one, otherwise the network
  e.respondWith((async () => {
    const hit = await caches.match(req.url, { ignoreVary: true });
    if (hit) return hit;
    return fetch(req);
  })());
});
