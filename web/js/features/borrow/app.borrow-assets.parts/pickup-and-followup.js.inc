  const normalizeAllowedPickupDays = (value) => {
    const source = Array.isArray(value) ? value : DEFAULT_ALLOWED_PICKUP_DAYS;
    const days = source
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
    const unique = Array.from(new Set(days));
    return unique.length ? unique : DEFAULT_ALLOWED_PICKUP_DAYS;
  };

  const getAllowedPickupDays = () =>
    normalizeAllowedPickupDays(globalThis.SGCU_APP_CONFIG?.features?.borrowAssets?.allowedPickupDays);

  const formatAllowedPickupDays = (days) => {
    const ordered = WEEKDAY_DISPLAY_ORDER.filter((day) => days.includes(day));
    if (ordered.length === 7) return "ทุกวัน";
    return ordered.map((day) => WEEKDAY_NAMES_TH[day]).join(" / ");
  };

  const updateBorrowPickupDateRule = () => {
    if (!borrowPickupDateRule) return;
    const project = borrowProjectName?.value === BORROW_PROJECT_ORG
      ? managedBorrowProjects.find(item => item.id === borrowManagedProject?.value) : null;
    const dayText = formatAllowedPickupDays(project?.customWeekdays ? project.pickupDays : getAllowedPickupDays());
    const returnRule = document.getElementById("borrowReturnDateRule");
    if (returnRule) returnRule.textContent = "คืนได้ทุกวัน โดยไม่ก่อนวันรับพัสดุ";
    borrowPickupDateRule.textContent = dayText === "ทุกวัน"
      ? "รับพัสดุได้ทุกวัน เวลา 16.00 น."
      : `รับพัสดุได้เฉพาะวัน${dayText} เวลา 16.00 น.`;
  };

  const setStaffBorrowPickupDaysMessage = (text = "", tone = "") => {
    if (!staffBorrowPickupDaysMessage) return;
    staffBorrowPickupDaysMessage.textContent = text;
    staffBorrowPickupDaysMessage.dataset.tone = tone;
  };

  const fillStaffBorrowPickupDays = (days = getAllowedPickupDays()) => {
    const allowedDays = normalizeAllowedPickupDays(days);
    staffBorrowPickupDayInputs.forEach((input) => {
      input.checked = allowedDays.includes(Number(input.value));
    });
  };

  const collectStaffBorrowPickupDays = () =>
    staffBorrowPickupDayInputs
      .filter((input) => input.checked)
      .map((input) => Number(input.value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  const getBorrowRuntimeSettingsRef = () => {
    const runtime = window.sgcuRuntimeConfig || {};
    const store = window.sgcuFirestore || firestore || {};
    if (!store.db || !store.doc) return null;
    return store.doc(store.db, runtime.collection || "appSettings", runtime.docId || "global");
  };

  const loadStaffBorrowPickupDays = async () => {
    if (!staffBorrowPickupDayInputs.length) return;
    fillStaffBorrowPickupDays();
    const store = window.sgcuFirestore || {};
    const ref = getBorrowRuntimeSettingsRef();
    if (!ref || !store.getDoc) return;
    try {
      const snap = await store.getDoc(ref);
      if (!snap.exists()) return;
      const remoteConfig = snap.data()?.config || {};
      const remoteDays = remoteConfig.features?.borrowAssets?.allowedPickupDays;
      if (!Array.isArray(remoteDays) || !remoteDays.length) return;
      if (window.sgcuRuntimeConfig?.applyConfig) window.sgcuRuntimeConfig.applyConfig(remoteConfig);
      fillStaffBorrowPickupDays(remoteDays);
      updateBorrowPickupDateRule();
    } catch (error) {
      console.warn("borrow pickup days load failed - app.borrow-assets.js:640", error);
    }
  };

  const saveStaffBorrowPickupDays = async () => {
    if (!staffBorrowPickupDayInputs.length) return;
    if (!ensureStaffPermission()) return;
    const allowedPickupDays = collectStaffBorrowPickupDays();
    if (!allowedPickupDays.length) {
      setStaffBorrowPickupDaysMessage("กรุณาเลือกอย่างน้อย 1 วัน", "error");
      return;
    }
    const store = window.sgcuFirestore || {};
    const ref = getBorrowRuntimeSettingsRef();
    if (!ref || !store.setDoc) {
      setStaffBorrowPickupDaysMessage("ไม่สามารถบันทึกได้ เพราะยังไม่เชื่อมต่อ Firestore", "error");
      return;
    }
    const config = {
      features: {
        borrowAssets: {
          allowedPickupDays: normalizeAllowedPickupDays(allowedPickupDays)
        }
      }
    };
    const normalized = window.sgcuRuntimeConfig?.normalizeSettingsConfig
      ? window.sgcuRuntimeConfig.normalizeSettingsConfig(config)
      : config;
    if (staffBorrowPickupDaysSaveBtn) staffBorrowPickupDaysSaveBtn.disabled = true;
    setStaffBorrowPickupDaysMessage("กำลังบันทึก...", "warning");
    try {
      await store.setDoc(
        ref,
        {
          enabled: true,
          config: normalized,
          updatedAt: store.serverTimestamp ? store.serverTimestamp() : new Date()
        },
        { merge: true }
      );
      if (window.sgcuRuntimeConfig?.applyConfig) window.sgcuRuntimeConfig.applyConfig(normalized);
      fillStaffBorrowPickupDays(normalized.features?.borrowAssets?.allowedPickupDays);
      updateBorrowPickupDateRule();
      setStaffBorrowPickupDaysMessage("บันทึกวันรับพัสดุแล้ว", "success");
    } catch (error) {
      console.error("borrow pickup days save failed - app.borrow-assets.js:695", error);
      setStaffBorrowPickupDaysMessage("บันทึกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ Staff", "error");
    } finally {
      if (staffBorrowPickupDaysSaveBtn) staffBorrowPickupDaysSaveBtn.disabled = false;
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = parseDateYmd(value);
    if (!date) return value;
    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatDateRange = (pickupDate, returnDate) =>
    `${formatDate(pickupDate)} - ${formatDate(returnDate)}`;

  const formatPickupAppointmentNote = (pickupDate) =>
    pickupDate ? `เจ้าหน้าที่นัดรับพัสดุวันที่ ${formatDate(pickupDate)} เวลา 16.00 น.` : "";

  const getDayDiffFromToday = (value) => {
    const date = parseDateYmd(value);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - today.getTime()) / 86400000);
  };

  const isExpiredPendingBorrowRequest = (item) =>
    item?.status === STATUS_PENDING && getDayDiffFromToday(item.returnDate) < 0;

  const isStaffBorrowQueueItem = (item) =>
    STAFF_REQUEST_TAB_STATUSES.has(item?.status) && !isExpiredPendingBorrowRequest(item);

  const isStaffBorrowHistoryItem = (item) =>
    STAFF_HISTORY_TAB_STATUSES.has(item?.status) || isExpiredPendingBorrowRequest(item);

  const summarizeAssetsInline = (assets = []) => {
    const list = Array.isArray(assets) ? assets : [];
    if (!list.length) return "-";
    return list
      .map((asset) => {
        const name = (asset?.name || asset?.code || "-").toString().trim();
        const qty = Number(asset?.qty || 0);
        const qtyText = Number.isFinite(qty) ? String(qty) : "0";
        const unit = (asset?.unit || "").toString().trim();
        return `${name} ${qtyText}${unit ? ` ${unit}` : ""}`.trim();
      })
      .join(", ");
  };

  const buildBorrowFollowupMeta = (item) => {
    if (!item || (item.status !== STATUS_APPROVED && item.status !== STATUS_RECEIVED)) {
      return {
        dayDiff: null,
        overdue: false,
        dueSoon: false,
        statusText: "ยังไม่ถึงขั้นติดตาม",
        badgeClass: "badge-approved"
      };
    }
    const dayDiff = getDayDiffFromToday(item.returnDate);
    if (dayDiff == null) {
      return {
        dayDiff: null,
        overdue: false,
        dueSoon: true,
        statusText: "ต้องติดตาม (ไม่พบวันคืน)",
        badgeClass: "badge-warning"
      };
    }
    if (dayDiff < 0) {
      return {
        dayDiff,
        overdue: true,
        dueSoon: true,
        statusText: `เกินกำหนด ${Math.abs(dayDiff)} วัน`,
        badgeClass: "badge-rejected"
      };
    }
    if (dayDiff === 0) {
      return {
        dayDiff,
        overdue: false,
        dueSoon: true,
        statusText: "ครบกำหนดวันนี้",
        badgeClass: "badge-warning"
      };
    }
    if (dayDiff <= BORROW_FOLLOWUP_SOON_DAYS) {
      return {
        dayDiff,
        overdue: false,
        dueSoon: true,
        statusText: `ครบกำหนดใน ${dayDiff} วัน`,
        badgeClass: "badge-pending"
      };
    }
    return {
      dayDiff,
      overdue: false,
      dueSoon: false,
      statusText: "ยังไม่ถึงกำหนดติดตาม",
      badgeClass: "badge-approved"
    };
  };

  const renderBorrowOverviewCards = (container, stats = {}) => {
    if (!container) return;
    const cards = [
      { title: "ยืมค้างทั้งหมด", value: stats.borrowed || 0, caption: "อนุมัติแล้วและยังไม่คืน" },
      { title: "เกินกำหนดคืน", value: stats.overdue || 0, caption: "ควรเร่งติดตามทันที" },
      { title: "ใกล้ครบกำหนด", value: stats.dueSoon || 0, caption: `ภายใน ${BORROW_FOLLOWUP_SOON_DAYS} วัน` },
      {
        title: stats.pendingTitle || "รออนุมัติ",
        value: stats.pending || 0,
        caption: stats.pendingCaption || "ยังอยู่ในคิวพิจารณา"
      }
    ];
    container.innerHTML = cards.map((card) => `
      <article class="card card-hover">
        <div class="card-title">${safeEscape(card.title)}</div>
        <div class="card-value">${safeEscape(String(card.value))}</div>
        <div class="card-caption">${safeEscape(card.caption)}</div>
      </article>
    `).join("");
  };

  const renderMyBorrowOverview = () => {
    if (!borrowOverviewCards && !borrowFollowupTableBody) return;
    if (!currentUserEmail) {
      renderBorrowOverviewCards(borrowOverviewCards, {
        borrowed: 0,
        overdue: 0,
        dueSoon: 0,
        pending: 0
      });
      if (borrowFollowupTableBody) {
        borrowFollowupTableBody.innerHTML = `
          <tr>
            <td colspan="3">กรุณาเข้าสู่ระบบเพื่อดูภาพรวมพัสดุที่ยืม</td>
          </tr>
        `;
      }
      return;
    }
    const mine = borrowRequests
      .filter((item) => !item.isDeleted)
      .filter((item) => matchesCurrentAccountEmail(item.requesterEmail, item.accountEmail));
    const pending = mine.filter((item) => item.status === STATUS_PENDING).length;
    const borrowed = mine.filter((item) => item.status === STATUS_APPROVED || item.status === STATUS_RECEIVED).length;
    const overdue = mine.filter((item) => buildBorrowFollowupMeta(item).overdue).length;
    const dueSoon = mine.filter((item) => {
      const meta = buildBorrowFollowupMeta(item);
      return meta.dueSoon && !meta.overdue;
    }).length;
    renderBorrowOverviewCards(borrowOverviewCards, { pending, borrowed, overdue, dueSoon });

    if (!borrowFollowupTableBody) return;
    const followups = mine
      .map((item) => ({ item, meta: buildBorrowFollowupMeta(item) }))
      .filter((entry) => entry.meta.dueSoon)
      .sort((a, b) => {
        if (a.meta.overdue !== b.meta.overdue) return a.meta.overdue ? -1 : 1;
        const aDiff = a.meta.dayDiff == null ? -9999 : a.meta.dayDiff;
        const bDiff = b.meta.dayDiff == null ? -9999 : b.meta.dayDiff;
        return aDiff - bDiff;
      });
    if (!followups.length) {
      borrowFollowupTableBody.innerHTML = `
        <tr>
          <td colspan="3" class="list-empty-cell">${renderListEmptyState("ยังไม่มีรายการที่ต้องติดตาม", "รายการพัสดุที่ต้องติดตามจะแสดงที่นี่", "box")}</td>
        </tr>
      `;
      return;
    }
    borrowFollowupTableBody.innerHTML = followups.map(({ item, meta }) => `
      <tr>
        <td>
          <div class="borrow-followup-item">${safeEscape(summarizeAssetsInline(item.assets))}</div>
          <div class="borrow-followup-item-sub">เลขที่คำขอ: ${safeEscape(item.requestNo || item.id || "-")}</div>
        </td>
        <td>${safeEscape(formatDate(item.returnDate || ""))}</td>
        <td><span class="badge ${safeEscape(meta.badgeClass)}">${safeEscape(meta.statusText)}</span></td>
      </tr>
    `).join("");
  };

  const renderStaffBorrowOverview = (items = null) => {
    if (!staffBorrowOverviewCards && !staffBorrowFollowupTableBody) return;
    const allItems = Array.isArray(items)
      ? items.filter((item) => !item.isDeleted)
      : borrowRequests.filter((item) => !item.isDeleted);
    const pending = allItems.filter((item) => item.status === STATUS_PENDING).length;
    const borrowed = allItems.filter((item) => item.status === STATUS_APPROVED || item.status === STATUS_RECEIVED).length;
    const overdue = allItems.filter((item) => buildBorrowFollowupMeta(item).overdue).length;
    const dueSoon = allItems.filter((item) => {
      const meta = buildBorrowFollowupMeta(item);
      return meta.dueSoon && !meta.overdue;
    }).length;
    renderBorrowOverviewCards(staffBorrowOverviewCards, {
      pending,
      borrowed,
      overdue,
      dueSoon,
      pendingTitle: staffRequestTabMode === "history" ? "เลยกำหนดก่อนอนุมัติ" : "รออนุมัติ",
      pendingCaption: staffRequestTabMode === "history" ? "เลยวันคืนโดยยังไม่ได้อนุมัติ" : "ยังอยู่ในคิวพิจารณา"
    });

    if (!staffBorrowFollowupTableBody) return;
    const followups = allItems
      .map((item) => ({ item, meta: buildBorrowFollowupMeta(item) }))
      .filter((entry) => entry.meta.dueSoon)
      .sort((a, b) => {
        if (a.meta.overdue !== b.meta.overdue) return a.meta.overdue ? -1 : 1;
        const aDiff = a.meta.dayDiff == null ? -9999 : a.meta.dayDiff;
        const bDiff = b.meta.dayDiff == null ? -9999 : b.meta.dayDiff;
        return aDiff - bDiff;
      });
    if (!followups.length) {
      staffBorrowFollowupTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="list-empty-cell">${renderListEmptyState("ยังไม่มีรายการที่ต้องติดตาม", "รายการพัสดุที่ต้องติดตามจะแสดงที่นี่", "box")}</td>
        </tr>
      `;
      return;
    }
    staffBorrowFollowupTableBody.innerHTML = followups.map(({ item, meta }) => {
      const requesterName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "-";
      return `
        <tr class="borrow-staff-row">
          <td>${safeEscape(item.requestNo || item.id || "-")}</td>
          <td>${safeEscape(requesterName)}</td>
          <td>${safeEscape(summarizeAssetsInline(item.assets))}</td>
          <td>${safeEscape(formatDate(item.returnDate || ""))}</td>
          <td><span class="badge ${safeEscape(meta.badgeClass)}">${safeEscape(meta.statusText)}</span></td>
        </tr>
      `;
    }).join("");
  };

  const timestampToMillis = (ts) => {
    if (!ts) return 0;
    if (typeof ts === "number" && Number.isFinite(ts)) return ts;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") {
      return (ts.seconds * 1000) + Math.floor((ts.nanoseconds || 0) / 1000000);
    }
    return 0;
  };

  const normalizeRequestStatus = (value) => {
    const normalized = (value || STATUS_PENDING).toString().trim().toLowerCase();
    if (
      normalized === STATUS_PENDING ||
      normalized === STATUS_APPROVED ||
      normalized === STATUS_RECEIVED ||
      normalized === STATUS_REJECTED ||
      normalized === STATUS_CANCELLED ||
      normalized === STATUS_RETURNED
    ) {
      return normalized;
    }
    return STATUS_PENDING;
  };

  const isReservedStockStatus = (status) => {
    const normalized = normalizeRequestStatus(status);
    return normalized === STATUS_APPROVED || normalized === STATUS_RECEIVED;
  };

  const toSafeInt = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.trunc(num));
  };

  const buildAssetQtyByCode = (assets = []) => {
    const qtyByCode = new Map();
    if (!Array.isArray(assets)) return qtyByCode;
    assets.forEach((asset) => {
      const code = (asset?.code || "").toString().trim().toUpperCase();
      if (!code) return;
      const qty = toSafeInt(asset?.qty);
      if (!qty) return;
      qtyByCode.set(code, (qtyByCode.get(code) || 0) + qty);
    });
    return qtyByCode;
  };

  const buildReservationDeltas = (prevStatus, nextStatus, assets = [], nextAssets = assets) => {
    const wasReserved = isReservedStockStatus(prevStatus);
    const willBeReserved = isReservedStockStatus(nextStatus);
    const previousQtyByCode = wasReserved ? buildAssetQtyByCode(assets) : new Map();
    const nextQtyByCode = willBeReserved ? buildAssetQtyByCode(nextAssets) : new Map();
    const codes = new Set([...previousQtyByCode.keys(), ...nextQtyByCode.keys()]);
    const deltas = new Map();
    codes.forEach((code) => {
      const delta = (nextQtyByCode.get(code) || 0) - (previousQtyByCode.get(code) || 0);
      if (delta) deltas.set(code, delta);
    });
    return deltas;
  };

  const makeBorrowStockDocId = (code = "") => {
    const normalized = (code || "").toString().trim().toUpperCase();
    if (!normalized) return "";
    return encodeURIComponent(normalized).replace(/\./g, "%2E");
  };

  const formatBorrowStatusUpdateError = (error, fallback = "อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่") => {
    const code = (error?.code || "").toString().trim().replace(/^firestore\//, "");
    const message = (error?.message || "").toString().trim();
    if (code === "permission-denied") return "ไม่มีสิทธิ์ดำเนินการกับคำขอนี้ (Firestore Rules)";
    if (code === "borrow/insufficient-stock") return "อนุมัติไม่สำเร็จ: พัสดุคงเหลือไม่พอ";
    if (code === "resource-exhausted") return "โควตาฐานข้อมูลเต็ม ยังดำเนินการไม่ได้ (resource-exhausted)";
    if (code === "unavailable") return "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
    if (code === "unauthenticated") return "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    if (code === "not-found") return "ไม่พบคำขอนี้ในระบบ";
    if (code === "invalid-argument") return `อัปเดตสถานะไม่สำเร็จ (invalid-argument${message ? `: ${message}` : ""})`;
    if (code) return `${fallback} (${code}${message ? `: ${message}` : ""})`;
    return message ? `${fallback} (${message})` : fallback;
  };

  const applyStockDeltasInTransaction = async (transaction, deltas, actorEmail = "") => {
    if (!deltas.size) return;
    const stockUpdates = [];
    for (const [code, delta] of deltas.entries()) {
      if (!code || !delta) continue;
      const catalogRow = assetRowMap.get(code);
      const maxRemaining = Number(catalogRow?.remaining);
      const hasFiniteLimit = Number.isFinite(maxRemaining) && maxRemaining >= 0;
      if (!hasFiniteLimit) continue;

      const stockDocId = makeBorrowStockDocId(code);
      if (!stockDocId) continue;
      const stockRef = firestore.doc(firestore.db, BORROW_ASSET_STOCK_COLLECTION, stockDocId);
      stockUpdates.push({ code, delta, maxRemaining, stockRef });
    }

    const stockSnapshots = [];
    for (const item of stockUpdates) {
      stockSnapshots.push(await transaction.get(item.stockRef));
    }

    stockUpdates.forEach((item, index) => {
      const stockSnap = stockSnapshots[index];
      const currentReserved = toSafeInt(stockSnap.data()?.reserved);
      let nextReserved = currentReserved + item.delta;

      if (ENABLE_ASSET_AVAILABILITY_CHECK && item.delta > 0 && nextReserved > item.maxRemaining) {
        const err = new Error(`พัสดุ ${item.code} คงเหลือไม่พอ`);
        err.code = "borrow/insufficient-stock";
        err.assetCode = item.code;
        err.available = Math.max(0, item.maxRemaining - currentReserved);
        throw err;
      }
      if (nextReserved < 0) nextReserved = 0;

      transaction.set(
        item.stockRef,
        {
          code: item.code,
          reserved: nextReserved,
          maxRemaining: item.maxRemaining,
          updatedBy: actorEmail || "",
          updatedAt: firestore.serverTimestamp()
        },
        { merge: true }
      );
    });
  };

  const normalizeDeletedFlag = (value) => {
    if (typeof value === "boolean") return value;
    const normalized = (value || "").toString().trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
  };

  const statusBadge = (status) => {
    if (status === STATUS_APPROVED) {
      return '<span class="badge badge-approved">อนุมัติแล้ว</span>';
    }
    if (status === STATUS_RECEIVED) {
      return '<span class="badge badge-approved">รับของแล้ว</span>';
    }
    if (status === STATUS_REJECTED) {
      return '<span class="badge badge-rejected">ไม่อนุมัติ</span>';
    }
    if (status === STATUS_CANCELLED) {
      return '<span class="badge badge-warning">ยกเลิก</span>';
    }
    if (status === STATUS_RETURNED) {
      return '<span class="badge badge-approved">คืนแล้ว</span>';
    }
    return '<span class="badge badge-pending">รออนุมัติ</span>';
  };

  const statusText = (status) => {
    if (status === STATUS_APPROVED) return "อนุมัติแล้ว";
    if (status === STATUS_RECEIVED) return "รับของแล้ว";
    if (status === STATUS_REJECTED) return "ไม่อนุมัติ";
    if (status === STATUS_CANCELLED) return "ยกเลิก";
    if (status === STATUS_RETURNED) return "คืนแล้ว";
    return "รออนุมัติ";
  };

