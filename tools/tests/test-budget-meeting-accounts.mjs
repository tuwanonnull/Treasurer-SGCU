import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
const origin = 'http://localhost:4186';
const contexts = [];
async function page() {
  const context = await browser.newContext(); contexts.push(context);
  // Never let this test contact the production Firestore/Auth project.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com'].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  return context.newPage();
}
async function login(p, url, email) {
  await p.goto(url);
  await p.locator('#emulator-login [name="email"]').fill(email);
  await p.locator('#emulator-login [name="password"]').fill('Meeting-test-123!');
  await p.locator('#emulator-login button').click();
}
try {
  const host = await page();
  await host.goto(`${origin}/budget-meeting-emulator.html?meetingEmulator=1`);
  await host.locator('#emulator-chair').click();
  await host.locator('[name="representative0"]').waitFor();
  assert.equal(await host.locator('[name="representative0"]').inputValue(), 'chair01@chula.ac.th');
  assert.equal(await host.locator('[name="representative0"] option').count(), 3);
  assert.equal(await host.locator('[name="representative1"] option').count(), 2);
  await host.locator('[name="representative0"]').selectOption('member01@chula.ac.th');
  await host.locator('[data-action="source-live"]').click();
  
  await host.locator('[data-form="import"] button[type="submit"]').click();
  assert.equal(await host.locator('[name="representative0"]').inputValue(), 'member01@chula.ac.th');
  assert.equal(await host.locator('[name="proxy0"]').count(), 0);
  const aligned = await host.locator('[data-form="setup"] tbody tr').first().evaluate(row => {
    const input = row.querySelector('input[type="number"]').getBoundingClientRect();
    const select = row.querySelector('select').getBoundingClientRect();
    return Math.abs(input.top - select.top) < 1 && Math.abs(input.height - select.height) < 1;
  });
  assert.equal(aligned, true);
  await host.screenshot({ path: '/tmp/bm-roster-accounts.png', fullPage: true });
  await host.setViewportSize({ width: 390, height: 844 });
  assert.equal(await host.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert(await host.locator('[name="representative0"]').evaluate(el => el.getBoundingClientRect().width > 180));
  await host.screenshot({ path: '/tmp/bm-roster-mobile.png', fullPage: true });
  await host.setViewportSize({ width: 1280, height: 900 });
  await host.locator('[name="online"]').check();
  await host.locator('[name="ack"]').check();
  await host.locator('[data-form="setup"] button[type="submit"]').click();
  await host.locator('[data-action="open-vote"]').click();
  const link = await host.locator('[aria-label="ลิงก์ลงคะแนน"]').inputValue();
  assert(link.includes('meetingEmulator=1'));
  const member = await page();
  await login(member, link, 'member01@chula.ac.th');
  await member.locator('[name="choice"][value="yes"]').check();
  await member.locator('#ballot-form button').click();
  await member.getByText('บันทึกคะแนนแล้ว', { exact: true }).waitFor();
  assert.equal(await member.evaluate(async () => {
    try { await window.sgcuBudgetBallots.vote(new URLSearchParams(location.search).get('poll'), 'SGCU-01.00', ['no']); return 'allowed'; }
    catch (e) { return e.code; }
  }), 'permission-denied');
  const replaced = await page();
  await login(replaced, link, 'chair01@chula.ac.th');
  await replaced.getByText('บัญชีนี้ไม่ได้รับสิทธิ์เป็นผู้แทนฝ่ายในรอบนี้', { exact: true }).waitFor();
  const outsider = await page();
  await login(outsider, link, 'outsider@chula.ac.th');
  await outsider.getByText('บัญชีนี้ไม่ได้รับสิทธิ์เป็นผู้แทนฝ่ายในรอบนี้', { exact: true }).waitFor();
  const second = await page();
  await login(second, link, 'chair02@chula.ac.th');
  await second.locator('[name="choice"]').first().waitFor();
  assert.equal(await second.evaluate(async () => {
    try { await window.sgcuBudgetBallots.vote(new URLSearchParams(location.search).get('poll'), 'SGCU-01.00', ['yes']); return 'allowed'; }
    catch (e) { return e.code; }
  }), 'permission-denied');
  await host.locator('[data-action="close-online"]').click();
  await second.getByText('ปิดรับคะแนนแล้ว', { exact: true }).waitFor();
  assert.equal(await second.evaluate(async () => {
    try { await window.sgcuBudgetBallots.vote(new URLSearchParams(location.search).get('poll'), 'SGCU-02.00', ['yes']); return 'allowed'; }
    catch (e) { return e.code; }
  }), 'permission-denied');
  assert.match(await host.locator('.bm-result').innerText(), /พึงพอใจ 1/);
  assert.match(await host.locator('.bm-result').innerText(), /ยังไม่ลงคะแนน 1/);
  console.log('Passed real Auth + Firestore emulators: default president, substitute dropdown, isolated accounts, replaced president/outsider denied, duplicates/cross-department/late votes denied, final tally.');
} finally { await browser.close(); }
