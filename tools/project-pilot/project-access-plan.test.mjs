import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareProjectAccessPlan } from './project-access-plan.mjs';
function input() {
  return { academicYear: 2569, projectIds: ['p1', 'p2'],
    authAccounts: ['head', 'secretary', 'assistant'].map(uid => ({ uid, email: `${uid}@example.test`, emailVerified: true, disabled: false })),
    roster: [{ email: 'head@example.test', role: 'head' }, { email: 'secretary@example.test', role: 'secretary' }, { email: 'assistant@example.test', role: 'assistant', projectIds: ['p1'] }] };
}
test('access plan uses verified UID and explicit project role without changing source', () => {
  const data = input(), before = structuredClone(data);
  data.authAccounts[2].staffRole = 'head'; before.authAccounts[2].staffRole = 'head';
  const plan = prepareProjectAccessPlan(data);
  assert.equal(plan.grants[2].projectRole, 'assistant');
  assert.deepEqual(plan.assignments, [{ projectId: 'p1', assistantUid: 'assistant', academicYear: 2569 }]);
  assert.deepEqual(plan.unassignedProjectIds, ['p2']); assert.equal(plan.writesPerformed, false);
  assert.deepEqual(data, before);
});
test('rejects missing, unverified and disabled accounts without trusting supplied UID', () => {
  for (const change of [data => data.authAccounts.pop(), data => { data.authAccounts[2].disabled = true; }, data => { data.authAccounts[2].emailVerified = false; }, data => { data.roster[2].uid = 'head'; }]) {
    const data = input(); change(data); assert.throws(() => prepareProjectAccessPlan(data));
  }
});
test('rejects duplicate people, ambiguous Auth records and unknown or duplicate assignments', () => {
  for (const change of [data => data.roster.push({ ...data.roster[0] }), data => data.authAccounts.push({ ...data.authAccounts[0], uid: 'other' }), data => data.roster[2].projectIds.push('p1'), data => data.roster[2].projectIds.push('unknown'), data => { data.roster[1].projectIds = ['p2']; }]) {
    const data = input(); change(data); assert.throws(() => prepareProjectAccessPlan(data));
  }
});
test('requires explicit year and one treasurer; cannot silently alias student and alumni accounts', () => {
  for (const change of [data => { data.academicYear = '2569'; }, data => { data.roster[0].role = 'secretary'; }, data => { data.roster[1].role = 'head'; }, data => { data.roster[2].email = 'assistant@alumni.example.test'; }]) {
    const data = input(); change(data); assert.throws(() => prepareProjectAccessPlan(data));
  }
});
