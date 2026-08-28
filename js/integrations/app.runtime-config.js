/* Runtime config overrides stored in Firestore appSettings/global */
(function initRuntimeConfig() {
  const DEFAULT_CONFIG = JSON.parse(JSON.stringify(globalThis.SGCU_APP_CONFIG || {}));
  const SETTINGS_COLLECTION = "appSettings";
  const SETTINGS_DOC = "global";
  const WAIT_TIMEOUT_MS = 10000;
  const WAIT_INTERVAL_MS = 50;

  const isPlainObject = (value) =>
    !!value && typeof value === "object" && !Array.isArray(value);

  const deepMerge = (target, source) => {
    if (!isPlainObject(target) || !isPlainObject(source)) return target;
    Object.keys(source).forEach((key) => {
      const nextValue = source[key];
      if (isPlainObject(nextValue)) {
        if (!isPlainObject(target[key])) target[key] = {};
        deepMerge(target[key], nextValue);
        return;
      }
      if (nextValue !== undefined && nextValue !== null && nextValue !== "") {
        target[key] = nextValue;
      }
    });
    return target;
  };

  const toPositiveNumber = (value, fallback) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
  };

  const normalizeWeekdayList = (value, fallback = []) => {
    if (!Array.isArray(value)) return fallback;
    const days = value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
    return Array.from(new Set(days)).sort((a, b) => a - b);
  };

  const normalizeSettingsConfig = (config = {}) => {
    const input = isPlainObject(config) ? config : {};
    const normalized = {};

    const ttlMs = toPositiveNumber(input.cache?.ttlMs, 0);
    if (ttlMs > 0) {
      normalized.cache = { ttlMs };
    }

    const sessionMaxAgeMs = toPositiveNumber(input.auth?.sessionMaxAgeMs, 0);
    if (sessionMaxAgeMs > 0) {
      normalized.auth = { sessionMaxAgeMs };
    }

    const allowedPickupDays = normalizeWeekdayList(input.features?.borrowAssets?.allowedPickupDays);
    if (allowedPickupDays.length) {
      normalized.features = {
        borrowAssets: {
          allowedPickupDays
        }
      };
    }

    const signerRows = input.documents?.signersByAcademicYear;
    if (isPlainObject(signerRows)) {
      const normalizedSigners = {};
      Object.entries(signerRows).forEach(([rawYear, rawSigner]) => {
        const year = rawYear.toString().trim();
        if (!/^\d{4}$/.test(year) || !isPlainObject(rawSigner)) return;
        const treasurerName = (rawSigner.treasurerName || "").toString().trim();
        const treasurerPhone = (rawSigner.treasurerPhone || "").toString().trim();
        const presidentName = (rawSigner.presidentName || "").toString().trim();
        const approvalMeetingBody = (rawSigner.approvalMeetingBody || "").toString().trim();
        if (!treasurerName && !treasurerPhone && !presidentName && !approvalMeetingBody) return;
        normalizedSigners[year] = { treasurerName, treasurerPhone, presidentName, approvalMeetingBody };
      });
      normalized.documents = { signersByAcademicYear: normalizedSigners };
    }

    return normalized;
  };

  const applyConfig = (rawConfig = {}) => {
    const normalized = normalizeSettingsConfig(rawConfig);
    if (!globalThis.SGCU_APP_CONFIG) return normalized;
    deepMerge(globalThis.SGCU_APP_CONFIG, normalized);
    if (typeof window.applyRuntimeConfigAliases === "function") {
      window.applyRuntimeConfigAliases();
    }
    return normalized;
  };

  const waitForFirestore = () =>
    new Promise((resolve) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (window.sgcuFirestore?.db && window.sgcuFirestore?.doc && window.sgcuFirestore?.getDoc) {
          window.clearInterval(timer);
          resolve(window.sgcuFirestore);
          return;
        }
        if (Date.now() - startedAt >= WAIT_TIMEOUT_MS) {
          window.clearInterval(timer);
          resolve(null);
        }
      }, WAIT_INTERVAL_MS);
    });

  const loadRemoteConfig = async () => {
    const store = await waitForFirestore();
    if (!store) return null;
    const ref = store.doc(store.db, SETTINGS_COLLECTION, SETTINGS_DOC);
    const snap = await store.getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    if (data.enabled === false) return data;
    applyConfig(data.config || {});
    return data;
  };

  window.sgcuRuntimeConfig = {
    collection: SETTINGS_COLLECTION,
    docId: SETTINGS_DOC,
    defaultConfig: DEFAULT_CONFIG,
    applyConfig,
    normalizeSettingsConfig,
    loadRemoteConfig
  };

  window.sgcuRuntimeConfigReady = loadRemoteConfig().catch((error) => {
    console.warn("runtime config load failed - app.runtime-config.js:122", error);
    return null;
  });
})();
