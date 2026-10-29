import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../js/features/project/app.receipt-documents.js', import.meta.url), 'utf8');
const ctx = vm.createContext({ Intl, Date, URL });
vm.runInContext(source, ctx);
assert.equal(ctx.resolveProjectReceiptTemplate({ orgGroup: ' องค์การบริหารสโมสรนิสิต ' }).key, 'objor');
assert.equal(ctx.resolveProjectReceiptTemplate({ orgName: 'องค์การบริหารสโมสรนิสิตจุฬาฯ' }).available, true);
assert.equal(ctx.resolveProjectReceiptTemplate({ orgGroup: 'ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์', orgName: 'องค์การบริหารสโมสรนิสิต' }).key, 'club');
assert.equal(ctx.resolveProjectReceiptTemplate({ orgGroup: 'ชมรมกีฬา' }).available, true);
assert.equal(ctx.resolveProjectReceiptTemplate({ orgGroup: 'สภานิสิต' }).key, 'objor');
assert.equal(ctx.resolveProjectReceiptTemplate({ orgName: 'สภานิสิต' }).available, true);
assert.equal(ctx.resolveProjectReceiptTemplate({ orgGroup: 'องค์การบริหารสโมสรนิสิต, สภานิสิต' }).key, 'objor');
assert.equal(ctx.resolveProjectReceiptTemplate({ orgGroup: 'หน่วยงานอื่น', orgName: 'สภานิสิต' }).available, false);
assert.equal(ctx.resolveProjectReceiptTemplate({}).available, false);
assert.equal(ctx.receiptSatang('0.10') + ctx.receiptSatang('0.20'), 30);
assert.equal(ctx.receiptSatang('999999999.99'), 99999999999);
for (const value of ['0', '-1', '1.001', '1e3', 'Infinity', '', '1000000000', '1,000']) {
  assert.throws(() => ctx.receiptSatang(value));
}
for (const [amount, words] of [
  [0, 'ศูนย์บาทถ้วน'], [100, 'หนึ่งบาทถ้วน'], [1100, 'สิบเอ็ดบาทถ้วน'],
  [2100, 'ยี่สิบเอ็ดบาทถ้วน'], [10100, 'หนึ่งร้อยเอ็ดบาทถ้วน'],
  [100000100, 'หนึ่งล้านเอ็ดบาทถ้วน'], [125050, 'หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์'],
  [1, 'ศูนย์บาทหนึ่งสตางค์']
]) assert.equal(ctx.receiptBahtText(amount), words);
assert.match(ctx.receiptDate('2026-10-29', true), /2569/);
assert.throws(() => ctx.receiptDate('2026-02-30'));
assert.throws(() => ctx.receiptDate(''));
const data = { date: '2026-10-29', person: '<script>alert(1)</script>', unit: 'หน่วยงานทดสอบ', position: 'ประธาน', payer: 'ผู้จ่ายทดสอบ' };
const items = [{ satang: 10, description: '<img onerror=alert(1)>', date: '2026-10-29', note: 'ทดสอบ' }, { satang: 20, date: '2026-10-29', description: 'รายการสอง', note: 'ทดสอบ' }];
for (const type of ['voucher', 'certificate']) {
  const html = ctx.buildReceiptDocument(type, data, items, {code:'TEST', name:'โครงการทดสอบ'}, 'http://localhost/');
  assert.match(html, /0.30/);
  assert.match(html, /ศูนย์บาทสามสิบสตางค์/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<img onerror/);
  assert.doesNotMatch(html, /อาจารย์ที่ปรึกษา/);
  assert.match(html, /receipt-print.css/);
}
assert.throws(() => ctx.buildReceiptDocument('invalid', data, items, {}, 'http://localhost/'));
assert.throws(() => ctx.buildReceiptDocument('voucher', data, Array(9).fill(items[0]), {}, 'http://localhost/'));
console.log('Receipt document money, Thai text, dates, escaping, and template tests passed.');

for (const type of ['voucher', 'certificate']) {
  const project = { orgGroup: 'ชมรมฝ่ายกีฬา', orgName: 'ชมรมทดสอบ' };
  assert.throws(() => ctx.buildReceiptDocument(type, data, items, project, 'http://localhost/'), /อาจารย์ที่ปรึกษา/);
  const html = ctx.buildReceiptDocument(type, { ...data, advisor: 'อาจารย์ทดสอบ <script>' }, items, project, 'http://localhost/');
  assert.match(html, /อาจารย์ที่ปรึกษา/);
  assert.match(html, /อาจารย์ทดสอบ &lt;script&gt;/);
  assert.equal((html.match(/class="signature"/g) || []).length, type === 'voucher' ? 3 : 2);
}
console.log('Club templates require and include advisor signatures for both document types.');
