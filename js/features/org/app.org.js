/* Org Structure (Home section: แผนผังทีมเหรัญญิก) */
function toggleOrgStructureLoading(isLoading) {
  const container = document.getElementById("org-structure-content");
  if (orgStructureSkeletonEl) {
    orgStructureSkeletonEl.style.display = isLoading ? "grid" : "none";
  }
  if (container) {
    container.style.display = isLoading ? "none" : "";
  }
}

async function loadOrgStructure() {
  toggleOrgStructureLoading(true);
  const el = document.getElementById("org-structure-content");
  try {
    const publicCacheRows = await loadOrgStructureFromPublicCache();
    if (publicCacheRows) {
      renderOrgStructure(publicCacheRows, null);
    } else {
      const staffProfiles = await loadOrgStaffProfilesFromFirestore();
      const firestoreRows = await loadOrgStructureFromFirestore();
      renderOrgStructure(firestoreRows, staffProfiles);
    }
  } catch (err) {
    console.error("ERROR: โหลดข้อมูลโครงสร้างองค์กรไม่ได้  app.js:3688 - app.org.js:32", err);
    renderHomeTreasurerContact(null);
    recordLoadError("orgStructure", "โหลดโครงสร้างองค์กรไม่สำเร็จ", { showRetry: true });
    setInlineError(el, "ไม่สามารถโหลดข้อมูลทำเนียบจาก Firestore ได้");
  } finally {
    toggleOrgStructureLoading(false);
    if (el) {
      el.dataset.orgLoaded = "true";
      const requestedTerm = el.dataset.requestedOrgTerm;
      if (requestedTerm) {
        const tab = Array.from(el.querySelectorAll("[data-org-term]"))
          .find((item) => item.dataset.orgTerm === requestedTerm);
        const status = document.getElementById("aboutOrgJumpStatus");
        if (tab) tab.click();
        if (status) {
          status.hidden = !!tab;
          if (!tab) status.textContent = "ยังไม่มีข้อมูลโครงสร้างทีมปี 68 ให้แสดงในขณะนี้";
        }
        delete el.dataset.requestedOrgTerm;
      }
    }
    if (typeof markLoaderStep === "function") {
      markLoaderStep("orgStructure");
    }
  }
}

const ORG_STRUCTURE_HEADER_ROW = [
  "รหัสตำแหน่ง",
  "ตำแหน่ง",
  "คำนำ",
  "ชื่อ",
  "สกุล",
  "ชื่อเล่น",
  "รหัสนิสิต",
  "ชั้นปี",
  "คณะ",
  "อีเมลที่ใช้ประจำ",
  "Line ID",
  "เบอร์โทรศัพท์",
  "PIC"
];

function normalizeOrgStructureDateValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
  }
  return value.toString ? value.toString().trim() : "";
}

function normalizeOrgStructureMemberDoc(docSnap) {
  const data = docSnap?.data ? docSnap.data() : {};
  const row = Array.isArray(data.row)
    ? data.row.map((value) => (value ?? "").toString())
    : [
        data.positionCode,
        data.position,
        data.prefix,
        data.firstName,
        data.lastName,
        data.nick,
        data.studentId,
        data.year,
        data.faculty,
        data.email,
        data.lineId,
        data.phone,
        data.photoUrl || data.photo
      ].map((value) => (value ?? "").toString());
  if (!row.some((value) => (value || "").toString().trim())) return null;
  return {
    id: docSnap.id,
    row,
    sortOrder: Number(data.sortOrder ?? data.order ?? 0),
    positionCode: (data.positionCode || row[0] || "").toString().trim(),
    updatedAt: normalizeOrgStructureDateValue(data.updatedAt)
  };
}

async function loadOrgStructureFromFirestore() {
  const store = window.sgcuFirestore || {};
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const collectionName = appConfig.firestore?.collections?.orgStructureMembers || "orgStructureMembers";
  if (!store.db || !store.collection || !store.getDocs) return null;

  const collectionRef = store.collection(store.db, collectionName);
  const listQuery =
    store.query && store.where
      ? store.query(collectionRef, store.where("status", "==", "published"))
      : collectionRef;
  const snapshot = await store.getDocs(listQuery);
  const items = [];
  snapshot.forEach((docSnap) => {
    const item = normalizeOrgStructureMemberDoc(docSnap);
    if (item) items.push(item);
  });
  if (!items.length) return null;
  items.sort((a, b) => a.sortOrder - b.sortOrder || a.positionCode.localeCompare(b.positionCode, "th"));
  return [ORG_STRUCTURE_HEADER_ROW, ...items.map((item) => item.row)];
}

