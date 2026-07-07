/* Project Status UI: filters, summary cards, tables, dashboard KPIs */
function compareOrgFilterByCodeThenName(a, b) {
  const codeA = (a?.code || "").toString().trim();
  const codeB = (b?.code || "").toString().trim();
  if (codeA && codeB) {
    const codeCompare = codeA.localeCompare(codeB, "th", { numeric: true });
    if (codeCompare) return codeCompare;
  } else if (codeA || codeB) {
    return codeA ? -1 : 1;
  }
  return (a?.name || "").toString().localeCompare((b?.name || "").toString(), "th");
}

function normalizeProjectAcademicYearText(value) {
  const text = (value || "").toString().trim();
  const num = Number(text);
  if (!Number.isInteger(num) || num <= 0) return "";
  return num < 100 ? String(2500 + num) : String(num);
}

function getProjectSelectedAcademicYear() {
  const selected = yearSelect ? (yearSelect.value || "").toString().trim() : "";
  return selected && selected !== "all" ? normalizeProjectAcademicYearText(selected) : "";
}

function normalizeProjectYearMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce((acc, [year, text]) => {
    const normalizedYear = normalizeProjectAcademicYearText(year);
    const normalizedText = (text || "").toString().trim();
    if (/^\d{4}$/.test(normalizedYear) && normalizedText) acc[normalizedYear] = normalizedText;
    return acc;
  }, {});
}

function getProjectYearValue(map = {}, academicYear = getProjectSelectedAcademicYear()) {
  const year = Number(normalizeProjectAcademicYearText(academicYear));
  if (!Number.isFinite(year)) return "";
  const normalized = normalizeProjectYearMap(map);
  if (normalized[String(year)]) return normalized[String(year)];
  const previousYear = Object.keys(normalized)
    .map((key) => Number(key))
    .filter((itemYear) => Number.isFinite(itemYear) && itemYear < year)
    .sort((a, b) => b - a)[0];
  return previousYear ? normalized[String(previousYear)] || "" : "";
}

function getProjectOrgFilterAcademicYear(item = {}) {
  return normalizeProjectAcademicYearText(item?.academicYear || item?.year || item?.catalogAcademicYear);
}

function getProjectOrgFilterBaseId(item = {}) {
  return (item?.baseOrganizationId || item?.baseOrgId || item?.rootOrganizationId || item?.legacyOrganizationId || item?.id || "").toString().trim();
}

function getProjectOrgFilterDisplayName(item = {}, academicYear = getProjectSelectedAcademicYear()) {
  const itemYear = getProjectOrgFilterAcademicYear(item);
  const rawName = (item?.name || item?.organizationName || item?.orgName || "").toString().trim();
  if (itemYear) return rawName;
  const nameByAcademicYear = normalizeProjectYearMap(item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear);
  return Object.keys(nameByAcademicYear).length ? getProjectYearValue(nameByAcademicYear, academicYear) : rawName;
}

function getProjectOrgFilterDisplayCode(item = {}, academicYear = getProjectSelectedAcademicYear()) {
  const itemYear = getProjectOrgFilterAcademicYear(item);
  const rawCode = (item?.code || item?.orgCode || "").toString().trim().toUpperCase();
  if (itemYear) return rawCode;
  const codeByAcademicYear = normalizeProjectYearMap(item?.codeByAcademicYear || item?.orgCodeByAcademicYear);
  return Object.keys(codeByAcademicYear).length ? getProjectYearValue(codeByAcademicYear, academicYear).toUpperCase() : rawCode;
}

function getProjectOrgFiltersForYear(academicYear = getProjectSelectedAcademicYear()) {
  const rows = Array.isArray(orgFilters) ? orgFilters : [];
  const year = normalizeProjectAcademicYearText(academicYear);
  const filtered = rows
    .filter((item) => {
      const itemYear = getProjectOrgFilterAcademicYear(item);
      return !year || !itemYear || itemYear === year;
    })
    .map((item) => ({
      ...item,
      name: getProjectOrgFilterDisplayName(item, year),
      code: getProjectOrgFilterDisplayCode(item, year)
    }))
    .filter((item) => (item.group || "").toString().trim() && (item.name || "").toString().trim());

  return filtered.reduce((acc, item) => {
    const key = getProjectOrgFilterBaseId(item) || `${item.group}||${item.name}`.toLowerCase();
    const existingIndex = acc.findIndex((existing) =>
      (getProjectOrgFilterBaseId(existing) || `${existing.group}||${existing.name}`.toLowerCase()) === key
    );
    if (existingIndex < 0) {
      acc.push(item);
    } else if (getProjectOrgFilterAcademicYear(item) && !getProjectOrgFilterAcademicYear(acc[existingIndex])) {
      acc[existingIndex] = item;
    }
    return acc;
  }, []);
}

function initOrgTypeOptions() {
  if (!orgTypeSelect) return;  // ✅ กัน null

  const currentValue = orgTypeSelect.value || "all";
  while (orgTypeSelect.options.length > 1) {
    orgTypeSelect.remove(1);
  }
  const yearOrgFilters = getProjectOrgFiltersForYear();
  const groups = yearOrgFilters.length
    ? Array.from(new Set(yearOrgFilters.map((o) => o.group).filter(Boolean)))
    : Array.from(new Set(projects.map((p) => p.orgGroup).filter(Boolean)));
  groups.sort((a, b) => b.localeCompare(a, "th"));
  groups.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    orgTypeSelect.appendChild(opt);
  });
  orgTypeSelect.value = Array.from(orgTypeSelect.options).some((option) => option.value === currentValue)
    ? currentValue
    : "all";
}

function initOrgOptions() {
  if (!orgSelect || !orgTypeSelect) return;  // ✅ กัน null

  const currentValue = orgSelect.value || "all";
  while (orgSelect.options.length > 1) {
    orgSelect.remove(1);
  }
  const selectedGroup = orgTypeSelect.value;
  const yearOrgFilters = getProjectOrgFiltersForYear();
  const sourceList = yearOrgFilters.length
    ? yearOrgFilters.filter((o) => (selectedGroup === "all" ? true : o.group === selectedGroup))
    : projects.filter((p) => (selectedGroup === "all" ? true : p.orgGroup === selectedGroup));
  const orgNames = yearOrgFilters.length
    ? sourceList
      .slice()
      .sort(compareOrgFilterByCodeThenName)
      .map((item) => (item.name || "").toString().trim())
      .filter((name, index, list) => name && list.indexOf(name) === index)
    : Array.from(
      new Set(
        sourceList
          .map((item) => item.orgName)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "th"));
  orgNames.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    orgSelect.appendChild(opt);
  });
  orgSelect.value = Array.from(orgSelect.options).some((option) => option.value === currentValue)
    ? currentValue
    : "all";
}

const ADVANCE_NOT_BORROWED_STATUSES = new Set([
  "",
  "-",
  "สำรองจ่ายก่อน",
  "ยกเลิก",
  "ไม่อนุมัติ / อนุมัติไม่ทันวันจัดกิจกรรม"
]);

function hasAdvanceBorrow(project) {
  if (!project || typeof project !== "object") return false;
  const status = (project.advanceStatus || "").toString().trim();
  const normalizedStatus = status.toLowerCase();
  if (
    normalizedStatus &&
    !ADVANCE_NOT_BORROWED_STATUSES.has(status) &&
    !normalizedStatus.includes("ไม่ยืม")
  ) {
    return true;
  }
  return false;
}

function filterProjects() {
  const year = yearSelect ? yearSelect.value : "all";
  const orgGroup = orgTypeSelect ? orgTypeSelect.value : "all";
  const org = orgSelect ? orgSelect.value : "all";
  const searchTerm = projectSearchInput ? projectSearchInput.value.trim().toLowerCase() : "";

  return projects.filter((p) => {
    const yearMatch = year === "all" || p.year === year;
    const groupMatch = orgGroup === "all" || p.orgGroup === orgGroup;
    const orgMatch = org === "all" || p.orgName === org;
    let searchText = "";
    if (searchTerm) {
      searchText = p.searchText;
      if (!searchText) {
        searchText = [
          p.code,
          p.name,
          p.orgName,
          p.orgGroup,
          p.statusMain,
          p.status
        ]
          .map((v) => (v || "").toString().toLowerCase())
          .join(" ");
        p.searchText = searchText;
      }
    }
    const searchMatch = !searchTerm || searchText.includes(searchTerm);

    return yearMatch && groupMatch && orgMatch && searchMatch;
  });
}

