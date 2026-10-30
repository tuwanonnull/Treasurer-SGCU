/* Project-scoped receipt documents. Form data stays in this dialog only. */
const PROJECT_RECEIPT_TITLES = {
  voucher: "ใบสำคัญรับเงิน",
  certificate: "ใบรับรองแทนใบเสร็จ"
};

function receiptSubmissionNotice(type) {
  const attachments = type === "voucher"
    ? "<li>สำเนาบัตรประชาชนที่ลงลายมือชื่อรับรองสำเนาถูกต้องด้วยลายมือจริง ห้ามใช้ลายเซ็นอิเล็กทรอนิกส์</li><li>สลิปโอนเงิน</li>"
    : "<li>เอกสารประกอบการจ่ายเงิน</li>";
  return `<aside class="receipt-submission-notice" aria-label="ข้อควรทราบก่อนส่งเอกสาร">
    <strong>ก่อนส่ง${PROJECT_RECEIPT_TITLES[type]}</strong>
    <p>เอกสารต้องลงลายมือชื่อจริง ห้ามใช้ลายเซ็นอิเล็กทรอนิกส์</p>
    <p>กรุณาแนบเอกสารต่อไปนี้พร้อมส่ง:</p><ul>${attachments}</ul>
  </aside>`;
}

function receiptEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function receiptSatang(value) {
  const text = String(value).trim();
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(text)) throw new Error("กรุณาระบุจำนวนเงินเป็นตัวเลขไม่เกิน 999,999,999.99 บาท และทศนิยมไม่เกิน 2 ตำแหน่ง");
  const [baht, fraction = ""] = text.split(".");
  const amount = Number(baht) * 100 + Number(fraction.padEnd(2, "0"));
  if (amount <= 0) throw new Error("จำนวนเงินแต่ละรายการต้องมากกว่า 0 บาท");
  return amount;
}

function receiptBahtText(satang) {
  if (!Number.isSafeInteger(satang) || satang < 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
  const digits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  function read(n, followsMillions = false) {
    if (n >= 1000000) {
      return read(Math.floor(n / 1000000)) + "ล้าน" + read(n % 1000000, true);
    }
    const text = String(n);
    return [...text].map((ch, index) => {
      const d = Number(ch), position = text.length - index - 1;
      if (!d) return "";
      if (position === 0 && d === 1 && (n > 1 || followsMillions)) return "เอ็ด";
      if (position === 1) return (d === 1 ? "" : d === 2 ? "ยี่" : digits[d]) + "สิบ";
      return digits[d] + ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"][position];
    }).join("");
  }
  const baht = Math.floor(satang / 100), fraction = satang % 100;
  return (baht ? read(baht) : "ศูนย์") + "บาท" + (fraction ? read(fraction) + "สตางค์" : "ถ้วน");
}

function receiptMoney(satang) {
  return (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function receiptDate(value, long = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("กรุณาระบุวันที่ให้ครบถ้วน");
  const date = new Date(value + "T12:00:00+07:00");
  if (!Number.isFinite(date.getTime()) || date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) !== value) throw new Error("วันที่ไม่ถูกต้อง");
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok", day: "numeric", month: long ? "long" : "numeric", year: "numeric"
  }).format(date);
}

function receiptProjectDate(value) {
  const text = String(value ?? "").trim();
  let parts = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!parts) {
    const dayFirst = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dayFirst) parts = [text, dayFirst[3], dayFirst[2], dayFirst[1]];
  }
  let iso;
  if (parts) {
    let year = Number(parts[1]);
    if (year < 100) year += 2000;
    if (year >= 2400) year -= 543;
    iso = `${year}-${parts[2].padStart(2, "0")}-${parts[3].padStart(2, "0")}`;
  } else {
    const parsed = parseProjectDate(value);
    if (!parsed) throw new Error("ข้อมูลวันที่โครงการไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาติดต่อผู้ดูแลโครงการ");
    iso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  receiptDate(iso);
  return iso;
}

