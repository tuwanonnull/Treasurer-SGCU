  const resolveStore = () => {
    firestore = window.sgcuFirestore || {};
    hasStore = !!(
      firestore.db &&
      firestore.collection &&
      firestore.addDoc &&
      firestore.doc &&
      firestore.updateDoc &&
      firestore.setDoc &&
      firestore.deleteDoc &&
      firestore.onSnapshot &&
      firestore.query &&
      firestore.where &&
      firestore.serverTimestamp
    );
    return hasStore;
  };

  const scheduleDeferredBootstrap = () => {
    if (deferredBootstrapTimer) return;
    deferredBootstrapTimer = window.setTimeout(() => {
      deferredBootstrapTimer = 0;
      if (!resolveStore()) {
        scheduleDeferredBootstrap();
        return;
      }
      startPositionCatalogListener();
      startMyApplicationsListener();
      startPendingApplicationsListener();
      startApprovedHistoryListener();
      startOrgRepresentativeApplicationsListener();
    }, 350);
  };

  const syncApprovalTablesFromState = () => {
    if (approvalBodyEl && !approvalBodyEl.isConnected) return;
    if (approvalHistoryBodyEl && !approvalHistoryBodyEl.isConnected) return;
    if (approvalCaptionEl && currentPendingApplications.length) {
      renderApprovalRows();
    } else if (approvalBodyEl && /กำลังโหลดข้อมูล/.test(approvalBodyEl.textContent || "")) {
      renderApprovalRows();
    }
    if (approvalHistoryCaptionEl && currentApprovedHistory.length) {
      renderApprovedHistory();
    } else if (approvalHistoryBodyEl && /กำลังโหลดข้อมูล/.test(approvalHistoryBodyEl.textContent || "")) {
      renderApprovedHistory();
    }
    if (positionListEl && currentPositionCatalog.length && /ยังไม่มีรายการตำแหน่ง/.test(positionListEl.textContent || "")) {
      renderPositionCatalog();
    }
  };

  const scheduleApprovalUiSync = () => {
    if (approvalUiSyncTimer) {
      window.clearTimeout(approvalUiSyncTimer);
    }
    approvalUiSyncTimer = window.setTimeout(() => {
      approvalUiSyncTimer = 0;
      syncApprovalTablesFromState();
    }, 80);
  };

  const readCurrentUser = () => window.sgcuAuth?.auth?.currentUser || null;
  const getCurrentAuthEmail = () => {
    const currentUserEmail = (readCurrentUser()?.email || "").toString().trim().toLowerCase();
    if (currentUserEmail) return currentUserEmail;
    return (lastKnownAuthState.email || "").toString().trim().toLowerCase();
  };

  const normalizeAccountEmail = (email) => {
    if (typeof window.sgcuNormalizeAccountEmail === "function") {
      return window.sgcuNormalizeAccountEmail(email);
    }
    const normalized = (email || "").toString().trim().toLowerCase();
    const match = normalized.match(/^(\d{10})@(student|alumni)\.chula\.ac\.th$/);
    return match ? `${match[1]}@student.chula.ac.th` : normalized;
  };

  const isAlumniChulaEmail = (email) => {
    if (typeof window.sgcuIsAlumniChulaEmail === "function") {
      return window.sgcuIsAlumniChulaEmail(email);
    }
    return /^\d{10}@alumni\.chula\.ac\.th$/i.test((email || "").toString().trim());
  };

  const normalizeRoleCode = (role) => {
    const value = (role || "").toString().trim();
    if (!value) return "";
    const normalized = value.replace(/^0+(?=\d)/, "");
    return normalized || "0";
  };

  const hasRoleToken = (roleValue, roleToken) => {
    const target = normalizeRoleCode(roleToken);
    const tokens = (roleValue || "")
      .toString()
      .split(",")
      .map((item) => normalizeRoleCode(item))
      .filter(Boolean);
    return tokens.includes(target);
  };

  const isSuperStaff = () => {
    const currentUserEmail = getCurrentAuthEmail();
    if (currentUserEmail && STAFF_HEAD_EMAIL_OVERRIDES.has(currentUserEmail)) return true;
    const profiles = [];
    if (typeof staffAuthUser !== "undefined" && staffAuthUser) profiles.push(staffAuthUser);
    if (currentAccessProfile && currentAccessProfileEmail === currentUserEmail) profiles.push(currentAccessProfile);
    if (
      currentUserEmail &&
      typeof staffProfilesByEmail !== "undefined" &&
      staffProfilesByEmail &&
      staffProfilesByEmail[currentUserEmail]
    ) {
      profiles.push(staffProfilesByEmail[currentUserEmail]);
    }
    return profiles.some(isHeadStaffProfileData);
  };

  const isHeadStaffProfileData = (profile = {}) => {
    if (!profile || typeof profile !== "object") return false;
    const profileEmail = (profile.email || "").toString().trim().toLowerCase();
    if (profileEmail && STAFF_HEAD_EMAIL_OVERRIDES.has(profileEmail)) return true;
    if (hasRoleToken(profile.role, "0")) return true;

    const yyList = new Set();
    if (Array.isArray(profile.divisionCodesYY)) {
      profile.divisionCodesYY.forEach((item) => {
        const code = normalizeCode2(item);
        if (code) yyList.add(code);
      });
    }
    [profile.divisionCodeYY, profile.positionCodeYY].forEach((item) => {
      const code = normalizeCode2(item);
      if (code) yyList.add(code);
    });
    if (Array.isArray(profile.positions)) {
      profile.positions.forEach((entry) => {
        const code = normalizeCode2(entry?.yy || entry?.positionCodeYY || entry?.divisionCodeYY || "");
        if (code) yyList.add(code);
      });
    }
    const positionText = normalizePositionText(profile.position || "");
    return yyList.has("00") || positionText === "เหรัญญิก" || positionText === "เลขานุการฝ่ายเหรัญญิก";
  };

  const toSafeText = shared.escapeHtml;
  const normalizePositionText = shared.normalizePositionText;
  const normalizeCode2 = shared.normalizeCode2;
  const isValidDivisionCodeYY = (value) => /^\d{2}$/.test(normalizeCode2(value));
  const isValidLevelCodeZZ = (value) => ["01", "02", "03", "04"].includes(normalizeCode2(value));
  const isKnownStaffPage = (page) => {
    const id = (page || "").toString().trim();
    return STAFF_PAGE_OPTIONS.some((item) => item.id === id) || STAFF_IMPLICIT_ALLOWED_PAGES.includes(id);
  };
  const normalizeAllowedPageId = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    const cleaned = raw
      .replace(/^https?:\/\/[^/#?]+/i, "")
      .replace(/^\.?\/*(?:index\.html)?#?\/?/, "")
      .replace(/^#\/?/, "")
      .replace(/^\/+/, "")
      .replace(/[?#].*$/, "");
    const lowered = cleaned.toLowerCase();
    const kebab = cleaned
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase();
    const compact = kebab.replace(/[\s_/]+/g, "-");
    const byDirectId = STAFF_PAGE_OPTIONS.find((item) => item.id === raw || item.id === lowered || item.id === compact);
    if (byDirectId) return byDirectId.id;
    if (STAFF_IMPLICIT_ALLOWED_PAGES.includes(cleaned) || STAFF_IMPLICIT_ALLOWED_PAGES.includes(lowered) || STAFF_IMPLICIT_ALLOWED_PAGES.includes(compact)) {
      return compact;
    }
    const byLabel = STAFF_PAGE_OPTIONS.find((item) => item.label === raw || item.label === cleaned);
    if (byLabel) return byLabel.id;
    const aliases = new Map([
      ["dashboard", "dashboard-staff"],
      ["staff-dashboard", "dashboard-staff"],
      ["ภาพรวมโครงการ", "dashboard-staff"],
      ["project-status-staff", "treasurer-handover-staff"],
      ["project-status", "treasurer-handover-staff"],
      ["treasurer-handover-staff", "treasurer-handover-staff"],
      ["คู่มือ-เหรัญญิก-อบจ", "treasurer-handover-staff"],
      ["คู่มือ เหรัญญิก อบจ.", "treasurer-handover-staff"],
      ["คู่มือ เหรัญญิก อบจ", "treasurer-handover-staff"],
      ["system-data", "system-data-staff"],
      ["health-check", "system-data-staff"],
      ["ข้อมูลระบบ", "system-data-staff"],
      ["borrow-assets", "borrow-assets-staff"],
      ["borrow-assets-staff", "borrow-assets-staff"],
      ["ยืม-คืนพัสดุ", "borrow-assets-staff"],
      ["meeting-room", "meeting-room-staff"],
      ["meeting-room-booking", "meeting-room-staff"],
      ["meeting-room-staff", "meeting-room-staff"],
      ["ห้องประชุม", "meeting-room-staff"],
      ["budget-approval", "budget-approval-staff"],
      ["budget-approval-staff", "budget-approval-staff"],
      ["คำของบประมาณ", "budget-approval-staff"],
      ["content-management", "content-management-staff"],
      ["content-management-staff", "content-management-staff"],
      ["จัดการเนื้อหา", "content-management-staff"],
      ["news", "content-news-staff"],
      ["content-news", "content-news-staff"],
      ["content-news-staff", "content-news-staff"],
      ["ข่าวสาร", "content-news-staff"],
      ["financial-docs", "content-documents-staff"],
      ["content-documents", "content-documents-staff"],
      ["content-documents-staff", "content-documents-staff"],
      ["เอกสารการเงิน", "content-documents-staff"],
      ["staff", "staff-approval"],
      ["staff-approval", "staff-approval"],
      ["สมาชิกสตาฟ", "staff-approval"],
      ["org-representative", "org-representative-approval-staff"],
      ["org-representative-approval", "org-representative-approval-staff"],
      ["org-representative-approval-staff", "org-representative-approval-staff"],
      ["ตัวแทนองค์กร", "org-representative-approval-staff"],
      ["login", "login"],
      ["เข้าสู่ระบบ", "login"],
      ["เข้าสู่ระบบ-บัญชีผู้ใช้", "login"]
    ]);
    return aliases.get(raw) || aliases.get(cleaned) || aliases.get(lowered) || aliases.get(compact) || "";
  };
  const flattenAllowedPageValues = (pages) => {
    if (Array.isArray(pages)) return pages.flatMap((item) => flattenAllowedPageValues(item));
    if (typeof pages === "string") {
      const text = pages.trim();
      if (!text) return [];
      if (text === "*" || text.toLowerCase() === "all") {
        return [...STAFF_PAGE_OPTIONS.map((item) => item.id), ...STAFF_IMPLICIT_ALLOWED_PAGES];
      }
      return text.split(/[,;|\n]+/).map((item) => item.trim()).filter(Boolean);
    }
    if (pages && typeof pages === "object") {
      const picked = ["id", "page", "pageId", "value", "name", "label", "route"]
        .map((key) => pages[key])
        .filter((item) => item !== undefined && item !== null && item !== "");
      const truthyKeys = Object.entries(pages)
        .filter(([, enabled]) => enabled === true || enabled === "true" || enabled === 1 || enabled === "1")
        .map(([key]) => key);
      return [...picked, ...truthyKeys].flatMap((item) => flattenAllowedPageValues(item));
    }
    return [];
  };
  const readAllowedPagesInput = (entry = {}) => {
    if (!entry || typeof entry !== "object") return entry;
    return (
      entry.allowedPages ??
      entry.allowedPageIds ??
      entry.allowedStaffPages ??
      entry.staffPages ??
      entry.pages ??
      entry.pageAccess ??
      entry.pagePermissions ??
      entry.permissions?.allowedPages ??
      entry.permissions?.pages ??
      entry.access?.allowedPages ??
      entry.access?.pages ??
      []
    );
  };
  const getStaffPageLabel = (page) => {
    const id = (page || "").toString().trim();
    const explicit = STAFF_PAGE_OPTIONS.find((item) => item.id === id);
    if (explicit) return explicit.label;
    if (id === "login") return "เข้าสู่ระบบ / บัญชีผู้ใช้";
    return id || "-";
  };
  const getDefaultAllowedPagesByYY = (yy) => {
    const code = normalizeCode2(yy);
    if (code === "00") {
      return [
        "dashboard-staff",
        "treasurer-handover-staff",
        "system-data-staff",
        "budget-approval-staff",
        "borrow-assets-staff",
        "meeting-room-staff",
        "staff-approval",
        "org-representative-approval-staff",
        "content-management-staff",
        "content-news-staff",
        "content-documents-staff",
        "login"
      ];
    }
    return ["login"];
  };
  const normalizeAllowedPages = (pages, fallbackYY = "") => {
    const list = flattenAllowedPageValues(pages)
      .map((item) => normalizeAllowedPageId(item))
      .filter(Boolean);
    const filtered = Array.from(new Set(list.filter((page) => isKnownStaffPage(page))));
    return filtered.length ? filtered : getDefaultAllowedPagesByYY(fallbackYY);
  };
  const normalizeConfiguredAllowedPages = (pages) => {
    const list = flattenAllowedPageValues(pages)
      .map((item) => normalizeAllowedPageId(item))
      .filter(Boolean);
    return Array.from(new Set(list.filter((page) => isKnownStaffPage(page))));
  };

  const divisionCodeLabel = (yy) => {
    const code = normalizeCode2(yy);
    const catalogItem = currentPositionCatalog.find((item) => normalizeCode2(item.divisionCodeYY || item.yy || "") === code);
    const catalogLabel = normalizePositionText(catalogItem?.divisionLabel || catalogItem?.divisionName || "");
    if (catalogLabel) return catalogLabel;
    if (code === "00") return "เหรัญญิก / เลขานุการฝ่ายเหรัญญิก";
    if (code === "01") return "ผู้ช่วยเหรัญญิก";
    if (code === "02") return "บริหารและพัฒนางบประมาณ";
    if (code === "03") return "หาทุนและสิทธิประโยชน์";
    if (code === "04") return "กายภาพและพัสดุ";
    if (code === "09") return "เจ้าหน้าที่สำนักบริหารกิจการนิสิต";
    return code ? `หมวดงาน ${code}` : "-";
  };

  const levelCodeLabel = (zz) => {
    const code = normalizeCode2(zz);
    if (code === "01") return "ประธานฝ่าย";
    if (code === "02") return "รองประธานฝ่าย";
    if (code === "03") return "เลขานุการฝ่าย";
    if (code === "04") return "ผู้ช่วยฝ่าย";
    return "-";
  };

  const buildPositionNameFromParts = (divisionCodeYY, levelCodeZZ, divisionLabelRaw = "") => {
    const yy = normalizeCode2(divisionCodeYY);
    const zz = normalizeCode2(levelCodeZZ);
    const divisionLabel = normalizePositionText(divisionLabelRaw || divisionCodeLabel(yy));
    const levelLabel = levelCodeLabel(zz);
    if (yy === "00") {
      if (zz === "01") return "เหรัญญิก";
      if (zz === "03") return "เลขานุการฝ่ายเหรัญญิก";
      if (zz === "04") return "ผู้ช่วยเหรัญญิก";
    }
    if (yy === "01" && divisionLabel) return divisionLabel;
    if (yy === "09" && divisionLabel) return divisionLabel;
    if (!divisionLabel || divisionLabel === "-" || !levelLabel || levelLabel === "-") return "";
    const divisionCore = divisionLabel.replace(/^ฝ่าย\s*/u, "");
    return `${levelLabel}${divisionCore}`;
  };

  const getAcademicYearCodeXX = () => {
    if (typeof getCurrentAcademicYearBE === "function") {
      const beYear = Number(getCurrentAcademicYearBE());
      if (Number.isFinite(beYear) && beYear > 0) {
        return String(beYear).slice(-2).padStart(2, "0");
      }
    }
    const now = new Date();
    const yearCE = now.getFullYear();
    const month = now.getMonth() + 1;
    const academicYearCE = month >= 6 ? yearCE : yearCE - 1;
    const academicYearBE = academicYearCE + 543;
    return String(academicYearBE).slice(-2).padStart(2, "0");
  };

  const resolveDivisionCodeYY = (positionText) => {
    const normalized = normalizePositionText(positionText);
    if (!normalized) return "00";
    if (normalized === "เหรัญญิก" || normalized === "เลขานุการฝ่ายเหรัญญิก") return "00";
    if (normalized === "ผู้ช่วยเหรัญญิก") return "01";
    if (normalized.includes("บริหารและพัฒนางบประมาณ")) return "02";
    if (normalized.includes("หาทุนและสิทธิประโยชน์")) return "03";
    if (normalized.includes("กายภาพและพัสดุ")) return "04";
    if (normalized.includes("สำนักบริหารกิจการนิสิต")) return "09";
    return "";
  };

  const resolveLevelCodeZZ = (positionText) => {
    const normalized = normalizePositionText(positionText);
    if (!normalized) return "00";
    if (normalized === "เหรัญญิก") return "01";
    if (normalized.includes("รองประธานฝ่าย")) return "02";
    if (normalized.includes("ประธานฝ่าย")) return "01";
    if (normalized.includes("เลขานุการฝ่าย")) return "03";
    if (normalized.includes("ผู้ช่วยฝ่าย") || normalized.includes("ผู้ช่วยเหรัญญิก")) return "04";
    if (normalized.includes("เลขานุการ")) return "03";
    if (normalized.includes("ผู้ช่วย")) return "04";
    return "00";
  };

  const findPositionMetaByName = (positionText) => {
    const normalized = normalizePositionText(positionText).toLowerCase();
    if (!normalized) return null;
    return currentPositionCatalog.find(
      (item) => normalizePositionText(item.name).toLowerCase() === normalized
    ) || null;
  };

  const buildPositionCodePrefix = (xx, yy, zz) => `SGCU${xx}.10.${yy}.${zz}`;

  const reserveApplicationOrderAAA = async (xx, yy, zz) => {
    const key = `${xx}-10-${yy}-${zz}`;
    if (firestore.runTransaction && firestore.doc && firestore.db) {
      const ref = firestore.doc(firestore.db, COLLECTION_POSITION_CODE_COUNTERS, key);
      const nextSeq = await firestore.runTransaction(firestore.db, async (transaction) => {
        const snap = await transaction.get(ref);
        const currentSeq = Number(snap?.data?.()?.lastSeq || 0);
        const safeCurrent = Number.isFinite(currentSeq) && currentSeq >= 0 ? currentSeq : 0;
        const next = safeCurrent + 1;
        transaction.set(
          ref,
          {
            key,
            xx,
            yy,
            zz,
            lastSeq: next,
            updatedAt: firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString()
          },
          { merge: true }
        );
        return next;
      });
      return Number(nextSeq);
    }

    const prefix = `${buildPositionCodePrefix(xx, yy, zz)}-`;
    const fallbackSeq =
      currentApprovedHistory.filter((item) =>
        (item.approvedPositionCode || "").toString().startsWith(prefix)
      ).length + 1;
    return fallbackSeq;
  };

  const buildApprovedPositionCode = async (positionText) => {
    const xx = getAcademicYearCodeXX();
    const catalogMeta = findPositionMetaByName(positionText);
    const normalizedPosition = normalizePositionText(positionText);
    const inferredYY = resolveDivisionCodeYY(positionText);
    const forcedTreasurerYY =
      normalizedPosition === "เหรัญญิก" ||
      normalizedPosition === "เลขานุการฝ่ายเหรัญญิก" ||
      normalizedPosition === "ผู้ช่วยเหรัญญิก";
    const fallbackYY = inferredYY;
    const catalogYY = normalizeCode2(catalogMeta?.divisionCodeYY || "");
    const yy = forcedTreasurerYY
      ? fallbackYY
      : isValidDivisionCodeYY(catalogYY)
        ? catalogYY
        : fallbackYY;
    let zz = catalogMeta?.levelCodeZZ
      ? normalizeCode2(catalogMeta.levelCodeZZ)
      : resolveLevelCodeZZ(positionText);
    if (!isValidLevelCodeZZ(zz)) {
      if (yy === "00") zz = normalizePositionText(positionText).includes("เลขานุการ") ? "03" : "01";
      else if (yy === "01") zz = "04";
      else zz = "04";
    }
    if (!isValidDivisionCodeYY(yy) || !isValidLevelCodeZZ(zz)) {
      throw new Error("position-code-segment-unresolved");
    }
    const seq = await reserveApplicationOrderAAA(xx, yy, zz);
    const aaa = String(seq).padStart(3, "0");
    const code = `${buildPositionCodePrefix(xx, yy, zz)}-${aaa}`;
    return { code, xx, yy, zz, aaa };
  };

  const slugifyPosition = shared.slugifyPosition;
  const formatDateTime = shared.formatDateTime;
  const getCurrentAcademicYearBE = shared.getCurrentAcademicYearBE;

  currentOrgRepresentativeAcademicYear = String(getCurrentAcademicYearBE());

  const getAcademicYearFromTimestamp = shared.getAcademicYearFromTimestamp;

  const getOrgRepresentativeAcademicYear = (item = {}) => {
    const explicit = (item.academicYear || item.representativeAcademicYear || item.schoolYear || "").toString().trim();
    if (/^\d{4}$/.test(explicit)) return explicit;
    return getAcademicYearFromTimestamp(item.createdAt || item.reviewedAt || item.updatedAt) || String(getCurrentAcademicYearBE());
  };

  const isMeaningfulProfileValue = shared.isMeaningfulProfileValue;
  const getMeaningfulProfileValue = shared.getMeaningfulProfileValue;
  const deriveAcademicProfile = (profile = {}, email = "", referenceValue = new Date()) =>
    shared.deriveAcademicProfile(profile, email, referenceValue, {
      facultyMap: STUDENT_FACULTY_MAP,
      isAlumniEmail: isAlumniChulaEmail
    });

  const mapStatusBadge = (status) => {
    const normalized = (status || "pending").toString().trim().toLowerCase();
    if (normalized === "approved") return '<span class="badge badge-approved">อนุมัติแล้ว</span>';
    if (normalized === "rejected") return '<span class="badge badge-rejected">ไม่อนุมัติ</span>';
    return '<span class="badge badge-pending">รออนุมัติ</span>';
  };

  const toPositionEntry = (entry = {}) => ({
    name: normalizePositionText(entry.name || entry.position || ""),
    code: (entry.code || entry.positionCode || "").toString().trim(),
    yy: normalizeCode2(entry.yy || entry.positionCodeYY || entry.divisionCodeYY || ""),
    zz: normalizeCode2(entry.zz || entry.positionCodeZZ || entry.levelCodeZZ || ""),
    allowedPages: normalizeAllowedPages(readAllowedPagesInput(entry), entry.yy || entry.positionCodeYY || entry.divisionCodeYY || ""),
    sourceApplicationId: (entry.sourceApplicationId || "").toString().trim(),
    approvedAt: entry.approvedAt || null
  });

  const normalizePositionsArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    const list = arr
      .map((item) => toPositionEntry(item))
      .filter((item) => item.name || item.code);
    const unique = new Map();
    list.forEach((item) => {
      const key = `${item.sourceApplicationId || "-"}|${item.code || "-"}|${item.name.toLowerCase()}`;
      if (!unique.has(key)) unique.set(key, item);
    });
    return Array.from(unique.values());
  };

  const extractExistingPositionsFromProfile = (profileData = {}) => {
    const fromArray = normalizePositionsArray(profileData.positions || []);
    if (fromArray.length) return fromArray;
    const legacyName = normalizePositionText(profileData.position || "");
    const legacyCode = (profileData.positionCode || "").toString().trim();
    const legacyYY = normalizeCode2(profileData.positionCodeYY || profileData.divisionCodeYY || "");
    if (!legacyName && !legacyCode) return [];
    return normalizePositionsArray([
      {
        name: legacyName,
        code: legacyCode,
        yy: legacyYY,
        sourceApplicationId: (profileData.sourceApplicationId || "").toString().trim()
      }
    ]);
  };

  const deriveLegacyRoleFromPositions = (positions = []) => {
    const hasHead = positions.some((item) => normalizeCode2(item.yy) === "00");
    return hasHead ? "0" : "1";
  };

  const buildProfileFieldsFromPositions = (positions = []) => {
    const normalized = normalizePositionsArray(positions);
    const primary = normalized[0] || null;
    const allowedPages = Array.from(
      new Set(
        normalized
          .flatMap((item) => normalizeConfiguredAllowedPages(item.allowedPages || []))
          .filter(Boolean)
      )
    );
    return {
      positions: normalized,
      role: normalized.length ? deriveLegacyRoleFromPositions(normalized) : "",
      position: primary?.name || "",
      positionCode: primary?.code || "",
      positionCodeYY: primary?.yy || "",
      divisionCodeYY: primary?.yy || "",
      divisionCodesYY: Array.from(new Set(normalized.map((item) => normalizeCode2(item.yy)).filter(Boolean))),
      allowedPages
    };
  };

  const sameStringList = (left = [], right = []) => {
    const normalize = (value) => Array.from(new Set((Array.isArray(value) ? value : []).map((item) => (item || "").toString().trim()).filter(Boolean))).sort();
    const a = normalize(left);
    const b = normalize(right);
    return a.length === b.length && a.every((item, index) => item === b[index]);
  };

  const syncStaffProfilesWithPositionCatalog = async () => {
    if (positionAccessSyncInFlight || !isSuperStaff() || !firestore.getDocs) return 0;
    const signature = JSON.stringify(
      currentPositionCatalog.map((item) => [
        normalizePositionText(item.name).toLowerCase(),
        normalizeCode2(item.divisionCodeYY),
        normalizeCode2(item.levelCodeZZ),
        normalizeConfiguredAllowedPages(item.allowedPages).sort()
      ])
    );
    if (!signature || signature === "[]" || signature === lastPositionAccessSyncSignature) return 0;

    positionAccessSyncInFlight = true;
    try {
      const snapshot = await firestore.getDocs(firestore.collection(firestore.db, COLLECTION_PROFILES));
      const writes = [];
      (snapshot?.docs || []).forEach((docSnap) => {
        const profile = docSnap.data() || {};
        const positions = Array.isArray(profile.positions) ? profile.positions : [];
        let changed = false;
        const nextPositions = positions.map((entry) => {
          const normalizedEntry = toPositionEntry(entry);
          const catalogMeta = findPositionAccessMeta(normalizedEntry.name, normalizedEntry.yy, normalizedEntry.zz);
          if (!catalogMeta) return normalizedEntry;
          const catalogPages = normalizeConfiguredAllowedPages(catalogMeta.allowedPages);
          if (sameStringList(normalizedEntry.allowedPages, catalogPages)) return normalizedEntry;
          changed = true;
          return { ...normalizedEntry, allowedPages: catalogPages };
        });
        if (!changed) return;
        const nextProfile = buildProfileFieldsFromPositions(nextPositions);
        writes.push({ ref: docSnap.ref, data: { ...nextProfile, updatedAt: firestore.serverTimestamp() } });
      });

      for (let index = 0; index < writes.length; index += 400) {
        const chunk = writes.slice(index, index + 400);
        if (firestore.writeBatch) {
          const batch = firestore.writeBatch(firestore.db);
          chunk.forEach((write) => batch.set(write.ref, write.data, { merge: true }));
          await batch.commit();
        } else {
          await Promise.all(chunk.map((write) => firestore.setDoc(write.ref, write.data, { merge: true })));
        }
      }
      lastPositionAccessSyncSignature = signature;
      return writes.length;
    } finally {
      positionAccessSyncInFlight = false;
    }
  };

  const getConfiguredAllowedPagesForCatalogPosition = (item = {}) => {
    return normalizeConfiguredAllowedPages(readAllowedPagesInput(item));
  };

  const findPositionAccessMeta = (positionText, yyHint = "", zzHint = "") => {
    const normalized = normalizePositionText(positionText).toLowerCase();
    const yy = normalizeCode2(yyHint || "");
    const zz = normalizeCode2(zzHint || "");
    const exact = currentPositionCatalog.find((item) => normalizePositionText(item.name).toLowerCase() === normalized) || null;
    if (exact) return exact;
    if (yy && zz) {
      return currentPositionCatalog.find(
        (item) => normalizeCode2(item.divisionCodeYY) === yy && normalizeCode2(item.levelCodeZZ) === zz
      ) || null;
    }
    return null;
  };

  const setMessage = (el, text = "", color = "#6b7280") => {
    if (!el) return;
    el.textContent = text;
    el.style.color = color;
  };

  const markOrgRepresentativeOrganizationsDirty = () => {
    orgRepresentativeOrganizationsDirty = true;
    orgRepresentativeResolveCache = new WeakMap();
  };

  const invalidateOrgRepresentativeCatalogIndex = () => {
    orgRepresentativeCatalogIndexCache = {
      signature: "",
      rows: [],
      byId: new Map(),
      byBaseId: new Map(),
      byGroup: new Map(),
      byCodeGroup: new Map(),
      byRunGroup: new Map(),
      byNameGroup: new Map()
    };
    markOrgRepresentativeOrganizationsDirty();
  };

  const refreshAccessProfileForCurrentUser = async ({ force = false } = {}) => {
    const email = getCurrentAuthEmail();
    if (!email) {
      currentAccessProfile = null;
      currentAccessProfileEmail = "";
      currentAccessProfileLoadingEmail = "";
      return null;
    }
    if (!force && currentAccessProfileEmail === email) {
      return currentAccessProfile;
    }
    if (currentAccessProfileLoadingEmail === email) {
      return currentAccessProfile;
    }
    if (!resolveStore() || !firestore.getDoc || !firestore.doc || !firestore.db) {
      return currentAccessProfile;
    }

    currentAccessProfileLoadingEmail = email;
    try {
      const profileRef = firestore.doc(firestore.db, COLLECTION_PROFILES, email);
      const snap = await firestore.getDoc(profileRef);
      const data = snap?.exists?.() ? (snap.data() || {}) : null;
      currentAccessProfile = data ? { email, ...data } : null;
      currentAccessProfileEmail = email;
      if (
        data &&
        typeof staffProfilesByEmail !== "undefined" &&
        staffProfilesByEmail &&
        typeof staffProfilesByEmail === "object"
      ) {
        staffProfilesByEmail[email] = { ...(staffProfilesByEmail[email] || {}), ...data };
      }
      setApprovalAvailabilityByRole();
      return currentAccessProfile;
    } catch (error) {
      console.warn("load current staff access profile failed - app.staff-access.js:1804", error);
      return currentAccessProfile;
    } finally {
      if (currentAccessProfileLoadingEmail === email) {
        currentAccessProfileLoadingEmail = "";
      }
    }
  };

  const escapeStaffHtml = (value) =>
    typeof escapeHtml === "function"
      ? escapeHtml(value)
      : (value ?? "")
          .toString()
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\"", "&quot;")
          .replaceAll("'", "&#39;");

