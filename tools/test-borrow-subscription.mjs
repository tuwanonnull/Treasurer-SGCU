import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../js/features/borrow/app.borrow-assets.js', import.meta.url), 'utf8');
const start = source.indexOf('  const subscribeBorrowRequests =');
const end = source.indexOf('  const submitBorrowRequest =', start);
assert.ok(start >= 0 && end > start);
const listeners = [];
const events = new Map();
let accessChecks = 0;
let unsubscribed = 0;
const email = 'student@student.chula.ac.th';
const context = vm.createContext({
  window: { location: { hash: '#borrow-assets' }, addEventListener: (name, fn) => events.set(name, fn) },
  document: { querySelector: () => ({ dataset: { page: 'borrow-assets' } }) },
  console: { error() {} },
  borrowRequestsPage: '', borrowStaffAccessCheckSeq: 0,
  resolveFirestoreBridge() {}, hasFirestore: true,
  unsubscribeBorrowRequests: [], borrowRequests: [], borrowRequestsSnapshotCount: 0,
  myRequestsLoadState: 'idle', myRequestsLoadError: '', lastBorrowStaffAccessResult: null,
  collectionSnapshotRows: new Map(), collectionSnapshotCounts: new Map(), collectionSnapshotErrors: new Map(),
  BORROW_REQUEST_COLLECTIONS: ['borrowAssetRequests'],
  BORROW_REQUEST_ACTIVE_LIST_LIMIT: 100, BORROW_REQUEST_HISTORY_LIST_LIMIT: 100,
  STATUS_PENDING: 'pending', STATUS_APPROVED: 'approved', STATUS_RECEIVED: 'received',
  STATUS_REJECTED: 'rejected', STATUS_CANCELLED: 'cancelled', STATUS_RETURNED: 'returned',
  staffAuthUser: { role: 'staff', allowedPages: ['meeting-room-staff'] },
  readCurrentUserEmail: () => email,
  hasStaffPermission: () => true,
  readBorrowStaffProfileAccess: async () => { accessChecks++; return { ok: true }; },
  renderBorrowRequests() {}, syncBorrowStatusNotifications() {}, syncStaffBorrowNotifications() {},
  setStaffQueueMessage() {}, setStaffQueueStatusMessage() {},
  normalizeBorrowRequest: (id, data) => ({ id, ...data }),
  firestore: {
    db: {}, collection: (_db, name) => name,
    where: (...args) => ({ where: args }), limit: value => ({ limit: value }),
    query: (collection, ...filters) => ({ collection, filters }),
    onSnapshot: (query, success, error) => {
      listeners.push({ query, success, error });
      return () => { unsubscribed++; };
    }
  }
});
vm.runInContext(`${source.slice(start, end)}\nglobalThis.subscribe = subscribeBorrowRequests;`, context);
await context.subscribe();
assert.equal(accessChecks, 0, 'Personal page must not check staff queue access');
assert.equal(listeners.length, 1, 'Staff viewing their own requests must use a single owner query');
assert.equal(JSON.stringify(listeners[0].query.filters[0]), JSON.stringify({ where: ['requesterEmail', '==', email] }));
listeners[0].success({ size: 1, docs: [{ id: 'mine', data: () => ({ requesterEmail: email }) }] });
assert.equal(context.myRequestsLoadState, 'loaded');
assert.equal(context.borrowRequests[0].id, 'mine');

await context.subscribe('borrow-assets-staff');
assert.equal(accessChecks, 1);
assert.equal(unsubscribed, 1);
assert.equal(listeners.length, 3, 'Authorized staff page should subscribe to active and history');
assert.equal(context.borrowRequests.length, 0, 'Previous scope must be cleared');
listeners[1].error({ code: 'permission-denied' });
assert.equal(context.myRequestsLoadState, 'error', 'A denied staff query must not remain loading');

await context.subscribe('borrow-assets');
assert.equal(unsubscribed, 3);
assert.equal(listeners.length, 4);
listeners[1].success({ size: 1, docs: [{ id: 'other-user', data: () => ({}) }] });
assert.equal(context.borrowRequests.length, 0, 'Late callbacks from an old scope must be ignored');
assert.equal(context.myRequestsLoadState, 'loading');
listeners[3].error({ code: 'permission-denied' });
assert.equal(context.myRequestsLoadState, 'error');
assert.match(context.myRequestsLoadError, /ไม่มีสิทธิ์อ่านสถานะคำขอของตนเอง/);
listeners[3].success({ size: 0, docs: [] });
assert.equal(context.myRequestsLoadState, 'loaded', 'Empty results must finish loading');
assert.equal(context.borrowRequests.length, 0);

const eventStart = source.indexOf('  window.addEventListener("sgcu:page-active",');
const eventEnd = source.indexOf('  window.addEventListener("sgcu:user-profile-updated",', eventStart);
assert.ok(eventStart >= 0 && eventEnd > eventStart);
vm.runInContext(source.slice(eventStart, eventEnd), context);
events.get('sgcu:page-active')({ detail: { page: 'borrow-assets-staff' } });
await new Promise(resolve => setImmediate(resolve));
assert.equal(accessChecks, 2, 'Switching pages must update query scope');
const listenerCount = listeners.length;
events.get('sgcu:page-active')({ detail: { page: 'borrow-assets-staff' } });
assert.equal(listeners.length, listenerCount, 'Repeated page-active event must not duplicate listeners');
events.get('sgcu:page-active')({ detail: { page: 'borrow-assets' } });
assert.equal(context.borrowRequestsPage, 'borrow-assets');
console.log('Borrow subscription tests passed.');
