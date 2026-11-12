/* ข่าวและประกาศจากฝ่ายเหรัญญิก */

const HOME_NEWS_PREVIEW_DESKTOP_LIMIT = 4;
const HOME_NEWS_PREVIEW_MOBILE_LIMIT = 2;
const HOME_NEWS_PREVIEW_MOBILE_QUERY = "(max-width: 640px)";
const NEWS_AUTO_POPUP_RECENT_DAYS = 7;
const NEWS_AUTO_POPUP_STORAGE_KEY = "sgcu:auto-news-popup:v1";
const NEWS_PUBLIC_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const NEWS_PUBLIC_FIRESTORE_LIMIT = 30;
const newsFilterState = {
  query: "",
  year: "all",
  category: "all",
  audience: "all",
  sort: "latest"
};
let newsFilterInitialized = false;
const NEWS_CACHE_SOURCE_FIRESTORE = "firestore";
const NEWS_CACHE_SOURCE_PUBLIC_CACHE = "publicCache";
const NEWS_CACHE_SOURCE_SHEETS = "sheets";
let newsScheduleRefreshTimer = null;
let homeNewsPreviewViewportHandlerInitialized = false;
let newsAutoPopupScheduled = false;
let newsAutoPopupShownThisSession = false;

function getHomeNewsPreviewLimit() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return HOME_NEWS_PREVIEW_DESKTOP_LIMIT;
  }
  return window.matchMedia(HOME_NEWS_PREVIEW_MOBILE_QUERY).matches
    ? HOME_NEWS_PREVIEW_MOBILE_LIMIT
    : HOME_NEWS_PREVIEW_DESKTOP_LIMIT;
}

function initHomeNewsPreviewViewportHandler() {
  if (
    homeNewsPreviewViewportHandlerInitialized ||
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return;
  }

  const viewportQuery = window.matchMedia(HOME_NEWS_PREVIEW_MOBILE_QUERY);
  const renderOnViewportChange = () => renderHomeNewsPreview();
  if (typeof viewportQuery.addEventListener === "function") {
    viewportQuery.addEventListener("change", renderOnViewportChange);
  } else if (typeof viewportQuery.addListener === "function") {
    viewportQuery.addListener(renderOnViewportChange);
  }
  homeNewsPreviewViewportHandlerInitialized = true;
}

function toggleNewsSkeleton(isLoading) {
  const homePreview = document.getElementById("homeNewsPreview");
  if (homeNewsSkeletonEl) {
    homeNewsSkeletonEl.style.display = isLoading ? "grid" : "none";
  }
  if (homePreview) {
    homePreview.style.display = isLoading ? "none" : "";
  }
  if (newsListSkeletonEl) {
    newsListSkeletonEl.style.display = isLoading ? "grid" : "none";
  }
  if (newsListEl) {
    newsListEl.style.display = isLoading ? "none" : "";
  }
}

function normalizeNewsFirestoreDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
  }
  return value.toString ? value.toString().trim() : "";
}

function normalizeNewsStoredDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function normalizeNewsPublishAt(value) {
  const date = normalizeNewsStoredDate(value);
  return date ? date.toISOString() : "";
}

function isNewsCurrentlyVisible(item, nowMs = Date.now()) {
  const status = (item?.status || "published").toString();
  if (status !== "published") return false;

  const publishDate = normalizeNewsStoredDate(item.publishAt);
  if (publishDate && publishDate.getTime() > nowMs) return false;

  return true;
}

function getVisibleNewsItems() {
  const nowMs = Date.now();
  return newsItems.filter((item) => isNewsCurrentlyVisible(item, nowMs));
}

