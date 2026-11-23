import { initializeApp } from "firebase-admin/app";
import { authorizePushRequest, pushErrorResponse } from "./push-http.js";
import { getAppCheck } from "firebase-admin/app-check";
import { consumePushQuota, savePushSubscription, MAX_PUSH_DEVICES } from "./push-limits.js";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret, defineString, defineBoolean } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import webpush from "web-push";
import {
  buildNotificationPayload,
  isExpiredPushError,
  normalizeMeta,
  normalizeSubscription,
  normalizeVapidKey,
  subscriptionId
} from "./push-core.js";
import {
  buildRequesterBookingNotification,
  buildMeetingReminderNotification,
  buildStaffBookingNotification,
  canReceiveMeetingStaffPush,
  getPersonnelAutoApprovalReason,
  getDueMeetingReminder
} from "./meeting-notifications.js";

initializeApp();

const db = getFirestore();
const vapidPublicKey = defineString("WEB_PUSH_VAPID_PUBLIC_KEY", { default: "" });
const vapidPrivateKey = defineSecret("WEB_PUSH_VAPID_PRIVATE_KEY");
const vapidSubject = defineString("WEB_PUSH_VAPID_SUBJECT", { default: "mailto:admin@example.com" });
const enforcePushAppCheck = defineBoolean("PUSH_ENFORCE_APP_CHECK", { default: false });
const pushHttpOptions = { maxInstances: 2, concurrency: 20, timeoutSeconds: 30 };
const COLLECTION = "pushSubscriptions";
const BOOKING_COLLECTION = "meetingRoomBookings";
const STAFF_COLLECTION = "staffProfiles";
const EVENT_COLLECTION = "pushNotificationEvents";

function applyCors(req, res) {
  res.set("Access-Control-Allow-Origin", req.get("origin") || "*");
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Firebase-AppCheck");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

async function requireUser(req, action) {
  return authorizePushRequest(req, action, {
    enforceAppCheck: enforcePushAppCheck.value(),
    verifyAppCheck: token => getAppCheck().verifyToken(token),
    verifyIdToken: (token, revoked) => getAuth().verifyIdToken(token, revoked),
    consumeQuota: (uid, name) => consumePushQuota(db, uid, name)
  });
}

function handleError(res, error) {
  const result = pushErrorResponse(error);
  if (result.retryAfter) res.set("Retry-After", result.retryAfter);
  if (result.status === 405) res.set("Allow", "POST, OPTIONS");
  // Do not log tokens, endpoint URLs, payloads or downstream HTTP response bodies.
  if (result.status === 500) console.error("push endpoint failed", { code: error?.code || "internal-error" });
  res.status(result.status).json({ ok: false, error: result.error });
}

export const pushConfig = onRequest(pushHttpOptions, (req, res) => {
  if (applyCors(req, res)) return;
  res.set("Cache-Control", "public, max-age=300");
  res.json({ applicationServerKey: vapidPublicKey.value() });
});

export const subscribePush = onRequest(pushHttpOptions, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const user = await requireUser(req, "subscribe");
    const subscription = normalizeSubscription(req.body?.subscription);
    const id = subscriptionId(subscription.endpoint);
    await savePushSubscription(db, user.uid, id, {
      email: (user.email || "").toLowerCase(),
      subscription,
      meta: normalizeMeta(req.body?.meta),
      active: true
    }, FieldValue.serverTimestamp());
    res.json({ ok: true, id });
  } catch (error) {
    handleError(res, error);
  }
});

export const unsubscribePush = onRequest(pushHttpOptions, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const user = await requireUser(req, "unsubscribe");
    const endpoint = (req.body?.endpoint || "").toString().trim();
    if (!endpoint) throw new Error("invalid-push-endpoint");
    const ref = db.collection(COLLECTION).doc(subscriptionId(endpoint));
    await db.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      if (snap.exists && snap.data()?.uid !== user.uid) throw new Error("unauthenticated");
      transaction.delete(ref);
    });
    res.json({ ok: true });
  } catch (error) {
    handleError(res, error);
  }
});

