/** Offline visual audit. Blocks application scripts and every external request.
 * Run after build, with a local static server: node tools/audit-theme.mjs [url] [output].
 * It inspects HTML/CSS shells, not authenticated workflows or real records.
 */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const url = process.argv[2] || 'http://127.0.0.1:4173';
const output = process.argv[3] || '/tmp/sgcu-theme-audit';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
const inspect = () => {
        const root = document.querySelector(window.themeAuditRoot || '.page-view.active');
        const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
        const luma = channels => channels.slice(0,3).map(c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c+.055)/1.055)**2.4; }).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
        const selector = node => node.id ? '#'+node.id : node.tagName.toLowerCase()+[...node.classList].map(c=>'.'+c).join('');
        const surface = node => {
          let stack = [];
          for (let current=node;current;current=current.parentElement) stack.unshift(rgb(getComputedStyle(current).backgroundColor));
          return stack.reduce((base,c)=>{const a=c.length===4?c[3]:1;return c.length?base.map((v,i)=>v*(1-a)+c[i]*a):base;},[255,255,255]);
        };
        const contrast = [], bright = [];
        for (const node of root.querySelectorAll('*')) {
          const style=getComputedStyle(node);
          if(!node.getClientRects().length || style.visibility!=='visible' || node.closest('[hidden],.pdf-root,.receipt-sheet,.sr-only') || node.disabled || Number(style.opacity)<.6)continue;
          const bg=rgb(style.backgroundColor);
          if(style.backgroundImage.includes('gradient') && [...style.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].some(m=>{const c=rgb(m[0]);return c.slice(0,3).every(v=>v>215)&&(c[3]??1)>.5;}) && node.clientWidth>80 && node.clientHeight>25)bright.push({selector:selector(node),parent:selector(node.parentElement),gradient:true});
          if(bg.length && bg.slice(0,3).every(c=>c>215) && (bg[3]??1)>.5 && node.clientWidth>80 && node.clientHeight>25)bright.push({selector:selector(node),parent:selector(node.parentElement)});
          if(!Array.from(node.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()) && !node.matches('input,select,textarea'))continue;
          const fg=rgb(style.color), background=surface(node);
          if(fg.length<3)continue;
          const a=luma(fg),b=luma(background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
          const large=parseFloat(style.fontSize)>=24 || (parseFloat(style.fontSize)>=18.66 && Number(style.fontWeight)>=700);
          if(ratio<(large?3:4.5))contrast.push({selector:selector(node),parent:selector(node.parentElement),text:node.textContent.trim().slice(0,45),ratio:+ratio.toFixed(2),color:style.color,bg:background.map(Math.round)});
        }
        return {overflow:document.documentElement.scrollWidth>innerWidth,contrast,bright};
      };

