import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { PilotError } from './model.mjs';
import { STATUS_GROUPS } from './statuses.mjs';
import { RECORD_FIELDS, FIELD_BY_COLUMN, fieldMode, fieldPermissions, canFollow } from './record-policy.mjs';
const fail=(ok,code,message)=>{if(!ok)throw new PilotError(code,message);};
export const dateValid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number(v.slice(0,4))>=1900&&Number(v.slice(0,4))<=2200&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const safe=n=>{fail(n<=BigInt(Number.MAX_SAFE_INTEGER)&&n>=BigInt(Number.MIN_SAFE_INTEGER),400,'ยอดเกินขอบเขตที่รองรับ');return Number(n);};
const decimal=v=>{fail(typeof v==='string'&&/^\d{1,14}(\.\d{1,2})?$/.test(v),400,'กรอกตัวเลขไม่ติดลบ ทศนิยมไม่เกิน 2 ตำแหน่ง');const [whole,frac='']=v.split('.');return safe(BigInt(whole)*100n+BigInt(frac.padEnd(2,'0')));};
export const moneyText=n=>`${BigInt(n)/100n}.${String(BigInt(n)%100n).padStart(2,'0')}`;
const addDays=(v,days)=>{if(!v)return '';const d=new Date(v+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export const bangkokDate=(now=new Date())=>new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
function normalize(column,value,users){
 const f=Object.hasOwn(FIELD_BY_COLUMN,column)?FIELD_BY_COLUMN[column]:null;fail(f&&typeof value==='string',400,'ช่องข้อมูลหรือชนิดข้อมูลไม่ถูกต้อง');const v=value.trim();fail(v.length<=(f.type==='note'?4000:f.type==='url'?2000:500),400,'ข้อความยาวเกินกำหนด');
 if(['B','C'].includes(column))fail(v.length>0,400,'ต้องระบุรหัสและชื่อโครงการ');
 if(f.type==='date')fail(!v||dateValid(v),400,'วันที่ต้องเป็น ค.ศ. YYYY-MM-DD ที่มีอยู่จริง');
 if(f.type==='url'&&v){let url;try{url=new URL(v);}catch{fail(false,400,'ลิงก์ไม่ถูกต้อง');}fail(['https:','http:'].includes(url.protocol)&&!url.username&&!url.password,400,'ใช้ลิงก์ http หรือ https เท่านั้น');}
 if(f.type==='status')fail(!v||STATUS_GROUPS.find(g=>g.column===column).values.includes(v),400,'สถานะไม่อยู่ในตัวเลือก');
 if(f.type==='direction')fail(['','เพิ่ม','ลด'].includes(v),400,'ทิศทางโอนไม่ถูกต้อง');
 if(f.type==='money')return v?moneyText(decimal(v)):'';
 if(f.type==='percent'){const rate=decimal(v);fail(rate<=10000,400,'ร้อยละต้องอยู่ระหว่าง 0 ถึง 100');return moneyText(rate);}
 if(f.type==='assignee')fail(!v||users[v]?.role==='assistant',400,'เลือกบัญชีผู้ช่วยที่กำหนดไว้เท่านั้น');
 return v;
}
export function calculateRecord(fields,now=new Date()){
 const O=decimal(fields.O||'0'),V=decimal(fields.V||'0'),AJ=decimal(fields.AJ||'0'),rate=decimal(fields.AD||'80');
 fail(rate<=10000,400,'ร้อยละเกิน 100');fail(!V||['เพิ่ม','ลด'].includes(fields.U),400,'ระบุทิศทางโอนก่อนกรอกยอดโอน');
 const W=safe(BigInt(O)+(fields.U==='ลด'?-BigInt(V):fields.U==='เพิ่ม'?BigInt(V):0n));
 const AE=safe((BigInt(O)*BigInt(rate)+5000n)/10000n),BC=safe(BigInt(AJ)-BigInt(AE));
 const active=['อนุมัติการโอนงบประมาณโดยเหรัญญิก','ผ่านที่ประชุมสภาใหญ่','รอนายกและประธานสภาลงนาม','ส่งกิจการนิสิตแล้ว รออนุมัติ','กระบวนการโอนงบประมาณมีผลบังคับใช้'].includes(fields.Q);
 const AK=addDays(fields.M,14),AW=AK?Math.round((Date.parse(AK)-Date.parse(bangkokDate(now)))/86400000):null;
 return {money:{O:fields.O?O:null,V:fields.V?V:null,AJ:fields.AJ?AJ:null,W,AE,BC,BE:AJ,BF:safe(BigInt(active?W:O)-BigInt(AJ))},derived:{AK,AW,BB:BC<0?'คืนรองจ่าย':BC>0?'รับเพิ่ม':'ไม่มียอดรับเพิ่ม / คืน',AP:`ติดตามเอกสารปิดโครงการ ${fields.B} ${fields.C} กำหนดส่ง ${AK||'ยังไม่ระบุ'}`,AV:`ติดตามเอกสารแก้ไขโครงการ ${fields.B} ${fields.C} ส่งแก้ไขวันที่ ${fields.AQ||'ยังไม่ระบุ'}`}};
}
export function seedRecord(project,sourceFields={},users={}){
 const fields=Object.fromEntries(RECORD_FIELDS.map(f=>[f.column,sourceFields[f.column]??'']));
 Object.assign(fields,{B:project.code,C:project.name,E:project.organization||'',F:project.organizationGroup||'',AD:String(sourceFields.AD||project.formulaInputs?.advanceRate||'80'),U:project.formulaInputs?.transferDirection||''});
 for(const col of ['O','V','AJ'])fields[col]=project.money[col]===null?'':moneyText(project.money[col]);
 for(const g of STATUS_GROUPS)fields[g.column]=project.statuses[g.column]||'';
 // Never infer account ownership from a spreadsheet name.
 fields.AI=sourceFields.AI||'';
 for(const f of RECORD_FIELDS)fields[f.column]=normalize(f.column,String(fields[f.column]),users);
 return {schemaVersion:2,id:project.id,year:2568,version:randomUUID(),fields,assigneeUid:fields.AI||null,statusEditors:{},followupCount:0,legacyReviewer:project.responsibleName||'',legacyFollowups:structuredClone(sourceFields.legacyFollowups||[]),referenceFields:Object.fromEntries(['BH','BI','BJ','BK'].map(col=>[col,String(sourceFields.referenceFields?.[col]??sourceFields[col]??'')]))};
}
export function recordView(record,actor,users,now=new Date()){
 const {money,derived}=calculateRecord(record.fields,now);return {...structuredClone(record),code:record.fields.B,name:record.fields.C,organization:record.fields.E,organizationGroup:record.fields.F,responsibleName:users[record.assigneeUid]?.name||record.legacyReviewer||'',money,derived,statuses:Object.fromEntries(STATUS_GROUPS.map(g=>[g.column,record.fields[g.column]])),formulaInputs:{advanceRate:record.fields.AD,transferDirection:record.fields.U},fieldPermissions:fieldPermissions(actor,record),canFollow:canFollow(actor,record)};
}
export function previewRecord(record,actor,changes,users,now=new Date()){
 fail(changes&&typeof changes==='object'&&!Array.isArray(changes)&&Object.keys(changes).length>0,400,'ระบุข้อมูลที่ต้องการแก้');
 const fields={...record.fields},clean={},modes=[];
 for(const [column,value] of Object.entries(changes)){const normalized=normalize(column,value,users);fail(!['__proto__','constructor','prototype'].includes(column),400,'ช่องข้อมูลไม่ถูกต้อง');if(normalized===record.fields[column])continue;const mode=fieldMode(actor,record,column,normalized);fail(mode!=='denied',403,'ไม่มีสิทธิ์แก้ช่อง '+column);modes.push(mode);fields[column]=normalized;clean[column]=normalized;}
 fail(modes.length,400,'ไม่มีข้อมูลเปลี่ยนแปลง');
 const before=calculateRecord(record.fields,now),after=calculateRecord(fields,now);
 return {requiresReason:Object.keys(clean).some(column=>['O','U','V','AD','AJ'].includes(column)),mode:modes.includes('review')?'review':'direct',changes:clean,before:before.money,after:after.money,beforeDerived:before.derived,afterDerived:after.derived,fields,changedFields:Object.keys(clean).map(column=>({column,label:FIELD_BY_COLUMN[column].label,before:record.fields[column],after:clean[column]}))};
}
export function applyRecord(record,preview,actor){const next=structuredClone(record);next.fields=preview.fields;next.assigneeUid=next.fields.AI||null;if(Object.hasOwn(preview.changes,'AI'))next.legacyReviewer='';next.version=randomUUID();for(const col of ['H','Q','Y','AZ','BA'])if(Object.hasOwn(preview.changes,col))next.statusEditors[col]=[...new Set([...(next.statusEditors[col]||[]),actor.id])];return next;}
export function assertVersion(record,version){fail(typeof version==='string'&&version===record.version,409,'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดและตรวจสอบใหม่');}
export function makeFollowup(record,actor,input,now=new Date()){
 fail(canFollow(actor,record),403,'ไม่มีสิทธิ์ติดตามโครงการนี้');fail(input&&Object.keys(input).every(k=>['kind','date','note'].includes(k)),400,'ช่องประวัติไม่ถูกต้อง');fail(['closure','revision'].includes(input.kind)&&dateValid(input.date),400,'ระบุประเภทและวันที่ติดตาม');fail(input.date<=bangkokDate(now),400,'วันที่ติดตามต้องไม่อยู่ในอนาคต');fail(typeof input.note==='string'&&input.note.trim().length<=2000,400,'หมายเหตุยาวเกินกำหนด');
 return {id:randomUUID(),projectId:record.id,kind:input.kind,date:input.date,note:input.note.trim(),actor:actor.id,actorName:actor.name,recordedAt:now.toISOString(),revisionDate:input.kind==='revision'?record.fields.AQ:''};
}
export function reviewStillMatches(record,request,proposer,users,now){assertVersion(record,request.baseVersion);const result=previewRecord(record,proposer,request.changes,users,now);fail(result.mode==='review'&&isDeepStrictEqual(result.after,request.after)&&isDeepStrictEqual(result.changes,request.changes),409,'สิทธิ์หรือผลคำนวณเปลี่ยนแล้ว กรุณาส่งคำขอใหม่');return result;}

export function validateRecordState(record,users){
 fail(record?.schemaVersion===2&&typeof record.id==='string'&&record.id.startsWith('PROJECT68:')&&record.id.length<=200&&/^[a-f0-9-]{36}$/.test(record.version)&&record.year===2568,400,'รูปแบบโครงการไม่ถูกต้อง');
 fail(record.fields&&Object.keys(record.fields).length===RECORD_FIELDS.length,400,'ช่องข้อมูลโครงการไม่ครบ');
 for(const f of RECORD_FIELDS)fail(normalize(f.column,record.fields[f.column],users)===record.fields[f.column],400,'ข้อมูลโครงการไม่อยู่ในรูปแบบมาตรฐาน');
 fail(record.assigneeUid===(record.fields.AI||null)&&Number.isSafeInteger(record.followupCount)&&record.followupCount>=0,400,'ผู้รับผิดชอบหรือจำนวนประวัติไม่ถูกต้อง');
 fail(record.statusEditors&&typeof record.statusEditors==='object'&&!Array.isArray(record.statusEditors),400,'ประวัติสถานะไม่ถูกต้อง');
 for(const [col,editors]of Object.entries(record.statusEditors))fail(['H','Q','Y','AZ','BA'].includes(col)&&Array.isArray(editors)&&editors.every(id=>Object.hasOwn(users,id)),400,'ประวัติผู้แก้สถานะไม่ถูกต้อง');
 fail(typeof record.legacyReviewer==='string'&&record.legacyReviewer.length<=500&&Array.isArray(record.legacyFollowups),400,'ข้อมูลอ้างอิงเดิมไม่ถูกต้อง');
 for(const item of record.legacyFollowups)fail(item&&['AL','AM','AN','AO','AR','AS','AT','AU'].includes(item.column)&&typeof item.value==='string'&&item.value.length<=2000,400,'ประวัติอ้างอิงเดิมไม่ถูกต้อง');
 fail(record.referenceFields&&Object.keys(record.referenceFields).length===4&&['BH','BI','BJ','BK'].every(col=>typeof record.referenceFields[col]==='string'&&record.referenceFields[col].length<=2000),400,'ข้อมูลอ้างอิงไม่ครบ');
 calculateRecord(record.fields);return record;
}
export function validateStoredChanges(changes,users){fail(changes&&typeof changes==='object'&&!Array.isArray(changes)&&Object.keys(changes).length>0,400,'ข้อมูลคำขอไม่ถูกต้อง');for(const [col,value]of Object.entries(changes))fail(normalize(col,value,users)===value,400,'ข้อมูลคำขอไม่อยู่ในรูปแบบมาตรฐาน');}

export function recordChangeReason(value, changes) {
 const required = Object.keys(changes).some(column => ['O','U','V','AD','AJ'].includes(column));
 const note = value == null ? '' : value;
 if (typeof note !== 'string' || note.length > 1000 || (required && note.trim().length < 3)) throw new PilotError(400, required ? 'ระบุเหตุผลการแก้ยอดเงินอย่างน้อย 3 ตัวอักษร' : 'เหตุผลต้องไม่เกิน 1,000 ตัวอักษร');
 return note.trim();
}
