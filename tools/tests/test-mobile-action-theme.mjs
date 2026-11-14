import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const root = new URL('../../web/', import.meta.url);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  // Render the real navigation and styles without authentication or network services.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://sgcu.local' || !/\.(css|html)$/.test(url.pathname)) return route.abort();
    try {
      await route.fulfill({
        body: await fs.readFile(new URL(url.pathname.slice(1), root)),
        contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/html'
      });
    } catch { await route.abort(); }
  });
  await page.goto('http://sgcu.local/index.html');
  await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
  const bars = page.locator('nav[class*="-action-bar"]');
  assert.ok(await bars.count() >= 6, 'Exercise all page-specific mobile navigation bars');
  await bars.evaluateAll(nodes => nodes.forEach(node => node.classList.add('is-visible')));
  for (const standalone of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('sgcu-standalone', value), standalone);
    for (const theme of ['dark', 'light']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      for (const bar of await bars.all()) {
        const style = await bar.evaluate(node => {
          const css = getComputedStyle(node);
          return { name: node.className, background: css.backgroundColor, image: css.backgroundImage, display: css.display };
        });
        assert.equal(style.display, 'grid');
        assert.equal(style.background, theme === 'dark' ? 'rgb(34, 34, 34)' : 'rgba(255, 255, 255, 0.96)', `${style.name}: ${theme}, standalone=${standalone}`);
        assert.equal(style.image, 'none');
        const button = bar.locator('button').first();
        for (const active of [false, true]) {
          await button.evaluate((node, value) => node.classList.toggle('is-active', value), active);
          if (theme === 'dark') {
            const colors = await button.evaluate(node => {
              const css = getComputedStyle(node);
              return { color: css.color, image: css.backgroundImage };
            });
            assert.equal(colors.color, active ? 'rgb(249, 168, 212)' : 'rgb(184, 184, 184)');
            assert.equal(colors.image, 'none');
          }
        }
        await button.evaluate(node => node.classList.remove('is-active'));
      }
    }
  }
  console.log('Mobile action bars: dark/light surfaces and button states pass in browser and standalone modes.');
} finally {
  await browser.close();
}
