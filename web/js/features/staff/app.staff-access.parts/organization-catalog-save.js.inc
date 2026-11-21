  const buildOrganizationCatalogPayloadFromForm = () => {
    const id = normalizeOrganizationCatalogText(organizationCatalogFields.id?.value);
    const group = normalizeOrganizationCatalogText(organizationCatalogFields.group?.value);
    const name = normalizeOrganizationCatalogText(organizationCatalogFields.name?.value);
    const formCode = generateOrganizationCatalogCode({
      id,
      group,
      code: normalizeOrganizationCatalogText(organizationCatalogFields.code?.value).toUpperCase()
    });
    const documentRunCode = resolveOrganizationCatalogDocumentRunBaseFromForm({
      group,
      code: formCode
    });
    const code = isOrganizationCatalogManualDocumentRunGroup(group)
      ? buildOrganizationCatalogManualCodeFromRunBase(group, documentRunCode) || formCode
      : formCode;
    const academicYear = getOrganizationCatalogDisplayAcademicYear();
    const existingItem = id ? getRawOrganizationCatalogItemById(id) : null;
    const documentRunCodeByAcademicYear = buildOrganizationCatalogDocumentRunMap({
      documentRunCode: existingItem?.documentRunCode || existingItem?.runCode,
      documentRunCodeByAcademicYear: existingItem?.documentRunCodeByAcademicYear,
      runCodeByAcademicYear: existingItem?.runCodeByAcademicYear
    });
    if (documentRunCode) {
      documentRunCodeByAcademicYear[academicYear] = documentRunCode;
    }
    const codeByAcademicYear = buildOrganizationCatalogCodeMap({
      group,
      code: existingItem?.code || existingItem?.orgCode,
      codeByAcademicYear: existingItem?.codeByAcademicYear,
      orgCodeByAcademicYear: existingItem?.orgCodeByAcademicYear,
      documentRunCodeByAcademicYear
    });
    if (code) {
      codeByAcademicYear[academicYear] = code;
    }
    const accountNo = normalizeOrganizationCatalogText(organizationCatalogFields.accountNo?.value);
    const nameByAcademicYear = buildOrganizationCatalogYearTextMap({
      text: existingItem?.name || existingItem?.organizationName || existingItem?.orgName,
      textByAcademicYear: existingItem?.nameByAcademicYear || existingItem?.organizationNameByAcademicYear || existingItem?.orgNameByAcademicYear
    });
    if (name) {
      nameByAcademicYear[academicYear] = name;
    }
    const sourceBaseId = getOrganizationCatalogBaseId(existingItem);
    const baseOrganizationId = sourceBaseId || slugifyOrganizationCatalogId(`${group}-${isOrganizationCatalogManualDocumentRunGroup(group) ? name : code || name}`);
    const existingItemYear = getOrganizationCatalogItemAcademicYear(existingItem);
    const docId = id && existingItemYear === academicYear
      ? id
      : buildOrganizationCatalogYearDocId(baseOrganizationId, academicYear);
    return {
      id: docId,
      academicYear,
      baseOrganizationId,
      legacyOrganizationId: id && id !== docId ? id : "",
      group,
      name,
      nameByAcademicYear,
      formName: name,
      code,
      codeByAcademicYear,
      documentRunCode,
      documentRunCodeByAcademicYear,
      requiresDocumentRunCode: isOrganizationCatalogManualDocumentRunGroup(group),
      accountNo,
      bankAccount: accountNo,
      status: "active"
    };
  };

  const syncPublicOrganizationCatalogCache = async (rows = getRawOrganizationCatalogRows()) => {
    if (!resolveStore() || !firestore.doc || !firestore.setDoc) return;
    const items = (rows || [])
      .filter((item) => (item.status || "active") === "active")
      .map((item) => ({
        id: item.id,
        academicYear: item.academicYear,
        baseOrganizationId: item.baseOrganizationId || item.baseOrgId || item.rootOrganizationId || "",
        group: item.group || item.type || "",
        name: item.name || item.organizationName || item.orgName || "",
        nameByAcademicYear: item.nameByAcademicYear || item.organizationNameByAcademicYear || item.orgNameByAcademicYear || {},
        code: item.code || item.orgCode || "",
        codeByAcademicYear: item.codeByAcademicYear || item.orgCodeByAcademicYear || {},
        documentRunCode: item.documentRunCode || item.runCode || "",
        documentRunCodeByAcademicYear: item.documentRunCodeByAcademicYear || item.runCodeByAcademicYear || {},
        accountNo: item.accountNo || item.bankAccount || item.bankAccountNo || "",
        sortOrder: Number(item.sortOrder ?? item.order ?? 0),
        status: "active"
      }));

    await firestore.setDoc(
      firestore.doc(firestore.db, COLLECTION_PUBLIC_CACHE, "organizationCatalog"),
      {
        items,
        updatedAt: firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString(),
        updatedBy: (readCurrentUser()?.email || getCurrentAuthEmail() || "").toString().trim().toLowerCase()
      },
      { merge: true }
    );
  };

  const saveOrganizationCatalogForm = async (event) => {
    event?.preventDefault?.();
    syncOrganizationCatalogManualRunFromDomState({ force: true });
    if (!resolveStore() || !firestore.setDoc || !firestore.doc) {
      setMessage(organizationCatalogFormMessageEl, "ระบบยังไม่พร้อมบันทึก Firebase", "#b91c1c");
      return;
    }
    const payload = buildOrganizationCatalogPayloadFromForm();
    if (!payload.group || !payload.formName) {
      setMessage(organizationCatalogFormMessageEl, "กรุณากรอกประเภทองค์กรและชื่อองค์กร", "#b91c1c");
      return;
    }
    if (payload.requiresDocumentRunCode && !payload.documentRunCodeByAcademicYear?.[getOrganizationCatalogDisplayAcademicYear()]) {
      setMessage(organizationCatalogFormMessageEl, "กรุณาเลือกฝ่ายรับผิดชอบหลักก่อนบันทึก", "#b91c1c");
      return;
    }

    const currentUser = readCurrentUser();
    const updatedBy = (currentUser?.email || getCurrentAuthEmail() || "").toString().trim().toLowerCase();
    const timestampValue = firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString();
    const previousCatalogItem = getRawOrganizationCatalogItemById(payload.legacyOrganizationId || payload.id) ||
      getRawOrganizationCatalogRows().find((item) => {
        const baseId = getOrganizationCatalogBaseId(item);
        return baseId && baseId === payload.baseOrganizationId;
      }) ||
      null;
    try {
      if (organizationCatalogSaveBtnEl) organizationCatalogSaveBtnEl.disabled = true;
      setMessage(organizationCatalogFormMessageEl, "กำลังบันทึก...", "#1d4ed8");
      const { id, requiresDocumentRunCode, formName, ...fields } = payload;
      const moveUpdates = buildOrganizationCatalogManualMoveUpdates({
        payload,
        academicYear: getOrganizationCatalogDisplayAcademicYear()
      });
      const sharedAccountUpdates = buildOrganizationCatalogSharedAccountUpdates({ payload });
      const secondaryUpdates = Array.from(
        [...moveUpdates, ...sharedAccountUpdates]
          .reduce((map, item) => {
            if (!item?.id) return map;
            map.set(item.id, { ...(map.get(item.id) || {}), ...item });
            return map;
          }, new Map())
          .values()
      );
      const writeFields = (item) => {
        const { id: itemId, ...itemFields } = item;
        return {
          ref: firestore.doc(firestore.db, COLLECTION_ORGANIZATION_CATALOG, itemId),
          fields: {
            ...itemFields,
            updatedAt: timestampValue,
            updatedBy
          }
        };
      };
      const writes = [
        writeFields({ id, ...fields }),
        ...secondaryUpdates.map(writeFields)
      ];
      if (firestore.writeBatch && writes.length > 1) {
        const batch = firestore.writeBatch(firestore.db);
        writes.forEach((write) => batch.set(write.ref, write.fields, { merge: true }));
        await batch.commit();
      } else {
        for (const write of writes) {
          await firestore.setDoc(write.ref, write.fields, { merge: true });
        }
      }

      const updatedById = new Map(secondaryUpdates.map((item) => [item.id, item]));
      const nextRows = getRawOrganizationCatalogRows()
        .filter((item) => item.id !== id)
        .map((item) => updatedById.has(item.id) ? { ...item, ...updatedById.get(item.id) } : item);
      nextRows.push({
        id,
        ...fields
      });
      setLocalOrganizationCatalogRows(nextRows);
      await syncPublicOrganizationCatalogCache(nextRows);
      const syncedRepresentativeCount = await syncOrgRepresentativeApplicationsForCatalogChange({
        payload,
        previousItem: previousCatalogItem,
        updatedBy,
        timestampValue
      });
      fillOrganizationCatalogForm(getOrganizationCatalogRows().find((item) => item.id === id));
      setMessage(
        organizationCatalogFormMessageEl,
        syncedRepresentativeCount
          ? `บันทึกทะเบียนองค์กรแล้ว อัปเดต public cache และ sync ตัวแทน ${syncedRepresentativeCount.toLocaleString("th-TH")} รายการแล้ว`
          : "บันทึกทะเบียนองค์กรแล้ว และอัปเดต public cache แล้ว",
        "#047857"
      );
      void window.sgcuAuditLog?.write?.({
        action: "staff.organization_catalog.upsert",
        entityType: "organizationCatalogItem",
        entityId: id,
        before: previousCatalogItem,
        after: { id, ...fields },
        metadata: {
          secondaryUpdateCount: secondaryUpdates.length,
          syncedRepresentativeCount
        },
        source: "web_app_staff"
      });
      renderOrgRepresentativeApplications();
    } catch (error) {
      console.error("save organization catalog failed - app.staff-access.js:4917", error);
      const message = (error?.code || "") === "permission-denied"
        ? "ไม่มีสิทธิ์บันทึกทะเบียนองค์กร"
        : (error?.message || "บันทึกทะเบียนองค์กรไม่สำเร็จ");
      setMessage(organizationCatalogFormMessageEl, message, "#b91c1c");
    } finally {
      if (organizationCatalogSaveBtnEl) organizationCatalogSaveBtnEl.disabled = false;
    }
  };

  const archiveCurrentOrganizationCatalogItem = async () => {
    const id = normalizeOrganizationCatalogText(organizationCatalogFields.id?.value);
    if (!id) return;
    const name = normalizeOrganizationCatalogText(organizationCatalogFields.name?.value) || "รายการนี้";
    const ok = await SGCU_DIALOG.confirmDeletion({ title: "ยืนยันลบออกจากทะเบียนองค์กร", message: `ยืนยันลบ "${name}" ออกจากทะเบียนองค์กร?`, confirmLabel: "ลบออกจากทะเบียน" });
    if (!ok) return;
    if (!resolveStore() || !firestore.updateDoc || !firestore.doc) {
      setMessage(organizationCatalogFormMessageEl, "ระบบยังไม่พร้อมลบข้อมูล", "#b91c1c");
      return;
    }
    const currentUser = readCurrentUser();
    const updatedBy = (currentUser?.email || getCurrentAuthEmail() || "").toString().trim().toLowerCase();
    const previousCatalogItem = getRawOrganizationCatalogItemById(id) || null;
    try {
      if (organizationCatalogArchiveBtnEl) organizationCatalogArchiveBtnEl.disabled = true;
      await firestore.updateDoc(
        firestore.doc(firestore.db, COLLECTION_ORGANIZATION_CATALOG, id),
        {
          status: "archived",
          archivedAt: firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString(),
          updatedAt: firestore.serverTimestamp ? firestore.serverTimestamp() : new Date().toISOString(),
          updatedBy
        }
      );
      setLocalOrganizationCatalogRows(getRawOrganizationCatalogRows().filter((item) => item.id !== id));
      await syncPublicOrganizationCatalogCache();
      resetOrganizationCatalogForm();
      setMessage(organizationCatalogFormMessageEl, "ลบออกจากทะเบียนแล้ว และอัปเดต public cache แล้ว", "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.organization_catalog.archive",
        entityType: "organizationCatalogItem",
        entityId: id,
        before: previousCatalogItem,
        after: { id, status: "archived" },
        source: "web_app_staff"
      });
      renderOrgRepresentativeApplications();
    } catch (error) {
      console.error("archive organization catalog failed - app.staff-access.js:4965", error);
      const message = (error?.code || "") === "permission-denied"
        ? "ไม่มีสิทธิ์ลบทะเบียนองค์กร"
        : (error?.message || "ลบทะเบียนองค์กรไม่สำเร็จ");
      setMessage(organizationCatalogFormMessageEl, message, "#b91c1c");
      if (organizationCatalogArchiveBtnEl) organizationCatalogArchiveBtnEl.disabled = false;
    }
  };

  const importOrganizationCatalogCsvFile = async (file) => {
    if (!file) return;
    if (!resolveStore()) {
      setMessage(organizationCatalogImportMessageEl, "ระบบยังไม่พร้อมเชื่อมต่อ Firestore", "#b91c1c");
      return;
    }
    if (!firestore.setDoc || !firestore.doc) {
      setMessage(organizationCatalogImportMessageEl, "ระบบยังไม่พร้อมบันทึกทะเบียนองค์กร", "#b91c1c");
      return;
    }

    const currentUser = readCurrentUser();
    const importedBy = (currentUser?.email || getCurrentAuthEmail() || "").toString().trim().toLowerCase();
    if (!importedBy) {
      setMessage(organizationCatalogImportMessageEl, "กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์", "#b91c1c");
      return;
    }

    try {
      if (organizationCatalogImportBtnEl) organizationCatalogImportBtnEl.disabled = true;
      setMessage(organizationCatalogImportMessageEl, "กำลังอ่านไฟล์เก่า...", "#1d4ed8");
      await window.sgcuVendorLoader?.ensurePapa?.();
      if (!window.Papa) throw new Error("ไม่พบ PapaParse สำหรับอ่าน CSV");

      const text = await file.text();
      const parsed = window.Papa.parse(text, {
        header: false,
        skipEmptyLines: true
      });
      if (parsed.errors && parsed.errors.length) {
        console.warn("organization catalog csv parse warnings - app.staff-access.js:5004", parsed.errors);
      }

      const items = parseOrganizationCatalogCsvRows(parsed.data || []);
      if (!items.length) {
        setMessage(organizationCatalogImportMessageEl, "ไม่พบข้อมูลในไฟล์ CSV: ต้องมีคอลัมน์ A ประเภทองค์กร และ B ชื่อชมรม", "#b91c1c");
        return;
      }

      setMessage(organizationCatalogImportMessageEl, `กำลังอัปโหลด ${items.length.toLocaleString("th-TH")} องค์กรเข้า Firebase...`, "#1d4ed8");
      const written = await writeOrganizationCatalogItems(items, importedBy);
      refreshOrganizationCatalogAfterImport(items);
      await syncPublicOrganizationCatalogCache();
      setMessage(organizationCatalogImportMessageEl, `อัปโหลดทะเบียนองค์กร ${written.toLocaleString("th-TH")} รายการเข้า Firebase แล้ว และอัปเดต public cache แล้ว`, "#047857");
      void window.sgcuAuditLog?.write?.({
        action: "staff.organization_catalog.import",
        entityType: "organizationCatalogItem",
        entityId: "bulk",
        after: { importedCount: written },
        metadata: {
          count: written,
          idSample: items.map((item) => item.id).filter(Boolean).slice(0, 20)
        },
        source: "web_app_staff"
      });
    } catch (error) {
      console.error("import organization catalog csv failed - app.staff-access.js:5030", error);
      const code = (error?.code || "").toString();
      const message = code === "permission-denied"
        ? "ไม่มีสิทธิ์อัปโหลดทะเบียนองค์กรเข้า Firebase"
        : (error?.message || "อัปโหลดไฟล์เก่าไม่สำเร็จ");
      setMessage(organizationCatalogImportMessageEl, message, "#b91c1c");
    } finally {
      if (organizationCatalogImportBtnEl) organizationCatalogImportBtnEl.disabled = false;
      if (organizationCatalogImportFileEl) organizationCatalogImportFileEl.value = "";
    }
  };

