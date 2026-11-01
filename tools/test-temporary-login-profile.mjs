import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const bootstrap = fs.readFileSync('js/integrations/app.firebase-bootstrap.js', 'utf8');
const source = fs.readFileSync('js/features/project/app.sorting-auth.js', 'utf8');
let access = { email: 'guest@example.com', active: true, startsAt: new Date(Date.now() - 10000), endsAt: new Date(Date.now() + 60000) };
let failRead = false;
const context = vm.createContext({
  console: { warn() {} }, Date,
  ALLOWED_AUTH_EMAIL_DOMAIN: 'chula.ac.th', AUTH_EMAIL_EXCEPTIONS: new Set(['admin@example.com']),
  db: {}, AUTH_EMAIL_ACCESS_COLLECTION: 'authEmailAccess', doc: () => ({}),
  getDoc: async () => { if (failRead) throw Error('offline'); return { exists: () => !!access, data: () => access }; }
});
const run = code => vm.runInContext(code, context);
run(bootstrap.slice(bootstrap.indexOf('function normalizeAuthEmail('), bootstrap.indexOf('function getAuthEmailRequirementMessage(')));
assert.equal(run('getTemporaryAuthAccess("guest@example.com")'), null);
assert.equal(await run('isAllowedAuthEmailAsync("guest@example.com")'), true);
assert.equal(run('getTemporaryAuthAccess("guest@example.com").email'), access.email);
assert.equal(run('getTemporaryAuthAccess("another@example.com")'), null);
assert.equal(run('getTemporaryAuthAccess("admin@example.com")'), null);
context.auth = { currentUser: { email: access.email } };
context.window = { sgcuAuth: { getTemporaryAuthAccess: email => run(`getTemporaryAuthAccess(${JSON.stringify(email)})`) } };
context.deriveLoginProfileStudentMeta = () => ({ faculty: 'คณะ', year: '1' });
function addFunction(name) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf('\n  }', start) + 4;
  run(source.slice(start, end));
}
for (const name of ['getLoginTemporaryAccess', 'normalizeLoginProfileAcademicFields', 'isLoginProfileComplete', 'hasSavedLoginProfileData', 'getLoginProfileType', 'applyLoginProfileTypeUI']) addFunction(name);
context.profile = { email: access.email, profileType: 'student', firstName: 'Guest', lastName: 'User', organization: 'วิทยากร', phone: '0812345678' };
assert.equal(run('isLoginProfileComplete(profile)'), true);
assert.equal(run('isLoginProfileComplete({...profile, organization: " "})'), false);
assert.equal(run('isLoginProfileComplete({...profile, phone: "bad"})'), false);
assert.equal(run('isLoginProfileComplete({...profile, firstName: ""})'), false);
assert.equal(run('hasSavedLoginProfileData(normalizeLoginProfileAcademicFields({email: profile.email}))'), false);
assert.equal(run('normalizeLoginProfileAcademicFields({...profile, studentId: "1234567890"}).studentId'), '');
assert.equal(run('isLoginProfileComplete({...profile, email: "student@chula.ac.th"})'), false);
assert.equal(run('isLoginProfileComplete({...profile, email: "staff@chula.ac.th", profileType: "affairs"})'), true);
const controls = new Map();
const control = id => {
  if (!controls.has(id)) controls.set(id, { value: '', style: {}, classList: { toggle() {} }, removeAttribute(key) { delete this[key]; } });
  return controls.get(id);
};
context.document = { getElementById: control };
for (const name of ['StudentFields', 'ContactRow', 'Nickname', 'StudentId', 'Phone', 'PhoneLabel', 'LineId', 'LineIdLabel', 'StudentIdWarning', 'FacultyWarning', 'YearWarning', 'Organization', 'TypeAffairs']) context[`loginProfile${name}El`] = control(`loginProfile${name}`);
context.renderLoginProfileTypeTabs = () => {};
context.updateLoginProfileStudentMeta = () => {};
run('applyLoginProfileTypeUI()');
assert.equal(control('loginProfileStudentFields').style.display, 'none');
assert.equal(control('loginProfileStudentId').required, false);
assert.equal(control('loginProfilePhone').required, true);
assert.equal(control('loginProfileLineId').required, false);
assert.equal(control('loginProfileOrganization').required, true);
assert.equal(control('loginProfileTypeSection').hidden, true);
assert.equal(control('loginProfileTemporaryEmail').value, access.email);
assert.match(control('loginProfileTemporaryExpiry').textContent, /เวลาไทย/);
context.auth.currentUser = { email: 'student@chula.ac.th' };
run('applyLoginProfileTypeUI()');
assert.equal(control('loginProfileStudentId').required, true);
assert.equal(control('loginProfileOrganization').required, false);
assert.equal(control('loginProfileTemporaryInfo').hidden, true);
assert.equal(control('loginProfileTemporaryEmail').value, '');
// Cached profile type cannot substitute for an active access record.
access.endsAt = new Date(Date.now() - 1);
assert.equal(run('getTemporaryAuthAccess("guest@example.com")'), null);
assert.equal(run('isLoginProfileComplete({...profile, profileType: "temporary"})'), false);
access.endsAt = new Date(Date.now() + 60000);
failRead = true;
assert.equal(await run('isAllowedAuthEmailAsync("guest@example.com")'), false);
assert.equal(run('getTemporaryAuthAccess("guest@example.com")'), null);
console.log('Temporary profile: verified access, legacy profile migration, required fields, optional LINE, expiry, account switching and failed lookup passed.');

failRead = false;
await run('isAllowedAuthEmailAsync("guest@example.com")');
context.auth.currentUser = { email: access.email };
for (const name of ['FirstName', 'LastName', 'Faculty', 'Year', 'SaveBtn']) context[`loginProfile${name}El`] = control(`loginProfile${name}`);
for (const element of controls.values()) element.reportValidity = function () { return !this.required || !!this.value.trim(); };
control('loginProfileFirstName').value = 'Guest';
control('loginProfileLastName').value = 'User';
control('loginProfileOrganization').value = 'วิทยากร';
control('loginProfilePhone').value = '0812345678';
control('loginProfileLineId').value = '';
context.normalizeAccountEmail = email => email;
context.readLoginProfiles = () => ({});
let saved;
context.writeLoginProfiles = profiles => { saved = profiles; };
context.writeRemoteLoginProfile = async (_, data) => { assert.equal(data.profileType, 'temporary'); return { ok: true }; };
for (const name of ['setLoginProfileStatus', 'setFirstLoginPromptVisible', 'applyStaffViewMode', 'publishLoginProfileState']) context[name] = () => {};
context.window.dispatchEvent = () => {};
context.CustomEvent = class {};
context.currentUserProfileType = 'student';
const saveStart = source.indexOf('  async function saveLoginProfile(');
run(source.slice(saveStart, source.indexOf('\n  function resolveSessionStart', saveStart)));
run('applyLoginProfileTypeUI()');
assert.equal(await run('saveLoginProfile(auth.currentUser)'), true);
assert.equal(saved[access.email].organization, 'วิทยากร');
assert.equal(saved[access.email].studentId, '');
assert.equal(saved[access.email].lineId, '');
control('loginProfileOrganization').value = '  ';
assert.equal(await run('saveLoginProfile(auth.currentUser)'), false);
console.log('Temporary profile save: organization persisted, no student ID or LINE required, blank organization rejected.');
