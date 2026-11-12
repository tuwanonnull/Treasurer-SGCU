import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL(`../js/${name}`, import.meta.url), 'utf8');
const ui = read('features/project/app.project-ui.js');
const kpis = ui.slice(ui.indexOf('function renderHomeKpis('), ui.indexOf('function statusMainToBadgeClass('));
const helpers = read('core/app.helpers.js');
class Chart {
  constructor(canvas, config) { this.data = config.data; this.options = config.options; }
  update() {}
  destroy() { this.destroyed = true; }
}
const element = () => ({ textContent: '', style: {}, getContext: () => ({}) });
const ctx = vm.createContext({
  dashboardSeriesSlotsPlugin: {}, Chart, document: { getElementById: element }, projects: [],
  initDashboardBudgetComparisonToggle() {}, renderDonutExternalTooltip() {},
  getDonutTooltipLines: rows => rows.map(p => p.code),
  renderHomeHeatmap(rows) { ctx.heatmapRows = rows; },
  renderDashboardChartLegend(chart) { ctx.legendChart = chart; },
  setDashboardChartEmptyState(panelId, empty) { ctx[panelId] = empty; },
  homeKpiChart: null, homeHeatmapEl: {}, homeHeatmapMonthsEl: {},
  kpiOnTimeDonutChart: null, kpiBudgetUsageDonutChart: null
});
for (const name of new Set(kpis.match(/\bkpi\w+(?:El|Canvas)\b/g))) ctx[name] = element();
vm.runInContext(helpers.slice(helpers.indexOf('function parseProjectDate'), helpers.indexOf('function getCloseDurationDays')), ctx);
vm.runInContext(helpers.slice(helpers.indexOf('function getCloseDurationDays'), helpers.indexOf('\n}', helpers.indexOf('function getCloseDurationDays')) + 2), ctx);
vm.runInContext(ui.slice(ui.indexOf('function updateDonutChart'), ui.indexOf('function initDashboardBudgetComparisonToggle')), ctx);
vm.runInContext(kpis, ctx);
const project = {code:'A',statusMain:'อนุมัติโครงการ',statusClose:'ส่งกิจการนิสิตเรียบร้อย',closeDuration:10,approvedBudget100:100,actualBudget:50,budget:100,lastWorkDate:'01/10/2569',orgGroup:'Group',year:'2569'};
ctx.rows = [project];
vm.runInContext('renderHomeKpis(rows)', ctx);
assert.equal(ctx.kpiOnTimeEl.textContent, '100.0%');
assert.equal(ctx.kpiBudgetUsageEl.textContent, '50.0%');
const previousMonthly = ctx.homeKpiChart;
vm.runInContext('renderHomeKpis([])', ctx);
for (const name of ['kpiOnTimeEl','kpiOnTimeStaffEl','kpiBudgetUsageEl','kpiBudgetUsageStaffEl']) assert.equal(ctx[name].textContent,'0.0%');
assert.equal(ctx.kpiOnTimeDonutChart.data.datasets[0].data[0],0);
assert.equal(ctx.kpiBudgetUsageDonutChart.data.datasets[0].data[0],0);
assert.equal(ctx.kpiClosedProjectsEl.textContent,'0');
assert.equal(ctx.kpiOnTimeBarEl.style.width,'0%');
assert.equal(ctx.kpiBudgetUsageBarEl.style.width,'0%');
assert.equal(ctx.heatmapRows.length,0);
assert.ok(previousMonthly.destroyed);
assert.equal(ctx.homeKpiChart,null);
assert.equal(ctx.legendChart,null);
assert.equal(ctx.kpiMonthlyCaptionEl.textContent,'ไม่มีข้อมูลตรงกับตัวกรอง');
assert.equal(ctx.budgetMonthlyPanelStaff,true);
vm.runInContext('renderHomeKpis(rows)', ctx);
assert.equal(ctx.kpiBudgetUsageEl.textContent,'50.0%');
assert.ok(ctx.homeKpiChart && ctx.homeKpiChart !== previousMonthly);
assert.equal(ctx.budgetMonthlyPanelStaff,false);

Object.assign(ctx, {projects:[project],yearSelect:{value:'all'},orgTypeSelect:{value:'all'},orgSelect:{value:'all'},getChartOrgGroups:()=>['Group'],statusPieChart:new Chart(null,{data:{datasets:[{}]},options:{plugins:{centerText:{}}}})});
vm.runInContext(read('features/project/app.pie.js'),ctx);
vm.runInContext('updateApprovedBudgetPie(rows)',ctx);
assert.equal(ctx.statusPieChart.data.datasets[0].data[0],100);
vm.runInContext('updateApprovedBudgetPie([])',ctx);
assert.equal(ctx.statusPieChart.data.labels.length,0);
assert.equal(ctx.statusPieChart.data.datasets[0].data.length,0);
assert.equal(ctx.statusPieChart.options.plugins.centerText.subText,'ไม่มีข้อมูลตรงกับตัวกรอง');
vm.runInContext('updateApprovedBudgetPie(rows)',ctx);
assert.equal(ctx.statusPieChart.data.datasets[0].data[0],100);
console.log('Chart filter regression passed: populated → empty → populated resets KPI values, donuts, bars, monthly chart, legend, heatmap and budget pie.');
assert.equal(ctx.homeKpiChart.options.scales.y.max, undefined, 'Monthly value axis must remain free to rescale');
assert.equal(ctx.homeKpiChart.options.scales.y.ticks.maxTicksLimit,5);
console.log('Monthly budget axis permits rescaling and uses compact tick labels.');
