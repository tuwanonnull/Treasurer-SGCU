import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewStaffProjectAccess } from './staff-access-review.mjs';
const accounts = [
  { uid: 'h', email: 'h@example.test', emailVerified: true, disabled: false },
  { uid: 'a', email: 'a@example.test', emailVerified: true, disabled: false }
];
function options() {
  return { academicYear: 2568, projectIds: ['p1'],
    readProfiles: async () => [{ id: accounts[0].email, data: { position: 'เหรัญญิก' } }, { id: accounts[1].email, data: { position: 'ผู้ช่วยเหรัญญิก' } }],
    findAuthAccount: async email => ({ ...accounts.find(a => a.email === email), passwordHash: 'must-not-copy', customClaims: { admin: true } }),
    readExistingGrants: async () => [] };
}
test('full read-only review joins staff and Auth and explicitly leaves activation/year unverified', async () => {
  const result = await reviewStaffProjectAccess(options());
  assert.equal(result.plan.grants.length, 2); assert.equal(result.differences.length, 2);
  assert.equal(result.readyToActivate, false); assert.equal(result.writesPerformed, false);
  assert.equal(result.academicYearMembershipVerified, false);
  assert.equal(JSON.stringify(result).includes('must-not-copy'), false);
  assert.deepEqual(result.plan.unassignedProjectIds, ['p1']);
});
test('missing/disabled/unverified accounts block a full plan; service outage propagates', async () => {
  for (const findAuthAccount of [async () => { throw Object.assign(new Error('missing'), { code: 'auth/user-not-found' }); }, async email => ({ ...accounts.find(a => a.email === email), disabled: true }), async email => ({ ...accounts.find(a => a.email === email), emailVerified: false })]) {
    const result = await reviewStaffProjectAccess({ ...options(), findAuthAccount });
    assert.equal(result.plan, null); assert.ok(result.issues.length);
  }
  await assert.rejects(reviewStaffProjectAccess({ ...options(), findAuthAccount: async () => { throw new Error('outage'); } }), /outage/);
});
test('revoked access and staff changes are reported without restoring or deleting access', async () => {
  const old = [{ id: 'h', data: { uid: 'h', academicYear: 2568, active: true, projectRole: 'secretary' } },
    { id: 'a', data: { uid: 'a', academicYear: 2568, active: false, projectRole: 'assistant' } },
    { id: 'other', data: { uid: 'other', academicYear: 2568, active: true, projectRole: 'assistant' } }];
  const before = structuredClone(old);
  const result = await reviewStaffProjectAccess({ ...options(), readExistingGrants: async () => old });
  assert.deepEqual(result.differences.map(d => d.kind), ['role-change', 'previously-revoked', 'existing-access-outside-roster']);
  assert.deepEqual(old, before); assert.equal(result.readyToActivate, false);
});
test('wrong-year or malformed existing grants block the review plan', async () => {
  const result = await reviewStaffProjectAccess({ ...options(), readExistingGrants: async () => [{ id: 'h', data: { uid: 'h', academicYear: 2569, active: true, projectRole: 'head' } }] });
  assert.equal(result.plan, null); assert.ok(result.issues.some(i => i.reason === 'invalid-existing-grant'));
});
