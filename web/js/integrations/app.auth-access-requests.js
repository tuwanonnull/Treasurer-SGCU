import { setupTemporaryAccessList } from "./app.temporary-access-ui.js";
// This identity is isolated from the main app: verifying an email grants no app access.
export async function readAccessRequestState(api, db, user, read = api.getDocFromServer) {
  if (!user?.email || !user.emailVerified) throw Error('กรุณายืนยันอีเมลของบัญชีก่อน');
  const email = user.email.trim().toLowerCase();
  if (api.isAllowedAuthEmail(email)) return { status: 'allowed', email };
  const access = await read(api.doc(db, 'authEmailAccess', email));
  const record = access.exists() ? access.data() : null;
  if (record && api.isTemporaryAuthAccessActive(record, email)) return { status: 'allowed', email };
  const status = record?.status === 'pending' || record?.status === 'rejected'
    ? record.status : record?.requestedAt ? 'approved' : 'new';
  return { status, email, request: record, record };

}

export async function submitAccessRequest(api, db, user, fields) {
  const clean = {};
  for (const [key, max] of Object.entries({ name: 120, organization: 160, reason: 240 })) {
    clean[key] = String(fields[key] || '').trim();
    if (!clean[key] || clean[key].length > max) throw Error('กรุณากรอกชื่อ หน่วยงาน และเหตุผลให้ครบถ้วนตามความยาวที่กำหนด');
  }
  return api.runTransaction(db, async tx => {
    const state = await readAccessRequestState(api, db, user, ref => tx.get(ref));
    if (state.status !== 'new') return state;
    tx.set(api.doc(db, 'authEmailAccess', state.email), {
      email: state.email, uid: user.uid, name: clean.name, organization: clean.organization,
      requestReason: clean.reason, status: 'pending', active: false,
      requestedAt: api.serverTimestamp(), updatedAt: api.serverTimestamp(),
      ...(!state.record ? { createdAt: api.serverTimestamp() } : {})
    }, { merge: true });
    return { status: 'pending', email: state.email };
  });
}

