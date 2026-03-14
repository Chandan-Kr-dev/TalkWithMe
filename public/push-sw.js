self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch (err) {
      return {};
    }
  })();

  const title = data.title || "New message";
  const body = data.body || "You have a new message";
  const url = data.url || "/";
  const tag = data.tag || "talkwithme-message";

  const options = {
    body,
    icon: data.icon || "/logo.png",
    badge: data.badge || "/logo.png",
    data: { url },
    tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const matchingClient = clientList.find((client) => client.url.includes(targetUrl));
      if (matchingClient) {
        return matchingClient.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
