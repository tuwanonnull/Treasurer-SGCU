/* Stateless organization catalog rules shared by staff access screens. */
(function initStaffAccessCatalog() {
  if (window.sgcuStaffAccessCatalog) return;

  const LEGACY_ACADEMIC_YEAR = "2568";
  const DOCUMENT_PREFIX_BY_GROUP = new Map([
    ["องค์การบริหารสโมสรนิสิต", "อบจ."],
    ["สภานิสิต", "สภจ."],
    ["ชมรมฝ่ายกีฬา", "อบจ.กฬ."],
    ["ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์", "อบจ.พฒ."],
    ["ชมรมฝ่ายวิชาการ", "อบจ.วชก."],
    ["ชมรมฝ่ายศิลปะและวัฒนธรรม", "อบจ.ศป."]
  ]);
  const CODE_PREFIX_BY_GROUP = new Map([
    ["องค์การบริหารสโมสรนิสิต", "SGCU"],
    ["สภานิสิต", "SCCU"],
    ["ชมรมฝ่ายศิลปะและวัฒนธรรม", "ART"],
    ["ชมรมฝ่ายวิชาการ", "VCK"],
    ["ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์", "PHT"],
    ["ชมรมฝ่ายกีฬา", "SPT"]
  ]);
  const RESPONSIBILITY_DIVISIONS = Object.freeze([
    { code: "01", label: "ฝ่ายนายกสโมสร" },
    { code: "02", label: "ฝ่ายอุปนายกคนที่หนึ่ง" },
    { code: "03", label: "ฝ่ายอุปนายกคนที่สอง" },
    { code: "04", label: "ฝ่ายเลขานุการ" },
    { code: "05", label: "ฝ่ายนิสิตสัมพันธ์" },
    { code: "06", label: "ฝ่ายศิลปะและวัฒนธรรม" },
    { code: "07", label: "ฝ่ายวิชาการ" },
    { code: "08", label: "ฝ่ายกีฬา" },
    { code: "09", label: "ฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์" },
    { code: "10", label: "ฝ่ายเหรัญญิก" }
  ]);

  const normalizeText = (value) => (value ?? "").toString().replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  const slugifyId = (value) => {
    const slug = normalizeText(value).toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
    return slug || `organization-${Date.now()}`;
  };
  const normalizeAcademicYear = (value) => {
    const text = normalizeText(value);
    const num = Number(text);
    if (!Number.isInteger(num) || num <= 0) return "";
    return num < 100 ? String(2500 + num) : String(num);
  };
  const documentPrefix = (group) => DOCUMENT_PREFIX_BY_GROUP.get(normalizeText(group)) || "";
  const codePrefix = (group) => CODE_PREFIX_BY_GROUP.get(normalizeText(group)) || "";
  const isManualRunGroup = (group) => normalizeText(group) === "องค์การบริหารสโมสรนิสิต";
  const isCouncilGroup = (group) => normalizeText(group) === "สภานิสิต";
  const stripRunYear = (value) => normalizeText(value)
    .replace(/^(?:อบจ(?:\.(?:กฬ|พฒ|วชก|ศป))?\.?)\s*/u, "")
    .replace(/\s*\/\s*\d{4}\s*$/u, "");
  const normalizeYearMap = (value, normalizeValue) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce((acc, [year, item]) => {
      const normalizedYear = normalizeText(year);
      const normalizedValue = normalizeValue(item);
      if (/^\d{4}$/.test(normalizedYear) && normalizedValue) acc[normalizedYear] = normalizedValue;
      return acc;
    }, {});
  };
  const yearValue = (map = {}, academicYear = "") => {
    if (!map || typeof map !== "object" || Array.isArray(map)) return "";
    const year = Number(normalizeText(academicYear));
    if (!Number.isFinite(year)) return "";
    const normalized = Object.entries(map).reduce((acc, [key, value]) => {
      const itemYear = Number(normalizeText(key));
      if (Number.isFinite(itemYear) && /^\d{4}$/.test(normalizeText(key)) && normalizeText(value)) {
        acc[String(itemYear)] = value;
      }
      return acc;
    }, {});
    if (normalized[String(year)]) return normalized[String(year)];
    const previous = Object.keys(normalized).map(Number)
      .filter((itemYear) => Number.isFinite(itemYear) && itemYear < year)
      .sort((a, b) => b - a)[0];
    return previous ? normalized[String(previous)] || "" : "";
  };
  const exactYearValue = (map = {}, academicYear = "") => {
    const year = normalizeText(academicYear);
    return /^\d{4}$/.test(year) && map && typeof map === "object" && !Array.isArray(map)
      ? normalizeText(map[year]) : "";
  };
  const latestPreviousYearValue = (map = {}, academicYear = "") => {
    const year = Number(normalizeText(academicYear));
    if (!Number.isFinite(year)) return "";
    const normalized = normalizeYearMap(map, normalizeText);
    const previous = Object.keys(normalized).map(Number)
      .filter((itemYear) => Number.isFinite(itemYear) && itemYear < year)
      .sort((a, b) => b - a)[0];
    return previous ? normalized[String(previous)] || "" : "";
  };
  const parseManualRunBase = (value) => {
    const match = stripRunYear(value).match(/^(\d{1,2})(?:[.-](\d{1,3}))?$/);
    return match
      ? { divisionCode: match[1].padStart(2, "0").slice(-2), subCode: match[2] ? match[2].padStart(2, "0") : "" }
      : { divisionCode: "", subCode: "" };
  };
  const manualRunSubNumber = (value) => {
    const number = Number(parseManualRunBase(value).subCode);
    return Number.isFinite(number) && number > 0 ? number : 0;
  };
  const formatManualRunSubCode = (value) => String(Math.max(1, Number(value) || 1)).padStart(2, "0");
  const normalizeDocumentRunMap = (value) => normalizeYearMap(value, stripRunYear);
  const buildDocumentRunMap = ({ documentRunCode = "", documentRunCodeByAcademicYear = {}, runCodeByAcademicYear = {} } = {}) => {
    const map = { ...normalizeDocumentRunMap(runCodeByAcademicYear), ...normalizeDocumentRunMap(documentRunCodeByAcademicYear) };
    const legacy = stripRunYear(documentRunCode);
    if (legacy && !map[LEGACY_ACADEMIC_YEAR]) map[LEGACY_ACADEMIC_YEAR] = legacy;
    return map;
  };
  const buildManualCode = (group = "", runBase = "") => {
    const prefix = codePrefix(group);
    const base = stripRunYear(runBase);
    return prefix && base ? `${prefix}-${base}`.toUpperCase() : "";
  };
  const normalizeCodeMap = (value) => normalizeYearMap(value, (item) => normalizeText(item).toUpperCase());
  const normalizeTextMap = (value) => normalizeYearMap(value, normalizeText);
  const buildTextMap = ({ text = "", textByAcademicYear = {} } = {}) => {
    const map = normalizeTextMap(textByAcademicYear);
    const legacy = normalizeText(text);
    if (legacy && !Object.keys(map).length) map[LEGACY_ACADEMIC_YEAR] = legacy;
    return map;
  };
  const buildCodeMap = ({ group = "", code = "", codeByAcademicYear = {}, orgCodeByAcademicYear = {}, documentRunCodeByAcademicYear = {} } = {}) => {
    const map = { ...normalizeCodeMap(orgCodeByAcademicYear), ...normalizeCodeMap(codeByAcademicYear) };
    if (isManualRunGroup(group)) {
      Object.entries(normalizeDocumentRunMap(documentRunCodeByAcademicYear)).forEach(([year, runCode]) => {
        const generated = buildManualCode(group, runCode);
        if (generated) map[year] = generated;
      });
    }
    const legacy = normalizeText(code).toUpperCase();
    if (legacy && !map[LEGACY_ACADEMIC_YEAR]) map[LEGACY_ACADEMIC_YEAR] = legacy;
    return map;
  };

  const isCsvHeaderRow = (row = []) => {
    const first = normalizeText(row[0]);
    const second = normalizeText(row[1]);
    return /ประเภท|group|type/i.test(first) || /ชื่อ|ชมรม|องค์กร|name|organization/i.test(second);
  };

  const parseCsvRows = (rows = [], options = {}) => {
    const generateCode = options.generateCode;
    const resolveRunBase = options.resolveRunBase;
    if (typeof generateCode !== "function" || typeof resolveRunBase !== "function") {
      throw new TypeError("catalog CSV parser requires generateCode and resolveRunBase callbacks");
    }
    const dataRows = Array.isArray(rows) && rows.length && isCsvHeaderRow(rows[0]) ? rows.slice(1) : rows;
    const byId = new Map();
    const generatedCodeValues = [];
    dataRows.forEach((row, index) => {
      if (!Array.isArray(row)) return;
      const group = normalizeText(row[0]);
      const name = normalizeText(row[1]);
      const inputCode = normalizeText(row[2]).toUpperCase();
      const accountNo = normalizeText(row[4]);
      if (!group || !name) return;
      const id = slugifyId(`${group}-${inputCode || name}`);
      const code = generateCode({ id, group, code: inputCode }, generatedCodeValues);
      const documentRunCode = resolveRunBase({
        group,
        code,
        documentRunCode: row[3],
        academicYear: LEGACY_ACADEMIC_YEAR
      });
      const documentRunCodeByAcademicYear = buildDocumentRunMap({ documentRunCode });
      const codeByAcademicYear = buildCodeMap({ group, code, documentRunCodeByAcademicYear });
      if (code) generatedCodeValues.push(code);
      byId.set(id, {
        id, group, name,
        nameByAcademicYear: buildTextMap({ text: name }),
        code, codeByAcademicYear, documentRunCode, documentRunCodeByAcademicYear,
        accountNo,
        bankAccount: accountNo,
        status: "active",
        sortOrder: index + 1,
        source: "legacy-csv"
      });
    });
    return Array.from(byId.values());
  };

  const writeItems = async (items = [], importedBy = "", options = {}) => {
    if (!items.length) return 0;
    const { firestore, collectionName } = options;
    if (!firestore?.db || !firestore?.doc || !firestore?.setDoc || !collectionName) {
      throw new TypeError("catalog writer requires a Firestore adapter and collection name");
    }
    const timestampValue = firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString();
    const fieldsFor = (item) => {
      const { id, ...fields } = item;
      return { id, fields: { ...fields, importedAt: timestampValue, importedBy, updatedAt: timestampValue } };
    };
    if (firestore.writeBatch) {
      let written = 0;
      for (let start = 0; start < items.length; start += 450) {
        const batch = firestore.writeBatch(firestore.db);
        items.slice(start, start + 450).forEach((item) => {
          const { id, fields } = fieldsFor(item);
          batch.set(firestore.doc(firestore.db, collectionName, id), fields, { merge: true });
        });
        await batch.commit();
        written += Math.min(450, items.length - start);
      }
      return written;
    }
    let written = 0;
    for (const item of items) {
      const { id, fields } = fieldsFor(item);
      await firestore.setDoc(firestore.doc(firestore.db, collectionName, id), fields, { merge: true });
      written += 1;
    }
    return written;
  };

  window.sgcuStaffAccessCatalog = Object.freeze({
    CODE_PREFIX_BY_GROUP, DOCUMENT_PREFIX_BY_GROUP, LEGACY_ACADEMIC_YEAR, RESPONSIBILITY_DIVISIONS,
    buildCodeMap, buildDocumentRunMap, buildManualCode, buildTextMap, codePrefix, documentPrefix,
    exactYearValue, formatManualRunSubCode, isCouncilGroup, isManualRunGroup, latestPreviousYearValue,
    manualRunSubNumber, normalizeAcademicYear, normalizeCodeMap, normalizeDocumentRunMap, normalizeText,
    isCsvHeaderRow, normalizeTextMap, parseCsvRows, parseManualRunBase, slugifyId, stripRunYear,
    writeItems, yearValue
  });
})();
