// Unregister any legacy Service Worker and clear CacheStorage immediately
(function () {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (var i = 0; i < registrations.length; i++) {
          registrations[i].unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(function (names) {
        for (var j = 0; j < names.length; j++) {
          caches.delete(names[j]);
        }
      });
    }
  } catch (_e) {
    // ignore
  }
})();
