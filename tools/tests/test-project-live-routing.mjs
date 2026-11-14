import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../../web/js/features/project/app.sorting-auth.js',import.meta.url),'utf8');
const start=source.indexOf('function getAllowedPagesForCurrentState()'),end=source.indexOf('\nfunction ',start+1);
assert.ok(start>=0 && end>start);
const fn=source.slice(start,end);
const navStart=source.indexOf('function updateNavForStaff('),navEnd=source.indexOf('\nfunction ',navStart+1);
const navFn=source.slice(navStart,navEnd);
for(const mode of ['normal','staff'])for(const staff of [false,true])for(const [email,authenticated,allowed] of [
 ['6534324223@student.chula.ac.th',true,true],['tuwanon.kimchiang@gmail.com',true,true],
 ['6740193226@student.chula.ac.th',true,false],['other@student.chula.ac.th',true,false],
 ['tuwanon.kimchiang@gmail.com',false,false]
]){
 const context={window:{sgcuAuth:{auth:{currentUser:{email}}}},SGCU_APP_CONFIG:{projectLive:{enabled:true}},isUserAuthenticated:authenticated,currentUserProfileType:'staff',currentRepresentativeApprovalState:{hasApproved:false},staffAuthUser:staff?{}:null,staffViewMode:mode,getAllowedStaffPagesByProfile:()=>new Set(['home']),isHeadStaffProfile:()=>false,isSecretaryStaffProfile:()=>false,isAssistantStaffProfile:()=>false};
 const result=vm.runInNewContext(`${fn}\ngetAllowedPagesForCurrentState()`,context);
 const link={dataset:{page:'project-live-staff'},style:{display:allowed?'':'none'}};
 Object.assign(context,{navLinksAll:[link],document:{getElementById:()=>null},syncDesktopNavGroupVisibility:()=>{},syncMobileNavGroupVisibility:()=>{},syncMobileBottomNavVisibility:()=>{}});
 vm.runInNewContext(`${fn}\n${navFn}\nupdateNavForStaff(staffAuthUser)`,context);
 assert.equal(link.style.display!=='none',allowed,`final menu visibility: ${email} mode=${mode} staff=${staff}`);
 assert.equal(result.has('project-live-staff'),allowed,`${email} authenticated=${authenticated} staff=${staff}`);
}
console.log('Project navigation allows only the year 2568 treasurer and administrator in both profile modes.');

const html=await readFile(new URL('../../web/index.html',import.meta.url),'utf8');
for(const role of ['General','Staff']){
 const section=html.split(`id="desktopNav${role}"`)[1]?.split('id="desktopNav')[0];
 assert.equal(section?.includes('data-page="project-live-staff"'),role==='Staff',`Desktop ${role} entry`);
}
for(const role of ['general','staff']){
 const groups=[...html.matchAll(/<details class="mobile-menu-group" data-mobile-nav="(general|staff)">([\s\S]*?)<\/details>/g)];
 assert.equal(groups.some(([,r,body])=>r===role && body.includes('data-page="project-live-staff"')),role==='staff',`Mobile ${role} entry`);
}
console.log('Project entry is present only in staff navigation on desktop and mobile; general navigation has no entry.');
