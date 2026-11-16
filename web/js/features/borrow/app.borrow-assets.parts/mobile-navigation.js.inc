  const isStaffBorrowMobile = () =>
    !window.matchMedia || window.matchMedia("(max-width: 840px)").matches;
  const isStaffBorrowRequestsMainTabActive = () =>
    Array.from(staffMainTabBtns).some(
      (btn) => (btn.dataset.assetsStaffMainTab || "requests") === "requests" && btn.classList.contains("is-active")
    );
  const isStaffBorrowInventoryMainTabActive = () =>
    Array.from(staffMainTabBtns).some(
      (btn) => btn.dataset.assetsStaffMainTab === "inventory" && btn.classList.contains("is-active")
    );
  const closeStaffBorrowFilterSheet = () => {
    if (staffBorrowFilterFieldsPlaceholder && staffBorrowRequestFilterFields) {
      staffBorrowFilterFieldsPlaceholder.parentNode?.insertBefore(
        staffBorrowRequestFilterFields,
        staffBorrowFilterFieldsPlaceholder
      );
      staffBorrowFilterFieldsPlaceholder.remove();
      staffBorrowFilterFieldsPlaceholder = null;
      staffBorrowRequestFilterFields.removeAttribute("data-mobile-filter-mounted");
      staffBorrowRequestFilterFields.style.removeProperty("display");
    }
    staffBorrowFilterSheet.classList.remove("is-open");
    staffBorrowFilterSheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-filter-open");
  };
  const openStaffBorrowFilterSheet = () => {
    if (!staffBorrowRequestFilterFields || !staffBorrowFilterSheetBody) return;
    if (!isStaffBorrowMobile()) {
      staffBorrowRequestFiltersBar?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    closeStaffBorrowFilterSheet();
    staffBorrowFilterFieldsPlaceholder = document.createComment("borrow-mobile-filter-placeholder");
    staffBorrowRequestFilterFields.parentNode?.insertBefore(
      staffBorrowFilterFieldsPlaceholder,
      staffBorrowRequestFilterFields
    );
    staffBorrowRequestFilterFields.setAttribute("data-mobile-filter-mounted", "true");
    staffBorrowFilterSheetBody.appendChild(staffBorrowRequestFilterFields);
    staffBorrowRequestFilterFields.style.display = "grid";
    staffBorrowFilterSheet.classList.add("is-open");
    staffBorrowFilterSheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-filter-open");
    window.setTimeout(() => {
      const firstControl = staffBorrowRequestFilterFields.querySelector("select, input, textarea, button");
      firstControl?.focus?.({ preventScroll: true });
    }, 260);
  };
  const syncStaffBorrowMobileActionBar = () => {
    const activePage = document.querySelector(".page-view.active")?.dataset.page || "";
    if (activePage !== "borrow-assets-staff" && staffBorrowFilterSheet.classList.contains("is-open")) {
      closeStaffBorrowFilterSheet();
    }
    const shouldShow = activePage === "borrow-assets-staff";
    staffBorrowMobileActionBar?.classList.toggle("is-visible", shouldShow);
    if (activePage === "borrow-assets-staff") {
      document.body.classList.toggle("has-mobile-context-actions", shouldShow);
    }
    const filterOpen = staffBorrowFilterSheet.classList.contains("is-open");
    staffBorrowMobileActionBtns.forEach((btn) => {
      const action = btn.dataset.borrowMobileAction;
      btn.classList.toggle(
        "is-active",
        (action === "queue" && isStaffBorrowRequestsMainTabActive() && staffRequestTabMode !== "history" && !filterOpen) ||
          (action === "history" && isStaffBorrowRequestsMainTabActive() && staffRequestTabMode === "history" && !filterOpen) ||
          (action === "inventory" && isStaffBorrowInventoryMainTabActive() && !filterOpen) ||
          (action === "settings" && staffBorrowSettings?.style.display === "block" && !filterOpen) ||
          (action === "filters" && filterOpen)
      );
    });
    updateStaffBorrowMobileFilterToggle();
  };
  const setStaffBorrowMobileFilterOpen = (isOpen) => {
    if (isOpen) {
      openStaffBorrowFilterSheet();
    } else {
      closeStaffBorrowFilterSheet();
    }
    staffBorrowMobileFilterBtn?.setAttribute("aria-expanded", isOpen ? "true" : "false");
    syncStaffBorrowMobileActionBar();
  };
  const scrollToStaffBorrowRequests = (target = staffBorrowQueue) => {
    if (!isStaffBorrowMobile()) return;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const setStaffBorrowMainTab = (tabName) => {
    const activeTab = ["inventory", "settings"].includes(tabName) ? tabName : "requests";
    if (activeTab !== "requests") {
      setStaffBorrowMobileFilterOpen(false);
    }
    if (staffBorrowQueue) {
      const showRequests = activeTab === "requests";
      staffBorrowQueue.style.display = showRequests ? "block" : "none";
      staffBorrowQueue.classList.toggle("section-visible", showRequests);
    }
    if (staffBorrowInventory) {
      const showInventory = activeTab === "inventory";
      staffBorrowInventory.style.display = showInventory ? "block" : "none";
      staffBorrowInventory.classList.toggle("section-visible", showInventory);
    }
    if (staffBorrowSettings) {
      const showSettings = activeTab === "settings";
      staffBorrowSettings.style.display = showSettings ? "block" : "none";
      staffBorrowSettings.classList.toggle("section-visible", showSettings);
    }
    staffMainTabBtns.forEach((btn) => {
      const matched = (btn.dataset.assetsStaffMainTab || "requests") === activeTab;
      btn.classList.toggle("is-active", matched);
      btn.setAttribute("aria-selected", matched ? "true" : "false");
    });
    if (activeTab === "inventory") {
      if (borrowAssetsRows.length) {
        applyBorrowAssetsFilters();
      } else {
        void loadBorrowAssets();
      }
    } else if (activeTab === "requests") {
      renderBorrowRequests();
    }
    syncStaffBorrowMobileActionBar();
  };
  if (staffMainTabBtns.length && staffBorrowQueue && staffBorrowInventory) {
    setStaffBorrowMainTab("requests");
    staffMainTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        setStaffBorrowMainTab(btn.dataset.assetsStaffMainTab || "requests");
      });
    });
  }
  if (staffTabBtns.length && staffBorrowQueue && staffBorrowHistory) {
    staffBorrowHistory.style.display = "none";
    staffBorrowHistory.classList.remove("section-visible");
    staffBorrowQueue.style.display = "block";
    staffBorrowQueue.classList.add("section-visible");
    staffTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.assetsStaffTab;
        staffRequestTabMode = target === "history" ? "history" : "queue";
        staffTabBtns.forEach((b) => {
          const matched = (b.dataset.assetsStaffTab || "") === target;
          b.classList.toggle("is-active", matched);
        });
        setStaffRequestPanelMeta();
        renderBorrowRequests();
        setStaffBorrowMobileFilterOpen(false);
        syncStaffBorrowMobileActionBar();
      });
    });
  }
  staffBorrowMobileActionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.borrowMobileAction;
      if (action === "queue") {
        setStaffBorrowMobileFilterOpen(false);
        document.querySelector('[data-assets-staff-main-tab="requests"]')?.click();
        document.querySelector('[data-assets-staff-tab="queue"]')?.click();
        scrollToStaffBorrowRequests(staffBorrowQueue);
      } else if (action === "history") {
        setStaffBorrowMobileFilterOpen(false);
        document.querySelector('[data-assets-staff-main-tab="requests"]')?.click();
        document.querySelector('[data-assets-staff-tab="history"]')?.click();
        scrollToStaffBorrowRequests(staffBorrowQueue);
      } else if (action === "inventory") {
        setStaffBorrowMobileFilterOpen(false);
        document.querySelector('[data-assets-staff-main-tab="inventory"]')?.click();
        scrollToStaffBorrowRequests(staffBorrowInventory);
      } else if (action === "settings") {
        setStaffBorrowMobileFilterOpen(false);
        document.querySelector('[data-assets-staff-main-tab="settings"]')?.click();
        scrollToStaffBorrowRequests(staffBorrowSettings);
      } else if (action === "filters") {
        if (!isStaffBorrowRequestsMainTabActive()) {
          document.querySelector('[data-assets-staff-main-tab="requests"]')?.click();
        }
        const isOpen = !staffBorrowFilterSheet.classList.contains("is-open");
        setStaffBorrowMobileFilterOpen(isOpen);
      }
      window.setTimeout(syncStaffBorrowMobileActionBar, 0);
    });
  });
  staffBorrowFilterSheet.querySelectorAll("[data-borrow-filter-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setStaffBorrowMobileFilterOpen(false);
    });
  });
  staffBorrowFilterSheetDoneBtn?.addEventListener("click", () => {
    setStaffBorrowMobileFilterOpen(false);
  });
  staffBorrowFilterSheetResetBtn?.addEventListener("click", () => {
    clearStaffBorrowAdvancedFilters();
    window.setTimeout(syncStaffBorrowMobileActionBar, 0);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && staffBorrowFilterSheet.classList.contains("is-open")) {
      setStaffBorrowMobileFilterOpen(false);
    }
  });
  const staffBorrowMobileActionObserver = new MutationObserver(syncStaffBorrowMobileActionBar);
  document.querySelectorAll(".page-view").forEach((pageEl) => {
    staffBorrowMobileActionObserver.observe(pageEl, { attributes: true, attributeFilter: ["class"] });
  });
  syncStaffBorrowMobileActionBar();

  staffRequestPagerEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.borrowPageAction;
    if (action !== "prev" && action !== "next") return;
    const current = staffRequestPageByMode[staffRequestTabMode] || 1;
    staffRequestPageByMode[staffRequestTabMode] = action === "next"
      ? current + 1
      : Math.max(1, current - 1);
    renderBorrowRequests();
  });

