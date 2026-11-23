import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source = await fs.readFile('web/js/integrations/app.app-check.js', 'utf8');
let loads = 0, initialized = [], requested = [];
const context = vm.createContext({
  SGCU_APP_CONFIG: { appCheck: { siteKey: '' } },
  loadSdk: async () => {
    loads++;
    return {
      ReCaptchaEnterpriseProvider: class { constructor(key) { this.key = key; } },
      initializeAppCheck: (app, options) => { initialized.push({ app, options }); return app; },
      getToken: async (app, force) => { requested.push({ app, force }); return { token: `token-${app}` }; }
    };
  }
});
vm.runInContext(source.replace('export async function', 'async function').replace(/import\("https:[^"]+"\)/, 'loadSdk()'), context);
assert.equal(JSON.stringify(await (await context.setupAppCheck('main'))()), '{}');
assert.equal(loads, 0);
context.SGCU_APP_CONFIG.appCheck.siteKey = 'registered-public-key';
await context.setupAppCheck('emulator', { emulator: true });
assert.equal(loads, 0);
for (const app of ['main', 'access-requests', 'calendar']) {
  const headers = await context.setupAppCheck(app);
  assert.equal((await headers())['X-Firebase-AppCheck'], `token-${app}`);
}
assert.equal(initialized.length, 3);
assert.ok(initialized.every(x => x.options.provider.key === 'registered-public-key' && x.options.isTokenAutoRefreshEnabled));
assert.ok(requested.every(x => x.force === false));
const index = await fs.readFile('web/index.html', 'utf8');
assert.ok(index.indexOf('js/core/app.config.js') < index.indexOf('js/integrations/app.firebase-bootstrap.js'));
const calendar = await fs.readFile('web/meeting-room-calendar.html', 'utf8');
assert.ok(calendar.indexOf('await setupAppCheck(app)') < calendar.indexOf('const db = getFirestore(app)'));
console.log('App Check: opt-in, emulator bypass, independent Firebase apps, token headers and initialization order passed.');
