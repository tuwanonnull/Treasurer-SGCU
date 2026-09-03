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
