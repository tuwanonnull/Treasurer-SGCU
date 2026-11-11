import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const source = {
  version: 1,
  rounds: [{ id: 'r1', label: 'รอบทดสอบ', budgetCeiling: 50000, organizations: [{code: 'SGCU-01.00', name: 'ฝ่ายหลัก ก'}, {code: 'SGCU-02.00', name: 'ฝ่ายหลัก ข'}, {code: 'SGCU-03.00', name: 'ฝ่ายไม่มีโครงการ'}, {code: 'SGCU-01.02', name: 'หน่วยย่อยที่ห้ามนับ'}] }, { id: 'r2', label: 'รอบอื่น' }],
  requests: [
    { id: 'a', budgetRoundId: 'r1', projectCodeGenerated: 'SGCU-01.02.001', projectName: '<img src=x onerror=alert(1)>', organizationName: 'ฝ่าย ก', organizationType: 'อบจ.', estimatedExpense: 12000.50, approvedAmount: 0, status: 'pending' },
    { id: 'b', budgetRoundId: 'r1', projectCodeGenerated: 'SGCU-02.03.01', projectName: 'โครงการ ข', organizationName: 'ฝ่าย ข', organizationType: 'อบจ.', estimatedExpense: 20000, approvedAmount: 18000, status: 'approved' },
    { id: 'c', budgetRoundId: 'r1', projectCodeGenerated: 'SGCU-01.00.09', projectName: 'ไม่อนุมัติ', organizationName: 'ฝ่าย ข', estimatedExpense: 100, approvedAmount: 0, status: 'rejected' },
    { id: 'd', budgetRoundId: 'r2', projectCodeGenerated: 'SGCU-03.00.01', projectName: 'อีกรอบ', organizationName: 'ฝ่าย ค', estimatedExpense: 999, approvedAmount: 900 },
    { id: 'e', budgetRoundId: 'r1', projectCodeGenerated: 'SGCU-03.00.02', projectName: 'ไม่มียอด', organizationName: 'ฝ่าย ค', organizationType: 'ชมรม', estimatedExpense: null, approvedAmount: null }
  ]
};
source.requests.push(
  { id: 'f', budgetRoundId: 'r1', projectCodeGenerated: 'CLUB-01.00.01', projectName: 'นอก อบจ.', organizationName: 'ชมรม', estimatedExpense: 99999, approvedAmount: 99999 },
  { id: 'g', budgetRoundId: 'r1', projectCodeGenerated: 'SGCU-01.05.1000', projectName: 'หน่วยย่อยอีกหน่วย', organizationName: 'หน่วยย่อย ก2', estimatedExpense: 0, approvedAmount: 0, status: 'cancelled' },
  { id: 'h', budgetRoundId: 'r1', projectCodeGenerated: 'SGCU-1.00.01', projectName: 'รหัสไม่ครบ', organizationName: 'ไม่ควรนำเข้า', estimatedExpense: 9999, approvedAmount: 9999 }
);
source.rounds[0].sgcuBudgetCeiling = 50000;
source.rounds[0].budgetCeiling = 900000;
source.rounds[1].budgetCeiling = 100000;
const upload = data => page.locator('[data-source-file]').setInputFiles({ name: 'requests.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
try {
  await page.goto('http://localhost:4186/budget-meeting-preview.html');
  assert.equal(await page.locator('[data-form="setup"]').count(), 0);
  assert.doesNotMatch(await page.locator('.bm').innerText(), /ห้องทดลอง|ข้อมูลตัวอย่าง|ชุดตัวอย่าง/);
  assert.equal(await page.locator('.bm-empty-state').count(), 1);
  assert.equal(await page.locator('.bm-workflow, .bm-meeting-meta, .bm-history').count(), 3);
  await page.locator('[data-action="source-live"]').click();
  assert.match(await page.getByRole('alert').innerText(), /เข้าสู่ระบบ/);
  await upload(source);
  const codes = await page.locator('.bm-import-list tbody tr small').allTextContents();
  assert.deepEqual(codes, [...codes].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })));
  assert.equal(await page.locator('dialog img').count(), 0);
  assert.equal(await page.locator('[name="request"]:checked').count(), 4);
  const importRow = page.locator('[data-import-row]').filter({has: page.locator('[name="request"][value="a"]')});
  await importRow.locator('td').nth(1).click();
  assert.equal(await page.locator('[name="request"][value="a"]').isChecked(), false);
  await importRow.locator('td').nth(1).click();
  assert.equal(await page.locator('[name="request"][value="a"]').isChecked(), true);
  assert.equal(await page.locator('[name="request"]:disabled').count(), 1);
  assert.equal(await page.locator('[name="request"][value="c"]').isChecked(), true);
  assert.equal(await page.locator('[name="request"][value="g"]').isChecked(), true);
  assert.match(await page.locator('.bm-import-total').innerText(), /32,100.5/);
  assert.equal(await page.locator('[name="meetingCeiling"]').inputValue(), '50,000.00');
  await page.locator('[data-import="round"]').selectOption('r2');
  assert.equal(await page.locator('[name="meetingCeiling"]').inputValue(), '');
  await page.locator('[name="meetingCeiling"]').fill('800');
  assert.equal(await page.locator('[name="request"]').count(), 1);
  await page.locator('[data-import="round"]').selectOption('r1');
  assert.equal(await page.locator('[name="request"]').count(), 5);
  assert.equal(await page.locator('[name="request"][value="f"]').count(), 0);
  assert.equal(await page.locator('[name="request"][value="h"]').count(), 0);
  assert.equal(await page.locator('[data-import="basis"]').count(), 0);
  assert.equal(await page.locator('[name="meetingCeiling"]').inputValue(), '50,000.00');
  assert.equal(await page.locator('.bm-import-scope').count(), 0);
  assert.match(await page.locator('.bm-import-total').innerText(), /32,100.5/);
  await page.locator('[data-action="clear-selection"]').click();
  assert.equal(await page.locator('[name="request"]:checked').count(), 0);
  assert.equal(await page.locator('[data-form="import"] button[type="submit"]').isDisabled(), true);
  await page.locator('[data-import-search]').fill('โครงการ ข');
  await page.locator('[data-action="select-visible"]').click();
  assert.equal(await page.locator('[name="request"]:checked').count(), 1);
  await page.locator('[data-import="round"]').selectOption('r2');
  assert.equal(await page.locator('[name="meetingCeiling"]').inputValue(), '800.00');
  await page.locator('[data-import="round"]').selectOption('r1');
  assert.equal(await page.locator('[name="request"]:checked').count(), 1);
  await page.locator('[data-import-search]').fill('ไม่มีชื่อโครงการนี้');
  assert.equal(await page.locator('.bm-search-empty').isVisible(), true);
  await page.locator('[data-import-search]').fill('');
  await page.locator('[data-action="select-visible"]').click();
  await page.locator('[name="request"][value="b"]').uncheck();
  assert.match(await page.locator('.bm-import-total').innerText(), /รวม 12,100.50 บาท/);
  await page.locator('[name="request"][value="b"]').check();
  await page.screenshot({ path: '/tmp/bm-import-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/bm-import-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  
  await page.locator('[data-form="import"] button[type="submit"]').click();
  assert.match(await page.locator('.bm-meeting-meta').innerText(), /32,100.5/);
  assert.match(await page.locator('.bm-meeting-meta').innerText(), /50,000/);
  assert.equal(await page.locator('[name="count0"]').inputValue(), '1');
  assert.equal(await page.locator('[name="count1"]').inputValue(), '1');
  assert.equal(await page.locator('[name="count2"]').inputValue(), '1');
  assert.equal(await page.locator('[data-form="setup"] tbody tr').count(), 3);
  await page.locator('[name="ack"]').check();
  await page.locator('[data-form="setup"] button[type="submit"]').click();
  assert.match(await page.locator('.bm-work tbody tr').first().innerText(), /12,100.5/);
  assert.equal(await page.locator('.bm-work img').count(), 0);
  await page.goto('http://localhost:4186/budget-meeting-preview.html');
  await upload({ ...source, requests: [source.requests[0], source.requests[0]] });
  assert.match(await page.getByRole('alert').innerText(), /รหัสคำขอซ้ำ/);
  assert.equal(await page.locator('[data-form="setup"]').count(), 0);
  assert.match(await page.locator('.bm-source-panel').innerText(), /ยังไม่ได้เลือกข้อมูลคำขอ/);
  // The bridge supplies a detached snapshot of requests.
  await page.evaluate(value => { window.sourceFixture = value; window.sgcuGetBudgetMeetingSource = () => structuredClone(value); }, source);
  await page.locator('[data-action="source-live"]').click();
  
  await page.locator('[data-form="import"] button[type="submit"]').click();
  assert.deepEqual(await page.evaluate(() => window.sourceFixture), source);
  // The staff page keeps the empty state until a request source is selected.
  await page.setContent('<section data-page="budget-approval-staff"><div data-budget-meeting-demo></div></section>');
  await page.evaluate(() => { window.sgcuGetBudgetMeetingDefaults = () => window.sourceFixture.rounds[0].organizations.slice(0, 3); });
  await page.addScriptTag({ url: 'http://localhost:4186/js/features/budget/app.budget-meeting.js' });
  assert.equal(await page.locator('[name="count0"]').count(), 0);
  await page.evaluate(() => document.dispatchEvent(new Event('sgcu:budget-meeting-open')));
  assert.equal(await page.locator('dialog').count(), 0);
  assert.equal(await page.locator('.bm-empty-state').count(), 1);
  assert.equal(await page.locator('[data-form="setup"]').count(), 0);
  await page.locator('[data-action="source-live"]').click();
  await page.locator('[data-import="round"]').selectOption('r2');
  await page.locator('[name="meetingCeiling"]').fill('800');
  
  await page.locator('[data-form="import"] button[type="submit"]').click();
  assert.match(await page.locator('.bm-meeting-meta').innerText(), /800/);
  assert.match(await page.locator('.bm-meeting-meta').innerText(), /999/);
  assert.equal(await page.locator('[name="count0"]').inputValue(), '1');
  await page.evaluate(() => document.dispatchEvent(new Event('sgcu:budget-meeting-open')));
  assert.equal(await page.locator('dialog').count(), 0);
  await page.locator('[name="ack"]').check();
  await page.locator('[data-form="setup"] button[type="submit"]').click();
  assert.equal(await page.locator('.bm-work tbody tr td').nth(2).innerText(), '800.00');
  assert.match(await page.locator('.bm-work tfoot').innerText(), /-199/);
  assert.match(await page.locator('.bm-budget-context').innerText(), /19.92%/);
  // Equal requested amounts exercise satang rounding, zero, no ceiling and no uplift.
  for (const [ceiling, expected] of [[1, ['0.34', '0.33', '0.33']], [0, ['0', '0', '0']], ['', ['1', '1', '1']], [4, ['1', '1', '1']]]) {
    await page.goto('http://localhost:4186/budget-meeting-preview.html');
    await upload({ version: 1, rounds: [{ id: 'r', label: 'ปัดเศษ', budgetCeiling: 99 }], requests: [1, 2, 3].map(i => ({ id: String(i), budgetRoundId: 'r', projectName: `โครงการ ${i}`, organizationName: `ฝ่าย ${i}`, projectCodeGenerated: `SGCU-0${i}.00.001`, estimatedExpense: 1 })) });
    assert.equal(await page.locator('[name="meetingCeiling"]').inputValue(), '');
    await page.locator('[name="meetingCeiling"]').fill(String(ceiling));
    
    await page.locator('[data-form="import"] button[type="submit"]').click();
    await page.locator('[name="ack"]').check();
    await page.locator('[data-form="setup"] button[type="submit"]').click();
    assert.deepEqual(await page.locator('.bm-work tbody tr td:nth-child(3)').allTextContents(), expected.map(n => Number(n).toFixed(2)));
    assert.deepEqual(await page.locator('.bm-work tbody tr td:nth-child(2)').allTextContents(), ['1.00', '1.00', '1.00']);
  }
  // A first import or replacement before starting requires no extra confirmation.
  await page.goto('http://localhost:4186/budget-meeting-preview.html');
  await upload(source);
  assert.equal(await page.locator('[name="confirmImport"]').count(), 0);
  await page.locator('[data-form="import"] button[type="submit"]').click();
  await upload(source);
  await page.locator('[data-form="import"] button[type="submit"]').click();
  assert.equal(await page.locator('dialog').count(), 0);
  await page.locator('[name="ack"]').check();
  await page.locator('[data-form="setup"] button[type="submit"]').click();
  await page.locator('[data-action="back"]').click();
  await page.locator('[data-action="back-confirm"]').click();
  const history = await page.locator('.bm-log').textContent();
  await upload(source);
  await page.locator('[data-form="import"] button[type="submit"]').click();
  assert.equal(await page.getByRole('dialog', {name: 'ยืนยันเปลี่ยนชุดข้อมูล'}).count(), 1);
  assert.equal(await page.locator('.bm-log').textContent(), history);
  await page.locator('[data-action="cancel-replace-source"]').click();
  assert.equal(await page.locator('[data-form="import"]').count(), 1);
  assert.equal(await page.locator('.bm-log').textContent(), history);
  await page.locator('[data-form="import"] button[type="submit"]').click();
  await page.locator('[data-action="confirm-replace-source"]').click();
  assert.equal(await page.locator('.bm-log li').count(), 1);
  assert.equal(await page.locator('[data-form="setup"]').count(), 1);
  assert.deepEqual(errors, []);
  console.log('Passed: requested budgets, default/custom ceiling, per-round drafts, live staff initialization, department catalog, import selection, escaping, mobile layout, detached source.');
} finally { await browser.close(); }