function updateSummaryCards(filtered) {
  const total = filtered.length;
  let pending = 0;
  let approved = 0;
  let closed = 0;
  let totalBudget = 0;

  filtered.forEach((p) => {
    if (!isProjectClosed(p) && !isProjectTerminalWithoutClosure(p)) {
      pending += 1;
    }
    if (isProjectApproved(p)) {
      approved += 1;
    }
    if (isProjectClosed(p)) {
      closed += 1;
    }
    totalBudget += p.budget || 0;
  });

  // 🔧 เช็คว่ามี element ก่อน
  if (totalProjectsEl)   totalProjectsEl.textContent   = total;
  if (pendingProjectsEl) pendingProjectsEl.textContent = pending;
  if (approvedProjectsEl) approvedProjectsEl.textContent = approved;
  if (closedProjectsEl)  closedProjectsEl.textContent  = closed;
  if (totalBudgetEl)     totalBudgetEl.textContent     = formatMoney(totalBudget);

  return { total, pending, approved, closed, totalBudget };
}

function syncDashboardFilterOptions(selectEl, values) {
  if (!selectEl) return "all";
  const current = selectEl.value || "all";
  const uniqueValues = Array.from(
    new Set(values.map((v) => (v || "").toString().trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "th-TH"));

  while (selectEl.options.length) {
    selectEl.remove(0);
  }

  const baseOption = document.createElement("option");
  baseOption.value = "all";
  baseOption.textContent = "ทั้งหมด";
  selectEl.appendChild(baseOption);

  uniqueValues.forEach((value) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    selectEl.appendChild(opt);
  });

  if (uniqueValues.includes(current)) {
    selectEl.value = current;
  } else {
    selectEl.value = "all";
  }

  return selectEl.value;
}

function isClubDebtProject(project) {
  if (!project || typeof project !== "object") return false;
  const advanceStatus = (project.advanceStatus || "").toString().trim();
  const closeStatus = (project.statusClose || "").toString().trim();
  const daysToDeadline = Number(project.daysToDeadline);
  const advanceAmount = Number(project.advanceAmount || 0);
  const debtAdvanceStatuses = new Set([
    "โครงการรับเงินแล้ว",
    "เหรัญญิกรับเงินจากกิจการนิสิต"
  ]);
  return (
    debtAdvanceStatuses.has(advanceStatus) &&
    Number.isFinite(daysToDeadline) &&
    daysToDeadline < 0 &&
    closeStatus !== "ส่งกิจการนิสิตเรียบร้อย" &&
    Number.isFinite(advanceAmount) &&
    advanceAmount !== 0
  );
}

function getClubDebtSummaryScope(sourceProjects) {
  const orgGroupFilter = orgTypeSelect ? orgTypeSelect.value : "all";
  const orgFilter = orgSelect ? orgSelect.value : "all";
  const getFallbackGroups = () => Array.from(
    new Set(
      (sourceProjects || [])
        .map((project) => (project.orgGroup || "").toString().trim())
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a, "th"));
  const getFallbackOrgs = (group) => Array.from(
    new Set(
      (sourceProjects || [])
        .filter((project) => !group || group === "all" || project.orgGroup === group)
        .map((project) => (project.orgName || "").toString().trim())
        .filter(Boolean)
    )
  );

  if (orgGroupFilter === "all" && orgFilter === "all") {
    const labels = typeof getChartOrgGroups === "function"
      ? getChartOrgGroups()
      : getFallbackGroups();
    return {
      labels,
      unit: "ประเภทองค์กร",
      resolveLabel: (project) => {
        const group = (project.orgGroup || "").toString().trim();
        return labels.includes(group) ? group : null;
      }
    };
  }

  if (orgFilter === "all") {
    const labels = typeof getOrgsByGroup === "function"
      ? getOrgsByGroup(orgGroupFilter)
      : getFallbackOrgs(orgGroupFilter);
    return {
      labels,
      unit: "ฝ่าย / ชมรม",
      resolveLabel: (project) => {
        const org = (project.orgName || "").toString().trim() || "(ไม่ระบุฝ่าย/ชมรม)";
        return labels.length && !labels.includes(org) ? null : org;
      }
    };
  }

  return {
    labels: [orgFilter],
    unit: "ฝ่าย / ชมรม",
    resolveLabel: (project) => {
      const org = (project.orgName || "").toString().trim() || "(ไม่ระบุฝ่าย/ชมรม)";
      return org === orgFilter ? org : null;
    }
  };
}

function buildClubDebtSummaryRows(sourceProjects) {
  const scope = getClubDebtSummaryScope(sourceProjects);
  const rowsByLabel = new Map();
  scope.labels.forEach((label) => {
    rowsByLabel.set(label, {
      orgName: label,
      totalDebt: 0,
      projectCount: 0,
      maxOverdueDays: 0
    });
  });

  (sourceProjects || []).forEach((project) => {
    if (!isClubDebtProject(project)) return;
    const label = scope.resolveLabel(project);
    if (!label) return;
    const amount = Number(project.advanceAmount || 0);
    const overdueDays = Math.abs(Number(project.daysToDeadline || 0));
    const current = rowsByLabel.get(label) || {
      orgName: label,
      totalDebt: 0,
      projectCount: 0,
      maxOverdueDays: 0
    };
    current.totalDebt += amount;
    current.projectCount += 1;
    current.maxOverdueDays = Math.max(current.maxOverdueDays, overdueDays);
    rowsByLabel.set(label, current);
  });

  return {
    rows: Array.from(rowsByLabel.values()),
    unit: scope.unit
  };
}

function updateClubDebtSummary(filtered) {
  const totalEl = document.getElementById("clubDebtTotalStaff");
  const captionEl = document.getElementById("clubDebtCaptionStaff");
  const chartCaptionEl = document.getElementById("clubDebtSummaryChartCaptionStaff");
  const chartInnerEl = document.getElementById("clubDebtSummaryChartInnerStaff");
  const chartCanvasEl = document.getElementById("clubDebtSummaryChartStaff");
  const ageCaptionEl = document.getElementById("clubDebtAgeCaptionStaff");
  const ageCanvasEl = document.getElementById("clubDebtAgeChartStaff");
  const ageLegendEl = document.getElementById("clubDebtAgeLegendStaff");

  if (!totalEl && !captionEl && !chartCaptionEl && !chartCanvasEl && !ageCaptionEl && !ageCanvasEl && !ageLegendEl) return;
  initDashboardDebtToggle();

  const { rows, unit } = buildClubDebtSummaryRows(filtered);
  const totalDebt = rows.reduce((sum, row) => sum + row.totalDebt, 0);
  const projectCount = rows.reduce((sum, row) => sum + row.projectCount, 0);
  const activeDebtRows = rows.filter((row) => row.totalDebt !== 0 || row.projectCount > 0);

  if (totalEl) {
    totalEl.textContent = formatMoney(totalDebt);
  }
  if (captionEl) {
    captionEl.textContent = activeDebtRows.length
      ? `แสดงผล ${projectCount.toLocaleString("th-TH")} โครงการ จาก ${activeDebtRows.length.toLocaleString("th-TH")} ${unit}ที่มีหนี้`
      : "ไม่มีรายการที่เข้าเงื่อนไข";
  }
  if (chartCaptionEl) {
    chartCaptionEl.textContent = "";
  }
  updateClubDebtSummaryChart(activeDebtRows, chartCanvasEl, chartInnerEl);
  updateClubDebtAgeChart(filtered, ageCanvasEl, ageCaptionEl, ageLegendEl);
}

