import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createLoginFixture } from './emulator-fixture.mjs';
import { createFirestoreTrial } from './firestore-trial.mjs';
import { createFinanceTrial } from './finance-trial.mjs';

const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
assert.ok(snapshot.projects.length > 25);
const fixture = await createLoginFixture(2568), trialId = `overview-${randomUUID()}`;
let reads = [];
const options = { snapshot, identity: fixture.identity, users: fixture.users, academicYear: 2568, trialId, onRead: event => reads.push(event) };
const uid = key => fixture.credentials[key].uid;
const counts = () => Object.fromEntries(['grant', 'overview', 'project', 'audit'].map(kind => [kind, reads.filter(r => r.kind === kind).reduce((sum, r) => sum + r.documents, 0)]));
try {
  const store = await createFirestoreTrial(options);
  reads = []; const first = await store.query(uid('head'));
  assert.equal(first.totalCount, snapshot.projects.length);
  assert.deepEqual(first.totals, snapshot.totals);
  assert.deepEqual(counts(), { grant: 1, overview: 1, project: 25, audit: 0 });
  const initialCounts = counts();
  const offset = Math.floor((snapshot.projects.length - 1) / 25) * 25;
  reads = []; const last = await store.query(uid('head'), new URLSearchParams({ offset: String(offset) }));
  assert.equal(counts().project, snapshot.projects.length - offset);
  assert.deepEqual(last.totals, first.totals);
  const p = last.projects.at(-1);
  const proposal = await store.mutate(uid('secretary'), 'propose', { projectId: p.id, version: p.version, changes: { O: '123.45' }, reason: 'ทดสอบคำขอนอกหน้าที่เปิด' });
  reads = []; const withPending = await store.query(uid('head'));
  assert.equal(withPending.requests.find(r => r.id === proposal.requestId)?.state, 'pending');
  assert.equal(counts().project, 26);
  assert.deepEqual(withPending.totals, first.totals);
  await store.mutate(uid('head'), 'approve', { requestId: proposal.requestId, version: p.version });
  reads = []; const approved = await store.query(uid('head'));
  assert.equal(counts().project, 25);
  assert.equal(approved.totals.O, snapshot.totals.O - (p.money.O ?? 0) + 12345);
  assert.equal(approved.audit.at(-1).action, 'approve');
  const latest = (await store.query(uid('head'), new URLSearchParams({ offset: String(offset) }))).projects.at(-1);
  await store.mutate(uid('head'), 'assign', { projectId: p.id, version: latest.version, assignee: uid('assistantA'), reason: '' });
  reads = []; const assistant = await store.query(uid('assistantA'));
  assert.equal(assistant.totalCount, 1); assert.equal(counts().project, 1);
  assert.equal(assistant.totals.O, 12345);
  assert.ok(assistant.audit.every(a => a.projectId === p.id));
  reads = []; const empty = await store.query(uid('assistantB'));
  assert.equal(empty.totalCount, 0); assert.equal(counts().project, 0); assert.equal(counts().audit, 0);
  assert.equal(empty.totals.O, 0); assert.deepEqual(empty.audit, []); assert.deepEqual(empty.requests, []);
  await store.mutate(uid('head'), 'assign', { projectId: p.id, version: assistant.projects[0].version, assignee: uid('assistantB'), reason: '' });
  assert.equal((await store.query(uid('assistantA'))).totalCount, 0);
  assert.equal((await store.query(uid('assistantB'))).totals.O, 12345);
  reads = []; const search = await store.query(uid('head'), new URLSearchParams({ q: 'NO-SUCH-PROJECT-xyz-987654321' }));
  assert.equal(search.matchedCount, 0); assert.equal(counts().project, 0);
  assert.equal(search.totals.O, approved.totals.O); assert.ok(search.audit.length);
  const restarted = await createFirestoreTrial(options);
  assert.deepEqual((await restarted.query(uid('head'))).totals, approved.totals);
  // Migration of a long history must cap reads, never truncate stored history.
  const historicalSource = { ...snapshot, projects: snapshot.projects.slice(0, 2), verification: { ...snapshot.verification, projectCount: 2 } };
  historicalSource.totals = Object.fromEntries(Object.keys(snapshot.totals).map(col => [col, historicalSource.projects.reduce((sum, p) => sum + (p.money[col] ?? 0), 0)]));
  const historical = createFinanceTrial(historicalSource, { users: fixture.users });
  for (let i = 0; i < 60; i++) {
    const target = historical.query(uid('head')).projects[i % 2];
    historical.mutate(uid('head'), 'commit', { projectId: target.id, version: target.version, changes: { O: String(1000 + i) }, reason: 'ทดสอบประวัติย้อนหลัง' });
  }
  const historyId = `${trialId}-history`;
  try {
    const history = await createFirestoreTrial({ ...options, snapshot: historicalSource, trialId: historyId, seed: historical.query(uid('head')) });
    reads = []; const page = await history.query(uid('head'));
    assert.equal(page.audit.length, 50); assert.equal(counts().audit, 50); assert.equal(counts().project, 2);
    const originalEvents = historical.query(uid('head')).audit;
    // Timestamp ties retain per-project sequence; all returned events still map exactly to history.
    assert.ok(page.audit.every(a => originalEvents.some(b => b.id === a.id)));
    const stored = await fixture.identity.db.collection('projectTrials').doc(historyId).collection('projects').get();
    assert.equal(stored.docs.reduce((sum, doc) => sum + JSON.parse(doc.data().payload).audit.length, 0), 0);
    const indexEvents = await fixture.identity.db.collection('projectTrials').doc(historyId).collection('audit').get();
    assert.equal(indexEvents.size, 60);
    reads = []; const noHistory = await history.query(uid('head'), new URLSearchParams(), { includeAudit: false });
    assert.equal(noHistory.auditLoaded, false); assert.deepEqual(noHistory.audit, []); assert.equal(counts().audit, 0);
    reads = []; const loadedHistory = await history.history(uid('head'));
    assert.deepEqual(loadedHistory.audit, page.audit); assert.equal(counts().project, 0); assert.equal(counts().audit, 50);
  } finally { await fixture.identity.db.recursiveDelete(fixture.identity.db.collection('projectTrials').doc(historyId)); }
  console.log(JSON.stringify({ result: 'PASS', projects: snapshot.projects.length, firstPageDocuments: initialCounts, checks: 'page limit, last page, pending outside page, atomic totals, reassignment and scoped audit, empty search, restart, last 50 history reads preserve all 60 events' }));
} finally {
  await fixture.identity.db.recursiveDelete(fixture.identity.db.collection('projectTrials').doc(trialId)); await fixture.close();
}
