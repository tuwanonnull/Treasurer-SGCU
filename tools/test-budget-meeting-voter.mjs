import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.route('**/js/integrations/app.firebase-bootstrap.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    let authCallback, ballotCallback;
    const user = { uid: 'voter', email: 'voter@chula.ac.th' };
    const poll = { title: 'ลงมติกรอบงบประมาณ', kind: 'satisfaction', status: 'open', summary: 'ฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์: 120,000.00 บาท\\nฝ่ายวิชาการ: 80,000.50 บาท', options: [{id:'yes', label:'พึงพอใจ'}, {id:'no',label:'ไม่พึงพอใจ'}] };
    if (location.search.includes('ranked=1')) Object.assign(poll, { kind: 'nomination', summary: 'เรียงได้ไม่เกิน 3 อันดับ · คะแนน 3 ถึง 1', rankCount: 3, options: ['a','b','c'].map(id => ({id, label: 'โครงการ ' + id})) });
    if(location.search.includes('withdrawal=1')) Object.assign(poll,{kind:'withdrawal',title:'แจ้งยกเลิกโครงการ',summary:'เลือกโครงการของฝ่ายที่ประสงค์ยกเลิก · ประธานตรวจและยืนยันก่อนเปลี่ยนยอดงบ',options:[{id:'own',label:'โครงการของฝ่าย'},{id:'other',label:'โครงการฝ่ายอื่น'}]});
    if(location.search.includes('recipient=1')) Object.assign(poll,{kind:'recipient',title:'เสนอตัวรับงบ'});
    window.sgcuAuth = { auth: { currentUser: user }, onAuthStateChanged: (_, cb) => { authCallback=cb; cb(user); }, signOut: async () => { window.sgcuAuth.auth.currentUser=null; authCallback(null); }, GoogleAuthProvider: class {}, signInWithPopup: async () => {} };
    window.sgcuFirestore = {
      db: {}, doc: (...args) => args.filter(x => typeof x === 'string').join('/'), collection: (...args) => args.filter(x => typeof x === 'string').join('/'), query: x=>x, where: ()=>{},
      getDocs: async () => ({size:1, docs:[{id:'SGCU-01.00', data:()=>({name:'ฝ่ายทดสอบ',allowedOptionIds:['own']})}]}),
      onSnapshot: (path, cb) => { if (path.includes('ballots')) { ballotCallback=cb; cb({exists:()=>false}); } else cb({data:()=>poll}); return ()=>{}; },
      serverTimestamp: () => 'timestamp', writeBatch: () => { const writes=[]; return {set:(path,value)=>writes.push({path,value}),commit:async()=>{ window.voteWrites=writes; window.lastVote=writes.find(w=>w.path.includes('/ballots/')); ballotCallback({exists:()=>true}); }}; }
    };
  ` }));
  await page.goto('http://localhost:4186/budget-meeting-vote.html?poll=abcdefghijklmnopqrst');
  await page.locator('[value="yes"]').check();
  assert.equal(await page.locator('.bm-ballot-budget-list > div').count(), 2);
  assert.deepEqual(await page.locator('.bm-ballot-budget-list dd').allTextContents(), ['120,000.00', '80,000.50']);
  assert.equal(await page.locator('.bm-ballot-details summary').count(), 0);
  await page.screenshot({ path: '/tmp/bm-voter-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('#ballot-form button[type="submit"]').click();
  await page.getByRole('status').waitFor();
  assert.deepEqual(await page.evaluate(() => window.lastVote.value.choices), ['yes']);
  assert.equal(await page.evaluate(() => window.voteWrites.length), 2);
  assert.match(await page.evaluate(() => window.lastVote.path), /ballots\/SGCU-01.00$/);
  assert.equal(await page.locator('#ballot-form').count(), 0);
  await page.locator('#ballot-logout').click();
  await page.locator('#ballot-login').waitFor();
  await page.goto('http://localhost:4186/budget-meeting-vote.html?poll=abcdefghijklmnopqrst&ranked=1');
  const ranks = page.locator('select[name="choice"]');
  await ranks.nth(0).selectOption('c', { force: true }); await ranks.nth(1).evaluate(el => { el.querySelector('option[value="c"]').disabled = false; el.value = 'c'; });
  await page.locator('#ballot-form button[type="submit"]').click();
  assert.match(await page.locator('#ballot-error').innerText(), /ไม่เลือกโครงการซ้ำ/);
  await ranks.nth(1).selectOption('a', { force: true }); await ranks.nth(2).selectOption('b', { force: true });
  await page.screenshot({path:'/tmp/bm-ranked-voter-mobile.png', fullPage:true});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('#ballot-form button[type="submit"]').click();
  await page.getByRole('status').waitFor();
  assert.deepEqual(await page.evaluate(() => window.lastVote.value.choices), ['c','a','b']);
  await page.goto('http://localhost:4186/budget-meeting-vote.html?poll=abcdefghijklmnopqrst&withdrawal=1');
  assert.equal(await page.locator('[name="choice"]').count(), 1);
  assert.equal(await page.locator('[value="other"]').count(), 0);
  await page.locator('[value="own"]').check();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({path:'/tmp/bm-withdrawal-voter.png',fullPage:true});
  await page.locator('#ballot-form button[type="submit"]').click();
  await page.getByRole('status').waitFor();
  assert.deepEqual(await page.evaluate(() => window.lastVote.value.choices), ['own']);
  assert.match(await page.getByRole('status').innerText(), /ส่งข้อมูลแล้ว/);
  await page.goto('http://localhost:4186/budget-meeting-vote.html?poll=abcdefghijklmnopqrst&withdrawal=1');
  await page.locator('#ballot-form button[type="submit"]').click();
  await page.getByRole('status').waitFor();
  assert.deepEqual(await page.evaluate(() => window.lastVote.value.choices), []);
  await page.goto('http://localhost:4186/budget-meeting-vote.html?poll=abcdefghijklmnopqrst&recipient=1');
  await page.locator('[value="yes"]').check();
  await page.locator('#ballot-form button[type="submit"]').click();
  await page.getByRole('status').waitFor();
  assert.deepEqual(await page.evaluate(() => window.lastVote.value.choices), ['yes']);
  assert.deepEqual(errors, []);
  console.log('Passed: voter account, vote selection, confirmation, no repeat form, signout and mobile layout.');
} finally { await browser.close(); }
