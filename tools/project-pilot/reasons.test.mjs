import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { validateReason, isCancellationStatus } from './reasons.mjs';
import { calculateMoney } from './finance.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createPersistentFinanceTrial } from './finance-store.mjs';
import { createModel } from './model.mjs';

function fixture() {
  const p = { id: 'YEAR68:3:ONE', code: 'ONE', name: 'ทดสอบเหตุผล', responsibleName: '', responsibleColumn: 'AI', accountId: null,
    statuses: { H: null, Q: null, Y: null, AZ: null, BA: null },
    formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: null }, money: { O: 10000, V: null, AJ: null } };
  p.money = calculateMoney(p);
  return { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false, projects: [p],
    totals: Object.fromEntries(Object.entries(p.money).map(([k, v]) => [k, v ?? 0])), verification: { projectCount: 1, moneyMismatchCount: 0 }, moneyLabels: { O: 'อนุมัติ' } };
}
const current = m => m.query('head').projects[0];
const status = (m, field, value) => ({ projectId: current(m).id, version: current(m).version, field, value });
test('optional reason accepts omission and blanks; required reason and invalid input retain validation', () => {
  for (const value of [undefined, '', '   ']) assert.equal(validateReason(value, false), '');
  assert.equal(validateReason(' ก ', false), 'ก');
  for (const value of [undefined, '', '  ', 'ab']) assert.throws(() => validateReason(value), e => e.status === 400);
  for (const value of [null, 42, {}, 'x'.repeat(1001)]) assert.throws(() => validateReason(value, false), e => e.status === 400);
  for (const [field, value] of [['H', 'ยกเลิกโครงการ'], ['AZ', 'ยกเลิกโครงการ'], ['Y', 'ยกเลิก']]) assert.equal(isCancellationStatus(field, value), true);
  assert.equal(isCancellationStatus('H', 'รอแก้ไข'), false);
});
test('optional assignment and status reasons survive restart, approval and backup restore with complete audit', t => {
  const source = fixture(), dir = fs.mkdtempSync(path.join(tmpdir(), 'sgcu-optional-reasons-'));
  let m = createPersistentFinanceTrial(source, dir); t.after(() => { m.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  m.mutate('head', 'assign', { projectId: current(m).id, version: current(m).version, assignee: 'assistantA' });
  m.mutate('assistantA', 'status', status(m, 'Q', 'ผู้ช่วยตรวจสอบ'));
  const proposed = m.mutate('secretary', 'status', status(m, 'H', 'อนุมัติโครงการ'));
  const before = m.query('head'); assert.ok(before.audit.every(a => a.reason === '')); assert.equal(before.requests[0].reason, '');
  m.close(); m = createPersistentFinanceTrial(source, dir); assert.deepEqual(m.query('head'), before);
  m.mutate('head', 'approve', { requestId: proposed.requestId, version: current(m).version });
  let state = m.query('head'); assert.equal(state.projects[0].money.AE, 8000); assert.equal(state.audit.at(-1).reason, '');
  const backup = state.persistence.backups.find(b => !before.persistence.backups.some(old => old.id === b.id)).id;
  m.mutate('head', 'restore', { backupId: backup, revision: state.revision });
  state = m.query('head'); assert.equal(state.requests[0].state, 'pending'); assert.equal(state.audit.at(-1).action, 'restore');
  m.mutate('head', 'approve', { requestId: proposed.requestId, version: current(m).version });
});
test('money changes, all cancellation fields and rejection still require reasons before changing state', () => {
  const m = createFinanceTrial(fixture());
  const before = m.exportState();
  for (const [field, value] of [['H', 'ยกเลิกโครงการ'], ['Y', 'ยกเลิก'], ['AZ', 'ยกเลิกโครงการ']]) {
    for (const reason of [undefined, '', '  ']) assert.throws(() => m.mutate('head', 'status', { ...status(m, field, value), reason }), e => e.status === 400);
  }
  const amount = { projectId: current(m).id, version: current(m).version, changes: { O: '200' } };
  assert.throws(() => m.mutate('head', 'commit', amount), e => e.status === 400);
  assert.throws(() => m.mutate('secretary', 'propose', amount), e => e.status === 400);
  assert.deepEqual(m.exportState(), before);
  const request = m.mutate('secretary', 'status', status(m, 'H', 'อนุมัติโครงการ'));
  assert.throws(() => m.mutate('head', 'reject', { requestId: request.requestId }), e => e.status === 400);
  m.mutate('head', 'reject', { requestId: request.requestId, reason: 'ตรวจเอกสารใหม่' });
  assert.equal(m.query('head').requests[0].reviewReason, 'ตรวจเอกสารใหม่');
  m.mutate('head', 'assign', { projectId: current(m).id, version: current(m).version, assignee: 'assistantA' });
  assert.throws(() => m.mutate('assistantA', 'status', status(m, 'AZ', 'ยกเลิกโครงการ')), e => e.status === 400);
  const cancellation = m.mutate('assistantA', 'status', { ...status(m, 'AZ', 'ยกเลิกโครงการ'), reason: 'ผู้จัดขอยกเลิก' });
  m.mutate('head', 'approve', { requestId: cancellation.requestId, version: current(m).version });
  assert.equal(current(m).statuses.AZ, 'ยกเลิกโครงการ');
});
test('two-project demo follows the same reason policy and records direct status notes', () => {
  const m = createModel(); const p = m.snapshot('head').projects[0];
  const base = { projectId: p.id, version: p.version, field: 'approval', status: 'อนุมัติโครงการ' };
  m.mutate('secretary', 'status', base); const request = m.snapshot('head').requests[0];
  assert.equal(request.reason, ''); m.mutate('head', 'approve', { requestId: request.id, version: p.version });
  const next = m.snapshot('head').projects[0];
  assert.throws(() => m.mutate('head', 'status', { ...base, version: next.version, status: 'ยกเลิกโครงการ' }), e => e.status === 400);
  m.mutate('head', 'status', { ...base, version: next.version, status: 'รอแก้ไข', reason: 'ขอแก้เอกสาร' });
  assert.equal(m.snapshot('head').audit.at(-1).reason, 'ขอแก้เอกสาร');
});