function receiptDateRange(project) {
  const issues = [];
  const read = (value, label) => {
    if (!String(value ?? "").trim() || String(value).trim() === "-") {
      issues.push(`ยังไม่มี${label}`);
      return null;
    }
    try { return receiptProjectDate(value); } catch {
      issues.push(`${label}ไม่ถูกต้อง`);
      return null;
    }
  };
  const min = read(project.approveDate, "วันที่อนุมัติ");
  const max = read(project.lastWorkDate, "วันปฏิบัติงานสุดท้าย");
  if (issues.length) throw new Error(`${issues.join(" และ ")} กรุณาติดต่อผู้ดูแลโครงการ`);
  if (min > max) throw new Error("วันที่อนุมัติอยู่หลังวันปฏิบัติงานสุดท้าย กรุณาติดต่อผู้ดูแลโครงการ");
  return { min, max };
}

function validateReceiptDate(value, range) {
  receiptDate(value);
  if (value < range.min || value > range.max) {
    throw new Error(`วันที่ต้องอยู่ในช่วงวันที่อนุมัติ ${receiptDate(range.min)} ถึงวันปฏิบัติงานสุดท้าย ${receiptDate(range.max)}`);
  }
}

function receiptProjectUnit(project) {
  return [project.orgName, project.name].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
}

function resolveProjectReceiptTemplate(project) {
  const group = String(project.orgGroup || "").trim();
  const name = String(project.orgName || "").trim();
  // The project's affiliation is authoritative; only fall back when it is absent.
  const affiliation = group && group !== "-" ? group : name;
  if (["องค์การบริหารสโมสรนิสิต", "องค์การบริหารสโมสรนิสิตจุฬาฯ", "สภานิสิต", "องค์การบริหารสโมสรนิสิต, สภานิสิต"].includes(affiliation)) {
    return { key: "objor", label: "อบจ. — ไม่มีอาจารย์ที่ปรึกษา", available: true,
      note: "กำหนดตามสังกัดโครงการ ใช้แบบฟอร์ม อบจ. ไม่มีช่องลงนามอาจารย์ที่ปรึกษา" };
  }
  if (affiliation.startsWith("ชมรม")) {
    return { key: "club", label: "ชมรม", available: true, note: "" };
  }
  return { key: "unavailable", label: affiliation || "ยังไม่ระบุสังกัด", available: false,
    note: affiliation ? "ยังไม่มีแบบฟอร์มสำหรับสังกัดนี้" : "โครงการยังไม่มีข้อมูลสังกัด จึงยังสร้างเอกสารไม่ได้" };
}

