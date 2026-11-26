import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const source = await fs.readFile('web/js/features/project/app.sorting-auth.js', 'utf8');
const html = await fs.readFile('web/index.html', 'utf8');
const start = html.indexOf('<nav class="mobile-bottom-nav"');
const nav = html.slice(start, html.indexOf('</nav>', start) + 6);
const css = await fs.readFile('web/css/core/navigation.css', 'utf8');
const motion = source.slice(source.indexOf('function captureStaffModeMenu()'), source.indexOf('function applyStaffViewMode()'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>${nav}`);
  await page.addScriptTag({ content: motion });
  await page.evaluate(() => {
    window.switchMode = mode => {
      const snapshot = captureStaffModeMenu();
      document.querySelector('[data-mobile-bottom-nav="general"]').style.display = mode === 'staff' ? 'none' : '';
      document.querySelector('[data-mobile-bottom-nav="staff"]').style.display = mode === 'staff' ? '' : 'none';
      renderStaffModeFeedback(mode, true, true, snapshot);
      return { snapshot: !!snapshot, animations: document.getAnimations().filter(a => a.id === 'staff-mode-item').length };
    };
  });
  for (const standalone of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('sgcu-standalone', value), standalone);
    for (const mode of ['staff', 'normal', 'staff']) {
      const result = await page.evaluate(mode => window.switchMode(mode), mode);
      assert.equal(result.snapshot, false, 'Mobile must not copy computed styles into a snapshot');
      assert.equal(result.animations, 4, 'Each incoming touch slot must animate, including rapid switches');
      const frames = await page.evaluate(() => {
        const animations = document.getAnimations().filter(a => a.id === 'staff-mode-item');
        for (const a of animations) { a.pause(); a.currentTime = 80; }
        return animations.map(a => Number(getComputedStyle(a.effect.target).opacity));
      });
      assert.ok(frames.every(opacity => opacity > 0 && opacity < 1), 'The transition must be visibly between its endpoints');
    }
    await page.evaluate(async () => {
      const animations = document.getAnimations().filter(a => a.id === 'staff-mode-item');
      for (const a of animations) a.finish();
      await Promise.all(animations.map(a => a.finished));
    });
    assert.equal(await page.locator('[data-staff-mode-snapshot]').count(), 0);
    assert.equal(await page.locator('[data-mobile-bottom-nav="staff"] > a').first().evaluate(el => getComputedStyle(el).opacity), '1');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal((await page.evaluate(() => window.switchMode('normal'))).animations, 0);
  // Desktop retains the outgoing/incoming menu transition.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent('<div class="desktop-nav-role"><a href="#">ทั่วไป</a></div>');
  const desktop = await page.evaluate(() => {
    const snapshot = captureStaffModeMenu();
    document.querySelector('a').textContent = 'สตาฟ';
    renderStaffModeFeedback('staff', true, true, snapshot);
    return document.querySelectorAll('[data-staff-mode-snapshot]').length;
  });
  assert.equal(desktop, 1);
  console.log('Staff mode motion: mobile, standalone, rapid switches, visible intermediate frames, reduced motion and desktop passed.');
} finally {
  await browser.close();
}
