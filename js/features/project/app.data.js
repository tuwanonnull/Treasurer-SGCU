/* Data loading (Google Sheets + localStorage cache) */
function isPublishedHtmlSheetUrl(url) {
  return /\/pubhtml(?:$|[/?#])/i.test((url || "").toString());
}

function parsePublishedSheetRows(htmlText) {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(htmlText || "", "text/html");
  const table = doc.querySelector("table.waffle") || doc.querySelector("table");
  if (!table) return [];

  return Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
    Array.from(tr.children)
      .filter((cell) => cell.tagName.toLowerCase() === "td")
      .flatMap((cell) => {
        const span = Math.max(parseInt(cell.getAttribute("colspan") || "1", 10), 1);
        const text = (cell.textContent || "").replace(/\u200b/g, "").trim();
        return Array(span).fill(text);
      })
  );
}

function parsePublishedSheetIndex(htmlText) {
  const source = (htmlText || "").toString();
  const sheets = [];
  const itemRe = /items\.push\(\{name:\s*"((?:\\.|[^"\\])*)",\s*pageUrl:\s*"((?:\\.|[^"\\])*)",\s*gid:\s*"([^"]+)"/g;
  let match;
  while ((match = itemRe.exec(source)) !== null) {
    try {
      sheets.push({
        name: JSON.parse(`"${match[1]}"`),
        pageUrl: JSON.parse(`"${match[2]}"`),
        gid: match[3]
      });
    } catch (_) {
      // Skip malformed sheet metadata and keep parsing the remaining tabs.
    }
  }
  return sheets;
}

function buildPublishedSheetUrl(baseUrl, gid) {
  const cleanBase = (baseUrl || "").toString().split("#")[0].split("?")[0].replace(/\/$/, "");
  return `${cleanBase}/sheet?headers=false&gid=${encodeURIComponent(gid)}`;
}

function normalizePublishedSheetUrl(url) {
  const value = (url || "")
    .toString()
    .replace(/\\u003d/g, "=")
    .replace(/\\x3d/g, "=")
    .replace(/\\\//g, "/");
  return value || "";
}

async function getPublishedHtmlWorkbookSheets(url, onProgress, options = {}) {
  const indexHtml = await fetchTextWithProgress(url, (ratio) => {
    if (typeof onProgress === "function") onProgress(Math.min(ratio * 0.25, 0.25));
  }, options);
  const sheets = parsePublishedSheetIndex(indexHtml);
  const projectSheet =
    sheets.find((sheet) => (sheet.name || "").trim() === "ตารางสถานะ") ||
    sheets[0] ||
    { gid: "1357605440", pageUrl: buildPublishedSheetUrl(url, "1357605440") };
  const contactSheet =
    sheets.find((sheet) => (sheet.name || "").trim().toUpperCase() === "CONTACT") ||
    { gid: "427464098", pageUrl: buildPublishedSheetUrl(url, "427464098") };

  return { projectSheet, contactSheet };
}

async function loadRowsFromPublishedHtmlWorkbook(url, onProgress, options = {}) {
  const { projectSheet, contactSheet } = await getPublishedHtmlWorkbookSheets(url, onProgress, options);
  const projectUrl = normalizePublishedSheetUrl(projectSheet.pageUrl) || buildPublishedSheetUrl(url, projectSheet.gid);
  const contactUrl = normalizePublishedSheetUrl(contactSheet.pageUrl) || buildPublishedSheetUrl(url, contactSheet.gid);

  const projectHtml = await fetchTextWithProgress(projectUrl, (ratio) => {
    if (typeof onProgress === "function") onProgress(0.25 + Math.min(ratio * 0.55, 0.55));
  }, options);
  const contactHtml = await fetchTextWithProgress(contactUrl, (ratio) => {
    if (typeof onProgress === "function") onProgress(0.8 + Math.min(ratio * 0.2, 0.2));
  }, options);

  return {
    projectRows: parsePublishedSheetRows(projectHtml),
    contactRows: parsePublishedSheetRows(contactHtml)
  };
}

function applyProjectContactRows(contactRows) {
  if (!Array.isArray(contactRows) || contactRows.length < 2) return;

  const nextContacts = {};
  contactRows.slice(1).forEach((row) => {
    const position = (row[0] || "").toString().trim(); // ชีท 2 คอลัมน์ A
    const prefix = (row[1] || "").toString().trim();
    const first = (row[2] || "").toString().trim();
    const last = (row[3] || "").toString().trim();
    const nick = (row[4] || "").toString().trim(); // ชีท 2 คอลัมน์ E
    if (!nick) return;

    const contactInfo = {
      key: nick,
      fullName: [prefix, first, last].filter(Boolean).join(" ").trim(),
      nick,
      position,
      phone: (row[10] || "").toString().trim(), // ชีท 2 คอลัมน์ K
      line: (row[9] || "").toString().trim(), // ชีท 2 คอลัมน์ J
      faculty: (row[7] || "").toString().trim(),
      year: (row[6] || "").toString().trim(),
      email: (row[8] || "").toString().trim(),
      avatarUrl: ""
    };

    nextContacts[nick] = contactInfo;
    if (contactInfo.fullName) {
      nextContacts[contactInfo.fullName] = contactInfo;
    }
  });

  if (Object.keys(nextContacts).length) {
    assistantContactsByName = {
      ...assistantContactsByName,
      ...nextContacts
    };
  }
}

async function loadProjectContactsFromCsv(url, options = {}) {
  const contactUrl = (url || "").toString().trim();
  if (!contactUrl) return;
  await window.sgcuVendorLoader?.ensurePapa?.();
  const csvText = await fetchTextWithProgress(contactUrl, null, options);
  const parsed = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: false
  });
  applyProjectContactRows(parsed.data || []);
}

