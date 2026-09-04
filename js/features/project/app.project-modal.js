/* Modal: รายละเอียดโครงการ + PDF autofill */
function openProjectModal(project) {
  if (!projectModalEl) return;

  const code = project.code || "-";
  const name = project.name || "-";
  const orgName = project.orgName || "-";
  const orgGroup = project.orgGroup || "-";
  const approveStatus = project.approvalStatus || project.statusMain || PROJECT_PENDING_APPROVAL_STATUS;
  const approvalBadgeClass = statusMainToBadgeClass(approveStatus);
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
  const normalizedTransferStatus = transferStatus.trim();
  const transferStatusBadgeClass =
    normalizedTransferStatus === "-" || normalizedTransferStatus === "ไม่เข้ากระบวนการโอนงบประมาณ"
      ? "badge badge-draft"
      : normalizedTransferStatus.includes("ไม่อนุมัติ") || normalizedTransferStatus.includes("ไม่ผ่าน")
        ? "badge badge-rejected"
        : normalizedTransferStatus.includes("มีผลบังคับใช้")
          ? "badge badge-approved"
          : "badge badge-pending";
  const transferDiffClass = transferDiffDisplay.includes("ลด") || Number(project.transferDiffAmount) < 0
    ? "is-negative"
    : transferDiffDisplay.includes("เพิ่ม") || Number(project.transferDiffAmount) > 0
      ? "is-positive"
      : "is-neutral";

  const advanceStatus = project.advanceStatus || "-";
  const advanceDocNo = project.advanceDocNo || "-";
  const advanceDue = project.advanceDueDate || "-";
  const advancePercentText =
    project.advancePercent != null
      ? project.advancePercent.toFixed(0) + "%"
      : "-";
  const advanceAmountText =
    project.advanceAmount != null ? `${formatMoney(project.advanceAmount)} บาท` : "-";
  const normalizedAdvanceStatus = advanceStatus.trim();
  const advanceStatusBadgeClass =
    normalizedAdvanceStatus === "-" || normalizedAdvanceStatus === "ยังไม่เริ่มดำเนินการ"
      ? "badge badge-draft"
      : normalizedAdvanceStatus.includes("ยกเลิก") || normalizedAdvanceStatus.includes("ไม่อนุมัติ")
        ? "badge badge-rejected"
        : normalizedAdvanceStatus === "โครงการรับเงินแล้ว"
          ? "badge badge-approved"
          : "badge badge-pending";
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
  const closeDurationRaw = (project.closeDurationText || "").toString().trim();
  const closeDurationText = closeDurationRaw
    ? /^-?\d+(?:\.\d+)?$/.test(closeDurationRaw) ? `${closeDurationRaw} วัน` : closeDurationRaw
    : "-";
  const decreeNo = project.decreeNo || "-";
  const closeStatusAdvance = project.closeStatusAdvance || "-";
  const closeStatusDecree = project.closeStatusDecree || project.statusCloseDecree || "-";
  const normalizedCloseStatus = closeStatusAdvance.trim();
  const closeStatusBadgeClass = normalizedCloseStatus.includes("เรียบร้อย") || normalizedCloseStatus === "ผ่านเหรัญญิก"
    ? "badge badge-approved"
    : normalizedCloseStatus.includes("แก้ไข") || normalizedCloseStatus.includes("ยกเลิก") || normalizedCloseStatus.includes("ไม่ส่ง")
      ? "badge badge-rejected"
      : normalizedCloseStatus === "-"
        ? "badge badge-draft"
        : "badge badge-pending";
  const normalizedCloseDecreeStatus = closeStatusDecree.trim();
  const closeDecreeBadgeClass = ["โครงการรับเงินแล้ว", "โครงการคืนเงินแล้ว", "ปิดโครงการเรียบร้อย"].includes(normalizedCloseDecreeStatus)
    ? "badge badge-approved"
    : normalizedCloseDecreeStatus === "-"
      ? "badge badge-draft"
      : "badge badge-pending";
  const remainingBudgetClass = Number(project.remainingBudget) < 0 ? "is-negative" : "";

  // ผู้สอบตรวจเอกสาร + contact box
  let closeCheckerHtml = "-";
  let closeCheckerContactHtml = "";
  if (closeChecker) {
    const contact = assistantContactsByName[closeChecker];
    if (contact) {
      const bodyLines = [];

      if (contact.phone) {
        bodyLines.push(`
          <a class="assistant-contact-method" href="tel:${escapeHtml(contact.phone)}">
            <span class="assistant-contact-method-icon" aria-hidden="true">☎</span>
            <span class="assistant-contact-method-content">
              <span class="assistant-contact-method-label">โทรศัพท์</span>
              <span class="assistant-contact-method-value">${escapeHtml(contact.phone)}</span>
            </span>
            <span class="assistant-contact-method-action">โทร</span>
          </a>
        `);
      }
      if (contact.line) {
        bodyLines.push(`
          <div class="assistant-contact-method">
            <span class="assistant-contact-method-icon assistant-contact-line-icon" aria-hidden="true">L</span>
            <span class="assistant-contact-method-content">
              <span class="assistant-contact-method-label">LINE ID</span>
              <span class="assistant-contact-method-value">${escapeHtml(contact.line)}</span>
            </span>
            <button type="button" class="assistant-contact-copy" data-copy-line="${escapeHtml(contact.line)}">คัดลอก</button>
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
        <button type="button" class="assistant-contact-link" aria-expanded="false" aria-controls="projectCheckerContact">
          <span aria-hidden="true">☎</span> ${escapeHtml(closeChecker)}
        </button>
      `;
      closeCheckerContactHtml = `
        <div id="projectCheckerContact" class="assistant-contact-box project-close-contact-card">
          <div class="assistant-contact-box-header">
            <div class="assistant-contact-profile">
              <span class="assistant-contact-avatar" aria-hidden="true">👤</span>
              <div>
              <div class="assistant-contact-title">${escapeHtml(closeChecker)}</div>
              <div class="assistant-contact-role">${escapeHtml(contact.position || "ผู้ตรวจเอกสาร")}</div>
              </div>
            </div>
            <span class="assistant-contact-card-label">ผู้ตรวจเอกสาร</span>
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
        <div class="modal-section-grid project-basic-info-grid">
          <div class="project-basic-code">
            <div class="modal-item-label">รหัสโครงการ</div>
            <div class="modal-item-value">${code}</div>
          </div>
          <div class="project-basic-name">
            <div class="modal-item-label">ชื่อโครงการ</div>
            <div class="modal-item-value">${name}</div>
          </div>
          <div class="project-basic-owner">
            <div class="modal-item-label">ผู้รับผิดชอบโครงการ</div>
            <div class="modal-item-value">${orgName}</div>
          </div>
          <div class="project-basic-department">
            <div class="modal-item-label">ฝ่ายที่รับผิดชอบโครงการ</div>
            <div class="modal-item-value">${orgGroup}</div>
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
        <div class="modal-section-grid project-approval-info-grid">
          <div class="project-approval-status">
            <div class="modal-item-label">สถานะการอนุมัติ</div>
            <div class="modal-item-value"><span class="${approvalBadgeClass}">${approveStatus}</span></div>
          </div>
          <div class="project-approval-session">
            <div class="modal-item-label">การประชุมสภา</div>
            <div class="modal-item-value">${councilSessionText}</div>
          </div>
          <div class="project-approval-date">
            <div class="modal-item-label">วันที่อนุมัติ</div>
            <div class="modal-item-value">${approveDate}</div>
          </div>
          <div class="project-approval-fund">
            <div class="modal-item-label">แหล่งงบประมาณ (กองทุน)</div>
            <div class="modal-item-value">${fundSource}</div>
          </div>
          <div class="project-approval-budget">
            <div class="modal-item-label">งบประมาณที่อนุมัติ</div>
            <div class="modal-item-value">${approvedBudget100Text}</div>
          </div>
          <div class="project-approval-last-work-date">
            <div class="modal-item-label">วันปฏิบัติงานสุดท้าย</div>
            <div class="modal-item-value">${lastWorkDate}</div>
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
        <div class="modal-section-grid project-transfer-info-grid">
          <div class="project-transfer-status">
            <div class="modal-item-label">สถานะการโอน</div>
            <div class="modal-item-value"><span class="${transferStatusBadgeClass}">${transferStatus}</span></div>
          </div>
          <div class="project-transfer-net">
            <div class="modal-item-label">ยอดโอนสุทธิ</div>
            <div class="modal-item-value">${transferNetText}</div>
          </div>
          <div class="project-transfer-document">
            <div class="modal-item-label">เลขเอกสารโอนงบประมาณ</div>
            <div class="modal-item-value">${transferDocNo}</div>
          </div>
          <div class="project-transfer-difference ${transferDiffClass}">
            <div class="modal-item-label">ส่วนต่างการโอน</div>
            <div class="modal-item-value">${transferDiffDisplay}</div>
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
        <div class="modal-section-grid project-advance-info-grid">
          <div class="project-advance-status">
            <div class="modal-item-label">สถานะการยืม</div>
            <div class="modal-item-value"><span class="${advanceStatusBadgeClass}">${advanceStatus}</span></div>
          </div>
          <div class="project-advance-amount">
            <div class="modal-item-label">จำนวนเงินยืม</div>
            <div class="modal-item-value">${advanceAmountText}</div>
          </div>
          <div class="project-advance-due">
            <div class="modal-item-label">กำหนดคืน</div>
            <div class="modal-item-value">${advanceDue}</div>
          </div>
          <div class="project-advance-document">
            <div class="modal-item-label">เลขเอกสารยืมรองจ่าย</div>
            <div class="modal-item-value">${advanceDocNo}</div>
          </div>
          <div class="project-advance-percent">
            <div class="modal-item-label">สัดส่วนเงินยืม</div>
            <div class="modal-item-value">${advancePercentText}</div>
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
        <div class="modal-section-grid project-close-info-grid">
          <div class="project-close-checker">
            <div class="modal-item-label">ผู้ตรวจเอกสาร</div>
            <div class="modal-item-value">${closeCheckerHtml}</div>
          </div>
          <div class="project-close-due">
            <div class="modal-item-label">วันที่ต้องส่งเอกสารสรุปโครงการ</div>
            <div class="modal-item-value">${closeDueDate}</div>
          </div>
          <div class="project-close-actual">
            <div class="modal-item-label">งบประมาณใช้จริง</div>
            <div class="modal-item-value">${actualBudgetText}</div>
          </div>
          <div class="project-close-remaining ${remainingBudgetClass}">
            <div class="modal-item-label">งบประมาณคงเหลือ</div>
            <div class="modal-item-value">${remainingBudgetText}</div>
          </div>
          <div class="project-close-usage">
            <div class="modal-item-label">สัดส่วนการใช้งบ</div>
            <div class="modal-item-value">${usagePercentText}</div>
          </div>
          <div class="project-close-duration">
            <div class="modal-item-label">ระยะเวลาส่งสรุป</div>
            <div class="modal-item-value">${closeDurationText}</div>
          </div>
          <div class="project-close-decree-number">
            <div class="modal-item-label">เลขฎีกา</div>
            <div class="modal-item-value">${decreeNo}</div>
          </div>
          <div class="project-close-status">
            <div class="modal-item-label">สถานะปิดโครงการ (อบจ.)</div>
            <div class="modal-item-value"><span class="${closeStatusBadgeClass}">${closeStatusAdvance}</span></div>
          </div>
          <div class="project-close-decree-status">
            <div class="modal-item-label">สถานะฎีกา (กิจการนิสิต)</div>
            <div class="modal-item-value"><span class="${closeDecreeBadgeClass}">${closeStatusDecree}</span></div>
          </div>
        </div>
        ${closeCheckerContactHtml}
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
      const box = projectModalBodyEl.querySelector("#projectCheckerContact");
      if (box) {
        box.classList.toggle("show");
        const isOpen = box.classList.contains("show");
        link.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (isOpen) {
          window.requestAnimationFrame(() => {
            box.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
      }
    });
  });

  const copyLineBtn = projectModalBodyEl.querySelector("[data-copy-line]");
  if (copyLineBtn) {
    copyLineBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copyLineBtn.dataset.copyLine || "");
        copyLineBtn.textContent = "คัดลอกแล้ว";
        window.setTimeout(() => { copyLineBtn.textContent = "คัดลอก"; }, 1600);
      } catch (error) {
        copyLineBtn.textContent = "คัดลอกไม่สำเร็จ";
      }
    });
  }
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
