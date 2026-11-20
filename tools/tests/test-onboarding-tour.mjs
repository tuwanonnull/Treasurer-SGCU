import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { chromium } from '@playwright/test';
import { server } from '../preview/serve-onboarding-preview.mjs';
const ctx = vm.createContext({});
vm.runInContext(await fs.readFile('web/js/core/app.tour-policy.js','utf8'), ctx);
const p = ctx.sgcuTourPolicy;
const pages = ['financial-docs','project-status','borrow-assets','meeting-room-booking','login'];
const student = p.build({type:'student',mode:'normal',pages});
assert.equal(student.steps.length,4);
assert.equal(p.build({type:'affairs',mode:'normal',pages}).steps.every(s=>s.page==='meeting-room-booking'),true);
assert.equal(p.pending(student,{seen:student.steps.map(s=>s.id)}).length,0);
const expanded = p.build({type:'student',mode:'normal',representativeApproved:true,pages:[...pages,'budget-approval-request']});
assert.equal(p.pending(expanded,{seen:student.steps.map(s=>s.id)})[0].page,'budget-approval-request');
const staff = p.build({type:'affairs',mode:'staff',staffApproved:true,pages:['login','meeting-room-staff','budget-approval-staff']});
const added = p.pending(staff,{seen:['mode','meeting-room-staff']});
assert.equal(added.length,1); assert.equal(added[0].page,'budget-approval-staff');
assert.equal(added[0].text.includes('ห้องประชุม'),false);
assert.equal(p.eligible({deferredSession:'session',deferUntil:0},'session'),false);
assert.equal(p.eligible({deferUntil:Date.now()+86400000},'new-session'),false);
const pendingRepresentative = p.build({type:'student',mode:'normal',representativeApproved:false,pages:[...pages,'budget-approval-request']});
assert.equal(pendingRepresentative.steps.some(s=>s.page==='budget-approval-request'),false);
assert.equal(expanded.key,'representative_v1');
assert.equal(expanded.steps.length,1);
assert.equal(p.build({type:'student',mode:'staff',staffApproved:false,pages:['login','dashboard-staff']}).steps.length,0);
assert.equal(p.build({type:'affairs',mode:'normal',staffApproved:true,pages}).steps.length,0);
assert.equal(p.build({type:'affairs',mode:'normal',staffApproved:true,pages,replayStaffPages:['login','meeting-room-staff']},true).steps.length,7);
assert.equal(p.pending(expanded,p.recordFor(expanded,{general_v1:{seen:['budget-approval-request']}})).length,0);
assert.equal(p.eligible(p.recordFor(expanded,{general_v1:{deferUntil:Date.now()+86400000}}),'new'),true);
const replayRep = p.build({type:'student',mode:'normal',representativeApproved:true,pages:[...pages,'budget-approval-request']},true);
assert.equal(replayRep.steps.length,5);
const replayStaff = p.build({type:'student',mode:'staff',staffApproved:true,representativeApproved:true,pages:['login','meeting-room-staff'],generalPages:[...pages,'budget-approval-request'],replayStaffPages:['login','meeting-room-staff']},true);
assert.equal(replayStaff.steps.length,7);
assert.equal(replayStaff.steps[0].mode,'normal');
assert.equal(replayStaff.steps.at(-1).mode,'staff');
assert.equal(replayStaff.steps.some(s=>s.page==='budget-approval-staff'),false);
const cutoff = '2026-11-19T15:25:47Z';
const oldUser = { metadata: { creationTime: '2026-01-01T00:00:00Z' } };
const newUser = { metadata: { creationTime: '2026-11-20T00:00:00Z' } };
const oldBaseline = p.rolloutBaseline({user:oldUser},cutoff);
assert.equal(p.pending(student,p.recordFor(student,{rollout_v1:oldBaseline})).length,0);
assert.equal(p.pending(student,p.recordFor(student,{rollout_v1:oldBaseline}),true).length,4);
assert.equal(Object.keys(p.rolloutBaseline({user:newUser},cutoff).seenByTour).length,0);
assert.equal(p.rolloutBaseline({user:{}},cutoff).existing,true);
const oldRep = p.rolloutBaseline({user:oldUser,representativeApproved:true,representativeApprovedAt:'2026-01-01'},cutoff);
assert.equal(p.pending(expanded,p.recordFor(expanded,{rollout_v1:oldRep})).length,0);
const newRep = p.rolloutBaseline({user:oldUser,representativeApproved:true,representativeApprovedAt:'2026-11-20'},cutoff);
assert.equal(p.pending(expanded,p.recordFor(expanded,{rollout_v1:newRep})).length,1);
const oldStaff = p.rolloutBaseline({user:oldUser,staffApproved:true,staffPages:['login','meeting-room-staff','budget-approval-staff'],staffPageApprovedAt:{'meeting-room-staff':'2026-01-01','budget-approval-staff':'2026-11-20'}},cutoff);
const newStaffSteps=p.pending(staff,p.recordFor(staff,{rollout_v1:oldStaff}));
assert.equal(newStaffSteps.length,1);
assert.equal(newStaffSteps[0].page,'budget-approval-staff');
assert.equal(p.timestamp({seconds:100}),100000);
if (process.argv.includes('--policy-only')) { console.log('Tour policy: role filtering, incremental permissions, completion and deferral passed.'); process.exit(0); }
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({headless:true});
  // Keep the simulated preview independent of third-party font/network latency.
  const createContext = browser.newContext.bind(browser);
  browser.newContext = async options => {
    const context = await createContext(options);
    context.setDefaultTimeout(15000);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    return context;
  };
  const errors=[];
  // Signed-out preview must retain the original login layout, without profile or tour.
  const loginContext = await browser.newContext();
  const loginPage = await loginContext.newPage();
  await loginPage.goto(url);
  await loginPage.locator('#demoTheme').selectOption('dark');
  assert.equal(await loginPage.locator('html').getAttribute('data-theme'),'dark');
  await loginPage.reload();
  assert.equal(await loginPage.locator('#demoTheme').inputValue(),'dark');
  await loginPage.locator('#demoTheme').selectOption('light');
  assert.equal(await loginPage.locator('html').getAttribute('data-theme'),'light');

  assert.equal(await loginPage.locator('#loginHeroContent').isVisible(), true);
  assert.equal(await loginPage.locator('#loginProfileCard').isVisible(), false);
  assert.equal(await loginPage.locator('#staffModeToggle').isVisible(), false);
  await loginPage.waitForTimeout(1200);
  assert.equal(await loginPage.locator('dialog[open]').count(), 0);
  await fs.mkdir('.local/onboarding-preview',{recursive:true});
  await loginPage.screenshot({path:'.local/onboarding-preview/login-before.png'});
  assert.equal(await loginPage.locator('#authAccessOpen').isVisible(), true);
  await loginPage.locator('#authAccessOpen').click();
  assert.equal(await loginPage.locator('#authAccessModal').getAttribute('aria-hidden'), 'false');
  await loginPage.locator('#authAccessCheck').click();
  assert.equal(await loginPage.locator('#authAccessEmail').inputValue(), 'applicant@example.invalid');
  await loginPage.locator('#authAccessName').fill('ผู้ขอทดสอบ');
  await loginPage.locator('#authAccessOrganization').fill('หน่วยงานทดสอบ');
  await loginPage.locator('#authAccessReason').fill('ทดสอบหน้าพรีวิว');
  await loginPage.locator('#authAccessRequestForm button[type="submit"]').click();
  assert.match(await loginPage.locator('#authAccessStatus').textContent(), /ไม่มีการส่งข้อมูลจริง/);
  await loginPage.keyboard.press('Escape');
  assert.equal(await loginPage.locator('#authAccessModal').getAttribute('aria-hidden'), 'true');
  assert.equal(await loginPage.locator('dialog[open]').count(), 0);
  await loginPage.locator('#loginPageGoogleBtn').click();
  assert.equal(await loginPage.locator('#authAccessSelfService').isVisible(), false);
  assert.equal(await loginPage.locator('#loginHeroContent').isVisible(), false);
  assert.equal(await loginPage.locator('#loginProfileCard').isVisible(), true);
  assert.equal(await loginPage.locator('#loginPageGoogleBtn').isVisible(), false);
  assert.equal(await loginPage.locator('#loginPageLogoutBtn').isVisible(), true);
  await loginPage.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).waitFor();
  await loginPage.getByRole('button',{name:'ข้ามชุดนี้',exact:true}).click();
  await loginPage.screenshot({path:'.local/onboarding-preview/login-after.png'});
  const consentBox = await loginPage.locator('#loginViewConsentBtn').boundingBox();
  const replayBox = await loginPage.locator('#onboardingReplayBtn').boundingBox();
  assert.ok(replayBox.x > consentBox.x);
  assert.equal(await loginPage.locator('.login-profile-help-links #onboardingReplayBtn').count(),1);
  await loginPage.locator('.login-profile-help-links').screenshot({path:'.local/onboarding-preview/profile-help-links.png'});

  // Use the visible controls to select and log in as each supported account type.
  const personas = ['temporary','representative','affairs','staff','affairs_staff','head'];
  for (const persona of personas) {
    await loginPage.locator('#demoPersona').selectOption(persona);
    await loginPage.locator('#demoLogin').click();
    await loginPage.waitForFunction(value => window.demoAccount?.user?.uid === 'demo-' + value, persona);
    assert.equal(await loginPage.evaluate(()=>demoAccount.mode), 'normal');
    if (['temporary','affairs'].includes(persona)) {
      await loginPage.getByRole('button',{name:'ข้ามชุดนี้',exact:true}).click();
    } else {
      await loginPage.waitForTimeout(1400);
      assert.equal(await loginPage.locator('dialog[open]').count(),0);
      assert.equal(await loginPage.locator('#staffModeToggle').isVisible(),false);
      assert.equal(await loginPage.evaluate(()=>demoAccount.pages.includes('budget-approval-request')),false);
      await loginPage.locator('#demoApprove').click();
      if (persona === 'representative') {
        await loginPage.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
        await loginPage.getByRole('heading',{name:'ยื่นคำขอขององค์กร'}).waitFor();
        assert.match(await loginPage.locator('.sgcu-tour-progress').textContent(),/1 จาก 1/);
        await loginPage.getByRole('button',{name:'ข้าม',exact:true}).click();
      }
    }
    if (persona === 'temporary') {
      assert.equal(await loginPage.locator('#loginProfileOrganizationField').isVisible(),true);
      assert.equal(await loginPage.locator('#loginProfileStudentFields').isVisible(),false);
    }
    if (persona === 'representative') assert.equal(await loginPage.evaluate(()=>demoAccount.pages.includes('budget-approval-request')),true);
    if (persona.includes('affairs')) assert.equal(await loginPage.evaluate(()=>demoAccount.pages.includes('borrow-assets')),false);
    if (['staff','affairs_staff','head'].includes(persona)) {
      await loginPage.locator('[data-staff-mode="staff"]').click();
      await loginPage.getByRole('button',{name:'ข้ามชุดนี้',exact:true}).click();
      assert.equal(await loginPage.evaluate(()=>demoAccount.mode),'staff');
      const canManageUsers=await loginPage.evaluate(()=>demoAccount.pages.includes('staff-approval'));
      assert.equal(canManageUsers,persona==='head');
      await loginPage.locator('[data-staff-mode="normal"]').click();
    }
    await loginPage.locator('#demoLogout').click();
    assert.equal(await loginPage.locator('#authAccessSelfService').isVisible(),true);
  }
  await loginPage.setViewportSize({width:390,height:844});
  await loginPage.locator('.demo-controls').screenshot({path:'.local/onboarding-preview/demo-controls-mobile.png'});
  assert.equal(await loginPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await loginContext.close();

  // Manual replay includes both modes, can cross back, and excludes ungranted staff pages.
  const replayContext = await browser.newContext();
  const replayPage = await replayContext.newPage();
  await replayPage.goto(`${url}/?persona=staff&approval=approved&mode=staff&legacy=1&autologin=1`);
  await replayPage.getByRole('button',{name:'แนะนำการใช้งาน',exact:true}).click();
  await replayPage.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  await replayPage.getByRole('heading',{name:'หาแบบฟอร์มได้ที่นี่'}).waitFor();
  assert.equal(await replayPage.evaluate(()=>demoAccount.mode),'normal');
  for (let i=0;i<4;i++) await replayPage.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await replayPage.getByRole('heading',{name:'ขณะนี้คุณอยู่ในโหมดสตาฟ'}).waitFor();
  assert.equal(await replayPage.evaluate(()=>demoAccount.mode),'staff');
  await replayPage.getByRole('button',{name:'ย้อนกลับ',exact:true}).click();
  await replayPage.getByRole('heading',{name:'วางแผนใช้ห้องประชุม'}).waitFor();
  assert.equal(await replayPage.evaluate(()=>demoAccount.mode),'normal');
  await replayPage.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await replayPage.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await replayPage.getByRole('heading',{name:'เข้าถึงงานโครงการและข้อมูล'}).waitFor();
  await replayPage.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await replayPage.getByRole('heading',{name:'ตรวจสอบคำขอที่รับผิดชอบ'}).waitFor();
  await replayPage.getByRole('button',{name:'เสร็จสิ้น',exact:true}).click();
  await replayPage.getByRole('heading',{name:'พร้อมเริ่มใช้งานแล้ว'}).waitFor();
  await replayContext.close();
  const legacyContext = await browser.newContext();
  const legacyPage = await legacyContext.newPage();
  await legacyPage.goto(`${url}/?legacy=1&autologin=1`);
  await legacyPage.waitForFunction(()=>localStorage.getItem('demo-remote:demo-student')?.includes('rollout_v1'));
  assert.equal(await legacyPage.locator('dialog[open]').count(),0);
  await legacyPage.locator('#onboardingReplayBtn').click();
  await legacyPage.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).waitFor();
  await legacyPage.getByRole('button',{name:'ข้ามชุดนี้',exact:true}).click();
  await legacyPage.evaluate(()=>{
    demoAccount.representativeApproved=true;
    demoAccount.representativeApprovedAt=Date.parse(SGCU_APP_CONFIG.onboarding.rolloutAt)+60000;
    demoAccount.pages.push('budget-approval-request');
    document.querySelectorAll('a[data-page="budget-approval-request"]').forEach(el=>el.style.display='');
  });
  await legacyPage.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  await legacyPage.getByRole('heading',{name:'ยื่นคำขอขององค์กร'}).waitFor();
  assert.match(await legacyPage.locator('.sgcu-tour-progress').textContent(),/1 จาก 1/);
  await legacyContext.close();

  const context=await browser.newContext();
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${url}/?autologin=1`);
  await page.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  await page.getByRole('heading',{name:'หาแบบฟอร์มได้ที่นี่'}).waitFor();
  await page.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await page.getByRole('heading',{name:'ติดตามโครงการ',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'กำลังเตรียมคำแนะนำ'}).count(),0);
  await page.reload();
  await page.getByRole('button',{name:'ดูต่อ',exact:true}).click();
  await page.getByRole('heading',{name:'ติดตามโครงการ',exact:true}).waitFor();
  await page.getByRole('button',{name:'ข้าม',exact:true}).click();
  await page.reload();
  await page.waitForTimeout(1600);
  assert.equal(await page.locator('dialog[open]').count(),0);
  await page.getByRole('button',{name:'แนะนำการใช้งาน',exact:true}).click();
  await page.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  await page.getByRole('heading',{name:'หาแบบฟอร์มได้ที่นี่'}).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(),0);
  // Fresh browser storage with only the remote profile simulates another device.
  const remote=await page.evaluate(()=>localStorage.getItem('demo-remote:demo-student'));
  const other=await browser.newContext(); const otherPage=await other.newPage();
  await otherPage.addInitScript(value=>localStorage.setItem('demo-remote:demo-student',value),remote);
  await otherPage.goto(`${url}/?autologin=1`); await otherPage.waitForTimeout(1600);
  assert.equal(await otherPage.locator('dialog[open]').count(),0);
  // Incomplete profile and consent both prevent onboarding.
  const gated=await browser.newContext(); const gatedPage=await gated.newPage();
  await gatedPage.goto(`${url}/?autologin=1`); await gatedPage.evaluate(()=>{sgcuLoginProfileState.isComplete=false;});
  await gatedPage.waitForTimeout(1300); assert.equal(await gatedPage.locator('dialog[open]').count(),0);
  await gatedPage.evaluate(()=>{sgcuLoginProfileState.isComplete=true;demoConsent=false;});
  await gatedPage.waitForTimeout(1300); assert.equal(await gatedPage.locator('dialog[open]').count(),0);
  await gatedPage.evaluate(()=>{demoConsent=true;});
  await gatedPage.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).waitFor();
  await gated.close();
  // Mobile uses real mobile navigation and then the five meeting form targets.
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${url}/?persona=affairs&autologin=1`);
  await page.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  const titles=['ตรวจสอบตารางก่อนจอง','เลือกห้องและวันที่','กำหนดช่วงเวลา','ระบุรายละเอียดก่อนส่ง','ติดตามผลการจอง'];
  await fs.mkdir('.local/onboarding-preview',{recursive:true});
  for(let i=0;i<titles.length;i++) {
    await page.getByRole('heading',{name:titles[i],exact:true}).waitFor();
    assert.equal(await page.locator('.sgcu-tour-track span').count(),5);
    assert.equal(await page.locator('.sgcu-tour-track .is-current').count(),1);
    assert.equal(await page.locator('.sgcu-tour-track .is-complete').count(),i);
    assert.equal(await page.locator('.sgcu-tour.has-spotlight').count(),1);
    assert.equal(await page.locator('.sgcu-tour').evaluate(el=>getComputedStyle(el,'::backdrop').backgroundColor),'rgba(0, 0, 0, 0)');

    const box=await page.locator('.sgcu-tour-card').boundingBox();
    assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=391 && box.y+box.height<=845);
    await page.waitForFunction(() => {
      const a = document.querySelector('.sgcu-tour-card').getBoundingClientRect();
      const b = document.querySelector('.sgcu-tour-ring').getBoundingClientRect();
      return a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right;
    });
    if(i===1) {
      await page.screenshot({path:'.local/onboarding-preview/mobile.png'});
      await page.setViewportSize({width:390,height:480});
      await page.evaluate(()=>{
        const el = document.querySelector('#meetingRoomName');
        window.demoAnchorParent = el.parentNode; window.demoAnchorNext = el.nextSibling;
        document.body.append(el); el.style.cssText='position:fixed;bottom:12px;left:16px;width:230px;height:46px;z-index:1000';
        window.dispatchEvent(new Event('resize'));
      });
      await page.waitForFunction(()=>{
        const card = document.querySelector('.sgcu-tour-card').getBoundingClientRect();
        const target = document.querySelector('#meetingRoomName').getBoundingClientRect();
        const ring = document.querySelector('.sgcu-tour-ring').getBoundingClientRect();
        return card.bottom < target.top && card.top >= 0 && Math.abs(ring.top - (target.top - 4)) < 1;
      });
      assert.equal(await page.locator('.sgcu-tour-card').getAttribute('data-placement'),'above');
      await page.screenshot({path:'.local/onboarding-preview/mobile-bottom-anchor.png'});
      await page.evaluate(()=>{
        const el=document.querySelector('#meetingRoomName'); el.removeAttribute('style');
        demoAnchorParent.insertBefore(el,demoAnchorNext);
      });
      await page.setViewportSize({width:390,height:844});
    }
    await page.getByRole('button',{name:i===4?'เสร็จสิ้น':'ถัดไป',exact:true}).click();
  }
  await page.getByRole('heading',{name:'พร้อมเริ่มใช้งานแล้ว'}).waitFor();
  const writes=await page.evaluate(()=>demoWrites);
  assert.ok(writes.every(w=>Object.keys(w).join()==='onboardingTours'));
  await page.getByRole('button',{name:'เสร็จสิ้น',exact:true}).click();
  // Student mobile menu target; keyboard focus remains in the tour.
  await page.goto(`${url}/?persona=temporary&autologin=1`);
  await page.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  await page.getByRole('heading',{name:'หาแบบฟอร์มได้ที่นี่'}).waitFor();
  assert.equal(await page.locator('#hamburgerBtn').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#mobileMenu details[open]:not(.is-single)').count(),0);
  assert.equal(await page.locator('#mobileMenu').evaluate(el => el.getAnimations({subtree:true}).some(a => a.playState === 'running')),false);
  const initialRing = await page.locator('.sgcu-tour-ring').boundingBox();
  await page.waitForTimeout(450);
  const settledRing = await page.locator('.sgcu-tour-ring').boundingBox();
  assert.ok(Math.abs(initialRing.y - settledRing.y) < 1, 'Spotlight must not drift after menu animation');
  for(let i=0;i<6;i++) {await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>!!document.activeElement.closest('.sgcu-tour')),true);}
  await page.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await page.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await page.getByRole('heading',{name:'ต้องการยืมพัสดุ เริ่มที่นี่'}).waitFor();
  assert.equal(await page.locator('#mobileMenu details[open]:not(.is-single) summary').textContent(),'ยื่นคำขอ');
  assert.match(await page.locator('.sgcu-tour-card').textContent(),/ยื่นคำขอ → ยืม-คืนพัสดุ/);
  await page.setViewportSize({width:1280,height:900});
  await page.waitForFunction(() => document.querySelector('#desktopNavGeneral [data-page="borrow-assets"]').closest('.nav-group-menu').classList.contains('show'));
  assert.equal(await page.locator('#mobileMenu').isVisible(),false);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(() => document.querySelector('#hamburgerBtn').getAttribute('aria-expanded') === 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#mobileMenu').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('#mobileMenu details[data-mobile-nav="general"]').first().getAttribute('open'),'');
  // Staff mode and permission loss do not leave a blocking overlay.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(`${url}/?persona=staff&autologin=1&mode=staff&approval=approved`);
  await page.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  await page.getByRole('heading',{name:'ขณะนี้คุณอยู่ในโหมดสตาฟ'}).waitFor();
  await page.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await page.getByRole('heading',{name:'เข้าถึงงานโครงการและข้อมูล'}).waitFor();
  await page.screenshot({path:'.local/onboarding-preview/desktop.png'});
  await page.evaluate(()=>{demoAccount.mode='normal';});
  await page.waitForTimeout(1100); assert.equal(await page.locator('dialog[open]').count(),0);
  // Removed targets are skipped without an endless prompt; offline writes retry.
  const edge=await browser.newContext(); const edgePage=await edge.newPage();
  await edgePage.goto(`${url}/?persona=affairs&autologin=1`);
  await edgePage.evaluate(()=>{document.querySelector('#meetingRoomCalendarPanel').remove();demoOffline=true;});
  await edgePage.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  await edgePage.getByRole('heading',{name:'เลือกห้องและวันที่',exact:true}).waitFor();
  await edgePage.getByRole('button',{name:'ข้าม',exact:true}).click();
  await edgePage.waitForTimeout(1200); assert.equal(await edgePage.locator('dialog[open]').count(),0);
  await edgePage.evaluate(()=>{demoOffline=false;window.dispatchEvent(new Event('online'));});
  await edgePage.waitForFunction(()=>demoWrites.length>0);
  await edgePage.reload();
  await edgePage.waitForTimeout(1300);
  // The previously unavailable calendar can be explained on the next visit.
  await edgePage.getByRole('button',{name:'ข้ามชุดนี้',exact:true}).click();
  await edgePage.evaluate(()=>{demoAccount.user=null;});
  await edgePage.waitForTimeout(1100); assert.equal(await edgePage.locator('dialog[open]').count(),0);
  await edge.close();
  const reduced = await browser.newContext({reducedMotion:'reduce'});
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${url}/?persona=affairs&autologin=1&theme=dark`);
  await reducedPage.getByRole('button',{name:'เริ่มแนะนำ',exact:true}).click();
  await reducedPage.getByRole('heading',{name:'ตรวจสอบตารางก่อนจอง'}).waitFor();
  assert.ok(await reducedPage.locator('.sgcu-tour-card').evaluate(el=>getComputedStyle(el).transitionDuration.split(',').every(value=>parseFloat(value)<=0.001)));
  await reducedPage.getByRole('button',{name:'ถัดไป',exact:true}).click();
  await reducedPage.getByRole('heading',{name:'เลือกห้องและวันที่'}).waitFor();
  assert.equal(await reducedPage.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await reducedPage.locator('.sgcu-tour-card').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(34, 34, 34)');
  await reducedPage.screenshot({path:'.local/onboarding-preview/tour-dark.png'});
  await reduced.close();
  assert.deepEqual(errors,[]);
  console.log('Tour policy and browser checks passed: roles, new permissions, gates, resume, skip, replay, defer, cross-device profile, mobile, keyboard and mode changes.');
} finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
