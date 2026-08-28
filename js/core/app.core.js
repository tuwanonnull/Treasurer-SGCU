/* Core shared globals (used across modules) */

const APP_CONFIG = SGCU_APP_CONFIG;

/* Backward-compatible config aliases */
let PROJECT_SOURCES_CSV_URL = "";
let SHEET_CSV_URL = "";
let PROJECT_CONTACTS_CSV_URL = "";
let DOWNLOAD_SHEET = "";
let NEWS_SHEET_CSV = "";
let DEFAULT_BASE_GROUPS = [];

// Auth/session defaults (can be overridden from global config before scripts run)
let AUTH_SESSION_MAX_AGE_MS =
  typeof globalThis.AUTH_SESSION_MAX_AGE_MS === "number" &&
  Number.isFinite(globalThis.AUTH_SESSION_MAX_AGE_MS) &&
  globalThis.AUTH_SESSION_MAX_AGE_MS > 0
    ? globalThis.AUTH_SESSION_MAX_AGE_MS
    : APP_CONFIG.auth.sessionMaxAgeMs;

// Backward-compat for legacy auth sheet column mapping
let COL_STAFF_EMAIL_LEGACY =
  typeof globalThis.COL_STAFF_EMAIL_LEGACY === "number" &&
  Number.isFinite(globalThis.COL_STAFF_EMAIL_LEGACY)
    ? globalThis.COL_STAFF_EMAIL_LEGACY
    : APP_CONFIG.auth.staffEmailLegacyColumn;

// Cache
let CACHE_TTL_MS = APP_CONFIG.cache.ttlMs;
let CACHE_KEYS = APP_CONFIG.cache.keys;

function applyRuntimeConfigAliases() {
  PROJECT_SOURCES_CSV_URL = APP_CONFIG.sheets.projectSources || "";
  SHEET_CSV_URL = APP_CONFIG.sheets.projects || "";
  PROJECT_CONTACTS_CSV_URL = APP_CONFIG.sheets.projectContacts || "";
  DOWNLOAD_SHEET = APP_CONFIG.sheets.downloads || "";
  NEWS_SHEET_CSV = APP_CONFIG.sheets.news || "";
  DEFAULT_BASE_GROUPS = APP_CONFIG.org.defaultBaseGroups;
  AUTH_SESSION_MAX_AGE_MS =
    typeof globalThis.AUTH_SESSION_MAX_AGE_MS === "number" &&
    Number.isFinite(globalThis.AUTH_SESSION_MAX_AGE_MS) &&
    globalThis.AUTH_SESSION_MAX_AGE_MS > 0
      ? globalThis.AUTH_SESSION_MAX_AGE_MS
      : APP_CONFIG.auth.sessionMaxAgeMs;
  COL_STAFF_EMAIL_LEGACY =
    typeof globalThis.COL_STAFF_EMAIL_LEGACY === "number" &&
    Number.isFinite(globalThis.COL_STAFF_EMAIL_LEGACY)
      ? globalThis.COL_STAFF_EMAIL_LEGACY
      : APP_CONFIG.auth.staffEmailLegacyColumn;
  CACHE_TTL_MS = APP_CONFIG.cache.ttlMs;
  CACHE_KEYS = APP_CONFIG.cache.keys;
}

applyRuntimeConfigAliases();
window.applyRuntimeConfigAliases = applyRuntimeConfigAliases;

function getConfigValueByPath(source, path) {
  return (path || "")
    .split(".")
    .filter(Boolean)
    .reduce((cursor, key) => (cursor && cursor[key] !== undefined ? cursor[key] : undefined), source);
}

function syncManagementLinks(root = document) {
  const scope = root || document;
  const linkEls = Array.from(scope.querySelectorAll("[data-management-link], [data-settings-link]"));
  linkEls.forEach((linkEl) => {
    const path = linkEl.dataset.managementLink || linkEl.dataset.settingsLink || "";
    const url = (getConfigValueByPath(APP_CONFIG, path) || "").toString().trim();
    const actionText = linkEl.dataset.managementAction || linkEl.dataset.settingsAction || "";
    const disabledText = linkEl.dataset.managementDisabledText || "รอลิงก์";
    const actionEl = linkEl.querySelector("[data-management-action-label]") ||
      (linkEl.matches(".settings-data-row") ? linkEl.querySelector("em") : null);

    if (!url) {
      linkEl.setAttribute("href", "#");
      linkEl.setAttribute("aria-disabled", "true");
      linkEl.classList.add("is-disabled");
      if (actionEl) actionEl.textContent = disabledText;
      else if (actionText || linkEl.classList.contains("management-link-button")) linkEl.textContent = disabledText;
      return;
    }

    linkEl.setAttribute("href", url);
    linkEl.removeAttribute("aria-disabled");
    linkEl.classList.remove("is-disabled");
    if (actionEl) actionEl.textContent = actionText || "เปิด";
  });
}