function parseCsvRows(csvText, options = {}) {
  const parsed = Papa.parse(csvText || "", {
    header: false,
    skipEmptyLines: false,
    ...options
  });
  return parsed.data || [];
}

function isTruthySheetValue(value) {
  const normalized = (value || "").toString().trim().toLowerCase();
  return ["true", "yes", "y", "1", "active", "ใช่", "เปิด"].includes(normalized);
}

let projectSourceConfigs = [];
let activeProjectSourceConfig = null;
let projectSourceLoadPromise = null;
let selectedProjectSourceYear = "";

function parseProjectSourceList(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  return rows
    .slice(3)
    .map((row) => ({
      year: (row[0] || "").toString().trim(),
      projectUrl: (row[1] || "").toString().trim(),
      contactUrl: (row[2] || "").toString().trim(),
      isActive: isTruthySheetValue(row[3])
    }))
    .filter((source) => source.year || source.projectUrl)
    .filter((source) => source.projectUrl);
}

function getActiveProjectSourceConfig(sources = projectSourceConfigs) {
  if (!Array.isArray(sources) || !sources.length) return null;
  return sources.find((source) => source.isActive) || sources[sources.length - 1];
}

function parseProjectSourceRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  return getActiveProjectSourceConfig(parseProjectSourceList(rows));
}

function getProjectCacheKey(sourceConfig = activeProjectSourceConfig) {
  const year = (sourceConfig?.year || "").toString().trim();
  if (year) return `${CACHE_KEYS.PROJECTS}:${year}`;
  const url = (sourceConfig?.projectUrl || SHEET_CSV_URL || "").toString().trim();
  return `${CACHE_KEYS.PROJECTS}:${url || "default"}`;
}

function applySourceYearToProjects(list, sourceYear = selectedProjectSourceYear) {
  const year = (sourceYear || "").toString().trim();
  if (!year || !Array.isArray(list)) return list;
  list.forEach((project) => {
    if (project && typeof project === "object") {
      project.year = year;
    }
  });
  return list;
}

function fillProjectYearSelect(selectEl, selectedYear = selectedProjectSourceYear) {
  if (!selectEl) return;
  const sources = Array.isArray(projectSourceConfigs) ? projectSourceConfigs : [];
  const years = sources.map((source) => source.year).filter(Boolean);
  const fallbackYears = years.length
    ? []
    : Array.from(new Set((projects || []).map((project) => project.year).filter(Boolean))).sort();
  const optionYears = years.length ? years : fallbackYears;
  const nextValue =
    selectedYear ||
    activeProjectSourceConfig?.year ||
    optionYears[0] ||
    selectEl.value ||
    "all";

  selectEl.replaceChildren();
  if (!optionYears.length) {
    const opt = document.createElement("option");
    opt.value = "all";
    opt.textContent = "ทุกปีการศึกษา";
    selectEl.appendChild(opt);
    selectEl.value = "all";
    return;
  }

  optionYears.forEach((year) => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    selectEl.appendChild(opt);
  });
  selectEl.value = optionYears.includes(nextValue) ? nextValue : optionYears[0];
}

function syncProjectYearSelects(selectedYear = selectedProjectSourceYear) {
  Object.values(projectStatusContexts || {}).forEach((ctx) => {
    fillProjectYearSelect(ctx?.yearSelect, selectedYear);
    fillProjectYearSelect(ctx?.calendarYearSelectEl, selectedYear);
  });
}

