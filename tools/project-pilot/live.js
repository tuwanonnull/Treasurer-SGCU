import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, setPersistence, inMemoryPersistence, signInWithPopup, GoogleAuthProvider, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
const auth=getAuth(initializeApp({apiKey:'AIzaSyDcRIz1Uy1AZd-9JJdLF92SyqU6m8bdSXo',authDomain:'departmentwebsite-5aec1.firebaseapp.com',projectId:'departmentwebsite-5aec1'}));
const $=id=>document.getElementById(id), node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
let offset=0,query='',generation=0,busy=false;
const money=n=>n===null?'—':`${n<0?'-':''}${((BigInt(n)<0n?-BigInt(n):BigInt(n))/100n).toLocaleString('th-TH')}.${String((BigInt(n)<0n?-BigInt(n):BigInt(n))%100n).padStart(2,'0')}`;
async function api(action='',body){
  const token=await auth.currentUser.getIdToken();
  const response=await fetch('/api/year68/live'+action,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json();
  if(!response.ok){if([401,403].includes(response.status)){$('data').hidden=true;$('projects').replaceChildren();$('events').replaceChildren();}throw Error(data.error);}
  return data;
}
async function operation(task){if(busy)return;busy=true;const current=generation;document.querySelectorAll('button').forEach(b=>b.disabled=true);$('message').textContent='กำลังดำเนินการ…';try{await task(current);if(current===generation)$('message').textContent='ดำเนินการแล้ว';}catch(e){if(current===generation)$('message').textContent=e.message;}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);document.querySelectorAll('[data-preview-required]').forEach(b=>b.disabled=true);}}
function field(form,text,element){const label=node('label',text);label.append(element);form.append(label);return element;}
function editForm(p,state,status){
  const form=node('form'),output=node('div');form.append(node('h3',status?'เปลี่ยนสถานะ':'แก้ยอดเงิน'));
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
  const preview=node('button','ดูผลก่อนบันทึก');preview.type='button';const save=node('button','ยืนยันบันทึก');save.type='submit';save.dataset.previewRequired='true';save.disabled=true;form.append(preview,save,output);
  let reviewed=null;
  const invalidate=()=>{reviewed=null;save.dataset.previewRequired='true';save.disabled=true;output.replaceChildren();};controls.forEach(control=>control.addEventListener('input',invalidate));
  preview.onclick=()=>operation(async current=>{const body=patch(),result=await api(status?'/status-preview':'/preview',body);if(current!==generation)return;reviewed=JSON.stringify(body);delete save.dataset.previewRequired;output.replaceChildren();if(status)output.append(node('p',`สถานะ: ${p.statuses[body.field]||'—'} → ${body.value}`));for(const col of Object.keys(state.moneyLabels))output.append(node('p',`${state.moneyLabels[col]}: ${money(result.before[col])} → ${money(result.after[col])} บาท`));});
  form.onsubmit=e=>{e.preventDefault();if(reviewed!==JSON.stringify(patch()))return;operation(async()=>{await api(status?'/status':'/commit',{...patch(),reason:reason.value});await refresh();});};return form;
}
async function refresh(){const current=generation,state=await api(`?q=${encodeURIComponent(query)}&offset=${offset}`);if(current!==generation)return;
  $('data').hidden=false;$('events').replaceChildren();$('count').textContent=`พบ ${state.matchedCount} จาก ${state.totalCount} โครงการ · หน้า ${Math.floor(offset/25)+1}`;
  const b=state.automaticBackup;$('backup-status').textContent=b?.backupAt?`สำรองในเครื่องล่าสุด ${new Date(b.backupAt).toLocaleString('th-TH')} ${b.failed||b.overdue?'· ต้องตรวจสำรอง':''} · ยังไม่ส่ง Drive อัตโนมัติ`:'ยังไม่มีชุดสำรองอัตโนมัติที่ตรวจผ่าน';
  $('projects').replaceChildren();for(const p of state.projects){const card=node('details'),summary=node('summary',`${p.code} · ${p.name}`);card.append(summary);for(const col of Object.keys(state.moneyLabels))card.append(node('p',`${state.moneyLabels[col]}: ${money(p.money[col])} บาท`));for(const g of state.statusGroups)card.append(node('p',`${g.label}: ${p.statuses[g.column]||'—'}`));card.append(editForm(p,state,false),editForm(p,state,true));$('projects').append(card);}
}
$('login').onclick=()=>operation(async()=>{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account',login_hint:'6534324223@student.chula.ac.th'});await signInWithPopup(auth,provider);$('logout').hidden=false;await refresh();});
$('logout').onclick=async()=>{generation++;await signOut(auth);$('data').hidden=true;$('projects').replaceChildren();$('events').replaceChildren();$('logout').hidden=true;$('message').textContent='ออกจากระบบแล้ว';};
$('search').onsubmit=e=>{e.preventDefault();query=$('query').value.trim();offset=0;operation(refresh);};$('previous').onclick=()=>{offset=Math.max(0,offset-25);operation(refresh);};$('next').onclick=()=>{offset+=25;operation(refresh);};
$('history').onclick=()=>operation(async current=>{const result=await api('/history');if(current!==generation)return;$('events').replaceChildren();for(const event of result.audit.slice().reverse()){$('events').append(node('p',`${event.code} · ${({commit:'แก้ยอดเงิน',status:'เปลี่ยนสถานะ'})[event.action]||event.action} · ${event.actorName} · ${event.reason||''}`));}});
$('backup').onclick=()=>operation(async current=>{const result=await api('/backup');if(current!==generation)return;const url=URL.createObjectURL(new Blob([JSON.stringify(result)],{type:'application/json'})),link=node('a');link.href=url;link.download='sgcu-year2568-live-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
setPersistence(auth,inMemoryPersistence).then(()=>{$('login').disabled=false;}).catch(()=>{$('message').textContent='เตรียมล็อกอินไม่สำเร็จ กรุณาโหลดใหม่';});
