/* Main-site project management: reuses the existing authenticated session. */
(function initProjectLive(){
const root=document.querySelector('.page-view[data-page="project-live-staff"]');
if(!root || root.dataset.liveMounted)return;root.dataset.liveMounted='true';
let datasetId=null;
const $=id=>root.querySelector(`[data-live-id="${id}"]`), node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
let offset=0,query='',generation=0,busy=false,matchedCount=0,filterOptions=[],activeProjectId=null,modalDirty=false;
const filters={year:'2568',group:'all',organization:'all'};
function message(text){$('message').textContent=text;$('modal-message').textContent=text;}
function closeModal(force=false){if(!force && (busy || (modalDirty && !confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างหรือไม่?'))))return; const opener=[...$('projects').querySelectorAll('button')].find(b=>b.dataset.projectId===activeProjectId);$('modal').close();opener?.focus();$('modal-body').replaceChildren();activeProjectId=null;modalDirty=false;document.body.classList.remove('project-live-modal-open');}
$('modal-close').onclick=()=>closeModal();
$('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)closeModal();}});

function syncPagination(){ $('previous').disabled=busy || offset===0; $('next').disabled=busy || offset+25>=matchedCount; }
const money=n=>n===null?'—':`${n<0?'-':''}${((BigInt(n)<0n?-BigInt(n):BigInt(n))/100n).toLocaleString('th-TH')}.${String((BigInt(n)<0n?-BigInt(n):BigInt(n))%100n).padStart(2,'0')}`;
async function api(action='',body){
  const user=window.sgcuAuth?.auth?.currentUser;
  if(!user)throw Error('กรุณาเข้าสู่ระบบผ่านเมนูเข้าสู่ระบบเดิม');
  const token=await user.getIdToken();
  const response=await fetch(globalThis.SGCU_APP_CONFIG.projectLive.apiUrl.replace(/\/$/,'')+action,{method:body===undefined?'GET':'POST',cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json();
  if(!response.ok){if([401,403].includes(response.status)){closeModal(true);$('data').hidden=true;$('projects').replaceChildren();$('events').replaceChildren();}throw Error(data.error);}
  return data;
}
async function operation(task){
  if(busy)return;busy=true;const current=generation;
  const controls=[...root.querySelectorAll('input,select,textarea')].map(el=>[el,el.disabled]);
  controls.forEach(([el])=>el.disabled=true);root.setAttribute('aria-busy','true');root.querySelectorAll('button').forEach(b=>b.disabled=true);message('กำลังดำเนินการ…');
  try{await task(current);if(current===generation)message('ดำเนินการแล้ว');}
  catch(e){if(current===generation)message(e.message);}
  finally{busy=false;root.setAttribute('aria-busy','false');controls.forEach(([el,disabled])=>{if(el.isConnected)el.disabled=disabled;});root.querySelectorAll('button').forEach(b=>b.disabled=false);root.querySelectorAll('[data-preview-required]').forEach(b=>b.disabled=true);syncPagination();}
}
function field(form,text,element){const label=node('label',text);label.append(element);form.append(label);return element;}
function editForm(p,state,status){
  const form=node('form'),output=node('div');output.setAttribute('aria-live','polite');form.append(node('h3',status?'เปลี่ยนสถานะ':'แก้ยอดเงิน'));
  let patch,controls=[];
  if(status){const group=field(form,'ช่องสถานะ',node('select')),value=field(form,'สถานะใหม่',node('select'));
    const groups=state.statusGroups.filter(g=>g.values.some(v=>v!==p.statuses[g.column] && state.projectStatusPermissions[p.id][g.column][v]==='direct'));
    if(!groups.length)return node('p','ไม่มีสถานะที่เปลี่ยนได้');
    for(const g of groups){const o=node('option',g.label);o.value=g.column;group.append(o);}
    const choices=()=>{value.replaceChildren();for(const v of groups.find(g=>g.column===group.value).values.filter(v=>v!==p.statuses[group.value] && state.projectStatusPermissions[p.id][group.value][v]==='direct')){const o=node('option',v);o.value=v;value.append(o);}};group.onchange=choices;choices();controls=[group,value];patch=()=>({projectId:p.id,version:p.version,field:group.value,value:value.value});
  }else{const inputs={};for(const col of ['O','V','AJ']){const input=node('input');input.type='text';input.inputMode='decimal';input.value=p.money[col]===null?'':money(p.money[col]).replaceAll(',', '');inputs[col]=field(form,state.moneyLabels[col],input);controls.push(input);}
    const direction=field(form,'ทิศทางโอน',node('select'));for(const v of ['','เพิ่ม','ลด']){const o=node('option',v||'ยังไม่ระบุ');o.value=v;direction.append(o);}direction.value=p.formulaInputs.transferDirection||'';controls.push(direction);
    patch=()=>({projectId:p.id,version:p.version,changes:{O:inputs.O.value,V:inputs.V.value,AJ:inputs.AJ.value,U:direction.value}});
  }
  const reason=field(form,'เหตุผล / หมายเหตุ',node('textarea'));reason.maxLength=1000;if(!status){reason.required=true;reason.minLength=3;}
  const preview=node('button','ดูผลก่อนบันทึก');preview.type='button';preview.className='btn-ghost';const save=node('button','ยืนยันบันทึก');save.type='submit';save.className='btn-primary';save.dataset.previewRequired='true';save.disabled=true;form.append(preview,save,output);
  let reviewed=null;
  const invalidate=()=>{reviewed=null;save.dataset.previewRequired='true';save.disabled=true;output.replaceChildren();};controls.forEach(control=>control.addEventListener('input',invalidate));
  preview.onclick=()=>operation(async current=>{const body=patch(),result=await api(status?'/status-preview':'/preview',body);if(current!==generation)return;reviewed=JSON.stringify(body);delete save.dataset.previewRequired;output.replaceChildren();if(status)output.append(node('p',`สถานะ: ${p.statuses[body.field]||'—'} → ${body.value}`));for(const col of Object.keys(state.moneyLabels))output.append(node('p',`${state.moneyLabels[col]}: ${money(result.before[col])} → ${money(result.after[col])} บาท`));});
  form.onsubmit=e=>{e.preventDefault();if(reviewed!==JSON.stringify(patch()))return;operation(async()=>{await api(status?'/status':'/commit',{...patch(),reason:reason.value});modalDirty=false;await refresh();});};return form;
}
function fillOptions(id,values,label){const select=$(id),value=select.value;select.replaceChildren();for(const name of ['all',...values]){const option=node('option',name==='all'?label:name);option.value=name;select.append(option);}select.value=values.includes(value)?value:'all';}
function updateOrgOptions(){fillOptions('organization',[...new Set(filterOptions.filter(o=>$('group').value==='all'||o.group===$('group').value).map(o=>o.name).filter(Boolean))],'ทุกฝ่าย / ทุกชมรม');}
function openProject(p,state){
 activeProjectId=p.id;modalDirty=false;$('modal-title').textContent=p.name;$('modal-meta').textContent=`${p.code} · ปีการศึกษา ${p.year||2568}`;$('modal-message').textContent='';
 const info=node('dl');info.className='project-live-detail-grid';
 for(const [label,value] of [['ประเภทองค์กร',p.organizationGroup],['ฝ่าย / ชมรม',p.organization],['ผู้รับผิดชอบตรวจโครงการ',p.responsibleName]]){const item=node('div');item.append(node('dt',label),node('dd',value||'ไม่ระบุ'));info.append(item);}
 const amounts=node('dl');amounts.className='project-live-money';for(const col of Object.keys(state.moneyLabels)){const item=node('div'),value=node('dd',money(p.money[col]));value.append(node('small','บาท'));item.append(node('dt',state.moneyLabels[col]),value);amounts.append(item);}
 const statuses=node('dl');statuses.className='project-live-detail-grid';for(const g of state.statusGroups){const item=node('div');item.append(node('dt',g.label),node('dd',p.statuses[g.column]||'ไม่ระบุ'));statuses.append(item);}
 const editors=node('div');editors.className='project-live-editors';editors.append(editForm(p,state,false),editForm(p,state,true));editors.addEventListener('input',()=>modalDirty=true);
 const heading=node('h3','ดำเนินการโครงการ');heading.className='project-live-action-heading';
 $('modal-body').replaceChildren(info,node('h3','ยอดเงินโครงการ'),amounts,node('h3','สถานะโครงการ'),statuses,heading,node('p','แก้ไขข้อมูล แล้วดูผลก่อนยืนยันบันทึกทุกครั้ง'),editors);
 if(!$('modal').open){$('modal-body').scrollTop=0;$('modal').showModal();document.body.classList.add('project-live-modal-open');}
}
async function refresh(){const current=generation,state=await api('?'+new URLSearchParams({q:query,offset,...filters}));if(current!==generation)return;
 offset=state.offset??offset;
 filterOptions=state.filterOptions?.organizations||[];
 fillOptions('group',[...new Set(filterOptions.map(o=>o.group).filter(Boolean))],'ทุกประเภทองค์กร');updateOrgOptions();
  $('data').hidden=false;$('admin').hidden=state.user.role!=='admin';datasetId=state.datasetId;$('events').replaceChildren();$('count').textContent=`พบ ${state.matchedCount} จาก ${state.totalCount} โครงการ · หน้า ${Math.floor(offset/25)+1}`;
  matchedCount=state.matchedCount;
  $('total').textContent=state.totalCount.toLocaleString('th-TH');$('matched').textContent=matchedCount.toLocaleString('th-TH');
  $('page').textContent=`หน้า ${Math.floor(offset/25)+1} / ${Math.max(1,Math.ceil(matchedCount/25))}`;
  $('clear').hidden=!query && filters.year==='2568' && filters.group==='all' && filters.organization==='all';$('empty').hidden=matchedCount!==0;$('history').setAttribute('aria-expanded','false');syncPagination();
  const b=state.automaticBackup;$('backup-status').textContent=b?.backupAt?`สำรองนอกเครื่องล่าสุด ${new Date(b.backupAt).toLocaleString('th-TH')} ${b.failed||b.overdue?'· ต้องตรวจสำรอง':''} · เก็บในพื้นที่ส่วนตัวบนคลาวด์`:'ยังไม่มีชุดสำรองอัตโนมัติที่ตรวจผ่าน';
  $('projects').replaceChildren();for(const p of state.projects){
    const row=node('button');row.type='button';row.dataset.projectId=p.id;row.className='project-live-row';row.setAttribute('aria-haspopup','dialog');row.setAttribute('aria-label',`ดูรายละเอียดและดำเนินการ ${p.code} ${p.name}`);
    const code=node('span',p.code);code.className='project-live-code';const title=node('span',p.name);title.className='project-live-name';
    const heading=node('span');heading.className='project-live-card-heading';heading.append(code,title);
    const budget=node('span',money(p.money.O));budget.className='project-live-row-budget';
    const statuses=node('span');statuses.className='project-live-statuses';
    for(const g of state.statusGroups){const badge=node('span',`${g.label}: ${p.statuses[g.column]||'—'}`);badge.className='pill pill-soft-gray';statuses.append(badge);}
    row.append(heading,statuses,budget);row.onclick=()=>openProject(p,state);$('projects').append(row);
  }
  if(activeProjectId){const project=state.projects.find(p=>p.id===activeProjectId);if(project)openProject(project,state);else closeModal(true);}
}
function applyFilters(){if(busy)return;query=$('query').value.trim();for(const key of Object.keys(filters))filters[key]=$(key).value;offset=0;operation(refresh);}
$('clear').onclick=()=>{if(busy)return;$('query').value='';$('year').value='2568';$('group').value='all';updateOrgOptions();$('organization').value='all';applyFilters();};
$('group').onchange=()=>{updateOrgOptions();applyFilters();};$('organization').onchange=applyFilters;$('year').onchange=applyFilters;
$('search').onsubmit=e=>{e.preventDefault();applyFilters();};
$('previous').onclick=()=>{if(busy || offset===0)return;offset=Math.max(0,offset-25);operation(refresh);};$('next').onclick=()=>{if(busy || offset+25>=matchedCount)return;offset+=25;operation(refresh);};
$('history').onclick=()=>{if(busy)return;if($('history').getAttribute('aria-expanded')==='true'){$('events').replaceChildren();$('history').setAttribute('aria-expanded','false');return;}operation(async current=>{const result=await api('/history');if(current!==generation)return;$('events').replaceChildren();$('history').setAttribute('aria-expanded','true');if(!result.audit.length)$('events').append(node('p','ยังไม่มีประวัติการแก้ไข'));for(const event of result.audit.slice().reverse()){$('events').append(node('p',`${event.code} · ${({commit:'แก้ยอดเงิน',status:'เปลี่ยนสถานะ'})[event.action]||event.action} · ${event.actorName} · ${event.reason||''}`));}});};
$('backup').onclick=()=>operation(async current=>{const result=await api('/backup');if(current!==generation)return;const url=URL.createObjectURL(new Blob([JSON.stringify(result)],{type:'application/json'})),link=node('a');link.href=url;link.download='sgcu-year2568-live-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});

$('access-load').onclick=()=>operation(async current=>{const result=await api('/access');if(current!==generation)return;$('access-active').value=String(result.active);$('access-state').textContent=result.active?'เหรัญญิกเปิดใช้งานอยู่':'สิทธิ์เหรัญญิกถูกระงับ';});
$('access-form').onsubmit=e=>{e.preventDefault();if(!confirm('ยืนยันเปลี่ยนสิทธิ์เหรัญญิกปี 2568?'))return;operation(async()=>{await api('/access',{active:$('access-active').value==='true',reason:$('access-reason').value});$('access-state').textContent='บันทึกการเปลี่ยนสิทธิ์แล้ว';});};
$('restore-form').onsubmit=e=>{e.preventDefault();operation(async()=>{
 const file=$('restore-file').files[0];if(!file || file.size>8*1024*1024)throw Error('เลือกไฟล์สำรองไม่เกิน 8 MiB');
 const bundle=JSON.parse(await file.text());if(bundle.format!=='SGCU-live-backup')throw Error('ต้องเป็นไฟล์สำรองข้อมูลใช้งานจริง');
 if(!confirm(`กู้คืนชุดสำรองวันที่ ${bundle.payload?.createdAt || 'ไม่ระบุ'}? ระบบจะเก็บสำรองปัจจุบันก่อน แล้วสลับไปชุดกู้คืนใหม่`))return;
 await api('/restore',{bundle,reason:$('restore-reason').value,expectedDatasetId:datasetId});await refresh();
});};
window.addEventListener('sgcu:page-active',event=>{if(event.detail?.page==='project-live-staff')operation(refresh);else closeModal(true);});
let currentUid=window.sgcuAuth?.auth?.currentUser?.uid || null;
window.sgcuAuth?.onAuthStateChanged(window.sgcuAuth.auth,user=>{if((user?.uid||null)!==currentUid){currentUid=user?.uid||null;generation++;closeModal(true);$('data').hidden=true;$('projects').replaceChildren();$('events').replaceChildren();$('admin').hidden=true;if(root.classList.contains('active') && user)operation(refresh);}});
if(root.classList.contains('active'))operation(refresh);
})();