async function loadProjectSourceConfigs(options = {}) {
  const force = Boolean(options.force);
  const fetchOptions = force ? { cache: "no-store" } : {};
  if (projectSourceLoadPromise && !force) return projectSourceLoadPromise;

  projectSourceLoadPromise = (async () => {
    const fallbackSource = {
      year: "",
      projectUrl: SHEET_CSV_URL,
      contactUrl: PROJECT_CONTACTS_CSV_URL,
      isActive: true
    };
    const sourceUrl = (PROJECT_SOURCES_CSV_URL || "").toString().trim();
    if (!sourceUrl) {
      projectSourceConfigs = fallbackSource.projectUrl ? [fallbackSource] : [];
      activeProjectSourceConfig = getActiveProjectSourceConfig(projectSourceConfigs);
      return projectSourceConfigs;
    }

    try {
      await window.sgcuVendorLoader?.ensurePapa?.();
      const csvText = await fetchTextWithProgress(sourceUrl, null, fetchOptions);
      const parsed = Papa.parse(csvText, {
        header: false,
        skipEmptyLines: false
      });
      projectSourceConfigs = parseProjectSourceList(parsed.data || []);
      if (!projectSourceConfigs.length && fallbackSource.projectUrl) {
        projectSourceConfigs = [fallbackSource];
      }
      activeProjectSourceConfig = getActiveProjectSourceConfig(projectSourceConfigs);
      return projectSourceConfigs;
    } catch (err) {
      console.error("โหลด projectSources ไม่สำเร็จ ใช้ config fallback - app.data.js", err);
      projectSourceConfigs = fallbackSource.projectUrl ? [fallbackSource] : [];
      activeProjectSourceConfig = getActiveProjectSourceConfig(projectSourceConfigs);
      return projectSourceConfigs;
    }
  })();

  return projectSourceLoadPromise;
}

async function resolveProjectSourceConfig(year = selectedProjectSourceYear, options = {}) {
  const fallback = {
    year: "",
    projectUrl: SHEET_CSV_URL,
    contactUrl: PROJECT_CONTACTS_CSV_URL,
    isActive: true
  };
  const sources = await loadProjectSourceConfigs(options);
  const normalizedYear = (year || "").toString().trim();
  return (
    (normalizedYear && sources.find((source) => source.year === normalizedYear)) ||
    activeProjectSourceConfig ||
    fallback
  );
}

// Read ProjectStatus's real source without changing its selected year or using demo fallback rows.
async function loadBorrowProjectsFromProjectStatus(academicYear) {
  const year = String(academicYear || "").trim();
  await window.sgcuVendorLoader?.ensurePapa?.();
  let sources;
  if (PROJECT_SOURCES_CSV_URL) {
    const sourceCsv = await fetchTextWithProgress(PROJECT_SOURCES_CSV_URL, null, { cache: "no-store" });
    sources = parseProjectSourceList(parseCsvRows(sourceCsv));
  } else {
    sources = [{ year: "", projectUrl: SHEET_CSV_URL }];
  }
  const source = sources.find(item => item.year === year) || sources.find(item => !item.year);
  if (!source?.projectUrl) return [];
  let rows;
  if (isPublishedHtmlSheetUrl(source.projectUrl)) {
    const { projectSheet } = await getPublishedHtmlWorkbookSheets(source.projectUrl, null, { cache: "no-store" });
    const url = normalizePublishedSheetUrl(projectSheet.pageUrl) || buildPublishedSheetUrl(source.projectUrl, projectSheet.gid);
    rows = parsePublishedSheetRows(await fetchTextWithProgress(url, null, { cache: "no-store" }));
  } else {
    rows = parseCsvRows(await fetchTextWithProgress(source.projectUrl, null, { cache: "no-store" }));
  }
  if (!rows || rows.length < 2) throw new Error("ไม่พบตารางโครงการใน ProjectStatus");
  return extractProjectsFromRows(rows.slice(2), rows[1], source.year || "")
    .filter(project => String(project.year || source.year || "") === year);
}

