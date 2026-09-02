/* Sorting + auth gating for Project Status */
const lastProjectStatusRefreshSignatureByContext = {
  public: "",
  staff: ""
};
const lastProjectStatusProjectsRefByContext = {
  public: null,
  staff: null
};
let activeStaffProjectCheckType = "advance";
let activeStaffProjectWorkflowTab = "checks";
let staffProjectWorkflowSpyReady = false;
let staffProjectWorkflowScrollSpyRaf = 0;
const lastStaffProjectCheckRows = {
  advance: [],
  transfer: []
};
const STAFF_FINANCE_OVERDUE_NOTIFY_HOUR = 7;
const STAFF_FINANCE_OVERDUE_NOTIFY_MINUTE = 30;
const STAFF_FINANCE_OVERDUE_NOTIFY_KEY = "sgcuStaffFinanceOverdueNotifiedDate";
let staffFinanceOverdueNotifyTimer = null;

function buildProjectStatusRefreshSignature(ctxKey) {
  const ctx = projectStatusContexts[ctxKey] || {};
  return [
    ctx.yearSelect?.value || "all",
    ctx.orgTypeSelect?.value || "all",
    ctx.orgSelect?.value || "all",
    (ctx.projectSearchInput?.value || "").trim().toLowerCase(),
    ctx.projectStatusFilterEl?.value || "all",
    (ctx.projectBudgetMinInput?.value || "").trim(),
    (ctx.projectBudgetMaxInput?.value || "").trim(),
    ctx.longestOpenAssistantFilterEl?.value || "all",
    ctx.longestOpenStatusFilterEl?.value || "all",
    document.querySelector("[data-longest-open-tab].is-active")?.dataset.longestOpenTab || "overdue",
    currentSort?.key || "",
    currentSort?.direction || "asc"
  ].join("||");
}

