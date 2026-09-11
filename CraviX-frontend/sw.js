/* =========================================================
   SERVICE WORKER — push notification delivery
   This is the piece that lets a notification arrive even when no
   tab of the site is open: the browser keeps this worker registered
   and wakes it specifically to handle an incoming push, completely
   independent of whether the page itself is running.

   Deliberately NOT doing any asset caching / offline-app behavior
   here — this worker exists solely for push, to avoid the far more
   invasive (and easy to get subtly wrong) job of caching the whole
   site. Nothing about page loading changes because of this file.
   ========================================================= */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "CraviX", body: "You have an update." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  const isAdminAlert = data.tag === "new-order";

  const options = {
    body: data.body,
    icon: "images/brand/favicon-192.png",
    badge: "images/icons/badge-96.png",
    tag: data.tag || undefined,
    // renotify only matters when `tag` groups multiple notifications
    // together (e.g. repeated status updates for the same order) —
    // without it, a second push with the same tag would silently
    // replace the first without actually alerting the person again.
    renotify: !!data.tag,
    data: { url: data.url || "/" },
    vibrate: [120, 60, 120],
    // Explicit, not omitted. Leaving `silent` unset lets some Chromium
    // builds fall back to whatever the LAST notification on this device
    // used instead of a clean default — one ambiguous push in the past
    // is enough to leave a device stuck muted with no code-visible cause.
    // Stating it plainly on every push is what actually fixes that.
    silent: false,
    // New-order alerts for the admin device stay on screen until acted
    // on — this is a "don't miss an order" alert, not a passive update,
    // the same way delivery-partner apps keep ringing/showing until the
    // order is acknowledged.
    requireInteraction: isAdminAlert,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() =>
      // A push can arrive while a tab is already open — in that case
      // several browsers (Chrome included) deliberately don't play the
      // OS notification sound at all if that tab is focused, since they
      // assume the person is already looking at the site. That's the
      // exact "silent notification" behavior reported. Tell every open
      // tab a push just landed so the page itself can play a real sound
      // (see js/notify.js), independent of what the OS layer decided.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "shadab-push", payload: data }));
      })
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Prefer focusing an already-open tab over spawning a new one.
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(targetUrl).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
