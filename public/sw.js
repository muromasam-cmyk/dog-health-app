// Service Worker - ロンの心臓病管理アプリ
const CACHE = "ron-heart-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});

// fetch はキャッシュせず素通し（Viteのビルドに任せる）
self.addEventListener("fetch", e => {
  e.respondWith(fetch(e.request).catch(() => new Response("offline")));
});

// プッシュ通知受信（将来のサーバープッシュ用）
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
