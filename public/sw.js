// OPIT Tracker service worker — makes the app installable and fast.
// Never caches /api (your data always comes fresh from the server).
const CACHE = "opit-v1"
const OFFLINE = "/offline.html"

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([OFFLINE, "/icon-192.png"])))
  self.skipWaiting()
})

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url)
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return

  // Pages: network first, offline page if there's no connection
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)))
    return
  }
  // Build assets (hashed file names): cache first
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res
    })))
  }
})
