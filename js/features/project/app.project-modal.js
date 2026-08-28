/* Modal: รายละเอียดโครงการ + PDF autofill */
function openProjectModal(project) {
  if (!projectModalEl) return;

  const code = project.code || "-";
  const name = project.name || "-";
  const yearStr = project.year ? `ปีการศึกษา ${project.year}` : "-";
  const orgName = project.orgName || "-";
  const orgGroup = project.orgGroup || "-";
  const approveStatus = project.approvalStatus || project.statusMain || PROJECT_PENDING_APPROVAL_STATUS;
  const canDownloadPdf = shouldShowPdfDownload(project);

  // title + badge ด้านบน
  projectModalTitleEl.textContent = name;
  projectModalTitleBadgeEl.textContent = "";
  projectModalHeaderRowEl.innerHTML = "";

  // เตรียมข้อมูลที่ใช้ต่อ
  const councilSessionText = project.councilSessionText || "-";
  const approveDate = project.approveDate || "-";
  const lastWorkDate = project.lastWorkDate || "-";
  const fundSource = project.fundSource || "-";
  const approvedBudget100 =
    project.approvedBudget100 != null ? project.approvedBudget100 : project.budget || 0;
  const approvedBudget100Text = `${formatMoney(approvedBudget100)} บาท`;

  const transferStatus = project.transferStatus || "-";
  const transferDocNo = project.transferDocNo || "-";
  const transferDiffDisplay = project.transferDiffDisplay || "-";
  const transferNetText =
    project.transferNet != null ? `${formatMoney(project.transferNet)} บาท` : "-";

  const advanceStatus = project.advanceStatus || "-";
  const advanceDocNo = project.advanceDocNo || "-";
  const advanceDue = project.advanceDueDate || "-";
  const advancePercentText =
    project.advancePercent != null
      ? project.advancePercent.toFixed(0) + "%"
      : "-";
  const advanceAmountText =
    project.advanceAmount != null ? `${formatMoney(project.advanceAmount)} บาท` : "-";

  const closeChecker = (project.closeChecker || "").trim();
  const closeDueDate = project.closeDueDate || "-";
  const actualBudgetText =
    project.actualBudget != null ? `${formatMoney(project.actualBudget)} บาท` : "-";
  const remainingBudgetText =
    project.remainingBudget != null ? `${formatMoney(project.remainingBudget)} บาท` : "-";
  const usagePercentText =
    project.usagePercent != null
      ? project.usagePercent.toFixed(2) + "%"
      : "-";
  const closeDurationText =
    project.closeDurationText || formatDaysToDeadline(project.daysToDeadline);
  const decreeNo = project.decreeNo || "-";
  const closeStatusAdvance = project.closeStatusAdvance || "-";
  const closeStatusDecree = project.closeStatusDecree || project.statusCloseDecree || "-";

  // ผู้สอบตรวจเอกสาร + contact box
  let closeCheckerHtml = "-";
  if (closeChecker) {
    const contact = assistantContactsByName[closeChecker];
    if (contact) {
      const bodyLines = [];

      if (contact.phone) {
        bodyLines.push(`
          <div>
            <span class="label">โทร</span>
            <a class="value" href="tel:${contact.phone}">${contact.phone}</a>
          </div>
        `);
      }
      if (contact.line) {
        bodyLines.push(`
          <div>
            <span class="label">LINE</span>
            <span class="value">${contact.line}</span>
          </div>
        `);
      }
      if (bodyLines.length === 0) {
        bodyLines.push(`
          <div>
            <span class="value">ยังไม่ได้บันทึกช่องทางการติดต่อเพิ่มเติม</span>
          </div>
        `);
      }

      closeCheckerHtml = `
        <button type="button" class="assistant-contact-link" data-assistant-name="${closeChecker}">
          ${closeChecker}
        </button>
        <div class="assistant-contact-box" data-assistant-box="${closeChecker}">
          <div class="assistant-contact-box-header">
            <span class="assistant-contact-title">ช่องทางการติดต่อ</span>
            <span class="assistant-contact-role">${contact.position || ""}</span>
          </div>
          <div class="assistant-contact-box-body">
            ${bodyLines.join("")}
          </div>
        </div>
      `;
    } else {
      closeCheckerHtml = closeChecker;
    }
  }

  // === layout แบบการ์ดตามภาพ ===
  const html = `
    <div class="modal-sections">

      <!-- 1) ข้อมูลโครงการ -->
      <section class="modal-section">
        <div class="modal-section-header">
          <div class="modal-section-icon icon-info">
            <span>📁</span>
          </div>
          <div class="modal-section-header-text">
            <div class="modal-section-title">ข้อมูลโครงการ</div>
            <div class="modal-section-caption">
              ข้อมูลพื้นฐานของโครงการจากระบบจัดทำโครงการ
            </div>
          </div>
        </div>
        <div class="modal-section-grid">
          <div>
            <div class="modal-item-label">รหัสโครงการ</div>
            <div class="modal-item-value">${code}</div>
          </div>
          <div>
            <div class="modal-item-label">ชื่อโครงการ</div>
            <div class="modal-item-value">${name}</div>
          </div>
          <div>
            <div class="modal-item-label">ผู้รับผิดชอบโครงการ</div>
            <div class="modal-item-value">${orgName}</div>
          </div>
          <div>
            <div class="modal-item-label">ฝ่ายที่รับผิดชอบโครงการ</div>
            <div class="modal-item-value">${orgGroup}</div>
          </div>
          <div>
            <div class="modal-item-label">ปีการศึกษา</div>
            <div class="modal-item-value">${yearStr}</div>
          </div>
        </div>
      </section>
      
      <div> <br/> </div>

      <!-- 2) อนุมัติ -->
      <section class="modal-section">
        <div class="modal-section-header">
          <div class="modal-section-icon icon-approve">
            <span>✅</span>
          </div>
          <div class="modal-section-header-text">
            <div class="modal-section-title">อนุมัติ</div>
            <div class="modal-section-caption">
              สถานะการอนุมัติและรายละเอียดจากที่ประชุมสภา
            </div>
          </div>
        </div>
        <div class="modal-section-grid">
          <div>
            <div class="modal-item-label">สถานะการอนุมัติ</div>
            <div class="modal-item-value">${approveStatus}</div>
          </div>
          <div>
            <div class="modal-item-label">ผ่านที่ประชุมสภา</div>
            <div class="modal-item-value">${councilSessionText}</div>
          </div>
          <div>
            <div class="modal-item-label">วันที่อนุมัติโครงการ</div>
            <div class="modal-item-value">${approveDate}</div>
          </div>
          <div>
            <div class="modal-item-label">วันที่ปฏิบัติงานวันสุดท้าย</div>
            <div class="modal-item-value">${lastWorkDate}</div>
          </div>
          <div>
            <div class="modal-item-label">แหล่งงบประมาณ (กองทุน)</div>
            <div class="modal-item-value">${fundSource}</div>
          </div>
          <div>
            <div class="modal-item-label">งบประมาณที่ได้รับอนุมัติ (100%)</div>
            <div class="modal-item-value">${approvedBudget100Text}</div>
          </div>
        </div>
      </section>

      <div> <br/> </div>

      <!-- 3) โอนงบประมาณ -->
      <section class="modal-section">
        <div class="modal-section-header">
          <div class="modal-section-icon icon-transfer">
            <span>💸</span>
          </div>
          <div class="modal-section-header-text">
            <div class="modal-section-title">โอนงบประมาณ</div>
            <div class="modal-section-caption">
              สถานะการโอนงบประมาณและส่วนต่างของการโอน
            </div>
          </div>
        </div>
        <div class="modal-section-grid">
          <div>
            <div class="modal-item-label">สถานะโอนงบประมาณ</div>
            <div class="modal-item-value">${transferStatus}</div>
          </div>
          <div>
            <div class="modal-item-label">เลขรันเอกสารโอนงบประมาณ</div>
            <div class="modal-item-value">${transferDocNo}</div>
          </div>
          <div>
            <div class="modal-item-label">ส่วนต่างการโอนงบประมาณ</div>
            <div class="modal-item-value">${transferDiffDisplay}</div>
          </div>
          <div>
            <div class="modal-item-label">งบประมาณสุทธิ</div>
            <div class="modal-item-value">${transferNetText}</div>
          </div>
        </div>
      </section>

      <div> <br/> </div>

      <!-- 4) ยืมรองจ่าย -->
      <section class="modal-section">
        <div class="modal-section-header">
          <div class="modal-section-icon icon-advance">
            <span>🧾</span>
          </div>
          <div class="modal-section-header-text">
            <div class="modal-section-title">ยืมรองจ่าย</div>
            <div class="modal-section-caption">
              รายละเอียดการยืมรองจ่ายและกำหนดคืนรองจ่าย
            </div>
          </div>
        </div>
        <div class="modal-section-grid">
          <div>
            <div class="modal-item-label">สถานะยืมรองจ่าย</div>
            <div class="modal-item-value">${advanceStatus}</div>
          </div>
          <div>
            <div class="modal-item-label">เลขรันเอกสารยืมรองจ่าย</div>
            <div class="modal-item-value">${advanceDocNo}</div>
          </div>
          <div>
            <div class="modal-item-label">วันที่ต้องคืนรองจ่าย</div>
            <div class="modal-item-value">${advanceDue}</div>
          </div>
          <div>
            <div class="modal-item-label">ร้อยละการยืมรองจ่าย</div>
            <div class="modal-item-value">${advancePercentText}</div>
          </div>
          <div>
            <div class="modal-item-label">จำนวนเงินยืมรองจ่าย</div>
            <div class="modal-item-value">${advanceAmountText}</div>
          </div>
        </div>
        ${
          canDownloadPdf
            ? `
        <div class="modal-actions">
          <button type="button" class="btn-primary pdf-download-btn" data-project-pdf>ดาวน์โหลดเอกสารยืมรองจ่าย (อัตโนมัติ)</button>
        </div>
        `
            : ""
        }
      </section>

      <div> <br/> </div>

      <!-- 5) ส่งปิดโครงการ -->
      <section class="modal-section">
        <div class="modal-section-header">
          <div class="modal-section-icon icon-close">
            <span>📚</span>
          </div>
          <div class="modal-section-header-text">
            <div class="modal-section-title">ส่งปิดโครงการ</div>
            <div class="modal-section-caption">
              สถานะการส่งปิดโครงการและข้อมูลการใช้งบประมาณจริง
            </div>
          </div>
        </div>
        <div class="modal-section-grid">
          <div>
            <div class="modal-item-label">ผู้สอบตรวจสอบเอกสาร</div>
            <div class="modal-item-value">${closeCheckerHtml}</div>
          </div>
          <div>
            <div class="modal-item-label">วันที่ต้องส่งเอกสารสรุปโครงการ</div>
            <div class="modal-item-value">${closeDueDate}</div>
          </div>
          <div>
            <div class="modal-item-label">งบประมาณที่ใช้จริง</div>
            <div class="modal-item-value">${actualBudgetText}</div>
          </div>
          <div>
            <div class="modal-item-label">งบประมาณคงเหลือ</div>
            <div class="modal-item-value">${remainingBudgetText}</div>
          </div>
          <div>
            <div class="modal-item-label">% การใช้งบประมาณ</div>
            <div class="modal-item-value">${usagePercentText}</div>
          </div>
          <div>
            <div class="modal-item-label">ระยะเวลาในการส่งสรุปโครงการ</div>
            <div class="modal-item-value">${closeDurationText}</div>
          </div>
          <div>
            <div class="modal-item-label">เลขฎีกา</div>
            <div class="modal-item-value">${decreeNo}</div>
          </div>
          <div>
            <div class="modal-item-label">สถานะปิดโครงการ (อบจ.)</div>
            <div class="modal-item-value">${closeStatusAdvance}</div>
          </div>
          <div>
            <div class="modal-item-label">สถานะปิดโครงการ (กิจการนิสิต)</div>
            <div class="modal-item-value">${closeStatusDecree}</div>
          </div>
        </div>
      </section>

    </div>
  `;

  projectModalBodyEl.innerHTML = html;
  openDialog(projectModalEl, { focusSelector: "#projectModalClose" });

  const pdfBtn = projectModalBodyEl.querySelector("[data-project-pdf]");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => openPdfSignModal(project));
  }

  // toggle กล่อง contact ผู้ช่วยเหรัญญิก
  const links = projectModalBodyEl.querySelectorAll(".assistant-contact-link");
  links.forEach((link) => {
    link.addEventListener("click", () => {
      const name = link.dataset.assistantName;
      const box = projectModalBodyEl.querySelector(
        `.assistant-contact-box[data-assistant-box="${name}"]`
      );
      if (box) {
        box.classList.toggle("show");
      }
    });
  });
}

