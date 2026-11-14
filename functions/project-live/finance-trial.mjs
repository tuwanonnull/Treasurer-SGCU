import { randomUUID, createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { USERS as DEFAULT_USERS, PilotError } from './model.mjs';
import { previewMoney, calculateMoney, MONEY_COLUMNS } from './finance.mjs';
import { validateYear68Snapshot, queryYear68 } from './year68.mjs';
import { STATUS_GROUPS, statusMode } from './statuses.mjs';
import { validateReason as reasonFor, isCancellationStatus } from './reasons.mjs';

const requireThat = (condition, status, message) => { if (!condition) throw new PilotError(status, message); };
export function createFinanceTrial(snapshot, { users = DEFAULT_USERS, projectIdPrefix = 'TEST68:' } = {}) {
  if (!['TEST68:', 'PROJECT68:'].includes(projectIdPrefix)) throw new Error('Invalid project ID namespace');
  const USERS = structuredClone(users);
  for (const [id, user] of Object.entries(USERS)) {
    if (!id || user.id !== id || !['head', 'secretary', 'assistant'].includes(user.role) || typeof user.name !== 'string') throw new Error('Invalid trial account registry');
  }
  const original = validateYear68Snapshot(snapshot);
  const sourceHash = createHash('sha256').update(JSON.stringify(original)).digest('hex');
  const originalById = new Map(original.projects.map(p => [p.id, p]));
  for (const p of original.projects) previewMoney(p, {});
  let data, requests, audit, revision, baseEditors = {}, compactLoaded = false;
  const assistantIds = Object.values(USERS).filter(user => user.role === 'assistant').map(user => user.id);
  const editorsFor = (p, field) => [...new Set([...(baseEditors[p.id]?.[field] || []), ...audit.filter(a => a.projectId === p.id && ['status', 'approve'].includes(a.action) && a.beforeStatuses && a.afterStatuses && a.beforeStatuses[field] !== a.afterStatuses[field]).map(a => a.actor)])];
  const permissionsFor = (actor, p) => Object.fromEntries(STATUS_GROUPS.map(g => [g.column, Object.fromEntries(g.values.map(value => [value, statusMode(actor, g, value, editorsFor(p, g.column))]))]));
  const totalsFor = projects => Object.fromEntries(MONEY_COLUMNS.map(col => [col, projects.reduce((sum, p) => sum + (p.money[col] ?? 0), 0)]));
  function reset() {
    data = structuredClone(original);
    for (const p of data.projects) {
      p.sourceId = p.id; p.id = p.id.replace(/^YEAR68:/, projectIdPrefix); p.version = randomUUID();
      p.trialAssignee = null;
    }
    requests = []; audit = []; revision = randomUUID(); baseEditors = {}; compactLoaded = false;
  }
  reset();
  const actorFor = id => {
    requireThat(Object.hasOwn(USERS, id ?? ''), 401, 'เลือกบัญชีทดลองก่อน');
    const actor = USERS[id];
    return actor;
  };
  const projectFor = id => {
    const project = data.projects.find(p => p.id === id);
    requireThat(project, 404, 'ไม่พบโครงการในชุดทดลอง'); return project;
  };
  const current = (p, version) => requireThat(typeof version === 'string' && p.version === version, 409, 'ข้อมูลเปลี่ยนแล้ว กดโหลดข้อมูลล่าสุดแล้วตรวจยอดอีกครั้ง');
  function log(actor, action, p, details) {
    audit.push({ id: randomUUID(), at: new Date().toISOString(), actor: actor.id, actorName: actor.name, action,
      projectId: p.id, code: p.code, ...structuredClone(details) });
    revision = randomUUID();
  }
  function calculation(p, changes) {
    const result = previewMoney(p, changes);
    const direction = Object.hasOwn(changes, 'U') ? changes.U || null : p.formulaInputs.transferDirection || null;
    const beforeDirection = p.formulaInputs.transferDirection || null;
    requireThat(result.changedColumns.length > 0 || direction !== beforeDirection, 400, 'ข้อมูลใหม่ต้องต่างจากเดิม');
    return { ...result, beforeDirection, afterDirection: direction, beforeStatuses: structuredClone(p.statuses), afterStatuses: structuredClone(p.statuses) };
  }
  function statusCalculation(p, field, value) {
    const group = STATUS_GROUPS.find(g => g.column === field);
    requireThat(group && group.values.includes(value), 400, 'สถานะไม่อยู่ในตัวเลือกของช่องนี้');
    requireThat(p.statuses[field] !== value, 400, 'สถานะใหม่ต้องต่างจากเดิม');
    const before = previewMoney(p, {}).before;
    const afterStatuses = { ...p.statuses, [field]: value };
    const after = calculateMoney({ ...p, statuses: afterStatuses });
    return { projectId: p.id, previewOnly: true, saved: false, before, after,
      beforeDirection: p.formulaInputs.transferDirection || null, afterDirection: p.formulaInputs.transferDirection || null,
      beforeStatuses: structuredClone(p.statuses), afterStatuses, field, fieldLabel: group.label,
      changedColumns: MONEY_COLUMNS.filter(col => before[col] !== after[col]) };
  }
  function details(result) {
    return Object.fromEntries(['before', 'after', 'beforeDirection', 'afterDirection', 'beforeStatuses', 'afterStatuses', 'field', 'fieldLabel'].filter(key => result[key] !== undefined).map(key => [key, result[key]]));
  }
  function requestCalculation(p, r) {
    return r.kind === 'status' ? statusCalculation(p, r.field, r.afterStatuses[r.field]) : calculation(p, r.changes);
  }
  function apply(p, result) {
    const totals = {};
    for (const col of MONEY_COLUMNS) {
      const total = BigInt(data.totals[col]) - BigInt(p.money[col] ?? 0) + BigInt(result.after[col] ?? 0);
      requireThat(total >= -9007199254740991n && total <= 9007199254740991n, 400, 'ยอดรวมเกินขอบเขตที่รองรับ');
      totals[col] = Number(total);
    }
    // Validate every result before replacing the whole monetary state in this single process.
    p.money = structuredClone(result.after); p.formulaInputs.transferDirection = result.afterDirection;
    p.statuses = structuredClone(result.afterStatuses);
    p.version = randomUUID(); data.totals = totals;
  }
  const compactState = () => structuredClone({ schemaVersion: 2, sourceHash, data, requests: requests.filter(r => r.state === 'pending'), audit: [], revision,
    statusEditors: Object.fromEntries(data.projects.map(p => [p.id, Object.fromEntries(STATUS_GROUPS.map(g => [g.column, editorsFor(p, g.column)]))])) });
  return {
    exportState() {
      if (compactLoaded) throw new Error('Compact state requires external history; use exportIncremental');
      return structuredClone({ schemaVersion: 1, sourceHash, data, requests, audit, revision });
    },
    exportCompactState: compactState,
    exportIncremental() { return { checkpoint: compactState(), requests: structuredClone(requests), events: structuredClone(audit) }; },
    importState(saved, { recoveryId = null } = {}) {
      if (users !== DEFAULT_USERS && recoveryId !== null) throw new Error('Custom account recovery requires an explicit recovery actor');
      const invalid = () => { throw new Error('Invalid financial trial checkpoint'); };
      const token = value => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value);
      const compact = saved?.schemaVersion === 2;
      if (![1, 2].includes(saved?.schemaVersion) || saved.sourceHash !== sourceHash || !token(saved.revision) || !Array.isArray(saved.requests) || !Array.isArray(saved.audit)) invalid();
      if (compact && (saved.audit.length || saved.requests.some(r => r.state !== 'pending') || recoveryId !== null)) invalid();
      const next = structuredClone(saved);
      const { projects: baselineProjects, totals: baselineTotals, ...baselineMeta } = original;
      const { projects, totals, ...meta } = next.data || {};
      if (!Array.isArray(projects) || projects.length !== baselineProjects.length || !isDeepStrictEqual(meta, baselineMeta)) invalid();
      const sums = Object.fromEntries(MONEY_COLUMNS.map(col => [col, 0n]));
      const validStatuses = statuses => statuses && Object.keys(statuses).length === STATUS_GROUPS.length && STATUS_GROUPS.every(g => statuses[g.column] === null || statuses[g.column] === '' || g.values.includes(statuses[g.column]));
      const byId = new Map();
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i], source = baselineProjects[i];
        const { id, sourceId, version, money, formulaInputs, statuses, trialAssignee = null, ...fixed } = p;
        const { id: originalId, money: originalMoney, formulaInputs: originalFormula, statuses: originalStatuses, ...sourceFixed } = source;
        if (id !== originalId.replace(/^YEAR68:/, projectIdPrefix) || sourceId !== originalId || !token(version) || !isDeepStrictEqual(fixed, sourceFixed)) invalid();
        if (!validStatuses(statuses)) invalid();
        if (trialAssignee !== null && !assistantIds.includes(trialAssignee)) invalid();
        const { transferDirection, ...rules } = formulaInputs || {};
        const { transferDirection: oldDirection, ...originalRules } = originalFormula;
        if (!isDeepStrictEqual(rules, originalRules) || ![null, '', 'เพิ่ม', 'ลด'].includes(transferDirection)) invalid();
        previewMoney(p, {}); // Validate every money result, including blank and signed values.
        if (Object.keys(money).length !== MONEY_COLUMNS.length) invalid();
        for (const col of MONEY_COLUMNS) sums[col] += BigInt(money[col] ?? 0);
        byId.set(id, p);
      }
      for (const col of MONEY_COLUMNS) if (!Number.isSafeInteger(totals?.[col]) || sums[col] !== BigInt(totals[col])) invalid();
      if (compact) {
        if (!next.statusEditors || Object.keys(next.statusEditors).length !== projects.length) invalid();
        for (const p of projects) {
          const fields = next.statusEditors[p.id];
          if (!fields || Object.keys(fields).length !== STATUS_GROUPS.length) invalid();
          for (const g of STATUS_GROUPS) {
            const editors = fields[g.column];
            if (!Array.isArray(editors) || new Set(editors).size !== editors.length || editors.some(id => !Object.hasOwn(USERS, id))) invalid();
          }
        }
      }
      const requestIds = new Set(), pendingProjects = new Set();
      for (const r of next.requests) {
        const p = byId.get(r.projectId);
        if (!p || !token(r.id) || requestIds.has(r.id) || !token(r.baseVersion) || !['secretary', 'assistant'].includes(USERS[r.proposer]?.role) || !['pending', 'approved', 'rejected'].includes(r.state) || r.code !== p.code || r.name !== p.name) invalid();
        reasonFor(r.reason, r.kind !== 'status' || isCancellationStatus(r.field, r.afterStatuses?.[r.field])); requestIds.add(r.id);
        if (!Number.isFinite(Date.parse(r.createdAt))) invalid();
        if (r.state === 'pending') { if (pendingProjects.has(p.id)) invalid(); pendingProjects.add(p.id); }
        else if (USERS[r.reviewer]?.role !== 'head' || !Number.isFinite(Date.parse(r.reviewedAt))) invalid();
        if (r.state === 'rejected') reasonFor(r.reviewReason);
        if (![undefined, 'money', 'status'].includes(r.kind)) invalid();
        if (r.kind !== 'status' && USERS[r.proposer]?.role !== 'secretary') invalid();
        const beforeStatuses = r.beforeStatuses || originalById.get(p.sourceId).statuses;
        const afterStatuses = r.afterStatuses || beforeStatuses;
        if (!validStatuses(beforeStatuses) || !validStatuses(afterStatuses)) invalid();
        const beforeProject = { ...p, statuses: beforeStatuses, money: r.before, formulaInputs: { ...p.formulaInputs, transferDirection: r.beforeDirection } };
        if (r.kind === 'status') {
          const group = STATUS_GROUPS.find(g => g.column === r.field);
          if (!group || statusMode(USERS[r.proposer], group, afterStatuses[r.field]) !== 'review') invalid();
        }
        const calculated = requestCalculation(beforeProject, r);
        if (!isDeepStrictEqual(calculated.after, r.after) || calculated.afterDirection !== r.afterDirection) invalid();
        if (!isDeepStrictEqual(calculated.afterStatuses, afterStatuses)) invalid();
      }
      const auditIds = new Set();
      const seenAssignees = new Map(), seenEditors = new Map();
      for (const a of next.audit) {
        if (!token(a.id) || auditIds.has(a.id) || !Number.isFinite(Date.parse(a.at)) || !Object.hasOwn(USERS, a.actor) || a.actorName !== USERS[a.actor].name) invalid();
        auditIds.add(a.id);
        const request = next.requests.find(r => r.id === a.requestId);
        const statusEvent = ['status', 'proposeStatus'].includes(a.action) || (a.action === 'approve' && request?.kind === 'status');
        const needsReason = a.action !== 'assign' && (!statusEvent || isCancellationStatus(a.field || request?.field, a.afterStatuses?.[a.field] ?? request?.afterStatuses?.[request?.field]));
        reasonFor(a.reason, needsReason);
        if (a.action === 'restore') { if (USERS[a.actor]?.role !== 'head' || a.projectId !== null || a.before !== null || a.after !== null) invalid(); continue; }
        const p = byId.get(a.projectId);
        if (a.action === 'assign') {
          if (!p || a.code !== p.code || USERS[a.actor]?.role !== 'head' || ![null, ...assistantIds].includes(a.afterAssignee) || a.beforeAssignee !== (seenAssignees.get(p.id) ?? null)) invalid();
          seenAssignees.set(p.id, a.afterAssignee); continue;
        }
        if (!p || a.code !== p.code || !['propose', 'proposeStatus', 'status', 'commit', 'approve', 'reject'].includes(a.action)) invalid();
        if (!['status', 'proposeStatus'].includes(a.action) && USERS[a.actor]?.role !== (a.action === 'propose' ? 'secretary' : 'head')) invalid();
        if (!['commit', 'status'].includes(a.action) && !requestIds.has(a.requestId)) invalid();
        const oldStatuses = a.beforeStatuses || originalById.get(p.sourceId).statuses;
        const newStatuses = a.afterStatuses || oldStatuses;
        if (!validStatuses(oldStatuses) || !validStatuses(newStatuses)) invalid();
        if (a.action === 'status' || a.action === 'proposeStatus') {
          const group = STATUS_GROUPS.find(g => g.column === a.field);
          const previousEditors = seenEditors.get(`${p.id}:${a.field}`) || [];
          if (!group || statusMode(USERS[a.actor], group, newStatuses[a.field], previousEditors) !== (a.action === 'status' ? 'direct' : 'review')) invalid();
          if (USERS[a.actor].role === 'assistant' && seenAssignees.get(p.id) !== a.actor) invalid();
        }
        for (const [money, direction, statuses] of [[a.before, a.beforeDirection, oldStatuses], [a.after, a.afterDirection, newStatuses]]) previewMoney({ ...p, statuses, money, formulaInputs: { ...p.formulaInputs, transferDirection: direction } }, {});
        if (['status', 'approve'].includes(a.action)) for (const g of STATUS_GROUPS) {
          if (oldStatuses[g.column] !== newStatuses[g.column]) {
            const key = `${p.id}:${g.column}`; seenEditors.set(key, [...new Set([...(seenEditors.get(key) || []), a.actor])]);
          }
        }
      }
      if (!compact) for (const p of projects) if ((p.trialAssignee ?? null) !== (seenAssignees.get(p.id) ?? null)) invalid();
      if (recoveryId !== null) {
        for (const p of projects) {
          const old = p.version; p.version = randomUUID();
          for (const r of next.requests) if (r.projectId === p.id && r.state === 'pending' && r.baseVersion === old) r.baseVersion = p.version;
        }
        next.revision = randomUUID();
        next.audit.push({ id: randomUUID(), at: new Date().toISOString(), actor: 'head', actorName: USERS.head.name,
          action: 'restore', projectId: null, code: 'ทั้งชุด', before: null, after: null, reason: `กู้คืนจากชุดสำรอง ${recoveryId}` });
      }
      data = next.data; requests = next.requests; audit = next.audit; revision = next.revision;
      baseEditors = compact ? next.statusEditors : {}; compactLoaded = compact;
    },
    query(id, params = new URLSearchParams()) {
      const actor = actorFor(id);
      const visible = data.projects.filter(p => actor.role !== 'assistant' || p.trialAssignee === actor.id);
      const ids = new Set(visible.map(p => p.id)), sourceIds = new Set(visible.map(p => p.sourceId));
      const view = actor.role === 'assistant' ? { ...data, projects: visible, totals: totalsFor(visible), verification: { ...data.verification, projectCount: visible.length } } : data;
      const page = queryYear68(view, params);
      return structuredClone({ ...page, readOnly: false, sandboxOnly: projectIdPrefix === 'TEST68:',
        user: actor, revision, originalTotals: actor.role === 'assistant' ? totalsFor(original.projects.filter(p => sourceIds.has(p.id))) : original.totals,
        assistantAccounts: actor.role === 'head' ? assistantIds.map(id => USERS[id]) : [],
        projectStatusPermissions: Object.fromEntries(page.projects.map(p => [p.id, permissionsFor(actor, p)])),
        statusGroups: STATUS_GROUPS, statusPermissions: actor.role === 'assistant' ? {} : Object.fromEntries(STATUS_GROUPS.map(g => [g.column, Object.fromEntries(g.values.map(value => [value, statusMode(actor, g, value)]))])),
        requests: requests.filter(r => ids.has(r.projectId)).map(r => ({ ...r, stale: r.state === 'pending' && projectFor(r.projectId).version !== r.baseVersion })),
        audit: actor.role === 'assistant' ? audit.filter(a => ids.has(a.projectId)) : audit });
    },
    mutate(id, action, body) {
      const actor = actorFor(id);
      requireThat(actor.role !== 'assistant' || ['status', 'status-preview'].includes(action), 403, 'ผู้ช่วยแก้ได้เฉพาะสถานะที่อนุญาตในโครงการที่รับผิดชอบ');
      const allowed = { preview: ['projectId', 'version', 'changes'], propose: ['projectId', 'version', 'changes', 'reason'],
        assign: ['projectId', 'version', 'assignee', 'reason'],
        'status-preview': ['projectId', 'version', 'field', 'value'], status: ['projectId', 'version', 'field', 'value', 'reason'],
        commit: ['projectId', 'version', 'changes', 'reason'], approve: ['requestId', 'version'], reject: ['requestId', 'reason'], reset: ['revision'] }[action];
      requireThat(allowed && body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).every(k => allowed.includes(k)), 400, 'คำขอมีช่องข้อมูลที่ไม่อนุญาต');
      if (action === 'assign') {
        requireThat(actor.role === 'head', 403, 'เฉพาะเหรัญญิกมอบหมายบัญชีจำลอง');
        const p = projectFor(body.projectId); current(p, body.version);
        requireThat([null, ...assistantIds].includes(body.assignee), 400, 'เลือกบัญชีผู้ช่วยจำลองที่กำหนดเท่านั้น');
        const beforeAssignee = p.trialAssignee ?? null;
        requireThat(beforeAssignee !== body.assignee, 400, 'ผู้รับผิดชอบยังไม่เปลี่ยน');
        const reason = reasonFor(body.reason, false);
        p.trialAssignee = body.assignee; p.version = randomUUID();
        log(actor, 'assign', p, { beforeAssignee, afterAssignee: body.assignee, reason });
        return { sandboxOnly: projectIdPrefix === 'TEST68:', savedInMemory: true };
      }
      if (action === 'reset') {
        requireThat(actor.role === 'head', 403, 'เฉพาะเหรัญญิกเริ่มชุดทดลองใหม่');
        requireThat(body.revision === revision, 409, 'มีการทดลองเพิ่มแล้ว โหลดข้อมูลล่าสุดก่อนเริ่มใหม่');
        reset(); return { sandboxOnly: projectIdPrefix === 'TEST68:', reset: true };
      }
      if (action === 'status' || action === 'status-preview') {
        const p = projectFor(body.projectId);
        requireThat(actor.role !== 'assistant' || p.trialAssignee === actor.id, 403, 'แก้ได้เฉพาะโครงการที่รับผิดชอบ');
        current(p, body.version);
        const result = statusCalculation(p, body.field, body.value);
        const group = STATUS_GROUPS.find(g => g.column === body.field);
        const mode = statusMode(actor, group, body.value, editorsFor(p, body.field));
        requireThat(mode !== 'denied', 403, 'ไม่มีสิทธิ์เปลี่ยนสถานะนี้');
        if (action === 'status-preview') return structuredClone({ ...result, mode });
        const reason = reasonFor(body.reason, isCancellationStatus(body.field, body.value));
        if (mode === 'review') {
          requireThat(!requests.some(r => r.projectId === p.id && r.state === 'pending'), 409, 'โครงการนี้มีคำขอรอตรวจแล้ว');
          const r = { id: randomUUID(), kind: 'status', projectId: p.id, code: p.code, name: p.name, baseVersion: p.version,
            proposer: actor.id, state: 'pending', createdAt: new Date().toISOString(), ...details(result), reason };
          requests.push(r); log(actor, 'proposeStatus', p, { requestId: r.id, ...details(result), reason });
          return { sandboxOnly: projectIdPrefix === 'TEST68:', state: 'pending', requestId: r.id };
        }
        apply(p, result); log(actor, 'status', p, { ...details(result), reason });
        return { sandboxOnly: projectIdPrefix === 'TEST68:', savedInMemory: true };
      }
      if (['preview', 'propose', 'commit'].includes(action)) {
        if (action === 'commit') requireThat(actor.role === 'head', 403, 'เฉพาะเหรัญญิกบันทึกตรง');
        if (action === 'propose') requireThat(actor.role === 'secretary', 403, 'เฉพาะเลขานุการเสนอแก้ยอด');
        const p = projectFor(body.projectId); current(p, body.version);
        const result = action === 'preview' ? previewMoney(p, body.changes) : calculation(p, body.changes);
        if (action === 'preview') return structuredClone(result);
        const reason = reasonFor(body.reason);
        if (action === 'propose') {
          requireThat(!requests.some(r => r.projectId === p.id && r.state === 'pending'), 409, 'โครงการนี้มีคำขอรอตรวจแล้ว');
          const r = { id: randomUUID(), kind: 'money', projectId: p.id, code: p.code, name: p.name, baseVersion: p.version,
            proposer: actor.id, state: 'pending', createdAt: new Date().toISOString(), changes: structuredClone(body.changes),
            ...details(result), reason };
          requests.push(r); log(actor, action, p, { requestId: r.id, ...details(result), reason });
          return { sandboxOnly: projectIdPrefix === 'TEST68:', state: 'pending', requestId: r.id };
        }
        apply(p, result); log(actor, action, p, { ...details(result), reason });
      } else {
        requireThat(actor.role === 'head', 403, 'เฉพาะเหรัญญิกตรวจคำขอ');
        const r = requests.find(r => r.id === body.requestId);
        requireThat(r, 404, 'ไม่พบคำขอ'); requireThat(r.state === 'pending', 409, 'คำขอนี้ตรวจแล้ว');
        const p = projectFor(r.projectId);
        if (action === 'approve') {
          current(p, body.version); current(p, r.baseVersion);
          if (r.kind === 'status') {
            const group = STATUS_GROUPS.find(g => g.column === r.field);
            requireThat(USERS[r.proposer].role !== 'assistant' || p.trialAssignee === r.proposer, 403, 'ผู้เสนอไม่ได้รับผิดชอบโครงการนี้แล้ว');
            requireThat(statusMode(USERS[r.proposer], group, r.afterStatuses[r.field], editorsFor(p, r.field)) === 'review', 403, 'สิทธิ์ผู้เสนอเปลี่ยนแล้ว');
          }
          const result = requestCalculation(p, r);
          requireThat(MONEY_COLUMNS.every(col => result.after[col] === r.after[col]) && result.afterDirection === r.afterDirection, 409, 'ผลคำนวณเปลี่ยนแล้ว ให้เสนอใหม่');
          apply(p, result); r.state = 'approved';
        } else { r.reviewReason = reasonFor(body.reason); r.state = 'rejected'; }
        r.reviewer = actor.id; r.reviewedAt = new Date().toISOString();
        const legacyStatuses = originalById.get(p.sourceId).statuses;
        log(actor, action, p, { requestId: r.id, ...details(r), beforeStatuses: r.beforeStatuses || legacyStatuses, afterStatuses: r.afterStatuses || legacyStatuses, reason: r.reviewReason || r.reason });
      }
      return { sandboxOnly: projectIdPrefix === 'TEST68:', savedInMemory: true };
    }
  };
}
