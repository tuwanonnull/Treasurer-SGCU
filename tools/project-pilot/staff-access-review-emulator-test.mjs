import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLoginFixture } from './emulator-fixture.mjs';
import { readStaffProjectAccess } from './staff-access-review.mjs';
const fixture = await createLoginFixture(2568);
const root = fixture.identity.db.collection('staffReviewTests').doc(randomUUID());
const identity = { auth: fixture.identity.auth, db: { collection: name => root.collection(name) } };
const profiles = root.collection('staffProfiles'), grants = root.collection('projectAccess').doc('2568').collection('members');
try {
  for (const [key, name] of [['head', 'เหรัญญิก'], ['secretary', 'เลขานุการฝ่ายเหรัญญิก'], ['assistantA', 'ผู้ช่วยเหรัญญิก']]) {
    const account = fixture.credentials[key];
    await fixture.identity.auth.updateUser(account.uid, { emailVerified: true });
    await profiles.doc(account.email).set({ positions: [{ name }], role: key === 'assistantA' ? '1' : '0' });
  }
  const assistant = fixture.credentials.assistantA;
  await grants.doc(assistant.uid).set({ uid: assistant.uid, academicYear: 2568, active: false, projectRole: 'assistant' });
  const result = await readStaffProjectAccess({ identity, academicYear: 2568, projectIds: ['p1', 'p2'] });
  assert.equal(result.candidateCount, 3); assert.equal(result.plan.grants.length, 3);
  assert.equal(result.differences.find(d => d.uid === assistant.uid).kind, 'previously-revoked');
  assert.equal((await grants.get()).size, 1); assert.equal((await grants.doc(assistant.uid).get()).data().active, false);
  await fixture.identity.auth.updateUser(assistant.uid, { disabled: true });
  const disabled = await readStaffProjectAccess({ identity, academicYear: 2568, projectIds: ['p1', 'p2'] });
  assert.equal(disabled.plan, null); assert.ok(disabled.issues.some(i => i.reason === 'account-disabled'));
  assert.equal((await profiles.get()).size, 3); assert.equal((await grants.get()).size, 1);
  console.log('PASS: Firestore staff profiles joined to Auth UID, distinct roles, revoked grant retained, disabled account blocks plan, no review writes');
} finally { await fixture.identity.db.recursiveDelete(root); await fixture.close(); }
