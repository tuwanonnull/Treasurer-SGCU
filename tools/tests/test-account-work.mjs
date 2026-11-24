import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const html = await fs.readFile('dist/index.html', 'utf8');
assert.equal((html.match(/id="work-panel"/g) || []).length, 1);
assert.equal((html.match(/data-page="account-work" data-visible="protected"/g) || []).length, 3, 'Both desktop modes and mobile must link to work');
for (const asset of ['css/pages/account-work.css', 'js/features/account-work/app.account-work-data.js', 'js/features/account-work/app.account-work.js']) {
  assert.ok(html.includes(asset));
  await fs.access('dist/' + asset);
}
assert.ok(!html.includes('id="demo-role"'));
const source = await fs.readFile('web/js/features/project/app.sorting-auth.js', 'utf8');
const context = vm.createContext({window:{},isUserAuthenticated:false,staffViewMode:'normal',currentUserProfileType:'student',currentRepresentativeApprovalState:{hasApproved:false},staffAuthUser:null,isHeadStaffProfile:()=>false,getAllowedStaffPagesByProfile:()=>new Set(['login','meeting-room-staff'])});
vm.runInContext(source.match(/function getAllowedPagesForCurrentState\([^]*?\n\}/)[0], context);
assert.equal(context.getAllowedPagesForCurrentState().has('account-work'), false);
context.isUserAuthenticated = true;
assert.equal(context.getAllowedPagesForCurrentState().has('account-work'), true);
context.staffAuthUser = {};
assert.equal(context.getAllowedPagesForCurrentState('staff').has('account-work'), true);
console.log('Production work page: bundled assets, desktop/mobile links, signed-in and staff routes passed.');
