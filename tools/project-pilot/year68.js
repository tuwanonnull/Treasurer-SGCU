const $ = id => document.getElementById(id);
const labels = { H: 'อนุมัติโครงการ', Q: 'โอนงบประมาณ', Y: 'ยืมรองจ่าย', AZ: 'ปิดโครงการ', BA: 'ฎีกา' };
const money = cents => cents === null ? '—' : (cents / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let offset = 0; let currentQuery = ''; let currentReviewer = null; let snapshot; let busy = false;
function node(tag, text, className) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; }
function previewForm(project) {
  const area = node('section'); area.append(node('h3', 'ทดลองคำนวณยอด'), node('p', 'แสดงผลก่อน–หลังเท่านั้น ไม่บันทึกหรือส่งอนุมัติ ใช้สถานะและร้อยละเดิมจากไฟล์', 'muted'));
  const form = node('form'); const inputs = {};
  for (const col of ['O', 'V', 'AJ']) {
    const label = node('label', snapshot.moneyLabels[col]);
    const input = node('input'); input.name = col; input.type = 'text'; input.inputMode = 'decimal';
    input.value = project.money[col] === null ? '' : (project.money[col] / 100).toFixed(2);
    label.append(input); form.append(label); inputs[col] = input;
  }
  const label = node('label', 'ทิศทางโอน'); const direction = node('select');
  for (const value of ['', 'เพิ่ม', 'ลด']) { const option = node('option', value || 'ยังไม่ระบุ'); option.value = value; direction.append(option); }
  direction.value = project.formulaInputs.transferDirection || ''; label.append(direction); form.append(label);
  form.append(node('p', 'ช่องว่างยังหมายถึงไม่มีข้อมูล ไม่ใช่ศูนย์ · ยอดคำนวณอาจติดลบตามสูตรเดิม', 'muted'));
  const submit = node('button', 'ดูผลคำนวณ', 'primary'); submit.type = 'submit'; form.append(submit);
  const output = node('div'); output.setAttribute('role', 'status');
  form.addEventListener('input', () => output.replaceChildren(node('p', 'ข้อมูลทดลองเปลี่ยนแล้ว กดดูผลคำนวณอีกครั้ง')));
  form.onsubmit = async event => {
    event.preventDefault(); submit.disabled = true; output.replaceChildren(node('p', 'กำลังคำนวณ…'));
    for (const input of [...Object.values(inputs), direction]) input.disabled = true;
    try {
      const changes = Object.fromEntries(Object.entries(inputs).map(([col, input]) => [col, input.value])); changes.U = direction.value;
      const result = await api('year68/preview', { projectId: project.id, changes });
      output.replaceChildren(node('p', 'ผลคำนวณทดลอง — ยังไม่บันทึก', 'preview-result'));
      for (const [col, text] of Object.entries(snapshot.moneyLabels)) output.append(node('p', `${text} (${col}): ${money(result.before[col])} → ${money(result.after[col])}${result.changedColumns.includes(col) ? ' · เปลี่ยน' : ''}`));
    } catch (error) { output.replaceChildren(node('p', error.message)); }
    finally { submit.disabled = false; for (const input of [...Object.values(inputs), direction]) input.disabled = false; }
  };
  area.append(form, output); return area;
}
async function api(path, body) {
  const response = await fetch(`/api/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
}
function render() {
  $('data').hidden = false; $('count').textContent = snapshot.totalCount;
  $('approved').textContent = money(snapshot.totals.O); $('actual').textContent = money(snapshot.totals.AJ);
  $('reviewer').replaceChildren();
  const all = node('option', 'ทุกชื่อ'); all.value = 'all'; $('reviewer').append(all);
  snapshot.reviewers.forEach((reviewer, index) => {
    const option = node('option', `${reviewer.name.trim() || 'ยังไม่ระบุชื่อ'} · ${reviewer.projectCount} โครงการ`);
    option.value = String(index); option.selected = reviewer.name === currentReviewer; $('reviewer').append(option);
  });
  const unnamed = snapshot.reviewers.filter(r => !r.name.trim()).reduce((sum, r) => sum + r.projectCount, 0);
  $('assignment-summary').textContent = `รายการชื่อที่มีข้อความ ${snapshot.reviewers.filter(r => r.name.trim()).length} รายการ · ไม่ระบุชื่อ ${unnamed} โครงการ · ยังไม่ผูกบัญชีทั้งหมด ${snapshot.totalCount} โครงการ`;
  $('results').textContent = `พบ ${snapshot.matchedCount} โครงการ · แสดงครั้งละ ${snapshot.limit} โครงการ`;
  $('list').replaceChildren();
  for (const p of snapshot.projects) {
    const detail = node('details', null, 'card');
    const summary = node('summary', `${p.code} · ${p.name}`); detail.append(summary);
    detail.append(node('p', `${p.organization} · แถว ${p.sourceRow} ในไฟล์ต้นฉบับ`, 'meta'), node('p', `ผู้ตรวจเอกสาร (AI): ${p.responsibleName || 'ยังไม่ระบุ'}`, 'meta'));
    const grid = node('div', null, 'grid');
    const amounts = node('div'); amounts.append(node('h3', 'ยอดเงิน (บาท)'));
    for (const [col, label] of Object.entries(snapshot.moneyLabels)) amounts.append(node('p', `${label} (${col}): ${money(p.money[col])}`));
    const statuses = node('div'); statuses.append(node('h3', 'สถานะตามไฟล์'));
    for (const [col, label] of Object.entries(labels)) statuses.append(node('p', `${label}: ${p.statuses[col] || '—'}`));
    grid.append(amounts, statuses); detail.append(grid);
    if (p.formulaInputs) detail.append(previewForm(p));
    $('list').append(detail);
  }
  if (!snapshot.projects.length) $('list').append(node('p', 'ไม่พบรายการที่ตรงกับคำค้น'));
  $('page').textContent = `หน้า ${Math.floor(offset / 25) + 1} / ${Math.max(1, Math.ceil(snapshot.matchedCount / 25))}`;
}
function controls() {
  $('user').disabled = busy;
  $('reviewer').disabled = busy;
  $('search').querySelector('button').disabled = busy;
  $('previous').disabled = busy || offset === 0;
  $('next').disabled = busy || !snapshot || offset + 25 >= snapshot.matchedCount;
}
async function load(userId) {
  if (busy) return;
  busy = true; controls(); $('message').textContent = 'กำลังโหลดสำเนาข้อมูล…'; $('message').className = '';
  try {
    if (userId) await api('session', { userId });
    snapshot = await api(`year68?q=${encodeURIComponent(currentQuery)}&offset=${offset}${currentReviewer === null ? '' : `&reviewer=${encodeURIComponent(currentReviewer)}`}`);
    render(); $('message').textContent = 'เปิดสำเนาข้อมูลแบบอ่านอย่างเดียวแล้ว';
  } catch (e) { $('data').hidden = true; snapshot = null; $('list').replaceChildren(); $('message').textContent = e.message; $('message').className = 'error'; }
  finally { busy = false; controls(); }
}
$('user').onchange = () => { if ($('user').value) { offset = 0; load($('user').value); } };
$('search').onsubmit = e => { e.preventDefault(); if (!busy) { offset = 0; currentQuery = $('query').value.trim(); load(); } };
$('reviewer').onchange = () => { if (!busy && snapshot) { currentReviewer = $('reviewer').value === 'all' ? null : snapshot.reviewers[Number($('reviewer').value)].name; offset = 0; load(); } };
$('previous').onclick = () => { offset = Math.max(0, offset - 25); load(); };
$('next').onclick = () => { offset += 25; load(); };
controls();