function shouldShowPdfDownload(project) {
  const status = (project.statusMain || project.approvalStatus || "").toString().trim();
  const approveDate = (project.approveDate || "").toString().trim();
  const daysToDeadline =
    typeof project.daysToDeadline === "number" && !isNaN(project.daysToDeadline)
      ? project.daysToDeadline
      : null;

  const advanceStatus = (project.advanceStatus || "").toString().trim();
  const invalidAdvanceStatuses = [
    "ส่งกิจการนิสิตแล้ว รออนุมัติ",
    "สำรองจ่ายก่อน",
    "เหรัญญิกรับเงินจากกิจการนิสิต",
    "โครงการรับเงินแล้ว",
    "ยกเลิก",
    "ไม่อนุมัติ / อนุมัติไม่ทันวันจัดกิจกรรม"
  ];

  return status === "อนุมัติโครงการ" && approveDate !== "" && daysToDeadline !== null && daysToDeadline > 21 && !invalidAdvanceStatuses.includes(advanceStatus);
}


function closeProjectModal() {
  if (!projectModalEl) return;
  closeDialog(projectModalEl);
}

/* ===== PDF Auto-fill ===== */
const PDF_SIGNERS = {
  treasurerName: "นายธุวานนท์ กิ้มเฉี้ยง",
  treasurerPhone: "094-969-6495",
  presidentName: "นางสาวเกวลี เอกโยคยะ"
};

