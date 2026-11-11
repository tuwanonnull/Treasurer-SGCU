import '../../integrations/app.firebase-bootstrap.js';
import './app.budget-meeting-live.js';
import './app.budget-meeting-ranking-ui.js';

const f = window.sgcuFirestore, a = window.sgcuAuth;
const content = document.getElementById('ballot-content');
const account = document.getElementById('ballot-account');
const error = document.getElementById('ballot-error');
const params = new URLSearchParams(location.search);
const meetingId = params.get('meeting');
const legacyPollId = params.get('poll');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stateView = (title, description = '', success = false) => `<div class="bm-ballot-state${success ? ' is-success' : ''}" ${success ? 'role="status"' : ''}><span class="bm-ballot-state-icon" aria-hidden="true">${success ? '✓' : '—'}</span><h2>${esc(title)}</h2>${description ? `<p class="bm-muted">${esc(description)}</p>` : ''}</div>`;
function ballotDetails(poll) {
  const lines = String(poll.summary || '').split('\n').map(line => line.trim()).filter(Boolean);
  if (!lines.length) return '';
  const budgets = lines.map(line => line.match(/^(.+):\s*([\d,]+\.\d{2})\s*บาท$/));
  if (poll.kind === 'satisfaction' && budgets.every(Boolean)) {
    return `<section class="bm-ballot-details" aria-label="รายละเอียดประกอบการลงคะแนน"><div class="bm-ballot-detail-heading"><h3>งบประมาณรายฝ่าย</h3><span>บาท</span></div><dl class="bm-ballot-budget-list">${budgets.map(row => `<div><dt>${esc(row[1])}</dt><dd>${esc(row[2])}</dd></div>`).join('')}</dl></section>`;
  }
  const title = poll.kind === 'reduction' ? 'ข้อมูลประกอบการลดงบ' : poll.kind === 'nomination' ? 'การจัดอันดับ' : ['withdrawal', 'recipient'].includes(poll.kind) ? 'รายละเอียดประกอบการส่งข้อมูล' : 'รายละเอียดประกอบการลงคะแนน';
  return `<section class="bm-ballot-details" aria-label="รายละเอียดประกอบการลงคะแนน"><h3>${title}</h3><div class="bm-ballot-summary">${lines.map(line => {
    const amount = line.match(/^งบล่าสุด\s+([\d,]+\.\d{2})\s*บาท$/);
    if (amount) return `<div class="bm-ballot-current-budget"><span>งบล่าสุด</span><strong>${esc(amount[1])} <small>บาท</small></strong></div>`;
    return `<p>${esc(line)}</p>`;
  }).join('')}</div></section>`;
}
let stops = [], generation = 0;
const fail = e => { error.textContent = e.code === 'permission-denied' ? 'ไม่มีสิทธิ์ลงคะแนน รอบอาจปิดแล้ว หรือฝ่ายนี้ส่งคะแนนแล้ว' : e.message; };
a.onAuthStateChanged(a.auth, async user => {
  const current = ++generation;
  stops.forEach(stop => stop()); stops = [];
  error.textContent = '';
  account.replaceChildren();
  if (!user) {
    if (a.meetingEmulator) {
      content.innerHTML = '<form id="emulator-login"><h2>บัญชีทดสอบใน Emulator</h2><label>อีเมล<input type="email" name="email" required></label><label>รหัสผ่าน<input type="password" name="password" required></label><button>เข้าสู่ระบบทดสอบ</button></form>';
      document.getElementById('emulator-login').onsubmit = async event => {
        event.preventDefault();
        const data = new FormData(event.target);
        try { await a.signInWithEmailAndPassword(a.auth, data.get('email'), data.get('password')); } catch (e) { fail(e); }
      };
      return;
    }
    content.innerHTML = `${stateView('เข้าสู่ระบบเพื่อลงคะแนน', 'เลือกบัญชี Google ที่ประธานระบุเป็นผู้แทนฝ่ายของคุณ')}<div class="bm-ballot-login"><button id="ballot-login" class="bm-primary">เข้าสู่ระบบด้วย Google</button></div>`;
    document.getElementById('ballot-login').onclick = async () => {
      try { await a.signInWithPopup(a.auth, new a.GoogleAuthProvider()); } catch (e) { fail(e); }
    };
    return;
  }
  account.innerHTML = `<div class="bm-voter-account"><div><span class="bm-section-label">บัญชีที่ใช้ลงคะแนน</span><strong>${esc(user.email)}</strong></div><button id="ballot-logout">ออกจากระบบ</button></div>`;
  document.getElementById('ballot-logout').onclick = () => a.signOut(a.auth).catch(fail);
  content.innerHTML = stateView('กำลังตรวจสอบสิทธิ์', 'กำลังโหลดข้อมูลรอบลงคะแนน');
  let roundSequence = 0, roundStops = [], activeId = null;
  const stopRound = () => { roundSequence++; roundStops.forEach(stop => stop()); roundStops = []; };
  stops.push(stopRound);
  const loadPoll = async id => {
    stopRound();
    const sequence = roundSequence;
    const isCurrent = () => current === generation && sequence === roundSequence;
    error.textContent = '';
    content.innerHTML = stateView('กำลังโหลดขั้นตอนปัจจุบัน', 'กรุณารอสักครู่');
  if (!id || !/^[A-Za-z0-9]{20}$/.test(id)) { content.innerHTML = stateView('ไม่พบรอบลงคะแนน', 'กรุณาเปิดลิงก์ลงคะแนนที่ได้รับจากประธาน'); return; }
  try {
    const ref = f.doc(f.db, 'budgetMeetingPolls', id);
    const roster = await f.getDocs(f.query(f.collection(ref, 'voters'), f.where('email', '==', user.email.toLowerCase())));
    if (!isCurrent()) return;
    if (roster.size !== 1) { content.innerHTML = stateView('บัญชีนี้ไม่มีสิทธิ์ในรอบนี้', meetingId ? 'ฝ่ายของคุณอาจไม่มีสิทธิ์ในขั้นตอนนี้ สามารถเปิดหน้านี้รอขั้นตอนถัดไปได้ หรือตรวจสอบบัญชีกับประธาน' : 'ตรวจสอบว่าใช้บัญชีผู้แทนฝ่ายที่ประธานระบุ หรือออกจากระบบเพื่อเปลี่ยนบัญชี'); return; }
    const member = roster.docs[0];
    let poll, submitted = null;
    const render = () => {
      if (!isCurrent() || !poll || submitted === null) return;
      const submission = ['withdrawal', 'recipient'].includes(poll.kind);
      document.querySelector('.bm-voter-heading > .bm-muted').textContent = submission ? 'ส่งข้อมูลในนามฝ่ายของคุณ · ประธานตรวจและยืนยันก่อนดำเนินการ' : 'ใช้บัญชีผู้แทนฝ่ายที่ได้รับสิทธิ์ · 1 ฝ่าย 1 เสียง';
      document.querySelector('.bm-voter-heading h1').textContent = submission ? 'ส่งข้อมูลการประชุมงบประมาณ' : 'ลงคะแนนประชุมงบประมาณ';
      content.innerHTML = `<div class="bm-ballot-heading"><span class="bm-tag">${submitted ? submission ? 'ส่งข้อมูลแล้ว' : 'ลงคะแนนแล้ว' : poll.status === 'open' ? submission ? 'เปิดรับข้อมูล' : 'เปิดรับคะแนน' : poll.status === 'draft' ? 'รอเปิดรอบ' : submission ? 'ปิดรับข้อมูล' : 'ปิดรับคะแนน'}</span><h2>${esc(poll.title)}</h2><p class="bm-muted">${esc(member.data().name)}${submission ? '' : ' · 1 เสียง'}</p></div>${ballotDetails(poll)}`;
      if (submitted) { content.insertAdjacentHTML('beforeend', stateView(submission ? 'ส่งข้อมูลแล้ว' : 'บันทึกคะแนนแล้ว', submission ? 'ประธานจะตรวจและยืนยันรายการก่อนดำเนินการต่อ' : 'ระบบได้รับคะแนนของฝ่ายคุณแล้ว ไม่ต้องส่งซ้ำ กรุณารอประธานประกาศผล', true)); return; }
      if (poll.status !== 'open') { content.insertAdjacentHTML('beforeend', stateView(poll.status === 'draft' ? 'รอประธานเปิดรอบ' : submission ? 'ปิดรับข้อมูลแล้ว' : 'ปิดรับคะแนนแล้ว', poll.status === 'draft' ? 'หน้านี้จะพร้อมใช้งานเมื่อประธานเปิดรอบ' : 'ไม่สามารถส่งข้อมูลเพิ่มเติมในรอบนี้ได้')); return; }
      const multiple = ['nomination', 'withdrawal'].includes(poll.kind);
      const options = poll.kind === 'withdrawal' ? poll.options.filter(o => (member.data().allowedOptionIds || []).includes(o.id)) : poll.options;
      const ranked = poll.kind === 'nomination' && Number.isInteger(poll.rankCount);
      content.insertAdjacentHTML('beforeend', `<form id="ballot-form">${ranked ? '' : `<h3 class="bm-ballot-question">${poll.kind === 'withdrawal' ? 'เลือกโครงการของฝ่ายที่ต้องการยกเลิก' : poll.kind === 'recipient' ? 'ฝ่ายของคุณต้องการเสนอตัวรับงบหรือไม่' : multiple ? 'เลือกโครงการที่ต้องการเสนอ' : 'เลือกคำตอบของฝ่ายคุณ'}</h3>`}<div class="bm-choice-list bm-ballot-options">${options.map(o => `<label><input type="${multiple ? 'checkbox' : 'radio'}" name="choice" value="${esc(o.id)}" ${multiple ? '' : 'required'}><span>${esc(o.label)}</span></label>`).join('')}</div><div class="bm-ballot-footer"><p class="bm-muted">${submission ? 'ส่งข้อมูลได้ครั้งเดียว · ประธานจะตรวจและยืนยันก่อนดำเนินการ' : 'ส่งคะแนนได้ครั้งเดียวและแก้ไขไม่ได้<br>คะแนนผูกกับบัญชี ประธานตรวจสอบบัตรได้หลังปิดรอบ'}${poll.kind === 'withdrawal' ? '<br>หากไม่ยกเลิกโครงการ ให้ส่งโดยไม่เลือกรายการ' : ''}</p><button type="submit" class="bm-primary">${submission ? 'ยืนยันส่งข้อมูล' : 'ยืนยันลงคะแนน'}</button></div></form>`);
      document.getElementById('ballot-form').onsubmit = async event => {
        event.preventDefault(); if (!isCurrent()) return; error.textContent = '';
        const values = new FormData(event.target).getAll('choice');
        const choices = values.filter(value => value !== '');
        if (poll.kind === 'nomination' && (choices.length > (poll.rankCount || 10) || new Set(choices).size !== choices.length || (ranked && values.slice(0, choices.length).includes('')))) { error.textContent = 'กรุณาเรียงอันดับต่อเนื่องและไม่เลือกโครงการซ้ำ'; return; }
        if (poll.kind === 'withdrawal' && choices.some(id => !options.some(o => o.id === id))) { error.textContent = 'เลือกได้เฉพาะโครงการของฝ่ายตัวเอง'; return; }
        const button = event.target.querySelector('button[type="submit"]'); button.disabled = true;
        try { await window.sgcuBudgetBallots.vote(id, member.id, choices); }
        catch (e) { if (isCurrent()) { fail(e); button.disabled = false; } }
      };
      if (ranked) document.querySelector('#ballot-form .bm-choice-list').outerHTML = window.sgcuRankingUI.render(poll.rankCount, poll.options, 'choice');
    };
    roundStops.push(f.onSnapshot(ref, snap => { if (!isCurrent()) return; poll = snap.data(); if (!poll) content.innerHTML = stateView('ไม่พบรอบลงคะแนน', 'กรุณาตรวจสอบลิงก์กับประธาน'); else render(); }, e => { if (isCurrent()) fail(e); }));
    roundStops.push(f.onSnapshot(f.doc(ref, 'ballots', member.id), snap => { if (!isCurrent()) return; submitted = snap.exists(); render(); }, e => { if (isCurrent()) fail(e); }));
  } catch (e) { if (isCurrent()) fail(e); }
  };
  if (meetingId) {
    if (!/^[A-Za-z0-9]{20}$/.test(meetingId)) { content.innerHTML = stateView('ลิงก์การประชุมไม่ถูกต้อง', 'กรุณาขอลิงก์จากประธานอีกครั้ง'); return; }
    stops.push(f.onSnapshot(f.doc(f.db, 'budgetMeetings', meetingId), snap => {
      if (current !== generation) return;
      const meeting = snap.data();
      const nextId = meeting?.status === 'active' ? meeting.currentPollId || '' : '';
      if (nextId && nextId === activeId) return;
      activeId = nextId;
      if (nextId) { void loadPoll(nextId); return; }
      stopRound(); error.textContent = '';
      document.querySelector('.bm-voter-heading h1').textContent = 'ร่วมประชุมงบประมาณ';
      document.querySelector('.bm-voter-heading > .bm-muted').textContent = meeting?.title || 'ลิงก์ประจำการประชุม';
      content.innerHTML = !meeting ? stateView('ไม่พบการประชุม', 'กรุณาตรวจสอบลิงก์กับประธาน') : meeting.status === 'closed' ? stateView('สิ้นสุดการประชุมแล้ว', 'ขอบคุณที่เข้าร่วมการประชุม', true) : stateView('รอประธานเปิดขั้นตอนถัดไป', 'เปิดหน้านี้ไว้ได้ ระบบจะเปลี่ยนให้อัตโนมัติ ไม่ต้องใช้ลิงก์ใหม่');
    }, e => { if (current === generation) { stopRound(); fail(e); } }));
  } else await loadPoll(legacyPollId);
});
