import { filterLiveProjects } from './query-filters.mjs';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { createFinanceTrial } from './finance-trial.mjs';
import { materializeCheckpoint } from './history-storage.mjs';
import { acceptBaseline } from './approved-baseline.mjs';
import { sha256 } from './production-candidate.mjs';
import { PilotError } from './model.mjs';
const prefix = 'PROJECT68:';
const fail = (ok, status, text) => { if (!ok) throw new PilotError(status, text); };
const bounded = value => { const payload = JSON.stringify(value); fail(Buffer.byteLength(payload) < 750000, 409, 'ข้อมูลเกินขนาดที่รองรับ'); return { payload }; };
function context({ candidate, acceptance, users, datasetId, db }) {
  fail(isDeepStrictEqual(acceptance, acceptBaseline(candidate)), 400, 'ข้อมูลไม่ตรงกับต้นฉบับที่ยืนยัน');
  fail(/^year2568-[a-zA-Z0-9_-]{1,100}$/.test(datasetId), 400, 'รหัสชุดข้อมูลไม่ถูกต้อง');
  const registry = structuredClone(users), entries = Object.entries(registry);
  const heads = entries.filter(([,user]) => user.role === 'head');
  fail(heads.length === 1 && entries.every(([id,user]) => id === user.id && ['head','admin'].includes(user.role) && typeof user.name === 'string'),400,'ทะเบียนบัญชีโครงการไม่ถูกต้อง');
  const modelUsers = Object.fromEntries(entries.map(([id,user]) => [id,{...user,role:'head'}]));
  const snapshot = structuredClone(candidate.snapshot), root = db?.collection('projectDatasets').doc(datasetId);
  const sources = new Map(snapshot.projects.map(p => [p.id.replace(/^YEAR68:/, prefix), p]));
  const subset = id => {
    const p = sources.get(id); fail(p, 404, 'ไม่พบโครงการ');
    return { ...snapshot, projects: [p], totals: Object.fromEntries(Object.entries(p.money).map(([k,v]) => [k,v ?? 0])), verification: { ...snapshot.verification, projectCount: 1 } };
  };
  const model = (id, saved) => { const m = createFinanceTrial(subset(id), { users: modelUsers, projectIdPrefix: prefix }); if (saved) m.importState(saved); return m; };
  const signature = sha256(JSON.stringify({ snapshot, users: Object.fromEntries(heads), schema: 'live-head-v1' }));
  return { root, snapshot, registry, modelUsers, sources, subset, model, signature, headUid: heads[0][0],
    projectRef: id => root.collection('projects').doc(sha256(id)), overview: root?.collection('views').doc('overview'),
    grantRef: uid => db.collection('projectAccess').doc('2568').collection('members').doc(uid) };
}
export async function initializeLiveDataset(options) {
  const c = context(options), rows = [], batch = options.db.batch();
  for (const id of c.sources.keys()) {
    const state = c.model(id).exportCompactState();
    batch.create(c.projectRef(id), bounded(state));
    rows.push({ id, money: state.data.projects[0].money });
  }
  fail(rows.length + 2 <= 450, 400, 'ข้อมูลเกินขนาดการนำเข้าครั้งเดียว');
  batch.create(c.overview, { ...bounded(rows), sequence: 0 });
  batch.create(c.root, { schema: 'live-head-v1', signature: c.signature, academicYear: 2568, status: 'ready', active: false,
    headUid: c.headUid, projectCount: rows.length, sourceSha256: options.acceptance.sourceSha256, snapshotSha256: options.acceptance.snapshotSha256 });
  await batch.commit();
  return { datasetId: options.datasetId, projects: rows.length, active: false };
}
export async function createLiveStore(options) {
  const c = context(options), db = options.db;
  const metadata = (await c.root.get()).data();
  fail(metadata?.schema === 'live-head-v1' && metadata.signature === c.signature && metadata.status === 'ready', 409, 'ยังไม่มีชุดข้อมูลพร้อมใช้งานที่ตรงกับต้นฉบับ');
  const authorize = async (tx, uid) => {
    const [meta, grant, admin] = await Promise.all([tx.get(c.root), tx.get(c.grantRef(uid)), tx.get(db.collection('projectSystemAdmins').doc(uid))]);
    const m = meta.data(), g = grant.data(), a = admin.data();
    const isAdmin = c.registry[uid]?.role === 'admin' && a?.uid === uid && a.active === true && a.role === 'admin' && a.email === 'tuwanon.kimchiang@gmail.com';
    fail(m?.signature === c.signature && m.status === 'ready' && m.active === true && (isAdmin || (m.headUid === uid &&
      g?.uid === uid && g.active === true && g.academicYear === 2568 && g.projectRole === 'head' && g.datasetId === options.datasetId && uid === c.headUid)),
      403, 'บัญชีหรือชุดข้อมูลนี้ยังไม่เปิดใช้งาน หรือสิทธิ์ถูกถอนแล้ว');
    return isAdmin ? 'admin' : 'head';
  };
  return {
    async query(uid, params = new URLSearchParams()) {
      return db.runTransaction(async tx => {
        const role = await authorize(tx, uid);
        const overview = (await tx.get(c.overview)).data(); fail(overview, 409, 'ข้อมูลสรุปไม่ครบ');
        const rows = JSON.parse(overview.payload);
        const sources = rows.map(row => { const p = c.sources.get(row.id); fail(p, 409, 'ข้อมูลสรุปไม่ตรงกับต้นฉบับ'); return {...p, id: row.id}; });
        const {matched, offset, filterOptions} = filterLiveProjects(sources, params);
        const views = [];
        for (const row of matched.slice(offset, offset + 25)) {
          const saved = (await tx.get(c.projectRef(row.id))).data(); fail(saved, 409, 'ข้อมูลโครงการไม่ครบ');
          views.push(c.model(row.id, JSON.parse(saved.payload)).query(uid));
        }
        const template = createFinanceTrial(c.snapshot, { users: c.modelUsers, projectIdPrefix: prefix }).query(uid);
        return { ...template, storage: 'firestore-live', user: {...template.user,role}, sandboxOnly: false, datasetId: options.datasetId, revision: `live-${overview.sequence}`,
          totalCount: rows.length, matchedCount: matched.length, offset, filterOptions, projects: views.flatMap(v => v.projects),
          totals: Object.fromEntries(Object.keys(c.snapshot.totals).map(col => { const sum = rows.reduce((n,r) => n + BigInt(r.money[col] ?? 0), 0n); fail(sum <= 9007199254740991n && sum >= -9007199254740991n, 409, 'ยอดรวมเกินขอบเขต'); return [col, Number(sum)]; })),
          projectStatusPermissions: Object.assign({}, ...views.map(v => v.projectStatusPermissions)), requests: [], audit: [], auditLoaded: false };
      });
    },
    async mutate(uid, action, body) {
      fail(['preview', 'commit', 'status-preview', 'status'].includes(action), 400, 'ระยะแรกแก้ได้เฉพาะยอดและสถานะโดยเหรัญญิก');
      const input = structuredClone(body);
      return db.runTransaction(async tx => {
        await authorize(tx, uid);
        const id = input?.projectId; fail(c.sources.has(id), 404, 'ไม่พบโครงการ');
        const stored = (await tx.get(c.projectRef(id))).data(); fail(stored, 409, 'ข้อมูลโครงการไม่ครบ');
        const m = c.model(id, JSON.parse(stored.payload)), result = m.mutate(uid, action, input);
        if (['preview', 'status-preview'].includes(action)) return result;
        const overview = (await tx.get(c.overview)).data(), rows = JSON.parse(overview.payload);
        const index = rows.findIndex(row => row.id === id); fail(index >= 0, 409, 'ข้อมูลสรุปไม่ครบ');
        const delta = m.exportIncremental(); fail(delta.requests.length === 0, 409, 'พบคำขอนอกขอบเขตเริ่มใช้งาน');
        rows[index] = { id, money: delta.checkpoint.data.projects[0].money };
        tx.set(c.projectRef(id), bounded(delta.checkpoint));
        tx.set(c.overview, { ...bounded(rows), sequence: overview.sequence + delta.events.length });
        delta.events.forEach((event, i) => tx.create(c.root.collection('audit').doc(event.id), { sequence: overview.sequence + i + 1, projectId: id, ...bounded(event) }));
        return { ...result, savedInMemory: false, savedInFirestore: true };
      });
    },
    async history(uid) {
      return db.runTransaction(async tx => { await authorize(tx, uid); const events = await tx.get(c.root.collection('audit').orderBy('sequence', 'desc').limit(50)); return { audit: events.docs.map(d => JSON.parse(d.data().payload)).reverse() }; });
    },
    async backup(uid) {
      return db.runTransaction(async tx => {
        await authorize(tx, uid);
        const stored = await tx.get(c.root.collection('projects')), events = await tx.get(c.root.collection('audit').orderBy('sequence'));
        const audit = events.docs.map(d => JSON.parse(d.data().payload));
        const checkpoints = stored.docs.map(d => { const state = JSON.parse(d.data().payload); return materializeCheckpoint(c.subset(state.data.projects[0].id), c.modelUsers, state, [], audit, { projectIdPrefix: prefix }); });
        const payload = { datasetId: options.datasetId, createdAt: new Date().toISOString(), candidate: options.candidate, acceptance: options.acceptance, users: c.registry, checkpoints, auditOrder: audit.map(e => e.id) };
        const bundle = { format: 'SGCU-live-backup', version: 1, checksum: sha256(JSON.stringify(payload)), payload };
        validateLiveBackup(bundle); return bundle;
      });
    }
  };
}
export function validateLiveBackup(bundle) {
  fail(bundle?.format === 'SGCU-live-backup' && bundle.version === 1 && bundle.checksum === sha256(JSON.stringify(bundle.payload)), 400, 'ไฟล์สำรองใช้งานจริงไม่ถูกต้อง');
  const p = structuredClone(bundle.payload), c = context({ ...p, db: null });
  fail(Number.isFinite(Date.parse(p.createdAt)) && Array.isArray(p.checkpoints) && p.checkpoints.length === c.sources.size && Array.isArray(p.auditOrder), 400, 'สำรองข้อมูลไม่ครบ');
  const seen = new Set(), events = new Set();
  for (const state of p.checkpoints) {
    const id = state?.data?.projects?.[0]?.id; fail(!seen.has(id) && state.schemaVersion === 1, 400, 'โครงการสำรองซ้ำ');
    c.model(id, state); seen.add(id); fail(state.requests.length === 0, 400, 'คำขอนอกขอบเขตเริ่มใช้งาน');
    for (const event of state.audit) { fail(!events.has(event.id), 400, 'ประวัติซ้ำ'); events.add(event.id); }
  }
  fail(p.auditOrder.length === events.size && new Set(p.auditOrder).size === events.size && p.auditOrder.every(id => events.has(id)), 400, 'ลำดับประวัติไม่ครบ');
  return p;
}
export async function restoreLiveBackup({ bundle, db, datasetId }) {
  const p = validateLiveBackup(bundle), c = context({ ...p, db, datasetId });
  const rows = [], writes = [], eventById = new Map();
  for (const state of p.checkpoints) {
    const project = state.data.projects[0]; project.version = randomUUID(); state.revision = randomUUID();
    const m = c.model(project.id, state);
    rows.push({ id: project.id, money: project.money });
    writes.push([c.projectRef(project.id), bounded(m.exportCompactState())]);
    for (const event of state.audit) eventById.set(event.id, event);
  }
  // Preserve source page ordering even though Firestore returns documents by hashed ID.
  rows.sort((a,b) => [...c.sources.keys()].indexOf(a.id) - [...c.sources.keys()].indexOf(b.id));
  p.auditOrder.forEach((id,i) => { const e = eventById.get(id); writes.push([c.root.collection('audit').doc(id), { sequence: i+1, projectId: e.projectId, ...bounded(e) }]); });
  await c.root.create({ schema: 'live-head-v1', signature: c.signature, academicYear: 2568, status: 'restoring', active: false, headUid: c.headUid, projectCount: rows.length, recoveryChecksum: bundle.checksum });
  for (let i = 0; i < writes.length; i += 200) { const batch = db.batch(); for (const [ref, data] of writes.slice(i,i+200)) batch.create(ref,data); await batch.commit(); }
  const batch = db.batch(); batch.create(c.overview, { ...bounded(rows), sequence: p.auditOrder.length }); batch.update(c.root, { status: 'ready' }); await batch.commit();
  return { datasetId, active: false, projects: rows.length };
}
export async function verifyInactiveLiveDataset(options) {
  const c = context(options), meta = (await c.root.get()).data();
  fail(meta?.signature === c.signature && meta.status === 'ready' && meta.active === false,409,'ชุดข้อมูลไม่อยู่ในสถานะรอเปิดใช้');
  const docs = await c.root.collection('projects').get(), events = await c.root.collection('audit').get();
  const overview = (await c.overview.get()).data();
  fail(docs.size === c.sources.size && events.empty && overview?.sequence === 0,409,'ข้อมูลตั้งต้นไม่ครบหรือมีประวัติก่อนเปิดใช้');
  const rows = new Map(JSON.parse(overview.payload).map(row => [row.id,row]));
  fail(rows.size === c.sources.size,409,'ข้อมูลสรุปไม่ครบ');
  for (const doc of docs.docs) {
    const state = JSON.parse(doc.data().payload), p = state.data.projects[0], source = c.sources.get(p.id);
    c.model(p.id,state);
    fail(doc.id === sha256(p.id) && source && isDeepStrictEqual(p.money,source.money) && isDeepStrictEqual(p.statuses,source.statuses) &&
      isDeepStrictEqual(p.formulaInputs,source.formulaInputs) && p.trialAssignee === null && state.requests.length === 0 &&
      Object.values(state.statusEditors[p.id]).every(editors => editors.length === 0) && isDeepStrictEqual(rows.get(p.id),{id:p.id,money:p.money}),409,'ข้อมูลไม่ตรงกับต้นฉบับที่ยืนยัน');
  }
  return { verified:true,projects:docs.size,active:false };
}
export async function activateLiveDataset(options) {
  const c = context(options);
  await verifyInactiveLiveDataset(options);
  const user = await options.auth.getUser(c.headUid);
  fail(user.uid === c.headUid && !user.disabled && user.emailVerified && user.email?.toLowerCase() === '6534324223@student.chula.ac.th',403,'บัญชีเหรัญญิกไม่ตรงกับที่ยืนยัน');
  return options.db.runTransaction(async tx => {
    const [meta, members] = await Promise.all([tx.get(c.root),tx.get(options.db.collection('projectAccess').doc('2568').collection('members'))]);
    fail(meta.data()?.signature === c.signature && meta.data().status === 'ready' && meta.data().active === false && members.empty,409,'ชุดข้อมูลหรือสิทธิ์เปลี่ยนแล้ว ต้องตรวจใหม่ก่อนเปิดใช้');
    tx.create(c.grantRef(c.headUid),{uid:c.headUid,academicYear:2568,active:true,projectRole:'head',datasetId:options.datasetId});
    tx.update(c.root,{active:true});
    return {datasetId:options.datasetId,academicYear:2568,headUid:c.headUid,active:true};
  });
}
