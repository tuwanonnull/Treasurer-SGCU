/* Staff content management: Firestore-backed news editor */
function initContentManagementStaffPage() {
  const activePage = document.querySelector(".page-view.active")?.dataset?.page || "";
  const hashPage = (window.location.hash || "").replace("#", "");
  const activeContentPage = activePage.startsWith("content-") ? activePage : hashPage;

  document.querySelectorAll("[data-content-target-page]").forEach((button) => {
    if (button.dataset.contentNavReady === "true") return;
    button.dataset.contentNavReady = "true";
    button.addEventListener("click", () => {
      const page = button.dataset.contentTargetPage || "";
      if (!page) return;
      window.location.hash = `#${page}`;
    });
  });

  if (activeContentPage === "content-documents-staff") {
    initContentDocumentsStaffPage();
    return;
  }

  if (activeContentPage !== "content-news-staff") return;

  const pageEl = document.querySelector('.page-view[data-page="content-news-staff"]');
  if (!pageEl || pageEl.dataset.contentManagementReady === "true") return;

  const form = document.getElementById("contentNewsForm");
  const tableBody = document.getElementById("contentNewsTableBody");
  const tableCaption = document.getElementById("contentNewsTableCaption");
  const messageEl = document.getElementById("contentNewsMessage");
  const formMessageEl = document.getElementById("contentNewsFormMessage");
  if (!form || !tableBody || !tableCaption) return;

  pageEl.dataset.contentManagementReady = "true";

  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const NEWS_COLLECTION = appConfig.firestore?.collections?.newsItems || "newsItems";
  const PUBLIC_CACHE_COLLECTION = appConfig.firestore?.collections?.publicCache || "publicCache";
  const NEWS_CACHE_KEY = appConfig.cache?.keys?.NEWS || "sgcu_cache_news";
  const PUBLIC_NEWS_CACHE_LIMIT = 30;
  const store = () => window.sgcuFirestore || {};
  const auth = () => window.sgcuAuth?.auth || null;

  const fields = {
    id: document.getElementById("contentNewsId"),
    title: document.getElementById("contentNewsTitle"),
    date: document.getElementById("contentNewsDate"),
    academicYear: document.getElementById("contentNewsAcademicYear"),
    category: document.getElementById("contentNewsCategory"),
    audience: document.getElementById("contentNewsAudience"),
    expireDate: document.getElementById("contentNewsExpireDate"),
    previewUrl: document.getElementById("contentNewsPreviewUrl"),
    summary: document.getElementById("contentNewsSummary"),
    status: document.getElementById("contentNewsStatus"),
    pinned: document.getElementById("contentNewsPinned")
  };

  const buttons = {
    refresh: document.getElementById("contentNewsRefreshBtn"),
    exportCsv: document.getElementById("contentNewsExportBtn"),
    importCsv: document.getElementById("contentNewsImportBtn"),
    importFile: document.getElementById("contentNewsImportFile"),
    createNew: document.getElementById("contentNewsNewBtn"),
    archive: document.getElementById("contentNewsArchiveBtn"),
    reset: document.getElementById("contentNewsResetBtn")
  };

  const filters = {
    query: document.getElementById("contentNewsSearchInput"),
    status: document.getElementById("contentNewsStatusFilter"),
    category: document.getElementById("contentNewsCategoryFilter"),
    audience: document.getElementById("contentNewsAudienceFilter"),
    reset: document.getElementById("contentNewsFilterReset")
  };

  const state = {
    items: [],
    source: "sheets",
    listStatus: "",
    filters: {
      query: "",
      status: "all",
      category: "all",
      audience: "all"
    },
    isLoading: false,
    isSaving: false
  };

  const esc = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");

  const setMessage = (text, type = "") => {
    [messageEl, formMessageEl].forEach((el) => {
      if (!el) return;
      el.textContent = text || "";
      el.dataset.state = type || "";
    });
  };

  const normalizeDateValue = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
    }
    return "";
  };

  const toDateFromStoredValue = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized) return null;
      const date = new Date(normalized);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  const toDatetimeLocalValue = (value) => {
    const date = toDateFromStoredValue(value);
    if (!date) return "";
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const datetimeLocalToDate = (value) => {
    const trimmed = (value || "").toString().trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      throw new Error("รูปแบบเวลาที่เผยแพร่ไม่ถูกต้อง");
    }
    return date;
  };

  const dateOnlyToDatetimeLocalValue = (value) => {
    const dateText = normalizeDateValue(value);
    return dateText ? `${dateText}T00:00` : "";
  };

  const dateInputToDisplayDate = (value) => {
    const trimmed = (value || "").toString().trim();
    if (!trimmed) return "";
    return trimmed.slice(0, 10);
  };

  const maybeDatetimeLocalToDate = (value) => {
    const trimmed = (value || "").toString().trim();
    if (!trimmed || isTruthyCsvValue(trimmed)) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getEffectiveNewsStatus = (item) => {
    const status = item.status || "published";
    const publishDate = toDateFromStoredValue(item.publishAt);
    if (status === "published" && publishDate && publishDate.getTime() > Date.now()) return "scheduled";
    return status;
  };

  const normalizeNewsDoc = (docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      title: (data.title || "").toString(),
      summary: (data.summary || "").toString(),
      date: normalizeDateValue(data.date || data.publishAt || data.publishedAt || data.createdAt),
      academicYear: (data.academicYear || data.year || "").toString(),
      category: (data.category || "").toString(),
      audience: (data.audience || "").toString(),
      previewUrl: (data.previewUrl || data.url || "").toString(),
      expireDate: normalizeDateValue(data.expireDate),
      publishAt: data.publishAt || "",
      publishAtInput: toDatetimeLocalValue(data.publishAt) || dateOnlyToDatetimeLocalValue(data.date || data.publishedAt),
      pinned: data.pinned === true,
      status: (data.status || "published").toString()
    };
  };

  const sortItems = (items) =>
    items.sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return (b.date || "").localeCompare(a.date || "");
    });

  const slugify = (value) => {
    const base = (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[^a-z0-9ก-๙]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
    return base || `news-${Date.now()}`;
  };

  const isTruthyCsvValue = (value) => {
    const normalized = (value || "").toString().trim().toLowerCase();
    return ["true", "yes", "y", "1", "ใช่", "ปักหมุด", "pin", "pinned"].includes(normalized);
  };

  const clearNewsCache = () => {
    try {
      localStorage.removeItem(NEWS_CACHE_KEY);
    } catch (_) {
      // ignore storage failures
    }
  };

  const syncPublicNewsCache = async () => {
    const firestore = store();
    const currentUser = auth()?.currentUser;
    if (!firestore.db || !firestore.doc || !firestore.setDoc || !firestore.serverTimestamp) return;

    const items = sortItems(state.items)
      .filter((item) => getEffectiveNewsStatus(item) === "published")
      .slice(0, PUBLIC_NEWS_CACHE_LIMIT)
      .map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
        academicYear: item.academicYear,
        year: item.academicYear,
        category: item.category,
        audience: item.audience,
        summary: item.summary,
        previewUrl: item.previewUrl,
        expireDate: item.expireDate,
        publishAt: item.publishAtInput || item.publishAt || "",
        pinned: item.pinned === true,
        status: "published"
      }));

    await firestore.setDoc(
      firestore.doc(firestore.db, PUBLIC_CACHE_COLLECTION, "news"),
      {
        items,
        updatedAt: firestore.serverTimestamp(),
        updatedBy: currentUser?.email || ""
      },
      { merge: true }
    );
  };

  const normalizeFilterText = (value) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "");

  const syncFilterSelectOptions = (selectEl, values, defaultLabel) => {
    if (!selectEl) return;
    const currentValue = selectEl.value || "all";
    selectEl.innerHTML = `<option value="all">${defaultLabel}</option>${values
      .map((value) => `<option value="${esc(value)}">${esc(value)}</option>`)
      .join("")}`;
    selectEl.value = values.includes(currentValue) ? currentValue : "all";
  };

  const syncFilterOptions = () => {
    const categories = Array.from(new Set(state.items.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "th"));
    const audiences = Array.from(new Set(state.items.map((item) => item.audience).filter(Boolean))).sort((a, b) => a.localeCompare(b, "th"));
    syncFilterSelectOptions(filters.category, categories, "ทุกหมวด");
    syncFilterSelectOptions(filters.audience, audiences, "ทุกฝ่าย");
    state.filters.category = filters.category?.value || "all";
    state.filters.audience = filters.audience?.value || "all";
  };

  const getFilteredItems = () => {
    const query = normalizeFilterText(state.filters.query);
    return state.items.filter((item) => {
      if (state.filters.status !== "all" && getEffectiveNewsStatus(item) !== state.filters.status) return false;
      if (state.filters.category !== "all" && item.category !== state.filters.category) return false;
      if (state.filters.audience !== "all" && item.audience !== state.filters.audience) return false;
      if (!query) return true;
      return normalizeFilterText([item.title, item.summary, item.category, item.audience, item.date, item.publishAtInput, item.academicYear].join(" ")).includes(query);
    });
  };

  const setFormDisabled = (disabled) => {
    Array.from(form.elements).forEach((el) => {
      if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        el.disabled = disabled;
      }
    });
  };

  const resetForm = () => {
    form.reset();
    if (fields.id) fields.id.value = "";
    if (fields.status) fields.status.value = "published";
    if (fields.date && !fields.date.value) fields.date.value = toDatetimeLocalValue(new Date());
    setMessage("");
  };

  const fillForm = (item) => {
    if (!item) return;
    fields.id.value = item.id || "";
    fields.title.value = item.title || "";
    fields.date.value = item.publishAtInput || dateOnlyToDatetimeLocalValue(item.date);
    fields.academicYear.value = item.academicYear || "";
    fields.category.value = item.category || "";
    fields.audience.value = item.audience || "";
    fields.expireDate.value = item.expireDate || "";
    fields.previewUrl.value = item.previewUrl || "";
    fields.summary.value = item.summary || "";
    fields.status.value = item.status || "published";
    fields.pinned.checked = !!item.pinned;
    setMessage(`กำลังแก้ข่าว: ${item.title}`, "info");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    fields.title.focus();
  };

  const readFormPayload = () => {
    const title = fields.title.value.trim();
    if (!title) {
      throw new Error("กรุณากรอกชื่อข่าว");
    }
    const publishAt = datetimeLocalToDate(fields.date.value);
    return {
      title,
      summary: fields.summary.value.trim(),
      date: dateInputToDisplayDate(fields.date.value),
      academicYear: fields.academicYear.value.trim(),
      category: fields.category.value.trim(),
      audience: fields.audience.value.trim(),
      previewUrl: fields.previewUrl.value.trim(),
      expireDate: fields.expireDate.value.trim(),
      publishAt,
      pinned: fields.pinned.checked,
      status: fields.status.value || "published"
    };
  };

  const toExportRows = (items = state.items) =>
    items.map((item, index) => ({
      "เลขรันเอกสาร": item.id || `NEWS-${index + 1}`,
      "วันที่และเวลาเผยแพร่": item.publishAtInput || dateOnlyToDatetimeLocalValue(item.date),
      "ปีการศึกษา": item.academicYear || "",
      "ชื่อข่าว": item.title || "",
      "สรุปข่าว": item.summary || "",
      "ลิงก์แนบ": item.previewUrl || "",
      "หมวดข่าว": item.category || "",
      "ฝ่ายที่รับผิดชอบ": item.audience || "",
      "วันหมดอายุ": item.expireDate || "",
      "ปักหมุด": item.pinned ? "TRUE" : "",
      "สถานะ": getEffectiveNewsStatus(item)
    }));

  const exportNewsCsv = () => {
    if (!window.sgcuCsvExport?.download) {
      setMessage("ไม่พบตัวช่วย Export CSV", "error");
      return;
    }
    const headers = [
      "เลขรันเอกสาร",
      "วันที่และเวลาเผยแพร่",
      "ปีการศึกษา",
      "ชื่อข่าว",
      "สรุปข่าว",
      "ลิงก์แนบ",
      "หมวดข่าว",
      "ฝ่ายที่รับผิดชอบ",
      "วันหมดอายุ",
      "ปักหมุด",
      "สถานะ"
    ];
    const ok = window.sgcuCsvExport.download({
      headers,
      rows: toExportRows(getFilteredItems()),
      fileName: "sgcu-news-firestore"
    });
    if (ok) setMessage("Export CSV ข่าวแล้ว", "success");
  };

  const getCsvCell = (row, keys, fallbackIndex = -1) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value != null && value.toString().trim() !== "") return value.toString().trim();
    }
    if (fallbackIndex >= 0 && Array.isArray(row)) {
      return (row[fallbackIndex] || "").toString().trim();
    }
    return "";
  };

  const normalizeImportRow = (row, index) => {
    const title = getCsvCell(row, ["ชื่อข่าว", "title", "Title"], 3);
    if (!title) return null;
    const rawStatus = getCsvCell(row, ["สถานะ", "status", "Status"], 10);
    const status = ["published", "scheduled", "draft", "archived"].includes(rawStatus) ? rawStatus : "published";
    const explicitId = getCsvCell(row, ["id", "docId", "เลขรันเอกสาร"], 0);
    const publishAtRaw = getCsvCell(row, ["วันที่และเวลาเผยแพร่", "วันที่ประกาศ", "date", "Date"], 1);
    const publishAt = maybeDatetimeLocalToDate(publishAtRaw);
    return {
      docId: explicitId ? slugify(explicitId) : slugify(`${publishAtRaw}-${title}-${index + 1}`),
      payload: {
        title,
        date: dateInputToDisplayDate(publishAtRaw),
        academicYear: getCsvCell(row, ["ปีการศึกษา", "academicYear", "year"], 2),
        summary: getCsvCell(row, ["สรุปข่าว", "summary", "Summary"], 4),
        previewUrl: getCsvCell(row, ["ลิงก์แนบ", "previewUrl", "url"], 5),
        category: getCsvCell(row, ["หมวดข่าว", "category", "Category"], 6),
        audience: getCsvCell(row, ["ฝ่ายที่รับผิดชอบ", "กลุ่มเป้าหมาย", "audience", "Audience"], 7),
        expireDate: getCsvCell(row, ["วันหมดอายุ", "expireDate"], 8),
        publishAt,
        pinned: isTruthyCsvValue(getCsvCell(row, ["ปักหมุด", "pinned", "Pinned"], 9)),
        status: status === "scheduled" ? "published" : status
      }
    };
  };

  const importNewsCsvFile = async (file) => {
    const firestore = store();
    const currentUser = auth()?.currentUser;
    if (!file) return;
    if (!firestore.db || !firestore.doc || !firestore.setDoc || !firestore.serverTimestamp) {
      setMessage("ระบบยังไม่พร้อม import เข้า Firestore", "error");
      return;
    }
    try {
      setMessage("กำลังอ่าน CSV...", "info");
      await window.sgcuVendorLoader?.ensurePapa?.();
      if (!window.Papa) throw new Error("ไม่พบ PapaParse สำหรับอ่าน CSV");

      const csvText = await file.text();
      const parsed = window.Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true
      });
      if (parsed.errors?.length) {
        throw new Error(`อ่าน CSV ไม่สำเร็จ: ${parsed.errors[0].message}`);
      }

      let importedCount = 0;
      const editorEmail = currentUser?.email || "";
      const rows = (parsed.data || [])
        .slice(1)
        .map((row, index) => normalizeImportRow(row, index))
        .filter(Boolean);
      if (!rows.length) throw new Error("ไม่พบแถวข่าวที่มีชื่อข่าวใน CSV");

      for (const row of rows) {
        await firestore.setDoc(
          firestore.doc(firestore.db, NEWS_COLLECTION, row.docId),
          {
            ...row.payload,
            updatedAt: firestore.serverTimestamp(),
            updatedBy: editorEmail,
            importedAt: firestore.serverTimestamp(),
            importedBy: editorEmail
          },
          { merge: true }
        );
        importedCount += 1;
      }

      clearNewsCache();
      await loadNewsItems();
      await syncPublicNewsCache();
      setMessage(`Import ข่าว ${importedCount.toLocaleString("th-TH")} รายการแล้ว และอัปเดต public cache แล้ว`, "success");
      void window.sgcuAuditLog?.write?.({
        action: "content.news.import",
        entityType: "newsItem",
        entityId: "bulk",
        after: { importedCount },
        metadata: {
          count: importedCount,
          idSample: rows.map((row) => row.docId).filter(Boolean).slice(0, 20)
        },
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("Import ข่าว CSV ไม่สำเร็จ - app.content-management.js", error);
      setMessage(error.message || "Import CSV ไม่สำเร็จ", "error");
    } finally {
      if (buttons.importFile) buttons.importFile.value = "";
    }
  };

  const renderRows = () => {
    const visibleItems = getFilteredItems();
    const loadStatus = state.listStatus ? ` · ${state.listStatus}` : "";
    tableCaption.textContent = `แสดง ${visibleItems.length.toLocaleString("th-TH")} จาก ${state.items.length.toLocaleString("th-TH")} ข่าวจาก Firestore${loadStatus}`;
    if (!state.items.length) {
      tableBody.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState("ยังไม่มีข่าวในระบบ", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "document")}</td></tr>`;
      return;
    }
    if (!visibleItems.length) {
      tableBody.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState("ไม่พบข่าวตามตัวกรอง", "ลองเปลี่ยนหรือล้างตัวกรองเพื่อดูรายการอื่น", "search")}</td></tr>`;
      return;
    }
    tableBody.innerHTML = visibleItems
      .map((item) => {
        const effectiveStatus = getEffectiveNewsStatus(item);
        return `
          <tr class="content-news-row" data-news-id="${esc(item.id)}" tabindex="0" role="button" aria-label="แก้ไขข่าว ${esc(item.title || "")}">
            <td>
              <strong>${esc(item.title || "-")}</strong>
              ${item.pinned ? `<span class="content-admin-pill">PIN</span>` : ""}
              ${item.publishAtInput ? `<span class="content-admin-pill content-admin-schedule-pill">${esc(item.publishAtInput.replace("T", " "))}</span>` : ""}
              ${item.summary ? `<small>${esc(item.summary)}</small>` : ""}
            </td>
            <td>${esc(item.date || "-")}</td>
            <td>${esc(item.category || "-")}</td>
            <td><span class="content-admin-status is-${esc(effectiveStatus)}">${esc(effectiveStatus)}</span></td>
          </tr>
        `;
      })
      .join("");
  };

  const loadNewsItems = async () => {
    const firestore = store();
    if (!firestore.db || !firestore.collection || !firestore.getDocs) {
      setMessage("ระบบยังไม่เชื่อมต่อ Firestore", "error");
      return;
    }
    state.isLoading = true;
    state.listStatus = "";
    tableCaption.textContent = "กำลังโหลดข่าว...";
    tableBody.innerHTML = `<tr><td colspan="4">กำลังโหลดข่าว...</td></tr>`;
    try {
      const snapshot = await firestore.getDocs(firestore.collection(firestore.db, NEWS_COLLECTION));
      const items = [];
      snapshot.forEach((docSnap) => {
        const item = normalizeNewsDoc(docSnap);
        if (item.title) items.push(item);
      });
      state.items = sortItems(items);
      state.listStatus = "โหลดข่าวจาก Firestore แล้ว";
      syncFilterOptions();
      renderRows();
      setMessage("");
    } catch (error) {
      console.error("โหลดข่าว Firestore ไม่สำเร็จ - app.content-management.js", error);
      tableBody.innerHTML = `<tr><td colspan="4">ไม่สามารถโหลดข่าวจาก Firestore ได้</td></tr>`;
      tableCaption.textContent = "โหลดข่าวไม่สำเร็จ";
      setMessage("ไม่สามารถโหลดข่าวได้ ตรวจสิทธิ์ Staff และ Firestore Rules", "error");
    } finally {
      state.isLoading = false;
    }
  };

  const saveNewsItem = async (event) => {
    event.preventDefault();
    const firestore = store();
    const currentUser = auth()?.currentUser;
    if (!firestore.db || !firestore.collection || !firestore.doc || !firestore.addDoc || !firestore.setDoc || !firestore.serverTimestamp) {
      setMessage("ระบบยังไม่พร้อมบันทึก Firestore", "error");
      return;
    }
    state.isSaving = true;
    setFormDisabled(true);
    try {
      const payload = readFormPayload();
      const editorEmail = currentUser?.email || "";
      const id = fields.id.value.trim();
      const beforeItem = id ? state.items.find((item) => item.id === id) || null : null;
      const savePayload = {
        ...payload,
        updatedAt: firestore.serverTimestamp(),
        updatedBy: editorEmail
      };
      if (id) {
        await firestore.setDoc(firestore.doc(firestore.db, NEWS_COLLECTION, id), savePayload, { merge: true });
        void window.sgcuAuditLog?.write?.({
          action: "content.news.update",
          entityType: "newsItem",
          entityId: id,
          before: beforeItem,
          after: payload,
          source: "web_app_staff"
        });
      } else {
        const docRef = await firestore.addDoc(firestore.collection(firestore.db, NEWS_COLLECTION), {
          ...savePayload,
          createdAt: firestore.serverTimestamp(),
          createdBy: editorEmail
        });
        void window.sgcuAuditLog?.write?.({
          action: "content.news.create",
          entityType: "newsItem",
          entityId: docRef?.id || "",
          after: payload,
          source: "web_app_staff"
        });
      }
      clearNewsCache();
      resetForm();
      await loadNewsItems();
      await syncPublicNewsCache();
      setMessage("บันทึกข่าวแล้ว ล้าง cache ในเครื่องนี้ และอัปเดต public cache แล้ว", "success");
    } catch (error) {
      console.error("บันทึกข่าว Firestore ไม่สำเร็จ - app.content-management.js", error);
      setMessage(error.message || "บันทึกข่าวไม่สำเร็จ", "error");
    } finally {
      state.isSaving = false;
      setFormDisabled(false);
    }
  };

  const archiveCurrentItem = async () => {
    if (!fields.id.value.trim()) {
      fields.status.value = "archived";
      return;
    }
    fields.status.value = "archived";
    form.requestSubmit();
  };

  tableBody.addEventListener("click", (event) => {
    const row = event.target.closest("[data-news-id]");
    if (!row) return;
    const item = state.items.find((candidate) => candidate.id === row.dataset.newsId);
    fillForm(item);
  });
  tableBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("[data-news-id]");
    if (!row) return;
    event.preventDefault();
    const item = state.items.find((candidate) => candidate.id === row.dataset.newsId);
    fillForm(item);
  });
  form.addEventListener("submit", saveNewsItem);
  buttons.refresh?.addEventListener("click", () => void loadNewsItems());
  buttons.exportCsv?.addEventListener("click", exportNewsCsv);
  buttons.importCsv?.addEventListener("click", () => buttons.importFile?.click());
  buttons.importFile?.addEventListener("change", (event) => {
    const file = event.target.files?.[0] || null;
    void importNewsCsvFile(file);
  });
  filters.query?.addEventListener("input", () => {
    state.filters.query = filters.query.value.trim();
    renderRows();
  });
  filters.status?.addEventListener("change", () => {
    state.filters.status = filters.status.value || "all";
    renderRows();
  });
  filters.category?.addEventListener("change", () => {
    state.filters.category = filters.category.value || "all";
    renderRows();
  });
  filters.audience?.addEventListener("change", () => {
    state.filters.audience = filters.audience.value || "all";
    renderRows();
  });
  filters.reset?.addEventListener("click", () => {
    if (filters.query) filters.query.value = "";
    if (filters.status) filters.status.value = "all";
    if (filters.category) filters.category.value = "all";
    if (filters.audience) filters.audience.value = "all";
    state.filters = {
      query: "",
      status: "all",
      category: "all",
      audience: "all"
    };
    renderRows();
  });
  buttons.createNew?.addEventListener("click", () => {
    resetForm();
    fields.title.focus();
  });
  buttons.reset?.addEventListener("click", resetForm);
  buttons.archive?.addEventListener("click", () => void archiveCurrentItem());

  resetForm();
  void loadNewsItems();
}

