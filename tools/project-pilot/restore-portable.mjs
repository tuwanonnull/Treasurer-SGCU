import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validatePortableBackup } from './portable-backup.mjs';
import { createFinanceTrial } from './finance-trial.mjs';

export function restorePortableBackup(bundle, destination) {
  const started = performance.now();
  const validated = validatePortableBackup(bundle);
  const target = path.resolve(destination), parent = fs.realpathSync(path.dirname(target));
  const repo = fs.realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
  if (parent === repo || parent.startsWith(repo + path.sep)) throw new Error('Restore private data outside the repository');
  const absent = () => { try { fs.lstatSync(target); } catch (error) { if (error.code === 'ENOENT') return; throw error; } throw new Error('Destination already exists; use a new directory'); };
  absent();
  const model = createFinanceTrial(validated.source);
  model.importState(validated.checkpoint, { recoveryId: `portable-${validated.createdAt}` });
  const payload = model.exportState();
  const envelope = { schemaVersion: 1, checksum: createHash('sha256').update(JSON.stringify(payload)).digest('hex'), payload };
  const staging = fs.mkdtempSync(path.join(parent, '.sgcu-restore-'));
  function write(name, data) {
    const fd = fs.openSync(path.join(staging, name), 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(data)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  try {
    write('snapshot.json', validated.source); write('state.json', envelope);
    // Reserve a new destination; never replace an existing directory, even if created during verification.
    fs.mkdirSync(target, { mode: 0o700 });
    const incomplete = path.join(target, '.restore-incomplete');
    fs.writeFileSync(incomplete, 'Portable restore has not completed', { flag: 'wx', mode: 0o600 });
    try {
      fs.renameSync(path.join(staging, 'snapshot.json'), path.join(target, 'snapshot.json'));
      fs.renameSync(path.join(staging, 'state.json'), path.join(target, 'state.json'));
      fs.unlinkSync(incomplete);
    } catch (error) { throw new Error(`Restore incomplete; keep the backup and retry in a different new directory: ${error.message}`); }
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
  return { destination: target, projectCount: payload.data.projects.length, requests: payload.requests.length,
    auditEvents: payload.audit.length, elapsedMs: Math.round(performance.now() - started), sourceBackupAt: validated.createdAt };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) throw new Error('Usage: node tools/project-pilot/restore-portable.mjs /path/backup.json /path/new-directory');
  const input = process.argv[2], info = fs.lstatSync(input);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 100 * 1024 * 1024) throw new Error('Backup must be a regular file no larger than 100 MiB');
  console.log(JSON.stringify(restorePortableBackup(JSON.parse(fs.readFileSync(input, 'utf8')), process.argv[3])));
}