async function loadProjectsFromSheet(sourceConfigOverride = null, options = {}) {
  try {
    const force = Boolean(options.force);
    const fetchOptions = force ? { cache: "no-store" } : {};
    const sourceConfig = sourceConfigOverride || await resolveProjectSourceConfig(selectedProjectSourceYear, { force });
    activeProjectSourceConfig = sourceConfig || activeProjectSourceConfig;
    selectedProjectSourceYear = (sourceConfig?.year || selectedProjectSourceYear || "").toString().trim();
    syncProjectYearSelects(selectedProjectSourceYear);

    const projectUrl = sourceConfig.projectUrl || SHEET_CSV_URL;
    const contactUrl = sourceConfig.contactUrl || PROJECT_CONTACTS_CSV_URL;
    const isPublishedHtml = isPublishedHtmlSheetUrl(projectUrl);
    const projectCacheKey = getProjectCacheKey(sourceConfig);
    const cached = getCache(projectCacheKey, CACHE_TTL_MS);
    const hasCloseStatusBreakdown =
      Array.isArray(cached) &&
      cached.some((project) =>
        Object.prototype.hasOwnProperty.call(project || {}, "closeStatusAdvance") &&
        Object.prototype.hasOwnProperty.call(project || {}, "closeStatusDecree")
      );
    if (!force && cached && Array.isArray(cached) && cached.length && hasCloseStatusBreakdown) {
      projects = applySourceYearToProjects(cached, selectedProjectSourceYear);
      hydrateProjectsCache(projects);
      clearLoadError("projects");
      setProjectDataLoadState();
      if (isPublishedHtml) {
        try {
          await loadProjectContactsFromPublishedHtml(projectUrl);
        } catch (err) {
          console.error("โหลดข้อมูลติดต่อจากชีตโครงการไม่สำเร็จ - app.data.js", err);
        }
      } else if (contactUrl) {
        try {
          await loadProjectContactsFromCsv(contactUrl);
        } catch (err) {
          console.error("โหลดข้อมูลติดต่อจากชีต 2 ไม่สำเร็จ - app.data.js", err);
        }
      }
      console.log("[SGCU] ใช้ cache โครงการ (localStorage) - app.js:891");
      const cacheTs = getCacheTimestamp(projectCacheKey);
      updateProjectsLastUpdatedDisplay(cacheTs || Date.now());
      return;
    }

    console.log("[SGCU] โหลดข้อมูลโครงการจาก Google Sheets ... - app.js:895");
    let rows = [];
    if (isPublishedHtml) {
      const workbookRows = await loadRowsFromPublishedHtmlWorkbook(projectUrl, (ratio) => {
        if (typeof updateLoaderProgress === "function") {
          updateLoaderProgress("projects", ratio);
        }
      }, fetchOptions);
      rows = workbookRows.projectRows;
      applyProjectContactRows(workbookRows.contactRows);
    } else {
      await window.sgcuVendorLoader?.ensurePapa?.();
      const projectCsvPromise = fetchTextWithProgress(projectUrl, (ratio) => {
        if (typeof updateLoaderProgress === "function") {
          updateLoaderProgress("projects", ratio);
        }
      }, fetchOptions);
      const contactCsvPromise = contactUrl
        ? fetchTextWithProgress(contactUrl, null, fetchOptions).catch((err) => {
            console.error("โหลดข้อมูลติดต่อจากชีท 2 ไม่สำเร็จ - app.data.js", err);
            return "";
          })
        : Promise.resolve("");

      const [csvText, contactCsvText] = await Promise.all([projectCsvPromise, contactCsvPromise]);

      rows = parseCsvRows(csvText);
      if (contactCsvText) {
        applyProjectContactRows(parseCsvRows(contactCsvText));
      }
    }

    if (!rows || rows.length < 2) {
      projects = getFallbackProjects();
    } else {
      const headerRow = rows[1] || [];
      const dataRows = rows.slice(2);
      projects = applySourceYearToProjects(
        extractProjectsFromRows(dataRows, headerRow, selectedProjectSourceYear),
        selectedProjectSourceYear
      );
    }
    setCache(projectCacheKey, projects);
    clearLoadError("projects");
    setProjectDataLoadState();
    updateProjectsLastUpdatedDisplay(Date.now());
  } catch (err) {
    console.error("โหลดข้อมูลจากชีตไม่ได้ ใช้ข้อมูลจำลองแทน - app.js:917", err);
    recordLoadError(
      "projects",
      "โหลดข้อมูลโครงการไม่สำเร็จ กำลังใช้ข้อมูลสำรอง",
      { showRetry: true, showLoader: true }
    );
    updateProjectsLastUpdatedDisplay("ไม่สามารถอัปเดตได้");
    projects = getFallbackProjects();
    setProjectDataLoadState(
      "error",
      "ไม่สามารถโหลดข้อมูลโครงการจาก Google Sheets ได้ ขณะนี้กำลังแสดงข้อมูลสำรองเพื่อให้หน้าเว็บยังใช้งานได้",
      { onRetry: () => void retryProjectDataLoad() }
    );
  } finally {
    if (typeof markLoaderStep === "function") {
      markLoaderStep("projects");
    }
  }
}

function refreshProjectCalendarForContext(ctxKey) {
  const ctx = projectStatusContexts[ctxKey];
  if (!ctx || !ctx.isInitialized) return;
  setActiveProjectStatusContext(ctxKey);
  buildCalendarEventsFromProjects();
  initCalendarFilters();
  generateCalendar();
}

function refreshProjectFiltersForContext(ctxKey, selectedYear = selectedProjectSourceYear) {
  const ctx = projectStatusContexts[ctxKey];
  if (!ctx) return;
  setActiveProjectStatusContext(ctxKey);
  fillProjectYearSelect(yearSelect, selectedYear);
  fillProjectYearSelect(calendarYearSelectEl, selectedYear);
  if (orgTypeSelect) orgTypeSelect.value = "all";
  initOrgTypeOptions();
  initOrgOptions();
  if (orgSelect) orgSelect.value = "all";
  lastProjectStatusRefreshSignatureByContext[ctxKey] = "";
  lastProjectStatusProjectsRefByContext[ctxKey] = null;
}

