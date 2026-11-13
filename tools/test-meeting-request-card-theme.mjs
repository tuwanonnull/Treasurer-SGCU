import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
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
  await page.evaluate(html => {
    document.body.innerHTML = html;
    document.querySelector('.page-view').classList.add('active');
  }, await fs.readFile(new URL('partials/meeting-room-staff.html', root), 'utf8'));
  await page.locator('#meetingRoomAllTableBody').evaluate(node => {
    node.innerHTML = ['pending', 'approved', 'rejected'].map(status => `<tr>
      <td data-label="ห้อง">ห้องประชุมตัวอย่าง</td>
      <td data-label="ช่วงเวลา"><div class="meeting-staff-period"><span>13 พ.ย. 2569</span><span class="meeting-staff-period-time">10:00 - 12:00</span></div></td>
      <td data-label="ผู้ขอ"><div class="meeting-staff-requester"><span>ผู้ขอตัวอย่าง</span><span class="meeting-staff-requester-type is-student">นิสิต</span></div></td>
      <td data-label="วัตถุประสงค์"><div class="meeting-staff-purpose-cell"><span class="meeting-staff-purpose-text">ประชุมวางแผนโครงการ</span><div class="meeting-row-meta">หมายเหตุคำขอ</div></div></td>
      <td data-label="สถานะ"><select class="staff-status-select is-${status}"><option value="${status}">${status}</option></select></td>
    </tr>`).join('');
  });
  for (const standalone of [false, true]) {
    await page.evaluate(value => {
      document.documentElement.classList.toggle('sgcu-standalone', value);
      document.documentElement.dataset.theme = 'dark';
    }, standalone);
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const styles = await page.locator('#staffMeetingAll').evaluate(panel => {
        const css = selector => getComputedStyle(panel.querySelector(selector));
        return {
          wrapper: css('.table-wrapper').backgroundColor,
          text: css('td[data-label="ผู้ขอ"]').color,
          purpose: css('.meeting-staff-purpose-text').color,
          label: getComputedStyle(panel.querySelector('td[data-label]'), '::before').color,
          time: css('.meeting-staff-period-time').color,
          note: css('.meeting-row-meta').color,
          divider: css('td:last-child').borderTopColor
        };
      });
      assert.equal(styles.text, 'rgb(242, 242, 242)', 'Mobile card content must stay readable on dark surfaces');
      assert.equal(styles.purpose, 'rgb(242, 242, 242)', 'Purpose text must override the mobile dark-gray text rule');
      assert.equal(styles.wrapper, 'rgba(0, 0, 0, 0)');
      for (const key of ['label', 'time', 'note']) assert.equal(styles[key], 'rgb(184, 184, 184)', key);
      assert.equal(styles.divider, 'rgb(64, 64, 64)');
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  assert.equal(await page.locator('td[data-label="ผู้ขอ"]').first().evaluate(n => getComputedStyle(n).color), 'rgb(17, 24, 39)');
  console.log('Meeting approval cards: readable dark mobile content, labels, metadata and separators; light theme restored.');
} finally {
  await browser.close();
}
