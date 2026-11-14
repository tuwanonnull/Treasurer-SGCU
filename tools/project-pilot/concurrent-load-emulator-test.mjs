import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createLoginFixture } from './emulator-fixture.mjs';
import { createFirestoreTrial } from './firestore-trial.mjs';
import { previewMoney } from './finance.mjs';

const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
const operations = Number(process.argv[3] || 200), concurrency = Number(process.argv[4] || 10);
assert.ok(Number.isInteger(operations) && operations > 0 && operations <= snapshot.projects.length);
assert.ok(Number.isInteger(concurrency) && concurrency > 0 && concurrency <= 34);
const fixture = await createLoginFixture(2568), trialId = `load-${randomUUID()}`, uid = fixture.credentials.head.uid;
let measuring = false, attempts = 0;
const identity = { ...fixture.identity, db: {
  collection: fixture.identity.db.collection.bind(fixture.identity.db),
  runTransaction: (update, options) => fixture.identity.db.runTransaction(tx => {
    if (measuring) attempts++; return update(tx);
  }, options)
} };
const options = { snapshot, identity, users: fixture.users, academicYear: 2568, trialId };
try {
  const stores = [await createFirestoreTrial(options), await createFirestoreTrial(options)];
  const original = await stores[0].backup(uid);
  const checkpoints = original.payload.checkpoints.slice(0, operations);
  let next = 0;
  const outcomes = [], started = performance.now(); measuring = true;
  await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
    for (;;) {
      const index = next++; if (index >= operations) return;
      const project = checkpoints[index].data.projects[0], value = String(1000 + index);
      const at = performance.now();
      try {
        await stores[worker % stores.length].mutate(uid, 'commit', { projectId: project.id, version: project.version, changes: { O: value }, reason: 'ทดสอบบันทึกพร้อมกัน' });
        outcomes.push({ projectId: project.id, index, ok: true, ms: performance.now() - at });
      } catch (error) { outcomes.push({ projectId: project.id, index, ok: false, ms: performance.now() - at, code: error.status || error.code, message: error.message }); }
    }
  }));
  measuring = false;
  const elapsedMs = performance.now() - started;
  const after = await stores[1].backup(uid);
  const beforeById = new Map(original.payload.checkpoints.map(state => [state.data.projects[0].id, state]));
  const outcomeById = new Map(outcomes.map(result => [result.projectId, result]));
  let changes = 0;
  for (const state of after.payload.checkpoints) {
    const p = state.data.projects[0], old = beforeById.get(p.id), outcome = outcomeById.get(p.id);
    if (outcome?.ok) {
      changes++;
      assert.deepEqual(p.money, previewMoney(old.data.projects[0], { O: String(1000 + outcome.index) }).after);
      assert.notEqual(p.version, old.data.projects[0].version); assert.equal(state.audit.length, 1);
      assert.equal(state.audit[0].actor, uid);
    } else assert.deepEqual(state, old, 'Unsuccessful or untouched projects must be completely unchanged');
  }
  const summary = await stores[1].query(uid, new URLSearchParams(), { includeAudit: false });
  for (const col of Object.keys(snapshot.totals)) {
    assert.equal(summary.totals[col], after.payload.checkpoints.reduce((sum, state) => sum + (state.data.projects[0].money[col] ?? 0), 0));
  }
  assert.equal(after.payload.auditOrder.length, changes); assert.equal(new Set(after.payload.auditOrder).size, changes);
  const timings = outcomes.map(result => result.ms).sort((a, b) => a - b);
  const failures = outcomes.filter(result => !result.ok);
  console.log(JSON.stringify({ result: failures.length ? 'INCOMPLETE' : 'PASS', operations, concurrency, storeInstances: stores.length,
    success: changes, failed: failures.length, transactionAttempts: attempts, elapsedMs: Math.round(elapsedMs),
    p50Ms: Math.round(timings[Math.floor(timings.length * .5)]), p95Ms: Math.round(timings[Math.min(timings.length - 1, Math.floor(timings.length * .95))]),
    failureCodes: failures.map(result => result.code), consistency: 'all project amounts, summary totals, audit counts and untouched state verified',
    scope: 'local emulator store requests with head account; excludes HTTP/Auth, browser refresh, network and production performance' }));
  assert.equal(failures.length, 0, 'Some distinct-project writes exhausted transaction retries');
} finally {
  await fixture.identity.db.recursiveDelete(fixture.identity.db.collection('projectTrials').doc(trialId)); await fixture.close();
}
