/* Staff budget approval management */
(function initBudgetStaffManagement() {
  if (window.__sgcuBudgetStaffManagementInitDone) return;
  window.__sgcuBudgetStaffManagementInitDone = true;

  const summaryCaptionEl = document.getElementById("budgetStaffSummaryCaption");
  const orgCountEl = document.getElementById("budgetStaffOrgCount");
  const projectCountEl = document.getElementById("budgetStaffProjectCount");
  const requestedTotalEl = document.getElementById("budgetStaffRequestedTotal");
  const approvedTotalEl = document.getElementById("budgetStaffApprovedTotal");
  const ceilingTotalEl = document.getElementById("budgetStaffCeilingTotal");
  const reductionNeededEl = document.getElementById("budgetStaffReductionNeeded");
  const reductionCaptionEl = document.getElementById("budgetStaffReductionCaption");
  const orgSummaryCaptionEl = document.getElementById("budgetStaffOrgSummaryCaption");
  const orgSummaryRoundEl = document.getElementById("budgetStaffOrgSummaryRound");
  const orgSummaryGroupEl = document.getElementById("budgetStaffOrgSummaryGroup");
  const orgSummaryOrgEl = document.getElementById("budgetStaffOrgSummaryOrg");
  const orgSummarySearchEl = document.getElementById("budgetStaffOrgSummarySearch");
  const orgSummarySearchClearEl = document.getElementById("budgetStaffOrgSummarySearchClear");
  const reviewRoundEl = document.getElementById("budgetStaffReviewRound");
  const reviewGroupEl = document.getElementById("budgetStaffReviewGroup");
  const reviewOrgEl = document.getElementById("budgetStaffReviewOrg");
  const chartCanvasEl = document.getElementById("budgetStaffOrgChart");
  const tabBtnEls = Array.from(document.querySelectorAll("[data-budget-staff-tab]"));
  const tabPanelEls = Array.from(document.querySelectorAll("[data-budget-staff-panel]"));
  const pageRootEl = document.querySelector('.page-view[data-page="budget-approval-staff"]');
  const mobileActionBarEl = document.querySelector(".mobile-budget-action-bar");
  const mobileActionBtnEls = Array.from(document.querySelectorAll("[data-budget-mobile-action]"));
  const overviewFiltersEl = document.querySelector(".budget-staff-overview-filters");
  const reviewFiltersEl = document.querySelector(".budget-staff-review-filters");

  const roundYearInputEl = document.getElementById("budgetRoundYearInput");
  const roundNoInputEl = document.getElementById("budgetRoundNoInput");
  const deadlineInputEl = document.getElementById("budgetRequestDeadlineInput");
  const deadlineTimeInputEl = document.getElementById("budgetRequestDeadlineTimeInput");
  const roundAddBtnEl = document.getElementById("budgetRoundAddBtn");
  const roundCancelEditBtnEl = document.getElementById("budgetRoundCancelEditBtn");
  const roundDeleteSelectedBtnEl = document.getElementById("budgetRoundDeleteSelectedBtn");
  const roundActionFieldEl = document.getElementById("budgetRoundActionsRow") || roundAddBtnEl?.closest(".budget-round-actions-row");
  const activeRoundListEl = document.getElementById("budgetActiveRoundList");
  const ceilingInputEl = document.getElementById("budgetCeilingInput");
  const groupCeilingListEl = document.getElementById("budgetGroupCeilingList");
  const groupCeilingToggleBtnEl = document.getElementById("budgetGroupCeilingToggleBtn");
  const deadlineStatusEl = document.getElementById("budgetRequestDeadlineStatus");
  const deadlineSaveBtnEl = document.getElementById("budgetRequestDeadlineSaveBtn");
  const runCodeBtnEl = document.getElementById("budgetRunProjectCodeBtn");
  const clearCodeBtnEl = document.getElementById("budgetClearProjectCodeBtn");
  const actionMessageEl = document.getElementById("budgetStaffActionMessage");
  const clearCodeModalEl = document.getElementById("budgetProjectCodeClearModal");
  const clearCodeCloseBtnEl = document.getElementById("budgetProjectCodeClearCloseBtn");
  const clearCodeCancelBtnEl = document.getElementById("budgetProjectCodeClearCancelBtn");
  const clearCodeConfirmBtnEl = document.getElementById("budgetProjectCodeClearConfirmBtn");
  const clearCodeCountEl = document.getElementById("budgetProjectCodeClearCount");
  const clearCodeListEl = document.getElementById("budgetProjectCodeClearList");
  const clearCodeMessageEl = document.getElementById("budgetProjectCodeClearMessage");

  const formEl = document.getElementById("budgetStaffManageForm");
  const saveBtnEl = document.getElementById("budgetStaffManageSaveBtn");
  const cancelEditBtnEl = document.getElementById("budgetStaffManageCancelEditBtn");
  const deleteEditBtnEl = document.getElementById("budgetStaffManageDeleteBtn");
  const formMessageEl = document.getElementById("budgetStaffManageMessage");
  const staffRoundInputEl = document.getElementById("budgetStaffRoundInput");
  const orgTypeInputEl = document.getElementById("budgetStaffOrgTypeInput");
  const orgNameInputEl = document.getElementById("budgetStaffOrgNameInput");
  const projectNameInputEl = document.getElementById("budgetStaffProjectNameInput");
  const activityLocationInputEl = document.getElementById("budgetStaffActivityLocationInput");
  const prepStartDateInputEl = document.getElementById("budgetStaffPrepStartDateInput");
  const operationEndDateInputEl = document.getElementById("budgetStaffOperationEndDateInput");
  const studentOperatorsInputEl = document.getElementById("budgetStaffStudentOperatorsInput");
  const studentParticipantsInputEl = document.getElementById("budgetStaffStudentParticipantsInput");
  const requestedAmountInputEl = document.getElementById("budgetStaffRequestedAmountInput");
  const approvedAmountInputEl = document.getElementById("budgetStaffApprovedAmountInput");
  const statusInputEl = document.getElementById("budgetStaffStatusInput");
  const descriptionInputEl = document.getElementById("budgetStaffDescriptionInput");

  const tableBodyEl = document.getElementById("budgetStaffRequestsBody");
  const exportCsvBtnEl = document.getElementById("budgetStaffExportCsvBtn");
  const requestDeleteModalEl = document.getElementById("budgetRequestDeleteModal");
  const requestDeleteCloseBtnEl = document.getElementById("budgetRequestDeleteCloseBtn");
  const requestDeleteCancelBtnEl = document.getElementById("budgetRequestDeleteCancelBtn");
  const requestDeleteConfirmBtnEl = document.getElementById("budgetRequestDeleteConfirmBtn");
  const requestDeleteConfirmCheckEl = document.getElementById("budgetRequestDeleteConfirmCheck");
  const requestDeleteNameEl = document.getElementById("budgetRequestDeleteName");
  const requestDeleteSummaryEl = document.getElementById("budgetRequestDeleteSummary");
  const requestDeleteMessageEl = document.getElementById("budgetRequestDeleteMessage");
  const roundDeleteModalEl = document.getElementById("budgetRoundDeleteModal");
  const roundDeleteCloseBtnEl = document.getElementById("budgetRoundDeleteCloseBtn");
  const roundDeleteCancelBtnEl = document.getElementById("budgetRoundDeleteCancelBtn");
  const roundDeleteConfirmBtnEl = document.getElementById("budgetRoundDeleteConfirmBtn");
  const roundDeleteExportBtnEl = document.getElementById("budgetRoundDeleteExportBtn");
  const roundDeleteConfirmCheckEl = document.getElementById("budgetRoundDeleteConfirmCheck");
  const roundDeleteLabelEl = document.getElementById("budgetRoundDeleteLabel");
  const roundDeleteSummaryEl = document.getElementById("budgetRoundDeleteSummary");
  const roundDeleteMessageEl = document.getElementById("budgetRoundDeleteMessage");

  if (
    !summaryCaptionEl ||
    !orgCountEl ||
    !projectCountEl ||
    !requestedTotalEl ||
    !approvedTotalEl ||
    !ceilingTotalEl ||
    !reductionNeededEl ||
    !reductionCaptionEl ||
    !orgSummaryCaptionEl ||
    !orgSummaryRoundEl ||
    !orgSummaryGroupEl ||
    !orgSummaryOrgEl ||
    !orgSummarySearchEl ||
    !orgSummarySearchClearEl ||
    !reviewRoundEl ||
    !reviewGroupEl ||
    !reviewOrgEl ||
    !chartCanvasEl ||
    !tabBtnEls.length ||
    !tabPanelEls.length ||
    !roundYearInputEl ||
    !roundNoInputEl ||
    !deadlineInputEl ||
    !deadlineTimeInputEl ||
    !roundAddBtnEl ||
    !roundCancelEditBtnEl ||
    !roundDeleteSelectedBtnEl ||
    !roundActionFieldEl ||
    !activeRoundListEl ||
    !ceilingInputEl ||
    !groupCeilingListEl ||
    !groupCeilingToggleBtnEl ||
    !deadlineStatusEl ||
    !deadlineSaveBtnEl ||
    !runCodeBtnEl ||
    !clearCodeBtnEl ||
    !actionMessageEl ||
    !clearCodeModalEl ||
    !clearCodeCloseBtnEl ||
    !clearCodeCancelBtnEl ||
    !clearCodeConfirmBtnEl ||
    !clearCodeCountEl ||
    !clearCodeListEl ||
    !clearCodeMessageEl ||
    !formEl ||
    !saveBtnEl ||
    !cancelEditBtnEl ||
    !deleteEditBtnEl ||
    !formMessageEl ||
    !staffRoundInputEl ||
    !orgTypeInputEl ||
    !orgNameInputEl ||
    !projectNameInputEl ||
    !activityLocationInputEl ||
    !prepStartDateInputEl ||
    !operationEndDateInputEl ||
    !studentOperatorsInputEl ||
    !studentParticipantsInputEl ||
    !requestedAmountInputEl ||
    !approvedAmountInputEl ||
    !statusInputEl ||
    !descriptionInputEl ||
    !tableBodyEl ||
    !requestDeleteModalEl ||
    !requestDeleteCloseBtnEl ||
    !requestDeleteCancelBtnEl ||
    !requestDeleteConfirmBtnEl ||
    !requestDeleteConfirmCheckEl ||
    !requestDeleteNameEl ||
    !requestDeleteSummaryEl ||
    !requestDeleteMessageEl ||
    !roundDeleteModalEl ||
    !roundDeleteCloseBtnEl ||
    !roundDeleteCancelBtnEl ||
    !roundDeleteConfirmBtnEl ||
    !roundDeleteExportBtnEl ||
    !roundDeleteConfirmCheckEl ||
    !roundDeleteLabelEl ||
    !roundDeleteSummaryEl ||
    !roundDeleteMessageEl
  ) {
    return;
  }

  if (roundDeleteModalEl.parentElement !== document.body) {
    document.body.appendChild(roundDeleteModalEl);
  }
  if (requestDeleteModalEl.parentElement !== document.body) {
    document.body.appendChild(requestDeleteModalEl);
  }
  if (clearCodeModalEl.parentElement !== document.body) {
    document.body.appendChild(clearCodeModalEl);
  }

  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const firestoreCollections = appConfig.firestore?.collections || {};
  const firestoreDocs = appConfig.firestore?.docs || {};
  const COLLECTION_REQUESTS = firestoreCollections.budgetApprovalRequests || "budgetApprovalRequests";
  const COLLECTION_SETTINGS = firestoreCollections.budgetApprovalSettings || "budgetApprovalSettings";
  const SETTINGS_DOC_ID = firestoreDocs.budgetApprovalSettings || "global";
  const REQUEST_LIST_LIMIT = 1000;
  const LOCAL_BUDGET_CEILING_KEY = "sgcuBudgetStaffBudgetCeiling";
  const LOCAL_BUDGET_GROUP_CEILINGS_KEY = "sgcuBudgetStaffBudgetGroupCeilings";
  const LOCAL_BUDGET_GROUP_CEILING_OPEN_KEY = "sgcuBudgetStaffBudgetGroupCeilingOpen";

  let unsubscribeRequests = null;
  let unsubscribeSettings = null;
  let requestRows = [];
  let editingId = "";
  let chartInstance = null;
  let budgetCeiling = 0;
  let budgetGroupCeilings = {};
  let isGroupCeilingOpen = true;
  let budgetSettingsRoundYear = "";
  let budgetRoundYear = "";
  let budgetRoundNo = "";
  let representativeApplicationYear = "";
  let budgetActiveRounds = [];
  let editingBudgetRoundId = "";
  let requestDeleteContext = null;
  let roundDeleteResolve = null;
  let roundDeleteContext = null;
  let clearCodeResolve = null;
  let clearCodeContext = null;
  let currentBudgetStaffTab = "overview";

  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "0.00";
    return num.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const normalizeText = (value) => (value || "").toString().trim();

  const normalizePositiveIntegerText = (value) => {
    const num = Number(normalizeText(value));
    return Number.isInteger(num) && num > 0 ? String(num) : "";
  };

  const normalizeAcademicYearText = (value) => {
    const normalized = normalizePositiveIntegerText(value);
    if (!normalized) return "";
    const num = Number(normalized);
    return num < 100 ? String(2500 + num) : normalized;
  };

  const getCurrentBudgetAcademicYear = () => {
    if (typeof getCurrentAcademicYearBE === "function") {
      const year = Number(getCurrentAcademicYearBE());
      if (Number.isFinite(year)) return String(year);
    }
    const now = new Date();
    const yearCE = now.getFullYear();
    const month = now.getMonth() + 1;
    return String((month >= 6 ? yearCE : yearCE - 1) + 543);
  };

  const getRepresentativeCatalogAcademicYear = () =>
    getCurrentBudgetAcademicYear();

  const getNonCurrentBudgetRounds = () => {
    const currentYear = getCurrentBudgetAcademicYear();
    return budgetActiveRounds.filter((round) => normalizeAcademicYearText(round.year) !== currentYear);
  };

  const normalizeRoundName = (value) => normalizeText(value).replace(/\s+/g, " ");

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

  const formatBudgetRoundEditingLabel = (round = {}) => {
    const year = normalizeAcademicYearText(round.year || round.budgetRoundYear);
    const roundNo = normalizeRoundName(round.roundNo || round.budgetRoundNo)
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return roundNo && year ? `${roundNo} ${year}` : round.label || formatBudgetRoundLabel(year, roundNo);
  };

  const normalizeBudgetActiveRounds = (value, fallback = {}) => {
    const rows = (Array.isArray(value) ? value : [])
      .map((item) => {
        const year = normalizeAcademicYearText(item?.year || item?.budgetRoundYear);
        const roundNo = normalizeRoundName(item?.roundNo || item?.budgetRoundNo);
        const deadline = toDateOnlyText(item?.deadline || item?.budgetRequestDeadline);
        const deadlineTime = toTimeOnlyText(item?.deadlineTime || item?.budgetRequestDeadlineTime) || "23:59";
        const id = normalizeText(item?.id) || buildBudgetRoundId(year, roundNo);
        if (!id || !year || !roundNo || !deadline) return null;
        const ceiling = readMoneyInput(item?.budgetCeiling);
        return {
          id,
          year,
          roundNo,
          deadline,
          deadlineTime,
          label: formatBudgetRoundLabel(year, roundNo),
          budgetCeiling: Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 0,
          budgetGroupCeilings: normalizeBudgetGroupCeilings(item?.budgetGroupCeilings)
        };
      })
      .filter(Boolean);
    if (rows.length) return rows;
    const year = normalizeAcademicYearText(fallback.budgetRoundYear);
    const roundNo = normalizeRoundName(fallback.budgetRoundNo);
    const deadline = toDateOnlyText(fallback.budgetRequestDeadline);
    const deadlineTime = toTimeOnlyText(fallback.budgetRequestDeadlineTime) || "23:59";
    const id = normalizeText(fallback.currentBudgetRoundId) || buildBudgetRoundId(year, roundNo);
    return id && year && roundNo && deadline
      ? [{
        id,
        year,
        roundNo,
        deadline,
        deadlineTime,
        label: formatBudgetRoundLabel(year, roundNo),
        budgetCeiling: readMoneyInput(fallback.budgetCeiling),
        budgetGroupCeilings: normalizeBudgetGroupCeilings(fallback.budgetGroupCeilings)
      }]
      : [];
  };

  const readMoneyInput = (value) => {
    const normalized = normalizeText(value).replaceAll(",", "");
    if (!normalized) return 0;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : Number.NaN;
  };

  const formatMoneyInputValue = (value) => {
    const num = readMoneyInput(value);
    if (!Number.isFinite(num)) return normalizeText(value).replaceAll(",", "");
    return formatMoney(num);
  };

  const setupMoneyInputFormatting = (inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener("focus", () => {
      inputEl.value = normalizeText(inputEl.value).replaceAll(",", "");
    });
    inputEl.addEventListener("blur", () => {
      inputEl.value = formatMoneyInputValue(inputEl.value);
    });
  };

  const toDateOnlyText = (value) => {
    const s = normalizeText(value);
    if (!s) return "";
    return s.length >= 10 ? s.slice(0, 10) : s;
  };

  const toTimeOnlyText = (value) => {
    const match = normalizeText(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "";
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const getRoundDeadlineTime = (round = {}) => toTimeOnlyText(round.deadlineTime || round.budgetRequestDeadlineTime) || "23:59";

  const getRoundDeadlineTimestamp = (round = {}) => {
    const deadline = toDateOnlyText(round.deadline || round.budgetRequestDeadline);
    if (!deadline) return Number.NaN;
    return new Date(`${deadline}T${getRoundDeadlineTime(round)}:59`).getTime();
  };

  const formatRoundDeadline = (round = {}) => {
    const deadline = toDateOnlyText(round.deadline || round.budgetRequestDeadline);
    if (!deadline) return "";
    return `${deadline} ${getRoundDeadlineTime(round)}`;
  };

  const readLocalBudgetCeiling = () => {
    try {
      const value = window.localStorage?.getItem(LOCAL_BUDGET_CEILING_KEY) || "";
      const ceiling = readMoneyInput(value);
      return Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 0;
    } catch (_) {
      return 0;
    }
  };

  const writeLocalBudgetCeiling = (value) => {
    try {
      if (value > 0) {
        window.localStorage?.setItem(LOCAL_BUDGET_CEILING_KEY, String(value));
      } else {
        window.localStorage?.removeItem(LOCAL_BUDGET_CEILING_KEY);
      }
    } catch (_) {}
  };

  const normalizeBudgetGroupCeilings = (value) => {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return Object.entries(source).reduce((next, [group, amount]) => {
      const key = normalizeText(group);
      const ceiling = readMoneyInput(amount);
      if (key && Number.isFinite(ceiling) && ceiling > 0) next[key] = ceiling;
      return next;
    }, {});
  };

  const readLocalBudgetGroupCeilings = () => {
    try {
      const raw = window.localStorage?.getItem(LOCAL_BUDGET_GROUP_CEILINGS_KEY) || "{}";
      return normalizeBudgetGroupCeilings(JSON.parse(raw));
    } catch (_) {
      return {};
    }
  };

  const writeLocalBudgetGroupCeilings = (value) => {
    try {
      const normalized = normalizeBudgetGroupCeilings(value);
      if (Object.keys(normalized).length) {
        window.localStorage?.setItem(LOCAL_BUDGET_GROUP_CEILINGS_KEY, JSON.stringify(normalized));
      } else {
        window.localStorage?.removeItem(LOCAL_BUDGET_GROUP_CEILINGS_KEY);
      }
    } catch (_) {}
  };

  const readLocalGroupCeilingOpen = () => {
    try {
      return window.localStorage?.getItem(LOCAL_BUDGET_GROUP_CEILING_OPEN_KEY) !== "false";
    } catch (_) {
      return true;
    }
  };

  const writeLocalGroupCeilingOpen = (value) => {
    try {
      window.localStorage?.setItem(LOCAL_BUDGET_GROUP_CEILING_OPEN_KEY, value ? "true" : "false");
    } catch (_) {}
  };

  const syncGroupCeilingVisibility = () => {
    groupCeilingListEl.hidden = !isGroupCeilingOpen;
    groupCeilingToggleBtnEl.textContent = isGroupCeilingOpen ? "ซ่อน" : "แสดง";
    groupCeilingToggleBtnEl.setAttribute("aria-expanded", isGroupCeilingOpen ? "true" : "false");
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const renderActiveRoundList = () => {
    const currentYear = getCurrentBudgetAcademicYear();
    if (!budgetActiveRounds.length) {
      activeRoundListEl.innerHTML = `
        <div class="budget-active-round-item is-empty">
          <div>
            <div class="budget-active-round-title">ยังไม่มีรอบที่เปิดรับ</div>
            <div class="budget-active-round-meta">ระบบจะสร้างรอบสำหรับปีการศึกษา ${escapeHtml(currentYear)} เท่านั้น</div>
          </div>
        </div>
      `;
      return;
    }
    activeRoundListEl.innerHTML = budgetActiveRounds.map((round) => {
      const endTime = getRoundDeadlineTimestamp(round);
      const isPast = Number.isFinite(endTime) && Date.now() > endTime;
      const isActive = editingBudgetRoundId && round.id === editingBudgetRoundId;
      const isCurrentYear = normalizeAcademicYearText(round.year) === currentYear;
      return `
        <div
          class="budget-active-round-item${isActive ? " is-active" : ""}${isCurrentYear ? "" : " is-previous-year"}"
          role="button"
          tabindex="0"
          data-budget-round-select="${escapeHtml(round.id)}"
          aria-label="แก้ไข ${escapeHtml(round.label)}"
        >
          <div>
            <div class="budget-active-round-title-row">
              <div class="budget-active-round-title">${escapeHtml(round.label)}</div>
              ${isActive ? '<span class="budget-active-round-state">กำลังแก้ไข</span>' : ""}
              ${isCurrentYear ? "" : '<span class="budget-active-round-state is-warning">รอบปีก่อน</span>'}
            </div>
            <div class="budget-active-round-meta">${isPast ? "หมดเขตแล้ว" : "เปิดรับอยู่"} • ถึง ${escapeHtml(formatRoundDeadline(round))} • เพดาน ${round.budgetCeiling > 0 ? formatMoney(round.budgetCeiling) : "ยังไม่กำหนด"}${isCurrentYear ? "" : " • สำรอง CSV แล้วลบรอบนี้ก่อนเปิดปีใหม่"}</div>
          </div>
        </div>
      `;
    }).join("");
  };

  const applyRoundActionLayout = (hasEditingRound) => {
    const isMobile = window.matchMedia?.("(max-width: 768px)")?.matches;
    const hasVisibleSecondaryActions = hasEditingRound || !roundCancelEditBtnEl.hidden || !roundDeleteSelectedBtnEl.hidden;
    roundActionFieldEl.classList.toggle("is-editing-round", hasVisibleSecondaryActions);
    roundActionFieldEl.style.display = "flex";
    roundActionFieldEl.style.flexDirection = isMobile ? "column" : "row";
    roundActionFieldEl.style.alignItems = "stretch";
    roundActionFieldEl.style.gap = "8px";
    roundActionFieldEl.style.gridColumn = "1 / -1";
    roundActionFieldEl.style.gridTemplateColumns = "";
    [roundAddBtnEl, roundCancelEditBtnEl, roundDeleteSelectedBtnEl].forEach((btn) => {
      btn.style.width = "100%";
      btn.style.minWidth = "0";
      btn.style.flex = isMobile ? "0 0 auto" : "1 1 0";
      btn.style.gridColumn = "";
    });
  };

  const syncRoundStatus = () => {
    renderActiveRoundList();
    if (!roundYearInputEl.value) roundYearInputEl.value = getCurrentBudgetAcademicYear();
    const hasEditingRound = !!editingBudgetRoundId && budgetActiveRounds.some((round) => round.id === editingBudgetRoundId);
    roundCancelEditBtnEl.hidden = !hasEditingRound;
    roundDeleteSelectedBtnEl.hidden = !hasEditingRound;
    roundDeleteSelectedBtnEl.disabled = !hasEditingRound;
    roundAddBtnEl.textContent = hasEditingRound ? "บันทึกการแก้ไข" : "บันทึกรอบใหม่";
    applyRoundActionLayout(hasEditingRound);
    const openRounds = budgetActiveRounds.filter((round) => {
      const endTime = getRoundDeadlineTimestamp(round);
      return Number.isFinite(endTime) && Date.now() <= endTime;
    });
    const previousYearRounds = getNonCurrentBudgetRounds();
    if (previousYearRounds.length) {
      setMessage(deadlineStatusEl, `พบข้อมูลปีก่อน ${previousYearRounds.length} รอบ ควร Export CSV และลบรอบก่อนเปิดปีใหม่`, "#b45309");
    } else if (!budgetActiveRounds.length) {
      setMessage(deadlineStatusEl, `ยังไม่มีรอบปีการศึกษา ${getCurrentBudgetAcademicYear()}`, "#6b7280");
    } else if (!openRounds.length) {
      setMessage(
        deadlineStatusEl,
        budgetActiveRounds.length > 1
          ? `ปิดรับคำขอแล้วทั้ง ${budgetActiveRounds.length} รอบ`
          : "ปิดรับคำขอแล้ว",
        "#b91c1c"
      );
    } else {
      setMessage(deadlineStatusEl, `เปิดรับ ${openRounds.length} รอบ`, "#047857");
    }
  };

  const statusLabel = (status) => {
    const normalized = normalizeText(status).toLowerCase() || "pending";
    if (normalized === "reviewing") return "กำลังพิจารณา";
    if (normalized === "approved") return "ผ่านที่ประชุมนายกหรืออนุกรรมการ";
    if (normalized === "rejected") return "ไม่อนุมัติ";
    if (normalized === "cancelled") return "ยกเลิกหรือเลื่อนไปผ่านครั้งอื่น";
    return "รออนุมัติ";
  };

  const statusBadge = (status) => {
    const normalized = normalizeText(status).toLowerCase() || "pending";
    if (normalized === "reviewing") return '<span class="badge badge-reviewing">กำลังพิจารณา</span>';
    if (normalized === "approved") return '<span class="badge badge-approved">ผ่านที่ประชุมนายกหรืออนุกรรมการ</span>';
    if (normalized === "rejected") return '<span class="badge badge-rejected">ไม่อนุมัติ</span>';
    if (normalized === "cancelled") return '<span class="badge badge-warning">ยกเลิกหรือเลื่อนไปผ่านครั้งอื่น</span>';
    return '<span class="badge badge-pending">รออนุมัติ</span>';
  };

  const isExcludedFromBudgetOrgChart = (item) => {
    const statusValues = [
      item?.status,
      item?.approvalStatus,
      item?.requestStatus,
      item?.budgetStatus,
      statusLabel(item?.status)
    ];
    const status = statusValues
      .map((value) => normalizeText(value).toLowerCase().replace(/\s+/g, ""))
      .join("|");
    return (
      status.includes("cancel") ||
      status.includes("reject") ||
      status.includes("ยกเลิก") ||
      status.includes("เลื่อน") ||
      status.includes("ไม่อนุมัติ")
    );
  };

  const formatDate = (value) => {
    const dateText = toDateOnlyText(value);
    if (!dateText) return "-";
    const parsed = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateText;
    return parsed.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const sanitizeCsvNamePart = (value) => normalizeText(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

  const exportBudgetStaffCsv = (rowsOverride = null, fileNameSuffix = "") => {
    const sourceRows = Array.isArray(rowsOverride) ? rowsOverride : getReviewFilteredRows();
    const rows = sortForDisplay(sourceRows).map((item) => ({
      "รหัสโครงการ": item.projectCodeGenerated || "",
      "รอบรับคำขอ": formatBudgetRoundLabel(item.budgetRoundYear, item.budgetRoundNo) || normalizeText(item.budgetRoundId) || "",
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
      "สถานะ": statusLabel(item.status),
      "คำอธิบาย": item.projectDescription || item.description || ""
    }));
    const suffix = sanitizeCsvNamePart(fileNameSuffix);
    window.sgcuCsvExport?.download({
      fileName: suffix ? `budget-staff-requests-${suffix}` : "budget-staff-requests",
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

  const getCreatedAtTime = (item) => {
    const raw = item?.createdAt;
    if (raw?.seconds) return Number(raw.seconds) * 1000;
    const parsed = Date.parse(raw || "");
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const getDateOnlyTime = (value, fallback = 0) => {
    const dateText = toDateOnlyText(value || "");
    if (!dateText) return fallback;
    const parsed = Date.parse(`${dateText}T00:00:00`);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const getOrgFilterRows = () =>
    typeof orgFilters !== "undefined" && Array.isArray(orgFilters)
      ? orgFilters
      : Array.isArray(globalThis.orgFilters)
        ? globalThis.orgFilters
        : [];

  const getBudgetRoundYearById = (roundId = "") => {
    const id = normalizeText(roundId);
    if (!id || id === "all") return getCurrentBudgetAcademicYear();
    const activeRound = budgetActiveRounds.find((round) => normalizeText(round.id) === id);
    if (activeRound) return normalizeAcademicYearText(activeRound.year);
    const requestRow = requestRows.find((row) => normalizeText(row.budgetRoundId) === id);
    return normalizeAcademicYearText(requestRow?.budgetRoundYear) || getCurrentBudgetAcademicYear();
  };

  const normalizeOrgCatalogYearMap = (map = {}) => {
    if (!map || typeof map !== "object" || Array.isArray(map)) return {};
    return Object.entries(map).reduce((acc, [key, value]) => {
      const itemYear = normalizeAcademicYearText(key);
      const text = normalizeText(value);
      if (/^\d{4}$/.test(itemYear) && text) acc[itemYear] = text;
      return acc;
    }, {});
  };

  const getOrgCatalogYearValue = (map = {}, academicYear = "") => {
    const targetYear = Number(normalizeAcademicYearText(academicYear));
    if (!Number.isFinite(targetYear)) return "";
    const normalized = normalizeOrgCatalogYearMap(map);
    if (normalized[String(targetYear)]) return normalized[String(targetYear)];
    const previousYear = Object.keys(normalized)
      .map((key) => Number(key))
      .filter((itemYear) => Number.isFinite(itemYear) && itemYear < targetYear)
      .sort((a, b) => b - a)[0];
    return previousYear ? normalized[String(previousYear)] || "" : "";
  };

  const getOrgCatalogItemAcademicYear = (item = {}) =>
    normalizeAcademicYearText(item?.academicYear || item?.year || item?.catalogAcademicYear);

  const shouldUseOrgCatalogItemForYear = (item = {}, academicYear = "") => {
    const itemYear = getOrgCatalogItemAcademicYear(item);
    const targetYear = normalizeAcademicYearText(academicYear);
    return !itemYear || !targetYear || itemYear === targetYear;
  };

  const getOrgCatalogNameForYear = (item, academicYear = "") => {
    if (!shouldUseOrgCatalogItemForYear(item, academicYear)) return "";
    if (getOrgCatalogItemAcademicYear(item)) {
      return normalizeText(item?.name || item?.organizationName || item?.orgName);
    }
    const rawName = normalizeText(item?.name || item?.organizationName || item?.orgName);
    const nameByAcademicYear = normalizeOrgCatalogYearMap(
      item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear
    );
    if (Object.keys(nameByAcademicYear).length) {
      return getOrgCatalogYearValue(nameByAcademicYear, academicYear);
    }
    return rawName;
  };

  const getOrgCatalogCodeForYear = (item, academicYear = "") => {
    if (!shouldUseOrgCatalogItemForYear(item, academicYear)) return "";
    if (getOrgCatalogItemAcademicYear(item)) {
      return normalizeText(item?.code || item?.orgCode).toUpperCase();
    }
    const codeByAcademicYear = normalizeOrgCatalogYearMap(item?.codeByAcademicYear || item?.orgCodeByAcademicYear);
    if (Object.keys(codeByAcademicYear).length) {
      return getOrgCatalogYearValue(codeByAcademicYear, academicYear);
    }
    return normalizeText(item?.code || item?.orgCode).toUpperCase();
  };

  const getOrgCatalogRowsForYear = (academicYear = "") => {
    const year = normalizeAcademicYearText(academicYear) || getCurrentBudgetAcademicYear();
    return getOrgFilterRows()
      .map((item) => ({
        item,
        group: normalizeText(item?.group),
        name: getOrgCatalogNameForYear(item, year),
        code: getOrgCatalogCodeForYear(item, year)
      }))
      .filter((row) => row.group && row.name)
      .sort((a, b) =>
        a.code && b.code
          ? a.code.localeCompare(b.code, "th", { numeric: true })
          : compareOrgFilterRowsByCode(a.item, b.item)
      );
  };

  const compareRepresentativeOrgNameByCode = (a, b, codeByName = new Map()) => {
    const codeA = normalizeText(codeByName.get(a));
    const codeB = normalizeText(codeByName.get(b));
    if (codeA && codeB) {
      const codeCompare = codeA.localeCompare(codeB, "th", { numeric: true });
      if (codeCompare) return codeCompare;
    } else if (codeA || codeB) {
      return codeA ? -1 : 1;
    }
    return a.localeCompare(b, "th");
  };

  const getRepresentativeOrgNameForYear = (item = {}) =>
    window.sgcuBudgetOrgOptions?.getOrgNameForYear
      ? window.sgcuBudgetOrgOptions.getOrgNameForYear(item, getRepresentativeCatalogAcademicYear())
      : getOrgCatalogNameForYear(item, getRepresentativeCatalogAcademicYear());

  const getRepresentativeOrgCodeForYear = (item = {}) =>
    window.sgcuBudgetOrgOptions?.getOrgCodeForYear
      ? window.sgcuBudgetOrgOptions.getOrgCodeForYear(item, getRepresentativeCatalogAcademicYear())
      : getOrgCatalogCodeForYear(item, getRepresentativeCatalogAcademicYear());

  const collectRepresentativeOrgTypeOptions = () => {
    if (window.sgcuBudgetOrgOptions?.collectTypeOptions) {
      return window.sgcuBudgetOrgOptions.collectTypeOptions(getRepresentativeCatalogAcademicYear(), getOrgFilterRows());
    }
    const filterRows = getOrgFilterRows();
    return Array.from(new Set(
      filterRows
        .filter((item) => getRepresentativeOrgNameForYear(item))
        .map((item) => normalizeText(item?.group))
        .filter(Boolean)
    )).sort((a, b) => b.localeCompare(a, "th"));
  };

  const collectRepresentativeOrgNameOptions = (orgType = "") => {
    const selectedType = normalizeText(orgType);
    if (!selectedType) return [];
    if (window.sgcuBudgetOrgOptions?.collectNameOptions) {
      return window.sgcuBudgetOrgOptions.collectNameOptions(selectedType, getRepresentativeCatalogAcademicYear(), getOrgFilterRows());
    }
    const codeByName = new Map();
    const names = [];
    getOrgFilterRows()
      .filter((item) => normalizeText(item?.group) === selectedType)
      .forEach((item) => {
        const name = getRepresentativeOrgNameForYear(item);
        if (!name) return;
        const code = getRepresentativeOrgCodeForYear(item);
        if (code && !codeByName.has(name)) codeByName.set(name, code);
        names.push(name);
      });
    return Array.from(new Set(names)).sort((a, b) => compareRepresentativeOrgNameByCode(a, b, codeByName));
  };

  const updateOrgFilterDebugState = () => {
    const year = getRepresentativeCatalogAcademicYear();
    const groups = collectRepresentativeOrgTypeOptions();
    window.__sgcuBudgetStaffOrgFilterDebug = {
      year,
      orgFilterCount: getOrgFilterRows().length,
      groups,
      namesByGroup: groups.reduce((acc, group) => {
        acc[group] = collectRepresentativeOrgNameOptions(group);
        return acc;
      }, {})
    };
  };

  const compareOrgFilterRowsByCode = (a, b) => {
    const codeA = normalizeText(a?.code);
    const codeB = normalizeText(b?.code);
    if (codeA && codeB) {
      const codeCompare = codeA.localeCompare(codeB, "th", { numeric: true });
      if (codeCompare) return codeCompare;
    } else if (codeA || codeB) {
      return codeA ? -1 : 1;
    }
    return normalizeText(a?.name).localeCompare(normalizeText(b?.name), "th");
  };

  const resetSelectOptions = (selectEl, firstLabel) => {
    const selected = selectEl.value || "all";
    selectEl.innerHTML = "";
    const first = document.createElement("option");
    first.value = "all";
    first.textContent = firstLabel;
    selectEl.appendChild(first);
    return selected;
  };

  const getRoundLabelById = (roundId = "") => {
    const id = normalizeText(roundId);
    const round = budgetActiveRounds.find((item) => item.id === id);
    if (round?.label) return round.label;
    const row = requestRows.find((item) => normalizeText(item.budgetRoundId) === id);
    return formatBudgetRoundLabel(row?.budgetRoundYear, row?.budgetRoundNo) || id || "ไม่ระบุรอบ";
  };

  const populateRoundOptions = (selectEl, { includeRequestRows = true } = {}) => {
    const selected = resetSelectOptions(selectEl, "ทุกรอบ");
    const roundIds = [
      ...budgetActiveRounds.map((round) => round.id),
      ...(includeRequestRows ? requestRows.map((item) => normalizeText(item.budgetRoundId)).filter(Boolean) : [])
    ];
    Array.from(new Set(roundIds)).forEach((roundId) => {
      const opt = document.createElement("option");
      opt.value = roundId;
      opt.textContent = getRoundLabelById(roundId);
      selectEl.appendChild(opt);
    });
    selectEl.value = Array.from(selectEl.options).some((opt) => opt.value === selected) ? selected : "all";
  };

  const populateOrgSummaryGroupOptions = () => {
    const selected = resetSelectOptions(orgSummaryGroupEl, "ทุกประเภทองค์กร");
    const representativeGroups = collectRepresentativeOrgTypeOptions();
    updateOrgFilterDebugState();
    const groups = representativeGroups.length
      ? representativeGroups
      : requestRows.map((item) => normalizeText(item.organizationType)).filter(Boolean);
    Array.from(new Set(groups)).sort((a, b) => b.localeCompare(a, "th")).forEach((group) => {
      const opt = document.createElement("option");
      opt.value = group;
      opt.textContent = group;
      orgSummaryGroupEl.appendChild(opt);
    });
    orgSummaryGroupEl.value = Array.from(orgSummaryGroupEl.options).some((opt) => opt.value === selected) ? selected : "all";
  };

  const populateOrgSummaryOrgOptions = () => {
    const selected = resetSelectOptions(orgSummaryOrgEl, "ทุกฝ่าย / ทุกชมรม");
    const group = normalizeText(orgSummaryGroupEl.value) || "all";
    const representativeNames = group === "all"
      ? collectRepresentativeOrgTypeOptions().flatMap((type) => collectRepresentativeOrgNameOptions(type))
      : collectRepresentativeOrgNameOptions(group);
    updateOrgFilterDebugState();
    const names = representativeNames.length
      ? representativeNames
      : requestRows
        .filter((item) => group === "all" || normalizeText(item.organizationType) === group)
        .map((item) => normalizeText(item.organizationName))
        .filter(Boolean);
    Array.from(new Set(names)).forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      orgSummaryOrgEl.appendChild(opt);
    });
    orgSummaryOrgEl.value = Array.from(orgSummaryOrgEl.options).some((opt) => opt.value === selected) ? selected : "all";
  };

  const getStaffOrgTypeOptions = () => {
    const filterRows = getOrgFilterRows();
    const groups = filterRows.length
      ? filterRows.map((item) => normalizeText(item?.group)).filter(Boolean)
      : requestRows.map((item) => normalizeText(item.organizationType)).filter(Boolean);
    return Array.from(new Set(groups)).sort((a, b) => b.localeCompare(a, "th"));
  };

  const getStaffOrgNameOptions = (orgType = "") => {
    const group = normalizeText(orgType);
    const filterRows = getOrgFilterRows();
    const names = filterRows.length
      ? filterRows
        .filter((item) => !group || normalizeText(item?.group) === group)
        .sort(compareOrgFilterRowsByCode)
        .map((item) => normalizeText(item?.name))
        .filter(Boolean)
      : requestRows
        .filter((item) => !group || normalizeText(item.organizationType) === group)
        .map((item) => normalizeText(item.organizationName))
        .filter(Boolean);
    return filterRows.length
      ? Array.from(new Set(names))
      : Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "th"));
  };

  const stripOrgDocumentRunCodeYear = (value = "") =>
    normalizeText(value)
      .replace(/^(?:อบจ(?:\.(?:กฬ|พฒ|วชก|ศป))?\.?)\s*/u, "")
      .replace(/\s*\/\s*\d{4}\s*$/u, "");

  const normalizeOrgMatchValue = (value = "") =>
    normalizeText(value).toLowerCase().replace(/\s+/g, " ");

  const resolveStaffSelectedOrg = (orgType = "", orgName = "", academicYear = "") => {
    const type = normalizeText(orgType);
    const name = normalizeText(orgName);
    const typeKey = normalizeOrgMatchValue(type);
    const nameKey = normalizeOrgMatchValue(name);
    const item = getOrgFilterRows().find((row) =>
      normalizeOrgMatchValue(row?.group || row?.organizationType || row?.orgGroup) === typeKey &&
      normalizeOrgMatchValue(getOrgCatalogNameForYear(row, academicYear)) === nameKey
    );
    if (!item) {
      return {
        organizationType: type,
        organizationName: name,
        organizationId: "",
        baseOrganizationId: "",
        organizationCode: "",
        organizationDocumentRunCode: ""
      };
    }
    return {
      organizationType: normalizeText(item?.group || item?.organizationType || item?.orgGroup) || type,
      organizationName: getOrgCatalogNameForYear(item, academicYear) || name,
      organizationId: normalizeText(item?.id || item?.organizationId || item?.organizationCatalogId),
      baseOrganizationId: normalizeText(item?.baseOrganizationId || item?.baseOrgId || item?.rootOrganizationId || item?.legacyOrganizationId || item?.id),
      organizationCode: getOrgCatalogCodeForYear(item, academicYear),
      organizationDocumentRunCode: stripOrgDocumentRunCodeYear(item?.documentRunCode || item?.runCode || item?.organizationDocumentRunCode)
    };
  };

  const appendSelectOption = (selectEl, value, label = value) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  };

  const isBudgetRoundPast = (round) => {
    const endTime = getRoundDeadlineTimestamp(round);
    return Number.isFinite(endTime) && Date.now() > endTime;
  };

  const getCurrentSettingsRoundId = () => buildBudgetRoundId(roundYearInputEl.value, roundNoInputEl.value);

  const getBudgetRoundOptionLabel = (round) => {
    const state = isBudgetRoundPast(round) ? "หมดเขตแล้ว" : "เปิดรับอยู่";
    const yearNote = normalizeAcademicYearText(round?.year) === getCurrentBudgetAcademicYear() ? "" : " • ปีก่อน";
    return `${round?.label || round?.id || "ไม่ระบุรอบ"} (${state}${round?.deadline ? ` ถึง ${formatRoundDeadline(round)}` : ""}${yearNote})`;
  };

  const populateStaffRoundOptions = (preferredValue = staffRoundInputEl.value) => {
    const selected = normalizeText(preferredValue) || getCurrentSettingsRoundId();
    const currentYear = getCurrentBudgetAcademicYear();
    const currentYearRounds = budgetActiveRounds.filter((round) => normalizeAcademicYearText(round.year) === currentYear);
    staffRoundInputEl.innerHTML = "";
    appendSelectOption(staffRoundInputEl, "", currentYearRounds.length ? "เลือกรอบรับคำขอ" : `ยังไม่มีรอบปีการศึกษา ${currentYear}`);
    staffRoundInputEl.options[0].disabled = true;
    currentYearRounds.forEach((round) => appendSelectOption(staffRoundInputEl, round.id, getBudgetRoundOptionLabel(round)));
    if (selected && !Array.from(staffRoundInputEl.options).some((opt) => opt.value === selected)) {
      const selectedRound = budgetActiveRounds.find((round) => round.id === selected);
      if (!selectedRound || normalizeAcademicYearText(selectedRound.year) === currentYear) {
        appendSelectOption(staffRoundInputEl, selected, getRoundLabelById(selected));
      }
    }
    staffRoundInputEl.value = selected && Array.from(staffRoundInputEl.options).some((opt) => opt.value === selected) ? selected : "";
  };

  const populateStaffOrgTypeOptions = (preferredValue = orgTypeInputEl.value) => {
    const selected = normalizeText(preferredValue);
    orgTypeInputEl.innerHTML = "";
    appendSelectOption(orgTypeInputEl, "", "เลือกประเภทองค์กร");
    orgTypeInputEl.options[0].disabled = true;
    getStaffOrgTypeOptions().forEach((group) => appendSelectOption(orgTypeInputEl, group));
    if (selected && !Array.from(orgTypeInputEl.options).some((opt) => opt.value === selected)) {
      appendSelectOption(orgTypeInputEl, selected);
    }
    orgTypeInputEl.value = selected && Array.from(orgTypeInputEl.options).some((opt) => opt.value === selected) ? selected : "";
  };

  const populateStaffOrgNameOptions = (preferredValue = orgNameInputEl.value) => {
    const selected = normalizeText(preferredValue);
    const group = normalizeText(orgTypeInputEl.value);
    orgNameInputEl.innerHTML = "";
    appendSelectOption(orgNameInputEl, "", group ? "เลือกฝ่าย / ชมรม" : "เลือกประเภทองค์กรก่อน");
    orgNameInputEl.options[0].disabled = true;
    getStaffOrgNameOptions(group).forEach((name) => appendSelectOption(orgNameInputEl, name));
    if (selected && !Array.from(orgNameInputEl.options).some((opt) => opt.value === selected)) {
      appendSelectOption(orgNameInputEl, selected);
    }
    orgNameInputEl.value = selected && Array.from(orgNameInputEl.options).some((opt) => opt.value === selected) ? selected : "";
    orgNameInputEl.disabled = !group && orgNameInputEl.options.length <= 1;
  };

  const populateReviewGroupOptions = () => {
    const selected = resetSelectOptions(reviewGroupEl, "ทุกประเภทองค์กร");
    const representativeGroups = collectRepresentativeOrgTypeOptions();
    updateOrgFilterDebugState();
    const groups = representativeGroups.length
      ? representativeGroups
      : requestRows.map((item) => normalizeText(item.organizationType)).filter(Boolean);
    Array.from(new Set(groups)).sort((a, b) => b.localeCompare(a, "th")).forEach((group) => {
      const opt = document.createElement("option");
      opt.value = group;
      opt.textContent = group;
      reviewGroupEl.appendChild(opt);
    });
    reviewGroupEl.value = Array.from(reviewGroupEl.options).some((opt) => opt.value === selected) ? selected : "all";
  };

  const populateReviewOrgOptions = () => {
    const selected = resetSelectOptions(reviewOrgEl, "ทุกฝ่าย / ทุกชมรม");
    const group = normalizeText(reviewGroupEl.value) || "all";
    const representativeNames = group === "all"
      ? collectRepresentativeOrgTypeOptions().flatMap((type) => collectRepresentativeOrgNameOptions(type))
      : collectRepresentativeOrgNameOptions(group);
    updateOrgFilterDebugState();
    const names = representativeNames.length
      ? representativeNames
      : requestRows
        .filter((item) => group === "all" || normalizeText(item.organizationType) === group)
        .map((item) => normalizeText(item.organizationName))
        .filter(Boolean);
    const uniqueNames = representativeNames.length
      ? Array.from(new Set(names))
      : Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "th"));
    uniqueNames.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      reviewOrgEl.appendChild(opt);
    });
    reviewOrgEl.value = Array.from(reviewOrgEl.options).some((opt) => opt.value === selected) ? selected : "all";
  };

  const emitFilterControlChange = (el, eventName = "change") => {
    el?.dispatchEvent(new Event(eventName, { bubbles: true }));
  };

  const resetOrgSummaryFilters = () => {
    orgSummaryRoundEl.value = "all";
    populateOrgSummaryGroupOptions();
    orgSummaryGroupEl.value = "all";
    orgSummarySearchEl.value = "";
    populateOrgSummaryOrgOptions();
    orgSummaryOrgEl.value = "all";
    [orgSummaryRoundEl, orgSummaryGroupEl, orgSummaryOrgEl].forEach(emitFilterControlChange);
    emitFilterControlChange(orgSummarySearchEl, "input");
    updateSummary();
    void renderOrgSummaryChart();
    window.setTimeout(() => window.syncBudgetMobileActionBar?.(), 0);
  };

  const resetReviewFilters = () => {
    reviewRoundEl.value = "all";
    populateReviewGroupOptions();
    reviewGroupEl.value = "all";
    populateReviewOrgOptions();
    reviewOrgEl.value = "all";
    [reviewRoundEl, reviewGroupEl, reviewOrgEl].forEach(emitFilterControlChange);
    renderRows();
    window.setTimeout(() => window.syncBudgetMobileActionBar?.(), 0);
  };

  const getBudgetGroupNames = () => {
    const filterRows = getOrgFilterRows();
    const groups = filterRows.length
      ? filterRows.map((item) => normalizeText(item?.group)).filter(Boolean)
      : requestRows.map((item) => normalizeText(item.organizationType)).filter(Boolean);
    return Array.from(new Set(groups)).sort((a, b) => b.localeCompare(a, "th"));
  };

  const getBudgetGroupRecommendationMap = () => {
    const orgGroupMap = getOrgGroupMap(getRepresentativeCatalogAcademicYear());
    const groupTotals = new Map();
    const editingRoundId = buildBudgetRoundId(roundYearInputEl.value, roundNoInputEl.value);
    requestRows.forEach((item) => {
      if (normalizeText(item.requestType || "budget_approval") !== "budget_approval") return;
      if (editingRoundId && normalizeText(item.budgetRoundId) !== editingRoundId) return;
      const orgName = normalizeText(item.organizationName) || "-";
      const group = orgGroupMap.get(orgName) || normalizeText(item.organizationType);
      if (!group) return;
      groupTotals.set(group, (groupTotals.get(group) || 0) + Number(item.estimatedExpense || 0));
    });
    const totalRequested = Array.from(groupTotals.values()).reduce((sum, amount) => sum + amount, 0);
    return Object.fromEntries(
      getBudgetGroupNames().map((group) => {
        const requested = Number(groupTotals.get(group) || 0);
        const recommended = budgetCeiling > 0 && totalRequested > 0
          ? (budgetCeiling * requested) / totalRequested
          : 0;
        return [group, { requested, recommended }];
      })
    );
  };

  const renderBudgetGroupCeilingInputs = () => {
    const groups = getBudgetGroupNames();
    const recommendations = getBudgetGroupRecommendationMap();
    groupCeilingListEl.innerHTML = groups.length
      ? groups.map((group) => `
        <div class="budget-staff-group-ceiling-row">
          <div>
            <label class="login-label" for="budgetGroupCeiling-${escapeHtml(group)}">${escapeHtml(group)}</label>
            <div class="card-caption">
              ${recommendations[group]?.recommended > 0
                ? `แนะนำเพดาน ${formatMoney(recommendations[group].recommended)} บาท จากยอดขอ ${formatMoney(recommendations[group].requested)} บาท`
                : "แนะนำได้เมื่อมีเพดานรวมและยอดคำขอ"}
            </div>
          </div>
          <input
            id="budgetGroupCeiling-${escapeHtml(group)}"
            class="login-input"
            type="text"
            inputmode="decimal"
            placeholder="ไม่กำหนด"
            data-budget-group-ceiling="${escapeHtml(group)}"
            value="${budgetGroupCeilings[group] > 0 ? escapeHtml(formatMoneyInputValue(budgetGroupCeilings[group])) : ""}"
          />
        </div>
      `).join("")
      : '<div class="section-text-sm">ยังไม่มีข้อมูลประเภทองค์กร</div>';
  };

  const clearRoundSettingsForm = () => {
    editingBudgetRoundId = "";
    budgetRoundYear = getCurrentBudgetAcademicYear();
    budgetRoundNo = "";
    budgetCeiling = 0;
    budgetGroupCeilings = {};
    roundYearInputEl.value = budgetRoundYear;
    roundNoInputEl.value = "";
    deadlineInputEl.value = "";
    deadlineTimeInputEl.value = "";
    ceilingInputEl.value = "";
    populateStaffRoundOptions("");
    renderBudgetGroupCeilingInputs();
    syncRoundStatus();
  };

  const readBudgetGroupCeilingsFromInputs = () => {
    const next = {};
    const inputs = Array.from(groupCeilingListEl.querySelectorAll("[data-budget-group-ceiling]"));
    for (const input of inputs) {
      const group = normalizeText(input.getAttribute("data-budget-group-ceiling"));
      const ceiling = readMoneyInput(input.value);
      if (!Number.isFinite(ceiling) || ceiling < 0) {
        input.focus();
        return { ok: false, message: `เพดานย่อยของ ${group || "ฝ่ายใหญ่"} ต้องเป็นตัวเลขที่ไม่ติดลบ` };
      }
      if (group && ceiling > 0) next[group] = ceiling;
    }
    return { ok: true, value: next };
  };

  const validateBudgetGroupCeilingTotal = (groupCeilings, ceiling) => {
    const groupTotal = Object.values(groupCeilings || {}).reduce((sum, amount) => sum + Number(amount || 0), 0);
    if (groupTotal <= 0) return { ok: true, groupTotal };
    if (ceiling <= 0) {
      return { ok: false, groupTotal, message: "กรุณากำหนดเพดานงบประมาณรวมก่อนกำหนดเพดานย่อย" };
    }
    if (groupTotal > ceiling) {
      return {
        ok: false,
        groupTotal,
        message: `ผลรวมเพดานย่อย ${formatMoney(groupTotal)} บาท เกินเพดานรวม ${formatMoney(ceiling)} บาท ควรลดเพดานย่อยรวมอีก ${formatMoney(groupTotal - ceiling)} บาท`
      };
    }
    return { ok: true, groupTotal };
  };

  const refreshOrgSummaryFilters = async () => {
    if (typeof loadOrgFilters === "function") {
      try { await loadOrgFilters(); } catch (_) {}
    }
    populateRoundOptions(orgSummaryRoundEl, { includeRequestRows: false });
    populateRoundOptions(reviewRoundEl);
    populateStaffRoundOptions();
    populateOrgSummaryGroupOptions();
    populateOrgSummaryOrgOptions();
    populateStaffOrgTypeOptions();
    populateStaffOrgNameOptions();
    populateReviewGroupOptions();
    populateReviewOrgOptions();
    renderBudgetGroupCeilingInputs();
    updateSummary();
    void renderOrgSummaryChart();
  };

  const sortForDisplay = (rows) => {
    const statusOrder = { pending: 0, reviewing: 1, approved: 2, rejected: 3, cancelled: 4 };
    return rows.slice().sort((a, b) => {
      const statusA = normalizeText(a.status || "pending").toLowerCase();
      const statusB = normalizeText(b.status || "pending").toLowerCase();
      const orderA = statusOrder[statusA] ?? 9;
      const orderB = statusOrder[statusB] ?? 9;
      if (orderA !== orderB) return orderA - orderB;

      const dateA = Date.parse(`${toDateOnlyText(a.operationEndDate || "")}T00:00:00`) || 0;
      const dateB = Date.parse(`${toDateOnlyText(b.operationEndDate || "")}T00:00:00`) || 0;
      if (dateA !== dateB) return dateA - dateB;

      return getCreatedAtTime(b) - getCreatedAtTime(a);
    });
  };

  const setMessage = (el, text, color = "#374151") => {
    if (!el) return;
    el.textContent = text || "";
    el.style.color = color;
  };

  const setCodeActionBusy = (isBusy) => {
    runCodeBtnEl.disabled = isBusy;
    clearCodeBtnEl.disabled = isBusy;
  };

  const getActivePageName = () => document.querySelector(".page-view.active")?.dataset.page || "";

  const isBudgetMobileViewport = () =>
    !window.matchMedia || window.matchMedia("(max-width: 840px)").matches;

  const setActiveTab = (tab = "overview") => {
    const nextTab = tab === "review" ? "review" : "overview";
    currentBudgetStaffTab = nextTab;
    pageRootEl?.classList.toggle("is-budget-review-mode", nextTab === "review");
    pageRootEl?.classList.toggle("is-budget-overview-mode", nextTab === "overview");
    tabBtnEls.forEach((btn) => {
      const isActive = btn.getAttribute("data-budget-staff-tab") === nextTab;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    tabPanelEls.forEach((panel) => {
      const isActive = panel.getAttribute("data-budget-staff-panel") === nextTab;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
    if (nextTab === "overview") {
      window.setTimeout(() => { void renderOrgSummaryChart(); }, 0);
    }
  };

  const getFirestore = () => window.sgcuFirestore || {};

  const initBudgetMobileActionBar = () => {
    if (!pageRootEl || !mobileActionBarEl || !mobileActionBtnEls.length) return;

    const sheet = document.createElement("div");
    sheet.className = "mobile-filter-sheet mobile-budget-filter-sheet";
    sheet.setAttribute("aria-hidden", "true");
    sheet.innerHTML = `
      <div class="mobile-filter-backdrop" data-budget-filter-close></div>
      <section class="mobile-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="budgetMobileFilterTitle">
        <header class="mobile-filter-header">
          <div>
            <h2 id="budgetMobileFilterTitle" class="mobile-filter-title">ตัวกรองรายการคำขอ</h2>
            <p class="mobile-filter-caption">กรองตามรอบรับคำขอ ประเภทองค์กร หรือฝ่าย/ชมรม</p>
          </div>
          <button class="mobile-filter-close" type="button" aria-label="ปิดตัวกรอง" data-budget-filter-close>×</button>
        </header>
        <div class="mobile-filter-body"></div>
        <footer class="mobile-filter-footer">
          <button class="btn-ghost mobile-filter-reset" type="button">ล้างตัวกรอง</button>
          <button class="btn-primary mobile-filter-done" type="button">เสร็จ</button>
        </footer>
      </section>
    `;
    document.body.appendChild(sheet);

    const sheetBody = sheet.querySelector(".mobile-filter-body");
    const sheetTitle = sheet.querySelector(".mobile-filter-title");
    const sheetCaption = sheet.querySelector(".mobile-filter-caption");
    const resetBtn = sheet.querySelector(".mobile-filter-reset");
    const doneBtn = sheet.querySelector(".mobile-filter-done");
    let activeFilterPlaceholder = null;
    let activeFilterTarget = null;
    let activeAction = "overview";
    let syncQueued = false;

    const scrollToBudgetTarget = (target) => {
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const getFilterCount = () => {
      const useReviewFilters = currentBudgetStaffTab === "review";
      const roundValue = normalizeText((useReviewFilters ? reviewRoundEl : orgSummaryRoundEl).value || "all");
      const groupValue = normalizeText((useReviewFilters ? reviewGroupEl : orgSummaryGroupEl).value || "all");
      const orgValue = normalizeText((useReviewFilters ? reviewOrgEl : orgSummaryOrgEl).value || "all");
      const searchValue = useReviewFilters ? "" : getOrgSummarySearchQuery();
      return [roundValue !== "all", groupValue !== "all", orgValue !== "all", !!searchValue].filter(Boolean).length;
    };

    const sync = () => {
      const activePage = getActivePageName();
      const isBudgetPage = activePage === "budget-approval-staff";
      mobileActionBarEl.classList.toggle("is-visible", isBudgetPage);

      if (!isBudgetPage && sheet.classList.contains("is-open")) {
        closeBudgetFilterSheet();
        return;
      }
      if (!isBudgetMobileViewport() && sheet.classList.contains("is-open")) {
        closeBudgetFilterSheet();
        return;
      }

      mobileActionBtnEls.forEach((btn) => {
        const action = btn.dataset.budgetMobileAction;
        const isActive =
          (action === "overview" && currentBudgetStaffTab === "overview") ||
          (action === "review" && currentBudgetStaffTab === "review");
        btn.classList.toggle("is-active", isActive);
        btn.classList.remove("has-active-filters");
        btn.dataset.filterCount = "";
      });

      const filterBtn = mobileActionBtnEls.find((btn) => btn.dataset.budgetMobileAction === "filters");
      if (filterBtn) {
        const count = getFilterCount();
        filterBtn.classList.toggle("has-active-filters", count > 0);
        filterBtn.dataset.filterCount = count ? String(count) : "";
        filterBtn.setAttribute(
          "aria-label",
          count ? `เปิดตัวกรองรายการคำขอ (${count} รายการใช้งานอยู่)` : "เปิดตัวกรองรายการคำขอ"
        );
      }
    };

    const queueSync = () => {
      if (syncQueued) return;
      syncQueued = true;
      window.requestAnimationFrame(() => {
        syncQueued = false;
        sync();
      });
    };

    const getCurrentFilterTarget = () =>
      currentBudgetStaffTab === "review" ? reviewFiltersEl : overviewFiltersEl;

    const setBudgetFilterSheetCopy = () => {
      if (currentBudgetStaffTab === "review") {
        if (sheetTitle) sheetTitle.textContent = "ตัวกรองรายการคำขอ";
        if (sheetCaption) sheetCaption.textContent = "กรองตามรอบรับคำขอ ประเภทองค์กร หรือฝ่าย/ชมรม";
      } else {
        if (sheetTitle) sheetTitle.textContent = "ตัวกรองภาพรวม";
        if (sheetCaption) sheetCaption.textContent = "กรองภาพรวมตามรอบรับคำขอ ประเภทองค์กร หรือฝ่าย/ชมรม";
      }
    };

    function closeBudgetFilterSheet() {
      if (activeFilterPlaceholder && activeFilterTarget) {
        activeFilterPlaceholder.parentNode?.insertBefore(activeFilterTarget, activeFilterPlaceholder);
        activeFilterPlaceholder.remove();
        activeFilterPlaceholder = null;
        activeFilterTarget.removeAttribute("data-mobile-filter-mounted");
        activeFilterTarget.style.removeProperty("display");
        activeFilterTarget = null;
      }
      sheet.classList.remove("is-open");
      sheet.setAttribute("aria-hidden", "true");
      document.body.classList.remove("mobile-filter-open");
      queueSync();
    }

    const openBudgetFilterSheet = () => {
      const filterTarget = getCurrentFilterTarget();
      activeAction = currentBudgetStaffTab;
      setBudgetFilterSheetCopy();
      scrollToBudgetTarget(
        currentBudgetStaffTab === "review"
          ? pageRootEl.querySelector(".budget-staff-list-panel")
          : pageRootEl.querySelector(".budget-staff-summary-panel")
      );

      if (!filterTarget || !sheetBody) return;
      if (!isBudgetMobileViewport()) {
        scrollToBudgetTarget(filterTarget);
        return;
      }

      closeBudgetFilterSheet();
      activeFilterTarget = filterTarget;
      activeFilterPlaceholder = document.createComment("budget-mobile-filter-placeholder");
      filterTarget.parentNode?.insertBefore(activeFilterPlaceholder, filterTarget);
      filterTarget.setAttribute("data-mobile-filter-mounted", "true");
      sheetBody.appendChild(filterTarget);
      filterTarget.style.display = "grid";
      sheet.classList.add("is-open");
      sheet.setAttribute("aria-hidden", "false");
      document.body.classList.add("mobile-filter-open");
      window.setTimeout(() => {
        filterTarget.querySelector("select, input, textarea, button")?.focus?.({ preventScroll: true });
      }, 260);
      queueSync();
    };

    const resetBudgetFilters = () => {
      const resetTarget = activeFilterTarget === reviewFiltersEl
        ? "review"
        : activeFilterTarget === overviewFiltersEl
          ? "overview"
          : currentBudgetStaffTab;
      if (resetTarget === "review") {
        resetReviewFilters();
      } else {
        resetOrgSummaryFilters();
      }
      window.setTimeout(queueSync, 0);
    };

    mobileActionBtnEls.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.budgetMobileAction || "overview";
        if (action === "filters") {
          openBudgetFilterSheet();
          return;
        }
        if (action === "export") {
          setActiveTab("review");
          closeBudgetFilterSheet();
          exportCsvBtnEl?.click();
          window.setTimeout(queueSync, 0);
          return;
        }
        closeBudgetFilterSheet();
        activeAction = action;
        if (action === "review") {
          setActiveTab("review");
        } else {
          setActiveTab("overview");
        }
        scrollToBudgetTarget(pageRootEl.querySelector(".page-header-flex"));
        window.setTimeout(queueSync, 0);
      });
    });

    sheet.querySelectorAll("[data-budget-filter-close]").forEach((btn) => {
      btn.addEventListener("click", closeBudgetFilterSheet);
    });
    doneBtn?.addEventListener("click", closeBudgetFilterSheet);
    resetBtn?.addEventListener("click", resetBudgetFilters);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sheet.classList.contains("is-open")) {
        closeBudgetFilterSheet();
      }
    });

    [orgSummaryRoundEl, orgSummaryGroupEl, orgSummaryOrgEl, orgSummarySearchEl, reviewRoundEl, reviewGroupEl, reviewOrgEl].forEach((el) => {
      el.addEventListener("input", queueSync);
      el.addEventListener("change", () => window.setTimeout(queueSync, 0));
    });

    document.querySelectorAll(".page-view").forEach((pageEl) => {
      const pageObserver = new MutationObserver(queueSync);
      pageObserver.observe(pageEl, { attributes: true, attributeFilter: ["class"] });
    });
    window.addEventListener("resize", queueSync);
    window.syncBudgetMobileActionBar = sync;
    sync();
  };

  const setFormMode = (id = "") => {
    editingId = normalizeText(id);
    const isEdit = !!editingId;
    saveBtnEl.textContent = isEdit ? "บันทึกการแก้ไข" : "เพิ่มรายการ";
    cancelEditBtnEl.hidden = !isEdit;
    deleteEditBtnEl.hidden = !isEdit;
  };

  const resetForm = () => {
    formEl.reset();
    populateStaffRoundOptions("");
    populateStaffOrgTypeOptions("");
    populateStaffOrgNameOptions("");
    studentOperatorsInputEl.value = "0";
    studentParticipantsInputEl.value = "0";
    requestedAmountInputEl.value = "";
    approvedAmountInputEl.value = "0.00";
    statusInputEl.value = "pending";
    setFormMode("");
    setMessage(formMessageEl, "");
  };

  const getSelectedStaffRound = () => {
    const selectedId = normalizeText(staffRoundInputEl.value);
    const selectedRound = budgetActiveRounds.find((round) => round.id === selectedId);
    if (selectedRound) {
      return {
        id: selectedRound.id,
        year: selectedRound.year,
        roundNo: selectedRound.roundNo
      };
    }
    const year = normalizeAcademicYearText(budgetRoundYear || roundYearInputEl.value);
    const roundNo = normalizeRoundName(budgetRoundNo || roundNoInputEl.value);
    return {
      id: selectedId || buildBudgetRoundId(year, roundNo),
      year,
      roundNo
    };
  };

  const getSelectedStaffRoundMeta = () => {
    const selectedId = normalizeText(staffRoundInputEl.value);
    return budgetActiveRounds.find((round) => round.id === selectedId) || null;
  };

  const syncStaffRoundMessage = () => {
    const round = getSelectedStaffRoundMeta();
    if (!round) return;
    const actionText = editingId ? "รายการนี้กำลังแก้ไขใน" : "รายการใหม่จะถูกบันทึกใน";
    const stateText = isBudgetRoundPast(round) ? "รอบนี้หมดเขตแล้ว" : "รอบนี้ยังเปิดรับอยู่";
    setMessage(formMessageEl, `${actionText}${round.label} (${stateText})`, isBudgetRoundPast(round) ? "#b45309" : "#1d4ed8");
  };

  const readFormPayload = () => {
    const selectedRound = getSelectedStaffRound();
    const selectedOrg = resolveStaffSelectedOrg(orgTypeInputEl.value, orgNameInputEl.value, selectedRound.year);
    return {
      organizationType: selectedOrg.organizationType || normalizeText(orgTypeInputEl.value),
      organizationName: selectedOrg.organizationName || normalizeText(orgNameInputEl.value),
      organizationId: selectedOrg.organizationId || "",
      organizationCatalogId: selectedOrg.organizationId || "",
      baseOrganizationId: selectedOrg.baseOrganizationId || "",
      organizationCode: selectedOrg.organizationCode || "",
      organizationDocumentRunCode: selectedOrg.organizationDocumentRunCode || "",
      projectName: normalizeText(projectNameInputEl.value),
      description: normalizeText(descriptionInputEl.value),
      activityLocation: normalizeText(activityLocationInputEl.value),
      prepStartDate: toDateOnlyText(prepStartDateInputEl.value),
      operationEndDate: toDateOnlyText(operationEndDateInputEl.value),
      studentOperators: Number(studentOperatorsInputEl.value || 0),
      studentParticipants: Number(studentParticipantsInputEl.value || 0),
      estimatedExpense: readMoneyInput(requestedAmountInputEl.value),
      approvedAmount: readMoneyInput(approvedAmountInputEl.value),
      status: normalizeText(statusInputEl.value).toLowerCase() || "pending",
      budgetRoundYear: selectedRound.year,
      budgetRoundNo: selectedRound.roundNo,
      budgetRoundId: selectedRound.id
    };
  };

  const validateForm = () => {
    const controls = [
      staffRoundInputEl,
      orgTypeInputEl,
      orgNameInputEl,
      projectNameInputEl,
      activityLocationInputEl,
      prepStartDateInputEl,
      operationEndDateInputEl,
      studentOperatorsInputEl,
      studentParticipantsInputEl,
      requestedAmountInputEl,
      approvedAmountInputEl,
      statusInputEl,
      descriptionInputEl
    ];
    const invalid = controls.find((el) => !el.reportValidity());
    if (invalid) return false;

    const validateWholeNumber = (inputEl, label) => {
      const value = Number(inputEl.value || 0);
      const isValid = Number.isInteger(value) && value >= 0;
      inputEl.setCustomValidity(isValid ? "" : `${label}ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`);
      const ok = inputEl.reportValidity();
      inputEl.setCustomValidity("");
      return ok;
    };

    if (!validateWholeNumber(studentOperatorsInputEl, "จำนวนนิสิตผู้ปฏิบัติงาน")) return false;
    if (!validateWholeNumber(studentParticipantsInputEl, "จำนวนนิสิตผู้เข้าร่วมงาน")) return false;

    const requestedAmount = readMoneyInput(requestedAmountInputEl.value);
    const approvedAmount = readMoneyInput(approvedAmountInputEl.value);
    if (!Number.isFinite(requestedAmount) || !Number.isFinite(approvedAmount) || requestedAmount < 0 || approvedAmount < 0) {
      setMessage(formMessageEl, "ยอดเงินต้องไม่ติดลบ", "#b91c1c");
      return false;
    }

    const selectedRound = getSelectedStaffRound();
    if (!selectedRound.id || !selectedRound.year || !selectedRound.roundNo) {
      setMessage(formMessageEl, "กรุณาเลือกรอบรับคำขอก่อนบันทึกรายการ", "#b91c1c");
      return false;
    }
    if (normalizeAcademicYearText(selectedRound.year) !== getCurrentBudgetAcademicYear()) {
      setMessage(formMessageEl, `บันทึกคำขอได้เฉพาะรอบปีการศึกษา ${getCurrentBudgetAcademicYear()}`, "#b91c1c");
      return false;
    }

    const startTime = getDateOnlyTime(prepStartDateInputEl.value, Number.NaN);
    const endTime = getDateOnlyTime(operationEndDateInputEl.value, Number.NaN);
    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
      setMessage(formMessageEl, "วันสุดท้ายปฏิบัติงานต้องไม่ก่อนวันเริ่มเตรียมงาน", "#b91c1c");
      operationEndDateInputEl.focus();
      return false;
    }

    return true;
  };

  const getOrgGroupMap = (academicYear = getCurrentBudgetAcademicYear()) => {
    const map = new Map();
    getOrgCatalogRowsForYear(academicYear).forEach((item) => {
      const name = normalizeText(item?.name);
      const group = normalizeText(item?.group);
      if (name && group) map.set(name, group);
    });
    return map;
  };

  const getOrgSummarySearchQuery = () =>
    normalizeText(orgSummarySearchEl.value).toLowerCase();

  const matchesOrgSummarySearch = (orgName = "", group = "") => {
    const query = getOrgSummarySearchQuery();
    if (!query) return true;
    return `${normalizeText(orgName)} ${normalizeText(group)}`.toLowerCase().includes(query);
  };

  const getOverviewFilteredRows = () => {
    const roundFilter = normalizeText(orgSummaryRoundEl.value) || "all";
    const groupFilter = normalizeText(orgSummaryGroupEl.value) || "all";
    const orgFilter = normalizeText(orgSummaryOrgEl.value) || "all";
    const orgGroupMap = getOrgGroupMap(getRepresentativeCatalogAcademicYear());
    return requestRows.filter((item) => {
      if (normalizeText(item.requestType || "budget_approval") !== "budget_approval") return false;
      if (roundFilter !== "all" && normalizeText(item.budgetRoundId) !== roundFilter) return false;
      const orgName = normalizeText(item.organizationName) || "-";
      const group = normalizeText(item.organizationType) || orgGroupMap.get(orgName);
      if (groupFilter !== "all" && group !== groupFilter) return false;
      if (orgFilter !== "all" && orgName !== orgFilter) return false;
      if (!matchesOrgSummarySearch(orgName, group)) return false;
      return true;
    });
  };

  const getReviewFilteredRows = () => {
    const roundFilter = normalizeText(reviewRoundEl.value) || "all";
    const groupFilter = normalizeText(reviewGroupEl.value) || "all";
    const orgFilter = normalizeText(reviewOrgEl.value) || "all";
    const orgGroupMap = getOrgGroupMap(getRepresentativeCatalogAcademicYear());
    return requestRows.filter((item) => {
      if (normalizeText(item.requestType || "budget_approval") !== "budget_approval") return false;
      if (roundFilter !== "all" && normalizeText(item.budgetRoundId) !== roundFilter) return false;
      const orgName = normalizeText(item.organizationName) || "-";
      const group = normalizeText(item.organizationType) || orgGroupMap.get(orgName);
      if (groupFilter !== "all" && group !== groupFilter) return false;
      if (orgFilter !== "all" && orgName !== orgFilter) return false;
      return true;
    });
  };

  const getSelectedOverviewGroup = () => {
    const groupFilter = normalizeText(orgSummaryGroupEl.value) || "all";
    const orgFilter = normalizeText(orgSummaryOrgEl.value) || "all";
    if (groupFilter !== "all") return groupFilter;
    if (orgFilter === "all") return "";
    const orgGroupMap = getOrgGroupMap(getRepresentativeCatalogAcademicYear());
    const mappedGroup = orgGroupMap.get(orgFilter);
    const matchedRow = requestRows.find((item) => normalizeText(item.organizationName) === orgFilter);
    return normalizeText(matchedRow?.organizationType) || mappedGroup || "";
  };

  const getSelectedOverviewCeiling = () => {
    const roundFilter = normalizeText(orgSummaryRoundEl.value) || "all";
    const selectedGroup = getSelectedOverviewGroup();
    const selectedRounds = roundFilter === "all"
      ? budgetActiveRounds
      : budgetActiveRounds.filter((round) => round.id === roundFilter);
    if (selectedRounds.length) {
      if (selectedGroup) {
        const groupAmounts = selectedRounds.map((round) => Number(round.budgetGroupCeilings?.[selectedGroup] || 0));
        const groupAmount = groupAmounts.reduce((sum, amount) => sum + amount, 0);
        const missingCount = groupAmounts.filter((amount) => amount <= 0).length;
        if (groupAmount > 0 && !missingCount) {
          return {
            amount: groupAmount,
            label: `${roundFilter === "all" ? "เพดานย่อยรวมทุกรอบ" : "เพดานย่อย"} ${selectedGroup}`,
            complete: true
          };
        }
        return {
          amount: groupAmount,
          label: `${roundFilter === "all" ? "เพดานย่อยรวมทุกรอบ" : "เพดานย่อย"} ${selectedGroup}`,
          complete: false,
          missingCount,
          message: roundFilter === "all"
            ? `ยังมี ${missingCount.toLocaleString("th-TH")} รอบที่ยังไม่ได้กำหนดเพดานย่อยของ ${selectedGroup} จึงยังไม่สามารถคำนวณคำแนะนำรวมทุกรอบได้`
            : `ยังไม่ได้กำหนดเพดานย่อยของ ${selectedGroup} สำหรับรอบนี้`
        };
      }
      const roundAmounts = selectedRounds.map((round) => Number(round.budgetCeiling || 0));
      const roundAmount = roundAmounts.reduce((sum, amount) => sum + amount, 0);
      const missingCount = roundAmounts.filter((amount) => amount <= 0).length;
      if (missingCount) {
        return {
          amount: roundAmount,
          label: roundFilter === "all" ? "เพดานรวมทุกรอบ" : `เพดาน ${selectedRounds[0]?.label || ""}`.trim(),
          complete: false,
          missingCount,
          message: roundFilter === "all"
            ? `ยังมี ${missingCount.toLocaleString("th-TH")} รอบที่ยังไม่ได้กำหนดเพดานงบ จึงยังไม่สามารถคำนวณคำแนะนำรวมทุกรอบได้`
            : "ยังไม่ได้กำหนดเพดานงบสำหรับรอบนี้"
        };
      }
      return {
        amount: roundAmount,
        label: roundFilter === "all" ? "เพดานรวมทุกรอบ" : `เพดาน ${selectedRounds[0]?.label || ""}`.trim(),
        complete: true
      };
    }
    if (selectedGroup && Number(budgetGroupCeilings[selectedGroup] || 0) > 0) {
      return {
        amount: Number(budgetGroupCeilings[selectedGroup] || 0),
        label: `เพดานย่อย ${selectedGroup}`,
        complete: true
      };
    }
    return {
      amount: Number(budgetCeiling || 0),
      label: "เพดานรวม",
      complete: Number(budgetCeiling || 0) > 0,
      message: "กำหนดเพดานงบเพื่อให้ระบบคำนวณคำแนะนำ"
    };
  };

  const getOrgSummaryGroupCeiling = (group = "") => {
    const groupName = normalizeText(group);
    if (!groupName) return 0;
    const roundFilter = normalizeText(orgSummaryRoundEl.value) || "all";
    const selectedRounds = roundFilter === "all"
      ? budgetActiveRounds
      : budgetActiveRounds.filter((round) => round.id === roundFilter);
    const roundGroupAmount = selectedRounds.reduce((sum, round) =>
      sum + Number(round.budgetGroupCeilings?.[groupName] || 0), 0);
    if (roundGroupAmount > 0) return roundGroupAmount;
    return Number(budgetGroupCeilings[groupName] || 0);
  };

  const getConsiderationAmount = (item) => {
    const status = normalizeText(item?.status || "pending").toLowerCase();
    const requestedAmount = Number(item?.estimatedExpense || 0);
    const approvedAmount = Number(item?.approvedAmount || 0);
    if ((status === "pending" || status === "reviewing") && approvedAmount <= 0) {
      return requestedAmount;
    }
    return approvedAmount;
  };

  const updateSummary = () => {
    const activeRows = getOverviewFilteredRows();
    const orgSet = new Set(activeRows.map((item) => `${normalizeText(item.organizationType)}::${normalizeText(item.organizationName)}`).filter((key) => key !== "::"));
    const requestedSum = activeRows.reduce((sum, item) => sum + Number(item.estimatedExpense || 0), 0);
    const approvedSum = activeRows.reduce((sum, item) => sum + Number(item.approvedAmount || 0), 0);
    const selectedCeiling = getSelectedOverviewCeiling();
    const hasCompleteCeiling = selectedCeiling.complete !== false && Number(selectedCeiling.amount || 0) > 0;
    const effectiveCeiling = hasCompleteCeiling ? selectedCeiling.amount : 0;
    const considerationSum = activeRows.reduce((sum, item) => sum + getConsiderationAmount(item), 0);
    const reductionNeeded = effectiveCeiling > 0 ? Math.max(considerationSum - effectiveCeiling, 0) : 0;
    const reductionPercent = considerationSum > 0 ? (reductionNeeded * 100) / considerationSum : 0;
    const remainingCeiling = effectiveCeiling > 0 ? Math.max(effectiveCeiling - considerationSum, 0) : 0;

    orgCountEl.textContent = orgSet.size.toLocaleString("th-TH");
    projectCountEl.textContent = activeRows.length.toLocaleString("th-TH");
    requestedTotalEl.textContent = formatMoney(requestedSum);
    approvedTotalEl.textContent = formatMoney(approvedSum);
    ceilingTotalEl.textContent = effectiveCeiling > 0
      ? formatMoney(effectiveCeiling)
      : Number(selectedCeiling.amount || 0) > 0
        ? `ขาด ${Number(selectedCeiling.missingCount || 0).toLocaleString("th-TH")} รอบ`
        : "ยังไม่กำหนด";
    reductionNeededEl.textContent = formatMoney(reductionNeeded);
    if (!hasCompleteCeiling) {
      reductionCaptionEl.textContent = selectedCeiling.message || "กำหนดเพดานงบเพื่อให้ระบบคำนวณคำแนะนำ";
    } else if (reductionNeeded > 0) {
      reductionCaptionEl.textContent = `${selectedCeiling.label}: ต้องลดยอดหลังพิจารณา ${formatMoney(reductionNeeded)} บาท (${reductionPercent.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%) ให้เหลือไม่เกิน ${formatMoney(effectiveCeiling)} บาท`;
    } else {
      reductionCaptionEl.textContent = `${selectedCeiling.label}: ยอดหลังพิจารณารวมยังอยู่ในเพดาน เหลือ ${formatMoney(remainingCeiling)} บาท`;
    }

    const pendingCount = activeRows.filter((item) => normalizeText(item.status || "pending").toLowerCase() === "pending").length;
    const reviewingCount = activeRows.filter((item) => normalizeText(item.status || "pending").toLowerCase() === "reviewing").length;
    const roundFilter = normalizeText(orgSummaryRoundEl.value) || "all";
    const groupFilter = normalizeText(orgSummaryGroupEl.value) || "all";
    const orgFilter = normalizeText(orgSummaryOrgEl.value) || "all";
    const orgFilterText = orgFilter !== "all"
      ? orgFilter
      : groupFilter !== "all"
        ? groupFilter
        : "ทุกประเภทองค์กร";
    const roundText = roundFilter !== "all" ? getRoundLabelById(roundFilter) : "ทุกรอบ";
    const searchText = getOrgSummarySearchQuery() ? " • ตามคำค้น" : "";
    summaryCaptionEl.textContent = `แสดง ${activeRows.length} โครงการ • รออนุมัติ ${pendingCount} โครงการ • กำลังพิจารณา ${reviewingCount} โครงการ • ${roundText} • ${orgFilterText}${searchText}`;
  };

  const buildOrgSummaryRows = () => {
    const groupFilter = normalizeText(orgSummaryGroupEl.value) || "all";
    const orgFilter = normalizeText(orgSummaryOrgEl.value) || "all";
    const isGlobalView = groupFilter === "all" && orgFilter === "all";
    const roundFilter = normalizeText(orgSummaryRoundEl.value) || "all";
    const orgGroupMap = getOrgGroupMap(getRepresentativeCatalogAcademicYear());
    const grouped = new Map();
    requestRows.forEach((item) => {
      if (normalizeText(item.requestType || "budget_approval") !== "budget_approval") return;
      if (roundFilter !== "all" && normalizeText(item.budgetRoundId) !== roundFilter) return;
      const status = normalizeText(item.status || "pending").toLowerCase();
      const orgName = normalizeText(item.organizationName) || "-";
      const group = normalizeText(item.organizationType) || orgGroupMap.get(orgName);
      if (groupFilter !== "all" && group !== groupFilter) return;
      if (orgFilter !== "all" && orgName !== orgFilter) return;
      if (!matchesOrgSummarySearch(orgName, group)) return;
      const key = isGlobalView ? (group || "ไม่ระบุประเภทองค์กร") : orgName;
      const row = grouped.get(key) || {
        organizationName: key,
        organizationType: group,
        summaryLevel: isGlobalView ? "group" : "organization",
        projects: 0,
        pending: 0,
        requested: 0,
        activeRequested: 0,
        considerationAmount: 0,
        approved: 0,
        reviewing: 0,
        difference: 0
      };
      const requestedAmount = Number(item.estimatedExpense || 0);
      const approvedAmount = Number(item.approvedAmount || 0);
      row.projects += 1;
      row.requested += requestedAmount;
      if (!isExcludedFromBudgetOrgChart(item)) {
        row.activeRequested += requestedAmount;
        row.considerationAmount += getConsiderationAmount(item);
        if (status === "pending") row.pending += 1;
        if (status === "reviewing") row.reviewing += Math.max(requestedAmount - approvedAmount, 0);
        if (status !== "reviewing" && approvedAmount <= 0) row.difference += requestedAmount;
        row.approved += approvedAmount;
      }
      grouped.set(key, row);
    });
    return Array.from(grouped.values()).map((row) => ({
      ...row,
      difference: Math.max(row.difference, 0),
      ceiling: row.summaryLevel === "group" ? getOrgSummaryGroupCeiling(row.organizationName) : 0
    }));
  };

  const getOrgSummaryChartOrder = (isGroupSummary, groupFilter = "", orgFilter = "") => {
    if (isGroupSummary) {
      const groups = collectRepresentativeOrgTypeOptions();
      if (groups.length) return groups;
      return Array.from(new Set(
        requestRows
          .map((item) => normalizeText(item.organizationType))
          .filter(Boolean)
      )).sort((a, b) => b.localeCompare(a, "th"));
    }
    if (orgFilter && orgFilter !== "all") return [orgFilter];
    if (groupFilter && groupFilter !== "all") {
      const names = collectRepresentativeOrgNameOptions(groupFilter);
      if (names.length) return names;
    }
    const groups = collectRepresentativeOrgTypeOptions();
    const names = groups.flatMap((group) => collectRepresentativeOrgNameOptions(group));
    if (names.length) return Array.from(new Set(names));
    return Array.from(new Set(
      requestRows
        .filter((item) => !groupFilter || groupFilter === "all" || normalizeText(item.organizationType) === groupFilter)
        .map((item) => normalizeText(item.organizationName))
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, "th"));
  };

  const compareOrgSummaryRowsByProjectStatusOrder = (rows, isGroupSummary, groupFilter = "", orgFilter = "") => {
    const order = getOrgSummaryChartOrder(isGroupSummary, groupFilter, orgFilter);
    const rankByName = new Map(order.map((name, index) => [name, index]));
    return rows.sort((a, b) => {
      const rankA = rankByName.has(a.organizationName) ? rankByName.get(a.organizationName) : Number.MAX_SAFE_INTEGER;
      const rankB = rankByName.has(b.organizationName) ? rankByName.get(b.organizationName) : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.organizationName.localeCompare(b.organizationName, "th", { numeric: true });
    });
  };

  const wrapBudgetOrgChartLabel = (label, maxChars = 28, maxLines = 2) => {
    const text = normalizeText(label).replace(/\s+/g, " ");
    if (!text || text.length <= maxChars) return text;
    const words = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter("th", { granularity: "word" }).segment(text))
        .map((segment) => segment.segment)
        .filter(Boolean)
      : text.split(/(\s+)/).filter(Boolean);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      if (!word) return;
      const next = current ? `${current}${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current.trim());
        current = word.trim();
      } else {
        current = next;
      }
    });
    if (current) lines.push(current.trim());
    if (lines.length <= maxLines) return lines;
    const visible = lines.slice(0, maxLines);
    visible[visible.length - 1] = `${visible[visible.length - 1]}…`;
    return visible;
  };

  const getBudgetOrgChartAxisLabel = (label) => {
    const isMobile = window.matchMedia?.("(max-width: 720px)")?.matches;
    return wrapBudgetOrgChartLabel(label, isMobile ? 22 : 30, isMobile ? 3 : 2);
  };

  const getBudgetOrgChartWrappedLineCount = (label) => {
    const wrapped = getBudgetOrgChartAxisLabel(label);
    return Array.isArray(wrapped) ? wrapped.length : 1;
  };

  const resizeBudgetOrgSummaryChart = (rows = []) => {
    const container = chartCanvasEl?.parentElement;
    if (!container) return;
    const isMobile = window.matchMedia?.("(max-width: 720px)")?.matches;
    const maxWrappedLines = rows.reduce((max, row) =>
      Math.max(max, getBudgetOrgChartWrappedLineCount(row.organizationName)), 1);
    const baseHeight = isMobile ? 340 : 260;
    const perLabel = isMobile
      ? Math.max(34, 20 + maxWrappedLines * 14)
      : Math.max(28, 16 + maxWrappedLines * 13);
    container.style.height = `${Math.max(baseHeight, rows.length * perLabel)}px`;
    chartInstance?.resize?.();
  };

  window.sgcuRefreshBudgetStaffCharts = () => {
    if (getActivePageName() !== "budget-approval-staff") return;
    if (currentBudgetStaffTab === "overview") {
      void renderOrgSummaryChart();
      return;
    }
    chartInstance?.resize?.();
    chartInstance?.update?.("none");
  };

  const renderOrgSummaryChart = async () => {
    await window.sgcuVendorLoader?.ensureChart?.();
    const groupFilter = normalizeText(orgSummaryGroupEl.value) || "all";
    const orgFilter = normalizeText(orgSummaryOrgEl.value) || "all";
    const isGroupSummary = groupFilter === "all" && orgFilter === "all";
    const summaryUnit = isGroupSummary ? "ประเภทองค์กร" : "องค์กร";
    const allRows = compareOrgSummaryRowsByProjectStatusOrder(buildOrgSummaryRows(), isGroupSummary, groupFilter, orgFilter);
    const rows = allRows.slice();

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    orgSummaryCaptionEl.textContent = allRows.length
      ? `แสดง ${allRows.length.toLocaleString("th-TH")} ${summaryUnit}`
      : "ยังไม่มีข้อมูลคำขอ";

    if (!rows.length || typeof window.Chart !== "function") {
      return;
    }

    const isCompactChart = window.matchMedia?.("(max-width: 720px)")?.matches;
    const yAxisLabelWidth = isCompactChart ? 92 : 170;
    const hasBudgetCeilingMarkers = rows.some((row) => Number(row.ceiling || 0) > 0);
    const getBudgetStackRightRadius = (ctx) => {
      const i = ctx.dataIndex;
      const datasetIndex = ctx.datasetIndex;
      const chart = ctx.chart;
      const datasets = chart?.data?.datasets || [];
      const currentValue = Number(datasets[datasetIndex]?.data?.[i] || 0);
      const stackName = datasets[datasetIndex]?.stack;
      const hasRightSegment = datasets.some((dataset, index) =>
        index > datasetIndex &&
        dataset?.stack === stackName &&
        chart.isDatasetVisible(index) &&
        Number(dataset?.data?.[i] || 0) > 0
      );
      const isRight = currentValue > 0 && !hasRightSegment;
      return {
        topLeft: 0,
        bottomLeft: 0,
        topRight: isRight ? 8 : 0,
        bottomRight: isRight ? 8 : 0
      };
    };
    const budgetCeilingMarkerPlugin = {
      id: "budgetCeilingMarker",
      afterDatasetsDraw(chart) {
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        if (!xScale || !yScale) return;
        const { ctx, chartArea } = chart;
        const barMeta = chart.getDatasetMeta(1);
        ctx.save();
        rows.forEach((row, index) => {
          const ceiling = Number(row.ceiling || 0);
          if (!Number.isFinite(ceiling) || ceiling <= 0) return;
          const x = xScale.getPixelForValue(ceiling);
          if (x < chartArea.left || x > chartArea.right) return;
          const element = barMeta?.data?.[index];
          const centerY = element?.y ?? yScale.getPixelForValue(index);
          const height = Math.max(18, (element?.height || 22) + 6);
          const top = Math.max(chartArea.top, centerY - height / 2);
          const bottom = Math.min(chartArea.bottom, centerY + height / 2);
          const isOver = Number(row.considerationAmount || 0) > ceiling;
          ctx.strokeStyle = isOver ? "#dc2626" : "#334155";
          ctx.fillStyle = isOver ? "#dc2626" : "#334155";
          ctx.lineWidth = 1.5;
          ctx.setLineDash(isOver ? [] : [4, 3]);
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(x, top, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    };

    chartInstance = new window.Chart(chartCanvasEl.getContext("2d"), {
      type: "bar",
      data: {
        labels: rows.map((row) => row.organizationName),
        datasets: [
          {
            label: "ยอดที่ขอ",
            data: rows.map((row) => row.requested),
            backgroundColor: "#f472b6",
            borderRadius: { topRight: 8, bottomRight: 8 },
            borderSkipped: false
          },
          {
            label: "ยอดอนุมัติ",
            data: rows.map((row) => row.approved),
            backgroundColor: "#34d399",
            stack: "budget-total",
            borderRadius: getBudgetStackRightRadius,
            borderSkipped: false
          },
          {
            label: "กำลังพิจารณา",
            data: rows.map((row) => row.reviewing),
            backgroundColor: "#facc15",
            stack: "budget-total",
            borderRadius: getBudgetStackRightRadius,
            borderSkipped: false
          },
          {
            label: "ส่วนที่ยังไม่อนุมัติ",
            data: rows.map((row) => row.difference),
            backgroundColor: "#fbcfe8",
            stack: "budget-total",
            borderRadius: getBudgetStackRightRadius,
            borderSkipped: false
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
          padding: {
            right: isCompactChart ? 6 : 10
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 11 },
              usePointStyle: true,
              boxWidth: 10,
              boxHeight: 10
            }
          },
          tooltip: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            titleColor: "#111827",
            bodyColor: "#374151",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            padding: 10,
            cornerRadius: 6,
            bodyFont: { family: "'Kanit', sans-serif", size: 12 },
            callbacks: {
              label: (item) => {
                const value = Number(item.raw || 0);
                return `${item.dataset.label}: ${formatMoney(value)} บาท`;
              },
              afterBody: (items) => {
                const row = rows[items?.[0]?.dataIndex || 0];
                return [
                  `ยอดขอรวม: ${formatMoney(row?.requested || 0)} บาท`,
                  `ยอดที่ใช้เทียบเพดาน: ${formatMoney(row?.considerationAmount || 0)} บาท`,
                  `ยอดอนุมัติรวม: ${formatMoney(row?.approved || 0)} บาท`,
                  `กำลังพิจารณา: ${formatMoney(row?.reviewing || 0)} บาท`,
                  `ส่วนที่ยังไม่อนุมัติ: ${formatMoney(row?.difference || 0)} บาท`,
                  Number(row?.ceiling || 0) > 0 ? `เพดานงบ: ${formatMoney(row.ceiling)} บาท` : "เพดานงบ: ยังไม่กำหนด",
                  `โครงการ ${Number(row?.projects || 0).toLocaleString("th-TH")} รายการ`
                ];
              }
            }
          },
          externalAxisLabels: {
            y: {
              enabled: true,
              width: yAxisLabelWidth,
              gap: isCompactChart ? 6 : 8,
              formatter: (label) => getBudgetOrgChartAxisLabel(label)
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            suggestedMax: Math.max(
              0,
              ...rows.map((row) => Number(row.requested || 0)),
              ...rows.map((row) => Number(row.considerationAmount || 0)),
              ...rows.map((row) => Number(row.ceiling || 0))
            ),
            ticks: {
              maxTicksLimit: isCompactChart ? 3 : 5,
              padding: isCompactChart ? 8 : 3,
              font: {
                size: isCompactChart ? 11 : 12
              },
              callback: (value) => Number(value || 0).toLocaleString("th-TH")
            }
          },
          y: {
            stacked: true,
            afterFit(scale) {
              scale.width = yAxisLabelWidth;
            },
            ticks: {
              display: false,
              autoSkip: false,
              padding: 6,
              callback(value) {
                return getBudgetOrgChartAxisLabel(this.getLabelForValue(value));
              }
            }
          }
        }
      },
      plugins: [budgetCeilingMarkerPlugin]
    });
    if (hasBudgetCeilingMarkers) {
      orgSummaryCaptionEl.textContent = `${orgSummaryCaptionEl.textContent} • เส้นขีดคือเพดานงบ`;
    }
    resizeBudgetOrgSummaryChart(rows);
  };

  const renderRows = () => {
    if (!requestRows.length) {
      tableBodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#6b7280;">ยังไม่มีรายการคำของบ</td></tr>';
      updateSummary();
      void renderOrgSummaryChart();
      return;
    }

    const rows = getReviewFilteredRows();
    if (!rows.length) {
      tableBodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#6b7280;">ไม่พบรายการตามตัวกรอง</td></tr>';
      updateSummary();
      void renderOrgSummaryChart();
      return;
    }

    tableBodyEl.innerHTML = sortForDisplay(rows).map((item) => {
      const id = escapeHtml(item.id || "");
      const orgName = escapeHtml(item.organizationName || "-");
      const roundLabel = formatBudgetRoundLabel(item.budgetRoundYear, item.budgetRoundNo) || normalizeText(item.budgetRoundId) || "ไม่ระบุรอบ";
      const requested = Number(item.estimatedExpense || 0);
      const approved = Number(item.approvedAmount || 0);
      const status = normalizeText(item.status || "pending").toLowerCase();
      const approvedText = (status === "pending" || status === "reviewing") && !approved ? "-" : formatMoney(approved);
      return `
        <tr class="budget-request-history-row budget-staff-request-row is-editable" data-budget-staff-edit-id="${id}" tabindex="0" title="คลิกเพื่อแก้ไขรายการ">
          <td class="col-code" data-label="รหัสโครงการ"><code class="budget-request-project-code">${escapeHtml(item.projectCodeGenerated || "-")}</code></td>
          <td class="col-project" data-label="รายการโครงการ">
            <div class="budget-request-history-project-name budget-staff-project-name">${escapeHtml(item.projectName || "-")}</div>
            <div class="section-text-sm budget-request-history-project-meta budget-staff-project-meta">
              <span class="budget-staff-org-name">${orgName}</span>
              <span>• ${escapeHtml(roundLabel)}</span>
            </div>
          </td>
          <td class="col-money" data-label="ยอดขอ">${formatMoney(requested)}</td>
          <td class="col-money" data-label="ยอดอนุมัติ">${approvedText}</td>
          <td class="col-status" data-label="สถานะ">${statusBadge(item.status)}</td>
        </tr>
      `;
    }).join("");

    updateSummary();
    void renderOrgSummaryChart();
  };

  const subscribeRequests = () => {
    if (typeof unsubscribeRequests === "function") {
      try { unsubscribeRequests(); } catch (_) {}
      unsubscribeRequests = null;
    }

    const firestore = getFirestore();
    const canRead = !!(firestore.db && firestore.collection && firestore.query && firestore.orderBy && firestore.onSnapshot);
    if (!canRead) {
      tableBodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#6b7280;">ระบบฐานข้อมูลยังไม่พร้อมใช้งาน</td></tr>';
      return;
    }

    const listQuery = firestore.query(
      firestore.collection(firestore.db, COLLECTION_REQUESTS),
      firestore.orderBy("createdAt", "desc"),
      ...(firestore.limit ? [firestore.limit(REQUEST_LIST_LIMIT)] : [])
    );

    unsubscribeRequests = firestore.onSnapshot(listQuery, (snapshot) => {
      const rows = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        if (normalizeText(data.requestType || "budget_approval") !== "budget_approval") return;
        rows.push({ id: docSnap.id, ...data });
      });
      requestRows = rows;
      void refreshOrgSummaryFilters();
      renderRows();
    }, () => {
      tableBodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#b91c1c;">โหลดรายการไม่สำเร็จ</td></tr>';
    });
  };

  const applyBudgetSettings = (data = {}) => {
    budgetSettingsRoundYear = normalizeAcademicYearText(data.budgetRoundYear) || getCurrentBudgetAcademicYear();
    budgetRoundYear = budgetSettingsRoundYear;
    budgetRoundNo = normalizeRoundName(data.budgetRoundNo) || budgetRoundNo;
    representativeApplicationYear = normalizeAcademicYearText(
      data.organizationRepresentativeAcademicYear ||
      data.orgRepresentativeAcademicYear ||
      data.representativeAcademicYear ||
      data.representativeApplicationYear
    );
    budgetActiveRounds = normalizeBudgetActiveRounds(data.budgetActiveRounds, data);
    clearRoundSettingsForm();
    void refreshOrgSummaryFilters();
    renderRows();
  };

  const loadDeadline = () => {
    if (typeof unsubscribeSettings === "function") {
      try {
        unsubscribeSettings();
      } catch (_) {
        // ignore
      }
      unsubscribeSettings = null;
    }

    const firestore = getFirestore();
    const canRead = !!(firestore.db && firestore.doc && firestore.onSnapshot);
    if (!canRead) {
      setMessage(deadlineStatusEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }
    const docRef = firestore.doc(firestore.db, COLLECTION_SETTINGS, SETTINGS_DOC_ID);
    unsubscribeSettings = firestore.onSnapshot(
      docRef,
      (snap) => {
        const data = snap.exists() ? (snap.data() || {}) : {};
        applyBudgetSettings(data);
      },
      () => {
        budgetCeiling = readLocalBudgetCeiling();
        budgetGroupCeilings = readLocalBudgetGroupCeilings();
        ceilingInputEl.value = budgetCeiling > 0 ? formatMoneyInputValue(budgetCeiling) : "";
        renderBudgetGroupCeilingInputs();
        updateSummary();
        syncRoundStatus();
        setMessage(deadlineStatusEl, "โหลดการตั้งค่าไม่สำเร็จ", "#b91c1c");
      }
    );
  };

  const saveDeadline = async () => {
    const firestore = getFirestore();
    const canWrite = !!(firestore.db && firestore.doc && firestore.setDoc && firestore.serverTimestamp);
    if (!canWrite) {
      setMessage(actionMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }
    const year = normalizeAcademicYearText(roundYearInputEl.value);
    const roundNo = normalizeRoundName(roundNoInputEl.value);
    const generatedRoundId = buildBudgetRoundId(year, roundNo);
    const existingEditingRound = budgetActiveRounds.find((round) => round.id === editingBudgetRoundId);
    const roundId = existingEditingRound ? existingEditingRound.id : generatedRoundId;
    if (!roundId) {
      setMessage(actionMessageEl, "กรุณาระบุปีการศึกษาและชื่อรอบ", "#b91c1c");
      return;
    }
    const currentYear = getCurrentBudgetAcademicYear();
    if (year !== currentYear) {
      setMessage(actionMessageEl, `ระบบเปิดรอบรับคำขอได้เฉพาะปีการศึกษา ${currentYear} กรุณา Export CSV และลบรอบปีก่อนแทนการแก้ไข`, "#b45309");
      return;
    }
    const previousYearRounds = getNonCurrentBudgetRounds();
    if (previousYearRounds.length) {
      setMessage(actionMessageEl, `ยังมีรอบปีก่อนค้างอยู่ ${previousYearRounds.length} รอบ กรุณา Export CSV และลบรอบเดิมก่อนบันทึกรอบปี ${currentYear}`, "#b45309");
      return;
    }
    const deadline = toDateOnlyText(deadlineInputEl.value);
    if (!deadline) {
      setMessage(actionMessageEl, "กรุณาเลือกวันสิ้นสุดการเปิดรับ", "#b91c1c");
      return;
    }
    const deadlineTime = toTimeOnlyText(deadlineTimeInputEl.value) || "23:59";
    const ceiling = readMoneyInput(ceilingInputEl.value);
    if (!Number.isFinite(ceiling) || ceiling < 0) {
      setMessage(actionMessageEl, "เพดานงบประมาณต้องเป็นตัวเลขที่ไม่ติดลบ", "#b91c1c");
      ceilingInputEl.focus();
      return;
    }
    const groupCeilingsResult = readBudgetGroupCeilingsFromInputs();
    if (!groupCeilingsResult.ok) {
      setMessage(actionMessageEl, groupCeilingsResult.message, "#b91c1c");
      return;
    }
    const groupCeilings = groupCeilingsResult.value;
    const groupTotalValidation = validateBudgetGroupCeilingTotal(groupCeilings, ceiling);
    if (!groupTotalValidation.ok) {
      setMessage(actionMessageEl, groupTotalValidation.message, "#b91c1c");
      return;
    }
    const duplicateRound = budgetActiveRounds.find((round) =>
      round.id !== editingBudgetRoundId &&
      normalizeAcademicYearText(round.year) === year &&
      normalizeRoundName(round.roundNo) === roundNo
    );
    if (duplicateRound) {
      setMessage(actionMessageEl, "มีรอบชื่อนี้ในปีการศึกษานี้แล้ว กรุณาใช้ชื่อรอบอื่น", "#b91c1c");
      return;
    }
    const nextActiveRounds = [
      ...budgetActiveRounds.filter((round) => round.id !== roundId && round.id !== editingBudgetRoundId),
      { id: roundId, year, roundNo, deadline, deadlineTime, label: formatBudgetRoundLabel(year, roundNo), budgetCeiling: ceiling, budgetGroupCeilings: groupCeilings }
    ].sort((a, b) => a.year.localeCompare(b.year, "th", { numeric: true }) || a.roundNo.localeCompare(b.roundNo, "th", { numeric: true }));
    const shouldSyncRequestRoundMetadata = !!existingEditingRound && (
      normalizeAcademicYearText(existingEditingRound.year) !== year ||
      normalizeRoundName(existingEditingRound.roundNo) !== roundNo
    );
    const requestRoundPatch = { budgetRoundYear: year, budgetRoundNo: roundNo };
    const applySavedDeadlineState = () => {
      budgetCeiling = ceiling;
      budgetGroupCeilings = groupCeilings;
      budgetRoundYear = year;
      budgetRoundNo = roundNo;
      editingBudgetRoundId = roundId;
      budgetActiveRounds = nextActiveRounds;
      writeLocalBudgetCeiling(ceiling);
      writeLocalBudgetGroupCeilings(groupCeilings);
    };
    const syncRequestMetadataAfterSettingsSave = async () => {
      if (!shouldSyncRequestRoundMetadata) {
        return { syncedRequestCount: 0, syncWarning: "" };
      }
      try {
        const syncedRequestCount = await syncBudgetRoundRequestMetadata(firestore, roundId, requestRoundPatch);
        return { syncedRequestCount, syncWarning: "" };
      } catch (syncError) {
        console.error("sync budget round request metadata failed - app.budget-staff.js", syncError);
        const code = normalizeText(syncError?.code || syncError?.message);
        const detail = code ? ` (${code})` : "";
        return {
          syncedRequestCount: 0,
          syncWarning: ` แต่ยังอัปเดตชื่อรอบในรายการเดิมไม่ครบ${detail}`
        };
      }
    };
    const getSavedMessage = (baseMessage, syncedRequestCount = 0, syncWarning = "") => {
      if (syncWarning) return `${baseMessage}${syncWarning}`;
      if (!syncedRequestCount) return baseMessage;
      return `${baseMessage} และอัปเดตรายการเดิม ${syncedRequestCount.toLocaleString("th-TH")} รายการ`;
    };
    setMessage(actionMessageEl, "กำลังบันทึกการตั้งค่า...", "#1d4ed8");
    try {
      await firestore.setDoc(
        firestore.doc(firestore.db, COLLECTION_SETTINGS, SETTINGS_DOC_ID),
        {
          budgetRequestDeadline: deadline,
          budgetRequestDeadlineTime: deadlineTime,
          budgetRoundYear: year,
          budgetRoundNo: roundNo,
          currentBudgetRoundId: roundId,
          budgetActiveRounds: nextActiveRounds,
          budgetCeiling: ceiling,
          budgetGroupCeilings: groupCeilings,
          updatedAt: firestore.serverTimestamp()
        },
        { merge: true }
      );
      applySavedDeadlineState();
      const { syncedRequestCount, syncWarning } = await syncRequestMetadataAfterSettingsSave();
      updateSummary();
      syncRoundStatus();
      if (syncedRequestCount) {
        renderRows();
        void refreshOrgSummaryFilters();
      }
      setMessage(actionMessageEl, getSavedMessage("บันทึกการตั้งค่าเรียบร้อย", syncedRequestCount, syncWarning), syncWarning ? "#b45309" : "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "budget.settings.update",
        entityType: "budgetApprovalSettings",
        entityId: SETTINGS_DOC_ID,
        after: {
          budgetRequestDeadline: deadline,
          budgetRequestDeadlineTime: deadlineTime,
          budgetRoundYear: year,
          budgetRoundNo: roundNo,
          currentBudgetRoundId: roundId,
          budgetCeiling: ceiling,
          budgetGroupCeilings: groupCeilings
        },
        metadata: { activeRoundCount: nextActiveRounds.length, syncedRequestCount },
        source: "web_app_staff"
      });
    } catch (error) {
      try {
        await firestore.setDoc(
          firestore.doc(firestore.db, COLLECTION_SETTINGS, SETTINGS_DOC_ID),
          {
            budgetRequestDeadline: deadline,
            budgetRequestDeadlineTime: deadlineTime,
            budgetRoundYear: year,
            budgetRoundNo: roundNo,
            currentBudgetRoundId: roundId,
            budgetActiveRounds: nextActiveRounds,
            updatedAt: firestore.serverTimestamp()
          },
          { merge: true }
        );
        applySavedDeadlineState();
        const { syncedRequestCount, syncWarning } = await syncRequestMetadataAfterSettingsSave();
        updateSummary();
        syncRoundStatus();
        if (syncedRequestCount) {
          renderRows();
          void refreshOrgSummaryFilters();
        }
        const code = normalizeText(error?.code);
        const detail = code ? ` (${code})` : "";
        setMessage(actionMessageEl, getSavedMessage(`บันทึกเส้นตายแล้ว แต่เพดานงบบันทึกเฉพาะเครื่องนี้${detail}`, syncedRequestCount, syncWarning), "#b45309");
      } catch (fallbackError) {
        applySavedDeadlineState();
        updateSummary();
        syncRoundStatus();
        const code = normalizeText(fallbackError?.code || error?.code);
        const detail = code ? ` (${code})` : "";
        setMessage(actionMessageEl, `บันทึกเพดานงบเฉพาะเครื่องนี้แล้ว แต่บันทึกเส้นตายไม่สำเร็จ${detail}`, "#b45309");
      }
    }
  };

  const getRowsForBudgetRound = (roundId = "") => {
    const id = normalizeText(roundId);
    if (!id) return [];
    return requestRows.filter((item) => normalizeText(item.budgetRoundId) === id);
  };

  const syncBudgetRoundRequestMetadata = async (firestore, roundId = "", patch = {}) => {
    const id = normalizeText(roundId);
    const rowsForRound = getRowsForBudgetRound(id).filter((row) => normalizeText(row.id));
    if (!id || !rowsForRound.length) return 0;
    if (!firestore.doc || !firestore.updateDoc) {
      throw new Error("updateDoc unavailable");
    }
    const payload = {
      ...patch,
      updatedAt: firestore.serverTimestamp()
    };
    if (firestore.writeBatch) {
      for (let index = 0; index < rowsForRound.length; index += 450) {
        const batch = firestore.writeBatch(firestore.db);
        rowsForRound.slice(index, index + 450).forEach((row) => {
          batch.update(firestore.doc(firestore.db, COLLECTION_REQUESTS, row.id), payload);
        });
        await batch.commit();
      }
    } else {
      for (const row of rowsForRound) {
        await firestore.updateDoc(firestore.doc(firestore.db, COLLECTION_REQUESTS, row.id), payload);
      }
    }
    requestRows = requestRows.map((row) => normalizeText(row.budgetRoundId) === id
      ? { ...row, ...patch }
      : row
    );
    return rowsForRound.length;
  };

  const setRoundDeleteModalBusy = (isBusy) => {
    roundDeleteConfirmBtnEl.disabled = isBusy || !roundDeleteConfirmCheckEl.checked;
    roundDeleteCancelBtnEl.disabled = isBusy;
    roundDeleteCloseBtnEl.disabled = isBusy;
    roundDeleteExportBtnEl.disabled = isBusy || !roundDeleteContext?.rows?.length;
    roundDeleteConfirmCheckEl.disabled = isBusy;
  };

  const closeRoundDeleteModal = (result = false) => {
    if (!roundDeleteResolve) return;
    const resolve = roundDeleteResolve;
    roundDeleteResolve = null;
    roundDeleteContext = null;
    closeDialog(roundDeleteModalEl);
    resolve(result);
  };

  const openRoundDeleteModal = (round, rows) => {
    roundDeleteContext = { round, rows: Array.isArray(rows) ? rows : [] };
    roundDeleteLabelEl.textContent = round?.label || "รอบรับคำขอ";
    roundDeleteSummaryEl.textContent = roundDeleteContext.rows.length
      ? `พบรายการคำขอในรอบนี้ ${roundDeleteContext.rows.length.toLocaleString("th-TH")} รายการ ระบบจะลบรายการเหล่านี้พร้อมรอบ`
      : "ไม่พบรายการคำขอในรอบนี้ ระบบจะลบเฉพาะข้อมูลรอบ";
    roundDeleteMessageEl.textContent = "";
    roundDeleteConfirmCheckEl.checked = false;
    setRoundDeleteModalBusy(false);
    openDialog(roundDeleteModalEl, { focusSelector: "#budgetRoundDeleteExportBtn" });
    return new Promise((resolve) => {
      roundDeleteResolve = resolve;
    });
  };

  const setRequestDeleteModalBusy = (isBusy) => {
    requestDeleteConfirmBtnEl.disabled = isBusy || !requestDeleteConfirmCheckEl.checked;
    requestDeleteCancelBtnEl.disabled = isBusy;
    requestDeleteCloseBtnEl.disabled = isBusy;
    requestDeleteConfirmCheckEl.disabled = isBusy;
  };

  const closeRequestDeleteModal = () => {
    requestDeleteContext = null;
    closeDialog(requestDeleteModalEl);
  };

  const openRequestDeleteModal = (row) => {
    requestDeleteContext = row || null;
    requestDeleteNameEl.textContent = row?.projectName || "รายการคำของบ";
    const roundLabel = formatBudgetRoundLabel(row?.budgetRoundYear, row?.budgetRoundNo) || normalizeText(row?.budgetRoundId) || "ไม่ระบุรอบ";
    const orgName = normalizeText(row?.organizationName) || "-";
    const requested = formatMoney(row?.estimatedExpense || 0);
    requestDeleteSummaryEl.textContent = `${orgName} • ${roundLabel} • ยอดขอ ${requested} บาท`;
    requestDeleteMessageEl.textContent = "";
    requestDeleteConfirmCheckEl.checked = false;
    setRequestDeleteModalBusy(false);
    openDialog(requestDeleteModalEl, { focusSelector: "#budgetRequestDeleteCancelBtn" });
  };

  const closeClearCodeModal = (result = false) => {
    if (!clearCodeResolve) return;
    const resolve = clearCodeResolve;
    clearCodeResolve = null;
    clearCodeContext = null;
    closeDialog(clearCodeModalEl);
    resolve(result);
  };

  const openClearCodeModal = (rows) => {
    clearCodeContext = { rows: Array.isArray(rows) ? rows : [] };
    const count = clearCodeContext.rows.length;
    clearCodeCountEl.textContent = `จะยกเลิกรหัสโครงการ ${count.toLocaleString("th-TH")} รายการ`;
    clearCodeMessageEl.textContent = "";
    const previewRows = clearCodeContext.rows.slice(0, 5);
    clearCodeListEl.innerHTML = previewRows.map((row) => {
      const code = escapeHtml(normalizeText(row.projectCodeGenerated) || "-");
      const name = escapeHtml(normalizeText(row.projectName) || normalizeText(row.organizationName) || "-");
      return `<li><code>${code}</code><span>${name}</span></li>`;
    }).join("");
    if (count > previewRows.length) {
      clearCodeListEl.insertAdjacentHTML(
        "beforeend",
        `<li><code>+${(count - previewRows.length).toLocaleString("th-TH")}</code><span>รายการอื่นที่มีรหัสโครงการแล้ว</span></li>`
      );
    }
    openDialog(clearCodeModalEl, { focusSelector: "#budgetProjectCodeClearCancelBtn" });
    return new Promise((resolve) => {
      clearCodeResolve = resolve;
    });
  };

  const deleteRoundRequests = async (firestore, rows) => {
    const requestRowsToDelete = (Array.isArray(rows) ? rows : []).filter((row) => normalizeText(row.id));
    if (!requestRowsToDelete.length) return 0;
    if (!firestore.deleteDoc || !firestore.doc) {
      throw new Error("deleteDoc unavailable");
    }
    if (firestore.writeBatch) {
      for (let index = 0; index < requestRowsToDelete.length; index += 450) {
        const batch = firestore.writeBatch(firestore.db);
        requestRowsToDelete.slice(index, index + 450).forEach((row) => {
          batch.delete(firestore.doc(firestore.db, COLLECTION_REQUESTS, row.id));
        });
        await batch.commit();
      }
      return requestRowsToDelete.length;
    }
    for (const row of requestRowsToDelete) {
      await firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_REQUESTS, row.id));
    }
    return requestRowsToDelete.length;
  };

  const persistRoundDeletion = async (firestore, nextActiveRounds, nextCurrent, rowsForRound) => {
    const settingsPayload = {
      budgetActiveRounds: nextActiveRounds,
      budgetRoundYear: nextCurrent.year || "",
      budgetRoundNo: nextCurrent.roundNo || "",
      currentBudgetRoundId: nextCurrent.id || "",
      budgetRequestDeadline: nextCurrent.deadline || "",
      budgetRequestDeadlineTime: getRoundDeadlineTime(nextCurrent),
      updatedAt: firestore.serverTimestamp()
    };
    const requestRowsToDelete = (Array.isArray(rowsForRound) ? rowsForRound : []).filter((row) => normalizeText(row.id));
    if (firestore.writeBatch) {
      const settingsRef = firestore.doc(firestore.db, COLLECTION_SETTINGS, SETTINGS_DOC_ID);
      let deletedCount = 0;
      let cursor = 0;
      const firstBatch = firestore.writeBatch(firestore.db);
      firstBatch.set(settingsRef, settingsPayload, { merge: true });
      requestRowsToDelete.slice(0, 449).forEach((row) => {
        firstBatch.delete(firestore.doc(firestore.db, COLLECTION_REQUESTS, row.id));
        deletedCount += 1;
      });
      await firstBatch.commit();
      cursor = 449;
      while (cursor < requestRowsToDelete.length) {
        const batch = firestore.writeBatch(firestore.db);
        requestRowsToDelete.slice(cursor, cursor + 450).forEach((row) => {
          batch.delete(firestore.doc(firestore.db, COLLECTION_REQUESTS, row.id));
          deletedCount += 1;
        });
        await batch.commit();
        cursor += 450;
      }
      return deletedCount;
    }
    await firestore.setDoc(
      firestore.doc(firestore.db, COLLECTION_SETTINGS, SETTINGS_DOC_ID),
      settingsPayload,
      { merge: true }
    );
    return deleteRoundRequests(firestore, requestRowsToDelete);
  };

  const removeBudgetRound = async (roundId = "") => {
    const id = normalizeText(roundId);
    if (!id) return;
    const round = budgetActiveRounds.find((item) => item.id === id);
    if (!round) return;
    const rowsForRound = getRowsForBudgetRound(id);
    const ok = await openRoundDeleteModal(round, rowsForRound);
    if (!ok) return;
    const nextActiveRounds = budgetActiveRounds.filter((item) => item.id !== id);
    const nextCurrent = nextActiveRounds[0] || {};
    const firestore = getFirestore();
    const canWrite = !!(firestore.db && firestore.doc && firestore.setDoc && firestore.serverTimestamp && firestore.deleteDoc);
    if (!canWrite) {
      setMessage(actionMessageEl, "ลบรอบไม่สำเร็จ เพราะระบบฐานข้อมูลยังไม่พร้อมลบรายการคำขอ", "#b91c1c");
      return;
    }
    setMessage(actionMessageEl, `กำลังลบรอบและรายการคำขอ ${rowsForRound.length.toLocaleString("th-TH")} รายการ...`, "#1d4ed8");
    try {
      const deletedRequestCount = await persistRoundDeletion(firestore, nextActiveRounds, nextCurrent, rowsForRound);
      budgetActiveRounds = nextActiveRounds;
      clearRoundSettingsForm();
      setMessage(actionMessageEl, `ลบรอบและรายการคำขอ ${deletedRequestCount.toLocaleString("th-TH")} รายการเรียบร้อย`, "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "budget.round.delete",
        entityType: "budgetApprovalSettings",
        entityId: id,
        before: round,
        after: {
          budgetActiveRounds: nextActiveRounds,
          currentBudgetRoundId: nextCurrent.id || ""
        },
        metadata: {
          deletedRequestCount,
          deletedRequestIdSample: rowsForRound.map((row) => row.id).filter(Boolean).slice(0, 20)
        },
        source: "web_app_staff"
      });
    } catch (error) {
      const code = normalizeText(error?.code);
      const detail = code ? ` (${code})` : "";
      setMessage(actionMessageEl, `ลบรอบไม่สำเร็จ${detail}`, "#b91c1c");
    }
  };

  const fillRoundSettings = (roundId = "") => {
    const round = budgetActiveRounds.find((item) => item.id === normalizeText(roundId));
    if (!round) return;
    editingBudgetRoundId = round.id;
    budgetRoundYear = round.year;
    budgetRoundNo = round.roundNo;
    budgetCeiling = Number(round.budgetCeiling || 0);
    budgetGroupCeilings = normalizeBudgetGroupCeilings(round.budgetGroupCeilings);
    roundYearInputEl.value = budgetRoundYear;
    roundNoInputEl.value = budgetRoundNo;
    deadlineInputEl.value = round.deadline;
    deadlineTimeInputEl.value = getRoundDeadlineTime(round);
    ceilingInputEl.value = budgetCeiling > 0 ? formatMoneyInputValue(budgetCeiling) : "";
    populateStaffRoundOptions(round.id);
    renderBudgetGroupCeilingInputs();
    syncRoundStatus();
    updateSummary();
    setMessage(actionMessageEl, `กำลังแก้ไข: ${formatBudgetRoundEditingLabel(round)}`, "#1d4ed8");
  };

  const getOrgCodeMap = async () => {
    if (typeof loadOrgFilters === "function") {
      try { await loadOrgFilters(); } catch (_) {}
    }
    const rows =
      typeof orgFilters !== "undefined" && Array.isArray(orgFilters)
        ? orgFilters
        : Array.isArray(globalThis.orgFilters)
          ? globalThis.orgFilters
          : [];
    const map = new Map();
    rows.forEach((item) => {
      const name = normalizeText(item?.name);
      const code = normalizeText(item?.code).toUpperCase();
      const id = normalizeText(item?.id || item?.organizationId || item?.organizationCatalogId);
      const baseId = normalizeText(item?.baseOrganizationId || item?.baseOrgId || item?.rootOrganizationId || item?.legacyOrganizationId || item?.id);
      const codeByAcademicYear = item?.codeByAcademicYear && typeof item.codeByAcademicYear === "object"
        ? item.codeByAcademicYear
        : {};
      Object.entries(codeByAcademicYear).forEach(([year, yearCode]) => {
        const academicYear = normalizeAcademicYearText(year);
        const normalizedCode = normalizeText(yearCode).toUpperCase();
        if (name && academicYear && normalizedCode) {
          map.set(`${name}||${academicYear}`, normalizedCode);
        }
        if (id && academicYear && normalizedCode) map.set(`id:${id}||${academicYear}`, normalizedCode);
        if (baseId && academicYear && normalizedCode) map.set(`base:${baseId}||${academicYear}`, normalizedCode);
      });
      if (name && code) map.set(name, code);
      if (id && code) map.set(`id:${id}`, code);
      if (baseId && code) map.set(`base:${baseId}`, code);
    });
    return map;
  };

  const normalizeProjectCodePrefix = (value = "") => {
    const code = normalizeText(value).toUpperCase();
    if (!code) return "";
    return code
      .replace(/-(?:YYY|XXX)$/u, "")
      .replace(/\.(?:YYY|XXX)$/u, "");
  };

  const resolveProjectCodeOrg = (row = {}, academicYear = "", orgCodeMap = new Map()) => {
    const orgName = normalizeText(row.organizationName);
    const orgTypeKey = normalizeOrgMatchValue(row.organizationType);
    const orgNameKey = normalizeOrgMatchValue(orgName);
    const catalogItem = orgTypeKey && orgNameKey
      ? getOrgFilterRows().find((item) =>
        normalizeOrgMatchValue(item?.group || item?.organizationType || item?.orgGroup) === orgTypeKey &&
        normalizeOrgMatchValue(getOrgCatalogNameForYear(item, academicYear)) === orgNameKey
      )
      : null;
    const orgId = normalizeText(row.organizationId || row.organizationCatalogId);
    const baseOrgId = normalizeText(row.baseOrganizationId || row.baseOrgId || row.rootOrganizationId);
    const savedCode = normalizeProjectCodePrefix(row.organizationCode);
    const resolvedOrgId = orgId || normalizeText(catalogItem?.id || catalogItem?.organizationId || catalogItem?.organizationCatalogId);
    const resolvedBaseOrgId = baseOrgId || normalizeText(catalogItem?.baseOrganizationId || catalogItem?.baseOrgId || catalogItem?.rootOrganizationId || catalogItem?.legacyOrganizationId || catalogItem?.id);
    const resolvedCode = savedCode || normalizeProjectCodePrefix(getOrgCatalogCodeForYear(catalogItem, academicYear));
    const code = normalizeProjectCodePrefix(
      resolvedCode ||
      (resolvedOrgId && orgCodeMap.get(`id:${resolvedOrgId}||${academicYear}`)) ||
      (resolvedBaseOrgId && orgCodeMap.get(`base:${resolvedBaseOrgId}||${academicYear}`)) ||
      orgCodeMap.get(`${orgName}||${academicYear}`) ||
      (resolvedOrgId && orgCodeMap.get(`id:${resolvedOrgId}`)) ||
      (resolvedBaseOrgId && orgCodeMap.get(`base:${resolvedBaseOrgId}`)) ||
      orgCodeMap.get(orgName)
    ) || "ORG";
    const keyPart = resolvedCode || (resolvedOrgId && `id:${resolvedOrgId}`) || (resolvedBaseOrgId && `base:${resolvedBaseOrgId}`) || orgName;
    return {
      name: orgName,
      code,
      key: `${keyPart || "ORG"}||${academicYear}`
    };
  };

  const getProjectCodeSequence = (value) => {
    const code = normalizeText(value);
    if (!code) return 0;
    const match = code.match(/(?:^|[.-])([0-9]+)$/);
    const sequence = match ? Number(match[1]) : 0;
    return Number.isFinite(sequence) && sequence > 0 ? sequence : 0;
  };

  const getLoadedProjectRowsForYear = (academicYear) => {
    const year = normalizeAcademicYearText(academicYear);
    if (!year || typeof projects === "undefined" || !Array.isArray(projects)) return [];
    return projects.filter((project) => normalizeAcademicYearText(project?.year) === year);
  };

  const resolveExactProjectSourceConfigForYear = async (academicYear) => {
    const year = normalizeAcademicYearText(academicYear);
    if (!year || typeof loadProjectSourceConfigs !== "function") return null;
    const sources = await loadProjectSourceConfigs();
    return Array.isArray(sources)
      ? sources.find((source) => normalizeAcademicYearText(source?.year) === year) || null
      : null;
  };

  const loadProjectStatusRowsForYear = async (academicYear) => {
    const year = normalizeAcademicYearText(academicYear);
    if (!year) return [];

    try {
      if (
        typeof loadProjectSourceConfigs !== "function" ||
        typeof isPublishedHtmlSheetUrl !== "function" ||
        typeof loadRowsFromPublishedHtmlWorkbook !== "function" ||
        typeof fetchTextWithProgress !== "function" ||
        typeof parseCsvRows !== "function" ||
        typeof extractProjectsFromRows !== "function"
      ) {
        return getLoadedProjectRowsForYear(year);
      }

      const sourceConfig = await resolveExactProjectSourceConfigForYear(year);
      const projectUrl = normalizeText(sourceConfig?.projectUrl);
      if (!projectUrl) return getLoadedProjectRowsForYear(year);

      let rows = [];
      if (isPublishedHtmlSheetUrl(projectUrl)) {
        const workbookRows = await loadRowsFromPublishedHtmlWorkbook(projectUrl, null, { cache: "no-store" });
        rows = workbookRows.projectRows || [];
      } else {
        await window.sgcuVendorLoader?.ensurePapa?.();
        const csvText = await fetchTextWithProgress(projectUrl, null, { cache: "no-store" });
        rows = parseCsvRows(csvText);
      }

      if (!Array.isArray(rows) || rows.length < 2) return getLoadedProjectRowsForYear(year);
      return extractProjectsFromRows(rows.slice(2), rows[1] || [], year)
        .filter((project) => normalizeAcademicYearText(project?.year) === year);
    } catch (error) {
      console.error("load project status rows for budget codes failed - app.budget-staff.js", error);
      return getLoadedProjectRowsForYear(year);
    }
  };

  const getProjectStatusMaxSequence = async (academicYear, orgName, orgCode) => {
    const rows = await loadProjectStatusRowsForYear(academicYear);
    const targetOrg = normalizeText(orgName);
    const codePrefix = normalizeText(orgCode).toUpperCase();
    return rows.reduce((max, project) => {
      const projectOrg = normalizeText(project?.orgName);
      const projectCode = normalizeText(project?.code).toUpperCase();
      const orgMatches =
        (targetOrg && projectOrg === targetOrg) ||
        (codePrefix && projectCode.startsWith(`${codePrefix}.`));
      if (!orgMatches) return max;
      return Math.max(max, getProjectCodeSequence(project?.code));
    }, 0);
  };

  const runProjectCodes = async () => {
    const firestore = getFirestore();
    const canWrite = !!(firestore.db && firestore.doc && firestore.updateDoc && firestore.serverTimestamp);
    if (!canWrite) {
      setMessage(actionMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }

    setMessage(actionMessageEl, "กำลังรันรหัสโครงการ...", "#1d4ed8");
    setCodeActionBusy(true);
    try {
      const orgCodeMap = await getOrgCodeMap();
      const byOrgYear = new Map();
      const currentYear = getCurrentBudgetAcademicYear();
      requestRows.forEach((row) => {
        const status = normalizeText(row.status || "pending").toLowerCase();
        if (status === "cancelled" || status === "rejected") return;
        const academicYear = normalizeAcademicYearText(row.budgetRoundYear);
        if (academicYear !== currentYear) return;
        const org = resolveProjectCodeOrg(row, academicYear, orgCodeMap);
        if (!org.name && !org.code) return;
        const key = org.key;
        const list = byOrgYear.get(key) || [];
        list.push(row);
        byOrgYear.set(key, list);
      });

      const updates = [];
      for (const [key, rows] of byOrgYear.entries()) {
        const [, academicYear] = key.split("||");
        const firstOrg = resolveProjectCodeOrg(rows[0], academicYear, orgCodeMap);
        const orgName = firstOrg.name;
        const code = firstOrg.code;
        const sortedRows = rows
          .sort((a, b) => {
            const da = getDateOnlyTime(a.operationEndDate);
            const db = getDateOnlyTime(b.operationEndDate);
            if (da !== db) return da - db;
            const sa = getDateOnlyTime(a.prepStartDate, Number.POSITIVE_INFINITY);
            const sb = getDateOnlyTime(b.prepStartDate, Number.POSITIVE_INFINITY);
            if (sa !== sb) return sa - sb;
            return getCreatedAtTime(a) - getCreatedAtTime(b);
          });
        const maxExistingSequence = sortedRows.reduce((max, row) => {
          const existing = normalizeText(row.projectCodeGenerated);
          if (!existing) return max;
          return Math.max(max, getProjectCodeSequence(existing));
        }, 0);
        const maxProjectStatusSequence = await getProjectStatusMaxSequence(academicYear, orgName, code);
        let nextSequence = Math.max(maxExistingSequence, maxProjectStatusSequence) + 1;
        sortedRows
          .filter((row) => !normalizeText(row.projectCodeGenerated))
          .forEach((row) => {
            const sequence = String(nextSequence).padStart(3, "0");
            nextSequence += 1;
            const generated = `${code}.${sequence}`;
            updates.push({ id: row.id, code: generated });
          });
      }

      for (const item of updates) {
        await firestore.updateDoc(
          firestore.doc(firestore.db, COLLECTION_REQUESTS, item.id),
          {
            projectCodeGenerated: item.code,
            updatedAt: firestore.serverTimestamp()
          }
        );
      }

      setMessage(actionMessageEl, `รันรหัสโครงการสำเร็จ ${updates.length} รายการ`, "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "budget.project_codes.run",
        entityType: "budgetApprovalRequest",
        entityId: "bulk",
        after: { updates },
        metadata: { count: updates.length },
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("run budget consideration code failed - app.budget-staff.js", error);
      setMessage(actionMessageEl, "รันรหัสโครงการไม่สำเร็จ", "#b91c1c");
    } finally {
      setCodeActionBusy(false);
    }
  };

  const clearProjectCodes = async () => {
    const firestore = getFirestore();
    const canWrite = !!(firestore.db && firestore.doc && firestore.updateDoc && firestore.serverTimestamp);
    if (!canWrite) {
      setMessage(actionMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }

    const currentYear = getCurrentBudgetAcademicYear();
    const rowsToClear = requestRows.filter((row) =>
      normalizeAcademicYearText(row.budgetRoundYear) === currentYear &&
      normalizeText(row.projectCodeGenerated)
    );
    if (!rowsToClear.length) {
      setMessage(actionMessageEl, "ยังไม่มีรหัสโครงการที่ต้องยกเลิก", "#6b7280");
      return;
    }

    const ok = await openClearCodeModal(rowsToClear);
    if (!ok) return;

    setMessage(actionMessageEl, "กำลังยกเลิกรหัสโครงการ...", "#1d4ed8");
    setCodeActionBusy(true);
    try {
      for (const row of rowsToClear) {
        await firestore.updateDoc(
          firestore.doc(firestore.db, COLLECTION_REQUESTS, row.id),
          {
            projectCodeGenerated: "",
            projectCodeClearedAt: firestore.serverTimestamp(),
            updatedAt: firestore.serverTimestamp()
          }
        );
      }
      setMessage(actionMessageEl, `ยกเลิกรหัสโครงการสำเร็จ ${rowsToClear.length} รายการ`, "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "budget.project_codes.clear",
        entityType: "budgetApprovalRequest",
        entityId: "bulk",
        before: rowsToClear.map((row) => ({ id: row.id, projectCodeGenerated: row.projectCodeGenerated })),
        metadata: { count: rowsToClear.length },
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("clear budget consideration code failed - app.budget-staff.js", error);
      setMessage(actionMessageEl, "ยกเลิกรหัสโครงการไม่สำเร็จ", "#b91c1c");
    } finally {
      setCodeActionBusy(false);
    }
  };

  const fillFormForEdit = (row) => {
    if (!row) return;
    populateStaffOrgTypeOptions(row.organizationType);
    populateStaffOrgNameOptions(row.organizationName);
    projectNameInputEl.value = normalizeText(row.projectName);
    activityLocationInputEl.value = normalizeText(row.activityLocation);
    prepStartDateInputEl.value = toDateOnlyText(row.prepStartDate);
    operationEndDateInputEl.value = toDateOnlyText(row.operationEndDate);
    studentOperatorsInputEl.value = Number(row.studentOperators || 0).toString();
    studentParticipantsInputEl.value = Number(row.studentParticipants || 0).toString();
    requestedAmountInputEl.value = formatMoneyInputValue(row.estimatedExpense || 0);
    approvedAmountInputEl.value = formatMoneyInputValue(row.approvedAmount || 0);
    statusInputEl.value = normalizeText(row.status || "pending").toLowerCase() || "pending";
    descriptionInputEl.value = normalizeText(row.description);
    populateStaffRoundOptions(row.budgetRoundId);
    const round = budgetActiveRounds.find((item) => item.id === normalizeText(row.budgetRoundId));
    if (round) fillRoundSettings(round.id);
    setFormMode(row.id);
    syncStaffRoundMessage();
    formEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveForm = async (event) => {
    event.preventDefault();
    setMessage(formMessageEl, "");

    if (!validateForm()) return;

    const firestore = getFirestore();
    const canWrite = !!(firestore.db && firestore.collection && firestore.doc && firestore.addDoc && firestore.updateDoc && firestore.serverTimestamp);
    if (!canWrite) {
      setMessage(formMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }

    const payload = readFormPayload();
    const isEdit = !!editingId;
    const beforeRow = isEdit ? requestRows.find((item) => item.id === editingId) || null : null;

    try {
      saveBtnEl.disabled = true;
      if (isEdit) {
        await firestore.updateDoc(
          firestore.doc(firestore.db, COLLECTION_REQUESTS, editingId),
          {
            ...payload,
            updatedAt: firestore.serverTimestamp()
          }
        );
        setMessage(formMessageEl, "บันทึกการแก้ไขเรียบร้อย", "#047857");
        void window.sgcuAuditLog?.write?.({
          action: "budget.request.update",
          entityType: "budgetApprovalRequest",
          entityId: editingId,
          before: beforeRow,
          after: payload,
          source: "web_app_staff"
        });
      } else {
        const docRef = await firestore.addDoc(
          firestore.collection(firestore.db, COLLECTION_REQUESTS),
          {
            requestType: "budget_approval",
            ...payload,
            projectCodeGenerated: "",
            requester: {
              email: "staff-manual@system",
              displayName: "Staff Manual"
            },
            createdAt: firestore.serverTimestamp(),
            updatedAt: firestore.serverTimestamp()
          }
        );
        setMessage(formMessageEl, "เพิ่มรายการเรียบร้อย", "#047857");
        void window.sgcuAuditLog?.write?.({
          action: "budget.request.create",
          entityType: "budgetApprovalRequest",
          entityId: docRef?.id || "",
          after: payload,
          source: "web_app_staff"
        });
      }
      resetForm();
    } catch (error) {
      console.error("save budget staff request failed - app.budget-staff.js", error);
      setMessage(formMessageEl, "บันทึกรายการไม่สำเร็จ", "#b91c1c");
    } finally {
      saveBtnEl.disabled = false;
    }
  };

  const cancelRow = async (id) => {
    const firestore = getFirestore();
    const canWrite = !!(firestore.db && firestore.doc && firestore.updateDoc && firestore.serverTimestamp);
    if (!canWrite) {
      setMessage(actionMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }

    const beforeRow = requestRows.find((item) => item.id === id) || null;
    try {
      await firestore.updateDoc(
        firestore.doc(firestore.db, COLLECTION_REQUESTS, id),
        {
          status: "cancelled",
          updatedAt: firestore.serverTimestamp(),
          cancelledAt: firestore.serverTimestamp()
        }
      );
      setMessage(actionMessageEl, "ลดรายการเรียบร้อย", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "budget.request.cancel",
        entityType: "budgetApprovalRequest",
        entityId: id,
        before: beforeRow,
        after: { status: "cancelled" },
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("cancel budget request failed - app.budget-staff.js", error);
      setMessage(actionMessageEl, "ลดรายการไม่สำเร็จ", "#b91c1c");
    }
  };

  const deleteBudgetRequestRow = async () => {
    const row = requestDeleteContext;
    const id = normalizeText(row?.id);
    if (!id) return;

    const firestore = getFirestore();
    const canDelete = !!(firestore.db && firestore.doc && firestore.deleteDoc);
    if (!canDelete) {
      setMessage(requestDeleteMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมลบรายการ", "#b91c1c");
      return;
    }

    setRequestDeleteModalBusy(true);
    setMessage(requestDeleteMessageEl, "กำลังลบรายการ...", "#1d4ed8");
    try {
      await firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_REQUESTS, id));
      if (editingId === id) resetForm();
      setMessage(actionMessageEl, "ลบรายการคำของบเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "budget.request.delete",
        entityType: "budgetApprovalRequest",
        entityId: id,
        before: row,
        source: "web_app_staff"
      });
      closeRequestDeleteModal();
    } catch (error) {
      console.error("delete budget request failed - app.budget-staff.js", error);
      const code = normalizeText(error?.code);
      const detail = code ? ` (${code})` : "";
      setMessage(requestDeleteMessageEl, `ลบรายการไม่สำเร็จ${detail}`, "#b91c1c");
      setRequestDeleteModalBusy(false);
    }
  };

  tableBodyEl.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const editRow = target.closest("[data-budget-staff-edit-id]");
    if (!editRow) return;
    const id = normalizeText(editRow.getAttribute("data-budget-staff-edit-id"));
    const row = requestRows.find((item) => item.id === id);
    if (!row) return;
    fillFormForEdit(row);
  });

  tableBodyEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("button, a, input, select, textarea")) return;
    const editRow = target?.closest("[data-budget-staff-edit-id]");
    if (!editRow) return;
    event.preventDefault();
    const id = normalizeText(editRow.getAttribute("data-budget-staff-edit-id"));
    const row = requestRows.find((item) => item.id === id);
    if (!row) return;
    fillFormForEdit(row);
  });

  cancelEditBtnEl.addEventListener("click", resetForm);
  deleteEditBtnEl.addEventListener("click", () => {
    const row = requestRows.find((item) => item.id === editingId);
    if (row) openRequestDeleteModal(row);
  });
  formEl.addEventListener("submit", saveForm);
  deadlineSaveBtnEl.addEventListener("click", () => { void saveDeadline(); });
  roundAddBtnEl.addEventListener("click", () => { void saveDeadline(); });
  requestDeleteCloseBtnEl.addEventListener("click", closeRequestDeleteModal);
  requestDeleteCancelBtnEl.addEventListener("click", closeRequestDeleteModal);
  requestDeleteConfirmCheckEl.addEventListener("change", () => setRequestDeleteModalBusy(false));
  requestDeleteConfirmBtnEl.addEventListener("click", () => { void deleteBudgetRequestRow(); });
  requestDeleteModalEl.addEventListener("click", (event) => {
    if (event.target === requestDeleteModalEl) closeRequestDeleteModal();
  });
  roundDeleteCloseBtnEl.addEventListener("click", () => closeRoundDeleteModal(false));
  roundDeleteCancelBtnEl.addEventListener("click", () => closeRoundDeleteModal(false));
  roundDeleteConfirmBtnEl.addEventListener("click", () => closeRoundDeleteModal(true));
  roundDeleteConfirmCheckEl.addEventListener("change", () => setRoundDeleteModalBusy(false));
  roundDeleteExportBtnEl.addEventListener("click", () => {
    const rows = roundDeleteContext?.rows || [];
    const round = roundDeleteContext?.round || {};
    if (!rows.length) {
      setMessage(roundDeleteMessageEl, "รอบนี้ไม่มีรายการคำขอให้ Export", "#6b7280");
      return;
    }
    if (typeof window.sgcuCsvExport?.download !== "function") {
      setMessage(roundDeleteMessageEl, "ระบบ Export CSV ยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง", "#b91c1c");
      return;
    }
    exportBudgetStaffCsv(rows, round.label || round.id || "round");
    roundDeleteConfirmCheckEl.checked = true;
    setRoundDeleteModalBusy(false);
    setMessage(roundDeleteMessageEl, "Export CSV ของรอบนี้แล้ว ตรวจไฟล์ดาวน์โหลดก่อนยืนยันลบ", "#047857");
  });
  roundDeleteModalEl.addEventListener("click", (event) => {
    if (event.target === roundDeleteModalEl) closeRoundDeleteModal(false);
  });
  roundDeleteModalEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeRoundDeleteModal(false);
  });
  clearCodeCloseBtnEl.addEventListener("click", () => closeClearCodeModal(false));
  clearCodeCancelBtnEl.addEventListener("click", () => closeClearCodeModal(false));
  clearCodeConfirmBtnEl.addEventListener("click", () => closeClearCodeModal(true));
  clearCodeModalEl.addEventListener("click", (event) => {
    if (event.target === clearCodeModalEl) closeClearCodeModal(false);
  });
  clearCodeModalEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeClearCodeModal(false);
  });
  activeRoundListEl.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const item = target?.closest("[data-budget-round-select]");
    if (!item) return;
    fillRoundSettings(item.getAttribute("data-budget-round-select") || "");
  });
  activeRoundListEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const item = target?.closest("[data-budget-round-select]");
    if (!item) return;
    event.preventDefault();
    fillRoundSettings(item.getAttribute("data-budget-round-select") || "");
  });
  roundCancelEditBtnEl.addEventListener("click", () => {
    clearRoundSettingsForm();
    setMessage(actionMessageEl, "ยกเลิกการแก้ไขรอบแล้ว", "#6b7280");
  });
  roundDeleteSelectedBtnEl.addEventListener("click", () => {
    if (!editingBudgetRoundId) return;
    void removeBudgetRound(editingBudgetRoundId);
  });
  runCodeBtnEl.addEventListener("click", () => { void runProjectCodes(); });
  clearCodeBtnEl.addEventListener("click", () => { void clearProjectCodes(); });
  staffRoundInputEl.addEventListener("change", syncStaffRoundMessage);
  orgTypeInputEl.addEventListener("change", () => {
    populateStaffOrgNameOptions("");
    setMessage(formMessageEl, "");
  });
  orgNameInputEl.addEventListener("change", () => {
    setMessage(formMessageEl, "");
  });
  groupCeilingToggleBtnEl.addEventListener("click", () => {
    isGroupCeilingOpen = !isGroupCeilingOpen;
    writeLocalGroupCeilingOpen(isGroupCeilingOpen);
    syncGroupCeilingVisibility();
  });
  [ceilingInputEl, requestedAmountInputEl, approvedAmountInputEl].forEach(setupMoneyInputFormatting);
  groupCeilingListEl.addEventListener("focusin", (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input?.matches("[data-budget-group-ceiling]")) return;
    input.value = normalizeText(input.value).replaceAll(",", "");
  });
  groupCeilingListEl.addEventListener("focusout", (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input?.matches("[data-budget-group-ceiling]")) return;
    input.value = formatMoneyInputValue(input.value);
  });
  ceilingInputEl.addEventListener("input", () => {
    const groupCeilingsResult = readBudgetGroupCeilingsFromInputs();
    if (groupCeilingsResult.ok) budgetGroupCeilings = groupCeilingsResult.value;
    const ceiling = readMoneyInput(ceilingInputEl.value);
    budgetCeiling = Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 0;
    renderBudgetGroupCeilingInputs();
    updateSummary();
  });
  roundYearInputEl.addEventListener("input", () => {
    renderBudgetGroupCeilingInputs();
    syncRoundStatus();
  });
  roundNoInputEl.addEventListener("input", () => {
    renderBudgetGroupCeilingInputs();
    syncRoundStatus();
  });
  window.addEventListener("resize", () => {
    const hasEditingRound = !!editingBudgetRoundId && budgetActiveRounds.some((round) => round.id === editingBudgetRoundId);
    applyRoundActionLayout(hasEditingRound);
  });
  orgSummaryRoundEl.addEventListener("change", () => {
    populateOrgSummaryGroupOptions();
    populateOrgSummaryOrgOptions();
    updateSummary();
    void renderOrgSummaryChart();
  });
  orgSummaryGroupEl.addEventListener("change", () => {
    populateOrgSummaryOrgOptions();
    updateSummary();
    void renderOrgSummaryChart();
  });
  orgSummaryOrgEl.addEventListener("change", () => {
    updateSummary();
    void renderOrgSummaryChart();
  });
  orgSummarySearchEl.addEventListener("input", () => {
    updateSummary();
    void renderOrgSummaryChart();
  });
  orgSummarySearchClearEl.addEventListener("click", () => {
    resetOrgSummaryFilters();
    orgSummarySearchEl.focus();
  });
  reviewGroupEl.addEventListener("change", () => {
    populateReviewOrgOptions();
    renderRows();
  });
  reviewRoundEl.addEventListener("change", () => {
    populateReviewGroupOptions();
    populateReviewOrgOptions();
    renderRows();
  });
  reviewOrgEl.addEventListener("change", renderRows);
  exportCsvBtnEl?.addEventListener("click", exportBudgetStaffCsv);
  tabBtnEls.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.getAttribute("data-budget-staff-tab") || "overview");
    });
  });

  resetForm();
  isGroupCeilingOpen = readLocalGroupCeilingOpen();
  syncGroupCeilingVisibility();
  setActiveTab("overview");
  initBudgetMobileActionBar();
  void refreshOrgSummaryFilters();
  subscribeRequests();
  void loadDeadline();

  window.addEventListener("beforeunload", () => {
    if (typeof unsubscribeRequests === "function") {
      try { unsubscribeRequests(); } catch (_) {}
      unsubscribeRequests = null;
    }
    if (typeof unsubscribeSettings === "function") {
      try { unsubscribeSettings(); } catch (_) {}
      unsubscribeSettings = null;
    }
  });
})();
