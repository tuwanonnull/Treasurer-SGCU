/* Charts: status summary + trends (Chart.js) */
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
            ticks: { stepSize: 1 }
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
            text: "0%",
            subText: "",
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
            categoryPercentage: 0.72
          },
          {
            label: "งบที่ใช้จริง",
            data: [],
            backgroundColor: "#34d399",
            borderSkipped: false,
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 8, bottomRight: 8 },
            barPercentage: 0.78,
            categoryPercentage: 0.72
          }
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
              width: isMobileChart ? 118 : 210,
              gap: 8,
              formatter: (label) => getProjectBudgetAxisWrappedLabel(label)
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              maxTicksLimit: isMobileChart ? 3 : 6,
              font: { size: isMobileChart ? 11 : 12 },
              callback: (value) => Number(value || 0).toLocaleString("th-TH")
            }
          },
          y: {
            afterFit(scale) {
              scale.width = isMobileChart ? 118 : 210;
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
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  return wrapChartAxisLabel(label, isMobile ? 18 : 30, isMobile ? 3 : 2);
}

function getProjectBudgetStackRadius(ctx) {
  const i = ctx.dataIndex;
  const datasetIndex = ctx.datasetIndex;
  const chart = ctx.chart;
  const datasets = chart?.data?.datasets || [];
  const currentValue = Number(datasets[datasetIndex]?.data?.[i] || 0);
  const hasRightSegment = datasets.some((dataset, index) =>
    index > datasetIndex &&
    dataset?.stack === datasets[datasetIndex]?.stack &&
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
  const baseHeight = isMobile ? 360 : 300;
  const perLabel = isMobile
    ? Math.max(38, 22 + maxWrappedLines * 14)
    : Math.max(30, 16 + maxWrappedLines * 13);
  container.style.height = `${Math.max(baseHeight, numLabels * perLabel)}px`;

  if (projectBudgetComparisonChart) projectBudgetComparisonChart.resize();
}

function updateProjectBudgetComparisonChart(filtered) {
  const chart = projectBudgetComparisonChart;
  const ctx = projectStatusContexts[activeProjectStatusContext] || {};
  const captionEl = ctx.projectBudgetComparisonCaptionEl;
  if (!chart) return;

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
    const approved = actual + remaining;
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

  if (isGlobalView) {
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

  const visibleRows = rows;
  chart.$projectBudgetRows = visibleRows;
  chart.data.labels = visibleRows.map((row) => row.name);
  chart.data.datasets[0].data = visibleRows.map((row) => row.approved);
  chart.data.datasets[1].data = visibleRows.map((row) => row.actual);

  const maxValue = Math.max(
    0,
    ...visibleRows.map((row) => row.approved),
    ...visibleRows.map((row) => row.actual)
  );
  chart.options.scales.x.suggestedMax = maxValue > 0 ? maxValue * 1.08 : undefined;

  if (captionEl) {
    captionEl.textContent = "";
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
  chart.options.scales.x.max = getNiceProjectCountAxisMax(maxTotal);
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

    exportCtx.fillStyle = "#ffffff";
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
  exportCtx.fillStyle = "#6b7280";
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
