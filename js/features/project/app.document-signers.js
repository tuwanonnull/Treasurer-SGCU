/* Staff settings: document signers by academic year */
(function initDocumentSignerSettings() {
  const form = document.getElementById("documentSignerSettingsForm");
  const yearInput = document.getElementById("documentSignerAcademicYear");
  const viceRectorInput = document.getElementById("documentSignerViceRectorName");
  const treasurerInput = document.getElementById("documentSignerTreasurerName");
  const treasurerPhoneInput = document.getElementById("documentSignerTreasurerPhone");
  const presidentInput = document.getElementById("documentSignerPresidentName");
  const saveButton = document.getElementById("documentSignerSaveBtn");
  const message = document.getElementById("documentSignerSettingsMessage");
  if (!form || !yearInput || !viceRectorInput || !treasurerInput || !treasurerPhoneInput || !presidentInput || !saveButton || !message) return;

  const defaults = {
    treasurerName: "นายธุวานนท์ กิ้มเฉี้ยง",
    treasurerPhone: "094-969-6495",
    presidentName: "นางสาวเกวลี เอกโยคยะ",
    viceRectorName: "รองศาสตราจารย์ ดร.สุกัญญา สมไพบูลย์",
    approvalMeetingBody: "สภานิสิต"
  };

  const getAcademicYear = () => {
    const now = new Date();
    const academicYearCE = now.getMonth() + 1 >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return String(academicYearCE + 543);
  };

  const getRows = () => globalThis.SGCU_APP_CONFIG?.documents?.signersByAcademicYear || {};

  const syncMeetingToggle = () => {
    form.querySelectorAll('input[name="documentApprovalMeetingBody"]').forEach((input) => {
      input.closest("label")?.classList.toggle("is-active", input.checked);
    });
  };

  const showMessage = (text, color = "#6b7280") => {
    message.textContent = text;
    message.style.color = color;
  };

  const fillYear = () => {
    const year = yearInput.value.trim();
    const row = getRows()[year] || {};
    viceRectorInput.value = row.viceRectorName || defaults.viceRectorName;
    treasurerInput.value = row.treasurerName || defaults.treasurerName;
    treasurerPhoneInput.value = row.treasurerPhone || defaults.treasurerPhone;
    presidentInput.value = row.presidentName || defaults.presidentName;
    const meetingBody = row.approvalMeetingBody || defaults.approvalMeetingBody;
    const meetingInput = form.querySelector(`input[name="documentApprovalMeetingBody"][value="${meetingBody}"]`);
    if (meetingInput) meetingInput.checked = true;
    syncMeetingToggle();
    showMessage(row.treasurerName || row.presidentName ? `กำลังแสดงข้อมูลปีการศึกษา ${year}` : `ยังไม่มีข้อมูลปี ${year} ระบบแสดงค่าตั้งต้น`);
  };

  const loadSettings = async () => {
    showMessage("กำลังโหลดการตั้งค่า...", "#1d4ed8");
    try {
      await Promise.resolve(window.sgcuRuntimeConfigReady);
      if (typeof window.sgcuRuntimeConfig?.loadRemoteConfig === "function") {
        await window.sgcuRuntimeConfig.loadRemoteConfig();
      }
      fillYear();
    } catch (error) {
      console.error("document signer settings load failed", error);
      fillYear();
      showMessage("โหลดข้อมูลที่บันทึกไว้ไม่สำเร็จ ระบบแสดงค่าตั้งต้น", "#b45309");
    }
  };

  const save = async (event) => {
    event.preventDefault();
    const year = yearInput.value.trim();
    const viceRectorName = viceRectorInput.value.trim();
    const treasurerName = treasurerInput.value.trim();
    const treasurerPhone = treasurerPhoneInput.value.trim();
    const presidentName = presidentInput.value.trim();
    const approvalMeetingBody = form.querySelector('input[name="documentApprovalMeetingBody"]:checked')?.value || defaults.approvalMeetingBody;
    if (!/^\d{4}$/.test(year) || !viceRectorName || !treasurerName || !treasurerPhone || !presidentName) {
      showMessage("กรุณากรอกปีการศึกษา ชื่อรองอธิการบดี ผู้ลงนาม และเบอร์โทรเหรัญญิกให้ครบ", "#b91c1c");
      return;
    }

    const store = window.sgcuFirestore || {};
    if (!store.db || !store.doc || !store.setDoc || !store.serverTimestamp) {
      showMessage("ระบบฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่อีกครั้ง", "#b91c1c");
      return;
    }

    saveButton.disabled = true;
    showMessage("กำลังบันทึก...", "#1d4ed8");
    try {
      const nextRows = {
        ...getRows(),
        [year]: { viceRectorName, treasurerName, treasurerPhone, presidentName, approvalMeetingBody }
      };
      await store.setDoc(
        store.doc(store.db, "appSettings", "global"),
        {
          enabled: true,
          config: { documents: { signersByAcademicYear: nextRows } },
          updatedAt: store.serverTimestamp()
        },
        { merge: true }
      );
      window.sgcuRuntimeConfig?.applyConfig?.({
        documents: { signersByAcademicYear: nextRows }
      });
      if (!globalThis.SGCU_APP_CONFIG.documents) globalThis.SGCU_APP_CONFIG.documents = {};
      globalThis.SGCU_APP_CONFIG.documents.signersByAcademicYear = nextRows;
      showMessage(`บันทึกการตั้งค่าเอกสารปีการศึกษา ${year} เรียบร้อย`, "#047857");
    } catch (error) {
      console.error("document signer settings save failed", error);
      showMessage("บันทึกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์หัวหน้าสตาฟ", "#b91c1c");
    } finally {
      saveButton.disabled = false;
    }
  };

  yearInput.value = getAcademicYear();
  yearInput.addEventListener("change", fillYear);
  form.querySelectorAll('input[name="documentApprovalMeetingBody"]').forEach((input) => {
    input.addEventListener("change", syncMeetingToggle);
  });
  form.addEventListener("submit", save);
  void loadSettings();
})();
