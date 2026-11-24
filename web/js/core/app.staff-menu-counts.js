/* Live staff work queues, independent of lazy-loaded page modules. */
(() => {
  const definitions = [
    ['budget-approval-staff', 'budgetApprovalRequests', ['pending', 'reviewing']],
    ['borrow-assets-staff', 'borrowAssetRequests', ['pending', 'approved', 'received']],
    ['meeting-room-staff', 'meetingRoomBookings', ['pending', 'cancel_requested', 'reschedule_requested']],
    ['staff-approval', 'staffApplications', ['pending']],
    ['org-representative-approval-staff', 'organizationRepresentativeApplications', ['pending']],
    ['staff-temporary-access-staff', 'authEmailAccess', null]
  ];
  const counts = new Map();
  const rows = new Map();
  let subscriptions = [];
  let generation = 0;
  let signature = '';
  let retry = null;
  let state = {};

  const expiryWindowMs = 7 * 24 * 60 * 60 * 1000;
  function toMillis(value) {
    if (value == null) return NaN;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return new Date(value).getTime();
  }
  function expiringSoon(item) {
    const now = Date.now();
    const starts = toMillis(item.startsAt), ends = toMillis(item.endsAt);
    return !['pending', 'rejected'].includes(item.status) && item.active === true &&
      starts <= now && ends > now && ends <= now + expiryWindowMs;
  }

  function paintBadge(target, count) {
    let badge = target.querySelector(':scope > .staff-menu-count');
    if (!badge && !count) return;
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'staff-menu-count';
      target.classList.add('has-staff-menu-count');
      // Keep the text label last: mobile navigation animates its last span.
      if (target.classList.contains('mobile-bottom-item')) target.insertBefore(badge, target.lastElementChild);
      else target.append(badge);
    }
    target.classList.toggle('has-staff-menu-count', count > 0);
    badge.hidden = !count;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.setAttribute('aria-label', `รายการรอดำเนินการ ${count} รายการ`);
    badge.title = `รายการรอดำเนินการ ${count} รายการ`;
  }

  function render() {
    for (const [page] of definitions) {
      document.querySelectorAll(`a[data-page="${page}"]`).forEach(link => paintBadge(link, counts.get(page) || 0));
    }
    const staffTotal = [...counts.values()].reduce((sum, count) => sum + count, 0);
    document.querySelectorAll('[data-staff-mode="staff"]:not(#work-panel [data-staff-mode])').forEach(button => paintBadge(button, staffTotal));
    const notice = document.getElementById('staffTemporaryAccessNotice');
    if (notice) {
      const entries = rows.get('staff-temporary-access-staff') || [];
      const pending = entries.filter(item => item.status === 'pending').length;
      const expiring = entries.filter(expiringSoon).length;
      notice.hidden = !pending && !expiring;
      notice.textContent = `รออนุมัติ ${pending} รายการ · สิทธิ์ที่ใช้งานอยู่และจะหมดอายุภายใน 7 วัน ${expiring} รายการ`;
    }
    // Surface totals even while desktop dropdowns and mobile groups are closed.
    document.querySelectorAll('#desktopNavStaff .nav-group, .mobile-menu-group[data-mobile-nav="staff"]').forEach(group => {
      const pages = new Set([...group.querySelectorAll('a[data-page]')].map(link => link.dataset.page));
      const total = [...pages].reduce((sum, page) => sum + (counts.get(page) || 0), 0);
      const toggle = group.querySelector('.nav-group-toggle, summary');
      if (toggle) paintBadge(toggle, total);
    });
  }

  function recount() {
    for (const [page, , statuses] of definitions) {
      const pending = (rows.get(page) || []).filter(item => {
        if (page === 'staff-temporary-access-staff') return item.status === 'pending' || expiringSoon(item);
        if (!statuses.includes(item.status)) return false;
        if (page === 'borrow-assets-staff' && ['true', '1', 'yes', 'y'].includes(String(item.isDeleted || '').trim().toLowerCase())) return false;
        if (page === 'staff-approval' && !['', 'staff_application'].includes(String(item.requestType || 'staff_application').trim())) return false;
        if (page === 'org-representative-approval-staff' && String(item.requestType || '').trim() !== 'organization_representative') return false;
        if (page === 'meeting-room-staff' && item.date) {
          const time = String(item.endTime || '23:59').trim();
          const end = new Date(`${String(item.date).trim()}T${/^\d{1,2}:\d{2}$/.test(time) ? time + ':00' : '23:59:59'}`);
          if (end.getTime() < Date.now()) return false;
        }
        return true;
      });
      counts.set(page, pending.length);
    }
    render();
  }

  function sync(next = state) {
    state = next;
    const pages = state.isAuthenticated && state.hasStaff ? (state.allowedPages || []).filter(page =>
      !['staff-approval', 'org-representative-approval-staff', 'staff-temporary-access-staff'].includes(page) || state.isHeadStaff
    ) : [];
    const key = JSON.stringify([state.email, [...pages].sort()]);
    const store = window.sgcuFirestore;
    if (key === signature && subscriptions.length) return;
    signature = key;
    const current = ++generation;
    window.clearTimeout(retry);
    subscriptions.forEach(stop => stop());
    subscriptions = [];
    rows.clear();
    counts.clear();
    render();
    if (!pages.length) return;
    if (!store?.db || !store.onSnapshot || !store.query || !store.where) {
      retry = window.setTimeout(() => sync(), 500);
      return;
    }
    const config = typeof SGCU_APP_CONFIG === 'object' ? SGCU_APP_CONFIG : {};
    const collections = config.firestore?.collections || {};
    for (const [page, collection, statuses] of definitions) {
      if (!pages.includes(page)) continue;
      const failed = () => {
        if (current !== generation) return;
        rows.delete(page);
        recount();
      };
      try {
        const ref = store.collection(store.db, collections[collection] || collection);
        const query = statuses ? store.query(ref,
          store.where('status', statuses.length === 1 ? '==' : 'in', statuses.length === 1 ? statuses[0] : statuses)) : store.query(ref);
        subscriptions.push(store.onSnapshot(query, snapshot => {
          if (current !== generation) return;
          rows.set(page, snapshot.docs.map(doc => doc.data()));
          recount();
        }, failed));
      } catch (_) { failed(); }
    }
  }

  window.addEventListener('sgcu:page-active', render);
  window.addEventListener('sgcu:staff-auth-updated', event => sync(event.detail || {}));
  window.addEventListener('sgcu:auth-state', event => {
    if (event.detail?.isAuthenticated === false) sync({});
  });
  // Expire meeting requests even if no Firestore document changes.
  window.setInterval(() => { if (rows.size) recount(); }, 60000);
})();
