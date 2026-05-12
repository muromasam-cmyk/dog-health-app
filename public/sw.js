const CACHE = "ron-heart-v1";

self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(clients.claim()); });

self.addEventListener("fetch", e => {
  e.respondWith(fetch(e.request).catch(() => new Response("offline")));
});

self.addEventListener("push", e => {
  const data = e.data?.json() || { title:"🐾 お薬リマインダー", body:"お薬の時間です" };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});
