import { readScriptSource } from "../lib/source-includes.mjs";
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.resolve(fileURLToPath(new URL('../../dist/',import.meta.url)));
const preview=fileURLToPath(new URL('./',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Preview server accepts reads only');}
 if(pathname==='/preview-data'){
 const [source,json]=await Promise.all([readScriptSource(new URL('../../web/js/features/staff/app.staff-access.js',import.meta.url)),fs.readFile(new URL('../../.local/staff-position-preview/catalog.json',import.meta.url),'utf8')]);
 const match=source.match(/const STAFF_PAGE_OPTIONS = (\[[\s\S]*?\n  \]);/);
 const pages=vm.runInNewContext(match[1],{},{timeout:1000});res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify({...JSON.parse(json),pages}));
 }
 if(pathname==='/sw.js'){res.setHeader('Content-Type','text/javascript');return res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',()=>self.registration.unregister());");}
 const files={'/preview/staff-requests':'staff-requests-preview.html','/preview/positions':'staff-position-preview.html','/staff-position-preview.js':'staff-position-preview.js'};
 let file=files[pathname]?path.join(preview,files[pathname]):path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!files[pathname]&&!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}
 let body=await fs.readFile(file);const ext=path.extname(file);
 if(pathname==='/preview/staff-requests')body=body.toString().replaceAll('href="/"','href="/preview/positions"');
 if(pathname==='/preview/positions')body=body.toString().replace('<main class="position-preview">','<main class="position-preview"><a href="/preview/staff-requests" style="display:inline-block;margin-bottom:16px;color:var(--theme-pink-700)">‹ สตาฟและคำขอ</a>');
 res.setHeader('Content-Type',(types[ext]||'application/octet-stream')+'; charset=utf-8');res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT||4181),'127.0.0.1',()=>console.log('Full site with new staff preview: http://127.0.0.1:4181/#staff-approval'));
