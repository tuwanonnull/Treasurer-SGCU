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
  endpoint: "https://push.example.test/device/123",
  keys: { p256dh: "public-key", auth: "auth-key" }
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
