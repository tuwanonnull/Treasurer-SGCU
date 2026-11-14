import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { restoreFirestoreBackup, validateFirestoreBackup } from './firestore-backup.mjs';
import { createLoginFixture } from './emulator-fixture.mjs';
import { createAuthenticatedPilotServer } from './emulator-server.mjs';

const source = await readFile(process.argv[2], 'utf8'), snapshot = JSON.parse(source);
const fixture = await createLoginFixture(2568);
const trialId = `browser-${crypto.randomUUID()}`;
const backupDirectory = await mkdtemp(path.join(tmpdir(), 'sgcu-browser-auto-'));
let server = await createAuthenticatedPilotServer({ snapshot, identity: fixture.identity, users: fixture.users, academicYear: 2568, trialId, backupDirectory });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let recoveredServer;
const recoveryId = `${trialId}-recovered`;
try {
  for (const [key, name] of [['head', 'เหรัญญิก'], ['secretary', 'เลขานุการฝ่ายเหรัญญิก'], ['assistantA', 'ผู้ช่วยเหรัญญิก']]) {
    const account = fixture.credentials[key];
    await fixture.identity.auth.updateUser(account.uid, { emailVerified: true });
    await fixture.identity.db.collection('staffProfiles').doc(account.email).set({ positions: [{ name }] });
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const pages = {}, errors = []; let staffReviewReads = 0;
  const message = (page, text) => page.locator('#message').filter({ hasText: text }).waitFor();
  const state = async page => ({ ...await (await page.request.get(base + '/api/year68/trial')).json(), ...await (await page.request.get(base + '/api/year68/trial/history')).json() });
  for (const key of ['head', 'secretary', 'assistantA', 'assistantB']) {
    const context = await browser.newContext(); const page = await context.newPage(); pages[key] = page;
    page.on('pageerror', error => errors.push(error.message));
    if (key === 'head') page.on('request', req => { if (req.url().endsWith('/staff-review')) staffReviewReads++; });
    await page.goto(base);
    assert.equal((await page.request.get(base + '/api/year68/trial')).status(), 401);
    assert.equal((await page.request.get(base + '/api/year68/trial/backup')).status(), 401);
    await page.getByLabel('อีเมล', { exact: true }).fill(fixture.credentials[key].email);
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click(); await message(page, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(fixture.credentials[key].password);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click(); await message(page, 'โหลดข้อมูลล่าสุดแล้ว');
    assert.equal(await page.locator('#user').isVisible(), false);
    const cookie = (await context.cookies()).find(c => c.name === 'project_auth');
    assert.equal(cookie.httpOnly, true); assert.equal(cookie.sameSite, 'Strict');
    assert.equal(await page.evaluate(() => document.cookie.includes('project_auth=')), false);
    assert.equal((await state(page)).user.id, fixture.credentials[key].uid);
    assert.equal((await page.request.post(base + '/api/session', { headers: { Origin: base }, data: { userId: 'head' } })).status(), 404);
  }
  const { head, secretary, assistantA, assistantB } = pages;
  assert.equal(staffReviewReads, 0);
  assert.equal(await head.locator('#staff-review').isVisible(), true);
  for (const page of [secretary, assistantA, assistantB]) {
    assert.equal(await page.locator('#staff-review').isVisible(), false);
    assert.equal((await page.request.get(base + '/api/year68/trial/staff-review')).status(), 403);
  }
  const grantBeforeReview = (await fixture.identity.grantRef(fixture.credentials.head.uid, 2568).get()).data();
  await head.getByRole('button', { name: 'ตรวจบัญชีสตาฟ', exact: true }).click();
  await head.locator('#staff-review-result').getByText(fixture.credentials.head.email, { exact: true }).first().waitFor();
  assert.equal(staffReviewReads, 1);
  assert.ok((await head.locator('#staff-review-result').textContent()).includes('ยังไม่มีการให้สิทธิ์'));
  assert.deepEqual((await fixture.identity.grantRef(fixture.credentials.head.uid, 2568).get()).data(), grantBeforeReview);
  assert.equal((await head.request.post(base + '/api/year68/trial/staff-review', { headers: { Origin: base }, data: {} })).status(), 405);

  await server.stopBackups(); // Wait for the startup backup before verifying its status.
  const backupState = (await state(head)).automaticBackup;
  assert.equal(backupState.enabled, true); assert.equal(backupState.failed, false);
  assert.equal(backupState.overdue, false); assert.equal(backupState.offsiteVerified, false);
  assert.equal((await state(secretary)).automaticBackup, undefined);
  assert.equal((await state(assistantA)).automaticBackup, undefined);
  await head.locator('#refresh').click(); await message(head, 'โหลดข้อมูลล่าสุดแล้ว');
  assert.ok((await head.locator('#automatic-backup-status').textContent()).includes('ยังไม่ส่งขึ้น Google Drive อัตโนมัติ'));
  assert.equal(await secretary.locator('#automatic-backup-status').isVisible(), false);
  const chosen = (await state(head)).projects[0];
  await head.locator('#list summary').first().click();
  await head.getByLabel('ผู้ช่วยจำลอง', { exact: true }).first().selectOption(fixture.credentials.assistantA.uid);
  await head.getByRole('button', { name: 'บันทึกผู้รับผิดชอบจำลอง', exact: true }).first().click(); await message(head, 'มอบหมายผู้ช่วยจำลองแล้ว');
  await assistantA.locator('#refresh').click(); await message(assistantA, 'โหลดข้อมูลล่าสุดแล้ว');
  assert.equal((await state(assistantA)).totalCount, 1); assert.equal((await state(assistantB)).totalCount, 0);
  await assistantA.locator('#list summary').first().click();
  assert.equal(await assistantA.getByRole('button', { name: 'ดูผลก่อนบันทึก', exact: true }).count(), 0);
  const assistantProject = (await state(assistantA)).projects[0];
  const forgedMoney = await assistantA.request.post(base + '/api/year68/trial/commit', {
    headers: { Origin: base }, data: { projectId: assistantProject.id, version: assistantProject.version, changes: { O: '1.00' }, reason: 'ปลอมคำขอแก้ยอด', userId: fixture.credentials.head.uid }
  });
  assert.equal(forgedMoney.status(), 403);
  assert.equal((await state(head)).projects[0].money.O, chosen.money.O);

  // Secretary proposes a one-satang change; only head can approve it.
  await secretary.locator('#refresh').click(); await message(secretary, 'โหลดข้อมูลล่าสุดแล้ว');
  const card = secretary.locator('#list details').first(); await card.locator('summary').click();
  await card.getByLabel(snapshot.moneyLabels.O, { exact: true }).fill(((chosen.money.O ?? 0) / 100 + 0.01).toFixed(2));
  await card.getByLabel('เหตุผล', { exact: true }).fill('ทดสอบบัญชี Emulator');
  await card.getByRole('button', { name: 'ดูผลก่อนบันทึก', exact: true }).click(); await message(secretary, 'ตรวจยอดก่อน');
  await card.getByRole('button', { name: 'เสนอให้เหรัญญิกตรวจ', exact: true }).click(); await message(secretary, 'ส่งคำขอแล้ว');
  const pending = (await state(head)).requests[0];
  assert.equal(pending.proposer, fixture.credentials.secretary.uid);
  assert.equal((await state(head)).projects[0].money.O, chosen.money.O);
  const denied = await secretary.request.post(base + '/api/year68/trial/approve', { headers: { Origin: base }, data: { requestId: pending.id, version: pending.baseVersion } });
  assert.equal(denied.status(), 403);
  await head.locator('#refresh').click(); await message(head, 'โหลดข้อมูลล่าสุดแล้ว');
  await head.getByRole('button', { name: 'อนุมัติคำขอในชุดทดลอง', exact: true }).click(); await message(head, 'อนุมัติและคำนวณยอด');
  const approved = await state(head); assert.equal(approved.projects[0].money.O, (chosen.money.O ?? 0) + 1);
  assert.equal(approved.audit.at(-1).actor, fixture.credentials.head.uid);
  const plain = await (await head.request.get(base + '/api/year68/trial')).json();
  assert.equal(plain.auditLoaded, false); assert.deepEqual(plain.audit, []);
  await head.getByRole('button', { name: 'ดูประวัติ', exact: true }).click(); await message(head, 'โหลดประวัติล่าสุดแล้ว');
  assert.equal(await head.locator('#audit details').count(), approved.audit.length);
  await head.locator('#refresh').click(); await message(head, 'โหลดข้อมูลล่าสุดแล้ว');
  assert.equal(await head.locator('#audit details').count(), 0);
  await head.getByRole('button', { name: 'ดูประวัติ', exact: true }).waitFor();
  assert.deepEqual((await (await assistantB.request.get(base + '/api/year68/trial/history')).json()).audit, []);
  for (const page of [secretary, assistantA, assistantB]) {
    assert.equal(await page.locator('#portable-backup').isVisible(), false);
    assert.equal((await page.request.get(base + '/api/year68/trial/backup')).status(), 403);
  }
  const downloadEvent = head.waitForEvent('download');
  await head.getByRole('button', { name: 'ดาวน์โหลดชุดสำรองทั้งหมด', exact: true }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), 'sgcu-firestore-trial-backup.json');
  const directory = await mkdtemp(path.join(tmpdir(), 'sgcu-firestore-download-')), file = path.join(directory, download.suggestedFilename());
  await download.saveAs(file);
  const bundle = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(validateFirestoreBackup(bundle).checkpoints.length, snapshot.projects.length);
  await restoreFirestoreBackup({ bundle, identity: fixture.identity, trialId: recoveryId });
  recoveredServer = await createAuthenticatedPilotServer({ snapshot, identity: fixture.identity, users: fixture.users, academicYear: 2568, trialId: recoveryId });
  await new Promise(resolve => recoveredServer.listen(0, '127.0.0.1', resolve));
  const recoveryContext = await browser.newContext(), recoveryPage = await recoveryContext.newPage();
  await recoveryPage.goto(`http://127.0.0.1:${recoveredServer.address().port}`);
  await recoveryPage.getByLabel('อีเมล', { exact: true }).fill(fixture.credentials.head.email);
  await recoveryPage.getByLabel('รหัสผ่าน', { exact: true }).fill(fixture.credentials.head.password);
  await recoveryPage.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click(); await message(recoveryPage, 'โหลดข้อมูลล่าสุดแล้ว');
  const recoveredResponse = await recoveryPage.request.get(`http://127.0.0.1:${recoveredServer.address().port}/api/year68/trial`);
  const recoveredView = await recoveredResponse.json();
  recoveredView.audit = (await (await recoveryPage.request.get(`http://127.0.0.1:${recoveredServer.address().port}/api/year68/trial/history`)).json()).audit;
  assert.deepEqual(recoveredView.totals, approved.totals); assert.deepEqual(recoveredView.audit, approved.audit);
  assert.equal(recoveredView.projects[0].trialAssignee, fixture.credentials.assistantA.uid);
  await recoveryContext.close();
  await fixture.identity.grantRef(fixture.credentials.assistantA.uid, 2568).update({ active: false });
  assert.equal((await assistantA.request.get(base + '/api/year68/trial/history')).status(), 403);
  await assistantA.locator('#refresh').click(); await message(assistantA, 'ยังไม่มีสิทธิ์');
  assert.equal(await assistantA.locator('#data').isVisible(), false);
  await head.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click(); await head.locator('#login-form').waitFor();
  assert.equal((await head.request.get(base + '/api/year68/trial')).status(), 401);
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const staffReviewFile = path.join(backupDirectory, 'review-snapshot.json');
  await writeFile(staffReviewFile, JSON.stringify({ source: 'production-snapshot', sourceProjectId: 'departmentwebsite-5aec1', academicYear: 2568,
    mode: 'review-only', writesPerformed: false, readyToActivate: false, checkedAt: new Date().toISOString(), candidateCount: 1,
    candidates: [{ email: fixture.credentials.head.email, role: 'head', uid: fixture.credentials.head.uid, positionYears: { evidence: [{ code: 'SGCU68.10.00.01-001' }] } }], issues: [], differences: [] }));
  await writeFile(path.join(backupDirectory, 'account-identity-notes.json'), JSON.stringify({ source: 'user-confirmed', grantsChanged: false, initialAccess: { academicYear: 2568, scope: 'head-only', headEmail: fixture.credentials.head.email }, accountRoles: [{ email: fixture.credentials.head.email, projectRole: 'head', academicYear: 2568 }] }));
  server = await createAuthenticatedPilotServer({ snapshot, identity: fixture.identity, users: fixture.users, academicYear: 2568, trialId, backupDirectory, staffReviewFile });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  await head.goto(base);
  await head.getByLabel('อีเมล', { exact: true }).fill(fixture.credentials.head.email);
  await head.getByLabel('รหัสผ่าน', { exact: true }).fill(fixture.credentials.head.password);
  await head.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click(); await message(head, 'โหลดข้อมูลล่าสุดแล้ว');
  await server.stopBackups();
  await head.getByRole('button', { name: 'ตรวจบัญชีสตาฟ', exact: true }).click();
  await head.locator('#staff-review-result').getByText(/สำเนาผลตรวจจากระบบสตาฟจริง/).waitFor();
  assert.ok((await head.locator('#staff-review-result').textContent()).includes('เหรัญญิกปี 2568'));
  assert.equal(await head.locator('#staff-review-result tbody tr').first().locator('td').nth(2).textContent(), '2568');
  assert.ok((await head.locator('#staff-review-result').textContent()).includes('แผนเริ่มใช้งานปี 2568: เฉพาะเหรัญญิก'));
  assert.equal((await (await head.request.get(base + '/api/year68/trial/staff-review')).json()).source, 'production-snapshot');
  const reopened = await state(head);
  assert.equal(reopened.automaticBackup.backupAt, backupState.backupAt);
  assert.equal((await readdir(path.join(backupDirectory, trialId))).filter(n => n.startsWith('backup-')).length, 1);
  assert.deepEqual(reopened.projects, approved.projects);
  assert.deepEqual(reopened.requests, approved.requests);
  assert.deepEqual(reopened.audit, approved.audit);
  assert.deepEqual(errors, []); assert.equal(await readFile(process.argv[2], 'utf8'), source);
  console.log('PASS: browser login, UID workflows, head-only backup download, restore downloaded file into separate server, scoped assistant access, revoked grant, logout, restart, head-only automatic backup status and no duplicate on restart, staff review loads on demand and is head-only/read-only.');
} finally {
  if (browser) await browser.close(); await server.stopBackups(); await new Promise(resolve => server.close(resolve));
  if (recoveredServer) await new Promise(resolve => recoveredServer.close(resolve));
  await fixture.identity.db.recursiveDelete(fixture.identity.db.collection('projectTrials').doc(recoveryId));
  await fixture.identity.db.recursiveDelete(fixture.identity.db.collection('projectTrials').doc(trialId));
  for (const key of ['head', 'secretary', 'assistantA']) await fixture.identity.db.collection('staffProfiles').doc(fixture.credentials[key].email).delete();
  await fixture.close();
  await rm(backupDirectory, { recursive: true, force: true });
}
