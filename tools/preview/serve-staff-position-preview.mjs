import { readScriptSource } from "../lib/source-includes.mjs";
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const cssRoot = fileURLToPath(new URL('../../web/css/', import.meta.url));

const files = {
  '/staff-requests': ['staff-requests-preview.html', 'text/html'],
  '/': ['staff-position-preview.html', 'text/html'],
  '/staff-position-preview.js': ['staff-position-preview.js', 'text/javascript']
};
http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/preview-data') {
    try {
      const [source, json] = await Promise.all([
        readScriptSource(new URL('../../web/js/features/staff/app.staff-access.js', import.meta.url)),
        readFile(new URL('../../.local/staff-position-preview/catalog.json', import.meta.url), 'utf8')
      ]);
      const match = source.match(/const STAFF_PAGE_OPTIONS = (\[[\s\S]*?\n  \]);/);
      if (!match) throw new Error('Missing page catalog');
      const pages = vm.runInNewContext(match[1], {}, { timeout: 1000 });
      const snapshot = JSON.parse(json);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ...snapshot, pages }));
    } catch {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'ยังไม่มีชุดข้อมูลตำแหน่งจริงสำหรับทดสอบ ให้รัน npm run preview:staff-positions:refresh ก่อน' }));
    }
    return;
  }
  if (pathname === '/staff-role-policy.js') {
    try {
      const source = await readScriptSource(new URL('../../web/js/features/staff/app.staff-access.js', import.meta.url));
      const start = source.indexOf('const deriveLegacyRoleFromPositions =');
      const end = source.indexOf('\n  };', start) + 5;
      if (start < 0 || end < start) throw new Error('Missing role policy');
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(`const normalizeCode2 = value => String(value ?? '').padStart(2, '0');\nexport ${source.slice(start, end)}`);
    } catch { res.writeHead(500); res.end('Role policy unavailable'); }
    return;
  }
  if (pathname.startsWith('/css/')) {
    const file = path.resolve(cssRoot, pathname.slice(5));
    if (!file.startsWith(cssRoot) || !file.endsWith('.css')) { res.writeHead(404); res.end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
    return;
  }
  const route = files[pathname];
  if (!route) { res.writeHead(404); res.end(); return; }
  try {
    const body = await readFile(new URL(route[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': `${route[1]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Preview unavailable'); }
}).listen(Number(process.env.PORT || 4177), '127.0.0.1', () => {
  console.log(`Staff positions preview: http://127.0.0.1:${process.env.PORT || 4177}`);
});