function getPdfSigners(project) {
  const year = getPdfDocumentYear(project);
  const configured = globalThis.SGCU_APP_CONFIG?.documents?.signersByAcademicYear?.[year] || {};
  return {
    treasurerName: (configured.treasurerName || PDF_SIGNERS.treasurerName).toString().trim(),
    treasurerPhone: (configured.treasurerPhone || PDF_SIGNERS.treasurerPhone).toString().trim(),
    presidentName: (configured.presidentName || PDF_SIGNERS.presidentName).toString().trim(),
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

function buildPdfData(project, signatureData) {
  const budget100 =
    project.approvedBudget100 != null ? project.approvedBudget100 : project.budget || 0;
  const advancePercent = Number.isFinite(Number(project.advancePercent))
    ? Number(project.advancePercent)
    : 80;
  const configuredAdvanceAmount = parseAmountNumber(project.advanceAmount);
  const advanceAmount = configuredAdvanceAmount != null
    ? configuredAdvanceAmount
    : Math.round(Number(budget100 || 0) * (advancePercent / 100) * 100) / 100;
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
    approvedBudget100Words: thaiBahtText(budget100),
    approvedBudget80Words: thaiBahtText(advanceAmount),
    evidenceDueDateText,
    advancePercentText: formatPercentForPdf(advancePercent),
    documentYear: getPdfDocumentYear(project),
    transferDocNo: project.transferDocNo || "",
    signerTreasurerName: signers.treasurerName,
    signerTreasurerPhone: signers.treasurerPhone,
    signerPresidentName: signers.presidentName,
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

function applyThaiSegmentation(rootEl) {
  if (!rootEl || typeof Intl === "undefined" || !Intl.Segmenter) return;

  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  const doc = rootEl.ownerDocument;
  const walker = doc.createTreeWalker(rootEl, 4);
  const textNodes = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest("style, script, .pdf-no-segment")) continue;
    if (!parent.closest(".pdf-paragraph, .pdf-sign-name, .pdf-sign-role, .pdf-sign-org, [data-pdf-field]")) continue;
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
  if (!pdfRootEl) return;

  // Account data improves the generated document, but a slow Firestore request
  // must never leave the Create PDF button waiting indefinitely.
  await Promise.race([
    ensureOrgAccountMap(),
    new Promise((resolve) => window.setTimeout(resolve, 2500))
  ]);

  if (printWin && !printWin.closed) {
    openPdfPrintWindow(project, printWin, signatureData);
    return;
  }

  if (!downloadPdfInSameTab(project, signatureData)) {
    throw new Error("PDF print view is unavailable");
  }
}

function openPdfSignModal(project) {
  const modal = document.getElementById("pdfSignModal");
  if (!modal) return;

  // Reset form
  const form = document.getElementById("pdfSignForm");
  form.reset();

  // Determine Central vs Club
  const isCentral = ["องค์การบริหารสโมสรนิสิต", "สภานิสิต", "องค์การบริหารสโมสรนิสิต, สภานิสิต"].includes(project.orgGroup);
  
  const clubFields = document.getElementById("pdfSignClubFields");
  const orgLabel = document.getElementById("pdfSignOrgLabel");
  const orgLabel2 = document.getElementById("pdfSignOrgLabel2");

  const headNameInput = document.getElementById("pdfSignHeadName");
  const clubTreasurerInput = document.getElementById("pdfSignClubTreasurer");
  const advisorInput = document.getElementById("pdfSignAdvisor");
  
  if (isCentral) {
    clubFields.style.display = "none";
    if(headNameInput) headNameInput.required = false;
    if(clubTreasurerInput) clubTreasurerInput.required = false;
    if(advisorInput) advisorInput.required = false;
  } else {
    clubFields.style.display = "flex";
    if(headNameInput) headNameInput.required = true;
    if(clubTreasurerInput) clubTreasurerInput.required = true;
    if(advisorInput) advisorInput.required = true;

    const orgName = project.orgName || "ชมรม";
    if(orgLabel) orgLabel.textContent = orgName;
    if(orgLabel2) orgLabel2.textContent = orgName;
  }

  // Show modal
  if (typeof openDialog === "function") {
    openDialog(modal, { focusSelector: "#pdfSignLeadName" });
  } else {
    modal.classList.add("show");
  }

  // Handle Close/Cancel
  const closeBtn = document.getElementById("pdfSignModalClose");
  const cancelBtn = document.getElementById("pdfSignCancel");
  
  const closeHandler = () => {
    if (typeof closeDialog === "function") {
      closeDialog(modal);
    } else {
      modal.classList.remove("show");
    }
  };
  
  closeBtn.onclick = closeHandler;
  cancelBtn.onclick = closeHandler;

  // Handle Submit
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const signatureData = {
      name: document.getElementById("pdfSignLeadName").value.trim(),
      phone: document.getElementById("pdfSignLeadPhone").value.trim(),
      headName: document.getElementById("pdfSignHeadName").value.trim(),
      clubTreasurer: document.getElementById("pdfSignClubTreasurer").value.trim(),
      advisor: document.getElementById("pdfSignAdvisor").value.trim()
    };

    const submitButton = form.querySelector('[type="submit"]');
    const originalButtonText = submitButton?.textContent || "สร้าง PDF";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "กำลังสร้าง PDF...";
    }

    // Open synchronously while the submit still has user activation. Mobile
    // browsers commonly ignore print requests created after asynchronous work.
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(`<!doctype html><html lang="th"><head><meta charset="UTF-8"><title>กำลังสร้าง PDF...</title></head><body style="font-family:sans-serif;padding:24px">กำลังสร้างเอกสาร...</body></html>`);
      printWin.document.close();
    }

    try {
      await downloadProjectPdf(project, signatureData, printWin);
      closeHandler();
    } catch (error) {
      if (printWin && !printWin.closed) printWin.close();
      console.error("Unable to create advance-loan PDF", error);
      alert("ไม่สามารถสร้าง PDF ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  };
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

  let hasPrepared = false;
  let fallbackTimer = 0;
  const prepareAndPrint = async () => {
    if (hasPrepared || printWin.closed) return;
    hasPrepared = true;
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    printWin.document.body.appendChild(tempRoot);
    await waitForPdfAssets(printWin.document, tempRoot);
    printWin.focus();
    printWin.print();
  };

  // Bind before closing the document to avoid missing a synchronous load event.
  printWin.onload = () => {
    void prepareAndPrint();
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
        <link rel="stylesheet" href="${cssHref}" />
        <style>
          body { margin: 0; background: #fff; font-family: "THSarabunNew", "TH Sarabun New", serif; }
          .pdf-root { position: static !important; left: 0 !important; top: 0 !important; }
          .pdf-print-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: center; padding: 12px; background: #fff4f8; border-bottom: 1px solid #f8bdd4; }
          .pdf-print-toolbar button { border: 0; border-radius: 999px; padding: 10px 22px; color: #fff; background: #e72983; font: 700 16px sans-serif; cursor: pointer; }
          @media print { .pdf-print-toolbar { display: none !important; } }
        </style>
      </head>
      <body><div class="pdf-print-toolbar"><button type="button" onclick="window.print()">พิมพ์ / บันทึก PDF</button></div></body>
    </html>
  `);
  printWin.document.close();
  fallbackTimer = window.setTimeout(() => {
    void prepareAndPrint();
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
