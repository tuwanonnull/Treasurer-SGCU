(function initSgcuHealthCheck() {
  if (window.sgcuHealthCheck) return;

  const CHECK_TIMEOUT_MS = 6000;
  const SHEET_TIMEOUT_MS = 8000;
  const AUTH_READY_TIMEOUT_MS = 4500;
  const STAFF_HEAD_EMAIL_OVERRIDES = new Set([
    "tuwanon.kimchiang@gmail.com",
    "treasurer.sgcu68@gmail.com"
  ]);
  const state = {
    rows: [],
    running: false,
    initialized: false,
    activeTab: "health"
  };

  const $ = (id) => document.getElementById(id);
  const normalizeText = (value) => (value == null ? "" : String(value).trim());
  const escapeHtml = (value) =>
    normalizeText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");

  const getConfig = () => (window.SGCU_APP_CONFIG && typeof window.SGCU_APP_CONFIG === "object")
    ? window.SGCU_APP_CONFIG
    : {};

  const getCollections = () => getConfig().firestore?.collections || {};
  const getFirestore = () => window.sgcuFirestore || {};
  const getCurrentUser = () => window.sgcuAuth?.auth?.currentUser || null;
  const getFirebaseProjectId = () =>
    normalizeText(window.sgcuAuth?.auth?.app?.options?.projectId || window.sgcuFirestore?.db?.app?.options?.projectId);
  const getActivePageName = () =>
    normalizeText(document.querySelector(".page-view.active")?.dataset?.page) ||
    normalizeText(window.location?.hash).replace(/^#/, "") ||
    "-";

  const statusLabel = {
    ok: "ผ่าน",
    warn: "ควรตรวจต่อ",
    error: "ผิดปกติ",
    pending: "กำลังตรวจ"
  };

  const toErrorMessage = (error) => {
    if (!error) return "ไม่ทราบสาเหตุ";
    const code = normalizeText(error.code);
    const message = normalizeText(error.message);
    return [code, message].filter(Boolean).join(": ") || "ไม่ทราบสาเหตุ";
  };

  const withTimeout = (promise, timeoutMs = CHECK_TIMEOUT_MS) =>
    new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("timeout")), timeoutMs);
      Promise.resolve(promise)
        .then(resolve)
        .catch(reject)
        .finally(() => window.clearTimeout(timer));
    });

  const makeRow = (name, status, detail, action = "") => ({
    name,
    status,
    detail,
    action
  });

  const makeSkippedStaffRow = (name) =>
    makeRow(name, "warn", "ข้ามการตรวจเพราะยังไม่มี session staff", "เข้าสู่ระบบด้วยบัญชี staff แล้วตรวจอีกครั้ง");

  const formatList = (items, maxItems = 6) => {
    const list = (Array.isArray(items) ? items : [])
      .map(normalizeText)
      .filter(Boolean);
    if (!list.length) return "-";
    const visible = list.slice(0, maxItems);
    const remaining = list.length - visible.length;
    return `${visible.join(", ")}${remaining > 0 ? ` +${remaining}` : ""}`;
  };

  const waitForAuthReady = async () => {
    const authBridge = window.sgcuAuth || {};
    if (!authBridge.auth || typeof authBridge.onAuthStateChanged !== "function") return getCurrentUser();
    if (authBridge.auth.currentUser) return authBridge.auth.currentUser;
    return withTimeout(
      new Promise((resolve) => {
        let unsubscribe = null;
        unsubscribe = authBridge.onAuthStateChanged(
          authBridge.auth,
          (user) => {
            if (typeof unsubscribe === "function") unsubscribe();
            resolve(user || null);
          },
          () => {
            if (typeof unsubscribe === "function") unsubscribe();
            resolve(null);
          }
        );
      }),
      AUTH_READY_TIMEOUT_MS
    ).catch(() => getCurrentUser());
  };

  const render = () => {
    const body = $("systemHealthTableBody");
    const caption = $("systemHealthCaption");
    const okCountEl = $("systemHealthOkCount");
    const warnCountEl = $("systemHealthWarnCount");
    const errorCountEl = $("systemHealthErrorCount");
    const copyBtn = $("systemHealthCopyBtn");
    if (!body) return;

    const rows = state.rows;
    const okCount = rows.filter((row) => row.status === "ok").length;
    const warnCount = rows.filter((row) => row.status === "warn").length;
    const errorCount = rows.filter((row) => row.status === "error").length;

    if (okCountEl) okCountEl.textContent = okCount.toLocaleString("th-TH");
    if (warnCountEl) warnCountEl.textContent = warnCount.toLocaleString("th-TH");
    if (errorCountEl) errorCountEl.textContent = errorCount.toLocaleString("th-TH");
    if (copyBtn) copyBtn.disabled = !rows.length || state.running;
    if (caption) {
      caption.textContent = state.running
        ? "กำลังตรวจระบบ..."
        : rows.length
          ? `ตรวจล่าสุด ${new Date().toLocaleString("th-TH")} พบผิดปกติ ${errorCount.toLocaleString("th-TH")} รายการ`
          : "กดตรวจระบบเพื่อดูว่าส่วนสำคัญพร้อมใช้งานหรือมีจุดที่ต้องแก้";
    }

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4">ยังไม่ได้ตรวจระบบ</td></tr>';
      return;
    }

    body.innerHTML = rows.map((row) => `
      <tr class="system-health-row is-${escapeHtml(row.status)}">
        <td data-label="ส่วนที่ตรวจ">${escapeHtml(row.name)}</td>
        <td data-label="สถานะ"><span class="system-health-badge is-${escapeHtml(row.status)}">${escapeHtml(statusLabel[row.status] || row.status)}</span></td>
        <td data-label="รายละเอียด">${escapeHtml(row.detail)}</td>
        <td data-label="สิ่งที่ควรทำ">${escapeHtml(row.action || "-")}</td>
      </tr>
    `).join("");
  };

  const setStatus = (text, tone = "") => {
    const el = $("systemHealthStatus");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.tone = tone || "";
    el.hidden = !text;
  };

  const syncSystemDataTabs = () => {
    document.querySelectorAll("[data-system-data-tab]").forEach((btn) => {
      const tab = normalizeText(btn.dataset.systemDataTab || "health") || "health";
      const isActive = tab === state.activeTab;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      if (btn.dataset.systemDataTabBound === "true") return;
      btn.dataset.systemDataTabBound = "true";
      btn.addEventListener("click", () => {
        state.activeTab = tab;
        syncSystemDataTabs();
      });
    });

    document.querySelectorAll("[data-system-data-panel]").forEach((panel) => {
      const tab = normalizeText(panel.dataset.systemDataPanel || "health") || "health";
      panel.hidden = tab !== state.activeTab;
    });
  };

  const checkFirebaseBootstrap = async () => {
    const store = getFirestore();
    const auth = window.sgcuAuth || {};
    const missing = [];
    if (!store.db) missing.push("Firestore db");
    if (!store.doc || !store.collection || !store.getDoc || !store.getDocs) missing.push("Firestore helpers");
    if (!auth.auth || !auth.onAuthStateChanged) missing.push("Auth helpers");
    if (missing.length) {
      return makeRow("Firebase SDK", "error", `ยังโหลดไม่ครบ: ${missing.join(", ")}`, "รีเฟรชหน้าเว็บ ถ้ายังไม่หายให้ตรวจ network หรือ Firebase script");
    }
    return makeRow("Firebase SDK", "ok", "โหลด Auth และ Firestore bridge แล้ว", "");
  };

  const checkAuthSession = async () => {
    const user = getCurrentUser();
    if (!user) {
      return makeRow("บัญชีผู้ดูแล", "error", "ยังไม่ได้เข้าสู่ระบบ", "เข้าสู่ระบบด้วยบัญชี staff แล้วตรวจอีกครั้ง");
    }
    const email = normalizeText(user.email).toLowerCase();
    return makeRow("บัญชีผู้ดูแล", "ok", `เข้าสู่ระบบเป็น ${email || user.uid || "บัญชี Firebase"}`, "");
  };

  const checkEnvironment = async () => {
    const parts = [
      `asset=${normalizeText(window.sgcuAssetVersion || getConfig().assetVersion || "-")}`,
      `project=${getFirebaseProjectId() || "-"}`,
      `host=${normalizeText(window.location?.host || "-")}`,
      `page=${getActivePageName()}`,
      `sw=${navigator.serviceWorker?.controller ? "controlled" : "not-controlled"}`
    ];
    const browser = normalizeText(navigator.userAgent)
      .replace(/\s+/g, " ")
      .slice(0, 120);
    return makeRow("Environment", "ok", `${parts.join(" | ")} | browser=${browser || "-"}`, "");
  };

  const checkRuntimeConfig = async () => {
    if (!window.sgcuRuntimeConfigReady) {
      return makeRow("Runtime config", "warn", "ไม่พบตัวโหลด appSettings/global", "ตรวจว่า app.runtime-config.js โหลดอยู่ในหน้าเว็บ");
    }
    try {
      const data = await withTimeout(window.sgcuRuntimeConfigReady, CHECK_TIMEOUT_MS);
      if (!data) {
        return makeRow("Runtime config", "warn", "ไม่พบ appSettings/global หรืออ่านไม่ได้ แต่ config ตั้งต้นยังใช้งานได้", "ถ้าต้องแก้ค่า runtime ให้สร้าง/ตรวจ document appSettings/global");
      }
      if (data.enabled === false) {
        return makeRow("Runtime config", "warn", "appSettings/global ถูกปิด enabled=false", "เปิด enabled หรือยืนยันว่าตั้งใจใช้ config ในโค้ด");
      }
      return makeRow("Runtime config", "ok", "อ่าน appSettings/global แล้ว", "");
    } catch (error) {
      return makeRow("Runtime config", "warn", toErrorMessage(error), "ตรวจ Firestore rules และ document appSettings/global");
    }
  };

  const checkDocumentRead = async ({ label, collection, docId, requireExists = false, action = "" }) => {
    const store = getFirestore();
    if (!store.db || !store.doc || !store.getDoc) {
      return makeRow(label, "error", "Firestore helper ไม่พร้อม", "ตรวจ Firebase SDK");
    }
    try {
      const ref = store.doc(store.db, collection, docId);
      const snap = await withTimeout(store.getDoc(ref));
      if (!snap.exists()) {
        return makeRow(
          label,
          requireExists ? "warn" : "ok",
          `อ่าน ${collection}/${docId} ได้ แต่ยังไม่มี document`,
          action || "สร้างข้อมูลถ้าฟีเจอร์นี้ต้องใช้"
        );
      }
      return makeRow(label, "ok", `อ่าน ${collection}/${docId} ได้`, "");
    } catch (error) {
      return makeRow(label, "error", toErrorMessage(error), action || "ตรวจสิทธิ์ Firestore rules และบัญชี staff");
    }
  };

  const normalizeRoleLabel = (role) => {
    const value = normalizeText(role);
    if (!value) return "-";
    if (value.split(",").map((item) => normalizeText(item)).includes("0")) return `${value} (Head Staff)`;
    return value;
  };

  const isHeadStaffProfile = (profile = {}, email = "") => {
    const profileEmail = normalizeText(profile.email || email).toLowerCase();
    const roleTokens = normalizeText(profile.role)
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
    const yyCodes = [
      profile.divisionCodeYY,
      profile.positionCodeYY,
      ...(Array.isArray(profile.divisionCodesYY) ? profile.divisionCodesYY : []),
      ...(Array.isArray(profile.positions)
        ? profile.positions.map((item) => item?.yy || item?.positionCodeYY || item?.divisionCodeYY)
        : [])
    ].map((item) => normalizeText(item).padStart(2, "0"));
    const position = normalizeText(profile.position);
    return (
      STAFF_HEAD_EMAIL_OVERRIDES.has(profileEmail) ||
      roleTokens.includes("0") ||
      yyCodes.includes("00") ||
      position.includes("เหรัญญิก")
    );
  };

  const checkStaffProfile = async ({ collection, email }) => {
    const store = getFirestore();
    const staffEmail = normalizeText(email).toLowerCase();
    if (!store.db || !store.doc || !store.getDoc) {
      return makeRow("สิทธิ์ staff profile", "error", "Firestore helper ไม่พร้อม", "ตรวจ Firebase SDK");
    }
    if (!staffEmail) {
      return makeRow("สิทธิ์ staff profile", "error", "ไม่มีอีเมลผู้ใช้ปัจจุบัน", "เข้าสู่ระบบใหม่");
    }
    try {
      const ref = store.doc(store.db, collection, staffEmail);
      const snap = await withTimeout(store.getDoc(ref));
      if (!snap.exists()) {
        if (STAFF_HEAD_EMAIL_OVERRIDES.has(staffEmail)) {
          return makeRow("สิทธิ์ staff profile", "ok", `อีเมล ${staffEmail} อยู่ใน bootstrap Head Staff overrides`, "ควรสร้าง staffProfiles ไว้ภายหลังถ้าต้องการ metadata/allowedPages");
        }
        return makeRow("สิทธิ์ staff profile", "warn", `อ่าน ${collection}/${staffEmail} ได้ แต่ยังไม่มี document`, "ให้ Head Staff ตรวจ staffProfiles ของอีเมลนี้");
      }
      const data = snap.data() || {};
      const isHead = isHeadStaffProfile(data, staffEmail);
      const role = normalizeRoleLabel(data.role);
      const status = normalizeText(data.status || "active").toLowerCase();
      const position = normalizeText(data.position || data.positionCode || data.positionCodeYY || data.divisionCodeYY || "-");
      const allowedPages = Array.isArray(data.allowedPages)
        ? data.allowedPages
        : Array.isArray(data.positions)
          ? data.positions.flatMap((item) => Array.isArray(item?.allowedPages) ? item.allowedPages : [])
          : [];
      const normalizedPages = Array.from(new Set(allowedPages.map(normalizeText).filter(Boolean)));
      const hasStaffSignal = Boolean(
        normalizeText(data.role) ||
        normalizeText(data.positionCodeYY) ||
        normalizeText(data.divisionCodeYY) ||
        (Array.isArray(data.positions) && data.positions.length)
      );
      const details = [
        `role=${role}`,
        `status=${status || "-"}`,
        `position=${position}`,
        `allowedPages=${formatList(normalizedPages)}`
      ].join(" | ");
      if (status && status !== "active" && status !== "approved") {
        return makeRow("สิทธิ์ staff profile", "warn", details, "ตรวจสถานะ profile ว่ายังใช้งานได้หรือไม่");
      }
      if (!hasStaffSignal) {
        return makeRow("สิทธิ์ staff profile", "warn", details, "เติม role, positionCodeYY, divisionCodeYY หรือ positions ให้ profile");
      }
      if (!normalizedPages.length && !isHead) {
        return makeRow("สิทธิ์ staff profile", "warn", details, "ตรวจ allowedPages ถ้าบัญชีนี้เข้าเมนู staff บางหน้าไม่ได้");
      }
      return makeRow("สิทธิ์ staff profile", "ok", details, "");
    } catch (error) {
      return makeRow("สิทธิ์ staff profile", "error", toErrorMessage(error), "ให้ Head Staff ตรวจ staffProfiles และ Firestore rules");
    }
  };

  const checkCollectionRead = async ({ label, collection, orderBy = "", action = "" }) => {
    const store = getFirestore();
    if (!store.db || !store.collection || !store.getDocs) {
      return makeRow(label, "error", "Firestore helper ไม่พร้อม", "ตรวจ Firebase SDK");
    }
    try {
      const parts = [store.collection(store.db, collection)];
      if (orderBy && store.orderBy) parts.push(store.orderBy(orderBy, "desc"));
      if (store.limit) parts.push(store.limit(1));
      const ref = store.query ? store.query(...parts) : parts[0];
      const snap = await withTimeout(store.getDocs(ref));
      return makeRow(label, "ok", `อ่าน collection ${collection} ได้ (${snap.size || 0} ตัวอย่าง)`, "");
    } catch (error) {
      const message = toErrorMessage(error);
      const needsIndex = message.includes("index");
      return makeRow(
        label,
        needsIndex ? "warn" : "error",
        message,
        needsIndex ? "เปิดลิงก์สร้าง index จาก console/Firebase error" : (action || "ตรวจ Firestore rules และสิทธิ์ staff")
      );
    }
  };

  const checkSheet = async ({ label, url, action = "" }) => {
    const sheetUrl = normalizeText(url);
    if (!sheetUrl) {
      return makeRow(label, "warn", "ยังไม่ได้ตั้งค่าลิงก์", action || "เพิ่มลิงก์ใน config หรือย้ายไปจัดการผ่าน Staff UI");
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SHEET_TIMEOUT_MS);
    try {
      const response = await fetch(sheetUrl, {
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) {
        return makeRow(label, "error", `โหลดไม่ได้ HTTP ${response.status}`, action || "ตรวจ published CSV และ permission ของ Google Sheets");
      }
      const text = await response.text();
      const size = text.length;
      if (!size) {
        return makeRow(label, "warn", "โหลดได้แต่ไฟล์ว่าง", "ตรวจชีตต้นทางและการ publish เป็น CSV");
      }
      return makeRow(label, "ok", `โหลด CSV ได้ ${size.toLocaleString("th-TH")} ตัวอักษร`, "");
    } catch (error) {
      const detail = error?.name === "AbortError" ? "timeout" : toErrorMessage(error);
      return makeRow(label, "error", detail, action || "ตรวจลิงก์ published CSV, permission และ network");
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const checkLocalStorage = async () => {
    const key = "sgcu_health_check_probe";
    try {
      window.localStorage?.setItem(key, String(Date.now()));
      const value = window.localStorage?.getItem(key);
      window.localStorage?.removeItem(key);
      if (!value) {
        return makeRow("Browser localStorage", "warn", "เขียนแล้วอ่านกลับไม่ได้", "ให้ผู้ใช้ปิด private mode หรือเคลียร์ storage");
      }
      return makeRow("Browser localStorage", "ok", "เขียน อ่าน และลบค่า cache ได้", "");
    } catch (error) {
      return makeRow("Browser localStorage", "warn", toErrorMessage(error), "ผู้ใช้บางเครื่องอาจต้องเปิด storage permission หรือเคลียร์ cache");
    }
  };

  const checkServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) {
      return makeRow("Service worker", "warn", "browser นี้ไม่รองรับ service worker", "ใช้ browser รุ่นใหม่เมื่อต้องตรวจ cache");
    }
    const host = (window.location?.hostname || "").toString().toLowerCase();
    const isLocalDevHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    try {
      const registration = await withTimeout(navigator.serviceWorker.getRegistration(), CHECK_TIMEOUT_MS);
      const scriptUrl = registration?.active?.scriptURL || registration?.waiting?.scriptURL || registration?.installing?.scriptURL || "";
      if (!registration) {
        if (isLocalDevHost) {
          return makeRow("Service worker", "ok", "ปิดใช้งานบน local dev เพื่อกัน cache เก่า", "ไม่ต้องแก้ ถ้าเป็น localhost/127.0.0.1");
        }
        return makeRow("Service worker", "warn", "ยังไม่มี registration", "รีเฟรชหน้าเว็บหรือ deploy ใหม่ถ้า cache ไม่อัปเดต");
      }
      return makeRow("Service worker", "ok", scriptUrl ? `ลงทะเบียนแล้ว: ${scriptUrl}` : "ลงทะเบียนแล้ว", "");
    } catch (error) {
      return makeRow("Service worker", "warn", toErrorMessage(error), "ตรวจ cache/version ถ้าผู้ใช้เห็นไฟล์เก่า");
    }
  };

  const checkCacheStorage = async () => {
    if (!("caches" in window)) {
      return makeRow("Cache storage", "warn", "browser นี้ไม่รองรับ Cache API", "ข้ามได้ถ้าไม่ได้ debug cache");
    }
    try {
      const keys = await withTimeout(window.caches.keys(), CHECK_TIMEOUT_MS);
      return makeRow("Cache storage", "ok", keys.length ? `พบ cache ${keys.join(", ")}` : "ยังไม่มี cache key", "");
    } catch (error) {
      return makeRow("Cache storage", "warn", toErrorMessage(error), "ลองล้าง site data ถ้า asset ไม่อัปเดต");
    }
  };

  const runChecks = async () => {
    if (state.running) return;
    state.running = true;
    const runBtn = $("systemHealthRunBtn");
    if (runBtn) runBtn.disabled = true;
    state.rows = [makeRow("Health Check", "pending", "กำลังตรวจระบบ...", "")];
    setStatus("กำลังตรวจระบบ...", "");
    render();

    await waitForAuthReady();
    const config = getConfig();
    const collections = getCollections();
    const user = getCurrentUser();
    const staffEmail = normalizeText(user?.email).toLowerCase();
    const staffOnlyTasks = staffEmail
      ? [
          checkStaffProfile({
            collection: collections.staffProfiles || "staffProfiles",
            email: staffEmail
          }),
          checkCollectionRead({ label: "ข่าวสาร", collection: collections.newsItems || "newsItems" }),
          checkCollectionRead({ label: "เอกสารการเงิน", collection: collections.downloadDocuments || "downloadDocuments" }),
          checkCollectionRead({ label: "ทะเบียนองค์กร", collection: collections.organizationCatalog || "organizationCatalog" }),
          checkCollectionRead({ label: "คำของบประมาณ", collection: collections.budgetApprovalRequests || "budgetApprovalRequests" }),
          checkDocumentRead({
            label: "ตั้งค่างบประมาณ",
            collection: collections.budgetApprovalSettings || "budgetApprovalSettings",
            docId: config.firestore?.docs?.budgetApprovalSettings || "global",
            action: "ตรวจ budgetApprovalSettings/global ถ้าหน้ายื่นงบทำงานผิดปกติ"
          }),
          checkCollectionRead({ label: "คำขอยืมพัสดุ", collection: collections.borrowAssetRequests || "borrowAssetRequests" }),
          checkCollectionRead({ label: "ห้องประชุม", collection: collections.meetingRooms || "meetingRooms" }),
          checkCollectionRead({ label: "คำขอจองห้อง", collection: collections.meetingRoomBookings || "meetingRoomBookings" }),
          checkCollectionRead({ label: "Activity Log", collection: collections.auditLogs || "auditLogs", orderBy: "timestamp" })
        ]
      : [
          "สิทธิ์ staff profile",
          "ข่าวสาร",
          "เอกสารการเงิน",
          "ทะเบียนองค์กร",
          "คำของบประมาณ",
          "ตั้งค่างบประมาณ",
          "คำขอยืมพัสดุ",
          "ห้องประชุม",
          "คำขอจองห้อง",
          "Activity Log"
        ].map((label) => Promise.resolve(makeSkippedStaffRow(label)));
    const tasks = [
      checkEnvironment(),
      checkFirebaseBootstrap(),
      checkAuthSession(),
      checkRuntimeConfig(),
      checkDocumentRead({
        label: "appSettings/global",
        collection: collections.appSettings || "appSettings",
        docId: "global",
        action: "สร้าง document ถ้าต้องตั้ง runtime config"
      }),
      ...staffOnlyTasks,
      checkSheet({
        label: "Google Sheets: Project Status",
        url: config.sheets?.projectSources,
        action: "ตรวจ publish CSV หรืออัปเดตลิงก์ projectSources"
      }),
      checkSheet({
        label: "Google Sheets: พัสดุ",
        url: config.sheets?.borrowAssets,
        action: "ตรวจ publish CSV หรือย้าย catalog ไป Firestore"
      }),
      checkLocalStorage(),
      checkServiceWorker(),
      checkCacheStorage()
    ];

    const results = await Promise.allSettled(tasks);
    state.rows = results.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      return makeRow(`ตรวจรายการที่ ${index + 1}`, "error", toErrorMessage(result.reason), "แจ้งผู้ดูแลระบบพร้อมสรุปนี้");
    });

    const errorCount = state.rows.filter((row) => row.status === "error").length;
    const warnCount = state.rows.filter((row) => row.status === "warn").length;
    setStatus(
      errorCount
        ? `ตรวจเสร็จ พบผิดปกติ ${errorCount.toLocaleString("th-TH")} รายการ`
        : warnCount
          ? `ตรวจเสร็จ มี ${warnCount.toLocaleString("th-TH")} รายการที่ควรตรวจต่อ`
          : "ตรวจเสร็จ ระบบหลักพร้อมใช้งาน",
      errorCount ? "error" : warnCount ? "warn" : "ok"
    );
    state.running = false;
    if (runBtn) runBtn.disabled = false;
    render();
  };

  const copySummary = async () => {
    if (!state.rows.length || state.running) return;
    const lines = [
      `SGCU Health Check - ${new Date().toLocaleString("th-TH")}`,
      ...state.rows.map((row) => `[${statusLabel[row.status] || row.status}] ${row.name}: ${row.detail}${row.action ? ` | แนะนำ: ${row.action}` : ""}`)
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatus("คัดลอกสรุป health check แล้ว", "ok");
    } catch (error) {
      setStatus(`คัดลอกไม่สำเร็จ: ${toErrorMessage(error)}`, "warn");
    }
  };

  const init = () => {
    if (!document.getElementById("systemHealthTableBody")) return;
    if (!state.initialized) {
      state.initialized = true;
      $("systemHealthRunBtn")?.addEventListener("click", runChecks);
      $("systemHealthCopyBtn")?.addEventListener("click", copySummary);
    }
    syncSystemDataTabs();
    render();
    if (!state.rows.length && !state.running) {
      void runChecks();
    }
  };

  window.sgcuHealthCheck = {
    init,
    run: runChecks,
    getRows: () => state.rows.slice()
  };

  window.addEventListener("sgcu:page-active", (event) => {
    if (event?.detail?.page === "system-data-staff") init();
  });
})();
