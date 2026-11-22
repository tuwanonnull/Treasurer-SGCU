import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('web/js/features/project/app.sorting-auth.js','utf8');
const accessContext=vm.createContext({
  isHeadStaffProfile:()=>false,
  normalizeAllowedStaffPages:pages=>pages || ['login']
});
vm.runInContext(source.match(/function getAllowedStaffPagesByProfile\([^]*?\n\}/)[0],accessContext);
assert.ok(accessContext.getAllowedStaffPagesByProfile({allowedPages:['budget-approval-staff']}).has('login'),
  'Account controls must remain accessible even with an explicit staff page allowlist');
const functions=['applyStaffViewMode','setStaffViewMode'].map(name=>source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0]).join('\n');
const calls=[];
const context=vm.createContext({
 captureStaffModeMenu:()=>null,
 window:{},staffViewMode:'normal',staffAuthUser:{approved:true},isUserAuthenticated:true,
 staffModeToggleEl:{style:{}},staffModeBtns:[],
 hasNavigableStaffPages:p=>!!p?.approved,
 updateNavVisibility:()=>{},syncRoleNavContainers:()=>{},updateNavForStaff:()=>{},
 renderStaffModeFeedback:(...args)=>calls.push(['feedback',...args]),
 getCurrentPageFromHash:()=>context.page,
 isNavPageVisible:page=>page==='login'||(page==='budget-approval-staff'&&context.staffViewMode==='staff'),
 goToFirstVisibleNavPageWithPreference:()=>calls.push(['redirect'])
});
vm.runInContext(functions,context);
context.page='login';
for(const mode of ['staff','normal','staff']){
 calls.length=0;context.setStaffViewMode(mode);
 assert.equal(context.staffViewMode,mode);
 assert.equal(calls.some(c=>c[0]==='redirect'),false,'Switching from the shared account page must not navigate');
 assert.deepEqual(calls.at(-1),['feedback',mode,true,true,null]);
}
calls.length=0;context.setStaffViewMode('staff');assert.equal(calls.length,0);
context.applyStaffViewMode();assert.equal(calls.some(c=>c[0]==='redirect'),false,'Background profile updates must retain an allowed account page');
context.page='budget-approval-staff';calls.length=0;context.setStaffViewMode('normal');
assert.equal(calls.filter(c=>c[0]==='redirect').length,1,'An inaccessible page still needs exactly one guarded fallback');
context.page='login';context.staffAuthUser=null;calls.length=0;context.setStaffViewMode('staff');
assert.equal(context.staffViewMode,'normal');assert.equal(calls.some(c=>c[0]==='redirect'),false);
console.log('Staff mode: shared page retained, repeat clicks ignored, background refresh retained, revoked access and guarded fallback passed.');
