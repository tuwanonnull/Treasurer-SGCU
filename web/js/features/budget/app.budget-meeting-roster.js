(() => {
  const text = value => String(value ?? '').trim();
  function organizations(catalog, applications, year) {
    return catalog.filter(o => /^SGCU-\d{2}\.00$/.test(o.code)).map(org => {
      const members = new Map();
      for (const item of applications) {
        if (text(item.status).toLowerCase() !== 'approved' || text(item.requestType) !== 'organization_representative') continue;
        // Undated records are not silently assigned to the current academic year.
        if (text(item.academicYear || item.representativeAcademicYear || item.schoolYear) !== text(year)) continue;
        const baseId = text(item.baseOrganizationId || item.baseOrgId || item.rootOrganizationId);
        const direct = catalog.filter(o => o.id && (o.id === item.organizationId || o.id === item.organizationCatalogId));
        const base = baseId ? catalog.filter(o => o.baseOrganizationId === baseId) : [];
        const codeValue = text(item.organizationCode || item.orgCode || item.code).toUpperCase();
        const byCode = catalog.filter(o => o.code === codeValue);
        const name = text(item.organizationName || item.orgName);
        const group = text(item.organizationType || item.orgGroup);
        const byName = name ? catalog.filter(o => text(o.name) === name && (!group || text(o.group) === group)) : [];
        const matches = [direct, base, byCode, byName].find(rows => rows.length === 1);
        const code = text(matches?.[0]?.code || codeValue).toUpperCase();
        if (!/^SGCU-\d{2}\.\d{2}$/.test(code) || code.slice(0, 7) !== org.code.slice(0, 7)) continue;
        const email = text(item.applicantEmail || item.applicant?.email || item.requester?.email).toLowerCase();
        const memberName = text(item.applicant?.displayName || item.requester?.displayName || item.applicantName || email);
        const role = text(item.representativeRole);
        const organizationName = text(matches?.[0]?.name || name || code);
        const president = code === org.code && ((role.includes('ประธาน') && !/รอง|ผู้ช่วย|โครงการ/.test(role)) || role.toLowerCase() === 'president');
        const key = email || text(item.id);
        if (!key) continue;
        const previous = members.get(key);
        if (!previous || president) members.set(key, { id: key, name: memberName, email, role, code, organizationName, president });
      }
      const list = [...members.values()].sort((a, b) => Number(b.president) - Number(a.president) || a.name.localeCompare(b.name, 'th'));
      const presidents = list.filter(m => m.president);
      const defaultRepresentative = presidents.length === 1 && presidents[0].email ? presidents[0].id : '';
      const representativeIssue = defaultRepresentative ? '' : !list.length ? 'ไม่พบผู้แทนที่อนุมัติในปีนี้' : presidents.length > 1 ? 'พบประธานมากกว่า 1 คน กรุณาเลือก' : presidents.length === 1 ? 'ประธานยังไม่มีอีเมลบัญชี' : 'ไม่พบประธานของฝ่ายหลัก กรุณาเลือกผู้แทน';
      return { code: org.code, name: org.name, members: list, defaultRepresentative, representativeIssue };
    });
  }
  window.sgcuBudgetMeetingRoster = { organizations };
})();
