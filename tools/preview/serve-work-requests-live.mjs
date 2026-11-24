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
    body = await readFile(path.join(dist,'index.html')); ext='.html';
   } else if (pathname === '/sw.js') {body="self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',()=>self.registration.unregister());"; ext='.js';}
   else {
    const isPreview = pathname.startsWith('/work-preview/');
    const base = isPreview ? preview : dist;
    const relative = isPreview ? pathname.slice('/work-preview/'.length) : '.'+pathname;
    const target = path.resolve(base,relative);
    if (!target.startsWith(path.resolve(base)+path.sep) || (isPreview && !['preview.css','preview.js','live.js','live-data.js'].includes(relative))) throw Error('Not found');
    body = await readFile(target);

   }
   res.writeHead(200,{'Content-Type':types[ext] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   res.end(req.method === 'HEAD' ? undefined : body);
  } catch {res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) createLiveWorkServer().listen(Number(process.env.PORT||4190),'127.0.0.1',()=>console.log('Real-data work preview: http://127.0.0.1:4190/#login'));
