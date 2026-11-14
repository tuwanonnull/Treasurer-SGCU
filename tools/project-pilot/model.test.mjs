import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, parseMoney } from './model.mjs';
import { createPilotServer } from './server.mjs';
import { readFileSync } from 'node:fs';
import { STATUS_GROUPS } from './statuses.mjs';
import { automaticStatusChanges, bangkokDay, calendarDay } from './automation.mjs';

const projectId = 'DEMO-68-001';
const proposal = { projectId, version: 1, amount: '12000.25', reason: 'ปรับตามเอกสารอนุมัติ' };
const fails = (fn, status) => assert.throws(fn, error => error.status === status);

test('automatic criteria use Bangkok dates, strict overdue boundaries and original statuses', () => {
  const now = Date.parse('2026-11-14T03:00:00Z');
  const p = { statusFields: { transfer: '', advance: 'ยังไม่เริ่มดำเนินการ' }, lastWorkDate: '2026-11-22', closeDueDate: '2026-11-14' };
  assert.deepEqual(automaticStatusChanges(p, now), []); // Both exactly due today.
  assert.equal(automaticStatusChanges({ ...p, lastWorkDate: '2026-11-21' }, now)[0].value, 'สำรองจ่ายก่อน');
  assert.equal(automaticStatusChanges({ ...p, closeDueDate: '2026-11-13' }, now)[0].value, 'ไม่เข้ากระบวนการโอนงบประมาณ');
  assert.deepEqual(automaticStatusChanges({ ...p, lastWorkDate: '', closeDueDate: '2026-02-30' }, now), []);
  assert.deepEqual(automaticStatusChanges({ ...p, lastWorkDate: '2020-01-01', closeDueDate: '2020-01-01', statusFields: { transfer: 'องค์กรกำลังดำเนินการ', advance: 'โครงการรับเงินแล้ว' } }, now), []);
  assert.equal(bangkokDay(Date.parse('2026-11-13T17:00:00Z')), calendarDay('2026-11-14'));
});
test('automation runs once, audits system changes and invalidates stale proposals', () => {
  let time = Date.parse('2026-11-14T03:00:00Z');
  const m = createModel({ now: () => time });
  const timing = { projectId, version: 1, lastWorkDate: '2026-11-22', closeDueDate: '2026-11-14' };
  fails(() => m.mutate('secretary', 'timing', timing), 403);
  fails(() => m.mutate('head', 'timing', { ...timing, lastWorkDate: '2026-02-30' }), 400);
  m.mutate('head', 'timing', timing);
  const requestId = m.mutate('secretary', 'propose', { ...proposal, version: 2 }).requests[0].id;
  time += 86400000;
  m.runAutomation();
  const s = m.snapshot('head');
  assert.equal(s.projects[0].statusFields.transfer, 'ไม่เข้ากระบวนการโอนงบประมาณ');
  assert.equal(s.projects[0].statusFields.advance, 'สำรองจ่ายก่อน');
  assert.equal(s.audit.filter(a => a.actor === 'system').length, 2);
  m.runAutomation();
  assert.equal(m.snapshot('head').audit.length, s.audit.length);
  fails(() => m.mutate('head', 'approve', { requestId, version: s.projects[0].version }), 409);
});

