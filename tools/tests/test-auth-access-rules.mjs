import assert from 'node:assert/strict';
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^127\.0\.0\.1:\d+$/.test(host)) throw Error('Run with the local Firestore emulator');
const project = 'demo-budget-meeting';
const root = `projects/${project}/databases/(default)/documents`;
const base = `http://${host}/v1/${root}`;
const email = 'applicant@example.com', other = 'other@example.com', admin = 'tuwanon.kimchiang@gmail.com';
function token(email, verified = true) {
  const now = Math.floor(Date.now() / 1000);
  return [ { alg: 'none', typ: 'JWT' }, { aud: project, iss: `https://securetoken.google.com/${project}`, sub: email, user_id: email, email, email_verified: verified, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'google.com' } } ].map(x => Buffer.from(JSON.stringify(x)).toString('base64url')).join('.') + '.';
}
const fields = obj => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, value instanceof Date ? { timestampValue: value.toISOString() } : typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value }]));
async function read(path, who, expected, verified = true) {
  const response = await fetch(`${base}/${path}`, { headers: who ? { Authorization: `Bearer ${token(who, verified)}` } : {} });
  assert.equal(response.status, expected, `${who} GET ${path}: ${await response.text()}`);
}
function write(collection, id, data, timeField) {
  return { update: { name: `${root}/${collection}/${id}`, fields: fields(data) }, ...(timeField ? { updateTransforms: (Array.isArray(timeField) ? timeField : [timeField]).map(fieldPath => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })) } : {}) };
}
async function commit(who, writes, expected = 200, verified = true) {
  const response = await fetch(`${base}:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token(who, verified)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  const text = await response.text(); assert.equal(response.status, expected, `${who} COMMIT: ${text}`); return JSON.parse(text);
}
const data = (who = email) => ({ email: who, uid: who, name: 'Applicant', organization: 'Org', requestReason: 'Work', status: 'pending', active: false });
const times = ['createdAt', 'requestedAt', 'updatedAt'];
await read(`authEmailAccess/${email}`, email, 404);
await read(`authEmailAccess/${email}`, other, 403);
await read(`authEmailAccess/${email}`, null, 403);
await commit(email, [write('authEmailAccess', email, data(), times)], 403, false);
await commit(email, [write('authEmailAccess', other, data(other), times)], 403);
await commit('member@chula.ac.th', [write('authEmailAccess', 'member@chula.ac.th', data('member@chula.ac.th'), times)], 403);
await commit(email, [write('authEmailAccess', email, { ...data(), active: true }, times)], 403);
await commit(email, [write('authEmailAccess', email, { ...data(), status: 'approved' }, times)], 403);
await commit(email, [write('authAccessRequests', email, data(), times)], 403);
await commit(email, [write('authEmailAccess', email, data(), times)]);
await commit(email, [write('authEmailAccess', email, data(), times)], 403);
await read(`authEmailAccess/${email}`, other, 403);
await read(`authEmailAccess/${email}`, admin, 200);
const decision = (who, status, extra = {}) => ({
  update: { name: `${root}/authEmailAccess/${who}`, fields: fields({ status, active: status === 'approved', reviewedBy: admin, reviewReason: 'Reviewed', ...extra }) },
  updateMask: { fieldPaths: ['status', 'active', 'reviewedBy', 'reviewReason', ...Object.keys(extra)] },
  updateTransforms: [{ fieldPath: 'reviewedAt', setToServerValue: 'REQUEST_TIME' }]
});
await commit(admin, [decision(email, 'approved')], 403); // No active grant without a valid interval.
const interval = { startsAt: new Date(Date.now()-60000), endsAt: new Date(Date.now()+3600000) };
await commit(email, [decision(email, 'approved', interval)], 403);
await commit(admin, [decision(email, 'approved', interval)]);
await read(`authEmailAccess/${email}`, email, 200);
await commit(email, [write('authEmailAccess', email, data(), times)], 403);
const head = 'head@chula.ac.th';
await commit(admin, [write('staffProfiles', head, { role: '0' })]);
await commit(other, [write('authEmailAccess', other, data(other), times)]);
await read(`authEmailAccess/${other}`, head, 200);
await commit(head, [decision(other, 'rejected')]);
await commit(other, [write('authEmailAccess', other, data(other), times)], 403);
const expired = 'expired@example.com';
const old = { email: expired, status: 'approved', active: true, createdAt: new Date('2026-01-01T00:00:00Z'), startsAt: new Date(Date.now()-120000), endsAt: new Date(Date.now()-60000) };
await commit(admin, [write('authEmailAccess', expired, old)]);
await commit(expired, [write('authEmailAccess', expired, { ...old, ...data(expired) }, ['requestedAt','updatedAt'])]);
await commit(expired, [decision(expired,'approved',interval)], 403);
await commit(admin, [write('authEmailAccess', 'active@example.com', { email:'active@example.com', status:'approved', active:true, ...interval })]);
await commit('active@example.com', [write('authEmailAccess','active@example.com',data('active@example.com'),times)],403);
console.log('Unified access rules: verified owner application, head-only decisions, valid grant intervals, duplicate prevention, expired grant application, and frozen legacy collection passed.');
