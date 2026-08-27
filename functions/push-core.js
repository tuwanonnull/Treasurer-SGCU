import { createHash } from "node:crypto";

const MAX_ENDPOINT_LENGTH = 2048;

export function normalizeVapidKey(input) {
  let value = (input || "").toString().trim();
  const hasMatchingQuotes =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (hasMatchingQuotes) value = value.slice(1, -1).trim();
  value = value.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("invalid-vapid-key-format");
  }
  return value;
}

export function normalizeSubscription(input) {
  const endpoint = (input?.endpoint || "").toString().trim();
  const p256dh = (input?.keys?.p256dh || "").toString().trim();
  const auth = (input?.keys?.auth || "").toString().trim();
  if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) {
    throw new Error("invalid-push-endpoint");
  }
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch (_) {
    throw new Error("invalid-push-endpoint");
  }
  if (parsed.protocol !== "https:") throw new Error("invalid-push-endpoint");
  if (!p256dh || !auth) throw new Error("invalid-push-keys");
  return { endpoint, expirationTime: input.expirationTime || null, keys: { p256dh, auth } };
}

export function subscriptionId(endpoint) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function normalizeMeta(input = {}) {
  return {
    userAgent: (input.userAgent || "").toString().slice(0, 500),
    platform: (input.platform || "").toString().slice(0, 100),
    label: (input.label || "").toString().trim().slice(0, 100)
  };
}

export function buildNotificationPayload(input = {}) {
  return JSON.stringify({
    title: (input.title || "Treasurer SGCU68").toString().slice(0, 120),
    body: (input.body || "ทดสอบการแจ้งเตือนสำเร็จ").toString().slice(0, 500),
    url: (input.url || "/").toString().slice(0, 1000),
    data: input.data && typeof input.data === "object" ? input.data : {}
  });
}

export function isExpiredPushError(error) {
  return [401, 403, 404, 410].includes(error?.statusCode);
}