function mountProjectDocuments(panel, project) {
  const esc = receiptEscape;
  panel.innerHTML = `
    <h3>เลือกเอกสารที่ต้องการกรอก</h3>
    <p class="project-document-context">${esc(project.code || "")} · ${esc(project.name || "")}<br>${esc(project.orgName || "")}</p>
    <div class="project-document-types" role="group" aria-label="เลือกประเภทเอกสาร">
      ${Object.entries(PROJECT_RECEIPT_TITLES).map(([type, title]) => `<button type="button" class="project-document-type" data-receipt-type="${type}" aria-pressed="false">
        <span class="project-document-type-title">${title}</span>
        <span class="project-document-type-description">${type === "voucher" ? "ให้ผู้รับเงินลงนามเป็นหลักฐานการรับเงิน" : "ให้ผู้ซื้อ / ผู้จ้างลงนามรับรองการจ่ายเงิน"}</span>
        <span class="project-document-type-action" aria-hidden="true">เลือกเอกสารนี้ <span>→</span></span>
      </button>`).join("")}
    </div>
    <p class="project-document-mobile-description" data-receipt-description aria-live="polite">เลือกประเภทเอกสารเพื่อเริ่มกรอกข้อมูล</p>
    <p class="project-document-download-hint">แนะนำให้ดาวน์โหลดเอกสารผ่านคอมพิวเตอร์ (PC/Desktop)</p>
    <div data-receipt-editor></div>`;
  panel.querySelectorAll("[data-receipt-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const editor = panel.querySelector("[data-receipt-editor]");
      panel.querySelector("[data-receipt-description]").textContent = button.querySelector(".project-document-type-description").textContent;
      // Keep each form mounted so switching types does not discard entered values.
      panel.querySelectorAll("[data-receipt-type]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
        item.querySelector(".project-document-type-action").innerHTML = item === button ? "เลือกแล้ว <span>✓</span>" : "เลือกเอกสารนี้ <span>→</span>";
      });
      editor.querySelectorAll("form").forEach((form) => { form.hidden = true; });
      let form = editor.querySelector(`[data-document-type="${button.dataset.receiptType}"]`);
      if (!form) {
        form = document.createElement("form");
        form.dataset.documentType = button.dataset.receiptType;
        form.className = "project-document-form";
        editor.appendChild(form);
        mountReceiptForm(form, project, button.dataset.receiptType);
      }
      form.hidden = false;
      // Keep the mobile selector in view without opening the keyboard on a type change.
      if (!window.matchMedia("(max-width: 600px)").matches) {
        (form.querySelector("[data-template-note]") || form.querySelector("input"))?.focus();
      }
    });
  });
}

