/* Borrow assets: request flow + assets tables + staff approval queue */
function initBorrowAssetsApp() {
  if (window.__sgcuBorrowAssetsInitialized) return;
  window.__sgcuBorrowAssetsInitialized = true;
  const borrowAssetList = document.getElementById("borrowAssetList");
  const addBorrowAssetRow = document.getElementById("addBorrowAssetRow");
  const borrowRequestForm = document.querySelector("#assetsOverview .borrow-request-form");
  const borrowSubmitBtn = borrowRequestForm
    ? borrowRequestForm.querySelector('button.btn-primary[type="button"]')
    : null;
  const borrowClearBtn = document.getElementById("borrowRequestClearBtn");

  const borrowManagedProject = document.getElementById("borrowManagedProject");
  const staffBorrowRequestProjectFilter = document.getElementById("staffBorrowRequestProjectFilter");
  const BORROW_PROJECT_ORG = "องค์การบริหารสโมสรนิสิต";
  let managedBorrowProjects = [];
  let borrowCatalogReady = false;
  let borrowCatalogSequence = 0;
  let borrowCatalogUnsubscribes = [];


  const borrowProjectName = document.getElementById("borrowProjectName");
  const borrowProjectNameOther = document.getElementById("borrowProjectNameOther");
  const borrowProjectDept = document.getElementById("borrowProjectDept");
  const borrowProjectDeptOther = document.getElementById("borrowProjectDeptOther");
  const borrowProjectDetail = document.getElementById("borrowProjectDetail");
  const borrowAcademicYearDisplayEl = document.getElementById("borrowAcademicYearDisplay");
  const borrowPickupDate = document.getElementById("borrowPickupDate");
  const borrowPickupDateRule = document.getElementById("borrowPickupDateRule");
  const borrowReturnDate = document.getElementById("borrowReturnDate");
  const borrowProfileFullNameEl = document.getElementById("borrowProfileFullName");
  const borrowProfileNicknameEl = document.getElementById("borrowProfileNickname");
  const borrowProfileStudentIdEl = document.getElementById("borrowProfileStudentId");
  const borrowProfileFacultyYearEl = document.getElementById("borrowProfileFacultyYear");
  const borrowProfilePhoneEl = document.getElementById("borrowProfilePhone");
  const borrowProfileLineIdEl = document.getElementById("borrowProfileLineId");

  const borrowAssetsTableBody = document.getElementById("borrowAssetsTableBody");
  const borrowAssetsTableBodyStaff = document.getElementById("borrowAssetsTableBodyStaff");
  const borrowAssetsSearch = document.getElementById("borrowAssetsSearch");
  const borrowAssetsSearchClear = document.getElementById("borrowAssetsSearchClear");
  const borrowAssetsSearchStaff = document.getElementById("borrowAssetsSearchStaff");
  const borrowAssetsSearchStaffClear = document.getElementById("borrowAssetsSearchStaffClear");
  const borrowAssetsTypeFilter = document.getElementById("borrowAssetsTypeFilter");
  const borrowAssetsTypeFilterStaff = document.getElementById("borrowAssetsTypeFilterStaff");
  const borrowAssetsCount = document.getElementById("borrowAssetsCount");
  const borrowAssetsCountStaff = document.getElementById("borrowAssetsCountStaff");

  const myRequestsTableBody = document.getElementById("myBorrowRequestsTableBody");
  const myRequestsExportCsvBtn = document.getElementById("borrowMyRequestsExportCsvBtn");
  const borrowNotificationStatusEl = document.getElementById("borrowNotificationStatus");
  const myRequestsTableWrapper = myRequestsTableBody ? myRequestsTableBody.closest(".table-wrapper") : null;
  const myRequestsCardsEl = document.getElementById("myBorrowRequestsCards");
  const myRequestsTableEl = myRequestsTableBody ? myRequestsTableBody.closest("table") : null;
  if (myRequestsTableEl) {
    if (!myRequestsTableEl.id) myRequestsTableEl.id = "myBorrowRequestsTable";
    myRequestsTableEl.classList.add("borrow-my-requests-table");
  }
  const borrowOverviewCards = document.getElementById("borrowOverviewCards");
  const borrowFollowupTableBody = document.getElementById("borrowFollowupTableBody");
  const staffQueueTableBody =
    document.getElementById("staffBorrowQueueTableBody") ||
    document.querySelector("#staffBorrowQueue .table-wrapper tbody");
  const staffBorrowOverviewCards = document.getElementById("staffBorrowOverviewCards");
  const staffBorrowFollowupTableBody = document.getElementById("staffBorrowFollowupTableBody");
  const staffHistoryTableBody = document.getElementById("staffBorrowHistoryTableBody");
  const staffBorrowExportCsvBtn = document.getElementById("staffBorrowExportCsvBtn");
  const staffBorrowNotificationStatusEl = document.getElementById("staffBorrowNotificationStatus");
  const staffBorrowRequestSearch = document.getElementById("staffBorrowRequestSearch");
  const staffBorrowRequestSearchClear = document.getElementById("staffBorrowRequestSearchClear");
  const staffBorrowRequestStatusFilter = document.getElementById("staffBorrowRequestStatusFilter");
  const staffBorrowRequestOrgFilter = document.getElementById("staffBorrowRequestOrgFilter");
  const staffBorrowRequestDeptFilter = document.getElementById("staffBorrowRequestDeptFilter");
  const staffBorrowRequestDueFilter = document.getElementById("staffBorrowRequestDueFilter");
  const staffBorrowRequestPickupFrom = document.getElementById("staffBorrowRequestPickupFrom");
  const staffBorrowRequestPickupTo = document.getElementById("staffBorrowRequestPickupTo");
  const staffBorrowRequestReturnFrom = document.getElementById("staffBorrowRequestReturnFrom");
  const staffBorrowRequestReturnTo = document.getElementById("staffBorrowRequestReturnTo");
  const staffBorrowRequestFilterSummary = document.getElementById("staffBorrowRequestFilterSummary");
  const staffBorrowRequestFiltersBar = document.querySelector(".borrow-staff-request-filters");
  const staffBorrowRequestFilterFields = document.getElementById("staffBorrowRequestFilterFields");
  const staffBorrowMobileActionBar = document.querySelector(".mobile-borrow-action-bar");
  const staffBorrowMobileActionBtns = Array.from(document.querySelectorAll("[data-borrow-mobile-action]"));
  const staffBorrowMobileFilterBtn = staffBorrowMobileActionBtns.find(
    (btn) => btn.dataset.borrowMobileAction === "filters"
  );
  const staffBorrowPickupDaysForm = document.getElementById("staffBorrowPickupDaysForm");
  const staffBorrowPickupDayInputs = Array.from(document.querySelectorAll("[data-staff-borrow-pickup-day]"));
  const staffBorrowPickupDaysSaveBtn = document.getElementById("staffBorrowPickupDaysSaveBtn");
  const staffBorrowPickupDaysMessage = document.getElementById("staffBorrowPickupDaysMessage");
  const staffRequestPanelTitleEl = document.getElementById("staffRequestPanelTitle");
  const staffRequestPanelCaptionEl = document.getElementById("staffRequestPanelCaption");
  const staffSummaryCards = Array.from(
    document.querySelectorAll("#staffBorrowQueue .cards[data-role='legacy-staff-summary'] .card-value")
  );

  const staffBorrowFilterSheet = document.createElement("div");
  staffBorrowFilterSheet.className = "mobile-filter-sheet mobile-borrow-filter-sheet";
  staffBorrowFilterSheet.setAttribute("aria-hidden", "true");
  staffBorrowFilterSheet.innerHTML = `
    <div class="mobile-filter-backdrop" data-borrow-filter-close></div>
    <section class="mobile-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="borrowMobileFilterTitle">
      <header class="mobile-filter-header">
        <div>
          <h2 id="borrowMobileFilterTitle" class="mobile-filter-title">ตัวกรองคำขอยืมพัสดุ</h2>
          <p class="mobile-filter-caption">กรองตามสถานะ หน่วยงาน กำหนดคืน และช่วงวันที่</p>
        </div>
        <button class="mobile-filter-close" type="button" aria-label="ปิดตัวกรอง" data-borrow-filter-close>×</button>
      </header>
      <div class="mobile-filter-body"></div>
      <footer class="mobile-filter-footer">
        <button class="btn-ghost mobile-filter-reset" type="button">ล้างตัวกรอง</button>
        <button class="btn-primary mobile-filter-done" type="button">เสร็จ</button>
      </footer>
    </section>
  `;
  document.body.appendChild(staffBorrowFilterSheet);
  const staffBorrowFilterSheetBody = staffBorrowFilterSheet.querySelector(".mobile-filter-body");
  const staffBorrowFilterSheetResetBtn = staffBorrowFilterSheet.querySelector(".mobile-filter-reset");
  const staffBorrowFilterSheetDoneBtn = staffBorrowFilterSheet.querySelector(".mobile-filter-done");
  let staffBorrowFilterFieldsPlaceholder = null;

  const hasBorrowFormSection = !!(borrowAssetList && addBorrowAssetRow);
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const firestoreCollections = appConfig.firestore?.collections || {};
  const borrowAssetConfig = appConfig.features?.borrowAssets || {};
  const BORROW_PROFILE_STORAGE_KEY = "sgcu_user_profile_by_email_v1";
  const LEGACY_BORROW_PROFILE_STORAGE_KEY = "sgcu_borrow_profile_by_email_v1";
  const USER_PROFILE_COLLECTION = firestoreCollections.userProfiles || "userProfiles";

  const normalizeAccountEmail = (email) => {
    if (typeof window.sgcuNormalizeAccountEmail === "function") {
      return window.sgcuNormalizeAccountEmail(email);
    }
    const normalized = (email || "").toString().trim().toLowerCase();
    const match = normalized.match(/^(\d{10})@(student|alumni)\.chula\.ac\.th$/);
    return match ? `${match[1]}@student.chula.ac.th` : normalized;
  };

  const isAlumniChulaEmail = (email) => {
    if (typeof window.sgcuIsAlumniChulaEmail === "function") {
      return window.sgcuIsAlumniChulaEmail(email);
    }
    return /^\d{10}@alumni\.chula\.ac\.th$/i.test((email || "").toString().trim());
  };

  const USE_CSV_ASSET_CATALOG =
    typeof borrowAssetConfig.useCsvAssetCatalog === "boolean"
      ? borrowAssetConfig.useCsvAssetCatalog
      : true;
  const ENABLE_ASSET_AVAILABILITY_CHECK =
    typeof globalThis.ENABLE_ASSET_AVAILABILITY_CHECK === "boolean"
      ? globalThis.ENABLE_ASSET_AVAILABILITY_CHECK
      : !!borrowAssetConfig.enableAssetAvailabilityCheck;
  const BORROW_ASSETS_CSV_URL = appConfig.sheets?.borrowAssets || "";
  const BORROW_REQUEST_COLLECTION = firestoreCollections.borrowAssetRequests || "borrowAssetRequests";
  const BORROW_REQUEST_COUNTER_COLLECTION =
    firestoreCollections.borrowAssetRequestCounters || "borrowAssetRequestCounters";
  const BORROW_ASSET_STOCK_COLLECTION =
    firestoreCollections.borrowAssetStockReservations || "borrowAssetStockReservations";
  const BORROW_REQUEST_COLLECTIONS = [BORROW_REQUEST_COLLECTION];
  const STATUS_PENDING = "pending";
  const STATUS_APPROVED = "approved";
  const STATUS_RECEIVED = "received";
  const STATUS_REJECTED = "rejected";
  const STATUS_CANCELLED = "cancelled";
  const STATUS_RETURNED = "returned";
  const STAFF_REQUEST_PAGE_SIZE = 50;
  const STAFF_ASSETS_PAGE_SIZE = 50;
  const BORROW_REQUEST_ACTIVE_LIST_LIMIT = 500;
  const BORROW_REQUEST_HISTORY_LIST_LIMIT = 300;
  const STAFF_REQUEST_TAB_STATUSES = new Set([STATUS_PENDING, STATUS_APPROVED, STATUS_RECEIVED]);
  const STAFF_HISTORY_TAB_STATUSES = new Set([STATUS_REJECTED, STATUS_CANCELLED, STATUS_RETURNED]);
  const BORROW_FOLLOWUP_SOON_DAYS = 3;
  const DEFAULT_ALLOWED_PICKUP_DAYS = [1, 4];
  const WEEKDAY_NAMES_TH = {
    0: "อาทิตย์",
    1: "จันทร์",
    2: "อังคาร",
    3: "พุธ",
    4: "พฤหัสบดี",
    5: "ศุกร์",
    6: "เสาร์"
  };
  const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const safeEscape = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");

  let firestore = window.sgcuFirestore || {};
  let hasFirestore = false;
  let unsubscribeBorrowRequests = [];
  let borrowRequests = [];
  let borrowRequestsSnapshotCount = 0;
  let currentUserEmail = "";
  let myRequestsLoadState = "idle";
  let myRequestsLoadError = "";
  const assetMap = new Map();
  const assetRowMap = new Map();
  let borrowAssetsRows = [];
  let activeBorrowProfile = null;
  const collectionSnapshotRows = new Map();
  const collectionSnapshotCounts = new Map();
  const collectionSnapshotErrors = new Map();
  let staffActionInFlight = false;
  let borrowStaffAccessCheckSeq = 0;
  let hasBorrowNotificationBaseline = false;
  let previousBorrowNotificationByKey = new Map();
  let hasStaffBorrowNotificationBaseline = false;
  let previousStaffBorrowNotificationByKey = new Map();
  let lastBorrowStaffAccessResult = null;
  const staffRequestPageByMode = {
    queue: 1,
    history: 1
  };
  let staffAssetsPage = 1;

  const resolveFirestoreBridge = () => {
    firestore = window.sgcuFirestore || {};
    hasFirestore = !!(
      firestore.db &&
      firestore.collection &&
      firestore.addDoc &&
      firestore.onSnapshot &&
      firestore.doc &&
      firestore.updateDoc &&
      firestore.deleteDoc &&
      firestore.serverTimestamp
    );
    return hasFirestore;
  };
  resolveFirestoreBridge();

  const borrowMessageEl = (() => {
    if (!borrowRequestForm || !borrowSubmitBtn) return null;
    const existing = document.getElementById("borrowRequestMessage");
    if (existing) return existing;
    const message = document.createElement("p");
    message.id = "borrowRequestMessage";
    message.className = "section-text-sm";
    message.style.marginTop = "10px";
    const actions = borrowSubmitBtn.closest(".borrow-submit-actions");
    (actions || borrowSubmitBtn).insertAdjacentElement("afterend", message);
    return message;
  })();

  const setBorrowMessage = (text, color = "#374151") => {
    if (!borrowMessageEl) return;
    borrowMessageEl.textContent = text || "";
    borrowMessageEl.style.color = color;
  };

  const staffQueueMessageEl = (() => {
    if (!staffQueueTableBody) return null;
    const wrapper = staffQueueTableBody.closest(".table-wrapper");
    if (!wrapper) return null;
    const existing = document.getElementById("borrowStaffQueueMessage");
    if (existing) return existing;
    const message = document.createElement("p");
    message.id = "borrowStaffQueueMessage";
    message.className = "section-text-sm";
    message.style.marginTop = "10px";
    wrapper.insertAdjacentElement("afterend", message);
    return message;
  })();

  const setStaffQueueMessage = (text, color = "#374151") => {
    if (!staffQueueMessageEl) return;
    staffQueueMessageEl.textContent = text || "";
    staffQueueMessageEl.style.color = color;
  };

  const staffRequestPagerEl = (() => {
    if (!staffQueueTableBody) return null;
    const wrapper = staffQueueTableBody.closest(".table-wrapper");
    if (!wrapper) return null;
    const existing = document.getElementById("borrowStaffRequestPager");
    if (existing) return existing;
    const pager = document.createElement("div");
    pager.id = "borrowStaffRequestPager";
    pager.className = "list-pagination-controls";
    pager.setAttribute("aria-live", "polite");
    wrapper.insertAdjacentElement("afterend", pager);
    return pager;
  })();

  const getPagedRows = (rows, page) => {
    const totalPages = Math.max(1, Math.ceil(rows.length / STAFF_REQUEST_PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const startIndex = (currentPage - 1) * STAFF_REQUEST_PAGE_SIZE;
    return {
      rows: rows.slice(startIndex, startIndex + STAFF_REQUEST_PAGE_SIZE),
      currentPage,
      totalPages,
      startIndex,
      endIndex: Math.min(rows.length, startIndex + STAFF_REQUEST_PAGE_SIZE),
      total: rows.length
    };
  };

  const renderStaffRequestPager = (meta) => {
    if (!staffRequestPagerEl) return;
    if (!meta || meta.total <= STAFF_REQUEST_PAGE_SIZE) {
      staffRequestPagerEl.innerHTML = "";
      staffRequestPagerEl.hidden = true;
      return;
    }
    staffRequestPagerEl.hidden = false;
    staffRequestPagerEl.innerHTML = `
      <span class="list-pagination-summary">
        แสดง ${safeEscape(meta.startIndex + 1)}-${safeEscape(meta.endIndex)} จาก ${safeEscape(meta.total)} รายการ
      </span>
      <button
        class="btn-ghost list-pagination-btn"
        type="button"
        data-borrow-page-action="prev"
        ${meta.currentPage <= 1 ? "disabled" : ""}
      >ก่อนหน้า</button>
      <span class="list-pagination-page">หน้า ${safeEscape(meta.currentPage)} / ${safeEscape(meta.totalPages)}</span>
      <button
        class="btn-ghost list-pagination-btn"
        type="button"
        data-borrow-page-action="next"
        ${meta.currentPage >= meta.totalPages ? "disabled" : ""}
      >ถัดไป</button>
    `;
  };

  const staffAssetsPagerEl = (() => {
    if (!borrowAssetsTableBodyStaff) return null;
    const wrapper = borrowAssetsTableBodyStaff.closest(".table-wrapper");
    if (!wrapper) return null;
    const existing = document.getElementById("borrowAssetsStaffPager");
    if (existing) return existing;
    const pager = document.createElement("div");
    pager.id = "borrowAssetsStaffPager";
    pager.className = "list-pagination-controls";
    pager.setAttribute("aria-live", "polite");
    wrapper.insertAdjacentElement("afterend", pager);
    return pager;
  })();

  const getPagedStaffAssetsRows = (rows, page) => {
    const totalPages = Math.max(1, Math.ceil(rows.length / STAFF_ASSETS_PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const startIndex = (currentPage - 1) * STAFF_ASSETS_PAGE_SIZE;
    return {
      rows: rows.slice(startIndex, startIndex + STAFF_ASSETS_PAGE_SIZE),
      currentPage,
      totalPages,
      startIndex,
      endIndex: Math.min(rows.length, startIndex + STAFF_ASSETS_PAGE_SIZE),
      total: rows.length
    };
  };

  const renderBorrowAssetsStaffPager = (meta) => {
    if (!staffAssetsPagerEl) return;
    if (!meta || meta.total <= STAFF_ASSETS_PAGE_SIZE) {
      staffAssetsPagerEl.innerHTML = "";
      staffAssetsPagerEl.hidden = true;
      return;
    }
    staffAssetsPagerEl.hidden = false;
    staffAssetsPagerEl.innerHTML = `
      <span class="list-pagination-summary">
        แสดง ${safeEscape(meta.startIndex + 1)}-${safeEscape(meta.endIndex)} จาก ${safeEscape(meta.total)} รายการ
      </span>
      <button
        class="btn-ghost list-pagination-btn"
        type="button"
        data-borrow-assets-page-action="prev"
        ${meta.currentPage <= 1 ? "disabled" : ""}
      >ก่อนหน้า</button>
      <span class="list-pagination-page">หน้า ${safeEscape(meta.currentPage)} / ${safeEscape(meta.totalPages)}</span>
      <button
        class="btn-ghost list-pagination-btn"
        type="button"
        data-borrow-assets-page-action="next"
        ${meta.currentPage >= meta.totalPages ? "disabled" : ""}
      >ถัดไป</button>
    `;
  };

  /* @include ./app.borrow-assets.parts/organization-and-profile.js.inc */
  /* @include ./app.borrow-assets.parts/project-catalog.js.inc */
  /* @include ./app.borrow-assets.parts/pickup-and-followup.js.inc */
  /* @include ./app.borrow-assets.parts/notifications-and-export.js.inc */
  /* @include ./app.borrow-assets.parts/request-filters.js.inc */
  /* @include ./app.borrow-assets.parts/inventory-and-request-form.js.inc */
  /* @include ./app.borrow-assets.parts/request-lists.js.inc */
  /* @include ./app.borrow-assets.parts/request-dialogs.js.inc */
  /* @include ./app.borrow-assets.parts/request-store.js.inc */
  /* @include ./app.borrow-assets.parts/request-events.js.inc */
  /* @include ./app.borrow-assets.parts/mobile-navigation.js.inc */
  bindBorrowCatalogManagement();
  subscribeBorrowCatalog();
  currentUserEmail = readCurrentUserEmail();
  restoreBorrowProfileForCurrentUser();
  void readBorrowProfileFromFirestore().then((profile) => {
    if (profile) applyBorrowProfileToForm(profile);
  });
  renderBorrowRequests();
  setStaffQueueStatusMessage("กำลังโหลดคิวคำขอ...");
  subscribeBorrowRequests();

  let firestoreRetryTimer = null;
  const scheduleFirestoreRetry = () => {
    if (firestoreRetryTimer) {
      window.clearTimeout(firestoreRetryTimer);
      firestoreRetryTimer = null;
    }
    if (resolveFirestoreBridge()) return;
    firestoreRetryTimer = window.setTimeout(() => {
      subscribeBorrowRequests();
      subscribeBorrowCatalog();
      scheduleFirestoreRetry();
    }, 1200);
  };
  scheduleFirestoreRetry();

  if (window.sgcuAuth?.auth && typeof window.sgcuAuth.onAuthStateChanged === "function") {
    window.sgcuAuth.onAuthStateChanged(window.sgcuAuth.auth, () => {
      currentUserEmail = readCurrentUserEmail();
      subscribeBorrowCatalog();
      restoreBorrowProfileForCurrentUser();
      void readBorrowProfileFromFirestore().then((profile) => {
        if (profile) applyBorrowProfileToForm(profile);
      });
      renderBorrowRequests();
      if (!currentUserEmail) setStaffQueueStatusMessage("กรุณาเข้าสู่ระบบก่อนดูคิวคำขอ");
      subscribeBorrowRequests();
      scheduleFirestoreRetry();
    });
  }

  window.addEventListener("sgcu:staff-auth-updated", () => {
    currentUserEmail = readCurrentUserEmail();
    renderBorrowRequests();
    subscribeBorrowRequests();
  });

  window.addEventListener("sgcu:page-active", (event) => {
    const page = event?.detail?.page || "";
    if (["borrow-assets", "borrow-assets-staff"].includes(page) && page !== borrowRequestsPage) {
      void subscribeBorrowRequests(page);
    }
  });

  window.addEventListener("sgcu:user-profile-updated", (event) => {
    const detail = event?.detail || {};
    const email = (detail.email || "").toString().trim().toLowerCase();
    if (!email || email !== currentUserEmail) return;
    applyBorrowProfileToForm(detail.profile || {});
  });

  window.addEventListener("beforeunload", () => {
    borrowCatalogUnsubscribes.forEach(unsubscribe => unsubscribe());
    if (Array.isArray(unsubscribeBorrowRequests) && unsubscribeBorrowRequests.length) {
      unsubscribeBorrowRequests.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          // ignore
        }
      });
      unsubscribeBorrowRequests = [];
    }
    if (firestoreRetryTimer) {
      window.clearTimeout(firestoreRetryTimer);
      firestoreRetryTimer = null;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBorrowAssetsApp, { once: true });
} else {
  initBorrowAssetsApp();
}
