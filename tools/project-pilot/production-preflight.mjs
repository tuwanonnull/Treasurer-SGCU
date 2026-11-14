import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { ProjectIdentityError } from './project-identity.mjs';
export const PRODUCTION_PROJECT = 'departmentwebsite-5aec1';
const HEAD_EMAIL = '6534324223@student.chula.ac.th';
const fail = (status, message) => { throw new ProjectIdentityError(status, message); };

// Read-only readiness check. A successful login is never an activation grant.
export function createProductionPreflight({ verifyToken, getUser, readGrant }) {
  return async authorization => {
    if (typeof authorization !== 'string' || !/^Bearer [^\s]+$/.test(authorization)) fail(401, 'กรุณาเข้าสู่ระบบ');
    let token, user;
    try {
      token = await verifyToken(authorization.slice(7), true);
      if (!token?.uid || token.aud !== PRODUCTION_PROJECT || token.iss !== `https://securetoken.google.com/${PRODUCTION_PROJECT}`) throw new Error('Wrong project');
      user = await getUser(token.uid);
    } catch { fail(401, 'บัญชีหรือการเข้าสู่ระบบใช้ไม่ได้แล้ว'); }
    if (user.uid !== token.uid || user.disabled || !user.emailVerified || !token.email_verified ||
        user.email?.toLowerCase() !== HEAD_EMAIL || token.email?.toLowerCase() !== HEAD_EMAIL) {
      fail(403, 'ระยะแรกเปิดตรวจความพร้อมเฉพาะเหรัญญิกปี 2568');
    }
    const grant = await readGrant(token.uid);
    const grantReady = grant?.uid === token.uid && grant.academicYear === 2568 && grant.active === true && grant.projectRole === 'head';
    return { id: token.uid, academicYear: 2568, email: HEAD_EMAIL, authenticated: true, grantReady,
      activated: false, dataReady: false, mode: 'preflight-only',
      message: grantReady ? 'ยืนยันบัญชีและพบสิทธิ์แล้ว เปิดหน้าใช้งานโครงการที่ http://127.0.0.1:4189' : 'ยืนยันบัญชีแล้ว ยังไม่ได้เปิดสิทธิ์ใช้งานปี 2568' };
  };
}

export function assertProductionEnvironment(env = process.env) {
  if (env.GCLOUD_PROJECT !== PRODUCTION_PROJECT || Object.keys(env).some(k => /EMULATOR/.test(k) && env[k])) {
    throw new Error('Explicit production project without emulator overrides required');
  }
}
export function createProductionPreflightAdapter({ useFirebaseCli = false } = {}) {
  assertProductionEnvironment();
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const { initializeApp, applicationDefault, deleteApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  let credential = applicationDefault();
  if (useFirebaseCli) {
    // Explicit local-only opt-in, matching the existing read-production-staff workflow.
    const repo = fileURLToPath(new URL('../../', import.meta.url));
    if (JSON.parse(readFileSync(path.join(repo, '.firebaserc'), 'utf8')).projects.default !== PRODUCTION_PROJECT) throw new Error('Wrong repository project');
    const cli = require(path.join(process.env.FIREBASE_TOOLS_DIR || path.resolve(path.dirname(process.execPath), '../lib/node_modules/firebase-tools'), 'lib/auth.js'));
    const account = cli.getProjectDefaultAccount(repo.replace(/\/$/, ''));
    if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI sign-in required');
    credential = { async getAccessToken() {
      const t = await cli.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
      return { access_token: t.access_token, expires_in: Math.max(60, Math.floor((t.expires_at - Date.now()) / 1000) || 3000) };
    } };
  }
  const app = initializeApp({ projectId: PRODUCTION_PROJECT, credential }, `preflight-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  return {
    auth, credential,
    check: createProductionPreflight({ verifyToken: (token, revoked) => auth.verifyIdToken(token, revoked),
      getUser: uid => auth.getUser(uid),
      readGrant: async uid => {
        const token = await credential.getAccessToken();
        const url = new URL(`https://firestore.googleapis.com/v1/projects/${PRODUCTION_PROJECT}/databases/(default)/documents/projectAccess/2568/members/${encodeURIComponent(uid)}`);
        for (const field of ['uid', 'academicYear', 'active', 'projectRole']) url.searchParams.append('mask.fieldPaths', field);
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15000) });
        if (response.status === 404) return undefined;
        if (!response.ok) throw new Error('Grant read failed');
        const f = (await response.json()).fields || {};
        return { uid: f.uid?.stringValue, academicYear: f.academicYear?.integerValue === undefined ? undefined : Number(f.academicYear.integerValue),
          active: f.active?.booleanValue, projectRole: f.projectRole?.stringValue };
      } }),
    close: async () => { await deleteApp(app); }
  };
}
