import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const login = await fs.readFile('web/partials/login.html', 'utf8');
  const staff = await fs.readFile('web/partials/staff-approval.html', 'utf8');
  await page.setContent(login + staff);
  await page.addStyleTag({ content: await fs.readFile('web/css/components/modals-motion.css', 'utf8') });
  await page.addScriptTag({ content: await fs.readFile('web/js/core/app.dialog.js', 'utf8') });
  await page.locator('section').evaluateAll(elements => elements.forEach(el => { el.style.display = 'block'; el.hidden = false; }));
  const source = (await fs.readFile('web/js/integrations/app.temporary-access-ui.js', 'utf8')) + '\n' + (await fs.readFile('web/js/integrations/app.auth-access-requests.js', 'utf8')).replace(/^import .*\n/, '');
  await page.evaluate(async source => {
    const module = await import('data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(source))));
    const user = { uid: 'guest', email: 'guest@example.com', emailVerified: true, displayName: 'Guest' };
    const state = window.fixture = { record: null, offline: false, permissionDenied: false, authCallbacks: [], staffRequests: [], reads: 0, writes: 0, user, login: 0, transfers: 0, popups: 0 };
    const auth = { currentUser: null };
    const read = async ref => {
      state.reads++;
      if (state.permissionDenied) throw Object.assign(Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
      if (state.offline) throw Error('offline');
      if (!ref.startsWith('authEmailAccess/')) throw Error('Unexpected collection');
      const data = state.record;
      return { exists: () => !!data, data: () => data };
    };
    module.setupAccessRequests({
      doc: (_db, collection, id) => `${collection}/${id}`, getDocFromServer: read,
      collection: (_db, name) => name, where: (...args) => args, query: (...args) => args,
      getDocs: async query => {
        state.queueQuery = query;
        return { empty: !state.staffRequests.length, size: state.staffRequests.length, docs: state.staffRequests.map(data => ({ id: data.email, ref: data.email, data: () => data })) };
      },
      isAllowedAuthEmail: email => email.endsWith('@chula.ac.th'), isTemporaryAuthAccessActive: data => data.active,
      serverTimestamp: () => 'server',
      signOut: async () => { auth.currentUser = null; }, signInWithPopup: async () => { state.popups++; auth.currentUser = state.user; return { user: state.user }; },
      updateCurrentUser: async (main, user) => {
        if (main === auth) { auth.currentUser = user; return; }
        state.transfers++; state.transferredEmail = user.email; main.currentUser = user;
        state.authCallbacks.forEach(callback => callback(user));
      },
      GoogleAuthProvider: class { setCustomParameters() {} }, onAuthStateChanged: (_auth, callback) => { state.authCallbacks.push(callback); callback(null); },
      runTransaction: async (_db, callback) => callback({ get: read, set: (_ref, data) => { state.writes++; state.record = { ...state.record, ...data }; } })
    }, auth, {}, {}, {});
    document.getElementById('loginPageGoogleBtn').addEventListener('click', () => state.login++);
  }, source);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#staffAuthAccessFilterOpen').click();
  assert.equal(await page.locator('#staffAuthAccessFilterSheet').evaluate(el => el.open), true);
  await page.locator('#staffAuthAccessSearch').fill('guest');
  await page.locator('#staffAuthAccessStatusFilter').selectOption('pending');
  await page.locator('#staffAuthAccessFilterSheet .btn-primary').click();
  assert.equal(await page.locator('#staffAuthAccessFilterOpen').textContent(), 'ค้นหาและกรอง (2)');
  assert.equal(await page.locator('#staffAuthAccessPanel #staffAuthAccessSearch').count(), 1);
  await page.locator('#staffAuthAccessFilterOpen').click();
  await page.locator('#staffAuthAccessFilterSheet .btn-ghost').click();
  assert.equal(await page.locator('#staffAuthAccessSearch').inputValue(), '');
  assert.equal(await page.locator('#staffAuthAccessStatusFilter').inputValue(), 'all');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForFunction(() => !document.getElementById('staffAuthAccessFilterSheet').open);
  assert.equal(await page.locator('#staffAuthAccessPanel #staffAuthAccessSearch').count(), 1);
  assert.equal(await page.locator('#authAccessModal').isVisible(), false);
  await page.locator('#authAccessOpen').click();
  assert.equal(await page.locator('#authAccessIdentity').isVisible(), true);
  assert.equal(await page.locator('#authAccessFields').isVisible(), true);
  assert.equal(await page.locator('#authAccessRequestForm button[type=submit]').isDisabled(), true);
  await page.locator('#authAccessOrganization').fill('Draft organization');
  await page.locator('#authAccessReason').fill('Draft reason');
  await page.locator('#authAccessCheck').click();
  assert.equal(await page.locator('#authAccessOrganization').inputValue(), 'Draft organization');
  assert.equal(await page.locator('#authAccessReason').inputValue(), 'Draft reason');
  assert.equal(await page.locator('#authAccessRequestForm button[type=submit]').isDisabled(), false);
  assert.equal(await page.locator('#authAccessCheck').textContent(), 'เปลี่ยนบัญชี');
  assert.equal(await page.locator('#authAccessIdentity').isVisible(), true);
  await page.locator('#authAccessFields').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#authAccessName').inputValue(), 'Guest');
  assert.equal(await page.locator('#authAccessEmail').inputValue(), 'guest@example.com');
  assert.equal(await page.locator('#authAccessEmail').getAttribute('readonly'), '');
  assert.equal(await page.evaluate(() => fixture.reads), 1, 'Read the unified record immediately after Google verification');
  assert.equal(await page.evaluate(() => fixture.writes), 0);
  await page.locator('#authAccessOrganization').fill('Organization');
  await page.locator('#authAccessReason').fill('Work');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#authAccessModal').getAttribute('aria-hidden'), 'true');
  assert.equal(await page.locator('#authAccessOpen').evaluate(el => el === document.activeElement), true);
  await page.locator('#authAccessOpen').click();
  assert.equal(await page.locator('#authAccessReason').inputValue(), 'Work');
  await page.evaluate(() => { fixture.offline = true; });
  await page.locator('#authAccessRequestForm button[type=submit]').click();
  await page.getByText(/ตรวจสอบหรือบันทึกไม่สำเร็จ/).waitFor();
  assert.equal(await page.locator('#authAccessFields').isVisible(), true);
  assert.equal(await page.locator('#authAccessReason').inputValue(), 'Work');
  assert.equal(await page.evaluate(() => fixture.writes), 0);
  await page.evaluate(() => { fixture.offline = false; fixture.permissionDenied = true; });
  await page.locator('#authAccessRequestForm button[type=submit]').click();
  await page.getByText('ระบบยังไม่อนุญาตให้ตรวจสอบหรือส่งคำร้อง กรุณาติดต่อฝ่ายเหรัญญิก', { exact: true }).waitFor();
  assert.equal(await page.locator('#authAccessOrganization').inputValue(), 'Organization');
  await page.evaluate(() => { fixture.permissionDenied = false; });
  await page.locator('#authAccessRequestForm button[type=submit]').click();
  await page.getByText('คำร้องอยู่ระหว่างรออนุมัติ', { exact: true }).waitFor();
  assert.equal(await page.locator('#authAccessFields').isVisible(), false);
  assert.equal(await page.evaluate(() => fixture.writes), 1);
  await page.locator('#authAccessCheck').click();
  await page.getByText(/คำร้องอยู่ระหว่างรออนุมัติ/).waitFor();
  assert.equal(await page.locator('#authAccessFields').isVisible(), false);
  assert.equal(await page.evaluate(() => fixture.writes), 1);
  await page.evaluate(() => { fixture.record = { ...fixture.record, active: true, status: 'approved' }; });
  await page.locator('#authAccessCheck').click();
  await page.locator('#authAccessLogin').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => fixture.writes), 1, 'Existing access must not create a request');
  const popupCount = await page.evaluate(() => fixture.popups);
  await page.evaluate(() => { fixture.record.active = false; });
  await page.locator('#authAccessLogin').click();
  await page.getByText(/คำร้องได้รับอนุมัติแล้ว แต่สิทธิ์ยังไม่เริ่ม/).waitFor();
  assert.equal(await page.evaluate(() => fixture.transfers), 0, 'Revoked access cannot reuse an earlier allowed result');
  await page.evaluate(() => { fixture.record.active = true; });
  await page.locator('#authAccessRetry').click();
  await page.locator('#authAccessLogin').waitFor({ state: 'visible' });
  await page.evaluate(() => { fixture.offline = true; });
  await page.locator('#authAccessLogin').click();
  await page.getByText(/ตรวจสอบหรือบันทึกไม่สำเร็จ/).waitFor();
  assert.equal(await page.evaluate(() => fixture.transfers), 0, 'Read failure must not sign in');
  await page.evaluate(() => { fixture.offline = false; });
  await page.locator('#authAccessRetry').click();
  await page.locator('#authAccessLogin').click();
  await page.waitForFunction(() => fixture.transfers === 1);
  assert.equal(await page.evaluate(() => fixture.transferredEmail), 'guest@example.com');
  assert.equal(await page.evaluate(() => fixture.popups), popupCount, 'Reuse the verified account without another Google popup');
  assert.equal(await page.evaluate(() => fixture.login), 0);
  assert.equal(await page.locator('#authAccessModal').getAttribute('aria-hidden'), 'true');
  await page.evaluate(() => fixture.authCallbacks.forEach(callback => callback(null)));
  await page.locator('#authAccessOpen').click();
  await page.evaluate(() => { fixture.record = null; fixture.user = { ...fixture.user, email: 'different@example.com' }; });
  await page.locator('#authAccessCheck').click();
  await page.waitForFunction(() => !document.querySelector('#authAccessRequestForm button[type=submit]').disabled);
  assert.equal(await page.locator('#authAccessStatus').textContent(), '');
  assert.equal(await page.locator('#authAccessOrganization').inputValue(), '');
  await page.evaluate(() => { fixture.offline = true; });
  await page.locator('#authAccessCheck').click();
  await page.getByText(/ตรวจสอบหรือบันทึกไม่สำเร็จ/).waitFor();
  assert.equal(await page.locator('#authAccessRequestForm button[type=submit]').isDisabled(), true);
  assert.equal(await page.locator('#authAccessRetry').isVisible(), true);
  await page.evaluate(() => { fixture.offline = false; });
  await page.locator('#authAccessRetry').click();
  await page.waitForFunction(() => !document.querySelector('#authAccessRequestForm button[type=submit]').disabled);
  assert.equal(await page.locator('#authAccessStatus').textContent(), '');
  assert.equal(await page.locator('#authAccessRequestForm button[type=submit]').isDisabled(), false);
  await page.evaluate(() => fixture.authCallbacks.forEach(callback => callback(fixture.user)));
  assert.equal(await page.locator('#authAccessSelfService').isVisible(), false);
  assert.equal(await page.locator('#authAccessModal').getAttribute('aria-hidden'), 'true');
  await page.evaluate(() => fixture.authCallbacks.forEach(callback => callback(null)));
  assert.equal(await page.locator('#authAccessOpen').isVisible(), true);
  assert.equal(await page.locator('#authAccessStatus').textContent(), '');
  await page.locator('#authAccessOpen').click();
  const popupsBeforeHandoff = await page.evaluate(() => fixture.popups);
  await page.evaluate(() => {
    fixture.record = null;
    window.dispatchEvent(new CustomEvent('sgcu:request-access-with-user', { detail: { user: fixture.user } }));
  });
  await page.waitForFunction(() => !document.querySelector('#authAccessRequestForm button[type=submit]').disabled);
  assert.equal(await page.locator('#authAccessEmail').inputValue(), 'different@example.com');
  assert.equal(await page.locator('#authAccessCheck').textContent(), 'เปลี่ยนบัญชี');
  assert.equal(await page.evaluate(() => fixture.popups), popupsBeforeHandoff);
  console.log('Applicant flow: single-record reads and writes, immediate checks, duplicates, failures, and account switching passed.');
} finally { await browser.close(); }
