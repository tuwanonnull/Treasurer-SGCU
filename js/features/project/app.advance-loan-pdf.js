/* ===== PDF Auto-fill ===== */
const PDF_SIGNERS = {
  treasurerName: "นายธุวานนท์ กิ้มเฉี้ยง",
  treasurerPhone: "094-969-6495",
  presidentName: "นางสาวเกวลี เอกโยคยะ",
  viceRectorName: "รองศาสตราจารย์ ดร.สุกัญญา สมไพบูลย์"
};

function getPdfSigners(project) {
  const year = getPdfDocumentYear(project);
  const configured = globalThis.SGCU_APP_CONFIG?.documents?.signersByAcademicYear?.[year] || {};
  return {
    treasurerName: (configured.treasurerName || PDF_SIGNERS.treasurerName).toString().trim(),
    treasurerPhone: (configured.treasurerPhone || PDF_SIGNERS.treasurerPhone).toString().trim(),
    presidentName: (configured.presidentName || PDF_SIGNERS.presidentName).toString().trim(),
    viceRectorName: (configured.viceRectorName || PDF_SIGNERS.viceRectorName).toString().trim(),
    approvalMeetingBody: (configured.approvalMeetingBody || "สภานิสิต").toString().trim()
  };
}

let orgAccountMap = null;

function ensureOrgAccountMap() {
  if (orgAccountMap) return Promise.resolve();
  return Promise.resolve()
    .then(async () => {
      if ((!Array.isArray(orgFilters) || !orgFilters.length) && typeof loadOrgFilters === "function") {
        await loadOrgFilters();
      }
      const map = {};
      const rows = typeof getProjectOrgFiltersForYear === "function"
        ? getProjectOrgFiltersForYear()
        : (Array.isArray(orgFilters) ? orgFilters : []);
      rows.forEach((item) => {
        const name = (item?.name || "").toString().trim();
        const acc = (item?.accountNo || item?.bankAccount || "").toString().trim();
        if (name) map[name] = acc;
      });
      orgAccountMap = map;
    })
    .catch(() => {
      orgAccountMap = {};
    });
}

function formatPdfNumber(value) {
  if (value === null || value === undefined || value === "" || isNaN(value)) return "";
  return formatMoney(value);
}

function splitPdfAmount(value) {
  const amount = parseAmountNumber(value);
  if (amount === null) return { baht: "", satang: "" };
  const [baht, satang] = amount.toFixed(2).split(".");
  return { baht: Number(baht).toLocaleString("en-US"), satang };
}

function formatPercentForPdf(value) {
  if (value === null || value === undefined || value === "" || isNaN(value)) return "";
  return Number(value).toFixed(0);
}

function buildPdfTitle(project) {
  const projectCode = (project?.code || "").toString().trim();
  const base = `${projectCode || "โครงการ"}_เอกสารยืมรองจ่าย`;
  return base.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

function getPdfDocumentYear(project) {
  const candidates = [project?.year, project?.approveDate, project?.lastWorkDate];
  for (const candidate of candidates) {
    const text = (candidate ?? "").toString().trim();
    if (!text) continue;
    const years = text.match(/\d{4}/g);
    if (!years?.length) continue;
    const year = Number(years[years.length - 1]);
    if (!Number.isFinite(year)) continue;
    return String(year < 2400 ? year + 543 : year);
  }
  return String(new Date().getFullYear() + 543);
}

function escapeHtml(text) {
  return text.replace(/[&<>\"]/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      default:
        return ch;
    }
  });
}

function getAdvanceLoanAmounts(project) {
  const isTransferEffective = (project.transferStatus || "").trim() ===
    "กระบวนการโอนงบประมาณมีผลบังคับใช้";
  const budget100 = isTransferEffective
    ? project.transferNet
    : (project.approvedBudget100 != null ? project.approvedBudget100 : project.budget || 0);
  const advancePercent = Number.isFinite(Number(project.advancePercent))
    ? Number(project.advancePercent)
    : 80;
  const configuredAdvanceAmount = parseAmountNumber(project.advanceAmount);
  const advanceAmount = !isTransferEffective && configuredAdvanceAmount != null
    ? configuredAdvanceAmount
    : Math.round(Number(budget100 || 0) * (advancePercent / 100) * 100) / 100;
  return { isTransferEffective, budget100, advancePercent, advanceAmount };
}