async function loadOrgStructureFromPublicCache() {
  const store = window.sgcuFirestore || {};
  const appConfig = typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {};
  const collectionName = appConfig.firestore?.collections?.publicCache || "publicCache";
  if (!store.db || !store.doc || !store.getDoc) return null;

  const snap = await store.getDoc(store.doc(store.db, collectionName, "orgStructure"));
  const data = snap?.exists?.() ? snap.data() || {} : {};
  if (!Array.isArray(data.rows) || data.rows.length < 2) return null;

  const rows = data.rows
    .map((row) => Array.isArray(row) ? row.map((value) => (value ?? "").toString()) : null)
    .filter(Boolean);
  return rows.length >= 2 ? rows : null;
}

async function loadOrgStaffProfilesFromFirestore() {
  const store = window.sgcuFirestore || {};
  if (!window.sgcuAuth?.auth?.currentUser) return null;
  if (!store.db || !store.collection || !store.onSnapshot) return null;

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (typeof unsubscribe === "function") {
        try {
          unsubscribe();
        } catch (_) {
          // ignore
        }
      }
      resolve(value);
    };

    try {
      unsubscribe = store.onSnapshot(
        store.collection(store.db, "staffProfiles"),
        (snapshot) => {
          const docs = (snapshot?.docs || []).map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() || {})
          }));
          finish(docs);
        },
        (error) => {
          console.error("WARN: โหลด staffProfiles จาก Firestore ไม่สำเร็จ - app.org.js:74", error);
          finish(null);
        }
      );
    } catch (error) {
      console.error("WARN: เริ่ม listener staffProfiles ไม่สำเร็จ - app.org.js:79", error);
      finish(null);
    }
  });
}

// Use only explicitly dated, published directory rows for the current year's treasurer.
function getHomeTreasurerContacts(rows, academicYear) {
  const term = String(academicYear).slice(-2);
  if (!/^\d{4}$/.test(String(academicYear))) return [];
  return (Array.isArray(rows) ? rows.slice(1) : []).filter((row) => {
    const code = String(row?.[0] || "").trim();
    const match = code.match(/^SGCU\s*(\d{2,4})(?=\.|$)/i);
    const role = String(row?.[1] || "").trim();
    return match && match[1].slice(-2) === term &&
      /^เหรัญญิก(?:$|\s|องค์การ|อบจ\.?)/u.test(role) &&
      String(row?.[10] || "").trim();
  }).map((row) => ({
    name: [row[2], row[3], row[4]].map((value) => String(value || "").trim()).filter(Boolean).join(" "),
    lineId: String(row[10]).trim()
  }));
}

