/* ดาวน์โหลดเอกสารการเงิน */
const DOWNLOADS_CACHE_SOURCE_FIRESTORE = "firestore";
const DOWNLOADS_CACHE_SOURCE_PUBLIC_CACHE = "publicCache";
const DOWNLOADS_CACHE_SOURCE_SHEETS = "sheets";
const DOWNLOADS_PUBLIC_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const DOWNLOADS_PUBLIC_FIRESTORE_LIMIT = 80;
let downloadPreviewModalInitialized = false;

function toggleDownloadSkeleton(isLoading) {
  const downloadSkeletonEl = document.getElementById("downloadSkeleton");
  const downloadListEl = document.getElementById("downloadList");
  if (downloadSkeletonEl) {
    downloadSkeletonEl.style.display = isLoading ? "grid" : "none";
  }
  if (downloadListEl) {
    downloadListEl.style.display = isLoading ? "none" : "";
  }
}

function createDownloadHeader(titleText) {
  const header = document.createElement("div");
  header.className = "download-card-header";

  const bar = document.createElement("span");
  bar.className = "download-card-bar";
  header.appendChild(bar);

  const title = document.createElement("h3");
  title.className = "download-card-title";
  title.textContent = titleText;
  header.appendChild(title);

  return header;
}

function createDownloadListItem(doc) {
  const li = document.createElement("li");
  li.className = "download-item";

  const main = document.createElement("div");
  main.className = "download-main";
  li.appendChild(main);

  const title = document.createElement("div");
  title.className = "download-title";
  title.textContent = doc.org ? `${doc.name} (${doc.org})` : doc.name;
  main.appendChild(title);

  const buttons = document.createElement("div");
  buttons.className = "download-buttons";
  main.appendChild(buttons);

  addDownloadButton(buttons, "EX", doc.exUrl, doc);
  addDownloadButton(buttons, "PDF", doc.pdfUrl, doc);
  addDownloadButton(buttons, "DOCX", doc.docxUrl);
  addDownloadButton(buttons, "XLSX", doc.xlsxUrl);

  const desc = document.createElement("div");
  desc.className = "download-desc";
  desc.textContent = doc.desc || "";
  li.appendChild(desc);

  return li;
}

function normalizeDownloadOrder(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
}

function compareDownloadDocuments(a, b) {
  return (
    normalizeDownloadOrder(a.categoryOrder) - normalizeDownloadOrder(b.categoryOrder) ||
    (a.category || "").localeCompare(b.category || "", "th") ||
    normalizeDownloadOrder(a.sortOrder) - normalizeDownloadOrder(b.sortOrder) ||
    (a.name || "").localeCompare(b.name || "", "th")
  );
}

function hasExplicitDownloadOrder(items) {
  return (items || []).some((item) => Number.isFinite(Number(item.categoryOrder)) || Number.isFinite(Number(item.sortOrder)));
}

function normalizeDownloadFirestoreItem(docSnap) {
  const data = docSnap?.data ? docSnap.data() : {};
  const links = data.links || {};
  const name = (data.name || data.title || "").toString().trim();
  if (!name) return null;
  return {
    id: docSnap.id || data.id || `FS-DOC-${name}`,
    name,
    desc: (data.desc || data.description || "").toString().trim(),
    org: (data.org || data.organization || "").toString().trim(),
    exUrl: (data.exUrl || data.exampleUrl || links.ex || "").toString().trim(),
    pdfUrl: (data.pdfUrl || links.pdf || "").toString().trim(),
    docxUrl: (data.docxUrl || links.docx || "").toString().trim(),
    xlsxUrl: (data.xlsxUrl || links.xlsx || "").toString().trim(),
    category: (data.category || "").toString().trim() || "อื่น ๆ",
    categoryOrder: data.categoryOrder,
    sortOrder: data.sortOrder
  };
}

function normalizeDownloadPublicCacheItem(data, index) {
  const links = data?.links || {};
  const name = (data?.name || data?.title || "").toString().trim();
  if (!name) return null;
  return {
    id: data.id || `CACHE-DOC-${index + 1}-${name}`,
    name,
    desc: (data.desc || data.description || "").toString().trim(),
    org: (data.org || data.organization || "").toString().trim(),
    exUrl: (data.exUrl || data.exampleUrl || links.ex || "").toString().trim(),
    pdfUrl: (data.pdfUrl || links.pdf || "").toString().trim(),
    docxUrl: (data.docxUrl || links.docx || "").toString().trim(),
    xlsxUrl: (data.xlsxUrl || links.xlsx || "").toString().trim(),
    category: (data.category || "").toString().trim() || "อื่น ๆ",
    categoryOrder: data.categoryOrder,
    sortOrder: data.sortOrder
  };
}

