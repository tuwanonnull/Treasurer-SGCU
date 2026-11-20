/* Account-scoped onboarding. Navigation always uses the application's guards. */
(() => {
  const policy = globalThis.sgcuTourPolicy;
  const session = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let uid = '', records = {}, loaded = false, loading = false, busy = false;
  let active = null, dialog = null, card = null, ring = null, target = null, previousFocus = null;
  let menuRestore = null;
  let transitioning = false;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dirty = false, generation = 0, writeQueue = Promise.resolve(), lastRetry = 0;
  const offered = new Set();
  const unavailable = new Set();
  const pendingWrites = new Map();
  const visible = el => !!el && !el.closest('[hidden]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const account = () => window.sgcuTourAccount?.();
  const storageKey = id => `sgcu-onboarding:${id}`;
  const localRead = id => { try { return JSON.parse(localStorage.getItem(storageKey(id)) || '{}'); } catch { return {}; } };
  function cache() { try { localStorage.setItem(storageKey(uid), JSON.stringify(records)); } catch { /* optional offline cache */ } }
  function ref(id) {
    const f = window.sgcuFirestore;
    return f?.db && f.doc ? f.doc(f.db, 'userProfiles', id) : null;
  }
  function persist(key, record) {
    records[key] = { ...record, updatedAt: Date.now(), pendingSync: true };
    cache();
    pendingWrites.set(key, records[key]);
    flush();
  }
  function flush() {
    const owner = uid;
    for (const [key, record] of pendingWrites) {
      pendingWrites.delete(key);
      writeQueue = writeQueue.then(async () => {
        if (uid !== owner || account()?.user?.uid !== owner) return;
        try {
          const { pendingSync, ...remote } = record;
          const f = window.sgcuFirestore;
          if (!ref(owner) || !f?.setDoc) throw Error('store-not-ready');
          await f.setDoc(ref(owner), { onboardingTours: { [key]: remote } }, { merge: true });
          if (uid === owner && records[key]?.updatedAt === record.updatedAt) {
            records[key].pendingSync = false;
            cache();
          }
        } catch {
          if (uid === owner && records[key]?.updatedAt === record.updatedAt) pendingWrites.set(key, record);
        }
      });
    }
  }
  async function load(owner) {
    loading = true;
    const cached = localRead(owner);
    try {
      const f = window.sgcuFirestore;
      if (!f?.getDoc || !ref(owner)) throw Error('store-not-ready');
      const snap = await Promise.race([f.getDoc(ref(owner)), new Promise((_, reject) => setTimeout(() => reject(Error('timeout')), 8000))]);
      if (uid !== owner) return;
      const remote = snap?.exists() ? (snap.data().onboardingTours || {}) : {};
      records = { ...remote };
      for (const [key, value] of Object.entries(cached)) {
        if (value.pendingSync && (!remote[key] || value.updatedAt > remote[key].updatedAt)) {
          records[key] = value;
          pendingWrites.set(key, value);
        }
      }
      loaded = true;
      cache();
      flush();
    } catch {
      // Do not mistake an unread account for a first-time user on a new device.
      if (uid === owner && Object.keys(cached).length) {
        records = cached; loaded = true;
        Object.entries(cached).forEach(([key, value]) => { if (value.pendingSync) pendingWrites.set(key, value); });
      }
    } finally { if (uid === owner) loading = false; }
  }
  function blocked() {
    const p = window.sgcuLoginProfileState;
    return !p?.isAuthenticated || p.isLoading || !p.isComplete ||
      !window.sgcuTourNavigation?.consentReady() ||
      [...document.querySelectorAll('.modal.show, [role="dialog"][aria-hidden="false"], dialog[open]')]
        .some(el => el !== dialog && visible(el));
  }
  function close() {
    generation++;
    transitioning = false;
    target?.classList.remove('sgcu-tour-anchor');
    menuRestore?.(); menuRestore = null;
    dialog?.close(); dialog?.remove(); dialog = card = ring = target = null;
    active = null;
    if (visible(previousFocus)) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function create() {
    previousFocus = document.activeElement;
    dialog = document.createElement('dialog'); dialog.className = 'sgcu-tour';
    dialog.setAttribute('aria-labelledby', 'sgcuTourTitle');
    dialog.setAttribute('aria-describedby', 'sgcuTourText');
    ring = document.createElement('div'); ring.className = 'sgcu-tour-ring'; ring.hidden = true;
    ring.setAttribute('aria-hidden', 'true');
    card = document.createElement('div'); card.className = 'sgcu-tour-card';
    dialog.append(ring, card); document.body.append(dialog);
    dialog.addEventListener('click', event => event.stopPropagation());
    dialog.addEventListener('cancel', event => { event.preventDefault(); defer(); });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const buttons = [...dialog.querySelectorAll('button:not(:disabled)')];
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    });
    dialog.showModal();
  }
  function display(title, text, buttons, progress = '') {
    card.replaceChildren();
    card.removeAttribute('aria-busy');
    dialog.classList.remove('is-transitioning');
    const caption = document.createElement('div'); caption.className = 'sgcu-tour-progress'; caption.textContent = progress || 'แนะนำการใช้งาน';
    const heading = document.createElement('h2'); heading.id = 'sgcuTourTitle'; heading.textContent = title; heading.tabIndex = -1;
    const body = document.createElement('p'); body.id = 'sgcuTourText'; body.textContent = text;
    const actions = document.createElement('div'); actions.className = 'sgcu-tour-actions';
    const footer = document.createElement('div'); footer.className = 'sgcu-tour-footer';
    [...buttons].sort((a, b) => Number(!!a[2]) - Number(!!b[2])).forEach(([label, callback, primary, disabled]) => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = primary ? 'btn-primary' : 'btn-ghost';
      btn.textContent = label; btn.disabled = !!disabled;
      const skip = label.startsWith('ข้าม');
      if (skip) { btn.className = 'sgcu-tour-skip'; btn.title = 'ข้ามแล้วจะไม่แนะนำชุดนี้อัตโนมัติอีก'; }
      btn.addEventListener('click', callback); (skip ? footer : actions).append(btn);
    });
    const hint = document.createElement('div'); hint.className = 'sgcu-tour-hint';
    hint.textContent = buttons.length > 1 ? 'Esc เพื่อไว้ภายหลัง' : 'เปิดดูคำแนะนำซ้ำได้ทุกเมื่อ';
    const track = document.createElement('div'); track.className = 'sgcu-tour-track'; track.setAttribute('aria-hidden', 'true');
    if (progress && active) active.steps.forEach((step, index) => {
      const line = document.createElement('span');
      line.className = index === active.index ? 'is-current' : index < active.index ? 'is-complete' : '';
      track.append(line);
    });
    track.hidden = !progress;
    footer.append(hint);
    const header = document.createElement('div'); header.className = 'sgcu-tour-header';
    header.append(caption, heading);
    card.append(header, track, body, actions, footer);
    position(); heading.focus({ preventScroll: true });
    if (!reducedMotion()) {
      [caption, heading, body, actions, hint].forEach(el => el.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' }));
    }
  }
  function position() {
    if (!card || transitioning) return;
    const w = innerWidth, h = window.visualViewport?.height || innerHeight;
    card.style.maxHeight = `${h - 24}px`;
    let ch = card.offsetHeight;
    const cw = card.offsetWidth;
    let left = (w - cw) / 2, top = (h - ch) / 2;
    ring.hidden = !visible(target);
    dialog.classList.toggle('has-spotlight', !ring.hidden);
    if (!ring.hidden) {
      let r = target.getBoundingClientRect();
      const menu = target.querySelector('.nav-group-menu.show');
      if (visible(menu)) {
        const m = menu.getBoundingClientRect();
        const left = Math.min(r.left, m.left), top = Math.min(r.top, m.top);
        const right = Math.max(r.right, m.right), bottom = Math.max(r.bottom, m.bottom);
        r = { left, top, right, bottom, width: right - left, height: bottom - top };
      }
      const apertureLeft = Math.max(4, r.left - 4), apertureTop = Math.max(4, r.top - 4);
      Object.assign(ring.style, {
        left: `${apertureLeft}px`, top: `${apertureTop}px`,
        width: `${Math.max(0, Math.min(w - 4, r.right + 4) - apertureLeft)}px`,
        height: `${Math.max(0, Math.min(h - 4, r.bottom + 4) - apertureTop)}px`
      });
      top = r.bottom + 14 + ch < h ? r.bottom + 14 : Math.max(12, r.top - ch - 14);
      left = Math.min(w - cw - 12, Math.max(12, r.left));
      if (w <= 600) {
        left = (w - cw) / 2;
        const above = Math.max(0, r.top - 26);
        const below = Math.max(0, h - r.bottom - 26);
        const placeBelow = below >= ch || (above < ch && below >= above);
        const space = placeBelow ? below : above;
        // On short screens, scroll the card itself instead of covering the anchor.
        if (space < ch) {
          card.style.maxHeight = `${Math.max(1, space)}px`;
          ch = card.offsetHeight;
        }
        top = placeBelow ? r.bottom + 14 : r.top - ch - 14;
        card.dataset.placement = placeBelow ? 'below' : 'above';
      }
      else if (r.right + cw + 24 < w) { left = r.right + 14; top = r.top; }
      else if (r.left > cw + 24) { left = r.left - cw - 14; top = r.top; }
    }
    Object.assign(card.style, { left: `${Math.max(12, left)}px`, top: `${Math.max(12, Math.min(h - ch - 12, top))}px` });
  }
  function saveProgress(status, extra = {}) {
    if (!active) return;
    const record = records[active.key] || {};
    persist(active.key, { ...record, status, currentStep: active.steps[active.index]?.id || '', ...extra });
  }
  function defer() {
    saveProgress('deferred', { deferredSession: session, deferUntil: Date.now() + 86400000 });
    close();
  }
  function finish(skip = false) {
    if (!active) return;
    const record = records[active.key] || {};
    const seen = new Set(record.seen || []);
    active.steps.forEach(step => policy.seenIds(step).forEach(id => seen.add(id)));
    saveProgress(skip ? 'skipped' : 'completed', { seen: [...seen], currentStep: '', started: false, deferUntil: 0, deferredSession: '' });
    if (skip) { close(); return; }
    target = null;
    display('พร้อมเริ่มใช้งานแล้ว', 'เปิดดูคำแนะนำอีกครั้งได้จากหน้าบัญชีผู้ใช้ › แนะนำการใช้งาน', [['เสร็จสิ้น', close, true]]);
    active.finished = true;
  }
  function revealNav(step) {
    menuRestore?.();
    const menus = [...document.querySelectorAll('#mobileMenu, #hamburgerBtn, .nav-group, .nav-group-menu, .nav-group-toggle, .mobile-menu-group')];
    const saved = menus.map(el => [el, ['class', 'aria-hidden', 'aria-expanded', 'open'].map(attr => [attr, el.getAttribute(attr)])]);
    const wasOpen = document.body.classList.contains('mobile-menu-open');
    menuRestore = () => {
      saved.forEach(([el, attrs]) => attrs.forEach(([attr, value]) => value === null ? el.removeAttribute(attr) : el.setAttribute(attr, value)));
      document.body.classList.toggle('mobile-menu-open', wasOpen);
      if (window.matchMedia('(min-width: 841px)').matches) {
        document.getElementById('mobileMenu')?.classList.remove('show');
        document.getElementById('mobileMenu')?.setAttribute('aria-hidden', 'true');
        document.getElementById('hamburgerBtn')?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mobile-menu-open');
      }
    };
    const mobile = visible(document.getElementById('hamburgerBtn'));
    const scope = document.querySelector(mobile ? '#mobileMenu' : (account().mode === 'staff' ? '#desktopNavStaff' : '#desktopNavGeneral'));
    const link = scope?.querySelector(`[data-page="${step.page}"]`);
    if (!link || link.style.display === 'none') return null;
    if (mobile) {
      const menu = document.getElementById('mobileMenu');
      const button = document.getElementById('hamburgerBtn');
      menu.classList.add('show'); menu.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-expanded', 'true'); document.body.classList.add('mobile-menu-open');
      const group = link.closest('details');
      menu.querySelectorAll('details').forEach(item => {
        item.open = item === group || item.classList.contains('is-single');
      });
    } else {
      const toggle = link.closest('.nav-group')?.querySelector('.nav-group-toggle');
      if (toggle?.getAttribute('aria-expanded') === 'false') toggle.click();
    }
    return step.group ? (link.closest('.nav-group, .mobile-menu-group') || link) : link;
  }
  async function showStep(direction = 1) {
    if (!active || active.finished) return;
    const token = ++generation;
    const step = active.steps[active.index];
    if (!step) { finish(); return; }
    active.started = true;
    transitioning = true;
    target?.classList.remove('sgcu-tour-anchor');
    dialog.classList.add('is-transitioning');
    card.setAttribute('aria-busy', 'true');
    card.querySelectorAll('button').forEach(button => { button.disabled = true; });
    target = null;
    try {
      menuRestore?.(); menuRestore = null;
      if (step.mode && account().mode !== step.mode) {
        await window.sgcuTourNavigation.setMode(step.mode);
        if (token !== generation) return;
        active.mode = account().mode;
      }
      if ((step.mode && account().mode !== step.mode) || !account().pages.includes(step.page)) {
        advanceUnavailable(direction); return;
      }
      if (step.nav) target = revealNav(step);
      else {
        if (document.querySelector('.page-view.active')?.dataset.page !== step.page) {
          if (dirty) { defer(); return; }
          await Promise.race([window.sgcuTourNavigation.navigate(step.page), new Promise((_, reject) => setTimeout(() => reject(Error('timeout')), 7000))]);
        }
        if (token !== generation) return;
        target = document.querySelector(step.selector);
      }
      await settleTarget(target, token);
      if (token !== generation) return;
      if (blocked()) { close(); return; }
      if (!visible(target)) { advanceUnavailable(direction); return; }
      // Large panels cannot fit beside a card on a phone; introduce the panel at its heading.
      if (innerWidth <= 600 && target.getBoundingClientRect().height > innerHeight * .45) {
        const headingTarget = target.querySelector('.panel-header, .panel-title, h2, h3, summary');
        if (visible(headingTarget)) target = headingTarget;
      }
      target.classList.add('sgcu-tour-anchor');
      const rect = target.getBoundingClientRect();
      const bottomSpace = 80;
      if (rect.top < 90 || rect.bottom > innerHeight - bottomSpace) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'instant' : 'smooth' });
        if (!reducedMotion()) await settleScroll(target);
      }
      if (token !== generation) return;
      transitioning = false;
      saveProgress('in_progress', { started: true, deferUntil: 0, deferredSession: '' });
      display(step.title, step.text, [
        ['ย้อนกลับ', () => { active.index--; void showStep(-1); }, false, active.index === 0],
        [active.index === active.steps.length - 1 ? 'เสร็จสิ้น' : 'ถัดไป', () => {
          const seen = new Set(records[active.key]?.seen || []); policy.seenIds(step).forEach(id => seen.add(id));
          saveProgress('in_progress', { seen: [...seen] });
          active.index++; void showStep();
        }, true],
        ['ข้าม', () => finish(true)]
      ], `ขั้นที่ ${active.index + 1} จาก ${active.steps.length}`);
    } catch { if (token === generation) advanceUnavailable(direction); }
    finally { if (token === generation) transitioning = false; }
  }
  function settleTarget(element, token = generation) {
    if (!element) return Promise.resolve();
    return new Promise(resolve => {
      const start = performance.now();
      const scope = element.closest('#mobileMenu, .nav-group') || element;
      let previous = null, stable = 0;
      function frame() {
        if (!element.isConnected || !active || token !== generation) { resolve(); return; }
        const r = element.getBoundingClientRect();
        const next = [r.top, r.left, r.width, r.height];
        stable = previous && next.every((value, i) => Math.abs(value - previous[i]) < .5) ? stable + 1 : 0;
        previous = next;
        const moving = (scope.getAnimations?.({ subtree: true }) || []).some(animation =>
          animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime));
        if ((!moving && stable >= 4 && performance.now() - start > 80) || performance.now() - start > 1200) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }
  function settleScroll(element) {
    return new Promise(resolve => {
      const start = performance.now();
      let previous = element.getBoundingClientRect().top, stable = 0;
      function frame() {
        if (!element.isConnected || !active) { resolve(); return; }
        const top = element.getBoundingClientRect().top;
        stable = Math.abs(top - previous) < .5 ? stable + 1 : 0;
        previous = top;
        if ((stable >= 4 && performance.now() - start > 180) || performance.now() - start > 900) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }
  function advanceUnavailable(direction) {
    unavailable.add(`${active.key}:${active.steps[active.index]?.id}`);
    active.steps.splice(active.index, 1);
    active.index = Math.max(0, Math.min(active.index + (direction < 0 ? -1 : 0), active.steps.length - 1));
    if (!active.steps.length) { close(); return; }
    void showStep(direction);
  }
  function offer(tour, replay = false) {
    const record = policy.recordFor(tour, records);
    const steps = policy.pending(tour, record, replay);
    if (!steps.length) return;
    active = { key: tour.key, steps, index: 0, mode: account().mode, owner: uid };
    const index = steps.findIndex(s => s.id === record.currentStep);
    if (!replay && index >= 0) active.index = index;
    offered.add(`${tour.key}:${steps.map(s => s.id).join('|')}`);
    create();
    const resume = !replay && record.started === true;
    display(resume ? 'ดูคำแนะนำต่อไหม?' : tour.special ? 'สิทธิ์ของคุณพร้อมใช้งานแล้ว' : 'ให้เราพาคุณรู้จักการใช้งาน',
      resume ? 'คุณยังดูคำแนะนำชุดนี้ไม่ครบ สามารถดูต่อจากจุดที่ค้างไว้ได้' : 'แนะนำเมนูและวิธีเริ่มต้นสั้น ๆ ตามสิทธิ์ของคุณ สามารถข้ามหรือกลับมาดูใหม่ได้เสมอ',
      [[resume ? 'ดูต่อ' : 'เริ่มแนะนำ', () => void showStep(), true], ['ไว้ภายหลัง', defer], ['ข้ามชุดนี้', () => finish(true)]]);
  }
  async function tick(replay = false) {
    if (busy) return;
    busy = true;
    try {
      const a = account();
      const nextUid = a?.user?.uid || '';
      if (uid !== nextUid) {
        close(); uid = nextUid; records = {}; loaded = loading = false; dirty = false;
        pendingWrites.clear(); offered.clear(); unavailable.clear();
      }
      const enabled = globalThis.SGCU_APP_CONFIG?.onboarding?.enabled !== false;
      if (!uid || !enabled) { close(); return; }
      if (active && (active.owner !== uid || (!transitioning && active.mode !== a.mode) || blocked())) { close(); return; }
      if (active) {
        if (active.started && !transitioning && !active.finished && !a.pages.includes(active.steps[active.index]?.page)) advanceUnavailable(1);
        return;
      }
      if (!a.ready || blocked() || dirty) return;
      if (!loaded && !loading && Date.now() - lastRetry > 5000) { lastRetry = Date.now(); await load(uid); }
      if (!loaded || uid !== account()?.user?.uid || blocked()) return;
      if (pendingWrites.size && Date.now() - lastRetry > 15000) { lastRetry = Date.now(); flush(); }
      if (!records.rollout_v1) {
        const baseline = policy.rolloutBaseline(account(), globalThis.SGCU_APP_CONFIG?.onboarding?.rolloutAt);
        if (baseline) persist('rollout_v1', baseline);
      }
      const tour = policy.build(account(), replay);
      if (!replay) tour.steps = tour.steps.filter(step => !unavailable.has(`${tour.key}:${step.id}`));
      const record = policy.recordFor(tour, records);
      const signature = `${tour.key}:${policy.pending(tour, record).map(s => s.id).join('|')}`;
      if (replay || (!offered.has(signature) && policy.eligible(record, session))) offer(tour, replay);
    } catch { close(); } finally { busy = false; }
  }
  document.addEventListener('input', event => {
    if (!dialog?.contains(event.target) && event.target.closest('.page-view.active')) dirty = true;
  });
  window.addEventListener('sgcu:page-active', () => { dirty = false; });
  window.addEventListener('sgcu:user-profile-updated', () => { dirty = false; });
  window.addEventListener('resize', async () => {
    if (active && !active.finished && active.steps[active.index]?.nav && target) {
      target = revealNav(active.steps[active.index]);
      const resizedTarget = target;
      await settleTarget(resizedTarget);
      if (resizedTarget !== target) return;
    }
    position();
  });
  window.addEventListener('scroll', position, true);
  window.visualViewport?.addEventListener('resize', position);
  window.addEventListener('online', () => { flush(); void tick(); });
  function init() {
    document.getElementById('onboardingReplayBtn')?.addEventListener('click', () => void tick(true));
    setInterval(() => void tick(), 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
