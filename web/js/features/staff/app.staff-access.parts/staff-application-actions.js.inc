  const revokeApprovedApplication = async (applicationId, targetStatus = "pending") => {
    if (!resolveStore()) {
      setMessage(approvalMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }
    if (!isSuperStaff()) {
      setMessage(approvalMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return;
    }
    const id = (applicationId || "").toString().trim();
    if (!id) return;
    const target = currentApprovedHistory.find((item) => (item.id || "").toString() === id);
    if (!target) return;

    const nextStatus = targetStatus === "rejected" ? "rejected" : "pending";
    const statusLabel = nextStatus === "rejected" ? "ไม่อนุมัติ" : "รออนุมัติ";
    const ok = window.confirm(`ยืนยันเปลี่ยนสถานะคำขอของ "${target.applicantName || target.applicantEmail || "-"}" เป็น "${statusLabel}" ?`);
    if (!ok) return;

    try {
      const appRef = firestore.doc(firestore.db, COLLECTION_APPLICATIONS, id);
      await firestore.updateDoc(appRef, {
        status: nextStatus,
        reviewedByUid: "",
        reviewedByEmail: "",
        reviewedNote: nextStatus === "rejected"
          ? "ปรับสถานะเป็นไม่อนุมัติโดยหัวหน้าสตาฟ"
          : "ยกเลิกอนุมัติโดยหัวหน้าสตาฟ",
        approvedPosition: "",
        approvedPositionCode: "",
        updatedAt: firestore.serverTimestamp()
      });

      const applicantEmail = (target.applicantEmail || "").toString().trim().toLowerCase();
      if (applicantEmail) {
        const profileRef = firestore.doc(firestore.db, COLLECTION_PROFILES, applicantEmail);
        const profileSnap = firestore.getDoc ? await firestore.getDoc(profileRef) : null;
        const profileData = profileSnap?.exists?.() ? (profileSnap.data() || {}) : {};
        const existingPositions = extractExistingPositionsFromProfile(profileData);
        const nextPositions = existingPositions.filter(
          (entry) => (entry.sourceApplicationId || "") !== id
        );
        const nextProfile = buildProfileFieldsFromPositions(nextPositions);
        await firestore.setDoc(
          profileRef,
          {
            ...nextProfile,
            positionCodeXX: nextPositions.length ? (profileData.positionCodeXX || "") : "",
            positionCodeYY: nextProfile.positionCodeYY || "",
            positionCodeZZ: nextPositions.length ? (profileData.positionCodeZZ || "") : "",
            positionCodeAAA: nextPositions.length ? (profileData.positionCodeAAA || "") : "",
            sourceApplicationId: nextProfile.positions?.[0]?.sourceApplicationId || "",
            revokedAt: firestore.serverTimestamp(),
            updatedAt: firestore.serverTimestamp()
          },
          { merge: true }
        );
        if (!nextPositions.length) {
        clearLocalStaffCache(applicantEmail);
        } else {
          refreshLocalStaffCache(applicantEmail, {
            ...nextProfile,
            nick: (profileData.nick || "").toString()
          });
        }
      }

      setMessage(
        approvalMessageEl,
        nextStatus === "rejected" ? "เปลี่ยนเป็นไม่อนุมัติเรียบร้อยแล้ว" : "คืนเป็นรออนุมัติเรียบร้อยแล้ว",
        "#047857"
      );
      void window.sgcuAuditLog?.write?.({
        action: "staff.application.revoke",
        entityType: "staffApplication",
        entityId: id,
        before: target,
        after: {
          ...target,
          status: nextStatus,
          reviewedByUid: "",
          reviewedByEmail: "",
          reviewedNote: nextStatus === "rejected"
            ? "ปรับสถานะเป็นไม่อนุมัติโดยหัวหน้าสตาฟ"
            : "ยกเลิกอนุมัติโดยหัวหน้าสตาฟ",
          approvedPosition: "",
          approvedPositionCode: ""
        },
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("revoke approved application failed - app.staff-access.js:6720", error);
      const code = (error?.code || "unknown").toString();
      if (code === "permission-denied") {
        setMessage(approvalMessageEl, "ไม่มีสิทธิ์ยกเลิกอนุมัติ (permission-denied)", "#b91c1c");
      } else {
        setMessage(approvalMessageEl, "ยกเลิกอนุมัติไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
      }
    }
  };

  const updateApprovedPosition = async (applicationId, nextPositionRaw) => {
    if (!resolveStore()) {
      setMessage(approvalMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(approvalMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }

    const id = (applicationId || "").toString().trim();
    const nextPosition = normalizePositionText(nextPositionRaw || "");
    if (!id || !nextPosition) {
      setMessage(approvalMessageEl, "กรุณาระบุตำแหน่งใหม่ให้ถูกต้อง", "#b91c1c");
      return false;
    }

    const target = currentApprovedHistory.find((item) => (item.id || "").toString() === id);
    if (!target) {
      setMessage(approvalMessageEl, "ไม่พบรายการที่ต้องการปรับตำแหน่ง", "#b91c1c");
      return false;
    }

    const currentUser = readCurrentUser();
    const reviewerUid = (currentUser?.uid || "").toString();
    const reviewerEmail = (currentUser?.email || "").toString().trim().toLowerCase();

    try {
      const approvedPositionCodeMeta = await buildApprovedPositionCode(nextPosition);
      const approvedPositionCode = approvedPositionCodeMeta.code;
        const applicantEmail = (target.applicantEmail || "").toString().trim().toLowerCase();
        const applicantName = (target.applicantName || "").toString().trim();
        const applicantNick = (target.applicantNick || "").toString().trim();
        const positionMeta = findPositionAccessMeta(nextPosition, approvedPositionCodeMeta.yy, approvedPositionCodeMeta.zz);
        const nextPositionEntry = {
          name: nextPosition,
          code: approvedPositionCode,
          yy: approvedPositionCodeMeta.yy,
          zz: approvedPositionCodeMeta.zz,
          allowedPages: normalizeAllowedPages(readAllowedPagesInput(positionMeta || {}), approvedPositionCodeMeta.yy),
          sourceApplicationId: id,
          approvedAt: new Date().toISOString()
        };

      if (applicantEmail) {
        const profileRef = firestore.doc(firestore.db, COLLECTION_PROFILES, applicantEmail);
        const profileSnap = firestore.getDoc ? await firestore.getDoc(profileRef) : null;
        const profileData = profileSnap?.exists?.() ? (profileSnap.data() || {}) : {};
        const existingPositions = extractExistingPositionsFromProfile(profileData);
        const filteredPositions = existingPositions.filter(
          (entry) => (entry.sourceApplicationId || "") !== id
        );
        const nextPositions = [nextPositionEntry, ...filteredPositions];
        const nextProfile = buildProfileFieldsFromPositions(nextPositions);
        await firestore.setDoc(
          profileRef,
          {
            email: applicantEmail,
            name: applicantName,
            nick: applicantNick,
            ...nextProfile,
            approvedByUid: reviewerUid,
            approvedByEmail: reviewerEmail,
            approvedAt: firestore.serverTimestamp(),
            positionCodeXX: approvedPositionCodeMeta.xx,
            positionCodeYY: approvedPositionCodeMeta.yy,
            positionCodeZZ: approvedPositionCodeMeta.zz,
            positionCodeAAA: approvedPositionCodeMeta.aaa,
            sourceApplicationId: nextProfile.positions?.[0]?.sourceApplicationId || id,
            updatedAt: firestore.serverTimestamp()
          },
          { merge: true }
        );

        refreshLocalStaffCache(applicantEmail, {
          position: nextProfile.position,
          nick: applicantNick,
          role: nextProfile.role,
          divisionCodeYY: nextProfile.divisionCodeYY,
          positionCodeYY: nextProfile.positionCodeYY,
          positionCode: nextProfile.positionCode,
          positions: nextProfile.positions
        });
      }

      await ensurePositionExists(nextPosition, currentUser, {
        divisionCodeYY: approvedPositionCodeMeta.yy,
        levelCodeZZ: approvedPositionCodeMeta.zz,
        allowedPages: nextPositionEntry.allowedPages
      });

      const appRef = firestore.doc(firestore.db, COLLECTION_APPLICATIONS, id);
      await firestore.updateDoc(appRef, {
        reviewedByUid: reviewerUid,
        reviewedByEmail: reviewerEmail,
        reviewedNote: `ปรับตำแหน่งหลังอนุมัติเป็น ${nextPosition} รหัส ${approvedPositionCode}`,
        approvedPosition: nextPosition,
        approvedPositionCode,
        updatedAt: firestore.serverTimestamp()
      });

      setMessage(approvalMessageEl, "ปรับตำแหน่งเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.application.position_update",
        entityType: "staffApplication",
        entityId: id,
        before: target,
        after: {
          ...target,
          reviewedByUid: reviewerUid,
          reviewedByEmail: reviewerEmail,
          reviewedNote: `ปรับตำแหน่งหลังอนุมัติเป็น ${nextPosition} รหัส ${approvedPositionCode}`,
          approvedPosition: nextPosition,
          approvedPositionCode
        },
        source: "web_app_staff"
      });
      return true;
    } catch (error) {
      console.error("update approved position failed - app.staff-access.js:6849", error);
      const code = (error?.code || "unknown").toString();
      if (error?.message === "position-code-segment-unresolved") {
        setMessage(approvalMessageEl, "ไม่สามารถสร้างรหัสตำแหน่งได้: ตรวจชื่อตำแหน่งให้ตรงหมวดที่กำหนด", "#b91c1c");
      } else if (code === "permission-denied") {
        setMessage(approvalMessageEl, "ไม่มีสิทธิ์ปรับตำแหน่ง (permission-denied)", "#b91c1c");
      } else {
        setMessage(approvalMessageEl, "ปรับตำแหน่งไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
      }
      return false;
    }
  };

  const setApplicationAvailabilityByAuth = () => {
    const user = readCurrentUser();
    if (!user?.email) {
      setAppFormEnabled(false);
      setMessage(appMessageEl, "กรุณาเข้าสู่ระบบก่อนส่งคำขอสมัครสตาฟ", "#b45309");
      return;
    }
    setAppFormEnabled(true);
    if (!currentMyApplications.length && !appFormStatusLocked) {
      setMessage(appMessageEl, "กรอกข้อมูลแล้วกดส่งคำขอได้ทันที", "#6b7280");
    }
  };

  const setApprovalAvailabilityByRole = () => {
    const allowManage = isSuperStaff();
    renderPositionCatalog();
    setPositionManageEnabled(allowManage);
    if (positionManageFormEl) {
      positionManageFormEl.style.opacity = allowManage ? "1" : "0.7";
    }
    if (!allowManage) {
      setMessage(positionManageMessageEl, "");
      if (getCurrentAuthEmail() && currentAccessProfileEmail !== getCurrentAuthEmail()) {
        void refreshAccessProfileForCurrentUser();
      }
    }
  };

  const hasPendingApplication = () => {
    return currentMyApplications
      .filter(isStaffApplicationRecord)
      .some((item) => (item.status || "pending") === "pending");
  };

  const prefillApplicationForm = () => {
    renderApplicationPositionSelect();
  };

  const submitStaffApplication = async () => {
    window.__sgcuStaffApplicationFlowActive = true;
    if (!resolveStore()) {
      setMessage(appMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง", "#b91c1c");
      return;
    }

    const user = readCurrentUser();
    if (!user?.uid || !user?.email) {
      setMessage(appMessageEl, "กรุณาเข้าสู่ระบบก่อนส่งคำขอสมัครสตาฟ", "#b91c1c");
      return;
    }

    const currentUserEmail = (user.email || "").toString().trim().toLowerCase();
    const currentAccountEmail = normalizeAccountEmail(currentUserEmail);
    const localProfile = currentAccountEmail ? (readLoginProfiles()[currentAccountEmail] || {}) : {};
    const profileType = ((localProfile.profileType || window.currentUserProfileType || "student").toString().trim().toLowerCase() === "affairs")
      ? "affairs"
      : "student";

    if (profileType === "student") {
      if (!appDivisionEl?.reportValidity()) return;
      renderApplicationPositionSelect();
      if (!appLevelEl?.reportValidity()) return;
    }

    const requestedPosition = normalizePositionText(appPositionEl?.value || "");
    if (!requestedPosition) {
      setMessage(appMessageEl, profileType === "affairs" ? "ไม่พบตำแหน่งสำหรับเจ้าหน้าที่สำนักบริหารกิจการนิสิต" : "กรุณาเลือกหมวดงานและระดับตำแหน่งให้ครบ", "#b91c1c");
      return;
    }
    if (hasPendingApplication()) {
      setMessage(appMessageEl, "คุณมีคำขอที่รออนุมัติอยู่แล้ว กรุณารอผลก่อนยื่นคำขอใหม่", "#b45309");
      return;
    }

    const applicantEmail = currentUserEmail;
    const profile = localProfile;
    const displayName = (user.displayName || "").toString().trim();
    const fallbackName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    const applicantName = fallbackName || displayName || applicantEmail;
    const applicantNick = (profile.nickname || "").toString().trim();
    const requestedDivisionCodeYY = profileType === "affairs" ? "09" : normalizeCode2(appDivisionEl?.value || "");
    const requestedLevelCodeZZ = profileType === "affairs" ? "04" : normalizeCode2(appLevelEl?.value || "");

    const payload = {
      requestType: "staff_application",
      applicantUid: (user.uid || "").toString(),
      applicantEmail,
      accountEmail: currentAccountEmail,
      authEmail: applicantEmail,
      applicantName,
      applicantNick,
      applicantDisplayName: (user.displayName || "").toString().trim(),
      applicantProfileType: profileType,
      requestedDivisionCodeYY,
      requestedLevelCodeZZ,
      requestedPosition,
      status: "pending",
      createdAt: firestore.serverTimestamp(),
      updatedAt: firestore.serverTimestamp()
    };

    setAppFormEnabled(false);
    appFormStatusLocked = true;
    setMessage(appMessageEl, "กำลังส่งคำขอสมัครสตาฟ...", "#1d4ed8");

    try {
      const docRef = await firestore.addDoc(
        firestore.collection(firestore.db, COLLECTION_APPLICATIONS),
        payload
      );
      try {
        await ensurePositionExists(requestedPosition, user);
      } catch (catalogError) {
        console.warn("sync staff position catalog after application failed - app.staff-access.js:6975", catalogError);
      }
      setMessage(appMessageEl, "ส่งคำขอสมัครสตาฟเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.application.create",
        entityType: "staffApplication",
        entityId: docRef?.id || "",
        after: payload,
        source: "web_app"
      });
      window.setTimeout(() => {
        appFormStatusLocked = false;
        setApplicationAvailabilityByAuth();
      }, 1800);
    } catch (error) {
      console.error("submit staff application failed - app.staff-access.js:6990", error);
      const debugInfo = `email=${applicantEmail || "-"} project=${firestore?.db?.app?.options?.projectId || "-"}`;
      const msg = buildActionErrorText("ส่งคำขอไม่สำเร็จ", error, debugInfo);
      setMessage(appMessageEl, msg, "#b91c1c");
    } finally {
      setApplicationAvailabilityByAuth();
    }
  };

  const addPosition = async () => {
    if (!resolveStore()) {
      setMessage(positionManageMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }
    if (!isSuperStaff()) {
      return;
    }

    const user = readCurrentUser();
    const divisionCodeYY = normalizeCode2(positionDivisionCodeEl?.value || "");
    const existingDivision = currentPositionCatalog.find((item) => normalizeCode2(item.divisionCodeYY || "") === divisionCodeYY);
    const divisionLabel = normalizePositionText(
      positionDivisionNameEl?.value ||
      existingDivision?.divisionLabel ||
      existingDivision?.divisionName ||
      ""
    );
    const levelCodeZZ = normalizeCode2(positionLevelCodeEl?.value || "");
    if (!isValidDivisionCodeYY(divisionCodeYY) || !isValidLevelCodeZZ(levelCodeZZ)) {
      setMessage(positionManageMessageEl, "กรุณาเลือกหมวดงานและระดับตำแหน่ง", "#b91c1c");
      return;
    }
    if (!divisionLabel) {
      setMessage(positionManageMessageEl, "กรุณากรอกชื่อหมวดงาน", "#b91c1c");
      return;
    }
    const safeName = buildPositionNameFromParts(divisionCodeYY, levelCodeZZ, divisionLabel);
    if (!safeName) {
      setMessage(positionManageMessageEl, "ระบบสร้างชื่อตำแหน่งไม่ได้ กรุณาตรวจสอบหมวดงานและระดับตำแหน่ง", "#b91c1c");
      return;
    }

    const duplicated = currentPositionCatalog.some(
      (item) => normalizePositionText(item.name).toLowerCase() === safeName.toLowerCase()
    );
    if (duplicated) {
      setMessage(positionManageMessageEl, "ตำแหน่งนี้มีอยู่แล้ว", "#b45309");
      return;
    }

    try {
      const id = slugifyPosition(safeName);
      const allowedPages = normalizeAllowedPages(readSelectedPositionAllowedPages(), divisionCodeYY);
      await firestore.setDoc(
        firestore.doc(firestore.db, COLLECTION_POSITIONS, id),
        {
          name: safeName,
          divisionCodeYY,
          divisionLabel,
          levelCodeZZ,
          allowedPages,
          createdAt: firestore.serverTimestamp(),
          createdByEmail: (user?.email || "").toString().trim().toLowerCase(),
          updatedAt: firestore.serverTimestamp()
        },
        { merge: true }
      );
      resetPositionManageForm();
      setMessage(positionManageMessageEl, "ปรับตำแหน่งเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.position.create",
        entityType: "staffPosition",
        entityId: id,
        after: { id, name: safeName, divisionCodeYY, divisionLabel, levelCodeZZ, allowedPages },
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("add position failed - app.staff-access.js:7067", error);
      setMessage(positionManageMessageEl, "ปรับตำแหน่งไม่สำเร็จ", "#b91c1c");
    }
  };

  const removePosition = async (positionId) => {
    if (!resolveStore()) {
      setMessage(positionManageMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return;
    }
    if (!isSuperStaff()) {
      return;
    }

    const safeId = (positionId || "").toString().trim();
    if (!safeId) return;
    const target = currentPositionCatalog.find((item) => item.id === safeId);
    if (!target) return;

    const ok = await SGCU_DIALOG.confirmDeletion({ title: "ยืนยันลบตำแหน่ง", message: `ยืนยันลบตำแหน่ง "${target.name}" ?`, confirmLabel: "ลบตำแหน่ง" });
    if (!ok) return;

    try {
      await firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_POSITIONS, safeId));
      if (currentEditingPositionId === safeId) {
        resetPositionManageForm();
      }
      setMessage(positionManageMessageEl, "ลบตำแหน่งเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.position.delete",
        entityType: "staffPosition",
        entityId: safeId,
        before: target,
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("remove position failed - app.staff-access.js:7103", error);
      setMessage(positionManageMessageEl, "ลบตำแหน่งไม่สำเร็จ", "#b91c1c");
    }
  };

  const updatePosition = async (positionId, nextData = {}) => {
    if (!resolveStore()) {
      setMessage(positionManageMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      return false;
    }

    const safeId = (positionId || "").toString().trim();
    const target = currentPositionCatalog.find((item) => item.id === safeId);
    if (!safeId || !target) {
      setMessage(positionManageMessageEl, "ไม่พบตำแหน่งที่ต้องการแก้ไข", "#b91c1c");
      return false;
    }

    const divisionCodeYY = normalizeCode2(nextData.divisionCodeYY || "");
    const existingDivision = currentPositionCatalog.find((item) => normalizeCode2(item.divisionCodeYY || "") === divisionCodeYY);
    const divisionLabel = normalizePositionText(
      nextData.divisionLabel ||
      existingDivision?.divisionLabel ||
      existingDivision?.divisionName ||
      ""
    );
    const levelCodeZZ = normalizeCode2(nextData.levelCodeZZ || "");
    const allowedPages = normalizeAllowedPages(nextData.allowedPages, divisionCodeYY);

    if (!isValidDivisionCodeYY(divisionCodeYY) || !isValidLevelCodeZZ(levelCodeZZ)) {
      setMessage(positionManageMessageEl, "กรุณาเลือกหมวดงานและระดับตำแหน่ง", "#b91c1c");
      return false;
    }
    if (!divisionLabel) {
      setMessage(positionManageMessageEl, "กรุณากรอกชื่อหมวดงาน", "#b91c1c");
      return false;
    }
    const safeName = buildPositionNameFromParts(divisionCodeYY, levelCodeZZ, divisionLabel);
    if (!safeName) {
      setMessage(positionManageMessageEl, "ระบบสร้างชื่อตำแหน่งไม่ได้ กรุณาตรวจสอบหมวดงานและระดับตำแหน่ง", "#b91c1c");
      return false;
    }

    const duplicated = currentPositionCatalog.some((item) => (
      item.id !== safeId &&
      normalizePositionText(item.name).toLowerCase() === safeName.toLowerCase()
    ));
    if (duplicated) {
      setMessage(positionManageMessageEl, "ชื่อตำแหน่งนี้มีอยู่แล้ว", "#b45309");
      return false;
    }

    try {
      await firestore.setDoc(
        firestore.doc(firestore.db, COLLECTION_POSITIONS, safeId),
        {
          name: safeName,
          divisionCodeYY,
          divisionLabel,
          levelCodeZZ,
          allowedPages,
          updatedAt: firestore.serverTimestamp(),
          updatedByEmail: (readCurrentUser()?.email || "").toString().trim().toLowerCase()
        },
        { merge: true }
      );
      currentEditingPositionId = "";
      resetPositionManageForm();
      setMessage(positionManageMessageEl, "อัปเดตตำแหน่งเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.position.update",
        entityType: "staffPosition",
        entityId: safeId,
        before: target,
        after: { id: safeId, name: safeName, divisionCodeYY, divisionLabel, levelCodeZZ, allowedPages },
        source: "web_app_staff"
      });
      return true;
    } catch (error) {
      console.error("update position failed - app.staff-access.js:7185", error);
      setMessage(positionManageMessageEl, "อัปเดตตำแหน่งไม่สำเร็จ", "#b91c1c");
      return false;
    }
  };

