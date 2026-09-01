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

  const normalizeBool = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
  };

  const parseNumber = (value) => {
    const num = Number(String(value || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const OTHER_ORG_VALUE = "__other__";
  const EXTERNAL_ORG_FILTER_VALUE = "__external__";
  const EXTERNAL_ORG_LABEL = "หน่วยงานภายนอก / อื่น ๆ";
  const parseBorrowAcademicReferenceDate = (value) => {
    if (!value) return new Date();
    if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
    const source = value && typeof value === "object" && value.date !== undefined ? value.date : value;
    const date = typeof source?.toDate === "function" ? source.toDate() : new Date(source);
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  };

  const getBorrowAcademicYearBE = (referenceValue = new Date()) => {
    const referenceDate = parseBorrowAcademicReferenceDate(referenceValue) || new Date();
    const yearCE = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    return String((month >= 6 ? yearCE : yearCE - 1) + 543);
  };

  const deriveBorrowStudentYearFromId = (studentId, referenceValue = new Date()) => {
    const digits = (studentId || "").toString().trim().replace(/\D/g, "");
    if (!/^\d{10}$/.test(digits)) return "";
    const entryPrefix = Number(digits.slice(0, 2));
    const entryAcademicBE = Number.isFinite(entryPrefix) ? 2500 + entryPrefix : NaN;
    const referenceAcademicBE = Number(getBorrowAcademicYearBE(referenceValue));
    const yearLevel = Number.isFinite(entryAcademicBE) && Number.isFinite(referenceAcademicBE)
      ? referenceAcademicBE - entryAcademicBE + 1
      : NaN;
    return isAlumniChulaEmail(referenceValue?.email || referenceValue?.authEmail)
      ? "นิสิตเก่า"
      : Number.isFinite(yearLevel) && yearLevel >= 1 && yearLevel <= 8 ? String(yearLevel) : "";
  };

  const normalizeBorrowProfileAcademicSnapshot = (profile = {}, referenceValue = new Date()) => {
    const safeProfile = profile && typeof profile === "object" ? profile : {};
    const studentId = (safeProfile.studentId || "").toString().trim();
    const email = (safeProfile.authEmail || readCurrentUserEmail()).toString().trim().toLowerCase();
    return {
      ...safeProfile,
      year: deriveBorrowStudentYearFromId(studentId, { date: referenceValue, email }) || (safeProfile.year || "").toString()
    };
  };

  const updateBorrowAcademicYearDisplay = () => {
    if (borrowAcademicYearDisplayEl) {
      borrowAcademicYearDisplayEl.textContent = `ปีการศึกษา ${getBorrowAcademicYearBE()}`;
    }
  };

  const normalizeBorrowYearValueMap = (value = {}) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce((acc, [year, itemValue]) => {
      const normalizedYear = (year || "").toString().trim();
      const normalizedValue = (itemValue || "").toString().trim();
      if (/^\d{4}$/.test(normalizedYear) && normalizedValue) {
        acc[normalizedYear] = normalizedValue;
      }
      return acc;
    }, {});
  };

  const resolveBorrowYearValue = (map = {}, academicYear = getBorrowAcademicYearBE()) => {
    const normalizedMap = normalizeBorrowYearValueMap(map);
    const year = Number((academicYear || "").toString().trim());
    if (!Number.isFinite(year)) return "";
    if (normalizedMap[String(year)]) return normalizedMap[String(year)];
    const previousYear = Object.keys(normalizedMap)
      .map((key) => Number(key))
      .filter((itemYear) => Number.isFinite(itemYear) && itemYear < year)
      .sort((a, b) => b - a)[0];
    return previousYear ? normalizedMap[String(previousYear)] || "" : "";
  };

  const resolveBorrowYearValueExact = (map = {}, academicYear = getBorrowAcademicYearBE()) => {
    const normalizedMap = normalizeBorrowYearValueMap(map);
    const year = (academicYear || "").toString().trim();
    if (!/^\d{4}$/.test(year)) return "";
    return normalizedMap[year] || "";
  };

  const getBorrowOrgNameYearMap = (item = {}) => ({
    ...normalizeBorrowYearValueMap(item?.orgNameByAcademicYear),
    ...normalizeBorrowYearValueMap(item?.organizationNameByAcademicYear),
    ...normalizeBorrowYearValueMap(item?.nameByAcademicYear)
  });

  const getBorrowOrgCodeYearMap = (item = {}) => ({
    ...normalizeBorrowYearValueMap(item?.orgCodeByAcademicYear),
    ...normalizeBorrowYearValueMap(item?.codeByAcademicYear)
  });

  const resolveBorrowOrgDisplayName = (item = {}, academicYear = getBorrowAcademicYearBE()) =>
    resolveBorrowYearValue(getBorrowOrgNameYearMap(item), academicYear) ||
    (item?.name || item?.organizationName || item?.orgName || "").toString().trim();

  const resolveBorrowOrgDisplayNameExact = (item = {}, academicYear = getBorrowAcademicYearBE()) => {
    const yearMap = getBorrowOrgNameYearMap(item);
    const exactName = resolveBorrowYearValueExact(yearMap, academicYear);
    if (exactName) return exactName;
    return Object.keys(yearMap).length
      ? ""
      : (item?.name || item?.organizationName || item?.orgName || "").toString().trim();
  };

  const resolveBorrowOrgCodeForYear = (item = {}, academicYear = getBorrowAcademicYearBE()) =>
    normalizeOrgCode(
      resolveBorrowYearValue(getBorrowOrgCodeYearMap(item), academicYear) ||
      item?.code ||
      item?.orgCode ||
      ""
    );

  const projectMatchesBorrowAcademicYear = (project = {}, academicYear = getBorrowAcademicYearBE()) => {
    const projectYear = (project?.year || project?.academicYear || project?.schoolYear || "").toString().trim();
    if (!projectYear) return false;
    return projectYear === (academicYear || "").toString().trim();
  };

  const collectBorrowOrgTypeOptions = () => {
    const academicYear = getBorrowAcademicYearBE();
    const fromFilters =
      typeof orgFilters !== "undefined" && Array.isArray(orgFilters)
        ? orgFilters
          .filter((item) => resolveBorrowOrgDisplayName(item, academicYear))
          .map((item) => (item?.group || "").toString().trim())
        : [];
    const fromProjects =
      typeof projects !== "undefined" && Array.isArray(projects)
        ? projects
          .filter((item) => projectMatchesBorrowAcademicYear(item, academicYear))
          .map((item) => (item?.orgGroup || "").toString().trim())
        : [];
    return Array.from(new Set([...fromFilters, ...fromProjects].filter(Boolean)))
      .sort((a, b) => b.localeCompare(a, "th"));
  };

  const compareBorrowOrgNameByCode = (a, b, codeByName = new Map()) => {
    const codeA = (codeByName.get(a) || "").toString().trim();
    const codeB = (codeByName.get(b) || "").toString().trim();
    if (codeA && codeB) {
      const codeCompare = codeA.localeCompare(codeB, "th", { numeric: true });
      if (codeCompare) return codeCompare;
    } else if (codeA || codeB) {
      return codeA ? -1 : 1;
    }
    return a.localeCompare(b, "th");
  };

  const collectBorrowOrgNameOptions = (orgType) => {
    const selectedType = (orgType || "").toString().trim();
    if (!selectedType || selectedType === OTHER_ORG_VALUE) return [];
    const codeByName = new Map();
    const fromFilters = [];
    const academicYear = getBorrowAcademicYearBE();
    if (typeof orgFilters !== "undefined" && Array.isArray(orgFilters)) {
      orgFilters
        .filter((item) => (item?.group || "").toString().trim() === selectedType)
        .forEach((item) => {
          const name = resolveBorrowOrgDisplayName(item, academicYear);
          if (!name) return;
          const code = resolveBorrowOrgCodeForYear(item, academicYear);
          if (code && !codeByName.has(name)) codeByName.set(name, code);
          fromFilters.push(name);
        });
    }
    const fromProjects =
      typeof projects !== "undefined" && Array.isArray(projects)
        ? projects
          .filter((item) => projectMatchesBorrowAcademicYear(item, academicYear))
          .filter((item) => (item?.orgGroup || "").toString().trim() === selectedType)
          .map((item) => (item?.orgName || "").toString().trim())
        : [];
    return Array.from(new Set([...fromFilters, ...fromProjects].filter(Boolean)))
      .sort((a, b) => compareBorrowOrgNameByCode(a, b, codeByName));
  };

  const toggleBorrowProjectNameOther = () => {
    if (!borrowProjectNameOther || !borrowProjectName) return;
    const showOther = borrowProjectName.value === OTHER_ORG_VALUE;
    borrowProjectNameOther.style.display = showOther ? "" : "none";
    borrowProjectNameOther.required = showOther;
    if (!showOther) {
      borrowProjectNameOther.value = "";
    }
  };

  const toggleBorrowProjectDeptOther = (showOther) => {
    if (!(borrowProjectDept instanceof HTMLSelectElement)) return;
    borrowProjectDept.disabled = !!showOther;
    borrowProjectDept.required = !showOther;
    if (showOther) {
      borrowProjectDept.value = "";
    }
    if (borrowProjectDeptOther) {
      borrowProjectDeptOther.style.display = showOther ? "" : "none";
      borrowProjectDeptOther.required = !!showOther;
      if (!showOther) {
        borrowProjectDeptOther.value = "";
      }
    }
  };

  const populateBorrowProjectTypeOptions = () => {
    if (!(borrowProjectName instanceof HTMLSelectElement)) return;
    const currentValue = borrowProjectName.value;
    while (borrowProjectName.options.length) {
      borrowProjectName.remove(0);
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "เลือกประเภทองค์กร";
    placeholder.disabled = true;
    placeholder.selected = true;
    borrowProjectName.appendChild(placeholder);

    const options = collectBorrowOrgTypeOptions();
    options.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      borrowProjectName.appendChild(option);
    });

    const otherOption = document.createElement("option");
    otherOption.value = OTHER_ORG_VALUE;
    otherOption.textContent = EXTERNAL_ORG_LABEL;
    borrowProjectName.appendChild(otherOption);

    if (currentValue) {
      const hasCurrent = Array.from(borrowProjectName.options).some((opt) => opt.value === currentValue);
      if (hasCurrent) {
        borrowProjectName.value = currentValue;
      } else if (borrowProjectNameOther && currentValue !== OTHER_ORG_VALUE) {
        borrowProjectName.value = OTHER_ORG_VALUE;
        borrowProjectNameOther.value = currentValue;
      }
    }
    toggleBorrowProjectNameOther();
  };

  const populateBorrowProjectDeptOptions = () => {
    if (!(borrowProjectDept instanceof HTMLSelectElement)) return;
    const selectedType = (borrowProjectName?.value || "").toString().trim();
    const shouldUseOther = selectedType === OTHER_ORG_VALUE;
    const currentValue = borrowProjectDept.value;

    while (borrowProjectDept.options.length) {
      borrowProjectDept.remove(0);
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = shouldUseOther
      ? "ระบุฝ่าย / ชมรมด้านล่าง"
      : (selectedType ? "เลือกฝ่าย / ชมรม" : "เลือกประเภทองค์กรก่อน");
    borrowProjectDept.appendChild(placeholder);

    if (!shouldUseOther && selectedType) {
      const options = collectBorrowOrgNameOptions(selectedType);
      options.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        borrowProjectDept.appendChild(option);
      });
      if (currentValue) {
        const hasCurrent = Array.from(borrowProjectDept.options).some((opt) => opt.value === currentValue);
        if (hasCurrent) borrowProjectDept.value = currentValue;
      }
    }
    toggleBorrowProjectDeptOther(shouldUseOther);
  };

  const getBorrowProjectNameValueForSubmit = () => {
    const selected = (borrowProjectName?.value || "").toString().trim();
    if (selected === OTHER_ORG_VALUE) {
      return (borrowProjectNameOther?.value || "").toString().trim();
    }
    return selected;
  };

  const getBorrowProjectDeptValueForSubmit = () => {
    const selectedType = (borrowProjectName?.value || "").toString().trim();
    if (selectedType === OTHER_ORG_VALUE) {
      return (borrowProjectDeptOther?.value || "").toString().trim();
    }
    return (borrowProjectDept?.value || "").toString().trim();
  };

  const normalizeOrgCode = (value) => {
    const raw = (value || "").toString().trim().toUpperCase().replace(/\s+/g, "");
    if (!raw) return "";
    const normalized = raw
      .replace(/-/g, ".")
      .replace(/\.{2,}/g, ".")
      .replace(/^\./, "")
      .replace(/\.$/, "");
    if (!/^[A-Z0-9.]+$/.test(normalized)) return "";
    return normalized;
  };

  const hasBorrowOrgCodeData = () => {
    const rows =
      typeof orgFilters !== "undefined" && Array.isArray(orgFilters) ? orgFilters : [];
    return rows.some((item) => normalizeOrgCode(item?.code || ""));
  };

  const ensureBorrowOrgCodeData = async () => {
    if (hasBorrowOrgCodeData()) return;
    if (typeof loadOrgFilters === "function") {
      try {
        await loadOrgFilters();
      } catch (_) {
        // ignore and fallback
      }
    }
    if (hasBorrowOrgCodeData()) return;
    if (typeof ensureProjectDataLoaded === "function") {
      try {
        await ensureProjectDataLoaded();
      } catch (_) {
        // ignore and fallback
      }
    }
  };

  const resolveBorrowOrgCode = () => {
    const selectedType = (borrowProjectName?.value || "").toString().trim();
    if (!selectedType || selectedType === OTHER_ORG_VALUE) return "CU.00";
    const selectedDept = getBorrowProjectDeptValueForSubmit();
    const academicYear = getBorrowAcademicYearBE();
    const rows =
      typeof orgFilters !== "undefined" && Array.isArray(orgFilters) ? orgFilters : [];
    if (!rows.length) return "";
    const exact = rows.find((item) => {
      const group = (item?.group || "").toString().trim();
      const name = resolveBorrowOrgDisplayName(item, academicYear);
      return group === selectedType && name === selectedDept;
    });
    const exactCode = resolveBorrowOrgCodeForYear(exact, academicYear);
    if (exactCode) return exactCode;
    const firstByGroup = rows.find((item) => {
      const group = (item?.group || "").toString().trim();
      return group === selectedType && resolveBorrowOrgCodeForYear(item, academicYear);
    });
    const groupCode = resolveBorrowOrgCodeForYear(firstByGroup, academicYear);
    return groupCode || "";
  };

  const getBorrowTermYearTwoDigits = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date();
    if (Number.isNaN(d.getTime())) return "00";
    const beYear = d.getFullYear() + 543;
    const month = d.getMonth(); // 0-11
    const termStartYear = month >= 5 ? beYear : beYear - 1; // เริ่มนับวาระ 1 มิ.ย.
    return String(termStartYear % 100).padStart(2, "0");
  };

  const getNextBorrowRequestRunning = (prefix) => {
    const normalizedPrefix = (prefix || "").toString().trim();
    if (!normalizedPrefix) return "001";
    const expectedPrefix = `${normalizedPrefix}.`;
    let maxRunning = 0;
    borrowRequests.forEach((item) => {
      const requestNo = (item?.requestNo || "").toString().trim().toUpperCase();
      if (!requestNo.startsWith(expectedPrefix)) return;
      const runningText = requestNo.slice(expectedPrefix.length);
      if (!/^\d+$/.test(runningText)) return;
      const runningNum = Number(runningText);
      if (Number.isFinite(runningNum) && runningNum > maxRunning) {
        maxRunning = runningNum;
      }
    });
    return String(maxRunning + 1).padStart(3, "0");
  };

  const getBorrowRequestNoParts = () => {
    const termYY = getBorrowTermYearTwoDigits(new Date());
    const orgCode = resolveBorrowOrgCode();
    if (!orgCode) return null;
    const prefix = `B${termYY}.${orgCode}`;
    return { termYY, orgCode, prefix };
  };

  const createBorrowRequestWithNextNumber = async (payload) => {
    const numberParts = getBorrowRequestNoParts();
    if (!numberParts) return null;

    const { termYY, orgCode, prefix } = numberParts;
    const requestRef = firestore.doc(
      firestore.collection(firestore.db, BORROW_REQUEST_COLLECTION)
    );

    if (typeof firestore.runTransaction !== "function") {
      const running = getNextBorrowRequestRunning(prefix);
      payload.requestNo = `${prefix}.${running}`;
      await firestore.setDoc(requestRef, payload);
      return requestRef;
    }

    const counterRef = firestore.doc(
      firestore.db,
      BORROW_REQUEST_COUNTER_COLLECTION,
      prefix
    );
    await firestore.runTransaction(firestore.db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const storedRunning = Number(counterSnap?.data?.()?.lastRunning || 0);
      const visibleRunning = Number(getNextBorrowRequestRunning(prefix)) - 1;
      const currentRunning = Math.max(
        Number.isFinite(storedRunning) ? storedRunning : 0,
        Number.isFinite(visibleRunning) ? visibleRunning : 0
      );
      const nextRunning = currentRunning + 1;
      const requestNo = `${prefix}.${String(nextRunning).padStart(3, "0")}`;
      payload.requestNo = requestNo;

      transaction.set(counterRef, {
        prefix,
        termYY,
        orgCode,
        lastRunning: nextRunning,
        updatedAt: firestore.serverTimestamp()
      });
      transaction.set(requestRef, payload);
    });
    return requestRef;
  };

  const readCurrentUserEmail = () =>
    (window.sgcuAuth?.auth?.currentUser?.email || "").toString().trim().toLowerCase();

  const readCurrentAccountEmail = () => normalizeAccountEmail(readCurrentUserEmail());

  const matchesCurrentAccountEmail = (email, accountEmail = "") => {
    const currentAccount = readCurrentAccountEmail();
    if (!currentAccount) return false;
    return normalizeAccountEmail(accountEmail || email) === currentAccount ||
      normalizeAccountEmail(email) === currentAccount;
  };

  const STAFF_PROFILE_COLLECTION =
    appConfig.firestore?.collections?.staffProfiles || "staffProfiles";
  const STAFF_HEAD_EMAILS = new Set([
    "tuwanon.kimchiang@gmail.com",
    "treasurer.sgcu68@gmail.com"
  ]);
  const BORROW_STAFF_PAGE_ALIASES = new Set([
    "borrow-assets-staff",
    "borrow-assets",
    "ยืม-คืนพัสดุ"
  ]);

  const flattenPageValues = (value) => {
    if (Array.isArray(value)) return value.flatMap((item) => flattenPageValues(item));
    if (typeof value === "string") {
      return value
        .split(/[,;|\n]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (value && typeof value === "object") {
      const picked = ["id", "page", "pageId", "value", "name", "label", "route"]
        .map((key) => value[key])
        .filter((item) => item !== undefined && item !== null && item !== "");
      const truthyKeys = Object.entries(value)
        .filter(([, enabled]) => enabled === true || enabled === "true" || enabled === 1 || enabled === "1")
        .map(([key]) => key);
      return [...picked, ...truthyKeys].flatMap((item) => flattenPageValues(item));
    }
    return [];
  };

  const readPageListInput = (entry = {}) => {
    if (!entry || typeof entry !== "object") return [];
    return (
      entry.allowedPages ??
      entry.allowedPageIds ??
      entry.allowedStaffPages ??
      entry.staffPages ??
      entry.pages ??
      entry.pageAccess ??
      entry.pagePermissions ??
      entry.permissions?.allowedPages ??
      entry.permissions?.pages ??
      entry.access?.allowedPages ??
      entry.access?.pages ??
      []
    );
  };

  const hasBorrowStaffPage = (entry = {}) =>
    flattenPageValues(readPageListInput(entry)).some((page) => BORROW_STAFF_PAGE_ALIASES.has(page));

  const hasExplicitPageList = (entry = {}) => {
    if (!entry || typeof entry !== "object") return false;
    return [
      entry.allowedPages,
      entry.allowedPageIds,
      entry.allowedStaffPages,
      entry.staffPages,
      entry.pages,
      entry.pageAccess,
      entry.pagePermissions,
      entry.permissions?.allowedPages,
      entry.permissions?.pages,
      entry.access?.allowedPages,
      entry.access?.pages
    ].some((value) => flattenPageValues(value).length > 0);
  };

  const readBorrowStaffProfileAccess = async (email) => {
    const normalizedEmail = (email || "").toString().trim().toLowerCase();
    if (!normalizedEmail) return { ok: false, reason: "no-email" };
    if (STAFF_HEAD_EMAILS.has(normalizedEmail)) return { ok: true, reason: "head-override" };
    if (!firestore.db || !firestore.doc || !firestore.getDoc) return { ok: false, reason: "store-not-ready" };

    try {
      const ref = firestore.doc(firestore.db, STAFF_PROFILE_COLLECTION, normalizedEmail);
      const snap = await firestore.getDoc(ref);
      if (!snap?.exists?.()) {
        return { ok: false, reason: "missing-profile", path: `${STAFF_PROFILE_COLLECTION}/${normalizedEmail}` };
      }
      const data = snap.data() || {};
      const positions = Array.isArray(data.positions) ? data.positions : [];
      const hasStaffShape = Boolean(
        typeof data.role === "string" ||
        typeof data.positionCodeYY === "string" ||
        typeof data.divisionCodeYY === "string" ||
        positions.length ||
        hasExplicitPageList(data)
      );
      const topLevelAccess = hasBorrowStaffPage(data);
      const positionAccess = positions.some((position) => hasBorrowStaffPage(position));
      const hasAnyExplicitPages = hasExplicitPageList(data) || positions.some((position) => hasExplicitPageList(position));
      return {
        ok: hasStaffShape && (topLevelAccess || positionAccess || !hasAnyExplicitPages),
        reason: hasStaffShape ? "profile-loaded" : "not-staff-profile",
        path: `${STAFF_PROFILE_COLLECTION}/${normalizedEmail}`,
        topLevelAccess,
        positionAccess,
        hasAnyExplicitPages
      };
    } catch (error) {
      return {
        ok: false,
        reason: (error?.code || "profile-read-failed").toString(),
        path: `${STAFF_PROFILE_COLLECTION}/${normalizedEmail}`
      };
    }
  };

  const readBorrowProfiles = () => {
    try {
      const rawPrimary = window.localStorage?.getItem(BORROW_PROFILE_STORAGE_KEY);
      const rawLegacy = window.localStorage?.getItem(LEGACY_BORROW_PROFILE_STORAGE_KEY);
      const raw = rawPrimary || rawLegacy;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const profiles = parsed && typeof parsed === "object" ? parsed : {};
      const normalizedProfiles = Object.entries(profiles).reduce((acc, [key, value]) => {
        const canonicalKey = normalizeAccountEmail(key);
        if (!canonicalKey) return acc;
        acc[canonicalKey] = {
          ...(acc[canonicalKey] || {}),
          ...(value && typeof value === "object" ? value : {})
        };
        return acc;
      }, {});
      if (!rawPrimary && rawLegacy) {
        try {
          window.localStorage?.setItem(BORROW_PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfiles));
        } catch (_) {
          // ignore local cache write errors
        }
      }
      return normalizedProfiles;
    } catch (_) {
      return {};
    }
  };

  const BORROW_PROFILE_EMPTY_TEXT = "ยังไม่พบข้อมูล";
  const setBorrowProfileText = (el, value) => {
    if (!el) return;
    const text = (value || "").toString().trim();
    el.textContent = text || BORROW_PROFILE_EMPTY_TEXT;
    el.classList.toggle("is-empty", !text);
  };

  const applyBorrowProfileToForm = (profile) => {
    if (!profile || typeof profile !== "object") return;
    const snapshotProfile = normalizeBorrowProfileAcademicSnapshot(profile);
    activeBorrowProfile = {
      firstName: (snapshotProfile.firstName || "").toString().trim(),
      lastName: (snapshotProfile.lastName || "").toString().trim(),
      nickname: (snapshotProfile.nickname || "").toString().trim(),
      studentId: (snapshotProfile.studentId || "").toString().trim(),
      faculty: (snapshotProfile.faculty || "").toString().trim(),
      year: (snapshotProfile.year || "").toString().trim(),
      phone: (snapshotProfile.phone || "").toString().trim(),
      lineId: (snapshotProfile.lineId || "").toString().trim()
    };
    const fullName = [activeBorrowProfile.firstName, activeBorrowProfile.lastName].filter(Boolean).join(" ");
    setBorrowProfileText(borrowProfileFullNameEl, fullName);
    setBorrowProfileText(borrowProfileNicknameEl, activeBorrowProfile.nickname);
    setBorrowProfileText(borrowProfileStudentIdEl, activeBorrowProfile.studentId);
    if (borrowProfileFacultyYearEl) {
      const facultyYear = [activeBorrowProfile.faculty, activeBorrowProfile.year ? `ชั้นปี ${activeBorrowProfile.year}` : ""]
        .filter(Boolean)
        .join(" / ");
      setBorrowProfileText(borrowProfileFacultyYearEl, facultyYear);
    }
    setBorrowProfileText(borrowProfilePhoneEl, activeBorrowProfile.phone);
    setBorrowProfileText(borrowProfileLineIdEl, activeBorrowProfile.lineId);
  };

  const restoreBorrowProfileForCurrentUser = () => {
    const email = normalizeAccountEmail(currentUserEmail || "");
    if (!email) {
      activeBorrowProfile = null;
      setBorrowProfileText(borrowProfileFullNameEl, "");
      setBorrowProfileText(borrowProfileNicknameEl, "");
      setBorrowProfileText(borrowProfileStudentIdEl, "");
      setBorrowProfileText(borrowProfileFacultyYearEl, "");
      setBorrowProfileText(borrowProfilePhoneEl, "");
      setBorrowProfileText(borrowProfileLineIdEl, "");
      return;
    }
    const profile = readBorrowProfiles()[email];
    if (!profile) {
      setBorrowProfileText(borrowProfileFullNameEl, "");
      setBorrowProfileText(borrowProfileNicknameEl, "");
      setBorrowProfileText(borrowProfileStudentIdEl, "");
      setBorrowProfileText(borrowProfileFacultyYearEl, "");
      setBorrowProfileText(borrowProfilePhoneEl, "");
      setBorrowProfileText(borrowProfileLineIdEl, "");
      return;
    }
    applyBorrowProfileToForm(profile);
  };

  const getBorrowProfileForSubmit = async () => {
    const email = normalizeAccountEmail(currentUserEmail || "");
    if (!email) return null;
    if (activeBorrowProfile && activeBorrowProfile.firstName && activeBorrowProfile.lastName) {
      return activeBorrowProfile;
    }
    const local = readBorrowProfiles()[email];
    if (local) {
      applyBorrowProfileToForm(local);
      return activeBorrowProfile;
    }
    const remote = await readBorrowProfileFromFirestore();
    if (remote) {
      applyBorrowProfileToForm(remote);
      return activeBorrowProfile;
    }
    return null;
  };

  const readBorrowProfileFromFirestore = async () => {
    const firestoreBridge = window.sgcuFirestore || {};
    const authUser = window.sgcuAuth?.auth?.currentUser || null;
    const email = (authUser?.email || "").toString().trim().toLowerCase();
    const uid = (authUser?.uid || "").toString().trim();
    if (!email || !uid) return null;
    if (!firestoreBridge.db || !firestoreBridge.doc || !firestoreBridge.getDoc) return null;
    try {
      const ref = firestoreBridge.doc(firestoreBridge.db, USER_PROFILE_COLLECTION, uid);
      const snap = await firestoreBridge.getDoc(ref);
      if (!snap?.exists()) return null;
      const data = snap.data() || {};
      if (!data || typeof data !== "object") return null;
      const profiles = readBorrowProfiles();
      const accountEmail = normalizeAccountEmail(email);
      profiles[accountEmail] = {
        ...(profiles[accountEmail] || {}),
        ...data,
        authEmail: email,
        accountEmail,
        updatedAt: Date.now()
      };
      try {
        window.localStorage?.setItem(BORROW_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
        window.localStorage?.setItem(LEGACY_BORROW_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
      } catch (_) {
        // ignore local cache write errors
      }
      return profiles[accountEmail];
    } catch (_) {
      return null;
    }
  };

  const hasStaffPermission = () => {
    if (typeof staffAuthUser !== "undefined" && !!staffAuthUser) return true;
    return false;
  };

  const ensureStaffPermission = (silent = false) => {
    const ok = hasStaffPermission();
    if (!ok && !silent) {
      setStaffQueueMessage("บัญชีนี้ไม่มีสิทธิ์จัดการคิวคำขอ (Staff เท่านั้น)", "#b91c1c");
    }
    return ok;
  };

  const toYmd = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const parseDateYmd = (value) => {
    const text = (value || "").toString().trim();
    if (!text) return null;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const normalizeAllowedPickupDays = (value) => {
    const source = Array.isArray(value) ? value : DEFAULT_ALLOWED_PICKUP_DAYS;
    const days = source
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
    const unique = Array.from(new Set(days));
    return unique.length ? unique : DEFAULT_ALLOWED_PICKUP_DAYS;
  };

  const getAllowedPickupDays = () =>
    normalizeAllowedPickupDays(globalThis.SGCU_APP_CONFIG?.features?.borrowAssets?.allowedPickupDays);

  const formatAllowedPickupDays = (days) => {
    const ordered = WEEKDAY_DISPLAY_ORDER.filter((day) => days.includes(day));
    if (ordered.length === 7) return "ทุกวัน";
    return ordered.map((day) => WEEKDAY_NAMES_TH[day]).join(" / ");
  };

  const updateBorrowPickupDateRule = () => {
    if (!borrowPickupDateRule) return;
    const dayText = formatAllowedPickupDays(getAllowedPickupDays());
    borrowPickupDateRule.textContent = dayText === "ทุกวัน"
      ? "รับพัสดุได้ทุกวัน เวลา 16.00 น."
      : `รับพัสดุได้เฉพาะวัน${dayText} เวลา 16.00 น.`;
  };

  const setStaffBorrowPickupDaysMessage = (text = "", tone = "") => {
    if (!staffBorrowPickupDaysMessage) return;
    staffBorrowPickupDaysMessage.textContent = text;
    staffBorrowPickupDaysMessage.dataset.tone = tone;
  };

  const fillStaffBorrowPickupDays = (days = getAllowedPickupDays()) => {
    const allowedDays = normalizeAllowedPickupDays(days);
    staffBorrowPickupDayInputs.forEach((input) => {
      input.checked = allowedDays.includes(Number(input.value));
    });
  };

  const collectStaffBorrowPickupDays = () =>
    staffBorrowPickupDayInputs
      .filter((input) => input.checked)
      .map((input) => Number(input.value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  const getBorrowRuntimeSettingsRef = () => {
    const runtime = window.sgcuRuntimeConfig || {};
    const store = window.sgcuFirestore || firestore || {};
    if (!store.db || !store.doc) return null;
    return store.doc(store.db, runtime.collection || "appSettings", runtime.docId || "global");
  };

  const loadStaffBorrowPickupDays = async () => {
    if (!staffBorrowPickupDayInputs.length) return;
    fillStaffBorrowPickupDays();
    const store = window.sgcuFirestore || {};
    const ref = getBorrowRuntimeSettingsRef();
    if (!ref || !store.getDoc) return;
    try {
      const snap = await store.getDoc(ref);
      if (!snap.exists()) return;
      const remoteConfig = snap.data()?.config || {};
      const remoteDays = remoteConfig.features?.borrowAssets?.allowedPickupDays;
      if (!Array.isArray(remoteDays) || !remoteDays.length) return;
      if (window.sgcuRuntimeConfig?.applyConfig) window.sgcuRuntimeConfig.applyConfig(remoteConfig);
      fillStaffBorrowPickupDays(remoteDays);
      updateBorrowPickupDateRule();
    } catch (error) {
      console.warn("borrow pickup days load failed - app.borrow-assets.js:640", error);
    }
  };

  const saveStaffBorrowPickupDays = async () => {
    if (!staffBorrowPickupDayInputs.length) return;
    if (!ensureStaffPermission()) return;
    const allowedPickupDays = collectStaffBorrowPickupDays();
    if (!allowedPickupDays.length) {
      setStaffBorrowPickupDaysMessage("กรุณาเลือกอย่างน้อย 1 วัน", "error");
      return;
    }
    const store = window.sgcuFirestore || {};
    const ref = getBorrowRuntimeSettingsRef();
    if (!ref || !store.setDoc) {
      setStaffBorrowPickupDaysMessage("ไม่สามารถบันทึกได้ เพราะยังไม่เชื่อมต่อ Firestore", "error");
      return;
    }
    const config = {
      features: {
        borrowAssets: {
          allowedPickupDays: normalizeAllowedPickupDays(allowedPickupDays)
        }
      }
    };
    const normalized = window.sgcuRuntimeConfig?.normalizeSettingsConfig
      ? window.sgcuRuntimeConfig.normalizeSettingsConfig(config)
      : config;
    if (staffBorrowPickupDaysSaveBtn) staffBorrowPickupDaysSaveBtn.disabled = true;
    setStaffBorrowPickupDaysMessage("กำลังบันทึก...", "warning");
    try {
      await store.setDoc(
        ref,
        {
          enabled: true,
          config: normalized,
          updatedAt: store.serverTimestamp ? store.serverTimestamp() : new Date()
        },
        { merge: true }
      );
      if (window.sgcuRuntimeConfig?.applyConfig) window.sgcuRuntimeConfig.applyConfig(normalized);
      fillStaffBorrowPickupDays(normalized.features?.borrowAssets?.allowedPickupDays);
      updateBorrowPickupDateRule();
      setStaffBorrowPickupDaysMessage("บันทึกวันรับพัสดุแล้ว", "success");
    } catch (error) {
      console.error("borrow pickup days save failed - app.borrow-assets.js:695", error);
      setStaffBorrowPickupDaysMessage("บันทึกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ Staff", "error");
    } finally {
      if (staffBorrowPickupDaysSaveBtn) staffBorrowPickupDaysSaveBtn.disabled = false;
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = parseDateYmd(value);
    if (!date) return value;
    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatDateRange = (pickupDate, returnDate) =>
    `${formatDate(pickupDate)} - ${formatDate(returnDate)}`;

  const formatPickupAppointmentNote = (pickupDate) =>
    pickupDate ? `เจ้าหน้าที่นัดรับพัสดุวันที่ ${formatDate(pickupDate)} เวลา 16.00 น.` : "";

  const getDayDiffFromToday = (value) => {
    const date = parseDateYmd(value);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - today.getTime()) / 86400000);
  };

  const isExpiredPendingBorrowRequest = (item) =>
    item?.status === STATUS_PENDING && getDayDiffFromToday(item.returnDate) < 0;

  const isStaffBorrowQueueItem = (item) =>
    STAFF_REQUEST_TAB_STATUSES.has(item?.status) && !isExpiredPendingBorrowRequest(item);

  const isStaffBorrowHistoryItem = (item) =>
    STAFF_HISTORY_TAB_STATUSES.has(item?.status) || isExpiredPendingBorrowRequest(item);

  const summarizeAssetsInline = (assets = []) => {
    const list = Array.isArray(assets) ? assets : [];
    if (!list.length) return "-";
    return list
      .map((asset) => {
        const name = (asset?.name || asset?.code || "-").toString().trim();
        const qty = Number(asset?.qty || 0);
        const qtyText = Number.isFinite(qty) ? String(qty) : "0";
        const unit = (asset?.unit || "").toString().trim();
        return `${name} ${qtyText}${unit ? ` ${unit}` : ""}`.trim();
      })
      .join(", ");
  };

  const buildBorrowFollowupMeta = (item) => {
    if (!item || (item.status !== STATUS_APPROVED && item.status !== STATUS_RECEIVED)) {
      return {
        dayDiff: null,
        overdue: false,
        dueSoon: false,
        statusText: "ยังไม่ถึงขั้นติดตาม",
        badgeClass: "badge-approved"
      };
    }
    const dayDiff = getDayDiffFromToday(item.returnDate);
    if (dayDiff == null) {
      return {
        dayDiff: null,
        overdue: false,
        dueSoon: true,
        statusText: "ต้องติดตาม (ไม่พบวันคืน)",
        badgeClass: "badge-warning"
      };
    }
    if (dayDiff < 0) {
      return {
        dayDiff,
        overdue: true,
        dueSoon: true,
        statusText: `เกินกำหนด ${Math.abs(dayDiff)} วัน`,
        badgeClass: "badge-rejected"
      };
    }
    if (dayDiff === 0) {
      return {
        dayDiff,
        overdue: false,
        dueSoon: true,
        statusText: "ครบกำหนดวันนี้",
        badgeClass: "badge-warning"
      };
    }
    if (dayDiff <= BORROW_FOLLOWUP_SOON_DAYS) {
      return {
        dayDiff,
        overdue: false,
        dueSoon: true,
        statusText: `ครบกำหนดใน ${dayDiff} วัน`,
        badgeClass: "badge-pending"
      };
    }
    return {
      dayDiff,
      overdue: false,
      dueSoon: false,
      statusText: "ยังไม่ถึงกำหนดติดตาม",
      badgeClass: "badge-approved"
    };
  };

  const renderBorrowOverviewCards = (container, stats = {}) => {
    if (!container) return;
    const cards = [
      { title: "ยืมค้างทั้งหมด", value: stats.borrowed || 0, caption: "อนุมัติแล้วและยังไม่คืน" },
      { title: "เกินกำหนดคืน", value: stats.overdue || 0, caption: "ควรเร่งติดตามทันที" },
      { title: "ใกล้ครบกำหนด", value: stats.dueSoon || 0, caption: `ภายใน ${BORROW_FOLLOWUP_SOON_DAYS} วัน` },
      {
        title: stats.pendingTitle || "รออนุมัติ",
        value: stats.pending || 0,
        caption: stats.pendingCaption || "ยังอยู่ในคิวพิจารณา"
      }
    ];
    container.innerHTML = cards.map((card) => `
      <article class="card card-hover">
        <div class="card-title">${safeEscape(card.title)}</div>
        <div class="card-value">${safeEscape(String(card.value))}</div>
        <div class="card-caption">${safeEscape(card.caption)}</div>
      </article>
    `).join("");
  };

  const renderMyBorrowOverview = () => {
    if (!borrowOverviewCards && !borrowFollowupTableBody) return;
    if (!currentUserEmail) {
      renderBorrowOverviewCards(borrowOverviewCards, {
        borrowed: 0,
        overdue: 0,
        dueSoon: 0,
        pending: 0
      });
      if (borrowFollowupTableBody) {
        borrowFollowupTableBody.innerHTML = `
          <tr>
            <td colspan="3">กรุณาเข้าสู่ระบบเพื่อดูภาพรวมพัสดุที่ยืม</td>
          </tr>
        `;
      }
      return;
    }
    const mine = borrowRequests
      .filter((item) => !item.isDeleted)
      .filter((item) => matchesCurrentAccountEmail(item.requesterEmail, item.accountEmail));
    const pending = mine.filter((item) => item.status === STATUS_PENDING).length;
    const borrowed = mine.filter((item) => item.status === STATUS_APPROVED || item.status === STATUS_RECEIVED).length;
    const overdue = mine.filter((item) => buildBorrowFollowupMeta(item).overdue).length;
    const dueSoon = mine.filter((item) => {
      const meta = buildBorrowFollowupMeta(item);
      return meta.dueSoon && !meta.overdue;
    }).length;
    renderBorrowOverviewCards(borrowOverviewCards, { pending, borrowed, overdue, dueSoon });

    if (!borrowFollowupTableBody) return;
    const followups = mine
      .map((item) => ({ item, meta: buildBorrowFollowupMeta(item) }))
      .filter((entry) => entry.meta.dueSoon)
      .sort((a, b) => {
        if (a.meta.overdue !== b.meta.overdue) return a.meta.overdue ? -1 : 1;
        const aDiff = a.meta.dayDiff == null ? -9999 : a.meta.dayDiff;
        const bDiff = b.meta.dayDiff == null ? -9999 : b.meta.dayDiff;
        return aDiff - bDiff;
      });
    if (!followups.length) {
      borrowFollowupTableBody.innerHTML = `
        <tr>
          <td colspan="3">ยังไม่มีรายการที่ต้องติดตาม</td>
        </tr>
      `;
      return;
    }
    borrowFollowupTableBody.innerHTML = followups.map(({ item, meta }) => `
      <tr>
        <td>
          <div class="borrow-followup-item">${safeEscape(summarizeAssetsInline(item.assets))}</div>
          <div class="borrow-followup-item-sub">เลขที่คำขอ: ${safeEscape(item.requestNo || item.id || "-")}</div>
        </td>
        <td>${safeEscape(formatDate(item.returnDate || ""))}</td>
        <td><span class="badge ${safeEscape(meta.badgeClass)}">${safeEscape(meta.statusText)}</span></td>
      </tr>
    `).join("");
  };

  const renderStaffBorrowOverview = (items = null) => {
    if (!staffBorrowOverviewCards && !staffBorrowFollowupTableBody) return;
    const allItems = Array.isArray(items)
      ? items.filter((item) => !item.isDeleted)
      : borrowRequests.filter((item) => !item.isDeleted);
    const pending = allItems.filter((item) => item.status === STATUS_PENDING).length;
    const borrowed = allItems.filter((item) => item.status === STATUS_APPROVED || item.status === STATUS_RECEIVED).length;
    const overdue = allItems.filter((item) => buildBorrowFollowupMeta(item).overdue).length;
    const dueSoon = allItems.filter((item) => {
      const meta = buildBorrowFollowupMeta(item);
      return meta.dueSoon && !meta.overdue;
    }).length;
    renderBorrowOverviewCards(staffBorrowOverviewCards, {
      pending,
      borrowed,
      overdue,
      dueSoon,
      pendingTitle: staffRequestTabMode === "history" ? "เลยกำหนดก่อนอนุมัติ" : "รออนุมัติ",
      pendingCaption: staffRequestTabMode === "history" ? "เลยวันคืนโดยยังไม่ได้อนุมัติ" : "ยังอยู่ในคิวพิจารณา"
    });

    if (!staffBorrowFollowupTableBody) return;
    const followups = allItems
      .map((item) => ({ item, meta: buildBorrowFollowupMeta(item) }))
      .filter((entry) => entry.meta.dueSoon)
      .sort((a, b) => {
        if (a.meta.overdue !== b.meta.overdue) return a.meta.overdue ? -1 : 1;
        const aDiff = a.meta.dayDiff == null ? -9999 : a.meta.dayDiff;
        const bDiff = b.meta.dayDiff == null ? -9999 : b.meta.dayDiff;
        return aDiff - bDiff;
      });
    if (!followups.length) {
      staffBorrowFollowupTableBody.innerHTML = `
        <tr>
          <td colspan="5">ยังไม่มีรายการที่ต้องติดตาม</td>
        </tr>
      `;
      return;
    }
    staffBorrowFollowupTableBody.innerHTML = followups.map(({ item, meta }) => {
      const requesterName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "-";
      return `
        <tr class="borrow-staff-row">
          <td>${safeEscape(item.requestNo || item.id || "-")}</td>
          <td>${safeEscape(requesterName)}</td>
          <td>${safeEscape(summarizeAssetsInline(item.assets))}</td>
          <td>${safeEscape(formatDate(item.returnDate || ""))}</td>
          <td><span class="badge ${safeEscape(meta.badgeClass)}">${safeEscape(meta.statusText)}</span></td>
        </tr>
      `;
    }).join("");
  };

  const timestampToMillis = (ts) => {
    if (!ts) return 0;
    if (typeof ts === "number" && Number.isFinite(ts)) return ts;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") {
      return (ts.seconds * 1000) + Math.floor((ts.nanoseconds || 0) / 1000000);
    }
    return 0;
  };

  const normalizeRequestStatus = (value) => {
    const normalized = (value || STATUS_PENDING).toString().trim().toLowerCase();
    if (
      normalized === STATUS_PENDING ||
      normalized === STATUS_APPROVED ||
      normalized === STATUS_RECEIVED ||
      normalized === STATUS_REJECTED ||
      normalized === STATUS_CANCELLED ||
      normalized === STATUS_RETURNED
    ) {
      return normalized;
    }
    return STATUS_PENDING;
  };

  const isReservedStockStatus = (status) => {
    const normalized = normalizeRequestStatus(status);
    return normalized === STATUS_APPROVED || normalized === STATUS_RECEIVED;
  };

  const toSafeInt = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.trunc(num));
  };

  const buildAssetQtyByCode = (assets = []) => {
    const qtyByCode = new Map();
    if (!Array.isArray(assets)) return qtyByCode;
    assets.forEach((asset) => {
      const code = (asset?.code || "").toString().trim().toUpperCase();
      if (!code) return;
      const qty = toSafeInt(asset?.qty);
      if (!qty) return;
      qtyByCode.set(code, (qtyByCode.get(code) || 0) + qty);
    });
    return qtyByCode;
  };

  const buildReservationDeltas = (prevStatus, nextStatus, assets = [], nextAssets = assets) => {
    const wasReserved = isReservedStockStatus(prevStatus);
    const willBeReserved = isReservedStockStatus(nextStatus);
    const previousQtyByCode = wasReserved ? buildAssetQtyByCode(assets) : new Map();
    const nextQtyByCode = willBeReserved ? buildAssetQtyByCode(nextAssets) : new Map();
    const codes = new Set([...previousQtyByCode.keys(), ...nextQtyByCode.keys()]);
    const deltas = new Map();
    codes.forEach((code) => {
      const delta = (nextQtyByCode.get(code) || 0) - (previousQtyByCode.get(code) || 0);
      if (delta) deltas.set(code, delta);
    });
    return deltas;
  };

  const makeBorrowStockDocId = (code = "") => {
    const normalized = (code || "").toString().trim().toUpperCase();
    if (!normalized) return "";
    return encodeURIComponent(normalized).replace(/\./g, "%2E");
  };

  const formatBorrowStatusUpdateError = (error, fallback = "อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่") => {
    const code = (error?.code || "").toString().trim();
    const message = (error?.message || "").toString().trim();
    if (code === "permission-denied") return "ไม่มีสิทธิ์อัปเดตสถานะคำขอนี้ (Firestore Rules)";
    if (code === "resource-exhausted") return "อนุมัติไม่สำเร็จ: พัสดุคงเหลือไม่พอ";
    if (code === "not-found") return "ไม่พบคำขอนี้ในระบบ";
    if (code === "invalid-argument") return `อัปเดตสถานะไม่สำเร็จ (invalid-argument${message ? `: ${message}` : ""})`;
    if (code) return `${fallback} (${code}${message ? `: ${message}` : ""})`;
    return message ? `${fallback} (${message})` : fallback;
  };

  const applyStockDeltasInTransaction = async (transaction, deltas, actorEmail = "") => {
    if (!deltas.size) return;
    const stockUpdates = [];
    for (const [code, delta] of deltas.entries()) {
      if (!code || !delta) continue;
      const catalogRow = assetRowMap.get(code);
      const maxRemaining = Number(catalogRow?.remaining);
      const hasFiniteLimit = Number.isFinite(maxRemaining) && maxRemaining >= 0;
      if (!hasFiniteLimit) continue;

      const stockDocId = makeBorrowStockDocId(code);
      if (!stockDocId) continue;
      const stockRef = firestore.doc(firestore.db, BORROW_ASSET_STOCK_COLLECTION, stockDocId);
      stockUpdates.push({ code, delta, maxRemaining, stockRef });
    }

    const stockSnapshots = [];
    for (const item of stockUpdates) {
      stockSnapshots.push(await transaction.get(item.stockRef));
    }

    stockUpdates.forEach((item, index) => {
      const stockSnap = stockSnapshots[index];
      const currentReserved = toSafeInt(stockSnap.data()?.reserved);
      let nextReserved = currentReserved + item.delta;

      if (ENABLE_ASSET_AVAILABILITY_CHECK && item.delta > 0 && nextReserved > item.maxRemaining) {
        const err = new Error(`พัสดุ ${item.code} คงเหลือไม่พอ`);
        err.code = "resource-exhausted";
        err.assetCode = item.code;
        err.available = Math.max(0, item.maxRemaining - currentReserved);
        throw err;
      }
      if (nextReserved < 0) nextReserved = 0;

      transaction.set(
        item.stockRef,
        {
          code: item.code,
          reserved: nextReserved,
          maxRemaining: item.maxRemaining,
          updatedBy: actorEmail || "",
          updatedAt: firestore.serverTimestamp()
        },
        { merge: true }
      );
    });
  };

  const normalizeDeletedFlag = (value) => {
    if (typeof value === "boolean") return value;
    const normalized = (value || "").toString().trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
  };

  const statusBadge = (status) => {
    if (status === STATUS_APPROVED) {
      return '<span class="badge badge-approved">อนุมัติแล้ว</span>';
    }
    if (status === STATUS_RECEIVED) {
      return '<span class="badge badge-approved">รับของแล้ว</span>';
    }
    if (status === STATUS_REJECTED) {
      return '<span class="badge badge-rejected">ไม่อนุมัติ</span>';
    }
    if (status === STATUS_CANCELLED) {
      return '<span class="badge badge-warning">ยกเลิก</span>';
    }
    if (status === STATUS_RETURNED) {
      return '<span class="badge badge-approved">คืนแล้ว</span>';
    }
    return '<span class="badge badge-pending">รออนุมัติ</span>';
  };

  const statusText = (status) => {
    if (status === STATUS_APPROVED) return "อนุมัติแล้ว";
    if (status === STATUS_RECEIVED) return "รับของแล้ว";
    if (status === STATUS_REJECTED) return "ไม่อนุมัติ";
    if (status === STATUS_CANCELLED) return "ยกเลิก";
    if (status === STATUS_RETURNED) return "คืนแล้ว";
    return "รออนุมัติ";
  };

  const setBorrowNotificationStatus = (text = "", color = "#6b7280") => {
    if (!borrowNotificationStatusEl) return;
    borrowNotificationStatusEl.textContent = text;
    borrowNotificationStatusEl.style.color = color;
  };

  const maybeSendBorrowBrowserNotification = (title, body) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return false;
    if (Notification.permission !== "granted") return false;
    try {
      const webPush = window.sgcuWebPush;
      if (webPush && typeof webPush.showNotification === "function") {
        void webPush.showNotification(title, body, {
          icon: "img/icons/treasurer-icon-192.png",
          badge: "img/icons/treasurer-icon-192.png",
          data: { url: "./#borrow-assets" }
        });
        return true;
      }
      const notificationIcon = "img/icons/treasurer-icon-192.png";
      // eslint-disable-next-line no-new
      new Notification(title, { body, icon: notificationIcon, badge: notificationIcon });
      return true;
    } catch (_) {
      return false;
    }
  };

  const showBorrowRuntimeToastNotice = (title, body, tone = "success") => {
    if (typeof document === "undefined") return;
    let host = document.getElementById("borrowRuntimeToastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "borrowRuntimeToastHost";
      host.style.position = "fixed";
      host.style.top = "14px";
      host.style.right = "14px";
      host.style.zIndex = "9999";
      host.style.display = "flex";
      host.style.flexDirection = "column";
      host.style.gap = "8px";
      host.style.maxWidth = "min(92vw, 360px)";
      host.style.pointerEvents = "none";
      document.body.appendChild(host);
    }
    const toast = document.createElement("div");
    const isError = tone === "error";
    toast.style.borderRadius = "10px";
    toast.style.border = isError ? "1px solid #fca5a5" : "1px solid #86efac";
    toast.style.background = "#ffffff";
    toast.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.12)";
    toast.style.padding = "10px 12px";
    toast.style.pointerEvents = "auto";
    toast.style.fontSize = "12px";
    toast.style.lineHeight = "1.35";
    toast.style.color = "#1f2937";
    toast.innerHTML = `
      <div style="font-weight:700; color:${isError ? "#b91c1c" : "#047857"};">${safeEscape(title)}</div>
      <div style="margin-top:3px;">${safeEscape(body)}</div>
    `;
    host.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
      if (host && !host.children.length) host.remove();
    }, 5000);
  };

  const getBorrowNotificationKey = (item) =>
    `${item?.sourceCollection || BORROW_REQUEST_COLLECTION}:${item?.id || ""}`;

  const getBorrowNotificationFingerprint = (item) =>
    [
      item?.status || "",
      item?.pickupDate || "",
      item?.returnDate || "",
      item?.staffNote || ""
    ].join("|");

  const buildBorrowNotificationBody = (item) => {
    const requestNo = item.requestNo || item.id || "-";
    const assetsText = summarizeAssetsInline(item.assets || []);
    const dateText = formatDateRange(item.pickupDate, item.returnDate);
    const noteText = (item.staffNote || "").toString().trim();
    return `เลขที่ ${requestNo} • ${assetsText} • ${dateText}${noteText ? ` • ${noteText}` : ""}`;
  };

  const buildBorrowNotificationTitle = (status) => {
    if (status === STATUS_APPROVED) return "คำขอยืมพัสดุได้รับอนุมัติ";
    if (status === STATUS_RECEIVED) return "บันทึกรับพัสดุแล้ว";
    if (status === STATUS_REJECTED) return "คำขอยืมพัสดุไม่อนุมัติ";
    if (status === STATUS_CANCELLED) return "คำขอยืมพัสดุถูกยกเลิก";
    if (status === STATUS_RETURNED) return "บันทึกคืนพัสดุแล้ว";
    return "คำขอยืมพัสดุมีการอัปเดต";
  };

  const buildBorrowNotificationMap = (list = []) => {
    const email = readCurrentAccountEmail();
    const map = new Map();
    if (!email) return map;
    list
      .filter((item) => !item.isDeleted)
      .filter((item) => matchesCurrentAccountEmail(item.requesterEmail, item.accountEmail))
      .forEach((item) => {
        const key = getBorrowNotificationKey(item);
        if (key.endsWith(":")) return;
        map.set(key, {
          status: item.status,
          pickupDate: item.pickupDate || "",
          returnDate: item.returnDate || "",
          fingerprint: getBorrowNotificationFingerprint(item),
          item
        });
      });
    return map;
  };

  const syncBorrowStatusNotifications = (list = []) => {
    const nextMap = buildBorrowNotificationMap(list);
    if (!hasBorrowNotificationBaseline) {
      previousBorrowNotificationByKey = nextMap;
      hasBorrowNotificationBaseline = true;
      return;
    }
    nextMap.forEach((next, key) => {
      const prev = previousBorrowNotificationByKey.get(key);
      if (!prev || prev.fingerprint === next.fingerprint) return;
      const statusChanged = prev.status !== next.status;
      const pickupChanged = prev.pickupDate !== next.pickupDate;
      const returnChanged = prev.returnDate !== next.returnDate;
      const shouldNotifyStatus = statusChanged && next.status !== STATUS_PENDING;
      const shouldNotifyDate =
        (pickupChanged || returnChanged) &&
        (next.status === STATUS_APPROVED || next.status === STATUS_RECEIVED);
      if (!shouldNotifyStatus && !shouldNotifyDate) return;

      const title = shouldNotifyStatus
        ? buildBorrowNotificationTitle(next.status)
        : "วันรับ-คืนพัสดุมีการอัปเดต";
      const body = buildBorrowNotificationBody(next.item);
      maybeSendBorrowBrowserNotification(title, body);
      showBorrowRuntimeToastNotice(
        title,
        body,
        next.status === STATUS_REJECTED || next.status === STATUS_CANCELLED ? "error" : "success"
      );
      setBorrowNotificationStatus(`แจ้งเตือนล่าสุด: ${title}`, "#047857");
    });
    previousBorrowNotificationByKey = nextMap;
  };

  const setStaffBorrowNotificationStatus = (text = "", color = "#6b7280") => {
    if (!staffBorrowNotificationStatusEl) return;
    staffBorrowNotificationStatusEl.textContent = text;
    staffBorrowNotificationStatusEl.style.color = color;
  };

  const maybeSendStaffBorrowBrowserNotification = (title, body) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return false;
    if (Notification.permission !== "granted") return false;
    try {
      const webPush = window.sgcuWebPush;
      if (webPush && typeof webPush.showNotification === "function") {
        void webPush.showNotification(title, body, {
          icon: "img/icons/treasurer-icon-192.png",
          badge: "img/icons/treasurer-icon-192.png",
          data: { url: "./#borrow-assets-staff" }
        });
        return true;
      }
      const notificationIcon = "img/icons/treasurer-icon-192.png";
      // eslint-disable-next-line no-new
      new Notification(title, { body, icon: notificationIcon, badge: notificationIcon });
      return true;
    } catch (_) {
      return false;
    }
  };

  const buildStaffBorrowNotificationBody = (item) => {
    const requestNo = item.requestNo || item.id || "-";
    const requesterName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || item.requesterEmail || "-";
    const assetsText = summarizeAssetsInline(item.assets || []);
    const dateText = formatDateRange(item.pickupDate, item.returnDate);
    return `เลขที่ ${requestNo} • ${requesterName} • ${assetsText} • ${dateText}`;
  };

  const getStaffBorrowNotificationKey = (item) =>
    `${item?.sourceCollection || BORROW_REQUEST_COLLECTION}:${item?.id || ""}`;

  const getStaffBorrowNotificationFingerprint = (item) => {
    const meta = buildBorrowFollowupMeta(item);
    const followupState = meta.dueSoon
      ? (meta.overdue ? `overdue:${meta.dayDiff}` : `due:${meta.dayDiff}`)
      : "";
    return [
      item?.status || "",
      item?.pickupDate || "",
      item?.returnDate || "",
      item?.submittedAtMs || "",
      followupState
    ].join("|");
  };

  const buildStaffBorrowNotificationMap = (list = []) => {
    const map = new Map();
    if (!hasStaffPermission()) return map;
    list
      .filter((item) => !item.isDeleted)
      .forEach((item) => {
        const key = getStaffBorrowNotificationKey(item);
        if (key.endsWith(":")) return;
        map.set(key, {
          status: item.status,
          fingerprint: getStaffBorrowNotificationFingerprint(item),
          item
        });
      });
    return map;
  };

  const syncStaffBorrowNotifications = (list = []) => {
    const nextMap = buildStaffBorrowNotificationMap(list);
    if (!hasStaffBorrowNotificationBaseline) {
      previousStaffBorrowNotificationByKey = nextMap;
      hasStaffBorrowNotificationBaseline = true;
      return;
    }
    nextMap.forEach((next, key) => {
      const prev = previousStaffBorrowNotificationByKey.get(key);
      const meta = buildBorrowFollowupMeta(next.item);
      const isNewPending = !prev && next.status === STATUS_PENDING;
      const becameFollowup =
        meta.dueSoon &&
        (next.status === STATUS_APPROVED || next.status === STATUS_RECEIVED) &&
        (!prev || prev.fingerprint !== next.fingerprint);
      if (!isNewPending && !becameFollowup) return;

      const title = isNewPending
        ? "มีคำขอยืมพัสดุใหม่"
        : meta.overdue ? "พัสดุเกินกำหนดคืน" : "พัสดุใกล้ครบกำหนดคืน";
      const body = isNewPending
        ? buildStaffBorrowNotificationBody(next.item)
        : `${buildStaffBorrowNotificationBody(next.item)} • ${meta.statusText}`;
      maybeSendStaffBorrowBrowserNotification(title, body);
      showBorrowRuntimeToastNotice(title, body, meta.overdue ? "error" : "success");
      setStaffBorrowNotificationStatus(`แจ้งเตือนล่าสุด: ${title}`, meta.overdue ? "#b91c1c" : "#047857");
    });
    previousStaffBorrowNotificationByKey = nextMap;
  };

  const getAssetsCsvText = (assets = []) =>
    (Array.isArray(assets) ? assets : [])
      .map((asset) => {
        const name = asset?.name || asset?.code || "-";
        const code = asset?.code ? ` (${asset.code})` : "";
        const qty = Number(asset?.qty || 0);
        const qtyText = Number.isFinite(qty) ? String(qty) : "0";
        return `${name}${code} ${qtyText} ${asset?.unit || ""}`.trim();
      })
      .join(" | ");

  const toBorrowCsvRow = (item) => ({
    "เลขคำขอ": item.requestNo || item.id || "",
    "วันที่ยื่น": item.createdDate || "",
    "ปีการศึกษา": item.academicYear || "",
    "ชื่อผู้ขอ": [item.firstName, item.lastName].filter(Boolean).join(" ").trim(),
    "ชื่อเล่น": item.nickname || "",
    "อีเมล": item.requesterEmail || "",
    "รหัสนิสิต": item.studentId || "",
    "คณะ": item.faculty || "",
    "ชั้นปี": item.year || "",
    "เบอร์โทร": item.phone || "",
    "Line ID": item.lineId || "",
    "ประเภทองค์กร": item.projectName || "",
    "ฝ่าย / ชมรม": item.projectDept || "",
    "กิจกรรม": item.projectDetail || "",
    "รายการพัสดุ": getAssetsCsvText(item.assets),
    "วันที่รับ": item.pickupDate || "",
    "วันที่คืน": item.returnDate || "",
    "สถานะ": statusText(item.status),
    "หมายเหตุเจ้าหน้าที่": item.staffNote || ""
  });

  const exportBorrowRowsCsv = (rows = [], fileName = "borrow-asset-requests") => {
    window.sgcuCsvExport?.download({
      fileName,
      headers: [
        "เลขคำขอ",
        "วันที่ยื่น",
        "ปีการศึกษา",
        "ชื่อผู้ขอ",
        "ชื่อเล่น",
        "อีเมล",
        "รหัสนิสิต",
        "คณะ",
        "ชั้นปี",
        "เบอร์โทร",
        "Line ID",
        "ประเภทองค์กร",
        "ฝ่าย / ชมรม",
        "กิจกรรม",
        "รายการพัสดุ",
        "วันที่รับ",
        "วันที่คืน",
        "สถานะ",
        "หมายเหตุเจ้าหน้าที่"
      ],
      rows: rows.map(toBorrowCsvRow)
    });
  };

  const getMyBorrowRequestRows = () =>
    borrowRequests
      .filter((item) => !item.isDeleted)
      .filter((item) => currentUserEmail && matchesCurrentAccountEmail(item.requesterEmail, item.accountEmail))
      .sort((a, b) => (b.submittedAtMs || 0) - (a.submittedAtMs || 0));

  const getStaffBorrowVisibleRows = () =>
    [...borrowRequests]
      .filter((item) => !item.isDeleted)
      .filter((item) => staffRequestTabMode === "history"
        ? isStaffBorrowHistoryItem(item)
        : isStaffBorrowQueueItem(item))
      .filter(matchesStaffBorrowRequestFilters)
      .sort((a, b) => (staffRequestTabMode === "history"
        ? (b.updatedAtMs || 0) - (a.updatedAtMs || 0)
        : (b.submittedAtMs || 0) - (a.submittedAtMs || 0)));

  const buildStaffBorrowRequestSearchText = (item) =>
    [
      item.requestNo,
      item.id,
      item.createdDate,
      item.academicYear,
      item.firstName,
      item.lastName,
      item.nickname,
      item.requesterEmail,
      item.accountEmail,
      item.studentId,
      item.faculty,
      item.year,
      item.phone,
      item.lineId,
      item.projectName,
      item.projectDept,
      item.projectDetail,
      item.staffNote,
      statusText(item.status),
      summarizeAssetsInline(item.assets),
      ...(Array.isArray(item.assets)
        ? item.assets.flatMap((asset) => [asset?.code, asset?.name, asset?.unit])
        : [])
    ]
      .map((value) => (value == null ? "" : String(value).trim().toLowerCase()))
      .join(" ");

  const dateInRange = (value, fromValue, toValue) => {
    const date = parseDateYmd(value);
    const from = parseDateYmd(fromValue);
    const to = parseDateYmd(toValue);
    if ((from || to) && !date) return false;
    if (from && date.getTime() < from.getTime()) return false;
    if (to && date.getTime() > to.getTime()) return false;
    return true;
  };

  const getStaffBorrowDueState = (item) => {
    if (item.status !== STATUS_APPROVED && item.status !== STATUS_RECEIVED) return "normal";
    const meta = buildBorrowFollowupMeta(item);
    if (meta.dayDiff == null) return "missing";
    if (meta.overdue) return "overdue";
    if (meta.dayDiff === 0) return "today";
    if (meta.dueSoon) return "soon";
    return "normal";
  };

  const getBorrowMasterOrgTypeSet = () => new Set(collectBorrowOrgTypeOptions());

  const isExternalBorrowRequest = (item, masterOrgTypeSet = getBorrowMasterOrgTypeSet()) => {
    const source = (item?.projectOrgSource || "").toString().trim().toLowerCase();
    if (source === "external" || source === "other") return true;
    if (source === "master") return false;
    const projectName = (item?.projectName || "").toString().trim();
    return !!projectName && !masterOrgTypeSet.has(projectName);
  };

  function matchesStaffBorrowRequestFilters(item) {
    const term = (staffBorrowRequestSearch?.value || "").trim().toLowerCase();
    const status = staffBorrowRequestStatusFilter?.value || "all";
    const org = staffBorrowRequestOrgFilter?.value || "all";
    const dept = staffBorrowRequestDeptFilter?.value || "all";
    const due = staffBorrowRequestDueFilter?.value || "all";

    if (term && !buildStaffBorrowRequestSearchText(item).includes(term)) return false;
    if (status !== "all" && item.status !== status) return false;
    if (org === EXTERNAL_ORG_FILTER_VALUE) {
      if (!isExternalBorrowRequest(item)) return false;
    } else if (org !== "all" && (item.projectName || "") !== org) {
      return false;
    }
    if (dept !== "all") {
      const deptMatch = org === EXTERNAL_ORG_FILTER_VALUE
        ? (item.projectDept || "") === dept || (item.projectName || "") === dept
        : (item.projectDept || "") === dept;
      if (!deptMatch) return false;
    }
    if (due !== "all" && getStaffBorrowDueState(item) !== due) return false;
    if (!dateInRange(item.pickupDate, staffBorrowRequestPickupFrom?.value || "", staffBorrowRequestPickupTo?.value || "")) {
      return false;
    }
    if (!dateInRange(item.returnDate, staffBorrowRequestReturnFrom?.value || "", staffBorrowRequestReturnTo?.value || "")) {
      return false;
    }
    return true;
  }

  const hasActiveStaffBorrowRequestFilters = () =>
    !!(
      (staffBorrowRequestSearch?.value || "").trim() ||
      (staffBorrowRequestStatusFilter?.value || "all") !== "all" ||
      (staffBorrowRequestOrgFilter?.value || "all") !== "all" ||
      (staffBorrowRequestDeptFilter?.value || "all") !== "all" ||
      (staffBorrowRequestDueFilter?.value || "all") !== "all" ||
      staffBorrowRequestPickupFrom?.value ||
      staffBorrowRequestPickupTo?.value ||
      staffBorrowRequestReturnFrom?.value ||
      staffBorrowRequestReturnTo?.value
    );

  const countActiveStaffBorrowRequestFilters = () => {
    const values = [
      (staffBorrowRequestStatusFilter?.value || "all") !== "all" ? staffBorrowRequestStatusFilter?.value : "",
      (staffBorrowRequestOrgFilter?.value || "all") !== "all" ? staffBorrowRequestOrgFilter?.value : "",
      (staffBorrowRequestDeptFilter?.value || "all") !== "all" ? staffBorrowRequestDeptFilter?.value : "",
      (staffBorrowRequestDueFilter?.value || "all") !== "all" ? staffBorrowRequestDueFilter?.value : "",
      staffBorrowRequestPickupFrom?.value || "",
      staffBorrowRequestPickupTo?.value || "",
      staffBorrowRequestReturnFrom?.value || "",
      staffBorrowRequestReturnTo?.value || ""
    ];
    return values.filter(Boolean).length;
  };

  const updateStaffBorrowMobileFilterToggle = () => {
    if (!staffBorrowMobileFilterBtn) return;
    const count = countActiveStaffBorrowRequestFilters();
    staffBorrowMobileFilterBtn.classList.toggle("has-active-filters", count > 0);
    staffBorrowMobileFilterBtn.dataset.filterCount = count ? String(count) : "";
    staffBorrowMobileFilterBtn.setAttribute(
      "aria-label",
      count ? `เปิดตัวกรองคำขอยืมพัสดุ (${count} เงื่อนไขใช้งานอยู่)` : "เปิดตัวกรองคำขอยืมพัสดุ"
    );
  };

  const renderStaffBorrowRequestFilterSummary = (filteredCount, totalCount) => {
    if (!staffBorrowRequestFilterSummary) return;
    const hasFilters = hasActiveStaffBorrowRequestFilters();
    staffBorrowRequestFilterSummary.textContent = hasFilters
      ? `แสดง ${filteredCount} จาก ${totalCount} รายการตามตัวกรอง`
      : `แสดง ${totalCount} รายการ`;
  };

  const populateStaffBorrowRequestFilterOptions = () => {
    const masterOrgTypeSet = getBorrowMasterOrgTypeSet();
    const getRequestOnlyValues = (fieldName, matcher = null) =>
      borrowRequests
        .filter((item) => !item.isDeleted)
        .filter((item) => !matcher || matcher(item))
        .map((item) => (item?.[fieldName] || "").toString().trim())
        .filter(Boolean);

    const fillSelect = (selectEl, values, defaultLabel, { disabled = false } = {}) => {
      if (!selectEl) return;
      const current = selectEl.value || "all";
      const options = Array.from(new Set(values.map((value) => (value || "").toString().trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "th"));
      selectEl.innerHTML = [
        `<option value="all">${safeEscape(defaultLabel)}</option>`,
        ...options.map((value) => `<option value="${safeEscape(value)}">${safeEscape(value)}</option>`)
      ].join("");
      selectEl.value = options.includes(current) ? current : "all";
      selectEl.disabled = !!disabled;
    };

    const orgOptions = [
      ...collectBorrowOrgTypeOptions(),
      EXTERNAL_ORG_FILTER_VALUE
    ];
    const orgLabelByValue = new Map([[EXTERNAL_ORG_FILTER_VALUE, EXTERNAL_ORG_LABEL]]);
    const fillOrgSelect = (selectEl) => {
      if (!selectEl) return;
      const current = selectEl.value || "all";
      const options = Array.from(new Set(orgOptions.map((value) => (value || "").toString().trim()).filter(Boolean)));
      const sorted = options
        .filter((value) => value !== EXTERNAL_ORG_FILTER_VALUE)
        .sort((a, b) => a.localeCompare(b, "th"));
      if (options.includes(EXTERNAL_ORG_FILTER_VALUE)) sorted.push(EXTERNAL_ORG_FILTER_VALUE);
      selectEl.innerHTML = [
        `<option value="all">ทุกประเภทองค์กร</option>`,
        ...sorted.map((value) => `<option value="${safeEscape(value)}">${safeEscape(orgLabelByValue.get(value) || value)}</option>`)
      ].join("");
      selectEl.value = sorted.includes(current) ? current : "all";
      selectEl.disabled = false;
    };
    fillOrgSelect(staffBorrowRequestOrgFilter);

    const selectedOrg = (staffBorrowRequestOrgFilter?.value || "all").toString().trim();
    if (!selectedOrg || selectedOrg === "all") {
      fillSelect(staffBorrowRequestDeptFilter, [], "เลือกประเภทองค์กรก่อน", { disabled: true });
      return;
    }

    const deptOptions = selectedOrg === EXTERNAL_ORG_FILTER_VALUE
      ? [
        ...getRequestOnlyValues("projectDept", (item) => isExternalBorrowRequest(item, masterOrgTypeSet)),
        ...getRequestOnlyValues("projectName", (item) => isExternalBorrowRequest(item, masterOrgTypeSet))
      ]
      : [
        ...collectBorrowOrgNameOptions(selectedOrg),
        ...getRequestOnlyValues("projectDept", (item) => (item.projectName || "").toString().trim() === selectedOrg)
      ];
    fillSelect(staffBorrowRequestDeptFilter, deptOptions, "ทุกฝ่าย / ชมรม");
  };

  const buildSearchText = (row) => {
    if (row.searchText) return row.searchText;
    const searchText = [
      row.type,
      row.code,
      row.name,
      row.location,
      row.remaining,
      row.unit,
      row.approvedText,
      row.note
    ]
      .map((value) => (value == null ? "" : String(value).toLowerCase()))
      .join(" ");
    row.searchText = searchText;
    return searchText;
  };

  const filterBorrowAssetsRows = ({ term, type }) => {
    const normalized = term.trim().toLowerCase();
    const normalizedType = type === "all" ? "" : type.trim().toLowerCase();
    return borrowAssetsRows.filter((row) => {
      const typeMatch =
        !normalizedType || (row.type || "").toLowerCase() === normalizedType;
      const searchMatch =
        !normalized || buildSearchText(row).includes(normalized);
      return typeMatch && searchMatch;
    });
  };

  const renderBorrowAssetsTable = (rows) => {
    if (!borrowAssetsTableBody) return;
    if (!rows.length) {
      borrowAssetsTableBody.innerHTML = `
        <tr>
          <td colspan="6">ไม่พบรายการพัสดุ</td>
        </tr>
      `;
      return;
    }
    borrowAssetsTableBody.innerHTML = rows
      .map((row) => {
        const remainingText =
          row.remaining != null
            ? `${row.remaining}${row.unit ? ` ${row.unit}` : ""}`
            : "-";
        return `
          <tr>
            <td>${safeEscape(row.type || "-")}</td>
            <td>${safeEscape(row.code || "-")}</td>
            <td>${safeEscape(row.name || "-")}</td>
            <td>${safeEscape(row.location || "-")}</td>
            <td>${safeEscape(remainingText)}</td>
            <td>${safeEscape(row.note || "-")}</td>
          </tr>
        `;
      })
      .join("");
  };

  const renderBorrowAssetsTableStaff = (rows) => {
    if (!borrowAssetsTableBodyStaff) return;
    if (!rows.length) {
      renderBorrowAssetsStaffPager({ total: 0 });
      borrowAssetsTableBodyStaff.innerHTML = `
        <tr>
          <td colspan="11" data-label="รายการพัสดุ">ไม่พบรายการพัสดุ</td>
        </tr>
      `;
      return;
    }
    const pageMeta = getPagedStaffAssetsRows(rows, staffAssetsPage);
    staffAssetsPage = pageMeta.currentPage;
    renderBorrowAssetsStaffPager(pageMeta);
    borrowAssetsTableBodyStaff.innerHTML = pageMeta.rows
      .map((row) => `
        <tr class="borrow-assets-staff-row">
          <td data-label="ประเภท">${safeEscape(row.type || "-")}</td>
          <td data-label="รหัสพัสดุ">${safeEscape(row.code || "-")}</td>
          <td data-label="รายการ">${safeEscape(row.name || "-")}</td>
          <td data-label="ที่เก็บ">${safeEscape(row.location || "-")}</td>
          <td data-label="จำนวนทั้งหมด">${safeEscape(row.total != null ? row.total : "-")}</td>
          <td data-label="อนุมัติการยืม">${safeEscape(row.approvedText || "-")}</td>
          <td data-label="ยืมอยู่">${safeEscape(row.borrowed != null ? row.borrowed : "-")}</td>
          <td data-label="ชำรุด">${safeEscape(row.damaged != null ? row.damaged : "-")}</td>
          <td data-label="คงเหลือ">${safeEscape(row.remaining != null ? row.remaining : "-")}</td>
          <td data-label="หน่วย">${safeEscape(row.unit || "-")}</td>
          <td data-label="หมายเหตุ">${safeEscape(row.note || "-")}</td>
        </tr>
      `)
      .join("");
  };

  const applyBorrowAssetsFilters = () => {
    if (borrowAssetsTableBody) {
      const term = borrowAssetsSearch ? borrowAssetsSearch.value : "";
      const type = borrowAssetsTypeFilter ? borrowAssetsTypeFilter.value : "all";
      const rows = filterBorrowAssetsRows({ term, type });
      renderBorrowAssetsTable(rows);
      if (borrowAssetsCount) {
        borrowAssetsCount.textContent = `พบ ${rows.length} รายการ`;
      }
    }
    if (borrowAssetsTableBodyStaff) {
      const term = borrowAssetsSearchStaff ? borrowAssetsSearchStaff.value : "";
      const type = borrowAssetsTypeFilterStaff ? borrowAssetsTypeFilterStaff.value : "all";
      const rows = filterBorrowAssetsRows({ term, type });
      renderBorrowAssetsTableStaff(rows);
      if (borrowAssetsCountStaff) {
        borrowAssetsCountStaff.textContent = `พบ ${rows.length} รายการ`;
      }
    }
  };

  const syncTypeOptions = (types) => {
    const sorted = Array.from(new Set(types)).sort((a, b) => a.localeCompare(b, "th"));
    const populateSelect = (selectEl) => {
      if (!selectEl) return;
      while (selectEl.options.length > 1) {
        selectEl.remove(1);
      }
      sorted.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        selectEl.appendChild(option);
      });
    };
    populateSelect(borrowAssetsTypeFilter);
    populateSelect(borrowAssetsTypeFilterStaff);
  };

  const loadBorrowAssets = async () => {
    if (!USE_CSV_ASSET_CATALOG) {
      borrowAssetsRows = [];
      assetMap.clear();
      assetRowMap.clear();
      if (borrowAssetsTableBody) {
        borrowAssetsTableBody.innerHTML = `
          <tr>
            <td colspan="6">ปิดการใช้งานข้อมูลพัสดุจาก CSV ชั่วคราว</td>
          </tr>
        `;
      }
      if (borrowAssetsTableBodyStaff) {
        borrowAssetsTableBodyStaff.innerHTML = `
          <tr>
            <td colspan="11">ปิดการใช้งานข้อมูลพัสดุจาก CSV ชั่วคราว</td>
          </tr>
        `;
      }
      if (borrowAssetsCount) borrowAssetsCount.textContent = "ปิดการใช้งาน CSV ชั่วคราว";
      if (borrowAssetsCountStaff) borrowAssetsCountStaff.textContent = "ปิดการใช้งาน CSV ชั่วคราว";
      return;
    }
    await window.sgcuVendorLoader?.ensurePapa?.();
    if (!window.Papa || !window.fetch || !BORROW_ASSETS_CSV_URL) return;
    fetch(BORROW_ASSETS_CSV_URL)
      .then((res) => res.text())
      .then((csvText) => {
        const result = window.Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        });
        if (result.errors && result.errors.length) return;
        const rows = result.data
          .map((item) => {
            const type = (item["ประเภท"] || "").trim();
            const code = (item["รหัสพัสดุ"] || "").trim().toUpperCase();
            const name = (item["รายการ"] || "").trim();
            const location = (item["ที่เก็บ"] || "").trim();
            const approved = normalizeBool(item["อนุมัติการยืม"]);
            const approvedText = (item["อนุมัติการยืม"] || "").toString().trim();
            const total = parseNumber(item["จำนวนทั้งหมด"]);
            const borrowed = parseNumber(item["ยืมอยู่"]);
            const damaged = parseNumber(item["ชำรุด"]);
            const remaining = parseNumber(item["คงเหลือ"]);
            const unit = (item["หน่วย"] || "").trim();
            const note = (item["หมายเหตุ"] || "").trim();
            return {
              type,
              code,
              name,
              location,
              approved,
              approvedText,
              total,
              borrowed,
              damaged,
              remaining,
              unit,
              note
            };
          })
          .filter((row) => row.code || row.name);

        borrowAssetsRows = rows;
        assetMap.clear();
        assetRowMap.clear();
        rows.forEach((row) => {
          if (row.code && row.name) {
            assetMap.set(row.code, row.name);
            assetRowMap.set(row.code, row);
          }
        });
        syncTypeOptions(rows.map((row) => row.type).filter(Boolean));
        applyBorrowAssetsFilters();
        if (borrowAssetList) {
          borrowAssetList.querySelectorAll("[data-asset-row]").forEach((row) => {
            const codeInput = row.querySelector('[data-asset-field="code"]');
            if (codeInput) codeInput.dispatchEvent(new Event("input"));
          });
        }
      })
      .catch(() => {
        if (borrowAssetsTableBody) {
          borrowAssetsTableBody.innerHTML = `
            <tr>
              <td colspan="6">ไม่สามารถโหลดรายการพัสดุได้</td>
            </tr>
          `;
        }
        if (borrowAssetsTableBodyStaff) {
          borrowAssetsTableBodyStaff.innerHTML = `
            <tr>
              <td colspan="11">ไม่สามารถโหลดรายการพัสดุได้</td>
            </tr>
          `;
        }
      });
  };

  const updateRowIds = (row, index) => {
    row.querySelectorAll("[data-asset-field]").forEach((input) => {
      const field = input.dataset.assetField;
      const id = `borrowAsset${field.charAt(0).toUpperCase()}${field.slice(1)}-${index}`;
      input.id = id;
      const label = row.querySelector(`[data-asset-label="${field}"]`);
      if (label) label.setAttribute("for", id);
    });
  };

  const bindRow = (row) => {
    const codeInput = row.querySelector('[data-asset-field="code"]');
    const nameInput = row.querySelector('[data-asset-field="name"]');
    const warning = row.querySelector("[data-asset-warning]");
    const removeBtn = row.querySelector("[data-asset-remove]");
    if (!codeInput || !nameInput) return;

    const setWarningState = (visible, text = "", color = "#b91c1c") => {
      if (!warning) return;
      warning.textContent = text;
      warning.style.color = color;
      warning.hidden = !visible;
    };

    const setNameManualMode = (manualMode) => {
      nameInput.readOnly = !manualMode;
      nameInput.required = true;
      nameInput.placeholder = manualMode
        ? "กรอกชื่อพัสดุ"
        : "ระบบจะแสดงชื่อพัสดุอัตโนมัติ";
    };

    const updateName = () => {
      if (!USE_CSV_ASSET_CATALOG) {
        setNameManualMode(true);
        setWarningState(false);
        return;
      }
      const code = codeInput.value.trim().toUpperCase();
      if (!code) {
        setNameManualMode(true);
        setWarningState(false);
        return;
      }
      const name = assetMap.get(code);
      if (name) {
        nameInput.value = name;
        setNameManualMode(false);
        setWarningState(false);
        return;
      }
      setNameManualMode(true);
      setWarningState(
        true,
        "ไม่พบรหัสพัสดุในรายการ สามารถกรอกชื่อพัสดุแทนได้",
        "#92400e"
      );
    };

    codeInput.addEventListener("input", updateName);
    codeInput.addEventListener("blur", updateName);
    codeInput.required = false;
    if (!USE_CSV_ASSET_CATALOG) {
      setNameManualMode(true);
      setWarningState(false);
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        const rows = borrowAssetList.querySelectorAll("[data-asset-row]");
        if (rows.length <= 1) return;
        row.remove();
      });
    }
  };

  const resetAssetRows = () => {
    if (!borrowAssetList) return;
    const rows = Array.from(borrowAssetList.querySelectorAll("[data-asset-row]"));
    if (!rows.length) return;
    rows.slice(1).forEach((row) => row.remove());
    const firstRow = rows[0];
    updateRowIds(firstRow, 1);
    firstRow.querySelectorAll("input").forEach((input) => {
      input.value = "";
    });
    const warning = firstRow.querySelector("[data-asset-warning]");
    if (warning) warning.hidden = true;
    const removeBtn = firstRow.querySelector("[data-asset-remove]");
    if (removeBtn) removeBtn.hidden = true;
    const codeInput = firstRow.querySelector('[data-asset-field="code"]');
    if (codeInput) codeInput.dispatchEvent(new Event("input"));
  };

  const clearBorrowRequestForm = () => {
    if (!borrowRequestForm) return;
    borrowRequestForm.reset();
    populateBorrowProjectTypeOptions();
    toggleBorrowProjectNameOther();
    populateBorrowProjectDeptOptions();
    resetAssetRows();
    setBorrowMessage("ล้างข้อมูลที่กรอกแล้ว", "#374151");
  };

  const collectAssetItems = () => {
    if (!borrowAssetList) {
      return { ok: false, message: "ไม่พบฟอร์มรายการพัสดุ" };
    }
    const rows = Array.from(borrowAssetList.querySelectorAll("[data-asset-row]"));
    const assetItems = [];
    const requestByCode = new Map();

    for (const row of rows) {
      const codeInput = row.querySelector('[data-asset-field="code"]');
      const nameInput = row.querySelector('[data-asset-field="name"]');
      const qtyInput = row.querySelector('[data-asset-field="qty"]');
      const warning = row.querySelector("[data-asset-warning]");
      if (!codeInput || !nameInput || !qtyInput) continue;

      const code = codeInput.value.trim().toUpperCase();
      const qty = Number(qtyInput.value);
      const mappedName = assetMap.get(code);
      const assetRow = assetRowMap.get(code);
      if (USE_CSV_ASSET_CATALOG) {
        const typedName = nameInput.value.trim();
        if (!code) {
          if (!typedName) {
            return { ok: false, message: "กรุณากรอกชื่อพัสดุเมื่อไม่ระบุรหัสพัสดุ" };
          }
          if (warning) warning.hidden = true;
        } else if (!mappedName || !assetRow) {
          if (!typedName) {
            if (warning) warning.hidden = false;
            return { ok: false, message: "ไม่พบรหัสพัสดุ กรุณากรอกชื่อพัสดุแทน" };
          }
          if (warning) {
            warning.hidden = false;
            warning.textContent = "ไม่พบรหัสพัสดุในรายการ ระบบจะใช้ชื่อพัสดุที่กรอกแทน";
            warning.style.color = "#92400e";
          }
        } else {
          nameInput.value = mappedName;
          if (warning) warning.hidden = true;
        }
      } else {
        if (!code || !nameInput.value.trim()) {
          return { ok: false, message: "กรุณากรอกรหัสพัสดุและชื่อพัสดุให้ครบ" };
        }
        if (warning) warning.hidden = true;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        qtyInput.focus();
        return { ok: false, message: `จำนวนของ ${code} ต้องมากกว่า 0` };
      }
      if (USE_CSV_ASSET_CATALOG && ENABLE_ASSET_AVAILABILITY_CHECK) {
        if (code && assetRow) {
          if (assetRow.remaining != null) {
            const currentRequested = requestByCode.get(code) || 0;
            const nextRequested = currentRequested + qty;
            if (nextRequested > assetRow.remaining) {
              qtyInput.focus();
              return {
                ok: false,
                message: `พัสดุ ${code} คงเหลือ ${assetRow.remaining} ${assetRow.unit || ""}`.trim()
              };
            }
            requestByCode.set(code, nextRequested);
          }
        }
      }

      assetItems.push({
        code,
        name: USE_CSV_ASSET_CATALOG
          ? ((mappedName && assetRow) ? mappedName : nameInput.value.trim())
          : nameInput.value.trim(),
        qty: Math.trunc(qty),
        unit: USE_CSV_ASSET_CATALOG ? ((code && assetRow) ? (assetRow.unit || "") : "") : ""
      });
    }

    if (!assetItems.length) {
      return { ok: false, message: "กรุณาเพิ่มรายการพัสดุอย่างน้อย 1 รายการ" };
    }
    return { ok: true, items: assetItems };
  };

  const renderMyRequests = () => {
    if (!myRequestsTableBody) return;
    const myRequestsPanel = myRequestsTableBody.closest(".panel");
    if (myRequestsPanel) {
      myRequestsPanel.classList.add("section-visible");
    }
    const isCompactMobile =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 840px)").matches;
    const renderEmptyState = (message) => {
      myRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="4">${safeEscape(message)}</td>
        </tr>
      `;
      if (myRequestsCardsEl && isCompactMobile) {
        myRequestsCardsEl.innerHTML = `<article class="borrow-my-request-card-empty">${safeEscape(message)}</article>`;
      }
    };
    if (myRequestsTableWrapper) {
      myRequestsTableWrapper.style.display = isCompactMobile ? "none" : "";
    }
    if (myRequestsCardsEl) {
      myRequestsCardsEl.hidden = !isCompactMobile;
      myRequestsCardsEl.innerHTML = "";
    }
    if (!currentUserEmail) {
      renderEmptyState("กรุณาเข้าสู่ระบบด้วยอีเมลจุฬาฯ เพื่อดูสถานะคำขอของตนเอง");
      return;
    }
    const normalizedCurrentEmail = readCurrentAccountEmail();
    const list = borrowRequests
      .filter((item) => !item.isDeleted)
      .filter((item) => matchesCurrentAccountEmail(item.requesterEmail, item.accountEmail))
      .sort((a, b) => (b.submittedAtMs || 0) - (a.submittedAtMs || 0));
    if (!list.length) {
      if (myRequestsLoadState === "loading") {
        renderEmptyState("กำลังโหลดสถานะคำขอ...");
      } else if (myRequestsLoadState === "error") {
        renderEmptyState(myRequestsLoadError || "โหลดสถานะคำขอไม่สำเร็จ กรุณาลองใหม่");
      } else {
        renderEmptyState("ยังไม่มีคำขอยืมพัสดุ");
      }
      return;
    }
    if (myRequestsCardsEl && isCompactMobile) {
      myRequestsCardsEl.innerHTML = list.map((item) => {
        const itemsText = (item.assets || [])
          .map((asset) => `${safeEscape(asset.name || asset.code || "-")} ${safeEscape(asset.qty || 0)} ${safeEscape(asset.unit || "")}`.trim())
          .join("<br />");
        const appointmentNote = formatPickupAppointmentNote(item.pickupDate);
        const noteText =
          (item.status === STATUS_APPROVED && !item.staffNote)
            ? (appointmentNote || "รับพัสดุตามเวลาที่ระบุในระบบ")
            : (item.status === STATUS_RECEIVED && !item.staffNote)
              ? "รับพัสดุเรียบร้อยแล้ว"
            : (item.status === STATUS_CANCELLED && !item.staffNote)
              ? "ยกเลิกคำขอโดยเจ้าหน้าที่"
            : (item.status === STATUS_RETURNED && !item.staffNote)
              ? "ส่งคืนพัสดุเรียบร้อยแล้ว"
            : (item.status === STATUS_PENDING && !item.staffNote)
              ? "เจ้าหน้าที่กำลังตรวจสอบคำขอ"
              : (item.staffNote || "-");
        return `
          <article
            class="borrow-my-request-row-mobile"
            data-request-id="${safeEscape(item.id || "")}"
            data-request-source="${safeEscape(item.sourceCollection || "")}"
            tabindex="0"
            role="button"
            aria-label="ดูรายละเอียดคำขอ ${safeEscape(item.id || "-")}"
          >
            <div class="borrow-my-card-head">
              <span class="borrow-my-request-no">${safeEscape(item.requestNo || item.id || "-")}</span>
              ${statusBadge(item.status)}
            </div>
            <div><span class="borrow-my-cell-label">รายการ</span><span class="borrow-my-cell-value">${itemsText}</span></div>
            <div><span class="borrow-my-cell-label">ช่วงเวลา</span><span class="borrow-my-cell-value">${safeEscape(formatDateRange(item.pickupDate, item.returnDate))}</span></div>
            <div><span class="borrow-my-cell-label">หมายเหตุ</span><span class="borrow-my-cell-value">${safeEscape(noteText)}</span></div>
          </article>
        `;
      }).join("");
    }
    myRequestsTableBody.innerHTML = list.map((item) => {
      const itemsText = (item.assets || [])
        .map((asset) => `${safeEscape(asset.name || asset.code || "-")} ${safeEscape(asset.qty || 0)} ${safeEscape(asset.unit || "")}`.trim())
        .join("<br />");
      const appointmentNote = formatPickupAppointmentNote(item.pickupDate);
      const noteText =
        (item.status === STATUS_APPROVED && !item.staffNote)
          ? (appointmentNote || "รับพัสดุตามเวลาที่ระบุในระบบ")
          : (item.status === STATUS_RECEIVED && !item.staffNote)
            ? "รับพัสดุเรียบร้อยแล้ว"
          : (item.status === STATUS_CANCELLED && !item.staffNote)
            ? "ยกเลิกคำขอโดยเจ้าหน้าที่"
          : (item.status === STATUS_RETURNED && !item.staffNote)
            ? "ส่งคืนพัสดุเรียบร้อยแล้ว"
            : (item.status === STATUS_PENDING && !item.staffNote)
              ? "เจ้าหน้าที่กำลังตรวจสอบคำขอ"
              : (item.staffNote || "-");
      return `
        <tr
          class="borrow-my-request-row"
          data-request-id="${safeEscape(item.id || "")}"
          data-request-source="${safeEscape(item.sourceCollection || "")}"
          tabindex="0"
          role="button"
          aria-label="ดูรายละเอียดคำขอ ${safeEscape(item.id || "-")}"
        >
          <td>
            <div class="borrow-my-request-item-main">${itemsText}</div>
            <div class="borrow-my-request-no">เลขที่คำขอ: ${safeEscape(item.requestNo || item.id || "-")}</div>
          </td>
          <td>${safeEscape(formatDateRange(item.pickupDate, item.returnDate))}</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            <div class="borrow-my-note-cell">
              <span>${safeEscape(noteText)}</span>
              <button
                class="btn-ghost borrow-row-detail-btn"
                type="button"
                data-action="detail"
                data-request-id="${safeEscape(item.id || "")}"
                data-request-source="${safeEscape(item.sourceCollection || "")}"
              >ดูรายละเอียด</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  };

  const renderStaffSummary = () => {
    if (staffSummaryCards.length < 3) return;
    const dayKeyBangkok = (dateObj) => {
      if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(dateObj);
    };
    const todayYmd = dayKeyBangkok(new Date());
    const approvedToday = borrowRequests.filter((item) =>
      (item.status === STATUS_APPROVED || item.status === STATUS_RECEIVED) &&
      dayKeyBangkok(new Date(item.updatedAtMs || 0)) === todayYmd
    ).length;
    const pendingCount = borrowRequests.filter((item) => item.status === STATUS_PENDING).length;
    const borrowedCount = borrowRequests.filter((item) => item.status === STATUS_APPROVED || item.status === STATUS_RECEIVED).length;
    staffSummaryCards[0].textContent = String(approvedToday);
    staffSummaryCards[1].textContent = String(pendingCount);
    staffSummaryCards[2].textContent = String(borrowedCount);
  };

  const borrowStatusOptionLabel = (value) => {
    if (value === STATUS_APPROVED) return "อนุมัติแล้ว";
    if (value === STATUS_RECEIVED) return "รับของแล้ว";
    if (value === STATUS_REJECTED) return "ไม่อนุมัติ";
    if (value === STATUS_CANCELLED) return "ยกเลิก";
    if (value === STATUS_RETURNED) return "คืนแล้ว";
    if (value === "delete") return "ลบคำขอ";
    return "รออนุมัติ";
  };

  const borrowStatusSelectClass = (value) => {
    if (value === STATUS_APPROVED || value === STATUS_RECEIVED || value === STATUS_RETURNED) return "is-approved";
    if (value === STATUS_REJECTED) return "is-rejected";
    if (value === STATUS_CANCELLED) return "is-cancel-requested";
    if (value === "delete") return "is-delete";
    return "is-pending";
  };

  const renderRequesterCell = (item) => {
    const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "-";
    const academicYearMeta = item.academicYear ? `ปีการศึกษา ${item.academicYear}` : "";
    const projectMeta = [academicYearMeta, item.projectName, item.projectDept].filter(Boolean).join(" • ");
    const contactMeta = [item.phone, item.lineId ? `Line: ${item.lineId}` : ""]
      .filter(Boolean)
      .join(" • ");
    return `
      <div class="borrow-staff-requester">
        <div class="borrow-staff-requester-name">${safeEscape(fullName)}</div>
        ${projectMeta ? `<div class="borrow-staff-requester-meta">${safeEscape(projectMeta)}</div>` : ""}
        ${contactMeta ? `<div class="borrow-staff-requester-contact">${safeEscape(contactMeta)}</div>` : ""}
      </div>
    `;
  };

  const renderRequestMetaCell = (item) => {
    const requestNo = (item.requestNo || item.id || "-").toString().trim();
    const createdText = formatDate(item.createdDate || "");
    return `
      <div class="borrow-staff-request-meta">
        <div class="borrow-staff-request-no">${safeEscape(requestNo)}</div>
        <div class="borrow-staff-request-date">${safeEscape(createdText || "-")}</div>
      </div>
    `;
  };

  const renderAssetsCell = (assets = [], staffNote = "") => {
    const list = Array.isArray(assets) ? assets : [];
    if (!list.length) {
      return `<div class="borrow-staff-items-empty">ไม่มีรายการพัสดุ</div>`;
    }
    const totalQty = list.reduce((sum, asset) => {
      const qty = Number(asset?.qty || 0);
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
    const visibleRows = list.slice(0, 3);
    const hiddenCount = Math.max(0, list.length - visibleRows.length);
    const rowsHtml = visibleRows.map((asset) => {
      const name = asset?.name || asset?.code || "-";
      const qty = Number(asset?.qty || 0);
        const qtyText = Number.isFinite(qty) ? String(qty) : "0";
        return `
        <div class="borrow-staff-item-row">
          <span class="borrow-staff-item-name">${safeEscape(name)}</span>
          <span class="borrow-staff-item-qty">
            <span class="borrow-staff-item-qty-number">${safeEscape(qtyText)}</span>
            ${asset?.unit ? `<span class="borrow-staff-item-unit">${safeEscape(asset.unit)}</span>` : ""}
          </span>
        </div>
      `;
    }).join("");
    const moreLine = hiddenCount
      ? `<div class="borrow-staff-items-more">+ อีก ${safeEscape(hiddenCount)} รายการ</div>`
      : "";
    const noteLine = (staffNote || "").toString().trim()
      ? `<div class="borrow-staff-items-note">หมายเหตุ: ${safeEscape(staffNote)}</div>`
      : "";
    return `
      <div class="borrow-staff-items">
        <div class="borrow-staff-items-head" aria-hidden="true">
          <span>รายการพัสดุ</span>
        </div>
        ${rowsHtml}
        ${moreLine}
        <div class="borrow-staff-items-total">รวม ${safeEscape(totalQty)} ชิ้น</div>
        ${noteLine}
      </div>
    `;
  };

  const renderPeriodCell = (item) => `
    <div class="borrow-staff-period">
      <div class="borrow-staff-period-row"><span class="borrow-staff-period-label">รับ</span><span>${safeEscape(formatDate(item.pickupDate || ""))}</span></div>
      <div class="borrow-staff-period-row"><span class="borrow-staff-period-label">คืน</span><span>${safeEscape(formatDate(item.returnDate || ""))}</span></div>
    </div>
  `;

  const renderFollowupCell = (item) => {
    const meta = buildBorrowFollowupMeta(item);
    if ((item?.status !== STATUS_APPROVED && item?.status !== STATUS_RECEIVED) || !meta.dueSoon) return "-";
    return `<span class="badge ${safeEscape(meta.badgeClass)}">${safeEscape(meta.statusText)}</span>`;
  };

  const renderStaffRequestCard = (item, actionHtml, staffNote = "") => {
    const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "-";
    const requestNo = (item.requestNo || item.id || "-").toString().trim();
    const academicYearMeta = item.academicYear ? `ปีการศึกษา ${item.academicYear}` : "";
    const projectMeta = [academicYearMeta, item.projectName, item.projectDept].filter(Boolean).join(" • ");
    const contactMeta = [item.phone, item.lineId ? `Line: ${item.lineId}` : ""]
      .filter(Boolean)
      .join(" • ");
    const followupHtml = renderFollowupCell(item);
    const followupBlock = followupHtml !== "-"
      ? `<div class="borrow-staff-card-alert">${followupHtml}</div>`
      : "";
    return `
      <article class="borrow-staff-request-card">
        <div class="borrow-staff-card-main">
          <div class="borrow-staff-card-topline">
            <span class="borrow-staff-request-no">${safeEscape(requestNo)}</span>
            <span class="borrow-staff-request-date">ยื่น ${safeEscape(formatDate(item.createdDate || "") || "-")}</span>
          </div>
          <div class="borrow-staff-card-name">${safeEscape(fullName)}</div>
          ${projectMeta ? `<div class="borrow-staff-card-meta">${safeEscape(projectMeta)}</div>` : ""}
          ${contactMeta ? `<div class="borrow-staff-card-contact">${safeEscape(contactMeta)}</div>` : ""}
          ${followupBlock}
        </div>
        <div class="borrow-staff-card-assets">
          ${renderAssetsCell(item.assets, staffNote)}
        </div>
        <div class="borrow-staff-card-period">
          ${renderPeriodCell(item)}
          <div class="borrow-staff-actions borrow-staff-card-actions">
            ${actionHtml}
          </div>
        </div>
      </article>
    `;
  };

  let staffRequestTabMode = "queue";
  const setStaffRequestPanelMeta = () => {
    if (staffRequestPanelTitleEl) {
      staffRequestPanelTitleEl.textContent = staffRequestTabMode === "history"
        ? "ประวัติการขอ"
        : "รายการขอยืมพัสดุ";
    }
    if (staffRequestPanelCaptionEl) {
      staffRequestPanelCaptionEl.textContent = staffRequestTabMode === "history"
        ? "แสดงคำขอที่ดำเนินการแล้วหรือเลยวันคืนก่อนอนุมัติ"
        : "ตรวจสอบรายละเอียดก่อนกดอนุมัติ/ตีกลับ";
    }
  };

  const renderStaffQueue = () => {
    if (!staffQueueTableBody) return;
    setStaffRequestPanelMeta();
    const totalList = [...borrowRequests]
      .filter((item) => !item.isDeleted)
      .filter(isStaffBorrowQueueItem)
      .sort((a, b) => (b.submittedAtMs || 0) - (a.submittedAtMs || 0));
    const list = totalList.filter(matchesStaffBorrowRequestFilters);
    if (staffRequestTabMode !== "queue") {
      renderStaffSummary();
      return;
    }
    renderStaffBorrowOverview(list);
    renderStaffBorrowRequestFilterSummary(list.length, totalList.length);
    if (!list.length) {
      renderStaffRequestPager({ total: 0 });
      staffQueueTableBody.innerHTML = `
        <tr>
          <td colspan="5">${hasActiveStaffBorrowRequestFilters() ? "ไม่พบคำขอตามตัวกรอง" : "ยังไม่มีคำขอในระบบ"}</td>
        </tr>
      `;
      renderStaffSummary();
      return;
    }
    const pageMeta = getPagedRows(list, staffRequestPageByMode.queue);
    staffRequestPageByMode.queue = pageMeta.currentPage;
    renderStaffRequestPager(pageMeta);

    staffQueueTableBody.innerHTML = pageMeta.rows.map((item) => {
      const actionHtml = `
        <select
          class="staff-status-select borrow-staff-status-select ${borrowStatusSelectClass(item.status)}"
          data-role="borrow-status-select"
          data-id="${safeEscape(item.id)}"
          data-source="${safeEscape(item.sourceCollection || "")}"
          aria-label="จัดการสถานะคำขอยืมพัสดุ"
        >
          <option value="${STATUS_PENDING}" ${item.status === STATUS_PENDING ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_PENDING)}</option>
          <option value="${STATUS_APPROVED}" ${item.status === STATUS_APPROVED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_APPROVED)}</option>
          <option value="${STATUS_RECEIVED}" ${item.status === STATUS_RECEIVED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_RECEIVED)}</option>
          <option value="${STATUS_REJECTED}" ${item.status === STATUS_REJECTED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_REJECTED)}</option>
          <option value="${STATUS_CANCELLED}" ${item.status === STATUS_CANCELLED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_CANCELLED)}</option>
          <option value="${STATUS_RETURNED}" ${item.status === STATUS_RETURNED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_RETURNED)}</option>
          <option value="delete">${borrowStatusOptionLabel("delete")}</option>
        </select>
      `;

      return `
        <tr class="borrow-staff-row" data-request-id="${safeEscape(item.id)}" data-request-source="${safeEscape(item.sourceCollection || "")}">
          <td colspan="5">${renderStaffRequestCard(item, actionHtml, "")}</td>
        </tr>
      `;
    }).join("");
    renderStaffSummary();
  };

  const renderStaffHistory = () => {
    if (!staffQueueTableBody) return;
    const totalHistoryList = [...borrowRequests]
      .filter((item) => !item.isDeleted)
      .filter(isStaffBorrowHistoryItem)
      .sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    const historyList = totalHistoryList.filter(matchesStaffBorrowRequestFilters);
    if (staffRequestTabMode !== "history") {
      if (staffHistoryTableBody) {
        if (!historyList.length) {
          staffHistoryTableBody.innerHTML = `
            <tr>
              <td colspan="5">ยังไม่มีประวัติคำขอ</td>
            </tr>
          `;
        } else {
          staffHistoryTableBody.innerHTML = "";
        }
      }
      return;
    }
    renderStaffBorrowOverview(historyList);
    renderStaffBorrowRequestFilterSummary(historyList.length, totalHistoryList.length);
    if (!historyList.length) {
      renderStaffRequestPager({ total: 0 });
      staffQueueTableBody.innerHTML = `
        <tr>
          <td colspan="5">${hasActiveStaffBorrowRequestFilters() ? "ไม่พบประวัติตามตัวกรอง" : "ยังไม่มีประวัติคำขอ"}</td>
        </tr>
      `;
      if (staffHistoryTableBody) {
        staffHistoryTableBody.innerHTML = staffQueueTableBody.innerHTML;
      }
      return;
    }
    const pageMeta = getPagedRows(historyList, staffRequestPageByMode.history);
    staffRequestPageByMode.history = pageMeta.currentPage;
    renderStaffRequestPager(pageMeta);
    const html = pageMeta.rows.map((item) => {
      const actionHtml = `
        <select
          class="staff-status-select borrow-staff-status-select ${borrowStatusSelectClass(item.status)}"
          data-role="borrow-status-select"
          data-id="${safeEscape(item.id)}"
          data-source="${safeEscape(item.sourceCollection || "")}"
          aria-label="จัดการสถานะคำขอยืมพัสดุ"
        >
          <option value="${STATUS_PENDING}" ${item.status === STATUS_PENDING ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_PENDING)}</option>
          <option value="${STATUS_APPROVED}" ${item.status === STATUS_APPROVED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_APPROVED)}</option>
          <option value="${STATUS_RECEIVED}" ${item.status === STATUS_RECEIVED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_RECEIVED)}</option>
          <option value="${STATUS_REJECTED}" ${item.status === STATUS_REJECTED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_REJECTED)}</option>
          <option value="${STATUS_CANCELLED}" ${item.status === STATUS_CANCELLED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_CANCELLED)}</option>
          <option value="${STATUS_RETURNED}" ${item.status === STATUS_RETURNED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_RETURNED)}</option>
          <option value="delete">${borrowStatusOptionLabel("delete")}</option>
        </select>
      `;
      return `
        <tr
          class="borrow-staff-row borrow-history-row"
          data-request-id="${safeEscape(item.id)}"
          data-request-source="${safeEscape(item.sourceCollection || "")}"
          tabindex="0"
          role="button"
          aria-label="ดูรายละเอียดคำขอ ${safeEscape(item.requestNo || item.id || "-")}"
        >
          <td colspan="5">${renderStaffRequestCard(item, actionHtml, item.staffNote || "")}</td>
        </tr>
      `;
    }).join("");
    staffQueueTableBody.innerHTML = html;
    if (staffHistoryTableBody) {
      staffHistoryTableBody.innerHTML = html;
    }
  };

  const setStaffQueueStatusMessage = (text) => {
    if (!staffQueueTableBody) return;
    staffQueueTableBody.innerHTML = `
      <tr>
        <td colspan="5">${safeEscape(text || "-")}</td>
      </tr>
    `;
  };

  const borrowActionModalEl = (() => {
    const existing = document.getElementById("borrowStaffActionModal");
    if (existing) return existing;
    const modal = document.createElement("div");
    modal.id = "borrowStaffActionModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("aria-labelledby", "borrowStaffActionTitle");
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <div id="borrowStaffActionTitle" class="modal-title">จัดการคำขอยืมพัสดุ</div>
            <div id="borrowStaffActionSubtitle" class="modal-subtitle">ข้อความนี้จะแสดงให้ผู้ยื่นคำขอเห็น</div>
          </div>
          <button id="borrowStaffActionClose" class="modal-close" type="button" aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body">
          <div class="borrow-form-field">
            <label id="borrowStaffActionLabel" for="borrowStaffActionInput" class="login-label">รายละเอียด</label>
            <textarea
              id="borrowStaffActionInput"
              class="login-input borrow-action-reason-input"
              rows="5"
              placeholder="กรอกรายละเอียด"
              maxlength="500"
            ></textarea>
            <div class="borrow-action-reason-meta">
              <div id="borrowStaffActionHelper" class="section-text-sm borrow-action-reason-helper"></div>
              <div id="borrowStaffActionCounter" class="section-text-sm borrow-action-reason-counter">0/500</div>
            </div>
            <div id="borrowStaffActionError" class="section-text-sm borrow-action-reason-error" aria-live="polite"></div>
          </div>
          <div class="modal-actions">
            <button id="borrowStaffActionCancel" class="btn-ghost" type="button">ยกเลิก</button>
            <button id="borrowStaffActionSubmit" class="btn-primary" type="button">ยืนยัน</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  })();
  const borrowActionTitleEl = document.getElementById("borrowStaffActionTitle");
  const borrowActionSubtitleEl = document.getElementById("borrowStaffActionSubtitle");
  const borrowActionLabelEl = document.getElementById("borrowStaffActionLabel");
  const borrowActionInputEl = document.getElementById("borrowStaffActionInput");
  const borrowActionHelperEl = document.getElementById("borrowStaffActionHelper");
  const borrowActionCounterEl = document.getElementById("borrowStaffActionCounter");
  const borrowActionErrorEl = document.getElementById("borrowStaffActionError");
  const borrowActionSubmitEl = document.getElementById("borrowStaffActionSubmit");
  const borrowActionCancelEl = document.getElementById("borrowStaffActionCancel");
  const borrowActionCloseEl = document.getElementById("borrowStaffActionClose");

  const askBorrowStatusReason = async ({
    promptText = "",
    title = "ระบุเหตุผล",
    subtitle = "ข้อความนี้จะแสดงให้ผู้ยื่นคำขอเห็น",
    initialValue = "",
    placeholder = "กรุณาระบุเหตุผล",
    helperText = "",
    requiredMessage = "กรุณาระบุเหตุผล",
    submitLabel = "ยืนยัน",
    maxLength = 500
  } = {}) => {
    const fallbackPrompt = () => {
      if (typeof window.prompt !== "function") return null;
      const input = window.prompt(promptText || title || "กรุณาระบุเหตุผล", initialValue || "");
      const reason = (input || "").toString().trim();
      return reason || null;
    };
    if (
      !borrowActionModalEl ||
      !borrowActionTitleEl ||
      !borrowActionSubtitleEl ||
      !borrowActionLabelEl ||
      !borrowActionInputEl ||
      !borrowActionHelperEl ||
      !borrowActionCounterEl ||
      !borrowActionErrorEl ||
      !borrowActionSubmitEl ||
      !borrowActionCancelEl ||
      !borrowActionCloseEl ||
      typeof openDialog !== "function" ||
      typeof closeDialog !== "function"
    ) {
      return fallbackPrompt();
    }

    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        borrowActionSubmitEl.removeEventListener("click", onSubmit);
        borrowActionCancelEl.removeEventListener("click", onCancel);
        borrowActionCloseEl.removeEventListener("click", onCancel);
        borrowActionModalEl.removeEventListener("click", onBackdropClick);
        borrowActionInputEl.removeEventListener("keydown", onKeydown);
        borrowActionInputEl.removeEventListener("input", onInput);
        resolve(value);
      };
      const onSubmit = () => {
        const reason = (borrowActionInputEl.value || "").toString().trim();
        if (!reason) {
          borrowActionErrorEl.textContent = requiredMessage;
          borrowActionInputEl.focus();
          return;
        }
        borrowActionErrorEl.textContent = "";
        closeDialog(borrowActionModalEl);
        done(reason);
      };
      const onCancel = () => {
        borrowActionErrorEl.textContent = "";
        closeDialog(borrowActionModalEl);
        done(null);
      };
      const onBackdropClick = (event) => {
        if (event.target === borrowActionModalEl) {
          onCancel();
        }
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
          return;
        }
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onSubmit();
        }
      };
      const onInput = () => {
        borrowActionErrorEl.textContent = "";
        const max = Number(borrowActionInputEl.getAttribute("maxlength") || 0);
        const length = (borrowActionInputEl.value || "").length;
        if (borrowActionCounterEl) {
          borrowActionCounterEl.textContent = max > 0 ? `${length}/${max}` : String(length);
        }
      };

      borrowActionTitleEl.textContent = title || "ระบุเหตุผล";
      borrowActionSubtitleEl.textContent = subtitle || "";
      borrowActionSubtitleEl.style.display = subtitle ? "" : "none";
      borrowActionLabelEl.textContent = promptText || "กรุณาระบุเหตุผล";
      borrowActionInputEl.placeholder = placeholder || "";
      borrowActionInputEl.value = (initialValue || "").toString();
      const normalizedMaxLength = Number(maxLength);
      if (Number.isFinite(normalizedMaxLength) && normalizedMaxLength > 0) {
        borrowActionInputEl.setAttribute("maxlength", String(Math.floor(normalizedMaxLength)));
      } else {
        borrowActionInputEl.removeAttribute("maxlength");
      }
      borrowActionHelperEl.textContent = helperText || "";
      borrowActionHelperEl.style.display = helperText ? "" : "none";
      borrowActionErrorEl.textContent = "";
      borrowActionSubmitEl.textContent = submitLabel || "ยืนยัน";
      onInput();

      borrowActionSubmitEl.addEventListener("click", onSubmit);
      borrowActionCancelEl.addEventListener("click", onCancel);
      borrowActionCloseEl.addEventListener("click", onCancel);
      borrowActionModalEl.addEventListener("click", onBackdropClick);
      borrowActionInputEl.addEventListener("keydown", onKeydown);
      borrowActionInputEl.addEventListener("input", onInput);

      openDialog(borrowActionModalEl, { focusSelector: "#borrowStaffActionInput" });
      window.setTimeout(() => {
        borrowActionInputEl.focus();
        borrowActionInputEl.select();
      }, 0);
    });
  };

  const borrowDeleteConfirmModalEl = (() => {
    const existing = document.getElementById("borrowDeleteConfirmModal");
    if (existing) return existing;
    const modal = document.createElement("div");
    modal.id = "borrowDeleteConfirmModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("aria-labelledby", "borrowDeleteConfirmTitle");
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <div id="borrowDeleteConfirmTitle" class="modal-title">ยืนยันการลบคำขอถาวร</div>
            <div class="modal-subtitle">รายการนี้จะถูกลบออกจากระบบและประวัติการขอ</div>
          </div>
          <button id="borrowDeleteConfirmClose" class="modal-close" type="button" aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body">
          <div id="borrowDeleteConfirmMessage" class="section-text-sm borrow-delete-confirm-message"></div>
          <div class="borrow-delete-confirm-warning">การลบนี้เป็นการลบถาวรและไม่สามารถกู้คืนได้จากระบบ</div>
          <div class="modal-actions">
            <button id="borrowDeleteConfirmCancel" class="btn-ghost" type="button">ยกเลิก</button>
            <button id="borrowDeleteConfirmSubmit" class="btn-primary borrow-delete-confirm-submit" type="button">ลบถาวร</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  })();
  const borrowDeleteConfirmMessageEl = document.getElementById("borrowDeleteConfirmMessage");
  const borrowDeleteConfirmSubmitEl = document.getElementById("borrowDeleteConfirmSubmit");
  const borrowDeleteConfirmCancelEl = document.getElementById("borrowDeleteConfirmCancel");
  const borrowDeleteConfirmCloseEl = document.getElementById("borrowDeleteConfirmClose");

  const confirmBorrowDelete = async (requestId = "", sourceCollection = "") => {
    const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
    const requestNo = (requestItem?.requestNo || requestItem?.id || requestId || "-").toString().trim();
    const requesterName = [requestItem?.firstName || "", requestItem?.lastName || ""].filter(Boolean).join(" ").trim() || "-";
    const dateRange = formatDateRange(requestItem?.pickupDate || "", requestItem?.returnDate || "");
    const statusLabel = borrowStatusOptionLabel(requestItem?.status || STATUS_PENDING);
    const affectsStock = requestItem?.status === STATUS_APPROVED || requestItem?.status === STATUS_RECEIVED;
    const fallbackText = `ยืนยันการลบคำขอ ${requestNo} ถาวรหรือไม่`;
    const fallbackConfirm = () =>
      typeof window.confirm === "function" ? window.confirm(fallbackText) : false;

    if (
      !borrowDeleteConfirmModalEl ||
      !borrowDeleteConfirmMessageEl ||
      !borrowDeleteConfirmSubmitEl ||
      !borrowDeleteConfirmCancelEl ||
      !borrowDeleteConfirmCloseEl ||
      typeof openDialog !== "function" ||
      typeof closeDialog !== "function"
    ) {
      return fallbackConfirm();
    }

    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        borrowDeleteConfirmSubmitEl.removeEventListener("click", onSubmit);
        borrowDeleteConfirmCancelEl.removeEventListener("click", onCancel);
        borrowDeleteConfirmCloseEl.removeEventListener("click", onCancel);
        borrowDeleteConfirmModalEl.removeEventListener("click", onBackdropClick);
        borrowDeleteConfirmModalEl.removeEventListener("keydown", onKeydown);
        resolve(value);
      };
      const onSubmit = () => {
        closeDialog(borrowDeleteConfirmModalEl);
        done(true);
      };
      const onCancel = () => {
        closeDialog(borrowDeleteConfirmModalEl);
        done(false);
      };
      const onBackdropClick = (event) => {
        if (event.target === borrowDeleteConfirmModalEl) onCancel();
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      };

      borrowDeleteConfirmMessageEl.innerHTML = `
        <strong>คำขอ:</strong> ${safeEscape(requestNo)}<br />
        <strong>ผู้ยื่น:</strong> ${safeEscape(requesterName)}<br />
        <strong>สถานะ:</strong> ${safeEscape(statusLabel)}<br />
        <strong>ช่วงยืม:</strong> ${safeEscape(dateRange)}
        ${affectsStock ? '<div class="borrow-delete-confirm-note">ระบบจะคืนยอดจองพัสดุให้อัตโนมัติก่อนลบคำขอนี้</div>' : ""}
      `;
      borrowDeleteConfirmSubmitEl.addEventListener("click", onSubmit);
      borrowDeleteConfirmCancelEl.addEventListener("click", onCancel);
      borrowDeleteConfirmCloseEl.addEventListener("click", onCancel);
      borrowDeleteConfirmModalEl.addEventListener("click", onBackdropClick);
      borrowDeleteConfirmModalEl.addEventListener("keydown", onKeydown);

      openDialog(borrowDeleteConfirmModalEl, { focusSelector: "#borrowDeleteConfirmCancel" });
    });
  };

  const getBorrowRequestByKey = (requestId, sourceCollection = "") => {
    return borrowRequests.find((item) => {
      if (item.id !== requestId) return false;
      if (!sourceCollection) return true;
      return (item.sourceCollection || "") === sourceCollection;
    }) || null;
  };

  const borrowDetailModalEl = (() => {
    const existing = document.getElementById("borrowRequestDetailModal");
    if (existing) return existing;
    const modal = document.createElement("div");
    modal.id = "borrowRequestDetailModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div id="borrowRequestDetailTitle" class="modal-title">รายละเอียดคำขอยืมพัสดุ</div>
          <button id="borrowRequestDetailClose" class="modal-close" type="button" aria-label="ปิด">×</button>
        </div>
        <div id="borrowRequestDetailBody" class="modal-body borrow-request-detail-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  })();
  const borrowDetailBodyEl = document.getElementById("borrowRequestDetailBody");
  const borrowDetailCloseEl = document.getElementById("borrowRequestDetailClose");
  let activeBorrowDetailId = "";
  let activeBorrowDetailSource = "";

  const borrowStatusLabel = (status) => {
    if (status === STATUS_APPROVED) return "อนุมัติแล้ว";
    if (status === STATUS_RECEIVED) return "รับของแล้ว";
    if (status === STATUS_REJECTED) return "ไม่อนุมัติ";
    if (status === STATUS_CANCELLED) return "ยกเลิก";
    if (status === STATUS_RETURNED) return "คืนแล้ว";
    return "รออนุมัติ";
  };

  const renderBorrowDetailBody = (item, statusMessage = "", statusColor = "#374151") => {
    if (!borrowDetailBodyEl || !item) return;
    const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "-";
    const requestDateText = item.createdDate
      ? formatDate(item.createdDate)
      : (item.submittedAtMs ? new Date(item.submittedAtMs).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }) : "-");
    const updatedDateText = item.updatedAtMs
      ? new Date(item.updatedAtMs).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
      : "-";
    const assets = Array.isArray(item.assets) ? item.assets : [];
    const assetsCount = assets.reduce((sum, asset) => {
      const qty = Number(asset?.qty || 0);
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
    const canManageStatus = ensureStaffPermission(true);
    const assetsRows = assets.length
      ? assets.map((asset, index) => {
        const qtyNum = Number(asset.qty || 0);
        const qtyText = Number.isFinite(qtyNum) ? String(qtyNum) : "0";
        return `
          <tr>
            <td data-label="#">${index + 1}</td>
            <td data-label="รหัส">${safeEscape(asset.code || "-")}</td>
            <td data-label="รายการ">${safeEscape(asset.name || "-")}</td>
            <td data-label="จำนวน">${canManageStatus
              ? `<input
                  class="borrow-request-asset-qty-input"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  value="${safeEscape(qtyText)}"
                  data-asset-index="${index}"
                  aria-label="จำนวน ${safeEscape(asset.name || asset.code || `รายการที่ ${index + 1}`)}"
                />`
              : safeEscape(qtyText)
            }</td>
            <td data-label="หน่วย">${safeEscape(asset.unit || "-")}</td>
          </tr>
        `;
      }).join("")
      : `
        <tr>
          <td colspan="5" class="borrow-request-assets-empty" data-label="รายการพัสดุ">ไม่มีรายการพัสดุ</td>
        </tr>
      `;
    const safeMessage = safeEscape(statusMessage || "");
    const studentMeta = [item.faculty, item.year ? `ชั้นปี ${item.year}` : "",item.studentId].filter(Boolean).join(" • ");
    const requesterEmailMeta = (item.requesterEmail || "").toString().trim();
    const contactMeta = [item.phone, item.lineId ? `Line: ${item.lineId}` : ""].filter(Boolean).join(" • ");
    const academicYearMeta = item.academicYear ? `ปีการศึกษา ${item.academicYear}` : "";
    const projectMeta = [academicYearMeta, item.projectName, item.projectDept].filter(Boolean).join(" • ");
    const activityMeta = (item.projectDetail || "").toString().trim();
    const originalPickupDate = (item.originalPickupDate || "").toString().trim();
    const hasChangedPickupDate = !!originalPickupDate && originalPickupDate !== item.pickupDate;
    borrowDetailBodyEl.innerHTML = `
      <div class="borrow-request-detail-shell">
        <div class="borrow-request-detail-hero">
          <div class="borrow-request-detail-hero-main">
            <div class="borrow-request-detail-hero-label">ผู้ยื่นคำขอ</div>
            <div class="borrow-request-detail-hero-name">${safeEscape(fullName)}</div>
            ${requesterEmailMeta ? `<div class="borrow-request-detail-hero-meta">อีเมล: ${safeEscape(requesterEmailMeta)}</div>` : ""}
            ${studentMeta ? `<div class="borrow-request-detail-hero-meta">${safeEscape(studentMeta)}</div>` : ""}
            ${projectMeta ? `<div class="borrow-request-detail-hero-meta">${safeEscape(projectMeta)}</div>` : ""}
            ${activityMeta ? `<div class="borrow-request-detail-hero-meta">${safeEscape(activityMeta)}</div>` : ""}
            ${contactMeta ? `<div class="borrow-request-detail-hero-meta">${safeEscape(contactMeta)}</div>` : ""}
          </div>
          <div class="borrow-request-detail-hero-side">
            <div class="borrow-request-detail-hero-label">สถานะปัจจุบัน</div>
            <div class="borrow-request-detail-hero-badge">${statusBadge(item.status)}</div>
          </div>
        </div>

        <div class="borrow-request-detail-summary">
          <div class="borrow-request-summary-card">
            <div class="borrow-request-summary-label">เลขที่คำขอ</div>
            <div class="borrow-request-summary-value borrow-request-code">${safeEscape(item.requestNo || item.id || "-")}</div>
          </div>
          <div class="borrow-request-summary-card">
            <div class="borrow-request-summary-label">ช่วงยืม</div>
            <div class="borrow-request-summary-value">${safeEscape(formatDateRange(item.pickupDate, item.returnDate))}</div>
          </div>
          <div class="borrow-request-summary-card">
            <div class="borrow-request-summary-label">จำนวนที่ขอ</div>
            <div class="borrow-request-summary-value">${safeEscape(String(assetsCount))} ชิ้น</div>
          </div>
          <div class="borrow-request-summary-card">
            <div class="borrow-request-summary-label">วันที่อัปเดตล่าสุด</div>
            <div class="borrow-request-summary-value">${safeEscape(updatedDateText)}</div>
          </div>
        </div>

        <div class="borrow-request-detail-grid">
          <div class="borrow-request-detail-item borrow-request-detail-item-full"><span class="borrow-request-detail-label">หมายเหตุ Staff</span><span class="borrow-request-detail-value">${safeEscape(item.staffNote || "ยังไม่มีหมายเหตุ")}</span></div>
          ${hasChangedPickupDate
            ? `<div class="borrow-request-detail-item"><span class="borrow-request-detail-label">วันรับที่ผู้ขอเลือกเดิม</span><span class="borrow-request-detail-value">${safeEscape(formatDate(originalPickupDate))}</span></div>`
            : ""}
        </div>

        <div class="borrow-request-detail-section">
          <div class="borrow-request-detail-section-title">รายการพัสดุ</div>
          <div class="borrow-request-assets-wrap">
            <table class="borrow-request-assets-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>รหัส</th>
                  <th>รายการ</th>
                  <th>จำนวน</th>
                  <th>หน่วย</th>
                </tr>
              </thead>
              <tbody>
                ${assetsRows}
              </tbody>
            </table>
          </div>
        </div>

        ${canManageStatus
          ? `
            <div class="borrow-request-detail-section">
              <div class="borrow-request-detail-section-title">ปรับสถานะและวันนัดรับ</div>
              <div class="borrow-request-detail-controls">
                  <div class="borrow-request-detail-schedule-row">
                    <div class="borrow-form-field">
                      <label class="login-label" for="borrowRequestDetailPickupDateInput">วันนัดรับพัสดุ</label>
                      <input
                        id="borrowRequestDetailPickupDateInput"
                        class="login-input"
                        type="date"
                        value="${safeEscape(item.pickupDate || "")}"
                      />
                    </div>
                    <div class="borrow-form-field">
                      <label class="login-label" for="borrowRequestDetailReturnDateInput">วันที่คืนพัสดุ</label>
                      <input
                        id="borrowRequestDetailReturnDateInput"
                        class="login-input"
                        type="date"
                        value="${safeEscape(item.returnDate || "")}"
                      />
                    </div>
                    <div class="borrow-form-field">
                      <label class="login-label" for="borrowRequestDetailStatusSelect">สถานะ</label>
                      <select
                        id="borrowRequestDetailStatusSelect"
                        class="staff-status-select"
                        data-request-id="${safeEscape(item.id || "")}"
                        data-request-source="${safeEscape(item.sourceCollection || "")}"
                        aria-label="ปรับสถานะคำขอยืมพัสดุ"
                      >
                        <option value="${STATUS_PENDING}" ${item.status === STATUS_PENDING ? "selected" : ""}>${borrowStatusLabel(STATUS_PENDING)}</option>
                        <option value="${STATUS_APPROVED}" ${item.status === STATUS_APPROVED ? "selected" : ""}>${borrowStatusLabel(STATUS_APPROVED)}</option>
                        <option value="${STATUS_RECEIVED}" ${item.status === STATUS_RECEIVED ? "selected" : ""}>${borrowStatusLabel(STATUS_RECEIVED)}</option>
                        <option value="${STATUS_REJECTED}" ${item.status === STATUS_REJECTED ? "selected" : ""}>${borrowStatusLabel(STATUS_REJECTED)}</option>
                        <option value="${STATUS_CANCELLED}" ${item.status === STATUS_CANCELLED ? "selected" : ""}>${borrowStatusLabel(STATUS_CANCELLED)}</option>
                        <option value="${STATUS_RETURNED}" ${item.status === STATUS_RETURNED ? "selected" : ""}>${borrowStatusLabel(STATUS_RETURNED)}</option>
                      </select>
                    </div>
                  </div>
	                  <textarea
                    id="borrowRequestDetailNoteInput"
                    class="login-input borrow-request-detail-note"
                    rows="3"
                  placeholder="หมายเหตุสำหรับผู้ขอ (ถ้ามี)"
                  >${safeEscape(item.staffNote || "")}</textarea>
                <div class="borrow-request-detail-actions">
                  <span
                    id="borrowRequestDetailStatusMessage"
                    class="section-text-sm"
                    style="color:${safeEscape(statusColor)};"
                  >${safeMessage}</span>
                  <button
                    id="borrowRequestDetailApplyStatus"
                    class="btn-primary"
                    type="button"
                    data-request-id="${safeEscape(item.id || "")}"
                    data-request-source="${safeEscape(item.sourceCollection || "")}"
                  >
	                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          `
          : ""
        }
      </div>
    `;
  };

  const openBorrowDetailModal = (item) => {
    if (!borrowDetailModalEl || !borrowDetailBodyEl || !item) return;
    activeBorrowDetailId = item.id || "";
    activeBorrowDetailSource = item.sourceCollection || "";
    renderBorrowDetailBody(item);
    if (typeof openDialog === "function") {
      openDialog(borrowDetailModalEl, { focusSelector: "#borrowRequestDetailClose" });
    } else {
      borrowDetailModalEl.classList.add("show");
      borrowDetailModalEl.setAttribute("aria-hidden", "false");
    }
  };

  const closeBorrowDetailModal = () => {
    activeBorrowDetailId = "";
    activeBorrowDetailSource = "";
    if (!borrowDetailModalEl) return;
    if (typeof closeDialog === "function") {
      closeDialog(borrowDetailModalEl);
    } else {
      borrowDetailModalEl.classList.remove("show");
      borrowDetailModalEl.setAttribute("aria-hidden", "true");
    }
  };
  if (borrowDetailCloseEl) {
    borrowDetailCloseEl.addEventListener("click", closeBorrowDetailModal);
  }
  if (borrowDetailModalEl) {
    borrowDetailModalEl.addEventListener("click", (event) => {
      if (event.target === borrowDetailModalEl) closeBorrowDetailModal();
    });
  }
  if (borrowDetailBodyEl) {
    borrowDetailBodyEl.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      if (target.id !== "borrowRequestDetailApplyStatus") return;
      if (!ensureStaffPermission()) return;
      const requestId = target.dataset.requestId || activeBorrowDetailId;
      const sourceCollection = target.dataset.requestSource || activeBorrowDetailSource;
      if (!requestId) return;
      const select = borrowDetailBodyEl.querySelector("#borrowRequestDetailStatusSelect");
      const noteInput = borrowDetailBodyEl.querySelector("#borrowRequestDetailNoteInput");
      const pickupDateInput = borrowDetailBodyEl.querySelector("#borrowRequestDetailPickupDateInput");
      const returnDateInput = borrowDetailBodyEl.querySelector("#borrowRequestDetailReturnDateInput");
      if (!(select instanceof HTMLSelectElement)) return;
      const noteText = noteInput instanceof HTMLTextAreaElement
        ? (noteInput.value || "").toString().trim()
        : "";
      const nextPickupDate = pickupDateInput instanceof HTMLInputElement ? pickupDateInput.value.trim() : "";
      const nextReturnDate = returnDateInput instanceof HTMLInputElement ? returnDateInput.value.trim() : "";
      const nextStatus = normalizeRequestStatus(select.value);
      const messageEl = borrowDetailBodyEl.querySelector("#borrowRequestDetailStatusMessage");
      const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
      const currentAssets = Array.isArray(requestItem?.assets) ? requestItem.assets : [];
      const qtyInputs = Array.from(borrowDetailBodyEl.querySelectorAll(".borrow-request-asset-qty-input"));
      const nextAssets = currentAssets.map((asset) => ({ ...asset }));
      let hasInvalidQty = qtyInputs.length !== currentAssets.length;
      qtyInputs.forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        const index = Number(input.dataset.assetIndex);
        const qty = Number(input.value);
        if (!Number.isInteger(index) || !nextAssets[index] || !Number.isInteger(qty) || qty < 1) {
          hasInvalidQty = true;
          return;
        }
        nextAssets[index].qty = qty;
      });
      if (hasInvalidQty) {
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = "จำนวนพัสดุต้องเป็นเลขจำนวนเต็มตั้งแต่ 1 ขึ้นไป";
          messageEl.style.color = "#b91c1c";
        }
        return;
      }
      const nextPickupDateObj = parseDateYmd(nextPickupDate);
      const nextReturnDateObj = parseDateYmd(nextReturnDate);
      if (!nextPickupDateObj || !nextReturnDateObj) {
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = "กรุณาระบุวันนัดรับและวันคืนให้ถูกต้อง";
          messageEl.style.color = "#b91c1c";
        }
        return;
      }
      if (nextReturnDateObj.getTime() < nextPickupDateObj.getTime()) {
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = "วันที่คืนต้องไม่ก่อนวันนัดรับ";
          messageEl.style.color = "#b91c1c";
        }
        return;
      }
      target.disabled = true;
      if (messageEl instanceof HTMLElement) {
        messageEl.textContent = "กำลังบันทึกสถานะ...";
        messageEl.style.color = "#6b7280";
      }
      try {
        await updateBorrowRequestStatus(requestId, nextStatus, noteText, sourceCollection, {
          pickupDate: nextPickupDate,
          returnDate: nextReturnDate,
          assets: nextAssets
        });
        const targetItem = getBorrowRequestByKey(requestId, sourceCollection);
        if (targetItem) {
          const previousPickupDate = targetItem.pickupDate || "";
          targetItem.status = nextStatus;
          targetItem.pickupDate = nextPickupDate;
          targetItem.returnDate = nextReturnDate;
          targetItem.assets = nextAssets;
          targetItem.originalPickupDate = targetItem.originalPickupDate || previousPickupDate;
          targetItem.staffNote = noteText || (
            nextPickupDate !== previousPickupDate ? formatPickupAppointmentNote(nextPickupDate) : ""
          );
          targetItem.updatedAtMs = Date.now();
        }
        renderBorrowRequests();
        const latest = getBorrowRequestByKey(requestId, sourceCollection);
        if (latest) {
          renderBorrowDetailBody(latest, "บันทึกสถานะเรียบร้อยแล้ว", "#047857");
        }
      } catch (error) {
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = formatBorrowStatusUpdateError(error, "บันทึกสถานะไม่สำเร็จ กรุณาลองใหม่");
          messageEl.style.color = "#b91c1c";
        }
      } finally {
        target.disabled = false;
      }
    });
  }

  const renderBorrowRequests = () => {
    renderMyRequests();
    renderMyBorrowOverview();
    populateStaffBorrowRequestFilterOptions();
    updateStaffBorrowMobileFilterToggle();
    renderStaffQueue();
    renderStaffHistory();
  };

  const normalizeBorrowRequest = (id, data) => {
    const safeData = data && typeof data === "object" ? data : {};
    const createdAtMs = timestampToMillis(data.createdAt) || Number(data.submittedAtMs) || 0;
    const updatedAtMs = timestampToMillis(data.updatedAt) || createdAtMs;
    const studentId = (safeData.studentId || "").toString().trim();
    const yearAtSubmit = deriveBorrowStudentYearFromId(studentId, createdAtMs || safeData.createdAt || new Date()) ||
      (safeData.year || "").toString().trim();
    const rawAssets = Array.isArray(safeData.assets) ? safeData.assets : [];
    const assets = rawAssets
      .map((asset) => {
        if (!asset || typeof asset !== "object") return null;
        const code = (asset.code || "").toString().trim();
        const name = (asset.name || "").toString().trim();
        const qtyNum = Number(asset.qty);
        const qty = Number.isFinite(qtyNum) ? Math.max(0, Math.trunc(qtyNum)) : 0;
        const unit = (asset.unit || "").toString().trim();
        if (!code && !name) return null;
        return { code, name, qty, unit };
      })
      .filter(Boolean);
    return {
      id,
      requestNo: (safeData.requestNo || "").toString().trim().toUpperCase(),
      status: normalizeRequestStatus(safeData.status),
      isDeleted: normalizeDeletedFlag(safeData.isDeleted),
      sourceCollection: BORROW_REQUEST_COLLECTION,
      requesterEmail: (safeData.requesterEmail || "").toString().trim().toLowerCase(),
      accountEmail: normalizeAccountEmail(safeData.accountEmail || safeData.requesterEmail || ""),
      firstName: (safeData.firstName || "").toString().trim(),
      lastName: (safeData.lastName || "").toString().trim(),
      nickname: (safeData.nickname || "").toString().trim(),
      studentId,
      faculty: (safeData.faculty || "").toString().trim(),
      year: yearAtSubmit,
      phone: (safeData.phone || "").toString().trim(),
      lineId: (safeData.lineId || "").toString().trim(),
      academicYear: (safeData.academicYear || safeData.schoolYear || "").toString().trim(),
      projectName: (safeData.projectName || "").toString().trim(),
      projectDept: (safeData.projectDept || "").toString().trim(),
      projectOrgSource: (safeData.projectOrgSource || "").toString().trim().toLowerCase(),
      projectDetail: (safeData.projectDetail || "").toString().trim(),
      pickupDate: (safeData.pickupDate || "").toString().trim(),
      originalPickupDate: (safeData.originalPickupDate || "").toString().trim(),
      returnDate: (safeData.returnDate || "").toString().trim(),
      assets,
      staffNote: (safeData.staffNote || "").toString().trim(),
      createdDate: (safeData.createdDate || "").toString().trim(),
      updatedAtMs,
      submittedAtMs: createdAtMs
    };
  };

  const subscribeBorrowRequests = async () => {
    const accessCheckSeq = ++borrowStaffAccessCheckSeq;
    resolveFirestoreBridge();
    if (!hasFirestore) {
      borrowRequests = [];
      myRequestsLoadState = "error";
      myRequestsLoadError = "ระบบฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่";
      renderBorrowRequests();
      setStaffQueueStatusMessage("ระบบฐานข้อมูลยังไม่พร้อม (กำลังเชื่อมต่อ Firestore)");
      setStaffQueueMessage("กำลังเชื่อมต่อฐานข้อมูล...", "#6b7280");
      return;
    }
    if (Array.isArray(unsubscribeBorrowRequests) && unsubscribeBorrowRequests.length) {
      unsubscribeBorrowRequests.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          // ignore
        }
      });
    }
    unsubscribeBorrowRequests = [];
    myRequestsLoadState = "loading";
    myRequestsLoadError = "";

    const mergeAndRender = () => {
      const merged = [];
      collectionSnapshotRows.forEach((docs) => {
        docs.forEach((docItem) => merged.push(docItem));
      });
      borrowRequestsSnapshotCount = merged.length;
      borrowRequests = merged.sort((a, b) => (b.submittedAtMs || 0) - (a.submittedAtMs || 0));
      syncBorrowStatusNotifications(borrowRequests);
      syncStaffBorrowNotifications(borrowRequests);
      renderBorrowRequests();
    };

    BORROW_REQUEST_COLLECTIONS.forEach((name) => {
      ["active", "history"].forEach((scope) => {
        const key = `${name}:${scope}`;
        collectionSnapshotRows.set(key, []);
        collectionSnapshotCounts.set(key, 0);
        collectionSnapshotErrors.set(key, "");
      });
    });

    const currentEmail = readCurrentUserEmail();
    let shouldReadAllRequests = !!(
      typeof staffAuthUser !== "undefined" &&
      staffAuthUser &&
      currentEmail
    );

    const currentHash = (window.location.hash || "").replace("#", "").trim();
    const isStaffBorrowPage = currentHash === "borrow-assets-staff";
    lastBorrowStaffAccessResult = null;

    if (isStaffBorrowPage && currentEmail) {
      setStaffQueueStatusMessage("กำลังตรวจสอบสิทธิ์ Staff สำหรับหน้ายืม-คืนพัสดุ...");
      const access = await readBorrowStaffProfileAccess(currentEmail);
      if (accessCheckSeq !== borrowStaffAccessCheckSeq) return;
      lastBorrowStaffAccessResult = access;
      shouldReadAllRequests = access.ok;
      if (!shouldReadAllRequests) {
        const detail = access.reason === "missing-profile"
          ? `ไม่พบ ${access.path}`
          : access.reason === "not-staff-profile"
            ? `${access.path} ยังไม่มี field staff profile ที่ rules ใช้ตรวจสิทธิ์`
            : access.reason === "permission-denied"
              ? `อ่าน ${access.path} ไม่ได้ (permission-denied)`
              : access.hasAnyExplicitPages
                ? `${access.path} ไม่มีสิทธิ์ borrow-assets-staff ใน allowedPages`
                : `${access.path || "staffProfiles"} ยังไม่ผ่านสิทธิ์จัดการพัสดุ`;
        borrowRequests = [];
        myRequestsLoadState = "idle";
        myRequestsLoadError = "";
        renderBorrowRequests();
        setStaffQueueStatusMessage(detail);
        return;
      }
    }

    if (!currentEmail && !shouldReadAllRequests) {
      borrowRequests = [];
      myRequestsLoadState = "idle";
      myRequestsLoadError = "";
      renderBorrowRequests();
      setStaffQueueStatusMessage("กรุณาเข้าสู่ระบบก่อนดูคิวคำขอ");
      return;
    }

    BORROW_REQUEST_COLLECTIONS.forEach((collectionName) => {
      const colRef = firestore.collection(firestore.db, collectionName);
      const querySpecs = shouldReadAllRequests
        ? [
          {
            scope: "active",
            query: firestore.query && firestore.where
              ? firestore.query(
                colRef,
                firestore.where("status", "in", [STATUS_PENDING, STATUS_APPROVED, STATUS_RECEIVED]),
                ...(firestore.limit ? [firestore.limit(BORROW_REQUEST_ACTIVE_LIST_LIMIT)] : [])
              )
              : (firestore.limit && firestore.query ? firestore.query(colRef, firestore.limit(BORROW_REQUEST_ACTIVE_LIST_LIMIT)) : colRef)
          },
          {
            scope: "history",
            query: firestore.query && firestore.where
              ? firestore.query(
                colRef,
                firestore.where("status", "in", [STATUS_REJECTED, STATUS_CANCELLED, STATUS_RETURNED]),
                ...(firestore.limit ? [firestore.limit(BORROW_REQUEST_HISTORY_LIST_LIMIT)] : [])
              )
              : (firestore.limit && firestore.query ? firestore.query(colRef, firestore.limit(BORROW_REQUEST_HISTORY_LIST_LIMIT)) : colRef)
          }
        ]
        : [
          {
            scope: "mine",
            query: currentEmail && firestore.query && firestore.where
              ? firestore.query(
                colRef,
                firestore.where("requesterEmail", "==", currentEmail),
                ...(firestore.limit ? [firestore.limit(BORROW_REQUEST_ACTIVE_LIST_LIMIT)] : [])
              )
              : (firestore.limit && firestore.query ? firestore.query(colRef, firestore.limit(BORROW_REQUEST_ACTIVE_LIST_LIMIT)) : colRef)
          }
        ];

      querySpecs.forEach(({ scope, query: requestQuery }) => {
        const snapshotKey = `${collectionName}:${scope}`;
        const unsubscribe = firestore.onSnapshot(
        requestQuery,
        (snapshot) => {
          collectionSnapshotErrors.set(snapshotKey, "");
          collectionSnapshotCounts.set(snapshotKey, Number(snapshot.size || 0));
          myRequestsLoadState = "loaded";
          myRequestsLoadError = "";
          const normalized = [];
          const badDocIds = [];
          snapshot.docs.forEach((docSnap) => {
            try {
              const item = normalizeBorrowRequest(docSnap.id, docSnap.data() || {});
              item.sourceCollection = collectionName;
              normalized.push(item);
            } catch (err) {
              badDocIds.push(docSnap.id);
              console.error("borrow request doc malformed - app.borrow-assets.js:2004", collectionName, docSnap.id, err);
            }
          });
          collectionSnapshotRows.set(snapshotKey, normalized);
          mergeAndRender();
          const visibleCount = borrowRequestsSnapshotCount;
          if (visibleCount > 0) {
            setStaffQueueMessage(`โหลดคำขอสำเร็จ ${visibleCount} รายการ`, "#047857");
          } else {
            setStaffQueueMessage("", "#374151");
          }
          if (badDocIds.length) {
            setStaffQueueStatusMessage(
              `ข้ามข้อมูลที่รูปแบบผิด ${badDocIds.length} รายการ (ID: ${badDocIds.join(", ")})`
            );
          }
        },
        (error) => {
          const code = (error?.code || "").toString();
          const loggedIn = !!readCurrentUserEmail();
          collectionSnapshotErrors.set(snapshotKey, code || "unknown");
          collectionSnapshotRows.set(snapshotKey, []);
          collectionSnapshotCounts.set(snapshotKey, 0);
          if (!shouldReadAllRequests) {
            myRequestsLoadState = "error";
            myRequestsLoadError = code === "permission-denied"
              ? "บัญชีนี้ยังไม่มีสิทธิ์อ่านสถานะคำขอของตนเอง"
              : "โหลดสถานะคำขอไม่สำเร็จ กรุณาลองใหม่";
          }
          mergeAndRender();
          const totalNow = borrowRequestsSnapshotCount;
          if (totalNow > 0) {
            return;
          }
          if (code === "permission-denied") {
            if (hasStaffPermission() && loggedIn) {
              const access = lastBorrowStaffAccessResult;
              const detail = access?.path
                ? access.reason === "profile-loaded"
                  ? `${access.path} ผ่าน preflight แล้ว แต่ Firestore Rules ยังปฏิเสธ ${collectionName}; ตรวจว่า allowedPages มี borrow-assets-staff และ Rules ถูก deploy ล่าสุด`
                  : `${access.path} ตรวจสิทธิ์ Staff ไม่ผ่าน (${access.reason || "unknown"})`
                : `บัญชี Staff นี้ยังไม่มีสิทธิ์อ่านข้อมูลใน ${collectionName} (Firestore Rules)`;
              setStaffQueueStatusMessage(
                detail
              );
            } else if (!loggedIn) {
              setStaffQueueStatusMessage("กรุณาเข้าสู่ระบบก่อนดูคิวคำขอ");
            } else {
              setStaffQueueStatusMessage("บัญชีนี้ยังไม่มีสิทธิ์อ่านข้อมูลคิวคำขอ");
            }
            return;
          }
          setStaffQueueStatusMessage("ไม่สามารถโหลดคิวคำขอได้ในขณะนี้");
          setStaffQueueMessage("โหลดคิวคำขอไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
          console.error("borrow assets subscribe failed - app.borrow-assets.js:2046", collectionName, error);
        }
        );
        unsubscribeBorrowRequests.push(unsubscribe);
      });
    });
  };

  const submitBorrowRequest = async () => {
    if (!borrowRequestForm || !borrowSubmitBtn) return;
    if (!borrowRequestForm.reportValidity()) return;

    currentUserEmail = readCurrentUserEmail();
    if (!currentUserEmail) {
      setBorrowMessage("กรุณาเข้าสู่ระบบก่อนส่งคำขอยืมพัสดุ", "#b91c1c");
      return;
    }
    if (!resolveFirestoreBridge()) {
      setBorrowMessage("ระบบฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่อีกครั้ง", "#b91c1c");
      return;
    }
    const pickupDateObj = parseDateYmd(borrowPickupDate?.value || "");
    const returnDateObj = parseDateYmd(borrowReturnDate?.value || "");
    if (!pickupDateObj || !returnDateObj) {
      setBorrowMessage("กรุณาเลือกวันที่รับและวันที่คืนพัสดุให้ครบถ้วน", "#b91c1c");
      return;
    }
    if (returnDateObj.getTime() < pickupDateObj.getTime()) {
      setBorrowMessage("วันที่คืนพัสดุต้องไม่ก่อนวันที่รับพัสดุ", "#b91c1c");
      return;
    }
    const pickupDay = pickupDateObj.getDay();
    const allowedPickupDays = getAllowedPickupDays();
    if (!allowedPickupDays.includes(pickupDay)) {
      const dayText = formatAllowedPickupDays(allowedPickupDays);
      setBorrowMessage(
        dayText === "ทุกวัน"
          ? "วันที่รับพัสดุไม่ถูกต้อง"
          : `วันที่รับพัสดุต้องเป็นวัน${dayText}เท่านั้น`,
        "#b91c1c"
      );
      return;
    }

    const assetsResult = collectAssetItems();
    if (!assetsResult.ok) {
      setBorrowMessage(assetsResult.message || "ข้อมูลรายการพัสดุไม่ถูกต้อง", "#b91c1c");
      return;
    }
    const requesterProfile = await getBorrowProfileForSubmit();
    if (!requesterProfile) {
      setBorrowMessage("ไม่พบข้อมูลผู้ใช้งาน กรุณากรอกและบันทึกที่หน้าเข้าสู่ระบบก่อน", "#b91c1c");
      return;
    }
    if (
      !requesterProfile.firstName ||
      !requesterProfile.lastName ||
      !requesterProfile.nickname ||
      !requesterProfile.studentId ||
      !requesterProfile.faculty ||
      !requesterProfile.year ||
      !requesterProfile.phone ||
      !requesterProfile.lineId
    ) {
      setBorrowMessage("ข้อมูลผู้ใช้งานยังไม่ครบ กรุณาอัปเดตที่หน้าเข้าสู่ระบบก่อน", "#b91c1c");
      return;
    }
    await ensureBorrowOrgCodeData();
    if (!getBorrowRequestNoParts()) {
      setBorrowMessage(
        `ไม่พบรหัสองค์กรจากข้อมูลกลาง (คอลัมน์ C) กรุณาตรวจสอบประเภทองค์กร/ฝ่ายหรือเลือก '${EXTERNAL_ORG_LABEL}'`,
        "#b91c1c"
      );
      return;
    }

    const payload = {
      academicYear: getBorrowAcademicYearBE(),
      firstName: requesterProfile.firstName,
      lastName: requesterProfile.lastName,
      nickname: requesterProfile.nickname,
      studentId: requesterProfile.studentId,
      faculty: requesterProfile.faculty,
      year: requesterProfile.year,
      phone: requesterProfile.phone,
      lineId: requesterProfile.lineId,
      projectName: getBorrowProjectNameValueForSubmit(),
      projectDept: getBorrowProjectDeptValueForSubmit(),
      projectOrgSource: borrowProjectName?.value === OTHER_ORG_VALUE ? "external" : "master",
      projectDetail: borrowProjectDetail?.value.trim() || "",
      pickupDate: borrowPickupDate?.value || "",
      originalPickupDate: borrowPickupDate?.value || "",
      returnDate: borrowReturnDate?.value || "",
      assets: assetsResult.items,
      requesterEmail: currentUserEmail,
      accountEmail: readCurrentAccountEmail(),
      status: STATUS_PENDING,
      staffNote: "",
      createdDate: toYmd(new Date()),
      submittedAtMs: Date.now(),
      createdAt: firestore.serverTimestamp(),
      updatedAt: firestore.serverTimestamp()
    };

    borrowSubmitBtn.disabled = true;
    setBorrowMessage("กำลังส่งคำขอ...", "#374151");
    try {
      const docRef = await createBorrowRequestWithNextNumber(payload);
      void window.sgcuAuditLog?.write?.({
        action: "borrow.request.create",
        entityType: "borrowAssetRequest",
        entityId: docRef?.id || "",
        after: payload,
        source: "web_app"
      });
      if (borrowRequestForm) borrowRequestForm.reset();
      toggleBorrowProjectNameOther();
      populateBorrowProjectDeptOptions();
      resetAssetRows();
      setBorrowMessage("ส่งคำขอเรียบร้อยแล้ว สามารถติดตามสถานะได้ด้านล่าง", "#15803d");
    } catch (error) {
      const code = (error?.code || "").toString();
      const hasLogin = !!readCurrentUserEmail();
      if (code === "permission-denied") {
        if (!hasLogin) {
          setBorrowMessage("กรุณาเข้าสู่ระบบก่อนส่งคำขอ", "#b91c1c");
        } else {
          setBorrowMessage(
            "บัญชีนี้ยังไม่มีสิทธิ์เขียนข้อมูลในระบบ (Firestore Rules) กรุณาติดต่อผู้ดูแลระบบ",
            "#b91c1c"
          );
        }
      } else {
        setBorrowMessage("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "#b91c1c");
      }
      console.error("borrow request submit failed - app.borrow-assets.js:2167", error);
    } finally {
      borrowSubmitBtn.disabled = false;
    }
  };

  const updateBorrowRequestStatus = async (requestId, nextStatus, noteText = "", sourceCollection = "", datePatch = {}) => {
    if (!requestId) return;
    if (!resolveFirestoreBridge()) return;
    const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
    const beforeRequestSnapshot = requestItem ? { ...requestItem } : null;
    const targetCollection = requestItem?.sourceCollection || sourceCollection || BORROW_REQUEST_COLLECTION;
    const hasPickupDatePatch = Object.prototype.hasOwnProperty.call(datePatch, "pickupDate");
    const hasReturnDatePatch = Object.prototype.hasOwnProperty.call(datePatch, "returnDate");
    const hasAssetsPatch = Object.prototype.hasOwnProperty.call(datePatch, "assets");
    const nextAssets = hasAssetsPatch && Array.isArray(datePatch.assets)
      ? datePatch.assets
      : (Array.isArray(requestItem?.assets) ? requestItem.assets : []);
    const nextPickupDate = (hasPickupDatePatch ? datePatch.pickupDate : requestItem?.pickupDate || "").toString().trim();
    const nextReturnDate = (hasReturnDatePatch ? datePatch.returnDate : requestItem?.returnDate || "").toString().trim();
    const pickupChanged = !!nextPickupDate && !!requestItem?.pickupDate && nextPickupDate !== requestItem.pickupDate;
    const trimmedNote = (noteText || "").toString().trim() || (pickupChanged ? formatPickupAppointmentNote(nextPickupDate) : "");
    const targetStatus = normalizeRequestStatus(nextStatus);
    const actorEmail = readCurrentUserEmail();
    const docRef = firestore.doc(firestore.db, targetCollection, requestId);
    const payload = {
      status: targetStatus,
      staffNote: trimmedNote,
      staffUpdatedBy: actorEmail,
      updatedAt: firestore.serverTimestamp()
    };
    if (hasPickupDatePatch && nextPickupDate && nextPickupDate !== requestItem?.pickupDate) {
      payload.pickupDate = nextPickupDate;
    }
    if (hasReturnDatePatch && nextReturnDate && nextReturnDate !== requestItem?.returnDate) {
      payload.returnDate = nextReturnDate;
    }
    if (hasAssetsPatch) {
      payload.assets = nextAssets;
    }
    if (pickupChanged && !requestItem?.originalPickupDate) {
      payload.originalPickupDate = requestItem.pickupDate;
    }
    if (typeof firestore.runTransaction !== "function") {
      await firestore.updateDoc(docRef, payload);
      void window.sgcuAuditLog?.write?.({
        action: "borrow.request.status_update",
        entityType: "borrowAssetRequest",
        entityId: requestId,
        before: beforeRequestSnapshot,
        after: payload,
        metadata: { sourceCollection: targetCollection },
        source: "web_app_staff"
      });
      return;
    }

    await firestore.runTransaction(firestore.db, async (transaction) => {
      const requestSnap = await transaction.get(docRef);
      if (!requestSnap.exists()) {
        const err = new Error("ไม่พบคำขอในระบบ");
        err.code = "not-found";
        throw err;
      }
      const data = requestSnap.data() || {};
      const currentStatus = normalizeRequestStatus(data.status);
      const deltas = buildReservationDeltas(currentStatus, targetStatus, data.assets || [], nextAssets);
      await applyStockDeltasInTransaction(transaction, deltas, actorEmail);
      transaction.update(docRef, payload);
    });
    void window.sgcuAuditLog?.write?.({
      action: "borrow.request.status_update",
      entityType: "borrowAssetRequest",
      entityId: requestId,
      before: beforeRequestSnapshot,
      after: payload,
      metadata: { sourceCollection: targetCollection },
      source: "web_app_staff"
    });
  };

  const deleteBorrowRequest = async (requestId, sourceCollection = "") => {
    if (!requestId) return;
    if (!resolveFirestoreBridge()) return;
    const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
    const beforeRequestSnapshot = requestItem ? { ...requestItem } : null;
    const targetCollection = requestItem?.sourceCollection || sourceCollection || BORROW_REQUEST_COLLECTION;
    const docRef = firestore.doc(firestore.db, targetCollection, requestId);
    const actorEmail = readCurrentUserEmail();
    if (typeof firestore.runTransaction === "function") {
      await firestore.runTransaction(firestore.db, async (transaction) => {
        const requestSnap = await transaction.get(docRef);
        if (!requestSnap.exists()) return;
        const data = requestSnap.data() || {};
        const deltas = buildReservationDeltas(data.status, STATUS_CANCELLED, data.assets || []);
        await applyStockDeltasInTransaction(transaction, deltas, actorEmail);
        transaction.delete(docRef);
      });
      if (requestItem) {
        requestItem.isDeleted = true;
      }
      void window.sgcuAuditLog?.write?.({
        action: "borrow.request.delete",
        entityType: "borrowAssetRequest",
        entityId: requestId,
        before: beforeRequestSnapshot,
        metadata: { sourceCollection: targetCollection, mode: "hard_delete_transaction" },
        source: "web_app_staff"
      });
      return;
    }
    await firestore.deleteDoc(docRef);
    if (requestItem) {
      requestItem.isDeleted = true;
    }
    void window.sgcuAuditLog?.write?.({
      action: "borrow.request.delete",
      entityType: "borrowAssetRequest",
      entityId: requestId,
      before: beforeRequestSnapshot,
      metadata: { sourceCollection: targetCollection, mode: "hard_delete" },
      source: "web_app_staff"
    });
  };

  if (hasBorrowFormSection) {
    updateBorrowAcademicYearDisplay();
    void ensureBorrowOrgCodeData().then(() => {
      updateBorrowAcademicYearDisplay();
      populateBorrowProjectTypeOptions();
      populateBorrowProjectDeptOptions();
    });
    populateBorrowProjectTypeOptions();
    populateBorrowProjectDeptOptions();
    if (borrowProjectName) {
      borrowProjectName.addEventListener("change", () => {
        toggleBorrowProjectNameOther();
        populateBorrowProjectDeptOptions();
      });
      borrowProjectName.addEventListener("focus", () => {
        populateBorrowProjectTypeOptions();
        populateBorrowProjectDeptOptions();
      });
    }
    if (borrowProjectDept) {
      borrowProjectDept.addEventListener("focus", populateBorrowProjectDeptOptions);
    }
    const firstRow = borrowAssetList.querySelector("[data-asset-row]");
    if (firstRow) {
      updateRowIds(firstRow, 1);
      bindRow(firstRow);
    }

    addBorrowAssetRow.addEventListener("click", () => {
      const rowTemplate = borrowAssetList.querySelector("[data-asset-row]");
      if (!rowTemplate) return;
      const newRow = rowTemplate.cloneNode(true);
      const nextIndex = borrowAssetList.querySelectorAll("[data-asset-row]").length + 1;
      updateRowIds(newRow, nextIndex);
      newRow.querySelectorAll("input").forEach((input) => {
        input.value = "";
      });
      const warning = newRow.querySelector("[data-asset-warning]");
      if (warning) warning.hidden = true;
      const removeBtn = newRow.querySelector("[data-asset-remove]");
      if (removeBtn) removeBtn.hidden = false;
      borrowAssetList.appendChild(newRow);
      bindRow(newRow);
    });

    if (borrowSubmitBtn) {
      borrowSubmitBtn.addEventListener("click", submitBorrowRequest);
    }
    if (borrowClearBtn) {
      borrowClearBtn.addEventListener("click", clearBorrowRequestForm);
    }
  }

  if (staffQueueTableBody) {
    staffQueueTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button[data-action][data-request-id]");
      if (!(button instanceof HTMLButtonElement)) return;
      const action = button.dataset.action || "";
      const requestId = button.dataset.requestId || "";
      const sourceCollection = button.dataset.requestSource || "";
      if (!action || !requestId) return;
      if (action === "detail") {
        const item = getBorrowRequestByKey(requestId, sourceCollection);
        if (item) openBorrowDetailModal(item);
        return;
      }
      if (!ensureStaffPermission()) return;
      if (staffActionInFlight) return;
      staffActionInFlight = true;

      button.disabled = true;
      setStaffQueueMessage("กำลังอัปเดตสถานะคำขอ...", "#6b7280");
      try {
        if (action === "approve") {
          await updateBorrowRequestStatus(requestId, STATUS_APPROVED, "อนุมัติการยืมเรียบร้อย", sourceCollection);
          setStaffQueueMessage("อนุมัติคำขอเรียบร้อย", "#047857");
        } else if (action === "reject") {
          const reason = await askBorrowStatusReason({
            promptText: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
            title: "ไม่อนุมัติคำขอ",
            subtitle: "เหตุผลนี้จะแสดงให้ผู้ยื่นคำขอเห็นเพื่อใช้ประกอบการแก้ไข",
            placeholder: "เช่น อุปกรณ์ไม่พร้อมให้ยืมในช่วงวันดังกล่าว",
            helperText: "ระบุเหตุผลให้ชัดเจน กระชับ และเข้าใจง่าย",
            requiredMessage: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
            submitLabel: "บันทึก"
          });
          if (!reason || !reason.trim()) return;
          await updateBorrowRequestStatus(requestId, STATUS_REJECTED, reason.trim(), sourceCollection);
          setStaffQueueMessage("ไม่อนุมัติคำขอเรียบร้อย", "#047857");
        } else if (action === "cancel") {
          const reason = await askBorrowStatusReason({
            promptText: "กรุณาระบุเหตุผลการยกเลิกคำขอ",
            title: "ยกเลิกคำขอ",
            subtitle: "ข้อความนี้จะแสดงให้ผู้ยื่นคำขอเห็น",
            initialValue: "ยกเลิกคำขอโดยเจ้าหน้าที่",
            placeholder: "เช่น คำขอซ้ำกับรายการเดิม",
            helperText: "โปรดอธิบายเหตุผลการยกเลิกให้ผู้ยื่นคำขอเข้าใจ",
            requiredMessage: "กรุณาระบุเหตุผลการยกเลิกคำขอ",
            submitLabel: "บันทึก"
          });
          if (!reason || !reason.trim()) return;
          await updateBorrowRequestStatus(requestId, STATUS_CANCELLED, reason.trim(), sourceCollection);
          setStaffQueueMessage("ยกเลิกคำขอเรียบร้อย", "#047857");
        } else if (action === "returned") {
          await updateBorrowRequestStatus(requestId, STATUS_RETURNED, "ส่งคืนพัสดุเรียบร้อย", sourceCollection);
          setStaffQueueMessage("บันทึกคืนพัสดุเรียบร้อย", "#047857");
        } else if (action === "delete") {
          const confirmed = await confirmBorrowDelete(requestId, sourceCollection);
          if (!confirmed) return;
          await deleteBorrowRequest(requestId, sourceCollection);
          renderBorrowRequests();
          setStaffQueueMessage("ลบคำขอเรียบร้อย", "#047857");
        }
      } catch (error) {
        setStaffQueueMessage(
          formatBorrowStatusUpdateError(error),
          "#b91c1c"
        );
        console.error("borrow request status update failed - app.borrow-assets.js:2389", error);
      } finally {
        button.disabled = false;
        staffActionInFlight = false;
      }
    });

    const onBorrowStatusSelectChange = async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (target.dataset.role !== "borrow-status-select") return;
      if (!ensureStaffPermission()) return;
      const requestId = target.dataset.id || "";
      const sourceCollection = target.dataset.source || "";
      const nextValue = (target.value || "").toString().trim().toLowerCase();
      if (!requestId || !nextValue) return;
      const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
      if (!requestItem) return;

      const prevValue = requestItem.status;
      target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
      target.classList.add(borrowStatusSelectClass(nextValue));

      if (nextValue === "delete") {
        const confirmed = await confirmBorrowDelete(requestId, sourceCollection);
        if (!confirmed) {
          target.value = prevValue;
          target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
          target.classList.add(borrowStatusSelectClass(prevValue));
          return;
        }
        try {
          await deleteBorrowRequest(requestId, sourceCollection);
          renderBorrowRequests();
          setStaffQueueMessage("ลบคำขอเรียบร้อย", "#047857");
          return;
        } catch (error) {
          target.value = prevValue;
          target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
          target.classList.add(borrowStatusSelectClass(prevValue));
          const code = (error?.code || "").toString().trim();
          setStaffQueueMessage(
            code === "permission-denied"
              ? "ไม่มีสิทธิ์ลบคำขอ (Firestore Rules)"
              : "ลบคำขอไม่สำเร็จ กรุณาลองใหม่",
            "#b91c1c"
          );
          return;
        }
      }

      if (![STATUS_PENDING, STATUS_APPROVED, STATUS_RECEIVED, STATUS_REJECTED, STATUS_CANCELLED, STATUS_RETURNED].includes(nextValue)) {
        target.value = prevValue;
        target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
        target.classList.add(borrowStatusSelectClass(prevValue));
        return;
      }
      if (prevValue === nextValue) return;

      let noteText = (requestItem.staffNote || "").toString().trim();
      if (nextValue === STATUS_REJECTED) {
        const reason = await askBorrowStatusReason({
          promptText: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
          title: "ไม่อนุมัติคำขอ",
          subtitle: "เหตุผลนี้จะแสดงให้ผู้ยื่นคำขอเห็นเพื่อใช้ประกอบการแก้ไข",
          initialValue: noteText,
          placeholder: "เช่น อุปกรณ์ไม่พร้อมให้ยืมในช่วงวันดังกล่าว",
          helperText: "ระบุเหตุผลให้ชัดเจน กระชับ และเข้าใจง่าย",
          requiredMessage: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
          submitLabel: "บันทึก"
        });
        if (!reason || !reason.trim()) {
          target.value = prevValue;
          target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
          target.classList.add(borrowStatusSelectClass(prevValue));
          return;
        }
        noteText = reason.trim();
      } else if (nextValue === STATUS_CANCELLED) {
        const reason = await askBorrowStatusReason({
          promptText: "กรุณาระบุเหตุผลการยกเลิกคำขอ",
          title: "ยกเลิกคำขอ",
          subtitle: "ข้อความนี้จะแสดงให้ผู้ยื่นคำขอเห็น",
          initialValue: noteText || "ยกเลิกคำขอโดยเจ้าหน้าที่",
          placeholder: "เช่น คำขอซ้ำกับรายการเดิม",
          helperText: "โปรดอธิบายเหตุผลการยกเลิกให้ผู้ยื่นคำขอเข้าใจ",
          requiredMessage: "กรุณาระบุเหตุผลการยกเลิกคำขอ",
          submitLabel: "บันทึก"
        });
        if (!reason || !reason.trim()) {
          target.value = prevValue;
          target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
          target.classList.add(borrowStatusSelectClass(prevValue));
          return;
        }
        noteText = reason.trim();
      } else if (nextValue === STATUS_APPROVED && !noteText) {
        noteText = "อนุมัติการยืมเรียบร้อย";
      } else if (nextValue === STATUS_RECEIVED && !noteText) {
        noteText = "รับพัสดุเรียบร้อยแล้ว";
      } else if (nextValue === STATUS_RETURNED && !noteText) {
        noteText = "ส่งคืนพัสดุเรียบร้อย";
      }

      try {
        await updateBorrowRequestStatus(requestId, nextValue, noteText, sourceCollection);
        setStaffQueueMessage("อัปเดตสถานะเรียบร้อย", "#047857");
      } catch (error) {
        target.value = prevValue;
        target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
        target.classList.add(borrowStatusSelectClass(prevValue));
        setStaffQueueMessage(
          formatBorrowStatusUpdateError(error),
          "#b91c1c"
        );
      }
    };

    staffQueueTableBody.addEventListener("change", onBorrowStatusSelectChange);
    if (staffHistoryTableBody) {
      staffHistoryTableBody.addEventListener("change", onBorrowStatusSelectChange);
    }

    staffQueueTableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, select, option, input, textarea, [data-role]")) return;
      const row = target.closest("tr[data-request-id]");
      if (!row) return;
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });

    if (staffHistoryTableBody) {
      staffHistoryTableBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("button, select, option, input, textarea, [data-role]")) return;
        const row = target.closest("tr[data-request-id]");
        if (!row) return;
        const requestId = row.getAttribute("data-request-id") || "";
        const sourceCollection = row.getAttribute("data-request-source") || "";
        if (!requestId) return;
        const item = getBorrowRequestByKey(requestId, sourceCollection);
        if (item) openBorrowDetailModal(item);
      });

      staffHistoryTableBody.addEventListener("keydown", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const row = target.closest("tr[data-request-id]");
        if (!row) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const requestId = row.getAttribute("data-request-id") || "";
        const sourceCollection = row.getAttribute("data-request-source") || "";
        if (!requestId) return;
        const item = getBorrowRequestByKey(requestId, sourceCollection);
        if (item) openBorrowDetailModal(item);
      });
    }
  }

  if (myRequestsTableBody) {
    myRequestsTableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button[data-action='detail'][data-request-id]");
      if (button instanceof HTMLButtonElement) {
        const item = getBorrowRequestByKey(button.dataset.requestId || "", button.dataset.requestSource || "");
        if (item) openBorrowDetailModal(item);
        return;
      }
      if (target.closest("button, select, option, input, textarea, a")) return;
      const row = target.closest("tr[data-request-id]");
      if (!row) return;
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });

    myRequestsTableBody.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const row = target.closest("tr[data-request-id]");
      if (!row) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });
  }

  if (myRequestsCardsEl) {
    myRequestsCardsEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, select, option, input, textarea, a")) return;
      const row = target.closest("[data-request-id]");
      if (!row) return;
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });

    myRequestsCardsEl.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const row = target.closest("[data-request-id]");
      if (!row) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });
  }

  myRequestsExportCsvBtn?.addEventListener("click", () => {
    exportBorrowRowsCsv(getMyBorrowRequestRows(), "borrow-my-requests");
  });
  staffBorrowExportCsvBtn?.addEventListener("click", () => {
    const name = staffRequestTabMode === "history" ? "borrow-staff-history" : "borrow-staff-queue";
    exportBorrowRowsCsv(getStaffBorrowVisibleRows(), name);
  });
  staffBorrowPickupDaysForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveStaffBorrowPickupDays();
  });

  updateBorrowPickupDateRule();
  void loadStaffBorrowPickupDays();
  loadBorrowAssets();

  if (borrowAssetsSearch) {
    borrowAssetsSearch.addEventListener("input", applyBorrowAssetsFilters);
  }
  if (borrowAssetsSearchClear && borrowAssetsSearch) {
    borrowAssetsSearchClear.addEventListener("click", () => {
      borrowAssetsSearch.value = "";
      applyBorrowAssetsFilters();
    });
  }
  if (borrowAssetsSearchStaff) {
    borrowAssetsSearchStaff.addEventListener("input", () => {
      staffAssetsPage = 1;
      applyBorrowAssetsFilters();
    });
  }
  if (borrowAssetsSearchStaffClear && borrowAssetsSearchStaff) {
    borrowAssetsSearchStaffClear.addEventListener("click", () => {
      borrowAssetsSearchStaff.value = "";
      staffAssetsPage = 1;
      applyBorrowAssetsFilters();
    });
  }
  if (borrowAssetsTypeFilter) {
    borrowAssetsTypeFilter.addEventListener("change", applyBorrowAssetsFilters);
  }
  if (borrowAssetsTypeFilterStaff) {
    borrowAssetsTypeFilterStaff.addEventListener("change", () => {
      staffAssetsPage = 1;
      applyBorrowAssetsFilters();
    });
  }

  const resetStaffBorrowRequestPages = () => {
    staffRequestPageByMode.queue = 1;
    staffRequestPageByMode.history = 1;
  };

  const applyStaffBorrowRequestFilters = () => {
    resetStaffBorrowRequestPages();
    updateStaffBorrowMobileFilterToggle();
    renderBorrowRequests();
  };

  const clearStaffBorrowRequestFilters = () => {
    if (staffBorrowRequestSearch) staffBorrowRequestSearch.value = "";
    clearStaffBorrowAdvancedFilters();
  };

  const clearStaffBorrowAdvancedFilters = () => {
    if (staffBorrowRequestStatusFilter) staffBorrowRequestStatusFilter.value = "all";
    if (staffBorrowRequestOrgFilter) staffBorrowRequestOrgFilter.value = "all";
    if (staffBorrowRequestDeptFilter) staffBorrowRequestDeptFilter.value = "all";
    if (staffBorrowRequestDueFilter) staffBorrowRequestDueFilter.value = "all";
    if (staffBorrowRequestPickupFrom) staffBorrowRequestPickupFrom.value = "";
    if (staffBorrowRequestPickupTo) staffBorrowRequestPickupTo.value = "";
    if (staffBorrowRequestReturnFrom) staffBorrowRequestReturnFrom.value = "";
    if (staffBorrowRequestReturnTo) staffBorrowRequestReturnTo.value = "";
    applyStaffBorrowRequestFilters();
  };

  [
    staffBorrowRequestSearch,
    staffBorrowRequestPickupFrom,
    staffBorrowRequestPickupTo,
    staffBorrowRequestReturnFrom,
    staffBorrowRequestReturnTo
  ].forEach((input) => {
    input?.addEventListener("input", applyStaffBorrowRequestFilters);
  });
  [
    staffBorrowRequestStatusFilter,
    staffBorrowRequestOrgFilter,
    staffBorrowRequestDeptFilter,
    staffBorrowRequestDueFilter
  ].forEach((select) => {
    select?.addEventListener("change", applyStaffBorrowRequestFilters);
  });
  staffBorrowRequestSearchClear?.addEventListener("click", clearStaffBorrowRequestFilters);
  updateStaffBorrowMobileFilterToggle();

  staffAssetsPagerEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.borrowAssetsPageAction;
    if (action !== "prev" && action !== "next") return;
    staffAssetsPage = action === "next"
      ? staffAssetsPage + 1
      : Math.max(1, staffAssetsPage - 1);
    applyBorrowAssetsFilters();
  });

  const staffTabBtns = document.querySelectorAll(".tab-btn[data-assets-staff-tab]");
  const staffMainTabBtns = document.querySelectorAll(".tab-btn[data-assets-staff-main-tab]");
  const staffBorrowQueue = document.getElementById("staffBorrowQueue");
  const staffBorrowInventory = document.getElementById("staffBorrowInventory");
  const staffBorrowHistory = document.getElementById("staffBorrowHistory");
  const isStaffBorrowMobile = () =>
    !window.matchMedia || window.matchMedia("(max-width: 840px)").matches;
  const isStaffBorrowRequestsMainTabActive = () =>
    Array.from(staffMainTabBtns).some(
      (btn) => (btn.dataset.assetsStaffMainTab || "requests") === "requests" && btn.classList.contains("is-active")
    );
  const isStaffBorrowInventoryMainTabActive = () =>
    Array.from(staffMainTabBtns).some(
      (btn) => btn.dataset.assetsStaffMainTab === "inventory" && btn.classList.contains("is-active")
    );
  const closeStaffBorrowFilterSheet = () => {
    if (staffBorrowFilterFieldsPlaceholder && staffBorrowRequestFilterFields) {
      staffBorrowFilterFieldsPlaceholder.parentNode?.insertBefore(
        staffBorrowRequestFilterFields,
        staffBorrowFilterFieldsPlaceholder
      );
      staffBorrowFilterFieldsPlaceholder.remove();
      staffBorrowFilterFieldsPlaceholder = null;
      staffBorrowRequestFilterFields.removeAttribute("data-mobile-filter-mounted");
      staffBorrowRequestFilterFields.style.removeProperty("display");
    }
    staffBorrowFilterSheet.classList.remove("is-open");
    staffBorrowFilterSheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-filter-open");
  };
  const openStaffBorrowFilterSheet = () => {
    if (!staffBorrowRequestFilterFields || !staffBorrowFilterSheetBody) return;
    if (!isStaffBorrowMobile()) {
      staffBorrowRequestFiltersBar?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    closeStaffBorrowFilterSheet();
    staffBorrowFilterFieldsPlaceholder = document.createComment("borrow-mobile-filter-placeholder");
    staffBorrowRequestFilterFields.parentNode?.insertBefore(
      staffBorrowFilterFieldsPlaceholder,
      staffBorrowRequestFilterFields
    );
    staffBorrowRequestFilterFields.setAttribute("data-mobile-filter-mounted", "true");
    staffBorrowFilterSheetBody.appendChild(staffBorrowRequestFilterFields);
    staffBorrowRequestFilterFields.style.display = "grid";
    staffBorrowFilterSheet.classList.add("is-open");
    staffBorrowFilterSheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-filter-open");
    window.setTimeout(() => {
      const firstControl = staffBorrowRequestFilterFields.querySelector("select, input, textarea, button");
      firstControl?.focus?.({ preventScroll: true });
    }, 260);
  };
  const syncStaffBorrowMobileActionBar = () => {
    const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
    if (activePage !== "borrow-assets-staff" && staffBorrowFilterSheet.classList.contains("is-open")) {
      closeStaffBorrowFilterSheet();
    }
    const shouldShow = activePage === "borrow-assets-staff";
    staffBorrowMobileActionBar?.classList.toggle("is-visible", shouldShow);
    if (activePage === "borrow-assets-staff") {
      document.body.classList.toggle("has-mobile-context-actions", shouldShow);
    }
    const filterOpen = staffBorrowFilterSheet.classList.contains("is-open");
    staffBorrowMobileActionBtns.forEach((btn) => {
      const action = btn.dataset.borrowMobileAction;
      btn.classList.toggle(
        "is-active",
        (action === "queue" && isStaffBorrowRequestsMainTabActive() && staffRequestTabMode !== "history" && !filterOpen) ||
          (action === "history" && isStaffBorrowRequestsMainTabActive() && staffRequestTabMode === "history" && !filterOpen) ||
          (action === "inventory" && isStaffBorrowInventoryMainTabActive() && !filterOpen) ||
          (action === "filters" && filterOpen)
      );
    });
    updateStaffBorrowMobileFilterToggle();
  };
  const setStaffBorrowMobileFilterOpen = (isOpen) => {
    if (isOpen) {
      openStaffBorrowFilterSheet();
    } else {
      closeStaffBorrowFilterSheet();
    }
    staffBorrowMobileFilterBtn?.setAttribute("aria-expanded", isOpen ? "true" : "false");
    syncStaffBorrowMobileActionBar();
  };
  const scrollToStaffBorrowRequests = (target = staffBorrowQueue) => {
    if (!isStaffBorrowMobile()) return;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const setStaffBorrowMainTab = (tabName) => {
    const activeTab = tabName === "inventory" ? "inventory" : "requests";
    if (activeTab !== "requests") {
      setStaffBorrowMobileFilterOpen(false);
    }
    if (staffBorrowQueue) {
      const showRequests = activeTab === "requests";
      staffBorrowQueue.style.display = showRequests ? "block" : "none";
      staffBorrowQueue.classList.toggle("section-visible", showRequests);
    }
    if (staffBorrowInventory) {
      const showInventory = activeTab === "inventory";
      staffBorrowInventory.style.display = showInventory ? "block" : "none";
      staffBorrowInventory.classList.toggle("section-visible", showInventory);
    }
    staffMainTabBtns.forEach((btn) => {
      const matched = (btn.dataset.assetsStaffMainTab || "requests") === activeTab;
      btn.classList.toggle("is-active", matched);
      btn.setAttribute("aria-selected", matched ? "true" : "false");
    });
    if (activeTab === "inventory") {
      if (borrowAssetsRows.length) {
        applyBorrowAssetsFilters();
      } else {
        void loadBorrowAssets();
      }
    } else {
      renderBorrowRequests();
    }
    syncStaffBorrowMobileActionBar();
  };
  if (staffMainTabBtns.length && staffBorrowQueue && staffBorrowInventory) {
    setStaffBorrowMainTab("requests");
    staffMainTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        setStaffBorrowMainTab(btn.dataset.assetsStaffMainTab || "requests");
      });
    });
  }
  if (staffTabBtns.length && staffBorrowQueue && staffBorrowHistory) {
    staffBorrowHistory.style.display = "none";
    staffBorrowHistory.classList.remove("section-visible");
    staffBorrowQueue.style.display = "block";
    staffBorrowQueue.classList.add("section-visible");
    staffTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.assetsStaffTab;
        staffRequestTabMode = target === "history" ? "history" : "queue";
        staffTabBtns.forEach((b) => {
          const matched = (b.dataset.assetsStaffTab || "") === target;
          b.classList.toggle("is-active", matched);
        });
        setStaffRequestPanelMeta();
        renderBorrowRequests();
        setStaffBorrowMobileFilterOpen(false);
        syncStaffBorrowMobileActionBar();
      });
    });
  }
  staffBorrowMobileActionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.borrowMobileAction;
      if (action === "queue") {
        setStaffBorrowMobileFilterOpen(false);
        document.querySelector('[data-assets-staff-main-tab="requests"]')?.click();
        document.querySelector('[data-assets-staff-tab="queue"]')?.click();
        scrollToStaffBorrowRequests(staffBorrowQueue);
      } else if (action === "history") {
        setStaffBorrowMobileFilterOpen(false);
        document.querySelector('[data-assets-staff-main-tab="requests"]')?.click();
        document.querySelector('[data-assets-staff-tab="history"]')?.click();
        scrollToStaffBorrowRequests(staffBorrowQueue);
      } else if (action === "inventory") {
        setStaffBorrowMobileFilterOpen(false);
        document.querySelector('[data-assets-staff-main-tab="inventory"]')?.click();
        scrollToStaffBorrowRequests(staffBorrowInventory);
      } else if (action === "filters") {
        if (!isStaffBorrowRequestsMainTabActive()) {
          document.querySelector('[data-assets-staff-main-tab="requests"]')?.click();
        }
        const isOpen = !staffBorrowFilterSheet.classList.contains("is-open");
        setStaffBorrowMobileFilterOpen(isOpen);
      }
      window.setTimeout(syncStaffBorrowMobileActionBar, 0);
    });
  });
  staffBorrowFilterSheet.querySelectorAll("[data-borrow-filter-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setStaffBorrowMobileFilterOpen(false);
    });
  });
  staffBorrowFilterSheetDoneBtn?.addEventListener("click", () => {
    setStaffBorrowMobileFilterOpen(false);
  });
  staffBorrowFilterSheetResetBtn?.addEventListener("click", () => {
    clearStaffBorrowAdvancedFilters();
    window.setTimeout(syncStaffBorrowMobileActionBar, 0);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && staffBorrowFilterSheet.classList.contains("is-open")) {
      setStaffBorrowMobileFilterOpen(false);
    }
  });
  const staffBorrowMobileActionObserver = new MutationObserver(syncStaffBorrowMobileActionBar);
  document.querySelectorAll(".page-view").forEach((pageEl) => {
    staffBorrowMobileActionObserver.observe(pageEl, { attributes: true, attributeFilter: ["class"] });
  });
  syncStaffBorrowMobileActionBar();

  staffRequestPagerEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.borrowPageAction;
    if (action !== "prev" && action !== "next") return;
    const current = staffRequestPageByMode[staffRequestTabMode] || 1;
    staffRequestPageByMode[staffRequestTabMode] = action === "next"
      ? current + 1
      : Math.max(1, current - 1);
    renderBorrowRequests();
  });

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
      scheduleFirestoreRetry();
    }, 1200);
  };
  scheduleFirestoreRetry();

  if (window.sgcuAuth?.auth && typeof window.sgcuAuth.onAuthStateChanged === "function") {
    window.sgcuAuth.onAuthStateChanged(window.sgcuAuth.auth, () => {
      currentUserEmail = readCurrentUserEmail();
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

  window.addEventListener("sgcu:user-profile-updated", (event) => {
    const detail = event?.detail || {};
    const email = (detail.email || "").toString().trim().toLowerCase();
    if (!email || email !== currentUserEmail) return;
    applyBorrowProfileToForm(detail.profile || {});
  });

  window.addEventListener("beforeunload", () => {
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
