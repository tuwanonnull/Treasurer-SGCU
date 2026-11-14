import { loadMeetingFixture } from '../emulator/budget-meeting-test-fixture.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const action = name => page.locator(`[data-action="${name}"]`).click();
  const submit = name => page.locator(`[data-form="${name}"] button[type="submit"]`).click();
  await page.goto('http://localhost:4186/budget-meeting-preview.html');
  await loadMeetingFixture(page);
  await page.locator('[name="ack"]').check(); await submit('setup');
  await action('open-vote'); await page.locator('[name="no"]').fill('6'); await submit('vote');
  await action('dissatisfied'); await submit('cancel');
  await page.locator('[data-rank-count]').fill('3'); await page.locator('[data-rank-count]').press('Tab');
  assert.equal(await page.locator('[name="nominee"]').count(), 3);
  const rank = i => page.locator('[name="nominee"]').nth(i);
  assert.equal(await rank(0).isVisible(), true);
  assert.equal(await page.locator('[data-rank-search], [data-rank-clear], [data-rank-label]').count(), 0);
  await rank(0).selectOption('0'); await rank(1).selectOption('1');
  assert.equal(await rank(2).locator('option[value="0"]').isDisabled(), true);
  await page.locator('.bm-rank-row').nth(1).locator('[data-rank-move="-1"]').click();
  assert.equal(await rank(0).inputValue(), '1');
  assert.equal(await rank(1).inputValue(), '0');
  await rank(0).selectOption('');
  assert.equal(await rank(0).inputValue(), '0');
  assert.equal(await rank(1).inputValue(), '');
  assert.match(await page.locator('[data-rank-progress]').innerText(), /1 \/ 3/);
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:`/tmp/bm-ranking-ui-${width}.png`, fullPage:true});
  }
  await rank(0).selectOption('2'); await rank(1).evaluate(el => { el.querySelector('option[value="2"]').disabled = false; el.value = '2'; }); await submit('nominate');
  assert.match(await page.getByRole('alert').innerText(), /ไม่เลือกโครงการซ้ำ/);
  await rank(1).selectOption(''); await rank(2).selectOption('0'); await submit('nominate');
  assert.match(await page.getByRole('alert').innerText(), /ต่อเนื่อง/);
  await rank(1).selectOption('1'); await submit('nominate');
  assert.equal(await page.locator('[data-rank-count]').isDisabled(), true);
  for (const [index, id] of ['3', '4', '5'].entries()) await rank(index).selectOption(id);
  await submit('nominate');
  await action('rank');
  assert.deepEqual(await page.locator('.bm-work tbody td:nth-child(3) strong').allTextContents(), ['3', '3', '2']);
  assert.match(await page.locator('.bm-work tbody tr').first().innerText(), /อาสาพัฒนาชุมชน/);
  const choices = () => page.locator('[data-action="choose-project"]').evaluateAll(nodes => nodes.map(node => node.dataset.project));
  assert.deepEqual(await choices(), ['2','3','1']);
  assert.equal(await page.locator('.bm-ranked-table button').count(), 0);
  await page.locator('tr[data-action="choose-project"][data-project="1"]').press('Enter');
  assert.match(await page.locator('.bm-work h3').innerText(), /เทศกาลดนตรี/);
  await page.locator('[name="recipient"][value="0"]').check(); await submit('recipients');
  await action('switch-project');
  assert.deepEqual(await choices(), ['2','3','1']);
  assert.match(await page.locator('.bm-work .bm-tag').innerText(), /3 โครงการ/);
  for (const width of [1280,390,320]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:`/tmp/bm-project-picker-${width}.png`,fullPage:true});
  }
  await page.locator('[data-action="choose-project"][data-project="3"]').click();
  await action('skip');
  assert.deepEqual(await choices(), ['2','1']);
  await page.evaluate(() => {
    const stale = document.createElement('button');
    stale.dataset.action = 'choose-project'; stale.dataset.project = '3';
    document.querySelector('.bm-work').append(stale); stale.click();
  });
  assert.match(await page.getByRole('alert').innerText(), /ไม่อยู่ในรายการรอพิจารณา/);
  assert.deepEqual(await choices(), ['2','1']);
  await action('back'); await action('back-confirm');
  assert.match(await page.locator('.bm-work h3').innerText(), /กีฬา/);
  await action('skip');
  await page.locator('[data-action="choose-project"][data-project="2"]').click();
  await action('skip');
  assert.deepEqual(await choices(), ['1']);
  await page.locator('[data-action="choose-project"][data-project="1"]').click();
  await action('skip');
  assert.match(await page.locator('.bm-work h3').innerText(), /สรุปงบ/);
  await page.goto('http://localhost:4186/budget-meeting-preview.html');
  const source = { version: 1, rounds: [{id:'r',label:'12 projects'}], requests: Array.from({length:12}, (_, i) => ({id:String(i),budgetRoundId:'r',projectCodeGenerated:`SGCU-01.00.${String(i + 1).padStart(3,'0')}`,projectName:`Project ${i}`,organizationName:'Department 1',estimatedExpense:100})) };
  await page.locator('[data-source-file]').setInputFiles({name:'ranks.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await submit('import');
  await page.locator('[name="ack"]').check(); await submit('setup');
  await action('open-vote'); await page.locator('[name="no"]').fill('1'); await submit('vote');
  await action('dissatisfied'); await submit('cancel');
  assert.equal(await page.locator('[data-rank-count]').inputValue(), '10');
  await page.locator('[data-rank-count]').fill('12'); await page.locator('[data-rank-count]').press('Tab');
  assert.equal(await page.locator('[name="nominee"]').count(), 12);
  for (let i=0;i<12;i++) await rank(i).selectOption(String(i));
  await submit('nominate'); await action('rank');
  assert.deepEqual(await page.locator('.bm-work tbody td:nth-child(3) strong').allTextContents(), Array.from({length:12},(_,i)=>String(12-i)));
  for (let i=0;i<12;i++) {
    await page.locator(`[data-action="choose-project"][data-project="${11-i}"]`).click();
    assert.match(await page.locator('.bm-work .bm-tag').innerText(), new RegExp(`ลำดับ ${i+1} / 12`));
    await action('skip');
  }
  assert.match(await page.locator('.bm-work h3').innerText(), /สรุปงบ/);
  console.log('Passed: configurable ranks, descending scores, duplicate/gap rejection and locked count.');
} finally { await browser.close(); }