function mountReceiptForm(form, project, type) {
  const template = resolveProjectReceiptTemplate(project);
  const esc = receiptEscape, certificate = type === "certificate";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const unit = receiptProjectUnit(project);
  let range, dateError = "";
  try { range = receiptDateRange(project); } catch (error) { dateError = error.message; }
  const defaultDate = range && today >= range.min && today <= range.max ? today : "";
  const field = (name, label, value = "", inputType = "text", required = true, max = 100) =>
    `<label class="project-document-field">${label}${required ? " *" : ""}<input class="login-input" name="${name}" type="${inputType}" value="${esc(value)}" ${required ? "required" : ""} ${name === "unit" ? "readonly" : ""} ${inputType === "date" && range ? `min="${range.min}" max="${range.max}"` : ""} maxlength="${max}"></label>`;
  form.innerHTML = `
    ${template.available ? "" : `<p data-template-note role="status" tabindex="-1">${esc(template.note)}</p>`}
    ${dateError ? `<p data-template-note role="status" tabindex="-1" class="project-document-error">${esc(dateError)}</p>` : `<p>วันที่ในเอกสารต้องอยู่ระหว่าง ${receiptDate(range.min)} ถึง ${receiptDate(range.max)} (วันที่อนุมัติถึงวันปฏิบัติงานสุดท้าย)</p>`}
    <fieldset data-receipt-fields>
      <legend>${PROJECT_RECEIPT_TITLES[type]}</legend>
      <p>ช่องที่มี * จำเป็นต้องกรอก</p>
      <div class="project-document-grid">
        ${field("date", certificate ? "วันที่ลงนามรับรอง" : "วันที่รับเงิน", defaultDate, "date")}
        ${certificate ? field("unit", "หน่วยงาน โครงการ", unit, "text", true, 180) : field("place", "เขียนที่ (สถานที่ซื้อ)")}
        ${field("person", certificate ? "ชื่อ–นามสกุลผู้ซื้อ / จ้าง" : "ชื่อ–นามสกุลผู้รับเงิน")}
        ${certificate ? field("position", "ตำแหน่งในหน่วยงาน / โครงการ") : field("house", "บ้านเลขที่") + field("road", "ถนน", "", "text", false) + field("subdistrict", "ตำบล / แขวง") + field("district", "อำเภอ / เขต") + field("province", "จังหวัด") + field("phone", "เบอร์โทรศัพท์ผู้รับเงิน", "", "tel", true, 30) + field("payer", "ชื่อ–นามสกุลผู้จ่ายเงิน")}
        ${template.key === "club" ? field("advisor", "ชื่อ–นามสกุลอาจารย์ที่ปรึกษา") : ""}
      </div>
      <h4>รายการค่าใช้จ่าย</h4>
      <p>${certificate ? "ระบุรายละเอียดและหมายเหตุว่าใช้ในงานใด" : "ระบุรายละเอียด จำนวน และราคาต่อหน่วยในช่องรายการ"} (สูงสุด ${certificate ? 14 : 8} รายการต่อใบ)</p>
      <div data-receipt-rows></div>
      <button type="button" class="btn-ghost" data-add-receipt-row>+ เพิ่มรายการ</button>
      <p class="project-document-total" data-receipt-total aria-live="polite">รวม 0.00 บาท</p>
      <p data-receipt-error role="alert" class="project-document-error"></p>
      <div class="modal-actions"><button type="submit" class="btn-primary">ดูตัวอย่าง / พิมพ์ PDF</button></div>
    </fieldset>`;
  const rows = form.querySelector("[data-receipt-rows]");
  const add = form.querySelector("[data-add-receipt-row]");
  function refresh() {
    [...rows.children].forEach((row, index) => {
      row.querySelector("legend").textContent = `รายการที่ ${index + 1}`;
      row.querySelector("[data-remove-row]").disabled = rows.children.length === 1;
    });
    add.disabled = rows.children.length >= (certificate ? 14 : 8);
    try {
      const total = [...rows.querySelectorAll('[name="amount"]')].reduce((sum, input) => sum + (input.value ? receiptSatang(input.value) : 0), 0);
      form.querySelector("[data-receipt-total]").textContent = `รวม ${receiptMoney(total)} บาท (${receiptBahtText(total)})`;
    } catch {
      form.querySelector("[data-receipt-total]").textContent = "กรุณาตรวจสอบจำนวนเงินในแต่ละรายการ";
    }
  }
  function addRow() {
    if (rows.children.length >= (certificate ? 14 : 8)) return;
    const row = document.createElement("fieldset");
    row.className = "project-document-row";
    row.innerHTML = `<legend></legend><div class="project-document-grid">
      ${certificate ? field("itemDate", "วันที่ซื้อ / จ้าง", form.elements.date.value || defaultDate, "date") : ""}
      ${field("description", "รายละเอียดรายการ", "", "text", true, certificate ? 100 : 160)}
      <label class="project-document-field">จำนวนเงิน (บาท) *<input class="login-input" name="amount" type="number" min="0.01" max="999999999.99" step="0.01" inputmode="decimal" required></label>
      ${certificate ? field("note", "หมายเหตุ / ใช้ในงานใด", "", "text", false, 80) : ""}
      </div><button type="button" class="btn-ghost" data-remove-row>ลบรายการ</button>`;
    row.querySelector("[data-remove-row]").onclick = () => { row.remove(); refresh(); add.focus(); };
    rows.appendChild(row);
    refresh();
  }
  add.onclick = () => { addRow(); rows.lastElementChild.querySelector("input")?.focus(); };
  rows.addEventListener("input", refresh);
  addRow();
  form.querySelector("[data-receipt-fields]").disabled = !template.available || !range;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    if (button.disabled) return;
    const error = form.querySelector("[data-receipt-error]");
    error.textContent = "";
    if (!resolveProjectReceiptTemplate(project).available || !form.reportValidity()) return;
    let preview;
    const buttonLabel = button.textContent;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "กำลังเตรียมเอกสาร…";
    try {
      const data = Object.fromEntries(new FormData(form));
      for (const input of form.querySelectorAll("input[required]")) {
        if (!input.value.trim()) { input.focus(); throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน"); }
      }
      const items = [...rows.children].map((row) => ({
        description: row.querySelector('[name="description"]').value.trim(),
        satang: receiptSatang(row.querySelector('[name="amount"]').value),
        date: certificate ? row.querySelector('[name="itemDate"]').value : "",
        note: certificate ? row.querySelector('[name="note"]').value.trim() : ""
      }));
      const html = buildReceiptDocument(type, data, items, project, document.baseURI);
      const printDocument = new DOMParser().parseFromString(html, "text/html");
      applyThaiSegmentation(printDocument.querySelector(".receipt-sheet"), "p, .signature, td:not(.money), .fill");
      preview = window.open("", "_blank");
      if (!preview) throw new Error("ไม่สามารถเปิดตัวอย่างได้ กรุณาอนุญาตหน้าต่างป๊อปอัปแล้วลองอีกครั้ง");
      showProjectDocumentLoading(preview);
      // Let the loading view paint before replacing it with the document.
      await new Promise(resolve => window.setTimeout(resolve, 180));
      if (preview.closed) throw new Error("หน้าตัวอย่างถูกปิด กรุณาเปิดตัวอย่างอีกครั้ง");
      preview.document.open();
      preview.document.write("<!doctype html>" + printDocument.documentElement.outerHTML);
      preview.document.close();
    } catch (reason) {
      if (preview) preview.close();
      error.textContent = reason.message || "สร้างเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง";
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = buttonLabel;
    }
  });
}

