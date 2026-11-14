import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createFinanceTrial } from './finance-trial.mjs';
import { PilotError } from './model.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const backupPattern = /^backup-[0-9T-]+-[0-9a-f-]{36}\.json$/;
const requireThat = (ok, status, message) => { if (!ok) throw new PilotError(status, message); };
function pack(payload) { return JSON.stringify({ schemaVersion: 1, checksum: hash(JSON.stringify(payload)), payload }); }
function unpack(text) {
  const envelope = JSON.parse(text);
  if (envelope.schemaVersion !== 1 || envelope.checksum !== hash(JSON.stringify(envelope.payload))) throw new Error('Checkpoint checksum mismatch');
  return envelope.payload;
}
function readPrivate(file) {
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 100 * 1024 * 1024) throw new Error('Unsafe or oversized checkpoint');
  return fs.readFileSync(file, 'utf8');
}
function atomicWrite(file, text) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(fd, text); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

export function createPersistentFinanceTrial(snapshot, directory, { restoreBackup = null } = {}) {
  const dir = path.resolve(directory);
  if (fs.existsSync(path.join(dir, '.restore-incomplete'))) throw new Error('Restore incomplete; retry backup recovery in a new directory');
  const repo = fileURLToPath(new URL('../../', import.meta.url));
  if (dir === repo.slice(0, -1) || dir.startsWith(repo)) throw new Error('Keep private trial data outside the repository');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(dir).isSymbolicLink()) throw new Error('Storage directory must not be a symlink');
  fs.chmodSync(dir, 0o700);
  const realDir = fs.realpathSync(dir), realRepo = fs.realpathSync(repo);
  if (realDir === realRepo || realDir.startsWith(realRepo + path.sep)) throw new Error('Keep private trial data outside the repository');
  const lock = path.join(dir, 'writer.lock'); const owner = randomUUID();
  if (fs.existsSync(lock)) {
    const previous = JSON.parse(readPrivate(lock));
    if (!Number.isSafeInteger(previous.pid) || previous.pid <= 0) throw new Error('Invalid writer lock; inspect before recovery');
    try { process.kill(previous.pid, 0); throw new Error('Trial storage is already in use'); }
    catch (error) { if (error.code === 'ESRCH') fs.unlinkSync(lock); else throw error; }
  }
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, owner }), { flag: 'wx', mode: 0o600 });
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    if (fs.existsSync(lock) && JSON.parse(readPrivate(lock)).owner === owner) fs.unlinkSync(lock);
  };
  const file = path.join(dir, 'state.json');
  const names = () => fs.readdirSync(dir).filter(name => backupPattern.test(name)).sort().reverse();
  const loadBackup = id => {
    requireThat(typeof id === 'string' && backupPattern.test(id), 400, 'รหัสชุดสำรองไม่ถูกต้อง');
    requireThat(fs.existsSync(path.join(dir, id)), 404, 'ไม่พบชุดสำรอง');
    return unpack(readPrivate(path.join(dir, id)));
  };
  function save(model) {
    requireThat(!closed, 503, 'ที่เก็บข้อมูลปิดแล้ว');
    const text = pack(model.exportState());
    if (fs.existsSync(file)) {
      const name = `backup-${new Date().toISOString().replace(/[:.Z]/g, '-')}-${randomUUID()}.json`;
      atomicWrite(path.join(dir, name), readPrivate(file));
    }
    atomicWrite(file, text); // Only after this succeeds may the in-memory model be replaced.
    // Retention failures do not invalidate an already committed state file.
    try { for (const name of names().slice(20)) { try { fs.unlinkSync(path.join(dir, name)); } catch { /* retry on next save */ } } } catch { /* already committed; retry retention later */ }
  }
  let model;
  try {
    model = createFinanceTrial(snapshot);
    if (restoreBackup !== null) { model.importState(loadBackup(restoreBackup), { recoveryId: restoreBackup }); save(model); }
    else if (fs.existsSync(file)) model.importState(unpack(readPrivate(file)));
    else save(model);
    if (!names().length) save(model); // Make the initial state recoverable before the first edit.
  } catch (error) { close(); throw error; }
  return {
    close,
    exportCheckpoint(actor) {
      requireThat(model.query(actor).user.role === 'head', 403, 'เฉพาะเหรัญญิกดาวน์โหลดชุดสำรอง');
      return model.exportState();
    },
    query(actor, params) {
      const state = model.query(actor, params);
      const backups = state.user.role === 'head' ? names().map(id => ({ id, at: fs.statSync(path.join(dir, id)).mtime.toISOString() })) : [];
      return { ...state, persistence: { enabled: true, retainedBackups: 20, backups } };
    },
    mutate(actor, action, body) {
      const current = model.query(actor); // Authorize before touching the filesystem.
      if (action === 'preview' || action === 'status-preview') return model.mutate(actor, action, body);
      const candidate = createFinanceTrial(snapshot);
      let result;
      if (action === 'restore') {
        requireThat(current.user.role === 'head', 403, 'เฉพาะเหรัญญิกกู้คืนชุดทดลอง');
        requireThat(body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).every(k => ['backupId', 'revision'].includes(k)), 400, 'คำขอมีช่องข้อมูลที่ไม่อนุญาต');
        requireThat(body.revision === current.revision, 409, 'ข้อมูลเปลี่ยนแล้ว โหลดข้อมูลล่าสุดก่อนกู้คืน');
        candidate.importState(loadBackup(body.backupId), { recoveryId: body.backupId });
        result = { sandboxOnly: true, restored: true };
      } else {
        candidate.importState(model.exportState());
        result = candidate.mutate(actor, action, body);
      }
      save(candidate); model = candidate;
      return { ...result, savedInMemory: false, savedToLocalFile: true };
    }
  };
}
