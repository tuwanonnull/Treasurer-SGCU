import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^127\.0\.0\.1:\d+$/.test(host)) throw Error('Run with the local Firestore emulator');
const root = 'projects/demo-budget-meeting/databases/(default)/documents';
const base = `http://${host}/v1/${root}`;
let day;
const browserA = randomUUID(), browserB = randomUUID();
const counter = (total, browser) => ({ update: { name: `${root}/${day}`, fields: { total: { integerValue: String(total) }, lastBrowserId: { stringValue: browser } } }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] });
const marker = (browser) => ({ update: { name: `${root}/${day}/browsers/${browser}`, fields: {} }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] });
async function commit(writes, status) {
  const response = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  assert.equal(response.status, status, await response.text());
}
for (const prefix of ['site_daily_unique_visitors', 'site_page_visitors/home/unique']) {
  day = `${prefix}/test-${randomUUID()}`;
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

const visitPath = `${root}/site_page_visitors/home/days/test-${randomUUID()}`;
const visit = total => ({ update: { name: visitPath, fields: { total: { integerValue: String(total) } } }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] });
await commit([visit(1)], 200);
await commit([visit(2)], 200);
await commit([visit(4)], 403);
console.log('Page-specific visits and unique browser deduplication passed.');
