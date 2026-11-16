import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { readScriptSource, readCssSource } from '../lib/source-includes.mjs';
import { isReleaseInput, versionJavaScript, versionCss } from '../lib/build-assets.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sgcu-includes-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, write(name, text) { const file = path.join(root, name); fs.writeFileSync(file, text); return file; } };
}

test('script fragments preserve lexical scope, declaration order and live state', t => {
  const { root, write } = fixture(t);
  const entry = write('entry.js', 'function start() {\nlet value = 1;\n/* @include ./actions.js.inc */\nvalue = 7;\nreturn increment();\n}\nstart();');
  write('actions.js.inc', '/* @include ./nested.js.inc */\nconst increment = () => value += step;\n');
  write('nested.js.inc', 'const step = 3;\n');
  assert.equal(vm.runInNewContext(readScriptSource(entry, { root })), 10);
});

test('missing, circular and out-of-root script fragments fail the build', t => {
  const { root, write } = fixture(t);
  const entry = write('entry.js', '/* @include ./missing.js.inc */\n');
  assert.throws(() => readScriptSource(entry, { root }), /ENOENT/);
  write('missing.js.inc', '/* @include ./entry.js */\n');
  assert.throws(() => readScriptSource(entry, { root }), /Circular/);
  write('entry.js', '/* @include ../ */\n');
  assert.throws(() => readScriptSource(entry, { root }), /escapes root/);
  fs.symlinkSync(path.dirname(root), path.join(root, 'outside'));
  write('entry.js', '/* @include ./outside */\n');
  assert.throws(() => readScriptSource(entry, { root }), /escapes root/);
});

test('nested CSS preserves cascade order and rejects invalid imports', t => {
  const { root, write } = fixture(t);
  const entry = write('style.css', '@import url("./base.css");\n.x { color: blue; }\n');
  write('base.css', '@import url("./tokens.css");\n.x { color: red; }\n');
  write('tokens.css', ':root { --color: pink; }\n');
  assert.equal(readCssSource(entry, { root }), ':root { --color: pink; }\n.x { color: red; }\n.x { color: blue; }\n');
  write('tokens.css', '@import url("./style.css");\n');
  assert.throws(() => readCssSource(entry, { root }), /Circular/);
  write('tokens.css', '@import url("./missing.css");\n');
  assert.throws(() => readCssSource(entry, { root }), /ENOENT/);
  write('tokens.css', '@import url("./../outside.css");\n');
  // A missing external file also fails closed; an existing external symlink is
  // checked by realpath before its contents can be read.
  assert.throws(() => readCssSource(entry, { root }));
});

test('built feature scripts contain all fragments with the active release', () => {
  const dist = new URL('../../dist/', import.meta.url);
  const version = JSON.parse(fs.readFileSync(new URL('build-info.json', dist), 'utf8')).assetVersion;
  assert.ok(version);
  for (const name of ['staff/app.staff-access', 'borrow/app.borrow-assets']) {
    const relative = `js/features/${name}.js`;
    const source = readScriptSource(new URL(`../../web/${relative}`, import.meta.url));
    const built = fs.readFileSync(new URL(relative, dist), 'utf8');
    assert.equal(built, versionJavaScript(source, version));
    assert.doesNotMatch(built, /\/\* @include /);
    new vm.Script(built);
  }
  assert.ok(!fs.readdirSync(dist, { recursive: true }).some(name => name.endsWith('.js.inc')));
  assert.ok(isReleaseInput('tools/lib/source-includes.mjs'));
  assert.ok(isReleaseInput('web/js/features/staff/app.staff-access.parts/staff-directory.js.inc'));
  for (const name of ['style.css', 'pages/operations.css']) {
    const source = readCssSource(new URL(`../../web/css/${name}`, import.meta.url));
    assert.equal(fs.readFileSync(new URL(`css/${name}`, dist), 'utf8'), versionCss(source, version));
    assert.doesNotMatch(source, /^@import.*\.\//m);
  }
});

test('mobile controllers load once before app initialization', () => {
  const html = fs.readFileSync(new URL('../../dist/index.html', import.meta.url), 'utf8');
  const context = vm.createContext({});
  for (const name of ['project', 'dashboard', 'directory', 'meeting-room']) {
    const relative = `js/core/mobile/app.mobile-${name}.js`;
    assert.equal(html.split(relative).length - 1, 1);
    assert.ok(html.indexOf(relative) < html.indexOf('js/core/app.init.js'));
    vm.runInContext(fs.readFileSync(new URL(`../../dist/${relative}`, import.meta.url), 'utf8'), context);
  }
  for (const name of ['Project', 'Dashboard', 'Directory', 'MeetingRoom']) {
    assert.equal(typeof context[`init${name}MobileActionBar`], 'function');
  }
});
