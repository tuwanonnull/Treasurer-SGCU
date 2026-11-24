import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const root = new URL('../../web/', import.meta.url);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://sgcu.local' || !/\.(css|html)$/.test(url.pathname)) return route.abort();
    try {
      await route.fulfill({ body: await fs.readFile(new URL(url.pathname.slice(1), root)), contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/html' });
    } catch { await route.abort(); }
  });
  await page.goto('http://sgcu.local/index.html');
  await page.evaluate(html => document.body.insertAdjacentHTML('beforeend', html), await fs.readFile(new URL('partials/login.html', root), 'utf8'));
  await page.evaluate(() => {
    window.listeners = [];
    window.sgcuFirestore = {
      db: {}, collection: (_, name) => name, where: (...args) => args,
      query: (name, condition) => ({ name, condition }),
      onSnapshot(query, receive, error) {
        const listener = { query, receive, error, stopped: false };
        window.listeners.push(listener);
        return () => { listener.stopped = true; };
      }
    };
    window.authenticate = (overrides = {}) => window.dispatchEvent(new CustomEvent('sgcu:staff-auth-updated', { detail: {
      email: 'staff@example.test', isAuthenticated: true, hasStaff: true, isHeadStaff: true,
      allowedPages: ['budget-approval-staff', 'borrow-assets-staff', 'meeting-room-staff', 'staff-approval', 'org-representative-approval-staff'], ...overrides
    } }));
    window.deliver = (name, data) => window.listeners.findLast(item => item.query.name === name && !item.stopped).receive({ docs: data.map(row => ({ data: () => row })) });
  });
  await page.addScriptTag({ content: await fs.readFile(new URL('js/core/app.staff-menu-counts.js', root), 'utf8') });
  assert.equal(await page.evaluate(() => window.listeners.length), 0, 'No queries before authentication');
  await page.evaluate(() => {
    window.authenticate();
    window.deliver('budgetApprovalRequests', [{ status: 'pending' }, { status: 'reviewing' }, { status: 'approved' }]);
    window.deliver('borrowAssetRequests', [{ status: 'pending' }, { status: 'approved' }, { status: 'received' }, { status: 'pending', isDeleted: true }, { status: 'returned' }]);
    window.deliver('meetingRoomBookings', [{ status: 'pending', date: '2099-01-01' }, { status: 'cancel_requested', date: '2099-01-01' }, { status: 'reschedule_requested', date: '2099-01-01' }, { status: 'pending', date: '2000-01-01' }]);
    window.deliver('staffApplications', [{ status: 'pending' }, { status: 'pending', requestType: 'other' }]);
    window.deliver('organizationRepresentativeApplications', [{ status: 'pending', requestType: 'organization_representative' }, { status: 'approved', requestType: 'organization_representative' }]);
  });
  for (const [name, expected] of [['budget-approval-staff', '2'], ['borrow-assets-staff', '3'], ['meeting-room-staff', '3'], ['staff-approval', '1'], ['org-representative-approval-staff', '1']]) {
    const badges = page.locator(`a[data-page="${name}"] > .staff-menu-count`);
    assert.ok(await badges.count() >= 2);
    assert.ok((await badges.allTextContents()).every(text => text === expected));
  }
  assert.equal(await page.locator('[data-staff-mode="staff"] > .staff-menu-count').textContent(), '10', 'Mode switch sums each queue once');
  assert.equal(await page.locator('[data-staff-mode="normal"] > .staff-menu-count').count(), 0);
  assert.equal(await page.locator('#desktopNavStaff .nav-group-toggle > .staff-menu-count').first().textContent(), '8');
  await page.evaluate(() => window.deliver('budgetApprovalRequests', Array.from({ length: 123 }, () => ({ status: 'pending' }))));
  const badge = page.locator('a[data-page="budget-approval-staff"] > .staff-menu-count').first();
  assert.equal(await badge.textContent(), '99+');
  assert.match(await badge.getAttribute('aria-label'), /123/);
  await page.evaluate(() => window.listeners.find(item => item.query.name === 'budgetApprovalRequests').error());
  assert.equal(await badge.getAttribute('hidden'), '');
  await page.evaluate(() => window.authenticate({ allowedPages: ['meeting-room-staff'], isHeadStaff: false }));
  assert.equal(await page.evaluate(() => window.listeners.filter(item => !item.stopped).length), 1);
  assert.equal(await page.locator('.staff-menu-count:not([hidden])').count(), 0, 'Revocation clears stale totals');
  await page.evaluate(() => {
    window.listeners[0].receive({ docs: [{ data: () => ({ status: 'pending' }) }] });
  });
  assert.equal(await page.locator('.staff-menu-count:not([hidden])').count(), 0, 'Old callbacks cannot restore counts');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('sgcu:auth-state', { detail: { isAuthenticated: false } })));
  assert.equal(await page.evaluate(() => window.listeners.filter(item => !item.stopped).length), 0);
  await page.evaluate(() => window.authenticate({ isHeadStaff: false }));
  assert.equal(await page.evaluate(() => window.listeners.filter(item => !item.stopped).length), 3, 'Only head staff get approval badges for users');
  await page.evaluate(() => {
    window.deliver('budgetApprovalRequests', [{ status: 'pending' }]);
    document.querySelector('#desktopNavStaff').style.display = 'flex';
    document.querySelector('.mobile-menu-group[data-mobile-nav="staff"]').open = true;
  });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      assert.equal(await badge.evaluate(node => getComputedStyle(node).position), 'static', 'Menu count stays in the text flow');
      assert.equal(await badge.evaluate(node => getComputedStyle(node).color), 'rgb(255, 255, 255)');
      assert.equal(await badge.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(190, 24, 93)');
    }
  }
  await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
  await page.evaluate(() => {
    window.authenticate();
    for (const name of ['budgetApprovalRequests', 'borrowAssetRequests', 'meetingRoomBookings']) {
      window.deliver(name, Array.from({ length: 123 }, () => ({ status: 'pending', date: '2099-01-01' })));
    }
    document.querySelector('[data-mobile-bottom-nav="general"]').style.display = 'none';
    document.querySelector('[data-mobile-bottom-nav="staff"]').style.display = 'contents';
    document.querySelectorAll('[data-mobile-nav="general"]').forEach(node => node.style.display = 'none');
    document.querySelectorAll('[data-mobile-nav="staff"]').forEach(node => { node.style.display = ''; node.open = true; });
    document.querySelector('#mobileMenu').classList.add('show');
    document.querySelectorAll('.mobile-bottom-item[data-page="budget-approval-staff"]').forEach(node => node.classList.add('active'));
  });
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const standalone of [false, true]) {
      await page.evaluate(value => document.documentElement.classList.toggle('sgcu-standalone', value), standalone);
      const heading = page.locator('.mobile-menu-group > summary.has-staff-menu-count').first();
      assert.equal(await heading.evaluate(node => getComputedStyle(node).display), 'flex');
      const geometry = await page.locator('.mobile-bottom-item[data-page="budget-approval-staff"]').evaluate(node => {
        const badge = node.querySelector('.staff-menu-count');
        const label = node.lastElementChild;
        const b = badge.getBoundingClientRect(), l = label.getBoundingClientRect(), p = node.getBoundingClientRect();
        return { label: label.textContent, transform: getComputedStyle(badge).transform, inside: b.left >= p.left && b.right <= p.right, separate: b.bottom <= l.top };
      });
      assert.equal(geometry.label, 'คำขอ');
      assert.equal(geometry.transform, 'none');
      assert.ok(geometry.inside && geometry.separate, `Mobile badge must fit its button without overlapping label at ${width}px`);
    }
  }
  await page.evaluate(() => { document.querySelector('.app-loader')?.remove(); document.body.classList.add('mobile-menu-open'); });
  await page.screenshot({ path: '/tmp/sgcu-mobile-counts.png' });
  await page.evaluate(() => {
    document.querySelector('#mobileMenu').classList.remove('show');
    document.body.classList.remove('mobile-menu-open');
    document.querySelector('.page-view[data-page="login"]').classList.add('active');
    document.querySelector('#staffModeToggle').style.display = 'flex';
  });
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const count of [0, 8, 123]) {
      await page.evaluate(count => {
        for (const name of ['budgetApprovalRequests', 'borrowAssetRequests', 'meetingRoomBookings']) {
          window.deliver(name, Array.from({ length: count }, () => ({ status: 'pending', date: '2099-01-01' })));
        }
      }, count);
      const layout = await page.locator('#staffModeToggle').evaluate(node => {
        const button = node.querySelector('[data-staff-mode="staff"]');
        const badge = button.querySelector('.staff-menu-count');
        const b = badge.getBoundingClientRect(), p = button.getBoundingClientRect();
        return { centered: badge.hidden || Math.abs((b.top + b.bottom - p.top - p.bottom) / 2) < 1,
          inside: badge.hidden || (b.left >= p.left && b.right <= p.right),
          overflow: node.scrollWidth > node.clientWidth,
          alignment: getComputedStyle(button).justifyContent };
      });
      assert.ok(layout.centered && layout.inside && !layout.overflow, 'Count stays centered inside the original switch');
      assert.equal(layout.alignment, 'center');
    }
  }
  await page.screenshot({ path: '/tmp/sgcu-mobile-mode-switch.png' });
  for (const partial of ['dashboard-staff.html', 'staff-approval.html']) {
    await page.evaluate(html => document.body.insertAdjacentHTML('beforeend', html), await fs.readFile(new URL(`partials/${partial}`, root), 'utf8'));
  }
  await page.evaluate(() => {
    window.authenticate({ allowedPages: ['dashboard-staff', 'staff-temporary-access-staff', 'budget-approval-staff'] });
    const now = Date.now();
    Date.now = () => now;
    const day = 86400000;
    window.deliver('authEmailAccess', [
      { status: 'pending' },
      { status: 'pending', active: true, startsAt: now - day, endsAt: now + day },
      { status: 'approved', active: true, startsAt: now - day, endsAt: now + 7 * day },
      { active: true, startsAt: { seconds: (now - day) / 1000 }, endsAt: { toMillis: () => now + day } },
      { active: true, startsAt: now - day, endsAt: now + 7 * day + 1 },
      { active: true, startsAt: now - day, endsAt: now },
      { active: true, startsAt: now + day, endsAt: now + 2 * day },
      { active: false, startsAt: now - day, endsAt: now + day },
      { status: 'rejected', active: true, startsAt: now - day, endsAt: now + day },
      { active: true, startsAt: null, endsAt: 'invalid' }
    ]);
    window.deliver('budgetApprovalRequests', [{ status: 'pending' }]);
  });
  assert.equal(await page.locator('a[data-page="staff-temporary-access-staff"] > .staff-menu-count').first().textContent(), '4');
  assert.equal(await page.locator('[data-staff-mode="staff"] > .staff-menu-count').textContent(), '5', 'Mode switch includes temporary access exactly once');
  assert.match(await page.locator('#staffTemporaryAccessNotice').textContent(), /รออนุมัติ 2 รายการ.*7 วัน 2 รายการ/);
  await page.evaluate(() => window.listeners.findLast(item => item.query.name === 'authEmailAccess').error());
  assert.equal(await page.locator('#staffTemporaryAccessNotice').getAttribute('hidden'), '');
  await page.evaluate(() => window.authenticate({ isHeadStaff: false, allowedPages: ['staff-temporary-access-staff'] }));
  assert.equal(await page.evaluate(() => window.listeners.filter(item => !item.stopped).length), 0, 'Temporary access is head-staff only');
  await page.evaluate(() => {
    document.documentElement.classList.remove('sgcu-standalone');
    window.authenticate();
    window.deliver('budgetApprovalRequests', Array.from({ length: 123 }, () => ({ status: 'pending' })));
  });
  for (const width of [390, 1024, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const heights = [];
    for (const staff of [false, true, false]) {
      await page.evaluate(staff => {
        document.querySelector('#desktopNavGeneral').style.display = staff ? 'none' : 'flex';
        document.querySelector('#desktopNavStaff').style.display = staff ? 'flex' : 'none';
        document.querySelector('[data-mobile-bottom-nav="general"]').style.display = staff ? 'none' : 'contents';
        document.querySelector('[data-mobile-bottom-nav="staff"]').style.display = staff ? 'contents' : 'none';
      }, staff);
      heights.push(await page.evaluate(() => ({
        header: document.querySelector('.site-header').getBoundingClientRect().height,
        bottom: document.querySelector('.mobile-bottom-nav').getBoundingClientRect().height
      })));
    }
    assert.deepEqual(heights[0], heights[1], `Navbar height stays stable between modes at ${width}px`);
    assert.deepEqual(heights[1], heights[2]);
  }
  console.log('PASS staff menu counts: all navigation copies, queue filtering, totals, cap, errors, permissions, logout, stale callbacks, responsive themes');
} finally { await browser.close(); }
