import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createLiveWorkServer } from '../preview/serve-work-requests-live.mjs';
const server=createLiveWorkServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try {
 browser=await chromium.launch();
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.testMode='normal';window.sgcuTourAccount=()=>({mode:window.testMode});window.setStaffViewMode=mode=>window.testMode=mode;
  window.testSubscriptions=[];
  window.sgcuFirestore={db:{},collection:(_,name)=>name,doc:(_,collection,id)=>({collection,id}),where:(field,op,value)=>({field,op,value}),limit:limit=>({limit}),query:(collection,...constraints)=>({collection,constraints}),onSnapshot:(ref,success)=>{const sub={ref,success};window.testSubscriptions.push(sub);return()=>sub.stopped=true;}};
 });
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin) return route.abort();
  if(url.pathname==='/') {
   const response=await route.fetch();
   const html=(await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,tag=>tag.includes('/account-work/')?tag:'');
   return route.fulfill({response,body:html});
  }
  return route.continue();
 });
 await page.goto(origin);
 await page.evaluate(()=>{document.getElementById('appLoader')?.remove();document.querySelectorAll('.page-view').forEach(el=>el.classList.toggle('active',el.id==='work-panel'));});
 assert.equal(await page.locator('#request-list .request-row').count(),0,'No demo rows in production');
 assert.equal(await page.locator('#work-panel').count(),1);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('sgcu:staff-auth-updated',{detail:{isAuthenticated:true,email:'user@example.com',hasStaff:true,allowedPages:['meeting-room-staff']}})));
 await page.evaluate(()=>{
  const s=window.testSubscriptions.find(s=>s.ref.collection==='meetingRoomBookings'&&s.ref.constraints.some(c=>c.field==='requesterEmail'));
  s.success({size:1,docs:[{id:'real-test',data:()=>({status:'pending',date:'2099-01-01',roomName:'ห้องทดสอบ',purpose:'ประชุมทดสอบ'})}]});
 });
 await page.locator('#request-list .request-row').click();
 assert.equal(await page.locator('#request-dialog').isVisible(),true);
 assert.equal(await page.locator('#detail-title').innerText(),'ห้องทดสอบ');
 await page.locator('#close-dialog').click();
 await page.locator('#request-dialog').waitFor({state:'hidden'});
 await page.locator('#work-panel [data-staff-mode="staff"]').click();
 assert.equal(await page.locator('#list-title').innerText(),'งานที่ต้องจัดการ');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('sgcu:auth-state',{detail:{isAuthenticated:false}})));
 assert.equal(await page.locator('#request-list .request-row').count(),0);
 assert.ok(await page.evaluate(()=>window.testSubscriptions.every(s=>s.stopped)));
 for(const width of [390,1440]) {await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);
 console.log('Production work UI: no mock data, real adapter rows, details, mode switch, logout cleanup and responsive layout passed.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
