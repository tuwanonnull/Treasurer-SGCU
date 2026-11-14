/* Charts: status summary + trends (Chart.js) */
const projectBudgetValueLabelsPlugin = {
  id: "projectBudgetValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = "500 11px 'Kanit', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    [0, 1].forEach((datasetIndex) => {
      if (!chart.isDatasetVisible(datasetIndex)) return;
      ctx.fillStyle = document.documentElement.dataset.theme === "dark"
        ? (datasetIndex === 0 ? "#f9a8d4" : "#91e3b5")
        : (datasetIndex === 0 ? "#9d174d" : "#047857");
      chart.getDatasetMeta(datasetIndex).data.forEach((bar, index) => {
        const value = Number(chart.data.datasets[datasetIndex].data[index]);
        if (!Number.isFinite(value)) return;
        const mobile = window.matchMedia("(max-width: 720px)").matches;
        const label = mobile
          ? new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(value)
          : `${formatMoney(value)} บาท`;
        const x = Math.max(chartArea.left, Math.min(bar.x + 7, chart.width - ctx.measureText(label).width - 4));
        ctx.fillText(label, x, bar.y);
      });
    });
    ctx.restore();
  }
};

const projectBudgetFixedAxisPlugin = {
  id: "projectBudgetFixedAxis",
  beforeDestroy(chart) {
    const panel = chart.canvas?.closest(".project-budget-comparison-panel");
    panel?.querySelector(".project-budget-comparison-axis")?.replaceChildren();
    panel?.querySelector(".project-budget-comparison-legend")?.replaceChildren();
  },
  afterDraw(chart) {
    const panel = chart.canvas?.closest(".project-budget-comparison-panel");
    if (!panel) return;
    const axis = panel.querySelector(".project-budget-comparison-axis");
    const legend = panel.querySelector(".project-budget-comparison-legend");
    const scale = chart.scales.x;
    if (axis && scale) {
      axis.replaceChildren();
      axis.style.width = `${chart.width}px`;
      scale.ticks.forEach((tick) => {
        const label = document.createElement("span");
        const value = Number(tick.value);
        label.textContent = formatProjectMoneyAxisTick(value, scale);
        label.style.left = `${scale.getPixelForValue(tick.value)}px`;
        axis.appendChild(label);
      });
    }
    if (legend && !legend.childElementCount) {
      chart.data.datasets.forEach((dataset, index) => {
        const button = document.createElement("button");
        button.type = "button";
        const swatch = document.createElement("i");
        swatch.style.backgroundColor = dataset.backgroundColor;
        button.append(swatch, document.createTextNode(dataset.label));
        button.addEventListener("click", () => {
          toggleDashboardChartSeries(chart, index);
        });
        legend.appendChild(button);
      });
    }
    legend?.querySelectorAll("button").forEach((button, index) => {
      button.setAttribute("aria-pressed", String(chart.isDatasetVisible(index)));
    });
  }
};

function wrapChartAxisLabel(label, maxChars = 22, maxLines = 3) {
  const text = (label || "").toString().replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const words =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? text
          .split(/(\s+)/)
          .flatMap((part) => {
            if (!part) return [];
            if (/^\s+$/.test(part)) return [" "];
            return Array.from(new Intl.Segmenter("th", { granularity: "word" }).segment(part))
              .map((segment) => segment.segment)
              .filter(Boolean);
          })
      : text.split(/(\s+)/).filter(Boolean);
  const lines = [];
  let current = "";

  const pushCurrent = () => {
    if (current) {
      lines.push(current.trim());
      current = "";
    }
  };

  words.forEach((word) => {
    if (!word) return;
    if (/^\s+$/.test(word)) {
      if (current && !current.endsWith(" ")) current += " ";
      return;
    }
    if (word.length > maxChars) {
      pushCurrent();
      lines.push(word);
      return;
    }
    const next = current ? `${current}${word}` : word;
    if (next.length > maxChars) {
      pushCurrent();
      current = word;
    } else {
      current = next;
    }
  });

  pushCurrent();
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  const last = visible[visible.length - 1] || "";
  visible[visible.length - 1] =
    last.length >= maxChars * 1.5 ? `${last.slice(0, Math.max(1, maxChars - 1))}…` : `${last}…`;
  return visible;
}

function getClosureAxisWrappedLabel(label) {
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  return wrapChartAxisLabel(label, isMobile ? 22 : 30, isMobile ? 3 : 2);
}

function getWrappedLineCount(wrappedLabel) {
  return Array.isArray(wrappedLabel) ? wrappedLabel.length : 1;
}