async function switchProjectSourceYear(year) {
  const selectedYear = (year || "").toString().trim();
  if (!selectedYear || selectedYear === selectedProjectSourceYear) {
    syncProjectYearSelects(selectedProjectSourceYear);
    if (typeof refreshScoreboardForProjectYear === "function") {
      await refreshScoreboardForProjectYear();
    }
    return;
  }

  const sourceConfig = await resolveProjectSourceConfig(selectedYear);
  if (!sourceConfig?.projectUrl) {
    throw new Error(`ไม่พบลิงก์ CSV ของปี ${selectedYear}`);
  }

  setLoading(true, "public");
  setLoading(true, "staff");
  setProjectDataLoadState("info", `กำลังโหลดข้อมูลปีการศึกษา ${selectedYear}...`);
  try {
    await loadProjectsFromSheet(sourceConfig);
    if (!projects || projects.length === 0) {
      projects = getFallbackProjects();
    }
    selectedProjectSourceYear = sourceConfig.year || selectedYear;
    syncProjectYearSelects(selectedProjectSourceYear);

    ["public", "staff"].forEach((ctxKey) => {
      refreshProjectFiltersForContext(ctxKey, selectedProjectSourceYear);
      refreshProjectStatus(ctxKey);
      refreshProjectCalendarForContext(ctxKey);
    });
    renderHomeKpis();
    if (typeof refreshScoreboardForProjectYear === "function") {
      await refreshScoreboardForProjectYear();
    }
  } catch (err) {
    console.error("เปลี่ยนปี Project Status ไม่สำเร็จ - app.data.js", err);
    recordLoadError("projects", `โหลดข้อมูลปีการศึกษา ${selectedYear} ไม่สำเร็จ`, { showRetry: true });
    setProjectDataLoadState(
      "error",
      `ยังไม่สามารถโหลดข้อมูลปีการศึกษา ${selectedYear} ได้`,
      { onRetry: () => void switchProjectSourceYear(selectedYear) }
    );
    syncProjectYearSelects(selectedProjectSourceYear);
  } finally {
    setLoading(false, "public");
    setLoading(false, "staff");
  }
}

async function retryProjectDataLoad() {
  clearLoadError("projects");
  clearLoadError("orgFilters");
  setProjectDataLoadState("info", "กำลังโหลดข้อมูลโครงการใหม่...");
  projectsLoaded = false;
  projectsLoadPromise = null;
  projectSourceLoadPromise = null;
  Object.values(projectStatusContexts || {}).forEach((ctx) => {
    if (ctx) {
      ctx.isInitialized = false;
      ctx.chartsInitialized = false;
    }
  });
  lastProjectStatusRefreshSignatureByContext.public = "";
  lastProjectStatusRefreshSignatureByContext.staff = "";
  lastProjectStatusProjectsRefByContext.public = null;
  lastProjectStatusProjectsRefByContext.staff = null;

  try {
    await ensureProjectDataLoaded();
    await ensureProjectStatusChartsReady("public");
    await ensureProjectStatusChartsReady("staff");
    refreshProjectStatus("public");
    refreshProjectStatus("staff");
  } catch (err) {
    console.error("ลองโหลดข้อมูลโครงการใหม่ไม่สำเร็จ - app.data.js", err);
    recordLoadError("projects", "โหลดข้อมูลโครงการไม่สำเร็จ กำลังใช้ข้อมูลสำรอง", { showRetry: true });
    setProjectDataLoadState(
      "error",
      "ยังไม่สามารถโหลดข้อมูลโครงการได้ กรุณาลองใหม่อีกครั้งภายหลัง",
      { onRetry: () => void retryProjectDataLoad() }
    );
  }
}

async function forceRefreshProjectData(ctxKey = activeProjectStatusContext) {
  clearLoadError("projects");
  clearLoadError("orgFilters");
  setProjectDataLoadState("info", "กำลังดึงข้อมูลล่าสุดจาก Google Sheets...");
  projectsLoaded = false;
  projectsLoadPromise = null;
  projectSourceLoadPromise = null;
  Object.values(projectStatusContexts || {}).forEach((ctx) => {
    if (ctx) {
      ctx.isInitialized = false;
      ctx.chartsInitialized = false;
    }
    if (ctx?.projectRefreshDataBtn) ctx.projectRefreshDataBtn.disabled = true;
  });
  lastProjectStatusRefreshSignatureByContext.public = "";
  lastProjectStatusRefreshSignatureByContext.staff = "";
  lastProjectStatusProjectsRefByContext.public = null;
  lastProjectStatusProjectsRefByContext.staff = null;
  setLoading(true, "public");
  setLoading(true, "staff");

  try {
    await loadProjectsFromSheet(null, { force: true });
    if (loadErrors?.has?.("projects")) {
      throw new Error("project data refresh failed");
    }
    if (!projects || projects.length === 0) {
      projects = getFallbackProjects();
    }
    await loadOrgFilters();
    await window.sgcuVendorLoader?.ensureChart?.();

    for (const key of ["public", "staff"]) {
      await ensureProjectStatusChartsReady(key);
      refreshProjectFiltersForContext(key, selectedProjectSourceYear);
      refreshProjectStatus(key);
      refreshProjectCalendarForContext(key);
    }
    renderHomeKpis();
    projectsLoaded = true;
    setProjectDataLoadState();
  } catch (err) {
    console.error("บังคับดึงข้อมูลโครงการใหม่ไม่สำเร็จ - app.data.js", err);
    recordLoadError("projects", "ดึงข้อมูลล่าสุดไม่สำเร็จ กำลังใช้ข้อมูลเดิมหรือข้อมูลสำรอง", { showRetry: true });
    setProjectDataLoadState(
      "error",
      "ยังไม่สามารถดึงข้อมูลล่าสุดได้ กรุณาลองใหม่อีกครั้ง",
      { onRetry: () => void forceRefreshProjectData(ctxKey) }
    );
  } finally {
    setLoading(false, "public");
    setLoading(false, "staff");
    Object.values(projectStatusContexts || {}).forEach((ctx) => {
      if (ctx?.projectRefreshDataBtn) ctx.projectRefreshDataBtn.disabled = false;
    });
  }
}

