import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { createLoginFixture } from './emulator-fixture.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createFirestoreTrial } from './firestore-trial.mjs';
import { restoreFirestoreBackup, validateFirestoreBackup } from './firestore-backup.mjs';

const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8')), fixture = await createLoginFixture(2568);
const trialId = `backup-${randomUUID()}`, restoredId = `${trialId}-restored`, failedId = `${trialId}-failed`, corruptId = `${trialId}-corrupt`;
const uid = key => fixture.credentials[key].uid;
const options = { snapshot, identity: fixture.identity, users: fixture.users, academicYear: 2568, trialId };
const root = id => fixture.identity.db.collection('projectTrials').doc(id);
try {
  const seedModel = createFinanceTrial(snapshot, { users: fixture.users });
  for (let i = 0; i < 55; i++) {
    const p = seedModel.query(uid('head')).projects[0];
    seedModel.mutate(uid('head'), 'commit', { projectId: p.id, version: p.version, changes: { O: String(1000 + i) }, reason: 'ประวัติสำหรับทดสอบกู้คืน' });
  }
  const p = seedModel.query(uid('head')).projects[0];
  seedModel.mutate(uid('head'), 'assign', { projectId: p.id, version: p.version, assignee: uid('assistantA'), reason: '' });
  const current = seedModel.query(uid('head')).projects[0];
  const fresh = seedModel.mutate(uid('secretary'), 'propose', { projectId: current.id, version: current.version, changes: { O: '2000' }, reason: 'คำขอค้างที่ยังใช้ได้' });
  const other = seedModel.query(uid('head')).projects[1];
  const stale = seedModel.mutate(uid('secretary'), 'propose', { projectId: other.id, version: other.version, changes: { O: '3000' }, reason: 'คำขอที่จะเก่า' });
  seedModel.mutate(uid('head'), 'commit', { projectId: other.id, version: other.version, changes: { O: '4000' }, reason: 'ทำให้คำขอเก่า' });
  const exportedSeed = seedModel.exportState();
  const seed = { projects: exportedSeed.data.projects, requests: exportedSeed.requests, audit: exportedSeed.audit };
  const store = await createFirestoreTrial({ ...options, seed });
  for (const key of ['secretary', 'assistantA', 'assistantB']) await assert.rejects(store.backup(uid(key)), e => e.status === 403);
  const before = await store.query(uid('head')); assert.equal(before.audit.length, 50);
  const bundle = await store.backup(uid('head')), validated = validateFirestoreBackup(bundle);
  assert.equal(validated.checkpoints.length, snapshot.projects.length);
  assert.equal(validated.auditOrder.length, seed.audit.length); assert.ok(validated.auditOrder.length > 50);
  assert.equal(Object.hasOwn(validated, 'grants'), false); assert.equal(Object.hasOwn(validated, 'credentials'), false);
  const afterDownload = await store.query(uid('head')); assert.deepEqual(afterDownload, before);

  const broken = structuredClone(bundle); broken.payload.checkpoints[0].data.projects[0].money.O++;
  await assert.rejects(restoreFirestoreBackup({ bundle: broken, identity: fixture.identity, trialId: corruptId }));
  broken.checksum = createHash('sha256').update(JSON.stringify(broken.payload)).digest('hex');
  await assert.rejects(restoreFirestoreBackup({ bundle: broken, identity: fixture.identity, trialId: corruptId }));
  assert.equal((await root(corruptId).get()).exists, false);
  await assert.rejects(restoreFirestoreBackup({ bundle, identity: fixture.identity, trialId }));
  assert.deepEqual(await store.query(uid('head')), before);

  const started = performance.now();
  const result = await restoreFirestoreBackup({ bundle, identity: fixture.identity, trialId: restoredId });
  const restored = await createFirestoreTrial({ ...options, trialId: restoredId });
  const recovered = await restored.backup(uid('head'));
  const originalStates = new Map(bundle.payload.checkpoints.map(s => [s.data.projects[0].id, s]));
  for (const state of recovered.payload.checkpoints) {
    const project = state.data.projects[0], old = originalStates.get(project.id), oldProject = old.data.projects[0];
    assert.notEqual(project.version, oldProject.version);
    assert.deepEqual({ ...project, version: null }, { ...oldProject, version: null });
    assert.deepEqual(state.audit, old.audit);
  }
  assert.deepEqual(recovered.payload.auditOrder, bundle.payload.auditOrder);
  const view = await restored.query(uid('head'));
  assert.deepEqual(view.projects.map(p => p.id), before.projects.map(p => p.id));
  assert.deepEqual(view.totals, before.totals);
  assert.equal(view.requests.find(r => r.id === fresh.requestId).stale, false);
  assert.equal(view.requests.find(r => r.id === stale.requestId).stale, true);
  await assert.rejects(restored.mutate(uid('head'), 'commit', { projectId: current.id, version: current.version, changes: { O: '1' }, reason: 'หน้าจอเก่าก่อนกู้' }), e => e.status === 409);
  const recoveredProject = view.projects.find(p => p.id === current.id);
  await restored.mutate(uid('head'), 'approve', { requestId: fresh.requestId, version: recoveredProject.version });
  assert.equal((await restored.query(uid('head'))).projects[0].money.O, 200000);
  assert.deepEqual(await store.query(uid('head')), before);
  assert.equal((await restored.query(uid('assistantA'))).totalCount, 1);

  const failingIdentity = { ...fixture.identity, db: { collection: fixture.identity.db.collection.bind(fixture.identity.db), batch: () => ({ create() {}, async commit() { throw new Error('simulated write failure'); } }) } };
  await assert.rejects(restoreFirestoreBackup({ bundle, identity: failingIdentity, trialId: failedId }), /simulated write failure/);
  assert.equal((await root(failedId).get()).data().status, 'restoring');
  await assert.rejects(createFirestoreTrial({ ...options, trialId: failedId }), e => e.status === 409);
  console.log(JSON.stringify({ result: 'PASS', projects: result.projects, audit: result.audit, recoveryAndChecksMs: Math.round(performance.now() - started), checks: 'head-only complete backup, no side effects, corruption rejected, no overwrite, full money/status/assignments/history preserved, versions rotated, current/stale pending requests preserved, interrupted recovery blocked' }));
} finally {
  for (const id of [trialId, restoredId, failedId, corruptId]) await fixture.identity.db.recursiveDelete(root(id));
  await fixture.close();
}
