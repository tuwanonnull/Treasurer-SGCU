import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const ctx = vm.createContext({ Intl, Date, URL });
vm.runInContext(await fs.readFile(new URL('js/features/project/app.receipt-documents.js', root), 'utf8'), ctx);
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'receipt-pagination-'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  await page.route('https://**/*', route => route.abort());
  for (const [name, long, club, type = 'certificate'] of [['short', false, false], ['club', false, true], ['overflow', true, true], ['long-header', true, true], ['voucher', false, false, 'voucher'], ['voucher-club', false, true, 'voucher'], ['voucher-overflow', true, true, 'voucher']]) {
    const project = { code: 'TEST', orgGroup: club ? 'ชมรมกีฬา' : 'สภานิสิต', orgName: long ? 'ชมรมศิลปวัฒนธรรมปักษ์ใต้ จุฬาฯ' : 'สภานิสิต', name: long ? 'โครงการจัดซื้อครุภัณฑ์ชมรม ประจำปีการศึกษา 2569' : 'โครงการทดสอบ', approveDate: '2026-10-01', lastWorkDate: '2026-10-31' };
    const data = { date: '2026-10-30', person: 'ชื่อผู้รับรอง ทดสอบ', position: 'ประธานโครงการ', advisor: 'ชื่ออาจารย์ที่ปรึกษา ทดสอบ', place: 'กรุงเทพมหานคร', house: '123', road: 'พญาไท', subdistrict: 'วังใหม่', district: 'ปทุมวัน', province: 'กรุงเทพมหานคร', phone: '0812345678', payer: 'ชื่อผู้จ่ายเงิน ทดสอบ' };
    if (name === 'long-header') project.name = project.name.repeat(3);
    const items = Array.from({ length: long ? 14 : 1 }, (_, i) => ({ date: data.date, description: long ? `รายการที่ ${i + 1} ค่าเดินทางและจัดซื้อวัสดุสำหรับกิจกรรมชมรมเพื่อใช้ในการดำเนินงานตามโครงการ` : 'ค่าเดินทางไปซื้ออุปกรณ์', note: long ? 'ใช้สำหรับกิจกรรมและจัดเตรียมสถานที่ดำเนินงานโครงการประจำปี' : '', satang: 4500 + i }));
    if (type === 'voucher') {
      items.splice(8);
      if (long) items.forEach(item => { item.description = item.description.repeat(2).slice(0, 160); });
    }
    const file = path.join(output, `${name}.html`);
    await fs.writeFile(file, ctx.buildReceiptDocument(type, data, items, project, root.href));
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => !document.querySelector('#receiptPrint').disabled || document.querySelector('#receiptPrintStatus').textContent);
    assert.equal(await page.locator('#receiptPrintStatus').textContent(), '');
    const inspect = () => [...document.querySelectorAll('.receipt-sheet')].map(sheet => {
      const rect = sheet.getBoundingClientRect();
      const ending = sheet.querySelector('.receipt-ending').getBoundingClientRect();
      const table = sheet.querySelector('table').getBoundingClientRect();
      const unit = (sheet.querySelector('.unit') || sheet.querySelector('table')).getBoundingClientRect();
      return { tableBottom: table.bottom - rect.top, footerTop: ending.top - rect.top, footerBottom: ending.bottom - rect.top, height: rect.height, padding: parseFloat(getComputedStyle(sheet).paddingBottom), center: (unit.left + unit.right) / 2 - (rect.left + rect.right) / 2, count: sheet.querySelectorAll('[data-receipt-amount]').length, total: sheet.querySelector('[data-page-total]').textContent, signs: sheet.querySelectorAll('.signature').length };
    });
    for (const media of ['screen', 'print']) {
      await page.emulateMedia({ media });
      const sheets = await page.evaluate(inspect);
      assert.equal(sheets.reduce((sum, sheet) => sum + sheet.count, 0), items.length);
      assert.equal(sheets.reduce((sum, sheet) => sum + Math.round(Number(sheet.total.replaceAll(',', '')) * 100), 0), items.reduce((sum, item) => sum + item.satang, 0));
      assert.ok(long ? sheets.length > 1 : sheets.length === 1);
      for (const sheet of sheets) {
        assert.ok(sheet.tableBottom <= sheet.footerTop + 1, JSON.stringify(sheet));
        assert.ok(sheet.footerBottom <= sheet.height - sheet.padding + 1, JSON.stringify(sheet));
        assert.ok(Math.abs(sheet.center) < 1);
        assert.equal(sheet.signs, (type === 'voucher' ? 2 : 1) + (club ? 1 : 0));
      }
      assert.ok(Math.max(...sheets.map(s => s.footerTop)) - Math.min(...sheets.map(s => s.footerTop)) < 1);
      console.log(name, media, JSON.stringify(sheets));
    }
    const pdf = await page.pdf({ path: path.join(output, `${name}.pdf`), preferCSSPageSize: true, printBackground: true });
    assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, await page.locator('.receipt-sheet').count());
    await page.emulateMedia({ media: 'screen' });
    await page.locator('.receipt-sheet').first().screenshot({ path: path.join(output, `${name}.png`) });
  }
  console.log(`Verified PDFs and screenshots: ${output}`);
} finally {
  await browser.close();
}
