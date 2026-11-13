import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { hashAssetEntries, isReleaseInput, validateVersion, versionHtml, versionUrl, versionCss, versionJavaScript, versionServiceWorker } from './lib/build-assets.mjs';

const release = 'a1234567890bcdef';
test('release depends on file contents and paths, not order or wall clock', () => {
  const entries = [['js/a.js', 'a'], ['css/a.css', 'b']];
  assert.equal(hashAssetEntries(entries), hashAssetEntries(entries.toReversed()));
  assert.notEqual(hashAssetEntries(entries), hashAssetEntries([['js/a.js', 'changed'], entries[1]]));
  assert.notEqual(hashAssetEntries(entries), hashAssetEntries([['js/new.js', 'a'], entries[1]]));
  assert.ok(isReleaseInput('partials/login.html')); assert.ok(isReleaseInput('tools/lib/build-assets.mjs'));
  assert.ok(!isReleaseInput('docs/handover.md')); assert.ok(!isReleaseInput('functions/index.js'));
});
test('version replaces v while preserving other parameters/fragments and external URLs', () => {
  assert.equal(versionUrl('./js/a.js?mode=demo&v=old#section', release), `./js/a.js?mode=demo&v=${release}#section`);
  assert.equal(versionUrl('//cdn.test/a.js?v=old', release), '//cdn.test/a.js?v=old');
  assert.equal(versionUrl('https://cdn.test/a.css?v=old', release), 'https://cdn.test/a.css?v=old');
  assert.equal(versionUrl('#home', release), '#home');
  assert.equal(versionUrl('/api/data?mode=demo', release), '/api/data?mode=demo');
  assert.throws(() => validateVersion('bad"version'));
});
test('HTML, CSS and service worker share one release without dropping queries', () => {
  const html = versionHtml('<script src="js/a.js?mode=demo&amp;v=old"></script><script>window.sgcuAssetVersion="dev";window.sgcuServiceWorkerUrl="./sw.js";</script>', release);
  assert.ok(html.includes(`js/a.js?mode=demo&amp;v=${release}`));
  assert.ok(html.includes(`window.sgcuAssetVersion="${release}"`));
  assert.ok(html.includes(`./sw.js?v=${release}`));
  assert.equal(versionHtml(html, release), html);
  const css = versionCss('@import url("./base.css");a{background:url(data:image/png;base64,xxx)}', release);
  assert.ok(css.includes(`./base.css?v=${release}`)); assert.ok(css.includes('data:image/png;base64,xxx'));
  const sw = versionServiceWorker('const CACHE_VERSION = "dev"; const shell=["./js/a.js", "./css/a.css?v=old", "./img/icon.png", "./"];', release);
  assert.ok(sw.includes(`CACHE_VERSION = "${release}"`));
  assert.ok(sw.includes(`./js/a.js?v=${release}`)); assert.ok(sw.includes(`./img/icon.png?v=${release}`));
});
test('static, multiline and dynamic literal ESM dependencies inherit the release', () => {
  const source = `import './side.js';
import { a,
 b } from '../shared.js';
export { a } from './exports.js';
export * from './all.js';
const data = await import('./lazy.js?mode=demo');
import { external } from 'https://cdn.test/sdk.js';
const current = await import(\`./runtime.js\${version}\`);`;
  const output = versionJavaScript(source, release);
  for (const name of ['./side.js', '../shared.js', './exports.js', './all.js']) assert.ok(output.includes(`${name}?v=${release}`), name);
  assert.ok(output.includes(`./lazy.js?mode=demo&v=${release}`));
  assert.ok(output.includes("'https://cdn.test/sdk.js'"));
  assert.ok(output.includes('`./runtime.js${version}`'));
  assert.equal(versionJavaScript(output, release), output);
});
test('built pages, dynamic loader and service worker use the generated release', async () => {
  const dir = new URL('../dist/', import.meta.url);
  const info = JSON.parse(await fs.readFile(new URL('build-info.json', dir), 'utf8'));
  validateVersion(info.assetVersion);
  const htmlFiles = (await fs.readdir(dir)).filter(name => name.endsWith('.html'));
  for (const name of htmlFiles) {
    const html = await fs.readFile(new URL(name, dir), 'utf8');
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)) {
      const ref = match[1].replaceAll('&amp;', '&');
      if (/^(?:https?:)?\/\//.test(ref)) continue;
      assert.equal(new URL(ref, 'https://test.local/').searchParams.get('v'), info.assetVersion, `${name}: ${ref}`);
    }
    assert.ok(!html.includes('<!-- @include'), name);
  }
  const html = await fs.readFile(new URL('index.html', dir), 'utf8');
  assert.ok(html.includes(`window.sgcuAssetVersion = "${info.assetVersion}"`));
  const sw = await fs.readFile(new URL('sw.js', dir), 'utf8');
  assert.ok(sw.includes(`CACHE_VERSION = "${info.assetVersion}"`));
  const voter = await fs.readFile(new URL('js/features/budget/app.budget-meeting-voter.js', dir), 'utf8');
  assert.ok(voter.includes(`../../integrations/app.firebase-bootstrap.js?v=${info.assetVersion}`));
  const emulator = await fs.readFile(new URL('js/features/budget/app.budget-meeting-emulator.js', dir), 'utf8');
  assert.ok(emulator.includes(`./app.budget-meeting.js?v=${info.assetVersion}`));
  const css = await fs.readFile(new URL('css/style.css', dir), 'utf8');
  assert.ok(!/@import\s+url\(["']\.\//.test(css));
  assert.match(info.commit, /^[a-f0-9]{7,40}$/);
});

test('feature loader requests and deduplicates lazy scripts with the active build version', async () => {
  const source = await fs.readFile(new URL('../dist/js/core/app.feature-loader.js', import.meta.url), 'utf8');
  const requests = [];
  const window = { sgcuAssetVersion: release };
  const document = {
    createElement: () => ({}),
    body: { appendChild(script) { requests.push(script.src); script.onload(); } }
  };
  vm.runInNewContext(source, { window, document, console });
  await window.sgcuFeatureLoader.ensurePageLoaded('project-status');
  assert.ok(requests.length > 0);
  for (const ref of requests) assert.equal(new URL(ref, 'https://test.local/').searchParams.get('v'), release);
  const count = requests.length;
  await window.sgcuFeatureLoader.ensurePageLoaded('project-status');
  assert.equal(requests.length, count);
});
