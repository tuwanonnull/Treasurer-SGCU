import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { calculateMoney } from './finance.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createPersistentFinanceTrial } from './finance-store.mjs';
import { createPortableBackup, validatePortableBackup } from './portable-backup.mjs';
import { restorePortableBackup } from './restore-portable.mjs';
import { createPilotServer } from './server.mjs';

function fixture() {
  const p = { id: 'YEAR68:3:ONE', code: 'ONE', name: 'ทดสอบสำรอง', responsibleName: 'ชื่อจากไฟล์', responsibleColumn: 'AI', accountId: null,
    statuses: { H: null, Q: null, Y: null, AZ: null, BA: null },
    formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: null }, money: { O: 10000, V: null, AJ: null } };
  p.money = calculateMoney(p);
  return { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false, projects: [p],
    totals: Object.fromEntries(Object.entries(p.money).map(([k, v]) => [k, v ?? 0])), verification: { projectCount: 1, moneyMismatchCount: 0 }, moneyLabels: { O: 'อนุมัติ' } };
}
function prepare(source) {
  const model = createFinanceTrial(source), project = () => model.query('head').projects[0];
  model.mutate('head', 'assign', { projectId: project().id, version: project().version, assignee: 'assistantA' });
  model.mutate('assistantA', 'status', { projectId: project().id, version: project().version, field: 'Q', value: 'ผู้ช่วยตรวจสอบ' });
  model.mutate('secretary', 'status', { projectId: project().id, version: project().version, field: 'H', value: 'อนุมัติโครงการ' });
  return model;
}
const temporary = t => { const root = fs.mkdtempSync(path.join(tmpdir(), 'sgcu-portable-test-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root; };
test('portable backup restores source, assignments, money, status, pending requests and audit in a new directory', t => {
  const source = fixture(), model = prepare(source), before = model.exportState();
  const bundle = createPortableBackup(source, before), bytes = JSON.stringify(bundle);
  const root = temporary(t), target = path.join(root, 'restored');
  const result = restorePortableBackup(JSON.parse(bytes), target); assert.equal(result.projectCount, 1);
  assert.equal(result.requests, 1); assert.equal(result.auditEvents, before.audit.length + 1);
  const restoredSource = JSON.parse(fs.readFileSync(path.join(target, 'snapshot.json'), 'utf8')); assert.deepEqual(restoredSource, source);
  const restored = createPersistentFinanceTrial(restoredSource, target); t.after(() => restored.close());
  const state = restored.query('head'), p = state.projects[0];
  assert.deepEqual(state.totals, before.data.totals); assert.deepEqual(p.statuses, before.data.projects[0].statuses); assert.equal(p.trialAssignee, 'assistantA');
  assert.deepEqual(state.audit.slice(0, -1), before.audit); assert.equal(state.audit.at(-1).action, 'restore');
  assert.equal(state.requests[0].stale, false); assert.notEqual(p.version, before.data.projects[0].version);
  assert.throws(() => restored.mutate('head', 'approve', { requestId: state.requests[0].id, version: before.data.projects[0].version }), e => e.status === 409);
  restored.mutate('head', 'approve', { requestId: state.requests[0].id, version: p.version });
  assert.equal(restored.query('head').projects[0].money.AE, 8000);
  assert.equal(fs.statSync(target).mode & 0o777, 0o700); assert.equal(fs.statSync(path.join(target, 'snapshot.json')).mode & 0o777, 0o600);
  assert.deepEqual(model.exportState(), before); assert.equal(JSON.stringify(bundle), bytes);
});
test('restore rejects corruption, mismatched source, existing destinations and repository paths', t => {
  const source = fixture(), model = prepare(source), valid = createPortableBackup(source, model.exportState()), root = temporary(t);
  const target = path.join(root, 'new');
  const corrupted = structuredClone(valid); corrupted.payload.checkpoint.data.projects[0].money.O++;
  assert.throws(() => restorePortableBackup(corrupted, target)); assert.equal(fs.existsSync(target), false);
  corrupted.checksum = createHash('sha256').update(JSON.stringify(corrupted.payload)).digest('hex');
  assert.throws(() => restorePortableBackup(corrupted, target)); assert.equal(fs.existsSync(target), false);
  const wrongSource = structuredClone(valid); wrongSource.payload.source.projects[0].name = 'wrong';
  wrongSource.checksum = createHash('sha256').update(JSON.stringify(wrongSource.payload)).digest('hex');
  assert.throws(() => validatePortableBackup(wrongSource));
  fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'keep.txt'), 'unchanged');
  assert.throws(() => restorePortableBackup(valid, target), /already exists/); assert.equal(fs.readFileSync(path.join(target, 'keep.txt'), 'utf8'), 'unchanged');
  assert.throws(() => restorePortableBackup(valid, path.resolve('tools/project-pilot/private-backup-test')), /outside the repository/);
});
test('interrupted restore cannot be opened as a fresh empty trial', t => {
  const source = fixture(), model = prepare(source), bundle = createPortableBackup(source, model.exportState()), root = temporary(t);
  const target = path.join(root, 'incomplete'), rename = fs.renameSync;
  const mock = t.mock.method(fs, 'renameSync', (from, to) => { if (to === path.join(target, 'state.json')) throw new Error('simulated disk error'); return rename(from, to); });
  assert.throws(() => restorePortableBackup(bundle, target), /Restore incomplete/); mock.mock.restore();
  assert.throws(() => createPersistentFinanceTrial(source, target), /Restore incomplete/);
  assert.equal(fs.existsSync(path.join(target, 'state.json')), false);
  const result = restorePortableBackup(bundle, path.join(root, 'retry')); assert.equal(result.projectCount, 1);
});
test('only head can download the complete backup; download does not change current state', async t => {
  const server = createPilotServer({ year68Snapshot: fixture() }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/year68/trial/backup')).status, 401);
  for (const userId of ['head', 'secretary', 'assistantA']) {
    const login = await fetch(base + '/api/session', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    const cookie = login.headers.get('set-cookie').split(';')[0], headers = { Cookie: cookie };
    const before = await (await fetch(base + '/api/year68/trial', { headers })).json();
    const response = await fetch(base + '/api/year68/trial/backup', { headers });
    assert.equal(response.status, userId === 'head' ? 200 : 403);
    if (userId === 'head') {
      assert.match(response.headers.get('content-disposition'), /attachment/); assert.equal(response.headers.get('cache-control'), 'no-store');
      const checked = validatePortableBackup(await response.json()); assert.equal(checked.source.projects.length, 1);
    }
    const after = await (await fetch(base + '/api/year68/trial', { headers })).json(); assert.deepEqual(after, before);
  }
});
