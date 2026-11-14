import test from 'node:test';
import assert from 'node:assert/strict';
import {recordChangeReason,seedRecord,previewRecord,applyRecord,calculateRecord,makeFollowup,reviewStillMatches,dateValid} from './record-model.mjs';
import {fieldMode,RECORD_FIELDS} from './record-policy.mjs';
import {STATUS_GROUPS} from './statuses.mjs';
export const users=Object.fromEntries(['head','secretary','assistant','other','admin'].map(id=>[id,{id,role:id==='other'?'assistant':id,name:id+' ทดสอบ'}]));
export function fixture(id='PROJECT68:test'){
 return seedRecord({id,code:id,name:'โครงการทดสอบ',organization:'ฝ่ายกิจกรรม',organizationGroup:'อบจ.',responsibleName:'ชื่อจากต้นฉบับ',money:{O:100000,V:0,AJ:50000},formulaInputs:{advanceRate:'80',transferDirection:''},statuses:Object.fromEntries(STATUS_GROUPS.map(g=>[g.column,g.values[0]]))},{M:'2026-11-01',AI:'assistant'},users);
}
test('exact per-field permissions and old status rules; unassigned assistants cannot edit',()=>{
 const p=fixture();for(const f of RECORD_FIELDS)assert.equal(fieldMode(users.head,p,f.column,p.fields[f.column]),'direct');
 for(const col of ['B','C','D','E','F','H','I','J','K','L','M','N','O','U','V'])assert.equal(fieldMode(users.secretary,p,col,p.fields[col]),'review');
 for(const col of ['R','S','T','Z','AA','AB','AC'])assert.equal(fieldMode(users.secretary,p,col,p.fields[col]),'direct');
 for(const col of ['AD','AF','AH','AI','AJ','AQ','AX','AY','BA'])assert.equal(fieldMode(users.secretary,p,col,p.fields[col]),'denied');
 for(const col of ['AJ','AY'])assert.equal(fieldMode(users.assistant,p,col,p.fields[col]),'review');
 for(const col of ['AQ','AX'])assert.equal(fieldMode(users.assistant,p,col,p.fields[col]),'direct');
 for(const f of RECORD_FIELDS)assert.equal(fieldMode(users.other,p,f.column,p.fields[f.column]),'denied');
 const q=STATUS_GROUPS.find(g=>g.column==='Q');assert.equal(fieldMode(users.secretary,p,'Q',q.values[5]),'review');p.statusEditors.Q=['head'];assert.equal(fieldMode(users.assistant,p,'Q',q.values[1]),'denied');
});
test('percent edits recalculate loan and difference, derived dates use Bangkok and exact cents',()=>{
 const p=fixture(),r=previewRecord(p,users.head,{AD:'75',U:'ลด',V:'100'},users,new Date('2026-11-14T18:00:00Z'));
 assert.equal(r.after.AE,75000);assert.equal(r.after.BC,-25000);assert.equal(r.after.W,90000);assert.equal(r.afterDerived.AK,'2026-11-15');assert.equal(r.afterDerived.AW,0);
 assert.equal(calculateRecord({...p.fields,O:'0.01',AD:'50'}).money.AE,1);
 assert.equal(dateValid('2026-02-30'),false);assert.equal(dateValid('2026-99-99'),false);
 for(const changes of [{AD:'101'},{AD:'-1'},{O:'1e3'},{M:'2568-01-01'},{D:'javascript:alert(1)'},{W:'99'},{AI:'invented'},{O:'90071992547409.92'}])assert.throws(()=>previewRecord(p,users.head,changes,users));
});
test('requests keep live values unchanged, replay requires same version and current permissions',()=>{
 const p=fixture(),result=previewRecord(p,users.secretary,{O:'2000',R:'โอน/1'},users);assert.equal(result.mode,'review');assert.equal(p.fields.O,'1000.00');
 const request={baseVersion:p.version,changes:result.changes,after:result.after};assert.deepEqual(reviewStillMatches(p,request,users.secretary,users).after,result.after);
 const changed=applyRecord(p,previewRecord(p,users.head,{AD:'70'},users),users.head);assert.throws(()=>reviewStillMatches(changed,request,users.secretary,users),e=>e.status===409);
 assert.throws(()=>previewRecord(p,users.assistant,{AD:'50'},users),e=>e.status===403);
});
test('followups use authenticated authors, no round limit, and validate date/note',()=>{
 const p=fixture();p.followupCount=10000;const now=new Date('2026-11-15T12:00:00Z'),entry=makeFollowup(p,users.assistant,{kind:'closure',date:'2026-11-15',note:'รอบใหม่'},now);assert.equal(entry.actor,'assistant');
 assert.throws(()=>makeFollowup(p,users.secretary,{kind:'closure',date:'2026-11-15',note:''},now),e=>e.status===403);
 assert.throws(()=>makeFollowup(p,users.assistant,{kind:'closure',date:'2026-11-15',note:'',actor:'head'},now),e=>e.status===400);
 assert.throws(()=>makeFollowup(p,users.assistant,{kind:'closure',date:'2026-11-16',note:''},now),e=>e.status===400);
});

test('routine edits need no reason; financial changes still require a reason',()=>{
 const p=fixture();
 const routine=previewRecord(p,users.head,{C:'ชื่อใหม่'},users);
 assert.equal(routine.requiresReason,false);
 assert.equal(recordChangeReason(undefined,routine.changes),'');
 assert.equal(recordChangeReason('ก',routine.changes),'ก');
 for(const column of ['O','U','V','AD','AJ']) assert.throws(()=>recordChangeReason('',{[column]:'1'}),/เหตุผล/);
 const financial=previewRecord(p,users.head,{AD:'75'},users);
 assert.equal(financial.requiresReason,true);
 assert.equal(recordChangeReason('ปรับตามข้อตกลง',financial.changes),'ปรับตามข้อตกลง');
 assert.throws(()=>recordChangeReason({},routine.changes),/เหตุผล/);
});
