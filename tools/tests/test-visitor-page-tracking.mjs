import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
const source = await fs.readFile('web/js/integrations/app.firebase-bootstrap.js', 'utf8');
const excerpt = source.slice(source.indexOf('// A persistent random browser ID'), source.indexOf('// Keep request-only'));
const documents = new Map(), storage = new Map();
let date = '2026-11-22', queue = Promise.resolve();
const context = vm.createContext({
  window: { sgcuVisitorCounter: {} }, location: { hostname: 'production.example' }, db: 'db', console,
  crypto: { randomUUID }, localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  getDateKeyInBangkok: () => date,
  doc: (root, ...parts) => [root, ...parts].join('/'), collection: (root, ...parts) => [root, ...parts].join('/'),
  serverTimestamp: () => 'now',
  runTransaction: (_db, fn) => {
    const result = queue.then(() => fn({
      get: async path => ({ exists: () => documents.has(path), data: () => documents.get(path) }),
      set: (path, value) => documents.set(path, value)
    })); queue = result.catch(() => {}); return result;
  }
});
vm.runInContext(excerpt, context);
const api = context.window.sgcuVisitorCounter;
await api.trackPageVisit('home'); await api.trackPageVisit('home');
assert.equal(documents.get('db/site_page_visitors/home/days/2026-11-22').total, 1);
await api.trackPageVisit('about'); await api.trackPageVisit('home');
assert.equal(documents.get('db/site_page_visitors/home/days/2026-11-22').total, 2);
assert.equal(documents.get('db/site_page_visitors/home/unique/2026-11-22').total, 1);
assert.equal(documents.get('db/site_page_visitors/about/unique/2026-11-22').total, 1);
assert.equal(documents.get('db/site_stats/page_home').total, 2);
date = '2026-11-23'; await api.trackPageVisit('home');
assert.equal(documents.get('db/site_page_visitors/home/unique/2026-11-23').total, 1);
const size = documents.size;
context.location.hostname = 'localhost'; await api.trackPageVisit('news');
assert.equal(documents.size, size);
context.location.hostname = 'production.example'; await api.trackPageVisit('../invalid');
assert.equal(documents.size, size);
console.log('Page tracking: route-entry counts, same-route suppression, browser deduplication per page/day, day rollover and no local-preview writes passed.');