function syncManagementPanels() {
  const panels = Array.from(document.querySelectorAll("[data-management-visibility='staff']"));
  const shouldShow = Boolean(staffAuthUser);
  panels.forEach((panel) => {
    panel.hidden = !shouldShow;
  });
}

window.syncManagementLinks = syncManagementLinks;
window.syncManagementPanels = syncManagementPanels;

/* Globals: shared state */
let projects = [];
let newsItems = [];

let yearSelect;
let orgTypeSelect;
let orgSelect;
let totalProjectsEl;
let pendingProjectsEl;
let approvedProjectsEl;
let closedProjectsEl;
let totalBudgetEl;
let filterBarEl;
let closureRateEl;
let closureRateCaptionEl;
let closureRateBarEl;
let approvalRateEl;
let approvalRateCaptionEl;
let approvalRateBarEl;
let closureRateDonutCanvas;
let approvalRateDonutCanvas;
let kpiOnTimeDonutCanvas;
let kpiBudgetUsageDonutCanvas;
let avgBudgetEl;
let avgBudgetCaptionEl;
let activeOrgCountEl;
let activeOrgCaptionEl;
let topOrgNameEl;
let topOrgBudgetEl;
let recentProjectsListEl;
let longestOpenListEl;
let longestOpenAssistantFilterEl;
let longestOpenStatusFilterEl;
let longestOpenTableCaptionEl;
let longestOpenTableBodyEl;
let lastLongestOpenProjects = [];
let tableBodyEl;
let tableCaptionEl;
let lastTableProjects = [];
let projectSearchInput;
let projectSearchClearBtn;
let budgetByMonthChart;
let statusPieChart;
let trendLineChart;
let projectBudgetComparisonChart;
let closureRateDonutChart;
let approvalRateDonutChart;
let kpiOnTimeDonutChart;
let kpiBudgetUsageDonutChart;
let clubDebtSummaryChart = null;
let clubDebtAgeChart = null;
let projectModalEl;
let budgetChartSkeletonEl;
let statusPieSkeletonEl;
let projectTableSkeletonEl;
let dashboardOverviewSkeletonEl;
let dashboardOverviewContentEl;
let orgStructureSkeletonEl;
let projectModalTitleEl;
let projectModalTitleBadgeEl;
let projectModalHeaderRowEl;
let projectModalBodyEl;
let projectModalCloseEl;
let pdfRootEl;
let currentSort = { key: null, direction: "asc" };
let projectStatusContexts = {};
let activeProjectStatusContext = "public";
let assistantContactsByName = {};
let newsListEl;
let newsModalEl;
let newsModalTitleEl;
let newsModalBodyEl;
let newsModalCloseEl;
let homeNewsSkeletonEl;
let newsListSkeletonEl;
let downloadSkeletonEl;
let calendarSkeletonEl;
let orgFilters = [];
let staffAuthUser = null;
let staffEmails = new Set();
let staffProfilesByEmail = {};
let staffViewMode = "normal";
let refreshAuthDisplayFn = null;
let loginBtnEl;
let logoutBtnEl;
let mobileLogoutBtnEl;
let userInfoEl;
let loginPageGoogleBtnEl;
let loginPageLogoutBtnEl;
let loginPageStatusEl;
let staffModeToggleEl;
let staffModeBtns = [];
let kpiOnTimeEl;
let kpiOnTimeCaptionEl;
let kpiBudgetUsageEl;
let kpiBudgetUsageCaptionEl;
let kpiClosedProjectsEl;
let kpiClosedProjectsCaptionEl;
let kpiMonthlyCaptionEl;
let kpiOnTimeBarEl;
let kpiBudgetUsageBarEl;
let kpiClosedProjectsBarEl;
let kpiOnTimeStaffEl;
let kpiOnTimeCaptionStaffEl;
let kpiBudgetUsageStaffEl;
let kpiBudgetUsageCaptionStaffEl;
let kpiClosedProjectsStaffEl;
let kpiClosedProjectsCaptionStaffEl;
let homeKpiChart = null;
let homeHeatmapEl;
let homeHeatmapMonthsEl;
let navLinksAll = [];
let statusViewEl;
let calendarViewEl;
let dashboardViewEl;
let projectTableAreaEl;
let projectTableLockEl;
let viewToggleBtns = [];
let calendarYearSelectEl;
let calendarOrgSelectEl;
let calendarStatusSelectEl;
let calendarPanelTitleEl;
let calendarContainerEl;
let prevMonthBtnEl;
let nextMonthBtnEl;
let isUserAuthenticated = false;
let currentUserProfileType = "student";
let markLoaderStep = null;
let updateLoaderProgress = null;
let projectsLoadPromise = null;
let projectsLoaded = false;
let appAlertEl;
let appAlertTextEl;
let appAlertRetryEl;
let appLoaderErrorEl;
let appLoaderErrorTextEl;
let appLoaderRetryEl;
let projectsLastUpdatedEl;
let projectsLastUpdatedStaffEl;
let projectsLastUpdatedDashboardStaffEl;

