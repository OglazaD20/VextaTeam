// LifeFlow service worker — handles incoming Web Push events and lets the
// user jump back into the app from a notification. No offline caching here;
// that's a separate concern from push delivery and isn't what was asked for.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "LifeFlow", body: event.data.text() };
  }

  const title = payload.title || "LifeFlow";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/today" },
    tag: payload.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/today";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clientList.length > 0 && "focus" in clientList[0]) {
        clientList[0].navigate(url);
        return clientList[0].focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
