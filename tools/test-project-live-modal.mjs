import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4175');const ui=id=>page.locator(`[data-live-id="${id}"]`);
 await ui('total').getByText('28',{exact:true}).waitFor();
 await ui('group').selectOption('ชมรมฝ่ายกีฬา');await ui('matched').getByText('14',{exact:true}).waitFor();
 assert.deepEqual(await ui('organization').locator('option').allTextContents(),['ทุกฝ่าย / ทุกชมรม','ชมรมแบดมินตัน','ชมรมฟุตบอล']);
 await ui('organization').selectOption('ชมรมฟุตบอล');await ui('matched').getByText('7',{exact:true}).waitFor();
 await ui('clear').click();await ui('matched').getByText('28',{exact:true}).waitFor();
 await ui('next').click();await ui('page').getByText('หน้า 2 / 2',{exact:true}).waitFor();assert.equal(await ui('next').isEnabled(),false);
 const opener=ui('projects').locator('button').first();await opener.focus();await opener.press('Enter');await ui('modal').waitFor({state:'visible'});
 assert.ok((await ui('modal-body').innerText()).includes('ผู้รับผิดชอบตรวจโครงการ'));
 await page.keyboard.press('Escape');await ui('modal').waitFor({state:'hidden'});assert.ok(await opener.evaluate(e=>document.activeElement===e));
 await opener.click();const form=ui('modal').locator('form').first();
 await form.getByLabel('งบอนุมัติ',{exact:true}).fill('2000');await form.getByLabel('เหตุผล / หมายเหตุ').fill('ทดสอบพรีวิว');
 const save=form.getByRole('button',{name:'ยืนยันบันทึก',exact:true});assert.equal(await save.isEnabled(),false);
 await form.getByRole('button',{name:'ดูผลก่อนบันทึก',exact:true}).click();await save.waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[data-live-id="modal"] button[type="submit"]').disabled);
 await form.getByLabel('งบอนุมัติ',{exact:true}).fill('2100');assert.equal(await save.isEnabled(),false);
 await form.getByRole('button',{name:'ดูผลก่อนบันทึก',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-live-id="modal"] button[type="submit"]').disabled);await save.click();
 await ui('modal-message').getByText('โหมดพรีวิว: ทดลองดูผลได้ แต่ยังไม่บันทึกหรือเปลี่ยนสิทธิ์ข้อมูล',{exact:true}).waitFor();
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await ui('modal').evaluate(e=>e.scrollWidth<=e.clientWidth));await page.screenshot({path:`/tmp/project-modal-${width}.png`});}
 page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');assert.ok(await ui('modal').isVisible());
 page.once('dialog',d=>d.accept());await ui('modal-close').click();await ui('modal').waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);console.log('PASS: dependent filters across all projects, pagination, modal keyboard/focus, detail fields, preview invalidation, in-modal errors, unsaved close protection, desktop/mobile overflow');
}finally{await browser.close()}
