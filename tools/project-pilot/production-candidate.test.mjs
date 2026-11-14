import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { validateProductionCandidate, sha256, loadProductionCandidate } from './production-candidate.mjs';
import { calculateMoney } from './finance.mjs';
import { createPreflightServer } from './preflight-server.mjs';
function fixture() {
  const project = { id: 'YEAR68:3:SOURCE', code: 'SOURCE', responsibleColumn: 'AI', accountId: null,
    statuses: { H: 'อนุมัติโครงการ', Q: '', Y: '', AZ: '', BA: '' },
    formulaInputs: { version: 1, hasLoanDocument: false, advanceRate: '80', transferDirection: null }, money: { O: 10000, V: null, AJ: 2000 } };
  project.money = calculateMoney(project);
  const snapshot = { schemaVersion: 1, year: 2568, readOnly: true, automationEnabled: false, sourceSha256: 'a'.repeat(64),
    projects: [project], totals: Object.fromEntries(Object.entries(project.money).map(([k,v]) => [k,v ?? 0])), verification: { projectCount: 1, moneyMismatchCount: 0 }, moneyLabels: { O: 'งบอนุมัติ' } };
  const raw = Buffer.from(JSON.stringify(snapshot, null, 2));
  const manifest = { schemaVersion: 1, academicYear: 2568, purpose: 'production-candidate', status: 'awaiting-review', activated: false, writesPerformed: false,
    sourceKind: 'reviewed-original-xlsx', sourceSha256: snapshot.sourceSha256, snapshotSha256: sha256(raw), trialDataImported: false,
    assignments: [], grants: [], pendingRequests: [], audit: [], projectCount: 1, totals: snapshot.totals };
  return { raw, manifest };
}
test('rejects altered data, trial source and injected assignments before loading', () => {
  const f = fixture(); assert.equal(validateProductionCandidate(f.raw, f.manifest).snapshot.projects.length, 1);
  for (const patch of [{ trialDataImported: true }, { sourceKind: 'trial-backup' }, { assignments: ['person'] }, { academicYear: 2569 }, { activated: true }]) {
    assert.throws(() => validateProductionCandidate(f.raw, { ...f.manifest, ...patch }));
  }
  assert.throws(() => validateProductionCandidate(Buffer.from(f.raw.toString().replace('10000','10001')), f.manifest));
});
test('loader rechecks bytes and does not return cached candidate after corruption', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'candidate-loader-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const f = fixture();
  await writeFile(path.join(directory, 'snapshot.json'), f.raw);
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(f.manifest));
  await loadProductionCandidate(directory);
  await writeFile(path.join(directory, 'snapshot.json'), '{}');
  await assert.rejects(loadProductionCandidate(directory));
});
test('candidate API checks login before reading, rechecks after reading, and forbids writes', async t => {
  const f = fixture(), candidate = validateProductionCandidate(f.raw, f.manifest);
  let reads = 0, checks = 0, revoke = false;
  const server = createPreflightServer({ check: async header => {
    checks++;
    if (header !== 'Bearer verified' || (revoke && checks % 2 === 0)) throw Object.assign(Error('denied'), { status: 403 });
    return { authenticated: true, email: 'head@example.test' };
  }, loadCandidate: async () => { reads++; return candidate; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/candidate`;
  assert.equal((await fetch(url)).status, 403); assert.equal(reads, 0);
  checks = 0;
  const response = await fetch(url, { headers: { Authorization: 'Bearer verified' } });
  assert.equal(response.status, 200); const body = await response.json();
  assert.equal(body.projectCount, 1); assert.equal(body.activated, false); assert.equal(body.projects, undefined);
  assert.equal(checks, 2); assert.equal(reads, 1);
  revoke = true; checks = 0;
  assert.equal((await fetch(url, { headers: { Authorization: 'Bearer verified' } })).status, 403);
  assert.equal((await fetch(url, { method: 'POST' })).status, 405);
});
