function initDirectoryMobileActionBar() {
  const section = document.querySelector('section[data-page="staff-directory-staff"]');
  const bar = document.querySelector(".mobile-directory-action-bar");
  const filters = section?.querySelector(".org-directory-filters");
  if (!section || !bar || !filters) return;
  const mobile = window.matchMedia("(max-width: 840px)");
  const sheet = document.createElement("dialog");
  sheet.className = "mobile-filter-dialog directory-mobile-filter-dialog";
  sheet.setAttribute("aria-labelledby", "directoryMobileFilterTitle");
  sheet.innerHTML = `
    <header class="mobile-filter-header">
      <div>
        <h2 id="directoryMobileFilterTitle" class="mobile-filter-title">ตัวกรอง</h2>
        <p class="mobile-filter-caption">ปรับเงื่อนไขการแสดงผลของทำเนียบรุ่น</p>
      </div>
      <button type="button" class="mobile-filter-close" aria-label="ปิดตัวกรอง">×</button>
    </header>
    <div class="mobile-filter-body"></div>
    <footer class="mobile-filter-footer">
      <button type="button" class="btn-ghost">ล้างตัวกรอง</button>
      <button type="button" class="btn-primary">เสร็จ</button>
    </footer>`;
  document.body.appendChild(sheet);
  let placeholder = null;
  const filterButton = bar.querySelector('[data-directory-mobile-action="filters"]');
  filterButton.setAttribute("aria-haspopup", "dialog");
  filterButton.setAttribute("aria-expanded", "false");
  const syncCount = () => {
    const count = Array.from(filters.querySelectorAll("select, input"))
      .filter((control) => control.value.trim() && control.value !== "all").length;
    filterButton.classList.toggle("has-active-filters", count > 0);
    filterButton.dataset.filterCount = count ? String(count) : "";
    filterButton.setAttribute("aria-label", count ? `ตัวกรอง (${count} รายการใช้งานอยู่)` : "ตัวกรอง");
  };
  const closeFilters = () => {
    if (!sheet.open) return;
    sheet.close();
    if (placeholder) {
      placeholder.replaceWith(filters);
      placeholder = null;
    }
    filters.removeAttribute("data-mobile-filter-mounted");
    document.body.classList.remove("directory-filter-open");
    filterButton.setAttribute("aria-expanded", "false");
    syncCount();
  };
  const openFilters = () => {
    if (sheet.open || !mobile.matches) return;
    placeholder = document.createComment("directory-filters");
    filters.before(placeholder);
    sheet.querySelector(".mobile-filter-body").appendChild(filters);
    filters.setAttribute("data-mobile-filter-mounted", "true");
    sheet.showModal();
    document.body.classList.add("directory-filter-open");
    filterButton.setAttribute("aria-expanded", "true");
  };
  const sync = () => {
    const active = section.classList.contains("active");
    bar.classList.toggle("is-visible", active);
    document.body.classList.toggle("has-mobile-directory-actions", active);
    if (!active || !mobile.matches) closeFilters();
    syncCount();
  };
  sheet.querySelector(".mobile-filter-close").addEventListener("click", closeFilters);
  sheet.querySelector(".btn-primary").addEventListener("click", closeFilters);
  sheet.querySelector(".btn-ghost").addEventListener("click", () => {
    document.getElementById("orgStructureFilterReset")?.click();
    syncCount();
  });
  sheet.addEventListener("cancel", (event) => { event.preventDefault(); closeFilters(); });
  sheet.addEventListener("click", (event) => {
    if (event.target !== sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) closeFilters();
  });
  bar.addEventListener("click", (event) => {
    const action = event.target.closest("[data-directory-mobile-action]")?.dataset.directoryMobileAction;
    const targets = { add: "orgStructureAddBtn", refresh: "orgStructureRefreshBtn", export: "orgStructureExportBtn" };
    if (targets[action]) document.getElementById(targets[action])?.click();
    if (action === "filters") openFilters();
  });
  filters.addEventListener("input", syncCount);
  filters.addEventListener("change", syncCount);
  new MutationObserver(sync).observe(section, { attributes: true, attributeFilter: ["class"] });
  mobile.addEventListener("change", sync);
  sync();
}

