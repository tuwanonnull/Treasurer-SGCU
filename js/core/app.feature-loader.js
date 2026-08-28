/* Feature loader: page -> scripts + on-demand loading */
(function initFeatureLoader() {
  if (window.sgcuFeatureLoader) return;

  const config = {
    assetVersion: window.sgcuAssetVersion || "20260505-1",
    vendorScripts: {
      chart: "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
      papa: "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"
    },
    pageScripts: {
      home: [
        "js/features/docs/app.file-links.js?v=20260417-1",
        "js/features/news/app.news.js?v=20260417-1"
      ],
      scoreboard: [
        "js/features/project/app.project-ui.js?v=20260519-club-debt-age-donut-card-1",
        "js/features/project/app.calendar.js",
        "js/features/project/app.data.js?v=20260518-csv-refresh-1",
        "js/features/news/app.scoreboard.js?v=20260501-1"
      ],
      "org-structure": "js/features/org/app.org.js?v=20260503-1",
      news: [
        "js/features/docs/app.file-links.js?v=20260417-1",
        "js/features/news/app.news.js?v=20260417-1"
      ],
      "financial-docs": [
        "js/features/docs/app.file-links.js?v=20260417-1",
        "js/features/docs/app.downloads.js?v=20260501-1"
      ],
      "project-status": [
        "js/features/project/app.project-ui.js?v=20260519-club-debt-age-donut-card-1",
        "js/features/project/app.project-modal.js",
        "js/features/project/app.charts.js",
        "js/features/project/app.pie.js",
        "js/features/project/app.calendar.js",
        "js/features/project/app.data.js?v=20260518-csv-refresh-1"
      ],
      "treasurer-handover-staff": [],
      "dashboard-staff": [
        "js/features/project/app.project-ui.js?v=20260519-club-debt-age-donut-card-1",
        "js/features/project/app.project-modal.js",
        "js/features/project/app.document-signers.js?v=20260828-runtime-reload-1",
        "js/features/project/app.charts.js",
        "js/features/project/app.pie.js",
        "js/features/project/app.calendar.js",
        "js/features/project/app.data.js?v=20260518-csv-refresh-1"
      ],
      "borrow-assets": "js/features/borrow/app.borrow-assets.js?v=20260825-request-number-counter-2",
      "borrow-assets-staff": "js/features/borrow/app.borrow-assets.js?v=20260825-request-number-counter-2",
      "meeting-room-booking": "js/features/booking/app.meeting-room-booking.js?v=20260827-local-date-default-1",
      "meeting-room-staff": [
        "js/features/booking/app.meeting-room-booking.js?v=20260827-local-date-default-1",
        "js/features/booking/app.meeting-room-staff.js?v=20260827-decouple-calendar-list-1"
      ],
      "budget-approval-request": "js/features/budget/app.budget-request.js?v=20260623-audit-hardening-1",
      login: [
        "js/features/staff/app.staff-access.js?v=20260827-position-access-sync-1",
        "js/features/budget/app.budget-request.js?v=20260623-audit-hardening-1"
      ],
      "staff-application": "js/features/staff/app.staff-access.js?v=20260827-position-access-sync-1",
      "staff-approval": [
        "js/features/staff/app.staff-access.js?v=20260827-position-access-sync-1",
        "js/features/budget/app.budget-staff.js?v=20260614-budget-chart-mobile-1"
      ],
      "staff-directory-staff": "js/features/staff/app.staff-access.js?v=20260827-position-access-sync-1",
      "staff-temporary-access-staff": "js/features/staff/app.staff-access.js?v=20260827-position-access-sync-1",
      "org-representative-approval-staff": "js/features/staff/app.staff-access.js?v=20260827-position-access-sync-1",
      "content-management-staff": [
        "js/features/docs/app.file-links.js?v=20260417-1",
        "js/features/content/app.content-management.js?v=20260506-1"
      ],
      "content-news-staff": [
        "js/features/docs/app.file-links.js?v=20260417-1",
        "js/features/content/app.content-management.js?v=20260506-1"
      ],
      "content-documents-staff": [
        "js/features/docs/app.file-links.js?v=20260417-1",
        "js/features/content/app.content-management.js?v=20260506-1"
      ],
      "system-data-staff": "js/features/staff/app.health-check.js?v=20260520-1",
      "budget-approval-staff": [
        "js/features/project/app.data.js?v=20260518-csv-refresh-1",
        "js/features/budget/app.budget-org-options.js?v=20260613-budget-org-options-5",
        "js/features/budget/app.budget-staff.js?v=20260614-budget-chart-mobile-1"
      ]
    },
    idlePrefetchPages: []
  };

  const loadedFeatureScripts = new Map();

  const withAssetVersion = (src) => {
    const scriptSrc = (src || "").toString().trim();
    if (!scriptSrc || /^https?:\/\//i.test(scriptSrc)) return scriptSrc;
    const [path] = scriptSrc.split("?");
    return `${path}?v=${encodeURIComponent(config.assetVersion)}`;
  };

  const toScriptList = (value) => {
    if (Array.isArray(value)) {
      return value.map(withAssetVersion).filter(Boolean);
    }
    const one = withAssetVersion(value);
    return one ? [one] : [];
  };

  const loadScriptOnce = async (src) => {
    const scriptSrc = (src || "").toString().trim();
    if (!scriptSrc) return;
    if (loadedFeatureScripts.has(scriptSrc)) {
      await loadedFeatureScripts.get(scriptSrc);
      return;
    }

    const promise = new Promise((resolve, reject) => {
      const scriptEl = document.createElement("script");
      scriptEl.src = scriptSrc;
      scriptEl.defer = true;
      scriptEl.async = false;
      scriptEl.onload = () => resolve();
      scriptEl.onerror = () => reject(new Error(`failed to load ${scriptSrc}`));
      document.body.appendChild(scriptEl);
    }).catch((error) => {
      loadedFeatureScripts.delete(scriptSrc);
      throw error;
    });

    loadedFeatureScripts.set(scriptSrc, promise);
    try {
      await promise;
    } catch (error) {
      const [fallbackSrc] = scriptSrc.split("?");
      const canRetryWithCacheBust = fallbackSrc && !/^https?:\/\//i.test(scriptSrc) && !/[?&]retry=/.test(scriptSrc);
      if (canRetryWithCacheBust) {
        const retrySrc = `${fallbackSrc}?v=${encodeURIComponent(config.assetVersion)}&retry=${Date.now()}`;
        try {
          await loadScriptOnce(retrySrc);
          return;
        } catch (_) {
          // fall through to the unversioned fallback below
        }
      }
      if (!fallbackSrc || fallbackSrc === scriptSrc || /^https?:\/\//i.test(scriptSrc)) {
        throw error;
      }
      await loadScriptOnce(fallbackSrc);
    }
  };

  const ensurePageLoaded = async (page) => {
    const scripts = toScriptList(config.pageScripts[page]);
    for (const src of scripts) {
      await loadScriptOnce(src);
    }
  };

  const ensureVendorLoaded = async (key, globalName) => {
    if (globalName && window[globalName]) {
      if (key === "chart" && typeof window.registerCenterTextPlugin === "function") {
        window.registerCenterTextPlugin();
      }
      return;
    }
    const src = config.vendorScripts[key];
    if (!src) return;
    await loadScriptOnce(src);
    if (key === "chart" && typeof window.registerCenterTextPlugin === "function") {
      window.registerCenterTextPlugin();
    }
  };

  const scheduleIdle = (task, timeout = 2000) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => task(), { timeout });
    } else {
      window.setTimeout(task, 0);
    }
  };

  const prefetchInIdle = (currentPage = "") => {
    const pages = Array.isArray(config.idlePrefetchPages) ? config.idlePrefetchPages : [];
    if (!pages.length) return;

    scheduleIdle(() => {
      pages
        .filter((page) => page && page !== currentPage)
        .forEach((page) => {
          const scripts = toScriptList(config.pageScripts[page]);
          scripts.forEach((src) => {
            void loadScriptOnce(src).catch(() => {
              // ignore idle prefetch failures; page navigation will retry
            });
          });
        });
    }, 2500);
  };

  window.sgcuFeatureLoaderConfig = config;
  window.sgcuFeatureLoader = {
    config,
    ensurePageLoaded,
    prefetchInIdle
  };
  window.sgcuVendorLoader = {
    ensureChart: () => ensureVendorLoaded("chart", "Chart"),
    ensurePapa: () => ensureVendorLoaded("papa", "Papa")
  };
})();
