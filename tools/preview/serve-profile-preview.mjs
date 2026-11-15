import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../web/', import.meta.url)));
async function page() {
  const [source, partial, template, index, budget] = await Promise.all([
    readFile(path.join(root, 'js/features/project/app.sorting-auth.js'), 'utf8'),
    readFile(path.join(root, 'partials/login.html'), 'utf8'),
    readFile(new URL('./profile-preview.html', import.meta.url), 'utf8'),
    readFile(path.join(root, 'index.html'), 'utf8'),
    readFile(path.join(root, 'partials/budget-approval-request.html'), 'utf8')
  ]);
  const names = ['getStudentIdFromEmail', 'isAlumniChulaEmail', 'resolveLoginProfileType', 'getLoginProfileType', 'renderLoginProfileTypeSummary', 'applyLoginProfileTypeUI', 'deriveLoginProfileStudentMeta', 'updateLoginProfileStudentMeta'];
  const functions = names.map(name => {
    const start = source.indexOf(`  function ${name}(`);
    if(start < 0) throw new Error(`Missing production function: ${name}`);
    return source.slice(start, source.indexOf('\n  }',start)+4);
  }).join('\n');
  const map = source.match(/const loginProfileFacultyMap = \{[\s\S]*?\n  \};/)[0];
  const bindings = [...new Set(functions.match(/\bloginProfile\w+El\b/g))].map(name => `const ${name}=document.getElementById('${name.slice(0,-2)}');`).join('\n');
  const modal = index.slice(index.indexOf('    <!-- STAFF APPLICATION MODAL -->'), index.indexOf('    <script src="js/core/app.config.js"'));
  const orgStart = budget.lastIndexOf('<div', budget.indexOf('id="budgetRepresentativeApplicationModal"'));
  const orgModal = budget.slice(orgStart, budget.lastIndexOf('</section>'));
  return template.replace('<!-- ORG_MODAL -->', orgModal).replace('<!-- STAFF_MODAL -->', modal).replace('<!-- LOGIN_PARTIAL -->',partial).replace('// PRODUCTION_FUNCTIONS', `${bindings}\n${map}\n${functions}`);
}
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Cache-Control','no-store');
    if(url.pathname === '/') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await page());return;}
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if(!file.startsWith(root + path.sep) || !url.pathname.startsWith('/css/')){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type','text/css; charset=utf-8');res.end(await readFile(file));
  }catch{res.writeHead(500);res.end('Preview unavailable');}
}).listen(4176,'127.0.0.1',()=>console.log('Profile preview: http://localhost:4176'));
