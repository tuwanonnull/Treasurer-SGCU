  const buildOrganizationCatalogBackfillUpdates = ({ academicYear = getOrganizationCatalogDisplayAcademicYear(), sourceYear = "" } = {}) => {
    const year = normalizeOrganizationCatalogText(academicYear);
    if (!/^\d{4}$/.test(year) || (sourceYear && (!/^\d{4}$/.test(sourceYear) || sourceYear === year))) return [];

    const targetYear = Number(year);
    const rows = getRawOrganizationCatalogRows();
    const exactSourceBaseIds = new Set(rows.filter((item) => getOrganizationCatalogItemAcademicYear(item) === sourceYear).map(getOrganizationCatalogBaseId));
    const targetByBaseId = rows.reduce((map, item) => {
      if (getOrganizationCatalogItemAcademicYear(item) !== year) return map;
      const baseId = getOrganizationCatalogBaseId(item);
      if (baseId) map.set(baseId, item);
      return map;
    }, new Map());

    return Array.from(rows
      .map((item) => {
        const itemYear = getOrganizationCatalogItemAcademicYear(item);
        if (itemYear === year) return null;
        if (sourceYear) {
          if (itemYear && itemYear !== sourceYear) return null;
          if (!itemYear && exactSourceBaseIds.has(getOrganizationCatalogBaseId(item))) return null;
        } else if (itemYear && Number(itemYear) >= targetYear) return null;
        const group = normalizeOrganizationCatalogText(item?.group || item?.organizationType || item?.orgGroup);
        const rawName = normalizeOrganizationCatalogText(item?.name || item?.organizationName || item?.orgName);
        const rawCode = normalizeOrganizationCatalogText(item?.code || item?.orgCode).toUpperCase();
        const rawRunCode = item?.documentRunCode || item?.runCode;
        const baseOrganizationId = getOrganizationCatalogBaseId(item) || slugifyOrganizationCatalogId(`${group}-${rawCode || rawName}`);
        const targetItem = targetByBaseId.get(baseOrganizationId) || null;
        const nameByAcademicYear = buildOrganizationCatalogYearTextMap({
          text: rawName,
          textByAcademicYear: item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear
        });
        const documentRunCodeByAcademicYear = buildOrganizationCatalogDocumentRunMap({
          documentRunCode: rawRunCode,
          documentRunCodeByAcademicYear: item?.documentRunCodeByAcademicYear,
          runCodeByAcademicYear: item?.runCodeByAcademicYear
        });
        const codeByAcademicYear = buildOrganizationCatalogCodeMap({
          group,
          code: rawCode,
          codeByAcademicYear: item?.codeByAcademicYear,
          orgCodeByAcademicYear: item?.orgCodeByAcademicYear,
          documentRunCodeByAcademicYear
        });
        const previousName = itemYear ? rawName : (sourceYear ? getOrganizationCatalogExactYearValue(nameByAcademicYear, sourceYear) : getOrganizationCatalogLatestPreviousYearValue(nameByAcademicYear, year));
        const previousRunCode = itemYear
          ? stripOrganizationCatalogDocumentRunYear(rawRunCode)
          : (sourceYear ? getOrganizationCatalogExactYearValue(documentRunCodeByAcademicYear, sourceYear) : getOrganizationCatalogLatestPreviousYearValue(documentRunCodeByAcademicYear, year));
        const previousCode = itemYear
          ? rawCode
          : buildOrganizationCatalogManualCodeFromRunBase(group, previousRunCode) ||
            (sourceYear ? getOrganizationCatalogExactYearValue(codeByAcademicYear, sourceYear) : getOrganizationCatalogLatestPreviousYearValue(codeByAcademicYear, year));
        if (sourceYear && !itemYear && !previousName && !previousRunCode && !previousCode) return null;
        if (sourceYear && !targetItem && !previousName) return null;
        const fields = {
          academicYear: year,
          baseOrganizationId,
          legacyOrganizationId: normalizeOrganizationCatalogText(item.id),
          group,
          status: "active"
        };
        const stats = {
          name: 0,
          code: 0,
          runCode: 0
        };

        if (previousName && !normalizeOrganizationCatalogText(targetItem?.name || targetItem?.organizationName || targetItem?.orgName)) {
          fields.name = previousName;
          fields.nameByAcademicYear = { [year]: previousName };
          stats.name = 1;
        }

        if (previousRunCode && !stripOrganizationCatalogDocumentRunYear(targetItem?.documentRunCode || targetItem?.runCode)) {
          fields.documentRunCode = previousRunCode;
          fields.documentRunCodeByAcademicYear = { [year]: previousRunCode };
          stats.runCode = 1;
        }

        if (previousCode && !normalizeOrganizationCatalogText(targetItem?.code || targetItem?.orgCode)) {
          fields.code = normalizeOrganizationCatalogText(previousCode).toUpperCase();
          fields.codeByAcademicYear = { [year]: fields.code };
          stats.code = 1;
        }

        const accountNo = normalizeOrganizationCatalogText(targetItem?.accountNo || targetItem?.bankAccount || targetItem?.bankAccountNo) ||
          normalizeOrganizationCatalogText(item?.accountNo || item?.bankAccount || item?.bankAccountNo);
        if (accountNo) {
          fields.accountNo = accountNo;
          fields.bankAccount = accountNo;
        }

        if (!stats.name && !stats.code && !stats.runCode) return null;
        return {
          id: normalizeOrganizationCatalogText(targetItem?.id) || buildOrganizationCatalogYearDocId(baseOrganizationId, year),
          fields,
          stats
        };
      })
      .filter((item) => item?.id)
      .reduce((acc, item) => {
        const existing = acc.get(item.id);
        if (!existing) {
          acc.set(item.id, item);
          return acc;
        }
        acc.set(item.id, {
          id: item.id,
          fields: { ...existing.fields, ...item.fields },
          stats: {
            name: Math.max(existing.stats.name, item.stats.name),
            code: Math.max(existing.stats.code, item.stats.code),
            runCode: Math.max(existing.stats.runCode, item.stats.runCode)
          }
        });
        return acc;
      }, new Map())
      .values()
    );
  };

  const buildOrganizationCatalogCopyPreview = ({ backfill, normalize, link, sourceYear: selectedSourceYear = "" }) => {
    const rows = new Map();
    Object.entries({ backfill, normalize, link }).forEach(([step, updates]) => {
      updates.forEach(({ id, fields, copyRenumber }) => {
        const existing = getRawOrganizationCatalogItemById(id) || {};
        const source = getRawOrganizationCatalogItemById(fields.legacyOrganizationId || existing.legacyOrganizationId) || {};
        if (!rows.has(id)) {
          rows.set(id, {
            id,
            name: fields.name || existing.name || existing.organizationName || source.name || source.organizationName || id,
            group: fields.group || existing.group || source.group || "",
            code: fields.code || existing.code || source.code || "",
            existing: Boolean(existing.id || existing.name || existing.organizationName),
            copyRenumber: copyRenumber || "",
            sources: [],
            sourceYears: [],
            copyValues: {},
            steps: []
          });
        }
        const row = rows.get(id);
        // Backfill runs first; normalization may be skipped after it creates the destination.
        Object.entries({ name: "ชื่อองค์กร", code: "รหัสองค์กร", documentRunCode: "เลขที่หนังสือ", accountNo: "เลขบัญชี" }).forEach(([key, label]) => {
          if (fields[key] && !row.copyValues[key]) {
            row.copyValues[key] = { label, value: String(fields[key]) };
          }
        });
        const sourceName = (selectedSourceYear && (source.nameByAcademicYear || source.organizationNameByAcademicYear || source.orgNameByAcademicYear)?.[selectedSourceYear]) || source.name || source.organizationName || source.orgName || fields.name || row.name;
        const sourceYear = selectedSourceYear || getOrganizationCatalogItemAcademicYear(source);
        const sourceYearLabel = sourceYear || "ทะเบียนเดิม (ไม่แยกปี)";
        if (!row.sourceYears.includes(sourceYearLabel)) row.sourceYears.push(sourceYearLabel);
        const origin = `${sourceName} · ${sourceYear ? `ปีการศึกษา ${sourceYear}` : "ทะเบียนเดิม (ไม่ได้แยกรายการตามปี)"}`;
        if (!row.sources.includes(origin)) row.sources.push(origin);
        row.steps.push(step);
      });
    });
    return Array.from(rows.values()).sort((a, b) =>
      b.group.localeCompare(a.group, "th") ||
      a.code.localeCompare(b.code, "th", { numeric: true }) ||
      a.name.localeCompare(b.name, "th")
    );
  };

  const getOrganizationCatalogCopyConflicts = (updates, academicYear) => {
    const normalize = (value) => normalizeOrganizationCatalogText(value).toUpperCase();
    const rawRows = getRawOrganizationCatalogRows();
    const existingById = new Map(rawRows.map((item) => [item.id, item]));
    const proposed = updates.map(({ id, fields }) => ({ ...existingById.get(id), ...fields, id }));
    const destinations = rawRows.flatMap((item) => {
      const year = getOrganizationCatalogItemAcademicYear(item);
      if (year === academicYear) return [item];
      if (year) return [];
      const code = item.codeByAcademicYear?.[academicYear] || item.orgCodeByAcademicYear?.[academicYear];
      const run = item.documentRunCodeByAcademicYear?.[academicYear] || item.runCodeByAcademicYear?.[academicYear];
      return code || run ? [{ ...item, code: code || "", orgCode: "", documentRunCode: run || "", runCode: "" }] : [];
    });
    const conflicts = new Map();
    proposed.forEach((item) => {
      const group = normalize(item.group || item.organizationType || item.orgGroup);
      const code = normalize(item.code || item.orgCode);
      const run = normalize(stripOrganizationCatalogDocumentRunYear(item.documentRunCode || item.runCode));
      const match = [...destinations, ...proposed].find((other) => {
        if (other.id === item.id || getOrganizationCatalogBaseId(other) === getOrganizationCatalogBaseId(item)) return false;
        if (normalize(other.group || other.organizationType || other.orgGroup) !== group) return false;
        return (code && code === normalize(other.code || other.orgCode)) ||
          (run && run === normalize(stripOrganizationCatalogDocumentRunYear(other.documentRunCode || other.runCode)));
      });
      if (match) conflicts.set(item.id, `รหัสหรือเลขรันเอกสารซ้ำกับ “${match.name || match.organizationName || match.id}” ในปี ${academicYear} กรุณาตรวจสอบหรือแก้ไขรหัสก่อนทำสำเนา`);
    });
    return conflicts;
  };

  const allocateOrganizationCatalogCopyCodes = (updates, academicYear) => {
    const planned = updates.map((item) => ({ ...item, fields: { ...item.fields } }));
    const normalize = (value) => normalizeOrganizationCatalogText(value).toUpperCase();
    const split = (value) => {
      const match = normalize(value).match(/^(.*?)(\d+)$/);
      return match ? { prefix: match[1], number: Number(match[2]), width: match[2].length } : null;
    };
    const raw = getRawOrganizationCatalogRows();
    const destination = raw.flatMap((item) => {
      const year = getOrganizationCatalogItemAcademicYear(item);
      if (year === academicYear) return [item];
      if (year) return [];
      return [{ ...item, code: item.codeByAcademicYear?.[academicYear] || item.orgCodeByAcademicYear?.[academicYear] || "", orgCode: "", documentRunCode: item.documentRunCodeByAcademicYear?.[academicYear] || item.runCodeByAcademicYear?.[academicYear] || "", runCode: "" }];
    });
    planned.forEach((item) => {
      if (!getOrganizationCatalogCopyConflicts(planned, academicYear).has(item.id)) return;
      const fields = item.fields;
      const current = raw.find((entry) => entry.id === item.id);
      // Never replace a destination code that the user already assigned.
      if (current && (current.code || current.orgCode || current.documentRunCode || current.runCode)) return;
      const oldCode = normalize(fields.code);
      const oldRun = stripOrganizationCatalogDocumentRunYear(fields.documentRunCode);
      const codeParts = split(oldCode);
      const runParts = split(oldRun);
      if ((!codeParts && oldCode) || (!runParts && oldRun) || (!codeParts && !runParts)) return;
      const group = normalize(fields.group);
      let highest = Math.max(codeParts?.number || 0, runParts?.number || 0);
      [...destination, ...planned.map((entry) => entry.fields)].forEach((entry) => {
        if (normalize(entry.group || entry.organizationType || entry.orgGroup) !== group) return;
        const code = split(entry.code || entry.orgCode);
        const run = split(stripOrganizationCatalogDocumentRunYear(entry.documentRunCode || entry.runCode));
        if (codeParts && code?.prefix === codeParts.prefix) highest = Math.max(highest, code.number);
        if (runParts && run?.prefix === runParts.prefix) highest = Math.max(highest, run.number);
      });
      const next = highest + 1;
      if (!Number.isSafeInteger(next)) return;
      if (codeParts) {
        fields.code = `${codeParts.prefix}${String(next).padStart(codeParts.width, "0")}`;
        fields.codeByAcademicYear = { ...fields.codeByAcademicYear, [academicYear]: fields.code };
      }
      if (runParts) {
        fields.documentRunCode = `${runParts.prefix}${String(next).padStart(runParts.width, "0")}`;
        fields.documentRunCodeByAcademicYear = { ...fields.documentRunCodeByAcademicYear, [academicYear]: fields.documentRunCode };
      }
      item.copyRenumber = `${oldCode || oldRun} → ${fields.code || fields.documentRunCode}`;
    });
    return planned;
  };

  const getOrganizationCatalogCopySourceYears = () => {
    const years = new Set();
    getRawOrganizationCatalogRows().forEach((item) => {
      const year = getOrganizationCatalogItemAcademicYear(item);
      if (year) {
        if ([item.name, item.organizationName, item.orgName, item.code, item.orgCode, item.documentRunCode, item.runCode].some((value) => normalizeOrganizationCatalogText(value))) years.add(year);
        return;
      }
      const runMap = buildOrganizationCatalogDocumentRunMap({
        documentRunCode: item.documentRunCode || item.runCode,
        documentRunCodeByAcademicYear: item.documentRunCodeByAcademicYear,
        runCodeByAcademicYear: item.runCodeByAcademicYear
      });
      const maps = [
        buildOrganizationCatalogYearTextMap({ text: item.name || item.organizationName || item.orgName, textByAcademicYear: item.nameByAcademicYear || item.organizationNameByAcademicYear || item.orgNameByAcademicYear }),
        buildOrganizationCatalogCodeMap({ group: item.group || item.organizationType || item.orgGroup, code: item.code || item.orgCode, codeByAcademicYear: item.codeByAcademicYear, orgCodeByAcademicYear: item.orgCodeByAcademicYear, documentRunCodeByAcademicYear: runMap }),
        runMap
      ];
      maps.forEach((map) => Object.entries(map).forEach(([key, value]) => {
        if (normalizeOrganizationCatalogText(value)) years.add(key);
      }));
    });
    return [...years].filter((year) => /^\d{4}$/.test(year)).sort((a, b) => Number(b) - Number(a));
  };

  const askOrganizationCatalogCopyYearConfirm = ({ academicYear }) => {
    const sourceYears = getOrganizationCatalogCopySourceYears();
    const years = [...new Set([...getOrgRepresentativeAcademicYearOptions(), ...sourceYears, academicYear, String(Number(academicYear) + 1)])].filter((year) => /^\d{4}$/.test(year)).sort((a, b) => Number(b) - Number(a));
    let sourceYear = sourceYears.find((year) => Number(year) < Number(academicYear)) || sourceYears.find((year) => year !== academicYear) || sourceYears[0] || "";
    let rows = [];
    const selectedIds = new Set();
    const modalEl = document.createElement("div");
    modalEl.className = "modal organization-catalog-copy-modal";
    modalEl.setAttribute("role", "dialog");
    modalEl.setAttribute("aria-modal", "true");
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.setAttribute("aria-labelledby", "organizationCatalogCopyYearTitle");
    modalEl.innerHTML = `
      <div class="modal-dialog organization-catalog-copy-dialog">
        <div class="modal-header">
          <div>
            <div id="organizationCatalogCopyYearTitle" class="modal-title">ยืนยันทำสำเนาองค์กร</div>
            <div class="modal-subtitle">เลือกปีต้นทาง ปีปลายทาง และองค์กรที่ต้องการทำสำเนา</div>
          </div>
          <button type="button" class="modal-close" data-copy-cancel aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body">
          <div class="organization-catalog-copy-years">
            <div class="organization-catalog-copy-year-card">
              <label class="modal-item-label" for="organizationCopySourceYear">ปีการศึกษาต้นทาง</label>
              <select id="organizationCopySourceYear" class="login-input" data-copy-source-year aria-describedby="organizationCopySourceHint"></select>
              <span id="organizationCopySourceHint" class="modal-subtitle">เลือกได้เฉพาะปีที่มีข้อมูลองค์กร</span>
            </div>
            <span class="organization-catalog-copy-arrow" aria-hidden="true">→</span>
            <div class="organization-catalog-copy-year-card">
              <label class="modal-item-label" for="organizationCopyTargetYear">ปีการศึกษาปลายทาง</label>
              <select id="organizationCopyTargetYear" class="login-input" data-copy-year></select>
              <span class="modal-subtitle">ปีที่ต้องการนำข้อมูลไปใช้</span>
            </div>
          </div>
          <dl class="organization-catalog-copy-totals" aria-label="สรุปองค์กรที่เลือก">
            <div><dt>สร้างใหม่</dt><dd data-copy-count="new"></dd></div>
            <div><dt>เติมข้อมูลที่มีอยู่</dt><dd data-copy-count="existing"></dd></div>
          </dl>
          <section class="organization-catalog-copy-organizations" aria-label="รายชื่อองค์กรที่จะทำสำเนา">
            <div class="organization-catalog-copy-list-heading">
              <div class="modal-section-title">เลือกองค์กร</div>
              <span data-copy-selected aria-live="polite"></span>
            </div>
            <div class="organization-catalog-copy-selection">
              <label><input type="checkbox" data-copy-all checked> เลือกทั้งหมด</label>
              <span class="modal-subtitle">เรียงตามประเภท · รหัส · ชื่อ</span>
            </div>
            <div class="organization-catalog-copy-list" data-copy-list role="group" aria-label="เลือกองค์กรที่จะทำสำเนา"></div>
          </section>
          <p class="modal-subtitle">เติมเฉพาะข้อมูลที่ยังว่าง หากรหัสซ้ำกับคนละองค์กร จะใช้เลขถัดจากรหัสสูงสุดของฝ่ายในปีปลายทาง</p>
        </div>
        <div class="modal-footer">
          <button id="organizationCatalogCopyYearCancel" type="button" class="btn-ghost" data-copy-cancel>ยกเลิก</button>
          <button type="button" class="btn-primary" data-copy-submit>ยืนยันทำสำเนา</button>
        </div>
      </div>`;
    const sourceSelect = modalEl.querySelector("[data-copy-source-year]");
    const targetSelect = modalEl.querySelector("[data-copy-year]");
    [sourceSelect, targetSelect].forEach((select) => {
      years.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        const unavailable = select === sourceSelect && !sourceYears.includes(year);
        option.textContent = unavailable ? `${year} — ไม่มีข้อมูล` : year;
        option.disabled = unavailable;
        select.appendChild(option);
      });
    });
    if (!sourceYears.length) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "ยังไม่มีปีต้นทางที่มีข้อมูล";
      sourceSelect.prepend(empty);
      sourceSelect.disabled = true;
    }
    sourceSelect.value = sourceYear;
    targetSelect.value = academicYear;
    const listEl = modalEl.querySelector("[data-copy-list]");
    const allEl = modalEl.querySelector("[data-copy-all]");
    const submitEl = modalEl.querySelector("[data-copy-submit]");
    const syncSelection = () => {
      const selectableCount = rows.filter((row) => !row.conflict).length;
      allEl.checked = selectableCount > 0 && selectedIds.size === selectableCount;
      allEl.disabled = selectableCount === 0;
      allEl.indeterminate = selectedIds.size > 0 && selectedIds.size < selectableCount;
      submitEl.disabled = selectedIds.size === 0;
      modalEl.querySelector("[data-copy-selected]").textContent = `เลือก ${selectedIds.size.toLocaleString("th-TH")} จาก ${rows.length.toLocaleString("th-TH")} องค์กร`;
      ["new", "existing"].forEach((key) => {
        const count = rows.filter((row) => selectedIds.has(row.id) && row.existing === (key === "existing")).length;
        modalEl.querySelector(`[data-copy-count="${key}"]`).textContent = `${count.toLocaleString("th-TH")} องค์กร`;
      });
    };
    const renderRows = () => {
      sourceYear = sourceSelect.value;
      academicYear = targetSelect.value;
      const updates = sourceYears.includes(sourceYear) ? allocateOrganizationCatalogCopyCodes(buildOrganizationCatalogBackfillUpdates({ academicYear, sourceYear }), academicYear) : [];
      const conflicts = getOrganizationCatalogCopyConflicts(updates, academicYear);
      rows = buildOrganizationCatalogCopyPreview({ backfill: updates, normalize: [], link: [], sourceYear });
      rows.forEach((row) => { row.conflict = conflicts.get(row.id) || ""; });
      selectedIds.clear();
      rows.filter((row) => !row.conflict).forEach((row) => selectedIds.add(row.id));
      listEl.replaceChildren();
      if (!rows.length) {
        const empty = document.createElement("p");
        empty.textContent = !sourceYears.length ? "ยังไม่มีข้อมูลองค์กรสำหรับทำสำเนา" : sourceYear === academicYear ? "กรุณาเลือกปีต้นทางและปลายทางให้ต่างกัน" : "ไม่มีข้อมูลจากปีต้นทางที่ต้องทำสำเนาไปยังปีปลายทางนี้";
        listEl.appendChild(empty);
      }
    rows.forEach((row) => {
      const option = document.createElement("div");
      option.className = "organization-catalog-copy-item";
      const label = document.createElement("label");
      label.className = "organization-catalog-copy-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !row.conflict;
      checkbox.disabled = Boolean(row.conflict);
      checkbox.dataset.copyId = row.id;
      const details = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = row.name;
      const meta = document.createElement("span");
      meta.className = "modal-subtitle";
      meta.textContent = [row.group, row.code].filter(Boolean).join(" · ");
      const origin = document.createElement("span");
      origin.textContent = `จาก: ${row.sources.join(" / ")}`;
      const destination = document.createElement("span");
      destination.textContent = `ไป: ${row.name} · ปีการศึกษา ${academicYear} (${row.existing ? "มีรายการอยู่แล้ว" : "สร้างรายการใหม่"})`;
      const status = document.createElement("span");
      status.className = "organization-catalog-copy-status";
      status.textContent = row.conflict ? "รหัสซ้ำ" : row.existing ? "เติมข้อมูล" : "สร้างใหม่";
      if (row.conflict) {
        const warning = document.createElement("p");
        warning.className = "organization-catalog-copy-conflict";
        warning.textContent = row.conflict;
        option.appendChild(warning);
      }
      details.append(name, meta);
      const copyDetails = document.createElement("div");
      copyDetails.className = "organization-catalog-copy-details";
      copyDetails.append(origin, destination);
      if (row.copyRenumber) {
        const allocation = document.createElement("p");
        allocation.className = "organization-catalog-copy-renumber";
        allocation.textContent = `ปรับรหัสที่ซ้ำเป็นเลขถัดจากรหัสสูงสุดของฝ่าย: ${row.copyRenumber}`;
        copyDetails.appendChild(allocation);
      }
      const copiedData = document.createElement("span");
      copiedData.className = "organization-catalog-copy-data";
      const copiedTitle = document.createElement("strong");
      copiedTitle.textContent = "ข้อมูลที่จะนำไปใช้";
      copiedData.appendChild(copiedTitle);
      const values = Object.values(row.copyValues);
      if (values.length) {
        values.forEach(({ label: fieldLabel, value }) => {
          const field = document.createElement("span");
          field.textContent = `${fieldLabel}: ${value}`;
          copiedData.appendChild(field);
        });
      } else {
        const note = document.createElement("span");
        note.textContent = "เชื่อมรายการปีปลายทางกับองค์กรต้นทางเท่านั้น ไม่มีการสำเนาชื่อ รหัส เลขที่หนังสือ หรือเลขบัญชี";
        copiedData.appendChild(note);
      }
      copyDetails.appendChild(copiedData);
      label.append(checkbox, details, status);
      option.append(label, copyDetails);
      listEl.appendChild(option);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedIds.add(row.id);
        else selectedIds.delete(row.id);
        syncSelection();
      });
    });
      syncSelection();
    };
    sourceSelect.addEventListener("change", renderRows);
    targetSelect.addEventListener("change", renderRows);
    renderRows();
    allEl.addEventListener("change", () => {
      selectedIds.clear();
      listEl.querySelectorAll("input").forEach((checkbox) => {
        checkbox.checked = allEl.checked && !checkbox.disabled;
        if (checkbox.checked) selectedIds.add(checkbox.dataset.copyId);
      });
      syncSelection();
    });
    syncSelection();
    document.body.appendChild(modalEl);
    return new Promise((resolve) => {
      const finish = (confirmed) => {
        closeDialog(modalEl);
        modalEl.remove();
        resolve(confirmed ? { selectedIds: new Set(selectedIds), sourceYear, academicYear } : null);
      };
      modalEl.querySelectorAll("[data-copy-cancel]").forEach((button) => {
        button.addEventListener("click", () => finish(false));
      });
      submitEl.addEventListener("click", () => {
        if (selectedIds.size) finish(true);
      });
      modalEl.addEventListener("click", (event) => {
        if (event.target === modalEl) finish(false);
      });
      modalEl.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      });
      openDialog(modalEl, { focusSelector: "#organizationCatalogCopyYearCancel" });
    });
  };

  let organizationCatalogCopyYearPending = false;
  const copyOrganizationCatalogSelectedYear = async () => {
    if (organizationCatalogCopyYearPending) return;
    let academicYear = getOrganizationCatalogDisplayAcademicYear();
    const messageEl = organizationCatalogImportMessageEl || organizationCatalogFormMessageEl;
    if (!resolveStore() || !firestore.setDoc || !firestore.doc) {
      setMessage(messageEl, "ระบบยังไม่พร้อมบันทึก Firebase", "#b91c1c");
      return;
    }

    organizationCatalogCopyYearPending = true;
    let selection;
    try {
      selection = await askOrganizationCatalogCopyYearConfirm({ academicYear });
    } finally {
      organizationCatalogCopyYearPending = false;
    }
    if (!selection?.selectedIds?.size) return;
    const { selectedIds, sourceYear } = selection;
    academicYear = selection.academicYear;
    if (!/^\d{4}$/.test(sourceYear) || !/^\d{4}$/.test(academicYear) || sourceYear === academicYear) return;

    const currentUser = readCurrentUser();
    const updatedBy = (currentUser?.email || getCurrentAuthEmail() || "").toString().trim().toLowerCase();
    const timestampValue = firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString();
    const counts = { backfill: 0, normalize: 0, link: 0 };
    try {
      organizationCatalogCopyYearPending = true;
      if (organizationCatalogCopyYearBtnEl) organizationCatalogCopyYearBtnEl.disabled = true;
      setMessage(messageEl, `กำลังทำสำเนาข้อมูลองค์กรปี ${academicYear}...`, "#1d4ed8");

      const backfillUpdates = allocateOrganizationCatalogCopyCodes(buildOrganizationCatalogBackfillUpdates({ academicYear, sourceYear }), academicYear).filter((item) => selectedIds.has(item.id));
      const conflicts = getOrganizationCatalogCopyConflicts(backfillUpdates, academicYear);
      if (conflicts.size) throw new Error([...conflicts.values()][0]);
      if (backfillUpdates.length) {
        await writeOrganizationCatalogUpdateItems(backfillUpdates, { updatedBy, timestampValue });
        applyOrganizationCatalogUpdateItems(backfillUpdates);
        counts.backfill = backfillUpdates.length;
      }

      renderOrganizationCatalogTable();
      renderOrgRepresentativeApplications();
      setMessage(
        messageEl,
        `ทำสำเนาจากปี ${sourceYear} ไปปี ${academicYear} แล้ว ${counts.backfill.toLocaleString("th-TH")} องค์กร`,
        "#047857"
      );
    } catch (error) {
      console.error("copy organization catalog year failed - app.staff-access.js:4698", error);
      const message = (error?.code || "") === "permission-denied"
        ? "ไม่มีสิทธิ์ทำสำเนาทะเบียนองค์กร"
        : (error?.message || "ทำสำเนาทะเบียนองค์กรไม่สำเร็จ");
      setMessage(messageEl, message, "#b91c1c");
    } finally {
      organizationCatalogCopyYearPending = false;
      if (organizationCatalogCopyYearBtnEl) organizationCatalogCopyYearBtnEl.disabled = false;
    }
  };