function buildReceiptDocument(type, data, items, project, baseURI) {
  if (!Object.hasOwn(PROJECT_RECEIPT_TITLES, type)) throw new Error("ประเภทเอกสารไม่ถูกต้อง");
  const esc = receiptEscape, certificate = type === "certificate";
  const club = resolveProjectReceiptTemplate(project).key === "club";
  if (club && !String(data.advisor || "").trim()) throw new Error("กรุณากรอกชื่ออาจารย์ที่ปรึกษา");
  const range = receiptDateRange(project);
  validateReceiptDate(data.date, range);
  if (certificate) {
    items.forEach((item) => validateReceiptDate(item.date, range));
    data = { ...data, unit: receiptProjectUnit(project) };
    if (!data.unit) throw new Error("โครงการยังไม่มีข้อมูลหน่วยงาน โครงการ กรุณาติดต่อผู้ดูแลโครงการ");
  }
  const maxRows = certificate ? 14 : 8;
  if (!items.length || items.length > maxRows) throw new Error("จำนวนรายการเกินแบบฟอร์ม");
  const total = items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.satang) || item.satang <= 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
    return sum + item.satang;
  }, 0);
  receiptDate(data.date, true);
  const line = (text) => `<span class="fill">${esc(text || "") || "&nbsp;"}</span>`;
  const field = (label, value) => `<span class="receipt-field-label">${label}</span>${line(value)}`;
  const [year, , day] = data.date.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "Asia/Bangkok" }).format(new Date(data.date + "T12:00:00+07:00"));
  const sign = (name, role) => `<div class="signature"><div class="signature-line" aria-label="ช่องลงนาม"></div><div class="signature-name"><span>(</span>${line(name)}<span>)</span></div><div>${role}</div></div>`;
  const tableRows = Array.from({ length: maxRows }, (_, i) => {
    const item = items[i];
    return certificate
      ? `<tr${item ? ` data-receipt-amount="${item.satang}"` : ""}><td>${item ? esc(receiptDate(item.date)) : "&nbsp;"}</td><td class="receipt-description">${item ? esc(item.description) : ""}</td><td class="money">${item ? receiptMoney(item.satang) : ""}</td><td class="receipt-description">${item ? esc(item.note) : ""}</td></tr>`
      : `<tr${item ? ` data-receipt-amount="${item.satang}"` : ""}><td class="receipt-description">${item ? esc(item.description) : "&nbsp;"}</td><td class="money">${item ? receiptMoney(item.satang) : ""}</td></tr>`;
  }).join("");
  const cssURL = esc(new URL("css/pages/receipt-print.css", baseURI).href);
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(project.code || "โครงการ")}_${PROJECT_RECEIPT_TITLES[type]}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&amp;display=swap"><link rel="stylesheet" href="${cssURL}"></head>
    <body><nav class="receipt-toolbar" aria-label="เครื่องมือเอกสาร"><div class="receipt-toolbar-inner">
      <div class="receipt-project-info"><div class="receipt-project-meta"><span class="receipt-project-code">${esc(project.code || "โครงการ")}</span><span>ตัวอย่าง${PROJECT_RECEIPT_TITLES[type]}</span></div><div class="receipt-project-name">${esc(project.name || "")}</div></div>
      <div class="receipt-toolbar-actions"><button class="receipt-ui-button receipt-ui-secondary" type="button" onclick="window.close()"><span aria-hidden="true">←</span> กลับไปแก้ไข</button><button class="receipt-ui-button receipt-ui-primary" type="button" id="receiptPrint" disabled>กำลังเตรียมเอกสาร…</button></div>
      <span id="receiptPrintStatus" role="status"></span>
    </div></nav>
    <dialog id="receiptPrintDialog" class="receipt-print-dialog" aria-labelledby="receiptPrintDialogTitle">
      <div class="receipt-dialog-heading"><span class="receipt-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/><path d="M16 11h1"/></svg></span><div><h2 id="receiptPrintDialogTitle">ตรวจสอบก่อนพิมพ์</h2><p>เตรียมเอกสารให้ครบก่อนนำส่ง</p></div><button type="button" id="receiptPrintClose" class="receipt-dialog-close" aria-label="ปิดหน้าต่างตรวจสอบก่อนพิมพ์">×</button></div>
      ${receiptSubmissionNotice(type)}
      <div class="receipt-print-dialog-actions">
        <button class="receipt-ui-button receipt-ui-secondary" type="button" id="receiptPrintCancel" autofocus>กลับไปตรวจสอบ</button>
        <button class="receipt-ui-button receipt-ui-primary" type="button" id="receiptPrintConfirm">รับทราบและพิมพ์</button>
      </div>
    </dialog>
    <div class="receipt-preview-stage"><main class="receipt-sheet ${certificate ? "certificate" : "voucher"}${club ? " club" : ""}"><h1>${PROJECT_RECEIPT_TITLES[type]}</h1>
    ${certificate ? `<p class="unit receipt-field-row">${field("หน่วยงาน", data.unit)}</p>` : `<div class="place"><p class="receipt-field-row">${field("เขียนที่", data.place)}</p><p class="receipt-field-row receipt-date-row">${field("วันที่", day)}${field("เดือน", monthName)}${field("พ.ศ.", year + 543)}</p></div>
      <div class="recipient"><p class="receipt-field-row receipt-person-row">${field("ข้าพเจ้า", data.person)}${field("บ้านเลขที่", data.house)}${field("ถนน", data.road)}</p>
      <p class="receipt-field-row receipt-address-row">${field("ตำบล/แขวง", data.subdistrict)}${field("อำเภอ/เขต", data.district)}${field("จังหวัด", data.province)}</p>
      <p class="receipt-field-row">${field("เบอร์โทรศัพท์", data.phone)}</p><p>ได้รับเงินจากสโมสรนิสิต จุฬาลงกรณ์มหาวิทยาลัย ดังรายการต่อไปนี้</p></div>`}
    <table><colgroup>${certificate ? '<col style="width:17%"><col style="width:40%"><col style="width:20%"><col style="width:23%">' : '<col style="width:72%"><col style="width:28%">'}</colgroup>
    <thead><tr>${certificate ? "<th>วันที่</th><th>รายละเอียด</th><th>จำนวนเงิน</th><th>หมายเหตุ</th>" : "<th>รายการ</th><th>จำนวนเงิน</th>"}</tr></thead>
    <tbody>${tableRows}<tr data-receipt-total-row>${certificate ? '<td></td><td class="money" data-page-total-label>รวม</td>' : '<td class="money" data-page-total-label>รวม</td>'}<td class="money" data-page-total>${receiptMoney(total)}</td>${certificate ? "<td></td>" : ""}</tr></tbody></table>
    <div class="receipt-ending"><p class="total-words receipt-field-row">${field("รวมเงิน (ตัวอักษร)", receiptBahtText(total))}</p>
    ${certificate ? `<div class="declaration"><p class="receipt-field-row receipt-certifier-row">${field("ข้าพเจ้า", data.person)}${field("ตำแหน่ง", data.position)}</p><p class="receipt-field-row">${field("หน่วยงาน", data.unit)}</p><p>ขอรับรองว่ารายจ่ายข้างต้นนี้ ไม่อาจเรียกใบเสร็จรับเงินจากผู้รับเงินได้และข้าพเจ้าได้จ่ายเงินในการดำเนินการอย่างโดยแท้จริง</p></div><div class="certificate-sign">${sign(data.person, `วันที่ ${esc(receiptDate(data.date))}`)}${club ? sign(data.advisor, "อาจารย์ที่ปรึกษา") : ""}</div>` : sign(data.person, "ผู้รับเงิน") + sign(data.payer, "ผู้จ่ายเงิน") + (club ? sign(data.advisor, "อาจารย์ที่ปรึกษา") : "")}</div></main></div>
    <script src="${esc(new URL('js/features/project/receipt-pagination.js', baseURI).href)}"></script>
    <script>
    ${receiptBahtText.toString()}
    function layoutReceiptFields() {
      document.querySelectorAll('.unit').forEach(unit => {
        unit.classList.remove('unit-wide');
        if (unit.querySelector('.fill').getBoundingClientRect().height > parseFloat(getComputedStyle(unit).lineHeight) * 1.5) unit.classList.add('unit-wide');
      });
      document.querySelectorAll('.fill').forEach(field => {
        field.querySelector('.fill-rules')?.remove();
        const height = parseFloat(getComputedStyle(field).lineHeight);
        const count = Math.max(1, Math.round(field.clientHeight / height));
        const rules = document.createElement('span');
        rules.className = 'fill-rules pdf-no-segment';
        rules.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < count; i++) {
          const rule = document.createElement('span');
          rule.className = 'fill-rule';
          rule.style.height = height + 'px';
          rules.appendChild(rule);
        }
        field.appendChild(rules);
      });
    }
    window.addEventListener('load', async () => {
      const button = document.getElementById('receiptPrint');
      try {
        const fonts = await Promise.all([document.fonts.load('16pt ReceiptThai'), document.fonts.load('bold 16pt ReceiptThai')]);
        if (fonts.some(result => !result.length)) throw new Error('font');
        // Resolve long unit headers before measuring the available table area.
        layoutReceiptFields();
        document.querySelectorAll('.fill-rules').forEach(rule => rule.remove());
        paginateReceiptDocument();
        layoutReceiptFields();
        const dialog = document.getElementById('receiptPrintDialog');
        document.getElementById('receiptPrintCancel').onclick = () => dialog.close();
        document.getElementById('receiptPrintClose').onclick = () => dialog.close();
        document.getElementById('receiptPrintConfirm').onclick = () => {
          dialog.close();
          window.print();
        };
        button.disabled = false;
        button.textContent = 'พิมพ์ / บันทึก PDF';
        button.onclick = () => dialog.showModal();
      } catch (error) { document.getElementById('receiptPrintStatus').textContent = error.message === 'font' ? 'โหลดฟอนต์ไม่สำเร็จ กรุณาปิดแล้วเปิดตัวอย่างอีกครั้ง' : 'เตรียมเอกสารไม่สำเร็จ: ' + error.message; }
    });</script></body></html>`;
}
