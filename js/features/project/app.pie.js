/* Pie chart: สัดส่วนงบประมาณที่ได้รับอนุมัติ */
function updateApprovedBudgetPie(filtered) {
  if (!statusPieChart) return;

  // Keep the same approval stages used by this overview.
  const includedStatuses = new Set([
    "ผ่านสภาใหญ่", "ส่งขออนุมัติกิจการนิสิต", "อนุมัติโครงการ", "ยกเลิกโครงการ"
  ]);
  const yearFilter = yearSelect ? yearSelect.value : "all";
  const orgGroupFilter = orgTypeSelect ? orgTypeSelect.value : "all";
  const orgFilter = orgSelect ? orgSelect.value : "all";
  // The caller applies year, search and tracking filters, but leaves
  // organizations unfiltered so the pie retains its comparison context.
  const baseRows = (Array.isArray(filtered) ? filtered : []).filter(
    (p) => yearFilter === "all" || String(p.year) === String(yearFilter)
  );
  const byOrganization = orgFilter !== "all";
  const yearOrganizations = typeof getProjectOrgFiltersForYear === "function"
    ? getProjectOrgFiltersForYear() : [];
  const selectedGroup = orgGroupFilter !== "all" ? orgGroupFilter
    : yearOrganizations.find((org) => org.name === orgFilter)?.group
      || baseRows.find((project) => project.orgName === orgFilter)?.orgGroup;
  const rows = byOrganization
    ? baseRows.filter((project) => selectedGroup && project.orgGroup === selectedGroup)
    : baseRows;
  const key = byOrganization ? "orgName" : "orgGroup";
  const highlightLabel = byOrganization ? orgFilter
    : orgGroupFilter !== "all" ? orgGroupFilter : null;
  const totals = new Map();
  rows.forEach((project) => {
    if (!includedStatuses.has((project.statusMain || "").trim())) return;
    const budget = Number(project.approvedBudget100 ?? project.budget ?? 0);
    if (!Number.isFinite(budget) || budget <= 0) return;
    const label = project[key] || "(ไม่ระบุ)";
    totals.set(label, (totals.get(label) || 0) + budget);
  });

  const preferredLabels = byOrganization && selectedGroup
    ? getOrgsByGroup(selectedGroup) : byOrganization ? [] : getChartOrgGroups();
  // Catalogs define order, not eligibility: historical/uncatalogued
  // organizations must still contribute to both the arcs and the total.
  const labels = [...new Set([...preferredLabels, ...totals.keys()])]
    .filter((label) => totals.has(label));
  const data = labels.map((label) => totals.get(label));
  const total = data.reduce((sum, value) => sum + value, 0);
  const baseColors = ["#f9a8d4", "#bfdbfe", "#bbf7d0", "#fed7aa", "#fecaca", "#ddd6fe", "#fef3c7"];
  const dataset = statusPieChart.data.datasets[0];
  statusPieChart.data.labels = labels;
  dataset.data = data;
  dataset.backgroundColor = labels.map((label, index) =>
    label === highlightLabel ? "#fb7185" : baseColors[index % baseColors.length]
  );
  dataset.offset = labels.map((label) => label === highlightLabel ? 15 : 0);

  const center = statusPieChart.options.plugins.centerText;
  const selectedBudget = highlightLabel ? totals.get(highlightLabel) || 0 : total;
  // Use exactly the same denominator and precision as the arc tooltip.
  center.text = total > 0 ? ((selectedBudget / total) * 100).toFixed(1) + "%" : "0%";
  center.subText = "";
  if (!rows.length) {
    center.subText = "ไม่มีข้อมูลตรงกับตัวกรอง";
  } else if (!selectedBudget) {
    center.subText = "ไม่มีงบอนุมัติ";
  } else if (highlightLabel) {
    const rankedValues = [...new Set(data)].sort((a, b) => b - a);
    center.subText = `อันดับงบ ${rankedValues.indexOf(selectedBudget) + 1}/${data.length}`;
  }

  // Chart.js stores legend visibility by index; discard it when filter changes
  // replace the labels so a previously hidden arc cannot hide another group.
  labels.forEach((label, index) => {
    if (statusPieChart.getDataVisibility && !statusPieChart.getDataVisibility(index)) {
      statusPieChart.toggleDataVisibility(index);
    }
  });
  statusPieChart.update("none");
}
