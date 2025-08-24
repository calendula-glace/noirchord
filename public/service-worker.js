// public/service-worker.js  — 既存SWの掃除用（1回限り）
self.addEventListener('install', (e) => {
  // すぐ新SWに切り替え
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // すべてのキャッシュを削除
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // このSW自体を登録解除
      await self.registration.unregister();

      // すべてのクライアントをリロードして新ページを取得
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});

// 何も奪わない（古いSWのfetchハンドラを無効化）
self.addEventListener('fetch', () => {});
