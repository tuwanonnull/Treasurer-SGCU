import {filterLiveProjects} from '../../functions/project-live/query-filters.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
const root=new URL('../../web/',import.meta.url);
const moneyLabels={O:'งบอนุมัติ',V:'ยอดโอน',AJ:'ยอดใช้จริง'};
const statusGroups=[{column:'S',label:'สถานะโครงการ',values:['รอดำเนินการ','กำลังดำเนินการ','เสร็จสิ้น']}];
const projects=Array.from({length:28},(_,i)=>({id:String(i),code:`SGCU68-${String(i+1).padStart(3,'0')}`,name:['โครงการสานสัมพันธ์นิสิต','โครงการจิตอาสาพัฒนาชุมชน','โครงการส่งเสริมทักษะผู้นำนิสิต','โครงการกิจกรรมกีฬาเพื่อสุขภาพ'][i%4]+' (ตัวอย่าง '+(i+1)+')',year:2568,organizationGroup:i%2?'ชมรมฝ่ายกีฬา':'องค์การบริหารสโมสรนิสิต',organization:i%2?(i%4===1?'ชมรมฟุตบอล':'ชมรมแบดมินตัน'):(i%4===0?'ฝ่ายกิจการนิสิต':'ฝ่ายพัฒนาสังคม'),responsibleName:'ผู้ตรวจตัวอย่าง',version:1,money:{O:(i+1)*150000,V:0,AJ:i*35000},formulaInputs:{transferDirection:''},statuses:{S:statusGroups[0].values[i%3]}}));
// Full read-only detail fixture, kept separate from live amounts and statuses.
const detailRows=projects.map(p=>({year:p.year,code:p.code,councilSessionText:'สมัยสามัญที่ 1 ครั้งที่ 2/2568',approveDate:'15/06/2568',lastWorkDate:'30/09/2568',fundSource:'กองทุนกิจกรรมนิสิต',transferDocNo:'โอน-2568/012',advanceDocNo:'ยืม-2568/025',advanceDueDate:'30/10/2568',closeDueDate:'15/10/2568',closeDurationText:'15',decreeNo:'ฎีกา-2568/108',workbookDetails:{A:String(Number(p.id)+1),D:'https://example.com/project',I:'สามัญ',J:'1',K:'2',S:'16/06/2568',T:'https://example.com/transfer',AA:'20/06/2568',AB:'https://example.com/advance',AF:'ผู้รับผิดชอบตัวอย่าง',AH:'เหรัญญิกโครงการตัวอย่าง',AL:'ติดตามแล้ว',AM:'ยังไม่ติดตาม',AN:'ยังไม่ติดตาม',AO:'ยังไม่ติดตาม',AP:'ข้อความติดตามตัวอย่าง',AQ:'05/10/2568',AR:'ติดตามแล้ว',AS:'ยังไม่ติดตาม',AT:'ยังไม่ติดตาม',AU:'ยังไม่ติดตาม',AV:'ข้อความติดตามหลังแก้ไขตัวอย่าง',AW:'10 วัน',AX:'หมายเหตุตัวอย่าง',AY:'10/10/2568',BB:'คืนรองจ่าย',BJ:'รอส่งเอกสาร',BK:'รอปิดโครงการ'}}));
for(const p of projects){Object.assign(p.money,{W:p.money.O,AE:Math.round(p.money.O*.8),BF:p.money.O-p.money.AJ,BE:p.money.AJ,BC:p.money.AJ-Math.round(p.money.O*.8)});Object.assign(p.statuses,{H:'อนุมัติโครงการ',Q:'ไม่เข้ากระบวนการโอนงบประมาณ',Y:'โครงการรับเงินแล้ว',AZ:'รอส่งเอกสารปิดโครงการ',BA:'รอปิดโครงการ'});p.formulaInputs.advanceRate='80';}
Object.assign(moneyLabels,{W:'ยอดโอนสุทธิ',AE:'จำนวนเงินยืม',BF:'งบประมาณคงเหลือ',BE:'ยอดเบิกจริง',BC:'ยอดรับเพิ่ม / คืนเงิน'});
const permissions=Object.fromEntries(projects.map(p=>[p.id,{S:Object.fromEntries(statusGroups[0].values.map(v=>[v,'direct']))}]));
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://127.0.0.1');
 res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/preview-details'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(detailRows));}
 if(url.pathname.startsWith('/api')){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const action=url.pathname.slice(4);
  if(req.method==='POST'){
   let raw='';for await(const part of req)raw+=part;
   const body=JSON.parse(raw),p=projects.find(p=>p.id===body.projectId);
   if(['/preview','/status-preview'].includes(action)&&p){const after={...p.money};if(body.changes)for(const col of ['O','V','AJ']){const value=body.changes[col];if(!/^\d+(\.\d{1,2})?$/.test(value)){res.statusCode=400;return res.end(JSON.stringify({error:'กรอกยอดเงินเป็นตัวเลขทศนิยมไม่เกิน 2 ตำแหน่ง'}));}after[col]=Math.round(Number(value)*100);}return res.end(JSON.stringify({before:p.money,after}));}
   res.statusCode=400;return res.end(JSON.stringify({error:'โหมดพรีวิว: ทดลองดูผลได้ แต่ยังไม่บันทึกหรือเปลี่ยนสิทธิ์ข้อมูล'}));
  }
  if(action==='/history')return res.end(JSON.stringify({audit:[]}));
  if(action==='/access')return res.end(JSON.stringify({active:true}));
  if(action==='/backup'){res.statusCode=400;return res.end(JSON.stringify({error:'โหมดพรีวิวไม่มีชุดสำรองข้อมูลจริง'}));}
  const {matched:filtered,offset,filterOptions}=filterLiveProjects(projects,url.searchParams);
  return res.end(JSON.stringify({user:{role:'admin'},datasetId:'preview',totalCount:projects.length,matchedCount:filtered.length,offset,filterOptions,projects:filtered.slice(offset,offset+25),moneyLabels,statusGroups,projectStatusPermissions:permissions}));
 }
 if(url.pathname==='/'){
  const partial=await fs.readFile(new URL('partials/project-live-staff.html',root),'utf8');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.end(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>พรีวิวจัดการโครงการ 2568</title><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/components/theme-preview.css"><script>try{document.documentElement.dataset.theme=new URLSearchParams(location.search).get('theme')||localStorage.getItem('project-preview-theme')||'light';}catch{document.documentElement.dataset.theme='light';}</script><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&amp;display=swap"><style>body{display:block;padding:24px 16px}.page-view{display:block!important}.preview-note{max-width:1120px;margin:0 auto 20px;padding:12px 16px;border:1px solid #ead6df;border-radius:12px;background:#fff4f8;color:#87214f;font-size:14px}.project-live-page{padding:0}.preview-note{display:flex;align-items:center;justify-content:space-between;gap:12px}.preview-theme-toggle{flex-shrink:0}html[data-theme="dark"] .preview-note{background:var(--preview-surface);color:var(--preview-text);border-color:var(--preview-border)}</style></head><body><p class="preview-note">พรีวิว UX/UI · ข้อมูลจำลองทั้งหมด · ทดลองค้นหาและดูผลก่อนบันทึกได้ โดยไม่มีการบันทึกข้อมูลจริง<button type="button" class="btn-ghost preview-theme-toggle" data-preview-theme>โหมดมืด</button></p>${partial.replace('class="page-view"','class="page-view active"')}<script>window.SGCU_APP_CONFIG={projectLive:{apiUrl:'/api'}};window.sgcuAuth={auth:{currentUser:{uid:'preview',email:'tuwanon.kimchiang@gmail.com',getIdToken:async()=> 'preview'}},onAuthStateChanged:()=>{}};</script><script>async function loadBorrowProjectsFromProjectStatus(){const response=await fetch("/preview-details");if(!response.ok)throw Error("โหลดไม่ได้");return response.json();}</script><script>var staffAuthUser={role:'0'};function isHeadStaffProfile(p){return p?.role==='0';}window.SGCU_APP_CONFIG.documents={signersByAcademicYear:{'2568':{viceRectorName:'รองอธิการบดีตัวอย่าง',presidentName:'นายกสโมสรตัวอย่าง',treasurerName:'เหรัญญิกตัวอย่าง',treasurerPhone:'000-000-0000',approvalMeetingBody:'สภานิสิต'}}};window.sgcuFirestore={db:{},doc:()=>({}),serverTimestamp:()=>null,setDoc:async()=>{}};</script><script src="/js/features/project/app.project-hub.js"></script><script src="/js/features/project/app.document-signers.js"></script><script src="/js/features/project/app.project-live-details.js"></script><script src="/js/features/project/app.project-live.js"></script><script>
const themeToggle=document.querySelector('[data-preview-theme]');
const modalToggle=themeToggle.cloneNode(true);
document.querySelector('[data-live-id="modal-close"]').before(modalToggle);
function updateThemeButtons(){for(const button of [themeToggle,modalToggle]){const dark=document.documentElement.dataset.theme==='dark';button.textContent=dark?'โหมดสว่าง':'โหมดมืด';button.setAttribute('aria-label',dark?'เปลี่ยนเป็นโหมดสว่าง':'เปลี่ยนเป็นโหมดมืด');}}
for(const button of [themeToggle,modalToggle])button.onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('project-preview-theme',theme);}catch{}const url=new URL(location.href);url.searchParams.set('theme',theme);history.replaceState(null,'',url);updateThemeButtons();};
updateThemeButtons();
</script></body></html>`);
 }
 const relative=url.pathname.slice(1);
 if(!/^(css|js|THSarabunNew|img)\//.test(relative)||relative.includes('..')){res.statusCode=404;return res.end();}
 const content=await fs.readFile(new URL(relative,root));
 const ext=relative.split('.').pop();res.setHeader('Content-Type',({css:'text/css',js:'text/javascript',ttf:'font/ttf',woff2:'font/woff2',png:'image/png',svg:'image/svg+xml'})[ext]||'application/octet-stream');res.end(content);
 }catch{res.statusCode=500;res.end('Preview could not load');}
});
const port=Number(process.env.PORT || 4175);
server.listen(port,'127.0.0.1',()=>console.log(`Project UI preview: http://127.0.0.1:${port} (sample data only)`));
