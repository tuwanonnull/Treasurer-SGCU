// One collection, one renderer, and one set of filters for every access status.
export function setupTemporaryAccessList() {
  const panel = document.getElementById('staffAuthAccessListPanel');
  const search = document.getElementById('staffAuthAccessSearch');
  const status = document.getElementById('staffAuthAccessStatusFilter');
  if (!panel || !search || !status || panel.dataset.filtersReady) return;
  panel.dataset.filtersReady = 'true';
  const apply = () => {
    const term = search.value.trim().toLocaleLowerCase();
    let total = 0, visible = 0;
    for (const row of panel.querySelectorAll('[data-access-status]')) {
      const matches = (status.value === 'all' || row.dataset.accessStatus === status.value) &&
        (!term || row.textContent.toLocaleLowerCase().includes(term));
      row.hidden = !matches;
      if (row.tagName === 'TR') {
        total++;
        if (matches) visible++;

      }
    }
    const loaded = document.getElementById('staffAuthAccessTableBody').dataset;
    const complete = loaded.loaded === 'true';
    document.getElementById('staffAuthAccessFilterCaption').textContent = total || complete ? `แสดง ${visible} จาก ${total} รายการ` : '';
    const empty = document.getElementById('staffAuthAccessNoResults');
    empty.textContent = total ? 'ไม่พบรายการที่ตรงกับตัวกรอง ลองเปลี่ยนสถานะหรือคำค้น' : 'ยังไม่มีคำร้องหรือสิทธิ์ชั่วคราว';
    empty.hidden = visible > 0 || (!total && !complete);
  };
  search.addEventListener('input', apply);
  status.addEventListener('change', apply);
  document.getElementById('staffAuthAccessFilterReset').addEventListener('click', () => {
    search.value = ''; status.value = 'all'; apply(); search.focus();
  });
  window.addEventListener('sgcu:auth-access-list-rendered', apply);
  const observer = new MutationObserver(apply);
  for (const id of ['staffAuthAccessTableBody', 'staffAuthAccessMobileList']) {
    const target = document.getElementById(id);
    if (target) observer.observe(target, { childList: true });
  }
  setupTemporaryAccessMobileFilters(search, status);
  apply();
}

function setupTemporaryAccessMobileFilters(search, status) {
  const button = document.getElementById('staffAuthAccessFilterOpen');
  const filters = search.closest('.staff-auth-filters');
  if (!button || !filters) return;
  const section = filters.closest('.page-view');
  const mobile = window.matchMedia('(max-width: 840px)');
  const sheet = document.createElement('dialog');
  sheet.id = 'staffAuthAccessFilterSheet';
  sheet.className = 'mobile-filter-dialog directory-mobile-filter-dialog';
  sheet.setAttribute('aria-labelledby', 'staffAuthAccessFilterTitle');
  sheet.innerHTML = `<header class="mobile-filter-header">
    <h2 id="staffAuthAccessFilterTitle" class="mobile-filter-title">ค้นหาและกรอง</h2>
    <button type="button" class="mobile-filter-close" aria-label="ปิดตัวกรอง">×</button>
    </header><div class="mobile-filter-body"></div>
    <footer class="mobile-filter-footer"><button type="button" class="btn-ghost">ล้างตัวกรอง</button><button type="button" class="btn-primary">ดูรายการ</button></footer>`;
  document.body.appendChild(sheet);
  let placeholder;
  const syncLabel = () => {
    const count = Number(!!search.value.trim()) + Number(status.value !== 'all');
    button.textContent = count ? `ค้นหาและกรอง (${count})` : 'ค้นหาและกรอง';
  };
  const close = () => {
    if (!sheet.open) return;
    sheet.close();
    placeholder.replaceWith(filters);
    filters.removeAttribute('data-mobile-filter-mounted');
    document.body.classList.remove('auth-access-filter-open');
    button.setAttribute('aria-expanded', 'false');
    syncLabel();
    if (mobile.matches && section.classList.contains('active')) button.focus();
  };
  button.addEventListener('click', () => {
    if (!mobile.matches || sheet.open) return;
    placeholder = document.createComment('temporary-access-filters');
    filters.before(placeholder);
    sheet.querySelector('.mobile-filter-body').appendChild(filters);
    filters.dataset.mobileFilterMounted = 'true';
    sheet.showModal();
    document.body.classList.add('auth-access-filter-open');
    button.setAttribute('aria-expanded', 'true');
  });
  sheet.querySelector('.mobile-filter-close').addEventListener('click', close);
  sheet.querySelector('.btn-primary').addEventListener('click', close);
  sheet.querySelector('.btn-ghost').addEventListener('click', () => {
    document.getElementById('staffAuthAccessFilterReset').click(); syncLabel();
  });
  sheet.addEventListener('cancel', event => { event.preventDefault(); close(); });
  let outside = false;
  const isOutside = event => {
    const box = sheet.getBoundingClientRect();
    return event.target === sheet && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
  };
  sheet.addEventListener('pointerdown', event => { outside = isOutside(event); });
  sheet.addEventListener('click', event => { if (outside && isOutside(event)) close(); outside = false; });
  filters.addEventListener('input', syncLabel);
  filters.addEventListener('change', syncLabel);
  mobile.addEventListener('change', () => { if (!mobile.matches) close(); });
  new MutationObserver(() => { if (!section.classList.contains('active')) close(); }).observe(section, { attributes: true, attributeFilter: ['class'] });
  syncLabel();
}
