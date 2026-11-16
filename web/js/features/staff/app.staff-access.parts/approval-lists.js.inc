  const renderMyApplications = () => {
    if (!myTableBodyEl || !myCaptionEl) return;
    myCaptionEl.textContent = `แสดงผล ${currentMyApplications.length} รายการ`;

    if (!currentMyApplications.length) {
      myTableBodyEl.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState("ยังไม่มีคำขอสมัครสตาฟ", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "document")}</td></tr>`;
      return;
    }

    myTableBodyEl.innerHTML = currentMyApplications
      .map((item) => {
          const reviewerNote = (item.reviewedNote || "").toString().trim();
          return `
            <tr>
              <td data-label="เวลายื่นคำขอ">${toSafeText(formatDateTime(item.createdAt))}</td>
              <td data-label="ตำแหน่ง">${toSafeText(item.requestedPosition || "-")}</td>
              <td data-label="สถานะ">${mapStatusBadge(item.status)}</td>
              <td data-label="หมายเหตุ">${toSafeText(reviewerNote || "-")}</td>
            </tr>
          `;
      })
      .join("");
  };

  const getStaffApprovalItemPositions = (item = {}, isHistory = false) => {
    if (isHistory && Array.isArray(item.approvedItems)) {
      return item.approvedItems
        .map((entry) => normalizePositionText(entry?.position || ""))
        .filter(Boolean);
    }
    return [normalizePositionText(item.requestedPosition || item.approvedPosition || "")].filter(Boolean);
  };

  const getStaffApprovalItemDivisions = (item = {}, isHistory = false) => {
    const codes = new Set();
    getStaffApprovalItemPositions(item, isHistory).forEach((position) => {
      const meta = findPositionAccessMeta(position, "", "");
      const yy = normalizeCode2(meta?.divisionCodeYY || meta?.yy || "");
      if (yy) codes.add(yy);
    });
    if (isHistory && Array.isArray(item.approvedItems)) {
      item.approvedItems.forEach((entry) => {
        const match = (entry?.code || "").toString().match(/\.10\.(\d{2})\./);
        if (match?.[1]) codes.add(normalizeCode2(match[1]));
      });
    }
    return Array.from(codes);
  };

  const getStaffApprovalPositionDivision = (position = "", code = "") => {
    const meta = findPositionAccessMeta(position, "", "");
    const catalogYY = normalizeCode2(meta?.divisionCodeYY || meta?.yy || "");
    if (catalogYY) return catalogYY;
    const codeMatch = (code || "").toString().match(/\.10\.(\d{2})\./);
    return codeMatch?.[1] ? normalizeCode2(codeMatch[1]) : "";
  };

  const getStaffApprovalItemTime = (item = {}) => {
    const value = item.primaryUpdatedAt || item.updatedAt || item.createdAt || null;
    if (typeof value?.toMillis === "function") return value.toMillis();
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  const renderStaffApprovalFilterOptions = (items = [], isHistory = false) => {
    const allPositions = Array.from(
      new Set(items.flatMap((item) => getStaffApprovalItemPositions(item, isHistory)))
    ).sort((a, b) => a.localeCompare(b, "th"));
    const divisions = Array.from(
      new Set(items.flatMap((item) => getStaffApprovalItemDivisions(item, isHistory)))
    ).sort();
    const positionDivisionMap = new Map();
    items.forEach((item) => {
      if (isHistory && Array.isArray(item.approvedItems)) {
        item.approvedItems.forEach((entry) => {
          const position = normalizePositionText(entry?.position || "");
          const division = getStaffApprovalPositionDivision(position, entry?.code || "");
          if (position && division) positionDivisionMap.set(position, division);
        });
        return;
      }
      const position = normalizePositionText(item.requestedPosition || item.approvedPosition || "");
      const division = getStaffApprovalPositionDivision(position, item.approvedPositionCode || "");
      if (position && division) positionDivisionMap.set(position, division);
    });
    staffApprovalPositionDivisionMap = positionDivisionMap;
    const positions = staffApprovalFilters.division === "all"
      ? allPositions
      : allPositions.filter((position) => positionDivisionMap.get(position) === staffApprovalFilters.division);
    if (staffApprovalPositionFilterEl) {
      const current = staffApprovalFilters.position;
      staffApprovalPositionFilterEl.innerHTML = [
        '<option value="all">ทุกตำแหน่ง</option>',
        ...positions.map((position) => `<option value="${toSafeText(position)}">${toSafeText(position)}</option>`)
      ].join("");
      staffApprovalPositionFilterEl.value = positions.includes(current) ? current : "all";
      staffApprovalFilters.position = staffApprovalPositionFilterEl.value;
    }
    if (staffApprovalDivisionFilterEl) {
      const current = staffApprovalFilters.division;
      staffApprovalDivisionFilterEl.innerHTML = [
        '<option value="all">ทุกฝ่าย</option>',
        ...divisions.map((code) => `<option value="${toSafeText(code)}">${toSafeText(`${code} · ${divisionCodeLabel(code)}`)}</option>`)
      ].join("");
      staffApprovalDivisionFilterEl.value = divisions.includes(current) ? current : "all";
      staffApprovalFilters.division = staffApprovalDivisionFilterEl.value;
    }
  };

  const filterAndSortStaffApprovalItems = (items = [], isHistory = false) => {
    const isActiveView = isHistory
      ? currentApprovalView === "history"
      : currentApprovalView === "pending";
    if (isActiveView) renderStaffApprovalFilterOptions(items, isHistory);
    const query = staffApprovalFilters.query.toLocaleLowerCase("th");
    const filtered = items.filter((item) => {
      const positions = getStaffApprovalItemPositions(item, isHistory);
      const divisions = getStaffApprovalItemDivisions(item, isHistory);
      const codes = isHistory && Array.isArray(item.approvedItems)
        ? item.approvedItems.map((entry) => (entry?.code || "").toString())
        : [];
      const haystack = [
        item.applicantName,
        item.applicantNick,
        item.applicantEmail,
        item.applicantUid,
        ...positions,
        ...codes
      ].join(" ").toLocaleLowerCase("th");
      return (!query || haystack.includes(query)) &&
        (staffApprovalFilters.division === "all" || divisions.includes(staffApprovalFilters.division)) &&
        (staffApprovalFilters.position === "all" || positions.includes(staffApprovalFilters.position));
    });
    return filtered.sort((a, b) => {
      if (staffApprovalFilters.sort === "name") {
        return (a.applicantName || "").toString().localeCompare((b.applicantName || "").toString(), "th");
      }
      const delta = getStaffApprovalItemTime(a) - getStaffApprovalItemTime(b);
      return staffApprovalFilters.sort === "oldest" ? delta : -delta;
    });
  };

  const syncPendingBulkSelectionUi = () => {
    const selectedCount = selectedPendingApplicationIds.size;
    if (staffApprovalBulkBarEl) staffApprovalBulkBarEl.hidden = selectedCount === 0;
    if (staffApprovalBulkCountEl) staffApprovalBulkCountEl.textContent = `เลือกแล้ว ${selectedCount} รายการ`;
    if (staffApprovalSelectAllEl) {
      const selectedVisibleCount = visiblePendingApplicationIds.filter((id) => selectedPendingApplicationIds.has(id)).length;
      staffApprovalSelectAllEl.checked = visiblePendingApplicationIds.length > 0 && selectedVisibleCount === visiblePendingApplicationIds.length;
      staffApprovalSelectAllEl.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visiblePendingApplicationIds.length;
      staffApprovalSelectAllEl.disabled = visiblePendingApplicationIds.length === 0;
    }
    approvalBodyEl?.querySelectorAll(".staff-approval-row-select").forEach((checkbox) => {
      if (!(checkbox instanceof HTMLInputElement)) return;
      checkbox.checked = selectedPendingApplicationIds.has((checkbox.dataset.applicationId || "").toString());
    });
  };

  const clearPendingBulkSelection = () => {
    selectedPendingApplicationIds.clear();
    syncPendingBulkSelectionUi();
  };

  const syncCurrentStaffBulkSelectionUi = () => {
    const selectedCount = selectedCurrentStaffKeys.size;
    if (staffCurrentBulkBarEl) staffCurrentBulkBarEl.hidden = selectedCount === 0;
    if (staffCurrentBulkCountEl) staffCurrentBulkCountEl.textContent = `เลือกแล้ว ${selectedCount} คน`;
    if (staffCurrentSelectAllEl) {
      const selectedVisibleCount = visibleCurrentStaffKeys.filter((key) => selectedCurrentStaffKeys.has(key)).length;
      staffCurrentSelectAllEl.checked = visibleCurrentStaffKeys.length > 0 && selectedVisibleCount === visibleCurrentStaffKeys.length;
      staffCurrentSelectAllEl.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleCurrentStaffKeys.length;
      staffCurrentSelectAllEl.disabled = visibleCurrentStaffKeys.length === 0;
    }
    approvalHistoryBodyEl?.querySelectorAll(".staff-current-row-select").forEach((checkbox) => {
      if (!(checkbox instanceof HTMLInputElement)) return;
      checkbox.checked = selectedCurrentStaffKeys.has((checkbox.dataset.staffKey || "").toString());
    });
  };

  const clearCurrentStaffBulkSelection = () => {
    selectedCurrentStaffKeys.clear();
    syncCurrentStaffBulkSelectionUi();
  };

  const setBulkSelectionMode = (mode, enabled) => {
    const isCurrent = mode === "current";
    const contentEl = isCurrent ? approvalHistoryContentEl : staffApprovalPendingContentEl;
    const toggleBtnEl = isCurrent ? staffCurrentSelectionToggleBtnEl : staffApprovalSelectionToggleBtnEl;
    contentEl?.classList.toggle("is-selection-mode", enabled);
    if (toggleBtnEl) {
      toggleBtnEl.setAttribute("aria-pressed", enabled ? "true" : "false");
      toggleBtnEl.textContent = enabled ? "เสร็จสิ้น" : "เลือกหลายรายการ";
    }
    if (!enabled) {
      if (isCurrent) clearCurrentStaffBulkSelection();
      else clearPendingBulkSelection();
    }
  };

  const askPendingBulkDeleteConfirm = (count, mode = "pending") => {
    const modalEl = staffBulkDeleteConfirmModalEl;
    const textEl = document.getElementById("staffBulkDeleteConfirmText");
    const submitEl = document.getElementById("staffBulkDeleteConfirmSubmit");
    const cancelEl = document.getElementById("staffBulkDeleteConfirmCancel");
    const closeEl = document.getElementById("staffBulkDeleteConfirmClose");
    const titleEl = document.getElementById("staffBulkDeleteConfirmTitle");
    const noteEl = document.getElementById("staffBulkDeleteConfirmNote");
    const isRevoke = mode === "revoke";
    if (titleEl) titleEl.textContent = isRevoke ? "ยืนยันเพิกถอนสิทธิ์สตาฟ" : "ยืนยันลบคำขอ";
    if (textEl) textEl.textContent = isRevoke
      ? `ต้องการเพิกถอนสิทธิ์สตาฟของผู้ที่เลือก ${count} คนใช่หรือไม่`
      : `ต้องการลบคำขอที่เลือก ${count} รายการใช่หรือไม่`;
    if (noteEl) noteEl.textContent = isRevoke
      ? "ตำแหน่งและสิทธิ์เข้าใช้ Staff ทั้งหมดของผู้ที่เลือกจะถูกลบ แต่ Activity Log จะยังคงอยู่"
      : "การดำเนินการนี้ลบเฉพาะใบสมัครที่รออนุมัติ และไม่กระทบบัญชีสตาฟที่อนุมัติแล้ว";
    if (submitEl) submitEl.textContent = isRevoke ? "ยืนยันเพิกถอนสิทธิ์" : "ยืนยันลบคำขอ";
    if (!modalEl || !(submitEl instanceof HTMLButtonElement) || !(cancelEl instanceof HTMLButtonElement) || !(closeEl instanceof HTMLButtonElement)) {
      return Promise.resolve(window.confirm(isRevoke
        ? `ยืนยันเพิกถอนสิทธิ์สตาฟที่เลือก ${count} คน?`
        : `ยืนยันลบคำขอที่เลือก ${count} รายการ?`));
    }
    return new Promise((resolve) => {
      const cleanup = () => {
        submitEl.removeEventListener("click", onSubmit);
        cancelEl.removeEventListener("click", onCancel);
        closeEl.removeEventListener("click", onCancel);
        modalEl.removeEventListener("click", onBackdrop);
        modalEl.removeEventListener("keydown", onKeydown);
      };
      const finish = (value) => {
        cleanup();
        if (typeof closeDialog === "function") closeDialog(modalEl);
        else {
          modalEl.classList.remove("show");
          modalEl.setAttribute("aria-hidden", "true");
        }
        resolve(value);
      };
      const onSubmit = () => finish(true);
      const onCancel = () => finish(false);
      const onBackdrop = (event) => { if (event.target === modalEl) onCancel(); };
      const onKeydown = (event) => { if (event.key === "Escape") onCancel(); };
      submitEl.addEventListener("click", onSubmit);
      cancelEl.addEventListener("click", onCancel);
      closeEl.addEventListener("click", onCancel);
      modalEl.addEventListener("click", onBackdrop);
      modalEl.addEventListener("keydown", onKeydown);
      if (typeof openDialog === "function") openDialog(modalEl, { focusSelector: "#staffBulkDeleteConfirmCancel" });
      else {
        modalEl.classList.add("show");
        modalEl.setAttribute("aria-hidden", "false");
      }
    });
  };

  const renderApprovalRows = () => {
    if (!approvalBodyEl || !approvalCaptionEl) return;

    try {
      const filteredApplications = filterAndSortStaffApprovalItems(currentPendingApplications, false);
      const validPendingIds = new Set(currentPendingApplications.map((item) => (item.id || "").toString()).filter(Boolean));
      Array.from(selectedPendingApplicationIds).forEach((id) => {
        if (!validPendingIds.has(id)) selectedPendingApplicationIds.delete(id);
      });
      visiblePendingApplicationIds = filteredApplications.map((item) => (item.id || "").toString()).filter(Boolean);
      approvalCaptionEl.textContent = `แสดงผล ${filteredApplications.length} จาก ${currentPendingApplications.length} รายการ`;
      setMessage(approvalMessageEl, "", "#6b7280");
      if (!filteredApplications.length) {
        approvalBodyEl.innerHTML = `<tr><td colspan="5" class="list-empty-cell">${renderListEmptyState(currentPendingApplications.length ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ไม่มีคำขอที่รออนุมัติ", "ตรวจสอบตัวกรองที่เลือก หรือกลับมาดูเมื่อมีรายการใหม่")}</td></tr>`;
        syncPendingBulkSelectionUi();
        refreshSummaryCounts();
        syncApprovalPanelCaption();
        return;
      }

      approvalBodyEl.innerHTML = filteredApplications
        .map((item) => {
          const id = (item.id || "").toString();
          const applicantEmail = (item.applicantEmail || "").toString().trim().toLowerCase();
          const applicantName = (item.applicantName || "-").toString();
          const applicantNick = (item.applicantNick || "").toString();
          const createdAtText = typeof formatDateTime === "function"
            ? formatDateTime(item.createdAt)
            : "-";
          const requestedPosition = (item.requestedPosition || "").toString();
          return `
            <tr
              data-application-id="${toSafeText(id)}"
              data-applicant-email="${toSafeText(applicantEmail)}"
              data-applicant-name="${toSafeText(applicantName)}"
              data-applicant-nick="${toSafeText(applicantNick)}"
            >
              <td class="staff-bulk-select-cell" data-label="เลือก">
                <input class="staff-approval-row-select" type="checkbox" data-application-id="${toSafeText(id)}" aria-label="เลือกคำขอของ ${toSafeText(applicantName)}" ${selectedPendingApplicationIds.has(id) ? "checked" : ""} />
              </td>
              <td data-label="ผู้สมัคร">
                <div>${toSafeText(applicantName)}</div>
                <div class="section-text-sm">${toSafeText(applicantEmail || "-")}</div>
              </td>
              <td data-label="เวลายื่นคำขอ">${toSafeText(createdAtText)}</td>
              <td data-label="ตำแหน่งที่ขอ">
                <input
                  type="text"
                  class="login-input staff-approval-position-input"
                  list="staffPositionOptionsList"
                  data-application-id="${toSafeText(id)}"
                  value="${toSafeText(requestedPosition)}"
                  placeholder="ตำแหน่งที่อนุมัติ"
                />
              </td>
              <td data-label="จัดการคำขอ">
                <select
                  class="staff-status-select is-pending staff-approval-action-select"
                  data-role="status-select"
                  data-application-id="${toSafeText(id)}"
                  aria-label="จัดการคำขอสตาฟ"
                >
                  <option value="pending" selected>รออนุมัติ</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="rejected">ไม่อนุมัติ</option>
                  <option value="remove">ลบคำขอ</option>
                </select>
              </td>
            </tr>
          `;
        })
        .join("");
      syncPendingBulkSelectionUi();
      refreshSummaryCounts();
      syncApprovalPanelCaption();
    } catch (error) {
      console.error("renderApprovalRows failed - app.staff-access.js:2991", error);
      approvalBodyEl.innerHTML = `<tr><td colspan="5">แสดงผลคำขอไม่สำเร็จ: ${toSafeText(error?.message || "unknown")}</td></tr>`;
      setMessage(approvalMessageEl, "แสดงผลคำขอไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
    }
  };

  const renderApprovedHistory = () => {
    if (!approvalHistoryBodyEl || !approvalHistoryCaptionEl) return;

    try {
      const groupedMap = new Map();
      currentApprovedHistory.forEach((item) => {
        const emailKey = (item.applicantEmail || "").toString().trim().toLowerCase();
        const uidKey = (item.applicantUid || "").toString().trim();
        const fallbackKey = (item.id || "").toString().trim();
        const key = emailKey || uidKey || fallbackKey;
        if (!key) return;
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            key,
            applicantEmail: item.applicantEmail || "",
            applicantUid: item.applicantUid || "",
            applicantName: item.applicantName || "-",
            applicantNick: item.applicantNick || "",
            primaryApplicationId: (item.id || "").toString(),
            primaryUpdatedAt: item.updatedAt || item.createdAt || null,
            approvedPosition: item.approvedPosition || item.requestedPosition || "-",
            approvedPositionCode: item.approvedPositionCode || "-",
            reviewedByEmail: item.reviewedByEmail || "",
            reviewedNote: item.reviewedNote || "",
            approvedItems: []
          });
        }
        const target = groupedMap.get(key);
        if (!target.applicantEmail && item.applicantEmail) {
          target.applicantEmail = item.applicantEmail;
        }
        if (!target.applicantUid && item.applicantUid) {
          target.applicantUid = item.applicantUid;
        }
        if ((!target.applicantName || target.applicantName === "-") && item.applicantName) {
          target.applicantName = item.applicantName;
        }
        if (!target.applicantNick && item.applicantNick) {
          target.applicantNick = item.applicantNick;
        }
        target.approvedItems.push({
          id: (item.id || "").toString(),
          position: (item.approvedPosition || item.requestedPosition || "-").toString(),
          code: (item.approvedPositionCode || "-").toString(),
          reviewedByEmail: (item.reviewedByEmail || "").toString(),
          reviewedNote: (item.reviewedNote || "").toString(),
          approvedAt: item.updatedAt || item.createdAt || null
        });

        const currentTime = typeof target.primaryUpdatedAt?.toMillis === "function"
          ? target.primaryUpdatedAt.toMillis()
          : new Date(target.primaryUpdatedAt || 0).getTime();
        const itemTime = typeof item?.updatedAt?.toMillis === "function"
          ? item.updatedAt.toMillis()
          : new Date(item?.updatedAt || item?.createdAt || 0).getTime();
        if ((Number.isFinite(itemTime) ? itemTime : 0) > (Number.isFinite(currentTime) ? currentTime : 0)) {
          target.primaryApplicationId = (item.id || "").toString();
          target.primaryUpdatedAt = item.updatedAt || item.createdAt || null;
          target.approvedPosition = item.approvedPosition || item.requestedPosition || "-";
          target.approvedPositionCode = item.approvedPositionCode || "-";
          target.reviewedByEmail = item.reviewedByEmail || "";
          target.reviewedNote = item.reviewedNote || "";
        }
      });

      currentApprovedHistoryGrouped = Array.from(groupedMap.values()).sort((a, b) => {
        const aTime = typeof a?.primaryUpdatedAt?.toMillis === "function"
          ? a.primaryUpdatedAt.toMillis()
          : new Date(a?.primaryUpdatedAt || 0).getTime();
        const bTime = typeof b?.primaryUpdatedAt?.toMillis === "function"
          ? b.primaryUpdatedAt.toMillis()
          : new Date(b?.primaryUpdatedAt || 0).getTime();
        return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      });

      const filteredHistory = filterAndSortStaffApprovalItems(currentApprovedHistoryGrouped, true);
      const validStaffKeys = new Set(currentApprovedHistoryGrouped.map((item) => (item.key || "").toString()).filter(Boolean));
      Array.from(selectedCurrentStaffKeys).forEach((key) => {
        if (!validStaffKeys.has(key)) selectedCurrentStaffKeys.delete(key);
      });
      visibleCurrentStaffKeys = filteredHistory.map((item) => (item.key || "").toString()).filter(Boolean);
      approvalHistoryCaptionEl.textContent = `แสดงผล ${filteredHistory.length} จาก ${currentApprovedHistoryGrouped.length} รายการ`;
      if (!currentPendingApplications.length) {
        setMessage(approvalMessageEl, "", "#6b7280");
      }
      if (!filteredHistory.length) {
        approvalHistoryBodyEl.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState(currentApprovedHistoryGrouped.length ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ยังไม่มีรายการที่อนุมัติ", "ตรวจสอบตัวกรองที่เลือก หรือกลับมาดูเมื่อมีรายการใหม่")}</td></tr>`;
        syncCurrentStaffBulkSelectionUi();
        refreshSummaryCounts();
        syncApprovalPanelCaption();
        return;
      }

      approvalHistoryBodyEl.innerHTML = filteredHistory
        .map((item) => {
          const id = (item.primaryApplicationId || "").toString();
          const approvedPosition = (item.approvedPosition || "-").toString();
          const applicantName = (item.applicantName || "-").toString();
          const applicantEmail = (item.applicantEmail || "-").toString();
          const approvedCodes = Array.from(
            new Set(
              (Array.isArray(item.approvedItems) ? item.approvedItems : [])
                .map((entry) => (entry?.code || "").toString().trim())
                .filter(Boolean)
            )
          );
          const approvedPositionCode = approvedCodes.length
            ? approvedCodes.map((code) => `<span class="staff-approval-history-code">${toSafeText(code)}</span>`).join(" ")
            : `<span class="staff-approval-history-code">-</span>`;
          return `
            <tr class="staff-approval-history-row" data-application-id="${toSafeText(id)}" data-staff-key="${toSafeText(item.key || "")}">
              <td class="staff-bulk-select-cell" data-label="เลือก">
                <input class="staff-current-row-select" type="checkbox" data-staff-key="${toSafeText(item.key || "")}" aria-label="เลือกสตาฟ ${toSafeText(applicantName)}" ${selectedCurrentStaffKeys.has((item.key || "").toString()) ? "checked" : ""} />
              </td>
              <td data-label="ผู้ที่ถูกอนุมัติ">
                <div>${toSafeText(applicantName)}</div>
                <div class="section-text-sm">${toSafeText(applicantEmail)}</div>
              </td>
              <td data-label="ตำแหน่ง">${toSafeText(approvedPosition)}</td>
              <td data-label="รหัสตำแหน่ง">${approvedPositionCode}</td>
            </tr>
          `;
        })
        .join("");
      syncCurrentStaffBulkSelectionUi();

      refreshSummaryCounts();
      syncApprovalPanelCaption();
    } catch (error) {
      console.error("renderApprovedHistory failed - app.staff-access.js:3126", error);
      approvalHistoryBodyEl.innerHTML = `<tr><td colspan="4">แสดงผลรายชื่อไม่สำเร็จ: ${toSafeText(error?.message || "unknown")}</td></tr>`;
    }
  };

