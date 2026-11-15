/* Motion helpers: section appear + count up */
let homePanelObserver = null;
let hasInitPressMotion = false;
let hasInitHomeScrollPolish = false;
let homeScrollRaf = null;
let homeScrollIdleTimer = null;

function initSectionAppearObserver() {
  const sections = document.querySelectorAll(".section-appear");
  if (!sections.length) return;

  if (sectionObserver) {
    sectionObserver.disconnect();
  }

  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("section-visible");
          sectionObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  sections.forEach((sec) => sectionObserver.observe(sec));
}

function revealMobileActivePageSections() {
  const activePage = document.querySelector(".page-view.active");
  if (!activePage) return;
  const isMobile = window.matchMedia && window.matchMedia("(max-width: 840px)").matches;
  if (!isMobile) return;

  activePage.querySelectorAll(".section-appear").forEach((section) => {
    section.classList.add("section-visible");
    if (sectionObserver) {
      sectionObserver.unobserve(section);
    }
  });
}

function initHomePanelMotion() {
  const homePage = document.querySelector('.page-view[data-page="home"]');
  const panels = Array.from(homePage?.querySelectorAll(".home-snap-panel") || []);
  if (!homePage || !homePage.classList.contains("active") || !panels.length) return;

  if (homePanelObserver) {
    homePanelObserver.disconnect();
  }

  const revealPanel = (panel) => panel.classList.add("home-panel-visible");
  panels.forEach((panel) => panel.classList.remove("home-panel-visible"));

  if (!("IntersectionObserver" in window)) {
    panels.forEach(revealPanel);
    return;
  }

  homePanelObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealPanel(entry.target);
      });
    },
    {
      root: null,
      threshold: 0.28,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  panels.forEach((panel, index) => {
    if (index === 0) revealPanel(panel);
    homePanelObserver.observe(panel);
  });
}

function initHomeScrollPolish() {
  if (hasInitHomeScrollPolish) return;
  hasInitHomeScrollPolish = true;

  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const updateHomeScrollState = () => {
    homeScrollRaf = null;
    const homePage = document.querySelector('.page-view[data-page="home"]');
    if (!(homePage instanceof HTMLElement) || !homePage.classList.contains("active")) return;

    const total = Math.max(homePage.offsetHeight - window.innerHeight, 1);
    const pageTop = homePage.getBoundingClientRect().top;
    const progress = Math.min(Math.max(-pageTop / total, 0), 1);
    homePage.style.setProperty("--home-scroll-progress", progress.toFixed(4));
    homePage.style.setProperty("--home-hero-depth", Math.min(progress * 1.35, 1).toFixed(4));
  };

  const requestHomeScrollUpdate = () => {
    document.body.classList.add("home-is-scrolling");
    window.clearTimeout(homeScrollIdleTimer);
    homeScrollIdleTimer = window.setTimeout(() => {
      document.body.classList.remove("home-is-scrolling");
    }, 180);

    if (homeScrollRaf !== null) return;
    homeScrollRaf = window.requestAnimationFrame(updateHomeScrollState);
  };

  window.addEventListener("scroll", requestHomeScrollUpdate, { passive: true });
  window.addEventListener("resize", requestHomeScrollUpdate, { passive: true });
  requestHomeScrollUpdate();
}

function initPressMotion() {
  if (hasInitPressMotion) return;
  hasInitPressMotion = true;

  const interactiveSelector = [
    ".btn-primary",
    ".btn-secondary",
    ".btn-ghost",
    ".scope-pill",
    ".home-news-link",
    ".home-scroll-hint",
    ".tab-btn",
    ".mobile-bottom-item"
  ].join(",");

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest(interactiveSelector);
    if (!(control instanceof HTMLElement) || control.hasAttribute("disabled")) return;

    if (control.matches(".scope-pill") && control.closest(".about-page")) return;

    control.classList.add("is-pressing");
    window.setTimeout(() => control.classList.remove("is-pressing"), 180);

    if (!control.matches(".btn-primary, .btn-secondary, .scope-pill")) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = control.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.9;
    const ripple = document.createElement("span");
    ripple.className = "motion-ripple";
    control.classList.add("has-motion-ripple");
    ripple.style.setProperty("--ripple-size", `${size}px`);
    ripple.style.setProperty("--ripple-x", `${event.clientX - rect.left}px`);
    ripple.style.setProperty("--ripple-y", `${event.clientY - rect.top}px`);
    control.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });
}

