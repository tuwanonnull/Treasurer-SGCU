/* Web notification + Web Push helper */
(function initSgcuWebPush() {
  if (window.sgcuWebPush) return;

  const DEFAULT_ICON = "img/icons/treasurer-icon-192.png";
  const DEFAULT_BADGE = "img/icons/treasurer-icon-192.png";
  const DEFAULT_SW_URL = "./sw.js?v=20260503-1";
  const config = {
    applicationServerKey: "",
    configEndpoint: "/api/push/config",
    subscribeEndpoint: "",
    unsubscribeEndpoint: "",
    testEndpoint: "",
    meetingEventEndpoint: ""
  };
  const bootstrapConfig = window.sgcuPushConfig || {};
  if (typeof bootstrapConfig.applicationServerKey === "string") {
    config.applicationServerKey = bootstrapConfig.applicationServerKey.trim();
  }
  if (typeof bootstrapConfig.subscribeEndpoint === "string") {
    config.subscribeEndpoint = bootstrapConfig.subscribeEndpoint.trim();
  }
  if (typeof bootstrapConfig.unsubscribeEndpoint === "string") {
    config.unsubscribeEndpoint = bootstrapConfig.unsubscribeEndpoint.trim();
  }
  if (typeof bootstrapConfig.configEndpoint === "string") {
    config.configEndpoint = bootstrapConfig.configEndpoint.trim();
  }
  if (typeof bootstrapConfig.testEndpoint === "string") {
    config.testEndpoint = bootstrapConfig.testEndpoint.trim();
  }
  if (typeof bootstrapConfig.meetingEventEndpoint === "string") {
    config.meetingEventEndpoint = bootstrapConfig.meetingEventEndpoint.trim();
  }

  const isLocalDevHost = () => {
    const host = (window.location?.hostname || "").toString().toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  };

  const disableLocalDevServiceWorker = async () => {
    if (!isLocalDevHost() || !("serviceWorker" in window.navigator)) return;
    try {
      const registrations = await window.navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (_) {
      // Ignore local cleanup failures; reload or hard refresh can still bypass stale assets.
    }
    try {
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch (_) {
      // Cache APIs can be unavailable in some browser modes.
    }
  };

  const toUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(normalized);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const isSubscriptionForKey = (subscription, publicKey) => {
    const currentKey = subscription?.options?.applicationServerKey;
    if (!currentKey || !publicKey) return false;
    const currentBytes = new Uint8Array(currentKey);
    const expectedBytes = toUint8Array(publicKey);
    if (currentBytes.length !== expectedBytes.length) return false;
    return currentBytes.every((value, index) => value === expectedBytes[index]);
  };

  const isIOS = () => /iPad|iPhone|iPod/.test(window.navigator.userAgent || "");

  const isStandalone = () => {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    return window.navigator.standalone === true;
  };

  const isNotificationSupported = () =>
    typeof window !== "undefined" &&
    typeof window.Notification !== "undefined";

  const isPushSupported = () =>
    typeof window !== "undefined" &&
    "serviceWorker" in window.navigator &&
    "PushManager" in window &&
    isNotificationSupported();

  const emitStateChanged = () => {
    window.dispatchEvent(new CustomEvent("sgcu:webpush-state-changed"));
  };

  const getPermission = () => (isNotificationSupported() ? Notification.permission : "unsupported");

  const ensureServiceWorkerRegistration = async () => {
    if (!("serviceWorker" in window.navigator)) return null;
    if (isLocalDevHost()) {
      await disableLocalDevServiceWorker();
      return null;
    }
    try {
      const swUrl = (window.sgcuServiceWorkerUrl || DEFAULT_SW_URL).toString().trim() || DEFAULT_SW_URL;
      const registration = await window.navigator.serviceWorker.register(swUrl);
      if (typeof registration.update === "function") {
        void registration.update();
      }
      return registration;
    } catch (_) {
      return null;
    }
  };

  const getSubscription = async () => {
    if (!isPushSupported()) return null;
    const registration = await ensureServiceWorkerRegistration();
    if (!registration?.pushManager) return null;
    try {
      return await registration.pushManager.getSubscription();
    } catch (_) {
      return null;
    }
  };

  const getAuthHeaders = async () => {
    const user = window.sgcuAuth?.auth?.currentUser;
    if (!user?.getIdToken) throw new Error("push-auth-required");
    const token = await user.getIdToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const loadServerConfig = async () => {
    if (config.applicationServerKey || !config.configEndpoint) return config.applicationServerKey;
    const response = await fetch(config.configEndpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("push-config-unavailable");
    const payload = await response.json();
    config.applicationServerKey = (payload.applicationServerKey || "").toString().trim();
    return config.applicationServerKey;
  };

  const postSubscriptionToBackend = async (mode, payload) => {
    const endpoint =
      mode === "subscribe"
        ? config.subscribeEndpoint
        : config.unsubscribeEndpoint;
    if (!endpoint) return;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`push-backend-${response.status}`);
    return response.json();
  };

  const requestPermission = async () => {
    if (!isNotificationSupported()) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    try {
      const result = await Notification.requestPermission();
      emitStateChanged();
      return result;
    } catch (_) {
      return Notification.permission;
    }
  };

  const showNotification = async (title, body, options = {}) => {
    if (!isNotificationSupported()) return false;
    if (Notification.permission !== "granted") return false;
    const mergedOptions = {
      body: body || "",
      icon: options.icon || DEFAULT_ICON,
      badge: options.badge || DEFAULT_BADGE,
      data: options.data || {}
    };

    const registration = await ensureServiceWorkerRegistration();
    if (registration && typeof registration.showNotification === "function") {
      await registration.showNotification(title, mergedOptions);
      return true;
    }

    // eslint-disable-next-line no-new
    new Notification(title, mergedOptions);
    return true;
  };

  const subscribePush = async (meta = {}) => {
    if (!isPushSupported()) throw new Error("push-not-supported");
    if (Notification.permission !== "granted") {
      const permission = await requestPermission();
      if (permission !== "granted") throw new Error("notification-permission-not-granted");
    }
    const vapidPublicKey = (await loadServerConfig() || "").toString().trim();
    if (!vapidPublicKey) {
      throw new Error("missing-vapid-public-key");
    }

    const registration = await ensureServiceWorkerRegistration();
    if (!registration?.pushManager) throw new Error("push-manager-unavailable");

    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !isSubscriptionForKey(subscription, vapidPublicKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapidPublicKey)
      });
    }
    await postSubscriptionToBackend("subscribe", {
      subscription: subscription.toJSON(),
      meta
    });
    emitStateChanged();
    return subscription;
  };

  const unsubscribePush = async (meta = {}) => {
    if (!isPushSupported()) return false;
    const subscription = await getSubscription();
    if (!subscription) return false;

    await postSubscriptionToBackend("unsubscribe", {
      endpoint: subscription.endpoint,
      meta
    });
    const unsubscribed = await subscription.unsubscribe();
    emitStateChanged();
    return unsubscribed;
  };

  const getClientState = async () => {
    const permission = getPermission();
    const pushSupported = isPushSupported();
    const subscription = pushSupported ? await getSubscription() : null;
    let currentKey = "";
    if (subscription) {
      currentKey = await loadServerConfig().catch(() => "");
    }
    const staleSubscription = !!subscription && !!currentKey && !isSubscriptionForKey(subscription, currentKey);
    return {
      supported: isNotificationSupported(),
      pushSupported,
      permission,
      subscribed: !!subscription && !staleSubscription,
      staleSubscription,
      standalone: isStandalone(),
      isIOS: isIOS()
    };
  };

  const sendTestPush = async () => {
    if (!config.testEndpoint) throw new Error("missing-push-test-endpoint");
    const response = await fetch(config.testEndpoint, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `push-test-${response.status}`);
    return payload;
  };

  const dispatchMeetingNotification = async (bookingId, previousStatus = "") => {
    if (!config.meetingEventEndpoint) throw new Error("missing-meeting-push-endpoint");
    const response = await fetch(config.meetingEventEndpoint, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ bookingId, previousStatus })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `meeting-push-${response.status}`);
    return payload;
  };

  const setConfig = (nextConfig = {}) => {
    if (typeof nextConfig.applicationServerKey === "string") {
      config.applicationServerKey = nextConfig.applicationServerKey.trim();
    }
    if (typeof nextConfig.subscribeEndpoint === "string") {
      config.subscribeEndpoint = nextConfig.subscribeEndpoint.trim();
    }
    if (typeof nextConfig.unsubscribeEndpoint === "string") {
      config.unsubscribeEndpoint = nextConfig.unsubscribeEndpoint.trim();
    }
    if (typeof nextConfig.configEndpoint === "string") {
      config.configEndpoint = nextConfig.configEndpoint.trim();
    }
    if (typeof nextConfig.testEndpoint === "string") {
      config.testEndpoint = nextConfig.testEndpoint.trim();
    }
    if (typeof nextConfig.meetingEventEndpoint === "string") {
      config.meetingEventEndpoint = nextConfig.meetingEventEndpoint.trim();
    }
    emitStateChanged();
  };

  window.sgcuWebPush = {
    setConfig,
    getPermission,
    getClientState,
    requestPermission,
    showNotification,
    subscribePush,
    unsubscribePush,
    sendTestPush,
    dispatchMeetingNotification
  };

  if (isLocalDevHost()) {
    void disableLocalDevServiceWorker();
  } else if ("serviceWorker" in window.navigator) {
    let didRefreshForNewWorker = false;
    let hadServiceWorkerController = !!window.navigator.serviceWorker.controller;
    const serviceWorkerUrl = (window.sgcuServiceWorkerUrl || DEFAULT_SW_URL).toString().trim() || DEFAULT_SW_URL;
    const reloadStorageKey = `sgcu-sw-controller-reload:${serviceWorkerUrl}`;
    const hasReloadedForCurrentWorker = () => {
      try {
        return window.sessionStorage?.getItem(reloadStorageKey) === "1";
      } catch (_) {
        return didRefreshForNewWorker;
      }
    };
    const markReloadedForCurrentWorker = () => {
      try {
        window.sessionStorage?.setItem(reloadStorageKey, "1");
      } catch (_) {
        // sessionStorage can be unavailable in restricted browsing contexts.
      }
    };
    window.navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadServiceWorkerController) {
        hadServiceWorkerController = true;
        return;
      }
      if (didRefreshForNewWorker) return;
      if (hasReloadedForCurrentWorker()) return;
      didRefreshForNewWorker = true;
      markReloadedForCurrentWorker();
      window.location.reload();
    });
    const registerWhenIdle = () => {
      void ensureServiceWorkerRegistration();
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(registerWhenIdle, { timeout: 4000 });
    } else {
      window.setTimeout(registerWhenIdle, 2500);
    }
  }
})();
