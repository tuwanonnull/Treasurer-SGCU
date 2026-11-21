  const updateOrgRepresentativeStatus = async (applicationId, action) => {
    if (!resolveStore()) {
      setMessage(orgRepresentativeMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(orgRepresentativeMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }

    const id = (applicationId || "").toString();
    if (!id) return false;

    const rowEl = [
      ...(orgRepresentativePendingBodyEl ? Array.from(orgRepresentativePendingBodyEl.querySelectorAll("tr")) : []),
      ...(orgRepresentativeHistoryBodyEl ? Array.from(orgRepresentativeHistoryBodyEl.querySelectorAll("tr")) : []),
      ...(approvalDetailBodyEl ? Array.from(approvalDetailBodyEl.querySelectorAll("tr, .representative-profile-header")) : [])
    ].find((tr) => tr.getAttribute("data-org-representative-id") === id) || null;
    const target = currentOrgRepresentativeApplications.find((item) => (item.id || "").toString() === id);
    if (!target) return false;

    const currentUser = readCurrentUser();
    const reviewerUid = (currentUser?.uid || "").toString();
    const reviewerEmail = (currentUser?.email || "").toString().trim().toLowerCase();
    const currentStatus = normalizeApplicationStatus(target.status);
    const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
    let reviewedNote = nextStatus === "approved" ? "อนุมัติเป็นตัวแทนองค์กร" : "";

    if (currentStatus === "approved" && nextStatus === "pending") {
      const applicant = getOrgRepresentativeApplicant(target);
      const ok = window.confirm(`ยืนยันยกเลิกอนุมัติตัวแทนองค์กรของ "${applicant.displayName || applicant.email || "-"}" ?`);
      if (!ok) return false;
      reviewedNote = "ยกเลิกอนุมัติโดยหัวหน้าสตาฟ";
    } else if (nextStatus === "rejected") {
      const reason = await askStaffRejectionReason();
      if (reason === null) {
        setMessage(orgRepresentativeMessageEl, "ยกเลิกการไม่อนุมัติ", "#6b7280");
        return false;
      }
      reviewedNote = reason ? `ไม่อนุมัติ: ${reason}` : "ไม่อนุมัติคำขอ";
    }

    const rowControls = rowEl ? rowEl.querySelectorAll("button, select, input") : [];
    rowControls.forEach((control) => {
      control.disabled = true;
    });

    try {
      await firestore.updateDoc(
        firestore.doc(firestore.db, COLLECTION_ORG_REPRESENTATIVES, id),
        {
          status: nextStatus,
          reviewedByUid: reviewerUid,
          reviewedByEmail: reviewerEmail,
          reviewedNote,
          reviewedAt: nextStatus === "approved" ? firestore.serverTimestamp() : (target.reviewedAt || null),
          revokedAt: nextStatus === "pending" ? firestore.serverTimestamp() : (target.revokedAt || null),
          updatedAt: firestore.serverTimestamp()
        }
      );
      const successText = nextStatus === "approved"
        ? "อนุมัติคำขอตัวแทนองค์กรเรียบร้อยแล้ว"
        : nextStatus === "pending"
          ? "ยกเลิกอนุมัติและคืนเป็นรออนุมัติเรียบร้อยแล้ว"
          : "ไม่อนุมัติคำขอตัวแทนองค์กรเรียบร้อยแล้ว";
      setMessage(
        orgRepresentativeMessageEl,
        successText,
        "#047857"
      );
      const targetOrg = getResolvedOrgRepresentativeOrganization(target);
      const applicant = getOrgRepresentativeApplicant(target);
      void window.sgcuAuditLog?.write?.({
        action: "staff.org_representative.status_update",
        entityType: "orgRepresentativeApplication",
        entityId: id,
        before: target,
        after: {
          ...target,
          status: nextStatus,
          reviewedByUid: reviewerUid,
          reviewedByEmail: reviewerEmail,
          reviewedNote,
          applicantEmail: applicant.email || target.applicantEmail || "",
          organizationName: targetOrg.organizationName || ""
        },
        metadata: { action, previousStatus: currentStatus },
        source: "web_app_staff"
      });
      return true;
    } catch (error) {
      console.error("update organization representative status failed - app.staff-access.js:7282", error);
      const code = (error?.code || "unknown").toString();
      if (code === "permission-denied") {
        setMessage(orgRepresentativeMessageEl, "ไม่มีสิทธิ์อัปเดตคำขอตัวแทนองค์กร (permission-denied)", "#b91c1c");
      } else if (code === "unauthenticated") {
        setMessage(orgRepresentativeMessageEl, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "#b91c1c");
      } else {
        setMessage(orgRepresentativeMessageEl, "อัปเดตคำขอตัวแทนองค์กรไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
      }
      rowControls.forEach((control) => {
        control.disabled = false;
      });
      return false;
    }
  };

  const deleteOrgRepresentativeApplication = async (applicationId) => {
    if (!resolveStore()) {
      setMessage(orgRepresentativeMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(orgRepresentativeMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }

    const id = (applicationId || "").toString();
    if (!id) return false;

    const target = currentOrgRepresentativeApplications.find((item) => (item.id || "").toString() === id);
    if (!target) return false;

    const ok = await askOrgRepresentativeDeleteConfirm(target);
    if (!ok) {
      setMessage(orgRepresentativeMessageEl, "ยกเลิกการลบรายชื่อ", "#6b7280");
      return false;
    }

    const rowEls = [
      ...(orgRepresentativePendingBodyEl ? Array.from(orgRepresentativePendingBodyEl.querySelectorAll("tr")) : []),
      ...(orgRepresentativeHistoryBodyEl ? Array.from(orgRepresentativeHistoryBodyEl.querySelectorAll("tr")) : []),
      ...(approvalDetailBodyEl ? Array.from(approvalDetailBodyEl.querySelectorAll("tr, .representative-profile-header")) : [])
    ].filter((tr) => tr.getAttribute("data-org-representative-id") === id);
    const rowControls = rowEls.flatMap((rowEl) => Array.from(rowEl.querySelectorAll("button, select, input")));
    rowControls.forEach((control) => {
      control.disabled = true;
    });

    try {
      await firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_ORG_REPRESENTATIVES, id));
      const targetOrg = getResolvedOrgRepresentativeOrganization(target);
      const orgKey = getOrgRepresentativeOrgKey(targetOrg.organizationType || "", targetOrg.organizationName || "");
      const shouldRefreshOrgModal = !!approvalDetailBodyEl?.querySelector(".org-representative-org-detail");
      currentOrgRepresentativeApplications = currentOrgRepresentativeApplications
        .filter((item) => (item.id || "").toString() !== id);
      renderOrgRepresentativeApplications();
      if (shouldRefreshOrgModal && orgKey) {
        openOrgRepresentativeOrganizationModal(orgKey);
      }
      setMessage(orgRepresentativeMessageEl, "ลบรายชื่อตัวแทนองค์กรเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.org_representative.delete",
        entityType: "orgRepresentativeApplication",
        entityId: id,
        before: target,
        metadata: { organizationKey: orgKey },
        source: "web_app_staff"
      });
      return true;
    } catch (error) {
      console.error("delete organization representative application failed - app.staff-access.js:7352", error);
      const code = (error?.code || "unknown").toString();
      if (code === "permission-denied") {
        setMessage(orgRepresentativeMessageEl, "ไม่มีสิทธิ์ลบรายชื่อตัวแทนองค์กร (permission-denied)", "#b91c1c");
      } else if (code === "unauthenticated") {
        setMessage(orgRepresentativeMessageEl, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "#b91c1c");
      } else {
        setMessage(orgRepresentativeMessageEl, "ลบรายชื่อตัวแทนองค์กรไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
      }
      rowControls.forEach((control) => {
        control.disabled = false;
      });
      return false;
    }
  };

  const updateApplicationStatus = async (applicationId, action) => {
    if (!resolveStore()) {
      setMessage(approvalMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(approvalMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }

    const id = (applicationId || "").toString();
    if (!id) return false;

    const rowEl = approvalBodyEl
      ? Array.from(approvalBodyEl.querySelectorAll("tr")).find((tr) => tr.getAttribute("data-application-id") === id)
      : null;
    if (!rowEl) return false;

    const positionInput = rowEl.querySelector(".staff-approval-position-input");
    const approvedPosition = normalizePositionText(positionInput?.value || "");

    const currentUser = readCurrentUser();
    const reviewerUid = (currentUser?.uid || "").toString();
    const reviewerEmail = (currentUser?.email || "").toString().trim().toLowerCase();

    if (action === "approve" && !approvedPosition) {
      setMessage(approvalMessageEl, "กรุณาระบุตำแหน่งก่อนอนุมัติ", "#b91c1c");
      return false;
    }

    let reviewedNote = "";
    let approvedPositionCode = "";
    if (action === "reject") {
      const reason = await askStaffRejectionReason();
      if (reason === null) {
        setMessage(approvalMessageEl, "ยกเลิกการไม่อนุมัติ", "#6b7280");
        return false;
      }
      reviewedNote = reason ? `ไม่อนุมัติ: ${reason}` : "ไม่อนุมัติคำขอ";
    } else {
      reviewedNote = `อนุมัติเป็น ${approvedPosition}`;
    }

    const rowControls = rowEl.querySelectorAll("button, select, input");
    rowControls.forEach((control) => {
      control.disabled = true;
    });

    try {
      if (action === "approve") {
        const applicantEmail = (rowEl.getAttribute("data-applicant-email") || "").toString().trim().toLowerCase();
        const applicantName = (rowEl.getAttribute("data-applicant-name") || "").toString().trim();
        const applicantNick = (rowEl.getAttribute("data-applicant-nick") || "").toString().trim();
        const approvedPositionCodeMeta = await buildApprovedPositionCode(approvedPosition);
        approvedPositionCode = approvedPositionCodeMeta.code;
        const positionMeta = findPositionAccessMeta(
          approvedPosition,
          approvedPositionCodeMeta.yy,
          approvedPositionCodeMeta.zz
        );
        const nextPositionEntry = {
          name: approvedPosition,
          code: approvedPositionCode,
          yy: approvedPositionCodeMeta.yy,
          zz: approvedPositionCodeMeta.zz,
          allowedPages: normalizeAllowedPages(
            readAllowedPagesInput(positionMeta || {}),
            approvedPositionCodeMeta.yy
          ),
          sourceApplicationId: id,
          approvedAt: new Date().toISOString()
        };

        if (applicantEmail) {
          const profileRef = firestore.doc(firestore.db, COLLECTION_PROFILES, applicantEmail);
          const profileSnap = firestore.getDoc ? await firestore.getDoc(profileRef) : null;
          const profileData = profileSnap?.exists?.() ? (profileSnap.data() || {}) : {};
          const existingPositions = normalizePositionsArray(profileData.positions || []);
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

          await ensurePositionExists(approvedPosition, currentUser, {
            divisionCodeYY: approvedPositionCodeMeta.yy,
            levelCodeZZ: approvedPositionCodeMeta.zz,
            allowedPages: nextPositionEntry.allowedPages
          });
        }

        reviewedNote = `อนุมัติเป็น ${approvedPosition} รหัส ${approvedPositionCode}`;
      } else {
        const applicantEmail = (rowEl.getAttribute("data-applicant-email") || "").toString().trim().toLowerCase();
        if (applicantEmail && firestore.getDoc) {
          const profileRef = firestore.doc(firestore.db, COLLECTION_PROFILES, applicantEmail);
          const profileSnap = await firestore.getDoc(profileRef);
          const profileData = profileSnap?.exists?.() ? (profileSnap.data() || {}) : null;
          const existingPositions = extractExistingPositionsFromProfile(profileData || {});
          const matchedPosition = existingPositions.some(
            (entry) => (entry.sourceApplicationId || "") === id
          );
          const sourceApplicationId = (profileData?.sourceApplicationId || "").toString().trim();

          if (matchedPosition || (sourceApplicationId && sourceApplicationId === id)) {
            const nextPositions = existingPositions.filter(
              (entry) => (entry.sourceApplicationId || "") !== id
            );
            const nextProfile = buildProfileFieldsFromPositions(nextPositions);
            await firestore.setDoc(
              profileRef,
              {
                ...nextProfile,
                positionCodeXX: nextPositions.length ? (profileData?.positionCodeXX || "") : "",
                positionCodeYY: nextProfile.positionCodeYY || "",
                positionCodeZZ: nextPositions.length ? (profileData?.positionCodeZZ || "") : "",
                positionCodeAAA: nextPositions.length ? (profileData?.positionCodeAAA || "") : "",
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
                nick: (profileData?.nick || "").toString()
              });
            }
          }
        }
      }

      const appRef = firestore.doc(firestore.db, COLLECTION_APPLICATIONS, id);
      await firestore.updateDoc(appRef, {
        status: action === "approve" ? "approved" : "rejected",
        reviewedByUid: reviewerUid,
        reviewedByEmail: reviewerEmail,
        reviewedNote,
        approvedPosition: action === "approve" ? approvedPosition : "",
        approvedPositionCode: action === "approve" ? approvedPositionCode : "",
        updatedAt: firestore.serverTimestamp()
      });

      setMessage(
        approvalMessageEl,
        action === "approve" ? "อนุมัติคำขอเรียบร้อยแล้ว" : "ไม่อนุมัติคำขอเรียบร้อยแล้ว",
        "#047857"
      );
      void window.sgcuAuditLog?.write?.({
        action: "staff.application.status_update",
        entityType: "staffApplication",
        entityId: id,
        before: [
          ...currentPendingApplications,
          ...currentApprovedHistory
        ].find((item) => (item.id || "").toString() === id) || null,
        after: {
          status: action === "approve" ? "approved" : "rejected",
          reviewedByUid: reviewerUid,
          reviewedByEmail: reviewerEmail,
          reviewedNote,
          approvedPosition: action === "approve" ? approvedPosition : "",
          approvedPositionCode: action === "approve" ? approvedPositionCode : ""
        },
        metadata: { action },
        source: "web_app_staff"
      });
      return true;
    } catch (error) {
      console.error("update staff application status failed - app.staff-access.js:7569", error);
      const code = (error?.code || "unknown").toString();
      if (error?.message === "position-code-segment-unresolved") {
        setMessage(approvalMessageEl, "ไม่สามารถสร้างรหัสตำแหน่งได้: ตรวจชื่อตำแหน่งให้ตรงหมวดที่กำหนด", "#b91c1c");
      } else if (code === "permission-denied") {
        setMessage(approvalMessageEl, "ไม่มีสิทธิ์อัปเดตคำขอ (permission-denied)", "#b91c1c");
      } else if (code === "unauthenticated") {
        setMessage(approvalMessageEl, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "#b91c1c");
      } else {
        setMessage(approvalMessageEl, "อัปเดตคำขอไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
      }
      rowControls.forEach((control) => {
        control.disabled = false;
      });
      return false;
    }
  };

  const deleteStaffApplication = async (applicationId) => {
    if (!resolveStore()) {
      setMessage(approvalMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(approvalMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }

    const id = (applicationId || "").toString();
    if (!id) return false;
    const target = [
      ...currentPendingApplications,
      ...currentApprovedHistory
    ].find((item) => (item.id || "").toString() === id);
    const applicantEmail = (target?.applicantEmail || "").toString().trim().toLowerCase();
    const applicantName = (target?.applicantName || applicantEmail || "-").toString();
    const ok = await SGCU_DIALOG.confirmDeletion({ title: "ยืนยันลบคำขอสมาชิกสตาฟ", message: `ยืนยันลบคำขอสมาชิกสตาฟของ "${applicantName}" ?`, confirmLabel: "ลบคำขอ" });
    if (!ok) {
      setMessage(approvalMessageEl, "ยกเลิกการลบคำขอ", "#6b7280");
      return false;
    }

    const rowEl = approvalBodyEl
      ? Array.from(approvalBodyEl.querySelectorAll("tr")).find((tr) => tr.getAttribute("data-application-id") === id)
      : null;
    const rowControls = rowEl ? rowEl.querySelectorAll("button, select, input") : [];
    rowControls.forEach((control) => {
      control.disabled = true;
    });

    try {
      if (applicantEmail && firestore.getDoc) {
        const profileRef = firestore.doc(firestore.db, COLLECTION_PROFILES, applicantEmail);
        const profileSnap = await firestore.getDoc(profileRef);
        const profileData = profileSnap?.exists?.() ? (profileSnap.data() || {}) : null;
        if (profileData) {
          const existingPositions = extractExistingPositionsFromProfile(profileData);
          const matchedPosition = existingPositions.some(
            (entry) => (entry.sourceApplicationId || "") === id
          );
          const sourceApplicationId = (profileData.sourceApplicationId || "").toString().trim();
          if (matchedPosition || sourceApplicationId === id) {
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
                deletedApplicationId: id,
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
        }
      }

      await firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_APPLICATIONS, id));
      setMessage(approvalMessageEl, "ลบคำขอสมาชิกสตาฟเรียบร้อยแล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.application.delete",
        entityType: "staffApplication",
        entityId: id,
        before: target || { applicantEmail, applicantName },
        source: "web_app_staff"
      });
      return true;
    } catch (error) {
      console.error("delete staff application failed - app.staff-access.js:7673", error);
      const code = (error?.code || "unknown").toString();
      if (code === "permission-denied") {
        setMessage(approvalMessageEl, "ไม่มีสิทธิ์ลบคำขอ (permission-denied)", "#b91c1c");
      } else if (code === "unauthenticated") {
        setMessage(approvalMessageEl, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "#b91c1c");
      } else {
        setMessage(approvalMessageEl, "ลบคำขอไม่สำเร็จ กรุณาลองใหม่", "#b91c1c");
      }
      rowControls.forEach((control) => {
        control.disabled = false;
      });
      return false;
    }
  };

  const deleteSelectedPendingApplications = async () => {
    if (!resolveStore()) {
      setMessage(approvalMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(approvalMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }
    const targets = currentPendingApplications.filter((item) =>
      selectedPendingApplicationIds.has((item.id || "").toString())
    );
    if (!targets.length) {
      clearPendingBulkSelection();
      return false;
    }
    const confirmed = await askPendingBulkDeleteConfirm(targets.length);
    if (!confirmed) return false;

    if (staffApprovalBulkDeleteBtnEl) staffApprovalBulkDeleteBtnEl.disabled = true;
    try {
      for (let index = 0; index < targets.length; index += 400) {
        const chunk = targets.slice(index, index + 400);
        if (firestore.writeBatch) {
          const batch = firestore.writeBatch(firestore.db);
          chunk.forEach((item) => {
            batch.delete(firestore.doc(firestore.db, COLLECTION_APPLICATIONS, (item.id || "").toString()));
          });
          await batch.commit();
        } else {
          await Promise.all(chunk.map((item) =>
            firestore.deleteDoc(firestore.doc(firestore.db, COLLECTION_APPLICATIONS, (item.id || "").toString()))
          ));
        }
      }
      targets.forEach((item) => {
        void window.sgcuAuditLog?.write?.({
          action: "staff.application.delete",
          entityType: "staffApplication",
          entityId: (item.id || "").toString(),
          before: item,
          metadata: { bulkDelete: true, bulkCount: targets.length },
          source: "web_app_staff"
        });
      });
      const deletedIds = new Set(targets.map((item) => (item.id || "").toString()));
      currentPendingApplications = currentPendingApplications.filter((item) => !deletedIds.has((item.id || "").toString()));
      clearPendingBulkSelection();
      renderApprovalRows();
      setMessage(approvalMessageEl, `ลบคำขอ ${targets.length} รายการเรียบร้อยแล้ว`, "#047857");
      return true;
    } catch (error) {
      console.error("bulk delete pending staff applications failed - app.staff-access.js:7741", error);
      const code = (error?.code || "unknown").toString();
      const message = code === "permission-denied"
        ? "ไม่มีสิทธิ์ลบคำขอที่เลือก (permission-denied)"
        : code === "unauthenticated"
          ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
          : "ลบคำขอที่เลือกไม่สำเร็จ กรุณาลองใหม่";
      setMessage(approvalMessageEl, message, "#b91c1c");
      return false;
    } finally {
      if (staffApprovalBulkDeleteBtnEl) staffApprovalBulkDeleteBtnEl.disabled = false;
    }
  };

  const revokeSelectedCurrentStaff = async () => {
    if (!resolveStore()) {
      setMessage(approvalMessageEl, "ระบบฐานข้อมูลยังไม่พร้อมใช้งาน", "#b91c1c");
      return false;
    }
    if (!isSuperStaff()) {
      setMessage(approvalMessageEl, "หน้านี้สำหรับหัวหน้าสตาฟเท่านั้น", "#b91c1c");
      return false;
    }
    const targets = currentApprovedHistoryGrouped.filter((item) =>
      selectedCurrentStaffKeys.has((item.key || "").toString())
    );
    if (!targets.length) {
      clearCurrentStaffBulkSelection();
      return false;
    }
    const confirmed = await askPendingBulkDeleteConfirm(targets.length, "revoke");
    if (!confirmed) return false;

    if (staffCurrentBulkRevokeBtnEl) staffCurrentBulkRevokeBtnEl.disabled = true;
    try {
      const applicationIds = new Set();
      const profileEmails = new Set();
      targets.forEach((target) => {
        const email = (target.applicantEmail || "").toString().trim().toLowerCase();
        if (email) profileEmails.add(email);
        (Array.isArray(target.approvedItems) ? target.approvedItems : []).forEach((item) => {
          const id = (item?.id || "").toString();
          if (id) applicationIds.add(id);
        });
      });
      const refs = [
        ...Array.from(applicationIds, (id) => firestore.doc(firestore.db, COLLECTION_APPLICATIONS, id)),
        ...Array.from(profileEmails, (email) => firestore.doc(firestore.db, COLLECTION_PROFILES, email))
      ];
      for (let index = 0; index < refs.length; index += 400) {
        const chunk = refs.slice(index, index + 400);
        if (firestore.writeBatch) {
          const batch = firestore.writeBatch(firestore.db);
          chunk.forEach((ref) => batch.delete(ref));
          await batch.commit();
        } else {
          await Promise.all(chunk.map((ref) => firestore.deleteDoc(ref)));
        }
      }
      targets.forEach((target) => {
        (Array.isArray(target.approvedItems) ? target.approvedItems : []).forEach((item) => {
          void window.sgcuAuditLog?.write?.({
            action: "staff.application.delete",
            entityType: "staffApplication",
            entityId: (item?.id || "").toString(),
            before: { ...target, approvedItems: undefined },
            metadata: { bulkRevoke: true, bulkStaffCount: targets.length },
            source: "web_app_staff"
          });
        });
      });
      profileEmails.forEach(clearLocalStaffCache);
      currentApprovedHistory = currentApprovedHistory.filter((item) =>
        !applicationIds.has((item.id || "").toString())
      );
      clearCurrentStaffBulkSelection();
      renderApprovedHistory();
      setMessage(approvalMessageEl, `เพิกถอนสิทธิ์สตาฟ ${targets.length} คนเรียบร้อยแล้ว`, "#047857");
      return true;
    } catch (error) {
      console.error("bulk revoke current staff failed - app.staff-access.js:7821", error);
      const code = (error?.code || "unknown").toString();
      const message = code === "permission-denied"
        ? "ไม่มีสิทธิ์เพิกถอนสตาฟที่เลือก (permission-denied)"
        : code === "unauthenticated"
          ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
          : "เพิกถอนสิทธิ์สตาฟที่เลือกไม่สำเร็จ กรุณาลองใหม่";
      setMessage(approvalMessageEl, message, "#b91c1c");
      return false;
    } finally {
      if (staffCurrentBulkRevokeBtnEl) staffCurrentBulkRevokeBtnEl.disabled = false;
    }
  };

