/* Meeting room booking (Firestore shared data) */
function initMeetingRoomBookingApp() {
  if (window.__sgcuMeetingRoomBookingInitialized) return;
  window.__sgcuMeetingRoomBookingInitialized = true;
  const form = document.getElementById("meetingRoomBookingForm");
  const roomSelect = document.getElementById("meetingRoomName");
  const dateInput = document.getElementById("meetingDate");
  const startTimeInput = document.getElementById("meetingStartTime");
  const endTimeInput = document.getElementById("meetingEndTime");
  const meetingProfileRequesterEl = document.getElementById("meetingProfileRequester");
  const meetingProfilePhoneEl = document.getElementById("meetingProfilePhone");
  const meetingProfileContactEl = document.getElementById("meetingProfileContact");
  const purposeInput = document.getElementById("meetingPurpose");
  const cancelSection = document.getElementById("meetingCancelSection");
  const toggleCancelFormBtn = document.getElementById("meetingToggleCancelForm");
  const cancelForm = document.getElementById("meetingCancelForm");
  const cancelBookingSelect = document.getElementById("meetingCancelBookingSelect");
  const cancelReasonInput = document.getElementById("meetingCancelReason");
  const cancelMessageEl = document.getElementById("meetingCancelMessage");
  const manageActionSelect = document.getElementById("meetingManageAction");
  const manageHelperEl = document.getElementById("meetingManageHelper");
  const manageBookingSummaryEl = document.getElementById("meetingManageBookingSummary");
  const manageRescheduleFields = document.getElementById("meetingManageRescheduleFields");
  const manageSubmitBtn = document.getElementById("meetingManageSubmit");
  const rescheduleSection = document.getElementById("meetingRescheduleSection");
  const toggleRescheduleFormBtn = document.getElementById("meetingToggleRescheduleForm");
  const rescheduleForm = document.getElementById("meetingRescheduleForm");
  const rescheduleBookingSelect = document.getElementById("meetingRescheduleBookingSelect");
  const rescheduleRoomSelect = document.getElementById("meetingRescheduleRoom");
  const rescheduleDateInput = document.getElementById("meetingRescheduleDate");
  const rescheduleStartTimeInput = document.getElementById("meetingRescheduleStartTime");
  const rescheduleEndTimeInput = document.getElementById("meetingRescheduleEndTime");
  const rescheduleReasonInput = document.getElementById("meetingRescheduleReason");
  const rescheduleMessageEl = document.getElementById("meetingRescheduleMessage");
  const projectModeSelect = document.getElementById("meetingProjectMode");
  const projectCodeInput = document.getElementById("meetingProjectCode");
  const projectCodeState = document.getElementById("meetingProjectCodeState");
  const projectNamePreview = document.getElementById("meetingProjectNamePreview");
  const messageEl = document.getElementById("meetingBookingMessage");
  const reminderBannerEl = document.getElementById("meetingReminderBanner");
  let tableBody = document.getElementById("meetingRoomTableBody");
  const calendarPanel = document.getElementById("meetingRoomCalendar");
  const calendarTitle = document.getElementById("meetingCalendarTitle");
  const calendarPanelWrap = document.getElementById("meetingRoomCalendarPanel");
  let listPanel = document.getElementById("meetingRoomListPanel");
  let viewCalendarBtn = document.getElementById("meetingViewCalendarBtn");
  let viewListBtn = document.getElementById("meetingViewListBtn");
  const calendarPrevBtn = document.getElementById("meetingCalendarPrevMonth");
  const calendarNextBtn = document.getElementById("meetingCalendarNextMonth");
  const calendarTodayBtn = document.getElementById("meetingCalendarToday");
  const calendarMonthViewBtn = document.getElementById("meetingCalendarMonthView");
  const calendarWeekViewBtn = document.getElementById("meetingCalendarWeekView");
  const calendarRoomFilter = document.getElementById("meetingCalendarRoomFilter");
  let bookingCountEl = document.getElementById("meetingRoomBookingCount");
  let pendingCountEl = document.getElementById("meetingRoomPendingCount");
  let latestDateEl = document.getElementById("meetingRoomLatestDate");
  const bookingDetailModalEl = document.getElementById("meetingBookingDetailModal");
  const bookingDetailTitleEl = document.getElementById("meetingBookingDetailTitle");
  const bookingDetailBodyEl = document.getElementById("meetingBookingDetailBody");
  const bookingDetailCloseEl = document.getElementById("meetingBookingDetailClose");
  const bookingDayModalEl = document.getElementById("meetingBookingDayModal");
  const bookingDayModalTitleEl = document.getElementById("meetingBookingDayTitle");
  const bookingDayModalBodyEl = document.getElementById("meetingBookingDayBody");
  const bookingDayModalCloseEl = document.getElementById("meetingBookingDayClose");
  const rejectReasonModalEl = document.getElementById("meetingRejectReasonModal");
  const rejectReasonInputEl = document.getElementById("meetingRejectReasonInput");
  const rejectReasonErrorEl = document.getElementById("meetingRejectReasonError");
  const rejectReasonSubmitEl = document.getElementById("meetingRejectReasonSubmit");
  const rejectReasonCancelEl = document.getElementById("meetingRejectReasonCancel");
  const rejectReasonCloseEl = document.getElementById("meetingRejectReasonClose");

  if (!form || !roomSelect || !dateInput || !startTimeInput || !endTimeInput ||
      !purposeInput || !messageEl) {
    return;
  }

  const STORAGE_KEY = "meetingRoomBookings-v1";
  const LOCAL_MIGRATED_KEY = "meetingRoomBookingsMigratedToFirestore-v1";
  const PROFILE_STORAGE_KEY = "sgcu_user_profile_by_email_v1";
  const LEGACY_PROFILE_STORAGE_KEY = "sgcu_borrow_profile_by_email_v1";
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const firestoreCollections = appConfig.firestore?.collections || {};
  const USER_PROFILE_COLLECTION = firestoreCollections.userProfiles || "userProfiles";
  const STAFF_PROFILE_COLLECTION = firestoreCollections.staffProfiles || "staffProfiles";
  const BOOKING_COLLECTION_NAME = firestoreCollections.meetingRoomBookings || "meetingRoomBookings";
  const ROOM_COLLECTION_NAME = firestoreCollections.meetingRooms || "meetingRooms";
  const HOLIDAY_COLLECTION_NAME = firestoreCollections.meetingRoomHolidays || "meetingRoomHolidays";
  const USER_BOOKING_LOOKBACK_MONTHS = 1;
  const USER_BOOKING_LOOKAHEAD_MONTHS = 3;
  const DEFAULT_MEETING_ROOMS = [
    { id: "room-1", name: "ห้องประชุม 1 ชั้น 2", bookingAccess: "public" },
    { id: "room-2", name: "ห้องประชุม 2 ชั้น 2", bookingAccess: "public" },
    { id: "room-3", name: "ห้องประชุม 3 ชั้น 2", bookingAccess: "public" }
  ];
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
  const DEFAULT_PROJECT_MODE = "non_project";
  const MIN_CANCEL_BEFORE_HOURS = 12;
  const REMINDER_WINDOWS = [
    { key: "60m", ms: 60 * 60 * 1000, label: "ภายใน 1 ชั่วโมง" },
    { key: "15m", ms: 15 * 60 * 1000, label: "ภายใน 15 นาที" }
  ];
  const REMINDER_INTERVAL_MS = 60 * 1000;
  const REMINDER_STORAGE_KEY = "meetingRoomReminderSent-v1";
  const NO_SHOW_LOOKBACK_DAYS = 90;
  const NO_SHOW_BLOCK_THRESHOLD = 3;
  const NO_SHOW_BLOCK_DAYS = 30;
  const NO_SHOW_REASON_MARKER = "[NO_SHOW]";
  let projectLookupPromise = null;
  let projectLookupReady = false;
  let projectByCode = new Map();
  let meetingRooms = [...DEFAULT_MEETING_ROOMS];
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
      firestore.orderBy &&
      firestore.doc &&
      firestore.updateDoc &&
      firestore.serverTimestamp
    );
    return hasFirestore;
  };
  resolveFirestoreBridge();
  let meetingRoomActiveView = "calendar";

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
  const isNoShowReason = (reason) =>
    (reason || "").toString().trim().toUpperCase().startsWith(NO_SHOW_REASON_MARKER);
  const buildNoShowReason = (reason = "") => {
    const text = (reason || "").toString().trim();
    if (isNoShowReason(text)) return text;
    return `${NO_SHOW_REASON_MARKER} ไม่มาใช้ห้องตามเวลาจอง`;
  };

  const normalizeRoomBookingAccess = (value) =>
    value === "staff_only" ? "staff_only" : "public";

  const normalizeRoomDisplay = (roomId, roomName) =>
    meetingRooms.find((room) => room.id === roomId)?.name || roomName || roomId || "-";

  const getRoomBookingAccess = (roomId) =>
    normalizeRoomBookingAccess(meetingRooms.find((room) => room.id === roomId)?.bookingAccess);

  const toDateTime = (date, time) => new Date(`${date}T${time}:00`);

  const normalizeProjectCode = (value) => {
    const text = (value || "").toString();
    const normalized = typeof text.normalize === "function"
      ? text.normalize("NFKC")
      : text;
    return normalized
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/^'+/, "")
      .replace(/\s+/g, "")
      .trim()
      .toUpperCase();
  };

  const canonicalProjectCode = (value) =>
    normalizeProjectCode(value).replace(/[^A-Z0-9]/g, "");

  let calendarCursor = new Date();
  let calendarDisplayMode = "month";
  let calendarRoomFilterValue = "all";

  const toDateKeyForQuery = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getBookingQueryWindow = () => {
    const base = calendarCursor instanceof Date && !Number.isNaN(calendarCursor.getTime())
      ? calendarCursor
      : new Date();
    const start = new Date(base.getFullYear(), base.getMonth() - USER_BOOKING_LOOKBACK_MONTHS, 1);
    const end = new Date(base.getFullYear(), base.getMonth() + USER_BOOKING_LOOKAHEAD_MONTHS + 1, 0);
    return {
      start: toDateKeyForQuery(start),
      end: toDateKeyForQuery(end)
    };
  };

  const readProjectSource = () => {
    if (typeof window === "undefined") return [];
    if (window.sgcuProjectData?.projects) return window.sgcuProjectData.projects;
    if (Array.isArray(window.projects)) return window.projects;
    if (typeof projects !== "undefined" && Array.isArray(projects)) return projects;
    return [];
  };

  const hydrateProjectLookup = (source = []) => {
    projectByCode = new Map();
    if (!Array.isArray(source)) return;
    source.forEach((item) => {
      const code = normalizeProjectCode(item?.code);
      if (!code) return;
      projectByCode.set(code, item);
      const canonicalCode = canonicalProjectCode(code);
      if (canonicalCode && !projectByCode.has(canonicalCode)) {
        projectByCode.set(canonicalCode, item);
      }
    });
    projectLookupReady = source.length > 0;
  };

  const waitForProjectData = async () => {
    if (projectLookupPromise) return projectLookupPromise;
    projectLookupPromise = (async () => {
      if (!projectLookupReady) {
        const ensureLoader =
          (typeof window !== "undefined" && typeof window.ensureProjectDataLoaded === "function")
            ? window.ensureProjectDataLoaded
            : (typeof ensureProjectDataLoaded === "function" ? ensureProjectDataLoaded : null);
        if (ensureLoader) {
          try {
            await ensureLoader();
          } catch (err) {
            // leave with fallback local cache
          }
        }
        hydrateProjectLookup(readProjectSource());
      }
    })();
    await projectLookupPromise;
    projectLookupPromise = null;
  };

  const getProjectByCode = async (codeValue) => {
    const normalized = normalizeProjectCode(codeValue);
    if (!normalized) return null;
    await waitForProjectData();
    const exact = projectByCode.get(normalized);
    if (exact) return exact;
    const canonical = canonicalProjectCode(normalized);
    if (canonical) return projectByCode.get(canonical) || null;
    return null;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const createFieldElement = ({ id, label, required = false, type = "text", value = "", placeholder = "" }) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";
    const labelEl = document.createElement("label");
    labelEl.setAttribute("for", id);
    labelEl.textContent = required ? `${label} *` : label;
    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    input.type = type;
    input.className = "form-input";
    input.placeholder = placeholder;
    input.required = !!required;
    input.value = value;
    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return wrapper;
  };

  const createSelectElement = ({ id, label, options = [] }) => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";
    const labelEl = document.createElement("label");
    labelEl.setAttribute("for", id);
    labelEl.textContent = `${label} *`;
    const select = document.createElement("select");
    select.id = id;
    select.name = id;
    select.className = "form-input";
    select.required = true;
    options.forEach((option) => {
      const optionEl = document.createElement("option");
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      select.appendChild(optionEl);
    });
    wrapper.appendChild(labelEl);
    wrapper.appendChild(select);
    return wrapper;
  };

  const ensureFormContactFields = () => {
    if (!form || !messageEl) return;

    const projectModeField = document.getElementById("meetingProjectMode");
    if (!projectModeField) return;
    const projectFieldsWrapper = document.getElementById("meetingProjectFields");

    const toggleProjectFields = () => {
      const isProject = projectModeField.value === "project";
      if (projectFieldsWrapper) {
        projectFieldsWrapper.hidden = !isProject;
      }
      if (!isProject) {
        clearProjectFeedback();
      }
    };
    projectModeField.addEventListener("change", toggleProjectFields);
    toggleProjectFields();

    if (projectCodeInput) {
      projectCodeInput.addEventListener("blur", async () => {
        if (projectModeField.value !== "project") return;
        const code = projectCodeInput.value;
        if (!code.trim()) {
          clearProjectFeedback();
          return;
        }
        const project = await getProjectByCode(code);
        if (project) {
          showProjectSuccess(project);
        } else {
          showProjectError("ไม่พบรหัสโครงการนี้ กรุณากรอกรหัสใหม่");
        }
      });
    }
  };

  const readSharedProfiles = () => {
    try {
      const rawPrimary = window.localStorage?.getItem(PROFILE_STORAGE_KEY);
      const rawLegacy = window.localStorage?.getItem(LEGACY_PROFILE_STORAGE_KEY);
      const raw = rawPrimary || rawLegacy;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!rawPrimary && rawLegacy) {
        try {
          window.localStorage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(parsed || {}));
        } catch (_) {
          // ignore local cache write errors
        }
      }
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  };

  const applySharedProfileToMeetingForm = (profile) => {
    if (!profile || typeof profile !== "object") return;
    activeMeetingProfile = {
      firstName: (profile.firstName || "").toString().trim(),
      lastName: (profile.lastName || "").toString().trim(),
      phone: (profile.phone || "").toString().trim(),
      lineId: (profile.lineId || "").toString().trim(),
      profileType: normalizeRequesterProfileType(profile.profileType || window.currentUserProfileType || "student")
    };
    const fullName = [activeMeetingProfile.firstName, activeMeetingProfile.lastName]
      .map((part) => (part || "").toString().trim())
      .filter(Boolean)
      .join(" ");
    if (meetingProfileRequesterEl) meetingProfileRequesterEl.textContent = `ชื่อผู้ขอ: ${fullName || "-"}`;
    if (meetingProfilePhoneEl) meetingProfilePhoneEl.textContent = `เบอร์ติดต่อ: ${activeMeetingProfile.phone || "-"}`;
    if (meetingProfileContactEl) meetingProfileContactEl.textContent = `ช่องทางติดต่อ: ${activeMeetingProfile.lineId || "-"}`;
  };

  const restoreMeetingProfileForCurrentUser = () => {
    const email = (currentUserEmail || "").toString().trim().toLowerCase();
    if (!email) {
      activeMeetingProfile = null;
      if (meetingProfileRequesterEl) meetingProfileRequesterEl.textContent = "ชื่อผู้ขอ: -";
      if (meetingProfilePhoneEl) meetingProfilePhoneEl.textContent = "เบอร์ติดต่อ: -";
      if (meetingProfileContactEl) meetingProfileContactEl.textContent = "ช่องทางติดต่อ: -";
      return;
    }
    const profile = readSharedProfiles()[email];
    if (!profile) return;
    applySharedProfileToMeetingForm(profile);
  };

  const getMeetingProfileForSubmit = async () => {
    const email = (currentUserEmail || "").toString().trim().toLowerCase();
    if (!email) return null;
    if (activeMeetingProfile && activeMeetingProfile.firstName && activeMeetingProfile.lastName) {
      return activeMeetingProfile;
    }
    const local = readSharedProfiles()[email];
    if (local) {
      applySharedProfileToMeetingForm(local);
      return activeMeetingProfile;
    }
    const remote = await readMeetingProfileFromFirestore();
    if (remote) {
      applySharedProfileToMeetingForm(remote);
      return activeMeetingProfile;
    }
    return null;
  };

  const readMeetingProfileFromFirestore = async () => {
    const firestoreBridge = window.sgcuFirestore || {};
    const authUser = window.sgcuAuth?.auth?.currentUser || null;
    const email = (authUser?.email || "").toString().trim().toLowerCase();
    const uid = (authUser?.uid || "").toString().trim();
    if (!email || !uid) return null;
    if (!firestoreBridge.db || !firestoreBridge.doc || !firestoreBridge.getDoc) return null;
    try {
      const ref = firestoreBridge.doc(firestoreBridge.db, USER_PROFILE_COLLECTION, uid);
      const snap = await firestoreBridge.getDoc(ref);
      if (!snap?.exists()) return null;
      const data = snap.data() || {};
      if (!data || typeof data !== "object") return null;
      const profiles = readSharedProfiles();
      profiles[email] = {
        ...(profiles[email] || {}),
        ...data,
        updatedAt: Date.now()
      };
      try {
        window.localStorage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
        window.localStorage?.setItem(LEGACY_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
      } catch (_) {
        // ignore local cache write errors
      }
      return profiles[email];
    } catch (_) {
      return null;
    }
  };

  const setProjectStatus = (type, text = "") => {
    if (!projectCodeState) return;
    projectCodeState.hidden = !text;
    projectCodeState.textContent = text;
    projectCodeState.dataset.state = type;
  };

  const showProjectSuccess = (project) => {
    setMessage("", "#374151");
    if (projectNamePreview) {
      projectNamePreview.hidden = false;
      projectNamePreview.textContent = `ชื่อโครงการ: ${project?.name || "ไม่พบชื่อ"}`;
    }
    setProjectStatus("ok", "รหัสถูกต้อง");
  };

  const showProjectError = (text) => {
    if (projectNamePreview) {
      projectNamePreview.hidden = true;
      projectNamePreview.textContent = "";
    }
    setProjectStatus("error", text);
  };

  const clearProjectFeedback = () => {
    setProjectStatus("", "");
    if (projectNamePreview) {
      projectNamePreview.hidden = true;
      projectNamePreview.textContent = "";
    }
  };

  const setMessage = (text, color = "#374151") => {
    messageEl.textContent = text || "";
    messageEl.style.color = color;
  };

  const setCancelMessage = (text, color = "#374151") => {
    if (!cancelMessageEl) return;
    cancelMessageEl.textContent = text || "";
    cancelMessageEl.style.color = color;
  };

  const setRescheduleMessage = (text, color = "#374151") => {
    const targetEl = rescheduleMessageEl || cancelMessageEl;
    if (!targetEl) return;
    targetEl.textContent = text || "";
    targetEl.style.color = color;
  };

  const setReminderBanner = (text = "", color = "#9f1239") => {
    if (!reminderBannerEl) return;
    reminderBannerEl.classList.remove("is-card");
    reminderBannerEl.textContent = text || "";
    reminderBannerEl.style.color = color;
    reminderBannerEl.hidden = !text;
  };

  const setReminderBannerCards = (items = []) => {
    if (!reminderBannerEl) return;
    if (!Array.isArray(items) || !items.length) {
      setReminderBanner("");
      return;
    }
    reminderBannerEl.classList.add("is-card");
    reminderBannerEl.style.color = "";
    reminderBannerEl.hidden = false;
    reminderBannerEl.innerHTML = `
      <div class="meeting-reminder-list">
        ${items.map((item) => `
          <div class="meeting-reminder-card-item">
            <div class="meeting-reminder-card-head">
              <div class="meeting-reminder-card-title">การประชุมใกล้ถึงเวลา</div>
              <div class="meeting-reminder-pill">${escapeText(item.remainingText || "-")}</div>
            </div>
            <div class="meeting-reminder-card-room">${escapeText(item.room || "-")}</div>
            <div class="meeting-reminder-card-datetime">
              <span>${escapeText(item.dateText || "-")}</span>
              <span class="meeting-reminder-dot">•</span>
              <span>${escapeText(item.timeText || "-")}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  };

  const readReminderState = () => {
    try {
      const raw = window.localStorage?.getItem(REMINDER_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  };

  const writeReminderState = (state) => {
    try {
      window.localStorage?.setItem(REMINDER_STORAGE_KEY, JSON.stringify(state || {}));
    } catch (_) {
      // ignore localStorage write errors
    }
  };

  const buildReminderToken = (booking, windowKey) => {
    const start = parseBookingStartDateTime(booking);
    const startKey = start ? start.getTime() : "unknown";
    return `${booking?.id || "no-id"}:${windowKey}:${startKey}`;
  };

  const formatRemaining = (remainingMs) => {
    const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
    if (minutes < 60) return `อีกประมาณ ${minutes} นาที`;
    const hours = Math.floor(minutes / 60);
    const restMin = minutes % 60;
    if (!restMin) return `อีกประมาณ ${hours} ชั่วโมง`;
    return `อีกประมาณ ${hours} ชั่วโมง ${restMin} นาที`;
  };

  const formatReminderBookingLine = (booking) => {
    const room = normalizeRoomDisplay(booking.roomId, booking.roomName);
    const dateText = formatDate(booking.date);
    const timeText = `${booking.startTime || "-"}-${booking.endTime || "-"}`;
    return `${room} • ${dateText} • ${timeText}`;
  };

  const getReminderEligibleBookings = (nowMs = Date.now()) => {
    if (!currentUserEmail) return [];
    return bookings
      .filter((item) => {
        const email = (item.requesterEmail || "").toString().trim().toLowerCase();
        if (!email || email !== currentUserEmail) return false;
        const status = normalizeStatus(item.status);
        if (status === "rejected" || status === "no_show" || status === "cancel_requested" || status === "reschedule_requested") {
          return false;
        }
        const start = parseBookingStartDateTime(item);
        if (!start) return false;
        return start.getTime() > nowMs;
      })
      .sort((a, b) => {
        const aTime = parseBookingStartDateTime(a)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bTime = parseBookingStartDateTime(b)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  };

  const maybeSendBrowserNotification = (title, body) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      const webPush = window.sgcuWebPush;
      if (webPush && typeof webPush.showNotification === "function") {
        void webPush.showNotification(title, body, {
          icon: "img/icons/treasurer-icon-192.png",
          badge: "img/icons/treasurer-icon-192.png",
          data: { url: "./#meeting-room-booking" }
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

  const showRuntimeToastNotice = (title, body, tone = "success") => {
    if (typeof document === "undefined") return;
    let host = document.getElementById("meetingRuntimeToastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "meetingRuntimeToastHost";
      host.style.position = "fixed";
      host.style.top = "14px";
      host.style.right = "14px";
      host.style.zIndex = "9999";
      host.style.display = "flex";
      host.style.flexDirection = "column";
      host.style.gap = "8px";
      host.style.maxWidth = "min(92vw, 360px)";
      host.style.pointerEvents = "none";
      document.body.appendChild(host);
    }
    const toast = document.createElement("div");
    const isError = tone === "error";
    toast.style.borderRadius = "10px";
    toast.style.border = isError ? "1px solid #fca5a5" : "1px solid #86efac";
    toast.style.background = "#ffffff";
    toast.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.12)";
    toast.style.padding = "10px 12px";
    toast.style.pointerEvents = "auto";
    toast.style.fontSize = "12px";
    toast.style.lineHeight = "1.35";
    toast.style.color = "#1f2937";
    toast.innerHTML = `
      <div style="font-weight:700; color:${isError ? "#b91c1c" : "#047857"};">${escapeText(title)}</div>
      <div style="margin-top:3px;">${escapeText(body)}</div>
    `;
    host.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
      if (host && !host.children.length) host.remove();
    }, 5000);
  };

  const enqueueApprovalEvent = (booking) => {
    const status = normalizeStatus(booking?.status);
    if (status !== "approved" && status !== "rejected" && status !== "no_show") return;
    const key = `${booking?.id || ""}:${status}`;
    if (!booking?.id || pendingApprovalEventKeys.has(key)) return;
    pendingApprovalEventKeys.add(key);
    pendingApprovalEvents.push({
      key,
      id: booking.id,
      status,
      requesterEmail: (booking.requesterEmail || "").toString().trim().toLowerCase(),
      room: normalizeRoomDisplay(booking.roomId, booking.roomName),
      date: booking.date || "",
      startTime: booking.startTime || "",
      endTime: booking.endTime || "",
      rejectionReason: (booking.rejectionReason || booking.cancelRequestReason || "").toString().trim()
    });
  };

  const flushApprovalEventsForCurrentUser = () => {
    const email = (currentUserEmail || "").toString().trim().toLowerCase();
    if (!email || !pendingApprovalEvents.length) return;
    const matched = pendingApprovalEvents.filter((event) => event.requesterEmail === email);
    if (!matched.length) return;

    const latest = matched[0];
    const approvedCount = matched.filter((event) => event.status === "approved").length;
    const rejectedCount = matched.filter((event) => event.status === "rejected" || event.status === "no_show").length;
    const schedule = `${formatDate(latest.date)} ${latest.startTime || "-"}-${latest.endTime || "-"}`;

    if (approvedCount) {
      const title = `คำขอห้องประชุมได้รับอนุมัติ (${approvedCount})`;
      const body = `${latest.room} • ${schedule}`;
      maybeSendBrowserNotification(
        title,
        body
      );
      showRuntimeToastNotice(title, body, "success");
      setMessage(`มีคำขอได้รับอนุมัติ ${approvedCount} รายการ`, "#047857");
    }
    if (rejectedCount) {
      const isNoShow = latest.status === "no_show";
      const statusLabel = isNoShow ? "ถูกบันทึกเป็น No-show" : "ถูกไม่อนุมัติ/ยกเลิก";
      const reasonText = latest.rejectionReason;
      const title = `คำขอห้องประชุม${statusLabel} (${rejectedCount})`;
      const body = `${latest.room} • ${schedule}${reasonText ? ` • เหตุผล: ${reasonText}` : ""}`;
      maybeSendBrowserNotification(
        title,
        body
      );
      showRuntimeToastNotice(title, body, "error");
      setMessage(
        `มีคำขอ${statusLabel} ${rejectedCount} รายการ${reasonText ? ` (เหตุผล: ${reasonText})` : ""}`,
        "#b91c1c"
      );
    }

    const matchedKeys = new Set(matched.map((event) => event.key));
    pendingApprovalEvents = pendingApprovalEvents.filter((event) => !matchedKeys.has(event.key));
    matchedKeys.forEach((key) => pendingApprovalEventKeys.delete(key));
  };

  const syncApprovalNotifications = (list = []) => {
    const nextStatusById = new Map(
      list.map((item) => [item.id, normalizeStatus(item.status)])
    );
    if (!hasApprovalStatusBaseline) {
      previousBookingStatusById = nextStatusById;
      hasApprovalStatusBaseline = true;
      flushApprovalEventsForCurrentUser();
      return;
    }

    list.forEach((item) => {
      const nextStatus = normalizeStatus(item.status);
      const prevStatus = previousBookingStatusById.get(item.id) || "";
      if (nextStatus !== prevStatus && (nextStatus === "approved" || nextStatus === "rejected" || nextStatus === "no_show")) {
        enqueueApprovalEvent(item);
      }
    });
    previousBookingStatusById = nextStatusById;
    flushApprovalEventsForCurrentUser();
  };


  const runMeetingReminders = () => {
    const nowMs = Date.now();
    const eligible = getReminderEligibleBookings(nowMs);
    if (!eligible.length) {
      setReminderBanner("");
      return;
    }

    const maxWindowMs = Math.max(...REMINDER_WINDOWS.map((item) => item.ms));
    const nearestInWindow = eligible
      .map((booking) => {
        const start = parseBookingStartDateTime(booking);
        if (!start) return null;
        const remainingMs = start.getTime() - nowMs;
        if (remainingMs <= 0 || remainingMs > maxWindowMs) return null;
        return { booking, remainingMs };
      })
      .filter(Boolean)
      .slice(0, 3);
    if (nearestInWindow.length) {
      setReminderBannerCards(
        nearestInWindow.map(({ booking, remainingMs }) => ({
          room: normalizeRoomDisplay(booking.roomId, booking.roomName),
          dateText: formatDate(booking.date),
          timeText: `${booking.startTime || "-"}-${booking.endTime || "-"}`,
          remainingText: formatRemaining(remainingMs)
        }))
      );
    } else {
      setReminderBanner("");
    }

    const reminderState = readReminderState();
    eligible.forEach((booking) => {
      const startAt = parseBookingStartDateTime(booking);
      if (!startAt) return;
      const remainingMs = startAt.getTime() - nowMs;
      if (remainingMs <= 0 || remainingMs > maxWindowMs) return;
      REMINDER_WINDOWS.forEach((windowItem) => {
        if (remainingMs > windowItem.ms) return;
        const token = buildReminderToken(booking, windowItem.key);
        if (reminderState[token]) return;
        maybeSendBrowserNotification(
          `เตือนการประชุม ${windowItem.label}`,
          `${formatReminderBookingLine(booking)} (${formatRemaining(remainingMs)})`
        );
        reminderState[token] = Date.now();
      });
    });
    writeReminderState(reminderState);
  };

  const startReminderTimer = () => {
    if (reminderIntervalId) {
      window.clearInterval(reminderIntervalId);
      reminderIntervalId = null;
    }
    runMeetingReminders();
    reminderIntervalId = window.setInterval(runMeetingReminders, REMINDER_INTERVAL_MS);
  };

  const setSecondaryFormVisibility = (sectionEl, buttonEl, visible) => {
    if (!sectionEl || !buttonEl) return;
    sectionEl.hidden = !visible;
    buttonEl.setAttribute("aria-expanded", visible ? "true" : "false");
  };

  const bindSecondaryFormToggles = () => {
    const hideAllSecondaryForms = () => {
      if (cancelSection && toggleCancelFormBtn) {
        setSecondaryFormVisibility(cancelSection, toggleCancelFormBtn, false);
      }
      if (rescheduleSection && toggleRescheduleFormBtn) {
        setSecondaryFormVisibility(rescheduleSection, toggleRescheduleFormBtn, false);
      }
    };
    hideAllSecondaryForms();

    if (cancelSection && toggleCancelFormBtn) {
      toggleCancelFormBtn.addEventListener("click", () => {
        const shouldOpen = cancelSection.hidden;
        hideAllSecondaryForms();
        if (shouldOpen) {
          setSecondaryFormVisibility(cancelSection, toggleCancelFormBtn, true);
        }
      });
    }
    if (rescheduleSection && toggleRescheduleFormBtn) {
      toggleRescheduleFormBtn.addEventListener("click", () => {
        const shouldOpen = rescheduleSection.hidden;
        hideAllSecondaryForms();
        if (shouldOpen) {
          setSecondaryFormVisibility(rescheduleSection, toggleRescheduleFormBtn, true);
        }
      });
    }
  };

  const ensureBookingListUI = () => {
    if (tableBody && listPanel) {
      return;
    }
    const bookingPage = document.querySelector('.page-view[data-page="meeting-room-booking"] .page');
    if (!bookingPage) return;
    const calendarPanelNode = document.getElementById("meetingRoomCalendarPanel");
    if (!calendarPanelNode) return;

    // Remove legacy view-toggle UI and keep calendar-only UX.
    const toolbar = document.getElementById("meetingRoomViewToggle");
    if (toolbar) toolbar.remove();
    if (viewCalendarBtn) viewCalendarBtn.remove();
    if (viewListBtn) viewListBtn.remove();

    const summary = document.getElementById("meetingRoomListSummary");
    if (summary) summary.remove();
    const legacyCount = document.getElementById("meetingRoomBookingCount");
    if (legacyCount) legacyCount.closest("#meetingRoomListSummary")?.remove();
    const legacyPending = document.getElementById("meetingRoomPendingCount");
    if (legacyPending) legacyPending.closest("#meetingRoomListSummary")?.remove();
    const legacyLatest = document.getElementById("meetingRoomLatestDate");
    if (legacyLatest) legacyLatest.closest("#meetingRoomListSummary")?.remove();

    let listPanelNode = document.getElementById("meetingRoomListPanel");
    if (!listPanelNode) {
      listPanelNode = document.createElement("div");
      listPanelNode.id = "meetingRoomListPanel";
      listPanelNode.className = "panel panel-hover section-appear section-delay-2";
      listPanelNode.style.display = "none";
      listPanelNode.innerHTML = `
        <div class="panel-header">
          <div>
            <div class="panel-title">รายการคำขอจองห้องประชุม</div>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>ผู้ขอ</th>
                  <th>วัตถุประสงค์</th>
                </tr>
              </thead>
              <tbody id="meetingRoomTableBody"></tbody>
            </table>
          </div>
        </div>
      `;
      calendarPanelNode.parentNode?.insertBefore(listPanelNode, calendarPanelNode.nextSibling);
    }

    viewCalendarBtn = null;
    viewListBtn = null;
    bookingCountEl = null;
    pendingCountEl = null;
    latestDateEl = null;
    listPanel = document.getElementById("meetingRoomListPanel");
    tableBody = document.getElementById("meetingRoomTableBody");
  };

  const buildStorageBooking = (item) => ({
    roomId: item.roomId || "",
    roomName: item.roomName || "",
    date: item.date || "",
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    requester: item.requester || "",
    requesterProfileType: normalizeRequesterProfileType(item.requesterProfileType || item.profileType),
    purpose: item.purpose || "",
    contactPhone: item.contactPhone || "",
    contactInfo: item.contactInfo || "",
    requesterEmail: (item.requesterEmail || "").toString().trim().toLowerCase(),
    projectMode: item.projectMode || DEFAULT_PROJECT_MODE,
    projectCode: item.projectCode || "",
    projectName: item.projectName || "",
    roomBookingAccess: normalizeRoomBookingAccess(item.roomBookingAccess),
    rescheduleBaseStatus: normalizeStatus(item.rescheduleBaseStatus),
    rescheduleRequestedRoomId: item.rescheduleRequestedRoomId || "",
    rescheduleRequestedRoomName: item.rescheduleRequestedRoomName || "",
    rescheduleRequestedDate: item.rescheduleRequestedDate || "",
    rescheduleRequestedStartTime: item.rescheduleRequestedStartTime || "",
    rescheduleRequestedEndTime: item.rescheduleRequestedEndTime || "",
    rescheduleRequestReason: item.rescheduleRequestReason || "",
    startAt: item.startAt || "",
    endAt: item.endAt || "",
    status: normalizeStatus(item.status)
  });

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
      if (item.status === "rejected" || item.status === "no_show") return false;
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

  let bookings = [];
  let unsubscribe = null;
  let unsubscribeRooms = null;
  let unsubscribeHolidays = null;
  let hasMigrated = false;
  let currentUserEmail = "";
  let hasVerifiedMeetingRoomStaffAccess = false;
  let activeDetailBookingId = "";
  let activeDetailOptions = {};
  let roomsLoaded = false;
  let bookingsLoaded = false;
  let roomsLoadFailed = false;
  let bookingsLoadFailed = false;
  let meetingStateEl = null;
  let activeDayModalDate = "";
  let autoRetryTimer = null;
  let autoRetryAttempt = 0;
  let activeMeetingProfile = null;
  let reminderIntervalId = null;
  let hasApprovalStatusBaseline = false;
  let previousBookingStatusById = new Map();
  let pendingApprovalEvents = [];
  const pendingApprovalEventKeys = new Set();

  const mapSnapshotDoc = (docItem) => {
    const data = docItem.data() || {};
    const roomId = data.roomId || "";
    const normalizedDbStatus = normalizeStatus(data.status);
    const derivedStatus =
      normalizedDbStatus === "rejected" && isNoShowReason(data.rejectionReason)
        ? "no_show"
        : normalizedDbStatus;
    const booking = {
      id: docItem.id,
      roomId,
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
      projectMode: data.projectMode || DEFAULT_PROJECT_MODE,
      projectCode: data.projectCode || "",
      projectName: data.projectName || "",
      roomBookingAccess: normalizeRoomBookingAccess(data.roomBookingAccess),
      rescheduleBaseStatus: normalizeStatus(data.rescheduleBaseStatus),
      rescheduleRequestedRoomId: data.rescheduleRequestedRoomId || "",
      rescheduleRequestedRoomName: data.rescheduleRequestedRoomName || "",
      rescheduleRequestedDate: data.rescheduleRequestedDate || "",
      rescheduleRequestedStartTime: data.rescheduleRequestedStartTime || "",
      rescheduleRequestedEndTime: data.rescheduleRequestedEndTime || "",
      rescheduleRequestReason: data.rescheduleRequestReason || "",
      status: derivedStatus,
      startAt: data.startAt || "",
      endAt: data.endAt || "",
      roomDisplay: normalizeRoomDisplay(roomId, data.roomName)
    };
    if (!booking.startAt && booking.date && booking.startTime) {
      booking.startAt = toDateTime(booking.date, booking.startTime).toISOString();
    }
    if (!booking.endAt && booking.date && booking.endTime) {
      booking.endAt = toDateTime(booking.date, booking.endTime).toISOString();
    }
    return booking;
  };

  const sortBookings = (list) => {
    return [...list].sort((a, b) => {
      const aTime = Number.isFinite(new Date(a.startAt).getTime()) ? new Date(a.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = Number.isFinite(new Date(b.startAt).getTime()) ? new Date(b.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
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
    projectMode: item.projectMode || DEFAULT_PROJECT_MODE,
    projectCode: item.projectCode || "",
    projectName: item.projectName || "",
    cancelBaseStatus: normalizeStatus(item.cancelBaseStatus),
    cancelRequestReason: item.cancelRequestReason || "",
    rescheduleBaseStatus: normalizeStatus(item.rescheduleBaseStatus),
    rescheduleRequestedRoomId: item.rescheduleRequestedRoomId || "",
    rescheduleRequestedRoomName: item.rescheduleRequestedRoomName || "",
    rescheduleRequestedDate: item.rescheduleRequestedDate || "",
    rescheduleRequestedStartTime: item.rescheduleRequestedStartTime || "",
    rescheduleRequestedEndTime: item.rescheduleRequestedEndTime || "",
    rescheduleRequestReason: item.rescheduleRequestReason || "",
    roomBookingAccess: normalizeRoomBookingAccess(item.roomBookingAccess)
  });

  const getAuditActor = () => {
    const authUser = window.sgcuAuth?.auth?.currentUser || null;
    const email = (authUser?.email || "").toString().trim().toLowerCase();
    return {
      actorUid: authUser?.uid || "",
      actorEmail: email,
      actorRole: isStaffUser() ? "staff" : "member"
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
      source: "web_app"
    });
  };

  const ensureMeetingStateEl = () => {
    if (meetingStateEl) return meetingStateEl;
    const panelBody = calendarPanelWrap?.querySelector(".panel-body");
    if (!panelBody) return null;
    meetingStateEl = document.createElement("div");
    meetingStateEl.id = "meetingRoomBookingState";
    meetingStateEl.className = "section-text-sm";
    meetingStateEl.hidden = true;
    meetingStateEl.style.marginBottom = "10px";
    panelBody.prepend(meetingStateEl);
    return meetingStateEl;
  };

  const retryMeetingSubscriptions = () => {
    resolveFirestoreBridge();
    if (!hasFirestore) {
      renderMeetingLoadState();
      return;
    }
    if (autoRetryTimer) {
      window.clearTimeout(autoRetryTimer);
      autoRetryTimer = null;
    }
    if (typeof unsubscribe === "function") unsubscribe();
    if (typeof unsubscribeRooms === "function") unsubscribeRooms();
    if (typeof unsubscribeHolidays === "function") unsubscribeHolidays();
    unsubscribe = null;
    unsubscribeRooms = null;
    unsubscribeHolidays = null;
    roomsLoaded = false;
    bookingsLoaded = false;
    roomsLoadFailed = false;
    bookingsLoadFailed = false;
    subscribeRooms();
    subscribeBookings();
    subscribeHolidays();
    renderMeetingLoadState();
  };

  const scheduleMeetingAutoRetry = () => {
    resolveFirestoreBridge();
    if (!hasFirestore) return;
    if (autoRetryTimer) return;
    const attempt = Math.min(autoRetryAttempt, 4);
    const delayMs = Math.min(12000, 1000 * (2 ** attempt));
    autoRetryAttempt += 1;
    autoRetryTimer = window.setTimeout(() => {
      autoRetryTimer = null;
      retryMeetingSubscriptions();
    }, delayMs);
  };

  const clearMeetingAutoRetry = () => {
    if (autoRetryTimer) {
      window.clearTimeout(autoRetryTimer);
      autoRetryTimer = null;
    }
    autoRetryAttempt = 0;
  };

  const renderMeetingLoadState = () => {
    const stateEl = ensureMeetingStateEl();
    if (!stateEl) return;
    if (!hasFirestore) {
      stateEl.hidden = false;
      stateEl.style.color = "#b91c1c";
      stateEl.innerHTML = "ระบบยังไม่เชื่อมต่อ Firestore โปรดตรวจสอบการตั้งค่า";
      return;
    }
    if (!roomsLoaded || !bookingsLoaded) {
      stateEl.hidden = false;
      stateEl.style.color = "#6b7280";
      stateEl.innerHTML = "กำลังโหลดข้อมูลการจองห้องประชุม...";
      return;
    }
    if (roomsLoadFailed || bookingsLoadFailed) {
      stateEl.hidden = false;
      stateEl.style.color = "#b91c1c";
      stateEl.innerHTML = `
        โหลดข้อมูลการจองไม่สำเร็จในขณะนี้
        <button id="meetingRoomRetryButton" type="button" class="btn-ghost" style="margin-left:8px;">ลองใหม่</button>
      `;
      const retryBtn = stateEl.querySelector("#meetingRoomRetryButton");
      if (retryBtn) retryBtn.addEventListener("click", retryMeetingSubscriptions);
      scheduleMeetingAutoRetry();
      return;
    }
    clearMeetingAutoRetry();
    stateEl.hidden = true;
    stateEl.innerHTML = "";
  };

  const renderRows = () => {
    const sorted = sortBookings(bookings);
    const now = Date.now();
    const total = sorted.length;
    const upcoming = sorted.filter((item) => new Date(item.startAt).getTime() >= now).length;
    const latest = sorted[sorted.length - 1];

    if (bookingCountEl) bookingCountEl.textContent = String(total);
    if (pendingCountEl) pendingCountEl.textContent = String(upcoming);
    if (latestDateEl) {
      latestDateEl.textContent = latest
        ? `อัปเดตล่าสุด: ${formatDate(latest.date)} ${latest.startTime || ""}-${latest.endTime || ""} (${formatRequesterDisplay(latest) || "ผู้จอง"})`
        : "ยังไม่มีข้อมูล";
    }

    if (tableBody) {
      if (!sorted.length) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5">ยังไม่มีการจอง</td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = sorted
          .map((item) => {
            const projectLine = item.projectMode === "project"
              ? `<div class="meeting-row-meta">โครงการ: ${escapeText(item.projectCode || "-")} ${item.projectName ? `(${escapeText(item.projectName)})` : ""}</div>`
              : "";
            const contactLine = item.contactPhone || item.contactInfo
              ? `<div class="meeting-row-meta">ติดต่อ: ${escapeText(item.contactPhone || "-")}${item.contactInfo ? ` / ${escapeText(item.contactInfo)}` : ""}</div>`
              : "";
            const rejectedLine = item.status === "rejected" && item.rejectionReason
              ? `<div class="meeting-row-meta">เหตุผลไม่อนุมัติ: ${escapeText(item.rejectionReason)}</div>`
              : "";
            return `
              <tr>
                <td>${escapeText(normalizeRoomDisplay(item.roomId, item.roomName))}</td>
                <td>${escapeText(formatDate(item.date))}</td>
                <td>${escapeText(item.startTime || "-")} - ${escapeText(item.endTime || "-")}</td>
                <td>${escapeText(formatRequesterDisplay(item))}</td>
                <td>
                  ${escapeText(item.purpose || "-")}${projectLine}${contactLine}${rejectedLine}
                </td>
              </tr>
            `;
          })
          .join("");
      }
    }

    renderCalendarOverview();
    renderOwnBookingOptions();
    updateManageActionUI();
    renderMeetingLoadState();
  };

  const readCurrentUserEmail = () => {
    const email = window.sgcuAuth?.auth?.currentUser?.email || "";
    return email.toString().trim().toLowerCase();
  };


  const parseBookingStartDateTime = (booking) => {
    const startAt = new Date(booking?.startAt || "");
    if (!Number.isNaN(startAt.getTime())) return startAt;
    const date = (booking?.date || "").toString().trim();
    const time = (booking?.startTime || "").toString().trim();
    if (!date || !time) return null;
    const parsed = toDateTime(date, time);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isUpcomingBooking = (booking, nowMs = Date.now()) => {
    const bookingStartAt = parseBookingStartDateTime(booking);
    if (!bookingStartAt) return false;
    return bookingStartAt.getTime() > nowMs;
  };

  const getNoShowRestriction = (emailValue) => {
    const email = (emailValue || "").toString().trim().toLowerCase();
    if (!email) return { restricted: false, noShowCount: 0, blockedUntil: null };
    const now = Date.now();
    const lookbackMs = NO_SHOW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const recent = bookings
      .filter((item) => {
        if (normalizeStatus(item.status) !== "no_show") return false;
        const requesterEmail = (item.requesterEmail || "").toString().trim().toLowerCase();
        if (!requesterEmail || requesterEmail !== email) return false;
        const startAt = parseBookingStartDateTime(item);
        if (!startAt) return false;
        return startAt.getTime() >= (now - lookbackMs);
      })
      .sort((a, b) => {
        const aTime = parseBookingStartDateTime(a)?.getTime() || 0;
        const bTime = parseBookingStartDateTime(b)?.getTime() || 0;
        return bTime - aTime;
      });
    if (recent.length < NO_SHOW_BLOCK_THRESHOLD) {
      return { restricted: false, noShowCount: recent.length, blockedUntil: null };
    }
    const latestStart = parseBookingStartDateTime(recent[0]);
    if (!latestStart) {
      return { restricted: false, noShowCount: recent.length, blockedUntil: null };
    }
    const blockedUntil = new Date(latestStart.getTime() + (NO_SHOW_BLOCK_DAYS * 24 * 60 * 60 * 1000));
    return {
      restricted: blockedUntil.getTime() > now,
      noShowCount: recent.length,
      blockedUntil
    };
  };

  const isStaffUser = () => {
    if (typeof staffAuthUser !== "undefined" && !!staffAuthUser) return true;
    const email = readCurrentUserEmail();
    if (!email) return false;
    if (typeof getStaffProfileByEmail === "function") {
      return !!getStaffProfileByEmail(email);
    }
    if (typeof staffEmails !== "undefined" && staffEmails instanceof Set) {
      return staffEmails.has(email);
    }
    return false;
  };

  const isVerifiedStaffProfileData = (data) => {
    if (!data || typeof data !== "object") return false;
    const stringPermissionFields = ["role", "positionCodeYY", "divisionCodeYY"];
    const listPermissionFields = [
      "positions",
      "allowedPages",
      "allowedPageIds",
      "allowedStaffPages",
      "staffPages",
      "pages",
      "pageAccess",
      "pagePermissions"
    ];
    const hasPermissionData =
      stringPermissionFields.some((field) => typeof data[field] === "string" && data[field].trim() !== "") ||
      listPermissionFields.some((field) => Array.isArray(data[field]) && data[field].length > 0);
    const positions = Array.isArray(data.positions) ? data.positions : [];
    const hasApprovalEvidence =
      !!data.approvedAt ||
      (typeof data.sourceApplicationId === "string" && data.sourceApplicationId.trim() !== "") ||
      positions.some((position) =>
        position && typeof position === "object" &&
        (!!position.approvedAt || (typeof position.sourceApplicationId === "string" && position.sourceApplicationId.trim() !== ""))
      );
    return hasPermissionData && hasApprovalEvidence;
  };

  const verifyMeetingRoomStaffAccess = async () => {
    const email = readCurrentUserEmail();
    hasVerifiedMeetingRoomStaffAccess = false;
    setupRoomOptions();
    if (!email) return false;
    if (email === "tuwanon.kimchiang@gmail.com" || email === "treasurer.sgcu68@gmail.com") {
      hasVerifiedMeetingRoomStaffAccess = true;
      setupRoomOptions();
      return true;
    }
    const firestoreBridge = window.sgcuFirestore || {};
    if (!firestoreBridge.db || !firestoreBridge.doc || !firestoreBridge.getDoc) return false;
    try {
      const ref = firestoreBridge.doc(firestoreBridge.db, STAFF_PROFILE_COLLECTION, email);
      const snap = await firestoreBridge.getDoc(ref);
      if (email !== readCurrentUserEmail()) return false;
      hasVerifiedMeetingRoomStaffAccess = snap?.exists() === true && isVerifiedStaffProfileData(snap.data());
      setupRoomOptions();
      return hasVerifiedMeetingRoomStaffAccess;
    } catch (_) {
      if (email === readCurrentUserEmail()) {
        hasVerifiedMeetingRoomStaffAccess = false;
        setupRoomOptions();
      }
      return false;
    }
  };

  const ownCancelableBookings = () => {
    if (!currentUserEmail) return [];
    const nowMs = Date.now();
    return sortBookings(bookings).filter((item) => {
      const status = (item.status || "").toString().toLowerCase();
      if (status === "rejected" || status === "cancel_requested" || status === "reschedule_requested" || status === "no_show") return false;
      const email = (item.requesterEmail || "").toString().trim().toLowerCase();
      if (!email || email !== currentUserEmail) return false;
      return isUpcomingBooking(item, nowMs);
    });
  };

  const ownReschedulableBookings = () => {
    if (!currentUserEmail) return [];
    const nowMs = Date.now();
    return sortBookings(bookings).filter((item) => {
      const status = (item.status || "").toString().toLowerCase();
      if (status === "rejected" || status === "cancel_requested" || status === "reschedule_requested" || status === "no_show") return false;
      const email = (item.requesterEmail || "").toString().trim().toLowerCase();
      if (!email || email !== currentUserEmail) return false;
      return isUpcomingBooking(item, nowMs);
    });
  };

  const renderOwnBookingOptions = () => {
    if (!cancelBookingSelect) return;
    const selected = cancelBookingSelect.value;
    const list = ownCancelableBookings();
    cancelBookingSelect.innerHTML = `
      <option value="">เลือกคำขอที่ต้องการจัดการ</option>
    `;
    list.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      const room = normalizeRoomDisplay(item.roomId, item.roomName);
      option.textContent = `${formatDate(item.date)} ${item.startTime || "-"}-${item.endTime || "-"} | ${room} | ${item.purpose || "-"}`;
      option.selected = selected === item.id;
      cancelBookingSelect.appendChild(option);
    });
    cancelBookingSelect.disabled = !currentUserEmail || !list.length;
    if (selected && !list.some((item) => item.id === selected)) {
      cancelBookingSelect.value = "";
    }
    if (!list.length) {
      cancelBookingSelect.value = "";
    }

    if (!rescheduleBookingSelect) return;
    const selectedReschedule = rescheduleBookingSelect.value;
    const rescheduleList = ownReschedulableBookings();
    rescheduleBookingSelect.innerHTML = `
      <option value="">เลือกรายการที่ต้องการขอเปลี่ยนห้อง/เวลา</option>
    `;
    rescheduleList.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      const room = normalizeRoomDisplay(item.roomId, item.roomName);
      option.textContent = `${formatDate(item.date)} ${item.startTime || "-"}-${item.endTime || "-"} | ${room} | ${item.purpose || "-"}`;
      option.selected = selectedReschedule === item.id;
      rescheduleBookingSelect.appendChild(option);
    });
    rescheduleBookingSelect.disabled = !currentUserEmail || !rescheduleList.length;
  };

  const renderManageBookingSummary = (booking) => {
    if (!manageBookingSummaryEl) return;
    if (!booking) {
      manageBookingSummaryEl.hidden = true;
      manageBookingSummaryEl.innerHTML = "";
      return;
    }
    const room = normalizeRoomDisplay(booking.roomId, booking.roomName);
    const date = formatDate(booking.date);
    const time = `${booking.startTime || "-"} - ${booking.endTime || "-"}`;
    const purpose = (booking.purpose || "-").toString();
    manageBookingSummaryEl.hidden = false;
    manageBookingSummaryEl.innerHTML = `
      <div class="meeting-manage-summary-kicker">คำขอที่เลือก</div>
      <div class="meeting-manage-summary-main">${escapeText(room)}</div>
      <div class="meeting-manage-summary-meta">
        <span>${escapeText(date)}</span>
        <span>${escapeText(time)}</span>
      </div>
      <div class="meeting-manage-summary-purpose">${escapeText(purpose)}</div>
    `;
  };

  const updateManageActionUI = () => {
    const action = (manageActionSelect?.value || "cancel").toString();
    const isReschedule = action === "reschedule";
    const booking = bookings.find((item) => item.id === (cancelBookingSelect?.value || ""));
    const hasBooking = Boolean(booking);
    if (manageRescheduleFields) manageRescheduleFields.hidden = !isReschedule;
    renderManageBookingSummary(booking);
    if (manageHelperEl) {
      if (!currentUserEmail) {
        manageHelperEl.textContent = "กรุณาเข้าสู่ระบบก่อนจัดการคำขอ";
      } else if (isReschedule) {
        manageHelperEl.textContent = "เลือกห้องหรือเวลาใหม่อย่างน้อย 1 รายการ แล้วระบุเหตุผลเพื่อส่งให้ Staff พิจารณา";
      } else {
        manageHelperEl.textContent = "คำขอยกเลิกจะเข้าสู่คิวรอ Staff อนุมัติ";
      }
    }
    if (manageSubmitBtn) {
      manageSubmitBtn.textContent = isReschedule ? "ส่งคำขอเปลี่ยนห้อง/เวลา" : "ส่งคำขอยกเลิก";
      manageSubmitBtn.disabled = !hasBooking;
    }
    if (cancelReasonInput) {
      cancelReasonInput.placeholder = isReschedule
        ? "ระบุเหตุผลที่ต้องการเปลี่ยนห้องหรือเวลา"
        : "ระบุเหตุผลที่ต้องการยกเลิก";
      cancelReasonInput.disabled = !hasBooking;
    }
    [rescheduleRoomSelect, rescheduleDateInput, rescheduleStartTimeInput, rescheduleEndTimeInput].forEach((el) => {
      if (!el) return;
      el.required = isReschedule;
      el.disabled = !isReschedule || !hasBooking;
    });
    if (!isReschedule) return;
    if (booking) {
      if (rescheduleRoomSelect && !rescheduleRoomSelect.value) rescheduleRoomSelect.value = booking.roomId || "";
      if (rescheduleDateInput && !rescheduleDateInput.value) rescheduleDateInput.value = booking.date || "";
      if (rescheduleStartTimeInput && !rescheduleStartTimeInput.value) rescheduleStartTimeInput.value = booking.startTime || "";
      if (rescheduleEndTimeInput && !rescheduleEndTimeInput.value) rescheduleEndTimeInput.value = booking.endTime || "";
    }
  };

  const getCalendarMonthState = (dateLike = new Date()) => {
    const cursorDate = new Date(dateLike);
    return {
      year: cursorDate.getFullYear(),
      month: cursorDate.getMonth(),
      firstDay: new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1)
    };
  };

  const startCalendar = () => {
    const baseDate = dateInput?.value ? new Date(`${dateInput.value}T00:00:00`) : new Date();
    calendarCursor = getCalendarMonthState(baseDate).firstDay;
  };

  const formatCalendarTitle = (dateLike) => {
    const current = new Date(dateLike.getFullYear(), dateLike.getMonth(), 1);
    return `${MONTH_NAMES_TH[current.getMonth()]} ${current.getFullYear()}`;
  };

  const getMeetingCalendarMaxEvents = () => {
    if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) return 2;
    if (window.matchMedia && window.matchMedia("(max-width: 860px)").matches) return 3;
    return 4;
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

  const refreshHolidayLookup = (customHolidays = []) => {
    holidayLookup = new Map(defaultHolidayLookup);
    customHolidays.forEach((item) => {
      if (!item?.date) return;
      const name = (item.name || "").toString().trim() || "วันหยุด";
      holidayLookup.set(item.date, name);
    });
  };

  const getHolidayName = (date, dateKey) => {
    const explicit = holidayLookup.get(dateKey);
    if (explicit) return explicit;
    const day = date.getDay();
    if (day === 0) return "วันหยุดสุดสัปดาห์";
    return "";
  };

  const safeStatus = (status) => {
    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";
    if (status === "cancel_requested") return "cancel_requested";
    if (status === "reschedule_requested") return "reschedule_requested";
    if (status === "no_show") return "no_show";
    return "pending";
  };

  const calendarStatusClass = (status) => {
    const normalized = safeStatus(status);
    if (normalized === "approved") return "approved";
    if (normalized === "rejected") return "cancelled";
    if (normalized === "cancel_requested" || normalized === "reschedule_requested" || normalized === "no_show") return "cancel-requested";
    return "pending";
  };

  const statusText = (status) => {
    const normalized = safeStatus(status);
    if (normalized === "approved") return "อนุมัติแล้ว";
    if (normalized === "rejected") return "ไม่อนุมัติ / ยกเลิกแล้ว";
    if (normalized === "cancel_requested") return "ขอยกเลิก (รออนุมัติ)";
    if (normalized === "reschedule_requested") return "ขอเปลี่ยนห้อง/เวลา (รออนุมัติ)";
    if (normalized === "no_show") return "ไม่มาใช้ห้อง (No-show)";
    return "รออนุมัติ";
  };

  const statusBadgeClass = (status) => {
    const normalized = safeStatus(status);
    if (normalized === "approved") return "badge-approved";
    if (normalized === "rejected") return "badge-rejected";
    if (normalized === "cancel_requested" || normalized === "reschedule_requested" || normalized === "no_show") return "badge-warning";
    return "badge-pending";
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
    return "is-pending";
  };

  const canEditBookingStatusInModal = (options = {}) => {
    if (!hasFirestore) return false;
    if (options.allowStatusEdit === true) return true;
    return isStaffUser();
  };

  const setBookingDetailStatusMessage = (text = "", color = "#374151") => {
    if (!bookingDetailBodyEl) return;
    const messageEl = bookingDetailBodyEl.querySelector("#meetingBookingDetailStatusMessage");
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.style.color = color;
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

  const applyStatusByIdFromModal = async (bookingId, nextStatus) => {
    if (!hasFirestore || !bookingId) return;
    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking) {
      setBookingDetailStatusMessage("ไม่พบรายการจองนี้", "#b91c1c");
      return;
    }
    if (!["pending", "approved", "rejected", "cancel_requested", "reschedule_requested", "no_show"].includes(nextStatus)) {
      setBookingDetailStatusMessage("สถานะที่เลือกไม่ถูกต้อง", "#b91c1c");
      return;
    }
    if (booking.status === nextStatus) {
      setBookingDetailStatusMessage("สถานะยังเหมือนเดิม", "#6b7280");
      return;
    }
    const payload = {
      status: nextStatus,
      updatedAt: firestore.serverTimestamp()
    };
    if (nextStatus === "no_show") {
      payload.status = "rejected";
      payload.rejectionReason = buildNoShowReason(booking.rejectionReason || "");
    }
    if (booking.status !== "reschedule_requested" && nextStatus === "rejected") {
      let rejectionReason = (await askRejectionReason(booking.rejectionReason || "")) || "";
      if (!rejectionReason) {
        setBookingDetailStatusMessage("กรุณาระบุเหตุผลที่ไม่อนุมัติ", "#b91c1c");
        return;
      }
      payload.rejectionReason = rejectionReason;
    }
    if (nextStatus !== "rejected" && nextStatus !== "no_show") {
      payload.rejectionReason = "";
    }
    if (booking.status === "cancel_requested" && nextStatus === "approved") {
      payload.status = normalizeStatus(booking.cancelBaseStatus || "approved");
      payload.cancelBaseStatus = "";
      payload.cancelRequestReason = "";
      payload.cancelRequestedAt = "";
      payload.cancelledByRequester = false;
    }
    if (booking.status === "cancel_requested" && nextStatus === "rejected") {
      payload.cancelBaseStatus = "";
      payload.cancelledByRequester = true;
      payload.cancelledAt = firestore.serverTimestamp();
    }
    if (booking.status === "reschedule_requested" && nextStatus === "approved") {
      const nextDate = booking.rescheduleRequestedDate || "";
      const nextStartTime = booking.rescheduleRequestedStartTime || "";
      const nextEndTime = booking.rescheduleRequestedEndTime || "";
      const nextRoomId = booking.rescheduleRequestedRoomId || booking.roomId;
      const nextRoomName = booking.rescheduleRequestedRoomName || normalizeRoomDisplay(nextRoomId, booking.roomName);
      if (!nextDate || !nextStartTime || !nextEndTime) {
        setBookingDetailStatusMessage("ไม่พบวัน/เวลาใหม่ที่ขอเปลี่ยน", "#b91c1c");
        return;
      }
      const candidate = {
        roomId: nextRoomId,
        roomName: nextRoomName,
        date: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime
      };
      if (hasOverlap(candidate, bookings, { ignoredBookingId: bookingId })) {
        const roomName = normalizeRoomDisplay(nextRoomId, nextRoomName);
        setBookingDetailStatusMessage(
          `อนุมัติเปลี่ยนห้อง/เวลาไม่ได้เพราะชนเวลา (${roomName} ${formatDate(nextDate)} ${nextStartTime}-${nextEndTime})`,
          "#b91c1c"
        );
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
    if (booking.status === "reschedule_requested" && nextStatus === "rejected") {
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
        firestore.doc(firestore.db, BOOKING_COLLECTION_NAME, bookingId),
        payload
      );
      await writeAuditLog(
        "booking.status_updated",
        "meetingRoomBooking",
        bookingId,
        pickBookingAuditFields(booking),
        pickBookingAuditFields({ ...booking, ...payload }),
        { context: "booking_detail_modal" }
      );
      setBookingDetailStatusMessage("อัปเดตสถานะคำขอเรียบร้อยแล้ว", "#047857");
    } catch (err) {
      const code = (err?.code || "").toString().trim();
      if (code === "permission-denied") {
        setBookingDetailStatusMessage(
          "ไม่มีสิทธิ์อัปเดตสถานะนี้ (ตรวจสอบสิทธิ์บัญชี Staff และ Firestore Rules)",
          "#b91c1c"
        );
        return;
      }
      setBookingDetailStatusMessage("ไม่สามารถอัปเดตสถานะคำขอได้ในขณะนี้", "#b91c1c");
    }
  };

  const setBookingDetailBody = (booking, options = {}) => {
    const includeContact = !!options.includeContact;
    const allowStatusEdit = canEditBookingStatusInModal(options);
    if (!bookingDetailBodyEl) return;
    if (!booking) {
      bookingDetailBodyEl.innerHTML = '<div class="section-text-sm">ไม่พบรายละเอียดรายการจอง</div>';
      return;
    }
    const projectText = booking.projectMode === "project"
      ? `${booking.projectCode || "-"}${booking.projectName ? ` (${booking.projectName})` : ""}`
      : "ประชุมทั่วไป";
    const cancelReason = booking.cancelRequestReason || "-";
    const rescheduleReason = booking.rescheduleRequestReason || "-";
    const rejectionReason = booking.rejectionReason || "-";
    const requestedDate = booking.rescheduleRequestedDate || "-";
    const requestedTime = booking.rescheduleRequestedDate
      ? `${booking.rescheduleRequestedStartTime || "-"} - ${booking.rescheduleRequestedEndTime || "-"}`
      : "-";
    const requestedRoom = booking.rescheduleRequestedRoomId
      ? normalizeRoomDisplay(booking.rescheduleRequestedRoomId, booking.rescheduleRequestedRoomName)
      : "-";
    const contactText = [booking.contactPhone, booking.contactInfo]
      .filter((value) => (value || "").toString().trim())
      .join(" / ") || "-";
    const roomText = normalizeRoomDisplay(booking.roomId, booking.roomName);
    const dateText = formatDate(booking.date);
    const timeText = `${booking.startTime || "-"} - ${booking.endTime || "-"}`;
    const rows = [
      ["ผู้ขอ", formatRequesterDisplay(booking)],
      ["ประเภทคำขอ", projectText],
      ["วัตถุประสงค์", booking.purpose || "-"]
    ];
    if (includeContact) {
      rows.push(["ข้อมูลติดต่อ", contactText]);
    }
    if (cancelReason !== "-") rows.push(["เหตุผลขอยกเลิก", cancelReason]);
    if (rejectionReason !== "-") rows.push(["เหตุผลไม่อนุมัติ", rejectionReason]);
    if (requestedRoom !== "-") rows.push(["ห้องใหม่ที่ขอ", requestedRoom]);
    if (requestedDate !== "-") rows.push(["วันที่ใหม่ที่ขอ", formatDate(requestedDate)]);
    if (requestedTime !== "-") rows.push(["เวลาใหม่ที่ขอ", requestedTime]);
    if (rescheduleReason !== "-") rows.push(["เหตุผลขอเปลี่ยนห้อง/เวลา", rescheduleReason]);
    const selectOptions = [
      "pending",
      "approved",
      "rejected",
      "cancel_requested",
      "no_show",
      ...(booking.status === "reschedule_requested" ? ["reschedule_requested"] : [])
    ];
    bookingDetailBodyEl.innerHTML = `
      <div class="meeting-booking-detail-shell">
        <div class="meeting-booking-detail-summary">
          <div class="meeting-booking-summary-item">
            <div class="meeting-booking-summary-label">ห้องประชุม</div>
            <div class="meeting-booking-summary-value">${escapeText(roomText)}</div>
          </div>
          <div class="meeting-booking-summary-item">
            <div class="meeting-booking-summary-label">วันที่</div>
            <div class="meeting-booking-summary-value">${escapeText(dateText)}</div>
          </div>
          <div class="meeting-booking-summary-item">
            <div class="meeting-booking-summary-label">เวลา</div>
            <div class="meeting-booking-summary-value">${escapeText(timeText)}</div>
          </div>
          <div class="meeting-booking-summary-item">
            <div class="meeting-booking-summary-label">สถานะ</div>
            <div class="meeting-booking-summary-value">
              <span class="status-pill ${statusBadgeClass(booking.status)}">${escapeText(statusText(booking.status))}</span>
            </div>
          </div>
        </div>
        <div class="meeting-booking-detail-grid">
          ${rows.map(([label, value]) => `
            <div class="meeting-booking-detail-item">
              <div class="meeting-booking-detail-label">${escapeText(label)}</div>
              <div class="meeting-booking-detail-value">${escapeText(value)}</div>
            </div>
          `).join("")}
        </div>
      </div>
      ${allowStatusEdit
        ? `
          <div class="modal-actions">
            <select
              id="meetingBookingDetailStatusSelect"
              class="staff-status-select ${statusSelectClass(booking.status)}"
              aria-label="ปรับสถานะคำขอ"
            >
              ${selectOptions.map((statusValue) => `
                <option value="${statusValue}" ${booking.status === statusValue ? "selected" : ""}>
                  ${getStatusOptionLabel(statusValue, booking.status)}
                </option>
              `).join("")}
            </select>
            <button id="meetingBookingDetailStatusApply" type="button" class="btn-primary">บันทึกสถานะ</button>
          </div>
          <div id="meetingBookingDetailStatusMessage" class="section-text-sm" aria-live="polite"></div>
        `
        : ""
      }
    `;
  };

  const openBookingDetailModal = (bookingOrId, options = {}) => {
    const booking = typeof bookingOrId === "string"
      ? bookings.find((item) => item.id === bookingOrId)
      : bookingOrId;
    if (bookingDetailTitleEl) {
      bookingDetailTitleEl.textContent = "รายละเอียดการจองห้องประชุม";
    }
    activeDetailBookingId = booking?.id || "";
    activeDetailOptions = options || {};
    setBookingDetailBody(booking || null, options);
    if (bookingDetailModalEl && typeof openDialog === "function") {
      openDialog(bookingDetailModalEl, { focusSelector: "#meetingBookingDetailClose" });
    }
  };

  const openDayBookingListModal = (dateText, options = {}) => {
    if (!bookingDetailBodyEl) return;
    const sourceBookings = Array.isArray(options.sourceBookings) ? options.sourceBookings : bookings;
    const titlePrefix = (options.titlePrefix || "รายการจองวันที่").toString().trim() || "รายการจองวันที่";
    const dayBookings = sortBookings(sourceBookings).filter((item) => item.date === dateText);
    if (bookingDetailTitleEl) {
      bookingDetailTitleEl.textContent = `${titlePrefix} ${formatDate(dateText)}`;
    }
    activeDetailBookingId = "";
    activeDetailOptions = {};
    if (!dayBookings.length) {
      bookingDetailBodyEl.innerHTML = '<div class="section-text-sm">ยังไม่มีรายการจองในวันนี้</div>';
    } else {
      bookingDetailBodyEl.innerHTML = `
        <div class="meeting-day-list-summary">
          <span class="meeting-day-list-count">ทั้งหมด ${dayBookings.length} รายการ</span>
        </div>
        <div class="meeting-day-list">
          ${dayBookings.map((item, index) => `
            <div class="meeting-day-list-card">
              <div class="meeting-day-list-card-head">
                <div class="meeting-day-list-card-index">รายการ ${index + 1}</div>
                <span class="badge ${statusBadgeClass(item.status)}">${escapeText(statusText(item.status))}</span>
              </div>
              <div class="meeting-day-list-card-main">
                <div class="meeting-day-list-time">${escapeText(`${item.startTime || "-"} - ${item.endTime || "-"}`)}</div>
                <div class="meeting-day-list-room">${escapeText(normalizeRoomDisplay(item.roomId, item.roomName))}</div>
              </div>
              <div class="meeting-day-list-meta">
                <div class="meeting-day-list-meta-row">
                  <span class="meeting-day-list-meta-label">ผู้ขอ</span>
                  <span class="meeting-day-list-meta-value">${escapeText(formatRequesterDisplay(item))}</span>
                </div>
                <div class="meeting-day-list-meta-row">
                  <span class="meeting-day-list-meta-label">วัตถุประสงค์</span>
                  <span class="meeting-day-list-meta-value">${escapeText(item.purpose || "-")}</span>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }
    if (bookingDetailModalEl && typeof openDialog === "function") {
      openDialog(bookingDetailModalEl, { focusSelector: "#meetingBookingDetailClose" });
    }
  };

  const closeBookingDetailModal = () => {
    activeDetailBookingId = "";
    activeDetailOptions = {};
    if (bookingDetailModalEl && typeof closeDialog === "function") {
      closeDialog(bookingDetailModalEl);
    }
  };

  const getDayBookings = (dateText = "") => {
    if (!dateText) return [];
    return sortBookings(bookings.filter((item) => item.date === dateText));
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

  const setBookingDayBody = (dateText = "") => {
    if (!bookingDayModalBodyEl || !bookingDayModalTitleEl) return;
    const items = getDayBookings(dateText);
    bookingDayModalTitleEl.textContent = `รายการจองวันที่ ${formatLongDate(dateText)} (${items.length} รายการ)`;
    if (!items.length) {
      bookingDayModalBodyEl.innerHTML = '<div class="section-text-sm">ไม่มีรายการจองในวันที่เลือก</div>';
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
              <tr data-booking-id="${escapeText(item.id || "")}">
                <td data-label="เวลา">${escapeText(`${item.startTime || "-"} - ${item.endTime || "-"}`)}</td>
                <td data-label="ห้อง">${escapeText(normalizeRoomDisplay(item.roomId, item.roomName))}</td>
                <td data-label="ผู้ขอ">${escapeText(formatRequesterDisplay(item))}</td>
                <td data-label="วัตถุประสงค์">${escapeText(item.purpose || "-")}${item.status === "rejected" && item.rejectionReason ? `<div class="meeting-row-meta">เหตุผลไม่อนุมัติ: ${escapeText(item.rejectionReason)}</div>` : ""}</td>
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

  const openBookingDayModal = (dateText = "") => {
    if (!dateText || !bookingDayModalEl || typeof openDialog !== "function") return;
    activeDayModalDate = dateText;
    setBookingDayBody(dateText);
    openDialog(bookingDayModalEl, { focusSelector: "#meetingBookingDayClose" });
  };

  const closeBookingDayModal = () => {
    activeDayModalDate = "";
    if (bookingDayModalEl && typeof closeDialog === "function") {
      closeDialog(bookingDayModalEl);
    }
  };

  const setCalendarCursorFromDate = (dateText = "") => {
    if (!dateText) return;
    const parsed = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    calendarCursor = calendarDisplayMode === "week" ? parsed : getCalendarMonthState(parsed).firstDay;
  };

  const updateMeetingRoomView = (mode = "calendar") => {
    meetingRoomActiveView = "calendar";

    if (calendarPanelWrap) {
      calendarPanelWrap.style.display = "";
    }
    if (listPanel) {
      listPanel.style.display = "none";
    }

    renderCalendarOverview();
  };

  const escapeText = (text) => {
    const safe = String(text || "");
    return safe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  };

  const renderCalendarOverview = () => {
    if (!calendarPanel) return;

    const selectedMonthStart = getCalendarMonthState(calendarCursor);
    const weekStart = new Date(calendarCursor);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const periodStart = calendarDisplayMode === "week" ? weekStart : selectedMonthStart.firstDay;
    const periodEnd = calendarDisplayMode === "week"
      ? weekEnd
      : new Date(selectedMonthStart.year, selectedMonthStart.month + 1, 0);
    const periodBookings = bookings
      .filter((item) => {
        if (!item.date || item.status === "rejected") return false;
        if (calendarRoomFilterValue !== "all" && item.roomId !== calendarRoomFilterValue) return false;
        const date = new Date(`${item.date}T00:00:00`);
        if (Number.isNaN(date.getTime())) return false;
        return date >= periodStart && date <= periodEnd;
      })
      .reduce((acc, item) => {
        if (!acc[item.date]) acc[item.date] = [];
        acc[item.date].push(item);
        return acc;
      }, {});

    Object.values(periodBookings).forEach((items) => {
      items.sort((a, b) => {
        const at = a.startTime || "00:00";
        const bt = b.startTime || "00:00";
        return at.localeCompare(bt);
      });
    });

    if (calendarTitle) {
      calendarTitle.textContent = calendarDisplayMode === "week"
        ? `สัปดาห์ ${weekStart.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}  –  ${weekEnd.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
        : formatCalendarTitle(selectedMonthStart.firstDay);
    }
    const todayKey = toDateKey(new Date());
    const maxEvents = getMeetingCalendarMaxEvents();
    const cells = [];

    if (calendarDisplayMode === "month") {
      for (let i = 0; i < selectedMonthStart.firstDay.getDay(); i++) {
        cells.push(`<div class="calendar-day calendar-day-empty"></div>`);
      }
    }

    const datesToRender = [];
    if (calendarDisplayMode === "week") {
      for (let offset = 0; offset < 7; offset++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + offset);
        datesToRender.push(date);
      }
    } else {
      const daysInMonth = new Date(selectedMonthStart.year, selectedMonthStart.month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        datesToRender.push(new Date(selectedMonthStart.year, selectedMonthStart.month, day));
      }
    }

    datesToRender.forEach((date) => {
      const day = date.getDate();
      const dateKey = toDateKey(date);
      const items = periodBookings[dateKey] || [];
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
          <div class="calendar-day-header">
            ${day}${todayBadge}${holidayBadge}
          </div>
          ${eventRows}
          ${moreText}
        </div>
      `);
    });

    calendarPanel.classList.toggle("is-week-view", calendarDisplayMode === "week");
    calendarPanel.innerHTML = cells.join("");
  };

  const normalizeLocalPayload = (item, overrides = {}) => ({
    ...buildStorageBooking(item),
    ...overrides
  });

  const migrateLocalStorageToFirestore = async () => {
    if (!hasFirestore || hasMigrated) return;
    hasMigrated = true;
    const already = window.localStorage?.getItem(LOCAL_MIGRATED_KEY) === "1";
    if (already) return;

    if (bookings.length > 0) {
      window.localStorage?.setItem(LOCAL_MIGRATED_KEY, "1");
      return;
    }

    try {
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (!raw) {
        window.localStorage?.setItem(LOCAL_MIGRATED_KEY, "1");
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) {
        window.localStorage?.setItem(LOCAL_MIGRATED_KEY, "1");
        return;
      }

      for (const item of parsed) {
        const payload = normalizeLocalPayload(item);
        if (!payload.roomId || !payload.date || !payload.startTime || !payload.endTime || !payload.requester || !payload.purpose) {
          continue;
        }
        const room = normalizeRoomDisplay(payload.roomId, payload.roomName);
        await firestore.addDoc(
          firestore.collection(firestore.db, BOOKING_COLLECTION_NAME),
          {
            roomId: payload.roomId,
            roomName: room,
            date: payload.date,
            startTime: payload.startTime,
            endTime: payload.endTime,
            requester: payload.requester,
            requesterProfileType: normalizeRequesterProfileType(payload.requesterProfileType || payload.profileType),
            requesterEmail: payload.requesterEmail || "",
            purpose: payload.purpose,
            contactPhone: payload.contactPhone || "",
            contactInfo: payload.contactInfo || "",
            projectMode: payload.projectMode || DEFAULT_PROJECT_MODE,
            projectCode: payload.projectCode || "",
            projectName: payload.projectName || "",
            roomBookingAccess: normalizeRoomBookingAccess(payload.roomBookingAccess),
            rescheduleBaseStatus: normalizeStatus(payload.rescheduleBaseStatus),
            rescheduleRequestedRoomId: payload.rescheduleRequestedRoomId || "",
            rescheduleRequestedRoomName: payload.rescheduleRequestedRoomName || "",
            rescheduleRequestedDate: payload.rescheduleRequestedDate || "",
            rescheduleRequestedStartTime: payload.rescheduleRequestedStartTime || "",
            rescheduleRequestedEndTime: payload.rescheduleRequestedEndTime || "",
            rescheduleRequestReason: payload.rescheduleRequestReason || "",
            status: normalizeStatus(payload.status),
            startAt: payload.startAt || toDateTime(payload.date, payload.startTime).toISOString(),
            endAt: payload.endAt || toDateTime(payload.date, payload.endTime).toISOString(),
            createdAt: firestore.serverTimestamp(),
            updatedAt: firestore.serverTimestamp(),
            migratedFromLocal: true
          }
        );
      }

      window.localStorage?.setItem(LOCAL_MIGRATED_KEY, "1");
    } catch (err) {
      // keep key untouched if migrate fails so user can retry
      hasMigrated = false;
    }
  };

  const setupRoomOptions = () => {
    const selectedRoomId = roomSelect.value;
    // Fail closed: staff-only rooms stay hidden until the auth layer explicitly
    // confirms that the current account has staff access.
    const canSeeStaffOnlyRooms = hasVerifiedMeetingRoomStaffAccess === true;
    const selectableRooms = meetingRooms.filter((room) =>
      normalizeRoomBookingAccess(room.bookingAccess) !== "staff_only" || canSeeStaffOnlyRooms
    );
    roomSelect.innerHTML = `
      <option value="" disabled ${selectedRoomId ? "" : "selected"}>เลือกห้องประชุม</option>
    `;
    selectableRooms.forEach((room) => {
      const bookingAccess = normalizeRoomBookingAccess(room.bookingAccess);
      const isStaffOnly = bookingAccess === "staff_only";
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = isStaffOnly ? `${room.name} (สตาฟจองเท่านั้น)` : room.name;
      option.selected = selectedRoomId === room.id;
      roomSelect.appendChild(option);
    });
    if (selectedRoomId && !selectableRooms.some((room) => room.id === selectedRoomId)) {
      roomSelect.value = "";
    }
    if (rescheduleRoomSelect) {
      const selectedRescheduleRoomId = rescheduleRoomSelect.value;
      rescheduleRoomSelect.innerHTML = `
        <option value="" disabled ${selectedRescheduleRoomId ? "" : "selected"}>เลือกห้องประชุม</option>
      `;
      selectableRooms.forEach((room) => {
        const bookingAccess = normalizeRoomBookingAccess(room.bookingAccess);
        const isStaffOnly = bookingAccess === "staff_only";
        const option = document.createElement("option");
        option.value = room.id;
        option.textContent = isStaffOnly ? `${room.name} (สตาฟจองเท่านั้น)` : room.name;
        option.selected = selectedRescheduleRoomId === room.id;
        rescheduleRoomSelect.appendChild(option);
      });
      if (selectedRescheduleRoomId && !selectableRooms.some((room) => room.id === selectedRescheduleRoomId)) {
        rescheduleRoomSelect.value = "";
      }
    }
    if (calendarRoomFilter) {
      const previousFilter = calendarRoomFilterValue;
      calendarRoomFilter.innerHTML = '<option value="all">ห้องประชุม: ทุกห้อง</option>';
      selectableRooms.forEach((room) => {
        const option = document.createElement("option");
        option.value = room.id;
        option.textContent = room.name;
        calendarRoomFilter.appendChild(option);
      });
      calendarRoomFilterValue = selectableRooms.some((room) => room.id === previousFilter)
        ? previousFilter
        : "all";
      calendarRoomFilter.value = calendarRoomFilterValue;
    }
  };

  const subscribeRooms = () => {
    if (!hasFirestore) {
      roomsLoaded = true;
      roomsLoadFailed = true;
      setupRoomOptions();
      renderRows();
      return;
    }
    try {
      const colRef = firestore.collection(firestore.db, ROOM_COLLECTION_NAME);
      unsubscribeRooms = firestore.onSnapshot(
        colRef,
        (snapshot) => {
          const loadedRooms = snapshot.docs
            .map((docItem) => {
              const data = docItem.data() || {};
              const name = (data.name || "").toString().trim();
              if (!name) return null;
              return {
                id: docItem.id,
                name,
                bookingAccess: normalizeRoomBookingAccess(data.bookingAccess)
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name, "th"));
          meetingRooms = loadedRooms.length ? loadedRooms : [...DEFAULT_MEETING_ROOMS];
          roomsLoaded = true;
          roomsLoadFailed = false;
          setupRoomOptions();
          renderRows();
          renderCalendarOverview();
        },
        (err) => {
          const code = (err?.code || "").toString().trim();
          const currentUserEmail = readCurrentUserEmail();
          if (code === "permission-denied" && !currentUserEmail) {
            roomsLoaded = false;
            roomsLoadFailed = false;
            setMessage("กำลังตรวจสอบสิทธิ์การเข้าถึงข้อมูล...", "#6b7280");
            renderMeetingLoadState();
            scheduleMeetingAutoRetry();
            return;
          }
          meetingRooms = [...DEFAULT_MEETING_ROOMS];
          roomsLoaded = true;
          roomsLoadFailed = true;
          setupRoomOptions();
          renderRows();
          renderCalendarOverview();
          scheduleMeetingAutoRetry();
        }
      );
    } catch (err) {
      meetingRooms = [...DEFAULT_MEETING_ROOMS];
      roomsLoaded = true;
      roomsLoadFailed = true;
      setupRoomOptions();
      renderRows();
      renderCalendarOverview();
      scheduleMeetingAutoRetry();
    }
  };

  const setMinDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateInput.min = today.toISOString().slice(0, 10);
    if (!dateInput.value) {
      dateInput.value = dateInput.min;
    }
    if (rescheduleDateInput) {
      rescheduleDateInput.min = dateInput.min;
    }
  };

  const subscribeBookings = () => {
    if (!hasFirestore) {
      bookingsLoaded = true;
      bookingsLoadFailed = true;
      renderMeetingLoadState();
      return;
    }
    try {
      const colRef = firestore.collection(firestore.db, BOOKING_COLLECTION_NAME);
      const windowRange = getBookingQueryWindow();
      const bookingQuery = firestore.query(
        colRef,
        firestore.where("date", ">=", windowRange.start),
        firestore.where("date", "<=", windowRange.end),
        firestore.orderBy("date", "asc")
      );
      unsubscribe = firestore.onSnapshot(
        bookingQuery,
        (snapshot) => {
          bookings = snapshot.docs.map(mapSnapshotDoc);
          syncApprovalNotifications(bookings);
          bookingsLoaded = true;
          bookingsLoadFailed = false;
          renderRows();
          runMeetingReminders();
          if (activeDayModalDate) {
            setBookingDayBody(activeDayModalDate);
          }
          if (!window.localStorage?.getItem(LOCAL_MIGRATED_KEY) && !hasMigrated) {
            void migrateLocalStorageToFirestore();
          }
        },
        (err) => {
          const code = (err?.code || "").toString().trim();
          const currentUserEmail = readCurrentUserEmail();
          if (code === "permission-denied" && !currentUserEmail) {
            bookingsLoaded = false;
            bookingsLoadFailed = false;
            setMessage("กำลังตรวจสอบสิทธิ์การเข้าถึงข้อมูล...", "#6b7280");
            renderMeetingLoadState();
            scheduleMeetingAutoRetry();
            return;
          }
          bookingsLoaded = true;
          bookingsLoadFailed = true;
          setMessage("เกิดปัญหาการดึงข้อมูลการจอง", "#b91c1c");
          renderMeetingLoadState();
          scheduleMeetingAutoRetry();
        }
      );
    } catch (err) {
      bookingsLoaded = true;
      bookingsLoadFailed = true;
      setMessage("ไม่สามารถเชื่อมต่อ Firestore ได้", "#b91c1c");
      renderMeetingLoadState();
      scheduleMeetingAutoRetry();
    }
  };

  const subscribeHolidays = () => {
    if (!hasFirestore) return;
    try {
      const colRef = firestore.collection(firestore.db, HOLIDAY_COLLECTION_NAME);
      const q = firestore.query(colRef, firestore.orderBy("date", "asc"));
      unsubscribeHolidays = firestore.onSnapshot(
        q,
        (snapshot) => {
          const custom = snapshot.docs
            .map((docItem) => {
              const data = docItem.data() || {};
              const date = (data.date || "").toString().trim();
              if (!date) return null;
              return {
                date,
                name: (data.name || "วันหยุด").toString().trim() || "วันหยุด"
              };
            })
            .filter(Boolean);
          refreshHolidayLookup(custom);
          renderCalendarOverview();
        },
        () => {
          refreshHolidayLookup([]);
          renderCalendarOverview();
        }
      );
    } catch (err) {
      refreshHolidayLookup([]);
      renderCalendarOverview();
    }
  };

  const submitBooking = async () => {
    const roomId = roomSelect.value;
    const date = dateInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const purpose = purposeInput.value.trim();
    const meetingProfile = await getMeetingProfileForSubmit();
    const requester = meetingProfile
      ? [meetingProfile.firstName, meetingProfile.lastName].filter(Boolean).join(" ")
      : "";
    const requesterProfileType = normalizeRequesterProfileType(meetingProfile?.profileType || window.currentUserProfileType || "student");
    const contactPhone = (meetingProfile?.phone || "").toString().trim();
    const contactInfo = (meetingProfile?.lineId || "").toString().trim();
    const projectMode = (document.getElementById("meetingProjectMode")?.value || DEFAULT_PROJECT_MODE).toString();
    const projectCode = projectMode === "project"
      ? (document.getElementById("meetingProjectCode")?.value || "").trim()
      : "";
    let projectName = "";
    const roomBookingAccess = getRoomBookingAccess(roomId);

    if (!roomsLoaded || !bookingsLoaded || roomsLoadFailed || bookingsLoadFailed) {
      setMessage("ข้อมูลการจองยังไม่พร้อมตรวจสอบเวลา กรุณารอสักครู่แล้วลองใหม่", "#b91c1c");
      return;
    }

    if (!meetingProfile) {
      setMessage("ไม่พบข้อมูลผู้ขอ กรุณาบันทึกข้อมูลที่หน้าเข้าสู่ระบบก่อน", "#b91c1c");
      return;
    }
    if (!roomId || !date || !startTime || !endTime || !requester || !purpose) {
      setMessage("กรุณากรอกข้อมูลให้ครบถ้วนก่อนทำรายการจอง", "#b91c1c");
      return;
    }
    if (roomBookingAccess === "staff_only" && !isStaffUser()) {
      setMessage("ห้องที่เลือกเปิดให้สตาฟจองเท่านั้น", "#b91c1c");
      return;
    }
    if (!contactPhone && !contactInfo) {
      setMessage("กรุณาใส่ข้อมูลติดต่ออย่างน้อยช่องทางหนึ่ง", "#b91c1c");
      return;
    }
    if (projectMode === "project" && !projectCode) {
      setMessage("กรุณาใส่รหัสโครงการ", "#b91c1c");
      return;
    }
    if (projectMode === "project") {
      const project = await getProjectByCode(projectCode);
      if (!project) {
        setMessage("ไม่พบรหัสโครงการนี้ กรุณากรอกรหัสใหม่", "#b91c1c");
        if (projectCodeInput) {
          projectCodeInput.focus();
        }
        showProjectError("ไม่พบรหัสโครงการนี้ กรุณากรอกรหัสใหม่");
        return;
      }
      projectName = (project.name || "").trim();
      showProjectSuccess(project);
    } else {
      clearProjectFeedback();
    }

    const startAt = toDateTime(date, startTime);
    const endAt = toDateTime(date, endTime);
    const now = new Date();
    const earliestAllowed = new Date(now.getTime() - (60 * 60 * 1000));
    const latestAllowed = new Date(now);
    latestAllowed.setMonth(latestAllowed.getMonth() + 1);
    const allowLongAdvanceBooking = isStaffUser();
    if (!(startAt < endAt)) {
      setMessage("กรุณากำหนดเวลาเริ่มต้นให้ก่อนเวลาสิ้นสุด", "#b91c1c");
      return;
    }
    if (startAt < earliestAllowed) {
      setMessage("จองย้อนหลังได้ไม่เกิน 1 ชั่วโมง", "#b91c1c");
      return;
    }
    if (!allowLongAdvanceBooking && startAt > latestAllowed) {
      setMessage("จองล่วงหน้าได้ไม่เกิน 1 เดือน", "#b91c1c");
      return;
    }
    const restriction = getNoShowRestriction(readCurrentUserEmail());
    if (!isStaffUser() && restriction.restricted) {
      const blockedUntilText = restriction.blockedUntil
        ? restriction.blockedUntil.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })
        : "-";
      setMessage(
        `บัญชีนี้ถูกจำกัดสิทธิ์ชั่วคราวจากประวัติ No-show (${restriction.noShowCount} ครั้ง) ใช้งานใหม่ได้หลัง ${blockedUntilText}`,
        "#b91c1c"
      );
      return;
    }

    const candidate = {
      roomId,
      roomName: normalizeRoomDisplay(roomId, ""),
      date,
      startTime,
      endTime,
      requester,
      requesterProfileType,
      purpose,
      contactPhone,
      contactInfo,
      projectMode,
      projectCode,
      projectName,
      roomBookingAccess,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      status: "pending"
    };

    if (hasOverlap(candidate, bookings)) {
      setMessage("ช่วงเวลานี้ของห้องที่เลือกมีการจองทับซ้อน", "#b91c1c");
      return;
    }

    if (!hasFirestore) {
      setMessage("ระบบยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }

    try {
      const createdDoc = await firestore.addDoc(firestore.collection(firestore.db, BOOKING_COLLECTION_NAME), {
        roomId: candidate.roomId,
        roomName: candidate.roomName,
        date,
        startTime,
        endTime,
        requester,
        requesterProfileType,
        purpose,
        contactPhone,
        contactInfo,
        requesterEmail: readCurrentUserEmail(),
        projectMode,
        projectCode,
        projectName,
        roomBookingAccess,
        status: "pending",
        startAt: candidate.startAt,
        endAt: candidate.endAt,
        createdAt: firestore.serverTimestamp(),
        updatedAt: firestore.serverTimestamp()
      });
      await writeAuditLog(
        "booking.created",
        "meetingRoomBooking",
        createdDoc?.id || "",
        null,
        pickBookingAuditFields({
          ...candidate,
          id: createdDoc?.id || "",
          requesterEmail: readCurrentUserEmail()
        }),
        { context: "booking_form" }
      );
      form.reset();
      clearProjectFeedback();
      setMessage("บันทึกการจองเรียบร้อยแล้ว", "#047857");
      setTimeout(() => {
        if (messageEl && messageEl.style.color === "rgb(4, 120, 87)") {
          setMessage("");
        }
      }, 2500);
    } catch (err) {
      setMessage("ไม่สามารถบันทึกคำขอจองได้ในขณะนี้", "#b91c1c");
    }
  };

  const cancelOwnBooking = async () => {
    const bookingId = (cancelBookingSelect?.value || "").trim();
    const cancelReason = (cancelReasonInput?.value || "").trim();
    if (!bookingId) {
      setCancelMessage("กรุณาเลือกรายการที่ต้องการยกเลิก", "#b91c1c");
      return;
    }
    if (!cancelReason) {
      setCancelMessage("กรุณาระบุเหตุผลการขอยกเลิก", "#b91c1c");
      return;
    }
    currentUserEmail = readCurrentUserEmail();
    if (!currentUserEmail) {
      setCancelMessage("กรุณาเข้าสู่ระบบก่อนยกเลิกคำขอ", "#b91c1c");
      return;
    }
    if (!hasFirestore) {
      setCancelMessage("ระบบยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }

    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking) {
      setCancelMessage("ไม่พบคำขอที่เลือก", "#b91c1c");
      return;
    }
    if ((booking.requesterEmail || "").toLowerCase() !== currentUserEmail) {
      setCancelMessage("อีเมลที่ใช้งานไม่ตรงกับผู้จองรายการนี้", "#b91c1c");
      return;
    }
    if (booking.status === "rejected") {
      setCancelMessage("คำขอนี้ถูกยกเลิก/ปฏิเสธไปแล้ว", "#6b7280");
      return;
    }
    if (booking.status === "no_show") {
      setCancelMessage("คำขอนี้ถูกบันทึกเป็น No-show แล้ว", "#6b7280");
      return;
    }
    if (booking.status === "cancel_requested") {
      setCancelMessage("คำขอนี้ถูกส่งขอยกเลิกไว้แล้ว", "#6b7280");
      return;
    }
    if (booking.status === "reschedule_requested") {
      setCancelMessage("คำขอนี้อยู่ระหว่างรออนุมัติการเปลี่ยนห้อง/เวลา", "#6b7280");
      return;
    }
    const bookingStartAt = parseBookingStartDateTime(booking);
    if (!isUpcomingBooking(booking)) {
      setCancelMessage("ยกเลิกได้เฉพาะคำขอที่ยังไม่ถึงเวลาใช้งาน", "#b91c1c");
      return;
    }
    if (
      !isStaffUser() &&
      bookingStartAt &&
      (bookingStartAt.getTime() - Date.now()) < (MIN_CANCEL_BEFORE_HOURS * 60 * 60 * 1000)
    ) {
      setCancelMessage(`ต้องยกเลิกการจองล่วงหน้าไม่น้อยกว่า ${MIN_CANCEL_BEFORE_HOURS} ชั่วโมง`, "#b91c1c");
      return;
    }

    try {
      await firestore.updateDoc(
        firestore.doc(firestore.db, BOOKING_COLLECTION_NAME, bookingId),
        {
          status: "cancel_requested",
          cancelBaseStatus: normalizeStatus(booking.status),
          cancelRequestReason: cancelReason,
          cancelRequestedAt: firestore.serverTimestamp(),
          updatedAt: firestore.serverTimestamp()
        }
      );
      await writeAuditLog(
        "booking.cancelled_by_requester",
        "meetingRoomBooking",
        bookingId,
        pickBookingAuditFields(booking),
        pickBookingAuditFields({
          ...booking,
          status: "cancel_requested",
          cancelBaseStatus: normalizeStatus(booking.status),
          cancelRequestReason: cancelReason
        }),
        { context: "cancel_form" }
      );
      setCancelMessage("ส่งคำขอยกเลิกเรียบร้อยแล้ว (รอ Staff อนุมัติ)", "#047857");
      if (cancelBookingSelect) cancelBookingSelect.value = "";
      if (cancelReasonInput) cancelReasonInput.value = "";
    } catch (err) {
      setCancelMessage("ไม่สามารถยกเลิกคำขอได้ในขณะนี้", "#b91c1c");
    }
  };

  const submitRescheduleRequest = async () => {
    const bookingId = (rescheduleBookingSelect?.value || cancelBookingSelect?.value || "").trim();
    const requestedRoomId = (rescheduleRoomSelect?.value || "").trim();
    const nextDate = (rescheduleDateInput?.value || "").trim();
    const nextStartTime = (rescheduleStartTimeInput?.value || "").trim();
    const nextEndTime = (rescheduleEndTimeInput?.value || "").trim();
    const reason = (rescheduleReasonInput?.value || cancelReasonInput?.value || "").trim();

    if (!roomsLoaded || !bookingsLoaded || roomsLoadFailed || bookingsLoadFailed) {
      setRescheduleMessage("ข้อมูลการจองยังไม่พร้อมตรวจสอบเวลา กรุณารอสักครู่แล้วลองใหม่", "#b91c1c");
      return;
    }
    if (!bookingId) {
      setRescheduleMessage("กรุณาเลือกรายการที่ต้องการจัดการ", "#b91c1c");
      return;
    }
    if (!requestedRoomId) {
      setRescheduleMessage("กรุณาเลือกห้องใหม่", "#b91c1c");
      return;
    }
    if (!nextDate || !nextStartTime || !nextEndTime) {
      setRescheduleMessage("กรุณาระบุวันและเวลาใหม่ให้ครบถ้วน", "#b91c1c");
      return;
    }
    if (!reason) {
      setRescheduleMessage("กรุณาระบุเหตุผลการขอเปลี่ยนห้อง/เวลา", "#b91c1c");
      return;
    }
    currentUserEmail = readCurrentUserEmail();
    if (!currentUserEmail) {
      setRescheduleMessage("กรุณาเข้าสู่ระบบก่อนส่งคำขอเปลี่ยนห้อง/เวลา", "#b91c1c");
      return;
    }
    if (!hasFirestore) {
      setRescheduleMessage("ระบบยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }

    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking) {
      setRescheduleMessage("ไม่พบคำขอที่เลือก", "#b91c1c");
      return;
    }
    if ((booking.requesterEmail || "").toLowerCase() !== currentUserEmail) {
      setRescheduleMessage("อีเมลที่ใช้งานไม่ตรงกับผู้จองรายการนี้", "#b91c1c");
      return;
    }
    if (booking.status === "rejected") {
      setRescheduleMessage("คำขอนี้ถูกยกเลิก/ปฏิเสธไปแล้ว", "#6b7280");
      return;
    }
    if (booking.status === "no_show") {
      setRescheduleMessage("คำขอนี้ถูกบันทึกเป็น No-show แล้ว", "#6b7280");
      return;
    }
    if (booking.status === "cancel_requested") {
      setRescheduleMessage("คำขอนี้อยู่ระหว่างรออนุมัติการยกเลิก", "#6b7280");
      return;
    }
    if (booking.status === "reschedule_requested") {
      setRescheduleMessage("คำขอนี้อยู่ระหว่างรออนุมัติการเปลี่ยนห้อง/เวลาอยู่แล้ว", "#6b7280");
      return;
    }
    if (!isUpcomingBooking(booking)) {
      setRescheduleMessage("ขอเปลี่ยนห้อง/เวลาได้เฉพาะคำขอที่ยังไม่ถึงเวลาใช้งาน", "#b91c1c");
      return;
    }
    const requestedRoom = meetingRooms.find((room) => room.id === requestedRoomId) || null;
    if (!requestedRoom) {
      setRescheduleMessage("ไม่พบห้องประชุมที่เลือก กรุณาเลือกใหม่", "#b91c1c");
      setupRoomOptions();
      return;
    }
    if (normalizeRoomBookingAccess(requestedRoom.bookingAccess) === "staff_only" && !isStaffUser()) {
      setRescheduleMessage("ห้องที่เลือกเปิดให้สตาฟจองเท่านั้น", "#b91c1c");
      setupRoomOptions();
      return;
    }
    const requestedRoomName = requestedRoom?.name || normalizeRoomDisplay(requestedRoomId, "");
    if (
      booking.roomId === requestedRoomId &&
      booking.date === nextDate &&
      booking.startTime === nextStartTime &&
      booking.endTime === nextEndTime
    ) {
      setRescheduleMessage("ห้อง วัน และเวลาใหม่ตรงกับคำขอเดิม", "#6b7280");
      return;
    }

    const nextStartAt = toDateTime(nextDate, nextStartTime);
    const nextEndAt = toDateTime(nextDate, nextEndTime);
    const now = new Date();
    const earliestAllowed = new Date(now.getTime() - (60 * 60 * 1000));
    const latestAllowed = new Date(now);
    latestAllowed.setMonth(latestAllowed.getMonth() + 1);
    if (!(nextStartAt < nextEndAt)) {
      setRescheduleMessage("กรุณากำหนดเวลาเริ่มต้นให้ก่อนเวลาสิ้นสุด", "#b91c1c");
      return;
    }
    if (nextStartAt < earliestAllowed) {
      setRescheduleMessage("ปรับเวลาเป็นย้อนหลังได้ไม่เกิน 1 ชั่วโมง", "#b91c1c");
      return;
    }
    if (!isStaffUser() && nextStartAt > latestAllowed) {
      setRescheduleMessage("ปรับเวลาเป็นล่วงหน้าได้ไม่เกิน 1 เดือน", "#b91c1c");
      return;
    }
    const restriction = getNoShowRestriction(currentUserEmail);
    if (!isStaffUser() && restriction.restricted) {
      const blockedUntilText = restriction.blockedUntil
        ? restriction.blockedUntil.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })
        : "-";
      setRescheduleMessage(
        `บัญชีนี้ถูกจำกัดสิทธิ์ชั่วคราวจากประวัติ No-show (${restriction.noShowCount} ครั้ง) ใช้งานใหม่ได้หลัง ${blockedUntilText}`,
        "#b91c1c"
      );
      return;
    }

    const candidate = {
      roomId: requestedRoomId,
      roomName: requestedRoomName,
      date: nextDate,
      startTime: nextStartTime,
      endTime: nextEndTime
    };
    if (hasOverlap(candidate, bookings, { ignoredBookingId: bookingId })) {
      setRescheduleMessage("ช่วงเวลาใหม่ของห้องนี้มีการจองทับซ้อน", "#b91c1c");
      return;
    }

    try {
      await firestore.updateDoc(
        firestore.doc(firestore.db, BOOKING_COLLECTION_NAME, bookingId),
        {
          status: "reschedule_requested",
          rescheduleBaseStatus: normalizeStatus(booking.status),
          rescheduleRequestedRoomId: requestedRoomId,
          rescheduleRequestedRoomName: requestedRoomName,
          rescheduleRequestedDate: nextDate,
          rescheduleRequestedStartTime: nextStartTime,
          rescheduleRequestedEndTime: nextEndTime,
          rescheduleRequestReason: reason,
          updatedAt: firestore.serverTimestamp()
        }
      );
      await writeAuditLog(
        "booking.reschedule_requested",
        "meetingRoomBooking",
        bookingId,
        pickBookingAuditFields(booking),
        pickBookingAuditFields({
          ...booking,
          status: "reschedule_requested",
          rescheduleBaseStatus: normalizeStatus(booking.status),
          rescheduleRequestedRoomId: requestedRoomId,
          rescheduleRequestedRoomName: requestedRoomName,
          rescheduleRequestedDate: nextDate,
          rescheduleRequestedStartTime: nextStartTime,
          rescheduleRequestedEndTime: nextEndTime,
          rescheduleRequestReason: reason
        }),
        { context: "reschedule_form" }
      );
      setRescheduleMessage("ส่งคำขอเปลี่ยนห้อง/เวลาเรียบร้อยแล้ว (รอ Staff อนุมัติ)", "#047857");
      if (rescheduleBookingSelect) rescheduleBookingSelect.value = "";
      if (cancelBookingSelect) cancelBookingSelect.value = "";
      if (rescheduleRoomSelect) rescheduleRoomSelect.value = "";
      if (rescheduleDateInput) rescheduleDateInput.value = "";
      if (rescheduleStartTimeInput) rescheduleStartTimeInput.value = "";
      if (rescheduleEndTimeInput) rescheduleEndTimeInput.value = "";
      if (rescheduleReasonInput) rescheduleReasonInput.value = "";
      if (cancelReasonInput) cancelReasonInput.value = "";
    } catch (err) {
      setRescheduleMessage("ไม่สามารถส่งคำขอเปลี่ยนห้อง/เวลาได้ในขณะนี้", "#b91c1c");
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitBooking();
  });

  if (cancelForm) {
    cancelForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if ((manageActionSelect?.value || "cancel") === "reschedule") {
        void submitRescheduleRequest();
      } else {
        void cancelOwnBooking();
      }
    });
  }

  if (manageActionSelect) {
    manageActionSelect.addEventListener("change", updateManageActionUI);
  }

  if (cancelBookingSelect) {
    cancelBookingSelect.addEventListener("change", () => {
      if (rescheduleRoomSelect) rescheduleRoomSelect.value = "";
      if (rescheduleDateInput) rescheduleDateInput.value = "";
      if (rescheduleStartTimeInput) rescheduleStartTimeInput.value = "";
      if (rescheduleEndTimeInput) rescheduleEndTimeInput.value = "";
      updateManageActionUI();
    });
  }

  if (rescheduleForm) {
    rescheduleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitRescheduleRequest();
    });
  }
  bindSecondaryFormToggles();

  if (window.sgcuAuth?.auth && typeof window.sgcuAuth.onAuthStateChanged === "function") {
    window.sgcuAuth.onAuthStateChanged(window.sgcuAuth.auth, () => {
      currentUserEmail = readCurrentUserEmail();
      if (!currentUserEmail) setReminderBanner("");
      flushApprovalEventsForCurrentUser();
      restoreMeetingProfileForCurrentUser();
      void readMeetingProfileFromFirestore().then((profile) => {
        if (profile) applySharedProfileToMeetingForm(profile);
      });
      setupRoomOptions();
      void verifyMeetingRoomStaffAccess();
      renderOwnBookingOptions();
      startReminderTimer();
      if (resolveFirestoreBridge() && (roomsLoadFailed || bookingsLoadFailed || !roomsLoaded || !bookingsLoaded)) {
        retryMeetingSubscriptions();
      }
    });
  }

  setupRoomOptions();
  currentUserEmail = readCurrentUserEmail();
  void verifyMeetingRoomStaffAccess();
  if (!currentUserEmail) setReminderBanner("");
  flushApprovalEventsForCurrentUser();
  restoreMeetingProfileForCurrentUser();
  void readMeetingProfileFromFirestore().then((profile) => {
    if (profile) applySharedProfileToMeetingForm(profile);
  });
  setMinDate();
  ensureFormContactFields();
  startReminderTimer();
  ensureBookingListUI();
  startCalendar();
  updateMeetingRoomView(meetingRoomActiveView || "calendar");
  renderMeetingLoadState();

  if (viewCalendarBtn) {
    viewCalendarBtn.addEventListener("click", () => {
      updateMeetingRoomView("calendar");
    });
  }

  if (viewListBtn) {
    viewListBtn.addEventListener("click", () => {
      updateMeetingRoomView("list");
    });
  }

  if (roomSelect) {
    roomSelect.addEventListener("focus", () => {
      setupRoomOptions();
    });
  }

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      setCalendarCursorFromDate(dateInput.value);
      renderCalendarOverview();
    });
  }

  window.addEventListener("sgcu:user-profile-updated", (event) => {
    const detail = event?.detail || {};
    const email = (detail.email || "").toString().trim().toLowerCase();
    if (!email || email !== currentUserEmail) return;
    applySharedProfileToMeetingForm(detail.profile || {});
  });

  window.addEventListener("sgcu:staff-auth-updated", (event) => {
    window.sgcuCurrentUserHasStaffAccess = event?.detail?.hasStaff === true;
    void verifyMeetingRoomStaffAccess();
  });

  if (calendarPanel && dateInput) {
    calendarPanel.addEventListener("click", (event) => {
      const clickedElement = event.target;
      if (!(clickedElement instanceof Element)) return;
      const eventTarget = clickedElement.closest(".calendar-event[data-booking-id]");
      if (eventTarget && eventTarget.dataset.bookingId) {
        openBookingDetailModal(eventTarget.dataset.bookingId);
        return;
      }
      const target = clickedElement.closest(".calendar-day");
      if (!target || !target.dataset?.date) return;
      const nextValue = target.dataset.date;
      dateInput.value = nextValue;
      setCalendarCursorFromDate(nextValue);
      renderCalendarOverview();
      openBookingDayModal(nextValue);
    });
  }

  if (calendarPrevBtn) {
    calendarPrevBtn.addEventListener("click", () => {
      calendarCursor = calendarDisplayMode === "week"
        ? new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), calendarCursor.getDate() - 7)
        : new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
      subscribeBookings();
      renderCalendarOverview();
    });
  }

  if (calendarNextBtn) {
    calendarNextBtn.addEventListener("click", () => {
      calendarCursor = calendarDisplayMode === "week"
        ? new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), calendarCursor.getDate() + 7)
        : new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      subscribeBookings();
      renderCalendarOverview();
    });
  }

  const setCalendarDisplayMode = (mode) => {
    calendarDisplayMode = mode === "week" ? "week" : "month";
    calendarMonthViewBtn?.classList.toggle("is-active", calendarDisplayMode === "month");
    calendarWeekViewBtn?.classList.toggle("is-active", calendarDisplayMode === "week");
    calendarMonthViewBtn?.setAttribute("aria-pressed", calendarDisplayMode === "month" ? "true" : "false");
    calendarWeekViewBtn?.setAttribute("aria-pressed", calendarDisplayMode === "week" ? "true" : "false");
    const previousLabel = calendarDisplayMode === "week" ? "สัปดาห์ก่อน" : "เดือนก่อน";
    const nextLabel = calendarDisplayMode === "week" ? "สัปดาห์ถัดไป" : "เดือนถัดไป";
    const previousText = calendarPrevBtn?.querySelector(".meeting-calendar-nav-text");
    const nextText = calendarNextBtn?.querySelector(".meeting-calendar-nav-text");
    if (previousText) previousText.textContent = previousLabel;
    if (nextText) nextText.textContent = nextLabel;
    calendarPrevBtn?.setAttribute("aria-label", previousLabel);
    calendarNextBtn?.setAttribute("aria-label", nextLabel);
    renderCalendarOverview();
  };

  calendarMonthViewBtn?.addEventListener("click", () => setCalendarDisplayMode("month"));
  calendarWeekViewBtn?.addEventListener("click", () => setCalendarDisplayMode("week"));
  calendarTodayBtn?.addEventListener("click", () => {
    calendarCursor = new Date();
    subscribeBookings();
    renderCalendarOverview();
  });
  calendarRoomFilter?.addEventListener("change", () => {
    calendarRoomFilterValue = calendarRoomFilter.value || "all";
    renderCalendarOverview();
  });

  if (resolveFirestoreBridge()) {
    subscribeRooms();
    subscribeBookings();
    subscribeHolidays();
  } else {
    setMessage("กำลังเชื่อมต่อข้อมูลห้องประชุม...", "#6b7280");
    renderMeetingLoadState();
    const startedAt = Date.now();
    const waitTimer = window.setInterval(() => {
      if (resolveFirestoreBridge()) {
        window.clearInterval(waitTimer);
        setMessage("");
        retryMeetingSubscriptions();
        return;
      }
      if (Date.now() - startedAt >= 15000) {
        window.clearInterval(waitTimer);
        setMessage("ระบบยังไม่เชื่อมต่อ Firestore โปรดตรวจสอบการตั้งค่า", "#b91c1c");
        renderMeetingLoadState();
      }
    }, 300);
  }

  if (bookingDetailCloseEl) {
    bookingDetailCloseEl.addEventListener("click", closeBookingDetailModal);
  }
  if (bookingDetailModalEl) {
    bookingDetailModalEl.addEventListener("click", (event) => {
      if (event.target === bookingDetailModalEl) {
        closeBookingDetailModal();
      }
    });
  }
  if (bookingDetailBodyEl) {
    bookingDetailBodyEl.addEventListener("change", (event) => {
      const select = event.target;
      if (!(select instanceof HTMLSelectElement)) return;
      if (select.id !== "meetingBookingDetailStatusSelect") return;
      select.classList.remove("is-pending", "is-approved", "is-rejected", "is-cancel-requested");
      select.classList.add(statusSelectClass(select.value));
      setBookingDetailStatusMessage("");
    });

    bookingDetailBodyEl.addEventListener("click", (event) => {
      const button = event.target;
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.id !== "meetingBookingDetailStatusApply") return;
      const select = bookingDetailBodyEl.querySelector("#meetingBookingDetailStatusSelect");
      if (!(select instanceof HTMLSelectElement)) return;
      const bookingId = activeDetailBookingId;
      if (!bookingId) return;
      button.disabled = true;
      void applyStatusByIdFromModal(bookingId, select.value).finally(() => {
        button.disabled = false;
        const latest = bookings.find((item) => item.id === bookingId);
        if (latest) {
          setBookingDetailBody(latest, activeDetailOptions);
        }
      });
    });
  }

  if (bookingDayModalCloseEl) {
    bookingDayModalCloseEl.addEventListener("click", closeBookingDayModal);
  }
  if (bookingDayModalEl) {
    bookingDayModalEl.addEventListener("click", (event) => {
      if (event.target === bookingDayModalEl) {
        closeBookingDayModal();
      }
    });
  }
  if (bookingDayModalBodyEl) {
    bookingDayModalBodyEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const row = target.closest("tr[data-booking-id]");
      if (!row || !row.dataset.bookingId) return;
      const detailOptions = {};
      if (row.dataset.includeContact === "true") {
        detailOptions.includeContact = true;
      }
      if (row.dataset.allowStatusEdit === "true") {
        detailOptions.allowStatusEdit = true;
      }
      closeBookingDayModal();
      openBookingDetailModal(row.dataset.bookingId, detailOptions);
    });
  }

  updateManageActionUI();

  window.openMeetingBookingDetailModal = openBookingDetailModal;
  window.openMeetingBookingDayListModal = openDayBookingListModal;

  window.addEventListener("beforeunload", () => {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
    if (typeof unsubscribeRooms === "function") {
      unsubscribeRooms();
    }
    if (typeof unsubscribeHolidays === "function") {
      unsubscribeHolidays();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMeetingRoomBookingApp, { once: true });
} else {
  initMeetingRoomBookingApp();
}