function initCharts(ctxKey = activeProjectStatusContext) {
  setActiveProjectStatusContext(ctxKey);
  const ctx = projectStatusContexts[ctxKey];
  if (!ctx) return;

  const budgetCanvas = ctx.budgetChartCanvas;
  const statusCanvas = ctx.statusPieCanvas;
  const trendCanvas = ctx.trendLineCanvas;
  const projectBudgetComparisonCanvas = ctx.projectBudgetComparisonCanvas;
  if (!budgetCanvas && !statusCanvas && !trendCanvas && !projectBudgetComparisonCanvas) return;

  if (ctx.budgetByMonthChart) {
    ctx.budgetByMonthChart.destroy();
    ctx.budgetByMonthChart = null;
  }
  if (ctx.statusPieChart) {
    ctx.statusPieChart.destroy();
    ctx.statusPieChart = null;
  }
  if (ctx.trendLineChart) {
    ctx.trendLineChart.destroy();
    ctx.trendLineChart = null;
  }
  if (ctx.projectBudgetComparisonChart) {
    ctx.projectBudgetComparisonChart.destroy();
    ctx.projectBudgetComparisonChart = null;
    projectBudgetComparisonChart = null;
  }

  const budgetCtx = budgetCanvas ? budgetCanvas.getContext("2d") : null;
  const statusCtx = statusCanvas ? statusCanvas.getContext("2d") : null;
  const trendCtx = trendCanvas ? trendCanvas.getContext("2d") : null;
  const projectBudgetComparisonCtx = projectBudgetComparisonCanvas
    ? projectBudgetComparisonCanvas.getContext("2d")
    : null;
  const isMobileChart = window.matchMedia("(max-width: 720px)").matches;
  const closureYAxisWidth = isMobileChart ? 118 : 170;
  const makeStackDataset = (label, backgroundColor, datasetIndex) => ({
    label,
    data: [],
    backgroundColor,
    stack: "status",
    borderSkipped: false,
    pointStyle: "rectRounded",
    borderRadius(ctx) {
      const i = ctx.dataIndex;
      const chart = ctx.chart;
      const ds = ctx.chart.data.datasets;
      const curr = ds[datasetIndex]?.data?.[i] || 0;
      const hasRightSegment = ds
        .some((s, idx) => idx > datasetIndex && chart.isDatasetVisible(idx) && (s?.data?.[i] || 0) > 0);
      const isRight = curr > 0 && !hasRightSegment;
      return {
        topLeft: 0,
        bottomLeft: 0,
        topRight: isRight ? 10 : 0,
        bottomRight: isRight ? 10 : 0
      };
    }
  });

  if (budgetCtx) {
    budgetByMonthChart = new Chart(budgetCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          makeStackDataset(PROJECT_PENDING_APPROVAL_STATUS, "#d1d5db", 0),
          makeStackDataset("ไม่อนุมัติ / ไม่ผ่าน", "#be123c", 1),
          makeStackDataset("โครงการที่อนุมัติแล้ว", "#fbbf24", 2),
          makeStackDataset("โครงการที่วันเลยจัดแล้ว", "#f97316", 3),
          makeStackDataset("โครงการที่เลยกำหนดส่งปิดแล้ว", "#ef4444", 4),
          makeStackDataset("ปิดโครงการแล้ว (ส่วน อบจ.)", "#86efac", 5),
          makeStackDataset("ปิดโครงการสมบูรณ์", "#22c55e", 6),
          makeStackDataset("ยกเลิกโครงการ", "#6b7280", 7),
          makeStackDataset("ไม่ส่งปิดโครงการ", "#111827", 8)
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: "bottom",
            onClick(e, legendItem, legend) {
              Chart.defaults.plugins.legend.onClick.call(this, e, legendItem, legend);
              updateClosureXAxisMax(legend.chart);
              legend.chart.update();
            },
            labels: {
              filter(legendItem, chartData) {
                const dataset = chartData.datasets?.[legendItem.datasetIndex];
                return (dataset?.data || []).some((value) => Number(value) > 0);
              },
              font: { size: 11 },
              usePointStyle: true,
              boxWidth: 10,
              boxHeight: 10
            }
          },
          tooltip: { enabled: true },
          externalAxisLabels: {
            y: {
              enabled: true,
              width: closureYAxisWidth,
              gap: 8,
              formatter: (label) => getClosureAxisWrappedLabel(label)
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: { precision: 0, maxTicksLimit: 6, maxRotation: 0, minRotation: 0 }
          },
          y: {
            stacked: true,
            afterFit(scale) {
              scale.width = closureYAxisWidth;
            },
            ticks: {
              display: false,
              autoSkip: false,
              padding: 6,
              callback(value) {
                return getClosureAxisWrappedLabel(this.getLabelForValue(value));
              }
            }
          }
        }
      }
    });
  }

  if (statusCtx) {
    statusPieChart = new Chart(statusCtx, {
      type: "doughnut",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [
              "#f9a8d4",
              "#bfdbfe",
              "#bbf7d0",
              "#fed7aa",
              "#fecaca",
              "#ddd6fe",
              "#fef3c7"
            ],
            borderColor: "#ffffff",
            borderWidth: 1,
            pointStyle: "circle"
          }
        ]
      },
      options: {
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
          centerText: {
            text: "0",
            subText: "งบอนุมัติรวม (บาท)",
            color: "#111827",
            fontSize: 22,
            subFontSize: 11,
            fontFamily: "Kanit"
          },
          tooltip: {
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
              title: () => [],
              label: (ctx) => {
                const label = ctx.label || "";
                const value = ctx.parsed || 0;
                const dataset = ctx.dataset;
                const total = dataset.data.reduce((a, b) => a + b, 0);
                const percent = total > 0 ? (value / total) * 100 : 0;
                const percentText = percent.toFixed(1);
                return [
                  `• ${label}`,
                  `  งบอนุมัติ: ${formatMoney(value)} บาท (${percentText}%)`
                ];
              }
            }
          }
        },
        cutout: "65%"
      }
    });
  }

  if (trendCtx) {
    trendLineChart = new Chart(trendCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "โครงการค้างปิด",
            data: [],
            borderColor: "#ec4899",
            backgroundColor: "rgba(236, 72, 153, 0.18)",
            pointBackgroundColor: "#ec4899",
            pointRadius: 3,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          externalAxisLabels: {
            x: {
              enabled: true,
              height: 46,
              gap: 6,
              alignEdges: true,
              className: "chart-external-axis-month",
              formatter: (label) => formatMonthAxisLabel(label)
            }
          }
        },
        scales: {
          x: {
            afterFit(scale) {
              scale.height = Math.max(scale.height || 0, 54);
            },
            ticks: { display: false, font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 11 } }
          }
        }
      }
    });
  }

  if (projectBudgetComparisonCtx) {
    projectBudgetComparisonChart = new Chart(projectBudgetComparisonCtx, {
      type: "bar",
      plugins: [dashboardSeriesSlotsPlugin, projectBudgetValueLabelsPlugin, projectBudgetFixedAxisPlugin],
      data: {
        labels: [],
        datasets: [
          {
            label: "งบที่อนุมัติ",
            data: [],
            backgroundColor: "#f9a8d4",
            borderSkipped: false,
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 8, bottomRight: 8 },
            barPercentage: 0.78,
            categoryPercentage: 0.72,
            maxBarThickness: 21
          },
          {
            label: "งบที่ใช้จริง",
            data: [],
            backgroundColor: "#34d399",
            borderSkipped: false,
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 8, bottomRight: 8 },
            barPercentage: 0.78,
            categoryPercentage: 0.72,
            maxBarThickness: 21
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { right: isMobileChart ? 62 : 110 } },
        plugins: {
          legend: {
            display: false,
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
              label: (item) => `${item.dataset.label}: ${formatMoney(Number(item.raw || 0))} บาท`,
              afterBody: (items) => {
                const row = projectBudgetComparisonChart?.$projectBudgetRows?.[items?.[0]?.dataIndex || 0];
                if (!row) return [];
                return [
                  `ประเภทองค์กร: ${row.orgGroup || "-"}`,
                  `จำนวนโครงการ: ${Number(row.projectCount || 0).toLocaleString("th-TH")} โครงการ`,
                  `งบอนุมัติ: ${formatMoney(row.approved)} บาท`,
                  `ใช้จริง: ${formatMoney(row.actual)} บาท`,
                  `คงเหลือ: ${formatMoney(row.remaining)} บาท`,
                  `% การใช้รวม: ${row.usagePercentText}`
                ];
              }
            }
          },
          externalAxisLabels: {
            y: {
              enabled: true,
              width: isMobileChart ? 110 : 145,
              gap: 8,
              formatter: (label) => getProjectBudgetAxisWrappedLabel(label)
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              display: false,
              maxTicksLimit: isMobileChart ? 3 : 6,
              font: { size: isMobileChart ? 11 : 12 },
              callback(value) { return formatProjectMoneyAxisTick(value, this); }
            }
          },
          y: {
            afterFit(scale) {
              scale.width = window.matchMedia("(max-width: 720px)").matches ? 110 : 145;
            },
            ticks: {
              display: false,
              autoSkip: false,
              padding: 6,
              callback(value) {
                return getProjectBudgetAxisWrappedLabel(this.getLabelForValue(value));
              }
            }
          }
        }
      }
    });
  }

  syncChartsToContext(ctxKey);
}

