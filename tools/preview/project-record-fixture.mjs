// In-memory demo only. Role selection here is never used by the deployed API.
import {randomUUID} from 'node:crypto';
import {recordChangeReason,seedRecord,recordView,previewRecord,applyRecord,assertVersion,makeFollowup,reviewStillMatches} from '../../functions/project-live/record-model.mjs';
import {RECORD_FIELDS} from '../../functions/project-live/record-policy.mjs';
import {STATUS_GROUPS} from '../../functions/project-live/statuses.mjs';
import {filterLiveProjects} from '../../functions/project-live/query-filters.mjs';
const users=Object.fromEntries(['head','secretary','assistant'].map(role=>[role,{id:role,role,name:({head:'เหรัญญิกตัวอย่าง',secretary:'เลขาตัวอย่าง',assistant:'ผู้ช่วยตัวอย่าง'})[role]}]));
export function createRecordPreview(projects){
 const records=projects.map((p,i)=>seedRecord({...p,id:'PROJECT68:'+p.id,statuses:{H:'อนุมัติโครงการ',Q:STATUS_GROUPS[1].values[0],Y:'โครงการรับเงินแล้ว',AZ:STATUS_GROUPS[3].values[0],BA:STATUS_GROUPS[4].values[0]}},{AI:'assistant',L:'2025-06-15',M:'2025-09-30',N:'กองทุนกิจกรรมนิสิต',AD:'80',AH:'เหรัญญิกโครงการตัวอย่าง',AC:'2025-10-30',AQ:'2025-10-05',AX:'ข้อมูลจำลอง '+(i+1)},users));
 const followups=[],requests=[],audit=[];
 return async function handle(req,res,url){
  const [,role,action='']=url.pathname.slice(1).split('/'),actor=users[role];if(!actor){res.statusCode=403;return res.end(JSON.stringify({error:'เลือกบทบาทตัวอย่างที่กำหนด'}));}
  const send=value=>res.end(JSON.stringify(value));res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
   if(req.method==='GET'){
    if(!action){const views=records.map(p=>recordView(p,actor,users)),result=filterLiveProjects(url.searchParams.get('pending')==='true'?views.filter(p=>p.pendingRequestId):views,url.searchParams);return send({recordSchemaVersion:2,pendingRequestsCount:views.filter(p=>p.pendingRequestId).length,user:actor,datasetId:'preview-records',projects:result.matched.slice(result.offset,result.offset+25),totalCount:records.length,matchedCount:result.matched.length,offset:result.offset,filterOptions:result.filterOptions,recordFields:RECORD_FIELDS,statusGroups:STATUS_GROUPS,moneyLabels:{O:'งบอนุมัติ',V:'ยอดโอน',W:'งบสุทธิ',AE:'เงินยืม',AJ:'ยอดใช้จริง',BC:'รับเพิ่ม / คืน',BE:'เบิกจริง',BF:'งบคงเหลือ'},assistantAccounts:actor.role==='head'?[users.assistant]:[]});}
    if(action==='history')return send({audit});
    if(['followups','requests'].includes(action)){const items=(action==='followups'?followups:requests).filter(r=>r.projectId===url.searchParams.get('projectId')&&(url.searchParams.get('pending')!=='true'||r.state==='pending')),after=Number(url.searchParams.get('after')||0);return send({items:items.slice(after,after+25),next:items.length>after+25?String(after+25):null});}
    throw Error('โหมดทดลองไม่รองรับคำสั่งนี้');
   }
   let raw='';for await(const part of req)raw+=part;const body=JSON.parse(raw),index=records.findIndex(p=>p.id===body.projectId);if(index<0)throw Error('ไม่พบโครงการ');let p=records[index];
   if(action==='record-preview'||action==='record-save'){
    assertVersion(p,body.version);const result=previewRecord(p,actor,body.changes,users);if(action==='record-preview')return send(result);
    body.reason=recordChangeReason(body.reason,result.changes);
    if(result.mode==='review'){if(p.pendingRequestId)throw Error('มีคำขอรอตรวจแล้ว');const r={id:randomUUID(),projectId:p.id,baseVersion:p.version,proposer:actor.id,proposerName:actor.name,createdAt:new Date().toISOString(),state:'pending',changes:result.changes,before:result.before,after:result.after,changedFields:result.changedFields,reason:body.reason};requests.push(r);p.pendingRequestId=r.id;}else records[index]=applyRecord(p,result,actor);
   }else if(action==='followup-add'){assertVersion(p,body.version);followups.push(makeFollowup(p,actor,{kind:body.kind,date:body.date,note:body.note}));p.followupCount++;}
   else if(['record-approve','record-reject'].includes(action)){
    if(actor.role!=='head')throw Error('เฉพาะเหรัญญิก');const request=requests.find(r=>r.id===body.requestId&&r.projectId===p.id&&r.state==='pending');if(!request)throw Error('ไม่พบคำขอ');
    if(action==='record-approve'){assertVersion(p,body.version);records[index]=applyRecord(p,reviewStillMatches(p,request,users[request.proposer],users),actor);request.state='approved';}else{if(!body.reason||body.reason.trim().length<3)throw Error('ระบุเหตุผลปฏิเสธ');request.state='rejected';}delete records[index].pendingRequestId;
   }else throw Error('โหมดทดลองไม่รองรับคำสั่งนี้');
   audit.push({id:randomUUID(),actorName:actor.name,code:p.fields.B,action,reason:body.reason||body.note||''});return send({savedInMemory:true,sandboxOnly:true});
  }catch(error){res.statusCode=error.status||400;send({error:error.message});}
 };
}
