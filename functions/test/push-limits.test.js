import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { nextRateWindow, consumePushQuota, savePushSubscription, MAX_PUSH_DEVICES, PUSH_LIMITS } from '../push-limits.js';

test('quota resets at boundary, rejects overflow and isolates action policies', () => {
  let state;
  for (let i = 0; i < 3; i++) state = nextRateWindow(state, PUSH_LIMITS.test, 1000);
  assert.throws(() => nextRateWindow(state, PUSH_LIMITS.test, 2000), e => e.message === 'rate-limited' && e.retryAfter === 59);
  assert.deepEqual(nextRateWindow(state, PUSH_LIMITS.test, 61000), { startedAt: 61000, count: 1 });
  assert.equal(nextRateWindow(undefined, PUSH_LIMITS.subscribe, 1000).count, 1);
});

test('Firestore serializes quotas, device caps, renewals and endpoint ownership', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^127\.0\.0\.1:\d+$/);
  const { initializeApp, deleteApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = initializeApp({ projectId: 'demo-budget-meeting' }, `push-${randomUUID()}`);
  const db = getFirestore(app);
  const uid = `test-push-${randomUUID()}`;
  const other = `test-push-${randomUUID()}`;
  const stamp = new Date();
  try {
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => consumePushQuota(db, uid, 'test', 1000)));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 3);
    for (const r of results.filter(r => r.status === 'rejected')) assert.equal(r.reason.message, 'rate-limited');
    await consumePushQuota(db, other, 'test', 1000);
    await consumePushQuota(db, uid, 'subscribe', 1000);
    for (let i = 0; i < MAX_PUSH_DEVICES - 1; i++) await savePushSubscription(db, uid, `${uid}-${i}`, { active: true }, stamp);
    const registrations = await Promise.allSettled([9, 10].map(i => savePushSubscription(db, uid, `${uid}-${i}`, { active: true }, stamp)));
    assert.equal(registrations.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(registrations.find(r => r.status === 'rejected').reason.message, 'device-limit-reached');
    await savePushSubscription(db, uid, `${uid}-0`, { active: true }, new Date(stamp.getTime() + 1000));
    assert.equal((await db.collection('pushSubscriptions').doc(`${uid}-0`).get()).data().createdAt.toMillis(), stamp.getTime());
    await assert.rejects(savePushSubscription(db, other, `${uid}-0`, { active: true }, stamp), /subscription-owner-conflict/);
  } finally {
    for (const id of [uid, other]) {
      await db.recursiveDelete(db.collection('pushRateLimits').doc(id));
      await db.collection('pushDeviceLocks').doc(id).delete();
      const devices = await db.collection('pushSubscriptions').where('uid', '==', id).get();
      for (const device of devices.docs) await device.ref.delete();
    }
    await deleteApp(app);
  }
});
