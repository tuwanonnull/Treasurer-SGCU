import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { candidateSummary } from './production-candidate.mjs';
import { acceptBaseline } from './approved-baseline.mjs';
import { isDeepStrictEqual } from 'node:util';
export function createPreflightServer({ check, loadCandidate, loadAcceptance }) {
  return http.createServer(async (req, res) => {
    const send = (status, body, type = 'application/json') => {
      res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; script-src 'self' https://www.gstatic.com https://apis.google.com; style-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://departmentwebsite-5aec1.firebaseapp.com; frame-src https://departmentwebsite-5aec1.firebaseapp.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
      res.end(type === 'application/json' ? JSON.stringify(body) : body);
    };
    try {
      const allowedHosts = [`127.0.0.1:${req.socket.localPort}`, `localhost:${req.socket.localPort}`];
      const origin = `http://${req.headers.host}`;
      if (!allowedHosts.includes(req.headers.host) || (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') return send(403, { error: 'ไม่อนุญาตเว็บไซต์อื่น' });
      if (req.method !== 'GET') return send(405, { error: 'หน้านี้ตรวจความพร้อมเท่านั้น' });
      if (req.url === '/api/candidate') {
        const actor = await check(req.headers.authorization);
        if (!loadCandidate) return send(503, { error: 'ยังไม่ได้เชื่อมข้อมูลตั้งต้น' });
        const candidate = await loadCandidate();
        const acceptance = loadAcceptance ? await loadAcceptance() : null;
        if (acceptance && !isDeepStrictEqual(acceptance, acceptBaseline(candidate))) throw new Error('Acceptance does not match source');
        const current = await check(req.headers.authorization);
        if (actor.authenticated !== true || current.authenticated !== true || actor.email !== current.email) return send(403, { error: 'บัญชีเปลี่ยนระหว่างตรวจข้อมูล' });
        return send(200, { ...candidateSummary(candidate), status: acceptance ? 'approved-for-import' : 'awaiting-review', baselineAccepted: Boolean(acceptance), acceptedOn: acceptance?.acceptedOn || null });
      }
      if (req.url === '/api/readiness') return send(200, await check(req.headers.authorization));
      const assets = { '/': ['production-login.html', 'text/html'], '/production-login.js': ['production-login.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      const asset = assets[req.url];
      if (!asset) return send(404, { error: 'ไม่พบหน้า' });
      return send(200, await readFile(new URL(asset[0], import.meta.url), 'utf8'), asset[1]);
    } catch (error) { send(error.status || 503, { error: error.status ? error.message : 'ตรวจระบบไม่สำเร็จ กรุณาลองใหม่' }); }
  });
}
