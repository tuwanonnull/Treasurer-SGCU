import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createFinanceTrial } from './finance-trial.mjs';
import { calculateMoney, MONEY_COLUMNS } from './finance.mjs';
const source = await readFile(process.argv[2], 'utf8'); const snapshot = JSON.parse(source);
const model = createFinanceTrial(snapshot);
function allProjects() {
  const projects = [];
  for (let offset = 0; offset < snapshot.projects.length; offset += 25) projects.push(...model.query('head', new URLSearchParams({ offset })).projects);
  return projects;
}
const original = allProjects();
for (const p of original) {
  const amount = p.money.O + 1;
  const request = model.mutate('secretary', 'propose', { projectId: p.id, version: p.version,
    changes: { O: `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}` }, reason: 'ซ้อมเพิ่มหนึ่งสตางค์พร้อมคำนวณสูตร' });
  model.mutate('head', 'approve', { requestId: request.requestId, version: p.version });
}
const edited = allProjects();
for (const [i, p] of edited.entries()) {
  assert.equal(p.money.O, original[i].money.O + 1);
  assert.deepEqual(p.money, calculateMoney(p));
  assert.deepEqual(p.statuses, original[i].statuses);
}
const state = model.query('head');
for (const col of MONEY_COLUMNS) assert.equal(state.totals[col], edited.reduce((sum, p) => sum + (p.money[col] ?? 0), 0));
assert.equal(state.audit.length, snapshot.projects.length * 2);
const reloaded = createFinanceTrial(snapshot);
reloaded.importState(JSON.parse(JSON.stringify(model.exportState())));
assert.deepEqual(reloaded.query('head'), state);
model.mutate('head', 'reset', { revision: state.revision });
assert.deepEqual(model.query('head').totals, snapshot.totals);
assert.equal(model.query('head').requests.length, 0);
assert.equal(await readFile(process.argv[2], 'utf8'), source);
console.log(JSON.stringify({ projectsPassed: edited.length, workflow: 'propose + approve + dependent formulas + totals + audit + checkpoint reload + reset', sourceUnchanged: true }));
