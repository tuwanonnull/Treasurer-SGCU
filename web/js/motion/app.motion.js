/* Motion helpers: section appear + count up */
let homePanelObserver = null;
let homeHeaderResizeObserver = null;
let hasInitHomeSectionPaging = false;
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
  initHomeSectionPaging(homePage);

  // Fit the opening section below the actual header, including wrapped menus.
  const header = document.querySelector(".site-header");
  const syncHeaderHeight = () => {
    homePage.style.setProperty("--home-header-height", `${header?.getBoundingClientRect().height || 0}px`);
  };
  syncHeaderHeight();
  if (header && !homeHeaderResizeObserver && "ResizeObserver" in window) {
    homeHeaderResizeObserver = new ResizeObserver(syncHeaderHeight);
    homeHeaderResizeObserver.observe(header);
  }

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
      threshold: 0,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  panels.forEach((panel, index) => {
    if (index === 0) revealPanel(panel);
    homePanelObserver.observe(panel);
  });
}

function initHomeSectionPaging(homePage) {
  if (hasInitHomeSectionPaging) return;
  hasInitHomeSectionPaging = true;
  const desktop = window.matchMedia("(min-width: 961px) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastWheelAt = -Infinity;
  let lastWheelDirection = 0;
  let lastWheelMagnitude = 0;
  let risingWheelSamples = 0;
  let steadyWheelSamples = 0;
  let transitionStartedAt = -Infinity;
  let animating = false;
  let gestureConsumed = false;
  let pendingInput = null;
  let readingSection = null;
  let readingCanReachFooter = false;

  const keepReadingWithinSection = () => {
    if (!readingSection || animating) return;
    if (!desktop.matches || !homePage.classList.contains("active") || readingSection.hidden) {
      readingSection = null;
      return;
    }
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
    const rect = readingSection.getBoundingClientRect();
    const start = rect.top + window.scrollY - headerHeight;
    const end = readingCanReachFooter ? Infinity
      : start + Math.max(0, rect.height - (window.innerHeight - headerHeight));
    const top = Math.max(start, Math.min(end, window.scrollY));
    if (Math.abs(top - window.scrollY) < 1) return;
    // Native smooth scrolling may apply several already-accepted wheel events
    // after their handlers return. Contain that accumulated movement as well.
    gestureConsumed = true;
    transitionStartedAt = performance.now();
    risingWheelSamples = 0;
    steadyWheelSamples = 0;
    window.scrollTo({ top, behavior: "instant" });
  };

  const moveTo = (top) => {
    readingSection = null;
    transitionStartedAt = performance.now();
    risingWheelSamples = 0;
    steadyWheelSamples = 0;
    if (reducedMotion.matches) {
      window.scrollTo({ top, behavior: "instant" });
      return;
    }
    const start = window.scrollY;
    const startedAt = performance.now();
    // A wheel gesture is a command, not a distance: every transition has
    // the same deliberate timing regardless of wheel speed or section size.
    const duration = 600;
    animating = true;
    const frame = (now) => {
      if (!desktop.matches || !homePage.classList.contains("active") ||
          getComputedStyle(document.body).overflowY === "hidden") {
        animating = false;
        pendingInput = null;
        return;
      }
      const progress = Math.min(1, (now - startedAt) / duration);
      // Ease both ends: start at rest, accelerate gradually, then settle at
      // rest. Keep the same duration and input handling to avoid added delay.
      const eased = progress * progress * (3 - 2 * progress);
      window.scrollTo({ top: start + (top - start) * eased, behavior: "instant" });
      if (progress < 1) window.requestAnimationFrame(frame);
      else {
        animating = false;
        const nextInput = pendingInput;
        pendingInput = null;
        nextInput?.();
      }
    };
    window.requestAnimationFrame(frame);
  };

  initHomeSectionIndicators(homePage, (top) => {
    if (animating) {
      pendingInput = () => moveTo(top);
      return;
    }
    gestureConsumed = true;
    moveTo(top);
  });

  const handleInput = (event, replay = false) => {
    if (!desktop.matches || !homePage.classList.contains("active")) return;
    if ((!replay && event.defaultPrevented) || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (Array.from(document.querySelectorAll('dialog[open], [aria-modal="true"]:not([aria-hidden="true"])'))
          .some((dialog) => dialog.getClientRects().length) ||
        getComputedStyle(document.body).overflowY === "hidden") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]')) return;

    const isWheel = event.type === "wheel";
    let delta;
    if (isWheel) {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    } else {
      if (target.closest('button, a, summary, [role="button"]')) return;
      if (!["PageDown", "PageUp", "ArrowDown", "ArrowUp", " "].includes(event.key)) return;
      delta = ["PageUp", "ArrowUp"].includes(event.key) ? -window.innerHeight * 0.85 : window.innerHeight * 0.85;
    }
    if (!delta) return;
    const direction = Math.sign(delta);
    keepReadingWithinSection();

    // Let independently scrollable controls consume their own input first.
    for (let node = target; node && node !== homePage && node !== document.body; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1 &&
          (direction > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 1)) return;
    }

    const now = performance.now();
    if (isWheel && !replay) {
      const magnitude = Math.abs(delta);
      const paused = now - lastWheelAt > 100;
      const reversed = direction !== lastWheelDirection;
      if (animating || paused || reversed) {
        risingWheelSamples = 0;
        steadyWheelSamples = 0;
      } else {
        // Two growing samples indicate a fresh trackpad push; three stable
        // notches indicate continued mouse-wheel intent. A fading tail or
        // one isolated spike is insufficient to start another transition.
        risingWheelSamples = magnitude >= 0.5 && magnitude > lastWheelMagnitude * 1.25
          ? risingWheelSamples + 1 : 0;
        steadyWheelSamples = magnitude >= 4 &&
          Math.abs(magnitude - lastWheelMagnitude) <= magnitude * 0.05
          ? steadyWheelSamples + 1 : 0;
      }
      const renewedIntent = now - transitionStartedAt >= 600 &&
        (risingWheelSamples >= 2 || steadyWheelSamples >= 3);
      if (!animating && (paused || reversed || renewedIntent)) {
        gestureConsumed = false;
      }
      lastWheelAt = now;
      lastWheelDirection = direction;
      lastWheelMagnitude = magnitude;
    }
    if (animating) {
      if (!isWheel && !event.repeat) {
        pendingInput = () => handleInput(event, true);
        gestureConsumed = true;
      }
      event.preventDefault();
      return;
    }
    if (isWheel && gestureConsumed && !replay) {
      event.preventDefault();
      return;
    }

    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
    const height = window.innerHeight - headerHeight;
    const sections = Array.from(homePage.querySelectorAll('.home-snap-container > section'))
      .filter((section) => section.getClientRects().length && !section.hidden)
      .map((section) => {
        const rect = section.getBoundingClientRect();
        const start = rect.top + window.scrollY - headerHeight;
        return { element: section, start, end: start + Math.max(0, rect.height - height) };
      });
    const y = window.scrollY;
    let index = sections.findLastIndex((section) => section.start <= y + 2);
    if (index < 0) index = 0;
    const section = sections[index];
    if (!section) return;
    // Leave the footer reachable, and allow normal scrolling back into Home.
    if (y > sections.at(-1).end + 2) return;
    const withinLongSection = direction > 0 ? y < section.end - 2 : y > section.start + 2;
    if (withinLongSection) {
      if (isWheel) {
        readingSection = section.element;
        readingCanReachFooter = index === sections.length - 1;
        // The footer is a continuation of the final section, not another slide.
        // Do not stop native momentum at this boundary and then release it.
        if (readingCanReachFooter && direction > 0) return;
        const boundary = direction > 0 ? section.end : section.start;
        // Keep native wheel/trackpad motion while reading. Only intercept the
        // event that would leave the section, so its remaining momentum cannot
        // also trigger a section transition.
        if (direction > 0 ? y + delta < boundary : y + delta > boundary) return;
        event.preventDefault();
        gestureConsumed = true;
        transitionStartedAt = now;
        risingWheelSamples = 0;
        steadyWheelSamples = 0;
        window.scrollTo({ top: boundary, behavior: "instant" });
        return;
      }
      // Keyboard navigation retains a reading viewport with some overlap.
      const nextY = Math.max(section.start, Math.min(section.end, y + direction * height * 0.85));
      event.preventDefault();
      gestureConsumed = true;
      moveTo(nextY);
      return;
    }
    const next = sections[index + direction];
    if (!next) {
      readingSection = null;
      return;
    }
    event.preventDefault();
    gestureConsumed = true;
    moveTo(direction > 0 ? next.start : next.end);
  };
  window.addEventListener("wheel", handleInput, { passive: false });
  window.addEventListener("keydown", handleInput);
  window.addEventListener("scroll", keepReadingWithinSection, { passive: true });
}

