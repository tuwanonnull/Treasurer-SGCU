  const getOrgRepresentativeRoleKey = (role = "") => {
    const text = (role || "").toString().trim().toLowerCase();
    if (!text) return "";
    if (text.includes("รอง") && text.includes("ประธาน")) return "vice_president";
    if (text.includes("ประธาน")) return "president";
    if (text.includes("เหรัญญิก") || text.includes("การเงิน")) return "treasurer";
    if (text.includes("เลขา") || text.includes("เลขานุการ")) return "secretary";
    return "";
  };

  const ORG_REPRESENTATIVE_ROLE_ORDER = new Map(
    REQUIRED_ORG_REPRESENTATIVE_ROLES.map((role, index) => [role.key, index])
  );

  const getOrgRepresentativeRoleSortIndex = (item = {}) => {
    const roleKey = getOrgRepresentativeRoleKey(item.representativeRole);
    return ORG_REPRESENTATIVE_ROLE_ORDER.has(roleKey) ? ORG_REPRESENTATIVE_ROLE_ORDER.get(roleKey) : 99;
  };

  const compareOrgRepresentativeApplications = (a = {}, b = {}) => {
    const roleCompare = getOrgRepresentativeRoleSortIndex(a) - getOrgRepresentativeRoleSortIndex(b);
    if (roleCompare) return roleCompare;
    const orgA = getResolvedOrgRepresentativeOrganization(a);
    const orgB = getResolvedOrgRepresentativeOrganization(b);
    const orgTypeCompare = (orgA.organizationType || "").toString().localeCompare((orgB.organizationType || "").toString(), "th");
    if (orgTypeCompare) return orgTypeCompare;
    const orgNameCompare = (orgA.organizationName || "").toString().localeCompare((orgB.organizationName || "").toString(), "th");
    if (orgNameCompare) return orgNameCompare;
    const applicantA = getOrgRepresentativeApplicant(a);
    const applicantB = getOrgRepresentativeApplicant(b);
    const nameCompare = (applicantA.displayName || applicantA.email || "").localeCompare(applicantB.displayName || applicantB.email || "", "th");
    if (nameCompare) return nameCompare;
    return (a.id || "").toString().localeCompare((b.id || "").toString(), "th");
  };

  const sortOrgRepresentativeApplications = (items = []) => [...items].sort(compareOrgRepresentativeApplications);

  const getMissingOrgRepresentativeRoles = (approvedItems = []) => {
    const approvedKeys = new Set(
      approvedItems
        .map((item) => getOrgRepresentativeRoleKey(item.representativeRole))
        .filter(Boolean)
    );
    return REQUIRED_ORG_REPRESENTATIVE_ROLES.filter((role) => !approvedKeys.has(role.key));
  };

  const getOrgRepresentativeCompleteness = (approvedItems = [], pendingCount = 0) => {
    const approvedCount = Array.isArray(approvedItems) ? approvedItems.length : Number(approvedItems || 0);
    const missingRoles = Array.isArray(approvedItems) ? getMissingOrgRepresentativeRoles(approvedItems) : [];
    if (Array.isArray(approvedItems) && missingRoles.length <= 0) {
      return { status: "complete", label: "ข้อมูลครบ", className: "badge-approved" };
    }
    if (approvedCount <= 0 && pendingCount <= 0) {
      return { status: "empty", label: "ยังไม่มีตัวแทน", className: "badge-rejected" };
    }
    return {
      status: "incomplete",
      label: `ยังขาด ${Array.isArray(approvedItems) ? missingRoles.length : Math.max(0, 4 - approvedCount)} ตำแหน่ง`,
      className: "badge-pending"
    };
  };

  const getOrgRepresentativeAcademicYearOptions = () =>
    Array.from(new Set([
      String(getCurrentAcademicYearBE()),
      ORGANIZATION_CATALOG_LEGACY_DOCUMENT_RUN_ACADEMIC_YEAR,
      ...currentOrgRepresentativeApplications.map((item) => getOrgRepresentativeAcademicYear(item)),
      ...getRawOrganizationCatalogRows().flatMap((item) => [
        getOrganizationCatalogItemAcademicYear(item),
        ...Object.keys(item.documentRunCodeByAcademicYear || {}),
        ...Object.keys(item.codeByAcademicYear || {}),
        ...Object.keys(item.nameByAcademicYear || {})
      ])
    ].filter(Boolean))).sort((a, b) => Number(b) - Number(a));

  const getOrgRepresentativeRosterAcademicYearOptions = () =>
    Array.from(new Set([
      String(getCurrentAcademicYearBE()),
      ...currentOrgRepresentativeApplications.map((item) => getOrgRepresentativeAcademicYear(item))
    ].filter(Boolean))).sort((a, b) => Number(b) - Number(a));

  const syncOrgRepresentativeAcademicYearSelect = (selectEl, years, selected) => {
    if (!selectEl) return "";
    selectEl.innerHTML = years
      .map((year) => `<option value="${toSafeText(year)}">${toSafeText(year)}${year === String(getCurrentAcademicYearBE()) ? " (ปัจจุบัน)" : ""}</option>`)
      .join("");
    selectEl.value = years.includes(selected) ? selected : String(getCurrentAcademicYearBE());
    return selectEl.value;
  };

  const populateOrgRepresentativeAcademicYearFilter = () => {
    const rosterYears = getOrgRepresentativeRosterAcademicYearOptions();
    const catalogYears = getOrgRepresentativeAcademicYearOptions();
    const selected = currentOrgRepresentativeAcademicYear || String(getCurrentAcademicYearBE());
    currentOrgRepresentativeAcademicYear =
      syncOrgRepresentativeAcademicYearSelect(orgRepresentativeAcademicYearFilterEl, rosterYears, selected) ||
      syncOrgRepresentativeAcademicYearSelect(organizationCatalogAcademicYearEl, catalogYears, selected) ||
      syncOrgRepresentativeAcademicYearSelect(organizationCatalogTableAcademicYearFilterEl, catalogYears, selected) ||
      String(getCurrentAcademicYearBE());
    syncOrgRepresentativeAcademicYearSelect(orgRepresentativeAcademicYearFilterEl, rosterYears, currentOrgRepresentativeAcademicYear);
    syncOrgRepresentativeAcademicYearSelect(organizationCatalogAcademicYearEl, catalogYears, currentOrgRepresentativeAcademicYear);
    syncOrgRepresentativeAcademicYearSelect(organizationCatalogTableAcademicYearFilterEl, catalogYears, currentOrgRepresentativeAcademicYear);
  };

  const setOrgRepresentativeAcademicYear = (value) => {
    const nextYear = normalizeOrganizationCatalogText(value) || String(getCurrentAcademicYearBE());
    const didChange = currentOrgRepresentativeAcademicYear !== nextYear;
    currentOrgRepresentativeAcademicYear = nextYear;
    if (didChange) invalidateOrgRepresentativeCatalogIndex();
    const rosterYears = getOrgRepresentativeRosterAcademicYearOptions();
    const catalogYears = getOrgRepresentativeAcademicYearOptions();
    syncOrgRepresentativeAcademicYearSelect(orgRepresentativeAcademicYearFilterEl, rosterYears, nextYear);
    syncOrgRepresentativeAcademicYearSelect(organizationCatalogAcademicYearEl, catalogYears, nextYear);
    syncOrgRepresentativeAcademicYearSelect(organizationCatalogTableAcademicYearFilterEl, catalogYears, nextYear);
    refreshSelectedOrganizationCatalogFormForAcademicYear();
    renderOrganizationCatalogTable();
  };

  const buildOrgRepresentativeOrganizations = () => {
    const orgMap = new Map();
    const selectedAcademicYear = currentOrgRepresentativeAcademicYear || String(getCurrentAcademicYearBE());
    getOrganizationCatalogRows().forEach((item) => {
      const orgType = (item?.group || "").toString().trim();
      const orgName = (item?.name || "").toString().trim();
      const orgCode = (item?.code || "").toString().trim();
      const documentRunCode = (item?.documentRunCode || "").toString().trim();
      if (!orgName) return;
      const key = getOrgRepresentativeOrgKey(orgType, orgName);
      if (!orgMap.has(key)) {
        orgMap.set(key, { key, orgType, orgName, orgCode, documentRunCode, applications: [], approved: [], pending: [], rejected: [] });
      } else {
        const entry = orgMap.get(key);
        if (!entry.orgCode) entry.orgCode = orgCode;
        if (!entry.documentRunCode) entry.documentRunCode = documentRunCode;
      }
    });

    currentOrgRepresentativeApplications
      .filter((item) => getOrgRepresentativeAcademicYear(item) === selectedAcademicYear)
      .forEach((item) => {
      const org = getResolvedOrgRepresentativeOrganization(item);
      const orgType = (org.organizationType || "").toString().trim();
      const orgName = (org.organizationName || "").toString().trim();
      if (!orgName) return;
      const key = getOrgRepresentativeOrgKey(orgType, orgName);
      if (!orgMap.has(key)) {
        orgMap.set(key, { key, orgType, orgName, orgCode: org.organizationCode || "", documentRunCode: org.documentRunCode || "", applications: [], approved: [], pending: [], rejected: [] });
      }
      const entry = orgMap.get(key);
      if (!entry.orgCode) entry.orgCode = org.organizationCode || "";
      if (!entry.documentRunCode) entry.documentRunCode = org.documentRunCode || "";
      entry.applications.push(item);
      const status = normalizeApplicationStatus(item.status);
      if (status === "approved") entry.approved.push(item);
      else if (status === "pending") entry.pending.push(item);
      else if (status === "rejected") entry.rejected.push(item);
    });

    orgMap.forEach((entry) => {
      entry.applications = sortOrgRepresentativeApplications(entry.applications);
      entry.approved = sortOrgRepresentativeApplications(entry.approved);
      entry.pending = sortOrgRepresentativeApplications(entry.pending);
      entry.rejected = sortOrgRepresentativeApplications(entry.rejected);
    });

    currentOrgRepresentativeOrganizations = Array.from(orgMap.values())
      .map((entry) => ({
        ...entry,
        searchText: [
          entry.orgType,
          entry.orgName,
          entry.orgCode,
          entry.documentRunCode,
          ...entry.applications.flatMap((item) => {
            const applicant = getOrgRepresentativeApplicant(item);
            const org = getResolvedOrgRepresentativeOrganization(item);
            return [applicant.displayName, applicant.email, applicant.phone, applicant.lineId, org.organizationName, org.organizationCode, item.representativeRole, getOrgRepresentativeAcademicYear(item)];
          })
        ].join(" ").toLowerCase()
      }))
      .sort((a, b) => {
        const typeCompare = (b.orgType || "").localeCompare(a.orgType || "", "th");
        if (typeCompare) return typeCompare;
        const aCode = (a.orgCode || a.documentRunCode || "").toString();
        const bCode = (b.orgCode || b.documentRunCode || "").toString();
        if (aCode || bCode) {
          if (!aCode) return 1;
          if (!bCode) return -1;
          const codeCompare = aCode.localeCompare(bCode, "th", { numeric: true, sensitivity: "base" });
          if (codeCompare) return codeCompare;
        }
        return (a.orgName || "").localeCompare(b.orgName || "", "th");
      });
    orgRepresentativeOrganizationsDirty = false;
  };

  const populateOrgRepresentativeGroupFilter = () => {
    if (!orgRepresentativeGroupFilterEl) return;
    const currentValue = orgRepresentativeGroupFilterEl.value || "all";
    const groups = Array.from(
      new Set(currentOrgRepresentativeOrganizations.map((entry) => (entry.orgType || "").trim()).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a, "th"));
    orgRepresentativeGroupFilterEl.innerHTML = [
      '<option value="all">ทุกประเภทองค์กร</option>',
      ...groups.map((group) => `<option value="${toSafeText(group)}">${toSafeText(group)}</option>`)
    ].join("");
    orgRepresentativeGroupFilterEl.value = groups.includes(currentValue) ? currentValue : "all";
  };

  const resetOrgRepresentativeOverviewFilters = () => {
    if (orgRepresentativeStatusFilterEl) orgRepresentativeStatusFilterEl.value = "all";
    if (orgRepresentativeGroupFilterEl) orgRepresentativeGroupFilterEl.value = "all";
    if (orgRepresentativeSearchInputEl) orgRepresentativeSearchInputEl.value = "";
    renderOrgRepresentativeOverview();
  };

  const renderOrgRepresentativeOverview = () => {
    if (!orgRepresentativeOrgFiltersLoadedForPage && canLoadOrgRepresentativeOrgFilters()) {
      if (orgRepresentativeOverviewBodyEl) {
        orgRepresentativeOverviewBodyEl.innerHTML = '<tr><td colspan="4">กำลังโหลดทะเบียนองค์กร...</td></tr>';
      }
      if (orgRepresentativePanelCaptionEl && currentOrgRepresentativeView === "overview") {
        orgRepresentativePanelCaptionEl.textContent = "กำลังโหลดทะเบียนองค์กร...";
      }
      void ensureOrgRepresentativeOrgFiltersLoaded().then((loaded) => {
        if (!loaded) {
          renderOrgRepresentativeOverview();
          return;
        }
        renderOrganizationCatalogTable();
        renderOrgRepresentativeOverview();
      });
      return;
    }

    populateOrgRepresentativeAcademicYearFilter();
    if (orgRepresentativeOrganizationsDirty) {
      buildOrgRepresentativeOrganizations();
    }
    populateOrgRepresentativeGroupFilter();

    const query = (orgRepresentativeSearchInputEl?.value || "").toString().trim().toLowerCase();
    const statusFilter = (orgRepresentativeStatusFilterEl?.value || "all").toString();
    const groupFilter = (orgRepresentativeGroupFilterEl?.value || "all").toString();
    currentOrgRepresentativeFilteredOrganizations = currentOrgRepresentativeOrganizations.filter((entry) => {
      const complete = getOrgRepresentativeCompleteness(entry.approved, entry.pending.length);
      if (query && !entry.searchText.includes(query)) return false;
      if (groupFilter !== "all" && entry.orgType !== groupFilter) return false;
      if (statusFilter === "pending") return entry.pending.length > 0;
      if (statusFilter !== "all" && complete.status !== statusFilter) return false;
      return true;
    });

    const totalOrgCount = currentOrgRepresentativeOrganizations.length;
    const completeOrgCount = currentOrgRepresentativeOrganizations
      .filter((entry) => getOrgRepresentativeCompleteness(entry.approved, entry.pending.length).status === "complete").length;
    const emptyOrgCount = currentOrgRepresentativeOrganizations
      .filter((entry) => getOrgRepresentativeCompleteness(entry.approved, entry.pending.length).status === "empty").length;
    const incompleteOrgCount = Math.max(0, totalOrgCount - completeOrgCount);
    const approvedTotalCount = currentOrgRepresentativeApplications
      .filter((item) =>
        normalizeApplicationStatus(item.status) === "approved" &&
        getOrgRepresentativeAcademicYear(item) === (currentOrgRepresentativeAcademicYear || String(getCurrentAcademicYearBE()))
      ).length;

    if (orgRepresentativeTotalOrgCountEl) orgRepresentativeTotalOrgCountEl.textContent = String(totalOrgCount);
    if (orgRepresentativeCompleteOrgCountEl) orgRepresentativeCompleteOrgCountEl.textContent = String(completeOrgCount);
    if (orgRepresentativeIncompleteOrgCountEl) {
      orgRepresentativeIncompleteOrgCountEl.textContent = emptyOrgCount
        ? `${incompleteOrgCount} (${emptyOrgCount} ว่าง)`
        : String(incompleteOrgCount);
    }
    if (orgRepresentativeApprovedTotalCountEl) orgRepresentativeApprovedTotalCountEl.textContent = String(approvedTotalCount);
    syncOrgRepresentativeDeleteYearButton();

    if (!orgRepresentativeOverviewBodyEl) {
      syncOrgRepresentativePanelCaption();
      return;
    }

    if (!currentOrgRepresentativeFilteredOrganizations.length) {
      orgRepresentativeOverviewBodyEl.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState("ไม่พบองค์กรตามตัวกรองที่เลือก", "ลองเปลี่ยนหรือล้างตัวกรองเพื่อดูรายการอื่น", "search")}</td></tr>`;
      syncOrgRepresentativePanelCaption();
      return;
    }

    orgRepresentativeOverviewBodyEl.innerHTML = currentOrgRepresentativeFilteredOrganizations.map((entry) => {
      const missingRoles = getMissingOrgRepresentativeRoles(entry.approved).map((role) => role.label);
      const approvedCountClass = entry.approved.length >= 4
        ? "is-complete"
        : entry.approved.length > 0
          ? "is-partial"
          : "is-empty";
      const pendingCountClass = entry.pending.length > 0 ? "has-pending" : "is-empty";
      return `
        <tr class="org-representative-org-row" data-org-key="${toSafeText(entry.key)}">
          <td data-label="องค์กร">
            <div>${toSafeText(entry.orgName || "-")}</div>
            <div class="section-text-sm">${toSafeText(entry.orgType || "-")}</div>
          </td>
          <td data-label="ตัวแทนอนุมัติแล้ว">
            <div class="org-representative-count ${approvedCountClass}">${toSafeText(String(entry.approved.length))}/4</div>
          </td>
          <td data-label="คำขอรออนุมัติ">
            <div class="org-representative-count ${pendingCountClass}">${toSafeText(String(entry.pending.length))}</div>
          </td>
          <td data-label="ตำแหน่งที่ยังขาด">${toSafeText(missingRoles.join(", ") || "-")}</td>
        </tr>
      `;
    }).join("");
    syncOrgRepresentativePanelCaption();
  };

  const renderOrgRepresentativePending = () => {
    if (!orgRepresentativePendingBodyEl) return;
    currentOrgRepresentativePending = sortOrgRepresentativeApplications(
      currentOrgRepresentativeApplications
        .filter((item) => normalizeApplicationStatus(item.status) === "pending")
    );

    if (!currentOrgRepresentativePending.length) {
      orgRepresentativePendingBodyEl.innerHTML = `<tr><td colspan="5" class="list-empty-cell">${renderListEmptyState("ไม่มีคำขอตัวแทนองค์กรที่รออนุมัติ", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "document")}</td></tr>`;
      setMessage(orgRepresentativeMessageEl, "", "#6b7280");
      syncOrgRepresentativePanelCaption();
      return;
    }

    orgRepresentativePendingBodyEl.innerHTML = currentOrgRepresentativePending.map((item) => {
      const id = (item.id || "").toString();
      const applicant = getOrgRepresentativeApplicant(item);
      const org = getResolvedOrgRepresentativeOrganization(item);
      const orgType = (org.organizationType || "-").toString();
      const orgName = (org.organizationName || "-").toString();
      const role = (item.representativeRole || "-").toString();
      const evidence = (item.evidenceNote || "-").toString();
      return `
        <tr class="org-representative-row" data-org-representative-id="${toSafeText(id)}">
          <td data-label="ผู้สมัคร">
            <div>${toSafeText(applicant.displayName)}</div>
            <div class="section-text-sm">${toSafeText(applicant.email || "-")}</div>
            <div class="section-text-sm">${toSafeText([applicant.phone, applicant.lineId].filter(Boolean).join(" / ") || "")}</div>
          </td>
          <td data-label="องค์กร">
            <div>${toSafeText(orgName)}</div>
            <div class="section-text-sm">${toSafeText(orgType)}</div>
          </td>
          <td data-label="ตำแหน่ง">${toSafeText(role)}</td>
          <td data-label="ข้อมูลยืนยัน">${toSafeText(evidence)}</td>
          <td data-label="จัดการคำขอ">
            <select
              class="staff-status-select is-pending org-representative-action-select"
              data-role="org-representative-status-select"
              data-org-representative-id="${toSafeText(id)}"
              aria-label="จัดการคำขอตัวแทนองค์กร"
            >
              <option value="pending" selected>รออนุมัติ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
              <option value="remove">ลบออกจากรายชื่อ</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");
    syncOrgRepresentativePanelCaption();
  };

  const renderOrgRepresentativeHistory = () => {
    if (!orgRepresentativeHistoryBodyEl || !orgRepresentativeHistoryCaptionEl) return;
    currentOrgRepresentativeApproved = sortOrgRepresentativeApplications(
      currentOrgRepresentativeApplications
        .filter((item) => normalizeApplicationStatus(item.status) === "approved")
    );
    orgRepresentativeHistoryCaptionEl.textContent = `แสดงผล ${currentOrgRepresentativeApproved.length} รายการ`;

    if (!currentOrgRepresentativeApproved.length) {
      orgRepresentativeHistoryBodyEl.innerHTML = `<tr><td colspan="5" class="list-empty-cell">${renderListEmptyState("ยังไม่มีตัวแทนองค์กรที่อนุมัติแล้ว", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "document")}</td></tr>`;
      syncOrgRepresentativePanelCaption();
      return;
    }

    orgRepresentativeHistoryBodyEl.innerHTML = currentOrgRepresentativeApproved.map((item) => {
      const applicant = getOrgRepresentativeApplicant(item);
      const org = getResolvedOrgRepresentativeOrganization(item);
      const orgType = (org.organizationType || "-").toString();
      const orgName = (org.organizationName || "-").toString();
      const academicYear = getOrgRepresentativeAcademicYear(item);
      const representativeContext = [
        orgName,
        orgType,
        academicYear ? `ปีการศึกษา ${academicYear}` : ""
      ].map((value) => (value || "").toString().trim()).filter(Boolean).join(" · ");
      const role = (item.representativeRole || "-").toString();
      const id = (item.id || "").toString();
      return `
        <tr class="org-representative-row" data-org-representative-id="${toSafeText(id)}">
          <td data-label="ตัวแทน">
            <div>${toSafeText(applicant.displayName)}</div>
            <div class="section-text-sm">${toSafeText(representativeContext || "-")}</div>
          </td>
          <td data-label="องค์กร">
            <div>${toSafeText(orgName)}</div>
            <div class="section-text-sm">${toSafeText(orgType)}</div>
          </td>
          <td data-label="ตำแหน่ง">${toSafeText(role)}</td>
          <td data-label="เวลาที่อนุมัติ">${toSafeText(formatDateTime(item.reviewedAt || item.updatedAt || item.createdAt))}</td>
          <td data-label="จัดการสิทธิ์">
            <select
              class="staff-status-select is-approved org-representative-history-action-select"
              data-role="org-representative-status-select"
              data-org-representative-id="${toSafeText(id)}"
              aria-label="จัดการสิทธิ์ตัวแทนองค์กร"
            >
              <option value="approved" selected>อนุมัติแล้ว</option>
              <option value="pending">ยกเลิกอนุมัติ</option>
              <option value="rejected">ลบสิทธิ์/ไม่อนุมัติ</option>
              <option value="remove">ลบออกจากรายชื่อ</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");
    syncOrgRepresentativePanelCaption();
  };

  const renderOrgRepresentativeApplications = () => {
    markOrgRepresentativeOrganizationsDirty();
    renderOrganizationCatalogTable();
    renderOrgRepresentativeOverview();
    renderOrgRepresentativePending();
    renderOrgRepresentativeHistory();
  };

  const exportOrgRepresentativeOverviewCsv = () => {
    renderOrgRepresentativeOverview();
    const rows = currentOrgRepresentativeFilteredOrganizations.map((entry) => {
      const complete = getOrgRepresentativeCompleteness(entry.approved, entry.pending.length);
      const missingRoles = getMissingOrgRepresentativeRoles(entry.approved).map((role) => role.label);
      const approvedPeople = sortOrgRepresentativeApplications(entry.approved).map((item) => {
        const applicant = getOrgRepresentativeApplicant(item);
        return `${applicant.displayName || "-"} (${item.representativeRole || "-"})`;
      });
      const pendingPeople = sortOrgRepresentativeApplications(entry.pending).map((item) => {
        const applicant = getOrgRepresentativeApplicant(item);
        return `${applicant.displayName || "-"} (${item.representativeRole || "-"})`;
      });
      const rejectedPeople = sortOrgRepresentativeApplications(entry.rejected).map((item) => {
        const applicant = getOrgRepresentativeApplicant(item);
        return `${applicant.displayName || "-"} (${item.representativeRole || "-"})`;
      });
      return {
        "ปีการศึกษา": currentOrgRepresentativeAcademicYear || String(getCurrentAcademicYearBE()),
        "ประเภทองค์กร": entry.orgType || "",
        "องค์กร": entry.orgName || "",
        "ตัวแทนอนุมัติแล้ว": entry.approved.length,
        "คำขอรออนุมัติ": entry.pending.length,
        "คำขอไม่อนุมัติ": entry.rejected.length,
        "ตำแหน่งที่ยังขาด": missingRoles.join(", "),
        "สถานะข้อมูล": complete.label,
        "รายชื่อตัวแทนอนุมัติแล้ว": approvedPeople.join("; "),
        "รายชื่อคำขอรออนุมัติ": pendingPeople.join("; "),
        "รายชื่อคำขอไม่อนุมัติ": rejectedPeople.join("; ")
      };
    });
    const headers = [
      "ปีการศึกษา",
      "ประเภทองค์กร",
      "องค์กร",
      "ตัวแทนอนุมัติแล้ว",
      "คำขอรออนุมัติ",
      "คำขอไม่อนุมัติ",
      "ตำแหน่งที่ยังขาด",
      "สถานะข้อมูล",
      "รายชื่อตัวแทนอนุมัติแล้ว",
      "รายชื่อคำขอรออนุมัติ",
      "รายชื่อคำขอไม่อนุมัติ"
    ];
    if (window.sgcuCsvExport?.download) {
      window.sgcuCsvExport.download({
        fileName: `organization-representatives-${currentOrgRepresentativeAcademicYear || getCurrentAcademicYearBE()}`,
        headers,
        rows
      });
      return;
    }
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll("\"", "\"\"")}"`).join(","))
    ].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-representatives-${currentOrgRepresentativeAcademicYear || getCurrentAcademicYearBE()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getOrgRepresentativeAcademicYearDeleteTarget = () => {
    const selectedAcademicYear = currentOrgRepresentativeAcademicYear || String(getCurrentAcademicYearBE());
    const targetItems = currentOrgRepresentativeApplications.filter((item) => {
      const id = (item.id || "").toString();
      return id && getOrgRepresentativeAcademicYear(item) === selectedAcademicYear;
    });
    const orgCount = new Set(targetItems.map((item) => {
      const org = getResolvedOrgRepresentativeOrganization(item);
      return getOrgRepresentativeOrgKey(org.organizationType || "", org.organizationName || "");
    })).size;
    return { selectedAcademicYear, targetItems, orgCount };
  };

  const syncOrgRepresentativeDeleteYearButton = () => {
    if (!orgRepresentativeDeleteYearBtnEl) return;
    const { selectedAcademicYear, targetItems } = getOrgRepresentativeAcademicYearDeleteTarget();
    const hasItems = targetItems.length > 0;
    orgRepresentativeDeleteYearBtnEl.hidden = false;
    orgRepresentativeDeleteYearBtnEl.disabled = !hasItems;
    orgRepresentativeDeleteYearBtnEl.title = hasItems
      ? `ลบรายชื่อตัวแทน ${targetItems.length.toLocaleString("th-TH")} รายการของปี ${selectedAcademicYear}`
      : `ยังไม่มีรายชื่อตัวแทนองค์กรของปี ${selectedAcademicYear} ให้ลบ`;
    orgRepresentativeDeleteYearBtnEl.setAttribute("aria-disabled", hasItems ? "false" : "true");
  };

  const openOrgRepresentativeDeleteYearConfirmModal = () => {
    if (!resolveStore()) {
      setMessage(orgRepresentativeMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(orgRepresentativeMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }
    if (!approvalDetailModalEl || !approvalDetailBodyEl) return false;

    const { selectedAcademicYear, targetItems, orgCount } = getOrgRepresentativeAcademicYearDeleteTarget();
    if (!targetItems.length) {
      syncOrgRepresentativeDeleteYearButton();
      setMessage(orgRepresentativeMessageEl, "ยังไม่มีรายชื่อตัวแทนองค์กรในปีที่เลือก", "#6b7280");
      return false;
    }

    const detailTitleEl = document.getElementById("staffApprovalDetailTitle");
    const detailSubtitleEl = document.getElementById("staffApprovalDetailSubtitle");
    if (detailTitleEl) detailTitleEl.textContent = "ยืนยันลบรายชื่อทั้งปี";
    if (detailSubtitleEl) detailSubtitleEl.textContent = `ปีการศึกษา ${selectedAcademicYear}`;
    approvalDetailBodyEl.removeAttribute("data-application-id");
    approvalDetailBodyEl.innerHTML = `
      <div class="staff-approval-detail-layout org-representative-delete-confirm">
        <div class="budget-round-delete-body org-representative-delete-body">
          <div class="budget-round-delete-warning">
            <div>
              <div class="budget-round-delete-name">ปีการศึกษา ${toSafeText(selectedAcademicYear)}</div>
              <div class="budget-round-delete-summary">
                พบรายชื่อตัวแทน ${toSafeText(targetItems.length.toLocaleString("th-TH"))} รายการ จาก ${toSafeText(orgCount.toLocaleString("th-TH"))} องค์กร ระบบจะลบคำขอทั้งหมดของปีนี้
              </div>
            </div>
          </div>
          <div class="budget-round-delete-export">
            <div>
              <div class="budget-round-delete-step-title">สำรองข้อมูลก่อนลบ</div>
              <div class="budget-round-delete-step-text">กรุณาโหลด CSV ของรายชื่อปีนี้เก็บไว้ก่อนกดยืนยัน เพราะหลังลบแล้วข้อมูลคำขอตัวแทนองค์กรของปีนี้จะถูกลบออกจากระบบ</div>
            </div>
            <button type="button" class="btn-ghost csv-export-btn" data-role="export-org-representative-year-csv">โหลด CSV</button>
          </div>
          <label class="budget-round-delete-check">
            <input id="orgRepresentativeDeleteYearConfirmCheck" type="checkbox" data-role="confirm-org-representative-year-delete-check" />
            <span>ฉันดาวน์โหลด CSV หรือยืนยันว่าไม่ต้องสำรองข้อมูลแล้ว และเข้าใจว่ารายชื่อตัวแทนองค์กรของปีนี้จะถูกลบถาวร</span>
          </label>
          <div id="orgRepresentativeDeleteYearMessage" class="section-text-sm budget-round-delete-message" aria-live="polite"></div>
        </div>
        <div class="modal-actions budget-round-delete-actions org-representative-delete-confirm-actions">
          <button type="button" class="btn-ghost" data-role="cancel-org-representative-year-delete">ยกเลิก</button>
          <button
            type="button"
            class="btn-primary budget-round-delete-confirm"
            data-role="confirm-org-representative-year-delete"
            data-academic-year="${toSafeText(selectedAcademicYear)}"
            disabled
          >
            ยืนยันลบรายชื่อ
          </button>
        </div>
      </div>
    `;
    if (approvalDetailModalEl.parentElement !== document.body) document.body.appendChild(approvalDetailModalEl);
    if (typeof openDialog === "function") {
      openDialog(approvalDetailModalEl, { focusSelector: '[data-role="export-org-representative-year-csv"]' });
    } else {
      approvalDetailModalEl.classList.add("show");
      approvalDetailModalEl.setAttribute("aria-hidden", "false");
      document.body.classList.add("has-modal");
    }
    return true;
  };

  const deleteOrgRepresentativeAcademicYearRoster = async (expectedAcademicYear = "") => {
    if (!resolveStore()) {
      setMessage(orgRepresentativeMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(orgRepresentativeMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }

    const { selectedAcademicYear, targetItems } = getOrgRepresentativeAcademicYearDeleteTarget();
    if (expectedAcademicYear && expectedAcademicYear !== selectedAcademicYear) {
      setMessage(orgRepresentativeMessageEl, "ปีการศึกษาที่เลือกเปลี่ยนไป กรุณากดยืนยันใหม่", "#b91c1c");
      return false;
    }
    if (!targetItems.length) {
      setMessage(orgRepresentativeMessageEl, "ยังไม่มีรายชื่อตัวแทนองค์กรในปีที่เลือก", "#6b7280");
      return false;
    }

    const deleteBtn = approvalDetailBodyEl?.querySelector('[data-role="confirm-org-representative-year-delete"]') || orgRepresentativeDeleteYearBtnEl;
    const modalMessageEl = approvalDetailBodyEl?.querySelector("#orgRepresentativeDeleteYearMessage");
    if (deleteBtn instanceof HTMLButtonElement) {
      deleteBtn.disabled = true;
      deleteBtn.textContent = "กำลังลบ...";
    }
    if (modalMessageEl instanceof HTMLElement) {
      modalMessageEl.textContent = "กำลังลบรายชื่อ...";
      modalMessageEl.style.color = "#1d4ed8";
    }

    try {
      const refs = targetItems.map((item) => firestore.doc(firestore.db, COLLECTION_ORG_REPRESENTATIVES, (item.id || "").toString()));
      if (firestore.writeBatch && refs.length > 1) {
        const batch = firestore.writeBatch(firestore.db);
        if (typeof batch.delete === "function") {
          refs.forEach((ref) => batch.delete(ref));
          await batch.commit();
        } else {
          for (const ref of refs) {
            await firestore.deleteDoc(ref);
          }
        }
      } else {
        for (const ref of refs) {
          await firestore.deleteDoc(ref);
        }
      }

      const deletedIds = new Set(targetItems.map((item) => (item.id || "").toString()));
      currentOrgRepresentativeApplications = currentOrgRepresentativeApplications
        .filter((item) => !deletedIds.has((item.id || "").toString()));
      renderOrgRepresentativeApplications();
      if (deleteBtn instanceof HTMLButtonElement) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = "ยืนยันลบรายชื่อ";
      }
      closeApprovalDetailModal();
      setMessage(orgRepresentativeMessageEl, `ลบรายชื่อตัวแทนทั้งหมดของปี ${selectedAcademicYear} เรียบร้อยแล้ว`, "#047857");
      return true;
    } catch (error) {
      console.error("delete organization representative year roster failed - app.staff-access.js:5699", error);
      const code = (error?.code || "unknown").toString();
      if (code === "permission-denied") {
        setMessage(orgRepresentativeMessageEl, "ไม่มีสิทธิ์ลบรายชื่อตัวแทนองค์กร (permission-denied)", "#b91c1c");
      } else if (code === "unauthenticated") {
        setMessage(orgRepresentativeMessageEl, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "#b91c1c");
      } else {
        setMessage(orgRepresentativeMessageEl, "ลบรายชื่อตัวแทนองค์กรไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
      }
      if (modalMessageEl instanceof HTMLElement) {
        modalMessageEl.textContent = "ลบรายชื่อไม่สำเร็จ กรุณาลองใหม่";
        modalMessageEl.style.color = "#b91c1c";
      }
      if (deleteBtn instanceof HTMLButtonElement) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = "ยืนยันลบรายชื่อ";
      }
      return false;
    }
  };

  const openOrgRepresentativeOrganizationModal = (orgKey, selectedId = "") => {
    if (!approvalDetailModalEl || !approvalDetailBodyEl) return;
    const entry = currentOrgRepresentativeOrganizations.find((item) => String(item.key || "") === String(orgKey || ""));
    if (!entry) return;
    const applications = sortOrgRepresentativeApplications(entry.applications);
    const selected = applications.find((item) => String(item.id) === String(selectedId)) || applications[0];
    const missingRoles = getMissingOrgRepresentativeRoles(entry.approved).map((role) => role.label);
    currentApprovalDetailRequestKey = "";
    let detailHtml = renderListEmptyState("ยังไม่มีตัวแทน", "เมื่อมีคำขอใหม่ รายชื่อจะแสดงที่นี่", "document");
    if (selected) {
      openOrgRepresentativeDetailModal(selected, "", true);
      detailHtml = approvalDetailBodyEl.innerHTML;
    } else {
      approvalDetailBodyEl.removeAttribute("data-application-id");
      approvalDetailBodyEl.removeAttribute("data-request-key");
    }
    document.getElementById("staffApprovalDetailTitle").textContent = entry.orgName || "ตัวแทนองค์กร";
    document.getElementById("staffApprovalDetailSubtitle").textContent = [entry.orgType, `ปีการศึกษา ${currentOrgRepresentativeAcademicYear || getCurrentAcademicYearBE()}`].filter(Boolean).join(" · ");
    const statusLabels = { approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ", pending: "รออนุมัติ" };
    const status = selected ? normalizeApplicationStatus(selected.status) : "pending";
    approvalDetailBodyEl.innerHTML = `
      <div class="org-representative-org-detail representative-workspace" data-organization-key="${toSafeText(entry.key)}">
        <aside class="representative-roster" aria-label="รายชื่อตัวแทน">
          <div class="representative-roster-heading">ตัวแทนองค์กร <span>${applications.length}</span></div>
          <div class="representative-roster-list">
            ${applications.map((item) => {
              const applicant = getOrgRepresentativeApplicant(item);
              const itemStatus = normalizeApplicationStatus(item.status);
              return `<button type="button" class="representative-person" data-role="select-org-representative" data-org-representative-id="${toSafeText(item.id)}" aria-pressed="${item.id === selected?.id}">
                <span class="representative-person-name">${toSafeText(applicant.displayName || applicant.email || "ไม่ระบุชื่อ")}</span>
                <span class="representative-person-role">${toSafeText(item.representativeRole || "ไม่ระบุตำแหน่ง")}</span>
                <span class="representative-person-status">${toSafeText(statusLabels[itemStatus] || statusLabels.pending)}</span>
              </button>`;
            }).join("")}
          </div>
          ${missingRoles.length ? `<p class="representative-missing">ยังขาด: ${toSafeText(missingRoles.join(", "))}</p>` : ""}
        </aside>
        <section class="representative-profile" aria-label="ข้อมูลตัวแทนที่เลือก">
          ${selected ? `<div class="representative-profile-header" data-org-representative-id="${toSafeText(selected.id)}">
            <div><div class="representative-eyebrow">ข้อมูลตัวแทน</div><h3>${toSafeText(getOrgRepresentativeApplicant(selected).displayName || "ไม่ระบุชื่อ")}</h3><p>${toSafeText(selected.representativeRole || "ไม่ระบุตำแหน่ง")}</p></div>
            <label class="representative-status-control">สถานะการอนุมัติ<select class="staff-status-select is-${status}" data-role="org-representative-status-select" data-org-representative-id="${toSafeText(selected.id)}">
              <option value="pending" ${status === "pending" ? "selected" : ""}>รออนุมัติ</option><option value="approved" ${status === "approved" ? "selected" : ""}>อนุมัติแล้ว</option><option value="rejected" ${status === "rejected" ? "selected" : ""}>ไม่อนุมัติ</option><option value="remove">ลบออกจากรายชื่อ</option>
            </select></label>
          </div>` : ""}
          ${detailHtml}
        </section>
      </div>`;
    approvalDetailBodyEl.scrollTop = 0;
    if (approvalDetailModalEl.classList.contains("show")) return;
    if (approvalDetailModalEl.parentElement !== document.body) {
      document.body.appendChild(approvalDetailModalEl);
      void approvalDetailModalEl.offsetWidth;
    }
    openDialog(approvalDetailModalEl, { focusSelector: '.representative-person[aria-pressed="true"], .modal-close' });
  };

  const openOrgRepresentativeDetailModal = (item, organizationKey = "", embedded = false) => {
    if (!approvalDetailModalEl || !approvalDetailBodyEl || !item) return;
    const detailTitleEl = document.getElementById("staffApprovalDetailTitle");
    const detailSubtitleEl = document.getElementById("staffApprovalDetailSubtitle");
    if (detailTitleEl) {
      detailTitleEl.textContent = "รายละเอียดตัวแทนองค์กร";
    }
    if (detailSubtitleEl) {
      detailSubtitleEl.textContent = "ข้อมูลเพิ่มเติมของรายการตัวแทนองค์กร";
    }
    const applicant = getOrgRepresentativeApplicant(item);
    const applicationId = (item.id || "").toString();
    const applicantUid = (item.applicantUid || item.applicant?.uid || item.requester?.uid || "").toString().trim();
    const applicantEmail = (applicant.email || item.applicantEmail || "").toString().trim().toLowerCase();
    const requestKey = `org:${applicationId}:${Date.now()}`;
    currentApprovalDetailRequestKey = requestKey;
    const status = normalizeApplicationStatus(item.status);
    const statusText = status === "approved" ? "อนุมัติแล้ว" : status === "rejected" ? "ไม่อนุมัติ" : "รออนุมัติ";
    const statusClass = status === "approved" ? "badge-approved" : status === "rejected" ? "badge-rejected" : "badge-pending";
    const org = getResolvedOrgRepresentativeOrganization(item);
    approvalDetailBodyEl.setAttribute("data-application-id", applicationId);
    approvalDetailBodyEl.setAttribute("data-request-key", requestKey);
    approvalDetailBodyEl.innerHTML = `
      <div class="staff-approval-detail-layout org-representative-person-detail">
        ${organizationKey ? `<button type="button" class="btn-ghost org-representative-back" data-role="back-to-org-representatives" data-organization-key="${toSafeText(organizationKey)}">← กลับไปรายชื่อตัวแทน</button>` : ""}
        <div class="modal-section">
          <div class="modal-section-title">ข้อมูลผู้สมัคร</div>
          <div class="modal-section-grid">
            <div>
              <div class="modal-item-label">ชื่อผู้สมัคร</div>
              <div class="modal-item-value">${toSafeText(applicant.displayName || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">อีเมล</div>
              <div class="modal-item-value">${toSafeText(applicant.email || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">รหัสนิสิต</div>
              <div id="orgRepresentativeDetailStudentId" class="modal-item-value">${toSafeText(applicant.studentId || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">คณะ</div>
              <div id="orgRepresentativeDetailFaculty" class="modal-item-value">${toSafeText(applicant.faculty || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">ชั้นปี</div>
              <div id="orgRepresentativeDetailYear" class="modal-item-value">${toSafeText(applicant.year || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">เบอร์โทร</div>
              <div class="modal-item-value">${toSafeText(applicant.phone || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">Line ID</div>
              <div class="modal-item-value">${toSafeText(applicant.lineId || "-")}</div>
            </div>
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">ข้อมูลองค์กร</div>
          <div class="modal-section-grid">
            <div>
              <div class="modal-item-label">ฝ่าย / ชมรม</div>
              <div class="modal-item-value">${toSafeText(org.organizationName || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">ประเภทองค์กร</div>
              <div class="modal-item-value">${toSafeText(org.organizationType || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">ตำแหน่งในองค์กร</div>
              <div class="modal-item-value">${toSafeText(item.representativeRole || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">สถานะ</div>
              <div class="modal-item-value"><span class="badge ${statusClass}">${toSafeText(statusText)}</span></div>
            </div>
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">ข้อมูลยืนยันและการพิจารณา</div>
          <div class="modal-section-grid">
            <div class="staff-approval-note-block">
              <div class="modal-item-label">ข้อมูลยืนยันเพิ่มเติม</div>
              <div class="modal-item-value">${toSafeText(item.evidenceNote || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">เวลายื่นคำขอ</div>
              <div class="modal-item-value">${toSafeText(formatDateTime(item.createdAt))}</div>
            </div>
            <div>
              <div class="modal-item-label">ผู้พิจารณา</div>
              <div class="modal-item-value">${toSafeText(item.reviewedByEmail || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">เวลาพิจารณา</div>
              <div class="modal-item-value">${toSafeText(formatDateTime(item.reviewedAt || item.updatedAt))}</div>
            </div>
            <div class="staff-approval-note-block">
              <div class="modal-item-label">หมายเหตุ</div>
              <div class="modal-item-value">${toSafeText(item.reviewedNote || "-")}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    const fillAcademicFields = (profile) => {
      if (currentApprovalDetailRequestKey !== requestKey) return;
      const studentIdEl = document.getElementById("orgRepresentativeDetailStudentId");
      const facultyEl = document.getElementById("orgRepresentativeDetailFaculty");
      const yearEl = document.getElementById("orgRepresentativeDetailYear");
      const effectiveEmail = ((profile?.email || applicantEmail || "").toString().trim().toLowerCase());
      const fallback = deriveAcademicProfile(profile || {}, effectiveEmail, item.createdAt || item.reviewedAt || item.updatedAt);
      const studentId = getMeaningfulProfileValue(profile?.studentId, applicant.studentId, fallback.studentId) || "-";
      const faculty = getMeaningfulProfileValue(profile?.faculty, applicant.faculty, fallback.faculty) || "-";
      const year = getMeaningfulProfileValue(fallback.year, profile?.year, applicant.year) || "-";
      if (studentIdEl) studentIdEl.textContent = studentId;
      if (facultyEl) facultyEl.textContent = faculty;
      if (yearEl) yearEl.textContent = year;
    };

    const localProfiles = readLoginProfiles();
    fillAcademicFields(localProfiles[normalizeAccountEmail(applicantEmail)] || {});

    if (firestore?.db && firestore?.doc && firestore?.getDoc) {
      const fetchByUid = applicantUid
        ? firestore
          .getDoc(firestore.doc(firestore.db, COLLECTION_USER_PROFILES, applicantUid))
          .then((snap) => (snap?.exists?.() ? (snap.data() || {}) : null))
          .catch(() => null)
        : Promise.resolve(null);

      fetchByUid.then((profile) => {
        if (profile && Object.keys(profile).length) fillAcademicFields(profile);
      });
    }

    if (embedded) return;
    approvalDetailBodyEl.scrollTop = 0;
    if (approvalDetailModalEl.classList.contains("show")) {
      (approvalDetailBodyEl.querySelector('[data-role="back-to-org-representatives"]') || document.getElementById("staffApprovalDetailClose"))?.focus({ preventScroll: true });
      return;
    }
    if (typeof openDialog === "function") {
      openDialog(approvalDetailModalEl, { focusSelector: "#staffApprovalDetailClose" });
      return;
    }
    approvalDetailModalEl.classList.add("show");
    approvalDetailModalEl.setAttribute("aria-hidden", "false");
  };

