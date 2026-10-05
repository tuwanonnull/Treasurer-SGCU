import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = 'demo-borrow-rules';
const email = 'student@student.chula.ac.th';
const password = 'local-borrow-test-only';
// Refuse to reuse another process's web server or emulator.
for (const port of [4175, 8186, 9098, 4408, 4508, 9150]) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}
const build = spawnSync(process.execPath, ['tools/build-static.mjs'], { cwd: root, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'sgcu-borrow-local-'));
const webRoot = path.join(temp, 'web');
await fs.cp(path.join(root, 'dist'), webRoot, { recursive: true });
const configPath = path.join(temp, 'firebase.json');
await fs.writeFile(configPath, JSON.stringify({
  firestore: { rules: path.join(root, 'firestore.rules') },
  emulators: {
    auth: { host: '127.0.0.1', port: 9098 },
    firestore: { host: '127.0.0.1', port: 8186 },
    hub: { host: '127.0.0.1', port: 4408 },
    logging: { host: '127.0.0.1', port: 4508 },
    ui: { enabled: false }, singleProjectMode: true
  }
}));
const children = [];
function start(command, args, options = {}) {
  const child = spawn(command, args, { cwd: temp, stdio: 'inherit', ...options });
  children.push(child);
  child.on('error', error => { console.error(error); stop(1); });
  return child;
}
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 1000);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
start('firebase', ['emulators:start', '--only', 'auth,firestore', '--project', project, '--config', configPath], {
  env: { ...process.env, JAVA_TOOL_OPTIONS: '-Duser.language=en -Duser.country=US' }
}).on('exit', code => { if (!stopping) stop(code || 1); });
async function request(url, body, method = 'POST', admin = false) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: 'Bearer owner' } : {}) },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json();
}
try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      const responses = await Promise.all([
        fetch('http://127.0.0.1:9098/'),
        fetch('http://127.0.0.1:8186/')
      ]);
      if (responses[0].ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('Emulators did not start');
  const account = await request('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-demo', {
    email, password, displayName: 'ผู้ใช้ทดสอบทั่วไป', returnSecureToken: true
  });
  const profile = {
    firstName: 'ผู้ใช้ทดสอบ', lastName: 'ทั่วไป', nickname: 'ทดสอบ',
    studentId: '6930000021', faculty: 'วิศวกรรมศาสตร์', year: '1',
    phone: '0800000000', lineId: 'local-test', profileType: 'student', email,
    authEmail: email, accountEmail: email
  };
  await request(`http://127.0.0.1:8186/v1/projects/${project}/databases/(default)/documents/userProfiles/${account.localId}`, {
    fields: Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, { stringValue: value }]))
  }, 'PATCH', true);

  const bootstrapPath = path.join(webRoot, 'js/integrations/app.firebase-bootstrap.js');
  let bootstrap = await fs.readFile(bootstrapPath, 'utf8');
  bootstrap = bootstrap.replace('  getAuth,', '  getAuth,\n  connectAuthEmulator,');
  bootstrap = bootstrap.replace('  getFirestore,', '  getFirestore,\n  connectFirestoreEmulator,');
  bootstrap = bootstrap.replace('const app = initializeApp(firebaseConfig);', `
if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Local test only');
const app = initializeApp({ apiKey: 'local-demo', projectId: '${project}', authDomain: 'localhost' });`);
  bootstrap = bootstrap.replace('const db = getFirestore(app);', `const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8186);`);
  bootstrap += `\nsignInWithEmailAndPassword(auth, '${email}', '${password}').then(() => { location.hash = 'borrow-assets'; });\n`;
  bootstrap = bootstrap.replace('isSupported()\n', 'Promise.resolve(false)\n');
  await fs.writeFile(bootstrapPath, bootstrap);
  await fs.appendFile(path.join(webRoot, 'js/core/app.config.js'), `\nSGCU_APP_CONFIG.sheets.borrowAssets = '/local-assets.csv';\nSGCU_APP_CONFIG.sheets.projectSources = '/local-projects.csv';\n`);
  await fs.writeFile(path.join(webRoot, 'local-assets.csv'), 'ประเภท,รหัสพัสดุ,รายการ,ที่เก็บ,อนุมัติการยืม,จำนวนทั้งหมด,ยืมอยู่,ชำรุด,คงเหลือ,หน่วย,หมายเหตุ\nอุปกรณ์ทดสอบ,TEST001,เก้าอี้ทดสอบ,ห้องทดสอบ,TRUE,20,0,0,20,ตัว,ข้อมูลจำลอง\n');
  await fs.writeFile(path.join(webRoot, 'local-projects.csv'), 'ประเภท,ชื่อองค์กร,รหัส\nองค์การบริหารสโมสรนิสิต,ฝ่ายทดสอบ,SGCU.01\n');
  const indexPath = path.join(webRoot, 'index.html');
  const index = await fs.readFile(indexPath, 'utf8');
  await fs.writeFile(indexPath, index.replace(/<body([^>]*)>/, '<body$1><div style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff3cd;color:#664d03;text-align:center;padding:8px">โหมดทดสอบในเครื่อง · บัญชีผู้ใช้ทั่วไป · ข้อมูลจำลอง</div>'));
  start('python3', ['-m', 'http.server', '4175', '--bind', '127.0.0.1', '--directory', webRoot])
    .on('exit', code => { if (!stopping) stop(code || 1); });
  console.log('\nพร้อมทดสอบ: http://127.0.0.1:4175/#borrow-assets');
  console.log(`เข้าสู่ระบบอัตโนมัติ: ${email} (ไม่มีสิทธิ์เจ้าหน้าที่)`);
  console.log('เลือกหน่วยงานภายนอก / อื่น ๆ และพัสดุ TEST001 เพื่อส่งคำขอ');
  console.log(`ไฟล์ทดสอบชั่วคราว: ${temp}\nกด Ctrl+C เพื่อปิดเว็บและ Emulator`);
} catch (error) {
  console.error(error);
  stop(1);
}