function sortProjects(projects, key, direction) {
  const sorted = [...projects];

  sorted.sort((a, b) => {
    let v1, v2;

    switch (key) {
      case "year":
        v1 = Number(a.year || 0);
        v2 = Number(b.year || 0);
        break;
      case "status":
        v1 = (getDisplayStatusForList(a).text || "").toString();
        v2 = (getDisplayStatusForList(b).text || "").toString();
        if (v1.localeCompare(v2, "th-TH") < 0) return direction === "asc" ? -1 : 1;
        if (v1.localeCompare(v2, "th-TH") > 0) return direction === "asc" ? 1 : -1;
        return 0;
      case "budget":
        v1 = Number(a.budget || 0);
        v2 = Number(b.budget || 0);
        break;
      default:
        return 0;
    }

    if (v1 < v2) return direction === "asc" ? -1 : 1;
    if (v1 > v2) return direction === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
}

function getVisibleProjectsForContext(ctxKey = activeProjectStatusContext) {
  setActiveProjectStatusContext(ctxKey);
  let filtered = filterProjects();

  if (currentSort && currentSort.key) {
    filtered = sortProjects(filtered, currentSort.key, currentSort.direction);
  }

  return filtered;
}

function getAllLoadedProjects() {
  return Array.isArray(projects) ? projects : [];
}

function syncProjectSortIndicators(ctxKey = activeProjectStatusContext) {
  const ctx = projectStatusContexts[ctxKey] || {};
  const ths = ctx.tableBodyEl?.closest("table")?.querySelectorAll("th.sortable") || [];
  ths.forEach((th) => {
    const isActive = currentSort?.key === th.dataset.sort;
    th.classList.toggle("sort-asc", isActive && currentSort.direction === "asc");
    th.classList.toggle("sort-desc", isActive && currentSort.direction === "desc");
    th.setAttribute(
      "aria-sort",
      isActive ? (currentSort.direction === "asc" ? "ascending" : "descending") : "none"
    );
  });
}

function refreshProjectStatus(ctxKey = activeProjectStatusContext) {
  if (!Array.isArray(projects)) return;

  setActiveProjectStatusContext(ctxKey);
  const ctx = projectStatusContexts[ctxKey];
  let didInitializeCharts = false;
  if (ctx && typeof Chart !== "undefined" && !ctx.chartsInitialized && typeof initCharts === "function") {
    initCharts(ctxKey);
    ctx.chartsInitialized = true;
    didInitializeCharts = true;
  }
  if (typeof initOrgTypeOptions === "function") initOrgTypeOptions();
  if (typeof initOrgOptions === "function") initOrgOptions();
  const signature = buildProjectStatusRefreshSignature(ctxKey);
  if (
    !didInitializeCharts &&
    lastProjectStatusRefreshSignatureByContext[ctxKey] === signature &&
    lastProjectStatusProjectsRefByContext[ctxKey] === projects
  ) {
    syncProjectSortIndicators(ctxKey);
    syncChartsToContext(ctxKey);
    return;
  }

  const filtered = getVisibleProjectsForContext(ctxKey);
  const summary = updateSummaryCards(filtered);
  updateDashboardInsights(filtered, summary);
  updateTable(filtered);
  // Chart features are loaded on demand. Project data can finish loading before
  // those scripts (for example while the home scoreboard is initializing), so
  // keep the table/summary refresh usable until the chart bundle is available.
  if (typeof updateClosureStatusChart === "function") updateClosureStatusChart(filtered);
  if (typeof updateProjectBudgetComparisonChart === "function") updateProjectBudgetComparisonChart(filtered);
  if (typeof updateApprovedBudgetPie === "function") updateApprovedBudgetPie(filtered);
  if (typeof updateTrendLineChart === "function") updateTrendLineChart(filtered);
  if (ctxKey === "staff") {
    renderHomeKpis(filtered);
    updateStaffProjectOperationsPanel(filtered);
  }

  if (tableCaptionEl) {
    tableCaptionEl.textContent = `แสดง ${filtered.length} โครงการ`;
  }
  if (projectStatusContexts[ctxKey]?.projectExportCsvBtn) {
    projectStatusContexts[ctxKey].projectExportCsvBtn.disabled = filtered.length === 0 || !isUserAuthenticated;
  }

  lastProjectStatusRefreshSignatureByContext[ctxKey] = signature;
  lastProjectStatusProjectsRefByContext[ctxKey] = projects;
  syncProjectSortIndicators(ctxKey);
  syncChartsToContext(ctxKey);
  if (ctxKey === "staff") syncDashboardDesktopFilterState();
}

function resetProjectFilters(ctxKey = activeProjectStatusContext) {
  setActiveProjectStatusContext(ctxKey);
  if (yearSelect) {
    const defaultYear = selectedProjectSourceYear || activeProjectSourceConfig?.year || "";
    const hasDefaultYear = Array.from(yearSelect.options || []).some((option) => option.value === defaultYear);
    yearSelect.value =
      defaultYear && hasDefaultYear
        ? defaultYear
        : yearSelect.options[0]?.value || "all";
  }
  if (orgTypeSelect) orgTypeSelect.value = "all";
  initOrgOptions();
  if (orgSelect) orgSelect.value = "all";
  if (projectSearchInput) projectSearchInput.value = "";
  if (currentSort) {
    currentSort.key = null;
    currentSort.direction = "asc";
  }
  lastProjectStatusRefreshSignatureByContext[ctxKey] = "";
  lastProjectStatusProjectsRefByContext[ctxKey] = null;
  syncProjectSortIndicators(ctxKey);
  refreshProjectStatus(ctxKey);
}

function exportVisibleProjectsCsv(ctxKey = activeProjectStatusContext) {
  if (!isUserAuthenticated) return;
  const visibleProjects = getVisibleProjectsForContext(ctxKey);
  if (!visibleProjects.length || !window.sgcuCsvExport?.download) return;

  const headers = [
    "รหัสโครงการ",
    "ชื่อโครงการ",
    "ประเภทองค์กร",
    "ฝ่าย/ชมรม",
    "สถานะ",
    "งบประมาณ",
    "แหล่งเงิน",
    "วันสิ้นสุดการปฏิบัติงาน",
    "กำหนดปิดโครงการ"
  ];
  const rows = visibleProjects.map((project) => {
    const displayStatus = getDisplayStatusForList(project);
    return {
      "รหัสโครงการ": project.code || "",
      "ชื่อโครงการ": project.name || "",
      "ประเภทองค์กร": project.orgGroup || "",
      "ฝ่าย/ชมรม": project.orgName || "",
      "สถานะ": displayStatus.text || project.statusMain || project.status || "",
      "งบประมาณ": project.budget || 0,
      "แหล่งเงิน": project.fundSource || "",
      "วันสิ้นสุดการปฏิบัติงาน": project.lastWorkDate || "",
      "กำหนดปิดโครงการ": project.closeDueDate || ""
    };
  });

  window.sgcuCsvExport.download({
    headers,
    rows,
    fileName: ctxKey === "staff" ? "sgcu-treasurer-handover-staff" : "sgcu-project-status"
  });
}

function isApprovedProjectForFinanceOps(project) {
  const status = (project?.statusMain || project?.approvalStatus || "").toString().trim();
  const closeStatus = (project?.statusClose || "").toString().trim();
  return status === "อนุมัติโครงการ" && closeStatus !== "ยกเลิกโครงการ";
}

function getProjectDaysToDeadline(project) {
  const days = project?.daysToDeadline;
  return typeof days === "number" && !isNaN(days) ? days : null;
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getProjectLastWorkDate(project) {
  if (project?.lastWorkDateObj instanceof Date && !isNaN(project.lastWorkDateObj.getTime())) {
    return project.lastWorkDateObj;
  }
  return parseProjectDate(project?.lastWorkDate || "");
}

function formatProjectCheckRemainingDays(days) {
  if (typeof days !== "number" || !Number.isFinite(days)) return "-";
  if (days < 0) return `เลยกำหนด ${Math.abs(days).toLocaleString("th-TH")} วัน`;
  if (days === 0) return "วันนี้";
  return `เหลือ ${days.toLocaleString("th-TH")} วัน`;
}

function getProjectCheckDateDiffDays(targetDate) {
  if (!(targetDate instanceof Date) || isNaN(targetDate.getTime())) return null;
  const today = getTodayStart();
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return Math.floor((targetStart.getTime() - today.getTime()) / 86400000);
}

function getAdvanceCheckMeta(project) {
  const advanceStatus = (project.advanceStatus || "").toString().trim();
  if (advanceStatus !== "ยังไม่เริ่มดำเนินการ") return null;

  const lastWorkDate = getProjectLastWorkDate(project);
  if (!lastWorkDate) return null;

  const daysToWorkDate = getProjectCheckDateDiffDays(lastWorkDate);
  if (daysToWorkDate === null) return null;

  const remainingDays = daysToWorkDate - 8;
  return { remainingDays, remainingText: formatProjectCheckRemainingDays(remainingDays) };
}

function getTransferCheckMeta(project) {
  const transferStatus = (project.transferStatus || "").toString().trim();
  const days = getProjectDaysToDeadline(project);
  return days !== null && transferStatus === ""
    ? { remainingDays: days, remainingText: formatProjectCheckRemainingDays(days) }
    : null;
}

function buildProjectOpsRows(filtered, metaGetter) {
  return (filtered || [])
    .map((project) => {
      const meta = metaGetter(project);
      return meta ? { project, ...meta } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aDays = a.remainingDays;
      const bDays = b.remainingDays;
      if (aDays === null && bDays === null) return 0;
      if (aDays === null) return 1;
      if (bDays === null) return -1;
      return aDays - bDays;
    });
}

function getStaffFinanceOverdueRows() {
  return {
    advance: (lastStaffProjectCheckRows.advance || []).filter((row) => row.remainingDays < 0),
    transfer: (lastStaffProjectCheckRows.transfer || []).filter((row) => row.remainingDays < 0)
  };
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStaffFinanceNotificationUrl() {
  return `${window.location.origin}${window.location.pathname}#dashboard-staff`;
}

async function showStaffFinanceOverdueNotification(overdueRows) {
  const advanceCount = overdueRows.advance.length;
  const transferCount = overdueRows.transfer.length;
  if (!advanceCount && !transferCount) return false;

  const total = advanceCount + transferCount;
  const firstProject = overdueRows.advance[0]?.project || overdueRows.transfer[0]?.project || null;
  const firstProjectText = firstProject
    ? ` รายการแรก: ${firstProject.code || "-"} ${firstProject.name || ""}`.trim()
    : "";
  const body = [
    advanceCount ? `ยืมรองจ่าย ${advanceCount.toLocaleString("th-TH")} โครงการ` : "",
    transferCount ? `โอนงบประมาณ ${transferCount.toLocaleString("th-TH")} โครงการ` : ""
  ].filter(Boolean).join(" / ");
  const notificationOptions = {
    data: { url: getStaffFinanceNotificationUrl() }
  };

  if (window.sgcuWebPush?.showNotification) {
    return window.sgcuWebPush.showNotification(
      `มีงานการเงินเลยกำหนด ${total.toLocaleString("th-TH")} โครงการ`,
      `${body}${firstProjectText ? `\n${firstProjectText}` : ""}`,
      notificationOptions
    );
  }

  if (typeof window.Notification === "undefined" || Notification.permission !== "granted") return false;
  // eslint-disable-next-line no-new
  new Notification(`มีงานการเงินเลยกำหนด ${total.toLocaleString("th-TH")} โครงการ`, {
    body: `${body}${firstProjectText ? `\n${firstProjectText}` : ""}`,
    icon: "img/icons/treasurer-icon-192.png",
    badge: "img/icons/treasurer-icon-192.png",
    data: notificationOptions.data
  });
  return true;
}

async function maybeNotifyStaffFinanceOverdue(now = new Date()) {
  if (!isUserAuthenticated) return;
  if (typeof staffViewMode !== "undefined" && staffViewMode !== "staff") return;
  if (
    now.getHours() < STAFF_FINANCE_OVERDUE_NOTIFY_HOUR ||
    (now.getHours() === STAFF_FINANCE_OVERDUE_NOTIFY_HOUR && now.getMinutes() < STAFF_FINANCE_OVERDUE_NOTIFY_MINUTE)
  ) return;

  const todayKey = getLocalDateKey(now);
  try {
    if (window.localStorage?.getItem(STAFF_FINANCE_OVERDUE_NOTIFY_KEY) === todayKey) return;
  } catch (_) {
    // continue without localStorage dedupe
  }

  const overdueRows = getStaffFinanceOverdueRows();
  if (!overdueRows.advance.length && !overdueRows.transfer.length) return;

  const didShow = await showStaffFinanceOverdueNotification(overdueRows);
  if (!didShow) return;

  try {
    window.localStorage?.setItem(STAFF_FINANCE_OVERDUE_NOTIFY_KEY, todayKey);
  } catch (_) {
    // ignore localStorage errors
  }
}

function scheduleStaffFinanceOverdueNotification() {
  if (staffFinanceOverdueNotifyTimer) {
    window.clearTimeout(staffFinanceOverdueNotifyTimer);
    staffFinanceOverdueNotifyTimer = null;
  }

  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(STAFF_FINANCE_OVERDUE_NOTIFY_HOUR, STAFF_FINANCE_OVERDUE_NOTIFY_MINUTE, 0, 0);
  if (nextRun.getTime() <= now.getTime()) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  const delay = Math.max(1000, nextRun.getTime() - now.getTime());
  staffFinanceOverdueNotifyTimer = window.setTimeout(() => {
    void maybeNotifyStaffFinanceOverdue(new Date());
    scheduleStaffFinanceOverdueNotification();
  }, delay);
}

function syncStaffFinanceOverdueNotification() {
  scheduleStaffFinanceOverdueNotification();
  void maybeNotifyStaffFinanceOverdue(new Date());
}

function renderProjectOpsTable(tbody, rows) {
  if (!tbody) return;
  const colSpan = 3;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="project-staff-alert-empty">ยังไม่มีรายการที่ต้องตรวจ</td></tr>`;
    return;
  }

  const html = rows.map(({ project, remainingDays, remainingText }) => `
    <tr class="${remainingDays < 0 ? "is-overdue" : ""}">
      <td class="project-staff-alert-code-cell"><span class="project-staff-alert-code">${escapeHtml(project.code || "")}</span></td>
      <td class="project-staff-alert-project-cell">
        <div class="project-staff-alert-project">${escapeHtml(project.name || "")}</div>
        <div class="project-staff-alert-org">${escapeHtml(project.orgName || "")}</div>
      </td>
      <td class="project-staff-alert-meta-cell">${escapeHtml(remainingText || "-")}</td>
    </tr>
  `).join("");

  tbody.innerHTML = html;
}

function syncStaffProjectCheckTabs() {
  document.querySelectorAll("[data-project-check-type]").forEach((btn) => {
    const type = btn.dataset.projectCheckType || "advance";
    btn.classList.toggle("is-active", type === activeStaffProjectCheckType);
    btn.setAttribute("aria-selected", type === activeStaffProjectCheckType ? "true" : "false");
    if (btn.dataset.projectCheckBound === "true") return;
    btn.dataset.projectCheckBound = "true";
    btn.addEventListener("click", () => {
      activeStaffProjectCheckType = type;
      syncStaffProjectCheckTabs();
      renderProjectOpsTable(
        projectStatusContexts.staff?.projectAdvanceBlockedTableBodyEl,
        lastStaffProjectCheckRows[activeStaffProjectCheckType] || []
      );
    });
  });
}

function setActiveStaffProjectWorkflowTab(tab = "checks") {
  const normalized = (tab || "checks").toString().trim() || "checks";
  activeStaffProjectWorkflowTab = normalized;
  document.querySelectorAll("[data-project-workflow-tab]").forEach((btn) => {
    const btnTab = btn.dataset.projectWorkflowTab || "checks";
    const isActive = btnTab === activeStaffProjectWorkflowTab;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  document.querySelectorAll("[data-project-workflow-toc]").forEach((btn) => {
    const btnTab = btn.dataset.projectWorkflowToc || "";
    const isActive = btnTab === activeStaffProjectWorkflowTab;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-current", isActive ? "true" : "false");
  });
  window.syncDashboardMobileActionBar?.();
}

function syncDashboardDesktopFilterState() {
  const button = document.querySelector('[data-project-workflow-toc="filters"]');
  const ctx = projectStatusContexts.staff;
  if (!button || !ctx) return;

  const currentYear = (ctx.yearSelect?.value || "all").toString();
  if (!button.dataset.filterDefaultYear) {
    button.dataset.filterDefaultYear = currentYear;
  }
  const activeCount = [
    currentYear !== button.dataset.filterDefaultYear,
    (ctx.orgTypeSelect?.value || "all") !== "all",
    (ctx.orgSelect?.value || "all") !== "all",
    Boolean((ctx.projectSearchInput?.value || "").trim())
  ].filter(Boolean).length;

  button.classList.toggle("has-active-filters", activeCount > 0);
  button.dataset.filterCount = activeCount ? String(activeCount) : "";
  button.setAttribute(
    "aria-label",
    activeCount ? `เปิดตัวกรอง (${activeCount} รายการใช้งานอยู่)` : "เปิดตัวกรอง"
  );
}

function syncStaffProjectWorkflowTabs() {
  const filterHost = document.getElementById("filterBarHostDashboardStaff");
  const filterBackdrop = document.getElementById("dashboardFilterBackdropStaff");
  const filterCloseBtn = document.getElementById("dashboardFilterCloseStaff");
  const filterTocBtn = document.querySelector('[data-project-workflow-toc="filters"]');
  const filterNav = filterTocBtn?.closest(".dashboard-sticky-controls") || null;
  let filterCloseTimer = null;
  const finishClosingFloatingFilters = () => {
    filterHost?.classList.remove("is-floating-open", "is-closing");
    filterBackdrop?.classList.remove("is-closing");
    filterBackdrop?.setAttribute("hidden", "");
    document.body.classList.remove("has-dashboard-floating-filter");
    if (filterNav?.parentNode && filterHost && filterBackdrop) {
      filterNav.parentNode.insertBefore(filterBackdrop, filterNav);
      filterNav.parentNode.insertBefore(filterHost, filterNav);
    }
    filterCloseTimer = null;
  };
  const closeFloatingFilters = () => {
    filterTocBtn?.setAttribute("aria-expanded", "false");
    if (!filterHost?.classList.contains("is-floating-open")) {
      finishClosingFloatingFilters();
      return;
    }
    filterHost.classList.add("is-closing");
    filterBackdrop?.classList.add("is-closing");
    if (filterCloseTimer) window.clearTimeout(filterCloseTimer);
    filterCloseTimer = window.setTimeout(finishClosingFloatingFilters, 170);
  };
  const openFloatingFilters = () => {
    if (filterCloseTimer) {
      window.clearTimeout(filterCloseTimer);
      filterCloseTimer = null;
    }
    if (filterBackdrop) document.body.appendChild(filterBackdrop);
    if (filterHost) document.body.appendChild(filterHost);
    filterHost?.classList.remove("is-closing");
    filterBackdrop?.classList.remove("is-closing");
    filterHost?.classList.add("is-floating-open");
    filterBackdrop?.removeAttribute("hidden");
    filterTocBtn?.setAttribute("aria-expanded", "true");
    document.body.classList.add("has-dashboard-floating-filter");
    window.setTimeout(() => {
      document.getElementById("yearSelectStaff")?.focus?.({ preventScroll: true });
    }, 80);
  };

  if (filterCloseBtn && filterCloseBtn.dataset.dashboardFilterBound !== "true") {
    filterCloseBtn.dataset.dashboardFilterBound = "true";
    filterCloseBtn.addEventListener("click", closeFloatingFilters);
  }
  if (filterBackdrop && filterBackdrop.dataset.dashboardFilterBound !== "true") {
    filterBackdrop.dataset.dashboardFilterBound = "true";
    filterBackdrop.addEventListener("click", closeFloatingFilters);
  }
  if (filterHost && filterHost.dataset.dashboardFilterEscapeBound !== "true") {
    filterHost.dataset.dashboardFilterEscapeBound = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && filterHost.classList.contains("is-floating-open")) {
        closeFloatingFilters();
        filterTocBtn?.focus?.({ preventScroll: true });
      }
    });
  }

  document.querySelectorAll("[data-project-workflow-tab]").forEach((btn) => {
    const tab = btn.dataset.projectWorkflowTab || "checks";
    if (btn.dataset.projectWorkflowBound === "true") return;
    btn.dataset.projectWorkflowBound = "true";
    btn.addEventListener("click", () => {
      setActiveStaffProjectWorkflowTab(tab);
    });
  });

  document.querySelectorAll("[data-project-workflow-toc]").forEach((btn) => {
    const tab = btn.dataset.projectWorkflowToc || "";
    if (!tab) return;
    if (btn.dataset.projectWorkflowTocBound === "true") return;
    btn.dataset.projectWorkflowTocBound = "true";
    btn.addEventListener("click", () => {
      if (tab === "filters") {
        openFloatingFilters();
        return;
      }
      setActiveStaffProjectWorkflowTab(tab);
      const targetId = btn.dataset.projectWorkflowTarget || "";
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  setActiveStaffProjectWorkflowTab(activeStaffProjectWorkflowTab);
  syncDashboardDesktopFilterState();
  document.querySelectorAll("[data-project-workflow-panel]").forEach((panel) => {
    const tab = panel.dataset.projectWorkflowPanel || "checks";
    panel.hidden = tab !== activeStaffProjectWorkflowTab;
  });
  initStaffProjectWorkflowScrollSpy();
}

function setStaffProjectWorkflowTab(tab = "checks") {
  const normalized = (tab || "").toString().trim();
  if (!normalized) return;
  setActiveStaffProjectWorkflowTab(normalized);
}

window.sgcuSetStaffProjectWorkflowTab = setStaffProjectWorkflowTab;

function initStaffProjectWorkflowScrollSpy() {
  if (staffProjectWorkflowSpyReady) return;
  const navButtons = Array.from(document.querySelectorAll("[data-project-workflow-toc]"))
    .filter((btn) => (btn.dataset.projectWorkflowToc || "") !== "filters");
  const sections = navButtons
    .map((btn) => ({
      tab: btn.dataset.projectWorkflowToc || "",
      el: document.getElementById(btn.dataset.projectWorkflowTarget || "")
    }))
    .filter((item) => item.tab && item.el);
  if (!sections.length) return;

  const getHeaderOffset = () => {
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
    const navHeight = document.querySelector(".dashboard-section-nav")?.getBoundingClientRect().height || 0;
    return headerHeight + navHeight + 24;
  };

  const updateActiveFromScroll = () => {
    staffProjectWorkflowScrollSpyRaf = 0;
    const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
    if (activePage !== "dashboard-staff") return;

    const checkpoint = getHeaderOffset();
    let current = sections[0];
    sections.forEach((item) => {
      const rect = item.el.getBoundingClientRect();
      if (rect.top <= checkpoint) current = item;
    });

    const last = sections[sections.length - 1];
    if (last?.el && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
      current = last;
    }
    if (current?.tab && current.tab !== activeStaffProjectWorkflowTab) {
      setActiveStaffProjectWorkflowTab(current.tab);
    }
  };

  const scheduleUpdate = () => {
    if (staffProjectWorkflowScrollSpyRaf) return;
    staffProjectWorkflowScrollSpyRaf = window.requestAnimationFrame(updateActiveFromScroll);
  };

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("sgcu:page-active", scheduleUpdate);
  staffProjectWorkflowSpyReady = true;
  scheduleUpdate();
}

function updateStaffProjectOperationsPanel(filtered) {
  const ctx = projectStatusContexts.staff || {};
  if (!ctx.projectStaffOpsPanelEl) return;

  const data = Array.isArray(filtered) ? filtered : getAllLoadedProjects();
  if (!isUserAuthenticated) {
    ctx.projectStaffOpsPanelEl.hidden = true;
    return;
  }
  ctx.projectStaffOpsPanelEl.hidden = false;

  syncStaffProjectWorkflowTabs();
  const closureExportProjects = filterClosureMailMergeProjects(data, "staff");
  if (ctx.projectClosureMailMergeExportBtn) {
    ctx.projectClosureMailMergeExportBtn.disabled = !isUserAuthenticated || closureExportProjects.length === 0 || !window.sgcuCsvExport?.download;
  }
  if (ctx.projectClosureExportMonthCaptionEl) {
    ctx.projectClosureExportMonthCaptionEl.textContent = formatClosureExportMonthCaption(data, "staff");
  }

  const sheetUrl = (activeProjectSourceConfig?.projectUrl || "").toString().trim();
  if (ctx.projectStaffSourceSheetLinkEl) {
    if (sheetUrl) {
      ctx.projectStaffSourceSheetLinkEl.href = sheetUrl;
      ctx.projectStaffSourceSheetLinkEl.hidden = false;
    } else {
      ctx.projectStaffSourceSheetLinkEl.hidden = true;
    }
  }

  const advanceRows = buildProjectOpsRows(data, getAdvanceCheckMeta);
  const transferRows = buildProjectOpsRows(data, getTransferCheckMeta);
  lastStaffProjectCheckRows.advance = advanceRows;
  lastStaffProjectCheckRows.transfer = transferRows;
  syncStaffFinanceOverdueNotification();
  syncStaffProjectCheckTabs();
  if (ctx.projectAdvanceBlockedCountEl) ctx.projectAdvanceBlockedCountEl.textContent = advanceRows.length.toLocaleString("th-TH");
  if (ctx.projectTransferBlockedCountEl) ctx.projectTransferBlockedCountEl.textContent = transferRows.length.toLocaleString("th-TH");
  renderProjectOpsTable(ctx.projectAdvanceBlockedTableBodyEl, lastStaffProjectCheckRows[activeStaffProjectCheckType] || []);
}

function getProjectBudget100(project) {
  const value = project?.approvedBudget100 ?? project?.budget ?? 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function shouldIncludeClosureMailMergeProject(project) {
  const statusClose = (project?.statusClose || "").toString().trim();
  return (
    statusClose !== "" &&
    statusClose !== "ส่งกิจการนิสิตเรียบร้อย" &&
    statusClose !== "ยกเลิกโครงการ" &&
    getProjectBudget100(project) !== 0
  );
}

function parseClosureExportUntilMonth(ctxKey = "staff") {
  const value = (projectStatusContexts[ctxKey]?.projectClosureExportUntilMonthInput?.value || "").toString().trim();
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
  return {
    value,
    endDate: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
  };
}

function getProjectClosureDueDate(project) {
  if (project?.closeDueDateObj instanceof Date && !isNaN(project.closeDueDateObj.getTime())) {
    return project.closeDueDateObj;
  }
  const parsed = parseProjectDate(project?.closeDueDate || "");
  if (parsed && project) project.closeDueDateObj = parsed;
  return parsed;
}

function filterClosureMailMergeProjects(sourceProjects, ctxKey = "staff") {
  const monthFilter = parseClosureExportUntilMonth(ctxKey);
  return (sourceProjects || [])
    .filter(shouldIncludeClosureMailMergeProject)
    .filter((project) => {
      if (!monthFilter) return true;
      const dueDate = getProjectClosureDueDate(project);
      return !!dueDate && dueDate.getTime() <= monthFilter.endDate.getTime();
    });
}

function formatClosureExportMonthCaption(projects, ctxKey = "staff") {
  const monthFilter = parseClosureExportUntilMonth(ctxKey);
  const count = filterClosureMailMergeProjects(projects, ctxKey).length.toLocaleString("th-TH");
  if (!monthFilter) return `พร้อม export ${count} รายการจากทุกเดือน โดยอ้างอิงกำหนดปิดโครงการ`;
  const [year, month] = monthFilter.value.split("-");
  const monthText = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric"
  });
  return `พร้อม export ${count} รายการที่มีกำหนดปิดโครงการถึง ${monthText}`;
}

function resolveClosureMailMergeOrgName(project) {
  const group = (project?.orgGroup || "").toString().trim();
  if (group === "องค์การบริหารสโมสรนิสิต") return "องค์การบริหารสโมสรนิสิต จุฬาฯ";
  if (group === "สภานิสิต") return "สภานิสิต";
  return (project?.orgName || "").toString().trim();
}

function resolveClosureDecreePrefix(project) {
  const group = (project?.orgGroup || "").toString().trim();
  const map = {
    "ชมรมฝ่ายศิลปะและวัฒนธรรม": "ART",
    "ชมรมฝ่ายวิชาการ": "VCK",
    "ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์": "PHT",
    "ชมรมฝ่ายกีฬา": "SPT",
    "องค์การบริหารสโมสรนิสิต": "SGCU",
    "สภานิสิต": "SCCU"
  };
  return map[group] || "";
}

function resolveClosureAcademicYearShort(project) {
  const year = (project?.year || selectedProjectSourceYear || "").toString().trim();
  return year ? year.slice(-2) : "";
}

function buildClosureDecreeText(project) {
  const prefix = resolveClosureDecreePrefix(project);
  const year = resolveClosureAcademicYearShort(project);
  const base = [prefix, year].filter(Boolean).join("");
  return base ? `${base}/........` : "";
}

function formatCsvTextCell(value) {
  const text = (value || "").toString().trim();
  if (!text) return "";
  return `="${text.replaceAll("\"", "\"\"")}"`;
}

function getOrgFilterEntryForProject(project) {
  const orgName = (project?.orgName || "").toString().trim();
  const orgGroup = (project?.orgGroup || "").toString().trim();
  const rows = typeof getProjectOrgFiltersForYear === "function"
    ? getProjectOrgFiltersForYear(project?.year)
    : (orgFilters || []);
  return rows.find((entry) =>
    (entry.name || "").toString().trim() === orgName &&
    (!orgGroup || (entry.group || "").toString().trim() === orgGroup)
  ) || rows.find((entry) => (entry.name || "").toString().trim() === orgName) || null;
}

function resolveClosureAccountName(project) {
  return resolveClosureMailMergeOrgName(project);
}

function resolveClosureAccountNo(project) {
  const entry = getOrgFilterEntryForProject(project);
  return entry?.accountNo || "";
}

function exportClosureMailMergeCsv(ctxKey = "staff") {
  if (!isUserAuthenticated) return;
  const sourceProjects = ctxKey === "staff" ? getAllLoadedProjects() : getVisibleProjectsForContext(ctxKey);
  if (!sourceProjects.length || !window.sgcuCsvExport?.download) return;

  const headers = [
    "รหัสโครงการ",
    "ตามที่",
    "ฎีกา",
    "โครงการ",
    "ครั้งที่",
    "จำนวน",
    "บัญชี",
    "เลขที่"
  ];

  const monthFilter = parseClosureExportUntilMonth(ctxKey);
  const rows = filterClosureMailMergeProjects(sourceProjects, ctxKey)
    .map((project) => ({
      "รหัสโครงการ": project.code || "",
      "ตามที่": resolveClosureMailMergeOrgName(project),
      "ฎีกา": buildClosureDecreeText(project),
      "โครงการ": project.name || "",
      "ครั้งที่": formatCsvTextCell(project.councilMeetingNo),
      "จำนวน": getProjectBudget100(project),
      "บัญชี": resolveClosureAccountName(project),
      "เลขที่": resolveClosureAccountNo(project)
    }));

  window.sgcuCsvExport.download({
    headers,
    rows,
    fileName: monthFilter?.value
      ? `sgcu-project-closure-mail-merge-until-${monthFilter.value}`
      : "sgcu-project-closure-mail-merge"
  });
}


function setLoading(isLoading, ctxKey = activeProjectStatusContext) {
  const ctx = projectStatusContexts[ctxKey] || {};
  const budgetCanvas = ctx.budgetChartCanvas;
  const statusCanvas = ctx.statusPieCanvas;

  const budgetSkel = ctx.budgetChartSkeletonEl;
  const statusSkel = ctx.statusPieSkeletonEl;
  const tableSkel = ctx.projectTableSkeletonEl;
  const calendarSkel = ctx.calendarSkeletonEl;
  const dashboardSkel = ctx.dashboardOverviewSkeletonEl;
  const dashboardContent = ctx.dashboardOverviewContentEl;
  const dashboardReadiness = ctx.projectStaffOpsPanelEl;
  const dashboardDocumentSettings = ctx.dashboardDocumentSettingsEl;

  if (budgetSkel) budgetSkel.style.display = isLoading ? "block" : "none";
  if (statusSkel) statusSkel.style.display = isLoading ? "flex" : "none";
  if (tableSkel) tableSkel.style.display = isLoading ? "block" : "none";
  if (calendarSkel) calendarSkel.style.display = isLoading ? "grid" : "none";
  if (dashboardSkel) dashboardSkel.style.display = isLoading ? "grid" : "none";

  if (budgetCanvas) budgetCanvas.style.visibility = isLoading ? "hidden" : "visible";
  if (statusCanvas) statusCanvas.style.visibility = isLoading ? "hidden" : "visible";
  if (ctx.tableBodyEl) ctx.tableBodyEl.style.visibility = isLoading ? "hidden" : "visible";
  if (ctx.calendarContainerEl) ctx.calendarContainerEl.style.visibility = isLoading ? "hidden" : "visible";
  if (dashboardReadiness) dashboardReadiness.style.visibility = isLoading ? "hidden" : "visible";
  if (dashboardDocumentSettings) dashboardDocumentSettings.style.visibility = isLoading ? "hidden" : "visible";
  if (dashboardContent) dashboardContent.style.visibility = isLoading ? "hidden" : "visible";

  budgetCanvas?.parentElement?.classList.toggle("is-loading", isLoading);
  statusCanvas?.parentElement?.classList.toggle("is-loading", isLoading);
  ctx.projectTableAreaEl?.classList.toggle("is-loading", isLoading);
  dashboardReadiness?.classList.toggle("is-loading", isLoading);
  dashboardDocumentSettings?.classList.toggle("is-loading", isLoading);
  dashboardContent?.classList.toggle("is-loading", isLoading);

  budgetCanvas?.parentElement?.setAttribute("aria-busy", isLoading ? "true" : "false");
  statusCanvas?.parentElement?.setAttribute("aria-busy", isLoading ? "true" : "false");
  ctx.projectTableAreaEl?.setAttribute("aria-busy", isLoading ? "true" : "false");
  dashboardReadiness?.setAttribute("aria-busy", isLoading ? "true" : "false");
  dashboardDocumentSettings?.setAttribute("aria-busy", isLoading ? "true" : "false");
  dashboardContent?.setAttribute("aria-busy", isLoading ? "true" : "false");

  if (isLoading) {
    if (ctx.projectTableAreaEl) ctx.projectTableAreaEl.style.display = "block";
    if (ctx.projectTableLockEl) ctx.projectTableLockEl.style.display = "none";
  } else {
    toggleProjectStatusAccess(isUserAuthenticated, ctxKey);
  }
}

function setProjectDataLoadState(type = "", message = "", options = {}) {
  Object.values(projectStatusContexts || {}).forEach((ctx) => {
    const stateEl = ctx?.projectDataLoadStateEl;
    if (!stateEl) return;
    const safeType = (type || "").toString().trim();
    const text = (message || "").toString().trim();
    if (!safeType || !text) {
      stateEl.hidden = true;
      stateEl.replaceChildren();
      return;
    }

    stateEl.hidden = false;
    renderLoadState(stateEl, safeType, text, {
      className: `load-state load-state-${safeType}`,
      captionClassName: "load-state-caption",
      retryButtonId: options.retryButtonId || `projectDataRetryButton${ctx.suffix || ""}`,
      onRetry: typeof options.onRetry === "function" ? options.onRetry : null,
      retryLabel: options.retryLabel || "ลองโหลดข้อมูลใหม่"
    });
  });
}

function toggleProjectStatusAccess(isAuthenticated, ctxKey = activeProjectStatusContext) {
  const ctx = projectStatusContexts[ctxKey] || {};
  if (ctx.projectTableAreaEl) {
    ctx.projectTableAreaEl.style.display = isAuthenticated ? "block" : "none";
  }
  if (ctx.projectTableLockEl) {
    ctx.projectTableLockEl.style.display = isAuthenticated ? "none" : "block";
  }
  if (ctx.projectExportCsvBtn) {
    ctx.projectExportCsvBtn.disabled = !isAuthenticated;
  }
  if (ctx.projectStaffOpsPanelEl) {
    if (!isAuthenticated) {
      ctx.projectStaffOpsPanelEl.hidden = true;
    } else {
      ctx.projectStaffOpsPanelEl.hidden = false;
      syncStaffProjectWorkflowTabs();
    }
  }
  if (ctx.projectClosureMailMergeExportBtn) {
    const availableProjects = isAuthenticated && ctxKey === "staff"
      ? getAllLoadedProjects()
      : isAuthenticated
        ? getVisibleProjectsForContext(ctxKey)
        : [];
    ctx.projectClosureMailMergeExportBtn.disabled = !isAuthenticated || availableProjects.length === 0;
  }
}

function updateNavVisibility(isAuthenticated) {
  if (!navLinksAll.length) return;
  const allowedPages = getAllowedPagesForCurrentState();
  const publicAllowed = new Set(["home", "about", "project-status", "news", "financial-docs", "login"]);
  navLinksAll.forEach((link) => {
    const mode = link.dataset.visible || "public";
    const page = link.dataset.page || "";
    if (!allowedPages.has(page)) {
      link.style.display = "none";
      return;
    }
    if (!isAuthenticated && !publicAllowed.has(page)) {
      link.style.display = "none";
    } else if (mode === "public-only") {
      link.style.display = isAuthenticated ? "none" : "";
    } else {
      link.style.display = "";
    }
  });
  syncDesktopNavGroupVisibility();
  syncMobileNavGroupVisibility();
  syncMobileBottomNavVisibility();
  if (typeof window.syncManagementPanels === "function") {
    window.syncManagementPanels();
  }
  if (typeof window.syncManagementLinks === "function") {
    window.syncManagementLinks(document);
  }
}

function syncDesktopNavGroupVisibility() {
  const navGroups = Array.from(document.querySelectorAll(".desktop-nav .nav-group"));
  navGroups.forEach((group) => {
    const toggleBtn = group.querySelector(".nav-group-toggle");
    const menu = group.querySelector(".nav-group-menu");
    if (!toggleBtn || !menu) return;
    const links = Array.from(menu.querySelectorAll("a[data-page]"));
    const hasVisibleLinks = links.some((link) => link.style.display !== "none");

    group.style.display = hasVisibleLinks ? "" : "none";
    if (hasVisibleLinks) return;

    // Ensure hidden groups are also closed/reset.
    group.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
    menu.classList.remove("show");
    menu.setAttribute("aria-hidden", "true");
  });
}

function syncMobileNavGroupVisibility() {
  const mobileGroups = Array.from(document.querySelectorAll(".mobile-menu .mobile-menu-group"));
  const isStaffMode = !!staffAuthUser && staffViewMode === "staff";
  mobileGroups.forEach((group) => {
    const navRole = group.dataset.mobileNav || "common";
    const roleHidden =
      (navRole === "general" && isStaffMode) ||
      (navRole === "staff" && !isStaffMode);
    if (roleHidden) {
      group.style.display = "none";
      group.removeAttribute("open");
      return;
    }

    const links = Array.from(group.querySelectorAll("a[data-page]"));
    const visibleLinks = links.filter((link) => link.style.display !== "none");
    const hasVisibleLinks = visibleLinks.length > 0;
    const hasSingleVisibleLink = visibleLinks.length === 1;

    group.classList.toggle("is-single", hasSingleVisibleLink);
    if (hasSingleVisibleLink) {
      group.setAttribute("open", "");
    }
    group.style.display = hasVisibleLinks ? "" : "none";
    if (!hasVisibleLinks) {
      group.classList.remove("is-single");
      group.removeAttribute("open");
    }
  });
}

function syncMobileBottomNavVisibility() {
  const bottomRoles = Array.from(document.querySelectorAll(".mobile-bottom-role"));
  const isStaffMode = !!staffAuthUser && staffViewMode === "staff";
  bottomRoles.forEach((role) => {
    const navRole = role.dataset.mobileBottomNav || "common";
    const roleHidden =
      (navRole === "general" && isStaffMode) ||
      (navRole === "staff" && !isStaffMode);
    role.style.display = roleHidden ? "none" : "";
  });
  window.dispatchEvent(new CustomEvent("sgcu:mobile-bottom-nav-visibility"));
}

function syncRoleNavContainers() {
  const isStaffMode = !!staffAuthUser && staffViewMode === "staff";
  const desktopGeneral = document.getElementById("desktopNavGeneral");
  const desktopStaff = document.getElementById("desktopNavStaff");

  if (desktopGeneral) desktopGeneral.style.display = isStaffMode ? "none" : "flex";
  if (desktopStaff) desktopStaff.style.display = isStaffMode ? "flex" : "none";
  syncMobileBottomNavVisibility();
}

function normalizeStaffRoleCode(role) {
  const raw = (role || "").toString().trim();
  if (!raw) return "";
  const normalized = raw.replace(/^0+(?=\d)/, "");
  return normalized || "0";
}

function hasStaffRoleToken(roleValue, roleToken) {
  const target = normalizeStaffRoleCode(roleToken);
  const tokens = (roleValue || "")
    .toString()
    .split(",")
    .map((item) => normalizeStaffRoleCode(item))
    .filter(Boolean);
  return tokens.includes(target);
}

const STAFF_HEAD_OVERRIDES = new Set([
  "tuwanon.kimchiang@gmail.com",
  "treasurer.sgcu68@gmail.com"
]);
const STAFF_PAGE_OPTIONS = [
  "dashboard-staff",
  "treasurer-handover-staff",
  "system-data-staff",
  "borrow-assets-staff",
  "meeting-room-staff",
  "budget-approval-staff",
  "content-management-staff",
  "content-news-staff",
  "content-documents-staff",
  "staff-approval",
  "staff-directory-staff",
  "staff-temporary-access-staff",
  "org-representative-approval-staff",
  "login"
];
const STAFF_FULL_ACCESS_PAGES = new Set(STAFF_PAGE_OPTIONS);
let unsubscribeCurrentStaffApproval = null;
let unsubscribeStaffPositionAccess = null;
let unsubscribeCurrentRepresentativeApproval = null;
let staffPositionAccessByName = {};
let staffPositionAccessByCode = {};
const currentStaffApprovalState = {
  email: "",
  hasApproved: false,
  approvedDivisionCodesYY: []
};
const currentRepresentativeApprovalState = {
  email: "",
  hasApproved: false,
  loaded: false
};

function normalizeDivisionCodeYY(value) {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  return raw.padStart(2, "0").slice(-2);
}

function resolveStaffDivisionCodeYY(profile) {
  const directYY = normalizeDivisionCodeYY(profile?.divisionCodeYY || profile?.positionCodeYY || "");
  if (directYY) return directYY;
  const positionCode = (profile?.positionCode || "").toString().trim();
  const match = positionCode.match(/^SGCU\d{2}\.10\.(\d{2})\.\d{2}-\d{3}$/i);
  if (match?.[1]) return normalizeDivisionCodeYY(match[1]);
  const positionText = (profile?.position || "").toString().trim().replace(/\s+/g, " ");
  if (positionText) {
    if (positionText === "เหรัญญิก" || positionText === "เลขานุการฝ่ายเหรัญญิก") return "00";
    if (positionText === "ผู้ช่วยเหรัญญิก") return "01";
    if (positionText.includes("บริหารและพัฒนางบประมาณ")) return "02";
    if (positionText.includes("หาทุนและสิทธิประโยชน์")) return "03";
    if (positionText.includes("กายภาพและพัสดุ")) return "04";
    if (positionText.includes("สำนักบริหารกิจการนิสิต")) return "09";
  }
  return "";
}

function resolveStaffDivisionCodesYY(profile) {
  const codes = new Set();
  const positions = Array.isArray(profile?.positions) ? profile.positions : [];
  positions.forEach((entry) => {
    const byField = normalizeDivisionCodeYY(entry?.yy || entry?.positionCodeYY || entry?.divisionCodeYY || "");
    if (byField) {
      codes.add(byField);
      return;
    }
    const byCode = normalizeDivisionCodeYY(
      (entry?.code || entry?.positionCode || "").toString().match(/^SGCU\d{2}\.10\.(\d{2})\.\d{2}-\d{3}$/i)?.[1] || ""
    );
    if (byCode) codes.add(byCode);
  });
  const legacy = resolveStaffDivisionCodeYY(profile);
  if (legacy) codes.add(legacy);
  return Array.from(codes);
}

function resolveDivisionCodeYYFromPositionLabel(positionText) {
  const text = (positionText || "").toString().trim().replace(/\s+/g, " ");
  if (!text) return "";
  if (text === "เหรัญญิก" || text === "เลขานุการฝ่ายเหรัญญิก") return "00";
  if (text === "ผู้ช่วยเหรัญญิก") return "01";
  if (text.includes("บริหารและพัฒนางบประมาณ")) return "02";
  if (text.includes("หาทุนและสิทธิประโยชน์")) return "03";
  if (text.includes("กายภาพและพัสดุ")) return "04";
  if (text.includes("สำนักบริหารกิจการนิสิต")) return "09";
  return "";
}

function extractApprovedDivisionCodesFromDocs(docs = []) {
  const approvedYY = new Set();
  let hasApproved = false;
  docs.forEach((docSnap) => {
    const data = typeof docSnap?.data === "function" ? (docSnap.data() || {}) : (docSnap || {});
    const status = (data.status || "").toString().trim().toLowerCase();
    if (status !== "approved") return;
    hasApproved = true;
    const codeMatch = (data.approvedPositionCode || "").toString().match(/^SGCU\d{2}\.10\.(\d{2})\.\d{2}-\d{3}$/i);
    const yyFromCode = normalizeDivisionCodeYY(codeMatch?.[1] || "");
    const yyFromLabel = resolveDivisionCodeYYFromPositionLabel(data.approvedPosition || data.requestedPosition || "");
    if (yyFromCode) approvedYY.add(yyFromCode);
    else if (yyFromLabel) approvedYY.add(yyFromLabel);
  });
  return {
    hasApproved,
    divisionCodesYY: Array.from(approvedYY)
  };
}

function getCurrentAcademicYearBE() {
  const now = new Date();
  const yearCE = now.getFullYear();
  const month = now.getMonth() + 1;
  return (month >= 6 ? yearCE : yearCE - 1) + 543;
}

function getAcademicYearFromTimestamp(value) {
  if (!value) return "";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const yearCE = date.getFullYear();
  const month = date.getMonth() + 1;
  return String((month >= 6 ? yearCE : yearCE - 1) + 543);
}

function getRepresentativeAcademicYear(item = {}) {
  const explicit = (item.academicYear || item.representativeAcademicYear || item.schoolYear || "").toString().trim();
  if (/^\d{4}$/.test(explicit)) return explicit;
  return getAcademicYearFromTimestamp(item.createdAt || item.reviewedAt || item.updatedAt) || String(getCurrentAcademicYearBE());
}

function isCurrentRepresentativeAcademicYear(item = {}) {
  return getRepresentativeAcademicYear(item) === String(getCurrentAcademicYearBE());
}

function isHeadStaffProfile(profile) {
  const positionText = (profile?.position || "").toString().trim().replace(/\s+/g, " ");
  if (positionText === "เหรัญญิก" || positionText === "เลขานุการฝ่ายเหรัญญิก") return true;
  if (hasStaffRoleToken(profile?.role, "0")) return true;
  const yyList = resolveStaffDivisionCodesYY(profile);
  return yyList.includes("00");
}

function flattenAllowedStaffPageValues(pages) {
  if (Array.isArray(pages)) return pages.flatMap((item) => flattenAllowedStaffPageValues(item));
  if (typeof pages === "string") {
    const text = pages.trim();
    if (!text) return [];
    if (text === "*" || text.toLowerCase() === "all") return STAFF_PAGE_OPTIONS;
    return text.split(/[,;|\n]+/).map((item) => item.trim()).filter(Boolean);
  }
  if (pages && typeof pages === "object") {
    const picked = ["id", "page", "pageId", "value", "name", "label", "route"]
      .map((key) => pages[key])
      .filter((item) => item !== undefined && item !== null && item !== "");
    const truthyKeys = Object.entries(pages)
      .filter(([, enabled]) => enabled === true || enabled === "true" || enabled === 1 || enabled === "1")
      .map(([key]) => key);
    return [...picked, ...truthyKeys].flatMap((item) => flattenAllowedStaffPageValues(item));
  }
  return [];
}

function normalizeAllowedStaffPages(pages, fallbackYY = "") {
  const list = flattenAllowedStaffPageValues(pages)
    .map((item) => {
        const page = (item || "").toString().trim();
        return page === "project-status-staff" ? "treasurer-handover-staff" : page;
      })
    .filter(Boolean);
  const filtered = Array.from(new Set(list.filter((page) => STAFF_PAGE_OPTIONS.includes(page))));
  return filtered.length ? filtered : Array.from(getFallbackAllowedStaffPagesByYY(fallbackYY));
}

function getDefaultAllowedStaffPagesByYY(yy, roleValue = "") {
  const normalizedYY = normalizeDivisionCodeYY(yy);
  if (normalizedYY === "00") {
    return new Set(["treasurer-handover-staff", "dashboard-staff", "system-data-staff", "borrow-assets-staff", "meeting-room-staff", "budget-approval-staff", "content-management-staff", "content-news-staff", "content-documents-staff", "staff-approval", "staff-directory-staff", "staff-temporary-access-staff", "org-representative-approval-staff", "login"]);
  }
  return new Set(["login"]);
}

function getFallbackAllowedStaffPagesByYY(yy) {
  return new Set(["login"]);
}

function getAllowedStaffPagesByYYList(yyList = [], roleValue = "") {
  const list = Array.isArray(yyList) ? yyList : [];
  if (!list.length) return new Set(["login"]);
  const merged = new Set();
  list.forEach((yy) => {
    getDefaultAllowedStaffPagesByYY(yy, roleValue).forEach((page) => merged.add(page));
  });
  return merged;
}

function findAllowedPagesFromPositionCatalog(positionName, yy, zz) {
  const normalizedName = (positionName || "").toString().trim().toLowerCase();
  const normalizedYY = normalizeDivisionCodeYY(yy);
  const normalizedZZ = normalizeDivisionCodeYY(zz);
  if (normalizedName && Array.isArray(staffPositionAccessByName[normalizedName])) {
    return staffPositionAccessByName[normalizedName];
  }
  const codeKey = normalizedYY && normalizedZZ ? `${normalizedYY}.${normalizedZZ}` : "";
  if (codeKey && Array.isArray(staffPositionAccessByCode[codeKey])) {
    return staffPositionAccessByCode[codeKey];
  }
  return null;
}

function getAllowedStaffPagesByProfile(profile) {
  if (isHeadStaffProfile(profile)) return new Set(STAFF_FULL_ACCESS_PAGES);

  const merged = new Set();
  normalizeAllowedStaffPages(profile?.allowedPages, profile?.divisionCodeYY || profile?.positionCodeYY || "")
    .forEach((page) => merged.add(page));
  const positions = Array.isArray(profile?.positions) ? profile.positions : [];
  positions.forEach((entry) => {
    const yy = normalizeDivisionCodeYY(entry?.yy || entry?.positionCodeYY || entry?.divisionCodeYY || "");
    const zz = normalizeDivisionCodeYY(entry?.zz || entry?.positionCodeZZ || entry?.levelCodeZZ || "");
    const catalogPages = findAllowedPagesFromPositionCatalog(entry?.name || entry?.position || "", yy, zz);
    const effectivePages = Array.isArray(catalogPages)
      ? normalizeAllowedStaffPages(catalogPages, yy)
      : normalizeAllowedStaffPages(entry?.allowedPages, yy);
    effectivePages.forEach((page) => merged.add(page));
  });

  if (merged.size) return merged;
  return getAllowedStaffPagesByYYList(
    profile?.divisionCodesYY?.length ? profile.divisionCodesYY : [profile?.divisionCodeYY],
    profile?.role
  );
}

function hasNavigableStaffPages(profile) {
  if (!profile) return false;
  const pages = getAllowedStaffPagesByProfile(profile);
  return Array.from(pages).some((page) => page !== "login");
}

function getAllowedPagesForCurrentState() {
  const publicAllowed = new Set(["home", "about", "project-status", "news", "financial-docs", "login"]);
  const isAffairsProfile = currentUserProfileType === "affairs";
  if (!isUserAuthenticated) {
    return publicAllowed;
  }

  const allowed = new Set(publicAllowed);
  const protectedAllowed = [
    "borrow-assets",
    "meeting-room-booking",
    "staff-application"
  ];
  protectedAllowed.forEach((page) => allowed.add(page));
  if (currentRepresentativeApprovalState.hasApproved) {
    allowed.add("budget-approval-request");
  }
  if (isAffairsProfile) {
    allowed.delete("borrow-assets");
    allowed.delete("borrow-assets-staff");
    allowed.delete("budget-approval-request");
  }

  if (staffAuthUser && staffViewMode === "staff") {
    const yyAllowed = getAllowedStaffPagesByProfile(staffAuthUser);
    if (isHeadStaffProfile(staffAuthUser)) {
      yyAllowed.add("staff-approval");
      yyAllowed.add("staff-directory-staff");
      yyAllowed.add("staff-temporary-access-staff");
      yyAllowed.add("org-representative-approval-staff");
      yyAllowed.add("content-management-staff");
      yyAllowed.add("content-news-staff");
      yyAllowed.add("content-documents-staff");
      yyAllowed.add("dashboard-staff");
      yyAllowed.add("system-data-staff");
    }
    if (!isHeadStaffProfile(staffAuthUser)) {
      yyAllowed.delete("staff-approval");
      yyAllowed.delete("staff-directory-staff");
      yyAllowed.delete("staff-temporary-access-staff");
      yyAllowed.delete("org-representative-approval-staff");
    }
    if (isAffairsProfile) {
      yyAllowed.delete("borrow-assets");
      yyAllowed.delete("borrow-assets-staff");
    }
    return yyAllowed;
  }

  if (staffViewMode !== "staff") {
    allowed.delete("dashboard-staff");
    allowed.delete("system-data-staff");
    allowed.delete("borrow-assets-staff");
    allowed.delete("treasurer-handover-staff");
    allowed.delete("meeting-room-staff");
    if (!isHeadStaffProfile(staffAuthUser)) {
      allowed.delete("staff-approval");
      allowed.delete("staff-directory-staff");
      allowed.delete("staff-temporary-access-staff");
      allowed.delete("org-representative-approval-staff");
    }
  }

  if (isHeadStaffProfile(staffAuthUser)) {
    allowed.add("budget-approval-request");
    STAFF_FULL_ACCESS_PAGES.forEach((page) => allowed.add(page));
  }

  return allowed;
}

function getStaffProfileByEmail(email) {
  const normalized = (email || "").toString().trim().toLowerCase();
  if (!normalized) return null;
  const isOverrideHead = STAFF_HEAD_OVERRIDES.has(normalized);
  const isCurrentUserApproved =
    currentStaffApprovalState.email === normalized && currentStaffApprovalState.hasApproved === true;
  const hasRealProfile = staffEmails.has(normalized);
  if (!isOverrideHead && !hasRealProfile && !isCurrentUserApproved) return null;
  const profile = staffProfilesByEmail[normalized] || {};
  if (isOverrideHead) {
    return {
      email: normalized,
      position: profile.position || "เหรัญญิก",
      nick: profile.nick || "",
      role: "0",
      divisionCodeYY: "00",
      divisionCodesYY: ["00"],
      positionCodeYY: "00",
      positionCode: (profile.positionCode || "").toString(),
      allowedPages: normalizeAllowedStaffPages(profile.allowedPages, "00"),
      positions: Array.isArray(profile.positions) ? profile.positions : []
    };
  }
  const approvalYY = Array.isArray(currentStaffApprovalState.approvedDivisionCodesYY)
    ? currentStaffApprovalState.approvedDivisionCodesYY
    : [];
  const profileYY = resolveStaffDivisionCodesYY(profile);
  const mergedYY = Array.from(new Set([...profileYY, ...approvalYY].map((item) => normalizeDivisionCodeYY(item)).filter(Boolean)));
  const effectiveYY = mergedYY[0] || resolveStaffDivisionCodeYY(profile);

  return {
    email: normalized,
    position: profile.position || "",
    nick: profile.nick || "",
    role: (() => {
      const yyList = mergedYY.length ? mergedYY : resolveStaffDivisionCodesYY(profile);
      const baseRole = normalizeStaffRoleCode(profile.role);
      if (baseRole) return baseRole;
      return yyList.includes("00") ? "0" : "1";
    })(),
    divisionCodeYY: effectiveYY,
    divisionCodesYY: mergedYY.length ? mergedYY : resolveStaffDivisionCodesYY(profile),
    positionCodeYY: effectiveYY,
    positionCode: (profile.positionCode || "").toString(),
    allowedPages: normalizeAllowedStaffPages(profile.allowedPages, effectiveYY),
    positions: Array.isArray(profile.positions) ? profile.positions : []
  };
}

function isCurrentNavVisible() {
  if (!navLinksAll.length) return true;
  const currentPage = (window.location.hash || "#home").replace("#", "");
  const currentLink = navLinksAll.find((link) => link.dataset.page === currentPage);
  return currentLink ? currentLink.style.display !== "none" && currentLink.offsetParent !== null : true;
}

function getCurrentPageFromHash() {
  return (window.location.hash || "#home").replace("#", "");
}

function isNavPageVisible(page) {
  return getAllowedPagesForCurrentState().has(page);
}

function getModeMappedPage(currentPage, mode) {
  const toStaff = {
    "project-status": "dashboard-staff",
    "borrow-assets": "borrow-assets-staff",
    "meeting-room-booking": "meeting-room-staff"
  };
  const toNormal = {
    "project-status-staff": "project-status",
    "treasurer-handover-staff": "project-status",
    "borrow-assets-staff": "borrow-assets",
    "meeting-room-staff": "meeting-room-booking"
  };
  const map = mode === "staff" ? toStaff : toNormal;
  return map[currentPage] || "";
}

function applyStaffViewMode() {
  const canShowStaffMode = hasNavigableStaffPages(staffAuthUser);
  if (!canShowStaffMode && staffViewMode === "staff") {
    staffViewMode = "normal";
  }
  const staffMode = canShowStaffMode && staffViewMode === "staff";
  const suppressStaffApplicationRedirect = window.__sgcuStaffApplicationFlowActive === true;
  updateNavVisibility(isUserAuthenticated);
  syncRoleNavContainers();
  updateNavForStaff(staffMode ? staffAuthUser : null);

  if (staffModeToggleEl) {
    staffModeToggleEl.style.display = canShowStaffMode ? "flex" : "none";
  }
  staffModeBtns.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.staffMode === staffViewMode);
  });

  if (!isCurrentNavVisible() && !suppressStaffApplicationRedirect) {
    goToFirstVisibleNavPageWithPreference(null);
  }
}