try {
  const page = await browser.newPage({ colorScheme: 'dark', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await page.route('**/*', route => {
    const request = route.request();
    const target = new URL(request.url());
    if (target.origin !== new URL(url).origin || (request.resourceType() === 'script' && !target.pathname.endsWith('/app.theme.js'))) return route.abort();
    return route.continue();
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.getElementById('appLoader')?.remove());
  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}.section-appear,.home-snap-content{opacity:1!important;filter:none!important;transform:none!important;content-visibility:visible!important}.home-snap-panel{content-visibility:visible!important}' });
  // Fixture data exists only in this isolated browser; nothing is saved or submitted.
  await page.addScriptTag({content:await fs.readFile(new URL('../js/features/docs/app.downloads.js',import.meta.url),'utf8')});
  await page.evaluate(() => {
    renderDownloadDocuments(document.getElementById('downloadList'), [{name:'เอกสารตัวอย่างสำหรับตรวจธีม',category:'เอกสารการเงิน',desc:'ข้อมูลจำลองสำหรับตรวจตัวอักษรและปุ่ม',pdfUrl:'/fixture.pdf'}]);
    document.getElementById('downloadSkeleton')?.remove();
    document.getElementById('newsList').innerHTML = `<article class="news-card"><header class="news-card-header"><div class="news-card-title-row"><span class="news-pill news-pill-pinned">PIN</span><div class="news-card-title">ข่าวตัวอย่างสำหรับตรวจธีม</div></div><div class="news-card-meta"><span>12/11/2026</span><span class="news-tag">ประกาศ</span></div></header><p class="news-card-summary">ข้อมูลจำลองสำหรับตรวจการอ่านและปุ่มรายละเอียด</p><button class="news-card-btn" type="button">ดูรายละเอียด</button></article>`;
    document.getElementById('projectTableBody').innerHTML = ['approved','pending','rejected','draft'].map((status,i)=>`<tr><td data-label="รหัสโครงการ">TEST-${i+1}</td><td data-label="โครงการ"><div class="project-name">โครงการตัวอย่างตรวจธีม</div><div class="project-org">ข้อมูลจำลอง</div></td><td data-label="สถานะ"><span class="badge badge-${status}">${status}</span></td><td data-label="งบประมาณ">10,000</td></tr>`).join('');
  });
  const pages = await page.locator('.page-view[data-page]').evaluateAll(nodes => nodes.map(n => n.dataset.page));
  for (const name of pages) {
    await page.evaluate(name => document.querySelectorAll('.page-view').forEach(node => node.classList.toggle('active', node.dataset.page === name)), name);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const result = await page.evaluate(inspect);
      await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      report.push({page:name,width,...result});
    }
  }
  const dialogs = await page.locator('.modal[id], .person-modal[id], dialog[id]').evaluateAll(nodes => nodes.map(n => n.id));
  for (const id of dialogs) {
    await page.evaluate(id => {
      document.querySelectorAll('.page-view').forEach(n => n.classList.remove('active'));
      const node = document.getElementById(id);
      node.closest('.page-view')?.classList.add('active');
      for (let parent=node.parentElement;parent&&parent!==document.body;parent=parent.parentElement) {
        parent.hidden=false;
        if(getComputedStyle(parent).display==='none')parent.style.display='block';
      }
      node.hidden = false;
      if(node.tagName==='DIALOG')node.showModal();
      node.classList.add('show');
      node.setAttribute('aria-hidden', 'false');
      window.themeAuditRoot = '#'+id;
    }, id);
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:width===390?844:1000});
      if(!await page.locator('#'+id).isVisible())throw Error('Dialog not visible: '+id);
      const result = await page.evaluate(inspect);
      report.push({page:'dialog:'+id,width,...result});
      await page.screenshot({path:path.join(output,`dialog-${id}-${width}.png`)});
    }
    await page.evaluate(id => {document.getElementById(id).classList.remove('show');if(document.getElementById(id).tagName==='DIALOG')document.getElementById(id).close();window.themeAuditRoot=null;}, id);
  }
  // Small visual overview for manual review; individual full-page captures remain available.
  for (const group of ['pages','dialogs']) {
    const files=(await fs.readdir(output)).filter(n=>n.endsWith('-1440.png') && n.startsWith('dialog-')===(group==='dialogs')).sort();
    const overview=await browser.newPage({viewport:{width:1600,height:1000}});
    await overview.setContent('<style>body{margin:0;background:#eee;font:14px sans-serif}.grid{display:grid;grid-template-columns:repeat(4,400px)}figure{margin:0;padding:4px;box-sizing:border-box}img{width:392px;height:278px;object-fit:cover;object-position:top}figcaption{height:20px;overflow:hidden}</style><div class="grid">'+(await Promise.all(files.map(async name=>'<figure><figcaption>'+name+'</figcaption><img src="data:image/png;base64,'+(await fs.readFile(path.join(output,name))).toString('base64')+'"></figure>'))).join('')+'</div>');
    await overview.screenshot({path:path.join(output,group+'-overview.png'),fullPage:true});
    await overview.close();
  }
  await page.getByLabel('ธีมการแสดงผล').selectOption('light');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).color),'rgb(17, 24, 39)');
  await page.getByLabel('ธีมการแสดงผล').selectOption('dark');
  await page.reload({waitUntil:'load'});
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.emulateMedia({media:'print'});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).color),'rgb(17, 24, 39)');
  console.log('Light reset, saved preference reload, and print isolation passed.');
  await fs.writeFile(path.join(output,'report.json'), JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.filter(r=>r.contrast.length||r.bright.length||r.overflow).map(r=>({page:r.page,width:r.width,contrast:r.contrast.length,bright:r.bright.length,overflow:r.overflow})),null,2));
  console.log(`Audited ${pages.length} page shells and ${dialogs.length} dialogs at two viewport sizes. Report: ${output}/report.json`);
} finally { await browser.close(); }