function normalizeDownloadSheetRow(row, index) {
  const name = (row?.[0] || "").toString().trim();
  if (!name) return null;
  return {
    id: `sheet-document-${index + 1}`,
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
}

function renderDownloadDocuments(listEl, documents) {
  if (!listEl) return [];
  listEl.innerHTML = "";
  const categories = {};

  (documents || []).forEach((doc) => {
    if (!doc?.name) return;
    const category = (doc.category || "").trim() || "อื่น ๆ";
    if (!categories[category]) categories[category] = [];
    categories[category].push(doc);
  });

  const categoryNames = Object.keys(categories);
  categoryNames.forEach((categoryName) => {
    const section = document.createElement("section");
    section.className = "download-section-card";
    section.dataset.category = categoryName;
    section.appendChild(createDownloadHeader(categoryName));
    const ul = document.createElement("ul");
    ul.className = "download-card-list";
    section.appendChild(ul);

    categories[categoryName].forEach((doc) => {
      ul.appendChild(createDownloadListItem(doc));
    });

    listEl.appendChild(section);
  });

  return categoryNames;
}

async function loadDownloadDocumentsFromPublicCache() {
  const store = window.sgcuFirestore || {};
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const collectionName = appConfig.firestore?.collections?.publicCache || "publicCache";
  if (!store.db || !store.doc || !store.getDoc) return null;

  const snap = await store.getDoc(store.doc(store.db, collectionName, "downloads"));
  const data = snap?.exists?.() ? snap.data() || {} : {};
  if (!Array.isArray(data.items) || !data.items.length) return null;

  const items = data.items.map((item, index) => normalizeDownloadPublicCacheItem(item, index)).filter(Boolean);
  return items.length ? items.sort(compareDownloadDocuments) : null;
}

async function loadDownloadDocumentsFromFirestore() {
  const store = window.sgcuFirestore || {};
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const collectionName = appConfig.firestore?.collections?.downloadDocuments || "downloadDocuments";
  if (!store.db || !store.collection || !store.getDocs) return null;

  const collectionRef = store.collection(store.db, collectionName);
  const constraints = [];
  if (store.where) constraints.push(store.where("status", "==", "published"));
  if (store.limit) constraints.push(store.limit(DOWNLOADS_PUBLIC_FIRESTORE_LIMIT));
  const listQuery = store.query && constraints.length ? store.query(collectionRef, ...constraints) : collectionRef;
  const snapshot = await store.getDocs(listQuery);
  const items = [];
  snapshot.forEach((docSnap) => {
    const item = normalizeDownloadFirestoreItem(docSnap);
    if (item) items.push(item);
  });
  return items.sort(compareDownloadDocuments);
}

function ensureDownloadPreviewModal() {
  let modal = document.getElementById("downloadPreviewModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "downloadPreviewModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("aria-labelledby", "downloadPreviewModalTitle");
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <div id="downloadPreviewModalTitle" class="modal-title"></div>
            <div id="downloadPreviewModalSubtitle" class="modal-subtitle"></div>
          </div>
          <button id="downloadPreviewModalClose" type="button" class="modal-close" aria-label="ปิด">✕</button>
        </div>
        <div id="downloadPreviewModalBody" class="modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  if (!downloadPreviewModalInitialized) {
    const closeButton = modal.querySelector("#downloadPreviewModalClose");
    closeButton?.addEventListener("click", closeDownloadPreviewModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeDownloadPreviewModal();
    });
    downloadPreviewModalInitialized = true;
  }

  return modal;
}

function closeDownloadPreviewModal() {
  const modal = document.getElementById("downloadPreviewModal");
  const body = document.getElementById("downloadPreviewModalBody");
  if (!modal) return;
  if (typeof closeDialog === "function") {
    closeDialog(modal);
  } else {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }
  if (body) body.innerHTML = "";
}

