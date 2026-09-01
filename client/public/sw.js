self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// پاس‌sthrough ساده — برای نصب‌پذیری کافی است
self.addEventListener("fetch", () => {});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.focus();
            if (client.navigate) client.navigate(target);
            return;
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
