import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/features/booking/app.meeting-room-booking.js',import.meta.url),'utf8');
const extract=name=>{const start=source.indexOf(`  const ${name} =`);assert.ok(start>=0);return source.slice(start,source.indexOf('\n  };',start)+5);};
for(const action of ['cancelOwnBooking','submitRescheduleRequest'])for(const fail of [false,true]){
 const booking={id:'one',requesterEmail:'owner@example.com',status:'approved',roomId:'old',date:'2099-01-01',startTime:'08:00',endTime:'09:00'};
 let writes=0,focused=0,rendered=0,scrolled=0;
 const input=value=>({value});
 const context=vm.createContext({
  assert,selectedOwnBookingId:'one',highlightedOwnBookingId:'',myBookings:[booking,{id:'other',status:'approved'}],bookings:[],
  currentUserEmail:'owner@example.com',readCurrentUserEmail:()=> 'owner@example.com',
  hasFirestore:true,roomsLoaded:true,bookingsLoaded:true,roomsLoadFailed:false,bookingsLoadFailed:false,
  cancelBookingSelect:input('one'),cancelReasonInput:input('reason'),rescheduleBookingSelect:input('one'),
  rescheduleRoomSelect:input('new'),rescheduleDateInput:input('2099-02-01'),rescheduleStartTimeInput:input('10:00'),rescheduleEndTimeInput:input('11:00'),rescheduleReasonInput:input('reason'),
  meetingRooms:[{id:'new',name:'New room'}],BOOKING_COLLECTION_NAME:'bookings',
  findBooking:()=>booking,isUpcomingBooking:()=>true,parseBookingStartDateTime:()=>new Date('2099-01-01'),
  normalizeStatus:v=>v,normalizeRoomBookingAccess:()=> 'public',isStaffUser:()=>true,
  toDateTime:(date,time)=>new Date(date+'T'+time),getNoShowRestriction:()=>({restricted:false}),hasOverlap:()=>false,
  firestore:{db:{},doc:()=>({}),serverTimestamp:()=>1,updateDoc:async()=>{if(fail)throw Error('offline');writes++;}},
  writeAuditLog:async()=>{},pickBookingAuditFields:v=>v,window:{},
  setCancelMessage:()=>{},setRescheduleMessage:()=>{},renderOwnBookingOptions:()=>{},updateManageActionUI:()=>{},renderMyRequests:()=>rendered++,
  myRequestsNotice:{hidden:true,textContent:''},myRequestsTitle:{focus:()=>focused++},
  document:{getElementById:()=>({scrollIntoView:()=>scrolled++})},
  myRequestsBody:{querySelectorAll:()=>[{dataset:{myBookingId:'one'},scrollIntoView:()=>scrolled++}]}
 });
 vm.runInContext([extract('clearManageDraft'),extract('completeManageRequest'),extract(action),`globalThis.submit=${action};`].join('\n'),context);
 await context.submit();
 assert.equal(writes,fail?0:1);
 assert.equal(context.selectedOwnBookingId,fail?'one':'');
 assert.equal(context.highlightedOwnBookingId,fail?'':'one');
 assert.equal(context.myRequestsNotice.hidden,fail);
 assert.equal(focused,fail?0:1);assert.equal(rendered,fail?0:1);assert.equal(scrolled,fail?0:2);
 assert.equal(context.myBookings[1].status,'approved');
 if(fail){assert.equal(context.cancelReasonInput.value,'reason');assert.equal(context.myBookings[0].status,'approved');}
 else {
  assert.equal(context.cancelReasonInput.value,'');
  assert.equal(context.myBookings[0].status,action==='cancelOwnBooking'?'cancel_requested':'reschedule_requested');
  assert.match(context.myRequestsNotice.textContent,/รอสตาฟอนุมัติ/);
 }
}
// Read-only requests stay in the list without opening a modal or the editing form.
let click,opened=0;
const context=vm.createContext({manageRequestSubmitting:false,currentUserEmail:'owner@example.com',myRequestsBody:{addEventListener:(_event,fn)=>click=fn},findBooking:()=>({id:'one',requesterEmail:'owner@example.com'}),ownReschedulableBookings:()=>[],openBookingDetailModal:(_booking,options)=>{assert.equal(options.allowStatusEdit,false);opened++;}});
const start=source.indexOf('  myRequestsBody?.addEventListener("click"');
vm.runInContext(source.slice(start,source.indexOf('\n  });',start)+6),context);
click({target:{closest:()=>({dataset:{myBookingId:'one'}})}});assert.equal(opened,0);
console.log('Manage success: cancel/reschedule return to highlighted list, preserve other bookings, focus confirmation; write failures retain draft; read-only rows stay in the list without a modal.');

// Render real rows: only editable requests expose a button; all purposes remain in the list.
const rowsContext=vm.createContext({
 myRequestsBody:{innerHTML:''},myRequestsState:{},myRequestsWrapper:{},
 currentUserEmail:'owner@example.com',myBookingsLoaded:true,myBookingsLoadFailed:false,hasFirestore:true,
 selectedOwnBookingId:'',highlightedOwnBookingId:'waiting',
 myBookings:[{id:'editable',status:'approved',requesterEmail:'owner@example.com',date:'2099-01-01',purpose:'Editable purpose'},
 {id:'waiting',status:'reschedule_requested',requesterEmail:'owner@example.com',date:'2099-01-01',purpose:'Waiting purpose',rescheduleRequestReason:'Change reason'}],
 getMyBookingsStartDate:()=> '2026-01-01',isUpcomingBooking:()=>true,
 ownReschedulableBookings:()=>[{id:'editable'}],escapeText:value=>String(value??''),
 normalizeRoomDisplay:()=> 'Room',formatDate:value=>value??'',statusText:value=>value,statusBadgeClass:()=>'',
 deriveRequesterProfileType:()=> 'student',getRequesterProfileTypeLabel:()=> 'Student'
});
vm.runInContext(`${extract('renderMyRequests')}\nrenderMyRequests();`,rowsContext);
const renderedRows=rowsContext.myRequestsBody.innerHTML;
assert.equal((renderedRows.match(/<button/g)||[]).length,1);
assert.ok(!renderedRows.includes('aria-haspopup'));
assert.ok(!renderedRows.includes('meetingBookingDetailModal'));
assert.match(renderedRows,/Waiting purpose/);
assert.match(renderedRows,/Change reason/);
assert.match(renderedRows,/is-selected/);
console.log('Request rows: editable button only, no modal affordances, full purpose and change reason retained.');
