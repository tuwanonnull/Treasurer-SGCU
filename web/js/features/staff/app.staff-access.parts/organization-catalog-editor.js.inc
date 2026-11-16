  const syncOrganizationCatalogGroupOptions = (rows = getOrganizationCatalogRows()) => {
    const groups = Array.from(new Set([
      ...Array.from(ORGANIZATION_CATALOG_CODE_PREFIX_BY_GROUP.keys()),
      ...rows.map((item) => item.group).filter(Boolean)
    ]))
      .sort((a, b) => b.localeCompare(a, "th"));
    if (organizationCatalogFields.group?.tagName === "SELECT") {
      const currentValue = normalizeOrganizationCatalogText(organizationCatalogFields.group.value);
      organizationCatalogFields.group.innerHTML = [
        '<option value="">เลือกประเภทองค์กร</option>',
        ...groups.map((group) => `<option value="${toSafeText(group)}">${toSafeText(group)}</option>`)
      ].join("");
      organizationCatalogFields.group.value = groups.includes(currentValue) ? currentValue : "";
    }
    if (organizationCatalogGroupFilterEl) {
      const currentValue = organizationCatalogFilters.group || "all";
      organizationCatalogGroupFilterEl.innerHTML = [
        '<option value="all">ทุกประเภทองค์กร</option>',
        ...groups.map((group) => `<option value="${toSafeText(group)}">${toSafeText(group)}</option>`)
      ].join("");
      organizationCatalogGroupFilterEl.value = groups.includes(currentValue) ? currentValue : "all";
      organizationCatalogFilters.group = organizationCatalogGroupFilterEl.value || "all";
    }
  };

  const renderOrganizationCatalogTable = () => {
    if (!organizationCatalogTableBodyEl && !organizationCatalogTableCaptionEl) return;
    const rows = getOrganizationCatalogRows();
    syncOrganizationCatalogGroupOptions(rows);
    const groupCount = new Set(rows.map((item) => item.group).filter(Boolean)).size;
    const query = normalizeOrganizationCatalogText(organizationCatalogFilters.query).toLowerCase();
    const filteredRows = rows.filter((item) => {
      if (organizationCatalogFilters.group !== "all" && item.group !== organizationCatalogFilters.group) {
        return false;
      }
      const hasAccount = Boolean(normalizeOrganizationCatalogText(item.accountNo));
      if (organizationCatalogFilters.account === "with" && !hasAccount) return false;
      if (organizationCatalogFilters.account === "without" && hasAccount) return false;
      if (!query) return true;
      return [
        item.group,
        item.name,
        ...Object.values(item.nameByAcademicYear || {}),
        item.code,
        item.documentRunCode,
        ...Object.values(item.documentRunCodeByAcademicYear || {}),
        formatOrganizationCatalogDocumentRunCode(item.documentRunCode, item.group),
        item.accountNo
      ].some((value) => normalizeOrganizationCatalogText(value).toLowerCase().includes(query));
    });
    const visibleLimit = Math.max(ORGANIZATION_CATALOG_PAGE_SIZE, organizationCatalogFilters.visibleLimit || ORGANIZATION_CATALOG_PAGE_SIZE);
    const visibleRows = filteredRows.slice(0, visibleLimit);
    const selectedId = normalizeOrganizationCatalogText(organizationCatalogFields.id?.value);
    if (organizationCatalogTotalCountEl) organizationCatalogTotalCountEl.textContent = rows.length.toLocaleString("th-TH");
    if (organizationCatalogGroupCountEl) organizationCatalogGroupCountEl.textContent = groupCount.toLocaleString("th-TH");
    if (organizationCatalogFilteredCountEl) organizationCatalogFilteredCountEl.textContent = filteredRows.length.toLocaleString("th-TH");
    if (organizationCatalogVisibleCountEl) organizationCatalogVisibleCountEl.textContent = visibleRows.length.toLocaleString("th-TH");

    if (organizationCatalogTableCaptionEl) {
      organizationCatalogTableCaptionEl.textContent = rows.length
        ? `ปีการศึกษา ${getOrganizationCatalogDisplayAcademicYear()} · แสดง ${visibleRows.length.toLocaleString("th-TH")} จาก ${filteredRows.length.toLocaleString("th-TH")} รายการ (${rows.length.toLocaleString("th-TH")} ทั้งหมด)`
        : "ยังไม่มีข้อมูล";
    }
    if (organizationCatalogShowMoreBtnEl) {
      const remaining = filteredRows.length - visibleRows.length;
      organizationCatalogShowMoreBtnEl.hidden = remaining <= 0;
      organizationCatalogShowMoreBtnEl.textContent = remaining > 0
        ? `แสดงเพิ่มอีก ${Math.min(ORGANIZATION_CATALOG_PAGE_SIZE, remaining).toLocaleString("th-TH")} รายการ`
        : "";
      if (organizationCatalogTableActionsEl) organizationCatalogTableActionsEl.hidden = remaining <= 0;
    }
    if (!organizationCatalogTableBodyEl) return;
    if (!rows.length) {
      organizationCatalogTableBodyEl.innerHTML = `<tr><td colspan="5" class="list-empty-cell">${renderListEmptyState("ยังไม่มีทะเบียนองค์กรในระบบ หรือยังโหลดข้อมูลไม่สำเร็จ", "ลองรีเฟรชข้อมูล หรือเพิ่มทะเบียนองค์กรเมื่อข้อมูลพร้อมใช้งาน")}</td></tr>`;
      return;
    }
    if (!visibleRows.length) {
      organizationCatalogTableBodyEl.innerHTML = `<tr><td colspan="5" class="list-empty-cell">${renderListEmptyState("ไม่พบองค์กรตามตัวกรองที่เลือก", "ลองเปลี่ยนหรือล้างตัวกรองเพื่อดูรายการอื่น", "search")}</td></tr>`;
      return;
    }
    organizationCatalogTableBodyEl.innerHTML = visibleRows.map((item) => `
      <tr class="organization-catalog-row${item.id && item.id === selectedId ? " is-selected" : ""}" data-organization-id="${toSafeText(item.id)}">
        <td data-label="ประเภทองค์กร">${toSafeText(item.group)}</td>
        <td data-label="ชื่อองค์กร"><button type="button" class="organization-catalog-edit-link" aria-label="แก้ไข ${toSafeText(item.name)}">${toSafeText(item.name)}</button></td>
        <td data-label="รหัส">${toSafeText(item.code || "-")}</td>
        <td data-label="เลขรันเอกสาร">${toSafeText(formatOrganizationCatalogDocumentRunCode(item.documentRunCode, item.group) || "-")}</td>
        <td data-label="เลขที่บัญชี">${toSafeText(item.accountNo || "-")}</td>
      </tr>
    `).join("");
  };

  const resetOrganizationCatalogForm = () => {
    Object.values(organizationCatalogFields).forEach((field) => {
      if (field) field.value = "";
    });
    if (organizationCatalogResponsibilityDivisionEl) organizationCatalogResponsibilityDivisionEl.value = "";
    if (organizationCatalogResponsibilitySubCodeEl) organizationCatalogResponsibilitySubCodeEl.value = "";
    if (organizationCatalogCustomDivisionCodeEl) organizationCatalogCustomDivisionCodeEl.value = "";
    if (organizationCatalogCustomDivisionNameEl) organizationCatalogCustomDivisionNameEl.value = "";
    if (organizationCatalogResponsibilityControlsEl) organizationCatalogResponsibilityControlsEl.hidden = true;
    if (organizationCatalogCustomResponsibilityControlsEl) organizationCatalogCustomResponsibilityControlsEl.hidden = true;
    if (organizationCatalogFields.documentRunCode) {
      organizationCatalogFields.documentRunCode.readOnly = true;
      organizationCatalogFields.documentRunCode.setAttribute("aria-readonly", "true");
      organizationCatalogFields.documentRunCode.placeholder = "ระบบเติมจากรหัสชมรม";
    }
    if (organizationCatalogFormTitleEl) organizationCatalogFormTitleEl.textContent = "เพิ่มองค์กรใหม่";
    if (organizationCatalogSaveBtnEl) organizationCatalogSaveBtnEl.textContent = "เพิ่มองค์กร";
    if (organizationCatalogArchiveBtnEl) organizationCatalogArchiveBtnEl.disabled = true;
    setMessage(organizationCatalogFormMessageEl, "", "#6b7280");
    updateOrganizationCatalogFormUi();
    renderOrganizationCatalogTable();
  };

  const syncOrganizationCatalogDocumentRunInputMode = () => {
    if (!organizationCatalogFields.documentRunCode) return;
    populateOrganizationCatalogResponsibilityDivisions();
    const group = normalizeOrganizationCatalogText(organizationCatalogFields.group?.value);
    const isManual = isOrganizationCatalogManualDocumentRunGroup(group);
    if (organizationCatalogResponsibilityControlsEl) {
      organizationCatalogResponsibilityControlsEl.hidden = !isManual;
    }
    organizationCatalogFields.documentRunCode.readOnly = true;
    organizationCatalogFields.documentRunCode.setAttribute("aria-readonly", "true");
    organizationCatalogFields.documentRunCode.placeholder = isManual
      ? "เลือกฝ่ายหลักและเลขย่อยด้านล่าง"
      : "ระบบเติมจากรหัสชมรม";
    if (organizationCatalogResponsibilitySubCodeEl) {
      organizationCatalogResponsibilitySubCodeEl.readOnly = isManual;
      organizationCatalogResponsibilitySubCodeEl.setAttribute("aria-readonly", isManual ? "true" : "false");
      organizationCatalogResponsibilitySubCodeEl.placeholder = isManual ? "ระบบเติมอัตโนมัติ" : "เช่น 03";
    }
    syncOrganizationCatalogCustomResponsibilityControls();
  };

  const syncOrganizationCatalogCustomResponsibilityControls = () => {
    if (!organizationCatalogCustomResponsibilityControlsEl) return;
    const showCustom =
      !organizationCatalogResponsibilityControlsEl?.hidden &&
      normalizeOrganizationCatalogText(organizationCatalogResponsibilityDivisionEl?.value) === "__custom__";
    organizationCatalogCustomResponsibilityControlsEl.hidden = !showCustom;
    if (!showCustom) {
      if (organizationCatalogCustomDivisionCodeEl) organizationCatalogCustomDivisionCodeEl.value = "";
      if (organizationCatalogCustomDivisionNameEl) organizationCatalogCustomDivisionNameEl.value = "";
    }
  };

  const refreshOrganizationCatalogGeneratedCode = ({ force = false } = {}) => {
    const group = normalizeOrganizationCatalogText(organizationCatalogFields.group?.value);
    const id = normalizeOrganizationCatalogText(organizationCatalogFields.id?.value);
    const currentCode = normalizeOrganizationCatalogText(organizationCatalogFields.code?.value).toUpperCase();
    if (!organizationCatalogFields.code || !group) return;
    if (isOrganizationCatalogManualDocumentRunGroup(group)) {
      if (!id) organizationCatalogFields.code.value = "";
      refreshOrganizationCatalogDocumentRunPreview();
      return;
    }
    if (!force && currentCode) return;
    const code = generateOrganizationCatalogCode({ id, group });
    if (code) {
      organizationCatalogFields.code.value = code;
      refreshOrganizationCatalogDocumentRunPreview();
    }
  };

  const refreshOrganizationCatalogDocumentRunPreview = () => {
    if (!organizationCatalogFields.documentRunCode) return;
    const code = normalizeOrganizationCatalogText(organizationCatalogFields.code?.value).toUpperCase();
    const group = normalizeOrganizationCatalogText(organizationCatalogFields.group?.value);
    const base = resolveOrganizationCatalogDocumentRunBaseFromForm({
      group,
      code
    });
    organizationCatalogFields.documentRunCode.value = base
      ? formatOrganizationCatalogDocumentRunCode(base, group)
      : "";
    if (isOrganizationCatalogManualDocumentRunGroup(group) && organizationCatalogResponsibilitySubCodeEl) {
      const parsed = parseOrganizationCatalogManualDocumentRunBase(base);
      organizationCatalogResponsibilitySubCodeEl.value = parsed.subCode || "";
      if (organizationCatalogFields.code) {
        organizationCatalogFields.code.value = buildOrganizationCatalogManualCodeFromRunBase(group, base);
      }
    }
  };

  const refreshOrganizationCatalogManualDocumentRunFromControls = () => {
    const group = normalizeOrganizationCatalogText(organizationCatalogFields.group?.value);
    if (!isOrganizationCatalogManualDocumentRunGroup(group)) {
      refreshOrganizationCatalogDocumentRunPreview();
      return;
    }
    const divisionCode = getOrganizationCatalogSelectedDivisionCode();
    if (!divisionCode) {
      if (organizationCatalogFields.code) organizationCatalogFields.code.value = "";
      if (organizationCatalogFields.documentRunCode) organizationCatalogFields.documentRunCode.value = "";
      if (organizationCatalogResponsibilitySubCodeEl) organizationCatalogResponsibilitySubCodeEl.value = "";
      return;
    }
    const id = normalizeOrganizationCatalogText(organizationCatalogFields.id?.value);
    const academicYear = getOrganizationCatalogDisplayAcademicYear();
    const existingItem = id ? getOrganizationCatalogRows().find((item) => item.id === id) : null;
    const existingParsed = parseOrganizationCatalogManualDocumentRunBase(getOrganizationCatalogManualRunForYear(existingItem, academicYear));
    const subCode = existingParsed.divisionCode === divisionCode && existingParsed.subCode
      ? existingParsed.subCode
      : getOrganizationCatalogNextManualSubCode({ group, divisionCode, academicYear, excludeIds: [id] });
    const base = `${divisionCode}.${subCode}`;
    if (organizationCatalogResponsibilitySubCodeEl) organizationCatalogResponsibilitySubCodeEl.value = subCode;
    if (organizationCatalogFields.code) organizationCatalogFields.code.value = buildOrganizationCatalogManualCodeFromRunBase(group, base);
    if (organizationCatalogFields.documentRunCode) {
      organizationCatalogFields.documentRunCode.value = formatOrganizationCatalogDocumentRunCode(base, group);
    }
  };

  const syncOrganizationCatalogManualRunFromDomState = ({ force = false } = {}) => {
    if (!organizationCatalogFormEl || !organizationCatalogFields.group) return;
    const signature = [
      organizationCatalogFields.id?.value || "",
      organizationCatalogFields.group?.value || "",
      organizationCatalogAcademicYearEl?.value || "",
      organizationCatalogResponsibilityDivisionEl?.value || "",
      organizationCatalogCustomDivisionCodeEl?.value || ""
    ].join("|");
    if (!force && signature === organizationCatalogManualRunSyncSignature) return;
    organizationCatalogManualRunSyncSignature = signature;
    syncOrganizationCatalogDocumentRunInputMode();
    refreshOrganizationCatalogManualDocumentRunFromControls();
  };

  const startOrganizationCatalogManualRunAutosync = () => {
    if (!organizationCatalogFormEl || organizationCatalogManualRunSyncTimer) return;
    syncOrganizationCatalogManualRunFromDomState({ force: true });
    organizationCatalogManualRunSyncTimer = window.setInterval(() => {
      syncOrganizationCatalogManualRunFromDomState();
    }, 300);
  };

  const normalizeOrganizationCatalogDocumentRunInput = () => {
    if (!isOrganizationCatalogManualDocumentRunGroup(organizationCatalogFields.group?.value)) return;
    const parsed = parseOrganizationCatalogManualDocumentRunBase(organizationCatalogFields.documentRunCode?.value);
    if (organizationCatalogResponsibilityDivisionEl && parsed.divisionCode) {
      organizationCatalogResponsibilityDivisionEl.value = parsed.divisionCode;
    }
    if (organizationCatalogResponsibilitySubCodeEl && parsed.subCode) {
      organizationCatalogResponsibilitySubCodeEl.value = parsed.subCode;
    }
  };

  const updateOrganizationCatalogFormUi = () => {
    const id = normalizeOrganizationCatalogText(organizationCatalogFields.id?.value);

    if (organizationCatalogFormTitleEl) {
      organizationCatalogFormTitleEl.textContent = id ? "แก้ไของค์กร" : "เพิ่มองค์กรใหม่";
    }
    if (organizationCatalogSaveBtnEl) {
      organizationCatalogSaveBtnEl.textContent = id ? "บันทึกการแก้ไข" : "เพิ่มองค์กร";
    }
  };

  const fillOrganizationCatalogForm = (item) => {
    if (!item) return;
    syncOrganizationCatalogGroupOptions();
    if (organizationCatalogFields.id) organizationCatalogFields.id.value = item.id || "";
    if (organizationCatalogFields.group) organizationCatalogFields.group.value = item.group || "";
    syncOrganizationCatalogDocumentRunInputMode();
    if (isOrganizationCatalogManualDocumentRunGroup(item.group)) {
      const parsed = parseOrganizationCatalogManualDocumentRunBase(item.documentRunCode);
      const isKnownDivision = ORGANIZATION_CATALOG_RESPONSIBILITY_DIVISIONS.some((entry) => entry.code === parsed.divisionCode);
      if (organizationCatalogResponsibilityDivisionEl) {
        organizationCatalogResponsibilityDivisionEl.value = parsed.divisionCode && !isKnownDivision
          ? "__custom__"
          : parsed.divisionCode || "";
      }
      if (organizationCatalogCustomDivisionCodeEl) {
        organizationCatalogCustomDivisionCodeEl.value = parsed.divisionCode && !isKnownDivision ? parsed.divisionCode : "";
      }
      if (organizationCatalogResponsibilitySubCodeEl) organizationCatalogResponsibilitySubCodeEl.value = parsed.subCode || "";
      syncOrganizationCatalogCustomResponsibilityControls();
    }
    if (organizationCatalogFields.name) organizationCatalogFields.name.value = item.name || "";
    if (organizationCatalogFields.code) organizationCatalogFields.code.value = item.code || "";
    if (organizationCatalogFields.documentRunCode) organizationCatalogFields.documentRunCode.value = formatOrganizationCatalogDocumentRunCode(item.documentRunCode, item.group) || "";
    if (organizationCatalogFields.accountNo) organizationCatalogFields.accountNo.value = item.accountNo || "";
    if (organizationCatalogFormTitleEl) organizationCatalogFormTitleEl.textContent = "แก้ไของค์กร";
    if (organizationCatalogSaveBtnEl) organizationCatalogSaveBtnEl.textContent = "บันทึกการแก้ไข";
    if (organizationCatalogArchiveBtnEl) organizationCatalogArchiveBtnEl.disabled = !item.id;
    setMessage(organizationCatalogFormMessageEl, "กำลังแก้ไขรายการที่เลือก", "#475569");
    updateOrganizationCatalogFormUi();
    renderOrganizationCatalogTable();
  };

  const refreshSelectedOrganizationCatalogFormForAcademicYear = () => {
    const selectedId = normalizeOrganizationCatalogText(organizationCatalogFields.id?.value);
    if (!selectedId) {
      refreshOrganizationCatalogDocumentRunPreview();
      return;
    }
    const selectedItem = getOrganizationCatalogRows().find((item) => item.id === selectedId);
    if (selectedItem) fillOrganizationCatalogForm(selectedItem);
  };

  const buildOrganizationCatalogManualDocumentRunSaveFields = ({ item = {}, documentRunCodeByAcademicYear = {}, currentRunCode = "" } = {}) => {
    const runMap = buildOrganizationCatalogDocumentRunMap({
      documentRunCode: currentRunCode || item.documentRunCode || item.runCode,
      documentRunCodeByAcademicYear,
      runCodeByAcademicYear: item.runCodeByAcademicYear
    });
    const legacyRunCode = runMap[ORGANIZATION_CATALOG_LEGACY_DOCUMENT_RUN_ACADEMIC_YEAR] || stripOrganizationCatalogDocumentRunYear(currentRunCode);
    const activeYear = getOrganizationCatalogDisplayAcademicYear();
    const itemYear = getOrganizationCatalogItemAcademicYear(item);
    const activeRunCode = runMap[activeYear] || legacyRunCode || Object.values(runMap)[0] || "";
    const codeMap = {
      ...normalizeOrganizationCatalogCodeMap(item.codeByAcademicYear),
      ...buildOrganizationCatalogCodeMap({
        group: item.group,
        code: item.code,
        documentRunCodeByAcademicYear: runMap
      })
    };
    const activeCode = codeMap[activeYear] || buildOrganizationCatalogManualCodeFromRunBase(item.group, activeRunCode);
    if (activeCode) codeMap[activeYear] = activeCode;
    const legacyCode = codeMap[ORGANIZATION_CATALOG_LEGACY_DOCUMENT_RUN_ACADEMIC_YEAR] ||
      normalizeOrganizationCatalogText(item.code).toUpperCase() ||
      buildOrganizationCatalogManualCodeFromRunBase(item.group, activeRunCode);
    const scalarRunCode = itemYear === activeYear
      ? activeRunCode
      : legacyRunCode || normalizeOrganizationCatalogText(item.documentRunCode || item.runCode);
    const scalarCode = itemYear === activeYear
      ? activeCode
      : legacyCode;
    return {
      documentRunCode: scalarRunCode,
      documentRunCodeByAcademicYear: runMap,
      code: scalarCode,
      codeByAcademicYear: codeMap,
      accountNo: normalizeOrganizationCatalogText(item.accountNo || item.bankAccount || item.bankAccountNo),
      bankAccount: normalizeOrganizationCatalogText(item.accountNo || item.bankAccount || item.bankAccountNo),
      nameByAcademicYear: normalizeOrganizationCatalogYearTextMap(item.nameByAcademicYear)
    };
  };

  const buildOrganizationCatalogManualMoveUpdates = ({ payload = {}, academicYear = "" } = {}) => {
    const year = normalizeOrganizationCatalogText(academicYear);
    if (!year || !isOrganizationCatalogManualDocumentRunGroup(payload.group)) return [];
    const rows = getOrganizationCatalogRows();
    const payloadIds = new Set([
      normalizeOrganizationCatalogText(payload.id),
      normalizeOrganizationCatalogText(payload.legacyOrganizationId || payload.legacyOrgId)
    ].filter(Boolean));
    const payloadBaseId = getOrganizationCatalogBaseId(payload);
    const existingItem = rows.find((item) => {
      const itemId = normalizeOrganizationCatalogText(item.id);
      if (payloadIds.has(itemId)) return true;
      const itemBaseId = getOrganizationCatalogBaseId(item);
      return !!payloadBaseId && !!itemBaseId && itemBaseId === payloadBaseId;
    });
    if (!existingItem) return [];
    const existingBaseId = getOrganizationCatalogBaseId(existingItem);
    const excludedBaseId = payloadBaseId || existingBaseId;
    const fromParsed = parseOrganizationCatalogManualDocumentRunBase(getOrganizationCatalogManualRunForYear(existingItem, year));
    const toParsed = parseOrganizationCatalogManualDocumentRunBase(payload.documentRunCodeByAcademicYear?.[year] || payload.documentRunCode);
    const fromSubNumber = Number(fromParsed.subCode);
    if (
      !fromParsed.divisionCode ||
      !toParsed.divisionCode ||
      fromParsed.divisionCode === toParsed.divisionCode ||
      !Number.isFinite(fromSubNumber)
    ) {
      return [];
    }

    return rows
      .map((item) => {
        const itemId = normalizeOrganizationCatalogText(item.id);
        const itemBaseId = getOrganizationCatalogBaseId(item);
        if (payloadIds.has(itemId) || (excludedBaseId && itemBaseId === excludedBaseId) || item.group !== payload.group) return null;
        const runCode = getOrganizationCatalogManualRunForYear(item, year);
        const parsed = parseOrganizationCatalogManualDocumentRunBase(runCode);
        const subNumber = Number(parsed.subCode);
        if (parsed.divisionCode !== fromParsed.divisionCode || !Number.isFinite(subNumber) || subNumber <= fromSubNumber) {
          return null;
        }
        const nextRunMap = {
          ...normalizeOrganizationCatalogDocumentRunMap(item.documentRunCodeByAcademicYear),
          [year]: `${parsed.divisionCode}.${formatOrganizationCatalogManualRunSubCode(subNumber - 1)}`
        };
        const saveFields = buildOrganizationCatalogManualDocumentRunSaveFields({
          item,
          documentRunCodeByAcademicYear: nextRunMap,
          currentRunCode: item.documentRunCode
        });
        return {
          id: item.id,
          group: item.group,
          ...saveFields,
          status: "active"
        };
      })
      .filter(Boolean);
  };

  const buildOrganizationCatalogSharedAccountUpdates = ({ payload = {} } = {}) => {
    const group = normalizeOrganizationCatalogText(payload.group);
    if (!isOrganizationCatalogManualDocumentRunGroup(group)) return [];
    const accountNo = normalizeOrganizationCatalogText(payload.accountNo || payload.bankAccount || payload.bankAccountNo);
    return getRawOrganizationCatalogRows()
      .filter((item) => {
        const itemGroup = normalizeOrganizationCatalogText(item?.group || item?.organizationType || item?.orgGroup);
        return item.id && item.id !== payload.id && itemGroup === group;
      })
      .map((item) => ({
        id: item.id,
        accountNo,
        bankAccount: accountNo
      }));
  };

  const doesOrgRepresentativeApplicationMatchCatalogChange = (item = {}, payload = {}, previousItem = {}) => {
    const appYear = getOrgRepresentativeAcademicYear(item);
    const payloadYear = normalizeOrganizationCatalogAcademicYearText(payload.academicYear);
    if (payloadYear && appYear && appYear !== payloadYear) return false;

    const appType = normalizeOrgRepresentativeMatchValue(item.organizationType || item.orgGroup);
    const nextType = normalizeOrgRepresentativeMatchValue(payload.group);
    if (appType && nextType && appType !== nextType) return false;

    const appId = normalizeOrganizationCatalogText(item.organizationId || item.organizationCatalogId);
    const appBaseId = normalizeOrganizationCatalogText(item.baseOrganizationId || item.baseOrgId || item.rootOrganizationId);
    const payloadId = normalizeOrganizationCatalogText(payload.id);
    const payloadBaseId = getOrganizationCatalogBaseId(payload);
    const previousId = normalizeOrganizationCatalogText(previousItem?.id);
    const previousBaseId = getOrganizationCatalogBaseId(previousItem);
    if (
      (appId && [payloadId, previousId].filter(Boolean).includes(appId)) ||
      (appBaseId && [payloadBaseId, previousBaseId].filter(Boolean).includes(appBaseId))
    ) {
      return true;
    }

    const appCode = normalizeOrgRepresentativeMatchValue(item.organizationCode || item.orgCode || item.code);
    const appRunCode = normalizeOrgRepresentativeMatchValue(stripOrganizationCatalogDocumentRunYear(item.organizationDocumentRunCode || item.documentRunCode || item.runCode));
    const previousValues = getOrgRepresentativeCatalogMatchValues(previousItem || {});
    const nextValues = getOrgRepresentativeCatalogMatchValues(payload || {});
    if (
      (appCode && [previousValues.code, nextValues.code].some((code) => normalizeOrgRepresentativeMatchValue(code) === appCode)) ||
      (appRunCode && [previousValues.runCode, nextValues.runCode].some((runCode) => normalizeOrgRepresentativeMatchValue(runCode) === appRunCode))
    ) {
      return true;
    }

    const appName = normalizeOrgRepresentativeMatchValue(item.organizationName || item.orgName);
    if (!appName) return false;
    return [...previousValues.names, ...nextValues.names]
      .some((name) => normalizeOrgRepresentativeMatchValue(name) === appName);
  };

  const syncOrgRepresentativeApplicationsForCatalogChange = async ({ payload = {}, previousItem = {}, updatedBy = "", timestampValue = null } = {}) => {
    if (!resolveStore() || !firestore.doc || !firestore.updateDoc) return 0;
    const matchedItems = currentOrgRepresentativeApplications.filter((item) =>
      doesOrgRepresentativeApplicationMatchCatalogChange(item, payload, previousItem)
    );
    if (!matchedItems.length) return 0;

    const stamp = timestampValue || (firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString());
    const fields = {
      organizationType: payload.group || "",
      organizationName: payload.name || payload.formName || "",
      organizationId: payload.id || "",
      organizationCatalogId: payload.id || "",
      baseOrganizationId: payload.baseOrganizationId || "",
      organizationCode: payload.code || "",
      organizationDocumentRunCode: payload.documentRunCode || "",
      requestedPosition: payload.name || payload.formName ? `ตัวแทนองค์กร: ${payload.name || payload.formName}` : undefined,
      updatedAt: stamp,
      organizationSyncedAt: stamp,
      organizationSyncedBy: updatedBy
    };
    Object.keys(fields).forEach((key) => {
      if (typeof fields[key] === "undefined") delete fields[key];
    });

    if (firestore.writeBatch && matchedItems.length > 1) {
      for (let start = 0; start < matchedItems.length; start += 450) {
        const batch = firestore.writeBatch(firestore.db);
        matchedItems.slice(start, start + 450).forEach((item) => {
          batch.update(firestore.doc(firestore.db, COLLECTION_ORG_REPRESENTATIVES, item.id), fields);
        });
        await batch.commit();
      }
    } else {
      for (const item of matchedItems) {
        await firestore.updateDoc(firestore.doc(firestore.db, COLLECTION_ORG_REPRESENTATIVES, item.id), fields);
      }
    }

    currentOrgRepresentativeApplications = currentOrgRepresentativeApplications.map((item) =>
      matchedItems.some((matched) => matched.id === item.id) ? { ...item, ...fields } : item
    );
    return matchedItems.length;
  };

  const writeOrganizationCatalogUpdateItems = async (updates = [], { updatedBy = "", timestampValue = null, createdFromLegacy = false } = {}) => {
    if (!updates.length) return;
    const stamp = timestampValue || (firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString());
    const buildFields = (item) => ({
      ...item.fields,
      ...(createdFromLegacy ? { createdFromLegacyAt: stamp } : {}),
      updatedAt: stamp,
      updatedBy
    });
    if (firestore.writeBatch && updates.length > 1) {
      for (let start = 0; start < updates.length; start += 450) {
        const batch = firestore.writeBatch(firestore.db);
        updates.slice(start, start + 450).forEach((item) => {
          batch.set(
            firestore.doc(firestore.db, COLLECTION_ORGANIZATION_CATALOG, item.id),
            buildFields(item),
            { merge: true }
          );
        });
        await batch.commit();
      }
      return;
    }
    for (const item of updates) {
      await firestore.setDoc(
        firestore.doc(firestore.db, COLLECTION_ORGANIZATION_CATALOG, item.id),
        buildFields(item),
        { merge: true }
      );
    }
  };

  const applyOrganizationCatalogUpdateItems = (updates = []) => {
    if (!updates.length) return;
    const updatesById = new Map(updates.map((item) => [item.id, item.fields]));
    const seen = new Set();
    const nextRows = getRawOrganizationCatalogRows().map((item) => {
      const id = normalizeOrganizationCatalogText(item.id);
      seen.add(id);
      return updatesById.has(id) ? { ...item, ...updatesById.get(id) } : item;
    });
    updates.forEach((item) => {
      const id = normalizeOrganizationCatalogText(item.id);
      if (!seen.has(id)) nextRows.push({ id, ...item.fields });
    });
    setLocalOrganizationCatalogRows(nextRows);
  };

