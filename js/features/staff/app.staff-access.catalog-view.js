/* Read-only organization catalog view model. */
(function initStaffAccessCatalogView() {
  if (window.sgcuStaffAccessCatalogView) return;

  const create = (options = {}) => {
    const catalog = window.sgcuStaffAccessCatalog;
    if (!catalog) throw new Error("staff access catalog rules are not loaded");
    const getSource = options.getSource;
    const getDisplayAcademicYear = options.getDisplayAcademicYear;
    const getSharedAccountNo = options.getSharedAccountNo;
    const resolveRunBase = options.resolveRunBase;
    if (
      typeof getSource !== "function" ||
      typeof getDisplayAcademicYear !== "function" ||
      typeof getSharedAccountNo !== "function" ||
      typeof resolveRunBase !== "function"
    ) {
      throw new TypeError("catalog view requires source, academic year, account, and run-code callbacks");
    }

    const normalize = catalog.normalizeText;
    const itemAcademicYear = (item = {}) =>
      catalog.normalizeAcademicYear(item?.academicYear || item?.year || item?.catalogAcademicYear);
    const baseId = (item = {}) => normalize(
      item?.baseOrganizationId || item?.baseOrgId || item?.rootOrganizationId ||
      item?.legacyOrganizationId || item?.id
    );
    const shouldUseForYear = (item = {}, academicYear = getDisplayAcademicYear()) => {
      const itemYear = itemAcademicYear(item);
      const targetYear = catalog.normalizeAcademicYear(academicYear);
      return !itemYear || !targetYear || itemYear === targetYear;
    };
    const sourceRows = () => {
      const rows = getSource();
      return Array.isArray(rows) ? rows : [];
    };
    const getRawItemById = (id = "") => {
      const targetId = normalize(id);
      return targetId ? sourceRows().find((item) => normalize(item?.id) === targetId) || null : null;
    };
    const getRawRows = () => sourceRows()
      .map((item) => ({ ...item, id: normalize(item?.id) }))
      .filter((item) => {
        const status = normalize(item?.status || "active").toLowerCase();
        return item.id && (!status || status === "active");
      });
    const getRows = () => sourceRows()
      .map((item) => {
        if (!shouldUseForYear(item)) return null;
        const academicYear = itemAcademicYear(item);
        const group = normalize(item?.group || item?.organizationType || item?.orgGroup);
        const manualGroup = catalog.isManualRunGroup(group);
        const rawCode = normalize(item?.code || item?.orgCode).toUpperCase();
        const rawName = normalize(item?.name || item?.organizationName || item?.orgName);
        const rawAccountNo = manualGroup
          ? getSharedAccountNo(group) || normalize(item?.accountNo || item?.bankAccount || item?.bankAccountNo)
          : normalize(item?.accountNo || item?.bankAccount || item?.bankAccountNo);
        const nameByAcademicYear = catalog.buildTextMap({
          text: rawName,
          textByAcademicYear: item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear
        });
        const documentRunCode = resolveRunBase({
          group,
          code: rawCode,
          documentRunCode: item?.documentRunCode || item?.runCode,
          documentRunCodeByAcademicYear: item?.documentRunCodeByAcademicYear,
          runCodeByAcademicYear: item?.runCodeByAcademicYear
        });
        const codeByAcademicYear = catalog.buildCodeMap({
          group,
          code: rawCode,
          codeByAcademicYear: item?.codeByAcademicYear,
          orgCodeByAcademicYear: item?.orgCodeByAcademicYear,
          documentRunCodeByAcademicYear: item?.documentRunCodeByAcademicYear || item?.runCodeByAcademicYear
        });
        const code = academicYear
          ? rawCode
          : manualGroup
            ? normalize(catalog.yearValue(codeByAcademicYear, getDisplayAcademicYear())).toUpperCase() ||
              catalog.buildManualCode(group, documentRunCode) || rawCode
            : rawCode;
        return {
          id: normalize(item?.id),
          academicYear,
          baseOrganizationId: baseId(item),
          group,
          name: academicYear
            ? rawName
            : manualGroup
              ? normalize(catalog.yearValue(nameByAcademicYear, getDisplayAcademicYear())) || rawName
              : rawName,
          nameByAcademicYear,
          code,
          codeByAcademicYear,
          documentRunCode,
          documentRunCodeByAcademicYear: catalog.buildDocumentRunMap({
            documentRunCode: item?.documentRunCode || item?.runCode,
            documentRunCodeByAcademicYear: item?.documentRunCodeByAcademicYear,
            runCodeByAcademicYear: item?.runCodeByAcademicYear
          }),
          accountNo: rawAccountNo
        };
      })
      .filter(Boolean)
      .filter((item) => item.group && item.name)
      .reduce((rows, item) => {
        const key = baseId(item) || `${item.group}||${item.name}`.toLowerCase();
        const existingIndex = rows.findIndex((existing) =>
          (baseId(existing) || `${existing.group}||${existing.name}`.toLowerCase()) === key
        );
        if (existingIndex < 0) rows.push(item);
        else if (item.academicYear && !rows[existingIndex].academicYear) rows[existingIndex] = item;
        return rows;
      }, [])
      .sort((a, b) =>
        b.group.localeCompare(a.group, "th") ||
        (a.code || "").localeCompare(b.code || "", "th", { numeric: true }) ||
        a.name.localeCompare(b.name, "th")
      );

    return Object.freeze({ baseId, getRawItemById, getRawRows, getRows, itemAcademicYear, shouldUseForYear });
  };

  window.sgcuStaffAccessCatalogView = Object.freeze({ create });
})();
