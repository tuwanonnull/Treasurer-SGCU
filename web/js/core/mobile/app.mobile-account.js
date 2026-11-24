/* Mobile account subnavigation reuses existing controls and permissions. */
(() => {
  const $ = id => document.getElementById(id);
  const work = $('work-panel'), login = document.querySelector('.page-view[data-page="login"]');
  const workNav = $('work-mobile-nav'), loginNav = $('login-mobile-nav');
  if (!work || !login || !workNav || !loginNav) return;
  const mobile = window.matchMedia('(max-width: 840px)');
  // Share the project-status bottom action bar styles and keep it outside page transforms.
  for (const nav of [workNav, loginNav]) {
    document.body.append(nav);
    const icons = nav === workNav ? ['▦','◷','⌕','⇄'] : ['○','✓','⚙','⇄'];
    nav.querySelectorAll('button').forEach((button, index) => {
      button.classList.add('mobile-project-action');
      const icon = document.createElement('span');
      icon.className = 'mobile-project-action-icon';
      icon.setAttribute('aria-hidden','true'); icon.textContent = icons[index];
      button.prepend(icon);
    });
  }
  const filterArea = $('work-filter-area');
  const filterHome = document.createComment('work-filter-position');
  filterArea.before(filterHome);
  const sheet = document.createElement('dialog');
  sheet.id = 'account-filter-sheet'; sheet.className = 'mobile-filter-sheet work-preview';
  sheet.setAttribute('aria-labelledby','account-filter-title');
  sheet.innerHTML = '<section class="mobile-filter-dialog"><header class="mobile-filter-header"><h2 id="account-filter-title" class="mobile-filter-title">ตัวกรอง</h2><button type="button" class="mobile-filter-close" aria-label="ปิดตัวกรอง">×</button></header><div class="mobile-filter-body"></div></section>';
  document.body.append(sheet);
  sheet.querySelector('button').addEventListener('click',()=>setFilters(false,true));
  sheet.addEventListener('cancel',event=>{event.preventDefault();setFilters(false,true);});
  sheet.addEventListener('click',event=>{if(event.target===sheet)setFilters(false,true);});

  let authState = null, filterOpen = false, settingsPlaceholder = null;
  let workState = {tab:'current',mode:'normal',staff:false};
  const account = () => window.sgcuTourAccount?.() || {};
  const authenticated = () => authState ?? Boolean(window.sgcuLoginProfileState?.isAuthenticated || account().user);
  const hasLoginStaff = () => {
    const a = account();
    return Boolean(a.staffApproved && (a.staffPages || []).some(page => !['login','home','account-work'].includes(page)));
  };
  function paintMode(nav, mode, allowed) {
    const button = nav.querySelector('[data-account-mobile-mode]');
    button.hidden = !allowed;
    button.querySelector('[data-mobile-mode-label]').textContent = mode === 'staff' ? 'สตาฟ' : 'ทั่วไป';
    button.setAttribute('aria-label', `สลับโหมด ขณะนี้${mode === 'staff' ? 'สตาฟ เปลี่ยนเป็นทั่วไป' : 'ทั่วไป เปลี่ยนเป็นสตาฟ'}`);
  }
  function setFilters(open, focus = false) {
    filterOpen = Boolean(open && mobile.matches && authenticated());
    if (work.classList.contains('mobile-work-filters-open') !== filterOpen) work.classList.toggle('mobile-work-filters-open', filterOpen);
    $('work-mobile-filters').setAttribute('aria-expanded', String(filterOpen));
    $('work-mobile-filters').classList.toggle('is-active',filterOpen);
    if (filterOpen && !sheet.open) {
      sheet.querySelector('.mobile-filter-body').append(filterArea);
      sheet.classList.add('is-open'); sheet.showModal();
      document.body.classList.add('mobile-filter-open');
    } else if (!filterOpen && sheet.open) {
      sheet.close(); sheet.classList.remove('is-open');
      filterHome.after(filterArea);
      document.body.classList.remove('mobile-filter-open');
    }
    if (focus) (filterOpen ? $('service-filter') : $('work-mobile-filters')).focus({preventScroll:true});
  }
  function moveSettings(enabled) {
    const settings = $('loginSettingsSection'), slot = $('loginMobileSettingsSlot');
    if (!settings || !slot) return;
    if (enabled && !settingsPlaceholder) {
      settingsPlaceholder = document.createComment('account-settings-desktop-position');
      settings.before(settingsPlaceholder); slot.append(settings);
    } else if (!enabled && settingsPlaceholder) {
      settingsPlaceholder.replaceWith(settings); settingsPlaceholder = null;
    }
  }
  function syncWork(tab, mode, staff) {
    workState = {tab,mode,staff};
    workNav.querySelectorAll('[data-work-mobile-tab]').forEach(button => {button.setAttribute('aria-pressed', String(button.dataset.workMobileTab === tab));button.classList.toggle('is-active',button.dataset.workMobileTab === tab);});
    paintMode(workNav,mode,staff && authenticated());
  }
  function sync() {
    const enabled = mobile.matches && authenticated();
    workNav.hidden = !(enabled && work.classList.contains('active'));
    loginNav.hidden = !(enabled && login.classList.contains('active'));
    workNav.classList.toggle('is-visible',!workNav.hidden);
    loginNav.classList.toggle('is-visible',!loginNav.hidden);
    document.body.classList.toggle('has-mobile-account-actions',!workNav.hidden || !loginNav.hidden);
    if (work.classList.contains('has-account-mobile-nav') !== enabled) work.classList.toggle('has-account-mobile-nav', enabled);
    if (login.classList.contains('has-account-mobile-nav') !== enabled) login.classList.toggle('has-account-mobile-nav', enabled);
    if (!enabled || !work.classList.contains('active')) setFilters(false);
    moveSettings(enabled);
    syncWork(window.sgcuWork?.isHistory() ? 'history' : 'current', account().mode || workState.mode, workState.staff);
    paintMode(loginNav,account().mode || 'normal',enabled && hasLoginStaff());
    loginNav.querySelectorAll('[data-login-mobile-section]').forEach(button=>button.classList.toggle('is-active',button.getAttribute('aria-pressed')==='true'));
    const a = account();
    const roles = ['ผู้ใช้ทั่วไป'];
    if (a.staffApproved) roles.push('สตาฟ');
    if (a.representativeApproved) roles.push('ตัวแทนองค์กร');
    $('loginMobileAccessSummary').textContent = enabled ? (a.ready === false ? 'กำลังตรวจสอบสิทธิ์การใช้งาน…' : 'สิทธิ์ปัจจุบัน: ' + roles.join(' · ')) : '';
    if (!enabled) loginNav.querySelectorAll('[data-login-mobile-section]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.loginMobileSection === 'account')));
  }
  function headerOffset() {
    const header = document.querySelector('.site-header');
    const fixed = header && ['fixed','sticky'].includes(getComputedStyle(header).position);
    document.documentElement.style.setProperty('--account-subnav-top', `${fixed ? header.getBoundingClientRect().height : 0}px`);
  }
  function jumpTo(section) {
    const targets = {account:$('loginGooglePanel'),access:$('loginAccessSection'),settings:$('loginSettingsSection')};
    const target = targets[section];
    if (!target || !authenticated()) return;
    loginNav.querySelectorAll('[data-login-mobile-section]').forEach(button => {button.setAttribute('aria-pressed', String(button.dataset.loginMobileSection === section));button.classList.toggle('is-active',button.dataset.loginMobileSection === section);});
    target.tabIndex = -1;
    target.focus({preventScroll:true});
    // Scroll the document only; scrollIntoView also scrolls overflow:hidden cards.
    const shell = login.querySelector('.login-shell');
    if (shell) shell.scrollTop = 0;
    headerOffset();
    const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--account-subnav-top')) || 0;
    window.scrollTo({top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset - 16), behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  workNav.addEventListener('click', event => {
    const tab = event.target.closest('[data-work-mobile-tab]')?.dataset.workMobileTab;
    if (tab) { setFilters(false); window.sgcuWork?.selectTab(tab); }
  });
  $('work-mobile-filters').addEventListener('click', () => setFilters(!filterOpen,true));
  $('work-mobile-filters-done').addEventListener('click', () => setFilters(false,true));
  loginNav.addEventListener('click', event => {
    const section = event.target.closest('[data-login-mobile-section]')?.dataset.loginMobileSection;
    if (section) jumpTo(section);
  });
  for (const nav of [workNav,loginNav]) nav.querySelector('[data-account-mobile-mode]').addEventListener('click', event => {
    if (!authenticated() || event.currentTarget.hidden) return;
    const isWork = nav === workNav, mode = account().mode || workState.mode;
    const root = isWork ? work.querySelector('.page-switch') : $('staffModeToggle');
    if (isWork ? !workState.staff : !hasLoginStaff()) return;
    setFilters(false);
    root?.querySelector(`[data-staff-mode="${mode === 'staff' ? 'normal' : 'staff'}"]`)?.click();
    sync();
  });
  for (const name of ['sgcu:auth-state','sgcu:staff-auth-updated','sgcu:login-profile-state']) window.addEventListener(name,event => {
    if (typeof event.detail?.isAuthenticated === 'boolean') authState = event.detail.isAuthenticated;
    sync();
  });
  window.addEventListener('sgcu:page-active', sync);
  mobile.addEventListener('change', () => {sync();headerOffset();});
  for (const root of [work,login]) new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  for (const toggle of [work.querySelector('.page-switch'),$('staffModeToggle')]) if (toggle) new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:['data-mode']});
  const header = document.querySelector('.site-header');
  if (header && window.ResizeObserver) new ResizeObserver(headerOffset).observe(header);
  window.sgcuMobileAccount = {syncWork};
  headerOffset();sync();
})();
