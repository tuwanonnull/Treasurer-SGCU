// Local real-data integration: preserve the application's authentication and rules.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dist = path.resolve(fileURLToPath(new URL('../../dist', import.meta.url)));
const preview = fileURLToPath(new URL('./work-requests/', import.meta.url));
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
export function createLiveWorkServer() {
 return http.createServer(async (req,res) => {
  try {
   if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
   const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   let body, ext = path.extname(pathname);
   if (pathname === '/' || pathname === '/index.html') {
    let html = await readFile(path.join(dist,'index.html'),'utf8');
    let partial = await readFile(path.join(preview,'index.html'),'utf8');
    partial = partial.replace('page-view active work-preview','page-view work-preview')
     .replace('class="work-preview-controls filter-group"','class="work-preview-controls filter-group" hidden')
     .replace('<div id="request-list">','<p id="live-work-status" role="status">เข้าสู่ระบบเพื่อดูข้อมูลจริง</p><div id="request-list">')
     .replace('ข้อมูลตัวอย่าง ณ 24 พ.ย. 2569','ข้อมูลจริง · หน้านี้เปิดดูอย่างเดียว')
     .replace('id="reset-demo"','id="reset-demo" hidden')
     .replace('ข้อมูลจำลอง · การทดลองไม่เปลี่ยนข้อมูลในระบบจริง','ข้อมูลจริง · ดูรายละเอียดได้โดยไม่มีการเปลี่ยนแปลงรายการ')
     .replace('id="demo-action"','id="demo-action" hidden');
    html = html.replace('<section class="page-view" data-page="login">',partial+'<section class="page-view" data-page="login">');
    const workLink = '<a href="#account-work" data-page="account-work" data-visible="protected">งานและคำขอ</a>';
    html = html.replace(/<a href="#" data-page="login" class="nav-pill" data-visible="public">เข้าสู่ระบบ<\/a>/g,
      '<div class="nav-group"><button class="nav-group-toggle" type="button" aria-expanded="false">บัญชีของฉัน</button><div class="nav-group-menu" aria-hidden="true"><a href="#login" data-page="login" data-visible="public">เข้าสู่ระบบ</a>'+workLink+'</div></div>')
      .replace('<a href="#" data-page="login" data-visible="public">เข้าสู่ระบบ</a>', '<a href="#login" data-page="login" data-visible="public">เข้าสู่ระบบ</a>'+workLink);
    body = html.replace('</head>','<link rel="stylesheet" href="/work-preview/preview.css"></head>')
     .replace('</body>','<script src="/work-preview/live.js" defer></script><script src="/work-preview/preview.js" defer></script></body>'); ext='.html';
   } else if (pathname === '/sw.js') {body="self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',()=>self.registration.unregister());"; ext='.js';}
   else {
    const isPreview = pathname.startsWith('/work-preview/');
    const base = isPreview ? preview : dist;
    const relative = isPreview ? pathname.slice('/work-preview/'.length) : '.'+pathname;
    const target = path.resolve(base,relative);
    if (!target.startsWith(path.resolve(base)+path.sep) || (isPreview && !['preview.css','preview.js','live.js','live-data.js'].includes(relative))) throw Error('Not found');
    body = await readFile(target);
    if (pathname === '/js/core/app.staff-menu-counts.js') {
     body = body.toString().replace("document.querySelectorAll('[data-staff-mode=\"staff\"]')", "document.querySelectorAll('[data-staff-mode=\"staff\"]:not(#work-panel [data-staff-mode])')");
    }
    if (pathname === '/js/features/project/app.sorting-auth.js') {
     body = body.toString().replace('const withProjectLive = pages => {','const withProjectLive = pages => {\n    if (isUserAuthenticated) pages.add("account-work");')
      .replace('const allowedStaffPages = getAllowedStaffPagesByProfile(staffUser);', 'const allowedStaffPages = getAllowedStaffPagesByProfile(staffUser);\n  if (isUserAuthenticated) allowedStaffPages.add("account-work");');
    }
   }
   res.writeHead(200,{'Content-Type':types[ext] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   res.end(req.method === 'HEAD' ? undefined : body);
  } catch {res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) createLiveWorkServer().listen(Number(process.env.PORT||4190),'127.0.0.1',()=>console.log('Real-data work preview: http://127.0.0.1:4190/#login'));
