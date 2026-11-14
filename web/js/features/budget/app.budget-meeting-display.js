// Same-browser read-only projection. This page never loads Firebase or host state.
const root = document.getElementById('meeting-display');
const connection = document.getElementById('display-connection');
const warning = document.getElementById('display-warning');
const source = document.getElementById('display-source');
const fullscreen = document.getElementById('display-fullscreen');
const id = location.hash.slice(1);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value || 0);
const stages = ['เจ้าของโครงการชี้แจง','ฝ่ายขอรับซักถามร่วมกัน','เจ้าของโครงการกล่าวปิด','ลงมติลดงบ'];
let channel, snapshot, lastReceived = 0, disconnected = true, signature = '', lastClock = 0;
function activity(s) {
  if (s.result) return `<section class="bm-work bmd-card bmd-result"><span class="bmd-eyebrow">ผลลงมติ</span><h2>${esc(s.result.message)}</h2><div class="bmd-result-counts"><div><strong>${s.result.yes}</strong><span>${s.result.reduction?'เห็นชอบ':'พึงพอใจ'}</span></div><div><strong>${s.result.no}</strong><span>${s.result.reduction?'ไม่เห็นชอบ':'ไม่พึงพอใจ'}</span></div><div><strong>${s.result.missing}</strong><span>ยังไม่ลงคะแนน</span></div></div><p class="bmd-muted">ผู้มีสิทธิ์ ${s.result.total} คน</p></section>`;
  if (s.timer) return `<section class="bm-work bmd-card bmd-clock-card"><span class="bmd-eyebrow">${esc(stages[s.stage])}</span><output data-display-clock>05:00</output><p data-clock-status></p></section>`;
  if (s.open) return `<section class="bm-work bmd-card bmd-progress"><span class="bmd-eyebrow">${s.submission?'เปิดรับข้อมูล':'เปิดลงคะแนน'}</span><h2>${s.submission?'รอข้อมูลจากผู้แทนฝ่าย':'รอผู้แทนฝ่ายลงคะแนน'}</h2>${s.progress ? `<div class="bmd-progress-number">${s.progress.count}<small>/ ${s.progress.total} ฝ่าย</small></div><progress max="${s.progress.total || 1}" value="${s.progress.count}" aria-label="จำนวนฝ่ายที่ส่งแล้ว"></progress><p class="bmd-muted">${s.progress.cached?'กำลังซิงก์ข้อมูล':s.progress.count === s.progress.total?'ส่งครบทุกฝ่ายแล้ว':'ส่งแล้วตามจำนวนที่แสดง'}</p>` : '<p class="bmd-muted">รอประธานปิดรับและประกาศผล</p>'}</section>`;
  const message = s.closed || (s.step===3 ? s.ranking.length?'ประกาศอันดับโครงการแล้ว':'เตรียมจัดลำดับโครงการ' : s.step===2?'ตรวจรายการยกเลิกโครงการ':s.step===4?'ตรวจฝ่ายที่เสนอขอรับงบ':s.step===6?'ตรวจยอดจัดสรรก่อนลงมติ':'รอประธานเปิดขั้นตอนถัดไป');
  return `<section class="bm-work bmd-card bmd-wait"><span class="bmd-eyebrow">${s.step===7?'สิ้นสุดการประชุม':'สถานะการประชุม'}</span><h2>${esc(message)}</h2>${s.ballotCount !== null && s.step===3 && !s.ranking.length ? `<p class="bmd-muted">รับบัตรแล้ว ${s.ballotCount} / ${s.people} ใบ</p>` : ''}</section>`;
}
function list(s) {
  const ranked = s.ranking.length > 0, rows = ranked ? s.ranking : s.budgets;
  return `<section class="bm-work bmd-card bmd-list"><div class="bmd-section-heading"><h2>${ranked?'อันดับโครงการ':'งบประมาณรายฝ่าย'}</h2><span>${ranked?'คะแนน':'บาท'}</span></div><div class="project-table-wrapper bm-table-wrap"><table class="${ranked?'bmd-ranking-table':'bmd-budget-table'}"><thead><tr>${ranked?'<th>อันดับ</th>':''}<th class="bmd-name">${ranked?'โครงการ':'ฝ่าย'}</th><th>${ranked?'คะแนน':'งบจัดสรร (บาท)'}</th></tr></thead><tbody>${rows.map(row=>`<tr>${ranked?`<td class="bmd-rank"><span class="bm-rank-number">${row.rank}</span></td>`:''}<td class="bmd-name">${esc(row.name)}${ranked?`<small>${esc(row.department)}</small>`:''}</td><td class="bmd-number">${ranked?row.score:money(row.amount)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function render() {
  const s=snapshot;
  if(!s || s.unavailable) { root.innerHTML='<section class="bmd-empty"><h1>รอข้อมูลจากประธาน</h1><p>กรุณาเปิดหน้าควบคุมการประชุมและเข้าสู่ระบบ</p></section>'; source.textContent='จอห้องประชุม'; return; }
  source.textContent=s.sourceLabel || 'องค์การบริหารสโมสรนิสิต';
  let main;
  if(s.budgets.length || s.ranking.length) main=list(s);
  else if(s.project) main=`<section class="bm-work bmd-card bmd-project"><div class="bmd-section-heading"><span class="bmd-eyebrow">โครงการที่กำลังพิจารณา</span><span>ลำดับ ${s.project.position} / ${s.project.total}</span></div><h1>${esc(s.project.name)}</h1><p class="bmd-muted">${esc(s.project.department)} · ${esc(s.project.code)}</p><div class="bmd-project-budget"><span>งบล่าสุด</span><strong>${money(s.project.budget)} <small>บาท</small></strong></div>${s.recipients.length?`<div class="bmd-recipients"><h3>ฝ่ายร่วมเสนอขอรับงบ</h3><div>${s.recipients.map(name=>`<span>${esc(name)}</span>`).join('')}</div></div>`:''}${s.step===5?`<ol class="bmd-stages">${stages.map((label,i)=>`<li ${i===s.stage?'aria-current="step"':''}><b>${i+1}</b>${esc(label)}</li>`).join('')}</ol>`:''}</section>`;
  else main=`<section class="bm-work bmd-card bmd-stage-intro"><span class="bmd-eyebrow">ขั้นตอน ${s.step+1} จาก ${s.steps.length}</span><h1>${esc(s.stepTitle)}</h1><p class="bmd-muted">${s.hasSource?`${s.projects} โครงการ · ${s.departments} ฝ่าย`:'รอเลือกชุดข้อมูลการประชุม'}</p></section>`;
  root.innerHTML=`<div class="bmd-title"><div><span class="bmd-eyebrow">รอบจัดสรรที่ ${s.round}</span><h2>${esc(s.stepTitle)}</h2></div><span class="bm-round-label bmd-round">ขั้นตอน ${s.step+1} / ${s.steps.length}</span></div><nav class="bm-workflow bmd-agenda" aria-label="วาระการประชุม"><ol>${s.steps.map((label,i)=>`<li ${i===s.step?'aria-current="step"':''}><span>${i+1}</span><b>${esc(label)}</b></li>`).join('')}</ol></nav><dl class="bm-meeting-meta bmd-metrics"><div><dt>งบตั้งต้นรวม</dt><dd>${money(s.initialBudget)} <small>บาท</small></dd></div><div><dt>งบจัดสรรล่าสุด</dt><dd>${money(s.currentBudget)} <small>บาท</small></dd></div><div><dt>${s.step===5?'ผู้มีสิทธิ์ในรอบนี้':'ผู้มีสิทธิ์ออกเสียง'}</dt><dd>${s.eligible} <small>คน</small></dd></div></dl><div class="bmd-content">${main}${activity(s)}</div>`;
  paintClock();
}
function paintClock() {
  const output=root.querySelector('[data-display-clock]');if(!output || !snapshot?.timer)return;
  const timer=snapshot.timer;
  if(!disconnected)lastClock=timer.running?Math.max(0,Math.ceil((timer.deadline-Date.now())/1000)):timer.remaining;
  output.textContent=`${String(Math.floor(lastClock/60)).padStart(2,'0')}:${String(lastClock%60).padStart(2,'0')}`;
  output.classList.toggle('is-expired',lastClock===0);
  root.querySelector('[data-clock-status]').textContent=disconnected?'หยุดแสดงเวลา · รอเชื่อมต่อใหม่':lastClock===0?'หมดเวลา':timer.running?'กำลังจับเวลา':'พักเวลา / รอเริ่ม';
}
function paintConnection() {
  connection.textContent=disconnected?'รอเชื่อมต่อหน้าประธาน':'เชื่อมต่อหน้าประธานแล้ว';
  connection.classList.toggle('is-connected',!disconnected);
  warning.hidden=!disconnected || !snapshot;
  if(!warning.hidden)warning.textContent='ขาดการเชื่อมต่อหน้าประธาน · ข้อมูลที่แสดงอาจไม่ใช่ข้อมูลล่าสุด กรุณากลับไปเปิดหน้าควบคุม';
}
try {
  if(!/^[a-zA-Z0-9-]{20,64}$/.test(id))throw Error('กรุณาเปิดจอนี้จากปุ่ม “เปิดจอห้องประชุม” ในหน้าประธาน');
  channel=new BroadcastChannel(`sgcu-budget-display:${id}`);
  channel.onmessage=({data})=>{
    if(data?.type==='host-away'){disconnected=true;paintConnection();paintClock();return;}
    if(data?.type!=='state' || data.snapshot?.version!==1)return;
    snapshot=data.snapshot;lastReceived=Date.now();disconnected=false;paintConnection();
    const next=JSON.stringify({...snapshot,timer:snapshot.timer?.running?{...snapshot.timer,remaining:0}:snapshot.timer});
    if(next!==signature){signature=next;render();}else paintClock();
  };
  channel.postMessage({type:'request-state'});
}catch(e){warning.hidden=false;warning.textContent=e.message;}
setInterval(()=>{if(lastReceived && Date.now()-lastReceived>10000){disconnected=true;paintConnection();}paintClock();},250);
setInterval(()=>{if(disconnected)channel?.postMessage({type:'request-state'});},3000);
fullscreen.onclick=async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
 catch(_){warning.hidden=false;warning.textContent='เปิดเต็มจอไม่สำเร็จ สามารถขยายหน้าต่างนี้ให้เต็มหน้าจอได้';}
};
document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement?'ออกจากเต็มจอ':'เต็มจอ';});

window.addEventListener('resize',()=>{if(snapshot)render();});
