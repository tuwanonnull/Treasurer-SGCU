import http from 'node:http';
import fs from 'node:fs/promises';
import { readCssSource } from '../lib/source-includes.mjs';
const base = new URL('../../', import.meta.url);
const [html, css, script] = await Promise.all([
  fs.readFile(new URL('web/partials/dashboard-staff.html', base), 'utf8'),
  readCssSource(new URL('web/css/style.css', base)),
  fs.readFile(new URL('web/js/core/app.visitor-stats.js', base), 'utf8')
]);
const updateMeta = html.match(/<p id="visitorUpdateMeta"[\s\S]*?<\/p>/)[0].replace(' hidden>', '>');
const panel = html.slice(html.indexOf('          <section id="systemVisitorPanel"'), html.indexOf('          <div id="systemHealthSummary"')).replace(' hidden>', '>');
const mock = `window.sgcuVisitorCounter = { getVisitorHistory: async (start, end) => {
  const visits = {}, unique = {};
  for (let i = 0; i < 61; i++) {
    const date = new Date(end + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() - i);
    const key = date.toISOString().slice(0,10);
    visits[key] = 24 + (i * 17 + 23) % 120;
    if (i < 7) unique[key] = Math.round(visits[key] * 0.6);
  }
  return { visits, unique, allTime: 4260, todayVisits: 47, todayUnique: 28 };
}};`;
const page = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>พรีวิวสถิติการเข้าใช้งาน</title><style>${css}\nbody{display:block;overflow:auto}main{max-width:1100px;margin:24px auto;padding:16px}#systemVisitorPanel{display:block}</style></head><body><main><h1 class="page-title">ข้อมูลระบบ</h1><p>พรีวิวด้วยข้อมูลจำลอง — ไม่บันทึกหรืออ่านสถิติจริง</p><div class="tabs"><button class="tab-btn is-active" data-system-data-tab="visitors">สถิติการเข้าใช้งาน</button></div>${updateMeta}${panel}</main><script>${mock}</script><script>${script}</script><script>document.addEventListener('DOMContentLoaded', () => document.querySelector('[data-system-data-tab="visitors"]').click());</script></body></html>`;
http.createServer((req, res) => {
  if (req.url !== '/') { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(page);
}).listen(4182, '127.0.0.1', () => console.log('Visitor statistics preview: http://127.0.0.1:4182/'));
