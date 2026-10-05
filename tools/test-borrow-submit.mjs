import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../js/features/borrow/app.borrow-assets.js', import.meta.url), 'utf8');
const fn = source.slice(source.indexOf('  const submitBorrowRequest ='), source.indexOf('  const updateBorrowRequestStatus ='));
for (const scenario of ['success', 'audit-sync', 'audit-async', 'reset', 'unavailable', 'permission-denied', 'resource-exhausted']) {
  const messages = []; let writes = 0;
  const project = {id:'project',name:'โครงการทดสอบ',active:true,academicYear:'2569',customWeekdays:true,pickupDays:[1]};
  const context = vm.createContext({
    Date, Promise, console:{error(){}},
    borrowRequestForm:{reportValidity:()=>true,reset:()=>{if(scenario==='reset') throw new TypeError('reset');}},
    borrowSubmitBtn:{disabled:false},borrowCatalogReady:true,
    borrowProjectName:{value:'SGCU'},BORROW_PROJECT_ORG:'SGCU',OTHER_ORG_VALUE:'other',
    managedBorrowProjects:[project],borrowManagedProject:{value:'project'},
    getBorrowAcademicYearBE:()=> '2569',isBorrowProjectMode:()=>true,dayKeyBangkok:()=> '2026-10-05',
    getBorrowProjectDeptValueForSubmit:()=> 'ฝ่ายทดสอบ',readCurrentUserEmail:()=> 'test@example.com',currentUserEmail:'',
    resolveFirestoreBridge:()=>true,parseDateYmd:v=>new Date(`${v}T00:00:00Z`),
    borrowPickupDate:{value:'2026-10-05'},borrowReturnDate:{value:'2026-10-06'},
    getAllowedPickupDays:()=>[3],projectDateAllowed:(p,k,date)=>p[k].includes(new Date(`${date}T00:00:00Z`).getUTCDay()),
    collectAssetItems:()=>({ok:true,items:[{code:'A',name:'โต๊ะ',qty:1,unit:'ตัว'}]}),
    getBorrowProfileForSubmit:async()=>Object.fromEntries(['firstName','lastName','nickname','studentId','faculty','year','phone','lineId'].map(k=>[k,'test'])),
    ensureBorrowOrgCodeData:async()=>{}, getBorrowRequestNoParts:()=>({prefix:'B69.TEST'}),
    getBorrowProjectNameValueForSubmit:()=> 'SGCU',borrowProjectDetail:{value:'ทดสอบ'},readCurrentAccountEmail:()=> 'test@example.com',STATUS_PENDING:'pending',toYmd:()=> '2026-10-05',
    firestore:{serverTimestamp:()=>null},
    createBorrowRequestWithNextNumber:async payload=>{
      if(['unavailable','permission-denied','resource-exhausted'].includes(scenario)) throw {code:scenario};
      assert.equal(payload.borrowProjectId,'project'); assert.equal(payload.projectDept,'ฝ่ายทดสอบ');
      assert.equal(payload.returnDate,'2026-10-06'); writes++; payload.requestNo='B69.TEST.001';return {id:'saved'};
    },
    window:{sgcuAuditLog:{write:()=>{if(scenario==='audit-sync') throw new TypeError('audit');if(scenario==='audit-async') return Promise.reject(new Error('audit'));}}},
    toggleBorrowProjectNameOther(){},renderManagedBorrowProjects(){},resetAssetRows(){},
    setBorrowMessage:message=>messages.push(message)
  });
  await vm.runInContext(fn+'\nsubmitBorrowRequest();', context);
  assert.equal(context.borrowSubmitBtn.disabled,false);
  if(scenario === "resource-exhausted") assert.match(messages.at(-1), /โควตาฐานข้อมูลเต็ม/);
  if(['unavailable','permission-denied','resource-exhausted'].includes(scenario)) {assert.equal(writes,0);assert.doesNotMatch(messages.at(-1),/เรียบร้อย/);}
  else {assert.equal(writes,1);assert.match(messages.at(-1),/ส่งคำขอเรียบร้อยแล้ว เลขที่ B69.TEST.001/);}
}
console.log('Project submission: custom pickup overrides, unrestricted returns, network/permission errors, and post-save failures passed.');
