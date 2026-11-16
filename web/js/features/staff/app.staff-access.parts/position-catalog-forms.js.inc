  const buildListenerErrorText = (contextLabel, error) => {
    const code = (error?.code || "unknown").toString();
    if (code === "permission-denied") {
      return `${contextLabel}: ไม่มีสิทธิ์อ่านข้อมูล (permission-denied)`;
    }
    if (code === "unauthenticated") {
      return `${contextLabel}: เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่`;
    }
    return `${contextLabel}: โหลดไม่สำเร็จ (${code})`;
  };

  const buildActionErrorText = (contextLabel, error, extra = "") => {
    const code = (error?.code || "unknown").toString();
    const message = (error?.message || "").toString().trim();
    const suffix = extra ? ` | ${extra}` : "";
    if (message) return `${contextLabel}: ${code} - ${message}${suffix}`;
    return `${contextLabel}: ${code}${suffix}`;
  };

  const setAppFormEnabled = (enabled) => {
    const disabled = !enabled;
    [appPositionEl, appDivisionEl, appLevelEl, appSubmitEl].forEach((el) => {
      if (el) el.disabled = disabled;
    });
  };

  const setPositionManageEnabled = (enabled) => {
    const disabled = !enabled;
    if (positionManageInputEl) positionManageInputEl.disabled = disabled;
    if (positionDivisionCodeEl) positionDivisionCodeEl.disabled = disabled;
    if (positionDivisionNameEl) positionDivisionNameEl.disabled = disabled;
    if (positionLevelCodeEl) positionLevelCodeEl.disabled = disabled;
    if (positionManageSubmitBtnEl) positionManageSubmitBtnEl.disabled = disabled;
    if (positionManageDeleteBtnEl) positionManageDeleteBtnEl.disabled = disabled;
    if (positionManageCancelBtnEl) positionManageCancelBtnEl.disabled = disabled;
    if (positionAllowedPagesEl) {
      positionAllowedPagesEl.querySelectorAll(".staff-position-page-checkbox").forEach((input) => {
        if (input instanceof HTMLInputElement) input.disabled = disabled;
      });
    }
  };

  const readLoginProfiles = () => {
    try {
      const rawPrimary = window.localStorage?.getItem(LOGIN_PROFILE_STORAGE_KEY);
      const rawLegacy = window.localStorage?.getItem(LEGACY_LOGIN_PROFILE_STORAGE_KEY);
      const raw = rawPrimary || rawLegacy;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const profiles = parsed && typeof parsed === "object" ? parsed : {};
      return Object.entries(profiles).reduce((acc, [key, value]) => {
        const canonicalKey = normalizeAccountEmail(key);
        if (!canonicalKey) return acc;
        acc[canonicalKey] = {
          ...(acc[canonicalKey] || {}),
          ...(value && typeof value === "object" ? value : {})
        };
        return acc;
      }, {});
    } catch (_) {
      return {};
    }
  };

  const sortByTimestampDesc = (items, key = "createdAt") => {
    return [...items].sort((a, b) => {
      const aTime = typeof a?.[key]?.toMillis === "function"
        ? a[key].toMillis()
        : new Date(a?.[key] || 0).getTime();
      const bTime = typeof b?.[key]?.toMillis === "function"
        ? b[key].toMillis()
        : new Date(b?.[key] || 0).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  };

  const normalizeApplicationStatus = (value) => {
    const status = (value || "").toString().trim().toLowerCase();
    if (status === "approved" || status === "rejected" || status === "pending") return status;
    return "pending";
  };

  const isStaffApplicationRecord = (item = {}) => {
    const requestType = (item.requestType || "staff_application").toString().trim();
    return !requestType || requestType === "staff_application";
  };

  const sortPositionCatalogItems = (items = []) =>
    [...items].sort((a, b) => {
      const yyCompare = normalizeCode2(a.divisionCodeYY).localeCompare(normalizeCode2(b.divisionCodeYY));
      if (yyCompare !== 0) return yyCompare;
      const zzCompare = normalizeCode2(a.levelCodeZZ).localeCompare(normalizeCode2(b.levelCodeZZ));
      if (zzCompare !== 0) return zzCompare;
      return normalizePositionText(a.name).localeCompare(normalizePositionText(b.name), "th");
    });

  const refreshSummaryCounts = () => {
    if (staffApprovalPendingCountEl) {
      staffApprovalPendingCountEl.textContent = String(currentPendingApplications.length);
    }
    if (staffApprovalApprovedCountEl) {
      staffApprovalApprovedCountEl.textContent = String(currentApprovedHistory.length);
    }
    if (staffApprovalPositionCountEl) {
      staffApprovalPositionCountEl.textContent = String(currentPositionCatalog.length);
    }
  };

  const renderPositionDatalist = () => {
    if (positionOptionsDatalistEl) {
      positionOptionsDatalistEl.innerHTML = currentPositionCatalog
        .map((item) => `<option value="${toSafeText(item.name)}"></option>`)
        .join("");
    }
    const divisions = Array.from(
      new Map(
        currentPositionCatalog
          .map((item) => {
            const code = normalizeCode2(item.divisionCodeYY || item.yy || "");
            if (!code) return null;
            return [code, divisionCodeLabel(code)];
          })
          .filter(Boolean)
      ).entries()
    ).sort((a, b) => a[0].localeCompare(b[0]));
    if (divisionCodeOptionsDatalistEl) {
      divisionCodeOptionsDatalistEl.innerHTML = divisions
        .map(([code, label]) => `<option value="${toSafeText(code)}">${toSafeText(label)}</option>`)
        .join("");
    }
    if (divisionNameOptionsDatalistEl) {
      divisionNameOptionsDatalistEl.innerHTML = divisions
        .map(([, label]) => `<option value="${toSafeText(label)}"></option>`)
        .join("");
    }
  };

  const renderPositionAllowedPageOptions = (selectedPages = [], fallbackYY = "") => {
    if (!positionAllowedPagesEl) return;
    const selected = new Set(normalizeAllowedPages(selectedPages, fallbackYY));
    const allSelected = STAFF_PAGE_OPTIONS.every((item) => selected.has(item.id));
    positionAllowedPagesEl.innerHTML = [
      `
        <label class="staff-position-page-option staff-position-page-option-all">
          <input
            type="checkbox"
            class="staff-position-page-checkbox staff-position-page-checkbox-all"
            data-role="all-page-checkbox"
            ${allSelected ? "checked" : ""}
          />
          <span>แสดงทุกหน้า</span>
        </label>
      `,
      ...STAFF_PAGE_OPTIONS
      .map((item) => `
        <label class="staff-position-page-option">
          <input
            type="checkbox"
            class="staff-position-page-checkbox"
            data-role="page-checkbox"
            value="${toSafeText(item.id)}"
            ${selected.has(item.id) ? "checked" : ""}
          />
          <span>${toSafeText(item.label)}</span>
        </label>
      `)
    ]
      .join("");
  };

  const updateManageResolvedPositionName = () => {
    if (!positionManageInputEl) return;
    const divisionCodeYY = normalizeCode2(positionDivisionCodeEl?.value || "");
    const existingDivision = currentPositionCatalog.find((item) => normalizeCode2(item.divisionCodeYY || "") === divisionCodeYY);
    const divisionLabel = normalizePositionText(
      positionDivisionNameEl?.value ||
      existingDivision?.divisionLabel ||
      existingDivision?.divisionName ||
      ""
    );
    const levelCodeZZ = normalizeCode2(positionLevelCodeEl?.value || "");
    positionManageInputEl.value = buildPositionNameFromParts(divisionCodeYY, levelCodeZZ, divisionLabel);
    window.dispatchEvent(new Event("sgcu:position-form-sync"));
  };

  const syncPositionManageModeUi = () => {
    const isEditing = Boolean(currentEditingPositionId);
    if (positionManageSubmitBtnEl) {
      positionManageSubmitBtnEl.textContent = isEditing ? "บันทึกตำแหน่ง" : "ปรับตำแหน่ง";
    }
    if (positionManageDeleteBtnEl) {
      positionManageDeleteBtnEl.hidden = !isEditing;
    }
    if (positionManageCancelBtnEl) {
      positionManageCancelBtnEl.hidden = !isEditing;
    }
  };

  const resetPositionManageForm = ({ message = "" } = {}) => {
    currentEditingPositionId = "";
    if (positionManageInputEl) positionManageInputEl.value = "";
    if (positionDivisionCodeEl) positionDivisionCodeEl.value = "";
    if (positionDivisionNameEl) positionDivisionNameEl.value = "";
    if (positionLevelCodeEl) positionLevelCodeEl.value = "";
    updateManageResolvedPositionName();
    renderPositionAllowedPageOptions([], "");
    syncPositionManageModeUi();
    renderPositionCatalog();
    if (message) setMessage(positionManageMessageEl, message, "#6b7280");
  };

  const loadPositionIntoManageForm = (positionId = "") => {
    if (!isSuperStaff()) return;
    const safeId = (positionId || "").toString().trim();
    const target = currentPositionCatalog.find((item) => item.id === safeId);
    if (!target) return;

    currentEditingPositionId = safeId;
    const yy = normalizeCode2(target.divisionCodeYY || target.yy || "");
    const zz = normalizeCode2(target.levelCodeZZ || target.zz || "");
    const divisionLabel = normalizePositionText(target.divisionLabel || target.divisionName || divisionCodeLabel(yy));
    if (positionDivisionCodeEl) positionDivisionCodeEl.value = yy;
    if (positionDivisionNameEl) positionDivisionNameEl.value = divisionLabel;
    if (positionLevelCodeEl) positionLevelCodeEl.value = zz;
    updateManageResolvedPositionName();
    renderPositionAllowedPageOptions(getConfiguredAllowedPagesForCatalogPosition(target), yy);
    syncPositionManageModeUi();
    renderPositionCatalog();
    positionManagePanelEl?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    setMessage(positionManageMessageEl, "กำลังแก้ไขตำแหน่งที่เลือก กดบันทึกตำแหน่งเพื่ออัปเดต", "#1d4ed8");
  };

  const readSelectedPositionAllowedPages = () => {
    if (!positionAllowedPagesEl) return [];
    return Array.from(positionAllowedPagesEl.querySelectorAll(".staff-position-page-checkbox:checked"))
      .map((input) => (input instanceof HTMLInputElement ? input.value : ""))
      .filter(Boolean);
  };

  const syncAllPagesCheckbox = (container, prefix = "") => {
    if (!(container instanceof Element)) return;
    const pageSelector = prefix
      ? `[data-role="${prefix}-page-checkbox"]`
      : '[data-role="page-checkbox"]';
    const allSelector = prefix
      ? `[data-role="${prefix}-all-page-checkbox"]`
      : '[data-role="all-page-checkbox"]';
    const pages = Array.from(container.querySelectorAll(pageSelector))
      .filter((input) => input instanceof HTMLInputElement);
    const allInput = container.querySelector(allSelector);
    if (!(allInput instanceof HTMLInputElement)) return;
    allInput.checked = pages.length > 0 && pages.every((input) => input.checked);
    allInput.indeterminate = pages.some((input) => input.checked) && !allInput.checked;
  };

  const handleAllowedPagesToggle = (event, container, prefix = "") => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const allRole = prefix ? `${prefix}-all-page-checkbox` : "all-page-checkbox";
    const pageRole = prefix ? `${prefix}-page-checkbox` : "page-checkbox";
    if (target.dataset.role === allRole) {
      const pageSelector = prefix
        ? `[data-role="${prefix}-page-checkbox"]`
        : '[data-role="page-checkbox"]';
      container.querySelectorAll(pageSelector).forEach((input) => {
        if (input instanceof HTMLInputElement) input.checked = target.checked;
      });
      target.indeterminate = false;
      return;
    }
    if (target.dataset.role === pageRole) {
      syncAllPagesCheckbox(container, prefix);
    }
  };

  const renderAllowedPageBadges = (allowedPages = []) => {
    const pages = new Set(normalizeConfiguredAllowedPages(allowedPages));
    const orderedPages = STAFF_PAGE_OPTIONS.map((item) => item.id)
      .filter((page) => pages.has(page));
    if (!orderedPages.length) return '<span class="staff-position-page-badge is-summary">ไม่มีหน้าฝั่ง Staff</span>';
    const hasAllSelectableStaffPages = STAFF_PAGE_OPTIONS.every((item) => pages.has(item.id));
    if (hasAllSelectableStaffPages) {
      return `<span class="staff-position-page-badge is-summary">ทุกหน้าฝั่ง Staff (${toSafeText(STAFF_PAGE_OPTIONS.length)} หน้า)</span>`;
    }
    const visiblePages = orderedPages.slice(0, 3);
    const hiddenCount = orderedPages.length - visiblePages.length;
    return [
      ...visiblePages.map((page) => `<span class="staff-position-page-badge">${toSafeText(getStaffPageLabel(page))}</span>`),
      hiddenCount > 0 ? `<span class="staff-position-page-badge is-summary">+${toSafeText(hiddenCount)}</span>` : ""
    ].join("");
  };

  const renderApplicationPositionSelect = () => {
    const currentUserEmail = getCurrentAuthEmail();
    const currentAccountEmail = normalizeAccountEmail(currentUserEmail);
    const localProfile = currentAccountEmail ? (readLoginProfiles()[currentAccountEmail] || {}) : {};
    const profileType = ((localProfile.profileType || window.currentUserProfileType || "student").toString().trim().toLowerCase() === "affairs")
      ? "affairs"
      : "student";

    if (appProfileHintEl) {
      appProfileHintEl.textContent = profileType === "affairs"
        ? "ระบบกำหนดตำแหน่งสมัครได้เพียงรายการเดียวตามประเภทบัญชีผู้ใช้"
        : "เลือกหมวดงานก่อน แล้วค่อยเลือกระดับตำแหน่ง";
    }
    if (appDivisionLabelEl) {
      appDivisionLabelEl.textContent = profileType === "affairs" ? "หมวดงาน" : "ฝ่าย / หมวดงาน";
    }
    if (appLevelLabelEl) {
      appLevelLabelEl.textContent = profileType === "affairs" ? "ระดับตำแหน่ง" : "ตำแหน่ง";
    }

    if (appStudentFieldsEl) appStudentFieldsEl.hidden = false;

    if (profileType === "affairs") {
      const affairsPosition = currentPositionCatalog.find((item) => normalizeCode2(item.divisionCodeYY) === "09")
        || DEFAULT_POSITION_OPTIONS.find((item) => normalizeCode2(item.divisionCodeYY) === "09")
        || null;
      const positionName = normalizePositionText(affairsPosition?.name || "เจ้าหน้าที่สำนักบริหารกิจการนิสิต");
      if (appResolvedPositionEl) appResolvedPositionEl.value = positionName;
      if (appPositionEl) appPositionEl.value = positionName;
      if (appDivisionEl) {
        appDivisionEl.innerHTML = '<option value="09" selected>เจ้าหน้าที่สำนักบริหารกิจการนิสิต</option>';
        appDivisionEl.value = "09";
      }
      if (appLevelEl) {
        appLevelEl.innerHTML = '<option value="04" selected>เจ้าหน้าที่</option>';
        appLevelEl.value = "04";
      }
      return;
    }

    const currentDivision = normalizeCode2(appDivisionEl?.value || "");
    const currentLevel = normalizeCode2(appLevelEl?.value || "");
    const studentPositions = currentPositionCatalog.filter((item) => normalizeCode2(item.divisionCodeYY) !== "09");
    const divisionList = Array.from(
      new Map(
        studentPositions.map((item) => [normalizeCode2(item.divisionCodeYY), item])
      ).values()
    ).sort((a, b) => normalizeCode2(a.divisionCodeYY).localeCompare(normalizeCode2(b.divisionCodeYY)));

    if (appDivisionEl) {
      appDivisionEl.innerHTML = [
        '<option value="" selected disabled>เลือกฝ่ายใหญ่</option>',
        ...divisionList.map((item) => {
          const yy = normalizeCode2(item.divisionCodeYY);
          return `<option value="${toSafeText(yy)}">${toSafeText(divisionCodeLabel(yy))}</option>`;
        })
      ].join("");
      if (divisionList.some((item) => normalizeCode2(item.divisionCodeYY) === currentDivision)) {
        appDivisionEl.value = currentDivision;
      }
    }

    const activeDivision = normalizeCode2(appDivisionEl?.value || "");
    const levelList = studentPositions.filter((item) => normalizeCode2(item.divisionCodeYY) === activeDivision);
    const uniqueLevels = Array.from(
      new Map(
        levelList.map((item) => [normalizeCode2(item.levelCodeZZ), item])
      ).values()
    ).sort((a, b) => normalizeCode2(a.levelCodeZZ).localeCompare(normalizeCode2(b.levelCodeZZ)));

    if (appLevelEl) {
      appLevelEl.innerHTML = [
        '<option value="" selected disabled>เลือกระดับตำแหน่ง</option>',
        ...uniqueLevels.map((item) => {
          const zz = normalizeCode2(item.levelCodeZZ);
          return `<option value="${toSafeText(zz)}">${toSafeText(levelCodeLabel(zz))}</option>`;
        })
      ].join("");
      if (uniqueLevels.some((item) => normalizeCode2(item.levelCodeZZ) === currentLevel)) {
        appLevelEl.value = currentLevel;
      }
    }

    const activeLevel = normalizeCode2(appLevelEl?.value || "");
    const resolvedPosition = levelList.find((item) => normalizeCode2(item.levelCodeZZ) === activeLevel) || null;
    const resolvedName = normalizePositionText(resolvedPosition?.name || "");
    if (appResolvedPositionEl) {
      appResolvedPositionEl.value = resolvedName || "";
    }
    if (appPositionEl) {
      appPositionEl.value = resolvedName || "";
    }
  };

  const renderPositionCatalog = () => {
    if (!positionListEl) return;

    if (!currentPositionCatalog.length) {
      const emptyText = positionCatalogLoadState === "loading"
        ? "กำลังโหลดรายการตำแหน่งจาก Firebase..."
        : positionCatalogLoadState === "signed-out"
          ? "กรุณาเข้าสู่ระบบเพื่อโหลดรายการตำแหน่งจาก Firebase"
          : positionCatalogLoadState === "error"
            ? "โหลดรายการตำแหน่งจาก Firebase ไม่สำเร็จ"
            : "ยังไม่มีรายการตำแหน่งใน Firebase";
      positionListEl.innerHTML = `<div class="section-text-sm">${toSafeText(emptyText)}</div>`;
      refreshSummaryCounts();
      return;
    }

    const allowManage = isSuperStaff();
    syncPositionManageModeUi();
    positionListEl.innerHTML = currentPositionCatalog
      .map((item) => {
        const yy = normalizeCode2(item.divisionCodeYY || "00");
        const zz = normalizeCode2(item.levelCodeZZ || "00");
        const divisionLabel = normalizePositionText(item.divisionLabel || item.divisionName || divisionCodeLabel(yy));
        const generatedName = buildPositionNameFromParts(yy, zz, divisionLabel) || item.name;
        const configuredAllowedPages = getConfiguredAllowedPagesForCatalogPosition(item);
        const isEditing = allowManage && currentEditingPositionId === item.id;
        return `
          <div
            class="staff-position-chip${isEditing ? " is-editing" : ""}${allowManage ? " is-selectable" : ""}"
            data-division-code="${yy}"
            data-division-name="${toSafeText(divisionLabel)}"
            data-level-code="${zz}"
            data-page-count="${configuredAllowedPages.length}"
            data-select-position-id="${toSafeText(item.id)}"
            role="${allowManage ? "button" : "group"}"
            tabindex="${allowManage ? "0" : "-1"}"
            aria-label="${allowManage ? `แก้ไขตำแหน่ง ${toSafeText(generatedName)}` : toSafeText(generatedName)}"
          >
            <div class="staff-position-chip-main">
              <div class="staff-position-chip-summary">
                <span class="staff-position-chip-name">${toSafeText(generatedName)}</span>
              </div>
              <div class="staff-position-chip-pages">
                ${renderAllowedPageBadges(configuredAllowedPages)}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    refreshSummaryCounts();
  };

