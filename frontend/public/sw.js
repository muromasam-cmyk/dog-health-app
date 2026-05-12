// ロンの心臓病管理 - Service Worker v2
// バックグラウンドでも Web Push を受信して通知を表示する

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

// ── fetch: ネットワーク優先、失敗時はキャッシュ ──────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Web Push 受信（アプリが閉じていても発火する） ──────────────────
self.addEventListener('push', e => {
  let data = { title: '🐾 お薬リマインダー', body: 'お薬の時間です', icon: '/icon-192.png' };
  try { data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      tag: data.tag || 'med-reminder',
      data: { url: self.location.origin },
    })
  );
});

// ── 通知タップ: アプリを前面に表示 ───────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || self.location.origin;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.startsWith(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
