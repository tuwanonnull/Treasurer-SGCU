// The actual built site shell and styles, with mock-only scripts and one added page.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = path.resolve(fileURLToPath(new URL('../../dist/', import.meta.url)));
const files = new Map([
  ['/preview.css', ['work-requests/preview.css', 'text/css; charset=utf-8']],
  ['/preview.js', ['work-requests/preview.js', 'text/javascript; charset=utf-8']],
  ['/preview-shell.js', ['work-requests/shell.js', 'text/javascript; charset=utf-8']]
]);
const accountLinks = '<div class="nav-group"><button class="nav-group-toggle" type="button" aria-expanded="false">บัญชีของฉัน</button><div class="nav-group-menu" aria-hidden="true"><a href="#login" data-page="login" data-visible="public">ข้อมูลบัญชี</a><a href="#account-work" data-page="account-work" data-visible="protected">งานและคำขอ</a></div></div>';
export async function renderWorkPreview() {
  const [original, work] = await Promise.all([
    readFile(path.join(dist, 'index.html'), 'utf8'), readFile(new URL('work-requests/index.html', import.meta.url), 'utf8')
  ]);
  return original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace('<html lang="th">', '<html lang="th" data-theme="light">')
    .replace(/<a href="#" data-page="login" class="nav-pill" data-visible="public">เข้าสู่ระบบ<\/a>/g, accountLinks)
    .replace('<a href="#" data-page="login" data-visible="public">เข้าสู่ระบบ</a>', '<a href="#login" data-page="login" data-visible="public">ข้อมูลบัญชี</a><a href="#account-work" data-page="account-work" data-visible="protected">งานและคำขอ</a>')
    .replace('<section class="page-view" data-page="login">', work + '<section id="profile-panel" class="page-view" data-page="login">')
    .replace('</head>', '<link rel="stylesheet" href="/preview.css"></head>')
    .replace('</body>', '<script src="/preview-staff-motion.js"></script><script src="/preview-shell.js"></script><script src="/preview.js"></script></body>');
}
export function createWorkPreviewServer() {
  return http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    try {
      let body, type;
      if (pathname === '/' || pathname === '/index.html') { body = await renderWorkPreview(); type = 'text/html; charset=utf-8'; }
      else if (pathname === '/preview-staff-motion.js') {
        const source = await readFile(path.join(dist, 'js/features/project/app.sorting-auth.js'), 'utf8');
        const start = source.indexOf('function captureStaffModeMenu()');
        const end = source.indexOf('function applyStaffViewMode()', start);
        if (start < 0 || end < 0) throw Error('Staff motion functions not found');
        body = source.slice(start, end); type = 'text/javascript; charset=utf-8';
      }
      else if (files.has(pathname)) { const [file, mime] = files.get(pathname); body = await readFile(new URL(file, import.meta.url)); type = mime; }
      else {
        // Only public styles/images/fonts. Never serve live scripts, API routes or repository files.
        const target = path.resolve(dist, '.' + pathname);
        if (!target.startsWith(dist + path.sep) || !/^\/(css|img|THSarabunNew)\//.test(pathname)) throw Error('Not a preview asset');
        body = await readFile(target);
        type = { '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }[path.extname(target)] || 'application/octet-stream';
      }
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; frame-src 'none'; frame-ancestors 'none'; form-action 'none'" });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404); res.end('Preview asset not found. Run npm run build first.'); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4189);
  createWorkPreviewServer().listen(port, '127.0.0.1', () => console.log(`Work requests preview: http://127.0.0.1:${port} (real site shell; mock data only)`));
}