function initDashboardDebtToggle() {
  const root = document.querySelector('.page-view[data-page="dashboard-staff"]');
  if (!root || root.dataset.dashboardDebtToggleReady === "true") return;
  const btns = Array.from(root.querySelectorAll("[data-dashboard-debt-view]"));
  const panels = Array.from(root.querySelectorAll("[data-dashboard-debt-panel]"));
  if (!btns.length || !panels.length) return;

  const setView = (view) => {
    const nextView = view === "age" ? "age" : "summary";
    btns.forEach((btn) => {
      const isActive = btn.dataset.dashboardDebtView === nextView;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.dashboardDebtPanel !== nextView;
    });
    window.requestAnimationFrame(() => {
      if (nextView === "age") {
        clubDebtAgeChart?.resize?.();
      } else {
        clubDebtSummaryChart?.resize?.();
      }
    });
  };

  btns.forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.dashboardDebtView));
  });
  root.dataset.dashboardDebtToggleReady = "true";
  setView("summary");
}

function buildClubDebtAgeBuckets(sourceProjects) {
  const buckets = [
    { key: "1-7", label: "1-7 วัน", min: 1, max: 7, totalDebt: 0, projectCount: 0 },
    { key: "8-14", label: "8-14 วัน", min: 8, max: 14, totalDebt: 0, projectCount: 0 },
    { key: "15-30", label: "15-30 วัน", min: 15, max: 30, totalDebt: 0, projectCount: 0 },
    { key: "30+", label: "มากกว่า 30 วัน", min: 31, max: Infinity, totalDebt: 0, projectCount: 0 }
  ];

  (sourceProjects || []).forEach((project) => {
    if (!isClubDebtProject(project)) return;
    const overdueDays = Math.abs(Number(project.daysToDeadline || 0));
    const bucket = buckets.find((item) => overdueDays >= item.min && overdueDays <= item.max);
    if (!bucket) return;
    bucket.totalDebt += Number(project.advanceAmount || 0);
    bucket.projectCount += 1;
  });

  return buckets;
}

function renderClubDebtAgeLegend(buckets, colors, legendEl) {
  if (!legendEl) return;
  legendEl.replaceChildren();
  buckets.forEach((bucket, index) => {
    const item = document.createElement("span");
    const dot = document.createElement("span");
    const text = document.createElement("span");
    item.className = "club-debt-age-legend-item";
    dot.className = "club-debt-age-legend-dot";
    dot.style.backgroundColor = colors[index] || "#d1d5db";
    text.textContent = bucket.label;
    item.append(dot, text);
    legendEl.appendChild(item);
  });
}

function updateClubDebtAgeChart(filtered, chartCanvasEl, captionEl, legendEl) {
  if (!chartCanvasEl || typeof Chart === "undefined") return;

  const buckets = buildClubDebtAgeBuckets(filtered);
  const totalDebt = buckets.reduce((sum, bucket) => sum + bucket.totalDebt, 0);
  const totalProjects = buckets.reduce((sum, bucket) => sum + bucket.projectCount, 0);
  const activeBuckets = buckets.filter((bucket) => bucket.projectCount > 0);
  const activeColors = ["#f9a8d4", "#f472b6", "#ec4899", "#be185d"];
  const emptyColors = ["rgba(209, 213, 219, 0.72)", "rgba(209, 213, 219, 0.18)", "rgba(209, 213, 219, 0.18)", "rgba(209, 213, 219, 0.18)"];
  const ageColors = totalDebt > 0 ? activeColors : emptyColors;

  if (captionEl) {
    captionEl.textContent = "";
  }
  renderClubDebtAgeLegend(buckets, ageColors, legendEl);

  const chartData = {
    labels: buckets.map((bucket) => bucket.label),
    datasets: [
      {
        data: totalDebt > 0 ? buckets.map((bucket) => Math.abs(bucket.totalDebt)) : [1, 0, 0, 0],
        backgroundColor: ageColors,
        borderColor: "#ffffff",
        borderWidth: 2,
        pointStyle: "circle"
      }
    ]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    cutout: "64%",
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: totalDebt > 0,
        callbacks: {
          title: (items) => items?.[0]?.label || "",
          label: (ctx) => {
            const bucket = buckets[ctx.dataIndex];
            if (!bucket || bucket.projectCount <= 0) return "ไม่มีรายการ";
            const percent = totalDebt > 0 ? (Math.abs(bucket.totalDebt) / Math.abs(totalDebt)) * 100 : 0;
            return [
              `ยอดหนี้: ${formatMoney(bucket.totalDebt)} บาท (${percent.toFixed(1)}%)`,
              `จำนวนโครงการ: ${bucket.projectCount.toLocaleString("th-TH")} โครงการ`
            ];
          }
        }
      }
    }
  };

  if (clubDebtAgeChart) {
    clubDebtAgeChart.data = chartData;
    clubDebtAgeChart.options = options;
    clubDebtAgeChart.update("none");
    return;
  }

  clubDebtAgeChart = new Chart(chartCanvasEl.getContext("2d"), {
    type: "doughnut",
    data: chartData,
    options
  });
}

function resizeClubDebtSummaryChart(rows, chartInnerEl) {
  if (!chartInnerEl) return;
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const wrapLabel = typeof getClosureAxisWrappedLabel === "function"
    ? getClosureAxisWrappedLabel
    : (label) => label;
  const countWrappedLines = typeof getWrappedLineCount === "function"
    ? getWrappedLineCount
    : (label) => (Array.isArray(label) ? label.length : 1);
  const labels = rows.map((row) => row.orgName);
  const maxWrappedLines = labels.reduce((max, label) => {
    return Math.max(max, countWrappedLines(wrapLabel(label)));
  }, 1);
  const baseHeight = isMobile ? 320 : 260;
  const perLabel = isMobile
    ? Math.max(42, 22 + maxWrappedLines * 14)
    : Math.max(30, 16 + maxWrappedLines * 13);
  chartInnerEl.style.height = `${Math.max(baseHeight, Math.max(rows.length, 1) * perLabel)}px`;
  if (clubDebtSummaryChart) clubDebtSummaryChart.resize();
}

function formatDebtAxisTick(value, compact = false) {
  const num = Math.abs(Number(value));
  if (!Number.isFinite(num)) return "";
  if (compact) {
    if (num >= 1000000) {
      const valueText = (num / 1000000).toLocaleString("th-TH", { maximumFractionDigits: 1 });
      return `${valueText}M`;
    }
    if (num >= 1000) {
      const valueText = (num / 1000).toLocaleString("th-TH", { maximumFractionDigits: 0 });
      return `${valueText}K`;
    }
    return num.toLocaleString("th-TH", { maximumFractionDigits: 0 });
  }
  if (num >= 1000000) {
    const valueText = (num / 1000000).toLocaleString("th-TH", { maximumFractionDigits: 1 });
    return `${valueText} ล้าน`;
  }
  if (num >= 100000) {
    const valueText = (num / 100000).toLocaleString("th-TH", { maximumFractionDigits: 1 });
    return `${valueText} แสน`;
  }
  if (num >= 1000) {
    const valueText = (num / 1000).toLocaleString("th-TH", { maximumFractionDigits: 0 });
    return `${valueText} พัน`;
  }
  return num.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function updateClubDebtSummaryChart(rows, chartCanvasEl, chartInnerEl) {
  if (!chartCanvasEl || typeof Chart === "undefined") return;
  const wrapLabel = typeof getClosureAxisWrappedLabel === "function"
    ? getClosureAxisWrappedLabel
    : (label) => label;
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const yAxisWidth = isMobile ? 118 : 190;

  const labels = rows.length ? rows.map((row) => row.orgName) : ["ไม่มีรายการ"];
  const data = rows.length ? rows.map((row) => Math.abs(row.totalDebt)) : [0];
  const metaByLabel = new Map(rows.map((row) => [row.orgName, row]));
  const maxDebt = data.reduce((max, value) => Math.max(max, value), 0);
  const axisMax = maxDebt > 0 ? Math.ceil((maxDebt * 1.1) / 1000) * 1000 : 1000;
  const chartData = {
    labels,
    datasets: [
      {
        label: "ยอดหนี้",
        data,
        backgroundColor: rows.length ? "rgba(236, 72, 153, 0.74)" : "rgba(209, 213, 219, 0.72)",
        borderColor: rows.length ? "#db2777" : "#d1d5db",
        borderWidth: 1,
        borderSkipped: false,
        borderRadius: {
          topLeft: 0,
          bottomLeft: 0,
          topRight: 10,
          bottomRight: 10
        },
        maxBarThickness: 26,
        pointStyle: "rectRounded"
      }
    ]
  };
  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
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
        enabled: rows.length > 0,
        callbacks: {
          title: (items) => items?.[0]?.label || "",
          label: (ctx) => {
            const row = metaByLabel.get(ctx.label);
            if (!row) return "ยังไม่มีรายการหนี้สโมสร";
            return [
              `ยอดหนี้: ${formatMoney(row.totalDebt)} บาท`,
              `จำนวนโครงการ: ${row.projectCount.toLocaleString("th-TH")} โครงการ`,
              `ค้างนานสุด: ${row.maxOverdueDays.toLocaleString("th-TH")} วัน`
            ];
          }
        }
      },
      externalAxisLabels: {
        y: {
          enabled: true,
          width: yAxisWidth,
          gap: 8,
          formatter: (label) => wrapLabel(label)
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: axisMax,
        ticks: {
          font: { size: isMobile ? 10 : 11 },
          maxTicksLimit: isMobile ? 4 : 5,
          callback(value) {
            return formatDebtAxisTick(value, isMobile);
          }
        }
      },
      y: {
        afterFit(scale) {
          scale.width = yAxisWidth;
        },
        ticks: {
          display: false,
          autoSkip: false,
          padding: 6,
          callback(value) {
            return wrapLabel(this.getLabelForValue(value));
          }
        }
      }
    }
  };

  resizeClubDebtSummaryChart(rows, chartInnerEl);
  if (clubDebtSummaryChart) {
    clubDebtSummaryChart.data = chartData;
    clubDebtSummaryChart.options = options;
    clubDebtSummaryChart.update("none");
    return;
  }

  clubDebtSummaryChart = new Chart(chartCanvasEl.getContext("2d"), {
    type: "bar",
    data: chartData,
    options
  });
}

