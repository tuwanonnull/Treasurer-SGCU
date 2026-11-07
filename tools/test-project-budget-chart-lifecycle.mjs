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
const context = vm.createContext({document: {createElement: makeElement, createTextNode: text => text}});
vm.runInContext(source.slice(source.indexOf('const projectBudgetFixedAxisPlugin'), source.indexOf('function wrapChartAxisLabel')) + '\nglobalThis.plugin = projectBudgetFixedAxisPlugin;', context);
const plugin = context.plugin;
const makeChart = () => ({
  canvas: {closest: () => panel}, width: 800, visible: [true, true], updates: 0,
  scales: {x: {ticks: [{value: 0}, {value: 100}], getPixelForValue: value => value + 118}},
  data: {datasets: [{label: 'Approved', backgroundColor: 'pink'}, {label: 'Actual', backgroundColor: 'green'}]},
  isDatasetVisible(index) { return this.visible[index]; },
  setDatasetVisibility(index, value) { this.visible[index] = value; },
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
assert.equal(oldChart.updates, 0, 'Recreated legend must update the new chart');
assert.equal(legend.children[0].attributes['aria-pressed'], 'false');
console.log('Budget chart lifecycle passed: cleanup before canvas release, safe missing canvas, and fresh legend handlers.');
