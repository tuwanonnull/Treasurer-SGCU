import { createRequire } from 'node:module';
import { createProjectIdentityResolver } from './project-identity.mjs';

export const EMULATOR_PROJECT = 'demo-project-pilot';
export function assertProjectEmulators() {
  if (process.env.GCLOUD_PROJECT !== EMULATOR_PROJECT ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9197' ||
      process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8187') {
    throw new Error('Project pilot requires its isolated local Auth and Firestore emulators');
  }
}
export function createEmulatorIdentity() {
  // Check before loading the SDK or initializing any client; no production fallback.
  assertProjectEmulators();
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const { initializeApp, deleteApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ projectId: EMULATOR_PROJECT }, `project-identity-${crypto.randomUUID()}`);
  const auth = getAuth(app), db = getFirestore(app);
  const grantRef = (uid, academicYear) => db.collection('projectAccess').doc(String(academicYear)).collection('members').doc(uid);
  const resolve = createProjectIdentityResolver({
    verifyToken: (token, { checkRevoked }) => auth.verifyIdToken(token, checkRevoked),
    readGrant: async ({ uid, academicYear }) => (await grantRef(uid, academicYear).get()).data()
  });
  return { auth, db, grantRef, resolve, close: async () => { await db.terminate(); await deleteApp(app); } };
}
