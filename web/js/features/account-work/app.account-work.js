/* Authenticated work queue view. Data subscriptions are managed by app.account-work-data.js. */
(() => {
  const services = { budget: 'งบประมาณ', borrow: 'ยืม–คืนพัสดุ', meeting: 'ห้องประชุม', temporary: 'สิทธิ์ชั่วคราว', representative: 'ตัวแทนองค์กร' };
  const icons = {
    temporary: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    representative: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
    budget: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5M8 16h8"/>',
    borrow: '<path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 5l9 4"/>',
    meeting: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 5h3"/>'
  };
  const $ = id => document.getElementById(id);
  const live = true;
  let rows = [], role = 'user', mode = 'normal', section = 'work', selectedId = null, toastTimer;
  const PAGE_SIZE = 20;
  let currentPage = 1, historyPage = 1, listSignature = '';
  const initialFilters = () => ({ service: 'all', bucket: 'all', query: '' });
  let filters = { normal: initialFilters(), staff: initialFilters() };
  let workTab = 'current', renderedMode = mode;
  let historyState = {rows:[],loading:false,error:'',hasMore:false,started:false};
  const historyFilters = {normal:window.sgcuWorkHistory.defaults(),staff:window.sgcuWorkHistory.defaults()};
  const historyQueries = {normal:'',staff:''};
  const historyDates = {normal:{from:'',to:''},staff:{from:'',to:''}};
  const inHistory = () => workTab === 'history';
  const canStaff = () => role !== 'user';
  const visibleRows = () => (inHistory() ? historyState.rows : rows).filter(row => row.mode === mode && (mode !== 'staff' || role !== 'meeting' || row.service === 'meeting'));
  const isDue = row => row.bucket !== 'done' && row.due !== null && row.due <= 3;
  const matchesBucket = (row, bucket) => bucket === 'all' || (bucket === 'due' ? isDue(row) : row.bucket === bucket);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const badge = row => `<span class="badge badge-${row.badgeTone || ({ action: "pending", waiting: "reviewing", done: "approved", ready: "approved" })[row.bucket] || "draft"}">${escape(row.status)}</span>`;
  const requestNumber = row => row.requestNo || (live ? '' : row.id);
  const rowSummary = row => live && row.service === 'meeting' ? (row.purpose ? 'วัตถุประสงค์: ' + row.purpose : '') : mode === 'staff' ? row.org : row.next;
  const rank = row => row.bucket === 'done' ? 4 : row.due !== null && row.due < 0 ? 0 : row.bucket === 'action' ? 1 : row.bucket === 'ready' ? 2 : 3;

  function render() {
    if (live && canStaff()) mode = window.sgcuTourAccount?.().mode || mode;
    if (!canStaff()) mode = 'normal';
    if (renderedMode !== mode) { renderedMode = mode; workTab = 'current'; $('request-dialog').close(); }
    const history = inHistory();
    const scoped = visibleRows(), filter = filters[mode];
    document.querySelector('.work-history-tabs').dataset.activeTab = workTab;
    window.sgcuMobileAccount?.syncWork(workTab, mode, canStaff());
    $('work-history-tools').hidden = !history;
    $('work-history-status').hidden = !history;
    document.querySelector('.work-summary').hidden = history;
    $('live-work-status').hidden = history || !$('live-work-status').textContent;
    $('work-list-content').setAttribute('aria-labelledby', 'work-tab-' + workTab);
    document.querySelectorAll('[data-work-tab]').forEach(button => {
      const selected = button.dataset.workTab === workTab;
      button.classList.toggle('is-active', selected); button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    if (live && mode === 'staff' && filter.service !== 'all' && !(window.sgcuWorkAllowedServices || []).includes(filter.service)) filter.service = 'all';
    if ((live || mode === 'staff') && filter.bucket === 'done') filter.bucket = 'all';
    for (const option of $('status-filter').options) {
      const available = history ? ['all','done','rejected','cancelled'].includes(option.value) : !['done','rejected','cancelled'].includes(option.value);
      option.hidden = option.disabled = !available;
    }
    window.sgcuWorkShell.render(mode, role, section);
    const staffCount = rows.filter(row => row.mode === 'staff' && row.bucket === 'action' && (role !== 'meeting' || row.service === 'meeting')).length;
    $('staff-count').textContent = staffCount > 99 ? '99+' : String(staffCount);
    $('staff-count').hidden = !staffCount;
    $('staff-count').classList.add('staff-menu-count');
    $('staff-count').parentElement.classList.toggle('has-staff-menu-count', staffCount > 0);
    $('staff-count').setAttribute('aria-label', `งานบริการที่ต้องดำเนินการ ${staffCount} รายการ`);
    $('page-description').textContent = mode === 'staff' ? 'จัดการงานที่รับผิดชอบ เริ่มจากรายการที่ต้องดูแลก่อน' : 'ติดตามคำขอของคุณ และดูสิ่งที่ต้องทำต่อ';
    $('list-title').textContent = history ? 'ประวัติคำขอ' : mode === 'staff' ? 'งานที่ต้องจัดการ' : 'คำขอของฉัน';
    $('action-caption').textContent = mode === 'staff' ? 'รายการที่รอเจ้าหน้าที่ดำเนินการ' : 'รายการที่รอคุณทำต่อ';
    $('waiting-label').textContent = mode === 'staff' ? (live ? 'รอดำเนินการ' : 'รอผู้ยื่น') : 'รอผล';
    $('waiting-caption').textContent = mode === 'staff' ? (live ? 'รายการที่ยังอยู่ระหว่างดำเนินการ' : 'รอข้อมูลเพิ่มเติมจากผู้ยื่นคำขอ') : 'ส่งแล้ว รอเจ้าหน้าที่ตรวจสอบ';
    document.querySelector('#status-filter option[value="waiting"]').textContent = mode === 'staff' ? (live ? 'รอดำเนินการ' : 'รอผู้ยื่น') : 'รอผล';
    const summaryRows = scoped.filter(row => (filter.service === 'all' || row.service === filter.service) && `${requestNumber(row)} ${row.title} ${row.org} ${row.purpose || ''}`.toLocaleLowerCase('th-TH').includes(filter.query.trim().toLocaleLowerCase('th-TH')));
    for (const bucket of ['action', 'waiting', 'due']) $(`count-${bucket}`).textContent = summaryRows.filter(row => matchesBucket(row, bucket)).length;
    document.querySelectorAll('[data-bucket]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.bucket === filter.bucket));
      button.classList.toggle('scope-pill-active', button.dataset.bucket === filter.bucket);
    });
    for (const option of $('service-filter').options) {
      option.hidden = option.disabled = (!live && ['temporary','representative'].includes(option.value)) || (live && mode === 'normal' && option.value === 'representative') || mode === 'staff' && (live ? option.value !== 'all' && !(window.sgcuWorkAllowedServices || []).includes(option.value) : role === 'meeting' && !['all', 'meeting'].includes(option.value));
    }
    $('work-search').placeholder = history ? 'เลขคำขอหรือรหัสโครงการแบบตรงตัว' : 'ชื่อรายการ เลขคำขอ หรือหน่วยงาน';
    if (history) { renderHistory(); return; }
    $('service-filter').value = filter.service;
    $('status-filter').value = filter.bucket;
    if ($('work-search').value !== filter.query) $('work-search').value = filter.query;
    $('clear-search').hidden = filter.service === 'all' && filter.bucket === 'all' && !filter.query;
    const query = filter.query.trim().toLocaleLowerCase('th-TH');
    const result = scoped.filter(row => (filter.service === 'all' || row.service === filter.service) && matchesBucket(row, filter.bucket) && `${requestNumber(row)} ${row.title} ${row.org} ${row.purpose || ''}`.toLocaleLowerCase('th-TH').includes(query))
      .sort((a, b) => rank(a) - rank(b) || (a.due ?? 999) - (b.due ?? 999) || a.id.localeCompare(b.id));
    const nextSignature = JSON.stringify([mode, filter]);
    if (nextSignature !== listSignature) { currentPage = 1; listSignature = nextSignature; $('request-list').scrollTop = 0; }
    currentPage = Math.min(currentPage, Math.max(1, Math.ceil(result.length / PAGE_SIZE)));
    const displayed = result.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    renderPager(result.length, currentPage, false, false);
    $('work-history-retry').hidden = true;
    $('empty-state').querySelector('h3').textContent = 'ไม่พบรายการที่ตรงกับตัวกรอง';
    $('empty-state').querySelector('p').textContent = 'ลองเปลี่ยนคำค้น หรือกลับไปดูทุกบริการ';
    $('result-count').textContent = `พบ ${result.length} รายการ`;
    $('empty-state').hidden = result.length > 0;
    renderRows(displayed);
  }
  function renderRows(displayed) {
    $('request-list').innerHTML = displayed.map(row => `<button type="button" class="request-row service-${row.service}" data-detail="${escape(row.id)}" aria-haspopup="dialog" aria-label="${escape('เปิดรายละเอียด ' + row.title + (requestNumber(row) ? ' ' + requestNumber(row) : ''))}"><span class="request-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[row.service]}</svg></span><span class="request-main"><span class="request-meta">${services[row.service]}${requestNumber(row) ? ' · ' + escape(requestNumber(row)) : ''}</span><span class="request-title">${escape(row.title)}</span>${rowSummary(row) ? `<span class="request-next">${escape(rowSummary(row))}</span>` : ''}</span><span class="request-state">${badge(row)}<span class="request-deadline ${row.due !== null && row.due < 0 && row.bucket !== 'done' ? 'overdue' : ''}">${escape(row.deadline)}</span></span></button>`).join('');
  }
  function renderHistory() {
    const filter = historyFilters[mode];
    if (mode === 'staff' && filter.service !== 'all' && !(window.sgcuWorkAllowedServices || []).includes(filter.service)) filter.service = 'all';
    $('service-filter').value = filter.service;
    $('status-filter').value = filter.status;
    $('work-search').value = historyQueries[mode];
    $('work-history-year').value = filter.year;
    $('work-history-from').value = historyDates[mode].from;
    $('work-history-to').value = historyDates[mode].to;
    $('clear-search').hidden = false;
    const visible = visibleRows();
    const isEmpty = historyState.started && !historyState.loading && !historyState.error && !historyState.hasMore && !visible.length;
    const hasFilters = filter.service !== 'all' || filter.status !== 'all' || filter.query || filter.from || filter.to;
    historyPage = Math.min(historyPage, Math.max(1, Math.ceil(visible.length / PAGE_SIZE)));
    renderRows(visible.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE));
    $('result-count').textContent = `โหลดแล้ว ${visible.length} รายการ`;
    $('work-list-content').setAttribute('aria-busy', String(historyState.loading));
    $('work-history-status').textContent = historyState.error || (historyState.loading ? 'กำลังโหลดประวัติ…' : !visible.length && historyState.hasMore ? 'ยังไม่พบประวัติที่ตรงตัวกรองในชุดนี้ กดถัดไปเพื่อค้นต่อ' : !visible.length ? 'ไม่พบประวัติที่ตรงตัวกรอง' : historyState.hasMore ? '' : 'แสดงประวัติครบตามตัวกรองแล้ว');
    $('work-history-status').hidden = isEmpty || !$('work-history-status').textContent;
    $('work-history-refresh').disabled = historyState.loading;
    renderPager(visible.length, historyPage, historyState.hasMore, historyState.loading);
    $('work-history-retry').hidden = !historyState.error;
    $('work-history-retry').disabled = historyState.loading;
    $('empty-state').querySelector('h3').textContent = hasFilters ? 'ไม่พบประวัติที่ตรงกับตัวกรอง' : filter.year === 'all' ? 'ยังไม่มีประวัติงาน' : 'ยังไม่มีประวัติงานในปีการศึกษานี้';
    $('empty-state').querySelector('p').textContent = hasFilters ? 'ลองเปลี่ยนเลขคำขอ ปีการศึกษา หรือช่วงวันที่ หรือกดล้างตัวกรอง' : 'รายการที่ดำเนินการสิ้นสุดแล้วจะแสดงที่นี่ ลองเลือกปีการศึกษาอื่นเพื่อดูประวัติที่ผ่านมา';
    $('empty-state').hidden = !isEmpty;
    // Defer until after rendering; configure deduplicates identical requests.
    Promise.resolve().then(() => { if (inHistory()) window.sgcuWorkHistory.configure(mode, historyFilters[mode]); });
  }
  function renderPager(total, page, hasMore, loading) {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    $('work-pager').hidden = total <= PAGE_SIZE && !hasMore;
    const start = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const end = Math.min(total, page * PAGE_SIZE);
    $('work-page-summary').textContent = hasMore ? `แสดง ${start}-${end} รายการ` : `แสดง ${start}-${end} จาก ${total} รายการ`;
    $('work-page-label').textContent = hasMore ? `หน้า ${page}` : `หน้า ${page} / ${pages}`;
    $('work-page-prev').disabled = loading || page <= 1;
    $('work-page-next').disabled = loading || page >= pages && !hasMore;
    $('work-page-next').textContent = loading ? 'กำลังโหลด…' : 'ถัดไป';
  }
  function focusPage() {
    $('request-list').scrollTop = 0;
    $('request-list').scrollIntoView({block:'nearest'});
    $('request-list').firstElementChild?.focus({preventScroll:true});
  }
  let workTabAnimations = [];
  function captureWorkTransition() {
    const card = document.querySelector('.work-list');
    const snapshot = {top:card.getBoundingClientRect().top, opacity:Number(getComputedStyle($('work-list-content')).opacity)};
    workTabAnimations.forEach(animation => animation.cancel());
    workTabAnimations = [];
    return snapshot;
  }
  function animateWorkTransition(snapshot, includeFilters = false) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = document.querySelector('.work-list'), content = $('work-list-content');
    const timing = {duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'};
    const offset = snapshot.top - card.getBoundingClientRect().top;
    if (card.animate && Math.abs(offset) > 1) {
      workTabAnimations.push(card.animate([
        {transform: `translateY(${offset}px)`}, {transform: 'translateY(0)'}
      ], timing));
    }
    const targets = [content, inHistory() ? $('work-history-tools') : document.querySelector('.work-summary')];
    if (includeFilters) targets.push(document.querySelector('#work-panel .list-tools'), $('page-description'));
    for (const element of targets) {
      if (!element?.animate || element.hidden) continue;
      workTabAnimations.push(element.animate([
        {opacity: element === content ? Math.min(snapshot.opacity, 0.55) : 0.55, transform: 'translateY(4px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], timing));
    }
  }
  function selectWorkTab(tab) {
    if (tab === workTab) return;
    const snapshot = captureWorkTransition();
    workTab = tab; $('request-dialog').close();
    $('work-list-content').setAttribute('aria-busy', 'false');
    render();
    animateWorkTransition(snapshot);
  }

  function switchMode(next) {
    if (!['normal', 'staff'].includes(next) || (next === 'staff' && !canStaff())) return;
    if (next === mode) return;
    if (live) {
      const previousMode = mode;
      const snapshot = captureWorkTransition();
      if (typeof setStaffViewMode === 'function') setStaffViewMode(next);
      const actual = window.sgcuTourAccount?.().mode || next;
      if (actual !== mode) $('request-dialog').close();
      mode = actual; render();
      if (actual !== previousMode) animateWorkTransition(snapshot, true);
      return;
    }
    if (next === mode) return;
    const snapshot = live ? null : captureStaffModeMenu();
    mode = next;
    $('request-dialog').close();
    render();
    if (!live) renderStaffModeFeedback(mode, canStaff(), true, snapshot);
  }
  function showDetails(id) {
    const row = visibleRows().find(item => item.id === id);
    if (!row) return;
    selectedId = id;
    const action = window.sgcuWorkAction?.(row);
    $('work-next-action').hidden = !action;
    $('work-next-action').textContent = action?.label || '';
    $('work-action-status').textContent = '';
    $('detail-service').textContent = services[row.service];
    $('detail-icon').innerHTML = `<svg viewBox="0 0 24 24">${icons[row.service]}</svg>`;
    $('detail-title').textContent = row.title;
    $('detail-meta').textContent = requestNumber(row) ? 'เลขคำขอ ' + requestNumber(row) : '';
    $('detail-meta').hidden = !requestNumber(row);
    $('detail-purpose-field').hidden = !row.purpose;
    $('detail-purpose').textContent = row.purpose || '';
    const [organization, amount] = row.org.split(' · ');
    $('detail-org').textContent = organization;
    $('detail-amount-field').hidden = row.service !== 'budget' || !amount;
    $('detail-amount').textContent = row.service === 'budget' ? amount || '' : '';
    $('detail-deadline').classList.toggle('is-overdue', row.due !== null && row.due < 0 && row.bucket !== 'done');
    $('detail-deadline').textContent = row.deadline;
    $('detail-date-label').textContent = row.history ? 'วันที่อัปเดตล่าสุด' : !live && row.bucket === 'done' ? 'เสร็จสิ้น' : ({ budget: 'การดำเนินการ', borrow: 'กำหนดรับ–คืน', meeting: 'กำหนดใช้ห้อง', temporary: 'ช่วงสิทธิ์', representative: 'การดำเนินการ' })[row.service];
    $('detail-next-title').textContent = row.bucket === 'done' ? 'สรุปผล' : row.bucket === 'waiting' ? 'ขั้นตอนปัจจุบัน' : 'สิ่งที่ต้องทำต่อ';
    $('detail-status').innerHTML = badge(row);
    $('detail-next').textContent = row.next;
    $('detail-note-field').hidden = !row.note;
    $('detail-note').textContent = row.note || '';
    $('detail-timeline').replaceChildren(...row.steps.map((step, index) => { const li = document.createElement('li'); li.textContent = step; if (index === row.steps.length - 1) { li.classList.add('latest-step'); li.setAttribute('aria-current', 'step'); } return li; }));
    if (!$('request-dialog').open) { $('request-dialog').showModal(); document.body.classList.add('work-detail-open'); }
  }
  window.sgcuWorkOpeners = window.sgcuWorkOpeners || {};
  window.sgcuWorkOpeners.login = () => {
    const target = ['loginProfileTemporaryInfo', 'authAccessSelfService'].map($).find(el => el && !el.hidden);
    if (!target) return false;
    target.tabIndex = -1; target.scrollIntoView({block:'center'}); target.focus(); return true;
  };
  let actionPending = false;
  $('work-next-action').addEventListener('click', async () => {
    if (actionPending) return;
    const row = visibleRows().find(item => item.id === selectedId);
    const action = window.sgcuWorkAction?.(row);
    if (!action || !window.sgcuTourNavigation) return;
    actionPending = true;
    $('work-next-action').disabled = true;
    $('work-action-status').textContent = 'กำลังเปิดรายการ…';
    try {
      await window.sgcuTourNavigation.navigate(action.page);
      if (document.querySelector('.page-view.active')?.dataset.page !== action.page) throw Error('navigation');
      $('request-dialog').close();
      // Feature scripts and their authenticated subscriptions may still be loading.
      const deadline = Date.now() + 12000;
      while (Date.now() < deadline) {
        if (!visibleRows().some(item => item.id === row.id) || !window.sgcuWorkAction?.(row)) throw Error('access');
        const active = document.querySelector('.page-view.active')?.dataset.page;
        if (active !== action.page) return;
        const opener = window.sgcuWorkOpeners[action.page];
        if (opener?.(row.recordId) === true) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      throw Error('timeout');
    } catch {
      if (!visibleRows().some(item => item.id === row.id)) return;
      showDetails(row.id);
      $('work-action-status').textContent = 'เปิดรายการไม่สำเร็จ รายการอาจเปลี่ยนแปลงหรือยังโหลดไม่ครบ กรุณาลองอีกครั้ง';
    } finally {
      actionPending = false;
      $('work-next-action').disabled = false;
    }
  });
  document.querySelectorAll('[data-staff-mode]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.staffMode)));
  window.sgcuWork = { selectTab: selectWorkTab, isHistory: inHistory, setHistoryState: data => {
    if (data.key !== historyState.key || !data.rows.length) { historyPage = 1; $('request-list').scrollTop = 0; }
    historyState = data;
    if (inHistory()) render();
    if ($('request-dialog').open && inHistory() && !visibleRows().some(row => row.id === selectedId)) $('request-dialog').close();
  }, setLiveState: (data, hasStaff) => { if (!live) return; const open = $('request-dialog').open; rows = data; role = hasStaff ? 'staff' : 'user'; render(); if (open) { if (visibleRows().some(row => row.id === selectedId)) showDetails(selectedId); else $('request-dialog').close(); } }, setMode: switchMode, setSection: next => { section = next; render(); } };
  document.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => { section = button.dataset.section; render(); }));
  document.querySelectorAll('[data-open-work]').forEach(button => button.addEventListener('click', () => { section = 'work'; render(); }));
  $('work-page-prev').onclick = () => {
    if (inHistory()) historyPage = Math.max(1, historyPage - 1);
    else currentPage = Math.max(1, currentPage - 1);
    render(); focusPage();
  };
  $('work-page-next').onclick = async () => {
    if (!inHistory()) { currentPage++; render(); focusPage(); return; }
    if (historyState.loading) return;
    const key = historyState.key, oldPage = historyPage;
    if (historyPage * PAGE_SIZE >= visibleRows().length && historyState.hasMore) await window.sgcuWorkHistory.loadMore();
    if (!inHistory() || historyState.key !== key || historyPage !== oldPage || historyState.error) return;
    if (visibleRows().length > historyPage * PAGE_SIZE) historyPage++;
    render(); focusPage();
  };
  $('work-history-retry').onclick = () => { void window.sgcuWorkHistory.loadMore(); };
  $('service-filter').onchange = event => { if (inHistory()) { historyFilters[mode].service = event.target.value; } else filters[mode].service = event.target.value; render(); };
  $('status-filter').onchange = event => { if (inHistory()) { historyFilters[mode].status = event.target.value; } else filters[mode].bucket = event.target.value; render(); };
  document.querySelectorAll('[data-bucket]').forEach(button => button.addEventListener('click', () => { filters[mode].bucket = button.dataset.bucket; render(); }));
  $('work-search').addEventListener('input', event => { if (inHistory()) { historyQueries[mode] = event.target.value; return; } filters[mode].query = event.target.value; render(); });
  function submitHistory() {
    historyFilters[mode].query = historyQueries[mode].trim();
    historyFilters[mode].from = historyDates[mode].from;
    historyFilters[mode].to = historyDates[mode].to;
    render();
  }
  $('work-search').addEventListener('keydown', event => { if (inHistory() && event.key === 'Enter') { event.preventDefault(); submitHistory(); } });
  $('work-history-form').addEventListener('submit', event => { event.preventDefault(); submitHistory(); });
  for (const field of ['from','to']) $('work-history-' + field).addEventListener('input', event => { historyDates[mode][field] = event.target.value; });
  $('work-history-year').onchange = event => { historyFilters[mode].year = event.target.value; historyFilters[mode].from = ''; historyFilters[mode].to = ''; historyDates[mode] = {from:'',to:''}; render(); };
  $('work-history-refresh').onclick = () => { void window.sgcuWorkHistory.configure(mode, historyFilters[mode], true); };
  const year = window.sgcuWorkHistory.currentYear();
  $('work-history-year').innerHTML = Array.from({length:Math.max(6,year-2560)},(_,index)=>`<option value="${year-index}">${year-index}</option>`).join('') + '<option value="all">ทุกปี</option>';
  document.querySelectorAll('[data-work-tab]').forEach(button => {
    button.addEventListener('click', () => selectWorkTab(button.dataset.workTab));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'current' : event.key === 'End' ? 'history' : inHistory() ? 'current' : 'history';
      selectWorkTab(next); $('work-tab-' + next).focus();
    });
  });
  $('request-list').addEventListener('click', event => { const button = event.target.closest('[data-detail]'); if (button) showDetails(button.dataset.detail); });
  for (const id of ['clear-filters', 'clear-search']) $(id).addEventListener('click', () => { if (inHistory()) { historyFilters[mode] = window.sgcuWorkHistory.defaults(); historyQueries[mode] = ''; historyDates[mode] = {from:'',to:''}; } else filters[mode] = initialFilters(); render(); $('work-search').focus(); });
  let dialogCloseTimer;
  function closeDetails() {
    const dialog = $('request-dialog');
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    dialogCloseTimer = setTimeout(() => { dialog.close(); dialog.classList.remove('is-closing'); }, 180);
  }
  $('close-dialog').addEventListener('click', closeDetails);
  $('request-dialog').addEventListener('cancel', event => { event.preventDefault(); closeDetails(); });
  $('request-dialog').addEventListener('close', () => { if (!$('request-dialog').open) { clearTimeout(dialogCloseTimer); $('request-dialog').classList.remove('is-closing'); document.body.classList.remove('work-detail-open'); } });
  $('request-dialog').addEventListener('click', event => {
    if (event.target !== $('request-dialog')) return;
    const box = event.target.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDetails();
  });
  render();
})();
