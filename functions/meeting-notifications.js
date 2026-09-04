const STAFF_QUEUE_STATUSES = new Set(["pending", "cancel_requested", "reschedule_requested"]);
const REQUESTER_RESULT_STATUSES = new Set(["approved", "rejected", "no_show"]);
const MEETING_STAFF_PAGES = new Set(["meeting-room-staff", "meeting-room-booking", "จองห้องประชุม"]);

export function normalizeBookingStatus(data = {}) {
  const status = (data.status || "pending").toString().trim().toLowerCase();
  const reason = (data.rejectionReason || "").toString();
  if (status === "rejected" && reason.includes("[NO_SHOW]")) return "no_show";
  return status;
}

export function formatBookingSchedule(data = {}) {
  const room = (data.roomName || data.roomDisplay || data.roomId || "-").toString();
  const date = (data.date || "-").toString();
  const start = (data.startTime || "-").toString();
  const end = (data.endTime || "-").toString();
  return `${room} • ${date} • ${start}-${end}`;
}

export function buildStaffBookingNotification(before, after) {
  const previousStatus = before ? normalizeBookingStatus(before) : "";
  const nextStatus = normalizeBookingStatus(after);
  if (!STAFF_QUEUE_STATUSES.has(nextStatus) || previousStatus === nextStatus) return null;
  const type = nextStatus === "cancel_requested"
    ? "คำขอยกเลิกห้องประชุม"
    : nextStatus === "reschedule_requested"
      ? "คำขอเปลี่ยนห้อง/เวลา"
      : "คำขอจองห้องประชุมใหม่";
  const requester = (after.requester || after.requesterEmail || "-").toString();
  return {
    title: type,
    body: `${requester} • ${formatBookingSchedule(after)}`,
    url: "/#meeting-room-staff",
    audience: "staff"
  };
}

export function buildRequesterBookingNotification(before, after) {
  if (!before) return null;
  const previousStatus = normalizeBookingStatus(before);
  const nextStatus = normalizeBookingStatus(after);
  if (previousStatus === nextStatus || !REQUESTER_RESULT_STATUSES.has(nextStatus)) return null;
  const reason = (after.rejectionReason || after.cancelRequestReason || "").toString().replace("[NO_SHOW]", "").trim();
  const title = nextStatus === "approved"
    ? "คำขอห้องประชุมได้รับอนุมัติ"
    : nextStatus === "no_show"
      ? "บันทึกไม่มาใช้ห้องประชุม (No-show)"
      : "คำขอห้องประชุมไม่อนุมัติ/ยกเลิก";
  return {
    title,
    body: `${formatBookingSchedule(after)}${reason ? ` • เหตุผล: ${reason}` : ""}`,
    url: "/#meeting-room-booking",
    audience: "requester",
    email: (after.requesterEmail || "").toString().trim().toLowerCase()
  };
}

export function bookingStartTimeMs(data = {}) {
  const direct = Date.parse((data.startAt || "").toString());
  if (Number.isFinite(direct)) return direct;
  const date = (data.date || "").toString().trim();
  const time = (data.startTime || "").toString().trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return Number.NaN;
  return Date.parse(`${date}T${time}:00+07:00`);
}

function timestampMs(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?._seconds)) return value._seconds * 1000;
  const parsed = Date.parse((value || "").toString());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function getPersonnelAutoApprovalReason(data = {}, nowMs = Date.now()) {
  if (normalizeBookingStatus(data) !== "pending") return null;
  const profileType = (data.requesterProfileType || data.profileType || "").toString().trim().toLowerCase();
  if (!["affairs", "staff", "personnel", "บุคลากร"].includes(profileType)) return null;
  const startMs = bookingStartTimeMs(data);
  if (Number.isFinite(startMs) && nowMs >= startMs) return "start_time_reached";
  const createdMs = timestampMs(data.createdAt);
  if (Number.isFinite(createdMs) && nowMs - createdMs >= 24 * 60 * 60 * 1000) return "pending_24_hours";
  return null;
}

export function getDueMeetingReminder(data = {}, nowMs = Date.now()) {
  if (normalizeBookingStatus(data) !== "approved") return null;
  const startMs = bookingStartTimeMs(data);
  if (!Number.isFinite(startMs)) return null;
  const remainingMinutes = (startMs - nowMs) / 60000;
  // The ten-minute windows tolerate scheduler/cold-start delays while event IDs prevent duplicates.
  const minutesBefore = remainingMinutes > 50 && remainingMinutes <= 60
    ? 60
    : remainingMinutes > 5 && remainingMinutes <= 15
      ? 15
      : null;
  if (!minutesBefore) return null;
  return { minutesBefore, startMs };
}

export function buildMeetingReminderNotification(data = {}, minutesBefore) {
  if (![60, 15].includes(minutesBefore)) return null;
  return {
    title: `เตือนประชุมในอีก ${minutesBefore === 60 ? "1 ชั่วโมง" : "15 นาที"}`,
    body: formatBookingSchedule(data),
    url: "/#meeting-room-booking",
    audience: "requester",
    email: (data.requesterEmail || "").toString().trim().toLowerCase()
  };
}

function pageValues(input) {
  const keys = ["allowedPages", "allowedPageIds", "allowedStaffPages", "staffPages", "pages", "pageAccess", "pagePermissions"];
  return keys.flatMap((key) => Array.isArray(input?.[key]) ? input[key] : []);
}

function hasMeetingPage(input) {
  const values = pageValues(input).map((value) => value?.toString().trim().toLowerCase());
  if (values.some((value) => value === "*" || value === "all" || MEETING_STAFF_PAGES.has(value))) return true;
  return Array.isArray(input?.positions) && input.positions.some((position) =>
    hasMeetingPage(position) || hasMeetingPage(position?.permissions) || hasMeetingPage(position?.access)
  );
}

function hasExplicitPages(input) {
  if (pageValues(input).length) return true;
  return Array.isArray(input?.positions) && input.positions.some((position) =>
    hasExplicitPages(position) || hasExplicitPages(position?.permissions) || hasExplicitPages(position?.access)
  );
}

export function canReceiveMeetingStaffPush(profile = {}, email = "") {
  const normalizedEmail = email.toString().trim().toLowerCase();
  if (["tuwanon.kimchiang@gmail.com", "treasurer.sgcu68@gmail.com"].includes(normalizedEmail)) return true;
  const isHead = profile.role === "0" || profile.positionCodeYY === "00" || profile.divisionCodeYY === "00" ||
    (Array.isArray(profile.divisionCodesYY) && profile.divisionCodesYY.includes("00")) ||
    (profile.position || "").toString().includes("เหรัญญิก");
  if (isHead) return true;
  return hasMeetingPage(profile) || !hasExplicitPages(profile);
}