// Motion globals
let sectionObserver = null;
let hasInitCountup = false;

/* 3) Plugin: Center Text in Doughnut */
const centerTextPlugin = {
  id: "centerText",
  afterDraw(chart, args, options) {
    const datasetMeta = chart.getDatasetMeta(0);
    if (!datasetMeta || !datasetMeta.data || datasetMeta.data.length === 0) return;

    const active = chart._active || [];
    if (active.length > 0) return;

    const { ctx } = chart;
    const centerX = datasetMeta.data[0].x;
    const centerY = datasetMeta.data[0].y;

    const text = options.text || "";
    const subText = options.subText || "";
    if (!text) return;

    ctx.save();
    ctx.fillStyle = options.color || "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontFamily = options.fontFamily || "Kanit";
    const requestedMainSize = options.fontSize || 20;
    const requestedSubSize = options.subFontSize || 11;
    const firstArc = datasetMeta.data[0];
    const innerRadius = Number(firstArc.innerRadius) || Math.min(chart.width, chart.height) * 0.28;
    const maxTextWidth = Math.max(44, innerRadius * 1.56);

    ctx.font = `${requestedMainSize}px ${fontFamily}`;
    const mainWidth = ctx.measureText(text).width;
    ctx.font = `${requestedSubSize}px ${fontFamily}`;
    const subWidth = subText ? ctx.measureText(subText).width : 0;
    const fitScale = Math.min(1, maxTextWidth / Math.max(mainWidth, subWidth, 1));
    const mainSize = Math.max(14, Math.floor(requestedMainSize * fitScale));
    const subSize = Math.max(8, Math.floor(requestedSubSize * fitScale));

    if (subText) {
      ctx.font = `${mainSize}px ${fontFamily}`;
      const lineGap = Math.max(5, Math.round(subSize * 0.45));
      const totalHeight = mainSize + lineGap + subSize;
      const mainY = centerY - totalHeight / 2 + mainSize / 2;
      const subY = centerY + totalHeight / 2 - subSize / 2;
      ctx.fillText(text, centerX, mainY);

      ctx.font = `${subSize}px ${fontFamily}`;
      ctx.fillText(subText, centerX, subY);
    } else {
      ctx.font = `${mainSize}px ${fontFamily}`;
      ctx.fillText(text, centerX, centerY);
    }

    ctx.restore();
  }
};