function resizeClosureChart(numLabels) {
  const canvas = projectStatusContexts[activeProjectStatusContext]?.budgetChartCanvas;
  if (!canvas) return;
  const container = canvas.parentElement;
  if (!container) return;

  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const labels = budgetByMonthChart?.data?.labels || [];
  const maxWrappedLines = labels.reduce((max, label) => {
    return Math.max(max, getWrappedLineCount(getClosureAxisWrappedLabel(label)));
  }, 1);
  const baseHeight = isMobile ? 340 : 260;
  const perLabel = isMobile
    ? Math.max(34, 20 + maxWrappedLines * 14)
    : Math.max(26, 14 + maxWrappedLines * 13);
  const newHeight = Math.max(baseHeight, numLabels * perLabel);
  container.style.height = newHeight + "px";

  if (budgetByMonthChart) budgetByMonthChart.resize();
}

function getProjectBudgetAxisWrappedLabel(label) {
  // Both charts use identical label widths and browser Thai word wrapping.
  return String(label || "").replace(/\s+/g, " ").trim();
}

function syncDashboardComparisonHeights() {
  const card = document.querySelector(".dashboard-budget-comparison-card");
  if (!card) return;
  const monthly = card.querySelector('[data-dashboard-budget-panel="monthly"]');
  const scroll = card.querySelector(".project-budget-comparison-scroll");
  const inner = card.querySelector(".project-budget-comparison-chart-inner");
  const labels = projectBudgetComparisonChart?.data?.labels || [];
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const maxLines = labels.reduce((max, label) => Math.max(max, getWrappedLineCount(getProjectBudgetAxisWrappedLabel(label))), 1);
  const rowHeight = isMobile ? Math.max(72, 22 + maxLines * 14) : Math.max(76, 16 + maxLines * 13);
  const closureCount = document.getElementById("projectOrgClosureChartStaff")?.closureDetailsState?.rows?.length || 0;
  const visibleRows = Math.max(2, Math.min(6, Math.max(labels.length, closureCount)));
  const contentHeight = Math.max(1, labels.length) * rowHeight;
  const chart = projectBudgetComparisonChart;
  const plotHeight = chart?.chartArea ? chart.chartArea.bottom - chart.chartArea.top : 0;
  const chartChrome = plotHeight > 0 ? Math.max(0, chart.height - plotHeight) : 10;
  const viewportHeight = visibleRows * rowHeight + chartChrome;
  const grid = card.closest(".dashboard-progress-grid");
  const monthlyHeight = isMobile ? Math.min(320, viewportHeight + 32) : viewportHeight + 32;
  grid?.style.setProperty("--dashboard-plot-height", `${viewportHeight + 32}px`);
  grid?.style.setProperty("--dashboard-monthly-plot-height", `${monthlyHeight}px`);
  grid?.style.setProperty("--dashboard-org-row-height", `${rowHeight}px`);
  if (monthly) {
    const canvasArea = monthly.querySelector(".dashboard-budget-monthly-chart");
    if (canvasArea) canvasArea.style.height = `${monthlyHeight}px`;
  }
  if (scroll) {
    scroll.style.height = `${viewportHeight}px`;
    scroll.style.maxHeight = `${viewportHeight}px`;
  }
  if (inner) inner.style.height = `${contentHeight + chartChrome}px`;

}