function scheduleNextNewsRefresh() {
  if (newsScheduleRefreshTimer) {
    clearTimeout(newsScheduleRefreshTimer);
    newsScheduleRefreshTimer = null;
  }

  const nowMs = Date.now();
  const nextPublishMs = newsItems
    .map((item) => normalizeNewsStoredDate(item.publishAt)?.getTime() || 0)
    .filter((timeMs) => timeMs > nowMs)
    .sort((a, b) => a - b)[0];

  if (!nextPublishMs) return;

  newsScheduleRefreshTimer = setTimeout(() => {
    newsScheduleRefreshTimer = null;
    renderNewsList();
  }, Math.max(1000, Math.min(nextPublishMs - nowMs + 1000, 2147483647)));
}

function normalizeNewsFirestoreItem(docSnap) {
  const data = docSnap?.data ? docSnap.data() : {};
  const title = (data.title || "").toString().trim();
  if (!title) return null;
  return {
    id: docSnap.id || data.id || `FS-NEWS-${title}`,
    title,
    date: normalizeNewsFirestoreDate(data.date || data.publishedAt || data.createdAt),
    year: (data.academicYear || data.year || "").toString().trim(),
    category: (data.category || "").toString().trim(),
    audience: (data.audience || "").toString().trim(),
    summary: (data.summary || data.body || "").toString().trim(),
    previewUrl: (data.previewUrl || data.url || "").toString().trim(),
    expireDate: normalizeNewsFirestoreDate(data.expireDate),
    publishAt: normalizeNewsPublishAt(data.publishAt),
    pinned: data.pinned === true,
    status: (data.status || "published").toString()
  };
}

function normalizeNewsPublicCacheItem(data, index) {
  const title = (data?.title || "").toString().trim();
  if (!title) return null;
  return {
    id: data.id || `CACHE-NEWS-${index + 1}-${title}`,
    title,
    date: normalizeNewsFirestoreDate(data.date || data.publishedAt || data.createdAt),
    year: (data.academicYear || data.year || "").toString().trim(),
    category: (data.category || "").toString().trim(),
    audience: (data.audience || "").toString().trim(),
    summary: (data.summary || data.body || "").toString().trim(),
    previewUrl: (data.previewUrl || data.url || "").toString().trim(),
    expireDate: normalizeNewsFirestoreDate(data.expireDate),
    publishAt: normalizeNewsPublishAt(data.publishAt),
    pinned: data.pinned === true,
    status: (data.status || "published").toString()
  };
}

function sortNewsItems(list) {
  return list.sort((a, b) => {
    const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    if (pinDiff !== 0) return pinDiff;

    const dA = parseNewsDate(a.date);
    const dB = parseNewsDate(b.date);
    const tA = dA ? dA.getTime() : 0;
    const tB = dB ? dB.getTime() : 0;

    if (tA === tB) return 0;
    return tB - tA;
  });
}

async function loadNewsFromPublicCache() {
  const store = window.sgcuFirestore || {};
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const collectionName = appConfig.firestore?.collections?.publicCache || "publicCache";
  if (!store.db || !store.doc || !store.getDoc) return null;

  const snap = await store.getDoc(store.doc(store.db, collectionName, "news"));
  const data = snap?.exists?.() ? snap.data() || {} : {};
  if (!Array.isArray(data.items) || !data.items.length) return null;

  const items = data.items
    .map((item, index) => normalizeNewsPublicCacheItem(item, index))
    .filter(Boolean)
    .filter((item) => item.status === "published");
  return items.length ? sortNewsItems(items) : null;
}

async function loadNewsFromFirestore() {
  const store = window.sgcuFirestore || {};
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const collectionName = appConfig.firestore?.collections?.newsItems || "newsItems";
  if (!store.db || !store.collection || !store.getDocs) return null;

  const collectionRef = store.collection(store.db, collectionName);
  const constraints = [];
  if (store.where) constraints.push(store.where("status", "==", "published"));
  if (store.limit) constraints.push(store.limit(NEWS_PUBLIC_FIRESTORE_LIMIT));
  const listQuery = store.query && constraints.length ? store.query(collectionRef, ...constraints) : collectionRef;
  const snapshot = await store.getDocs(listQuery);
  const items = [];
  snapshot.forEach((docSnap) => {
    const item = normalizeNewsFirestoreItem(docSnap);
    if (item) items.push(item);
  });
  return sortNewsItems(items);
}

