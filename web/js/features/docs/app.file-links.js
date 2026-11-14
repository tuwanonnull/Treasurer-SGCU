/* Shared file link helpers for docs/news modules */
function isAllowedLinkProtocol(urlText) {
  try {
    const parsed = new URL(urlText, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function toDownloadUrl(url, label) {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed || !isAllowedLinkProtocol(trimmed)) return "#";

  if (trimmed.includes("drive.google.com")) {
    const mFile = trimmed.match(/https:\/\/drive\.google\.com\/file\/d\/([^/]+)\//);
    if (mFile && mFile[1]) {
      return `https://drive.google.com/uc?export=download&id=${mFile[1]}`;
    }

    const mId = trimmed.match(/[?&]id=([^&]+)/);
    if (mId && mId[1]) {
      return `https://drive.google.com/uc?export=download&id=${mId[1]}`;
    }

    return trimmed;
  }

  return trimmed;
}

function toPreviewUrl(url) {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";
  if (!isAllowedLinkProtocol(u)) return "";

  const mFile = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (mFile && mFile[1]) {
    return `https://drive.google.com/file/d/${mFile[1]}/preview`;
  }

  if (u.includes("docs.google.com/document")) {
    return u.replace(/\/edit.*$/, "/preview");
  }
  if (u.includes("docs.google.com/spreadsheets")) {
    return u.replace(/\/edit.*$/, "/preview");
  }
  if (u.includes("docs.google.com/presentation")) {
    return u.replace(/\/edit.*$/, "/preview");
  }

  return u;
}
