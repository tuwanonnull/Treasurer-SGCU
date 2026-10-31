import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui = fs.readFileSync(new URL('../js/features/project/app.project-ui.js', import.meta.url), 'utf8');
const sorting = fs.readFileSync(new URL('../js/features/project/app.sorting-auth.js', import.meta.url), 'utf8');
const helpers = fs.readFileSync(new URL('../js/core/app.helpers.js', import.meta.url), 'utf8');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { value: '' });
  return elements.get(id);
};
let selected = [];
const context = vm.createContext({
  document: { getElementById: element, querySelectorAll: () => selected.map(value => ({ value })) },
  yearSelect: { value: '2569' }, orgTypeSelect: { value: 'all' }, orgSelect: { value: 'all' },
  projectSearchInput: { value: '' }, activeProjectStatusContext: 'staff',
  projects: [
    { code: 'A', year: '2569', orgName: 'ฝ่าย ก', lastWorkDate: '01/12/2569', budget: 100, statusClose: 'ส่งกิจการนิสิตเรียบร้อย' },
    { code: 'B', year: '2569', orgName: 'ฝ่าย ข', lastWorkDate: '31/01/2570', budget: 200 },
    { code: 'C', year: '2569', orgName: 'ฝ่าย ก', lastWorkDate: '01/02/2570', budget: 300 },
    { code: 'D', year: '2569', orgName: 'ฝ่าย ค', lastWorkDate: '', budget: 400 },
    { code: 'E', year: '2568', orgName: 'ฝ่าย ก', lastWorkDate: '01/12/2569', budget: 500 },
    { code: 'F', year: '2569', orgName: 'ฝ่าย ข', lastWorkDate: '15/01/2570', budget: 50, statusMain: 'ยกเลิกโครงการ' }
  ]
});
vm.runInContext(sorting.slice(sorting.indexOf('function getStaffProjectTrackingFilters'), sorting.indexOf('/* Sorting + auth')), context);
assert.equal(vm.runInContext('getStaffProjectTrackingFilters().status', context), 'all', 'Filter state is available before loading project UI');
vm.runInContext(helpers.slice(helpers.indexOf('function parseProjectDate'), helpers.indexOf('function getProjectOverviewStatus')), context);
vm.runInContext(ui.slice(ui.indexOf('const ADVANCE_NOT_BORROWED_STATUSES'), ui.indexOf('function updateSummaryCards')), context);
assert.equal(vm.runInContext('getStaffProjectTrackingFilters().level', context), 'orgGroup', 'Major organizations are the default comparison level');
element('projectCompareLevelStaff').value = 'orgName';
const codes = () => Array.from(vm.runInContext('filterProjects().map(p => p.code)', context));
element('projectMonthFromStaff').value = '2026-12';
element('projectMonthToStaff').value = '2027-01';
assert.deepEqual(codes(), ['A', 'B', 'F'], 'Include both month boundaries across years; exclude missing dates and other academic years');
selected = ['ฝ่าย ก', 'ฝ่าย ข'];
assert.deepEqual(codes(), ['A', 'B', 'F']);
selected = ['ฝ่าย ก'];
assert.deepEqual(codes(), ['A']);
element('projectMonthFromStaff').value = '2027-02';
assert.deepEqual(codes(), [], 'Reversed month range must not silently show all records');
element('projectMonthToStaff').value = '';
assert.deepEqual(codes(), ['C'], 'Open-ended start month');
element('projectMonthFromStaff').value = '';
selected = [];
assert.deepEqual(codes(), ['A', 'B', 'C', 'D', 'F'], 'No month filter includes undated projects');
element('projectMonthToStaff').value = '2027-01';
assert.deepEqual(codes(), ['A', 'B', 'F'], 'Open-ended end month');
element('projectStatusFilterStaff').value = 'closed';
assert.deepEqual(codes(), ['A']);
context.activeProjectStatusContext = 'public';
assert.deepEqual(codes(), ['A', 'B', 'C', 'D', 'F'], 'Staff filters must not leak into public view');
context.activeProjectStatusContext = 'staff';
element('projectStatusFilterStaff').value = 'all';
const rows = JSON.parse(vm.runInContext('JSON.stringify(buildProjectOrgComparisonRows(filterProjects(), ["ฝ่าย ก", "ฝ่าย ข", "ฝ่าย ค"]))', context));
assert.deepEqual(rows.find(row => row.name === 'ฝ่าย ข'), { name: 'ฝ่าย ข', count: 2, budget: 250, closed: 0, eligible: 1 });
assert.deepEqual(rows.find(row => row.name === 'ฝ่าย ก'), { name: 'ฝ่าย ก', count: 1, budget: 100, closed: 1, eligible: 1 });
assert.equal(rows.find(row => row.name === 'ฝ่าย ค').count, 0, 'Keep selected organizations with zero matching projects visible');
console.log('Project overview: inclusive month ranges, multiple organizations, status composition, comparison totals and public isolation passed.');

context.projects.forEach(p => { p.orgGroup = p.orgName === 'ฝ่าย ก' ? 'องค์กรหนึ่ง' : 'องค์กรสอง'; });
element('projectCompareLevelStaff').value = 'orgGroup';
selected = ['องค์กรหนึ่ง', 'องค์กรสอง'];
context.orgTypeSelect.value = 'องค์กรหนึ่ง';
context.orgSelect.value = 'ฝ่าย ก';
assert.deepEqual(codes(), ['A', 'B', 'F'], 'Organization comparison includes all departments in the selected groups');
const groups = JSON.parse(vm.runInContext('JSON.stringify(buildProjectOrgComparisonRows(filterProjects(), getStaffProjectTrackingFilters().orgs, "orgGroup"))', context));
assert.equal(groups.length, 2);
assert.equal(groups.find(row => row.name === 'องค์กรสอง').budget, 250);
selected = ['องค์กรสอง'];
assert.deepEqual(codes(), ['B', 'F']);
context.activeProjectStatusContext = 'public';
assert.deepEqual(codes(), ['A', 'C'], 'Public single-organization filters remain independent');
console.log('Major organization comparison, aggregation and public isolation passed.');
