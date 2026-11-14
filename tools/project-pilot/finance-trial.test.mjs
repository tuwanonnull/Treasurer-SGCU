import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMoney } from './finance.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { materializeCheckpoint } from './history-storage.mjs';
import { USERS } from './model.mjs';
import { createPilotServer } from './server.mjs';

function fixture() {
  const p = { id: 'YEAR68:3:TEST', code: 'TEST', name: 'ทดสอบ', responsibleColumn: 'AI', responsibleName: 'ผู้ตรวจ', accountId: null,
    statuses: { H: 'อนุมัติโครงการ', Q: 'กระบวนการโอนงบประมาณมีผลบังคับใช้', Y: 'โครงการรับเงินแล้ว', AZ: '', BA: '' },
    formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: 'เพิ่ม' }, money: { O: 10000, V: 1000, AJ: 5000 } };
  p.money = calculateMoney(p);
  return { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false, projects: [p],
    verification: { projectCount: 1, moneyMismatchCount: 0 }, totals: { ...p.money }, moneyLabels: { O: 'งบอนุมัติ', AJ: 'ใช้จริง' } };
}
test('proposal then approval atomically updates all money, totals and audit without touching source', () => {
  const source = fixture(), before = structuredClone(source), model = createFinanceTrial(source);
  const initial = model.query('head'); const p = initial.projects[0];
  const body = { projectId: p.id, version: p.version, changes: { O: '200', V: '20', U: 'ลด', AJ: '90' }, reason: 'ทดสอบสูตรทั้งหมด' };
  const proposed = model.mutate('secretary', 'propose', body);
  assert.deepEqual(model.query('head').projects[0].money, p.money);
  model.mutate('head', 'approve', { requestId: proposed.requestId, version: p.version });
  const state = model.query('head');
  assert.deepEqual(state.projects[0].money, { O: 20000, V: 2000, W: 18000, AE: 16000, AJ: 9000, BC: -7000, BE: 9000, BF: 9000 });
  assert.deepEqual(state.totals, state.projects[0].money);
  assert.equal(state.projects[0].formulaInputs.transferDirection, 'ลด');
  assert.notEqual(state.projects[0].version, p.version);
  assert.deepEqual(state.audit.map(a => a.action), ['propose', 'approve']);
  assert.deepEqual(source, before);
  assert.throws(() => model.mutate('head', 'approve', { requestId: proposed.requestId, version: state.projects[0].version }), e => e.status === 409);
});
test('stale approval and direct writes fail without partial updates; rejection preserves committed totals', () => {
  const model = createFinanceTrial(fixture()); const p = model.query('head').projects[0];
  const request = model.mutate('secretary', 'propose', { projectId: p.id, version: p.version, changes: { O: '200' }, reason: 'เสนอทดลอง' });
  assert.throws(() => model.mutate('secretary', 'propose', { projectId: p.id, version: p.version, changes: { O: '300' }, reason: 'เสนอซ้ำ' }), e => e.status === 409);
  model.mutate('head', 'commit', { projectId: p.id, version: p.version, changes: { O: '300' }, reason: 'แก้ตรงก่อนอนุมัติ' });
  const after = model.query('head'); assert.equal(after.requests[0].stale, true);
  assert.throws(() => model.mutate('head', 'approve', { requestId: request.requestId, version: after.projects[0].version }), e => e.status === 409);
  assert.throws(() => model.mutate('head', 'commit', { projectId: p.id, version: p.version, changes: { O: '400' }, reason: 'หน้าจอเก่า' }), e => e.status === 409);
  assert.deepEqual(model.query('head'), after);
  model.mutate('head', 'reject', { requestId: request.requestId, reason: 'ข้อมูลเปลี่ยนแล้ว' });
  assert.deepEqual(model.query('head').totals, after.totals);
});
test('roles, field injection, reason, snapshots and reset cannot bypass workflow', () => {
  const model = createFinanceTrial(fixture()); const initial = model.query('head'); const p = initial.projects[0];
  const body = { projectId: p.id, version: p.version, changes: { O: '200' }, reason: 'ทดสอบสิทธิ์' };
  assert.throws(() => model.query(null), e => e.status === 401);
  for (const id of ['assistantA', 'assistantB']) { const view = model.query(id); assert.equal(view.projects.length, 0); assert.equal(view.totalCount, 0); assert.equal(view.audit.length, 0); }
  assert.throws(() => model.mutate('secretary', 'commit', body), e => e.status === 403);
  assert.throws(() => model.mutate('head', 'propose', body), e => e.status === 403);
  assert.throws(() => model.mutate('head', 'commit', { ...body, after: { AE: 0 } }), e => e.status === 400);
  assert.throws(() => model.mutate('head', 'commit', { ...body, changes: { AE: '0' } }), e => e.status === 400);
  assert.throws(() => model.mutate('head', 'commit', { ...body, reason: '' }), e => e.status === 400);
  assert.throws(() => model.mutate('head', 'commit', { ...body, changes: { O: '100' } }), e => e.status === 400);
  assert.deepEqual(model.query('head'), initial);
  initial.projects[0].money.O = 0; assert.equal(model.query('head').projects[0].money.O, 10000);
  model.mutate('head', 'commit', body);
  assert.throws(() => model.mutate('head', 'reset', { revision: initial.revision }), e => e.status === 409);
  assert.throws(() => model.mutate('secretary', 'reset', { revision: model.query('head').revision }), e => e.status === 403);
  model.mutate('head', 'reset', { revision: model.query('head').revision });
  const reset = model.query('head'); assert.equal(reset.projects[0].money.O, 10000); assert.equal(reset.audit.length, 0);
  assert.equal(reset.requests.length, 0); assert.notEqual(reset.projects[0].version, p.version);
  assert.throws(() => model.mutate('head', 'commit', body), e => e.status === 409);
});
test('HTTP trial writes isolated data and enforces session, origin, and roles', async t => {
  const source = fixture(); const server = createPilotServer({ year68Snapshot: source });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, cookie = '', origin = base) => fetch(base + route, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await fetch(base + '/api/year68/trial')).status, 401);
  for (const userId of ['head', 'secretary', 'assistantA']) {
    const login = await post('/api/session', { userId }); const cookie = login.headers.get('set-cookie').split(';')[0];
    const stateResponse = await fetch(base + '/api/year68/trial', { headers: { Cookie: cookie } });
    assert.equal(stateResponse.status, 200);
    const body = { projectId: 'TEST68:3:TEST', changes: { O: '200' }, reason: 'ทดลอง API' };
    if (userId !== 'assistantA') body.version = (await stateResponse.json()).projects[0].version;
    else assert.equal((await stateResponse.json()).projects.length, 0);
    assert.equal((await post('/api/year68/trial/commit', body, cookie, 'https://example.com')).status, 403);
    const response = await post('/api/year68/trial/commit', body, cookie);
    assert.equal(response.status, userId === 'head' ? 200 : 403);
    if (userId === 'head') {
      const readonly = await (await fetch(base + '/api/year68', { headers: { Cookie: cookie } })).json();
      assert.deepEqual(readonly.projects[0].money, source.projects[0].money);
      const trial = await (await fetch(base + '/api/year68/trial', { headers: { Cookie: cookie } })).json();
      assert.equal(trial.projects[0].money.O, 20000); assert.equal(trial.projects[0].money.AE, 16000);
    }
  }
});

