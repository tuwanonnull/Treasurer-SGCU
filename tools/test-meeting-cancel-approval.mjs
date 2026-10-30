import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

for (const [file, name] of [
  ['app.meeting-room-staff.js', 'setStatusById'],
  ['app.meeting-room-booking.js', 'applyStatusByIdFromModal']
]) {
  const source = readFileSync(new URL(`../js/features/booking/${file}`, import.meta.url), 'utf8');
  const start = source.indexOf(`  const ${name} =`);
  assert.ok(start >= 0);
  const body = source.slice(start, source.indexOf('\n  };', start) + 5);
  let booking, prompts, writes, reason;
  const context = vm.createContext({
    hasFirestore: true, activeDetailOptions: {},
    canEditBookingStatusInModal: () => true,
    findBooking: predicate => predicate(booking) ? booking : undefined,
    COLLECTION_NAME: 'bookings', BOOKING_COLLECTION_NAME: 'bookings',
    firestore: { db: {}, serverTimestamp: () => 'timestamp', doc: () => ({}),
      updateDoc: async (_ref, payload) => writes.push(payload) },
    setStaffActionMessage: () => {}, setBookingDetailStatusMessage: () => {},
    askRejectionReason: async () => { prompts++; return reason; },
    normalizeStatus: value => value, hasOverlap: () => false,
    writeAuditLog: async () => {}, pickBookingAuditFields: value => value, window: {}
  });
  vm.runInContext(`${body}\nglobalThis.apply = ${name};`, context);
  const reset = status => {
    booking = { id: 'request', status, rejectionReason: 'old reason', cancelRequestReason: 'Requester reason', cancelBaseStatus: 'approved' };
    context.bookings = [booking]; prompts = 0; writes = []; reason = '';
  };
  reset('cancel_requested');
  await context.apply('request', 'rejected');
  assert.equal(prompts, 0, `${file}: cancellation approval must not prompt`);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].cancelledByRequester, true);
  assert.equal(writes[0].cancelledAt, 'timestamp');
  assert.equal(writes[0].rejectionReason, '');
  assert.equal(writes[0].status, 'rejected');
  assert.equal('cancelRequestReason' in writes[0], false, 'Preserve requester reason');
  reset('pending');
  await context.apply('request', 'rejected');
  assert.equal(prompts, 1);
  assert.equal(writes.length, 0, 'Ordinary rejection still requires a reason');
  reason = 'Room unavailable';
  await context.apply('request', 'rejected');
  assert.equal(writes[0].rejectionReason, reason);
  reset('cancel_requested');
  await context.apply('request', 'approved');
  assert.equal(prompts, 0);
  assert.equal(writes[0].status, 'approved');
  assert.equal(writes[0].cancelledByRequester, false);
}
console.log('Cancellation approval: no reason prompt in staff table or detail modal; normal rejection still requires a reason.');