function setStaffViewMode(mode) {
  if (mode !== "staff" && mode !== "normal") return;
  if (staffViewMode === mode) return;
  const previousPage = getCurrentPageFromHash();
  staffViewMode = mode;
  applyStaffViewMode();
  const mappedPage = getModeMappedPage(previousPage, staffViewMode);
  if (mappedPage) {
    goToFirstVisibleNavPageWithPreference(mappedPage);
    return;
  }
  if (!isNavPageVisible(previousPage)) {
    goToFirstVisibleNavPageWithPreference(null);
  }
}

function updateNavForStaff(staffUser) {
  if (!navLinksAll.length || !staffUser) return;
  if (staffViewMode !== "staff") return;

  const allowedStaffPages = getAllowedStaffPagesByProfile(staffUser);

  navLinksAll.forEach((link) => {
    const page = link.dataset.page || "";
    link.style.display = allowedStaffPages.has(page) ? "" : "none";
  });

  const desktopGeneral = document.getElementById("desktopNavGeneral");
  const desktopStaff = document.getElementById("desktopNavStaff");
  if (desktopGeneral) desktopGeneral.style.display = "none";
  if (desktopStaff) desktopStaff.style.display = "flex";

  syncDesktopNavGroupVisibility();
  syncMobileNavGroupVisibility();
  syncMobileBottomNavVisibility();
}

