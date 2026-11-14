import { STATUS_GROUPS, statusMode } from './statuses.mjs';
export const RECORD_FIELDS = [
 ['B','รหัสโครงการ','text','01'],['C','ชื่อโครงการ','text','01'],['D','ไฟล์โครงการ','url','01'],['E','ผู้รับผิดชอบโครงการ','text','01'],['F','ฝ่ายที่รับผิดชอบโครงการ','text','01'],
 ['H','สถานะการอนุมัติ','status','01'],['I','สมัยประชุมสภา','text','01'],['J','สมัยที่','text','01'],['K','ครั้งที่','text','01'],['L','วันที่อนุมัติ','date','01'],['M','วันปฏิบัติงานสุดท้าย','date','01'],['N','แหล่งงบประมาณ','text','01'],['O','งบอนุมัติ','money','01'],
 ['Q','สถานะการโอน','status','03'],['R','เลขเอกสารโอนงบประมาณ','text','03'],['S','วันที่ออกใบโอน','date','03'],['T','ไฟล์ใบโอน','url','03'],['U','ทิศทางโอน','direction','03'],['V','ยอดโอน','money','03'],
 ['Y','สถานะยืมรองจ่าย','status','04'],['Z','เลขเอกสารยืมรองจ่าย','text','04'],['AA','วันที่ออกใบยืม','date','04'],['AB','ไฟล์ใบยืม','url','04'],['AC','วันที่ต้องคืนรองจ่าย','date','04'],['AD','ร้อยละการยืมรองจ่าย','percent','04'],['AF','ผู้รับผิดชอบยืมรองจ่าย','text','04'],
 ['AH','เหรัญญิกโครงการ','text','05'],['AI','ผู้ตรวจเอกสาร / ผู้ช่วยที่รับผิดชอบ','assignee','05'],['AJ','ยอดใช้จริง','money','05'],['AQ','วันที่ส่งแก้ไข','date','05'],['AX','หมายเหตุ','note','05'],['AY','วันที่ส่งปิดโครงการ','date','05'],['AZ','สถานะปิดโครงการ','status','05'],['BA','สถานะฎีกา','status','05']
].map(([column,label,type,section])=>({column,label,type,section}));
export const FIELD_BY_COLUMN=Object.fromEntries(RECORD_FIELDS.map(f=>[f.column,f]));
const secretaryReview=new Set(['B','C','D','E','F','H','I','J','K','L','M','N','O','U','V']);
const secretaryDirect=new Set(['R','S','T','Z','AA','AB','AC']);
export function fieldMode(actor,record,column,value){
 if(!Object.hasOwn(FIELD_BY_COLUMN,column))return 'denied';
 if(actor.role==='head'||actor.role==='admin')return 'direct';
 if(actor.role==='assistant'&&record.assigneeUid!==actor.id)return 'denied';
 if(['Q','Y','AZ'].includes(column))return statusMode(actor,STATUS_GROUPS.find(g=>g.column===column),value,record.statusEditors?.[column]||[]);
 if(actor.role==='secretary')return secretaryReview.has(column)?'review':secretaryDirect.has(column)?'direct':'denied';
 if(actor.role==='assistant')return ['AJ','AY'].includes(column)?'review':['AQ','AX'].includes(column)?'direct':'denied';
 return 'denied';
}
export function fieldPermissions(actor,record){return Object.fromEntries(RECORD_FIELDS.map(f=>[f.column,f.type==='status'?Object.fromEntries(STATUS_GROUPS.find(g=>g.column===f.column).values.map(v=>[v,fieldMode(actor,record,f.column,v)])):fieldMode(actor,record,f.column)]));}
export const canFollow=(actor,record)=>['head','admin'].includes(actor.role)||(actor.role==='assistant'&&record.assigneeUid===actor.id);
