import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {readScriptSource} from '../lib/source-includes.mjs';
const source=await readFile('web/js/features/account-work/app.account-work.js','utf8');
const start=source.indexOf('  window.sgcuWorkOpeners =');
const end=source.indexOf("  document.querySelectorAll('[data-staff-mode]')",start);
function harness({delay=0,revoke=false,navigateAway=false,timeout=false}={}) {
 let handler,clock=0,attempts=0,opened=0,closed=0,shown=0;
 let rows=[{id:'normal-meeting-opaque',recordId:'opaque / ไทย',service:'meeting',mode:'normal'}];
 const nodes=new Map();
 const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,addEventListener:(_,fn)=>handler=fn,close:()=>closed++});return nodes.get(id);};
 const window={sgcuWorkAction:()=>rows.length?{page:'meeting-room-booking',label:'เปิดรายละเอียดการจอง'}:null,sgcuTourNavigation:{navigate:async()=>{}},sgcuWorkOpeners:{'meeting-room-booking':id=>{assert.equal(id,'opaque / ไทย');attempts++;if(timeout||attempts<=delay)return false;opened++;return true;}}};
 const context={window,$,visibleRows:()=>rows,selectedId:rows[0].id,showDetails:()=>shown++,document:{querySelector:()=>({dataset:{page:navigateAway?'home':'meeting-room-booking'}})},Date:{now:()=>clock},setTimeout:fn=>{clock+=1000;if(revoke)rows=[];fn();},Error,Promise};
 vm.runInNewContext(source.slice(start,end),context);
 return {run:()=>handler(),stats:()=>({attempts,opened,closed,shown}),node:$};
}
let h=harness({delay:2});await Promise.all([h.run(),h.run()]);assert.deepEqual(h.stats(),{attempts:3,opened:1,closed:1,shown:0});assert.equal(h.node('work-next-action').disabled,false);
h=harness({delay:2,revoke:true});await h.run();assert.equal(h.stats().opened,0);assert.equal(h.stats().shown,0);
h=harness({navigateAway:true});await h.run();assert.equal(h.stats().attempts,0);assert.equal(h.stats().shown,1);
h=harness({timeout:true});await h.run();assert.equal(h.stats().opened,0);assert.equal(h.stats().shown,1);assert.match(h.node('work-action-status').textContent,/เปิดรายการไม่สำเร็จ/);
// Execute actual feature opener registrations against delayed feature data.
for(const [file,page,setup,loaded] of [
 ['web/js/features/budget/app.budget-staff.js','budget-approval-staff','const projectNameInputEl={focus:()=>{}}; let requestRows=[]; const fillFormForEdit=row=>opened.push(row.id);','requestRows=[{id:targetId}];'],
 ['web/js/features/booking/app.meeting-room-staff.js','meeting-room-staff','let bookings=[]; window.openMeetingBookingDetailModal=row=>opened.push(row.id);','bookings=[{id:targetId}];'],
 ['web/js/features/booking/app.meeting-room-booking.js','meeting-room-booking','let bookings=[]; const findBooking=fn=>bookings.find(fn); const openBookingDetailModal=row=>opened.push(row.id);','bookings=[{id:targetId}];'],
 ['web/js/features/staff/app.staff-access.js','staff-temporary-access-staff','let currentAuthEmailAccessEntries=[]; const fillAuthAccessForm=row=>opened.push(row.id); const openAuthAccessEditor=()=>{};','currentAuthEmailAccessEntries=[{id:targetId}];'],
 ['web/js/features/staff/app.staff-access.js','org-representative-approval-staff','let currentOrgRepresentativeApplications=[]; const openOrgRepresentativeDetailModal=row=>opened.push(row.id);','currentOrgRepresentativeApplications=[{id:targetId}];']
]) {
 const text=await readScriptSource(file),marker=`(window.sgcuWorkOpeners ||= {})['${page}'] = id => {`;
 const begin=text.indexOf(marker);assert.ok(begin>=0,page);
 const registration=text.slice(begin,text.indexOf('\n  };',begin)+6);
 const c=vm.createContext({window:{},opened:[],targetId:'opaque / ไทย'});
 vm.runInContext(setup+registration,c);
 assert.equal(c.window.sgcuWorkOpeners[page](c.targetId),false,page);
 vm.runInContext(loaded,c);
 assert.equal(c.window.sgcuWorkOpeners[page](c.targetId),true,page);
 assert.deepEqual(c.opened,[c.targetId]);
}
console.log('Work actions: delayed loading, exact IDs, duplicate clicks, revoked access, navigation cancellation, timeout recovery and service openers passed.');
