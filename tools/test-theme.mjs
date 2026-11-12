import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/core/app.theme.js', import.meta.url), 'utf8');
function setup({ saved = null, dark = false, blocked = false } = {}) {
  const events = {};
  const picker = { addEventListener: (name, fn) => { events[name] = fn; } };
  const document = {
    documentElement: { dataset: {} }, getElementById: () => picker,
    addEventListener: (name, fn) => { events[name] = fn; }
  };
  const system = { matches: dark, addEventListener: (_, fn) => { events.system = fn; } };
  let stored = saved;
  const window = {
    matchMedia: () => system, addEventListener: (name, fn) => { events[name] = fn; }
  };
  vm.runInNewContext(source, { document, window, localStorage: {
    getItem: () => { if (blocked) throw Error('blocked'); return stored; },
    setItem: (_, value) => { if (blocked) throw Error('blocked'); stored = value; }
  } });
  events.DOMContentLoaded();
  return { document, window, system, events, picker, stored: () => stored };
}
const app = setup({ dark: true });
assert.equal(app.document.documentElement.dataset.theme, 'dark');
app.events.change({ target: { value: 'light' } });
assert.equal(app.stored(), 'light');
app.events.system();
assert.equal(app.document.documentElement.dataset.theme, 'light');
app.events.change({ target: { value: 'system' } });
assert.equal(app.document.documentElement.dataset.theme, 'dark');
app.system.matches = false;
app.events.system();
assert.equal(app.document.documentElement.dataset.theme, 'light');
app.events.storage({ key: 'sgcu-home-theme', newValue: 'dark' });
assert.equal(app.picker.value, 'dark');
app.events.storage({ key: null, newValue: null });
assert.equal(app.picker.value, 'system');
assert.equal(setup({ saved: 'invalid', dark: true }).picker.value, 'system');
assert.equal(setup({ saved: 'dark' }).document.documentElement.dataset.theme, 'dark');
const privateSession = setup({ blocked: true });
privateSession.events.change({ target: { value: 'dark' } });
assert.equal(privateSession.document.documentElement.dataset.theme, 'dark');
let plugin;
let updates = 0;
app.window.Chart = {
  registry: { plugins: { get: () => plugin } },
  register: value => { plugin = value; },
  instances: { sample: { update: () => { updates++; } } }
};
app.window.registerThemeChartPlugin();
const chart = { options: { plugins: { legend: { labels: {} } }, scales: { x: { ticks: {}, grid: {} } } } };
app.events.change({ target: { value: 'dark' } });
plugin.beforeUpdate(chart);
assert.equal(chart.options.plugins.legend.labels.color, '#b8b8b8');
assert.equal(chart.options.scales.x.ticks.color, '#b8b8b8');
app.events.change({ target: { value: 'light' } });
plugin.beforeUpdate(chart);
assert.equal(chart.options.scales.x.ticks.color, '#666666');
assert.equal(updates, 2);
console.log('Theme: saved/system/manual preferences, cross-tab reset, blocked storage, and chart refresh passed.');