function openDownloadPreviewModal(doc, label, url) {
  const previewUrl = toPreviewUrl(url);
  if (!previewUrl) return;

  const modal = ensureDownloadPreviewModal();
  const titleEl = modal.querySelector("#downloadPreviewModalTitle");
  const subtitleEl = modal.querySelector("#downloadPreviewModalSubtitle");
  const bodyEl = modal.querySelector("#downloadPreviewModalBody");
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = doc?.name || "แบบฟอร์มการเงิน";
  if (subtitleEl) {
    subtitleEl.textContent = doc?.desc || "";
    subtitleEl.hidden = !doc?.desc;
  }
  bodyEl.innerHTML = "";

  const action = document.createElement("a");
  action.className = "download-btn download-preview-download";
  action.target = "_blank";
  action.rel = "noopener noreferrer";
  action.href = toDownloadUrl(url, label.toLowerCase());
  action.textContent = "⬇ ดาวน์โหลดไฟล์";
  bodyEl.appendChild(action);

  const frame = document.createElement("div");
  frame.className = "download-preview-frame news-preview-frame";
  const iframe = document.createElement("iframe");
  iframe.src = previewUrl;
  iframe.title = `preview-${label.toLowerCase()}-${doc?.name || "financial-document"}`;
  iframe.allow = "fullscreen";
  frame.appendChild(iframe);
  bodyEl.appendChild(frame);

  if (typeof openDialog === "function") {
    openDialog(modal, { focusSelector: "#downloadPreviewModalClose" });
  } else {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }
}

/* สร้างปุ่มดาวน์โหลด 1 ปุ่ม (EX / PDF / DOCX / XLSX) */
function addDownloadButton(wrapper, label, url, doc = null) {
  if (!url || url === "-" || url === "--" || url === "") return;

  if (label === "EX" || label === "PDF") {
    const button = document.createElement("button");
    button.className = "download-btn";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => openDownloadPreviewModal(doc, label, url));
    wrapper.appendChild(button);
    return;
  }

  const a = document.createElement("a");
  a.className = "download-btn";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.href = toDownloadUrl(url, label.toLowerCase());
  a.textContent = label;
  wrapper.appendChild(a);
}

function applyDownloadCategoryFilter(listEl, selected) {
  if (!listEl) return;
  const target = selected || "all";
  listEl.querySelectorAll(".download-section-card").forEach((section) => {
    const category = (section.dataset.category || "").trim();
    const isVisible = target === "all" || category === target;
    section.style.display = isVisible ? "" : "none";
  });
}

function initDownloadCategoryFilter(listEl) {
  const selectEl = document.getElementById("downloadCategorySelect");
  if (!selectEl || !listEl) return;

  const sections = Array.from(listEl.querySelectorAll(".download-section-card"));
  const categories = [];

  sections.forEach((section) => {
    let category = (section.dataset.category || "").trim();
    if (!category) {
      const titleEl = section.querySelector(".download-card-title");
      category = (titleEl ? titleEl.textContent : "").trim();
      if (category) {
        section.dataset.category = category;
      }
    }
    if (category && !categories.includes(category)) {
      categories.push(category);
    }
  });

  const currentValue = selectEl.value || "all";
  selectEl.innerHTML = '<option value="all">ทุกประเภท</option>';
  categories.forEach((category) => {
    const opt = document.createElement("option");
    opt.value = category;
    opt.textContent = category;
    selectEl.appendChild(opt);
  });

  selectEl.value = categories.includes(currentValue) ? currentValue : "all";

  if (!selectEl.dataset.bound) {
    selectEl.addEventListener("change", (event) => {
      applyDownloadCategoryFilter(listEl, event.target.value);
    });
    selectEl.dataset.bound = "true";
  }

  applyDownloadCategoryFilter(listEl, selectEl.value);
}

function setDownloadListState(listEl, type, message, options = {}) {
  if (!listEl) return;
  const safeType = (type || "").toString().trim();
  const text = (message || "").toString().trim();
  if (!safeType || !text) return;
  if (safeType === "empty") {
    listEl.innerHTML = renderListEmptyState(text, "เอกสารดาวน์โหลดจะแสดงที่นี่เมื่อมีรายการ");
    return;
  }
  renderLoadState(listEl, safeType, text, {
    className: "panel load-state",
    captionClassName: "panel-caption",
    retryButtonId: "downloadRetryButton",
    onRetry: options.showRetry ? () => void loadDownloadDocuments() : null
  });
}