function buildPdfData(project, signatureData) {
  const { budget100, advancePercent, advanceAmount } = getAdvanceLoanAmounts(project);
  const budgetParts = splitPdfAmount(budget100);
  const advanceParts = splitPdfAmount(advanceAmount);
  const dateRange = formatThaiDateRange(project.approveDate, project.lastWorkDate);
  const evidenceDueDateText = formatThaiDateNoPrefix(project.evidenceDueDate);
  const signers = getPdfSigners(project);

  const orgAccountNo = (orgAccountMap && project.orgName && orgAccountMap[project.orgName])
    ? orgAccountMap[project.orgName]
    : "407-313892-5";

  const orgAccountName = (project.orgGroup === "องค์การบริหารสโมสรนิสิต")
    ? "องค์การบริหารสโมสรนิสิต"
    : (project.orgName || "");

  let pdfOrgGroup = project.orgGroup || "";
  if (pdfOrgGroup === "องค์การบริหารสโมสรนิสิต, สภานิสิต") {
    pdfOrgGroup = "สโมสรนิสิต";
  }

  return {
    projectName: project.name || "",
    projectCode: project.code || "",
    orgName: project.orgName || "",
    orgGroup: pdfOrgGroup,
    councilSessionText: project.councilSessionText || "",
    approvalMeetingBody: signers.approvalMeetingBody,
    projectDateRange: dateRange,
    approvedBudget100Text: formatPdfNumber(budget100),
    approvedBudget80Text: formatPdfNumber(advanceAmount),
    approvedBudget100Baht: budgetParts.baht,
    approvedBudget100Satang: budgetParts.satang,
    approvedBudget80Baht: advanceParts.baht,
    approvedBudget80Satang: advanceParts.satang,
    approvedBudget100Words: thaiBahtText(budget100),
    approvedBudget80Words: thaiBahtText(advanceAmount),
    evidenceDueDateText,
    advancePercentText: formatPercentForPdf(advancePercent),
    documentYear: getPdfDocumentYear(project),
    transferDocNo: project.transferDocNo || "",
    signerTreasurerName: signers.treasurerName,
    signerTreasurerPhone: signers.treasurerPhone,
    signerPresidentName: signers.presidentName,
    viceRectorName: signers.viceRectorName,
    projectLeadName: signatureData.name,
    projectLeadPhone: signatureData.phone,
    orgAccountNo: orgAccountNo,
    orgAccountName: orgAccountName,
    orgHeadName: signatureData.headName,
    clubTreasurerName: signatureData.clubTreasurer,
    advisorName: signatureData.advisor
  };
}

function fillPdfFields(data, rootEl = pdfRootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll("[data-pdf-field]").forEach((el) => {
    const key = el.getAttribute("data-pdf-field");
    const value = data[key];
    const text = value == null ? "" : value.toString().trim();
    el.textContent = text;
  });
}