function updateDashboardInsights(filtered, summary) {
  if (!summary) return;
  if (
    !closureRateEl &&
    !approvalRateEl &&
    !avgBudgetEl &&
    !activeOrgCountEl &&
    !topOrgNameEl &&
    !recentProjectsListEl &&
    !longestOpenListEl &&
    !longestOpenTableCaptionEl &&
    !longestOpenTableBodyEl &&
    !document.getElementById("clubDebtTotalStaff") &&
    !document.getElementById("clubDebtSummaryChartStaff") &&
    !document.getElementById("clubDebtAgeChartStaff")
  ) {
    return;
  }

  const total = summary.total || 0;
  const closureEligibleProjects = filtered.filter((p) => !isProjectTerminalWithoutClosure(p));
  const closureEligibleTotal = closureEligibleProjects.length;
  const closed = closureEligibleProjects.filter(isProjectClosed).length;
  const approved = summary.approved || 0;
  const totalBudget = summary.totalBudget || 0;

  const closureRate = closureEligibleTotal ? (closed / closureEligibleTotal) * 100 : 0;
  const approvalRate = total ? (approved / total) * 100 : 0;
  const avgBudget = total ? totalBudget / total : 0;

  if (closureRateEl) closureRateEl.textContent = `${closureRate.toFixed(1)}%`;
  if (closureRateCaptionEl) {
    closureRateCaptionEl.textContent = closureEligibleTotal
      ? `${closed} จาก ${closureEligibleTotal} โครงการที่ต้องปิด`
      : "ยังไม่มีโครงการที่ต้องปิดในตัวกรองนี้";
  }
  if (closureRateBarEl) {
    closureRateBarEl.style.width = `${Math.min(closureRate, 100)}%`;
  }
  if (closureRateDonutCanvas) {
    const closedList = closureEligibleProjects.filter(isProjectClosed);
    closureRateDonutChart = updateDonutChart(
      closureRateDonutChart,
      closureRateDonutCanvas,
      closureRate,
      "#ec4899",
      getDonutTooltipLines(closedList)
    );
  }

  if (approvalRateEl) approvalRateEl.textContent = `${approvalRate.toFixed(1)}%`;
  if (approvalRateCaptionEl) {
    approvalRateCaptionEl.textContent = total
      ? `${approved} จาก ${total} โครงการอนุมัติแล้ว`
      : "ยังไม่มีโครงการในตัวกรองนี้";
  }
  if (approvalRateBarEl) {
    approvalRateBarEl.style.width = `${Math.min(approvalRate, 100)}%`;
  }
  if (approvalRateDonutCanvas) {
    const approvedList = filtered.filter(isProjectApproved);
    approvalRateDonutChart = updateDonutChart(
      approvalRateDonutChart,
      approvalRateDonutCanvas,
      approvalRate,
      "#f472b6",
      getDonutTooltipLines(approvedList)
    );
  }

  if (avgBudgetEl) avgBudgetEl.textContent = formatMoney(avgBudget);
  if (avgBudgetCaptionEl) {
    avgBudgetCaptionEl.textContent = `งบรวม ${formatMoney(totalBudget)} บาท`;
  }

  if (activeOrgCountEl || activeOrgCaptionEl) {
    const activeOrgs = new Set(
      filtered.map((p) => (p.orgName || "").trim()).filter(Boolean)
    );
    const yearOrgFilters = getProjectOrgFiltersForYear();
    const allOrgCount = yearOrgFilters.length
      ? new Set(yearOrgFilters.map((o) => (o.name || "").trim()).filter(Boolean)).size
      : activeOrgs.size;

    if (activeOrgCountEl) {
      activeOrgCountEl.textContent = activeOrgs.size.toLocaleString("th-TH");
    }
    if (activeOrgCaptionEl) {
      activeOrgCaptionEl.textContent = allOrgCount
        ? `จากทั้งหมด ${allOrgCount.toLocaleString("th-TH")} หน่วยงาน`
        : "จำนวนหน่วยงานทั้งหมดไม่ระบุ";
    }
  }

  if (topOrgNameEl || topOrgBudgetEl) {
    const orgTotals = new Map();
    filtered.forEach((p) => {
      const name = (p.orgName || "").trim() || "(ไม่ระบุฝ่าย/ชมรม)";
      const budget = Number(p.budget || 0);
      orgTotals.set(name, (orgTotals.get(name) || 0) + budget);
    });

    let topOrg = null;
    orgTotals.forEach((value, name) => {
      if (!topOrg || value > topOrg.total) {
        topOrg = { name, total: value };
      }
    });

    if (topOrgNameEl) {
      topOrgNameEl.textContent = topOrg ? topOrg.name : "-";
    }
    if (topOrgBudgetEl) {
      topOrgBudgetEl.textContent = topOrg
        ? `${formatMoney(topOrg.total)} บาท`
        : "ยังไม่มีข้อมูล";
    }
  }

  updateClubDebtSummary(filtered);

  const renderRankList = (listEl, items, emptyText) => {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "rank-list-empty";
      li.textContent = emptyText;
      listEl.appendChild(li);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      const title = document.createElement("span");
      const value = document.createElement("span");
      title.className = "rank-item-title";
      value.className = "rank-item-value";
      title.textContent = item.title;
      value.textContent = item.value;
      li.append(title, value);
      listEl.appendChild(li);
    });
  };

  const recentItems = [...filtered]
    .map((p) => {
      let date = p.lastWorkDateObj;
      if (!date) {
        date = parseProjectDate(p.lastWorkDate);
        if (date) p.lastWorkDateObj = date;
      }
      return date ? { project: p, date } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.date - a.date)
    .slice(0, 3)
    .map(({ project, date }) => {
      const name = (project.name || "").trim() || "(ไม่ระบุชื่อโครงการ)";
      const code = (project.code || "").trim();
      return {
        title: code ? `${name} (${code})` : name,
        value: date.toLocaleDateString("th-TH")
      };
    });

  renderRankList(recentProjectsListEl, recentItems, "ยังไม่มีวันที่อัปเดตโครงการ");

  const today = new Date();
  const longestOpenTabs = Array.from(document.querySelectorAll("[data-longest-open-tab]"));
  const longestOpenDaysHeaderEl = document.getElementById("longestOpenDaysHeaderStaff");
  const activeLongestOpenTab =
    longestOpenTabs.find((tab) => tab.classList.contains("is-active"))?.dataset.longestOpenTab || "overdue";
  const openItemsBase = [...filtered]
    .filter((p) => !isProjectClosed(p))
    .filter((p) => !isProjectTerminalWithoutClosure(p))
    .filter((p) => {
      const status = (p.statusMain || "")
        .toString()
        .replace(/\u200B/g, "")
        .replace(/\s+/g, "")
        .trim();
      return !status.includes("ยกเลิกโครงการ");
    })
    .map((p) => {
      let dueDate = p.closeDueDateObj;
      if (!dueDate) {
        dueDate = parseProjectDate(p.closeDueDate);
        if (dueDate) p.closeDueDateObj = dueDate;
      }
      if (!dueDate) return null;
      const rawDays = Math.floor((today - dueDate) / (24 * 60 * 60 * 1000));
      const overdueDays = Math.max(0, rawDays);
      const waitingDays = Math.max(0, -rawDays);
      const statusText = (p.statusClose || "").trim() || "-";
      return {
        project: p,
        code: (p.code || "").trim(),
        name: (p.name || "").trim() || "(ไม่ระบุชื่อโครงการ)",
        org: (p.orgName || "").trim() || "(ไม่ระบุฝ่าย/ชมรม)",
        hasAdvanceBorrow: hasAdvanceBorrow(p),
        assistant: (p.closeChecker || "").trim() || "-",
        status: statusText,
        statusBadge: `<span class="${statusCloseToBadgeClass(statusText)}">${statusText}</span>`,
        rawDays,
        overdueDays,
        waitingDays
      };
    })
    .filter(Boolean);

  const overdueItemsRaw = openItemsBase
    .filter((item) => item.rawDays > 0)
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .map((item) => ({
      ...item,
      days: item.overdueDays,
      title: item.code ? `${item.name} (${item.code})` : item.name,
      value: `ค้าง ${item.overdueDays.toLocaleString("th-TH")} วัน`
    }));

  const waitingItemsRaw = openItemsBase
    .filter((item) => item.rawDays <= 0)
    .sort((a, b) => a.waitingDays - b.waitingDays)
    .map((item) => ({
      ...item,
      days: item.waitingDays,
      title: item.code ? `${item.name} (${item.code})` : item.name,
      value: item.waitingDays === 0
        ? "ครบกำหนดวันนี้"
        : `เหลือ ${item.waitingDays.toLocaleString("th-TH")} วัน`
    }));

  const activeItemsRaw = activeLongestOpenTab === "waiting" ? waitingItemsRaw : overdueItemsRaw;

  const assistantFilterValue = syncDashboardFilterOptions(
    longestOpenAssistantFilterEl,
    openItemsBase.map((item) => item.assistant)
  );
  const statusFilterValue = syncDashboardFilterOptions(
    longestOpenStatusFilterEl,
    openItemsBase.map((item) => item.status)
  );

  longestOpenTabs.forEach((tab) => {
    const isActive = tab.dataset.longestOpenTab === activeLongestOpenTab;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    if (!tab.dataset.boundClick) {
      tab.addEventListener("click", () => {
        longestOpenTabs.forEach((candidate) => {
          candidate.classList.toggle("is-active", candidate === tab);
          candidate.setAttribute("aria-selected", candidate === tab ? "true" : "false");
        });
        if (typeof refreshProjectStatus === "function") {
          refreshProjectStatus(activeProjectStatusContext);
        } else {
          updateDashboardInsights(filtered, summary);
        }
      });
      tab.dataset.boundClick = "true";
    }
  });

  let openItems = activeItemsRaw;
  if (assistantFilterValue !== "all") {
    openItems = openItems.filter((item) => item.assistant === assistantFilterValue);
  }
  if (statusFilterValue !== "all") {
    openItems = openItems.filter((item) => item.status === statusFilterValue);
  }

  if (longestOpenTableCaptionEl) {
    const captionPrefix = activeLongestOpenTab === "waiting" ? "โครงการรอปิด" : "โครงการค้างปิด";
    longestOpenTableCaptionEl.textContent = `${captionPrefix} ${openItems.length.toLocaleString("th-TH")} โครงการ`;
  }
  if (longestOpenDaysHeaderEl) {
    longestOpenDaysHeaderEl.textContent = activeLongestOpenTab === "waiting" ? "วันถึงกำหนด" : "ยอดวันที่ค้าง";
  }

  renderRankList(
    longestOpenListEl,
    openItems,
    activeLongestOpenTab === "waiting" ? "ยังไม่มีโครงการรอปิด" : "ยังไม่มีโครงการที่ค้างปิด"
  );

  if (longestOpenTableBodyEl) {
    lastLongestOpenProjects = openItems.map((item) => item.project).filter(Boolean);
    longestOpenTableBodyEl.innerHTML = "";
    if (!openItems.length) {
      const tr = document.createElement("tr");
      const emptyText = activeLongestOpenTab === "waiting" ? "ยังไม่มีโครงการรอปิด" : "ยังไม่มีโครงการที่ค้างปิด";
      tr.innerHTML = `<td colspan="5" class="table-empty" style="text-align:center; color:#9ca3af;">${emptyText}</td>`;
      longestOpenTableBodyEl.appendChild(tr);
    } else {
      openItems.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.classList.add("project-row");
        if (item.hasAdvanceBorrow) tr.classList.add("project-row-advance");
        tr.dataset.longestOpenIdx = String(idx);
        const orgText = item.org ? `<span class="kpi-caption">${item.org}</span>` : "";
        tr.style.cursor = "pointer";
        tr.tabIndex = 0;
        tr.setAttribute("role", "button");
        tr.setAttribute("aria-label", `ดูรายละเอียดโครงการ ${item.name}`);
        tr.innerHTML = `
          <td class="col-code" data-label="รหัสโครงการ">${item.code}</td>
          <td class="col-name" data-label="ชื่อโครงการ">${item.name}<br>${orgText}</td>
          <td class="col-assistant" data-label="ผู้รับผิดชอบ">${item.assistant}</td>
          <td class="col-status" data-label="สถานะปิดโครงการ">${item.statusBadge || item.status}</td>
          <td class="col-budget" data-label="${activeLongestOpenTab === "waiting" ? "วันถึงกำหนด" : "ยอดวันที่ค้าง"}" style="text-align:right;">${item.value}</td>
        `;
        const openProjectDetail = () => {
          if (item.project) openProjectModal(item.project);
        };
        tr.addEventListener("click", openProjectDetail);
        tr.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openProjectDetail();
          }
        });
        longestOpenTableBodyEl.appendChild(tr);
      });
    }

    if (!longestOpenTableBodyEl.dataset.boundClick) {
      longestOpenTableBodyEl.addEventListener("click", (e) => {
        const row = e.target.closest("tr[data-longest-open-idx]");
        if (!row || !longestOpenTableBodyEl.contains(row)) return;
        const idx = Number(row.dataset.longestOpenIdx);
        const project = lastLongestOpenProjects[idx];
        if (project) openProjectModal(project);
      });
      longestOpenTableBodyEl.dataset.boundClick = "true";
    }
  }
}

