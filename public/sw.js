
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() || "یک یادآوری مالی داری." };
  }

  const title = data.title || "چرک کف دست من";
  const options = {
    body: data.body || "موعد یک پرداخت رسیده است.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.url || "/" },
    dir: "rtl",
    lang: "fa"
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const windowClient of windows) {
          if ("focus" in windowClient) {
            windowClient.navigate(url);
            return windowClient.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
