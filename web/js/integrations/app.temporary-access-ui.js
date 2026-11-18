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
  apply();
}
