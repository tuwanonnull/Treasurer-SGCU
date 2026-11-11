import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const action = name => page.locator(`[data-action="${name}"]`).first().click();
const submit = form => page.locator(`[data-form="${form}"] button[type="submit"]`).click();
async function vote(yes, no) {
  await action('open-vote');
  await page.locator('[name="yes"]').fill(String(yes));
  await page.locator('[name="no"]').fill(String(no));
  await submit('vote');
}
async function screenshot(stage) {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, stage);
    if (width !== 320) await page.screenshot({ path: `/tmp/bm-${stage}-${width}.png`, fullPage: true });
  }
}
try {
  for (const [budget, expected] of [[400, ['300.00','33.34','33.33','33.33','0.00']], [400.04, ['300.03','33.34','33.34','33.33','0.00']], [0.04, ['0.03','0.01','0.00','0.00','0.00']], [0.08, ['0.06','0.00','0.00','0.00','0.01']]]) {
    await page.goto('http://localhost:4186/budget-meeting-preview.html');
    const data = { version: 1, rounds: [{ id: 'r', label: 'ทดสอบเศษสตางค์' }], requests: [0,1,2,3,4].map(i => ({ id: String(i), budgetRoundId: 'r', projectName: `โครงการ ${i}`, organizationName: `ฝ่าย ${i}`, organizationCode: `SGCU-0${i+1}.00`, projectCodeGenerated: `SGCU-0${i+1}.00.001`, estimatedExpense: i ? 0 : budget })) };
    if (budget === 400) {
      data.requests[1].estimatedExpense = 400;
      expected.splice(0, 5, '333.33','333.34','66.67','66.66','0.00');
    }
    await page.locator('[data-source-file]').setInputFiles({ name: 'round.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
    await submit('import');
    await page.locator('[name="ack"]').check(); await submit('setup');
    await vote(0,5); await action('dissatisfied'); await submit('cancel');
    if (budget === 400) await screenshot('nomination');
    await page.locator('[name="nominee"]').nth(0).selectOption('0', { force: true });
    if (budget === 400) await page.locator('[name="nominee"]').nth(1).selectOption('1', { force: true });
    await submit('nominate');
    await action('rank');
    if (budget === 400) await screenshot('ranked');
    await action('choose-project');
    for (const i of [1,2,3]) await page.locator(`[name="recipient"][value="${i}"]`).check();
    if (budget === 400) await screenshot('recipients');
    await submit('recipients');
    if (budget === 400) await screenshot('hearing');
    for (let i=0; i<3; i++) await action('next-stage');
    await vote(1,0);
    assert.equal(await page.locator('[data-remainder]').count(), 0);
    await action('apply');
    if (budget === 400) {
      await action('choose-project');
      for (const i of [0,2,3]) await page.locator(`[name="recipient"][value="${i}"]`).check();
      await submit('recipients');
      for (let i=0; i<3; i++) await action('next-stage');
      await vote(1,0); await action('apply');
      assert.equal(await page.locator('[data-remainder-mode]').count(), 1);
      assert.match(await page.locator('.bm-allocation').innerText(), /ยอดรวมจาก 2 รายการ/);
      assert.match(await page.locator('.bm-allocation').innerText(), /0.02/);
    }
    assert.equal(await page.locator('[data-action="open-vote"]').count(), 0);
    assert.match(await page.locator('.bm-work tfoot').first().innerText(), /เศษรอจัดสรร/);
    // Handler guards must also reject stale or injected navigation controls.
    for (const blocked of ['open-vote', 'finish', 'dissatisfied']) {
      await page.evaluate(name => {
        const button = document.createElement('button');
        button.dataset.action = name; button.id = 'stale-action';
        document.querySelector('.bm-work').append(button); button.click();
      }, blocked);
      assert.match(await page.getByRole('alert').innerText(), /จัดสรรเศษคงเหลือ/);
      assert.equal(await page.locator('[data-action="allocate-pending"]').count(), 1);
    }
    await action('allocate-pending');
    assert.match(await page.getByRole('alert').innerText(), /กรุณาเลือก/);
    const remainderRow = page.locator('[data-remainder-row]').filter({has: page.locator('[data-remainder="1"]')});
    await remainderRow.locator('.bm-remainder-org').click();
    assert.equal(await page.locator('[data-remainder="1"]').isChecked(), true);
    if (budget === 400.04) await page.locator('[data-remainder="2"]').check();
    await action('allocate-pending');
    assert.match(await page.getByRole('alert').innerText(), /บันทึกมติประธาน/);
    await page.locator('[data-remainder-note]').fill('มติที่ประชุมให้ฝ่ายที่เลือกได้รับเศษเพิ่ม');
    if (budget === 400) {
      await page.locator('[data-remainder="2"]').check();
      assert.equal(await page.locator('[data-remainder-note]').inputValue(), 'มติที่ประชุมให้ฝ่ายที่เลือกได้รับเศษเพิ่ม');
      await screenshot('allocation');
    }
    if (budget < 1) {
      await page.locator('[data-remainder-mode]').selectOption('manual', { force: true });
      await page.locator('[data-remainder-amount="4"]').fill('0.03');
      await action('allocate-pending');
      assert.match(await page.getByRole('alert').innerText(), /ไม่เกินยอดคงเหลือ/);
      await page.locator('[data-remainder-amount="4"]').fill('0.01');
      await screenshot('manual-remainder');
      if (budget === 0.04) expected.splice(0, 5, '0.03','0.00','0.00','0.00','0.01');
    }
    await action('allocate-pending');
    if (budget === 0.08) {
      assert.equal(await page.locator('[data-action="open-vote"]').count(), 0);
      await page.locator('[data-remainder-mode]').selectOption('ceiling', { force: true });
      await page.locator('[data-remainder-note]').fill('ลดเพดานด้วยเศษที่เหลือ');
      await screenshot('ceiling-remainder');
      await action('allocate-pending');
      assert.match(await page.locator('.bm-work tfoot').innerText(), /ลดเพดานตามมติประธาน/);
      assert.match(await page.locator('.bm-meeting-meta').innerText(), /0.07/);
    }
    assert.deepEqual(await page.locator('.bm-summary-budget > .bm-table-wrap tbody td:nth-child(3)').allTextContents(), expected);
    assert.match(await page.locator('.bm-log').textContent(), /มติที่ประชุมให้ฝ่ายที่เลือกได้รับเศษเพิ่ม/);
    if (budget === 400) await screenshot('summary');
    await vote(5,0); await action('finish');
    if (budget === 400) await screenshot('closed');
  }
  assert.deepEqual(errors, []);
  console.log('Passed: 1/2-satang remainders, tiny budget, exact conservation, missing/excess recipients, mandatory decision note, retained drafts, later stages at 1280/390/320px.');
} finally { await browser.close(); }
