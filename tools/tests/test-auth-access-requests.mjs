import assert from 'node:assert/strict';
import { readAccessRequestState, submitAccessRequest } from '../../web/js/integrations/app.auth-access-requests.js';
const user = { uid: 'guest', email: 'Guest@example.com', emailVerified: true };
let record = null, failed = false, writes = 0;
const snapshot = value => ({ exists: () => value !== null, data: () => value });
const read = async ref => { if (failed) throw Error('offline'); assert(ref.startsWith('authEmailAccess/')); return snapshot(record); };
const api = {
  doc: (_db, collection, id) => `${collection}/${id}`, getDocFromServer: read,
  isAllowedAuthEmail: email => email.endsWith('@chula.ac.th'),
  isTemporaryAuthAccessActive: data => data.active && data.endsAt > Date.now() && data.startsAt <= Date.now(),
  serverTimestamp: () => 'server',
  runTransaction: (_db, callback) => callback({ get: read, set: (_ref, data) => { record = { ...record, ...data }; writes++; } })
};
const fields = { name: ' Name ', organization: 'Org', reason: 'Work' };
assert.equal((await readAccessRequestState(api, {}, user)).status, 'new');
assert.equal((await submitAccessRequest(api, {}, user, fields)).status, 'pending');
assert.equal(record.email, 'guest@example.com');
assert.equal(record.name, 'Name');
await submitAccessRequest(api, {}, user, fields);
assert.equal(writes, 1);
record.status = 'rejected'; assert.equal((await readAccessRequestState(api, {}, user)).status, 'rejected');
record = null;
record = { active: true, startsAt: Date.now() - 10000, endsAt: Date.now() + 60000 };
assert.equal((await submitAccessRequest(api, {}, user, fields)).status, 'allowed');
assert.equal(writes, 1);
record.endsAt = Date.now() - 1;
assert.equal((await readAccessRequestState(api, {}, user)).status, 'new');
failed = true;
await assert.rejects(readAccessRequestState(api, {}, user), /offline/);
await assert.rejects(submitAccessRequest(api, {}, user, fields), /offline/);
assert.equal(writes, 1);
assert.equal((await readAccessRequestState(api, {}, { ...user, email: 'member@chula.ac.th' })).status, 'allowed');
await assert.rejects(readAccessRequestState(api, {}, { ...user, emailVerified: false }));
await assert.rejects(submitAccessRequest(api, {}, user, { ...fields, reason: ' ' }));
console.log('Access request states: existing grants, expiry, duplicate prevention, verified identity, validation and read failures passed.');
