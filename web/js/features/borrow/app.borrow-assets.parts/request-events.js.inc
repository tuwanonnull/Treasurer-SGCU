  if (hasBorrowFormSection) {
    updateBorrowAcademicYearDisplay();
    void ensureBorrowOrgCodeData().then(() => {
      updateBorrowAcademicYearDisplay();
      populateBorrowProjectTypeOptions();
      renderManagedBorrowProjects();
    });
    populateBorrowProjectTypeOptions();
    renderManagedBorrowProjects();
    if (borrowProjectName) {
      borrowProjectName.addEventListener("change", () => {
        if (borrowManagedProject) borrowManagedProject.value = "";
        const departmentMode = document.getElementById("borrowModeDepartment");
        const projectMode = document.getElementById("borrowModeProject");
        if (departmentMode) departmentMode.checked = true;
        if (projectMode) projectMode.checked = false;
        toggleBorrowProjectNameOther();
        renderManagedBorrowProjects();
      });
      borrowProjectName.addEventListener("focus", () => {
        populateBorrowProjectTypeOptions();
        renderManagedBorrowProjects();
      });
    }
    const firstRow = borrowAssetList.querySelector("[data-asset-row]");
    if (firstRow) {
      updateRowIds(firstRow, 1);
      bindRow(firstRow);
    }

    addBorrowAssetRow.addEventListener("click", () => {
      const rowTemplate = borrowAssetList.querySelector("[data-asset-row]");
      if (!rowTemplate) return;
      const newRow = rowTemplate.cloneNode(true);
      const nextIndex = borrowAssetList.querySelectorAll("[data-asset-row]").length + 1;
      updateRowIds(newRow, nextIndex);
      newRow.querySelectorAll("input").forEach((input) => {
        input.value = "";
      });
      const warning = newRow.querySelector("[data-asset-warning]");
      if (warning) warning.hidden = true;
      const removeBtn = newRow.querySelector("[data-asset-remove]");
      if (removeBtn) removeBtn.hidden = false;
      borrowAssetList.appendChild(newRow);
      bindRow(newRow);
    });

    if (borrowSubmitBtn) {
      borrowSubmitBtn.addEventListener("click", submitBorrowRequest);
    }
    if (borrowClearBtn) {
      borrowClearBtn.addEventListener("click", clearBorrowRequestForm);
    }
  }

  if (staffQueueTableBody) {
    staffQueueTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button[data-action][data-request-id]");
      if (!(button instanceof HTMLButtonElement)) return;
      const action = button.dataset.action || "";
      const requestId = button.dataset.requestId || "";
      const sourceCollection = button.dataset.requestSource || "";
      if (!action || !requestId) return;
      if (action === "detail") {
        const item = getBorrowRequestByKey(requestId, sourceCollection);
        if (item) openBorrowDetailModal(item);
        return;
      }
      if (!ensureStaffPermission()) return;
      if (staffActionInFlight) return;
      staffActionInFlight = true;

      button.disabled = true;
      setStaffQueueMessage("กำลังอัปเดตสถานะคำขอ...", "#6b7280");
      try {
        if (action === "approve") {
          await updateBorrowRequestStatus(requestId, STATUS_APPROVED, "อนุมัติการยืมเรียบร้อย", sourceCollection);
          setStaffQueueMessage("อนุมัติคำขอเรียบร้อย", "#047857");
        } else if (action === "reject") {
          const reason = await askBorrowStatusReason({
            promptText: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
            title: "ไม่อนุมัติคำขอ",
            subtitle: "เหตุผลนี้จะแสดงให้ผู้ยื่นคำขอเห็นเพื่อใช้ประกอบการแก้ไข",
            placeholder: "เช่น อุปกรณ์ไม่พร้อมให้ยืมในช่วงวันดังกล่าว",
            helperText: "ระบุเหตุผลให้ชัดเจน กระชับ และเข้าใจง่าย",
            requiredMessage: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
            submitLabel: "บันทึก"
          });
          if (!reason || !reason.trim()) return;
          await updateBorrowRequestStatus(requestId, STATUS_REJECTED, reason.trim(), sourceCollection);
          setStaffQueueMessage("ไม่อนุมัติคำขอเรียบร้อย", "#047857");
        } else if (action === "cancel") {
          const reason = await askBorrowStatusReason({
            promptText: "กรุณาระบุเหตุผลการยกเลิกคำขอ",
            title: "ยกเลิกคำขอ",
            subtitle: "ข้อความนี้จะแสดงให้ผู้ยื่นคำขอเห็น",
            initialValue: "ยกเลิกคำขอโดยเจ้าหน้าที่",
            placeholder: "เช่น คำขอซ้ำกับรายการเดิม",
            helperText: "โปรดอธิบายเหตุผลการยกเลิกให้ผู้ยื่นคำขอเข้าใจ",
            requiredMessage: "กรุณาระบุเหตุผลการยกเลิกคำขอ",
            submitLabel: "บันทึก"
          });
          if (!reason || !reason.trim()) return;
          await updateBorrowRequestStatus(requestId, STATUS_CANCELLED, reason.trim(), sourceCollection);
          setStaffQueueMessage("ยกเลิกคำขอเรียบร้อย", "#047857");
        } else if (action === "returned") {
          await updateBorrowRequestStatus(requestId, STATUS_RETURNED, "ส่งคืนพัสดุเรียบร้อย", sourceCollection);
          setStaffQueueMessage("บันทึกคืนพัสดุเรียบร้อย", "#047857");
        } else if (action === "delete") {
          const confirmed = await confirmBorrowDelete(requestId, sourceCollection);
          if (!confirmed) return;
          await deleteBorrowRequest(requestId, sourceCollection);
          renderBorrowRequests();
          setStaffQueueMessage("ลบคำขอเรียบร้อย", "#047857");
        }
      } catch (error) {
        setStaffQueueMessage(
          formatBorrowStatusUpdateError(error),
          "#b91c1c"
        );
        console.error("borrow request status update failed - app.borrow-assets.js:2389", error);
      } finally {
        button.disabled = false;
        staffActionInFlight = false;
      }
    });

    const onBorrowStatusSelectChange = async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (target.dataset.role !== "borrow-status-select") return;
      if (!ensureStaffPermission()) return;
      const requestId = target.dataset.id || "";
      const sourceCollection = target.dataset.source || "";
      const nextValue = (target.value || "").toString().trim().toLowerCase();
      if (!requestId || !nextValue) return;
      const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
      if (!requestItem) return;

      const prevValue = requestItem.status;
      target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
      target.classList.add(borrowStatusSelectClass(nextValue));

      if (nextValue === "delete") {
        const confirmed = await confirmBorrowDelete(requestId, sourceCollection);
        if (!confirmed) {
          target.value = prevValue;
          target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
          target.classList.add(borrowStatusSelectClass(prevValue));
          return;
        }
        try {
          await deleteBorrowRequest(requestId, sourceCollection);
          renderBorrowRequests();
          setStaffQueueMessage("ลบคำขอเรียบร้อย", "#047857");
          return;
        } catch (error) {
          target.value = prevValue;
          target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
          target.classList.add(borrowStatusSelectClass(prevValue));
          setStaffQueueMessage(formatBorrowStatusUpdateError(error, "ลบคำขอไม่สำเร็จ"), "#b91c1c");
          console.error("borrow request delete failed", error);
          return;
        }
      }

      if (![STATUS_PENDING, STATUS_APPROVED, STATUS_RECEIVED, STATUS_REJECTED, STATUS_CANCELLED, STATUS_RETURNED].includes(nextValue)) {
        target.value = prevValue;
        target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
        target.classList.add(borrowStatusSelectClass(prevValue));
        return;
      }
      if (prevValue === nextValue) return;

      let noteText = (requestItem.staffNote || "").toString().trim();
      if (nextValue === STATUS_REJECTED) {
        const reason = await askBorrowStatusReason({
          promptText: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
          title: "ไม่อนุมัติคำขอ",
          subtitle: "เหตุผลนี้จะแสดงให้ผู้ยื่นคำขอเห็นเพื่อใช้ประกอบการแก้ไข",
          initialValue: noteText,
          placeholder: "เช่น อุปกรณ์ไม่พร้อมให้ยืมในช่วงวันดังกล่าว",
          helperText: "ระบุเหตุผลให้ชัดเจน กระชับ และเข้าใจง่าย",
          requiredMessage: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
          submitLabel: "บันทึก"
        });
        if (!reason || !reason.trim()) {
          target.value = prevValue;
          target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
          target.classList.add(borrowStatusSelectClass(prevValue));
          return;
        }
        noteText = reason.trim();
      } else if (nextValue === STATUS_CANCELLED) {
        const reason = await askBorrowStatusReason({
          promptText: "กรุณาระบุเหตุผลการยกเลิกคำขอ",
          title: "ยกเลิกคำขอ",
          subtitle: "ข้อความนี้จะแสดงให้ผู้ยื่นคำขอเห็น",
          initialValue: noteText || "ยกเลิกคำขอโดยเจ้าหน้าที่",
          placeholder: "เช่น คำขอซ้ำกับรายการเดิม",
          helperText: "โปรดอธิบายเหตุผลการยกเลิกให้ผู้ยื่นคำขอเข้าใจ",
          requiredMessage: "กรุณาระบุเหตุผลการยกเลิกคำขอ",
          submitLabel: "บันทึก"
        });
        if (!reason || !reason.trim()) {
          target.value = prevValue;
          target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
          target.classList.add(borrowStatusSelectClass(prevValue));
          return;
        }
        noteText = reason.trim();
      } else if (nextValue === STATUS_APPROVED && !noteText) {
        noteText = "อนุมัติการยืมเรียบร้อย";
      } else if (nextValue === STATUS_RECEIVED && !noteText) {
        noteText = "รับพัสดุเรียบร้อยแล้ว";
      } else if (nextValue === STATUS_RETURNED && !noteText) {
        noteText = "ส่งคืนพัสดุเรียบร้อย";
      }

      try {
        await updateBorrowRequestStatus(requestId, nextValue, noteText, sourceCollection);
        setStaffQueueMessage("อัปเดตสถานะเรียบร้อย", "#047857");
      } catch (error) {
        target.value = prevValue;
        target.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
        target.classList.add(borrowStatusSelectClass(prevValue));
        setStaffQueueMessage(
          formatBorrowStatusUpdateError(error),
          "#b91c1c"
        );
        console.error("borrow request status update failed", error);
      }
    };

    staffQueueTableBody.addEventListener("change", onBorrowStatusSelectChange);
    if (staffHistoryTableBody) {
      staffHistoryTableBody.addEventListener("change", onBorrowStatusSelectChange);
    }

    staffQueueTableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, select, option, input, textarea, [data-role]")) return;
      const row = target.closest("tr[data-request-id]");
      if (!row) return;
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });

    if (staffHistoryTableBody) {
      staffHistoryTableBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("button, select, option, input, textarea, [data-role]")) return;
        const row = target.closest("tr[data-request-id]");
        if (!row) return;
        const requestId = row.getAttribute("data-request-id") || "";
        const sourceCollection = row.getAttribute("data-request-source") || "";
        if (!requestId) return;
        const item = getBorrowRequestByKey(requestId, sourceCollection);
        if (item) openBorrowDetailModal(item);
      });

      staffHistoryTableBody.addEventListener("keydown", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const row = target.closest("tr[data-request-id]");
        if (!row) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const requestId = row.getAttribute("data-request-id") || "";
        const sourceCollection = row.getAttribute("data-request-source") || "";
        if (!requestId) return;
        const item = getBorrowRequestByKey(requestId, sourceCollection);
        if (item) openBorrowDetailModal(item);
      });
    }
  }

  if (myRequestsTableBody) {
    myRequestsTableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button[data-action='detail'][data-request-id]");
      if (button instanceof HTMLButtonElement) {
        const item = getBorrowRequestByKey(button.dataset.requestId || "", button.dataset.requestSource || "");
        if (item) openBorrowDetailModal(item);
        return;
      }
      if (target.closest("button, select, option, input, textarea, a")) return;
      const row = target.closest("tr[data-request-id]");
      if (!row) return;
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });

    myRequestsTableBody.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const row = target.closest("tr[data-request-id]");
      if (!row) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });
  }

  if (myRequestsCardsEl) {
    myRequestsCardsEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, select, option, input, textarea, a")) return;
      const row = target.closest("[data-request-id]");
      if (!row) return;
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });

    myRequestsCardsEl.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const row = target.closest("[data-request-id]");
      if (!row) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const requestId = row.getAttribute("data-request-id") || "";
      const sourceCollection = row.getAttribute("data-request-source") || "";
      if (!requestId) return;
      const item = getBorrowRequestByKey(requestId, sourceCollection);
      if (item) openBorrowDetailModal(item);
    });
  }

  myRequestsExportCsvBtn?.addEventListener("click", () => {
    exportBorrowRowsCsv(getMyBorrowRequestRows(), "borrow-my-requests");
  });
  staffBorrowExportCsvBtn?.addEventListener("click", () => {
    const name = staffRequestTabMode === "history" ? "borrow-staff-history" : "borrow-staff-queue";
    exportBorrowRowsCsv(getStaffBorrowVisibleRows(), name);
  });
  staffBorrowPickupDaysForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveStaffBorrowPickupDays();
  });

  updateBorrowPickupDateRule();
  void loadStaffBorrowPickupDays();
  loadBorrowAssets();

  if (borrowAssetsSearch) {
    borrowAssetsSearch.addEventListener("input", applyBorrowAssetsFilters);
  }
  if (borrowAssetsSearchClear && borrowAssetsSearch) {
    borrowAssetsSearchClear.addEventListener("click", () => {
      borrowAssetsSearch.value = "";
      applyBorrowAssetsFilters();
    });
  }
  if (borrowAssetsSearchStaff) {
    borrowAssetsSearchStaff.addEventListener("input", () => {
      staffAssetsPage = 1;
      applyBorrowAssetsFilters();
    });
  }
  if (borrowAssetsSearchStaffClear && borrowAssetsSearchStaff) {
    borrowAssetsSearchStaffClear.addEventListener("click", () => {
      borrowAssetsSearchStaff.value = "";
      staffAssetsPage = 1;
      applyBorrowAssetsFilters();
    });
  }
  if (borrowAssetsTypeFilter) {
    borrowAssetsTypeFilter.addEventListener("change", applyBorrowAssetsFilters);
  }
  if (borrowAssetsTypeFilterStaff) {
    borrowAssetsTypeFilterStaff.addEventListener("change", () => {
      staffAssetsPage = 1;
      applyBorrowAssetsFilters();
    });
  }

  const resetStaffBorrowRequestPages = () => {
    staffRequestPageByMode.queue = 1;
    staffRequestPageByMode.history = 1;
  };

  const applyStaffBorrowRequestFilters = () => {
    resetStaffBorrowRequestPages();
    updateStaffBorrowMobileFilterToggle();
    renderBorrowRequests();
  };

  const clearStaffBorrowRequestFilters = () => {
    if (staffBorrowRequestSearch) staffBorrowRequestSearch.value = "";
    clearStaffBorrowAdvancedFilters();
  };

  const clearStaffBorrowAdvancedFilters = () => {
    if (staffBorrowRequestProjectFilter) staffBorrowRequestProjectFilter.value = "all";
    if (staffBorrowRequestStatusFilter) staffBorrowRequestStatusFilter.value = "all";
    if (staffBorrowRequestOrgFilter) staffBorrowRequestOrgFilter.value = "all";
    if (staffBorrowRequestDeptFilter) staffBorrowRequestDeptFilter.value = "all";
    if (staffBorrowRequestDueFilter) staffBorrowRequestDueFilter.value = "all";
    if (staffBorrowRequestPickupFrom) staffBorrowRequestPickupFrom.value = "";
    if (staffBorrowRequestPickupTo) staffBorrowRequestPickupTo.value = "";
    if (staffBorrowRequestReturnFrom) staffBorrowRequestReturnFrom.value = "";
    if (staffBorrowRequestReturnTo) staffBorrowRequestReturnTo.value = "";
    applyStaffBorrowRequestFilters();
  };

  [
    staffBorrowRequestSearch,
    staffBorrowRequestPickupFrom,
    staffBorrowRequestPickupTo,
    staffBorrowRequestReturnFrom,
    staffBorrowRequestReturnTo
  ].forEach((input) => {
    input?.addEventListener("input", applyStaffBorrowRequestFilters);
  });
  [
    staffBorrowRequestProjectFilter,
    staffBorrowRequestStatusFilter,
    staffBorrowRequestOrgFilter,
    staffBorrowRequestDeptFilter,
    staffBorrowRequestDueFilter
  ].forEach((select) => {
    select?.addEventListener("change", applyStaffBorrowRequestFilters);
  });
  staffBorrowRequestSearchClear?.addEventListener("click", () => {
    if (staffBorrowRequestSearch) staffBorrowRequestSearch.value = "";
    applyStaffBorrowRequestFilters();
    staffBorrowRequestSearch?.focus();
  });
  document.getElementById("staffBorrowRequestFiltersReset")?.addEventListener("click", clearStaffBorrowRequestFilters);
  document.getElementById("staffBorrowAdvancedToggle")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const panel = document.getElementById("staffBorrowAdvancedFilters");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
  });
  updateStaffBorrowMobileFilterToggle();

  staffAssetsPagerEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.borrowAssetsPageAction;
    if (action !== "prev" && action !== "next") return;
    staffAssetsPage = action === "next"
      ? staffAssetsPage + 1
      : Math.max(1, staffAssetsPage - 1);
    applyBorrowAssetsFilters();
  });

  const staffTabBtns = document.querySelectorAll(".tab-btn[data-assets-staff-tab]");
  const staffMainTabBtns = document.querySelectorAll(".tab-btn[data-assets-staff-main-tab]");
  const staffBorrowQueue = document.getElementById("staffBorrowQueue");
  const staffBorrowInventory = document.getElementById("staffBorrowInventory");
  const staffBorrowHistory = document.getElementById("staffBorrowHistory");
  const staffBorrowSettings = document.getElementById("staffBorrowSettings");
