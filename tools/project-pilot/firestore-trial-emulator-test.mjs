import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createLoginFixture } from './emulator-fixture.mjs';
import { createFirestoreTrial } from './firestore-trial.mjs';
import { serializeTrialWrite } from './write-queue.mjs';

const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
const fixture = await createLoginFixture(2568), trialId = `transaction-${randomUUID()}`;
const options = { snapshot, identity: fixture.identity, users: fixture.users, academicYear: 2568, trialId };
const uid = key => fixture.credentials[key].uid;
try {
  const first = await createFirestoreTrial(options), second = await createFirestoreTrial(options);
  const original = await first.query(uid('head')), p = original.projects[0];
  const results = await Promise.allSettled([first, second].map((store, i) => store.mutate(uid('head'), 'commit', {
    projectId: p.id, version: p.version, changes: { O: String(100 + i) }, reason: 'ทดสอบบันทึกชนกัน'
  })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
  const committed = await first.query(uid('head'));
  assert.equal(committed.audit.length, 1);
  assert.notEqual(committed.projects[0].version, p.version);
  assert.deepEqual((await second.query(uid('head'))).projects, committed.projects);
  const current = committed.projects[0];
  const request = await first.mutate(uid('secretary'), 'propose', { projectId: p.id, version: current.version, changes: { O: '123.45' }, reason: 'ทดสอบคำขอหลังเปิดใหม่' });
  const restarted = await createFirestoreTrial(options);
  const pending = await restarted.query(uid('head'));
  assert.equal(pending.requests[0].id, request.requestId);
  assert.equal(pending.projects[0].money.O, current.money.O);
  await restarted.mutate(uid('head'), 'approve', { requestId: request.requestId, version: current.version });
  const approved = await first.query(uid('head'));
  assert.equal(approved.projects[0].money.O, 12345);
  assert.equal(approved.requests.length, 0);
  assert.equal((await first.backup(uid('head'))).payload.checkpoints.flatMap(s => s.requests).find(r => r.id === request.requestId).state, 'approved');
  assert.equal(approved.audit.length, 3);
  // Other projects retain their versions: a write never rewrites the whole snapshot.
  assert.deepEqual(approved.projects.slice(1), original.projects.slice(1));
  await fixture.identity.grantRef(uid('head'), 2568).update({ active: false });
  await assert.rejects(first.mutate(uid('head'), 'commit', { projectId: p.id, version: approved.projects[0].version, changes: { O: '1' }, reason: 'ถอนสิทธิ์แล้ว' }), e => e.status === 403);
  await fixture.identity.grantRef(uid('head'), 2568).update({ active: true });
  const afterDenied = await first.query(uid('head'));
  assert.deepEqual(afterDenied.projects, approved.projects); assert.deepEqual(afterDenied.audit, approved.audit);
  await first.mutate(uid('head'), 'assign', { projectId: p.id, version: approved.projects[0].version, assignee: uid('assistantA'), reason: '' });
  assert.equal((await second.query(uid('assistantA'))).totalCount, 1);
  assert.equal((await second.query(uid('assistantB'))).totalCount, 0);
  const beforeQueue = await first.query(uid('head'));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const blocker = serializeTrialWrite(trialId, () => gate);
  const queuedProject = beforeQueue.projects[0];
  const queued = first.mutate(uid('head'), 'commit', { projectId: queuedProject.id, version: queuedProject.version, changes: { O: '1' }, reason: 'ตรวจสิทธิ์หลังรอคิว' });
  const rejected = assert.rejects(queued, e => e.status === 403);
  await fixture.identity.grantRef(uid('head'), 2568).update({ active: false });
  release(); await blocker; await rejected;
  await fixture.identity.grantRef(uid('head'), 2568).update({ active: true });
  assert.deepEqual(await first.query(uid('head')), beforeQueue);
  console.log('PASS: Firestore transaction collision, stale write rejected without partial state, reopen preserves pending request and approval, unchanged other projects, revoked grant rejected, assistant scope.');
} finally {
  await fixture.identity.db.recursiveDelete(fixture.identity.db.collection('projectTrials').doc(trialId));
  await fixture.close();
}