async function loadDownloadDocuments() {
  const listEl = document.getElementById("downloadList");
  const categorySelectEl = document.getElementById("downloadCategorySelect");
  if (!listEl) {
    if (typeof markLoaderStep === "function") {
      markLoaderStep("downloads");
    }
    return;
  }

  try {
    toggleDownloadSkeleton(true);
    listEl.setAttribute("aria-busy", "true");
    if (categorySelectEl) categorySelectEl.disabled = true;

    const cached = getCache(CACHE_KEYS.DOWNLOADS, DOWNLOADS_PUBLIC_CACHE_TTL_MS);
    if (
      (cached?.source === DOWNLOADS_CACHE_SOURCE_FIRESTORE || cached?.source === DOWNLOADS_CACHE_SOURCE_PUBLIC_CACHE) &&
      Array.isArray(cached.items) &&
      cached.items.length
    ) {
      renderDownloadDocuments(listEl, cached.items);
      clearLoadError("downloads");
      initDownloadCategoryFilter(listEl);
      if (categorySelectEl) categorySelectEl.disabled = false;
      return;
    }

    try {
      const firestoreItems = (await loadDownloadDocumentsFromPublicCache()) || (await loadDownloadDocumentsFromFirestore());
      if (Array.isArray(firestoreItems) && firestoreItems.length) {
        renderDownloadDocuments(listEl, firestoreItems);
        initDownloadCategoryFilter(listEl);
        setCache(CACHE_KEYS.DOWNLOADS, {
          source: DOWNLOADS_CACHE_SOURCE_PUBLIC_CACHE,
          items: firestoreItems
        });
        clearLoadError("downloads");
        if (categorySelectEl) categorySelectEl.disabled = false;
        return;
      }
    } catch (firestoreErr) {
      console.warn("โหลดเอกสารจาก Firestore ไม่สำเร็จ ใช้ Google Sheets fallback - app.downloads.js", firestoreErr);
      if (cached && typeof cached === "string" && cached.trim()) {
        listEl.innerHTML = cached;
        clearLoadError("downloads");
        initDownloadCategoryFilter(listEl);
        if (categorySelectEl) categorySelectEl.disabled = false;
        return;
      }
      if (cached?.source === DOWNLOADS_CACHE_SOURCE_SHEETS && Array.isArray(cached.items) && cached.items.length) {
        renderDownloadDocuments(listEl, cached.items);
        clearLoadError("downloads");
        initDownloadCategoryFilter(listEl);
        if (categorySelectEl) categorySelectEl.disabled = false;
        return;
      }
    }

    if (!DOWNLOAD_SHEET) {
      setDownloadListState(listEl, "empty", "ยังไม่มีเอกสารดาวน์โหลด");
      clearLoadError("downloads");
      if (categorySelectEl) categorySelectEl.disabled = false;
      return;
    }

    await window.sgcuVendorLoader?.ensurePapa?.();
    const csvText = await fetchTextWithProgress(DOWNLOAD_SHEET, (ratio) => {
      if (typeof updateLoaderProgress === "function") {
        updateLoaderProgress("downloads", ratio);
      }
    });
    const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
    const rows = parsed.data;

    if (!rows || rows.length < 2) {
      setDownloadListState(listEl, "empty", "ยังไม่มีเอกสารดาวน์โหลด");
      if (categorySelectEl) categorySelectEl.disabled = false;
      return;
    }

    const sheetItems = rows
      .slice(1)
      .map((row, index) => normalizeDownloadSheetRow(row, index))
      .filter(Boolean);
    if (hasExplicitDownloadOrder(sheetItems)) {
      sheetItems.sort(compareDownloadDocuments);
    }
    const categoryNames = renderDownloadDocuments(listEl, sheetItems);
    if (!categoryNames.length) {
      setDownloadListState(listEl, "empty", "ยังไม่มีเอกสารดาวน์โหลด");
      if (categorySelectEl) categorySelectEl.disabled = false;
      return;
    }

    initDownloadCategoryFilter(listEl);

    setCache(CACHE_KEYS.DOWNLOADS, {
      source: DOWNLOADS_CACHE_SOURCE_SHEETS,
      items: sheetItems
    });
    clearLoadError("downloads");
    if (categorySelectEl) categorySelectEl.disabled = false;
  } catch (err) {
    console.error("โหลดชีตดาวน์โหลดเอกสารไม่ได้ - app.js:4572", err);
    recordLoadError("downloads", "โหลดรายการดาวน์โหลดไม่สำเร็จ", { showRetry: true });
    setDownloadListState(listEl, "error", "ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้", { showRetry: true });
    if (categorySelectEl) categorySelectEl.disabled = true;
  } finally {
    toggleDownloadSkeleton(false);
    listEl.removeAttribute("aria-busy");
    listEl.style.display = "";
    if (typeof markLoaderStep === "function") {
      markLoaderStep("downloads");
    }
  }
}
