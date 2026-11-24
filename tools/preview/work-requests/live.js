/* Real data adapter. No write APIs, admin credentials, or persistent record cache. */
(() => {
 window.sgcuWorkLive = true;
 const $ = id => document.getElementById(id);
 $('work-panel').dataset.live = 'true';
 const definitions = [
  ['budget','budgetApprovalRequests','budget-approval-staff','requester.accountEmail'],
  ['borrow','borrowAssetRequests','borrow-assets-staff','requesterEmail'],
  ['meeting','meetingRoomBookings','meeting-room-staff','requesterEmail'],
  ['temporary','authEmailAccess','staff-temporary-access-staff','email'],
  ['representative','organizationRepresentativeApplications','org-representative-approval-staff','applicantEmail']
 ];
 const queueStatuses = {representative:['pending'],budget:['pending','reviewing'],borrow:['pending','approved','received'],meeting:['pending','cancel_requested','reschedule_requested']};
 const labels = {budget:'งบประมาณ',borrow:'พัสดุ',meeting:'ห้องประชุม',temporary:'สิทธิ์ชั่วคราว',representative:'ตัวแทนองค์กร'};
 let state = {}, signature = '', generation = 0, stops = [], results = new Map(), statuses = new Map(), roomNames = new Map(), meetingSnapshots = new Map(), adminSnapshots = new Map();
 window.sgcuWorkPreviewShell = { render(mode,role) {
  const toggle = document.querySelector('#work-panel .page-switch');
  toggle.hidden = role === 'user'; toggle.style.display = role === 'user' ? 'none' : 'flex'; toggle.dataset.mode=mode;
  window.sgcuWorkPaintCounts?.(mode);
  toggle.querySelectorAll('[data-staff-mode]').forEach(b => { b.classList.toggle('is-active',b.dataset.staffMode===mode);b.setAttribute('aria-pressed',String(b.dataset.staffMode===mode)); });
 }};
 function dateText(value) {
  if (!value) return '';
  const d = value.toDate?.() || (value.seconds ? new Date(value.seconds*1000) : new Date(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'});
 }
 const isAdminService = service => ['temporary','representative'].includes(service);
 const allowedStaffService = (service,page) => state.hasStaff && (!isAdminService(service) || state.isHeadStaff) && (state.allowedPages || []).includes(page);
 const millis = value => value?.toMillis?.() ?? (value?.seconds !== undefined ? value.seconds*1000 : value ? new Date(value).getTime() : NaN);
 function nextStep(service,status,mode,data={}) {
  const wait='รอการดำเนินการจากผู้เกี่ยวข้อง';
  if(service==='budget') {
   if(status==='pending') return mode==='staff'?'รอพิจารณาคำขอ':wait;
   if(status==='reviewing') return mode==='staff'?'อยู่ระหว่างการพิจารณา':wait;
   if(status==='approved' && mode==='normal') {
    const raw=String(data.budgetRoundYear || data.academicYear || data.year || '').trim();
    const match=raw.match(/(?:25|20)\d{2}/);
    if(!match) return 'จัดแก้เอกสารตามมติที่ประชุม และตรวจสอบช่องทางส่งเอกสารของปีการศึกษานี้';
    const year=Number(match[0])<2400?String(Number(match[0])+543):match[0];
    const body=globalThis.SGCU_APP_CONFIG?.documents?.signersByAcademicYear?.[year]?.approvalMeetingBody || 'สภานิสิต';
    return body==='สภานิสิต'?'จัดแก้เอกสารตามมติที่ประชุม เตรียมเข้าที่ประชุมสภา':'จัดแก้เอกสารตามมติที่ประชุม เตรียมส่งเข้ากองกิจ';
   }
  }
  if(service==='borrow') {
   if(status==='pending') return mode==='staff'?'รอพิจารณาคำขอ':wait;
   if(status==='approved') return mode==='staff'?'รอส่งมอบพัสดุ':'รับพัสดุตามวันและเวลาที่กำหนด';
   if(status==='received') return mode==='staff'?'รอรับคืนพัสดุ':'คืนพัสดุตามวันและเวลาที่กำหนด';
  }
  if(service==='meeting') {
   if(status==='pending') return mode==='staff'?'รอพิจารณาคำขอ':wait;
   if(status==='approved' && mode==='normal') return 'เข้าใช้ห้องตามวันและเวลาที่ได้รับอนุมัติ';
   if(status==='cancel_requested') return mode==='staff'?'รอพิจารณาคำขอยกเลิก':wait;
   if(status==='reschedule_requested') return mode==='staff'?'รอพิจารณาคำขอเปลี่ยนแปลง':wait;
  }
  if(service==='temporary') {
   if(status==='รออนุมัติ') return mode==='staff'?'รอพิจารณาคำขอ':wait;
   if(status==='รอเริ่ม' && mode==='normal') return 'รอถึงกำหนดเริ่มใช้งานสิทธิ์';
   if(status==='ใช้งานได้' && mode==='normal') return 'ใช้งานได้ตามระยะเวลาที่ได้รับอนุมัติ';
   if(status==='ใกล้หมดอายุ') return mode==='staff'?'ตรวจสอบสิทธิ์ที่ใกล้หมดอายุ':'สิทธิ์กำลังจะหมดอายุ';
  }
  if(service==='representative' && status==='pending' && mode==='staff') return 'รอพิจารณาคำขอเป็นตัวแทนองค์กร';
  return null;
 }
 function normalizeAdmin(service,doc,mode) {
  const d=doc.data(), status=String(d.status || '').trim().toLowerCase();
  let text={pending:'รออนุมัติ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ'}[status] || 'ไม่ระบุสถานะ',bucket=status==='pending'?(mode==='staff'?'action':'waiting'):'done',due=null,tone=status==='rejected'?'rejected':status==='approved'?'approved':'pending';
  let deadline='ไม่ระบุกำหนดการ';
  if(service==='temporary') {
   const now=Date.now(),start=millis(d.startsAt),end=millis(d.endsAt);
   const expiring=!['pending','rejected'].includes(status) && d.active===true && start<=now && end>now && end<=now+7*86400000;
   if(mode==='staff' && status!=='pending' && !expiring) return null;
   if(!['pending','rejected'].includes(status)) {
    text=d.active!==true?'ปิดสิทธิ์':start>now?'รอเริ่ม':end<=now?'หมดอายุ':expiring?'ใกล้หมดอายุ':'ใช้งานได้';
    bucket=expiring?(mode==='staff'?'action':'ready'):text==='ใช้งานได้'?'ready':text==='รอเริ่ม'?'waiting':'done';
    tone=['ปิดสิทธิ์','หมดอายุ','ใกล้หมดอายุ'].includes(text)?'warning':text==='รอเริ่ม'?'pending':'approved';
    due=expiring?Math.ceil((end-now)/86400000):null;
   }
   deadline=Number.isFinite(end)?'สิ้นสุดสิทธิ์ '+dateText(d.endsAt):'ยังไม่กำหนดช่วงสิทธิ์';
  } else {
   if(d.requestType!=='organization_representative') return null;
   if(mode==='staff' && status!=='pending') return null;
  }
  const next=nextStep(service,service==='temporary'?text:status,mode,d);
  if(!next) return null;
  const org=String(d.organizationName || (typeof d.organization==='string'?d.organization:d.organization?.organizationName) || d.organization?.name || 'ไม่ระบุองค์กร');
  const person=String(d.name || d.applicant?.displayName || d.applicant?.name || d.requester?.displayName || d.applicantName || d.applicantEmail || d.email || 'ไม่ระบุผู้ยื่น');
  return {id:`${mode}-${service}-${encodeURIComponent(doc.id)}`,requestNo:d.requestNo || '',mode,service,title:person,org,status:text,bucket,due,badgeTone:tone,deadline,
   next, note:d.staffNote || d.reviewReason || d.rejectionReason || '',
   steps:[d.createdAt || d.requestedAt?'ยื่นคำขอ · '+dateText(d.createdAt || d.requestedAt):null,text+(d.updatedAt?' · '+dateText(d.updatedAt):'')].filter(Boolean)};
 }
 function normalize(service,doc,mode) {
  if(isAdminService(service)) return normalizeAdmin(service,doc,mode);
  const d=doc.data(), status=String(d.status || 'unknown').trim().toLowerCase();
  if (['true','1','yes','y'].includes(String(d.isDeleted).toLowerCase())) return null;
  const statusNames={pending:'รอพิจารณา',reviewing:'กำลังตรวจสอบ',approved:'อนุมัติแล้ว',received:'รับพัสดุแล้ว',returned:'คืนเรียบร้อย',completed:'เสร็จสิ้น',rejected:'ไม่อนุมัติ',cancelled:'ยกเลิก',cancel_requested:'รอพิจารณายกเลิก',reschedule_requested:'รอพิจารณาเปลี่ยนเวลา'};
  const done=['returned','completed','rejected','cancelled','no_show'].includes(status);
  const staffAction=mode==='staff' && (['pending','reviewing','cancel_requested','reschedule_requested'].includes(status) || service==='borrow' && ['approved','received'].includes(status));
  let bucket=done?'done':staffAction?'action':service==='borrow' && mode==='normal' && ['approved','received'].includes(status)?'action':status==='approved'?'ready':'waiting';
  const date=service==='meeting'?d.date:service==='borrow'?(status==='received'?d.returnDate:d.pickupDate):null;
  const deadlineMs=date ? Date.parse(`${date}T${service==='meeting'?(d.endTime || '23:59'):'23:59'}:00+07:00`):NaN;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let due=Number.isFinite(deadlineMs)?Math.round((Date.parse(`${date}T00:00:00+07:00`)-Date.parse(`${today}T00:00:00+07:00`))/86400000):null;
  if(service==='meeting' && status==='approved' && deadlineMs<Date.now()) {bucket='done';due=null;}
  if(mode==='staff' && service==='meeting' && deadlineMs<Date.now()) return null;
  if(bucket==='done') return null;
  const next=nextStep(service,status,mode,d);
  if(!next) return null;
  if(service==='budget' && status==='approved') bucket='action';
  let org=d.organizationName || d.projectDept || d.organization || d.requester?.organizationName || (typeof d.requester==='string'?d.requester:'') || 'ไม่ระบุหน่วยงาน';
  if(service==='budget' && d.estimatedExpense!==undefined && Number.isFinite(Number(d.estimatedExpense))) org+=` · ${Number(d.estimatedExpense).toLocaleString('th-TH')} บาท`;
  const serviceStatus = service === 'budget' ? ({pending:'รออนุมัติ', reviewing:'กำลังพิจารณา', approved:'ผ่านที่ประชุมนายกหรืออนุกรรมการ', cancelled:'ยกเลิกหรือเลื่อนไปผ่านครั้งอื่น'})[status] : service === 'borrow' ? ({approved:'พร้อมรับพัสดุ', received:'รอคืนพัสดุ'})[status] : status === 'no_show' ? 'ไม่มาใช้ห้อง' : status === 'rejected' && d.cancelledByRequester ? 'ยกเลิกแล้ว' : null;
  const displayStatus = serviceStatus || statusNames[status] || status;
  const badgeTone = status === 'rejected' && !d.cancelledByRequester ? 'rejected' : ['cancelled','no_show'].includes(status) || d.cancelledByRequester ? 'warning' : ['approved','returned','completed'].includes(status) ? 'approved' : status === 'reviewing' ? 'reviewing' : 'pending';
  const roomId = String(d.roomId || '').trim();
  const savedRoomName = String(d.roomName || '').trim();
  const roomName = roomNames.get(roomId) || (savedRoomName && savedRoomName !== roomId ? savedRoomName : 'ห้องประชุม (ไม่พบชื่อ)');
  const title=service==='meeting'?roomName:d.projectName || d.borrowProjectName || (d.assets || []).map(x=>x.name).filter(Boolean).join(', ');
  const updated=dateText(d.updatedAt),created=dateText(d.createdAt || d.createdDate);
  const steps=[created?'ยื่นคำขอ · '+created:null,`${displayStatus}${updated?' · '+updated:''}`].filter(Boolean);
  return {id:`${mode}-${service}-${encodeURIComponent(doc.id)}`,requestNo:String(d.requestNo || d.projectCodeGenerated || d.bookingNo || '').trim(),purpose:service==='meeting'?String(d.purpose || d.projectName || '').trim():'',mode,service,badgeTone,organization:org.split(' · ')[0],title:title || 'รายการไม่ระบุชื่อ',org,status:bucket==='done' && status==='approved'?'สิ้นสุดเวลาจอง':displayStatus,bucket,due,
   deadline:date?`${dateText(date)}${service==='meeting'?' · '+(d.startTime || '—')+'–'+(d.endTime || '—')+' น.':''}`:updated?'อัปเดต '+updated:'ไม่ระบุกำหนดการ',
   next, note:d.staffNote || d.reviewReason || d.rejectionReason || '',steps};
 }
 window.sgcuWorkPaintCounts = (mode = window.sgcuTourAccount?.().mode || 'normal') => {
  const data=[...results.values()].flat();
  for(const link of document.querySelectorAll('a[data-page="account-work"]')) {
   const scope=link.closest('[data-role-nav]')?.dataset.roleNav;
   const navMode=scope==='staff'?'staff':scope==='general'?'normal':mode;
   const count=data.filter(row=>row.mode===navMode && row.bucket==='action').length;
   let badge=link.querySelector('.work-menu-count');
   if(!badge) {badge=document.createElement('span');badge.className='staff-menu-count work-menu-count';link.append(badge);}
   badge.hidden=!count;badge.textContent=count>99?'99+':String(count);badge.setAttribute('aria-label',`รายการที่ต้องดำเนินการ ${count} รายการ`);
   link.classList.toggle('has-staff-menu-count',count>0);
  }
 };
 function publish() {
  document.querySelectorAll('header a[data-page="login"]').forEach(link => {link.textContent=state.isAuthenticated?'ข้อมูลบัญชี':'เข้าสู่ระบบ';});
  window.sgcuWorkAllowedServices = definitions.filter(([service, ,page]) => allowedStaffService(service,page)).map(([service]) => service);
  window.sgcuWorkPreview?.setLiveState([...results.values()].flat(),!!state.hasStaff && window.sgcuWorkAllowedServices.length > 0);
  const messages=[...statuses].filter(([,value])=>value!=='โหลดแล้ว').map(([key,value])=>key==='rooms:catalog' ? `ทะเบียนห้อง: ${value}` : `${labels[key.split(':')[0]]} (${key.endsWith('staff')?'สตาฟ':'ของฉัน'}): ${value}`);
  $('live-work-status').textContent=state.isAuthenticated?messages.join(' · '):'เข้าสู่ระบบด้วยบัญชีของคุณเพื่อดูคำขอจริง';
  $('live-work-status').hidden = state.isAuthenticated && messages.length === 0;
  const empty=$('empty-state');
  empty.querySelector('h3').textContent=[...statuses.values()].some(s=>s==='กำลังโหลด')?'กำลังโหลดข้อมูลจริง…':'ไม่มีรายการที่แสดงได้';
  empty.querySelector('p').textContent='ตรวจตัวกรองและสถานะการโหลดด้านบน';
 }
 function sync(next) {
  state=next || {};
  const key=JSON.stringify([state.isAuthenticated,state.email,state.hasStaff,state.isHeadStaff,state.allowedPages]);
  if(key===signature) return;
  signature=key; const current=++generation;
  stops.forEach(stop=>stop());stops=[];results.clear();statuses.clear();roomNames.clear();meetingSnapshots.clear();adminSnapshots.clear();publish();
  if(!state.isAuthenticated || !state.email) return;
  const f=window.sgcuFirestore;
  if(!f?.db) {signature='';$('live-work-status').textContent='ฐานข้อมูลยังไม่พร้อม กรุณารีเฟรชแล้วลองอีกครั้ง';return;}
  const collections=globalThis.SGCU_APP_CONFIG?.firestore?.collections || {};
  for(const [service,collection,page,ownerField] of definitions) {
   for(const mode of ['normal','staff']) {
    if(service==='representative' && mode==='normal') continue;
    if(mode==='staff' && !allowedStaffService(service,page)) continue;
    const id=`${service}:${mode}`;statuses.set(id,'กำลังโหลด');
    const ownerEmail = service === 'budget' ? (window.sgcuNormalizeAccountEmail?.(state.email) || state.email.replace(/^(\d{10})@alumni\.chula\.ac\.th$/, '$1@student.chula.ac.th')) : state.email;
    const constraints=mode==='normal'?[f.where(ownerField,'==',ownerEmail)]:service==='temporary'?[]:[f.where('status','in',queueStatuses[service])];
    constraints.push(f.limit(300));
    const ref=service==='temporary' && mode==='normal' ? f.doc(f.db,collections[collection] || collection,state.email) : f.query(f.collection(f.db,collections[collection] || collection),...constraints);
    try { stops.push(f.onSnapshot(ref,snapshot=>{
     if(current!==generation)return;
     const docs=service==='temporary' && mode==='normal' ? (snapshot.exists()? [snapshot]:[]) : snapshot.docs;
     adminSnapshots.set(id,{service,mode,docs});
     if (service === 'meeting') meetingSnapshots.set(mode, docs);
     results.set(id,docs.map(doc=>normalize(service,doc,mode)).filter(Boolean));
     statuses.set(id,snapshot.size===300?'แสดงไม่เกิน 300 รายการ':'โหลดแล้ว');publish();
    },error=>{if(current!==generation)return;if(service==='meeting') meetingSnapshots.delete(mode);adminSnapshots.delete(id);results.delete(id);statuses.set(id,error.code==='permission-denied'?'ไม่มีสิทธิ์อ่านข้อมูล':'โหลดไม่สำเร็จ ('+(error.code || 'unknown')+')');publish();})); }
    catch {statuses.set(id,'เชื่อมต่อไม่ได้');}
   }
  }
  try {
   stops.push(f.onSnapshot(f.collection(f.db,collections.meetingRooms || 'meetingRooms'), snapshot => {
    if(current!==generation) return;
    roomNames.clear();
    for(const doc of snapshot.docs) {
     const name=String(doc.data().name || '').trim();
     if(doc.id !== '__catalog' && name) roomNames.set(doc.id,name);
    }
    for(const [mode, docs] of meetingSnapshots) results.set(`meeting:${mode}`, docs.map(doc=>normalize('meeting',doc,mode)).filter(Boolean));
    statuses.delete('rooms:catalog');publish();
   }, () => {if(current!==generation)return;statuses.set('rooms:catalog','โหลดชื่อห้องไม่สำเร็จ ใช้ชื่อที่บันทึกในคำขอ');publish();}));
  } catch {statuses.set('rooms:catalog','โหลดชื่อห้องไม่สำเร็จ');}
  publish();
 }
 window.addEventListener('sgcu:staff-auth-updated',e=>sync(e.detail));
 window.addEventListener('sgcu:auth-state',e=>{if(e.detail?.isAuthenticated===false)sync({});});
 function refreshRows() { if (!adminSnapshots.size) return; for (const [id,{service,mode,docs}] of adminSnapshots) results.set(id,docs.map(doc=>normalize(service,doc,mode)).filter(Boolean)); publish(); }
 window.setInterval?.(refreshRows,60000);
 Promise.resolve(window.sgcuRuntimeConfigReady).then(refreshRows).catch(()=>{});
 window.addEventListener('pagehide',()=>{generation++;stops.forEach(stop=>stop());});
 document.addEventListener('DOMContentLoaded',()=>{
  publish();
  document.querySelector('#work-panel .page-title').textContent='งานและคำขอ';
 });
})();