function renderHomeTreasurerContact(rows) {
  const container = document.getElementById("homeTreasurerLine");
  if (!container) return;
  container.replaceChildren();
  const year = typeof getCurrentAcademicYearBE === "function" ? getCurrentAcademicYearBE() : "";
  const contacts = getHomeTreasurerContacts(rows, year);
  for (const contact of contacts) {
    const info = document.createElement("p");
    info.textContent = `เหรัญญิกปีการศึกษา ${year}${contact.name ? ` · ${contact.name}` : ""}`;
    const link = document.createElement("a");
    link.className = "btn-secondary home-contact-line";
    link.textContent = `LINE · ${contact.lineId}`;
    link.href = `https://line.me/ti/p/~${encodeURIComponent(contact.lineId)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `ติดต่อ LINE ${contact.lineId} (เปิดแท็บใหม่)`);
    container.append(info, link);
  }
  if (!contacts.length) {
    const info = document.createElement("p");
    info.textContent = "ยังไม่มีข้อมูล LINE ของเหรัญญิกปีปัจจุบัน ติดต่อผ่าน Instagram ได้";
    container.append(info);
  }
}

function renderOrgStructure(rows, staffProfileDocs = null) {
  renderHomeTreasurerContact(rows);
  const container = document.getElementById("org-structure-content");
  if (!container) return;
  const esc = (value) =>
    typeof escapeHtml === "function"
      ? escapeHtml(value)
      : (value ?? "")
          .toString()
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\"", "&quot;")
          .replaceAll("'", "&#39;");

  if (!rows || rows.length < 2) {
    container.innerHTML = renderListEmptyState("ไม่พบข้อมูลทำเนียบ", "รายชื่อจะแสดงที่นี่เมื่อมีข้อมูล", "document");
    return;
  }

  const dataRows = rows.slice(1);

  // Firestore rows keep the former sheet column order for the existing renderer.
  const STRUCT_COL_POS = 1;    // เดิม D -> ใหม่ B
  const STRUCT_COL_PREFIX = 2; // เดิม E -> ใหม่ C
  const STRUCT_COL_FIRST = 3;  // เดิม F -> ใหม่ D
  const STRUCT_COL_LAST = 4;   // เดิม G -> ใหม่ E
  const STRUCT_COL_NICK = 5;   // เดิม H -> ใหม่ F
  const STRUCT_COL_YEAR = 7;   // เดิม J -> ใหม่ H
  const STRUCT_COL_FAC = 8;    // เดิม K -> ใหม่ I
  const STRUCT_COL_LINE = 10;  // เดิม M -> ใหม่ K
  const STRUCT_COL_PHONE = 11; // เดิม N -> ใหม่ L
  const STRUCT_COL_PHOTO = 12; // คอลัมน์ M: URL/Google Drive รูปโปรไฟล์

  const resolveCurrentOrgTermLabel = () => {
    if (typeof getCurrentAcademicYearBE === "function") {
      const academicYearBE = Number(getCurrentAcademicYearBE());
      if (Number.isFinite(academicYearBE)) {
        return `SGCU${String(academicYearBE).slice(-2)}`;
      }
    }
    return "SGCU68";
  };

  const STRUCT_COL_POSITION_CODE = 0;

  const getOrgTermLabelFromPositionCode = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    const sgcuPrefixMatch = raw.match(/^SGCU\s*(\d{2,4})(?=\.|$)/i);
    if (sgcuPrefixMatch) return `SGCU${sgcuPrefixMatch[1].slice(-2)}`;
    return "";
  };

  const parseOrgPositionCode = (value) => {
    const raw = (value || "").toString().trim();
    const match = raw.match(/^(?:SGCU\s*\d{2,4}\.)?10\.(\d{2})\.(\d{2})-(\d{3})$/i);
    if (!match) return null;
    return {
      raw,
      yy: match[1],
      zz: match[2],
      aaa: match[3],
      yyNumber: Number(match[1]),
      zzNumber: Number(match[2]),
      aaaNumber: Number(match[3])
    };
  };

  const getOrgTermSortValue = (label) => {
    const match = (label || "").toString().match(/\d{2,4}/);
    return match ? Number(match[0].slice(-2)) : -Infinity;
  };

  const fallbackOrgTermLabel = resolveCurrentOrgTermLabel();
  const orgTerms = [];
  const orgRowsByTerm = new Map();

  for (const r of dataRows) {
    const label =
      getOrgTermLabelFromPositionCode(r[STRUCT_COL_POSITION_CODE]) ||
      fallbackOrgTermLabel;
    if (!orgRowsByTerm.has(label)) {
      orgRowsByTerm.set(label, []);
      orgTerms.push(label);
    }
    orgRowsByTerm.get(label).push(r);
  }

  orgTerms.sort((a, b) => getOrgTermSortValue(b) - getOrgTermSortValue(a));
  const initialOrgTermLabel =
    orgTerms.includes(fallbackOrgTermLabel) ? fallbackOrgTermLabel : orgTerms[0] || fallbackOrgTermLabel;

  const fullName = (r, cols) =>
    [r[cols.prefix], r[cols.first], r[cols.last]].filter(Boolean).join(" ").trim();

  const nickNameText = (r, cols) =>
    r[cols.nick] ? `(${r[cols.nick]})` : "";

  const initials = (r, cols) => {
    const f = (r[cols.first] || "").charAt(0);
    const l = (r[cols.last] || "").charAt(0);
    const s = (f + l).toUpperCase();
    return s || "SG";
  };

  const AVATAR_BASE_PATH = "img/org/";
  const DEFAULT_AVATAR_URL = "img/logo_treasurur jpg.png";

  function extractGoogleDriveFileId(value) {
    const raw = (value || "").toString().trim();
    if (!raw) return "";

    const fileMatch = raw.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (fileMatch && fileMatch[1]) return fileMatch[1];

    const idMatch = raw.match(/[?&]id=([^&#]+)/i);
    if (idMatch && idMatch[1]) return idMatch[1];

    const openMatch = raw.match(/drive\.google\.com\/open\?id=([^&#]+)/i);
    if (openMatch && openMatch[1]) return openMatch[1];

    return "";
  }

  function buildAvatarUrlFromCell(raw) {
    if (!raw) return "";

    let val = raw.toString().trim();
    if (!val) return "";

    // ถ้าเป็นลิงก์ Google Drive / URL
    if (/^https?:\/\//i.test(val)) {
      const driveFileId = extractGoogleDriveFileId(val);
      if (driveFileId) return `https://lh3.googleusercontent.com/d/${driveFileId}=w400`;
      return val;
    }

    // ถ้าเป็นชื่อไฟล์ธรรมดา
    val = val.replace(/\s+/g, "");
    if (!val.includes(".")) {
      val = `${val}.jpg`;
    }
    return `${AVATAR_BASE_PATH}${val}`;
  }

  function buildAvatarFallbackUrlFromCell(raw) {
    const driveFileId = extractGoogleDriveFileId(raw);
    return driveFileId ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w400` : "";
  }

  function avatarHTML(r, size) {
    const photoUrl = buildAvatarUrlFromCell(r[STRUCT_COL_PHOTO]);
    const url = photoUrl || DEFAULT_AVATAR_URL;
    const driveFallbackUrl = buildAvatarFallbackUrlFromCell(r[STRUCT_COL_PHOTO]);
    const fallbackUrl = driveFallbackUrl || (url !== DEFAULT_AVATAR_URL ? DEFAULT_AVATAR_URL : "");
    const cls = size === "sm" ? "org-node-circle sm" : "org-node-circle";
    const logoClass = url === DEFAULT_AVATAR_URL ? " is-logo" : "";
    const fallbackInitials = initials(r, { first: STRUCT_COL_FIRST, last: STRUCT_COL_LAST });
    return `
      <div class="${cls}${logoClass}" data-initials="${esc(fallbackInitials)}">
        <img
          src="${esc(url)}"
          alt="${esc(fullName(r, { prefix: STRUCT_COL_PREFIX, first: STRUCT_COL_FIRST, last: STRUCT_COL_LAST }))}"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          referrerpolicy="no-referrer"
          ${fallbackUrl && fallbackUrl !== url ? `data-fallback-src="${esc(fallbackUrl)}"` : ""}
          data-logo-src="${esc(DEFAULT_AVATAR_URL)}"
          width="128"
          height="128"
        >
      </div>
    `;
  }

  const contactCols = {
    pos: STRUCT_COL_POS,
    prefix: STRUCT_COL_PREFIX,
    first: STRUCT_COL_FIRST,
    last: STRUCT_COL_LAST,
    nick: STRUCT_COL_NICK,
    year: STRUCT_COL_YEAR,
    fac: STRUCT_COL_FAC,
    line: STRUCT_COL_LINE,
    phone: STRUCT_COL_PHONE,
    photo: STRUCT_COL_PHOTO
  };

  const makeContactInfo = (r, key) => {
    const pos = (r[contactCols.pos] || "").trim();
    const avatarUrl = buildAvatarUrlFromCell(r[contactCols.photo]);
    return {
      key,
      fullName: fullName(r, contactCols),
      nick: r[contactCols.nick] || "",
      position: pos,
      phone: (r[contactCols.phone] || "").toString().trim(),
      line: (r[contactCols.line] || "").toString().trim(),
      faculty: (r[contactCols.fac] || "").toString().trim(),
      year: (r[contactCols.year] || "").toString().trim(),
      avatarUrl: avatarUrl || DEFAULT_AVATAR_URL,
      avatarIsLogo: !avatarUrl
    };
  };

  // ข้อมูล contact สำหรับ popup/Project Modal ใช้จากชีตโครงสร้างองค์กร
  const existingContactsByName = { ...assistantContactsByName };
  assistantContactsByName = {}; // reset global
  for (const r of dataRows) {
    const key = (r[contactCols.nick] || "").toString().trim();
    if (!key) continue;
    const termLabel =
      getOrgTermLabelFromPositionCode(r[STRUCT_COL_POSITION_CODE]) ||
      fallbackOrgTermLabel;
    const contactInfo = makeContactInfo(r, key);
    assistantContactsByName[`${termLabel}::${key}`] = contactInfo;
    if (termLabel === initialOrgTermLabel || !assistantContactsByName[key]) {
      assistantContactsByName[key] = contactInfo;
    }
  }
  assistantContactsByName = {
    ...assistantContactsByName,
    ...existingContactsByName
  };

  staffEmails = new Set();
  staffProfilesByEmail = {};
  if (Array.isArray(staffProfileDocs)) {
    for (const item of staffProfileDocs) {
      const staffEmail = (item?.email || item?.mail || item?.id || "").toString().trim().toLowerCase();
      if (!staffEmail) continue;
      staffEmails.add(staffEmail);
      staffProfilesByEmail[staffEmail] = {
        ...(staffProfilesByEmail[staffEmail] || {}),
        position: (item?.position || "").toString().trim(),
        nick: (item?.nick || "").toString().trim(),
        role: (item?.role || "").toString().trim(),
        positionCode: (item?.positionCode || "").toString().trim(),
        divisionCodeYY: (item?.divisionCodeYY || item?.positionCodeYY || "").toString().trim(),
        positionCodeYY: (item?.positionCodeYY || item?.divisionCodeYY || "").toString().trim(),
        positions: Array.isArray(item?.positions) ? item.positions : []
      };
    }
  }

  function buildOrgTreeHtml(termLabel) {
    const termRows = orgRowsByTerm.get(termLabel) || [];

    function personKey(r) {
      const nick = (r[STRUCT_COL_NICK] || "").toString().trim();
      const key =
        nick ||
        fullName(r, {
          prefix: STRUCT_COL_PREFIX,
          first: STRUCT_COL_FIRST,
          last: STRUCT_COL_LAST
        });
      return `${termLabel}::${key}`;
    }

    function renderPersonNode(r, opts = {}) {
      if (!r) return "";

      const key = personKey(r);
      const size = opts.size || "lg";
      const code = (r[STRUCT_COL_POSITION_CODE] || "").toString().trim();

      return `
        <button class="org-node" type="button" data-person-key="${esc(key)}">
          ${avatarHTML(r, size === "sm" ? "sm" : "lg")}
          <div class="org-node-role">${esc((r[STRUCT_COL_POS] || "").trim())}</div>
          <div class="org-node-name">${esc(fullName(r, { prefix: STRUCT_COL_PREFIX, first: STRUCT_COL_FIRST, last: STRUCT_COL_LAST }))}</div>
          <div class="org-node-nick">${esc(nickNameText(r, { nick: STRUCT_COL_NICK }))}</div>
          ${code ? `<div class="org-node-code">${esc(code)}</div>` : ""}
        </button>
      `;
    }

    const uniqueRows = [];
    const seenRows = new Set();
    for (const r of termRows) {
      const nick = (r[STRUCT_COL_NICK] || "").toString().trim();
      const name = fullName(r, {
        prefix: STRUCT_COL_PREFIX,
        first: STRUCT_COL_FIRST,
        last: STRUCT_COL_LAST
      });
      const code = (r[STRUCT_COL_POSITION_CODE] || "").toString().trim();
      const identity = `${code}::${nick || name}`;
      if (!identity.trim() || seenRows.has(identity)) continue;
      seenRows.add(identity);
      uniqueRows.push(r);
    }

    const sortByPositionCode = (a, b) => {
      const codeA = parseOrgPositionCode(a[STRUCT_COL_POSITION_CODE]);
      const codeB = parseOrgPositionCode(b[STRUCT_COL_POSITION_CODE]);
      if (!codeA && !codeB) return 0;
      if (!codeA) return 1;
      if (!codeB) return -1;
      return (
        codeA.yyNumber - codeB.yyNumber ||
        codeA.zzNumber - codeB.zzNumber ||
        codeA.aaaNumber - codeB.aaaNumber
      );
    };
    uniqueRows.sort(sortByPositionCode);

    const codedRows = uniqueRows
      .map((row) => ({ row, code: parseOrgPositionCode(row[STRUCT_COL_POSITION_CODE]) }))
      .filter((item) => item.code);
    const uncodedRows = uniqueRows.filter((row) => !parseOrgPositionCode(row[STRUCT_COL_POSITION_CODE]));
    const centralRows = codedRows.filter((item) => item.code.yy === "00").map((item) => item.row);
    const topNode = centralRows[0] || uncodedRows[0] || null;
    const centralSupportRows = centralRows.slice(1);
    const branchesByYy = new Map();

    for (const item of codedRows) {
      if (item.code.yy === "00") continue;
      if (!branchesByYy.has(item.code.yy)) branchesByYy.set(item.code.yy, []);
      branchesByYy.get(item.code.yy).push(item.row);
    }
    if (!branchesByYy.has("01")) {
      branchesByYy.set("01", []);
    }

    const branchEntries = Array.from(branchesByYy.entries())
      .sort(([yyA], [yyB]) => Number(yyA) - Number(yyB))
      .map(([yy, rows]) => [yy, rows.sort(sortByPositionCode)]);
    const uncodedSupportRows = topNode ? uncodedRows.slice(1) : uncodedRows;

    const renderBranchTitle = (yy, rows) => {
      if (yy === "01") return "เหรัญญิก";
      const firstRole = (rows[0]?.[STRUCT_COL_POS] || "").toString().trim();
      const title = firstRole.replace(/^(ประธาน|รองประธาน|เลขานุการ|ผู้ช่วย)(ฝ่าย)?/u, "").trim();
      return title || `ฝ่าย ${yy}`;
    };

    const renderAssistantBox = (labelText) => {
      if (!labelText) return "";
      return `<div class="org-node-assistant-box org-code-assistant-box">${esc(labelText)}</div>`;
    };

    const renderBranchAssistantLabel = (yy, rows) => {
      if (yy === "01") return "ผู้ช่วยเหรัญญิก";
      const title = renderBranchTitle(yy, rows);
      if (!title || title === `ฝ่าย ${yy}`) return `ผู้ช่วยฝ่าย ${yy}`;
      return title.startsWith("ฝ่าย") ? `ผู้ช่วย${title}` : `ผู้ช่วยฝ่าย${title}`;
    };

    const getRowsByZz = (rows) => {
      const groups = new Map();
      for (const row of rows) {
        const code = parseOrgPositionCode(row[STRUCT_COL_POSITION_CODE]);
        const zz = code?.zz || "อื่น ๆ";
        if (!groups.has(zz)) groups.set(zz, []);
        groups.get(zz).push(row);
      }
      return Array.from(groups.entries())
        .sort(([zzA], [zzB]) => Number(zzA) - Number(zzB))
        .map(([zz, groupRows]) => [zz, groupRows.sort(sortByPositionCode)]);
    };

    const getBranchColumnCount = (count) => {
      if (count <= 1) return 1;
      if (count === 2) return 2;
      if (count === 4) return 2;
      return 3;
    };
    const branchColumnCount = getBranchColumnCount(branchEntries.length);

    // ====== ประกอบ HTML Org Tree ======
    return `
      <div class="org-tree org-tree-code-layout" data-org-term-panel="${esc(termLabel)}">
        <div class="org-code-top">
          ${topNode
            ? renderPersonNode(topNode, { size: "lg" })
            : "<p>ไม่พบข้อมูลโครงสร้างทีมเหรัญญิก</p>"}
        </div>

        ${centralSupportRows.length
          ? `
            <div class="org-code-section">
              <div class="org-code-section-label">ส่วนกลาง</div>
              <div class="org-code-central-grid">
                ${centralSupportRows.map((row) => renderPersonNode(row, { size: "sm" })).join("")}
              </div>
            </div>
          `
          : ""}

        ${branchEntries.length
          ? `
            <div class="org-code-branches org-code-branches-cols-${branchColumnCount}">
              ${branchEntries.map(([yy, rows]) => `
	                <section class="org-code-branch" data-org-yy="${esc(yy)}">
		                  <div class="org-code-branch-label">
		                    <strong>${esc(renderBranchTitle(yy, rows))}</strong>
		                  </div>
		                  <div class="org-code-branch-people">
		                    ${getRowsByZz(rows).map(([zz, zzRows], groupIndex) => `
                        <div class="org-code-zz-row" data-org-zz="${esc(zz)}">
	                          <div class="org-code-zz-people">
                            ${zzRows.map((row) => renderPersonNode(row, { size: groupIndex === 0 ? "lg" : "sm" })).join("")}
                          </div>
                        </div>
                      `).join("")}
	                  </div>
                    ${renderAssistantBox(renderBranchAssistantLabel(yy, rows))}
	                </section>
	              `).join("")}
            </div>
          `
          : ""}

        ${uncodedSupportRows.length
          ? `
            <div class="org-code-section">
              <div class="org-code-section-label">ยังไม่มีรหัส SGCUXX.10.YY.ZZ-AAA</div>
              <div class="org-code-central-grid">
                ${uncodedSupportRows.map((row) => renderPersonNode(row, { size: "sm" })).join("")}
              </div>
            </div>
          `
          : ""}
      </div>
    `;
  }
  const dotsHtml = orgTerms.length
    ? `
      <div class="org-term-dots" role="tablist" aria-label="เลือกปีโครงสร้างทีมเหรัญญิก">
        ${orgTerms.map((termLabel) => `
          <button
            class="org-term-dot${termLabel === initialOrgTermLabel ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${termLabel === initialOrgTermLabel ? "true" : "false"}"
            aria-label="${esc(termLabel)}"
            data-org-term="${esc(termLabel)}"
          >
            <span class="org-term-dot-mark" aria-hidden="true"></span>
            <span class="org-term-dot-label">${esc(termLabel)}</span>
          </button>
        `).join("")}
      </div>
    `
    : "";

  let html = `
    ${dotsHtml}
    <div class="org-term-panels">
      ${orgTerms.map((termLabel) => `
        <div class="org-term-panel${termLabel === initialOrgTermLabel ? " is-active" : ""}" data-org-term-panel-wrap="${esc(termLabel)}">
          ${buildOrgTreeHtml(termLabel)}
        </div>
      `).join("")}
    </div>
  `;

  container.innerHTML = html;
  syncOrgTermLabels(initialOrgTermLabel);

  if (refreshAuthDisplayFn && window.sgcuAuth?.auth?.currentUser) {
    refreshAuthDisplayFn(window.sgcuAuth.auth.currentUser);
  }

  initOrgTermDots(initialOrgTermLabel);
  initOrgImageFallbacks();
  // ผูก popup ให้เฉพาะปุ่มคน (วงกลม)
  initOrgPersonPopup();
}

function initOrgImageFallbacks() {
  const container = document.getElementById("org-structure-content");
  if (!container) return;
  container.querySelectorAll(".org-node-circle img").forEach((img) => {
    img.addEventListener("error", () => {
      const fallbackSrc = img.getAttribute("data-fallback-src");
      if (fallbackSrc && img.src !== fallbackSrc) {
        img.removeAttribute("data-fallback-src");
        if (fallbackSrc === "img/logo_treasurur jpg.png" || fallbackSrc.endsWith("/img/logo_treasurur%20jpg.png")) {
          img.closest(".org-node-circle")?.classList.add("is-logo");
        }
        img.src = fallbackSrc;
        return;
      }

      const avatar = img.closest(".org-node-circle");
      if (!avatar) return;
      const logoSrc = img.getAttribute("data-logo-src");
      if (logoSrc && !img.src.includes("logo_treasurur%20jpg.png")) {
        avatar.classList.add("is-logo");
        img.removeAttribute("data-logo-src");
        img.src = logoSrc;
        return;
      }
      avatar.textContent = avatar.dataset.initials || "SG";
    });
  });
}

function syncOrgTermLabels(termLabel) {
  const safeLabel = termLabel || "SGCU68";
  [
    "aboutBudgetTeamLabel",
    "aboutOrgStructureTitleLabel"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = safeLabel;
  });
}

function initOrgTermDots(initialTermLabel) {
  const container = document.getElementById("org-structure-content");
  if (!container) return;
  const dots = Array.from(container.querySelectorAll(".org-term-dot[data-org-term]"));
  const panels = Array.from(container.querySelectorAll(".org-term-panel[data-org-term-panel-wrap]"));
  if (!dots.length || !panels.length) return;

  function setActiveTerm(termLabel) {
    dots.forEach((dot) => {
      const isActive = dot.dataset.orgTerm === termLabel;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.orgTermPanelWrap === termLabel);
    });
    syncOrgTermLabels(termLabel);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      setActiveTerm(dot.dataset.orgTerm || initialTermLabel);
    });
  });

  setActiveTerm(initialTermLabel);
}

function initOrgPersonPopup() {
  const modal = document.getElementById("personModal");
  if (!modal) return;
  const esc = (value) =>
    typeof escapeHtml === "function"
      ? escapeHtml(value)
      : (value ?? "")
          .toString()
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\"", "&quot;")
          .replaceAll("'", "&#39;");

  const closeBtn = document.getElementById("personModalClose");
  const dialogEl = modal.querySelector(".person-modal-dialog");
  const avatarEl = document.getElementById("personModalAvatar");
  const nameEl   = document.getElementById("personModalName");
  const nickEl   = document.getElementById("personModalNick");
  const posEl    = document.getElementById("personModalPosition");
  const contactEl= document.getElementById("personModalContact");

  function syncPersonModalSize() {
    if (!dialogEl) return;
    const hasRoom = window.innerWidth >= 1180 && window.innerHeight >= 760;
    dialogEl.classList.toggle("is-roomy", hasRoom);
  }

  function openModalForKey(key) {
    const info = assistantContactsByName[key];
    if (!info) return;

    // avatar
    avatarEl.innerHTML = "";
    avatarEl.classList.toggle("is-logo", !!info.avatarIsLogo);
    if (info.avatarUrl) {
      const img = document.createElement("img");
      img.src = info.avatarUrl;
      img.alt = info.fullName || key;
      img.addEventListener("error", () => {
        if (img.src.includes("logo_treasurur%20jpg.png")) return;
        avatarEl.classList.add("is-logo");
        img.src = "img/logo_treasurur jpg.png";
      });
      avatarEl.appendChild(img);
    } else {
      avatarEl.classList.remove("is-logo");
      const initials = (info.fullName || "SG")
        .split(" ")
        .map((s) => s.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
      avatarEl.textContent = initials;
    }

    posEl.textContent  = info.position || "";
    nameEl.textContent = info.fullName || key;
    nickEl.textContent = info.nick ? `(${info.nick})` : "";

    const rows = [];

    if (info.faculty) {
      rows.push(`
        <div class="person-modal-contact-row">
          <div class="person-modal-contact-label">คณะ</div>
          <div class="person-modal-contact-value">${esc(info.faculty)}</div>
        </div>
      `);
    }

    // ✅ แถวชั้นปี
    if (info.year) {
      rows.push(`
        <div class="person-modal-contact-row">
          <div class="person-modal-contact-label">ชั้นปี</div>
          <div class="person-modal-contact-value">ปี ${esc(info.year)}</div>
        </div>
      `);
    }

    if (info.phone) {
      const safePhone = info.phone.toString().replace(/[^\d+\-()\s]/g, "").trim();
      rows.push(`
        <div class="person-modal-contact-row">
          <div class="person-modal-contact-label">โทร</div>
          <div class="person-modal-contact-value">
            <a href="tel:${esc(safePhone)}">${esc(info.phone)}</a>
          </div>
        </div>
      `);
    }

    if (info.line) {
      rows.push(`
        <div class="person-modal-contact-row">
          <div class="person-modal-contact-label">LINE</div>
          <div class="person-modal-contact-value">${esc(info.line)}</div>
        </div>
      `);
    }

    if (!rows.length) {
      rows.push(`
        <div class="person-modal-contact-row">
          <div class="person-modal-contact-value">
            ยังไม่มีข้อมูลช่องทางการติดต่อเพิ่มเติม
          </div>
        </div>
      `);
    }

    contactEl.innerHTML = rows.join("");

    syncPersonModalSize();
    openDialog(modal, { focusSelector: "#personModalClose" });
  }

  // ผูก event กับทุก node ที่มี data-person-key
  document
  .querySelectorAll(".org-node[data-person-key]")
  .forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.dataset.personKey;
      if (!key) return;
      openModalForKey(key);
    });
  });

  function closeModal() {
    closeDialog(modal);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("person-modal-backdrop")) {
      closeModal();
    }
  });

  window.addEventListener("resize", () => {
    if (!modal.classList.contains("show")) return;
    syncPersonModalSize();
  });

}
