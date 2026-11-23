import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^127\.0\.0\.1:\d+$/.test(host)) throw Error('Run with the local Firestore emulator');
const root = 'projects/demo-budget-meeting/databases/(default)/documents';
const base = `http://${host}/v1/${root}`;
let day;
const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const fixtures = new Set();
async function clearFixture(path) {
  fixtures.add(path);
  await fetch(`${base}/${path}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
}
const browserA = randomUUID(), browserB = randomUUID();
const counter = (total, browser) => ({ update: { name: `${root}/${day}`, fields: { total: { integerValue: String(total) }, lastBrowserId: { stringValue: browser } } }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] });
const marker = (browser) => ({ update: { name: `${root}/${day}/browsers/${browser}`, fields: {} }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] });
async function commit(writes, status) {
  const response = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  assert.equal(response.status, status, await response.text());
}
for (const prefix of ['site_daily_unique_visitors', 'site_page_visitors/home/unique']) {
  day = `${prefix}/${dateKey}`;
  await clearFixture(day);
  fixtures.add(`${day}/browsers/${browserA}`);
  fixtures.add(`${day}/browsers/${browserB}`);
await commit([counter(1, browserA)], 403);
await commit([marker(browserA)], 403);
await commit([counter(1, browserA), marker(browserA)], 200);
await commit([counter(2, browserA), marker(browserA)], 403);
await commit([counter(3, browserB), marker(browserB)], 403);
await commit([counter(2, browserB), marker(browserB)], 200);
await commit([{ delete: `${root}/${day}/browsers/${browserA}` }], 403);
const response = await fetch(`${base}/${day}`);
assert.equal(response.status, 200);
assert.equal((await response.json()).fields.total.integerValue, '2');
}
console.log('Visitor rules: anonymous counting, atomic markers, duplicate prevention, exact increments and deletion protection passed.');

const visitPath = `${root}/site_page_visitors/home/days/${dateKey}`;
const visit = total => ({ update: { name: visitPath, fields: { total: { integerValue: String(total) } } }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] });
await clearFixture(`site_page_visitors/home/days/${dateKey}`);
await commit([visit(1000000)], 403);
await commit([visit(1)], 200);
await commit([visit(2)], 200);
await commit([visit(4)], 403);
console.log('Page-specific visits and unique browser deduplication passed.');

for (const invalidDate of ['2000-01-01', '2099-12-31', 'arbitrary']) {
  for (const prefix of ['site_daily_visitors', 'site_page_visitors/home/days']) {
    const write = visit(1);
    write.update.name = `${root}/${prefix}/${invalidDate}`;
    await commit([write], 403);
  }
  for (const prefix of ['site_daily_unique_visitors', 'site_page_visitors/home/unique']) {
    day = `${prefix}/${invalidDate}`;
    const browser = randomUUID();
    await commit([counter(1, browser), marker(browser)], 403);
  }
}
for (const id of ['visitors_all_time', 'page_home']) {
  const path = `site_stats/${id}`;
  await clearFixture(path);
  const write = visit(999999);
  write.update.name = `${root}/${path}`;
  await commit([write], 403);
  write.update.fields.total.integerValue = '1';
  await commit([write], 200);
  write.update.fields.total.integerValue = '2';
  await commit([write], 200);
}
const wrongTime = visit(3);
wrongTime.updateTransforms = [];
wrongTime.update.fields.updatedAt = { timestampValue: '2000-01-01T00:00:00Z' };
await commit([wrongTime], 403);
const arbitrary = visit(1);
arbitrary.update.name = `${root}/site_stats/arbitrary-document`;
await commit([arbitrary], 403);
for (const path of fixtures) await clearFixture(path);
console.log('Visitor history, initial totals, timestamps and stat IDs are protected.');
