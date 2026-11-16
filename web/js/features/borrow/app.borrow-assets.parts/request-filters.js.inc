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
      item.borrowProjectName,
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
    const projectId = staffBorrowRequestProjectFilter?.value || "all";
    if (projectId !== "all" && item.borrowProjectId !== projectId) return false;
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
      (staffBorrowRequestProjectFilter?.value || "all") !== "all" ||
      (staffBorrowRequestDeptFilter?.value || "all") !== "all" ||
      (staffBorrowRequestDueFilter?.value || "all") !== "all" ||
      staffBorrowRequestPickupFrom?.value ||
      staffBorrowRequestPickupTo?.value ||
      staffBorrowRequestReturnFrom?.value ||
      staffBorrowRequestReturnTo?.value
    );

  const countActiveStaffBorrowRequestFilters = () => {
    const values = [
      (staffBorrowRequestProjectFilter?.value || "all") !== "all" ? staffBorrowRequestProjectFilter?.value : "",
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
    const advancedCount = Array.from(document.querySelectorAll("#staffBorrowAdvancedFilters select, #staffBorrowAdvancedFilters input"))
      .filter((control) => control.value && control.value !== "all").length;
    const countEl = document.getElementById("staffBorrowAdvancedFilterCount");
    if (countEl) {
      countEl.textContent = `${advancedCount} เงื่อนไข`;
      countEl.hidden = advancedCount === 0;
    }
    const resetEl = document.getElementById("staffBorrowRequestFiltersReset");
    if (resetEl) resetEl.hidden = !hasFilters;
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

