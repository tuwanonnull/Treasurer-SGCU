import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadStaffReviewFile } from './staff-review-file.mjs';
const fixture = () => ({ source: 'production-snapshot', sourceProjectId: 'departmentwebsite-5aec1', academicYear: 2568,
 mode: 'review-only', writesPerformed: false, readyToActivate: false, checkedAt: '2026-11-14T05:00:00Z', candidateCount: 1,
 candidates: [{email:'head@example.test',role:'head',uid:'uid'}],issues:[],differences:[],plan:{grants:['not-for-browser']},token:'secret-test-value' });
test('production snapshot loader exposes only review data and rejects wrong source/year/write mode', async t => {
 const dir=await mkdtemp(path.join(tmpdir(),'sgcu-review-file-'));t.after(()=>rm(dir,{recursive:true,force:true}));const file=path.join(dir,'review.json');
 await writeFile(file,JSON.stringify(fixture()));const result=await loadStaffReviewFile(file,2568);
 assert.equal(result.candidateCount,1);assert.equal(result.plan,undefined);assert.equal(result.token,undefined);assert.equal(result.readyToActivate,false);
 for(const change of [r=>{r.academicYear=2569;},r=>{r.sourceProjectId='other';},r=>{r.writesPerformed=true;},r=>{r.candidateCount=2;},r=>{r.candidates[0].role='admin';}]) {
  const bad=fixture();change(bad);await writeFile(file,JSON.stringify(bad));await assert.rejects(loadStaffReviewFile(file,2568));
 }
});

test('user-confirmed year notes are shown separately and cannot become an activation plan', async t => {
 const dir=await mkdtemp(path.join(tmpdir(),'sgcu-review-notes-'));t.after(()=>rm(dir,{recursive:true,force:true}));const file=path.join(dir,'review.json');
 await writeFile(file,JSON.stringify(fixture()));
 const notes=path.join(dir,'account-identity-notes.json');
 await writeFile(notes,JSON.stringify({source:'user-confirmed',grantsChanged:false,initialAccess:{academicYear:2568,scope:'head-only',headEmail:'head@example.test'},accountRoles:[{email:'head@example.test',projectRole:'head',academicYear:2568}]}));
 const result=await loadStaffReviewFile(file,2568);assert.equal(result.confirmedAccountRoles[0].academicYear,2568);assert.equal(result.initialAccess.activated,false);assert.equal(result.initialAccess.scope,'head-only');assert.equal(result.readyToActivate,false);assert.equal(result.plan,undefined);
 await writeFile(notes,JSON.stringify({source:'user-confirmed',grantsChanged:false,accountRoles:[{email:'unknown@example.test',systemRole:'admin'}]}));
 await assert.rejects(loadStaffReviewFile(file,2568),/Unknown account/);
});

test('displayed year is recalculated from role-matching code rather than trusting cached year numbers', async t => {
 const dir=await mkdtemp(path.join(tmpdir(),'sgcu-review-year-'));t.after(()=>rm(dir,{recursive:true,force:true}));const file=path.join(dir,'review.json');
 const value=fixture();value.candidates[0].positionYears={years:[2568],membershipConfirmed:true,evidence:[{code:'SGCU69.10.00.01-001',academicYear:2568}]};
 await writeFile(file,JSON.stringify(value));const result=await loadStaffReviewFile(file,2568);
 assert.deepEqual(result.candidates[0].positionYears.years,[2569]);assert.equal(result.candidates[0].positionYears.membershipConfirmed,false);
});
