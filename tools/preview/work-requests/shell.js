/* Interaction adapter for the real website shell. No live app scripts or APIs. */
(() => {
  const $ = id => document.getElementById(id);
  $('appLoader')?.remove();
  document.querySelectorAll('.section-appear').forEach(el => el.classList.add('section-visible'));
  document.querySelectorAll('.page-view').forEach(el => el.classList.toggle('active', el.dataset.page === 'account-work'));
  document.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => event.preventDefault()));
  function closeMenus() {
    document.querySelectorAll('.nav-group-toggle').forEach(button => button.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.nav-group-menu').forEach(menu => { menu.classList.remove('show'); menu.setAttribute('aria-hidden', 'true'); });
    document.querySelectorAll('.nav-group').forEach(group => group.classList.remove('is-open'));
    $('mobileMenu')?.classList.remove('show'); $('mobileMenu')?.setAttribute('aria-hidden', 'true');
    $('hamburgerBtn')?.setAttribute('aria-expanded', 'false'); document.body.classList.remove('mobile-menu-open');
  }
  function announce(message) {
    const toast = $('toast'); toast.textContent = message; toast.hidden = false;
    clearTimeout(window.workPreviewToastTimer);
    window.workPreviewToastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  }
  document.querySelectorAll('.nav-group-toggle').forEach(button => button.onclick = () => {
    const menu = button.parentElement.querySelector('.nav-group-menu');
    const open = !menu.classList.contains('show'); closeMenus();
    button.setAttribute('aria-expanded', String(open)); menu.classList.toggle('show', open);
    menu.setAttribute('aria-hidden', String(!open)); button.parentElement.classList.toggle('is-open', open);
  });
  if ($('hamburgerBtn')) $('hamburgerBtn').onclick = () => {
    const open = !$('mobileMenu').classList.contains('show'); closeMenus();
    $('mobileMenu').classList.toggle('show', open); $('mobileMenu').setAttribute('aria-hidden', String(!open));
    $('hamburgerBtn').setAttribute('aria-expanded', String(open)); document.body.classList.toggle('mobile-menu-open', open);
  };
  function navigate(page) {
    closeMenus();
    if (['login', 'account-work'].includes(page)) {
      window.sgcuWorkPreview?.setSection(page === 'login' ? 'profile' : 'work');
      history.replaceState(null, '', '#' + page); window.scrollTo(0, 0);
    } else announce('ตัวอย่างนี้เปิดให้ลองเฉพาะหน้าบัญชีและงานและคำขอ');
  }
  document.querySelectorAll('a[data-page]').forEach(link => link.onclick = event => { event.preventDefault(); navigate(link.dataset.page); });
  document.querySelectorAll('a[href="#login"]').forEach(link => link.onclick = event => { event.preventDefault(); navigate('login'); });
  document.querySelectorAll('.logo-mark a, .site-footer a').forEach(link => link.onclick = event => { event.preventDefault(); announce('ลิงก์ภายนอกปิดไว้ในหน้าทดลอง'); });
  document.addEventListener('click', event => { if (!event.target.closest('.nav-group, #mobileMenu, #hamburgerBtn')) closeMenus(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenus(); });
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
  $('demo-theme').onchange = () => { document.documentElement.dataset.theme = $('demo-theme').value; };
  $('themePreference').onclick = () => { $('demo-theme').value = $('demo-theme').value === 'dark' ? 'light' : 'dark'; $('demo-theme').onchange(); };
  const hero = document.querySelector('.login-hero'); hero.classList.add('is-authenticated');
  $('loginHeroContent').hidden = true; $('loginProfileCard').hidden = false; $('authAccessSelfService').hidden = true;
  $('loginPageGoogleBtn').style.display = 'none'; $('loginPageLogoutBtn').style.display = 'inline-block';
  $('loginPageLogoutBtn').onclick = () => announce('บัญชีนี้เป็นบัญชีตัวอย่าง ไม่มีการเข้าสู่ระบบจริง');
  $('loginPageStatus').textContent = 'สวัสดี, นิสิต ตัวอย่าง';
  $('loginAccountEmail').textContent = 'student@example.invalid'; $('loginAccountEmail').hidden = false;
  $('loginAccountAvatar').textContent = 'น'; $('loginAccountAvatar').hidden = false;
  $('userInfo').textContent = 'นิสิต ตัวอย่าง';
  $('loginProfileTypeDisplay').textContent = 'นิสิต';
  for (const [id, value] of Object.entries({ loginProfileFirstName: 'นิสิต', loginProfileLastName: 'ตัวอย่าง', loginProfileNickname: 'ตัวอย่าง', loginProfileStudentId: '6900000021', loginProfilePhone: '0800000000', loginProfileLineId: 'demo' })) { if ($(id)) $(id).value = value; }
  $('loginProfileFaculty').textContent = 'วิศวกรรมศาสตร์'; $('loginProfileYear').textContent = '1';
  $('loginNotificationSummary').textContent = 'โหมดทดลอง: ไม่ส่งการแจ้งเตือน';
  document.querySelectorAll('#profile-panel button:not([data-staff-mode]):not(#themePreference):not(#loginPageLogoutBtn)').forEach(button => {
    button.onclick = event => { event.preventDefault(); announce('ตัวอย่างหน้าบัญชี ไม่มีการบันทึกข้อมูลจริง'); };
  });
  window.sgcuWorkPreviewShell = {
    render(mode, role, section) {
      const isStaff = role !== 'user', scope = isStaff && mode === 'staff' ? 'staff' : 'general';
      document.querySelectorAll('[data-role-nav]').forEach(el => { el.style.display = el.dataset.roleNav === scope ? '' : 'none'; });
      document.querySelectorAll('[data-mobile-bottom-nav]').forEach(el => { el.style.display = el.dataset.mobileBottomNav === scope ? 'contents' : 'none'; });
      document.querySelectorAll('.mobile-menu-group[data-mobile-nav]').forEach(el => { el.style.display = el.dataset.mobileNav === scope ? '' : 'none'; });
      document.querySelectorAll('#desktopNavStaff a[data-page], .mobile-menu-group[data-mobile-nav="staff"] a[data-page]').forEach(link => {
        link.style.display = role !== 'meeting' || ['meeting-room-staff', 'login', 'account-work'].includes(link.dataset.page) ? '' : 'none';
      });
      document.querySelectorAll('#desktopNavStaff .nav-group, .mobile-menu-group[data-mobile-nav="staff"]').forEach(group => {
        const hasLinks = [...group.querySelectorAll('a[data-page]')].some(link => link.style.display !== 'none');
        group.style.display = hasLinks && (group.dataset.mobileNav !== 'staff' || scope === 'staff') ? '' : 'none';
      });
      document.querySelectorAll('.staff-mode-toggle').forEach(group => { group.hidden = !isStaff; group.style.display = isStaff ? 'flex' : 'none'; group.dataset.mode = mode; });
      document.querySelectorAll('[data-staff-mode]').forEach(button => {
        button.classList.toggle('is-active', button.dataset.staffMode === mode);
        button.setAttribute('aria-pressed', String(button.dataset.staffMode === mode));
      });
      document.querySelectorAll('.page-view').forEach(el => { el.classList.toggle('active', el.dataset.page === (section === 'profile' ? 'login' : 'account-work')); });
      document.querySelectorAll('a[data-page]').forEach(link => { link.classList.toggle('active', link.dataset.page === (section === 'profile' ? 'login' : 'account-work')); });
    }
  };
})();
