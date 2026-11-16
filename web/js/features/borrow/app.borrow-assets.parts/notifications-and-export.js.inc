  const setBorrowNotificationStatus = (text = "", color = "#6b7280") => {
    if (!borrowNotificationStatusEl) return;
    borrowNotificationStatusEl.textContent = text;
    borrowNotificationStatusEl.style.color = color;
  };

  const maybeSendBorrowBrowserNotification = (title, body) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return false;
    if (Notification.permission !== "granted") return false;
    try {
      const webPush = window.sgcuWebPush;
      if (webPush && typeof webPush.showNotification === "function") {
        void webPush.showNotification(title, body, {
          icon: "img/icons/treasurer-icon-192.png",
          badge: "img/icons/treasurer-icon-192.png",
          data: { url: "./#borrow-assets" }
        });
        return true;
      }
      const notificationIcon = "img/icons/treasurer-icon-192.png";
      // eslint-disable-next-line no-new
      new Notification(title, { body, icon: notificationIcon, badge: notificationIcon });
      return true;
    } catch (_) {
      return false;
    }
  };

  const showBorrowRuntimeToastNotice = (title, body, tone = "success") => {
    if (typeof document === "undefined") return;
    let host = document.getElementById("borrowRuntimeToastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "borrowRuntimeToastHost";
      host.style.position = "fixed";
      host.style.top = "14px";
      host.style.right = "14px";
      host.style.zIndex = "9999";
      host.style.display = "flex";
      host.style.flexDirection = "column";
      host.style.gap = "8px";
      host.style.maxWidth = "min(92vw, 360px)";
      host.style.pointerEvents = "none";
      document.body.appendChild(host);
    }
    const toast = document.createElement("div");
    const isError = tone === "error";
    toast.style.borderRadius = "10px";
    toast.style.border = isError ? "1px solid #fca5a5" : "1px solid #86efac";
    toast.style.background = "#ffffff";
    toast.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.12)";
    toast.style.padding = "10px 12px";
    toast.style.pointerEvents = "auto";
    toast.style.fontSize = "12px";
    toast.style.lineHeight = "1.35";
    toast.style.color = "#1f2937";
    toast.innerHTML = `
      <div style="font-weight:700; color:${isError ? "#b91c1c" : "#047857"};">${safeEscape(title)}</div>
      <div style="margin-top:3px;">${safeEscape(body)}</div>
    `;
    host.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
      if (host && !host.children.length) host.remove();
    }, 5000);
  };

  const getBorrowNotificationKey = (item) =>
    `${item?.sourceCollection || BORROW_REQUEST_COLLECTION}:${item?.id || ""}`;

  const getBorrowNotificationFingerprint = (item) =>
    [
      item?.status || "",
      item?.pickupDate || "",
      item?.returnDate || "",
      item?.staffNote || ""
    ].join("|");

  const buildBorrowNotificationBody = (item) => {
    const requestNo = item.requestNo || item.id || "-";
    const assetsText = summarizeAssetsInline(item.assets || []);
    const dateText = formatDateRange(item.pickupDate, item.returnDate);
    const noteText = (item.staffNote || "").toString().trim();
    return `เลขที่ ${requestNo} • ${assetsText} • ${dateText}${noteText ? ` • ${noteText}` : ""}`;
  };

  const buildBorrowNotificationTitle = (status) => {
    if (status === STATUS_APPROVED) return "คำขอยืมพัสดุได้รับอนุมัติ";
    if (status === STATUS_RECEIVED) return "บันทึกรับพัสดุแล้ว";
    if (status === STATUS_REJECTED) return "คำขอยืมพัสดุไม่อนุมัติ";
    if (status === STATUS_CANCELLED) return "คำขอยืมพัสดุถูกยกเลิก";
    if (status === STATUS_RETURNED) return "บันทึกคืนพัสดุแล้ว";
    return "คำขอยืมพัสดุมีการอัปเดต";
  };

  const buildBorrowNotificationMap = (list = []) => {
    const email = readCurrentAccountEmail();
    const map = new Map();
    if (!email) return map;
    list
      .filter((item) => !item.isDeleted)
      .filter((item) => matchesCurrentAccountEmail(item.requesterEmail, item.accountEmail))
      .forEach((item) => {
        const key = getBorrowNotificationKey(item);
        if (key.endsWith(":")) return;
        map.set(key, {
          status: item.status,
          pickupDate: item.pickupDate || "",
          returnDate: item.returnDate || "",
          fingerprint: getBorrowNotificationFingerprint(item),
          item
        });
      });
    return map;
  };

  const syncBorrowStatusNotifications = (list = []) => {
    const nextMap = buildBorrowNotificationMap(list);
    if (!hasBorrowNotificationBaseline) {
      previousBorrowNotificationByKey = nextMap;
      hasBorrowNotificationBaseline = true;
      return;
    }
    nextMap.forEach((next, key) => {
      const prev = previousBorrowNotificationByKey.get(key);
      if (!prev || prev.fingerprint === next.fingerprint) return;
      const statusChanged = prev.status !== next.status;
      const pickupChanged = prev.pickupDate !== next.pickupDate;
      const returnChanged = prev.returnDate !== next.returnDate;
      const shouldNotifyStatus = statusChanged && next.status !== STATUS_PENDING;
      const shouldNotifyDate =
        (pickupChanged || returnChanged) &&
        (next.status === STATUS_APPROVED || next.status === STATUS_RECEIVED);
      if (!shouldNotifyStatus && !shouldNotifyDate) return;

      const title = shouldNotifyStatus
        ? buildBorrowNotificationTitle(next.status)
        : "วันรับ-คืนพัสดุมีการอัปเดต";
      const body = buildBorrowNotificationBody(next.item);
      maybeSendBorrowBrowserNotification(title, body);
      showBorrowRuntimeToastNotice(
        title,
        body,
        next.status === STATUS_REJECTED || next.status === STATUS_CANCELLED ? "error" : "success"
      );
      setBorrowNotificationStatus(`แจ้งเตือนล่าสุด: ${title}`, "#047857");
    });
    previousBorrowNotificationByKey = nextMap;
  };

  const setStaffBorrowNotificationStatus = (text = "", color = "#6b7280") => {
    if (!staffBorrowNotificationStatusEl) return;
    staffBorrowNotificationStatusEl.textContent = text;
    staffBorrowNotificationStatusEl.style.color = color;
  };

  const maybeSendStaffBorrowBrowserNotification = (title, body) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return false;
    if (Notification.permission !== "granted") return false;
    try {
      const webPush = window.sgcuWebPush;
      if (webPush && typeof webPush.showNotification === "function") {
        void webPush.showNotification(title, body, {
          icon: "img/icons/treasurer-icon-192.png",
          badge: "img/icons/treasurer-icon-192.png",
          data: { url: "./#borrow-assets-staff" }
        });
        return true;
      }
      const notificationIcon = "img/icons/treasurer-icon-192.png";
      // eslint-disable-next-line no-new
      new Notification(title, { body, icon: notificationIcon, badge: notificationIcon });
      return true;
    } catch (_) {
      return false;
    }
  };

  const buildStaffBorrowNotificationBody = (item) => {
    const requestNo = item.requestNo || item.id || "-";
    const requesterName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || item.requesterEmail || "-";
    const assetsText = summarizeAssetsInline(item.assets || []);
    const dateText = formatDateRange(item.pickupDate, item.returnDate);
    return `เลขที่ ${requestNo} • ${requesterName} • ${assetsText} • ${dateText}`;
  };

  const getStaffBorrowNotificationKey = (item) =>
    `${item?.sourceCollection || BORROW_REQUEST_COLLECTION}:${item?.id || ""}`;

  const getStaffBorrowNotificationFingerprint = (item) => {
    const meta = buildBorrowFollowupMeta(item);
    const followupState = meta.dueSoon
      ? (meta.overdue ? `overdue:${meta.dayDiff}` : `due:${meta.dayDiff}`)
      : "";
    return [
      item?.status || "",
      item?.pickupDate || "",
      item?.returnDate || "",
      item?.submittedAtMs || "",
      followupState
    ].join("|");
  };

  const buildStaffBorrowNotificationMap = (list = []) => {
    const map = new Map();
    if (!hasStaffPermission()) return map;
    list
      .filter((item) => !item.isDeleted)
      .forEach((item) => {
        const key = getStaffBorrowNotificationKey(item);
        if (key.endsWith(":")) return;
        map.set(key, {
          status: item.status,
          fingerprint: getStaffBorrowNotificationFingerprint(item),
          item
        });
      });
    return map;
  };

  const syncStaffBorrowNotifications = (list = []) => {
    const nextMap = buildStaffBorrowNotificationMap(list);
    if (!hasStaffBorrowNotificationBaseline) {
      previousStaffBorrowNotificationByKey = nextMap;
      hasStaffBorrowNotificationBaseline = true;
      return;
    }
    nextMap.forEach((next, key) => {
      const prev = previousStaffBorrowNotificationByKey.get(key);
      const meta = buildBorrowFollowupMeta(next.item);
      const isNewPending = !prev && next.status === STATUS_PENDING;
      const becameFollowup =
        meta.dueSoon &&
        (next.status === STATUS_APPROVED || next.status === STATUS_RECEIVED) &&
        (!prev || prev.fingerprint !== next.fingerprint);
      if (!isNewPending && !becameFollowup) return;

      const title = isNewPending
        ? "มีคำขอยืมพัสดุใหม่"
        : meta.overdue ? "พัสดุเกินกำหนดคืน" : "พัสดุใกล้ครบกำหนดคืน";
      const body = isNewPending
        ? buildStaffBorrowNotificationBody(next.item)
        : `${buildStaffBorrowNotificationBody(next.item)} • ${meta.statusText}`;
      maybeSendStaffBorrowBrowserNotification(title, body);
      showBorrowRuntimeToastNotice(title, body, meta.overdue ? "error" : "success");
      setStaffBorrowNotificationStatus(`แจ้งเตือนล่าสุด: ${title}`, meta.overdue ? "#b91c1c" : "#047857");
    });
    previousStaffBorrowNotificationByKey = nextMap;
  };

  const getAssetsCsvText = (assets = []) =>
    (Array.isArray(assets) ? assets : [])
      .map((asset) => {
        const name = asset?.name || asset?.code || "-";
        const code = asset?.code ? ` (${asset.code})` : "";
        const qty = Number(asset?.qty || 0);
        const qtyText = Number.isFinite(qty) ? String(qty) : "0";
        return `${name}${code} ${qtyText} ${asset?.unit || ""}`.trim();
      })
      .join(" | ");

  const toBorrowCsvRow = (item) => ({
    "เลขคำขอ": item.requestNo || item.id || "",
    "วันที่ยื่น": item.createdDate || "",
    "ปีการศึกษา": item.academicYear || "",
    "ชื่อผู้ขอ": [item.firstName, item.lastName].filter(Boolean).join(" ").trim(),
    "ชื่อเล่น": item.nickname || "",
    "อีเมล": item.requesterEmail || "",
    "รหัสนิสิต": item.studentId || "",
    "คณะ": item.faculty || "",
    "ชั้นปี": item.year || "",
    "เบอร์โทร": item.phone || "",
    "Line ID": item.lineId || "",
    "ประเภทองค์กร": item.projectName || "",
    "โครงการ": item.borrowProjectName || "",
    "ฝ่าย / ชมรม": item.projectDept || "",
    "กิจกรรม": item.projectDetail || "",
    "รายการพัสดุ": getAssetsCsvText(item.assets),
    "วันที่รับ": item.pickupDate || "",
    "วันที่คืน": item.returnDate || "",
    "สถานะ": statusText(item.status),
    "หมายเหตุเจ้าหน้าที่": item.staffNote || ""
  });

  const exportBorrowRowsCsv = (rows = [], fileName = "borrow-asset-requests") => {
    window.sgcuCsvExport?.download({
      fileName,
      headers: [
        "เลขคำขอ",
        "วันที่ยื่น",
        "ปีการศึกษา",
        "ชื่อผู้ขอ",
        "ชื่อเล่น",
        "อีเมล",
        "รหัสนิสิต",
        "คณะ",
        "ชั้นปี",
        "เบอร์โทร",
        "Line ID",
        "ประเภทองค์กร",
        "โครงการ",
        "ฝ่าย / ชมรม",
        "กิจกรรม",
        "รายการพัสดุ",
        "วันที่รับ",
        "วันที่คืน",
        "สถานะ",
        "หมายเหตุเจ้าหน้าที่"
      ],
      rows: rows.map(toBorrowCsvRow)
    });
  };