export const testPush = onRequest({ ...pushHttpOptions, secrets: [vapidPrivateKey] }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const user = await requireUser(req, "test");
    const publicKey = normalizeVapidKey(vapidPublicKey.value());
    const privateKey = normalizeVapidKey(vapidPrivateKey.value());
    if (!publicKey || !privateKey) throw new Error("push-not-configured");
    webpush.setVapidDetails(vapidSubject.value(), publicKey, privateKey);

    const snapshots = await db.collection(COLLECTION)
      .where("uid", "==", user.uid)
      .limit(MAX_PUSH_DEVICES)
      .get();
    const payload = buildNotificationPayload({
      title: "ทดสอบ Push Notification",
      body: "อุปกรณ์นี้รับการแจ้งเตือนจากเซิร์ฟเวอร์ได้แล้ว",
      url: "/#login"
    });
    let sent = 0;
    let removed = 0;
    await Promise.all(snapshots.docs.map(async (doc) => {
      if (doc.data()?.active !== true) return;
      try {
        await webpush.sendNotification(normalizeSubscription(doc.data().subscription), payload, { timeout: 10_000 });
        sent += 1;
      } catch (error) {
        if (isExpiredPushError(error)) {
          await doc.ref.delete();
          removed += 1;
          return;
        }
        throw error;
      }
    }));
    res.json({ ok: true, sent, removed });
  } catch (error) {
    handleError(res, error);
  }
});

async function claimPushEvent(eventId) {
  if (!eventId) return true;
  try {
    await db.collection(EVENT_COLLECTION).doc(subscriptionId(eventId)).create({
      createdAt: FieldValue.serverTimestamp()
    });
    return true;
  } catch (error) {
    if (error?.code === 6 || error?.code === "already-exists") return false;
    throw error;
  }
}

async function sendPushToEmails(emails, notification) {
  const recipients = new Set(Array.from(emails || [], (email) => (email || "").toString().trim().toLowerCase()).filter(Boolean));
  if (!recipients.size || !notification) return { sent: 0, removed: 0 };
  const publicKey = normalizeVapidKey(vapidPublicKey.value());
  const privateKey = normalizeVapidKey(vapidPrivateKey.value());
  webpush.setVapidDetails(vapidSubject.value(), publicKey, privateKey);
  const targets = [];
  for (const email of recipients) {
    const snapshot = await db.collection(COLLECTION).where("email", "==", email).limit(MAX_PUSH_DEVICES).get();
    targets.push(...snapshot.docs.filter(doc => doc.data()?.active === true));
  }
  const payload = buildNotificationPayload(notification);
  let sent = 0;
  let removed = 0;
  await Promise.all(targets.map(async (doc) => {
    try {
      await webpush.sendNotification(normalizeSubscription(doc.data().subscription), payload, { timeout: 10_000 });
      sent += 1;
    } catch (error) {
      if (isExpiredPushError(error)) {
        await doc.ref.delete();
        removed += 1;
        return;
      }
      console.error("push delivery failed", { subscriptionId: doc.id, statusCode: error?.statusCode });
    }
  }));
  return { sent, removed };
}

async function getMeetingStaffEmails() {
  const profiles = await db.collection(STAFF_COLLECTION).get();
  const emails = new Set(["tuwanon.kimchiang@gmail.com", "treasurer.sgcu68@gmail.com"]);
  profiles.docs.forEach((doc) => {
    const data = doc.data() || {};
    const email = (data.email || doc.id || "").toString().trim().toLowerCase();
    if (email && canReceiveMeetingStaffPush(data, email)) emails.add(email);
  });
  return emails;
}

async function isStaffUser(user) {
  const email = (user.email || "").toString().trim().toLowerCase();
  if (["tuwanon.kimchiang@gmail.com", "treasurer.sgcu68@gmail.com"].includes(email)) return true;
  const profile = await db.collection(STAFF_COLLECTION).doc(email).get();
  return profile.exists;
}

function bookingVersionKey(bookingId, booking) {
  const updatedAt = booking.updatedAt?.toMillis?.() || booking.updatedAt?._seconds || booking.updatedAt || "";
  return ["meeting", bookingId, booking.status || "", updatedAt].join("|");
}

