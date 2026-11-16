  const startPositionCatalogListener = ({ tokenRefreshed = false } = {}) => {
    const generation = ++positionCatalogGeneration;
    if (typeof unsubscribePositionCatalog === "function") unsubscribePositionCatalog();
    unsubscribePositionCatalog = null;
    const authUser = readCurrentUser();
    const isCurrentListener = () => generation === positionCatalogGeneration &&
      Boolean(authUser?.uid) && readCurrentUser()?.uid === authUser.uid;
    if (!resolveStore()) {
      positionCatalogLoadState = "loading";
      currentPositionCatalog = [];
      renderPositionDatalist();
      renderPositionCatalog();
      renderPositionAllowedPageOptions([], "");
      scheduleDeferredBootstrap();
      return;
    }
    if (!authUser?.uid || !authUser?.email) {
      positionCatalogLoadState = "signed-out";
      currentPositionCatalog = [];
      renderPositionDatalist();
      renderPositionCatalog();
      renderPositionAllowedPageOptions([], "");
      return;
    }

    const q = firestore.query(firestore.collection(firestore.db, COLLECTION_POSITIONS));
    positionCatalogLoadState = "loading";
    currentPositionCatalog = [];
    renderPositionCatalog();
    unsubscribePositionCatalog = firestore.onSnapshot(
      q,
      (snapshot) => {
        if (!isCurrentListener()) return;
        if (positionCatalogHasListenerError) {
          setMessage(positionManageMessageEl, "");
          positionCatalogHasListenerError = false;
        }
        const fromStore = (snapshot?.docs || [])
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
          .map((item) => {
            const name = normalizePositionText(item.name || "");
            const fallbackYY = resolveDivisionCodeYY(name);
            const fallbackZZ = resolveLevelCodeZZ(name);
            const yy = isValidDivisionCodeYY(item.divisionCodeYY)
              ? normalizeCode2(item.divisionCodeYY)
              : fallbackYY;
            const zz = isValidLevelCodeZZ(item.levelCodeZZ)
              ? normalizeCode2(item.levelCodeZZ)
              : fallbackZZ;
            return {
              id: item.id,
              name,
              divisionCodeYY: yy,
              divisionLabel: normalizePositionText(item.divisionLabel || item.divisionName || divisionCodeLabel(yy)),
              levelCodeZZ: zz,
              allowedPages: normalizeConfiguredAllowedPages(readAllowedPagesInput(item))
            };
          })
          .filter((item) => item.name);

        const uniqueByName = new Map();
        fromStore.forEach((item) => {
          const key = normalizePositionText(item.name).toLowerCase();
          if (!key) return;
          if (!uniqueByName.has(key)) uniqueByName.set(key, item);
        });

        currentPositionCatalog = sortPositionCatalogItems(Array.from(uniqueByName.values()));
        positionCatalogLoadState = "loaded";
        renderPositionDatalist();
        renderApplicationPositionSelect();
        renderPositionCatalog();
        if (currentApprovalView === "history") renderApprovedHistory();
        else renderApprovalRows();
        if (positionAllowedPagesEl && !positionAllowedPagesEl.children.length) {
          renderPositionAllowedPageOptions([], "");
        }
        void syncStaffProfilesWithPositionCatalog().catch((error) => {
          console.warn("sync staff profile position access failed - app.staff-access.js:6380", error);
        });
      },
      async (error) => {
        if (!isCurrentListener()) return;
        const errorCode = String(error?.code || "").replace(/^firestore\//, "");
        if (errorCode === "permission-denied" && !tokenRefreshed && typeof authUser.getIdToken === "function") {
          try {
            await authUser.getIdToken(true);
            if (!isCurrentListener()) return;
            startPositionCatalogListener({ tokenRefreshed: true });
            return;
          } catch {
            if (!isCurrentListener()) return;
          }
        }
        positionCatalogHasListenerError = true;
        console.error("staff position catalog listener failed - app.staff-access.js:6384", error);
        positionCatalogLoadState = "error";
        currentPositionCatalog = [];
        renderPositionDatalist();
        renderApplicationPositionSelect();
        renderPositionCatalog();
        renderPositionAllowedPageOptions([], "");
        setMessage(positionManageMessageEl, buildListenerErrorText("โหลดรายการตำแหน่งจาก Firebase ไม่สำเร็จ", error), "#b91c1c");
      }
    );
  };

  const startMyApplicationsListener = () => {
    if (!myTableBodyEl) return;
    if (!resolveStore()) {
      scheduleDeferredBootstrap();
      return;
    }
    const user = readCurrentUser();

    if (typeof unsubscribeMyApplications === "function") {
      unsubscribeMyApplications();
      unsubscribeMyApplications = null;
    }

    const applicantUid = (user?.uid || "").toString().trim();
    const applicantEmail = (user?.email || "").toString().trim().toLowerCase();
    if (!applicantUid && !applicantEmail) {
      currentMyApplications = [];
      renderMyApplications();
      return;
    }

    const q = applicantUid
      ? firestore.query(
        firestore.collection(firestore.db, COLLECTION_APPLICATIONS),
        firestore.where("applicantUid", "==", applicantUid)
      )
      : firestore.query(
        firestore.collection(firestore.db, COLLECTION_APPLICATIONS),
        firestore.where("applicantEmail", "==", applicantEmail)
      );

    unsubscribeMyApplications = firestore.onSnapshot(
      q,
      (snapshot) => {
        currentMyApplications = sortByTimestampDesc(
          (snapshot?.docs || [])
            .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
            .filter(isStaffApplicationRecord),
          "createdAt"
        );
        renderMyApplications();
        scheduleApprovalUiSync();
      },
      (error) => {
        console.error("staff applications listener failed - app.staff-access.js:6440", error);
        const msg = buildListenerErrorText("ไม่สามารถโหลดคำขอสมัครได้ในขณะนี้", error);
        myTableBodyEl.innerHTML = `<tr><td colspan="4">${toSafeText(msg)}</td></tr>`;
        setMessage(appMessageEl, msg, "#b91c1c");
      }
    );
  };

  const startPendingApplicationsListener = () => {
    if (!approvalBodyEl) return;
    if (!resolveStore()) {
      scheduleDeferredBootstrap();
      return;
    }
    if (!getCurrentAuthEmail()) {
      currentPendingApplications = [];
      approvalBodyEl.innerHTML = `<tr><td colspan="5">กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้</td></tr>`;
      setMessage(approvalMessageEl, "", "#6b7280");
      return;
    }

    if (typeof unsubscribePendingApplications === "function") {
      unsubscribePendingApplications();
      unsubscribePendingApplications = null;
    }

    const colRef = firestore.collection(firestore.db, COLLECTION_APPLICATIONS);
    const q = firestore.where
      ? firestore.query(
        colRef,
        firestore.where("status", "==", "pending"),
        ...(firestore.limit ? [firestore.limit(STAFF_APPLICATION_LIST_LIMIT)] : [])
      )
      : firestore.query(
        colRef,
        ...(firestore.limit ? [firestore.limit(STAFF_APPLICATION_LIST_LIMIT)] : [])
      );

    unsubscribePendingApplications = firestore.onSnapshot(
      q,
      (snapshot) => {
        currentPendingApplications = sortByTimestampDesc(
          (snapshot?.docs || [])
            .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
            .filter(isStaffApplicationRecord)
            .filter((item) => normalizeApplicationStatus(item.status) === "pending"),
          "createdAt"
        );
        renderApprovalRows();
        scheduleApprovalUiSync();
      },
      (error) => {
        console.error("staff pending listener failed - app.staff-access.js:6492", error);
        const code = (error?.code || "").toString();
        const msg = code === "unauthenticated"
          ? "กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้"
          : buildListenerErrorText("ไม่สามารถโหลดคำขอรออนุมัติได้ในขณะนี้", error);
        approvalBodyEl.innerHTML = `<tr><td colspan="5">${toSafeText(msg)}</td></tr>`;
        setMessage(approvalMessageEl, msg, "#b91c1c");
      }
    );
  };

  const startApprovedHistoryListener = () => {
    if (!approvalHistoryBodyEl) return;
    if (!resolveStore()) {
      scheduleDeferredBootstrap();
      return;
    }
    if (!getCurrentAuthEmail()) {
      currentApprovedHistory = [];
      approvalHistoryBodyEl.innerHTML = `<tr><td colspan="4">กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้</td></tr>`;
      return;
    }

    if (typeof unsubscribeApprovalHistory === "function") {
      unsubscribeApprovalHistory();
      unsubscribeApprovalHistory = null;
    }

    const colRef = firestore.collection(firestore.db, COLLECTION_APPLICATIONS);
    const q = firestore.where
      ? firestore.query(
        colRef,
        firestore.where("status", "==", "approved"),
        ...(firestore.limit ? [firestore.limit(STAFF_APPLICATION_LIST_LIMIT)] : [])
      )
      : firestore.query(
        colRef,
        ...(firestore.limit ? [firestore.limit(STAFF_APPLICATION_LIST_LIMIT)] : [])
      );

    unsubscribeApprovalHistory = firestore.onSnapshot(
      q,
      (snapshot) => {
        currentApprovedHistory = sortByTimestampDesc(
          (snapshot?.docs || [])
            .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
            .filter(isStaffApplicationRecord)
            .filter((item) => normalizeApplicationStatus(item.status) === "approved"),
          "updatedAt"
        );
        renderApprovedHistory();
        scheduleApprovalUiSync();
      },
      (error) => {
        console.error("staff approved history listener failed - app.staff-access.js:6546", error);
        const code = (error?.code || "").toString();
        const msg = code === "unauthenticated"
          ? "กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้"
          : buildListenerErrorText("ไม่สามารถโหลดรายชื่อผู้ปฏิบัติงานตอนนี้ได้ในขณะนี้", error);
        approvalHistoryBodyEl.innerHTML = `<tr><td colspan="4">${toSafeText(msg)}</td></tr>`;
      }
    );
  };

  const startOrgRepresentativeApplicationsListener = () => {
    if (!orgRepresentativeApprovalSectionEl) return;
    if (!resolveStore()) {
      scheduleDeferredBootstrap();
      return;
    }
    if (!getCurrentAuthEmail()) {
      if (orgRepresentativePendingBodyEl) {
        orgRepresentativePendingBodyEl.innerHTML = '<tr><td colspan="5">กำลังตรวจสอบสิทธิ์การเข้าถึงข้อมูล...</td></tr>';
      }
      setMessage(orgRepresentativeMessageEl, "", "#6b7280");
      return;
    }

    if (!orgRepresentativeOrgFiltersLoadedForPage) {
      ensureOrgRepresentativeOrgFiltersLoaded()
        .then(() => {
          renderOrganizationCatalogTable();
          renderOrgRepresentativeOverview();
        });
    }

    if (typeof unsubscribeOrgRepresentativeApplications === "function") {
      unsubscribeOrgRepresentativeApplications();
      unsubscribeOrgRepresentativeApplications = null;
    }

    const q = firestore.query(
      firestore.collection(firestore.db, COLLECTION_ORG_REPRESENTATIVES),
      ...(firestore.limit ? [firestore.limit(ORG_REPRESENTATIVE_LIST_LIMIT)] : [])
    );

    unsubscribeOrgRepresentativeApplications = firestore.onSnapshot(
      q,
      (snapshot) => {
        currentOrgRepresentativeApplications = sortByTimestampDesc(
          (snapshot?.docs || [])
            .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
            .filter((item) => (item.requestType || "").toString().trim() === "organization_representative"),
          "updatedAt"
        );
        const renderLoadedApplications = () => {
          renderOrgRepresentativeApplications();
          window.setTimeout(() => {
            renderOrgRepresentativeOverview();
          }, 0);
        };
        if (!orgRepresentativeOrgFiltersLoadedForPage) {
          ensureOrgRepresentativeOrgFiltersLoaded().then(() => {
            renderLoadedApplications();
          });
          return;
        }
        renderLoadedApplications();
      },
      (error) => {
        console.error("organization representative listener failed - app.staff-access.js:6612", error);
        if (!getCurrentAuthEmail()) {
          if (orgRepresentativePendingBodyEl) {
            orgRepresentativePendingBodyEl.innerHTML = '<tr><td colspan="5">กำลังตรวจสอบสิทธิ์การเข้าถึงข้อมูล...</td></tr>';
          }
          setMessage(orgRepresentativeMessageEl, "", "#6b7280");
          return;
        }
        const msg = buildListenerErrorText("ไม่สามารถโหลดคำขอตัวแทนองค์กรได้ในขณะนี้", error);
        if (orgRepresentativePendingBodyEl) {
          orgRepresentativePendingBodyEl.innerHTML = `<tr><td colspan="5">${toSafeText(msg)}</td></tr>`;
        }
        setMessage(orgRepresentativeMessageEl, msg, "#b91c1c");
      }
    );
  };

