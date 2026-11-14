import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { PilotError } from './model.mjs';
// Auth verifier must be server-owned. Store enforces the active dataset and grant in transactions.
export function createLiveApiServer({ authenticate, store }) {
  return http.createServer(async (req,res) => {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff' }); res.end(JSON.stringify(body)); };
    try {
      const hosts = [`127.0.0.1:${req.socket.localPort}`, `localhost:${req.socket.localPort}`];
      if (!hosts.includes(req.headers.host) || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) || req.headers['sec-fetch-site'] === 'cross-site') throw new PilotError(403,'ไม่อนุญาตคำขอจากเว็บไซต์อื่น');
      const url = new URL(req.url,`http://${req.headers.host}`);
      const assets = { '/': ['live.html','text/html'], '/live.js': ['live.js','text/javascript'], '/style.css': ['style.css','text/css'] };
      if (assets[url.pathname] && req.method === 'GET') {
        const [file,type] = assets[url.pathname];
        res.writeHead(200, {'Content-Type': `${type}; charset=utf-8`, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
          'Content-Security-Policy': "default-src 'none'; script-src 'self' https://www.gstatic.com https://apis.google.com; style-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://departmentwebsite-5aec1.firebaseapp.com; frame-src https://departmentwebsite-5aec1.firebaseapp.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});
        return res.end(await readFile(new URL(file,import.meta.url),'utf8'));
      }
      const action = url.pathname.slice('/api/year68/live'.length);
      const routes = ['', '/history', '/backup', '/preview', '/commit', '/status-preview', '/status'];
      if (!url.pathname.startsWith('/api/year68/live') || !routes.includes(action)) throw new PilotError(404,'ไม่พบ API');
      const read = ['', '/history', '/backup'].includes(action);
      if (req.method !== (read ? 'GET' : 'POST')) throw new PilotError(405,'วิธีเรียกไม่ถูกต้อง');
      if (!read && req.headers.origin !== `http://${req.headers.host}`) throw new PilotError(403,'ต้องเรียกจากหน้าเว็บเดียวกัน');
      const actor = await authenticate(req.headers.authorization);
      if (!actor?.authenticated || typeof actor.id !== 'string') throw new PilotError(401,'กรุณาเข้าสู่ระบบ');
      if (action === '') return send(200, await store.query(actor.id,url.searchParams));
      if (action === '/history') return send(200,await store.history(actor.id));
      if (action === '/backup') { const bundle = await store.backup(actor.id); res.setHeader('Content-Disposition','attachment; filename="sgcu-year2568-live-backup.json"'); return send(200,bundle); }
      if (!req.headers['content-type']?.startsWith('application/json')) throw new PilotError(415,'ใช้ JSON เท่านั้น');
      let bytes = 0, raw = '';
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 10000) throw new PilotError(413,'คำขอใหญ่เกินไป'); raw += chunk; }
      let body; try { body = JSON.parse(raw); } catch { throw new PilotError(400,'รูปแบบ JSON ไม่ถูกต้อง'); }
      return send(200, await store.mutate(actor.id,action.slice(1),body));
    } catch(error) { send(error.status || 503,{ error: error.status ? error.message : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' }); }
  });
}
