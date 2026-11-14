import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectStaffPositionYears } from './staff-position-years.mjs';
test('staff code supplies year evidence without granting or confirming membership', () => {
 const result=inspectStaffPositionYears({positions:[{name:'ผู้ช่วยเหรัญญิก',code:'SGCU68.10.01.04-001'}]},'assistant');
 assert.deepEqual(result.years,[2568]);assert.equal(result.incomplete,false);assert.equal(result.membershipConfirmed,false);
 assert.deepEqual(inspectStaffPositionYears({position:'เลขานุการฝ่ายเหรัญญิก',positionCode:'SGCU69.10.00.03-001'},'secretary').years,[2569]);
});
test('student ID, current dates and unrelated positions never supply a year', () => {
 const result=inspectStaffPositionYears({email:'6534324223@student.chula.ac.th',year:2568,createdAt:'2025-01-01',positions:[{name:'ผู้ช่วยเหรัญญิก'},{name:'เหรัญญิก',code:'SGCU68.10.00.01-001'}]},'assistant');
 assert.deepEqual(result.years,[]);assert.equal(result.incomplete,true);
});
test('malformed or conflicting codes remain unresolved; every matching term is preserved', () => {
 for(const code of ['SGCU68.10.00.01-001','SGCU68.10.01.04-000','68','SGCU68.10.01.04-001oops']) {
  assert.equal(inspectStaffPositionYears({position:'ผู้ช่วยเหรัญญิก',positionCode:code},'assistant').incomplete,true);
 }
 const result=inspectStaffPositionYears({positions:[{name:'ผู้ช่วยเหรัญญิก',code:'SGCU68.10.01.04-001'},{name:'ผู้ช่วยเหรัญญิก',code:'SGCU69.10.01.04-005'},{name:'ผู้ช่วยเหรัญญิก'}]},'assistant');
 assert.deepEqual(result.years,[2568,2569]);assert.equal(result.incomplete,true);
});
