import './finance-trial.js';
const $ = id => document.getElementById(id);
$('reset').closest('section').hidden = true;
const backupNote = document.createElement('p');
backupNote.textContent = 'ชุดสำรองนี้รวมข้อมูลโครงการและประวัติทั้งหมด แต่ไม่รวมบัญชีเข้าสู่ระบบหรือรหัสผ่าน และไม่คืนสิทธิ์บัญชีอัตโนมัติ กู้คืนลงชุดใหม่โดยผู้ดูแลเพื่อไม่เขียนทับชุดที่ใช้อยู่';
$('portable-backup').append(backupNote);
const automaticBackupStatus = document.createElement('p');
automaticBackupStatus.id = 'automatic-backup-status';
automaticBackupStatus.setAttribute('role', 'status');
$('portable-backup').append(automaticBackupStatus);
const reviewSection = document.createElement('section');
reviewSection.id = 'staff-review'; reviewSection.hidden = true;
const element = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
reviewSection.append(element('h2', 'ตรวจบัญชีส่วนโครงการ'), element('p', 'ตรวจรายชื่อจากแหล่งข้อมูลและเวลาที่ระบุในผลตรวจ ไม่มีการเปลี่ยนสิทธิ์ ต้องตรวจสังกัดปี 2568 ก่อนเปิดใช้'));
const reviewButton = element('button', 'ตรวจบัญชีสตาฟ'); reviewButton.type = 'button';
const reviewResult = element('div', ''); reviewResult.id = 'staff-review-result'; reviewResult.setAttribute('aria-live', 'polite');
reviewSection.append(reviewButton, reviewResult); $('data').append(reviewSection);
let reviewGeneration = 0;
document.addEventListener('project-view-refreshed', () => { reviewGeneration++; reviewResult.replaceChildren(); reviewButton.disabled = false; });
const roleNames = { head: 'เหรัญญิก', secretary: 'เลขานุการฝ่ายเหรัญญิก', assistant: 'ผู้ช่วยเหรัญญิก' };
const issueNames = {
  'profile-email-conflict': 'อีเมลในโปรไฟล์ไม่ตรงกัน', 'invalid-positions': 'ข้อมูลตำแหน่งไม่ถูกต้อง',
  'multiple-project-roles': 'มีตำแหน่งส่วนโครงการมากกว่าหนึ่งบทบาท', 'account-not-found': 'ยังไม่พบบัญชีเข้าสู่ระบบ',
  'auth-email-mismatch': 'อีเมลบัญชีไม่ตรงกับสตาฟ', 'account-disabled': 'บัญชีถูกปิดใช้งาน',
  'email-not-verified': 'อีเมลยังไม่ยืนยัน', 'invalid-access-plan': 'ยังจัดแผนสิทธิ์ไม่ได้ ต้องมีเหรัญญิกหนึ่งคนและข้อมูลบัญชีครบ',
  'invalid-existing-grant': 'ข้อมูลสิทธิ์เดิมไม่ถูกต้อง', 'new-access': 'ยังไม่มีสิทธิ์ส่วนโครงการ',
  'previously-revoked': 'สิทธิ์เคยถูกถอน ต้องตรวจสอบก่อนเปิดคืน', 'role-change': 'ตำแหน่งสตาฟต่างจากสิทธิ์เดิม',
  'existing-access-outside-roster': 'มีสิทธิ์เดิมแต่ไม่อยู่ในรายชื่อสตาฟชุดนี้'
};
reviewButton.onclick = async () => {
  const generation = ++reviewGeneration;
  reviewButton.disabled = true; reviewResult.replaceChildren(element('p', 'กำลังตรวจบัญชี…'));
  try {
    const response = await fetch('/api/year68/trial/staff-review');
    const result = await response.json();
    if (generation !== reviewGeneration) return;
    if (!response.ok) throw new Error(result.error || 'ตรวจบัญชีไม่สำเร็จ');
    reviewResult.replaceChildren(element('p', `ตรวจเมื่อ ${new Date(result.checkedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · พบ ${result.candidateCount} บัญชีที่มีตำแหน่งเกี่ยวข้อง · ยังไม่มีการให้สิทธิ์`));
    reviewResult.append(element('p', result.source === 'production-snapshot' ? 'สำเนาผลตรวจจากระบบสตาฟจริงตามเวลาข้างต้น · การกดตรวจซ้ำอ่านสำเนาเดิม ไม่ดึง Firebase จริงซ้ำ และไม่เปิดสิทธิ์บัญชีจริง' : 'ข้อมูลจากชุดทดลองในเครื่อง ยังไม่ได้อ่านบัญชีจริง'));
    if (result.confirmedAccountRoles?.length) {
      reviewResult.append(element('h3', 'บทบาทแยกปีที่คุณยืนยันเพิ่มเติม'));
      const confirmed = element('ul', '');
      for (const row of result.confirmedAccountRoles) confirmed.append(element('li', `${row.email}: ${row.systemRole === 'admin' ? 'แอดมินระบบ' : `เหรัญญิกปี ${row.academicYear}`}`));
      reviewResult.append(confirmed, element('p', 'ข้อมูลยืนยันนี้ยังไม่เปลี่ยนตำแหน่งสตาฟหรือสิทธิ์จริง บัญชีอื่นยังต้องตรวจปีที่สังกัด'));
    }
    if (result.initialAccess) reviewResult.append(element('p', `แผนเริ่มใช้งานปี ${result.initialAccess.academicYear}: เฉพาะเหรัญญิก ${result.initialAccess.headEmail} · ยังไม่เพิ่มสิทธิ์ให้บัญชีอื่น · ยังไม่เปิดสิทธิ์จริง`));
    if (!result.candidateCount) reviewResult.append(element('p', 'ยังไม่มีรายชื่อสตาฟส่วนโครงการในแหล่งข้อมูลนี้'));
    if (result.candidates.length) {
      const table = element('table', ''), heading = element('tr', '');
      for (const label of ['อีเมลเดิมในระบบสตาฟ', 'ตำแหน่ง', 'ปีตามรหัสตำแหน่ง', 'ผลตรวจบัญชี']) { const th = element('th', label); th.scope = 'col'; heading.append(th); }
      const thead = element('thead', ''); thead.append(heading); table.append(thead);
      const tbody = element('tbody', '');
      for (const row of result.candidates) {
        const tr = element('tr', '');
        const years = row.positionYears?.years?.length ? row.positionYears.years.join(', ') + (row.positionYears.incomplete ? ' · บางรหัสยังตรวจไม่ได้' : '') : 'ยังระบุปีไม่ได้';
        for (const value of [row.email, roleNames[row.role], years, row.uid ? 'พบบัญชีและยืนยันอีเมลแล้ว' : 'ต้องตรวจสอบ']) tr.append(element('td', value));
        tbody.append(tr);
      }
      table.append(tbody); reviewResult.append(table);
    }
    const list = element('ul', '');
    for (const row of [...result.issues, ...result.differences]) {
      const who = row.email || result.candidates.find(c => c.uid === row.uid)?.email || row.uid || 'รายชื่อรวม';
      const description = row.reason === 'invalid-access-plan' && result.confirmedAccountRoles?.length ? 'ยังไม่เปิดใช้แผนสิทธิ์รายปี ใช้บทบาทที่ยืนยันด้านบนประกอบการตรวจสมาชิกปี 2568' : issueNames[row.reason || row.kind] || 'ต้องตรวจสอบข้อมูลเพิ่มเติม';
      list.append(element('li', `${who}: ${description}`));
    }
    if (list.childNodes.length) reviewResult.append(list);
    reviewResult.append(element('p', 'ปีตามรหัสตำแหน่งเป็นข้อมูลประกอบ ยังไม่ใช่การยืนยันสิทธิ์ ต้องตรวจสมาชิกปี 2568 และมอบหมายโครงการ ผู้ช่วยยังไม่ได้รับโครงการจากการตรวจนี้'));
  } catch (error) { if (generation === reviewGeneration) reviewResult.replaceChildren(element('p', error.message)); }
  finally { if (generation === reviewGeneration) reviewButton.disabled = false; }
};
$('login-form').onsubmit = async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  $('data').hidden = true;
  try {
    const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('login-email').value.trim(), password: $('login-password').value }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    $('login-password').value = ''; $('login-panel').hidden = true; $('logout').hidden = false;
    $('login-user').textContent = result.user.name;
    $('refresh').click();
  } catch (error) { $('message').textContent = error.message; }
  finally { button.disabled = false; }
};
$('logout').onclick = async () => {
  const response = await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (response.ok) location.reload();
};
