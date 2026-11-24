import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
const root=path.resolve('dist');
const html=(await readFile(path.join(root,'index.html'),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('<head>','<head><base href="http://localhost/">').replace('</head>','<style>#appLoader,.site-header,body > footer,.page-view{display:none!important}.page-view.active{display:block!important}</style></head>');
const browser=await chromium.launch({headless:true});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='localhost')return route.abort();
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep))return route.abort();
  try{await route.fulfill({body:await readFile(file),contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream'});}catch{await route.abort();}
 });
 await page.setContent(html);
 await page.evaluate(()=>{
  document.documentElement.dataset.theme='light';
  window.testMode='normal';window.sgcuTourAccount=()=>({mode:window.testMode});window.setStaffViewMode=mode=>window.testMode=mode;
  window.testReads=[];window.testFailure=false;
  const rows=Array.from({length:65},(_,i)=>({id:'request-'+String(i).padStart(3,'0'),data:()=>({requesterEmail:'owner@example.com',status:'returned',projectName:'โครงการทดสอบ '+i,requestNo:'BR-'+i,staffNote:'ส่งคืนพัสดุครบถ้วน',updatedAt:new Date(2026,9,1,0,i),createdAt:new Date(2026,8,1)})}));
  window.sgcuFirestore={db:{},where:(field,op,value)=>({field,op,value}),orderBy:(field,direction)=>({order:field,direction}),limit:n=>({limit:n}),startAfter:doc=>({cursor:doc.id}),collection:(_,name)=>name,doc:(_,collection,id)=>({collection,id}),query:(collection,...constraints)=>({collection,constraints}),onSnapshot:(ref,next)=>{queueMicrotask(()=>next(ref?.id?{exists:()=>false}:{size:0,docs:[]}));return()=>{};},getDoc:async()=>({exists:()=>false}),getDocs:async q=>{
   window.testReads.push(q);
   await new Promise(r=>setTimeout(r,20));
   if(window.testFailure)throw Error('offline');
   let result=q.collection==='borrowAssetRequests'?[...rows]:[];
   for(const c of q.constraints.filter(c=>c.field))result=result.filter(doc=>{const value=doc.data()[c.field];return c.op==='=='?value===c.value:c.op==='in'?c.value.includes(value):c.op==='>='?value>=c.value:value<c.value;});
   result.sort((a,b)=>b.data().updatedAt-a.data().updatedAt);
   const cursor=q.constraints.find(c=>c.cursor);if(cursor)result=result.slice(result.findIndex(r=>r.id===cursor.cursor)+1);
   return {docs:result.slice(0,q.constraints.find(c=>c.limit).limit)};
  }};
 });
 for(const file of ['app.account-work-data.js','app.account-work-history.js','app.account-work.js'])await page.addScriptTag({content:await readFile('web/js/features/account-work/'+file,'utf8')});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('sgcu:staff-auth-updated',{detail:{isAuthenticated:true,email:'owner@example.com',hasStaff:true,isHeadStaff:false,allowedPages:['borrow-assets-staff']}})));

 await page.evaluate(()=>{
  document.querySelectorAll('.page-view.active').forEach(el=>el.classList.remove('active'));
  document.querySelector('#work-panel').classList.add('active');
  window.testSignedIn=true;window.testStaff=true;
  window.sgcuTourAccount=()=>({user:window.testSignedIn?{}:null,mode:window.testMode,staffApproved:window.testStaff,staffPages:window.testStaff?['borrow-assets-staff']:[],ready:true});
  window.sgcuLoginProfileState={isAuthenticated:true};
 });
 await page.addScriptTag({content:await readFile('web/js/core/mobile/app.mobile-account.js','utf8')});
 await page.setViewportSize({width:390,height:844});
 await page.locator('#work-mobile-nav').waitFor({state:'visible'});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('sgcu:staff-auth-updated',{detail:{isAuthenticated:true,email:'owner@example.com',hasStaff:true,allowedPages:['borrow-assets-staff']}})));
 assert.equal(await page.locator('#work-panel .page-switch').isVisible(),false);
 assert.equal(await page.locator('#work-mobile-nav').evaluate(el=>getComputedStyle(el).position),'fixed');
 assert.ok((await page.locator('#work-mobile-nav').boundingBox()).y > 650);
 assert.equal(await page.locator('#work-filter-area').isVisible(),false);
 await page.locator('[data-work-mobile-tab="history"]').click();
 await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='โหลดแล้ว 20 รายการ');
 await page.locator('#work-mobile-filters').click();
 assert.equal(await page.locator('#work-history-form').isVisible(),true);
 const actionBoxes = await page.locator('.work-history-actions > button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {y:r.y,width:r.width};}));
 assert.equal(actionBoxes[0].y,actionBoxes[1].y,'History actions share a row');
 assert.ok(Math.abs(actionBoxes[0].width-actionBoxes[1].width)<1,'History actions have equal widths');
 assert.equal(await page.locator('#account-filter-sheet').evaluate(el=>el.open),true);
 await page.screenshot({path:'.local/work-history-qa/mobile-nav-filters.png',fullPage:true});
 assert.equal(await page.locator('#service-filter').evaluate(el=>el===document.activeElement),true);
 await page.locator('#service-filter').selectOption('borrow');
 await page.locator('#work-mobile-filters-done').click();
 assert.equal(await page.locator('#work-filter-area').isVisible(),false);
 await page.locator('[data-account-mobile-mode="work"]').click();
 assert.equal(await page.evaluate(()=>window.testMode),'staff');
 assert.equal(await page.locator('#work-mobile-nav [data-mobile-mode-label]').textContent(),'สตาฟ');
 await mkdir('.local/work-history-qa',{recursive:true});
 await page.screenshot({path:'.local/work-history-qa/mobile-nav-work.png',fullPage:true});
 await page.evaluate(()=>{
  document.querySelector('#work-panel').classList.remove('active');
  document.querySelector('.page-view[data-page="login"]').classList.add('active');
  document.querySelector('.login-hero').classList.add('is-authenticated');
  document.querySelector('#loginProfileCard').hidden=false;
 });
 await page.locator('#login-mobile-nav').waitFor({state:'visible'});
 assert.equal(await page.locator('#loginMobileSettingsSlot #loginSettingsSection').count(),1);
 await page.locator('[data-account-mobile-mode="login"]').click();
 assert.equal(await page.evaluate(()=>window.testMode),'normal');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('[data-login-mobile-section="access"]').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'loginAccessSection');
 await page.locator('[data-login-mobile-section="settings"]').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'loginSettingsSection');
 assert.equal(await page.locator('.login-shell').evaluate(el=>el.scrollTop),0,'Navigation must not scroll inside the account frame');
 assert.ok(await page.locator('#loginSettingsSection').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0 && r.bottom<=document.querySelector('#login-mobile-nav').getBoundingClientRect().top;}),'Settings must be visible above the bottom menu');
 assert.equal(await page.locator('#loginAccessSection').isVisible(),true);
 assert.equal(await page.locator('#loginGooglePanel').isVisible(),true);
 await page.screenshot({path:'.local/work-history-qa/mobile-account-settings.png',fullPage:true});
 await page.locator('[data-login-mobile-section="account"]').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'loginGooglePanel');
 assert.equal(await page.locator('#loginSettingsSection').isVisible(),true);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal mobile overflow');
 await page.screenshot({path:'.local/work-history-qa/mobile-nav-login.png',fullPage:true});
 // The mode tour follows the visible control across responsive layouts.
 await page.evaluate(()=>{
   const previous=window.sgcuTourAccount;
   window.sgcuTourAccount=()=>({...previous(),user:window.testSignedIn?{uid:'tour-test'}:null,pages:['login','account-work'],generalPages:['login','account-work'],ready:true});
   window.sgcuLoginProfileState={isAuthenticated:true,isComplete:true,isLoading:false};
   window.sgcuTourNavigation={consentReady:()=>true};
 });
 for (const file of ['app.tour-policy.js','app.onboarding-tour.js']) await page.addScriptTag({content:await readFile('web/js/core/'+file,'utf8')});
 await page.evaluate(()=>{
   window.testMode='staff';
   document.querySelector('#staffModeToggle').style.display='inline-grid';
   window.dispatchEvent(new CustomEvent('sgcu:staff-auth-updated',{detail:{isAuthenticated:true,email:'owner@example.com',hasStaff:true,allowedPages:['borrow-assets-staff']}}));
 });
 await page.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-account-mobile-mode="login"]').classList.contains('sgcu-tour-anchor'));
 await page.setViewportSize({width:1280,height:900});
 await page.waitForFunction(()=>document.querySelector('#staffModeToggle').classList.contains('sgcu-tour-anchor'));
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('[data-account-mobile-mode="login"]').classList.contains('sgcu-tour-anchor'));
 await page.getByRole('button',{name:'เสร็จสิ้น',exact:true}).click();
 await page.getByRole('button',{name:'เสร็จสิ้น',exact:true}).click();
 await page.setViewportSize({width:1280,height:900});
 await page.locator('#login-mobile-nav').waitFor({state:'hidden'});
 assert.equal(await page.locator('#loginGooglePanel #loginSettingsSection').count(),1);
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.testStaff=false;window.dispatchEvent(new CustomEvent('sgcu:staff-auth-updated',{detail:{isAuthenticated:true,email:'owner@example.com',hasStaff:false,allowedPages:[]}}));});
 assert.equal(await page.locator('[data-account-mobile-mode="login"]').isVisible(),false);
 await page.evaluate(()=>{window.testSignedIn=false;window.dispatchEvent(new CustomEvent('sgcu:auth-state',{detail:{isAuthenticated:false}}));});
 assert.equal(await page.locator('#login-mobile-nav').isVisible(),false);
 assert.equal(await page.locator('#loginGooglePanel #loginSettingsSection').count(),1);
 assert.deepEqual(errors,[]);
 console.log('Mobile account nav: history, filters, mode, account anchors, responsive settings restoration, access revocation and logout passed.');
} finally {await browser.close();}
