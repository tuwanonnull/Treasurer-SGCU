import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const str = value => ({ stringValue: value });
const flag = value => ({ booleanValue: value });
export function planAccessMigration(grants, requests, now = Date.now()) {
  const targets = new Map(grants.map(doc => [doc.name.split('/').at(-1), doc]));
  const sources = new Map(requests.map(doc => [doc.name.split('/').at(-1), doc]));
  const writes = [], conflicts = [];
  for (const email of new Set([...targets.keys(), ...sources.keys()])) {
    const grant = targets.get(email), request = sources.get(email);
    if ((grant?.fields.email?.stringValue || email) !== email || (request?.fields.email?.stringValue || email) !== email || email !== email.trim().toLowerCase()) {
      conflicts.push('Email/document identity mismatch'); continue;
    }
    const fields = { ...grant?.fields, email: str(email) };
    if (request) {
      const old = request.fields, status = old.status?.stringValue;
      if (!['pending', 'approved', 'rejected'].includes(status)) { conflicts.push('Unknown request status'); continue; }
      if (grant?.fields.requestedAt) { conflicts.push('Target already contains an application'); continue; }
      const validGrant = fields.active?.booleanValue && Date.parse(fields.endsAt?.timestampValue) > now;
      if (validGrant && status !== 'approved') { conflicts.push('Live or scheduled grant conflicts with unresolved/rejected request'); continue; }
      fields.status = str(status);
      if (status !== 'approved' || !grant) fields.active = flag(false);
      for (const key of ['uid', 'name', 'organization', 'reviewedAt', 'reviewedBy', 'reviewReason']) if (old[key]) fields[key] = old[key];
      if (old.reason) fields.requestReason = old.reason;
      if (old.createdAt) fields.requestedAt = old.createdAt;
      fields.createdAt ||= old.createdAt;
      fields.updatedAt ||= old.reviewedAt || old.createdAt;
      // Preserve all legacy fields in the same record for a lossless migration.
      fields.legacyApplication = { mapValue: { fields: old } };
    } else {
      fields.status ||= str('approved');
    }
    const name = grant?.name || request.name.replace('/authAccessRequests/', '/authEmailAccess/');
    if (JSON.stringify(fields) !== JSON.stringify(grant?.fields)) writes.push({ update: { name, fields }, currentDocument: grant ? { updateTime: grant.updateTime } : { exists: false } });
    if (request) writes.push({ delete: request.name, currentDocument: { updateTime: request.updateTime } });
  }
  return { writes, conflicts, summary: { existingAccess: grants.length, legacyRequests: requests.length, unifiedRecords: new Set([...targets.keys(), ...sources.keys()]).size, writes: writes.length, conflicts: conflicts.length } };
}

async function main() {
  const args = process.argv.slice(2);
  const project = args[args.indexOf('--project') + 1];
  if (project !== 'departmentwebsite-5aec1') throw Error('Specify --project departmentwebsite-5aec1');
  const apply = args.includes('--apply');
  const root = path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'firebase-tools/lib');
  const require = createRequire(import.meta.url);
  const { configstore } = require(path.join(root, 'configstore.js'));
  await require(path.join(root, 'requireAuth.js')).requireAuth({ project, user: configstore.get('user'), tokens: configstore.get('tokens') });
  const { Client } = require(path.join(root, 'apiv2.js'));
  const api = new Client({ auth: true, apiVersion: 'v1', urlPrefix: 'https://firestore.googleapis.com' });
  const base = `projects/${project}/databases/(default)/documents`;
  async function list(collection) {
    let pageToken, documents = [];
    do {
      const response = await api.get(`${base}/${collection}`, { queryParams: { pageSize: 300, ...(pageToken ? { pageToken } : {}) }, skipLog: { resBody: true } });
      documents.push(...(response.body.documents || [])); pageToken = response.body.nextPageToken;
    } while (pageToken);
    return documents;
  }
  const [grants, requests] = await Promise.all([list('authEmailAccess'), list('authAccessRequests')]);
  const plan = planAccessMigration(grants, requests);
  const dir = path.resolve('.local/auth-access-migration');
  await fs.mkdir(dir, { recursive: true });
  const backup = path.join(dir, `${new Date().toISOString().replaceAll(':', '-')}.json`);
  await fs.writeFile(backup, JSON.stringify({ project, grants, requests, plan }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...plan.summary, backup }));
  if (plan.conflicts.length) throw Error('Migration conflicts; no writes performed. Inspect the local backup.');
  if (!apply || !plan.writes.length) return;
  if (plan.writes.length > 450) throw Error('Too many writes for the atomic migration; no writes performed.');
  await api.post(`${base}:commit`, { writes: plan.writes }, { skipLog: { body: true, resBody: true } });
  const [afterGrants, afterRequests] = await Promise.all([list('authEmailAccess'), list('authAccessRequests')]);
  if (afterRequests.length || afterGrants.length !== plan.summary.unifiedRecords) throw Error('Post-migration count mismatch; inspect backup and live records.');
  const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a.localeCompare(b))) : item);
  const after = new Map(afterGrants.map(doc => [doc.name, doc.fields]));
  for (const write of plan.writes) if (write.update) {
    if (canonical(after.get(write.update.name) || {}) !== canonical(write.update.fields)) throw Error('Post-migration data mismatch');
  }
  console.log('Migration verified: one collection, all planned fields preserved, legacy collection empty.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
