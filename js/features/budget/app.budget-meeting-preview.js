const main = document.getElementById('meeting-preview-main');
try {
  let template = document.getElementById('meeting-preview-template');
  // The build embeds the shared partial; raw-source development loads that same file.
  if (!template.content.querySelector('[data-page="budget-approval-staff"]')) {
    const response = await fetch('partials/budget-approval-staff.html');
    if (!response.ok) throw Error('โหลดโครงหน้าประชุมไม่สำเร็จ');
    template = document.createElement('template');
    template.innerHTML = await response.text();
  }
  const page = template.content.querySelector('[data-page="budget-approval-staff"]').cloneNode(true);
  page.classList.add('active');
  page.querySelectorAll('[data-budget-staff-panel]').forEach(panel => {
    if (panel.dataset.budgetStaffPanel !== 'meeting') panel.remove();
    else { panel.hidden = false; panel.classList.add('is-active'); }
  });
  page.querySelectorAll('.modal').forEach(modal => modal.remove());
  page.querySelectorAll('[data-budget-staff-tab]').forEach(tab => {
    const active = tab.dataset.budgetStaffTab === 'meeting';
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    if (!active) tab.addEventListener('click', () => { location.href = './#budget-approval-staff'; });
  });
  page.querySelector('[data-budget-meeting-demo]').dataset.preview = 'true';
  main.replaceChildren(page);
  const version = new URL(import.meta.url).search;
  await import(`./app.budget-meeting-ranking-ui.js${version}`);
  await import(`./app.budget-meeting.js${version}`);
} catch (error) {
  main.textContent = error.message;
  main.setAttribute('role', 'alert');
}