function applyThaiSegmentation(rootEl, selector = ".pdf-paragraph, .pdf-sign-name, .pdf-sign-role, .pdf-sign-org, [data-pdf-field]") {
  if (!rootEl || typeof Intl === "undefined" || !Intl.Segmenter) return;

  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  const doc = rootEl.ownerDocument;
  const walker = doc.createTreeWalker(rootEl, 4);
  const textNodes = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest("style, script, .pdf-no-segment")) continue;
    if (!parent.closest(selector)) continue;
    textNodes.push(node);
  }

  textNodes.forEach((node) => {
    const text = node.nodeValue || "";
    if (!text.trim() || !/[\u0E00-\u0E7F]/.test(text)) return;

    const frag = doc.createDocumentFragment();
    const segments = Array.from(segmenter.segment(text));
    segments.forEach((seg, index) => {
      frag.appendChild(doc.createTextNode(seg.segment));
      const next = segments[index + 1];
      const mayBreak =
        seg.isWordLike &&
        next?.isWordLike &&
        !/\s$/.test(seg.segment) &&
        !/^\s/.test(next.segment);
      if (!mayBreak) return;
      const breakEl = doc.createElement("wbr");
      breakEl.className = "pdf-thai-break";
      frag.appendChild(breakEl);
    });
    node.parentNode.replaceChild(frag, node);
  });
}

function setupPdfSignatures(rootEl, project) {
  const isCentral = ["องค์การบริหารสโมสรนิสิต", "สภานิสิต", "องค์การบริหารสโมสรนิสิต, สภานิสิต"].includes(project.orgGroup);
  const centralBlock = rootEl.querySelector("#sig-central");
  const clubBlock = rootEl.querySelector("#sig-club");
  
  if (centralBlock && clubBlock) {
    if (isCentral) {
      centralBlock.style.display = "block";
      clubBlock.style.display = "none";
    } else {
      centralBlock.style.display = "none";
      clubBlock.style.display = "block";
    }
  }

  if (isCentral) {
    rootEl.querySelectorAll('[data-pdf-field="orgName"]').forEach((el) => {
      el.style.display = "none";
    });
  }
}

async function downloadProjectPdf(project, signatureData, printWin = null) {
  if (!pdfRootEl) throw new Error("ไม่พบแบบฟอร์มเอกสาร กรุณารีเฟรชแล้วลองอีกครั้ง");

  // Account data improves the generated document, but a slow Firestore request
  // must never leave the Create PDF button waiting indefinitely.
  await Promise.race([
    ensureOrgAccountMap(),
    new Promise((resolve) => window.setTimeout(resolve, 2500))
  ]);

  if (printWin) {
    if (printWin.closed) throw new Error("หน้าตัวอย่างถูกปิด กรุณาเปิดตัวอย่างอีกครั้ง");
    if (!openPdfPrintWindow(project, printWin, signatureData)) throw new Error("ไม่สามารถเปิดตัวอย่างเอกสารได้");
    return;
  }

  if (!downloadPdfInSameTab(project, signatureData)) {
    throw new Error("PDF print view is unavailable");
  }
}

function mountAdvanceLoanForm(panel, project) {
  const isCentral = ["องค์การบริหารสโมสรนิสิต", "สภานิสิต", "องค์การบริหารสโมสรนิสิต, สภานิสิต"].includes(project.orgGroup);
  const field = (name, label, type = "text") => `<label class="project-document-field">${escapeHtml(label)} *<input class="login-input" name="${name}" type="${type}" maxlength="150" required></label>`;
  panel.innerHTML = `<h3>สร้างเอกสารยืมรองจ่าย</h3>
    <p class="project-document-context">กรอกข้อมูลผู้ลงนามเพื่อตรวจสอบเอกสารก่อนพิมพ์</p>
    <form class="project-document-form">
      <div class="project-document-grid">
        ${field("name", "ชื่อประธานโครงการ")}
        ${field("phone", "เบอร์โทรศัพท์ประธานโครงการ", "tel")}
        ${isCentral ? "" : field("headName", `ชื่อประธาน${project.orgName || "ชมรม"}`) + field("clubTreasurer", `ชื่อเหรัญญิก${project.orgName || "ชมรม"}`) + field("advisor", "ชื่ออาจารย์ที่ปรึกษา")}
      </div>
      <p class="project-document-error" role="alert"></p>
      <div class="modal-actions"><button class="btn-primary" type="submit">ดูตัวอย่าง / พิมพ์ PDF</button></div>
    </form>`;
  const form = panel.querySelector("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = form.querySelector('[role="alert"]');
    const button = form.querySelector('[type="submit"]');
    error.textContent = "";
    if (button.disabled || !form.reportValidity()) return;
    const signatureData = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
    const empty = [...form.querySelectorAll("input[required]")].find(input => !input.value.trim());
    if (empty) { error.textContent = "กรุณากรอกข้อมูลผู้ลงนามให้ครบถ้วน"; empty.focus(); return; }
    let printWin;
    button.disabled = true;
    button.textContent = "กำลังเตรียมเอกสาร…";
    try {
      printWin = window.open("", "_blank");
      if (!printWin) throw new Error("กรุณาอนุญาตหน้าต่างป๊อปอัป แล้วเปิดตัวอย่างอีกครั้ง");
      printWin.document.write('<!doctype html><html lang="th"><meta charset="utf-8"><title>กำลังเตรียมเอกสาร</title><body>กำลังเตรียมเอกสาร…</body></html>');
      printWin.document.close();
      await downloadProjectPdf(project, signatureData, printWin);
    } catch (reason) {
      if (printWin && !printWin.closed) printWin.close();
      error.textContent = reason.message || "ไม่สามารถสร้างเอกสารได้ กรุณาลองใหม่อีกครั้ง";
    } finally {
      button.disabled = false;
      button.textContent = "ดูตัวอย่าง / พิมพ์ PDF";
    }
  });
}

