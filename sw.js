/* Taiyabah Masjid service worker
   Copyright (c) 2026 Yameen Bux. All rights reserved.
   Built by Yameen Bux — github.com/yameenbux. See LICENSE.md. */

/* Taiyabah Masjid — service worker (v1 shell)
   Caches the app shell so today's times open offline.
   Push handling is stubbed; the store build wires this to OneSignal/APNs/FCM. */
const CACHE = "taiyabah-v53";
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

  // Shell: cache-first.
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() => caches.match("./index.html")))
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
