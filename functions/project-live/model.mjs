import { randomUUID } from 'node:crypto';
import { STATUS_GROUPS, STATUS_DEFAULTS, statusMode } from './statuses.mjs';
import { automaticStatusChanges, calendarDay } from './automation.mjs';
import { validateReason as reasonFor, isCancellationStatus } from './reasons.mjs';

export const USERS = Object.freeze({
  head: { id: 'head', role: 'head', name: 'เหรัญญิก (ทดลอง)' },
  secretary: { id: 'secretary', role: 'secretary', name: 'เลขานุการ (ทดลอง)' },
  assistantA: { id: 'assistantA', role: 'assistant', name: 'ผู้ช่วย A (ทดลอง)' },
  assistantB: { id: 'assistantB', role: 'assistant', name: 'ผู้ช่วย B (ทดลอง)' }
});
export const STATUSES = STATUS_GROUPS.find(g => g.id === 'closure').values;
export class PilotError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function requireThat(condition, status, message) {
  if (!condition) throw new PilotError(status, message);
}
export function parseMoney(value) {
  requireThat(typeof value === 'string' && /^\d{1,9}(?:\.\d{1,2})?$/.test(value.trim()), 400, 'กรอกยอดตั้งแต่ 0 ถึง 999,999,999.99 บาท ทศนิยมไม่เกิน 2 ตำแหน่ง');
  const [whole, decimal = ''] = value.trim().split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
}
export function createModel({ now = () => Date.now(), rehearsalProjects = null } = {}) {
  const projects = rehearsalProjects === null ? [
    { id: 'DEMO-68-001', year: 2568, name: 'โครงการกิจกรรมนิสิต (ข้อมูลจำลอง)', assignee: 'assistantA', amount: 1000000, status: STATUSES[0], version: 1 },
    { id: 'DEMO-68-002', year: 2568, name: 'โครงการพัฒนาทักษะ (ข้อมูลจำลอง)', assignee: 'assistantB', amount: 2500000, status: STATUSES[1], version: 1 }
  ] : structuredClone(rehearsalProjects);
  if (rehearsalProjects !== null) {
    requireThat(Array.isArray(projects) && projects.length > 0, 400, 'ชุดซ้อมต้องมีโครงการ');
    const ids = new Set();
    for (const p of projects) {
      requireThat(typeof p.id === 'string' && p.id.startsWith('TEST68:') && !ids.has(p.id), 400, 'รหัสชุดซ้อมไม่ถูกต้อง');
      ids.add(p.id);
      requireThat(Number.isSafeInteger(p.amount) && p.amount >= 0 && p.amount <= 99999999999, 400, 'ยอดชุดซ้อมไม่ถูกต้อง');
      requireThat(['assistantA', 'assistantB'].includes(p.assignee), 400, 'ชุดซ้อมใช้เฉพาะผู้ช่วยจำลอง');
      for (const g of STATUS_GROUPS) requireThat(p.statusFields?.[g.id] === '' || g.values.includes(p.statusFields?.[g.id]), 400, 'สถานะชุดซ้อมไม่ถูกต้อง');
    }
  }
  const requests = [];
  for (const p of projects) {
    p.statusFields = rehearsalProjects === null ? { ...STATUS_DEFAULTS } : p.statusFields;
    p.status = p.statusFields.closure; p.version = 1;
    // Imported snapshots contain no editor history. Do not invent an empty history granting assistant rights.
    p.statusEditors = Object.fromEntries(STATUS_GROUPS.map(g => [g.id, rehearsalProjects === null ? [] : ['historical-unknown']]));
    p.lastWorkDate = ''; p.closeDueDate = '';
  }
  const audit = [];
  function log(actor, action, projectId, details) {
    audit.push({ id: randomUUID(), at: new Date(now()).toISOString(), actor: actor.id, action, projectId, ...details });
  }
  function actorFor(id) {
    requireThat(Object.hasOwn(USERS, id ?? ''), 401, 'เลือกบัญชีทดลองก่อน');
    return USERS[id];
  }
  function projectFor(id) {
    const project = projects.find(p => p.id === id);
    requireThat(project, 404, 'ไม่พบโครงการ');
    return project;
  }
  function current(project, version) {
    requireThat(project.version === version, 409, 'ข้อมูลเปลี่ยนแล้ว กรุณารีเฟรชและตรวจข้อมูลล่าสุด');
  }
  function setStatus(p, group, value, user) {
    p.statusFields[group.id] = value;
    if (group.id === 'closure') p.status = value;
    if (!p.statusEditors[group.id].includes(user.id)) p.statusEditors[group.id].push(user.id);
    p.version++;
  }
  function runAutomation() {
    if (rehearsalProjects !== null) return;
    for (const p of projects) {
      for (const change of automaticStatusChanges(p, now())) {
        const group = STATUS_GROUPS.find(g => g.id === change.field);
        const before = p.statusFields[group.id];
        const system = { id: 'system' };
        setStatus(p, group, change.value, system);
        log(system, 'automaticStatus', p.id, { kind: 'status', field: group.id, fieldLabel: group.label, before, after: change.value, reason: change.reason });
      }
    }
  }
  return {
    runAutomation,
    snapshot(id) {
      const user = actorFor(id);
      runAutomation();
      const visible = projects.filter(p => user.role !== 'assistant' || p.assignee === user.id);
      const ids = new Set(visible.map(p => p.id));
      return structuredClone({ user, users: Object.values(USERS), statuses: STATUSES, projects: visible,
        statusGroups: STATUS_GROUPS, statusPermissions: Object.fromEntries(visible.map(p => [p.id,
          Object.fromEntries(STATUS_GROUPS.map(g => [g.id, Object.fromEntries(g.values.map(value => [value, statusMode(user, g, value, p.statusEditors[g.id])]))]))])),
        requests: requests.filter(r => ids.has(r.projectId)), audit: audit.filter(a => ids.has(a.projectId)) });
    },
    mutate(id, action, body) {
      const user = actorFor(id);
      runAutomation();
      requireThat(body && typeof body === 'object' && !Array.isArray(body), 400, 'ข้อมูลคำขอไม่ถูกต้อง');
      const allowed = {
        status: ['projectId', 'version', 'status', 'field', 'reason'], propose: ['projectId', 'version', 'amount', 'reason'],
        amount: ['projectId', 'version', 'amount', 'reason'],
        timing: ['projectId', 'version', 'lastWorkDate', 'closeDueDate'],
        approve: ['requestId', 'version'], reject: ['requestId', 'reason']
      }[action];
      requireThat(allowed && Object.keys(body).every(k => allowed.includes(k)), 400, 'คำขอมีช่องข้อมูลที่ไม่อนุญาต');
      if (action === 'timing') {
        requireThat(user.role === 'head', 403, 'เฉพาะเหรัญญิกกำหนดวันทดลอง');
        const p = projectFor(body.projectId);
        current(p, body.version);
        for (const key of ['lastWorkDate', 'closeDueDate']) requireThat(body[key] === '' || calendarDay(body[key]) !== null, 400, 'วันที่ไม่ถูกต้อง');
        const before = `${p.lastWorkDate || '-'} / ${p.closeDueDate || '-'}`;
        p.lastWorkDate = body.lastWorkDate; p.closeDueDate = body.closeDueDate; p.version++;
        log(user, 'timing', p.id, { before, after: `${p.lastWorkDate || '-'} / ${p.closeDueDate || '-'}` });
      } else if (action === 'status') {
        const p = projectFor(body.projectId);
        requireThat(user.role !== 'assistant' || p.assignee === user.id, 403, 'แก้ได้เฉพาะโครงการที่รับผิดชอบ');
        const group = STATUS_GROUPS.find(g => g.id === (body.field ?? 'closure'));
        requireThat(group && group.values.includes(body.status), 400, 'สถานะไม่อยู่ในตัวเลือกของช่องนี้');
        const mode = statusMode(user, group, body.status, p.statusEditors[group.id]);
        requireThat(mode !== 'denied', 403, 'ไม่มีสิทธิ์เปลี่ยนสถานะนี้ หรือมีคนอื่นเคยแก้ช่องนี้แล้ว');
        current(p, body.version);
        requireThat(p.statusFields[group.id] !== body.status, 400, 'สถานะยังไม่เปลี่ยน');
        const before = p.statusFields[group.id];
        const reason = reasonFor(body.reason, isCancellationStatus(group.column, body.status));
        if (mode === 'review') {
          requireThat(!requests.some(r => r.projectId === p.id && r.kind === 'status' && r.field === group.id && r.state === 'pending'), 409, 'ช่องนี้มีคำขอสถานะรอตรวจแล้ว');
          const r = { id: randomUUID(), kind: 'status', field: group.id, fieldLabel: group.label, projectId: p.id,
            baseVersion: p.version, before, after: body.status, reason, proposer: user.id, state: 'pending', createdAt: new Date().toISOString() };
          requests.push(r);
          log(user, 'proposeStatus', p.id, { kind: 'status', field: group.id, fieldLabel: group.label, requestId: r.id, before, after: r.after, reason });
        } else {
          setStatus(p, group, body.status, user);
          log(user, action, p.id, { kind: 'status', field: group.id, fieldLabel: group.label, before, after: body.status, reason });
        }
      } else if (action === 'amount') {
        requireThat(user.role === 'head', 403, 'เฉพาะเหรัญญิกแก้ยอดโดยตรงได้');
        const p = projectFor(body.projectId);
        current(p, body.version);
        const amount = parseMoney(body.amount);
        const reason = reasonFor(body.reason);
        requireThat(amount !== p.amount, 400, 'ยอดใหม่ต้องต่างจากยอดเดิม');
        const before = p.amount;
        p.amount = amount; p.version++;
        log(user, action, p.id, { before, after: amount, reason });
      } else if (action === 'propose') {
        requireThat(user.role === 'secretary', 403, 'เฉพาะเลขานุการเสนอแก้ยอดในรุ่นทดลองนี้');
        const p = projectFor(body.projectId);
        current(p, body.version);
        const amount = parseMoney(body.amount);
        const reason = reasonFor(body.reason);
        requireThat(amount !== p.amount, 400, 'ยอดใหม่ต้องต่างจากยอดเดิม');
        requireThat(!requests.some(r => r.projectId === p.id && r.kind === 'amount' && r.state === 'pending'), 409, 'โครงการนี้มีคำขอแก้ยอดรอตรวจแล้ว');
        const request = { id: randomUUID(), kind: 'amount', projectId: p.id, baseVersion: p.version, before: p.amount, after: amount,
          reason, proposer: user.id, state: 'pending', createdAt: new Date().toISOString() };
        requests.push(request);
        log(user, action, p.id, { requestId: request.id, before: p.amount, after: amount, reason });
      } else {
        requireThat(user.role === 'head', 403, 'เฉพาะเหรัญญิกตรวจคำขอ');
        const r = requests.find(r => r.id === body.requestId);
        requireThat(r, 404, 'ไม่พบคำขอ');
        requireThat(r.state === 'pending', 409, 'คำขอนี้ได้รับการตรวจแล้ว');
        const p = projectFor(r.projectId);
        if (action === 'approve') {
          current(p, body.version);
          current(p, r.baseVersion);
          if (r.kind === 'status') {
            const group = STATUS_GROUPS.find(g => g.id === r.field);
            requireThat(p.statusFields[r.field] === r.before, 409, 'สถานะเดิมเปลี่ยนแล้ว ให้ส่งคำขอใหม่');
            const proposer = actorFor(r.proposer);
            requireThat(proposer.role !== 'assistant' || p.assignee === proposer.id, 403, 'ผู้เสนอไม่ได้รับผิดชอบโครงการนี้แล้ว');
            requireThat(statusMode(proposer, group, r.after, p.statusEditors[r.field]) === 'review', 403, 'สิทธิ์ผู้เสนอเปลี่ยนไป ให้ส่งคำขอใหม่');
            setStatus(p, group, r.after, user);
          } else {
            requireThat(p.amount === r.before, 409, 'ยอดเดิมเปลี่ยนแล้ว ให้ส่งคำขอใหม่');
            p.amount = r.after; p.version++;
          }
          r.state = 'approved';
        } else { r.reviewReason = reasonFor(body.reason); r.state = 'rejected'; }
        r.reviewer = user.id; r.reviewedAt = new Date().toISOString();
        log(user, action, p.id, { kind: r.kind, field: r.field, fieldLabel: r.fieldLabel, requestId: r.id, before: r.before, after: r.after, reason: r.reviewReason || r.reason });
      }
      return this.snapshot(id);
    }
  };
}