test('five separate status catalogs match the existing year-68 manual exactly', () => {
  const manual = readFileSync(new URL('../../docs/project-status-manual.md', import.meta.url), 'utf8');
  for (const [i, group] of STATUS_GROUPS.entries()) {
    const section = manual.split(`### 4.${i + 1} `)[1].split(/\n### |\n## /)[0];
    const values = [...section.matchAll(/^- `([^`]+)`/gm)].map(m => m[1]);
    assert.deepEqual(group.values, values);
  }
});
test('status field permissions enforce both target and current status; groups remain independent', () => {
  const m = createModel();
  for (const user of ['assistantA']) {
    fails(() => m.mutate(user, 'status', { projectId, version: 1, field: 'transfer', status: 'อนุมัติการโอนงบประมาณโดยเหรัญญิก' }), 403);
    fails(() => m.mutate(user, 'status', { projectId, version: 1, field: 'closure', status: 'ผ่านเหรัญญิก' }), 403);
  }
  fails(() => m.mutate('secretary', 'status', { projectId, version: 1, field: 'closure', status: 'ผ่านเหรัญญิก' }), 403);
  fails(() => m.mutate('head', 'status', { projectId, version: 1, field: 'unknown', status: 'รอแก้ไข' }), 400);
  const s = m.mutate('head', 'status', { projectId, version: 1, field: 'transfer', status: 'รอแก้ไข' });
  assert.equal(s.projects[0].statusFields.transfer, 'รอแก้ไข');
  assert.equal(s.projects[0].statusFields.approval, '');
  assert.equal(s.projects[0].amount, 1000000);
  assert.equal(s.audit[0].field, 'transfer');
  m.mutate('head', 'status', { projectId, version: 2, field: 'closure', status: 'ผ่านเหรัญญิก' });
  fails(() => m.mutate('assistantA', 'status', { projectId, version: 3, field: 'closure', status: 'รอผู้ช่วยตรวจสอบ' }), 403);
});

test('all 57 statuses enforce the user matrix for head, secretary and assigned assistant', () => {
  const matrix = {
    secretary: ['RRRRRRRRRRRRRR', 'DDDDDRRRRRRRRX', 'DDDDDDDDXXRX', 'XXXXXXXXXXXX', 'XXXXX'],
    assistantA: ['XXXXXXXXXXXXXX', 'DDDDXXXXXXXXXX', 'DDDXXXXXXXXX', 'DDDDXXDDXXXR', 'XXXXX']
  };
  for (const actor of ['head', 'secretary', 'assistantA']) {
    for (const [gi, group] of STATUS_GROUPS.entries()) {
      const modes = actor === 'head' ? 'D'.repeat(group.values.length) : matrix[actor][gi];
      assert.equal(modes.length, group.values.length);
      for (const [index, status] of group.values.entries()) {
        const m = createModel();
        const before = m.snapshot(actor);
        const expected = modes[index];
        assert.equal(before.statusPermissions[projectId][group.id][status], { D: 'direct', R: 'review', X: 'denied' }[expected]);
        const run = () => m.mutate(actor, 'status', { projectId, version: 1, field: group.id, status, reason: 'ทดสอบสิทธิ์ตามตาราง' });
        if (expected === 'X') { fails(run, 403); continue; }
        if (before.projects[0].statusFields[group.id] === status) { fails(run, 400); continue; }
        const result = run();
        if (expected === 'R') {
          assert.equal(result.projects[0].statusFields[group.id], before.projects[0].statusFields[group.id]);
          assert.equal(result.requests[0].kind, 'status');
          const approved = m.mutate('head', 'approve', { requestId: result.requests[0].id, version: 1 });
          assert.equal(approved.projects[0].statusFields[group.id], status);
        } else assert.equal(result.projects[0].statusFields[group.id], status);
      }
    }
  }
});
test('defaults do not count as human edits; lock remembers all editors per field', () => {
  const m = createModel();
  const p = m.snapshot('head').projects[0];
  assert.equal(p.statusFields.advance, 'ยังไม่เริ่มดำเนินการ');
  assert.equal(p.statusFields.closure, 'รอส่งเอกสารปิดโครง');
  assert.equal(p.statusFields.voucher, 'เหรัญญิกรับเงินจากกิจการนิสิต');
  m.mutate('assistantA', 'status', { projectId, version: 1, field: 'transfer', status: 'องค์กรกำลังดำเนินการ' });
  m.mutate('assistantA', 'status', { projectId, version: 2, field: 'transfer', status: 'ผู้ช่วยตรวจสอบ' });
  m.mutate('secretary', 'status', { projectId, version: 3, field: 'transfer', status: 'เลขาตรวจสอบ' });
  m.mutate('head', 'status', { projectId, version: 4, field: 'transfer', status: 'องค์กรกำลังดำเนินการ' });
  fails(() => m.mutate('assistantA', 'status', { projectId, version: 5, field: 'transfer', status: 'ผู้ช่วยตรวจสอบ' }), 403);
  const s = m.mutate('assistantA', 'status', { projectId, version: 5, field: 'advance', status: 'องค์กรกำลังดำเนินการ' });
  assert.equal(s.projects[0].statusFields.advance, 'องค์กรกำลังดำเนินการ');
});
test('status review supports cancellation, rejects duplicates/self-review, and blocks stale approvals', () => {
  const m = createModel();
  const payload = { projectId, version: 1, field: 'closure', status: 'ยกเลิกโครงการ', reason: 'ผู้จัดขอยกเลิกกิจกรรม' };
  fails(() => m.mutate('assistantB', 'status', payload), 403);
  fails(() => m.mutate('assistantA', 'status', { ...payload, reason: '' }), 400);
  const s = m.mutate('assistantA', 'status', payload);
  const requestId = s.requests[0].id;
  fails(() => m.mutate('assistantA', 'status', payload), 409);
  fails(() => m.mutate('assistantA', 'approve', { requestId, version: 1 }), 403);
  assert.equal(s.projects[0].statusFields.closure, 'รอส่งเอกสารปิดโครง');
  m.mutate('head', 'status', { projectId, version: 1, field: 'closure', status: 'เหรัญญิกตรวจสอบ' });
  fails(() => m.mutate('head', 'approve', { requestId, version: 2 }), 409);
  const rejected = m.mutate('head', 'reject', { requestId, reason: 'ตรวจข้อมูลใหม่ก่อน' });
  assert.equal(rejected.projects[0].statusFields.closure, 'เหรัญญิกตรวจสอบ');
  assert.equal(rejected.requests[0].state, 'rejected');
  // Cancellation remains a review request even after another person edited the field.
  assert.equal(m.mutate('assistantA', 'status', { ...payload, version: 2 }).requests.at(-1).state, 'pending');
});

test('assistant sees only assigned projects and cannot change another project', () => {
  const m = createModel();
  assert.deepEqual(m.snapshot('assistantA').projects.map(p => p.id), [projectId]);
  fails(() => m.mutate('assistantB', 'status', { projectId, version: 1, status: 'รอผู้ช่วยตรวจสอบ' }), 403);
  const s = m.mutate('assistantA', 'status', { projectId, version: 1, status: 'รอผู้ช่วยตรวจสอบ' });
  assert.equal(s.projects[0].status, 'รอผู้ช่วยตรวจสอบ');
  assert.equal(s.projects[0].amount, 1000000);
});
test('server rejects money injection, financial statuses, and assignment injection', () => {
  const m = createModel();
  fails(() => m.mutate('assistantA', 'propose', proposal), 403);
  for (const extra of [{ amount: '1' }, { assignee: 'assistantB' }, { role: 'head' }]) {
    fails(() => m.mutate('assistantA', 'status', { projectId, version: 1, status: 'รอผู้ช่วยตรวจสอบ', ...extra }), 400);
  }
  fails(() => m.mutate('assistantA', 'status', { projectId, version: 1, status: 'โอนเงินแล้ว' }), 400);
  assert.equal(m.snapshot('head').audit.length, 0);
});
test('proposal preserves official amount until head approves; audit records both actors', () => {
  const m = createModel();
  const s = m.mutate('secretary', 'propose', proposal);
  assert.equal(s.projects[0].amount, 1000000);
  const requestId = s.requests[0].id;
  fails(() => m.mutate('secretary', 'approve', { requestId, version: 1 }), 403);
  fails(() => m.mutate('assistantA', 'approve', { requestId, version: 1 }), 403);
  const approved = m.mutate('head', 'approve', { requestId, version: 1 });
  assert.equal(approved.projects[0].amount, 1200025);
  assert.equal(approved.requests[0].state, 'approved');
  assert.deepEqual(approved.audit.map(a => a.actor), ['secretary', 'head']);
  fails(() => m.mutate('head', 'approve', { requestId, version: 2 }), 409);
});
test('stale status writes and approvals cannot overwrite intervening changes', () => {
  const m = createModel();
  const requestId = m.mutate('secretary', 'propose', proposal).requests[0].id;
  m.mutate('assistantA', 'status', { projectId, version: 1, status: 'รอผู้ช่วยตรวจสอบ' });
  fails(() => m.mutate('assistantA', 'status', { projectId, version: 1, status: 'ส่งให้ชมรมกลับเพื่อแก้ไข' }), 409);
  fails(() => m.mutate('head', 'approve', { requestId, version: 2 }), 409);
  assert.equal(m.snapshot('head').projects[0].amount, 1000000);
  m.mutate('head', 'reject', { requestId, reason: 'ข้อมูลเปลี่ยนแล้ว กรุณาเสนอใหม่' });
  assert.equal(m.mutate('secretary', 'propose', { ...proposal, version: 2 }).requests.length, 2);
});
test('duplicate proposals rejected; rejection preserves official amount and requires reason', () => {
  const m = createModel();
  const requestId = m.mutate('secretary', 'propose', proposal).requests[0].id;
  fails(() => m.mutate('secretary', 'propose', proposal), 409);
  fails(() => m.mutate('head', 'reject', { requestId, reason: '' }), 400);
  const s = m.mutate('head', 'reject', { requestId, reason: 'ส่งให้ชมรมกลับเพื่อแก้ไข' });
  assert.equal(s.projects[0].amount, 1000000);
  assert.equal(s.requests[0].reviewer, 'head');
});
test('only head can directly edit money with a reason and version; pending requests become stale', () => {
  const m = createModel();
  const requestId = m.mutate('secretary', 'propose', proposal).requests[0].id;
  for (const user of ['secretary', 'assistantA', 'assistantB']) fails(() => m.mutate(user, 'amount', proposal), 403);
  fails(() => m.mutate('head', 'amount', { ...proposal, reason: '' }), 400);
  fails(() => m.mutate('head', 'amount', { ...proposal, amount: '-1' }), 400);
  assert.equal(m.snapshot('head').projects[0].amount, 1000000);
  const s = m.mutate('head', 'amount', { ...proposal, amount: '15000.29' });
  assert.equal(s.projects[0].amount, 1500029);
  assert.equal(s.projects[0].version, 2);
  assert.equal(s.audit.at(-1).actor, 'head');
  assert.equal(s.audit.at(-1).before, 1000000);
  assert.equal(s.audit.at(-1).after, 1500029);
  assert.equal(s.audit.at(-1).reason, proposal.reason);
  fails(() => m.mutate('head', 'amount', proposal), 409);
  fails(() => m.mutate('head', 'approve', { requestId, version: 2 }), 409);
  assert.equal(m.snapshot('head').projects[0].amount, 1500029);
});
test('currency uses integer satang and rejects malformed or out-of-range values', () => {
  assert.equal(parseMoney('0.29'), 29);
  assert.equal(parseMoney('999999999.99'), 99999999999);
  for (const value of ['-1', '1e5', 'Infinity', '1.001', '', '1000000000', 5, null]) fails(() => parseMoney(value), 400);
});
test('snapshots cannot mutate stored data and unauthenticated reads fail', () => {
  const m = createModel();
  fails(() => m.snapshot(undefined), 401);
  m.snapshot('head').projects[0].amount = 1;
  assert.equal(m.snapshot('head').projects[0].amount, 1000000);
});
test('HTTP enforces session, role, request origin and serves working assets', async t => {
  const server = createPilotServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (route, body, cookie, origin = base) => fetch(base + route, body === undefined ? { headers: cookie ? { Cookie: cookie } : {} } : {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body)
  });
  assert.equal((await call('/api/state')).status, 401);
  assert.equal((await call('/api/session', { userId: 'head' }, '', 'https://other.invalid')).status, 403);
  const login = await call('/api/session', { userId: 'assistantA' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/api/propose', proposal, cookie)).status, 403);
  assert.equal((await call('/api/amount', proposal, cookie)).status, 403);
  assert.equal((await call('/api/export', undefined, cookie)).status, 403);
  assert.equal((await (await call('/api/state', undefined, cookie)).json()).projects.length, 1);
  for (const asset of ['/', '/app.js', '/style.css']) assert.equal((await call(asset)).status, 200);
  const headLogin = await call('/api/session', { userId: 'head' });
  const exported = await call('/api/export', undefined, headLogin.headers.get('set-cookie').split(';')[0]);
  assert.equal((await exported.json()).demoOnly, true);
});
