  const refreshLocalStaffCache = (email, profile) => {
    const normalizedEmail = (email || "").toString().trim().toLowerCase();
    if (!normalizedEmail) return;

    if (typeof staffEmails !== "undefined" && staffEmails instanceof Set) {
      staffEmails.add(normalizedEmail);
    }
    if (typeof staffProfilesByEmail !== "undefined" && staffProfilesByEmail && typeof staffProfilesByEmail === "object") {
      const normalizedPositions = normalizePositionsArray(profile?.positions || []);
      const primary = normalizedPositions[0] || null;
      staffProfilesByEmail[normalizedEmail] = {
        position: normalizePositionText(profile?.position || primary?.name || ""),
        nick: (profile?.nick || "").toString().trim(),
        role: normalizeRoleCode(profile?.role || ""),
        divisionCodeYY: normalizeCode2(profile?.divisionCodeYY || profile?.positionCodeYY || primary?.yy || ""),
        positionCodeYY: normalizeCode2(profile?.positionCodeYY || profile?.divisionCodeYY || primary?.yy || ""),
        positionCode: (profile?.positionCode || primary?.code || "").toString().trim(),
        allowedPages: normalizeAllowedPages(readAllowedPagesInput(profile || {}), profile?.divisionCodeYY || profile?.positionCodeYY || primary?.yy || ""),
        positions: normalizedPositions
      };
    }

    if (typeof refreshAuthDisplayFn === "function") {
      const user = readCurrentUser();
      if (user) refreshAuthDisplayFn(user);
    }
  };

  const clearLocalStaffCache = (email) => {
    const normalizedEmail = (email || "").toString().trim().toLowerCase();
    if (!normalizedEmail) return;

    if (typeof staffEmails !== "undefined" && staffEmails instanceof Set) {
      staffEmails.delete(normalizedEmail);
    }
    if (typeof staffProfilesByEmail !== "undefined" && staffProfilesByEmail && typeof staffProfilesByEmail === "object") {
      delete staffProfilesByEmail[normalizedEmail];
    }

    if (typeof refreshAuthDisplayFn === "function") {
      const user = readCurrentUser();
      if (user) refreshAuthDisplayFn(user);
    }
  };

  const ensurePositionExists = async (positionName, actor, codeMeta = {}) => {
    const safeName = normalizePositionText(positionName);
    if (!safeName || !resolveStore()) return;
    const docId = slugifyPosition(safeName);
    const catalogMeta = findPositionMetaByName(safeName);
    const yyFromMeta = normalizeCode2(codeMeta.divisionCodeYY || "");
    const zzFromMeta = normalizeCode2(codeMeta.levelCodeZZ || "");
    const yyFromCatalog = normalizeCode2(catalogMeta?.divisionCodeYY || "");
    const zzFromCatalog = normalizeCode2(catalogMeta?.levelCodeZZ || "");
    const divisionCodeYY = isValidDivisionCodeYY(yyFromMeta)
      ? yyFromMeta
      : isValidDivisionCodeYY(yyFromCatalog)
        ? yyFromCatalog
        : resolveDivisionCodeYY(safeName);
    const levelCodeZZ = isValidLevelCodeZZ(zzFromMeta)
      ? zzFromMeta
      : isValidLevelCodeZZ(zzFromCatalog)
        ? zzFromCatalog
        : resolveLevelCodeZZ(safeName);
    const allowedPages = normalizeAllowedPages(
      codeMeta.allowedPages || catalogMeta?.allowedPages,
      divisionCodeYY
    );
    const divisionLabel = normalizePositionText(
      codeMeta.divisionLabel || catalogMeta?.divisionLabel || catalogMeta?.divisionName || divisionCodeLabel(divisionCodeYY)
    );
    const ref = firestore.doc(firestore.db, COLLECTION_POSITIONS, docId);
    await firestore.setDoc(
      ref,
      {
        name: safeName,
        divisionCodeYY,
        divisionLabel,
        levelCodeZZ,
        allowedPages,
        updatedAt: firestore.serverTimestamp(),
        updatedByEmail: (actor?.email || "").toString().trim().toLowerCase() || ""
      },
      { merge: true }
    );
  };

  const normalizeAuthAccessEmail = (value) => (value || "").toString().trim().toLowerCase();

  const toDateInputValue = (value) => {
    const date = typeof value?.toDate === "function" ? value.toDate() : value ? new Date(value) : null;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const readDateInput = (value) => {
    const text = (value || "").toString().trim();
    if (!text) return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const readAuthAccessStatus = (entry = {}) => {
    if (entry.status === "pending") return "รออนุมัติ";
    if (entry.status === "rejected") return "ปฏิเสธ";
    const nowMs = Date.now();
    const startsAt = typeof entry.startsAt?.toDate === "function" ? entry.startsAt.toDate() : new Date(entry.startsAt);
    const endsAt = typeof entry.endsAt?.toDate === "function" ? entry.endsAt.toDate() : new Date(entry.endsAt);
    if (entry.active !== true) return "ปิดสิทธิ์";
    if (startsAt instanceof Date && !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > nowMs) return "รอเริ่ม";
    if (endsAt instanceof Date && !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= nowMs) return "หมดอายุ";
    return "ใช้งานได้";
  };

  const getAuthAccessProfileName = (profile = {}) => {
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    return getMeaningfulProfileValue(profile.name, fullName, profile.displayName);
  };

  const renderAuthAccessProfileSummary = (profile = null) => {
    if (!profile) return '<span class="section-text-sm">ยังไม่พบโปรไฟล์ที่บันทึกไว้</span>';
    const academic = deriveAcademicProfile(profile, profile.email || "");
    const rowOne = [
      getAuthAccessProfileName(profile) || "",
      profile.nickname || profile.nick ? `ชื่อเล่น ${profile.nickname || profile.nick}` : "",
      academic.studentId ? `รหัสนิสิต ${academic.studentId}` : ""
    ].filter(Boolean);
    const rowTwo = [
      academic.faculty ? `คณะ ${academic.faculty}` : "",
      profile.phone ? `โทร ${profile.phone}` : "",
      profile.lineId ? `Line ${profile.lineId}` : ""
    ].filter(Boolean);
    const rows = [rowOne, rowTwo].filter((row) => row.length);
    return rows.length
      ? rows.map((row) => `<div>${row.map((line) => `<span>${escapeStaffHtml(line)}</span>`).join(" · ")}</div>`).join("")
      : '<span class="section-text-sm">พบโปรไฟล์ แต่ยังไม่มีรายละเอียดเพิ่มเติม</span>';
  };

  const findUserProfileByEmail = async (email) => {
    const normalizedEmail = normalizeAuthAccessEmail(email);
    if (!normalizedEmail || !resolveStore() || !firestore.getDocs || !firestore.collection || !firestore.query || !firestore.where) {
      return null;
    }
    const q = firestore.query(
      firestore.collection(firestore.db, COLLECTION_USER_PROFILES),
      firestore.where("email", "==", normalizedEmail),
      ...(firestore.limit ? [firestore.limit(1)] : [])
    );
    const snapshot = await firestore.getDocs(q);
    const docSnap = snapshot?.docs?.[0] || null;
    return docSnap ? { id: docSnap.id, ...(docSnap.data() || {}) } : null;
  };

  const refreshAuthAccessProfilePreview = async () => {
    const email = normalizeAuthAccessEmail(staffAuthAccessFields.email?.value || "");
    if (!staffAuthAccessProfilePreviewEl) return;
    const hasApplication = !document.getElementById("staffAuthAccessRequestInfo").hidden;
    staffAuthAccessProfilePreviewEl.hidden = hasApplication || !email;
    if (hasApplication) return;
    if (!email) {
      staffAuthAccessProfilePreviewEl.textContent = "กรอกอีเมลเพื่อดูข้อมูลโปรไฟล์ที่เคยบันทึกไว้";
      staffAuthAccessProfilePreviewEl.style.color = "var(--auth-preview-muted, #6b7280)";
      return;
    }
    staffAuthAccessProfilePreviewEl.textContent = "กำลังค้นหาโปรไฟล์...";
    staffAuthAccessProfilePreviewEl.style.color = "var(--auth-preview-info, #1d4ed8)";
    try {
      const profile = await findUserProfileByEmail(email);
      staffAuthAccessProfilePreviewEl.innerHTML = profile
        ? `พบโปรไฟล์: ${renderAuthAccessProfileSummary(profile)}`
        : "ยังไม่พบโปรไฟล์ ผู้ใช้จะสร้าง/บันทึกโปรไฟล์ได้หลังได้รับสิทธิ์และเข้าสู่ระบบ";
      staffAuthAccessProfilePreviewEl.style.color = profile ? "var(--auth-preview-success, #047857)" : "var(--auth-preview-warning, #b45309)";
    } catch (error) {
      console.warn("auth access profile preview failed - app.staff-access.js:6112", error);
      staffAuthAccessProfilePreviewEl.textContent = "ค้นหาโปรไฟล์ไม่สำเร็จ";
      staffAuthAccessProfilePreviewEl.style.color = "var(--auth-preview-error, #b91c1c)";
    }
  };

  let authAccessEditorSnapshot = "";
  let authAccessReturnFocus = null;
  let authAccessEditorClosing = false;
  let authAccessMutationBusy = false;
  const syncAuthAccessDecision = () => {
    const decision = document.getElementById("staffAuthAccessDecision");
    const reviewing = document.getElementById("staffAuthAccessDecisionField").dataset.reviewing === "true";
    decision.required = true;
    const rejecting = reviewing && decision.value === "rejected";
    const deleting = decision.value === "deleted";
    staffAuthAccessFields.reason.required = rejecting;
    document.getElementById("staffAuthAccessReasonLabel").textContent = rejecting ? "เหตุผลที่ปฏิเสธ" : "หมายเหตุ (ไม่บังคับ)";
    staffAuthAccessFields.reason.placeholder = rejecting ? "ระบุเหตุผลที่ปฏิเสธคำร้อง" : "ระบุเพิ่มเติมได้ (ไม่บังคับ)";
    document.getElementById("staffAuthAccessSubmitBtn").textContent = deleting ? "ลบรายการ" : rejecting ? "ยืนยันการปฏิเสธ" : decision.value === "approved" ? "อนุมัติสิทธิ์" : "บันทึกสิทธิ์";
    for (const input of [staffAuthAccessFields.startsAt, staffAuthAccessFields.endsAt]) {
      input.required = !rejecting && !deleting;
      input.disabled = rejecting || deleting;
      input.parentElement.hidden = rejecting || deleting;
    }
  };
  const runAuthAccessMutation = async action => {
    if (authAccessMutationBusy || authAccessEditorClosing) return;
    authAccessMutationBusy = true;
    const buttons = document.querySelectorAll("#staffAuthAccessEditor button");
    buttons.forEach(button => { button.disabled = true; });
    try { await action(); }
    finally { authAccessMutationBusy = false; buttons.forEach(button => { button.disabled = false; }); }
  };
  const readAuthAccessEditorSnapshot = () => JSON.stringify([...Object.values(staffAuthAccessFields).map(field => field?.value || ""), document.getElementById("staffAuthAccessDecision").value]);
  const openAuthAccessEditor = () => {
    const editor = document.getElementById("staffAuthAccessEditor");
    if (!editor || editor.open || authAccessEditorClosing) return;
    authAccessReturnFocus = document.activeElement;
    authAccessEditorSnapshot = readAuthAccessEditorSnapshot();
    editor.classList.remove("is-closing");
    editor.showModal();
    staffAuthAccessFields.email?.focus();
  };
  const closeAuthAccessEditor = (force = false) => {
    const editor = document.getElementById("staffAuthAccessEditor");
    if (!editor?.open || authAccessEditorClosing || (authAccessMutationBusy && !force)) return;
    if (!force && readAuthAccessEditorSnapshot() !== authAccessEditorSnapshot &&
      !window.confirm("มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดฟอร์มหรือไม่?")) return;
    authAccessEditorClosing = true;
    const finish = () => {
      editor.close();
      editor.classList.remove("is-closing");
      authAccessEditorClosing = false;
      authAccessReturnFocus?.focus();
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) finish();
    else { editor.classList.add("is-closing"); window.setTimeout(finish, 180); }
  };

  const resetAuthAccessForm = () => {
    const title = document.getElementById("staffAuthAccessEditorTitle");
    if (title) title.textContent = "เพิ่มสิทธิ์เข้าใช้ชั่วคราว";
    if (staffAuthAccessFields.id) staffAuthAccessFields.id.value = "";
    if (staffAuthAccessFields.email) { staffAuthAccessFields.email.value = ""; staffAuthAccessFields.email.readOnly = false; }
    document.getElementById("staffAuthAccessDecisionField").dataset.reviewing = "false";
    document.getElementById("staffAuthAccessDecision").innerHTML = '<option value="saved">บันทึกสิทธิ์</option>';
    syncAuthAccessDecision();
    document.getElementById("staffAuthAccessRequestInfo").hidden = true;
    document.getElementById("staffAuthAccessActiveField").hidden = false;
    document.getElementById("staffAuthAccessResetBtn").hidden = false;
    document.getElementById("staffAuthAccessSubmitBtn").textContent = "บันทึกสิทธิ์";
    if (staffAuthAccessFields.startsAt) staffAuthAccessFields.startsAt.value = toDateInputValue(new Date());
    if (staffAuthAccessFields.endsAt) staffAuthAccessFields.endsAt.value = toDateInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000));
    if (staffAuthAccessFields.active) staffAuthAccessFields.active.value = "true";
    if (staffAuthAccessFields.reason) staffAuthAccessFields.reason.value = "";
    if (staffAuthAccessDeleteBtnEl) staffAuthAccessDeleteBtnEl.hidden = true;
    setMessage(staffAuthAccessMessageEl, "");
    void refreshAuthAccessProfilePreview();
  };

  const fillAuthAccessForm = (entry = {}) => {
    const title = document.getElementById("staffAuthAccessEditorTitle");
    const pending = entry.status === "pending";
    if (title) title.textContent = pending ? "พิจารณาสิทธิ์เข้าใช้งาน" : "แก้ไขสิทธิ์เข้าใช้ชั่วคราว";
    staffAuthAccessFields.email.readOnly = true;
    document.getElementById("staffAuthAccessDecisionField").dataset.reviewing = String(pending);
    document.getElementById("staffAuthAccessDecision").innerHTML = (pending
      ? '<option value="">เลือกการดำเนินการ</option><option value="approved">อนุมัติสิทธิ์</option><option value="rejected">ปฏิเสธคำร้อง</option>'
      : '<option value="saved">บันทึกสิทธิ์</option>') + '<option value="deleted">ลบรายการ</option>';
    syncAuthAccessDecision();
    document.getElementById("staffAuthAccessSubmitBtn").textContent = pending ? "บันทึกผลพิจารณา" : "บันทึกสิทธิ์";
    const requestInfo = document.getElementById("staffAuthAccessRequestInfo");
    requestInfo.hidden = !entry.requestedAt;
    requestInfo.textContent = [
      [entry.name, entry.organization].filter(Boolean).join(" · "),
      entry.requestReason ? `เหตุผลที่ขอ: ${entry.requestReason}` : ""
    ].filter(Boolean).join("\n");
    document.getElementById("staffAuthAccessActiveField").hidden = pending;
    document.getElementById("staffAuthAccessResetBtn").hidden = true;
    if (staffAuthAccessFields.id) staffAuthAccessFields.id.value = entry.id || normalizeAuthAccessEmail(entry.email || "");
    if (staffAuthAccessFields.email) staffAuthAccessFields.email.value = normalizeAuthAccessEmail(entry.email || entry.id || "");
    if (staffAuthAccessFields.startsAt) staffAuthAccessFields.startsAt.value = toDateInputValue(entry.startsAt || new Date());
    if (staffAuthAccessFields.endsAt) staffAuthAccessFields.endsAt.value = toDateInputValue(entry.endsAt || new Date(Date.now() + 86400000));
    if (staffAuthAccessFields.active) staffAuthAccessFields.active.value = pending ? "true" : entry.active === false ? "false" : "true";
    if (staffAuthAccessFields.reason) staffAuthAccessFields.reason.value = pending ? "" : (entry.reason || entry.reviewReason || "").toString();
    if (staffAuthAccessDeleteBtnEl) staffAuthAccessDeleteBtnEl.hidden = false;
    setMessage(staffAuthAccessMessageEl, "");
    void refreshAuthAccessProfilePreview();
  };

  (window.sgcuWorkOpeners ||= {})['staff-temporary-access-staff'] = id => {
    const item = currentAuthEmailAccessEntries.find(item => item.id === id);
    if (!item) return false;
    fillAuthAccessForm(item); openAuthAccessEditor(); return true;
  };

  const replaceAuthAccessRows = (desktop, mobile) => {
    const empty = document.getElementById("staffAuthAccessNoResults");
    if (empty) {
      empty.querySelector("strong").textContent = "ยังไม่มีคำร้องหรือสิทธิ์ชั่วคราว";
      empty.querySelector("p").textContent = "เมื่อมีคำร้องหรือเพิ่มสิทธิ์ใหม่ รายการจะแสดงในส่วนนี้";
      empty.hidden = !!desktop;
    }
    if (staffAuthAccessTableBodyEl) {
      staffAuthAccessTableBodyEl.innerHTML = desktop;
      staffAuthAccessTableBodyEl.dataset.loaded = "true";
    }
    if (staffAuthAccessMobileListEl) staffAuthAccessMobileListEl.innerHTML = mobile;
    window.dispatchEvent(new CustomEvent("sgcu:auth-access-list-rendered"));
  };
  let authAccessRenderVersion = 0;

  const renderAuthEmailAccessRows = async () => {
    const version = ++authAccessRenderVersion;
    if (!staffAuthAccessTableBodyEl) return;
    if (!currentAuthEmailAccessEntries.length) {
      replaceAuthAccessRows("", "");
      return;
    }
    if (staffAuthAccessListCaptionEl) {
      staffAuthAccessListCaptionEl.textContent = `ทั้งหมด ${currentAuthEmailAccessEntries.length} รายการ`;
    }
    const rows = await Promise.all(currentAuthEmailAccessEntries.map(async (entry) => {
      const email = normalizeAuthAccessEmail(entry.email || entry.id || "");
      let profile = null;
      try {
        profile = await findUserProfileByEmail(email);
      } catch (error) {
        console.warn("auth access row profile lookup failed - app.staff-access.js:6158", error);
      }
      const status = readAuthAccessStatus(entry);
      const tone = ({ "รออนุมัติ": "pending", "ปฏิเสธ": "rejected", "ใช้งานได้": "active", "รอเริ่ม": "scheduled", "หมดอายุ": "expired", "ปิดสิทธิ์": "inactive" })[status] || "inactive";
      const badge = `<span class="staff-auth-status is-${tone}">${escapeStaffHtml(status)}</span>`;
      const profileSummary = entry.name || entry.organization
        ? `<div>${escapeStaffHtml([entry.name, entry.organization].filter(Boolean).join(" · "))}</div>`
        : renderAuthAccessProfileSummary(profile);
      const periodStart = ["pending", "rejected"].includes(entry.status) ? "ยังไม่กำหนดช่วงเวลา" : `เริ่ม ${formatDateTime(entry.startsAt)}`;
      const periodEnd = ["pending", "rejected"].includes(entry.status) ? "" : `ถึง ${formatDateTime(entry.endsAt)}`;
      const detail = entry.status === "rejected"
        ? (entry.reviewReason || entry.reason || entry.requestReason || "")
        : (entry.reason || entry.requestReason || "");
      const detailLabel = entry.status === "rejected" ? "เหตุผลที่ปฏิเสธ" : entry.reason ? "หมายเหตุ" : "เหตุผลที่ขอ";
      const detailMarkup = detail ? `<span class="staff-auth-detail-label">${detailLabel}</span><span>${escapeStaffHtml(detail)}</span>` : '<span class="staff-auth-detail-empty">ไม่มีหมายเหตุ</span>';
      const mobile = `<button type="button" class="staff-auth-mobile-card" data-auth-access-email="${escapeStaffHtml(email)}" data-access-status="${tone}" aria-label="ดูรายละเอียด ${escapeStaffHtml(email)} สถานะ${escapeStaffHtml(status)}">
        <span class="staff-auth-card-heading"><strong>${escapeStaffHtml(email || "-")}</strong>${badge}</span>
        <span class="staff-auth-mobile-profile">${profileSummary.replaceAll("<div>", "<span>").replaceAll("</div>", "</span>")}</span>
        <span class="staff-auth-mobile-period"><span>${escapeStaffHtml(periodStart)}</span><span>${escapeStaffHtml(periodEnd)}</span></span>
        <span class="staff-auth-mobile-reason">${detailMarkup}</span>
      </button>`;
      const desktop = `
        <tr data-auth-access-email="${escapeStaffHtml(email)}" data-access-status="${tone}" tabindex="0" role="button" aria-label="ดูรายละเอียด ${escapeStaffHtml(email)} สถานะ${escapeStaffHtml(status)}">
          <td data-label="บัญชี">
            <strong>${escapeStaffHtml(email || "-")}</strong>
            <div class="section-text-sm">${profileSummary}</div>
          </td>
          <td data-label="สถานะ">${badge}</td>
          <td data-label="ช่วงเวลา">
            <div>${escapeStaffHtml(periodStart)}</div>
            <div class="section-text-sm">${escapeStaffHtml(periodEnd)}</div>
          </td>
          <td data-label="รายละเอียด" class="staff-auth-detail">${detailMarkup}</td>
        </tr>
      `;
      return { desktop, mobile };
    }));
    if (version !== authAccessRenderVersion) return;
    replaceAuthAccessRows(rows.map(row => row.desktop).join(""), rows.map(row => row.mobile).join(""));
  };

  const startAuthEmailAccessListener = () => {
    if (!staffAuthAccessTableBodyEl) return;
    if (!resolveStore()) {
      scheduleDeferredBootstrap();
      return;
    }
    if (!getCurrentAuthEmail()) {
      authAccessRenderVersion++;
      currentAuthEmailAccessEntries = [];
      if (staffAuthAccessMobileListEl) staffAuthAccessMobileListEl.textContent = "กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้";
      staffAuthAccessTableBodyEl.innerHTML = '<tr><td colspan="4">กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้</td></tr>';
      if (staffAuthAccessListCaptionEl) staffAuthAccessListCaptionEl.textContent = "ยังไม่ได้เข้าสู่ระบบ";
      return;
    }
    if (typeof unsubscribeAuthEmailAccess === "function") {
      unsubscribeAuthEmailAccess();
      unsubscribeAuthEmailAccess = null;
    }
    const q = firestore.query(firestore.collection(firestore.db, COLLECTION_AUTH_EMAIL_ACCESS));
    unsubscribeAuthEmailAccess = firestore.onSnapshot(
      q,
      (snapshot) => {
        currentAuthEmailAccessEntries = sortByTimestampDesc(
          (snapshot?.docs || []).map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) })),
          "updatedAt"
        );
        void renderAuthEmailAccessRows();
      },
      (error) => {
        console.error("auth email access listener failed - app.staff-access.js:6205", error);
        const msg = buildListenerErrorText("โหลดสิทธิ์เข้าใช้ชั่วคราวไม่สำเร็จ", error);
        if (staffAuthAccessMobileListEl) staffAuthAccessMobileListEl.textContent = msg;
        staffAuthAccessTableBodyEl.innerHTML = `<tr><td colspan="4">${toSafeText(msg)}</td></tr>`;
        setMessage(staffAuthAccessMessageEl, msg, "#b91c1c");
      }
    );
  };

  const saveAuthEmailAccess = async (event) => {
    event?.preventDefault?.();
    const reviewing = document.getElementById("staffAuthAccessDecisionField").dataset.reviewing === "true";
    const decision = document.getElementById("staffAuthAccessDecision").value;
    if (decision === "deleted") return deleteAuthEmailAccess(staffAuthAccessFields.id.value);
    if (reviewing && !decision) { setMessage(staffAuthAccessMessageEl, "กรุณาเลือกผลการพิจารณา", "#b91c1c"); return; }
    if (reviewing && decision === "rejected") return rejectAuthEmailAccess();
    if (!resolveStore()) {
      setMessage(staffAuthAccessMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }
    if (!isSuperStaff()) {
      setMessage(staffAuthAccessMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return;
    }
    const email = normalizeAuthAccessEmail(staffAuthAccessFields.email?.value || "");
    const startsAt = readDateInput(staffAuthAccessFields.startsAt?.value || "");
    const endsAt = readDateInput(staffAuthAccessFields.endsAt?.value || "");
    const active = (staffAuthAccessFields.active?.value || "true") === "true";
    const reason = (staffAuthAccessFields.reason?.value || "").toString().trim();
    if (!email || !email.includes("@")) {
      setMessage(staffAuthAccessMessageEl, "กรุณากรอกอีเมลให้ถูกต้อง", "#b91c1c");
      return;
    }
    if (!startsAt || !endsAt || startsAt >= endsAt) {
      setMessage(staffAuthAccessMessageEl, "กรุณากำหนดช่วงเวลาให้ถูกต้อง", "#b91c1c");
      return;
    }
    try {
      const actor = readCurrentUser();
      const previousEmail = normalizeAuthAccessEmail(staffAuthAccessFields.id?.value || "");
      const previousEntry = currentAuthEmailAccessEntries.find((item) =>
        normalizeAuthAccessEmail(item.email || item.id || "") === (previousEmail || email)
      );
      if (previousEmail && previousEmail !== email) throw new Error("ไม่สามารถเปลี่ยนอีเมลของรายการเดิมได้");
      await firestore.runTransaction(firestore.db, async tx => {
        const ref = firestore.doc(firestore.db, COLLECTION_AUTH_EMAIL_ACCESS, email);
        const snap = await tx.get(ref);
        const current = snap.exists() ? snap.data() : null;
        if (!previousEmail && current) throw new Error("อีเมลนี้มีรายการแล้ว กรุณาเปิดรายการเดิม");
        if (previousEmail && !current) throw new Error("รายการนี้ถูกลบแล้ว กรุณาโหลดใหม่");
        if (previousEntry?.status === "pending" && current?.status !== "pending") throw new Error("คำร้องนี้ถูกพิจารณาแล้ว กรุณาโหลดใหม่");
        if (current?.status === "pending" && previousEntry?.status !== "pending") throw new Error("รายการเปลี่ยนเป็นคำร้องแล้ว กรุณาโหลดใหม่");
        if (current?.status === "pending" && (!active || endsAt <= new Date())) throw new Error("การอนุมัติต้องเปิดใช้งานและวันหมดอายุอยู่ในอนาคต");
        tx.set(ref, {
          email, active, startsAt, endsAt, reason, status: "approved",
          updatedAt: firestore.serverTimestamp(), updatedByEmail: actor.email.toLowerCase(),
          createdAt: current?.createdAt || firestore.serverTimestamp(),
          ...(current?.status === "pending" ? { reviewedAt: firestore.serverTimestamp(), reviewedBy: actor.email.toLowerCase(), reviewReason: reason } : {})
        }, { merge: true });
      });
      setMessage(staffAuthAccessMessageEl, "บันทึกสิทธิ์เข้าใช้เรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.auth_access.upsert",
        entityType: "authEmailAccess",
        entityId: email,
        before: previousEntry || null,
        after: { email, active, startsAt, endsAt, reason },
        metadata: { previousEmail: previousEmail && previousEmail !== email ? previousEmail : "" },
        source: "web_app_staff"
      });
      resetAuthAccessForm();
      closeAuthAccessEditor(true);
    } catch (error) {
      console.error("save auth email access failed - app.staff-access.js:6275", error);
      const msg = buildActionErrorText("บันทึกสิทธิ์เข้าใช้ไม่สำเร็จ", error, email);
      setMessage(staffAuthAccessMessageEl, msg, "#b91c1c");
    }
  };

  const rejectAuthEmailAccess = async () => {
    if (!resolveStore() || !isSuperStaff()) return;
    const email = normalizeAuthAccessEmail(staffAuthAccessFields.id?.value);
    const reviewReason = (staffAuthAccessFields.reason?.value || "").trim();
    if (!email || !reviewReason) { setMessage(staffAuthAccessMessageEl, "กรุณาระบุเหตุผลการปฏิเสธ", "#b91c1c"); return; }
    try {
      const actor = readCurrentUser();
      await firestore.runTransaction(firestore.db, async tx => {
        const ref = firestore.doc(firestore.db, COLLECTION_AUTH_EMAIL_ACCESS, email);
        const snap = await tx.get(ref);
        if (!snap.exists() || snap.data().status !== "pending") throw new Error("คำร้องนี้ถูกพิจารณาแล้ว กรุณาโหลดใหม่");
        tx.update(ref, { status: "rejected", active: false, reviewReason, reviewedAt: firestore.serverTimestamp(),
          reviewedBy: actor.email.toLowerCase(), updatedAt: firestore.serverTimestamp(), updatedByEmail: actor.email.toLowerCase() });
      });
      resetAuthAccessForm(); closeAuthAccessEditor(true);
    } catch (error) { setMessage(staffAuthAccessMessageEl, error.message || "ปฏิเสธคำร้องไม่สำเร็จ", "#b91c1c"); }
  };

  const confirmAuthAccessDeletion = email => new Promise(resolve => {
    const dialog = document.createElement("dialog");
    dialog.className = "meeting-settings-dialog staff-auth-delete-dialog";
    dialog.setAttribute("aria-labelledby", "staffAuthAccessDeleteTitle");
    dialog.setAttribute("aria-describedby", "staffAuthAccessDeleteDescription");
    dialog.innerHTML = `
      <div class="meeting-settings-dialog-card">
        <div class="meeting-settings-dialog-header staff-auth-delete-heading">
          <div>
            <h3 id="staffAuthAccessDeleteTitle" class="panel-title">ยืนยันการลบรายการ</h3>
            <p class="panel-caption">ลบคำร้องและสิทธิ์เข้าใช้ของบัญชีนี้</p>
          </div>
          <button type="button" class="modal-close staff-auth-delete-close" aria-label="ปิด">×</button>
        </div>
        <div class="meeting-delete-warning">
          <span class="meeting-delete-warning-icon" aria-hidden="true">!</span>
          <div>
            <strong class="staff-auth-delete-email"></strong>
            <p id="staffAuthAccessDeleteDescription">เมื่อลบแล้วจะไม่สามารถกู้คืนจากหน้านี้ได้ กรุณาตรวจสอบบัญชีก่อนยืนยัน</p>
          </div>
        </div>
        <div class="meeting-settings-dialog-actions staff-auth-delete-actions">
          <button type="button" class="btn-ghost" data-delete-cancel>ยกเลิก</button>
          <button type="button" class="btn-primary meeting-delete-confirm-btn" data-delete-confirm>ลบรายการ</button>
        </div>
      </div>`;
    dialog.querySelector(".staff-auth-delete-email").textContent = email;
    document.body.appendChild(dialog);
    dialog.querySelector("[data-delete-cancel]").onclick = () => dialog.close("cancel");
    dialog.querySelector(".staff-auth-delete-close").onclick = () => dialog.close("cancel");
    dialog.querySelector("[data-delete-confirm]").onclick = () => dialog.close("confirm");
    let outside = false;
    const isOutside = event => {
      const rect = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    dialog.addEventListener("pointerdown", event => { outside = isOutside(event); });
    dialog.addEventListener("click", event => { if (outside && isOutside(event)) dialog.close("cancel"); outside = false; });
    dialog.addEventListener("close", () => {
      const confirmed = dialog.returnValue === "confirm";
      dialog.remove();
      resolve(confirmed);
    }, { once: true });
    dialog.showModal();
    dialog.querySelector("[data-delete-cancel]").focus();
  });

  const deleteAuthEmailAccess = async (email) => {
    const normalizedEmail = normalizeAuthAccessEmail(email);
    if (!normalizedEmail || !resolveStore() || !isSuperStaff()) return;
    const ok = await confirmAuthAccessDeletion(normalizedEmail);
    if (!ok) return;
    const previousEntry = currentAuthEmailAccessEntries.find((item) =>
      normalizeAuthAccessEmail(item.email || item.id || "") === normalizedEmail
    ) || null;
    try {
      await firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_AUTH_EMAIL_ACCESS, normalizedEmail));
      setMessage(staffAuthAccessMessageEl, "ลบสิทธิ์เรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.auth_access.delete",
        entityType: "authEmailAccess",
        entityId: normalizedEmail,
        before: previousEntry,
        source: "web_app_staff"
      });
      if (normalizeAuthAccessEmail(staffAuthAccessFields.id?.value || "") === normalizedEmail) {
        resetAuthAccessForm();
        closeAuthAccessEditor(true);
      }
    } catch (error) {
      console.error("delete auth email access failed - app.staff-access.js:6303", error);
      setMessage(staffAuthAccessMessageEl, "ลบสิทธิ์ไม่สำเร็จ", "#b91c1c");
    }
  };

