import { isCancellationStatus } from './reasons.mjs';
const $ = id => document.getElementById(id);
const node = (tag, text, className) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; };
const money = cents => cents === null ? '—' : (cents / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let state, offset = 0, query = '', busy = false;
const authenticatedTrial = document.body.dataset.authMode === 'emulator';
async function api(route, body) {
  const response = await fetch(`/api/${route}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) {
    if (authenticatedTrial && [401, 403].includes(response.status)) {
      $('data').hidden = true; $('login-panel').hidden = false;
    }
    throw new Error(result.error);
  }
  return result;
}
function lock(value) {
  busy = value;
  for (const el of document.querySelectorAll('button,input,select,textarea')) el.disabled = value;
  if (!value) {
    $('restore').disabled = !$('backup').value;
    $('previous').disabled = !state || offset === 0;
    $('next').disabled = !state || offset + 25 >= state.matchedCount;
    for (const el of document.querySelectorAll('[data-stale]')) el.disabled = true;
    for (const el of document.querySelectorAll('[data-needs-preview]')) el.disabled = true;
    for (const el of document.querySelectorAll('[data-no-target]')) el.disabled = true;
  }
}
async function refresh() {
  state = await api(`year68/trial?q=${encodeURIComponent(query)}&offset=${offset}`); render();
}
async function operation(task, message) {
  if (busy) return; lock(true); $('message').textContent = 'กำลังดำเนินการ…'; $('message').className = '';
  try { await task(); $('message').textContent = message; }
  catch (error) { $('message').textContent = error.message; $('message').className = 'error'; }
  finally { lock(false); }
}
function comparison(before, after, beforeDirection, afterDirection) {
  const box = node('div', null, 'comparison');
  for (const [col, label] of Object.entries(state.moneyLabels)) box.append(node('p', `${label} (${col}): ${money(before[col])} → ${money(after[col])}`));
  if (beforeDirection !== undefined) box.append(node('p', `ทิศทางโอน: ${beforeDirection || '—'} → ${afterDirection || '—'}`));
  return box;
}
function statusComparison(before, after) {
  const box = node('div');
  if (before && after) for (const group of state.statusGroups) {
    if (before[group.column] !== after[group.column]) box.append(node('p', `${group.label}: ${before[group.column] || '—'} → ${after[group.column] || '—'}`));
  }
  return box;
}
function statusFormFor(p) {
  const permissions = state.projectStatusPermissions[p.id];
  const availableGroups = state.statusGroups.map(group => ({ ...group,
    values: group.values.filter(value => value !== p.statuses[group.column] && ['direct', 'review'].includes(permissions[group.column]?.[value]))
  })).filter(group => group.values.length);
  if (!availableGroups.length) return node('p', 'ขณะนี้คุณไม่มีสถานะที่แก้ไขได้ในโครงการนี้', 'muted');
  const form = node('form'); form.append(node('h3', 'เปลี่ยนสถานะในชุดทดลอง'));
  const groupLabel = node('label', 'ช่องสถานะ'); const groupSelect = node('select');
  groupSelect.setAttribute('aria-label', 'ช่องสถานะ');
  for (const g of availableGroups) { const o = node('option', `${g.column} · ${g.label}`); o.value = g.column; groupSelect.append(o); }
  groupLabel.append(groupSelect);
  const statusLabel = node('label', 'สถานะใหม่'); const statusSelect = node('select'); statusLabel.append(statusSelect);
  statusSelect.setAttribute('aria-label', 'สถานะใหม่');
  const current = node('p', null, 'muted');
  const reasonLabel = node('label', 'เหตุผลเปลี่ยนสถานะ'); const reason = node('textarea'); reason.maxLength = 1000; reasonLabel.append(reason);
  reason.setAttribute('aria-label', 'เหตุผลเปลี่ยนสถานะ');
  const preview = node('button', 'ดูผลจากสถานะ'); preview.type = 'button';
  const submit = node('button', 'บันทึกสถานะในชุดทดลอง', 'primary'); submit.type = 'submit'; submit.dataset.needsPreview = 'true';
  const output = node('div'); output.setAttribute('role', 'status');
  const actions = node('div', null, 'actions'); actions.append(preview, submit);
  form.append(groupLabel, current, statusLabel, reasonLabel, actions, output);
  let reviewed = null;
  const invalidate = () => { reviewed = null; submit.dataset.needsPreview = 'true'; submit.disabled = true; output.replaceChildren(); };
  const mode = () => permissions[groupSelect.value]?.[statusSelect.value];
  const buttonLabel = () => {
    submit.textContent = mode() === 'review' ? 'เสนอเปลี่ยนสถานะให้เหรัญญิกตรวจ' : 'บันทึกสถานะในชุดทดลอง';
    reason.required = isCancellationStatus(groupSelect.value, statusSelect.value); reason.minLength = reason.required ? 3 : 0;
    reasonLabel.firstChild.textContent = `เหตุผลเปลี่ยนสถานะ (${reason.required ? 'จำเป็นสำหรับการยกเลิก' : 'ไม่บังคับ'})`;
  };
  function options() {
    invalidate(); statusSelect.replaceChildren(); const g = availableGroups.find(g => g.column === groupSelect.value);
    current.textContent = `สถานะปัจจุบัน: ${p.statuses[g.column] || '—'}`;
    for (const value of g.values) {
      const permission = permissions[g.column][value];
      const option = node('option', `${value}${permission === 'review' ? ' (รอเหรัญญิกตรวจ)' : ''}`); option.value = value; statusSelect.append(option);
    }
    buttonLabel();
  }
  options(); groupSelect.onchange = options;
  statusSelect.onchange = buttonLabel; form.addEventListener('input', invalidate);
  const patch = () => ({ projectId: p.id, version: p.version, field: groupSelect.value, value: statusSelect.value });
  preview.onclick = () => operation(async () => {
    const body = patch(); const result = await api('year68/trial/status-preview', body);
    output.replaceChildren(node('p', 'ผลสถานะและยอดก่อนบันทึก'), statusComparison(result.beforeStatuses, result.afterStatuses), comparison(result.before, result.after));
    reviewed = JSON.stringify(body); delete submit.dataset.needsPreview;
  }, 'ตรวจสถานะและผลต่อยอดเงินก่อนยืนยัน');
  form.onsubmit = event => { event.preventDefault(); if (!reviewed || reviewed !== JSON.stringify(patch())) return;
    const review = mode() === 'review';
    operation(async () => { await api('year68/trial/status', { ...patch(), reason: reason.value }); await refresh(); }, review ? 'เสนอเปลี่ยนสถานะแล้ว สถานะและยอดยังไม่เปลี่ยนจนเหรัญญิกอนุมัติ' : 'บันทึกสถานะและยอดที่เกี่ยวข้องแล้ว');
  };
  return form;
}
function formFor(p) {
  const form = node('form'); const inputs = {};
  for (const col of ['O', 'V', 'AJ']) {
    const label = node('label', state.moneyLabels[col]); const input = node('input'); input.name = col; input.inputMode = 'decimal';
    input.value = p.money[col] === null ? '' : (p.money[col] / 100).toFixed(2); inputs[col] = input; label.append(input); form.append(label);
  }
  const label = node('label', 'ทิศทางโอน'); const direction = node('select');
  direction.setAttribute('aria-label', 'ทิศทางโอน');
  for (const value of ['', 'เพิ่ม', 'ลด']) { const o = node('option', value || 'ยังไม่ระบุ'); o.value = value; direction.append(o); }
  direction.value = p.formulaInputs.transferDirection || ''; label.append(direction); form.append(label);
  const reasonLabel = node('label', 'เหตุผล (จำเป็น)'); const reason = node('textarea'); reason.setAttribute('aria-label', 'เหตุผล'); reason.required = true; reason.minLength = 3; reason.maxLength = 1000; reasonLabel.append(reason); form.append(reasonLabel);
  const preview = node('button', 'ดูผลก่อนบันทึก'); preview.type = 'button';
  const submit = node('button', state.user.role === 'head' ? 'บันทึกในชุดทดลอง' : 'เสนอให้เหรัญญิกตรวจ', 'primary'); submit.type = 'submit'; submit.dataset.needsPreview = 'true';
  const result = node('div'); result.setAttribute('role', 'status');
  const actions = node('div', null, 'actions'); actions.append(preview, submit); form.append(actions, result);
  const changes = () => ({ ...Object.fromEntries(Object.entries(inputs).map(([col, input]) => [col, input.value])), U: direction.value });
  let reviewed = null;
  form.addEventListener('input', () => { reviewed = null; submit.dataset.needsPreview = 'true'; submit.disabled = true; result.replaceChildren(); });
  preview.onclick = () => operation(async () => {
    const patch = changes(); const output = await api('year68/trial/preview', { projectId: p.id, version: p.version, changes: patch });
    result.replaceChildren(node('p', 'ผลคำนวณก่อนบันทึก'), comparison(output.before, output.after, p.formulaInputs.transferDirection, patch.U));
    reviewed = JSON.stringify(patch); delete submit.dataset.needsPreview;
  }, 'ตรวจยอดก่อน–หลังและเหตุผล แล้วกดบันทึกหรือเสนอ');
  form.onsubmit = event => { event.preventDefault();
    if (!reviewed || reviewed !== JSON.stringify(changes())) return;
    operation(async () => {
      await api(`year68/trial/${state.user.role === 'head' ? 'commit' : 'propose'}`, { projectId: p.id, version: p.version, changes: changes(), reason: reason.value });
      await refresh();
    }, state.user.role === 'head' ? 'บันทึกยอดและผลคำนวณในชุดทดลองแล้ว' : 'ส่งคำขอแล้ว ยอดชุดทดลองยังไม่เปลี่ยนจนเหรัญญิกอนุมัติ');
  };
  return form;
}
const assigneeName = id => state?.assistantAccounts?.find(user => user.id === id)?.name || (id && state?.user?.id === id ? state.user.name : null) || ({ assistantA: 'ผู้ช่วย A (ทดลอง)', assistantB: 'ผู้ช่วย B (ทดลอง)' })[id] || (id ? 'ผู้ช่วยที่ได้รับมอบหมาย' : 'ยังไม่มอบหมาย');
function assignmentForm(p) {
  const form = node('form'); form.append(node('h3', 'มอบหมายผู้ช่วยจำลอง'), node('p', 'ใช้สถานะจากปี 68 เป็นค่าตั้งต้นของการจำลอง ประวัติที่ใช้ล็อกสิทธิ์นับจากการแก้ในชุดทดลองนี้เท่านั้น การเปลี่ยนผู้รับผิดชอบไม่ล้างประวัติ และไม่ผูกกับชื่อจริงใน AI', 'muted'));
  const label = node('label', 'ผู้ช่วยจำลอง'); const select = node('select'); select.setAttribute('aria-label', 'ผู้ช่วยจำลอง');
  const empty = node('option', 'ยังไม่มอบหมาย'); empty.value = ''; select.append(empty);
  for (const user of state.assistantAccounts) { const option = node('option', user.name); option.value = user.id; select.append(option); }
  select.value = p.trialAssignee || ''; label.append(select);
  const reasonLabel = node('label', 'เหตุผลมอบหมาย (ไม่บังคับ)'); const reason = node('textarea'); reason.setAttribute('aria-label', 'เหตุผลมอบหมาย'); reason.maxLength = 1000; reasonLabel.append(reason);
  const submit = node('button', 'บันทึกผู้รับผิดชอบจำลอง'); submit.type = 'submit'; form.append(label, reasonLabel, submit);
  form.onsubmit = event => { event.preventDefault(); operation(async () => {
    await api('year68/trial/assign', { projectId: p.id, version: p.version, assignee: select.value || null, reason: reason.value }); await refresh();
  }, 'มอบหมายผู้ช่วยจำลองแล้ว คำขอที่อ้างรุ่นเดิมต้องตรวจใหม่'); };
  return form;
}
function render() {
  const staffReview = $('staff-review');
  if (staffReview) {
    staffReview.hidden = state.user.role !== 'head';
    document.dispatchEvent(new Event('project-view-refreshed'));
  }
  const backupStatus = $('automatic-backup-status');
  if (backupStatus) {
    const backup = state.automaticBackup;
    backupStatus.className = backup?.failed || backup?.overdue ? 'error' : '';
    const last = backup?.backupAt ? new Date(backup.backupAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : 'ยังไม่มี';
    backupStatus.textContent = !backup?.enabled ? 'ยังไม่เปิดสำรองอัตโนมัติ' :
      `${backup.failed ? 'สำรองครั้งล่าสุดไม่สำเร็จ · ' : ''}${backup.overdue ? 'ยังไม่มีชุดสำรองในเครื่องที่ใหม่กว่า 24 ชั่วโมง · ' : ''}สำรองในเครื่องทุก 12 ชั่วโมงขณะเว็บทดลองเปิดอยู่ · ข้อมูลสำรองล่าสุด: ${last} · ยังไม่ส่งขึ้น Google Drive อัตโนมัติ · สถานะ ณ เวลาโหลดหน้านี้`;
  }
  $('user').value = state.user.id;
  $('storage-notice').textContent = state.storage === 'firestore-emulator' ? 'ชุดทดลองจากปี 68 • บันทึกใน Firestore Emulator • รีสตาร์ตเว็บข้อมูลยังอยู่ • ปิด Emulator ต้องส่งออกข้อมูลก่อน' : state.persistence?.enabled ? 'ชุดทดลองจากปี 68 • บันทึกลงไฟล์ในเครื่องแล้ว • รีสตาร์ตข้อมูลยังอยู่ • ไม่ใช่ข้อมูลจริง' : 'ชุดทดลองจากปี 68 • บันทึกในหน่วยความจำเท่านั้น • รีสตาร์ตแล้วเริ่มใหม่ • ไม่ใช่ข้อมูลจริง';
  $('recovery').hidden = !state.persistence?.enabled || state.user.role !== 'head';
  $('backup').replaceChildren();
  for (const item of state.persistence?.backups || []) {
    const option = node('option', `${new Date(item.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · ${item.id.slice(-13, -5)}`); option.value = item.id; $('backup').append(option);
  }
  $('data').hidden = false; $('count').textContent = state.totalCount;
  $('trial-scope').textContent = state.user.role === 'assistant' ? 'แสดงเฉพาะโครงการ คำขอ ประวัติ และยอดรวมที่มอบหมายให้บัญชีจำลองนี้ ผู้ช่วยแก้ยอดเงินไม่ได้ และแก้ตรงไม่ได้เมื่อคนอื่นเคยแก้ช่องสถานะนั้นในชุดทดลอง' : 'เหรัญญิกมอบหมายโครงการให้ผู้ช่วย A/B เพื่อทดลองได้ โดยไม่ผูกบัญชีจริงกับชื่อใน AI';
  $('approved').textContent = money(state.totals.O); $('actual').textContent = money(state.totals.AJ);
  $('requests').replaceChildren();
  const pending = state.requests.filter(r => r.state === 'pending');
  if (!pending.length) $('requests').append(node('p', 'ไม่มีคำขอรอตรวจ'));
  for (const r of pending) {
    const card = node('article', null, 'card'); card.append(node('h3', `${r.code} · ${r.name}`), node('p', `เหตุผล: ${r.reason || '—'}`));
    if (r.kind === 'status') card.append(node('p', 'คำขอเปลี่ยนสถานะ'), statusComparison(r.beforeStatuses, r.afterStatuses));
    card.append(comparison(r.before, r.after, r.beforeDirection, r.afterDirection));
    if (r.stale) card.append(node('p', 'ข้อมูลเปลี่ยนหลังเสนอ ต้องส่งกลับแล้วเสนอใหม่'));
    if (state.user.role === 'head') {
      const approve = node('button', 'อนุมัติคำขอในชุดทดลอง', 'primary'); approve.type = 'button';
      if (r.stale) approve.dataset.stale = 'true';
      approve.onclick = () => operation(async () => { await api('year68/trial/approve', { requestId: r.id, version: r.baseVersion }); await refresh(); }, 'อนุมัติและคำนวณยอดที่เกี่ยวข้องแล้ว');
      const label = node('label', 'เหตุผลส่งกลับ'); const reason = node('textarea'); label.append(reason);
      const reject = node('button', 'ส่งกลับคำขอ'); reject.type = 'button';
      reject.onclick = () => operation(async () => { await api('year68/trial/reject', { requestId: r.id, reason: reason.value }); await refresh(); }, 'ส่งกลับคำขอแล้ว ยอดชุดทดลองไม่เปลี่ยน');
      card.append(approve, label, reject);
    }
    $('requests').append(card);
  }
  $('results').textContent = `พบ ${state.matchedCount} โครงการ · แสดงครั้งละ 25 โครงการ`;
  $('list').replaceChildren();
  for (const p of state.projects) {
    const card = node('details', null, 'card'); card.append(node('summary', `${p.code} · ${p.name}`));
    card.append(node('p', 'ยอดปัจจุบันในชุดทดลอง', 'meta'));
    for (const [col, label] of Object.entries(state.moneyLabels)) card.append(node('p', `${label} (${col}): ${money(p.money[col])}`));
    for (const g of state.statusGroups) card.append(node('p', `${g.label}: ${p.statuses[g.column] || '—'}`, 'meta'));
    card.append(node('p', `ผู้รับผิดชอบจำลอง: ${assigneeName(p.trialAssignee)}`, 'meta'));
    if (state.user.role !== 'assistant') card.append(formFor(p));
    card.append(statusFormFor(p));
    if (state.user.role === 'head') card.append(assignmentForm(p));
    $('list').append(card);
  }
  if (!state.projects.length) $('list').append(node('p', state.user.role === 'assistant' && !state.totalCount ? 'ยังไม่มีโครงการที่มอบหมายให้บัญชีนี้ ให้เหรัญญิกมอบหมายผู้ช่วยจำลองก่อน' : 'ไม่พบโครงการ'));
  $('page').textContent = `หน้า ${Math.floor(offset / 25) + 1} / ${Math.max(1, Math.ceil(state.matchedCount / 25))}`;
  renderAudit();
  $('reset').hidden = authenticatedTrial || state.user.role !== 'head';
  $('portable-backup').hidden = state.user.role !== 'head';
}
function renderAudit() {
  $('audit').replaceChildren();
  if (state.auditLoaded === false) {
    const button = node('button', 'ดูประวัติ'); button.type = 'button';
    button.onclick = () => operation(async () => {
      const result = await api('year68/trial/history'); state.audit = result.audit; state.auditLoaded = true; renderAudit();
    }, 'โหลดประวัติล่าสุดแล้ว');
    $('audit').append(node('p', 'กดเพื่อดูประวัติ 50 รายการล่าสุด'), button); return;
  }
  const labels = { assign: 'มอบหมายผู้ช่วยจำลอง', propose: 'เสนอแก้ยอด', proposeStatus: 'เสนอเปลี่ยนสถานะ', status: 'เปลี่ยนสถานะ', commit: 'บันทึกตรง', approve: 'อนุมัติคำขอ', reject: 'ส่งกลับคำขอ', restore: 'กู้คืนชุดทดลอง' };
  for (const a of state.audit.slice(-50).reverse()) {
    const detail = node('details', null, 'card');
    detail.append(node('summary', `${a.code} · ${labels[a.action]} · ${a.actorName}`), node('p', new Date(a.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })), node('p', a.reason));
    detail.append(statusComparison(a.beforeStatuses, a.afterStatuses));
    if (a.action === 'assign') detail.append(node('p', `${assigneeName(a.beforeAssignee)} → ${assigneeName(a.afterAssignee)}`));
    if (a.before && a.after) detail.append(comparison(a.before, a.after, a.beforeDirection, a.afterDirection)); $('audit').append(detail);
  }
  if (!state.audit.length) $('audit').append(node('p', 'ยังไม่มีประวัติ'));
}
$('user').onchange = () => {
  const userId = $('user').value; if (!userId) { state = null; $('data').hidden = true; return; }
  operation(async () => { $('data').hidden = true; state = null; await api('session', { userId }); offset = 0; await refresh(); }, 'เปิดชุดทดลองแล้ว');
};
$('refresh').onclick = () => operation(refresh, 'โหลดข้อมูลล่าสุดแล้ว');
$('search').onsubmit = event => { event.preventDefault(); operation(async () => { offset = 0; query = $('query').value.trim(); await refresh(); }, 'โหลดผลค้นหาแล้ว'); };
$('previous').onclick = () => operation(async () => { offset = Math.max(0, offset - 25); await refresh(); }, 'โหลดหน้าแล้ว');
$('next').onclick = () => operation(async () => { offset += 25; await refresh(); }, 'โหลดหน้าแล้ว');
$('reset').onclick = () => { if (state && confirm('ล้างยอดทดลอง คำขอ และประวัติทั้งหมดในชุดนี้ แล้วเริ่มจากสำเนาปี 68 เดิม?')) operation(async () => { await api('year68/trial/reset', { revision: state.revision }); await refresh(); }, 'เริ่มชุดทดลองใหม่แล้ว'); };
$('restore').onclick = () => { const backupId = $('backup').value; if (state && backupId && confirm('แทนที่ชุดทดลองปัจจุบันด้วยชุดสำรองที่เลือก? ระบบจะสำรองชุดปัจจุบันก่อนกู้คืน')) operation(async () => { await api('year68/trial/restore', { backupId, revision: state.revision }); await refresh(); }, 'กู้คืนชุดทดลองแล้ว'); };
$('download-backup').onclick = () => operation(async () => {
  const response = await fetch('/api/year68/trial/backup');
  if (!response.ok) { const error = await response.json(); throw new Error(error.error); }
  const url = URL.createObjectURL(await response.blob());
  const link = node('a'); link.href = url; link.download = authenticatedTrial ? 'sgcu-firestore-trial-backup.json' : 'sgcu-year68-trial-backup.json'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}, 'เริ่มดาวน์โหลดชุดสำรองแล้ว นำไฟล์ไปเก็บแยกจากเครื่องนี้ได้');
lock(false);