function resizeProjectBudgetComparisonChart(numLabels) {
  const canvas = projectStatusContexts[activeProjectStatusContext]?.projectBudgetComparisonCanvas;
  if (!canvas) return;
  const container = canvas.parentElement;
  if (!container) return;

  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  const labels = projectBudgetComparisonChart?.data?.labels || [];
  const maxWrappedLines = labels.reduce((max, label) => {
    return Math.max(max, getWrappedLineCount(getProjectBudgetAxisWrappedLabel(label)));
  }, 1);
  const perLabel = isMobile
    ? Math.max(72, 22 + maxWrappedLines * 14)
    : Math.max(76, 16 + maxWrappedLines * 13);
  container.style.height = `${Math.max(120, numLabels * perLabel)}px`;

  if (projectBudgetComparisonChart) {
    projectBudgetComparisonChart.options.layout.padding.right = isMobile ? 62 : 110;
    projectBudgetComparisonChart.options.scales.x.ticks.maxTicksLimit = isMobile ? 3 : 6;
    if (activeProjectStatusContext === "staff") syncDashboardComparisonHeights();
    projectBudgetComparisonChart.resize();
  }
}

function getProjectComparisonApprovedBudget(project) {
  const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value));
  const hasActual = project.hasActualBudget ?? hasValue(project.actualBudget);
  if (hasActual) {
    return (Number(project.actualBudget) || 0) + Math.max(Number(project.remainingBudget) || 0, 0);
  }
  if (project.hasTransferNet ?? hasValue(project.transferNet)) return Number(project.transferNet) || 0;
  return Number(project.approvedBudget100) || 0;
}

