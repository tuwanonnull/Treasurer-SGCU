// Dependencies are passed in so the boundary can be tested without real tokens or sends.
export async function authorizePushRequest(req, action, { enforceAppCheck, verifyAppCheck, verifyIdToken, consumeQuota }) {
  if (req.method !== 'POST') throw new Error('method-not-allowed');
  if (!req.is('application/json')) throw new Error('invalid-content-type');
  if ((req.rawBody?.length || Buffer.byteLength(JSON.stringify(req.body || {}))) > 8192) throw new Error('invalid-request-size');
  if (enforceAppCheck) {
    try { await verifyAppCheck(req.get('X-Firebase-AppCheck') || ''); }
    catch { throw new Error('app-check-required'); }
  }
  const header = (req.get('authorization') || '').trim();
  if (!/^Bearer [^\s]+$/.test(header)) throw new Error('unauthenticated');
  let user;
  try { user = await verifyIdToken(header.slice(7), true); }
  catch { throw new Error('unauthenticated'); }
  await consumeQuota(user.uid, action);
  return user;
}

export function pushErrorResponse(error) {
  const message = error?.message || 'internal-error';
  const statuses = { 'unauthenticated': 401, 'app-check-required': 401, 'method-not-allowed': 405,
    'rate-limited': 429, 'device-limit-reached': 409, 'subscription-owner-conflict': 409 };
  const status = statuses[message] || (message.startsWith('invalid-') ? 400 : 500);
  return { status, error: status === 500 ? 'internal-error' : message,
    retryAfter: status === 429 ? String(error.retryAfter || 60) : null };
}
