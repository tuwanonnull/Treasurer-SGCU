/* Helpers: parse/format, cache, and background utilities */
function simplifyStatus(statusRaw) {
  const s = (statusRaw || "").toString();
  if (!s) return "แบบร่าง";
  if (s.includes("ไม่อนุมัติ")) return "ไม่อนุมัติ";
  if (s.includes("โครงการรับเงินแล้ว")) return "อนุมัติแล้ว";
  if (s.includes("รอส่งเอกสาร") || s.includes("รอผู้ช่วยตรวจสอบ")) return "รออนุมัติ";
  if (s.includes("ส่งให้ชมรมกลับเพื่อแก้ไข") || s.includes("ชมรมรับเอกสารแก้ไข")) return "แบบร่าง";
  return "แบบร่าง";
}

function escapeHtml(value) {
  const text = (value ?? "").toString();
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

// Shared presentation only: rendering an empty list never fetches data.
function renderListEmptyState(title, description = "", icon = "document") {
  const paths = {
    document: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h3M8 18h6"/>',
    box: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>'
  };
  return `<div class="list-empty-state"><span class="list-empty-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[icon] || paths.document}</svg></span><strong>${escapeHtml(title)}</strong>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div>`;
}

function parseBudget(text) {
  if (!text) return 0;
  const cleaned = text.toString().replace(/,/g, "").replace(/[^\d.-]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function parseProjectDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const num = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(num)) {
    if (num > 1e12) {
      const d = new Date(num);
      return isNaN(d.getTime()) ? null : d;
    }
    if (num > 1e9 && num < 1e12) {
      const d = new Date(num * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (num > 0 && num < 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(num) * 86400000);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const s = value.toString().trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    let yr = parseInt(m[3], 10);
    if (yr < 100) yr += 2000;
    if (yr >= 2400) yr -= 543;
    const d = new Date(yr, mon, day);
    return isNaN(d.getTime()) ? null : d;
  }

  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    let yr = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    if (yr >= 2400) yr -= 543;
    const d = new Date(yr, mon, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const direct = new Date(s);
  return isNaN(direct.getTime()) ? null : direct;
}

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const PROJECT_PENDING_APPROVAL_STATUS = "รอการอนุมัติ";

function isProjectClosed(project) {
  if (isProjectCancelled(project) || isProjectNoClose(project)) return false;
  const close = (project?.statusClose || "").toString().trim();
  const decree = (project?.statusCloseDecree || project?.closeStatusDecree || "").toString().trim();
  return (
    close === "ส่งกิจการนิสิตเรียบร้อย" ||
    decree === "ปิดโครงการเรียบร้อย" ||
    decree === "โครงการรับเงินแล้ว" ||
    decree === "โครงการคืนเงินแล้ว"
  );
}

function isProjectFullyClosed(project) {
  if (isProjectCancelled(project) || isProjectNoClose(project)) return false;
  const decree = (project?.statusCloseDecree || project?.closeStatusDecree || "").toString().trim();
  return decree === "โครงการรับเงินแล้ว" || decree === "โครงการคืนเงินแล้ว";
}

function isProjectStudentClosed(project) {
  return isProjectClosed(project) && !isProjectFullyClosed(project);
}

function isProjectCancelled(project) {
  const main = (project?.statusMain || project?.approvalStatus || "").toString().trim();
  const close = (project?.statusClose || "").toString().trim();
  const closeAdvance = (project?.closeStatusAdvance || "").toString().trim();
  const closeDecree = (project?.statusCloseDecree || project?.closeStatusDecree || "").toString().trim();
  return [main, close, closeAdvance, closeDecree].some((status) => status === "ยกเลิกโครงการ");
}

function isProjectNoClose(project) {
  const close = (project?.statusClose || "").toString().trim();
  return close === "ไม่ปิดโครงการ" || close === "ไม่ส่งปิดโครงการ";
}

function isProjectTerminalWithoutClosure(project) {
  return isProjectCancelled(project) || isProjectNoClose(project);
}

function isProjectApproved(project) {
  const status = (project?.statusMain || project?.approvalStatus || "").toString().trim();
  return status === "อนุมัติโครงการ";
}

function getProjectOverviewStatus(project) {
  if (isProjectNoClose(project)) {
    return (project.statusClose || "").trim();
  }
  return (project.statusMain || "").trim();
}

function getCloseDurationDays(project) {
  const raw = project.closeDurationText ?? project.closeDuration ?? null;
  if (raw === null || raw === undefined) return null;
  const num = parseFloat(raw.toString().replace(/[^\d.-]/g, ""));
  return isNaN(num) ? null : num;
}

// ===== LocalStorage Cache Helpers =====
function canUseLocalStorage() {
  try {
    return typeof localStorage !== "undefined";
  } catch (err) {
    return false;
  }
}

function debounce(fn, delay = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function scheduleIdleTask(task, timeout = 2000) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => task(), { timeout });
  } else {
    setTimeout(task, 0);
  }
}

function runBackgroundTask(task, label) {
  Promise.resolve()
    .then(task)
    .catch((err) => {
      const suffix = label ? ` - ${label}` : "";
      console.error(`Background task failed${suffix}  app.js:546 - app.helpers.js:119`, err);
    });
}

function getCache(key, ttlMs) {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const ts = parsed.ts ? Number(parsed.ts) : 0;
    if (!ts || Date.now() - ts > ttlMs) return null;
    return parsed.data || null;
  } catch (err) {
    console.warn("อ่าน cache ไม่ได้  app.js:561 - app.helpers.js:134", err);
    return null;
  }
}

function getCacheTimestamp(key) {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = parsed && parsed.ts ? Number(parsed.ts) : NaN;
    return Number.isFinite(ts) ? ts : null;
  } catch (err) {
    return null;
  }
}

