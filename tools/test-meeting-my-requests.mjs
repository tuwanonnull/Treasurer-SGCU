import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/features/booking/app.meeting-room-booking.js', import.meta.url), 'utf8');
const extract = (name) => {
  const start = source.indexOf(`  const ${name} =`);
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\n  };', start) + 5);
};
const context = vm.createContext({ assert });
vm.runInContext(`
let now = '2026-10-16T12:00:00';
const RealDate = Date;
Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [now])); }
};
${extract('toDateKeyForQuery')}
${extract('getMyBookingsStartDate')}
assert.equal(getMyBookingsStartDate(), '2026-10-16');
now = '2026-03-31T12:00:00';
assert.equal(getMyBookingsStartDate(), '2026-03-31');
now = '2024-03-31T12:00:00';
assert.equal(getMyBookingsStartDate(), '2024-03-31');
now = '2026-01-16T12:00:00';
assert.equal(getMyBookingsStartDate(), '2026-01-16');
now = '2026-10-16T12:00:00';
let myBookings = [], unsubscribeMyBookings = null;
let myBookingsLoaded = false, myBookingsLoadFailed = false;
let currentUserEmail = 'user@example.com', hasFirestore = true;
let callback, errors, stopped = 0, retries = 0;
const BOOKING_COLLECTION_NAME = 'meetingRoomBookings';
const renderMyRequests = () => {};
const renderOwnBookingOptions = () => {};
const updateManageActionUI = () => {};
const scheduleMeetingAutoRetry = () => retries++;
const mapSnapshotDoc = doc => doc;
const firestore = {
  db: {}, collection: () => ({}), where: (...args) => args,
  query: (collection, condition) => {
    assert.deepEqual(condition, ['requesterEmail', '==', currentUserEmail]);
    return condition;
  },
  onSnapshot: (query, next, error) => {
    callback = next; errors = error;
    return () => stopped++;
  }
};
${extract('subscribeMyBookings')}
subscribeMyBookings();
callback({ docs: [
  { id: 'old', date: '2026-09-15' },
  { id: 'yesterday', date: '2026-10-15' },
  { id: 'boundary', date: '2026-10-16', startTime: '08:00' },
  { id: 'future', date: '2030-12-31' }
] });
assert.deepEqual(myBookings.map(item => item.id), ['boundary', 'future']);
assert.equal(myBookingsLoaded, true);
const previousCallback = callback;
currentUserEmail = 'other@example.com';
subscribeMyBookings();
assert.equal(stopped, 1);
assert.equal(myBookings.length, 0);
previousCallback({ docs: [{ id: 'stale', date: '2030-12-31' }] });
assert.equal(myBookings.length, 0);
errors();
assert.equal(myBookingsLoadFailed, true);
assert.equal(retries, 1);
currentUserEmail = '';
subscribeMyBookings();
assert.equal(stopped, 2);
assert.equal(myBookings.length, 0);
`, context);
console.log('Meeting requests: today included, past dates excluded, unlimited future dates, owner query, account switching, cleanup and retry passed.');