function initHomeSectionIndicators(homePage, moveTo) {
  const nav = homePage.querySelector(".home-section-indicators");
  if (!nav) return;
  // Transformed page ancestors establish a containing block for fixed children.
  // Mount alongside the page so the rail stays anchored to the viewport.
  document.body.appendChild(nav);
  const buttons = Array.from(nav.querySelectorAll("[data-home-section]"));
  const sections = Array.from(homePage.querySelectorAll(".home-snap-container > section"));
  let pending = false;
  let previousCurrent = -1;
  const update = () => {
    pending = false;
    if (!homePage.classList.contains("active")) return;
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
    const marker = headerHeight + (window.innerHeight - headerHeight) * 0.4;
    let current = -1;
    sections.forEach((section, index) => {
      const visible = !section.hidden && section.getClientRects().length > 0;
      if (buttons[index] && buttons[index].hidden !== !visible) buttons[index].hidden = !visible;
      if (visible && (current < 0 || section.getBoundingClientRect().top <= marker)) current = index;
    });
    if (current !== previousCurrent) {
      buttons.forEach((button, index) => {
        if (index === current) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      previousCurrent = current;
    }
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(update);
  };
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const section = sections[Number(button.dataset.homeSection)];
      if (!section || section.hidden || !section.getClientRects().length) return;
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
      moveTo(Math.max(0, section.getBoundingClientRect().top + window.scrollY - headerHeight));
    });
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  // Track routing, expanding FAQs, and content loaded after the first render.
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(homePage);
  }
  nav.hidden = false;
  update();
}

