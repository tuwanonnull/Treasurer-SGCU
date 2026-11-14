import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { calculateMoney } from './finance.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createPersistentFinanceTrial } from './finance-store.mjs';
import { createPilotServer } from './server.mjs';
import { STATUS_GROUPS } from './statuses.mjs';

function fixture() {
  const projects = ['ONE', 'TWO'].map((code, i) => {
    const p = { id: `YEAR68:${i + 3}:${code}`, code, name: `โครงการ ${code}`, responsibleName: `ชื่อเดิม ${code}`, responsibleColumn: 'AI', accountId: null,
      statuses: { H: null, Q: null, Y: null, AZ: null, BA: null }, formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: null },
      money: { O: (i + 1) * 10000, V: null, AJ: null } };
    p.money = calculateMoney(p); return p;
  });
  return { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false, projects,
    totals: Object.fromEntries(Object.keys(projects[0].money).map(col => [col, projects.reduce((sum, p) => sum + (p.money[col] ?? 0), 0)])),
    verification: { projectCount: projects.length, moneyMismatchCount: 0 }, moneyLabels: { O: 'อนุมัติ' } };
}
const first = model => model.query('head').projects[0];
const assign = (model, assignee, index = 0) => { const p = model.query('head').projects[index]; return model.mutate('head', 'assign', { projectId: p.id, version: p.version, assignee, reason: 'มอบหมายเพื่อทดลองผู้ช่วย' }); };
const command = (model, field, value) => { const p = first(model); return { projectId: p.id, version: p.version, field, value, reason: 'ทดสอบสถานะผู้ช่วย' }; };
test('assistant reads only assigned projects, totals, names, requests and audit; cannot inject assignments or money', () => {
  const source = fixture(), model = createFinanceTrial(source);
  assign(model, 'assistantA'); assign(model, 'assistantB', 1);
  const a = model.query('assistantA'); const b = model.query('assistantB');
  assert.equal(a.totalCount, 1); assert.equal(a.projects[0].code, 'ONE'); assert.equal(a.totals.O, 10000); assert.equal(a.originalTotals.O, 10000);
  assert.equal(b.projects[0].code, 'TWO'); assert.equal(b.totals.O, 20000);
  assert.equal(JSON.stringify(a).includes('TWO'), false); assert.equal(JSON.stringify(b).includes('ONE'), false);
  assert.equal(model.query('assistantA', new URLSearchParams('q=TWO')).matchedCount, 0);
  const p = first(model);
  for (const action of ['assign', 'commit', 'propose', 'preview', 'approve', 'reject', 'reset']) assert.throws(() => model.mutate('assistantA', action, { projectId: p.id }), e => e.status === 403);
  assert.throws(() => model.mutate('secretary', 'assign', { projectId: p.id, version: p.version, assignee: 'assistantA', reason: 'ไม่มีสิทธิ์' }), e => e.status === 403);
  assert.throws(() => model.mutate('assistantB', 'status', command(model, 'Q', 'ผู้ช่วยตรวจสอบ')), e => e.status === 403);
  assert.throws(() => model.mutate('assistantA', 'status', { ...command(model, 'Q', 'ผู้ช่วยตรวจสอบ'), changes: { O: '1' } }), e => e.status === 400);
  assert.equal(source.projects[0].accountId, null); assert.equal(source.projects[0].responsibleName, 'ชื่อเดิม ONE');
});
test('all 57 assistant status targets follow independent matrix; AZ12 requires head review', () => {
  const direct = { Q: [1, 2, 3, 4], Y: [1, 2, 3], AZ: [1, 2, 3, 4, 7, 8] };
  let count = 0;
  for (const group of STATUS_GROUPS) for (const [i, value] of group.values.entries()) {
    count++; const model = createFinanceTrial(fixture()); assign(model, 'assistantA');
    const body = command(model, group.column, value);
    const mode = group.column === 'AZ' && i === 11 ? 'review' : direct[group.column]?.includes(i + 1) ? 'direct' : 'denied';
    assert.equal(model.query('assistantA').projectStatusPermissions[first(model).id][group.column][value], mode);
    if (mode === 'denied') { assert.throws(() => model.mutate('assistantA', 'status', body), e => e.status === 403); continue; }
    const result = model.mutate('assistantA', 'status', body);
    if (mode === 'review') { assert.equal(first(model).statuses.AZ, null); model.mutate('head', 'approve', { requestId: result.requestId, version: body.version }); }
    assert.equal(first(model).statuses[group.column], value);
    const restored = createFinanceTrial(fixture()); restored.importState(model.exportState()); assert.deepEqual(restored.query('assistantA'), model.query('assistantA'));
  }
  assert.equal(count, 57);
});
test('editor lock remembers all trial editors per field; reassignment cannot clear it', () => {
  const model = createFinanceTrial(fixture()); assign(model, 'assistantA');
  model.mutate('assistantA', 'status', command(model, 'Q', 'องค์กรกำลังดำเนินการ'));
  model.mutate('assistantA', 'status', command(model, 'Q', 'ผู้ช่วยตรวจสอบ'));
  model.mutate('secretary', 'status', command(model, 'Q', 'เลขาตรวจสอบ'));
  model.mutate('head', 'status', command(model, 'Q', 'องค์กรกำลังดำเนินการ'));
  assert.throws(() => model.mutate('assistantA', 'status', command(model, 'Q', 'ผู้ช่วยตรวจสอบ')), e => e.status === 403);
  model.mutate('assistantA', 'status', command(model, 'Y', 'ผู้ช่วยตรวจสอบ')); // Another field remains independent.
  assign(model, 'assistantB'); assert.throws(() => model.mutate('assistantB', 'status', command(model, 'Y', 'องค์กรกำลังดำเนินการ')), e => e.status === 403);
  assign(model, null); assign(model, 'assistantA');
  assert.throws(() => model.mutate('assistantA', 'status', command(model, 'Q', 'ผู้ช่วยตรวจสอบ')), e => e.status === 403);
  const restored = createFinanceTrial(fixture()); restored.importState(model.exportState()); assert.deepEqual(restored.query('assistantA'), model.query('assistantA'));
});
test('assistant cancellation stays pending and reassignment invalidates old request', () => {
  const model = createFinanceTrial(fixture()); assign(model, 'assistantA');
  model.mutate('head', 'status', command(model, 'AZ', 'ผ่านเหรัญญิก'));
  const request = model.mutate('assistantA', 'status', command(model, 'AZ', 'ยกเลิกโครงการ'));
  assert.equal(first(model).statuses.AZ, 'ผ่านเหรัญญิก');
  assign(model, 'assistantB'); assert.equal(model.query('assistantA').totalCount, 0);
  assert.throws(() => model.mutate('head', 'approve', { requestId: request.requestId, version: first(model).version }), e => e.status === 409 || e.status === 403);
  model.mutate('head', 'reject', { requestId: request.requestId, reason: 'เปลี่ยนผู้รับผิดชอบแล้ว' });
  const restored = createFinanceTrial(fixture()); restored.importState(model.exportState()); assert.equal(restored.query('assistantB').requests[0].state, 'rejected');
});
test('assignment and editor locks survive restart and backup recovery', t => {
  const source = fixture(), dir = fs.mkdtempSync(path.join(tmpdir(), 'sgcu-assistant-store-'));
  let store = createPersistentFinanceTrial(source, dir); t.after(() => { store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  assign(store, 'assistantA'); store.mutate('assistantA', 'status', command(store, 'Y', 'ผู้ช่วยตรวจสอบ'));
  store.mutate('secretary', 'status', command(store, 'Q', 'เลขาตรวจสอบ'));
  const before = store.query('head'), assistant = store.query('assistantA');
  store.close(); store = createPersistentFinanceTrial(source, dir); assert.deepEqual(store.query('assistantA'), assistant);
  assign(store, 'assistantB'); const state = store.query('head');
  const backup = state.persistence.backups.find(b => !before.persistence.backups.some(old => old.id === b.id)).id;
  store.mutate('head', 'restore', { backupId: backup, revision: state.revision });
  assert.equal(store.query('assistantA').totalCount, 1);
  assert.throws(() => store.mutate('assistantA', 'status', command(store, 'Q', 'ผู้ช่วยตรวจสอบ')), e => e.status === 403);
  store.mutate('assistantA', 'status', command(store, 'Y', 'องค์กรกำลังดำเนินการ'));
});
test('HTTP assistant scope and mutations are enforced by server, including money preview and reassignment', async t => {
  const server = createPilotServer({ year68Snapshot: fixture() }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, cookie = '') => fetch(base + route, { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const login = async userId => (await post('/api/session', { userId })).headers.get('set-cookie').split(';')[0];
  const head = await login('head'); const a = await login('assistantA'); const b = await login('assistantB');
  const read = async cookie => (await fetch(base + '/api/year68/trial', { headers: { Cookie: cookie } })).json();
  let p = (await read(head)).projects[0];
  assert.equal((await post('/api/year68/trial/assign', { projectId: p.id, version: p.version, assignee: 'assistantA', reason: 'ทดลอง HTTP' }, head)).status, 200);
  p = (await read(a)).projects[0]; assert.equal((await read(a)).totalCount, 1); assert.equal((await read(b)).totalCount, 0);
  const body = { projectId: p.id, version: p.version, field: 'Q', value: 'ผู้ช่วยตรวจสอบ', reason: 'ผู้ช่วยตรวจแล้ว' };
  assert.equal((await post('/api/year68/trial/status', body, b)).status, 403);
  assert.equal((await post('/api/year68/trial/preview', { projectId: p.id, version: p.version, changes: { O: '1' } }, a)).status, 403);
  assert.equal((await post('/api/year68/trial/assign', { projectId: p.id, version: p.version, assignee: 'assistantB', reason: 'แอบเปลี่ยนสิทธิ์' }, a)).status, 403);
  assert.equal((await post('/api/year68/trial/status', body, a)).status, 200);
});

test('compact restart preserves historical assistant locks per field and assignment', () => {
  const source = fixture(), model = createFinanceTrial(source);
  assign(model, 'assistantA');
  model.mutate('assistantA', 'status', command(model, 'Q', 'ผู้ช่วยตรวจสอบ'));
  model.mutate('secretary', 'status', command(model, 'Q', 'เลขาตรวจสอบ'));
  const compact = model.exportCompactState(), restored = createFinanceTrial(source);
  restored.importState(compact);
  assert.deepEqual(restored.query('assistantA').projectStatusPermissions, model.query('assistantA').projectStatusPermissions);
  assert.throws(() => restored.mutate('assistantA', 'status', command(restored, 'Q', 'องค์กรกำลังดำเนินการ')), e => e.status === 403);
  restored.mutate('assistantA', 'status', command(restored, 'Y', 'ผู้ช่วยตรวจสอบ'));
  const again = createFinanceTrial(source); again.importState(restored.exportCompactState());
  assign(again, 'assistantB');
  assert.throws(() => again.mutate('assistantB', 'status', command(again, 'Y', 'องค์กรกำลังดำเนินการ')), e => e.status === 403);
  assert.throws(() => restored.exportState(), /external history/);
  const bad = structuredClone(compact); bad.statusEditors[first(model).id].Q.push('unknown');
  assert.throws(() => createFinanceTrial(source).importState(bad), /Invalid/);
});