const externalAxisLabelsPlugin = {
  id: "externalAxisLabels",
  afterDraw(chart, args, options = {}) {
    const parent = chart.canvas?.parentElement;
    const chartArea = chart.chartArea;
    if (!parent || !chartArea) return;

    const renderAxis = (axis, config) => {
      if (!config?.enabled) return;
      const scale = chart.scales?.[axis];
      if (!scale) return;

      const container = getExternalAxisContainer(chart, parent, axis);
      const labels = chart.data?.labels || [];
      const formatter = typeof config.formatter === "function"
        ? config.formatter
        : (label) => label;
      const className = config.className || "";
      const maxItems = Number(config.maxItems) || labels.length;
      const visibleLabels = labels.slice(0, maxItems);

      container.className = [
        "chart-external-axis-labels",
        `chart-external-axis-${axis}`,
        className
      ].filter(Boolean).join(" ");
      container.innerHTML = "";

      visibleLabels.forEach((label, index) => {
        const lines = normalizeExternalAxisLines(formatter(label, index, chart));
        if (!lines.length) return;
        const canAlignEdges = axis === "x" && config.alignEdges && visibleLabels.length > 1;
        const item = document.createElement("span");
        item.className = [
          "chart-external-axis-label",
          canAlignEdges && index === 0 ? "is-first" : "",
          canAlignEdges && index === visibleLabels.length - 1 ? "is-last" : ""
        ].filter(Boolean).join(" ");
        item.title = (label || "").toString();
        lines.forEach((line) => {
          const lineEl = document.createElement("span");
          lineEl.textContent = line;
          item.appendChild(lineEl);
        });

        if (axis === "y") {
          const y = scale.getPixelForValue(index);
          const width = Math.max(24, chartArea.left - (Number(config.gap) || 8));
          item.style.left = "0px";
          item.style.top = `${y}px`;
          item.style.width = `${width}px`;
        } else {
          const x = scale.getPixelForValue(index);
          const rowGap = Number(config.rowGap) || 14;
          const yOffset = config.stagger ? rowGap * (index % 2) : 0;
          item.style.left = `${x}px`;
          item.style.top = `${chartArea.bottom + (Number(config.gap) || 8) + yOffset}px`;
          if (config.rotate) item.style.setProperty("--axis-label-rotate", `${Number(config.rotate) || 0}deg`);
        }

        container.appendChild(item);
      });
    };

    parent.classList.add("has-external-axis-labels");
    renderAxis("y", options.y);
    renderAxis("x", options.x);
  },
  afterDestroy(chart) {
    Object.values(chart.$externalAxisContainers || {}).forEach((container) => container.remove());
    chart.$externalAxisContainers = null;
  }
};

