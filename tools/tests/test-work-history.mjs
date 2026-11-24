import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile('web/js/features/account-work/app.account-work-history.js','utf8');
const definitions=[['budget','budgetApprovalRequests','budget-approval-staff','requester.accountEmail'],['borrow','borrowAssetRequests','borrow-assets-staff','requesterEmail'],['meeting','meetingRoomBookings','meeting-room-staff','requesterEmail'],['temporary','authEmailAccess','staff-temporary-access-staff','email'],['representative','organizationRepresentativeApplications','org-representative-approval-staff','applicantEmail']];
const doc=(id,data)=>({id,data:()=>data,exists:()=>true});
const updatedAt=i=>new Date(Date.UTC(2026,9,1,0,i));
const record=(id,i,extra={})=>doc(id,{status:'returned',requesterEmail:'owner@example.com',updatedAt:updatedAt(i),projectName:id,...extra});
function setup(data={}) {
 const calls=[],emitted=[];let result,hook=null;
 let ctx={state:{isAuthenticated:true,email:'owner@example.com',hasStaff:true},definitions,allowedServices:['budget','borrow','meeting','temporary','representative'],ownerEmail:()=> 'owner@example.com',roomName:()=>''};
 const field=(d,key)=>key==='__name__'?d.id:key.split('.').reduce((v,k)=>v?.[k],d.data());
 const f={db:{},where:(field,op,value)=>({kind:'where',field,op,value}),orderBy:(field,direction)=>({kind:'order',field,direction}),limit:n=>({kind:'limit',n}),startAfter:doc=>({kind:'cursor',doc}),collection:(_,name)=>name,doc:(_,collection,id)=>({collection,id}),query:(collection,...constraints)=>({collection,constraints}),getDoc:async ref=>{calls.push(ref);return (data[ref.collection]||[]).find(d=>d.id===ref.id)||{exists:()=>false};},getDocs:async q=>{
  calls.push(q);if(hook)await hook(q);
  let rows=[...(data[q.collection]||[])];
  for(const c of q.constraints.filter(c=>c.kind==='where')) rows=rows.filter(d=>{const v=field(d,c.field);return c.op==='=='?v===c.value:c.op==='in'?c.value.includes(v):c.op==='>='?v>=c.value:v<c.value;});
  const order=q.constraints.filter(c=>c.kind==='order');
  rows=rows.filter(d=>order.every(c=>field(d,c.field)!==undefined));
  rows.sort((a,b)=>{for(const c of order){const av=field(a,c.field),bv=field(b,c.field);if(av<bv)return c.direction==='desc'?1:-1;if(av>bv)return c.direction==='desc'?-1:1;}return 0;});
  const cursor=q.constraints.find(c=>c.kind==='cursor');if(cursor)rows=rows.slice(rows.findIndex(d=>d.id===cursor.doc.id)+1);
  rows=rows.slice(0,q.constraints.find(c=>c.kind==='limit').n);return {docs:rows};
 }};
 const window={sgcuFirestore:f,sgcuWorkHistoryContext:()=>ctx,sgcuWork:{setHistoryState:s=>{result=s;emitted.push(s);}}};
 vm.runInNewContext(source,{window,Intl,Date,Promise,Set,Number,String,Error});
 return {api:window.sgcuWorkHistory,calls,emitted,result:()=>result,auth:value=>ctx={...ctx,...value},hook:fn=>hook=fn};
}
const filters={year:'all'};
// Every load consumes server cursors, not a preloaded 300-record array.
let h=setup({borrowAssetRequests:Array.from({length:461},(_,i)=>record(String(i).padStart(4,'0'),i))});
assert.equal(h.calls.length,0,'History must be lazy');
await h.api.configure('normal',{...filters,service:'borrow'});
assert.equal(h.result().rows.length,20);assert.equal(h.calls.length,1);
assert.ok(h.calls[0].constraints.some(c=>c.field==='requesterEmail'&&c.value==='owner@example.com'));
await h.api.loadMore();assert.equal(h.result().rows.length,40);assert.ok(h.calls.at(-1).constraints.some(c=>c.kind==='cursor'));
while(h.result().hasMore)await h.api.loadMore();
assert.equal(h.result().rows.length,461);assert.equal(new Set(h.result().rows.map(r=>r.id)).size,461);
assert.ok(h.calls.every(q=>q.constraints.find(c=>c.kind==='limit').n===20));
// Exact server search finds records outside all previously loaded pages; aliases deduplicate.
h=setup({budgetApprovalRequests:Array.from({length:450},(_,i)=>record('b'+i,i,{status:'rejected',requester:{accountEmail:'owner@example.com'},requestNo:i===1?'TARGET':'other',projectCodeGenerated:i===1?'TARGET':'other'}))});
await h.api.configure('normal',{...filters,service:'budget',query:'TARGET'});
assert.equal(h.result().rows.length,1);assert.equal(h.result().rows[0].recordId,'b1');
assert.ok(h.calls.every(q=>q.constraints.some(c=>['requestNo','projectCodeGenerated'].includes(c.field)&&c.value==='TARGET')));
// Cross-service ordering and equal-time cursors remain deterministic with no duplicates.
h=setup({borrowAssetRequests:Array.from({length:31},(_,i)=>record('a'+String(i).padStart(2,'0'),30)),meetingRoomBookings:Array.from({length:35},(_,i)=>record('m'+i,i,{status:'cancelled'}))});
await h.api.configure('normal',filters);while(h.result().hasMore)await h.api.loadMore();
const merged=h.result().rows;assert.equal(merged.length,66);assert.ok(merged.every((r,i)=>!i||merged[i-1].updatedMs>=r.updatedMs));
assert.deepEqual(Array.from(merged.filter(r=>r.service==='borrow'),r=>r.recordId),Array.from({length:31},(_,i)=>'a'+String(i).padStart(2,'0')));
// Owners cannot list authEmailAccess; staff services are constrained by current page permissions.
h=setup({authEmailAccess:[doc('owner@example.com',{email:'owner@example.com',status:'rejected',updatedAt:updatedAt(1)})]});
await h.api.configure('normal',{...filters,service:'temporary'});assert.equal(h.calls[0].id,'owner@example.com');assert.equal(h.result().rows.length,1);
h.auth({allowedServices:['meeting']});await h.api.configure('staff',filters,true);assert.ok(h.calls.slice(1).every(q=>q.collection==='meetingRoomBookings'));
// Already-approved budgets remain active for requesters but are historical staff decisions.
h=setup({budgetApprovalRequests:[record('budget',1,{status:'approved',requester:{accountEmail:'owner@example.com'}})]});
await h.api.configure('normal',{...filters,service:'budget'});assert.equal(h.result().rows.length,0);
await h.api.configure('staff',{...filters,service:'budget'});assert.equal(h.result().rows.length,1);
// Derived terminal states, requester cancellations, and deleted records.
h=setup({meetingRoomBookings:[record('past',1,{status:'approved',date:'2020-01-01',endTime:'10:00'}),record('future',2,{status:'approved',date:'2099-01-01'}),record('cancel',3,{status:'rejected',cancelledByRequester:true}),record('deleted',4,{status:'cancelled',isDeleted:true})]});
await h.api.configure('normal',{...filters,service:'meeting'});assert.deepEqual(Array.from(h.result().rows,r=>r.recordId),['cancel','past']);
await h.api.configure('normal',{...filters,service:'meeting',status:'rejected'});assert.equal(h.result().rows.length,0);
await h.api.configure('normal',{...filters,service:'meeting',status:'cancelled'});assert.equal(h.result().rows[0].recordId,'cancel');
// Year/date predicates are sent to the database, including Bangkok midnight boundaries.
h=setup({borrowAssetRequests:[record('before',1,{updatedAt:new Date('2026-05-31T23:59:59+07:00')}),record('start',2,{updatedAt:new Date('2026-06-01T00:00:00+07:00')}),record('end',3,{updatedAt:new Date('2027-06-01T00:00:00+07:00')})]});
await h.api.configure('normal',{service:'borrow',year:'2569'});assert.deepEqual(Array.from(h.result().rows,r=>r.recordId),['start']);
const before=h.calls.length;await h.api.configure('normal',{service:'borrow',year:'2569',from:'2027-06-01',to:'2026-06-01'});assert.equal(h.calls.length,before);assert.match(h.result().error,/ช่วงวันที่/);
// Slow responses must not repopulate history after logout or account/filter changes.
h=setup({borrowAssetRequests:[record('secret',1)]});let resolve;h.hook(()=>new Promise(r=>resolve=r));const pending=h.api.configure('normal',{...filters,service:'borrow'});h.api.resetAccess();resolve();await pending;assert.equal(h.result().rows.length,0);
// Bounded scans expose "load more" without inventing an empty final result.
h=setup({meetingRoomBookings:[...Array.from({length:250},(_,i)=>record('future'+i,1000+i,{status:'approved',date:'2099-01-01'})),record('old',1,{status:'approved',date:'2020-01-01'})]});
await h.api.configure('normal',{...filters,service:'meeting'});assert.equal(h.calls.length,12);assert.equal(h.result().rows.length,0);assert.equal(h.result().hasMore,true);await h.api.loadMore();assert.equal(h.result().rows[0].recordId,'old');
// Partial-page failure preserves pending rows and cursor state for retry.
h=setup({borrowAssetRequests:Array.from({length:30},(_,i)=>record('r'+i,i)),meetingRoomBookings:[record('m',50,{status:'cancelled'})]});
let failures=1;h.hook(q=>{if(q.collection==='meetingRoomBookings'&&failures-- > 0)throw Object.assign(Error('offline'),{code:'unavailable'});});
await h.api.configure('normal',filters);assert.ok(h.result().error);assert.equal(h.result().rows.length,0);await h.api.loadMore();while(h.result().hasMore)await h.api.loadMore();assert.equal(h.result().rows.length,31);assert.equal(new Set(h.result().rows.map(r=>r.id)).size,31);
console.log('History: lazy reads, server cursors beyond 300, exact search, merged ordering, permissions, date/status filters, stale requests, bounded scans and retry passed.');
