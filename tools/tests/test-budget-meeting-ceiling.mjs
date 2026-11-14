import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile('web/js/features/budget/app.budget-meeting.js', 'utf8');
const start = source.indexOf('    function applyInitialCeiling(');
const end = source.indexOf('    function reset()', start);
assert(start >= 0 && end > start);
const context = vm.createContext({ codeOrder: new Intl.Collator('en', { numeric: true }) });
vm.runInContext(source.slice(start, end), context);
const apply = context.applyInitialCeiling;
const project = (org, code, original) => ({ org, code, original, budget: original });
const cents = p => Math.round(p.budget * 100);

// Project-first rounding gave department A 0.02 and B 0.00; both should get 0.01.
const fixture = () => [project(0, 'SGCU-01.01.001', 1), project(0, 'SGCU-01.02.001', 1), project(1, 'SGCU-02.00.001', 1), project(2, 'SGCU-03.00.001', 0)];
for (const reversed of [false, true]) {
  const projects = fixture();
  if (reversed) projects.reverse();
  apply(projects, 0.02);
  assert.equal(projects.filter(p => p.org === 0).reduce((s, p) => s + cents(p), 0), 1);
  assert.equal(projects.filter(p => p.org === 1).reduce((s, p) => s + cents(p), 0), 1);
  assert.equal(projects.find(p => p.org === 2).budget, 0);
  assert.equal(projects.find(p => p.code === 'SGCU-01.01.001').budget, 0.01);
  assert.equal(projects.reduce((s, p) => s + cents(p), 0), 2);
}
for (const ceiling of [null, 0, 0.01, 1, 2.99, 3, 4]) {
  const projects = fixture();
  apply(projects, ceiling);
  const target = ceiling === null ? 300 : Math.min(300, Math.round(ceiling * 100));
  assert.equal(projects.reduce((s, p) => s + cents(p), 0), target);
  assert(projects.every(p => cents(p) >= 0 && p.budget <= p.original));
}
const zero = [project(0, 'SGCU-01.00.001', 0)];
assert.equal(apply(zero, 1), 0);
assert.equal(zero[0].budget, 0);
console.log('Passed: department-first rounding, exact totals, deterministic code-order ties, zero budgets, no ceiling and no uplift.');