async function loadNewsFromSheet() {
  try {
    toggleNewsSkeleton(true);

    const cached = getCache(CACHE_KEYS.NEWS, NEWS_PUBLIC_CACHE_TTL_MS);
    if (
      (cached?.source === NEWS_CACHE_SOURCE_FIRESTORE || cached?.source === NEWS_CACHE_SOURCE_PUBLIC_CACHE) &&
      Array.isArray(cached.items) &&
      cached.items.length
    ) {
      newsItems = cached.items;
      clearLoadError("news");
      renderNewsList();
      return;
    }

    try {
      const firestoreItems = (await loadNewsFromPublicCache()) || (await loadNewsFromFirestore());
      if (Array.isArray(firestoreItems) && firestoreItems.length) {
        newsItems = firestoreItems;
        setCache(CACHE_KEYS.NEWS, {
          source: NEWS_CACHE_SOURCE_PUBLIC_CACHE,
          items: newsItems
        });
        clearLoadError("news");
        renderNewsList();
        return;
      }
    } catch (firestoreErr) {
      console.warn("โหลดข่าวจาก Firestore ไม่สำเร็จ ใช้ Google Sheets fallback - app.news.js", firestoreErr);
    }

    if (cached?.source === NEWS_CACHE_SOURCE_SHEETS && Array.isArray(cached.items) && cached.items.length) {
      newsItems = cached.items;
      clearLoadError("news");
      renderNewsList();
      return;
    }

    if (cached && Array.isArray(cached) && cached.length) {
      newsItems = cached;
      clearLoadError("news");
      renderNewsList();
      return;
    }

    if (!NEWS_SHEET_CSV) {
      newsItems = [];
      clearLoadError("news");
      renderNewsList();
      return;
    }

    await window.sgcuVendorLoader?.ensurePapa?.();
    const csvText = await fetchTextWithProgress(NEWS_SHEET_CSV, (ratio) => {
      if (typeof updateLoaderProgress === "function") {
        updateLoaderProgress("news", ratio);
      }
    });

    const parsed = Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true
    });

    const rows = parsed.data || [];
    newsItems = [];

    if (rows.length < 2) return;

    // ข้าม header แถวแรก
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const dateStr     = (row[1] || "").trim(); // B      
      const year        = (row[2] || "").trim(); // C
      const title       = (row[3] || "").trim(); // D      
      const summary     = (row[4] || "").trim(); // E
      const previewUrl  = (row[5] || "").trim(); // F
      const category    = (row[6] || "").trim(); // G
      const audience    = (row[7] || "").trim(); // H
      const expireDate  = (row[8] || "").trim(); // I      
      const pinnedRaw   = (row[9] || "").trim(); // J

      if (!title) continue;

      newsItems.push({
        id: `NEWS-${i}`,    // key ง่าย ๆ
        title,
        date: dateStr,
        year,
        category,
        audience,
        summary,
        previewUrl,
        expireDate,
        pinned: /true/i.test(pinnedRaw) || pinnedRaw === "1" // TRUE / true / 1
      });
    }

    // เรียง: ปักหมุดขึ้นก่อนเสมอ แล้วเรียงตามวันที่ออก (ล่าสุดก่อน)
    sortNewsItems(newsItems);

    setCache(CACHE_KEYS.NEWS, {
      source: NEWS_CACHE_SOURCE_SHEETS,
      items: newsItems
    });
    clearLoadError("news");
    renderNewsList();
  } catch (err) {
    console.error("โหลดข่าว/ประกาศจากชีตไม่ได้  NEWS  app.js:4229 - app.news.js:109", err);
    recordLoadError("news", "โหลดข่าว/ประกาศไม่สำเร็จ", { showRetry: true });
    newsItems = [];
    setInlineError(newsListEl, "ไม่สามารถโหลดข่าว/ประกาศได้ในขณะนี้", {
      onRetry: () => void loadNewsFromSheet(),
      retryLabel: "ลองโหลดข่าวใหม่"
    });
    setInlineError(document.getElementById("homeNewsPreview"), "ไม่สามารถโหลดข่าว/ประกาศได้ในขณะนี้", {
      onRetry: () => void loadNewsFromSheet(),
      retryLabel: "ลองโหลดข่าวใหม่"
    });
  } finally {
    toggleNewsSkeleton(false);
    if (typeof markLoaderStep === "function") {
      markLoaderStep("news");
    }
  }
}