function initCountupOnVisible() {
  const elements = document.querySelectorAll("[data-countup]");
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const target = parseFloat(el.dataset.countup || "0") || 0;
        const duration = 900;
        const startTime = performance.now();

        function animate(now) {
          const t = Math.min((now - startTime) / duration, 1);
          const eased = t * (2 - t); // ease-out
          const value = Math.floor(target * eased);
          el.textContent = value.toLocaleString("th-TH");
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            el.textContent = target.toLocaleString("th-TH");
          }
        }
        requestAnimationFrame(animate);

        obs.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  elements.forEach((el) => observer.observe(el));
  hasInitCountup = true;
}

// Fill the timeline as its milestones pass the lower-middle of the viewport.
const observedSystemTimelines = new WeakSet();
const systemTimelineMotionState = new WeakMap();
let systemTimelineScrollInitialized = false;
let systemTimelineRaf = null;
function updateSystemTimelineProgress() {
  systemTimelineRaf = null;
  let settling = false;
  const now = performance.now();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll('.page-view[data-page="about"].active .about-system-timeline').forEach((timeline) => {
    const first = timeline.firstElementChild;
    const last = timeline.lastElementChild;
    if (!first || !last || !timeline.offsetHeight) return;
    const height = last.offsetTop - first.offsetTop;
    const start = timeline.getBoundingClientRect().top + first.offsetTop + 13;
    const travelled = window.innerHeight * 0.65 - start;
    const progress = height > 0 ? Math.max(0, Math.min(1, travelled / height)) : 0;
    const state = systemTimelineMotionState.get(timeline) || { progress, time: now };
    const elapsed = Math.min(32, Math.max(1, now - state.time));
    const eased = reduceMotion ? progress : state.progress + (progress - state.progress) * (1 - Math.exp(-elapsed / 90));
    state.progress = Math.abs(progress - eased) < 0.0001 ? progress : eased;
    state.time = now;
    systemTimelineMotionState.set(timeline, state);
    settling ||= state.progress !== progress;
    const filledDistance = state.progress * height;
    timeline.style.setProperty("--timeline-line-height", `${height}px`);
    timeline.style.setProperty("--timeline-progress", state.progress.toFixed(5));
    const milestones = Array.from(timeline.children);
    milestones.forEach((milestone, index) => {
      const reached = (state.progress > 0 || travelled >= 0) && filledDistance >= milestone.offsetTop - first.offsetTop;
      const next = milestones[index + 1];
      const current = reached && (!next || filledDistance < next.offsetTop - first.offsetTop);
      milestone.classList.toggle("is-reached", reached);
      milestone.classList.toggle("is-current", current);
    });
  });
  if (settling) scheduleSystemTimelineProgress();
}
function scheduleSystemTimelineProgress() {
  if (systemTimelineRaf !== null) return;
  systemTimelineRaf = requestAnimationFrame(updateSystemTimelineProgress);
}
function initSystemTimelineMotion() {
  if (!systemTimelineScrollInitialized) {
    window.addEventListener("scroll", scheduleSystemTimelineProgress, { passive: true });
    window.addEventListener("resize", scheduleSystemTimelineProgress, { passive: true });
    systemTimelineScrollInitialized = true;
  }
  document.querySelectorAll(".about-system-timeline").forEach((timeline) => {
    if (observedSystemTimelines.has(timeline)) return;
    const observer = new ResizeObserver(scheduleSystemTimelineProgress);
    observer.observe(timeline);
    if (timeline.lastElementChild) observer.observe(timeline.lastElementChild);
    observedSystemTimelines.add(timeline);
  });
  scheduleSystemTimelineProgress();
}

/* เรียกใหม่ทุกครั้งที่เปลี่ยนหน้า (เผื่อ DOM เปลี่ยน) */
function refreshMotionForActivePage() {
  initPressMotion();
  initSystemTimelineMotion();
  initSectionAppearObserver();
  requestAnimationFrame(revealMobileActivePageSections);
  initHomePanelMotion();
  initHomeScrollPolish();
  if (!hasInitCountup) {
    initCountupOnVisible();
  }
}
