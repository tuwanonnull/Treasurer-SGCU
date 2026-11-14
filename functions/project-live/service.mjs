import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { createLiveStore, restoreLiveBackup, validateLiveBackup } from './live-store.mjs';
import { createProjectAuthenticator, ADMIN_EMAIL } from './auth.mjs';
import { PilotError } from './model.mjs';
const fail = (ok,status,message) => { if(!ok)throw new PilotError(status,message); };
export function createProjectService({ db, auth, loadOptions, saveBackup }) {
  const authenticate = createProjectAuthenticator(auth);
  const adminRef = uid => db.collection('projectSystemAdmins').doc(uid);
  const requireAdmin = async (uid,tx=null) => {
    const snap = tx ? await tx.get(adminRef(uid)) : await adminRef(uid).get(), data = snap.data();
    fail(data?.active === true && data.uid === uid && data.role === 'admin' && data.email === ADMIN_EMAIL,403,'เฉพาะแอดมินที่เปิดสิทธิ์แล้ว');
  };
  return {
    async handle({ authorization, method, action, body, params = new URLSearchParams() }) {
      const actor = await authenticate(authorization), options = await loadOptions(), store = await createLiveStore({...options,db});
      if(method === 'GET') {
        if(action === '')return store.query(actor.id,params);
        if(action === 'history')return store.history(actor.id);
        if(action === 'backup')return store.backup(actor.id);
        if(action === 'access') {
          fail(actor.role === 'admin',403,'เฉพาะแอดมิน');await requireAdmin(actor.id);
          const head = Object.values(options.users).find(u=>u.role==='head');
          const grant = (await db.collection('projectAccess').doc('2568').collection('members').doc(head.id).get()).data();
          await requireAdmin(actor.id);
          return {headUid:head.id,active:grant?.active===true && grant.datasetId===options.datasetId,datasetId:options.datasetId};
        }
      }
      if(method === 'POST') {
        if(['preview','commit','status-preview','status'].includes(action))return store.mutate(actor.id,action,body);
        fail(actor.role === 'admin',403,'เฉพาะแอดมิน');await requireAdmin(actor.id);
        if(action === 'access') {
          fail(body && Object.keys(body).every(k=>['active','reason'].includes(k)) && typeof body.active==='boolean' && typeof body.reason==='string' && body.reason.trim().length>=3 && body.reason.length<=1000,400,'ระบุสิทธิ์และเหตุผล');
          const head = Object.values(options.users).find(u=>u.role==='head');
          if(body.active){const user=await auth.getUser(head.id);fail(!user.disabled && user.emailVerified && user.email?.toLowerCase()==='6534324223@student.chula.ac.th',409,'บัญชีเหรัญญิกไม่พร้อมใช้งาน');}
          return db.runTransaction(async tx=>{
            await requireAdmin(actor.id,tx);
            const config=await tx.get(db.collection('projectLiveConfig').doc('2568'));
            fail(config.data()?.datasetId===options.datasetId,409,'ชุดข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่');
            const ref=db.collection('projectAccess').doc('2568').collection('members').doc(head.id), previous=(await tx.get(ref)).data();
            fail(previous?.uid===head.id && previous.projectRole==='head' && previous.datasetId===options.datasetId,409,'สิทธิ์เดิมไม่ตรงชุดข้อมูล');
            tx.update(ref,{active:body.active});
            tx.create(db.collection('projectAdminAudit').doc(randomUUID()),{actor:actor.id,action:'head-access',datasetId:options.datasetId,before:previous.active,after:body.active,reason:body.reason.trim(),at:new Date().toISOString()});
            return {active:body.active};
          });
        }
        if(action === 'restore') {
          fail(body && Object.keys(body).every(k=>['bundle','reason','expectedDatasetId'].includes(k)) && body.expectedDatasetId===options.datasetId && typeof body.reason==='string' && body.reason.trim().length>=3 && body.reason.length<=1000,400,'ระบุชุดข้อมูลและเหตุผลกู้คืน');
          const p=validateLiveBackup(body.bundle);
          fail(isDeepStrictEqual(p.candidate,options.candidate) && isDeepStrictEqual(p.acceptance,options.acceptance) && Object.entries(p.users).every(([id,user])=>isDeepStrictEqual(user,options.users[id])),400,'ไฟล์สำรองไม่ตรงต้นฉบับหรือทะเบียนบัญชี');
          // Persist a verified offsite copy of the current state before starting a restore.
          const safety=await saveBackup(await store.backup(actor.id),'before-restore');
          const destination=`year2568-recovered-${randomUUID()}`;
          await restoreLiveBackup({bundle:body.bundle,db,datasetId:destination});
          await db.runTransaction(async tx=>{
            await requireAdmin(actor.id,tx);
            const configRef=db.collection('projectLiveConfig').doc('2568'),oldRef=db.collection('projectDatasets').doc(options.datasetId),newRef=db.collection('projectDatasets').doc(destination);
            const head=Object.values(options.users).find(u=>u.role==='head'),grantRef=db.collection('projectAccess').doc('2568').collection('members').doc(head.id);
            const [config,oldMeta,newMeta,grant]=await Promise.all([tx.get(configRef),tx.get(oldRef),tx.get(newRef),tx.get(grantRef)]);
            const overview=await tx.get(oldRef.collection('views').doc('overview'));
            fail(config.data()?.datasetId===options.datasetId && oldMeta.data()?.active===true && newMeta.data()?.status==='ready' && newMeta.data()?.active===false && newMeta.data()?.signature===oldMeta.data().signature,409,'ชุดข้อมูลเปลี่ยนระหว่างกู้คืน');
            // Reject a switch if someone wrote after the safety backup; preserve both datasets for inspection.
            fail(overview.data()?.sequence===safety.auditCount,409,'มีการแก้ข้อมูลหลังสำรองก่อนกู้คืน กรุณาทำใหม่');
            fail(grant.data()?.datasetId===options.datasetId,409,'สิทธิ์เปลี่ยนระหว่างกู้คืน');
            tx.update(oldRef,{active:false});tx.update(newRef,{active:true});tx.update(configRef,{datasetId:destination});
            tx.update(grantRef,{datasetId:destination}); // Preserve active=false when access was revoked.
            tx.create(db.collection('projectAdminAudit').doc(randomUUID()),{actor:actor.id,action:'restore',from:options.datasetId,to:destination,reason:body.reason.trim(),safetyBackup:safety.object,checksum:body.bundle.checksum,at:new Date().toISOString()});
          });
          return {datasetId:destination,restored:true};
        }
      }
      throw new PilotError(404,'ไม่พบคำสั่ง');
    }
  };
}
