import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createLoginFixture } from './emulator-fixture.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createFirestoreTrial } from './firestore-trial.mjs';
import { restoreFirestoreBackup } from './firestore-backup.mjs';

const source = JSON.parse(await readFile(process.argv[2], 'utf8'));
source.projects = source.projects.slice(0, 1); source.verification.projectCount = 1;
source.totals = Object.fromEntries(Object.entries(source.projects[0].money).map(([k, v]) => [k, v ?? 0]));
const fixture = await createLoginFixture(2568), trialId = `history-${randomUUID()}`, recoveryId = `${trialId}-recovered`;
const db = fixture.identity.db, root = db.collection('projectTrials').doc(trialId);
const head = fixture.credentials.head.uid;
const options = { snapshot: source, identity: fixture.identity, users: fixture.users, academicYear: 2568, trialId };
try {
  const model = createFinanceTrial(source, { users: fixture.users });
  for (let i = 0; i < 750; i++) {
    const p = model.query(head).projects[0];
    model.mutate(head, 'commit', { projectId: p.id, version: p.version, changes: { O: String(1000 + i) }, reason: 'ตรวจประวัติระยะยาว' });
  }
  const store = await createFirestoreTrial({ ...options, seed: model.query(head) });
  const bundle = await store.backup(head), full = bundle.payload.checkpoints[0];
  assert.ok(Buffer.byteLength(JSON.stringify(full)) > 750000);
  const ref = root.collection('projects').doc(createHash('sha256').update(JSON.stringify(full.data.projects[0].id)).digest('hex'));
  assert.ok(Buffer.byteLength((await ref.get()).data().payload) < 10000);
  assert.equal(full.audit.length, 750);
  await restoreFirestoreBackup({ bundle, identity: fixture.identity, trialId: recoveryId });
  const recovered = await createFirestoreTrial({ ...options, trialId: recoveryId });
  assert.deepEqual((await recovered.backup(head)).payload.checkpoints[0].audit, full.audit);
  // Reproduce an old checkpoint and interrupt after its compact replacement commits.
  await ref.update({ payload: JSON.stringify(full) }); await root.update({ storageVersion: 1 });
  let interrupted = false;
  const failingDb = { collection: db.collection.bind(db), runTransaction: db.runTransaction.bind(db), batch() {
    const batch = db.batch(); let compactWrite = false;
    return { set(ref, data) { if (ref.parent.id === 'projects') compactWrite = true; batch.set(ref, data); },
      update: batch.update.bind(batch), async commit() { const result = await batch.commit(); if (compactWrite && !interrupted) { interrupted = true; throw new Error('Injected migration interruption'); } return result; } };
  } };
  await assert.rejects(createFirestoreTrial({ ...options, identity: { ...fixture.identity, db: failingDb } }), /Injected/);
  assert.equal((await root.get()).data().status, 'migrating');
  const resumed = await createFirestoreTrial(options);
  assert.deepEqual((await resumed.backup(head)).payload.checkpoints, bundle.payload.checkpoints);
  assert.equal((await root.get()).data().storageVersion, 2);
  const page = await resumed.query(head, new URLSearchParams(), { includeAudit: false });
  const p = page.projects[0]; await resumed.mutate(head, 'commit', { projectId: p.id, version: p.version, changes: { O: '9999' }, reason: 'หลังย้ายข้อมูล' });
  assert.equal((await resumed.backup(head)).payload.auditOrder.length, 751);
  console.log(JSON.stringify({ result: 'PASS', events: 750, fullBytes: Buffer.byteLength(JSON.stringify(full)), compactBytes: Buffer.byteLength((await ref.get()).data().payload), checks: 'large seed, full archive recovery, old-format migration, interruption after checkpoint write, resume, edit after migration' }));
} finally {
  await db.recursiveDelete(root); await db.recursiveDelete(db.collection('projectTrials').doc(recoveryId)); await fixture.close();
}
