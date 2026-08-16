/* Meeting room booking staff approval (Firestore shared data) */
function initMeetingRoomStaffApproval() {
  if (window.__meetingRoomStaffInitDone) return true;
  const queueBody = document.getElementById("meetingRoomStaffQueueBody");
  const approvedCountEl = document.getElementById("meetingRoomApprovedCount");
  const pendingCountEl = document.getElementById("meetingRoomStaffPendingCount");
  const rejectedCountEl = document.getElementById("meetingRoomRejectedCount");
  const allCountEl = document.getElementById("meetingRoomAllCount");
  const allTableBody = document.getElementById("meetingRoomAllTableBody");
  const staffMeetingAllSection = document.getElementById("staffMeetingAll");
  const panelTitleEl = document.getElementById("meetingRoomStaffPanelTitle");
  const panelCaptionEl = document.getElementById("meetingRoomStaffPanelCaption");
  const staffActionMessageEl = document.getElementById("meetingRoomStaffActionMessage");
  const staffRequestReminderEl = document.getElementById("meetingStaffRequestReminder");
  const historySearchWrapEl = document.getElementById("meetingRoomHistorySearchWrap");
  const historyStartDateInputEl = document.getElementById("meetingRoomHistoryStartDateInput");
  const historyEndDateInputEl = document.getElementById("meetingRoomHistoryEndDateInput");
  const historyLoadBtnEl = document.getElementById("meetingRoomHistoryLoadBtn");
  const historyResetBtnEl = document.getElementById("meetingRoomHistoryResetBtn");
  const historyRoomSelectEl = document.getElementById("meetingRoomHistoryRoomSelect");
  const historySearchInputEl = document.getElementById("meetingRoomHistorySearchInput");
  const exportCsvBtnEl = document.getElementById("meetingRoomExportCsvBtn");
  const roomManageForm = document.getElementById("meetingRoomManageForm");
  const roomManageInput = document.getElementById("meetingRoomManageInput");
  const roomManageAccessFieldset = document.getElementById("meetingRoomManageAccess");
  const roomManageMessage = document.getElementById("meetingRoomManageMessage");
  const roomManageDialogMessage = document.getElementById("meetingRoomManageDialogMessage");
  const roomManageList = document.getElementById("meetingRoomManageList");
  const roomManageCountEl = document.getElementById("meetingRoomManageCount");
  const holidayManageForm = document.getElementById("meetingHolidayManageForm");
  const holidayManageDateInput = document.getElementById("meetingHolidayManageDate");
  const holidayManageNameInput = document.getElementById("meetingHolidayManageName");
  const holidayManageMessage = document.getElementById("meetingHolidayManageMessage");
  const holidayManageDialogMessage = document.getElementById("meetingHolidayManageDialogMessage");
  const holidayManageList = document.getElementById("meetingHolidayManageList");
  const holidayManageCountEl = document.getElementById("meetingHolidayManageCount");
  const holidayCalendarEl = document.getElementById("meetingHolidayCalendar");
  const holidayCalendarTitleEl = document.getElementById("meetingHolidayCalendarTitle");
  const holidayCalendarPrevBtn = document.getElementById("meetingHolidayCalendarPrev");
  const holidayCalendarNextBtn = document.getElementById("meetingHolidayCalendarNext");
  const staffCalendarPanel = document.getElementById("meetingRoomStaffCalendar");
  const staffCalendarTitle = document.getElementById("meetingStaffCalendarTitle");
  const staffCalendarPrevBtn = document.getElementById("meetingStaffCalendarPrevMonth");
  const staffCalendarNextBtn = document.getElementById("meetingStaffCalendarNextMonth");
  const bookingDayModalEl = document.getElementById("meetingBookingDayModal");
  const bookingDayModalTitleEl = document.getElementById("meetingBookingDayTitle");
  const bookingDayModalBodyEl = document.getElementById("meetingBookingDayBody");
  const bookingDayModalCloseEl = document.getElementById("meetingBookingDayClose");
  const bookingDetailModalEl = document.getElementById("meetingBookingDetailModal");
  const bookingDetailTitleEl = document.getElementById("meetingBookingDetailTitle");
  const bookingDetailBodyEl = document.getElementById("meetingBookingDetailBody");
  const bookingDetailCloseEl = document.getElementById("meetingBookingDetailClose");
  const rejectReasonModalEl = document.getElementById("meetingRejectReasonModal");
  const rejectReasonInputEl = document.getElementById("meetingRejectReasonInput");
  const rejectReasonErrorEl = document.getElementById("meetingRejectReasonError");
  const rejectReasonSubmitEl = document.getElementById("meetingRejectReasonSubmit");
  const rejectReasonCancelEl = document.getElementById("meetingRejectReasonCancel");
  const rejectReasonCloseEl = document.getElementById("meetingRejectReasonClose");
  const tabButtons = Array.from(
    document.querySelectorAll(".tab-btn[data-meeting-staff-tab]")
  );
  const mainTabButtons = Array.from(
    document.querySelectorAll(".tab-btn[data-meeting-staff-main-tab]")
  );
  const requestsViewEl = document.getElementById("meetingStaffRequestsView");
  const settingsViewEl = document.getElementById("meetingStaffSettingsView");
  const roomAddDialog = document.getElementById("meetingRoomAddDialog");
  const roomEditDialog = document.getElementById("meetingRoomEditDialog");
  const roomEditForm = document.getElementById("meetingRoomEditForm");
  const roomEditNameInput = document.getElementById("meetingRoomEditName");
  const roomEditAccessFieldset = document.getElementById("meetingRoomEditAccess");
  const roomEditDeleteBtn = document.getElementById("meetingRoomEditDeleteBtn");
  const roomEditDialogMessage = document.getElementById("meetingRoomEditDialogMessage");
  const roomDeleteDialog = document.getElementById("meetingRoomDeleteDialog");
  const roomDeleteNameEl = document.getElementById("meetingRoomDeleteName");
  const roomDeleteConfirmBtn = document.getElementById("meetingRoomDeleteConfirmBtn");
  const roomDeleteDialogMessage = document.getElementById("meetingRoomDeleteDialogMessage");
  const holidayAddDialog = document.getElementById("meetingHolidayAddDialog");
  const roomAddOpenBtn = document.getElementById("meetingRoomAddOpenBtn");
  const holidayAddOpenBtn = document.getElementById("meetingHolidayAddOpenBtn");

  if (!allTableBody) {
    return false;
  }

  const setMainView = (view = "requests") => {
    const showSettings = view === "settings";
    if (requestsViewEl) requestsViewEl.style.display = showSettings ? "none" : "block";
    if (settingsViewEl) settingsViewEl.style.display = showSettings ? "block" : "none";
    mainTabButtons.forEach((button) => {
      const isActive = button.dataset.meetingStaffMainTab === view;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    document
      .querySelector('section[data-page="meeting-room-staff"]')
      ?.classList.toggle("is-settings-view", showSettings);
    window.syncDashboardMobileActionBar?.();
  };

  mainTabButtons.forEach((button) => {
    button.addEventListener("click", () => setMainView(button.dataset.meetingStaffMainTab));
  });
  setMainView("requests");

  const bindSettingsDialog = (dialog, openButton, focusTarget) => {
    if (!dialog || !openButton) return;
    const close = () => dialog.close();
    openButton.addEventListener("click", () => {
      if (dialog === roomAddDialog && roomManageDialogMessage) roomManageDialogMessage.textContent = "";
      if (dialog === roomAddDialog) setAccessToggleValue(roomManageAccessFieldset, "public");
      if (dialog === holidayAddDialog && holidayManageDialogMessage) holidayManageDialogMessage.textContent = "";
      dialog.showModal();
      window.setTimeout(() => focusTarget?.focus(), 0);
    });
    dialog.querySelectorAll(".meeting-settings-dialog-close, .meeting-settings-dialog-cancel")
      .forEach((button) => button.addEventListener("click", close));
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
  };
  bindSettingsDialog(roomAddDialog, roomAddOpenBtn, roomManageInput);
  bindSettingsDialog(holidayAddDialog, holidayAddOpenBtn, holidayManageDateInput);

  function setAccessToggleValue(fieldset, value = "public") {
    if (!fieldset) return;
    const normalizedValue = normalizeRoomBookingAccess(value);
    const input = fieldset.querySelector(`input[type="radio"][value="${normalizedValue}"]`);
    if (input) input.checked = true;
    const help = fieldset.querySelector("[data-access-help]");
    if (help) {
      help.textContent = normalizedValue === "staff_only"
        ? "ห้องนี้จะแสดงและเปิดให้จองเฉพาะ Staff"
        : "ผู้ใช้งานทั่วไปสามารถส่งคำขอจองห้องนี้ได้";
    }
  }

  const readAccessToggleValue = (fieldset) =>
    fieldset?.querySelector('input[type="radio"]:checked')?.value || "public";

  [roomManageAccessFieldset, roomEditAccessFieldset].filter(Boolean).forEach((fieldset) => {
    fieldset.addEventListener("change", () => setAccessToggleValue(fieldset, readAccessToggleValue(fieldset)));
  });

  if (roomEditDialog) {
    const closeRoomEditDialog = () => roomEditDialog.close();
    roomEditDialog.querySelectorAll(".meeting-settings-dialog-close, .meeting-settings-dialog-cancel")
      .forEach((button) => button.addEventListener("click", closeRoomEditDialog));
    roomEditDialog.addEventListener("click", (event) => {
      if (event.target === roomEditDialog) closeRoomEditDialog();
    });
  }

  if (roomDeleteDialog) {
    const closeRoomDeleteDialog = () => roomDeleteDialog.close();
    roomDeleteDialog.querySelectorAll(".meeting-settings-dialog-close, .meeting-settings-dialog-cancel")
      .forEach((button) => button.addEventListener("click", closeRoomDeleteDialog));
    roomDeleteDialog.addEventListener("click", (event) => {
      if (event.target === roomDeleteDialog) closeRoomDeleteDialog();
    });
  }

  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const firestoreCollections = appConfig.firestore?.collections || {};
  const COLLECTION_NAME = firestoreCollections.meetingRoomBookings || "meetingRoomBookings";
  const ROOM_COLLECTION_NAME = firestoreCollections.meetingRooms || "meetingRooms";
  const HOLIDAY_COLLECTION_NAME = firestoreCollections.meetingRoomHolidays || "meetingRoomHolidays";
  const STAFF_REQUEST_STATUSES = new Set(["pending", "cancel_requested", "reschedule_requested"]);
  const STAFF_MEETING_PAGE_SIZE = 50;
  const STAFF_BOOKING_LIST_LIMIT = 1000;
  const STAFF_BOOKING_LOOKBACK_MONTHS = 1;
  const STAFF_BOOKING_LOOKAHEAD_MONTHS = 3;
  const DEFAULT_ROOMS = [
    { id: "room-1", name: "ห้องประชุม 1 ชั้น 2", bookingAccess: "public", isDefault: true },
    { id: "room-2", name: "ห้องประชุม 2 ชั้น 2", bookingAccess: "public", isDefault: true },
    { id: "room-3", name: "ห้องประชุม 3 ชั้น 2", bookingAccess: "public", isDefault: true }
  ];

  let firestore = window.sgcuFirestore || {};
  let hasFirestore = false;
  const resolveFirestoreBridge = () => {
    firestore = window.sgcuFirestore || {};
    hasFirestore = !!(
      firestore.db &&
      firestore.collection &&
      firestore.addDoc &&
      firestore.onSnapshot &&
      firestore.query &&
      firestore.where &&
      firestore.orderBy &&
      firestore.doc &&
      firestore.deleteDoc &&
      firestore.updateDoc &&
      firestore.serverTimestamp
    );
    return hasFirestore;
  };

  if (!resolveFirestoreBridge()) {
    if (queueBody) {
      queueBody.innerHTML = `
        <tr>
          <td colspan="7">กำลังเชื่อมต่อข้อมูลการจองห้องประชุม...</td>
        </tr>
      `;
    }
    allTableBody.innerHTML = `
      <tr>
        <td colspan="6">กำลังเชื่อมต่อข้อมูลการจองห้องประชุม...</td>
      </tr>
    `;
    return false;
  }

  const normalizeStatus = (status) => {
    const value = (status || "pending").toString().trim().toLowerCase();
    if (value === "approved" || value === "rejected" || value === "cancel_requested" || value === "reschedule_requested" || value === "no_show") return value;
    return "pending";
  };
  const normalizeRequesterProfileType = (value = "") => {
    const text = (value || "").toString().trim().toLowerCase();
    if (text === "affairs" || text === "staff" || text === "personnel" || text === "บุคลากร") return "affairs";
    if (text === "student" || text === "นิสิต") return "student";
    return "";
  };
  const getRequesterProfileTypeLabel = (value = "") => {
    const type = normalizeRequesterProfileType(value);
    if (type === "affairs") return "บุคลากร";
    if (type === "student") return "นิสิต";
    return "";
  };
  const deriveRequesterProfileType = (item = {}) => {
    const explicitType = normalizeRequesterProfileType(item.requesterProfileType || item.profileType);
    if (explicitType) return explicitType;
    const email = (item.requesterEmail || item.email || "").toString().trim().toLowerCase();
    if (!email) return "";
    const domain = email.split("@")[1] || "";
    if (domain.startsWith("student.") || domain.includes(".student.")) return "student";
    if (domain === "chula.ac.th" || domain.endsWith(".chula.ac.th")) return "affairs";
    return "";
  };
  const formatRequesterDisplay = (item = {}) => {
    const requester = (item.requester || "").toString().trim() || "-";
    const label = getRequesterProfileTypeLabel(deriveRequesterProfileType(item));
    return requester !== "-" && label ? `${requester} (${label})` : requester;
  };
  const NO_SHOW_REASON_MARKER = "[NO_SHOW]";
  const isNoShowReason = (reason) =>
    (reason || "").toString().trim().toUpperCase().startsWith(NO_SHOW_REASON_MARKER);
  const buildNoShowReason = (reason = "") => {
    const text = (reason || "").toString().trim();
    if (isNoShowReason(text)) return text;
    return `${NO_SHOW_REASON_MARKER} ไม่มาใช้ห้องตามเวลาจอง`;
  };

  const normalizeRoomBookingAccess = (value) =>
    value === "staff_only" ? "staff_only" : "public";

  const roomBookingAccessLabel = (value) =>
    value === "staff_only" ? "สตาฟจองเท่านั้น" : "คนทั่วไปจอง";

  const roomBookingAccessClass = (value) =>
    value === "staff_only" ? "is-staff-only" : "is-public";

  const statusLabel = (status) => {
    if (status === "approved") return '<span class="badge badge-approved">อนุมัติแล้ว</span>';
    if (status === "rejected") return '<span class="badge badge-rejected">ปฏิเสธ</span>';
    if (status === "cancel_requested") return '<span class="badge badge-warning">ขอยกเลิก</span>';
    if (status === "reschedule_requested") return '<span class="badge badge-warning">ขอเปลี่ยนห้อง/เวลา</span>';
    if (status === "no_show") return '<span class="badge badge-warning">No-show</span>';
    return '<span class="badge badge-pending">รออนุมัติ</span>';
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  };

  const parseBookingEndDateTime = (booking) => {
    const dateText = String(booking?.date || "").trim();
    if (!dateText) return null;
    const endTimeText = String(booking?.endTime || "").trim() || "23:59";
    const safeTime = /^\d{1,2}:\d{2}$/.test(endTimeText) ? `${endTimeText}:00` : "23:59:59";
    const parsed = new Date(`${dateText}T${safeTime}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    const fallback = new Date(`${dateText}T23:59:59`);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  };

  const isPastBooking = (booking) => {
    const endAt = parseBookingEndDateTime(booking);
    if (!endAt) return false;
    return endAt.getTime() < Date.now();
  };

  const MONTH_NAMES_TH = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม"
  ];

  const getCalendarMonthState = (date) => {
    const safe = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const firstDay = new Date(safe.getFullYear(), safe.getMonth(), 1);
    return {
      year: firstDay.getFullYear(),
      month: firstDay.getMonth(),
      firstDay
    };
  };

  const toDateKey = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const DEFAULT_THAI_PUBLIC_HOLIDAYS = [
    { md: "01-01", name: "วันขึ้นปีใหม่" },
    { md: "04-06", name: "วันจักรี" },
    { md: "04-13", name: "วันสงกรานต์" },
    { md: "04-14", name: "วันสงกรานต์" },
    { md: "04-15", name: "วันสงกรานต์" },
    { md: "05-01", name: "วันแรงงานแห่งชาติ" },
    { md: "05-04", name: "วันฉัตรมงคล" },
    { md: "06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี" },
    { md: "07-28", name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว" },
    { md: "08-12", name: "วันแม่แห่งชาติ" },
    { md: "10-13", name: "วันนวมินทรมหาราช" },
    { md: "10-23", name: "วันปิยมหาราช" },
    { md: "12-05", name: "วันพ่อแห่งชาติ" },
    { md: "12-10", name: "วันรัฐธรรมนูญ" },
    { md: "12-31", name: "วันสิ้นปี" }
  ];

  const getHolidayYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  };

  const readHolidayLookup = () => {
    const map = new Map();
    getHolidayYears().forEach((year) => {
      DEFAULT_THAI_PUBLIC_HOLIDAYS.forEach((item) => {
        map.set(`${year}-${item.md}`, item.name);
      });
    });
    const source = window.sgcuHolidayData;
    if (Array.isArray(source)) {
      source.forEach((item) => {
        const date = (item?.date || "").toString().trim();
        if (!date) return;
        const name = (item?.name || item?.title || "วันหยุด").toString().trim() || "วันหยุด";
        map.set(date, name);
      });
    }
    return map;
  };

  const defaultHolidayLookup = readHolidayLookup();
  let holidayLookup = new Map(defaultHolidayLookup);

  const getHolidayName = (date, dateKey) => {
    const explicit = holidayLookup.get(dateKey);
    if (explicit) return explicit;
    const day = date.getDay();
    if (day === 0) return "วันหยุดสุดสัปดาห์";
    return "";
  };

  const escapeText = (value) => {
    const safe = (value ?? "").toString();
    return safe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  };

  const calendarStatusClass = (status) => {
    if (status === "approved") return "approved";
    if (status === "rejected") return "cancelled";
    if (status === "cancel_requested" || status === "reschedule_requested" || status === "no_show") return "cancel-requested";
    return "pending";
  };

  const getMeetingCalendarMaxEvents = () => {
    if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) return 2;
    if (window.matchMedia && window.matchMedia("(max-width: 860px)").matches) return 3;
    return 4;
  };

  const statusText = (status) => {
    if (status === "approved") return "อนุมัติแล้ว";
    if (status === "rejected") return "ไม่อนุมัติ / ยกเลิกแล้ว";
    if (status === "cancel_requested") return "ขอยกเลิก (รออนุมัติ)";
    if (status === "reschedule_requested") return "ขอเปลี่ยนห้อง/เวลา (รออนุมัติ)";
    if (status === "no_show") return "ไม่มาใช้ห้อง (No-show)";
    return "รออนุมัติ";
  };

  const statusBadgeClass = (status) => {
    if (status === "approved") return "badge-approved";
    if (status === "rejected") return "badge-rejected";
    if (status === "cancel_requested" || status === "reschedule_requested" || status === "no_show") return "badge-warning";
    return "badge-pending";
  };

  const formatLongDate = (dateText = "") => {
    if (!dateText) return "-";
    const parsed = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateText;
    return parsed.toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const getStaffDayBookings = (dateText = "", sourceRows = []) => {
    if (!dateText) return [];
    return [...sourceRows]
      .filter((item) => item.date === dateText)
      .sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")));
  };

  const setStaffBookingDayBody = (dateText = "", sourceRows = []) => {
    if (!bookingDayModalTitleEl || !bookingDayModalBodyEl) return;
    const items = getStaffDayBookings(dateText, sourceRows);
    bookingDayModalTitleEl.textContent = `รายการคำขอวันที่ ${formatLongDate(dateText)} (${items.length} รายการ)`;
    if (!items.length) {
      bookingDayModalBodyEl.innerHTML = '<div class="section-text-sm">ไม่มีรายการคำขอในวันที่เลือก</div>';
      return;
    }
    bookingDayModalBodyEl.innerHTML = `
      <div class="modal-table-wrap meeting-day-modal-table-wrap">
        <table class="modal-table meeting-day-modal-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ห้อง</th>
              <th>ผู้ขอ</th>
              <th>วัตถุประสงค์</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr
                data-booking-id="${escapeText(item.id || "")}"
                data-include-contact="true"
                data-allow-status-edit="true"
              >
                <td data-label="เวลา">${escapeText(`${item.startTime || "-"} - ${item.endTime || "-"}`)}</td>
                <td data-label="ห้อง">${escapeText(normalizeRoomDisplay(item.roomId, item.roomName))}</td>
                <td data-label="ผู้ขอ">${escapeText(formatRequesterDisplay(item))}</td>
                <td data-label="วัตถุประสงค์">${escapeText(item.purpose || "-")}</td>
                <td data-label="สถานะ">
                  <span class="status-pill ${statusBadgeClass(item.status)}">${escapeText(statusText(item.status))}</span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="section-text-sm" style="margin-top:8px;color:#6b7280;">คลิกแถวเพื่อดูรายละเอียดรายการจอง</div>
    `;
  };

  const openStaffBookingDayModal = (dateText = "", sourceRows = []) => {
    if (!dateText || !bookingDayModalEl || typeof openDialog !== "function") return;
    activeStaffDayModalDate = dateText;
    setStaffBookingDayBody(dateText, sourceRows);
    openDialog(bookingDayModalEl, { focusSelector: "#meetingBookingDayClose" });
  };

  const closeStaffBookingDayModal = () => {
    activeStaffDayModalDate = "";
    if (bookingDayModalEl && typeof closeDialog === "function") {
      closeDialog(bookingDayModalEl);
    }
  };

  const openStaffBookingDetailFallback = (bookingId = "") => {
    const booking = bookings.find((item) => item.id === bookingId);
    if (!bookingDetailModalEl || !bookingDetailBodyEl || !bookingDetailTitleEl) return;
    bookingDetailTitleEl.textContent = "รายละเอียดการจองห้องประชุม";
    if (!booking) {
      bookingDetailBodyEl.innerHTML = '<div class="section-text-sm">ไม่พบรายละเอียดรายการจอง</div>';
    } else {
      const contactText = [booking.contactPhone, booking.contactInfo]
        .filter((value) => (value || "").toString().trim())
        .join(" / ") || "-";
      const rows = [
        ["ห้องประชุม", normalizeRoomDisplay(booking.roomId, booking.roomName)],
        ["วันที่", formatDate(booking.date)],
        ["เวลา", `${booking.startTime || "-"} - ${booking.endTime || "-"}`],
        ["ผู้ขอ", formatRequesterDisplay(booking)],
        ["ข้อมูลติดต่อ", contactText],
        ["วัตถุประสงค์", booking.purpose || "-"],
        ["สถานะ", statusText(booking.status)]
      ];
      if (booking.cancelRequestReason) rows.push(["เหตุผลขอยกเลิก", booking.cancelRequestReason]);
      if (booking.rescheduleRequestedRoomId) {
        rows.push([
          "ห้องใหม่ที่ขอ",
          normalizeRoomDisplay(booking.rescheduleRequestedRoomId, booking.rescheduleRequestedRoomName)
        ]);
      }
      if (booking.rescheduleRequestedDate) {
        rows.push(["วันที่ใหม่ที่ขอ", formatDate(booking.rescheduleRequestedDate)]);
        rows.push([
          "เวลาใหม่ที่ขอ",
          `${booking.rescheduleRequestedStartTime || "-"} - ${booking.rescheduleRequestedEndTime || "-"}`
        ]);
      }
      if (booking.rescheduleRequestReason) rows.push(["เหตุผลขอเปลี่ยนห้อง/เวลา", booking.rescheduleRequestReason]);
      if (booking.rejectionReason) rows.push(["เหตุผลไม่อนุมัติ", booking.rejectionReason]);
      bookingDetailBodyEl.innerHTML = `
        <div class="meeting-booking-detail-shell">
          <div class="meeting-booking-detail-grid">
            ${rows.map(([label, value]) => `
              <div class="meeting-booking-detail-item">
                <div class="meeting-booking-detail-label">${escapeText(label)}</div>
                <div class="meeting-booking-detail-value">${escapeText(value)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }
    if (typeof openDialog === "function") {
      openDialog(bookingDetailModalEl, { focusSelector: "#meetingBookingDetailClose" });
    }
  };

  let bookings = [];
  let requestBookings = [];
  let historyBookings = [];
  let rooms = [...DEFAULT_ROOMS];
  let customHolidays = [];
  let unsubscribe = null;
  let unsubscribeHistory = null;
  let unsubscribeRooms = null;
  let unsubscribeHolidays = null;
  let hasRenderedOnce = false;
  let subscribeGuardTimer = null;
  let activeTab = "requests";
  const pageByTab = {
    requests: 1,
    history: 1
  };
  let isSeedingDefaultRooms = false;
  let activeManageRoomId = "";
  let calendarCursor = new Date();
  let holidayCalendarCursor = new Date();
  let activeStaffDayModalDate = "";
  let historyStartDateFilter = "";
  let historyEndDateFilter = "";
  let historyHasLoaded = false;
  let historyLoadErrorText = "";
  let historyRoomFilter = "all";
  let historySearchQuery = "";
  let roomsLoadFailed = false;
  let bookingsLoadFailed = false;
  let staffAutoRetryTimer = null;
  let staffAutoRetryAttempt = 0;
  let hasBookingSnapshotBaseline = false;
  let previousQueueStatusById = new Map();

  const normalizeRoomDisplay = (roomId, roomName) => {
    const matched = rooms.find((room) => room.id === roomId);
    return matched?.name || roomName || roomId || "-";
  };

  const mapSnapshotDoc = (docItem) => {
    const data = docItem.data() || {};
    const roomId = data.roomId || "";
    const normalizedDbStatus = normalizeStatus(data.status);
    const derivedStatus =
      normalizedDbStatus === "rejected" && isNoShowReason(data.rejectionReason)
        ? "no_show"
        : normalizedDbStatus;
    return {
      id: docItem.id,
      roomId,
      roomDisplay: normalizeRoomDisplay(roomId, data.roomName),
      roomName: data.roomName || "",
      date: data.date || "",
      startTime: data.startTime || "",
      endTime: data.endTime || "",
      requester: data.requester || "",
      requesterProfileType: normalizeRequesterProfileType(data.requesterProfileType || data.profileType),
      purpose: data.purpose || "",
      rejectionReason: data.rejectionReason || "",
      contactPhone: data.contactPhone || "",
      contactInfo: data.contactInfo || "",
      cancelBaseStatus: normalizeStatus(data.cancelBaseStatus),
      cancelRequestReason: data.cancelRequestReason || "",
      requesterEmail: (data.requesterEmail || "").toString().trim().toLowerCase(),
      rescheduleBaseStatus: normalizeStatus(data.rescheduleBaseStatus),
      rescheduleRequestedRoomId: data.rescheduleRequestedRoomId || "",
      rescheduleRequestedRoomName: data.rescheduleRequestedRoomName || "",
      rescheduleRequestedDate: data.rescheduleRequestedDate || "",
      rescheduleRequestedStartTime: data.rescheduleRequestedStartTime || "",
      rescheduleRequestedEndTime: data.rescheduleRequestedEndTime || "",
      rescheduleRequestReason: data.rescheduleRequestReason || "",
      startAt: data.startAt || "",
      endAt: data.endAt || "",
      status: derivedStatus
    };
  };

  const syncLoadedBookings = () => {
    const byId = new Map();
    [...requestBookings, ...historyBookings].forEach((booking) => {
      if (!booking?.id) return;
      byId.set(booking.id, booking);
    });
    bookings = Array.from(byId.values());
  };

  const getStaffBookingQueryWindow = () => {
    const base = calendarCursor instanceof Date && !Number.isNaN(calendarCursor.getTime())
      ? calendarCursor
      : new Date();
    const start = new Date(base.getFullYear(), base.getMonth() - STAFF_BOOKING_LOOKBACK_MONTHS, 1);
    const end = new Date(base.getFullYear(), base.getMonth() + STAFF_BOOKING_LOOKAHEAD_MONTHS + 1, 0);
    return {
      start: toDateKey(start),
      end: toDateKey(end)
    };
  };

  const pickBookingAuditFields = (item = {}) => ({
    id: item.id || "",
    roomId: item.roomId || "",
    roomName: item.roomName || "",
    date: item.date || "",
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    requester: item.requester || "",
    requesterProfileType: normalizeRequesterProfileType(item.requesterProfileType || item.profileType),
    requesterEmail: (item.requesterEmail || "").toString().trim().toLowerCase(),
    purpose: item.purpose || "",
    rejectionReason: item.rejectionReason || "",
    status: normalizeStatus(item.status),
    cancelBaseStatus: normalizeStatus(item.cancelBaseStatus),
    cancelRequestReason: item.cancelRequestReason || "",
    rescheduleBaseStatus: normalizeStatus(item.rescheduleBaseStatus),
    rescheduleRequestedRoomId: item.rescheduleRequestedRoomId || "",
    rescheduleRequestedRoomName: item.rescheduleRequestedRoomName || "",
    rescheduleRequestedDate: item.rescheduleRequestedDate || "",
    rescheduleRequestedStartTime: item.rescheduleRequestedStartTime || "",
    rescheduleRequestedEndTime: item.rescheduleRequestedEndTime || "",
    rescheduleRequestReason: item.rescheduleRequestReason || ""
  });

  const getAuditActor = () => {
    const authUser = window.sgcuAuth?.auth?.currentUser || null;
    const email = (authUser?.email || "").toString().trim().toLowerCase();
    return {
      actorUid: authUser?.uid || "",
      actorEmail: email,
      actorRole: "staff"
    };
  };

  const writeAuditLog = async (action, entityType, entityId, beforeData, afterData, metadata = {}) => {
    const actor = getAuditActor();
    return window.sgcuAuditLog?.write?.({
      action,
      entityType,
      entityId: entityId || "",
      before: beforeData || null,
      after: afterData || null,
      metadata: { ...(metadata || {}), actorRole: actor.actorRole },
      source: "web_app_staff"
    });
  };

  const toDateTime = (date, time) => new Date(`${date}T${time}:00`);

  const hasOverlap = (candidate, list, options = {}) => {
    const ignoredBookingId = options.ignoredBookingId || "";
    const parseDateOnly = (value) => {
      const text = (value || "").toString().trim();
      if (!text) return null;
      const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      const ymd = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmy) {
        let year = Number(dmy[3]);
        if (year > 2400) year -= 543;
        return new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
      }
      const parsed = new Date(text);
      if (!Number.isFinite(parsed.getTime())) return null;
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    };
    const parseMinutes = (value) => {
      const text = (value || "").toString().trim();
      const match = text.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const h = Number(match[1]);
      const m = Number(match[2]);
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return (h * 60) + m;
    };
    const dayKey = (dateObj) => {
      if (!(dateObj instanceof Date) || !Number.isFinite(dateObj.getTime())) return "";
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const d = String(dateObj.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };
    const parseDateTime = (dateTimeValue, dateValue, timeValue) => {
      const parsed = new Date(dateTimeValue);
      if (Number.isFinite(parsed.getTime())) return parsed;
      const dateObj = parseDateOnly(dateValue);
      const minutes = parseMinutes(timeValue);
      if (!dateObj || minutes === null) return null;
      return new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        Math.floor(minutes / 60),
        minutes % 60,
        0,
        0
      );
    };
    const candidateStart = parseDateTime("", candidate.date, candidate.startTime);
    const candidateEnd = parseDateTime("", candidate.date, candidate.endTime);
    if (!candidateStart || !candidateEnd) return false;
    const candidateDayKey = dayKey(parseDateOnly(candidate.date));
    const candidateStartMin = parseMinutes(candidate.startTime);
    const candidateEndMin = parseMinutes(candidate.endTime);
    const normalizeRoomValue = (value) =>
      (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
    const candidateRoomId = normalizeRoomValue(candidate.roomId);
    const candidateRoomName = normalizeRoomValue(candidate.roomName);
    const candidateRoomDisplay = normalizeRoomValue(
      normalizeRoomDisplay(candidate.roomId, candidate.roomName)
    );
    return list.some((item) => {
      if (ignoredBookingId && item.id === ignoredBookingId) return false;
      const itemRoomId = normalizeRoomValue(item.roomId);
      const itemRoomName = normalizeRoomValue(item.roomName);
      const itemRoomDisplay = normalizeRoomValue(
        normalizeRoomDisplay(item.roomId, item.roomName)
      );
      const sameRoomById = !!candidateRoomId && !!itemRoomId && candidateRoomId === itemRoomId;
      const sameRoomByName = !!candidateRoomName && !!itemRoomName && candidateRoomName === itemRoomName;
      const sameRoomByDisplay =
        !!candidateRoomDisplay && !!itemRoomDisplay && candidateRoomDisplay === itemRoomDisplay;
      if (!sameRoomById && !sameRoomByName && !sameRoomByDisplay) return false;
      if (item.status === "rejected") return false;
      const itemStart =
        parseDateTime("", item.date, item.startTime) ||
        parseDateTime(item.startAt, item.date, item.startTime);
      const itemEnd =
        parseDateTime("", item.date, item.endTime) ||
        parseDateTime(item.endAt, item.date, item.endTime);
      if (itemStart && itemEnd) {
        return candidateStart < itemEnd && candidateEnd > itemStart;
      }
      const itemDayKey = dayKey(parseDateOnly(item.date));
      const itemStartMin = parseMinutes(item.startTime);
      const itemEndMin = parseMinutes(item.endTime);
      if (
        !candidateDayKey ||
        !itemDayKey ||
        candidateDayKey !== itemDayKey ||
        candidateStartMin === null ||
        candidateEndMin === null ||
        itemStartMin === null ||
        itemEndMin === null
      ) {
        return false;
      }
      return candidateStartMin < itemEndMin && candidateEndMin > itemStartMin;
    });
  };

  const setRoomManageMessage = (text = "", color = "#374151") => {
    [roomManageMessage, roomManageDialogMessage, roomEditDialogMessage, roomDeleteDialogMessage].filter(Boolean).forEach((element) => {
      element.textContent = text;
      element.style.color = color;
    });
  };

  const setHolidayManageMessage = (text = "", color = "#374151") => {
    [holidayManageMessage, holidayManageDialogMessage].filter(Boolean).forEach((element) => {
      element.textContent = text;
      element.style.color = color;
    });
  };

  const setStaffRequestReminder = (text = "", color = "#9f1239") => {
    if (!staffRequestReminderEl) return;
    staffRequestReminderEl.textContent = text || "";
    staffRequestReminderEl.style.color = color;
    staffRequestReminderEl.hidden = !text;
  };

  const maybeSendStaffRequestNotification = (title, body) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      const webPush = window.sgcuWebPush;
      if (webPush && typeof webPush.showNotification === "function") {
        void webPush.showNotification(title, body, {
          icon: "img/icons/treasurer-icon-192.png",
          badge: "img/icons/treasurer-icon-192.png",
          data: { url: "./#meeting-room-staff" }
        });
        return;
      }
      const notificationIcon = "img/icons/treasurer-icon-192.png";
      // eslint-disable-next-line no-new
      new Notification(title, { body, icon: notificationIcon, badge: notificationIcon });
    } catch (_) {
      // ignore browser notification errors
    }
  };

  const queueTypeText = (status) => {
    if (status === "cancel_requested") return "คำขอยกเลิก";
    if (status === "reschedule_requested") return "คำขอเปลี่ยนห้อง/เวลา";
    return "คำขอจองใหม่";
  };

  const queueScheduleText = (booking) => {
    const currentSchedule = `${formatDate(booking.date)} ${booking.startTime || "-"}-${booking.endTime || "-"}`;
    if (normalizeStatus(booking.status) !== "reschedule_requested") {
      return currentSchedule;
    }
    const nextDate = formatDate(booking.rescheduleRequestedDate || "");
    const nextStart = booking.rescheduleRequestedStartTime || "-";
    const nextEnd = booking.rescheduleRequestedEndTime || "-";
    const nextRoom = booking.rescheduleRequestedRoomId
      ? `${normalizeRoomDisplay(booking.rescheduleRequestedRoomId, booking.rescheduleRequestedRoomName)} `
      : "";
    return `${currentSchedule} -> ${nextRoom}${nextDate} ${nextStart}-${nextEnd}`;
  };

  const syncStaffRequestNotifications = (list = []) => {
    const queueRows = list
      .filter((booking) => STAFF_REQUEST_STATUSES.has(normalizeStatus(booking.status)) && !isPastBooking(booking))
      .sort((a, b) => {
        const aDate = `${a.date || ""}T${a.startTime || "00:00"}`;
        const bDate = `${b.date || ""}T${b.startTime || "00:00"}`;
        return aDate.localeCompare(bDate);
      });

    setStaffRequestReminder("");

    const nextQueueState = new Map(
      queueRows.map((booking) => [booking.id, normalizeStatus(booking.status)])
    );

    if (!hasBookingSnapshotBaseline) {
      previousQueueStatusById = nextQueueState;
      hasBookingSnapshotBaseline = true;
      return;
    }

    const newEntries = [];
    queueRows.forEach((booking) => {
      const nextStatus = normalizeStatus(booking.status);
      const prevStatus = previousQueueStatusById.get(booking.id) || "";
      if (!STAFF_REQUEST_STATUSES.has(prevStatus) && STAFF_REQUEST_STATUSES.has(nextStatus)) {
        newEntries.push(booking);
      }
    });

    if (newEntries.length) {
      const latest = newEntries[0];
      const room = normalizeRoomDisplay(latest.roomId, latest.roomName);
      maybeSendStaffRequestNotification(
        `มีคำขอใหม่เข้าฝั่ง Staff (${newEntries.length})`,
        `${queueTypeText(latest.status)} • ${room} • ${queueScheduleText(latest)}`
      );
    }

    previousQueueStatusById = nextQueueState;
  };

  const refreshHolidayLookup = () => {
    holidayLookup = new Map(defaultHolidayLookup);
    customHolidays.forEach((item) => {
      if (!item?.date) return;
      const name = (item.name || "").toString().trim() || "วันหยุด";
      holidayLookup.set(item.date, name);
    });
  };

  const renderHolidayManageList = () => {
    if (!holidayCalendarEl) return;
    if (holidayManageCountEl) {
      holidayManageCountEl.textContent = `พบ ${customHolidays.length} วัน`;
    }
    const monthState = getCalendarMonthState(holidayCalendarCursor);
    const monthPrefix = `${monthState.year}-${String(monthState.month + 1).padStart(2, "0")}`;
    const monthHolidays = customHolidays
      .slice()
      .filter((item) => String(item.date || "").startsWith(monthPrefix))
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    if (holidayCalendarTitleEl) {
      holidayCalendarTitleEl.textContent = `${MONTH_NAMES_TH[monthState.month]} ${monthState.year + 543}`;
    }
    if (holidayCalendarEl) {
      const daysInMonth = new Date(monthState.year, monthState.month + 1, 0).getDate();
      const holidayByDate = new Map(monthHolidays.map((item) => [item.date, item]));
      const cells = [];
      for (let index = 0; index < monthState.firstDay.getDay(); index += 1) {
        cells.push('<span class="meeting-holiday-day is-empty" aria-hidden="true"></span>');
      }
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = toDateKey(new Date(monthState.year, monthState.month, day));
        const item = holidayByDate.get(dateKey);
        const isToday = dateKey === toDateKey(new Date());
        cells.push(`
          <button
            class="meeting-holiday-day${item ? " is-closed" : ""}${isToday ? " is-today" : ""}"
            type="button"
            data-action="select-holiday-date"
            data-date="${dateKey}"
            title="${item ? escapeText(item.name || "วันปิดให้บริการ") : "เพิ่มวันปิดให้บริการ"}"
          >
            <span class="meeting-holiday-day-number">${day}</span>
            ${item ? `<span class="meeting-holiday-day-label">${escapeText(item.name || "วันปิดให้บริการ")}</span>` : ""}
          </button>
        `);
      }
      holidayCalendarEl.innerHTML = cells.join("");
    }
  };

  const setStaffActionMessage = (text = "", color = "#374151") => {
    if (!staffActionMessageEl) return;
    staffActionMessageEl.textContent = text;
    staffActionMessageEl.style.color = color;
  };

  const confirmDeleteBooking = async () => {
    const fallbackConfirm = () => {
      if (typeof window.confirm !== "function") return false;
      return window.confirm("ยืนยันการลบคำขอนี้ออกจากระบบ?");
    };
    if (typeof document === "undefined") return fallbackConfirm();
    let modal = document.getElementById("meetingStaffDeleteConfirmModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "meetingStaffDeleteConfirmModal";
      modal.className = "modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width:460px;">
          <div class="modal-header">
            <div class="modal-title">ยืนยันการลบคำขอ</div>
            <button id="meetingStaffDeleteConfirmClose" class="modal-close" type="button" aria-label="ปิด">×</button>
          </div>
          <div class="modal-body">
            <p class="section-text-sm">ต้องการลบคำขอนี้ออกจากระบบใช่หรือไม่</p>
            <div class="modal-actions" style="margin-top:14px;">
              <button id="meetingStaffDeleteConfirmCancel" class="btn-ghost" type="button">ยกเลิก</button>
              <button id="meetingStaffDeleteConfirmOk" class="btn-primary" type="button">ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const closeBtn = modal.querySelector("#meetingStaffDeleteConfirmClose");
    const cancelBtn = modal.querySelector("#meetingStaffDeleteConfirmCancel");
    const okBtn = modal.querySelector("#meetingStaffDeleteConfirmOk");
    if (!(closeBtn instanceof HTMLButtonElement) || !(cancelBtn instanceof HTMLButtonElement) || !(okBtn instanceof HTMLButtonElement)) {
      return fallbackConfirm();
    }

    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        closeBtn.removeEventListener("click", onCancel);
        cancelBtn.removeEventListener("click", onCancel);
        okBtn.removeEventListener("click", onOk);
        modal.removeEventListener("click", onBackdropClick);
        if (typeof closeDialog === "function") {
          closeDialog(modal);
        } else {
          modal.classList.remove("show");
          modal.setAttribute("aria-hidden", "true");
        }
        resolve(!!value);
      };
      const onCancel = () => done(false);
      const onOk = () => done(true);
      const onBackdropClick = (event) => {
        if (event.target === modal) onCancel();
      };

      closeBtn.addEventListener("click", onCancel);
      cancelBtn.addEventListener("click", onCancel);
      okBtn.addEventListener("click", onOk);
      modal.addEventListener("click", onBackdropClick);
      if (typeof openDialog === "function") {
        openDialog(modal, { focusSelector: "#meetingStaffDeleteConfirmCancel" });
      } else {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
      }
    });
  };

  const askRejectionReason = async (initialValue = "") => {
    const fallbackPrompt = () => {
      if (typeof window.prompt !== "function") return null;
      const input = window.prompt("กรุณาระบุเหตุผลที่ไม่อนุมัติ", initialValue || "");
      const reason = (input || "").toString().trim();
      return reason || null;
    };
    if (
      !rejectReasonModalEl ||
      !rejectReasonInputEl ||
      !rejectReasonErrorEl ||
      !rejectReasonSubmitEl ||
      !rejectReasonCancelEl ||
      !rejectReasonCloseEl ||
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
        rejectReasonSubmitEl.removeEventListener("click", onSubmit);
        rejectReasonCancelEl.removeEventListener("click", onCancel);
        rejectReasonCloseEl.removeEventListener("click", onCancel);
        rejectReasonModalEl.removeEventListener("click", onBackdropClick);
        rejectReasonInputEl.removeEventListener("keydown", onKeydown);
        resolve(value);
      };
      const onSubmit = () => {
        const reason = (rejectReasonInputEl.value || "").toString().trim();
        if (!reason) {
          rejectReasonErrorEl.textContent = "กรุณาระบุเหตุผลที่ไม่อนุมัติ";
          rejectReasonInputEl.focus();
          return;
        }
        rejectReasonErrorEl.textContent = "";
        closeDialog(rejectReasonModalEl);
        done(reason);
      };
      const onCancel = () => {
        rejectReasonErrorEl.textContent = "";
        closeDialog(rejectReasonModalEl);
        done(null);
      };
      const onBackdropClick = (event) => {
        if (event.target === rejectReasonModalEl) {
          onCancel();
        }
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      };

      rejectReasonInputEl.value = (initialValue || "").toString();
      rejectReasonErrorEl.textContent = "";
      rejectReasonSubmitEl.addEventListener("click", onSubmit);
      rejectReasonCancelEl.addEventListener("click", onCancel);
      rejectReasonCloseEl.addEventListener("click", onCancel);
      rejectReasonModalEl.addEventListener("click", onBackdropClick);
      rejectReasonInputEl.addEventListener("keydown", onKeydown);
      openDialog(rejectReasonModalEl, { focusSelector: "#meetingRejectReasonInput" });
      window.setTimeout(() => {
        rejectReasonInputEl.focus();
        rejectReasonInputEl.select();
      }, 0);
    });
  };

  const readCurrentUserEmail = () =>
    (window.sgcuAuth?.auth?.currentUser?.email || "").toString().trim().toLowerCase();


  const retryStaffSubscriptions = () => {
    resolveFirestoreBridge();
    if (!hasFirestore) return;
    if (staffAutoRetryTimer) {
      window.clearTimeout(staffAutoRetryTimer);
      staffAutoRetryTimer = null;
    }
    if (typeof unsubscribe === "function") unsubscribe();
    if (typeof unsubscribeHistory === "function") unsubscribeHistory();
    if (typeof unsubscribeRooms === "function") unsubscribeRooms();
    if (typeof unsubscribeHolidays === "function") unsubscribeHolidays();
    unsubscribe = null;
    unsubscribeHistory = null;
    unsubscribeRooms = null;
    unsubscribeHolidays = null;
    subscribeRooms();
    subscribeHolidays();
    subscribeBookings();
    if (historyHasLoaded) subscribeHistoryBookings();
  };

  const scheduleStaffAutoRetry = () => {
    resolveFirestoreBridge();
    if (!hasFirestore) return;
    if (staffAutoRetryTimer) return;
    const attempt = Math.min(staffAutoRetryAttempt, 4);
    const delayMs = Math.min(12000, 1000 * (2 ** attempt));
    staffAutoRetryAttempt += 1;
    staffAutoRetryTimer = window.setTimeout(() => {
      staffAutoRetryTimer = null;
      retryStaffSubscriptions();
    }, delayMs);
  };

  const clearStaffAutoRetry = () => {
    if (staffAutoRetryTimer) {
      window.clearTimeout(staffAutoRetryTimer);
      staffAutoRetryTimer = null;
    }
    staffAutoRetryAttempt = 0;
  };

  const renderRoomManageList = () => {
    if (!roomManageList) return;
    if (roomManageCountEl) {
      roomManageCountEl.textContent = `พบ ${rooms.length} ห้อง`;
    }
    if (!rooms.length) {
      roomManageList.innerHTML = '<div class="meeting-room-manage-empty">ยังไม่มีห้องประชุม</div>';
      return;
    }
    roomManageList.innerHTML = rooms
      .map((room) => {
        return `
          <button class="meeting-room-manage-item meeting-room-manage-item-button" type="button" data-action="open-room-manage" data-room-id="${room.id}" aria-label="แก้ไขห้อง ${room.name}">
            <div>
              <div class="meeting-room-manage-name">${room.name}</div>
              <div class="meeting-room-manage-access-pill ${roomBookingAccessClass(room.bookingAccess)}">
                <span class="meeting-room-manage-access-bar" aria-hidden="true"></span>
                <span>${roomBookingAccessLabel(room.bookingAccess)}</span>
              </div>
            </div>
          </button>
        `;
      })
      .join("");
  };

  const seedDefaultRoomsIfEmpty = async () => {
    if (!hasFirestore || isSeedingDefaultRooms) return;
    isSeedingDefaultRooms = true;
    try {
      for (const room of DEFAULT_ROOMS) {
        await firestore.addDoc(firestore.collection(firestore.db, ROOM_COLLECTION_NAME), {
          name: room.name,
          bookingAccess: normalizeRoomBookingAccess(room.bookingAccess),
          createdAt: firestore.serverTimestamp(),
          updatedAt: firestore.serverTimestamp()
        });
      }
    } catch (err) {
      // keep fallback rooms if seed fails
    } finally {
      isSeedingDefaultRooms = false;
    }
  };

  const subscribeRooms = () => {
    if (!hasFirestore) {
      renderRoomManageList();
      return;
    }
    try {
      const colRef = firestore.collection(firestore.db, ROOM_COLLECTION_NAME);
      unsubscribeRooms = firestore.onSnapshot(
        colRef,
        (snapshot) => {
          const loaded = snapshot.docs
            .map((docItem) => {
              const data = docItem.data() || {};
              const name = (data.name || "").toString().trim();
              if (!name) return null;
              return {
                id: docItem.id,
                name,
                bookingAccess: normalizeRoomBookingAccess(data.bookingAccess),
                isDefault: false
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name, "th"));
          if (!loaded.length) {
            rooms = [...DEFAULT_ROOMS];
            roomsLoadFailed = false;
            renderRoomManageList();
            void seedDefaultRoomsIfEmpty();
            return;
          }
          rooms = loaded;
          roomsLoadFailed = false;
          clearStaffAutoRetry();
          renderRoomManageList();
          render();
        },
        (err) => {
          const code = (err?.code || "").toString().trim();
          if (code === "permission-denied" && !readCurrentUserEmail()) {
            if (queueBody) {
              queueBody.innerHTML = `
                <tr>
                  <td colspan="7">กำลังตรวจสอบสิทธิ์การเข้าถึงข้อมูล...</td>
                </tr>
              `;
            }
            scheduleStaffAutoRetry();
            return;
          }
          rooms = [...DEFAULT_ROOMS];
          roomsLoadFailed = true;
          renderRoomManageList();
          render();
          scheduleStaffAutoRetry();
        }
      );
    } catch (err) {
      rooms = [...DEFAULT_ROOMS];
      roomsLoadFailed = true;
      renderRoomManageList();
      render();
      scheduleStaffAutoRetry();
    }
  };

  const subscribeHolidays = () => {
    if (!hasFirestore) {
      customHolidays = [];
      refreshHolidayLookup();
      renderHolidayManageList();
      renderStaffCalendar(getCalendarRows(bookings));
      return;
    }
    try {
      const colRef = firestore.collection(firestore.db, HOLIDAY_COLLECTION_NAME);
      const q = firestore.query(colRef, firestore.orderBy("date", "asc"));
      unsubscribeHolidays = firestore.onSnapshot(
        q,
        (snapshot) => {
          customHolidays = snapshot.docs
            .map((docItem) => {
              const data = docItem.data() || {};
              const date = (data.date || "").toString().trim();
              if (!date) return null;
              return {
                id: docItem.id,
                date,
                name: (data.name || "วันหยุด").toString().trim() || "วันหยุด"
              };
            })
            .filter(Boolean);
          refreshHolidayLookup();
          renderHolidayManageList();
          renderStaffCalendar(getCalendarRows(bookings));
        },
        () => {
          customHolidays = [];
          refreshHolidayLookup();
          renderHolidayManageList();
          renderStaffCalendar(getCalendarRows(bookings));
        }
      );
    } catch (err) {
      customHolidays = [];
      refreshHolidayLookup();
      renderHolidayManageList();
      renderStaffCalendar(getCalendarRows(bookings));
    }
  };

  const addRoom = async (nameValue, accessValue = "public") => {
    const name = (nameValue || "").toString().trim().replace(/\s+/g, " ");
    const bookingAccess = normalizeRoomBookingAccess(accessValue);
    if (!name) {
      setRoomManageMessage("กรุณากรอกชื่อห้องประชุม", "#b91c1c");
      return false;
    }
    const duplicate = rooms.some((room) => room.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setRoomManageMessage("มีห้องประชุมชื่อนี้อยู่แล้ว", "#b91c1c");
      return false;
    }
    if (!hasFirestore) {
      setRoomManageMessage("ระบบยังไม่เชื่อมต่อ Firestore", "#b91c1c");
      return false;
    }
    try {
      const createdDoc = await firestore.addDoc(firestore.collection(firestore.db, ROOM_COLLECTION_NAME), {
        name,
        bookingAccess,
        createdAt: firestore.serverTimestamp(),
        updatedAt: firestore.serverTimestamp()
      });
      await writeAuditLog(
        "meeting_room.created",
        "meetingRoom",
        createdDoc?.id || "",
        null,
        { id: createdDoc?.id || "", name, bookingAccess },
        { context: "staff_room_manage" }
      );
      setRoomManageMessage("เพิ่มห้องประชุมเรียบร้อยแล้ว", "#047857");
      if (roomManageInput) roomManageInput.value = "";
      return true;
    } catch (err) {
      setRoomManageMessage("ไม่สามารถเพิ่มห้องประชุมได้ในขณะนี้", "#b91c1c");
      return false;
    }
  };

  const addHoliday = async (dateValue, nameValue) => {
    const date = (dateValue || "").toString().trim();
    const name = (nameValue || "").toString().trim();
    if (!date) {
      setHolidayManageMessage("กรุณาเลือกวันที่วันหยุด", "#b91c1c");
      return false;
    }
    if (!name) {
      setHolidayManageMessage("กรุณากรอกชื่อวันหยุด", "#b91c1c");
      return false;
    }
    if (!hasFirestore) {
      setHolidayManageMessage("ระบบยังไม่เชื่อมต่อ Firestore", "#b91c1c");
      return false;
    }
    const duplicate = customHolidays.some((item) => item.date === date);
    if (duplicate) {
      setHolidayManageMessage("มีวันหยุดวันที่นี้อยู่แล้ว", "#b91c1c");
      return false;
    }
    try {
      const createdDoc = await firestore.addDoc(firestore.collection(firestore.db, HOLIDAY_COLLECTION_NAME), {
        date,
        name,
        createdAt: firestore.serverTimestamp(),
        updatedAt: firestore.serverTimestamp()
      });
      await writeAuditLog(
        "meeting_holiday.created",
        "meetingRoomHoliday",
        createdDoc?.id || "",
        null,
        { id: createdDoc?.id || "", date, name },
        { context: "staff_holiday_manage" }
      );
      setHolidayManageMessage("เพิ่มวันหยุดเรียบร้อยแล้ว", "#047857");
      if (holidayManageDateInput) holidayManageDateInput.value = "";
      if (holidayManageNameInput) holidayManageNameInput.value = "";
      return true;
    } catch (err) {
      setHolidayManageMessage("ไม่สามารถเพิ่มวันหยุดได้ในขณะนี้", "#b91c1c");
      return false;
    }
  };

  const removeHoliday = async (holidayId) => {
    if (!holidayId || !hasFirestore) return;
    const holiday = customHolidays.find((item) => item.id === holidayId) || null;
    try {
      await firestore.deleteDoc(firestore.doc(firestore.db, HOLIDAY_COLLECTION_NAME, holidayId));
      await writeAuditLog(
        "meeting_holiday.deleted",
        "meetingRoomHoliday",
        holidayId,
        holiday ? { id: holiday.id, date: holiday.date || "", name: holiday.name || "" } : null,
        null,
        { context: "staff_holiday_manage" }
      );
      setHolidayManageMessage("ลบวันหยุดเรียบร้อยแล้ว", "#047857");
    } catch (err) {
      setHolidayManageMessage("ไม่สามารถลบวันหยุดได้ในขณะนี้", "#b91c1c");
    }
  };

  const removeRoom = async (roomId) => {
    if (!roomId || !hasFirestore) return false;
    const room = rooms.find((item) => item.id === roomId);
    if (!room || room.isDefault) return false;
    if (rooms.length <= 1) {
      setRoomManageMessage("ต้องมีห้องประชุมอย่างน้อย 1 ห้อง", "#b91c1c");
      return false;
    }
    try {
      await firestore.deleteDoc(firestore.doc(firestore.db, ROOM_COLLECTION_NAME, roomId));
      await writeAuditLog(
        "meeting_room.deleted",
        "meetingRoom",
        roomId,
        { id: room.id, name: room.name, bookingAccess: room.bookingAccess || "public" },
        null,
        { context: "staff_room_manage" }
      );
      setRoomManageMessage("ลบห้องประชุมเรียบร้อยแล้ว", "#047857");
      return true;
    } catch (err) {
      setRoomManageMessage("ไม่สามารถลบห้องประชุมได้ในขณะนี้", "#b91c1c");
      return false;
    }
  };

  const renameRoom = async (roomId, nextNameValue) => {
    if (!roomId || !hasFirestore) return false;
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return false;
    const nextName = (nextNameValue || "").toString().trim().replace(/\s+/g, " ");
    if (!nextName) {
      setRoomManageMessage("กรุณากรอกชื่อห้องประชุมใหม่", "#b91c1c");
      return false;
    }
    if (nextName.toLowerCase() === room.name.toLowerCase()) {
      setRoomManageMessage("ชื่อห้องประชุมยังเหมือนเดิม", "#6b7280");
      return true;
    }
    const duplicate = rooms.some(
      (item) => item.id !== roomId && item.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      setRoomManageMessage("มีห้องประชุมชื่อนี้อยู่แล้ว", "#b91c1c");
      return false;
    }
    try {
      await firestore.updateDoc(
        firestore.doc(firestore.db, ROOM_COLLECTION_NAME, roomId),
        {
          name: nextName,
          updatedAt: firestore.serverTimestamp()
        }
      );
      await writeAuditLog(
        "meeting_room.renamed",
        "meetingRoom",
        roomId,
        { id: room.id, name: room.name, bookingAccess: room.bookingAccess || "public" },
        { id: room.id, name: nextName, bookingAccess: room.bookingAccess || "public" },
        { context: "staff_room_manage" }
      );
      renderRoomManageList();
      setRoomManageMessage("แก้ไขชื่อห้องประชุมเรียบร้อยแล้ว", "#047857");
      return true;
    } catch (err) {
      setRoomManageMessage("ไม่สามารถแก้ไขชื่อห้องประชุมได้ในขณะนี้", "#b91c1c");
      return false;
    }
  };

  const updateRoomBookingAccess = async (roomId, accessValue) => {
    if (!roomId || !hasFirestore) return false;
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return false;
    const nextAccess = normalizeRoomBookingAccess(accessValue);
    if (room.bookingAccess === nextAccess) return true;
    try {
      await firestore.updateDoc(
        firestore.doc(firestore.db, ROOM_COLLECTION_NAME, roomId),
        {
          bookingAccess: nextAccess,
          updatedAt: firestore.serverTimestamp()
        }
      );
      await writeAuditLog(
        "meeting_room.booking_access_updated",
        "meetingRoom",
        roomId,
        { id: room.id, name: room.name, bookingAccess: room.bookingAccess || "public" },
        { id: room.id, name: room.name, bookingAccess: nextAccess },
        { context: "staff_room_manage" }
      );
      setRoomManageMessage(
        nextAccess === "staff_only"
          ? `อัปเดตแล้ว: ${room.name} เป็น "สตาฟจองเท่านั้น"`
          : `อัปเดตแล้ว: ${room.name} เป็น "คนทั่วไปจอง"`,
        "#047857"
      );
      return true;
    } catch (err) {
      setRoomManageMessage("ไม่สามารถอัปเดตสิทธิ์การจองได้ในขณะนี้", "#b91c1c");
      return false;
    }
  };

  const getRowActions = (booking) => {
    if (booking.status === "approved") {
      return `
        <button
          class="btn-ghost staff-room-cancel"
          type="button"
          data-action="cancel"
          data-id="${booking.id}"
        >
          ยกเลิกการอนุมัติ
        </button>
        <button
          class="btn-ghost staff-room-delete"
          type="button"
          data-action="delete"
          data-id="${booking.id}"
        >
          ลบคำขอ
        </button>
      `;
    }

    if (booking.status === "rejected") {
      return `
        <button
          class="btn-ghost staff-room-delete"
          type="button"
          data-action="delete"
          data-id="${booking.id}"
        >
          ลบคำขอ
        </button>
      `;
    }

    return `
      <button
        class="btn-primary staff-room-approve"
        type="button"
        data-action="approve"
        data-id="${booking.id}"
      >
        อนุมัติ
      </button>
      <button
        class="btn-ghost staff-room-reject"
        type="button"
        data-action="reject"
        data-id="${booking.id}"
      >
        ไม่อนุมัติ
      </button>
      <button
        class="btn-ghost staff-room-delete"
        type="button"
        data-action="delete"
        data-id="${booking.id}"
      >
        ลบคำขอ
      </button>
    `;
  };

  const getStatusOptionLabel = (value, currentStatus = "") => {
    if (currentStatus === "cancel_requested" && value === "rejected") return "อนุมัติยกเลิก";
    if (currentStatus === "cancel_requested" && value === "approved") return "ไม่อนุมัติยกเลิก";
    if (value === "approved") return "อนุมัติแล้ว";
    if (value === "rejected") return "ไม่อนุมัติ";
    if (value === "cancel_requested") return "ขอยกเลิก";
    if (value === "reschedule_requested") return "ขอเปลี่ยนห้อง/เวลา";
    if (value === "no_show") return "ไม่มาใช้ห้อง (No-show)";
    if (value === "pending") return "รออนุมัติ";
    return value;
  };

  const statusSelectClass = (value) => {
    if (value === "approved") return "is-approved";
    if (value === "rejected") return "is-rejected";
    if (value === "cancel_requested" || value === "reschedule_requested" || value === "no_show") return "is-cancel-requested";
    if (value === "delete") return "is-delete";
    return "is-pending";
  };

  const getStatusDropdown = (booking, suffix = "") => `
    <div class="meeting-status-select-wrap">
      <select
        class="staff-status-select ${statusSelectClass(booking.status)}"
        data-role="status-select"
        data-id="${booking.id}"
        aria-label="จัดการสถานะคำขอ${suffix ? ` (${suffix})` : ""}"
      >
        <option value="pending" ${booking.status === "pending" ? "selected" : ""}>
          ${getStatusOptionLabel("pending", booking.status)}
        </option>
        <option value="approved" ${booking.status === "approved" ? "selected" : ""}>
          ${getStatusOptionLabel("approved", booking.status)}
        </option>
        <option value="rejected" ${booking.status === "rejected" ? "selected" : ""}>
          ${getStatusOptionLabel("rejected", booking.status)}
        </option>
        <option value="cancel_requested" ${booking.status === "cancel_requested" ? "selected" : ""}>
          ${getStatusOptionLabel("cancel_requested", booking.status)}
        </option>
        <option value="no_show" ${booking.status === "no_show" ? "selected" : ""}>
          ${getStatusOptionLabel("no_show", booking.status)}
        </option>
        ${booking.status === "reschedule_requested"
          ? `<option value="reschedule_requested" selected>${getStatusOptionLabel("reschedule_requested", booking.status)}</option>`
          : ""
        }
        <option value="delete">ลบคำขอ</option>
      </select>
    </div>
  `;

  const getMobileStatusActions = (booking) => {
    const id = escapeText(booking.id || "");
    if (!id) return "";
    if (booking.status === "pending") {
      return `
        <div class="meeting-mobile-status-actions" aria-label="คำสั่งหลัก">
          <button class="btn-primary meeting-mobile-status-btn" type="button" data-action="approve" data-id="${id}">อนุมัติ</button>
          <button class="btn-ghost meeting-mobile-status-btn" type="button" data-action="reject" data-id="${id}">ปฏิเสธ</button>
        </div>
      `;
    }
    if (booking.status === "cancel_requested") {
      return `
        <div class="meeting-mobile-status-actions" aria-label="คำสั่งคำขอยกเลิก">
          <button class="btn-primary meeting-mobile-status-btn" type="button" data-action="approve-cancel" data-id="${id}">อนุมัติยกเลิก</button>
          <button class="btn-ghost meeting-mobile-status-btn" type="button" data-action="reject-cancel" data-id="${id}">ไม่อนุมัติ</button>
        </div>
      `;
    }
    if (booking.status === "reschedule_requested") {
      return `
        <div class="meeting-mobile-status-actions" aria-label="คำสั่งคำขอเปลี่ยนห้อง/เวลา">
          <button class="btn-primary meeting-mobile-status-btn" type="button" data-action="approve" data-id="${id}">อนุมัติเปลี่ยนห้อง/เวลา</button>
          <button class="btn-ghost meeting-mobile-status-btn" type="button" data-action="reject" data-id="${id}">ไม่อนุมัติ</button>
        </div>
      `;
    }
    if (booking.status === "approved") {
      return `
        <div class="meeting-mobile-status-actions" aria-label="คำสั่งรายการที่อนุมัติแล้ว">
          <button class="btn-ghost meeting-mobile-status-btn" type="button" data-action="cancel" data-id="${id}">คืนเป็นรออนุมัติ</button>
        </div>
      `;
    }
    return "";
  };

  const updateTabUI = (nextTab) => {
    activeTab = nextTab === "history" ? "history" : "requests";
    tabButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.meetingStaffTab === activeTab);
    });
    if (panelTitleEl) {
      panelTitleEl.textContent = activeTab === "history" ? "ประวัติการขอ" : "รายการคำขอ";
    }
    if (panelCaptionEl) {
      panelCaptionEl.textContent = activeTab === "history"
        ? "เลือกช่วงวันที่แล้วกดแสดงผล ระบบจึงจะโหลดประวัติย้อนหลัง"
        : "แสดงรายการที่ยังไม่อนุมัติและยังไม่เลยเวลา ใช้ตัวกรองเพื่อหาเฉพาะวัน ห้อง หรือผู้ขอ";
    }
    if (historySearchWrapEl) {
      historySearchWrapEl.style.display = "grid";
    }
    [historyStartDateInputEl, historyEndDateInputEl, historyLoadBtnEl, historyResetBtnEl].forEach((el) => {
      const group = el?.closest?.(".filter-group, .meeting-history-filter-actions");
      if (group) group.style.display = activeTab === "history" ? "" : "none";
    });
  };

  const sortBookingRows = (source = []) =>
    [...source].sort((a, b) => {
      if (a.date === b.date) {
        return String(a.startTime || "").localeCompare(String(b.startTime || ""));
      }
      return String(a.date || "").localeCompare(String(b.date || ""));
    });

  const getVisibleRowsForActiveTab = (source) => {
    const ordered = sortBookingRows(source);
    const historyRows = ordered.filter(
      (booking) => booking.status === "approved" || booking.status === "no_show" || isPastBooking(booking)
    );
    const requestRows = ordered.filter(
      (booking) => booking.status !== "approved" && booking.status !== "no_show" && !isPastBooking(booking)
    );
    return activeTab === "history" ? historyRows : requestRows;
  };

  const getCalendarRows = (source) => sortBookingRows(source);

  const buildSearchText = (booking) =>
    [
      normalizeRoomDisplay(booking.roomId, booking.roomName),
      booking.date,
      formatDate(booking.date),
      booking.startTime,
      booking.endTime,
      formatRequesterDisplay(booking),
      booking.purpose,
      statusText(booking.status)
    ]
      .map((value) => (value || "").toString().trim().toLowerCase())
      .join(" ");

  const hasActiveBookingFilters = () =>
    !!historySearchQuery || historyRoomFilter !== "all";

  const bookingMatchesFilters = (booking) => {
    if (historyRoomFilter !== "all") {
      const roomName = normalizeRoomDisplay(booking.roomId, booking.roomName).trim();
      if (roomName !== historyRoomFilter) return false;
    }
    if (historySearchQuery && !buildSearchText(booking).includes(historySearchQuery)) return false;
    return true;
  };

  const getDisplayRowsForActiveTab = (source = []) => {
    const rowsForTab = getVisibleRowsForActiveTab(source);
    return hasActiveBookingFilters() ? rowsForTab.filter(bookingMatchesFilters) : rowsForTab;
  };

  const exportMeetingRoomCsv = () => {
    const exportSource = activeTab === "history" ? historyBookings : requestBookings;
    const rows = getDisplayRowsForActiveTab(sortBookingRows(exportSource)).map((booking) => ({
      "ห้อง": normalizeRoomDisplay(booking.roomId, booking.roomName),
      "วันที่": booking.date || "",
      "เวลาเริ่ม": booking.startTime || "",
      "เวลาสิ้นสุด": booking.endTime || "",
      "ผู้ขอ": formatRequesterDisplay(booking),
      "อีเมล": booking.requesterEmail || booking.email || "",
      "เบอร์โทร": booking.contactPhone || booking.phone || "",
      "ช่องทางติดต่อ": booking.contactInfo || booking.lineId || "",
      "วัตถุประสงค์": booking.purpose || "",
      "รูปแบบโครงการ": booking.projectMode || "",
      "รหัสโครงการ": booking.projectCode || "",
      "สถานะ": statusText(booking.status),
      "เหตุผลไม่อนุมัติ": booking.rejectionReason || "",
      "ห้องที่ขอเปลี่ยน": booking.rescheduleRequestedRoomId
        ? normalizeRoomDisplay(booking.rescheduleRequestedRoomId, booking.rescheduleRequestedRoomName)
        : "",
      "วันที่ขอเปลี่ยน": booking.rescheduleRequestedDate || "",
      "เวลาเริ่มที่ขอเปลี่ยน": booking.rescheduleRequestedStartTime || "",
      "เวลาสิ้นสุดที่ขอเปลี่ยน": booking.rescheduleRequestedEndTime || "",
      "เหตุผลขอเปลี่ยน": booking.rescheduleRequestReason || ""
    }));
    window.sgcuCsvExport?.download({
      fileName: activeTab === "history" ? "meeting-room-history" : "meeting-room-requests",
      headers: [
        "ห้อง",
        "วันที่",
        "เวลาเริ่ม",
        "เวลาสิ้นสุด",
        "ผู้ขอ",
        "อีเมล",
        "เบอร์โทร",
        "ช่องทางติดต่อ",
        "วัตถุประสงค์",
        "รูปแบบโครงการ",
        "รหัสโครงการ",
        "สถานะ",
        "เหตุผลไม่อนุมัติ",
        "ห้องที่ขอเปลี่ยน",
        "วันที่ขอเปลี่ยน",
        "เวลาเริ่มที่ขอเปลี่ยน",
        "เวลาสิ้นสุดที่ขอเปลี่ยน",
        "เหตุผลขอเปลี่ยน"
      ],
      rows
    });
  };

  const syncHistoryRoomFilterOptions = () => {
    if (!historyRoomSelectEl) return;
    const currentValue = (historyRoomSelectEl.value || historyRoomFilter || "all").toString();
    const roomNames = Array.from(
      new Set(
        [
          ...rooms.map((room) => (room?.name || "").toString().trim()),
          ...bookings.map((booking) => normalizeRoomDisplay(booking.roomId, booking.roomName).trim())
        ].filter((name) => name && name !== "-")
      )
    ).sort((a, b) => a.localeCompare(b, "th"));

    historyRoomSelectEl.innerHTML = [
      '<option value="all">ทุกห้องประชุม</option>',
      ...roomNames.map((name) => `<option value="${escapeText(name)}">${escapeText(name)}</option>`)
    ].join("");

    const nextValue = roomNames.includes(currentValue) ? currentValue : "all";
    historyRoomSelectEl.value = nextValue;
    historyRoomFilter = nextValue;
  };

  const meetingPagerEl = (() => {
    if (!allTableBody) return null;
    const wrapper = allTableBody.closest(".table-wrapper");
    if (!wrapper) return null;
    const existing = document.getElementById("meetingRoomStaffPager");
    if (existing) return existing;
    const pager = document.createElement("div");
    pager.id = "meetingRoomStaffPager";
    pager.className = "list-pagination-controls";
    pager.setAttribute("aria-live", "polite");
    wrapper.insertAdjacentElement("afterend", pager);
    return pager;
  })();

  const getPagedRows = (rows, page) => {
    const totalPages = Math.max(1, Math.ceil(rows.length / STAFF_MEETING_PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const startIndex = (currentPage - 1) * STAFF_MEETING_PAGE_SIZE;
    return {
      rows: rows.slice(startIndex, startIndex + STAFF_MEETING_PAGE_SIZE),
      currentPage,
      totalPages,
      startIndex,
      endIndex: Math.min(rows.length, startIndex + STAFF_MEETING_PAGE_SIZE),
      total: rows.length
    };
  };

  const renderMeetingPager = (meta) => {
    if (!meetingPagerEl) return;
    if (!meta || meta.total <= STAFF_MEETING_PAGE_SIZE) {
      meetingPagerEl.innerHTML = "";
      meetingPagerEl.hidden = true;
      return;
    }
    meetingPagerEl.hidden = false;
    meetingPagerEl.innerHTML = `
      <span class="list-pagination-summary">
        แสดง ${escapeText(meta.startIndex + 1)}-${escapeText(meta.endIndex)} จาก ${escapeText(meta.total)} รายการ
      </span>
      <button
        class="btn-ghost list-pagination-btn"
        type="button"
        data-meeting-page-action="prev"
        ${meta.currentPage <= 1 ? "disabled" : ""}
      >ก่อนหน้า</button>
      <span class="list-pagination-page">หน้า ${escapeText(meta.currentPage)} / ${escapeText(meta.totalPages)}</span>
      <button
        class="btn-ghost list-pagination-btn"
        type="button"
        data-meeting-page-action="next"
        ${meta.currentPage >= meta.totalPages ? "disabled" : ""}
      >ถัดไป</button>
    `;
  };

  const renderStaffCalendar = (sourceRows = []) => {
    if (!staffCalendarPanel) return;

    const monthState = getCalendarMonthState(calendarCursor);
    const daysInMonth = new Date(monthState.year, monthState.month + 1, 0).getDate();
    const monthBookings = sourceRows
      .filter((item) => {
        if (!item.date) return false;
        const date = new Date(`${item.date}T00:00:00`);
        if (Number.isNaN(date.getTime())) return false;
        return date.getFullYear() === monthState.year && date.getMonth() === monthState.month;
      })
      .reduce((acc, item) => {
        if (!acc[item.date]) acc[item.date] = [];
        acc[item.date].push(item);
        return acc;
      }, {});

    Object.values(monthBookings).forEach((items) => {
      items.sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")));
    });

    if (staffCalendarTitle) {
      staffCalendarTitle.textContent = `ปฏิทินคำขอจองห้องประชุม (${MONTH_NAMES_TH[monthState.month]} ${monthState.year + 543})`;
    }

    const todayKey = toDateKey(new Date());
    const maxEvents = getMeetingCalendarMaxEvents();
    const cells = [];

    for (let i = 0; i < monthState.firstDay.getDay(); i += 1) {
      cells.push('<div class="calendar-day calendar-day-empty"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthState.year, monthState.month, day);
      const dateKey = toDateKey(date);
      const items = monthBookings[dateKey] || [];
      const visibleItems = items.slice(0, maxEvents);
      const remainingCount = items.length - maxEvents;
      const isToday = dateKey === todayKey;
      const holidayName = getHolidayName(date, dateKey);
      const isHoliday = !!holidayName;
      const todayBadge = isToday
        ? `<span class="calendar-today-pill">วันนี้</span>`
        : "";
      const holidayBadge = isHoliday
        ? `<span class="calendar-holiday-pill" title="${escapeText(holidayName)}">วันหยุด</span>`
        : "";

      const eventRows = visibleItems
        .map((item) => {
          const roomName = normalizeRoomDisplay(item.roomId, item.roomName);
          return `<div class="calendar-event ${calendarStatusClass(item.status)}" data-booking-id="${escapeText(item.id || "")}" title="${escapeText(
            `${roomName} · ${item.startTime || "-"}-${item.endTime || "-"} · ${formatRequesterDisplay(item)}`
          )}">
            ${escapeText(`${item.startTime || "-"}-${item.endTime || "-"} ${roomName}`)}
          </div>`;
        })
        .join("");

      const moreText = remainingCount > 0
        ? `<div class="calendar-event calendar-more">และอีก ${remainingCount} คำขอ</div>`
        : "";
      const className = ["calendar-day"];
      if (isToday) className.push("calendar-day-today");
      if (items.length) className.push("calendar-day-has-events");
      if (isHoliday) className.push("calendar-day-holiday");

      cells.push(`
        <div class="${className.join(" ")}" data-date="${dateKey}">
          <div class="calendar-day-header">${day}${todayBadge}${holidayBadge}</div>
          ${eventRows}
          ${moreText}
        </div>
      `);
    }

    staffCalendarPanel.innerHTML = cells.join("");
  };

  const render = () => {
    hasRenderedOnce = true;
    if (subscribeGuardTimer) {
      window.clearTimeout(subscribeGuardTimer);
      subscribeGuardTimer = null;
    }
    const sorted = [...bookings].sort((a, b) => {
      const aDate = `${a.date}T${a.startTime || "00:00"}`;
      const bDate = `${b.date}T${b.startTime || "00:00"}`;
      return aDate.localeCompare(bDate);
    });
    const tableSource = activeTab === "history" ? historyBookings : requestBookings;
    const tableSorted = [...tableSource].sort((a, b) => {
      const aDate = `${a.date}T${a.startTime || "00:00"}`;
      const bDate = `${b.date}T${b.startTime || "00:00"}`;
      return aDate.localeCompare(bDate);
    });

    const pending = sorted.filter(
      (booking) =>
        !isPastBooking(booking) &&
        (booking.status === "pending" || booking.status === "cancel_requested" || booking.status === "reschedule_requested")
    );
    const pendingCount = pending.length;
    const approvedCount = sorted.filter((booking) => booking.status === "approved").length;
    const rejectedCount = sorted.filter((booking) => booking.status === "rejected").length;

    if (queueBody) {
      if (!pending.length) {
        queueBody.innerHTML = `
          <tr>
            <td colspan="7">ยังไม่มีคำขอรออนุมัติ</td>
          </tr>
        `;
      } else {
        queueBody.innerHTML = pending
          .map((booking) => {
            const roomName = normalizeRoomDisplay(booking.roomId, booking.roomName);
            const dateText = formatDate(booking.date);
            const timeText = `${booking.startTime || "-"} - ${booking.endTime || "-"}`;
            const requestedRoom = booking.rescheduleRequestedRoomId
              ? `${normalizeRoomDisplay(booking.rescheduleRequestedRoomId, booking.rescheduleRequestedRoomName)} `
              : "";
            const rescheduleLine = booking.status === "reschedule_requested"
              ? `<div class="meeting-row-meta">ขอเปลี่ยนเป็น: ${escapeText(requestedRoom)}${escapeText(formatDate(booking.rescheduleRequestedDate))} ${escapeText(booking.rescheduleRequestedStartTime || "-")} - ${escapeText(booking.rescheduleRequestedEndTime || "-")}</div><div class="meeting-row-meta">เหตุผล: ${escapeText(booking.rescheduleRequestReason || "-")}</div>`
              : "";
            const rejectedLine = booking.status === "rejected" && booking.rejectionReason
              ? `<div class="meeting-row-meta">เหตุผลไม่อนุมัติ: ${escapeText(booking.rejectionReason)}</div>`
              : "";
            return `
              <tr data-booking-id="${escapeText(booking.id)}">
                <td data-label="ห้อง">${escapeText(roomName)}</td>
                <td data-label="วันที่">${escapeText(dateText)}</td>
                <td data-label="เวลา">${escapeText(timeText)}</td>
                <td data-label="ผู้ขอ">${escapeText(formatRequesterDisplay(booking))}</td>
                <td data-label="วัตถุประสงค์">
                  <div class="meeting-staff-purpose-cell">${escapeText(booking.purpose || "-")}${rescheduleLine}${rejectedLine}</div>
                </td>
                <td data-label="สถานะ">${statusLabel(booking.status)}</td>
                <td data-label="จัดการ">
                  ${getStatusDropdown(booking, "คิวรออนุมัติ")}
                </td>
              </tr>
            `;
          })
          .join("");
      }
    }

    if (approvedCountEl) approvedCountEl.textContent = approvedCount;
    if (pendingCountEl) pendingCountEl.textContent = pendingCount;
    if (rejectedCountEl) rejectedCountEl.textContent = rejectedCount;

    syncHistoryRoomFilterOptions();
    const rowsForTab = getVisibleRowsForActiveTab(tableSorted);
    const hasFilters = hasActiveBookingFilters();
    const shouldShowHistoryPrompt = activeTab === "history" && !historyHasLoaded && !historyLoadErrorText;
    const displayRows = shouldShowHistoryPrompt
      ? []
      : (hasFilters ? rowsForTab.filter(bookingMatchesFilters) : rowsForTab);
    const calendarRows = getCalendarRows(sorted);
    const emptyText = activeTab === "history"
      ? (shouldShowHistoryPrompt
        ? "เลือกช่วงวันที่แล้วกดแสดงผลเพื่อโหลดประวัติการขอ"
        : (historyLoadErrorText || (hasFilters ? "ไม่พบประวัติการขอตามตัวกรองที่เลือก" : "ยังไม่มีประวัติการขอในช่วงวันที่เลือก")))
      : (hasFilters ? "ไม่พบรายการคำขอตามตัวกรองที่เลือก" : "ยังไม่มีรายการคำขอที่ยังไม่เลยเวลา");
    const pageMeta = getPagedRows(displayRows, pageByTab[activeTab]);
    pageByTab[activeTab] = pageMeta.currentPage;

    if (allCountEl) allCountEl.textContent = `พบ ${displayRows.length} รายการ`;
    renderMeetingPager(pageMeta);

    allTableBody.innerHTML = displayRows.length
      ? pageMeta.rows
          .map((booking) => {
            const roomName = normalizeRoomDisplay(booking.roomId, booking.roomName);
            const dateText = formatDate(booking.date);
            const timeText = `${booking.startTime || "-"} - ${booking.endTime || "-"}`;
            const requestedRoom = booking.rescheduleRequestedRoomId
              ? `${normalizeRoomDisplay(booking.rescheduleRequestedRoomId, booking.rescheduleRequestedRoomName)} `
              : "";
            const rescheduleLine = booking.status === "reschedule_requested"
              ? `<div class="meeting-row-meta">ขอเปลี่ยนเป็น: ${escapeText(requestedRoom)}${escapeText(formatDate(booking.rescheduleRequestedDate))} ${escapeText(booking.rescheduleRequestedStartTime || "-")} - ${escapeText(booking.rescheduleRequestedEndTime || "-")}</div><div class="meeting-row-meta">เหตุผล: ${escapeText(booking.rescheduleRequestReason || "-")}</div>`
              : "";
            const rejectedLine = booking.status === "rejected" && booking.rejectionReason
              ? `<div class="meeting-row-meta">เหตุผลไม่อนุมัติ: ${escapeText(booking.rejectionReason)}</div>`
              : "";
            return `
              <tr data-booking-id="${escapeText(booking.id)}">
                <td data-label="ห้อง">${escapeText(roomName)}</td>
                <td data-label="วันที่">${escapeText(dateText)}</td>
                <td data-label="เวลา">${escapeText(timeText)}</td>
                <td data-label="ผู้ขอ">${escapeText(formatRequesterDisplay(booking))}</td>
                <td data-label="วัตถุประสงค์">
                  <div class="meeting-staff-purpose-cell">${escapeText(booking.purpose || "-")}${rescheduleLine}${rejectedLine}</div>
                </td>
                <td data-label="สถานะ">
                  ${getMobileStatusActions(booking)}
                  ${getStatusDropdown(booking, activeTab === "history" ? "ประวัติการขอ" : "รายการคำขอ")}
                </td>
              </tr>
            `;
          })
          .join("")
      : `
          <tr>
            <td colspan="6">${emptyText}</td>
          </tr>
        `;

    if (staffMeetingAllSection) {
      staffMeetingAllSection.style.display = "block";
    }
    renderStaffCalendar(calendarRows);
    if (activeStaffDayModalDate) {
      setStaffBookingDayBody(activeStaffDayModalDate, calendarRows);
    }
  };

  const setStatusById = async (id, status, options = {}) => {
    if (!id) return;
    if (!hasFirestore) {
      setStaffActionMessage("ระบบฐานข้อมูลยังไม่พร้อม กรุณารอสักครู่แล้วลองใหม่", "#b91c1c");
      return;
    }
    const booking = bookings.find((item) => item.id === id);
    if (!booking) {
      setStaffActionMessage("ไม่พบคำขอที่ต้องการอัปเดต", "#b91c1c");
      return;
    }
    setStaffActionMessage("กำลังอัปเดตสถานะคำขอ...", "#6b7280");
    const payload = {
      status,
      updatedAt: firestore.serverTimestamp()
    };
    if (status === "no_show") {
      payload.status = "rejected";
      payload.rejectionReason = buildNoShowReason(booking.rejectionReason || "");
    }
    if (booking.status !== "reschedule_requested" && status === "rejected") {
      let rejectionReason = (options.rejectionReason || "").toString().trim();
      if (!rejectionReason) {
        rejectionReason = (await askRejectionReason(booking.rejectionReason || "")) || "";
      }
      if (!rejectionReason) {
        setStaffActionMessage("กรุณาระบุเหตุผลที่ไม่อนุมัติ", "#b91c1c");
        return;
      }
      payload.rejectionReason = rejectionReason;
    }
    if (status !== "rejected" && status !== "no_show") {
      payload.rejectionReason = "";
    }
    if (booking.status === "cancel_requested" && status === "approved") {
      payload.status = normalizeStatus(booking.cancelBaseStatus || "approved");
      payload.cancelBaseStatus = "";
      payload.cancelRequestReason = "";
      payload.cancelRequestedAt = "";
      payload.cancelledByRequester = false;
    }
    if (booking.status === "cancel_requested" && status === "rejected") {
      payload.cancelBaseStatus = "";
      payload.cancelledByRequester = true;
      payload.cancelledAt = firestore.serverTimestamp();
    }
    if (booking.status !== "reschedule_requested" && payload.status === "approved") {
      const candidate = {
        roomId: booking.roomId,
        roomName: booking.roomName,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime
      };
      if (hasOverlap(candidate, bookings, { ignoredBookingId: id })) {
        const roomName = normalizeRoomDisplay(booking.roomId, booking.roomName);
        setStaffActionMessage(
          `อนุมัติไม่ได้เพราะชนเวลา (${roomName} ${formatDate(booking.date)} ${booking.startTime || "-"}-${booking.endTime || "-"})`,
          "#b91c1c"
        );
        return;
      }
    }
    if (booking.status === "reschedule_requested" && status === "approved") {
      const nextDate = booking.rescheduleRequestedDate || "";
      const nextStartTime = booking.rescheduleRequestedStartTime || "";
      const nextEndTime = booking.rescheduleRequestedEndTime || "";
      const nextRoomId = booking.rescheduleRequestedRoomId || booking.roomId;
      const nextRoomName = booking.rescheduleRequestedRoomName || normalizeRoomDisplay(nextRoomId, booking.roomName);
      if (!nextDate || !nextStartTime || !nextEndTime) {
        setStaffActionMessage("ไม่พบวัน/เวลาใหม่ที่ขอเปลี่ยน โปรดตรวจสอบข้อมูลคำขอ", "#b91c1c");
        return;
      }
      const candidate = {
        roomId: nextRoomId,
        roomName: nextRoomName,
        date: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime
      };
      if (hasOverlap(candidate, bookings, { ignoredBookingId: id })) {
        const roomName = normalizeRoomDisplay(nextRoomId, nextRoomName);
        setStaffActionMessage(`อนุมัติเปลี่ยนห้อง/เวลาไม่ได้เพราะชนเวลา (${roomName} ${formatDate(nextDate)} ${nextStartTime}-${nextEndTime})`, "#b91c1c");
        return;
      }
      payload.status = "approved";
      payload.roomId = nextRoomId;
      payload.roomName = nextRoomName;
      payload.date = nextDate;
      payload.startTime = nextStartTime;
      payload.endTime = nextEndTime;
      payload.startAt = toDateTime(nextDate, nextStartTime).toISOString();
      payload.endAt = toDateTime(nextDate, nextEndTime).toISOString();
      payload.rescheduleBaseStatus = "";
      payload.rescheduleRequestedRoomId = "";
      payload.rescheduleRequestedRoomName = "";
      payload.rescheduleRequestedDate = "";
      payload.rescheduleRequestedStartTime = "";
      payload.rescheduleRequestedEndTime = "";
      payload.rescheduleRequestReason = "";
    }
    if (booking.status === "reschedule_requested" && status === "rejected") {
      payload.status = normalizeStatus(booking.rescheduleBaseStatus || "approved");
      payload.rescheduleBaseStatus = "";
      payload.rescheduleRequestedRoomId = "";
      payload.rescheduleRequestedRoomName = "";
      payload.rescheduleRequestedDate = "";
      payload.rescheduleRequestedStartTime = "";
      payload.rescheduleRequestedEndTime = "";
      payload.rescheduleRequestReason = "";
      payload.rejectionReason = "";
    }
    try {
      await firestore.updateDoc(
        firestore.doc(firestore.db, COLLECTION_NAME, id),
        payload
      );
      await writeAuditLog(
        "booking.status_updated_by_staff",
        "meetingRoomBooking",
        id,
        pickBookingAuditFields(booking),
        pickBookingAuditFields({ ...booking, ...payload }),
        { context: "staff_approval" }
      );
      setStaffActionMessage("อัปเดตสถานะคำขอเรียบร้อยแล้ว", "#047857");
    } catch (err) {
      const code = (err?.code || "").toString().trim();
      if (code === "permission-denied") {
        setStaffActionMessage(
          "ไม่มีสิทธิ์อัปเดตสถานะนี้ (ตรวจสอบสิทธิ์บัญชี Staff และ Firestore Rules)",
          "#b91c1c"
        );
        return;
      }
      setStaffActionMessage("ไม่สามารถอัปเดตสถานะคำขอได้ในขณะนี้", "#b91c1c");
    }
  };

  const deleteById = async (id) => {
    if (!hasFirestore || !id) return;
    const confirmed = await confirmDeleteBooking();
    if (!confirmed) return;
    const booking = bookings.find((item) => item.id === id) || null;
    try {
      await firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_NAME, id));
      await writeAuditLog(
        "booking.deleted_by_staff",
        "meetingRoomBooking",
        id,
        booking ? pickBookingAuditFields(booking) : null,
        null,
        { context: "staff_approval" }
      );
      setStaffActionMessage("ลบคำขอเรียบร้อยแล้ว", "#047857");
    } catch (err) {
      const code = (err?.code || "").toString().trim();
      if (code === "permission-denied") {
        setStaffActionMessage("ไม่มีสิทธิ์ลบคำขอ (ต้องเป็นบัญชี Staff ตาม Firestore rules)", "#b91c1c");
        return;
      }
      const detail = code ? ` (${code})` : "";
      setStaffActionMessage(`ไม่สามารถลบคำขอได้ในขณะนี้${detail}`, "#b91c1c");
    }
  };

  const subscribeBookings = () => {
    if (!hasFirestore) return;
    if (typeof unsubscribe === "function") {
      try {
        unsubscribe();
      } catch (_) {
        // ignore unsubscribe errors
      }
      unsubscribe = null;
    }
    try {
      const colRef = firestore.collection(firestore.db, COLLECTION_NAME);
      const windowRange = getStaffBookingQueryWindow();
      const bookingsQuery = firestore.query(
        colRef,
        firestore.where("date", ">=", windowRange.start),
        firestore.where("date", "<=", windowRange.end),
        firestore.orderBy("date", "asc"),
        ...(firestore.limit ? [firestore.limit(STAFF_BOOKING_LIST_LIMIT)] : [])
      );
      if (subscribeGuardTimer) {
        window.clearTimeout(subscribeGuardTimer);
      }
      subscribeGuardTimer = window.setTimeout(() => {
        if (hasRenderedOnce) return;
        allTableBody.innerHTML = `
          <tr>
            <td colspan="6">โหลดข้อมูลนานผิดปกติ โปรดลองรีเฟรชหน้าอีกครั้ง</td>
          </tr>
        `;
      }, 8000);
      unsubscribe = firestore.onSnapshot(
        bookingsQuery,
        (snapshot) => {
          requestBookings = snapshot.docs.map(mapSnapshotDoc);
          syncLoadedBookings();
          syncStaffRequestNotifications(requestBookings);
          bookingsLoadFailed = false;
          clearStaffAutoRetry();
          render();
        },
        (err) => {
          const code = (err?.code || "").toString().trim();
          if (code === "permission-denied" && !readCurrentUserEmail()) {
            if (queueBody) {
              queueBody.innerHTML = `
                <tr>
                  <td colspan="7">กำลังตรวจสอบสิทธิ์การเข้าถึงข้อมูล...</td>
                </tr>
              `;
            }
            allTableBody.innerHTML = `
              <tr>
                <td colspan="6">กำลังตรวจสอบสิทธิ์การเข้าถึงข้อมูล...</td>
              </tr>
            `;
            setStaffRequestReminder("");
            renderStaffCalendar([]);
            scheduleStaffAutoRetry();
            return;
          }
          bookingsLoadFailed = true;
          const detail = err?.code ? ` (${err.code})` : "";
          if (queueBody) {
            queueBody.innerHTML = `
              <tr>
                <td colspan="7">ไม่สามารถโหลดข้อมูลได้${detail}</td>
              </tr>
            `;
          }
          allTableBody.innerHTML = `
            <tr>
              <td colspan="6">ไม่สามารถโหลดข้อมูลได้${detail}</td>
            </tr>
          `;
          setStaffRequestReminder("");
          renderStaffCalendar([]);
          scheduleStaffAutoRetry();
        }
      );
    } catch (err) {
      bookingsLoadFailed = true;
      const detail = err?.code ? ` (${err.code})` : "";
      if (queueBody) {
        queueBody.innerHTML = `
          <tr>
            <td colspan="7">ไม่สามารถเชื่อมต่อ Firestore ได้${detail}</td>
          </tr>
        `;
      }
      allTableBody.innerHTML = `
        <tr>
          <td colspan="6">ไม่สามารถเชื่อมต่อ Firestore ได้${detail}</td>
        </tr>
      `;
      setStaffRequestReminder("");
      renderStaffCalendar([]);
      scheduleStaffAutoRetry();
    }
  };

  const validateHistoryDateRange = () => {
    if (!historyStartDateFilter || !historyEndDateFilter) {
      return "กรุณาเลือกวันที่เริ่มและวันที่สิ้นสุดก่อนแสดงผล";
    }
    if (historyStartDateFilter > historyEndDateFilter) {
      return "วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด";
    }
    return "";
  };

  const resetHistorySubscription = () => {
    if (typeof unsubscribeHistory === "function") {
      unsubscribeHistory();
      unsubscribeHistory = null;
    }
    historyHasLoaded = false;
    historyLoadErrorText = "";
    historyBookings = [];
    syncLoadedBookings();
  };

  const resetMeetingHistoryFilters = () => {
    historyStartDateFilter = "";
    historyEndDateFilter = "";
    historyRoomFilter = "all";
    historySearchQuery = "";
    if (historyStartDateInputEl) historyStartDateInputEl.value = "";
    if (historyEndDateInputEl) historyEndDateInputEl.value = "";
    if (historyRoomSelectEl) historyRoomSelectEl.value = "all";
    if (historySearchInputEl) historySearchInputEl.value = "";
    resetHistorySubscription();
    pageByTab.requests = 1;
    pageByTab.history = 1;
    setStaffActionMessage(
      activeTab === "history" ? "ล้างตัวกรองแล้ว เลือกช่วงวันที่เพื่อโหลดประวัติอีกครั้ง" : "ล้างตัวกรองแล้ว",
      "#6b7280"
    );
    render();
  };

  const subscribeHistoryBookings = () => {
    if (!hasFirestore) return;
    const validationMessage = validateHistoryDateRange();
    if (validationMessage) {
      historyHasLoaded = false;
      historyLoadErrorText = validationMessage;
      render();
      setStaffActionMessage(validationMessage, "#b91c1c");
      return;
    }
    if (typeof unsubscribeHistory === "function") {
      unsubscribeHistory();
      unsubscribeHistory = null;
    }
    historyHasLoaded = true;
    historyLoadErrorText = "";
    pageByTab.history = 1;
    allTableBody.innerHTML = `
      <tr>
        <td colspan="6">กำลังโหลดประวัติการขอ...</td>
      </tr>
    `;
    setStaffActionMessage("กำลังโหลดประวัติการขอ...", "#6b7280");

    try {
      const colRef = firestore.collection(firestore.db, COLLECTION_NAME);
      const historyQuery = firestore.query(
        colRef,
        firestore.where("date", ">=", historyStartDateFilter),
        firestore.where("date", "<=", historyEndDateFilter),
        firestore.orderBy("date", "desc"),
        ...(firestore.limit ? [firestore.limit(STAFF_BOOKING_LIST_LIMIT)] : [])
      );
      unsubscribeHistory = firestore.onSnapshot(
        historyQuery,
        (snapshot) => {
          historyBookings = snapshot.docs.map(mapSnapshotDoc);
          syncLoadedBookings();
          historyLoadErrorText = "";
          clearStaffAutoRetry();
          setStaffActionMessage(
            `โหลดประวัติ ${historyBookings.length} รายการ ในช่วง ${formatDate(historyStartDateFilter)} - ${formatDate(historyEndDateFilter)}`,
            "#047857"
          );
          render();
        },
        (err) => {
          const detail = err?.code ? ` (${err.code})` : "";
          historyBookings = [];
          syncLoadedBookings();
          historyLoadErrorText = `ไม่สามารถโหลดประวัติการขอได้${detail}`;
          setStaffActionMessage(historyLoadErrorText, "#b91c1c");
          render();
          scheduleStaffAutoRetry();
        }
      );
    } catch (err) {
      const detail = err?.code ? ` (${err.code})` : "";
      historyBookings = [];
      syncLoadedBookings();
      historyLoadErrorText = `ไม่สามารถเชื่อมต่อ Firestore เพื่อโหลดประวัติได้${detail}`;
      setStaffActionMessage(historyLoadErrorText, "#b91c1c");
      render();
      scheduleStaffAutoRetry();
    }
  };

  const root = (queueBody || allTableBody).closest(".page");
  if (root) {
    if (tabButtons.length) {
      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          updateTabUI(btn.dataset.meetingStaffTab || "requests");
          pageByTab[activeTab] = 1;
          if (activeTab === "history" && !historyHasLoaded) {
            setStaffActionMessage("เลือกช่วงวันที่แล้วกดแสดงผลเพื่อโหลดประวัติ", "#6b7280");
          }
          render();
        });
      });
    }

    root.addEventListener("click", (event) => {
      const clickedElement = event.target;
      if (!(clickedElement instanceof HTMLElement)) return;

      const interactiveEl = clickedElement.closest(
        "button, select, input, textarea, a, [data-action], [data-role]"
      );
      if (!interactiveEl) {
        const row = clickedElement.closest("tr[data-booking-id]");
        const bookingId = row?.dataset?.bookingId || "";
        if (bookingId && typeof window.openMeetingBookingDetailModal === "function") {
          const booking = bookings.find((item) => item.id === bookingId);
          if (booking) {
            window.openMeetingBookingDetailModal(booking, {
              includeContact: true,
              allowStatusEdit: true
            });
            return;
          }
        }
      }

      const button = clickedElement.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;
      const pageAction = button.dataset.meetingPageAction;
      if (pageAction === "prev" || pageAction === "next") {
        const current = pageByTab[activeTab] || 1;
        pageByTab[activeTab] = pageAction === "next"
          ? current + 1
          : Math.max(1, current - 1);
        render();
        return;
      }
      const action = button.dataset.action;
      const id = button.dataset.id;
      if (action === "select-holiday-date") {
        const date = button.dataset.date || "";
        const existingHoliday = customHolidays.find((item) => item.date === date);
        if (existingHoliday) {
          const shouldRemove = window.confirm(
            `ลบวันปิดให้บริการ “${existingHoliday.name}” วันที่ ${formatDate(date)} ใช่หรือไม่`
          );
          if (shouldRemove) void removeHoliday(existingHoliday.id);
        } else if (holidayAddDialog) {
          if (holidayManageDateInput) holidayManageDateInput.value = date;
          if (holidayManageNameInput) holidayManageNameInput.value = "";
          if (holidayManageDialogMessage) holidayManageDialogMessage.textContent = "";
          holidayAddDialog.showModal();
          window.setTimeout(() => holidayManageNameInput?.focus(), 0);
        }
        return;
      }
      if (action === "open-room-manage") {
        const roomId = button.dataset.roomId;
        if (!roomId) return;
        const room = rooms.find((item) => item.id === roomId);
        if (!room || !roomEditDialog) return;
        activeManageRoomId = roomId;
        if (roomEditNameInput) roomEditNameInput.value = room.name;
        setAccessToggleValue(roomEditAccessFieldset, room.bookingAccess);
        if (roomEditDialogMessage) roomEditDialogMessage.textContent = "";
        if (roomEditDeleteBtn) roomEditDeleteBtn.disabled = room.isDefault || rooms.length <= 1;
        roomEditDialog.showModal();
        window.setTimeout(() => {
          roomEditNameInput?.focus();
          roomEditNameInput?.select();
        }, 0);
        return;
      }
      if (action === "remove-holiday") {
        const holidayId = button.dataset.holidayId;
        if (!holidayId) return;
        void removeHoliday(holidayId);
        return;
      }
      if (!id) return;
      button.disabled = true;
      const restoreButton = () => {
        button.disabled = false;
      };
      if (action === "approve") {
        void setStatusById(id, "approved").finally(restoreButton);
      } else if (action === "reject") {
        void setStatusById(id, "rejected").finally(restoreButton);
      } else if (action === "approve-cancel") {
        void setStatusById(id, "rejected", { rejectionReason: "อนุมัติคำขอยกเลิก" }).finally(restoreButton);
      } else if (action === "reject-cancel") {
        void setStatusById(id, "approved").finally(restoreButton);
      } else if (action === "cancel") {
        void setStatusById(id, "pending").finally(restoreButton);
      } else if (action === "delete") {
        void deleteById(id).finally(restoreButton);
      } else {
        restoreButton();
      }
    });

    root.addEventListener("change", (event) => {
      const select = event.target;
      if (!(select instanceof HTMLSelectElement)) return;
      if (select.dataset.role !== "status-select") return;
      const id = select.dataset.id;
      const value = (select.value || "").toString();
      if (!id || !value) return;
      select.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested", "is-delete");
      select.classList.add(statusSelectClass(value));

      const booking = bookings.find((item) => item.id === id);
      if (value === "delete") {
        deleteById(id);
        return;
      }
      if (value !== "pending" && value !== "approved" && value !== "rejected" && value !== "cancel_requested" && value !== "reschedule_requested" && value !== "no_show") return;
      if (booking && booking.status === value) return;
      setStatusById(id, value);
    });

    root.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.dataset.role !== "room-edit-input") return;
      if (event.key !== "Enter") return;
      event.preventDefault();
      const roomId = target.dataset.roomId || "";
      if (!roomId) return;
      void renameRoom(roomId, target.value);
    });

    if (staffCalendarPanel) {
      staffCalendarPanel.addEventListener("click", (event) => {
        const clickedElement = event.target;
        if (!(clickedElement instanceof Element)) return;
        const eventTarget = clickedElement.closest(".calendar-event[data-booking-id]");
        if (eventTarget && eventTarget.dataset.bookingId) {
          const booking = bookings.find((item) => item.id === eventTarget.dataset.bookingId);
          if (!booking) return;
          if (typeof window.openMeetingBookingDetailModal === "function") {
            window.openMeetingBookingDetailModal(booking, {
              includeContact: true,
              allowStatusEdit: true
            });
          }
          return;
        }
        const dayTarget = clickedElement.closest(".calendar-day[data-date]");
        if (!dayTarget || !dayTarget.dataset.date) return;
        const calendarRows = getCalendarRows(bookings);
        openStaffBookingDayModal(dayTarget.dataset.date, calendarRows);
      });
    }

    if (bookingDayModalCloseEl) {
      bookingDayModalCloseEl.addEventListener("click", closeStaffBookingDayModal);
    }
    if (bookingDayModalEl) {
      bookingDayModalEl.addEventListener("click", (event) => {
        if (event.target === bookingDayModalEl) {
          closeStaffBookingDayModal();
        }
      });
    }
    if (bookingDayModalBodyEl && typeof window.openMeetingBookingDetailModal !== "function") {
      bookingDayModalBodyEl.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const row = target.closest("tr[data-booking-id]");
        if (!row || !row.dataset.bookingId) return;
        closeStaffBookingDayModal();
        openStaffBookingDetailFallback(row.dataset.bookingId);
      });
    }
    if (bookingDetailCloseEl && bookingDetailModalEl) {
      bookingDetailCloseEl.addEventListener("click", () => {
        if (typeof closeDialog === "function") closeDialog(bookingDetailModalEl);
      });
    }
  }

  updateTabUI(activeTab);
  renderStaffCalendar([]);

  if (staffCalendarPrevBtn) {
    staffCalendarPrevBtn.addEventListener("click", () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
      subscribeBookings();
      renderStaffCalendar(getCalendarRows(bookings));
    });
  }

  if (staffCalendarNextBtn) {
    staffCalendarNextBtn.addEventListener("click", () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      subscribeBookings();
      renderStaffCalendar(getCalendarRows(bookings));
    });
  }

  if (historySearchInputEl) {
    historySearchInputEl.addEventListener("input", () => {
      historySearchQuery = (historySearchInputEl.value || "").toString().trim().toLowerCase();
      pageByTab[activeTab] = 1;
      render();
    });
    historySearchInputEl.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!historySearchInputEl.value) return;
      historySearchInputEl.value = "";
      historySearchQuery = "";
      pageByTab[activeTab] = 1;
      render();
    });
  }

  exportCsvBtnEl?.addEventListener("click", exportMeetingRoomCsv);

  if (historyStartDateInputEl) {
    historyStartDateInputEl.addEventListener("change", () => {
      historyStartDateFilter = (historyStartDateInputEl.value || "").toString().trim();
      resetHistorySubscription();
      pageByTab.history = 1;
      if (activeTab === "history") render();
    });
  }

  if (historyEndDateInputEl) {
    historyEndDateInputEl.addEventListener("change", () => {
      historyEndDateFilter = (historyEndDateInputEl.value || "").toString().trim();
      resetHistorySubscription();
      pageByTab.history = 1;
      if (activeTab === "history") render();
    });
  }

  if (historyLoadBtnEl) {
    historyLoadBtnEl.addEventListener("click", () => {
      historyStartDateFilter = (historyStartDateInputEl?.value || "").toString().trim();
      historyEndDateFilter = (historyEndDateInputEl?.value || "").toString().trim();
      updateTabUI("history");
      subscribeHistoryBookings();
    });
  }

  if (historyResetBtnEl) {
    historyResetBtnEl.addEventListener("click", resetMeetingHistoryFilters);
  }

  if (historyRoomSelectEl) {
    historyRoomSelectEl.addEventListener("change", () => {
      historyRoomFilter = (historyRoomSelectEl.value || "all").toString().trim() || "all";
      pageByTab[activeTab] = 1;
      render();
    });
  }

  if (roomManageForm) {
    roomManageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const didAdd = await addRoom(
        roomManageInput?.value || "",
        readAccessToggleValue(roomManageAccessFieldset)
      );
      if (didAdd) roomAddDialog?.close();
    });
  }
  renderRoomManageList();
  renderHolidayManageList();

  if (holidayManageForm) {
    holidayManageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const didAdd = await addHoliday(holidayManageDateInput?.value || "", holidayManageNameInput?.value || "");
      if (didAdd) holidayAddDialog?.close();
    });
  }

  if (holidayCalendarPrevBtn) {
    holidayCalendarPrevBtn.addEventListener("click", () => {
      holidayCalendarCursor = new Date(
        holidayCalendarCursor.getFullYear(),
        holidayCalendarCursor.getMonth() - 1,
        1
      );
      renderHolidayManageList();
    });
  }

  if (holidayCalendarNextBtn) {
    holidayCalendarNextBtn.addEventListener("click", () => {
      holidayCalendarCursor = new Date(
        holidayCalendarCursor.getFullYear(),
        holidayCalendarCursor.getMonth() + 1,
        1
      );
      renderHolidayManageList();
    });
  }

  if (roomEditForm) {
    roomEditForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const room = rooms.find((item) => item.id === activeManageRoomId);
      if (!room) return;
      const nameUpdated = await renameRoom(activeManageRoomId, roomEditNameInput?.value || "");
      if (!nameUpdated) return;
      const accessUpdated = await updateRoomBookingAccess(
        activeManageRoomId,
        readAccessToggleValue(roomEditAccessFieldset)
      );
      if (accessUpdated) roomEditDialog?.close();
    });
  }

  if (roomEditDeleteBtn) {
    roomEditDeleteBtn.addEventListener("click", () => {
      const room = rooms.find((item) => item.id === activeManageRoomId);
      if (!room || room.isDefault || rooms.length <= 1) return;
      if (roomDeleteNameEl) roomDeleteNameEl.textContent = room.name;
      if (roomDeleteDialogMessage) roomDeleteDialogMessage.textContent = "";
      roomEditDialog?.close();
      roomDeleteDialog?.showModal();
    });
  }

  if (roomDeleteConfirmBtn) {
    roomDeleteConfirmBtn.addEventListener("click", async () => {
      roomDeleteConfirmBtn.disabled = true;
      const didRemove = await removeRoom(activeManageRoomId);
      roomDeleteConfirmBtn.disabled = false;
      if (didRemove) roomDeleteDialog?.close();
    });
  }

  window.__meetingRoomStaffInitDone = true;
  subscribeRooms();
  subscribeHolidays();
  subscribeBookings();
  if (window.sgcuAuth?.auth && typeof window.sgcuAuth.onAuthStateChanged === "function") {
    window.sgcuAuth.onAuthStateChanged(window.sgcuAuth.auth, () => {
      hasBookingSnapshotBaseline = false;
      previousQueueStatusById = new Map();
      setStaffRequestReminder("");
      if (roomsLoadFailed || bookingsLoadFailed || !hasRenderedOnce) {
        retryStaffSubscriptions();
      }
    });
  }
  window.addEventListener("beforeunload", () => {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
    if (typeof unsubscribeHistory === "function") {
      unsubscribeHistory();
    }
    if (typeof unsubscribeRooms === "function") {
      unsubscribeRooms();
    }
    if (typeof unsubscribeHolidays === "function") {
      unsubscribeHolidays();
    }
    clearStaffAutoRetry();
  });
  return true;
}

function bootstrapMeetingRoomStaffApproval() {
  let attempts = 0;
  const maxAttempts = 60;
  const attemptInit = () => {
    const initialized = initMeetingRoomStaffApproval();
    if (initialized) return;
    attempts += 1;
    if (attempts < maxAttempts) {
      window.setTimeout(attemptInit, 300);
    }
  };
  attemptInit();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapMeetingRoomStaffApproval);
} else {
  bootstrapMeetingRoomStaffApproval();
}

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#meeting-room-staff") {
    initMeetingRoomStaffApproval();
  }
});

window.initMeetingRoomStaffApproval = initMeetingRoomStaffApproval;
