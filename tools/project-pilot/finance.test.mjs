import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMoney, previewMoney } from './finance.mjs';
import { createPilotServer } from './server.mjs';

function project() {
  const p = { id: 'YEAR68:3:TEST', code: 'TEST', name: 'ตัวอย่างสูตร', responsibleName: 'ตัวอย่าง', responsibleColumn: 'AI', accountId: null,
    statuses: { H: 'อนุมัติโครงการ', Q: '', Y: 'โครงการรับเงินแล้ว', AZ: '', BA: '' },
    formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: null },
    money: { O: 10000, V: null, AJ: 5000 } };
  p.money = calculateMoney(p); return p;
}
test('dependent amounts follow approved budget, transfer status, and actual expense without mutation', () => {
  const p = project(); const original = structuredClone(p);
  const result = previewMoney(p, { O: '200.00', V: '10.01', U: 'ลด', AJ: '50.01' });
  assert.deepEqual(result.after, { O: 20000, V: 1001, W: 18999, AE: 16000, AJ: 5001, BC: -10999, BE: 5001, BF: 14999 });
  assert.equal(result.saved, false); assert.deepEqual(p, original);
  p.statuses.Q = 'กระบวนการโอนงบประมาณมีผลบังคับใช้';
  assert.equal(calculateMoney(p, result.after, 'ลด').BF, 13998);
});
test('half-up rates use exact integers including fractional satang ties', () => {
  const p = project(); p.money.O = 1; p.formulaInputs.advanceRate = '50';
  assert.equal(calculateMoney(p).AE, 1);
  p.formulaInputs.advanceRate = '49.999999999999999999'; assert.equal(calculateMoney(p).AE, 0);
  p.formulaInputs.advanceRate = '-50'; assert.equal(calculateMoney(p).AE, -1);
  p.money.O = 99999999999; p.formulaInputs.advanceRate = '80'; assert.equal(calculateMoney(p).AE, 79999999999);
});
test('blank inputs, zero and loan eligibility preserve spreadsheet semantics', () => {
  const p = project();
  const blank = previewMoney(p, { O: '', V: '', AJ: '' }).after;
  assert.deepEqual(blank, { O: null, V: null, W: null, AE: 0, AJ: null, BC: 0, BE: 0, BF: 0 });
  p.statuses.H = ''; p.statuses.Y = ''; p.formulaInputs.hasLoanDocument = false;
  assert.equal(calculateMoney(p).AE, null); assert.equal(calculateMoney(p).BC, null);
  p.formulaInputs.hasLoanDocument = true; assert.equal(calculateMoney(p).AE, 8000);
  p.formulaInputs.advanceRate = '0'; assert.equal(calculateMoney(p).AE, 0);
  p.money.V = 0; assert.throws(() => calculateMoney(p), e => e.status === 400);
});
test('reject derived-field injection, excessive precision, invalid direction and baseline mismatches', () => {
  const p = project();
  for (const changes of [{ AE: '1' }, { O: '1.001' }, { O: '-1' }, { O: 1 }, { AJ: '1e3' }, { V: '1', U: '' }, { U: 'unknown' }, null, []]) {
    assert.throws(() => previewMoney(p, changes), e => e.status === 400);
  }
  p.money.BF++;
  assert.throws(() => previewMoney(p, {}), e => e.status === 400);
});
test('HTTP preview requires authorized session and origin, never writes snapshot', async t => {
  const p = project();
  const snapshot = { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false,
    projects: [p], verification: { projectCount: 1, moneyMismatchCount: 0 }, totals: Object.fromEntries(Object.entries(p.money).map(([col, amount]) => [col, amount ?? 0])) };
  const before = structuredClone(snapshot);
  const server = createPilotServer({ year68Snapshot: snapshot });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, cookie = '', origin = base) => fetch(base + route, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const body = { projectId: p.id, changes: { O: '200' } };
  assert.equal((await post('/api/year68/preview', body)).status, 401);
  for (const userId of ['head', 'secretary', 'assistantA']) {
    const login = await post('/api/session', { userId }); const cookie = login.headers.get('set-cookie').split(';')[0];
    const response = await post('/api/year68/preview', body, cookie);
    assert.equal(response.status, userId === 'assistantA' ? 403 : 200);
    if (userId === 'assistantA') continue;
    const result = await response.json(); assert.equal(result.after.AE, 16000); assert.equal(result.saved, false);
    assert.equal((await post('/api/year68/preview', body, cookie, 'https://example.com')).status, 403);
    assert.equal((await post('/api/year68/preview', { ...body, role: 'head' }, cookie)).status, 400);
    assert.equal((await post('/api/year68/preview', { ...body, changes: { BF: '0' } }, cookie)).status, 400);
    const state = await (await fetch(base + '/api/year68', { headers: { Cookie: cookie } })).json();
    assert.deepEqual(state.projects[0].money, before.projects[0].money);
  }
  assert.deepEqual(snapshot, before);
});
