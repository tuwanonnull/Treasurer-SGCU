import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('web/js/features/project/app.sorting-auth.js', 'utf8');
const start = source.indexOf('  let accessRequestVerifiedUser = null;');
const end = source.indexOf('\n  if (loginBtnEl) {', start);
const element = () => ({ hidden: true, dataset: {}, classList: { toggle() {}, add() {}, remove() {} }, addEventListener(type, fn) { this[type] = fn; }, setAttribute() {} });
for (const allowed of [false, true, 'network-error']) {
  const request = element(), modal = element(), close = element(), message = element();
  let opened = 0, requested = 0;
  const ctx = vm.createContext({
    auth: { currentUser: null }, authAlertModalEl: modal, authAlertMessageEl: message, authAlertCloseEl: close,
    document: { getElementById: id => id === 'authAlertRequestAccess' ? request : { click: () => requested++ } },
    window: { location: { host: 'localhost', protocol: 'https:', origin: 'https://localhost' } },
    GoogleAuthProvider: class { setCustomParameters() {} },
    signInWithPopup: async () => {
      if (allowed === 'network-error') throw Object.assign(Error('network'), { code: 'auth/network-request-failed' });
      return { user: { email: 'guest@example.com' } };
    },
    signOut: async () => {}, isAllowedAuthEmailAsync: async () => allowed,
    getAuthEmailRequirementMessage: () => 'บัญชีนี้ไม่มีสิทธิ์',
    openDialog: () => opened++, closeDialog() {}, console
  });
  vm.runInContext(source.slice(start, end), ctx);
  ctx.handleGoogleLogin();
  await new Promise(resolve => setImmediate(resolve));
  if (allowed === false) {
    assert.equal(request.hidden, false);
    assert.match(message.textContent, /ขอสิทธิ์เข้าใช้งาน/);
    request.click();
    assert.equal(requested, 1);
    assert.equal(ctx.window.location.hash, 'login');
  } else if (allowed === true) assert.equal(opened, 0);
  else assert.equal(request.hidden, true);
}
console.log('Login access suggestion: denied access opens request flow; valid login and unrelated errors do not suggest access.');