function normalizeExternalAxisLines(value) {
  const lines = Array.isArray(value) ? value : [value];
  return lines
    .map((line) => (line || "").toString().replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function formatMonthAxisLabel(label) {
  const text = (label || "").toString().replace(/\s+/g, " ").trim();
  if (!text) return [];

  const parts = text.split(" ");
  if (parts.length < 2) return [text];

  const month = parts[0];
  const rawYear = parts.slice(1).join(" ");
  const yearDigits = rawYear.replace(/[^\d]/g, "");
  const numericYear = Number(yearDigits);
  const year = yearDigits.length === 2 && Number.isFinite(numericYear)
    ? `${2500 + numericYear}`
    : rawYear;

  return [month, year];
}

function getExternalAxisContainer(chart, parent, axis) {
  chart.$externalAxisContainers = chart.$externalAxisContainers || {};
  if (chart.$externalAxisContainers[axis]?.isConnected) {
    return chart.$externalAxisContainers[axis];
  }

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  parent.appendChild(container);
  chart.$externalAxisContainers[axis] = container;
  return container;
}

function registerCenterTextPlugin() {
  if (typeof Chart === "undefined" || !Chart.register) return;
  if (!Chart.registry?.plugins?.get?.("centerText")) {
    Chart.register(centerTextPlugin);
  }
  if (!Chart.registry?.plugins?.get?.("externalAxisLabels")) {
    Chart.register(externalAxisLabelsPlugin);
  }
}

registerCenterTextPlugin();

// ===== Helpers: Project Status contexts (public / staff) =====
function buildProjectStatusContext(suffix = "", key = "public") {
  const get = (idBase) => document.getElementById(idBase + suffix);
  const sectionPage = key === "staff" ? "dashboard-staff" : "project-status";
  const sectionEl = document.querySelector(`section[data-page="${sectionPage}"]`);

  return {
    key,
    suffix,
    yearSelect: get("yearSelect"),
    orgTypeSelect: get("orgTypeSelect"),
    orgSelect: get("orgSelect"),
    projectSearchInput: get("projectSearchInput"),
    projectSearchClearBtn: get("projectSearchClear"),
    projectRefreshDataBtn: get("projectRefreshData"),
    projectExportCsvBtn: get("projectExportCsv"),
    projectClosureMailMergeExportBtn: get("projectClosureMailMergeExportCsv"),
    projectClosureExportUntilMonthInput: get("projectClosureExportUntilMonth"),
    projectClosureExportClearMonthBtn: get("projectClosureExportClearMonth"),
    projectClosureExportMonthCaptionEl: get("projectClosureExportMonthCaption"),
    projectStaffOpsPanelEl: get("projectStaffOpsPanel"),
    projectStaffSourceSheetLinkEl: get("projectStaffSourceSheetLink"),
    projectAdvanceBlockedCountEl: get("projectAdvanceBlockedCount"),
    projectAdvanceBlockedTableBodyEl: get("projectAdvanceBlockedTableBody"),
    projectTransferBlockedCountEl: get("projectTransferBlockedCount"),
    projectTransferBlockedTableBodyEl: get("projectTransferBlockedTableBody"),
    projectAdvancePendingCountEl: get("projectAdvancePendingCount"),
    projectAdvancePendingTableBodyEl: get("projectAdvancePendingTableBody"),
    projectTransferPendingCountEl: get("projectTransferPendingCount"),
    projectTransferPendingTableBodyEl: get("projectTransferPendingTableBody"),
    filterBarEl: get("filterBar"),
    totalProjectsEl: get("totalProjects"),
    pendingProjectsEl: get("pendingProjects"),
    approvedProjectsEl: get("approvedProjects"),
    closedProjectsEl: get("closedProjects"),
    totalBudgetEl: get("totalBudget"),
    closureRateEl: get("closureRate"),
    closureRateCaptionEl: get("closureRateCaption"),
    closureRateBarEl: get("closureRateBar"),
    closureRateDonutCanvas: get("closureRateDonut"),
    approvalRateEl: get("approvalRate"),
    approvalRateCaptionEl: get("approvalRateCaption"),
    approvalRateBarEl: get("approvalRateBar"),
    approvalRateDonutCanvas: get("approvalRateDonut"),
    kpiOnTimeDonutCanvas: get("kpiOnTimeDonut"),
    kpiBudgetUsageDonutCanvas: get("kpiBudgetUsageDonut"),
    avgBudgetEl: get("avgBudget"),
    avgBudgetCaptionEl: get("avgBudgetCaption"),
    activeOrgCountEl: get("activeOrgCount"),
    activeOrgCaptionEl: get("activeOrgCaption"),
    topOrgNameEl: get("topOrgName"),
    topOrgBudgetEl: get("topOrgBudget"),
    recentProjectsListEl: get("recentProjectsList"),
    longestOpenListEl: get("longestOpenList"),
    longestOpenAssistantFilterEl: get("longestOpenAssistantFilter"),
    longestOpenStatusFilterEl: get("longestOpenStatusFilter"),
    longestOpenTableCaptionEl: get("longestOpenTableCaption"),
    longestOpenTableBodyEl: get("longestOpenTableBody"),
    tableBodyEl: get("projectTableBody"),
    tableCaptionEl: get("tableCaption"),
    budgetChartSkeletonEl: get("budgetChartSkeleton"),
    statusPieSkeletonEl: get("statusPieSkeleton"),
    projectTableSkeletonEl: get("projectTableSkeleton"),
    dashboardOverviewSkeletonEl: get("dashboardOverviewSkeleton"),
    dashboardOverviewContentEl: get("dashboardOverviewContent"),
    dashboardDocumentSettingsEl: get("dashboardDocumentSettingsSection"),
    closureStatusChartDownloadBtn: get("downloadClosureStatusChartPng"),
    projectDataLoadStateEl: get("projectDataLoadState"),
    calendarSkeletonEl: get("calendarSkeleton"),
    projectTableAreaEl: get("projectTableArea"),
    projectTableLockEl: get("projectTableLock"),
    statusViewEl: get("statusView"),
    dashboardViewEl: get("dashboardView"),
    calendarViewEl: get("calendarView"),
    budgetChartCanvas: get("budgetByMonthChart"),
    statusPieCanvas: get("statusPieChart"),
    trendLineCanvas: get("trendLineChart"),
    projectBudgetComparisonCanvas: get("projectBudgetComparisonChart"),
    projectBudgetComparisonCaptionEl: get("projectBudgetComparisonCaption"),
    calendarYearSelectEl: get("calendarYearSelect"),
    calendarOrgSelectEl: get("calendarOrgSelect"),
    calendarStatusSelectEl: get("calendarStatusSelect"),
    calendarPanelTitleEl: get("calendarPanelTitle"),
    calendarContainerEl: get("calendarContainer"),
    prevMonthBtnEl: get("prevMonthBtn"),
    nextMonthBtnEl: get("nextMonthBtn"),
    viewToggleBtns: sectionEl
      ? Array.from(sectionEl.querySelectorAll(".view-toggle-btn"))
      : [],
    budgetByMonthChart: null,
    statusPieChart: null,
    trendLineChart: null,
    projectBudgetComparisonChart: null,
    chartsInitialized: false,
    currentSort: { key: null, direction: "asc" },
    currentCalendarDate: new Date(),
    isInitialized: false
  };
}

function setActiveProjectStatusContext(key) {
  const ctx = projectStatusContexts[key];
  if (!ctx) return;
  activeProjectStatusContext = key;
  // sync global refs to current context
  yearSelect = ctx.yearSelect;
  orgTypeSelect = ctx.orgTypeSelect;
  orgSelect = ctx.orgSelect;
  projectSearchInput = ctx.projectSearchInput;
  projectSearchClearBtn = ctx.projectSearchClearBtn;
  filterBarEl = ctx.filterBarEl;
  totalProjectsEl = ctx.totalProjectsEl;
  pendingProjectsEl = ctx.pendingProjectsEl;
  approvedProjectsEl = ctx.approvedProjectsEl;
  closedProjectsEl = ctx.closedProjectsEl;
  totalBudgetEl = ctx.totalBudgetEl;
  closureRateEl = ctx.closureRateEl;
  closureRateCaptionEl = ctx.closureRateCaptionEl;
  closureRateBarEl = ctx.closureRateBarEl;
  closureRateDonutCanvas = ctx.closureRateDonutCanvas;
  approvalRateEl = ctx.approvalRateEl;
  approvalRateCaptionEl = ctx.approvalRateCaptionEl;
  approvalRateBarEl = ctx.approvalRateBarEl;
  approvalRateDonutCanvas = ctx.approvalRateDonutCanvas;
  kpiOnTimeDonutCanvas = ctx.kpiOnTimeDonutCanvas;
  kpiBudgetUsageDonutCanvas = ctx.kpiBudgetUsageDonutCanvas;
  avgBudgetEl = ctx.avgBudgetEl;
  avgBudgetCaptionEl = ctx.avgBudgetCaptionEl;
  activeOrgCountEl = ctx.activeOrgCountEl;
  activeOrgCaptionEl = ctx.activeOrgCaptionEl;
  topOrgNameEl = ctx.topOrgNameEl;
  topOrgBudgetEl = ctx.topOrgBudgetEl;
  recentProjectsListEl = ctx.recentProjectsListEl;
  longestOpenListEl = ctx.longestOpenListEl;
  longestOpenAssistantFilterEl = ctx.longestOpenAssistantFilterEl;
  longestOpenStatusFilterEl = ctx.longestOpenStatusFilterEl;
  longestOpenTableCaptionEl = ctx.longestOpenTableCaptionEl;
  longestOpenTableBodyEl = ctx.longestOpenTableBodyEl;
  tableBodyEl = ctx.tableBodyEl;
  tableCaptionEl = ctx.tableCaptionEl;
  budgetChartSkeletonEl = ctx.budgetChartSkeletonEl;
  statusPieSkeletonEl = ctx.statusPieSkeletonEl;
  projectTableSkeletonEl = ctx.projectTableSkeletonEl;
  dashboardOverviewSkeletonEl = ctx.dashboardOverviewSkeletonEl;
  dashboardOverviewContentEl = ctx.dashboardOverviewContentEl;
  calendarSkeletonEl = ctx.calendarSkeletonEl;
  projectTableAreaEl = ctx.projectTableAreaEl;
  projectTableLockEl = ctx.projectTableLockEl;
  statusViewEl = ctx.statusViewEl;
  dashboardViewEl = ctx.dashboardViewEl;
  calendarViewEl = ctx.calendarViewEl;
  budgetByMonthChart = ctx.budgetByMonthChart;
  statusPieChart = ctx.statusPieChart;
  trendLineChart = ctx.trendLineChart;
  projectBudgetComparisonChart = ctx.projectBudgetComparisonChart;
  currentSort = ctx.currentSort;
  currentCalendarDate = ctx.currentCalendarDate;
  calendarYearSelectEl = ctx.calendarYearSelectEl;
  calendarOrgSelectEl = ctx.calendarOrgSelectEl;
  calendarStatusSelectEl = ctx.calendarStatusSelectEl;
  calendarPanelTitleEl = ctx.calendarPanelTitleEl;
  calendarContainerEl = ctx.calendarContainerEl;
  prevMonthBtnEl = ctx.prevMonthBtnEl;
  nextMonthBtnEl = ctx.nextMonthBtnEl;
  // sync chart refs if already created
  budgetByMonthChart = ctx.budgetByMonthChart || null;
  statusPieChart = ctx.statusPieChart || null;
  trendLineChart = ctx.trendLineChart || null;
  projectBudgetComparisonChart = ctx.projectBudgetComparisonChart || null;
}

function syncChartsToContext(key) {
  const ctx = projectStatusContexts[key];
  if (!ctx) return;
  ctx.budgetByMonthChart = budgetByMonthChart;
  ctx.statusPieChart = statusPieChart;
  ctx.trendLineChart = trendLineChart;
  ctx.projectBudgetComparisonChart = projectBudgetComparisonChart;
}

function refreshVisibleChartsForPage(page = "") {
  const activePage =
    (page || document.querySelector(".page-view.active")?.dataset?.page || "").toString().trim();
  const ctxKey = activePage === "project-status" ? "public" : activePage === "dashboard-staff" ? "staff" : "";

  if (ctxKey && typeof refreshProjectStatus === "function") {
    refreshProjectStatus(ctxKey);
  }

  const charts = [];
  if (ctxKey) {
    const ctx = projectStatusContexts[ctxKey] || {};
    if (typeof getVisibleProjectsForContext === "function") {
      const visibleProjects = getVisibleProjectsForContext(ctxKey);
      setActiveProjectStatusContext(ctxKey);
      if (typeof updateClosureStatusChart === "function") {
        updateClosureStatusChart(visibleProjects);
      }
      if (typeof updateApprovedBudgetPie === "function") {
        updateApprovedBudgetPie(visibleProjects);
      }
      if (typeof updateTrendLineChart === "function") {
        updateTrendLineChart(visibleProjects);
      }
      const orgBudgetPanel = ctx.projectBudgetComparisonCanvas?.closest?.("[data-dashboard-budget-panel]");
      const isOrgBudgetPanelVisible = !orgBudgetPanel || !orgBudgetPanel.hidden;
      if (isOrgBudgetPanelVisible && typeof updateProjectBudgetComparisonChart === "function") {
        updateProjectBudgetComparisonChart(visibleProjects);
      }
      syncChartsToContext(ctxKey);
    }
    charts.push(
      ctx.budgetByMonthChart,
      ctx.statusPieChart,
      ctx.trendLineChart,
      ctx.projectBudgetComparisonChart
    );
    if (ctxKey === "staff") {
      charts.push(
        homeKpiChart,
        closureRateDonutChart,
        approvalRateDonutChart,
        kpiOnTimeDonutChart,
        kpiBudgetUsageDonutChart,
        clubDebtSummaryChart,
        clubDebtAgeChart
      );
    }
  }

  charts
    .filter((chart, index, list) => chart && list.indexOf(chart) === index)
    .forEach((chart) => {
      chart.resize?.();
      chart.update?.("none");
    });

  if (activePage === "budget-approval-staff") {
    window.sgcuRefreshBudgetStaffCharts?.();
  }
}

function scheduleVisibleChartsRefresh(page = "") {
  const activePage =
    (page || document.querySelector(".page-view.active")?.dataset?.page || "").toString().trim();
  window.requestAnimationFrame(() => {
    refreshVisibleChartsForPage(activePage);
    window.setTimeout(() => refreshVisibleChartsForPage(activePage), 80);
  });
}

window.sgcuRefreshVisibleCharts = refreshVisibleChartsForPage;
window.sgcuScheduleVisibleChartsRefresh = scheduleVisibleChartsRefresh;

/* Initialize Hamburger Menu (Accessibility Fix) */
document.addEventListener("DOMContentLoaded", () => {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener("click", () => {
      const isExpanded = hamburgerBtn.getAttribute("aria-expanded") === "true";
      setMobileMenuState(mobileMenu, hamburgerBtn, !isExpanded);
    });

    // Close menu when clicking a link inside
    mobileMenu.querySelectorAll("a, button").forEach((el) => {
      el.addEventListener("click", () => {
        setMobileMenuState(mobileMenu, hamburgerBtn, false);
      });
    });
  }
});
