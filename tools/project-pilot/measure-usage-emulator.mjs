import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createLoginFixture } from './emulator-fixture.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createFirestoreTrial } from './firestore-trial.mjs';

const source = JSON.parse(await readFile(process.argv[2], 'utf8'));
const fixture = await createLoginFixture(2568), trialId = `usage-${randomUUID()}`;
let active = null;
const uid = key => fixture.credentials[key].uid;
const db = fixture.identity.db;
const measuredIdentity = { ...fixture.identity, db: {
  collection: db.collection.bind(db), batch: db.batch.bind(db),
  async runTransaction(update, options) {
    let committedWrites = 0;
    const result = await db.runTransaction(async tx => {
      if (active) active.transactionAttempts++;
      let writes = 0;
      const proxy = new Proxy(tx, { get(target, key) {
        const value = target[key];
        if (['set', 'create', 'update', 'delete'].includes(key)) return (...args) => { writes++; value.apply(target, args); return proxy; };
        return typeof value === 'function' ? value.bind(target) : value;
      } });
      const response = await update(proxy); committedWrites = writes; return response;
    }, options);
    if (active) active.committedWrites += committedWrites;
    return result;
  }
} };
try {
  // A mature page: 50 visible audit events, not the deceptively cheap empty trial.
  const model = createFinanceTrial(source, { users: fixture.users });
  for (let i = 0; i < 55; i++) {
    const p = model.query(uid('head')).projects[0];
    model.mutate(uid('head'), 'commit', { projectId: p.id, version: p.version, changes: { O: String(1000 + i) }, reason: 'ประวัติสำหรับวัดการใช้งาน' });
  }
  let p = model.query(uid('head')).projects[0];
  model.mutate(uid('head'), 'assign', { projectId: p.id, version: p.version, assignee: uid('assistantA'), reason: '' });
  const initial = model.exportState();
  const store = await createFirestoreTrial({ snapshot: source, identity: measuredIdentity, users: fixture.users, academicYear: 2568, trialId,
    seed: { projects: initial.data.projects, requests: initial.requests, audit: initial.audit },
    onRead: event => { if (active) { active.returnedDocuments += event.documents; active.documentReadEstimate += Math.max(1, event.documents); } }
  });
  const tokens = {};
  for (const key of ['head', 'secretary', 'assistantA']) {
    const response = await fetch('http://127.0.0.1:9197/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fixture.credentials[key].email, password: fixture.credentials[key].password, returnSecureToken: true })
    });
    assert.equal(response.status, 200); tokens[key] = (await response.json()).idToken;
  }
  // Match the HTTP server: resolve() reads a grant once before store transaction.
  const api = async (key, action, body) => {
    await fixture.identity.resolve(`Bearer ${tokens[key]}`, 2568);
    if (active) { active.apiRequests++; active.documentReadEstimate++; active.returnedDocuments++; }
    return action === 'query' ? store.query(uid(key), new URLSearchParams(), { includeAudit: false }) : action === 'history' ? store.history(uid(key)) : action === 'backup' ? store.backup(uid(key)) : store.mutate(uid(key), action, body);
  };
  const results = [];
  const measure = async (name, work) => {
    active = { name, apiRequests: 0, returnedDocuments: 0, documentReadEstimate: 0, committedWrites: 0, transactionAttempts: 0 };
    await work(); results.push(active); active = null;
  };
  await measure('head_overview_25_projects_no_history_fetch', () => api('head', 'query'));
  await measure('assistant_overview_1_project_no_history_fetch', () => api('assistantA', 'query'));
  await measure('head_load_50_history_on_demand', () => api('head', 'history'));
  p = (await store.query(uid('head'))).projects[0];
  await measure('head_edit_money_preview_commit_refresh', async () => {
    const body = { projectId: p.id, version: p.version, changes: { O: '2000' } };
    await api('head', 'preview', body); await api('head', 'commit', { ...body, reason: 'วัดการแก้เงิน' }); await api('head', 'query');
  });
  p = (await store.query(uid('head'))).projects[0];
  let request;
  await measure('secretary_propose_preview_submit_refresh', async () => {
    const body = { projectId: p.id, version: p.version, changes: { O: '3000' } };
    await api('secretary', 'preview', body); request = await api('secretary', 'propose', { ...body, reason: 'วัดการเสนอเงิน' }); await api('secretary', 'query');
  });
  await measure('head_approve_refresh', async () => {
    await api('head', 'approve', { requestId: request.requestId, version: p.version }); await api('head', 'query');
  });
  p = (await store.query(uid('assistantA'))).projects[0];
  await measure('assistant_status_preview_commit_refresh', async () => {
    const body = { projectId: p.id, version: p.version, field: 'Q', value: p.statuses.Q === 'ผู้ช่วยตรวจสอบ' ? 'องค์กรกำลังดำเนินการ' : 'ผู้ช่วยตรวจสอบ' };
    await api('assistantA', 'status-preview', body); await api('assistantA', 'status', { ...body, reason: '' }); await api('assistantA', 'query');
  });
  await measure('head_backup_full_history', () => api('head', 'backup'));
  assert.equal(results[0].documentReadEstimate, 28);
  assert.equal(results.find(r => r.name.startsWith('head_edit')).committedWrites, 3);
  assert.equal(results.find(r => r.name.startsWith('secretary_propose')).committedWrites, 4);
  assert.equal(results.find(r => r.name.startsWith('head_approve')).committedWrites, 4);
  const headEdit = results.find(r => r.name.startsWith('head_edit'));
  const scenarios = [1, 23, 34].flatMap(people => [50, 200, 500].map(actionsPerDay => ({
    scope: people === 1 ? 'whole_team' : 'per_person', people: people === 1 ? null : people, actionsPerDay,
    documentReadsPerDay: people * actionsPerDay * headEdit.documentReadEstimate,
    documentWritesPerDay: people * actionsPerDay * headEdit.committedWrites,
    note: 'Illustration using head money-edit workflow per action, not measured team mix or peak bound'
  })));
  console.log(JSON.stringify({ measuredAt: new Date().toISOString(), projectCount: source.projects.length, results, scenarios,
    exclusions: ['initialization and seed', 'login requests', 'other existing app usage', 'index-entry billing', 'storage and network charges', 'API hosting and Auth charges', 'production retries/contention'],
    interpretation: 'Document estimates include API grant reads and a minimum one read per store get/query; writes count successful transaction writes. Emulator is not a billing meter.' }, null, 2));
} finally {
  await db.recursiveDelete(db.collection('projectTrials').doc(trialId)); await fixture.close();
}