function updateTrendLineChart(filtered) {
  if (!trendLineChart) return;

  const buckets = new Map();
  const today = new Date();
  filtered.forEach((p) => {
    if ((p.statusMain || "").trim() === "ยกเลิกโครงการ") return;
    if (isProjectClosed(p)) return;
    if (isProjectTerminalWithoutClosure(p)) return;
    let workDate = p.lastWorkDateObj;
    if (!workDate) {
      workDate = parseProjectDate(p.lastWorkDate);
      if (workDate) p.lastWorkDateObj = workDate;
    }
    if (!workDate || workDate > today) return;
    const key = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) {
      buckets.set(key, { date: new Date(workDate.getFullYear(), workDate.getMonth(), 1), count: 0 });
    }
    buckets.get(key).count += 1;
  });

  const entries = Array.from(buckets.values()).sort((a, b) => a.date - b.date);
  const trimmed = entries.slice(-10);
  const monthNamesShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const formatMonthLabel = (date) => {
    const year = date.getFullYear().toString().slice(-2);
    return `${monthNamesShort[date.getMonth()]} ${year}`;
  };
  let labels = trimmed.map(({ date }) => formatMonthLabel(date));
  let data = trimmed.map((entry) => entry.count);

  if (trimmed.length === 1) {
    const currentDate = trimmed[0].date;
    const previousDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    labels = [formatMonthLabel(previousDate), formatMonthLabel(currentDate), formatMonthLabel(nextDate)];
    data = [0, trimmed[0].count, 0];
  }

  const dataset = trendLineChart.data.datasets[0];
  const isSingleMonth = trimmed.length === 1;
  trendLineChart.data.labels = labels;
  dataset.data = data;
  dataset.type = "line";
  dataset.borderWidth = isSingleMonth ? 3 : 2;
  dataset.pointRadius = isSingleMonth ? 4 : 3;
  dataset.pointHoverRadius = isSingleMonth ? 5 : 4;
  dataset.barThickness = undefined;
  dataset.maxBarThickness = undefined;
  trendLineChart.update("none");
}

