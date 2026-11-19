// Local-only demo: real markup/styles, simulated identities and account storage.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../dist/', import.meta.url));
const previewStyles = `<style>
.demo-controls{margin:0 0 28px;padding:24px;border:1px solid #f9c7de;border-radius:22px;background:linear-gradient(120deg,#fff7fb,#fff);box-shadow:0 8px 28px #c525650a;color:#283247}
.demo-badge{display:inline-block;padding:4px 10px;border-radius:99px;background:#fce5f0;color:#bd1259;font-size:.875rem;font-weight:600}
.demo-controls h2{margin:10px 0 6px;font-size:1.3rem}.demo-controls p{margin:0;color:#657087;font-size:.9rem;line-height:1.6}
.demo-form{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;margin-top:20px}.demo-form label{display:block;margin-bottom:8px;font-weight:600;font-size:.95rem}.demo-form select{width:100%;min-height:46px}.demo-form p{margin-top:8px}
.demo-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid #f3dce7;margin-top:20px;padding-top:16px}.demo-footer>div{display:flex;gap:8px;flex-wrap:wrap}.demo-controls button{min-height:44px;font-family:inherit}.demo-controls [hidden]{display:none!important}
@media(max-width:600px){.demo-controls{padding:18px;border-radius:18px}.demo-form{grid-template-columns:1fr;gap:12px}.demo-footer{align-items:stretch}.demo-footer>div{width:100%}.demo-footer button{flex:1}.demo-controls h2{font-size:1.15rem}}
.demo-theme { display:flex; align-items:center; gap:12px; margin-top:16px; font-size:14px; }
.demo-theme select { width:auto; min-width:150px; min-height:44px; }
html[data-theme="dark"] .demo-controls { background:var(--preview-surface,#222); border-color:var(--preview-border,#404040); color:var(--preview-text,#f2f2f2); }
html[data-theme="dark"] .demo-controls p { color:var(--preview-muted,#b8b8b8); }
html[data-theme="dark"] .demo-badge { background:#382630; color:#f9a8d4; }
html[data-theme="dark"] .demo-footer { border-color:var(--preview-border,#404040); }
</style>`;
const bootstrap = `
const params = new URLSearchParams(location.search);
let persona = params.get('persona') || 'student';
const all = [...new Set([...document.querySelectorAll('[data-page]')].map(el => el.dataset.page))];
const general = ['home','about','news','financial-docs','project-status','borrow-assets','meeting-room-booking','login'];
const personas = {
  student: { label: 'นิสิตทั่วไป', type: 'student', description: 'แบบฟอร์มการเงิน สถานะโครงการ ยืมพัสดุ และจองห้องประชุม' },
  temporary: { label: 'ผู้เข้าชั่วคราว', type: 'temporary', description: 'บริการทั่วไป พร้อมโปรไฟล์หน่วยงานของผู้เข้าชั่วคราว' },
  representative: { label: 'นิสิตตัวแทนองค์กร', type: 'student', representative: true, description: 'บริการทั่วไป และเมนูยื่นของบประมาณ' },
  affairs: { label: 'บุคลากรทั่วไป', type: 'affairs', description: 'ทัวร์เฉพาะจองห้องประชุม ไม่มีเมนูยืมพัสดุ' },
  staff: { label: 'สตาฟ', type: 'student', staff: ['dashboard-staff','budget-approval-staff','meeting-room-staff'], description: 'สลับโหมดได้ ตัวอย่างสิทธิ์: ภาพรวมโครงการ คำของบประมาณ และห้องประชุม' },
  affairs_staff: { label: 'บุคลากรที่มีสิทธิ์สตาฟ', type: 'affairs', staff: ['meeting-room-staff'], description: 'โหมดทั่วไปแนะนำจองห้องประชุม โหมดสตาฟแนะนำจัดการห้องประชุม' },
  head: { label: 'หัวหน้าสตาฟ', type: 'student', staff: all.filter(p => p.endsWith('-staff') || p === 'staff-approval'), description: 'ทดลองเมนูจัดการครบทุกกลุ่ม รวมผู้ใช้งานและเนื้อหา' }
};
if (!Object.hasOwn(personas, persona)) persona = 'student';
const selectedPersona = personas[persona];
const specialPersona = !!(selectedPersona.staff || selectedPersona.representative);
let approved = params.get('approval') === 'approved' || sessionStorage.getItem('demo-approval:' + persona) === 'approved';
function demoPages(mode) {
  if (mode === 'staff' && selectedPersona.staff && approved) return ['login', ...selectedPersona.staff];
  return [...general.filter(p => selectedPersona.type !== 'affairs' || p !== 'borrow-assets'), ...(selectedPersona.representative && approved ? ['budget-approval-request'] : [])];
}
const initialMode = params.get('mode') === 'staff' && selectedPersona.staff && approved ? 'staff' : 'normal';
const rolloutTime = Date.parse(SGCU_APP_CONFIG.onboarding.rolloutAt);
const oldAccount = specialPersona || params.get('legacy') === '1';
const approvalTime = params.get('legacy') === '1' ? rolloutTime - 60000 : rolloutTime + 60000;
window.demoAccount = { user: { uid: 'demo-' + persona, metadata: { creationTime: new Date(rolloutTime + (oldAccount ? -60000 : 60000)).toISOString() } }, type: selectedPersona.type, staffApproved: !!selectedPersona.staff && approved, representativeApproved: !!selectedPersona.representative && approved, representativeApprovedAt: approved ? approvalTime : 0, staffPages: approved ? selectedPersona.staff || [] : [], staffPageApprovedAt: Object.fromEntries((selectedPersona.staff || []).map(page => [page, approvalTime])), mode: initialMode, pages: demoPages(initialMode), ready: true };
window.sgcuTourAccount = () => window.demoAccount;
window.sgcuLoginProfileState = { isAuthenticated: true, isComplete: true, isLoading: false };
window.demoConsent = true;
window.demoWrites = [];
window.sgcuFirestore = { db: {}, doc: (db,col,id) => id, getDoc: async id => ({ exists: () => true, data: () => JSON.parse(localStorage.getItem('demo-remote:'+id) || '{}') }), setDoc: async (id, value) => { if (window.demoOffline) throw Error('offline'); window.demoWrites.push(value); const data = JSON.parse(localStorage.getItem('demo-remote:'+id) || '{}'); data.onboardingTours = { ...data.onboardingTours, ...value.onboardingTours }; localStorage.setItem('demo-remote:'+id, JSON.stringify(data)); } };
window.sgcuTourNavigation = { consentReady: () => window.demoConsent, navigate: async page => { if (!demoAccount.pages.includes(page)) return; document.querySelectorAll('.page-view').forEach(el => el.classList.toggle('active',el.dataset.page === page)); window.dispatchEvent(new CustomEvent('sgcu:page-active',{detail:{page}})); } };
document.querySelector('#appLoader')?.remove();
document.querySelectorAll('.section-appear').forEach(el=>el.classList.add('section-visible'));
document.querySelector('#meetingRoomName').innerHTML='<option>ห้องประชุมตัวอย่าง</option>';
document.querySelector('#meetingMyRequestsState').textContent='ยังไม่มีคำขอจอง';
document.querySelectorAll('[data-role-nav]').forEach(el => el.style.display = el.dataset.roleNav === (demoAccount.mode === 'staff' ? 'staff' : 'general') ? '' : 'none');
document.querySelectorAll('a[data-page]').forEach(el => { el.style.display = demoAccount.pages.includes(el.dataset.page) ? '' : 'none'; el.onclick = e => { e.preventDefault(); sgcuTourNavigation.navigate(el.dataset.page); }; });
document.querySelectorAll('.nav-group-toggle').forEach(btn => btn.onclick = () => { const menu = btn.parentElement.querySelector('.nav-group-menu'); btn.setAttribute('aria-expanded','true'); menu.classList.add('show'); menu.setAttribute('aria-hidden','false'); btn.parentElement.classList.add('is-open'); });
window.setMobileMenuState = (menu,btn,on) => { menu.classList.toggle('show',on); menu.setAttribute('aria-hidden',String(!on)); btn.setAttribute('aria-expanded',String(on)); };
document.querySelector('#hamburgerBtn').onclick = () => setMobileMenuState(document.querySelector('#mobileMenu'),document.querySelector('#hamburgerBtn'),true);
const demoIdentity = { ...demoAccount.user, displayName: selectedPersona.label + ' (จำลอง)', email: persona + '@example.invalid' };
function renderDemoAuth(signedIn) {
  demoAccount.user = signedIn ? demoIdentity : null;
  sgcuLoginProfileState.isAuthenticated = signedIn;
  document.querySelector('#loginProfileCard').hidden = !signedIn;
  document.querySelector('#authAccessSelfService').hidden = signedIn;
  if (signedIn && document.querySelector('#authAccessModal').classList.contains('show')) closeDialog(document.querySelector('#authAccessModal'));
  document.querySelector('.login-hero').classList.toggle('is-authenticated', signedIn);
  document.querySelector('#loginHeroContent').hidden = signedIn;
  document.querySelector('#loginPageGoogleBtn').style.display = signedIn ? 'none' : 'inline-block';
  document.querySelector('#loginPageLogoutBtn').style.display = signedIn ? 'inline-block' : 'none';
  document.querySelector('#loginPageStatus').textContent = signedIn ? 'สวัสดี, ' + demoIdentity.displayName : '';
  const email = document.querySelector('#loginAccountEmail');
  email.hidden = !signedIn; email.textContent = signedIn ? demoIdentity.email : '';
  const avatar = document.querySelector('#loginAccountAvatar');
  avatar.hidden = !signedIn; avatar.textContent = signedIn ? 'ผ' : '';
  document.querySelector('#userInfo').textContent = signedIn ? demoIdentity.displayName : 'เข้าสู่ระบบ';
  document.querySelector('#staffModeToggle').style.display = signedIn && selectedPersona.staff && approved ? 'flex' : 'none';
  document.querySelectorAll('[data-staff-mode]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.staffMode === demoAccount.mode));
  const role = signedIn && demoAccount.mode === 'staff' ? 'staff' : 'general';
  document.querySelectorAll('[data-role-nav]').forEach(el => el.style.display = el.dataset.roleNav === role ? '' : 'none');
  document.querySelectorAll('a[data-page]').forEach(el => {
    const allowed = signedIn ? demoAccount.pages : general.filter(p => !['borrow-assets','meeting-room-booking'].includes(p));
    el.style.display = allowed.includes(el.dataset.page) ? '' : 'none';
  });
  const isStudent = demoAccount.type === 'student';
  const isTemporary = demoAccount.type === 'temporary';
  document.querySelector('#loginProfileTypeDisplay').textContent = isTemporary ? 'ผู้ใช้งานชั่วคราว' : isStudent ? 'นิสิต' : 'บุคลากร';
  document.querySelector('#loginProfileStudentFields').style.display = isStudent ? '' : 'none';
  document.querySelector('#loginProfileOrganizationField').hidden = !isTemporary;
  document.querySelector('#loginProfileOrganization').value = 'หน่วยงานตัวอย่าง';
  document.querySelector('#loginProfileTemporaryInfo').hidden = !isTemporary;
  document.querySelector('#loginProfileTemporaryExpiry').textContent = isTemporary ? 'บัญชีจำลองสำหรับทดลองสิทธิ์ชั่วคราว' : '';
  document.querySelector('#loginProfileTitle').textContent = isTemporary ? 'ข้อมูลผู้ใช้งานชั่วคราว' : 'ข้อมูลบัญชีผู้ใช้';
  document.querySelector('#loginProfileContactRow').classList.toggle('is-affairs-contact', demoAccount.type === 'affairs');
  for (const [id, value] of Object.entries({loginProfileFirstName:'ผู้ใช้',loginProfileLastName:'ตัวอย่าง',loginProfileNickname:'ตัวอย่าง',loginProfileStudentId:'6900000021',loginProfilePhone:'0812345678',loginProfileLineId:'demo'})) document.getElementById(id).value = value;
  document.querySelector('#loginProfileFaculty').textContent = 'วิศวกรรมศาสตร์';
  document.querySelector('#loginProfileYear').textContent = '1';
  document.querySelector('#loginNotificationSummary').textContent = 'โหมดทดลอง: ไม่ส่งการแจ้งเตือน';
  const approveButton = document.querySelector('#demoApprove');
  if (approveButton) approveButton.hidden = !signedIn || !specialPersona || approved;
  const state = document.querySelector('#demoState');
  if (state) state.textContent = signedIn ? 'กำลังทดลอง: ' + selectedPersona.label + (specialPersona ? (approved ? ' · อนุมัติแล้ว' : ' · รออนุมัติ') : '') + ' · ' + (demoAccount.mode === 'staff' ? 'โหมดสตาฟ' : 'โหมดทั่วไป') : 'ยังไม่ได้เข้าสู่ระบบจำลอง';
  const logout = document.querySelector('#demoLogout'); if (logout) logout.hidden = !signedIn;
  ['loginHelpApplyBtn','budgetRepresentativeApplyBtn'].forEach(id => { const el = document.getElementById(id); if(el) el.hidden = !signedIn; });
}
const accessModal = document.querySelector('#authAccessModal');
const accessForm = document.querySelector('#authAccessRequestForm');
const accessStatus = document.querySelector('#authAccessStatus');
document.querySelector('#authAccessOpen').onclick = () => {
  if (demoAccount.user) return;
  accessStatus.textContent = 'โหมดทดลอง: ยืนยันบัญชีและส่งคำร้องจำลองเท่านั้น';
  openDialog(accessModal, { focusSelector: '#authAccessCheck' });
};
document.querySelector('#authAccessClose').onclick = () => closeDialog(accessModal);
accessModal.addEventListener('click', event => { if (event.target === accessModal) closeDialog(accessModal); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && accessModal.classList.contains('show')) { event.preventDefault(); closeDialog(accessModal); } });
document.querySelector('#authAccessCheck').onclick = () => {
  document.querySelector('#authAccessEmail').value = 'applicant@example.invalid';
  accessForm.querySelector('button[type="submit"]').disabled = false;
  accessStatus.textContent = 'ยืนยันบัญชีจำลองแล้ว ไม่มีการเชื่อมต่อ Google';
};
accessForm.addEventListener('submit', event => {
  event.preventDefault();
  accessForm.querySelector('button[type="submit"]').disabled = true;
  accessStatus.textContent = 'คำร้องจำลองอยู่ระหว่างรออนุมัติ ไม่มีการส่งข้อมูลจริง';
  accessStatus.tabIndex = -1; accessStatus.focus();
});
function demoLogin() { sessionStorage.setItem('tour-demo-auth',persona); renderDemoAuth(true); sgcuTourNavigation.navigate('login'); }
function demoLogout() { sessionStorage.removeItem('tour-demo-auth'); renderDemoAuth(false); sgcuTourNavigation.navigate('login'); }
document.querySelector('#loginPageGoogleBtn').onclick = demoLogin;
document.querySelector('#loginPageLogoutBtn').onclick = demoLogout;
document.querySelectorAll('[data-staff-mode]').forEach(btn => btn.onclick = () => {
  if (!demoAccount.user || !selectedPersona.staff || !approved) return;
  demoAccount.mode = btn.dataset.staffMode; demoAccount.pages = demoPages(demoAccount.mode);
  renderDemoAuth(true); sgcuTourNavigation.navigate('login');
});
const bar = document.createElement('section'); bar.className = 'demo-controls'; bar.setAttribute('aria-labelledby','demoTitle');
bar.innerHTML='<div class="demo-heading"><div><span class="demo-badge">พื้นที่ทดลอง</span><h2 id="demoTitle">ทดลองล็อกอินและทัวร์</h2><p>เลือกบัญชีเพื่อทดลองเมนูและคำแนะนำตามสิทธิ์ ใช้ข้อมูลจำลองทั้งหมด</p></div></div><div class="demo-form"><div><label for="demoPersona">ประเภทบัญชี</label><select id="demoPersona" class="login-input"></select><p id="demoDescription"></p></div><button type="button" id="demoLogin" class="btn-primary">เข้าสู่ระบบจำลอง</button></div><div class="demo-theme"><label for="demoTheme">ธีมที่ทดลอง</label><select id="demoTheme" class="login-input"><option value="light">สว่าง</option><option value="dark">มืด (Dark mode)</option><option value="system">ตามอุปกรณ์</option></select></div><div class="demo-footer"><p id="demoState" role="status"></p><div><button type="button" id="demoApprove" class="btn-primary" hidden>จำลองได้รับอนุมัติ</button><button type="button" id="demoLogout" class="btn-ghost">ออกจากระบบจำลอง</button><button type="button" id="demoReset" class="btn-ghost">เริ่มทัวร์ใหม่</button></div></div>';
// Keep controls next to the login page, in normal flow so they never cover its buttons.
document.querySelector('.login-page').prepend(bar);
const themeSelect = document.querySelector('#demoTheme');
const themeMedia = matchMedia('(prefers-color-scheme: dark)');
const savedTheme = params.get('theme') || localStorage.getItem('tour-demo-theme') || 'light';
themeSelect.value = ['light','dark','system'].includes(savedTheme) ? savedTheme : 'light';
function applyDemoTheme() {
  const preference = themeSelect.value;
  const resolved = preference === 'system' ? (themeMedia.matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem('tour-demo-theme',preference);
  const label = preference === 'system' ? 'ตามอุปกรณ์' : preference === 'dark' ? 'มืด' : 'สว่าง';
  const button = document.querySelector('#themePreference');
  button.querySelector('[data-theme-label]').textContent = label;
  button.setAttribute('aria-label','ธีมการแสดงผล: ' + label + ' กดเพื่อเปลี่ยนธีม');
  button.querySelectorAll('[data-theme-icon]').forEach(icon => { icon.hidden = icon.dataset.themeIcon !== preference; });
}
themeSelect.onchange = applyDemoTheme;
themeMedia.addEventListener('change',applyDemoTheme);
document.querySelector('#themePreference').onclick = () => {
  const values = ['light','dark','system'];
  themeSelect.value = values[(values.indexOf(themeSelect.value)+1)%values.length]; applyDemoTheme();
};
applyDemoTheme();
const selector = document.querySelector('#demoPersona');
Object.entries(personas).forEach(([value, data]) => { const option = document.createElement('option'); option.value = value; option.textContent = data.label; selector.append(option); });
selector.value = persona;
const describe = () => { document.querySelector('#demoDescription').textContent = personas[selector.value].description; };
selector.onchange = describe; describe();
document.querySelector('#demoLogin').onclick = () => {
  if (selector.value === persona) { demoLogin(); return; }
  location.href = '/?persona=' + encodeURIComponent(selector.value) + '&autologin=1';
};
document.querySelector('#demoLogout').onclick = demoLogout;
document.querySelector('#demoApprove').onclick = () => {
  approved = true; sessionStorage.setItem('demo-approval:' + persona, 'approved');
  demoAccount.staffApproved = !!selectedPersona.staff;
  demoAccount.representativeApproved = !!selectedPersona.representative;
  demoAccount.representativeApprovedAt = rolloutTime + 60000;
  demoAccount.staffPages = selectedPersona.staff || [];
  demoAccount.staffPageApprovedAt = Object.fromEntries(demoAccount.staffPages.map(page => [page, rolloutTime + 60000]));
  demoAccount.pages = demoPages(demoAccount.mode);
  renderDemoAuth(true); sgcuTourNavigation.navigate('login');
};
// These scenarios represent existing users who have already finished their base tour.
if (specialPersona) {
  const key = selectedPersona.type === 'affairs' ? 'meeting_v1' : 'general_v1';
  const seen = selectedPersona.type === 'affairs' ? ['calendar','room','time','purpose','requests'] : ['financial-docs','project-status','borrow-assets','meeting-room-booking'];
  const storage = 'demo-remote:demo-' + persona;
  const data = JSON.parse(localStorage.getItem(storage) || '{}');
  data.onboardingTours ||= {};
  data.onboardingTours[key] ||= { status:'completed', seen, updatedAt:Date.now() };
  localStorage.setItem(storage, JSON.stringify(data));
}

document.querySelector('#demoReset').onclick = () => {
  const selected = selector.value;
  sessionStorage.removeItem('demo-approval:' + selected);
  localStorage.removeItem('demo-remote:demo-' + selected);
  localStorage.removeItem('sgcu-onboarding:demo-' + selected);
  sessionStorage.removeItem('tour-demo-auth');
  location.href='/?persona='+encodeURIComponent(selected);
};
if (params.get('autologin') === '1') sessionStorage.setItem('tour-demo-auth',persona);
renderDemoAuth(sessionStorage.getItem('tour-demo-auth') === persona);
if (approved) sessionStorage.setItem('demo-approval:' + persona, 'approved');
params.delete('approval'); params.delete('autologin'); params.delete('theme'); history.replaceState(null,'','/?'+params.toString());
sgcuTourNavigation.navigate('login');
`;
export const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
    const file = path.resolve(root, relative);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    let body = await readFile(file);
    const type = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2'}[path.extname(file)] || 'application/octet-stream';
    if (relative === 'index.html') body = body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</head>', previewStyles + '</head>').replace('</body>', `<script src="/js/core/app.config.js"></script><script src="/js/core/app.dialog.js"></script><script>${bootstrap}</script><script src="/js/core/app.tour-policy.js"></script><script src="/js/core/app.onboarding-tour.js"></script></body>`);
    res.writeHead(200, {'Content-Type':type}); res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT || 4187), '127.0.0.1', () => console.log('Tour preview: http://127.0.0.1:4187 (simulated data only)'));