function updateProjectBudgetComparisonChart(filtered) {
  const chart = projectBudgetComparisonChart;
  const ctx = projectStatusContexts[activeProjectStatusContext] || {};
  const captionEl = ctx.projectBudgetComparisonCaptionEl;
  if (!chart) return;

  if (!Array.isArray(filtered) || filtered.length === 0) {
    if (activeProjectStatusContext === "staff") {
      setDashboardChartEmptyState("budgetOrgPanelStaff", true, "ไม่มีข้อมูลเปรียบเทียบงบประมาณตามตัวกรอง");
    }
    chart.$projectBudgetRows = [];
    chart.data.labels = [];
    chart.data.datasets.forEach((dataset) => {
      dataset.data = [];
    });
    if (captionEl) captionEl.textContent = "ไม่มีข้อมูลตรงกับตัวกรอง";
    resizeProjectBudgetComparisonChart(1);
    chart.update("none");
    return;
  }

  const createBudgetSummaryRow = (name, orgGroup = "") => ({
    name,
    orgGroup,
    projectCount: 0,
    approved: 0,
    actual: 0,
    remaining: 0,
    over: 0
  });

  const addProjectToBudgetSummary = (row, project) => {
    const actual = Number(project.actualBudget ?? 0) || 0;
    const remainingFromSheet = Number(project.remainingBudget);
    const remaining = Number.isFinite(remainingFromSheet) && remainingFromSheet > 0
      ? Math.max(remainingFromSheet, 0)
      : 0;
    const approved = getProjectComparisonApprovedBudget(project);
    const over = Math.max(actual - approved, 0);
    const orgGroup = (project.orgGroup || "").toString().trim();

    row.projectCount += 1;
    row.approved += approved;
    row.actual += actual;
    row.remaining += remaining;
    row.over += over;
    if (!row.orgGroup && orgGroup) row.orgGroup = orgGroup;
  };

  const orgGroupFilter = orgTypeSelect?.value || "all";
  const orgFilter = orgSelect?.value || "all";
  const isGlobalView = orgGroupFilter === "all" && orgFilter === "all";
  const grouped = new Map();

  const isStaffComparison = activeProjectStatusContext === "staff";
  const comparisonLevel = isStaffComparison ? getStaffProjectTrackingFilters().level : "orgGroup";
  if (isStaffComparison) {
    filtered.forEach((project) => {
      const groupName = String(project.orgGroup || "").trim() || "ไม่ระบุองค์กรใหญ่";
      const orgName = String(project.orgName || "").trim() || "ไม่ระบุฝ่าย / ชมรม";
      const isSuborganization = comparisonLevel === "orgName";
      const key = isSuborganization ? JSON.stringify([groupName, orgName]) : groupName;
      const name = isSuborganization ? `${orgName} · ${groupName}` : groupName;
      if (!grouped.has(key)) grouped.set(key, { ...createBudgetSummaryRow(name, groupName), orgName });
      addProjectToBudgetSummary(grouped.get(key), project);
    });
  } else if (isGlobalView) {
    const baseGroups = getChartOrgGroups();
    baseGroups.forEach((group) => {
      grouped.set(group, createBudgetSummaryRow(group, group));
    });
    (Array.isArray(filtered) ? filtered : []).forEach((project) => {
      const groupName = baseGroups.includes(project.orgGroup) ? project.orgGroup : "";
      if (!groupName) return;
      addProjectToBudgetSummary(grouped.get(groupName), project);
    });
  } else {
    const allowedOrgs = orgFilter === "all" ? getOrgsByGroup(orgGroupFilter) : [orgFilter];
    allowedOrgs.forEach((org) => {
      grouped.set(org, createBudgetSummaryRow(org, orgGroupFilter === "all" ? "" : orgGroupFilter));
    });
    (Array.isArray(filtered) ? filtered : []).forEach((project) => {
      const orgName = (project.orgName || "").toString().trim() || "(ไม่ระบุฝ่าย / ชมรม)";
      if (allowedOrgs.length && !allowedOrgs.includes(orgName)) return;
      if (!grouped.has(orgName)) {
        grouped.set(orgName, createBudgetSummaryRow(orgName, project.orgGroup || ""));
      }
      addProjectToBudgetSummary(grouped.get(orgName), project);
    });
  }

  const rows = Array.from(grouped.values())
    .map((row) => {
      const usagePercent = row.approved > 0 ? (row.actual / row.approved) * 100 : null;
      return {
        ...row,
        usedWithinBudget: Math.min(row.actual, row.approved || row.actual),
        usagePercent,
        usagePercentText: Number.isFinite(usagePercent) ? `${usagePercent.toFixed(2)}%` : "-"
      };
    });

  const visibleRows = rows.sort(isStaffComparison
    ? getProjectStatusOrgComparator(comparisonLevel)
    : (a, b) => b.approved - a.approved || a.name.localeCompare(b.name, "th"));
  if (activeProjectStatusContext === "staff") {
    setDashboardChartEmptyState("budgetOrgPanelStaff", !visibleRows.some((row) => row.projectCount > 0), "ไม่มีข้อมูลเปรียบเทียบงบประมาณตามตัวกรอง");
  }
  chart.$projectBudgetRows = visibleRows;
  chart.data.labels = visibleRows.map((row) => row.name);
  chart.data.datasets[0].data = visibleRows.map((row) => row.approved);
  chart.data.datasets[1].data = visibleRows.map((row) => row.actual);

  const maxValue = Math.max(
    0,
    ...(chart.isDatasetVisible(0) ? visibleRows.map((row) => row.approved) : []),
    ...(chart.isDatasetVisible(1) ? visibleRows.map((row) => row.actual) : [])
  );
  chart.options.scales.x.suggestedMax = maxValue > 0 ? maxValue * 1.08 : 1;

  if (captionEl) {
    captionEl.textContent = isStaffComparison
      ? `${comparisonLevel === "orgName" ? "ฝ่าย / ชมรม" : "องค์กรใหญ่"}ตามตัวกรอง · หน่วยบาท · ลำดับเดียวกับหน้าสถานะโครงการ`
      : "";
  }

  resizeProjectBudgetComparisonChart(visibleRows.length || 1);
  chart.update("none");
}

