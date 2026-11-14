import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionPreflight, assertProductionEnvironment, PRODUCTION_PROJECT } from './production-preflight.mjs';
import { createPreflightServer } from './preflight-server.mjs';
const email = '6534324223@student.chula.ac.th';
function fixture() {
  const state = { token: { uid: 'head', aud: PRODUCTION_PROJECT, iss: `https://securetoken.google.com/${PRODUCTION_PROJECT}`, email, email_verified: true }, user: { uid: 'head', email, emailVerified: true, disabled: false }, grant: undefined, reads: 0 };
  state.check = createProductionPreflight({ verifyToken: async (token, revoked) => { assert.equal(token, 'signed'); assert.equal(revoked, true); if (state.revoked) throw Error('revoked'); return state.token; }, getUser: async () => state.user, readGrant: async () => { state.reads++; if (state.down) throw Error('offline'); return state.grant; } });
  return state;
}
test('verified head login does not grant access or activate data; grant is reread', async () => {
  const s = fixture();
  assert.equal((await s.check('Bearer signed')).grantReady, false);
  s.grant = { uid: 'head', academicYear: 2568, active: true, projectRole: 'head' };
  const result = await s.check('Bearer signed');
  assert.equal(result.grantReady, true); assert.equal(result.activated, false); assert.equal(result.dataReady, false);
  s.grant.active = false; assert.equal((await s.check('Bearer signed')).grantReady, false);
  assert.equal(s.reads, 3);
  s.down = true; await assert.rejects(s.check('Bearer signed'), /offline/);
});
test('rejects other accounts, disabled/unverified accounts, forged project and revoked token before grant read', async () => {
  for (const change of [s => s.user.email = '6740193226@student.chula.ac.th', s => s.user.email = 'tuwanon.kimchiang@gmail.com', s => s.user.disabled = true, s => s.user.emailVerified = false, s => s.token.email_verified = false, s => s.token.aud = 'demo-project-pilot', s => s.token.iss = 'bad', s => s.user.uid = 'other', s => s.revoked = true]) {
    const s = fixture(); change(s); await assert.rejects(s.check('Bearer signed')); assert.equal(s.reads, 0);
  }
  await assert.rejects(fixture().check('head'), { status: 401 });
});
test('production guard refuses emulator overrides and implicit project', () => {
  assert.throws(() => assertProductionEnvironment({}));
  assert.throws(() => assertProductionEnvironment({ GCLOUD_PROJECT: PRODUCTION_PROJECT, FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9197' }));
  assert.doesNotThrow(() => assertProductionEnvironment({ GCLOUD_PROJECT: PRODUCTION_PROJECT }));
});
test('HTTP refuses mutations, trial routes and cross-origin requests; no token echoed', async t => {
  const s = fixture(), server = createPreflightServer(s);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/readiness')).status, 401);
  const response = await fetch(base + '/api/readiness', { headers: { Authorization: 'Bearer signed' } });
  assert.equal(response.status, 200); assert.equal((await response.text()).includes('signed'), false);
  assert.equal((await fetch(base + '/api/readiness', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/api/readiness', { headers: { Origin: 'https://other.test' } })).status, 403);
  assert.equal((await fetch(base + '/api/year68/trial')).status, 404);
  assert.equal((await fetch(base + '/')).status, 200);
});