function parsePdfDate(text) {
  if (!text) return null;
  const s = text.toString().trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const yr = parseInt(m[3], 10);
    const d = new Date(yr, mon, day);
    return isNaN(d.getTime()) ? null : d;
  }

  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const yr = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const d = new Date(yr, mon, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const direct = new Date(s);
  return isNaN(direct.getTime()) ? null : direct;
}

function parseAmountNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(value.toString().replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

function readThaiNumberGroup(num) {
  const units = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  const digits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  let result = "";
  const str = num.toString();
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(str.charAt(i), 10);
    const pos = len - i - 1;
    if (digit === 0) continue;

    if (pos === 0 && digit === 1 && len > 1) {
      result += "เอ็ด";
    } else if (pos === 1 && digit === 2) {
      result += "ยี่";
    } else if (pos === 1 && digit === 1) {
      result += "";
    } else {
      result += digits[digit];
    }
    result += units[pos];
  }

  return result;
}

function readThaiNumber(num) {
  if (num === 0) return "ศูนย์";
  if (num >= 1000000) {
    const million = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const head = readThaiNumber(million) + "ล้าน";
    return rest ? head + readThaiNumber(rest) : head;
  }
  return readThaiNumberGroup(num);
}

function thaiBahtText(value) {
  const amount = parseAmountNumber(value);
  if (amount === null) return "";

  let intPart = Math.floor(amount);
  let satang = Math.round((amount - intPart) * 100);

  if (satang === 100) {
    intPart += 1;
    satang = 0;
  }

  const intText = readThaiNumber(intPart);
  if (satang === 0) {
    return `${intText}บาทถ้วน`;
  }

  const satangText = readThaiNumber(satang);
  return `${intText}บาท${satangText}สตางค์`;
}

function formatThaiDate(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";
  const dayMonth = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long"
  }).format(dateObj);
  const year = dateObj.getFullYear() + 543;
  return `วันที่ ${dayMonth} พ.ศ. ${year}`;
}

function formatThaiDateRange(startRaw, endRaw) {
  const startDate = parsePdfDate(startRaw);
  const endDate = parsePdfDate(endRaw);
  const startText = formatThaiDate(startDate);
  const endText = formatThaiDate(endDate);

  if (startText && endText) return `${startText} ถึง ${endText}`;
  return startText || endText || "";
}

function formatThaiDateNoPrefix(raw) {
  const parsed = parsePdfDate(raw);
  if (!parsed || isNaN(parsed.getTime())) return (raw || "").toString().trim();
  const dayMonth = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long"
  }).format(parsed);
  const year = parsed.getFullYear() + 543;
  return `${dayMonth} พ.ศ. ${year}`;
}

