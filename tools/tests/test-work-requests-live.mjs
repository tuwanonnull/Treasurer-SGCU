import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const events=new Map(),subscriptions=[],nodes=new Map();
const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',dataset:{},querySelector:s=>node(id+s)});return nodes.get(id);};
let displayed=[],hasStaff=false;
const firestore={db:{},doc:(_,collection,id)=>({collection,id}),collection:(_,name)=>name,where:(field,op,value)=>({field,op,value}),limit:n=>({limit:n}),query:(collection,...constraints)=>({collection,constraints}),onSnapshot:(query,success,failure)=>{const s={query,success,failure,stopped:false};subscriptions.push(s);return()=>s.stopped=true;}};
const window={sgcuFirestore:firestore,sgcuWork:{setLiveState:(rows,staff)=>{displayed=rows;hasStaff=staff;}},addEventListener:(n,f)=>events.set(n,f)};
const context={window,document:{getElementById:node,querySelectorAll:()=>[],addEventListener:()=>{}},Intl,Date,console,SGCU_APP_CONFIG:{documents:{signersByAcademicYear:{2568:{approvalMeetingBody:'สภานิสิต'},2569:{approvalMeetingBody:'คณะกรรมการบริหารสโมสรนิสิตจุฬาลงกรณ์มหาวิทยาลัย'}}}}};
vm.runInNewContext(await readFile(new URL('../../web/js/features/account-work/app.account-work-data.js',import.meta.url),'utf8'),context);
const auth=detail=>events.get('sgcu:staff-auth-updated')({detail});
const pages=['budget-approval-staff','borrow-assets-staff','meeting-room-staff','staff-temporary-access-staff','org-representative-approval-staff'];
auth({isAuthenticated:true,email:'1234567890@alumni.chula.ac.th',hasStaff:true,isHeadStaff:true,allowedPages:pages});
const sub=(collection,mode)=>subscriptions.find(s=>!s.stopped && s.query.collection===collection && (mode==='normal' ? s.query.id || s.query.constraints?.some(c=>c.field && c.field!=='status') : !s.query.id && !s.query.constraints?.some(c=>c.field && c.field!=='status')));
const doc=(id,data)=>({id,data:()=>data});
const feed=(collection,mode,data)=>sub(collection,mode).success({size:1,docs:[doc('test',data)]});
const row=(service,mode)=>displayed.find(r=>r.service===service && r.mode===mode);
const wait='รอการดำเนินการจากผู้เกี่ยวข้อง';
assert.equal(sub('budgetApprovalRequests','normal').query.constraints[0].value,'1234567890@student.chula.ac.th');
assert.equal(sub('authEmailAccess','normal').query.id,'1234567890@alumni.chula.ac.th');
assert.equal(sub('organizationRepresentativeApplications','normal'),undefined);
for(const [service,collection,cases] of [
 ['budget','budgetApprovalRequests',[['pending',wait,'รอพิจารณาคำขอ'],['reviewing',wait,'อยู่ระหว่างการพิจารณา'],['approved','จัดแก้เอกสารตามมติที่ประชุม เตรียมเข้าที่ประชุมสภา',null],['rejected',null,null],['cancelled',null,null]]],
 ['borrow','borrowAssetRequests',[['pending',wait,'รอพิจารณาคำขอ'],['approved','รับพัสดุตามวันและเวลาที่กำหนด','รอส่งมอบพัสดุ'],['received','คืนพัสดุตามวันและเวลาที่กำหนด','รอรับคืนพัสดุ'],['returned',null,null],['rejected',null,null],['cancelled',null,null]]],
 ['meeting','meetingRoomBookings',[['pending',wait,'รอพิจารณาคำขอ'],['approved','เข้าใช้ห้องตามวันและเวลาที่ได้รับอนุมัติ',null],['cancel_requested',wait,'รอพิจารณาคำขอยกเลิก'],['reschedule_requested',wait,'รอพิจารณาคำขอเปลี่ยนแปลง'],['rejected',null,null],['no_show',null,null],['cancelled',null,null]]]
]) {
 for(const [status,normal,staff] of cases) for(const mode of ['normal','staff']) {
  feed(collection,mode,{status,budgetRoundYear:2568,projectName:'Project',date:'2099-01-01',endTime:'12:00',staffNote:'Keep this separate'});
  const expected=mode==='normal'?normal:staff;
  assert.equal(row(service,mode)?.next || null,expected,`${service}/${status}/${mode}`);
  if(expected)assert.equal(row(service,mode).note,'Keep this separate');
 }
}
feed('budgetApprovalRequests','normal',{status:'approved',budgetRoundYear:2569});assert.match(row('budget','normal').next,/ส่งเข้ากองกิจ$/);assert.equal(row('budget','normal').bucket,'action');
feed('budgetApprovalRequests','normal',{status:'approved',budgetRoundYear:2026});assert.match(row('budget','normal').next,/ส่งเข้ากองกิจ$/);
feed('budgetApprovalRequests','normal',{status:'approved'});assert.match(row('budget','normal').next,/ตรวจสอบช่องทาง/);
feed('meetingRoomBookings','normal',{status:'approved',date:'2020-01-01',endTime:'12:00'});assert.equal(row('meeting','normal'),undefined);
feed('meetingRoomBookings','staff',{status:'pending',date:'2020-01-01',endTime:'12:00'});assert.equal(row('meeting','staff'),undefined);
feed('meetingRoomBookings','normal',{status:'pending',roomId:'opaque',purpose:'ประชุม'});assert.equal(row('meeting','normal').requestNo,'');
subscriptions.find(s=>s.query==='meetingRooms').success({docs:[doc('opaque',{name:'ชื่อห้องจากทะเบียน'})]});assert.equal(row('meeting','normal').title,'ชื่อห้องจากทะเบียน');
const now=Date.now(),active={status:'approved',active:true,startsAt:new Date(now-86400000)};
for(const [data,normal,staff] of [
 [{status:'pending'},wait,'รอพิจารณาคำขอ'],
 [{...active,startsAt:new Date(now+86400000),endsAt:new Date(now+20*86400000)},'รอถึงกำหนดเริ่มใช้งานสิทธิ์',null],
 [{...active,endsAt:new Date(now+20*86400000)},'ใช้งานได้ตามระยะเวลาที่ได้รับอนุมัติ',null],
 [{...active,endsAt:new Date(now+2*86400000)},'สิทธิ์กำลังจะหมดอายุ','ตรวจสอบสิทธิ์ที่ใกล้หมดอายุ'],
 [{status:'rejected'},null,null],[{...active,active:false},null,null],[{...active,endsAt:new Date(now-1000)},null,null]
]) {
 sub('authEmailAccess','normal').success({id:'self',exists:()=>true,data:()=>data});feed('authEmailAccess','staff',data);
 assert.equal(row('temporary','normal')?.next || null,normal);assert.equal(row('temporary','staff')?.next || null,staff);
}
for(const status of ['pending','approved','rejected']) {feed('organizationRepresentativeApplications','staff',{status,requestType:'organization_representative',applicant:{displayName:'Person'},organization:{organizationName:'Club'}});assert.equal(row('representative','staff')?.next || null,status==='pending'?'รอพิจารณาคำขอเป็นตัวแทนองค์กร':null);}
feed('organizationRepresentativeApplications','staff',{status:'pending',requestType:'staff_application'});assert.equal(row('representative','staff'),undefined);
// Action targets preserve opaque IDs and use the same live staff permissions as queues.
for (const [service,collection] of [['budget','budgetApprovalRequests'],['borrow','borrowAssetRequests'],['meeting','meetingRoomBookings']]) {
 feed(collection,'staff',{status:'pending',date:'2099-01-01'});
 const item=row(service,'staff');
 assert.equal(item.recordId,'test');
 assert.equal(window.sgcuWorkAction(item).page,pages[['budget','borrow','meeting'].indexOf(service)]);
}
feed('budgetApprovalRequests','normal',{status:'approved'});
assert.equal(window.sgcuWorkAction(row('budget','normal')).page,'budget-approval-request');
assert.equal(window.sgcuWorkAction({service:'unknown',recordId:'x',mode:'normal'}),null);
const savedActionRow=row('meeting','staff');
const old=sub('budgetApprovalRequests','normal');const start=subscriptions.length;
auth({isAuthenticated:true,email:'other@example.com',hasStaff:true,isHeadStaff:false,allowedPages:pages});assert.ok(subscriptions.slice(0,start).every(s=>s.stopped));assert.equal(displayed.length,0);
old.success({size:1,docs:[doc('stale',{status:'pending'})]});assert.equal(displayed.length,0);
assert.equal(window.sgcuWorkAction({service:'temporary',recordId:'x',mode:'staff'}),null);
assert.equal(sub('authEmailAccess','staff'),undefined);assert.equal(sub('organizationRepresentativeApplications','staff'),undefined);
sub('budgetApprovalRequests','normal').failure({code:'permission-denied'});assert.match(node('live-work-status').textContent,/ไม่มีสิทธิ์/);
events.get('sgcu:auth-state')({detail:{isAuthenticated:false}});assert.equal(displayed.length,0);assert.equal(hasStaff,false);assert.ok(subscriptions.every(s=>s.stopped));
assert.equal(window.sgcuWorkAction(savedActionRow),null);
console.log('Work queue: all requested status/role messages and exclusions, per-year council routing, notes, room names, expiry, owner/head access and logout isolation passed.');
