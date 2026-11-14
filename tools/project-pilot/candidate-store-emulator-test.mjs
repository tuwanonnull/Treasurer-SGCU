import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadProductionCandidate, validateProductionCandidate, sha256 } from './production-candidate.mjs';
import { createCandidateStore, restoreCandidateBackup, candidateIdentity } from './candidate-store.mjs';
import { createEmulatorIdentity } from './firebase-identity.mjs';
const directory = process.argv[2];
const candidate = await loadProductionCandidate(directory);
const originalBytes = await readFile(path.join(directory, 'snapshot.json'));
const identity = createEmulatorIdentity();
const suffix = randomUUID(), datasetId = `candidate68-${suffix}`, recoveredId = `candidate68-recovered-${suffix}`;
const uid = `candidate-head-${suffix}`, users = { [uid]: { id: uid, role: 'head', name: 'เหรัญญิกสำหรับซ้อมใน Emulator' } };
const scoped = candidateIdentity(identity, datasetId), recovered = candidateIdentity(identity, recoveredId);
const root = identity.db.collection('projectCandidates').doc(datasetId);
const trial = identity.db.collection('projectTrials').doc(datasetId);
const options = { candidate, identity, users, datasetId };
try {
  // A sentinel makes accidental writes to the old namespace observable.
  await trial.create({ sentinel: suffix });
  await scoped.grantRef(uid, 2568).create({ uid, academicYear: 2568, active: true, projectRole: 'head' });
  const store = await createCandidateStore(options);
  const before = await store.query(uid), p = before.projects[0];
  assert.equal(before.totalCount, candidate.snapshot.projects.length);
  assert.deepEqual(before.totals, candidate.snapshot.totals);
  const baseline = await store.backup(uid);
  assert.equal(baseline.payload.archive.payload.auditOrder.length, 0);
  for (const state of baseline.payload.archive.payload.checkpoints) {
    const source = candidate.snapshot.projects.find(p => p.id === state.data.projects[0].sourceId);
    assert.deepEqual(state.data.projects[0].money, source.money);
    assert.equal(state.data.projects[0].trialAssignee, null);
    assert.equal(state.requests.length, 0);
  }
  const second = await createCandidateStore(options);
  const attempts = await Promise.allSettled([store, second].map((s, i) => s.mutate(uid, 'commit', {
    projectId: p.id, version: p.version, changes: { O: String(100 + i) }, reason: 'ซ้อมบันทึกพร้อมกันในชุดแยก'
  })));
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(r => r.status === 'rejected').reason.status, 409);
  const after = await (await createCandidateStore(options)).query(uid);
  assert.equal(after.audit.length, 1);
  assert.deepEqual(after.projects.slice(1), before.projects.slice(1));
  await assert.rejects(store.query('admin'), e => e.status === 403);
  await scoped.grantRef(uid, 2568).update({ active: false });
  await assert.rejects(store.mutate(uid, 'commit', { projectId: p.id, version: after.projects[0].version, changes: { O: '2' }, reason: 'ต้องถูกปฏิเสธ' }), e => e.status === 403);
  await scoped.grantRef(uid, 2568).update({ active: true });
  const bundle = await store.backup(uid);
  assert.equal(bundle.payload.archive.payload.auditOrder.length, 1);
  await assert.rejects(restoreCandidateBackup({ ...options, bundle: bundle.payload.archive, datasetId: recoveredId }));
  const corrupt = structuredClone(bundle); corrupt.payload.archive.payload.checkpoints[0].data.projects[0].money.O++;
  await assert.rejects(restoreCandidateBackup({ ...options, bundle: corrupt, datasetId: recoveredId }));
  assert.equal((await identity.db.collection('projectCandidates').doc(recoveredId).get()).exists, false);
  await restoreCandidateBackup({ ...options, bundle, datasetId: recoveredId });
  assert.equal((await recovered.grantRef(uid, 2568).get()).exists, false);
  const restored = await createCandidateStore({ ...options, datasetId: recoveredId });
  await assert.rejects(restored.query(uid), e => e.status === 403);
  await recovered.grantRef(uid, 2568).create({ uid, academicYear: 2568, active: true, projectRole: 'head' });
  const recoveredBundle = await restored.backup(uid);
  for (const old of bundle.payload.archive.payload.checkpoints) {
    const current = recoveredBundle.payload.archive.payload.checkpoints.find(s => s.data.projects[0].id === old.data.projects[0].id);
    assert.deepEqual(current.data.projects[0].money, old.data.projects[0].money);
    assert.deepEqual(current.audit, old.audit);
    assert.notEqual(current.data.projects[0].version, old.data.projects[0].version);
  }
  await assert.rejects(restored.mutate(uid, 'commit', { projectId: p.id, version: after.projects[0].version, changes: { O: '3' }, reason: 'หน้าจอก่อนกู้คืน' }), e => e.status === 409);
  await assert.rejects(restoreCandidateBackup({ ...options, bundle, datasetId: recoveredId }));
  assert.deepEqual((await trial.get()).data(), { sentinel: suffix });
  assert.deepEqual(await readFile(path.join(directory, 'snapshot.json')), originalBytes);
  for (const mutate of [m => m.trialDataImported = true, m => m.grants.push({ uid }), m => m.snapshotSha256 = '0'.repeat(64)]) {
    const manifest = structuredClone(candidate.manifest); mutate(manifest);
    assert.throws(() => validateProductionCandidate(originalBytes, manifest));
  }
  const bad = structuredClone(candidate.snapshot); bad.projects[0].money.O++; bad.totals.O++;
  const raw = Buffer.from(JSON.stringify(bad, null, 2));
  assert.throws(() => validateProductionCandidate(raw, { ...candidate.manifest, totals: bad.totals, snapshotSha256: sha256(raw) }));
  console.log(JSON.stringify({ passed: true, projects: before.totalCount, cleanInitialState: true, isolatedNamespace: true, concurrentWrites: 'one accepted / one stale', recoveryVerified: true, grantsNotRestored: true, originalUnchanged: true, productionWrites: false }));
} finally {
  for (const id of [datasetId, recoveredId]) {
    await identity.db.recursiveDelete(identity.db.collection('projectCandidates').doc(id));
    await identity.db.recursiveDelete(identity.db.collection('projectCandidateAccess').doc(id));
  }
  await trial.delete();
  await identity.close();
}
