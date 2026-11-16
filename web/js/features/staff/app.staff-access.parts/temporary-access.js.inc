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

  const resetAuthAccessForm = () => {
    const title = document.getElementById("staffAuthAccessEditorTitle");
    if (title) title.textContent = "เพิ่มสิทธิ์เข้าใช้ชั่วคราว";
    if (staffAuthAccessFields.id) staffAuthAccessFields.id.value = "";
    if (staffAuthAccessFields.email) staffAuthAccessFields.email.value = "";
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
    if (title) title.textContent = "แก้ไขสิทธิ์เข้าใช้ชั่วคราว";
    if (staffAuthAccessFields.id) staffAuthAccessFields.id.value = entry.id || normalizeAuthAccessEmail(entry.email || "");
    if (staffAuthAccessFields.email) staffAuthAccessFields.email.value = normalizeAuthAccessEmail(entry.email || entry.id || "");
    if (staffAuthAccessFields.startsAt) staffAuthAccessFields.startsAt.value = toDateInputValue(entry.startsAt);
    if (staffAuthAccessFields.endsAt) staffAuthAccessFields.endsAt.value = toDateInputValue(entry.endsAt);
    if (staffAuthAccessFields.active) staffAuthAccessFields.active.value = entry.active === false ? "false" : "true";
    if (staffAuthAccessFields.reason) staffAuthAccessFields.reason.value = (entry.reason || "").toString();
    if (staffAuthAccessDeleteBtnEl) staffAuthAccessDeleteBtnEl.hidden = false;
    setMessage(staffAuthAccessMessageEl, "โหลดรายการเข้าแบบฟอร์มแล้ว", "#6b7280");
    void refreshAuthAccessProfilePreview();
  };

  const renderAuthEmailAccessRows = async () => {
    if (!staffAuthAccessTableBodyEl) return;
    if (!currentAuthEmailAccessEntries.length) {
      staffAuthAccessTableBodyEl.innerHTML = `<tr><td colspan="3" class="list-empty-cell">${renderListEmptyState("ยังไม่มีสิทธิ์ชั่วคราว", "กรอกแบบฟอร์มด้านบนเพื่อเพิ่มสิทธิ์เข้าใช้ชั่วคราว", "document")}</td></tr>`;
      if (staffAuthAccessMobileListEl) staffAuthAccessMobileListEl.innerHTML = renderListEmptyState("ยังไม่มีสิทธิ์ชั่วคราว", "กรอกแบบฟอร์มด้านบนเพื่อเพิ่มสิทธิ์เข้าใช้ชั่วคราว", "document");
      if (staffAuthAccessListCaptionEl) staffAuthAccessListCaptionEl.textContent = "แสดงผล 0 รายการ";
      return;
    }
    if (staffAuthAccessListCaptionEl) {
      staffAuthAccessListCaptionEl.textContent = `แสดงผล ${currentAuthEmailAccessEntries.length} รายการ`;
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
      const tone = ({ "ใช้งานได้": "active", "รอเริ่ม": "pending", "หมดอายุ": "expired", "ปิดสิทธิ์": "inactive" })[status] || "inactive";
      const badge = `<span class="staff-auth-status is-${tone}">${escapeStaffHtml(status)}</span>`;
      const profileSummary = renderAuthAccessProfileSummary(profile);
      const mobile = `<button type="button" class="staff-auth-mobile-card" data-auth-access-email="${escapeStaffHtml(email)}" aria-label="แก้ไขสิทธิ์เข้าใช้ของ ${escapeStaffHtml(email)}">
        <strong>${escapeStaffHtml(email || "-")}</strong>
        <span class="staff-auth-mobile-profile">${profileSummary.replaceAll("<div>", "<span>").replaceAll("</div>", "</span>")}</span>
        ${badge}
        <span class="staff-auth-mobile-period"><span>เริ่ม ${escapeStaffHtml(formatDateTime(entry.startsAt))}</span><span>สิ้นสุด ${escapeStaffHtml(formatDateTime(entry.endsAt))}</span></span>
        <span class="staff-auth-mobile-reason">${escapeStaffHtml(entry.reason || "-")}</span>
      </button>`;
      const desktop = `
        <tr data-auth-access-email="${escapeStaffHtml(email)}" tabindex="0" role="button" aria-label="แก้ไขสิทธิ์เข้าใช้ของ ${escapeStaffHtml(email)}">
          <td data-label="บัญชี">
            <strong>${escapeStaffHtml(email || "-")}</strong>
            <div class="section-text-sm">${profileSummary}</div>
            ${badge}
          </td>
          <td data-label="ช่วงเวลา">
            <div>${escapeStaffHtml(formatDateTime(entry.startsAt))}</div>
            <div class="section-text-sm">ถึง ${escapeStaffHtml(formatDateTime(entry.endsAt))}</div>
          </td>
          <td data-label="เหตุผล">${escapeStaffHtml(entry.reason || "-")}</td>
        </tr>
      `;
      return { desktop, mobile };
    }));
    staffAuthAccessTableBodyEl.innerHTML = rows.map((row) => row.desktop).join("");
    if (staffAuthAccessMobileListEl) staffAuthAccessMobileListEl.innerHTML = rows.map((row) => row.mobile).join("");
  };

  const startAuthEmailAccessListener = () => {
    if (!staffAuthAccessTableBodyEl) return;
    if (!resolveStore()) {
      scheduleDeferredBootstrap();
      return;
    }
    if (!getCurrentAuthEmail()) {
      currentAuthEmailAccessEntries = [];
      if (staffAuthAccessMobileListEl) staffAuthAccessMobileListEl.textContent = "กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้";
      staffAuthAccessTableBodyEl.innerHTML = '<tr><td colspan="3">กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้</td></tr>';
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
        staffAuthAccessTableBodyEl.innerHTML = `<tr><td colspan="3">${toSafeText(msg)}</td></tr>`;
        setMessage(staffAuthAccessMessageEl, msg, "#b91c1c");
      }
    );
  };

  const saveAuthEmailAccess = async (event) => {
    event?.preventDefault?.();
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
    if (!reason) {
      setMessage(staffAuthAccessMessageEl, "กรุณาระบุเหตุผล", "#b91c1c");
      return;
    }
    try {
      const actor = readCurrentUser();
      const previousEmail = normalizeAuthAccessEmail(staffAuthAccessFields.id?.value || "");
      const previousEntry = currentAuthEmailAccessEntries.find((item) =>
        normalizeAuthAccessEmail(item.email || item.id || "") === (previousEmail || email)
      );
      await firestore.setDoc(
        firestore.doc(firestore.db, COLLECTION_AUTH_EMAIL_ACCESS, email),
        {
          email,
          active,
          startsAt,
          endsAt,
          reason,
          updatedAt: firestore.serverTimestamp(),
          updatedByEmail: (actor?.email || "").toString().trim().toLowerCase(),
          createdAt: previousEntry?.createdAt || firestore.serverTimestamp()
        },
        { merge: true }
      );
      if (previousEmail && previousEmail !== email) {
        await firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_AUTH_EMAIL_ACCESS, previousEmail));
      }
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
    } catch (error) {
      console.error("save auth email access failed - app.staff-access.js:6275", error);
      const msg = buildActionErrorText("บันทึกสิทธิ์เข้าใช้ไม่สำเร็จ", error, email);
      setMessage(staffAuthAccessMessageEl, msg, "#b91c1c");
    }
  };

  const deleteAuthEmailAccess = async (email) => {
    const normalizedEmail = normalizeAuthAccessEmail(email);
    if (!normalizedEmail || !resolveStore() || !isSuperStaff()) return;
    const ok = window.confirm(`ยืนยันลบสิทธิ์เข้าใช้ของ ${normalizedEmail} ?`);
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
      }
    } catch (error) {
      console.error("delete auth email access failed - app.staff-access.js:6303", error);
      setMessage(staffAuthAccessMessageEl, "ลบสิทธิ์ไม่สำเร็จ", "#b91c1c");
    }
  };

