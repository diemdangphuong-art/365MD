// 365MD ERP Security & Cache Reset Service Worker (v25)
// Destroys any legacy cached UI ("DANH SÁCH TÀI KHOẢN HIỆN CÓ") and forces fresh network load.

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (name) {
            return caches.delete(name);
          })
        );
      })
      .then(function () {
        return self.registration.unregister();
      })
      .then(function () {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then(function (clients) {
        clients.forEach(function (client) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});
