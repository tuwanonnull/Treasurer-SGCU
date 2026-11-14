import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
function createEmulatorIdentity(){
 if(process.env.GCLOUD_PROJECT!=='demo-project-pilot' || process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8187')throw Error('Use isolated local Firestore Emulator only');
 const app=initializeApp({projectId:'demo-project-pilot'},`web-test-${randomUUID()}`);
 return {db:getFirestore(app),close:()=>deleteApp(app)};
}
import {loadProductionCandidate} from '../functions/project-live/production-candidate.mjs';
import {acceptBaseline} from '../functions/project-live/approved-baseline.mjs';
import {initializeLiveDataset,createLiveStore,validateLiveBackup} from '../functions/project-live/live-store.mjs';
import {createProjectService} from '../functions/project-live/service.mjs';
const candidate=await loadProductionCandidate(process.argv[2]),acceptance=acceptBaseline(candidate),identity=createEmulatorIdentity(),realDb=identity.db,suffix=randomUUID();
// Isolate config and role documents so this test never modifies local working grants.
const mapped=new Set(['projectLiveConfig','projectAccess','projectSystemAdmins','projectAdminAudit']);
const db=new Proxy(realDb,{get(target,key){if(key==='collection')return name=>target.collection(mapped.has(name)?`${name}-test-${suffix}`:name);const v=target[key];return typeof v==='function'?v.bind(target):v;}});
const head=`head-${suffix}`,admin=`admin-${suffix}`,datasetId=`year2568-web-${suffix}`,users={[head]:{id:head,role:'head',name:'เหรัญญิกปี 2568'},[admin]:{id:admin,role:'admin',name:'แอดมินระบบ'}};
const root=db.collection('projectDatasets').doc(datasetId),config=db.collection('projectLiveConfig').doc('2568'),adminRef=db.collection('projectSystemAdmins').doc(admin),grant=db.collection('projectAccess').doc('2568').collection('members').doc(head);
const auth={verifyIdToken:async token=>({uid:token,email:token===admin?'tuwanon.kimchiang@gmail.com':'6534324223@student.chula.ac.th',email_verified:true}),getUser:async uid=>({uid,email:uid===admin?'tuwanon.kimchiang@gmail.com':'6534324223@student.chula.ac.th',emailVerified:true,disabled:false})};
let restoredId,server,browser;
try{
 await initializeLiveDataset({candidate,acceptance,users,datasetId,db});await root.update({active:true});await config.create({datasetId,users});await grant.create({uid:head,academicYear:2568,active:true,projectRole:'head',datasetId});
 const loadOptions=async()=>({candidate,acceptance,users,datasetId:(await config.get()).data().datasetId,db});
 let safety=0;const service=createProjectService({db,auth,loadOptions,saveBackup:async bundle=>{validateLiveBackup(bundle);safety++;return {object:'test-only-backup',auditCount:bundle.payload.auditOrder.length};}});
 const call=(uid,method,action,body)=>service.handle({authorization:`Bearer ${uid}`,method,action,body});
 await assert.rejects(call(admin,'GET',''),e=>e.status===403);
 await adminRef.create({uid:admin,role:'admin',email:'tuwanon.kimchiang@gmail.com',active:true});
 if(process.argv.includes('--browser')){
  const partial=await readFile(new URL('../partials/project-live-staff.html',import.meta.url),'utf8');
  const script=await readFile(new URL('../js/features/project/app.project-live.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../css/pages/project-live.css',import.meta.url),'utf8');
  server=createServer(async(req,res)=>{try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api')){let raw='';for await(const chunk of req)raw+=chunk;const result=await service.handle({authorization:req.headers.authorization,method:req.method,action:url.pathname.slice(4).replace(/^\//,''),body:raw?JSON.parse(raw):undefined,params:url.searchParams});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;}
   res.setHeader('Content-Type','text/html');res.end(`<html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css}</style><a data-page="project-live-staff">เมนูโครงการ</a>${partial.replace('class="page-view"','class="page-view active"')}<script>window.SGCU_APP_CONFIG={projectLive:{apiUrl:'/api'}};window.sgcuAuth={auth:{currentUser:{uid:${JSON.stringify(admin)},getIdToken:async()=>${JSON.stringify(admin)}}},onAuthStateChanged:(auth,fn)=>fn(auth.currentUser)};</script><script>${script}</script></html>`);
  }catch(error){res.statusCode=error.status||500;res.end(JSON.stringify({error:error.message}));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.goto(base);const ui=id=>page.locator(`[data-live-id="${id}"]`);
  await ui('data').waitFor({state:'visible'});assert.match(await ui('count').innerText(),/407/);assert.equal(await ui('admin').isVisible(),true);
  await ui('projects').locator('button').first().click();const form=ui('modal').locator('form').filter({has:page.getByRole('heading',{name:'แก้ยอดเงิน',exact:true})});
  await form.getByLabel('งบอนุมัติ',{exact:true}).fill('100.01');await form.getByLabel('เหตุผล / หมายเหตุ').fill('ซ้อมแอดมินผ่านหน้าเว็บหลัก');
  assert.equal(await form.getByRole('button',{name:'ยืนยันบันทึก'}).isEnabled(),false);
  await form.getByRole('button',{name:'ดูผลก่อนบันทึก'}).click();await page.waitForFunction(()=>document.querySelector('[data-live-id="message"]').textContent==='ดำเนินการแล้ว');
  await form.getByRole('button',{name:'ยืนยันบันทึก'}).click();await page.waitForFunction(()=>document.querySelector('[data-live-id="message"]').textContent==='ดำเนินการแล้ว');
  assert.equal((await call(admin,'GET','')).projects[0].money.O,10001);
  await ui('modal-close').click();
  await ui('history').click();await ui('events').locator('p').waitFor();assert.match(await ui('events').innerText(),/แอดมินระบบ/);
  const downloaded=page.waitForEvent('download');await ui('backup').click();validateLiveBackup(JSON.parse(await readFile(await (await downloaded).path(),'utf8')));
  await ui('admin').locator('summary').first().click();
  await ui('access-load').click();await page.waitForFunction(()=>document.querySelector('[data-live-id="access-state"]').textContent==='เหรัญญิกเปิดใช้งานอยู่');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.getByRole('heading',{name:'จัดการโครงการปี 2568',exact:true}).isVisible());
  await adminRef.update({active:false});await page.getByRole('button',{name:'ค้นหา / โหลดล่าสุด'}).click();await ui('data').waitFor({state:'hidden'});assert.equal(await ui('projects').locator('button').count(),0);await adminRef.update({active:true});assert.deepEqual(errors,[]);
  console.log('PASS: main partial mounts with navigation present; shared login, admin edit preview/commit, audit, backup, access, mobile and revocation');
 }
 const first=await call(admin,'GET','');assert.equal(first.user.role,'admin');assert.equal(first.totalCount,407);
 const p=first.projects[0];await call(admin,'POST','commit',{projectId:p.id,version:p.version,changes:{O:'123.45'},reason:'ทดสอบแอดมินบัญชีจริงของ fixture'});
 const history=await call(head,'GET','history');assert.equal(history.audit[0].actor,admin);assert.equal(history.audit[0].actorName,'แอดมินระบบ');
 const backup=await call(admin,'GET','backup');validateLiveBackup(backup);assert.equal(backup.payload.users[admin].role,'admin');
 await assert.rejects(call(head,'GET','access'),e=>e.status===403);
 await call(admin,'POST','access',{active:false,reason:'ทดสอบระงับสิทธิ์'});await assert.rejects(call(head,'GET',''),e=>e.status===403);assert.equal((await call(admin,'GET','')).totalCount,407);
 await adminRef.update({active:false});await assert.rejects(call(admin,'GET','backup'),e=>e.status===403);await adminRef.update({active:true});
 const result=await call(admin,'POST','restore',{bundle:backup,reason:'ทดสอบกู้คืนจากหน้าแอดมิน',expectedDatasetId:datasetId});restoredId=result.datasetId;
 assert.equal(safety,1);assert.equal((await root.get()).data().active,false);assert.equal((await grant.get()).data().active,false);assert.equal((await grant.get()).data().datasetId,restoredId);
 assert.equal((await call(admin,'GET','')).projects[0].money.O,12345);
 await call(admin,'POST','access',{active:true,reason:'ทดสอบเปิดสิทธิ์คืนโดยแอดมิน'});assert.equal((await call(head,'GET','')).projects[0].money.O,12345);
 await assert.rejects(call(admin,'POST','commit',{projectId:p.id,version:p.version,changes:{O:'1'},reason:'หน้าจอเก่าก่อนกู้คืน'}),e=>e.status===409);
 const audit=await db.collection('projectAdminAudit').get();assert.equal(audit.size,3);
 console.log('PASS: admin identity, monetary audit, revoked admin, head access management, safety backup, atomic restore switch, preserved revocation, stale-page rejection');
}finally{
 await browser?.close();if(server)await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});
 for(const id of [datasetId,restoredId].filter(Boolean))await realDb.recursiveDelete(realDb.collection('projectDatasets').doc(id));
 for(const name of mapped)await realDb.recursiveDelete(realDb.collection(`${name}-test-${suffix}`));await identity.close();
}
