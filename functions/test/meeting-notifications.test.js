import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingStartTimeMs,
  buildMeetingReminderNotification,
  buildRequesterBookingNotification,
  buildStaffBookingNotification,
  canReceiveMeetingStaffPush,
  getDueMeetingReminder,
  normalizeBookingStatus
} from "../meeting-notifications.js";

const booking = {
  status: "pending",
  requester: "ผู้ทดสอบ",
  requesterEmail: "user@example.com",
  roomName: "ห้อง 1",
  date: "2026-08-28",
  startTime: "10:00",
  endTime: "11:00"
};

test("builds a staff notification for a new booking", () => {
  const result = buildStaffBookingNotification(null, booking);
  assert.equal(result.title, "คำขอจองห้องประชุมใหม่");
  assert.equal(result.audience, "staff");
});

test("does not notify staff for unchanged queue status", () => {
  assert.equal(buildStaffBookingNotification(booking, booking), null);
});

test("builds requester approval and no-show notifications", () => {
  const approved = buildRequesterBookingNotification(booking, { ...booking, status: "approved" });
  assert.equal(approved.email, "user@example.com");
  assert.match(approved.title, /อนุมัติ/);
  const noShowData = { ...booking, status: "rejected", rejectionReason: "[NO_SHOW] ไม่มาตามเวลา" };
  assert.equal(normalizeBookingStatus(noShowData), "no_show");
  assert.match(buildRequesterBookingNotification({ ...booking, status: "approved" }, noShowData).title, /No-show/);
});

test("filters meeting staff recipients using page permissions", () => {
  assert.equal(canReceiveMeetingStaffPush({ allowedPages: ["meeting-room-staff"] }, "staff@example.com"), true);
  assert.equal(canReceiveMeetingStaffPush({ allowedPages: ["borrow-assets-staff"] }, "staff@example.com"), false);
  assert.equal(canReceiveMeetingStaffPush({ role: "0", allowedPages: [] }, "head@example.com"), true);
  assert.equal(canReceiveMeetingStaffPush({}, "legacy@example.com"), true);
});

test("detects the 60-minute and 15-minute reminder windows", () => {
  const startMs = bookingStartTimeMs({ ...booking, startAt: "2026-08-28T10:00:00+07:00", status: "approved" });
  assert.equal(getDueMeetingReminder({ ...booking, startAt: "2026-08-28T10:00:00+07:00", status: "approved" }, startMs - 55 * 60000)?.minutesBefore, 60);
  assert.equal(getDueMeetingReminder({ ...booking, startAt: "2026-08-28T10:00:00+07:00", status: "approved" }, startMs - 10 * 60000)?.minutesBefore, 15);
});

test("skips reminder outside its windows or when booking is not approved", () => {
  const approved = { ...booking, status: "approved", startAt: "2026-08-28T10:00:00+07:00" };
  const startMs = bookingStartTimeMs(approved);
  assert.equal(getDueMeetingReminder(approved, startMs - 30 * 60000), null);
  assert.equal(getDueMeetingReminder({ ...approved, status: "pending" }, startMs - 10 * 60000), null);
});

test("builds requester reminder content", () => {
  const result = buildMeetingReminderNotification({ ...booking, status: "approved" }, 15);
  assert.match(result.title, /15 นาที/);
  assert.equal(result.email, "user@example.com");
});