window.initContentManagementStaffPage = initContentManagementStaffPage;

function initContentDocumentsStaffPage() {
  const pageEl = document.querySelector('.page-view[data-page="content-documents-staff"]');
  if (!pageEl || pageEl.dataset.contentDocumentsReady === "true") return;

  const tableBody = document.getElementById("contentDocumentsTableBody");
  const tableCaption = document.getElementById("contentDocumentsTableCaption");
  const messageEl = document.getElementById("contentDocumentsMessage");
  const form = document.getElementById("contentDocumentsForm");
  const formMessageEl = document.getElementById("contentDocumentsFormMessage");
  if (!tableBody || !tableCaption || !form) return;

  pageEl.dataset.contentDocumentsReady = "true";

  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const downloadsSheetUrl = appConfig.sheets?.downloads || window.DOWNLOAD_SHEET || "";
  const DOCUMENTS_COLLECTION = appConfig.firestore?.collections?.downloadDocuments || "downloadDocuments";
  const PUBLIC_CACHE_COLLECTION = appConfig.firestore?.collections?.publicCache || "publicCache";
  const PUBLIC_DOWNLOADS_CACHE_LIMIT = 80;
  const store = () => window.sgcuFirestore || {};
  const auth = () => window.sgcuAuth?.auth || null;
  const filters = {
    query: document.getElementById("contentDocumentsSearchInput"),
    category: document.getElementById("contentDocumentsCategoryFilter"),
    org: document.getElementById("contentDocumentsOrgFilter"),
    format: document.getElementById("contentDocumentsFormatFilter"),
    reset: document.getElementById("contentDocumentsFilterReset")
  };
  const fields = {
    id: document.getElementById("contentDocumentsId"),
    name: document.getElementById("contentDocumentsName"),
    desc: document.getElementById("contentDocumentsDesc"),
    category: document.getElementById("contentDocumentsCategory"),
    org: document.getElementById("contentDocumentsOrg"),
    status: document.getElementById("contentDocumentsStatus"),
    exUrl: document.getElementById("contentDocumentsExUrl"),
    pdfUrl: document.getElementById("contentDocumentsPdfUrl"),
    docxUrl: document.getElementById("contentDocumentsDocxUrl"),
    xlsxUrl: document.getElementById("contentDocumentsXlsxUrl")
  };
  const buttons = {
    refresh: document.getElementById("contentDocumentsRefreshBtn"),
    importSheet: document.getElementById("contentDocumentsImportSheetBtn"),
    exportCsv: document.getElementById("contentDocumentsExportBtn"),
    reorder: document.getElementById("contentDocumentsReorderBtn"),
    reorderSave: document.getElementById("contentDocumentsReorderSaveBtn"),
    reorderCancel: document.getElementById("contentDocumentsReorderCancelBtn"),
    archive: document.getElementById("contentDocumentsArchiveBtn"),
    reset: document.getElementById("contentDocumentsResetBtn")
  };
  const actionGroups = {
    normal: document.querySelector("[data-documents-normal-actions]"),
    reorder: document.querySelector("[data-documents-reorder-actions]")
  };
  const state = {
    items: [],
    draftItems: [],
    source: "",
    listStatus: "",
    isReordering: false,
    isReorderMode: false,
    drag: null,
    collapsedCategories: new Set(),
    filters: {
      query: "",
      category: "all",
      org: "all",
      format: "all"
    }
  };

  const esc = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");

  const setMessage = (text, type = "") => {
    [messageEl, formMessageEl].forEach((el) => {
      if (!el) return;
      el.textContent = text || "";
      el.dataset.state = type || "";
    });
  };

  const normalizeFilterText = (value) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "");

  const hasLink = (value) => {
    const text = (value || "").toString().trim();
    return !!text && text !== "-" && text !== "--";
  };

  const normalizeOrder = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
  };

  const isFiniteOrder = (value) => Number.isFinite(Number(value));

  const hasExplicitOrder = (items) => (items || []).some((item) => isFiniteOrder(item.categoryOrder) || isFiniteOrder(item.sortOrder));

  const slugifyDocumentId = (value) => {
    const base = (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[^a-z0-9ก-๙]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
    return base || `document-${Date.now()}`;
  };

  const normalizeDocumentFirestoreDoc = (docSnap) => {
    const data = docSnap?.data ? docSnap.data() : {};
    const links = data.links || {};
    const name = (data.name || data.title || "").toString().trim();
    if (!name) return null;
    const item = {
      id: docSnap.id,
      name,
      desc: (data.desc || data.description || "").toString().trim(),
      org: (data.org || data.organization || "").toString().trim(),
      exUrl: (data.exUrl || data.exampleUrl || links.ex || "").toString().trim(),
      pdfUrl: (data.pdfUrl || links.pdf || "").toString().trim(),
      docxUrl: (data.docxUrl || links.docx || "").toString().trim(),
      xlsxUrl: (data.xlsxUrl || links.xlsx || "").toString().trim(),
      category: (data.category || "").toString().trim() || "อื่น ๆ",
      categoryOrder: data.categoryOrder,
      sortOrder: data.sortOrder,
      status: (data.status || "published").toString()
    };
    item.formats = [
      hasLink(item.exUrl) ? "ex" : "",
      hasLink(item.pdfUrl) ? "pdf" : "",
      hasLink(item.docxUrl) ? "docx" : "",
      hasLink(item.xlsxUrl) ? "xlsx" : ""
    ].filter(Boolean);
    return item;
  };

  const normalizeDocumentRow = (row, index) => {
    const name = (row?.[0] || "").toString().trim();
    if (!name) return null;
    const item = {
      id: `document-${index + 1}`,
      name,
      desc: (row?.[1] || "").toString().trim(),
      org: (row?.[2] || "").toString().trim(),
      exUrl: (row?.[3] || "").toString().trim(),
      pdfUrl: (row?.[4] || "").toString().trim(),
      docxUrl: (row?.[5] || "").toString().trim(),
      xlsxUrl: (row?.[6] || "").toString().trim(),
      category: (row?.[7] || "").toString().trim() || "อื่น ๆ",
      categoryOrder: row?.[8],
      sortOrder: row?.[9]
    };
    item.formats = [
      hasLink(item.exUrl) ? "ex" : "",
      hasLink(item.pdfUrl) ? "pdf" : "",
      hasLink(item.docxUrl) ? "docx" : "",
      hasLink(item.xlsxUrl) ? "xlsx" : ""
    ].filter(Boolean);
    return item;
  };

  const sortDocuments = (items) =>
    items.sort(
      (a, b) =>
        normalizeOrder(a.categoryOrder) - normalizeOrder(b.categoryOrder) ||
        (a.category || "").localeCompare(b.category || "", "th") ||
        normalizeOrder(a.sortOrder) - normalizeOrder(b.sortOrder) ||
        (a.name || "").localeCompare(b.name || "", "th")
    );

  const getActiveItems = () => state.isReorderMode ? state.draftItems : state.items;

  const getOrderedCategories = (items = state.items) => {
    const categoryMap = new Map();
    items.forEach((item) => {
      const category = item.category || "อื่น ๆ";
      const order = normalizeOrder(item.categoryOrder);
      const current = categoryMap.get(category);
      if (!current || order < current.order) {
        categoryMap.set(category, { category, order });
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) => a.order - b.order || a.category.localeCompare(b.category, "th"));
  };

  const getCategoryOrderFor = (category) => {
    const found = getOrderedCategories().find((item) => item.category === category);
    if (found && Number.isFinite(found.order)) return found.order;
    const finiteOrders = getOrderedCategories().map((item) => item.order).filter(Number.isFinite);
    return finiteOrders.length ? Math.max(...finiteOrders) + 10 : (getOrderedCategories().length + 1) * 10;
  };

  const getNextSortOrder = (category) => {
    const finiteOrders = state.items
      .filter((item) => (item.category || "อื่น ๆ") === category)
      .map((item) => normalizeOrder(item.sortOrder))
      .filter(Number.isFinite);
    return finiteOrders.length ? Math.max(...finiteOrders) + 10 : 10;
  };

  const getDocumentsInCategory = (category) =>
    sortDocuments(getActiveItems().filter((item) => (item.category || "อื่น ๆ") === category));

  const setFormDisabled = (disabled) => {
    Array.from(form.elements).forEach((el) => {
      if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        el.disabled = disabled;
      }
    });
  };

  const resetForm = () => {
    form.reset();
    if (fields.id) fields.id.value = "";
    if (fields.status) fields.status.value = "published";
    setMessage("");
  };

  const fillForm = (item) => {
    if (!item) return;
    fields.id.value = item.id || "";
    fields.name.value = item.name || "";
    fields.desc.value = item.desc || "";
    fields.category.value = item.category || "";
    fields.org.value = item.org || "";
    fields.status.value = item.status || "published";
    fields.exUrl.value = item.exUrl || "";
    fields.pdfUrl.value = item.pdfUrl || "";
    fields.docxUrl.value = item.docxUrl || "";
    fields.xlsxUrl.value = item.xlsxUrl || "";
    setMessage(`กำลังแก้เอกสาร: ${item.name}`, "info");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    fields.name.focus();
  };

  const readFormPayload = () => {
    const name = fields.name.value.trim();
    if (!name) throw new Error("กรุณากรอกชื่อเอกสาร");
    return {
      name,
      desc: fields.desc.value.trim(),
      category: fields.category.value.trim() || "อื่น ๆ",
      org: fields.org.value.trim(),
      status: fields.status.value || "published",
      exUrl: fields.exUrl.value.trim(),
      pdfUrl: fields.pdfUrl.value.trim(),
      docxUrl: fields.docxUrl.value.trim(),
      xlsxUrl: fields.xlsxUrl.value.trim()
    };
  };

  const syncFilterSelectOptions = (selectEl, values, defaultLabel) => {
    if (!selectEl) return;
    const currentValue = selectEl.value || "all";
    selectEl.innerHTML = `<option value="all">${defaultLabel}</option>${values
      .map((value) => `<option value="${esc(value)}">${esc(value)}</option>`)
      .join("")}`;
    selectEl.value = values.includes(currentValue) ? currentValue : "all";
  };

  const syncFilterOptions = () => {
    const categories = getOrderedCategories(state.items).map((item) => item.category);
    const orgs = Array.from(new Set(state.items.map((item) => item.org).filter(Boolean))).sort((a, b) => a.localeCompare(b, "th"));
    syncFilterSelectOptions(filters.category, categories, "ทุกหมวด");
    syncFilterSelectOptions(filters.org, orgs, "ทุกองค์กร");
    state.filters.category = filters.category?.value || "all";
    state.filters.org = filters.org?.value || "all";
  };

  const getFilteredItems = () => {
    if (state.isReorderMode) return sortDocuments([...state.draftItems]);
    const query = normalizeFilterText(state.filters.query);
    return state.items.filter((item) => {
      if (state.filters.category !== "all" && item.category !== state.filters.category) return false;
      if (state.filters.org !== "all" && item.org !== state.filters.org) return false;
      if (state.filters.format !== "all" && !item.formats.includes(state.filters.format)) return false;
      if (!query) return true;
      return normalizeFilterText([item.name, item.desc, item.org, item.category, item.formats.join(" ")].join(" ")).includes(query);
    });
  };

  const getCategoryKey = (category) => category || "อื่น ๆ";

  const isCategoryCollapsed = (category) => state.collapsedCategories.has(getCategoryKey(category));

  const toggleCategoryCollapsed = (category) => {
    const key = getCategoryKey(category);
    if (state.collapsedCategories.has(key)) {
      state.collapsedCategories.delete(key);
    } else {
      state.collapsedCategories.add(key);
    }
  };

  const buildLink = (url, label) => {
    if (!hasLink(url)) return "";
    const href = typeof toDownloadUrl === "function" ? toDownloadUrl(url, label.toLowerCase()) : url;
    return `<a class="content-documents-file-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  };

  const getDocumentPosition = (item) => {
    const categories = getOrderedCategories(getActiveItems());
    const categoryIndex = categories.findIndex((entry) => entry.category === item.category);
    const categoryItems = getDocumentsInCategory(item.category || "อื่น ๆ");
    const itemIndex = categoryItems.findIndex((entry) => entry.id === item.id);
    return { categoryIndex, itemIndex };
  };

  const buildOrderMeta = (item) => {
    const { categoryIndex, itemIndex } = getDocumentPosition(item);
    return `
      <span class="content-documents-order-index">หมวด ${categoryIndex + 1 || "-"} · รายการ ${itemIndex + 1 || "-"}</span>
    `;
  };

  const renderRows = () => {
    const visibleItems = getFilteredItems();
    const loadStatus = state.listStatus ? ` · ${state.listStatus}` : "";
    const sourceLabel = state.source === "firestore" ? "Firestore" : "Google Sheet";
    const reorderLabel = state.isReorderMode ? " · โหมดจัดลำดับ: ลากหัวหมวด หรือลากเอกสารไปวางในหมวดที่ต้องการ แล้วกดบันทึก" : "";
    tableCaption.textContent = `แสดง ${visibleItems.length.toLocaleString("th-TH")} จาก ${state.items.length.toLocaleString("th-TH")} เอกสารจาก ${sourceLabel}${loadStatus}${reorderLabel}`;
    if (!state.items.length) {
      tableBody.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState("ยังไม่มีเอกสารในระบบ", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "document")}</td></tr>`;
      return;
    }
    if (!visibleItems.length) {
      tableBody.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState("ไม่พบเอกสารตามตัวกรอง", "ลองเปลี่ยนหรือล้างตัวกรองเพื่อดูรายการอื่น", "search")}</td></tr>`;
      return;
    }
    const renderDocumentRow = (item) => {
        const links = [
          buildLink(item.exUrl, "EX"),
          buildLink(item.pdfUrl, "PDF"),
          buildLink(item.docxUrl, "DOCX"),
          buildLink(item.xlsxUrl, "XLSX")
        ].filter(Boolean).join("");
        const draggableAttr = state.isReorderMode ? ` draggable="true"` : "";
        const roleAttr = state.isReorderMode ? "" : ` tabindex="0" role="button" aria-label="แก้ไขเอกสาร ${esc(item.name || "")}"`;
        const reorderPrefix = state.isReorderMode
          ? `
            <div class="content-documents-inline-order">
              <button class="content-documents-drag-handle" type="button" draggable="true" data-document-drag-handle data-document-id="${esc(item.id)}" aria-label="ลากเพื่อจัดลำดับเอกสาร">☰</button>
              ${buildOrderMeta(item)}
            </div>
          `
          : "";
        return `
          <tr class="content-documents-row${state.isReorderMode ? " is-reordering" : ""}" data-document-id="${esc(item.id)}" data-category="${esc(item.category || "อื่น ๆ")}"${draggableAttr}${roleAttr}>
            <td>
              ${reorderPrefix}
              <strong>${esc(item.name)}</strong>
              ${item.desc ? `<small>${esc(item.desc)}</small>` : ""}
            </td>
            <td>${esc(item.category || "-")}</td>
            <td>${esc(item.org || "-")}</td>
            <td><div class="content-documents-file-links">${links || "-"}</div></td>
          </tr>
        `;
    };
    if (state.isReorderMode) {
      const categories = getOrderedCategories(state.draftItems);
      tableBody.innerHTML = categories
        .map((entry, index) => {
          const category = entry.category || "อื่น ๆ";
          const categoryItems = getDocumentsInCategory(category);
          const collapsed = isCategoryCollapsed(category);
          const categoryRows = collapsed ? "" : categoryItems.map(renderDocumentRow).join("");
          return `
            <tr class="content-documents-category-row${collapsed ? " is-collapsed" : ""}" data-category="${esc(category)}" draggable="true">
              <td colspan="4">
                <div class="content-documents-category-control">
                  <button class="content-documents-drag-handle" type="button" draggable="true" data-category-drag-handle data-category="${esc(category)}" aria-label="ลากเพื่อจัดลำดับหมวด">☰</button>
                  <div class="content-documents-category-main">
                    <strong>${esc(category)}</strong>
                    <span>หมวด ${index + 1} · ${categoryItems.length.toLocaleString("th-TH")} เอกสาร</span>
                  </div>
                  <button class="content-documents-category-toggle" type="button" data-category-toggle data-category="${esc(category)}" aria-expanded="${collapsed ? "false" : "true"}">${collapsed ? "แสดง" : "ซ่อน"}</button>
                </div>
              </td>
            </tr>
            ${categoryRows}
          `;
        })
        .join("");
      return;
    }
    tableBody.innerHTML = visibleItems.map(renderDocumentRow).join("");
  };

  const syncReorderUi = () => {
    const inMode = state.isReorderMode;
    pageEl.dataset.documentsReorderMode = inMode ? "true" : "false";
    if (actionGroups.normal) actionGroups.normal.hidden = inMode;
    if (actionGroups.reorder) actionGroups.reorder.hidden = !inMode;
    if (buttons.reorder) {
      buttons.reorder.disabled = state.source !== "firestore" || state.isReordering || !state.items.length;
      buttons.reorder.title = state.source === "firestore" ? "" : "จัดลำดับได้หลังบันทึกข้อมูลลง Firestore";
    }
    if (buttons.reorderSave) {
      buttons.reorderSave.disabled = state.isReordering;
    }
    if (buttons.reorderCancel) {
      buttons.reorderCancel.disabled = state.isReordering;
    }
    Object.values(filters).forEach((el) => {
      if (el && "disabled" in el) el.disabled = inMode;
    });
  };

  const loadDocumentsFromFirestore = async () => {
    const firestore = store();
    if (!firestore.db || !firestore.collection || !firestore.getDocs) return null;
    const collectionRef = firestore.collection(firestore.db, DOCUMENTS_COLLECTION);
    const listQuery =
      firestore.query && firestore.where
        ? firestore.query(collectionRef, firestore.where("status", "==", "published"))
        : collectionRef;
    const snapshot = await firestore.getDocs(listQuery);
    const items = [];
    snapshot.forEach((docSnap) => {
      const item = normalizeDocumentFirestoreDoc(docSnap);
      if (item) items.push(item);
    });
    return sortDocuments(items);
  };

  const clearDownloadsCache = () => {
    try {
      localStorage.removeItem(appConfig.cache?.keys?.DOWNLOADS || "sgcu_cache_downloads");
    } catch (_) {
      // ignore storage failures
    }
  };

  const syncPublicDownloadsCache = async () => {
    const firestore = store();
    const currentUser = auth()?.currentUser;
    if (!firestore.db || !firestore.doc || !firestore.setDoc || !firestore.serverTimestamp) return;

    const items = sortDocuments(state.items)
      .filter((item) => (item.status || "published") === "published")
      .slice(0, PUBLIC_DOWNLOADS_CACHE_LIMIT)
      .map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.desc,
        org: item.org,
        exUrl: item.exUrl,
        pdfUrl: item.pdfUrl,
        docxUrl: item.docxUrl,
        xlsxUrl: item.xlsxUrl,
        category: item.category,
        categoryOrder: item.categoryOrder,
        sortOrder: item.sortOrder,
        status: "published"
      }));

    await firestore.setDoc(
      firestore.doc(firestore.db, PUBLIC_CACHE_COLLECTION, "downloads"),
      {
        items,
        updatedAt: firestore.serverTimestamp(),
        updatedBy: currentUser?.email || ""
      },
      { merge: true }
    );
  };

  const loadDocumentsFromSheet = async () => {
    if (!downloadsSheetUrl) throw new Error("ยังไม่ได้ตั้งค่าลิงก์ Sheet เอกสารการเงิน");
    await window.sgcuVendorLoader?.ensurePapa?.();
    if (!window.Papa) throw new Error("ไม่พบ PapaParse สำหรับอ่าน CSV");
    const response = await fetch(downloadsSheetUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`โหลด Sheet ไม่สำเร็จ (${response.status})`);
    const csvText = await response.text();
    const parsed = window.Papa.parse(csvText, { header: false, skipEmptyLines: true });
    if (parsed.errors?.length) throw new Error(parsed.errors[0].message);
    const items = (parsed.data || [])
      .slice(1)
      .map((row, index) => normalizeDocumentRow(row, index))
      .filter(Boolean);
    return hasExplicitOrder(items)
      ? items.sort(
        (a, b) =>
          normalizeOrder(a.categoryOrder) - normalizeOrder(b.categoryOrder) ||
          (a.category || "").localeCompare(b.category || "", "th") ||
          normalizeOrder(a.sortOrder) - normalizeOrder(b.sortOrder) ||
          (a.name || "").localeCompare(b.name || "", "th")
      )
      : items;
  };

  const loadDocuments = async () => {
    state.isReorderMode = false;
    state.draftItems = [];
    state.drag = null;
    state.collapsedCategories = new Set();
    syncReorderUi();
    state.listStatus = "";
    tableCaption.textContent = "กำลังโหลดเอกสาร...";
    tableBody.innerHTML = `<tr><td colspan="4">กำลังโหลดเอกสาร...</td></tr>`;
    try {
      const firestoreItems = await loadDocumentsFromFirestore();
      if (Array.isArray(firestoreItems) && firestoreItems.length) {
        state.items = firestoreItems;
        state.source = "firestore";
        state.listStatus = "โหลดเอกสารจาก Firestore แล้ว";
      } else {
        state.items = await loadDocumentsFromSheet();
        state.source = "sheets";
        state.listStatus = "โหลดเอกสารจาก Google Sheet แล้ว";
      }
      syncFilterOptions();
      syncReorderUi();
      renderRows();
      setMessage("");
    } catch (error) {
      console.error("โหลดเอกสารการเงินไม่สำเร็จ - app.content-management.js", error);
      tableCaption.textContent = "โหลดเอกสารไม่สำเร็จ";
      tableBody.innerHTML = `<tr><td colspan="4">ไม่สามารถโหลดเอกสารจาก Firestore หรือ Google Sheet ได้</td></tr>`;
      setMessage("ตรวจลิงก์ Sheet และสิทธิ์การเผยแพร่ CSV", "error");
    }
  };

  const importSheetToFirestore = async () => {
    const firestore = store();
    const currentUser = auth()?.currentUser;
    if (!firestore.db || !firestore.doc || !firestore.setDoc || !firestore.serverTimestamp) {
      setMessage("ระบบยังไม่พร้อม import เข้า Firestore", "error");
      return;
    }
    try {
      if (buttons.importSheet) buttons.importSheet.disabled = true;
      setMessage("กำลัง import Sheet เข้า Firestore...", "info");
      const items = await loadDocumentsFromSheet();
      if (!items.length) throw new Error("ไม่พบรายการเอกสารใน Sheet");
      const editorEmail = currentUser?.email || "";
      let importedCount = 0;
      const idCounts = {};
      const categoryOrders = new Map();
      const sortOrderCounts = new Map();
      for (const item of items) {
        const baseDocId = slugifyDocumentId(`${item.category}-${item.org}-${item.name}`);
        idCounts[baseDocId] = (idCounts[baseDocId] || 0) + 1;
        const docId = idCounts[baseDocId] > 1 ? `${baseDocId}-${idCounts[baseDocId]}` : baseDocId;
        if (!categoryOrders.has(item.category)) {
          categoryOrders.set(item.category, isFiniteOrder(item.categoryOrder) ? Number(item.categoryOrder) : (categoryOrders.size + 1) * 10);
        }
        sortOrderCounts.set(item.category, (sortOrderCounts.get(item.category) || 0) + 1);
        await firestore.setDoc(
          firestore.doc(firestore.db, DOCUMENTS_COLLECTION, docId),
          {
            name: item.name,
            desc: item.desc,
            org: item.org,
            exUrl: item.exUrl,
            pdfUrl: item.pdfUrl,
            docxUrl: item.docxUrl,
            xlsxUrl: item.xlsxUrl,
            category: item.category,
            categoryOrder: categoryOrders.get(item.category),
            sortOrder: isFiniteOrder(item.sortOrder) ? Number(item.sortOrder) : sortOrderCounts.get(item.category) * 10,
            status: "published",
            updatedAt: firestore.serverTimestamp(),
            updatedBy: editorEmail,
            importedAt: firestore.serverTimestamp(),
            importedBy: editorEmail
          },
          { merge: true }
        );
        importedCount += 1;
      }
      clearDownloadsCache();
      await loadDocuments();
      await syncPublicDownloadsCache();
      setMessage(`Import เอกสาร ${importedCount.toLocaleString("th-TH")} รายการเข้า Firestore แล้ว และอัปเดต public cache แล้ว`, "success");
      void window.sgcuAuditLog?.write?.({
        action: "content.document.import",
        entityType: "downloadDocument",
        entityId: "bulk",
        after: { importedCount },
        metadata: { count: importedCount },
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("Import เอกสารการเงินเข้า Firestore ไม่สำเร็จ - app.content-management.js", error);
      setMessage(error.message || "Import Sheet เข้า Firestore ไม่สำเร็จ", "error");
    } finally {
      if (buttons.importSheet) buttons.importSheet.disabled = false;
    }
  };

  const exportDocumentsCsv = () => {
    if (!window.sgcuCsvExport?.download) {
      setMessage("ไม่พบตัวช่วย Export CSV", "error");
      return;
    }
    const rows = getFilteredItems().map((item) => ({
      "ชื่อเอกสาร": item.name,
      "รายละเอียด": item.desc,
      "องค์กร": item.org,
      "ลิงก์ EX": item.exUrl,
      "ลิงก์ PDF": item.pdfUrl,
      "ลิงก์ DOCX": item.docxUrl,
      "ลิงก์ XLSX": item.xlsxUrl,
      "หมวดหมู่": item.category,
      "ลำดับหมวดหมู่": isFiniteOrder(item.categoryOrder) ? Number(item.categoryOrder) : "",
      "ลำดับเอกสาร": isFiniteOrder(item.sortOrder) ? Number(item.sortOrder) : ""
    }));
    const ok = window.sgcuCsvExport.download({
      headers: ["ชื่อเอกสาร", "รายละเอียด", "องค์กร", "ลิงก์ EX", "ลิงก์ PDF", "ลิงก์ DOCX", "ลิงก์ XLSX", "หมวดหมู่", "ลำดับหมวดหมู่", "ลำดับเอกสาร"],
      rows,
      fileName: "sgcu-financial-documents"
    });
    if (ok) setMessage("Export CSV เอกสารการเงินแล้ว", "success");
  };

  const saveDocumentItem = async (event) => {
    event.preventDefault();
    const firestore = store();
    const currentUser = auth()?.currentUser;
    if (!firestore.db || !firestore.collection || !firestore.doc || !firestore.addDoc || !firestore.setDoc || !firestore.serverTimestamp) {
      setMessage("ระบบยังไม่พร้อมบันทึก Firestore", "error");
      return;
    }
    setFormDisabled(true);
    try {
      const payload = readFormPayload();
      const editorEmail = currentUser?.email || "";
      const id = fields.id.value.trim();
      const beforeItem = id ? state.items.find((item) => item.id === id) || null : null;
      const nextId = id || slugifyDocumentId(`${payload.category}-${payload.org}-${payload.name}`);
      const isSameCategory = beforeItem && (beforeItem.category || "อื่น ๆ") === payload.category;
      const categoryOrder = isSameCategory && isFiniteOrder(beforeItem.categoryOrder)
        ? Number(beforeItem.categoryOrder)
        : getCategoryOrderFor(payload.category);
      const sortOrder = isSameCategory && isFiniteOrder(beforeItem.sortOrder)
        ? Number(beforeItem.sortOrder)
        : getNextSortOrder(payload.category);
      const savePayload = {
        ...payload,
        categoryOrder,
        sortOrder,
        updatedAt: firestore.serverTimestamp(),
        updatedBy: editorEmail
      };
      if (id) {
        await firestore.setDoc(firestore.doc(firestore.db, DOCUMENTS_COLLECTION, id), savePayload, { merge: true });
        void window.sgcuAuditLog?.write?.({
          action: "content.document.update",
          entityType: "downloadDocument",
          entityId: id,
          before: beforeItem,
          after: payload,
          source: "web_app_staff"
        });
      } else {
        await firestore.setDoc(firestore.doc(firestore.db, DOCUMENTS_COLLECTION, nextId), {
          ...savePayload,
          createdAt: firestore.serverTimestamp(),
          createdBy: editorEmail
        }, { merge: true });
        void window.sgcuAuditLog?.write?.({
          action: "content.document.create",
          entityType: "downloadDocument",
          entityId: nextId,
          after: payload,
          source: "web_app_staff"
        });
      }
      clearDownloadsCache();
      resetForm();
      await loadDocuments();
      await syncPublicDownloadsCache();
      setMessage("บันทึกเอกสารแล้ว ล้าง cache ในเครื่องนี้ และอัปเดต public cache แล้ว", "success");
    } catch (error) {
      console.error("บันทึกเอกสารการเงิน Firestore ไม่สำเร็จ - app.content-management.js", error);
      setMessage(error.message || "บันทึกเอกสารไม่สำเร็จ", "error");
    } finally {
      setFormDisabled(false);
    }
  };

  const persistOrderUpdates = async (updates, successMessage) => {
    const firestore = store();
    const currentUser = auth()?.currentUser;
    if (state.source !== "firestore") {
      setMessage("จัดลำดับได้เมื่อโหลดข้อมูลจาก Firestore เท่านั้น", "error");
      return false;
    }
    if (!updates.length) return true;
    if (!firestore.db || !firestore.doc || !firestore.setDoc || !firestore.serverTimestamp) {
      setMessage("ระบบยังไม่พร้อมบันทึกลำดับ", "error");
      return false;
    }
    state.isReordering = true;
    syncReorderUi();
    renderRows();
    try {
      const editorEmail = currentUser?.email || "";
      for (const update of updates) {
        await firestore.setDoc(
          firestore.doc(firestore.db, DOCUMENTS_COLLECTION, update.id),
          {
            ...update.payload,
            updatedAt: firestore.serverTimestamp(),
            updatedBy: editorEmail
          },
          { merge: true }
        );
      }
      clearDownloadsCache();
      await loadDocuments();
      await syncPublicDownloadsCache();
      setMessage(successMessage || "บันทึกลำดับแล้ว และอัปเดต public cache แล้ว", "success");
      void window.sgcuAuditLog?.write?.({
        action: "content.document.reorder",
        entityType: "downloadDocument",
        entityId: "bulk",
        after: { updates: updates.map((update) => ({ id: update.id, ...update.payload })).slice(0, 50) },
        metadata: {
          count: updates.length,
          idSample: updates.map((update) => update.id).filter(Boolean).slice(0, 20)
        },
        source: "web_app_staff"
      });
      return true;
    } catch (error) {
      console.error("บันทึกลำดับเอกสารการเงินไม่สำเร็จ - app.content-management.js", error);
      setMessage(error.message || "บันทึกลำดับไม่สำเร็จ", "error");
      renderRows();
      return false;
    } finally {
      state.isReordering = false;
      syncReorderUi();
      renderRows();
    }
  };

  const moveDraftCategoryBefore = (category, targetCategory) => {
    if (!category || !targetCategory || category === targetCategory) return false;
    const categories = getOrderedCategories(state.draftItems).map((entry) => entry.category);
    const currentIndex = categories.findIndex((entry) => entry === category);
    const targetIndex = categories.findIndex((entry) => entry === targetCategory);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categories.length) return false;
    const nextCategories = [...categories];
    const [moved] = nextCategories.splice(currentIndex, 1);
    nextCategories.splice(targetIndex, 0, moved);
    const nextOrderByCategory = new Map(nextCategories.map((name, index) => [name, (index + 1) * 10]));
    state.draftItems = state.draftItems.map((item) => ({
      ...item,
      categoryOrder: nextOrderByCategory.get(item.category || "อื่น ๆ") || item.categoryOrder
    }));
    return true;
  };

  const getDraftCategoryOrderFor = (category) => {
    const entry = getOrderedCategories(state.draftItems).find((candidate) => candidate.category === category);
    return entry && Number.isFinite(entry.order) ? entry.order : getCategoryOrderFor(category);
  };

  const renumberDraftCategory = (items, category) => {
    const nextCategoryOrder = getDraftCategoryOrderFor(category);
    const sortedItems = sortDocuments(items.filter((candidate) => (candidate.category || "อื่น ๆ") === category));
    const nextSortOrderById = new Map(sortedItems.map((candidate, index) => [candidate.id, (index + 1) * 10]));
    return items.map((candidate) =>
      (candidate.category || "อื่น ๆ") === category
        ? {
            ...candidate,
            categoryOrder: nextCategoryOrder,
            sortOrder: nextSortOrderById.get(candidate.id) || candidate.sortOrder
          }
        : candidate
    );
  };

  const moveDraftDocumentToCategory = (documentId, targetCategory, targetDocumentId = "") => {
    if (!documentId || !targetCategory) return false;
    const item = state.draftItems.find((candidate) => candidate.id === documentId);
    if (!item) return false;
    const sourceCategory = item.category || "อื่น ๆ";
    const normalizedTargetCategory = targetCategory || "อื่น ๆ";
    if (targetDocumentId && targetDocumentId === documentId && sourceCategory === normalizedTargetCategory) return false;

    const categoryOrder = getDraftCategoryOrderFor(normalizedTargetCategory);
    const allTargetItems = sortDocuments(
      state.draftItems.filter((candidate) => (candidate.category || "อื่น ๆ") === normalizedTargetCategory)
    );
    const targetIndex = targetDocumentId
      ? allTargetItems.findIndex((candidate) => candidate.id === targetDocumentId)
      : allTargetItems.length;
    if (targetDocumentId && targetIndex < 0) return false;
    const targetItems = allTargetItems.filter((candidate) => candidate.id !== documentId);

    const movedItem = {
      ...item,
      category: normalizedTargetCategory,
      categoryOrder
    };
    targetItems.splice(Math.min(targetIndex, targetItems.length), 0, movedItem);

    const targetSortOrderById = new Map(targetItems.map((candidate, index) => [candidate.id, (index + 1) * 10]));
    let nextDraftItems = state.draftItems.map((candidate) => {
      if (candidate.id === documentId) {
        return {
          ...movedItem,
          sortOrder: targetSortOrderById.get(documentId) || candidate.sortOrder
        };
      }
      if ((candidate.category || "อื่น ๆ") === normalizedTargetCategory && targetSortOrderById.has(candidate.id)) {
        return {
          ...candidate,
          categoryOrder,
          sortOrder: targetSortOrderById.get(candidate.id)
        };
      }
      return candidate;
    });
    if (sourceCategory !== normalizedTargetCategory) {
      nextDraftItems = renumberDraftCategory(nextDraftItems, sourceCategory);
      state.collapsedCategories.delete(getCategoryKey(normalizedTargetCategory));
    }
    state.draftItems = nextDraftItems;
    return true;
  };

  const enterReorderMode = () => {
    if (state.source !== "firestore") {
      setMessage("จัดลำดับได้เมื่อโหลดข้อมูลจาก Firestore เท่านั้น", "error");
      return;
    }
    state.isReorderMode = true;
    state.draftItems = sortDocuments(state.items.map((item) => ({ ...item })));
    state.drag = null;
    state.collapsedCategories = new Set(getOrderedCategories(state.draftItems).map((entry) => getCategoryKey(entry.category)));
    syncReorderUi();
    renderRows();
    setMessage("ลากหัวหมวดเพื่อจัดลำดับหมวด หรือลากเอกสารไปวางบนหัวหมวด/รายการในหมวดปลายทาง", "info");
  };

  const cancelReorderMode = () => {
    state.isReorderMode = false;
    state.draftItems = [];
    state.drag = null;
    state.collapsedCategories = new Set();
    syncReorderUi();
    renderRows();
    setMessage("");
  };

  const saveReorderDraft = async () => {
    const categories = getOrderedCategories(state.draftItems).map((entry) => entry.category);
    const categoryOrderByName = new Map(categories.map((category, index) => [category, (index + 1) * 10]));
    const updates = [];
    categories.forEach((category) => {
      getDocumentsInCategory(category).forEach((item, index) => {
        const nextCategoryOrder = categoryOrderByName.get(category);
        const nextSortOrder = (index + 1) * 10;
        const original = state.items.find((candidate) => candidate.id === item.id);
        const nextCategory = item.category || "อื่น ๆ";
        const originalCategory = original?.category || "อื่น ๆ";
        if (!original || originalCategory !== nextCategory || Number(original.categoryOrder) !== nextCategoryOrder || Number(original.sortOrder) !== nextSortOrder) {
          updates.push({
            id: item.id,
            payload: {
              category: nextCategory,
              categoryOrder: nextCategoryOrder,
              sortOrder: nextSortOrder
            }
          });
        }
      });
    });
    const saved = await persistOrderUpdates(updates, "บันทึกลำดับเอกสารการเงินแล้ว");
    if (saved) {
      state.isReorderMode = false;
      state.draftItems = [];
      state.drag = null;
      state.collapsedCategories = new Set();
      syncReorderUi();
    }
  };

  const archiveCurrentItem = async () => {
    if (!fields.id.value.trim()) {
      fields.status.value = "archived";
      return;
    }
    fields.status.value = "archived";
    form.requestSubmit();
  };

  tableBody.addEventListener("click", (event) => {
    if (state.isReorderMode) {
      const toggleButton = event.target.closest("[data-category-toggle]");
      if (toggleButton) {
        event.preventDefault();
        toggleCategoryCollapsed(toggleButton.dataset.category || "");
        renderRows();
        return;
      }
      if (event.target.closest("button, select, a")) return;
      event.preventDefault();
      return;
    }
    const row = event.target.closest("[data-document-id]");
    if (!row || event.target.closest("a")) return;
    const item = state.items.find((candidate) => candidate.id === row.dataset.documentId);
    fillForm(item);
  });
  tableBody.addEventListener("keydown", (event) => {
    if (state.isReorderMode) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button, a")) return;
    const row = event.target.closest("[data-document-id]");
    if (!row) return;
    event.preventDefault();
    const item = state.items.find((candidate) => candidate.id === row.dataset.documentId);
    fillForm(item);
  });

  tableBody.addEventListener("dragstart", (event) => {
    if (!state.isReorderMode || state.isReordering) return;
    const categoryHandle = event.target.closest("[data-category-drag-handle]");
    const documentHandle = event.target.closest("[data-document-drag-handle]");
    if (!categoryHandle && !documentHandle) return;
    const categoryRow = event.target.closest(".content-documents-category-row");
    const documentRow = event.target.closest(".content-documents-row");
    if (categoryHandle && categoryRow) {
      state.drag = { type: "category", category: categoryRow.dataset.category || "" };
      categoryRow.classList.add("is-dragging");
    } else if (documentHandle && documentRow) {
      state.drag = {
        type: "document",
        id: documentRow.dataset.documentId || "",
        category: documentRow.dataset.category || ""
      };
      documentRow.classList.add("is-dragging");
    }
    if (state.drag && event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", state.drag.type);
    }
  });

  tableBody.addEventListener("dragover", (event) => {
    if (!state.isReorderMode || !state.drag) return;
    const categoryRow = event.target.closest(".content-documents-category-row");
    const documentRow = event.target.closest(".content-documents-row");
    const canDropCategory = state.drag.type === "category" && categoryRow;
    const canDropDocument = state.drag.type === "document" && (documentRow || categoryRow);
    if (!canDropCategory && !canDropDocument) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    tableBody.querySelectorAll(".is-drop-target").forEach((row) => row.classList.remove("is-drop-target"));
    (categoryRow || documentRow)?.classList.add("is-drop-target");
  });

  tableBody.addEventListener("dragleave", (event) => {
    const row = event.target.closest(".content-documents-category-row, .content-documents-row");
    row?.classList.remove("is-drop-target");
  });

  const clearReorderDragClasses = () => {
    tableBody.querySelectorAll(".is-dragging, .is-drop-target").forEach((row) => row.classList.remove("is-dragging", "is-drop-target"));
  };

  const applyReorderDropTarget = (target) => {
    tableBody.querySelectorAll(".is-drop-target").forEach((row) => row.classList.remove("is-drop-target"));
    target?.classList.add("is-drop-target");
  };

  const resolvePointerDropTarget = (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element || !state.drag) return null;
    const categoryRow = element.closest(".content-documents-category-row");
    const documentRow = element.closest(".content-documents-row");
    if (state.drag.type === "category" && categoryRow) {
      return { row: categoryRow, category: categoryRow.dataset.category || "" };
    }
    if (state.drag.type === "document" && documentRow) {
      return { row: documentRow, id: documentRow.dataset.documentId || "", category: documentRow.dataset.category || "" };
    }
    if (state.drag.type === "document" && categoryRow) {
      return { row: categoryRow, category: categoryRow.dataset.category || "" };
    }
    return null;
  };

  tableBody.addEventListener("drop", (event) => {
    if (!state.isReorderMode || !state.drag) return;
    event.preventDefault();
    const categoryRow = event.target.closest(".content-documents-category-row");
    const documentRow = event.target.closest(".content-documents-row");
    let moved = false;
    if (state.drag.type === "category" && categoryRow) {
      moved = moveDraftCategoryBefore(state.drag.category, categoryRow.dataset.category || "");
    } else if (state.drag.type === "document" && documentRow) {
      moved = moveDraftDocumentToCategory(state.drag.id, documentRow.dataset.category || "", documentRow.dataset.documentId || "");
    } else if (state.drag.type === "document" && categoryRow) {
      moved = moveDraftDocumentToCategory(state.drag.id, categoryRow.dataset.category || "");
    }
    state.drag = null;
    clearReorderDragClasses();
    if (moved) renderRows();
  });

  tableBody.addEventListener("dragend", () => {
    state.drag = null;
    clearReorderDragClasses();
  });

  tableBody.addEventListener("pointerdown", (event) => {
    if (!state.isReorderMode || state.isReordering || event.pointerType === "mouse") return;
    const handle = event.target.closest("[data-category-drag-handle], [data-document-drag-handle]");
    if (!handle) return;
    const categoryRow = handle.closest(".content-documents-category-row");
    const documentRow = handle.closest(".content-documents-row");
    if (handle.matches("[data-category-drag-handle]") && categoryRow) {
      state.drag = { type: "category", category: categoryRow.dataset.category || "", pointer: true };
      categoryRow.classList.add("is-dragging");
    } else if (documentRow) {
      state.drag = {
        type: "document",
        id: documentRow.dataset.documentId || "",
        category: documentRow.dataset.category || "",
        pointer: true
      };
      documentRow.classList.add("is-dragging");
    }
    if (!state.drag) return;
    event.preventDefault();
    handle.setPointerCapture?.(event.pointerId);
  });

  tableBody.addEventListener("pointermove", (event) => {
    if (!state.isReorderMode || !state.drag?.pointer) return;
    event.preventDefault();
    const target = resolvePointerDropTarget(event.clientX, event.clientY);
    applyReorderDropTarget(target?.row || null);
  });

  tableBody.addEventListener("pointerup", (event) => {
    if (!state.isReorderMode || !state.drag?.pointer) return;
    event.preventDefault();
    const target = resolvePointerDropTarget(event.clientX, event.clientY);
    let moved = false;
    if (target && state.drag.type === "category") {
      moved = moveDraftCategoryBefore(state.drag.category, target.category);
    } else if (target && state.drag.type === "document") {
      moved = moveDraftDocumentToCategory(state.drag.id, target.category, target.id || "");
    }
    state.drag = null;
    clearReorderDragClasses();
    if (moved) renderRows();
  });

  tableBody.addEventListener("pointercancel", () => {
    if (!state.drag?.pointer) return;
    state.drag = null;
    clearReorderDragClasses();
  });

  form.addEventListener("submit", saveDocumentItem);
  filters.query?.addEventListener("input", () => {
    state.filters.query = filters.query.value.trim();
    renderRows();
  });
  filters.category?.addEventListener("change", () => {
    state.filters.category = filters.category.value || "all";
    renderRows();
  });
  filters.org?.addEventListener("change", () => {
    state.filters.org = filters.org.value || "all";
    renderRows();
  });
  filters.format?.addEventListener("change", () => {
    state.filters.format = filters.format.value || "all";
    renderRows();
  });
  filters.reset?.addEventListener("click", () => {
    if (filters.query) filters.query.value = "";
    if (filters.category) filters.category.value = "all";
    if (filters.org) filters.org.value = "all";
    if (filters.format) filters.format.value = "all";
    state.filters = { query: "", category: "all", org: "all", format: "all" };
    renderRows();
  });
  buttons.refresh?.addEventListener("click", () => void loadDocuments());
  buttons.importSheet?.addEventListener("click", () => void importSheetToFirestore());
  buttons.exportCsv?.addEventListener("click", exportDocumentsCsv);
  buttons.reorder?.addEventListener("click", enterReorderMode);
  buttons.reorderSave?.addEventListener("click", () => void saveReorderDraft());
  buttons.reorderCancel?.addEventListener("click", cancelReorderMode);
  buttons.reset?.addEventListener("click", resetForm);
  buttons.archive?.addEventListener("click", () => void archiveCurrentItem());

  resetForm();
  void loadDocuments();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initContentManagementStaffPage, { once: true });
} else {
  initContentManagementStaffPage();
}
