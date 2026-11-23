import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNotificationPayload,
  isExpiredPushError,
  normalizeMeta,
  normalizeSubscription,
  normalizeVapidKey,
  subscriptionId
} from "../push-core.js";

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/123",
  keys: { p256dh: Buffer.alloc(65, 4).toString("base64url"), auth: Buffer.alloc(16, 1).toString("base64url") }
};

test("normalizes a valid push subscription", () => {
  assert.deepEqual(normalizeSubscription(subscription), { ...subscription, expirationTime: null });
});

test("rejects insecure and incomplete subscriptions", () => {
  assert.throws(() => normalizeSubscription({ ...subscription, endpoint: "http://example.test" }), /invalid-push-endpoint/);
  assert.throws(() => normalizeSubscription({ endpoint: subscription.endpoint, keys: {} }), /invalid-push-keys/);
});

test("creates stable endpoint ids without storing the endpoint in the path", () => {
  assert.equal(subscriptionId(subscription.endpoint), subscriptionId(subscription.endpoint));
  assert.equal(subscriptionId(subscription.endpoint).length, 64);
});

test("limits untrusted metadata and notification fields", () => {
  assert.equal(normalizeMeta({ label: "x".repeat(200) }).label.length, 100);
  const payload = JSON.parse(buildNotificationPayload({ title: "x".repeat(200), body: "y".repeat(600) }));
  assert.equal(payload.title.length, 120);
  assert.equal(payload.body.length, 500);
});

test("recognizes expired push endpoints", () => {
  assert.equal(isExpiredPushError({ statusCode: 403 }), true);
  assert.equal(isExpiredPushError({ statusCode: 410 }), true);
  assert.equal(isExpiredPushError({ statusCode: 500 }), false);
});

test("normalizes harmless VAPID key formatting", () => {
  assert.equal(normalizeVapidKey("  'abc_DEF-123'\n"), "abc_DEF-123");
  assert.equal(normalizeVapidKey("abc_DEF-123\r\n"), "abc_DEF-123");
  assert.throws(() => normalizeVapidKey("abc=123"), /invalid-vapid-key-format/);
  assert.throws(() => normalizeVapidKey("abc\\_123"), /invalid-vapid-key-format/);
});

 test("rejects private hosts, lookalikes, credentials and nonstandard ports", () => {
  for (const endpoint of ["https://127.0.0.1/x", "https://[::1]/x", "https://169.254.169.254/x", "https://example.com/x",
    "https://fcm.googleapis.com.evil.test/x", "https://evilpush.apple.com/x", "https://u:p@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x", "https://fcm.googleapis.com/x#fragment"]) {
    assert.throws(() => normalizeSubscription({ ...subscription, endpoint }), /invalid-push-endpoint/);
  }
  for (const host of ["updates.push.services.mozilla.com", "updates.push.services.mozilla.net", "web.push.apple.com", "a.push.apple.com"]) {
    assert.equal(normalizeSubscription({ ...subscription, endpoint: `https://${host}/x` }).endpoint, `https://${host}/x`);
  }
  assert.throws(() => normalizeSubscription({ ...subscription, keys: { p256dh: "x".repeat(10000), auth: "a" } }), /invalid-push-keys/);
});