test('large archived history reconstructs exactly and pending approval survives compact restart', () => {
  const source = fixture(), model = createFinanceTrial(source);
  for (let i = 0; i < 1100; i++) {
    const p = model.query('head').projects[0];
    model.mutate('head', 'commit', { projectId: p.id, version: p.version, changes: { O: String(1000 + i) }, reason: 'ทดสอบประวัติระยะยาว' });
  }
  const p = model.query('head').projects[0];
  const proposed = model.mutate('secretary', 'propose', { projectId: p.id, version: p.version, changes: { O: '999' }, reason: 'รออนุมัติหลังเปิดใหม่' });
  const full = model.exportState(), compact = model.exportCompactState();
  assert.ok(Buffer.byteLength(JSON.stringify(full)) > 750000);
  assert.ok(Buffer.byteLength(JSON.stringify(compact)) < 10000);
  assert.deepEqual(materializeCheckpoint(source, USERS, compact, full.requests, full.audit), full);
  const restarted = createFinanceTrial(source); restarted.importState(compact);
  restarted.mutate('head', 'approve', { requestId: proposed.requestId, version: p.version });
  const delta = restarted.exportIncremental();
  assert.equal(delta.events.length, 1); assert.equal(delta.requests[0].state, 'approved'); assert.equal(delta.checkpoint.requests.length, 0);
  const recovered = materializeCheckpoint(source, USERS, delta.checkpoint, delta.requests, [...full.audit, ...delta.events]);
  assert.equal(recovered.requests[0].state, 'approved'); assert.equal(recovered.audit.length, full.audit.length + 1);
  const tampered = structuredClone(compact); tampered.statusEditors[p.id].H = ['head'];
  assert.throws(() => materializeCheckpoint(source, USERS, tampered, full.requests, full.audit), /does not match/);
});
