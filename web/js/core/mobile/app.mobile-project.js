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
    setActiveProjectStatusContext("public");
    if (typeof currentCalendarDate === "undefined") return;
    const today = new Date();
    currentCalendarDate.setTime(new Date(today.getFullYear(), today.getMonth(), 1).getTime());
    if (typeof selectedCalendarDate !== "undefined") {
      selectedCalendarDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    if (typeof generateCalendar === "function") {
      generateCalendar({ showEmptyMonthNotice: true });
    }
  };

  const shiftCalendarMonth = (amount) => {
    setActiveProjectStatusContext("public");
    if (typeof currentCalendarDate === "undefined") return;
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + amount);
    if (typeof generateCalendar === "function") {
      generateCalendar({ showEmptyMonthNotice: true });
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
      setMobileActionButton(filtersAction, "calendar", "◷", "ปฏิทิน", "แสดงปฏิทินโครงการ");
      setMobileActionButton(statusAction, "export", "↓", "Export CSV", "ส่งออกข้อมูลโครงการเป็น CSV");
      setMobileActionButton(calendarAction, "filters", "⌕", "ตัวกรอง", "เปิดตัวกรอง");
      actionBtns.forEach((btn) => {
        const action = btn.dataset.projectMobileEffectiveAction;
        btn.classList.toggle("is-active", action === activeView);
        btn.disabled = action === "export" && (!exportBtn || exportBtn.disabled);
        btn.setAttribute("aria-disabled", String(btn.disabled));
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

