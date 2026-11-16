  const normalizeBool = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
  };

  const parseNumber = (value) => {
    const num = Number(String(value || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };

  const OTHER_ORG_VALUE = "__other__";
  const EXTERNAL_ORG_FILTER_VALUE = "__external__";
  const EXTERNAL_ORG_LABEL = "หน่วยงานภายนอก / อื่น ๆ";
  const parseBorrowAcademicReferenceDate = (value) => {
    if (!value) return new Date();
    if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
    const source = value && typeof value === "object" && value.date !== undefined ? value.date : value;
    const date = typeof source?.toDate === "function" ? source.toDate() : new Date(source);
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  };

  const getBorrowAcademicYearBE = (referenceValue = new Date()) => {
    const referenceDate = parseBorrowAcademicReferenceDate(referenceValue) || new Date();
    const yearCE = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    return String((month >= 6 ? yearCE : yearCE - 1) + 543);
  };

  const deriveBorrowStudentYearFromId = (studentId, referenceValue = new Date()) => {
    const digits = (studentId || "").toString().trim().replace(/\D/g, "");
    if (!/^\d{10}$/.test(digits)) return "";
    const entryPrefix = Number(digits.slice(0, 2));
    const entryAcademicBE = Number.isFinite(entryPrefix) ? 2500 + entryPrefix : NaN;
    const referenceAcademicBE = Number(getBorrowAcademicYearBE(referenceValue));
    const yearLevel = Number.isFinite(entryAcademicBE) && Number.isFinite(referenceAcademicBE)
      ? referenceAcademicBE - entryAcademicBE + 1
      : NaN;
    return isAlumniChulaEmail(referenceValue?.email || referenceValue?.authEmail)
      ? "นิสิตเก่า"
      : Number.isFinite(yearLevel) && yearLevel >= 1 && yearLevel <= 8 ? String(yearLevel) : "";
  };

  const normalizeBorrowProfileAcademicSnapshot = (profile = {}, referenceValue = new Date()) => {
    const safeProfile = profile && typeof profile === "object" ? profile : {};
    const studentId = (safeProfile.studentId || "").toString().trim();
    const email = (safeProfile.authEmail || readCurrentUserEmail()).toString().trim().toLowerCase();
    return {
      ...safeProfile,
      year: deriveBorrowStudentYearFromId(studentId, { date: referenceValue, email }) || (safeProfile.year || "").toString()
    };
  };

  const updateBorrowAcademicYearDisplay = () => {
    if (borrowAcademicYearDisplayEl) {
      borrowAcademicYearDisplayEl.textContent = `ปีการศึกษา ${getBorrowAcademicYearBE()}`;
    }
  };

  const normalizeBorrowYearValueMap = (value = {}) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce((acc, [year, itemValue]) => {
      const normalizedYear = (year || "").toString().trim();
      const normalizedValue = (itemValue || "").toString().trim();
      if (/^\d{4}$/.test(normalizedYear) && normalizedValue) {
        acc[normalizedYear] = normalizedValue;
      }
      return acc;
    }, {});
  };

  const resolveBorrowYearValue = (map = {}, academicYear = getBorrowAcademicYearBE()) => {
    const normalizedMap = normalizeBorrowYearValueMap(map);
    const year = Number((academicYear || "").toString().trim());
    if (!Number.isFinite(year)) return "";
    if (normalizedMap[String(year)]) return normalizedMap[String(year)];
    const previousYear = Object.keys(normalizedMap)
      .map((key) => Number(key))
      .filter((itemYear) => Number.isFinite(itemYear) && itemYear < year)
      .sort((a, b) => b - a)[0];
    return previousYear ? normalizedMap[String(previousYear)] || "" : "";
  };

  const getBorrowOrgNameYearMap = (item = {}) => ({
    ...normalizeBorrowYearValueMap(item?.orgNameByAcademicYear),
    ...normalizeBorrowYearValueMap(item?.organizationNameByAcademicYear),
    ...normalizeBorrowYearValueMap(item?.nameByAcademicYear)
  });

  const getBorrowOrgCodeYearMap = (item = {}) => ({
    ...normalizeBorrowYearValueMap(item?.orgCodeByAcademicYear),
    ...normalizeBorrowYearValueMap(item?.codeByAcademicYear)
  });

  const resolveBorrowOrgDisplayName = (item = {}, academicYear = getBorrowAcademicYearBE()) =>
    resolveBorrowYearValue(getBorrowOrgNameYearMap(item), academicYear) ||
    (item?.name || item?.organizationName || item?.orgName || "").toString().trim();

  const resolveBorrowOrgCodeForYear = (item = {}, academicYear = getBorrowAcademicYearBE()) =>
    normalizeOrgCode(
      resolveBorrowYearValue(getBorrowOrgCodeYearMap(item), academicYear) ||
      item?.code ||
      item?.orgCode ||
      ""
    );

  const projectMatchesBorrowAcademicYear = (project = {}, academicYear = getBorrowAcademicYearBE()) => {
    const projectYear = (project?.year || project?.academicYear || project?.schoolYear || "").toString().trim();
    if (!projectYear) return false;
    return projectYear === (academicYear || "").toString().trim();
  };

  const collectBorrowOrgTypeOptions = () => {
    const academicYear = getBorrowAcademicYearBE();
    const fromFilters =
      typeof orgFilters !== "undefined" && Array.isArray(orgFilters)
        ? orgFilters
          .filter((item) => resolveBorrowOrgDisplayName(item, academicYear))
          .map((item) => (item?.group || "").toString().trim())
        : [];
    const fromProjects =
      typeof projects !== "undefined" && Array.isArray(projects)
        ? projects
          .filter((item) => projectMatchesBorrowAcademicYear(item, academicYear))
          .map((item) => (item?.orgGroup || "").toString().trim())
        : [];
    return Array.from(new Set([...fromFilters, ...fromProjects].filter(Boolean)))
      .sort((a, b) => b.localeCompare(a, "th"));
  };

  const compareBorrowOrgNameByCode = (a, b, codeByName = new Map()) => {
    const codeA = (codeByName.get(a) || "").toString().trim();
    const codeB = (codeByName.get(b) || "").toString().trim();
    if (codeA && codeB) {
      const codeCompare = codeA.localeCompare(codeB, "th", { numeric: true });
      if (codeCompare) return codeCompare;
    } else if (codeA || codeB) {
      return codeA ? -1 : 1;
    }
    return a.localeCompare(b, "th");
  };

  const collectBorrowOrgNameOptions = (orgType) => {
    const selectedType = (orgType || "").toString().trim();
    if (!selectedType || selectedType === OTHER_ORG_VALUE) return [];
    const codeByName = new Map();
    const fromFilters = [];
    const academicYear = getBorrowAcademicYearBE();
    if (typeof orgFilters !== "undefined" && Array.isArray(orgFilters)) {
      orgFilters
        .filter((item) => (item?.group || "").toString().trim() === selectedType)
        .forEach((item) => {
          const name = resolveBorrowOrgDisplayName(item, academicYear);
          if (!name) return;
          const code = resolveBorrowOrgCodeForYear(item, academicYear);
          if (code && !codeByName.has(name)) codeByName.set(name, code);
          fromFilters.push(name);
        });
    }
    const fromProjects =
      typeof projects !== "undefined" && Array.isArray(projects)
        ? projects
          .filter((item) => projectMatchesBorrowAcademicYear(item, academicYear))
          .filter((item) => (item?.orgGroup || "").toString().trim() === selectedType)
          .map((item) => (item?.orgName || "").toString().trim())
        : [];
    return Array.from(new Set([...fromFilters, ...fromProjects].filter(Boolean)))
      .sort((a, b) => compareBorrowOrgNameByCode(a, b, codeByName));
  };

  const toggleBorrowProjectNameOther = () => {
    if (!borrowProjectNameOther || !borrowProjectName) return;
    const showOther = borrowProjectName.value === OTHER_ORG_VALUE;
    borrowProjectNameOther.style.display = showOther ? "" : "none";
    borrowProjectNameOther.required = showOther;
    if (!showOther) {
      borrowProjectNameOther.value = "";
    }
  };

  const populateBorrowProjectTypeOptions = () => {
    if (!(borrowProjectName instanceof HTMLSelectElement)) return;
    const currentValue = borrowProjectName.value;
    while (borrowProjectName.options.length) {
      borrowProjectName.remove(0);
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "เลือกประเภทองค์กร";
    placeholder.disabled = true;
    placeholder.selected = true;
    borrowProjectName.appendChild(placeholder);

    const options = collectBorrowOrgTypeOptions();
    options.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      borrowProjectName.appendChild(option);
    });

    const otherOption = document.createElement("option");
    otherOption.value = OTHER_ORG_VALUE;
    otherOption.textContent = EXTERNAL_ORG_LABEL;
    borrowProjectName.appendChild(otherOption);

    if (currentValue) {
      const hasCurrent = Array.from(borrowProjectName.options).some((opt) => opt.value === currentValue);
      if (hasCurrent) {
        borrowProjectName.value = currentValue;
      } else if (borrowProjectNameOther && currentValue !== OTHER_ORG_VALUE) {
        borrowProjectName.value = OTHER_ORG_VALUE;
        borrowProjectNameOther.value = currentValue;
      }
    }
    toggleBorrowProjectNameOther();
  };

  const getBorrowProjectNameValueForSubmit = () => {
    const selected = (borrowProjectName?.value || "").toString().trim();
    if (selected === OTHER_ORG_VALUE) {
      return (borrowProjectNameOther?.value || "").toString().trim();
    }
    return selected;
  };

  const usesManualBorrowDept = () =>
    borrowProjectName?.value === OTHER_ORG_VALUE ||
    (borrowProjectName?.value === BORROW_PROJECT_ORG && !!borrowManagedProject?.value);

  const getBorrowDeptLabel = () => {
    const type = borrowProjectName?.value || "";
    if (type.includes("ชมรม")) return "ชมรม";
    if (type.includes("องค์การบริหาร") || type.includes("สภานิสิต")) return "ฝ่าย";
    return "หน่วยงาน";
  };

  const populateBorrowProjectDeptOptions = () => {
    if (!borrowProjectDept || !borrowProjectDeptOther) return;
    const manual = usesManualBorrowDept();
    const selectedType = borrowProjectName?.value || "";
    const current = borrowProjectDept.value;
    const deptLabel = getBorrowDeptLabel();
    borrowProjectDept.style.display = manual ? "none" : "";
    borrowProjectDept.disabled = manual || !selectedType;
    borrowProjectDept.required = !manual;
    borrowProjectDeptOther.style.display = manual ? "" : "none";
    borrowProjectDeptOther.disabled = !manual;
    borrowProjectDeptOther.required = manual;
    const label = document.querySelector('label[for="borrowProjectDept"], label[for="borrowProjectDeptOther"]');
    if (label) {
      label.htmlFor = manual ? "borrowProjectDeptOther" : "borrowProjectDept";
      label.innerHTML = `${deptLabel} <span class="borrow-required" aria-hidden="true">*</span>`;
    }
    borrowProjectDeptOther.placeholder = `กรอกชื่อ${deptLabel}ที่รับผิดชอบ`;
    const hint = document.getElementById("borrowDeptHint");
    if (hint) hint.textContent = manual
      ? `กรอกชื่อ${deptLabel}ที่รับผิดชอบการยืมครั้งนี้`
      : selectedType ? `เลือก${deptLabel}ที่รับผิดชอบการยืมจากรายการ` : "กรุณาเลือกประเภทองค์กรด้านบนก่อน";
    if (manual) return;
    const names = selectedType ? collectBorrowOrgNameOptions(selectedType) : [];
    borrowProjectDept.innerHTML = `<option value="">${selectedType ? `เลือก${deptLabel}` : "เลือกประเภทองค์กรก่อน"}</option>` +
      names.map(name => `<option value="${safeEscape(name)}">${safeEscape(name)}</option>`).join("");
    if (names.includes(current)) borrowProjectDept.value = current;
  };

  const getBorrowProjectDeptValueForSubmit = () =>
    ((usesManualBorrowDept() ? borrowProjectDeptOther : borrowProjectDept)?.value || "").toString().trim();

  const normalizeOrgCode = (value) => {
    const raw = (value || "").toString().trim().toUpperCase().replace(/\s+/g, "");
    if (!raw) return "";
    const normalized = raw
      .replace(/-/g, ".")
      .replace(/\.{2,}/g, ".")
      .replace(/^\./, "")
      .replace(/\.$/, "");
    if (!/^[A-Z0-9.]+$/.test(normalized)) return "";
    return normalized;
  };

  const hasBorrowOrgCodeData = () => {
    const rows =
      typeof orgFilters !== "undefined" && Array.isArray(orgFilters) ? orgFilters : [];
    return rows.some((item) => normalizeOrgCode(item?.code || ""));
  };

  const ensureBorrowOrgCodeData = async () => {
    if (hasBorrowOrgCodeData()) return;
    if (typeof loadOrgFilters === "function") {
      try {
        await loadOrgFilters();
      } catch (_) {
        // ignore and fallback
      }
    }
    if (hasBorrowOrgCodeData()) return;
    if (typeof ensureProjectDataLoaded === "function") {
      try {
        await ensureProjectDataLoaded();
      } catch (_) {
        // ignore and fallback
      }
    }
  };

  const resolveBorrowOrgCode = () => {
    const selectedType = (borrowProjectName?.value || "").toString().trim();
    if (!selectedType || selectedType === OTHER_ORG_VALUE) return "CU.00";
    const academicYear = getBorrowAcademicYearBE();
    const rows =
      typeof orgFilters !== "undefined" && Array.isArray(orgFilters) ? orgFilters : [];
    if (!rows.length) return "";
    if (!usesManualBorrowDept()) {
      const selectedDept = getBorrowProjectDeptValueForSubmit();
      const exact = rows.find(item => (item?.group || "").toString().trim() === selectedType &&
        resolveBorrowOrgDisplayName(item, academicYear) === selectedDept);
      const exactCode = resolveBorrowOrgCodeForYear(exact, academicYear);
      if (exactCode) return exactCode;
    }
    const firstByGroup = rows.find((item) => {
      const group = (item?.group || "").toString().trim();
      return group === selectedType && resolveBorrowOrgCodeForYear(item, academicYear);
    });
    const groupCode = resolveBorrowOrgCodeForYear(firstByGroup, academicYear);
    return groupCode || "";
  };

  const getBorrowTermYearTwoDigits = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date();
    if (Number.isNaN(d.getTime())) return "00";
    const beYear = d.getFullYear() + 543;
    const month = d.getMonth(); // 0-11
    const termStartYear = month >= 5 ? beYear : beYear - 1; // เริ่มนับวาระ 1 มิ.ย.
    return String(termStartYear % 100).padStart(2, "0");
  };

  const getNextBorrowRequestRunning = (prefix) => {
    const normalizedPrefix = (prefix || "").toString().trim();
    if (!normalizedPrefix) return "001";
    const expectedPrefix = `${normalizedPrefix}.`;
    let maxRunning = 0;
    borrowRequests.forEach((item) => {
      const requestNo = (item?.requestNo || "").toString().trim().toUpperCase();
      if (!requestNo.startsWith(expectedPrefix)) return;
      const runningText = requestNo.slice(expectedPrefix.length);
      if (!/^\d+$/.test(runningText)) return;
      const runningNum = Number(runningText);
      if (Number.isFinite(runningNum) && runningNum > maxRunning) {
        maxRunning = runningNum;
      }
    });
    return String(maxRunning + 1).padStart(3, "0");
  };

  const getBorrowRequestNoParts = () => {
    const termYY = getBorrowTermYearTwoDigits(new Date());
    const orgCode = resolveBorrowOrgCode();
    if (!orgCode) return null;
    const prefix = `B${termYY}.${orgCode}`;
    return { termYY, orgCode, prefix };
  };

  const createBorrowRequestWithNextNumber = async (payload) => {
    const numberParts = getBorrowRequestNoParts();
    if (!numberParts) throw Object.assign(new Error("Missing borrowing organization code"), { code: "borrow/missing-org-code" });

    const { termYY, orgCode, prefix } = numberParts;
    const requestRef = firestore.doc(
      firestore.collection(firestore.db, BORROW_REQUEST_COLLECTION)
    );

    if (typeof firestore.runTransaction !== "function") {
      const running = getNextBorrowRequestRunning(prefix);
      payload.requestNo = `${prefix}.${running}`;
      await firestore.setDoc(requestRef, payload);
      return requestRef;
    }

    const counterRef = firestore.doc(
      firestore.db,
      BORROW_REQUEST_COUNTER_COLLECTION,
      prefix
    );
    await firestore.runTransaction(firestore.db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const storedRunning = Number(counterSnap?.data?.()?.lastRunning || 0);
      const visibleRunning = Number(getNextBorrowRequestRunning(prefix)) - 1;
      // Existing counters are authoritative: Rules require an increment of exactly one.
      // Use visible legacy requests only when initializing a missing counter.
      const currentRunning = counterSnap.exists()
        ? storedRunning
        : (Number.isFinite(visibleRunning) ? visibleRunning : 0);
      const nextRunning = currentRunning + 1;
      const requestNo = `${prefix}.${String(nextRunning).padStart(3, "0")}`;
      payload.requestNo = requestNo;

      transaction.set(counterRef, {
        prefix,
        termYY,
        orgCode,
        lastRunning: nextRunning,
        updatedAt: firestore.serverTimestamp()
      });
      transaction.set(requestRef, payload);
    });
    return requestRef;
  };

  const readCurrentUserEmail = () =>
    (window.sgcuAuth?.auth?.currentUser?.email || "").toString().trim().toLowerCase();

  const readCurrentAccountEmail = () => normalizeAccountEmail(readCurrentUserEmail());

  const matchesCurrentAccountEmail = (email, accountEmail = "") => {
    const currentAccount = readCurrentAccountEmail();
    if (!currentAccount) return false;
    return normalizeAccountEmail(accountEmail || email) === currentAccount ||
      normalizeAccountEmail(email) === currentAccount;
  };

  const STAFF_PROFILE_COLLECTION =
    appConfig.firestore?.collections?.staffProfiles || "staffProfiles";
  const STAFF_HEAD_EMAILS = new Set([
    "tuwanon.kimchiang@gmail.com",
    "treasurer.sgcu68@gmail.com"
  ]);
  const BORROW_STAFF_PAGE_ALIASES = new Set([
    "borrow-assets-staff",
    "borrow-assets",
    "ยืม-คืนพัสดุ"
  ]);

  const flattenPageValues = (value) => {
    if (Array.isArray(value)) return value.flatMap((item) => flattenPageValues(item));
    if (typeof value === "string") {
      return value
        .split(/[,;|\n]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (value && typeof value === "object") {
      const picked = ["id", "page", "pageId", "value", "name", "label", "route"]
        .map((key) => value[key])
        .filter((item) => item !== undefined && item !== null && item !== "");
      const truthyKeys = Object.entries(value)
        .filter(([, enabled]) => enabled === true || enabled === "true" || enabled === 1 || enabled === "1")
        .map(([key]) => key);
      return [...picked, ...truthyKeys].flatMap((item) => flattenPageValues(item));
    }
    return [];
  };

  const readPageListInput = (entry = {}) => {
    if (!entry || typeof entry !== "object") return [];
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

  const hasBorrowStaffPage = (entry = {}) =>
    flattenPageValues(readPageListInput(entry)).some((page) => BORROW_STAFF_PAGE_ALIASES.has(page));

  const hasExplicitPageList = (entry = {}) => {
    if (!entry || typeof entry !== "object") return false;
    return [
      entry.allowedPages,
      entry.allowedPageIds,
      entry.allowedStaffPages,
      entry.staffPages,
      entry.pages,
      entry.pageAccess,
      entry.pagePermissions,
      entry.permissions?.allowedPages,
      entry.permissions?.pages,
      entry.access?.allowedPages,
      entry.access?.pages
    ].some((value) => flattenPageValues(value).length > 0);
  };

  const readBorrowStaffProfileAccess = async (email) => {
    const normalizedEmail = (email || "").toString().trim().toLowerCase();
    if (!normalizedEmail) return { ok: false, reason: "no-email" };
    if (STAFF_HEAD_EMAILS.has(normalizedEmail)) return { ok: true, reason: "head-override" };
    if (!firestore.db || !firestore.doc || !firestore.getDoc) return { ok: false, reason: "store-not-ready" };

    try {
      const ref = firestore.doc(firestore.db, STAFF_PROFILE_COLLECTION, normalizedEmail);
      const snap = await firestore.getDoc(ref);
      if (!snap?.exists?.()) {
        return { ok: false, reason: "missing-profile", path: `${STAFF_PROFILE_COLLECTION}/${normalizedEmail}` };
      }
      const data = snap.data() || {};
      const positions = Array.isArray(data.positions) ? data.positions : [];
      const hasStaffShape = Boolean(
        typeof data.role === "string" ||
        typeof data.positionCodeYY === "string" ||
        typeof data.divisionCodeYY === "string" ||
        positions.length ||
        hasExplicitPageList(data)
      );
      const topLevelAccess = hasBorrowStaffPage(data);
      const positionAccess = positions.some((position) => hasBorrowStaffPage(position));
      const hasAnyExplicitPages = hasExplicitPageList(data) || positions.some((position) => hasExplicitPageList(position));
      return {
        ok: hasStaffShape && (topLevelAccess || positionAccess || !hasAnyExplicitPages),
        reason: hasStaffShape ? "profile-loaded" : "not-staff-profile",
        path: `${STAFF_PROFILE_COLLECTION}/${normalizedEmail}`,
        topLevelAccess,
        positionAccess,
        hasAnyExplicitPages
      };
    } catch (error) {
      return {
        ok: false,
        reason: (error?.code || "profile-read-failed").toString(),
        path: `${STAFF_PROFILE_COLLECTION}/${normalizedEmail}`
      };
    }
  };

  const readBorrowProfiles = () => {
    try {
      const rawPrimary = window.localStorage?.getItem(BORROW_PROFILE_STORAGE_KEY);
      const rawLegacy = window.localStorage?.getItem(LEGACY_BORROW_PROFILE_STORAGE_KEY);
      const raw = rawPrimary || rawLegacy;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const profiles = parsed && typeof parsed === "object" ? parsed : {};
      const normalizedProfiles = Object.entries(profiles).reduce((acc, [key, value]) => {
        const canonicalKey = normalizeAccountEmail(key);
        if (!canonicalKey) return acc;
        acc[canonicalKey] = {
          ...(acc[canonicalKey] || {}),
          ...(value && typeof value === "object" ? value : {})
        };
        return acc;
      }, {});
      if (!rawPrimary && rawLegacy) {
        try {
          window.localStorage?.setItem(BORROW_PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfiles));
        } catch (_) {
          // ignore local cache write errors
        }
      }
      return normalizedProfiles;
    } catch (_) {
      return {};
    }
  };

  const BORROW_PROFILE_EMPTY_TEXT = "ยังไม่พบข้อมูล";
  const setBorrowProfileText = (el, value) => {
    if (!el) return;
    const text = (value || "").toString().trim();
    el.textContent = text || BORROW_PROFILE_EMPTY_TEXT;
    el.classList.toggle("is-empty", !text);
  };

  const applyBorrowProfileToForm = (profile) => {
    if (!profile || typeof profile !== "object") return;
    const snapshotProfile = normalizeBorrowProfileAcademicSnapshot(profile);
    activeBorrowProfile = {
      firstName: (snapshotProfile.firstName || "").toString().trim(),
      lastName: (snapshotProfile.lastName || "").toString().trim(),
      nickname: (snapshotProfile.nickname || "").toString().trim(),
      studentId: (snapshotProfile.studentId || "").toString().trim(),
      faculty: (snapshotProfile.faculty || "").toString().trim(),
      year: (snapshotProfile.year || "").toString().trim(),
      phone: (snapshotProfile.phone || "").toString().trim(),
      lineId: (snapshotProfile.lineId || "").toString().trim()
    };
    const fullName = [activeBorrowProfile.firstName, activeBorrowProfile.lastName].filter(Boolean).join(" ");
    setBorrowProfileText(borrowProfileFullNameEl, fullName);
    setBorrowProfileText(borrowProfileNicknameEl, activeBorrowProfile.nickname);
    setBorrowProfileText(borrowProfileStudentIdEl, activeBorrowProfile.studentId);
    if (borrowProfileFacultyYearEl) {
      const facultyYear = [activeBorrowProfile.faculty, activeBorrowProfile.year ? `ชั้นปี ${activeBorrowProfile.year}` : ""]
        .filter(Boolean)
        .join(" / ");
      setBorrowProfileText(borrowProfileFacultyYearEl, facultyYear);
    }
    setBorrowProfileText(borrowProfilePhoneEl, activeBorrowProfile.phone);
    setBorrowProfileText(borrowProfileLineIdEl, activeBorrowProfile.lineId);
  };

  const restoreBorrowProfileForCurrentUser = () => {
    const email = normalizeAccountEmail(currentUserEmail || "");
    if (!email) {
      activeBorrowProfile = null;
      setBorrowProfileText(borrowProfileFullNameEl, "");
      setBorrowProfileText(borrowProfileNicknameEl, "");
      setBorrowProfileText(borrowProfileStudentIdEl, "");
      setBorrowProfileText(borrowProfileFacultyYearEl, "");
      setBorrowProfileText(borrowProfilePhoneEl, "");
      setBorrowProfileText(borrowProfileLineIdEl, "");
      return;
    }
    const profile = readBorrowProfiles()[email];
    if (!profile) {
      setBorrowProfileText(borrowProfileFullNameEl, "");
      setBorrowProfileText(borrowProfileNicknameEl, "");
      setBorrowProfileText(borrowProfileStudentIdEl, "");
      setBorrowProfileText(borrowProfileFacultyYearEl, "");
      setBorrowProfileText(borrowProfilePhoneEl, "");
      setBorrowProfileText(borrowProfileLineIdEl, "");
      return;
    }
    applyBorrowProfileToForm(profile);
  };

  const getBorrowProfileForSubmit = async () => {
    const email = normalizeAccountEmail(currentUserEmail || "");
    if (!email) return null;
    if (activeBorrowProfile && activeBorrowProfile.firstName && activeBorrowProfile.lastName) {
      return activeBorrowProfile;
    }
    const local = readBorrowProfiles()[email];
    if (local) {
      applyBorrowProfileToForm(local);
      return activeBorrowProfile;
    }
    const remote = await readBorrowProfileFromFirestore();
    if (remote) {
      applyBorrowProfileToForm(remote);
      return activeBorrowProfile;
    }
    return null;
  };

  const readBorrowProfileFromFirestore = async () => {
    const firestoreBridge = window.sgcuFirestore || {};
    const authUser = window.sgcuAuth?.auth?.currentUser || null;
    const email = (authUser?.email || "").toString().trim().toLowerCase();
    const uid = (authUser?.uid || "").toString().trim();
    if (!email || !uid) return null;
    if (!firestoreBridge.db || !firestoreBridge.doc || !firestoreBridge.getDoc) return null;
    try {
      const ref = firestoreBridge.doc(firestoreBridge.db, USER_PROFILE_COLLECTION, uid);
      const snap = await firestoreBridge.getDoc(ref);
      if (!snap?.exists()) return null;
      const data = snap.data() || {};
      if (!data || typeof data !== "object") return null;
      const profiles = readBorrowProfiles();
      const accountEmail = normalizeAccountEmail(email);
      profiles[accountEmail] = {
        ...(profiles[accountEmail] || {}),
        ...data,
        authEmail: email,
        accountEmail,
        updatedAt: Date.now()
      };
      try {
        window.localStorage?.setItem(BORROW_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
        window.localStorage?.setItem(LEGACY_BORROW_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
      } catch (_) {
        // ignore local cache write errors
      }
      return profiles[accountEmail];
    } catch (_) {
      return null;
    }
  };

  const hasStaffPermission = () => {
    if (typeof staffAuthUser !== "undefined" && !!staffAuthUser) return true;
    return false;
  };

  const ensureStaffPermission = (silent = false) => {
    const ok = hasStaffPermission();
    if (!ok && !silent) {
      setStaffQueueMessage("บัญชีนี้ไม่มีสิทธิ์จัดการคิวคำขอ (Staff เท่านั้น)", "#b91c1c");
    }
    return ok;
  };

  const toYmd = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const parseDateYmd = (value) => {
    const text = (value || "").toString().trim();
    if (!text) return null;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  };

