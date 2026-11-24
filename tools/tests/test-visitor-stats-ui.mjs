import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { readCssSource } from '../lib/source-includes.mjs';
const source = await fs.readFile('web/partials/dashboard-staff.html', 'utf8');
const updateMeta = source.match(/<p id="visitorUpdateMeta"[\s\S]*?<\/p>/)[0].replace(' hidden>', '>');
const panel = source.slice(source.indexOf('          <section id="systemVisitorPanel"'), source.indexOf('          <div id="systemHealthSummary"'));
const css = await readCssSource(new URL('../../web/css/style.css', import.meta.url));
const darkCss = await fs.readFile('web/css/components/theme-preview.css', 'utf8');
const script = await fs.readFile('web/js/core/app.visitor-stats.js', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/*', route => route.abort());
  await page.setContent(`<style>${css}${darkCss}body{display:block;margin:0;padding:16px}</style><a data-page="home">หน้าแรก</a><a data-page="project-status">สถานะโครงการ</a><button data-system-data-tab="visitors">สถิติการเข้าใช้งาน</button>${updateMeta}${panel.replace(' hidden>', '>')}`);
  await page.evaluate(() => {
    window.requests = [];
    window.Chart = class {
      constructor(canvas, config) { this.config = config; this.data = config.data; window.latestChart = this; }
      destroy() {} isDatasetVisible() { return true; } setDatasetVisibility() {} update() {}
    };
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    window.sgcuVisitorCounter = { getVisitorHistory: async (start, end, selectedPage) => {
      window.requests.push({ start, end, page: selectedPage });
      if (window.failHistory) throw Error('offline');
      if (window.delayHome && selectedPage === 'home') await new Promise(resolve => setTimeout(resolve, 100));
      const visits = {}, unique = {};
      for (let day = new Date(start + 'T00:00:00Z'); day.toISOString().slice(0,10) <= end; day.setUTCDate(day.getUTCDate() + 1)) {
        const key = day.toISOString().slice(0,10);
        const age = (Date.parse(today) - day.getTime()) / 86400000;
        visits[key] = (age <= 30 ? 12 : 6) * (selectedPage === 'home' ? 2 : 1);
        if (age <= 30) unique[key] = 3;
      }
      return { visits: selectedPage === 'project-status' ? {} : visits, unique, allTime: 120,
        todayVisits: selectedPage === 'home' ? 24 : 12, todayUnique: 3, uniqueUnavailable: !!window.uniqueUnavailable };
    } };
  });
  await page.addScriptTag({ content: script });
  await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));
  const ready = () => page.waitForFunction(() => !document.getElementById('visitorRefresh').disabled);
  await page.locator('[data-system-data-tab="visitors"]').click(); await ready();
  assert.equal(await page.locator('#visitorTableBody tr').count(), 30);
  assert.equal(await page.locator('#visitorGrowth').textContent(), '+100%');
  assert.equal(await page.evaluate(() => window.latestChart.data.datasets.length), 2);
  await page.getByRole('switch').check();
  assert.equal(await page.locator('#visitorGrowth').textContent(), '—');
  await page.locator('#visitorGrouping').selectOption('week');
  assert.ok(await page.locator('#visitorTableBody tr').count() < 7);
  await page.locator('#visitorGrouping').selectOption('month');
  assert.ok(await page.locator('#visitorTableBody tr').count() <= 3);
  assert.equal(await page.evaluate(() => window.requests.length), 2);
  await page.getByRole('switch').uncheck();
  await page.locator('#visitorGrouping').selectOption('day');
  await page.locator('#visitorDays').selectOption('90'); await ready();
  assert.equal(await page.locator('#visitorTableBody tr').count(), 90);
  await page.locator('#visitorCompare').selectOption('none'); await ready();
  assert.equal(await page.evaluate(() => window.latestChart.data.datasets.length), 1);
  assert.equal(await page.locator('#visitorTableBody tr').first().locator('td').count(), 1);
  assert.match(await page.locator('#visitorGrowthCaption').textContent(), /ไม่ได้เลือก/);
  await page.locator('#visitorDays').selectOption('custom'); await ready();
  await page.evaluate(() => {
    document.getElementById('visitorStart').value = '2026-01-30';
    document.getElementById('visitorEnd').value = '2026-02-03';
    document.getElementById('visitorEnd').dispatchEvent(new Event('change'));
  }); await ready();
  assert.equal(await page.locator('#visitorTableBody tr').count(), 5);
  await page.locator('#visitorGrouping').selectOption('month');
  assert.equal(await page.locator('#visitorTableBody tr').count(), 2);
  await page.locator('#visitorCompare').selectOption('custom'); await ready();
  assert.match(await page.locator('#visitorFilterStatus').textContent(), /ต้องมี 5 วัน/);
  assert.equal(await page.locator('#visitorTableBody tr').count(), 0);
  await page.evaluate(() => {
    document.getElementById('visitorCompareStart').value = '2025-12-01';
    document.getElementById('visitorCompareEnd').value = '2025-12-05';
    document.getElementById('visitorCompareEnd').dispatchEvent(new Event('change'));
  }); await ready();
  assert.equal(await page.evaluate(() => window.latestChart.data.datasets.length), 2);
  await page.locator('#visitorPage').selectOption('home'); await ready();
  assert.equal(await page.locator('#dashboardVisitorCount').textContent(), '24');
  assert.equal(await page.evaluate(() => window.requests.at(-1).page), 'home');
  await page.locator('#visitorPage').selectOption('project-status'); await ready();
  assert.equal(await page.locator('#visitorGrowth').textContent(), '—');
  assert.match(await page.locator('#visitorStatus').textContent(), /ข้อมูลบางวัน/);
  assert.equal(await page.locator('#visitorDetailEmpty').isVisible(), true);
  assert.equal(await page.locator('#visitorDetailTable').isVisible(), false);
  assert.match(await page.locator('#visitorEmptyTitle').textContent(), /ยังไม่มีข้อมูล/);
  assert.equal(await page.locator('#visitorChart canvas').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/visitor-filters-mobile.png', fullPage: true });
  await page.locator('#visitorEmptyAction').click(); await ready();
  assert.equal(await page.locator('#visitorPage').inputValue(), 'all');
  assert.equal(await page.locator('#visitorDays').inputValue(), '30');
  assert.equal(await page.locator('#visitorDetailEmpty').isVisible(), false);
  await page.evaluate(() => window.failHistory = true);
  await page.locator('#visitorPage').selectOption('all');
  await page.locator('#visitorRefresh').click(); await ready();
  assert.match(await page.locator('#visitorStatus').textContent(), /โหลดสถิติไม่สำเร็จ/);
  assert.match(await page.locator('#visitorEmptyTitle').textContent(), /โหลดรายละเอียดไม่สำเร็จ/);
  await page.evaluate(() => window.failHistory = false);
  await page.locator('#visitorRefresh').click(); await ready();
  await page.locator('#visitorCompare').selectOption('custom'); await ready();
  await page.locator('#visitorDays').selectOption('7'); await ready();
  assert.match(await page.locator('#visitorFilterStatus').textContent(), /ต้องมี 7 วัน/);
  await page.locator('#visitorCompare').selectOption('previous'); await ready();
  await page.evaluate(() => { window.delayHome = true; });
  await page.locator('#visitorPage').selectOption('home');
  await page.locator('#visitorPage').selectOption('all'); await ready();
  await page.waitForTimeout(150); // Finish the deliberately delayed response to assert stale requests cannot win.
  assert.equal(await page.locator('#dashboardVisitorCount').textContent(), '12');
  await page.setViewportSize({ width: 1280, height: 900 });
  const positions = await page.locator('.visitor-toolbar > .visitor-control-group').evaluateAll(els => els.map(el => el.getBoundingClientRect().top));
  assert.ok(positions.every(top => Math.abs(top - positions[0]) < 2));
  assert.equal(await page.locator('.visitor-toolbar #visitorMetric').count(), 0);
  assert.equal(await page.locator('.visitor-trend-card .chart-header #visitorMetric').count(), 1);
  assert.equal(await page.locator('#visitorUpdateMeta #visitorRefresh').count(), 1);
  await page.screenshot({ path: '/tmp/visitor-filters-desktop.png', fullPage: true });
  const detail = await page.locator('.visitor-detail-card').boundingBox();
  const table = await page.locator('#visitorDetailTable').boundingBox();
  const trend = await page.locator('.visitor-trend-card').boundingBox();
  assert.ok(detail.x > trend.x + trend.width, 'Daily details sit beside the chart');
  assert.ok(Math.abs(detail.y + detail.height - table.y - table.height - 18) < 3, 'Table uses remaining card height');
  await page.locator('#visitorDays').selectOption('custom'); await ready();
  await page.locator('#visitorCompare').selectOption('custom'); await ready();
  for (const [selectId, datesId] of [['visitorDays', 'visitorCustomDates'], ['visitorCompare', 'visitorCompareDates']]) {
    const select = await page.locator('#' + selectId).boundingBox();
    const dates = await page.locator('#' + datesId).boundingBox();
    assert.ok(dates.y >= select.y + select.height && Math.abs(dates.x - select.x) < 2, 'Custom dates sit directly under their selector');
    assert.ok(dates.width <= select.width + 1, 'Custom dates fit their filter column');
  }
  await page.screenshot({ path: '/tmp/visitor-custom-desktop.png', fullPage: true });
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  for (const selector of ['#visitorStart', '#visitorCompareStart', '#visitorDays']) {
    const colors = await page.locator(selector).evaluate(el => {
      const css = getComputedStyle(el);
      return { background: css.backgroundColor, color: css.color, scheme: css.colorScheme };
    });
    assert.equal(colors.background, 'rgb(34, 34, 34)');
    assert.equal(colors.color, 'rgb(242, 242, 242)');
    assert.equal(colors.scheme, 'dark');
  }
  assert.equal(await page.locator('.visitor-detail-value').first().evaluate(el => getComputedStyle(el).color), 'rgb(242, 242, 242)');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.visitor-metrics .dashboard-metric')).backgroundColor === 'rgb(34, 34, 34)');
  await page.screenshot({ path: '/tmp/visitor-dark-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/visitor-dark-mobile.png', fullPage: true });
  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  assert.equal(await page.locator('#visitorStart').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');


  console.log('Visitor filters: presets, custom ranges, validation, calendar grouping, no comparison, page scoping, cache, stale requests, error recovery and mobile layout passed.');
} finally { await browser.close(); }
