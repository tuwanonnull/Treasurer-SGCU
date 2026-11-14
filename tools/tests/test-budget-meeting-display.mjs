import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {loadMeetingFixture} from '../emulator/budget-meeting-test-fixture.mjs';
const origin=process.env.BUDGET_MEETING_TEST_ORIGIN || 'http://127.0.0.1:4197';
const browser=await chromium.launch();
const context=await browser.newContext();
const host=await context.newPage();
const errors=[];host.on('pageerror',e=>errors.push(e.message));
const action=name=>host.locator(`[data-action="${name}"]`).first().click();
const submit=name=>host.locator(`[data-form="${name}"] button[type="submit"]`).click();
try{
 await host.goto(`${origin}/budget-meeting-preview.html`);
 await loadMeetingFixture(host);
 const popup=context.waitForEvent('page');await action('open-display');const display=await popup;
 display.on('pageerror',e=>errors.push(e.message));
 await display.setViewportSize({width:1920,height:1080});
 await display.locator('.bmd-title h2').waitFor();
 assert.equal(await display.locator('.bmd-title h2').innerText(),'เตรียมประชุม');
 assert.equal(await display.locator('button').count(),1);
 await display.evaluate(()=>{
  window.testChannel=new BroadcastChannel(`sgcu-budget-display:${location.hash.slice(1)}`);
  window.testChannel.onmessage=event=>{if(event.data.type==='state')window.lastPublicSnapshot=event.data.snapshot;};
  window.testChannel.postMessage({type:'request-state'});
 });
 await display.waitForFunction(()=>window.lastPublicSnapshot);
 const data=await display.evaluate(()=>window.lastPublicSnapshot);
 for(const key of ['orgs','logs','ballots','picked','votes','email','members'])assert.equal(key in data,false);
 for(const width of [390,320]){await host.setViewportSize({width,height:900});assert.equal(await host.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await host.setViewportSize({width:1280,height:900});
 await host.locator('[name="ack"]').check();await submit('setup');
 await display.getByRole('heading',{name:'มติกรอบงบ',exact:true}).waitFor();
 await display.screenshot({path:'/tmp/bm-room-budget.png',fullPage:true});
 await action('open-vote');await host.locator('[name="no"]').fill('6');await host.locator('[name="missing"]').fill('0');
 assert.equal(await display.locator('.bmd-result').count(),0);
 await display.evaluate(()=>window.testChannel.postMessage({type:'request-state'}));
 await display.waitForFunction(()=>window.lastPublicSnapshot.open===true);
 assert.equal(await display.evaluate(()=>window.lastPublicSnapshot.result),null);
 await submit('vote');await display.locator('.bmd-result').waitFor();
 assert.match(await display.locator('.bmd-result').innerText(),/เสียงข้างมากไม่พึงพอใจ/);
 await action('dissatisfied');await submit('cancel');
 await host.locator('[name="nominee"]').first().selectOption('0');await submit('nominate');
 assert.equal(await display.locator('.bmd-rank').count(),0);
 await action('rank');await display.locator('.bmd-rank').waitFor();
 assert.equal(await display.locator('.bmd-ranking-table td.bmd-name').first().evaluate(el=>getComputedStyle(el).textAlign),'left');
 assert.equal(await display.locator('.bmd-ranking-table th.bmd-name').evaluate(el=>getComputedStyle(el).textAlign),'left');
 await display.screenshot({path:'/tmp/bm-room-ranking.png',fullPage:true});
 await action('choose-project');await host.locator('[name="recipient"][value="1"]').check();await submit('recipients');
 await display.locator('[data-display-clock]').waitFor();
 await action('timer');
 await display.waitForFunction(()=>document.querySelector('[data-display-clock]').textContent!=='05:00');
 await action('timer');
 await display.waitForFunction(()=>document.querySelector('[data-clock-status]').textContent.includes('พักเวลา'));
 assert.equal(await display.locator('[data-display-clock]').innerText(),await host.locator('[data-clock]').innerText());
 await display.evaluate(()=>window.testChannel.postMessage({type:'next-stage'}));
 assert.equal((await host.locator('.bm-hearing-steps [aria-current]').innerText()).replaceAll('\n',''),'1เจ้าของชี้แจง · 5 นาที');
 for(const width of [1920,1366]){
  await display.setViewportSize({width,height:width===1920?1080:768});
  assert.equal(await display.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await display.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
  await display.screenshot({path:`/tmp/bm-room-timer-${width}.png`,fullPage:true});
 }
 const second=await context.newPage();await second.goto(`${origin}/budget-meeting-preview.html`);
 assert.notEqual(await host.evaluate(()=>sessionStorage.getItem('sgcu-budget-display:standalone')),await second.evaluate(()=>sessionStorage.getItem('sgcu-budget-display:standalone')));
 await second.close();
 await host.close();await display.locator('#display-warning:not([hidden])').waitFor();
 assert.match(await display.locator('#display-warning').innerText(),/ขาดการเชื่อมต่อ/);
 assert.deepEqual(errors,[]);
 console.log('Passed: two-screen sync, public-only snapshots, hidden live results, announced rankings, timer/pause, isolation, no display commands and controller disconnection.');
}finally{await browser.close();}
