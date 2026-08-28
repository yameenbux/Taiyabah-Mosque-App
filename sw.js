/* Taiyabah Masjid service worker
   Copyright (c) 2026 Yameen Bux. All rights reserved.
   Built by Yameen Bux — github.com/yameenbux. See LICENSE.md. */

/* Taiyabah Masjid — service worker (v1 shell)
   Caches the app shell so today's times open offline.
   Push handling is stubbed; the store build wires this to OneSignal/APNs/FCM. */
const CACHE = "taiyabah-v96";
const SHELL = ["./index.html", "./admin.html", "./manifest.webmanifest", "./logo-cream.png", "./icon-192.png?v=2", "./icon-512.png?v=2", "./apple-touch-icon.png?v=2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // never intercept the OneSignal worker scope
  if (new URL(e.request.url).pathname.includes("/push/onesignal/")) return;
  const url = new URL(e.request.url);

  // Timetable data: network-first so committee corrections reach devices,
  // falling back to cache when offline.
  if (url.pathname.endsWith("timetable-2026.json")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* A language pack is the one piece of this content that changes: the Qur'an
     does not, but a translation is corrected. Cache-first here meant a phone
     that had the pack kept being handed the same old copy no matter how many
     times the app asked for a newer one — so the app's background refresh
     could never actually see new words. Network-first, falling back to the
     cache, keeps it correct online and still works with no signal. */
  if (url.origin === self.location.origin &&
      /^\/lang\//.test(url.pathname) && /\.js$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit ||
        /* a cache-busted ?v= URL was never cached; fall back to the plain one */
        caches.match(url.origin + url.pathname)))
    );
    return;
  }

  /* Content the app fetches after launch — the Qur'an, the athkār and duʿās.
     None of it was ever put in the cache, so it was re-fetched on every open
     and unavailable without a signal. Serve from cache when it is there,
     otherwise fetch and keep a copy, so a sūrah read once can be read again in
     the masjid basement with no bars. */
  if (url.origin === self.location.origin &&
      /^\/quran\//.test(url.pathname) && /\.(json|js)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }))
    );
    return;
  }

  /* Shell: cache-first.

     The offline fallback is index.html, which is right for a page the person
     navigated to and wrong for anything else — a failed request for a JSON
     file was answered with a page of HTML, which then failed to parse. Only
     navigations get the shell now; everything else is allowed to fail as a
     failure, which the app already handles and reports. */
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch((err) => {
      if (e.request.mode === "navigate") return caches.match("./index.html");
      throw err;
    }))
  );
});

/* --- push: active. Works with any provider that sends a JSON payload
   of { title, body, tag, url }. Until a provider is connected, the
   send screen raises notifications locally via showNotification(). --- */
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data && e.data.text() }; }
  const title = data.title || "Taiyabah Masjid";
  e.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    tag: data.tag || "general",
    icon: "icon-192.png",
    badge: "icon-192.png",
    data: { url: data.url || "./index.html" }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./index.html";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
