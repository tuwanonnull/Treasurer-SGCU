/* Local budget workflow; opt-in account voting is handled by the ballot service. */
(() => {
  const money = n => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const projectCode = value => String(value || '').trim().toUpperCase();
  const codeOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  const parentCode = value => {
    const match = /^SGCU-(\d{2})\.\d{2}\.\d{2,}$/.exec(projectCode(value));
    return match ? `SGCU-${match[1]}.00` : '';
  };
  const steps = ['เตรียมประชุม', 'มติกรอบงบ', 'ยกเลิกโดยสมัครใจ', 'จัดลำดับโครงการ', 'รับฝ่ายขอแบ่งงบ', 'อภิปรายและลงมติ', 'สรุปและลงมติ', 'ปิดประชุม'];
  const button = (action, label, primary = false, disabled = false) => `<button type="button" data-action="${action}" class="${primary ? 'bm-primary' : ''}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  const field = (label, name, value, max = 999, min = 0) => `<label>${label}<input type="number" name="${name}" value="${value}" min="${min}" max="${max}" step="1" required></label>`;
  document.querySelectorAll('[data-budget-meeting-demo]').forEach(root => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    root.className = 'bm';
    let state;
    const undoStack = [];
    const checkpoint = () => ({ state: structuredClone(state), remaining });
    function remember(previous) {
      if ((previous.state.poll && !previous.state.poll.closed) || (state.poll && !state.poll.closed)) { undoStack.length = 0; return; }
      previous.state.modal = ''; previous.state.error = '';
      undoStack.push(previous);
      if (undoStack.length > 20) undoStack.shift();
    }
    let deadline = 0;
    let remaining = 300;
    let timer = null;
    let source = null;
    let pendingImport = null;
    let importRound = '';
    let selectedImport = new Map();
    let ceilingDrafts = new Map();
    const isPreview = root.dataset.preview === 'true';
    const isStaffPage = !isPreview && !!root.closest('[data-page="budget-approval-staff"]');
    const registryUI = isStaffPage || isPreview;
    let importSearch = '';
    let busy = false;
    let displayChannel = null, displayWindow = null;
    const displayKey = `sgcu-budget-display:${isStaffPage ? 'staff' : 'standalone'}`;
    let displayId;
    try { displayId = sessionStorage.getItem(displayKey); } catch (_) { /* Storage may be unavailable. */ }
    if (!displayId || !/^[a-zA-Z0-9-]{20,64}$/.test(displayId)) {
      displayId = crypto.randomUUID();
      try { sessionStorage.setItem(displayKey, displayId); } catch (_) { /* Display still works until reload. */ }
    }
    try {
      displayChannel = new BroadcastChannel(`sgcu-budget-display:${displayId}`);
      displayChannel.onmessage = event => { if (event.data?.type === 'request-state') publishDisplay(); };
    } catch (_) { /* Report only if the chair requests a display window. */ }
    function displaySnapshot() {
      // Explicit public projection: never send state, emails, members, raw ballots,
      // draft selections, private history, or a vote result before the round closes.
      if (!state) return null;
      if (state.online && state.hostUid !== window.sgcuAuth?.auth.currentUser?.uid) return {version:1, unavailable:true};
      const currentProject = [4,5].includes(state.step) ? project() : null;
      const open = Boolean(state.online ? state.poll && !state.poll.closed : state.votes?.open);
      const result = state.votes && !state.votes.open && !open ? state.votes : null;
      const hearing = state.step === 5 && state.stage < 3;
      return {
        version:1, hasSource:Boolean(state.sourceInfo), sourceLabel:state.sourceInfo?.roundLabel || '',
        step:state.step, stepTitle:steps[state.step], steps:[...steps], round:state.round,
        initialBudget:state.orgs.reduce((sum,o)=>sum+o.ceiling,0),
        currentBudget:state.orgs.reduce((sum,_,i)=>sum+orgTotal(i),0),
        people:totalPeople(), departments:state.orgs.length, projects:state.projects.length,
        eligible:state.step === 5 ? eligible() : totalPeople(), closed:state.closed || '',
        project:currentProject ? {name:currentProject.name, code:currentProject.code, department:state.orgs[currentProject.org].name, budget:currentProject.budget, position:state.cursor+1, total:state.queue.length} : null,
        recipients:state.step === 5 ? state.recipients.map(i=>state.orgs[i].name) : [],
        stage:state.stage, timer:hearing ? {running:Boolean(timer), deadline, remaining} : null,
        open, submission:open && ['withdrawal','recipient'].includes(state.poll?.kind),
        progress:open && progressPoll === state.poll?.id && progressValue && !progressError ? {count:progressValue.count,total:progressValue.total,cached:progressValue.cached} : null,
        result:result ? {yes:result.yes,no:result.no,missing:result.missing,total:result.n,message:result.message,reduction:state.step===5} : null,
        budgets:[1,6,7].includes(state.step) ? state.orgs.map((o,i)=>({name:o.name,amount:orgTotal(i)})) : [],
        ranking:state.step === 3 && state.ranked ? state.ranked.map((row,i)=>({rank:i+1,name:state.projects[row.id].name,department:state.orgs[state.projects[row.id].org].name,score:row.score})) : [],
        ballotCount:state.step === 3 && !state.online ? state.ballots.length : null
      };
    }
    function publishDisplay() {
      if (!displayChannel || !state) return;
      displayChannel.postMessage({type:'state', sentAt:Date.now(), snapshot:displaySnapshot()});
    }
    setInterval(publishDisplay, 2000);
    window.addEventListener('pagehide', () => displayChannel?.postMessage({type:'host-away'}));
    window.addEventListener('pageshow', publishDisplay);
    const amount = value => {
      if (value === null || value === undefined || (typeof value === 'string' && !value.trim()) || !['string', 'number'].includes(typeof value)) throw Error('ไม่พบยอดเงิน กรุณาตรวจข้อมูลต้นทาง');
      if (typeof value === 'string' && value.includes(',')) {
        if (!/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(value.trim())) throw Error('รูปแบบยอดเงินไม่ถูกต้อง');
        value = value.replaceAll(',', '');
      }
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 1000000000 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) throw Error('ยอดเงินต้องเป็นจำนวนไม่ติดลบและมีทศนิยมไม่เกิน 2 ตำแหน่ง');
      return Math.round(n * 100) / 100;
    };
    function setSource(value) {
      if (!value || value.version !== 1 || !Array.isArray(value.requests) || !value.requests.length || value.requests.length > 5000 || !Array.isArray(value.rounds)) throw Error('รูปแบบไฟล์ไม่ถูกต้อง ต้องเป็นชุดข้อมูลคำขอ version 1 และมีไม่เกิน 5,000 รายการ');
      const ids = new Set();
      const requests = value.requests.filter(r => parentCode(r?.projectCodeGenerated)).map(r => {
        for (const key of ['id', 'budgetRoundId', 'projectName', 'organizationName']) if (typeof r[key] !== 'string' || !r[key].trim() || r[key].length > 500) throw Error(`ข้อมูลคำขอไม่ครบ: ${key}`);
        if (ids.has(r.id)) throw Error('พบรหัสคำขอซ้ำ');
        ids.add(r.id);
        return { ...r, organizationType: String(r.organizationType || ''), organizationCode: projectCode(r.organizationCode), projectCodeGenerated: projectCode(r.projectCodeGenerated), status: String(r.status || '') };
      });
      if (!requests.length) {
        const missing = value.requests.filter(r => !projectCode(r?.projectCodeGenerated)).length;
        throw Error(`อ่านคำขอ ${value.requests.length} รายการ แต่ไม่พบรหัสโครงการ อบจ. เช่น SGCU-01.00.001 (รองรับเลขท้าย 2 หลักขึ้นไป) · ยังไม่มีรหัส ${missing} รายการ`);
      }
      const rounds = [...new Set(requests.map(r => r.budgetRoundId))].map(id => {
        const r = value.rounds.find(x => x.id === id);
        const organizations = (Array.isArray(r?.organizations) ? r.organizations : []).filter(o => /^SGCU-\d{2}\.00$/.test(projectCode(o?.code)) && typeof o.name === 'string' && o.name.trim()).map(o => ({ code: projectCode(o.code), name: o.name.trim(), members: Array.isArray(o.members) ? o.members : [], defaultRepresentative: String(o.defaultRepresentative || ''), representativeIssue: String(o.representativeIssue || '') }));
        return { id, label: String(r?.label || id), sgcuBudgetCeiling: r?.sgcuBudgetCeiling ?? r?.budgetGroupCeilings?.['องค์การบริหารสโมสรนิสิต'] ?? null, organizations };
      });
      source = { version: 1, requests, rounds };
      selectedImport = new Map(); ceilingDrafts = new Map(); importSearch = '';
      importRound = rounds[0].id; state.modal = 'import'; state.error = '';
    }
    const importRows = () => source.requests.filter(r => r.budgetRoundId === importRound).sort((a, b) => codeOrder.compare(a.projectCodeGenerated, b.projectCodeGenerated) || codeOrder.compare(a.id, b.id));
    const orderedProjects = () => state.projects.map((p, i) => ({ p, i })).sort((a, b) => codeOrder.compare(a.p.code, b.p.code) || a.i - b.i);
    const importIssue = row => {
      try { amount(row.estimatedExpense); return ''; } catch (_) { return 'ไม่พบยอดเงินที่ถูกต้อง'; }
    };
    function importSelection() {
      if (!selectedImport.has(importRound)) selectedImport.set(importRound, new Set(importRows().filter(r => !importIssue(r)).map(r => r.id)));
      const selected = selectedImport.get(importRound);
      importRows().forEach(r => { if (importIssue(r)) selected.delete(r.id); });
      return selected;
    }
    function downloadJSON(value, name) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function stopTimer() { clearInterval(timer); timer = null; deadline = 0; }
    function representativeData(org, existing) {
      const members = org.members || [];
      const presidents = members.filter(m => m.president);
      const defaultId = org.defaultRepresentative || (presidents.length === 1 ? presidents[0].id : '');
      const selected = (existing?.representativeChosen ? members.find(m => m.id === existing.representativeId && m.email) : null) || members.find(m => m.id === defaultId && m.email);
      return { members, representativeId: selected?.id || '', email: selected?.email || '', representativeChosen: !!existing?.representativeChosen, representativeIssue: org.representativeIssue || '' };
    }
    function representativeLabel(member, org) {
      const role = String(member.role || '').trim();
      const department = String(member.organizationName || org.name || member.code || '').trim();
      const position = role.includes(department) ? role : `${role}${department}`;
      return `${member.name} · ${position || 'ผู้แทนฝ่าย'}`;
    }
    function representativeSelect(org, i) {
      return `<select name="representative${i}" data-representative="${i}" aria-label="ผู้ลงคะแนน ${esc(org.name)}"><option value="">เลือกผู้แทนฝ่าย</option>${(org.members || []).map(m => `<option value="${esc(m.id)}" ${m.id === org.representativeId ? 'selected' : ''} ${m.email ? '' : 'disabled'}>${esc(representativeLabel(m, org))}${m.email ? '' : ' (ไม่มีอีเมล)'}</option>`).join('')}</select><small data-representative-email="${i}">${esc(org.email || org.representativeIssue || 'ยังไม่ระบุบัญชีผู้ลงคะแนน')}</small>`;
    }
    async function loadDefaultOrganizations() {
      const existing = new Map(state.orgs.map(o => [o.code, o]));
      const organizations = await window.sgcuGetBudgetMeetingDefaults();
      if (state.sourceInfo) return;
      state.orgs = organizations.map(o => ({
        code: o.code, name: o.name, ...representativeData(o, existing.get(o.code)), type: 'อบจ.', count: existing.get(o.code)?.count ?? 1,
        proxy: existing.get(o.code)?.proxy ?? '', reserve: 0, grant: 0, ceiling: 0
      }));
      state.error = '';
    }
    function applyInitialCeiling(projects, ceiling) {
      const cents = projects.map(p => BigInt(Math.round(p.original * 100)));
      const total = cents.reduce((sum, n) => sum + n, 0n);
      if (ceiling === null || total === 0n) return 0;
      const target = BigInt(Math.round(ceiling * 100));
      if (target >= total) return 0;
      // Reconcile satang at department level first, then within each department.
      const apportion = (weights, budget) => {
        const sum = weights.reduce((s, n) => s + n, 0n);
        if (sum === 0n) return weights.map(() => 0n);
        const shares = weights.map((n, i) => ({ i, value: n * budget / sum, remainder: n * budget % sum }));
        let left = budget - shares.reduce((s, item) => s + item.value, 0n);
        shares.sort((a, b) => a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1);
        for (const share of shares) {
          if (left > 0n) { share.value++; left--; }
        }
        return shares.sort((a, b) => a.i - b.i).map(share => share.value);
      };
      const groups = new Map();
      projects.forEach((p, i) => {
        if (!groups.has(p.org)) groups.set(p.org, []);
        groups.get(p.org).push(i);
      });
      const departments = [...groups.values()].map(indices => indices.sort((a, b) => codeOrder.compare(projects[a].code, projects[b].code)))
        .sort((a, b) => codeOrder.compare(projects[a[0]].code, projects[b[0]].code));
      const departmentBudgets = apportion(departments.map(indices => indices.reduce((sum, i) => sum + cents[i], 0n)), target);
      departments.forEach((indices, department) => {
        const budgets = apportion(indices.map(i => cents[i]), departmentBudgets[department]);
        indices.forEach((i, index) => { projects[i].budget = Number(budgets[index]) / 100; });
      });
      return Number(total - target) / Number(total) * 100;
    }
    function reset() {
      stopTimer();
      undoStack.length = 0;
      state = {
        step: 0, round: 1, stage: 0, queue: [], cursor: 0, recipients: [], votes: null,
        ballots: [], picked: [], logs: [], pending: [], modal: '', error: '', closed: '', exception: false,
        orgs: [], projects: []
      };
      remaining = 300;
    }

    const totalPeople = () => state.orgs.reduce((s, o) => s + o.count, 0);
    const project = () => state.projects[state.queue[state.cursor]];
    const eligible = () => state.orgs.reduce((sum, o, i) => sum + (i === project()?.org || state.recipients.includes(i) ? 0 : o.count), 0);
    const orgTotal = i => state.projects.filter(p => p.org === i).reduce((s, p) => s + p.budget, 0) + state.orgs[i].reserve + state.orgs[i].grant;
    const log = text => state.logs.push({ round: state.round, text });
    const go = step => { stopTimer(); state.step = step; state.votes = null; state.error = ''; };
    function recordVotes(yes, no, missing) {
      const reduction = state.step === 5;
      const n = reduction ? eligible() : totalPeople();
      if (yes + no + missing !== n) throw Error(`ผลรวมคะแนนต้องเท่ากับผู้มีสิทธิ์ ${n} คน`);
      const rate = yes * 100 >= n * 60 ? 25 : yes * 100 >= n * 20 ? 10 : 0;
      const cut = reduction ? Math.round(project().budget * rate) / 100 : 0;
      const message = reduction ? `เห็นชอบ ${money(yes / n * 100)}% · ลด ${rate}% (${money(cut)} บาท)` : yes > n / 2 ? 'เสียงข้างมากพึงพอใจ' : no > n / 2 ? 'เสียงข้างมากไม่พึงพอใจ' : 'ยังไม่มีเสียงข้างมาก';
      state.votes = { open: false, yes, no, missing, n, rate, cut, message };
      log(`${steps[state.step]}: ${message} [${yes}/${no}/${missing} จาก ${n}]`);
    }
    let progressPoll = '', stopProgress = null, progressValue = null, progressError = '';
    function syncVoteProgress() {
      const id = state.online && state.poll && !state.poll.closed ? state.poll.id : '';
      if (id !== progressPoll) {
        stopProgress?.(); stopProgress = null;
        progressPoll = id; progressValue = null; progressError = '';
        if (id && window.sgcuBudgetBallots?.watchProgress) {
          try {
            stopProgress = window.sgcuBudgetBallots.watchProgress(id, value => {
              if (progressPoll !== id) return;
              progressValue = value; progressError = value === null ? 'รอบนี้ไม่รองรับจำนวนผู้ลงคะแนนแบบสด' : '';
              paintVoteProgress();
            }, () => { if (progressPoll === id) { progressError = 'โหลดจำนวนผู้ลงคะแนนไม่สำเร็จ'; paintVoteProgress(); } });
          } catch (_) { progressError = 'โหลดจำนวนผู้ลงคะแนนไม่สำเร็จ'; }
        }
      }
      paintVoteProgress();
    }
    function paintVoteProgress() {
      const label = root.querySelector('[data-online-progress-label]');
      const meter = root.querySelector('[data-online-progress]');
      publishDisplay();
      if (!label || !meter) return;
      const value = progressValue;
      label.textContent = progressError || (value ? `${['withdrawal', 'recipient'].includes(state.poll?.kind) ? 'ส่งข้อมูลแล้ว' : 'ลงคะแนนแล้ว'} ${value.count} / ${value.total} ฝ่าย${value.cached ? ' · กำลังซิงก์ข้อมูล' : value.count === value.total ? ' · ครบแล้ว' : ''}` : 'กำลังโหลดจำนวนผู้ลงคะแนน');
      meter.hidden = !value || !!progressError;
      if (value) { meter.max = value.total || 1; meter.value = value.count; }
    }
    function meetingLinkPanel() {
      if (!state.online || !state.meetingId) return '';
      return `<section class="bm-meeting-link"><div><strong>ลิงก์ประจำการประชุม</strong><p class="bm-muted">แชร์ครั้งเดียว · หน้าผู้แทนจะเปลี่ยนตามรอบที่เปิด</p></div><div class="bm-share-link"><input readonly aria-label="ลิงก์ประจำการประชุม" value="${esc(window.sgcuBudgetBallots.meetingUrl(state.meetingId))}">${button('copy-vote-link', 'คัดลอกลิงก์')}</div></section>`;
    }
    async function finishOnlineMeeting() {
      if (state.meetingId) await window.sgcuBudgetBallots.finishMeeting(state.meetingId);
    }
    function onlinePanel() {
      const submission = ['withdrawal', 'recipient'].includes(state.poll.kind);
      return `<div class="bm-online-poll"><div class="bm-section-head"><h4>${submission ? 'รับข้อมูลจากผู้แทนฝ่าย' : 'รับคะแนนจากผู้แทนฝ่าย'}</h4><span class="bm-live-status">${submission ? 'เปิดรับข้อมูล' : 'เปิดลงคะแนน'}</span></div><div class="bm-vote-meter"><span data-online-progress-label aria-live="polite">กำลังโหลดจำนวนผู้ลงคะแนน</span><progress data-online-progress hidden max="1" value="0" aria-label="จำนวนฝ่ายที่ลงคะแนนแล้ว"></progress></div>${state.meetingId ? '' : `<label>ลิงก์ลงคะแนน</label><div class="bm-share-link"><input readonly value="${esc(window.sgcuBudgetBallots.url(state.poll.id))}" aria-label="ลิงก์ลงคะแนน">${button('copy-vote-link', 'คัดลอกลิงก์')}</div>`}<div class="bm-command">${button('close-online', submission ? 'ปิดรับและตรวจรายการ' : 'ปิดรับคะแนนและรวมผล', true)}</div></div>`;
    }
    async function openOnline(kind) {
      const voters = state.orgs.flatMap((o, i) => {
        if (!o.count || (kind === 'recipient' && i === project()?.org) || (kind === 'reduction' && (i === project()?.org || state.recipients.includes(i)))) return [];
        const allowedOptionIds = state.projects.flatMap((p, index) => p.org === i && !p.cancelled ? [String(index)] : []);
        if (kind === 'withdrawal' && !allowedOptionIds.length) return [];
        return [{ code: o.code, name: o.name, email: o.email, ...(kind === 'withdrawal' ? {allowedOptionIds} : {}) }];
      });
      const options = kind === 'recipient' ? [{id:'yes', label:'เสนอตัวรับงบ'}, {id:'no', label:'ไม่เสนอตัวในโครงการนี้'}] : ['nomination', 'withdrawal'].includes(kind) ? orderedProjects().flatMap(({ p, i }) => p.cancelled ? [] : [{ id: String(i), code: p.code, label: `${p.code} · ${p.name} · ${state.orgs[p.org].name} · ${money(p.budget)} บาท` }]) : [
        { id: 'yes', label: kind === 'reduction' ? 'เห็นชอบลดงบ' : 'พึงพอใจ' },
        { id: 'no', label: kind === 'reduction' ? 'ไม่เห็นชอบลดงบ' : 'ไม่พึงพอใจ' }
      ];
      const title = kind === 'withdrawal' ? 'แจ้งยกเลิกโครงการโดยสมัครใจ' : kind === 'recipient' ? `เสนอตัวรับงบ: ${project().name}` : kind === 'reduction' ? `ลงมติลดงบ: ${project().name}` : kind === 'nomination' ? 'จัดลำดับโครงการเพื่อพิจารณาลดงบ' : 'ลงมติกรอบงบประมาณ';
      const summary = kind === 'withdrawal' ? 'เลือกเฉพาะโครงการของฝ่ายที่ประสงค์ยกเลิก หากไม่ยกเลิกให้ส่งโดยไม่เลือกรายการ · ประธานจะตรวจและยืนยันก่อนเปลี่ยนยอดงบ' : kind === 'recipient' ? `${state.orgs[project().org].name}\nงบล่าสุด ${money(project().budget)} บาท\nประธานจะตรวจรายชื่อและเลือกผู้ร่วมเสนอ 1–4 ฝ่ายก่อนเริ่มอภิปราย` : kind === 'reduction'
        ? `${state.orgs[project().org].name}\nงบล่าสุด ${money(project().budget)} บาท\nฝ่ายขอรับ: ${state.recipients.map(i => state.orgs[i].name).join(', ')}\nเห็นชอบตั้งแต่ 60% ลด 25% · ตั้งแต่ 20% ลด 10% · ต่ำกว่า 20% ไม่ลด`
        : kind === 'nomination' ? `เรียงได้ไม่เกิน ${state.rankCount} อันดับ · คะแนน ${state.rankCount} ถึง 1`
          : state.orgs.map((o, i) => `${o.name}: ${money(orgTotal(i))} บาท`).join('\n');
      if (!state.meetingId) state.meetingId = await window.sgcuBudgetBallots.createMeeting(state.sourceInfo?.roundLabel || 'ประชุมพิจารณางบประมาณ');
      const id = await window.sgcuBudgetBallots.open({ title, kind, options, voters, summary, meetingId:state.meetingId, ...(kind === 'nomination' ? { rankCount: state.rankCount } : {}) });
      state.poll = { id, kind, closed: false };
      log(`เปิด${['withdrawal', 'recipient'].includes(kind) ? 'รับข้อมูล' : 'ลงคะแนน'}ผ่านบัญชีผู้แทนฝ่าย: ${id}`);
    }
    const integer = (form, name) => {
      const n = Number(new FormData(form).get(name));
      if (!Number.isSafeInteger(n) || n < 0) throw Error('กรุณากรอกจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
      return n;
    };
    function emptySourcePanel() {
      return `<section class="bm-empty-state bm-source-panel" aria-label="ชุดข้อมูลปัจจุบัน"><span class="bm-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 11h8M8 16h5"/></svg></span><div><span class="bm-section-label">ชุดข้อมูลปัจจุบัน</span><h3>ยังไม่ได้เลือกข้อมูลคำขอ</h3><p class="bm-muted">เลือกข้อมูลคำขอจากระบบ หรือนำเข้าไฟล์ JSON ที่ส่งออกจากหน้าจัดการคำของบ <br>เพื่อตรวจรายชื่อ กำหนดกรอบงบ และเริ่มประชุม</p></div><div class="bm-actions">${button('source-live', 'เลือกข้อมูลคำขอ', true)}<label class="bm-file-button">นำเข้า JSON<input type="file" data-source-file accept=".json,application/json" aria-label="นำเข้าไฟล์ JSON"></label></div>${state.error && !state.modal ? `<div class="bm-error bm-source-error" role="alert" tabindex="-1">${esc(state.error)}</div>` : ''}</section>`;
    }
    function sourcePanel() {
      if (!state.sourceInfo) return emptySourcePanel();
      return `<div class="bm-source-panel"><div><span class="bm-section-label">ชุดข้อมูลปัจจุบัน</span><h3>${state.sourceInfo ? esc(state.sourceInfo.roundLabel) : 'ยังไม่ได้เลือกข้อมูลคำขอ'}</h3><p class="bm-muted">${state.projects.length} โครงการ · ${state.orgs.length} ฝ่าย · ${state.sourceInfo?.basis === 'approvedAmount' ? 'ยอดอนุมัติ' : 'ยอดขอ'}</p></div><div class="bm-actions">${button('source-live', 'เลือกข้อมูลคำขอ', true)}<label class="bm-file-button">นำเข้า JSON<input type="file" data-source-file accept=".json,application/json" aria-label="นำเข้าไฟล์ JSON"></label></div>${state.error && state.errorSource && !state.modal ? `<div class="bm-error bm-source-error" role="alert" tabindex="-1">${esc(state.error)}</div>` : ''}</div>`;
    }
    function filterImport() {
      const query = importSearch.trim().toLocaleLowerCase('th');
      let visible = 0;
      root.querySelectorAll('.bm-import-list tbody tr').forEach(label => {
        label.hidden = !label.textContent.toLocaleLowerCase('th').includes(query);
        if (!label.hidden) visible++;
      });
      const empty = root.querySelector('.bm-search-empty');
      if (empty) empty.hidden = visible > 0;
    }
    function updateImportTotal() {
      const output = root.querySelector('.bm-import-total');
      if (!output) return;
      const ids = new Set([...root.querySelectorAll('[name="request"]:checked')].map(el => el.value));
      const rows = importRows().filter(r => ids.has(r.id));
      let cents = 0;
      for (const row of rows) cents += Math.round(amount(row.estimatedExpense) * 100);
      output.textContent = `เลือก ${rows.length} โครงการ · รวม ${money(cents / 100)} บาท`;
      const submit = root.querySelector('[data-form="import"] button[type="submit"]');
      if (submit) submit.disabled = !rows.length;
    }
    function importModal() {
      const selected = importSelection();
      const round = source.rounds.find(r => r.id === importRound);
      let ceiling = ceilingDrafts.get(importRound) ?? (Number(round.sgcuBudgetCeiling) > 0 ? money(round.sgcuBudgetCeiling) : '');
      if (ceiling !== '') { try { ceiling = money(amount(ceiling)); } catch (_) { /* Preserve invalid draft. */ } }
      return `<dialog class="bm-dialog bm-import-dialog" aria-label="เลือกชุดข้อมูลการประชุม"><form data-form="import">
        <header class="bm-import-header"><div><p>ชุดข้อมูลการประชุม</p><h3>เลือกโครงการเข้าพิจารณา</h3></div><button type="button" data-action="dismiss" class="bm-import-close" aria-label="ปิดหน้าต่างนำเข้า" title="ปิดหน้าต่าง">&times;</button></header>
        <div class="bm-import-body"><aside class="bm-import-settings"><label>รอบรับคำขอ<select data-import="round">${source.rounds.map(r => `<option value="${esc(r.id)}" ${r.id === importRound ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select></label><label>เพดานงบ อบจ. (บาท)<input name="meetingCeiling" data-ceiling-round="${esc(importRound)}" type="text" inputmode="decimal" placeholder="ยังไม่กำหนด" value="${esc(ceiling)}"><small>${Number(round.sgcuBudgetCeiling) > 0 ? 'เพดาน อบจ. จากรอบรับคำขอ' : 'ยังไม่กำหนดเพดาน อบจ. ในรอบนี้'}</small></label>${button('source-export', 'ดาวน์โหลดชุดข้อมูล')}</aside>
        <section class="bm-import-projects" aria-label="รายการโครงการ"><div class="bm-import-toolbar"><label class="bm-search filter-group">ค้นหาโครงการ<input type="search" data-import-search placeholder="ชื่อโครงการ รหัส หรือฝ่าย" value="${esc(importSearch)}"></label><div class="bm-selection-tools">${button('select-visible', 'เลือกที่แสดง')}${button('clear-selection', 'ล้างที่เลือก')}</div></div>${state.error ? `<div class="bm-error" role="alert">${esc(state.error)}</div>` : ''}<div class="project-table-wrapper bm-table-wrap bm-import-table"><table class="bm-import-list"><thead><tr><th class="bm-select-cell">เลือก</th><th>โครงการ / ฝ่าย</th><th>ยอดขอ (บาท)</th></tr></thead><tbody>${importRows().map(r => {
          const issue = importIssue(r);
          let value; try { value = amount(r.estimatedExpense); } catch (_) {}
          return `<tr data-import-row><td class="bm-select-cell"><input name="request" type="checkbox" aria-label="เลือก ${esc(r.projectName)}" value="${esc(r.id)}" ${issue ? 'disabled' : selected.has(r.id) ? 'checked' : ''}></td><td><strong>${esc(r.projectName)}</strong><small>${esc(r.projectCodeGenerated)} · ${esc(r.organizationName)}</small>${issue ? `<em>${issue}</em>` : ''}</td><td>${value === undefined ? '—' : money(value)}</td></tr>`;
        }).join('')}</tbody></table><p class="bm-search-empty" hidden>ไม่พบโครงการที่ตรงกับคำค้น</p></div></section></div>
        <footer class="bm-import-footer"><div><p class="bm-import-total" aria-live="polite"></p><p class="bm-muted">ไม่แก้ไขคำขอต้นฉบับ</p></div><div class="bm-actions">${button('dismiss', 'ยกเลิก')}<button type="submit" class="bm-primary">ใช้ชุดข้อมูลนี้</button></div></footer>
      </form></dialog>`;
    }
    function totalsTable() {
      return `<div class="project-table-wrapper bm-table-wrap"><table><thead><tr><th>ฝ่าย</th><th>งบตั้งต้น</th><th>งบล่าสุด</th><th>เปลี่ยนแปลง</th></tr></thead><tbody>${state.orgs.map((o, i) => `<tr><td>${esc(o.name)}</td><td>${money(o.ceiling)}</td><td>${money(orgTotal(i))}</td><td class="${orgTotal(i) < o.ceiling ? 'bm-negative' : ''}">${orgTotal(i) > o.ceiling ? '+' : ''}${money(orgTotal(i) - o.ceiling)}</td></tr>`).join('')}</tbody><tfoot><tr><th>รวม (บาท)</th><td>${money(state.orgs.reduce((s, o) => s + o.ceiling, 0))}</td><td>${money(state.orgs.reduce((s, _, i) => s + orgTotal(i), 0))}</td><td>${money(state.orgs.reduce((sum, o, i) => sum + orgTotal(i) - o.ceiling, 0))}</td></tr>${pendingCents() ? `<tr><th colspan="2">เศษรอจัดสรร (บาท)</th><td>${money(pendingCents() / 100)}</td><td></td></tr><tr><th colspan="2">รวมงบฝ่ายและเศษรอจัดสรร</th><td>${money((state.orgs.reduce((sum, _, i) => sum + Math.round(orgTotal(i) * 100), 0) + pendingCents()) / 100)}</td><td></td></tr>` : ''}${state.ceilingReductionCents ? `<tr><th colspan="2">ลดเพดานตามมติประธาน (บาท)</th><td>${money(state.ceilingReductionCents / 100)}</td><td></td></tr>` : ''}</tfoot></table></div>`;
    }
    function submissionIntro(kind) {
      if (state.poll?.kind === kind && !state.poll.closed) return onlinePanel();
      return `<div class="bm-vote-intro"><div><strong>${kind === 'withdrawal' ? 'ให้ฝ่ายแจ้งโครงการที่ต้องการยกเลิก' : 'ให้ฝ่ายเสนอตัวขอรับงบ'}</strong><p class="bm-muted">ผู้แทนส่งข้อมูลผ่านบัญชีของตัวเอง แล้วประธานตรวจและยืนยัน</p></div>${button(kind === 'withdrawal' ? 'open-online-withdrawal' : 'open-online-recipient', 'เปิดรับข้อมูลจากผู้แทน', true)}</div>`;
    }
    function recipientStatus(index, selected) {
      const org = state.orgs[index];
      if (!org.count) return 'ไม่มีผู้มีสิทธิ์ออกเสียง';
      if (!state.online) return `ผู้มีสิทธิ์ออกเสียง ${org.count} คน`;
      if (state.recipientSubmission?.indices.includes(index)) return 'เสนอตัวรับงบ';
      return selected ? 'ประธานเพิ่มฝ่าย' : 'ไม่ได้เสนอตัว';
    }
    function cancellationStatus(index, selected) {
      if (state.projects[index].cancelled) return 'ยกเลิกแล้ว';
      if (state.online && state.withdrawalSubmission?.indices.includes(index)) return 'ฝ่ายแจ้งยกเลิก';
      if (state.online && selected) return 'ประธานเพิ่มรายการ';
      return state.online ? 'ฝ่ายไม่ได้แจ้งยกเลิก' : 'คงโครงการ';
    }
    function cancellationForm() {
      if (state.online && !state.withdrawalSubmission && !state.projects.some(p => !p.cancelled && state.orgs[p.org].count > 0)) return `<h3>ยกเลิกโครงการโดยสมัครใจ</h3><p class="bm-muted">ไม่มีฝ่ายเจ้าของโครงการที่มีสิทธิ์ส่งรายการในรอบนี้</p><div class="bm-actions">${button('skip-online-withdrawal', 'คงทุกโครงการและตรวจยืนยัน', true)}</div>`;
      if (state.online && !state.withdrawalSubmission) return `<h3>ยกเลิกโครงการโดยสมัครใจ</h3>${submissionIntro('withdrawal')}`;
      const selected = new Set(state.cancelSelection || []);
      return `<form data-form="cancel"><h3>ยกเลิกโครงการโดยสมัครใจ</h3><p class="bm-muted">งบโครงการที่ยกเลิกยังอยู่ในฝ่ายเดิม เพื่อสนับสนุนโครงการอื่นของฝ่าย</p>${state.online ? `<p class="bm-inline-note">รับข้อมูล ${state.withdrawalSubmission.received} / ${state.withdrawalSubmission.total} ฝ่าย · ประธานตรวจยืนยันและเลือกยกเลิกเพิ่มเติมได้</p>` : ''}
      <div class="project-table-wrapper bm-table-wrap"><table class="bm-cancel-table"><thead><tr><th class="bm-select-cell">เลือก</th><th>โครงการ / ฝ่าย</th><th>งบล่าสุด (บาท)</th><th>สถานะ</th></tr></thead><tbody>${orderedProjects().map(({ p, i }) => `<tr data-cancel-row="${i}" class="${selected.has(i) ? 'is-selected' : ''}"><td class="bm-select-cell"><input type="checkbox" name="cancel" value="${i}" aria-label="เลือกยกเลิก ${esc(p.name)}" ${p.cancelled ? 'disabled' : ''} ${selected.has(i) ? 'checked' : ''}></td><td class="bm-project-cell"><strong>${esc(p.name)}</strong><small>${esc(p.code)} · ${esc(state.orgs[p.org].name)}</small></td><td class="bm-amount-cell">${money(p.budget)}</td><td class="bm-status-cell"><span class="bm-tag">${cancellationStatus(i, selected.has(i))}</span></td></tr>`).join('')}</tbody></table></div><div class="bm-command"><span class="bm-muted">ไม่เลือกโครงการ = คงทุกโครงการไว้</span><button class="bm-primary" type="submit">ยืนยันและเปิดจัดลำดับ</button></div></form>`;
    }
    function updateCancellationSelection() {
      state.cancelSelection = [...root.querySelectorAll('[name="cancel"]:checked')].map(input => Number(input.value));
      root.querySelectorAll('[name="cancel"]').forEach(input => {
        const row = input.closest('tr');
        row.classList.toggle('is-selected', input.checked);
        row.querySelector('.bm-status-cell .bm-tag').textContent = cancellationStatus(Number(input.value), input.checked);
      });
    }
    function voteForm(kind) {
      if (kind === 'satisfaction' && pendingCents()) return pendingAllocation();
      const n = kind === 'reduction' ? eligible() : totalPeople();
      if (state.online && state.poll && !state.poll.closed) return onlinePanel();
      if (!state.votes) return `<div class="bm-vote-intro"><div><span class="bm-section-label">พร้อมเปิดลงมติ</span><strong>${n} คนมีสิทธิ์ออกเสียง</strong></div>${button('open-vote', state.online ? 'เปิดลงมติผ่านบัญชีผู้แทน' : 'เปิดลงมติ', true, n === 0)}</div>`;
      if (state.votes.open) return `<form data-form="vote" class="bm-vote-form" data-eligible="${n}"><div class="bm-section-label">บันทึกผลคะแนนโดยประธาน · ผู้มีสิทธิ์ ${n} คน</div><div class="bm-fields">${field(kind === 'reduction' ? 'เห็นชอบ' : 'พึงพอใจ', 'yes', 0, n)}${field(kind === 'reduction' ? 'ไม่เห็นชอบ' : 'ไม่พึงพอใจ', 'no', 0, n)}${field('ยังไม่ลงคะแนน', 'missing', n, n)}</div><div class="bm-vote-meter"><span data-vote-balance aria-live="polite">ลงคะแนนแล้ว 0 / ${n} คน</span><progress data-vote-progress max="${n}" value="0" aria-label="จำนวนผู้ลงคะแนน"></progress></div><div class="bm-actions"><button class="bm-primary" type="submit">ปิดลงมติและประกาศผล</button></div></form>`;
      const v = state.votes;
      const outcome = kind === 'reduction' ? 'neutral' : v.yes > v.n / 2 ? 'approved' : v.no > v.n / 2 ? 'review' : 'pending';
      return `<div class="bm-result" data-outcome="${outcome}" role="status"><strong>${v.message}</strong><p>${kind === 'reduction' ? 'เห็นชอบ' : 'พึงพอใจ'} ${v.yes} · ${kind === 'reduction' ? 'ไม่เห็นชอบ' : 'ไม่พึงพอใจ'} ${v.no} · ยังไม่ลงคะแนน ${v.missing} จาก ${v.n} คน</p></div>${kind === 'reduction' ? `${allocationPreview()}<div class="bm-command">${button('apply', 'ยืนยันจัดสรรและบันทึกมติ', true)}</div>` : v.yes > v.n / 2 ? `<div class="bm-actions">${button('finish', 'รับรองยอดและปิดประชุม', true)}</div>` : v.no > v.n / 2 ? `<div class="bm-actions">${button('dissatisfied', state.step === 1 ? 'เข้าสู่การปรับจัดสรร' : state.round === 1 ? 'เริ่มพิจารณารอบที่ 2' : 'สรุปยอดรอบล่าสุดเพื่อปิดประชุม', true)}</div>` : `<p class="bm-inline-note">ยังไม่มีเสียงข้างมาก เอกสารไม่ได้กำหนดผลกรณีนี้ ประธานต้องวินิจฉัยก่อนดำเนินการต่อ</p><div class="bm-actions">${button('revote', 'เปิดลงมติใหม่')}${state.step === 6 && state.round > 1 ? button('dissatisfied', 'สรุปยอดล่าสุดเพื่อปิดประชุม', true) : ''}</div>`}`;
    }
    function reductionCriteria() {
      return `<details class="bm-notes bm-calculation-notes"><summary>เกณฑ์คำนวณผล</summary><p>เห็นชอบตั้งแต่ 60% ลด 25% · ตั้งแต่ 20% แต่ไม่ถึง 60% ลด 10% · ต่ำกว่า 20% ไม่ลด</p><p>แบ่งยอดลดเท่ากันให้ ${state.recipients.length} ฝ่ายที่ร่วมเสนอขอรับ</p></details>`;
    }
    function allocationPreview() {
      const cents = Math.round(state.votes.cut * 100);
      const count = state.recipients.length;
      const base = Math.floor(cents / count), remainder = cents % count;
      return `<section class="bm-allocation"><h4>ตรวจยอดจัดสรร</h4><div class="project-table-wrapper bm-table-wrap"><table><thead><tr><th>ฝ่ายรับงบ</th><th>ได้รับ (บาท)</th></tr></thead><tbody>${state.recipients.map(i => `<tr><td>${esc(state.orgs[i].name)}</td><td>${money(base / 100)}</td></tr>`).join('')}</tbody><tfoot><tr><th>จัดสรรทันที</th><td>${money(base * count / 100)}</td></tr><tr><th>เศษพักไว้จัดสรรท้ายรอบ</th><td>${money(remainder / 100)}</td></tr><tr><th>รวมยอดลด</th><td>${money(cents / 100)}</td></tr></tfoot></table></div>${reductionCriteria()}</section>`;
    }
    function pendingCents() {
      return (state.pending || []).reduce((sum, entry) => sum + (entry.resolved ? 0 : entry.cents), 0);
    }
    function requireAllocated() {
      if (pendingCents()) throw Error('กรุณาจัดสรรเศษคงเหลือให้ครบก่อนลงมติหรือปิดประชุม');
    }
    function pendingPool() {
      const pool = state.remainderPool ||= { selected: [], amounts: {}, note: '', decisions: [] };
      pool.cents = pendingCents();
      pool.resolved = pool.cents === 0;
      return pool;
    }
    function remainderShares(entry) {
      const selected = [...new Set(entry.selected || [])].filter(i => state.orgs[i]).sort((a, b) => String(state.orgs[a].code).localeCompare(String(state.orgs[b].code), 'en', { numeric: true }) || a - b);
      if (entry.mode === 'ceiling') return [];
      if (entry.mode === 'manual') return state.orgs.map((_, i) => ({ org: i, cents: Math.round(amount(entry.amounts?.[i] || '0') * 100) }));
      return selected.map((org, index) => ({ org, cents: Math.floor(entry.cents / selected.length) + (index < entry.cents % selected.length ? 1 : 0) }));
    }
    function pendingAllocation() {
      return `<section class="bm-allocation bm-remainder"><div class="bm-section-head"><h4>จัดสรรเศษคงเหลือ</h4><span class="bm-tag">รอจัดสรร ${money(pendingCents() / 100)} บาท</span></div>${[pendingPool()].map((entry, index) => {
        if (entry.resolved) return '';
        const mode = entry.mode || 'equal';
        const shares = mode === 'equal' ? remainderShares(entry) : [];
        return `<section><p class="bm-muted">ยอดรวมจาก ${state.pending.filter(item => !item.resolved).length} รายการ · คงเหลือ ${money(entry.cents / 100)} บาท</p><label class="bm-remainder-method">วิธีจัดการ<select data-remainder-mode="${index}"><option value="equal" ${mode === 'equal' ? 'selected' : ''}>แบ่งเท่ากันให้ฝ่ายที่เลือก</option><option value="manual" ${mode === 'manual' ? 'selected' : ''}>ระบุยอดให้แต่ละฝ่าย</option><option value="ceiling" ${mode === 'ceiling' ? 'selected' : ''}>ลดเพดานด้วยยอดคงเหลือ</option></select></label>${mode === 'ceiling' ? `<p class="bm-inline-note">ลดเพดาน ${money(entry.cents / 100)} บาท โดยไม่เปลี่ยนงบที่จัดสรรให้ฝ่ายแล้ว</p>` : `<div class="project-table-wrapper bm-table-wrap"><table class="bm-remainder-table ${mode === 'equal' ? 'is-equal' : 'is-manual'}"><thead><tr>${mode === 'equal' ? '<th class="bm-select-cell">เลือก</th>' : ''}<th>ฝ่าย</th><th>รับเพิ่ม (บาท)</th></tr></thead><tbody>${state.orgs.map((org, i) => `<tr ${mode === 'equal' ? 'data-remainder-row' : ''}>${mode === 'equal' ? `<td class="bm-select-cell"><input type="checkbox" data-pending="${index}" data-remainder="${i}" aria-label="เลือก ${esc(org.name)}" ${(entry.selected || []).includes(i) ? 'checked' : ''}></td>` : ''}<td class="bm-remainder-org">${esc(org.name)}</td><td class="bm-remainder-amount">${mode === 'equal' ? money((shares.find(a => a.org === i)?.cents || 0) / 100) : `<input type="text" inputmode="decimal" data-remainder-amount="${i}" data-pending="${index}" aria-label="ยอดเพิ่ม ${esc(org.name)}" value="${esc(entry.amounts?.[i] || '0.00')}">`}</td></tr>`).join('')}</tbody></table></div>${mode === 'equal' ? '<p class="bm-muted">เศษจากการหารรับเพิ่มฝ่ายละ 0.01 บาทตามลำดับรหัสฝ่าย ยอดแสดงในตารางก่อนยืนยัน</p>' : '<p class="bm-muted">ระบุยอดได้ไม่เกินเงินคงเหลือ ส่วนที่ยังไม่จัดสรรจะพักไว้ต่อ</p>'}`}<label class="bm-remainder-note">มติประธาน<textarea data-remainder-note="${index}" rows="2" maxlength="500">${esc(entry.note || '')}</textarea></label><div class="bm-command"><button type="button" class="bm-primary" data-action="allocate-pending" data-pending="${index}">${mode === 'ceiling' ? 'ยืนยันลดเพดาน' : 'ยืนยันจัดสรร'}</button></div></section>`;
      }).join('')}</section>`;
    }
    function rankSettings() {
      const max = state.projects.filter(p => !p.cancelled).length;
      const locked = state.ballots.length || state.poll?.kind === 'nomination' || state.nominationClosed;
      return `<div class="bm-rank-settings"><label>จำนวนอันดับต่อบัตร<input type="number" data-rank-count min="1" max="${max}" step="1" value="${state.rankCount}" ${locked ? 'disabled' : ''}></label><div><p class="bm-muted">อันดับ 1 ได้ <strong>${state.rankCount} คะแนน</strong> ลดลงอันดับละ 1 คะแนน</p><p class="bm-muted">เลือกไม่ซ้ำและเรียงอันดับต่อเนื่อง · นำเข้าพิจารณาสูงสุด ${state.rankCount} โครงการ</p>${locked ? '<small class="bm-muted">จำนวนอันดับถูกล็อกหลังเริ่มรับบัตร</small>' : ''}</div></div>`;
    }
    function projectHeader(p, badge) {
      const canSwitch = !state.exception && !state.votes && !(state.poll && !state.poll.closed);
      return `<header class="bm-project-header"><div class="bm-project-title"><h3>${esc(p.name)}</h3><p><span>${esc(state.orgs[p.org].name)}</span><span class="bm-project-budget">งบล่าสุด <strong>${money(p.budget)}</strong> บาท</span></p></div><div class="bm-project-actions"><span class="bm-tag">${badge}</span>${canSwitch ? button('switch-project', 'พักรายการนี้ / เลือกโครงการอื่น') : ''}</div></header>`;
    }
    function summaryContent() {
      const initial = state.orgs.reduce((sum, org) => sum + org.ceiling, 0);
      const current = state.orgs.reduce((sum, _, i) => sum + orgTotal(i), 0);
      const change = current - initial;
      return `<section class="bm-summary-budget"><div class="bm-section-head"><div><h3>สรุปงบและลงมติความพึงพอใจ</h3><p class="bm-muted">ตรวจสอบยอดจัดสรรล่าสุดของแต่ละฝ่ายก่อนลงมติ</p></div><span class="bm-tag">รอบที่ ${state.round}</span></div><dl class="bm-summary-totals"><div><dt>งบตั้งต้นรวม</dt><dd>${money(initial)} <small>บาท</small></dd></div><div><dt>งบจัดสรรล่าสุด</dt><dd>${money(current)} <small>บาท</small></dd></div><div><dt>เปลี่ยนแปลงจากงบตั้งต้น</dt><dd>${change > 0 ? '+' : ''}${money(change)} <small>บาท</small></dd></div></dl>${totalsTable()}<details class="bm-notes bm-summary-details"><summary>รายละเอียดงบคงอยู่ในฝ่ายและงบรับจัดสรร</summary><div class="project-table-wrapper bm-table-wrap"><table><thead><tr><th>ฝ่าย</th><th>งบจากการยกเลิก</th><th>รับแบ่งงบ</th></tr></thead><tbody>${state.orgs.map(o => `<tr><td>${esc(o.name)}</td><td>${money(o.reserve)}</td><td>${money(o.grant)}</td></tr>`).join('')}</tbody></table></div></details></section><section class="bm-summary-ballot" aria-label="ลงมติความพึงพอใจ"><h4>${pendingCents() ? 'จัดสรรเศษคงเหลือก่อนลงมติ' : 'ลงมติความพึงพอใจ'}</h4><p class="bm-muted">${pendingCents() ? 'จัดการยอดคงเหลือให้ครบก่อนเปิดรับคะแนน' : 'พิจารณาจากยอดจัดสรรล่าสุดในตารางด้านบน'}</p>${voteForm('satisfaction')}</section>`;
    }
    function content() {
      const s = state;
      if (s.step === 0 && !s.sourceInfo) return '';
      if (s.step === 0) return `<form data-form="setup" class="${registryUI ? 'bm-registry-setup' : ''}"><div class="bm-section-head"><div><h3>ตรวจรายชื่อและแจ้งกรอบงบ</h3><p class="bm-muted">${s.sourceInfo ? `สำเนารอบ ${esc(s.sourceInfo.roundLabel)} · ${s.projects.length} โครงการ` : `ทะเบียนฝ่าย ${s.orgs.length} ฝ่าย`} · เหรัญญิกเป็นประธาน</p></div><span class="bm-tag">ก่อนเปิดประชุม</span></div>${isStaffPage ? `<label class="bm-check"><input type="checkbox" name="online" ${s.online ? 'checked' : ''}>ลงคะแนนผ่านบัญชีผู้แทนฝ่าย (1 ฝ่าย 1 เสียง)</label>` : ''}<div class="project-table-wrapper bm-table-wrap"><table><thead><tr><th>ฝ่าย / งบตั้งต้น</th><th>ผู้มีสิทธิ์ออกเสียง</th><th>${registryUI ? 'ผู้แทนฝ่าย' : 'ผู้แทนที่แจ้งก่อนประชุม'}</th></tr></thead><tbody>${s.orgs.map((o, i) => `<tr><td><span class="bm-cell-main">${esc(o.name)}</span><small class="bm-org-code">${esc(o.code || "")}</small><span class="bm-org-budget">${money(o.ceiling)} <small>บาท</small></span></td><td><div class="bm-people-input"><input aria-label="จำนวนผู้มีสิทธิ์ ${esc(o.name)}" name="count${i}" type="number" min="0" max="100" value="${o.count}" required><span>คน</span></div></td><td>${registryUI ? representativeSelect(o, i) : `<input aria-label="ผู้แทน ${esc(o.name)}" name="proxy${i}" type="text" maxlength="100" placeholder="ชื่อผู้แทน (ถ้ามี)" value="${esc(o.proxy)}">`}</td></tr>`).join('')}</tbody></table></div>${registryUI ? '' : '<p class="bm-muted">จำนวนผู้มีสิทธิ์รวมผู้แทนแล้ว ผู้แทนใช้สิทธิ์แทนเจ้าของสิทธิ์ ไม่เพิ่มเสียง</p>'}<details class="bm-notes bm-agreement"><summary>หลักเกณฑ์การประชุม</summary><p>ใช้เสียงมากกว่าครึ่งของผู้มีสิทธิ์รอบนั้นเป็นเสียงข้างมาก และตัดสิทธิ์ฝ่ายเจ้าของโครงการกับฝ่ายร่วมเสนอขอรับออกจากรอบลดงบ</p><p>รอบซ้ำคิดอัตราลดจากงบล่าสุด งบที่แบ่งให้ฝ่ายเก็บเป็นยอดรอจัดสรร ยังไม่ลงโครงการปลายทาง หากมีเศษสตางค์ ให้พักรวมเป็นยอดเดียว แล้วให้ประธานแบ่งเท่ากัน ระบุยอดให้ฝ่ายใดก็ได้ หรือลดเพดาน หลังพิจารณาครบรอบ ก่อนลงมติความพึงพอใจ</p><p>กรณีเสมอทั้งคะแนนและเพดานงบที่อันดับสุดท้ายของจำนวนโครงการที่ประธานกำหนด จะไม่เลือกแทนประธาน ต้องวินิจฉัยก่อนดำเนินการต่อ</p></details><div class="bm-command"><label class="bm-check"><input type="checkbox" name="ack" required>แจ้งกรอบงบและตรวจสิทธิ์แล้ว</label><button class="bm-primary" type="submit" ${s.projects.length ? '' : 'disabled'}>เปิดประชุมและลงมติกรอบงบ</button></div></form>`;
      if (s.step === 1) return `<h3>พึงพอใจต่อกรอบงบประมาณหรือไม่</h3>${s.sourceInfo ? `<div class="bm-budget-context"><span>ลดจากยอดขอ <strong>${money(s.sourceInfo.initialCutPercent || 0)}%</strong></span><span>เพดาน อบจ. <strong>${s.sourceInfo.meetingCeiling === null ? 'ยังไม่กำหนด' : `${money(s.sourceInfo.meetingCeiling)} บาท`}</strong></span></div>` : ''}${totalsTable()}${voteForm('satisfaction')}`;
      if (s.step === 2) return cancellationForm();
      if (s.step === 3 && s.ranked) return `<div class="bm-section-head"><div><h3>เลือกโครงการที่จะพิจารณา</h3><p class="bm-muted">พิจารณาแล้ว ${s.cursor} / ${s.queue.length} โครงการ · อันดับคะแนนคงเดิม</p></div><span class="bm-tag">คงเหลือ ${s.queue.length - s.cursor} โครงการ</span></div><div class="project-table-wrapper bm-table-wrap"><table class="bm-ranked-table"><thead><tr><th>อันดับ</th><th>โครงการ / ฝ่าย</th><th>คะแนน</th><th>เพดานเดิม (บาท)</th><th>เพดานใหม่ (บาท)</th></tr></thead><tbody>${s.ranked.filter(x => s.queue.slice(s.cursor).includes(x.id)).map(x => `<tr data-action="choose-project" data-project="${x.id}" tabindex="0" aria-label="พิจารณา ${esc(s.projects[x.id].name)}"><td><span class="bm-rank-number">${s.ranked.findIndex(item => item.id === x.id) + 1}</span></td><td><div class="bm-ranked-project"><div><small>${esc(s.projects[x.id].code)}</small><strong>${esc(s.projects[x.id].name)}</strong><small>${esc(s.orgs[s.projects[x.id].org].name)}</small></div></div></td><td><strong>${x.score}</strong></td><td>${money(x.budget)}</td><td>${money(s.projects[x.id].budget)}</td></tr>`).join('') || '<tr><td colspan="5">ไม่มีโครงการรอพิจารณา</td></tr>'}</tbody></table></div>${s.cursor ? `<details class="bm-notes"><summary>ดำเนินการแล้ว ${s.cursor} โครงการ</summary><ol class="bm-completed-projects">${s.queue.slice(0, s.cursor).map(id => `<li>${esc(s.projects[id].code)} · ${esc(s.projects[id].name)}</li>`).join('')}</ol></details>` : ''}${s.queue.length === s.cursor ? `<div class="bm-command">${button('start-queue', 'ไปสรุปงบและลงมติ', true)}</div>` : ''}`;
      if (s.step === 3 && s.online) return `<h3>ลงคะแนนจัดลำดับโครงการ</h3>${rankSettings()}${s.poll && !s.poll.closed ? onlinePanel() : s.nominationClosed ? `<p>รับคะแนน ${s.ballots.length} / ${totalPeople()} ฝ่าย</p><div class="bm-actions">${!s.ballots.length ? button('open-online-nomination', 'เปิดลงคะแนนใหม่') : ''}${button('rank', 'ประกาศอันดับ', true, !s.ballots.length)}</div>` : button('open-online-nomination', 'เปิดลงคะแนนผ่านบัญชีผู้แทน', true)}`;
      if (s.step === 3) return `<section class="bm-rank-overview"><div class="bm-section-head"><div><h3>ลงคะแนนจัดลำดับโครงการ</h3><p class="bm-muted">เลือกโครงการตามลำดับความสำคัญ แล้วบันทึกทีละบัตร</p></div><span class="bm-tag">รับบัตร ${s.ballots.length} / ${totalPeople()} ใบ</span></div>${rankSettings()}</section><form data-form="nominate" class="bm-rank-ballot">${window.sgcuRankingUI.render(s.rankCount || 10, orderedProjects().filter(({p}) => !p.cancelled).map(({p,i}) => ({id:String(i),code:p.code,label:`${p.code} · ${p.name} · ${s.orgs[p.org].name}`})), 'nominee')}<div class="bm-command"><button type="submit" class="${s.ballots.length < totalPeople() ? 'bm-primary' : ''}" ${s.ballots.length >= totalPeople() ? 'disabled' : ''}>บันทึกบัตรลงคะแนน 1 ใบ</button>${button('rank', 'ปิดรับบัตรและประกาศอันดับ', s.ballots.length >= totalPeople(), !s.ballots.length)}</div></form>`;
      if (s.step === 4) {
        const p = project();
        if (s.online && !s.recipientSubmission && s.orgs.some((o,i)=>o.count > 0 && i !== p.org)) return `${projectHeader(p, `ลำดับ ${s.cursor + 1} / ${s.queue.length}`)}<h4>ฝ่ายที่เสนอขอรับงบ</h4>${submissionIntro('recipient')}`;
        return `${projectHeader(p, s.exception ? 'วาระกรณีขาดประชุม' : `ลำดับ ${s.cursor + 1} / ${s.queue.length}`)}<h4>ฝ่ายที่เสนอขอรับงบ</h4><p class="bm-muted">เลือกผู้เข้าร่วมนำเสนอ 1–4 ฝ่าย · ฝ่ายเจ้าของโครงการไม่มีสิทธิ์ขอรับจากโครงการตนเอง</p>${s.online && s.recipientSubmission ? `<p class="bm-inline-note">รับข้อมูล ${s.recipientSubmission.received} / ${s.recipientSubmission.total} ฝ่าย · เสนอตัว ${s.recipientSubmission.indices.length} ฝ่าย · ประธานเพิ่มฝ่ายขอรับงบได้${s.recipientSubmission.indices.length > 4 ? ' · กรุณาเลือกไม่เกิน 4 ฝ่าย' : ''}</p>` : ''}<form data-form="recipients"><div class="bm-choice-list">${s.orgs.map((o, i) => i === p.org ? '' : `<label><input type="checkbox" name="recipient" value="${i}" ${o.count === 0 ? 'disabled' : ''} ${s.online && s.recipientSubmission?.indices.includes(i) && s.recipientSubmission.indices.length <= 4 ? 'checked' : ''}><span>${esc(o.name)}<small>${recipientStatus(i, false)}</small></span></label>`).join('')}</div><div class="bm-command">${button('skip', 'ไม่มีผู้ขอรับ / ข้ามโครงการ', false, Boolean(s.online && s.recipientSubmission?.indices.length))}<button class="bm-primary" type="submit">ยืนยันฝ่ายและเริ่มอภิปราย</button></div></form>`;
      }
      if (s.step === 5) {
        const p = project();
        return `${projectHeader(p, `ผู้มีสิทธิ์ ${eligible()} คน`)}<div class="bm-recipient-line">ฝ่ายขอรับ: ${s.recipients.map(i => esc(s.orgs[i].name)).join(' · ')}</div><ol class="bm-hearing-steps">${['เจ้าของชี้แจง · 5 นาที', 'ฝ่ายขอรับซักถามร่วมกัน · 5 นาที', 'เจ้าของกล่าวปิด · 30 วินาที', 'ลงมติลดงบ'].map((t, i) => `<li ${s.stage === i ? 'aria-current="step"' : ''}><span>${i + 1}</span>${t}</li>`).join('')}</ol>${s.stage < 3 ? `<div class="bm-timer"><div><span>${['เจ้าของโครงการชี้แจง', 'เวลาซักถามรวมทุกฝ่าย', 'เจ้าของโครงการกล่าวปิด'][s.stage]}</span><output data-clock>${clockText()}</output></div><div class="bm-actions">${button('timer', remaining === 0 ? 'หมดเวลา' : timer ? 'พักเวลา' : 'เริ่มเวลา', remaining > 0, remaining === 0)}${button('next-stage', s.stage === 2 ? 'จบอภิปรายและเตรียมลงมติ' : 'จบช่วงนี้ / ไปช่วงถัดไป', remaining === 0)}</div></div>` : `<h4>สมควรลดงบประมาณโครงการนี้หรือไม่</h4><p class="bm-muted">ตัดสิทธิ์ฝ่ายเจ้าของโครงการและ ${s.recipients.length} ฝ่ายที่ร่วมเสนอขอรับแล้ว</p>${voteForm('reduction')}${!s.votes || s.votes.open ? reductionCriteria() : ''}`}`;
      }
      if (s.step === 6) return summaryContent();
      return `<div class="bm-closed"><span class="bm-tag">สิ้นสุดการประชุม</span><h3>${esc(s.closed)}</h3><p class="bm-muted">สรุปผลในหน้านี้ · ยังไม่ปรับยอดอนุมัติในคำขอต้นฉบับ</p></div>${totalsTable()}<div class="bm-command">${button('export', 'ดาวน์โหลดสรุปการประชุม', true)}${button('reset', 'เริ่มการประชุมใหม่')}</div>`;
    }
    async function applyImportedSource({ orgs, projects, sourceInfo }) {
      await finishOnlineMeeting();
      const uid = window.sgcuAuth?.auth.currentUser?.uid;
      if (isStaffPage && uid) sessionStorage.removeItem(`sgcu-budget-meeting:${uid}`);
      reset(); state.orgs = orgs; state.projects = projects; state.sourceInfo = sourceInfo;
      pendingImport = null;
      log(`นำเข้าสำเนา ${projects.length} โครงการ จาก ${sourceInfo.roundLabel} โดยใช้ยอดขอ`);
    }
    function modal() {
      if (state.modal === 'replace-source') return `<dialog class="bm-dialog" aria-label="ยืนยันเปลี่ยนชุดข้อมูล"><h3>เปลี่ยนชุดข้อมูลและเริ่มการประชุมใหม่?</h3><p>ผลลงคะแนนและประวัติการประชุมในหน้านี้จะถูกล้าง เพื่อเริ่มด้วยชุดข้อมูลที่เลือก</p><p class="bm-muted">ไม่แก้ไขคำขอต้นฉบับหรือคะแนนที่บันทึกผ่านบัญชีไว้ในระบบ</p><div class="bm-actions">${button('cancel-replace-source', 'กลับไปเลือกข้อมูล')}${button('confirm-replace-source', 'เปลี่ยนชุดข้อมูลและเริ่มใหม่', true)}</div></dialog>`;

      if (!state.modal) return '';
      if (state.modal === 'back') return `<dialog class="bm-dialog" aria-label="ยืนยันย้อนกลับ"><h3>ย้อนกลับการดำเนินการล่าสุด?</h3><p>คืนข้อมูลและยอดงบก่อนการดำเนินการล่าสุด การแก้ไขหลังจากจุดนั้นจะถูกยกเลิก</p><p class="bm-muted">ไม่ลบคะแนนที่ผู้แทนส่งผ่านบัญชี และไม่ย้อนข้ามการเปิดหรือปิดลงคะแนนออนไลน์</p><div class="bm-actions">${button('dismiss', 'อยู่หน้านี้')}${button('back-confirm', 'ยืนยันย้อนกลับ', true)}</div></dialog>`;
      if (state.modal === 'import') return importModal();
      if (state.modal === 'reset') return `<dialog class="bm-dialog" aria-label="วาระและการยืนยัน"><h3>เริ่มการประชุมใหม่?</h3><p>ผลและประวัติการประชุมในหน้านี้จะถูกล้าง</p><div class="bm-actions">${button('dismiss', 'กลับ')}${button('reset-confirm', 'ล้างและเริ่มใหม่', true)}</div></dialog>`;
      return `<dialog class="bm-dialog" aria-label="วาระและการยืนยัน"><form data-form="exception"><h3>วาระเพิ่มเติม</h3>${state.error ? `<div class="bm-error" role="alert">${esc(state.error)}</div>` : ""}<label>ประเภทวาระ<select name="type"><option value="switch">เปลี่ยนเป็นประชุมพิจารณาโครงการ</option><option value="absence">พิจารณาฝ่ายที่ขาดประชุม</option></select></label><label>โครงการที่เกี่ยวข้อง<select name="project">${orderedProjects().map(({ p, i }) => p.cancelled ? '' : `<option value="${i}">${esc(p.name)}</option>`).join('')}</select></label><label>บันทึกเหตุและมติประธาน<textarea name="note" required maxlength="500" rows="3"></textarea></label><p class="bm-muted">เปลี่ยนประเภทประชุม: ที่ประชุมต้องเห็นชอบก่อนปิดประชุมงบและส่งต่อให้นายกฯ<br>ขาดประชุม: ต้องยืนยันว่าไม่มีผู้เข้าร่วม/ผู้แทนและไม่มีเหตุอันสมควร แล้วลงมติลดงบแยกต่างหาก</p><label class="bm-check"><input type="checkbox" name="confirmed" required>ตรวจเงื่อนไขและรับรองมติข้างต้นแล้ว</label><div class="bm-actions">${button('dismiss', 'กลับ')}<button class="bm-primary" type="submit">บันทึกวาระ</button></div></form></dialog>`;
    }
    function clockText() { return `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`; }
    function render() {
      const uid = window.sgcuAuth?.auth.currentUser?.uid;
      if (isStaffPage && uid && state.online) {
        try { sessionStorage.setItem(`sgcu-budget-meeting:${uid}`, JSON.stringify(state)); }
        catch (_) { state.error = 'ไม่สามารถเก็บสถานะประชุมในแท็บนี้ได้ กรุณาอย่าปิดหรือรีเฟรชหน้า'; }
      }
      const budget = state.orgs.reduce((sum, o) => sum + o.ceiling, 0);
      root.dataset.phase = state.step;
      root.classList.toggle('bm-ranking-active', state.step === 3 && !state.online && !state.ranked);
      root.innerHTML = `<header class="bm-meeting-header"><div class="bm-heading-copy"><h2>ประชุมพิจารณางบประมาณ</h2><p class="bm-meeting-status"><span>${state.online ? 'ลงคะแนนผ่านบัญชีผู้แทน' : 'บันทึกคะแนนโดยประธาน'}</span><span>${state.online ? 'บันทึกคะแนนลงระบบ' : 'ผลการประชุมยังไม่บันทึกลงระบบ'}</span></p></div><div class="bm-heading-actions"><span class="bm-round-label">รอบจัดสรรที่ ${state.round}</span>${button('open-display', 'เปิดจอห้องประชุม')}${button('reset', 'เริ่มใหม่')}</div></header>
      <nav class="bm-workflow" aria-label="ขั้นตอนการประชุม"><ol>${steps.map((t, i) => `<li title="${esc(t)}" ${state.step === i ? 'aria-current="step"' : ''} class="${i < state.step ? 'is-past' : ''}"><span>${i + 1}</span><b>${t}</b></li>`).join('')}</ol></nav>
      <div class="bm-shell">
      <aside class="bm-sidebar"><div class="bm-side-heading">สรุปการประชุม<span class="bm-tag">${state.step === 7 ? 'สิ้นสุด' : state.step === 0 ? 'เตรียมการ' : 'กำลังดำเนินการ'}</span></div><dl class="bm-meeting-meta"><div><dt class="card-title">งบตั้งต้นรวม</dt><dd>${money(budget)} <small>บาท</small></dd></div><div><dt class="card-title">เพดานงบ อบจ.</dt><dd>${state.sourceInfo?.meetingCeiling == null ? `<small>${state.sourceInfo ? 'ยังไม่กำหนด' : 'ยังไม่ได้เลือกรอบ'}</small>` : `${money(state.sourceInfo.meetingCeiling)} <small>บาท</small>`}</dd></div><div><dt class="card-title">ผู้มีสิทธิ์</dt><dd><span data-people-total>${totalPeople()}</span> <small>คน</small></dd></div><div><dt class="card-title">โครงการ / ฝ่าย</dt><dd>${state.projects.length} <small>โครงการ</small> · ${state.orgs.length} <small>ฝ่าย</small></dd></div></dl>
      <div class="bm-side-source"><span>แหล่งข้อมูล</span><strong>${state.sourceInfo ? esc(state.sourceInfo.roundLabel) : 'ยังไม่ได้เลือกข้อมูลคำขอ'}</strong><small>${state.sourceInfo?.basis === 'approvedAmount' ? 'ใช้ยอดอนุมัติ' : 'ใช้ยอดขอ'}</small></div>
      
      <details class="bm-notes bm-history" ${state.step === 7 ? 'open' : ''}><summary>ประวัติการพิจารณา <b>${state.logs.length}</b></summary>${state.logs.length ? `<ol class="bm-log">${state.logs.map(l => `<li><small>รอบ ${l.round}</small><span>${esc(l.text)}</span></li>`).join('')}</ol>` : '<p class="bm-history-empty">ยังไม่มีการลงมติ · บันทึกจะแสดงที่นี่เมื่อเริ่มพิจารณา</p>'}</details></aside>
${meetingLinkPanel()}<header class="bm-current"><div><span>ขั้นตอน ${state.step + 1} จาก 8</span><h3>${steps[state.step]}</h3></div><div class="bm-current-actions">${state.step > 0 && state.step < 7 ? button('exception', 'เพิ่มวาระพิเศษ', false, Boolean(state.votes?.open) || state.exception) : ''}${button('back', 'ย้อนกลับ', false, !undoStack.length || Boolean(state.poll && !state.poll.closed))}</div></header>${state.step === 0 ? sourcePanel() : ''}<section class="bm-work" tabindex="-1" ${state.step === 0 && !state.sourceInfo ? 'hidden' : ''}>${state.error && !state.modal && !(state.errorSource && state.step === 0) ? `<div class="bm-error" role="alert" tabindex="-1">${esc(state.error)}</div>` : ''}${content()}</section></div>
      ${state.modal ? `<div class="bm-dialog-backdrop">${modal()}</div>` : ''}`;

      root.querySelectorAll('[data-form="cancel"]').forEach(form => {
        const list = form.querySelector('.bm-table-wrap, .bm-choice-list');
        if (!list) return;
        list.insertAdjacentHTML('beforebegin', `<div class="bm-list-filter"><label class="filter-group">ค้นหาโครงการ<input type="search" data-meeting-filter placeholder="ชื่อโครงการ รหัส หรือฝ่าย" autocomplete="off"></label><span data-filter-count aria-live="polite"></span></div><p class="bm-filter-empty bm-muted" hidden>ไม่พบรายการที่ตรงกับคำค้น</p>`);
        updateMeetingFilter(form);
      });
      syncVoteProgress();
      const dialog = root.querySelector('dialog');
      if (dialog) {
        dialog.showModal();
        updateImportTotal();
        filterImport();
        dialog.addEventListener('cancel', event => { event.preventDefault(); state.modal = ''; render(); });
      }
    }
    function updateMeetingFilter(form) {
      const input = form.querySelector('[data-meeting-filter]');
      if (!input) return;
      const query = input.value.trim().toLocaleLowerCase('th');
      const rows = [...form.querySelectorAll('tbody tr, .bm-choice-list > label')];
      let visible = 0;
      rows.forEach(row => { row.hidden = !row.textContent.toLocaleLowerCase('th').includes(query); if (!row.hidden) visible++; });
      form.querySelector('[data-filter-count]').textContent = `${visible} / ${rows.length} รายการ`;
      form.querySelector('.bm-filter-empty').hidden = visible > 0;
    }
    function advanceQueue() {
      if (state.exception) {
        const saved = state.saved;
        Object.assign(state, saved, { exception: false, votes: null });
        remaining = state.savedRemaining;
        stopTimer();
        return;
      }
      state.cursor++;
      state.recipients = [];
      go(state.cursor < state.queue.length ? 3 : 6);
    }
    root.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || (state.poll && !state.poll.closed)) return;
      const form = event.target;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const previous = checkpoint();
      busy = true;
      try {
        state.error = '';
        switch (form.dataset.form) {
          case 'import': {
            const selected = new Set(data.getAll('request'));
            const rows = importRows().filter(r => selected.has(r.id));
            if (!rows.length) throw Error('กรุณาเลือกอย่างน้อย 1 โครงการ');
            const orgs = [], projects = [], keys = new Map();
            const addOrg = (code, name, catalog = {}) => {
              if (!keys.has(code)) {
                keys.set(code, orgs.length);
                const existing = state.orgs.find(o => o.code === code);
                orgs.push({ code, name, ...representativeData(catalog, isStaffPage ? existing : null), type: 'อบจ.', count: isStaffPage ? existing?.count ?? 1 : 1, proxy: isStaffPage ? existing?.proxy ?? '' : '', reserve: 0, grant: 0, ceiling: 0 });
              }
              return keys.get(code);
            };
            const roundSource = source.rounds.find(r => r.id === importRound);
            roundSource.organizations.forEach(o => addOrg(o.code, o.name, o));
            for (const r of rows) {
              const budget = amount(r.estimatedExpense);
              const key = parentCode(r.projectCodeGenerated);
              if (!key) throw Error('นำเข้าได้เฉพาะโครงการรหัส SGCU-XX.XX.XX');
              const parentRow = source.requests.find(item => item.budgetRoundId === importRound && item.organizationCode === key);
              const org = addOrg(key, parentRow?.organizationName || `ฝ่าย ${key}`);
              orgs[org].ceiling = Math.round((orgs[org].ceiling + budget) * 100) / 100;
              projects.push({ id: r.id, code: r.projectCodeGenerated, name: r.projectName, org, original: budget, budget, cancelled: false });
            }
            const ceilingText = String(data.get('meetingCeiling') ?? '').trim();
            const meetingCeiling = ceilingText ? amount(ceilingText) : null;
            const sourceInfo = { roundId: importRound, roundLabel: source.rounds.find(r => r.id === importRound).label, basis: 'estimatedExpense', importedAt: new Date().toISOString(), meetingCeiling };
            sourceInfo.initialCutPercent = applyInitialCeiling(projects, meetingCeiling);
            const imported = { orgs, projects, sourceInfo };
            if (state.sourceInfo && (state.step > 0 || state.logs.length > 1 || state.votes || state.ballots.length || state.closed)) {
              pendingImport = imported;
              state.modal = 'replace-source';
            } else await applyImportedSource(imported);
            break;
          }
          case 'setup': {
            if (!state.projects.length) throw Error('กรุณาเลือกโครงการก่อนเปิดประชุม');
            const counts = state.orgs.map((_, i) => integer(form, `count${i}`));
            if (!counts.some(Boolean)) throw Error('ต้องมีผู้มีสิทธิ์อย่างน้อย 1 คน');
            const online = data.has('online');
            const emails = state.orgs.map(o => o.email || '');
            if (online) {
              if (!window.sgcuBudgetBallots || !window.sgcuAuth?.auth.currentUser) throw Error('กรุณาเข้าสู่ระบบเพื่อเปิดลงคะแนนผ่านบัญชี');
              if (counts.some(n => n > 1)) throw Error('ลงคะแนนผ่านบัญชีใช้ได้ฝ่ายละ 1 เสียงเท่านั้น');
              const selectedEmails = emails.filter((_, i) => counts[i] > 0);
              if (selectedEmails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw Error('กรุณาระบุอีเมลบัญชีผู้แทนทุกฝ่ายที่มีสิทธิ์');
              if (new Set(selectedEmails).size !== selectedEmails.length) throw Error('อีเมลผู้แทนต้องไม่ซ้ำกันระหว่างฝ่าย');
            }
            state.online = online;
            if (online) state.hostUid = window.sgcuAuth.auth.currentUser.uid;
            state.orgs.forEach((o, i) => { o.email = emails[i]; });
            state.orgs.forEach((o, i) => { o.count = counts[i]; o.proxy = isStaffPage ? (o.members.find(m => m.id === o.representativeId)?.name || '') : String(data.get(`proxy${i}`) || '').trim(); });
            log('แจ้งกรอบงบและตรวจผู้มีสิทธิ์ก่อนเปิดประชุมแล้ว'); go(1); break;
          }
          case 'vote': {
            if (state.online) throw Error('รอบนี้รับคะแนนผ่านบัญชีผู้แทนเท่านั้น');
            recordVotes(integer(form, 'yes'), integer(form, 'no'), integer(form, 'missing')); break;
          }
          case 'cancel': {
            if (state.online && !state.withdrawalSubmission) throw Error('กรุณาปิดรับข้อมูลก่อนยืนยันยกเลิกโครงการ');
            if (data.getAll('cancel').some(id => !Number.isInteger(Number(id)) || !state.projects[Number(id)])) throw Error('ไม่พบโครงการที่เลือก');
            for (const id of data.getAll('cancel').map(Number)) {
              const p = state.projects[id];
              if (p.cancelled) continue;
              state.orgs[p.org].reserve += p.budget;
              log(`${state.online && !state.withdrawalSubmission.indices.includes(id) ? 'ประธานเพิ่มรายการยกเลิก (ฝ่ายไม่ได้แจ้ง)' : 'เจ้าของฝ่ายสมัครใจยกเลิก'} ${esc(p.name)}; เก็บ ${money(p.budget)} บาทในฝ่ายเดิม`);
              p.budget = 0; p.cancelled = true;
            }
            state.cancelSelection = [];
            state.ballots = []; state.ranked = null; state.nominationClosed = false; state.poll = null;
            state.rankCount = Math.min(10, state.projects.filter(p => !p.cancelled).length);
            go(state.projects.every(p => p.cancelled) ? 6 : 3); break;
          }
          case 'nominate': {
            const values = data.getAll('nominee');
            const ballot = values.filter(v => v !== '').map(Number);
            if (values.slice(0, ballot.length).includes('') || new Set(ballot).size !== ballot.length || ballot.length > state.rankCount || ballot.some(i => !state.projects[i] || state.projects[i].cancelled)) throw Error('กรุณาเรียงอันดับต่อเนื่องและไม่เลือกโครงการซ้ำ');
            if (state.ballots.length >= totalPeople()) throw Error('รับบัตรครบจำนวนผู้มีสิทธิ์แล้ว');
            state.ballots.push(ballot); break;
          }
          case 'recipients': {
            const ids = data.getAll('recipient').map(Number);
            if (ids.some(i => !state.orgs[i] || i === project().org || state.orgs[i].count === 0) || (state.online && !state.recipientSubmission)) throw Error('กรุณาปิดรับข้อมูลและเลือกเฉพาะฝ่ายที่มีสิทธิ์ขอรับงบ');
            if (!ids.length || ids.length > 4) throw Error('เลือกฝ่ายขอรับงบ 1–4 ฝ่าย');
            if (!state.orgs.some((o, i) => o.count > 0 && i !== project().org && !ids.includes(i))) throw Error('ไม่เหลือผู้มีสิทธิ์ลงมติหลังตัดฝ่ายที่ร่วมเสนอออก');
            if (state.online) {
              const added = ids.filter(i => !state.recipientSubmission.indices.includes(i));
              if (added.length) log(`ประธานเพิ่มฝ่ายขอรับงบ (ไม่ได้เสนอตัว): ${added.map(i => state.orgs[i].name).join(', ')} สำหรับ ${project().name}`);
            }
            state.recipients = ids; state.stage = state.exception ? 3 : 0; remaining = 300; go(5);
            log(`พิจารณา ${project().name}; ฝ่ายขอรับ ${ids.map(i => state.orgs[i].name).join(', ')}`); break;
          }
          case 'exception': {
            const note = String(data.get('note')).trim();
            if (!note) throw Error('กรุณาบันทึกเหตุและคำวินิจฉัย');
            if (data.get('type') === 'switch') {
              requireAllocated();
              await finishOnlineMeeting();
              log(`ที่ประชุมเห็นชอบเปลี่ยนประเภท: ${note}`); state.closed = 'ปิดประชุมงบ ส่งต่อให้นายกฯ เปิดประชุมพิจารณาโครงการ'; go(7);
            } else {
              const id = Number(data.get('project'));
              if (state.orgs[state.projects[id].org].count !== 0) throw Error('ฝ่ายนี้มีผู้เข้าร่วมหรือผู้แทน ไม่เข้าเงื่อนไขขาดประชุม');
              state.saved = { step: state.step, queue: state.queue, cursor: state.cursor, recipients: state.recipients, stage: state.stage, votes: state.votes };
              state.savedRemaining = remaining;
              state.exception = true; state.queue = [id]; state.cursor = 0; state.recipients = [];
              log(`วาระขาดประชุม ${state.projects[id].name}: ${note}`); go(4);
            }
            state.modal = ''; break;
          }
        }
      } catch (error) {
        state.error = error.message;
        let alert = form.querySelector('.bm-error');
        if (!alert) { alert = document.createElement('div'); alert.className = 'bm-error'; alert.setAttribute('role', 'alert'); alert.tabIndex = -1; form.prepend(alert); }
        alert.textContent = state.error;
        alert.focus();
        return;
      }
      finally { busy = false; }
      if (state.meetingId && state.step === 7) undoStack.length = 0;
      else if (form.dataset.form !== 'import') remember(previous);
      render();
      root.querySelector(state.modal ? 'dialog textarea' : '.bm-work')?.focus({ preventScroll: true });
    });
    root.addEventListener('click', async event => {
      const remainderRow = event.target.closest('[data-remainder-row]');
      if (remainderRow && !event.target.closest('input,button,a,label,select,textarea')) {
        remainderRow.querySelector('[data-remainder]')?.click();
        return;
      }
      const importRow = event.target.closest('[data-import-row]');
      if (importRow && !event.target.closest('input,button,a,label,select,textarea')) {
        const checkbox = importRow.querySelector('[name="request"]');
        if (!checkbox.disabled) checkbox.click();
        return;
      }
      const row = event.target.closest('[data-cancel-row]');
      if (row && !event.target.closest('input,button,a,label,select,textarea') && state.step === 2 && !busy) {
        const checkbox = row.querySelector('[name="cancel"]');
        if (!checkbox.disabled) { checkbox.checked = !checkbox.checked; updateCancellationSelection(); }
        return;
      }
      const target = event.target.closest('[data-action]');
      if (!target || target.disabled || busy) return;
      if (state.poll && !state.poll.closed && !['copy-vote-link', 'close-online', 'open-display'].includes(target.dataset.action)) return;
      const previous = checkpoint();
      const undoable = ['open-vote', 'revote', 'finish', 'dissatisfied', 'rank', 'start-queue', 'skip', 'next-stage', 'apply', 'allocate-pending', 'choose-project', 'switch-project'];
      if (['open-online-nomination', 'open-online-withdrawal', 'open-online-recipient', 'close-online'].includes(target.dataset.action) || (state.online && ['open-vote', 'revote'].includes(target.dataset.action))) undoStack.length = 0;
      try {
        state.error = ''; state.errorSource = false;
        switch (target.dataset.action) {
          case 'open-display': {
            if (!displayChannel) throw Error('เบราว์เซอร์นี้ไม่รองรับจอห้องประชุม กรุณาใช้เบราว์เซอร์รุ่นปัจจุบัน');
            if (!displayWindow || displayWindow.closed) {
              const url = new URL('budget-meeting-display.html', location.href);
              url.hash = displayId;
              displayWindow = window.open(url.href, `budget-display-${displayId}`, 'popup=yes,width=1600,height=900');
              if (!displayWindow) throw Error('กรุณาอนุญาตป๊อปอัปเพื่อเปิดจอห้องประชุม');
              displayWindow.opener = null;
            }
            displayWindow.focus(); publishDisplay(); return;
          }
          case 'cancel-replace-source': pendingImport = null; state.modal = 'import'; break;
          case 'confirm-replace-source': if (pendingImport) { busy = true; await applyImportedSource(pendingImport); } break;
          case 'back': if (undoStack.length) { stopTimer(); state.modal = 'back'; } break;
          case 'back-confirm': {
            const saved = undoStack.pop();
            if (!saved) throw Error('ไม่มีขั้นตอนที่ย้อนกลับได้');
            stopTimer();
            const history = state.logs;
            state = saved.state; remaining = saved.remaining;
            state.logs = history;
            log(`ประธานย้อนกลับการดำเนินการล่าสุด กลับสู่วาระ ${steps[state.step]}`);
            break;
          }
          case 'select-visible': case 'clear-selection': {
            const selection = importSelection();
            root.querySelectorAll('[name="request"]:not(:disabled)').forEach(input => {
              if (target.dataset.action === 'select-visible' && input.closest('tr').hidden) return;
              input.checked = target.dataset.action === 'select-visible';
              if (input.checked) selection.add(input.value); else selection.delete(input.value);
            });
            updateImportTotal();
            return;
          }
          case 'source-live':
            if (!window.sgcuGetBudgetMeetingSource) throw Error('เปิดแท็บประชุมในหน้าจัดการคำของบหลังเข้าสู่ระบบ หรือเลือกนำเข้าไฟล์ JSON ที่ส่งออกจากหน้านั้น');
            busy = true; target.disabled = true; setSource(await window.sgcuGetBudgetMeetingSource()); break;
          case 'source-export': downloadJSON(source, 'budget-meeting-source.json'); break;
          case 'reset': state.modal = 'reset'; break;
          case 'reset-confirm':
            busy = true; await finishOnlineMeeting();
            if (isStaffPage && window.sgcuAuth?.auth.currentUser) sessionStorage.removeItem(`sgcu-budget-meeting:${window.sgcuAuth.auth.currentUser.uid}`);
            reset(); if (isStaffPage) await loadDefaultOrganizations(); break;
          case 'dismiss': state.modal = ''; break;
          case 'exception': stopTimer(); state.modal = 'exception'; break;
          case 'open-vote': case 'revote':
            if (state.step !== 5) requireAllocated();
            if (state.online) { busy = true; target.disabled = true; await openOnline(state.step === 5 ? 'reduction' : 'satisfaction'); }
            else state.votes = { open: true };
            break;
          case 'skip-online-withdrawal':
            if (!state.online || state.step !== 2 || state.projects.some(p => !p.cancelled && state.orgs[p.org].count > 0)) throw Error('ยังมีฝ่ายที่มีสิทธิ์แจ้งยกเลิก');
            state.withdrawalSubmission = {indices:[],received:0,total:0}; state.cancelSelection = []; break;
          case 'open-online-withdrawal':
            if (!state.online || state.step !== 2) throw Error('ยังไม่ถึงขั้นตอนรับรายการยกเลิก');
            busy = true; target.disabled = true; await openOnline('withdrawal'); break;
          case 'open-online-recipient':
            if (!state.online || state.step !== 4) throw Error('ยังไม่ถึงขั้นตอนเสนอตัวรับงบ');
            busy = true; target.disabled = true; await openOnline('recipient'); break;
          case 'open-online-nomination': busy = true; target.disabled = true; await openOnline('nomination'); break;
          case 'copy-vote-link': await navigator.clipboard.writeText(state.meetingId ? window.sgcuBudgetBallots.meetingUrl(state.meetingId) : window.sgcuBudgetBallots.url(state.poll.id)); break;
          case 'close-online': {
            busy = true; target.disabled = true;
            const submission = ['withdrawal', 'recipient'].includes(state.poll.kind);
            const ballots = await window.sgcuBudgetBallots.close(state.poll.id, submission);
            if (submission) {
              const indices = state.poll.kind === 'withdrawal' ? [...new Set(ballots.flatMap(b => b.choices.map(Number)))] : ballots.filter(b => b.choices.includes('yes')).map(b => state.orgs.findIndex(o => o.code === b.code));
              const total = state.orgs.filter((o,i) => o.count > 0 && (state.poll.kind === 'recipient' ? i !== project().org : state.projects.some(p => p.org === i && !p.cancelled))).length;
              if (state.poll.kind === 'withdrawal') { state.withdrawalSubmission = {indices, received:ballots.length,total}; state.cancelSelection = indices; }
              else state.recipientSubmission = {indices,received:ballots.length,total};
            } else if (state.poll.kind === 'nomination') {
              state.ballots = ballots.map(choices => choices.map(Number)); state.nominationClosed = true;
            } else {
              const yes = ballots.filter(b => b.includes('yes')).length;
              const no = ballots.filter(b => b.includes('no')).length;
              recordVotes(yes, no, (state.poll.kind === 'reduction' ? eligible() : totalPeople()) - yes - no);
            }
            state.poll.closed = true; log(`ปิดลงคะแนน ${state.poll.id}`); break;
          }
          case 'finish': requireAllocated(); busy = true; await finishOnlineMeeting(); state.closed = 'รับรองผลจัดสรรและปิดประชุม'; log(state.closed); go(7); break;
          case 'dissatisfied':
            requireAllocated();
            if (state.step === 6 && state.round > 1) { busy = true; await finishOnlineMeeting(); state.closed = 'ปิดประชุมด้วยยอดจัดสรรรอบล่าสุด'; log(state.closed); go(7); }
            else { if (state.step === 6) state.round++; state.withdrawalSubmission = null; go(2); }
            break;
          case 'rank': {
            const scores = state.projects.map((p, i) => ({ id: i, score: state.ballots.reduce((sum, b) => sum + (b.includes(i) ? (state.rankCount ? state.rankCount - b.indexOf(i) : 1) : 0), 0), budget: p.original })).filter(x => x.score > 0).sort((a, b) => b.score - a.score || b.budget - a.budget);
            const limit = state.rankCount || 10;
            if (scores.length > limit && scores[limit - 1].score === scores[limit].score && scores[limit - 1].budget === scores[limit].budget) throw Error(`คะแนนและเพดานงบเสมอกันที่ลำดับ ${limit} ต้องให้ประธานวินิจฉัยก่อน`);
            state.queue = scores.slice(0, limit).map(x => x.id); state.cursor = 0;
            log(`ประกาศอันดับจาก ${state.ballots.length} บัตร: ${scores.map(x => `${state.projects[x.id].name} ${x.score} คะแนน`).join('; ') || 'ไม่มีโครงการได้รับคะแนน'}`);
            state.ranked = scores; break;
          }
          case 'choose-project': {
            const id = Number(target.dataset.project);
            const from = state.queue.indexOf(id);
            if (state.step !== 3 || !state.ranked || !Number.isInteger(id) || from < state.cursor) throw Error('โครงการนี้ไม่อยู่ในรายการรอพิจารณา');
            state.queue.splice(from, 1); state.queue.splice(state.cursor, 0, id);
            state.recipientSubmission = null;
            state.recipients = []; state.stage = 0; remaining = 300;
            log(`ประธานเลือกพิจารณา ${state.projects[id].code} ${state.projects[id].name} เป็นรายการที่ ${state.cursor + 1}`);
            go(4); break;
          }
          case 'switch-project':
            if (![4, 5].includes(state.step) || state.exception || state.votes) throw Error('เปลี่ยนโครงการได้ก่อนเปิดลงมติเท่านั้น');
            log(`พักการพิจารณา ${project().code} เพื่อเลือกโครงการอื่น โดยยังไม่เปลี่ยนงบ`);
            state.recipients = []; state.stage = 0; remaining = 300; go(3); break;
          case 'start-queue':
            if (state.step !== 3 || !state.ranked || state.cursor < state.queue.length) throw Error('ยังมีโครงการรอพิจารณา');
            go(6); break;
          case 'skip':
            if (state.step !== 4) throw Error('ยังไม่พร้อมข้ามโครงการ');
            if (root.querySelector('[name="recipient"]:checked')) throw Error('มีฝ่ายที่เลือกขอรับงบ กรุณายืนยันฝ่ายหรือยกเลิกการเลือกก่อน');
            if (state.online && state.orgs.some((o,i) => o.count > 0 && i !== project().org) && (!state.recipientSubmission || state.recipientSubmission.indices.length)) throw Error('ข้ามได้เมื่อปิดรับแล้วและไม่มีฝ่ายเสนอตัว');
            log(`ไม่มีฝ่ายขอรับงบ จึงคงงบ ${project().name}`); advanceQueue(); break;
          case 'next-stage': stopTimer(); state.stage++; remaining = state.stage === 2 ? 30 : 300; break;
          case 'timer':
            if (timer) stopTimer();
            else if (remaining > 0) {
              deadline = Date.now() + remaining * 1000;
              timer = setInterval(() => {
                remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
                const clock = root.querySelector('[data-clock]'); if (clock) clock.textContent = clockText();
                if (!remaining) { stopTimer(); render(); }
              }, 250);
            }
            break;
          case 'apply': {
            if (state.step !== 5 || !state.votes || state.votes.open) throw Error('ยังไม่พร้อมบันทึกการจัดสรร');
            const cutCents = Math.round(state.votes.cut * 100);
            const count = state.recipients.length;
            if (!count || state.votes.open) throw Error('ยังไม่พร้อมบันทึกการจัดสรร');
            const base = Math.floor(cutCents / count), remainder = cutCents % count;
            const allocations = state.recipients.map(i => ({ org: i, cents: base }));
            if (allocations.reduce((sum, a) => sum + a.cents, 0) + remainder !== cutCents) throw Error('ยอดจัดสรรไม่ตรงกับยอดลด');
            if (remainder) state.pending.push({ projectId: project().id, projectCode: project().code, projectName: project().name, round: state.round, recipients: [...state.recipients], cents: remainder, selected: [], note: '', resolved: false });
            project().budget = (Math.round(project().budget * 100) - cutCents) / 100;
            allocations.forEach(a => { state.orgs[a.org].grant = (Math.round(state.orgs[a.org].grant * 100) + a.cents) / 100; });
            log(`บันทึกลด ${project().name} ${money(state.votes.cut)} บาท; ${allocations.map(a => `${state.orgs[a.org].name} ${money(a.cents / 100)} บาท`).join('; ')}${remainder ? `; พักเศษ ${money(remainder / 100)} บาทไว้จัดสรรท้ายรอบ` : ''}`);
            advanceQueue(); break;
          }
          case 'allocate-pending': {
            const entry = pendingPool();
            if (![1, 6].includes(state.step) || !entry || entry.resolved) throw Error('รายการนี้ไม่อยู่ระหว่างรอจัดสรร');
            const shares = remainderShares(entry);
            const reducing = entry.mode === 'ceiling';
            const total = reducing ? entry.cents : shares.reduce((sum, a) => sum + a.cents, 0);
            if (shares.some(a => !Number.isSafeInteger(a.cents) || a.cents < 0) || !Number.isSafeInteger(total) || total <= 0 || total > entry.cents) throw Error('กรุณาเลือกฝ่ายหรือระบุยอดให้มากกว่า 0.00 และไม่เกินยอดคงเหลือ');
            const note = String(entry.note || '').trim();
            if (!note) throw Error('กรุณาบันทึกมติประธานเรื่องเศษสตางค์ก่อนยืนยัน');
            if (reducing) {
              const current = state.sourceInfo?.meetingCeiling ?? (state.orgs.reduce((sum, _, i) => sum + Math.round(orgTotal(i) * 100), 0) + pendingCents()) / 100;
              if (Math.round(current * 100) < total) throw Error('ยอดลดเกินเพดานปัจจุบัน');
              state.sourceInfo = { ...state.sourceInfo, meetingCeiling: (Math.round(current * 100) - total) / 100 };
              state.ceilingReductionCents = (state.ceilingReductionCents || 0) + total;
            } else shares.forEach(a => { state.orgs[a.org].grant = (Math.round(state.orgs[a.org].grant * 100) + a.cents) / 100; });
            // Consume source balances in order, keeping the pooled decision traceable.
            let remaining = total;
            const sources = [];
            state.pending.forEach((source, index) => {
              if (source.resolved || !remaining) return;
              const cents = Math.min(source.cents, remaining);
              source.originalCents ??= source.cents;
              source.cents -= cents; remaining -= cents;
              source.resolved = source.cents === 0;
              sources.push({ index, projectId: source.projectId, projectCode: source.projectCode, round: source.round, cents });
            });
            entry.cents = pendingCents(); entry.resolved = entry.cents === 0; entry.note = note;
            entry.decisions.push({ round: state.round, mode: entry.mode || 'equal', cents: total, shares, sources, note });
            entry.amounts = {};
            state.votes = null;
            log(`${reducing ? 'ลดเพดาน' : 'จัดสรรเศษ'} ${money(total / 100)} บาท จากยอดเศษรวม รอบที่ ${state.round}: ${shares.filter(a => a.cents).map(a => `${state.orgs[a.org].name} ${money(a.cents / 100)} บาท`).join('; ')}; มติประธาน: ${note}`);
            break;
          }
          case 'export': {
            const blob = new Blob([JSON.stringify({ version: 1, votingMode: state.online ? 'account' : 'chair', sourceInfo: state.sourceInfo || null, closed: state.closed, orgs: state.orgs.map((o, i) => ({ ...o, total: orgTotal(i) })), projects: state.projects, pending: state.pending, remainderPool: state.remainderPool || null, ceilingReductionCents: state.ceilingReductionCents || 0, history: state.logs }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'budget-meeting-results.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); break;
          }
        }
        if (['open-online-nomination', 'open-online-withdrawal', 'open-online-recipient', 'close-online'].includes(target.dataset.action)) undoStack.length = 0;
        else if (state.meetingId && state.step === 7) undoStack.length = 0;
        else if (undoable.includes(target.dataset.action)) remember(previous);
      } catch (error) { state.error = error.message; state.errorSource = target.dataset.action === 'source-live'; }
      finally { busy = false; }
      render();
      if (state.modal) root.querySelector('dialog input, dialog button, dialog select')?.focus();
      else if (state.errorSource && state.error) root.querySelector('.bm-source-error')?.focus({ preventScroll: true });
      else root.querySelector('.bm-work')?.focus({ preventScroll: true });
    });
    root.addEventListener('input', event => {
      const target = event.target;
      if (target.matches('[data-meeting-filter]')) { updateMeetingFilter(target.closest('form')); return; }
      if (target.dataset.remainderAmount !== undefined) {
        const entry = pendingPool();
        if (entry && !entry.resolved) (entry.amounts ||= {})[Number(target.dataset.remainderAmount)] = target.value;
        return;
      }
      if (target.matches('[data-remainder-note]')) {
        const entry = pendingPool();
        if (!entry || entry.resolved) return;
        entry.note = target.value; state.error = '';
        root.querySelector('.bm-work > .bm-error')?.remove(); return;
      }
      if (target.name === 'meetingCeiling') { ceilingDrafts.set(importRound, target.value); return; }
      if (target.matches('[data-import-search]')) { importSearch = target.value; filterImport(); return; }
      const form = target.closest('form');
      if (form?.dataset.form === 'setup') {
        const match = /^(count|proxy|email)(\d+)$/.exec(target.name);
        if (match && match[1] === 'count' && target.validity.valid && target.value !== '') {
          state.orgs[Number(match[2])].count = Number(target.value);
          root.querySelector('[data-people-total]').textContent = totalPeople();
        } else if (match && ['proxy', 'email'].includes(match[1])) state.orgs[Number(match[2])][match[1]] = target.value;
      }
      if (form?.dataset.form === 'vote') {
        const yes = Number(form.elements.yes.value), no = Number(form.elements.no.value);
        const n = Number(form.dataset.eligible);
        if (target.name !== 'missing') form.elements.missing.value = Math.max(0, n - yes - no);
        const total = yes + no + Number(form.elements.missing.value);
        form.querySelector('[data-vote-balance]').textContent = total !== n ? `ยอดรวมไม่ตรงกับผู้มีสิทธิ์ ${n} คน` : `ลงคะแนนแล้ว ${yes + no} / ${n} คน`;
        form.querySelector('[data-vote-progress]').value = Math.min(n, yes + no);
      }
    });
    root.addEventListener('focusout', event => {
      if (event.target.name !== 'meetingCeiling' || !event.target.value.trim()) return;
      try {
        event.target.value = money(amount(event.target.value));
        ceilingDrafts.set(event.target.dataset.ceilingRound, event.target.value);
      } catch (_) { /* Keep invalid input visible for correction on submit. */ }
    });
    root.addEventListener('change', async event => {
      const target = event.target;
      if (target.name === 'recipient') {
        target.closest('label').querySelector('small').textContent = recipientStatus(Number(target.value), target.checked);
        const skip = root.querySelector('[data-action="skip"]');
        if (skip) skip.disabled = Boolean(state.online && (state.recipientSubmission?.indices.length || root.querySelector('[name="recipient"]:checked')));
        return;
      }
      if (target.matches('[data-rank-count]')) {
        const count = Number(target.value);
        if (state.step === 3 && !state.ballots.length && state.poll?.kind !== 'nomination' && !state.nominationClosed) {
          const max = state.projects.filter(p => !p.cancelled).length;
          if (Number.isInteger(count) && count >= 1 && count <= max) { state.rankCount = count; state.error = ''; }
          else state.error = `กรุณากรอกจำนวนอันดับเป็นจำนวนเต็มตั้งแต่ 1 ถึง ${max}`;
        }
        render(); return;
      }
      if (target.dataset.remainderMode !== undefined) {
        const entry = pendingPool();
        if (entry && !entry.resolved && ['equal', 'manual', 'ceiling'].includes(target.value)) entry.mode = target.value;
        state.error = ''; render(); return;
      }
      if (target.dataset.remainderAmount !== undefined) {
        try {
          const entry = pendingPool();
          const value = money(amount(target.value));
          if (entry && !entry.resolved) (entry.amounts ||= {})[Number(target.dataset.remainderAmount)] = value;
          target.value = value;
        } catch (_) { /* Keep invalid input for correction. */ }
        return;
      }
      if (target.dataset.remainder !== undefined) {
        const entry = pendingPool();
        if (!entry || entry.resolved) return;
        const selected = new Set(entry.selected || []);
        const id = Number(target.dataset.remainder);
        if (target.checked) selected.add(id); else selected.delete(id);
        entry.selected = [...selected];
        state.error = '';
        render(); root.querySelector(`[data-pending="${target.dataset.pending}"][data-remainder="${id}"]`)?.focus({ preventScroll: true }); return;
      }
      if (target.name === 'cancel') {
        updateCancellationSelection(); return;
      }
      if (target.dataset.representative !== undefined && state.step === 0) {
        const org = state.orgs[Number(target.dataset.representative)];
        const member = org.members.find(m => m.id === target.value && m.email);
        org.representativeId = member?.id || ''; org.email = member?.email || '';
        org.representativeChosen = true;
        root.querySelector(`[data-representative-email="${target.dataset.representative}"]`).textContent = org.email || 'ยังไม่ระบุบัญชีผู้ลงคะแนน';
        return;
      }
      if (target.matches('[data-source-file]')) {
        const file = target.files[0];
        if (!file) return;
        try {
          if (file.size > 5 * 1024 * 1024) throw Error('ไฟล์ต้องไม่เกิน 5 MB');
          setSource(JSON.parse(await file.text()));
        } catch (error) { state.error = error.message; state.errorSource = true; }
        render();
      } else if (target.dataset.import) {
        if (target.dataset.import === 'round') { importRound = target.value; importSearch = ''; }
        render();
        root.querySelector(`[data-import="${target.dataset.import}"]`)?.focus();
      } else if (target.name === 'request') {
        const selection = importSelection();
        if (target.checked) selection.add(target.value); else selection.delete(target.value);
        updateImportTotal();
      }
    });
    root.addEventListener('keydown', event => {
      if (event.target.matches('tr[data-action="choose-project"]') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); event.target.click(); return; }
      if (event.key === 'Escape' && state.modal) { state.modal = ''; render(); }
    });
    document.addEventListener('sgcu:budget-meeting-open', async () => {
      if (isStaffPage && state.online && state.hostUid !== window.sgcuAuth?.auth.currentUser?.uid) reset();
      if (!isStaffPage || state.sourceInfo || state.modal) return;
      try {
        const uid = window.sgcuAuth?.auth.currentUser?.uid;
        const saved = uid && sessionStorage.getItem(`sgcu-budget-meeting:${uid}`);
        if (saved) state = JSON.parse(saved);
        else await loadDefaultOrganizations();
      }
      catch (error) { state.error = error.message; }
      render();
    });
    reset(); render();
  });
})();
