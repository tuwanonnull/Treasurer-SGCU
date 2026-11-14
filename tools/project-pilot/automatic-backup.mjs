import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createRecoveryKit, verifyRecoveryKit, readBackup } from './recovery-kit.mjs';

export const BACKUP_INTERVAL_MS = 12 * 60 * 60_000;
export const BACKUP_RETRY_MS = 60 * 60_000;
const MAX_AGE_MS = 24 * 60 * 60_000;
export async function createAutomaticBackup({ directory, trialId, getBundle, now = Date.now, onFailure = () => {} }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(trialId)) throw new Error('Invalid trial ID');
  const folder = path.join(directory, trialId), stateFile = path.join(folder, 'status.json');
  let state = { lastAttempt: null, backupAt: null, lastSuccess: null, kit: null, failed: false }, running = null;
  try {
    const saved = JSON.parse(await readFile(stateFile, 'utf8'));
    if (saved.kit && /^backup-[a-zA-Z0-9-]+$/.test(saved.kit)) {
      const kit = path.join(folder, saved.kit);
      const verified = await verifyRecoveryKit(path.join(kit, 'manifest.json'), path.join(kit, 'backup.json'));
      const { bundle } = await readBackup(path.join(kit, 'backup.json'));
      if (bundle.payload.trialId !== trialId || !Number.isFinite(Date.parse(saved.lastSuccess)) || Date.parse(saved.lastSuccess) > now() || Date.parse(verified.backupAt) > now()) throw new Error('Invalid saved backup');
      state = { lastAttempt: saved.lastAttempt, lastSuccess: saved.lastSuccess, kit: saved.kit, backupAt: verified.backupAt, failed: saved.failed === true };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') { state.failed = true; onFailure('ตรวจชุดสำรองล่าสุดไม่ผ่าน จะสร้างชุดใหม่'); }
  }
  const status = () => {
    const age = state.backupAt ? now() - Date.parse(state.backupAt) : Infinity;
    return { enabled: true, storage: 'local-only', intervalHours: 12, lastSuccess: state.lastSuccess,
      backupAt: state.backupAt, failed: state.failed, overdue: age >= MAX_AGE_MS, running: Boolean(running),
      offsiteVerified: false, requiresRunningServer: true };
  };
  const persist = async () => {
    const temp = path.join(folder, `.status-${randomUUID()}.tmp`);
    try { await writeFile(temp, JSON.stringify(state), { mode: 0o600, flag: 'wx' }); await rename(temp, stateFile); }
    finally { await rm(temp, { force: true }); }
  };
  async function perform() {
    state.lastAttempt = new Date(now()).toISOString();
    let input;
    try {
      await mkdir(folder, { recursive: true, mode: 0o700 });
      const bundle = await getBundle();
      const created = Date.parse(bundle?.payload?.createdAt);
      if (bundle?.payload?.trialId !== trialId || !Number.isFinite(created) || created > now() || now() - created > 5 * 60_000) throw new Error('Backup is not fresh or has wrong scope');
      const id = randomUUID(), kit = `backup-${new Date(now()).toISOString().replace(/[:.]/g, '-')}-${id}`;
      input = path.join(folder, `.input-${id}.json`);
      await writeFile(input, JSON.stringify(bundle), { mode: 0o600, flag: 'wx' });
      await createRecoveryKit(input, path.join(folder, kit));
      await verifyRecoveryKit(path.join(folder, kit, 'manifest.json'), path.join(folder, kit, 'backup.json'));
      const previous = state;
      state = { lastAttempt: state.lastAttempt, lastSuccess: new Date(now()).toISOString(), backupAt: bundle.payload.createdAt, kit, failed: false };
      try { await persist(); } catch (error) { state = previous; throw error; }
    } catch {
      state.failed = true;
      onFailure('สำรองอัตโนมัติไม่สำเร็จ ตรวจพื้นที่จัดเก็บและสิทธิ์เหรัญญิก');
      try { await persist(); } catch { /* In-memory warning remains visible even if disk cannot be written. */ }
    } finally { if (input) await rm(input, { force: true }).catch(() => {}); }
    return status();
  }
  const tick = () => {
    if (running) return running;
    const attempt = Date.parse(state.lastAttempt), backup = Date.parse(state.backupAt);
    if (state.failed && Number.isFinite(attempt) && now() >= attempt && now() - attempt < BACKUP_RETRY_MS) return Promise.resolve(status());
    if (!state.failed && Number.isFinite(backup) && now() >= backup && now() - backup < BACKUP_INTERVAL_MS) return Promise.resolve(status());
    running = perform().finally(() => { running = null; }); return running;
  };
  return { tick, status, async idle() { if (running) await running; } };
}
