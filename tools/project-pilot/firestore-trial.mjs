import { createHash } from 'node:crypto';
import { createFinanceTrial } from './finance-trial.mjs';
import { assertProjectEmulators } from './firebase-identity.mjs';
import { PilotError } from './model.mjs';
import { materializeCheckpoint } from './history-storage.mjs';
import { createFirestoreBackup } from './firestore-backup.mjs';
import { isDeepStrictEqual } from 'node:util';
import { serializeTrialWrite } from './write-queue.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const requireThat = (ok, status, message) => { if (!ok) throw new PilotError(status, message); };
export async function createFirestoreTrial({ snapshot, identity, users, academicYear, trialId = 'year68-local', seed = null, onRead = () => {}, storageCollection = 'projectTrials' }) {
  assertProjectEmulators();
  if (!['projectTrials', 'projectCandidates'].includes(storageCollection)) throw new Error('Invalid isolated storage collection');
  if (!/^[a-zA-Z0-9_-]+$/.test(trialId)) throw new Error('Invalid trial ID');
  const registry = structuredClone(users), db = identity.db;
  const root = db.collection(storageCollection).doc(trialId), projects = root.collection('projects');
  const overviewRef = root.collection('views').doc('overview-v1'), events = root.collection('audit');
  const read = async (tx, ref, kind) => {
    const result = await tx.get(ref); onRead({ kind, documents: result.docs ? result.docs.length : result.exists ? 1 : 0 }); return result;
  };
  const sources = new Map(snapshot.projects.map(p => [p.id.replace(/^YEAR68:/, 'TEST68:'), p]));
  const subset = id => {
    const p = sources.get(id); requireThat(p, 404, 'ไม่พบโครงการ');
    return { ...snapshot, projects: [p], totals: Object.fromEntries(Object.entries(p.money).map(([k, v]) => [k, v ?? 0])), verification: { ...snapshot.verification, projectCount: 1 } };
  };
  const modelFor = (id, saved) => {
    const model = createFinanceTrial(subset(id), { users: registry }); if (saved) model.importState(saved); return model;
  };
  const refFor = id => projects.doc(hash(id));
  const packed = state => {
    const payload = JSON.stringify(state);
    // Never truncate history silently or approach Firestore's document-size limit.
    requireThat(Buffer.byteLength(payload) < 750_000, 409, 'ข้อมูลปัจจุบันของโครงการเกินขนาดชุดทดลอง');
    return { payload, assignee: state.data.projects[0].trialAssignee, projectId: state.data.projects[0].id };
  };
  const signature = hash({ snapshot, users: registry, academicYear });
  await db.runTransaction(async tx => {
    const meta = await tx.get(root);
    if (meta.exists) {
      requireThat(meta.data().status !== 'restoring', 409, 'ชุดนี้กู้คืนยังไม่ครบ กรุณากู้ลงชุดใหม่');
      requireThat(meta.data().signature === signature, 409, 'ชุดทดลองไม่ตรงกับข้อมูลหรือทะเบียนบัญชีที่บันทึกไว้');
    }
    else tx.create(root, { signature, academicYear });
  });
  const rowFor = state => {
    const p = state.data.projects[0];
    return { id: p.id, assignee: p.trialAssignee, money: p.money, pending: state.requests.some(r => r.state === 'pending') };
  };
  const packOverview = (rows, sequence) => {
    const payload = JSON.stringify(rows);
    requireThat(Buffer.byteLength(payload) < 750_000, 409, 'ข้อมูลสรุปเกินขนาดชุดทดลอง');
    return { payload, sequence, version: 1 };
  };
  // Start-up migration is resumable: archive first, then replace checkpoints.
  // Run with the previous server stopped so it cannot write the old format.
  if ((await root.get()).data().storageVersion !== 2) {
    await root.update({ status: 'migrating' });
    const stored = await projects.get(), indexed = await events.orderBy('sequence').get();
    const archivedRequests = await root.collection('requests').get();
    const history = indexed.docs.map(doc => JSON.parse(doc.data().payload));
    const requestHistory = archivedRequests.docs.filter(doc => doc.data().payload).map(doc => JSON.parse(doc.data().payload));
    const existing = new Map(stored.docs.map(doc => { const state = JSON.parse(doc.data().payload); return [state.data.projects[0].id, state]; }));
    const states = [];
    for (const id of sources.keys()) {
      let state = existing.get(id);
      if (state?.schemaVersion === 2) state = materializeCheckpoint(subset(id), registry, state, requestHistory, history);
      const model = modelFor(id, state);
      if (!state && seed) {
        state = model.exportState();
        const p = seed.projects.find(p => p.id === id); requireThat(p, 409, 'Migration project missing');
        state.data.projects = [p]; state.data.totals = Object.fromEntries(Object.entries(p.money).map(([k, v]) => [k, v ?? 0]));
        state.requests = seed.requests.filter(r => r.projectId === id); state.audit = seed.audit.filter(a => a.projectId === id);
        model.importState(state);
      }
      states.push(model.exportState());
    }
    const allEvents = states.flatMap(state => state.audit);
    const position = new Map(history.map((event, i) => [event.id, i]));
    allEvents.sort((a, b) => position.has(a.id) && position.has(b.id) ? position.get(a.id) - position.get(b.id) : a.at.localeCompare(b.at));
    const archiveWrites = allEvents.map((event, i) => [events.doc(event.id), { projectId: event.projectId, sequence: i + 1, payload: JSON.stringify(event) }]);
    for (const state of states) for (const request of state.requests) archiveWrites.push([root.collection('requests').doc(request.id), { projectId: request.projectId, payload: JSON.stringify(request) }]);
    const flush = async writes => {
      for (let i = 0; i < writes.length; i += 200) { const batch = db.batch(); for (const [ref, data] of writes.slice(i, i + 200)) batch.set(ref, data); await batch.commit(); }
    };
    await flush(archiveWrites);
    await flush(states.map(state => [refFor(state.data.projects[0].id), packed(modelFor(state.data.projects[0].id, state).exportCompactState())]));
    const batch = db.batch();
    batch.set(overviewRef, packOverview(states.map(rowFor), allEvents.length));
    batch.update(root, { storageVersion: 2, status: 'ready' }); await batch.commit();
  }
  const grant = async (tx, uid) => {
    const data = (await read(tx, identity.grantRef(uid, academicYear), 'grant')).data();
    requireThat(data?.active === true && data.uid === uid && data.academicYear === academicYear &&
      Object.hasOwn(registry, uid) && registry[uid].role === data.projectRole, 403, 'สิทธิ์ส่วนโครงการถูกเปลี่ยนหรือถอนแล้ว');
    return registry[uid];
  };
  const recentFor = async (tx, actor, rows) => {
    let recent = [];
    if (actor.role !== 'assistant') recent = (await read(tx, events.orderBy('sequence', 'desc').limit(50), 'audit')).docs.map(doc => doc.data());
    else for (let i = 0; i < rows.length; i += 30) {
      const ids = rows.slice(i, i + 30).map(row => row.id);
      recent.push(...(await read(tx, events.where('projectId', 'in', ids).orderBy('sequence', 'desc').limit(50), 'audit')).docs.map(doc => doc.data()));
    }
    recent.sort((a, b) => b.sequence - a.sequence);
    return recent.slice(0, 50).reverse().map(event => JSON.parse(event.payload));
  };
  return {
    async history(uid) {
      return db.runTransaction(async tx => {
        const actor = await grant(tx, uid);
        const rows = actor.role === 'assistant' ? JSON.parse((await read(tx, overviewRef, 'overview')).data().payload).filter(row => row.assignee === uid) : [];
        return { audit: await recentFor(tx, actor, rows) };
      });
    },
    async backup(uid) {
      return db.runTransaction(async tx => {
        const actor = await grant(tx, uid); requireThat(actor.role === 'head', 403, 'เฉพาะเหรัญญิกดาวน์โหลดชุดสำรอง');
        const stored = await read(tx, projects, 'backup-project');
        const indexed = await read(tx, events.orderBy('sequence'), 'backup-audit');
        const archived = await read(tx, root.collection('requests'), 'backup-request');
        const history = indexed.docs.map(doc => { const event = JSON.parse(doc.data().payload); requireThat(doc.id === event.id && doc.data().projectId === event.projectId, 409, 'ประวัติไม่ตรงกับข้อมูลโครงการ'); return event; });
        const requests = archived.docs.map(doc => { const request = JSON.parse(doc.data().payload); requireThat(doc.id === request.id && doc.data().projectId === request.projectId, 409, 'คำขอไม่ตรงกับข้อมูลโครงการ'); return request; });
        const checkpoints = stored.docs.map(doc => { const state = JSON.parse(doc.data().payload); return materializeCheckpoint(subset(state.data.projects[0].id), registry, state, requests, history); });
        requireThat(requests.length === checkpoints.reduce((n, state) => n + state.requests.length, 0), 409, 'คำขออ้างอิงโครงการไม่ถูกต้อง');
        const auditOrder = history.map(event => event.id);
        return createFirestoreBackup({ createdAt: new Date().toISOString(), trialId, academicYear, source: snapshot, users: registry, checkpoints, auditOrder });
      });
    },
    async query(uid, params = new URLSearchParams(), { includeAudit = true } = {}) {
      return db.runTransaction(async tx => {
        const actor = await grant(tx, uid);
        const overview = (await read(tx, overviewRef, 'overview')).data();
        const rows = JSON.parse(overview.payload).filter(row => actor.role !== 'assistant' || row.assignee === uid);
        const q = (params.get('q') || '').trim().slice(0, 200).toLocaleLowerCase('th-TH'), reviewer = params.get('reviewer');
        const requestedOffset = Number(params.get('offset') || 0), offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
        const matched = rows.filter(row => {
          const p = sources.get(row.id);
          return (reviewer === null || String(p.responsibleName ?? '') === reviewer) && [p.code, p.name, p.organization, p.responsibleName].some(value => String(value).toLocaleLowerCase('th-TH').includes(q));
        });
        const pageIds = matched.slice(offset, offset + 25).map(row => row.id);
        const needed = [...new Set([...pageIds, ...rows.filter(row => row.pending).map(row => row.id)])];
        const views = new Map();
        for (const id of needed) {
          const saved = (await read(tx, refFor(id), 'project')).data();
          requireThat(saved, 409, 'ข้อมูลโครงการไม่ครบ');
          views.set(id, modelFor(id, JSON.parse(saved.payload)).query(uid));
        }
        const recent = includeAudit ? await recentFor(tx, actor, rows) : [];
        const totals = values => Object.fromEntries(Object.keys(snapshot.totals).map(col => [col, values.reduce((sum, money) => sum + (money[col] ?? 0), 0)]));
        const template = createFinanceTrial(snapshot, { users: registry }).query(uid, params);
        const projectsOnPage = pageIds.map(id => views.get(id).projects[0]);
        const reviewers = new Map();
        for (const row of rows) { const name = String(sources.get(row.id).responsibleName ?? ''); reviewers.set(name, (reviewers.get(name) || 0) + 1); }
        return { ...template, revision: `overview-${overview.sequence}`, storage: 'firestore-emulator',
          totalCount: rows.length, matchedCount: matched.length, offset, projects: projectsOnPage,
          totals: totals(rows.map(row => row.money)), originalTotals: totals(rows.map(row => sources.get(row.id).money)),
          verification: { ...snapshot.verification, projectCount: rows.length },
          reviewers: [...reviewers].map(([name, projectCount]) => ({ name, projectCount, accountMapped: false })),
          projectStatusPermissions: Object.fromEntries(pageIds.map(id => [id, views.get(id).projectStatusPermissions[id]])),
          requests: [...views.values()].flatMap(view => view.requests), audit: recent, auditLoaded: includeAudit };
      });
    },
    async mutate(uid, action, body) {
      requireThat(!['reset', 'restore'].includes(action), 400, 'ไม่รองรับการล้างหรือกู้คืนด้วย API นี้');
      body = structuredClone(body);
      const schedule = ['preview', 'status-preview'].includes(action) ? work => work() : work => serializeTrialWrite(storageCollection === 'projectTrials' ? trialId : `${storageCollection}/${trialId}`, work);
      return schedule(() => db.runTransaction(async tx => {
        await grant(tx, uid);
        let id = body?.projectId;
        if (['approve', 'reject'].includes(action)) {
          requireThat(typeof body?.requestId === 'string' && /^[0-9a-f-]{36}$/.test(body.requestId), 400, 'คำขอไม่ถูกต้อง');
          id = (await read(tx, root.collection('requests').doc(body.requestId), 'request')).data()?.projectId;
        }
        requireThat(sources.has(id), 404, 'ไม่พบโครงการ');
        const ref = refFor(id), stored = await read(tx, refFor(id), 'project'); requireThat(stored.exists, 404, 'ไม่พบโครงการ');
        const previous = JSON.parse(stored.data().payload), model = modelFor(id, previous);
        if (action === 'assign' && body.assignee !== null) {
          const assignee = await grant(tx, body.assignee); requireThat(assignee.role === 'assistant', 400, 'เลือกบัญชีผู้ช่วยเท่านั้น');
        }
        if (action === 'approve') {
          const request = previous.requests.find(r => r.id === body.requestId);
          if (request) await grant(tx, request.proposer);
        }
        const result = model.mutate(uid, action, body);
        if (['preview', 'status-preview'].includes(action)) return result;
        const overview = (await read(tx, overviewRef, 'overview')).data();
        const rows = JSON.parse(overview.payload), delta = model.exportIncremental(), next = delta.checkpoint;
        const index = rows.findIndex(row => row.id === id); requireThat(index >= 0, 409, 'ข้อมูลสรุปไม่ครบ'); rows[index] = rowFor(next);
        const added = delta.events;
        tx.set(overviewRef, packOverview(rows, overview.sequence + added.length));
        for (const [i, event] of added.entries()) tx.create(events.doc(event.id), { projectId: id, sequence: overview.sequence + i + 1, payload: JSON.stringify(event) });
        tx.set(ref, packed(next));
        for (const request of delta.requests) if (!isDeepStrictEqual(previous.requests.find(r => r.id === request.id), request)) tx.set(root.collection('requests').doc(request.id), { projectId: id, payload: JSON.stringify(request) });
        return { ...result, savedInMemory: false, savedInFirestoreEmulator: true };
      }));
    }
  };
}
