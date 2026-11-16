  const renderBorrowRequests = () => {
    renderMyRequests();
    renderMyBorrowOverview();
    populateStaffBorrowRequestFilterOptions();
    renderManagedBorrowProjectFilter();
    updateStaffBorrowMobileFilterToggle();
    renderStaffQueue();
    renderStaffHistory();
  };

  const normalizeBorrowRequest = (id, data) => {
    const safeData = data && typeof data === "object" ? data : {};
    const createdAtMs = timestampToMillis(data.createdAt) || Number(data.submittedAtMs) || 0;
    const updatedAtMs = timestampToMillis(data.updatedAt) || createdAtMs;
    const studentId = (safeData.studentId || "").toString().trim();
    const yearAtSubmit = deriveBorrowStudentYearFromId(studentId, createdAtMs || safeData.createdAt || new Date()) ||
      (safeData.year || "").toString().trim();
    const rawAssets = Array.isArray(safeData.assets) ? safeData.assets : [];
    const assets = rawAssets
      .map((asset) => {
        if (!asset || typeof asset !== "object") return null;
        const code = (asset.code || "").toString().trim();
        const name = (asset.name || "").toString().trim();
        const qtyNum = Number(asset.qty);
        const qty = Number.isFinite(qtyNum) ? Math.max(0, Math.trunc(qtyNum)) : 0;
        const unit = (asset.unit || "").toString().trim();
        if (!code && !name) return null;
        return { code, name, qty, unit };
      })
      .filter(Boolean);
    return {
      id,
      requestNo: (safeData.requestNo || "").toString().trim().toUpperCase(),
      status: normalizeRequestStatus(safeData.status),
      isDeleted: normalizeDeletedFlag(safeData.isDeleted),
      sourceCollection: BORROW_REQUEST_COLLECTION,
      requesterEmail: (safeData.requesterEmail || "").toString().trim().toLowerCase(),
      accountEmail: normalizeAccountEmail(safeData.accountEmail || safeData.requesterEmail || ""),
      firstName: (safeData.firstName || "").toString().trim(),
      lastName: (safeData.lastName || "").toString().trim(),
      nickname: (safeData.nickname || "").toString().trim(),
      studentId,
      faculty: (safeData.faculty || "").toString().trim(),
      year: yearAtSubmit,
      phone: (safeData.phone || "").toString().trim(),
      lineId: (safeData.lineId || "").toString().trim(),
      academicYear: (safeData.academicYear || safeData.schoolYear || "").toString().trim(),
      borrowProjectId: (safeData.borrowProjectId || "").toString(),
      borrowProjectName: (safeData.borrowProjectName || "").toString(),
      projectName: (safeData.projectName || "").toString().trim(),
      projectDept: (safeData.projectDept || "").toString().trim(),
      projectOrgSource: (safeData.projectOrgSource || "").toString().trim().toLowerCase(),
      projectDetail: (safeData.projectDetail || "").toString().trim(),
      pickupDate: (safeData.pickupDate || "").toString().trim(),
      originalPickupDate: (safeData.originalPickupDate || "").toString().trim(),
      returnDate: (safeData.returnDate || "").toString().trim(),
      assets,
      staffNote: (safeData.staffNote || "").toString().trim(),
      createdDate: (safeData.createdDate || "").toString().trim(),
      updatedAtMs,
      submittedAtMs: createdAtMs
    };
  };

  let borrowRequestsPage = "";
  const subscribeBorrowRequests = async (page =
    document.querySelector(".page-view.active")?.dataset.page ||
    (window.location.hash || "").replace("#", "").trim()
  ) => {
    borrowRequestsPage = page;
    const accessCheckSeq = ++borrowStaffAccessCheckSeq;
    resolveFirestoreBridge();
    if (!hasFirestore) {
      borrowRequests = [];
      myRequestsLoadState = "error";
      myRequestsLoadError = "ระบบฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่";
      renderBorrowRequests();
      setStaffQueueStatusMessage("ระบบฐานข้อมูลยังไม่พร้อม (กำลังเชื่อมต่อ Firestore)");
      setStaffQueueMessage("กำลังเชื่อมต่อฐานข้อมูล...", "#6b7280");
      return;
    }
    if (Array.isArray(unsubscribeBorrowRequests) && unsubscribeBorrowRequests.length) {
      unsubscribeBorrowRequests.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          // ignore
        }
      });
    }
    unsubscribeBorrowRequests = [];
    collectionSnapshotRows.clear();
    collectionSnapshotCounts.clear();
    collectionSnapshotErrors.clear();
    borrowRequests = [];
    borrowRequestsSnapshotCount = 0;
    myRequestsLoadState = "loading";
    myRequestsLoadError = "";
    renderBorrowRequests();

    const mergeAndRender = () => {
      const merged = [];
      collectionSnapshotRows.forEach((docs) => {
        docs.forEach((docItem) => merged.push(docItem));
      });
      borrowRequestsSnapshotCount = merged.length;
      borrowRequests = merged.sort((a, b) => (b.submittedAtMs || 0) - (a.submittedAtMs || 0));
      syncBorrowStatusNotifications(borrowRequests);
      syncStaffBorrowNotifications(borrowRequests);
      renderBorrowRequests();
    };

    BORROW_REQUEST_COLLECTIONS.forEach((name) => {
      ["active", "history"].forEach((scope) => {
        const key = `${name}:${scope}`;
        collectionSnapshotRows.set(key, []);
        collectionSnapshotCounts.set(key, 0);
        collectionSnapshotErrors.set(key, "");
      });
    });

    const currentEmail = readCurrentUserEmail();
    // A staff profile does not imply permission to read the entire borrow queue.
    // The requester page always uses the owner's query, including for staff accounts.
    let shouldReadAllRequests = false;
    const isStaffBorrowPage = page === "borrow-assets-staff";
    lastBorrowStaffAccessResult = null;

    if (isStaffBorrowPage && currentEmail) {
      setStaffQueueStatusMessage("กำลังตรวจสอบสิทธิ์ Staff สำหรับหน้ายืม-คืนพัสดุ...");
      const access = await readBorrowStaffProfileAccess(currentEmail);
      if (accessCheckSeq !== borrowStaffAccessCheckSeq) return;
      lastBorrowStaffAccessResult = access;
      shouldReadAllRequests = access.ok;
      if (!shouldReadAllRequests) {
        const detail = access.reason === "missing-profile"
          ? `ไม่พบ ${access.path}`
          : access.reason === "not-staff-profile"
            ? `${access.path} ยังไม่มี field staff profile ที่ rules ใช้ตรวจสิทธิ์`
            : access.reason === "permission-denied"
              ? `อ่าน ${access.path} ไม่ได้ (permission-denied)`
              : access.hasAnyExplicitPages
                ? `${access.path} ไม่มีสิทธิ์ borrow-assets-staff ใน allowedPages`
                : `${access.path || "staffProfiles"} ยังไม่ผ่านสิทธิ์จัดการพัสดุ`;
        borrowRequests = [];
        myRequestsLoadState = "idle";
        myRequestsLoadError = "";
        renderBorrowRequests();
        setStaffQueueStatusMessage(detail);
        return;
      }
    }

    if (!currentEmail && !shouldReadAllRequests) {
      borrowRequests = [];
      myRequestsLoadState = "idle";
      myRequestsLoadError = "";
      renderBorrowRequests();
      setStaffQueueStatusMessage("กรุณาเข้าสู่ระบบก่อนดูคิวคำขอ");
      return;
    }

    BORROW_REQUEST_COLLECTIONS.forEach((collectionName) => {
      const colRef = firestore.collection(firestore.db, collectionName);
      const querySpecs = shouldReadAllRequests
        ? [
          {
            scope: "active",
            query: firestore.query && firestore.where
              ? firestore.query(
                colRef,
                firestore.where("status", "in", [STATUS_PENDING, STATUS_APPROVED, STATUS_RECEIVED]),
                ...(firestore.limit ? [firestore.limit(BORROW_REQUEST_ACTIVE_LIST_LIMIT)] : [])
              )
              : (firestore.limit && firestore.query ? firestore.query(colRef, firestore.limit(BORROW_REQUEST_ACTIVE_LIST_LIMIT)) : colRef)
          },
          {
            scope: "history",
            query: firestore.query && firestore.where
              ? firestore.query(
                colRef,
                firestore.where("status", "in", [STATUS_REJECTED, STATUS_CANCELLED, STATUS_RETURNED]),
                ...(firestore.limit ? [firestore.limit(BORROW_REQUEST_HISTORY_LIST_LIMIT)] : [])
              )
              : (firestore.limit && firestore.query ? firestore.query(colRef, firestore.limit(BORROW_REQUEST_HISTORY_LIST_LIMIT)) : colRef)
          }
        ]
        : [
          {
            scope: "mine",
            query: currentEmail && firestore.query && firestore.where
              ? firestore.query(
                colRef,
                firestore.where("requesterEmail", "==", currentEmail),
                ...(firestore.limit ? [firestore.limit(BORROW_REQUEST_ACTIVE_LIST_LIMIT)] : [])
              )
              : (firestore.limit && firestore.query ? firestore.query(colRef, firestore.limit(BORROW_REQUEST_ACTIVE_LIST_LIMIT)) : colRef)
          }
        ];

      querySpecs.forEach(({ scope, query: requestQuery }) => {
        const snapshotKey = `${collectionName}:${scope}`;
        const unsubscribe = firestore.onSnapshot(
        requestQuery,
        (snapshot) => {
          if (accessCheckSeq !== borrowStaffAccessCheckSeq) return;
          collectionSnapshotErrors.set(snapshotKey, "");
          collectionSnapshotCounts.set(snapshotKey, Number(snapshot.size || 0));
          myRequestsLoadState = "loaded";
          myRequestsLoadError = "";
          const normalized = [];
          const badDocIds = [];
          snapshot.docs.forEach((docSnap) => {
            try {
              const item = normalizeBorrowRequest(docSnap.id, docSnap.data() || {});
              item.sourceCollection = collectionName;
              normalized.push(item);
            } catch (err) {
              badDocIds.push(docSnap.id);
              console.error("borrow request doc malformed - app.borrow-assets.js:2004", collectionName, docSnap.id, err);
            }
          });
          collectionSnapshotRows.set(snapshotKey, normalized);
          mergeAndRender();
          const visibleCount = borrowRequestsSnapshotCount;
          if (visibleCount > 0) {
            setStaffQueueMessage(`โหลดคำขอสำเร็จ ${visibleCount} รายการ`, "#047857");
          } else {
            setStaffQueueMessage("", "#374151");
          }
          if (badDocIds.length) {
            setStaffQueueStatusMessage(
              `ข้ามข้อมูลที่รูปแบบผิด ${badDocIds.length} รายการ (ID: ${badDocIds.join(", ")})`
            );
          }
        },
        (error) => {
          if (accessCheckSeq !== borrowStaffAccessCheckSeq) return;
          const code = (error?.code || "").toString();
          const loggedIn = !!readCurrentUserEmail();
          collectionSnapshotErrors.set(snapshotKey, code || "unknown");
          collectionSnapshotRows.set(snapshotKey, []);
          collectionSnapshotCounts.set(snapshotKey, 0);
          myRequestsLoadState = "error";
          myRequestsLoadError = code === "permission-denied"
            ? (shouldReadAllRequests
              ? "บัญชีนี้ยังไม่มีสิทธิ์อ่านข้อมูลคิวคำขอ"
              : "บัญชีนี้ยังไม่มีสิทธิ์อ่านสถานะคำขอของตนเอง")
            : "โหลดสถานะคำขอไม่สำเร็จ กรุณาลองใหม่";
          mergeAndRender();
          const totalNow = borrowRequestsSnapshotCount;
          if (totalNow > 0) {
            return;
          }
          if (code === "permission-denied") {
            if (hasStaffPermission() && loggedIn) {
              const access = lastBorrowStaffAccessResult;
              const detail = access?.path
                ? access.reason === "profile-loaded"
                  ? `${access.path} ผ่าน preflight แล้ว แต่ Firestore Rules ยังปฏิเสธ ${collectionName}; ตรวจว่า allowedPages มี borrow-assets-staff และ Rules ถูก deploy ล่าสุด`
                  : `${access.path} ตรวจสิทธิ์ Staff ไม่ผ่าน (${access.reason || "unknown"})`
                : `บัญชี Staff นี้ยังไม่มีสิทธิ์อ่านข้อมูลใน ${collectionName} (Firestore Rules)`;
              setStaffQueueStatusMessage(
                detail
              );
            } else if (!loggedIn) {
              setStaffQueueStatusMessage("กรุณาเข้าสู่ระบบก่อนดูคิวคำขอ");
            } else {
              setStaffQueueStatusMessage("บัญชีนี้ยังไม่มีสิทธิ์อ่านข้อมูลคิวคำขอ");
            }
            return;
          }
          setStaffQueueStatusMessage("ไม่สามารถโหลดคิวคำขอได้ในขณะนี้");
          setStaffQueueMessage("โหลดคิวคำขอไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
          console.error("borrow assets subscribe failed - app.borrow-assets.js:2046", collectionName, error);
        }
        );
        unsubscribeBorrowRequests.push(unsubscribe);
      });
    });
  };

  const submitBorrowRequest = async () => {
    if (!borrowRequestForm || !borrowSubmitBtn) return;
    if (!borrowCatalogReady) {
      setBorrowMessage("กำลังโหลดโครงการและช่วงเปิดรับคำขอ กรุณาลองอีกครั้ง", "#b91c1c");
      return;
    }
    const selectedBorrowProject = borrowProjectName?.value === BORROW_PROJECT_ORG
      ? managedBorrowProjects.find(project => project.id === borrowManagedProject?.value && project.active && project.academicYear === String(getBorrowAcademicYearBE()))
      : null;
    if (isBorrowProjectMode() && !selectedBorrowProject) {
      setBorrowMessage("กรุณาเลือกโครงการที่เปิดรับคำขอในปีการศึกษานี้", "#b91c1c");
      borrowManagedProject?.focus();
      return;
    }
    const today = dayKeyBangkok(new Date());
    if (selectedBorrowProject && ((selectedBorrowProject.from && today < selectedBorrowProject.from) || (selectedBorrowProject.to && today > selectedBorrowProject.to))) {
      setBorrowMessage("ขณะนี้อยู่นอกช่วงวันที่เปิดรับคำขอของโครงการนี้", "#b91c1c");
      return;
    }
    if (!borrowRequestForm.reportValidity()) return;
    if (!getBorrowProjectDeptValueForSubmit()) {
      setBorrowMessage(`กรุณา${usesManualBorrowDept() ? "กรอกชื่อ" : "เลือก"}${getBorrowDeptLabel()}`, "#b91c1c");
      (usesManualBorrowDept() ? borrowProjectDeptOther : borrowProjectDept)?.focus();
      return;
    }

    currentUserEmail = readCurrentUserEmail();
    if (!currentUserEmail) {
      setBorrowMessage("กรุณาเข้าสู่ระบบก่อนส่งคำขอยืมพัสดุ", "#b91c1c");
      return;
    }
    if (!resolveFirestoreBridge()) {
      setBorrowMessage("ระบบฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่อีกครั้ง", "#b91c1c");
      return;
    }
    const pickupDateObj = parseDateYmd(borrowPickupDate?.value || "");
    const returnDateObj = parseDateYmd(borrowReturnDate?.value || "");
    if (!pickupDateObj || !returnDateObj) {
      setBorrowMessage("กรุณาเลือกวันที่รับและวันที่คืนพัสดุให้ครบถ้วน", "#b91c1c");
      return;
    }
    if (returnDateObj.getTime() < pickupDateObj.getTime()) {
      setBorrowMessage("วันที่คืนพัสดุต้องไม่ก่อนวันที่รับพัสดุ", "#b91c1c");
      return;
    }
    const pickupDay = pickupDateObj.getDay();
    const allowedPickupDays = selectedBorrowProject?.customWeekdays ? selectedBorrowProject.pickupDays : getAllowedPickupDays();
    if (selectedBorrowProject?.customWeekdays
      ? !projectDateAllowed(selectedBorrowProject, "pickupDays", borrowPickupDate?.value || "")
      : !allowedPickupDays.includes(pickupDay)) {
      const dayText = formatAllowedPickupDays(allowedPickupDays);
      setBorrowMessage(
        dayText === "ทุกวัน"
          ? "วันที่รับพัสดุไม่ถูกต้อง"
          : `วันที่รับพัสดุต้องเป็นวัน${dayText}เท่านั้น`,
        "#b91c1c"
      );
      return;
    }

    const assetsResult = collectAssetItems();
    if (!assetsResult.ok) {
      setBorrowMessage(assetsResult.message || "ข้อมูลรายการพัสดุไม่ถูกต้อง", "#b91c1c");
      return;
    }
    const requesterProfile = await getBorrowProfileForSubmit();
    if (!requesterProfile) {
      setBorrowMessage("ไม่พบข้อมูลผู้ใช้งาน กรุณากรอกและบันทึกที่หน้าเข้าสู่ระบบก่อน", "#b91c1c");
      return;
    }
    if (
      !requesterProfile.firstName ||
      !requesterProfile.lastName ||
      !requesterProfile.nickname ||
      !requesterProfile.studentId ||
      !requesterProfile.faculty ||
      !requesterProfile.year ||
      !requesterProfile.phone ||
      !requesterProfile.lineId
    ) {
      setBorrowMessage("ข้อมูลผู้ใช้งานยังไม่ครบ กรุณาอัปเดตที่หน้าเข้าสู่ระบบก่อน", "#b91c1c");
      return;
    }
    await ensureBorrowOrgCodeData();
    if (!getBorrowRequestNoParts()) {
      setBorrowMessage(
        `ไม่พบรหัสองค์กรจากข้อมูลกลาง (คอลัมน์ C) กรุณาตรวจสอบประเภทองค์กร/ฝ่ายหรือเลือก '${EXTERNAL_ORG_LABEL}'`,
        "#b91c1c"
      );
      return;
    }

    const payload = {
      academicYear: getBorrowAcademicYearBE(),
      firstName: requesterProfile.firstName,
      lastName: requesterProfile.lastName,
      nickname: requesterProfile.nickname,
      studentId: requesterProfile.studentId,
      faculty: requesterProfile.faculty,
      year: requesterProfile.year,
      phone: requesterProfile.phone,
      lineId: requesterProfile.lineId,
      borrowProjectId: selectedBorrowProject?.id || "",
      borrowProjectName: selectedBorrowProject?.name || "",
      projectName: getBorrowProjectNameValueForSubmit(),
      projectDept: getBorrowProjectDeptValueForSubmit(),
      projectOrgSource: borrowProjectName?.value === OTHER_ORG_VALUE ? "external" : "master",
      projectDetail: borrowProjectDetail?.value.trim() || "",
      pickupDate: borrowPickupDate?.value || "",
      originalPickupDate: borrowPickupDate?.value || "",
      returnDate: borrowReturnDate?.value || "",
      assets: assetsResult.items,
      requesterEmail: currentUserEmail,
      accountEmail: readCurrentAccountEmail(),
      status: STATUS_PENDING,
      staffNote: "",
      createdDate: toYmd(new Date()),
      submittedAtMs: Date.now(),
      createdAt: firestore.serverTimestamp(),
      updatedAt: firestore.serverTimestamp()
    };

    borrowSubmitBtn.disabled = true;
    setBorrowMessage("กำลังส่งคำขอ...", "#374151");
    try {
      const docRef = await createBorrowRequestWithNextNumber(payload);
      // The request is committed. Optional logging or UI cleanup must not report a failed submission.
      const successMessage = `ส่งคำขอเรียบร้อยแล้ว${payload.requestNo ? ` เลขที่ ${payload.requestNo}` : ""} สามารถติดตามสถานะได้ด้านล่าง`;
      setBorrowMessage(successMessage, "#15803d");
      try {
        Promise.resolve(window.sgcuAuditLog?.write?.({
          action: "borrow.request.create",
          entityType: "borrowAssetRequest",
          entityId: docRef?.id || "",
          after: payload,
          source: "web_app"
        })).catch(error => console.error("borrow request audit failed", error));
      } catch (error) {
        console.error("borrow request audit failed", error);
      }
      try {
        borrowRequestForm.reset();
        toggleBorrowProjectNameOther();
        renderManagedBorrowProjects();
        resetAssetRows();
        setBorrowMessage(successMessage, "#15803d");
      } catch (error) {
        setBorrowMessage(`${successMessage} กรุณารีเฟรชหน้าก่อนส่งคำขอใหม่`, "#15803d");
        console.error("borrow request saved but form reset failed", error);
      }
    } catch (error) {
      const code = (error?.code || "").toString().replace(/^firestore\//, "");
      const hasLogin = !!readCurrentUserEmail();
      if (code === "permission-denied") {
        if (!hasLogin) {
          setBorrowMessage("กรุณาเข้าสู่ระบบก่อนส่งคำขอ", "#b91c1c");
        } else {
          setBorrowMessage(
            "ส่งคำขอไม่ได้ กรุณาตรวจสอบช่วงเปิดรับคำขอและโครงการอีกครั้ง หรือติดต่อสตาฟเพื่อตรวจสอบสิทธิ์",
            "#b91c1c"
          );
        }
      } else {
        const messages = {
          "resource-exhausted": "โควตาฐานข้อมูลเต็มชั่วคราว จึงยังส่งคำขอไม่ได้ กรุณาติดต่อสตาฟหรือรอให้โควตากลับมา (resource-exhausted)",
          "unavailable": "เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
          "deadline-exceeded": "การส่งคำขอใช้เวลานาน กรุณาตรวจสอบรายการคำขอก่อนลองใหม่",
          "unauthenticated": "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่",
          "invalid-argument": "ข้อมูลคำขอบางส่วนไม่ถูกต้อง กรุณาติดต่อสตาฟ (invalid-argument)",
          "aborted": "มีการส่งคำขอพร้อมกัน กรุณาลองส่งอีกครั้ง",
          "borrow/missing-org-code": "ไม่พบรหัสองค์กร กรุณาเลือกประเภทองค์กรและฝ่ายใหม่"
        };
        const diagnostic = (code || error?.name || "unknown").replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 60);
        setBorrowMessage(messages[code] || `ส่งคำขอไม่สำเร็จ (${diagnostic}) กรุณาแจ้งรหัสนี้ให้สตาฟตรวจสอบ`, "#b91c1c");
      }
      console.error("borrow request submit failed - app.borrow-assets.js:2167", error);
    } finally {
      borrowSubmitBtn.disabled = false;
    }
  };

  const updateBorrowRequestStatus = async (requestId, nextStatus, noteText = "", sourceCollection = "", datePatch = {}) => {
    if (!requestId) return;
    if (!resolveFirestoreBridge()) return;
    const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
    const beforeRequestSnapshot = requestItem ? { ...requestItem } : null;
    const targetCollection = requestItem?.sourceCollection || sourceCollection || BORROW_REQUEST_COLLECTION;
    const hasPickupDatePatch = Object.prototype.hasOwnProperty.call(datePatch, "pickupDate");
    const hasReturnDatePatch = Object.prototype.hasOwnProperty.call(datePatch, "returnDate");
    const hasAssetsPatch = Object.prototype.hasOwnProperty.call(datePatch, "assets");
    const nextAssets = hasAssetsPatch && Array.isArray(datePatch.assets)
      ? datePatch.assets
      : (Array.isArray(requestItem?.assets) ? requestItem.assets : []);
    const nextPickupDate = (hasPickupDatePatch ? datePatch.pickupDate : requestItem?.pickupDate || "").toString().trim();
    const nextReturnDate = (hasReturnDatePatch ? datePatch.returnDate : requestItem?.returnDate || "").toString().trim();
    const pickupChanged = !!nextPickupDate && !!requestItem?.pickupDate && nextPickupDate !== requestItem.pickupDate;
    const trimmedNote = (noteText || "").toString().trim() || (pickupChanged ? formatPickupAppointmentNote(nextPickupDate) : "");
    const targetStatus = normalizeRequestStatus(nextStatus);
    const actorEmail = readCurrentUserEmail();
    const docRef = firestore.doc(firestore.db, targetCollection, requestId);
    const payload = {
      status: targetStatus,
      staffNote: trimmedNote,
      staffUpdatedBy: actorEmail,
      updatedAt: firestore.serverTimestamp()
    };
    if (hasPickupDatePatch && nextPickupDate && nextPickupDate !== requestItem?.pickupDate) {
      payload.pickupDate = nextPickupDate;
    }
    if (hasReturnDatePatch && nextReturnDate && nextReturnDate !== requestItem?.returnDate) {
      payload.returnDate = nextReturnDate;
    }
    if (hasAssetsPatch) {
      payload.assets = nextAssets;
    }
    if (pickupChanged && !requestItem?.originalPickupDate) {
      payload.originalPickupDate = requestItem.pickupDate;
    }
    if (typeof firestore.runTransaction !== "function") {
      await firestore.updateDoc(docRef, payload);
      void window.sgcuAuditLog?.write?.({
        action: "borrow.request.status_update",
        entityType: "borrowAssetRequest",
        entityId: requestId,
        before: beforeRequestSnapshot,
        after: payload,
        metadata: { sourceCollection: targetCollection },
        source: "web_app_staff"
      });
      return;
    }

    await firestore.runTransaction(firestore.db, async (transaction) => {
      const requestSnap = await transaction.get(docRef);
      if (!requestSnap.exists()) {
        const err = new Error("ไม่พบคำขอในระบบ");
        err.code = "not-found";
        throw err;
      }
      const data = requestSnap.data() || {};
      const currentStatus = normalizeRequestStatus(data.status);
      const deltas = buildReservationDeltas(currentStatus, targetStatus, data.assets || [], nextAssets);
      await applyStockDeltasInTransaction(transaction, deltas, actorEmail);
      transaction.update(docRef, payload);
    });
    void window.sgcuAuditLog?.write?.({
      action: "borrow.request.status_update",
      entityType: "borrowAssetRequest",
      entityId: requestId,
      before: beforeRequestSnapshot,
      after: payload,
      metadata: { sourceCollection: targetCollection },
      source: "web_app_staff"
    });
  };

  const deleteBorrowRequest = async (requestId, sourceCollection = "") => {
    if (!requestId) return;
    if (!resolveFirestoreBridge()) return;
    const requestItem = getBorrowRequestByKey(requestId, sourceCollection);
    const beforeRequestSnapshot = requestItem ? { ...requestItem } : null;
    const targetCollection = requestItem?.sourceCollection || sourceCollection || BORROW_REQUEST_COLLECTION;
    const docRef = firestore.doc(firestore.db, targetCollection, requestId);
    const actorEmail = readCurrentUserEmail();
    if (typeof firestore.runTransaction === "function") {
      await firestore.runTransaction(firestore.db, async (transaction) => {
        const requestSnap = await transaction.get(docRef);
        if (!requestSnap.exists()) return;
        const data = requestSnap.data() || {};
        const deltas = buildReservationDeltas(data.status, STATUS_CANCELLED, data.assets || []);
        await applyStockDeltasInTransaction(transaction, deltas, actorEmail);
        transaction.delete(docRef);
      });
      if (requestItem) {
        requestItem.isDeleted = true;
      }
      void window.sgcuAuditLog?.write?.({
        action: "borrow.request.delete",
        entityType: "borrowAssetRequest",
        entityId: requestId,
        before: beforeRequestSnapshot,
        metadata: { sourceCollection: targetCollection, mode: "hard_delete_transaction" },
        source: "web_app_staff"
      });
      return;
    }
    await firestore.deleteDoc(docRef);
    if (requestItem) {
      requestItem.isDeleted = true;
    }
    void window.sgcuAuditLog?.write?.({
      action: "borrow.request.delete",
      entityType: "borrowAssetRequest",
      entityId: requestId,
      before: beforeRequestSnapshot,
      metadata: { sourceCollection: targetCollection, mode: "hard_delete" },
      source: "web_app_staff"
    });
  };