function getPreferredPageForState(isAuth) {
  if (isAuth && !!staffAuthUser && staffViewMode === "staff") return "dashboard-staff";
  if (isAuth) return "home";
  return "home";
}

function goToFirstVisibleNavPageWithPreference(preferredPage) {
  if (!navLinksAll.length) return;

  function isVisible(link) {
    return link && link.style.display !== "none" && link.offsetParent !== null;
  }

  let targetPage = preferredPage;
  if (targetPage) {
    const preferredLink = navLinksAll.find(
      (link) => link.dataset.page === targetPage && isVisible(link)
    );
    if (!preferredLink) {
      targetPage = null;
    }
  }

  if (!targetPage) {
    const first = navLinksAll.find(isVisible);
    targetPage = first?.dataset.page;
  }

  if (!targetPage) return;

  const targetHash = `#${targetPage}`;
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  } else {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

function initAuthUI() {
  const loginProfileCardEl = document.getElementById("loginProfileCard");
  const loginHelpApplyBtnEl = document.getElementById("loginHelpApplyBtn");
  const budgetRepresentativeApplyBtnEl = document.getElementById("budgetRepresentativeApplyBtn");
  const loginHeroEl = document.querySelector(".login-hero");
  const loginHeroContentEl = document.getElementById("loginHeroContent");
  const authAlertModalEl = document.getElementById("authAlertModal");
  const authAlertMessageEl = document.getElementById("authAlertMessage");
  const authAlertCloseEl = document.getElementById("authAlertClose");

  if (!window.sgcuAuth) {
    const panel = document.getElementById("authPanel");
    if (panel) {
      panel.style.display = "none";
    }
    if (loginPageStatusEl) {
      loginPageStatusEl.textContent = "ปิดใช้งานการเข้าสู่ระบบ (ระบบยืนยันตัวตนถูกถอดออก)";
    }
    if (loginPageGoogleBtnEl) {
      loginPageGoogleBtnEl.style.display = "none";
      loginPageGoogleBtnEl.disabled = true;
    }
    if (loginPageLogoutBtnEl) {
      loginPageLogoutBtnEl.style.display = "none";
      loginPageLogoutBtnEl.disabled = true;
    }
    if (loginHelpApplyBtnEl) {
      loginHelpApplyBtnEl.hidden = true;
    }
    if (budgetRepresentativeApplyBtnEl) {
      budgetRepresentativeApplyBtnEl.hidden = true;
    }
    if (loginProfileCardEl) {
      loginProfileCardEl.hidden = true;
    }
    if (loginHeroEl) {
      loginHeroEl.classList.remove("is-authenticated");
    }
    if (loginHeroContentEl) {
      loginHeroContentEl.hidden = false;
    }
    if (loginBtnEl) {
      loginBtnEl.style.display = "none";
      loginBtnEl.disabled = true;
    }
    if (logoutBtnEl) {
      logoutBtnEl.style.display = "none";
      logoutBtnEl.disabled = true;
    }
    if (mobileLogoutBtnEl) {
      mobileLogoutBtnEl.style.display = "none";
      mobileLogoutBtnEl.disabled = true;
    }
    return;
  }

  const {
    auth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    isAllowedAuthEmail = () => true,
    isAllowedAuthEmailAsync = async (email) => isAllowedAuthEmail(email),
    getAuthEmailRequirementMessage = () => "บัญชีนี้ไม่ได้รับอนุญาตให้เข้าสู่ระบบ"
  } = window.sgcuAuth;

  if (!auth) return;
  const AUTH_SESSION_KEY = "sgcu_auth_session_started_at";
  const LOGIN_PROFILE_STORAGE_KEY = "sgcu_user_profile_by_email_v1";
  const LEGACY_LOGIN_PROFILE_STORAGE_KEY = "sgcu_borrow_profile_by_email_v1";
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const firestoreCollections = appConfig.firestore?.collections || {};
  const USER_PROFILE_COLLECTION = firestoreCollections.userProfiles || "userProfiles";
  const sessionMaxAgeMs =
    typeof AUTH_SESSION_MAX_AGE_MS === "number" &&
    Number.isFinite(AUTH_SESSION_MAX_AGE_MS) &&
    AUTH_SESSION_MAX_AGE_MS > 0
      ? AUTH_SESSION_MAX_AGE_MS
      : 7 * 24 * 60 * 60 * 1000;

  function readAuthSession() {
    try {
      const raw = window.localStorage?.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const startedAt = Number(parsed?.startedAt);
      const uid = (parsed?.uid || "").toString();
      if (!uid || !Number.isFinite(startedAt) || startedAt <= 0) return null;
      return { uid, startedAt };
    } catch (err) {
      return null;
    }
  }

  function writeAuthSession(uid, startedAt) {
    if (!uid || !Number.isFinite(startedAt)) return;
    try {
      window.localStorage?.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({ uid, startedAt })
      );
    } catch (err) {
      // ignore write errors (private mode / quota)
    }
  }

  function clearAuthSession() {
    try {
      window.localStorage?.removeItem(AUTH_SESSION_KEY);
    } catch (err) {
      // ignore remove errors
    }
  }

  const loginProfileFormEl = document.getElementById("loginProfileForm");
  const loginProfileTypeGroupEl = document.getElementById("loginProfileTypeGroup");
  const loginProfileTypeStudentEl = document.getElementById("loginProfileTypeStudent");
  const loginProfileTypeAffairsEl = document.getElementById("loginProfileTypeAffairs");
  const loginProfileStudentFieldsEl = document.getElementById("loginProfileStudentFields");
  const loginProfileFirstNameEl = document.getElementById("loginProfileFirstName");
  const loginProfileLastNameEl = document.getElementById("loginProfileLastName");
  const loginProfileNicknameEl = document.getElementById("loginProfileNickname");
  const loginProfileStudentIdEl = document.getElementById("loginProfileStudentId");
  const loginProfileStudentIdWarningEl = document.getElementById("loginProfileStudentIdWarning");
  const loginProfileFacultyEl = document.getElementById("loginProfileFaculty");
  const loginProfileFacultyWarningEl = document.getElementById("loginProfileFacultyWarning");
  const loginProfileYearEl = document.getElementById("loginProfileYear");
  const loginProfileYearWarningEl = document.getElementById("loginProfileYearWarning");
  const loginProfileContactRowEl = document.getElementById("loginProfileContactRow");
  const loginProfilePhoneEl = document.getElementById("loginProfilePhone");
  const loginProfilePhoneLabelEl = document.getElementById("loginProfilePhoneLabel");
  const loginProfileLineIdEl = document.getElementById("loginProfileLineId");
  const loginProfileLineIdLabelEl = document.getElementById("loginProfileLineIdLabel");
  const loginProfileSaveBtnEl = document.getElementById("loginProfileSaveBtn");
  const loginProfileStatusEl = document.getElementById("loginProfileStatus");
  const loginProfileFirstLoginPromptEl = document.getElementById("loginProfileFirstLoginPrompt");
  let loginProfileLoadedForEmail = "";
  let loginProfileLoadSeq = 0;
  const loginProfileFacultyMap = {
    "21": "วิศวกรรมศาสตร์",
    "22": "อักษรศาสตร์",
    "23": "วิทยาศาสตร์",
    "24": "รัฐศาสตร์",
    "25": "สถาปัตยกรรมศาสตร์",
    "26": "พาณิชยศาสตร์และการบัญชี",
    "27": "ครุศาสตร์",
    "28": "นิเทศศาสตร์",
    "29": "เศรษฐศาสตร์",
    "30": "แพทยศาสตร์",
    "31": "สัตวแพทย์ศาสตร์",
    "32": "ทันตแพทย์ศาสตร์",
    "33": "เภสัชศาสตร์",
    "34": "นิติศาสตร์",
    "35": "ศิลปกรรมศาสตร์",
    "37": "สหเวชศาสตร์",
    "38": "จิตวิทยา",
    "39": "วิทยาศาสตร์การกีฬา",
    "40": "เกษตรและบูรณาการ",
    "56": "สถาบันนวัตกรรมบูรณาการฯ"
  };

  const profileStore = window.sgcuFirestore || {};
  const STAFF_PROFILE_COLLECTION = firestoreCollections.staffProfiles || "staffProfiles";
  const remoteStaffProfileLoadingEmails = new Set();

  function normalizeAccountEmail(email) {
    const normalized = (email || "").toString().trim().toLowerCase();
    const match = normalized.match(/^(\d{10})@(student|alumni)\.chula\.ac\.th$/);
    return match ? `${match[1]}@student.chula.ac.th` : normalized;
  }

  function isAlumniChulaEmail(email) {
    return /^\d{10}@alumni\.chula\.ac\.th$/i.test((email || "").toString().trim());
  }

  window.sgcuNormalizeAccountEmail = normalizeAccountEmail;
  window.sgcuIsAlumniChulaEmail = isAlumniChulaEmail;

  function canUseRemoteProfileStore() {
    return !!(
      profileStore.db &&
      profileStore.doc &&
      profileStore.getDoc &&
      profileStore.setDoc &&
      profileStore.serverTimestamp
    );
  }

  function canUseRemoteStaffProfileStore() {
    return !!(
      profileStore.db &&
      profileStore.doc &&
      profileStore.getDoc
    );
  }

  function watchStaffPositionAccessCatalog() {
    if (typeof unsubscribeStaffPositionAccess === "function") return;
    if (
      !profileStore.db ||
      !profileStore.collection ||
      !profileStore.onSnapshot
    ) return;

    unsubscribeStaffPositionAccess = profileStore.onSnapshot(
      profileStore.collection(profileStore.db, "staffPositionCatalog"),
      (snapshot) => {
        const nextByName = {};
        const nextByCode = {};
        (snapshot?.docs || []).forEach((docSnap) => {
          const data = docSnap.data() || {};
          const nameKey = (data.name || "").toString().trim().toLowerCase();
          const yy = normalizeDivisionCodeYY(data.divisionCodeYY || "");
          const zz = normalizeDivisionCodeYY(data.levelCodeZZ || "");
          const pages = normalizeAllowedStaffPages(data.allowedPages, yy);
          if (nameKey) nextByName[nameKey] = pages;
          if (yy && zz) nextByCode[`${yy}.${zz}`] = pages;
        });
        staffPositionAccessByName = nextByName;
        staffPositionAccessByCode = nextByCode;
        if (auth.currentUser) {
          refreshAuthDisplay(auth.currentUser);
        }
      },
      () => {
        staffPositionAccessByName = {};
        staffPositionAccessByCode = {};
      }
    );
  }

  function resetCurrentStaffApprovalWatcher() {
    if (typeof unsubscribeCurrentStaffApproval === "function") {
      try {
        unsubscribeCurrentStaffApproval();
      } catch (_) {
        // ignore unsubscribe errors
      }
    }
    unsubscribeCurrentStaffApproval = null;
    currentStaffApprovalState.email = "";
    currentStaffApprovalState.hasApproved = false;
    currentStaffApprovalState.approvedDivisionCodesYY = [];
  }

  function resetCurrentRepresentativeApprovalWatcher() {
    if (typeof unsubscribeCurrentRepresentativeApproval === "function") {
      try {
        unsubscribeCurrentRepresentativeApproval();
      } catch (_) {
        // ignore unsubscribe errors
      }
    }
    unsubscribeCurrentRepresentativeApproval = null;
    currentRepresentativeApprovalState.email = "";
    currentRepresentativeApprovalState.hasApproved = false;
    currentRepresentativeApprovalState.loaded = false;
  }

  function applyRepresentativeApprovalRows(normalizedEmail, rows = []) {
    currentRepresentativeApprovalState.email = normalizedEmail;
    currentRepresentativeApprovalState.hasApproved = rows.some((item) => {
      const status = (item.status || "").toString().trim().toLowerCase();
      const requestType = (item.requestType || "").toString().trim();
      const applicantEmail = (item?.applicant?.email || item.applicantEmail || "").toString().trim().toLowerCase();
      return (
        status === "approved" &&
        requestType === "organization_representative" &&
        applicantEmail === normalizedEmail &&
        isCurrentRepresentativeAcademicYear(item)
      );
    });
    currentRepresentativeApprovalState.loaded = true;
    refreshAuthDisplay(auth.currentUser || null);
  }

  function watchCurrentRepresentativeApproval(firebaseUser) {
    const firestore = window.sgcuFirestore || {};
    const normalizedEmail = (firebaseUser?.email || "").toString().trim().toLowerCase();
    if (!normalizedEmail) {
      resetCurrentRepresentativeApprovalWatcher();
      refreshAuthDisplay(firebaseUser || null);
      return;
    }
    if (
      !firestore.db ||
      !firestore.collection ||
      !firestore.query ||
      !firestore.where ||
      !firestore.onSnapshot
    ) {
      resetCurrentRepresentativeApprovalWatcher();
      currentRepresentativeApprovalState.email = normalizedEmail;
      currentRepresentativeApprovalState.hasApproved = false;
      currentRepresentativeApprovalState.loaded = true;
      refreshAuthDisplay(firebaseUser);
      return;
    }
    if (
      currentRepresentativeApprovalState.email === normalizedEmail &&
      typeof unsubscribeCurrentRepresentativeApproval === "function"
    ) {
      return;
    }

    resetCurrentRepresentativeApprovalWatcher();
    currentRepresentativeApprovalState.email = normalizedEmail;
    currentRepresentativeApprovalState.hasApproved = false;
    currentRepresentativeApprovalState.loaded = false;

    const listQuery = firestore.query(
      firestore.collection(firestore.db, firestoreCollections.organizationRepresentativeApplications || "organizationRepresentativeApplications"),
      firestore.where("applicantEmail", "==", normalizedEmail)
    );
    unsubscribeCurrentRepresentativeApproval = firestore.onSnapshot(
      listQuery,
      (snapshot) => {
        const rows = [];
        (snapshot?.docs || []).forEach((docSnap) => {
          rows.push(docSnap.data() || {});
        });
        applyRepresentativeApprovalRows(normalizedEmail, rows);
      },
      () => {
        currentRepresentativeApprovalState.email = normalizedEmail;
        currentRepresentativeApprovalState.hasApproved = false;
        currentRepresentativeApprovalState.loaded = true;
        refreshAuthDisplay(auth.currentUser || firebaseUser || null);
      }
    );
  }

  function watchCurrentStaffApproval(firebaseUser) {
    const firestore = window.sgcuFirestore || {};
    const normalizedEmail = (firebaseUser?.email || "").toString().trim().toLowerCase();
    const normalizedUid = (firebaseUser?.uid || "").toString().trim();
    if (!normalizedEmail) {
      resetCurrentStaffApprovalWatcher();
      refreshAuthDisplay(firebaseUser || null);
      return;
    }
    if (
      !firestore.db ||
      !firestore.collection ||
      !firestore.query ||
      !firestore.where ||
      !firestore.onSnapshot
    ) {
      currentStaffApprovalState.email = normalizedEmail;
      currentStaffApprovalState.hasApproved = true;
      currentStaffApprovalState.approvedDivisionCodesYY = [];
      refreshAuthDisplay(firebaseUser);
      return;
    }
    if (currentStaffApprovalState.email === normalizedEmail && typeof unsubscribeCurrentStaffApproval === "function") {
      return;
    }

    resetCurrentStaffApprovalWatcher();
    currentStaffApprovalState.email = normalizedEmail;
    currentStaffApprovalState.hasApproved = false;
    currentStaffApprovalState.approvedDivisionCodesYY = [];
    const snapshotByKey = new Map();

    const applyMergedState = () => {
      const mergedDocs = Array.from(snapshotByKey.values()).flatMap((snap) => snap?.docs || []);
      const unique = new Map();
      mergedDocs.forEach((docSnap) => {
        const id = (docSnap?.id || "").toString();
        if (!id) return;
        if (!unique.has(id)) unique.set(id, docSnap);
      });
      const resolved = extractApprovedDivisionCodesFromDocs(Array.from(unique.values()));
      currentStaffApprovalState.email = normalizedEmail;
      currentStaffApprovalState.hasApproved = resolved.hasApproved;
      currentStaffApprovalState.approvedDivisionCodesYY = resolved.divisionCodesYY;
      refreshAuthDisplay(auth.currentUser || firebaseUser || null);
    };

    const listeners = [];
    const makeListener = (key, queryRef) => {
      const unsub = firestore.onSnapshot(
        queryRef,
        (snapshot) => {
          snapshotByKey.set(key, snapshot);
          applyMergedState();
        },
        () => {
          snapshotByKey.delete(key);
          applyMergedState();
        }
      );
      listeners.push(unsub);
    };

    const qByEmail = firestore.query(
      firestore.collection(firestore.db, "staffApplications"),
      firestore.where("applicantEmail", "==", normalizedEmail)
    );
    makeListener("email", qByEmail);

    if (normalizedUid) {
      const qByUid = firestore.query(
        firestore.collection(firestore.db, "staffApplications"),
        firestore.where("applicantUid", "==", normalizedUid)
      );
      makeListener("uid", qByUid);
    }

    unsubscribeCurrentStaffApproval = () => {
      listeners.forEach((fn) => {
        try { fn?.(); } catch (_) {}
      });
    };
  }

  async function hydrateStaffProfileFromRemote(email) {
    const normalizedEmail = (email || "").toString().trim().toLowerCase();
    if (!normalizedEmail) return;
    if (remoteStaffProfileLoadingEmails.has(normalizedEmail)) return;
    if (!canUseRemoteStaffProfileStore()) return;
    remoteStaffProfileLoadingEmails.add(normalizedEmail);

    try {
      const ref = profileStore.doc(profileStore.db, STAFF_PROFILE_COLLECTION, normalizedEmail);
      const snap = await profileStore.getDoc(ref);
      if (snap?.exists()) {
        const data = snap.data() || {};
        const remotePositions = Array.isArray(data.positions) ? data.positions : [];
        const derivedRoleFromPositions = resolveStaffDivisionCodesYY({ positions: remotePositions }).includes("00") ? "0" : "";
        const remoteRole = normalizeStaffRoleCode(data.role || derivedRoleFromPositions || "");
        const remotePosition = (data.position || "").toString().trim();
        const remoteNick = (data.nick || "").toString().trim();
        const remotePositionCode = (data.positionCode || "").toString().trim();
        const remoteDivisionCodeYY = resolveStaffDivisionCodeYY({
          positions: remotePositions,
          divisionCodeYY: data.divisionCodeYY,
          positionCodeYY: data.positionCodeYY,
          positionCode: remotePositionCode
        });

        if (staffEmails instanceof Set) {
          staffEmails.add(normalizedEmail);
        }
        staffProfilesByEmail[normalizedEmail] = {
          ...(staffProfilesByEmail[normalizedEmail] || {}),
          position: remotePosition,
          nick: remoteNick,
          role: remoteRole,
          positionCode: remotePositionCode,
          divisionCodeYY: remoteDivisionCodeYY,
          positionCodeYY: remoteDivisionCodeYY,
          allowedPages: normalizeAllowedStaffPages(data.allowedPages, remoteDivisionCodeYY),
          positions: remotePositions
        };

        if ((auth.currentUser?.email || "").toString().trim().toLowerCase() === normalizedEmail) {
          refreshAuthDisplay(auth.currentUser);
        }
      } else if (!STAFF_HEAD_OVERRIDES.has(normalizedEmail)) {
        if (staffEmails instanceof Set) {
          staffEmails.delete(normalizedEmail);
        }
        delete staffProfilesByEmail[normalizedEmail];
        if ((auth.currentUser?.email || "").toString().trim().toLowerCase() === normalizedEmail) {
          refreshAuthDisplay(auth.currentUser);
        }
      }
    } catch (_) {
      // ignore remote profile read failures
    } finally {
      remoteStaffProfileLoadingEmails.delete(normalizedEmail);
    }
  }

  function buildRemoteProfileRef(firebaseUser) {
    if (!canUseRemoteProfileStore()) return null;
    const uid = (firebaseUser?.uid || "").toString().trim();
    if (!uid) return null;
    return profileStore.doc(profileStore.db, USER_PROFILE_COLLECTION, uid);
  }

  async function readRemoteLoginProfile(firebaseUser) {
    try {
      const ref = buildRemoteProfileRef(firebaseUser);
      if (!ref) return null;
      const snap = await profileStore.getDoc(ref);
      if (!snap?.exists()) return null;
      const data = snap.data() || {};
      return data && typeof data === "object" ? data : null;
    } catch (_) {
      return null;
    }
  }

  async function writeRemoteLoginProfile(firebaseUser, profileData) {
    const ref = buildRemoteProfileRef(firebaseUser);
    if (!ref) return { ok: false, code: "store-not-ready" };
    try {
      await profileStore.setDoc(
        ref,
        {
          ...(profileData || {}),
          uid: (firebaseUser?.uid || "").toString(),
          email: (firebaseUser?.email || "").toString().trim().toLowerCase(),
          authEmail: (firebaseUser?.email || "").toString().trim().toLowerCase(),
          accountEmail: normalizeAccountEmail(firebaseUser?.email || ""),
          updatedAt: profileStore.serverTimestamp()
        },
        { merge: true }
      );
      return { ok: true, code: "" };
    } catch (err) {
      const code = (err?.code || "unknown").toString();
      console.error("save user profile to firestore failed - app.sorting-auth.js:1887", err);
      return { ok: false, code };
    }
  }

  function readLoginProfiles() {
    try {
      const rawPrimary = window.localStorage?.getItem(LOGIN_PROFILE_STORAGE_KEY);
      const rawLegacy = window.localStorage?.getItem(LEGACY_LOGIN_PROFILE_STORAGE_KEY);
      const raw = rawPrimary || rawLegacy;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const profiles = parsed && typeof parsed === "object" ? parsed : {};
      const normalizedProfiles = {};
      Object.entries(profiles).forEach(([key, value]) => {
        const canonicalKey = normalizeAccountEmail(key);
        if (!canonicalKey) return;
        normalizedProfiles[canonicalKey] = {
          ...(normalizedProfiles[canonicalKey] || {}),
          ...(value && typeof value === "object" ? value : {})
        };
      });
      const originalKeys = Object.keys(profiles).sort();
      const normalizedKeys = Object.keys(normalizedProfiles).sort();
      const hasCanonicalKeyChange = originalKeys.length !== normalizedKeys.length ||
        originalKeys.some((key, index) => key !== normalizedKeys[index]);
      if ((!rawPrimary && rawLegacy) || hasCanonicalKeyChange) {
        writeLoginProfiles(normalizedProfiles);
      }
      return normalizedProfiles;
    } catch (err) {
      return {};
    }
  }

  function writeLoginProfiles(profiles) {
    const safeProfiles = {};
    Object.entries(profiles || {}).forEach(([key, value]) => {
      const canonicalKey = normalizeAccountEmail(key);
      if (!canonicalKey) return;
      safeProfiles[canonicalKey] = value && typeof value === "object" ? value : {};
    });
    try {
      window.localStorage?.setItem(
        LOGIN_PROFILE_STORAGE_KEY,
        JSON.stringify(safeProfiles)
      );
    } catch (err) {
      // ignore localStorage errors
    }
    try {
      window.localStorage?.setItem(
        LEGACY_LOGIN_PROFILE_STORAGE_KEY,
        JSON.stringify(safeProfiles)
      );
    } catch (err) {
      // ignore localStorage errors
    }
  }

  function setLoginProfileStatus(text, color = "#6b7280") {
    if (!loginProfileStatusEl) return;
    loginProfileStatusEl.textContent = text || "";
    loginProfileStatusEl.style.color = color;
  }

  function hasSavedLoginProfileData(profile) {
    if (!profile || typeof profile !== "object") return false;
    return [
      "profileType",
      "firstName",
      "lastName",
      "nickname",
      "studentId",
      "faculty",
      "year",
      "phone",
      "lineId"
    ].some((key) => (profile[key] || "").toString().trim() !== "");
  }

  function isLoginProfileComplete(profile) {
    if (!profile || typeof profile !== "object") return false;
    const safeProfile = normalizeLoginProfileAcademicFields(profile);
    const profileType = (safeProfile.profileType || "student").toString().trim().toLowerCase();
    const firstName = (safeProfile.firstName || "").toString().trim();
    const lastName = (safeProfile.lastName || "").toString().trim();
    if (!firstName || !lastName) return false;
    if (profileType === "affairs") return true;

    const nickname = (safeProfile.nickname || "").toString().trim();
    const studentId = (safeProfile.studentId || "").toString().trim();
    const phone = (safeProfile.phone || "").toString().trim();
    const lineId = (safeProfile.lineId || "").toString().trim();
    const derived = deriveLoginProfileStudentMeta(studentId, {
      email: safeProfile.authEmail || safeProfile.email || ""
    });
    const faculty = (safeProfile.faculty || derived.faculty || "").toString().trim();
    const year = (safeProfile.year || derived.year || "").toString().trim();

    return Boolean(
      nickname &&
      /^[0-9]{10}$/.test(studentId) &&
      faculty &&
      year &&
      /^0\d{9}$/.test(phone) &&
      lineId
    );
  }

  function publishLoginProfileState(firebaseUser, profile = null, options = {}) {
    const authEmail = (firebaseUser?.email || profile?.authEmail || profile?.email || "").toString().trim().toLowerCase();
    const accountEmail = normalizeAccountEmail(authEmail || profile?.accountEmail || "");
    const isAuthenticated = !!firebaseUser;
    const isComplete = isAuthenticated ? isLoginProfileComplete({
      ...(profile || {}),
      authEmail,
      email: accountEmail,
      accountEmail
    }) : true;
    const state = {
      isAuthenticated,
      isComplete,
      isLoading: Boolean(options.isLoading),
      email: accountEmail,
      authEmail,
      message: isComplete
        ? ""
        : "กรุณากรอกและบันทึกข้อมูลบัญชีผู้ใช้ให้เรียบร้อยก่อนใช้งานส่วนอื่น"
    };
    window.sgcuLoginProfileState = state;
    window.dispatchEvent(new CustomEvent("sgcu:login-profile-state", { detail: state }));
    return state;
  }

  function setFirstLoginPromptVisible(isVisible) {
    const visible = !!isVisible;
    if (loginProfileFirstLoginPromptEl) {
      loginProfileFirstLoginPromptEl.hidden = !visible;
    }
    if (loginProfileCardEl) {
      loginProfileCardEl.classList.toggle("is-first-login", visible);
    }
    if (visible) {
      if (loginProfileTypeStudentEl) loginProfileTypeStudentEl.checked = true;
      if (loginProfileTypeAffairsEl) loginProfileTypeAffairsEl.checked = false;
      currentUserProfileType = "student";
      applyLoginProfileTypeUI();
    }
  }

  function setLoginProfileEnabled(enabled) {
    const disabled = !enabled;
    if (loginProfileFormEl) {
      loginProfileFormEl.style.opacity = disabled ? "0.7" : "1";
    }
    if (loginProfileFirstNameEl) loginProfileFirstNameEl.disabled = disabled;
    if (loginProfileLastNameEl) loginProfileLastNameEl.disabled = disabled;
    if (loginProfileNicknameEl) loginProfileNicknameEl.disabled = disabled;
    if (loginProfileStudentIdEl) loginProfileStudentIdEl.disabled = disabled;
    if (loginProfilePhoneEl) loginProfilePhoneEl.disabled = disabled;
    if (loginProfileLineIdEl) loginProfileLineIdEl.disabled = disabled;
    if (loginProfileTypeStudentEl) loginProfileTypeStudentEl.disabled = disabled;
    if (loginProfileTypeAffairsEl) loginProfileTypeAffairsEl.disabled = disabled;
    if (loginProfileSaveBtnEl) loginProfileSaveBtnEl.disabled = disabled;
  }

  function getLoginProfileType() {
    return loginProfileTypeAffairsEl?.checked ? "affairs" : "student";
  }

  function renderLoginProfileTypeTabs() {
    if (!loginProfileTypeGroupEl) return;
    const labels = Array.from(loginProfileTypeGroupEl.querySelectorAll("label.tab-btn"));
    labels.forEach((label) => label.classList.remove("is-active"));
    const activeInput = loginProfileTypeAffairsEl?.checked
      ? loginProfileTypeAffairsEl
      : loginProfileTypeStudentEl;
    const activeLabel = activeInput ? activeInput.closest("label.tab-btn") : null;
    if (activeLabel) activeLabel.classList.add("is-active");
  }

  function applyLoginProfileTypeUI() {
    const isStudent = getLoginProfileType() === "student";
    if (loginProfileStudentFieldsEl) {
      loginProfileStudentFieldsEl.style.display = isStudent ? "" : "none";
    }
    if (loginProfileContactRowEl) {
      loginProfileContactRowEl.classList.toggle("is-affairs-contact", !isStudent);
    }
    if (loginProfileNicknameEl) loginProfileNicknameEl.required = isStudent;
    if (loginProfileStudentIdEl) loginProfileStudentIdEl.required = isStudent;
    if (loginProfilePhoneEl) {
      if (isStudent) {
        loginProfilePhoneEl.required = true;
        loginProfilePhoneEl.type = "tel";
        loginProfilePhoneEl.pattern = "^0\\d{9}$";
        loginProfilePhoneEl.placeholder = "รูปแบบ: 0xxXXXxxxx";
      } else {
        loginProfilePhoneEl.required = false;
        loginProfilePhoneEl.type = "text";
        loginProfilePhoneEl.removeAttribute("pattern");
        loginProfilePhoneEl.placeholder = "เช่น เบอร์โทร / เบอร์โต๊ะสำนักงาน / LINE / Email";
      }
    }
    if (loginProfilePhoneLabelEl) {
      loginProfilePhoneLabelEl.textContent = isStudent
        ? "เบอร์โทรติดต่อกลับ"
        : "ข้อมูลติดต่อกลับ";
    }
    if (loginProfileLineIdEl) {
      loginProfileLineIdEl.required = isStudent;
      loginProfileLineIdEl.placeholder = isStudent ? "Line ID" : "ช่องทางอื่น (ถ้ามี)";
    }
    if (loginProfileLineIdLabelEl) {
      loginProfileLineIdLabelEl.textContent = isStudent
        ? "Line ID"
        : "ข้อมูลติดต่อกลับ (อื่น ๆ)";
    }
    if (!isStudent) {
      if (loginProfileStudentIdWarningEl) loginProfileStudentIdWarningEl.hidden = true;
      if (loginProfileFacultyWarningEl) loginProfileFacultyWarningEl.hidden = true;
      if (loginProfileYearWarningEl) loginProfileYearWarningEl.hidden = true;
    } else {
      updateLoginProfileStudentMeta();
    }
    renderLoginProfileTypeTabs();
  }

  function deriveLoginProfileStudentMeta(rawStudentId, options = {}) {
    const studentId = (rawStudentId || "").toString().trim();
    const digits = studentId.replace(/\D/g, "");
    if (digits.length < 10) return { faculty: "", year: "" };

    const code = digits.slice(-2);
    const faculty = loginProfileFacultyMap[code] || "";
    const entryYearSuffix = digits.slice(0, 2);
    const entryYear = 2500 + Number(entryYearSuffix);
    const academicYearBE = Number(
      typeof getCurrentAcademicYearBE === "function"
        ? getCurrentAcademicYearBE()
        : (() => {
            const now = new Date();
            const yearCE = now.getFullYear();
            const month = now.getMonth() + 1;
            return (month >= 6 ? yearCE : yearCE - 1) + 543;
          })()
    );
    const yearLevel = Number.isFinite(entryYear) && Number.isFinite(academicYearBE)
      ? academicYearBE - entryYear + 1
      : NaN;
    const year = isAlumniChulaEmail(options.email || options.authEmail)
      ? "นิสิตเก่า"
      : Number.isFinite(yearLevel) && yearLevel >= 1 && yearLevel <= 8
      ? String(yearLevel)
      : "";
    return { faculty, year };
  }

  function normalizeLoginProfileAcademicFields(profile) {
    const safeProfile = profile && typeof profile === "object" ? profile : {};
    const profileType = (safeProfile.profileType || "student").toString().trim().toLowerCase();
    if (profileType === "affairs") return safeProfile;

    const studentId = (safeProfile.studentId || "").toString().trim();
    if (!studentId) return safeProfile;

    const derived = deriveLoginProfileStudentMeta(studentId, {
      email: safeProfile.authEmail || safeProfile.email || ""
    });
    return {
      ...safeProfile,
      faculty: derived.faculty || safeProfile.faculty || "",
      year: derived.year || safeProfile.year || ""
    };
  }

  function updateLoginProfileStudentMeta() {
    if (!loginProfileStudentIdEl || !loginProfileFacultyEl || !loginProfileYearEl) return;
    const rawValue = loginProfileStudentIdEl.value || "";
    const digits = rawValue.replace(/\D/g, "");
    const hasNonDigits = rawValue.trim() !== "" && digits.length !== rawValue.replace(/\s/g, "").length;
    if (loginProfileStudentIdWarningEl) {
      if (hasNonDigits) {
        loginProfileStudentIdWarningEl.textContent = "กรุณากรอกตัวเลขเท่านั้น";
        loginProfileStudentIdWarningEl.hidden = false;
      } else {
        loginProfileStudentIdWarningEl.hidden = true;
      }
    }
    if (digits.length < 10) {
      loginProfileFacultyEl.value = "";
      loginProfileYearEl.value = "";
      if (loginProfileFacultyWarningEl) loginProfileFacultyWarningEl.hidden = true;
      if (loginProfileYearWarningEl) loginProfileYearWarningEl.hidden = true;
      return;
    }

    const derived = deriveLoginProfileStudentMeta(digits, {
      email: auth?.currentUser?.email || ""
    });
    const label = derived.faculty;
    loginProfileFacultyEl.value = label ? label : "";
    if (loginProfileFacultyWarningEl) loginProfileFacultyWarningEl.hidden = !!label;

    const isValidYearLevel = !!derived.year;
    loginProfileYearEl.value = derived.year || "";
    if (loginProfileYearWarningEl) loginProfileYearWarningEl.hidden = isValidYearLevel;
  }

  function clearLoginProfileFields() {
    currentUserProfileType = "student";
    setFirstLoginPromptVisible(false);
    if (loginProfileTypeStudentEl) loginProfileTypeStudentEl.checked = true;
    if (loginProfileTypeAffairsEl) loginProfileTypeAffairsEl.checked = false;
    if (loginProfileFirstNameEl) loginProfileFirstNameEl.value = "";
    if (loginProfileLastNameEl) loginProfileLastNameEl.value = "";
    if (loginProfileNicknameEl) loginProfileNicknameEl.value = "";
    if (loginProfileStudentIdEl) loginProfileStudentIdEl.value = "";
    if (loginProfilePhoneEl) loginProfilePhoneEl.value = "";
    if (loginProfileLineIdEl) loginProfileLineIdEl.value = "";
    if (loginProfileFacultyEl) loginProfileFacultyEl.value = "";
    if (loginProfileYearEl) loginProfileYearEl.value = "";
    if (loginProfileStudentIdWarningEl) loginProfileStudentIdWarningEl.hidden = true;
    if (loginProfileFacultyWarningEl) loginProfileFacultyWarningEl.hidden = true;
    if (loginProfileYearWarningEl) loginProfileYearWarningEl.hidden = true;
    applyLoginProfileTypeUI();
  }

  function applyLoginProfileToFields(profile, firebaseUser) {
    const authEmail = (firebaseUser?.email || profile?.authEmail || profile?.email || "").toString().trim().toLowerCase();
    const safeProfile = normalizeLoginProfileAcademicFields({
      ...(profile || {}),
      authEmail,
      email: normalizeAccountEmail(authEmail || profile?.email || "")
    });
    const storedType = (safeProfile.profileType || "").toString().trim().toLowerCase();
    const hasSavedData = hasSavedLoginProfileData(safeProfile);
    const resolvedType = storedType === "affairs" || storedType === "student"
      ? storedType
      : ((safeProfile.studentId || "").toString().trim() ? "student" : (hasSavedData ? "affairs" : "student"));
    currentUserProfileType = resolvedType;
    if (loginProfileTypeStudentEl) loginProfileTypeStudentEl.checked = resolvedType !== "affairs";
    if (loginProfileTypeAffairsEl) loginProfileTypeAffairsEl.checked = resolvedType === "affairs";

    const displayName = (firebaseUser?.displayName || "").toString().trim();
    const parts = displayName ? displayName.split(/\s+/) : [];
    const fallbackFirstName = parts[0] || "";
    const fallbackLastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

    if (loginProfileFirstNameEl) {
      loginProfileFirstNameEl.value = (safeProfile.firstName || fallbackFirstName || "").toString();
    }
    if (loginProfileLastNameEl) {
      loginProfileLastNameEl.value = (safeProfile.lastName || fallbackLastName || "").toString();
    }
    if (loginProfileNicknameEl) {
      loginProfileNicknameEl.value = (safeProfile.nickname || "").toString();
    }
    if (loginProfileStudentIdEl) {
      const emailStudentId = authEmail.match(/^(\d{10})@(student|alumni)\.chula\.ac\.th$/)?.[1] || "";
      loginProfileStudentIdEl.value = (safeProfile.studentId || emailStudentId || "").toString();
    }
    if (loginProfilePhoneEl) {
      loginProfilePhoneEl.value = (safeProfile.phone || "").toString();
    }
    if (loginProfileLineIdEl) {
      loginProfileLineIdEl.value = (safeProfile.lineId || "").toString();
    }
    applyLoginProfileTypeUI();
    updateLoginProfileStudentMeta();
    if (isUserAuthenticated) {
      applyStaffViewMode();
    }
  }

  function loadLoginProfileByUser(firebaseUser, options = {}) {
    const forceReload = !!options.forceReload;
    const forceRemote = !!options.forceRemote;
    const authEmail = (firebaseUser?.email || "").toString().trim().toLowerCase();
    const email = normalizeAccountEmail(authEmail);
    if (!authEmail || !email) {
      loginProfileLoadedForEmail = "";
      clearLoginProfileFields();
      publishLoginProfileState(firebaseUser, null, { isLoading: false });
      return;
    }
    if (!forceReload && !forceRemote && loginProfileLoadedForEmail === email) {
      return;
    }

    const localProfiles = readLoginProfiles();
    const profile = normalizeLoginProfileAcademicFields({
      ...(localProfiles[email] || {}),
      authEmail,
      email
    });
    const hasLocalProfile = hasSavedLoginProfileData(profile);
    if (hasLocalProfile) {
      localProfiles[email] = {
        ...(localProfiles[email] || {}),
        ...profile,
        authEmail,
        email,
        accountEmail: email,
        updatedAt: localProfiles[email]?.updatedAt || Date.now()
      };
      writeLoginProfiles(localProfiles);
    }
    setFirstLoginPromptVisible(!hasLocalProfile);
    applyLoginProfileToFields(profile, firebaseUser);
    if (hasLocalProfile) {
      setLoginProfileStatus("โหลดข้อมูลผู้ใช้เดิมแล้ว", "#047857");
    } else {
      setLoginProfileStatus("ระบบเลือกประเภทผู้ใช้งานเป็นนิสิตไว้ก่อน กรุณากรอกข้อมูลผู้ใช้และกดบันทึก", "#6b7280");
    }
    publishLoginProfileState(firebaseUser, localProfiles[email] || profile, {
      isLoading: !hasLocalProfile && canUseRemoteProfileStore()
    });
    loginProfileLoadedForEmail = email;
    if (forceReload) {
      setLoginProfileStatus("กำลังโหลดข้อมูลผู้ใช้ล่าสุดจาก Firebase...", "#0f766e");
    }

    const currentSeq = ++loginProfileLoadSeq;
    void readRemoteLoginProfile(firebaseUser).then((remoteProfile) => {
      const currentEmail = normalizeAccountEmail(auth.currentUser?.email || "");
      if (currentSeq !== loginProfileLoadSeq || currentEmail !== email) return;
      if (!remoteProfile) {
        publishLoginProfileState(firebaseUser, localProfiles[email] || profile, { isLoading: false });
        return;
      }
      const normalizedRemoteProfile = normalizeLoginProfileAcademicFields({
        ...remoteProfile,
        authEmail,
        email,
        accountEmail: email
      });
      applyLoginProfileToFields(normalizedRemoteProfile, firebaseUser);
      setFirstLoginPromptVisible(!hasSavedLoginProfileData(normalizedRemoteProfile));
      const cached = readLoginProfiles();
      cached[email] = {
        ...(cached[email] || {}),
        ...normalizedRemoteProfile,
        authEmail,
        email,
        accountEmail: email,
        updatedAt: Date.now()
      };
      writeLoginProfiles(cached);
      publishLoginProfileState(firebaseUser, cached[email], { isLoading: false });
      window.dispatchEvent(new CustomEvent("sgcu:user-profile-updated", {
        detail: { email, authEmail, accountEmail: email, profile: cached[email] }
      }));
    }).catch(() => {
      const currentEmail = normalizeAccountEmail(auth.currentUser?.email || "");
      if (currentSeq !== loginProfileLoadSeq || currentEmail !== email) return;
      publishLoginProfileState(firebaseUser, localProfiles[email] || profile, { isLoading: false });
    });
  }

  async function saveLoginProfile(firebaseUser) {
    const authEmail = (firebaseUser?.email || "").toString().trim().toLowerCase();
    const email = normalizeAccountEmail(authEmail);
    if (!authEmail || !email) {
      setLoginProfileStatus("กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูลผู้ใช้", "#b91c1c");
      return false;
    }

    const profileType = getLoginProfileType();
    currentUserProfileType = profileType;
    const isStudent = profileType === "student";

    if (
      loginProfileFirstNameEl &&
      !loginProfileFirstNameEl.reportValidity()
    ) return false;
    if (
      loginProfileLastNameEl &&
      !loginProfileLastNameEl.reportValidity()
    ) return false;
    if (isStudent) {
      if (
        loginProfileNicknameEl &&
        !loginProfileNicknameEl.reportValidity()
      ) return false;
      if (
        loginProfileStudentIdEl &&
        !loginProfileStudentIdEl.reportValidity()
      ) return false;
    }
    if (isStudent) {
      if (
        loginProfilePhoneEl &&
        !loginProfilePhoneEl.reportValidity()
      ) return false;
      if (
        loginProfileLineIdEl &&
        !loginProfileLineIdEl.reportValidity()
      ) return false;
    }

    updateLoginProfileStudentMeta();
    if (isStudent && (!loginProfileFacultyEl?.value || !loginProfileYearEl?.value)) {
      setLoginProfileStatus("กรุณาตรวจสอบเลขประจำตัวนิสิตเพื่อให้ระบบระบุคณะและชั้นปี", "#b91c1c");
      return false;
    }

    const firstName = (loginProfileFirstNameEl?.value || "").toString().trim();
    const lastName = (loginProfileLastNameEl?.value || "").toString().trim();
    const nickname = isStudent ? (loginProfileNicknameEl?.value || "").toString().trim() : "";
    const studentId = isStudent ? (loginProfileStudentIdEl?.value || "").toString().trim() : "";
    const faculty = isStudent ? (loginProfileFacultyEl?.value || "").toString().trim() : "";
    const year = isStudent ? (loginProfileYearEl?.value || "").toString().trim() : "";
    const phone = (loginProfilePhoneEl?.value || "").toString().trim();
    const lineId = (loginProfileLineIdEl?.value || "").toString().trim();

    const profiles = readLoginProfiles();
    const existing = profiles[email] && typeof profiles[email] === "object" ? profiles[email] : {};
    profiles[email] = {
      ...existing,
      profileType,
      authEmail,
      email,
      accountEmail: email,
      firstName,
      lastName,
      nickname,
      studentId,
      faculty,
      year,
      phone,
      lineId,
      updatedAt: Date.now()
    };
    writeLoginProfiles(profiles);
    setFirstLoginPromptVisible(false);
    applyStaffViewMode();
    publishLoginProfileState(firebaseUser, profiles[email], { isLoading: false });
    window.dispatchEvent(new CustomEvent("sgcu:user-profile-updated", {
      detail: { email, authEmail, accountEmail: email, profile: profiles[email] }
    }));
    if (loginProfileSaveBtnEl) loginProfileSaveBtnEl.disabled = true;
    const remoteResult = await writeRemoteLoginProfile(firebaseUser, profiles[email]);
    if (loginProfileSaveBtnEl) loginProfileSaveBtnEl.disabled = false;
    if (remoteResult.ok) {
      setLoginProfileStatus("บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว", "#047857");
    } else {
      const code = remoteResult.code || "unknown";
      if (code === "permission-denied") {
        setLoginProfileStatus("บันทึกในเครื่องแล้ว แต่ Firebase ไม่มีสิทธิ์เขียน (permission-denied)", "#b45309");
      } else if (code === "unauthenticated") {
        setLoginProfileStatus("บันทึกในเครื่องแล้ว แต่ Firebase ต้องล็อกอินใหม่ก่อนบันทึก (unauthenticated)", "#b45309");
      } else {
        setLoginProfileStatus(`บันทึกในเครื่องแล้ว แต่บันทึก Firebase ไม่สำเร็จ (${code})`, "#b45309");
      }
    }
    return true;
  }

  function resolveSessionStart(user) {
    const uid = user?.uid || "";
    if (!uid) return null;

    const stored = readAuthSession();
    if (stored && stored.uid === uid) return stored.startedAt;

    const fallbackMs = new Date(user?.metadata?.lastSignInTime || "").getTime();
    const startedAt = Number.isFinite(fallbackMs) && fallbackMs > 0
      ? fallbackMs
      : Date.now();
    writeAuthSession(uid, startedAt);
    return startedAt;
  }

  function refreshAuthDisplay(firebaseUser) {
    const hasFirebase = !!firebaseUser;
    staffAuthUser = hasFirebase ? getStaffProfileByEmail(firebaseUser.email) : null;
    if (hasFirebase) {
      void hydrateStaffProfileFromRemote(firebaseUser.email);
    }
    if (!staffAuthUser) {
      staffViewMode = "normal";
    }
    const hasStaff = !!staffAuthUser;
    window.sgcuCurrentUserHasStaffAccess = hasStaff;
    const isAuth = hasFirebase;
    isUserAuthenticated = isAuth;
    const staffLabel = hasStaff
      ? [staffAuthUser.email, staffAuthUser.position].filter(Boolean).join(" ")
      : "";
    const nameText = hasFirebase
      ? `สวัสดี, ${firebaseUser.displayName || firebaseUser.email || ""}`
      : hasStaff
        ? `Staff : ${staffLabel}${staffAuthUser.nick ? ` (${staffAuthUser.nick})` : ""}`
        : "";

    if (userInfoEl) userInfoEl.textContent = "";
    if (logoutBtnEl) logoutBtnEl.style.display = isAuth ? "inline-block" : "none";
    if (mobileLogoutBtnEl) mobileLogoutBtnEl.style.display = isAuth ? "block" : "none";
    if (loginPageStatusEl) loginPageStatusEl.textContent = nameText;
    if (loginPageGoogleBtnEl) {
      loginPageGoogleBtnEl.style.display = isAuth ? "none" : "inline-block";
    }
    if (loginPageLogoutBtnEl) {
      loginPageLogoutBtnEl.style.display = isAuth ? "inline-block" : "none";
    }
    if (loginHelpApplyBtnEl) {
      loginHelpApplyBtnEl.hidden = !isAuth;
    }
    if (budgetRepresentativeApplyBtnEl) {
      budgetRepresentativeApplyBtnEl.hidden = !isAuth;
    }
    if (loginProfileCardEl) {
      loginProfileCardEl.hidden = !isAuth;
    }
    if (loginHeroEl) {
      loginHeroEl.classList.toggle("is-authenticated", isAuth);
    }
    if (loginHeroContentEl) {
      loginHeroContentEl.hidden = isAuth;
    }
    setLoginProfileEnabled(isAuth);
    loadLoginProfileByUser(firebaseUser);
    if (!isAuth) {
      setFirstLoginPromptVisible(false);
      setLoginProfileStatus("เข้าสู่ระบบก่อนจึงจะบันทึกข้อมูลผู้ใช้ได้", "#6b7280");
      publishLoginProfileState(null, null, { isLoading: false });
    }
    applyStaffViewMode();
    toggleProjectStatusAccess(isAuth, "public");
    toggleProjectStatusAccess(isAuth, "staff");

    // เปลี่ยนหน้าเฉพาะเมื่อหน้าปัจจุบันไม่สามารถมองเห็นได้
    const preferredPage = getPreferredPageForState(isAuth);
    const currentPage = getCurrentPageFromHash();
    if (!isNavPageVisible(currentPage) && window.__sgcuStaffApplicationFlowActive !== true) {
      goToFirstVisibleNavPageWithPreference(preferredPage);
    }
    window.dispatchEvent(
      new CustomEvent("sgcu:staff-auth-updated", {
        detail: {
          isAuthenticated: isAuth,
          hasStaff,
          email: (firebaseUser?.email || "").toString().trim().toLowerCase(),
          allowedPages: hasStaff ? Array.from(getAllowedStaffPagesByProfile(staffAuthUser)) : []
        }
      })
    );
  }

  onAuthStateChanged(auth, (user) => {
    if (user && !isAllowedAuthEmail(user.email)) {
      isAllowedAuthEmailAsync(user.email).then((allowed) => {
        if (allowed) {
          const startedAt = resolveSessionStart(user);
          if (startedAt && Date.now() - startedAt >= sessionMaxAgeMs) {
            clearAuthSession();
            signOut(auth).catch((err) => {
              console.error("auto logout error (session expired) - app.sorting-auth.js:2463", err);
            });
            refreshAuthDisplay(null);
            window.dispatchEvent(
              new CustomEvent("sgcu:auth-state", {
                detail: { isAuthenticated: false }
              })
            );
            return;
          }
          watchCurrentStaffApproval(user || null);
          watchCurrentRepresentativeApproval(user || null);
          refreshAuthDisplay(user);
          window.dispatchEvent(
            new CustomEvent("sgcu:auth-state", {
              detail: { isAuthenticated: true, uid: (user?.uid || "").toString(), email: (user?.email || "").toString().trim().toLowerCase() }
            })
          );
          return;
        }
        const message = getAuthEmailRequirementMessage(user.email);
        clearAuthSession();
        signOut(auth).catch((err) => {
          console.error("auto logout error (email domain not allowed) - app.sorting-auth.js:2486", err);
        });
        refreshAuthDisplay(null);
        if (loginPageStatusEl) {
          loginPageStatusEl.textContent = message;
        }
        window.dispatchEvent(
          new CustomEvent("sgcu:auth-state", {
            detail: { isAuthenticated: false }
          })
        );
      });
      return;
    }
    watchCurrentStaffApproval(user || null);
    watchCurrentRepresentativeApproval(user || null);
    if (user) {
      const startedAt = resolveSessionStart(user);
      if (startedAt && Date.now() - startedAt >= sessionMaxAgeMs) {
        clearAuthSession();
        signOut(auth).catch((err) => {
          console.error("auto logout error (session expired) - app.sorting-auth.js:2507", err);
        });
        refreshAuthDisplay(null);
        window.dispatchEvent(
          new CustomEvent("sgcu:auth-state", {
            detail: { isAuthenticated: false }
          })
        );
        return;
      }
    } else {
      clearAuthSession();
      resetCurrentStaffApprovalWatcher();
      resetCurrentRepresentativeApprovalWatcher();
    }
    refreshAuthDisplay(user);
    window.dispatchEvent(
      new CustomEvent("sgcu:auth-state", {
        detail: { isAuthenticated: !!user, uid: (user?.uid || "").toString(), email: (user?.email || "").toString().trim().toLowerCase() }
      })
    );
  });

  function handleGoogleLogin() {
    function getAuthErrorMessage(err) {
      const code = err?.code || "";
      const host = window.location.host;
      const protocol = window.location.protocol;
      const currentOrigin = window.location.origin;

      if (code === "auth/unauthorized-domain") {
        return [
          "ล็อกอินไม่สำเร็จ: โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase",
          `โดเมนปัจจุบัน: ${host}`,
          "ให้เพิ่มโดเมนนี้ใน Firebase Console > Authentication > Settings > Authorized domains"
        ].join("\n");
      }

      if (code === "auth/email-domain-not-allowed") {
        return err?.message || getAuthEmailRequirementMessage();
      }

      if (protocol !== "https:" && host !== "localhost") {
        return [
          "ล็อกอินไม่สำเร็จ: หน้าเว็บไม่ได้เปิดผ่าน HTTPS",
          `ต้นทางปัจจุบัน: ${currentOrigin}`,
          "Google/Firebase Sign-in บนโดเมนจริงควรใช้ HTTPS"
        ].join("\n");
      }

      return `ล็อกอินไม่สำเร็จ (${code || "unknown"}): ${err?.message || err}`;
    }

    function closeAuthAlert() {
      if (authAlertModalEl && typeof closeDialog === "function") {
        closeDialog(authAlertModalEl);
      } else if (authAlertModalEl) {
        authAlertModalEl.classList.remove("show");
        authAlertModalEl.setAttribute("aria-hidden", "true");
      }
    }

    function showAuthAlert(message) {
      const safeMessage = (message || "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง").toString();
      if (!authAlertModalEl || !authAlertMessageEl) {
        alert(safeMessage);
        return;
      }
      authAlertMessageEl.textContent = safeMessage;
      if (typeof openDialog === "function") {
        openDialog(authAlertModalEl, { focusSelector: "#authAlertClose" });
      } else {
        authAlertModalEl.classList.add("show");
        authAlertModalEl.setAttribute("aria-hidden", "false");
      }
    }

    if (authAlertCloseEl && !authAlertCloseEl.dataset.authAlertBound) {
      authAlertCloseEl.dataset.authAlertBound = "true";
      authAlertCloseEl.addEventListener("click", closeAuthAlert);
    }
    if (authAlertModalEl && !authAlertModalEl.dataset.authAlertBound) {
      authAlertModalEl.dataset.authAlertBound = "true";
      authAlertModalEl.addEventListener("click", (event) => {
        if (event.target === authAlertModalEl) closeAuthAlert();
      });
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });

    const startPopupSignIn = () => signInWithPopup(auth, provider);
    const signInPromise = auth.currentUser
      ? signOut(auth).catch((err) => {
          console.warn("pre-login sign out failed - app.sorting-auth.js", err);
        }).then(startPopupSignIn)
      : startPopupSignIn();

    signInPromise
      .then(async (credential) => {
        const user = credential?.user || auth.currentUser;
        const allowed = await isAllowedAuthEmailAsync(user?.email);
        if (!allowed) {
          await signOut(auth).catch((err) => {
            console.error("logout error (email domain not allowed) - app.sorting-auth.js:2601", err);
          });
          const err = new Error(getAuthEmailRequirementMessage(user?.email));
          err.code = "auth/email-domain-not-allowed";
          throw err;
        }
      })
      .catch((err) => {
        showAuthAlert(getAuthErrorMessage(err));
      });
  }

  if (loginBtnEl) {
    loginBtnEl.addEventListener("click", handleGoogleLogin);
  }
  if (loginPageGoogleBtnEl) {
    loginPageGoogleBtnEl.addEventListener("click", handleGoogleLogin);
  }
  if (loginProfileSaveBtnEl) {
    loginProfileSaveBtnEl.addEventListener("click", () => {
      void saveLoginProfile(auth.currentUser);
    });
  }
  [loginProfileFirstNameEl, loginProfileLastNameEl, loginProfileNicknameEl, loginProfilePhoneEl, loginProfileLineIdEl].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => {
      if (auth.currentUser) {
        setLoginProfileStatus("มีการเปลี่ยนแปลงข้อมูล กดบันทึกเพื่ออัปเดต", "#6b7280");
      }
    });
  });
  if (loginProfileStudentIdEl) {
    loginProfileStudentIdEl.addEventListener("input", () => {
      updateLoginProfileStudentMeta();
      if (auth.currentUser) {
        setLoginProfileStatus("มีการเปลี่ยนแปลงข้อมูล กดบันทึกเพื่ออัปเดต", "#6b7280");
      }
    });
    loginProfileStudentIdEl.addEventListener("blur", updateLoginProfileStudentMeta);
    updateLoginProfileStudentMeta();
  }
  [loginProfileTypeStudentEl, loginProfileTypeAffairsEl].forEach((input) => {
    if (!input) return;
    input.addEventListener("change", () => {
      applyLoginProfileTypeUI();
      if (auth.currentUser) {
        setLoginProfileStatus("มีการเปลี่ยนแปลงข้อมูล กดบันทึกเพื่ออัปเดต", "#6b7280");
      }
    });
  });
  applyLoginProfileTypeUI();
  function handleLogout() {
    staffAuthUser = null;
    staffViewMode = "normal";
    refreshAuthDisplay(auth.currentUser);
    clearAuthSession();
    signOut(auth).catch((err) => {
      console.error("logout error  app.js:3632 - app.sorting-auth.js:2658", err);
    });
    loginProfileLoadedForEmail = "";
    setLoginProfileStatus("ออกจากระบบแล้ว", "#6b7280");

    const hamburger = document.getElementById("hamburgerBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    if (hamburger && mobileMenu) {
      if (typeof setMobileMenuState === "function") {
        setMobileMenuState(mobileMenu, hamburger, false);
      } else {
        mobileMenu.classList.remove("show");
        mobileMenu.setAttribute("aria-hidden", "true");
        hamburger.setAttribute("aria-expanded", "false");
      }
    }
  }

  if (logoutBtnEl) {
    logoutBtnEl.addEventListener("click", handleLogout);
  }
  if (loginPageLogoutBtnEl) {
    loginPageLogoutBtnEl.addEventListener("click", handleLogout);
  }
  if (mobileLogoutBtnEl) {
    mobileLogoutBtnEl.addEventListener("click", handleLogout);
  }

  function initLoginNotificationControls() {
    const enableBtn = document.getElementById("loginNotificationEnableBtn");
    const summaryEl = document.getElementById("loginNotificationSummary");
    if (!enableBtn || !summaryEl) return;

    const renderNotificationState = async () => {
      const isSupported = typeof window !== "undefined" && typeof window.Notification !== "undefined";
      const permission = isSupported ? Notification.permission : "unsupported";
      const state = window.sgcuWebPush?.getClientState
        ? await window.sgcuWebPush.getClientState().catch(() => null)
        : null;
      const permissionText = permission === "granted"
        ? "อนุญาตแล้ว"
        : permission === "denied"
          ? "ถูกบล็อก"
          : isSupported ? "ยังไม่อนุญาต" : "ไม่รองรับ";
      const subscriptionText = state?.subscribed ? " • เชื่อมต่ออุปกรณ์แล้ว" : "";
      summaryEl.textContent = `การแจ้งเตือน: ${permissionText}${subscriptionText}`;
      summaryEl.style.color = permission === "denied" ? "#b91c1c" : "#6b7280";

      if (!isSupported) {
        enableBtn.disabled = true;
        enableBtn.textContent = "อุปกรณ์ไม่รองรับแจ้งเตือน";
      } else if (permission === "granted") {
        enableBtn.disabled = !!state?.subscribed;
        enableBtn.textContent = state?.subscribed ? "เชื่อมต่อ Push แล้ว" : "เชื่อมต่ออุปกรณ์นี้";
      } else if (permission === "denied") {
        enableBtn.disabled = true;
        enableBtn.textContent = "แจ้งเตือนถูกบล็อก";
      } else {
        enableBtn.disabled = false;
        enableBtn.textContent = "อนุญาตแจ้งเตือน";
      }
    };

    enableBtn.addEventListener("click", async () => {
      if (typeof window === "undefined" || typeof window.Notification === "undefined") {
        renderNotificationState();
        return;
      }
      enableBtn.disabled = true;
      try {
        await window.sgcuWebPush?.subscribePush({
          userAgent: navigator.userAgent,
          platform: navigator.platform || "",
          label: "login-settings"
        });
        summaryEl.textContent = "เชื่อมต่อ Push Notification สำเร็จ";
        summaryEl.style.color = "#047857";
      } catch (error) {
        summaryEl.textContent = `เชื่อมต่อไม่สำเร็จ: ${error?.message || "unknown-error"}`;
        summaryEl.style.color = "#b91c1c";
      } finally {
        await renderNotificationState();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      void renderNotificationState();
    });
    void renderNotificationState();
  }

  initLoginNotificationControls();
  watchStaffPositionAccessCatalog();
  refreshAuthDisplayFn = refreshAuthDisplay;
}
