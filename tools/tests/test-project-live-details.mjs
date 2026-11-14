import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();page.setDefaultTimeout(15000);
 let mode='wrong-year';
 await page.route('**/preview-details',async route=>{
  if(mode==='failure')return route.fulfill({status:503,json:{error:'unavailable'}});
  const row={year:mode==='wrong-year'?2569:2568,code:'SGCU68-001',decreeNo:'<img src=x onerror=alert(1)>',approveDate:'15/06/2568',approvedBudget100:999999999,approvalStatus:'BAD-SOURCE-STATUS'};
  return route.fulfill({json:mode==='duplicate'?[row,row]:[row]});
 });
 await page.goto('http://127.0.0.1:4175');const ui=id=>page.locator(`[data-live-id="${id}"]`);
 await ui('projects').locator('button').first().click();const modal=ui('modal');
 const retry=modal.getByRole('button',{name:'ลองโหลดรายละเอียดอีกครั้ง'});
 await retry.waitFor({state:'visible'});assert.equal(await modal.getByText('15/06/2568',{exact:true}).count(),0);
 mode='duplicate';await retry.click();await retry.waitFor({state:'visible'});
 assert.equal(await modal.getByText('15/06/2568',{exact:true}).count(),0);
 mode='failure';await retry.click();await retry.waitFor({state:'visible'});
 await modal.getByRole('tab',{name:'ข้อมูลและการอนุมัติ',exact:true}).click();assert.ok(await modal.getByRole('button',{name:'แก้ยอดงบอนุมัติ',exact:true}).isEnabled());
 mode='valid';await retry.click();await modal.getByText('15/06/2568',{exact:true}).waitFor();
 await modal.getByRole('tab',{name:'ปิดโครงการ',exact:true}).click();
 assert.equal(await modal.locator('img').count(),0);
 assert.ok((await modal.innerText()).includes('<img src=x onerror=alert(1)>'));
 assert.ok(!(await modal.innerText()).includes('BAD-SOURCE-STATUS'));
 assert.ok(!(await modal.innerText()).includes('999999999'));
 assert.ok((await modal.innerText()).includes('1,500.00 บาท'));
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.ok(await modal.evaluate(e=>e.scrollWidth<=e.clientWidth));await ui('modal-body').evaluate(e=>e.scrollTop=0);await page.screenshot({path:`/tmp/project-complete-${width}.png`});}
 const dataSource=await readFile(new URL('../../web/js/features/project/app.data.js',import.meta.url),'utf8');
 await page.addScriptTag({content:dataSource.slice(dataSource.indexOf('function parsePublishedSheetRows('),dataSource.indexOf('function parsePublishedSheetIndex('))});
 const parsed=await page.evaluate(()=>{
  const cells=Array.from({length:28},(_,i)=>`<td>${i===3?'<a href="https://example.com/project">ไฟล์โครงการ</a>':i===19?'<a href="javascript:alert(1)">ข้อความไฟล์</a>':i===27?'<a href="https://example.com/advance">ใบยืม</a>':`value-${i}`}</td>`).join('');
  const html=`<table class="waffle"><tbody><tr><th>1</th>${cells}</tr></tbody></table>`;
  return {plain:parsePublishedSheetRows(html)[0],linked:parsePublishedSheetRows(html,{preserveProjectDocumentLinks:true})[0]};
 });
 assert.equal(parsed.plain[3],'ไฟล์โครงการ');assert.equal(parsed.linked[3],'https://example.com/project');assert.equal(parsed.linked[19],'ข้อความไฟล์');assert.equal(parsed.linked[27],'https://example.com/advance');assert.equal(parsed.linked[4],'value-4');
 console.log('PASS: exact year/code match, duplicate rejection, source failure/retry, live-value precedence, safe text rendering, responsive details');
}finally{await browser.close()}
