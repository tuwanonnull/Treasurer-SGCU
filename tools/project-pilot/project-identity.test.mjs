import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectIdentityResolver } from './project-identity.mjs';
import { STATUS_GROUPS, statusMode } from './statuses.mjs';

const grant = { uid: 'account-1', academicYear: 2569, active: true, projectRole: 'secretary' };
const resolver = (overrides = {}) => createProjectIdentityResolver({
  verifyToken: async () => ({ uid: 'account-1', role: 'head' }),
  readGrant: async () => ({ ...grant }), ...overrides
});
const denied = status => error => error.status === status;

test('only trusted project grant determines role; secretary still needs head review', async () => {
  const actor = await resolver()('Bearer token', 2569);
  assert.equal(actor.role, 'secretary');
  assert.equal(Object.isFrozen(actor), true);
  const approval = STATUS_GROUPS.find(g => g.column === 'H');
  for (const value of approval.values) assert.equal(statusMode(actor, approval, value), 'review');
});
test('each explicit role is distinct', async () => {
  for (const projectRole of ['head', 'secretary', 'assistant']) {
    const actor = await resolver({ readGrant: async () => ({ ...grant, projectRole }) })('Bearer token', 2569);
    assert.deepEqual(actor, { id: grant.uid, role: projectRole, academicYear: 2569 });
  }
});
test('reject absent, malformed and failed authentication before reading grants', async () => {
  let reads = 0;
  const resolve = resolver({ verifyToken: async () => { throw Error('expired'); }, readGrant: async () => { reads++; } });
  for (const header of [undefined, '', 'Basic token', 'Bearer ', 'Bearer token extra', 'Bearer token']) {
    await assert.rejects(resolve(header, 2569), denied(401));
  }
  assert.equal(reads, 0);
  await assert.rejects(resolver({ verifyToken: async () => ({ role: 'head' }) })('Bearer token', 2569), denied(401));
});
test('no elevation from legacy page permissions, position labels or shared division codes', async () => {
  for (const legacy of [{ role: '0' }, { divisionCodeYY: '00' }, { position: 'เหรัญญิก' },
    { position: 'เลขานุการฝ่ายเหรัญญิก' }, { position: 'ผู้ช่วยเหรัญญิก' }, { allowedPages: ['project-status-staff'] }]) {
    await assert.rejects(resolver({ readGrant: async () => ({ uid: grant.uid, academicYear: 2569, active: true, ...legacy }) })('Bearer token', 2569), denied(403));
  }
});
test('wrong account/year, inactive and unknown grants are denied', async () => {
  for (const invalid of [null, { ...grant, uid: 'other' }, { ...grant, academicYear: 2568 },
    { ...grant, active: false }, { ...grant, active: 'true' }, { ...grant, projectRole: 'admin' }]) {
    await assert.rejects(resolver({ readGrant: async () => invalid })('Bearer token', 2569), denied(403));
  }
});
test('checks revocation and reloads role on subsequent requests', async () => {
  let active = true, reads = 0;
  const resolve = resolver({ verifyToken: async (token, options) => {
    assert.equal(token, 'token'); assert.deepEqual(options, { checkRevoked: true }); return { uid: grant.uid };
  }, readGrant: async key => {
    assert.deepEqual(key, { uid: grant.uid, academicYear: 2569 }); reads++; return { ...grant, active };
  } });
  await resolve('Bearer token', 2569); active = false;
  await assert.rejects(resolve('Bearer token', 2569), denied(403)); assert.equal(reads, 2);
});
test('invalid year and backend failure do not grant access', async () => {
  for (const year of [null, '2569', 2569.1, 0]) await assert.rejects(resolver()('Bearer token', year), denied(400));
  const failure = new Error('grant storage unavailable');
  await assert.rejects(resolver({ readGrant: async () => { throw failure; } })('Bearer token', 2569), error => error === failure);
});