async function loadProjectContactsFromPublishedHtml(url) {
  const { contactSheet } = await getPublishedHtmlWorkbookSheets(url);
  const contactUrl = normalizePublishedSheetUrl(contactSheet.pageUrl) || buildPublishedSheetUrl(url, contactSheet.gid);
  const contactHtml = await fetchTextWithProgress(contactUrl);
  const rows = parsePublishedSheetRows(contactHtml);
  applyProjectContactRows(rows);
}

function hydrateProjectsCache(list) {
  if (!Array.isArray(list)) return;
  list.forEach((p) => {
    if (!p || typeof p !== "object") return;
    let lastDate = p.lastWorkDateObj;
    if (!(lastDate instanceof Date) || isNaN(lastDate.getTime())) {
      lastDate = parseProjectDate(lastDate || p.lastWorkDate);
      p.lastWorkDateObj = lastDate;
    }

    let closeDate = p.closeDueDateObj;
    if (!(closeDate instanceof Date) || isNaN(closeDate.getTime())) {
      closeDate = parseProjectDate(closeDate || p.closeDueDate);
      p.closeDueDateObj = closeDate;
    }

    if (!p.searchText) {
      p.searchText = [
        p.code,
        p.name,
        p.orgName,
        p.orgGroup,
        p.statusMain,
        p.status
      ]
        .map((v) => (v || "").toString().toLowerCase())
        .join(" ");
    }
  });
}

function normalizeOrganizationCatalogDoc(docSnap) {
  const data = docSnap?.data ? docSnap.data() : {};
  const row = Array.isArray(data.row) ? data.row : [];
  const group = (data.group || data.orgGroup || data.type || row[0] || "").toString().trim();
  const name = (data.name || data.orgName || data.organizationName || row[1] || "").toString().trim();
  const code = (data.code || data.orgCode || row[2] || "").toString().trim().toUpperCase();
  const documentRunCode = (data.documentRunCode || data.runCode || row[3] || "").toString().trim();
  const normalizeAcademicYearText = (value) => {
    const text = (value || "").toString().trim();
    const num = Number(text);
    if (!Number.isInteger(num) || num <= 0) return "";
    return num < 100 ? String(2500 + num) : String(num);
  };
  const academicYear = normalizeAcademicYearText(data.academicYear || data.year || data.catalogAcademicYear);
  const normalizeYearTextMap = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce((acc, [year, text]) => {
      const normalizedYear = (year || "").toString().trim();
      const normalizedText = (text || "").toString().trim();
      if (/^\d{4}$/.test(normalizedYear) && normalizedText) {
        acc[normalizedYear] = normalizedText;
      }
      return acc;
    }, {});
  };
  const nameByAcademicYear = {
    ...normalizeYearTextMap(data.orgNameByAcademicYear),
    ...normalizeYearTextMap(data.organizationNameByAcademicYear),
    ...normalizeYearTextMap(data.nameByAcademicYear)
  };
  if (academicYear && name) {
    nameByAcademicYear[academicYear] = name;
  }
  if (name && !Object.keys(nameByAcademicYear).length) {
    nameByAcademicYear["2568"] = name;
  }
  const normalizeRunMap = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce((acc, [year, runCode]) => {
      const normalizedYear = (year || "").toString().trim();
      const normalizedRunCode = (runCode || "").toString().trim();
      if (/^\d{4}$/.test(normalizedYear) && normalizedRunCode) {
        acc[normalizedYear] = normalizedRunCode;
      }
      return acc;
    }, {});
  };
  const documentRunCodeByAcademicYear = {
    ...normalizeRunMap(data.runCodeByAcademicYear),
    ...normalizeRunMap(data.documentRunCodeByAcademicYear)
  };
  if (academicYear && documentRunCode) {
    documentRunCodeByAcademicYear[academicYear] = documentRunCode;
  }
  if (documentRunCode && !Object.keys(documentRunCodeByAcademicYear).length) {
    documentRunCodeByAcademicYear["2568"] = documentRunCode;
  }
  const normalizeCodeMap = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce((acc, [year, orgCode]) => {
      const normalizedYear = (year || "").toString().trim();
      const normalizedCode = (orgCode || "").toString().trim().toUpperCase();
      if (/^\d{4}$/.test(normalizedYear) && normalizedCode) {
        acc[normalizedYear] = normalizedCode;
      }
      return acc;
    }, {});
  };
  const isManualDocumentRunGroup = group === "องค์การบริหารสโมสรนิสิต";
  const codeByAcademicYear = {
    ...normalizeCodeMap(data.orgCodeByAcademicYear),
    ...normalizeCodeMap(data.codeByAcademicYear)
  };
  if (academicYear && code) {
    codeByAcademicYear[academicYear] = code;
  }
  if (isManualDocumentRunGroup) {
    Object.entries(documentRunCodeByAcademicYear).forEach(([year, runCode]) => {
      const normalizedRunCode = (runCode || "").toString().trim();
      if (normalizedRunCode) codeByAcademicYear[year] = `SGCU-${normalizedRunCode}`.toUpperCase();
    });
  }
  if (code && !Object.keys(codeByAcademicYear).length) {
    codeByAcademicYear["2568"] = code;
  }
  const accountNo = (data.accountNo || data.bankAccount || data.bankAccountNo || row[4] || "").toString().trim();
  if (!group || !name) return null;
  return {
    id: docSnap.id,
    academicYear,
    baseOrganizationId: (data.baseOrganizationId || data.baseOrgId || data.rootOrganizationId || "").toString().trim(),
    group,
    name,
    nameByAcademicYear,
    code,
    codeByAcademicYear,
    documentRunCode,
    documentRunCodeByAcademicYear,
    accountNo,
    sortOrder: Number(data.sortOrder ?? data.order ?? 0)
  };
}