function updateDonutChart(existingChart, canvasEl, percent, color, tooltipLines = null) {
  if (!canvasEl) return existingChart;
  const value = Math.max(0, Math.min(percent || 0, 100));
  const data = {
    labels: ["value", "rest"],
    datasets: [
      {
        data: [value, 100 - value],
        backgroundColor: [color, "#f3f4f6"],
        borderWidth: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: !!tooltipLines,
        filter: (item) => item.dataIndex === 0,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#111827",
        bodyColor: "#374151",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        displayColors: false,
        bodyFont: { family: "'Kanit', sans-serif", size: 12 },
        callbacks: {
          label: () => tooltipLines || []
        }
      },
      centerText: {
        text: `${value.toFixed(1)}%`,
        subText: "",
        color: "#111827",
        fontFamily: "Kanit",
        fontSize: 20,
        subFontSize: 11
      }
    }
  };

  if (existingChart) {
    existingChart.data = data;
    existingChart.options = options;
    existingChart.update("none");
    return existingChart;
  }

  return new Chart(canvasEl.getContext("2d"), {
    type: "doughnut",
    data,
    options
  });
}

function initDashboardBudgetComparisonToggle() {
  const root = document.querySelector('.page-view[data-page="dashboard-staff"]');
  if (!root || root.dataset.dashboardBudgetToggleReady === "true") return;
  const btns = Array.from(root.querySelectorAll("[data-dashboard-budget-view]"));
  const panels = Array.from(root.querySelectorAll("[data-dashboard-budget-panel]"));
  const monthlyCaptionEl = root.querySelector("#kpiMonthlyCaption");
  const orgCaptionEl = root.querySelector("#projectBudgetComparisonCaptionStaff");
  const summaryCaptionEl = root.querySelector("#dashboardBudgetComparisonCaption");
  if (!btns.length || !panels.length) return;

  const setView = (view) => {
    const nextView = view === "org" ? "org" : "monthly";
    btns.forEach((btn) => {
      const isActive = btn.dataset.dashboardBudgetView === nextView;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.dashboardBudgetPanel !== nextView;
    });
    if (monthlyCaptionEl) monthlyCaptionEl.hidden = nextView !== "monthly";
    if (orgCaptionEl) orgCaptionEl.hidden = nextView !== "org";
    if (summaryCaptionEl) {
      summaryCaptionEl.textContent = nextView === "org"
        ? "เปรียบเทียบงบที่อนุมัติและใช้จริงตามองค์กร"
        : "เปรียบเทียบงบที่อนุมัติและใช้จริงตามเดือน";
    }
    window.requestAnimationFrame(() => {
      if (nextView === "org") {
        if (typeof setActiveProjectStatusContext === "function") {
          setActiveProjectStatusContext("staff");
        }
        if (
          typeof updateProjectBudgetComparisonChart === "function" &&
          typeof getVisibleProjectsForContext === "function"
        ) {
          updateProjectBudgetComparisonChart(getVisibleProjectsForContext("staff"));
        }
        projectBudgetComparisonChart?.resize?.();
        projectBudgetComparisonChart?.update?.("none");
      } else {
        homeKpiChart?.resize?.();
      }
      window.setTimeout(() => window.sgcuScheduleVisibleChartsRefresh?.("dashboard-staff"), 80);
    });
  };

  btns.forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.dashboardBudgetView));
  });
  root.dataset.dashboardBudgetToggleReady = "true";
  setView("monthly");
}

function renderHomeHeatmap(sourceProjects = projects, container = homeHeatmapEl, monthsRow = homeHeatmapMonthsEl) {
  if (!container || !monthsRow) return;

  container.innerHTML = "";
  monthsRow.innerHTML = "";
  if (!sourceProjects || !sourceProjects.length) return;

  const today = new Date();
  const selectedYearBE = Number(selectedProjectSourceYear);
  const currentMonth = today.getMonth();
  const startYear = Number.isFinite(selectedYearBE) && selectedYearBE >= 2400
    ? selectedYearBE - 543
    : currentMonth >= 5
      ? today.getFullYear()
      : today.getFullYear() - 1;
  const endYear = startYear + 1;
  const monthNames = ["มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค."];

  const eventsByDate = {};
  let maxCount = 0;
  sourceProjects
    .filter((p) => (p.statusMain || "").trim() !== "ยกเลิกโครงการ")
    .forEach((p) => {
      let date = p.lastWorkDateObj;
      if (!date) {
        date = parseProjectDate(p.lastWorkDate);
        if (date) p.lastWorkDateObj = date;
      }
      if (!date || date < new Date(startYear, 5, 1) || date > new Date(endYear, 4, 31)) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (!eventsByDate[key]) eventsByDate[key] = [];
      eventsByDate[key].push({
        title: p.name || "(ไม่ระบุชื่อโครงการ)",
        code: p.code || "-",
        start: date,
        org: p.orgName || "(ไม่ระบุฝ่าย/ชมรม)",
        status: mapProjectStatusToCalendarStatus(p),
        note: `รหัสโครงการ: ${p.code || "-"}`,
        budgetSource: p.fundSource || "-",
        year: p.year || "-"
      });
    });

  const yearStart = new Date(startYear, 5, 1);
  const yearEnd = new Date(endYear, 4, 31);
  const startOfGrid = new Date(yearStart);
  startOfGrid.setDate(yearStart.getDate() - yearStart.getDay());
  const endOfGrid = new Date(yearEnd);
  endOfGrid.setDate(yearEnd.getDate() + (6 - yearEnd.getDay()));

  for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const count = (eventsByDate[key] || []).length;
    if (count > maxCount) maxCount = count;
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.ceil((endOfGrid - startOfGrid + 24 * 60 * 60 * 1000) / weekMs);
  const monthLabelPositions = {};
  for (let i = 0; i < 12; i++) {
    const month = (i + 5) % 12;
    const labelYear = month >= 5 ? startYear : endYear;
    const firstOfMonth = new Date(labelYear, month, 1);
    const diffWeeks = Math.floor((firstOfMonth - startOfGrid) / weekMs);
    if (diffWeeks >= 0 && diffWeeks < totalWeeks) {
      monthLabelPositions[diffWeeks] = monthNames[i];
    }
  }

  for (let week = 0; week < totalWeeks; week++) {
    const label = document.createElement("span");
    label.textContent = monthLabelPositions[week] || "";
    monthsRow.appendChild(label);
  }

  for (let week = 0; week < totalWeeks; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(startOfGrid);
      date.setDate(startOfGrid.getDate() + week * 7 + day);
      const isInYear = date >= yearStart && date <= yearEnd;

      const cell = document.createElement("div");
      cell.className = "heatmap-cell";

      if (!isInYear) {
        cell.classList.add("heatmap-cell-empty");
        container.appendChild(cell);
        continue;
      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const events = eventsByDate[key] || [];
      const count = events.length;
      const level = getHeatmapLevel(count, maxCount);
      cell.classList.add(`heat-${level}`);

      if (date.toDateString() === today.toDateString()) {
        cell.classList.add("heatmap-cell-today");
      }
      if (count > 0) {
        cell.classList.add("has-events");
        cell.title = `${date.toLocaleDateString("th-TH")} — ${count} โครงการ`;
        cell.addEventListener("click", () => {
          openCalendarDayModal(date, events);
        });
      } else {
        cell.title = date.toLocaleDateString("th-TH");
      }

      container.appendChild(cell);
    }
  }
}

