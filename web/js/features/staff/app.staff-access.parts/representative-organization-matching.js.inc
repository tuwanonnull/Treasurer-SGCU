  const getOrgRepresentativeApplicant = (item = {}) => {
    const applicant = item.applicant && typeof item.applicant === "object" ? item.applicant : {};
    const requester = item.requester && typeof item.requester === "object" ? item.requester : {};
    const email = (item.applicantEmail || applicant.email || requester.email || "").toString().trim().toLowerCase();
    const academic = deriveAcademicProfile(
      {
        ...requester,
        ...applicant,
        studentId: applicant.studentId || requester.studentId || item.studentId || "",
        faculty: applicant.faculty || requester.faculty || item.faculty || "",
        year: applicant.year || requester.year || item.year || ""
      },
      email,
      item.createdAt || item.reviewedAt || item.updatedAt
    );
    const displayName = (applicant.displayName || requester.displayName || item.applicantName || email || "-").toString();
    return {
      email,
      displayName,
      phone: (applicant.phone || requester.phone || "").toString(),
      lineId: (applicant.lineId || requester.lineId || "").toString(),
      studentId: getMeaningfulProfileValue(applicant.studentId, requester.studentId, item.studentId, academic.studentId),
      faculty: getMeaningfulProfileValue(applicant.faculty, requester.faculty, item.faculty, academic.faculty),
      year: getMeaningfulProfileValue(academic.year, applicant.year, requester.year, item.year)
    };
  };

  const getOrgRepresentativeOrgKey = (orgType = "", orgName = "") => {
    const type = (orgType || "").toString().trim();
    const name = (orgName || "").toString().trim();
    return `${type || "-"}||${name || "-"}`.toLowerCase();
  };

  const normalizeOrgRepresentativeMatchValue = (value = "") =>
    normalizeOrganizationCatalogText(value).toLowerCase().replace(/\s+/g, " ");

  const getOrgRepresentativeCatalogMatchValues = (item = {}) => {
    const group = normalizeOrganizationCatalogText(item?.group || item?.organizationType || item?.orgGroup);
    const name = normalizeOrganizationCatalogText(item?.name || item?.organizationName || item?.orgName);
    const code = normalizeOrganizationCatalogText(item?.code || item?.orgCode || item?.organizationCode).toUpperCase();
    const runCode = stripOrganizationCatalogDocumentRunYear(item?.documentRunCode || item?.runCode || item?.organizationDocumentRunCode);
    const names = Array.from(new Set([
      name,
      ...Object.values(item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear || {})
        .map((value) => normalizeOrganizationCatalogText(value))
    ].filter(Boolean)));
    return { group, name, code, runCode, names };
  };

  const getOrgRepresentativeCatalogIndex = () => {
    if (orgRepresentativeCatalogIndexCache.signature) {
      return orgRepresentativeCatalogIndexCache;
    }
    const rows = getOrganizationCatalogRows();
    const signature = rows
      .map((item) => [
        item.id,
        getOrganizationCatalogBaseId(item),
        item.group,
        item.name,
        item.code,
        item.documentRunCode,
        Object.entries(item.nameByAcademicYear || {}).map(([year, name]) => `${year}:${name}`).join(",")
      ].map((value) => normalizeOrganizationCatalogText(value)).join("|"))
      .join("::");
    if (orgRepresentativeCatalogIndexCache.signature === signature) {
      return orgRepresentativeCatalogIndexCache;
    }

    const index = {
      signature,
      rows,
      byId: new Map(),
      byBaseId: new Map(),
      byGroup: new Map(),
      byCodeGroup: new Map(),
      byRunGroup: new Map(),
      byNameGroup: new Map()
    };
    const pushKey = (map, key, item) => {
      const normalizedKey = normalizeOrgRepresentativeMatchValue(key);
      if (normalizedKey && !map.has(normalizedKey)) map.set(normalizedKey, item);
    };

    rows.forEach((row) => {
      const values = getOrgRepresentativeCatalogMatchValues(row);
      const groupKey = normalizeOrgRepresentativeMatchValue(values.group);
      const rowId = normalizeOrganizationCatalogText(row.id);
      const rowBaseId = getOrganizationCatalogBaseId(row);
      if (rowId) index.byId.set(rowId, row);
      if (rowBaseId && !index.byBaseId.has(rowBaseId)) index.byBaseId.set(rowBaseId, row);
      if (!index.byGroup.has(groupKey)) index.byGroup.set(groupKey, []);
      index.byGroup.get(groupKey).push(row);
      pushKey(index.byCodeGroup, `${groupKey}||${values.code}`, row);
      pushKey(index.byRunGroup, `${groupKey}||${values.runCode}`, row);
      values.names.forEach((name) => {
        pushKey(index.byNameGroup, `${groupKey}||${name}`, row);
      });
    });

    orgRepresentativeCatalogIndexCache = index;
    orgRepresentativeResolveCache = new WeakMap();
    return index;
  };

  const findOrgRepresentativeCatalogItemForApplication = (item = {}) => {
    const index = getOrgRepresentativeCatalogIndex();
    if (!index.rows.length) return null;
    const orgType = normalizeOrganizationCatalogText(item.organizationType || item.orgGroup);
    const orgName = normalizeOrganizationCatalogText(item.organizationName || item.orgName);
    const orgId = normalizeOrganizationCatalogText(item.organizationId || item.organizationCatalogId);
    const baseId = normalizeOrganizationCatalogText(item.baseOrganizationId || item.baseOrgId || item.rootOrganizationId);
    const orgCode = normalizeOrganizationCatalogText(item.organizationCode || item.orgCode || item.code).toUpperCase();
    const runCode = stripOrganizationCatalogDocumentRunYear(item.organizationDocumentRunCode || item.documentRunCode || item.runCode);
    const orgNameKey = normalizeOrgRepresentativeMatchValue(orgName);
    const orgCodeKey = normalizeOrgRepresentativeMatchValue(orgCode);
    const runCodeKey = normalizeOrgRepresentativeMatchValue(runCode);
    const orgTypeKey = normalizeOrgRepresentativeMatchValue(orgType);

    const byIdentity = (orgId && index.byId.get(orgId)) || (baseId && index.byBaseId.get(baseId)) || null;
    if (byIdentity) return byIdentity;

    const byCode = (orgCodeKey && index.byCodeGroup.get(normalizeOrgRepresentativeMatchValue(`${orgTypeKey}||${orgCode}`))) ||
      (runCodeKey && index.byRunGroup.get(normalizeOrgRepresentativeMatchValue(`${orgTypeKey}||${runCode}`))) ||
      null;
    if (byCode) return byCode;

    return (orgNameKey && index.byNameGroup.get(normalizeOrgRepresentativeMatchValue(`${orgTypeKey}||${orgName}`))) || null;
  };

  const getResolvedOrgRepresentativeOrganization = (item = {}) => {
    if (item && typeof item === "object" && orgRepresentativeResolveCache.has(item)) {
      return orgRepresentativeResolveCache.get(item);
    }
    const catalogItem = findOrgRepresentativeCatalogItemForApplication(item);
    const resolved = !catalogItem
      ? {
        organizationType: normalizeOrganizationCatalogText(item.organizationType || item.orgGroup),
        organizationName: normalizeOrganizationCatalogText(item.organizationName || item.orgName),
        organizationCode: normalizeOrganizationCatalogText(item.organizationCode || item.orgCode || item.code).toUpperCase(),
        organizationId: normalizeOrganizationCatalogText(item.organizationId || item.organizationCatalogId),
        baseOrganizationId: normalizeOrganizationCatalogText(item.baseOrganizationId || item.baseOrgId || item.rootOrganizationId),
        documentRunCode: stripOrganizationCatalogDocumentRunYear(item.organizationDocumentRunCode || item.documentRunCode || item.runCode)
      }
      : {
      organizationType: catalogItem.group || normalizeOrganizationCatalogText(item.organizationType || item.orgGroup),
      organizationName: catalogItem.name || normalizeOrganizationCatalogText(item.organizationName || item.orgName),
      organizationCode: catalogItem.code || normalizeOrganizationCatalogText(item.organizationCode || item.orgCode || item.code).toUpperCase(),
      organizationId: normalizeOrganizationCatalogText(catalogItem.id),
      baseOrganizationId: getOrganizationCatalogBaseId(catalogItem),
      documentRunCode: catalogItem.documentRunCode || stripOrganizationCatalogDocumentRunYear(item.organizationDocumentRunCode || item.documentRunCode || item.runCode)
    };
    if (item && typeof item === "object") orgRepresentativeResolveCache.set(item, resolved);
    return resolved;
  };

  const getKnownOrganizationFilters = () => {
    try {
      if (typeof orgFilters !== "undefined" && Array.isArray(orgFilters)) return orgFilters;
    } catch (_) {}
    return Array.isArray(globalThis.orgFilters) ? globalThis.orgFilters : [];
  };

  const loadOrgRepresentativeOrgFiltersFromStore = async () => {
    if (!resolveStore() || !firestore.getDocs || !firestore.collection) return false;
    const colRef = firestore.collection(firestore.db, COLLECTION_ORGANIZATION_CATALOG);
    const q = firestore.query && firestore.where
      ? firestore.query(colRef, firestore.where("status", "==", "active"))
      : colRef;
    const snapshot = await firestore.getDocs(q);
    const rows = [];
    (snapshot?.docs || []).forEach((docSnap) => {
      const data = docSnap.data?.() || {};
      const status = normalizeOrganizationCatalogText(data.status || "active").toLowerCase();
      if (status && status !== "active") return;
      const group = normalizeOrganizationCatalogText(data.group || data.organizationType || data.orgGroup);
      const name = normalizeOrganizationCatalogText(data.name || data.organizationName || data.orgName);
      const academicYear = normalizeOrganizationCatalogAcademicYearText(data.academicYear || data.year || data.catalogAcademicYear);
      const nameByAcademicYear = buildOrganizationCatalogYearTextMap({
        text: name,
        textByAcademicYear: data.nameByAcademicYear || data.organizationNameByAcademicYear || data.orgNameByAcademicYear
      });
      if (academicYear && name) nameByAcademicYear[academicYear] = name;
      if (!group || (!name && !Object.keys(nameByAcademicYear).length)) return;
      const code = normalizeOrganizationCatalogText(data.code || data.orgCode).toUpperCase();
      const accountNo = normalizeOrganizationCatalogText(data.accountNo || data.bankAccount || data.bankAccountNo);
      const documentRunCodeByAcademicYear = buildOrganizationCatalogDocumentRunMap({
        documentRunCode: data.documentRunCode || data.runCode,
        documentRunCodeByAcademicYear: data.documentRunCodeByAcademicYear,
        runCodeByAcademicYear: data.runCodeByAcademicYear
      });
      if (academicYear && normalizeOrganizationCatalogText(data.documentRunCode || data.runCode)) {
        documentRunCodeByAcademicYear[academicYear] = stripOrganizationCatalogDocumentRunYear(data.documentRunCode || data.runCode);
      }
      const codeByAcademicYear = buildOrganizationCatalogCodeMap({
        group,
        code,
        codeByAcademicYear: data.codeByAcademicYear,
        orgCodeByAcademicYear: data.orgCodeByAcademicYear,
        documentRunCodeByAcademicYear
      });
      if (academicYear && code) codeByAcademicYear[academicYear] = code;
      rows.push({
        id: normalizeOrganizationCatalogText(docSnap.id),
        academicYear,
        baseOrganizationId: normalizeOrganizationCatalogText(data.baseOrganizationId || data.baseOrgId || data.rootOrganizationId),
        group,
        name,
        nameByAcademicYear,
        code,
        documentRunCode: resolveOrganizationCatalogDocumentRunBaseForGroup({
          group,
          code,
          documentRunCode: data.documentRunCode || data.runCode,
          documentRunCodeByAcademicYear,
          runCodeByAcademicYear: data.runCodeByAcademicYear,
          academicYear
        }),
        documentRunCodeByAcademicYear,
        codeByAcademicYear,
        accountNo
      });
    });
    rows.sort((a, b) =>
      a.group.localeCompare(b.group, "th") ||
      (a.code || "").localeCompare(b.code || "", "th", { numeric: true }) ||
      a.name.localeCompare(b.name, "th")
    );
    if (rows.length) {
      setLocalOrganizationCatalogRows(rows);
      return true;
    }
    return false;
  };

  const canLoadOrgRepresentativeOrgFilters = () =>
    typeof loadOrgFilters === "function" || !!(resolveStore() && firestore.getDocs && firestore.collection);

  const ensureOrgRepresentativeOrgFiltersLoaded = () => {
    if (orgRepresentativeOrgFiltersLoadedForPage && getKnownOrganizationFilters().length) return Promise.resolve(true);
    if (!canLoadOrgRepresentativeOrgFilters()) return Promise.resolve(false);
    if (orgRepresentativeOrgFiltersLoadPromise) return orgRepresentativeOrgFiltersLoadPromise;
    orgRepresentativeOrgFiltersLoadPromise = Promise.resolve()
      .then(() => {
        if (typeof loadOrgFilters === "function") {
          return Promise.resolve(loadOrgFilters()).then(() => getKnownOrganizationFilters().length > 0);
        }
        return false;
      })
      .then((loadedFromSharedLoader) => {
        if (loadedFromSharedLoader || getKnownOrganizationFilters().length) return true;
        return loadOrgRepresentativeOrgFiltersFromStore();
      })
      .then((loaded) => {
        orgRepresentativeOrgFiltersLoadedForPage = true;
        return !!loaded || getKnownOrganizationFilters().length > 0;
      })
      .catch((error) => {
        console.warn("load organization filters for representative overview failed - app.staff-access.js:3389", error);
        orgRepresentativeOrgFiltersLoadedForPage = true;
        return false;
      })
      .finally(() => {
        orgRepresentativeOrgFiltersLoadPromise = null;
      });
    return orgRepresentativeOrgFiltersLoadPromise;
  };

