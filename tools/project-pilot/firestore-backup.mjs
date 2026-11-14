import { createHash, randomUUID } from 'node:crypto';
import { createFinanceTrial } from './finance-trial.mjs';
import { validateYear68Snapshot } from './year68.mjs';
import { assertProjectEmulators } from './firebase-identity.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const subset = (source, project) => ({ ...source, projects: [project], totals: Object.fromEntries(Object.entries(project.money).map(([k, v]) => [k, v ?? 0])), verification: { ...source.verification, projectCount: 1 } });
export function createFirestoreBackup(payload) {
  const bundle = { format: 'SGCU-firestore-trial-backup', version: 1, checksum: hash(payload), payload: structuredClone(payload) };
  validateFirestoreBackup(bundle); return bundle;
}
export function validateFirestoreBackup(bundle) {
  if (bundle?.format !== 'SGCU-firestore-trial-backup' || bundle.version !== 1 || bundle.checksum !== hash(bundle.payload)) throw new Error('Invalid Firestore backup or checksum');
  const payload = structuredClone(bundle.payload), { source, users, academicYear, checkpoints, auditOrder } = payload;
  validateYear68Snapshot(source);
  if (!Number.isFinite(Date.parse(payload.createdAt)) || academicYear !== source.year || !/^[a-zA-Z0-9_-]+$/.test(payload.trialId) ||
      !users || typeof users !== 'object' || Array.isArray(users) || !Array.isArray(checkpoints) || checkpoints.length !== source.projects.length || !Array.isArray(auditOrder)) throw new Error('Invalid backup metadata');
  const states = new Map(); const events = new Map(); const requestIds = new Set();
  for (const state of checkpoints) {
    const id = state?.data?.projects?.[0]?.id;
    if (!id || states.has(id)) throw new Error('Duplicate or missing backup project'); states.set(id, state);
  }
  for (const project of source.projects) {
    const state = states.get(project.id.replace(/^YEAR68:/, 'TEST68:'));
    if (state?.schemaVersion !== 1) throw new Error('Backup must contain complete history');
    const model = createFinanceTrial(subset(source, project), { users }); model.importState(state);
    for (const event of state.audit) {
      if (events.has(event.id)) throw new Error('Duplicate audit identity'); events.set(event.id, event);
    }
    for (const request of state.requests) {
      if (requestIds.has(request.id)) throw new Error('Duplicate request identity'); requestIds.add(request.id);
    }
  }
  if (new Set(auditOrder).size !== events.size || auditOrder.length !== events.size || auditOrder.some(id => !events.has(id))) throw new Error('Incomplete backup audit order');
  return payload;
}

export async function restoreFirestoreBackup({ bundle, identity, trialId, storageCollection = 'projectTrials' }) {
  assertProjectEmulators();
  if (!['projectTrials', 'projectCandidates'].includes(storageCollection)) throw new Error('Invalid isolated storage collection');
  if (!/^[a-zA-Z0-9_-]+$/.test(trialId)) throw new Error('Invalid destination trial ID');
  const payload = validateFirestoreBackup(bundle), { source, users, academicYear, auditOrder } = payload;
  const checkpoints = payload.checkpoints;
  const order = new Map(source.projects.map((p, i) => [p.id.replace(/^YEAR68:/, 'TEST68:'), i]));
  checkpoints.sort((a, b) => order.get(a.data.projects[0].id) - order.get(b.data.projects[0].id));
  // Rotate versions; only pending requests that were current remain current.
  for (const state of checkpoints) {
    const p = state.data.projects[0], oldVersion = p.version; p.version = randomUUID(); state.revision = randomUUID();
    for (const request of state.requests) if (request.state === 'pending' && request.baseVersion === oldVersion) request.baseVersion = p.version;
  }
  const rows = checkpoints.map(state => {
    const p = state.data.projects[0]; return { id: p.id, assignee: p.trialAssignee, money: p.money, pending: state.requests.some(r => r.state === 'pending') };
  });
  const compact = checkpoints.map(state => {
    const project = source.projects.find(p => p.id === state.data.projects[0].sourceId);
    const model = createFinanceTrial(subset(source, project), { users }); model.importState(state); return model.exportCompactState();
  });
  const overviewPayload = JSON.stringify(rows);
  if (Buffer.byteLength(overviewPayload) >= 750_000 || compact.some(state => Buffer.byteLength(JSON.stringify(state)) >= 750_000)) throw new Error('Backup exceeds supported trial size');
  const root = identity.db.collection(storageCollection).doc(trialId);
  // create() refuses any existing root, including an interrupted recovery.
  await root.create({ signature: hash({ snapshot: source, users, academicYear }), academicYear, status: 'restoring',
    recovery: { fromTrialId: payload.trialId, checksum: bundle.checksum, backupAt: payload.createdAt, restoredAt: new Date().toISOString() } });
  const writes = [], events = new Map();
  for (const state of checkpoints) {
    const p = state.data.projects[0];
    writes.push([root.collection('projects').doc(hash(p.id)), { payload: JSON.stringify(compact[order.get(p.id)]), assignee: p.trialAssignee, projectId: p.id }]);
    for (const request of state.requests) writes.push([root.collection('requests').doc(request.id), { projectId: p.id, payload: JSON.stringify(request) }]);
    for (const event of state.audit) events.set(event.id, event);
  }
  for (const [i, id] of auditOrder.entries()) { const event = events.get(id); writes.push([root.collection('audit').doc(id), { projectId: event.projectId, sequence: i + 1, payload: JSON.stringify(event) }]); }
  for (let offset = 0; offset < writes.length; offset += 200) {
    const batch = identity.db.batch(); for (const [ref, data] of writes.slice(offset, offset + 200)) batch.create(ref, data); await batch.commit();
  }
  const batch = identity.db.batch();
  batch.create(root.collection('views').doc('overview-v1'), { payload: overviewPayload, sequence: auditOrder.length, version: 1 });
  batch.update(root, { status: 'ready', storageVersion: 2 }); await batch.commit();
  return { trialId, projects: checkpoints.length, requests: checkpoints.reduce((sum, state) => sum + state.requests.length, 0), audit: auditOrder.length };
}
