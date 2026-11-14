(function initCsvExportHelper() {
  if (window.sgcuCsvExport) return;

  const normalizeCell = (value) => {
    if (value == null) return "";
    if (value instanceof Date) return value.toISOString();
    return String(value).replace(/\r?\n|\r/g, " ").trim();
  };

  const escapeCell = (value) => {
    const text = normalizeCell(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  };

  const toCsv = (headers = [], rows = []) => {
    const headerLine = headers.map(escapeCell).join(",");
    const bodyLines = rows.map((row) => headers.map((header) => escapeCell(row?.[header])).join(","));
    return [headerLine, ...bodyLines].join("\r\n");
  };

  const buildFileName = (baseName = "sgcu-export") => {
    const stamp = new Date().toISOString().slice(0, 10);
    const safeBase = String(baseName || "sgcu-export")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-") || "sgcu-export";
    return `${safeBase}-${stamp}.csv`;
  };

  const download = ({ headers = [], rows = [], fileName = "sgcu-export" } = {}) => {
    if (!headers.length) return false;
    const csv = `\uFEFF${toCsv(headers, rows)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".csv") ? fileName : buildFileName(fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  };

  window.sgcuCsvExport = { download, toCsv };
})();