function getNiceProjectCountAxisMax(maxTotal) {
  if (!Number.isFinite(maxTotal) || maxTotal <= 0) return 4;
  if (maxTotal <= 4) return 4;
  const padded = maxTotal * 1.1;
  let step = 1;
  if (padded > 500) step = 100;
  else if (padded > 250) step = 50;
  else if (padded > 100) step = 25;
  else if (padded > 50) step = 10;
  else if (padded > 20) step = 5;
  else if (padded > 10) step = 2;
  return Math.max(4, Math.ceil(padded / step) * step);
}

function updateClosureXAxisMax(chart = budgetByMonthChart) {
  if (!chart) return;
  const labelCount = chart.data.labels?.length || 0;
  const totals = Array.from({ length: labelCount }, (_, i) =>
    chart.data.datasets.reduce((sum, dataset, datasetIndex) => {
      if (!chart.isDatasetVisible(datasetIndex)) return sum;
      return sum + (Number(dataset.data?.[i]) || 0);
    }, 0)
  );
  const maxTotal = totals.length ? Math.max(...totals) : 0;
  const axisMax = getNiceProjectCountAxisMax(maxTotal);
  const targetStep = axisMax / 4;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map(value => value * magnitude)
    .find(value => value >= targetStep));
  chart.options.scales.x.max = Math.ceil(axisMax / step) * step;
  chart.options.scales.x.ticks.stepSize = step;
}

function getProjectStatusOrgComparator(level = "orgGroup") {
  const groups = getChartOrgGroups();
  const groupRanks = new Map(groups.map((name, index) => [name, index]));
  const orgRanks = new Map(groups.map((group) => [group, new Map(getOrgsByGroup(group).map((name, index) => [name, index]))]));
  return (a, b) => {
    const groupA = a.orgGroup || a.name;
    const groupB = b.orgGroup || b.name;
    const groupOrder = (groupRanks.get(groupA) ?? Infinity) - (groupRanks.get(groupB) ?? Infinity);
    if (groupOrder) return groupOrder;
    if (groupA !== groupB) return groupB.localeCompare(groupA, "th");
    if (level !== "orgName") return 0;
    const ranks = orgRanks.get(groupA);
    const orgOrder = (ranks?.get(a.orgName) ?? Infinity) - (ranks?.get(b.orgName) ?? Infinity);
    return orgOrder || (a.orgName || a.name).localeCompare(b.orgName || b.name, "th");
  };
}

function getChartOrgGroups() {
  const sortThaiDescending = (list) => list.sort((a, b) => b.localeCompare(a, "th"));
  const yearOrgFilters = typeof getProjectOrgFiltersForYear === "function"
    ? getProjectOrgFiltersForYear()
    : (Array.isArray(orgFilters) ? orgFilters : []);
  if (yearOrgFilters.length) {
    return sortThaiDescending(Array.from(new Set(yearOrgFilters.map((o) => o.group).filter(Boolean))));
  }
  return sortThaiDescending([...DEFAULT_BASE_GROUPS]);
}

function getOrgsByGroup(group) {
  if (!group) return [];
  const yearOrgFilters = typeof getProjectOrgFiltersForYear === "function"
    ? getProjectOrgFiltersForYear()
    : (Array.isArray(orgFilters) ? orgFilters : []);
  if (yearOrgFilters.length) {
    return Array.from(
      new Set(
        yearOrgFilters
          .filter((o) => o.group === group)
          .map((o) => o.name)
          .filter(Boolean)
      )
    );
  }
  return Array.from(
    new Set(
      projects
        .filter((p) => p.orgGroup === group)
        .map((p) => p.orgName)
        .filter(Boolean)
    )
  );
}

