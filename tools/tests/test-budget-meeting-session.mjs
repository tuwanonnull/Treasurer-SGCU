import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin=process.env.BUDGET_MEETING_TEST_ORIGIN || 'http://127.0.0.1:4197';
const authPort=Number(process.env.MEETING_AUTH_PORT || 9198);
const firestorePort=Number(process.env.MEETING_FIRESTORE_PORT || 8189);
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const emails=['tuwanon.kimchiang@gmail.com','member01@chula.ac.th','chair02@chula.ac.th'];
for(const email of emails){
 const response=await fetch(`http://127.0.0.1:${authPort}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-budget-meeting`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Meeting-test-123!',returnSecureToken:true})});
 const result=await response.json();assert(response.ok || result.error?.message==='EMAIL_EXISTS');
}
const browser=await chromium.launch();
const errors=[];
async function newPage(){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(['firestore.googleapis.com','identitytoolkit.googleapis.com','securetoken.googleapis.com'].includes(url.hostname))return route.abort();
  if(url.pathname.endsWith('/js/integrations/app.firebase-bootstrap.js'))return route.fulfill({contentType:'application/javascript',body:readFileSync('web/js/integrations/app.firebase-bootstrap.js','utf8').replace('127.0.0.1:9098',`127.0.0.1:${authPort}`).replace('8089',String(firestorePort))});
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return page;
}
async function login(page,url,email){
 await page.goto(url);
 await page.locator('#emulator-login [name="email"]').fill(email);
 await page.locator('#emulator-login [name="password"]').fill('Meeting-test-123!');
 await page.locator('#emulator-login button').click();
 await page.locator('#ballot-logout').waitFor();
}
try{
 const chair=await newPage();
 await login(chair,`${origin}/budget-meeting-vote.html?meetingEmulator=1`,emails[0]);
 const meetingId=await chair.evaluate(()=>window.sgcuBudgetBallots.createMeeting('ประชุมทดสอบลิงก์เดียว'));
 const link=await chair.evaluate(id=>window.sgcuBudgetBallots.meetingUrl(id),meetingId);
 assert(link.includes(`meeting=${meetingId}`));
 const voter=await newPage();await login(voter,link,emails[1]);
 await voter.getByRole('heading',{name:'รอประธานเปิดขั้นตอนถัดไป'}).waitFor();
 const open=async(kind,voters,options)=>chair.evaluate(args=>window.sgcuBudgetBallots.open(args),{meetingId,title:kind,kind,summary:'ทดสอบการเปลี่ยนขั้นตอน',voters,options});
 const member={code:'SGCU-01.00',name:'ฝ่ายหนึ่ง',email:emails[1]};
 const other={code:'SGCU-02.00',name:'ฝ่ายสอง',email:emails[2]};
 const yesNo=[{id:'yes',label:'เห็นชอบ'},{id:'no',label:'ไม่เห็นชอบ'}];
 const first=await open('satisfaction',[member,other],yesNo);
 await voter.locator('[value="yes"]').check();await voter.locator('#ballot-form button[type="submit"]').click();
 await voter.getByRole('status').waitFor();
 await chair.evaluate(async id=>{window.testProgress=0;window.stopTestProgress=window.sgcuBudgetBallots.watchProgress(id,value=>{window.testProgress=value?.count},error=>{throw error});},first);
 await chair.waitForFunction(()=>window.testProgress===1);
 await chair.evaluate(id=>window.sgcuBudgetBallots.close(id),first);
 await voter.getByRole('heading',{name:'รอประธานเปิดขั้นตอนถัดไป'}).waitFor();
 const second=await open('recipient',[other],yesNo);
 await voter.getByRole('heading',{name:'บัญชีนี้ไม่มีสิทธิ์ในรอบนี้'}).waitFor();
 await chair.evaluate(id=>window.sgcuBudgetBallots.close(id),second);
 await voter.getByRole('heading',{name:'รอประธานเปิดขั้นตอนถัดไป'}).waitFor();
 const third=await open('withdrawal',[{...member,allowedOptionIds:['p1']}],[{id:'p1',label:'โครงการของฝ่าย'}]);
 await voter.locator('[value="p1"]').check();
 assert.equal(voter.url(),link);
 await voter.reload();await voter.locator('[value="p1"]').check();
 await voter.locator('#ballot-form button[type="submit"]').click();await voter.getByRole('status').waitFor();
 const received=await chair.evaluate(id=>window.sgcuBudgetBallots.close(id,true),third);
 assert.deepEqual(received,[{code:'SGCU-01.00',choices:['p1']}]);
 await voter.getByRole('heading',{name:'รอประธานเปิดขั้นตอนถัดไป'}).waitFor();
 await voter.screenshot({path:'/tmp/bm-meeting-waiting.png',fullPage:true});
 await chair.evaluate(id=>window.sgcuBudgetBallots.finishMeeting(id),meetingId);
 await voter.getByRole('heading',{name:'สิ้นสุดการประชุมแล้ว'}).waitFor();
 await voter.reload();await voter.getByRole('heading',{name:'สิ้นสุดการประชุมแล้ว'}).waitFor();
 assert.equal(voter.url(),link);
 assert.equal(await voter.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('Passed real Auth/Firestore: one URL, waiting, automatic rounds, excluded department, restored eligibility, voting, reload and meeting closure.');
}finally{await browser.close();}