export function setupAccessRequests(api, applicantAuth, applicantDb, mainAuth, mainDb) {
  setupTemporaryAccessList();
  const byId = id => document.getElementById(id);
  const check = byId('authAccessCheck'), retry = byId('authAccessRetry');
  const form = byId('authAccessRequestForm'), status = byId('authAccessStatus'), login = byId('authAccessLogin');
  const fields = byId('authAccessFields'), identity = byId('authAccessIdentity');
  const modal = byId('authAccessModal'), opener = byId('authAccessOpen'), closer = byId('authAccessClose');
  if (!check || !form || !modal || !opener) return;
  let busy = false;
  let canSubmit = false;
  let mainSignedIn = !!mainAuth.currentUser;
  let applicantGeneration = 0;
  const selfService = byId('authAccessSelfService');
  const closeModal = () => {
    if (typeof closeDialog === 'function') closeDialog(modal);
    else {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      opener.focus();
    }
  };
  opener.addEventListener('click', () => {
    if (mainSignedIn) return;
    if (typeof openDialog === 'function') openDialog(modal, { focusSelector: '#authAccessCheck' });
    else {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      check.focus();
    }
  });
  closer.addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); }
  });
  api.onAuthStateChanged(mainAuth, user => {
    mainSignedIn = !!user;
    applicantGeneration++;
    canSubmit = false;
    if (selfService) selfService.hidden = mainSignedIn;
    fields.hidden = identity.hidden = false;
    login.hidden = retry.hidden = true;
    form.querySelector('button[type="submit"]').disabled = true;
    status.textContent = '';
    check.textContent = 'ยืนยันบัญชี Google';
    form.reset();
    if (mainSignedIn) {
      if (modal.classList.contains('show')) closeModal();
      void api.signOut(applicantAuth).catch(() => {});
    }
  });
  const render = state => {
    canSubmit = state.status === 'new';
    fields.hidden = state.status !== 'new';
    login.hidden = state.status !== 'allowed';
    retry.hidden = !['pending', 'approved', 'rejected'].includes(state.status);
    const messages = {
      allowed: 'บัญชีนี้มีสิทธิ์เข้าใช้งานแล้ว',
      new: '',
      pending: 'คำร้องอยู่ระหว่างรออนุมัติ',
      approved: 'คำร้องได้รับอนุมัติแล้ว แต่สิทธิ์ยังไม่เริ่ม หมดอายุ หรือถูกปิด กรุณาติดต่อฝ่ายเหรัญญิก',
      rejected: `คำร้องถูกปฏิเสธ: ${state.request?.reviewReason || 'กรุณาติดต่อฝ่ายเหรัญญิก'}`
    };
    status.textContent = messages[state.status] ?? 'กรุณาติดต่อฝ่ายเหรัญญิกเพื่อตรวจสอบสถานะ';
  };
  const perform = async (action, loadingMessage) => {
    if (busy || mainSignedIn) return;
    const version = applicantGeneration;
    busy = true;
    check.disabled = retry.disabled = true;
    form.querySelector('button[type="submit"]').disabled = true;
    // Keep the draft visible and intact when a request fails.
    form.querySelectorAll('input:not([readonly]), textarea').forEach(input => { input.disabled = true; });
    login.hidden = true;
    status.textContent = loadingMessage;
    try {
      const state = await action();
      if (version === applicantGeneration && !mainSignedIn) render(state);
    } catch (error) {
      if (version === applicantGeneration && !mainSignedIn) {
        retry.hidden = !applicantAuth.currentUser?.emailVerified;
        status.textContent = error.code === 'auth/popup-closed-by-user'
          ? 'ยกเลิกการยืนยันบัญชีแล้ว'
          : error.code === 'permission-denied'
            ? 'ระบบยังไม่อนุญาตให้ตรวจสอบหรือส่งคำร้อง กรุณาติดต่อฝ่ายเหรัญญิก'
            : `ตรวจสอบหรือบันทึกไม่สำเร็จ กรุณาลองอีกครั้ง (${error.message || error.code})`;
      }
    } finally {
      busy = false;
      check.disabled = retry.disabled = false;
      form.querySelector('button[type="submit"]').disabled = mainSignedIn || !canSubmit || !applicantAuth.currentUser?.emailVerified;
      form.querySelectorAll('input:not([readonly]), textarea').forEach(input => { input.disabled = false; });
      if (mainSignedIn) void api.signOut(applicantAuth).catch(() => {});
    }
  };
  check.addEventListener('click', () => perform(async () => {
    const previousEmail = applicantAuth.currentUser?.email?.toLowerCase();
    const provider = new api.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const { user } = await api.signInWithPopup(applicantAuth, provider);
    if (!user.email || !user.emailVerified) throw Error('กรุณายืนยันอีเมลของบัญชี Google ก่อน');
    if (mainSignedIn) return { status: 'new', email: user.email };
    const changedAccount = previousEmail && previousEmail !== user.email.toLowerCase();
    if (changedAccount) form.reset();
    if (changedAccount || !byId('authAccessName').value.trim()) {
      byId('authAccessName').value = user.displayName || '';
    }
    byId('authAccessEmail').value = user.email.toLowerCase();
    identity.hidden = false;
    check.textContent = 'เปลี่ยนบัญชี';
    canSubmit = false;
    fields.hidden = false;
    status.textContent = 'กำลังตรวจสอบสิทธิ์อีเมล...';
    return readAccessRequestState(api, applicantDb, user);
  }, 'กำลังยืนยันบัญชี Google...'));
  retry.addEventListener('click', () => perform(
    () => readAccessRequestState(api, applicantDb, applicantAuth.currentUser), 'กำลังตรวจสอบสถานะคำร้อง...'
  ));
  login.addEventListener('click', () => perform(async () => {
    const user = applicantAuth.currentUser;
    const version = applicantGeneration;
    if (!user?.emailVerified) throw Error('กรุณายืนยันบัญชี Google อีกครั้ง');
    const state = await readAccessRequestState(api, applicantDb, user);
    if (state.status !== 'allowed') return state;
    if (version !== applicantGeneration || mainSignedIn || applicantAuth.currentUser !== user) {
      throw Error('บัญชีมีการเปลี่ยนแปลง กรุณาตรวจสอบอีกครั้ง');
    }
    // Transfer the verified Firebase session; normal main-auth observers still
    // validate access and load the profile, without opening another Google popup.
    await api.updateCurrentUser(mainAuth, user);
    closeModal();
    return state;
  }, 'กำลังตรวจสอบสิทธิ์และเข้าสู่ระบบ...'));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (fields.hidden || !canSubmit || !applicantAuth.currentUser?.emailVerified || !form.reportValidity()) return;
    const draft = {
      name: byId('authAccessName').value, organization: byId('authAccessOrganization').value, reason: byId('authAccessReason').value
    };
    void perform(() => submitAccessRequest(api, applicantDb, applicantAuth.currentUser, draft), 'กำลังตรวจสอบสิทธิ์และส่งคำร้อง...');
  });

}
