import { chromium } from '@playwright/test';
import { readFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { createPilotServer } from './server.mjs';

// Separate browser contexts have separate session cookies, like two users.
const source = await readFile(process.argv[2], 'utf8');
const snapshot = JSON.parse(source), chosen = snapshot.projects[0];
const directory = await mkdtemp(path.join(tmpdir(), 'sgcu-concurrent-status-'));
const server = createPilotServer({ year68Snapshot: snapshot, trialDirectory: path.join(directory, 'store') });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const head = await browser.newContext(), assistant = await browser.newContext();
  const page = await assistant.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const post = async (context, route, body) => {
    const response = await context.request.post(`${base}/api/${route}`, { data: body, headers: { Origin: base } });
    assert.equal(response.ok(), true, await response.text()); return response.json();
  };
  const state = async () => (await head.request.get(`${base}/api/year68/trial?q=${encodeURIComponent(chosen.code)}`)).json();
  const project = data => data.projects.find(p => p.sourceId === chosen.id);
  const action = async (route, body) => {
    const p = project(await state());
    return post(head, `year68/trial/${route}`, { projectId: p.id, version: p.version, ...body });
  };
  const message = text => page.locator('#message').filter({ hasText: text }).waitFor();
  const card = () => page.locator('#list details').first();
  const preview = async field => {
    if (!await card().evaluate(el => el.open)) await card().locator('summary').click();
    await card().getByLabel('ช่องสถานะ', { exact: true }).selectOption(field);
    const select = card().getByLabel('สถานะใหม่', { exact: true });
    await select.selectOption({ index: 0 });
    await card().getByRole('button', { name: 'ดูผลจากสถานะ', exact: true }).click();
    await card().getByText('ผลสถานะและยอดก่อนบันทึก', { exact: true }).waitFor();
  };
  const rejectedSubmit = async expectedStatus => {
    const response = page.waitForResponse(r => r.url() === `${base}/api/year68/trial/status` && r.request().method() === 'POST');
    await card().getByRole('button', { name: 'บันทึกสถานะในชุดทดลอง', exact: true }).click();
    assert.equal((await response).status(), expectedStatus);
    await page.locator('#message.error').waitFor();
  };
  await post(head, 'session', { userId: 'head' });
  await action('assign', { assignee: 'assistantA', reason: '' });
  await page.goto(base + '/year68-trial');
  await page.getByLabel('บัญชีทดลอง', { exact: true }).selectOption('assistantA');
  await message('เปิดชุดทดลองแล้ว');

  // A preview must not authorize overwriting a later edit by the head.
  await preview('Q');
  await action('status', { field: 'Q', value: chosen.statuses.Q === 'เลขาตรวจสอบ' ? 'รอแก้ไข' : 'เลขาตรวจสอบ', reason: '' });
  const afterHead = await state();
  await rejectedSubmit(409);
  await message('ข้อมูลเปลี่ยนแล้ว');
  assert.deepEqual(await state(), afterHead, 'Rejected stale write must not change money, statuses, requests, audit or backups');
  await page.locator('#refresh').click(); await message('โหลดข้อมูลล่าสุดแล้ว');
  await card().locator('summary').click();
  assert.equal(await card().getByLabel('ช่องสถานะ', { exact: true }).locator('option[value="Q"]').count(), 0);

  // A page already open for A cannot write after reassignment to B.
  await preview('Y');
  await action('assign', { assignee: 'assistantB', reason: '' });
  const afterAssignment = await state();
  await rejectedSubmit(403);
  await message('แก้ได้เฉพาะโครงการที่รับผิดชอบ');
  assert.deepEqual(await state(), afterAssignment);
  await page.locator('#refresh').click(); await message('โหลดข้อมูลล่าสุดแล้ว');
  assert.equal(await page.locator('#list details').count(), 0);
  await page.getByText('ยังไม่มีโครงการที่มอบหมายให้บัญชีนี้ ให้เหรัญญิกมอบหมายผู้ช่วยจำลองก่อน', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.equal(await readFile(process.argv[2], 'utf8'), source);
  console.log(JSON.stringify({ result: 'PASS', checks: 'independent sessions, stale preview rejected, reassigned assistant rejected, rejected writes leave state unchanged, refresh removes unavailable options and projects, source unchanged' }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
