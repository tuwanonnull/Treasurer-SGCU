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
      getStaffProjectTrackingFilters().monthFrom || getStaffProjectTrackingFilters().monthTo ? "ช่วงเดือน" : "",
      getStaffProjectTrackingFilters().orgs.length ? "ฝ่ายที่เปรียบเทียบ" : "",
      getStaffProjectTrackingFilters().status !== "all" ? getSelectedText("projectStatusFilterStaff") : "",
      getStaffProjectTrackingFilters().advance !== "all" ? getSelectedText("projectAdvanceFilterStaff") : "",
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
    if (window.sgcuScrollToStaffProjectSection) {
      window.sgcuScrollToStaffProjectSection(target);
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

  sheet.addEventListener("change", sync);
  sheet.addEventListener("input", sync);
  section.addEventListener("change", sync);
  section.addEventListener("input", sync);
  document.querySelectorAll(".page-view").forEach((pageEl) => {
    const pageObserver = new MutationObserver(sync);
    pageObserver.observe(pageEl, { attributes: true, attributeFilter: ["class"] });
  });

  window.syncDashboardMobileActionBar = sync;
  sync();
}

