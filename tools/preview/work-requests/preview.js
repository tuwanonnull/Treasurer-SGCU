/* Local interaction prototype. No Firebase, network requests, or persistent user data. */
(() => {
  const services = { budget: 'งบประมาณ', borrow: 'ยืม–คืนพัสดุ', meeting: 'ห้องประชุม', temporary: 'สิทธิ์ชั่วคราว', representative: 'ตัวแทนองค์กร' };
  const icons = {
    temporary: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    representative: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
    budget: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5M8 16h8"/>',
    borrow: '<path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 5l9 4"/>',
    meeting: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 5h3"/>'
  };
  const samples = [
    { id: 'BR-069-0128', mode: 'normal', service: 'borrow', title: 'ชุดเครื่องเสียง · กิจกรรมเปิดบ้านชมรม', org: 'ชมรมดนตรี', status: 'รอคืนพัสดุ', bucket: 'action', due: -1, deadline: 'เกินกำหนด 1 วัน · คืน 23 พ.ย.', next: 'นำพัสดุคืนและให้เจ้าหน้าที่ตรวจรับ', action: 'ดูการคืนพัสดุ', steps: ['ส่งคำขอยืมพัสดุ · 18 พ.ย. 2569', 'รับพัสดุแล้ว · 20 พ.ย. 2569', 'รอคืนพัสดุ · กำหนด 23 พ.ย. 2569'] },
    { id: 'BR-069-0136', mode: 'normal', service: 'borrow', title: 'โต๊ะพับและเก้าอี้ · นิทรรศการนิสิต', org: 'ฝ่ายกิจการนิสิต', status: 'พร้อมรับพัสดุ', bucket: 'action', due: 0, deadline: 'รับวันนี้ · 24 พ.ย. เวลา 13:00 น.', next: 'เตรียมรหัสคำขอและมารับพัสดุตามเวลานัด', action: 'ดูจุดรับพัสดุ', steps: ['ส่งคำขอยืมพัสดุ · 21 พ.ย. 2569', 'อนุมัติแล้ว · 22 พ.ย. 2569', 'นัดรับพัสดุ · วันนี้ 13:00 น.'] },
    { id: 'MT-069-0087', mode: 'normal', service: 'meeting', title: 'ห้องประชุม 2 · เตรียมงานอาสาพัฒนา', org: 'ชมรมอาสาพัฒนา', status: 'จองสำเร็จ', bucket: 'ready', due: 1, deadline: '25 พ.ย. · 16:00–18:00 น.', next: 'เข้าห้องตามเวลาที่จองและตรวจความเรียบร้อยก่อนออก', action: 'ดูรายละเอียด', steps: ['ส่งคำขอจอง · 20 พ.ย. 2569', 'อนุมัติแล้ว · 21 พ.ย. 2569', 'กำหนดใช้ห้อง · 25 พ.ย. 2569'] },
    { id: 'BG-069-0042', mode: 'normal', service: 'budget', title: 'โครงการจิตอาสาพัฒนาชุมชน', org: 'ชมรมอาสาพัฒนา · 25,000 บาท', status: 'อยู่ระหว่างตรวจสอบ', bucket: 'waiting', due: null, deadline: 'ส่งคำขอ 21 พ.ย. 2569', next: 'รอเจ้าหน้าที่ตรวจสอบรายละเอียดงบประมาณ', action: 'ติดตามคำขอ', steps: ['ยื่นคำของบประมาณ · 21 พ.ย. 2569', 'เจ้าหน้าที่รับเรื่อง · 22 พ.ย. 2569', 'กำลังตรวจสอบเอกสารและงบประมาณ'] },
    { id: 'MT-069-0091', mode: 'normal', service: 'meeting', title: 'ห้องประชุม 1 · สรุปแผนงานประจำเดือน', org: 'ฝ่ายกิจการนิสิต', status: 'รออนุมัติ', bucket: 'waiting', due: 6, deadline: '30 พ.ย. · 13:00–15:00 น.', next: 'รอเจ้าหน้าที่พิจารณาคำขอจองห้อง', action: 'ติดตามคำขอ', steps: ['ส่งคำขอจอง · 23 พ.ย. 2569', 'รอเจ้าหน้าที่พิจารณา'] },
    { id: 'BR-069-0110', mode: 'normal', service: 'borrow', title: 'บอร์ดนิทรรศการ · แนะนำชมรม', org: 'ชมรมอาสาพัฒนา', status: 'คืนเรียบร้อย', bucket: 'done', due: null, deadline: 'เสร็จสิ้น 18 พ.ย. 2569', next: 'ดำเนินการครบแล้ว เก็บรายการนี้ไว้ดูย้อนหลังได้', action: 'ดูประวัติ', steps: ['ส่งคำขอ · 12 พ.ย. 2569', 'รับพัสดุ · 15 พ.ย. 2569', 'เจ้าหน้าที่ตรวจรับคืนครบ · 18 พ.ย. 2569'] },
    { id: 'BG-069-0036', mode: 'staff', service: 'budget', title: 'โครงการพัฒนาทักษะผู้นำชมรม', org: 'สโมสรนิสิต · 38,500 บาท', status: 'รอตรวจสอบงบ', bucket: 'action', due: -2, deadline: 'รอดำเนินการเกินเป้าหมาย 2 วัน', next: 'ตรวจรายละเอียดค่าใช้จ่ายและเอกสารประกอบคำขอ', action: 'ตรวจคำขอ', steps: ['ยื่นคำขอ · 17 พ.ย. 2569', 'เอกสารประกอบครบ · 18 พ.ย. 2569', 'รอเจ้าหน้าที่ตรวจสอบงบประมาณ'] },
    { id: 'MT-069-0089', mode: 'staff', service: 'meeting', title: 'ขอเปลี่ยนเวลา · ห้องประชุม 2', org: 'ฝ่ายศิลปะและวัฒนธรรม', status: 'รอพิจารณาเปลี่ยนเวลา', bucket: 'action', due: 0, deadline: 'ใช้ห้องวันนี้ · 24 พ.ย. เวลา 17:00 น.', next: 'ตรวจเวลาว่างก่อนยืนยันการเปลี่ยนช่วงเวลาจอง', action: 'ตรวจคำขอ', steps: ['อนุมัติการจองเดิม · 20 พ.ย. 2569', 'ผู้ใช้ขอเปลี่ยนเวลา · 23 พ.ย. 2569', 'รอเจ้าหน้าที่พิจารณา'] },
    { id: 'BR-069-0133', mode: 'staff', service: 'borrow', title: 'อุปกรณ์กีฬา · กีฬาสัมพันธ์นิสิต', org: 'ชมรมกีฬา', status: 'รออนุมัติ', bucket: 'action', due: 1, deadline: 'ขอรับพัสดุ 25 พ.ย. 2569', next: 'ตรวจจำนวนคงเหลือและช่วงเวลายืมก่อนอนุมัติ', action: 'ตรวจคำขอ', steps: ['ส่งคำขอ · 22 พ.ย. 2569', 'รอตรวจสอบคลังพัสดุ'] },
    { id: 'MT-069-0092', mode: 'staff', service: 'meeting', title: 'ห้องประชุม 1 · ประชุมผู้ประสานงาน', org: 'ฝ่ายพัฒนาสังคม', status: 'รออนุมัติ', bucket: 'action', due: 2, deadline: '26 พ.ย. · 10:00–12:00 น.', next: 'ตรวจความเหมาะสมและเวลาว่างของห้อง', action: 'ตรวจคำขอ', steps: ['ส่งคำขอ · 23 พ.ย. 2569', 'รอเจ้าหน้าที่อนุมัติ'] },
    { id: 'BR-069-0130', mode: 'staff', service: 'borrow', title: 'ชุดไมโครโฟน · เวทีเสวนานิสิต', org: 'ฝ่ายวิชาการ', status: 'รอส่งมอบพัสดุ', bucket: 'action', due: 2, deadline: 'นัดรับ 26 พ.ย. เวลา 09:00 น.', next: 'จัดเตรียมพัสดุและตรวจรายการก่อนส่งมอบ', action: 'เตรียมส่งมอบ', steps: ['ส่งคำขอ · 20 พ.ย. 2569', 'อนุมัติ · 22 พ.ย. 2569', 'รอส่งมอบพัสดุ'] },
    { id: 'BG-069-0040', mode: 'staff', service: 'budget', title: 'งานนิทรรศการศิลปะและวัฒนธรรม', org: 'ฝ่ายศิลปะและวัฒนธรรม · 19,000 บาท', status: 'รอเอกสารจากผู้ยื่น', bucket: 'waiting', due: null, deadline: 'แจ้งขอเอกสาร 23 พ.ย. 2569', next: 'รอผู้ยื่นส่งเอกสารเพิ่มเติมตามที่แจ้ง', action: 'ดูรายละเอียด', steps: ['ยื่นคำขอ · 20 พ.ย. 2569', 'เจ้าหน้าที่ขอเอกสารเพิ่มเติม · 23 พ.ย. 2569', 'รอผู้ยื่นดำเนินการ'] },
    { id: 'MT-069-0080', mode: 'staff', service: 'meeting', title: 'ห้องประชุม 3 · สรุปกิจกรรมอาสา', org: 'ชมรมอาสาพัฒนา', status: 'เสร็จสิ้น', bucket: 'done', due: null, deadline: 'เสร็จสิ้น 22 พ.ย. 2569', next: 'ใช้ห้องและตรวจความเรียบร้อยครบแล้ว', action: 'ดูประวัติ', steps: ['อนุมัติ · 20 พ.ย. 2569', 'ใช้ห้อง · 22 พ.ย. 2569', 'ตรวจความเรียบร้อยแล้ว'] }
  ];
  const $ = id => document.getElementById(id);
  const live = window.sgcuWorkLive === true;
  let rows = live ? [] : structuredClone(samples), role = live ? 'user' : 'staff', mode = 'normal', section = 'work', selectedId = null, toastTimer;
  let visibleLimit = 20, listSignature = '';
  const initialFilters = () => ({ service: 'all', bucket: 'all', query: '' });
  let filters = { normal: initialFilters(), staff: initialFilters() };
  const canStaff = () => role !== 'user';
  const visibleRows = () => rows.filter(row => row.mode === mode && (mode !== 'staff' || role !== 'meeting' || row.service === 'meeting'));
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
    const scoped = visibleRows(), filter = filters[mode];
    if (live && mode === 'staff' && filter.service !== 'all' && !(window.sgcuWorkAllowedServices || []).includes(filter.service)) filter.service = 'all';
    if ((live || mode === 'staff') && filter.bucket === 'done') filter.bucket = 'all';
    const doneOption = document.querySelector('#status-filter option[value="done"]');
    doneOption.hidden = doneOption.disabled = live || mode === 'staff';
    window.sgcuWorkPreviewShell.render(mode, role, section);
    const staffCount = rows.filter(row => row.mode === 'staff' && row.bucket === 'action' && (role !== 'meeting' || row.service === 'meeting')).length;
    $('staff-count').textContent = staffCount > 99 ? '99+' : String(staffCount);
    $('staff-count').hidden = !staffCount;
    $('staff-count').classList.add('staff-menu-count');
    $('staff-count').parentElement.classList.toggle('has-staff-menu-count', staffCount > 0);
    $('staff-count').setAttribute('aria-label', `งานบริการที่ต้องดำเนินการ ${staffCount} รายการ`);
    $('page-description').textContent = mode === 'staff' ? 'จัดการงานที่รับผิดชอบ เริ่มจากรายการที่ต้องดูแลก่อน' : 'ติดตามคำขอของคุณ และดูสิ่งที่ต้องทำต่อ';
    $('list-title').textContent = mode === 'staff' ? 'งานที่ต้องจัดการ' : 'คำขอของฉัน';
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
    $('service-filter').value = filter.service;
    $('status-filter').value = filter.bucket;
    if ($('work-search').value !== filter.query) $('work-search').value = filter.query;
    $('clear-search').hidden = filter.service === 'all' && filter.bucket === 'all' && !filter.query;
    const query = filter.query.trim().toLocaleLowerCase('th-TH');
    const result = scoped.filter(row => (filter.service === 'all' || row.service === filter.service) && matchesBucket(row, filter.bucket) && `${requestNumber(row)} ${row.title} ${row.org} ${row.purpose || ''}`.toLocaleLowerCase('th-TH').includes(query))
      .sort((a, b) => rank(a) - rank(b) || (a.due ?? 999) - (b.due ?? 999) || a.id.localeCompare(b.id));
    const nextSignature = JSON.stringify([mode, filter]);
    if (nextSignature !== listSignature) { visibleLimit = 20; listSignature = nextSignature; }
    const displayed = live ? result.slice(0, visibleLimit) : result;
    $('work-load-more').hidden = displayed.length >= result.length;
    $('result-count').textContent = live ? (displayed.length < result.length ? `พบ ${result.length} รายการ · แสดง ${displayed.length} รายการ` : `พบ ${result.length} รายการ`) : `${result.length} จาก ${scoped.length} รายการ`;
    $('empty-state').hidden = result.length > 0;
    $('request-list').innerHTML = displayed.map(row => `<button type="button" class="request-row service-${row.service}" data-detail="${row.id}" aria-haspopup="dialog" aria-label="${escape('เปิดรายละเอียด ' + row.title + (requestNumber(row) ? ' ' + requestNumber(row) : ''))}"><span class="request-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[row.service]}</svg></span><span class="request-main"><span class="request-meta">${services[row.service]}${requestNumber(row) ? ' · ' + escape(requestNumber(row)) : ''}</span><span class="request-title">${escape(row.title)}</span>${rowSummary(row) ? `<span class="request-next">${escape(rowSummary(row))}</span>` : ''}</span><span class="request-state">${badge(row)}<span class="request-deadline ${row.due !== null && row.due < 0 && row.bucket !== 'done' ? 'overdue' : ''}">${escape(row.deadline)}</span></span><span class="request-chevron" aria-hidden="true">›</span></button>`).join('');
  }
  function switchMode(next) {
    if (!['normal', 'staff'].includes(next) || (next === 'staff' && !canStaff())) return;
    if (live) {
      if (typeof setStaffViewMode === 'function') setStaffViewMode(next);
      const actual = window.sgcuTourAccount?.().mode || next;
      if (actual !== mode) $('request-dialog').close();
      mode = actual; render(); return;
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
    $('detail-date-label').textContent = !live && row.bucket === 'done' ? 'เสร็จสิ้น' : ({ budget: 'การดำเนินการ', borrow: 'กำหนดรับ–คืน', meeting: 'กำหนดใช้ห้อง', temporary: 'ช่วงสิทธิ์', representative: 'การดำเนินการ' })[row.service];
    $('detail-next-title').textContent = row.bucket === 'done' ? 'สรุปผล' : row.bucket === 'waiting' ? 'ขั้นตอนปัจจุบัน' : 'สิ่งที่ต้องทำต่อ';
    $('detail-status').innerHTML = badge(row);
    $('detail-next').textContent = row.next;
    $('detail-note-field').hidden = !row.note;
    $('detail-note').textContent = row.note || '';
    $('detail-timeline').replaceChildren(...row.steps.map((step, index) => { const li = document.createElement('li'); li.textContent = step; if (index === row.steps.length - 1) { li.classList.add('latest-step'); li.setAttribute('aria-current', 'step'); } return li; }));
    $('demo-action').hidden = live || row.bucket !== 'action';
    $('demo-action').textContent = 'ทดลองทำรายการเสร็จ';
    if (!$('request-dialog').open) { $('request-dialog').showModal(); document.body.classList.add('work-detail-open'); }
  }
  document.querySelectorAll('[data-staff-mode]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.staffMode)));
  window.sgcuWorkPreview = { setLiveState: (data, hasStaff) => { if (!live) return; const open = $('request-dialog').open; rows = data; role = hasStaff ? 'staff' : 'user'; render(); if (open) { if (visibleRows().some(row => row.id === selectedId)) showDetails(selectedId); else $('request-dialog').close(); } }, setMode: switchMode, setSection: next => { section = next; render(); } };
  document.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => { section = button.dataset.section; render(); }));
  document.querySelectorAll('[data-open-work]').forEach(button => button.addEventListener('click', () => { section = 'work'; render(); }));
  $('work-load-more').onclick = () => { const previous = visibleLimit; visibleLimit += 20; render(); $('request-list').children[previous]?.focus(); };
  $('service-filter').onchange = event => { filters[mode].service = event.target.value; render(); };
  $('status-filter').onchange = event => { filters[mode].bucket = event.target.value; render(); };
  document.querySelectorAll('[data-bucket]').forEach(button => button.addEventListener('click', () => { filters[mode].bucket = button.dataset.bucket; render(); }));
  $('work-search').addEventListener('input', event => { filters[mode].query = event.target.value; render(); });
  $('request-list').addEventListener('click', event => { const button = event.target.closest('[data-detail]'); if (button) showDetails(button.dataset.detail); });
  for (const id of ['clear-filters', 'clear-search']) $(id).addEventListener('click', () => { filters[mode] = initialFilters(); render(); $('work-search').focus(); });
  $('demo-role').addEventListener('change', event => {
    if (live) return;
    role = event.target.value; mode = 'normal'; selectedId = null;
    clearTimeout(toastTimer); $('toast').hidden = true;
    rows = structuredClone(samples); filters = { normal: initialFilters(), staff: initialFilters() };
    $('request-dialog').close(); render();
  });
  $('reset-demo').addEventListener('click', () => { if (live) return; rows = structuredClone(samples); filters = { normal: initialFilters(), staff: initialFilters() }; render(); announce('คืนข้อมูลตัวอย่างแล้ว'); });
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
  $('demo-action').addEventListener('click', () => {
    const row = visibleRows().find(item => item.id === selectedId);
    if (live || !row || row.bucket !== 'action') return;
    Object.assign(row, { bucket: 'done', status: 'เสร็จสิ้น (ตัวอย่าง)', due: null, deadline: 'ดำเนินการในตัวอย่างแล้ว', next: 'เสร็จสิ้นในตัวอย่างนี้ ไม่มีการแก้ไขข้อมูลจริง', action: 'ดูประวัติ' });
    row.steps.push('ทดลองทำรายการเสร็จแล้ว');
    $('request-dialog').close(); render(); announce('อัปเดตข้อมูลตัวอย่างแล้ว · ไม่ได้บันทึกในระบบจริง');
  });
  function announce(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
  $('reset-demo').classList.add('btn-ghost');
  render();
})();
