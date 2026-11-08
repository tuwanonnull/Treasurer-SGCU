/* Pie chart: สัดส่วนงบประมาณที่ได้รับอนุมัติ */
function updateApprovedBudgetPie(filtered) {
  if (!statusPieChart) return;

  const includedStatuses = [
    "ผ่านสภาใหญ่",
    "ส่งขออนุมัติกิจการนิสิต",
    "อนุมัติโครงการ",
    "ยกเลิกโครงการ"
  ];

  const yearFilter = yearSelect ? yearSelect.value : "all";
  const orgGroupFilter = orgTypeSelect ? orgTypeSelect.value : "all";
  const orgFilter = orgSelect ? orgSelect.value : "all";

  let baseAllProjects = (Array.isArray(filtered) ? filtered : []).filter(
    (p) => yearFilter === "all" || p.year === yearFilter
  );

  let baseApprovedProjects = baseAllProjects.filter((p) =>
    includedStatuses.includes((p.statusMain || "").trim())
  );

  let labels = [];
  let data = [];
  let highlightLabel = null;

  const baseColors = [
    "#f9a8d4",
    "#bfdbfe",
    "#bbf7d0",
    "#fed7aa",
    "#fecaca",
    "#ddd6fe",
    "#fef3c7"
  ];
  const highlightColor = "#fb7185";

  let sumApproved = 0;
  let sumBase = 0;

  const baseGroups = getChartOrgGroups();

  if (orgGroupFilter === "all" && orgFilter === "all") {
    const budgetByGroup = {};
    baseGroups.forEach((g) => (budgetByGroup[g] = 0));

    baseApprovedProjects.forEach((p) => {
      if (budgetByGroup[p.orgGroup] !== undefined) {
        budgetByGroup[p.orgGroup] += p.budget || 0;
      }
    });

    baseGroups.forEach((g) => {
      if (budgetByGroup[g] > 0) {
        labels.push(g);
        data.push(budgetByGroup[g]);
      }
    });

    sumApproved = baseApprovedProjects.reduce(
      (a, p) => a + (p.budget || 0),
      0
    );
    sumBase = baseAllProjects.reduce(
      (a, p) => a + (p.budget || 0),
      0
    );
  } else if (orgGroupFilter !== "all" && orgFilter === "all") {
    const budgetByGroup = {};
    baseGroups.forEach((g) => (budgetByGroup[g] = 0));

    baseApprovedProjects.forEach((p) => {
      if (budgetByGroup[p.orgGroup] !== undefined) {
        budgetByGroup[p.orgGroup] += p.budget || 0;
      }
    });

    baseGroups.forEach((g) => {
      if (budgetByGroup[g] > 0) {
        labels.push(g);
        data.push(budgetByGroup[g]);
      }
    });

    highlightLabel = orgGroupFilter;

    const groupApproved = baseAllProjects
      .filter((p) => p.orgGroup === orgGroupFilter)
      .filter((p) => includedStatuses.includes((p.statusMain || "").trim()));

    sumApproved = groupApproved.reduce(
      (a, p) => a + (p.budget || 0),
      0
    );
    sumBase = baseAllProjects.reduce(
      (a, p) => a + (p.budget || 0),
      0
    );
  } else if (orgGroupFilter !== "all" && orgFilter !== "all") {
    const allowedOrgs = getOrgsByGroup(orgGroupFilter);
    const budgetByClub = {};

    baseApprovedProjects
      .filter((p) => p.orgGroup === orgGroupFilter)
      .forEach((p) => {
        const name = p.orgName || "(ไม่ระบุ)";
        if (allowedOrgs.length && !allowedOrgs.includes(name)) return;
        budgetByClub[name] = (budgetByClub[name] || 0) + (p.budget || 0);
      });

    const orderedLabels = allowedOrgs.length ? allowedOrgs : Object.keys(budgetByClub);
    labels = orderedLabels.filter((l) =>
      allowedOrgs.length ? budgetByClub[l] > 0 || l === orgFilter : true
    );
    data = labels.map((l) => budgetByClub[l] || 0);
    highlightLabel = orgFilter;

    const clubApproved = baseAllProjects
      .filter((p) => p.orgGroup === orgGroupFilter && p.orgName === orgFilter)
      .filter((p) => includedStatuses.includes((p.statusMain || "").trim()));

    sumApproved = clubApproved.reduce(
      (a, p) => a + (p.budget || 0),
      0
    );
    sumBase = baseAllProjects
      .filter((p) => p.orgGroup === orgGroupFilter)
      .reduce((a, p) => a + (p.budget || 0), 0);
  } else if (orgGroupFilter === "all" && orgFilter !== "all") {
    const budgetByGroup = {};
    baseGroups.forEach((g) => (budgetByGroup[g] = 0));

    baseApprovedProjects.forEach((p) => {
      if (budgetByGroup[p.orgGroup] !== undefined) {
        budgetByGroup[p.orgGroup] += p.budget || 0;
      }
    });

    baseGroups.forEach((g) => {
      if (budgetByGroup[g] > 0) {
        labels.push(g);
        data.push(budgetByGroup[g]);
      }
    });

    const yearOrgFilters = typeof getProjectOrgFiltersForYear === "function"
      ? getProjectOrgFiltersForYear()
      : (Array.isArray(orgFilters) ? orgFilters : []);
    const selectedOrgGroupFromFilters = yearOrgFilters.find((o) => o.name === orgFilter);
    const selectedOrgProject = projects.find((p) => p.orgName === orgFilter);
    const selectedOrgGroup = selectedOrgGroupFromFilters
      ? selectedOrgGroupFromFilters.group
      : selectedOrgProject
      ? selectedOrgProject.orgGroup
      : null;
    highlightLabel = selectedOrgGroup || null;

    const clubApproved = baseAllProjects
      .filter((p) => p.orgName === orgFilter)
      .filter((p) => includedStatuses.includes((p.statusMain || "").trim()));

    sumApproved = clubApproved.reduce(
      (a, p) => a + (p.budget || 0),
      0
    );
    sumBase = baseAllProjects.reduce(
      (a, p) => a + (p.budget || 0),
      0
    );
  }

  const bgColors = labels.map((l, i) =>
    l === highlightLabel ? highlightColor : baseColors[i % baseColors.length]
  );
  const offsets = labels.map((l) => (l === highlightLabel ? 15 : 0));

  statusPieChart.data.labels = labels;
  statusPieChart.data.datasets[0].data = data;
  statusPieChart.data.datasets[0].backgroundColor = bgColors;
  statusPieChart.data.datasets[0].offset = offsets;

  if (highlightLabel) {
    const idx = labels.indexOf(highlightLabel);
    if (idx !== -1) {
      const targetVal = data[idx];
      const percent =
        sumBase > 0 ? Math.round((sumApproved / sumBase) * 100) : 0;

      statusPieChart.options.plugins.centerText.text = percent + "%";

      if (targetVal > 0) {
        const positiveValues = data.filter((v) => v > 0);
        const rankedValues = [...new Set(positiveValues)].sort((a, b) => b - a);
        const rank = rankedValues.findIndex((v) => v === targetVal) + 1;

        statusPieChart.options.plugins.centerText.subText =
          rank > 0 ? `อันดับงบ ${rank}/${positiveValues.length}` : "";
      } else {
        statusPieChart.options.plugins.centerText.subText = "ไม่มีงบอนุมัติ";
      }
    } else {
      statusPieChart.options.plugins.centerText.text = "0%";
      statusPieChart.options.plugins.centerText.subText = "";
    }
  } else {
    const percent =
      sumBase > 0 ? Math.round((sumApproved / sumBase) * 100) : 0;
    statusPieChart.options.plugins.centerText.text = percent + "%";
    statusPieChart.options.plugins.centerText.subText = "";
  }

  if (!baseAllProjects.length) {
    statusPieChart.data.labels = [];
    statusPieChart.data.datasets[0].data = [];
    statusPieChart.data.datasets[0].backgroundColor = [];
    statusPieChart.data.datasets[0].offset = [];
    statusPieChart.options.plugins.centerText.text = "0%";
    statusPieChart.options.plugins.centerText.subText = "ไม่มีข้อมูลตรงกับตัวกรอง";
  }
  statusPieChart.update("none");
}