function renderNewsList() {
  if (!newsListEl) return;

  initNewsFilters();
  syncNewsFilterOptions();
  scheduleNextNewsRefresh();

  const visibleNewsItems = getVisibleNewsItems();

  if (!visibleNewsItems.length) {
    updateNewsFilterSummary(0, 0);
    newsListEl.innerHTML = renderListEmptyState("ยังไม่มีข่าวหรือประกาศ", "เมื่อมีข่าวหรือประกาศใหม่จะแสดงที่นี่", "document");
    renderHomeNewsPreview();
    return;
  }

  const processedItems = getProcessedNewsItems();
  const filteredItems = processedItems;
  updateNewsFilterSummary(filteredItems.length, processedItems.length, visibleNewsItems.length);

  if (!processedItems.length) {
    newsListEl.innerHTML = renderListEmptyState("ไม่พบข่าวที่ตรงกับตัวกรอง", "ลองเปลี่ยนคำค้นหรือกดล้างตัวกรองเพื่อดูรายการทั้งหมด", "search");
    renderHomeNewsPreview();
    return;
  }

  const html = filteredItems
    .map((item) => {
      const dateText = item.date || "-";
      const pinned = item.pinned
        ? `<span class="news-pill news-pill-pinned">PIN</span>`
        : "";
      const category = item.category
        ? `<span class="news-tag">${item.category}</span>`
        : "";
      const audience = item.audience
        ? `<span class="news-tag">${item.audience}</span>`
        : "";

      return `
        <article class="news-card" data-news-id="${item.id}">
          <header class="news-card-header">
            <div class="news-card-title-row">
              ${pinned}
              <div class="news-card-title">${item.title}</div>
            </div>
            <div class="news-card-meta">
              <span>${dateText}</span>
              ${item.year ? `<span>ปีการศึกษา ${item.year}</span>` : ""}
              ${category}
              ${audience}
            </div>
          </header>
          ${
            item.summary
              ? `<p class="news-card-summary">${item.summary}</p>`
              : ""
          }
          <button class="news-card-btn" type="button">ดูรายละเอียด</button>
        </article>
      `;
    })
    .join("");

  newsListEl.innerHTML = html;

  newsListEl.querySelectorAll("[data-news-id]").forEach((card) => {
    const id = card.getAttribute("data-news-id");
    card.addEventListener("click", () => openNewsModal(id));
  });

  renderHomeNewsPreview();
  scheduleRecentNewsAutoPopup();
}