export const dispatchMeetingPush = onRequest({ ...pushHttpOptions, secrets: [vapidPrivateKey] }, async (req, res) => {
  if (applyCors(req, res)) return;
  try {
    const user = await requireUser(req, "meeting");
    const bookingId = (req.body?.bookingId || "").toString().trim();
    const previousStatus = (req.body?.previousStatus || "").toString().trim().toLowerCase();
    if (!bookingId || bookingId.length > 200 || bookingId.includes("/")) throw new Error("invalid-booking-id");
    const snapshot = await db.collection(BOOKING_COLLECTION).doc(bookingId).get();
    if (!snapshot.exists) throw new Error("booking-not-found");
    const booking = snapshot.data() || {};
    const actorEmail = (user.email || "").toString().trim().toLowerCase();
    const requesterEmail = (booking.requesterEmail || "").toString().trim().toLowerCase();
    const staffActor = await isStaffUser(user);
    const staffNotification = buildStaffBookingNotification(previousStatus ? { status: previousStatus } : null, booking);
    const requesterNotification = buildRequesterBookingNotification(previousStatus ? { status: previousStatus } : null, booking);
    if (staffNotification && actorEmail !== requesterEmail && !staffActor) throw new Error("unauthenticated");
    if (requesterNotification && !staffActor) throw new Error("unauthenticated");
    if (!staffNotification && !requesterNotification) {
      res.json({ ok: true, sent: 0, skipped: true });
      return;
    }
    const eventKey = bookingVersionKey(bookingId, booking);
    if (!(await claimPushEvent(eventKey))) {
      res.json({ ok: true, sent: 0, duplicate: true });
      return;
    }
    const results = await Promise.all([
      staffNotification ? sendPushToEmails(await getMeetingStaffEmails(), staffNotification) : null,
      requesterNotification?.email ? sendPushToEmails([requesterNotification.email], requesterNotification) : null
    ]);
    res.json({ ok: true, sent: results.reduce((sum, result) => sum + (result?.sent || 0), 0) });
  } catch (error) {
    handleError(res, error);
  }
});

export const sendMeetingReminders = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "Asia/Bangkok",
  secrets: [vapidPrivateKey],
  retryCount: 1
}, async () => {
  const nowMs = Date.now();
  const pendingSnapshots = await db.collection(BOOKING_COLLECTION).where("status", "==", "pending").get();
  let autoApproved = 0;
  let autoApprovalNotifications = 0;
  await Promise.all(pendingSnapshots.docs.map(async (pendingDoc) => {
    const initialBooking = pendingDoc.data() || {};
    if (!getPersonnelAutoApprovalReason(initialBooking, nowMs)) return;
    const approvedBooking = await db.runTransaction(async (transaction) => {
      const latestSnapshot = await transaction.get(pendingDoc.ref);
      if (!latestSnapshot.exists) return null;
      const latestBooking = latestSnapshot.data() || {};
      const reason = getPersonnelAutoApprovalReason(latestBooking, nowMs);
      if (!reason) return null;
      transaction.update(pendingDoc.ref, {
        status: "approved",
        autoApprovedAt: FieldValue.serverTimestamp(),
        autoApprovalReason: reason,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { ...latestBooking, status: "approved", autoApprovalReason: reason };
    });
    if (!approvedBooking) return;
    autoApproved += 1;
    const notification = buildRequesterBookingNotification(initialBooking, approvedBooking);
    if (!notification?.email) return;
    const eventKey = ["meeting-auto-approved", pendingDoc.id].join("|");
    if (!(await claimPushEvent(eventKey))) return;
    const result = await sendPushToEmails([notification.email], notification);
    autoApprovalNotifications += result.sent;
  }));

  const snapshots = await db.collection(BOOKING_COLLECTION).where("status", "==", "approved").get();
  let due = 0;
  let sent = 0;
  let duplicates = 0;
  await Promise.all(snapshots.docs.map(async (doc) => {
    const booking = doc.data() || {};
    const reminder = getDueMeetingReminder(booking, nowMs);
    if (!reminder) return;
    due += 1;
    const notification = buildMeetingReminderNotification(booking, reminder.minutesBefore);
    if (!notification?.email) return;
    const eventKey = ["meeting-reminder", doc.id, reminder.startMs, reminder.minutesBefore].join("|");
    if (!(await claimPushEvent(eventKey))) {
      duplicates += 1;
      return;
    }
    const result = await sendPushToEmails([notification.email], notification);
    sent += result.sent;
  }));
  console.log("meeting automation processed", {
    pendingScanned: pendingSnapshots.size,
    autoApproved,
    autoApprovalNotifications,
    reminderScanned: snapshots.size,
    due,
    sent,
    duplicates
  });
});

// Isolated project management API and offsite backups; no import or grants at startup.
export { projectLiveApi, projectLiveBackup } from './project-live/cloud.mjs';
