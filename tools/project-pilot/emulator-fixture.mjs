import { randomUUID } from 'node:crypto';
import { createEmulatorIdentity } from './firebase-identity.mjs';
export async function createLoginFixture(year, suffix = randomUUID(), { retain = false } = {}) {
  const identity = createEmulatorIdentity(), users = {}, credentials = {};
  for (const [key, role, name] of [['head', 'head', 'เหรัญญิก Emulator'], ['secretary', 'secretary', 'เลขานุการ Emulator'], ['assistantA', 'assistant', 'ผู้ช่วย A Emulator'], ['assistantB', 'assistant', 'ผู้ช่วย B Emulator']]) {
    const email = `${key.toLowerCase()}-${suffix}@example.test`, password = 'Local-trial-12345';
    let account;
    if (retain) {
      try { account = await identity.auth.getUserByEmail(email); }
      catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    }
    const existed = Boolean(account);
    account ||= await identity.auth.createUser({ email, password });
    users[account.uid] = { id: account.uid, role, name };
    credentials[key] = { email, password, uid: account.uid };
    if (!existed) await identity.grantRef(account.uid, year).set({ uid: account.uid, academicYear: year, active: true, projectRole: role });
  }
  return { identity, users, credentials, close: async () => {
    if (!retain) for (const uid of Object.keys(users)) { await identity.grantRef(uid, year).delete(); await identity.auth.deleteUser(uid); }
    await identity.close();
  } };
}
