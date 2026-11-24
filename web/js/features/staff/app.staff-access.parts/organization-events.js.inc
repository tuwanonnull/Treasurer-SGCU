  const initOrgRepresentativeMobileNav = () => {
    const section = document.querySelector('.page-view[data-page="org-representative-approval-staff"]');
    if (!section || document.getElementById("orgRepresentativeMobileNav")) return;
    const bar = document.createElement("nav");
    bar.id = "orgRepresentativeMobileNav";
    bar.className = "mobile-org-action-bar";
    bar.setAttribute("aria-label", "เมนูตัวแทนและทะเบียนองค์กร");
    bar.innerHTML = `
      <button type="button" class="mobile-meeting-action" data-org-mobile-tab="overview" aria-controls="orgRepresentativeOverviewPanel" aria-pressed="true">
        <span class="mobile-meeting-action-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v3"/></svg></span><span>ตัวแทนองค์กร</span>
      </button>
      <button type="button" class="mobile-meeting-action" data-org-mobile-tab="filter" aria-controls="orgRepresentativeFilterPanel" aria-pressed="false">
        <span class="mobile-meeting-action-icon" aria-hidden="true">▤</span><span>ทะเบียนองค์กร</span>
      </button>
      <button type="button" class="mobile-meeting-action" data-org-mobile-tool="filters" aria-haspopup="dialog"><span class="mobile-meeting-action-icon" aria-hidden="true">⌕</span><span>ตัวกรอง</span></button>
      <button type="button" class="mobile-meeting-action" data-org-mobile-direct="primary"><span class="mobile-meeting-action-icon" aria-hidden="true"></span><span data-org-action-label></span></button>
      <button type="button" class="mobile-meeting-action" data-org-mobile-direct="secondary"><span class="mobile-meeting-action-icon" aria-hidden="true"></span><span data-org-action-label></span></button>`;
    document.body.appendChild(bar);
    const mobile = window.matchMedia("(max-width: 840px)");
    const sheet = document.createElement("div");
    sheet.className = "modal org-mobile-tools-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-hidden", "true");
    sheet.setAttribute("aria-labelledby", "orgMobileToolsTitle");
    sheet.innerHTML = `<section class="mobile-filter-dialog"><header class="mobile-filter-header"><h2 id="orgMobileToolsTitle" class="mobile-filter-title"></h2><button type="button" class="mobile-filter-close" data-org-tools-close aria-label="ปิดตัวกรอง">×</button></header><div class="mobile-filter-body"></div><footer class="mobile-filter-footer"><button type="button" class="btn-ghost" data-org-tools-reset>ล้างตัวกรอง</button><button type="button" class="btn-primary" data-org-tools-close>เสร็จ</button></footer></section>`;
    document.body.appendChild(sheet);
    let mounted = null;
    let placeholder = null;
    let sheetTab = "";
    const selectedTab = () => orgRepresentativeMainFilterTabEl?.getAttribute("aria-selected") === "true" ? "filter" : "overview";
    const closeTools = () => {
      if (!mounted) return;
      placeholder.replaceWith(mounted);
      mounted = null;
      placeholder = null;
      closeDialog(sheet);
    };
    const openTools = () => {
      if (!mobile.matches) return;
      closeTools();
      sheetTab = selectedTab();
      const catalogTab = sheetTab === "filter";
      mounted = section.querySelector(catalogTab ? ".organization-catalog-filters" : ".org-representative-tools");
      if (!mounted) return;
      placeholder = document.createComment("organization mobile tools");
      mounted.before(placeholder);
      sheet.querySelector(".mobile-filter-body").appendChild(mounted);
      sheet.querySelector(".mobile-filter-title").textContent = `ตัวกรอง${catalogTab ? "ทะเบียนองค์กร" : "ตัวแทนองค์กร"}`;
      openDialog(sheet, { focusSelector: "select" });
    };
    sheet.querySelectorAll("[data-org-tools-close]").forEach((button) => button.addEventListener("click", closeTools));
    sheet.querySelector("[data-org-tools-reset]").addEventListener("click", () => {
      document.getElementById(sheetTab === "filter" ? "organizationCatalogFilterResetBtn" : "orgRepresentativeFilterResetBtn")?.click();
    });
    sheet.addEventListener("click", (event) => { if (event.target === sheet) closeTools(); });
    sheet.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeTools();
    });
    const sync = () => {
      const active = section.classList.contains("active");
      if (mounted && (!active || !mobile.matches || sheetTab !== selectedTab())) closeTools();
      bar.classList.toggle("is-visible", active);
      document.body.classList.toggle("has-mobile-org-actions", active);
      const selected = orgRepresentativeMainFilterTabEl?.getAttribute("aria-selected") === "true" ? "filter" : "overview";
      const actions = selected === "filter"
        ? [["organizationCatalogAddBtn", "เพิ่มองค์กร", "＋"], ["organizationCatalogCopyYearBtn", "ทำสำเนา", "▣"]]
        : [["orgRepresentativeExportCsvBtn", "ส่งออก CSV", "↓"], ["orgRepresentativeDeleteYearBtn", "ลบทั้งปี", "×"]];
      bar.querySelectorAll("[data-org-mobile-direct]").forEach((button, index) => {
        const [id, label, icon] = actions[index];
        const target = document.getElementById(id);
        button.dataset.orgMobileTarget = id;
        button.querySelector("[data-org-action-label]").textContent = label;
        button.querySelector(".mobile-meeting-action-icon").textContent = icon;
        button.disabled = !target || target.disabled;
        button.setAttribute("aria-label", target?.textContent?.trim() || label);
      });
      const ids = selected === "filter"
        ? ["organizationCatalogGroupFilter", "organizationCatalogAccountFilter", "organizationCatalogSearchInput"]
        : ["orgRepresentativeStatusFilter", "orgRepresentativeGroupFilter", "orgRepresentativeSearchInput"];
      const count = ids.filter((id) => { const value = document.getElementById(id)?.value?.trim(); return value && value !== "all"; }).length;
      const filterButton = bar.querySelector('[data-org-mobile-tool="filters"]');
      filterButton.classList.toggle("has-active-filters", count > 0);
      filterButton.dataset.filterCount = count ? String(count) : "";
      filterButton.setAttribute("aria-label", count ? `ตัวกรอง (${count})` : "ตัวกรอง");
      bar.querySelectorAll("[data-org-mobile-tab]").forEach((button) => {
        const isSelected = button.dataset.orgMobileTab === selected;
        button.classList.toggle("is-active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });
    };
    bar.addEventListener("click", (event) => {
      const tool = event.target.closest("[data-org-mobile-tool]");
      if (tool) { openTools(); return; }
      const direct = event.target.closest("[data-org-mobile-target]");
      if (direct) {
        const target = document.getElementById(direct.dataset.orgMobileTarget);
        if (target && !target.disabled) target.click();
        sync();
        return;
      }
      const button = event.target.closest("[data-org-mobile-tab]");
      if (!button) return;
      setOrgRepresentativeMainTab(button.dataset.orgMobileTab);
      sync();
      window.scrollTo({ top: 0, behavior: "auto" });
    });
    section.addEventListener("click", sync);
    section.addEventListener("input", sync);
    section.addEventListener("change", sync);
    sheet.addEventListener("click", sync);
    sheet.addEventListener("input", sync);
    sheet.addEventListener("change", sync);
    sheet.querySelector("[data-org-tools-reset]").addEventListener("click", sync);
    mobile.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(section, { attributes: true, attributeFilter: ["class"] });
    if (orgRepresentativeMainFilterTabEl) observer.observe(orgRepresentativeMainFilterTabEl, { attributes: true, attributeFilter: ["aria-selected"] });
    ["organizationCatalogAddBtn", "organizationCatalogCopyYearBtn", "orgRepresentativeExportCsvBtn", "orgRepresentativeDeleteYearBtn"].forEach((id) => {
      const target = document.getElementById(id);
      if (target) observer.observe(target, { attributes: true, attributeFilter: ["disabled"] });
    });
    sync();
  };
  initOrgRepresentativeMobileNav();

  if (orgRepresentativeMainOverviewTabEl) {
    orgRepresentativeMainOverviewTabEl.addEventListener("click", () => setOrgRepresentativeMainTab("overview"));
  }
  if (orgRepresentativeMainFilterTabEl) {
    orgRepresentativeMainFilterTabEl.addEventListener("click", () => setOrgRepresentativeMainTab("filter"));
  }
  organizationCatalogImportBtnEl?.addEventListener("click", () => {
    organizationCatalogImportFileEl?.click();
  });
  organizationCatalogImportFileEl?.addEventListener("change", (event) => {
    const file = event.target?.files?.[0] || null;
    void importOrganizationCatalogCsvFile(file);
  });
  organizationCatalogFormEl?.addEventListener("submit", (event) => {
    void saveOrganizationCatalogForm(event);
  });
  organizationCatalogFormEl?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.id === "organizationCatalogResponsibilityDivision") {
      handleOrganizationCatalogResponsibilityChange();
    }
  });
  organizationCatalogFields.group?.addEventListener("change", () => {
    syncOrganizationCatalogDocumentRunInputMode();
    refreshOrganizationCatalogGeneratedCode({ force: !organizationCatalogFields.id?.value });
    refreshOrganizationCatalogManualDocumentRunFromControls();
    updateOrganizationCatalogFormUi();
  });
  organizationCatalogFields.name?.addEventListener("input", () => {
    refreshOrganizationCatalogManualDocumentRunFromControls();
    updateOrganizationCatalogFormUi();
  });
  organizationCatalogFields.code?.addEventListener("input", () => {
    refreshOrganizationCatalogDocumentRunPreview();
    updateOrganizationCatalogFormUi();
  });
  organizationCatalogFields.code?.addEventListener("blur", () => {
    refreshOrganizationCatalogDocumentRunPreview();
    updateOrganizationCatalogFormUi();
  });
  organizationCatalogFields.documentRunCode?.addEventListener("focus", normalizeOrganizationCatalogDocumentRunInput);
  organizationCatalogFields.documentRunCode?.addEventListener("input", updateOrganizationCatalogFormUi);
  organizationCatalogFields.documentRunCode?.addEventListener("blur", () => {
    refreshOrganizationCatalogDocumentRunPreview();
    updateOrganizationCatalogFormUi();
  });
  const handleOrganizationCatalogResponsibilityChange = () => {
    syncOrganizationCatalogCustomResponsibilityControls();
    refreshOrganizationCatalogManualDocumentRunFromControls();
    updateOrganizationCatalogFormUi();
  };
  organizationCatalogResponsibilityDivisionEl?.addEventListener("input", handleOrganizationCatalogResponsibilityChange);
  organizationCatalogResponsibilityDivisionEl?.addEventListener("change", handleOrganizationCatalogResponsibilityChange);
  organizationCatalogResponsibilitySubCodeEl?.addEventListener("input", () => {
    refreshOrganizationCatalogManualDocumentRunFromControls();
    updateOrganizationCatalogFormUi();
  });
  organizationCatalogCustomDivisionCodeEl?.addEventListener("input", () => {
    refreshOrganizationCatalogManualDocumentRunFromControls();
    updateOrganizationCatalogFormUi();
  });
  organizationCatalogCustomDivisionNameEl?.addEventListener("input", () => {
    refreshOrganizationCatalogManualDocumentRunFromControls();
    updateOrganizationCatalogFormUi();
  });
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.id === "organizationCatalogGroup") {
      syncOrganizationCatalogDocumentRunInputMode();
      refreshOrganizationCatalogGeneratedCode({ force: !organizationCatalogFields.id?.value });
      refreshOrganizationCatalogManualDocumentRunFromControls();
      updateOrganizationCatalogFormUi();
    }
    if (target.id === "organizationCatalogResponsibilityDivision") {
      handleOrganizationCatalogResponsibilityChange();
    }
  });
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.id === "organizationCatalogResponsibilityDivision" ||
      target.id === "organizationCatalogCustomDivisionCode"
    ) {
      refreshOrganizationCatalogManualDocumentRunFromControls();
      updateOrganizationCatalogFormUi();
    }
  });
  const organizationCatalogEditorEl = document.getElementById("organizationCatalogEditorModal");
  const openOrganizationCatalogEditor = () => {
    if (!organizationCatalogEditorEl) return;
    // Keep fixed positioning relative to the viewport, outside animated page containers.
    if (organizationCatalogEditorEl.parentElement !== document.body) {
      document.body.appendChild(organizationCatalogEditorEl);
      // Commit the hidden state after portaling so the first opening can transition.
      void organizationCatalogEditorEl.offsetWidth;
    }
    openDialog(organizationCatalogEditorEl, { focusSelector: "#organizationCatalogName" });
  };
  const closeOrganizationCatalogEditor = () => {
    if (organizationCatalogSaveBtnEl?.disabled) return;
    closeDialog(organizationCatalogEditorEl);
    const selectedId = organizationCatalogFields.id?.value;
    const row = Array.from(organizationCatalogTableBodyEl?.querySelectorAll("tr[data-organization-id]") || [])
      .find((item) => item.dataset.organizationId === selectedId);
    const returnTarget = row?.querySelector(".organization-catalog-edit-link") || document.getElementById("organizationCatalogAddBtn");
    const visibleReturnTarget = returnTarget?.getClientRects().length ? returnTarget : document.querySelector('[data-org-mobile-target="organizationCatalogAddBtn"]');
    visibleReturnTarget?.focus({ preventScroll: true });
  };
  document.getElementById("organizationCatalogAddBtn")?.addEventListener("click", () => {
    resetOrganizationCatalogForm();
    openOrganizationCatalogEditor();
  });
  document.getElementById("organizationCatalogEditorClose")?.addEventListener("click", closeOrganizationCatalogEditor);
  document.getElementById("organizationCatalogEditorDone")?.addEventListener("click", closeOrganizationCatalogEditor);
  organizationCatalogEditorEl?.addEventListener("click", (event) => {
    if (event.target === organizationCatalogEditorEl) closeOrganizationCatalogEditor();
  });
  organizationCatalogEditorEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeOrganizationCatalogEditor();
  });
  organizationCatalogResetBtnEl?.addEventListener("click", resetOrganizationCatalogForm);
  organizationCatalogArchiveBtnEl?.addEventListener("click", () => {
    void archiveCurrentOrganizationCatalogItem();
  });
  organizationCatalogTableAcademicYearFilterEl?.addEventListener("change", () => {
    setOrgRepresentativeAcademicYear(organizationCatalogTableAcademicYearFilterEl.value);
  });
  organizationCatalogAccountFilterEl?.addEventListener("change", () => {
    organizationCatalogFilters.account = organizationCatalogAccountFilterEl.value || "all";
    organizationCatalogFilters.visibleLimit = ORGANIZATION_CATALOG_PAGE_SIZE;
    renderOrganizationCatalogTable();
  });
  organizationCatalogGroupFilterEl?.addEventListener("change", () => {
    organizationCatalogFilters.group = organizationCatalogGroupFilterEl.value || "all";
    organizationCatalogFilters.visibleLimit = ORGANIZATION_CATALOG_PAGE_SIZE;
    renderOrganizationCatalogTable();
  });
  organizationCatalogSearchInputEl?.addEventListener("input", () => {
    organizationCatalogFilters.query = organizationCatalogSearchInputEl.value || "";
    organizationCatalogFilters.visibleLimit = ORGANIZATION_CATALOG_PAGE_SIZE;
    renderOrganizationCatalogTable();
  });
  organizationCatalogFilterResetBtnEl?.addEventListener("click", () => {
    organizationCatalogFilters.account = "all";
    if (organizationCatalogAccountFilterEl) organizationCatalogAccountFilterEl.value = "all";
    organizationCatalogFilters.group = "all";
    organizationCatalogFilters.query = "";
    organizationCatalogFilters.visibleLimit = ORGANIZATION_CATALOG_PAGE_SIZE;
    if (organizationCatalogGroupFilterEl) organizationCatalogGroupFilterEl.value = "all";
    if (organizationCatalogSearchInputEl) organizationCatalogSearchInputEl.value = "";
    renderOrganizationCatalogTable();
  });
  organizationCatalogCopyYearBtnEl?.addEventListener("click", () => {
    void copyOrganizationCatalogSelectedYear();
  });
  organizationCatalogShowMoreBtnEl?.addEventListener("click", () => {
    organizationCatalogFilters.visibleLimit += ORGANIZATION_CATALOG_PAGE_SIZE;
    renderOrganizationCatalogTable();
  });
  organizationCatalogTableBodyEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rowEl = target.closest("tr[data-organization-id]");
    if (!rowEl) return;
    const id = (rowEl.getAttribute("data-organization-id") || "").toString();
    const item = getOrganizationCatalogRows().find((entry) => entry.id === id);
    if (item) {
      fillOrganizationCatalogForm(item);
      openOrganizationCatalogEditor();
    }
  });
  if (orgRepresentativeShowOverviewBtnEl) {
    orgRepresentativeShowOverviewBtnEl.addEventListener("click", () => setOrgRepresentativeView("overview"));
  }
  if (orgRepresentativeExportCsvBtnEl) {
    orgRepresentativeExportCsvBtnEl.addEventListener("click", exportOrgRepresentativeOverviewCsv);
  }
  if (orgRepresentativeDeleteYearBtnEl) {
    orgRepresentativeDeleteYearBtnEl.addEventListener("click", () => {
      openOrgRepresentativeDeleteYearConfirmModal();
    });
  }
  if (orgRepresentativeShowPendingBtnEl) {
    orgRepresentativeShowPendingBtnEl.addEventListener("click", () => setOrgRepresentativeView("pending"));
  }
  if (orgRepresentativeShowHistoryBtnEl) {
    orgRepresentativeShowHistoryBtnEl.addEventListener("click", () => setOrgRepresentativeView("history"));
  }
  organizationCatalogAcademicYearEl?.addEventListener("change", () => {
    setOrgRepresentativeAcademicYear(organizationCatalogAcademicYearEl.value);
    renderOrgRepresentativeOverview();
  });
  [orgRepresentativeSearchInputEl, orgRepresentativeStatusFilterEl, orgRepresentativeAcademicYearFilterEl, orgRepresentativeGroupFilterEl].forEach((control) => {
    if (!control) return;
    control.addEventListener("input", () => {
      if (control === orgRepresentativeAcademicYearFilterEl) {
        setOrgRepresentativeAcademicYear(control.value);
      }
      renderOrgRepresentativeOverview();
    });
    control.addEventListener("change", () => {
      if (control === orgRepresentativeAcademicYearFilterEl) {
        setOrgRepresentativeAcademicYear(control.value);
      }
      renderOrgRepresentativeOverview();
    });
  });
  orgRepresentativeFilterResetBtnEl?.addEventListener("click", resetOrgRepresentativeOverviewFilters);
  if (orgRepresentativeOverviewBodyEl) {
    orgRepresentativeOverviewBodyEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const rowEl = target.closest("tr[data-org-key]");
      if (!rowEl) return;
      const key = (rowEl.getAttribute("data-org-key") || "").toString();
      openOrgRepresentativeOrganizationModal(key);
    });
  }

  if (orgRepresentativePendingBodyEl) {
    orgRepresentativePendingBodyEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("select, button, input, textarea, a")) return;
      const rowEl = target.closest("tr[data-org-representative-id]");
      if (!rowEl) return;
      const id = (rowEl.getAttribute("data-org-representative-id") || "").toString();
      const item = currentOrgRepresentativeApplications.find((entry) => (entry.id || "").toString() === id);
      if (item) openOrgRepresentativeDetailModal(item);
    });

  (window.sgcuWorkOpeners ||= {})['org-representative-approval-staff'] = id => {
    const item = currentOrgRepresentativeApplications.find(item => item.id === id);
    if (!item) return false;
    openOrgRepresentativeDetailModal(item); return true;
  };

    orgRepresentativePendingBodyEl.addEventListener("change", (event) => {
      const select = event.target;
      if (!(select instanceof HTMLSelectElement)) return;
      if (select.dataset.role !== "org-representative-status-select") return;

      const id = (select.dataset.orgRepresentativeId || "").toString();
      const value = (select.value || "").toString();
      if (!id) return;

      if (value === "pending") {
        select.classList.remove("is-approved", "is-rejected");
        select.classList.add("is-pending");
        setMessage(orgRepresentativeMessageEl, "สถานะยังเป็นรออนุมัติ", "#6b7280");
        return;
      }

      const action = value === "approved" ? "approve" : value === "rejected" ? "reject" : "";
      if (!action) return;
      select.value = "pending";
      select.classList.remove("is-approved", "is-rejected");
      select.classList.add("is-pending");
      void updateOrgRepresentativeStatus(id, action).then((ok) => {
        select.classList.remove("is-approved", "is-rejected");
        if (ok) {
          select.value = value;
          if (value === "approved") select.classList.add("is-approved");
          else if (value === "rejected") select.classList.add("is-rejected");
          return;
        }
        select.value = "pending";
        select.classList.add("is-pending");
      });
    });
  }

  if (orgRepresentativeHistoryBodyEl) {
    orgRepresentativeHistoryBodyEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("select, button, input, textarea, a")) return;
      const rowEl = target.closest("tr[data-org-representative-id]");
      if (!rowEl) return;
      const id = (rowEl.getAttribute("data-org-representative-id") || "").toString();
      const item = currentOrgRepresentativeApplications.find((entry) => (entry.id || "").toString() === id);
      if (item) openOrgRepresentativeDetailModal(item);
    });

    orgRepresentativeHistoryBodyEl.addEventListener("change", (event) => {
      const select = event.target;
      if (!(select instanceof HTMLSelectElement)) return;
      if (select.dataset.role !== "org-representative-status-select") return;

      const id = (select.dataset.orgRepresentativeId || "").toString();
      const value = (select.value || "").toString();
      if (!id) return;

      if (value === "remove") {
        select.value = "approved";
        select.classList.remove("is-pending", "is-rejected");
        select.classList.add("is-approved");
        void deleteOrgRepresentativeApplication(id);
        return;
      }

      if (value === "approved") {
        select.classList.remove("is-pending", "is-rejected");
        select.classList.add("is-approved");
        setMessage(orgRepresentativeMessageEl, "สถานะยังเป็นอนุมัติแล้ว", "#6b7280");
        return;
      }

      const action = value === "pending" ? "pending" : value === "rejected" ? "reject" : "";
      if (!action) return;
      select.value = "approved";
      select.classList.remove("is-pending", "is-rejected");
      select.classList.add("is-approved");
      void updateOrgRepresentativeStatus(id, action).then((ok) => {
        select.classList.remove("is-pending", "is-rejected");
        if (ok) {
          select.value = value;
          if (value === "pending") select.classList.add("is-pending");
          else if (value === "rejected") select.classList.add("is-rejected");
          return;
        }
        select.value = "approved";
        select.classList.add("is-approved");
      });
    });
  }

  if (approvalHistoryBodyEl) {
    approvalHistoryBodyEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("input[type=\"checkbox\"]")) return;
      const rowEl = target.closest("tr.staff-approval-history-row");
      if (!rowEl) return;
      const groupKey = (rowEl.getAttribute("data-staff-key") || "").toString();
      const id = (rowEl.getAttribute("data-application-id") || "").toString();
      const item = groupKey
        ? currentApprovedHistoryGrouped.find((entry) => (entry.key || "").toString() === groupKey)
        : currentApprovedHistory.find((entry) => (entry.id || "").toString() === id);
      if (item) openApprovalDetailModal(item);
    });
    approvalHistoryBodyEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.classList.contains("staff-current-row-select")) return;
      const key = (target.dataset.staffKey || "").toString();
      if (!key) return;
      if (target.checked) selectedCurrentStaffKeys.add(key);
      else selectedCurrentStaffKeys.delete(key);
      syncCurrentStaffBulkSelectionUi();
    });
  }

  if (approvalDetailCloseEl) {
    approvalDetailCloseEl.addEventListener("click", () => {
      closeApprovalDetailModal();
    });
  }

  if (approvalDetailModalEl) {
    approvalDetailModalEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (target.dataset.role === "org-representative-status-select") {
        const id = (target.dataset.orgRepresentativeId || "").toString();
        const nextValue = (target.value || "").toString();
        const item = currentOrgRepresentativeApplications.find((entry) => (entry.id || "").toString() === id);
        const currentValue = normalizeApplicationStatus(item?.status);
        if (!id || !item || nextValue === currentValue) return;
        if (nextValue === "remove") {
          target.value = currentValue;
          target.classList.remove("is-approved", "is-rejected", "is-pending");
          target.classList.add(currentValue === "approved" ? "is-approved" : currentValue === "rejected" ? "is-rejected" : "is-pending");
          void deleteOrgRepresentativeApplication(id);
          return;
        }
        const action = nextValue === "approved" ? "approve" : nextValue === "rejected" ? "reject" : "pending";
        target.value = currentValue;
        target.classList.remove("is-approved", "is-rejected", "is-pending");
        target.classList.add(currentValue === "approved" ? "is-approved" : currentValue === "rejected" ? "is-rejected" : "is-pending");
        void updateOrgRepresentativeStatus(id, action).then((ok) => {
          if (!ok) return;
          target.value = nextValue;
          target.classList.remove("is-approved", "is-rejected", "is-pending");
          target.classList.add(nextValue === "approved" ? "is-approved" : nextValue === "rejected" ? "is-rejected" : "is-pending");
          const workspace = approvalDetailBodyEl.querySelector(".representative-workspace");
          if (workspace) {
            const organization = currentOrgRepresentativeOrganizations.find((entry) => String(entry.key) === workspace.dataset.organizationKey);
            const application = organization?.applications.find((entry) => String(entry.id) === id);
            if (application) application.status = nextValue;
            const selectedId = approvalDetailBodyEl.getAttribute("data-application-id") || id;
            openOrgRepresentativeOrganizationModal(workspace.dataset.organizationKey, selectedId);
          }
        });
        return;
      }
      if (target.id !== "modalApprovalTargetSelect") return;
      const selectedOption = target.selectedOptions?.[0] || null;
      const selectedId = (target.value || "").toString();
      const selectedPosition = (selectedOption?.dataset?.position || "").toString();
      const inputEl = approvalDetailBodyEl?.querySelector("#modalApprovalPositionInput");
      if (inputEl instanceof HTMLInputElement && selectedPosition) {
        inputEl.value = selectedPosition;
      }
      const saveBtn = approvalDetailBodyEl?.querySelector(".modal-approval-save-position");
      const revertBtn = approvalDetailBodyEl?.querySelector(".modal-approval-revert-pending");
      const rejectBtn = approvalDetailBodyEl?.querySelector(".modal-approval-reject");
      const deleteBtn = approvalDetailBodyEl?.querySelector(".modal-approval-delete");
      if (saveBtn instanceof HTMLButtonElement) saveBtn.dataset.applicationId = selectedId;
      if (revertBtn instanceof HTMLButtonElement) revertBtn.dataset.applicationId = selectedId;
      if (rejectBtn instanceof HTMLButtonElement) rejectBtn.dataset.applicationId = selectedId;
      if (deleteBtn instanceof HTMLButtonElement) deleteBtn.dataset.applicationId = selectedId;
    });

    approvalDetailModalEl.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof Element) {
        const exportOrgRepresentativeYearCsvBtn = target.closest('[data-role="export-org-representative-year-csv"]');
        if (exportOrgRepresentativeYearCsvBtn instanceof HTMLButtonElement) {
          exportOrgRepresentativeOverviewCsv();
          const msgEl = approvalDetailBodyEl?.querySelector("#orgRepresentativeDeleteYearMessage");
          const checkEl = approvalDetailBodyEl?.querySelector('[data-role="confirm-org-representative-year-delete-check"]');
          const confirmBtn = approvalDetailBodyEl?.querySelector('[data-role="confirm-org-representative-year-delete"]');
          if (checkEl instanceof HTMLInputElement) checkEl.checked = true;
          if (confirmBtn instanceof HTMLButtonElement) confirmBtn.disabled = false;
          if (msgEl instanceof HTMLElement) {
            msgEl.textContent = "โหลด CSV ของปีนี้แล้ว ตรวจไฟล์ดาวน์โหลดก่อนยืนยันลบ";
            msgEl.style.color = "#047857";
          }
          return;
        }
        const cancelOrgRepresentativeYearDeleteBtn = target.closest('[data-role="cancel-org-representative-year-delete"]');
        if (cancelOrgRepresentativeYearDeleteBtn instanceof HTMLButtonElement) {
          closeApprovalDetailModal();
          setMessage(orgRepresentativeMessageEl, "ยกเลิกการลบรายชื่อ", "#6b7280");
          return;
        }
        const confirmOrgRepresentativeYearDeleteBtn = target.closest('[data-role="confirm-org-representative-year-delete"]');
        if (confirmOrgRepresentativeYearDeleteBtn instanceof HTMLButtonElement) {
          const academicYear = (confirmOrgRepresentativeYearDeleteBtn.dataset.academicYear || "").toString();
          void deleteOrgRepresentativeAcademicYearRoster(academicYear);
          return;
        }
        const personButton = target.closest('[data-role="select-org-representative"]');
        if (personButton) {
          const workspace = personButton.closest(".representative-workspace");
          openOrgRepresentativeOrganizationModal(workspace.dataset.organizationKey, personButton.dataset.orgRepresentativeId);
          approvalDetailBodyEl.querySelector('.representative-person[aria-pressed="true"]')?.focus({ preventScroll: true });
          return;
        }
        const backToOrganization = target.closest('[data-role="back-to-org-representatives"]');
        if (backToOrganization) {
          openOrgRepresentativeOrganizationModal(backToOrganization.dataset.organizationKey);
          return;
        }
        const orgRepresentativeRow = target.closest(".org-representative-org-detail tr[data-org-representative-id]");
        if (orgRepresentativeRow && !target.closest("select, button, input, textarea, a")) {
          const id = (orgRepresentativeRow.getAttribute("data-org-representative-id") || "").toString();
          const item = currentOrgRepresentativeApplications.find((entry) => (entry.id || "").toString() === id);
          if (item) openOrgRepresentativeDetailModal(item, orgRepresentativeRow.closest(".org-representative-org-detail")?.dataset.organizationKey || "");
          return;
        }
        const saveBtn = target.closest(".modal-approval-save-position");
        if (saveBtn instanceof HTMLButtonElement) {
          const id = (saveBtn.dataset.applicationId || "").toString();
          const inputEl = approvalDetailBodyEl?.querySelector("#modalApprovalPositionInput");
          const msgEl = approvalDetailBodyEl?.querySelector("#modalApprovalActionMessage");
          const nextPosition = (inputEl instanceof HTMLInputElement ? inputEl.value : "").toString().trim();
          if (!nextPosition) {
            if (msgEl instanceof HTMLElement) {
              msgEl.textContent = "กรุณาระบุตำแหน่งก่อนบันทึก";
              msgEl.style.color = "#b91c1c";
            }
            return;
          }
          if (msgEl instanceof HTMLElement) {
            msgEl.textContent = "กำลังบันทึกตำแหน่ง...";
            msgEl.style.color = "#1d4ed8";
          }
          saveBtn.disabled = true;
          void updateApprovedPosition(id, nextPosition).then((ok) => {
            saveBtn.disabled = false;
            if (msgEl instanceof HTMLElement) {
              msgEl.textContent = ok
                ? "บันทึกตำแหน่งเรียบร้อยแล้ว"
                : "บันทึกตำแหน่งไม่สำเร็จ";
              msgEl.style.color = ok ? "#047857" : "#b91c1c";
            }
          });
          return;
        }
        const revertBtn = target.closest(".modal-approval-revert-pending");
        if (revertBtn instanceof HTMLButtonElement) {
          const id = (revertBtn.dataset.applicationId || "").toString();
          if (id) void revokeApprovedApplication(id, "pending");
          return;
        }
        const rejectBtn = target.closest(".modal-approval-reject");
        if (rejectBtn instanceof HTMLButtonElement) {
          const id = (rejectBtn.dataset.applicationId || "").toString();
          if (id) void revokeApprovedApplication(id, "rejected");
          return;
        }
        const deleteBtn = target.closest(".modal-approval-delete");
        if (deleteBtn instanceof HTMLButtonElement) {
          const id = (deleteBtn.dataset.applicationId || "").toString();
          if (id) void deleteStaffApplication(id).then((ok) => {
            if (ok) closeApprovalDetailModal();
          });
          return;
        }
      }
      if (event.target === approvalDetailModalEl) {
        closeApprovalDetailModal();
      }
    });
    approvalDetailModalEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.dataset.role !== "confirm-org-representative-year-delete-check") return;
      const confirmBtn = approvalDetailBodyEl?.querySelector('[data-role="confirm-org-representative-year-delete"]');
      if (confirmBtn instanceof HTMLButtonElement) {
        confirmBtn.disabled = !target.checked;
      }
    });
    approvalDetailModalEl.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeApprovalDetailModal();
      }
    });
  }

  if (positionManageFormEl) {
    positionManageFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextData = {
        name: positionManageInputEl instanceof HTMLInputElement ? positionManageInputEl.value : "",
        divisionCodeYY: positionDivisionCodeEl instanceof HTMLInputElement ? positionDivisionCodeEl.value : "",
        divisionLabel: positionDivisionNameEl instanceof HTMLInputElement ? positionDivisionNameEl.value : "",
        levelCodeZZ: positionLevelCodeEl instanceof HTMLSelectElement ? positionLevelCodeEl.value : "",
        allowedPages: readSelectedPositionAllowedPages()
      };
      if (currentEditingPositionId) {
        void updatePosition(currentEditingPositionId, nextData);
        return;
      }
      void addPosition();
    });
  }

  positionManageCancelBtnEl?.addEventListener("click", () => {
    resetPositionManageForm({ message: "ยกเลิกการแก้ไขแล้ว" });
  });

  positionManageDeleteBtnEl?.addEventListener("click", () => {
    if (!currentEditingPositionId) {
      setMessage(positionManageMessageEl, "กรุณาเลือกรายการตำแหน่งก่อนลบ", "#b45309");
      return;
    }
    void removePosition(currentEditingPositionId);
  });

  if (positionDivisionCodeEl) {
    const syncDivisionManageFields = ({ commit = false } = {}) => {
      const rawCode = (positionDivisionCodeEl.value || "").toString().replace(/\D/g, "").slice(0, 2);
      const code = commit ? normalizeCode2(rawCode) : rawCode;
      if (commit && positionDivisionCodeEl.value !== code) positionDivisionCodeEl.value = code;
      const existing = currentPositionCatalog.find((item) => normalizeCode2(item.divisionCodeYY || "") === code);
      const label = normalizePositionText(existing?.divisionLabel || existing?.divisionName || "");
      if (positionDivisionNameEl && label) {
        positionDivisionNameEl.value = label;
      }
      renderPositionAllowedPageOptions([], code);
      updateManageResolvedPositionName();
    };
    positionDivisionCodeEl.addEventListener("input", () => syncDivisionManageFields());
    positionDivisionCodeEl.addEventListener("change", () => syncDivisionManageFields({ commit: true }));
    positionDivisionCodeEl.addEventListener("blur", () => syncDivisionManageFields({ commit: true }));
  }

  if (positionDivisionNameEl && positionDivisionCodeEl) {
    positionDivisionNameEl.addEventListener("input", updateManageResolvedPositionName);
    positionDivisionNameEl.addEventListener("change", () => {
      const wantedLabel = normalizePositionText(positionDivisionNameEl.value || "");
      if (!wantedLabel || normalizeCode2(positionDivisionCodeEl.value || "")) return;
      const match = currentPositionCatalog.find((item) =>
        normalizePositionText(item.divisionLabel || item.divisionName || divisionCodeLabel(item.divisionCodeYY)).toLowerCase() === wantedLabel.toLowerCase()
      );
      if (match) {
        positionDivisionCodeEl.value = normalizeCode2(match.divisionCodeYY || "");
        renderPositionAllowedPageOptions([], positionDivisionCodeEl.value || "");
      }
      updateManageResolvedPositionName();
    });
  }

  if (positionLevelCodeEl) {
    positionLevelCodeEl.addEventListener("change", updateManageResolvedPositionName);
  }

  if (positionAllowedPagesEl) {
    positionAllowedPagesEl.addEventListener("change", (event) => {
      handleAllowedPagesToggle(event, positionAllowedPagesEl);
    });
  }

  if (positionListEl) {
    positionListEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const cardEl = target.closest(".staff-position-chip[data-select-position-id]");
      if (!(cardEl instanceof HTMLElement)) return;
      loadPositionIntoManageForm(cardEl.dataset.selectPositionId || "");
    });
    positionListEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const cardEl = target.closest(".staff-position-chip[data-select-position-id]");
      if (!(cardEl instanceof HTMLElement)) return;
      event.preventDefault();
      loadPositionIntoManageForm(cardEl.dataset.selectPositionId || "");
    });
  }

