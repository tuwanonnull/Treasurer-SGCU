/* Feature loader: page -> scripts + on-demand loading */
(function initFeatureLoader() {
  if (window.sgcuFeatureLoader) return;

  const config = {
    assetVersion: window.sgcuAssetVersion || "dev",
    vendorScripts: {
      chart: "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
      papa: "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"
    },
    pageScripts: {
      home: [
        "js/features/docs/app.file-links.js",
        "js/features/news/app.news.js"
      ],
      "org-structure": "js/features/org/app.org.js",
      news: [
        "js/features/docs/app.file-links.js",
        "js/features/news/app.news.js"
      ],
      "financial-docs": [
        "js/features/docs/app.file-links.js",
        "js/features/docs/app.downloads.js"
      ],
      "project-status": [
        "js/features/project/app.project-ui.js",
        "js/features/project/app.advance-loan-pdf.js",
        "js/features/project/app.receipt-documents.js",
        "js/features/project/app.project-modal.js",
        "js/features/project/app.charts.js",
        "js/features/project/app.pie.js",
        "js/features/project/app.calendar.js",
        "js/features/project/app.data.js"
      ],
      "treasurer-handover-staff": [],
      "dashboard-staff": [
        "js/features/project/app.project-ui.js",
        "js/features/project/app.advance-loan-pdf.js",
        "js/features/project/app.receipt-documents.js",
        "js/features/project/app.project-modal.js",
        "js/features/project/app.document-signers.js",
        "js/features/project/app.charts.js",
        "js/features/project/app.pie.js",
        "js/features/project/app.calendar.js",
        "js/features/project/app.data.js"
      ],
      "borrow-assets": [
        "js/features/project/app.data.js",
        "js/features/borrow/app.borrow-assets.js"
      ],
      "borrow-assets-staff": [
        "js/features/project/app.data.js",
        "js/features/borrow/app.borrow-assets.js"
      ],
      "meeting-room-booking": "js/features/booking/app.meeting-room-booking.js",
      "meeting-room-staff": [
        "js/features/booking/app.meeting-room-booking.js",
        "js/features/booking/app.meeting-room-staff.js"
      ],
      "budget-approval-request": "js/features/budget/app.budget-request.js",
      login: [
        "js/features/staff/app.staff-access.shared.js",
        "js/features/staff/app.staff-access.catalog.js",
        "js/features/staff/app.staff-access.catalog-view.js",
        "js/features/staff/app.staff-access.js",
        "js/features/budget/app.budget-request.js"
      ],
      "staff-application": [
        "js/features/staff/app.staff-access.shared.js",
        "js/features/staff/app.staff-access.catalog.js",
        "js/features/staff/app.staff-access.catalog-view.js",
        "js/features/staff/app.staff-access.js"
      ],
      "staff-approval": [
        "js/features/staff/app.staff-access.shared.js",
        "js/features/staff/app.staff-access.catalog.js",
        "js/features/staff/app.staff-access.catalog-view.js",
        "js/features/staff/app.staff-access.js",
        "js/features/budget/app.budget-staff.js"
      ],
      "staff-directory-staff": [
        "js/features/staff/app.staff-access.shared.js",
        "js/features/staff/app.staff-access.catalog.js",
        "js/features/staff/app.staff-access.catalog-view.js",
        "js/features/staff/app.staff-access.js"
      ],
      "staff-temporary-access-staff": [
        "js/features/staff/app.staff-access.shared.js",
        "js/features/staff/app.staff-access.catalog.js",
        "js/features/staff/app.staff-access.catalog-view.js",
        "js/features/staff/app.staff-access.js"
      ],
      "org-representative-approval-staff": [
        "js/features/staff/app.staff-access.shared.js",
        "js/features/staff/app.staff-access.catalog.js",
        "js/features/staff/app.staff-access.catalog-view.js",
        "js/features/staff/app.staff-access.js"
      ],
      "content-management-staff": [
        "js/features/docs/app.file-links.js",
        "js/features/content/app.content-management.js"
      ],
      "content-news-staff": [
        "js/features/docs/app.file-links.js",
        "js/features/content/app.content-management.js"
      ],
      "content-documents-staff": [
        "js/features/docs/app.file-links.js",
        "js/features/content/app.content-management.js"
      ],
      "system-data-staff": "js/features/staff/app.health-check.js",
      "budget-approval-staff": [
        "js/features/project/app.data.js",
        "js/features/budget/app.budget-org-options.js",
        "js/features/budget/app.budget-staff.js"
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
        window.registerThemeChartPlugin?.();
      }
      return;
    }
    const src = config.vendorScripts[key];
    if (!src) return;
    await loadScriptOnce(src);
    if (key === "chart" && typeof window.registerCenterTextPlugin === "function") {
      window.registerCenterTextPlugin();
      window.registerThemeChartPlugin?.();
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
