  const buildSearchText = (row) => {
    if (row.searchText) return row.searchText;
    const searchText = [
      row.type,
      row.code,
      row.name,
      row.location,
      row.remaining,
      row.unit,
      row.approvedText,
      row.note
    ]
      .map((value) => (value == null ? "" : String(value).toLowerCase()))
      .join(" ");
    row.searchText = searchText;
    return searchText;
  };

  const filterBorrowAssetsRows = ({ term, type }) => {
    const normalized = term.trim().toLowerCase();
    const normalizedType = type === "all" ? "" : type.trim().toLowerCase();
    return borrowAssetsRows.filter((row) => {
      const typeMatch =
        !normalizedType || (row.type || "").toLowerCase() === normalizedType;
      const searchMatch =
        !normalized || buildSearchText(row).includes(normalized);
      return typeMatch && searchMatch;
    });
  };

  const renderBorrowAssetsTable = (rows) => {
    if (!borrowAssetsTableBody) return;
    if (!rows.length) {
      borrowAssetsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="list-empty-cell">${renderListEmptyState("ไม่พบรายการพัสดุ", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "box")}</td>
        </tr>
      `;
      return;
    }
    borrowAssetsTableBody.innerHTML = rows
      .map((row) => {
        const remainingText =
          row.remaining != null
            ? `${row.remaining}${row.unit ? ` ${row.unit}` : ""}`
            : "-";
        return `
          <tr>
            <td data-label="ประเภท">${safeEscape(row.type || "-")}</td>
            <td data-label="รหัส">${safeEscape(row.code || "-")}</td>
            <td data-label="รายการ">${safeEscape(row.name || "-")}</td>
            <td data-label="ที่เก็บ">${safeEscape(row.location || "-")}</td>
            <td data-label="คงเหลือ">${safeEscape(remainingText)}</td>
            <td data-label="หมายเหตุ">${safeEscape(row.note || "-")}</td>
          </tr>
        `;
      })
      .join("");
  };

  const renderBorrowAssetsTableStaff = (rows) => {
    if (!borrowAssetsTableBodyStaff) return;
    if (!rows.length) {
      renderBorrowAssetsStaffPager({ total: 0 });
      borrowAssetsTableBodyStaff.innerHTML = `
        <tr>
          <td colspan="11" class="list-empty-cell">${renderListEmptyState("ไม่พบรายการพัสดุ", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "box")}</td>
        </tr>
      `;
      return;
    }
    const pageMeta = getPagedStaffAssetsRows(rows, staffAssetsPage);
    staffAssetsPage = pageMeta.currentPage;
    renderBorrowAssetsStaffPager(pageMeta);
    borrowAssetsTableBodyStaff.innerHTML = pageMeta.rows
      .map((row) => `
        <tr class="borrow-assets-staff-row">
          <td data-label="ประเภท">${safeEscape(row.type || "-")}</td>
          <td data-label="รหัสพัสดุ">${safeEscape(row.code || "-")}</td>
          <td data-label="รายการ">${safeEscape(row.name || "-")}</td>
          <td data-label="ที่เก็บ">${safeEscape(row.location || "-")}</td>
          <td data-label="จำนวนทั้งหมด">${safeEscape(row.total != null ? row.total : "-")}</td>
          <td data-label="อนุมัติการยืม">${safeEscape(row.approvedText || "-")}</td>
          <td data-label="ยืมอยู่">${safeEscape(row.borrowed != null ? row.borrowed : "-")}</td>
          <td data-label="ชำรุด">${safeEscape(row.damaged != null ? row.damaged : "-")}</td>
          <td data-label="คงเหลือ">${safeEscape(row.remaining != null ? row.remaining : "-")}</td>
          <td data-label="หน่วย">${safeEscape(row.unit || "-")}</td>
          <td data-label="หมายเหตุ">${safeEscape(row.note || "-")}</td>
        </tr>
      `)
      .join("");
  };

  const applyBorrowAssetsFilters = () => {
    if (borrowAssetsTableBody) {
      const term = borrowAssetsSearch ? borrowAssetsSearch.value : "";
      const type = borrowAssetsTypeFilter ? borrowAssetsTypeFilter.value : "all";
      const rows = filterBorrowAssetsRows({ term, type });
      renderBorrowAssetsTable(rows);
      if (borrowAssetsCount) {
        borrowAssetsCount.textContent = `พบ ${rows.length} รายการ`;
      }
    }
    if (borrowAssetsTableBodyStaff) {
      const term = borrowAssetsSearchStaff ? borrowAssetsSearchStaff.value : "";
      const type = borrowAssetsTypeFilterStaff ? borrowAssetsTypeFilterStaff.value : "all";
      const rows = filterBorrowAssetsRows({ term, type });
      renderBorrowAssetsTableStaff(rows);
      if (borrowAssetsCountStaff) {
        borrowAssetsCountStaff.textContent = `พบ ${rows.length} รายการ`;
      }
    }
  };

  const syncTypeOptions = (types) => {
    const sorted = Array.from(new Set(types)).sort((a, b) => a.localeCompare(b, "th"));
    const populateSelect = (selectEl) => {
      if (!selectEl) return;
      while (selectEl.options.length > 1) {
        selectEl.remove(1);
      }
      sorted.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        selectEl.appendChild(option);
      });
    };
    populateSelect(borrowAssetsTypeFilter);
    populateSelect(borrowAssetsTypeFilterStaff);
  };

  const loadBorrowAssets = async () => {
    if (!USE_CSV_ASSET_CATALOG) {
      borrowAssetsRows = [];
      assetMap.clear();
      assetRowMap.clear();
      if (borrowAssetsTableBody) {
        borrowAssetsTableBody.innerHTML = `
          <tr>
            <td colspan="6">ปิดการใช้งานข้อมูลพัสดุจาก CSV ชั่วคราว</td>
          </tr>
        `;
      }
      if (borrowAssetsTableBodyStaff) {
        borrowAssetsTableBodyStaff.innerHTML = `
          <tr>
            <td colspan="11">ปิดการใช้งานข้อมูลพัสดุจาก CSV ชั่วคราว</td>
          </tr>
        `;
      }
      if (borrowAssetsCount) borrowAssetsCount.textContent = "ปิดการใช้งาน CSV ชั่วคราว";
      if (borrowAssetsCountStaff) borrowAssetsCountStaff.textContent = "ปิดการใช้งาน CSV ชั่วคราว";
      return;
    }
    await window.sgcuVendorLoader?.ensurePapa?.();
    if (!window.Papa || !window.fetch || !BORROW_ASSETS_CSV_URL) return;
    fetch(BORROW_ASSETS_CSV_URL)
      .then((res) => res.text())
      .then((csvText) => {
        const result = window.Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        });
        if (result.errors && result.errors.length) return;
        const rows = result.data
          .map((item) => {
            const type = (item["ประเภท"] || "").trim();
            const code = (item["รหัสพัสดุ"] || "").trim().toUpperCase();
            const name = (item["รายการ"] || "").trim();
            const location = (item["ที่เก็บ"] || "").trim();
            const approved = normalizeBool(item["อนุมัติการยืม"]);
            const approvedText = (item["อนุมัติการยืม"] || "").toString().trim();
            const total = parseNumber(item["จำนวนทั้งหมด"]);
            const borrowed = parseNumber(item["ยืมอยู่"]);
            const damaged = parseNumber(item["ชำรุด"]);
            const remaining = parseNumber(item["คงเหลือ"]);
            const unit = (item["หน่วย"] || "").trim();
            const note = (item["หมายเหตุ"] || "").trim();
            return {
              type,
              code,
              name,
              location,
              approved,
              approvedText,
              total,
              borrowed,
              damaged,
              remaining,
              unit,
              note
            };
          })
          .filter((row) => row.code || row.name);

        borrowAssetsRows = rows;
        assetMap.clear();
        assetRowMap.clear();
        rows.forEach((row) => {
          if (row.code && row.name) {
            assetMap.set(row.code, row.name);
            assetRowMap.set(row.code, row);
          }
        });
        syncTypeOptions(rows.map((row) => row.type).filter(Boolean));
        applyBorrowAssetsFilters();
        if (borrowAssetList) {
          borrowAssetList.querySelectorAll("[data-asset-row]").forEach((row) => {
            const codeInput = row.querySelector('[data-asset-field="code"]');
            if (codeInput) codeInput.dispatchEvent(new Event("input"));
          });
        }
      })
      .catch(() => {
        if (borrowAssetsTableBody) {
          borrowAssetsTableBody.innerHTML = `
            <tr>
              <td colspan="6">ไม่สามารถโหลดรายการพัสดุได้</td>
            </tr>
          `;
        }
        if (borrowAssetsTableBodyStaff) {
          borrowAssetsTableBodyStaff.innerHTML = `
            <tr>
              <td colspan="11">ไม่สามารถโหลดรายการพัสดุได้</td>
            </tr>
          `;
        }
      });
  };

  const updateRowIds = (row, index) => {
    row.querySelectorAll("[data-asset-field]").forEach((input) => {
      const field = input.dataset.assetField;
      const id = `borrowAsset${field.charAt(0).toUpperCase()}${field.slice(1)}-${index}`;
      input.id = id;
      const label = row.querySelector(`[data-asset-label="${field}"]`);
      if (label) label.setAttribute("for", id);
    });
  };

  const bindRow = (row) => {
    const codeInput = row.querySelector('[data-asset-field="code"]');
    const nameInput = row.querySelector('[data-asset-field="name"]');
    const warning = row.querySelector("[data-asset-warning]");
    const removeBtn = row.querySelector("[data-asset-remove]");
    if (!codeInput || !nameInput) return;

    const setWarningState = (visible, text = "", color = "#b91c1c") => {
      if (!warning) return;
      warning.textContent = text;
      warning.style.color = color;
      warning.hidden = !visible;
    };

    const setNameManualMode = (manualMode) => {
      nameInput.readOnly = !manualMode;
      nameInput.required = true;
      nameInput.placeholder = manualMode
        ? "กรอกชื่อพัสดุ"
        : "ระบบจะแสดงชื่อพัสดุอัตโนมัติ";
    };

    const updateName = () => {
      if (!USE_CSV_ASSET_CATALOG) {
        setNameManualMode(true);
        setWarningState(false);
        return;
      }
      const code = codeInput.value.trim().toUpperCase();
      if (!code) {
        setNameManualMode(true);
        setWarningState(false);
        return;
      }
      const name = assetMap.get(code);
      if (name) {
        nameInput.value = name;
        setNameManualMode(false);
        setWarningState(false);
        return;
      }
      setNameManualMode(true);
      setWarningState(
        true,
        "ไม่พบรหัสพัสดุในรายการ สามารถกรอกชื่อพัสดุแทนได้",
        "#92400e"
      );
    };

    codeInput.addEventListener("input", updateName);
    codeInput.addEventListener("blur", updateName);
    codeInput.required = false;
    if (!USE_CSV_ASSET_CATALOG) {
      setNameManualMode(true);
      setWarningState(false);
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        const rows = borrowAssetList.querySelectorAll("[data-asset-row]");
        if (rows.length <= 1) return;
        row.remove();
      });
    }
  };

  const resetAssetRows = () => {
    if (!borrowAssetList) return;
    const rows = Array.from(borrowAssetList.querySelectorAll("[data-asset-row]"));
    if (!rows.length) return;
    rows.slice(1).forEach((row) => row.remove());
    const firstRow = rows[0];
    updateRowIds(firstRow, 1);
    firstRow.querySelectorAll("input").forEach((input) => {
      input.value = "";
    });
    const warning = firstRow.querySelector("[data-asset-warning]");
    if (warning) warning.hidden = true;
    const removeBtn = firstRow.querySelector("[data-asset-remove]");
    if (removeBtn) removeBtn.hidden = true;
    const codeInput = firstRow.querySelector('[data-asset-field="code"]');
    if (codeInput) codeInput.dispatchEvent(new Event("input"));
  };

  const clearBorrowRequestForm = () => {
    if (!borrowRequestForm) return;
    borrowRequestForm.reset();
    populateBorrowProjectTypeOptions();
    toggleBorrowProjectNameOther();
    renderManagedBorrowProjects();
    resetAssetRows();
    setBorrowMessage("ล้างข้อมูลที่กรอกแล้ว", "#374151");
  };

  const collectAssetItems = () => {
    if (!borrowAssetList) {
      return { ok: false, message: "ไม่พบฟอร์มรายการพัสดุ" };
    }
    const rows = Array.from(borrowAssetList.querySelectorAll("[data-asset-row]"));
    const assetItems = [];
    const requestByCode = new Map();

    for (const row of rows) {
      const codeInput = row.querySelector('[data-asset-field="code"]');
      const nameInput = row.querySelector('[data-asset-field="name"]');
      const qtyInput = row.querySelector('[data-asset-field="qty"]');
      const warning = row.querySelector("[data-asset-warning]");
      if (!codeInput || !nameInput || !qtyInput) continue;

      const code = codeInput.value.trim().toUpperCase();
      const qty = Number(qtyInput.value);
      const mappedName = assetMap.get(code);
      const assetRow = assetRowMap.get(code);
      if (USE_CSV_ASSET_CATALOG) {
        const typedName = nameInput.value.trim();
        if (!code) {
          if (!typedName) {
            return { ok: false, message: "กรุณากรอกชื่อพัสดุเมื่อไม่ระบุรหัสพัสดุ" };
          }
          if (warning) warning.hidden = true;
        } else if (!mappedName || !assetRow) {
          if (!typedName) {
            if (warning) warning.hidden = false;
            return { ok: false, message: "ไม่พบรหัสพัสดุ กรุณากรอกชื่อพัสดุแทน" };
          }
          if (warning) {
            warning.hidden = false;
            warning.textContent = "ไม่พบรหัสพัสดุในรายการ ระบบจะใช้ชื่อพัสดุที่กรอกแทน";
            warning.style.color = "#92400e";
          }
        } else {
          nameInput.value = mappedName;
          if (warning) warning.hidden = true;
        }
      } else {
        if (!code || !nameInput.value.trim()) {
          return { ok: false, message: "กรุณากรอกรหัสพัสดุและชื่อพัสดุให้ครบ" };
        }
        if (warning) warning.hidden = true;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        qtyInput.focus();
        return { ok: false, message: `จำนวนของ ${code} ต้องมากกว่า 0` };
      }
      if (USE_CSV_ASSET_CATALOG && ENABLE_ASSET_AVAILABILITY_CHECK) {
        if (code && assetRow) {
          if (assetRow.remaining != null) {
            const currentRequested = requestByCode.get(code) || 0;
            const nextRequested = currentRequested + qty;
            if (nextRequested > assetRow.remaining) {
              qtyInput.focus();
              return {
                ok: false,
                message: `พัสดุ ${code} คงเหลือ ${assetRow.remaining} ${assetRow.unit || ""}`.trim()
              };
            }
            requestByCode.set(code, nextRequested);
          }
        }
      }

      assetItems.push({
        code,
        name: USE_CSV_ASSET_CATALOG
          ? ((mappedName && assetRow) ? mappedName : nameInput.value.trim())
          : nameInput.value.trim(),
        qty: Math.trunc(qty),
        unit: USE_CSV_ASSET_CATALOG ? ((code && assetRow) ? (assetRow.unit || "") : "") : ""
      });
    }

    if (!assetItems.length) {
      return { ok: false, message: "กรุณาเพิ่มรายการพัสดุอย่างน้อย 1 รายการ" };
    }
    return { ok: true, items: assetItems };
  };

