// One document per account/action, rather than an unbounded document per request.
export const MAX_PUSH_DEVICES = 10;
export const PUSH_LIMITS = Object.freeze({
  subscribe: { count: 10, windowMs: 60_000 },
  unsubscribe: { count: 20, windowMs: 60_000 },
  test: { count: 3, windowMs: 60_000 },
  meeting: { count: 30, windowMs: 60_000 }
});

export function nextRateWindow(previous, policy, nowMs) {
  const fresh = !previous || !Number.isFinite(previous.startedAt) || nowMs >= previous.startedAt + policy.windowMs;
  const startedAt = fresh ? nowMs : previous.startedAt;
  const count = fresh ? 0 : previous.count;
  if (!Number.isInteger(count) || count < 0 || count >= policy.count) {
    const error = new Error("rate-limited");
    error.retryAfter = Math.max(1, Math.ceil((startedAt + policy.windowMs - nowMs) / 1000));
    throw error;
  }
  return { startedAt, count: count + 1 };
}

export async function consumePushQuota(db, uid, action, nowMs = Date.now()) {
  const policy = PUSH_LIMITS[action];
  if (!policy) throw new Error("invalid-push-action");
  const ref = db.collection("pushRateLimits").doc(uid).collection("actions").doc(action);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    transaction.set(ref, nextRateWindow(snapshot.data(), policy, nowMs));
  });
}

// Read the account lock, endpoint and existing devices before writing. Updating the
// lock serializes simultaneous registrations even when their endpoints differ.
export async function savePushSubscription(db, uid, id, data, timestamp) {
  const ref = db.collection("pushSubscriptions").doc(id);
  const lock = db.collection("pushDeviceLocks").doc(uid);
  await db.runTransaction(async transaction => {
    await transaction.get(lock);
    const existing = await transaction.get(ref);
    if (existing.exists && existing.data().uid !== uid) throw new Error("subscription-owner-conflict");
    const devices = await transaction.get(db.collection("pushSubscriptions").where("uid", "==", uid).limit(MAX_PUSH_DEVICES));
    if (!existing.exists && devices.size >= MAX_PUSH_DEVICES) throw new Error("device-limit-reached");
    transaction.set(lock, { updatedAt: timestamp });
    transaction.set(ref, { ...data, uid, createdAt: existing.data()?.createdAt || timestamp, updatedAt: timestamp });
  });
}
