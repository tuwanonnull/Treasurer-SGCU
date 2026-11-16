  const renderMyRequests = () => {
    if (!myRequestsTableBody) return;
    const myRequestsPanel = myRequestsTableBody.closest(".panel");
    if (myRequestsPanel) {
      myRequestsPanel.classList.add("section-visible");
    }
    const renderEmptyState = (message, isEmpty = false) => {
      const content = isEmpty ? renderListEmptyState(message, "เลือกพัสดุและกรอกแบบฟอร์มเพื่อส่งคำขอยืม รายการของคุณจะแสดงที่นี่", "box") : safeEscape(message);
      myRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="${isEmpty ? "list-empty-cell" : ""}">${content}</td>
        </tr>
      `;
      if (myRequestsCardsEl) {
        myRequestsCardsEl.innerHTML = `<article class="borrow-my-request-card-empty">${content}</article>`;
      }
    };
    if (myRequestsTableWrapper) {
      myRequestsTableWrapper.style.removeProperty("display");
    }
    if (myRequestsCardsEl) {
      myRequestsCardsEl.hidden = false;
      myRequestsCardsEl.innerHTML = "";
    }
    if (!currentUserEmail) {
      renderEmptyState("กรุณาเข้าสู่ระบบด้วยอีเมลจุฬาฯ เพื่อดูสถานะคำขอของตนเอง");
      return;
    }
    const list = borrowRequests
      .filter((item) => !item.isDeleted)
      .filter((item) => matchesCurrentAccountEmail(item.requesterEmail, item.accountEmail))
      .sort((a, b) => (b.submittedAtMs || 0) - (a.submittedAtMs || 0));
    if (!list.length) {
      if (myRequestsLoadState === "loading") {
        renderEmptyState("กำลังโหลดสถานะคำขอ...");
      } else if (myRequestsLoadState === "error") {
        renderEmptyState(myRequestsLoadError || "โหลดสถานะคำขอไม่สำเร็จ กรุณาลองใหม่");
      } else {
        renderEmptyState("ยังไม่มีคำขอยืมพัสดุ", true);
      }
      return;
    }
    if (myRequestsCardsEl) {
      myRequestsCardsEl.innerHTML = list.map((item) => {
        const itemsText = (item.assets || [])
          .map((asset) => `${safeEscape(asset.name || asset.code || "-")} ${safeEscape(asset.qty || 0)} ${safeEscape(asset.unit || "")}`.trim())
          .join("<br />");
        const appointmentNote = formatPickupAppointmentNote(item.pickupDate);
        const noteText =
          (item.status === STATUS_APPROVED && !item.staffNote)
            ? (appointmentNote || "รับพัสดุตามเวลาที่ระบุในระบบ")
            : (item.status === STATUS_RECEIVED && !item.staffNote)
              ? "รับพัสดุเรียบร้อยแล้ว"
            : (item.status === STATUS_CANCELLED && !item.staffNote)
              ? "ยกเลิกคำขอโดยเจ้าหน้าที่"
            : (item.status === STATUS_RETURNED && !item.staffNote)
              ? "ส่งคืนพัสดุเรียบร้อยแล้ว"
            : (item.status === STATUS_PENDING && !item.staffNote)
              ? "เจ้าหน้าที่กำลังตรวจสอบคำขอ"
              : (item.staffNote || "-");
        return `
          <article
            class="borrow-my-request-row-mobile"
            data-request-id="${safeEscape(item.id || "")}"
            data-request-source="${safeEscape(item.sourceCollection || "")}"
            tabindex="0"
            role="button"
            aria-label="ดูรายละเอียดคำขอ ${safeEscape(item.id || "-")}"
          >
            <div class="borrow-my-card-head">
              <span class="borrow-my-request-no">${safeEscape(item.requestNo || item.id || "-")}</span>
              ${statusBadge(item.status)}
            </div>
            <div><span class="borrow-my-cell-label">รายการ</span><span class="borrow-my-cell-value">${itemsText}</span></div>
            <div><span class="borrow-my-cell-label">ช่วงเวลา</span><span class="borrow-my-cell-value">${safeEscape(formatDateRange(item.pickupDate, item.returnDate))}</span></div>
            <div><span class="borrow-my-cell-label">หมายเหตุ</span><span class="borrow-my-cell-value">${safeEscape(noteText)}</span></div>
          </article>
        `;
      }).join("");
    }
    myRequestsTableBody.innerHTML = list.map((item) => {
      const itemsText = (item.assets || [])
        .map((asset) => `${safeEscape(asset.name || asset.code || "-")} ${safeEscape(asset.qty || 0)} ${safeEscape(asset.unit || "")}`.trim())
        .join("<br />");
      const appointmentNote = formatPickupAppointmentNote(item.pickupDate);
      const noteText =
        (item.status === STATUS_APPROVED && !item.staffNote)
          ? (appointmentNote || "รับพัสดุตามเวลาที่ระบุในระบบ")
          : (item.status === STATUS_RECEIVED && !item.staffNote)
            ? "รับพัสดุเรียบร้อยแล้ว"
          : (item.status === STATUS_CANCELLED && !item.staffNote)
            ? "ยกเลิกคำขอโดยเจ้าหน้าที่"
          : (item.status === STATUS_RETURNED && !item.staffNote)
            ? "ส่งคืนพัสดุเรียบร้อยแล้ว"
            : (item.status === STATUS_PENDING && !item.staffNote)
              ? "เจ้าหน้าที่กำลังตรวจสอบคำขอ"
              : (item.staffNote || "-");
      return `
        <tr
          class="borrow-my-request-row"
          data-request-id="${safeEscape(item.id || "")}"
          data-request-source="${safeEscape(item.sourceCollection || "")}"
          tabindex="0"
          role="button"
          aria-label="ดูรายละเอียดคำขอ ${safeEscape(item.id || "-")}"
        >
          <td>
            <div class="borrow-my-request-item-main">${itemsText}</div>
            <div class="borrow-my-request-no">เลขที่คำขอ: ${safeEscape(item.requestNo || item.id || "-")}</div>
          </td>
          <td>${safeEscape(formatDateRange(item.pickupDate, item.returnDate))}</td>
          <td>${statusBadge(item.status)}</td>
          <td>
            <div class="borrow-my-note-cell">
              <span>${safeEscape(noteText)}</span>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  };

    const dayKeyBangkok = (dateObj) => {
      if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(dateObj);
    };

  const renderStaffSummary = () => {
    if (staffSummaryCards.length < 3) return;
    const todayYmd = dayKeyBangkok(new Date());
    const approvedToday = borrowRequests.filter((item) =>
      (item.status === STATUS_APPROVED || item.status === STATUS_RECEIVED) &&
      dayKeyBangkok(new Date(item.updatedAtMs || 0)) === todayYmd
    ).length;
    const pendingCount = borrowRequests.filter((item) => item.status === STATUS_PENDING).length;
    const borrowedCount = borrowRequests.filter((item) => item.status === STATUS_APPROVED || item.status === STATUS_RECEIVED).length;
    staffSummaryCards[0].textContent = String(approvedToday);
    staffSummaryCards[1].textContent = String(pendingCount);
    staffSummaryCards[2].textContent = String(borrowedCount);
  };

  const borrowStatusOptionLabel = (value) => {
    if (value === STATUS_APPROVED) return "อนุมัติแล้ว";
    if (value === STATUS_RECEIVED) return "รับของแล้ว";
    if (value === STATUS_REJECTED) return "ไม่อนุมัติ";
    if (value === STATUS_CANCELLED) return "ยกเลิก";
    if (value === STATUS_RETURNED) return "คืนแล้ว";
    if (value === "delete") return "ลบคำขอ";
    return "รออนุมัติ";
  };

  const borrowStatusSelectClass = (value) => {
    if (value === STATUS_APPROVED || value === STATUS_RECEIVED || value === STATUS_RETURNED) return "is-approved";
    if (value === STATUS_REJECTED) return "is-rejected";
    if (value === STATUS_CANCELLED) return "is-cancel-requested";
    if (value === "delete") return "is-delete";
    return "is-pending";
  };

  const renderAssetsCell = (assets = [], staffNote = "") => {
    const list = Array.isArray(assets) ? assets : [];
    if (!list.length) {
      return renderListEmptyState("ไม่มีรายการพัสดุ", "รายการพัสดุจะแสดงที่นี่เมื่อมีข้อมูล", "box");
    }
    const totalQty = list.reduce((sum, asset) => {
      const qty = Number(asset?.qty || 0);
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
    const visibleRows = list.slice(0, 3);
    const hiddenCount = Math.max(0, list.length - visibleRows.length);
    const rowsHtml = visibleRows.map((asset) => {
      const name = asset?.name || asset?.code || "-";
      const qty = Number(asset?.qty || 0);
        const qtyText = Number.isFinite(qty) ? String(qty) : "0";
        return `
        <div class="borrow-staff-item-row">
          <span class="borrow-staff-item-name">${safeEscape(name)}</span>
          <span class="borrow-staff-item-qty">
            <span class="borrow-staff-item-qty-number">${safeEscape(qtyText)}</span>
            ${asset?.unit ? `<span class="borrow-staff-item-unit">${safeEscape(asset.unit)}</span>` : ""}
          </span>
        </div>
      `;
    }).join("");
    const moreLine = hiddenCount
      ? `<div class="borrow-staff-items-more">+ อีก ${safeEscape(hiddenCount)} รายการ</div>`
      : "";
    const noteLine = (staffNote || "").toString().trim()
      ? `<div class="borrow-staff-items-note">หมายเหตุ: ${safeEscape(staffNote)}</div>`
      : "";
    return `
      <div class="borrow-staff-items">
        <div class="borrow-staff-items-head" aria-hidden="true">
          <span>รายการพัสดุ</span>
        </div>
        ${rowsHtml}
        ${moreLine}
        <div class="borrow-staff-items-total">รวม ${safeEscape(totalQty)} ชิ้น</div>
        ${noteLine}
      </div>
    `;
  };

  const renderPeriodCell = (item) => `
    <div class="borrow-staff-period">
      <div class="borrow-staff-period-row"><span class="borrow-staff-period-label">รับ</span><span>${safeEscape(formatDate(item.pickupDate || ""))}</span></div>
      <div class="borrow-staff-period-row"><span class="borrow-staff-period-label">คืน</span><span>${safeEscape(formatDate(item.returnDate || ""))}</span></div>
    </div>
  `;

  const renderFollowupCell = (item) => {
    const meta = buildBorrowFollowupMeta(item);
    if ((item?.status !== STATUS_APPROVED && item?.status !== STATUS_RECEIVED) || !meta.dueSoon) return "-";
    return `<span class="badge ${safeEscape(meta.badgeClass)}">${safeEscape(meta.statusText)}</span>`;
  };

  const renderStaffRequestCard = (item, actionHtml, staffNote = "") => {
    const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "-";
    const requestNo = (item.requestNo || item.id || "-").toString().trim();
    const orgMeta = [item.projectName, item.projectDept].filter(Boolean).join(" • ");
    const contactMeta = [item.phone, item.lineId ? `Line: ${item.lineId}` : ""].filter(Boolean).join(" • ");
    const followupHtml = renderFollowupCell(item);
    return `
      <article class="borrow-staff-request-card">
        <header class="borrow-queue-card-header">
          <div class="borrow-staff-card-topline">
            <span class="borrow-staff-request-no">${safeEscape(requestNo)}</span>
            <span class="borrow-staff-request-date">ยื่น ${safeEscape(formatDate(item.createdDate || "") || "-")}${item.academicYear ? ` · ปีการศึกษา ${safeEscape(item.academicYear)}` : ""}</span>
          </div>
          <div class="borrow-queue-badges">${statusBadge(item.status)}${followupHtml !== "-" ? followupHtml : ""}</div>
        </header>
        <div class="borrow-staff-card-main">
          <div class="borrow-queue-label">ผู้ขอ / หน่วยงาน</div>
          <div class="borrow-staff-card-name">${safeEscape(fullName)}</div>
          ${orgMeta ? `<div class="borrow-staff-card-meta">${safeEscape(orgMeta)}</div>` : ""}
          ${item.borrowProjectName ? `<div class="borrow-queue-project"><span>โครงการ</span>${safeEscape(item.borrowProjectName)}</div>` : ""}
          ${contactMeta ? `<div class="borrow-staff-card-contact">${safeEscape(contactMeta)}</div>` : ""}
        </div>
        <div class="borrow-staff-card-assets">${renderAssetsCell(item.assets, staffNote)}</div>
        <div class="borrow-staff-card-period">
          <div class="borrow-queue-label">กำหนดรับ–คืน</div>
          ${renderPeriodCell(item)}
          <div class="borrow-staff-actions borrow-staff-card-actions">${actionHtml}</div>
        </div>
      </article>
    `;
  };

  let staffRequestTabMode = "queue";
  const setStaffRequestPanelMeta = () => {
    if (staffRequestPanelTitleEl) {
      staffRequestPanelTitleEl.textContent = staffRequestTabMode === "history"
        ? "ประวัติการขอ"
        : "รายการขอยืมพัสดุ";
    }
    if (staffRequestPanelCaptionEl) {
      staffRequestPanelCaptionEl.textContent = staffRequestTabMode === "history"
        ? "แสดงคำขอที่ดำเนินการแล้วหรือเลยวันคืนก่อนอนุมัติ"
        : "ตรวจสอบพัสดุและวันรับ–คืน แล้วเลือกดำเนินการกับคำขอ";
    }
  };

  const renderStaffQueue = () => {
    if (!staffQueueTableBody) return;
    setStaffRequestPanelMeta();
    const totalList = [...borrowRequests]
      .filter((item) => !item.isDeleted)
      .filter(isStaffBorrowQueueItem)
      .sort((a, b) => (b.submittedAtMs || 0) - (a.submittedAtMs || 0));
    const list = totalList.filter(matchesStaffBorrowRequestFilters);
    if (staffRequestTabMode !== "queue") {
      renderStaffSummary();
      return;
    }
    renderStaffBorrowOverview(list);
    renderStaffBorrowRequestFilterSummary(list.length, totalList.length);
    if (!list.length) {
      renderStaffRequestPager({ total: 0 });
      staffQueueTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="list-empty-cell">${renderListEmptyState(hasActiveStaffBorrowRequestFilters() ? "ไม่พบคำขอตามตัวกรอง" : "ยังไม่มีคำขอในระบบ", hasActiveStaffBorrowRequestFilters() ? "ลองเปลี่ยนหรือล้างตัวกรองเพื่อดูรายการอื่น" : "คำขอในหมวดนี้จะแสดงที่นี่เมื่อมีรายการ", hasActiveStaffBorrowRequestFilters() ? "search" : "box")}</td>
        </tr>
      `;
      renderStaffSummary();
      return;
    }
    const pageMeta = getPagedRows(list, staffRequestPageByMode.queue);
    staffRequestPageByMode.queue = pageMeta.currentPage;
    renderStaffRequestPager(pageMeta);

    staffQueueTableBody.innerHTML = pageMeta.rows.map((item) => {
      const actionHtml = `
        <select
          class="staff-status-select borrow-staff-status-select ${borrowStatusSelectClass(item.status)}"
          data-role="borrow-status-select"
          data-id="${safeEscape(item.id)}"
          data-source="${safeEscape(item.sourceCollection || "")}"
          aria-label="จัดการสถานะคำขอยืมพัสดุ"
        >
          <option value="${STATUS_PENDING}" ${item.status === STATUS_PENDING ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_PENDING)}</option>
          <option value="${STATUS_APPROVED}" ${item.status === STATUS_APPROVED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_APPROVED)}</option>
          <option value="${STATUS_RECEIVED}" ${item.status === STATUS_RECEIVED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_RECEIVED)}</option>
          <option value="${STATUS_REJECTED}" ${item.status === STATUS_REJECTED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_REJECTED)}</option>
          <option value="${STATUS_CANCELLED}" ${item.status === STATUS_CANCELLED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_CANCELLED)}</option>
          <option value="${STATUS_RETURNED}" ${item.status === STATUS_RETURNED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_RETURNED)}</option>
          <option value="delete">${borrowStatusOptionLabel("delete")}</option>
        </select>
      `;

      return `
        <tr class="borrow-staff-row" data-request-id="${safeEscape(item.id)}" data-request-source="${safeEscape(item.sourceCollection || "")}">
          <td colspan="5">${renderStaffRequestCard(item, actionHtml, "")}</td>
        </tr>
      `;
    }).join("");
    renderStaffSummary();
  };

  const renderStaffHistory = () => {
    if (!staffQueueTableBody) return;
    const totalHistoryList = [...borrowRequests]
      .filter((item) => !item.isDeleted)
      .filter(isStaffBorrowHistoryItem)
      .sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    const historyList = totalHistoryList.filter(matchesStaffBorrowRequestFilters);
    if (staffRequestTabMode !== "history") {
      if (staffHistoryTableBody) {
        if (!historyList.length) {
          staffHistoryTableBody.innerHTML = `
            <tr>
              <td colspan="5" class="list-empty-cell">${renderListEmptyState("ยังไม่มีประวัติคำขอ", "รายการที่ดำเนินการแล้วจะแสดงที่นี่", "box")}</td>
            </tr>
          `;
        } else {
          staffHistoryTableBody.innerHTML = "";
        }
      }
      return;
    }
    renderStaffBorrowOverview(historyList);
    renderStaffBorrowRequestFilterSummary(historyList.length, totalHistoryList.length);
    if (!historyList.length) {
      renderStaffRequestPager({ total: 0 });
      staffQueueTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="list-empty-cell">${renderListEmptyState(hasActiveStaffBorrowRequestFilters() ? "ไม่พบประวัติตามตัวกรอง" : "ยังไม่มีประวัติคำขอ", hasActiveStaffBorrowRequestFilters() ? "ลองเปลี่ยนหรือล้างตัวกรองเพื่อดูรายการอื่น" : "คำขอในหมวดนี้จะแสดงที่นี่เมื่อมีรายการ", hasActiveStaffBorrowRequestFilters() ? "search" : "box")}</td>
        </tr>
      `;
      if (staffHistoryTableBody) {
        staffHistoryTableBody.innerHTML = staffQueueTableBody.innerHTML;
      }
      return;
    }
    const pageMeta = getPagedRows(historyList, staffRequestPageByMode.history);
    staffRequestPageByMode.history = pageMeta.currentPage;
    renderStaffRequestPager(pageMeta);
    const html = pageMeta.rows.map((item) => {
      const actionHtml = `
        <select
          class="staff-status-select borrow-staff-status-select ${borrowStatusSelectClass(item.status)}"
          data-role="borrow-status-select"
          data-id="${safeEscape(item.id)}"
          data-source="${safeEscape(item.sourceCollection || "")}"
          aria-label="จัดการสถานะคำขอยืมพัสดุ"
        >
          <option value="${STATUS_PENDING}" ${item.status === STATUS_PENDING ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_PENDING)}</option>
          <option value="${STATUS_APPROVED}" ${item.status === STATUS_APPROVED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_APPROVED)}</option>
          <option value="${STATUS_RECEIVED}" ${item.status === STATUS_RECEIVED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_RECEIVED)}</option>
          <option value="${STATUS_REJECTED}" ${item.status === STATUS_REJECTED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_REJECTED)}</option>
          <option value="${STATUS_CANCELLED}" ${item.status === STATUS_CANCELLED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_CANCELLED)}</option>
          <option value="${STATUS_RETURNED}" ${item.status === STATUS_RETURNED ? "selected" : ""}>${borrowStatusOptionLabel(STATUS_RETURNED)}</option>
          <option value="delete">${borrowStatusOptionLabel("delete")}</option>
        </select>
      `;
      return `
        <tr
          class="borrow-staff-row borrow-history-row"
          data-request-id="${safeEscape(item.id)}"
          data-request-source="${safeEscape(item.sourceCollection || "")}"
          tabindex="0"
          role="button"
          aria-label="ดูรายละเอียดคำขอ ${safeEscape(item.requestNo || item.id || "-")}"
        >
          <td colspan="5">${renderStaffRequestCard(item, actionHtml, item.staffNote || "")}</td>
        </tr>
      `;
    }).join("");
    staffQueueTableBody.innerHTML = html;
    if (staffHistoryTableBody) {
      staffHistoryTableBody.innerHTML = html;
    }
  };

  const setStaffQueueStatusMessage = (text) => {
    if (!staffQueueTableBody) return;
    staffQueueTableBody.innerHTML = `
      <tr>
        <td colspan="5">${safeEscape(text || "-")}</td>
      </tr>
    `;
  };