function updateClosureStatusChart(filtered) {
  if (!budgetByMonthChart) return;

  const closureTrackedProjects = filtered.filter((p) =>
    ((p.statusMain || "").trim()) !== "" || isProjectNoClose(p) || !isProjectTerminalWithoutClosure(p)
  );

  const isNoCloseSubmission = (p) => isProjectNoClose(p);
  const isRejectedApprovalStatus = (p) => {
    const mainStatus = (p.statusMain || p.approvalStatus || "").toString().trim();
    if (!mainStatus || mainStatus === "ยกเลิกโครงการ") return false;
    return (
      mainStatus.includes("ไม่ผ่าน") ||
      mainStatus.includes("ไม่อนุมัติ") ||
      mainStatus.includes("ไม่รับรอง") ||
      mainStatus.includes("ไม่รับหลักการ")
    );
  };

  const classifyClosureBucket = (p) => {
    const mainStatus = (p.statusMain || "").trim();
    if (isNoCloseSubmission(p)) return "black";
    if (isProjectCancelled(p)) return "gray";
    if (isRejectedApprovalStatus(p)) return "rejected";
    if (mainStatus !== "อนุมัติโครงการ" && mainStatus !== "ยกเลิกโครงการ") {
      return "pending";
    }
    if (isProjectFullyClosed(p)) return "greenDark";
    if (isProjectStudentClosed(p)) return "greenLight";

    const d =
      typeof p.daysToDeadline === "number" && !isNaN(p.daysToDeadline)
        ? p.daysToDeadline
        : null;
    if (d !== null && d < 0) return "red";
    if (d !== null && d >= 0 && d <= 14) return "orange";
    return "yellow";
  };

  const createClosureStats = () => ({
    pending: 0,
    rejected: 0,
    yellow: 0,
    orange: 0,
    red: 0,
    greenLight: 0,
    greenDark: 0,
    gray: 0,
    black: 0
  });

  const addProjectToClosureStats = (stats, project) => {
    const bucket = classifyClosureBucket(project);
    if (Object.prototype.hasOwnProperty.call(stats, bucket)) {
      stats[bucket]++;
    }
  };

  const applyClosureChartData = (labels, statsByLabel) => {
    const pendingData = [];
    const rejectedData = [];
    const yellowData = [];
    const orangeData = [];
    const redData = [];
    const greenLightData = [];
    const greenDarkData = [];
    const grayData = [];
    const blackData = [];

    labels.forEach((label) => {
      const stats = statsByLabel[label] || createClosureStats();
      pendingData.push(stats.pending);
      rejectedData.push(stats.rejected);
      yellowData.push(stats.yellow);
      orangeData.push(stats.orange);
      redData.push(stats.red);
      greenLightData.push(stats.greenLight);
      greenDarkData.push(stats.greenDark);
      grayData.push(stats.gray);
      blackData.push(stats.black);
    });

    budgetByMonthChart.data.labels = labels;
    budgetByMonthChart.data.datasets[0].data = pendingData;
    budgetByMonthChart.data.datasets[1].data = rejectedData;
    budgetByMonthChart.data.datasets[2].data = yellowData;
    budgetByMonthChart.data.datasets[3].data = orangeData;
    budgetByMonthChart.data.datasets[4].data = redData;
    budgetByMonthChart.data.datasets[5].data = greenLightData;
    budgetByMonthChart.data.datasets[6].data = greenDarkData;
    budgetByMonthChart.data.datasets[7].data = grayData;
    budgetByMonthChart.data.datasets[8].data = blackData;

    updateClosureXAxisMax();
    resizeClosureChart(labels.length);
    budgetByMonthChart.update();
  };

  const orgGroupFilter = orgTypeSelect.value;
  const orgFilter = orgSelect.value;
  const isGlobalView = orgGroupFilter === "all" && orgFilter === "all";

  if (isGlobalView) {
    const baseGroups = getChartOrgGroups();

    const statsByGroup = {};
    baseGroups.forEach((g) => {
      statsByGroup[g] = createClosureStats();
    });

    closureTrackedProjects.forEach((p) => {
      const groupName = baseGroups.includes(p.orgGroup) ? p.orgGroup : null;
      if (!groupName) return;
      addProjectToClosureStats(statsByGroup[groupName], p);
    });

    const labels = baseGroups;
    applyClosureChartData(labels, statsByGroup);
    return;
  }

  const allowedOrgs = orgFilter === "all" ? getOrgsByGroup(orgGroupFilter) : [orgFilter];
  const groups = {};
  allowedOrgs.forEach((org) => {
    groups[org] = createClosureStats();
  });

  closureTrackedProjects.forEach((p) => {
    const org = p.orgName || "(ไม่ระบุ)";
    if (allowedOrgs.length && !allowedOrgs.includes(org)) return;
    if (!groups[org]) {
      groups[org] = createClosureStats();
    }
    addProjectToClosureStats(groups[org], p);
  });

  const labels = Object.keys(groups);
  applyClosureChartData(labels, groups);
}

