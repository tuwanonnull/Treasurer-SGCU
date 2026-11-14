import { chromium } from '@playwright/test';
import { readFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { createPilotServer } from './server.mjs';
import { validatePortableBackup } from './portable-backup.mjs';
import { restorePortableBackup } from './restore-portable.mjs';

const source = await readFile(process.argv[2], 'utf8'), snapshot = JSON.parse(source);
const directory = await mkdtemp(path.join(tmpdir(), 'sgcu-portable-ui-'));
const server = createPilotServer({ year68Snapshot: snapshot, trialDirectory: path.join(directory, 'original-store') });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser, restoredServer;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const role = async user => { await page.getByLabel('บัญชีทดลอง', { exact: true }).selectOption(user); await page.locator('#message').filter({ hasText: 'เปิดชุดทดลองแล้ว' }).waitFor(); };
  const state = async () => (await page.request.get(base + '/api/year68/trial')).json();
  const post = async (action, body) => { const response = await page.request.post(base + '/api/year68/trial/' + action, { headers: { Origin: base }, data: body }); assert.equal(response.status(), 200); return response.json(); };
  await page.goto(base + '/year68-trial'); await role('head');
  let current = await state(), p = current.projects[0];
  await post('commit', { projectId: p.id, version: p.version, changes: { O: ((p.money.O + 123) / 100).toFixed(2) }, reason: 'เตรียมทดสอบสำรอง' });
  await role('secretary'); assert.equal(await page.getByRole('button', { name: 'ดาวน์โหลดชุดสำรองทั้งหมด', exact: true }).isVisible(), false);
  current = await state(); p = current.projects[0];
  await post('propose', { projectId: p.id, version: p.version, changes: { O: ((p.money.O + 123) / 100).toFixed(2) }, reason: 'คำขอค้างสำหรับทดสอบกู้คืน' });
  await role('head'); current = await state();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#portable-backup').scrollIntoViewIfNeeded(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ดาวน์โหลดชุดสำรองทั้งหมด', exact: true }).click();
  const download = await downloadEvent; assert.equal(download.suggestedFilename(), 'sgcu-year68-trial-backup.json');
  const backupPath = path.join(directory, download.suggestedFilename()); await download.saveAs(backupPath);
  const backupBytes = await readFile(backupPath, 'utf8'), bundle = JSON.parse(backupBytes), validated = validatePortableBackup(bundle);
  assert.equal(validated.source.projects.length, snapshot.projects.length); assert.deepEqual(validated.checkpoint.data.totals, current.totals);
  assert.deepEqual(validated.checkpoint.audit, current.audit); assert.equal(validated.checkpoint.requests.filter(r => r.state === 'pending').length, 1);
  assert.deepEqual(await state(), current); // Export must not mutate or create a new financial revision.
  const recoveryStarted = performance.now(), destination = path.join(directory, 'restored-store');
  const recovery = restorePortableBackup(bundle, destination);
  const restoredSource = JSON.parse(await readFile(path.join(destination, 'snapshot.json'), 'utf8'));
  restoredServer = createPilotServer({ year68Snapshot: restoredSource, trialDirectory: destination });
  await new Promise(resolve => restoredServer.listen(0, '127.0.0.1', resolve));
  const restoredBase = `http://127.0.0.1:${restoredServer.address().port}`;
  await page.goto(restoredBase + '/year68-trial'); await role('head');
  const restored = await (await page.request.get(restoredBase + '/api/year68/trial')).json();
  assert.equal(restored.totalCount, snapshot.projects.length); assert.deepEqual(restored.totals, current.totals);
  assert.deepEqual(restored.audit.slice(0, -1), current.audit); assert.equal(restored.audit.at(-1).action, 'restore');
  assert.equal(restored.requests[0].stale, false); assert.equal(restored.requests[0].reason, current.requests[0].reason);
  assert.notEqual(restored.projects[0].version, current.projects[0].version);
  for (let offset = 0; offset < restored.totalCount; offset += 25) {
    const slice = await (await page.request.get(restoredBase + '/api/year68/trial?offset=' + offset)).json();
    for (const project of slice.projects) {
      const old = validated.checkpoint.data.projects.find(p => p.id === project.id);
      assert.deepEqual(project.money, old.money); assert.deepEqual(project.statuses, old.statuses); assert.equal(project.trialAssignee, old.trialAssignee);
    }
  }
  const elapsedMs = Math.round(performance.now() - recoveryStarted);
  await page.locator('#portable-backup').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(directory, 'backup-mobile.png') });
  assert.deepEqual(errors, []); assert.equal(await readFile(process.argv[2], 'utf8'), source); assert.equal(await readFile(backupPath, 'utf8'), backupBytes);
  console.log(JSON.stringify({ result: 'PASS', projects: recovery.projectCount, recoveryAndVerificationMs: elapsedMs, checks: 'browser download, role visibility, full data restore to new directory, pending approval preserved, source unchanged', directory }));
} finally {
  if (browser) await browser.close();
  if (restoredServer) await new Promise(resolve => restoredServer.close(resolve));
  await new Promise(resolve => server.close(resolve));
}
