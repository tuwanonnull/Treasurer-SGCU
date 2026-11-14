import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createModel, USERS, PilotError } from './model.mjs';
import { validateYear68Snapshot, queryYear68 } from './year68.mjs';
import { previewMoney } from './finance.mjs';
import { createFinanceTrial } from './finance-trial.mjs';
import { createPersistentFinanceTrial } from './finance-store.mjs';
import { createPortableBackup } from './portable-backup.mjs';

export function createPilotServer({ year68Snapshot = null, trialDirectory = null, restoreBackup = null } = {}) {
  const model = createModel();
  const year68 = year68Snapshot ? validateYear68Snapshot(year68Snapshot) : null;
  if (trialDirectory && !year68?.projects.every(p => p.formulaInputs?.version === 1)) throw new Error('Persistent trial needs a formula-enabled snapshot');
  const financeTrial = year68?.projects.every(p => p.formulaInputs?.version === 1)
    ? trialDirectory ? createPersistentFinanceTrial(year68, trialDirectory, { restoreBackup }) : createFinanceTrial(year68) : null;
  const sessions = new Map();
  const server = http.createServer(async (req, res) => {
    const send = (status, data, type = 'application/json; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
      res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
    };
    try {
      const expectedHost = `127.0.0.1:${req.socket.localPort}`;
      if (req.headers.host !== expectedHost) throw new PilotError(403, 'เปิดผ่านที่อยู่ 127.0.0.1 ของเซิร์ฟเวอร์เท่านั้น');
      if (req.method === 'POST' && req.headers.origin !== `http://${expectedHost}`) throw new PilotError(403, 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น');
      const url = new URL(req.url, `http://${expectedHost}`);
      const token = /(?:^|;\s*)pilot_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
      const actor = sessions.get(token);
      if (url.pathname === '/api/year68/trial/backup') {
        if (req.method !== 'GET') throw new PilotError(405, 'ใช้การดาวน์โหลดเท่านั้น');
        if (!actor) throw new PilotError(401, 'เลือกบัญชีทดลองก่อน');
        if (USERS[actor]?.role !== 'head') throw new PilotError(403, 'เฉพาะเหรัญญิกดาวน์โหลดชุดสำรอง');
        if (!financeTrial) throw new PilotError(404, 'ยังไม่ได้โหลดชุดทดลอง');
        const checkpoint = financeTrial.exportCheckpoint ? financeTrial.exportCheckpoint(actor) : financeTrial.exportState();
        const bundle = createPortableBackup(year68, checkpoint);
        res.setHeader('Content-Disposition', 'attachment; filename="sgcu-year68-trial-backup.json"');
        return send(200, bundle);
      }
      if (req.method === 'GET' && url.pathname === '/api/year68/trial') {
        if (!financeTrial) throw new PilotError(404, 'ยังไม่ได้โหลดชุดทดลองที่มีสูตรเงิน');
        return send(200, financeTrial.query(actor, url.searchParams));
      }
      if (url.pathname === '/api/year68') {
        if (req.method !== 'GET') throw new PilotError(405, 'ข้อมูลปี 68 เปิดดูอย่างเดียว');
        if (!actor) throw new PilotError(401, 'เลือกบัญชีทดลองก่อน');
        if (!['head', 'secretary'].includes(USERS[actor]?.role)) throw new PilotError(403, 'ยังไม่ผูกชื่อผู้ตรวจเอกสาร AI กับบัญชีผู้ช่วย จึงยังไม่เปิดข้อมูลปี 68 ให้บัญชีผู้ช่วยทดลอง');
        if (!year68) throw new PilotError(404, 'ยังไม่ได้โหลดสำเนาปี 68 ในเซิร์ฟเวอร์นี้');
        return send(200, queryYear68(year68, url.searchParams));
      }
      if (req.method === 'GET' && url.pathname === '/api/state') return send(200, model.snapshot(actor));
      if (req.method === 'GET' && url.pathname === '/api/users') return send(200, Object.values(USERS));
      if (req.method === 'GET' && url.pathname === '/api/export') {
        if (USERS[actor]?.role !== 'head') throw new PilotError(403, 'เฉพาะเหรัญญิกส่งออก');
        res.setHeader('Content-Disposition', 'attachment; filename="project-pilot-demo.json"');
        return send(200, { demoOnly: true, exportedAt: new Date().toISOString(), ...model.snapshot(actor) });
      }
      if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 10000) throw new PilotError(413, 'คำขอใหญ่เกินไป'); }
        let body;
        try { body = JSON.parse(raw); } catch { throw new PilotError(400, 'รูปแบบ JSON ไม่ถูกต้อง'); }
        if (url.pathname.startsWith('/api/year68/trial/')) {
          if (!financeTrial) throw new PilotError(404, 'ยังไม่ได้โหลดชุดทดลองที่มีสูตรเงิน');
          return send(200, financeTrial.mutate(actor, url.pathname.slice('/api/year68/trial/'.length), body));
        }
        if (url.pathname === '/api/year68/preview') {
          if (!actor) throw new PilotError(401, 'เลือกบัญชีทดลองก่อน');
          if (!['head', 'secretary'].includes(USERS[actor]?.role)) throw new PilotError(403, 'เฉพาะเหรัญญิกหรือเลขานุการทดลองคำนวณยอด');
          if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['projectId', 'changes'].includes(key))) throw new PilotError(400, 'คำขอมีช่องข้อมูลที่ไม่อนุญาต');
          const project = year68?.projects.find(p => p.id === body.projectId);
          if (!project) throw new PilotError(404, 'ไม่พบโครงการปี 68');
          return send(200, previewMoney(project, body.changes));
        }
        if (url.pathname === '/api/session') {
          if (!body || !Object.hasOwn(USERS, body.userId ?? '')) throw new PilotError(400, 'บัญชีทดลองไม่ถูกต้อง');
          const next = randomUUID();
          sessions.delete(token); sessions.set(next, body.userId);
          res.setHeader('Set-Cookie', `pilot_session=${next}; HttpOnly; SameSite=Strict; Path=/`);
          return send(200, model.snapshot(body.userId));
        }
        return send(200, model.mutate(actor, url.pathname.slice(5), body));
      }
      const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/year68': ['year68.html', 'text/html; charset=utf-8'], '/year68-trial': ['finance-trial.html', 'text/html; charset=utf-8'], '/finance-trial.js': ['finance-trial.js', 'text/javascript; charset=utf-8'], '/year68.js': ['year68.js', 'text/javascript; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
      assets['/reasons.mjs'] = ['reasons.mjs', 'text/javascript; charset=utf-8'];
      const asset = assets[url.pathname];
      if (req.method !== 'GET' || !asset) throw new PilotError(404, 'ไม่พบหน้า');
      send(200, await readFile(new URL(asset[0], import.meta.url)), asset[1]);
    } catch (error) { send(error.status || 500, { error: error.status ? error.message : 'ดำเนินการไม่สำเร็จ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง' }); }
  });
  let timer;
  server.on('listening', () => { timer = setInterval(() => model.runAutomation(), 60000); timer.unref(); });
  server.on('close', () => { clearInterval(timer); financeTrial?.close?.(); });
  server.on('error', () => financeTrial?.close?.());
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pathIndex = process.argv.indexOf('--year68-snapshot');
  if (pathIndex !== -1 && !process.argv[pathIndex + 1]) throw new Error('Missing snapshot path');
  const year68Snapshot = pathIndex === -1 ? null : JSON.parse(await readFile(process.argv[pathIndex + 1], 'utf8'));
  const flag = name => { const index = process.argv.indexOf(name); if (index === -1) return null; if (!process.argv[index + 1] || process.argv[index + 1].startsWith('--')) throw new Error(`Missing ${name} value`); return process.argv[index + 1]; };
  const trialDirectory = flag('--trial-directory'), restoreBackup = flag('--restore-backup');
  if (restoreBackup && !trialDirectory) throw new Error('--restore-backup requires --trial-directory');
  const server = createPilotServer({ year68Snapshot, trialDirectory, restoreBackup });
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { server.close(); server.closeIdleConnections(); });
  server.listen(4186, '127.0.0.1', () => console.log(`Project pilot: http://127.0.0.1:4186 — financial trial ${trialDirectory ? 'saved locally with backups' : 'in memory; restart resets changes'}.`));
}
