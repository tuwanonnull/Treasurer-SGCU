import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, setPersistence, inMemoryPersistence, signInWithPopup, GoogleAuthProvider, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// Public web configuration from the existing staff app; no Admin credentials here.
const auth = getAuth(initializeApp({ apiKey: 'AIzaSyDcRIz1Uy1AZd-9JJdLF92SyqU6m8bdSXo', authDomain: 'departmentwebsite-5aec1.firebaseapp.com', projectId: 'departmentwebsite-5aec1' }));
const $ = id => document.getElementById(id);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account', login_hint: '6534324223@student.chula.ac.th' });
const persistenceReady = setPersistence(auth, inMemoryPersistence);
$('submit').disabled = true;
persistenceReady.then(() => { $('submit').disabled = false; }).catch(() => { $('status').textContent = 'เตรียมระบบเข้าสู่ระบบไม่สำเร็จ กรุณาโหลดหน้าใหม่'; });
let generation = 0;
async function check() {
  const current = ++generation;
  $('candidate').hidden = true; $('candidate-result').replaceChildren();
  $('status').textContent = 'กำลังตรวจบัญชีและสิทธิ์…';
  try {
    const token = await auth.currentUser.getIdToken(true);
    const response = await fetch('/api/readiness', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (current === generation) { $('status').textContent = data.message; $('candidate').hidden = false; }
  } catch (error) { if (current === generation) $('status').textContent = error.message || 'ตรวจบัญชีไม่สำเร็จ'; }
}
$('login').onsubmit = async event => {
  event.preventDefault(); $('submit').disabled = true;
  try {
    await signInWithPopup(auth, provider);
    $('login').hidden = true; $('logout').hidden = false; $('refresh').hidden = false;
    await check();
  } catch (error) {
    const messages = {
      'auth/popup-blocked': 'เบราว์เซอร์ปิดกั้นหน้าต่าง Google กรุณาอนุญาตป๊อปอัปแล้วลองอีกครั้ง',
      'auth/popup-closed-by-user': 'ปิดหน้าต่าง Google แล้ว กดเข้าสู่ระบบเพื่อลองใหม่ได้',
      'auth/cancelled-popup-request': 'มีคำขอเข้าสู่ระบบอื่นอยู่ กรุณาลองอีกครั้ง',
      'auth/unauthorized-domain': 'Firebase ยังไม่อนุญาตโดเมนหน้านี้ กรุณาแจ้งผู้ดูแลพร้อม URL ที่เปิด',
      'auth/network-request-failed': 'เชื่อมต่อ Google หรือ Firebase ไม่สำเร็จ กรุณาลองใหม่'
    };
    $('status').textContent = messages[error.code] || 'เข้าสู่ระบบ Google ไม่สำเร็จ กรุณาลองใหม่';
  }
  finally { $('submit').disabled = false; }
};
$('refresh').onclick = check;
$('logout').onclick = async () => {
  ++generation; $('status').textContent = '';
  $('candidate').hidden = true; $('candidate-result').replaceChildren();
  await signOut(auth); $('login').hidden = false; $('logout').hidden = true; $('refresh').hidden = true;
};

$('candidate-load').onclick = async () => {
  const current = generation;
  const result = $('candidate-result');
  result.textContent = 'กำลังตรวจต้นฉบับและยอด…'; $('candidate-load').disabled = true;
  try {
    const token = await auth.currentUser.getIdToken(true);
    const response = await fetch('/api/candidate', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (current !== generation) return;
    result.replaceChildren();
    const description = document.createElement('p');
    description.textContent = `ข้อมูลจากต้นฉบับ ${data.projectCount} โครงการ · ${data.baselineAccepted ? 'ยืนยันใช้เป็นข้อมูลตั้งต้นแล้ว' : 'รอตรวจยอดตั้งต้น'} · ยังไม่เปิดใช้งาน · ไม่รวมยอดทดลอง`;
    result.append(description);
    const list = document.createElement('dl');
    for (const [column, satang] of Object.entries(data.totals)) {
      const label = document.createElement('dt'), amount = document.createElement('dd');
      label.textContent = `${data.moneyLabels[column] || column} (${column})`;
      const absolute = BigInt(satang) < 0n ? -BigInt(satang) : BigInt(satang);
      amount.textContent = `${satang < 0 ? '-' : ''}${(absolute / 100n).toLocaleString('th-TH')}.${String(absolute % 100n).padStart(2, '0')} บาท`;
      list.append(label, amount);
    }
    const note = document.createElement('p');
    note.textContent = 'ตรวจสูตรตรงกับต้นฉบับแล้ว แต่ยังไม่ได้ตรวจความสดใหม่ของข้อมูลจากแหล่งภายนอก';
    result.append(list, note);
  } catch (error) { if (current === generation) result.textContent = error.message || 'ตรวจข้อมูลตั้งต้นไม่สำเร็จ'; }
  finally { $('candidate-load').disabled = false; }
};
