  const borrowActionModalEl = (() => {
    const existing = document.getElementById("borrowStaffActionModal");
    if (existing) return existing;
    const modal = document.createElement("div");
    modal.id = "borrowStaffActionModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("aria-labelledby", "borrowStaffActionTitle");
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <div id="borrowStaffActionTitle" class="modal-title">จัดการคำขอยืมพัสดุ</div>
            <div id="borrowStaffActionSubtitle" class="modal-subtitle">ข้อความนี้จะแสดงให้ผู้ยื่นคำขอเห็น</div>
          </div>
          <button id="borrowStaffActionClose" class="modal-close" type="button" aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body">
          <div class="borrow-form-field">
            <label id="borrowStaffActionLabel" for="borrowStaffActionInput" class="login-label">รายละเอียด</label>
            <textarea
              id="borrowStaffActionInput"
              class="login-input borrow-action-reason-input"
              rows="5"
              placeholder="กรอกรายละเอียด"
              maxlength="500"
            ></textarea>
            <div class="borrow-action-reason-meta">
              <div id="borrowStaffActionHelper" class="section-text-sm borrow-action-reason-helper"></div>
              <div id="borrowStaffActionCounter" class="section-text-sm borrow-action-reason-counter">0/500</div>
            </div>
            <div id="borrowStaffActionError" class="section-text-sm borrow-action-reason-error" aria-live="polite"></div>
          </div>
          <div class="modal-actions">
            <button id="borrowStaffActionCancel" class="btn-ghost" type="button">ยกเลิก</button>
            <button id="borrowStaffActionSubmit" class="btn-primary" type="button">ยืนยัน</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  })();
  const borrowActionTitleEl = document.getElementById("borrowStaffActionTitle");
  const borrowActionSubtitleEl = document.getElementById("borrowStaffActionSubtitle");
  const borrowActionLabelEl = document.getElementById("borrowStaffActionLabel");
  const borrowActionInputEl = document.getElementById("borrowStaffActionInput");
  const borrowActionHelperEl = document.getElementById("borrowStaffActionHelper");
  const borrowActionCounterEl = document.getElementById("borrowStaffActionCounter");
  const borrowActionErrorEl = document.getElementById("borrowStaffActionError");
  const borrowActionSubmitEl = document.getElementById("borrowStaffActionSubmit");
  const borrowActionCancelEl = document.getElementById("borrowStaffActionCancel");
  const borrowActionCloseEl = document.getElementById("borrowStaffActionClose");

  const askBorrowStatusReason = async ({
    promptText = "",
    title = "ระบุเหตุผล",
    subtitle = "ข้อความนี้จะแสดงให้ผู้ยื่นคำขอเห็น",
    initialValue = "",
    placeholder = "กรุณาระบุเหตุผล",
    helperText = "",
    requiredMessage = "กรุณาระบุเหตุผล",
    submitLabel = "ยืนยัน",
    maxLength = 500
  } = {}) => {
    const fallbackPrompt = () => {
      if (typeof window.prompt !== "function") return null;
      const input = window.prompt(promptText || title || "กรุณาระบุเหตุผล", initialValue || "");
      const reason = (input || "").toString().trim();
      return reason || null;
    };
    if (
      !borrowActionModalEl ||
      !borrowActionTitleEl ||
      !borrowActionSubtitleEl ||
      !borrowActionLabelEl ||
      !borrowActionInputEl ||
      !borrowActionHelperEl ||
      !borrowActionCounterEl ||
      !borrowActionErrorEl ||
      !borrowActionSubmitEl ||
      !borrowActionCancelEl ||
      !borrowActionCloseEl ||
      typeof openDialog !== "function" ||
      typeof closeDialog !== "function"
    ) {
      return fallbackPrompt();
    }

    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        borrowActionSubmitEl.removeEventListener("click", onSubmit);
        borrowActionCancelEl.removeEventListener("click", onCancel);
        borrowActionCloseEl.removeEventListener("click", onCancel);
        borrowActionModalEl.removeEventListener("click", onBackdropClick);
        borrowActionInputEl.removeEventListener("keydown", onKeydown);
        borrowActionInputEl.removeEventListener("input", onInput);
        resolve(value);
      };
      const onSubmit = () => {
        const reason = (borrowActionInputEl.value || "").toString().trim();
        if (!reason) {
          borrowActionErrorEl.textContent = requiredMessage;
          borrowActionInputEl.focus();
          return;
        }
        borrowActionErrorEl.textContent = "";
        closeDialog(borrowActionModalEl);
        done(reason);
      };
      const onCancel = () => {
        borrowActionErrorEl.textContent = "";
        closeDialog(borrowActionModalEl);
        done(null);
      };
      const onBackdropClick = (event) => {
        if (event.target === borrowActionModalEl) {
          onCancel();
        }
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
          return;
        }
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onSubmit();
        }
      };
      const onInput = () => {
        borrowActionErrorEl.textContent = "";
        const max = Number(borrowActionInputEl.getAttribute("maxlength") || 0);
        const length = (borrowActionInputEl.value || "").length;
        if (borrowActionCounterEl) {
          borrowActionCounterEl.textContent = max > 0 ? `${length}/${max}` : String(length);
        }
      };

      borrowActionTitleEl.textContent = title || "ระบุเหตุผล";
      borrowActionSubtitleEl.textContent = subtitle || "";
      borrowActionSubtitleEl.style.display = subtitle ? "" : "none";
      borrowActionLabelEl.textContent = promptText || "กรุณาระบุเหตุผล";
      borrowActionInputEl.placeholder = placeholder || "";
      borrowActionInputEl.value = (initialValue || "").toString();
      const normalizedMaxLength = Number(maxLength);
      if (Number.isFinite(normalizedMaxLength) && normalizedMaxLength > 0) {
        borrowActionInputEl.setAttribute("maxlength", String(Math.floor(normalizedMaxLength)));
      } else {
        borrowActionInputEl.removeAttribute("maxlength");
      }
      borrowActionHelperEl.textContent = helperText || "";
      borrowActionHelperEl.style.display = helperText ? "" : "none";
      borrowActionErrorEl.textContent = "";
      borrowActionSubmitEl.textContent = submitLabel || "ยืนยัน";
      onInput();

      borrowActionSubmitEl.addEventListener("click", onSubmit);
      borrowActionCancelEl.addEventListener("click", onCancel);
      borrowActionCloseEl.addEventListener("click", onCancel);
      borrowActionModalEl.addEventListener("click", onBackdropClick);
      borrowActionInputEl.addEventListener("keydown", onKeydown);
      borrowActionInputEl.addEventListener("input", onInput);

      openDialog(borrowActionModalEl, { focusSelector: "#borrowStaffActionInput" });
      window.setTimeout(() => {
        borrowActionInputEl.focus();
        borrowActionInputEl.select();
      }, 0);
    });
  };

  const borrowDeleteConfirmModalEl = (() => {
    const existing = document.getElementById("borrowDeleteConfirmModal");
    if (existing) return existing;
    const modal = document.createElement("div");
    modal.id = "borrowDeleteConfirmModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("aria-labelledby", "borrowDeleteConfirmTitle");
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <div id="borrowDeleteConfirmTitle" class="modal-title">ยืนยันการลบคำขอถาวร</div>
            <div class="modal-subtitle">รายการนี้จะถูกลบออกจากระบบและประวัติการขอ</div>
          </div>
          <button id="borrowDeleteConfirmClose" class="modal-close" type="button" aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body">
          <div id="borrowDeleteConfirmMessage" class="section-text-sm borrow-delete-confirm-message"></div>
          <div class="borrow-delete-confirm-warning">การลบนี้เป็นการลบถาวรและไม่สามารถกู้คืนได้จากระบบ</div>
          <div class="modal-actions">
            <button id="borrowDeleteConfirmCancel" class="btn-ghost" type="button">ยกเลิก</button>
            <button id="borrowDeleteConfirmSubmit" class="btn-primary borrow-delete-confirm-submit" type="button">ลบถาวร</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  })();
  const borrowDeleteConfirmMessageEl = document.getElementById("borrowDeleteConfirmMessage");
  const borrowDeleteConfirmSubmitEl = document.getElementById("borrowDeleteConfirmSubmit");
  const borrowDeleteConfirmCancelEl = document.getElementById("borrowDeleteConfirmCancel");
  const borrowDeleteConfirmCloseEl = document.getElementById("borrowDeleteConfirmClose");

  const confirmBorrowDelete = async (requestId = "", sourceCollection = "") => {
    const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
    const requestNo = (requestItem?.requestNo || requestItem?.id || requestId || "-").toString().trim();
    const requesterName = [requestItem?.firstName || "", requestItem?.lastName || ""].filter(Boolean).join(" ").trim() || "-";
    const dateRange = formatDateRange(requestItem?.pickupDate || "", requestItem?.returnDate || "");
    const statusLabel = borrowStatusOptionLabel(requestItem?.status || STATUS_PENDING);
    const affectsStock = requestItem?.status === STATUS_APPROVED || requestItem?.status === STATUS_RECEIVED;
    const fallbackText = `ยืนยันการลบคำขอ ${requestNo} ถาวรหรือไม่`;
    const fallbackConfirm = () =>
      typeof window.confirm === "function" ? window.confirm(fallbackText) : false;

    if (
      !borrowDeleteConfirmModalEl ||
      !borrowDeleteConfirmMessageEl ||
      !borrowDeleteConfirmSubmitEl ||
      !borrowDeleteConfirmCancelEl ||
      !borrowDeleteConfirmCloseEl ||
      typeof openDialog !== "function" ||
      typeof closeDialog !== "function"
    ) {
      return fallbackConfirm();
    }

    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        borrowDeleteConfirmSubmitEl.removeEventListener("click", onSubmit);
        borrowDeleteConfirmCancelEl.removeEventListener("click", onCancel);
        borrowDeleteConfirmCloseEl.removeEventListener("click", onCancel);
        borrowDeleteConfirmModalEl.removeEventListener("click", onBackdropClick);
        borrowDeleteConfirmModalEl.removeEventListener("keydown", onKeydown);
        resolve(value);
      };
      const onSubmit = () => {
        closeDialog(borrowDeleteConfirmModalEl);
        done(true);
      };
      const onCancel = () => {
        closeDialog(borrowDeleteConfirmModalEl);
        done(false);
      };
      const onBackdropClick = (event) => {
        if (event.target === borrowDeleteConfirmModalEl) onCancel();
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      };

      borrowDeleteConfirmMessageEl.innerHTML = `
        <strong>คำขอ:</strong> ${safeEscape(requestNo)}<br />
        <strong>ผู้ยื่น:</strong> ${safeEscape(requesterName)}<br />
        <strong>สถานะ:</strong> ${safeEscape(statusLabel)}<br />
        <strong>ช่วงยืม:</strong> ${safeEscape(dateRange)}
        ${affectsStock ? '<div class="borrow-delete-confirm-note">ระบบจะคืนยอดจองพัสดุให้อัตโนมัติก่อนลบคำขอนี้</div>' : ""}
      `;
      borrowDeleteConfirmSubmitEl.addEventListener("click", onSubmit);
      borrowDeleteConfirmCancelEl.addEventListener("click", onCancel);
      borrowDeleteConfirmCloseEl.addEventListener("click", onCancel);
      borrowDeleteConfirmModalEl.addEventListener("click", onBackdropClick);
      borrowDeleteConfirmModalEl.addEventListener("keydown", onKeydown);

      openDialog(borrowDeleteConfirmModalEl, { focusSelector: "#borrowDeleteConfirmCancel" });
    });
  };

  const getBorrowRequestByKey = (requestId, sourceCollection = "") => {
    return borrowRequests.find((item) => {
      if (item.id !== requestId) return false;
      if (!sourceCollection) return true;
      return (item.sourceCollection || "") === sourceCollection;
    }) || null;
  };

  const borrowDetailModalEl = (() => {
    const existing = document.getElementById("borrowRequestDetailModal");
    if (existing) return existing;
    const modal = document.createElement("div");
    modal.id = "borrowRequestDetailModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div id="borrowRequestDetailTitle" class="modal-title">รายละเอียดคำขอยืมพัสดุ</div>
          <button id="borrowRequestDetailClose" class="modal-close" type="button" aria-label="ปิด">×</button>
        </div>
        <div id="borrowRequestDetailBody" class="modal-body borrow-request-detail-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  })();
  const borrowDetailBodyEl = document.getElementById("borrowRequestDetailBody");
  const borrowDetailCloseEl = document.getElementById("borrowRequestDetailClose");
  let activeBorrowDetailId = "";
  let activeBorrowDetailSource = "";

  const borrowStatusLabel = (status) => {
    if (status === STATUS_APPROVED) return "อนุมัติแล้ว";
    if (status === STATUS_RECEIVED) return "รับของแล้ว";
    if (status === STATUS_REJECTED) return "ไม่อนุมัติ";
    if (status === STATUS_CANCELLED) return "ยกเลิก";
    if (status === STATUS_RETURNED) return "คืนแล้ว";
    return "รออนุมัติ";
  };

  const renderBorrowDetailBody = (item, statusMessage = "", statusColor = "#374151") => {
    if (!borrowDetailBodyEl || !item) return;
    const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "-";
    const updatedDateText = item.updatedAtMs
      ? new Date(item.updatedAtMs).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
      : "-";
    const assets = Array.isArray(item.assets) ? item.assets : [];
    const assetsCount = assets.reduce((sum, asset) => {
      const qty = Number(asset?.qty || 0);
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
    const canManageStatus = ensureStaffPermission(true);
    const assetsRows = assets.length
      ? assets.map((asset, index) => {
        const qtyNum = Number(asset.qty || 0);
        const qtyText = Number.isFinite(qtyNum) ? String(qtyNum) : "0";
        return `
          <tr>
            <td data-label="#">${index + 1}</td>
            <td data-label="รหัส">${safeEscape(asset.code || "-")}</td>
            <td data-label="รายการ">${safeEscape(asset.name || "-")}</td>
            <td data-label="จำนวน">${canManageStatus
              ? `<input
                  class="borrow-request-asset-qty-input"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  value="${safeEscape(qtyText)}"
                  data-asset-index="${index}"
                  aria-label="จำนวน ${safeEscape(asset.name || asset.code || `รายการที่ ${index + 1}`)}"
                />`
              : safeEscape(qtyText)
            }</td>
            <td data-label="หน่วย">${safeEscape(asset.unit || "-")}</td>
          </tr>
        `;
      }).join("")
      : `
        <tr>
          <td colspan="5" class="list-empty-cell">${renderListEmptyState("ไม่มีรายการพัสดุ", "รายการพัสดุจะแสดงที่นี่เมื่อมีข้อมูล", "box")}</td>
        </tr>
      `;
    const safeMessage = safeEscape(statusMessage || "");
    const studentMeta = [item.faculty, item.year ? `ชั้นปี ${item.year}` : "",item.studentId].filter(Boolean).join(" • ");
    const requesterEmailMeta = (item.requesterEmail || "").toString().trim();
    const contactMeta = [item.phone, item.lineId ? `Line: ${item.lineId}` : ""].filter(Boolean).join(" • ");
    const academicYearMeta = item.academicYear ? `ปีการศึกษา ${item.academicYear}` : "";
    const projectMeta = [academicYearMeta, item.projectName, item.projectDept, item.borrowProjectName].filter(Boolean).join(" • ");
    const activityMeta = (item.projectDetail || "").toString().trim();
    const originalPickupDate = (item.originalPickupDate || "").toString().trim();
    const hasChangedPickupDate = !!originalPickupDate && originalPickupDate !== item.pickupDate;
    borrowDetailBodyEl.innerHTML = `
      <div class="borrow-request-detail-shell">
        <div class="borrow-request-detail-hero">
          <div class="borrow-request-detail-hero-main">
            <div class="borrow-request-detail-hero-label">ผู้ยื่นคำขอ</div>
            <div class="borrow-request-detail-hero-name">${safeEscape(fullName)}</div>
            ${requesterEmailMeta ? `<div class="borrow-request-detail-hero-meta">อีเมล: ${safeEscape(requesterEmailMeta)}</div>` : ""}
            ${studentMeta ? `<div class="borrow-request-detail-hero-meta">${safeEscape(studentMeta)}</div>` : ""}
            ${projectMeta ? `<div class="borrow-request-detail-hero-meta">${safeEscape(projectMeta)}</div>` : ""}
            ${activityMeta ? `<div class="borrow-request-detail-hero-meta">${safeEscape(activityMeta)}</div>` : ""}
            ${contactMeta ? `<div class="borrow-request-detail-hero-meta">${safeEscape(contactMeta)}</div>` : ""}
          </div>
          <div class="borrow-request-detail-hero-side">
            <div class="borrow-request-detail-hero-label">สถานะปัจจุบัน</div>
            <div class="borrow-request-detail-hero-badge">${statusBadge(item.status)}</div>
          </div>
        </div>

        <div class="borrow-request-detail-summary">
          <div class="borrow-request-summary-card">
            <div class="borrow-request-summary-label">เลขที่คำขอ</div>
            <div class="borrow-request-summary-value borrow-request-code">${safeEscape(item.requestNo || item.id || "-")}</div>
          </div>
          <div class="borrow-request-summary-card">
            <div class="borrow-request-summary-label">ช่วงยืม</div>
            <div class="borrow-request-summary-value">${safeEscape(formatDateRange(item.pickupDate, item.returnDate))}</div>
          </div>
          <div class="borrow-request-summary-card">
            <div class="borrow-request-summary-label">จำนวนที่ขอ</div>
            <div class="borrow-request-summary-value">${safeEscape(String(assetsCount))} ชิ้น</div>
          </div>
          <div class="borrow-request-summary-card">
            <div class="borrow-request-summary-label">วันที่อัปเดตล่าสุด</div>
            <div class="borrow-request-summary-value">${safeEscape(updatedDateText)}</div>
          </div>
        </div>

        <div class="borrow-request-detail-grid">
          <div class="borrow-request-detail-item borrow-request-detail-item-full"><span class="borrow-request-detail-label">หมายเหตุ Staff</span><span class="borrow-request-detail-value">${safeEscape(item.staffNote || "ยังไม่มีหมายเหตุ")}</span></div>
          ${hasChangedPickupDate
            ? `<div class="borrow-request-detail-item"><span class="borrow-request-detail-label">วันรับที่ผู้ขอเลือกเดิม</span><span class="borrow-request-detail-value">${safeEscape(formatDate(originalPickupDate))}</span></div>`
            : ""}
        </div>

        <div class="borrow-request-detail-section">
          <div class="borrow-request-detail-section-title">รายการพัสดุ</div>
          <div class="borrow-request-assets-wrap">
            <table class="borrow-request-assets-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>รหัส</th>
                  <th>รายการ</th>
                  <th>จำนวน</th>
                  <th>หน่วย</th>
                </tr>
              </thead>
              <tbody>
                ${assetsRows}
              </tbody>
            </table>
          </div>
        </div>

        ${canManageStatus
          ? `
            <div class="borrow-request-detail-section">
              <div class="borrow-request-detail-section-title">ปรับสถานะและวันนัดรับ</div>
              <div class="borrow-request-detail-controls">
                  <div class="borrow-request-detail-schedule-row">
                    <div class="borrow-form-field">
                      <label class="login-label" for="borrowRequestDetailPickupDateInput">วันนัดรับพัสดุ</label>
                      <input
                        id="borrowRequestDetailPickupDateInput"
                        class="login-input"
                        type="date"
                        value="${safeEscape(item.pickupDate || "")}"
                      />
                    </div>
                    <div class="borrow-form-field">
                      <label class="login-label" for="borrowRequestDetailReturnDateInput">วันที่คืนพัสดุ</label>
                      <input
                        id="borrowRequestDetailReturnDateInput"
                        class="login-input"
                        type="date"
                        value="${safeEscape(item.returnDate || "")}"
                      />
                    </div>
                    <div class="borrow-form-field">
                      <label class="login-label" for="borrowRequestDetailStatusSelect">สถานะ</label>
                      <select
                        id="borrowRequestDetailStatusSelect"
                        class="staff-status-select"
                        data-request-id="${safeEscape(item.id || "")}"
                        data-request-source="${safeEscape(item.sourceCollection || "")}"
                        aria-label="ปรับสถานะคำขอยืมพัสดุ"
                      >
                        <option value="${STATUS_PENDING}" ${item.status === STATUS_PENDING ? "selected" : ""}>${borrowStatusLabel(STATUS_PENDING)}</option>
                        <option value="${STATUS_APPROVED}" ${item.status === STATUS_APPROVED ? "selected" : ""}>${borrowStatusLabel(STATUS_APPROVED)}</option>
                        <option value="${STATUS_RECEIVED}" ${item.status === STATUS_RECEIVED ? "selected" : ""}>${borrowStatusLabel(STATUS_RECEIVED)}</option>
                        <option value="${STATUS_REJECTED}" ${item.status === STATUS_REJECTED ? "selected" : ""}>${borrowStatusLabel(STATUS_REJECTED)}</option>
                        <option value="${STATUS_CANCELLED}" ${item.status === STATUS_CANCELLED ? "selected" : ""}>${borrowStatusLabel(STATUS_CANCELLED)}</option>
                        <option value="${STATUS_RETURNED}" ${item.status === STATUS_RETURNED ? "selected" : ""}>${borrowStatusLabel(STATUS_RETURNED)}</option>
                      </select>
                    </div>
                  </div>
	                  <textarea
                    id="borrowRequestDetailNoteInput"
                    class="login-input borrow-request-detail-note"
                    rows="3"
                  placeholder="หมายเหตุสำหรับผู้ขอ (ถ้ามี)"
                  >${safeEscape(item.staffNote || "")}</textarea>
                <div class="borrow-request-detail-actions">
                  <span
                    id="borrowRequestDetailStatusMessage"
                    class="section-text-sm"
                    style="color:${safeEscape(statusColor)};"
                  >${safeMessage}</span>
                  <button
                    id="borrowRequestDetailApplyStatus"
                    class="btn-primary"
                    type="button"
                    data-request-id="${safeEscape(item.id || "")}"
                    data-request-source="${safeEscape(item.sourceCollection || "")}"
                  >
	                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          `
          : ""
        }
      </div>
    `;
  };

  const openBorrowDetailModal = (item) => {
    if (!borrowDetailModalEl || !borrowDetailBodyEl || !item) return;
    activeBorrowDetailId = item.id || "";
    activeBorrowDetailSource = item.sourceCollection || "";
    renderBorrowDetailBody(item);
    if (typeof openDialog === "function") {
      openDialog(borrowDetailModalEl, { focusSelector: "#borrowRequestDetailClose" });
    } else {
      borrowDetailModalEl.classList.add("show");
      borrowDetailModalEl.setAttribute("aria-hidden", "false");
    }
  };

  const closeBorrowDetailModal = () => {
    activeBorrowDetailId = "";
    activeBorrowDetailSource = "";
    if (!borrowDetailModalEl) return;
    if (typeof closeDialog === "function") {
      closeDialog(borrowDetailModalEl);
    } else {
      borrowDetailModalEl.classList.remove("show");
      borrowDetailModalEl.setAttribute("aria-hidden", "true");
    }
  };
  if (borrowDetailCloseEl) {
    borrowDetailCloseEl.addEventListener("click", closeBorrowDetailModal);
  }
  if (borrowDetailModalEl) {
    borrowDetailModalEl.addEventListener("click", (event) => {
      if (event.target === borrowDetailModalEl) closeBorrowDetailModal();
    });
  }
  if (borrowDetailBodyEl) {
    borrowDetailBodyEl.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      if (target.id !== "borrowRequestDetailApplyStatus") return;
      if (!ensureStaffPermission()) return;
      const requestId = target.dataset.requestId || activeBorrowDetailId;
      const sourceCollection = target.dataset.requestSource || activeBorrowDetailSource;
      if (!requestId) return;
      const select = borrowDetailBodyEl.querySelector("#borrowRequestDetailStatusSelect");
      const noteInput = borrowDetailBodyEl.querySelector("#borrowRequestDetailNoteInput");
      const pickupDateInput = borrowDetailBodyEl.querySelector("#borrowRequestDetailPickupDateInput");
      const returnDateInput = borrowDetailBodyEl.querySelector("#borrowRequestDetailReturnDateInput");
      if (!(select instanceof HTMLSelectElement)) return;
      const noteText = noteInput instanceof HTMLTextAreaElement
        ? (noteInput.value || "").toString().trim()
        : "";
      const nextPickupDate = pickupDateInput instanceof HTMLInputElement ? pickupDateInput.value.trim() : "";
      const nextReturnDate = returnDateInput instanceof HTMLInputElement ? returnDateInput.value.trim() : "";
      const nextStatus = normalizeRequestStatus(select.value);
      const messageEl = borrowDetailBodyEl.querySelector("#borrowRequestDetailStatusMessage");
      const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
      const currentAssets = Array.isArray(requestItem?.assets) ? requestItem.assets : [];
      const qtyInputs = Array.from(borrowDetailBodyEl.querySelectorAll(".borrow-request-asset-qty-input"));
      const nextAssets = currentAssets.map((asset) => ({ ...asset }));
      let hasInvalidQty = qtyInputs.length !== currentAssets.length;
      qtyInputs.forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        const index = Number(input.dataset.assetIndex);
        const qty = Number(input.value);
        if (!Number.isInteger(index) || !nextAssets[index] || !Number.isInteger(qty) || qty < 1) {
          hasInvalidQty = true;
          return;
        }
        nextAssets[index].qty = qty;
      });
      if (hasInvalidQty) {
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = "จำนวนพัสดุต้องเป็นเลขจำนวนเต็มตั้งแต่ 1 ขึ้นไป";
          messageEl.style.color = "#b91c1c";
        }
        return;
      }
      const nextPickupDateObj = parseDateYmd(nextPickupDate);
      const nextReturnDateObj = parseDateYmd(nextReturnDate);
      if (!nextPickupDateObj || !nextReturnDateObj) {
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = "กรุณาระบุวันนัดรับและวันคืนให้ถูกต้อง";
          messageEl.style.color = "#b91c1c";
        }
        return;
      }
      if (nextReturnDateObj.getTime() < nextPickupDateObj.getTime()) {
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = "วันที่คืนต้องไม่ก่อนวันนัดรับ";
          messageEl.style.color = "#b91c1c";
        }
        return;
      }
      target.disabled = true;
      if (messageEl instanceof HTMLElement) {
        messageEl.textContent = "กำลังบันทึกสถานะ...";
        messageEl.style.color = "#6b7280";
      }
      try {
        await updateBorrowRequestStatus(requestId, nextStatus, noteText, sourceCollection, {
          pickupDate: nextPickupDate,
          returnDate: nextReturnDate,
          assets: nextAssets
        });
        const targetItem = getBorrowRequestByKey(requestId, sourceCollection);
        if (targetItem) {
          const previousPickupDate = targetItem.pickupDate || "";
          targetItem.status = nextStatus;
          targetItem.pickupDate = nextPickupDate;
          targetItem.returnDate = nextReturnDate;
          targetItem.assets = nextAssets;
          targetItem.originalPickupDate = targetItem.originalPickupDate || previousPickupDate;
          targetItem.staffNote = noteText || (
            nextPickupDate !== previousPickupDate ? formatPickupAppointmentNote(nextPickupDate) : ""
          );
          targetItem.updatedAtMs = Date.now();
        }
        renderBorrowRequests();
        const latest = getBorrowRequestByKey(requestId, sourceCollection);
        if (latest) {
          renderBorrowDetailBody(latest, "บันทึกสถานะเรียบร้อยแล้ว", "#047857");
        }
      } catch (error) {
        if (messageEl instanceof HTMLElement) {
          messageEl.textContent = formatBorrowStatusUpdateError(error, "บันทึกสถานะไม่สำเร็จ กรุณาลองใหม่");
          messageEl.style.color = "#b91c1c";
        }
      } finally {
        target.disabled = false;
      }
    });
  }

