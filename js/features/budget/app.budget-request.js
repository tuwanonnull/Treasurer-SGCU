/* Budget approval request form */
function initBudgetApprovalRequestPage() {
  if (window.__sgcuBudgetApprovalRequestInitialized) return;
  window.__sgcuBudgetApprovalRequestInitialized = true;

  const formEl = document.getElementById("budgetApprovalForm");
  const submitBtnEl = document.getElementById("budgetApprovalSubmitBtn");
  const cancelEditBtnEl = document.getElementById("budgetApprovalCancelEditBtn");
  const cancelRequestBtnEl = document.getElementById("budgetApprovalCancelRequestBtn");
  const messageEl = document.getElementById("budgetApprovalMessage");
  const myRequestsTableBodyEl = document.getElementById("budgetApprovalMyRequestsTableBody");
  const myRequestsCaptionEl = document.getElementById("budgetApprovalListCaption");
  const exportCsvBtnEl = document.getElementById("budgetApprovalExportCsvBtn");
  const requestViewBtnEls = Array.from(document.querySelectorAll("[data-budget-request-view]"));
  const requestViewPanelEls = Array.from(document.querySelectorAll("[data-budget-request-view-panel]"));
  const orgTotalsCaptionEl = document.getElementById("budgetOrgTotalsCaption");
  const orgTotalsOrgCountEl = document.getElementById("budgetOrgTotalsOrgCount");
  const orgTotalsProjectCountEl = document.getElementById("budgetOrgTotalsProjectCount");
  const orgTotalsRequestedAmountEl = document.getElementById("budgetOrgTotalsRequestedAmount");
  const orgTotalsApprovedAmountEl = document.getElementById("budgetOrgTotalsApprovedAmount");
  const orgTotalsChartCanvasEl = document.getElementById("budgetOrgTotalsChart");
  const orgTotalsTableBodyEl = document.getElementById("budgetOrgTotalsTableBody");
  const orgTotalsRoundSelectEl = document.getElementById("budgetOrgTotalsRoundSelect");
  const orgTypeEl = document.getElementById("budgetOrgType");
  const orgDeptEl = document.getElementById("budgetOrgDept");
  const orgTypeDisplayEl = document.getElementById("budgetOrgTypeDisplay");
  const orgDeptDisplayEl = document.getElementById("budgetOrgDeptDisplay");
  const orgSummaryProjectCountEl = document.getElementById("budgetOrgSummaryProjectCount");
  const orgSummaryTotalExpenseEl = document.getElementById("budgetOrgSummaryTotalExpense");
  const orgSummaryApprovedExpenseEl = document.getElementById("budgetOrgSummaryApprovedExpense");
  const orgSummaryCaptionEl = document.getElementById("budgetOrgSummaryCaption");
  const requestDeadlineDisplayEl = document.getElementById("budgetRequestDeadlineDisplay");
  const requestDeadlineCaptionEl = document.getElementById("budgetRequestDeadlineCaption");
  const requestRoundDisplayEl = document.getElementById("budgetRequestRoundDisplay");
  const requestRoundCaptionEl = document.getElementById("budgetRequestRoundCaption");
  const requestRoundSelectEl = document.getElementById("budgetRequestRoundSelect");
  const projectNameEl = document.getElementById("budgetProjectName");
  const descriptionEl = document.getElementById("budgetProjectDescription");
  const locationEl = document.getElementById("budgetActivityLocation");
  const prepStartDateEl = document.getElementById("budgetPrepStartDate");
  const operationEndDateEl = document.getElementById("budgetOperationEndDate");
  const studentOperatorsEl = document.getElementById("budgetStudentOperators");
  const studentParticipantsEl = document.getElementById("budgetStudentParticipants");
  const estimatedExpenseEl = document.getElementById("budgetEstimatedExpense");
  const descriptionCounterEl = document.getElementById("budgetProjectDescriptionCounter");
  const representativeApplyBtnEl = document.getElementById("budgetRepresentativeApplyBtn");
  const representativeStatusCaptionEl = document.getElementById("budgetRepresentativeStatusCaption");
  const representativeMessageEl = document.getElementById("budgetRepresentativeMessage");
  const representativeApplicationsBodyEl = document.getElementById("budgetRepresentativeMyApplicationsBody");
  const representativeModalEl = document.getElementById("budgetRepresentativeApplicationModal");
  const representativeModalCloseEl = document.getElementById("budgetRepresentativeApplicationClose");
  const representativeCancelBtnEl = document.getElementById("budgetRepresentativeCancelBtn");
  const representativeFormEl = document.getElementById("budgetRepresentativeApplicationForm");
  const representativeOrgTypeEl = document.getElementById("budgetRepresentativeOrgType");
  const representativeOrgDeptEl = document.getElementById("budgetRepresentativeOrgDept");
  const representativeAcademicYearDisplayEl = document.getElementById("budgetRepresentativeAcademicYearDisplay");
  const representativeRoleEl = document.getElementById("budgetRepresentativeRole");
  const representativeRoleOtherEl = document.getElementById("budgetRepresentativeRoleOther");
  const representativeEvidenceEl = document.getElementById("budgetRepresentativeEvidence");
  const representativeSubmitBtnEl = document.getElementById("budgetRepresentativeSubmitBtn");
  const representativeApplicationMessageEl = document.getElementById("budgetRepresentativeApplicationMessage");

  if (
    !formEl ||
    !submitBtnEl ||
    !messageEl ||
    !myRequestsTableBodyEl ||
    !myRequestsCaptionEl ||
    !orgTypeEl ||
    !orgDeptEl ||
    !projectNameEl ||
    !descriptionEl ||
    !locationEl ||
    !prepStartDateEl ||
    !operationEndDateEl ||
    !studentOperatorsEl ||
    !studentParticipantsEl ||
    !estimatedExpenseEl ||
    !requestRoundSelectEl
  ) {
    return;
  }

  const LOGIN_PROFILE_STORAGE_KEY = "sgcu_user_profile_by_email_v1";
  const LEGACY_LOGIN_PROFILE_STORAGE_KEY = "sgcu_borrow_profile_by_email_v1";
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const firestoreCollections = appConfig.firestore?.collections || {};
  const firestoreDocs = appConfig.firestore?.docs || {};
  const REQUEST_COLLECTION = firestoreCollections.budgetApprovalRequests || "budgetApprovalRequests";
  const REPRESENTATIVE_APPLICATION_COLLECTION =
    firestoreCollections.organizationRepresentativeApplications || "organizationRepresentativeApplications";
  const SETTINGS_COLLECTION = firestoreCollections.budgetApprovalSettings || "budgetApprovalSettings";
  const SETTINGS_DOC_ID = firestoreDocs.budgetApprovalSettings || "global";
  const BUDGET_REQUEST_LIST_LIMIT = 500;
  const REPRESENTATIVE_APPLICATION_LIST_LIMIT = 100;
  const NO_OPEN_BUDGET_ROUNDS_MESSAGE = "ยังไม่มีรอบรับคำของบที่เปิดอยู่ จึงยังไม่สามารถยื่นหรือแก้ไขคำขอได้";
  const NO_APPROVED_REPRESENTATIVE_MESSAGE =
    "ยังไม่มีสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว จึงไม่สามารถดู แก้ไข ลบรายการ หรือเพิ่มคำของบขององค์กรได้";
  let unsubscribeMyRequests = null;
  let unsubscribeOrgBudgetTotals = null;
  let unsubscribeRepresentativeApplications = null;
  let unsubscribeBudgetSettings = null;
  let currentRepresentativeApplications = [];
  let currentApprovedRepresentatives = [];
  let representativeApplicationsLoaded = false;
  let editingRequestId = "";
  let latestMyBudgetRequests = [];
  let latestBudgetRequestRows = [];
  let latestOrgBudgetRows = [];
  let latestOrgBudgetSummaryRows = [];
  let latestOrgBudgetTotalsSource = "loading";
  let latestMyRequestsQueryScope = "";
  let orgTotalsChartInstance = null;
  let selectedOrgTotalsRoundId = "";
  let budgetRequestDeadline = "";
  let budgetRequestDeadlineTime = "";
  let isBudgetRequestClosed = false;
  let budgetRoundYear = "";
  let representativeApplicationYear = "";
  let budgetRoundNo = "";

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
  let currentBudgetRoundId = "";
  let activeBudgetRounds = [];

  if (representativeModalEl && representativeModalEl.parentElement !== document.body) {
    document.body.appendChild(representativeModalEl);
  }

  const collectBudgetOrgTypeOptions = () => {
    const fromFilters =
      typeof orgFilters !== "undefined" && Array.isArray(orgFilters)
        ? orgFilters
          .filter((item) => {
            const itemYear = normalizeAcademicYearText(item?.academicYear || item?.year || item?.catalogAcademicYear);
            return !itemYear || itemYear === getRepresentativeApplicationAcademicYear();
          })
          .map((item) => (item?.group || "").toString().trim())
        : [];
    const fromProjects =
      typeof projects !== "undefined" && Array.isArray(projects)
        ? projects.map((item) => (item?.orgGroup || "").toString().trim())
        : [];
    return Array.from(new Set([...fromFilters, ...fromProjects].filter(Boolean)))
      .sort((a, b) => b.localeCompare(a, "th"));
  };

  const normalizeOrgText = (value) => (value || "").toString().trim();

  const normalizePositiveIntegerText = (value) => {
    const num = Number((value || "").toString().trim());
    return Number.isInteger(num) && num > 0 ? String(num) : "";
  };

  const normalizeAcademicYearText = (value) => {
    const normalized = normalizePositiveIntegerText(value);
    if (!normalized) return "";
    const num = Number(normalized);
    return num < 100 ? String(2500 + num) : normalized;
  };

  const getRepresentativeApplicationAcademicYear = () =>
    String(getCurrentAcademicYearBE());

  const updateRepresentativeAcademicYearDisplay = () => {
    if (representativeAcademicYearDisplayEl) {
      representativeAcademicYearDisplayEl.textContent = `ปีการศึกษา ${getRepresentativeApplicationAcademicYear()}`;
    }
  };

  const normalizeBudgetYearMap = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce((acc, [year, text]) => {
      const normalizedYear = normalizeAcademicYearText(year);
      const normalizedText = (text || "").toString().trim();
      if (/^\d{4}$/.test(normalizedYear) && normalizedText) acc[normalizedYear] = normalizedText;
      return acc;
    }, {});
  };

  const getBudgetYearValue = (map = {}, academicYear = getRepresentativeApplicationAcademicYear()) => {
    const year = Number(normalizeAcademicYearText(academicYear));
    if (!Number.isFinite(year)) return "";
    const normalized = normalizeBudgetYearMap(map);
    if (normalized[String(year)]) return normalized[String(year)];
    const previousYear = Object.keys(normalized)
      .map((key) => Number(key))
      .filter((itemYear) => Number.isFinite(itemYear) && itemYear < year)
      .sort((a, b) => b - a)[0];
    return previousYear ? normalized[String(previousYear)] || "" : "";
  };

  const getBudgetOrgItemAcademicYear = (item = {}) =>
    normalizeAcademicYearText(item?.academicYear || item?.year || item?.catalogAcademicYear);

  const shouldUseBudgetOrgItemForRepresentativeYear = (item = {}) => {
    const itemYear = getBudgetOrgItemAcademicYear(item);
    return !itemYear || itemYear === getRepresentativeApplicationAcademicYear();
  };

  const compareBudgetOrgNameByCode = (a, b, codeByName = new Map()) => {
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

  const getBudgetOrgCodeForYear = (item = {}) => {
    if (!shouldUseBudgetOrgItemForRepresentativeYear(item)) return "";
    if (getBudgetOrgItemAcademicYear(item)) {
      return (item?.code || item?.orgCode || "").toString().trim();
    }
    const year = getRepresentativeApplicationAcademicYear();
    const codeByAcademicYear = item?.codeByAcademicYear && typeof item.codeByAcademicYear === "object"
      ? item.codeByAcademicYear
      : {};
    const yearCode = year ? getBudgetYearValue(codeByAcademicYear, year) : "";
    return (yearCode || item?.code || "").toString().trim();
  };

  const getBudgetOrgNameForRepresentativeYear = (item = {}) => {
    if (!shouldUseBudgetOrgItemForRepresentativeYear(item)) return "";
    if (getBudgetOrgItemAcademicYear(item)) {
      return (item?.name || item?.organizationName || item?.orgName || "").toString().trim();
    }
    const rawName = (item?.name || item?.organizationName || item?.orgName || "").toString().trim();
    const nameByAcademicYear = normalizeBudgetYearMap(item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear);
    if (Object.keys(nameByAcademicYear).length) {
      return getBudgetYearValue(nameByAcademicYear, getRepresentativeApplicationAcademicYear());
    }
    return rawName;
  };

  const collectBudgetOrgNameOptions = (orgType) => {
    const selectedType = (orgType || "").toString().trim();
    if (!selectedType) return [];
    const codeByName = new Map();
    const fromFilters = [];
    if (typeof orgFilters !== "undefined" && Array.isArray(orgFilters)) {
      orgFilters
        .filter((item) => (item?.group || "").toString().trim() === selectedType)
        .forEach((item) => {
          const name = getBudgetOrgNameForRepresentativeYear(item);
          if (!name) return;
          const code = getBudgetOrgCodeForYear(item);
          if (code && !codeByName.has(name)) codeByName.set(name, code);
          fromFilters.push(name);
        });
    }
    const fromProjects =
      typeof projects !== "undefined" && Array.isArray(projects)
        ? projects
          .filter((item) => (item?.orgGroup || "").toString().trim() === selectedType)
          .map((item) => (item?.orgName || "").toString().trim())
        : [];
    return Array.from(new Set([...fromFilters, ...fromProjects].filter(Boolean)))
      .sort((a, b) => compareBudgetOrgNameByCode(a, b, codeByName));
  };

  const collectRepresentativeOrgTypeOptions = () => {
    if (typeof orgFilters === "undefined" || !Array.isArray(orgFilters)) return [];
    return Array.from(new Set(
      orgFilters
        .filter((item) => getBudgetOrgNameForRepresentativeYear(item))
        .map((item) => (item?.group || "").toString().trim())
        .filter(Boolean)
    )).sort((a, b) => b.localeCompare(a, "th"));
  };

  const collectRepresentativeOrgNameOptions = (orgType) => {
    const selectedType = (orgType || "").toString().trim();
    if (!selectedType || typeof orgFilters === "undefined" || !Array.isArray(orgFilters)) return [];
    const codeByName = new Map();
    const names = [];
    orgFilters
      .filter((item) => (item?.group || "").toString().trim() === selectedType)
      .forEach((item) => {
        const name = getBudgetOrgNameForRepresentativeYear(item);
        if (!name) return;
        const code = getBudgetOrgCodeForYear(item);
        if (code && !codeByName.has(name)) codeByName.set(name, code);
        names.push(name);
      });
    return Array.from(new Set(names)).sort((a, b) => compareBudgetOrgNameByCode(a, b, codeByName));
  };

  const normalizeBudgetOrgMatchValue = (value = "") =>
    normalizeOrgText(value).toLowerCase().replace(/\s+/g, " ");

  const getBudgetOrgBaseId = (item = {}) =>
    normalizeOrgText(item?.baseOrganizationId || item?.baseOrgId || item?.rootOrganizationId || item?.legacyOrganizationId || item?.id);

  const stripBudgetOrgRunCodeYear = (value = "") =>
    normalizeOrgText(value)
      .replace(/^(?:อบจ(?:\.(?:กฬ|พฒ|วชก|ศป))?\.?)\s*/u, "")
      .replace(/\s*\/\s*\d{4}\s*$/u, "");

  const getBudgetOrgCatalogMatchValues = (item = {}) => {
    const group = normalizeOrgText(item?.group || item?.organizationType || item?.orgGroup);
    const name = normalizeOrgText(item?.name || item?.organizationName || item?.orgName);
    const code = normalizeOrgText(item?.code || item?.orgCode || item?.organizationCode).toUpperCase();
    const runCode = stripBudgetOrgRunCodeYear(item?.documentRunCode || item?.runCode || item?.organizationDocumentRunCode);
    const names = Array.from(new Set([
      name,
      ...Object.values(item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear || {})
        .map((value) => normalizeOrgText(value))
    ].filter(Boolean)));
    return { group, name, code, runCode, names };
  };

  const getBudgetOrgCatalogRows = () =>
    typeof orgFilters !== "undefined" && Array.isArray(orgFilters) ? orgFilters : [];

  const findBudgetOrgCatalogItemForRepresentative = (item = {}) => {
    const rows = getBudgetOrgCatalogRows().filter(shouldUseBudgetOrgItemForRepresentativeYear);
    if (!rows.length) return null;
    const orgType = normalizeOrgText(item.organizationType || item.orgGroup || item.group);
    const orgName = normalizeOrgText(item.organizationName || item.orgName || item.name);
    const orgId = normalizeOrgText(item.organizationId || item.organizationCatalogId || item.id);
    const baseId = normalizeOrgText(item.baseOrganizationId || item.baseOrgId || item.rootOrganizationId || getBudgetOrgBaseId(item));
    const orgCode = normalizeOrgText(item.organizationCode || item.orgCode || item.code).toUpperCase();
    const runCode = stripBudgetOrgRunCodeYear(item.organizationDocumentRunCode || item.documentRunCode || item.runCode);
    const typeKey = normalizeBudgetOrgMatchValue(orgType);
    const nameKey = normalizeBudgetOrgMatchValue(orgName);
    const codeKey = normalizeBudgetOrgMatchValue(orgCode);
    const runCodeKey = normalizeBudgetOrgMatchValue(runCode);
    const sameGroupRows = rows.filter((row) => normalizeBudgetOrgMatchValue(row.group || row.organizationType || row.orgGroup) === typeKey);
    const candidates = sameGroupRows.length ? sameGroupRows : rows;

    const byIdentity = candidates.find((row) => {
      const rowId = normalizeOrgText(row.id);
      const rowBaseId = getBudgetOrgBaseId(row);
      return (orgId && rowId === orgId) || (baseId && rowBaseId && rowBaseId === baseId);
    });
    if (byIdentity) return byIdentity;

    const byCode = candidates.find((row) => {
      const values = getBudgetOrgCatalogMatchValues(row);
      return (codeKey && normalizeBudgetOrgMatchValue(values.code) === codeKey) ||
        (runCodeKey && normalizeBudgetOrgMatchValue(values.runCode) === runCodeKey);
    });
    if (byCode) return byCode;

    return candidates.find((row) => {
      const values = getBudgetOrgCatalogMatchValues(row);
      return values.names.some((name) => normalizeBudgetOrgMatchValue(name) === nameKey);
    }) || null;
  };

  const getResolvedRepresentativeOrganization = (item = {}) => {
    const catalogItem = findBudgetOrgCatalogItemForRepresentative(item);
    if (!catalogItem) {
      return {
        organizationType: normalizeOrgText(item.organizationType || item.orgGroup || item.group),
        organizationName: normalizeOrgText(item.organizationName || item.orgName || item.name),
        organizationId: normalizeOrgText(item.organizationId || item.organizationCatalogId || item.id),
        baseOrganizationId: normalizeOrgText(item.baseOrganizationId || item.baseOrgId || item.rootOrganizationId || getBudgetOrgBaseId(item)),
        organizationCode: normalizeOrgText(item.organizationCode || item.orgCode || item.code).toUpperCase(),
        organizationDocumentRunCode: stripBudgetOrgRunCodeYear(item.organizationDocumentRunCode || item.documentRunCode || item.runCode)
      };
    }
    return {
      organizationType: normalizeOrgText(catalogItem.group || catalogItem.organizationType || catalogItem.orgGroup),
      organizationName: getBudgetOrgNameForRepresentativeYear(catalogItem),
      organizationId: normalizeOrgText(catalogItem.id),
      baseOrganizationId: getBudgetOrgBaseId(catalogItem),
      organizationCode: getBudgetOrgCodeForYear(catalogItem),
      organizationDocumentRunCode: stripBudgetOrgRunCodeYear(catalogItem.documentRunCode || catalogItem.runCode)
    };
  };

  const findBudgetOrgCatalogItemBySelection = (orgType = "", orgName = "") => {
    const typeKey = normalizeBudgetOrgMatchValue(orgType);
    const nameKey = normalizeBudgetOrgMatchValue(orgName);
    return getBudgetOrgCatalogRows()
      .filter(shouldUseBudgetOrgItemForRepresentativeYear)
      .find((item) =>
        normalizeBudgetOrgMatchValue(item?.group || item?.organizationType || item?.orgGroup) === typeKey &&
        normalizeBudgetOrgMatchValue(getBudgetOrgNameForRepresentativeYear(item)) === nameKey
      ) || null;
  };

  const findBudgetOrgCatalogItemByAnyName = (orgType = "", orgName = "") => {
    const typeKey = normalizeBudgetOrgMatchValue(orgType);
    const nameKey = normalizeBudgetOrgMatchValue(orgName);
    return getBudgetOrgCatalogRows()
      .filter(shouldUseBudgetOrgItemForRepresentativeYear)
      .find((item) => {
        if (normalizeBudgetOrgMatchValue(item?.group || item?.organizationType || item?.orgGroup) !== typeKey) return false;
        const values = getBudgetOrgCatalogMatchValues(item);
        return values.names.some((name) => normalizeBudgetOrgMatchValue(name) === nameKey);
      }) || null;
  };

  const isSameBudgetOrg = (left = {}, right = {}) => {
    const leftType = normalizeBudgetOrgMatchValue(left.organizationType);
    const rightType = normalizeBudgetOrgMatchValue(right.organizationType);
    if (!leftType || !rightType || leftType !== rightType) return false;

    const leftId = normalizeOrgText(left.organizationId);
    const rightId = normalizeOrgText(right.organizationId);
    if (leftId && rightId && leftId === rightId) return true;

    const leftBaseId = normalizeOrgText(left.baseOrganizationId);
    const rightBaseId = normalizeOrgText(right.baseOrganizationId);
    if (leftBaseId && rightBaseId && leftBaseId === rightBaseId) return true;

    const leftCode = normalizeBudgetOrgMatchValue(left.organizationCode);
    const rightCode = normalizeBudgetOrgMatchValue(right.organizationCode);
    if (leftCode && rightCode && leftCode === rightCode) return true;

    return normalizeBudgetOrgMatchValue(left.organizationName) === normalizeBudgetOrgMatchValue(right.organizationName);
  };

  const normalizeRoundName = (value) => (value || "").toString().trim().replace(/\s+/g, " ");

  const normalizeDeadlineTime = (value) => {
    const match = (value || "").toString().trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "";
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const toDateOnlyText = (value) => {
    const formatLocalDate = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) return formatLocalDate(value);
    if (typeof value?.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? formatLocalDate(date) : "";
    }
    if (typeof value?.toMillis === "function") {
      const date = new Date(value.toMillis());
      return Number.isNaN(date.getTime()) ? "" : formatLocalDate(date);
    }
    const text = value.toString().trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) return formatLocalDate(new Date(parsed));
    return text.length >= 10 ? text.slice(0, 10) : text;
  };

  const getRoundDeadlineDate = (round = {}) =>
    toDateOnlyText(
      round.deadline ||
      round.budgetRequestDeadline ||
      round.deadlineDate ||
      round.dueDate ||
      round.endDate ||
      round.closedAt ||
      round.deadlineAt
    );

  const readBudgetRoundYear = (item = {}) => {
    const direct = normalizeAcademicYearText(item.year || item.budgetRoundYear || item.academicYear);
    if (direct) return direct;
    const fromLabel = (
      item.label ||
      item.name ||
      item.title ||
      item.roundName ||
      item.currentBudgetRoundId ||
      item.budgetRoundId ||
      item.id ||
      ""
    ).toString().match(/25\d{2}/);
    return fromLabel ? normalizeAcademicYearText(fromLabel[0]) : "";
  };

  const readBudgetRoundNo = (item = {}) => {
    const direct = normalizeRoundName(item.roundNo || item.budgetRoundNo || item.roundName || item.name || item.title);
    if (direct) {
      return direct
        .replace(/^ปี\s*25\d{2}\s*/i, "")
        .replace(/\s*25\d{2}\s*$/i, "")
        .trim();
    }
    const label = (item.label || item.currentBudgetRoundId || item.budgetRoundId || item.id || "").toString();
    const match = label.match(/รอบ\s*(.+?)(?:\s*25\d{2})?$/i);
    return match ? normalizeRoundName(`รอบ ${match[1]}`) : "";
  };

  const getRoundDeadlineTime = (round = {}) => normalizeDeadlineTime(round.deadlineTime || round.budgetRequestDeadlineTime) || "23:59";

  const getRoundDeadlineTimestamp = (round = {}) => {
    const deadline = getRoundDeadlineDate(round);
    if (!deadline) return Number.NaN;
    return new Date(`${deadline}T${getRoundDeadlineTime(round)}:59`).getTime();
  };

  const formatRoundDeadlineDisplay = (round = {}) => {
    const dateText = formatDateDisplay(getRoundDeadlineDate(round));
    return dateText && dateText !== "-" ? `${dateText} เวลา ${getRoundDeadlineTime(round)} น.` : "-";
  };

  const formatBudgetDeadlineDisplay = (deadline = "", deadlineTime = "") => {
    const dateText = formatDateDisplay(deadline);
    const timeText = normalizeDeadlineTime(deadlineTime) || "23:59";
    return dateText && dateText !== "-" ? `${dateText} เวลา ${timeText} น.` : "ยังไม่กำหนด";
  };

  const buildBudgetRoundId = (year, roundNo) => {
    const y = normalizeAcademicYearText(year);
    const r = normalizeRoundName(roundNo);
    return y && r ? `${y}-${r}` : "";
  };

  const formatBudgetRoundLabel = (year, roundNo) => {
    const y = normalizeAcademicYearText(year);
    const r = normalizeRoundName(roundNo);
    return y && r ? `ปี ${y} รอบ ${r}` : "";
  };

  const getRequestRoundId = (item) => (item?.budgetRoundId || item?.currentBudgetRoundId || "").toString().trim();

  const getRequestRoundLabel = (item) => {
    const label = formatBudgetRoundLabel(item?.budgetRoundYear, item?.budgetRoundNo);
    return label || (getRequestRoundId(item) ? getRequestRoundId(item) : "ไม่ระบุรอบ");
  };

  const isCurrentBudgetRoundItem = (item) => {
    if (!currentBudgetRoundId) return true;
    return getRequestRoundId(item) === currentBudgetRoundId;
  };

  const normalizeBudgetActiveRounds = (value, fallback = {}) => {
    const rows = (Array.isArray(value) ? value : [])
      .map((item) => {
        const year = readBudgetRoundYear(item);
        const roundNo = readBudgetRoundNo(item);
        const deadline = getRoundDeadlineDate(item);
        const deadlineTime = normalizeDeadlineTime(item?.deadlineTime || item?.budgetRequestDeadlineTime) || "23:59";
        const id = (item?.id || buildBudgetRoundId(year, roundNo)).toString().trim();
        if (!id || !year || !roundNo || !deadline) return null;
        return { id, year, roundNo, deadline, deadlineTime, label: formatBudgetRoundLabel(year, roundNo) };
      })
      .filter(Boolean);
    if (rows.length) return rows;
    const year = readBudgetRoundYear(fallback);
    const roundNo = readBudgetRoundNo(fallback);
    const deadline = getRoundDeadlineDate(fallback);
    const deadlineTime = normalizeDeadlineTime(fallback.budgetRequestDeadlineTime) || "23:59";
    const id = (fallback.currentBudgetRoundId || buildBudgetRoundId(year, roundNo)).toString().trim();
    return id && year && roundNo && deadline
      ? [{ id, year, roundNo, deadline, deadlineTime, label: formatBudgetRoundLabel(year, roundNo) }]
      : [];
  };

  const getOpenBudgetRounds = () => activeBudgetRounds.filter((round) => {
    const endTime = getRoundDeadlineTimestamp(round);
    return Number.isFinite(endTime) && Date.now() <= endTime;
  });

  const isBudgetRoundClosed = (round) => {
    const endTime = getRoundDeadlineTimestamp(round);
    return Number.isFinite(endTime) && Date.now() > endTime;
  };

  const getClosedBudgetRounds = () => activeBudgetRounds.filter(isBudgetRoundClosed);

  const findActiveRoundById = (id = "") => activeBudgetRounds.find((round) => round.id === id);

  const findBudgetRoundById = (id = "") => activeBudgetRounds.find((round) => round.id === id);

  const isRequestRoundOpen = (item) => {
    const round = findActiveRoundById(getRequestRoundId(item));
    if (!round) return false;
    const endTime = getRoundDeadlineTimestamp(round);
    return Number.isFinite(endTime) && Date.now() <= endTime;
  };

  const getApprovedRepresentativeOptions = () => {
    return Array.isArray(currentApprovedRepresentatives)
      ? currentApprovedRepresentatives
        .filter((item) => isCurrentRepresentativeAcademicYear(item))
        .map((item) => {
          const org = getResolvedRepresentativeOrganization(item);
          return {
            id: (item.id || "").toString(),
            organizationType: normalizeOrgText(org.organizationType),
            organizationName: normalizeOrgText(org.organizationName),
            organizationId: normalizeOrgText(org.organizationId),
            baseOrganizationId: normalizeOrgText(org.baseOrganizationId),
            organizationCode: normalizeOrgText(org.organizationCode).toUpperCase(),
            organizationDocumentRunCode: normalizeOrgText(org.organizationDocumentRunCode),
            representativeRole: normalizeOrgText(item.representativeRole),
            academicYear: getRepresentativeAcademicYear(item)
          };
        })
        .filter((item) => item.organizationType && item.organizationName)
      : [];
  };

  const findApprovedRepresentativeForOrg = (orgType, orgName) => {
    const type = normalizeOrgText(orgType);
    const name = normalizeOrgText(orgName);
    if (!type || !name) return null;
    const targetCatalogItem = findBudgetOrgCatalogItemBySelection(type, name) || findBudgetOrgCatalogItemByAnyName(type, name);
    const targetOrg = targetCatalogItem
      ? getResolvedRepresentativeOrganization(targetCatalogItem)
      : { organizationType: type, organizationName: name };
    return getApprovedRepresentativeOptions().find((item) =>
      isSameBudgetOrg(item, targetOrg)
    ) || null;
  };

  const hasApprovedRepresentativeForRequest = (item) => {
    return !!findApprovedRepresentativeForOrg(item?.organizationType, item?.organizationName);
  };

  const getPrimaryApprovedRepresentative = () => {
    const options = getApprovedRepresentativeOptions();
    if (!options.length) return null;
    // Snapshot query is ordered by createdAt desc, so the first approved item is the latest effective representative.
    return options[0];
  };

  const findActiveRepresentativeApplication = () => {
    if (!Array.isArray(currentRepresentativeApplications)) return null;
    return currentRepresentativeApplications.find((item) => {
      const status = (item.status || "pending").toString().trim().toLowerCase();
      return (status === "pending" || status === "approved") &&
        isRepresentativeApplicationAcademicYear(item);
    }) || null;
  };

  const getActiveRepresentativeApplicationMessage = (item) => {
    const status = (item?.status || "pending").toString().trim().toLowerCase();
    if (status === "approved") {
      return "บัญชีนี้ได้รับอนุมัติเป็นตัวแทนองค์กรแล้ว ไม่สามารถสมัครเพิ่มได้";
    }
    return "บัญชีนี้มีคำขอตัวแทนองค์กรที่รออนุมัติอยู่แล้ว กรุณารอผลก่อนสมัครใหม่";
  };

  const setDisplayText = (el, value) => {
    if (!el) return;
    const text = (value || "").toString().trim();
    el.textContent = text || "ยังไม่มีสิทธิ์ตัวแทนที่อนุมัติ";
    el.classList.toggle("is-empty", !text);
  };

  const parseMoneyInputValue = (value) => {
    const normalized = (value || "").toString().trim().replaceAll(",", "");
    if (!normalized) return 0;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : Number.NaN;
  };

  const toBudgetAmount = (value) => {
    const num = parseMoneyInputValue(value);
    return Number.isFinite(num) ? num : 0;
  };

  const getCurrentRepresentativeOrgType = () =>
    normalizeOrgText(getPrimaryApprovedRepresentative()?.organizationType);

  const isSameRepresentativeOrgType = (item) =>
    normalizeOrgText(item?.organizationType) === getCurrentRepresentativeOrgType();

  const getBudgetRoundLabelById = (roundId = "") => {
    const id = normalizeOrgText(roundId);
    if (!id) return "ไม่ระบุรอบ";
    const round = findBudgetRoundById(id);
    return round?.label || id;
  };

  const getOrgTotalsClosedRoundOptions = () => {
    const options = new Map();
    getClosedBudgetRounds().forEach((round) => {
      options.set(round.id, {
        id: round.id,
        label: round.label || round.id,
        deadline: round.deadline || "",
        source: "settings"
      });
    });
    return Array.from(options.values()).sort((a, b) => {
      const timeA = Date.parse(`${a.deadline || ""}T00:00:00`) || 0;
      const timeB = Date.parse(`${b.deadline || ""}T00:00:00`) || 0;
      if (timeA !== timeB) return timeB - timeA;
      return a.label.localeCompare(b.label, "th");
    });
  };

  const updateBudgetOrgSummary = () => {
    const representative = getPrimaryApprovedRepresentative();
    const orgType = normalizeOrgText(representative?.organizationType);
    const orgName = normalizeOrgText(representative?.organizationName);
    const rows = Array.isArray(latestMyBudgetRequests) ? latestMyBudgetRequests : [];
    const matchedRows = orgType && orgName
      ? rows.filter((item) =>
        findApprovedRepresentativeForOrg(item.organizationType, item.organizationName)?.id === representative.id
      )
      : [];
    const totalExpense = matchedRows.reduce((sum, item) => sum + toBudgetAmount(item.estimatedExpense), 0);
    const approvedExpense = matchedRows.reduce((sum, item) => sum + toBudgetAmount(item.approvedAmount), 0);
    if (orgSummaryProjectCountEl) orgSummaryProjectCountEl.textContent = String(matchedRows.length);
    if (orgSummaryTotalExpenseEl) orgSummaryTotalExpenseEl.textContent = `${formatCurrency(totalExpense)} บาท`;
    if (orgSummaryApprovedExpenseEl) orgSummaryApprovedExpenseEl.textContent = `${formatCurrency(approvedExpense)} บาท`;
    if (orgSummaryCaptionEl) {
      orgSummaryCaptionEl.textContent = orgType && orgName
        ? `สรุปรายการของ ${orgName} / ${orgType} ตามสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว`
        : "ยังไม่มีสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว";
    }
  };

  const syncBudgetOrgDisplay = () => {
    const representative = getPrimaryApprovedRepresentative();
    setDisplayText(orgTypeDisplayEl, representative?.organizationType || "");
    setDisplayText(orgDeptDisplayEl, representative?.organizationName || "");
    updateBudgetOrgSummary();
    syncBudgetRequestFormAccess();
  };

  const populateBudgetOrgTypeOptions = () => {
    const previousValue = orgTypeEl.value;
    while (orgTypeEl.options.length) {
      orgTypeEl.remove(0);
    }
    const representativeOptions = getApprovedRepresentativeOptions();
    const primaryRepresentative = getPrimaryApprovedRepresentative();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = representativeOptions.length
      ? "ระบบล็อกตามสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว"
      : "ยังไม่มีองค์กรที่ได้รับอนุมัติให้เป็นตัวแทน";
    placeholder.disabled = true;
    placeholder.selected = true;
    orgTypeEl.appendChild(placeholder);

    if (primaryRepresentative?.organizationType) {
      const option = document.createElement("option");
      option.value = primaryRepresentative.organizationType;
      option.textContent = primaryRepresentative.organizationType;
      orgTypeEl.appendChild(option);
      orgTypeEl.value = primaryRepresentative.organizationType;
    } else if (previousValue) {
      const hasCurrent = Array.from(orgTypeEl.options).some((opt) => opt.value === previousValue);
      if (hasCurrent) orgTypeEl.value = previousValue;
    }
    orgTypeEl.disabled = true;
    syncBudgetOrgDisplay();
  };

  const populateBudgetOrgDeptOptions = () => {
    const currentValue = orgDeptEl.value;
    const primaryRepresentative = getPrimaryApprovedRepresentative();
    const selectedType = primaryRepresentative?.organizationType || "";

    while (orgDeptEl.options.length) {
      orgDeptEl.remove(0);
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = selectedType ? "เลือกฝ่าย / ชมรม" : "เลือกประเภทองค์กรก่อน";
    orgDeptEl.appendChild(placeholder);

    if (selectedType) {
      const organizationName = (primaryRepresentative?.organizationName || "").toString().trim();
      if (organizationName) {
        const option = document.createElement("option");
        option.value = organizationName;
        option.textContent = organizationName;
        orgDeptEl.appendChild(option);
        orgDeptEl.value = organizationName;
      } else if (currentValue) {
        const hasCurrent = Array.from(orgDeptEl.options).some((opt) => opt.value === currentValue);
        if (hasCurrent) orgDeptEl.value = currentValue;
      }
    }
    orgDeptEl.disabled = true;
    syncBudgetOrgDisplay();
  };

  const getBudgetOrgTypeValueForSubmit = () => {
    return (orgTypeEl.value || "").toString().trim();
  };

  const getBudgetOrgDeptValueForSubmit = () => {
    return (orgDeptEl.value || "").toString().trim();
  };

  const ensureBudgetOrgOptionDataLoaded = async () => {
    if (typeof loadOrgFilters === "function") {
      try {
        await loadOrgFilters();
      } catch (_) {
        // ignore and fallback
      }
    }
    if (typeof ensureProjectDataLoaded === "function") {
      try {
        await ensureProjectDataLoaded();
      } catch (_) {
        // ignore and fallback
      }
    }
  };

  const setFormMessage = (text = "", color = "#374151") => {
    messageEl.textContent = text;
    messageEl.style.color = color;
  };

  const syncBudgetRequestFormAccess = () => {
    if (isBudgetRequestClosed) {
      setFormMessage(getBudgetRequestClosedMessage("สามารถดูผลได้เท่านั้น"), "#b91c1c");
      setFormEnabled(false);
      return;
    }
    if (!getOpenBudgetRounds().length) {
      setFormMessage(NO_OPEN_BUDGET_ROUNDS_MESSAGE, "#b45309");
      setFormEnabled(false);
      return;
    }
    const hasRepresentative = !!getPrimaryApprovedRepresentative();
    setFormEnabled(hasRepresentative);
    if (!representativeApplicationsLoaded && messageEl.textContent.trim() === NO_OPEN_BUDGET_ROUNDS_MESSAGE) {
      setFormMessage("");
      return;
    }
    if (!hasRepresentative && representativeApplicationsLoaded) {
      setFormMessage(NO_APPROVED_REPRESENTATIVE_MESSAGE, "#b91c1c");
      return;
    }
    if (
      hasRepresentative &&
      [NO_OPEN_BUDGET_ROUNDS_MESSAGE, NO_APPROVED_REPRESENTATIVE_MESSAGE].includes(messageEl.textContent.trim())
    ) {
      setFormMessage("");
    }
  };

  const getBudgetRequestClosedMessage = (suffix = "") => {
    const deadlineText = budgetRequestDeadline
      ? ` (${formatBudgetDeadlineDisplay(budgetRequestDeadline, budgetRequestDeadlineTime)})`
      : "";
    return `หมดเขตรับคำของบแล้ว${deadlineText}${suffix ? ` ${suffix}` : ""}`;
  };

  const setBudgetRequestCloseState = (settings = "") => {
    const data = typeof settings === "object" && settings ? settings : { budgetRequestDeadline: settings };
    budgetRequestDeadline = (data.budgetRequestDeadline || "").toString().trim();
    budgetRequestDeadlineTime = normalizeDeadlineTime(data.budgetRequestDeadlineTime) || "23:59";
    budgetRoundYear = normalizeAcademicYearText(data.budgetRoundYear);
    representativeApplicationYear = normalizeAcademicYearText(
      data.organizationRepresentativeAcademicYear ||
      data.orgRepresentativeAcademicYear ||
      data.representativeAcademicYear ||
      data.representativeApplicationYear
    );
    budgetRoundNo = normalizeRoundName(data.budgetRoundNo);
    currentBudgetRoundId = (data.currentBudgetRoundId || buildBudgetRoundId(budgetRoundYear, budgetRoundNo)).toString().trim();
    activeBudgetRounds = normalizeBudgetActiveRounds(data.budgetActiveRounds, data);
    populateOrgTotalsRoundOptions();
    updateRepresentativeAcademicYearDisplay();
    populateRepresentativeOrgTypeOptions();
    populateRepresentativeOrgDeptOptions();
    const openRounds = getOpenBudgetRounds();
    const selectedRoundId = requestRoundSelectEl.value;
    requestRoundSelectEl.innerHTML = "";
    if (!openRounds.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "ยังไม่มีรอบที่เปิดรับ";
      opt.disabled = true;
      opt.selected = true;
      requestRoundSelectEl.appendChild(opt);
    } else {
      openRounds.forEach((round) => {
        const opt = document.createElement("option");
        opt.value = round.id;
        opt.textContent = `${round.label} (ถึง ${formatRoundDeadlineDisplay(round)})`;
        requestRoundSelectEl.appendChild(opt);
      });
      requestRoundSelectEl.value = openRounds.some((round) => round.id === selectedRoundId)
        ? selectedRoundId
        : openRounds[0].id;
    }
    const roundLabel = openRounds.length === 1
      ? openRounds[0].label
      : openRounds.length
        ? `เปิด ${openRounds.length} รอบ`
        : "";
    if (requestRoundDisplayEl) {
      requestRoundDisplayEl.textContent = roundLabel || "ยังไม่กำหนด";
      requestRoundDisplayEl.classList.toggle("is-empty", !roundLabel);
    }
    if (requestRoundCaptionEl) {
      requestRoundCaptionEl.textContent = roundLabel
        ? (openRounds.length > 1 ? "เลือกหนึ่งรอบในแบบฟอร์มก่อนส่งคำขอ" : `คำขอใหม่จะถูกบันทึกใน${roundLabel}`)
        : "ยังไม่กำหนดรอบรับคำขอ";
      requestRoundCaptionEl.style.color = roundLabel ? "#047857" : "#b45309";
    }
    if (requestDeadlineDisplayEl) {
      requestDeadlineDisplayEl.textContent = budgetRequestDeadline
        ? formatBudgetDeadlineDisplay(budgetRequestDeadline, budgetRequestDeadlineTime)
        : "ยังไม่กำหนด";
      requestDeadlineDisplayEl.classList.toggle("is-empty", !budgetRequestDeadline);
    }
    isBudgetRequestClosed = activeBudgetRounds.length > 0 && !openRounds.length;
    if (!budgetRequestDeadline) {
      if (requestDeadlineCaptionEl) {
        requestDeadlineCaptionEl.textContent = openRounds.length
          ? `ยังเปิดรับคำของบอยู่ ${openRounds.length} รอบ`
          : "ยังไม่กำหนดรอบและวันสิ้นสุดการเปิดรับคำของบ";
        requestDeadlineCaptionEl.style.color = openRounds.length ? "#047857" : "#b45309";
      }
      return;
    }
    if (requestDeadlineCaptionEl) {
      const totalRounds = activeBudgetRounds.length;
      requestDeadlineCaptionEl.textContent = isBudgetRequestClosed
        ? (totalRounds > 1 ? `ปิดรับคำของบแล้วทั้ง ${totalRounds} รอบ` : "ปิดรับคำของบแล้ว")
        : `ยังเปิดรับคำของบอยู่ ${openRounds.length} รอบ`;
      requestDeadlineCaptionEl.style.color = isBudgetRequestClosed ? "#b91c1c" : "#047857";
    }
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");

  const formatDateDisplay = (value) => {
    const dateText = (value || "").toString().trim();
    if (!dateText) return "-";
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateText;
    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatTimestampDisplay = (value) => {
    if (!value) return "-";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const timestampMillis = (value) => {
    if (!value) return 0;
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  };

  const parseAcademicReferenceDate = (value) => {
    if (!value) return new Date();
    const source = value && typeof value === "object" && value.date !== undefined ? value.date : value;
    const date = typeof source?.toDate === "function" ? source.toDate() : new Date(source);
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  };

  const getCurrentAcademicYearBE = (referenceValue = new Date()) => {
    const referenceDate = parseAcademicReferenceDate(referenceValue) || new Date();
    const yearCE = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    return (month >= 6 ? yearCE : yearCE - 1) + 543;
  };

  const getAcademicYearFromTimestamp = (value) => {
    if (!value) return "";
    const date = parseAcademicReferenceDate(value);
    if (!date) return "";
    const yearCE = date.getFullYear();
    const month = date.getMonth() + 1;
    return String((month >= 6 ? yearCE : yearCE - 1) + 543);
  };

  const getRepresentativeAcademicYear = (item = {}) => {
    const explicit = (item.academicYear || item.representativeAcademicYear || item.schoolYear || "").toString().trim();
    if (/^\d{4}$/.test(explicit)) return explicit;
    return getAcademicYearFromTimestamp(item.createdAt || item.reviewedAt || item.updatedAt) || String(getCurrentAcademicYearBE());
  };

  const isCurrentRepresentativeAcademicYear = (item = {}) =>
    getRepresentativeAcademicYear(item) === String(getCurrentAcademicYearBE());

  const deriveStudentYearFromId = (studentId, referenceValue = new Date()) => {
    const digits = (studentId || "").toString().trim().replace(/\D/g, "");
    if (!/^\d{10}$/.test(digits)) return "";
    const entryPrefix = Number(digits.slice(0, 2));
    const entryAcademicBE = Number.isFinite(entryPrefix) ? 2500 + entryPrefix : NaN;
    const referenceAcademicBE = getCurrentAcademicYearBE(referenceValue);
    const yearLevel = Number.isFinite(entryAcademicBE)
      ? referenceAcademicBE - entryAcademicBE + 1
      : NaN;
    return isAlumniChulaEmail(referenceValue?.email || referenceValue?.authEmail)
      ? "นิสิตเก่า"
      : Number.isFinite(yearLevel) && yearLevel >= 1 && yearLevel <= 8 ? String(yearLevel) : "";
  };

  const normalizeProfileAcademicSnapshot = (profile = {}, referenceValue = new Date()) => {
    const safeProfile = profile && typeof profile === "object" ? profile : {};
    const studentId = (safeProfile.studentId || "").toString().trim();
    const email = (safeProfile.authEmail || safeProfile.email || readCurrentUserEmail()).toString().trim().toLowerCase();
    return {
      ...safeProfile,
      year: deriveStudentYearFromId(studentId, { date: referenceValue, email }) || (safeProfile.year || "").toString()
    };
  };

  const isRepresentativeApplicationAcademicYear = (item = {}) =>
    getRepresentativeAcademicYear(item) === getRepresentativeApplicationAcademicYear();

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "-";
    return num.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const ensureBudgetRequestDeleteModal = () => {
    let modalEl = document.getElementById("budgetRequestDeleteConfirmModal");
    if (modalEl) return modalEl;
    if (!document.body) return null;
    document.body.insertAdjacentHTML("beforeend", `
      <div
        id="budgetRequestDeleteConfirmModal"
        class="modal budget-request-delete-modal"
        aria-hidden="true"
        aria-modal="true"
        role="dialog"
        aria-labelledby="budgetRequestDeleteConfirmTitle"
      >
        <div class="modal-dialog budget-round-delete-dialog budget-request-delete-dialog">
          <div class="modal-header">
            <div>
              <div id="budgetRequestDeleteConfirmTitle" class="modal-title">ยืนยันการลบรายการคำของบ</div>
              <div class="modal-subtitle">รายการนี้จะถูกลบออกจากระบบ ไม่ใช่แค่เปลี่ยนสถานะ</div>
            </div>
            <button id="budgetRequestDeleteConfirmClose" class="modal-close" type="button" aria-label="ปิด">×</button>
          </div>
          <div class="modal-body budget-round-delete-body">
            <div class="budget-round-delete-warning">
              <div>
                <div id="budgetRequestDeleteConfirmName" class="budget-round-delete-name">-</div>
                <div id="budgetRequestDeleteConfirmSummary" class="budget-round-delete-summary">-</div>
              </div>
            </div>
            <div class="budget-round-delete-step-text">
              หลังยืนยันแล้ว ข้อมูลรายการคำของบนี้จะถูกลบจาก Firebase และจะไม่แสดงในตารางคำขอขององค์กร
            </div>
          </div>
          <div class="modal-actions budget-round-delete-actions">
            <button id="budgetRequestDeleteConfirmCancel" class="btn-ghost" type="button">ยกเลิก</button>
            <button id="budgetRequestDeleteConfirmSubmit" class="btn-primary budget-round-delete-confirm" type="button">ลบรายการ</button>
          </div>
        </div>
      </div>
    `);
    return document.getElementById("budgetRequestDeleteConfirmModal");
  };

  const askBudgetRequestDeleteConfirm = (item = {}) => {
    const modalEl = ensureBudgetRequestDeleteModal();
    if (!modalEl) {
      return Promise.resolve(window.confirm(`ยืนยันลบรายการงบ "${item.projectName || "-"}" ?\nรายการนี้จะถูกลบออกจากระบบ`));
    }
    const nameEl = document.getElementById("budgetRequestDeleteConfirmName");
    const summaryEl = document.getElementById("budgetRequestDeleteConfirmSummary");
    const closeBtnEl = document.getElementById("budgetRequestDeleteConfirmClose");
    const cancelBtnEl = document.getElementById("budgetRequestDeleteConfirmCancel");
    const submitBtnEl = document.getElementById("budgetRequestDeleteConfirmSubmit");
    if (nameEl) nameEl.textContent = item.projectName || "-";
    if (summaryEl) {
      summaryEl.textContent = [
        getRequestRoundLabel(item),
        item.organizationName || "-",
        `ยอดขอ ${formatCurrency(item.estimatedExpense || 0)} บาท`
      ].filter(Boolean).join(" • ");
    }

    return new Promise((resolve) => {
      const cleanup = () => {
        closeBtnEl?.removeEventListener("click", onCancel);
        cancelBtnEl?.removeEventListener("click", onCancel);
        submitBtnEl?.removeEventListener("click", onSubmit);
        modalEl.removeEventListener("click", onBackdrop);
        modalEl.removeEventListener("keydown", onKeydown);
      };
      const close = (value) => {
        cleanup();
        if (typeof closeDialog === "function") {
          closeDialog(modalEl);
        } else {
          modalEl.classList.remove("show");
          modalEl.setAttribute("aria-hidden", "true");
        }
        resolve(value);
      };
      const onCancel = () => close(false);
      const onSubmit = () => close(true);
      const onBackdrop = (event) => {
        if (event.target === modalEl) close(false);
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
        }
      };
      closeBtnEl?.addEventListener("click", onCancel);
      cancelBtnEl?.addEventListener("click", onCancel);
      submitBtnEl?.addEventListener("click", onSubmit);
      modalEl.addEventListener("click", onBackdrop);
      modalEl.addEventListener("keydown", onKeydown);
      if (typeof openDialog === "function") {
        openDialog(modalEl, { focusSelector: "#budgetRequestDeleteConfirmCancel" });
      } else {
        modalEl.classList.add("show");
        modalEl.setAttribute("aria-hidden", "false");
        cancelBtnEl?.focus?.();
      }
    });
  };

  const formatMoneyInputValue = (value) => {
    const normalized = (value || "").toString().trim().replaceAll(",", "");
    if (!normalized) return "";
    const num = Number(normalized);
    if (!Number.isFinite(num)) return normalized;
    return formatCurrency(num);
  };

  const setupMoneyInputFormatting = (inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener("focus", () => {
      inputEl.value = (inputEl.value || "").toString().replaceAll(",", "");
    });
    inputEl.addEventListener("blur", () => {
      inputEl.value = formatMoneyInputValue(inputEl.value);
    });
  };

  const updateBudgetDescriptionCounter = () => {
    if (descriptionCounterEl) {
      descriptionCounterEl.textContent = `${descriptionEl.value.length}/3000`;
    }
  };

  const statusBadgeHtml = (status) => {
    const normalized = (status || "pending").toString().trim().toLowerCase();
    if (normalized === "reviewing") {
      return '<span class="badge badge-reviewing">กำลังพิจารณา</span>';
    }
    if (normalized === "approved") {
      return '<span class="badge badge-approved">ผ่านที่ประชุมนายกหรืออนุกรรมการ</span>';
    }
    if (normalized === "rejected") {
      return '<span class="badge badge-rejected">ไม่อนุมัติ</span>';
    }
    if (normalized === "cancelled") {
      return '<span class="badge badge-warning">ยกเลิกหรือเลื่อนไปผ่านครั้งอื่น</span>';
    }
    return '<span class="badge badge-pending">รออนุมัติ</span>';
  };

  const representativeStatusBadgeHtml = (status) => {
    const normalized = (status || "pending").toString().trim().toLowerCase();
    if (normalized === "approved") {
      return '<span class="badge badge-approved">อนุมัติแล้ว</span>';
    }
    if (normalized === "rejected") {
      return '<span class="badge badge-rejected">ไม่อนุมัติ</span>';
    }
    if (normalized === "cancelled") {
      return '<span class="badge badge-warning">ยกเลิก</span>';
    }
    return '<span class="badge badge-pending">รออนุมัติ</span>';
  };

  const statusText = (status) => {
    const normalized = (status || "pending").toString().trim().toLowerCase();
    if (normalized === "reviewing") return "กำลังพิจารณา";
    if (normalized === "approved") return "ผ่านที่ประชุมนายกหรืออนุกรรมการ";
    if (normalized === "rejected") return "ไม่อนุมัติ";
    if (normalized === "cancelled") return "ยกเลิกหรือเลื่อนไปผ่านครั้งอื่น";
    return "รออนุมัติ";
  };

  const exportMyBudgetRequestsCsv = () => {
    const rows = (Array.isArray(latestMyBudgetRequests) ? latestMyBudgetRequests : []).map((item) => ({
      "รหัสโครงการ": item.projectCodeGenerated || "",
      "รอบรับคำขอ": getRequestRoundLabel(item),
      "ประเภทองค์กร": item.organizationType || "",
      "ฝ่าย / ชมรม": item.organizationName || "",
      "ชื่อโครงการ": item.projectName || "",
      "สถานที่": item.activityLocation || "",
      "วันเริ่มเตรียมงาน": item.prepStartDate || "",
      "วันสุดท้ายปฏิบัติงาน": item.operationEndDate || "",
      "นิสิตผู้ปฏิบัติงาน": item.studentOperators || "",
      "นิสิตผู้เข้าร่วม": item.studentParticipants || "",
      "ยอดขอ": Number(item.estimatedExpense || 0),
      "ยอดอนุมัติ": Number(item.approvedAmount || 0),
      "สถานะ": statusText(item.status),
      "คำอธิบาย": item.projectDescription || item.description || ""
    }));
    window.sgcuCsvExport?.download({
      fileName: "budget-approval-requests",
      headers: [
        "รหัสโครงการ",
        "รอบรับคำขอ",
        "ประเภทองค์กร",
        "ฝ่าย / ชมรม",
        "ชื่อโครงการ",
        "สถานที่",
        "วันเริ่มเตรียมงาน",
        "วันสุดท้ายปฏิบัติงาน",
        "นิสิตผู้ปฏิบัติงาน",
        "นิสิตผู้เข้าร่วม",
        "ยอดขอ",
        "ยอดอนุมัติ",
        "สถานะ",
        "คำอธิบาย"
      ],
      rows
    });
  };

  const setRepresentativeMessage = (text = "", color = "#374151") => {
    if (!representativeMessageEl) return;
    representativeMessageEl.textContent = text;
    representativeMessageEl.style.color = color;
  };

  const setRepresentativeApplicationMessage = (text = "", color = "#374151") => {
    if (!representativeApplicationMessageEl) return;
    representativeApplicationMessageEl.textContent = text;
    representativeApplicationMessageEl.style.color = color;
  };

  const renderRepresentativeRows = (rows) => {
    if (!representativeApplicationsBodyEl) return;
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) {
      representativeApplicationsBodyEl.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; color:#6b7280;">ยังไม่มีคำขอสมัครเป็นตัวแทนองค์กร</td>
        </tr>
      `;
      if (representativeStatusCaptionEl) {
        representativeStatusCaptionEl.textContent = "ยังไม่มีสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว";
      }
      setRepresentativeMessage("สมัครเป็นตัวแทนองค์กรเพื่อให้ระบบผูกบัญชีกับชมรมหรือองค์กรก่อนยื่นคำขอ", "#6b7280");
      return;
    }

    representativeApplicationsBodyEl.innerHTML = items.map((item) => {
      const org = getResolvedRepresentativeOrganization(item);
      const orgType = escapeHtml(org.organizationType || "-");
      const orgName = escapeHtml(org.organizationName || "-");
      const role = escapeHtml(item.representativeRole || "-");
      const academicYear = escapeHtml(getRepresentativeAcademicYear(item));
      return `
        <tr>
          <td data-label="เวลายื่นคำขอ"><span class="budget-representative-history-value">${formatTimestampDisplay(item.createdAt)}</span></td>
          <td data-label="องค์กร"><span class="budget-representative-history-value">${orgName}<br><span class="section-text-sm">${orgType} · ปีการศึกษา ${academicYear}</span></span></td>
          <td data-label="ตำแหน่ง"><span class="budget-representative-history-value">${role}</span></td>
          <td data-label="สถานะ"><span class="budget-representative-history-value">${representativeStatusBadgeHtml(item.status)}</span></td>
        </tr>
      `;
    }).join("");

    const approvedCount = items.filter((item) =>
      (item.status || "").toString().trim().toLowerCase() === "approved" &&
      isCurrentRepresentativeAcademicYear(item)
    ).length;
    const activeApplication = findActiveRepresentativeApplication();
    if (representativeStatusCaptionEl) {
      representativeStatusCaptionEl.textContent = approvedCount
        ? `มีสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว ${approvedCount} รายการ`
        : `มีคำขอรอพิจารณา ${items.filter((item) => (item.status || "pending").toString().trim().toLowerCase() === "pending").length} รายการ`;
    }
    setRepresentativeMessage(
      activeApplication
        ? getActiveRepresentativeApplicationMessage(activeApplication)
        : "คำขอที่ยังไม่อนุมัติจะยังไม่ถูกใช้เป็นสิทธิ์หลักในแบบฟอร์มของบ",
      activeApplication ? "#047857" : "#6b7280"
    );
  };

  const populateRepresentativeOrgTypeOptions = () => {
    if (!representativeOrgTypeEl) return;
    updateRepresentativeAcademicYearDisplay();
    const currentValue = representativeOrgTypeEl.value;
    while (representativeOrgTypeEl.options.length) {
      representativeOrgTypeEl.remove(0);
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "เลือกประเภทองค์กร";
    placeholder.disabled = true;
    placeholder.selected = true;
    representativeOrgTypeEl.appendChild(placeholder);

    collectRepresentativeOrgTypeOptions().forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      representativeOrgTypeEl.appendChild(option);
    });

    if (currentValue && Array.from(representativeOrgTypeEl.options).some((opt) => opt.value === currentValue)) {
      representativeOrgTypeEl.value = currentValue;
    }
  };

  const populateRepresentativeOrgDeptOptions = () => {
    if (!representativeOrgTypeEl || !representativeOrgDeptEl) return;
    updateRepresentativeAcademicYearDisplay();
    const selectedType = normalizeOrgText(representativeOrgTypeEl.value);
    const currentValue = representativeOrgDeptEl.value;
    while (representativeOrgDeptEl.options.length) {
      representativeOrgDeptEl.remove(0);
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = selectedType ? "เลือกฝ่าย / ชมรม" : "เลือกประเภทองค์กรก่อน";
    representativeOrgDeptEl.appendChild(placeholder);

    if (selectedType) {
      collectRepresentativeOrgNameOptions(selectedType).forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        representativeOrgDeptEl.appendChild(option);
      });
    }
    representativeOrgDeptEl.disabled = !selectedType;
    if (currentValue && Array.from(representativeOrgDeptEl.options).some((opt) => opt.value === currentValue)) {
      representativeOrgDeptEl.value = currentValue;
    }
  };

  const openRepresentativeModal = () => {
    if (!representativeModalEl) return;
    populateRepresentativeOrgTypeOptions();
    populateRepresentativeOrgDeptOptions();
    const activeApplication = findActiveRepresentativeApplication();
    if (!representativeApplicationsLoaded) {
      setRepresentativeApplicationMessage("กำลังตรวจสอบสิทธิ์ตัวแทนองค์กร กรุณารอสักครู่", "#b45309");
    } else if (activeApplication) {
      setRepresentativeApplicationMessage(getActiveRepresentativeApplicationMessage(activeApplication), "#b91c1c");
    } else {
      setRepresentativeApplicationMessage("");
    }
    void ensureBudgetOrgOptionDataLoaded().finally(() => {
      populateRepresentativeOrgTypeOptions();
      populateRepresentativeOrgDeptOptions();
    });
    if (typeof openDialog === "function") {
      openDialog(representativeModalEl, { focusSelector: "#budgetRepresentativeOrgType" });
      return;
    }
    representativeModalEl.classList.add("show");
    representativeModalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-modal");
  };

  const closeRepresentativeModal = () => {
    if (!representativeModalEl) return;
    if (typeof closeDialog === "function") {
      closeDialog(representativeModalEl);
      return;
    }
    representativeModalEl.classList.remove("show");
    representativeModalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-modal");
  };

  const readCurrentUserEmail = () =>
    (window.sgcuAuth?.auth?.currentUser?.email || "").toString().trim().toLowerCase();

  const readCurrentAccountEmail = () => normalizeAccountEmail(readCurrentUserEmail());

  const renderMyRequestsRows = (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const representativeOptions = getApprovedRepresentativeOptions();
    const items = representativeOptions.length
      ? sourceRows.filter((item) => hasApprovedRepresentativeForRequest(item))
      : [];
    latestMyBudgetRequests = items;
    if (latestOrgBudgetTotalsSource === "fallback") {
      latestOrgBudgetRows = sourceRows.filter(isSameRepresentativeOrgType);
      renderOrgBudgetTotals(latestOrgBudgetRows, "fallback");
    }
    if (!representativeOptions.length) {
      myRequestsTableBodyEl.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#6b7280;">ยังไม่มีสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว จึงยังไม่สามารถดูรายการคำของบขององค์กรได้</td>
        </tr>
      `;
      myRequestsCaptionEl.textContent = representativeApplicationsLoaded
        ? "ต้องมีสิทธิ์ตัวแทนองค์กรก่อน"
        : "กำลังตรวจสอบสิทธิ์ตัวแทนองค์กร...";
      updateBudgetOrgSummary();
      return;
    }
    if (!items.length) {
      myRequestsTableBodyEl.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#6b7280;">ยังไม่มีรายการคำขออนุมัติงบประมาณ</td>
        </tr>
      `;
      myRequestsCaptionEl.textContent = "ยังไม่มีรายการ";
      updateBudgetOrgSummary();
      return;
    }

    myRequestsTableBodyEl.innerHTML = items.map((item) => {
      const orgName = escapeHtml(item.organizationName || "-");
      const projectName = escapeHtml(item.projectName || "-");
      const projectCode = escapeHtml(item.projectCodeGenerated || "-");
      const status = (item.status || "pending").toString().trim().toLowerCase();
      const requestedAmount = Number(item.estimatedExpense || 0);
      const approvedAmount = Number(item.approvedAmount || 0);
      const approvedText = (status === "pending" || status === "reviewing") && !approvedAmount ? "-" : formatCurrency(approvedAmount);
      const roundLabel = getRequestRoundLabel(item);
      const canEdit = status === "pending" && getOpenBudgetRounds().length > 0;
      const rowEditAttrs = canEdit
        ? ` data-budget-edit-id="${escapeHtml(item.id || "")}" tabindex="0" title="คลิกเพื่อแก้ไขรายการ"`
        : "";
      return `
        <tr class="budget-request-history-row${canEdit ? " is-editable" : ""}"${rowEditAttrs}>
          <td style="text-align:center;" data-label="รหัสโครงการ"><code class="budget-request-project-code">${projectCode}</code></td>
          <td style="text-align:left;" data-label="รายการโครงการ">
            <div class="budget-request-history-project-name">${projectName}</div>
            <div class="section-text-sm budget-request-history-project-meta">${orgName} • ${escapeHtml(roundLabel)}</div>
          </td>
          <td style="text-align:right;" data-label="ยอดขอ">${formatCurrency(requestedAmount)}</td>
          <td style="text-align:right;" data-label="ยอดอนุมัติ">${approvedText}</td>
          <td style="text-align:center;" data-label="สถานะ">${statusBadgeHtml(item.status)}</td>
        </tr>
      `;
    }).join("");
    myRequestsCaptionEl.textContent = `แสดง ${items.length} รายการ`;
    updateBudgetOrgSummary();
  };

  const summarizeOrgBudgetRows = (rows) => {
    const roundId = normalizeOrgText(selectedOrgTotalsRoundId);
    const map = new Map();
    (Array.isArray(rows) ? rows : [])
      .filter((item) => (item?.requestType || "budget_approval").toString().trim() === "budget_approval")
      .filter(isSameRepresentativeOrgType)
      .filter((item) => roundId && getRequestRoundId(item) === roundId)
      .forEach((item) => {
        const orgName = normalizeOrgText(item.organizationName) || "ไม่ระบุองค์กร";
        const current = map.get(orgName) || {
          organizationName: orgName,
          projectCount: 0,
          requestedAmount: 0,
          approvedAmount: 0,
          pendingAmount: 0
        };
        const requestedAmount = toBudgetAmount(item.estimatedExpense);
        const approvedAmount = toBudgetAmount(item.approvedAmount);
        current.projectCount += 1;
        current.requestedAmount += requestedAmount;
        current.approvedAmount += approvedAmount;
        if ((item.status || "pending").toString().trim().toLowerCase() === "pending") {
          current.pendingAmount += requestedAmount;
        }
        map.set(orgName, current);
      });

    const orgOrder = collectRepresentativeOrgNameOptions(getCurrentRepresentativeOrgType());
    const orgRank = new Map(orgOrder.map((name, index) => [normalizeOrgText(name), index]));
    return Array.from(map.values()).sort((a, b) => {
      const rankA = orgRank.has(normalizeOrgText(a.organizationName))
        ? orgRank.get(normalizeOrgText(a.organizationName))
        : Number.MAX_SAFE_INTEGER;
      const rankB = orgRank.has(normalizeOrgText(b.organizationName))
        ? orgRank.get(normalizeOrgText(b.organizationName))
        : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.organizationName.localeCompare(b.organizationName, "th", { numeric: true });
    });
  };

  const setOrgTotalsEmptyState = (message, caption = message) => {
    if (orgTotalsChartInstance) {
      orgTotalsChartInstance.destroy();
      orgTotalsChartInstance = null;
    }
    if (orgTotalsTableBodyEl) {
      orgTotalsTableBodyEl.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#6b7280;">${escapeHtml(message)}</td>
        </tr>
      `;
    }
    if (orgTotalsCaptionEl) orgTotalsCaptionEl.textContent = caption;
    if (orgTotalsOrgCountEl) orgTotalsOrgCountEl.textContent = "0";
    if (orgTotalsProjectCountEl) orgTotalsProjectCountEl.textContent = "0";
    if (orgTotalsRequestedAmountEl) orgTotalsRequestedAmountEl.textContent = "0.00 บาท";
    if (orgTotalsApprovedAmountEl) orgTotalsApprovedAmountEl.textContent = "0.00 บาท";
    latestOrgBudgetSummaryRows = [];
  };

  const populateOrgTotalsRoundOptions = () => {
    if (!orgTotalsRoundSelectEl) return;
    const previousValue = selectedOrgTotalsRoundId || orgTotalsRoundSelectEl.value;
    const rounds = getOrgTotalsClosedRoundOptions();
    orgTotalsRoundSelectEl.innerHTML = "";
    if (!rounds.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "ยังไม่มีรอบที่ปิดแล้ว";
      opt.disabled = true;
      opt.selected = true;
      orgTotalsRoundSelectEl.appendChild(opt);
      selectedOrgTotalsRoundId = "";
      orgTotalsRoundSelectEl.disabled = true;
      return;
    }
    rounds.forEach((round) => {
      const opt = document.createElement("option");
      opt.value = round.id;
      opt.textContent = round.deadline
        ? `${round.label} (ปิด ${formatRoundDeadlineDisplay(round)})`
        : round.label;
      orgTotalsRoundSelectEl.appendChild(opt);
    });
    selectedOrgTotalsRoundId = rounds.some((round) => round.id === previousValue)
      ? previousValue
      : rounds[0].id;
    orgTotalsRoundSelectEl.value = selectedOrgTotalsRoundId;
    orgTotalsRoundSelectEl.disabled = false;
  };

  const renderOrgBudgetTotalsChart = async (summaryRows) => {
    if (!orgTotalsChartCanvasEl) return;
    await window.sgcuVendorLoader?.ensureChart?.();
    if (orgTotalsChartInstance) {
      orgTotalsChartInstance.destroy();
      orgTotalsChartInstance = null;
    }
    if (!Array.isArray(summaryRows) || !summaryRows.length || typeof window.Chart !== "function") {
      return;
    }

    const chartRows = summaryRows.slice();

    const isCompactChart = window.matchMedia?.("(max-width: 540px)")?.matches;
    const yAxisLabelWidth = isCompactChart ? 150 : 190;
    const chartInnerEl = orgTotalsChartCanvasEl.parentElement;
    if (chartInnerEl) {
      const chartHeight = Math.max(isCompactChart ? 280 : 360, Math.min(720, chartRows.length * (isCompactChart ? 46 : 42) + 96));
      chartInnerEl.style.minHeight = `${chartHeight}px`;
    }

    orgTotalsChartInstance = new window.Chart(orgTotalsChartCanvasEl.getContext("2d"), {
      type: "bar",
      data: {
        labels: chartRows.map((row) => row.organizationName),
        datasets: [
          {
            label: "ยอดที่ขอ",
            data: chartRows.map((row) => row.requestedAmount),
            backgroundColor: "#f472b6",
            borderRadius: { topRight: 8, bottomRight: 8 },
            borderSkipped: false
          },
          {
            label: "ยอดอนุมัติ",
            data: chartRows.map((row) => row.approvedAmount),
            backgroundColor: "#34d399",
            borderRadius: { topRight: 8, bottomRight: 8 },
            borderSkipped: false
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const row = chartRows[items?.[0]?.dataIndex || 0];
                return `โครงการ ${Number(row?.projectCount || 0).toLocaleString("th-TH")} รายการ`;
              }
            }
          },
          externalAxisLabels: {
            y: {
              enabled: true,
              width: yAxisLabelWidth,
              gap: isCompactChart ? 6 : 8
            }
          }
        },
        scales: {
          x: {
            ticks: {
              callback: (value) => Number(value || 0).toLocaleString("th-TH")
            }
          },
          y: {
            afterFit(scale) {
              scale.width = Math.max(scale.width || 0, yAxisLabelWidth);
            },
            ticks: {
              display: false,
              autoSkip: false
            }
          }
        }
      }
    });
  };

  const renderOrgBudgetTotals = (rows, source = latestOrgBudgetTotalsSource) => {
    if (!orgTotalsTableBodyEl) return;
    const orgType = getCurrentRepresentativeOrgType();
    populateOrgTotalsRoundOptions();
    if (!orgType) {
      setOrgTotalsEmptyState(
        "ยังไม่มีสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว จึงยังไม่สามารถดูยอดแยกตามองค์กรได้",
        "ต้องมีสิทธิ์ตัวแทนองค์กรก่อน"
      );
      return;
    }
    const selectedRound = findBudgetRoundById(selectedOrgTotalsRoundId);
    if (!selectedOrgTotalsRoundId || !selectedRound || !isBudgetRoundClosed(selectedRound)) {
      setOrgTotalsEmptyState(
        "ยังไม่มีข้อมูลยอดของบแยกตามองค์กรสำหรับรอบที่เลือก",
        ""
      );
      return;
    }

    const summaryRows = summarizeOrgBudgetRows(rows);
    latestOrgBudgetSummaryRows = summaryRows;
    const totalProjectCount = summaryRows.reduce((sum, item) => sum + item.projectCount, 0);
    const totalRequested = summaryRows.reduce((sum, item) => sum + item.requestedAmount, 0);
    const totalApproved = summaryRows.reduce((sum, item) => sum + item.approvedAmount, 0);

    if (orgTotalsOrgCountEl) orgTotalsOrgCountEl.textContent = String(summaryRows.length);
    if (orgTotalsProjectCountEl) orgTotalsProjectCountEl.textContent = String(totalProjectCount);
    if (orgTotalsRequestedAmountEl) orgTotalsRequestedAmountEl.textContent = `${formatCurrency(totalRequested)} บาท`;
    if (orgTotalsApprovedAmountEl) orgTotalsApprovedAmountEl.textContent = `${formatCurrency(totalApproved)} บาท`;

    if (!summaryRows.length) {
      const roundLabel = getBudgetRoundLabelById(selectedOrgTotalsRoundId);
      setOrgTotalsEmptyState(`ยังไม่มีรายการคำของบใน${orgType} สำหรับ${roundLabel}`, `ยังไม่มีรายการใน${roundLabel}`);
      return;
    }

    void renderOrgBudgetTotalsChart(summaryRows);

    const primaryRepresentative = getPrimaryApprovedRepresentative();
    orgTotalsTableBodyEl.innerHTML = summaryRows.map((item) => {
      const isOwnOrg = primaryRepresentative &&
        findApprovedRepresentativeForOrg(orgType, item.organizationName)?.id === primaryRepresentative.id;
      return `
      <tr class="${isOwnOrg ? "budget-org-totals-row-own" : ""}">
        <td style="text-align:left;" data-label="องค์กร">
          <div class="budget-request-history-project-name">${escapeHtml(item.organizationName)}</div>
          <div class="section-text-sm budget-request-history-project-meta">${escapeHtml(orgType)}</div>
        </td>
        <td style="text-align:right;" data-label="จำนวนโครงการ">${item.projectCount}</td>
        <td style="text-align:right;" data-label="ยอดขอ">${formatCurrency(item.requestedAmount)}</td>
        <td style="text-align:right;" data-label="ยอดอนุมัติ">${formatCurrency(item.approvedAmount)}</td>
        <td style="text-align:right;" data-label="รออนุมัติ">${formatCurrency(item.pendingAmount)}</td>
      </tr>
    `;
    }).join("");

    if (orgTotalsCaptionEl) {
      const chartCaption = `กราฟแสดง ${summaryRows.length.toLocaleString("th-TH")} องค์กร`;
      const roundLabel = getBudgetRoundLabelById(selectedOrgTotalsRoundId);
      orgTotalsCaptionEl.textContent = source === "fallback"
        ? `แสดงเฉพาะรายการที่บัญชีนี้อ่านได้ใน${orgType} · ${roundLabel} · ${chartCaption}`
        : `${roundLabel} · ${chartCaption}ใน${orgType}`;
    }
  };

  const subscribeOrgBudgetTotals = () => {
    if (typeof unsubscribeOrgBudgetTotals === "function") {
      try {
        unsubscribeOrgBudgetTotals();
      } catch (_) {
        // ignore
      }
      unsubscribeOrgBudgetTotals = null;
    }

    const orgType = getCurrentRepresentativeOrgType();
    if (!readCurrentUserEmail()) {
      latestOrgBudgetRows = [];
      latestOrgBudgetTotalsSource = "empty";
      setOrgTotalsEmptyState("กรุณาเข้าสู่ระบบเพื่อดูยอดของบแยกตามองค์กร", "ต้องเข้าสู่ระบบก่อน");
      return;
    }
    if (!orgType) {
      latestOrgBudgetRows = [];
      latestOrgBudgetTotalsSource = "empty";
      renderOrgBudgetTotals([]);
      return;
    }

    const firestore = window.sgcuFirestore || {};
    const canRead = !!(
      firestore.db &&
      firestore.collection &&
      firestore.onSnapshot &&
      firestore.query &&
      firestore.where
    );
    if (!canRead) {
      latestOrgBudgetRows = latestBudgetRequestRows.filter(isSameRepresentativeOrgType);
      latestOrgBudgetTotalsSource = "fallback";
      renderOrgBudgetTotals(latestOrgBudgetRows, "fallback");
      return;
    }

    if (orgTotalsCaptionEl) orgTotalsCaptionEl.textContent = `กำลังโหลดรายการใน${orgType}...`;
    const listQuery = firestore.query(
      firestore.collection(firestore.db, REQUEST_COLLECTION),
      firestore.where("organizationType", "==", orgType),
      ...(firestore.limit ? [firestore.limit(BUDGET_REQUEST_LIST_LIMIT)] : [])
    );
    unsubscribeOrgBudgetTotals = firestore.onSnapshot(
      listQuery,
      (snapshot) => {
        const rows = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          rows.push({ id: docSnap.id, ...data });
        });
        latestOrgBudgetRows = rows;
        latestOrgBudgetTotalsSource = "organizationType";
        renderOrgBudgetTotals(latestOrgBudgetRows, "organizationType");
      },
      () => {
        latestOrgBudgetRows = latestBudgetRequestRows.filter(isSameRepresentativeOrgType);
        latestOrgBudgetTotalsSource = "fallback";
        renderOrgBudgetTotals(latestOrgBudgetRows, "fallback");
      }
    );
  };

  const subscribeMyRequests = () => {
    if (typeof unsubscribeMyRequests === "function") {
      try {
        unsubscribeMyRequests();
      } catch (_) {
        // ignore
      }
      unsubscribeMyRequests = null;
    }

    const email = readCurrentUserEmail();
    if (!email) {
      myRequestsTableBodyEl.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#6b7280;">กรุณาเข้าสู่ระบบเพื่อดูรายการที่ขอไปทั้งหมด</td>
        </tr>
      `;
      myRequestsCaptionEl.textContent = "ต้องเข้าสู่ระบบก่อน";
      latestMyBudgetRequests = [];
      updateBudgetOrgSummary();
      return;
    }

    const firestore = window.sgcuFirestore || {};
    const canRead = !!(
      firestore.db &&
      firestore.collection &&
      firestore.onSnapshot &&
      firestore.query &&
      firestore.where
    );
    if (!canRead) {
      setBudgetRequestCloseState("");
      myRequestsTableBodyEl.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color:#6b7280;">ระบบฐานข้อมูลยังไม่พร้อมใช้งาน</td>
        </tr>
      `;
      myRequestsCaptionEl.textContent = "ไม่สามารถโหลดรายการได้";
      latestMyBudgetRequests = [];
      updateBudgetOrgSummary();
      return;
    }

    const representative = getPrimaryApprovedRepresentative();
    const representativeOrgType = normalizeOrgText(representative?.organizationType);
    const accountEmail = normalizeAccountEmail(email);
    const queryScope = representativeOrgType ? `org:${representativeOrgType}` : `account:${accountEmail}`;
    latestMyRequestsQueryScope = queryScope;
    myRequestsCaptionEl.textContent = "กำลังโหลดรายการ...";
    const listQuery = firestore.query(
      firestore.collection(firestore.db, REQUEST_COLLECTION),
      representativeOrgType
        ? firestore.where("organizationType", "==", representativeOrgType)
        : firestore.where("requester.accountEmail", "==", accountEmail),
      ...(firestore.limit ? [firestore.limit(BUDGET_REQUEST_LIST_LIMIT)] : [])
    );
    unsubscribeMyRequests = firestore.onSnapshot(
      listQuery,
      (snapshot) => {
        const rows = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          if ((data?.requestType || "budget_approval").toString().trim() !== "budget_approval") return;
          rows.push({
            id: docSnap.id,
            ...data
          });
        });
        latestBudgetRequestRows = rows.sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
        renderMyRequestsRows(latestBudgetRequestRows);
      },
      () => {
        myRequestsTableBodyEl.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; color:#b91c1c;">ไม่สามารถโหลดรายการได้ กรุณาลองใหม่อีกครั้ง</td>
          </tr>
        `;
        myRequestsCaptionEl.textContent = "โหลดรายการไม่สำเร็จ";
        latestMyBudgetRequests = [];
        latestBudgetRequestRows = [];
      }
    );
  };

  const subscribeBudgetSettings = () => {
    if (typeof unsubscribeBudgetSettings === "function") {
      try {
        unsubscribeBudgetSettings();
      } catch (_) {
        // ignore
      }
      unsubscribeBudgetSettings = null;
    }

    const firestore = window.sgcuFirestore || {};
    if (!readCurrentUserEmail()) {
      setBudgetRequestCloseState("");
      return;
    }
    const canRead = !!(
      firestore.db &&
      firestore.doc &&
      firestore.onSnapshot
    );
    if (!canRead) {
      setBudgetRequestCloseState("");
      return;
    }

    const docRef = firestore.doc(firestore.db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    unsubscribeBudgetSettings = firestore.onSnapshot(docRef, (snap) => {
      const data = snap?.exists?.() ? (snap.data() || {}) : {};
      setBudgetRequestCloseState(data);
      syncBudgetRequestFormAccess();
      renderMyRequestsRows(latestBudgetRequestRows);
    });
  };

  const subscribeRepresentativeApplications = () => {
    if (typeof unsubscribeRepresentativeApplications === "function") {
      try {
        unsubscribeRepresentativeApplications();
      } catch (_) {
        // ignore
      }
      unsubscribeRepresentativeApplications = null;
    }

    currentRepresentativeApplications = [];
    currentApprovedRepresentatives = [];
    representativeApplicationsLoaded = false;

    const email = readCurrentUserEmail();
    if (!email) {
      representativeApplicationsLoaded = true;
      if (representativeApplicationsBodyEl) {
        representativeApplicationsBodyEl.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center; color:#6b7280;">กรุณาเข้าสู่ระบบเพื่อสมัครเป็นตัวแทนองค์กร</td>
          </tr>
        `;
      }
      if (representativeStatusCaptionEl) representativeStatusCaptionEl.textContent = "ต้องเข้าสู่ระบบก่อน";
      setRepresentativeMessage("เข้าสู่ระบบแล้วกรอกข้อมูลผู้ใช้ให้ครบก่อนสมัครเป็นตัวแทนองค์กร", "#6b7280");
      populateBudgetOrgTypeOptions();
      populateBudgetOrgDeptOptions();
      renderMyRequestsRows(latestBudgetRequestRows);
      subscribeOrgBudgetTotals();
      return;
    }

    const firestore = window.sgcuFirestore || {};
    const canRead = !!(
      firestore.db &&
      firestore.collection &&
      firestore.onSnapshot &&
      firestore.query &&
      firestore.orderBy
    );
    if (!canRead) {
      representativeApplicationsLoaded = true;
      if (representativeApplicationsBodyEl) {
        representativeApplicationsBodyEl.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center; color:#6b7280;">ระบบฐานข้อมูลยังไม่พร้อมใช้งาน</td>
          </tr>
        `;
      }
      if (representativeStatusCaptionEl) representativeStatusCaptionEl.textContent = "ไม่สามารถโหลดสิทธิ์ตัวแทนได้";
      setRepresentativeMessage("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b45309");
      renderMyRequestsRows(latestBudgetRequestRows);
      subscribeOrgBudgetTotals();
      return;
    }

    if (representativeStatusCaptionEl) representativeStatusCaptionEl.textContent = "กำลังโหลดสิทธิ์ตัวแทนองค์กร...";
    const listQuery = firestore.query(
      firestore.collection(firestore.db, REPRESENTATIVE_APPLICATION_COLLECTION),
      firestore.where("applicantEmail", "==", email),
      ...(firestore.limit ? [firestore.limit(REPRESENTATIVE_APPLICATION_LIST_LIMIT)] : [])
    );
    unsubscribeRepresentativeApplications = firestore.onSnapshot(
      listQuery,
      (snapshot) => {
        const rows = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          if ((data?.requestType || "").toString().trim() !== "organization_representative") return;
          const applicantEmail = (data?.applicant?.email || data?.applicantEmail || "").toString().trim().toLowerCase();
          if (applicantEmail !== email) return;
          rows.push({
            id: docSnap.id,
            ...data
          });
        });
        const sortedRows = rows.sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
        currentRepresentativeApplications = sortedRows;
        currentApprovedRepresentatives = sortedRows.filter((item) =>
          (item.status || "").toString().trim().toLowerCase() === "approved"
        );
        representativeApplicationsLoaded = true;
        renderRepresentativeRows(sortedRows);
        const activeApplication = findActiveRepresentativeApplication();
        if (activeApplication && representativeModalEl?.getAttribute("aria-hidden") === "false") {
          setRepresentativeApplicationMessage(getActiveRepresentativeApplicationMessage(activeApplication), "#b91c1c");
        }
        populateBudgetOrgTypeOptions();
        populateBudgetOrgDeptOptions();
        const representative = getPrimaryApprovedRepresentative();
        const accountEmail = normalizeAccountEmail(email);
        const nextQueryScope = representative?.organizationType
          ? `org:${normalizeOrgText(representative.organizationType)}`
          : `account:${accountEmail}`;
        if (nextQueryScope !== latestMyRequestsQueryScope) {
          subscribeMyRequests();
        } else {
          renderMyRequestsRows(latestBudgetRequestRows);
        }
        subscribeOrgBudgetTotals();
        if (editingRequestId) {
          const editingItem = latestBudgetRequestRows.find((item) => item.id === editingRequestId);
          if (!editingItem || !hasApprovedRepresentativeForRequest(editingItem)) {
            clearFormForCreate();
            setFormMessage("สิทธิ์ตัวแทนองค์กรของรายการที่กำลังแก้ไขถูกเปลี่ยนแปลง จึงออกจากโหมดแก้ไขแล้ว", "#b45309");
          }
        }
      },
      () => {
        currentRepresentativeApplications = [];
        currentApprovedRepresentatives = [];
        representativeApplicationsLoaded = true;
        if (representativeApplicationsBodyEl) {
          representativeApplicationsBodyEl.innerHTML = `
            <tr>
              <td colspan="4" style="text-align:center; color:#b91c1c;">ไม่สามารถโหลดคำขอตัวแทนองค์กรได้</td>
            </tr>
          `;
        }
        if (representativeStatusCaptionEl) representativeStatusCaptionEl.textContent = "โหลดสิทธิ์ตัวแทนไม่สำเร็จ";
        setRepresentativeMessage("ไม่สามารถโหลดสิทธิ์ตัวแทนองค์กรได้ กรุณาลองใหม่อีกครั้ง", "#b91c1c");
        renderMyRequestsRows(latestBudgetRequestRows);
        subscribeOrgBudgetTotals();
      }
    );
  };

  const readCurrentUser = () => {
    const auth = window.sgcuAuth?.auth;
    if (!auth?.currentUser) return null;
    return auth.currentUser;
  };

  const readLocalLoginProfileByEmail = (email) => {
    const normalized = (email || "").toString().trim().toLowerCase();
    const accountEmail = normalizeAccountEmail(normalized);
    if (!normalized) return {};

    try {
      const rawPrimary = window.localStorage?.getItem(LOGIN_PROFILE_STORAGE_KEY);
      const rawLegacy = window.localStorage?.getItem(LEGACY_LOGIN_PROFILE_STORAGE_KEY);
      const raw = rawPrimary || rawLegacy;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const byEmail = parsed && typeof parsed === "object" ? parsed : {};
      if (!rawPrimary && rawLegacy) {
        try {
          window.localStorage?.setItem(LOGIN_PROFILE_STORAGE_KEY, JSON.stringify(byEmail));
        } catch (_) {
          // ignore localStorage write errors
        }
      }
      const profile = byEmail[accountEmail] || byEmail[normalized];
      return profile && typeof profile === "object"
        ? { ...profile, authEmail: normalized, accountEmail, email: accountEmail }
        : {};
    } catch (_) {
      return {};
    }
  };

  const resolveRequesterDisplayName = (user, profile) => {
    const firstName = (profile?.firstName || "").toString().trim();
    const lastName = (profile?.lastName || "").toString().trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    return (user?.displayName || user?.email || "").toString().trim();
  };

  const getRepresentativeProfileMissingFields = (profile = {}) => {
    const profileType = (profile.profileType || "student").toString().trim().toLowerCase();
    const isAffairs = profileType === "affairs";
    const requiredFields = [
      ["firstName", "ชื่อ"],
      ["lastName", "นามสกุล"],
      ["phone", isAffairs ? "ข้อมูลติดต่อกลับ" : "เบอร์โทรติดต่อกลับ"]
    ];
    if (!isAffairs) {
      requiredFields.push(
        ["nickname", "ชื่อเล่น"],
        ["studentId", "เลขประจำตัวนิสิต"],
        ["faculty", "คณะ"],
        ["year", "ชั้นปี"],
        ["lineId", "Line ID"]
      );
    }
    return requiredFields
      .filter(([key]) => !(profile[key] || "").toString().trim())
      .map(([, label]) => label);
  };

  const validateRepresentativeProfile = () => {
    const user = readCurrentUser();
    const email = (user?.email || "").toString().trim().toLowerCase();
    const accountEmail = normalizeAccountEmail(email);
    const profile = normalizeProfileAcademicSnapshot(readLocalLoginProfileByEmail(email));
    const missingFields = getRepresentativeProfileMissingFields(profile);
    if (!missingFields.length) return true;

    setRepresentativeApplicationMessage(
      `กรุณาบันทึกข้อมูลผู้ใช้ให้ครบก่อนสมัครเป็นตัวแทนองค์กร: ${missingFields.join(", ")}`,
      "#b91c1c"
    );
    return false;
  };

  const buildRequestPayload = () => {
    const user = readCurrentUser();
    const email = (user?.email || "").toString().trim().toLowerCase();
    const accountEmail = normalizeAccountEmail(email);
    const profile = normalizeProfileAcademicSnapshot(readLocalLoginProfileByEmail(email));
    const editingItem = editingRequestId
      ? latestBudgetRequestRows.find((item) => item.id === editingRequestId)
      : null;
    const originalRequester = editingItem?.requester && typeof editingItem.requester === "object"
      ? editingItem.requester
      : null;
    const requesterPayload = editingItem
      ? (originalRequester || {
        email: (editingItem.requesterEmail || email).toString().trim().toLowerCase(),
        uid: (editingItem.requesterUid || "").toString(),
        displayName: (editingItem.requesterDisplayName || "").toString()
      })
      : {
        email,
        accountEmail,
        authEmail: email,
        uid: (user?.uid || "").toString(),
        displayName: resolveRequesterDisplayName(user, profile),
        profileType: (profile?.profileType || "").toString(),
        nickname: (profile?.nickname || "").toString(),
        studentId: (profile?.studentId || "").toString(),
        faculty: (profile?.faculty || "").toString(),
        year: (profile?.year || "").toString(),
        phone: (profile?.phone || "").toString(),
        lineId: (profile?.lineId || "").toString()
      };
    const requesterEmail = editingItem
      ? (editingItem.requesterEmail || originalRequester?.email || email).toString().trim().toLowerCase()
      : email;
    const organizationType = editingItem
      ? normalizeOrgText(editingItem.organizationType)
      : getBudgetOrgTypeValueForSubmit();
    const organizationName = editingItem
      ? normalizeOrgText(editingItem.organizationName)
      : getBudgetOrgDeptValueForSubmit();
    const approvedRepresentative = findApprovedRepresentativeForOrg(organizationType, organizationName);
    const representativePayload = editingItem?.representative && typeof editingItem.representative === "object"
      ? editingItem.representative
      : approvedRepresentative
        ? {
          status: "approved",
          applicationId: approvedRepresentative.id,
          role: approvedRepresentative.representativeRole,
          email
        }
        : {
          status: "unverified",
          applicationId: "",
          role: "",
          email
        };
    const selectedRound = findActiveRoundById(requestRoundSelectEl.value);

    const selectedOrg = getResolvedRepresentativeOrganization({
      organizationType,
      organizationName
    });

    return {
      requestType: "budget_approval",
      status: "pending",
      accountEmail,
      organizationType: selectedOrg.organizationType || organizationType,
      organizationName: selectedOrg.organizationName || organizationName,
      organizationId: selectedOrg.organizationId || "",
      organizationCatalogId: selectedOrg.organizationId || "",
      baseOrganizationId: selectedOrg.baseOrganizationId || "",
      organizationCode: selectedOrg.organizationCode || "",
      organizationDocumentRunCode: selectedOrg.organizationDocumentRunCode || "",
      representative: representativePayload,
      projectName: projectNameEl.value.trim(),
      description: descriptionEl.value.trim(),
      activityLocation: locationEl.value.trim(),
      prepStartDate: prepStartDateEl.value,
      operationEndDate: operationEndDateEl.value,
      studentOperators: Number(studentOperatorsEl.value || 0),
      studentParticipants: Number(studentParticipantsEl.value || 0),
      estimatedExpense: parseMoneyInputValue(estimatedExpenseEl.value),
      budgetRoundYear: selectedRound?.year || budgetRoundYear,
      budgetRoundNo: selectedRound?.roundNo || budgetRoundNo,
      budgetRoundId: selectedRound?.id || currentBudgetRoundId,
      requester: requesterPayload,
      requesterEmail
    };
  };

  const validateForm = () => {
    if (isBudgetRequestClosed) {
      setFormMessage(getBudgetRequestClosedMessage("สามารถดูผลได้เท่านั้น"), "#b91c1c");
      return false;
    }
    const selectedRound = findActiveRoundById(requestRoundSelectEl.value);
    if (!selectedRound) {
      setFormMessage("กรุณาเลือกรอบรับคำขอที่ยังเปิดรับ", "#b91c1c");
      return false;
    }
    const primaryRepresentative = getPrimaryApprovedRepresentative();
    if (!primaryRepresentative) {
      setFormMessage("ยังไม่มีสิทธิ์ตัวแทนองค์กรที่อนุมัติแล้ว จึงยังไม่สามารถยื่นของบได้", "#b91c1c");
      return false;
    }
    if (editingRequestId) {
      const editingItem = latestBudgetRequestRows.find((item) => item.id === editingRequestId);
      if (!editingItem || !hasApprovedRepresentativeForRequest(editingItem)) {
        setFormMessage("บัญชีนี้ไม่มีสิทธิ์ตัวแทนองค์กรของรายการนี้แล้ว จึงไม่สามารถบันทึกการแก้ไขได้", "#b91c1c");
        clearFormForCreate();
        renderMyRequestsRows(latestBudgetRequestRows);
        return false;
      }
    }

    const controls = [
      orgTypeEl,
      orgDeptEl,
      requestRoundSelectEl,
      projectNameEl,
      descriptionEl,
      locationEl,
      prepStartDateEl,
      operationEndDateEl,
      studentOperatorsEl,
      studentParticipantsEl,
      estimatedExpenseEl
    ];

    const invalidControl = controls.find((control) => !control.reportValidity());
    if (invalidControl) return false;

    const validateNonNegativeIntegerField = (inputEl, label) => {
      const raw = (inputEl.value || "").toString().trim();
      const numeric = Number(raw);
      const isValid = Number.isInteger(numeric) && numeric >= 0;
      inputEl.setCustomValidity(isValid ? "" : `${label}ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`);
      const ok = inputEl.reportValidity();
      if (!ok) inputEl.focus();
      return ok;
    };

    if (!validateNonNegativeIntegerField(studentOperatorsEl, "จำนวนนิสิตผู้ปฏิบัติงาน")) {
      return false;
    }
    if (!validateNonNegativeIntegerField(studentParticipantsEl, "จำนวนนิสิตผู้เข้าร่วมงาน")) {
      return false;
    }

    const orgTypeValue = getBudgetOrgTypeValueForSubmit();
    if (!orgTypeValue) {
      setFormMessage("กรุณาระบุประเภทองค์กร", "#b91c1c");
      orgTypeEl.focus();
      return false;
    }

    const orgDeptValue = getBudgetOrgDeptValueForSubmit();
    if (!orgDeptValue) {
      setFormMessage("กรุณาระบุฝ่าย / ชมรม", "#b91c1c");
      orgDeptEl.focus();
      return false;
    }

    const startDate = new Date(`${prepStartDateEl.value}T00:00:00`);
    const endDate = new Date(`${operationEndDateEl.value}T00:00:00`);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate.getTime() < startDate.getTime()
    ) {
      setFormMessage("วันสุดท้ายปฏิบัติงานต้องไม่ก่อนวันเริ่มเตรียมงาน", "#b91c1c");
      operationEndDateEl.focus();
      return false;
    }

    const estimatedExpense = parseMoneyInputValue(estimatedExpenseEl.value);
    if (!Number.isFinite(estimatedExpense) || estimatedExpense < 0) {
      setFormMessage("ประมาณการรายจ่ายต้องไม่ติดลบ", "#b91c1c");
      estimatedExpenseEl.focus();
      return false;
    }

    return true;
  };

  const setRepresentativeFormEnabled = (enabled) => {
    if (!representativeFormEl) return;
    const disabled = !enabled;
    representativeFormEl.querySelectorAll("input, textarea, select, button").forEach((el) => {
      el.disabled = disabled;
    });
    if (representativeRoleOtherEl && representativeRoleEl?.value !== "อื่น ๆ") {
      representativeRoleOtherEl.disabled = true;
    }
    if (representativeSubmitBtnEl) representativeSubmitBtnEl.disabled = disabled;
  };

  const getRepresentativeRoleValue = () => {
    const selected = normalizeOrgText(representativeRoleEl?.value);
    if (selected === "อื่น ๆ") return normalizeOrgText(representativeRoleOtherEl?.value);
    return selected;
  };

  const validateRepresentativeForm = () => {
    if (!representativeFormEl || !representativeOrgTypeEl || !representativeOrgDeptEl || !representativeRoleEl) return false;
    if (!validateRepresentativeProfile()) return false;

    const controls = [representativeOrgTypeEl, representativeOrgDeptEl, representativeRoleEl];
    const invalidControl = controls.find((control) => !control.reportValidity());
    if (invalidControl) return false;

    if (representativeRoleEl.value === "อื่น ๆ") {
      if (!representativeRoleOtherEl) return false;
      representativeRoleOtherEl.required = true;
      if (!representativeRoleOtherEl.reportValidity()) return false;
    } else if (representativeRoleOtherEl) {
      representativeRoleOtherEl.required = false;
      representativeRoleOtherEl.setCustomValidity("");
    }

    if (!representativeApplicationsLoaded) {
      setRepresentativeApplicationMessage("กำลังตรวจสอบสิทธิ์ตัวแทนองค์กร กรุณารอสักครู่", "#b45309");
      return false;
    }

    const activeApplication = findActiveRepresentativeApplication();
    if (activeApplication) {
      setRepresentativeApplicationMessage(getActiveRepresentativeApplicationMessage(activeApplication), "#b91c1c");
      return false;
    }

    const organizationType = normalizeOrgText(representativeOrgTypeEl.value);
    const organizationName = normalizeOrgText(representativeOrgDeptEl.value);
    const validOrgNames = collectRepresentativeOrgNameOptions(organizationType);
    if (!validOrgNames.includes(organizationName)) {
      setRepresentativeApplicationMessage("ฝ่าย / ชมรมที่เลือกไม่อยู่ในทะเบียนของปีการศึกษาที่เปิดสมัคร กรุณาเลือกใหม่", "#b91c1c");
      populateRepresentativeOrgTypeOptions();
      populateRepresentativeOrgDeptOptions();
      return false;
    }
    return true;
  };

  const buildRepresentativePayload = () => {
    const user = readCurrentUser();
    const email = (user?.email || "").toString().trim().toLowerCase();
    const accountEmail = normalizeAccountEmail(email);
    const profile = normalizeProfileAcademicSnapshot(readLocalLoginProfileByEmail(email));
    const selectedOrgType = normalizeOrgText(representativeOrgTypeEl?.value);
    const selectedOrgName = normalizeOrgText(representativeOrgDeptEl?.value);
    const selectedCatalogItem = findBudgetOrgCatalogItemBySelection(selectedOrgType, selectedOrgName);
    const selectedOrg = selectedCatalogItem
      ? getResolvedRepresentativeOrganization(selectedCatalogItem)
      : {
        organizationType: selectedOrgType,
        organizationName: selectedOrgName,
        organizationId: "",
        baseOrganizationId: "",
        organizationCode: "",
        organizationDocumentRunCode: ""
      };
    return {
      requestType: "organization_representative",
      status: "pending",
      accountEmail,
      academicYear: getRepresentativeApplicationAcademicYear(),
      organizationType: selectedOrg.organizationType,
      organizationName: selectedOrg.organizationName,
      organizationId: selectedOrg.organizationId,
      organizationCatalogId: selectedOrg.organizationId,
      baseOrganizationId: selectedOrg.baseOrganizationId,
      organizationCode: selectedOrg.organizationCode,
      organizationDocumentRunCode: selectedOrg.organizationDocumentRunCode,
      representativeRole: getRepresentativeRoleValue(),
      evidenceNote: normalizeOrgText(representativeEvidenceEl?.value),
      applicantUid: (user?.uid || "").toString(),
      applicantEmail: email,
      requestedPosition: `ตัวแทนองค์กร: ${selectedOrg.organizationName}`,
      requestedDivisionCodeYY: "ORG",
      requestedLevelCodeZZ: "REP",
      requester: {
        email,
        accountEmail,
        authEmail: email,
        uid: (user?.uid || "").toString(),
        displayName: resolveRequesterDisplayName(user, profile),
        profileType: (profile?.profileType || "").toString(),
        nickname: (profile?.nickname || "").toString(),
        studentId: (profile?.studentId || "").toString(),
        faculty: (profile?.faculty || "").toString(),
        year: (profile?.year || "").toString(),
        phone: (profile?.phone || "").toString(),
        lineId: (profile?.lineId || "").toString()
      },
      applicant: {
        email,
        accountEmail,
        authEmail: email,
        uid: (user?.uid || "").toString(),
        displayName: resolveRequesterDisplayName(user, profile),
        profileType: (profile?.profileType || "").toString(),
        nickname: (profile?.nickname || "").toString(),
        studentId: (profile?.studentId || "").toString(),
        faculty: (profile?.faculty || "").toString(),
        year: (profile?.year || "").toString(),
        phone: (profile?.phone || "").toString(),
        lineId: (profile?.lineId || "").toString()
      },
      reviewedByEmail: "",
      reviewedAt: null,
      reviewedNote: ""
    };
  };

  const setFormEnabled = (enabled) => {
    const disabled = !enabled;
    formEl.querySelectorAll("input, textarea, select, button").forEach((el) => {
      el.disabled = disabled;
    });
    submitBtnEl.disabled = disabled;
  };

  const setEditMode = (requestId = "") => {
    editingRequestId = (requestId || "").toString().trim();
    const isEditing = !!editingRequestId;
    submitBtnEl.textContent = isEditing ? "บันทึกการแก้ไขคำขอ" : "ยื่นคำขออนุมัติงบประมาณ";
    if (cancelEditBtnEl) cancelEditBtnEl.hidden = !isEditing;
    if (cancelRequestBtnEl) cancelRequestBtnEl.hidden = !isEditing;
  };

  const fillFormFromRequest = (item) => {
    if (!item) return;
    projectNameEl.value = (item.projectName || "").toString();
    descriptionEl.value = (item.description || "").toString();
    locationEl.value = (item.activityLocation || "").toString();
    prepStartDateEl.value = (item.prepStartDate || "").toString();
    operationEndDateEl.value = (item.operationEndDate || "").toString();
    studentOperatorsEl.value = Number(item.studentOperators || 0).toString();
    studentParticipantsEl.value = Number(item.studentParticipants || 0).toString();
    estimatedExpenseEl.value = formatMoneyInputValue(item.estimatedExpense || 0);
    setFormMessage("กำลังแก้ไขคำขอที่ส่งไปแล้ว เมื่อเสร็จให้กดบันทึกการแก้ไข", "#1d4ed8");
    updateBudgetDescriptionCounter();
  };

  const clearFormForCreate = () => {
    formEl.reset();
    populateBudgetOrgTypeOptions();
    populateBudgetOrgDeptOptions();
    setEditMode("");
    setFormMessage("");
    estimatedExpenseEl.value = "";
    updateBudgetDescriptionCounter();
  };

  const setBudgetRequestView = (view = "normal") => {
    const nextView = view === "org-totals" ? "org-totals" : "normal";
    requestViewBtnEls.forEach((btn) => {
      const isActive = btn.getAttribute("data-budget-request-view") === nextView;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    requestViewPanelEls.forEach((panel) => {
      const isActive = panel.getAttribute("data-budget-request-view-panel") === nextView;
      panel.hidden = !isActive;
    });
    if (nextView === "org-totals") {
      renderOrgBudgetTotals(latestOrgBudgetRows, latestOrgBudgetTotalsSource);
      window.setTimeout(() => {
        if (orgTotalsChartInstance) orgTotalsChartInstance.resize();
      }, 0);
    }
  };

  requestViewBtnEls.forEach((btn) => {
    btn.addEventListener("click", () => {
      setBudgetRequestView(btn.getAttribute("data-budget-request-view") || "normal");
    });
  });

  [projectNameEl, locationEl, estimatedExpenseEl, descriptionEl].forEach((inputEl) => {
    inputEl.addEventListener("input", () => {
      setFormMessage("");
      updateBudgetDescriptionCounter();
    });
  });
  setupMoneyInputFormatting(estimatedExpenseEl);
  prepStartDateEl.addEventListener("change", () => {
    setFormMessage("");
  });
  operationEndDateEl.addEventListener("change", () => {
    setFormMessage("");
  });
  [studentOperatorsEl, studentParticipantsEl].forEach((inputEl) => {
    inputEl.addEventListener("input", () => {
      inputEl.setCustomValidity("");
      setFormMessage("");
    });
  });
  orgTypeEl.addEventListener("change", () => {
    populateBudgetOrgDeptOptions();
    setFormMessage("");
  });
  orgTypeEl.addEventListener("focus", () => {
    populateBudgetOrgTypeOptions();
    populateBudgetOrgDeptOptions();
  });
  orgDeptEl.addEventListener("focus", populateBudgetOrgDeptOptions);

  representativeApplyBtnEl?.addEventListener("click", () => {
    const user = readCurrentUser();
    if (!user?.email) {
      setRepresentativeMessage("กรุณาเข้าสู่ระบบก่อนสมัครเป็นตัวแทนองค์กร", "#b91c1c");
    }
    openRepresentativeModal();
    if (!user?.email) {
      setRepresentativeApplicationMessage("กรุณาเข้าสู่ระบบก่อนสมัครเป็นตัวแทนองค์กร", "#b91c1c");
    }
  });
  const startEditRequest = (requestId = "") => {
    const id = (requestId || "").toString().trim();
    if (!id) return;
    if (isBudgetRequestClosed) {
      setFormMessage(getBudgetRequestClosedMessage("ไม่สามารถแก้ไขหรือลบรายการได้"), "#b91c1c");
      return;
    }
    const item = latestMyBudgetRequests.find((row) => row.id === id);
    if (!item) {
      setFormMessage("ไม่พบรายการที่ต้องการแก้ไข", "#b91c1c");
      return;
    }
    if (!hasApprovedRepresentativeForRequest(item)) {
      setFormMessage("บัญชีนี้ไม่มีสิทธิ์ตัวแทนองค์กรของรายการนี้แล้ว จึงไม่สามารถแก้ไขได้", "#b91c1c");
      clearFormForCreate();
      renderMyRequestsRows(latestBudgetRequestRows);
      return;
    }
    const status = (item.status || "pending").toString().trim().toLowerCase();
    if (status !== "pending") {
      setFormMessage("แก้ไขได้เฉพาะรายการที่ยังรออนุมัติ", "#b91c1c");
      return;
    }
    setEditMode(id);
    const originalRoundId = getRequestRoundId(item);
    const openRounds = getOpenBudgetRounds();
    requestRoundSelectEl.value = openRounds.some((round) => round.id === originalRoundId)
      ? originalRoundId
      : (openRounds[0]?.id || "");
    fillFormFromRequest(item);
    if (!isRequestRoundOpen(item)) {
      setFormMessage(`รายการเดิมอยู่${getRequestRoundLabel(item)} ซึ่งปิดรับแล้ว กรุณาเลือกรอบที่ยังเปิดรับก่อนบันทึก`, "#1d4ed8");
    }
    formEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelBudgetRequest = async (requestId = "") => {
    const id = (requestId || "").toString().trim();
    if (!id) return;
    if (isBudgetRequestClosed) {
      setFormMessage(getBudgetRequestClosedMessage("ไม่สามารถแก้ไขหรือลบรายการได้"), "#b91c1c");
      return;
    }
    const item = latestMyBudgetRequests.find((row) => row.id === id);
    if (!item) {
      setFormMessage("ไม่พบรายการที่ต้องการลบ", "#b91c1c");
      return;
    }
    if (!hasApprovedRepresentativeForRequest(item)) {
      setFormMessage("บัญชีนี้ไม่มีสิทธิ์ตัวแทนองค์กรของรายการนี้แล้ว จึงไม่สามารถลบรายการได้", "#b91c1c");
      clearFormForCreate();
      renderMyRequestsRows(latestBudgetRequestRows);
      return;
    }
    if (!isRequestRoundOpen(item)) {
      setFormMessage(`รายการนี้อยู่${getRequestRoundLabel(item)} ซึ่งปิดรับแล้ว จึงลบรายการไม่ได้`, "#b91c1c");
      return;
    }
    const status = (item.status || "pending").toString().trim().toLowerCase();
    if (status !== "pending") {
      setFormMessage("ลบรายการได้เฉพาะรายการที่ยังรออนุมัติ", "#b91c1c");
      return;
    }
    const ok = await askBudgetRequestDeleteConfirm(item);
    if (!ok) return;

    const firestore = window.sgcuFirestore || {};
    const canDelete = !!(
      firestore.db &&
      firestore.doc &&
      firestore.deleteDoc
    );
    if (!canDelete) {
      setFormMessage("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง", "#b45309");
      return;
    }
    setFormMessage("กำลังลบรายการ...", "#1d4ed8");
    try {
      await firestore.deleteDoc(firestore.doc(firestore.db, REQUEST_COLLECTION, id));
      if (editingRequestId === id) {
        clearFormForCreate();
      }
      latestMyBudgetRequests = latestMyBudgetRequests.filter((row) => row.id !== id);
      latestBudgetRequestRows = latestBudgetRequestRows.filter((row) => row.id !== id);
      latestOrgBudgetRows = latestOrgBudgetRows.filter((row) => row.id !== id);
      renderMyRequestsRows(latestBudgetRequestRows);
      updateBudgetOrgSummary();
      renderOrgBudgetTotals(latestOrgBudgetRows, latestOrgBudgetTotalsSource);
      setFormMessage("ลบรายการเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "budget.request.delete",
        entityType: "budgetApprovalRequest",
        entityId: id,
        before: item,
        source: "web_app"
      });
    } catch (error) {
      console.error("delete budget approval request failed - app.budget-request.js:2456", error);
      setFormMessage("ลบรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "#b91c1c");
    }
  };

  myRequestsTableBodyEl.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const editRow = target.closest("[data-budget-edit-id]");
    if (!editRow) return;
    startEditRequest(editRow.getAttribute("data-budget-edit-id") || "");
  });

  myRequestsTableBodyEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const editRow = target?.closest("[data-budget-edit-id]");
    if (!editRow) return;
    event.preventDefault();
    startEditRequest(editRow.getAttribute("data-budget-edit-id") || "");
  });
  cancelEditBtnEl?.addEventListener("click", () => {
    clearFormForCreate();
  });
  cancelRequestBtnEl?.addEventListener("click", () => {
    void cancelBudgetRequest(editingRequestId);
  });
  representativeModalCloseEl?.addEventListener("click", closeRepresentativeModal);
  representativeCancelBtnEl?.addEventListener("click", closeRepresentativeModal);
  representativeModalEl?.addEventListener("click", (event) => {
    if (event.target === representativeModalEl) closeRepresentativeModal();
  });
  representativeOrgTypeEl?.addEventListener("change", () => {
    populateRepresentativeOrgDeptOptions();
    setRepresentativeApplicationMessage("");
  });
  representativeOrgTypeEl?.addEventListener("focus", () => {
    populateRepresentativeOrgTypeOptions();
    populateRepresentativeOrgDeptOptions();
  });
  representativeOrgDeptEl?.addEventListener("focus", populateRepresentativeOrgDeptOptions);
  representativeRoleEl?.addEventListener("change", () => {
    const needsOther = representativeRoleEl.value === "อื่น ๆ";
    if (representativeRoleOtherEl) {
      representativeRoleOtherEl.disabled = !needsOther;
      representativeRoleOtherEl.required = needsOther;
      if (!needsOther) representativeRoleOtherEl.value = "";
    }
    setRepresentativeApplicationMessage("");
  });
  exportCsvBtnEl?.addEventListener("click", exportMyBudgetRequestsCsv);
  orgTotalsRoundSelectEl?.addEventListener("change", () => {
    selectedOrgTotalsRoundId = normalizeOrgText(orgTotalsRoundSelectEl.value);
    renderOrgBudgetTotals(latestOrgBudgetRows, latestOrgBudgetTotalsSource);
  });
  representativeFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setRepresentativeApplicationMessage("");

    const user = readCurrentUser();
    if (!user?.email) {
      setRepresentativeApplicationMessage("กรุณาเข้าสู่ระบบก่อนสมัครเป็นตัวแทนองค์กร", "#b91c1c");
      return;
    }
    if (!validateRepresentativeForm()) return;

    const firestore = window.sgcuFirestore || {};
    const canWrite = !!(
      firestore.db &&
      firestore.collection &&
      firestore.addDoc &&
      firestore.serverTimestamp
    );
    if (!canWrite) {
      setRepresentativeApplicationMessage("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง", "#b45309");
      return;
    }

    setRepresentativeFormEnabled(false);
    setRepresentativeApplicationMessage("กำลังส่งคำขอตัวแทนองค์กร...", "#1d4ed8");
    try {
      const payload = buildRepresentativePayload();
      const docRef = await firestore.addDoc(
        firestore.collection(firestore.db, REPRESENTATIVE_APPLICATION_COLLECTION),
        {
          ...payload,
          createdAt: firestore.serverTimestamp(),
          updatedAt: firestore.serverTimestamp()
        }
      );
      const optimisticApplication = {
        id: (docRef?.id || "").toString(),
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      currentRepresentativeApplications = [
        optimisticApplication,
        ...currentRepresentativeApplications.filter((item) => item.id !== optimisticApplication.id)
      ];
      renderRepresentativeRows(currentRepresentativeApplications);
      representativeFormEl.reset();
      if (representativeRoleOtherEl) {
        representativeRoleOtherEl.disabled = true;
        representativeRoleOtherEl.required = false;
      }
      populateRepresentativeOrgTypeOptions();
      populateRepresentativeOrgDeptOptions();
      setRepresentativeApplicationMessage("ส่งคำขอสมัครเป็นตัวแทนองค์กรเรียบร้อยแล้ว", "#047857");
      window.setTimeout(closeRepresentativeModal, 650);
    } catch (error) {
      console.error("submit organization representative application failed - app.budget-request.js:2567", error);
      const code = (error?.code || "unknown").toString();
      if (code === "permission-denied") {
        setRepresentativeApplicationMessage("ไม่สามารถส่งคำขอได้: บัญชีนี้ไม่มีสิทธิ์เขียนข้อมูล (permission-denied)", "#b91c1c");
      } else if (code === "unauthenticated") {
        setRepresentativeApplicationMessage("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง", "#b91c1c");
      } else {
        setRepresentativeApplicationMessage("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "#b91c1c");
      }
    } finally {
      setRepresentativeFormEnabled(true);
    }
  });

  void ensureBudgetOrgOptionDataLoaded().finally(() => {
    populateBudgetOrgTypeOptions();
    populateBudgetOrgDeptOptions();
    populateRepresentativeOrgTypeOptions();
    populateRepresentativeOrgDeptOptions();
  });
  subscribeMyRequests();
  subscribeRepresentativeApplications();
  subscribeBudgetSettings();
  updateBudgetDescriptionCounter();

  if (window.sgcuAuth?.auth && typeof window.sgcuAuth.onAuthStateChanged === "function") {
    window.sgcuAuth.onAuthStateChanged(window.sgcuAuth.auth, () => {
      subscribeMyRequests();
      subscribeRepresentativeApplications();
      subscribeBudgetSettings();
    });
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormMessage("");

    const user = readCurrentUser();
    if (!user?.email) {
      setFormMessage("กรุณาเข้าสู่ระบบก่อนยื่นคำขออนุมัติงบประมาณ", "#b91c1c");
      return;
    }

    if (!validateForm()) {
      return;
    }

    const firestore = window.sgcuFirestore || {};
    const canWrite = !!(
      firestore.db &&
      firestore.collection &&
      firestore.doc &&
      firestore.updateDoc &&
      firestore.addDoc &&
      firestore.serverTimestamp
    );

    if (!canWrite) {
      setFormMessage("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง", "#b45309");
      return;
    }

    setFormEnabled(false);
    const isEditing = !!editingRequestId;
    setFormMessage(
      isEditing ? "กำลังบันทึกการแก้ไขคำขอ..." : "กำลังส่งคำขออนุมัติงบประมาณ...",
      "#1d4ed8"
    );

    try {
      const payload = buildRequestPayload();
      if (isEditing) {
        const beforeItem = latestBudgetRequestRows.find((row) => row.id === editingRequestId) ||
          latestMyBudgetRequests.find((row) => row.id === editingRequestId) ||
          null;
        await firestore.updateDoc(
          firestore.doc(firestore.db, REQUEST_COLLECTION, editingRequestId),
          {
            ...payload,
            updatedAt: firestore.serverTimestamp()
          }
        );
        clearFormForCreate();
        setFormMessage("บันทึกการแก้ไขคำขอเรียบร้อยแล้ว", "#047857");
        void window.sgcuAuditLog?.write?.({
          action: "budget.request.update",
          entityType: "budgetApprovalRequest",
          entityId: editingRequestId,
          before: beforeItem,
          after: payload,
          source: "web_app"
        });
      } else {
        const docRef = await firestore.addDoc(
          firestore.collection(firestore.db, REQUEST_COLLECTION),
          {
            ...payload,
            createdAt: firestore.serverTimestamp(),
            updatedAt: firestore.serverTimestamp()
          }
        );
        clearFormForCreate();
        setFormMessage("ส่งคำขออนุมัติงบประมาณเรียบร้อยแล้ว", "#047857");
        void window.sgcuAuditLog?.write?.({
          action: "budget.request.create",
          entityType: "budgetApprovalRequest",
          entityId: docRef?.id || "",
          after: payload,
          source: "web_app"
        });
      }
    } catch (error) {
      console.error("submit budget approval request failed - app.budget-request.js:2661", error);
      const code = (error?.code || "unknown").toString();
      if (code === "permission-denied") {
        setFormMessage("ไม่สามารถส่งคำขอได้: บัญชีนี้ไม่มีสิทธิ์เขียนข้อมูล (permission-denied)", "#b91c1c");
      } else if (code === "unauthenticated") {
        setFormMessage("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง", "#b91c1c");
      } else {
        setFormMessage("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "#b91c1c");
      }
    } finally {
      setFormEnabled(true);
    }
  });

  window.addEventListener("beforeunload", () => {
    if (typeof unsubscribeMyRequests === "function") {
      try {
        unsubscribeMyRequests();
      } catch (_) {
        // ignore
      }
      unsubscribeMyRequests = null;
    }
    if (typeof unsubscribeOrgBudgetTotals === "function") {
      try {
        unsubscribeOrgBudgetTotals();
      } catch (_) {
        // ignore
      }
      unsubscribeOrgBudgetTotals = null;
    }
    if (orgTotalsChartInstance) {
      orgTotalsChartInstance.destroy();
      orgTotalsChartInstance = null;
    }
    if (typeof unsubscribeRepresentativeApplications === "function") {
      try {
        unsubscribeRepresentativeApplications();
      } catch (_) {
        // ignore
      }
      unsubscribeRepresentativeApplications = null;
    }
    if (typeof unsubscribeBudgetSettings === "function") {
      try {
        unsubscribeBudgetSettings();
      } catch (_) {
        // ignore
      }
      unsubscribeBudgetSettings = null;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBudgetApprovalRequestPage, { once: true });
} else {
  initBudgetApprovalRequestPage();
}
