import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readBackup } from './recovery-kit.mjs';
import { createEmulatorIdentity } from './firebase-identity.mjs';
import { restoreFirestoreBackup } from './firestore-backup.mjs';
import { createFirestoreTrial } from './firestore-trial.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node recovery-drill.mjs BACKUP_FILE');
const started = performance.now(), { bundle } = await readBackup(file);
const { source, users, academicYear } = bundle.payload;
const identity = createEmulatorIdentity(), trialId = `recovery-drill-${randomUUID()}`;
const root = identity.db.collection('projectTrials').doc(trialId);
let ownsRoot = false;
try {
  // Do not create or reinstate any account/grant merely because it is in a backup.
  let head;
  for (const user of Object.values(users).filter(u => u.role === 'head')) {
    const grant = (await identity.grantRef(user.id, academicYear).get()).data();
    if (grant?.active && grant.uid === user.id && grant.academicYear === academicYear && grant.projectRole === 'head') {
      const account = await identity.auth.getUser(user.id);
      if (!account.disabled) { head = user.id; break; }
    }
  }
  if (!head) throw new Error('No active head account and grant: prepare identity recovery separately');
  assert.equal((await root.get()).exists, false);
  ownsRoot = true;
  await restoreFirestoreBackup({ bundle, identity, trialId });
  const store = await createFirestoreTrial({ snapshot: source, identity, users, academicYear, trialId });
  const recovered = await store.backup(head);
  const originals = new Map(bundle.payload.checkpoints.map(s => [s.data.projects[0].id, s]));
  assert.equal(recovered.payload.checkpoints.length, originals.size);
  for (const state of recovered.payload.checkpoints) {
    const old = originals.get(state.data.projects[0].id), expected = structuredClone(old);
    const oldVersion = old.data.projects[0].version, newVersion = state.data.projects[0].version;
    assert.notEqual(newVersion, oldVersion); assert.notEqual(state.revision, old.revision);
    expected.revision = state.revision; expected.data.projects[0].version = newVersion;
    for (const r of expected.requests) if (r.state === 'pending' && r.baseVersion === oldVersion) r.baseVersion = newVersion;
    assert.deepEqual(state, expected);
  }
  assert.deepEqual(recovered.payload.auditOrder, bundle.payload.auditOrder);
  const elapsedMs = Math.round(performance.now() - started);
  console.log(JSON.stringify({ result: 'PASS', testedAt: new Date().toISOString(), backupAt: bundle.payload.createdAt,
    projects: originals.size, audit: recovered.payload.auditOrder.length, elapsedMs, withinOneDay: elapsedMs < 86400000,
    scope: 'Data restore and exact comparison in running local emulators with existing identity',
    exclusions: ['offsite upload/download', 'replacement machine setup', 'account/grant recovery', 'production cutover', 'linked Drive files'],
    sourceTrialUnchanged: true }, null, 2));
} finally {
  if (ownsRoot) await identity.db.recursiveDelete(root);
  await identity.close();
}
