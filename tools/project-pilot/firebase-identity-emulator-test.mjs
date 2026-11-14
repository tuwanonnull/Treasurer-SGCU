import assert from 'node:assert/strict';
import { createEmulatorIdentity, EMULATOR_PROJECT } from './firebase-identity.mjs';
import { STATUS_GROUPS, statusMode } from './statuses.mjs';

const adapter = createEmulatorIdentity();
const year = 2569, accounts = [], suffix = crypto.randomUUID();
const denied = status => error => error.status === status;
try {
  for (const role of ['head', 'secretary', 'assistant', 'unassigned']) {
    const response = await fetch('http://127.0.0.1:9197/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${role}-${suffix}@example.test`, password: 'Emulator-only-12345', returnSecureToken: true })
    });
    const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data));
    const account = { uid: data.localId, header: `Bearer ${data.idToken}`, role }; accounts.push(account);
    if (role !== 'unassigned') await adapter.grantRef(account.uid, year).set({ uid: account.uid, academicYear: year, active: true, projectRole: role });
  }
  const [head, secretary, assistant, unassigned] = accounts;
  for (const account of [head, secretary, assistant]) {
    assert.deepEqual(await adapter.resolve(account.header, year), { id: account.uid, role: account.role, academicYear: year });
  }
  const approval = STATUS_GROUPS.find(g => g.column === 'H');
  const secretaryActor = await adapter.resolve(secretary.header, year);
  for (const value of approval.values) assert.equal(statusMode(secretaryActor, approval, value), 'review');
  await assert.rejects(adapter.resolve(unassigned.header, year), denied(403));
  await assert.rejects(adapter.resolve(head.header, 2568), denied(403));
  await assert.rejects(adapter.resolve('Bearer invalid-token', year), denied(401));

  // Even head clients cannot directly change grants: provisioning is server-only.
  const root = `http://127.0.0.1:8187/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents`;
  const grantPath = `${root}/projectAccess/${year}/members/${assistant.uid}`;
  for (const account of accounts) {
    const write = await fetch(grantPath, { method: 'PATCH', headers: { Authorization: account.header, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { projectRole: { stringValue: 'head' } } }) });
    assert.equal(write.status, 403, await write.text());
    assert.equal((await fetch(grantPath, { headers: { Authorization: account.header } })).status, 403);
  }
  const anonymousWrite = await fetch(grantPath, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"fields":{}}' });
  assert.equal(anonymousWrite.status, 403);
  assert.equal((await adapter.resolve(assistant.header, year)).role, 'assistant');

  await adapter.grantRef(secretary.uid, year).update({ active: false });
  await assert.rejects(adapter.resolve(secretary.header, year), denied(403));
  await adapter.auth.updateUser(head.uid, { disabled: true });
  await assert.rejects(adapter.resolve(head.header, year), denied(401));
  // Revocation timestamps have second precision; advance beyond token issuance.
  await new Promise(resolve => setTimeout(resolve, 1100));
  await adapter.auth.revokeRefreshTokens(assistant.uid);
  await assert.rejects(adapter.resolve(assistant.header, year), denied(401));
  console.log('PASS: actual emulator tokens, three separate roles, secretary approval policy, absent/year-mismatched grants, invalid/disabled/revoked tokens, client role escalation denied, immediate grant removal.');
} finally {
  for (const account of accounts) {
    await adapter.grantRef(account.uid, year).delete();
    await adapter.auth.deleteUser(account.uid);
  }
  await adapter.close();
}
