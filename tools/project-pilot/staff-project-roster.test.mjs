import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareStaffProjectRoster } from './staff-project-roster.mjs';
test('reuse staff profile email and distinguish head from secretary despite shared legacy privilege', () => {
  const input = [
    { id: 'head@example.test', data: { role: '0', divisionCodeYY: '00', position: 'เหรัญญิก' } },
    { id: 'secretary@example.test', data: { role: '0', divisionCodeYY: '00', positions: [{ name: 'เลขานุการฝ่ายเหรัญญิก' }] } },
    { id: 'assistant@example.test', data: { positions: [{ name: 'ผู้ช่วยเหรัญญิก' }] } }
  ];
  const before = structuredClone(input), result = prepareStaffProjectRoster(input);
  assert.deepEqual(result.roster.map(r => r.role), ['head', 'secretary', 'assistant']);
  assert.ok(result.roster.every(r => r.projectIds.length === 0));
  assert.equal(result.writesPerformed, false); assert.equal(result.authAccountsVerified, false);
  assert.deepEqual(input, before);
});
test('never infer treasurer from shared code, full page access or override email', () => {
  const result = prepareStaffProjectRoster([{ id: 'treasurer.sgcu68@gmail.com', data: { role: '0', divisionCodeYY: '00', allowedPages: ['*'] } }]);
  assert.equal(result.roster.length, 0); assert.equal(result.unresolved[0].reason, 'no-project-position');
});
test('conflicting roles, email and malformed positions need resolution instead of highest-role fallback', () => {
  const result = prepareStaffProjectRoster([
    { id: 'one@example.test', data: { positions: [{ name: 'เหรัญญิก' }, { name: 'เลขานุการฝ่ายเหรัญญิก' }] } },
    { id: 'two@example.test', data: { email: 'other@example.test', position: 'เหรัญญิก' } },
    { id: 'three@example.test', data: { positions: 'เหรัญญิก', position: 'เหรัญญิก' } }
  ]);
  assert.equal(result.roster.length, 0); assert.equal(result.unresolved.length, 3);
});
test('current positions take precedence over stale legacy primary position; duplicates are refused', () => {
  const doc = { id: 'one@example.test', data: { position: 'เหรัญญิก', positions: [{ name: 'ผู้ช่วยเหรัญญิก' }] } };
  assert.equal(prepareStaffProjectRoster([doc]).roster[0].role, 'assistant');
  assert.throws(() => prepareStaffProjectRoster([doc, doc]), /duplicate/);
});
