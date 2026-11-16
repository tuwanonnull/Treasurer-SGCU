  const projectWeekdays = [[1, "จันทร์"], [2, "อังคาร"], [3, "พุธ"], [4, "พฤหัส"], [5, "ศุกร์"], [6, "เสาร์"], [0, "อาทิตย์"]];
  let editingBorrowProjectId = "";
  const setBorrowProjectEditor = (project = null) => {
    const form = document.getElementById("staffBorrowProjectForm");
    if (!form || form.dataset.saving === "true") return;
    editingBorrowProjectId = project?.id || "";
    const editing = !!project;
    document.getElementById("borrowProjectCreateTitle").textContent = editing ? "แก้ไขโครงการ" : "เปิดใช้งานโครงการ";
    document.getElementById("borrowProjectEditorHint").textContent = editing ? "แก้ไขช่วงเปิดรับคำขอและวันรับพัสดุ แล้วกดบันทึก" : "เลือกปีการศึกษาและรหัสโครงการที่ต้องการ";
    const year = document.getElementById("staffBorrowProjectYear");
    year.value = project?.academicYear || getBorrowAcademicYearBE();
    year.disabled = editing;
    const source = document.getElementById("staffBorrowProjectSource");
    source.disabled = editing;
    document.getElementById("staffBorrowProjectSync").disabled = editing;
    document.getElementById("borrowProjectSortHint").hidden = editing;
    const name = document.getElementById("staffBorrowProjectName");
    name.value = "";
    name.required = false;
    name.closest(".borrow-form-field").hidden = true;
    if (editing) {
      source.innerHTML = `<option value="editing">${safeEscape(borrowProjectDisplayCode(project))}</option>`;
      document.getElementById("staffBorrowProjectNameDisplay").textContent = project.name;
    } else {
      source.value = "";
      renderStaffBorrowProjectOptions();
    }
    document.getElementById("staffBorrowProjectFrom").value = project?.from || "";
    document.getElementById("staffBorrowProjectTo").value = project?.to || "";
    document.getElementById("staffBorrowProjectWeekdays").innerHTML = renderProjectWeekdays(project || {});
    form.querySelector('button[type="submit"]').textContent = editing ? "บันทึกการแก้ไข" : "เปิดใช้งานโครงการ";
    document.getElementById("staffBorrowProjectCancelEdit").hidden = !editing;
    document.getElementById("borrowProjectSubmitHint").hidden = editing;
    document.querySelectorAll("[data-borrow-project-card]").forEach(card => {
      const selected = card.dataset.borrowProjectCard === editingBorrowProjectId;
      card.classList.toggle("is-editing", selected);
      card.querySelector("[data-borrow-project-edit]")?.setAttribute("aria-pressed", String(selected));
    });
  };
  const renderProjectWeekdays = (project = {}) => `
    <div class="borrow-project-full borrow-project-weekdays">
      <label class="borrow-weekdays-toggle">
        <span class="borrow-weekdays-copy"><strong>กำหนดวันรับเฉพาะโครงการ</strong><span>ปิดเพื่อใช้วันรับส่วนกลาง</span></span>
        <input type="checkbox" role="switch" name="customWeekdays" ${project.customWeekdays ? "checked" : ""} />
      </label>
      <div class="borrow-weekdays-fields" ${project.customWeekdays ? "" : "hidden"}>
        ${[["pickupDays", "วันที่รับพัสดุได้"]].map(([key, title]) => `
          <fieldset><legend>${title}</legend><div class="settings-weekday-grid">${projectWeekdays.map(([day, label]) => `<label><input type="checkbox" name="${key}" value="${day}" ${(project[key] || [0,1,2,3,4,5,6]).includes(day) ? "checked" : ""} /> ${label}</label>`).join("")}</div></fieldset>`).join("")}
      </div>
    </div>`;
  const readProjectWeekdays = (form) => {
    const customWeekdays = !!form.querySelector('[name="customWeekdays"]')?.checked;
    const read = key => Array.from(form.querySelectorAll(`[name="${key}"]:checked`)).map(input => Number(input.value));
    const pickupDays = read("pickupDays");
    if (customWeekdays && !pickupDays.length) throw new Error("เลือกวันรับพัสดุอย่างน้อย 1 วัน");
    return { customWeekdays, pickupDays };
  };
  const projectDateAllowed = (project, key, date) => !project?.customWeekdays ||
    (Array.isArray(project[key]) && project[key].includes(new Date(`${date}T00:00:00Z`).getUTCDay()));

  const renderManagedBorrowProjectFilter = () => {
    if (!staffBorrowRequestProjectFilter) return;
    const current = staffBorrowRequestProjectFilter.value;
    const options = new Map(managedBorrowProjects.map(project => [project.id, `${borrowProjectDisplayCode(project)} (${project.academicYear})`]));
    borrowRequests.forEach(item => {
      if (item.borrowProjectId && !options.has(item.borrowProjectId)) options.set(item.borrowProjectId, item.borrowProjectName || item.borrowProjectId);
    });
    staffBorrowRequestProjectFilter.innerHTML = '<option value="all">ทุกโครงการ</option>' +
      Array.from(options, ([id, name]) => `<option value="${safeEscape(id)}">${safeEscape(name)}</option>`).join("");
    staffBorrowRequestProjectFilter.value = options.has(current) ? current : "all";
  };

  const borrowProjectDisplayCode = project =>
    String(project.sourceCode || project.code || "").trim() || `ยังไม่มีรหัส (${project.name || ""})`;

  const compareBorrowProjectCodes = (a, b) => {
    const left = String(a.sourceCode || a.code || "").trim();
    const right = String(b.sourceCode || b.code || "").trim();
    if (!left !== !right) return left ? -1 : 1;
    return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" }) ||
      String(a.name || "").localeCompare(String(b.name || ""), "th");
  };

  const isBorrowProjectMode = () =>
    borrowProjectName?.value === BORROW_PROJECT_ORG &&
    (!!document.getElementById("borrowModeProject")?.checked || !!borrowManagedProject?.value);

  const renderBorrowMode = () => {
    const projectMode = isBorrowProjectMode();
    const selector = document.getElementById("borrowProjectSelector");
    if (selector) selector.hidden = !projectMode;
    if (borrowManagedProject) {
      borrowManagedProject.required = projectMode;
      borrowManagedProject.disabled = !projectMode || !borrowCatalogReady;
    }
  };

  const borrowProjectWindowStatus = project => {
    const today = dayKeyBangkok(new Date());
    if (project.from && today < project.from) return { text: "ยังไม่ถึงวันเปิดรับ", tone: "upcoming" };
    if (project.to && today > project.to) return { text: "สิ้นสุดช่วงเปิดรับ", tone: "ended" };
    return { text: "เปิดรับคำขอ", tone: "open" };
  };

  const renderManagedBorrowProjects = () => {
    const show = borrowProjectName?.value === BORROW_PROJECT_ORG;
    const field = document.getElementById("borrowManagedProjectField");
    if (field) { field.hidden = !show; field.style.display = show ? "" : "none"; }
    if (borrowManagedProject) {
      const current = borrowManagedProject.value;
      const available = managedBorrowProjects.filter(project => project.active && project.academicYear === String(getBorrowAcademicYearBE())).sort(compareBorrowProjectCodes);
      borrowManagedProject.innerHTML = '<option value="">เลือกรหัสโครงการ</option>' + available.map(project =>
        `<option value="${safeEscape(project.id)}">${safeEscape(borrowProjectDisplayCode(project))}</option>`).join("");
      if (available.some(project => project.id === current)) borrowManagedProject.value = current;

      const message = document.getElementById("borrowManagedProjectMessage");
      if (message) message.textContent = !borrowCatalogReady ? "กำลังโหลดโครงการ…" : available.length ? "เรียงตามรหัสโครงการจากน้อยไปมาก" : "ยังไม่มีโครงการเปิดใช้งานในปีนี้ เลือกยืมในนามฝ่ายหรือติดต่อสตาฟ";
    }
    renderBorrowMode();
    populateBorrowProjectDeptOptions();
    const list = document.getElementById("staffBorrowProjectList");
    const activeProjects = managedBorrowProjects.filter(project => project.active).sort((a, b) => b.academicYear.localeCompare(a.academicYear) || compareBorrowProjectCodes(a, b));
    const count = document.getElementById("staffBorrowProjectsCount");
    if (count) count.textContent = `${activeProjects.length} โครงการเปิดใช้งาน`;
    if (list) list.innerHTML = activeProjects.length ? activeProjects.map(project => {
      const status = borrowProjectWindowStatus(project);
      return `
      <article class="borrow-project-card ${project.id === editingBorrowProjectId ? "is-editing" : ""}" data-borrow-project-card="${safeEscape(project.id)}">
        <div class="borrow-manager-card-top"><strong class="borrow-manager-code">${safeEscape(borrowProjectDisplayCode(project))}</strong><span class="borrow-manager-status" data-tone="${status.tone}">${status.text}</span></div>
        <h5 class="borrow-project-card-name">${safeEscape(project.name)}</h5>
        <p class="borrow-manager-card-meta">ปีการศึกษา ${safeEscape(project.academicYear)} · ${project.source === "project-status" ? "ProjectStatus" : "เพิ่มโดยสตาฟ"}</p>
        <div class="borrow-manager-period"><span>ช่วงเปิดรับคำขอ</span><strong>${project.from ? `${safeEscape(formatDate(project.from))} – ${safeEscape(formatDate(project.to))}` : "เปิดรับทุกวัน"}</strong></div>
        <div class="borrow-project-pickup-summary"><span>${project.customWeekdays ? "วันรับเฉพาะโครงการ" : "วันรับพัสดุ"}</span><strong>${project.customWeekdays ? projectWeekdays.filter(([day]) => (project.pickupDays || []).includes(day)).map(([, label]) => label).join(" / ") : "ใช้วันรับส่วนกลาง"}</strong></div>
        <button type="button" class="borrow-project-edit-link" data-borrow-project-edit="${safeEscape(project.id)}" aria-pressed="${project.id === editingBorrowProjectId}" aria-label="แก้ไขโครงการ ${safeEscape(borrowProjectDisplayCode(project))}">แก้ไขโครงการ <span aria-hidden="true">→</span></button>
        <div class="borrow-manager-card-footer"><span>ประวัติคำขอยืมคืนยังคงอยู่</span><div class="borrow-manager-card-actions"><button type="button" class="btn-ghost" data-borrow-project-toggle="${safeEscape(project.id)}" aria-label="ปิดใช้งาน ${safeEscape(borrowProjectDisplayCode(project))}">ปิดใช้งาน</button><button type="button" class="btn-ghost" data-borrow-project-delete="${safeEscape(project.id)}" aria-label="ลบโครงการ ${safeEscape(borrowProjectDisplayCode(project))}">ลบโครงการ</button></div></div>
      </article>`;
    }).join("") : renderListEmptyState("ยังไม่มีโครงการที่เปิดใช้งาน", "เลือกรหัสโครงการและช่วงวันที่ แล้วกด “เปิดใช้งานโครงการ” เพื่อเริ่มรับคำขอ", "box");
    renderManagedBorrowProjectFilter();
    renderStaffBorrowProjectOptions();
    renderBorrowSubmissionWindow();
  };

  const renderBorrowSubmissionWindow = () => {
    updateBorrowPickupDateRule();
    const message = document.getElementById("borrowSubmissionWindowMessage");
    const project = borrowProjectName?.value === BORROW_PROJECT_ORG
      ? managedBorrowProjects.find(item => item.id === borrowManagedProject?.value) : null;
    const summary = document.getElementById("borrowSelectedProjectSummary");
    if (summary) summary.hidden = !project;
    const nameDisplay = document.getElementById("borrowManagedProjectNameDisplay");
    if (nameDisplay) nameDisplay.textContent = project?.name || "เลือกรหัสโครงการเพื่อดูชื่อโครงการ";
    if (message) message.textContent = !project ? "" : project.from
      ? `โครงการ ${borrowProjectDisplayCode(project)}: เปิดรับคำขอ ${formatDate(project.from)} ถึง ${formatDate(project.to)} (เวลาไทย)`
      : `โครงการ ${borrowProjectDisplayCode(project)}: เปิดรับคำขอทุกวัน`;
  };

  const subscribeBorrowCatalog = () => {
    const sequence = ++borrowCatalogSequence;
    borrowCatalogUnsubscribes.forEach(unsubscribe => unsubscribe());
    borrowCatalogUnsubscribes = [];
    borrowCatalogReady = false;
    managedBorrowProjects = [];
    renderManagedBorrowProjects();
    renderBorrowSubmissionWindow();
    if (!resolveFirestoreBridge() || !readCurrentUserEmail()) return;
    let projectsReady = false;
    const refresh = () => {
      borrowCatalogReady = projectsReady;
      renderManagedBorrowProjects();
      renderBorrowSubmissionWindow();
    };
    const failed = (error) => {
      if (sequence !== borrowCatalogSequence) return;
      projectsReady = false;
      borrowCatalogReady = false;
      renderManagedBorrowProjects();
      setBorrowMessage("โหลดโครงการหรือช่วงเปิดรับคำขอไม่สำเร็จ กรุณารีเฟรชหน้า", "#b91c1c");
      const message = document.getElementById("staffBorrowProjectMessage");
      if (message) message.textContent = "โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อและสิทธิ์";
      console.error("borrow catalog load failed", error);
    };
    borrowCatalogUnsubscribes.push(firestore.onSnapshot(firestore.collection(firestore.db, "borrowProjects"), snap => {
      if (sequence !== borrowCatalogSequence) return;
      managedBorrowProjects = snap.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => b.academicYear.localeCompare(a.academicYear) || a.name.localeCompare(b.name, "th"));
      projectsReady = true;
      refresh();
    }, failed));
  };

  let projectStatusOptions = [];
  let projectStatusOptionsYear = "";
  let dropdownBorrowProjects = [];
  const renderStaffBorrowProjectOptions = () => {
    if (editingBorrowProjectId) return;
    const select = document.getElementById("staffBorrowProjectSource");
    if (!select) return;
    const year = document.getElementById("staffBorrowProjectYear")?.value || getBorrowAcademicYearBE();
    const previous = select.value !== "" ? dropdownBorrowProjects[Number(select.value)] : null;
    const wasManual = select.value === "__manual__";
    const existing = managedBorrowProjects.filter(item => item.academicYear === year);
    dropdownBorrowProjects = existing.filter(item => !item.active).map(item => ({ ...item, existingId: item.id }));
    if (projectStatusOptionsYear === year) {
      projectStatusOptions.forEach(item => {
        if (!existing.some(project => normalizeBorrowProjectName(project.name) === normalizeBorrowProjectName(item.name))) dropdownBorrowProjects.push(item);
      });
    }
    dropdownBorrowProjects.sort(compareBorrowProjectCodes);
    select.innerHTML = '<option value="">เลือกโครงการที่ต้องการเปิด</option>' + dropdownBorrowProjects.map((item, index) =>
      `<option value="${index}">${safeEscape(borrowProjectDisplayCode(item))}</option>`).join("") + '<option value="__manual__">เพิ่มโครงการที่ไม่มีในรายการ</option>';
    const index = previous ? dropdownBorrowProjects.findIndex(item => item.name === previous.name) : -1;
    select.value = wasManual ? "__manual__" : index >= 0 ? String(index) : "";
    renderStaffBorrowProjectName();
  };
  const renderStaffBorrowProjectName = () => {
    if (editingBorrowProjectId) return;
    const value = document.getElementById("staffBorrowProjectSource")?.value || "";
    const selected = value !== "" ? dropdownBorrowProjects[Number(value)] : null;
    const display = document.getElementById("staffBorrowProjectNameDisplay");
    if (display) display.textContent = value === "__manual__" ? "กรอกชื่อโครงการใหม่ด้านล่าง" : selected?.name || "เลือกรหัสโครงการเพื่อดูชื่อโครงการ";
    const nameInput = document.getElementById("staffBorrowProjectName");
    if (nameInput?.closest) {
      nameInput.closest(".borrow-form-field").hidden = value !== "__manual__";
      nameInput.required = value === "__manual__";
    }
  };
  const normalizeBorrowProjectName = value => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("th");
  const loadBorrowProjectOptions = async year => {
    const rows = await loadBorrowProjectsFromProjectStatus(year);
    return rows.filter(project => project.orgGroup === BORROW_PROJECT_ORG && project.name?.trim());
  };
  const refreshBorrowProjectStatus = async () => {
    const year = document.getElementById("staffBorrowProjectYear").value;
    const select = document.getElementById("staffBorrowProjectSource");
    const message = document.getElementById("staffBorrowProjectMessage");
    const button = document.getElementById("staffBorrowProjectSync");
    button.disabled = true;
    button.textContent = "กำลังโหลด…";
    try {
      const items = await loadBorrowProjectOptions(year);
      if (document.getElementById("staffBorrowProjectYear").value !== year) return;
      projectStatusOptions = items;
      projectStatusOptionsYear = year;
      renderStaffBorrowProjectOptions();
      message.textContent = "เลือกโครงการจาก dropdown แล้วกดเปิดใช้งานโครงการ";
    } catch (error) { message.textContent = "โหลด ProjectStatus ไม่สำเร็จ กรุณาลองใหม่"; }
    finally { button.disabled = !!editingBorrowProjectId; button.textContent = "โหลดจาก ProjectStatus"; }
  };
  const borrowProjectDatePatch = (from, to) => {
    if ((from || to) && (!parseDateYmd(from) || !parseDateYmd(to) || from > to)) {
      throw new Error("กรุณาระบุวันเริ่มต้นและวันสิ้นสุดให้ครบ โดยวันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น");
    }
    return { from, to, opensAt: from ? new Date(`${from}T00:00:00+07:00`) : null,
      closesAt: to ? new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86400000) : null };
  };
  const addSelectedBorrowProject = async (academicYear, selected, manualName, datePatch) => {
    if (selected?.existingId) {
      const ref = firestore.doc(firestore.db, "borrowProjects", selected.existingId);
      await firestore.runTransaction(firestore.db, async transaction => {
        const snap = await transaction.get(ref);
        if (!snap.exists() || snap.data().academicYear !== academicYear) throw new Error("ไม่พบโครงการในปีการศึกษานี้");
        if (snap.data().active) throw new Error("โครงการนี้เปิดใช้งานแล้ว");
        transaction.update(ref, { active: true, ...datePatch, updatedAt: firestore.serverTimestamp(), updatedBy: readCurrentUserEmail() });
      });
      return;
    }
    const source = await loadBorrowProjectOptions(academicYear);
    const project = selected ? source.find(item => item.code === selected.code && item.name === selected.name) : null;
    if (selected && !project) throw new Error("ไม่พบโครงการที่เลือกใน ProjectStatus กรุณาโหลดตัวเลือกใหม่");
    const name = (project?.name || manualName || "").trim();
    if (!name) throw new Error("กรุณาเลือกโครงการหรือระบุชื่อโครงการ");
    if (!project && source.some(item => normalizeBorrowProjectName(item.name) === normalizeBorrowProjectName(name))) {
      throw new Error("โครงการนี้มีใน ProjectStatus กรุณาโหลดตัวเลือกและเลือกโครงการนั้น");
    }
    const existing = await firestore.getDocs(firestore.collection(firestore.db, "borrowProjects"));
    if (existing.docs.some(doc => doc.data().academicYear === academicYear && normalizeBorrowProjectName(doc.data().name) === normalizeBorrowProjectName(name))) {
      throw new Error("เพิ่มโครงการนี้แล้ว สามารถปรับช่วงวันที่หรือเปิดรับอีกครั้งในรายการด้านล่าง");
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${academicYear}:${normalizeBorrowProjectName(name)}`));
    const id = `selected-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
    const ref = firestore.doc(firestore.db, "borrowProjects", id);
    await firestore.runTransaction(firestore.db, async transaction => {
      if ((await transaction.get(ref)).exists()) throw new Error("เพิ่มโครงการนี้แล้ว");
      transaction.set(ref, { name, academicYear, orgGroup: BORROW_PROJECT_ORG, active: true,
        source: project ? "project-status" : "manual", sourceCode: project?.code || "", ...datePatch,
        updatedAt: firestore.serverTimestamp(), updatedBy: readCurrentUserEmail() });
    });
  };

  let borrowProjectDeleteDialogOpen = false;
  const confirmBorrowProjectDelete = (project) => {
    if (borrowProjectDeleteDialogOpen) return Promise.resolve(false);
    borrowProjectDeleteDialogOpen = true;
    const previousFocus = document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.className = "borrow-project-delete-dialog";
    dialog.setAttribute("aria-labelledby", "borrowProjectDeleteTitle");
    dialog.setAttribute("aria-describedby", "borrowProjectDeleteDescription");
    dialog.innerHTML = `
      <div class="borrow-project-delete-heading">
        <span class="borrow-project-delete-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5"/></svg></span>
        <button type="button" class="modal-close" data-project-delete-cancel aria-label="ปิด">×</button>
      </div>
      <h3 id="borrowProjectDeleteTitle">ลบโครงการนี้?</h3>
      <p id="borrowProjectDeleteDescription">โครงการจะถูกลบถาวรจากระบบยืมพัสดุ</p>
      <div class="borrow-project-delete-target"><strong>${safeEscape(borrowProjectDisplayCode(project))}</strong><span>${safeEscape(project.name)}</span><small>ปีการศึกษา ${safeEscape(project.academicYear)}</small></div>
      <p class="borrow-project-delete-history">คำขอยืมคืนเดิมและประวัติยังคงอยู่</p>
      <div class="borrow-project-delete-actions">
        <button type="button" class="btn-ghost" data-project-delete-cancel autofocus>ยกเลิก</button>
        <button type="button" class="btn-primary" data-project-delete-confirm>ยืนยันลบโครงการ</button>
      </div>`;
    document.body.appendChild(dialog);
    return new Promise(resolve => {
      let confirmed = false;
      const close = () => dialog.close();
      dialog.querySelectorAll("[data-project-delete-cancel]").forEach(button => button.addEventListener("click", close));
      dialog.querySelector("[data-project-delete-confirm]").addEventListener("click", () => { confirmed = true; close(); });
      dialog.addEventListener("click", event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      });
      dialog.addEventListener("close", () => {
        dialog.remove();
        borrowProjectDeleteDialogOpen = false;
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        resolve(confirmed);
      }, { once: true });
      dialog.showModal();
    });
  };

  const bindBorrowCatalogManagement = () => {
    const yearInput = document.getElementById("staffBorrowProjectYear");
    if (yearInput) yearInput.value = getBorrowAcademicYearBE();
    document.getElementById("staffBorrowProjectSync")?.addEventListener("click", () => void refreshBorrowProjectStatus());
    const projectForm = document.getElementById("staffBorrowProjectForm");
    const weekdaysCreate = document.getElementById("staffBorrowProjectWeekdays");
    if (weekdaysCreate) weekdaysCreate.innerHTML = renderProjectWeekdays();
    document.getElementById("staffBorrowSettings")?.addEventListener("change", event => {
      if (event.target.name !== "customWeekdays") return;
      event.target.closest(".borrow-project-weekdays").querySelector(".borrow-weekdays-fields").hidden = !event.target.checked;
    });
    projectForm?.addEventListener("submit", async event => {
      event.preventDefault();
      if (projectForm.dataset.saving === "true" || !ensureStaffPermission() || !projectForm.reportValidity()) return;
      const nameInput = document.getElementById("staffBorrowProjectName");
      const name = nameInput.value.trim();
      const academicYear = yearInput.value;
      const message = document.getElementById("staffBorrowProjectMessage");
      const button = projectForm.querySelector('button[type="submit"]');
      button.disabled = true;
      projectForm.dataset.saving = "true";
      try {
        if (editingBorrowProjectId) {
          const project = managedBorrowProjects.find(item => item.id === editingBorrowProjectId && item.active);
          if (!project) throw new Error("โครงการนี้ถูกลบหรือปิดใช้งานแล้ว กรุณายกเลิกการแก้ไข");
          const dates = borrowProjectDatePatch(document.getElementById("staffBorrowProjectFrom").value, document.getElementById("staffBorrowProjectTo").value);
          await firestore.updateDoc(firestore.doc(firestore.db, "borrowProjects", project.id), {
            ...dates, ...readProjectWeekdays(projectForm), updatedAt: firestore.serverTimestamp(), updatedBy: readCurrentUserEmail()
          });
          projectForm.dataset.saving = "false";
          setBorrowProjectEditor();
          message.textContent = "บันทึกการแก้ไขโครงการแล้ว";
          return;
        }
        const sourceValue = document.getElementById("staffBorrowProjectSource").value;
        if (!sourceValue) throw new Error("กรุณาเลือกโครงการจาก dropdown");
        const selected = sourceValue === "__manual__" ? null : dropdownBorrowProjects[Number(sourceValue)];
        if (sourceValue !== "__manual__" && !selected) throw new Error("กรุณาเลือกโครงการใหม่");
        const dates = borrowProjectDatePatch(document.getElementById("staffBorrowProjectFrom").value, document.getElementById("staffBorrowProjectTo").value);
        await addSelectedBorrowProject(academicYear, selected, name, { ...dates, ...readProjectWeekdays(projectForm) });
        nameInput.value = "";
        document.getElementById("staffBorrowProjectSource").value = "";
        renderStaffBorrowProjectName();
        message.textContent = "เปิดใช้งานเฉพาะโครงการที่เลือกแล้ว";
      } catch (error) { message.textContent = error.message || "เพิ่มโครงการไม่สำเร็จ กรุณาลองใหม่"; }
      finally { button.disabled = false; projectForm.dataset.saving = "false"; }
    });
    document.getElementById("staffBorrowProjectCancelEdit")?.addEventListener("click", () => {
      setBorrowProjectEditor();
    });
    document.getElementById("staffBorrowProjectList")?.addEventListener("click", async event => {
      if (projectForm?.dataset.saving === "true") return;
      const action = event.target.closest("[data-borrow-project-toggle], [data-borrow-project-delete]");
      const card = event.target.closest("[data-borrow-project-card]");
      if (!action && card && ensureStaffPermission()) {
        const project = managedBorrowProjects.find(item => item.id === card.dataset.borrowProjectCard);
        if (!project) return;
        setBorrowProjectEditor(project);
        if (window.matchMedia("(max-width: 1000px)").matches) {
          projectForm.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        }
        document.getElementById("staffBorrowProjectFrom")?.focus({ preventScroll: true });
        return;
      }
      const button = event.target.closest("[data-borrow-project-toggle], [data-borrow-project-delete]");
      if (!button || !ensureStaffPermission()) return;
      const deleting = !!button.dataset.borrowProjectDelete;
      const project = managedBorrowProjects.find(item => item.id === (button.dataset.borrowProjectDelete || button.dataset.borrowProjectToggle));
      if (!project) return;
      if (deleting && !await confirmBorrowProjectDelete(project)) return;
      button.disabled = true;
      const message = document.getElementById("staffBorrowProjectMessage");
      try {
        const ref = firestore.doc(firestore.db, "borrowProjects", project.id);
        if (deleting) {
          await firestore.deleteDoc(ref);
          message.textContent = "ลบโครงการออกจากฐานข้อมูลแล้ว ประวัติคำขอยืมคืนยังคงอยู่";
        } else {
          await firestore.updateDoc(ref, {
            active: !project.active, updatedAt: firestore.serverTimestamp(), updatedBy: readCurrentUserEmail()
          });
          message.textContent = project.active ? "นำโครงการออกจากตัวเลือกแล้ว ประวัติการยืมเดิมยังคงอยู่" : "เปิดรับคำขอโครงการแล้ว";
        }
        if (editingBorrowProjectId === project.id) setBorrowProjectEditor();
      } catch (error) { message.textContent = "แก้ไขโครงการไม่สำเร็จ กรุณาลองใหม่"; }
      finally { button.disabled = false; }
    });
    yearInput?.addEventListener("change", () => {
      projectStatusOptions = [];
      projectStatusOptionsYear = "";
      renderStaffBorrowProjectOptions();
      void refreshBorrowProjectStatus();
    });
    const sourceSelect = document.getElementById("staffBorrowProjectSource");
    const nameInput = document.getElementById("staffBorrowProjectName");
    sourceSelect?.addEventListener("change", () => {
      renderStaffBorrowProjectName();
      const manual = sourceSelect.value === "__manual__";
      nameInput.closest(".borrow-form-field").hidden = !manual;
      nameInput.required = manual;
      const selected = sourceSelect.value !== "" ? dropdownBorrowProjects[Number(sourceSelect.value)] : null;
      document.getElementById("staffBorrowProjectFrom").value = selected?.from || "";
      document.getElementById("staffBorrowProjectTo").value = selected?.to || "";
      if (weekdaysCreate) weekdaysCreate.innerHTML = renderProjectWeekdays(selected || {});
    });
    sourceSelect?.addEventListener("focus", () => {
      if (projectStatusOptionsYear !== yearInput.value) void refreshBorrowProjectStatus();
    });
    ["borrowModeDepartment", "borrowModeProject"].forEach(id => {
      document.getElementById(id)?.addEventListener("change", () => {
        if (document.getElementById("borrowModeDepartment")?.checked && borrowManagedProject) borrowManagedProject.value = "";
        renderBorrowMode();
        populateBorrowProjectDeptOptions();
        renderBorrowSubmissionWindow();
      });
    });
    borrowManagedProject?.addEventListener("change", () => {
      renderBorrowMode();
      populateBorrowProjectDeptOptions();
      renderBorrowSubmissionWindow();
    });
  };

