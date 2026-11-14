/* Shared budget organization option helpers */
(function initBudgetOrgOptions() {
  if (window.sgcuBudgetOrgOptions) return;

  const normalizeText = (value) => (value || "").toString().trim();
  const normalizePositiveIntegerText = (value) => {
    const num = Number(normalizeText(value));
    return Number.isInteger(num) && num > 0 ? String(num) : "";
  };
  const normalizeAcademicYearText = (value) => {
    const normalized = normalizePositiveIntegerText(value);
    if (!normalized) return "";
    const num = Number(normalized);
    return num < 100 ? String(2500 + num) : normalized;
  };
  const normalizeYearMap = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce((acc, [year, text]) => {
      const normalizedYear = normalizeAcademicYearText(year);
      const normalizedText = normalizeText(text);
      if (/^\d{4}$/.test(normalizedYear) && normalizedText) acc[normalizedYear] = normalizedText;
      return acc;
    }, {});
  };
  const getYearValue = (map = {}, academicYear = "") => {
    const year = Number(normalizeAcademicYearText(academicYear));
    if (!Number.isFinite(year)) return "";
    const normalized = normalizeYearMap(map);
    if (normalized[String(year)]) return normalized[String(year)];
    const previousYear = Object.keys(normalized)
      .map((key) => Number(key))
      .filter((itemYear) => Number.isFinite(itemYear) && itemYear < year)
      .sort((a, b) => b - a)[0];
    return previousYear ? normalized[String(previousYear)] || "" : "";
  };
  const getItemAcademicYear = (item = {}) =>
    normalizeAcademicYearText(item?.academicYear || item?.year || item?.catalogAcademicYear);
  const shouldUseItemForYear = (item = {}, academicYear = "") => {
    const itemYear = getItemAcademicYear(item);
    const targetYear = normalizeAcademicYearText(academicYear);
    return !itemYear || !targetYear || itemYear === targetYear;
  };
  const getOrgNameForYear = (item = {}, academicYear = "") => {
    if (!shouldUseItemForYear(item, academicYear)) return "";
    const itemYear = getItemAcademicYear(item);
    const rawName = normalizeText(item?.name || item?.organizationName || item?.orgName);
    if (itemYear) return rawName;
    const nameByAcademicYear = normalizeYearMap(
      item?.nameByAcademicYear || item?.organizationNameByAcademicYear || item?.orgNameByAcademicYear
    );
    if (Object.keys(nameByAcademicYear).length) {
      return getYearValue(nameByAcademicYear, academicYear);
    }
    return rawName;
  };
  const getOrgCodeForYear = (item = {}, academicYear = "") => {
    if (!shouldUseItemForYear(item, academicYear)) return "";
    const itemYear = getItemAcademicYear(item);
    if (itemYear) return normalizeText(item?.code || item?.orgCode);
    const codeByAcademicYear = item?.codeByAcademicYear && typeof item.codeByAcademicYear === "object"
      ? item.codeByAcademicYear
      : {};
    const yearCode = academicYear ? getYearValue(codeByAcademicYear, academicYear) : "";
    return normalizeText(yearCode || item?.code);
  };
  const compareOrgNameByCode = (a, b, codeByName = new Map()) => {
    const codeA = normalizeText(codeByName.get(a));
    const codeB = normalizeText(codeByName.get(b));
    if (codeA && codeB) {
      const codeCompare = codeA.localeCompare(codeB, "th", { numeric: true });
      if (codeCompare) return codeCompare;
    } else if (codeA || codeB) {
      return codeA ? -1 : 1;
    }
    return a.localeCompare(b, "th");
  };
  const getOrgRows = (rows) =>
    Array.isArray(rows)
      ? rows
      : typeof orgFilters !== "undefined" && Array.isArray(orgFilters)
        ? orgFilters
        : Array.isArray(window.orgFilters)
          ? window.orgFilters
          : [];

  window.sgcuBudgetOrgOptions = {
    normalizeAcademicYearText,
    getYearValue,
    getItemAcademicYear,
    shouldUseItemForYear,
    getOrgNameForYear,
    getOrgCodeForYear,
    collectTypeOptions(academicYear = "", rows) {
      return Array.from(new Set(
        getOrgRows(rows)
          .filter((item) => getOrgNameForYear(item, academicYear))
          .map((item) => normalizeText(item?.group))
          .filter(Boolean)
      )).sort((a, b) => b.localeCompare(a, "th"));
    },
    collectNameOptions(orgType = "", academicYear = "", rows) {
      const selectedType = normalizeText(orgType);
      if (!selectedType) return [];
      const codeByName = new Map();
      const names = [];
      getOrgRows(rows)
        .filter((item) => normalizeText(item?.group) === selectedType)
        .forEach((item) => {
          const name = getOrgNameForYear(item, academicYear);
          if (!name) return;
          const code = getOrgCodeForYear(item, academicYear);
          if (code && !codeByName.has(name)) codeByName.set(name, code);
          names.push(name);
        });
      return Array.from(new Set(names)).sort((a, b) => compareOrgNameByCode(a, b, codeByName));
    }
  };
})();
