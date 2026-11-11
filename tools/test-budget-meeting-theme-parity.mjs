import { loadMeetingFixture } from './budget-meeting-test-fixture.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
const origin = 'http://localhost:4186';
try {
  const preview = await browser.newPage();
  const staff = await browser.newPage();
  await preview.emulateMedia({reducedMotion:'reduce'});
  await staff.emulateMedia({reducedMotion:'reduce'});
  let allowMeeting = false;
  // Exercise the real index shell without authenticating or contacting production data.
  await staff.route('**/*', route => {
    const request = route.request();
    if (request.resourceType() === 'script' && !(allowMeeting && /app\.budget-meeting(?:-ranking-ui)?\.js/.test(request.url()))) return route.fulfill({contentType:'application/javascript',body:''});
    if (['fetch','xhr','websocket'].includes(request.resourceType())) return route.abort();
    return route.continue();
  });
  await preview.goto(`${origin}/budget-meeting-preview.html`);
  await staff.goto(`${origin}/#budget-approval-staff`);
  await staff.evaluate(() => {
    document.getElementById('appLoader')?.remove();
    document.querySelectorAll('.page-view').forEach(page => page.classList.toggle('active', page.dataset.page === 'budget-approval-staff'));
    const page = document.querySelector('.page-view[data-page="budget-approval-staff"]');
    page.hidden = false;
    page.querySelectorAll('[data-budget-staff-panel]').forEach(panel => {
      const active = panel.dataset.budgetStaffPanel === 'meeting';
      panel.hidden = !active; panel.classList.toggle('is-active', active);
    });
    page.querySelectorAll('[data-budget-staff-tab]').forEach(tab => {
      const active = tab.dataset.budgetStaffTab === 'meeting';
      tab.classList.toggle('is-active',active); tab.setAttribute('aria-selected',String(active));
    });
    page.querySelector('[data-budget-meeting-demo]').dataset.preview = 'true';
  });
  allowMeeting = true;
  await staff.addScriptTag({url:`${origin}/js/features/budget/app.budget-meeting-ranking-ui.js`});
  await staff.addScriptTag({url:`${origin}/js/features/budget/app.budget-meeting.js`});
  await loadMeetingFixture(preview);
  await loadMeetingFixture(staff);
  const selectors = ['.page-header-flex','.budget-staff-tabs','.bm','.bm-workflow','.bm-meeting-meta','.bm-table-wrap','.bm-registry-setup select','.bm-primary'];
  const style = (page, selector) => page.locator(`.page-view[data-page="budget-approval-staff"] ${selector}`).first().evaluate(el => {
    const css = getComputedStyle(el);
    return Object.fromEntries(['fontFamily','fontSize','lineHeight','color','backgroundColor','borderRadius','padding','display','gap','width'].map(key => [key,css[key]]));
  });
  for (const width of [1280,390,320]) {
    for (const page of [preview,staff]) {
      await page.setViewportSize({width,height:900});
      await page.mouse.move(0,0);
      await page.locator('[data-form="setup"]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    }
    for (const selector of selectors) assert.deepEqual(await style(preview,selector),await style(staff,selector),`${selector} at ${width}`);
    await preview.screenshot({path:`/tmp/bm-preview-parity-${width}.png`,fullPage:true});
    await staff.locator('.page-view[data-page="budget-approval-staff"]').screenshot({path:`/tmp/bm-staff-parity-${width}.png`});
  }
  assert.equal(await preview.locator('[name="online"]').count(),0);
  for (const page of [preview,staff]) {
    await page.locator('[name="ack"]').check();
    await page.locator('[data-form="setup"] button[type="submit"]').click();
  }
  for (const width of [1280,390,320]) {
    for (const page of [preview,staff]) {
      await page.setViewportSize({width,height:900});
      await page.mouse.move(0,0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    }
    for (const selector of ['.bm','.bm-table-wrap','thead th','tfoot td','.bm-vote-intro','.bm-primary']) {
      assert.deepEqual(await style(preview,selector),await style(staff,selector),`Summary ${selector} at ${width}`);
    }
  }
  console.log('Passed: shared production shell, CSS parity at 1280/390/320px, registry controls and preview isolation.');
} finally { await browser.close(); }
