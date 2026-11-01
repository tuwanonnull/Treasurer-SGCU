import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit, devices } from '@playwright/test';

// Run against a built local preview. TEST_BROWSER=webkit covers the WebKit CSS path;
// native iOS picker rendering still needs a real-device check.
const origin = process.env.TEST_ORIGIN || 'http://localhost:4173';
const browserType = process.env.TEST_BROWSER === 'webkit' ? webkit : chromium;
const markup = await fs.readFile(new URL('../partials/dashboard-staff.html', import.meta.url), 'utf8');
const init = await fs.readFile(new URL('../js/core/app.init.js', import.meta.url), 'utf8');
const sheet = init.split('function initDashboardMobileActionBar')[1].split('sheet.innerHTML = `')[1].split('`;')[0];
const browser = await browserType.launch();
try {
  for (const locale of ['en-US', 'th-TH']) {
    const page = await browser.newPage({ ...devices['iPhone 13'], locale });
    await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="${origin}/css/style.css">${markup}
      <div class="mobile-filter-sheet mobile-dashboard-filter-sheet is-open">${sheet}</div>`);
    await page.evaluate(() => {
      document.documentElement.classList.add('sgcu-standalone');
      const bar = document.getElementById('filterBarStaff');
      bar.setAttribute('data-mobile-filter-mounted', 'true');
      document.querySelector('.mobile-filter-body').append(bar);
      document.querySelector('.mobile-filter-dialog').style.animation = 'none';
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.mobile-filter-dialog')).display === 'grid');
    for (const width of [320, 375, 390, 430, 600, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const value of ['', '2026-11', '2027-09']) {
        for (const id of ['projectMonthFromStaff', 'projectMonthToStaff']) {
          const input = page.locator(`#${id}`);
          await input.fill(value);
          assert.equal(await input.inputValue(), value);
          const metrics = await input.evaluate(el => {
            const box = el.getBoundingClientRect();
            const parent = el.parentElement.getBoundingClientRect();
            return { appearance: getComputedStyle(el).appearance, contained: box.left >= parent.left - 1 && box.right <= parent.right + 1 };
          });
          assert.equal(metrics.appearance, 'none', 'Native iOS bezel must be disabled');
          assert.ok(metrics.contained, `${id} fits at ${width}px in ${locale}`);
        }
        assert.ok(await page.locator('.mobile-filter-body').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      }
    }
    await page.close();
  }
  console.log(`${browserType.name()}: month fields fit in standalone layout, native appearance disabled, empty/populated values editable in Thai/English across six widths.`);
} finally {
  await browser.close();
}
