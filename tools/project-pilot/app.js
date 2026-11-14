import { isCancellationStatus } from './reasons.mjs';
const $ = id => document.getElementById(id);
const money = cents => (cents / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let state;
let busy = false;
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}
async function api(path, data) {
  const response = await fetch(`/api/${path}`, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
function message(text, error = false) { $('message').textContent = text; $('message').className = error ? 'error' : ''; }
async function act(path, data, success) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button, #user').forEach(node => { node.disabled = true; });
  try { state = await api(path, data); render(); message(success); }
  catch (error) { message(error.message, true); }
  finally { busy = false; document.querySelectorAll('button, #user').forEach(node => { node.disabled = false; }); }
}
function field(form, labelText, id, kind = 'input') {
  const label = element('label', labelText); label.htmlFor = id;
  const input = element(kind); input.id = id; input.required = true;
  form.append(label, input); return input;
}
function render() {
  $('user').value = state.user.id;
  $('roleHelp').textContent = { head: 'เหรัญญิก: แก้ยอดและสถานะได้โดยตรง ตรวจคำขอจากเลขาและผู้ช่วย', secretary: 'เลขานุการ: บางสถานะบันทึกได้ทันที บางสถานะต้องให้เหรัญญิกตรวจ ยอดเงินต้องเสนอแก้', assistant: 'ผู้ช่วย: แก้เฉพาะโครงการตัวเองและช่องที่ยังไม่มีคนอื่นเคยแก้ ยกเลิกโครงการต้องเสนอให้เหรัญญิกตรวจ' }[state.user.role];
  $('export').hidden = state.user.role !== 'head';
  $('projectCount').textContent = state.projects.length;
  $('total').textContent = money(state.projects.reduce((sum, p) => sum + p.amount, 0));
  $('pendingCount').textContent = state.requests.filter(r => r.state === 'pending').length;
  $('projects').replaceChildren();
  for (const p of state.projects) {
    const card = element('article', null, 'card');
    card.append(element('p', p.id, 'meta'), element('h3', p.name), element('p', `ผู้รับผิดชอบ: ${state.users.find(u => u.id === p.assignee).name}`, 'meta'), element('p', 'ยอดอนุมัติปัจจุบัน', 'meta'), element('p', `${money(p.amount)} บาท`, 'amount'));
    card.append(element('p', `วันปฏิบัติงานสุดท้าย: ${p.lastWorkDate || 'ยังไม่ระบุ'} · กำหนดส่งสรุป: ${p.closeDueDate || 'ยังไม่ระบุ'}`, 'meta'));
    for (const group of state.statusGroups) {
      const form = element('form');
      const status = field(form, `${group.label} (${group.column})`, `status-${p.id}-${group.id}`, 'select');
      const permissions = state.statusPermissions[p.id][group.id];
      const allowed = group.values.filter(value => permissions[value] !== 'denied');
      const empty = element('option', 'ยังไม่ระบุ'); empty.value = ''; empty.disabled = true; status.append(empty);
      for (const value of group.values) { const option = element('option', value + (permissions[value] === 'review' ? ' · รอเหรัญญิกตรวจ' : '')); option.value = value; option.disabled = !allowed.includes(value); status.append(option); }
      status.value = p.statusFields[group.id]; status.disabled = !allowed.length;
      if (allowed.length) {
        const reason = field(form, 'เหตุผลเสนอเปลี่ยนสถานะ', `status-reason-${p.id}-${group.id}`, 'textarea'); reason.minLength = 3; reason.maxLength = 1000;
        const reasonLabel = reason.previousElementSibling;
        const save = element('button', `บันทึก${group.label}`); save.type = 'submit'; form.append(save);
        const syncMode = () => {
          const review = permissions[status.value] === 'review';
          reason.hidden = reasonLabel.hidden = false;
          reason.required = isCancellationStatus(group.column, status.value); reason.minLength = reason.required ? 3 : 0;
          reasonLabel.textContent = `เหตุผลเปลี่ยนสถานะ (${reason.required ? 'จำเป็นสำหรับการยกเลิก' : 'ไม่บังคับ'})`;
          save.textContent = review ? `เสนอ${group.label}ให้เหรัญญิกตรวจ` : `บันทึก${group.label}`;
        };
        status.onchange = syncMode; syncMode();
        form.onsubmit = event => {
          event.preventDefault();
          const review = permissions[status.value] === 'review';
          act('status', { projectId: p.id, version: p.version, field: group.id, status: status.value, reason: reason.value }, review ? 'ส่งคำขอสถานะแล้ว สถานะจริงยังไม่เปลี่ยน' : 'บันทึกสถานะแล้ว');
        };
      } else form.append(element('p', 'ดูได้อย่างเดียวตามสิทธิ์ที่กำหนด', 'meta'));
      const waiting = state.requests.find(r => r.projectId === p.id && r.kind === 'status' && r.field === group.id && r.state === 'pending');
      if (waiting) form.append(element('p', `รอเหรัญญิกตรวจ: ${waiting.after} — ยังไม่เปลี่ยนสถานะจริง`, 'badge'));
      card.append(form);
    }
    const pending = state.requests.some(r => r.projectId === p.id && r.kind === 'amount' && r.state === 'pending');
    if (pending) card.append(element('p', 'มีคำขอแก้ยอดรอตรวจ — ยังใช้ยอดเดิม', 'badge'));
    if (state.user.role === 'head' || (state.user.role === 'secretary' && !pending)) {
      const direct = state.user.role === 'head';
      const proposal = element('form');
      const amount = field(proposal, direct ? 'แก้ยอดอนุมัติ (บาท)' : 'เสนอยอดอนุมัติใหม่ (บาท)', `amount-${p.id}`); amount.inputMode = 'decimal'; amount.value = (p.amount / 100).toFixed(2);
      const reason = field(proposal, 'เหตุผลที่แก้ยอด', `reason-${p.id}`, 'textarea'); reason.minLength = 3; reason.maxLength = 1000;
      if (direct && pending) proposal.append(element('p', 'ถ้าแก้ยอดโดยตรง คำขอเดิมจะอนุมัติต่อไม่ได้ ต้องส่งกลับให้เสนอใหม่', 'muted'));
      const submit = element('button', direct ? 'บันทึกยอดทันที' : 'ส่งให้เหรัญญิกตรวจ', 'primary'); submit.type = 'submit'; proposal.append(submit);
      proposal.onsubmit = event => {
        event.preventDefault();
        if (direct && !confirm(`ยืนยันแก้ยอด ${p.id}\nจาก ${money(p.amount)} เป็น ${amount.value} บาท\nยอดใหม่จะมีผลทันที`)) return;
        act(direct ? 'amount' : 'propose', { projectId: p.id, version: p.version, amount: amount.value, reason: reason.value }, direct ? 'บันทึกยอดใหม่แล้ว มีผลทันที' : 'ส่งคำขอแล้ว ยอดปัจจุบันยังไม่เปลี่ยน');
      };
      card.append(proposal);
    }
    if (state.user.role === 'head') {
      const timing = element('form');
      timing.append(element('p', 'ทดลองกฎอัตโนมัติ: ใส่วันเพื่อทดสอบเกณฑ์จากหน้าภาพรวมโครงการ', 'meta'));
      const work = field(timing, 'วันปฏิบัติงานสุดท้าย (M)', `work-${p.id}`); work.type = 'date'; work.required = false; work.value = p.lastWorkDate;
      const due = field(timing, 'กำหนดส่งเอกสารสรุป (AK)', `due-${p.id}`); due.type = 'date'; due.required = false; due.value = p.closeDueDate;
      const save = element('button', 'บันทึกวันทดลอง'); save.type = 'submit'; timing.append(save);
      timing.onsubmit = e => { e.preventDefault(); act('timing', { projectId: p.id, version: p.version, lastWorkDate: work.value, closeDueDate: due.value }, 'บันทึกวันและตรวจเกณฑ์อัตโนมัติแล้ว'); };
      card.append(timing);
    }
    $('projects').append(card);
  }
  $('requests').replaceChildren();
  if (!state.requests.length) $('requests').append(element('p', 'ยังไม่มีคำขอรอตรวจ', 'muted'));
  for (const r of [...state.requests].reverse()) {
    const card = element('article', null, 'card');
    const p = state.projects.find(p => p.id === r.projectId);
    const isStatus = r.kind === 'status';
    const change = isStatus ? `${r.before || 'ยังไม่ระบุ'} → ${r.after}` : `${money(r.before)} → ${money(r.after)} บาท`;
    card.append(element('h3', r.projectId), element('p', isStatus ? r.fieldLabel : 'แก้ยอดเงิน', 'meta'), element('p', { pending: 'รอตรวจ', approved: 'อนุมัติแล้ว', rejected: 'ส่งกลับแล้ว' }[r.state], 'badge'), element('p', change, isStatus ? '' : 'amount'), element('p', `เหตุผล: ${r.reason}`), element('p', `ผู้เสนอ: ${state.users.find(u => u.id === r.proposer).name}`, 'meta'));
    if (r.reviewReason) card.append(element('p', `เหตุผลที่ส่งกลับ: ${r.reviewReason}`));
    if (r.state === 'pending' && state.user.role === 'head') {
      const stale = p.version !== r.baseVersion;
      if (stale) card.append(element('p', 'ข้อมูลโครงการเปลี่ยนแล้ว ต้องส่งกลับให้เสนอใหม่', 'muted'));
      const form = element('form');
      const reason = field(form, 'เหตุผลกรณีส่งกลับ', `review-${r.id}`, 'textarea'); reason.required = false; reason.maxLength = 1000;
      const actions = element('div', null, 'actions');
      if (!stale) {
        const approve = element('button', isStatus ? 'อนุมัติสถานะใหม่' : 'อนุมัติยอดใหม่', 'primary'); approve.type = 'button';
        approve.onclick = () => { if (confirm(`ยืนยันอนุมัติ ${r.projectId}\n${change}?`)) act('approve', { requestId: r.id, version: p.version }, isStatus ? 'อนุมัติแล้ว สถานะใหม่มีผล' : 'อนุมัติแล้ว ยอดใหม่มีผล'); };
        actions.append(approve);
      }
      const reject = element('button', 'ส่งกลับ'); reject.type = 'submit'; actions.append(reject); form.append(actions);
      form.onsubmit = event => { event.preventDefault(); act('reject', { requestId: r.id, reason: reason.value }, 'ส่งกลับแล้ว ยอดเดิมไม่เปลี่ยน'); };
      card.append(form);
    }
    $('requests').append(card);
  }
  $('audit').replaceChildren();
  const names = { timing: 'ตั้งวันทดลอง', automaticStatus: 'เปลี่ยนสถานะอัตโนมัติ', status: 'เปลี่ยนสถานะ', proposeStatus: 'เสนอเปลี่ยนสถานะ', amount: 'เหรัญญิกแก้ยอดโดยตรง', propose: 'เสนอแก้ยอด', approve: 'อนุมัติคำขอ', reject: 'ส่งกลับคำขอ' };
  for (const a of [...state.audit].reverse()) {
    const change = a.kind === 'status' ? `${a.fieldLabel}: ${a.before || 'ยังไม่ระบุ'} → ${a.after}` : a.action === 'timing' ? `${a.before} → ${a.after}` : `${money(a.before)} → ${money(a.after)} บาท`;
    $('audit').append(element('p', `${new Date(a.at).toLocaleString('th-TH')} · ${a.actor === 'system' ? 'ระบบอัตโนมัติ' : state.users.find(u => u.id === a.actor).name} · ${names[a.action]} · ${a.projectId} · ${change}${a.reason ? ` · ${a.reason}` : ''}`));
  }
  if (!state.audit.length) $('audit').append(element('p', 'ยังไม่มีการเปลี่ยนแปลง', 'muted'));
}
$('user').onchange = () => {
  const id = $('user').value;
  if (!id) { if (state) $('user').value = state.user.id; return; }
  act('session', { userId: id }, 'เปลี่ยนบัญชีทดลองแล้ว');
};
$('refresh').onclick = () => act('state', undefined, 'โหลดข้อมูลล่าสุดแล้ว');
try {
  for (const u of await api('users')) { const option = element('option', u.name); option.value = u.id; $('user').append(option); }
  try { state = await api('state'); render(); } catch { /* No session yet. */ }
} catch (error) { message(error.message, true); }
