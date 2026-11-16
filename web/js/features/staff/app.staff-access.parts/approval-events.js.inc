  const handleAuthOrProfileUpdate = (event) => {
    const detail = event?.detail && typeof event.detail === "object" ? event.detail : null;
    if (detail) {
      lastKnownAuthState = {
        isAuthenticated: !!detail.isAuthenticated,
        uid: (detail.uid || "").toString().trim(),
        email: (detail.email || "").toString().trim().toLowerCase()
      };
    } else if (!readCurrentUser()) {
      lastKnownAuthState = {
        isAuthenticated: false,
        uid: "",
        email: ""
      };
    }
    prefillApplicationForm();
    setApplicationAvailabilityByAuth();
    void refreshAccessProfileForCurrentUser({ force: true });
    if (!readCurrentUser()?.email) {
      closeApplicationModal();
    }
    setApprovalAvailabilityByRole();
    startPositionCatalogListener();
    startMyApplicationsListener();
    startPendingApplicationsListener();
    startApprovedHistoryListener();
    startOrgRepresentativeApplicationsListener();
    const activeStaffAdminPage =
      document.querySelector(".page-view.active")?.getAttribute("data-page") ||
      (window.location.hash || "").replace("#", "");
    if (activeStaffAdminPage === "staff-directory-staff") {
      setStaffApprovalMainTab("structure");
    } else if (activeStaffAdminPage === "staff-temporary-access-staff") {
      setStaffApprovalMainTab("auth-access");
    }
    scheduleApprovalUiSync();
  };

  if (appFormEl) {
    appFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitStaffApplication();
    });
  }

  if (appDivisionEl) {
    appDivisionEl.addEventListener("change", () => {
      if (appLevelEl) appLevelEl.value = "";
      renderApplicationPositionSelect();
    });
  }

  if (appLevelEl) {
    appLevelEl.addEventListener("change", () => {
      renderApplicationPositionSelect();
    });
  }

  if (applicationModalOpenEl) {
    applicationModalOpenEl.addEventListener("click", () => {
      openApplicationModal();
    });
  }

  if (applicationModalCloseEl) {
    applicationModalCloseEl.addEventListener("click", () => {
      closeApplicationModal();
    });
  }

  if (applicationModalEl) {
    applicationModalEl.addEventListener("click", (event) => {
      if (event.target === applicationModalEl) {
        closeApplicationModal();
      }
    });
    applicationModalEl.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeApplicationModal();
      }
    });
  }

  if (approvalBodyEl) {
    approvalBodyEl.addEventListener("click", (event) => {
      // no-op: ใช้ onChange แบบหน้าห้องประชุม
    });

    approvalBodyEl.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.classList.contains("staff-approval-row-select")) {
        const id = (target.dataset.applicationId || "").toString();
        if (id) {
          if (target.checked) selectedPendingApplicationIds.add(id);
          else selectedPendingApplicationIds.delete(id);
          syncPendingBulkSelectionUi();
        }
        return;
      }
      const select = target;
      if (!(select instanceof HTMLSelectElement)) return;
      if (select.dataset.role !== "status-select") return;

      const id = (select.dataset.applicationId || "").toString();
      const value = (select.value || "").toString();
      if (!id) return;

      if (value === "remove") {
        select.value = "pending";
        select.classList.remove("is-approved", "is-rejected");
        select.classList.add("is-pending");
        void deleteStaffApplication(id);
        return;
      }

      if (value === "pending") {
        select.classList.remove("is-approved", "is-rejected");
        select.classList.add("is-pending");
        setMessage(approvalMessageEl, "สถานะยังเป็นรออนุมัติ", "#6b7280");
        return;
      }

      const action = value === "approved" ? "approve" : value === "rejected" ? "reject" : "";
      if (!action) return;
      select.value = "pending";
      select.classList.remove("is-approved", "is-rejected");
      select.classList.add("is-pending");
      void updateApplicationStatus(id, action).then((ok) => {
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

  staffApprovalSelectAllEl?.addEventListener("change", () => {
    visiblePendingApplicationIds.forEach((id) => {
      if (staffApprovalSelectAllEl.checked) selectedPendingApplicationIds.add(id);
      else selectedPendingApplicationIds.delete(id);
    });
    syncPendingBulkSelectionUi();
  });
  staffApprovalBulkClearBtnEl?.addEventListener("click", clearPendingBulkSelection);
  staffApprovalBulkDeleteBtnEl?.addEventListener("click", () => {
    void deleteSelectedPendingApplications();
  });
  staffApprovalSelectionToggleBtnEl?.addEventListener("click", () => {
    setBulkSelectionMode("pending", !staffApprovalPendingContentEl?.classList.contains("is-selection-mode"));
  });
  staffCurrentSelectAllEl?.addEventListener("change", () => {
    visibleCurrentStaffKeys.forEach((key) => {
      if (staffCurrentSelectAllEl.checked) selectedCurrentStaffKeys.add(key);
      else selectedCurrentStaffKeys.delete(key);
    });
    syncCurrentStaffBulkSelectionUi();
  });
  staffCurrentBulkClearBtnEl?.addEventListener("click", clearCurrentStaffBulkSelection);
  staffCurrentBulkRevokeBtnEl?.addEventListener("click", () => {
    void revokeSelectedCurrentStaff();
  });
  staffCurrentSelectionToggleBtnEl?.addEventListener("click", () => {
    setBulkSelectionMode("current", !approvalHistoryContentEl?.classList.contains("is-selection-mode"));
  });

  if (approvalShowPendingBtnEl) {
    approvalShowPendingBtnEl.addEventListener("click", () => setApprovalView("pending"));
  }
  if (approvalShowHistoryBtnEl) {
    approvalShowHistoryBtnEl.addEventListener("click", () => setApprovalView("history"));
  }
  const rerenderActiveStaffApprovalList = () => {
    if (currentApprovalView === "history") renderApprovedHistory();
    else renderApprovalRows();
  };
  staffApprovalSearchInputEl?.addEventListener("input", () => {
    staffApprovalFilters.query = (staffApprovalSearchInputEl.value || "").toString().trim();
    rerenderActiveStaffApprovalList();
  });
  staffApprovalDivisionFilterEl?.addEventListener("change", () => {
    staffApprovalFilters.division = staffApprovalDivisionFilterEl.value || "all";
    rerenderActiveStaffApprovalList();
  });
  staffApprovalPositionFilterEl?.addEventListener("change", () => {
    staffApprovalFilters.position = staffApprovalPositionFilterEl.value || "all";
    const matchingDivision = staffApprovalPositionDivisionMap.get(staffApprovalFilters.position) || "";
    if (staffApprovalFilters.position !== "all" && matchingDivision) {
      staffApprovalFilters.division = matchingDivision;
    }
    rerenderActiveStaffApprovalList();
  });
  staffApprovalSortFilterEl?.addEventListener("change", () => {
    staffApprovalFilters.sort = staffApprovalSortFilterEl.value || "newest";
    rerenderActiveStaffApprovalList();
  });
  staffApprovalFilterResetBtnEl?.addEventListener("click", () => {
    staffApprovalFilters.query = "";
    staffApprovalFilters.division = "all";
    staffApprovalFilters.position = "all";
    staffApprovalFilters.sort = "newest";
    if (staffApprovalSearchInputEl) staffApprovalSearchInputEl.value = "";
    if (staffApprovalSortFilterEl) staffApprovalSortFilterEl.value = "newest";
    rerenderActiveStaffApprovalList();
  });
  staffManagementPeopleTabEl?.addEventListener("click", () => setStaffManagementView("people"));
  staffManagementPositionTabEl?.addEventListener("click", () => setStaffManagementView("positions"));

  if (staffApprovalMainApprovalTabEl) {
    staffApprovalMainApprovalTabEl.addEventListener("click", () => setStaffApprovalMainTab("approval"));
  }
  if (staffApprovalMainStructureTabEl) {
    staffApprovalMainStructureTabEl.addEventListener("click", () => setStaffApprovalMainTab("structure"));
  }
  if (staffApprovalMainAuthAccessTabEl) {
    staffApprovalMainAuthAccessTabEl.addEventListener("click", () => setStaffApprovalMainTab("auth-access"));
  }

  staffAuthAccessFormEl?.addEventListener("submit", (event) => {
    void saveAuthEmailAccess(event);
  });
  staffAuthAccessDeleteBtnEl?.addEventListener("click", () => {
    const email = normalizeAuthAccessEmail(staffAuthAccessFields.id?.value || staffAuthAccessFields.email?.value || "");
    void deleteAuthEmailAccess(email);
  });
  staffAuthAccessResetBtnEl?.addEventListener("click", resetAuthAccessForm);
  staffAuthAccessRefreshBtnEl?.addEventListener("click", () => {
    if (typeof unsubscribeAuthEmailAccess === "function") {
      unsubscribeAuthEmailAccess();
      unsubscribeAuthEmailAccess = null;
    }
    startAuthEmailAccessListener();
  });
  staffAuthAccessFields.email?.addEventListener("input", () => {
    const email = normalizeAuthAccessEmail(staffAuthAccessFields.email?.value || "");
    if (staffAuthAccessFields.email && staffAuthAccessFields.email.value !== email) {
      staffAuthAccessFields.email.value = email;
    }
  });
  staffAuthAccessFields.email?.addEventListener("blur", () => {
    void refreshAuthAccessProfilePreview();
  });
  const staffAuthAccessListPanelEl = document.getElementById("staffAuthAccessListPanel");
  staffAuthAccessListPanelEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rowEl = target.closest("[data-auth-access-email]");
    if (!(rowEl instanceof HTMLElement)) return;
    const email = normalizeAuthAccessEmail(rowEl.dataset.authAccessEmail || "");
    const entry = currentAuthEmailAccessEntries.find((item) => normalizeAuthAccessEmail(item.email || item.id || "") === email);
    if (entry) {
      fillAuthAccessForm(entry);
      staffAuthAccessFormEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  staffAuthAccessListPanelEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target?.closest("button")) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rowEl = target.closest("[data-auth-access-email]");
    if (!(rowEl instanceof HTMLElement)) return;
    event.preventDefault();
    const email = normalizeAuthAccessEmail(rowEl.dataset.authAccessEmail || "");
    const entry = currentAuthEmailAccessEntries.find((item) => normalizeAuthAccessEmail(item.email || item.id || "") === email);
    if (entry) {
      fillAuthAccessForm(entry);
      staffAuthAccessFormEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const orgStructureEditorEl = document.getElementById("orgStructureEditor");
  orgStructureEditorEl?.addEventListener("cancel", (event) => {
    event.preventDefault();
    setOrgStructureEditorOpen(false);
  });
  orgStructureEditorEl?.addEventListener("click", (event) => {
    if (event.target !== orgStructureEditorEl) return;
    const bounds = orgStructureEditorEl.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) setOrgStructureEditorOpen(false);
  });

  document.getElementById("orgStructureEditorClose")?.addEventListener("click", () => {
    setOrgStructureEditorOpen(false);
  });

  document.getElementById("orgStructureAddBtn")?.addEventListener("click", () => {
    resetOrgStructureForm();
    setOrgStructureEditorOpen(true);
  });

  if (orgStructureMemberFormEl) {
    orgStructureMemberFormEl.addEventListener("invalid", (event) => {
      if (orgStructurePlacement.advanced?.contains(event.target)) orgStructurePlacement.advanced.open = true;
    }, true);
    orgStructureMemberFormEl.addEventListener("submit", (event) => {
      void saveOrgStructureMember(event);
    });
  }
  orgStructurePlacement.position?.addEventListener("change", () => updateOrgStructurePlacementCode(true, true));
  orgStructurePlacement.term?.addEventListener("input", () => updateOrgStructurePlacementCode(true));
  orgStructurePlacement.order?.addEventListener("input", () => updateOrgStructurePlacementCode());
  orgStructureFields.positionCode?.addEventListener("change", syncOrgStructurePlacementFromCode);
  orgStructureFields.studentId?.addEventListener("input", updateOrgStructureStudentMeta);
  orgStructureFields.studentId?.addEventListener("blur", updateOrgStructureStudentMeta);
  orgStructureFields.positionCode?.addEventListener("input", updateOrgStructureStudentMeta);
  orgStructureFields.positionCode?.addEventListener("blur", updateOrgStructureStudentMeta);
  const orgStructureInteractionEl = orgStructureTableBodyEl?.closest(".org-directory-list-panel") || orgStructureTableBodyEl;
  if (orgStructureInteractionEl) {
    orgStructureInteractionEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const rowEl = target.closest("[data-org-member-id]");
      if (!rowEl) return;
      const id = (rowEl.getAttribute("data-org-member-id") || "").toString();
      const item = currentOrgStructureMembers.find((entry) => entry.id === id);
      if (item) fillOrgStructureForm(item);
    });
    orgStructureInteractionEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target?.closest("button")) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const rowEl = target.closest("[data-org-member-id]");
      if (!rowEl) return;
      event.preventDefault();
      const id = (rowEl.getAttribute("data-org-member-id") || "").toString();
      const item = currentOrgStructureMembers.find((entry) => entry.id === id);
      if (item) fillOrgStructureForm(item);
    });
  }
  orgStructureRefreshBtnEl?.addEventListener("click", () => {
    if (typeof unsubscribeOrgStructureMembers === "function") {
      unsubscribeOrgStructureMembers();
      unsubscribeOrgStructureMembers = null;
    }
    startOrgStructureMembersListener();
  });
  orgStructureExportBtnEl?.addEventListener("click", exportOrgStructureMembersCsv);
  orgStructureArchiveBtnEl?.addEventListener("click", archiveCurrentOrgStructureMember);
  orgStructureResetBtnEl?.addEventListener("click", resetOrgStructureForm);
  orgStructureTermFilterEl?.addEventListener("change", () => {
    orgStructureTermInitialized = true;
    orgStructureFilters.term = orgStructureTermFilterEl.value || "all";
    renderOrgStructureMembers();
  });
  orgStructureStatusFilterEl?.addEventListener("change", () => {
    orgStructureFilters.status = orgStructureStatusFilterEl.value || "all";
    renderOrgStructureMembers();
  });
  orgStructureSearchInputEl?.addEventListener("input", () => {
    orgStructureFilters.query = orgStructureSearchInputEl.value.trim();
    renderOrgStructureMembers();
  });
  orgStructureFields.photoUrl?.addEventListener("input", updateOrgStructurePhotoPreview);
  orgStructureFields.photoUrl?.addEventListener("change", updateOrgStructurePhotoPreview);
  orgStructureFilterResetEl?.addEventListener("click", () => {
    orgStructureTermInitialized = false;
    if (orgStructureSearchInputEl) orgStructureSearchInputEl.value = "";
    if (orgStructureTermFilterEl) orgStructureTermFilterEl.value = "all";
    if (orgStructureStatusFilterEl) orgStructureStatusFilterEl.value = "all";
    orgStructureFilters.query = "";
    orgStructureFilters.term = "all";
    orgStructureFilters.status = "all";
    renderOrgStructureMembers();
  });

  if (staffApprovalTypeStaffBtnEl) {
    staffApprovalTypeStaffBtnEl.addEventListener("click", () => setApprovalType("staff"));
  }
  if (staffApprovalTypeOrgBtnEl) {
    staffApprovalTypeOrgBtnEl.addEventListener("click", () => setApprovalType("org"));
  }
