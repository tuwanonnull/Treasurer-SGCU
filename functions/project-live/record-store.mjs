import {randomUUID,createHash} from 'node:crypto';
import {PilotError} from './model.mjs';
import {recordChangeReason,recordView,previewRecord,applyRecord,assertVersion,makeFollowup,reviewStillMatches,seedRecord,calculateRecord,validateRecordState,validateStoredChanges,dateValid} from './record-model.mjs';
import {RECORD_FIELDS} from './record-policy.mjs';
import {filterLiveProjects} from './query-filters.mjs';
import {STATUS_GROUPS} from './statuses.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=(ok,code,message)=>{if(!ok)throw new PilotError(code,message);};
const pack=value=>{const payload=JSON.stringify(value);fail(Buffer.byteLength(payload)<750000,400,'ข้อมูลเกินขนาดที่รองรับ');return {payload};};
const unpack=snap=>{fail(snap.exists,404,'ไม่พบข้อมูล');return JSON.parse(snap.data().payload);};
const summary=p=>({id:p.id,code:p.fields.B,name:p.fields.C,year:2568,organization:p.fields.E,organizationGroup:p.fields.F,assigneeUid:p.assigneeUid,pendingRequestId:p.pendingRequestId||null,money:calculateRecord(p.fields).money});
const reason=v=>{fail(typeof v==='string'&&v.trim().length>=3&&v.length<=1000,400,'ระบุเหตุผลอย่างน้อย 3 ตัวอักษร');return v.trim();};
function refs(options){fail(/^year2568-[a-zA-Z0-9_-]+$/.test(options.datasetId),400,'ชุดข้อมูลไม่ถูกต้อง');const root=options.db.collection('projectRecordDatasets').doc(options.datasetId);return {root,view:root.collection('views').doc('overview'),project:id=>root.collection('projects').doc(hash(id)),code:value=>root.collection('codes').doc(hash(value.toLocaleLowerCase('th-TH')))};}
export async function initializeRecordDataset({db,datasetId,records,users,sourceChecksum}){
 const c=refs({db,datasetId});fail(Array.isArray(records)&&records.length>0,400,'ไม่มีโครงการ');const ids=new Set(),codes=new Set();
 for(const p of records){validateRecordState(p,users);fail(p.schemaVersion===2&&!ids.has(p.id)&&!codes.has(p.fields.B.toLocaleLowerCase('th-TH')),400,'โครงการซ้ำ');ids.add(p.id);codes.add(p.fields.B.toLocaleLowerCase('th-TH'));calculateRecord(p.fields);}
 fail(Object.values(users).filter(u=>u.role==='head').length===1,400,'ต้องมีเหรัญญิกหนึ่งบัญชี');
 await c.root.create({schema:'project-record-v2',active:false,status:'preparing',sourceChecksum,createdAt:new Date().toISOString()});
 const writes=records.flatMap(p=>[[c.project(p.id),pack(p)],[c.code(p.fields.B),{projectId:p.id}]]);
 for(let i=0;i<writes.length;i+=200){const batch=db.batch();for(const [ref,data]of writes.slice(i,i+200))batch.create(ref,data);await batch.commit();}
 const batch=db.batch();batch.create(c.view,{...pack(records.map(summary)),sequence:0});batch.update(c.root,{status:'ready',projectCount:records.length});await batch.commit();return {datasetId,active:false,projectCount:records.length};
}
export async function createRecordStore(options){
 const {db,users}=options,c=refs(options);
 const authorize=async(tx,uid)=>{
  const account=users[uid];fail(account&&account.id===uid&&['head','admin','secretary','assistant'].includes(account.role),403,'บัญชีไม่อยู่ในทะเบียนโครงการ');
  const [meta,grant,admin]=await Promise.all([tx.get(c.root),tx.get(db.collection('projectAccess').doc('2568').collection('members').doc(uid)),tx.get(db.collection('projectSystemAdmins').doc(uid))]);
  const m=meta.data(),g=grant.data(),a=admin.data();fail(m?.schema==='project-record-v2'&&m.status==='ready'&&m.active===true,403,'ชุดข้อมูลยังไม่เปิดใช้');
  const adminOK=account.role==='admin'&&a?.uid===uid&&a.active===true&&a.role==='admin'&&a.email==='tuwanon.kimchiang@gmail.com';
  fail(adminOK||(account.role!=='admin'&&g?.uid===uid&&g.active===true&&g.academicYear===2568&&g.datasetId===options.datasetId&&g.projectRole===account.role),403,'ไม่มีสิทธิ์หรือสิทธิ์ถูกถอน');return account;
 };
 const visible=(p,actor)=>fail(actor.role!=='assistant'||p.assigneeUid===actor.id,403,'เข้าถึงได้เฉพาะโครงการที่รับผิดชอบ');
 return {
  async query(uid,params=new URLSearchParams()){
   return db.runTransaction(async tx=>{const actor=await authorize(tx,uid),overview=unpack(await tx.get(c.view)),permitted=overview.filter(p=>actor.role!=='assistant'||p.assigneeUid===uid),filtered=filterLiveProjects(params.get('pending')==='true'?permitted.filter(p=>p.pendingRequestId):permitted,params),records=[];
    for(const p of filtered.matched.slice(filtered.offset,filtered.offset+25)){const record=unpack(await tx.get(c.project(p.id)));visible(record,actor);records.push(recordView(record,actor,users));}
    return {recordSchemaVersion:2,pendingRequestsCount:permitted.filter(p=>p.pendingRequestId).length,user:actor,datasetId:options.datasetId,totalCount:permitted.length,matchedCount:filtered.matched.length,offset:filtered.offset,filterOptions:filtered.filterOptions,projects:records,recordFields:RECORD_FIELDS,statusGroups:STATUS_GROUPS,moneyLabels:{O:'งบอนุมัติ',V:'ยอดโอน',W:'งบสุทธิ',AE:'เงินยืม',AJ:'ยอดใช้จริง',BC:'ยอดรับเพิ่ม / คืน',BE:'ยอดเบิกจริง',BF:'งบคงเหลือ'},assistantAccounts:['head','admin'].includes(actor.role)?Object.values(users).filter(u=>u.role==='assistant').map(({id,name})=>({id,name})):[],requests:[]};});
  },
  async list(uid,kind,params){
   fail(['followups','requests'].includes(kind),404,'ไม่พบข้อมูล');return db.runTransaction(async tx=>{const actor=await authorize(tx,uid),id=params.get('projectId'),record=unpack(await tx.get(c.project(id||'')));visible(record,actor);if(kind==='requests'&&params.get('pending')==='true'){return {items:record.pendingRequestId?[unpack(await tx.get(c.project(id).collection('requests').doc(record.pendingRequestId)))]:[],next:null};}let query=c.project(id).collection(kind).orderBy('order').limit(26);const after=params.get('after');if(after!==null){fail(/^\d+$/.test(after)&&Number.isSafeInteger(Number(after)),400,'หน้าข้อมูลไม่ถูกต้อง');query=query.startAfter(Number(after));}const docs=(await tx.get(query)).docs,items=docs.slice(0,25).map(doc=>unpack(doc));return {items,next:docs.length>25?String(docs[24].data().order):null};});
  },
  async mutate(uid,action,body){
   const allowed={ 'record-preview':['projectId','version','changes'],'record-save':['projectId','version','changes','reason'],'record-approve':['projectId','requestId','version'],'record-reject':['projectId','requestId','reason'],'followup-add':['projectId','version','kind','date','note']}[action];
   fail(allowed&&body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).every(k=>allowed.includes(k)),400,'คำขอมีช่องที่ไม่อนุญาต');
   fail(typeof body.projectId==='string'&&body.projectId.startsWith('PROJECT68:')&&body.projectId.length<=200,400,'รหัสโครงการไม่ถูกต้อง');
   return db.runTransaction(async tx=>{
    const actor=await authorize(tx,uid),ref=c.project(body.projectId||''),record=unpack(await tx.get(ref));visible(record,actor);
    if(action==='record-preview'){assertVersion(record,body.version);return previewRecord(record,actor,body.changes,users);}
    const overviewSnap=await tx.get(c.view),rows=unpack(overviewSnap),sequence=overviewSnap.data().sequence+1;
    let next=record,result,event,requestRef,request,requestUpdate,follow;
    if(action==='followup-add'){
     assertVersion(record,body.version);follow=makeFollowup(record,actor,{kind:body.kind,date:body.date,note:body.note});next={...record,followupCount:record.followupCount+1};event={action,followup:follow};
    }else if(action==='record-save'){
     assertVersion(record,body.version);result=previewRecord(record,actor,body.changes,users);const note=recordChangeReason(body.reason,result.changes);
     if(result.mode==='review'){fail(!record.pendingRequestId,409,'โครงการนี้มีคำขอรอตรวจอยู่แล้ว');request={id:randomUUID(),projectId:record.id,baseVersion:record.version,proposer:actor.id,proposerName:actor.name,createdAt:new Date().toISOString(),state:'pending',changes:result.changes,before:result.before,after:result.after,changedFields:result.changedFields,reason:note};requestRef=ref.collection('requests').doc(request.id);next={...record,pendingRequestId:request.id};event={action:'record-propose',requestId:request.id,changes:result.changedFields,reason:note};}
     else{next=applyRecord(record,result,actor);event={action,changes:result.changedFields,before:result.before,after:result.after,reason:note};}
    }else{
     fail(['head','admin'].includes(actor.role),403,'เฉพาะเหรัญญิกตรวจคำขอ');fail(typeof body.requestId==='string'&&/^[a-f0-9-]{36}$/.test(body.requestId),400,'คำขอไม่ถูกต้อง');requestRef=ref.collection('requests').doc(body.requestId);request=unpack(await tx.get(requestRef));fail(request.state==='pending'&&request.projectId===record.id&&record.pendingRequestId===request.id,409,'คำขอนี้ตรวจแล้ว');
     if(action==='record-approve'){assertVersion(record,body.version);if(options.auth){const account=await options.auth.getUser(request.proposer);fail(!account.disabled&&account.emailVerified,403,'บัญชีผู้เสนอใช้ไม่ได้แล้ว');}const proposer=await authorize(tx,request.proposer);visible(record,proposer);result=reviewStillMatches(record,request,proposer,users);next=applyRecord(record,result,actor);event={action,requestId:request.id,changes:result.changedFields,before:result.before,after:result.after,reason:request.reason};}
     else{next={...record};event={action,requestId:request.id,reason:reason(body.reason)};}
     delete next.pendingRequestId;requestUpdate={...request,state:action==='record-approve'?'approved':'rejected',reviewer:actor.id,reviewerName:actor.name,reviewedAt:new Date().toISOString(),reviewReason:event.reason};
    }
    // Reserve editable project codes atomically; the stable project ID never changes.
    if(next.assigneeUid&&next.assigneeUid!==record.assigneeUid){if(options.auth){const account=await options.auth.getUser(next.assigneeUid);fail(!account.disabled&&account.emailVerified,403,'บัญชีผู้ช่วยใช้ไม่ได้แล้ว');}const assignee=await authorize(tx,next.assigneeUid);fail(assignee.role==='assistant',400,'ผู้รับผิดชอบต้องเป็นผู้ช่วยที่มีสิทธิ์ใช้งาน');}
    const codeChanged=next.fields.B!==record.fields.B;if(codeChanged){const code=await tx.get(c.code(next.fields.B));fail(!code.exists||code.data().projectId===record.id,409,'รหัสโครงการซ้ำ');}
    const audit={id:randomUUID(),projectId:record.id,code:next.fields.B,actor:actor.id,actorName:actor.name,at:new Date().toISOString(),...event};
    const index=rows.findIndex(p=>p.id===record.id);fail(index>=0,409,'ข้อมูลสรุปไม่ครบ');rows[index]=summary(next);
    tx.set(ref,pack(next));tx.set(c.view,{...pack(rows),sequence});tx.create(c.root.collection('audit').doc(audit.id),{...pack(audit),order:sequence});
    if(codeChanged&&record.fields.B.toLocaleLowerCase('th-TH')!==next.fields.B.toLocaleLowerCase('th-TH'))tx.delete(c.code(record.fields.B));if(codeChanged)tx.set(c.code(next.fields.B),{projectId:record.id});
    if(follow)tx.create(ref.collection('followups').doc(follow.id),{...pack(follow),order:sequence});
    if(requestUpdate)tx.set(requestRef,{...pack(requestUpdate),order:request.order||sequence});else if(requestRef&&action==='record-save')tx.create(requestRef,{...pack({...request,order:sequence}),order:sequence});
    return {savedInFirestore:true,state:result?.mode==='review'&&action==='record-save'?'pending':'saved',version:next.version};
   });
  },
  async history(uid){return db.runTransaction(async tx=>{const actor=await authorize(tx,uid);fail(['head','admin','secretary'].includes(actor.role),403,'ดูประวัติรวมได้เฉพาะผู้มีสิทธิ์');const docs=(await tx.get(c.root.collection('audit').orderBy('order','desc').limit(50))).docs;return {audit:docs.map(unpack)};});},
  async backup(uid){return db.runTransaction(async tx=>{const actor=await authorize(tx,uid);fail(['head','admin'].includes(actor.role),403,'ไม่มีสิทธิ์สำรองข้อมูล');const projects=(await tx.get(c.root.collection('projects'))).docs;const records=[],followups=[],requests=[];for(const doc of projects){records.push(unpack(doc));for(const kind of ['followups','requests']){const docs=(await tx.get(doc.ref.collection(kind))).docs;for(const item of docs)(kind==='followups'?followups:requests).push({...unpack(item),order:item.data().order});}}const audit=(await tx.get(c.root.collection('audit').orderBy('order'))).docs.map(unpack);const payload={datasetId:options.datasetId,createdAt:new Date().toISOString(),users,records,requests,followups,audit};return {format:'SGCU-record-backup',version:2,checksum:hash(JSON.stringify(payload)),payload};});}
 };
}
export function validateRecordBackup(bundle){
 fail(bundle?.format==='SGCU-record-backup'&&bundle.version===2&&bundle.checksum===hash(JSON.stringify(bundle.payload)),400,'ไฟล์สำรองรุ่นใหม่ไม่ถูกต้อง');const p=structuredClone(bundle.payload);
 fail(p&&p.users&&Array.isArray(p.records)&&p.records.length>0&&Array.isArray(p.requests)&&Array.isArray(p.followups)&&Array.isArray(p.audit)&&Number.isFinite(Date.parse(p.createdAt)),400,'ไฟล์สำรองไม่ครบ');
 const ids=new Set(),codes=new Set();for(const record of p.records){validateRecordState(record,p.users);fail(record.schemaVersion===2&&typeof record.id==='string'&&record.id.startsWith('PROJECT68:')&&!ids.has(record.id)&&typeof record.version==='string'&&Number.isSafeInteger(record.followupCount)&&record.followupCount>=0,400,'ข้อมูลโครงการไม่ถูกต้อง');ids.add(record.id);const validated=seedRecord({id:record.id,code:record.fields.B,name:record.fields.C,organization:record.fields.E,organizationGroup:record.fields.F,money:calculateRecord(record.fields).money,formulaInputs:{advanceRate:record.fields.AD,transferDirection:record.fields.U},statuses:Object.fromEntries(STATUS_GROUPS.map(g=>[g.column,record.fields[g.column]]))},record.fields,p.users);fail(JSON.stringify(validated.fields)===JSON.stringify(Object.fromEntries(RECORD_FIELDS.map(f=>[f.column,record.fields[f.column]])))&&record.assigneeUid===(record.fields.AI||null),400,'ช่องข้อมูลสำรองไม่ถูกต้อง');const key=record.fields.B.toLocaleLowerCase('th-TH');fail(!codes.has(key),400,'รหัสซ้ำ');codes.add(key);for(const editors of Object.values(record.statusEditors||{}))fail(Array.isArray(editors)&&editors.every(uid=>p.users[uid]),400,'ประวัติสิทธิ์สถานะไม่ครบ');}
 for(const kind of ['requests','followups','audit']){const seen=new Set();for(const item of p[kind]){fail(typeof item.id==='string'&&/^[a-f0-9-]{36}$/.test(item.id)&&!seen.has(item.id)&&ids.has(item.projectId),400,'ประวัติไม่ถูกต้อง');seen.add(item.id);if(kind!=='audit')fail(Number.isSafeInteger(item.order)&&item.order>0,400,'ลำดับประวัติไม่ถูกต้อง');if(kind==='followups')fail(p.users[item.actor]&&['closure','revision'].includes(item.kind)&&typeof item.note==='string'&&item.note.length<=2000&&dateValid(item.date),400,'ข้อมูลติดตามไม่ถูกต้อง');if(kind==='requests'){fail(p.users[item.proposer]&&['pending','approved','rejected'].includes(item.state)&&/^[a-f0-9-]{36}$/.test(item.baseVersion)&&typeof item.reason==='string'&&item.reason.length<=1000&&Array.isArray(item.changedFields),400,'คำขอตรวจสอบไม่ถูกต้อง');validateStoredChanges(item.changes,p.users);for(const money of [item.before,item.after])fail(money&&Object.keys(money).length===8&&Object.values(money).every(v=>v===null||Number.isSafeInteger(v)),400,'ยอดในคำขอไม่ถูกต้อง');}if(kind==='audit')fail(p.users[item.actor]&&Number.isFinite(Date.parse(item.at)),400,'ประวัติผู้แก้ไขไม่ถูกต้อง');}}
 for(const record of p.records){fail(p.followups.filter(f=>f.projectId===record.id).length===record.followupCount,400,'จำนวนประวัติติดตามไม่ครบ');const pending=p.requests.filter(r=>r.projectId===record.id&&r.state==='pending');fail(pending.length<=1&&(pending[0]?.id||null)===(record.pendingRequestId||null),400,'คำขอรอตรวจไม่ครบ');}
 return p;
}
export async function restoreRecordBackup({bundle,db,datasetId}){
 const p=validateRecordBackup(bundle),versions=new Map();for(const record of p.records){const old=record.version;record.version=randomUUID();versions.set(record.id,{old,next:record.version});}
 for(const request of p.requests){const v=versions.get(request.projectId);if(request.state==='pending'&&request.baseVersion===v.old)request.baseVersion=v.next;}
 await initializeRecordDataset({db,datasetId,records:p.records,users:p.users,sourceChecksum:bundle.checksum});const c=refs({db,datasetId});await c.root.update({status:'restoring'});const writes=[];
 for(const kind of ['requests','followups'])for(const item of p[kind])writes.push([c.project(item.projectId).collection(kind).doc(item.id),{...pack(item),order:item.order}]);
 p.audit.forEach((item,i)=>writes.push([c.root.collection('audit').doc(item.id),{...pack(item),order:i+1}]));
 for(let i=0;i<writes.length;i+=200){const batch=db.batch();for(const [ref,data]of writes.slice(i,i+200))batch.create(ref,data);await batch.commit();}
 await c.view.update({sequence:p.audit.length});await c.root.update({status:'ready'});return {datasetId,active:false};
}
