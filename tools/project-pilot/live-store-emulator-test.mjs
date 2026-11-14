import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { createLiveBackupSchedule } from './live-backup.mjs';
import path from 'node:path';
import { createEmulatorIdentity } from './firebase-identity.mjs';
import { loadProductionCandidate } from './production-candidate.mjs';
import { acceptBaseline } from './approved-baseline.mjs';
import { initializeLiveDataset, createLiveStore, restoreLiveBackup, validateLiveBackup, verifyInactiveLiveDataset, activateLiveDataset } from './live-store.mjs';
const directory = process.argv[2], candidate = await loadProductionCandidate(directory), acceptance = acceptBaseline(candidate);
const identity = createEmulatorIdentity(), db = identity.db;
const suffix = randomUUID(), datasetId = `year2568-${suffix}`, restoredId = `year2568-restored-${suffix}`, uid = `head-${suffix}`;
const users = { [uid]: { id: uid, role: 'head', name: 'เหรัญญิกสำหรับทดสอบ' } };
const options = { candidate, acceptance, users, db, datasetId }, root = db.collection('projectDatasets').doc(datasetId), grant = identity.grantRef(uid,2568);
const before = await readFile(path.join(directory,'snapshot.json'));
try {
  await initializeLiveDataset(options);
  assert.equal((await verifyInactiveLiveDataset(options)).projects,407);
  await assert.rejects(initializeLiveDataset(options));
  const activationCollection=`activationTestAccess-${suffix}`;
  const activationDb=new Proxy(db,{get(target,key){if(key==='collection')return name=>target.collection(name==='projectAccess'?activationCollection:name);const value=target[key];return typeof value==='function'?value.bind(target):value;}});
  const activationOptions={...options,db:activationDb,auth:{getUser:async()=>({uid,email:'6534324223@student.chula.ac.th',emailVerified:true,disabled:false})}};
  try {
    await assert.rejects(activateLiveDataset({...activationOptions,auth:{getUser:async()=>({uid,email:'admin@example.test',emailVerified:true})}}),e=>e.status===403);
    const existing=activationDb.collection('projectAccess').doc('2568').collection('members').doc('revoked');
    await existing.create({active:false});await assert.rejects(activateLiveDataset(activationOptions),e=>e.status===409);await existing.delete();
    const activated=await activateLiveDataset(activationOptions);assert.equal(activated.active,true);
    assert.equal((await activationDb.collection('projectAccess').doc('2568').collection('members').get()).size,1);
    await assert.rejects(activateLiveDataset(activationOptions));
  }finally{await db.recursiveDelete(db.collection(activationCollection).doc('2568'));await root.update({active:false});}

  const store = await createLiveStore(options);
  await assert.rejects(store.query(uid), e => e.status === 403);
  await grant.create({ uid, academicYear: 2568, active: true, projectRole: 'head', datasetId });
  await assert.rejects(store.query(uid), e => e.status === 403);
  await root.update({ active: true });
  const original = await store.query(uid);
  assert.equal(original.totalCount,407); assert.deepEqual(original.totals,candidate.snapshot.totals);
  const firstBackup = await store.backup(uid); assert.equal(firstBackup.payload.auditOrder.length,0);
  assert.ok(firstBackup.payload.checkpoints.every(s => s.data.projects[0].id.startsWith('PROJECT68:')));
  const p = original.projects[0];
  const attempts = await Promise.allSettled([100,101].map(amount => store.mutate(uid,'commit',{projectId:p.id,version:p.version,changes:{O:String(amount)},reason:'ทดสอบการเขียนพร้อมกัน'})));
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1); assert.equal(attempts.find(r=>r.status==='rejected').reason.status,409);
  const restarted = await createLiveStore(options), after = await restarted.query(uid);
  assert.equal((await store.history(uid)).audit.length,1); assert.deepEqual(after.projects.slice(1),original.projects.slice(1));
  await grant.update({datasetId:'wrong'}); await assert.rejects(store.query(uid),e=>e.status===403); await grant.update({datasetId});
  await grant.update({active:false}); await assert.rejects(store.backup(uid),e=>e.status===403); await grant.update({active:true});
  await assert.rejects(store.mutate(uid,'reset',{}),e=>e.status===400);
  const bundle=await store.backup(uid); validateLiveBackup(bundle);
  const backupDirectory=await mkdtemp(path.join(os.tmpdir(),'sgcu-live-backup-test-'));
  let getCount=0, schedule;
  try {
    schedule=await createLiveBackupSchedule({directory:backupDirectory,datasetId,getBundle:async()=>{getCount++;return store.backup(uid);}});
    await Promise.all([schedule.tick(),schedule.tick()]); assert.equal(getCount,1);assert.equal(schedule.status().overdue,false);
    await schedule.stop();
    schedule=await createLiveBackupSchedule({directory:backupDirectory,datasetId,getBundle:async()=>{getCount++;return store.backup(uid);}});
    await schedule.tick(); assert.equal(getCount,1);await schedule.stop();
    const saved=JSON.parse(await readFile(path.join(backupDirectory,'status.json'),'utf8'));
    await writeFile(path.join(backupDirectory,saved.file),'{}');
    schedule=await createLiveBackupSchedule({directory:backupDirectory,datasetId,getBundle:async()=>{throw Error('network down');}});
    assert.equal(schedule.status().failed,true); await schedule.tick();assert.equal(schedule.status().overdue,true);
  } finally {await schedule?.stop();await rm(backupDirectory,{recursive:true,force:true});}
  const failedId=`year2568-failed-${suffix}`;
  const failDb=new Proxy(db,{get(target,key){if(key==='batch')return ()=>{const batch=target.batch();batch.commit=async()=>{throw Error('injected recovery failure');};return batch;};const value=target[key];return typeof value==='function'?value.bind(target):value;}});
  try {await assert.rejects(restoreLiveBackup({bundle,db:failDb,datasetId:failedId}));await assert.rejects(createLiveStore({...options,datasetId:failedId}),e=>e.status===409);}
  finally{await db.recursiveDelete(db.collection('projectDatasets').doc(failedId));}

  const corrupt=structuredClone(bundle); corrupt.payload.checkpoints[0].data.projects[0].money.O++;
  assert.throws(()=>validateLiveBackup(corrupt)); assert.throws(()=>validateLiveBackup({format:'SGCU-firestore-trial-backup',payload:bundle.payload}));
  await restoreLiveBackup({bundle,db,datasetId:restoredId});
  const restored=await createLiveStore({...options,datasetId:restoredId});
  await assert.rejects(restored.query(uid),e=>e.status===403);
  assert.equal((await grant.get()).data().datasetId,datasetId);
  await db.collection('projectDatasets').doc(restoredId).update({active:true});
  await grant.update({datasetId:restoredId});
  const recovered=await restored.backup(uid);
  for(const old of bundle.payload.checkpoints){const current=recovered.payload.checkpoints.find(s=>s.data.projects[0].id===old.data.projects[0].id);assert.deepEqual(current.data.projects[0].money,old.data.projects[0].money);assert.deepEqual(current.audit,old.audit);assert.notEqual(current.data.projects[0].version,old.data.projects[0].version);}
  assert.deepEqual((await restored.query(uid)).projects.map(p=>p.id),after.projects.map(p=>p.id));
  await assert.rejects(restored.mutate(uid,'commit',{projectId:p.id,version:after.projects[0].version,changes:{O:'2'},reason:'หน้าจอก่อนกู้คืน'}),e=>e.status===409);
  await assert.rejects(restoreLiveBackup({bundle,db,datasetId:restoredId}));
  assert.deepEqual(await readFile(path.join(directory,'snapshot.json')),before);
  console.log(JSON.stringify({passed:true,projects:407,liveNamespace:true,inactiveByDefault:true,datasetBoundGrant:true,atomicConcurrency:true,restart:true,backupRecovery:true,recoveryInactive:true,productionWrites:false}));
}finally{await grant.delete(); for(const id of [datasetId,restoredId])await db.recursiveDelete(db.collection('projectDatasets').doc(id));await identity.close();}
