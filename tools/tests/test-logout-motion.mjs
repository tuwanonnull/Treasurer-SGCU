import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('web/js/features/project/app.sorting-auth.js', 'utf8');
const start = source.indexOf('  let logoutInProgress = false;');
const end = source.indexOf('\n  if (logoutBtnEl) {', start);
for (const scenario of ['success', 'reduced', 'failure']) {
  const events = [], buttons = [{}, {}, {}];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const page = { animate: (_frames, options) => {
    events.push(`animate:${options.duration}`);
    return { finished: Promise.resolve(), cancel: () => events.push('cancel') };
  } };
  const ctx = vm.createContext({
    window: { matchMedia: () => ({ matches: scenario === 'reduced' }) },
    document: { querySelector: () => page, getElementById: () => null },
    logoutBtnEl: buttons[0], loginPageLogoutBtnEl: buttons[1], mobileLogoutBtnEl: buttons[2],
    auth: {}, staffAuthUser: {}, staffViewMode: 'staff', loginProfileLoadedForEmail: 'user@example.com',
    signOut: async () => { events.push('signOut'); await gate; if (scenario === 'failure') throw Error('offline'); },
    clearAuthSession: () => events.push('clear'), refreshAuthDisplay: user => events.push(`display:${user}`),
    setLoginProfileStatus: text => events.push(text), console: { error() {} }
  });
  vm.runInContext(source.slice(start, end), ctx);
  const result = ctx.handleLogout();
  await ctx.handleLogout(); // Repeated taps must not start another sign-out.
  assert.ok(buttons.every(button => button.disabled));
  release();
  await result;
  assert.equal(events.filter(event => event === 'signOut').length, 1);
  assert.ok(buttons.every(button => !button.disabled));
  if (scenario === 'reduced') assert.ok(!events.some(event => event.startsWith('animate:')));
  if (scenario === 'failure') {
    assert.ok(!events.includes('clear'));
    assert.ok(!events.includes('display:null'));
    assert.ok(events.includes('cancel'));
  } else {
    assert.ok(events.indexOf('clear') > events.indexOf('signOut'));
    assert.ok(events.includes('display:null'));
    if (scenario === 'success') assert.ok(events.includes('animate:220'));
  }
}
console.log('Logout motion: success, reduced motion, repeated clicks and failure recovery passed.');
