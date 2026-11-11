const local = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('meetingEmulator') === '1';
const status = document.getElementById('emulator-status');
if (!local) {
  status.textContent = 'หน้าทดสอบนี้เปิดได้เฉพาะ localhost ในโหมด Emulator';
} else {
  await import('../../integrations/app.firebase-bootstrap.js');
  await import('./app.budget-meeting-roster.js');
  await import('./app.budget-meeting-live.js');
  await import('./app.budget-meeting-ranking-ui.js');
  const catalog = [
    { code: 'SGCU-01.00', name: 'ฝ่ายทดสอบ 01' }, { code: 'SGCU-01.01', name: 'หน่วยย่อย 01' },
    { code: 'SGCU-02.00', name: 'ฝ่ายทดสอบ 02' }
  ];
  const applications = [
    ['a', 'SGCU-01.00', 'chair01@chula.ac.th', 'ประธานฝ่าย 01', 'ประธาน'],
    ['b', 'SGCU-01.01', 'member01@chula.ac.th', 'สมาชิกฝ่าย 01', 'กรรมการ'],
    ['c', 'SGCU-02.00', 'chair02@chula.ac.th', 'ประธานฝ่าย 02', 'ประธาน']
  ].map(([id, organizationCode, applicantEmail, applicantName, representativeRole]) => ({ id, organizationCode, applicantEmail, applicantName, representativeRole, academicYear: '2569', requestType: 'organization_representative', status: 'approved' }));
  const organizations = window.sgcuBudgetMeetingRoster.organizations(catalog, applications, '2569');
  const check = () => { if (window.sgcuAuth.auth.currentUser?.email !== 'tuwanon.kimchiang@gmail.com') throw Error('กรุณาเข้าสู่ระบบประธานทดสอบ'); };
  window.sgcuGetBudgetMeetingDefaults = () => { check(); return structuredClone(organizations); };
  window.sgcuGetBudgetMeetingSource = () => {
    check();
    return { version: 1, rounds: [{ id: 'emulator-round', label: 'รอบทดสอบหลายบัญชี', sgcuBudgetCeiling: 150000, organizations }], requests: organizations.map((o, i) => ({ id: String(i), budgetRoundId: 'emulator-round', projectName: `โครงการทดสอบ ${i + 1}`, projectCodeGenerated: `${o.code}.001`, organizationCode: o.code, organizationName: o.name, estimatedExpense: 100000 })) };
  };
  await import('./app.budget-meeting.js');
  const login = document.getElementById('emulator-chair');
  login.hidden = false;
  login.onclick = async () => {
    login.disabled = true;
    try { await window.sgcuAuth.signInWithEmailAndPassword(window.sgcuAuth.auth, 'tuwanon.kimchiang@gmail.com', 'Meeting-test-123!'); }
    catch (error) { status.textContent = error.message; }
    finally { login.disabled = false; }
  };
  window.sgcuAuth.onAuthStateChanged(window.sgcuAuth.auth, user => {
    const chair = user?.email === 'tuwanon.kimchiang@gmail.com';
    document.getElementById('emulator-meeting').hidden = !chair;
    login.hidden = chair;
    status.textContent = chair ? 'Emulator · บัญชีประธานทดสอบ · ไม่เชื่อมข้อมูลจริง' : 'Emulator · ยังไม่ได้เข้าสู่ระบบ';
    if (chair) document.dispatchEvent(new Event('sgcu:budget-meeting-open'));
  });
}