async function downloadClosureStatusChartPng(ctxKey = activeProjectStatusContext) {
  setActiveProjectStatusContext(ctxKey);
  const chart = budgetByMonthChart;
  const sourceCanvas = chart?.canvas;
  if (!chart || !sourceCanvas) return;

  const yearValue = (yearSelect?.value || selectedProjectSourceYear || "all").toString().trim() || "all";
  const orgGroupValue = (orgTypeSelect?.value || "all").toString().trim() || "all";
  const orgValue = (orgSelect?.value || "all").toString().trim() || "all";
  const fileSafe = (value) =>
    value
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "all";

  const fileName = [
    "sgcu-project-status-overview",
    fileSafe(yearValue),
    fileSafe(orgGroupValue),
    fileSafe(orgValue)
  ].join("-") + ".png";

  // Render exports at a stable landscape size. Reusing the responsive mobile
  // canvas directly makes installed Web Apps produce a tall, cramped image.
  const originalWidth = chart.width;
  const originalHeight = chart.height;
  const originalCanvasStyle = sourceCanvas.getAttribute("style");
  const originalResponsive = chart.options.responsive;
  const originalPixelRatio = chart.options.devicePixelRatio;
  const originalYAxisAfterFit = chart.options.scales.y.afterFit;
  const originalExternalAxisWidth = chart.options.plugins.externalAxisLabels?.y?.width;
  const originalXAxisFont = chart.options.scales.x.ticks.font;
  const originalLegendFont = chart.options.plugins.legend.labels.font;
  const exportWidth = 1200;
  const exportHeight = Math.max(520, (chart.data.labels?.length || 1) * 56 + 180);
  let blob = null;

  try {
    sourceCanvas.style.setProperty("width", `${exportWidth}px`, "important");
    sourceCanvas.style.setProperty("height", `${exportHeight}px`, "important");
    sourceCanvas.style.setProperty("max-width", "none", "important");
    chart.options.responsive = false;
    chart.options.devicePixelRatio = 1;
    chart.options.scales.y.afterFit = (scale) => {
      scale.width = 250;
    };
    chart.options.scales.x.ticks.font = { ...(originalXAxisFont || {}), size: 16 };
    chart.options.plugins.legend.labels.font = { ...(originalLegendFont || {}), size: 16 };
    if (chart.options.plugins.externalAxisLabels?.y) {
      chart.options.plugins.externalAxisLabels.y.width = 250;
    }
    chart.resize(exportWidth, exportHeight);
    chart.update("none");

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    exportCtx.fillStyle = document.documentElement.dataset.theme === "dark" ? "#222222" : "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(sourceCanvas, 0, 0);
    drawClosureExportYAxisLabels(exportCtx, chart, sourceCanvas, { useDesktopLabels: true });
    blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, "image/png"));
  } finally {
    if (originalCanvasStyle === null) {
      sourceCanvas.removeAttribute("style");
    } else {
      sourceCanvas.setAttribute("style", originalCanvasStyle);
    }
    chart.options.responsive = originalResponsive;
    chart.options.devicePixelRatio = originalPixelRatio;
    chart.options.scales.y.afterFit = originalYAxisAfterFit;
    chart.options.scales.x.ticks.font = originalXAxisFont;
    chart.options.plugins.legend.labels.font = originalLegendFont;
    if (chart.options.plugins.externalAxisLabels?.y) {
      chart.options.plugins.externalAxisLabels.y.width = originalExternalAxisWidth;
    }
    chart.resize(originalWidth, originalHeight);
    chart.update("none");
  }

  if (!blob) return;

  const isStandaloneWebApp =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  // Installed PWAs, especially on iOS/iPadOS, may ignore an anchor's download
  // attribute. The native share sheet exposes Save Image / Save to Files there.
  if (isStandaloneWebApp && typeof navigator.share === "function" && typeof File === "function") {
    const file = new File([blob], fileName, { type: "image/png" });
    const canShareFile = typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] });
    if (canShareFile) {
      try {
        await navigator.share({
          files: [file],
          title: "ภาพรวมสถานะโครงการ"
        });
        return;
      } catch (error) {
        // Cancelling the native sheet is intentional; do not start a second download.
        if (error?.name === "AbortError") return;
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function drawClosureExportYAxisLabels(exportCtx, chart, sourceCanvas, { useDesktopLabels = false } = {}) {
  const labels = chart?.data?.labels || [];
  const scale = chart?.scales?.y;
  const chartArea = chart?.chartArea;
  if (!labels.length || !scale || !chartArea) return;

  const pixelRatio = sourceCanvas.width / Math.max(chart.width || sourceCanvas.clientWidth || 1, 1);
  const gap = Number(chart.options?.plugins?.externalAxisLabels?.y?.gap) || 8;
  const x = Math.max(0, chartArea.left - gap);
  const lineHeight = useDesktopLabels ? 21 : 14;

  exportCtx.save();
  exportCtx.scale(pixelRatio, pixelRatio);
  exportCtx.fillStyle = document.documentElement.dataset.theme === "dark" ? "#b8b8b8" : "#6b7280";
  exportCtx.font = `600 ${useDesktopLabels ? 16 : 11}px Kanit, sans-serif`;
  // Calculate the left edge ourselves instead of relying on textAlign="right".
  // Safari's canvas implementation can position Thai text from the anchor toward
  // the plot area when exporting from an installed Web App.
  exportCtx.direction = "ltr";
  exportCtx.textAlign = "left";
  exportCtx.textBaseline = "middle";

  labels.forEach((label, index) => {
    const wrappedLabel = useDesktopLabels
      ? wrapChartAxisLabel(label, 30, 2)
      : getClosureAxisWrappedLabel(label);
    const lines = normalizeExternalAxisLines(wrappedLabel);
    if (!lines.length) return;
    const y = scale.getPixelForValue(index);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, lineIndex) => {
      const lineWidth = exportCtx.measureText(line).width;
      const lineX = Math.max(8, x - lineWidth);
      exportCtx.fillText(line, lineX, startY + lineIndex * lineHeight);
    });
  });

  exportCtx.restore();
}
