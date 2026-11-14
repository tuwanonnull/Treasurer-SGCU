import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPilotServer } from './server.mjs';

const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
const server = createPilotServer({ year68Snapshot: snapshot });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/year68`);
  await page.getByLabel('บัญชีทดลอง', { exact: true }).selectOption('head');
  await page.getByText('เปิดสำเนาข้อมูลแบบอ่านอย่างเดียวแล้ว', { exact: true }).waitFor();
  assert.equal(await page.locator('#count').innerText(), String(snapshot.projects.length));
  assert.equal(await page.locator('#list details').count(), Math.min(25, snapshot.projects.length));
  const named = snapshot.projects.find(p => p.responsibleName);
  if (named) {
    const expected = snapshot.projects.filter(p => p.responsibleName === named.responsibleName).length;
    const option = page.locator('#reviewer option').filter({ hasText: `${named.responsibleName} · ${expected} โครงการ` }).first();
    await page.getByLabel('ตรวจโครงการแยกตามชื่อใน AI', { exact: true }).selectOption(await option.getAttribute('value'));
    await page.getByText(`พบ ${expected} โครงการ · แสดงครั้งละ 25 โครงการ`, { exact: true }).waitFor();
    assert.equal(await page.locator('#list details').count(), Math.min(25, expected));
    await page.getByLabel('ตรวจโครงการแยกตามชื่อใน AI', { exact: true }).selectOption('all');
    await page.getByText(`พบ ${snapshot.projects.length} โครงการ · แสดงครั้งละ 25 โครงการ`, { exact: true }).waitFor();
  }
  if (snapshot.projects.length > 25) {
    await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
    await page.getByText(/^หน้า 2 \//).waitFor();
    await page.getByRole('button', { name: 'ก่อนหน้า', exact: true }).click();
    await page.getByText(/^หน้า 1 \//).waitFor();
  }
  await page.getByLabel('ค้นหาโครงการ / องค์กร / ผู้ตรวจเอกสาร').fill(snapshot.projects[0].code);
  await page.getByRole('button', { name: 'ค้นหา', exact: true }).click();
  await page.locator('#message').filter({ hasText: 'เปิดสำเนาข้อมูลแบบอ่านอย่างเดียวแล้ว' }).waitFor();
  await page.locator('#list summary').first().click();
  await page.getByRole('heading', { name: 'ยอดเงิน (บาท)', exact: true }).first().waitFor();
  if (snapshot.projects[0].formulaInputs) {
    const detail = page.locator('#list details').first();
    await detail.getByLabel(snapshot.moneyLabels.O, { exact: true }).fill('1234.56');
    const response = page.waitForResponse(r => r.url().endsWith('/api/year68/preview') && r.request().method() === 'POST');
    await detail.getByRole('button', { name: 'ดูผลคำนวณ', exact: true }).click();
    const result = await (await response).json();
    assert.equal(result.after.O, 123456); assert.equal(result.saved, false);
    await detail.getByText('ผลคำนวณทดลอง — ยังไม่บันทึก', { exact: true }).waitFor();
    await detail.getByLabel(snapshot.moneyLabels.O, { exact: true }).fill('1.001');
    assert.equal(await detail.locator('.preview-result').count(), 0);
    await detail.getByRole('button', { name: 'ดูผลคำนวณ', exact: true }).click();
    await detail.getByText('กรอกยอดตั้งแต่ 0 ถึง 999,999,999.99 บาท ทศนิยมไม่เกิน 2 ตำแหน่ง', { exact: true }).waitFor();
    await detail.getByLabel(snapshot.moneyLabels.O, { exact: true }).fill('1234.56');
    await detail.getByRole('button', { name: 'ดูผลคำนวณ', exact: true }).click();
    await detail.getByText('ผลคำนวณทดลอง — ยังไม่บันทึก', { exact: true }).waitFor();
  } else assert.equal(await page.locator('#list input, #list select, #list button').count(), 0);
  await page.screenshot({ path: path.join(tmpdir(), 'sgcu-year68-readonly-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: path.join(tmpdir(), 'sgcu-year68-readonly-mobile.png'), fullPage: true });
  await page.getByLabel('ค้นหาโครงการ / องค์กร / ผู้ตรวจเอกสาร').fill('__no_such_project_qa__');
  await page.getByRole('button', { name: 'ค้นหา', exact: true }).click();
  await page.getByText('ไม่พบรายการที่ตรงกับคำค้น', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(JSON.parse(await readFile(process.argv[2], 'utf8')), snapshot);
  console.log('PASS: year-68 page; pagination, search, details, calculation preview and validation, desktop/mobile, source unchanged');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
