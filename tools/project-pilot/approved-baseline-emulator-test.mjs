import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createEmulatorIdentity, assertProjectEmulators } from './firebase-identity.mjs';
import { loadProductionCandidate } from './production-candidate.mjs';
import { acceptBaseline, buildApprovedBaselineImport, importApprovedBaseline, verifyApprovedBaseline } from './approved-baseline.mjs';
assertProjectEmulators();
const candidate = await loadProductionCandidate(process.argv[2]);
const acceptance = acceptBaseline(candidate), plan = buildApprovedBaselineImport(candidate, acceptance);
const before = await readFile(path.join(process.argv[2], 'snapshot.json'));
const identity = createEmulatorIdentity(), db = identity.db, root = db.doc(`projectBaselines/${plan.baselineId}`);
let owned = false;
try {
  assert.equal(plan.documentCount, 409);
  assert.ok(plan.writes.every(w => w.path.startsWith(root.path) && !w.path.includes('projectAccess')));
  if ((await root.get()).exists || !(await root.collection('projects').get()).empty || !(await root.collection('metadata').get()).empty) throw new Error('Test destination already exists; leave it unchanged');
  const wrong = structuredClone(acceptance); wrong.totals.O++;
  assert.throws(() => buildApprovedBaselineImport(candidate, wrong));
  const changed = structuredClone(candidate); changed.manifest.snapshotSha256 = '0'.repeat(64);
  assert.throws(() => acceptBaseline(changed));
  // Existing single child must reject the entire batch, including root metadata.
  const conflict = plan.writes[0]; await db.doc(conflict.path).create({ sentinel: true }); owned = true;
  await assert.rejects(importApprovedBaseline({ candidate, acceptance, db }));
  assert.equal((await root.get()).exists, false);
  assert.equal((await root.collection('projects').get()).size, 1);
  await db.doc(conflict.path).delete();
  await importApprovedBaseline({ candidate, acceptance, db });
  const result = await verifyApprovedBaseline({ candidate, acceptance, db });
  await assert.rejects(importApprovedBaseline({ candidate, acceptance, db }));
  assert.deepEqual(await verifyApprovedBaseline({ candidate, acceptance, db }), result);
  await db.doc(conflict.path).update({ payload: '{}' });
  await assert.rejects(verifyApprovedBaseline({ candidate, acceptance, db }));
  assert.deepEqual(await readFile(path.join(process.argv[2], 'snapshot.json')), before);
  console.log(JSON.stringify({ ...result, atomicImportTested: true, overwriteRejected: true, alteredDataRejected: true, productionWrites: false }));
} finally {
  if (owned) await db.recursiveDelete(root);
  await identity.close();
}
