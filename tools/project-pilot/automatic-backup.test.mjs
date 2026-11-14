import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createAutomaticBackup, BACKUP_INTERVAL_MS, BACKUP_RETRY_MS } from './automatic-backup.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createFirestoreBackup } from './firestore-backup.mjs';
import { calculateMoney } from './finance.mjs';
import { USERS } from './model.mjs';
function bundle(at) {
  const p = { id: 'YEAR68:3:TEST', code: 'TEST', name: 'ทดสอบ', responsibleColumn: 'AI', responsibleName: '', accountId: null,
    statuses: { H: null, Q: null, Y: null, AZ: null, BA: null },
    formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: null }, money: { O: 10000, V: null, AJ: null } };
  p.money = calculateMoney(p);
  const source = { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false, projects: [p],
    verification: { projectCount: 1, moneyMismatchCount: 0 }, totals: Object.fromEntries(Object.entries(p.money).map(([k, v]) => [k, v ?? 0])), moneyLabels: { O: 'งบอนุมัติ' } };
  return createFirestoreBackup({ createdAt: new Date(at).toISOString(), trialId: 'test', academicYear: 2568, source, users: USERS,
    checkpoints: [createFinanceTrial(source).exportState()], auditOrder: [] });
}
async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sgcu-auto-backup-')); t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
test('automatic backup runs once, survives restart, retries failure and preserves last good kit', async t => {
  const directory = await fixture(t); let time = Date.parse('2026-11-14T00:00:00Z'), calls = 0, fail = false;
  const options = { directory, trialId: 'test', now: () => time, getBundle: async () => { calls++; if (fail) throw new Error('offline'); return bundle(time); } };
  const backup = await createAutomaticBackup(options);
  const first = backup.tick(); assert.equal(first, backup.tick()); await first;
  assert.equal(calls, 1); assert.equal(backup.status().overdue, false); assert.equal(backup.status().offsiteVerified, false);
  const initialSuccess = backup.status().lastSuccess;
  time += BACKUP_INTERVAL_MS - 1;
  const restarted = await createAutomaticBackup(options); await restarted.tick(); assert.equal(calls, 1);
  time++; fail = true; await restarted.tick(); assert.equal(calls, 2); assert.equal(restarted.status().failed, true);
  assert.equal(restarted.status().lastSuccess, initialSuccess);
  await restarted.tick(); assert.equal(calls, 2);
  time += BACKUP_RETRY_MS; fail = false; await restarted.tick(); assert.equal(calls, 3); assert.equal(restarted.status().failed, false);
  assert.equal((await readdir(path.join(directory, 'test'))).filter(name => name.startsWith('backup-')).length, 2);
  time += 24 * 60 * 60_000; assert.equal(restarted.status().overdue, true);
  await restarted.tick(); assert.equal(restarted.status().overdue, false);
});
test('damaged latest backup is not reported healthy after restart and is replaced without deletion', async t => {
  const directory = await fixture(t), time = Date.parse('2026-11-14T00:00:00Z'); let calls = 0;
  const options = { directory, trialId: 'test', now: () => time, getBundle: async () => { calls++; return bundle(time); } };
  await (await createAutomaticBackup(options)).tick();
  const kit = (await readdir(path.join(directory, 'test'))).find(name => name.startsWith('backup-'));
  await writeFile(path.join(directory, 'test', kit, 'backup.json'), '{}');
  const restarted = await createAutomaticBackup(options); assert.equal(restarted.status().failed, true); assert.equal(restarted.status().overdue, true);
  await restarted.tick(); assert.equal(calls, 2); assert.equal(restarted.status().failed, false);
  assert.equal((await readdir(path.join(directory, 'test'))).filter(name => name.startsWith('backup-')).length, 2);
});
test('disk failure and stale backup cannot claim successful protection', async t => {
  const directory = await fixture(t), time = Date.parse('2026-11-14T00:00:00Z');
  await writeFile(path.join(directory, 'not-a-folder'), 'blocked');
  const disk = await createAutomaticBackup({ directory: path.join(directory, 'not-a-folder'), trialId: 'test', now: () => time, getBundle: async () => bundle(time) });
  await disk.tick(); assert.equal(disk.status().failed, true); assert.equal(disk.status().lastSuccess, null);
  const stale = await createAutomaticBackup({ directory, trialId: 'test', now: () => time, getBundle: async () => bundle(time - 600000) });
  await stale.tick(); assert.equal(stale.status().failed, true); assert.equal(stale.status().overdue, true);
});