function setCache(key, data) {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (err) {
    console.warn("เขียน cache ไม่ได้  app.js:571 - app.helpers.js:144", err);
  }
}

function formatLastUpdated(ts) {
  if (!ts) return "ไม่พบข้อมูล";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "ไม่พบข้อมูล";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateProjectsLastUpdatedDisplay(value) {
  if (!projectsLastUpdatedEl && !projectsLastUpdatedStaffEl && !projectsLastUpdatedDashboardStaffEl) return;
  const text = typeof value === "string" ? value : formatLastUpdated(value);
  if (projectsLastUpdatedEl) projectsLastUpdatedEl.textContent = text;
  if (projectsLastUpdatedStaffEl) projectsLastUpdatedStaffEl.textContent = text;
  if (projectsLastUpdatedDashboardStaffEl) projectsLastUpdatedDashboardStaffEl.textContent = text;
}

const loadErrors = new Map();

function updateAppAlert() {
  if (!appAlertEl || !appAlertTextEl) return;
  if (!loadErrors.size) {
    appAlertEl.hidden = true;
    return;
  }
  const messages = [];
  let showRetry = false;
  loadErrors.forEach((entry) => {
    messages.push(entry.message);
    if (entry.showRetry) showRetry = true;
  });
  appAlertTextEl.textContent = messages.join(" • ");
  appAlertEl.hidden = false;
  if (appAlertRetryEl) {
    appAlertRetryEl.style.display = showRetry ? "inline-flex" : "none";
  }
}

function recordLoadError(key, message, options = {}) {
  loadErrors.set(key, {
    message,
    showRetry: Boolean(options.showRetry)
  });
  updateAppAlert();
  if (options.showLoader && appLoaderErrorEl && appLoaderErrorTextEl) {
    appLoaderErrorTextEl.textContent = message;
    appLoaderErrorEl.hidden = false;
  }
}

function clearLoadError(key) {
  if (!loadErrors.has(key)) return;
  loadErrors.delete(key);
  updateAppAlert();
}

function renderLoadState(container, type, message, options = {}) {
  if (!container) return null;
  const stateType = (type || "info").toString().trim() || "info";
  const text = (message || "").toString().trim();
  const panel = document.createElement("div");
  panel.className = options.className || `load-state load-state-${stateType}`;
  panel.setAttribute("role", stateType === "error" ? "alert" : "status");
  panel.setAttribute("aria-live", stateType === "error" ? "assertive" : "polite");

  const caption = document.createElement("div");
  caption.className = options.captionClassName || "load-state-caption";
  caption.textContent = text;
  panel.appendChild(caption);

  if (typeof options.onRetry === "function") {
    const retryBtn = document.createElement("button");
    retryBtn.id = options.retryButtonId || "";
    retryBtn.className = options.retryClassName || "btn-ghost";
    retryBtn.type = "button";
    retryBtn.textContent = options.retryLabel || "ลองใหม่";
    retryBtn.addEventListener("click", options.onRetry);
    panel.appendChild(retryBtn);
  }

  container.replaceChildren(panel);
  return panel;
}

function setInlineError(el, message, options = {}) {
  return renderLoadState(el, "error", message, {
    className: "load-error-text",
    captionClassName: "load-error-caption",
    ...options
  });
}

async function fetchTextWithProgress(url, onProgress, options = {}) {
  const retries = Number.isFinite(options.retries) ? options.retries : 2;
  const baseDelayMs = Number(options.retryDelayMs) || 700;
  const backoff = Number(options.retryBackoff) || 1.8;
  const maxDelayMs = Number(options.retryMaxDelayMs) || 6000;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeoutMs = Number(options.timeoutMs) || 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const cacheMode = options.cache || "default";
      const res = await fetch(url, { signal: controller.signal, cache: cacheMode });
      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status}`);
      }

      const length = Number(res.headers.get("content-length")) || 0;
      if (!res.body || !length) {
        const text = await res.text();
        if (typeof onProgress === "function") {
          onProgress(1);
        }
        return text;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let received = 0;
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        text += decoder.decode(value, { stream: true });
        if (typeof onProgress === "function") {
          onProgress(Math.min(received / length, 1));
        }
      }

      text += decoder.decode();
      if (typeof onProgress === "function") {
        onProgress(1);
      }
      return text;
    } catch (err) {
      if (err && err.name === "AbortError") {
        if (attempt >= retries) {
          throw new Error("timeout");
        }
      } else if (attempt >= retries) {
        throw err;
      }

      const delay = Math.min(baseDelayMs * Math.pow(backoff, attempt), maxDelayMs);
      const jitter = delay * (0.15 + Math.random() * 0.25);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      if (typeof onProgress === "function") {
        onProgress(0);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function classifyOrgSimple(orgName, code) {
  const owner = (orgName || "").toString();
  const c = (code || "").toString();

  if (owner.includes("สภานิสิต") || c.startsWith("SCCU")) return "สภานิสิต";
  if (owner.includes("องค์การบริหารสโมสรนิสิต") || c.startsWith("SGCU")) return "องค์การบริหารสโมสรนิสิต";
  if (owner.includes("ชมรมฝ่ายศิลปะและวัฒนธรรม")) return "ชมรมฝ่ายศิลปะและวัฒนธรรม";
  if (owner.includes("ชมรมฝ่ายวิชาการ")) return "ชมรมฝ่ายวิชาการ";
  if (owner.includes("ชมรมฝ่ายกีฬา")) return "ชมรมฝ่ายกีฬา";
  if (owner.includes("ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์")) return "ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์";
  return "ชมรมอื่น ๆ";
}

function findColIndex(headerRow, candidateSubstringsList) {
  if (!headerRow) return -1;
  for (const substrings of candidateSubstringsList) {
    for (let i = 0; i < headerRow.length; i++) {
      const cell = (headerRow[i] || "").toString();
      if (substrings.every((sub) => cell.includes(sub))) {
        return i;
      }
    }
  }
  return -1;
}

function resolveProjectCode(row, idxCode) {
  const raw = idxCode >= 0 ? row[idxCode] : "";
  const candidate = (raw || "").toString().trim();
  if (candidate && candidate !== "-") return candidate;

  const codePattern = /[A-Z]{2,}-\d{2}\.\d{3}/i;
  for (const cell of row) {
    const text = (cell || "").toString().trim();
    const match = text.match(codePattern);
    if (match) return match[0];
  }
  return candidate;
}

function extractProjectsFromRows(dataRows, headerRow, sourceYear = "") {
  if (!dataRows || dataRows.length === 0) return [];

  const idxCode = findColIndex(headerRow, [
    ["รหัส", "โครงการ"],
    ["รหัสโครงการ"],
    ["Project", "Code"],
    ["Code"]
  ]);
  const idxName = findColIndex(headerRow, [["ชื่อ", "โครงการ"]]);
  const idxStatusForChart = findColIndex(headerRow, [["สถานะ", "ปิด"], ["สถานะ"]]);
  const idxBudget = findColIndex(headerRow, [
    ["งบประมาณ", "ได้รับ", "100"],
    ["งบประมาณ", "อนุมัติ"],
    ["งบประมาณ"],
    ["วงเงิน"]
  ]);

  const COL_ORG_NAME = 4;
  const COL_ORG_BIG = 5;
  const COL_STATUS_MAIN = 7;

  const COL_COUNCIL_TYPE = 8;
  const COL_COUNCIL_SESSION = 9;
  const COL_COUNCIL_MEETINGNO = 10;

  const COL_APPROVE_DATE = 11;
  const COL_LASTWORK_DATE = 12;
  const COL_FUND_SOURCE = 13;
  const COL_BUDGET_100 = 14;

  const COL_TRANSFER_STATUS = 16;
  const COL_TRANSFER_DOCNO = 17;
  const COL_TRANSFER_DIFF_TXT = 20;
  const COL_TRANSFER_DIFF_VAL = 21;
  const COL_TRANSFER_NET = 22;

  const COL_ADV_STATUS = 24;
  const COL_ADV_DOCNO = 25;
  const COL_ADV_DUE = 28;
  const COL_ADV_PERCENT = 29;
  const COL_ADV_AMOUNT = 30;

  const COL_CLOSE_CHECKER = 34;
  const COL_ACTUAL_BUDGET = 35;
  const COL_CLOSE_DUE = 36;

  const COL_DAYS = 48;
  const COL_STATUS_CLOSE = 51;
  const COL_STATUS_CLOSE_DEC = 52;

  const COL_REMAIN_BUDGET = 57;
  const COL_USAGE_PERCENT = 58;
  const COL_CLOSE_DURATION = 59;
  const COL_DECREE_NO = 60;
  const COL_CLOSE_STATUS_ADVANCE = 61;
  const COL_CLOSE_STATUS_DECREE = 62;

  return dataRows
    .filter((row) => {
      const code = resolveProjectCode(row, idxCode);
      const name = (idxName >= 0 ? row[idxName] : "").toString().trim();
      return code !== "" && name !== "";
    })
    .map((row) => {
      const name = (idxName >= 0 ? row[idxName] : "").toString();
      const year = (sourceYear || "").toString().trim() || "2568";
      const code = resolveProjectCode(row, idxCode);

      const orgName = (row[COL_ORG_NAME] || "").toString();
      const orgBig = (row[COL_ORG_BIG] || "").toString();

      const statusMainRaw = (row[COL_STATUS_MAIN] || "").toString();
      const statusCloseRaw = (row[COL_STATUS_CLOSE] || "").toString();
      const statusCloseDec = (row[COL_STATUS_CLOSE_DEC] || "").toString();
      const closeStatusAdvanceRaw = (row[COL_CLOSE_STATUS_ADVANCE] || "").toString();
      const closeStatusDecreeRaw = (row[COL_CLOSE_STATUS_DECREE] || "").toString();

      const daysRaw = row[COL_DAYS];
      let daysToDeadline = null;
      if (daysRaw !== undefined && daysRaw !== null && daysRaw !== "") {
        const d = parseFloat(daysRaw);
        daysToDeadline = isNaN(d) ? null : d;
      }

      const statusForChartRaw = (idxStatusForChart >= 0 ? row[idxStatusForChart] : "").toString();
      const budgetText = (idxBudget >= 0 ? row[idxBudget] : "").toString();
      const orgGroup = orgBig || classifyOrgSimple(orgName, code);

      const councilType = (row[COL_COUNCIL_TYPE] || "").toString().trim();
      const councilSession = (row[COL_COUNCIL_SESSION] || "").toString().trim();
      const councilMeetNo = (row[COL_COUNCIL_MEETINGNO] || "").toString().trim();

      let councilSessionText = "-";
      if (councilType || councilSession || councilMeetNo) {
        councilSessionText =
          `สมัย${councilType || ""}ที่ ` +
          `${councilSession || ""} ครั้งที่ ${councilMeetNo || ""}`;
      }

      const approveDate = (row[COL_APPROVE_DATE] || "").toString();
      const lastWorkDate = (row[COL_LASTWORK_DATE] || "").toString();
      const fundSource = (row[COL_FUND_SOURCE] || "").toString();

      const budget100Text = (row[COL_BUDGET_100] || "").toString();
      const budget100Val = parseBudget(budget100Text);

      const transferStatus = (row[COL_TRANSFER_STATUS] || "").toString();
      const transferDocNo = (row[COL_TRANSFER_DOCNO] || "").toString();
      const transferDiffTxt = (row[COL_TRANSFER_DIFF_TXT] || "").toString().trim();
      const transferDiffValRaw = row[COL_TRANSFER_DIFF_VAL];

      let transferDiffAmount = null;
      if (transferDiffValRaw !== undefined && transferDiffValRaw !== null && transferDiffValRaw !== "") {
        transferDiffAmount = parseBudget(transferDiffValRaw.toString());
        if (isNaN(transferDiffAmount)) transferDiffAmount = null;
      }

      let transferDiffDisplay = "-";
      if (transferDiffTxt || transferDiffAmount !== null) {
        const amtStr = transferDiffAmount !== null ? formatMoney(transferDiffAmount) : "";
        transferDiffDisplay = `${transferDiffTxt} ${amtStr} บาท`.trim();
      }

      const transferNetText = (row[COL_TRANSFER_NET] || "").toString();
      const transferNetVal = parseBudget(transferNetText);

      const advStatus = (row[COL_ADV_STATUS] || "").toString();
      const advDocNo = (row[COL_ADV_DOCNO] || "").toString();
      const advDueDate = (row[COL_ADV_DUE] || "").toString();
      const evidenceDueDate = (row[COL_ADV_DUE] || "").toString();

      let advPercent = null;
      if (row[COL_ADV_PERCENT] !== undefined && row[COL_ADV_PERCENT] !== null && row[COL_ADV_PERCENT] !== "") {
        const p = parseFloat(row[COL_ADV_PERCENT]);
        advPercent = isNaN(p) ? null : p;
      }

      const advAmountText = (row[COL_ADV_AMOUNT] || "").toString();
      const advAmountVal = parseBudget(advAmountText);

      const closeChecker = (row[COL_CLOSE_CHECKER] || "").toString();
      const actualBudgetTxt = (row[COL_ACTUAL_BUDGET] || "").toString();
      const actualBudgetVal = parseBudget(actualBudgetTxt);
      const closeDueDate = (row[COL_CLOSE_DUE] || "").toString();
      const lastWorkDateObj = parseProjectDate(lastWorkDate);
      const closeDueDateObj = parseProjectDate(closeDueDate);

      const remainBudgetTxt = (row[COL_REMAIN_BUDGET] || "").toString();
      const remainBudgetVal = parseBudget(remainBudgetTxt);

      let usagePercent = null;
      if (row[COL_USAGE_PERCENT] !== undefined && row[COL_USAGE_PERCENT] !== null && row[COL_USAGE_PERCENT] !== "") {
        const u = parseFloat(row[COL_USAGE_PERCENT]);
        usagePercent = isNaN(u) ? null : u;
      }

      const closeDurationText = (row[COL_CLOSE_DURATION] || "").toString();
      const decreeNo = (row[COL_DECREE_NO] || "").toString();

      const searchText = [
        code,
        name,
        orgName,
        orgGroup,
        statusMainRaw,
        simplifyStatus(statusForChartRaw)
      ]
        .map((v) => (v || "").toString().toLowerCase())
        .join(" ");

      return {
        code,
        name,
        year,
        orgGroup,
        orgName,
        status: simplifyStatus(statusForChartRaw),
        statusMain: statusMainRaw,            // H
        statusClose: statusCloseRaw,          // AR
        statusCloseDecree: statusCloseDec,    // AS
        daysToDeadline,
        budget: parseBudget(budgetText),
        searchText,
        lastWorkDateObj,
        closeDueDateObj,

        approvalStatus: statusMainRaw,
        councilSessionText,
        councilMeetingNo: councilMeetNo,
        approveDate,
        lastWorkDate,
        fundSource,
        approvedBudget100: budget100Val,

        transferStatus,
        transferDocNo,
        transferDiffAmount,
        transferDiffDisplay,
        transferNet: transferNetVal,

        advanceStatus: advStatus,
        advanceDocNo: advDocNo,
        advanceDueDate: advDueDate,
        advancePercent: advPercent,
        advanceAmount: advAmountVal,
        evidenceDueDate,

        closeChecker,
        closeDueDate,
        actualBudget: actualBudgetVal,
        remainingBudget: remainBudgetVal,
        usagePercent,
        closeDurationText,
        decreeNo,
        closeStatusAdvance: closeStatusAdvanceRaw || statusCloseRaw,
        closeStatusDecree: closeStatusDecreeRaw || statusCloseDec
      };
    });
}
