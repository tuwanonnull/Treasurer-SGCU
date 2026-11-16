  const syncApprovalPanelCaption = () => {
    if (!approvalPanelCaptionEl) return;
    approvalPanelCaptionEl.textContent = currentApprovalView === "history"
      ? (approvalHistoryCaptionEl?.textContent || "แสดงผล 0 รายการ")
      : (approvalCaptionEl?.textContent || "แสดงผล 0 รายการ");
  };

  const setApprovalView = (view = "pending") => {
    currentApprovalView = view === "history" ? "history" : "pending";
    const showPending = currentApprovalView === "pending";
    if (approvalPendingPanelEl) approvalPendingPanelEl.style.display = "";
    if (approvalPendingContentEl) approvalPendingContentEl.style.display = showPending ? "" : "none";
    if (approvalHistoryContentEl) approvalHistoryContentEl.style.display = showPending ? "none" : "";
    if (staffApprovalSelectionToggleBtnEl) staffApprovalSelectionToggleBtnEl.style.display = showPending ? "" : "none";
    if (staffCurrentSelectionToggleBtnEl) staffCurrentSelectionToggleBtnEl.style.display = showPending ? "none" : "";
    if (approvalPanelTitleEl) {
      approvalPanelTitleEl.textContent = showPending ? "คำขอที่รออนุมัติ" : "รายชื่อผู้ปฏิบัติงานตอนนี้";
    }
    if (approvalPanelCaptionEl) {
      syncApprovalPanelCaption();
    }
    if (approvalShowPendingBtnEl) {
      approvalShowPendingBtnEl.classList.toggle("is-active", showPending);
      approvalShowPendingBtnEl.setAttribute("aria-selected", showPending ? "true" : "false");
    }
    if (approvalShowHistoryBtnEl) {
      approvalShowHistoryBtnEl.classList.toggle("is-active", !showPending);
      approvalShowHistoryBtnEl.setAttribute("aria-selected", showPending ? "false" : "true");
    }
    if (showPending) renderApprovalRows();
    else renderApprovedHistory();
  };

  const syncStaffPositionPanelVisibility = () => {
    const shouldShow = currentStaffManagementView === "positions";
    if (positionManagePanelEl) positionManagePanelEl.style.display = shouldShow ? "" : "none";
    if (positionListPanelEl) positionListPanelEl.style.display = shouldShow ? "" : "none";
  };

  const setStaffManagementView = (view = "people") => {
    currentStaffManagementView = view === "positions" ? "positions" : "people";
    const showPeople = currentStaffManagementView === "people";
    if (staffApprovalMainPanelEl) staffApprovalMainPanelEl.hidden = !showPeople;
    if (staffPositionSettingsViewEl) staffPositionSettingsViewEl.hidden = showPeople;
    if (staffManagementPeopleTabEl) {
      staffManagementPeopleTabEl.classList.toggle("is-active", showPeople);
      staffManagementPeopleTabEl.setAttribute("aria-selected", showPeople ? "true" : "false");
    }
    if (staffManagementPositionTabEl) {
      staffManagementPositionTabEl.classList.toggle("is-active", !showPeople);
      staffManagementPositionTabEl.setAttribute("aria-selected", showPeople ? "false" : "true");
    }
    syncStaffPositionPanelVisibility();
  };

  const setStaffApprovalMainTab = (tab = "approval") => {
    currentStaffApprovalMainTab = ["structure", "auth-access"].includes(tab) ? tab : "approval";
    const showApproval = currentStaffApprovalMainTab === "approval";
    const showStructure = currentStaffApprovalMainTab === "structure";
    const showAuthAccess = currentStaffApprovalMainTab === "auth-access";
    if (staffApprovalMainPanelEl) {
      staffApprovalMainPanelEl.hidden = showApproval && currentStaffManagementView !== "people";
    }
    if (staffStructurePanelEl) staffStructurePanelEl.hidden = false;
    if (staffAuthAccessPanelEl) staffAuthAccessPanelEl.hidden = false;
    if (staffApprovalMainApprovalTabEl) {
      staffApprovalMainApprovalTabEl.classList.toggle("is-active", showApproval);
      staffApprovalMainApprovalTabEl.setAttribute("aria-selected", showApproval ? "true" : "false");
    }
    if (staffApprovalMainStructureTabEl) {
      staffApprovalMainStructureTabEl.classList.toggle("is-active", showStructure);
      staffApprovalMainStructureTabEl.setAttribute("aria-selected", showStructure ? "true" : "false");
    }
    if (staffApprovalMainAuthAccessTabEl) {
      staffApprovalMainAuthAccessTabEl.classList.toggle("is-active", showAuthAccess);
      staffApprovalMainAuthAccessTabEl.setAttribute("aria-selected", showAuthAccess ? "true" : "false");
    }
    syncStaffPositionPanelVisibility();
    if (showStructure) {
      startOrgStructureMembersListener();
    }
    if (showAuthAccess) {
      startAuthEmailAccessListener();
      refreshAuthAccessProfilePreview();
    }
  };

  const syncOrgRepresentativePanelCaption = () => {
    if (!orgRepresentativePanelCaptionEl) return;
    if (currentOrgRepresentativeView === "history") {
      orgRepresentativePanelCaptionEl.textContent = orgRepresentativeHistoryCaptionEl?.textContent || "แสดงผล 0 รายการ";
      return;
    }
    if (currentOrgRepresentativeView === "pending") {
      orgRepresentativePanelCaptionEl.textContent = `แสดงผล ${currentOrgRepresentativePending.length} รายการ`;
      return;
    }
    orgRepresentativePanelCaptionEl.textContent =
      `แสดงผล ${currentOrgRepresentativeFilteredOrganizations.length} จาก ${currentOrgRepresentativeOrganizations.length} องค์กร`;
  };

  const setOrgRepresentativeMainTab = (tab = "overview") => {
    const nextTab = tab === "filter" ? "filter" : "overview";
    const showOverview = nextTab === "overview";
    if (orgRepresentativeOverviewPanelEl) orgRepresentativeOverviewPanelEl.hidden = !showOverview;
    if (orgRepresentativeFilterPanelEl) orgRepresentativeFilterPanelEl.hidden = showOverview;
    if (!showOverview && orgRepresentativeFilterPanelEl) {
      orgRepresentativeFilterPanelEl.querySelectorAll(".section-appear").forEach((section) => {
        section.classList.add("section-visible");
      });
    }
    if (orgRepresentativeMainOverviewTabEl) {
      orgRepresentativeMainOverviewTabEl.classList.toggle("is-active", showOverview);
      orgRepresentativeMainOverviewTabEl.setAttribute("aria-selected", showOverview ? "true" : "false");
    }
    if (orgRepresentativeMainFilterTabEl) {
      orgRepresentativeMainFilterTabEl.classList.toggle("is-active", !showOverview);
      orgRepresentativeMainFilterTabEl.setAttribute("aria-selected", showOverview ? "false" : "true");
    }
  };

  const setOrgRepresentativeView = (view = "overview") => {
    currentOrgRepresentativeView = view === "history" ? "history" : view === "pending" ? "pending" : "overview";
    const showOverview = currentOrgRepresentativeView === "overview";
    const showPending = currentOrgRepresentativeView === "pending";
    const showHistory = currentOrgRepresentativeView === "history";
    if (orgRepresentativeOverviewContentEl) orgRepresentativeOverviewContentEl.style.display = showOverview ? "" : "none";
    if (orgRepresentativePendingContentEl) orgRepresentativePendingContentEl.style.display = showPending ? "" : "none";
    if (orgRepresentativeHistoryContentEl) orgRepresentativeHistoryContentEl.style.display = showHistory ? "" : "none";
    if (orgRepresentativePanelTitleEl) {
      orgRepresentativePanelTitleEl.textContent = showOverview
        ? "อนุมัติตัวแทนองค์กร"
        : showPending
          ? "คำขอตัวแทนองค์กรที่รออนุมัติ"
          : "ตัวแทนองค์กรที่อนุมัติแล้ว";
    }
    if (orgRepresentativeShowOverviewBtnEl) {
      orgRepresentativeShowOverviewBtnEl.classList.toggle("is-active", showOverview);
      orgRepresentativeShowOverviewBtnEl.setAttribute("aria-selected", showOverview ? "true" : "false");
    }
    if (orgRepresentativeShowPendingBtnEl) {
      orgRepresentativeShowPendingBtnEl.classList.toggle("is-active", showPending);
      orgRepresentativeShowPendingBtnEl.setAttribute("aria-selected", showPending ? "true" : "false");
    }
    if (orgRepresentativeShowHistoryBtnEl) {
      orgRepresentativeShowHistoryBtnEl.classList.toggle("is-active", showHistory);
      orgRepresentativeShowHistoryBtnEl.setAttribute("aria-selected", showHistory ? "true" : "false");
    }
    syncOrgRepresentativePanelCaption();
  };

  const setApprovalType = (type = "staff") => {
    if (!staffApprovalTypeStaffBtnEl && !staffApprovalTypeOrgBtnEl) {
      if (staffApprovalStaffSectionEl) staffApprovalStaffSectionEl.style.display = "";
      syncStaffPositionPanelVisibility();
      if (orgRepresentativeApprovalSectionEl) orgRepresentativeApprovalSectionEl.style.display = "";
      return;
    }
    currentApprovalType = type === "org" ? "org" : "staff";
    const showOrg = currentApprovalType === "org";
    if (staffApprovalStaffSectionEl) staffApprovalStaffSectionEl.style.display = showOrg ? "none" : "";
    syncStaffPositionPanelVisibility();
    if (orgRepresentativeApprovalSectionEl) orgRepresentativeApprovalSectionEl.style.display = showOrg ? "" : "none";
    if (staffApprovalTypeStaffBtnEl) {
      staffApprovalTypeStaffBtnEl.classList.toggle("is-active", !showOrg);
      staffApprovalTypeStaffBtnEl.setAttribute("aria-selected", showOrg ? "false" : "true");
    }
    if (staffApprovalTypeOrgBtnEl) {
      staffApprovalTypeOrgBtnEl.classList.toggle("is-active", showOrg);
      staffApprovalTypeOrgBtnEl.setAttribute("aria-selected", showOrg ? "true" : "false");
    }
  };

  const openApplicationModal = () => {
    if (!applicationModalEl) return;
    window.__sgcuStaffApplicationFlowActive = true;
    prefillApplicationForm();
    const currentUserEmail = getCurrentAuthEmail();
    const currentAccountEmail = normalizeAccountEmail(currentUserEmail);
    const localProfile = currentAccountEmail ? (readLoginProfiles()[currentAccountEmail] || {}) : {};
    const profileType = ((localProfile.profileType || window.currentUserProfileType || "student").toString().trim().toLowerCase() === "affairs")
      ? "affairs"
      : "student";
    const focusSelector = profileType === "affairs" ? "#staffApplicationAffairsPosition" : "#staffApplicationDivision";
    if (typeof openDialog === "function") {
      openDialog(applicationModalEl, { focusSelector });
      return;
    }
    applicationModalEl.classList.add("show");
    applicationModalEl.setAttribute("aria-hidden", "false");
  };

  const closeApplicationModal = () => {
    if (!applicationModalEl) return;
    window.__sgcuStaffApplicationFlowActive = false;
    if (typeof closeDialog === "function") {
      closeDialog(applicationModalEl);
      return;
    }
    applicationModalEl.classList.remove("show");
    applicationModalEl.setAttribute("aria-hidden", "true");
  };

  const ensureStaffRejectionReasonModal = () => {
    let modalEl = document.getElementById("staffRejectionReasonModal");
    if (modalEl) return modalEl;
    if (!document.body) return null;

    document.body.insertAdjacentHTML("beforeend", `
      <div
        id="staffRejectionReasonModal"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-hidden="true"
        aria-labelledby="staffRejectionReasonTitle"
      >
        <div class="modal-dialog staff-rejection-reason-dialog">
          <div class="modal-header">
            <div>
              <div id="staffRejectionReasonTitle" class="modal-title">เหตุผลที่ไม่อนุมัติ</div>
              <div id="staffRejectionReasonSubtitle" class="modal-subtitle">เหตุผลนี้จะแสดงในประวัติคำขอของผู้สมัคร</div>
            </div>
            <button id="staffRejectionReasonClose" type="button" class="modal-close" aria-label="ปิด">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-section staff-rejection-reason-section">
              <label class="login-label" for="staffRejectionReasonInput">เหตุผล</label>
              <textarea
                id="staffRejectionReasonInput"
                class="login-input staff-rejection-reason-input"
                rows="5"
                maxlength="300"
                placeholder="ระบุเหตุผลที่ไม่อนุมัติ"
              ></textarea>
              <div class="staff-rejection-reason-meta">
                <span id="staffRejectionReasonCounter" class="section-text-sm staff-rejection-reason-counter">0/300</span>
              </div>
              <div id="staffRejectionReasonError" class="section-text-sm staff-rejection-reason-error" aria-live="polite"></div>
            </div>
          </div>
          <div class="modal-footer staff-rejection-reason-actions">
            <button id="staffRejectionReasonCancel" type="button" class="btn-ghost">ยกเลิก</button>
            <button id="staffRejectionReasonSubmit" type="button" class="btn-primary">บันทึกไม่อนุมัติ</button>
          </div>
        </div>
      </div>
    `);
    return document.getElementById("staffRejectionReasonModal");
  };

  const askStaffRejectionReason = ({
    initialValue = "",
    subtitle = "เหตุผลนี้จะแสดงในประวัติคำขอของผู้สมัคร",
    helperText = "กดบันทึกไม่อนุมัติเพื่อยืนยัน หรือกดยกเลิกเพื่อไม่เปลี่ยนสถานะ"
  } = {}) => {
    const modalEl = ensureStaffRejectionReasonModal();
    const inputEl = document.getElementById("staffRejectionReasonInput");
    const subtitleEl = document.getElementById("staffRejectionReasonSubtitle");
    const helperEl = document.getElementById("staffRejectionReasonHelper");
    const counterEl = document.getElementById("staffRejectionReasonCounter");
    const errorEl = document.getElementById("staffRejectionReasonError");
    const submitEl = document.getElementById("staffRejectionReasonSubmit");
    const cancelEl = document.getElementById("staffRejectionReasonCancel");
    const closeEl = document.getElementById("staffRejectionReasonClose");

    if (
      !modalEl ||
      !(inputEl instanceof HTMLTextAreaElement) ||
      !(submitEl instanceof HTMLButtonElement) ||
      !(cancelEl instanceof HTMLButtonElement) ||
      !(closeEl instanceof HTMLButtonElement)
    ) {
      const input = window.prompt("ระบุเหตุผลที่ไม่อนุมัติ (ไม่บังคับ)", initialValue || "");
      if (input === null) return Promise.resolve(null);
      return Promise.resolve((input || "").toString().trim());
    }

    return new Promise((resolve) => {
      const updateCounter = () => {
        if (counterEl) counterEl.textContent = `${inputEl.value.length}/300`;
      };
      const cleanup = () => {
        submitEl.removeEventListener("click", onSubmit);
        cancelEl.removeEventListener("click", onCancel);
        closeEl.removeEventListener("click", onCancel);
        modalEl.removeEventListener("click", onBackdropClick);
        modalEl.removeEventListener("keydown", onKeydown);
        inputEl.removeEventListener("input", updateCounter);
      };
      const closeReasonDialog = (value) => {
        cleanup();
        if (typeof closeDialog === "function") {
          closeDialog(modalEl);
        } else {
          modalEl.classList.remove("show");
          modalEl.setAttribute("aria-hidden", "true");
        }
        resolve(value);
      };
      const onSubmit = () => {
        if (errorEl) errorEl.textContent = "";
        closeReasonDialog((inputEl.value || "").toString().trim());
      };
      const onCancel = () => {
        if (errorEl) errorEl.textContent = "";
        closeReasonDialog(null);
      };
      const onBackdropClick = (event) => {
        if (event.target === modalEl) onCancel();
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          onSubmit();
        }
      };
      if (subtitleEl) subtitleEl.textContent = subtitle;
      if (helperEl) helperEl.textContent = helperText;
      if (errorEl) errorEl.textContent = "";
      inputEl.value = (initialValue || "").toString().slice(0, 300);
      updateCounter();
      submitEl.addEventListener("click", onSubmit);
      cancelEl.addEventListener("click", onCancel);
      closeEl.addEventListener("click", onCancel);
      modalEl.addEventListener("click", onBackdropClick);
      modalEl.addEventListener("keydown", onKeydown);
      inputEl.addEventListener("input", updateCounter);

      if (typeof openDialog === "function") {
        openDialog(modalEl, { focusSelector: "#staffRejectionReasonInput" });
      } else {
        modalEl.classList.add("show");
        modalEl.setAttribute("aria-hidden", "false");
      }
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 0);
    });
  };

  const ensureOrgRepresentativeDeleteConfirmModal = () => {
    let modalEl = document.getElementById("orgRepresentativeDeleteConfirmModal");
    if (modalEl) return modalEl;
    if (!document.body) return null;

    document.body.insertAdjacentHTML("beforeend", `
      <div
        id="orgRepresentativeDeleteConfirmModal"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-hidden="true"
        aria-labelledby="orgRepresentativeDeleteConfirmTitle"
      >
        <div class="modal-dialog org-representative-delete-dialog">
          <div class="modal-header">
            <div>
              <div id="orgRepresentativeDeleteConfirmTitle" class="modal-title">ลบออกจากรายชื่อ</div>
              <div id="orgRepresentativeDeleteConfirmSubtitle" class="modal-subtitle">ยืนยันการลบตัวแทนรายคน</div>
            </div>
            <button id="orgRepresentativeDeleteConfirmClose" type="button" class="modal-close" aria-label="ปิด">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-section org-representative-delete-confirm-body">
              <div class="budget-round-delete-warning">
                <div>
                  <div id="orgRepresentativeDeleteConfirmName" class="budget-round-delete-name">-</div>
                  <div id="orgRepresentativeDeleteConfirmSummary" class="budget-round-delete-summary">-</div>
                </div>
              </div>
              <div class="budget-round-delete-step-text">
                หลังยืนยันแล้ว รายการคำขอตัวแทนนี้จะถูกลบออกจากระบบ
              </div>
            </div>
          </div>
          <div class="modal-footer org-representative-delete-actions">
            <button id="orgRepresentativeDeleteConfirmCancel" type="button" class="btn-ghost">ยกเลิก</button>
            <button id="orgRepresentativeDeleteConfirmSubmit" type="button" class="btn-primary budget-round-delete-confirm">ลบออกจากรายชื่อ</button>
          </div>
        </div>
      </div>
    `);
    return document.getElementById("orgRepresentativeDeleteConfirmModal");
  };

  const askOrgRepresentativeDeleteConfirm = (item) => {
    const modalEl = ensureOrgRepresentativeDeleteConfirmModal();
    const nameEl = document.getElementById("orgRepresentativeDeleteConfirmName");
    const summaryEl = document.getElementById("orgRepresentativeDeleteConfirmSummary");
    const subtitleEl = document.getElementById("orgRepresentativeDeleteConfirmSubtitle");
    const submitEl = document.getElementById("orgRepresentativeDeleteConfirmSubmit");
    const cancelEl = document.getElementById("orgRepresentativeDeleteConfirmCancel");
    const closeEl = document.getElementById("orgRepresentativeDeleteConfirmClose");
    const applicant = getOrgRepresentativeApplicant(item);
    const displayName = applicant.displayName || applicant.email || "-";
    const org = getResolvedOrgRepresentativeOrganization(item);
    const orgName = (org.organizationName || "-").toString();
    const orgType = (org.organizationType || "-").toString();
    const academicYear = getOrgRepresentativeAcademicYear(item);

    if (
      !modalEl ||
      !(submitEl instanceof HTMLButtonElement) ||
      !(cancelEl instanceof HTMLButtonElement) ||
      !(closeEl instanceof HTMLButtonElement)
    ) {
      return Promise.resolve(window.confirm(`ยืนยันลบ "${displayName}" ออกจากรายชื่อตัวแทนของ "${orgName}" ?`));
    }

    if (nameEl) nameEl.textContent = displayName;
    if (summaryEl) summaryEl.textContent = `${orgName} · ${orgType} · ปีการศึกษา ${academicYear || "-"}`;
    if (subtitleEl) subtitleEl.textContent = `ตำแหน่ง ${item?.representativeRole || "-"}`;

    return new Promise((resolve) => {
      const cleanup = () => {
        submitEl.removeEventListener("click", onSubmit);
        cancelEl.removeEventListener("click", onCancel);
        closeEl.removeEventListener("click", onCancel);
        modalEl.removeEventListener("click", onBackdropClick);
        modalEl.removeEventListener("keydown", onKeydown);
      };
      const closeDeleteDialog = (value) => {
        cleanup();
        if (typeof closeDialog === "function") {
          closeDialog(modalEl);
        } else {
          modalEl.classList.remove("show");
          modalEl.setAttribute("aria-hidden", "true");
        }
        resolve(value);
      };
      const onSubmit = () => closeDeleteDialog(true);
      const onCancel = () => closeDeleteDialog(false);
      const onBackdropClick = (event) => {
        if (event.target === modalEl) onCancel();
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      };

      submitEl.addEventListener("click", onSubmit);
      cancelEl.addEventListener("click", onCancel);
      closeEl.addEventListener("click", onCancel);
      modalEl.addEventListener("click", onBackdropClick);
      modalEl.addEventListener("keydown", onKeydown);

      if (typeof openDialog === "function") {
        openDialog(modalEl, { focusSelector: "#orgRepresentativeDeleteConfirmCancel" });
      } else {
        modalEl.classList.add("show");
        modalEl.setAttribute("aria-hidden", "false");
      }
    });
  };

  const openApprovalDetailModal = (item) => {
    if (!approvalDetailModalEl || !approvalDetailBodyEl || !item) return;
    const approvedAt = item.updatedAt || item.createdAt || null;
    const detailTitleEl = document.getElementById("staffApprovalDetailTitle");
    const detailSubtitleEl = document.getElementById("staffApprovalDetailSubtitle");
    if (detailTitleEl) {
      detailTitleEl.textContent = "รายละเอียดผู้ปฏิบัติงาน";
    }
    if (detailSubtitleEl) {
      detailSubtitleEl.textContent = "ข้อมูลเพิ่มเติมของรายการที่อนุมัติแล้ว";
    }
    const applicationId = (item.primaryApplicationId || item.id || "").toString();
    const approvedPosition = (item.approvedPosition || item.requestedPosition || "").toString();
    const approvedItemsRaw = Array.isArray(item.approvedItems) ? item.approvedItems : [];
    const approvedItems = approvedItemsRaw.length
      ? approvedItemsRaw
      : [{ id: applicationId, position: approvedPosition || "-", code: (item.approvedPositionCode || "-").toString() }];
    const approvedCodes = Array.from(
      new Set(
        approvedItems
          .map((entry) => (entry?.code || "").toString().trim())
          .filter(Boolean)
      )
    );
    const applicantUid = (item.applicantUid || "").toString().trim();
    const applicantEmail = (item.applicantEmail || "").toString().trim().toLowerCase();
    const requestKey = `${applicationId}:${Date.now()}`;
    currentApprovalDetailRequestKey = requestKey;
    approvalDetailBodyEl.setAttribute("data-application-id", applicationId);
    approvalDetailBodyEl.setAttribute("data-request-key", requestKey);
    approvalDetailBodyEl.innerHTML = `
      <div class="staff-approval-detail-layout">
        <div class="modal-section">
          <div class="modal-section-title">ข้อมูลผู้ปฏิบัติงาน</div>
          <div class="modal-section-grid">
            <div>
              <div class="modal-item-label">ชื่อผู้ปฏิบัติงาน</div>
              <div class="modal-item-value">${toSafeText(item.applicantName || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">อีเมล</div>
              <div class="modal-item-value">${toSafeText(item.applicantEmail || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">รหัสนิสิต</div>
              <div id="staffApprovalDetailStudentId" class="modal-item-value">-</div>
            </div>
            <div>
              <div class="modal-item-label">คณะ</div>
              <div id="staffApprovalDetailFaculty" class="modal-item-value">-</div>
            </div>
            <div>
              <div class="modal-item-label">ชั้นปี</div>
              <div id="staffApprovalDetailYear" class="modal-item-value">-</div>
            </div>
            <div>
              <div class="modal-item-label">UID</div>
              <div id="staffApprovalDetailUid" class="modal-item-value">${toSafeText(applicantUid || "-")}</div>
            </div>
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">ข้อมูลการอนุมัติ</div>
          <div class="staff-approval-info-top">
            <span class="badge badge-approved">อนุมัติแล้ว</span>
            <span class="staff-approval-code-pill">${toSafeText(approvedCodes.join(" • ") || "-")}</span>
          </div>
          <div class="modal-section-grid staff-approval-info-grid">
            <div>
              <div class="modal-item-label">จำนวนตำแหน่งที่อนุมัติ</div>
              <div class="modal-item-value">${toSafeText(String(approvedItems.length))}</div>
            </div>
            <div>
              <div class="modal-item-label">ผู้อนุมัติ</div>
              <div class="modal-item-value">${toSafeText(item.reviewedByEmail || "-")}</div>
            </div>
            <div>
              <div class="modal-item-label">คำขออ้างอิง</div>
              <div class="modal-item-value">${toSafeText((applicationId || "-").toString())}</div>
            </div>
            <div>
              <div class="modal-item-label">เวลาที่อนุมัติ</div>
              <div class="modal-item-value">${toSafeText(formatDateTime(approvedAt))}</div>
            </div>
            </div>
          <div class="staff-approval-all-positions">
            <div class="modal-item-label">ตำแหน่งที่อนุมัติทั้งหมด</div>
            <div class="staff-approval-position-list">
              ${approvedItems.map((entry) => `<div class="staff-approval-position-item"><span>${toSafeText(entry.position || "-")}</span><code>${toSafeText(entry.code || "-")}</code></div>`).join("")}
            </div>
          </div>
        </div>
        <div class="modal-section staff-approval-manage-section">
          <div class="modal-section-title">จัดการผู้ปฏิบัติงาน</div>
          <div class="modal-section-caption">เลือกตำแหน่งที่ต้องการแก้ไขก่อน แล้วค่อยปรับสถานะหรือเปลี่ยนชื่อตำแหน่ง</div>
          <div class="staff-approval-manage-grid">
          <div class="staff-approval-manage-field">
            <label class="login-label" for="modalApprovalTargetSelect">เลือกรายการตำแหน่งที่จะจัดการ</label>
            <select id="modalApprovalTargetSelect" class="login-input">
              ${approvedItems.map((entry, idx) => `
                <option
                  value="${toSafeText((entry.id || applicationId).toString())}"
                  data-position="${toSafeText((entry.position || "").toString())}"
                  ${idx === 0 ? "selected" : ""}
                >
                  ${toSafeText(`${(entry.position || "-").toString()} (${(entry.code || "-").toString()})`)}
                </option>
              `).join("")}
            </select>
          </div>
          <div class="staff-approval-manage-field">
            <label class="login-label" for="modalApprovalPositionInput">ปรับตำแหน่ง</label>
            <div class="staff-approval-modal-edit-row">
              <input
                id="modalApprovalPositionInput"
                type="text"
                class="login-input"
                list="staffPositionOptionsList"
                value="${toSafeText(approvedPosition)}"
                placeholder="ระบุตำแหน่งใหม่"
              />
              <button
                type="button"
                class="btn-primary modal-approval-save-position"
                data-application-id="${toSafeText((approvedItems[0]?.id || applicationId).toString())}"
              >
                บันทึกตำแหน่ง
              </button>
            </div>
            <div id="modalApprovalActionMessage" class="section-text-sm staff-access-status" aria-live="polite"></div>
          </div>
          </div>
          <div class="staff-approval-manage-actions">
            <button
              type="button"
              class="btn-ghost modal-approval-revert-pending staff-approval-manage-btn is-secondary"
              data-application-id="${toSafeText((approvedItems[0]?.id || applicationId).toString())}"
            >
              คืนเป็นรออนุมัติ
            </button>
            <button
              type="button"
              class="btn-primary modal-approval-reject staff-approval-manage-btn is-danger"
              data-application-id="${toSafeText((approvedItems[0]?.id || applicationId).toString())}"
            >
              เปลี่ยนเป็นไม่อนุมัติ
            </button>
            <button
              type="button"
              class="btn-ghost modal-approval-delete staff-approval-manage-btn is-delete"
              data-application-id="${toSafeText((approvedItems[0]?.id || applicationId).toString())}"
            >
              ลบคำขอนี้
            </button>
          </div>
          <div class="section-text-sm staff-approval-manage-hint">การจัดการทั้งหมดจะมีผลเฉพาะตำแหน่งที่เลือกอยู่ด้านบน</div>
        </div>
      </div>
    `;
    const fillAcademicFields = (profile) => {
      if (currentApprovalDetailRequestKey !== requestKey) return;
      const studentIdEl = document.getElementById("staffApprovalDetailStudentId");
      const facultyEl = document.getElementById("staffApprovalDetailFaculty");
      const yearEl = document.getElementById("staffApprovalDetailYear");
      const effectiveEmail = ((profile?.email || applicantEmail || item?.applicantEmail || "").toString().trim().toLowerCase());
      const fallback = deriveAcademicProfile(profile || {}, effectiveEmail, item.createdAt || item.updatedAt || approvedAt);
      const studentId = getMeaningfulProfileValue(profile?.studentId, fallback.studentId, "-");
      const faculty = getMeaningfulProfileValue(profile?.faculty, fallback.faculty, "-");
      const year = getMeaningfulProfileValue(fallback.year, profile?.year, "-");
      if (studentIdEl) studentIdEl.textContent = studentId;
      if (facultyEl) facultyEl.textContent = faculty;
      if (yearEl) yearEl.textContent = year;
    };

    const localProfiles = readLoginProfiles();
    fillAcademicFields(localProfiles[normalizeAccountEmail(applicantEmail)] || {});

    if (
      firestore?.db &&
      firestore?.doc &&
      firestore?.getDoc
    ) {
      const fetchByUid = applicantUid
        ? firestore
          .getDoc(firestore.doc(firestore.db, COLLECTION_USER_PROFILES, applicantUid))
          .then((snap) => (snap?.exists?.() ? (snap.data() || {}) : null))
          .catch(() => null)
        : Promise.resolve(null);

      const fetchByEmail = applicantEmail && firestore?.collection && firestore?.query && firestore?.where && firestore?.onSnapshot
        ? (async () => {
            try {
              const q = firestore.query(
                firestore.collection(firestore.db, COLLECTION_USER_PROFILES),
                firestore.where("email", "==", applicantEmail)
              );
              return await new Promise((resolve) => {
                let done = false;
                const unsub = firestore.onSnapshot(
                  q,
                  (snap) => {
                    if (done) return;
                    done = true;
                    try { unsub?.(); } catch (_) {}
                    const first = snap?.docs?.[0];
                    resolve(first ? (first.data() || {}) : null);
                  },
                  () => {
                    if (done) return;
                    done = true;
                    try { unsub?.(); } catch (_) {}
                    resolve(null);
                  }
                );
                window.setTimeout(() => {
                  if (done) return;
                  done = true;
                  try { unsub?.(); } catch (_) {}
                  resolve(null);
                }, 1800);
              });
            } catch (_) {
              return null;
            }
          })()
        : Promise.resolve(null);

      Promise.all([fetchByUid, fetchByEmail]).then(([uidProfile, emailProfile]) => {
        const profile = {
          ...(emailProfile || {}),
          ...(uidProfile || {})
        };
        if ((uidProfile || emailProfile) && Object.keys(profile).length) {
          fillAcademicFields(profile);
        }
      });
    }

    if (typeof openDialog === "function") {
      openDialog(approvalDetailModalEl, { focusSelector: "#modalApprovalPositionInput" });
      return;
    }
    approvalDetailModalEl.classList.add("show");
    approvalDetailModalEl.setAttribute("aria-hidden", "false");
  };

  const closeApprovalDetailModal = () => {
    if (!approvalDetailModalEl) return;
    const detailTitleEl = document.getElementById("staffApprovalDetailTitle");
    const detailSubtitleEl = document.getElementById("staffApprovalDetailSubtitle");
    if (detailTitleEl) {
      detailTitleEl.textContent = "รายละเอียดผู้ปฏิบัติงาน";
    }
    if (detailSubtitleEl) {
      detailSubtitleEl.textContent = "ข้อมูลเพิ่มเติมของรายการที่อนุมัติแล้ว";
    }
    if (typeof closeDialog === "function") {
      closeDialog(approvalDetailModalEl);
      return;
    }
    approvalDetailModalEl.classList.remove("show");
    approvalDetailModalEl.setAttribute("aria-hidden", "true");
  };

