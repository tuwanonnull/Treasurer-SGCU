/* App init + wiring (DOMContentLoaded) */
function runHeroSubtitleTyping() {
  const subtitle = document.querySelector(".home-hero-subtitle");
  if (!subtitle || subtitle.dataset.typingReady === "true") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const fullText = subtitle.textContent.replace(/\s+/g, " ").trim();
  if (!fullText) return;

  const graphemes =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(fullText), (part) => part.segment)
      : fullText.match(/[\s\S][\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]*/gu) || Array.from(fullText);

  subtitle.dataset.typingReady = "true";
  subtitle.textContent = "";

  const textNode = document.createTextNode("");
  const cursor = document.createElement("span");
  cursor.className = "typing-cursor";
  cursor.setAttribute("aria-hidden", "true");
  subtitle.appendChild(textNode);
  subtitle.appendChild(cursor);

  let index = 0;
  const speedMs = 28;
  const typingTimer = window.setInterval(() => {
    textNode.nodeValue += graphemes[index];
    index += 1;
    if (index >= graphemes.length) {
      window.clearInterval(typingTimer);
      window.setTimeout(() => cursor.remove(), 600);
    }
  }, speedMs);
}

async function initDailyVisitorCounter() {
  const dashboardVisitorCountEl = document.getElementById("dashboardVisitorCount");
  const dashboardVisitorAllTimeCountEl = document.getElementById("dashboardVisitorAllTimeCount");
  if (!dashboardVisitorCountEl || !dashboardVisitorAllTimeCountEl) return;

  const setCounterText = (dailyValue, allTimeValue) => {
    dashboardVisitorCountEl.textContent = dailyValue;
    dashboardVisitorAllTimeCountEl.textContent = allTimeValue;
  };

  setCounterText("...", "...");
  try {
    const result = await window.sgcuVisitorCounter?.syncDailyVisitorCount?.();
    const numericDaily = Number(result?.dailyTotal);
    const numericAllTime = Number(result?.allTimeTotal);
    if (
      !Number.isFinite(numericDaily) || numericDaily < 0 ||
      !Number.isFinite(numericAllTime) || numericAllTime < 0
    ) {
      setCounterText("-", "-");
      return;
    }
    setCounterText(
      numericDaily.toLocaleString("th-TH"),
      numericAllTime.toLocaleString("th-TH")
    );
  } catch (err) {
    setCounterText("-", "-");
    console.warn("visitor counter error - app.init.js:60", err);
  }
}

