import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ui = fs.readFileSync(new URL('../../web/js/features/project/app.project-ui.js', import.meta.url), 'utf8');
const helpers = fs.readFileSync(new URL('../../web/js/core/app.helpers.js', import.meta.url), 'utf8');
const ctx = vm.createContext({escapeHtml: String, formatMoney: String});
vm.runInContext(helpers.slice(helpers.indexOf('function isProjectClosed'), helpers.indexOf('function isProjectApproved')), ctx);
vm.runInContext(ui.slice(ui.indexOf('function renderCompactDebtRows'), ui.indexOf('function initDashboardDebtToggle')), ctx);
ctx.container = {};
vm.runInContext('renderCompactDebtRows([{label:"A",amount:60,count:1,color:"pink"},{label:"B",amount:40,count:1,color:"pink"}],container)', ctx);
assert.match(ctx.container.innerHTML, /width:60%/);
assert.match(ctx.container.innerHTML, /60.0%/);
assert.match(ctx.container.innerHTML, /width:40%/);
assert.match(ctx.container.innerHTML, /40.0%/);
console.log('Debt bar widths match total-share labels.');

const charts = fs.readFileSync(new URL('../../web/js/features/project/app.charts.js', import.meta.url), 'utf8');
ctx.getChartOrgGroups = () => ['A', 'B'];
ctx.getOrgsByGroup = group => group === 'A' ? ['A2', 'A1', 'Same'] : ['B1', 'Same'];
vm.runInContext(charts.slice(charts.indexOf('function getProjectStatusOrgComparator'), charts.indexOf('function getChartOrgGroups')),ctx);
vm.runInContext(ui.slice(ui.indexOf('function getInsightOrganization'), ui.indexOf('function updateClubDebtSummary')),ctx);
vm.runInContext(ui.slice(ui.indexOf('function isClubDebtProject'), ui.indexOf('function getClubDebtSummaryScope')),ctx);
vm.runInContext(ui.slice(ui.indexOf('function buildPastUnapprovedAgeBuckets'), ui.indexOf('function updatePastUnapprovedProjects')), ctx);
ctx.items = [1,7,8,14,15,30,31,100].map(days=>({days}));
assert.deepEqual(Array.from(vm.runInContext('buildPastUnapprovedAgeBuckets(items).map(row=>row.count)', ctx)), [2,2,2,2]);
const chart = {innerHTML:'',dataset:{view:'age'},setAttribute(){}};
ctx.document = {querySelectorAll:()=>[],getElementById: id => ({pastUnapprovedChartStaff:chart})[id]};
vm.runInContext('renderPastUnapprovedChart(items)',ctx);
assert.equal((chart.innerHTML.match(/width:25%/g)||[]).length,4);
vm.runInContext('renderPastUnapprovedChart([])',ctx);
assert.match(chart.innerHTML,/ไม่พบโครงการ/);
console.log('Past-unapproved chart: age boundaries, percentage bars and empty-filter reset passed.');

ctx.items = [{days:1,project:{orgGroup:"A",orgName:"A1"}},{days:8,project:{orgGroup:"A",orgName:"A2"}},{days:31,project:{orgGroup:"B",orgName:"B1"}},{days:2,project:{}}];
assert.deepEqual(Array.from(vm.runInContext('buildPastUnapprovedOrgBuckets(items).map(row=>row.count)',ctx)),[2,1,1]);
assert.equal(vm.runInContext('buildPastUnapprovedOrgBuckets(items,"orgName").length',ctx),4);
chart.dataset.view = "org";
vm.runInContext('renderPastUnapprovedChart(items)',ctx);
assert.match(chart.innerHTML,/width:50%/);
vm.runInContext('renderPastUnapprovedChart([])',ctx);
assert.equal(chart.dataset.view,"org");
assert.match(chart.innerHTML,/ไม่พบโครงการ/);
console.log('Organization grouping, missing organizations, total-share percentages and retained view passed.');