function initNewsFilters() {
  if (newsFilterInitialized) return;

  const searchInput = document.getElementById("newsSearchInput");
  const yearFilter = document.getElementById("newsYearFilter");
  const categoryFilter = document.getElementById("newsCategoryFilter");
  const audienceFilter = document.getElementById("newsAudienceFilter");
  const sortSelect = document.getElementById("newsSortSelect");
  const resetButton = document.getElementById("newsFilterReset");

  if (!searchInput || !yearFilter || !categoryFilter || !audienceFilter || !sortSelect || !resetButton) return;

  searchInput.addEventListener("input", () => {
    newsFilterState.query = searchInput.value.trim();
    renderNewsList();
  });
  yearFilter.addEventListener("change", () => {
    newsFilterState.year = yearFilter.value;
    renderNewsList();
  });
  categoryFilter.addEventListener("change", () => {
    newsFilterState.category = categoryFilter.value;
    renderNewsList();
  });
  audienceFilter.addEventListener("change", () => {
    newsFilterState.audience = audienceFilter.value;
    renderNewsList();
  });
  sortSelect.addEventListener("change", () => {
    newsFilterState.sort = sortSelect.value;
    renderNewsList();
  });
  resetButton.addEventListener("click", () => {
    newsFilterState.query = "";
    newsFilterState.year = "all";
    newsFilterState.category = "all";
    newsFilterState.audience = "all";
    newsFilterState.sort = "latest";
    searchInput.value = "";
    yearFilter.value = "all";
    categoryFilter.value = "all";
    audienceFilter.value = "all";
    sortSelect.value = "latest";
    renderNewsList();
  });
  newsFilterInitialized = true;
}

function syncNewsFilterOptions() {
  syncNewsFilterSelect("newsYearFilter", getUniqueNewsValues("year"), "ทั้งหมด");
  syncNewsFilterSelect("newsCategoryFilter", getUniqueNewsValues("category"), "ทั้งหมด");
  syncNewsFilterSelect("newsAudienceFilter", getUniqueNewsValues("audience"), "ทั้งหมด");

  const searchInput = document.getElementById("newsSearchInput");
  const sortSelect = document.getElementById("newsSortSelect");
  if (searchInput && searchInput.value !== newsFilterState.query) {
    searchInput.value = newsFilterState.query;
  }
  if (sortSelect && sortSelect.value !== newsFilterState.sort) {
    sortSelect.value = newsFilterState.sort;
  }
}

function syncNewsFilterSelect(selectId, values, defaultLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const currentValue = select.value || "all";
  const optionsHtml = [
    `<option value="all">${defaultLabel}</option>`,
    ...values.map((value) => `<option value="${escapeNewsHtml(value)}">${escapeNewsHtml(value)}</option>`)
  ].join("");

  select.innerHTML = optionsHtml;

  const nextValue = values.includes(currentValue) ? currentValue : "all";
  select.value = nextValue;

  if (selectId === "newsYearFilter") newsFilterState.year = nextValue;
  if (selectId === "newsCategoryFilter") newsFilterState.category = nextValue;
  if (selectId === "newsAudienceFilter") newsFilterState.audience = nextValue;
}

function getUniqueNewsValues(field) {
  return Array.from(
    new Set(
      getVisibleNewsItems()
        .map((item) => (item[field] || "").toString().trim())
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a, "th"));
}