function renderHomeKpis(sourceProjects = projects) {
  initDashboardBudgetComparisonToggle();
  const data = Array.isArray(sourceProjects) ? sourceProjects : projects;
  if (!data || !data.length) return;

  const closedProjects = data.filter(isProjectClosed);

  const onTimeProjects = closedProjects.filter((p) => {
    const dur = getCloseDurationDays(p);
    if (dur !== null) {
      return dur <= 14; // ระยะเวลาปิดโครงการ (คอลัมน์ AZ) ไม่เกิน 14 วันถือว่าตรงเวลา
    }

    // fallback ถ้าไม่มีค่า duration ใช้ lastWorkDate เทียบ closeDueDate
    let due = p.closeDueDateObj;
    if (!due) {
      due = parseProjectDate(p.closeDueDate);
      if (due) p.closeDueDateObj = due;
    }
    let last = p.lastWorkDateObj;
    if (!last) {
      last = parseProjectDate(p.lastWorkDate);
      if (last) p.lastWorkDateObj = last;
    }
    if (!due || !last) return false;
    return last.getTime() <= due.getTime();
  });
  const onTimeCount = onTimeProjects.length;

  const onTimePercent = closedProjects.length
    ? (onTimeCount / closedProjects.length) * 100
    : 0;

  if (kpiOnTimeEl) {
    kpiOnTimeEl.textContent = `${onTimePercent.toFixed(1)}%`;
  }
  if (kpiOnTimeCaptionEl) {
    kpiOnTimeCaptionEl.textContent = closedProjects.length
      ? `${onTimeCount} จาก ${closedProjects.length} โครงการปิดภายใน 14 วัน`
      : "ยังไม่มีโครงการที่ปิดแล้ว";
  }
  if (kpiOnTimeBarEl) {
    kpiOnTimeBarEl.style.width = `${Math.min(onTimePercent, 100)}%`;
  }
  if (kpiOnTimeDonutCanvas) {
    kpiOnTimeDonutChart = updateDonutChart(
      kpiOnTimeDonutChart,
      kpiOnTimeDonutCanvas,
      onTimePercent,
      "#ec4899",
      getDonutTooltipLines(onTimeProjects)
    );
  }
  if (kpiOnTimeStaffEl) {
    kpiOnTimeStaffEl.textContent = `${onTimePercent.toFixed(1)}%`;
  }
  if (kpiOnTimeCaptionStaffEl) {
    kpiOnTimeCaptionStaffEl.textContent = closedProjects.length
      ? `${onTimeCount} จาก ${closedProjects.length} โครงการปิดภายใน 14 วัน`
      : "ยังไม่มีโครงการที่ปิดแล้ว";
  }

  const totalApproved = data.reduce(
    (sum, p) => sum + (p.approvedBudget100 ?? p.budget ?? 0),
    0
  );
  const totalActual = data.reduce(
    (sum, p) => sum + (p.actualBudget ?? 0),
    0
  );

  const usagePercent = totalApproved ? (totalActual / totalApproved) * 100 : 0;

  if (kpiBudgetUsageEl) {
    kpiBudgetUsageEl.textContent = `${usagePercent.toFixed(1)}%`;
  }
  if (kpiBudgetUsageCaptionEl) {
    kpiBudgetUsageCaptionEl.textContent =
      `${formatMoney(totalActual)} จาก ${formatMoney(totalApproved)} บาท`;
  }
  if (kpiBudgetUsageBarEl) {
    kpiBudgetUsageBarEl.style.width = `${Math.min(usagePercent, 100)}%`;
  }
  if (kpiBudgetUsageDonutCanvas) {
    kpiBudgetUsageDonutChart = updateDonutChart(
      kpiBudgetUsageDonutChart,
      kpiBudgetUsageDonutCanvas,
      usagePercent,
      "#f472b6",
      getDonutTooltipLines(data, "actualBudget")
    );
  }
  if (kpiBudgetUsageStaffEl) {
    kpiBudgetUsageStaffEl.textContent = `${usagePercent.toFixed(1)}%`;
  }
  if (kpiBudgetUsageCaptionStaffEl) {
    kpiBudgetUsageCaptionStaffEl.textContent =
      `${formatMoney(totalActual)} จาก ${formatMoney(totalApproved)} บาท`;
  }

  if (kpiClosedProjectsEl) {
    kpiClosedProjectsEl.textContent = closedProjects.length.toLocaleString("th-TH");
  }
  if (kpiClosedProjectsCaptionEl) {
    kpiClosedProjectsCaptionEl.textContent =
      `จาก ${data.length.toLocaleString("th-TH")} โครงการทั้งหมด`;
  }
  if (kpiClosedProjectsBarEl) {
    const closedPercent = data.length ? (closedProjects.length / data.length) * 100 : 0;
    kpiClosedProjectsBarEl.style.width = `${Math.min(closedPercent, 100)}%`;
  }
  if (kpiClosedProjectsStaffEl) {
    kpiClosedProjectsStaffEl.textContent = closedProjects.length.toLocaleString("th-TH");
  }
  if (kpiClosedProjectsCaptionStaffEl) {
    kpiClosedProjectsCaptionStaffEl.textContent =
      `จาก ${data.length.toLocaleString("th-TH")} โครงการทั้งหมด`;
  }

  const monthly = new Map();
  data.forEach((p) => {
    if (isProjectTerminalWithoutClosure(p)) return;
    let d = p.lastWorkDateObj;
    if (!d) {
      d = parseProjectDate(p.lastWorkDate);
      if (d) p.lastWorkDateObj = d;
    }
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthly.has(key)) {
      monthly.set(key, { date: d, approved: 0, actual: 0, projectCount: 0, pendingCloseCount: 0 });
    }
    const bucket = monthly.get(key);
    bucket.approved += p.approvedBudget100 ?? p.budget ?? 0;
    bucket.actual += p.actualBudget ?? 0;
    bucket.projectCount += 1;
    if (!isProjectClosed(p)) {
      bucket.pendingCloseCount += 1;
    }
  });

  const monthNamesShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const entries = Array.from(monthly.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const labels = entries.map(([, bucket]) => {
    const m = bucket.date.getMonth();
    const y = bucket.date.getFullYear().toString().slice(-2);
    return `${monthNamesShort[m]} ${y}`;
  });
  const approvedData = entries.map(([, bucket]) => Math.round(bucket.approved));
  const actualData = entries.map(([, bucket]) => Math.round(bucket.actual));
  const actualBudgetStatuses = entries.map(([, bucket]) => {
    const pendingCloseCount = bucket.pendingCloseCount || 0;
    return {
      isFinalized: pendingCloseCount <= 0,
      pendingCloseCount,
      projectCount: bucket.projectCount || 0
    };
  });
  const actualBackgroundColors = actualBudgetStatuses.map((status) =>
    status.isFinalized ? "rgba(34, 197, 94, 0.18)" : "rgba(245, 158, 11, 0.22)"
  );
  const actualBorderColors = actualBudgetStatuses.map((status) =>
    status.isFinalized ? "#22c55e" : "#f59e0b"
  );

  if (kpiMonthlyCaptionEl) {
    kpiMonthlyCaptionEl.textContent = labels.length ? "" : "ยังไม่มีวันที่สิ้นสุดการปฏิบัติงานของโครงการ";
  }
  renderHomeHeatmap(data, homeHeatmapEl, homeHeatmapMonthsEl);

  if (!labels.length) {
    if (homeKpiChart) {
      homeKpiChart.destroy();
      homeKpiChart = null;
    }
    return;
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: "งบอนุมัติ",
        data: approvedData,
        backgroundColor: "rgba(236, 72, 153, 0.18)",
        borderColor: "#ec4899",
        borderWidth: 1.5,
        borderRadius: 8
      },
      {
        label: "ใช้จริง",
        data: actualData,
        backgroundColor: actualBackgroundColors,
        borderColor: actualBorderColors,
        borderWidth: 1.5,
        borderRadius: 8
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        afterFit(scale) {
          scale.height = Math.max(scale.height || 0, 44);
        },
        ticks: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatMoney(value)
        }
      }
    },
    plugins: {
      legend: { position: "bottom" },
      externalAxisLabels: {
        x: {
          enabled: true,
          height: 38,
          gap: 6,
          className: "chart-external-axis-month chart-external-axis-month-compact",
          formatter: (label) => formatMonthAxisLabel(label)
        }
      },
      tooltip: {
        displayColors: false,
        yAlign: "bottom",
        caretPadding: 10,
        bodySpacing: 4,
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label || "";
            const val = ctx.parsed.y || 0;
            return `${label}: ${formatMoney(val)} บาท`;
          },
          afterLabel: (ctx) => {
            if (ctx.dataset.label !== "ใช้จริง") return "";
            const status = actualBudgetStatuses[ctx.dataIndex];
            if (!status) return "";
            if (status.isFinalized) return "สถานะ: สรุปงบครบแล้ว";
            return [
              "สถานะ: ยังรอปิด/สรุปงบ",
              `${status.pendingCloseCount} จาก ${status.projectCount} โครงการ`
            ];
          }
        }
      }
    }
  };

  if (homeKpiChart) {
    homeKpiChart.data = chartData;
    homeKpiChart.options = options;
    homeKpiChart.update("none");
  } else {
    const ctx = document.getElementById("homeKpiChart");
    if (!ctx) return;
    homeKpiChart = new Chart(ctx, {
      type: "bar",
      data: chartData,
      options
    });
  }
}

