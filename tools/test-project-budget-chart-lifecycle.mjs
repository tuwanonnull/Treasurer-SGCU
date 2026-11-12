import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/features/project/app.charts.js', import.meta.url), 'utf8');
const makeElement = () => ({
  children: [], style: {}, attributes: {},
  get childElementCount() { return this.children.length; },
  replaceChildren() { this.children = []; },
  append(...children) { this.children.push(...children); },
  appendChild(child) { this.children.push(child); },
  addEventListener(type, handler) { this[type] = handler; },
  setAttribute(key, value) { this.attributes[key] = value; },
  querySelectorAll() { return this.children; }
});
const axis = makeElement();
const legend = makeElement();
const panel = { querySelector: selector => selector.endsWith('-axis') ? axis : legend };
const context = vm.createContext({window: {matchMedia: () => ({matches: false})}, document: {createElement: makeElement, createTextNode: text => text}});
const ui = fs.readFileSync(new URL('../js/features/project/app.project-ui.js', import.meta.url), 'utf8');
vm.runInContext(ui.slice(ui.indexOf('function formatProjectMoneyAxisTick'),ui.indexOf('const clubDebtValueLabelsPlugin')),context);
vm.runInContext(ui.slice(ui.indexOf('const dashboardSeriesSlotsPlugin'), ui.indexOf('function renderDashboardChartLegend')), context);
vm.runInContext(source.slice(source.indexOf('const projectBudgetFixedAxisPlugin'), source.indexOf('function wrapChartAxisLabel')) + '\nglobalThis.plugin = projectBudgetFixedAxisPlugin;', context);
const plugin = context.plugin;
const makeChart = () => ({
  canvas: {closest: () => panel}, width: 800, visible: [true, true], updates: 0,
  options: {}, config: {type: "bar"},
  scales: {x: {ticks: [{value: 0}, {value: 100}], getPixelForValue: value => value + 118}},
  data: {datasets: [{label: 'Approved', backgroundColor: 'pink'}, {label: 'Actual', backgroundColor: 'green'}]},
  isDatasetVisible(index) { return this.visible[index]; },
  setDatasetVisibility(index, value) { this.visible[index] = value; },
  hide(index) { this.setDatasetVisibility(index, false); this.update(); },
  show(index) { this.setDatasetVisibility(index, true); this.update(); },
  update() { this.updates++; plugin.afterDraw(this); }
});
const oldChart = makeChart();
plugin.afterDraw(oldChart);
assert.equal(axis.children.length, 2);
assert.equal(legend.children.length, 2);
// Chart.js releases canvas before afterDestroy: cleanup must run earlier.
plugin.beforeDestroy?.(oldChart);
oldChart.canvas = null;
assert.doesNotThrow(() => plugin.afterDestroy?.(oldChart));
assert.equal(axis.children.length, 0);
assert.equal(legend.children.length, 0);
assert.doesNotThrow(() => plugin.afterDraw(oldChart));
const newChart = makeChart();
plugin.afterDraw(newChart);
legend.children[0].click();
assert.equal(newChart.visible[0], false);
assert.equal(newChart.updates, 1);
assert.equal(newChart.options.animation.duration, 280, 'Legend toggles animate the chart');
assert.equal(oldChart.updates, 0, 'Recreated legend must update the new chart');
assert.equal(legend.children[0].attributes['aria-pressed'], 'false');
console.log('Budget chart lifecycle passed: cleanup before canvas release, safe missing canvas, and fresh legend handlers.');

context.window.matchMedia = () => ({matches: true});
legend.children[0].click();
assert.equal(newChart.options.animation, false, 'Respect reduced motion on legend toggles');

