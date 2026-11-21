import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { readCssSource } from '../lib/source-includes.mjs';

const read = file => fs.readFile(new URL(`../../web/${file}`, import.meta.url), 'utf8');
const css = ['css/style.css', 'css/components/theme-preview.css', 'css/components/delete-confirmation.css']
  .map(file => readCssSource(new URL(`../../web/${file}`, import.meta.url))).join('\n');
const templates = async (file, anchor) => {
  const source = await read(file);
  const start = source.indexOf(anchor);
  assert.ok(start >= 0, anchor);
  const templateStart = source.indexOf('`', start);
  return source.slice(templateStart + 1, source.indexOf('`', templateStart + 1))
    .replace(/\$\{[^}]*\}/g, 'ตัวอย่างรายการทดสอบ');
};
const fixtures = [
  ...['budgetRequestDeleteModal', 'budgetRoundDeleteModal', 'budgetProjectCodeClearModal'].map(id => [id, 'partials/budget-approval-staff.html']),
  ...['meetingRoomDeleteDialog', 'meetingHolidayDeleteDialog'].map(id => [id, 'partials/meeting-room-staff.html']),
  ['staffBulkDeleteConfirmModal', 'partials/staff-approval.html']
];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  const mount = async (html, theme, width) => {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body>${html}</body></html>`);
  };
  const cases = [];
  for (const [id, file] of fixtures) {
    await mount(await read(file), 'light', 1280);
    cases.push([`#${id}`, await page.locator(`#${id}`).evaluate(el => el.outerHTML)]);
  }
  cases.push(
    ['#borrowDeleteConfirmModal', `<div id="borrowDeleteConfirmModal" class="modal">${await templates('js/features/borrow/app.borrow-assets.parts/request-dialogs.js.inc', 'const borrowDeleteConfirmModalEl =')}</div>`],
    ['#meetingStaffDeleteConfirmModal', `<div id="meetingStaffDeleteConfirmModal" class="modal">${await templates('js/features/booking/app.meeting-room-staff.js', 'const confirmDeleteBooking =')}</div>`],
    ['.borrow-project-delete-dialog', `<dialog class="borrow-project-delete-dialog">${await templates('js/features/borrow/app.borrow-assets.parts/project-catalog.js.inc', 'dialog.innerHTML =')}</dialog>`],
    ['.staff-auth-delete-dialog', `<dialog class="meeting-settings-dialog staff-auth-delete-dialog">${await templates('js/features/staff/app.staff-access.parts/temporary-access.js.inc', 'dialog.innerHTML =')}</dialog>`],
    ['#orgRepresentativeDeleteConfirmModal', await templates('js/features/staff/app.staff-access.parts/approval-views-and-dialogs.js.inc', 'const ensureOrgRepresentativeDeleteConfirmModal =')],
    ['#budgetRequestDeleteConfirmModal', await templates('js/features/budget/app.budget-request.js', 'const ensureBudgetRequestDeleteModal =')]
  );
  // Extract the destructive roster body into its actual shared modal shell.
  cases.push(['#staffApprovalDetailModal', `<div id="staffApprovalDetailModal" class="modal"><div class="modal-dialog"><div class="modal-header"><div class="modal-title">ยืนยันลบรายชื่อทั้งปี</div></div><div class="modal-body">${await templates('js/features/staff/app.staff-access.parts/representative-roster.js.inc', 'approvalDetailBodyEl.innerHTML = `\n      <div class="staff-approval-detail-layout org-representative-delete-confirm">')}</div></div></div>`]);
  for (const theme of ['light', 'dark']) {
    for (const width of [390, 1280]) {
      for (const [selector, html] of cases) {
        await mount(html, theme, width);
        const root = page.locator(selector);
        assert.equal(await root.count(), 1, selector);
        await root.evaluate(el => el.tagName === 'DIALOG' ? el.showModal() : el.classList.add('show'));
        const surface = await root.evaluate(el => {
          const card = el.tagName === 'DIALOG' ? el : el.querySelector('.modal-dialog');
          const button = el.querySelector('.btn-primary');
          const rect = card.getBoundingClientRect();
          return { bg: getComputedStyle(card).backgroundColor, button: button && getComputedStyle(button).backgroundColor,
            overflow: card.scrollWidth > card.clientWidth + 1, width: rect.width };
        });
        assert.equal(surface.button, theme === 'dark' ? 'rgb(60, 37, 41)' : 'rgb(190, 18, 60)', `${selector} ${theme} button`);
        assert.equal(surface.overflow, false, `${selector} ${width} overflow`);
        assert.ok(surface.width <= width - 30, `${selector} width`);
        assert.notEqual(surface.bg, theme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(60, 37, 41)');
        if (width === 390 && ['#budgetRoundDeleteModal', '.borrow-project-delete-dialog'].includes(selector)) {
          await page.screenshot({ animations: "disabled", path: `/tmp/delete-${selector.replace(/[#.]/g, '')}-${theme}.png` });
        }
      }
    }
  }
  await mount('<button id="opener">ลบ</button><div id="parent" class="modal"><div class="modal-dialog"><button id="parentButton">แก้ไข</button></div></div>', 'dark', 390);
  await page.addScriptTag({ content: await read('js/core/app.dialog.js') });
  await page.evaluate(() => {
    openDialog(document.getElementById('parent'));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDialog(document.getElementById('parent')); });
    window.startConfirm = () => {
      window.result = undefined;
      SGCU_DIALOG.confirmDeletion({ message: '<img src=x onerror=alert(1)> ชื่อรายการทดสอบ' }).then(result => window.result = result);
    };
    window.startConfirm();
  });
  assert.equal(await page.locator('#sharedDeleteConfirmMessage img').count(), 0, 'User names are plain text');
  assert.equal(await page.locator('#sharedDeleteConfirmDialog [autofocus]').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.evaluate(() => SGCU_DIALOG.confirmDeletion()), false, 'Duplicate open is cancelled');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.result === false);
  assert.equal(await page.locator('#parent').evaluate(el => el.classList.contains('show')), true, 'Escape preserves underlying editor');
  assert.equal(await page.locator('#parentButton').evaluate(el => el === document.activeElement), true, 'Focus restored');
  await page.evaluate(() => window.startConfirm());
  await page.locator('#sharedDeleteConfirmDialog [data-confirm]').click();
  await page.waitForFunction(() => window.result === true);
  await page.evaluate(() => window.startConfirm());
  await page.locator('#sharedDeleteConfirmDialog [autofocus]').click();
  await page.waitForFunction(() => window.result === false);
  await page.evaluate(() => window.startConfirm());
  await page.screenshot({ animations: "disabled", path: '/tmp/delete-shared-dark.png' });
  await page.mouse.click(1, 1);
  await page.waitForFunction(() => window.result === false);
  console.log(`Delete confirmations: ${cases.length} layouts × 2 themes × 2 widths; confirm, cancel, Escape, backdrop, duplicate guard, safe text and focus restoration passed.`);
} finally { await browser.close(); }
