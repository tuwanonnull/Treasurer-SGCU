  const normalizeOrganizationCatalogText = catalog.normalizeText;
  const slugifyOrganizationCatalogId = catalog.slugifyId;

  const getOrganizationCatalogDisplayAcademicYear = () => {
    const selected = normalizeOrganizationCatalogText(currentOrgRepresentativeAcademicYear);
    if (/^\d{4}$/.test(selected)) return selected;
    return String(getCurrentAcademicYearBE());
  };

  const normalizeOrganizationCatalogAcademicYearText = catalog.normalizeAcademicYear;

  const getOrganizationCatalogItemAcademicYear = (item = {}) =>
    normalizeOrganizationCatalogAcademicYearText(item?.academicYear || item?.year || item?.catalogAcademicYear);

  const getOrganizationCatalogBaseId = (item = {}) =>
    normalizeOrganizationCatalogText(item?.baseOrganizationId || item?.baseOrgId || item?.rootOrganizationId || item?.legacyOrganizationId || item?.id);

  const getOrganizationCatalogExplicitBaseId = (item = {}) =>
    normalizeOrganizationCatalogText(item?.baseOrganizationId || item?.baseOrgId || item?.rootOrganizationId);

  const buildOrganizationCatalogYearDocId = (baseId = "", academicYear = getOrganizationCatalogDisplayAcademicYear()) => {
    const year = normalizeOrganizationCatalogAcademicYearText(academicYear) || getOrganizationCatalogDisplayAcademicYear();
    const base = normalizeOrganizationCatalogText(baseId);
    return `${year}-${base || slugifyOrganizationCatalogId(`organization-${Date.now()}`)}`;
  };

  const normalizeOrganizationCatalogMatchValue = (value = "") =>
    normalizeOrganizationCatalogText(value).toLowerCase().replace(/\s+/g, " ");

  const getOrganizationCatalogComparableValues = (item = {}, academicYear = getOrganizationCatalogDisplayAcademicYear()) => {
    const itemYear = getOrganizationCatalogItemAcademicYear(item);
    const group = normalizeOrganizationCatalogText(item?.group || item?.organizationType || item?.orgGroup);
    const rawName = normalizeOrganizationCatalogText(item?.name || item?.organizationName || item?.orgName);
    const rawCode = normalizeOrganizationCatalogText(item?.code || item?.orgCode).toUpperCase();
    const rawRunCode = stripOrganizationCatalogDocumentRunYear(item?.documentRunCode || item?.runCode);
    if (itemYear) {
      return { group, name: rawName, code: rawCode, runCode: rawRunCode };
    }
    const nameByAcademicYear = buildOrganizationCatalogYearTextMap({
      text: rawName,
      textByAcademicYear: item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear
    });
    const documentRunCodeByAcademicYear = buildOrganizationCatalogDocumentRunMap({
      documentRunCode: rawRunCode,
      documentRunCodeByAcademicYear: item?.documentRunCodeByAcademicYear,
      runCodeByAcademicYear: item?.runCodeByAcademicYear
    });
    const codeByAcademicYear = buildOrganizationCatalogCodeMap({
      group,
      code: rawCode,
      codeByAcademicYear: item?.codeByAcademicYear,
      orgCodeByAcademicYear: item?.orgCodeByAcademicYear,
      documentRunCodeByAcademicYear
    });
    const runCode = getOrganizationCatalogLatestPreviousYearValue(documentRunCodeByAcademicYear, academicYear) || rawRunCode;
    return {
      group,
      name: getOrganizationCatalogLatestPreviousYearValue(nameByAcademicYear, academicYear) || rawName,
      code: getOrganizationCatalogLatestPreviousYearValue(codeByAcademicYear, academicYear) || rawCode,
      runCode
    };
  };

  const getOrganizationCatalogMatchKeys = (item = {}, academicYear = getOrganizationCatalogDisplayAcademicYear()) => {
    const values = getOrganizationCatalogComparableValues(item, academicYear);
    const group = normalizeOrganizationCatalogMatchValue(values.group);
    if (!group) return [];
    return [
      values.code ? `code:${group}:${normalizeOrganizationCatalogMatchValue(values.code)}` : "",
      values.runCode ? `run:${group}:${normalizeOrganizationCatalogMatchValue(values.runCode)}` : "",
      values.name ? `name:${group}:${normalizeOrganizationCatalogMatchValue(values.name)}` : ""
    ].filter(Boolean);
  };

  const ORGANIZATION_CATALOG_LEGACY_DOCUMENT_RUN_ACADEMIC_YEAR = catalog.LEGACY_ACADEMIC_YEAR;
  const getOrganizationCatalogDocumentPrefix = catalog.documentPrefix;
  const isOrganizationCatalogManualDocumentRunGroup = catalog.isManualRunGroup;
  const isOrganizationCatalogCouncilGroup = catalog.isCouncilGroup;
  const ORGANIZATION_CATALOG_RESPONSIBILITY_DIVISIONS = catalog.RESPONSIBILITY_DIVISIONS;

  const populateOrganizationCatalogResponsibilityDivisions = () => {
    if (!organizationCatalogResponsibilityDivisionEl) return;
    if (organizationCatalogResponsibilityDivisionEl.options.length > 1) return;
    organizationCatalogResponsibilityDivisionEl.innerHTML = [
      '<option value="">เลือกฝ่ายหลัก</option>',
      ...ORGANIZATION_CATALOG_RESPONSIBILITY_DIVISIONS.map((item) =>
        `<option value="${toSafeText(item.code)}">${toSafeText(`${item.code} ${item.label}`)}</option>`
      ),
      '<option value="__custom__">กำหนดฝ่ายหลักเอง</option>'
    ].join("");
  };

  const stripOrganizationCatalogDocumentRunYear = catalog.stripRunYear;

  const getOrganizationCatalogYearValue = (map = {}, academicYear = getOrganizationCatalogDisplayAcademicYear()) =>
    catalog.yearValue(map, academicYear);
  const getOrganizationCatalogExactYearValue = catalog.exactYearValue;
  const getOrganizationCatalogLatestPreviousYearValue = catalog.latestPreviousYearValue;
  const parseOrganizationCatalogManualDocumentRunBase = catalog.parseManualRunBase;

  const getOrganizationCatalogManualRunForYear = (item = {}, academicYear = getOrganizationCatalogDisplayAcademicYear()) => {
    const source = item && typeof item === "object" ? item : {};
    const year = normalizeOrganizationCatalogText(academicYear);
    const runMap = buildOrganizationCatalogDocumentRunMap({
      documentRunCode: source.documentRunCode || source.runCode,
      documentRunCodeByAcademicYear: source.documentRunCodeByAcademicYear,
      runCodeByAcademicYear: source.runCodeByAcademicYear
    });
    return stripOrganizationCatalogDocumentRunYear(getOrganizationCatalogYearValue(runMap, year));
  };

  const formatOrganizationCatalogManualRunSubCode = catalog.formatManualRunSubCode;

  const getOrganizationCatalogSelectedDivisionCode = () => {
    const selectedDivision = normalizeOrganizationCatalogText(organizationCatalogResponsibilityDivisionEl?.value);
    const rawDivisionCode = selectedDivision === "__custom__"
      ? organizationCatalogCustomDivisionCodeEl?.value
      : selectedDivision;
    return normalizeOrganizationCatalogText(rawDivisionCode)
      .replace(/\D/g, "")
      .padStart(2, "0")
      .slice(-2);
  };

  const getOrganizationCatalogNextManualSubCode = ({ group = "", divisionCode = "", academicYear = "", excludeIds = [] } = {}) => {
    const excluded = new Set(excludeIds.map((id) => normalizeOrganizationCatalogText(id)).filter(Boolean));
    const year = normalizeOrganizationCatalogText(academicYear) || getOrganizationCatalogDisplayAcademicYear();
    const excludedBaseIds = new Set(
      getKnownOrganizationFilters()
        .filter((item) => excluded.has(normalizeOrganizationCatalogText(item?.id)))
        .map((item) => getOrganizationCatalogBaseId(item))
        .filter(Boolean)
    );
    const usedSubCodes = new Set();
    getOrganizationCatalogRows().forEach((item) => {
      const itemId = normalizeOrganizationCatalogText(item?.id);
      if (excluded.has(itemId)) return;
      const itemBaseId = getOrganizationCatalogBaseId(item);
      if (itemBaseId && excludedBaseIds.has(itemBaseId)) return;
      const itemGroup = normalizeOrganizationCatalogText(item?.group || item?.organizationType || item?.orgGroup);
      if (itemGroup !== normalizeOrganizationCatalogText(group)) return;
      const runMap = buildOrganizationCatalogDocumentRunMap({
        documentRunCode: item?.documentRunCode || item?.runCode,
        documentRunCodeByAcademicYear: item?.documentRunCodeByAcademicYear,
        runCodeByAcademicYear: item?.runCodeByAcademicYear
      });
      const parsed = parseOrganizationCatalogManualDocumentRunBase(getOrganizationCatalogYearValue(runMap, year));
      if (parsed.divisionCode !== divisionCode) return;
      const subNumber = Number(parsed.subCode);
      if (Number.isFinite(subNumber) && subNumber > 0) usedSubCodes.add(subNumber);
    });
    let nextSubCode = 1;
    while (usedSubCodes.has(nextSubCode)) nextSubCode += 1;
    return formatOrganizationCatalogManualRunSubCode(nextSubCode);
  };

  const resolveOrganizationCatalogManualDocumentRunBaseFromForm = ({ group = "" } = {}) => {
    const divisionCode = getOrganizationCatalogSelectedDivisionCode();
    if (!divisionCode) return "";
    const id = normalizeOrganizationCatalogText(organizationCatalogFields.id?.value);
    const academicYear = getOrganizationCatalogDisplayAcademicYear();
    const existingItem = id ? getOrganizationCatalogRows().find((item) => item.id === id) : null;
    const existingParsed = parseOrganizationCatalogManualDocumentRunBase(getOrganizationCatalogManualRunForYear(existingItem, academicYear));
    const typedSubCode = normalizeOrganizationCatalogText(organizationCatalogResponsibilitySubCodeEl?.value)
      .replace(/\D/g, "")
      .padStart(2, "0");
    const shouldAutoAppend = !id || (existingParsed.divisionCode && existingParsed.divisionCode !== divisionCode);
    const subCode = shouldAutoAppend
      ? getOrganizationCatalogNextManualSubCode({ group, divisionCode, academicYear, excludeIds: [id] })
      : typedSubCode || existingParsed.subCode || getOrganizationCatalogNextManualSubCode({ group, divisionCode, academicYear, excludeIds: [id] });
    return subCode ? `${divisionCode}.${subCode}` : "";
  };

  const buildOrganizationCatalogManualDocumentRunBase = () => {
    const divisionCode = getOrganizationCatalogSelectedDivisionCode();
    const subCode = normalizeOrganizationCatalogText(organizationCatalogResponsibilitySubCodeEl?.value)
      .replace(/\D/g, "")
      .padStart(2, "0");
    if (!divisionCode || !subCode) return "";
    return `${divisionCode}.${subCode}`;
  };

  const formatOrganizationCatalogDocumentRunCode = (value, group = "") => {
    const base = stripOrganizationCatalogDocumentRunYear(value);
    if (!base) return "";
    const prefix = getOrganizationCatalogDocumentPrefix(group);
    const displayBase = isOrganizationCatalogManualDocumentRunGroup(group) && !/-YYY$/i.test(base)
      ? `${base}-YYY`
      : base;
    return `${prefix ? `${prefix} ` : ""}${displayBase}/${getOrganizationCatalogDisplayAcademicYear()}`;
  };

  const getOrganizationCatalogDocumentRunBaseFromCode = (code) => {
    const match = normalizeOrganizationCatalogText(code).toUpperCase().match(/^[A-Z]+-(\d{2,})$/);
    return match ? `${match[1]}-YYY` : "";
  };

  const resolveOrganizationCatalogDocumentRunBase = ({ code = "", documentRunCode = "" } = {}) =>
    getOrganizationCatalogDocumentRunBaseFromCode(code) || stripOrganizationCatalogDocumentRunYear(documentRunCode);

  const normalizeOrganizationCatalogDocumentRunMap = catalog.normalizeDocumentRunMap;
  const buildOrganizationCatalogDocumentRunMap = catalog.buildDocumentRunMap;

  const resolveOrganizationCatalogDocumentRunBaseForGroup = ({
    group = "",
    code = "",
    documentRunCode = "",
    documentRunCodeByAcademicYear = {},
    runCodeByAcademicYear = {},
    academicYear = getOrganizationCatalogDisplayAcademicYear()
  } = {}) => {
    if (isOrganizationCatalogCouncilGroup(group)) {
      return "YYY";
    }
    if (!isOrganizationCatalogManualDocumentRunGroup(group)) {
      return resolveOrganizationCatalogDocumentRunBase({ code, documentRunCode });
    }
    const year = normalizeOrganizationCatalogText(academicYear);
    const runMap = buildOrganizationCatalogDocumentRunMap({
      documentRunCode,
      documentRunCodeByAcademicYear,
      runCodeByAcademicYear
    });
    return stripOrganizationCatalogDocumentRunYear(getOrganizationCatalogYearValue(runMap, year));
  };

  const resolveOrganizationCatalogDocumentRunBaseFromForm = ({ group = "", code = "" } = {}) =>
    isOrganizationCatalogCouncilGroup(group)
      ? "YYY"
      : isOrganizationCatalogManualDocumentRunGroup(group)
      ? resolveOrganizationCatalogManualDocumentRunBaseFromForm({ group }) || buildOrganizationCatalogManualDocumentRunBase() || stripOrganizationCatalogDocumentRunYear(organizationCatalogFields.documentRunCode?.value)
      : resolveOrganizationCatalogDocumentRunBase({
          code,
          documentRunCode: organizationCatalogFields.documentRunCode?.value
        });

  const ORGANIZATION_CATALOG_CODE_PREFIX_BY_GROUP = catalog.CODE_PREFIX_BY_GROUP;
  const getOrganizationCatalogCodePrefix = catalog.codePrefix;
  const buildOrganizationCatalogManualCodeFromRunBase = catalog.buildManualCode;
  const normalizeOrganizationCatalogCodeMap = catalog.normalizeCodeMap;
  const normalizeOrganizationCatalogYearTextMap = catalog.normalizeTextMap;
  const buildOrganizationCatalogYearTextMap = catalog.buildTextMap;

  const buildOrganizationCatalogCodeMap = catalog.buildCodeMap;

  const generateOrganizationCatalogCode = ({ id = "", group = "", code = "" } = {}, extraCodeValues = []) => {
    const explicitCode = normalizeOrganizationCatalogText(code).toUpperCase();
    if (explicitCode) return explicitCode;

    const prefix = getOrganizationCatalogCodePrefix(group);
    if (!prefix) return "";
    const pattern = new RegExp(`^${prefix}-(\\d{2,})$`, "i");
    let maxNumber = 0;
    [
      ...getOrganizationCatalogRows()
        .filter((item) => !id || item.id !== id)
        .map((item) => item.code),
      ...extraCodeValues
    ].forEach((value) => {
      const match = normalizeOrganizationCatalogText(value).toUpperCase().match(pattern);
      if (!match) return;
      const number = Number(match[1]);
      if (Number.isFinite(number) && number > maxNumber) {
        maxNumber = number;
      }
    });
    return `${prefix}-${String(maxNumber + 1).padStart(2, "0")}`;
  };

  const parseOrganizationCatalogCsvRows = (rows = []) => catalog.parseCsvRows(rows, {
    generateCode: generateOrganizationCatalogCode,
    resolveRunBase: resolveOrganizationCatalogDocumentRunBaseForGroup
  });

  const writeOrganizationCatalogItems = (items, importedBy) => catalog.writeItems(items, importedBy, {
    firestore,
    collectionName: COLLECTION_ORGANIZATION_CATALOG
  });

  const refreshOrganizationCatalogAfterImport = (items) => {
    setLocalOrganizationCatalogRows(items.map((item) => ({
      id: item.id,
      group: item.group,
      name: item.name,
      nameByAcademicYear: item.nameByAcademicYear,
      code: item.code,
      codeByAcademicYear: item.codeByAcademicYear,
      documentRunCode: item.documentRunCode,
      documentRunCodeByAcademicYear: item.documentRunCodeByAcademicYear,
      accountNo: item.accountNo
    })));
    renderOrganizationCatalogTable();
    renderOrgRepresentativeApplications();
  };

  const setLocalOrganizationCatalogRows = (rows) => {
    const nextFilters = Array.isArray(rows) ? rows : [];
    try {
      orgFilters = nextFilters;
    } catch (_) {
      globalThis.orgFilters = nextFilters;
    }
    invalidateOrgRepresentativeCatalogIndex();
    try {
      if (typeof setCache === "function" && typeof CACHE_KEYS !== "undefined") {
        setCache(CACHE_KEYS.ORG_FILTERS, nextFilters);
      }
    } catch (_) {}
  };

  const getOrganizationCatalogSharedAccountNoForGroup = (group = "") => {
    const targetGroup = normalizeOrganizationCatalogText(group);
    if (!isOrganizationCatalogManualDocumentRunGroup(targetGroup)) return "";
    const match = getKnownOrganizationFilters().find((item) => {
      const itemGroup = normalizeOrganizationCatalogText(item?.group || item?.organizationType || item?.orgGroup);
      const accountNo = normalizeOrganizationCatalogText(item?.accountNo || item?.bankAccount || item?.bankAccountNo);
      return itemGroup === targetGroup && accountNo;
    });
    return normalizeOrganizationCatalogText(match?.accountNo || match?.bankAccount || match?.bankAccountNo);
  };

  const organizationCatalogView = catalogViewFactory.create({
    getSource: getKnownOrganizationFilters,
    getDisplayAcademicYear: getOrganizationCatalogDisplayAcademicYear,
    getSharedAccountNo: getOrganizationCatalogSharedAccountNoForGroup,
    resolveRunBase: resolveOrganizationCatalogDocumentRunBaseForGroup
  });
  const getRawOrganizationCatalogItemById = organizationCatalogView.getRawItemById;
  const getRawOrganizationCatalogRows = organizationCatalogView.getRawRows;
  const getOrganizationCatalogRows = organizationCatalogView.getRows;

