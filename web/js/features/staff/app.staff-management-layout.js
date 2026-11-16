// Presentation only: all reads, mutations and authorization stay in the real staff feature.
window.addEventListener('DOMContentLoaded', () => {
 const $=id=>document.getElementById(id);
 const page=document.querySelector('section.page-view[data-page="staff-approval"]');
 if(!page)return;
 const connectionMessage=$('staffPositionManageMessage');
 const diagnostic=document.createElement('div');diagnostic.hidden=true;
 const diagnosticButton=document.createElement('button');diagnosticButton.type='button';diagnosticButton.className='btn-ghost';diagnosticButton.textContent='ตรวจการเชื่อมต่อ';
 const diagnosticOutput=document.createElement('pre');diagnosticOutput.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;user-select:text';diagnosticOutput.setAttribute('role','status');
 diagnostic.append(diagnosticButton,diagnosticOutput);connectionMessage.after(diagnostic);
 new MutationObserver(()=>{diagnostic.hidden=!connectionMessage.textContent.includes('permission-denied')}).observe(connectionMessage,{childList:true,subtree:true});
 diagnosticButton.onclick=async()=>{
   diagnosticButton.disabled=true;diagnosticOutput.textContent='กำลังตรวจการอ่านข้อมูล ไม่มีการบันทึกหรือเปลี่ยนสิทธิ์…';
   try { const result=await window.sgcuStaffConnectionDiagnostics({auth:window.sgcuAuth?.auth,store:window.sgcuFirestore,collection:window.SGCU_APP_CONFIG?.firestore?.collections?.staffPositionCatalog||'staffPositionCatalog'});diagnosticOutput.textContent=JSON.stringify(result,null,2); }
   catch { diagnosticOutput.textContent='ตรวจไม่สำเร็จ กรุณาลองใหม่'; }
   finally { diagnosticButton.disabled=false; }
 };
 const nav=document.createElement('nav');nav.className='mobile-dashboard-action-bar staff-live-nav';nav.setAttribute('aria-label','เมนูย่อยสตาฟและคำขอ');
 for(const [key,label,icon] of [['filters','ตัวกรอง','⌕'],['pending','คำขอ','✓'],['current','สตาฟ','♙'],['positions','ตำแหน่ง','▦'],['select','เลือกรายการ','☑']]){
 const button=document.createElement('button');button.type='button';button.className='mobile-dashboard-action';button.dataset.action=key;
 const mark=document.createElement('span');mark.className='mobile-dashboard-action-icon';mark.textContent=icon;mark.setAttribute('aria-hidden','true');const text=document.createElement('span');text.textContent=label;button.append(mark,text);nav.append(button);
 }
 document.body.append(nav);
 const dialog=document.createElement('dialog');dialog.className='staff-live-filter-dialog mobile-filter-dialog';dialog.setAttribute('aria-labelledby','staff-live-filter-title');
 dialog.innerHTML='<header class="mobile-filter-header"><div><h2 id="staff-live-filter-title" class="mobile-filter-title">ตัวกรองสมาชิกและคำขอ</h2><p class="mobile-filter-caption">กรองตามฝ่าย ตำแหน่ง หรือค้นหาชื่อและอีเมล</p></div><button type="button" class="mobile-filter-close" aria-label="ปิดตัวกรอง">×</button></header><div class="mobile-filter-body"></div><footer class="mobile-filter-footer"><button type="button" class="btn-ghost mobile-filter-reset">ล้างตัวกรอง</button><button type="button" class="btn-primary mobile-filter-done">เสร็จ</button></footer>';
 document.body.append(dialog);
 const filterBody=dialog.querySelector('.mobile-filter-body');
 const filterTrigger=nav.querySelector('[data-action="filters"]');filterTrigger.setAttribute('aria-haspopup','dialog');filterTrigger.setAttribute('aria-expanded','false');
 const filters=$('staffApprovalFilters');const placeholder=document.createComment('staff filters');filters.before(placeholder);
 function restoreFilters(){placeholder.after(filters);filterTrigger.setAttribute('aria-expanded','false')}
 dialog.querySelector('.mobile-filter-close').onclick=()=>dialog.close();dialog.querySelector('.mobile-filter-done').onclick=()=>dialog.close();
 dialog.querySelector('.mobile-filter-reset').onclick=()=>$('staffApprovalFilterResetBtn').click();
 dialog.addEventListener('close',restoreFilters);
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()});
 window.matchMedia('(max-width:840px)').addEventListener('change',event=>{if(!event.matches&&dialog.open)dialog.close()});
 function positions(){return !$('staffPositionSettingsView').hidden}
 function current(){return $('staffApprovalShowHistoryBtn').getAttribute('aria-selected')==='true'}
 function sync(){
 const active=page.classList.contains('active');nav.classList.toggle('is-visible',active);document.body.classList.toggle('staff-live-active',active);
 for(const button of nav.children){const key=button.dataset.action;const selected=key===(positions()?'positions':current()?'current':'pending');button.classList.toggle('is-active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');if(key==='select'){button.hidden=false;button.lastElementChild.textContent=positions()?'เพิ่มตำแหน่ง':'เลือกรายการ';button.firstElementChild.textContent=positions()?'+':'☑';button.setAttribute('aria-label',positions()?'เพิ่มตำแหน่งใหม่':'เลือกหลายรายการ');const original=$(current()?'staffCurrentSelectionToggleBtn':'staffApprovalSelectionToggleBtn');button.setAttribute('aria-pressed',positions()?'false':original.getAttribute('aria-pressed')||'false')}if(key==='filters')button.setAttribute('aria-label',positions()?'กรองฝ่ายในรายการตำแหน่ง':'เปิดตัวกรองสตาฟ')}
 if(!active&&dialog.open)dialog.close();
 }
 nav.onclick=event=>{const button=event.target.closest('[data-action]');if(!button)return;const key=button.dataset.action;
 if(key==='positions')$('staffManagementPositionTab').click();
 else if(key==='pending'||key==='current'){$('staffManagementPeopleTab').click();$(key==='pending'?'staffApprovalShowPendingBtn':'staffApprovalShowHistoryBtn').click()}
 else if(key==='select'){if(positions()){if(!$('staffPositionManageCancelBtn').hidden)$('staffPositionManageCancelBtn').click();$('staffPositionManagePanel').scrollIntoView({block:'start',behavior:'smooth'});$('live-division-select').focus({preventScroll:true})}else $(current()?'staffCurrentSelectionToggleBtn':'staffApprovalSelectionToggleBtn').click();}
 else if(positions()){ $('live-position-filter').scrollIntoView({block:'center',behavior:'smooth'});$('live-position-filter').focus({preventScroll:true}) }
 else{filterBody.append(filters);dialog.showModal();filterTrigger.setAttribute('aria-expanded','true')}
 sync();
 };
 new MutationObserver(sync).observe(page,{attributes:true,attributeFilter:['class']});
 for(const id of ['staffPositionSettingsView','staffApprovalShowHistoryBtn','staffCurrentSelectionToggleBtn','staffApprovalSelectionToggleBtn'])new MutationObserver(sync).observe($(id),{attributes:true,attributeFilter:['hidden','aria-selected','aria-pressed']});
 const list=$('staffPositionList');const panel=list.closest('.panel');const header=panel.querySelector('.panel-header');const caption=header.querySelector('.panel-caption');header.querySelector('.panel-title').textContent='ตำแหน่งที่ใช้งาน';
 const filter=document.createElement('select');filter.id='live-position-filter';filter.className='login-input live-position-filter';filter.setAttribute('aria-label','กรองฝ่าย');header.append(filter);

 const form=$('staffPositionManageForm'), code=$('staffPositionDivisionCode'), divisionName=$('staffPositionDivisionName'), level=$('staffPositionLevelCode');
 const originalName=$('staffPositionManageInput');originalName.placeholder='เลือกฝ่ายและระดับตำแหน่ง';
 $('staffPositionManagePanel').querySelector('.panel-caption').textContent='เพิ่มและแก้ไขตำแหน่งสำหรับฟอร์มสมัครสตาฟ';
 const codeField=code.closest('.staff-position-field'), nameField=divisionName.closest('.staff-position-field');
 codeField.hidden=true;nameField.hidden=true;
 const divisionField=document.createElement('div');divisionField.className='staff-position-field live-division-field';
 divisionField.innerHTML='<div class="live-field-heading"><label class="login-label" for="live-division-select">ฝ่าย / หมวดงาน</label><button type="button" class="live-text-button" id="live-add-division">+ เพิ่มฝ่ายใหม่</button></div><select id="live-division-select" class="login-input" required><option value="">เลือกฝ่าย / หมวดงาน</option></select>';
 form.prepend(divisionField);
 const divisionSelect=$('live-division-select');
 const newLabel=nameField.querySelector('label');newLabel.textContent='ชื่อฝ่ายใหม่';
 const note=document.createElement('span');note.className='live-label-note';note.textContent=' (ระบบกำหนดให้อัตโนมัติ)';newLabel.append(note);
 const back=document.createElement('button');back.type='button';back.className='live-text-button';back.textContent='เลือกฝ่ายเดิม';
 const newHeading=document.createElement('div');newHeading.className='live-field-heading';newLabel.before(newHeading);newHeading.append(newLabel,back);
 const fixed=document.createElement('output');fixed.className='login-input live-fixed-level';fixed.hidden=true;level.after(fixed);
 const special=document.createElement('span');special.className='live-label-note';special.textContent=' (ใช้ชื่อตำแหน่งเฉพาะของหมวดนี้)';special.hidden=true;level.closest('.staff-position-field').querySelector('label').append(special);
 const result=originalName.closest('.staff-position-field');result.classList.add('live-result');
 const summary=document.createElement('span');summary.className='live-result-codes';result.append(summary);
 const context=document.createElement('p');context.className='live-edit-context';context.hidden=true;form.prepend(context);
 let adding=false,scheduled=false;
 const fire=(el,type)=>el.dispatchEvent(new Event(type,{bubbles:true}));
 function availableDivisions(){return [...filter.options].filter(o=>o.value).map(o=>({code:o.value,name:o.textContent.slice(3)}))}
 function syncForm(){
  scheduled=false;const editing=!$('staffPositionManageCancelBtn').hidden;
  if(!code.value){adding=false;divisionSelect.value=''}
  const divisions=availableDivisions();
  const divisionSignature=JSON.stringify(divisions);
  if(divisionSelect.dataset.liveChoices!==divisionSignature){
    divisionSelect.replaceChildren(new Option('เลือกฝ่าย / หมวดงาน',''));
    for(const d of divisions)divisionSelect.add(new Option(`${d.code} — ${d.name}`,d.code));
    divisionSelect.dataset.liveChoices=divisionSignature;
  }
  if(divisionSelect.value!==code.value)divisionSelect.value=code.value;
  divisionField.hidden=adding;nameField.hidden=!adding;divisionSelect.required=!adding;divisionSelect.disabled=adding||code.disabled;
  const yy=code.value,zz=level.value;const isFixed=['01','09','99'].includes(yy);
  special.hidden=!['00','01','09','99'].includes(yy);
  const choices=yy==='00'?[['01','เหรัญญิก'],['03','เลขานุการฝ่ายเหรัญญิก']]:isFixed?[['04',divisionName.value]]:[['01','ประธานฝ่าย'],['02','รองประธานฝ่าย'],['03','เลขานุการฝ่าย'],['04','ผู้ช่วยฝ่าย']];
  const signature=JSON.stringify(choices);
  if(level.dataset.liveChoices!==signature){level.replaceChildren(new Option(yy?'เลือกระดับตำแหน่ง':'เลือกฝ่ายก่อน',''));choices.forEach(([value,label])=>level.add(new Option(label,value)));level.value=zz;level.dataset.liveChoices=signature}
  level.hidden=isFixed;fixed.hidden=!isFixed;fixed.textContent=divisionName.value;
  if(isFixed&&level.value!=='04'){level.value='04';fire(level,'change')}
  level.required=!isFixed;level.disabled=!yy||code.disabled;special.hidden=!['00','01','09','99'].includes(yy);
  summary.textContent=`รหัสฝ่าย: ${yy||'—'}   รหัสระดับตำแหน่ง: ${level.value||'—'}`;
  context.hidden=!editing;context.textContent=`กำลังแก้ไข: ${originalName.value} · รหัสฝ่าย ${yy} / ระดับ ${level.value}`;
  $('staffPositionManagePanel').querySelector('.panel-title').textContent=editing?'แก้ไขตำแหน่ง':'เพิ่มตำแหน่งใหม่';
  $('staffPositionManageAddBtn').textContent=editing?'บันทึกการแก้ไข':'เพิ่มตำแหน่ง';
 }
 function scheduleForm(){if(!scheduled){scheduled=true;queueMicrotask(syncForm)}}
 divisionSelect.onchange=()=>{adding=false;code.value=divisionSelect.value;divisionName.value='';level.value='';fire(code,'change');scheduleForm()};
 $('live-add-division').onclick=()=>{const used=new Set(availableDivisions().map(d=>d.code));const next=Array.from({length:94},(_,i)=>String(i+5).padStart(2,'0')).find(n=>!used.has(n)&&n!=='09'&&n!=='99');if(!next)return;adding=true;code.value=next;divisionName.value='';level.value='';fire(code,'change');syncForm();divisionName.focus()};
 back.onclick=()=>{adding=false;code.value='';divisionName.value='';level.value='';fire(code,'change');scheduleForm()};
 // Native selects emit input before change. Do not restore the old model value
 // between those events: the change handler still needs the newly selected value.
 form.addEventListener('input',event=>{if(event.target===divisionName)scheduleForm()});
 form.addEventListener('change',scheduleForm);
 new MutationObserver(scheduleForm).observe($('staffPositionManageCancelBtn'),{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(scheduleForm).observe(code,{attributes:true,attributeFilter:['disabled']});
 window.addEventListener('sgcu:position-form-sync',scheduleForm);
 const pagesBox=$('staffPositionAllowedPages');
 const pagesHeading=pagesBox.parentElement.querySelector('label.login-label');
 const pageCount=document.createElement('span');pageCount.className='live-label-note';pagesHeading.append(pageCount);
 const pageObserver=new MutationObserver(arrangePages);
 function updatePageCount(){pageCount.textContent=` (${pagesBox.querySelectorAll('[data-role="page-checkbox"]:checked').length} หน้า)`}
 function arrangePages(){pageObserver.disconnect();const all=pagesBox.querySelector('.staff-position-page-option-all');const labels=[...pagesBox.querySelectorAll('.staff-position-page-option:not(.staff-position-page-option-all)')];if(labels.length){const scroll=document.createElement('div');scroll.className='live-pages-scroll staff-position-pages-grid';labels.forEach(label=>scroll.append(label));pagesBox.replaceChildren();if(all)pagesBox.append(all);pagesBox.append(scroll)}updatePageCount();pageObserver.observe(pagesBox,{childList:true})}
 pagesBox.addEventListener('change',()=>queueMicrotask(updatePageCount));arrangePages();
 const observer=new MutationObserver(groupPositions);
 function groupPositions(){observer.disconnect();const chips=[...list.querySelectorAll('[data-select-position-id]')];if(!chips.length){observer.observe(list,{childList:true});return}
 const selected=filter.value;filter.replaceChildren(new Option('ฝ่าย: ทุกฝ่าย',''));const groups=new Map();
 for(const chip of chips){const code=chip.dataset.divisionCode||'';if(!groups.has(code))groups.set(code,{name:chip.dataset.divisionName||'ฝ่าย '+code,items:[]});groups.get(code).items.push(chip)}
 list.replaceChildren();for(const [code,group] of [...groups].sort(([a],[b])=>a.localeCompare(b))){filter.add(new Option(`${code} ${group.name}`,code));const section=document.createElement('section');section.dataset.liveDivision=code;const heading=document.createElement('h4');heading.className='live-division-heading';heading.textContent=`ฝ่าย ${code}  ${group.name}`;section.append(heading);for(const chip of group.items.sort((a,b)=>a.dataset.levelCode.localeCompare(b.dataset.levelCode))){chip.classList.remove('is-editing');const name=chip.querySelector('.staff-position-chip-name');if(name&&!['00','01','09','99'].includes(code)){const titles={'01':'ประธานฝ่าย','02':'รองประธานฝ่าย','03':'เลขานุการฝ่าย','04':'ผู้ช่วยฝ่าย'};name.title=name.textContent;name.textContent=titles[chip.dataset.levelCode]||name.textContent}const pages=chip.querySelector('.staff-position-chip-pages');if(pages){const count=chip.dataset.pageCount;pages.textContent=`ระดับ ${chip.dataset.levelCode} · แสดง ${count} หน้า`}section.append(chip)}list.append(section)}
 filter.value=groups.has(selected)?selected:'';applyFilter();scheduleForm();observer.observe(list,{childList:true});
 }
 function applyFilter(){let count=0;for(const section of list.querySelectorAll('[data-live-division]')){section.hidden=Boolean(filter.value&&section.dataset.liveDivision!==filter.value);if(!section.hidden)count+=section.querySelectorAll('[data-select-position-id]').length}caption.textContent=`${count} ตำแหน่ง`}
 filter.onchange=applyFilter;groupPositions();scheduleForm();sync();
});