async function loadOrgFiltersFromFirestore() {
  const store = window.sgcuFirestore || {};
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const collectionName = appConfig.firestore?.collections?.organizationCatalog || "organizationCatalog";
  if (!store.db || !store.collection || !store.getDocs) return null;

  const collectionRef = store.collection(store.db, collectionName);
  const listQuery =
    store.query && store.where
      ? store.query(collectionRef, store.where("status", "==", "active"))
      : collectionRef;
  const snapshot = await store.getDocs(listQuery);
  const items = [];
  snapshot.forEach((docSnap) => {
    const item = normalizeOrganizationCatalogDoc(docSnap);
    if (item) items.push(item);
  });
  if (!items.length) return null;
  items.sort((a, b) =>
    a.sortOrder - b.sortOrder ||
    (a.code || "").localeCompare(b.code || "", "th", { numeric: true }) ||
    a.group.localeCompare(b.group, "th") ||
    a.name.localeCompare(b.name, "th")
  );
  return items.map(({ sortOrder, ...item }) => item);
}

async function loadOrgFiltersFromPublicCache() {
  const store = window.sgcuFirestore || {};
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const collectionName = appConfig.firestore?.collections?.publicCache || "publicCache";
  if (!store.db || !store.doc || !store.getDoc) return null;

  const snap = await store.getDoc(store.doc(store.db, collectionName, "organizationCatalog"));
  const data = snap?.exists?.() ? snap.data() || {} : {};
  if (!Array.isArray(data.items) || !data.items.length) return null;

  const items = data.items
    .map((item, index) => normalizeOrganizationCatalogDoc({
      id: item.id || `cache-org-${index + 1}`,
      data: () => item
    }))
    .filter(Boolean);
  if (!items.length) return null;
  items.sort((a, b) =>
    a.sortOrder - b.sortOrder ||
    (a.code || "").localeCompare(b.code || "", "th", { numeric: true }) ||
    a.group.localeCompare(b.group, "th") ||
    a.name.localeCompare(b.name, "th")
  );
  return items.map(({ sortOrder, ...item }) => item);
}

// โหลดตัวเลือก filter จาก Firestore collection `organizationCatalog` เท่านั้น
async function loadOrgFilters() {
  try {
    const firestoreItems = (await loadOrgFiltersFromPublicCache()) || (await loadOrgFiltersFromFirestore());
    if (firestoreItems && firestoreItems.length) {
      orgFilters = firestoreItems;
      setCache(CACHE_KEYS.ORG_FILTERS, orgFilters);
      clearLoadError("orgFilters");
      return;
    }

    orgFilters = [];
    recordLoadError(
      "orgFilters",
      "ยังไม่มีทะเบียนองค์กรใน Firebase",
      { showRetry: true }
    );
  } catch (err) {
    console.error("โหลดทะเบียนองค์กรจาก Firestore ไม่สำเร็จ - app.data.js", err);
    recordLoadError(
      "orgFilters",
      "โหลดทะเบียนองค์กรจาก Firebase ไม่สำเร็จ",
      { showRetry: true }
    );
    orgFilters = [];
  } finally {
    if (typeof markLoaderStep === "function") {
      markLoaderStep("orgFilters");
    }
  }
}

function shouldLoadProjectDataForPage(page) {
  return ["project-status", "dashboard-staff"].includes(page);
}