function initHomeScrollPolish() {
  if (hasInitHomeScrollPolish) return;
  hasInitHomeScrollPolish = true;

  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;
  const sectionPaging = window.matchMedia("(min-width: 961px) and (pointer: fine)");

  const updateHomeScrollState = () => {
    homeScrollRaf = null;
    const homePage = document.querySelector('.page-view[data-page="home"]');
    if (!(homePage instanceof HTMLElement) || !homePage.classList.contains("active")) return;

    if (sectionPaging.matches) return;

    const total = Math.max(homePage.offsetHeight - window.innerHeight, 1);
    const pageTop = homePage.getBoundingClientRect().top;
    const progress = Math.min(Math.max(-pageTop / total, 0), 1);
    homePage.style.setProperty("--home-scroll-progress", progress.toFixed(4));
    homePage.style.setProperty("--home-hero-depth", Math.min(progress * 1.35, 1).toFixed(4));
  };

  const requestHomeScrollUpdate = () => {
    // Section paging already supplies the motion. Updating inherited CSS
    // variables across the entire page on each frame adds avoidable style work.
    if (sectionPaging.matches) return;
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
  sectionPaging.addEventListener("change", () => {
    if (sectionPaging.matches) {
      const homePage = document.querySelector('.page-view[data-page="home"]');
      homePage?.style.removeProperty("--home-scroll-progress");
      homePage?.style.removeProperty("--home-hero-depth");
    } else requestHomeScrollUpdate();
  });
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
