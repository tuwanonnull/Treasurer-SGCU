(function initSgcuAuditLog() {
  if (window.sgcuAuditLog) return;

  const getConfig = () => (typeof SGCU_APP_CONFIG === "object" && SGCU_APP_CONFIG ? SGCU_APP_CONFIG : {});
  const getFirestore = () => window.sgcuFirestore || {};
  const getAuthUser = () => window.sgcuAuth?.auth?.currentUser || null;
  const collectionName = () => getConfig().firestore?.collections?.auditLogs || "auditLogs";
  const userProfileCollectionName = () => getConfig().firestore?.collections?.userProfiles || "userProfiles";

  const normalizeText = (value) => (value == null ? "" : String(value).trim());
  const escapeHtml = (value) =>
    normalizeText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  const normalizeSnapshotData = (value) => {
    if (value == null) return null;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return { value: normalizeText(value) };
    }
  };

  const actorNameCache = new Map();
  const actorNameLoadingKeys = new Set();

  const getProfileFullName = (profile = {}) => {
    const firstName = normalizeText(profile.firstName);
    const lastName = normalizeText(profile.lastName);
    return [firstName, lastName].filter(Boolean).join(" ").trim();
  };

  const readLocalProfileByEmail = (email = "") => {
    const normalizedEmail = normalizeText(email).toLowerCase();
    if (!normalizedEmail) return null;
    const storageKeys = ["sgcu_user_profile_by_email_v1", "sgcu_borrow_profile_by_email_v1"];
    for (const key of storageKeys) {
      try {
        const parsed = JSON.parse(window.localStorage?.getItem(key) || "{}");
        const profile = parsed && typeof parsed === "object" ? parsed[normalizedEmail] : null;
        if (profile && typeof profile === "object") return profile;
      } catch (_) {
        // ignore malformed local profile data
      }
    }
    return null;
  };

  const getActorCacheKey = (item = {}) => {
    const uid = normalizeText(item.actorUid);
    if (uid) return `uid:${uid}`;
    const email = normalizeText(item.actorEmail).toLowerCase();
    return email ? `email:${email}` : "";
  };

  const getActorDisplayName = (item = {}) => {
    const storedName = normalizeText(item.actorName || item.actorDisplayName);
    if (storedName) return storedName;

    const cacheKey = getActorCacheKey(item);
    if (cacheKey && actorNameCache.has(cacheKey)) {
      const cachedName = normalizeText(actorNameCache.get(cacheKey));
      if (cachedName) return cachedName;
    }

    const localName = getProfileFullName(readLocalProfileByEmail(item.actorEmail) || {});
    if (localName) return localName;

    const currentUser = getAuthUser();
    if (normalizeText(currentUser?.uid) && normalizeText(currentUser?.uid) === normalizeText(item.actorUid)) {
      const currentName = normalizeText(currentUser?.displayName);
      if (currentName) return currentName;
    }

    return normalizeText(item.actorEmail) || "-";
  };

  const getCurrentActorDisplayName = () => {
    const user = getAuthUser();
    const email = normalizeText(user?.email).toLowerCase();
    const localName = getProfileFullName(readLocalProfileByEmail(email) || {});
    return localName || normalizeText(user?.displayName);
  };

  const hydrateActorNames = (rows = []) => {
    const firestore = getFirestore();
    if (!firestore.db || !firestore.doc || !firestore.getDoc) return;
    const loadJobs = [];

    rows.forEach((item) => {
      const uid = normalizeText(item.actorUid);
      if (!uid) return;
      const cacheKey = `uid:${uid}`;
      if (actorNameCache.has(cacheKey) || actorNameLoadingKeys.has(cacheKey)) return;
      actorNameLoadingKeys.add(cacheKey);
      const job = firestore.getDoc(firestore.doc(firestore.db, userProfileCollectionName(), uid))
        .then((snap) => {
          const profile = snap?.exists?.() ? (snap.data() || {}) : {};
          actorNameCache.set(cacheKey, getProfileFullName(profile));
        })
        .catch(() => {
          actorNameCache.set(cacheKey, "");
        })
        .finally(() => {
          actorNameLoadingKeys.delete(cacheKey);
        });
      loadJobs.push(job);
    });

    if (loadJobs.length) {
      Promise.allSettled(loadJobs).then(() => renderRows(state.rows));
    }
  };

  const toDisplayDateTime = (value) => {
    const date = toDateObject(value);
    if (!date) return "-";
    return date.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const toDateObject = (value) => {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : value instanceof Date
          ? value
          : value
            ? new Date(value)
            : null;
    return !date || Number.isNaN(date.getTime()) ? null : date;
  };

  const parseDateBoundary = (value = "", endOfDay = false) => {
    const text = normalizeText(value);
    if (!text) return null;
    const date = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isInDateRange = (item = {}) => {
    const timestamp = toDateObject(item.timestamp);
    if (!timestamp) return true;
    const start = parseDateBoundary(state.startDate, false);
    const end = parseDateBoundary(state.endDate, true);
    if (start && timestamp < start) return false;
    if (end && timestamp > end) return false;
    return true;
  };

  const actionLabel = (action = "") => {
    const key = normalizeText(action);
    const labels = {
      "budget.settings.update": "แก้การตั้งค่างบ",
      "budget.round.delete": "ลบรอบงบ",
      "budget.project_codes.run": "รันรหัสโครงการ",
      "budget.project_codes.clear": "ยกเลิกรหัสโครงการ",
      "budget.request.create": "เพิ่มคำของบ",
      "budget.request.update": "แก้คำของบ",
      "budget.request.cancel": "ลด/ยกเลิกคำของบ",
      "budget.request.delete": "ลบคำของบ",
      "borrow.request.create": "ยื่นคำขอยืมพัสดุ",
      "borrow.request.status_update": "อัปเดตสถานะพัสดุ",
      "borrow.request.delete": "ลบคำขอยืมพัสดุ",
      "content.news.create": "เพิ่มข่าว",
      "content.news.update": "แก้ข่าว",
      "content.news.import": "Import ข่าว",
      "content.document.create": "เพิ่มเอกสาร",
      "content.document.update": "แก้เอกสาร",
      "content.document.import": "Import เอกสาร",
      "content.document.reorder": "จัดลำดับเอกสาร",
      "booking.created": "สร้างคำขอจองห้อง",
      "booking.status_updated": "อัปเดตสถานะจองห้อง",
      "booking.status_updated_by_staff": "สตาฟอัปเดตสถานะจองห้อง",
      "booking.deleted_by_staff": "สตาฟลบคำขอจองห้อง",
      "booking.cancelled_by_requester": "ผู้จองขอยกเลิกคำขอ",
      "booking.reschedule_requested": "ผู้จองขอเปลี่ยนห้อง/เวลา",
      "meeting_room.created": "เพิ่มห้องประชุม",
      "meeting_room.deleted": "ลบห้องประชุม",
      "meeting_room.renamed": "แก้ชื่อห้องประชุม",
      "meeting_room.booking_access_updated": "แก้สิทธิ์จองห้อง",
      "meeting_holiday.created": "เพิ่มวันหยุดห้องประชุม",
      "meeting_holiday.deleted": "ลบวันหยุดห้องประชุม",
      "staff.auth_access.upsert": "บันทึกสิทธิ์เข้าใช้ชั่วคราว",
      "staff.auth_access.delete": "ลบสิทธิ์เข้าใช้ชั่วคราว",
      "staff.position.create": "เพิ่มตำแหน่งสตาฟ",
      "staff.position.update": "แก้ตำแหน่งสตาฟ",
      "staff.position.delete": "ลบตำแหน่งสตาฟ",
      "staff.application.create": "ส่งคำขอสมัครสตาฟ",
      "staff.application.status_update": "อัปเดตสถานะคำขอสตาฟ",
      "staff.application.revoke": "ยกเลิกอนุมัติคำขอสตาฟ",
      "staff.application.position_update": "ปรับตำแหน่งสตาฟ",
      "staff.application.delete": "ลบคำขอสตาฟ",
      "staff.org_representative.status_update": "อัปเดตสถานะตัวแทนองค์กร",
      "staff.org_representative.delete": "ลบคำขอตัวแทนองค์กร",
      "staff.organization_catalog.upsert": "บันทึกทะเบียนองค์กร",
      "staff.organization_catalog.archive": "ลบทะเบียนองค์กร",
      "staff.organization_catalog.import": "Import ทะเบียนองค์กร"
    };
    return labels[key] || key || "-";
  };

  const entityLabel = (entityType = "", entityId = "") => {
    const labels = {
      budgetApprovalRequest: "คำของบ",
      budgetApprovalSettings: "ตั้งค่างบ",
      borrowAssetRequest: "คำขอยืมพัสดุ",
      newsItem: "ข่าว",
      downloadDocument: "เอกสาร",
      meetingRoomBooking: "จองห้อง",
      meetingRoom: "ห้องประชุม",
      meetingRoomHoliday: "วันหยุดห้องประชุม",
      authEmailAccess: "สิทธิ์เข้าใช้ชั่วคราว",
      staffPosition: "ตำแหน่งสตาฟ",
      staffApplication: "คำขอสตาฟ",
      orgRepresentativeApplication: "คำขอตัวแทนองค์กร",
      organizationCatalogItem: "ทะเบียนองค์กร"
    };
    const type = labels[normalizeText(entityType)] || normalizeText(entityType) || "-";
    const id = normalizeText(entityId);
    return id ? `${type} / ${id}` : type;
  };

  const statusLabel = (status = "") => {
    const key = normalizeText(status).toLowerCase();
    const labels = {
      pending: "รออนุมัติ",
      approved: "อนุมัติแล้ว",
      rejected: "ปฏิเสธ/ยกเลิก",
      cancel_requested: "ขอยกเลิก",
      reschedule_requested: "ขอเปลี่ยนห้อง/เวลา",
      no_show: "No-show",
      received: "รับของแล้ว",
      returned: "คืนแล้ว",
      cancelled: "ยกเลิก",
      published: "เผยแพร่",
      archived: "เก็บถาวร",
      draft: "ฉบับร่าง"
    };
    return labels[key] || key || "";
  };

  const formatSchedule = (item = {}) => {
    const date = normalizeText(item.date);
    const start = normalizeText(item.startTime);
    const end = normalizeText(item.endTime);
    if (!date && !start && !end) return "";
    const time = start || end ? `${start || "-"}-${end || "-"}` : "";
    return [date, time].filter(Boolean).join(" ");
  };

  const formatMoney = (value) => {
    const number = Number(String(value ?? "").replace(/,/g, ""));
    if (!Number.isFinite(number)) return "";
    return `${number.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท`;
  };

  const formatCount = (value, unit = "รายการ") => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return `${number.toLocaleString("th-TH")} ${unit}`;
  };

  const labeled = (label, value) => {
    const text = normalizeText(value);
    return text ? `${label}: ${text}` : "";
  };

  const getMetadata = (item = {}) =>
    item.metadata && typeof item.metadata === "object" ? item.metadata : {};

  const getAuditPayload = (item = {}) => {
    const after = item.after && typeof item.after === "object" ? item.after : null;
    const before = item.before && typeof item.before === "object" ? item.before : null;
    return after || before || {};
  };

  const getStatusChangeText = (item = {}) => {
    const before = item.before && typeof item.before === "object" ? item.before : null;
    const after = item.after && typeof item.after === "object" ? item.after : null;
    const beforeStatus = statusLabel(before?.status);
    const afterStatus = statusLabel(after?.status);
    if (beforeStatus && afterStatus && beforeStatus !== afterStatus) return `${beforeStatus} -> ${afterStatus}`;
    return afterStatus || beforeStatus || "";
  };

  const getFieldChangeText = (before = {}, after = {}, fields = []) => {
    const changes = [];
    fields.forEach(({ key, label, format }) => {
      const beforeValue = before && Object.prototype.hasOwnProperty.call(before, key) ? before[key] : undefined;
      const afterValue = after && Object.prototype.hasOwnProperty.call(after, key) ? after[key] : undefined;
      const beforeText = normalizeText(typeof format === "function" ? format(beforeValue) : beforeValue);
      const afterText = normalizeText(typeof format === "function" ? format(afterValue) : afterValue);
      if (beforeText || afterText) {
        if (beforeText && afterText && beforeText !== afterText) {
          changes.push(`${label}: ${beforeText} -> ${afterText}`);
        } else if (!beforeText && afterText) {
          changes.push(`${label}: ${afterText}`);
        } else if (beforeText && !afterText) {
          changes.push(`${label}: ล้างค่าเดิม ${beforeText}`);
        }
      }
    });
    return changes;
  };

  const getBulkCountText = (item = {}, data = {}) => {
    const metadata = getMetadata(item);
    const count = metadata.count ?? metadata.deletedRequestCount ?? data.importedCount ?? data.updates?.length;
    return formatCount(count);
  };

  const detailText = (item = {}) => {
    const entityType = normalizeText(item.entityType);
    const action = normalizeText(item.action);
    const data = getAuditPayload(item);
    const before = item.before && typeof item.before === "object" ? item.before : {};
    const after = item.after && typeof item.after === "object" ? item.after : {};
    const metadata = getMetadata(item);

    if (entityType === "budgetApprovalSettings") {
      const roundLabel = [data.year || data.budgetRoundYear, data.roundNo || data.budgetRoundNo].filter(Boolean).join(" / ");
      return [
        labeled("รอบ", roundLabel || item.entityId),
        labeled("ปิดรับ", [data.budgetRequestDeadline, data.budgetRequestDeadlineTime].filter(Boolean).join(" ")),
        labeled("เพดานงบ", formatMoney(data.budgetCeiling)),
        labeled("ลบคำขอพร้อมรอบ", formatCount(metadata.deletedRequestCount))
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "meetingRoomBooking") {
      const room = normalizeText(data.roomName || data.roomDisplay || data.roomId) || "ไม่ระบุห้อง";
      const schedule = formatSchedule(data);
      const status = getStatusChangeText(item);
      const reschedule = data.rescheduleRequestedDate
        ? `ขอเปลี่ยนเป็น ${[
            data.rescheduleRequestedRoomName || data.rescheduleRequestedRoomId || "",
            data.rescheduleRequestedDate,
            `${data.rescheduleRequestedStartTime || "-"}-${data.rescheduleRequestedEndTime || "-"}`
          ].filter(Boolean).join(" ")}`
        : "";
      return [
        labeled("ห้อง", room),
        labeled("วันเวลา", schedule),
        labeled("สถานะ", status),
        labeled("ผู้ขอ", data.requester),
        labeled("เหตุผล", data.cancelRequestReason || data.rescheduleRequestReason || data.rejectionReason),
        reschedule
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "meetingRoom") {
      const room = normalizeText(data.name) || normalizeText(item.entityId) || "ไม่ระบุห้อง";
      const access = data.bookingAccess === "staff_only" ? "สตาฟจองเท่านั้น" : data.bookingAccess === "public" ? "คนทั่วไปจอง" : "";
      const changes = getFieldChangeText(before, after, [
        { key: "name", label: "ชื่อห้อง" },
        { key: "bookingAccess", label: "สิทธิ์จอง", format: (value) => value === "staff_only" ? "สตาฟจองเท่านั้น" : value === "public" ? "คนทั่วไปจอง" : value }
      ]);
      return [
        labeled("ห้อง", room),
        labeled("สิทธิ์จอง", access),
        ...changes
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "meetingRoomHoliday") {
      return [
        labeled("วันที่", data.date),
        labeled("ชื่อวันหยุด", data.name)
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "budgetApprovalRequest") {
      if (item.entityId === "bulk") {
        const sample = Array.isArray(data.updates)
          ? data.updates.slice(0, 3).map((entry) => normalizeText(entry.code || entry.projectCodeGenerated || entry.id)).filter(Boolean).join(", ")
          : "";
        return [
          labeled("จำนวน", getBulkCountText(item, data)),
          labeled("ตัวอย่าง", sample),
          labeled("แหล่งข้อมูล", metadata.sourceCollection)
        ].filter(Boolean).join(" | ");
      }
      const requestedAmount = formatMoney(data.estimatedExpense || data.requestedAmount);
      const approvedAmount = formatMoney(data.approvedAmount);
      const changes = getFieldChangeText(before, after, [
        { key: "projectName", label: "โครงการ" },
        { key: "organizationName", label: "องค์กร" },
        { key: "status", label: "สถานะ", format: statusLabel },
        { key: "estimatedExpense", label: "ยอดขอ", format: formatMoney },
        { key: "approvedAmount", label: "ยอดอนุมัติ", format: formatMoney },
        { key: "projectCodeGenerated", label: "รหัสโครงการ" }
      ]);
      return [
        labeled("โครงการ", data.projectName),
        labeled("องค์กร", data.organizationName),
        labeled("สถานะ", getStatusChangeText(item) || statusLabel(data.status)),
        labeled("ยอดขอ", requestedAmount),
        labeled("ยอดอนุมัติ", approvedAmount),
        labeled("รหัสโครงการ", data.projectCodeGenerated),
        ...changes.filter((text) =>
          !text.startsWith("โครงการ:") &&
          !text.startsWith("องค์กร:") &&
          !text.startsWith("สถานะ:") &&
          !text.startsWith("ยอดขอ:") &&
          !text.startsWith("ยอดอนุมัติ:") &&
          !text.startsWith("รหัสโครงการ:")
        )
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "borrowAssetRequest") {
      const assets = Array.isArray(data.assets)
        ? data.assets.map((asset) => normalizeText(asset.name || asset.assetName || asset.code)).filter(Boolean).slice(0, 3).join(", ")
        : "";
      const changes = getFieldChangeText(before, after, [
        { key: "status", label: "สถานะ", format: statusLabel },
        { key: "pickupDate", label: "วันรับของ" },
        { key: "returnDate", label: "วันคืนของ" }
      ]);
      return [
        labeled("โครงการ", data.projectName),
        labeled("พัสดุ", assets),
        labeled("สถานะ", getStatusChangeText(item) || statusLabel(data.status)),
        labeled("วันรับของ", data.pickupDate),
        labeled("วันคืนของ", data.returnDate),
        labeled("หมายเหตุ", data.staffNote),
        ...changes.filter((text) =>
          !text.startsWith("สถานะ:") &&
          !text.startsWith("วันรับของ:") &&
          !text.startsWith("วันคืนของ:")
        )
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "newsItem") {
      return [
        labeled("จำนวน", getBulkCountText(item, data)),
        labeled("หัวข้อ", data.title),
        labeled("หมวด", data.category),
        labeled("สถานะ", getStatusChangeText(item) || statusLabel(data.status))
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "downloadDocument") {
      const sample = Array.isArray(data.updates)
        ? data.updates.slice(0, 3).map((entry) => normalizeText(entry.id)).filter(Boolean).join(", ")
        : "";
      return [
        labeled("จำนวน", getBulkCountText(item, data)),
        labeled("เอกสาร", data.name),
        labeled("หมวด", data.category),
        labeled("องค์กร", data.org),
        labeled("สถานะ", getStatusChangeText(item) || statusLabel(data.status)),
        labeled("ตัวอย่าง", sample)
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "authEmailAccess") {
      const active = data.active === false ? "ปิดใช้งาน" : data.active === true ? "เปิดใช้งาน" : "";
      return [
        labeled("อีเมล", data.email || item.entityId),
        labeled("สถานะ", active),
        labeled("เริ่ม", data.startsAt),
        labeled("หมดอายุ", data.endsAt),
        labeled("เหตุผล", data.reason)
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "staffPosition") {
      const changes = getFieldChangeText(before, after, [
        { key: "name", label: "ตำแหน่ง" },
        { key: "divisionCodeYY", label: "หมวดงาน" },
        { key: "levelCodeZZ", label: "ระดับ" }
      ]);
      return [
        labeled("ตำแหน่ง", data.name),
        labeled("หมวดงาน", data.divisionCodeYY),
        labeled("ระดับ", data.levelCodeZZ),
        ...changes.filter((text) =>
          !text.startsWith("ตำแหน่ง:") &&
          !text.startsWith("หมวดงาน:") &&
          !text.startsWith("ระดับ:")
        )
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "staffApplication") {
      const changes = getFieldChangeText(before, after, [
        { key: "status", label: "สถานะ", format: statusLabel },
        { key: "approvedPosition", label: "ตำแหน่งอนุมัติ" },
        { key: "requestedPosition", label: "ตำแหน่งที่สมัคร" }
      ]);
      return [
        labeled("ผู้สมัคร", data.applicantName || data.applicantEmail || data.email),
        labeled("ตำแหน่ง", data.approvedPosition || data.requestedPosition),
        labeled("สถานะ", getStatusChangeText(item) || statusLabel(data.status)),
        labeled("เหตุผล", data.reason || data.staffNote),
        ...changes.filter((text) =>
          !text.startsWith("สถานะ:") &&
          !text.startsWith("ตำแหน่งอนุมัติ:") &&
          !text.startsWith("ตำแหน่งที่สมัคร:")
        )
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "orgRepresentativeApplication") {
      const changes = getFieldChangeText(before, after, [
        { key: "status", label: "สถานะ", format: statusLabel },
        { key: "organizationName", label: "องค์กร" },
        { key: "orgName", label: "องค์กร" }
      ]);
      return [
        labeled("ผู้สมัคร", data.applicantName || data.applicantEmail || data.email),
        labeled("องค์กร", data.organizationName || data.orgName),
        labeled("สถานะ", getStatusChangeText(item) || statusLabel(data.status)),
        labeled("เหตุผล", data.reason || data.staffNote),
        ...changes.filter((text) => !text.startsWith("สถานะ:") && !text.startsWith("องค์กร:"))
      ].filter(Boolean).join(" | ");
    }

    if (entityType === "organizationCatalogItem") {
      return [
        labeled("จำนวน", getBulkCountText(item, data)),
        labeled("องค์กร", data.formName || data.name),
        labeled("ประเภท", data.group),
        labeled("รหัส", data.code || data.documentRunCode),
        labeled("ปีการศึกษา", data.academicYear),
        labeled("สถานะ", statusLabel(data.status))
      ].filter(Boolean).join(" | ");
    }

    return action ? entityLabel(entityType, item.entityId) : "";
  };

  const renderDetailHtml = (item = {}) => {
    const text = detailText(item) || entityLabel(item.entityType, item.entityId);
    const parts = normalizeText(text).split(" | ").map(normalizeText).filter(Boolean);
    if (!parts.length) return escapeHtml("-");
    return `<div class="dashboard-audit-detail-list">${parts.map((part) => (
      `<span class="dashboard-audit-detail-item">${escapeHtml(part)}</span>`
    )).join("")}</div>`;
  };

  const write = async ({
    action = "",
    entityType = "",
    entityId = "",
    before = null,
    after = null,
    metadata = {},
    source = "web_app"
  } = {}) => {
    const firestore = getFirestore();
    if (!firestore.db || !firestore.collection || !firestore.addDoc || !firestore.serverTimestamp) return false;
    try {
      const user = getAuthUser();
      await firestore.addDoc(
        firestore.collection(firestore.db, collectionName()),
        {
          action: normalizeText(action),
          entityType: normalizeText(entityType),
          entityId: normalizeText(entityId),
          before: normalizeSnapshotData(before),
          after: normalizeSnapshotData(after),
          actorUid: normalizeText(user?.uid),
          actorEmail: normalizeText(user?.email).toLowerCase(),
          actorDisplayName: getCurrentActorDisplayName(),
          actorRole: source.includes("staff") ? "staff" : "",
          source: normalizeText(source) || "web_app",
          metadata: normalizeSnapshotData(metadata) || {},
          timestamp: firestore.serverTimestamp()
        }
      );
      return true;
    } catch (_) {
      return false;
    }
  };

  const setStatus = (text, tone = "") => {
    const el = document.getElementById("dashboardAuditLogStatus");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.tone = tone || "";
    el.hidden = !text;
  };

  const state = {
    rows: [],
    filterType: "all",
    query: "",
    startDate: "",
    endDate: "",
    pageIndex: 0,
    pages: [],
    hasNextPage: false,
    isLoadingPage: false
  };
  const AUDIT_LOG_PAGE_SIZE = 100;

  const getTypeGroup = (item = {}) => {
    const action = normalizeText(item.action);
    const entityType = normalizeText(item.entityType);
    if (action.startsWith("budget.") || entityType === "budgetApprovalRequest" || entityType === "budgetApprovalSettings") return "budget";
    if (action.startsWith("borrow.") || entityType === "borrowAssetRequest") return "borrow";
    if (action.startsWith("booking.") || action.startsWith("meeting_") || entityType.startsWith("meetingRoom")) return "booking";
    if (action.startsWith("content.") || entityType === "newsItem" || entityType === "downloadDocument") return "content";
    if (action.startsWith("staff.") || entityType === "authEmailAccess" || entityType === "staffPosition" || entityType === "orgRepresentativeApplication" || entityType === "organizationCatalogItem") return "staff";
    return "other";
  };

  const getSearchText = (item = {}) => [
    actionLabel(item.action),
    entityLabel(item.entityType, item.entityId),
    detailText(item),
    getActorDisplayName(item),
    item.actorEmail,
    item.source,
    item.action,
    item.entityType,
    item.entityId
  ].map(normalizeText).join(" ").toLowerCase();

  const getFilteredRows = (sourceRows = state.rows) => {
    const query = normalizeText(state.query).toLowerCase();
    return (Array.isArray(sourceRows) ? sourceRows : []).filter((item) => {
      if (state.filterType !== "all" && getTypeGroup(item) !== state.filterType) return false;
      if (!isInDateRange(item)) return false;
      if (query && !getSearchText(item).includes(query)) return false;
      return true;
    });
  };

  const mapRowsForExport = (rows = []) => {
    return rows.map((item) => ({
      "เวลา": toDisplayDateTime(item.timestamp),
      "การกระทำ": actionLabel(item.action),
      "ประเภท/รหัส": entityLabel(item.entityType, item.entityId),
      "รายละเอียด": detailText(item),
      "ผู้ทำรายการ": getActorDisplayName(item),
      "ที่มา": item.source || "-",
      "Metadata": JSON.stringify(item.metadata || {})
    }));
  };

  const getRowsForExport = () => mapRowsForExport(getFilteredRows());

  const hasExportDateRange = () => !!(normalizeText(state.startDate) || normalizeText(state.endDate));

  const buildExportFileName = () => {
    const start = normalizeText(state.startDate) || "เริ่มต้น";
    const end = normalizeText(state.endDate) || "ล่าสุด";
    return hasExportDateRange() ? `sgcu-activity-log-${start}-to-${end}` : "sgcu-activity-log";
  };

  const fetchRowsForExportFromFirestore = async () => {
    const firestore = getFirestore();
    if (!firestore.db || !firestore.collection || !firestore.query || !firestore.where || !firestore.orderBy || !firestore.getDocs) {
      throw new Error("firestore-export-unavailable");
    }
    const constraints = [];
    const start = parseDateBoundary(state.startDate, false);
    const end = parseDateBoundary(state.endDate, true);
    if (start) constraints.push(firestore.where("timestamp", ">=", start));
    if (end) constraints.push(firestore.where("timestamp", "<=", end));
    constraints.push(firestore.orderBy("timestamp", "desc"));
    const queryRef = firestore.query(
      firestore.collection(firestore.db, collectionName()),
      ...constraints
    );
    const snapshot = await firestore.getDocs(queryRef);
    const rows = [];
    snapshot.forEach((docSnap) => rows.push({ id: docSnap.id, ...(docSnap.data() || {}) }));
    return rows;
  };

  const fetchAuditLogPageFromFirestore = async (cursor = null) => {
    const firestore = getFirestore();
    if (!firestore.db || !firestore.collection || !firestore.query || !firestore.orderBy || !firestore.getDocs || !firestore.limit) {
      throw new Error("firestore-page-unavailable");
    }
    const constraints = [];
    const start = parseDateBoundary(state.startDate, false);
    const end = parseDateBoundary(state.endDate, true);
    if (start && firestore.where) constraints.push(firestore.where("timestamp", ">=", start));
    if (end && firestore.where) constraints.push(firestore.where("timestamp", "<=", end));
    constraints.push(firestore.orderBy("timestamp", "desc"));
    if (cursor && firestore.startAfter) constraints.push(firestore.startAfter(cursor));
    constraints.push(firestore.limit(AUDIT_LOG_PAGE_SIZE + 1));
    const queryRef = firestore.query(
      firestore.collection(firestore.db, collectionName()),
      ...constraints
    );
    const snapshot = await firestore.getDocs(queryRef);
    const docs = Array.isArray(snapshot.docs) ? snapshot.docs : [];
    const visibleDocs = docs.slice(0, AUDIT_LOG_PAGE_SIZE);
    const rows = visibleDocs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
    return {
      rows,
      cursor: visibleDocs.length ? visibleDocs[visibleDocs.length - 1] : cursor,
      hasNextPage: docs.length > AUDIT_LOG_PAGE_SIZE
    };
  };

  const exportCsv = async (buttonEl = null) => {
    if (!window.sgcuCsvExport?.download) {
      setStatus("ไม่พบตัวช่วย Export CSV", "error");
      return;
    }
    const shouldQueryFirestore = hasExportDateRange();
    const previousText = buttonEl?.textContent || "";
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = shouldQueryFirestore ? "กำลังดึงข้อมูล..." : "กำลัง Export...";
    }
    try {
      let sourceRows = state.rows;
      if (shouldQueryFirestore) {
        setStatus("กำลังดึง Activity Log จาก Firestore ตามช่วงวันที่...", "");
        sourceRows = await fetchRowsForExportFromFirestore();
      }
      const filteredRows = shouldQueryFirestore ? getFilteredRows(sourceRows) : getFilteredRows();
      const rows = mapRowsForExport(filteredRows);
      if (!rows.length) {
        setStatus("ไม่พบ Activity Log ตามตัวกรองที่เลือก", "error");
        return;
      }
      window.sgcuCsvExport.download({
        headers: ["เวลา", "การกระทำ", "ประเภท/รหัส", "รายละเอียด", "ผู้ทำรายการ", "ที่มา", "Metadata"],
        rows,
        fileName: buildExportFileName()
      });
      setStatus(`Export Activity Log แล้ว ${rows.length.toLocaleString("th-TH")} รายการ`, "success");
    } catch (error) {
      console.error("export audit log failed - app.audit-log.js:741", error);
      setStatus("Export Activity Log ไม่สำเร็จ ตรวจสิทธิ์ Staff หรือช่วงวันที่ที่เลือก", "error");
    } finally {
      if (buttonEl) {
        buttonEl.disabled = getFilteredRows().length === 0 && !hasExportDateRange();
        buttonEl.textContent = previousText;
      }
    }
  };

  const renderRows = (items = []) => {
    const body = document.getElementById("dashboardAuditLogBody");
    const exportBtn = document.getElementById("dashboardAuditLogExportCsvBtn");
    if (!body) return;
    if (items !== state.rows) {
      state.rows = Array.isArray(items) ? items : [];
    }
    const rows = getFilteredRows();
    window.__sgcuAuditLogRows = rows;
    if (exportBtn) exportBtn.disabled = rows.length === 0 && !hasExportDateRange();
    renderPagination(rows.length);
    if (!rows.length) {
      body.innerHTML = `<tr class="dashboard-audit-empty-row"><td colspan="4">ยังไม่มี Activity Log</td></tr>`;
      return;
    }
    hydrateActorNames(rows);
    body.innerHTML = rows.map((item) => `
      <tr class="dashboard-audit-row">
        <td data-label="เวลา">${escapeHtml(toDisplayDateTime(item.timestamp))}</td>
        <td data-label="การกระทำ">${escapeHtml(actionLabel(item.action))}</td>
        <td class="dashboard-audit-detail-cell" data-label="รายละเอียด">${renderDetailHtml(item)}</td>
        <td data-label="ผู้ทำรายการ">${escapeHtml(getActorDisplayName(item))}</td>
      </tr>
    `).join("");
  };

  const renderPagination = (visibleCount = getFilteredRows().length) => {
    const wrap = document.getElementById("dashboardAuditLogPagination");
    const summary = document.getElementById("dashboardAuditLogPaginationSummary");
    const pageLabel = document.getElementById("dashboardAuditLogPageLabel");
    const prevBtn = document.getElementById("dashboardAuditLogPrevPageBtn");
    const nextBtn = document.getElementById("dashboardAuditLogNextPageBtn");
    if (!wrap) return;
    wrap.hidden = false;
    if (summary) {
      summary.textContent = state.isLoadingPage
        ? "กำลังโหลดรายการ..."
        : `แสดง ${visibleCount.toLocaleString("th-TH")} จาก ${state.rows.length.toLocaleString("th-TH")} รายการในหน้านี้`;
    }
    if (pageLabel) pageLabel.textContent = `หน้า ${(state.pageIndex + 1).toLocaleString("th-TH")}`;
    if (prevBtn) prevBtn.disabled = state.isLoadingPage || state.pageIndex <= 0;
    if (nextBtn) nextBtn.disabled = state.isLoadingPage || !state.hasNextPage;
  };

  const loadAuditPage = async (pageIndex = 0) => {
    const targetPage = Math.max(0, Number(pageIndex) || 0);
    if (state.isLoadingPage) return;
    const cachedPage = state.pages[targetPage];
    if (cachedPage) {
      state.pageIndex = targetPage;
      state.rows = cachedPage.rows || [];
      state.hasNextPage = !!cachedPage.hasNextPage || targetPage < state.pages.length - 1;
      renderRows(state.rows);
      setStatus("");
      return;
    }
    const previousPage = targetPage > 0 ? state.pages[targetPage - 1] : null;
    if (targetPage > 0 && !previousPage) return;
    state.isLoadingPage = true;
    renderPagination();
    setStatus("กำลังโหลด Activity Log...", "");
    try {
      const page = await fetchAuditLogPageFromFirestore(previousPage?.cursor || null);
      state.pages[targetPage] = page;
      state.pageIndex = targetPage;
      state.rows = page.rows || [];
      state.hasNextPage = !!page.hasNextPage;
      renderRows(state.rows);
      setStatus("");
    } catch (error) {
      console.error("load audit log page failed - app.audit-log.js:821", error);
      state.rows = [];
      state.hasNextPage = false;
      renderRows([]);
      setStatus(error?.code === "permission-denied" ? "บัญชีนี้ยังไม่มีสิทธิ์อ่าน Activity Log" : "โหลด Activity Log ไม่สำเร็จ", "error");
    } finally {
      state.isLoadingPage = false;
      renderPagination();
    }
  };

  const resetAuditPages = () => {
    state.rows = [];
    state.pageIndex = 0;
    state.pages = [];
    state.hasNextPage = false;
    void loadAuditPage(0);
  };

  const initDashboard = () => {
    const body = document.getElementById("dashboardAuditLogBody");
    if (!body || body.dataset.auditReady === "true") return;
    body.dataset.auditReady = "true";

    const firestore = getFirestore();
    if (!firestore.db || !firestore.collection || !firestore.query || !firestore.orderBy || !firestore.getDocs || !firestore.limit) {
      renderRows([]);
      setStatus("ระบบ Activity Log ยังไม่พร้อมใช้งาน", "error");
      return;
    }

    resetAuditPages();

    const exportBtn = document.getElementById("dashboardAuditLogExportCsvBtn");
    exportBtn?.addEventListener("click", () => {
      void exportCsv(exportBtn);
    });

    const typeFilter = document.getElementById("dashboardAuditLogTypeFilter");
    const startDateInput = document.getElementById("dashboardAuditLogStartDate");
    const endDateInput = document.getElementById("dashboardAuditLogEndDate");
    const searchInput = document.getElementById("dashboardAuditLogSearchInput");
    const searchClear = document.getElementById("dashboardAuditLogSearchClear");
    const prevPageBtn = document.getElementById("dashboardAuditLogPrevPageBtn");
    const nextPageBtn = document.getElementById("dashboardAuditLogNextPageBtn");
    typeFilter?.addEventListener("change", () => {
      state.filterType = normalizeText(typeFilter.value) || "all";
      renderRows(state.rows);
    });
    startDateInput?.addEventListener("change", () => {
      state.startDate = normalizeText(startDateInput.value);
      resetAuditPages();
    });
    endDateInput?.addEventListener("change", () => {
      state.endDate = normalizeText(endDateInput.value);
      resetAuditPages();
    });
    searchInput?.addEventListener("input", () => {
      state.query = normalizeText(searchInput.value);
      renderRows(state.rows);
    });
    searchClear?.addEventListener("click", () => {
      state.filterType = "all";
      state.startDate = "";
      state.endDate = "";
      state.query = "";
      if (typeFilter) typeFilter.value = "all";
      if (startDateInput) startDateInput.value = "";
      if (endDateInput) endDateInput.value = "";
      if (searchInput) searchInput.value = "";
      renderRows(state.rows);
      searchInput?.focus();
    });
    prevPageBtn?.addEventListener("click", () => {
      void loadAuditPage(state.pageIndex - 1);
    });
    nextPageBtn?.addEventListener("click", () => {
      void loadAuditPage(state.pageIndex + 1);
    });
  };

  window.sgcuAuditLog = {
    write,
    initDashboard,
    renderRows,
    actionLabel,
    entityLabel
  };
})();
