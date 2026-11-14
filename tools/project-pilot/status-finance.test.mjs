import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { calculateMoney } from './finance.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createPersistentFinanceTrial } from './finance-store.mjs';
import { STATUS_GROUPS } from './statuses.mjs';

function fixture(statuses = {}) {
  const p = { id: 'YEAR68:3:TEST', code: 'TEST', name: 'ทดสอบสถานะ', responsibleColumn: 'AI', responsibleName: 'ตัวอย่าง', accountId: null,
    statuses: { H: 'รอแก้ไข', Q: null, Y: 'โครงการรับเงินแล้ว', AZ: null, BA: null, ...statuses },
    formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: 'เพิ่ม' }, money: { O: 10000, V: 1000, AJ: 5000 } };
  p.money = calculateMoney(p);
  return { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false, projects: [p],
    verification: { projectCount: 1, moneyMismatchCount: 0 }, totals: Object.fromEntries(Object.entries(p.money).map(([k, v]) => [k, v ?? 0])), moneyLabels: { O: 'อนุมัติ' } };
}
function body(model, field, value) {
  const p = model.query('head').projects[0]; return { projectId: p.id, version: p.version, field, value, reason: 'ทดสอบสถานะและผลต่อเงิน' };
}
test('approval status proposal leaves state unchanged until head approval, then updates loan and settlement together', () => {
  const source = fixture(), model = createFinanceTrial(source);
  const command = body(model, 'H', 'อนุมัติโครงการ'); const { reason, ...previewBody } = command;
  const preview = model.mutate('secretary', 'status-preview', previewBody);
  assert.equal(preview.mode, 'review'); assert.equal(preview.after.AE, 8000); assert.equal(preview.after.BC, -3000);
  const request = model.mutate('secretary', 'status', command);
  let state = model.query('head'); assert.equal(state.projects[0].statuses.H, 'รอแก้ไข'); assert.equal(state.projects[0].money.AE, null);
  model.mutate('head', 'approve', { requestId: request.requestId, version: command.version });
  state = model.query('head'); assert.equal(state.projects[0].statuses.H, 'อนุมัติโครงการ'); assert.equal(state.projects[0].money.AE, 8000);
  assert.equal(state.totals.BC, -3000); assert.deepEqual(state.audit.map(a => a.action), ['proposeStatus', 'approve']);
  const restored = createFinanceTrial(source); restored.importState(model.exportState()); assert.deepEqual(restored.query('head'), state);
  assert.equal(source.projects[0].statuses.H, 'รอแก้ไข');
});
test('all 57 targets enforce independent head/secretary matrix in integrated model', () => {
  const direct = { Q: [1, 2, 3, 4, 5], Y: [1, 2, 3, 4, 5, 6, 7, 8] };
  const review = { H: Array.from({ length: 14 }, (_, i) => i + 1), Q: [6, 7, 8, 9, 10, 11, 12, 13], Y: [11] };
  let targets = 0;
  for (const group of STATUS_GROUPS) for (const [i, value] of group.values.entries()) {
    targets++;
    for (const actor of ['head', 'secretary']) {
      const model = createFinanceTrial(fixture({ [group.column]: null })); const command = body(model, group.column, value);
      const expected = actor === 'head' || direct[group.column]?.includes(i + 1) ? 'direct' : review[group.column]?.includes(i + 1) ? 'review' : 'denied';
      if (expected === 'denied') { assert.throws(() => model.mutate(actor, 'status', command), e => e.status === 403); continue; }
      const result = model.mutate(actor, 'status', command); let state = model.query('head');
      if (expected === 'review') {
        assert.equal(state.projects[0].statuses[group.column], null);
        model.mutate('head', 'approve', { requestId: result.requestId, version: command.version }); state = model.query('head');
      }
      assert.equal(state.projects[0].statuses[group.column], value);
      assert.deepEqual(state.projects[0].money, calculateMoney(state.projects[0]));
    }
  }
  assert.equal(targets, 57);
});
test('direct secretary status invalidates pending money request, and money edit invalidates pending status request', () => {
  const model = createFinanceTrial(fixture({ H: 'อนุมัติโครงการ', Y: 'ยังไม่เริ่มดำเนินการ' }));
  let p = model.query('head').projects[0];
  const request = model.mutate('secretary', 'propose', { projectId: p.id, version: p.version, changes: { O: '200' }, reason: 'เสนอเงินก่อนเปลี่ยนสถานะ' });
  model.mutate('secretary', 'status', body(model, 'Y', 'ส่งกิจการนิสิตแล้ว รออนุมัติ'));
  let state = model.query('head'); assert.equal(state.projects[0].money.BC, -3000); assert.equal(state.requests[0].stale, true);
  assert.throws(() => model.mutate('head', 'approve', { requestId: request.requestId, version: state.projects[0].version }), e => e.status === 409);
  model.mutate('head', 'reject', { requestId: request.requestId, reason: 'ข้อมูลเก่าแล้ว' });
  const statusRequest = model.mutate('secretary', 'status', body(model, 'Q', 'อนุมัติการโอนงบประมาณโดยเหรัญญิก'));
  p = model.query('head').projects[0]; model.mutate('head', 'commit', { projectId: p.id, version: p.version, changes: { AJ: '70' }, reason: 'เปลี่ยนใช้จริง' });
  state = model.query('head'); assert.throws(() => model.mutate('head', 'approve', { requestId: statusRequest.requestId, version: state.projects[0].version }), e => e.status === 409);
  const restored = createFinanceTrial(fixture({ H: 'อนุมัติโครงการ', Y: 'ยังไม่เริ่มดำเนินการ' })); restored.importState(model.exportState()); assert.deepEqual(restored.query('head'), state);
});
test('reject invalid status, injected amounts and unauthorized actors without partial mutation', () => {
  const model = createFinanceTrial(fixture()); const before = model.exportState();
  const valid = body(model, 'H', 'อนุมัติโครงการ');
  for (const bad of [{ ...valid, money: { O: 0 } }, { ...valid, field: 'O' }, { ...valid, value: 'unknown' }, { ...valid, reason: 42 }]) assert.throws(() => model.mutate('head', 'status', bad), e => e.status === 400);
  assert.throws(() => model.mutate('assistantA', 'status', valid), e => e.status === 403);
  assert.deepEqual(model.exportState(), before);
});
test('persist mixed money/status history and pending status request, restore and approve after restart', t => {
  const source = fixture(); const dir = fs.mkdtempSync(path.join(tmpdir(), 'sgcu-status-store-'));
  let store = createPersistentFinanceTrial(source, dir); t.after(() => { store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  let p = store.query('head').projects[0]; store.mutate('head', 'commit', { projectId: p.id, version: p.version, changes: { O: '200' }, reason: 'แก้เงินก่อนสถานะ' });
  store.mutate('head', 'status', body(store, 'H', 'อนุมัติโครงการ'));
  const proposed = store.mutate('secretary', 'status', body(store, 'Q', 'อนุมัติการโอนงบประมาณโดยเหรัญญิก'));
  const beforeRestart = store.query('head'); store.close(); store = createPersistentFinanceTrial(source, dir);
  assert.deepEqual(store.query('head'), beforeRestart);
  store.mutate('head', 'approve', { requestId: proposed.requestId, version: beforeRestart.projects[0].version });
  const after = store.query('head'); assert.equal(after.projects[0].money.BF, 16000);
  const backup = after.persistence.backups.find(b => !beforeRestart.persistence.backups.some(old => old.id === b.id)).id;
  store.mutate('head', 'restore', { backupId: backup, revision: after.revision });
  const restored = store.query('head'); assert.equal(restored.requests[0].stale, false);
  store.mutate('head', 'approve', { requestId: proposed.requestId, version: restored.projects[0].version });
  assert.equal(store.query('head').projects[0].money.BF, 16000);
});
test('legacy checkpoints without status snapshots remain readable after a new status change', () => {
  const source = fixture(), model = createFinanceTrial(source); const p = model.query('head').projects[0];
  model.mutate('head', 'commit', { projectId: p.id, version: p.version, changes: { O: '200' }, reason: 'เหตุการณ์เงินรุ่นเดิม' });
  const legacy = model.exportState();
  for (const a of legacy.audit) { delete a.beforeStatuses; delete a.afterStatuses; }
  model.importState(legacy);
  model.mutate('head', 'status', body(model, 'H', 'อนุมัติโครงการ'));
  const reopened = createFinanceTrial(source); reopened.importState(model.exportState());
  assert.deepEqual(reopened.query('head'), model.query('head'));
});
