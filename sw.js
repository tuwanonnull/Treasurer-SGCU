const CACHE_VERSION = "20260828-runtime-config-hotfix-1";
const CACHE_PREFIX = "treasurer-sgcu-shell";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const APP_SHELL_URLS = [
  "./",
  "./index.html",
  "./css/style.css?v=20260827-stable-staff-calendar-1",
  "./js/integrations/app.firebase-bootstrap.js?v=20260423-1",
  "./js/core/app.config.js?v=20260518-csv-refresh-2",
  "./js/integrations/app.runtime-config.js?v=20260504-1",
  "./js/core/app.core.js?v=20260627-project-budget-comparison-chart-1",
  "./js/core/app.csv-export.js?v=20260504-1",
  "./js/core/app.audit-log.js?v=20260623-audit-hardening-1",
  "./js/core/app.dialog.js?v=20260606-mobile-glass-compact-2",
  "./js/core/app.helpers.js?v=20260626-pending-approval-status-1",
  "./js/features/project/app.sorting-auth.js?v=20260627-project-budget-comparison-chart-1",
  "./js/motion/app.motion.js",
  "./js/core/app.feature-loader.js?v=20260827-local-date-default-1",
  "./js/core/app.init.js?v=20260827-meeting-scroll-offset-1",
  "./manifest.webmanifest",
  "./img/icons/treasurer-icon-192.png",
  "./img/icons/treasurer-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) return caches.delete(key);
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const updateCache = async () => {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, responseClone);
    }
    return networkResponse;
  };

  if (request.mode === "navigate") {
    event.respondWith(
      updateCache().catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (requestUrl.searchParams.has("v")) {
    event.respondWith(
      updateCache().catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        event.waitUntil(updateCache().catch(() => null));
        return cachedResponse;
      }
      return updateCache();
    })
  );
});

self.addEventListener("push", (event) => {
  const fallbackUrl = "./";
  const fallbackTitle = "Treasurer SGCU68";
  const fallbackBody = "มีการอัปเดตใหม่";
  const fallbackIcon = "img/icons/treasurer-icon-192.png";
  const fallbackBadge = "img/icons/treasurer-icon-192.png";

  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : fallbackBody };
  }

  const title = (payload.title || fallbackTitle).toString();
  const body = (payload.body || fallbackBody).toString();
  const url = (payload.url || fallbackUrl).toString();
  const icon = (payload.icon || fallbackIcon).toString();
  const badge = (payload.badge || fallbackBadge).toString();
  const data = {
    ...(payload.data || {}),
    url
  };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawTargetUrl = (event.notification?.data?.url || "./").toString();
  const targetUrl = new URL(rawTargetUrl, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          const clientUrl = new URL(client.url, self.location.origin).href;
          if (clientUrl === targetUrl) return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
