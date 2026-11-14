import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { calculateMoney } from './finance.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createPersistentFinanceTrial } from './finance-store.mjs';

function fixture() {
  const p = { id: 'YEAR68:3:TEST', code: 'TEST', name: 'ทดสอบ', responsibleColumn: 'AI', responsibleName: 'ผู้ตรวจ', accountId: null,
    statuses: { H: 'อนุมัติโครงการ', Q: '', Y: 'โครงการรับเงินแล้ว', AZ: '', BA: '' },
    formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: null }, money: { O: 10000, V: null, AJ: 5000 } };
  p.money = calculateMoney(p);
  return { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false, projects: [p],
    verification: { projectCount: 1, moneyMismatchCount: 0 }, totals: Object.fromEntries(Object.entries(p.money).map(([k, v]) => [k, v ?? 0])), moneyLabels: { O: 'อนุมัติ' } };
}
const directory = t => { const dir = fs.mkdtempSync(path.join(tmpdir(), 'sgcu-store-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const command = (store, amount) => { const p = store.query('head').projects[0]; return { projectId: p.id, version: p.version, changes: { O: amount }, reason: 'ทดสอบบันทึกถาวรในเครื่อง' }; };

test('restart preserves money, pending requests and audit; recovery rotates versions and preserves valid pending proposals', t => {
  const source = fixture(), original = structuredClone(source), dir = directory(t);
  let store = createPersistentFinanceTrial(source, dir); t.after(() => store.close());
  const proposal = store.mutate('secretary', 'propose', command(store, '200'));
  const pending = store.query('head'); store.close();
  store = createPersistentFinanceTrial(source, dir);
  assert.deepEqual(store.query('head'), pending);
  store.mutate('head', 'approve', { requestId: proposal.requestId, version: pending.projects[0].version });
  const pendingBackup = store.query('head').persistence.backups.find(b => !pending.persistence.backups.some(old => old.id === b.id)).id;
  store.mutate('head', 'commit', command(store, '300'));
  const preRestore = store.query('head');
  assert.throws(() => store.mutate('secretary', 'restore', { backupId: pendingBackup, revision: preRestore.revision }), e => e.status === 403);
  store.mutate('head', 'restore', { backupId: pendingBackup, revision: preRestore.revision });
  const restored = store.query('head'); assert.equal(restored.projects[0].money.O, 10000);
  assert.equal(restored.requests[0].state, 'pending'); assert.equal(restored.requests[0].stale, false);
  assert.notEqual(restored.projects[0].version, pending.projects[0].version);
  assert.equal(restored.audit.at(-1).action, 'restore');
  assert.throws(() => store.mutate('head', 'approve', { requestId: proposal.requestId, version: pending.projects[0].version }), e => e.status === 409);
  store.mutate('head', 'approve', { requestId: proposal.requestId, version: restored.projects[0].version });
  store.close(); store = createPersistentFinanceTrial(source, dir);
  assert.equal(store.query('head').projects[0].money.O, 20000);
  assert.deepEqual(source, original);
  assert.equal(fs.statSync(path.join(dir, 'state.json')).mode & 0o777, 0o600);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
});
test('failed disk commit leaves both memory and acknowledged state unchanged', t => {
  const dir = directory(t), store = createPersistentFinanceTrial(fixture(), dir); t.after(() => store.close());
  const before = store.query('head'); const bytes = fs.readFileSync(path.join(dir, 'state.json'), 'utf8');
  const rename = fs.renameSync;
  const mock = t.mock.method(fs, 'renameSync', (from, to) => { if (to === path.join(dir, 'state.json')) throw new Error('simulated disk failure'); return rename(from, to); });
  assert.throws(() => store.mutate('head', 'commit', command(store, '200')), /simulated disk failure/);
  mock.mock.restore();
  const after = store.query('head'); assert.deepEqual(after.projects, before.projects); assert.deepEqual(after.audit, before.audit); assert.equal(after.revision, before.revision);
  assert.equal(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'), bytes);
  assert.equal(fs.readdirSync(dir).some(name => name.endsWith('.tmp')), false);
});
test('corrupt main file refuses startup and supports explicit recovery; corrupt backup and traversal are rejected', t => {
  const dir = directory(t), source = fixture(); let store = createPersistentFinanceTrial(source, dir); t.after(() => store.close());
  store.mutate('head', 'commit', command(store, '200'));
  const backup = store.query('head').persistence.backups[0].id;
  const backupFile = path.join(dir, backup); const backupBytes = fs.readFileSync(backupFile, 'utf8');
  const before = store.query('head'); fs.writeFileSync(backupFile, '{}');
  assert.throws(() => store.mutate('head', 'restore', { backupId: backup, revision: before.revision }), /checksum/);
  assert.equal(store.query('head').revision, before.revision);
  assert.throws(() => store.mutate('head', 'restore', { backupId: '../state.json', revision: before.revision }), e => e.status === 400);
  fs.writeFileSync(backupFile, backupBytes); store.close();
  fs.writeFileSync(path.join(dir, 'state.json'), '{broken');
  assert.throws(() => createPersistentFinanceTrial(source, dir));
  assert.equal(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'), '{broken');
  store = createPersistentFinanceTrial(source, dir, { restoreBackup: backup });
  assert.equal(store.query('head').projects[0].money.O, 10000);
  assert.equal(store.query('head').audit.at(-1).action, 'restore');
});
test('single writer lock, retention, source identity and checkpoint financial validation', t => {
  const source = fixture(), dir = directory(t), store = createPersistentFinanceTrial(source, dir); t.after(() => store.close());
  assert.throws(() => createPersistentFinanceTrial(source, dir), /already in use/);
  for (let i = 0; i < 22; i++) store.mutate('head', 'commit', command(store, String(200 + i)));
  assert.equal(store.query('head').persistence.backups.length, 20);
  store.close(); const changed = structuredClone(source); changed.projects[0].name = 'อีกไฟล์';
  assert.throws(() => createPersistentFinanceTrial(changed, dir), /checkpoint/);
  const model = createFinanceTrial(source); const valid = model.exportState();
  for (const mutate of [s => s.data.projects[0].money.AE++, s => s.data.totals.O++, s => s.data.projects[0].statuses.H = '', s => s.sourceHash = 'bad']) {
    const invalid = structuredClone(valid); mutate(invalid); assert.throws(() => model.importState(invalid));
    assert.deepEqual(model.exportState(), valid);
  }
});
