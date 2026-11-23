import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizePushRequest, pushErrorResponse } from '../push-http.js';
function fixture() {
  const calls = [];
  const headers = { authorization: 'Bearer valid', 'X-Firebase-AppCheck': 'attested' };
  const req = { method: 'POST', body: {}, get: name => headers[name], is: type => type === 'application/json' };
  const deps = {
    enforceAppCheck: true,
    verifyAppCheck: async token => { assert.equal(token, 'attested'); calls.push('app'); },
    verifyIdToken: async (token, revoked) => { assert.equal(token, 'valid'); assert.equal(revoked, true); calls.push('auth'); return { uid: 'user' }; },
    consumeQuota: async (uid, action) => { assert.equal(uid, 'user'); assert.equal(action, 'test'); calls.push('quota'); }
  };
  return { req, deps, calls, headers };
}
test('checks App Check and revoked ID tokens before consuming account quota', async () => {
  const f = fixture();
  assert.equal((await authorizePushRequest(f.req, 'test', f.deps)).uid, 'user');
  assert.deepEqual(f.calls, ['app', 'auth', 'quota']);
  f.calls.length = 0; f.deps.enforceAppCheck = false;
  await authorizePushRequest(f.req, 'test', f.deps);
  assert.deepEqual(f.calls, ['auth', 'quota']);
});
test('rejects bad methods, oversized bodies, App Check failures and revoked sessions before quota', async () => {
  for (const [change, reason] of [
    [f => { f.req.method = 'GET'; }, 'method-not-allowed'],
    [f => { f.req.is = () => false; }, 'invalid-content-type'],
    [f => { f.req.rawBody = Buffer.alloc(8193); }, 'invalid-request-size'],
    [f => { f.deps.verifyAppCheck = async () => { throw Error('bad'); }; }, 'app-check-required'],
    [f => { f.headers.authorization = 'Bearer bad extra'; }, 'unauthenticated'],
    [f => { f.deps.verifyIdToken = async () => { throw Error('revoked'); }; }, 'unauthenticated']
  ]) {
    const f = fixture(); change(f);
    await assert.rejects(authorizePushRequest(f.req, 'test', f.deps), { message: reason });
    assert.ok(!f.calls.includes('quota'));
  }
});
test('propagates quota failures with retry delay, hides internal details', async () => {
  const f = fixture();
  f.deps.consumeQuota = async () => { throw Object.assign(Error('rate-limited'), { retryAfter: 42 }); };
  await assert.rejects(authorizePushRequest(f.req, 'test', f.deps), e => {
    assert.deepEqual(pushErrorResponse(e), { status: 429, error: 'rate-limited', retryAfter: '42' }); return true;
  });
  assert.deepEqual(pushErrorResponse(Error('private upstream URL')), { status: 500, error: 'internal-error', retryAfter: null });
});
