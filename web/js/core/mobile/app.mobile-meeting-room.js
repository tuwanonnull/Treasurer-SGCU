function initMeetingRoomMobileActionBar() {
  const section = document.querySelector('section[data-page="meeting-room-staff"]');
  const bar = document.querySelector(".mobile-meeting-action-bar");
  if (!section || !bar) return;

  const actionBtns = Array.from(bar.querySelectorAll("[data-meeting-mobile-action]"));
  if (!actionBtns.length) return;

  const requestsTab = section.querySelector('[data-meeting-staff-tab="requests"]');
  const historyTab = section.querySelector('[data-meeting-staff-tab="history"]');
  const mainRequestsTab = section.querySelector('[data-meeting-staff-main-tab="requests"]');
  const mainSettingsTab = section.querySelector('[data-meeting-staff-main-tab="settings"]');
  const listPanel = document.getElementById("staffMeetingAll");
  const calendarPanel = document.getElementById("meetingRoomStaffCalendarPanel");
  const filterTarget = document.getElementById("meetingRoomHistorySearchWrap");
  const startDateFilter = document.getElementById("meetingRoomHistoryStartDateInput");
  const endDateFilter = document.getElementById("meetingRoomHistoryEndDateInput");
  const roomFilter = document.getElementById("meetingRoomHistoryRoomSelect");
  const statusFilter = document.getElementById("meetingRoomStatusFilter");
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
  let previousView = "requests";
  let previousScrollY = 0;
  let wasSettingsActive = false;
  const defaultActions = actionBtns.map((btn) => ({
    action: btn.dataset.meetingMobileAction,
    icon: btn.children[0].textContent,
    label: btn.children[1].textContent
  }));

  mainSettingsTab?.addEventListener("click", () => {
    if (!section.classList.contains("is-settings-view")) previousScrollY = window.scrollY;
  }, true);

  const isMobile = () =>
    !window.matchMedia || window.matchMedia("(max-width: 840px)").matches;

  const isHistoryActive = () => historyTab?.classList.contains("is-active");

  const scrollToPanel = (target) => {
    if (!target) return;
    const siteHeader = document.querySelector(".site-header");
    const headerHeight = siteHeader?.getBoundingClientRect().height || 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, targetTop - headerHeight - 14),
      behavior: "smooth"
    });
  };

  const getFilterCount = () => {
    const startDateValue = (startDateFilter?.value || "").trim();
    const endDateValue = (endDateFilter?.value || "").trim();
    const roomValue = (roomFilter?.value || "all").trim();
    const searchValue = (searchFilter?.value || "").trim();
    return [Boolean(startDateValue || endDateValue), roomValue !== "all", (statusFilter?.value || "all") !== "all", Boolean(searchValue)].filter(Boolean).length;
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
    if (meetingSettingsActive && !wasSettingsActive) {
      if (previousView !== "calendar") previousView = isHistoryActive() ? "history" : "requests";
    }
    wasSettingsActive = meetingSettingsActive;
    const settingsActions = [
      ["back", "↶", "กลับ", "กลับไปหน้าก่อนเข้าตั้งค่า"],
      ["holiday-prev", "‹", "เดือนก่อน", "เดือนก่อนหน้า"],
      ["holiday-today", "◎", "วันนี้", "กลับไปเดือนปัจจุบัน"],
      ["holiday-next", "›", "เดือนหน้า", "เดือนถัดไป"],
      ["holiday-add", "＋", "เพิ่มวันปิด", "เพิ่มวันปิดให้บริการ"]
    ];
    actionBtns.forEach((btn, index) => {
      const original = defaultActions[index];
      const [action, icon, label, description] = meetingSettingsActive
        ? settingsActions[index]
        : [original.action, original.icon, original.label, original.label];
      btn.dataset.meetingMobileEffectiveAction = action;
      if (btn.children[0].textContent !== icon) btn.children[0].textContent = icon;
      if (btn.children[1].textContent !== label) btn.children[1].textContent = label;
      btn.setAttribute("aria-label", description);
    });
    bar.classList.toggle("is-visible", activePage === "meeting-room-staff");
    actionBtns.forEach((btn) => {
      const action = btn.dataset.meetingMobileEffectiveAction;
      btn.classList.toggle(
        "is-active",
        (action === "requests" && !meetingSettingsActive && previousView !== "calendar" && !isHistoryActive()) ||
          (action === "history" && !meetingSettingsActive && previousView !== "calendar" && isHistoryActive()) ||
          (action === "calendar" && !meetingSettingsActive && previousView === "calendar") ||
          (action === "settings" && meetingSettingsActive)
      );
      btn.classList.remove("has-active-filters");
      btn.dataset.filterCount = "";
    });

    const filterBtn = actionBtns.find((btn) => btn.dataset.meetingMobileEffectiveAction === "filters");
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
        ? "กรองประวัติย้อนหลังตามวันที่ใช้ห้อง สถานะ ห้องประชุม หรือคำค้น"
        : "กรองรายการที่ต้องจัดการตามวันที่ใช้ห้อง สถานะ ห้องประชุม หรือคำค้น";
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
      const action = btn.dataset.meetingMobileEffectiveAction;
      if (action === "back") {
        mainRequestsTab?.click();
        window.scrollTo({ top: previousScrollY, behavior: "smooth" });
      } else if (action.startsWith("holiday-")) {
        const targets = {
          "holiday-prev": "meetingHolidayCalendarPrev",
          "holiday-today": "meetingHolidayCalendarToday",
          "holiday-next": "meetingHolidayCalendarNext",
          "holiday-add": "meetingHolidayAddOpenBtn"
        };
        document.getElementById(targets[action])?.click();
        if (action !== "holiday-add") scrollToPanel(section.querySelector(".meeting-room-holiday-panel"));
      } else if (action === "requests") {
        previousView = "requests";
        closeFilterSheet();
        mainRequestsTab?.click();
        requestsTab?.click();
        scrollToPanel(listPanel);
      } else if (action === "history") {
        previousView = "history";
        closeFilterSheet();
        mainRequestsTab?.click();
        historyTab?.click();
        scrollToPanel(listPanel);
      } else if (action === "calendar") {
        previousView = "calendar";
        closeFilterSheet();
        mainRequestsTab?.click();
        scrollToPanel(calendarPanel);
      } else if (action === "filters") {
        mainRequestsTab?.click();
        openFilterSheet();
      } else if (action === "settings") {
        closeFilterSheet();
        mainSettingsTab?.click();
        window.setTimeout(() => scrollToPanel(section), 0);
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

  [requestsTab, historyTab, startDateFilter, endDateFilter, roomFilter, statusFilter, searchFilter].forEach((el) => {
    if (!el) return;
    el.addEventListener("click", () => window.setTimeout(sync, 0));
    el.addEventListener("input", () => window.setTimeout(sync, 0));
    el.addEventListener("change", () => window.setTimeout(sync, 0));
  });

  window.syncMeetingRoomMobileActionBar = sync;
  sync();
}

