import test from 'node:test';
import assert from 'node:assert/strict';
import { createPilotServer } from './server.mjs';
import { validateYear68Snapshot, queryYear68, summarizeReviewers } from './year68.mjs';

export function fixture() {
  const money = { O: 10000, V: null, W: null, AE: null, AJ: 2000, BC: -500, BE: 2000, BF: 8000 };
  return { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false,
    verification: { projectCount: 30, moneyMismatchCount: 0 }, moneyLabels: { O: 'งบอนุมัติ', AJ: 'ใช้จริง' },
    totals: Object.fromEntries(Object.entries(money).map(([col, amount]) => [col, (amount ?? 0) * 30])),
    projects: Array.from({ length: 30 }, (_, i) => ({ id: `YEAR68:${i + 3}:DEMO${i}`, code: `DEMO${i}`, sourceRow: i + 3,
      name: `โครงการทดสอบ ${i}`, organization: 'องค์กรตัวอย่าง', responsibleName: 'ผู้ตรวจตัวอย่าง', responsibleColumn: 'AI', accountId: null,
      statuses: { H: 'รอแก้ไข', Q: '', Y: 'ยังไม่เริ่มดำเนินการ', AZ: 'รอส่งเอกสารปิดโครง', BA: 'รอปิดโครงการ' }, money: { ...money } })) };
}
test('snapshot validation preserves blanks, negative money and totals; rejects corruption', () => {
  const data = fixture(); const loaded = validateYear68Snapshot(data);
  assert.equal(loaded.projects[0].money.V, null); assert.equal(loaded.projects[0].money.BC, -500);
  loaded.projects[0].money.O = 0; assert.equal(data.projects[0].money.O, 10000);
  for (const mutate of [d => { d.totals.O++; }, d => { d.projects[0].money.O = 1.5; },
    d => { d.projects[1].code = d.projects[0].code; }, d => { d.automationEnabled = true; },
    d => { d.projects[0].accountId = 'assistantA'; }]) {
    const invalid = fixture(); mutate(invalid); assert.throws(() => validateYear68Snapshot(invalid));
  }
});
test('query pages and filters without changing source', () => {
  const data = fixture(); const before = JSON.stringify(data);
  assert.equal(queryYear68(data, new URLSearchParams()).projects.length, 25);
  assert.equal(queryYear68(data, new URLSearchParams('offset=25')).projects.length, 5);
  assert.equal(queryYear68(data, new URLSearchParams('q=DEMO29')).matchedCount, 1);
  assert.equal(queryYear68(data, new URLSearchParams('q=missing')).matchedCount, 0);
  assert.equal(queryYear68(data, new URLSearchParams('offset=-1')).offset, 0);
  assert.equal(JSON.stringify(data), before);
});
test('reviewer audit preserves distinct source names and filters exact assignments including blanks', () => {
  const data = fixture();
  data.projects[0].responsibleName = '';
  data.projects[1].responsibleName = 'ผู้ตรวจตัวอย่าง 2';
  data.projects[2].responsibleName = ' ผู้ตรวจตัวอย่าง';
  const before = JSON.stringify(data);
  const groups = summarizeReviewers(data);
  assert.equal(groups.length, 4);
  assert.equal(groups.reduce((sum, g) => sum + g.projectCount, 0), 30);
  assert.ok(groups.every(g => g.accountMapped === false));
  assert.equal(queryYear68(data, new URLSearchParams({ reviewer: 'ผู้ตรวจตัวอย่าง' })).matchedCount, 27);
  assert.equal(queryYear68(data, new URLSearchParams({ reviewer: '' })).projects[0].code, 'DEMO0');
  assert.equal(queryYear68(data, new URLSearchParams({ reviewer: '', q: 'DEMO29' })).matchedCount, 0);
  assert.equal(queryYear68(data, new URLSearchParams({ reviewer: 'missing' })).matchedCount, 0);
  assert.equal(JSON.stringify(data), before);
});
test('HTTP imported snapshot is role-gated and cannot be edited through demo routes', async t => {
  const data = fixture(); const before = JSON.stringify(data);
  const server = createPilotServer({ year68Snapshot: data });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, cookie, body) => fetch(base + path, { method: body ? 'POST' : 'GET',
    headers: { Origin: base, Cookie: cookie || '', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await call('/api/year68')).status, 401);
  for (const role of ['head', 'secretary', 'assistantA']) {
    const login = await call('/api/session', '', { userId: role }); const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/api/year68', cookie)).status, role === 'assistantA' ? 403 : 200);
    assert.equal((await call('/api/year68', cookie, { amount: '1' })).status, 405);
    if (role === 'head') {
      assert.equal((await call('/api/amount', cookie, { projectId: data.projects[0].id, version: 1, amount: '1', reason: 'attempt' })).status, 404);
      const result = await (await call('/api/year68?offset=25', cookie)).json();
      assert.equal(result.projects.length, 5); assert.equal(result.projects[0].statuses.Y, 'ยังไม่เริ่มดำเนินการ');
    }
  }
  assert.equal(JSON.stringify(data), before);
});
