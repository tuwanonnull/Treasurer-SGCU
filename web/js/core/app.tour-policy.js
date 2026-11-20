/* Versioned, permission-filtered tour content. No application actions. */
(function (root) {
  const nav = (page, title, text) => ({ id: page, page, nav: true, title, text });
  const meeting = [
    ['calendar', '#meetingRoomCalendarPanel', 'ตรวจสอบตารางก่อนจอง', 'ดูรายการจองในวันที่ต้องการ เพื่อช่วยเลือกช่วงเวลาใช้ห้อง'],
    ['room', '#meetingRoomName', 'เลือกห้องและวันที่', 'เลือกห้องประชุมและวันที่ต้องการใช้งาน'],
    ['time', '#meetingStartTime', 'กำหนดช่วงเวลา', 'ระบุเวลาเริ่มและสิ้นสุด ระบบจะตรวจสอบเวลาทับซ้อนเมื่อส่งคำขอ'],
    ['purpose', '#meetingPurpose', 'ระบุรายละเอียดก่อนส่ง', 'กรอกหัวข้อประชุมหรือกิจกรรม ตรวจสอบข้อมูล แล้วกดส่งคำขอจองเพื่อรออนุมัติ'],
    ['requests', '#meetingMyRequestsPanel', 'ติดตามผลการจอง', 'ตรวจสอบสถานะและจัดการคำขอได้ที่นี่ การส่งคำขอยังไม่ถือว่าได้รับอนุมัติ']
  ].map(([id, selector, title, text]) => ({ id, selector, title, text, page: 'meeting-room-booking' }));
  const general = [
    nav('financial-docs', 'หาแบบฟอร์มได้ที่นี่', 'เลือก “แบบฟอร์มการเงิน” จากเมนูหลัก เพื่อค้นหาแบบฟอร์มและเอกสารที่ต้องใช้'),
    nav('project-status', 'ติดตามโครงการ', 'เลือก “สถานะโครงการ” จากเมนูหลัก เพื่อติดตามสถานะและข้อมูลโครงการ'),
    nav('borrow-assets', 'ต้องการยืมพัสดุ เริ่มที่นี่', 'ไปที่ “ยื่นคำขอ → ยืม-คืนพัสดุ” เพื่อดูรายการพัสดุ ส่งคำขอยืม และติดตามผล'),
    nav('meeting-room-booking', 'วางแผนใช้ห้องประชุม', 'ไปที่ “ยื่นคำขอ → จองห้องประชุม” เพื่อตรวจสอบตาราง ส่งคำขอใช้ห้อง และติดตามผล'),
    nav('budget-approval-request', 'ยื่นคำขอขององค์กร', 'คุณมีสิทธิ์ยื่นของบประมาณ ไปที่ “ยื่นคำขอ → ยื่นของบประมาณ” เพื่อกรอกคำขอและติดตามผล')
  ];
  const staffGroups = [
    ['overview', 'เข้าถึงงานโครงการและข้อมูล', ['dashboard-staff', 'project-live-staff', 'treasurer-handover-staff', 'system-data-staff']],
    ['requests', 'ตรวจสอบคำขอที่รับผิดชอบ', ['budget-approval-staff', 'borrow-assets-staff', 'meeting-room-staff']],
    ['users', 'จัดการผู้ใช้งานและสิทธิ์', ['staff-approval', 'staff-directory-staff', 'staff-temporary-access-staff', 'org-representative-approval-staff']],
    ['content', 'ดูแลข้อมูลบนเว็บไซต์', ['content-news-staff', 'content-documents-staff']]
  ];
  const labels = {
    'dashboard-staff': 'ภาพรวมโครงการ', 'project-live-staff': 'จัดการโครงการ',
    'treasurer-handover-staff': 'คู่มือ เหรัญญิก อบจ.', 'system-data-staff': 'ข้อมูลระบบ',
    'budget-approval-staff': 'คำของบประมาณ', 'borrow-assets-staff': 'ยืม-คืนพัสดุ',
    'meeting-room-staff': 'ห้องประชุม', 'staff-approval': 'สตาฟและคำขอ',
    'staff-directory-staff': 'ทำเนียบรุ่น', 'staff-temporary-access-staff': 'สิทธิ์ชั่วคราว',
    'org-representative-approval-staff': 'ตัวแทนองค์กร', 'content-news-staff': 'ข่าวสาร',
    'content-documents-staff': 'เอกสารการเงิน'
  };
  function build(account, replay = false) {
    if (replay) {
      const normalPages = account.generalPages || account.pages;
      const normal = new Set(normalPages);
      const base = account.type === 'affairs' ? meeting : general;
      const steps = base.filter(s => normal.has(s.page)).map(s => ({ ...s, mode: 'normal' }));
      if (account.staffApproved === true) {
        const staff = build({ ...account, mode: 'staff', pages: account.replayStaffPages || account.staffPages || account.pages });
        steps.push(...staff.steps.map(s => ({ ...s, mode: 'staff' })));
      }
      return { key: 'replay_v1', steps };
    }
    const allowed = new Set(account.pages);
    if (account.mode !== 'staff') {
      if (account.representativeApproved === true && account.type !== 'affairs') return {
        key: 'representative_v1', special: true,
        steps: general.filter(s => s.page === 'budget-approval-request' && allowed.has(s.page))
      };
      return {
        key: account.type === 'affairs' ? 'meeting_v1' : 'general_v1',
        steps: account.staffApproved === true && !replay ? [] :
          (account.type === 'affairs' ? meeting : general.filter(s => s.page !== 'budget-approval-request')).filter(s => allowed.has(s.page))
      };
    }
    if (account.staffApproved !== true) return { key: 'staff_v1', steps: [] };
    const steps = [{ id: 'mode', page: 'login', selector: '#staffModeToggle', title: 'ขณะนี้คุณอยู่ในโหมดสตาฟ', text: 'เมนูในโหมดนี้ใช้จัดการงานตามสิทธิ์ของคุณ สลับทั่วไป/สตาฟได้ที่หน้าบัญชีผู้ใช้' }];
    staffGroups.forEach(([id, title, pages]) => {
      const visible = pages.filter(p => allowed.has(p));
      if (visible.length) steps.push({ id: `${id}:${visible.join(',')}`, page: visible[0], pageIds: visible, nav: true, group: true, title, text: `เมนูที่คุณใช้ได้: ${visible.map(p => labels[p]).join(' · ')} เปิดเมนูเพื่อดูรายละเอียดและดำเนินการตามสิทธิ์ของคุณ` });
    });
    return { key: 'staff_v1', special: true, steps };
  }
  function pending(tour, record = {}, replay = false) {
    if (replay) return tour.steps;
    const seen = new Set(record.seen || []);
    return tour.steps.flatMap(step => {
      if (!step.pageIds) return seen.has(step.id) ? [] : [step];
      const pages = step.pageIds.filter(page => !seen.has(page));
      return pages.length ? [{ ...step, page: pages[0], pageIds: pages,
        text: `เมนูที่คุณใช้ได้: ${pages.map(page => labels[page]).join(' · ')} เปิดเมนูเพื่อดูรายละเอียดและดำเนินการตามสิทธิ์ของคุณ` }] : [];
    });
  }
  function eligible(record = {}, session, now = Date.now()) {
    return record.deferredSession !== session && !(record.deferUntil > now);
  }
  function timestamp(value) {
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (value && typeof value.seconds === 'number') return value.seconds * 1000;
    return typeof value === 'number' ? value : Date.parse(value || '') || 0;
  }
  function rolloutBaseline(account, rolloutAt) {
    const cutoff = timestamp(rolloutAt);
    if (!cutoff) return null;
    const existing = timestamp(account.user?.metadata?.creationTime) < cutoff;
    const seenByTour = {};
    if (existing) {
      seenByTour.general_v1 = general.filter(s => s.page !== 'budget-approval-request').map(s => s.id);
      seenByTour.meeting_v1 = meeting.map(s => s.id);
      if (account.representativeApproved && timestamp(account.representativeApprovedAt) < cutoff) {
        seenByTour.representative_v1 = ['budget-approval-request'];
      }
      if (account.staffApproved) {
        const oldPages = (account.staffPages || []).filter(page =>
          page !== 'login' && timestamp(account.staffPageApprovedAt?.[page]) < cutoff);
        seenByTour.staff_v1 = oldPages.length ? ['mode', ...oldPages] : [];
      }
    }
    return { existing, cutoff, seenByTour };
  }
  function recordFor(tour, records) {
    let record = records[tour.key] || {};
    // Retain completion from the earlier combined general/representative tour.
    if (!records[tour.key] && tour.key === 'representative_v1' && records.general_v1?.seen?.includes('budget-approval-request')) {
      record = { status: 'completed', seen: ['budget-approval-request'] };
    }
    return { ...record, seen: [...new Set([
      ...(record.seen || []), ...(records.rollout_v1?.seenByTour?.[tour.key] || [])
    ])] };
  }
  const seenIds = step => step.pageIds || [step.id];
  root.sgcuTourPolicy = { build, pending, eligible, seenIds, recordFor, rolloutBaseline, timestamp };
})(globalThis);