function initProjectMobileActionBar() {
  const section = document.querySelector('section[data-page="project-status"]');
  const bar = document.querySelector(".mobile-project-action-bar");
  if (!section || !bar) return;

  const actionBtns = Array.from(bar.querySelectorAll("[data-project-mobile-action]"));
  if (!actionBtns.length) return;

  const statusTab = section.querySelector('.view-toggle-btn[data-view="status"]');
  const calendarTab = section.querySelector('.view-toggle-btn[data-view="calendar"]');
  const statusView = document.getElementById("statusView");
  const calendarView = document.getElementById("calendarView");
  const exportBtn = document.getElementById("projectExportCsv");
  const filterSummaryEl = document.getElementById("projectMobileFilterSummary");
  const initialStatusYear = document.getElementById("yearSelect")?.value || "all";
  const sheet = document.createElement("div");
  sheet.className = "mobile-filter-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `
    <div class="mobile-filter-backdrop" data-mobile-filter-close></div>
    <section class="mobile-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="mobileFilterTitle">
      <header class="mobile-filter-header">
        <div>
          <h2 id="mobileFilterTitle" class="mobile-filter-title">ตัวกรอง</h2>
          <p class="mobile-filter-caption">ปรับเงื่อนไขการแสดงผลของหน้าปัจจุบัน</p>
        </div>
        <button class="mobile-filter-close" type="button" aria-label="ปิดตัวกรอง" data-mobile-filter-close>×</button>
      </header>
      <div class="mobile-filter-body"></div>
      <footer class="mobile-filter-footer">
        <button class="btn-ghost mobile-filter-reset" type="button">ล้างตัวกรอง</button>
        <button class="btn-primary mobile-filter-done" type="button">เสร็จ</button>
      </footer>
    </section>
  `;
  document.body.appendChild(sheet);

  const sheetBody = sheet.querySelector(".mobile-filter-body");
  const sheetTitle = sheet.querySelector(".mobile-filter-title");
  const sheetCaption = sheet.querySelector(".mobile-filter-caption");
  const resetBtn = sheet.querySelector(".mobile-filter-reset");
  const doneBtn = sheet.querySelector(".mobile-filter-done");
  let activeFilterTarget = null;
  let activeFilterPlaceholder = null;

  const actionByName = (name) =>
    actionBtns.find((btn) => btn.dataset.projectMobileAction === name);

  const actionByEffectiveName = (name) =>
    actionBtns.find((btn) => btn.dataset.projectMobileEffectiveAction === name);

  const setMobileActionButton = (btn, action, icon, label, ariaLabel = label) => {
    if (!btn) return;
    const iconEl = btn.querySelector(".mobile-project-action-icon");
    const labelEl = btn.querySelector("span:last-child");
    btn.dataset.projectMobileEffectiveAction = action;
    if (iconEl) iconEl.textContent = icon;
    if (labelEl) labelEl.textContent = label;
    btn.setAttribute("aria-label", ariaLabel);
  };

  const isCalendarVisible = () =>
    calendarView && window.getComputedStyle(calendarView).display !== "none";

  const getFilterTarget = () =>
    isCalendarVisible()
      ? section.querySelector(".calendar-filter-bar")
      : section.querySelector(".filter-bar");

  const getFilterCount = () => {
    if (isCalendarVisible()) {
      const calendarYear = document.getElementById("calendarYearSelect")?.value || "all";
      const calendarOrg = document.getElementById("calendarOrgSelect")?.value || "all";
      const calendarStatus = document.getElementById("calendarStatusSelect")?.value || "all";
      const hasCalendarYearFilter = calendarYear !== "all" && calendarYear !== initialStatusYear;
      return [hasCalendarYearFilter, calendarOrg !== "all", calendarStatus !== "all"].filter(Boolean).length;
    }

    const year = document.getElementById("yearSelect")?.value || "all";
    const orgType = document.getElementById("orgTypeSelect")?.value || "all";
    const org = document.getElementById("orgSelect")?.value || "all";
    const search = (document.getElementById("projectSearchInput")?.value || "").trim();
    return [
      year !== initialStatusYear,
      orgType !== "all",
      org !== "all",
      Boolean(search)
    ].filter(Boolean).length;
  };

  const getSelectedText = (id) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLSelectElement)) return "";
    return el.selectedOptions?.[0]?.textContent?.trim() || el.value || "";
  };

  const getFilterSummaryItems = () => {
    if (isCalendarVisible()) {
      const calendarYear = document.getElementById("calendarYearSelect")?.value || "all";
      const calendarOrg = document.getElementById("calendarOrgSelect")?.value || "all";
      const calendarStatus = document.getElementById("calendarStatusSelect")?.value || "all";
      const hasCalendarYearFilter = calendarYear !== "all" && calendarYear !== initialStatusYear;
      return [
        hasCalendarYearFilter ? `ปี ${getSelectedText("calendarYearSelect")}` : "",
        calendarOrg !== "all" ? getSelectedText("calendarOrgSelect") : "",
        calendarStatus !== "all" ? getSelectedText("calendarStatusSelect") : ""
      ].filter(Boolean);
    }

    const year = document.getElementById("yearSelect")?.value || "all";
    const orgType = document.getElementById("orgTypeSelect")?.value || "all";
    const org = document.getElementById("orgSelect")?.value || "all";
    const search = (document.getElementById("projectSearchInput")?.value || "").trim();
    return [
      year !== initialStatusYear ? `ปี ${getSelectedText("yearSelect")}` : "",
      orgType !== "all" ? getSelectedText("orgTypeSelect") : "",
      org !== "all" ? getSelectedText("orgSelect") : "",
      search ? `ค้นหา: ${search}` : ""
    ].filter(Boolean);
  };

  const resetCurrentFilters = () => {
    if (isCalendarVisible()) {
      ["calendarOrgSelect", "calendarStatusSelect"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.value = "all";
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      const calendarYearEl = document.getElementById("calendarYearSelect");
      if (calendarYearEl) {
        calendarYearEl.value = Array.from(calendarYearEl.options).some((option) => option.value === initialStatusYear)
          ? initialStatusYear
          : "all";
        calendarYearEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else {
      resetProjectFilters("public");
    }
    window.setTimeout(sync, 0);
  };

  const updateFilterSummary = () => {
    if (!filterSummaryEl) return;
    const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
    const items = activePage === "project-status" ? getFilterSummaryItems() : [];
    filterSummaryEl.innerHTML = "";
    filterSummaryEl.hidden = items.length === 0;
    if (!items.length) return;

    const list = document.createElement("div");
    list.className = "project-mobile-filter-chips";
    items.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "project-mobile-filter-chip";
      chip.textContent = item;
      list.appendChild(chip);
    });

    const clearBtn = document.createElement("button");
    clearBtn.className = "project-mobile-filter-clear";
    clearBtn.type = "button";
    clearBtn.textContent = "ล้าง";
    clearBtn.addEventListener("click", resetCurrentFilters);

    filterSummaryEl.appendChild(list);
    filterSummaryEl.appendChild(clearBtn);
  };

  const goToCalendarToday = () => {
    if (typeof currentCalendarDate === "undefined") return;
    const today = new Date();
    currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    if (typeof selectedCalendarDate !== "undefined") {
      selectedCalendarDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    if (typeof generateCalendar === "function") {
      generateCalendar();
    }
  };

  const shiftCalendarMonth = (amount) => {
    if (typeof currentCalendarDate === "undefined") return;
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + amount);
    if (typeof generateCalendar === "function") {
      generateCalendar();
    }
  };

  const sync = () => {
    const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
    document.body.classList.toggle(
      "has-mobile-context-actions",
      activePage === "project-status" ||
        activePage === "dashboard-staff" ||
        activePage === "meeting-room-staff" ||
        activePage === "budget-approval-staff" ||
        activePage === "borrow-assets-staff"
    );
    if (activePage !== "project-status" && sheet.classList.contains("is-open")) {
      closeFilterSheet();
      return;
    }
    bar.classList.toggle("is-visible", activePage === "project-status");

    const activeView = isCalendarVisible() ? "calendar" : "status";
    const filtersAction = actionByName("filters");
    const statusAction = actionByName("status");
    const calendarAction = actionByName("calendar");
    const exportAction = actionByName("export");
    const calendarExtraAction = actionByName("calendar-extra");
    bar.classList.toggle("is-calendar-actions", activeView === "calendar");
    bar.classList.toggle("is-summary-actions", activeView !== "calendar");

    if (activeView === "calendar") {
      if (calendarExtraAction) calendarExtraAction.hidden = false;
      if (exportAction) exportAction.hidden = false;
      setMobileActionButton(filtersAction, "status", "▦", "สรุป", "กลับไปหน้าสรุปสถานะโครงการ");
      setMobileActionButton(statusAction, "calendar-prev", "‹", "ก่อนหน้า", "เดือนก่อนหน้า");
      setMobileActionButton(calendarAction, "calendar-today", "◎", "วันนี้", "กลับไปเดือนปัจจุบัน");
      setMobileActionButton(exportAction, "calendar-next", "›", "ถัดไป", "เดือนถัดไป");
      setMobileActionButton(calendarExtraAction, "filters", "⌕", "ตัวกรอง", "เปิดตัวกรองปฏิทิน");
      actionBtns.forEach((btn) => {
        btn.classList.remove("is-active");
        btn.disabled = false;
        btn.setAttribute("aria-disabled", "false");
      });
    } else {
      if (calendarExtraAction) calendarExtraAction.hidden = true;
      if (exportAction) exportAction.hidden = true;
      setMobileActionButton(filtersAction, "filters", "⌕", "ตัวกรอง", "เปิดตัวกรอง");
      setMobileActionButton(statusAction, "status", "▦", "สรุป", "แสดงสรุปสถานะโครงการ");
      setMobileActionButton(calendarAction, "calendar", "◷", "ปฏิทิน", "แสดงปฏิทินโครงการ");
      actionBtns.forEach((btn) => {
        const action = btn.dataset.projectMobileEffectiveAction;
        btn.classList.toggle("is-active", action === activeView);
      });
    }

    actionBtns.forEach((btn) => {
      btn.classList.remove("has-active-filters");
      btn.dataset.filterCount = "";
    });

    const filterAction = actionByEffectiveName("filters");
    if (filterAction) {
      const count = getFilterCount();
      filterAction.classList.toggle("has-active-filters", count > 0);
      filterAction.dataset.filterCount = count ? String(count) : "";
      filterAction.setAttribute(
        "aria-label",
        count ? `เปิดตัวกรอง (${count} รายการใช้งานอยู่)` : "เปิดตัวกรอง"
      );
    }
    updateFilterSummary();
  };

  const focusFirstControl = (target) => {
    const control = target?.querySelector("input, select, textarea, button");
    if (control && typeof control.focus === "function") {
      window.setTimeout(() => control.focus({ preventScroll: true }), 260);
    }
  };

  const closeFilterSheet = () => {
    if (!activeFilterTarget || !activeFilterPlaceholder) return;
    activeFilterPlaceholder.parentNode?.insertBefore(activeFilterTarget, activeFilterPlaceholder);
    activeFilterPlaceholder.remove();
    activeFilterTarget.removeAttribute("data-mobile-filter-mounted");
    activeFilterTarget.style.removeProperty("display");
    activeFilterTarget = null;
    activeFilterPlaceholder = null;
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-filter-open");
    sync();
  };

  const openFilterSheet = () => {
    const target = getFilterTarget();
    if (!target || !sheetBody) {
      scrollToFilters();
      return;
    }

    if (window.matchMedia && !window.matchMedia("(max-width: 840px)").matches) {
      scrollToFilters();
      return;
    }

    closeFilterSheet();
    activeFilterTarget = target;
    activeFilterPlaceholder = document.createComment("mobile-filter-placeholder");
    target.parentNode?.insertBefore(activeFilterPlaceholder, target);
    target.setAttribute("data-mobile-filter-mounted", "true");
    sheetBody.appendChild(target);
    target.style.display = "grid";

    if (sheetTitle) sheetTitle.textContent = isCalendarVisible() ? "ตัวกรองปฏิทิน" : "ตัวกรองสถานะโครงการ";
    if (sheetCaption) {
      sheetCaption.textContent = isCalendarVisible()
        ? "เลือกปีการศึกษา ฝ่าย/ชมรม และสถานะของกิจกรรมในปฏิทิน"
        : "เลือกปีการศึกษา ประเภทองค์กร ฝ่าย/ชมรม หรือค้นหาชื่อโครงการ";
    }

    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-filter-open");
    focusFirstControl(target);
    sync();
  };

  const openStatusSearchSheet = () => {
    if (isCalendarVisible()) {
      statusTab?.click();
    }
    openFilterSheet();
    window.setTimeout(() => {
      document.getElementById("projectSearchInput")?.focus({ preventScroll: true });
    }, 300);
  };

  const scrollToFilters = () => {
    const target = getFilterTarget();
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    focusFirstControl(target);
  };

  actionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.projectMobileEffectiveAction || btn.dataset.projectMobileAction;
      if (action === "filters") {
        openFilterSheet();
      } else if (action === "status") {
        closeFilterSheet();
        statusTab?.click();
      } else if (action === "calendar") {
        closeFilterSheet();
        calendarTab?.click();
      } else if (action === "export") {
        if (exportBtn && !exportBtn.disabled) {
          exportBtn.click();
        }
      } else if (action === "clear-filters") {
        resetCurrentFilters();
      } else if (action === "search") {
        openStatusSearchSheet();
      } else if (action === "calendar-prev") {
        closeFilterSheet();
        shiftCalendarMonth(-1);
      } else if (action === "calendar-today") {
        closeFilterSheet();
        goToCalendarToday();
      } else if (action === "calendar-next") {
        closeFilterSheet();
        shiftCalendarMonth(1);
      }
      window.setTimeout(sync, 0);
    });
  });

  sheet.querySelectorAll("[data-mobile-filter-close]").forEach((btn) => {
    btn.addEventListener("click", closeFilterSheet);
  });
  doneBtn?.addEventListener("click", closeFilterSheet);
  resetBtn?.addEventListener("click", () => {
    resetCurrentFilters();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sheet.classList.contains("is-open")) {
      closeFilterSheet();
    }
  });

  if (exportBtn) {
    const exportObserver = new MutationObserver(sync);
    exportObserver.observe(exportBtn, { attributes: true, attributeFilter: ["disabled"] });
  }

  document.querySelectorAll(".page-view").forEach((pageEl) => {
    const pageObserver = new MutationObserver(sync);
    pageObserver.observe(pageEl, { attributes: true, attributeFilter: ["class"] });
  });

  [
    "yearSelect",
    "orgTypeSelect",
    "orgSelect",
    "projectSearchInput",
    "calendarYearSelect",
    "calendarOrgSelect",
    "calendarStatusSelect"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", sync);
    el.addEventListener("change", () => window.setTimeout(sync, 0));
  });

  window.syncProjectMobileActionBar = sync;
  sync();
}

function initDashboardMobileActionBar() {
  const section = document.querySelector('section[data-page="dashboard-staff"]');
  const bar = document.querySelector(".mobile-dashboard-action-bar");
  if (!section || !bar) return;

  const actionBtns = Array.from(bar.querySelectorAll("[data-dashboard-mobile-action]"));
  if (!actionBtns.length) return;

  const sheet = document.createElement("div");
  sheet.className = "mobile-filter-sheet mobile-dashboard-filter-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `
    <div class="mobile-filter-backdrop" data-dashboard-filter-close></div>
    <section class="mobile-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboardMobileFilterTitle">
      <header class="mobile-filter-header">
        <div>
          <h2 id="dashboardMobileFilterTitle" class="mobile-filter-title">ตัวกรองภาพรวมโครงการ</h2>
          <p class="mobile-filter-caption">เลือกปีการศึกษา ประเภทองค์กร ฝ่าย/ชมรม หรือค้นหาโครงการ</p>
        </div>
        <button class="mobile-filter-close" type="button" aria-label="ปิดตัวกรอง" data-dashboard-filter-close>×</button>
      </header>
      <div class="mobile-filter-body"></div>
      <footer class="mobile-filter-footer">
        <button class="btn-ghost mobile-filter-reset" type="button">ล้างตัวกรอง</button>
        <button class="btn-primary mobile-filter-done" type="button">เสร็จ</button>
      </footer>
    </section>
  `;
  document.body.appendChild(sheet);

  const sheetBody = sheet.querySelector(".mobile-filter-body");
  const resetBtn = sheet.querySelector(".mobile-filter-reset");
  const doneBtn = sheet.querySelector(".mobile-filter-done");
  const initialYear = document.getElementById("yearSelectStaff")?.value || "all";
  let activeFilterTarget = null;
  let activeFilterPlaceholder = null;

  const targetByAction = {
    checks: "projectStaffOpsPanelStaff",
    metrics: "dashboardMetricsSectionStaff",
    followup: "dashboardFollowupSectionStaff",
    analysis: "dashboardAnalysisSectionStaff"
  };

  const getFilterTarget = () => document.getElementById("filterBarStaff");

  const focusFirstControl = (target) => {
    const control = target?.querySelector("input, select, textarea, button");
    if (control && typeof control.focus === "function") {
      window.setTimeout(() => control.focus({ preventScroll: true }), 260);
    }
  };

  const getSelectedText = (id) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLSelectElement)) return "";
    return el.selectedOptions?.[0]?.textContent?.trim() || el.value || "";
  };

  const getFilterSummaryItems = () => {
    const year = document.getElementById("yearSelectStaff")?.value || "all";
    const orgType = document.getElementById("orgTypeSelectStaff")?.value || "all";
    const org = document.getElementById("orgSelectStaff")?.value || "all";
    const search = (document.getElementById("projectSearchInputStaff")?.value || "").trim();
    return [
      year !== initialYear ? `ปี ${getSelectedText("yearSelectStaff")}` : "",
      orgType !== "all" ? getSelectedText("orgTypeSelectStaff") : "",
      org !== "all" ? getSelectedText("orgSelectStaff") : "",
      search ? `ค้นหา: ${search}` : ""
    ].filter(Boolean);
  };

  const getFilterCount = () => getFilterSummaryItems().length;

  const resetCurrentFilters = () => {
    if (typeof resetProjectFilters === "function") {
      resetProjectFilters("staff");
    }
    window.setTimeout(sync, 0);
  };

  const closeFilterSheet = () => {
    if (!activeFilterTarget || !activeFilterPlaceholder) return;
    activeFilterPlaceholder.parentNode?.insertBefore(activeFilterTarget, activeFilterPlaceholder);
    activeFilterPlaceholder.remove();
    activeFilterTarget.removeAttribute("data-mobile-filter-mounted");
    activeFilterTarget.style.removeProperty("display");
    activeFilterTarget = null;
    activeFilterPlaceholder = null;
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-filter-open");
    sync();
  };

  const openFilterSheet = () => {
    const target = getFilterTarget();
    if (!target || !sheetBody) return;

    if (window.matchMedia && !window.matchMedia("(max-width: 840px)").matches) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      focusFirstControl(target);
      return;
    }

    closeFilterSheet();
    activeFilterTarget = target;
    activeFilterPlaceholder = document.createComment("dashboard-mobile-filter-placeholder");
    target.parentNode?.insertBefore(activeFilterPlaceholder, target);
    target.setAttribute("data-mobile-filter-mounted", "true");
    sheetBody.appendChild(target);
    target.style.display = "grid";

    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-filter-open");
    focusFirstControl(target);
    sync();
  };

  const goToSection = (action) => {
    const targetId = targetByAction[action];
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    window.sgcuSetStaffProjectWorkflowTab?.(action);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(sync, 0);
  };

  const sync = () => {
    const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
    bar.classList.toggle("is-visible", activePage === "dashboard-staff");
    document.body.classList.toggle(
      "has-mobile-context-actions",
      ["project-status", "dashboard-staff", "meeting-room-staff", "budget-approval-staff", "borrow-assets-staff"].includes(activePage)
    );
    if (activePage !== "dashboard-staff" && sheet.classList.contains("is-open")) {
      closeFilterSheet();
      return;
    }

    const activeSection = section.querySelector(".dashboard-section-nav .is-active")?.dataset.projectWorkflowToc || "checks";
    actionBtns.forEach((btn) => {
      const action = btn.dataset.dashboardMobileAction || "";
      btn.classList.toggle("is-active", action === activeSection);
      btn.classList.remove("has-active-filters");
      btn.dataset.filterCount = "";
    });

    const filterBtn = actionBtns.find((btn) => btn.dataset.dashboardMobileAction === "filters");
    if (filterBtn) {
      const count = getFilterCount();
      filterBtn.classList.toggle("has-active-filters", count > 0);
      filterBtn.dataset.filterCount = count ? String(count) : "";
      filterBtn.setAttribute(
        "aria-label",
        count ? `เปิดตัวกรอง (${count} รายการใช้งานอยู่)` : "เปิดตัวกรอง"
      );
    }
  };

  actionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.dashboardMobileAction || "";
      if (action === "filters") {
        openFilterSheet();
      } else {
        closeFilterSheet();
        goToSection(action);
      }
      window.setTimeout(sync, 0);
    });
  });

  sheet.querySelectorAll("[data-dashboard-filter-close]").forEach((btn) => {
    btn.addEventListener("click", closeFilterSheet);
  });
  doneBtn?.addEventListener("click", closeFilterSheet);
  resetBtn?.addEventListener("click", resetCurrentFilters);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sheet.classList.contains("is-open")) {
      closeFilterSheet();
    }
  });

  section.addEventListener("change", sync);
  section.addEventListener("input", sync);
  document.querySelectorAll(".page-view").forEach((pageEl) => {
    const pageObserver = new MutationObserver(sync);
    pageObserver.observe(pageEl, { attributes: true, attributeFilter: ["class"] });
  });

  window.syncDashboardMobileActionBar = sync;
  sync();
}

function initMeetingRoomMobileActionBar() {
  const section = document.querySelector('section[data-page="meeting-room-staff"]');
  const bar = document.querySelector(".mobile-meeting-action-bar");
  if (!section || !bar) return;

  const actionBtns = Array.from(bar.querySelectorAll("[data-meeting-mobile-action]"));
  if (!actionBtns.length) return;

  const requestsTab = section.querySelector('[data-meeting-staff-tab="requests"]');
  const historyTab = section.querySelector('[data-meeting-staff-tab="history"]');
  const listPanel = document.getElementById("staffMeetingAll");
  const calendarPanel = document.getElementById("meetingRoomStaffCalendarPanel");
  const filterTarget = document.getElementById("meetingRoomHistorySearchWrap");
  const startDateFilter = document.getElementById("meetingRoomHistoryStartDateInput");
  const endDateFilter = document.getElementById("meetingRoomHistoryEndDateInput");
  const roomFilter = document.getElementById("meetingRoomHistoryRoomSelect");
  const searchFilter = document.getElementById("meetingRoomHistorySearchInput");
  const resetFilter = document.getElementById("meetingRoomHistoryResetBtn");

  const sheet = document.createElement("div");
  sheet.className = "mobile-filter-sheet mobile-meeting-filter-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `
    <div class="mobile-filter-backdrop" data-meeting-filter-close></div>
    <section class="mobile-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="meetingMobileFilterTitle">
      <header class="mobile-filter-header">
        <div>
          <h2 id="meetingMobileFilterTitle" class="mobile-filter-title">ตัวกรองประวัติ</h2>
          <p class="mobile-filter-caption">กรองตามวัน ห้องประชุม หรือค้นหาคำขอเดิม</p>
        </div>
        <button class="mobile-filter-close" type="button" aria-label="ปิดตัวกรอง" data-meeting-filter-close>×</button>
      </header>
      <div class="mobile-filter-body"></div>
      <footer class="mobile-filter-footer">
        <button class="btn-ghost mobile-filter-reset" type="button">ล้างตัวกรอง</button>
        <button class="btn-primary mobile-filter-done" type="button">เสร็จ</button>
      </footer>
    </section>
  `;
  document.body.appendChild(sheet);

  const sheetBody = sheet.querySelector(".mobile-filter-body");
  const sheetTitle = sheet.querySelector(".mobile-filter-title");
  const sheetCaption = sheet.querySelector(".mobile-filter-caption");
  const resetBtn = sheet.querySelector(".mobile-filter-reset");
  const doneBtn = sheet.querySelector(".mobile-filter-done");
  let activeFilterPlaceholder = null;

  const isMobile = () =>
    !window.matchMedia || window.matchMedia("(max-width: 840px)").matches;

  const isHistoryActive = () => historyTab?.classList.contains("is-active");

  const scrollToPanel = (target) => {
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getFilterCount = () => {
    const startDateValue = (startDateFilter?.value || "").trim();
    const endDateValue = (endDateFilter?.value || "").trim();
    const roomValue = (roomFilter?.value || "all").trim();
    const searchValue = (searchFilter?.value || "").trim();
    return [Boolean(startDateValue || endDateValue), roomValue !== "all", Boolean(searchValue)].filter(Boolean).length;
  };

  const sync = () => {
    const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
    document.body.classList.toggle(
      "has-mobile-context-actions",
      activePage === "project-status" ||
        activePage === "dashboard-staff" ||
        activePage === "meeting-room-staff" ||
        activePage === "budget-approval-staff" ||
        activePage === "borrow-assets-staff"
    );
    if (activePage !== "meeting-room-staff" && sheet.classList.contains("is-open")) {
      closeFilterSheet();
      return;
    }

    const meetingSettingsActive = section.classList.contains("is-settings-view");
    bar.classList.toggle("is-visible", activePage === "meeting-room-staff" && !meetingSettingsActive);
    actionBtns.forEach((btn) => {
      const action = btn.dataset.meetingMobileAction;
      btn.classList.toggle(
        "is-active",
        (action === "requests" && !isHistoryActive()) || (action === "history" && isHistoryActive())
      );
      btn.classList.remove("has-active-filters");
      btn.dataset.filterCount = "";
    });

    const filterBtn = actionBtns.find((btn) => btn.dataset.meetingMobileAction === "filters");
    if (filterBtn) {
      const count = getFilterCount();
      filterBtn.classList.toggle("has-active-filters", count > 0);
      filterBtn.dataset.filterCount = count ? String(count) : "";
      filterBtn.setAttribute(
        "aria-label",
        count ? `เปิดตัวกรองคำขอ (${count} รายการใช้งานอยู่)` : "เปิดตัวกรองคำขอ"
      );
    }
  };

  const closeFilterSheet = () => {
    if (activeFilterPlaceholder && filterTarget) {
      activeFilterPlaceholder.parentNode?.insertBefore(filterTarget, activeFilterPlaceholder);
      activeFilterPlaceholder.remove();
      activeFilterPlaceholder = null;
      filterTarget.removeAttribute("data-mobile-filter-mounted");
      filterTarget.style.removeProperty("display");
    }
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-filter-open");
    sync();
  };

  const openFilterSheet = () => {
    if (!filterTarget || !sheetBody) return;
    if (!isMobile()) {
      scrollToPanel(filterTarget);
      return;
    }

    closeFilterSheet();
    activeFilterPlaceholder = document.createComment("meeting-mobile-filter-placeholder");
    filterTarget.parentNode?.insertBefore(activeFilterPlaceholder, filterTarget);
    filterTarget.setAttribute("data-mobile-filter-mounted", "true");
    sheetBody.appendChild(filterTarget);
    filterTarget.style.display = "grid";
    if (sheetTitle) {
      sheetTitle.textContent = isHistoryActive() ? "ตัวกรองประวัติ" : "ตัวกรองรายการคำขอ";
    }
    if (sheetCaption) {
      sheetCaption.textContent = isHistoryActive()
        ? "กรองประวัติย้อนหลังตามวัน ห้องประชุม หรือคำค้น"
        : "กรองรายการที่ต้องจัดการตามวัน ห้องประชุม หรือคำค้น";
    }
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-filter-open");
    window.setTimeout(() => {
      const firstControl = filterTarget.querySelector("input, select, textarea, button");
      firstControl?.focus?.({ preventScroll: true });
    }, 260);
    sync();
  };

  const resetFilters = () => {
    resetFilter?.click();
    window.setTimeout(sync, 0);
  };

  actionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.meetingMobileAction;
      if (action === "requests") {
        closeFilterSheet();
        requestsTab?.click();
        scrollToPanel(listPanel);
      } else if (action === "history") {
        closeFilterSheet();
        historyTab?.click();
        scrollToPanel(listPanel);
      } else if (action === "calendar") {
        closeFilterSheet();
        scrollToPanel(calendarPanel);
      } else if (action === "filters") {
        openFilterSheet();
      }
      window.setTimeout(sync, 0);
    });
  });

  sheet.querySelectorAll("[data-meeting-filter-close]").forEach((btn) => {
    btn.addEventListener("click", closeFilterSheet);
  });
  doneBtn?.addEventListener("click", closeFilterSheet);
  resetBtn?.addEventListener("click", resetFilters);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sheet.classList.contains("is-open")) {
      closeFilterSheet();
    }
  });

  document.querySelectorAll(".page-view").forEach((pageEl) => {
    const pageObserver = new MutationObserver(sync);
    pageObserver.observe(pageEl, { attributes: true, attributeFilter: ["class"] });
  });

  [requestsTab, historyTab, startDateFilter, endDateFilter, roomFilter, searchFilter].forEach((el) => {
    if (!el) return;
    el.addEventListener("click", () => window.setTimeout(sync, 0));
    el.addEventListener("input", () => window.setTimeout(sync, 0));
    el.addEventListener("change", () => window.setTimeout(sync, 0));
  });

  window.syncMeetingRoomMobileActionBar = sync;
  sync();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.sgcuRuntimeConfigReady) {
    if (typeof window.applyRuntimeConfigAliases === "function") {
      window.applyRuntimeConfigAliases();
    }
    window.sgcuRuntimeConfigReady
      .then(() => {
        if (typeof window.applyRuntimeConfigAliases === "function") {
          window.applyRuntimeConfigAliases();
        }
      })
      .catch(() => {
        // Runtime config failures are already reported by app.runtime-config.js.
      });
  }
  if (typeof window.syncManagementLinks === "function") {
    window.syncManagementLinks(document);
  }
  if (typeof window.syncManagementPanels === "function") {
    window.syncManagementPanels();
  }

  // ===== 1) เก็บ DOM element ที่ใช้ซ้ำ =====
  yearSelect = document.getElementById("yearSelect");
  orgTypeSelect = document.getElementById("orgTypeSelect");
  orgSelect = document.getElementById("orgSelect");
  projectSearchInput = document.getElementById("projectSearchInput");
  projectSearchClearBtn = document.getElementById("projectSearchClear");
  totalProjectsEl = document.getElementById("totalProjects");
  pendingProjectsEl = document.getElementById("pendingProjects");
  approvedProjectsEl = document.getElementById("approvedProjects");
  closedProjectsEl = document.getElementById("closedProjects");
  totalBudgetEl = document.getElementById("totalBudget");
  tableBodyEl = document.getElementById("projectTableBody");
  tableCaptionEl = document.getElementById("tableCaption");
  projectModalEl = document.getElementById("projectModal");
  projectModalTitleEl = document.getElementById("projectModalTitle");
  projectModalTitleBadgeEl = document.getElementById("projectModalTitleBadge");
  projectModalHeaderRowEl = document.getElementById("projectModalHeaderRow");
  projectModalBodyEl = document.getElementById("projectModalBody");
  projectModalCloseEl = document.getElementById("projectModalClose");
  pdfRootEl = document.getElementById("pdfRoot");
  budgetChartSkeletonEl = document.getElementById("budgetChartSkeleton");
  statusPieSkeletonEl = document.getElementById("statusPieSkeleton");
  projectTableSkeletonEl = document.getElementById("projectTableSkeleton");
  calendarSkeletonEl = document.getElementById("calendarSkeleton");
  orgStructureSkeletonEl = document.getElementById("orgStructureSkeleton");
  loginBtnEl = document.getElementById("loginBtn");
  logoutBtnEl = document.getElementById("logoutBtn");
  mobileLogoutBtnEl = document.getElementById("mobileLogoutBtn");
  userInfoEl = document.getElementById("userInfo");
  loginPageGoogleBtnEl = document.getElementById("loginPageGoogleBtn");
  loginPageLogoutBtnEl = document.getElementById("loginPageLogoutBtn");
  loginPageStatusEl = document.getElementById("loginPageStatus");
  staffModeToggleEl = document.getElementById("staffModeToggle");
  staffModeBtns = Array.from(document.querySelectorAll("[data-staff-mode]"));
  navLinksAll = Array.from(document.querySelectorAll("header nav a[data-visible]"));
  viewToggleBtns = Array.from(document.querySelectorAll(".view-toggle-btn"));
  
  newsListEl        = document.getElementById("newsList");
  newsModalEl       = document.getElementById("newsModal");
  newsModalTitleEl  = document.getElementById("newsModalTitle");
  newsModalBodyEl   = document.getElementById("newsModalBody");
  newsModalCloseEl  = document.getElementById("newsModalClose");
  homeNewsSkeletonEl = document.getElementById("homeNewsSkeleton");
  newsListSkeletonEl = document.getElementById("newsListSkeleton");

  downloadSkeletonEl = document.getElementById("downloadSkeleton");
  kpiOnTimeEl = document.getElementById("kpiOnTime");
  kpiOnTimeCaptionEl = document.getElementById("kpiOnTimeCaption");
  kpiBudgetUsageEl = document.getElementById("kpiBudgetUsage");
  kpiBudgetUsageCaptionEl = document.getElementById("kpiBudgetUsageCaption");
  kpiClosedProjectsEl = document.getElementById("kpiClosedProjects");
  kpiClosedProjectsCaptionEl = document.getElementById("kpiClosedProjectsCaption");
  kpiMonthlyCaptionEl = document.getElementById("kpiMonthlyCaption");
  kpiOnTimeBarEl = document.getElementById("kpiOnTimeBar");
  kpiBudgetUsageBarEl = document.getElementById("kpiBudgetUsageBar");
  kpiClosedProjectsBarEl = document.getElementById("kpiClosedProjectsBar");
  kpiOnTimeStaffEl = document.getElementById("kpiOnTimeStaff");
  kpiOnTimeCaptionStaffEl = document.getElementById("kpiOnTimeCaptionStaff");
  kpiBudgetUsageStaffEl = document.getElementById("kpiBudgetUsageStaff");
  kpiBudgetUsageCaptionStaffEl = document.getElementById("kpiBudgetUsageCaptionStaff");
  kpiClosedProjectsStaffEl = document.getElementById("kpiClosedProjectsStaff");
  kpiClosedProjectsCaptionStaffEl = document.getElementById("kpiClosedProjectsCaptionStaff");
  homeHeatmapEl = document.getElementById("homeHeatmap");
  homeHeatmapMonthsEl = document.getElementById("homeHeatmapMonths");
  appAlertEl = document.getElementById("appAlert");
  appAlertTextEl = document.getElementById("appAlertText");
  appAlertRetryEl = document.getElementById("appAlertRetry");
  projectsLastUpdatedEl = document.getElementById("projectsLastUpdated");
  projectsLastUpdatedStaffEl = document.getElementById("projectsLastUpdatedStaff");
  projectsLastUpdatedDashboardStaffEl = document.getElementById("projectsLastUpdatedDashboardStaff");
  const appLoaderEl = document.getElementById("appLoader");
  const appLoaderPercentEl = document.getElementById("appLoaderPercent");
  const appLoaderBarEl = document.getElementById("appLoaderBar");
  const appLoaderDetailEl = document.getElementById("appLoaderDetail");
  const appLoaderStepEls = Array.from(document.querySelectorAll("[data-loader-step]"));
  appLoaderErrorEl = document.getElementById("appLoaderError");
  appLoaderErrorTextEl = document.getElementById("appLoaderErrorText");
  appLoaderRetryEl = document.getElementById("appLoaderRetry");
  scheduleIdleTask(() => runBackgroundTask(initDailyVisitorCounter, "visitors"));
  const loaderStepLabels = {
    news: "กำลังโหลดข่าวสารล่าสุด",
    scoreboard: "กำลังตรวจสอบข้อมูลโครงการ",
    orgStructure: "กำลังเตรียมแบบฟอร์มการเงิน"
  };

  const hasLoaderUi = Boolean(appLoaderEl);
  const loaderStepKeys = new Set();
  const loaderStepProgress = new Map();
  let shouldHoldAppLoaderForHome = false;
  const simulatedLoaderDonePromise = window.sgcuAppLoaderReady || Promise.resolve();
  const finishSimulatedLoaderPercent = () => {
    if (typeof window.sgcuFinishAppLoaderPercent === "function") {
      window.sgcuFinishAppLoaderPercent();
      return;
    }
    if (appLoaderPercentEl) appLoaderPercentEl.textContent = "100";
    if (appLoaderBarEl) appLoaderBarEl.style.width = "100%";
  };

  const syncLoaderStepUi = (activeKey = "") => {
    if (!hasLoaderUi) return;
    const nextActiveKey =
      activeKey ||
      Array.from(loaderStepKeys).find((key) => (loaderStepProgress.get(key) || 0) < 1) ||
      "";
    if (appLoaderDetailEl) {
      appLoaderDetailEl.textContent = nextActiveKey
        ? loaderStepLabels[nextActiveKey] || "กำลังเตรียมข้อมูล"
        : "เตรียมข้อมูลเรียบร้อย";
    }
    appLoaderStepEls.forEach((el) => {
      const key = el.dataset.loaderStep || "";
      const progress = loaderStepProgress.get(key) || 0;
      el.hidden = !loaderStepKeys.has(key);
      el.classList.toggle("is-complete", progress >= 1);
      el.classList.toggle("is-active", key === nextActiveKey && progress < 1);
    });
  };

  const configureLoaderForInitialPage = (page) => {
    if (!hasLoaderUi) return;
    loaderStepKeys.clear();
    loaderStepProgress.clear();
    shouldHoldAppLoaderForHome = page === "home";
    if (shouldHoldAppLoaderForHome) {
      loaderStepKeys.add("news");
      const scoreboardPanel = document.getElementById("scorePodium")?.closest(".home-snap-panel");
      const isScoreboardEnabled = scoreboardPanel && !scoreboardPanel.hidden && scoreboardPanel.dataset.scoreboardDisabled !== "true";
      if (isScoreboardEnabled && document.getElementById("scoreRunners")) {
        loaderStepKeys.add("scoreboard");
      }
      if (document.getElementById("org-structure-content")) {
        loaderStepKeys.add("orgStructure");
      }
    }
    loaderStepKeys.forEach((key) => loaderStepProgress.set(key, 0));
    syncLoaderStepUi();
  };

  updateLoaderProgress = (key, value) => {
    if (!hasLoaderUi || !loaderStepKeys.has(key)) return;
    const current = loaderStepProgress.get(key) || 0;
    const next = Math.max(current, Math.min(1, value));
    loaderStepProgress.set(key, next);
    syncLoaderStepUi(next < 1 ? key : "");
  };

  markLoaderStep = (key) => {
    updateLoaderProgress(key, 1);
  };

  if (appAlertRetryEl) {
    appAlertRetryEl.addEventListener("click", () => window.location.reload());
  }
  if (appLoaderRetryEl) {
    appLoaderRetryEl.addEventListener("click", () => window.location.reload());
  }
  updateAppAlert();
  runHeroSubtitleTyping();

  projectStatusContexts = {
    public: buildProjectStatusContext("", "public"),
    staff: buildProjectStatusContext("Staff", "staff")
  };
  setActiveProjectStatusContext("public");

  initAuthUI();
  updateNavVisibility(false);
  toggleProjectStatusAccess(false, "public");
  toggleProjectStatusAccess(false, "staff");
  staffModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setStaffViewMode(btn.dataset.staffMode);
    });
  });
  if (staffModeToggleEl) {
    staffModeToggleEl.style.display = "none";
  }

  const resolveCurrentAcademicYearBE = () => {
    if (typeof getCurrentAcademicYearBE === "function") {
      return getCurrentAcademicYearBE();
    }

    const now = new Date();
    const yearCE = now.getFullYear();
    const month = now.getMonth() + 1;
    const academicYearCE = month >= 6 ? yearCE : yearCE - 1;
    return String(academicYearCE + 543);
  };
  const aboutTeamLabel = (() => {
    const academicYearBE = Number(resolveCurrentAcademicYearBE());
    if (!Number.isFinite(academicYearBE)) return "SGCU68";
    return `SGCU${String(academicYearBE).slice(-2)}`;
  })();
  [
    "aboutBudgetTeamLabel",
    "aboutOrgStructureTitleLabel"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = aboutTeamLabel;
  });

  // ===== 4) ระบบสลับหน้าแบบ SPA =====
  const navLinks = document.querySelectorAll("header nav a[data-page]");
  const pageViews = document.querySelectorAll(".page-view");
  const mainContainerEl = document.querySelector("main.main");
  const mobileBottomNav = document.querySelector(".mobile-bottom-nav");
  let mobileBottomNavSyncFrame = 0;
  let currentPage = null;
  let pendingConsentPage = null;
  let consentAuthIdentity = { uid: "", email: "" };
  const globalConsentVersion = "v3";
  const globalConsentKeyPrefix = `globalServiceConsent-${globalConsentVersion}`;
  const globalConsentPersistentKeyPrefix = `globalServiceConsent-persistent-${globalConsentVersion}`;
  const consentRequiredPages = new Set(["borrow-assets", "meeting-room-booking"]);
  const profileGateExemptPages = new Set(["login"]);
  const globalConsentModal = document.getElementById("globalConsentModal");
  const globalConsentConfirm = document.getElementById("globalConsentConfirm");
  const globalConsentCancel = document.getElementById("globalConsentCancel");
  const globalConsentClose = document.getElementById("globalConsentClose");
  const globalConsentRules = document.getElementById("globalConsentRules");
  const globalConsentPdpa = document.getElementById("globalConsentPdpa");
  const loginViewConsentBtn = document.getElementById("loginViewConsentBtn");
  const consentSections = globalConsentModal
    ? Array.from(globalConsentModal.querySelectorAll(".modal-section"))
    : [];
  let consentAccordionReady = false;
  const consentStore = window.sgcuFirestore || {};
  const remoteConsentCollection = "userProfiles";
  let remoteConsentSyncPromise = null;
  let remoteConsentSyncedUid = "";
  const featureLoader = window.sgcuFeatureLoader || null;
  const ensurePageFeatureLoaded = async (page) => {
    if (!featureLoader || typeof featureLoader.ensurePageLoaded !== "function") return;
    await featureLoader.ensurePageLoaded(page);
  };
  const syncMobileBottomIndicator = () => {
    if (!mobileBottomNav) return;
    const expandedMenu = mobileBottomNav.querySelector('.mobile-bottom-menu[aria-expanded="true"]');
    const activeItems = Array.from(mobileBottomNav.querySelectorAll(".mobile-bottom-item.active"));
    const targetItem = [expandedMenu, ...activeItems].find((item) => {
      if (!(item instanceof HTMLElement)) return false;
      const rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!(targetItem instanceof HTMLElement)) {
      mobileBottomNav.style.setProperty("--mobile-bottom-indicator-opacity", "0");
      return;
    }

    const navRect = mobileBottomNav.getBoundingClientRect();
    const itemRect = targetItem.getBoundingClientRect();
    mobileBottomNav.style.setProperty("--mobile-bottom-indicator-x", `${itemRect.left - navRect.left}px`);
    mobileBottomNav.style.setProperty("--mobile-bottom-indicator-w", `${itemRect.width}px`);
    mobileBottomNav.style.setProperty("--mobile-bottom-indicator-opacity", "1");
  };
  const scheduleMobileBottomIndicatorSync = () => {
    if (!mobileBottomNav || mobileBottomNavSyncFrame) return;
    mobileBottomNavSyncFrame = requestAnimationFrame(() => {
      mobileBottomNavSyncFrame = 0;
      syncMobileBottomIndicator();
    });
  };
  const prefetchFeatureScriptsInIdle = () => {
    if (!featureLoader || typeof featureLoader.prefetchInIdle !== "function") return;
    featureLoader.prefetchInIdle(currentPage || "");
  };
  const runFeatureTask = async (page, taskName) => {
    await ensurePageFeatureLoaded(page);
    const fn = window[taskName];
    if (typeof fn === "function") {
      await fn();
    }
  };
  const getLoginProfileGateState = () => {
    const state = window.sgcuLoginProfileState || {};
    return {
      isAuthenticated: Boolean(state.isAuthenticated || isUserAuthenticated),
      isComplete: state.isComplete !== false,
      isLoading: Boolean(state.isLoading),
      message: (state.message || "กรุณากรอกและบันทึกข้อมูลบัญชีผู้ใช้ให้เรียบร้อยก่อนใช้งานส่วนอื่น").toString()
    };
  };
  const shouldBlockForIncompleteLoginProfile = (page) => {
    if (profileGateExemptPages.has(page)) return false;
    const state = getLoginProfileGateState();
    return Boolean(state.isAuthenticated && !state.isComplete);
  };
  const showLoginProfileGateMessage = () => {
    const state = getLoginProfileGateState();
    const statusEl = document.getElementById("loginProfileStatus");
    if (statusEl) {
      statusEl.textContent = state.isLoading
        ? "กำลังตรวจสอบข้อมูลบัญชีผู้ใช้ กรุณากรอกและบันทึกข้อมูลให้ครบก่อนใช้งานส่วนอื่น"
        : state.message;
      statusEl.style.color = "#b91c1c";
    }
  };
  const isElementVisible = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0;
  };
  const getFirstIncompleteLoginProfileField = () => {
    const form = document.getElementById("loginProfileForm");
    if (!form) return null;
    const fields = Array.from(form.querySelectorAll("input, select, textarea"))
      .filter((field) => field instanceof HTMLElement && !field.disabled && isElementVisible(field));
    const invalidRequired = fields.find((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return false;
      if (!field.required) return false;
      return typeof field.checkValidity === "function" && !field.checkValidity();
    });
    if (invalidRequired instanceof HTMLElement) return invalidRequired;

    const studentFieldsEl = document.getElementById("loginProfileStudentFields");
    const studentIdEl = document.getElementById("loginProfileStudentId");
    const facultyEl = document.getElementById("loginProfileFaculty");
    const yearEl = document.getElementById("loginProfileYear");
    const isStudentProfile = isElementVisible(studentFieldsEl);
    const missingStudentMeta =
      isStudentProfile &&
      (
        !(facultyEl?.value || "").toString().trim() ||
        !(yearEl?.value || "").toString().trim()
      );
    if (missingStudentMeta && studentIdEl instanceof HTMLElement && isElementVisible(studentIdEl)) {
      return studentIdEl;
    }

    return fields.find((field) => field instanceof HTMLElement) || null;
  };
  const getVisibleViewportBounds = () => {
    const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
    const headerEl = document.querySelector(".site-header");
    const bottomNavEl = document.querySelector(".mobile-bottom-nav");
    const headerHeight = isElementVisible(headerEl) ? headerEl.getBoundingClientRect().height : 0;
    const bottomNavHeight = isElementVisible(bottomNavEl) ? bottomNavEl.getBoundingClientRect().height : 0;
    const top = headerHeight + 12;
    const bottom = Math.max(top + 120, viewportHeight - bottomNavHeight - 12);
    return { top, bottom, height: Math.max(120, bottom - top) };
  };
  const getScrollTargetForLoginProfileField = (field) => {
    if (!(field instanceof HTMLElement)) return document.getElementById("loginProfileCard");
    const bounds = getVisibleViewportBounds();
    const candidates = [
      document.getElementById("loginProfileCard"),
      field.closest(".login-profile-block"),
      field.closest(".borrow-form-row"),
      field.closest(".borrow-form-field"),
      field
    ].filter((candidate) => candidate instanceof HTMLElement && isElementVisible(candidate));
    const largestFitting = candidates.find((candidate) => candidate.getBoundingClientRect().height <= bounds.height);
    return largestFitting || candidates[candidates.length - 1] || field;
  };
  const scrollElementIntoBalancedView = (element) => {
    if (!(element instanceof HTMLElement)) return;
    const bounds = getVisibleViewportBounds();
    const rect = element.getBoundingClientRect();
    const targetTopInViewport = rect.height > bounds.height
      ? bounds.top
      : bounds.top + ((bounds.height - rect.height) / 2);
    const nextTop = Math.max(0, window.scrollY + rect.top - targetTopInViewport);
    window.scrollTo({ top: nextTop, left: 0, behavior: "smooth" });
  };
  const scrollLoginProfileGateTargetIntoView = () => {
    window.requestAnimationFrame(() => {
      const alignTarget = () => {
        const field = getFirstIncompleteLoginProfileField();
        const scrollTarget = getScrollTargetForLoginProfileField(field) || document.getElementById("loginProfileCard");
        if (scrollTarget instanceof HTMLElement) {
          scrollElementIntoBalancedView(scrollTarget);
        }
        if (field instanceof HTMLElement && typeof field.focus === "function") {
          field.focus({ preventScroll: true });
        }
      };
      window.setTimeout(alignTarget, 80);
      window.setTimeout(alignTarget, 520);
    });
  };
  const replaceHashWithLogin = () => {
    if (history.replaceState) {
      history.replaceState(null, "", "#login");
    } else {
      window.location.hash = "#login";
    }
  };

  const finishProjectStatusPageLoad = async (page) => {
    if (page === "project-status") {
      if (typeof ensureProjectStatusChartsReady === "function") {
        await ensureProjectStatusChartsReady("public");
      } else {
        ensureProjectStatusInitialized("public");
      }
      refreshProjectStatus("public");
    } else {
      if (typeof ensureProjectStatusChartsReady === "function") {
        await ensureProjectStatusChartsReady("staff");
      } else {
        ensureProjectStatusInitialized("staff");
      }
      refreshProjectStatus("staff");
    }
    if (typeof window.syncProjectMobileActionBar === "function") {
      window.syncProjectMobileActionBar();
    }
    if (typeof window.syncDashboardMobileActionBar === "function") {
      window.syncDashboardMobileActionBar();
    }
    window.sgcuScheduleVisibleChartsRefresh?.(page);
  };

  const loadProjectStatusPageData = async (page) => {
    await ensureProjectDataLoaded();
    const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
    if (activePage !== page) return;
    await finishProjectStatusPageLoad(page);
  };

  const scrollPageToTop = (page, behavior = "smooth") => {
    if (mainContainerEl instanceof HTMLElement) {
      mainContainerEl.scrollTo({ top: 0, left: 0, behavior });
    }

    window.scrollTo({ top: 0, left: 0, behavior });
  };

  // ===== 2) โหลดข้อมูลหน้าแรกแบบ background หลัง route แรกพร้อมใช้งาน =====

  const getConsentSubjects = () => {
    const user = window.sgcuAuth?.auth?.currentUser || null;
    const uidFromEvent = (consentAuthIdentity?.uid || "").toString().trim();
    const emailFromEvent = (consentAuthIdentity?.email || "").toString().trim().toLowerCase();
    const uidFromAuth = (user?.uid || "").toString().trim();
    const emailFromAuth = (user?.email || "").toString().trim().toLowerCase();
    const subjects = [];
    if (uidFromEvent) subjects.push(`uid:${uidFromEvent}`);
    if (uidFromAuth && uidFromAuth !== uidFromEvent) subjects.push(`uid:${uidFromAuth}`);
    if (emailFromEvent) subjects.push(`email:${emailFromEvent}`);
    if (emailFromAuth && emailFromAuth !== emailFromEvent) subjects.push(`email:${emailFromAuth}`);
    if (!subjects.length) subjects.push("anonymous");
    return subjects;
  };

  const hasGlobalConsent = () => {
    const subjects = getConsentSubjects();
    const sessionKeys = subjects.map((subject) => `${globalConsentKeyPrefix}:${subject}`);
    const persistentKeys = subjects.map((subject) => `${globalConsentPersistentKeyPrefix}:${subject}`);
    const acceptedInSession =
      Boolean(window.sessionStorage) &&
      sessionKeys.some((key) => sessionStorage.getItem(key) === "accepted");
    const acceptedPersisted =
      Boolean(window.localStorage) &&
      persistentKeys.some((key) => localStorage.getItem(key) === "accepted");

    // If consent is already present in any key, sync it across current user keys.
    if (!acceptedInSession && acceptedPersisted && window.sessionStorage) {
      sessionKeys.forEach((key) => sessionStorage.setItem(key, "accepted"));
    }
    if (!acceptedPersisted && acceptedInSession && window.localStorage) {
      persistentKeys.forEach((key) => localStorage.setItem(key, "accepted"));
    }

    return Boolean(acceptedInSession || acceptedPersisted);
  };

  const isConsentCheckReady = () => {
    const user = window.sgcuAuth?.auth?.currentUser || null;
    const hasEventIdentity =
      Boolean((consentAuthIdentity?.uid || "").toString().trim()) ||
      Boolean((consentAuthIdentity?.email || "").toString().trim());
    return Boolean(user || hasEventIdentity);
  };

  const writeGlobalConsentAccepted = () => {
    const subjects = getConsentSubjects();
    const sessionKeys = subjects.map((subject) => `${globalConsentKeyPrefix}:${subject}`);
    const persistentKeys = subjects.map((subject) => `${globalConsentPersistentKeyPrefix}:${subject}`);
    if (window.sessionStorage) {
      sessionKeys.forEach((key) => sessionStorage.setItem(key, "accepted"));
    }
    if (window.localStorage) {
      persistentKeys.forEach((key) => localStorage.setItem(key, "accepted"));
    }
  };

  const canUseRemoteConsentStore = () => {
    return !!(
      consentStore.db &&
      consentStore.doc &&
      consentStore.getDoc &&
      consentStore.setDoc &&
      consentStore.serverTimestamp
    );
  };

  const getConsentUid = () => {
    const currentUid = (window.sgcuAuth?.auth?.currentUser?.uid || "").toString().trim();
    if (currentUid) return currentUid;
    return (consentAuthIdentity?.uid || "").toString().trim();
  };

  const buildRemoteConsentRef = () => {
    if (!canUseRemoteConsentStore()) return null;
    const uid = getConsentUid();
    if (!uid) return null;
    return consentStore.doc(consentStore.db, remoteConsentCollection, uid);
  };

  const syncRemoteConsentToLocal = async () => {
    const uid = getConsentUid();
    if (!uid || !canUseRemoteConsentStore()) return false;
    if (remoteConsentSyncedUid === uid && remoteConsentSyncPromise) {
      return remoteConsentSyncPromise;
    }

    remoteConsentSyncedUid = uid;
    remoteConsentSyncPromise = (async () => {
      try {
        const ref = buildRemoteConsentRef();
        if (!ref) return false;
        const snap = await consentStore.getDoc(ref);
        if (!snap?.exists()) return false;
        const data = snap.data() || {};
        const accepted = data.globalServiceConsentAccepted === true;
        const version = (data.globalServiceConsentVersion || "").toString().trim();
        if (accepted && version === globalConsentVersion) {
          writeGlobalConsentAccepted();
          return true;
        }
        return false;
      } catch (_) {
        return false;
      }
    })();

    return remoteConsentSyncPromise;
  };

  const writeRemoteConsentAccepted = async () => {
    const ref = buildRemoteConsentRef();
    if (!ref) return;
    try {
      await consentStore.setDoc(
        ref,
        {
          globalServiceConsentAccepted: true,
          globalServiceConsentVersion: globalConsentVersion,
          globalServiceConsentAcceptedAt: consentStore.serverTimestamp(),
          globalServiceConsentUpdatedAt: consentStore.serverTimestamp()
        },
        { merge: true }
      );
    } catch (_) {
      // ignore remote consent write failures and keep local acceptance
    }
  };

  const ensureGlobalConsentAccepted = async () => {
    if (hasGlobalConsent()) return true;
    await syncRemoteConsentToLocal();
    return hasGlobalConsent();
  };

  const updateGlobalConsentState = () => {
    if (!globalConsentConfirm || !globalConsentRules || !globalConsentPdpa) return;
    globalConsentConfirm.disabled = !(globalConsentRules.checked && globalConsentPdpa.checked);
  };

  const setConsentSectionCollapsed = (section, collapsed) => {
    if (!section) return;
    const header = section.querySelector(".modal-section-header");
    const contentNodes = Array.from(section.children).filter(
      (node) => !node.classList.contains("modal-section-header")
    );
    section.classList.toggle("is-collapsed", collapsed);
    contentNodes.forEach((node) => {
      node.hidden = collapsed;
    });
    if (header) {
      header.setAttribute("aria-expanded", String(!collapsed));
    }
  };

  const resetConsentAccordion = () => {
    consentSections.forEach((section, index) => {
      setConsentSectionCollapsed(section, index !== 0);
    });
  };

  const initializeConsentAccordion = () => {
    if (consentAccordionReady || !consentSections.length) return;
    consentSections.forEach((section) => {
      const header = section.querySelector(".modal-section-header");
      if (!header) return;
      header.classList.add("consent-accordion-trigger");
      header.setAttribute("role", "button");
      header.setAttribute("tabindex", "0");
      header.setAttribute("aria-expanded", "true");

      const cue = document.createElement("span");
      cue.className = "consent-accordion-cue";
      cue.setAttribute("aria-hidden", "true");
      cue.textContent = "⌄";
      header.appendChild(cue);

      const toggle = () => {
        const shouldCollapse = !section.classList.contains("is-collapsed");
        setConsentSectionCollapsed(section, shouldCollapse);
      };

      header.addEventListener("click", toggle);
      header.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });
    });

    consentAccordionReady = true;
    resetConsentAccordion();
  };

  const showGlobalConsentModal = ({ prefillAccepted = false } = {}) => {
    if (!globalConsentModal) return;
    initializeConsentAccordion();
    resetConsentAccordion();
    if (globalConsentRules) globalConsentRules.checked = Boolean(prefillAccepted);
    if (globalConsentPdpa) globalConsentPdpa.checked = Boolean(prefillAccepted);
    updateGlobalConsentState();
    globalConsentModal.classList.add("show");
    globalConsentModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-modal");
  };

  const hideGlobalConsentModal = () => {
    if (!globalConsentModal) return;
    globalConsentModal.classList.remove("show");
    globalConsentModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-modal");
  };

  if (globalConsentRules) {
    globalConsentRules.addEventListener("change", updateGlobalConsentState);
  }
  if (globalConsentPdpa) {
    globalConsentPdpa.addEventListener("change", updateGlobalConsentState);
  }
  if (globalConsentConfirm) {
    globalConsentConfirm.addEventListener("click", () => {
      writeGlobalConsentAccepted();
      void writeRemoteConsentAccepted();
      hideGlobalConsentModal();
      if (pendingConsentPage) {
        const target = pendingConsentPage;
        pendingConsentPage = null;
        void switchPage(target, { fromHash: true, bypassConsent: true });
      }
    });
  }
  if (globalConsentCancel) {
    globalConsentCancel.addEventListener("click", () => {
      hideGlobalConsentModal();
      pendingConsentPage = null;
      if (!currentPage) {
        void switchPage("home", { fromHash: true, bypassConsent: true });
      }
    });
  }
  if (globalConsentClose) {
    globalConsentClose.addEventListener("click", () => {
      hideGlobalConsentModal();
      pendingConsentPage = null;
      if (!currentPage) {
        void switchPage("home", { fromHash: true, bypassConsent: true });
      }
    });
  }
  if (loginViewConsentBtn) {
    loginViewConsentBtn.addEventListener("click", async () => {
      pendingConsentPage = null;
      const accepted = await ensureGlobalConsentAccepted();
      showGlobalConsentModal({ prefillAccepted: accepted });
    });
  }

  window.addEventListener("sgcu:auth-state", async (event) => {
    const isAuthenticated = Boolean(event?.detail?.isAuthenticated);
    const uid = (event?.detail?.uid || "").toString().trim();
    const email = (event?.detail?.email || "").toString().trim().toLowerCase();
    if (uid && uid !== remoteConsentSyncedUid) {
      remoteConsentSyncPromise = null;
    }
    consentAuthIdentity = { uid, email };
    if (!isAuthenticated) {
      remoteConsentSyncPromise = null;
      remoteConsentSyncedUid = "";
      pendingConsentPage = null;
      hideGlobalConsentModal();
      return;
    }
    const accepted = await ensureGlobalConsentAccepted();
    if (!accepted) {
      showGlobalConsentModal();
      return;
    }
    hideGlobalConsentModal();
  });
  if (window.sgcuAuth?.auth?.currentUser) {
    const accepted = await ensureGlobalConsentAccepted();
    if (!accepted) {
      showGlobalConsentModal();
    }
  }

  async function switchPage(page, { fromHash = false, bypassConsent = false } = {}) {
    const previousPage = currentPage;
    const targetPage = page === "project-status-staff" ? "treasurer-handover-staff" : page;
    const pageExists = Array.from(pageViews).some((section) => section.dataset.page === targetPage);
    if (!pageExists) {
      return;
    }

    if (shouldBlockForIncompleteLoginProfile(targetPage)) {
      replaceHashWithLogin();
      await switchPage("login", { fromHash: true, bypassConsent: true });
      showLoginProfileGateMessage();
      scrollLoginProfileGateTargetIntoView();
      return;
    }

    // Route guard: กันการเข้าหน้า protected/staff ผ่าน hash โดยตรง
    if (!isNavPageVisible(targetPage)) {
      const preferredPage = getPreferredPageForState(isUserAuthenticated);
      const targetRequiresAuth = navLinksAll.some(
        (link) => link.dataset.page === targetPage && link.dataset.visible === "protected"
      );
      const fallbackCandidates = isUserAuthenticated
        ? [
            currentPage,
            preferredPage,
            "home",
            "dashboard-staff",
            "system-data-staff",
            "project-status",
            "treasurer-handover-staff",
            "login"
          ]
        : targetRequiresAuth
          ? ["login", "home"]
          : ["home", "login"];
      const fallback =
        fallbackCandidates.find((candidate) => isNavPageVisible(candidate)) ||
        navLinksAll.find((link) => link.style.display !== "none")?.dataset.page;

      if (!fallback || fallback === targetPage) return;

      if (fromHash) {
        if (history.replaceState) {
          history.replaceState(null, "", `#${fallback}`);
        } else {
          window.location.hash = `#${fallback}`;
        }
      }
      await switchPage(fallback, { fromHash: true, bypassConsent: true });
      return;
    }

    let consentAccepted = true;
    if (!bypassConsent && consentRequiredPages.has(targetPage) && isConsentCheckReady()) {
      consentAccepted = await ensureGlobalConsentAccepted();
    }
    if (!consentAccepted) {
      pendingConsentPage = targetPage;
      showGlobalConsentModal();
      if (currentPage) {
        if (fromHash) {
          if (history.replaceState) {
            history.replaceState(null, "", "#" + currentPage);
          } else {
            window.location.hash = "#" + currentPage;
          }
        }
        return;
      }
      await switchPage("home", { fromHash: true, bypassConsent: true });
      return;
    }
    if (["dashboard-staff", "system-data-staff"].includes(targetPage) && staffViewMode !== "staff") {
      await switchPage("treasurer-handover-staff", { fromHash });
      return;
    }

    try {
      await ensurePageFeatureLoaded(targetPage);
      clearLoadError("feature-loader");
    } catch (error) {
      console.error("page feature script failed to load - app.init.js:686", targetPage, error);
      recordLoadError("feature-loader", "ไม่สามารถโหลดฟีเจอร์ของหน้านี้ได้", { showRetry: true });
      return;
    }

    pageViews.forEach((section) => {
      const isTarget = section.dataset.page === targetPage;
      if (isTarget) {
        section.classList.add("active");
        // reset animation state ให้เล่นใหม่ทุกครั้ง
        section.classList.remove("section-visible");
        section.classList.add("section-appear");
        requestAnimationFrame(() => {
          section.classList.add("section-visible");
        });
      } else {
        section.classList.remove("active");
        section.classList.remove("section-visible");
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.page === page);
    });
    scheduleMobileBottomIndicatorSync();

    if (page === "home") {
      scrollPageToTop(page, "auto");
    }

    page = targetPage;

    if (page === "project-status") {
      setActiveProjectStatusContext("public");
    } else if (page === "dashboard-staff") {
      setActiveProjectStatusContext("staff");
      window.sgcuSetStaffProjectWorkflowTab?.("checks");
    }

    refreshMotionForActivePage();
    window.dispatchEvent(new CustomEvent("sgcu:page-active", { detail: { page: targetPage } }));
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("sgcu:page-active", { detail: { page: targetPage } }));
      window.sgcuScheduleVisibleChartsRefresh?.(targetPage);
    });

    if (page === "home") {
      const loadHomeData = () => {
        const tasks = [runFeatureTask("news", "loadNewsFromSheet")];
        const scoreboardPanel = document.getElementById("scorePodium")?.closest(".home-snap-panel");
        if (scoreboardPanel && scoreboardPanel.dataset.scoreboardDisabled !== "true") {
          tasks.push(runFeatureTask("scoreboard", "initScoreboard"));
        }
        return Promise.allSettled(tasks);
      };
      scheduleIdleTask(() => runBackgroundTask(loadHomeData, "home-loader-data"));
    } else if (page === "news") {
      await runFeatureTask("news", "loadNewsFromSheet");
    } else if (page === "financial-docs") {
      await runFeatureTask("financial-docs", "loadDownloadDocuments");
    } else if (["content-management-staff", "content-news-staff", "content-documents-staff"].includes(page)) {
      await runFeatureTask(page, "initContentManagementStaffPage");
    } else if (page === "system-data-staff") {
      window.sgcuHealthCheck?.init?.();
      window.sgcuAuditLog?.initDashboard?.();
    }

    if (typeof shouldLoadProjectDataForPage === "function" && shouldLoadProjectDataForPage(page)) {
      const projectStatusCtxKey = page === "project-status" ? "public" : "staff";
      if (typeof ensureProjectStatusChartShell === "function") {
        void ensureProjectStatusChartShell(projectStatusCtxKey).catch((error) => {
          console.warn("project status chart shell failed to initialize - app.init.js", error);
        });
      }
      if (page === "project-status" && !projectsLoaded) {
        setLoading(true, "public");
        setProjectDataLoadState("info", "กำลังโหลดข้อมูลโครงการ...");
        scheduleIdleTask(() => runBackgroundTask(
          () => loadProjectStatusPageData(page),
          "project-status-data"
        ), 100);
      } else {
        await ensureProjectDataLoaded();
        finishProjectStatusPageLoad(page);
      }
    }

    const filterBar = document.getElementById("filterBarStaff");
    if (filterBar) {
      const hostStatus = document.getElementById("filterBarHostStaff");
      const hostDashboard = document.getElementById("filterBarHostDashboardStaff");
      if (page === "dashboard-staff" && hostDashboard) {
        hostDashboard.appendChild(filterBar);
        filterBar.style.display = "grid";
      } else if (hostStatus) {
        hostStatus.appendChild(filterBar);
      }
    }

    // sync URL hash กับ page ปัจจุบัน (ไม่ทำตอนมาจาก hashchange)
    if (!fromHash) {
      if (history.replaceState) {
        history.replaceState(null, "", "#" + page);
      } else {
        window.location.hash = "#" + page;
      }
    }

    currentPage = page;
    if (window.localStorage) {
      localStorage.setItem("lastActivePage", page);
    }
    if (typeof window.syncProjectMobileActionBar === "function") {
      window.syncProjectMobileActionBar();
    }
    if (typeof window.syncDashboardMobileActionBar === "function") {
      window.syncDashboardMobileActionBar();
    }
    window.sgcuScheduleVisibleChartsRefresh?.(page);

    if (previousPage && previousPage !== page) {
      window.sgcuAnalytics?.trackPageView?.(page);
    }
  }

  // คลิกเมนูด้านบน
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      if (!page) return;
      const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
      if (page === currentPage || page === activePage) {
        scrollPageToTop(page);
        return;
      }
      void switchPage(page);
    });
  });

  // ตั้งค่าหน้าเริ่มต้นให้กลับมาที่ Home เสมอหลัง loader ครบ 100%
  const defaultPage =
    document.querySelector(".page-view.active")?.dataset.page ||
    navLinks[0]?.dataset.page ||
    "home";

  const isValidPage = (page) =>
    Array.from(pageViews).some((sec) => sec.dataset.page === page);

  const initialHashPage = window.location.hash.replace("#", "");
  const hasValidInitialHash = !!initialHashPage && isValidPage(initialHashPage);
  const initialPage = hasValidInitialHash ? initialHashPage : isValidPage("home") ? "home" : defaultPage;

  configureLoaderForInitialPage(initialPage);
  await switchPage(initialPage, { fromHash: true });
  scheduleMobileBottomIndicatorSync();
  prefetchFeatureScriptsInIdle();

  window.addEventListener("resize", scheduleMobileBottomIndicatorSync, { passive: true });
  window.addEventListener("orientationchange", scheduleMobileBottomIndicatorSync, { passive: true });
  window.addEventListener("sgcu:mobile-menu-state", scheduleMobileBottomIndicatorSync);
  window.addEventListener("sgcu:mobile-bottom-nav-visibility", scheduleMobileBottomIndicatorSync);

  // รองรับเปลี่ยน hash ด้วยตนเอง (#about, #status ฯลฯ)
  window.addEventListener("hashchange", () => {
    const hashPage = window.location.hash.replace("#", "");
    if (!hashPage) return;
    if (Array.from(pageViews).some((sec) => sec.dataset.page === hashPage)) {
      void switchPage(hashPage, { fromHash: true });
    }
  });

  window.addEventListener("sgcu:login-profile-state", (event) => {
    const state = event?.detail || {};
    const activePage = document.querySelector(".page-view.active")?.dataset.page || currentPage || "";
    if (state.isAuthenticated && state.isComplete === false && shouldBlockForIncompleteLoginProfile(activePage)) {
      replaceHashWithLogin();
      void switchPage("login", { fromHash: true, bypassConsent: true }).then(() => {
        showLoginProfileGateMessage();
        scrollLoginProfileGateTargetIntoView();
      });
    }
  });
  if (shouldBlockForIncompleteLoginProfile(document.querySelector(".page-view.active")?.dataset.page || currentPage || "")) {
    replaceHashWithLogin();
    void switchPage("login", { fromHash: true, bypassConsent: true }).then(() => {
      showLoginProfileGateMessage();
      scrollLoginProfileGateTargetIntoView();
    });
  }

  // ===== 10) Hamburger + เมนูมือถือ =====
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileMenuGroups = Array.from(document.querySelectorAll(".mobile-menu-group"));
  const navGroupToggles = Array.from(document.querySelectorAll(".nav-group-toggle"));
  const navGroupMenus = Array.from(document.querySelectorAll(".nav-group-menu"));

  const closeDesktopNavGroups = () => {
    navGroupToggles.forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
      const host = btn.closest(".nav-group");
      if (host) host.classList.remove("is-open");
    });
    navGroupMenus.forEach((menu) => {
      menu.classList.remove("show");
      menu.setAttribute("aria-hidden", "true");
    });
  };

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");

    document.addEventListener("click", (e) => {
      if (!mobileMenu.classList.contains("show")) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (mobileMenu.contains(target) || hamburgerBtn.contains(target)) return;
      setMobileMenuState(mobileMenu, hamburgerBtn, false);
    });
  }
  if (mobileMenuGroups.length) {
    mobileMenuGroups.forEach((group) => {
      const summary = group.querySelector("summary");
      if (!summary) return;
      summary.addEventListener("click", (event) => {
        if (group.classList.contains("is-single")) {
          event.preventDefault();
          group.setAttribute("open", "");
          return;
        }
        const willOpen = !group.hasAttribute("open");
        if (!willOpen) return;
        mobileMenuGroups.forEach((otherGroup) => {
          if (otherGroup !== group && !otherGroup.classList.contains("is-single")) {
            otherGroup.removeAttribute("open");
          }
        });
      });
    });
  }
  if (navGroupToggles.length) {
    closeDesktopNavGroups();

    navGroupToggles.forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const host = btn.closest(".nav-group");
        const menu = host?.querySelector(".nav-group-menu");
        if (!host || !menu) return;
        const isOpen = menu.classList.contains("show");
        closeDesktopNavGroups();
        if (!isOpen) {
          btn.setAttribute("aria-expanded", "true");
          host.classList.add("is-open");
          menu.classList.add("show");
          menu.setAttribute("aria-hidden", "false");
        }
      });
    });

    navGroupMenus.forEach((menu) => {
      menu.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof HTMLAnchorElement && target.dataset.page) {
          closeDesktopNavGroups();
        }
      });
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".nav-group")) return;
      closeDesktopNavGroups();
    });
  }


  // ปุ่มลัดที่หน้า Hero: มี data-goto-page (เช่น “ดูสถานะโครงการทั้งหมด”)
  document.querySelectorAll("[data-goto-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.gotoPage;
      if (!page) return;
      if (!isUserAuthenticated && !isNavPageVisible(page)) {
        void switchPage("login");
        return;
      }
      void switchPage(page);
    });
  });

  document.querySelectorAll("[data-home-scroll-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newsPanel = document.querySelector('.page-view[data-page="home"] .home-snap-panel:nth-of-type(2)');
      if (newsPanel instanceof HTMLElement) {
        newsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      document.querySelector(".home-news")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ===== 5) Modal รายละเอียดโครงการ =====
  const closeProjectModalSafely = () => {
    if (typeof closeProjectModal === "function") {
      closeProjectModal();
      return;
    }
    if (projectModalEl && typeof closeDialog === "function") {
      closeDialog(projectModalEl);
      return;
    }
    if (projectModalEl) {
      projectModalEl.classList.remove("show");
      projectModalEl.setAttribute("aria-hidden", "true");
    }
  };
  if (projectModalCloseEl) {
    projectModalCloseEl.addEventListener("click", closeProjectModalSafely);
  }
  if (projectModalEl) {
    projectModalEl.addEventListener("click", (e) => {
      if (e.target === projectModalEl) {
        closeProjectModalSafely();
      }
    });
  }

  // ===== X) Modal ข่าว/ประกาศ =====
  const closeNewsModalSafely = () => {
    if (typeof closeNewsModal === "function") {
      closeNewsModal();
      return;
    }
    if (newsModalEl && typeof closeDialog === "function") {
      closeDialog(newsModalEl);
      return;
    }
    if (newsModalEl) {
      newsModalEl.classList.remove("show");
      newsModalEl.setAttribute("aria-hidden", "true");
    }
  };
  if (newsModalCloseEl) {
    newsModalCloseEl.addEventListener("click", closeNewsModalSafely);
  }
  if (newsModalEl) {
    newsModalEl.addEventListener("click", (e) => {
      if (e.target === newsModalEl) {
        closeNewsModalSafely();
      }
    });
  }

  // ปุ่ม Esc: ปิดโมดัลที่เปิดอยู่ หรือปิดเมนูมือถือ
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const activeDialogEl =
      typeof getActiveDialog === "function" ? getActiveDialog() : null;
    if (activeDialogEl) {
      closeDialog(activeDialogEl);
      return;
    }
    const menuEl = document.getElementById("mobileMenu");
    const buttonEl = document.getElementById("hamburgerBtn");
    if (menuEl && buttonEl && menuEl.classList.contains("show")) {
      setMobileMenuState(menuEl, buttonEl, false);
    }
    closeDesktopNavGroups();
  });

  // ===== 6) Event เปลี่ยน filter ของ Project Status (public/staff) =====
  ["public", "staff"].forEach((key) => {
    const ctx = projectStatusContexts[key];
    if (!ctx) return;

    if (ctx.yearSelect) {
      ctx.yearSelect.addEventListener("change", async () => {
        setActiveProjectStatusContext(key);
        const selectedYear = ctx.yearSelect.value;
        if (typeof switchProjectSourceYear === "function" && selectedYear && selectedYear !== "all") {
          await switchProjectSourceYear(selectedYear);
          return;
        }
        refreshProjectStatus(key);
        if (typeof refreshScoreboardForProjectYear === "function") {
          await refreshScoreboardForProjectYear();
        }
      });
    }
    if (ctx.orgTypeSelect) {
      ctx.orgTypeSelect.addEventListener("change", () => {
        setActiveProjectStatusContext(key);
        initOrgOptions();
        refreshProjectStatus(key);
      });
    }
    if (ctx.orgSelect) {
      ctx.orgSelect.addEventListener("change", () => {
        setActiveProjectStatusContext(key);
        refreshProjectStatus(key);
      });
    }
    if (ctx.projectSearchInput) {
      const debouncedSearch = debounce(() => {
        setActiveProjectStatusContext(key);
        refreshProjectStatus(key);
      }, 180);
      ctx.projectSearchInput.addEventListener("input", debouncedSearch);
    }
    if (ctx.projectSearchClearBtn && ctx.projectSearchInput) {
      ctx.projectSearchClearBtn.addEventListener("click", () => {
        resetProjectFilters(key);
        ctx.projectSearchInput.focus();
      });
    }
    if (ctx.projectRefreshDataBtn) {
      ctx.projectRefreshDataBtn.addEventListener("click", () => {
        setActiveProjectStatusContext(key);
        void forceRefreshProjectData(key);
      });
    }
    if (ctx.projectExportCsvBtn) {
      ctx.projectExportCsvBtn.addEventListener("click", () => {
        exportVisibleProjectsCsv(key);
      });
    }
    if (ctx.closureStatusChartDownloadBtn) {
      ctx.closureStatusChartDownloadBtn.addEventListener("click", () => {
        downloadClosureStatusChartPng(key);
      });
    }
    if (ctx.projectClosureMailMergeExportBtn) {
      ctx.projectClosureMailMergeExportBtn.addEventListener("click", () => {
        exportClosureMailMergeCsv(key);
      });
    }
    if (ctx.projectClosureExportUntilMonthInput) {
      ctx.projectClosureExportUntilMonthInput.addEventListener("change", () => {
        setActiveProjectStatusContext(key);
        updateStaffProjectOperationsPanel(getVisibleProjectsForContext(key));
      });
    }
    if (ctx.projectClosureExportClearMonthBtn && ctx.projectClosureExportUntilMonthInput) {
      ctx.projectClosureExportClearMonthBtn.addEventListener("click", () => {
        ctx.projectClosureExportUntilMonthInput.value = "";
        setActiveProjectStatusContext(key);
        updateStaffProjectOperationsPanel(getVisibleProjectsForContext(key));
      });
    }
    if (ctx.longestOpenAssistantFilterEl) {
      ctx.longestOpenAssistantFilterEl.addEventListener("change", () => {
        setActiveProjectStatusContext(key);
        refreshProjectStatus(key);
      });
    }
    if (ctx.longestOpenStatusFilterEl) {
      ctx.longestOpenStatusFilterEl.addEventListener("change", () => {
        setActiveProjectStatusContext(key);
        refreshProjectStatus(key);
      });
    }
  });

  // ===== 7) โหลดโครงสร้างองค์กร (Home section) แบบ background =====
  scheduleIdleTask(() => runBackgroundTask(
    () => runFeatureTask("org-structure", "loadOrgStructure"),
    "orgStructure"
  ));

  // ===== 8) Sorting ตารางโครงการ (public/staff) =====
  ["public", "staff"].forEach((key) => {
    const ctx = projectStatusContexts[key];
    if (!ctx || !ctx.tableBodyEl) return;

    const ths = ctx.tableBodyEl.closest("table")?.querySelectorAll("th.sortable") || [];
    ths.forEach((th) => {
      th.addEventListener("click", () => {
        const sortKey = th.dataset.sort;
        setActiveProjectStatusContext(key);
        if (currentSort.key === sortKey) {
          currentSort.direction =
            currentSort.direction === "asc" ? "desc" : "asc";
        } else {
          currentSort.key = sortKey;
          currentSort.direction = "asc";
        }

        syncProjectSortIndicators(key);
        refreshProjectStatus(key);
      });
    });
  });

  // ===== 9) Toggle ระหว่าง Status / Calendar (public + staff) =====
  ["public", "staff"].forEach((key) => {
    const ctx = projectStatusContexts[key];
    if (!ctx || !ctx.viewToggleBtns || !ctx.statusViewEl || !ctx.calendarViewEl) return;

    ctx.viewToggleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!isUserAuthenticated && key === "staff") return;
        setActiveProjectStatusContext(key);
        const target = btn.dataset.view; // 'status', 'calendar', 'ops' หรือ '-staff'

        ctx.viewToggleBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        const isCalendar = target.includes("calendar");
        const isDashboard = target.includes("dashboard");
        const isOps = target.includes("ops");
        if (ctx.statusViewEl) {
          ctx.statusViewEl.style.display = isCalendar || isDashboard || isOps ? "none" : "block";
        }
        if (ctx.calendarViewEl) {
          ctx.calendarViewEl.style.display = isCalendar ? "block" : "none";
        }
        if (ctx.projectStaffOpsPanelEl) {
          ctx.projectStaffOpsPanelEl.style.display = isOps ? "block" : "none";
        }
        if (ctx.dashboardViewEl) {
          ctx.dashboardViewEl.style.display = isDashboard ? "block" : "none";
        }
        if (ctx.filterBarEl) {
          ctx.filterBarEl.style.display = isCalendar ? "none" : "grid";
        }
        if (isCalendar) {
          generateCalendar();
        }
        if (typeof window.syncProjectMobileActionBar === "function") {
          window.syncProjectMobileActionBar();
        }
        if (typeof window.syncDashboardMobileActionBar === "function") {
          window.syncDashboardMobileActionBar();
        }
      });
    });
  });

  initProjectMobileActionBar();
  initDashboardMobileActionBar();
  initMeetingRoomMobileActionBar();

  // ===== System Data Staff: Project Sources / Activity Log =====
  const dashboardStaffMainSourcesTabEl = document.getElementById("dashboardStaffMainSourcesTab");
  const dashboardStaffMainAuditTabEl = document.getElementById("dashboardStaffMainAuditTab");
  const dashboardStaffSourcesPanelEl = document.getElementById("dashboardStaffSourcesPanel");
  const dashboardStaffAuditPanelEl = document.getElementById("dashboardStaffAuditPanel");
  const setDashboardStaffMainTab = (tab = "sources") => {
    const showSources = tab === "sources";
    const showAudit = tab === "audit";
    if (dashboardStaffSourcesPanelEl) dashboardStaffSourcesPanelEl.hidden = !showSources;
    if (dashboardStaffAuditPanelEl) dashboardStaffAuditPanelEl.hidden = !showAudit;
    if (dashboardStaffMainSourcesTabEl) {
      dashboardStaffMainSourcesTabEl.classList.toggle("is-active", showSources);
      dashboardStaffMainSourcesTabEl.setAttribute("aria-selected", showSources ? "true" : "false");
    }
    if (dashboardStaffMainAuditTabEl) {
      dashboardStaffMainAuditTabEl.classList.toggle("is-active", showAudit);
      dashboardStaffMainAuditTabEl.setAttribute("aria-selected", showAudit ? "true" : "false");
    }
    if (showAudit) {
      window.sgcuAuditLog?.initDashboard?.();
    }
  };

  if (dashboardStaffMainSourcesTabEl) {
    dashboardStaffMainSourcesTabEl.addEventListener("click", () => setDashboardStaffMainTab("sources"));
  }
  if (dashboardStaffMainAuditTabEl) {
    dashboardStaffMainAuditTabEl.addEventListener("click", () => setDashboardStaffMainTab("audit"));
  }
  if (dashboardStaffMainSourcesTabEl || dashboardStaffMainAuditTabEl) {
    setDashboardStaffMainTab("sources");
  } else if (dashboardStaffAuditPanelEl) {
    dashboardStaffAuditPanelEl.hidden = false;
  }


  // ===== 10) Tabs Borrow & Return Assets =====
  const assetTabBtns = document.querySelectorAll(".tab-btn[data-assets-tab]");
  const assetsOverview = document.getElementById("assetsOverview");
  const assetsList = document.getElementById("assetsList");

  if (assetTabBtns.length && assetsOverview && assetsList) {
    assetTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.assetsTab; // 'overview' | 'list'
        assetTabBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        if (target === "overview") {
          assetsOverview.style.display = "block";
          assetsList.style.display = "none";
          assetsOverview.classList.add("section-visible");
          assetsList.classList.remove("section-visible");
        } else {
          assetsOverview.style.display = "none";
          assetsList.style.display = "block";
          assetsList.classList.add("section-visible");
          assetsOverview.classList.remove("section-visible");
        }
      });
    });
  }

  // ===== 10.5) Borrow form: derive faculty from student ID =====
  const borrowStudentId = document.getElementById("borrowStudentId");
  const borrowStudentIdWarning = document.getElementById("borrowStudentIdWarning");
  const borrowFaculty = document.getElementById("borrowFaculty");
  const borrowFacultyWarning = document.getElementById("borrowFacultyWarning");
  const borrowYear = document.getElementById("borrowYear");
  const borrowYearWarning = document.getElementById("borrowYearWarning");
  if (borrowStudentId && borrowFaculty && borrowYear) {
    const facultyMap = {
      "21": "วิศวกรรมศาสตร์",
      "22": "อักษรศาสตร์",
      "23": "วิทยาศาสตร์",
      "24": "รัฐศาสตร์",
      "25": "สถาปัตยกรรมศาสตร์",
      "26": "พาณิชยศาสตร์และการบัญชี",
      "27": "ครุศาสตร์",
      "28": "นิเทศศาสตร์",
      "29": "เศรษฐศาสตร์",
      "30": "แพทยศาสตร์",
      "31": "สัตวแพทย์ศาสตร์",
      "32": "ทันตแพทย์ศาสตร์",
      "33": "เภสัชศาสตร์",
      "34": "นิติศาสตร์",
      "35": "ศิลปกรรมศาสตร์",
      "37": "สหเวชศาสตร์",
      "38": "จิตวิทยา",
      "39": "วิทยาศาสตร์การกีฬา",
      "40": "สำนักทรัพยากรทางการเกษตร",
      "56": "สถาบันนวัตกรรมบูรณาการฯ"
    };

    const updateBorrowFaculty = () => {
      const rawValue = borrowStudentId.value;
      const digits = rawValue.replace(/\D/g, "");
      const hasNonDigits = rawValue.trim() !== "" && digits.length !== rawValue.replace(/\s/g, "").length;
      if (borrowStudentIdWarning) {
        if (hasNonDigits) {
          borrowStudentIdWarning.textContent = "กรุณากรอกตัวเลขเท่านั้น";
          borrowStudentIdWarning.hidden = false;
        } else {
          borrowStudentIdWarning.hidden = true;
        }
      }
      if (digits.length < 10) {
        borrowFaculty.value = "";
        borrowFaculty.dataset.facultyCode = "";
        if (borrowFacultyWarning) {
          borrowFacultyWarning.hidden = true;
        }
        borrowYear.value = "";
        borrowYear.dataset.yearLevel = "";
        if (borrowYearWarning) {
          borrowYearWarning.hidden = true;
        }
        return;
      }
      const code = digits.slice(-2);
      const label = facultyMap[code];
      borrowFaculty.value = label ? label : "";
      borrowFaculty.dataset.facultyCode = label ? code : "";
      if (borrowFacultyWarning) {
        borrowFacultyWarning.hidden = !!label;
      }

      const entryYearSuffix = digits.slice(0, 2);
      const entryYear = 2500 + Number(entryYearSuffix);
      const now = new Date();
      const currentYear = now.getFullYear();
      const academicYear = (now.getMonth() + 1 >= 8) ? currentYear : currentYear - 1;
      const academicYearBE = academicYear + 543;
      const yearLevel = Number.isFinite(entryYear)
        ? academicYearBE - entryYear + 1
        : NaN;
      const isValidYearLevel = yearLevel >= 1 && yearLevel <= 8;
      borrowYear.value = isValidYearLevel ? String(yearLevel) : "";
      borrowYear.dataset.yearLevel = isValidYearLevel ? String(yearLevel) : "";
      if (borrowYearWarning) {
        borrowYearWarning.hidden = isValidYearLevel;
      }
    };

    borrowStudentId.addEventListener("input", updateBorrowFaculty);
    borrowStudentId.addEventListener("blur", updateBorrowFaculty);
    updateBorrowFaculty();
  }

  // === Scope pills: คลิกแล้ว highlight การ์ดทีมที่เกี่ยวข้อง ===
  const scopePills = document.querySelectorAll(".scope-pill[data-scope-target]");
  const scopeCards = document.querySelectorAll(".scope-team-card[data-scope]");

  const syncScopeCards = (target) => {
    scopePills.forEach((pill) => {
      const isActive = pill.dataset.scopeTarget === target;
      pill.classList.toggle("scope-pill-active", isActive);
      pill.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    scopeCards.forEach((card) => {
      const isActive = card.dataset.scope === target;
      if (isActive) {
        card.classList.remove("scope-team-exit");
        card.classList.add("scope-team-active");
        card.hidden = false;
      } else if (!card.hidden) {
        card.classList.remove("scope-team-active");
        card.classList.add("scope-team-exit");
        window.setTimeout(() => {
          card.hidden = true;
          card.classList.remove("scope-team-exit");
        }, 200);
      }
    });
  };

  const initialScope =
    document.querySelector(".scope-pill-active")?.dataset.scopeTarget
    || scopePills[0]?.dataset.scopeTarget;

  if (initialScope) {
    syncScopeCards(initialScope);
  }

  scopePills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const target = pill.dataset.scopeTarget;
      if (!target) {
        return;
      }

      syncScopeCards(target);

      // เลื่อนสายตาไปหา card ที่ถูกเลือก (เฉพาะบนจอเล็กจะช่วยให้เห็นชัด)
      const activeCard = document.querySelector(
        `.scope-team-card[data-scope="${target}"]`
      );
      if (activeCard && window.innerWidth < 900) {
        const rect = activeCard.getBoundingClientRect();
        const headerEl = document.querySelector(".site-header");
        const headerOffset = headerEl ? headerEl.getBoundingClientRect().height + 12 : 0;
        const viewTop = headerOffset;
        const viewBottom = window.innerHeight - 12;
        const isAbove = rect.top < viewTop;
        const isBelow = rect.bottom > viewBottom;

        if (isAbove || isBelow) {
          const targetY = window.scrollY + rect.top - headerOffset;
          window.scrollTo({ top: targetY, behavior: "smooth" });
        }
      }
    });
  });

  // เรียก motion ครั้งแรกสำหรับหน้าเริ่มต้น
  refreshMotionForActivePage();

  if (appLoaderEl) {
    await simulatedLoaderDonePromise;
    if (!hasValidInitialHash && currentPage !== "home" && isValidPage("home")) {
      await switchPage("home", { fromHash: false, bypassConsent: true });
    } else if (!hasValidInitialHash && window.location.hash !== "#home" && isValidPage("home")) {
      if (history.replaceState) {
        history.replaceState(null, "", "#home");
      } else {
        window.location.hash = "#home";
      }
    }
    requestAnimationFrame(() => {
      finishSimulatedLoaderPercent();
      appLoaderEl.classList.add("is-hidden");
      appLoaderEl.setAttribute("aria-busy", "false");
      markLoaderStep = null;
      updateLoaderProgress = null;
    });
  }
});
