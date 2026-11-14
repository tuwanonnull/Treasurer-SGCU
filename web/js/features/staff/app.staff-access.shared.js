/* Shared, stateless helpers for staff access features. */
(function initStaffAccessShared() {
  if (window.sgcuStaffAccessShared) return;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const normalizePositionText = (value) => (value || "").toString().trim().replace(/\s+/g, " ");

  const normalizeCode2 = (value) => {
    const digits = String(value || "").trim().replace(/\D/g, "");
    if (!digits) return "";
    return digits.padStart(2, "0").slice(-2);
  };

  const slugifyPosition = (value) => {
    const normalized = normalizePositionText(value).toLowerCase();
    const slug = normalized
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return slug || `position-${Date.now()}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const parseAcademicReferenceDate = (value) => {
    if (!value) return new Date();
    const source = value && typeof value === "object" && value.date !== undefined ? value.date : value;
    const date = typeof source?.toDate === "function" ? source.toDate() : new Date(source);
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  };

  const getCurrentAcademicYearBE = (referenceValue = new Date()) => {
    const referenceDate = parseAcademicReferenceDate(referenceValue) || new Date();
    const yearCE = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    return (month >= 6 ? yearCE : yearCE - 1) + 543;
  };

  const getAcademicYearFromTimestamp = (value) => {
    if (!value) return "";
    const date = parseAcademicReferenceDate(value);
    if (!date) return "";
    const yearCE = date.getFullYear();
    const month = date.getMonth() + 1;
    return String((month >= 6 ? yearCE : yearCE - 1) + 543);
  };

  const isMeaningfulProfileValue = (value) => {
    const normalized = (value || "").toString().trim().toLowerCase();
    return !["", "-", "—", "unknown", "n/a", "na", "null", "undefined", "ไม่ระบุ"].includes(normalized);
  };

  const getMeaningfulProfileValue = (...values) => {
    for (const value of values) {
      if (isMeaningfulProfileValue(value)) return (value || "").toString().trim();
    }
    return "";
  };

  const deriveAcademicProfile = (profile = {}, email = "", referenceValue = new Date(), options = {}) => {
    const facultyMap = options.facultyMap || {};
    const isAlumniEmail = typeof options.isAlumniEmail === "function" ? options.isAlumniEmail : () => false;
    const deriveFromStudentId = (rawStudentId, context = new Date()) => {
      const studentId = (rawStudentId || "").toString().trim();
      if (!/^\d{10}$/.test(studentId)) return { studentId: "", faculty: "", year: "" };
      const faculty = facultyMap[studentId.slice(-2)] || "";
      const entryPrefix = Number(studentId.slice(0, 2));
      const currentAcademicBE = getCurrentAcademicYearBE(context);
      const entryAcademicBE = Number.isFinite(entryPrefix) ? 2500 + entryPrefix : NaN;
      const yearLevel = Number.isFinite(entryAcademicBE) ? currentAcademicBE - entryAcademicBE + 1 : NaN;
      const year = isAlumniEmail(context?.email || context?.authEmail)
        ? "นิสิตเก่า"
        : Number.isFinite(yearLevel) && yearLevel >= 1 && yearLevel <= 8 ? String(yearLevel) : "";
      return { studentId, faculty, year };
    };
    const explicitStudentId = getMeaningfulProfileValue(profile?.studentId);
    const context = referenceValue && typeof referenceValue === "object" && !Array.isArray(referenceValue)
      ? { ...referenceValue, email }
      : { date: referenceValue, email };
    const fromStudentId = deriveFromStudentId(explicitStudentId, context);
    const emailStudentId = (email || "").toString().trim().toLowerCase().split("@")[0] || "";
    const fromEmail = deriveFromStudentId(emailStudentId, context);
    return {
      studentId: getMeaningfulProfileValue(explicitStudentId, fromEmail.studentId),
      faculty: getMeaningfulProfileValue(profile?.faculty, fromStudentId.faculty, fromEmail.faculty),
      year: getMeaningfulProfileValue(fromStudentId.year, fromEmail.year, profile?.year)
    };
  };

  window.sgcuStaffAccessShared = Object.freeze({
    deriveAcademicProfile,
    escapeHtml,
    formatDateTime,
    getAcademicYearFromTimestamp,
    getCurrentAcademicYearBE,
    getMeaningfulProfileValue,
    isMeaningfulProfileValue,
    normalizeCode2,
    normalizePositionText,
    parseAcademicReferenceDate,
    slugifyPosition
  });
})();
