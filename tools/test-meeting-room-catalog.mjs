import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/features/booking/app.meeting-room-staff.js', import.meta.url), 'utf8');
const start = source.indexOf('  const roomNameKey =');
const end = source.indexOf('  const subscribeRooms =', start);
const database = new Map();
let revision = 0;
let cachedDocs = [];
const snapshot = (id, data) => ({ id, exists: () => data !== undefined, data: () => structuredClone(data) });
const firestore = {
  db: {}, collection: () => 'rooms', doc: (_db, _collection, id) => id,
  getDocs: async () => ({ docs: cachedDocs }),
  serverTimestamp: () => 1,
  async runTransaction(_db, callback) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const version = revision;
      const writes = [];
      const result = await callback({
        get: async id => snapshot(id, database.get(id)),
        set: (id, data) => writes.push([id, data]),
        update: (id, data) => writes.push([id, { ...database.get(id), ...data }]),
        delete: id => writes.push([id, undefined])
      });
      if (revision !== version) continue;
      for (const [id, data] of writes) {
        if (data === undefined) database.delete(id);
        else database.set(id, structuredClone(data));
      }
      revision++;
      return result;
    }
    throw new Error('transaction retry exhausted');
  }
};
const context = () => {
  const c = vm.createContext({ firestore, assert });
  vm.runInContext(`
    const ROOM_COLLECTION_NAME = 'rooms';
    const hasFirestore = true;
    let isSeedingDefaultRooms = false;
    const DEFAULT_ROOMS = [1,2,3].map(n => ({ id: 'room-' + n, name: 'Room ' + n }));
    const normalizeRoomBookingAccess = () => 'public';
    ${source.slice(start, end)}
    globalThis.seed = seedDefaultRoomsIfEmpty;
    globalThis.mutate = mutateRoomCatalog;
    globalThis.key = roomNameKey;
  `, c);
  return c;
};
const a = context(), b = context();
await Promise.all([a.seed(), b.seed()]);
assert.equal(database.size, 4, 'two tabs create only three rooms and one catalog');
database.get('room-1').bookingAccess = 'staff';
await a.seed();
assert.equal(database.get('room-1').bookingAccess, 'staff', 'repeat seed preserves settings');
assert.equal(a.key('  ROOM   1 '), a.key('room 1'));

// A stale collection read must still discover the other writer through the catalog.
const add = (ctx, id, name) => ctx.mutate((tx, current) => {
  if (current.some(room => ctx.key(room.name) === ctx.key(name))) throw new Error('duplicate');
  tx.set(id, { name });
  current.push({ id, name });
});
const results = await Promise.allSettled([add(a, 'new-a', 'New room'), add(b, 'new-b', ' NEW  ROOM ')]);
assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
assert.equal(results.filter(result => result.status === 'rejected').length, 1);

// An existing installation without a catalog must never receive default rooms.
database.clear(); revision++;
database.set('legacy', { name: 'Existing room', bookingAccess: 'staff' });
cachedDocs = [snapshot('legacy', database.get('legacy'))];
await a.seed();
assert.deepEqual([...database.keys()].sort(), ['__catalog', 'legacy']);
assert.equal(database.get('legacy').bookingAccess, 'staff');
console.log('Meeting room catalog: concurrent seeds/additions, stale snapshots, normalization, legacy rooms and settings preservation passed.');
