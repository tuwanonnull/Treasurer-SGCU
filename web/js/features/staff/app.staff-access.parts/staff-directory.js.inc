  const normalizeOrgStructureText = (value) =>
    (value || "").toString().trim();

  const orgStructureFacultyMap = {
    "21": "วิศวกรรมศาสตร์",
    "22": "อักษรศาสตร์",
    "23": "วิทยาศาสตร์",
    "24": "รัฐศาสตร์",
    "25": "สถาปัตยกรรมศาสตร์",
    "26": "พาณิชยศาสตร์และการบัญชี",
    "27": "ครุศาสตร์",
    "28": "นิเทศศาสตร์",
    "29": "เศรษฐศาสตร์",
    "30": "แพทยศาสตร์",
    "31": "สัตวแพทย์ศาสตร์",
    "32": "ทันตแพทย์ศาสตร์",
    "33": "เภสัชศาสตร์",
    "34": "นิติศาสตร์",
    "35": "ศิลปกรรมศาสตร์",
    "37": "สหเวชศาสตร์",
    "38": "จิตวิทยา",
    "39": "วิทยาศาสตร์การกีฬา",
    "40": "เกษตรและบูรณาการ",
    "56": "สถาบันนวัตกรรมบูรณาการฯ"
  };

  const resolveOrgStructureStudentMeta = (studentId = "", positionCode = "") => {
    const digits = normalizeOrgStructureText(studentId).replace(/\D/g, "");
    if (digits.length < 10) return { year: "", faculty: "", isComplete: false };

    const faculty = orgStructureFacultyMap[digits.slice(-2)] || "";
    const studentYear = Number(digits.slice(0, 2));
    const termMatch = normalizeOrgStructureText(positionCode).match(/^SGCU\s*(\d{2,4})(?=\.|$)/i);
    const termYear = termMatch ? Number(termMatch[1].slice(-2)) : NaN;
    const yearLevel = Number.isFinite(studentYear) && Number.isFinite(termYear)
      ? termYear - studentYear + 1
      : NaN;
    const year = yearLevel >= 1 && yearLevel <= 8 ? String(yearLevel) : "";
    return { year, faculty, isComplete: !!(year && faculty) };
  };

  const updateOrgStructureStudentMeta = () => {
    const meta = resolveOrgStructureStudentMeta(
      orgStructureFields.studentId?.value,
      orgStructureFields.positionCode?.value
    );
    if (orgStructureFields.year) orgStructureFields.year.value = meta.year;
    if (orgStructureFields.faculty) orgStructureFields.faculty.value = meta.faculty;
    return meta;
  };

  const getOrgStructureTerm = (positionCode = "") => {
    const match = normalizeOrgStructureText(positionCode).match(/^SGCU\s*(\d{2,4})(?=\.|$)/i);
    return match ? `SGCU${match[1].slice(-2)}` : "";
  };

  const slugifyOrgStructureId = (value) => {
    const base = normalizeOrgStructureText(value)
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[^a-z0-9ก-๙]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
    return base || `org-member-${Date.now()}`;
  };

  const extractOrgStructureDriveFileId = (value) => {
    const raw = normalizeOrgStructureText(value);
    if (!raw) return "";
    const fileMatch = raw.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (fileMatch?.[1]) return fileMatch[1];
    const idMatch = raw.match(/[?&]id=([^&#]+)/i);
    if (idMatch?.[1]) return idMatch[1];
    const openMatch = raw.match(/drive\.google\.com\/open\?id=([^&#]+)/i);
    if (openMatch?.[1]) return openMatch[1];
    return "";
  };

  const resolveOrgStructurePhotoPreviewUrl = (value) => {
    const raw = normalizeOrgStructureText(value);
    if (!raw) return "";
    const driveFileId = extractOrgStructureDriveFileId(raw);
    if (driveFileId) return `https://lh3.googleusercontent.com/d/${driveFileId}=w240`;
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.includes(".") ? `img/org/${raw.replace(/\s+/g, "")}` : "";
  };

  const updateOrgStructurePhotoPreview = () => {
    if (!orgStructurePhotoPreviewEl) return;
    const raw = normalizeOrgStructureText(orgStructureFields.photoUrl?.value);
    const previewUrl = resolveOrgStructurePhotoPreviewUrl(raw);
    if (!raw) {
      orgStructurePhotoPreviewEl.innerHTML = `<span>ยังไม่ได้แนบรูป</span>`;
      orgStructurePhotoPreviewEl.dataset.state = "empty";
      return;
    }
    if (!previewUrl) {
      orgStructurePhotoPreviewEl.innerHTML = `<span>วางลิงก์รูปจาก Google Drive หรือ URL รูปภาพ</span>`;
      orgStructurePhotoPreviewEl.dataset.state = "hint";
      return;
    }
    orgStructurePhotoPreviewEl.innerHTML = `
      <img src="${escapeStaffHtml(previewUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      <span>รูปที่จะแสดงบนหน้าเว็บ</span>
    `;
    orgStructurePhotoPreviewEl.dataset.state = "ready";
  };

  const buildOrgStructureRow = (item) => [
    item.positionCode,
    item.position,
    item.prefix,
    item.firstName,
    item.lastName,
    item.nick,
    item.studentId,
    item.year,
    item.faculty,
    item.email,
    item.lineId,
    item.phone,
    item.photoUrl
  ].map((value) => normalizeOrgStructureText(value));

  const normalizeOrgStructureDoc = (docSnap) => {
    const data = docSnap?.data ? docSnap.data() : {};
    const row = Array.isArray(data.row) ? data.row : [];
    const item = {
      id: docSnap.id,
      positionCode: normalizeOrgStructureText(data.positionCode || row[0]),
      position: normalizeOrgStructureText(data.position || row[1]),
      prefix: normalizeOrgStructureText(data.prefix || row[2]),
      firstName: normalizeOrgStructureText(data.firstName || row[3]),
      lastName: normalizeOrgStructureText(data.lastName || row[4]),
      nick: normalizeOrgStructureText(data.nick || row[5]),
      studentId: normalizeOrgStructureText(data.studentId || row[6]),
      year: normalizeOrgStructureText(data.year || row[7]),
      faculty: normalizeOrgStructureText(data.faculty || row[8]),
      email: normalizeOrgStructureText(data.email || row[9]).toLowerCase(),
      lineId: normalizeOrgStructureText(data.lineId || row[10]),
      phone: normalizeOrgStructureText(data.phone || row[11]),
      photoUrl: normalizeOrgStructureText(data.photoUrl || data.photo || row[12]),
      sortOrder: Number(data.sortOrder || 0),
      status: normalizeOrgStructureText(data.status || "published")
    };
    const studentMeta = resolveOrgStructureStudentMeta(item.studentId, item.positionCode);
    if (studentMeta.year) item.year = studentMeta.year;
    if (studentMeta.faculty) item.faculty = studentMeta.faculty;
    item.term = getOrgStructureTerm(item.positionCode);
    item.fullName = [item.prefix, item.firstName, item.lastName].filter(Boolean).join(" ").trim();
    return item;
  };

  const syncOrgStructureFilterOptions = () => {
    if (!orgStructureTermFilterEl) return;
    const currentValue = orgStructureTermFilterEl.value || "all";
    const terms = Array.from(new Set(currentOrgStructureMembers.map((item) => item.term).filter(Boolean)))
      .sort((a, b) => Number((b.match(/\d+/) || [0])[0]) - Number((a.match(/\d+/) || [0])[0]));
    orgStructureTermFilterEl.innerHTML = `<option value="all">ทุกรุ่น</option>${terms
      .map((term) => `<option value="${escapeStaffHtml(term)}">${escapeStaffHtml(term)}</option>`)
      .join("")}`;
    const currentTerm = `SGCU${getAcademicYearCodeXX()}`;
    const defaultTerm = terms.includes(currentTerm) ? currentTerm : (terms[0] || "all");
    orgStructureTermFilterEl.value = orgStructureTermInitialized
      ? (currentValue === "all" || terms.includes(currentValue) ? currentValue : defaultTerm)
      : defaultTerm;
    if (terms.length) orgStructureTermInitialized = true;
    orgStructureFilters.term = orgStructureTermFilterEl.value || "all";
  };

  const getFilteredOrgStructureMembers = () => {
    const query = normalizeOrgStructureText(orgStructureFilters.query).toLowerCase();
    return currentOrgStructureMembers.filter((item) => {
      if (orgStructureFilters.term !== "all" && item.term !== orgStructureFilters.term) return false;
      if (orgStructureFilters.status !== "all" && item.status !== orgStructureFilters.status) return false;
      if (!query) return true;
      return [
        item.positionCode,
        item.position,
        item.fullName,
        item.nick,
        item.term,
        item.email,
        item.faculty
      ].join(" ").toLowerCase().includes(query);
    });
  };

  const renderOrgStructureMobileMembers = (items) => {
    if (!orgStructureMobileListEl) return;
    if (!items.length) {
      orgStructureMobileListEl.innerHTML = currentOrgStructureMembers.length
        ? renderListEmptyState("ไม่พบรายชื่อตามตัวกรอง", "ลองเปลี่ยนหรือล้างตัวกรองเพื่อดูรายการอื่น", "search")
        : renderListEmptyState("ยังไม่มีรายชื่อในระบบ", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "document");
      return;
    }
    orgStructureMobileListEl.innerHTML = items.map((item) => {
      const status = item.status || "published";
      const statusLabel = ({ published: "เผยแพร่แล้ว", draft: "ฉบับร่าง", archived: "เก็บถาวร" })[status] || status;
      return `<button type="button" class="org-directory-mobile-card" data-org-member-id="${escapeStaffHtml(item.id)}" aria-label="แก้ไข ${escapeStaffHtml(item.fullName || "รายชื่อ")}">
        <strong class="org-directory-mobile-name">${escapeStaffHtml(item.fullName || "-")}</strong>
        <span class="org-directory-mobile-position">${escapeStaffHtml([item.position, item.nick ? `(${item.nick})` : ""].filter(Boolean).join(" "))}</span>
        <span class="org-directory-mobile-meta">
          <span>รุ่น ${escapeStaffHtml(item.term || "-")}</span>
          <span class="content-admin-status is-${escapeStaffHtml(status)}">${escapeStaffHtml(statusLabel)}</span>
        </span>
        <span class="org-directory-mobile-code">รหัสตำแหน่ง · ${escapeStaffHtml(item.positionCode || "-")}</span>
      </button>`;
    }).join("");
  };

  const renderOrgStructureMembers = () => {
    if (!orgStructureTableBodyEl || !orgStructureListCaptionEl) return;
    syncOrgStructureFilterOptions();
    const visibleItems = getFilteredOrgStructureMembers();
    renderOrgStructureMobileMembers(visibleItems);
    orgStructureListCaptionEl.textContent =
      `แสดง ${visibleItems.length.toLocaleString("th-TH")} จาก ${currentOrgStructureMembers.length.toLocaleString("th-TH")} รายชื่อ`;

    if (!currentOrgStructureMembers.length) {
      orgStructureTableBodyEl.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState("ยังไม่มีรายชื่อในระบบ", "เมื่อมีรายการใหม่ รายการจะแสดงในส่วนนี้", "document")}</td></tr>`;
      return;
    }
    if (!visibleItems.length) {
      orgStructureTableBodyEl.innerHTML = `<tr><td colspan="4" class="list-empty-cell">${renderListEmptyState("ไม่พบรายชื่อตามตัวกรอง", "ลองเปลี่ยนหรือล้างตัวกรองเพื่อดูรายการอื่น", "search")}</td></tr>`;
      return;
    }

    orgStructureTableBodyEl.innerHTML = visibleItems
      .map((item) => {
        return `
          <tr class="org-directory-member-row" data-org-member-id="${escapeStaffHtml(item.id)}" tabindex="0" role="button" aria-label="แก้ไข ${escapeStaffHtml(item.fullName)}">
            <td>
              <strong>${escapeStaffHtml(item.fullName || "-")}</strong>
              <small>${escapeStaffHtml([item.position, item.nick ? `(${item.nick})` : ""].filter(Boolean).join(" "))}</small>
            </td>
            <td>${escapeStaffHtml(item.positionCode || "-")}</td>
            <td>${escapeStaffHtml(item.term || "-")}</td>
            <td><span class="content-admin-status is-${escapeStaffHtml(item.status || "published")}">${escapeStaffHtml(({ published: "เผยแพร่แล้ว", draft: "ฉบับร่าง", archived: "เก็บถาวร" })[item.status || "published"] || item.status)}</span></td>
          </tr>
        `;
      })
      .join("");
  };

  const orgStructurePlacement = {
    term: document.getElementById("orgStructureTermInput"),
    position: document.getElementById("orgStructurePositionSelect"),
    order: document.getElementById("orgStructureOrderInput"),
    hint: document.getElementById("orgStructurePlacementHint"),
    advanced: document.getElementById("orgStructureAdvanced")
  };
  let orgStructurePlacementOptions = [];
  const parseOrgStructurePlacement = (code) => {
    const match = normalizeOrgStructureText(code).match(/^SGCU(\d{2})\.10\.(\d{2})\.(\d{2})-(\d{3})$/i);
    return match ? { term: match[1], yy: match[2], zz: match[3], order: Number(match[4]) } : null;
  };

  const syncOrgStructurePlacementFromCode = () => {
    if (!orgStructurePlacement.position) return;
    const parsed = parseOrgStructurePlacement(orgStructureFields.positionCode?.value);
    const options = new Map();
    [...DEFAULT_POSITION_OPTIONS, ...currentPositionCatalog].forEach((item) => {
      const name = normalizeOrgStructureText(item.name);
      const yy = normalizeCode2(item.divisionCodeYY);
      const zz = normalizeCode2(item.levelCodeZZ);
      if (name && /^\d{2}$/.test(yy) && /^\d{2}$/.test(zz)) options.set(name, { name, yy, zz });
    });
    orgStructurePlacementOptions = Array.from(options.values());
    let selected = -1;
    if (parsed) {
      const name = normalizeOrgStructureText(orgStructureFields.position?.value);
      selected = orgStructurePlacementOptions.findIndex((item) => item.yy === parsed.yy && item.zz === parsed.zz && item.name === name);
      if (selected < 0) {
        selected = orgStructurePlacementOptions.length;
        orgStructurePlacementOptions.push({ name: name || `ตำแหน่งเดิม (${parsed.yy}.${parsed.zz})`, yy: parsed.yy, zz: parsed.zz });
      }
    }
    orgStructurePlacement.position.innerHTML = '<option value="">เลือกตำแหน่ง</option>' + orgStructurePlacementOptions
      .map((item, index) => `<option value="${index}">${escapeStaffHtml(item.name)}</option>`).join("");
    orgStructurePlacement.position.value = selected < 0 ? "" : String(selected);
    const filteredTerm = orgStructureFilters.term.match(/^SGCU(\d{2})$/)?.[1];
    orgStructurePlacement.term.value = parsed?.term || filteredTerm || getAcademicYearCodeXX();
    orgStructurePlacement.order.value = parsed ? String(parsed.order) : "";
    orgStructurePlacement.order.min = parsed?.order === 0 ? "0" : "1";
    const hasLegacyCode = !!orgStructureFields.positionCode?.value && !parsed;
    if (orgStructurePlacement.advanced) orgStructurePlacement.advanced.open = hasLegacyCode;
    if (orgStructurePlacement.hint) orgStructurePlacement.hint.textContent = parsed
      ? `รุ่น SGCU${parsed.term} · ${orgStructureFields.position?.value || "ตำแหน่งเดิม"} · ลำดับ ${parsed.order} (คงค่าจากรหัสเดิม)`
      : hasLegacyCode
        ? "รายชื่อนี้ใช้รหัสรูปแบบเดิม ระบบจะเก็บรหัสเดิมไว้ หรือเลือกตำแหน่งเพื่อสร้างรหัสใหม่"
        : "เลือกตำแหน่ง ระบบจะเสนอลำดับถัดไปในตำแหน่งนั้นให้ เลขน้อยแสดงก่อนเลขมาก";
  };

  const updateOrgStructurePlacementCode = (suggestOrder = false, updateName = false) => {
    const rawSelection = orgStructurePlacement.position?.value;
    const selected = rawSelection === "" ? null : orgStructurePlacementOptions[Number(rawSelection)];
    const rawTerm = orgStructurePlacement.term?.value || "";
    const validTerm = /^\d{1,2}$/.test(rawTerm);
    if (!selected || !validTerm) {
      if (orgStructureFields.positionCode) orgStructureFields.positionCode.value = "";
      if (orgStructurePlacement.hint) orgStructurePlacement.hint.textContent = "กรุณาระบุรุ่น 0–99 และเลือกตำแหน่ง";
      return;
    }
    const term = rawTerm.padStart(2, "0");
    const prefix = `SGCU${term}.10.${selected.yy}.${selected.zz}-`;
    if (suggestOrder) {
      const usedOrders = currentOrgStructureMembers
        .filter((item) => item.id !== orgStructureFields.id?.value && item.positionCode?.toUpperCase().startsWith(prefix))
        .map((item) => parseOrgStructurePlacement(item.positionCode)?.order || 0);
      orgStructurePlacement.order.value = String(Math.max(0, ...usedOrders) + 1);
    }
    const order = Number(orgStructurePlacement.order?.value);
    if (!Number.isInteger(order) || order < 1 || order > 999) {
      orgStructureFields.positionCode.value = "";
      orgStructurePlacement.hint.textContent = "กรุณาระบุลำดับ 1–999 ที่ยังไม่มีผู้ใช้ในตำแหน่งนี้";
      return;
    }
    orgStructureFields.positionCode.value = `${prefix}${String(order).padStart(3, "0")}`;
    if (updateName && orgStructureFields.position) orgStructureFields.position.value = selected.name;
    orgStructurePlacement.hint.textContent = `รุ่น SGCU${term} · ${selected.name} · ลำดับ ${order} — เรียงภายในตำแหน่งเดียวกันจากเลขน้อยไปมาก`;
    updateOrgStructureStudentMeta();
  };

  const resetOrgStructureForm = () => {
    orgStructureMemberFormEl?.reset();
    const title = document.getElementById("orgStructureEditorTitle");
    if (title) title.textContent = "เพิ่มรายชื่อ";
    if (orgStructureFields.id) orgStructureFields.id.value = "";
    if (orgStructureFields.status) orgStructureFields.status.value = "published";
    updateOrgStructureStudentMeta();
    updateOrgStructurePhotoPreview();
    setMessage(orgStructureFormMessageEl, "");
    syncOrgStructurePlacementFromCode();
  };

  let orgStructureEditorReturnFocus = null;
  let orgStructureEditorSnapshot = "";
  let orgStructureEditorClosing = false;
  let orgStructureSaving = false;
  const readOrgStructureEditorSnapshot = () => JSON.stringify(
    Array.from(orgStructureMemberFormEl?.elements || [])
      .filter((field) => field.matches("input, select, textarea"))
      .map((field) => [field.id, field.value])
  );
  const setOrgStructureEditorOpen = (open) => {
    const editor = document.getElementById("orgStructureEditor");
    const addButton = document.getElementById("orgStructureAddBtn");
    if (!editor || orgStructureEditorClosing || editor.open === open) return;
    if (open) {
      orgStructureEditorReturnFocus = document.activeElement;
      orgStructureEditorSnapshot = readOrgStructureEditorSnapshot();
      editor.showModal();
      document.body.classList.add("has-org-directory-modal");
      editor.scrollTop = 0;
      const formScroller = editor.querySelector?.(".org-directory-editor-layout");
      if (formScroller) formScroller.scrollTop = 0;
      const initialFocus = window.matchMedia?.("(max-width: 640px)").matches
        ? document.getElementById("orgStructureEditorTitle") : orgStructureFields.firstName;
      initialFocus?.focus({ preventScroll: true });
    } else {
      if (orgStructureSaving) return;
      if (readOrgStructureEditorSnapshot() !== orgStructureEditorSnapshot
        && !window.confirm("มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดฟอร์มและทิ้งการแก้ไขหรือไม่?")) return;
      const finishClose = () => {
        editor.close();
        editor.classList.remove("is-closing");
        editor.inert = false;
        orgStructureEditorClosing = false;
        document.body.classList.remove("has-org-directory-modal");
        addButton?.setAttribute("aria-expanded", "false");
        const returnTarget = orgStructureEditorReturnFocus?.isConnected ? orgStructureEditorReturnFocus : addButton;
        returnTarget?.focus({ preventScroll: true });
      };
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        finishClose();
      } else {
        orgStructureEditorClosing = true;
        editor.inert = true;
        editor.classList.add("is-closing");
        // Keep the native dialog and backdrop open until the exit animation finishes.
        let timer;
        const onEnd = (event) => {
          if (event && (event.target !== editor || event.animationName !== "org-directory-modal-out")) return;
          window.clearTimeout(timer);
          editor.removeEventListener("animationend", onEnd);
          finishClose();
        };
        editor.addEventListener("animationend", onEnd);
        timer = window.setTimeout(() => onEnd(), 240);
      }
      return;
    }
    addButton?.setAttribute("aria-expanded", String(open));
  };

  const fillOrgStructureForm = (item) => {
    if (!item || !orgStructureMemberFormEl) return;
    const title = document.getElementById("orgStructureEditorTitle");
    if (title) title.textContent = "แก้ไขรายชื่อ";
    Object.keys(orgStructureFields).forEach((key) => {
      const field = orgStructureFields[key];
      if (!field) return;
      field.value = key === "id" ? (item.id || "") : (item[key] || "");
    });
    updateOrgStructureStudentMeta();
    updateOrgStructurePhotoPreview();
    setMessage(orgStructureFormMessageEl, `กำลังแก้ไข: ${item.fullName || item.positionCode}`, "#1d4ed8");
    syncOrgStructurePlacementFromCode();
    setOrgStructureEditorOpen(true);
  };

  const readOrgStructurePayload = () => {
    const studentId = normalizeOrgStructureText(orgStructureFields.studentId?.value);
    const positionCode = normalizeOrgStructureText(orgStructureFields.positionCode?.value);
    const studentMeta = resolveOrgStructureStudentMeta(studentId, positionCode);
    const payload = {
      positionCode,
      position: normalizeOrgStructureText(orgStructureFields.position?.value),
      prefix: normalizeOrgStructureText(orgStructureFields.prefix?.value),
      firstName: normalizeOrgStructureText(orgStructureFields.firstName?.value),
      lastName: normalizeOrgStructureText(orgStructureFields.lastName?.value),
      nick: normalizeOrgStructureText(orgStructureFields.nick?.value),
      studentId,
      year: studentMeta.year,
      faculty: studentMeta.faculty,
      email: normalizeOrgStructureText(orgStructureFields.email?.value).toLowerCase(),
      lineId: normalizeOrgStructureText(orgStructureFields.lineId?.value),
      phone: normalizeOrgStructureText(orgStructureFields.phone?.value),
      photoUrl: normalizeOrgStructureText(orgStructureFields.photoUrl?.value),
      status: normalizeOrgStructureText(orgStructureFields.status?.value) || "published"
    };
    if (!payload.positionCode) throw new Error("กรุณาเลือกรุ่น ตำแหน่ง และลำดับให้ครบถ้วน");
    const duplicate = currentOrgStructureMembers.some((item) => item.id !== orgStructureFields.id?.value
      && normalizeOrgStructureText(item.positionCode).toUpperCase() === payload.positionCode.toUpperCase());
    if (duplicate) throw new Error("ลำดับนี้มีผู้ใช้แล้วในรุ่นและตำแหน่งเดียวกัน กรุณาเลือกลำดับอื่น");
    if (!payload.position) throw new Error("กรุณากรอกตำแหน่ง");
    if (!payload.firstName) throw new Error("กรุณากรอกชื่อ");
    if (payload.studentId && !studentMeta.isComplete) {
      throw new Error("กรุณาตรวจสอบรหัสนิสิต เพื่อให้ระบบระบุชั้นปีและคณะได้");
    }
    payload.row = buildOrgStructureRow(payload);
    payload.term = getOrgStructureTerm(payload.positionCode);
    return payload;
  };

  const syncPublicOrgStructureCache = async (rows = currentOrgStructureMembers) => {
    if (!resolveStore() || !firestore.doc || !firestore.setDoc) return;
    const publishedRows = (rows || [])
      .filter((item) => (item.status || "published") === "published")
      .sort((a, b) => a.sortOrder - b.sortOrder || (a.positionCode || "").localeCompare(b.positionCode || "", "th"))
      .map((item) => Array.isArray(item.row) ? item.row : buildOrgStructureRow(item));

    await firestore.setDoc(
      firestore.doc(firestore.db, COLLECTION_PUBLIC_CACHE, "orgStructure"),
      {
        rows: [
          [
            "รหัสตำแหน่ง",
            "ตำแหน่ง",
            "คำนำ",
            "ชื่อ",
            "สกุล",
            "ชื่อเล่น",
            "รหัสนิสิต",
            "ชั้นปี",
            "คณะ",
            "อีเมลที่ใช้ประจำ",
            "Line ID",
            "เบอร์โทรศัพท์",
            "PIC"
          ],
          ...publishedRows
        ],
        updatedAt: firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString(),
        updatedBy: window.sgcuAuth?.auth?.currentUser?.email || ""
      },
      { merge: true }
    );
  };

  const saveOrgStructureMember = async (event) => {
    event.preventDefault();
    if (!resolveStore()) {
      setMessage(orgStructureFormMessageEl, "ระบบ Firestore ยังไม่พร้อม", "#b91c1c");
      return;
    }
    if (orgStructureSaving) return;
    orgStructureSaving = true;
    const controls = Array.from(orgStructureMemberFormEl?.elements || []);
    controls.forEach((control) => {
      if ("disabled" in control) control.disabled = true;
    });
    try {
      const payload = readOrgStructurePayload();
      const id = normalizeOrgStructureText(orgStructureFields.id?.value);
      const docId = id || slugifyOrgStructureId(payload.positionCode);
      const existingIndex = currentOrgStructureMembers.findIndex((item) => item.id === docId);
      const nextSortOrder = existingIndex >= 0
        ? currentOrgStructureMembers[existingIndex].sortOrder || existingIndex + 1
        : currentOrgStructureMembers.length + 1;
      await firestore.setDoc(
        firestore.doc(firestore.db, COLLECTION_ORG_STRUCTURE, docId),
        {
          ...payload,
          sortOrder: nextSortOrder,
          updatedAt: firestore.serverTimestamp(),
          updatedBy: window.sgcuAuth?.auth?.currentUser?.email || ""
        },
        { merge: true }
      );
      const nextMembers = currentOrgStructureMembers.filter((item) => item.id !== docId);
      nextMembers.push({
        id: docId,
        ...payload,
        sortOrder: nextSortOrder
      });
      await syncPublicOrgStructureCache(nextMembers);
      resetOrgStructureForm();
      orgStructureEditorSnapshot = readOrgStructureEditorSnapshot();
      setMessage(orgStructureFormMessageEl, "บันทึกรายชื่อทำเนียบรุ่นแล้ว และอัปเดต public cache แล้ว", "#047857");
    } catch (error) {
      console.error("save org structure member failed - app.staff-access.js:2167", error);
      setMessage(orgStructureFormMessageEl, error.message || "บันทึกทำเนียบรุ่นไม่สำเร็จ", "#b91c1c");
    } finally {
      orgStructureSaving = false;
      controls.forEach((control) => {
        if ("disabled" in control) control.disabled = false;
      });
    }
  };

  const archiveCurrentOrgStructureMember = () => {
    if (!orgStructureFields.id?.value) {
      if (orgStructureFields.status) orgStructureFields.status.value = "archived";
      return;
    }
    if (orgStructureFields.status) orgStructureFields.status.value = "archived";
    orgStructureMemberFormEl?.requestSubmit();
  };

  const startOrgStructureMembersListener = () => {
    if (!orgStructureTableBodyEl || !resolveStore() || unsubscribeOrgStructureMembers) return;
    orgStructureListCaptionEl.textContent = "กำลังโหลดรายชื่อ...";
    if (orgStructureMobileListEl) orgStructureMobileListEl.innerHTML = '<p class="panel-caption">กำลังโหลดรายชื่อ...</p>';
    orgStructureTableBodyEl.innerHTML = `<tr><td colspan="4">กำลังโหลดรายชื่อ...</td></tr>`;
    unsubscribeOrgStructureMembers = firestore.onSnapshot(
      firestore.collection(firestore.db, COLLECTION_ORG_STRUCTURE),
      (snapshot) => {
        currentOrgStructureMembers = (snapshot?.docs || [])
          .map((docSnap) => normalizeOrgStructureDoc(docSnap))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.positionCode.localeCompare(b.positionCode, "th"));
        renderOrgStructureMembers();
      },
      (error) => {
        console.error("load org structure members failed - app.staff-access.js:2198", error);
        orgStructureListCaptionEl.textContent = "โหลดทำเนียบรุ่นไม่สำเร็จ";
        if (orgStructureMobileListEl) orgStructureMobileListEl.innerHTML = renderListEmptyState("โหลดรายชื่อไม่สำเร็จ", "ลองกดรีเฟรชเพื่อโหลดอีกครั้ง", "document");
        orgStructureTableBodyEl.innerHTML = `<tr><td colspan="4">ไม่สามารถโหลดรายชื่อจาก Firestore ได้</td></tr>`;
      }
    );
  };

  const exportOrgStructureMembersCsv = () => {
    const rows = getFilteredOrgStructureMembers().map((item) => ({
      positionCode: item.positionCode,
      position: item.position,
      prefix: item.prefix,
      firstName: item.firstName,
      lastName: item.lastName,
      nick: item.nick,
      studentId: item.studentId,
      year: item.year,
      faculty: item.faculty,
      email: item.email,
      lineId: item.lineId,
      phone: item.phone,
      photoUrl: item.photoUrl,
      status: item.status
    }));
    const ok = window.sgcuCsvExport?.download?.("org-structure-members.csv", rows);
    if (!ok) setMessage(orgStructureFormMessageEl, "ไม่พบตัวช่วย Export CSV", "#b91c1c");
  };