const dimensions = { scroll: {style:{}}, inner: {style:{}}, monthly: {style:{}}, grid: {} };
const card = {
  querySelector: selector => selector.includes('monthly') ? {querySelector:()=>dimensions.monthly} : selector.endsWith('-scroll') ? dimensions.scroll : dimensions.inner,
  closest: () => ({style:{setProperty:(key,value)=>{dimensions.grid[key]=value;}}})
};
context.document.querySelector = () => card;
context.document.getElementById = () => ({closureDetailsState:{rows:[{},{}]}});
context.window.matchMedia = () => ({matches:false});
context.projectBudgetComparisonChart = {data:{labels:['A','B']},height:162,chartArea:{top:5,bottom:157}};
context.getWrappedLineCount = () => 1;
context.getProjectBudgetAxisWrappedLabel = label => label;
vm.runInContext(source.slice(source.indexOf('function syncDashboardComparisonHeights'),source.indexOf('function resizeProjectBudgetComparisonChart')), context);
vm.runInContext('syncDashboardComparisonHeights()',context);
assert.equal(dimensions.inner.style.height,'162px','Two organizations use two rows rather than stretching across six');
assert.equal(dimensions.scroll.style.height,'162px');
context.projectBudgetComparisonChart.data.labels = Array(8).fill('Organization');
vm.runInContext('syncDashboardComparisonHeights()',context);
assert.equal(dimensions.scroll.style.height,'466px','Cap viewport at six rows');
assert.equal(dimensions.inner.style.height,'618px','Extra organizations remain scrollable');
console.log('Comparison row sizing and reduced-motion animation checks passed.');

newChart.options.indexAxis = 'y';
newChart.options.scales = {x:{suggestedMax:216}};
newChart.data.datasets[0].data = [100,200];
newChart.data.datasets[1].data = [60,80];
newChart.visible = [true,true];
context.testChart = newChart;
vm.runInContext('toggleDashboardChartSeries(testChart,0)',context);
assert.equal(newChart.options.scales.x.suggestedMax,86.4,'Hidden large dataset must not hold the axis open');
vm.runInContext('toggleDashboardChartSeries(testChart,0)',context);
assert.equal(newChart.options.scales.x.suggestedMax,216,'Restoring the large dataset expands the axis');
console.log('Visible-series budget axis scaling passed.');
newChart.options.indexAxis = 'x';
newChart.options.scales = {y:{max:300}};
newChart.visible = [true,true];
vm.runInContext('toggleDashboardChartSeries(testChart,0)',context);
assert.equal(newChart.options.scales.y.max,undefined,'Remove any locked monthly axis limit');
assert.equal(newChart.options.scales.y.suggestedMax,86.4,'Monthly axis shrinks to the remaining dataset');
vm.runInContext('toggleDashboardChartSeries(testChart,0)',context);
assert.equal(newChart.options.scales.y.suggestedMax,216,'Monthly axis expands when restoring the larger dataset');
console.log('Monthly hide/show automatic axis range passed.');

context.moneyScale = {min:0,max:1500000,ticks:[{value:0},{value:250000},{value:500000},{value:1000000}]};
assert.equal(vm.runInContext('formatProjectMoneyAxisTick(250000,moneyScale)',context),'0.25 ล้าน');
assert.equal(vm.runInContext('formatProjectMoneyAxisTick(500000,moneyScale)',context),'0.5 ล้าน');
assert.equal(vm.runInContext('formatProjectMoneyAxisTick(1000000,moneyScale)',context),'1 ล้าน');
assert.equal(vm.runInContext('formatProjectMoneyAxisTick(0,moneyScale)',context),'0 ล้าน');
assert.ok(!vm.runInContext('formatProjectMoneyAxisTick(250000,{max:500000})',context).includes('ล้าน'));
console.log('Consistent million units across all ticks passed.');

newChart.config.type = 'line';
newChart.options.scales = {y:{min:0,max:300,suggestedMax:300}};
for(const index of [0,1]) {
  vm.runInContext(`toggleDashboardChartSeries(testChart,${index})`,context);
  assert.equal(newChart.options.scales.y.max,undefined);
  assert.equal(newChart.options.scales.y.min,undefined);
  assert.equal(newChart.options.scales.y.suggestedMax,undefined);
  assert.equal(newChart.options.animation,false);
}
console.log('Line series disable positional animation and allow automatic value-axis scaling.');
