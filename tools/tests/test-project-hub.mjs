import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4175');await page.getByRole('tab',{name:'เอกสารและผู้ลงนาม',exact:true}).click();
 const form=page.locator('#documentSignerSettingsForm');await form.waitFor({state:'visible'});
 assert.equal(await page.locator('#documentSignerAcademicYear').inputValue(),'2568');
 await page.locator('#documentSignerTreasurerName').fill('ผู้ลงนามทดสอบ');await page.getByRole('tab',{name:'โครงการปี 2568',exact:true}).click();
 await page.getByRole('tab',{name:'เอกสารและผู้ลงนาม',exact:true}).click();assert.equal(await page.locator('#documentSignerTreasurerName').inputValue(),'ผู้ลงนามทดสอบ');
 await page.locator('#documentSignerSaveBtn').click();await page.getByText('บันทึกการตั้งค่าเอกสารปีการศึกษา 2568 เรียบร้อย',{exact:true}).waitFor();
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/project-hub-documents-${width}.png`});}
 // A head with document rights does not gain access to year-68 project API.
 const head=await browser.newPage();head.setDefaultTimeout(15000);let apiRequests=0;
 await head.route('http://127.0.0.1:4175/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("email:'tuwanon.kimchiang@gmail.com'","email:'other-head@example.com'")});});
 head.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api'))apiRequests++;});
 await head.goto('http://127.0.0.1:4175');await head.locator('#documentSignerSettingsForm').waitFor({state:'visible'});
 assert.equal(await head.getByRole('tab',{name:'โครงการปี 2568',exact:true}).count(),0);assert.equal(apiRequests,0);assert.ok(await head.locator('#documentSignerSaveBtn').isEnabled());
 await head.evaluate(()=>{staffAuthUser={role:'1'};window.sgcuAuth.auth.currentUser.email='6534324223@student.chula.ac.th';window.sgcuDocumentSigners.refreshPermissions();});
 assert.equal(await head.locator('#documentSignerSaveBtn').isEnabled(),false);
 assert.deepEqual(errors,[]);console.log('PASS: shared hub, signer draft preservation, mock save, responsive layout, document-only head has no project API access, signer write gating.');
}finally{await browser.close()}