function getFilteredNewsItems() {
  const query = newsFilterState.query.toLowerCase();

  return getVisibleNewsItems().filter((item) => {
    if (newsFilterState.year !== "all" && (item.year || "").trim() !== newsFilterState.year) {
      return false;
    }
    if (newsFilterState.category !== "all" && (item.category || "").trim() !== newsFilterState.category) {
      return false;
    }
    if (newsFilterState.audience !== "all" && (item.audience || "").trim() !== newsFilterState.audience) {
      return false;
    }
    if (!query) return true;

    const haystack = [
      item.title,
      item.summary,
      item.category,
      item.audience,
      item.year,
      item.date
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function getProcessedNewsItems() {
  const filteredItems = getFilteredNewsItems();
  return filteredItems.sort((a, b) => compareNewsItems(a, b, newsFilterState.sort));
}

function compareNewsItems(a, b, mode) {
  if (mode === "title") {
    return (a.title || "").localeCompare((b.title || ""), "th");
  }

  const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
  const timeA = parseNewsDate(a.date)?.getTime() || 0;
  const timeB = parseNewsDate(b.date)?.getTime() || 0;

  if (mode === "oldest") {
    if (timeA !== timeB) return timeA - timeB;
    return (a.title || "").localeCompare((b.title || ""), "th");
  }

  if (mode === "pinned" && pinDiff !== 0) {
    return pinDiff;
  }

  if (timeA !== timeB) {
    return timeB - timeA;
  }
  if (mode === "pinned" && pinDiff !== 0) {
    return pinDiff;
  }
  return (a.title || "").localeCompare((b.title || ""), "th");
}

function updateNewsFilterSummary(visibleCount, filteredCount, totalCount) {
  const summaryEl = document.getElementById("newsFilterSummary");
  if (!summaryEl) return;

  if (!totalCount) {
    summaryEl.textContent = "ยังไม่มีข่าวให้แสดง";
    return;
  }

  if (filteredCount === totalCount && visibleCount === filteredCount) {
    summaryEl.textContent = `แสดงข่าวทั้งหมด ${totalCount} รายการ`;
    return;
  }

  if (visibleCount < filteredCount) {
    summaryEl.textContent = `แสดง ${visibleCount} จาก ${filteredCount} รายการ (${totalCount} ทั้งหมด)`;
    return;
  }

  summaryEl.textContent = `แสดง ${filteredCount} จาก ${totalCount} รายการ`;
}

function escapeNewsHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openNewsModal(newsId) {
  if (!newsModalEl || !newsModalTitleEl || !newsModalBodyEl) return;
  const item = newsItems.find((n) => n.id === newsId);
  if (!item || !isNewsCurrentlyVisible(item)) return;

  newsModalTitleEl.textContent = item.title || "รายละเอียดข่าว/ประกาศ";

  const previewUrl = toPreviewUrl(item.previewUrl);
  const previewHtml = previewUrl
    ? `
      <div class="news-preview-frame is-loading" aria-busy="true">
        <div class="news-preview-loading" role="status">กำลังโหลดเอกสาร…</div>
        <iframe title="news-preview" allow="fullscreen"></iframe>
      </div>
    `
    : "";

  const downloadHtml = item.previewUrl
    ? `
      <a class="download-btn" style="margin-top:10px;" target="_blank" href="${toDownloadUrl(item.previewUrl, "download")}">
        ⬇ ดาวน์โหลดไฟล์
      </a>
    `
    : "";

  newsModalBodyEl.innerHTML = `
    ${item.summary ? `<p class="news-card-summary" style="margin-top:12px;">${item.summary}</p>` : ""}
    ${downloadHtml}
    ${previewHtml}
  `;

  const previewFrame = newsModalBodyEl.querySelector('.news-preview-frame');
  const previewIframe = previewFrame?.querySelector('iframe');
  if (previewIframe) {
    previewIframe.addEventListener('load', () => {
      previewFrame.classList.remove('is-loading');
      previewFrame.setAttribute('aria-busy', 'false');
      previewFrame.querySelector('.news-preview-loading')?.remove();
    }, { once: true });
    previewIframe.src = previewUrl;
  }

  openDialog(newsModalEl, { focusSelector: "#newsModalClose" });
}

function getNewsAutoPopupShownIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NEWS_AUTO_POPUP_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((id) => id.toString()) : [];
  } catch (err) {
    return [];
  }
}

function markNewsAutoPopupShown(newsId) {
  if (!newsId) return;
  try {
    const shownIds = getNewsAutoPopupShownIds();
    const nextIds = Array.from(new Set([newsId.toString(), ...shownIds])).slice(0, 30);
    localStorage.setItem(NEWS_AUTO_POPUP_STORAGE_KEY, JSON.stringify(nextIds));
  } catch (err) {
    // localStorage can be unavailable in private browsing; popup still works for the session.
  }
}

function getNewsAutoPopupDate(item) {
  return parseNewsDate(item?.date) || normalizeNewsStoredDate(item?.publishAt);
}

function getRecentNewsAutoPopupItem() {
  const cutoffMs = Date.now() - NEWS_AUTO_POPUP_RECENT_DAYS * 24 * 60 * 60 * 1000;
  const shownIds = getNewsAutoPopupShownIds();

  return getVisibleNewsItems()
    .filter((item) => {
      if (!item?.id || shownIds.includes(item.id.toString())) return false;
      const date = getNewsAutoPopupDate(item);
      return date && date.getTime() >= cutoffMs && date.getTime() <= Date.now();
    })
    .sort((a, b) => compareNewsItems(a, b, "latest"))[0];
}

function scheduleRecentNewsAutoPopup() {
  if (newsAutoPopupScheduled || newsAutoPopupShownThisSession) return;
  const item = getRecentNewsAutoPopupItem();
  if (!item) return;

  newsAutoPopupScheduled = true;
  window.setTimeout(() => {
    newsAutoPopupScheduled = false;
    if (newsAutoPopupShownThisSession) return;
    if (typeof getActiveDialog === "function" && getActiveDialog()) return;

    newsAutoPopupShownThisSession = true;
    markNewsAutoPopupShown(item.id);
    openNewsModal(item.id);
  }, 650);
}

function closeNewsModal() {
  if (!newsModalEl) return;
  closeDialog(newsModalEl);
}

function renderHomeNewsPreview() {
  const container = document.getElementById("homeNewsPreview");
  if (!container) return;
  initHomeNewsPreviewViewportHandler();

  const visibleNewsItems = getVisibleNewsItems();

  if (!visibleNewsItems.length) {
    container.innerHTML = renderListEmptyState("ยังไม่มีข่าวใหม่", "เมื่อมีข่าวหรือประกาศใหม่จะแสดงที่นี่", "document");
    return;
  }

  const topNews = visibleNewsItems.slice(0, getHomeNewsPreviewLimit());
  const cardsHtml = topNews
    .map((item) => {
      const pinnedTag = item.pinned ? `<div class="home-news-tag">PIN</div>` : "";
      const dateText = item.date ? `<div class="home-news-date">${item.date}</div>` : "";
      const summary = item.summary ? `<p>${item.summary}</p>` : "";

      return `
        <article class="home-news-card" data-news-id="${item.id}">
          ${pinnedTag}
          ${dateText}
          <h3>${item.title}</h3>
          ${summary}
          <button class="home-news-link" type="button" data-news-id="${item.id}">
            ดูรายละเอียด →
          </button>
        </article>
      `;
    })
    .join("");

  const seeAllCard = `
    <article class="home-news-card home-news-more" data-goto-page="news">
      <div class="home-news-tag news-info">News</div>
      <h3>ดูข่าวทั้งหมด</h3>
      <p>เปิดหน้ารวมข่าวและประกาศทั้งหมด</p>
      <button class="home-news-link" type="button" data-goto-page="news">
        เปิดหน้า News →
      </button>
    </article>
  `;

  container.innerHTML = cardsHtml + seeAllCard;

  container.querySelectorAll("[data-news-id]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const id = el.getAttribute("data-news-id");
      if (id) openNewsModal(id);
    });
  });

  container.querySelectorAll("[data-goto-page]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const page = el.dataset.gotoPage;
      if (!page) return;
      const targetHash = `#${page}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      } else {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    });
  });
}

// parse วันที่แบบง่าย ๆ (dd/mm/yyyy หรือ yyyy-mm-dd)
function parseNewsDate(text) {
  if (!text) return null;
  const s = text.toString().trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const yr  = parseInt(m[3], 10);
    const d   = new Date(yr, mon, day);
    return isNaN(d.getTime()) ? null : d;
  }

  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const yr  = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const d   = new Date(yr, mon, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const direct = new Date(s);
  return isNaN(direct.getTime()) ? null : direct;
}