// The staff insights use the selected comparison level and catalog order, not stale public selectors.
ctx.activeProjectStatusContext = "staff";
let level = "orgName";
ctx.getStaffProjectTrackingFilters = () => ({level});
ctx.orgTypeSelect = {value:"unrelated"};
ctx.orgSelect = {value:"unrelated"};
ctx.debtProjects = [
  {orgGroup:"B",orgName:"Same",advanceAmount:90},
  {orgGroup:"A",orgName:"Same",advanceAmount:10},
  {orgGroup:"A",orgName:"A1",advanceAmount:20},
  {orgGroup:"A",orgName:"A2",advanceAmount:30}
].map(project=>({...project,advanceStatus:"โครงการรับเงินแล้ว",daysToDeadline:-5,statusClose:"รอส่งเอกสาร",statusCloseDecree:"รอปิดโครงการ"}));
const debtRows = () => JSON.parse(vm.runInContext('JSON.stringify(buildClubDebtSummaryRows(debtProjects).rows)',ctx));
assert.deepEqual(debtRows().map(row=>row.name),["A2 · A","A1 · A","Same · A","Same · B"]);
ctx.items = ctx.debtProjects.map(project=>({project,days:5}));
assert.deepEqual(Array.from(vm.runInContext('buildPastUnapprovedOrgBuckets(items,"orgName").map(row=>row.label)',ctx)),debtRows().map(row=>row.name));
level = "orgGroup";
assert.deepEqual(debtRows().map(row=>row.name),["A","B"]);
assert.deepEqual(debtRows().map(row=>row.totalDebt),[60,90]);
delete chart.dataset.view;
vm.runInContext('renderPastUnapprovedChart(items)',ctx);
assert.match(chart.innerHTML, /width:75%/,'Default chart is organization grouping');
assert.doesNotMatch(chart.innerHTML, /1–7 วัน/);
ctx.viewport = {style:{},querySelectorAll:()=>Array.from({length:8},(_,i)=>({getBoundingClientRect:()=>({height:60+i*2})}))};
vm.runInContext('fitInsightChartViewport(viewport)',ctx);
assert.equal(ctx.viewport.style.maxHeight,"390px",'Exactly six variable-height rows fit');
assert.equal(ctx.viewport.style.overflowY,"auto");
ctx.viewport.querySelectorAll = () => [];
vm.runInContext('fitInsightChartViewport(viewport)',ctx);
assert.equal(ctx.viewport.style.maxHeight,"none");
assert.equal(ctx.viewport.style.overflowY,"visible");
console.log("Both staff insights share comparison grouping/order, keep duplicate department names separate, default to organizations, and cap at six measured rows.");

ctx.getStaffProjectTrackingFilters = () => ({level:"orgGroup",orgs:["A"]});
ctx.debtProjects = ctx.debtProjects.filter(project=>project.orgGroup==="A");
ctx.items = ctx.debtProjects.map(project=>({project,days:5}));
assert.equal(vm.runInContext('getInsightOrganizationLevel()',ctx),"orgName");
assert.deepEqual(debtRows().map(row=>row.name),["A2 · A","A1 · A","Same · A"]);
delete chart.dataset.view;
vm.runInContext('renderPastUnapprovedChart(items)',ctx);
assert.match(chart.innerHTML,/A2 · A/);
assert.match(chart.innerHTML,/A1 · A/);
ctx.getStaffProjectTrackingFilters = () => ({level:"orgGroup",orgs:["A","B"]});
assert.equal(vm.runInContext('getInsightOrganizationLevel()',ctx),"orgGroup");
ctx.getStaffProjectTrackingFilters = () => ({level:"orgGroup",orgs:[]});
assert.equal(vm.runInContext('getInsightOrganizationLevel()',ctx),"orgGroup",'One organization left in results does not imply an explicit selection');
ctx.getStaffProjectTrackingFilters = () => ({level:"orgName",orgs:["A1"]});
assert.equal(vm.runInContext('getInsightOrganizationLevel()',ctx),"orgName");
console.log("A single selected major organization drills into departments in both insight charts; multiple/all organizations keep group-level bars.");