function statusMainToBadgeClass(statusMain) {
  const s = (statusMain || "").trim();

  const approvedStatuses = ["อนุมัติโครงการ"];
  const rejectedStatuses = [
    "ไม่รับรองจากที่ประชุมนายก",
    "สภาไม่รับหลักการ",
    "ไม่ผ่านกมธ.วิสามัญ",
    "สภาไม่อนุมัติงบ",
    "ไม่ผ่านสภาใหญ่",
    "ยกเลิกโครงการ"
  ];
  const pendingStatuses = [
    PROJECT_PENDING_APPROVAL_STATUS,
    "ส่งขออนุมัติกิจการนิสิต",
    "ผ่านที่ประชุมนายกหรืออนุกรรมการ",
    "ผ่านสภารับหลักการ",
    "ผ่านกมธ.วิสามัญ",
    "ผ่านสภาอนุมัติงบ",
    "ผ่านสภาใหญ่",
    "รอแก้ไข"
  ];

  if (approvedStatuses.includes(s)) return "badge badge-approved";
  if (rejectedStatuses.includes(s)) return "badge badge-rejected";
  if (pendingStatuses.includes(s)) return "badge badge-pending";
  return "badge badge-draft";
}

function statusCloseToBadgeClass(statusClose) {
  const s = (statusClose || "").trim();

  if (s.includes("ผ่านเหรัญญิก") || s.includes("รอส่งกิจการนิสิต")) {
    return "badge badge-approved";
  }
  if (s.includes("ผ่านผู้ช่วยเหรัญญิก") || s.includes("เหรัญญิกตรวจสอบ")) {
    return "badge badge-warning";
  }
  return "badge badge-rejected";
}

function getDonutTooltipLines(projectsList, valueKey = null) {
  const groups = {};
  let total = 0;
  projectsList.forEach((p) => {
    const name = (p.orgGroup || "(ไม่ระบุ)").trim();
    const val = valueKey ? (p[valueKey] || 0) : 1;
    groups[name] = (groups[name] || 0) + val;
    total += val;
  });

  const sorted = Object.entries(groups)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const top = sorted.slice(0, 5);
  const lines = top.map(([n, v]) => {
    const vStr = valueKey ? formatMoney(v) : v.toLocaleString();
    const unit = valueKey ? " บาท" : " โครงการ";
    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0.0";
    return `• ${n}: ${vStr}${unit} (${pct}%)`;
  });

  if (sorted.length > 5) {
    lines.push(`...และอีก ${sorted.length - 5} กลุ่ม`);
  }
  return lines;
}

/**
 * ใช้เฉพาะ "รายการโครงการ" ตาม logic:
 * if (วันนี้ยังไม่เลยกำหนด) → ใช้ H + สีตามเดิม
 * else (วันนี้เลยกำหนด)
 *   if (AR = "ส่งกิจการนิสิตเรียบร้อย" && AS != "รอปิดโครงการ")
 *      → ใช้ AS (เขียว)
 *   else → ใช้ AR (ส้ม)
 */
function getDisplayStatusForList(project) {
  const baseStatus = (project.statusMain || "").trim();           // H
  const statusAR = (project.statusClose || "").trim();            // AR
  const statusAS = (project.statusCloseDecree || "").trim();      // AS
  const d = typeof project.daysToDeadline === "number" && !isNaN(project.daysToDeadline)
    ? project.daysToDeadline
    : null;

  // ถ้ายังไม่เลยกำหนด (หรือไม่มีข้อมูลวัน) → ใช้ H และสีตามเดิม
  if (d === null || d >= 0) {
    if (!baseStatus) {
      return {
        text: PROJECT_PENDING_APPROVAL_STATUS,
        badgeClass: statusMainToBadgeClass(PROJECT_PENDING_APPROVAL_STATUS)
      };
    }
    return {
      text: baseStatus,
      badgeClass: statusMainToBadgeClass(baseStatus)
    };
  }

  // วันนี้เลยกำหนดแล้ว
  if (statusAR === "ส่งกิจการนิสิตเรียบร้อย" && statusAS !== "รอปิดโครงการ" && statusAS) {
    // ใช้ AS สีเขียว
    return {
      text: statusAS,
      badgeClass: "badge badge-approved"
    };
  }

  if (statusAR) {
    // ใช้ AR สีส้ม
    return {
      text: statusAR,
      badgeClass: "badge badge-pending"
    };
  }

  // fallback ถ้า AR/AS ว่าง ให้กลับไปใช้ H
  return {
    text: baseStatus || PROJECT_PENDING_APPROVAL_STATUS,
    badgeClass: statusMainToBadgeClass(baseStatus || PROJECT_PENDING_APPROVAL_STATUS)
  };
}

function updateTable(filteredProjects) {
  const tbody = tableBodyEl;
  if (!tbody) return;

  let html = "";
  filteredProjects.forEach((p, idx) => {
    const budgetVal = p.budget || 0;
    let budgetColor = "";
    if (budgetVal >= 1000000) {
      budgetColor = "color:#facc15; font-weight:700;";
    } else if (budgetVal >= 500000) {
      budgetColor = "color:#a855f7; font-weight:600;";
    } else if (budgetVal >= 100000) {
      budgetColor = "color:#3b82f6; font-weight:600;";
    } else {
      budgetColor = "color:inherit;";
    }

    const budgetText = formatMoney(budgetVal);
    const displayStatus = getDisplayStatusForList(p);
    const statusBadge = `<span class="${displayStatus.badgeClass}">${displayStatus.text || "-"}</span>`;
    const orgName = (p.orgName || "").trim();
    const orgMarkup = orgName ? `<div class="project-org">${orgName}</div>` : "";

    html += `
      <tr class="project-row" data-project-idx="${idx}">
        <td class="col-code">${p.code || ""}</td>
        <td class="col-name">
          <div class="project-name">${p.name || ""}</div>
          ${orgMarkup}
        </td>
        <td class="col-status">${statusBadge}</td>
        <td class="col-budget" style="${budgetColor}">${budgetText}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  lastTableProjects = filteredProjects;

  if (!tbody.dataset.boundClick) {
    tbody.addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-project-idx]");
      if (!row || !tbody.contains(row)) return;
      const idx = Number(row.dataset.projectIdx);
      const project = lastTableProjects[idx];
      if (project) openProjectModal(project);
    });
    tbody.dataset.boundClick = "true";
  }
}

function formatDaysToDeadline(days) {
  if (days === null || days === undefined || isNaN(days)) return "-";
  if (days > 0) return `เหลืออีก ${days} วันก่อนครบกำหนดปิดโครงการ`;
  if (days === 0) return `ครบกำหนดปิดโครงการวันนี้`;
  return `เกินกำหนดปิดโครงการมาแล้ว ${Math.abs(days)} วัน`;
}