async function waitForPdfAssets(doc, rootEl) {
  if (doc.fonts) {
    try {
      await doc.fonts.load('14pt "THSarabunNew"');
      await doc.fonts.load('700 14pt "THSarabunNew"');
      await doc.fonts.ready;
    } catch (_error) {
      // Continue to print with the CSS fallback if the Font Loading API fails.
    }
  }

  const images = Array.from(rootEl.querySelectorAll("img"));
  await Promise.all(images.map((img) => {
    img.loading = "eager";
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }));
}

function openPdfPrintWindow(project, printWin, signatureData) {
  if (!pdfRootEl) return false;

  const data = buildPdfData(project, signatureData);
  const docTitle = escapeHtml(buildPdfTitle(project));
  const tempRoot = pdfRootEl.cloneNode(true);
  tempRoot.id = "pdfRootPrint";
  tempRoot.removeAttribute("aria-hidden");
  tempRoot.style.position = "static";
  tempRoot.style.left = "0";
  tempRoot.style.top = "0";
  tempRoot.style.visibility = "visible";
  tempRoot.style.pointerEvents = "auto";

  fillPdfFields(data, tempRoot);
  applyThaiSegmentation(tempRoot);
  setupPdfSignatures(tempRoot, project);

  const cssHref = "css/style.css";
  const baseHref = new URL(".", window.location.href).href;
  tempRoot.querySelectorAll("img").forEach((img) => {
    img.loading = "eager";
    img.src = new URL(img.getAttribute("src"), baseHref).href;
  });

  let hasPrepared = false;
  let fallbackTimer = 0;
  const preparePreview = async () => {
    if (hasPrepared || printWin.closed) return;
    hasPrepared = true;
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    const previewStage = printWin.document.querySelector(".pdf-preview-stage");
    const previewRoot = printWin.document.getElementById("pdfRootPrint");
    await waitForPdfAssets(printWin.document, previewRoot);
    if (printWin.closed) return;
    const fitPreview = () => {
      if (!previewStage || printWin.matchMedia("print").matches) return;
      const pageWidth = previewRoot.offsetWidth;
      const viewportWidth = printWin.visualViewport?.width
        || printWin.document.documentElement.clientWidth
        || printWin.innerWidth;
      const availableWidth = Math.max(0, viewportWidth - 24);
      const scale = pageWidth > 0 ? Math.min(1, availableWidth / pageWidth) : 1;
      previewRoot.style.transform = `scale(${scale})`;
      previewStage.style.width = `${pageWidth * scale}px`;
      previewStage.style.height = `${previewRoot.scrollHeight * scale}px`;
    };
    fitPreview();
    printWin.addEventListener("resize", fitPreview);
    printWin.focus();
    const printButton = printWin.document.getElementById("advancePrintButton");
    printButton.disabled = false;
    printButton.textContent = "พิมพ์ / บันทึก PDF";
    printButton.onclick = () => printWin.print();
  };

  // Bind before closing the document to avoid missing a synchronous load event.
  printWin.onload = () => {
    void preparePreview();
  };

  printWin.document.open();
  printWin.document.write(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <base href="${baseHref}" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${docTitle}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&amp;display=swap" />
        <link rel="stylesheet" href="${cssHref}" />
        <style>
          body { margin: 0; background: radial-gradient(circle at top right, #fff1f2, #fdf2ff 45%, #fff7f0 100%); font-family: "THSarabunNew", "TH Sarabun New", serif; }
          .pdf-root { position: static !important; left: 0 !important; top: 0 !important; transform-origin: top left; }
          .pdf-preview-stage { margin: 24px auto; overflow: hidden; }
          @media screen {
            .pdf-root > section { min-height: 297mm; margin: 0 0 18px; background: #fff; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.16); box-sizing: border-box; overflow: hidden; }
            .pdf-root > section:last-child { margin-bottom: 0; }
          }
          @media print {
            body { background: #fff; }
            .receipt-toolbar { display: none !important; }
            .pdf-preview-stage { display: contents; width: auto !important; height: auto !important; margin: 0; overflow: visible; }
            .pdf-root { transform: none !important; }
            .pdf-root > section { margin: 0; box-shadow: none; overflow: visible; }
          }
        </style>
      </head>
      <body><nav class="receipt-toolbar" aria-label="เครื่องมือเอกสาร"><div class="receipt-toolbar-inner">
        <div class="receipt-project-info"><div class="receipt-project-meta"><span class="receipt-project-code">${escapeHtml(String(project.code || "โครงการ"))}</span><span>ตัวอย่างเอกสารยืมรองจ่าย</span></div><div class="receipt-project-name">${escapeHtml(String(project.name || ""))}</div></div>
        <div class="receipt-toolbar-actions"><button class="receipt-ui-button receipt-ui-secondary" type="button" onclick="if(window.opener&&!window.opener.closed){window.opener.focus();window.close();}else{window.location.href='${baseHref}';}">← กลับไปแก้ไข</button><button class="receipt-ui-button receipt-ui-primary" type="button" id="advancePrintButton" disabled>กำลังเตรียมเอกสาร…</button></div>
      </div></nav><main class="pdf-preview-stage">${tempRoot.outerHTML}</main></body>
    </html>
  `);
  printWin.document.close();
  fallbackTimer = window.setTimeout(() => {
    void preparePreview();
  }, 250);

  return true;
}

function downloadPdfInSameTab(project, signatureData) {
  if (!pdfRootEl) return false;

  const data = buildPdfData(project, signatureData);
  const pdfFileTitle = buildPdfTitle(project);
  const docTitle = escapeHtml(pdfFileTitle);
  const tempRoot = pdfRootEl.cloneNode(true);
  tempRoot.id = "pdfRootInline";
  tempRoot.removeAttribute("aria-hidden");
  tempRoot.style.position = "static";
  tempRoot.style.left = "0";
  tempRoot.style.top = "0";
  tempRoot.style.visibility = "visible";
  tempRoot.style.pointerEvents = "auto";

  fillPdfFields(data, tempRoot);
  applyThaiSegmentation(tempRoot);
  setupPdfSignatures(tempRoot, project);

  const iframe = document.createElement("iframe");
  iframe.className = "pdf-print-frame";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  const baseHref = new URL(".", window.location.href).href;
  let hasPrinted = false;
  let fallbackTimer = 0;
  const doPrint = async () => {
    if (hasPrinted) return;
    hasPrinted = true;
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    doc.body.appendChild(tempRoot);
    await waitForPdfAssets(doc, tempRoot);
    const originalPageTitle = document.title;
    let hasRestoredTitle = false;
    const restorePageTitle = () => {
      if (hasRestoredTitle) return;
      hasRestoredTitle = true;
      document.title = originalPageTitle;
      window.removeEventListener("afterprint", restorePageTitle);
    };
    document.title = pdfFileTitle;
    window.addEventListener("afterprint", restorePageTitle, { once: true });
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      restorePageTitle();
      iframe.remove();
    }, 1500);
  };

  // Bind before writing the iframe document. Some browsers complete the load
  // synchronously after doc.close(), which previously left the button doing nothing.
  iframe.onload = () => {
    void doPrint();
  };

  doc.open();
  doc.write(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <base href="${baseHref}" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${docTitle}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&amp;display=swap" />
        <link rel="stylesheet" href="css/style.css" />
        <style>
          body { margin: 0; background: #fff; font-family: "THSarabunNew", "TH Sarabun New", serif; }
          .pdf-root { position: static !important; left: 0 !important; top: 0 !important; }
        </style>
      </head>
      <body></body>
    </html>
  `);
  doc.close();
  fallbackTimer = window.setTimeout(() => {
    void doPrint();
  }, 250);

  return true;
}
