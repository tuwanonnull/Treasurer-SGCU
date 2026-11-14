import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createModel } from './model.mjs';
import { validateYear68Snapshot } from './year68.mjs';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node tools/project-pilot/rehearse-year68.mjs /private/snapshot.json');
const source = await readFile(sourcePath, 'utf8');
const snapshot = validateYear68Snapshot(JSON.parse(source));
const fields = { approval: 'H', transfer: 'Q', advance: 'Y', closure: 'AZ', voucher: 'BA' };
const amountText = cents => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
const checks = [];
for (const p of snapshot.projects) {
  const seed = { id: `TEST68:${p.code}`, name: p.name, year: 2568, amount: p.money.O, assignee: 'assistantA',
    statusFields: Object.fromEntries(Object.entries(fields).map(([key, col]) => [key, p.statuses[col] ?? ''])) };
  const original = JSON.stringify(seed);
  const model = createModel({ rehearsalProjects: [seed] });
  const state = () => model.snapshot('head');
  const current = () => state().projects[0];
  assert.deepEqual(current().statusFields, seed.statusFields);
  assert.equal(state().audit.length, 0);
  assert.equal(model.snapshot('assistantB').projects.length, 0);
  assert.throws(() => model.mutate('assistantA', 'amount', { projectId: seed.id, version: 1, amount: '1', reason: 'ซ้อมสิทธิ์' }), e => e.status === 403);
  // A one-satang difference exercises the smallest supported monetary edit.
  const proposed = seed.amount === 99999999999 ? seed.amount - 1 : seed.amount + 1;
  model.mutate('secretary', 'propose', { projectId: seed.id, version: 1, amount: amountText(proposed), reason: 'ซ้อมเสนอแก้ยอดหนึ่งสตางค์' });
  assert.equal(current().amount, seed.amount);
  const request = state().requests[0];
  model.mutate('head', 'approve', { requestId: request.id, version: 1 });
  assert.equal(current().amount, proposed);
  assert.throws(() => model.mutate('head', 'approve', { requestId: request.id, version: current().version }), e => e.status === 409);
  model.mutate('secretary', 'propose', { projectId: seed.id, version: current().version, amount: amountText(seed.amount), reason: 'ซ้อมคำขอข้อมูลเก่า' });
  const stale = state().requests.find(r => r.state === 'pending');
  model.mutate('head', 'amount', { projectId: seed.id, version: current().version, amount: amountText(seed.amount), reason: 'เหรัญญิกแก้ตรงเพื่อทดสอบรุ่นข้อมูล' });
  assert.throws(() => model.mutate('head', 'approve', { requestId: stale.id, version: current().version }), e => e.status === 409);
  model.mutate('head', 'reject', { requestId: stale.id, reason: 'ส่งกลับคำขอที่ข้อมูลเปลี่ยนแล้ว' });
  assert.equal(current().amount, seed.amount);
  assert.deepEqual(current().statusFields, seed.statusFields);
  assert.deepEqual(state().audit.map(a => a.action), ['propose', 'approve', 'propose', 'amount', 'reject']);
  assert.equal(JSON.stringify(seed), original);
  checks.push({ code: p.code, passed: true });
}
assert.equal(await readFile(sourcePath, 'utf8'), source);
const report = {
  scope: 'Local in-memory rehearsal only; one project per isolated model; no production access',
  completedAt: new Date().toISOString(), projectsPassed: checks.length,
  scenarios: ['historical statuses preserved', 'other assistant cannot see project', 'assistant cannot edit money',
    'secretary proposal does not change amount', 'head approval applies one satang', 'duplicate approval blocked',
    'head direct edit', 'stale approval blocked', 'rejection recorded', 'audit actions complete', 'source unchanged'],
  limitations: ['Only approved budget O is edited; dependent money formulas are not recalculated by this model',
    'Synthetic assistant assignment only; historical editor history unknown and assistant direct status edits locked',
    'No Firestore, load, persistence, backup or restore verification'],
  sourceSha256: snapshot.sourceSha256, checks
};
const directory = await mkdtemp(path.join(tmpdir(), 'sgcu-year68-rehearsal-'));
const reportPath = path.join(directory, 'report.json');
await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ projectsPassed: checks.length, scenariosPerProject: report.scenarios.length, reportPath, sourceUnchanged: true }));
