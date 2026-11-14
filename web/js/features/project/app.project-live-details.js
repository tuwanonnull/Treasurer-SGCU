/* Read-only context from Project Status; live money/status values never come from that source. */
(function(){
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const blank=v=>v===null||v===undefined||String(v).trim()===''||String(v).trim()==='-';
const display=v=>blank(v)?'ไม่ระบุ':String(v);
const amount=v=>{if(!Number.isSafeInteger(v))return 'ไม่ระบุ';const n=BigInt(v),a=n<0n?-n:n;return `${n<0n?'-':''}${(a/100n).toLocaleString('th-TH')}.${String(a%100n).padStart(2,'0')} บาท`;};
const metadataCache=new Map();
async function metadata(year){
 const cached=metadataCache.get(year);if(cached && Date.now()-cached.at<300000)return cached.promise;
 const promise=Promise.resolve().then(()=>{if(typeof loadBorrowProjectsFromProjectStatus!=='function')throw Error('แหล่งรายละเอียดไม่พร้อม');return loadBorrowProjectsFromProjectStatus(year);});
 metadataCache.set(year,{at:Date.now(),promise});try{return await promise;}catch(e){metadataCache.delete(year);throw e;}
}
function create(project,state){
 const root=node('div',undefined,'project-live-complete-details'),year=String(project.year||2568),p=project;
 const source=node('p','ยอดเงินและสถานะจากระบบจัดการ · กำลังโหลดข้อมูลประกอบจากหน้าสถานะโครงการ…','project-live-source-note');source.hidden=true;source.setAttribute('role','status');root.append(source);
 const pending=[];
 const workbook=(grid,label,column)=>field(grid,label,`workbookDetails.${column}`,'meta');
 function field(grid,label,value,kind){const item=node('div'),dt=node('dt',label),dd=node('dd',kind==='meta'?'กำลังโหลด…':display(value));if(['ชื่อโครงการ','หมายเหตุ','ข้อความติดตามส่งปิด','ข้อความติดตามหลังแก้ไข'].includes(label))item.className='project-live-field-wide';if(kind==='status')dd.className='project-live-detail-status';if(kind==='meta')pending.push([dd,value]);item.append(dt,dd);grid.append(item);}
 function section(number,title,caption,wide=false){const el=node('section',undefined,`project-live-info-card${wide?' is-wide':''}`),head=node('header'),badge=node('span',number,`project-live-section-number modal-section-icon ${{'01':'icon-info','02':'icon-approve','03':'icon-transfer','04':'icon-advance','05':'icon-close'}[number]||'icon-info'}`),copy=node('div');copy.append(node('h3',title),node('p',caption));el.dataset.liveSection=number;head.append(badge,copy);const grid=node('dl',undefined,'project-live-detail-grid');el.append(head,grid);return {el,grid};}
 const metrics=node('div',undefined,'project-live-detail-metrics');
 for(const [col,label] of [['O','งบประมาณที่อนุมัติ'],['AJ','งบประมาณใช้จริง'],['BF','งบประมาณคงเหลือ'],['AE','จำนวนเงินยืม']]){const card=node('div');card.append(node('span',label),node('strong',amount(p.money[col])));if(p.money[col]<0)card.className='is-negative';metrics.append(card);}root.append(metrics);
 const grid=node('div',undefined,'project-live-info-layout');root.append(grid);
 const basic=section('01','ข้อมูลโครงการ','ข้อมูลพื้นฐานและหน่วยงานที่รับผิดชอบ',true);
 for(const [label,value] of [['รหัสโครงการ',p.code],['ปีการศึกษา',year],['ชื่อโครงการ',p.name],['ผู้รับผิดชอบโครงการ',p.organization],['ฝ่ายที่รับผิดชอบโครงการ',p.organizationGroup]])field(basic.grid,label,value);
 workbook(basic.grid,'ลำดับใน Excel','A');workbook(basic.grid,'ไฟล์โครงการ','D');
 const approval=section('02','อนุมัติโครงการ','มติที่ประชุม กำหนดการ และแหล่งงบประมาณ');
 field(approval.grid,'สถานะการอนุมัติ',p.statuses.H,'status');
 for(const [label,key] of [['การประชุมสภา','councilSessionText'],['วันที่อนุมัติ','approveDate'],['แหล่งงบประมาณ (กองทุน)','fundSource'],['วันปฏิบัติงานสุดท้าย','lastWorkDate']])field(approval.grid,label,key,'meta');
 for(const [label,col] of [['สมัยประชุมสภา','I'],['สมัยที่','J'],['ครั้งที่','K']])workbook(approval.grid,label,col);
 field(approval.grid,'งบประมาณที่อนุมัติ',amount(p.money.O));
 const transfer=section('03','โอนงบประมาณ','รายละเอียดการโอนและยอดเงินหลังโอน');field(transfer.grid,'สถานะการโอน',p.statuses.Q,'status');field(transfer.grid,'เลขเอกสารโอนงบประมาณ','transferDocNo','meta');field(transfer.grid,'ส่วนต่างการโอน',`${display(p.formulaInputs.transferDirection)} · ${amount(p.money.V)}`);field(transfer.grid,'ยอดโอนสุทธิ',amount(p.money.W));
 workbook(transfer.grid,'วันที่ออกใบโอนงบประมาณ','S');workbook(transfer.grid,'ไฟล์ใบโอนงบประมาณ','T');
 const advance=section('04','ยืมรองจ่าย','จำนวนเงิน เอกสาร และกำหนดคืน');field(advance.grid,'สถานะการยืม',p.statuses.Y,'status');field(advance.grid,'จำนวนเงินยืม',amount(p.money.AE));field(advance.grid,'เลขเอกสารยืมรองจ่าย','advanceDocNo','meta');field(advance.grid,'กำหนดคืน','advanceDueDate','meta');field(advance.grid,'สัดส่วนเงินยืม',blank(p.formulaInputs.advanceRate)?null:`${p.formulaInputs.advanceRate}%`);
 workbook(advance.grid,'วันที่ออกใบยืมรองจ่าย','AA');workbook(advance.grid,'ไฟล์ใบยืมรองจ่าย','AB');workbook(advance.grid,'ผู้รับผิดชอบยืมรองจ่าย','AF');
 const closure=section('05','ส่งปิดโครงการ','ผลการใช้จ่ายและความคืบหน้าการปิดโครงการ',true);
 workbook(closure.grid,'เหรัญญิกโครงการ','AH');workbook(closure.grid,'วันที่ส่งแก้ไข','AQ');workbook(closure.grid,'หมายเหตุ','AX');workbook(closure.grid,'วันที่ส่งปิดโครงการ','AY');workbook(closure.grid,'ประเภทเบิกเพิ่ม / คืนรองจ่าย','BB');
 field(closure.grid,'ผู้ตรวจเอกสาร',p.responsibleName);
 for(const [label,key] of [['วันที่ต้องส่งเอกสารสรุปโครงการ','closeDueDate'],['ระยะเวลาส่งสรุป','closeDurationText'],['เลขฎีกา','decreeNo']])field(closure.grid,label,key,'meta');
 field(closure.grid,'งบประมาณใช้จริง',amount(p.money.AJ));field(closure.grid,'งบประมาณคงเหลือ',amount(p.money.BF));
 const transferActive=['อนุมัติการโอนงบประมาณโดยเหรัญญิก','ผ่านที่ประชุมสภาใหญ่','รอนายกและประธานสภาลงนาม','ส่งกิจการนิสิตแล้ว รออนุมัติ','กระบวนการโอนงบประมาณมีผลบังคับใช้'].includes(p.statuses.Q);
 const budget=transferActive?p.money.W:p.money.O;
 field(closure.grid,'สัดส่วนการใช้งบ',Number.isSafeInteger(p.money.AJ)&&Number.isSafeInteger(budget)&&budget>0?`${(p.money.AJ/budget*100).toFixed(2)}%`:null);
 workbook(closure.grid,'สถานะสรุปยืมรองจ่ายจากต้นทาง (BJ)','BJ');workbook(closure.grid,'สถานะสรุปฎีกาจากต้นทาง (BK)','BK');
 field(closure.grid,'สถานะปิดโครงการ (อบจ.)',p.statuses.AZ,'status');field(closure.grid,'สถานะฎีกา (กิจการนิสิต)',p.statuses.BA,'status');
 for(const col of ['BC','BE'])if(Object.hasOwn(p.money,col))field(closure.grid,state.moneyLabels[col]||col,amount(p.money[col]));
 // Preserve any additional status field exposed by the live service.
 for(const g of state.statusGroups)if(!['H','Q','Y','AZ','BA'].includes(g.column))field(basic.grid,g.label,p.statuses[g.column],'status');
 const follow=section('06','การติดตามเอกสาร','ประวัติจากตารางสถานะ แยกก่อนส่งปิดและหลังส่งแก้ไข',true);
 for(const [label,cols] of [['ติดตามส่งปิดโครงการ',['AL','AM','AN','AO']],['ติดตามหลังส่งแก้ไข',['AR','AS','AT','AU']]])cols.forEach((col,i)=>workbook(follow.grid,`${label} ครั้งที่ ${i+1}`,col));
 for(const [label,col] of [['ข้อความติดตามส่งปิด','AP'],['ข้อความติดตามหลังส่งแก้ไข','AV'],['ระยะเวลาที่เหลือ (ค่าจากต้นทาง)','AW']])workbook(follow.grid,label,col);
 // Keep related values together instead of scanning one undifferentiated grid.
 for(const [card,groups] of [
  [basic,[['ข้อมูลหลัก',['รหัสโครงการ','ปีการศึกษา','ชื่อโครงการ','ลำดับใน Excel']],['หน่วยงานและเอกสาร',[]]]],
  [approval,[['ผลการอนุมัติ',['สถานะการอนุมัติ','งบประมาณที่อนุมัติ','วันที่อนุมัติ','แหล่งงบประมาณ (กองทุน)']],['มติและกำหนดการ',[]]]],
  [transfer,[['สถานะและยอดเงิน',['สถานะการโอน','ส่วนต่างการโอน','ยอดโอนสุทธิ']],['เอกสารประกอบ',[]]]],
  [advance,[['สถานะและยอดเงิน',['สถานะการยืม','จำนวนเงินยืม','สัดส่วนเงินยืม']],['เอกสารและการคืนเงิน',[]]]],
  [closure,[['สถานะและกำหนดส่ง',['สถานะปิดโครงการ (อบจ.)','สถานะฎีกา (กิจการนิสิต)','วันที่ส่งปิดโครงการ','วันที่ต้องส่งเอกสารสรุปโครงการ','วันที่ส่งแก้ไข','ระยะเวลาส่งสรุป']],['สรุปการใช้เงิน',['งบประมาณใช้จริง','งบประมาณคงเหลือ','สัดส่วนการใช้งบ','ประเภทเบิกเพิ่ม / คืนรองจ่าย',state.moneyLabels.BC,state.moneyLabels.BE]],['ผู้รับผิดชอบและข้อมูลประกอบ',[]]]],
  [follow,[['ก่อนส่งปิดโครงการ',['ติดตามส่งปิดโครงการ ครั้งที่ 1','ติดตามส่งปิดโครงการ ครั้งที่ 2','ติดตามส่งปิดโครงการ ครั้งที่ 3','ติดตามส่งปิดโครงการ ครั้งที่ 4','ข้อความติดตามส่งปิด']],['หลังส่งแก้ไข',[]]]]
 ]){const container=node('div',undefined,'project-live-detail-grid project-live-detail-groups');const fields=[...card.grid.children];for(const [title,labels] of groups){const group=node('section',undefined,'project-live-field-group'),list=node('dl',undefined,'project-live-field-list');group.append(node('h4',title),list);for(const item of fields){if(item.parentElement===card.grid&&(!labels.length||labels.includes(item.querySelector('dt').textContent)))list.append(item);}if(list.children.length)container.append(group);}const paired=[...container.children].slice(0,2);const rows=Math.max(...paired.map(group=>group.querySelector('dl').children.length));container.style.setProperty('--record-rows',rows);container.style.setProperty('--record-span',rows+1);paired.forEach(group=>group.classList.add('project-live-paired-group'));card.grid.replaceWith(container);}
 grid.append(basic.el,approval.el,transfer.el,advance.el,closure.el,follow.el);
 const retry=node('button','ลองโหลดรายละเอียดอีกครั้ง','btn-ghost');retry.type='button';retry.hidden=true;root.append(retry);
 async function load(){retry.hidden=true;source.hidden=true;source.textContent='ยอดเงินและสถานะจากระบบจัดการ · กำลังโหลดข้อมูลประกอบจากหน้าสถานะโครงการ…';try{
  const rows=await metadata(year);const matches=rows.filter(row=>String(row.year)===year && String(row.code).trim()===String(p.code).trim());
  if(matches.length!==1)throw Error('ไม่พบรหัสโครงการที่ตรงกันเพียงรายการเดียว');
  const details=matches[0];for(const [el,key] of pending){let value=key.startsWith('workbookDetails.')?details.workbookDetails?.[key.split('.')[1]]:details[key];if(key==='closeDurationText'&&!blank(value)&&/^-?\d+(\.\d+)?$/.test(String(value).trim()))value=`${value} วัน`;if(/^workbookDetails\.(AL|AM|AN|AO|AR|AS|AT|AU)$/.test(key)){if(String(value).toUpperCase()==='TRUE')value='ติดตามแล้ว';if(String(value).toUpperCase()==='FALSE')value='ยังไม่ติดตาม';}
   el.textContent=display(value);
   if(['workbookDetails.D','workbookDetails.T','workbookDetails.AB'].includes(key) && !blank(value)){try{const url=new URL(String(value));if(['https:','http:'].includes(url.protocol)){const link=node('a','เปิดไฟล์เอกสาร','project-live-file-link');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';el.replaceChildren(link);}}catch{}}
}
  source.textContent='ยอดเงินและสถานะจากระบบจัดการ · วันกำหนดการและเลขเอกสารอ้างอิงจากหน้าสถานะโครงการ';
 }catch{source.hidden=false;for(const [el] of pending)el.textContent='ยังโหลดข้อมูลไม่ได้';source.textContent='โหลดข้อมูลประกอบจากหน้าสถานะโครงการไม่ได้ ยอดเงินและสถานะจากระบบจัดการยังแสดงได้ตามปกติ';retry.hidden=false;}}
 retry.onclick=()=>{metadataCache.delete(year);void load();};void load();return root;
}
window.sgcuProjectLiveDetails={create};
})();