async function ensureProjectDataLoaded() {
  if (projectsLoaded) return;
  if (projectsLoadPromise) return projectsLoadPromise;

  projectsLoadPromise = (async () => {
    setLoading(true, "public");
    setLoading(true, "staff");
    try {
      await loadProjectsFromSheet();              // ดึงข้อมูลจาก SHEET_CSV_URL
      if (!projects || projects.length === 0) {   // กันกรณีโหลดไม่ได้/ข้อมูลว่าง
        projects = getFallbackProjects();
      }

      await loadOrgFilters();                     // โหลดตัวเลือก filter ประเภท/ฝ่าย
      await window.sgcuVendorLoader?.ensureChart?.();
      renderHomeKpis();                           // KPI สำหรับ dashboard (staff)
    } catch (err) {
      console.error("โหลดข้อมูลหน้า Project Status ไม่สำเร็จ  ใช้ข้อมูลสำรองแทน - app.js:999", err);
      projects = getFallbackProjects();
      await loadOrgFilters();
      await window.sgcuVendorLoader?.ensureChart?.();
      renderHomeKpis();
    } finally {
      setLoading(false, "public");
      setLoading(false, "staff");
      projectsLoaded = true;
    }
  })();

  return projectsLoadPromise;
}

function ensureProjectStatusInitialized(ctxKey = activeProjectStatusContext) {
  const ctx = projectStatusContexts[ctxKey];
  if (!ctx) return;

  setActiveProjectStatusContext(ctxKey);
  if (!ctx.isInitialized) {
    initOrgTypeOptions();                       // เติม options ประเภทองค์กร
    initOrgOptions();                           // เติมรายชื่อองค์กร
    initCalendar(ctxKey);                       // สร้างปฏิทินจาก projects (ใช้วันที่คอลัมน์ M แล้ว)
    ctx.isInitialized = true;
  }
  if (typeof Chart !== "undefined" && !ctx.chartsInitialized) {
    initCharts(ctxKey);                       // สร้างกราฟ Chart.js
    ctx.chartsInitialized = true;
  }
}

async function ensureProjectStatusChartShell(ctxKey = activeProjectStatusContext) {
  await window.sgcuVendorLoader?.ensureChart?.();
  const ctx = projectStatusContexts[ctxKey];
  if (!ctx || ctx.chartsInitialized) return;

  setActiveProjectStatusContext(ctxKey);
  initCharts(ctxKey);
  ctx.chartsInitialized = true;
}

async function ensureProjectStatusChartsReady(ctxKey = activeProjectStatusContext) {
  await window.sgcuVendorLoader?.ensureChart?.();
  const ctx = projectStatusContexts[ctxKey];
  if (ctx) ctx.chartsInitialized = false;
  ensureProjectStatusInitialized(ctxKey);
}

function getFallbackProjects() {
  const fallback = [
    {
      code: "SGCU-01.005",
      name: "โครงการองค์การบริหารสโมสรนิสิตสัญจร ปีการศึกษา 2568",
      year: "2568",
      orgGroup: "องค์การบริหารสโมสรนิสิต",
      orgName: "องค์การบริหารสโมสรนิสิตจุฬาฯ",
      status: "รออนุมัติ",
      statusMain: "เสนอที่ประชุมนายก",
      statusClose: "",
      statusCloseDecree: "",
      daysToDeadline: 20,
      budget: 1649.65,
      approvedBudget100: 1649.65,
      actualBudget: 0,
      lastWorkDate: "2024-11-20",
      closeDueDate: "2024-12-01",
      closeDurationText: "8"
    },
    {
      code: "SGCU-05.001",
      name: "โครงการสานสัมพันธ์นิสิต ปีการศึกษา 2568",
      year: "2568",
      orgGroup: "องค์การบริหารสโมสรนิสิต",
      orgName: "ฝ่ายนิสิตสัมพันธ์",
      status: "อนุมัติแล้ว",
      statusMain: "อนุมัติโครงการ",
      statusClose: "",
      statusCloseDecree: "",
      daysToDeadline: 5,
      budget: 114493,
      approvedBudget100: 114493,
      actualBudget: 40320,
      lastWorkDate: "2024-09-30",
      closeDueDate: "2024-10-05",
      closeDurationText: "16"
    },
    {
      code: "PHT-09.001",
      name: "โครงการตัวอย่าง PHT ปีการศึกษา 2568",
      year: "2568",
      orgGroup: "ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์",
      orgName: "ชมรมไอเซค (AIESEC)",
      status: "อนุมัติแล้ว",
      statusMain: "อนุมัติโครงการ",
      statusClose: "ส่งกิจการนิสิตเรียบร้อย",
      statusCloseDecree: "ปิดโครงการเรียบร้อย",
      daysToDeadline: -3,
      budget: 95398.6,
      approvedBudget100: 95398.6,
      actualBudget: 90210,
      lastWorkDate: "2024-08-18",
      closeDueDate: "2024-08-25",
      closeDurationText: "10"
    }
  ];

  fallback.forEach((p) => {
    p.lastWorkDateObj = parseProjectDate(p.lastWorkDate);
    p.closeDueDateObj = parseProjectDate(p.closeDueDate);
    p.searchText = [
      p.code,
      p.name,
      p.orgName,
      p.orgGroup,
      p.statusMain,
      p.status
    ]
      .map((v) => (v || "").toString().toLowerCase())
      .join(" ");
  });

  return fallback;
}
