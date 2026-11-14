import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../js/features/project/app.sorting-auth.js',import.meta.url),'utf8');
const start=source.indexOf('function getAllowedPagesForCurrentState()'),end=source.indexOf('\nfunction ',start+1);
assert.ok(start>=0 && end>start);
const fn=source.slice(start,end);
for(const staff of [false,true])for(const [email,authenticated,allowed] of [
 ['6534324223@student.chula.ac.th',true,true],['tuwanon.kimchiang@gmail.com',true,true],
 ['6740193226@student.chula.ac.th',true,false],['other@student.chula.ac.th',true,false],
 ['tuwanon.kimchiang@gmail.com',false,false]
]){
 const context={window:{sgcuAuth:{auth:{currentUser:{email}}}},SGCU_APP_CONFIG:{projectLive:{enabled:true}},isUserAuthenticated:authenticated,currentUserProfileType:'staff',currentRepresentativeApprovalState:{hasApproved:false},staffAuthUser:staff?{}:null,staffViewMode:'staff',getAllowedStaffPagesByProfile:()=>new Set(['home']),isHeadStaffProfile:()=>false,isSecretaryStaffProfile:()=>false,isAssistantStaffProfile:()=>false};
 const result=vm.runInNewContext(`${fn}\ngetAllowedPagesForCurrentState()`,context);
 assert.equal(result.has('project-live-staff'),allowed,`${email} authenticated=${authenticated} staff=${staff}`);
}
console.log('Project navigation allows only the year 2568 treasurer and administrator in both profile modes.');
