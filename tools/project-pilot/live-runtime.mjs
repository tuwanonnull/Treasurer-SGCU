import { createRequire } from 'node:module';
import { createProjectAuthenticator } from '../../functions/project-live/auth.mjs';
import { createProductionPreflightAdapter, PRODUCTION_PROJECT } from './production-preflight.mjs';
// Server-only clients. Never serialize this object or expose its credential through HTTP.
export function createLiveRuntime({ useFirebaseCli = false } = {}) {
  const identity = createProductionPreflightAdapter({ useFirebaseCli });
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const { Firestore } = require('@google-cloud/firestore');
  const { AuthClient, GoogleAuth } = require('google-auth-library');
  class ExistingCredentialClient extends AuthClient {
    async getAccessToken() { return { token: (await identity.credential.getAccessToken()).access_token }; }
    async getRequestHeaders() { return { Authorization: `Bearer ${(await this.getAccessToken()).token}` }; }
  }
  const db = new Firestore({ projectId: PRODUCTION_PROJECT, auth: new GoogleAuth({ projectId: PRODUCTION_PROJECT, authClient: new ExistingCredentialClient() }) });
  return { db, auth: identity.auth, authenticate: createProjectAuthenticator(identity.auth),
    close: async () => { await db.terminate(); await identity.close(); } };
}
