import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createFirestoreTrial } from './firestore-trial.mjs';
import { assertProjectEmulators } from './firebase-identity.mjs';
import { createAutomaticBackup } from './automatic-backup.mjs';
import { readStaffProjectAccess } from './staff-access-review.mjs';
import { loadStaffReviewFile } from './staff-review-file.mjs';

export async function createAuthenticatedPilotServer({ snapshot, identity, users, academicYear, trialId = 'year68-local', seed = null, backupDirectory = null, staffReviewFile = null }) {
  assertProjectEmulators();
  const registry = structuredClone(users);
  const trial = await createFirestoreTrial({ snapshot, identity, users: registry, academicYear, trialId, seed }), sessions = new Map();
  const backups = backupDirectory ? await createAutomaticBackup({ directory: backupDirectory, trialId,
    onFailure: message => console.error(message), getBundle: async () => {
      const head = Object.values(registry).find(user => user.role === 'head');
      if (!head || (await identity.auth.getUser(head.id)).disabled) throw new Error('No active head account');
      return trial.backup(head.id);
    } }) : null;
  const server = http.createServer(async (req, res) => {
    const send = (status, data, type = 'application/json') => {
      res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
      res.end(type === 'application/json' ? JSON.stringify(data) : data);
    };
    const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
    try {
      const origin = `http://127.0.0.1:${req.socket.localPort}`;
      if (req.headers.host !== origin.slice(7) || (req.method === 'POST' && req.headers.origin !== origin)) fail(403, 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น');
      const url = new URL(req.url, origin);
      const cookie = /(?:^|;\s*)project_auth=([^;]+)/.exec(req.headers.cookie || '')?.[1];
      let body;
      if (req.method === 'POST') {
        let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 10000) fail(413, 'คำขอใหญ่เกินไป'); }
        try { body = JSON.parse(raw); } catch { fail(400, 'รูปแบบคำขอไม่ถูกต้อง'); }
      }
      if (url.pathname === '/api/logout' && req.method === 'POST') {
        sessions.delete(cookie); res.setHeader('Set-Cookie', 'project_auth=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return send(200, { loggedOut: true });
      }
      if (url.pathname === '/api/login' && req.method === 'POST') {
        sessions.delete(cookie);
        if (!body || typeof body.email !== 'string' || typeof body.password !== 'string' || Object.keys(body).some(k => !['email', 'password'].includes(k))) fail(400, 'กรอกอีเมลและรหัสผ่านบัญชีทดลอง');
        const response = await fetch('http://127.0.0.1:9197/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, returnSecureToken: true })
        });
        if (!response.ok) fail(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกปิด');
        const token = (await response.json()).idToken;
        const actor = await identity.resolve(`Bearer ${token}`, academicYear);
        if (!Object.hasOwn(registry, actor.id) || registry[actor.id].role !== actor.role) fail(403, 'บัญชียังไม่อยู่ในชุดทดลองนี้');
        const session = randomUUID(); sessions.set(session, { token, expires: Date.now() + 55 * 60_000 });
        res.setHeader('Set-Cookie', `project_auth=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3300`);
        return send(200, { user: registry[actor.id] });
      }
      if (url.pathname.startsWith('/api/')) {
        // No demo session endpoint, caller-supplied UID, or role-switch bypass.
        if (!['/api/year68/trial', '/api/year68/trial/staff-review', '/api/year68/trial/history', '/api/year68/trial/backup', '/api/year68/trial/status-preview', '/api/year68/trial/status', '/api/year68/trial/preview', '/api/year68/trial/commit', '/api/year68/trial/propose', '/api/year68/trial/approve', '/api/year68/trial/reject', '/api/year68/trial/assign'].includes(url.pathname)) fail(404, 'ไม่พบ API');
        const session = sessions.get(cookie);
        if (!session || session.expires <= Date.now()) { sessions.delete(cookie); fail(401, 'กรุณาเข้าสู่ระบบใหม่'); }
        const actor = await identity.resolve(`Bearer ${session.token}`, academicYear);
        if (!Object.hasOwn(registry, actor.id) || registry[actor.id].role !== actor.role) fail(403, 'สิทธิ์บัญชีเปลี่ยนแล้ว');
        if (url.pathname === '/api/year68/trial/staff-review') {
          if (actor.role !== 'head') fail(403, 'เฉพาะเหรัญญิกตรวจบัญชีส่วนโครงการ');
          if (req.method !== 'GET') fail(405, 'หน้านี้ตรวจข้อมูลเท่านั้น');
          const review = staffReviewFile ? await loadStaffReviewFile(staffReviewFile, academicYear) :
            { ...await readStaffProjectAccess({ identity, academicYear, projectIds: snapshot.projects.map(p => p.id) }), source: 'emulator', checkedAt: new Date().toISOString() };
          // Recheck authorization after potentially slow Auth lookups.
          const current = await identity.resolve(`Bearer ${session.token}`, academicYear);
          if (current.role !== 'head' || current.id !== actor.id) fail(403, 'สิทธิ์บัญชีเปลี่ยนแล้ว');
          return send(200, review);
        }
        if (url.pathname === '/api/year68/trial/backup') {
          if (req.method !== 'GET') fail(405, 'ใช้การดาวน์โหลดเท่านั้น');
          const bundle = await trial.backup(actor.id);
          res.setHeader('Content-Disposition', 'attachment; filename="sgcu-firestore-trial-backup.json"');
          return send(200, bundle);
        }
        if (url.pathname === '/api/year68/trial/history') {
          if (req.method !== 'GET') fail(405, 'ใช้การอ่านประวัติเท่านั้น');
          return send(200, await trial.history(actor.id));
        }
        if (url.pathname === '/api/year68/trial' && req.method === 'GET') {
          const view = await trial.query(actor.id, url.searchParams, { includeAudit: false });
          if (actor.role === 'head') view.automaticBackup = backups?.status() || { enabled: false };
          return send(200, view);
        }
        if (req.method !== 'POST') fail(405, 'วิธีเรียกไม่ถูกต้อง');
        return send(200, await trial.mutate(actor.id, url.pathname.split('/').at(-1), body));
      }
      const assets = { '/': ['finance-trial.html', 'text/html'], '/year68-trial': ['finance-trial.html', 'text/html'], '/finance-trial.js': ['finance-trial.js', 'text/javascript'], '/emulator-login.js': ['emulator-login.js', 'text/javascript'], '/reasons.mjs': ['reasons.mjs', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      const asset = assets[url.pathname]; if (!asset || req.method !== 'GET') fail(404, 'ไม่พบหน้า');
      let content = await readFile(new URL(asset[0], import.meta.url), 'utf8');
      if (asset[0] === 'finance-trial.html') content = content.replace('<body class="year68">', '<body class="year68" data-auth-mode="emulator">')
        .replace('<script type="module" src="/finance-trial.js"></script>', '<script type="module" src="/emulator-login.js"></script>')
        .replace('<main>', '<main><section id="login-panel"><h2>เข้าสู่ระบบบัญชี Emulator</h2><p>บันทึกใน Firestore Emulator · รีสตาร์ตเว็บแล้วข้อมูลยังอยู่ · ปิด Emulator ต้องส่งออกข้อมูลก่อน</p><form id="login-form"><label>อีเมล<input id="login-email" type="email" autocomplete="username" required></label><label>รหัสผ่าน<input id="login-password" type="password" autocomplete="current-password" required></label><button type="submit">เข้าสู่ระบบ</button></form></section><p id="login-user"></p><button id="logout" hidden>ออกจากระบบ</button>')
        .replace('<label for="user">บัญชีทดลอง</label><select id="user">', '<label for="user" hidden>บัญชีทดลอง</label><select id="user" hidden>')
        .replace('<a href="/year68">ดูสำเนาต้นทาง</a>', '')
        .replace('บัญชีเลือกสลับได้เพื่อทดลอง ไม่ใช่ระบบยืนยันตัวตนจริง', 'ใช้บัญชี Auth Emulator ในเครื่องเท่านั้น')
        .replace('ไม่เชื่อม Firestore และไม่เขียนไฟล์ปี 68', 'สิทธิ์อยู่ใน Firestore Emulator · ข้อมูลโครงการอยู่ใน Firestore Emulator · ไม่เขียนไฟล์ปี 68');
      send(200, content, asset[1]);
    } catch (error) { send(error.status || 500, { error: error.status ? error.message : 'ดำเนินการไม่สำเร็จ' }); }
  });
  let timer;
  server.once('listening', () => {
    if (!backups) return;
    const tick = () => backups.tick().catch(() => console.error('ตรวจรอบสำรองไม่สำเร็จ'));
    void tick(); timer = setInterval(tick, 60_000); timer.unref();
  });
  server.stopBackups = async () => { clearInterval(timer); if (backups) await backups.idle(); };
  server.once('close', () => { clearInterval(timer); });
  return server;
}
