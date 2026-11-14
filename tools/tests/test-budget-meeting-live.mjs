import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const origin = 'http://localhost:4186';
try {
  await page.goto(`${origin}/budget-meeting-preview.html`);
  await page.setContent(`<link rel="stylesheet" href="${origin}/css/core/base.css"><link rel="stylesheet" href="${origin}/css/pages/operations.css"><link rel="stylesheet" href="${origin}/css/components/ui.css"><link rel="stylesheet" href="${origin}/css/pages/budget-meeting.css"><main data-page="budget-approval-staff"><div data-budget-meeting-demo></div></main>`);
  await page.evaluate(() => {
    const orgs = [1, 2, 3, 4].map(i => ({ code: `SGCU-0${i}.00`, name: `ฝ่าย ${i}`, defaultRepresentative: `voter${i}`, members: [{ id: `voter${i}`, email: `voter${i}@chula.ac.th`, name: `ประธาน ${i}`, role: 'ประธาน' }] }));
    window.sgcuGetBudgetMeetingDefaults = () => orgs;
    window.sgcuGetBudgetMeetingSource = () => ({ version: 1, rounds: [{ id: 'r', label: 'ทดสอบ', sgcuBudgetCeiling: 200000, organizations: orgs }], requests: orgs.map((o, i) => ({ id: String(i), budgetRoundId: 'r', projectName: i ? `โครงการ ${i}` : 'ชื่อโครงการยาว'.repeat(30), organizationName: o.name, organizationCode: o.code, projectCodeGenerated: `SGCU-0${i + 1}.00.001`, estimatedExpense: 100000 })) });
    window.sgcuAuth = { auth: { currentUser: { uid: 'host-test' } } };
    window.opened = [];
    window.sgcuBudgetBallots = {
      createMeeting: async () => { window.meetingCreates = (window.meetingCreates || 0) + 1; return 'stablemeeting1234567'; },
      meetingUrl: id => `http://localhost:4186/budget-meeting-vote.html?meeting=${id}`,
      finishMeeting: async () => {},
      watchProgress: (id, cb) => {window.progressCallback=cb; cb({count:0,total:window.opened.at(-1).voters.length}); return ()=>{window.progressStopped=true;};},
      open: async poll => { window.opened.push(poll); return String(window.opened.length); },
      url: id => `http://localhost:4186/budget-meeting-vote.html?poll=${id}`,
      close: async () => {
        const kind = window.opened.at(-1).kind;
        if (kind === 'withdrawal') return [{code:'SGCU-01.00',choices:['0']},{code:'SGCU-02.00',choices:[]}];
        if (kind === 'recipient') return [{code:'SGCU-02.00',choices:['yes']},{code:'SGCU-03.00',choices:['no']}];
        return kind === 'satisfaction' ? [['no'], ['no'], ['no'], ['no']] : kind === 'nomination' ? [['0'], ['0']] : [['yes'], ['yes']];
      }
    };
  });
  await page.addScriptTag({ url: `${origin}/js/features/budget/app.budget-meeting.js` });
  await page.evaluate(() => document.dispatchEvent(new Event('sgcu:budget-meeting-open')));
  await page.locator('[data-action="source-live"]').click();
  
  await page.locator('[data-form="import"] button[type="submit"]').click();
  await page.locator('[name="online"]').check();
  for (let i = 0; i < 4; i++) assert.equal(await page.locator(`[name="representative${i}"]`).inputValue(), `voter${i + 1}`);
  await page.locator('[name="ack"]').check();
  await page.locator('[data-form="setup"] button[type="submit"]').click();
  assert.equal(await page.locator('.bm-work tbody td:nth-child(3)').first().innerText(), '50,000.00');
  await page.locator('[data-action="open-vote"]').click();
  assert.match(await page.locator('[data-online-progress-label]').innerText(), /0 \/ 4/);
  await page.evaluate(() => window.progressCallback({count:2,total:4}));
  assert.match(await page.locator('[data-online-progress-label]').innerText(), /2 \/ 4/);
  assert.equal(await page.locator('[data-online-progress]').evaluate(el => String(el.value)), '2');

  const displayOpened = page.context().waitForEvent('page');
  await page.locator('[data-action="open-display"]').click();
  const display = await displayOpened;
  display.on('pageerror', e => errors.push(e.message));
  await display.setViewportSize({width:1920,height:1080});
  await display.locator('.bmd-progress-number').waitFor();
  assert.match(await display.locator('.bmd-progress-number').innerText(), /2.*4/s);
  assert.equal(await display.locator('.bmd-result').count(), 0);
  await display.evaluate(() => {
    window.projection = new BroadcastChannel(`sgcu-budget-display:${location.hash.slice(1)}`);
    window.projection.onmessage = ({data}) => { if(data.type === 'state') window.publicData = data.snapshot; };
    window.projection.postMessage({type:'request-state'});
  });
  await display.waitForFunction(() => window.publicData);
  assert.doesNotMatch(await display.evaluate(() => JSON.stringify(window.publicData)), /@chula\.ac\.th|representativeId|allowedOptionIds|"ballots"/);
  await display.screenshot({path:'/tmp/bm-room-online.png',fullPage:true});
  assert.equal(await page.locator('[data-action="back"]').isDisabled(), true);
  assert.equal(await page.locator('[data-form="vote"]').count(), 0);
  assert.equal(await page.evaluate(() => window.opened[0].voters.length), 4);
  assert.equal(await page.locator('[aria-label="ลิงก์ประจำการประชุม"]').count(), 1);
  await page.locator('[data-action="reset"]').click();
  assert.equal(await page.locator('dialog').count(), 0);
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('sgcu-budget-meeting:host-test')).poll.id), '1');
  await page.locator('[data-action="close-online"]').click();
  await display.locator('.bmd-result').waitFor();
  assert.equal(await page.locator('[data-action="back"]').isDisabled(), true);
  await page.locator('[data-action="dissatisfied"]').click();
  assert.equal(await page.locator('[data-action="cancel-select-mode"]').count(), 0);
  assert.equal(await page.locator('[data-cancel-all]').count(), 0);
  await page.locator('[data-action="open-online-withdrawal"]').click();
  assert.deepEqual(await page.evaluate(() => window.opened.at(-1).voters.map(v => v.allowedOptionIds)), [['0'],['1'],['2'],['3']]);
  await page.locator('[data-action="close-online"]').click();
  assert.equal(await page.locator('[name="cancel"][value="1"]').isDisabled(), false);
  await page.locator('[name="cancel"][value="0"]').uncheck();
  const firstCheckbox = page.locator('[name="cancel"][value="0"]');
  await page.locator('[data-cancel-row="0"] .bm-project-cell').click();
  assert.equal(await firstCheckbox.isChecked(), true);
  await page.locator('[data-cancel-row="0"] .bm-amount-cell').click();
  assert.equal(await firstCheckbox.isChecked(), false);
  await firstCheckbox.click();
  assert.equal(await firstCheckbox.isChecked(), true);
  await firstCheckbox.press('Space');
  assert.equal(await firstCheckbox.isChecked(), false);
  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('[data-form="cancel"] .bm-table-wrap').evaluate(el => el.getBoundingClientRect().right <= innerWidth), true);
    assert.equal(await page.locator('[data-form="cancel"] .bm-table-wrap').evaluate(el => getComputedStyle(el).borderTopWidth), '1px');
    if (width === 1280 || width === 390) await page.screenshot({ path: `/tmp/bm-cancel-${width}.png`, fullPage: true });
  }
  await page.locator('[name="cancel"][value="1"]').check();
  assert.match(await page.locator('[data-cancel-row="1"] .bm-status-cell').innerText(), /ประธานเพิ่มรายการ/);
  await page.locator('[data-form="cancel"] button[type="submit"]').click();
  assert.match(await page.locator('.bm-log').textContent(), /ประธานเพิ่มรายการยกเลิก \(ฝ่ายไม่ได้แจ้ง\)/);
  await page.locator('[data-action="open-online-nomination"]').click();
  await page.locator('[data-action="close-online"]').click();
  assert.equal(await page.locator('[data-action="rank"]').evaluate(el => getComputedStyle(el.parentElement).justifyContent), 'flex-end');
  await page.locator('[data-action="rank"]').click();
  assert.match(await page.locator('.bm-ranked-table tbody tr').first().innerText(), /SGCU-01.00.001/);
  assert.equal(await page.locator('.bm-ranked-table tbody td:nth-child(4)').first().innerText(), '100,000.00');
  assert.equal(await page.locator('.bm-ranked-table tbody td:nth-child(5)').first().innerText(), '50,000.00');
  for (const width of [1280, 390]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:`/tmp/bm-ranked-results-${width}.png`,fullPage:true});
  }
  await page.locator('[data-action="choose-project"]').first().click();
  await page.locator('[data-action="open-online-recipient"]').click();
  assert.deepEqual(await page.evaluate(() => window.opened.at(-1).voters.map(v => v.code)), ['SGCU-02.00','SGCU-03.00','SGCU-04.00']);
  await page.locator('[data-action="close-online"]').click();
  assert.equal(await page.locator('[name="recipient"][value="2"]').isDisabled(), false);
  await page.locator('[name="recipient"][value="1"]').uncheck();
  await page.locator('[name="recipient"][value="2"]').check();
  assert.match(await page.locator('label').filter({has:page.locator('[name="recipient"][value="2"]')}).innerText(), /ประธานเพิ่มฝ่าย/);
  await page.locator('[data-form="recipients"] button[type="submit"]').click();
  assert.match(await page.locator('.bm-log').textContent(), /ประธานเพิ่มฝ่ายขอรับงบ \(ไม่ได้เสนอตัว\)/);
  for (let i = 0; i < 3; i++) await page.locator('[data-action="next-stage"]').click();
  await page.locator('[data-action="open-vote"]').click();
  assert.deepEqual(await page.evaluate(() => window.opened.at(-1).voters.map(v => v.code)), ['SGCU-02.00', 'SGCU-04.00']);
  assert.equal(await page.locator('[data-action="switch-project"]').count(), 0);
  await page.locator('[data-action="close-online"]').click();
  assert.match(await page.getByRole('status').innerText(), /12,500.00/);
  await page.locator('[data-action="apply"]').click();
  assert.equal(await page.evaluate(() => window.meetingCreates), 1);
  assert.equal(await page.evaluate(() => new Set(window.opened.map(p => p.meetingId)).size), 1);
  assert.match(await page.locator('[aria-label="ลิงก์ประจำการประชุม"]').inputValue(), /meeting=stablemeeting1234567/);
  assert.deepEqual(errors, []);
  console.log('Passed: one department/one vote, host live rounds, nominations, exclusion of owner/recipient, session recovery data, monetary format, long-name cancellation table at four widths.');
} finally { await browser.close(); }
