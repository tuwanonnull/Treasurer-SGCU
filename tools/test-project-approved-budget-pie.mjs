import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const chart = {
  data: { datasets: [{}] }, options: { plugins: { centerText: {} } },
  hidden: new Set(), getDataVisibility(i) { return !this.hidden.has(i); },
  toggleDataVisibility(i) { this.hidden.delete(i); }, update() {}
};
const ctx = vm.createContext({
  statusPieChart: chart, yearSelect: {value: '2569'},
  orgTypeSelect: {value: 'all'}, orgSelect: {value: 'all'},
  getChartOrgGroups: () => ['A'], getOrgsByGroup: () => ['One']
});
vm.runInContext(fs.readFileSync(new URL('../js/features/project/app.pie.js', import.meta.url), 'utf8'), ctx);
const project = (orgGroup, orgName, approvedBudget100, extra = {}) => ({
  year: '2569', statusMain: 'อนุมัติโครงการ', budget: 999,
  orgGroup, orgName, approvedBudget100, ...extra
});
const rows = [project('A', 'One', 100), project('B', 'Two', '300'),
  project('A', 'Pending', 600, {statusMain: 'รอแก้ไข'}),
  project('C', 'Zero', 0), project('C', 'Invalid', 'bad'),
  project('C', 'Negative', -50), project('C', 'Old', 900, {year: '2568'})];
const render = (rows) => { ctx.rows = rows; vm.runInContext('updateApprovedBudgetPie(rows)', ctx); };
const values = () => Array.from(chart.data.datasets[0].data);
render(rows);
assert.deepEqual(Array.from(chart.data.labels), ['A', 'B']);
assert.deepEqual(values(), [100, 300], 'Use numeric approved amounts, preserving uncatalogued organizations');
assert.equal(chart.options.plugins.centerText.text, '400');
assert.equal(chart.options.plugins.centerText.subText, 'งบอนุมัติรวม (บาท)');
ctx.orgTypeSelect.value = 'A';
render(rows);
assert.equal(chart.options.plugins.centerText.text, '25.0%', 'Center uses the same total as the arcs');
ctx.orgTypeSelect.value = 'all';
ctx.orgSelect.value = 'One';
render(rows);
assert.deepEqual(Array.from(chart.data.labels), ['One']);
assert.equal(chart.options.plugins.centerText.text, '100.0%', 'Organization selection compares only within its parent group');
ctx.orgTypeSelect.value = 'A';
render([project('A', 'One', 100), project('A', 'Uncatalogued', 300)]);
assert.deepEqual(values(), [100, 300]);
assert.equal(chart.options.plugins.centerText.subText, 'อันดับงบ 2/2');
render([]);
assert.deepEqual(values(), []);
assert.equal(chart.options.plugins.centerText.text, '0%');
assert.equal(chart.options.plugins.centerText.subText, 'ไม่มีข้อมูลตรงกับตัวกรอง');
chart.hidden.add(0);
render([project('A', 'One', undefined, {budget: 70, year: 2569})]);
assert.deepEqual(values(), [70]);
assert.equal(chart.getDataVisibility(0), true);
render([project('A', 'One', 0)]);
assert.deepEqual(values(), []);
assert.equal(chart.options.plugins.centerText.subText, 'ไม่มีงบอนุมัติ');
console.log('Approved budget pie: amounts, denominator, organizations, year, empty state and filter recovery passed.');

// Exercise the actual table filter and the broader pie input together.
const ui = fs.readFileSync(new URL('../js/features/project/app.project-ui.js', import.meta.url), 'utf8');
vm.runInContext(ui.slice(ui.indexOf('function filterProjects('), ui.indexOf('function updateSummaryCards(')), ctx);
Object.assign(ctx, {
  projects: [project('A', 'One', 100), project('A', 'Sibling', 300), project('B', 'Two', 600)],
  projectSearchInput: {value: ''}, activeProjectStatusContext: 'public',
  matchesProjectTrackingFilters: () => true
});
const refresh = () => vm.runInContext('updateApprovedBudgetPie(filterProjects({ ignoreOrganization: true }))', ctx);
ctx.orgSelect.value = 'all';
ctx.orgTypeSelect.value = 'all';
refresh();
assert.deepEqual(values(), [400, 600]);
assert.equal(chart.options.plugins.centerText.text, '1,000');
ctx.orgTypeSelect.value = 'A';
refresh();
assert.deepEqual(values(), [400, 600], 'Selecting a major group preserves the complete overview');
assert.equal(chart.options.plugins.centerText.text, '40.0%');
ctx.orgSelect.value = 'One';
refresh();
assert.deepEqual(values(), [100, 300], 'Selecting an organization keeps its siblings, excluding other groups');
assert.equal(chart.options.plugins.centerText.text, '25.0%');
assert.equal(vm.runInContext('filterProjects().length', ctx), 1, 'Table remains filtered to the selected organization');
ctx.orgTypeSelect.value = 'all';
refresh();
assert.deepEqual(values(), [100, 300], 'Infer parent group when only the organization is selected');
ctx.projectSearchInput.value = 'no-match';
refresh();
assert.deepEqual(values(), [], 'Other filters still apply without falling back to all projects');
console.log('Pie hierarchy: overall → major group overview → sibling organizations passed.');
