/* Each department has one immutable ballot per poll; Firestore rules enforce ownership. */
(() => {
  // Participation rules deployed and verified on 2026-11-11.
  const liveProgressEnabled = true;
  const api = () => {
    if (!window.sgcuFirestore || !window.sgcuAuth?.auth.currentUser) throw Error('กรุณาเข้าสู่ระบบก่อนลงคะแนน');
    return window.sgcuFirestore;
  };
  window.sgcuBudgetBallots = {
    async createMeeting(title) {
      const f = api(), ref = f.doc(f.collection(f.db, 'budgetMeetings'));
      await f.setDoc(ref, {ownerUid: window.sgcuAuth.auth.currentUser.uid, title, status:'active', currentPollId:'', createdAt:f.serverTimestamp()});
      return ref.id;
    },
    meetingUrl(id) { return new URL(`budget-meeting-vote.html?meeting=${encodeURIComponent(id)}${window.sgcuMeetingEmulator ? '&meetingEmulator=1' : ''}`, location.href).href; },
    async finishMeeting(id) {
      if (!id) return;
      const f = api(), ref = f.doc(f.db, 'budgetMeetings', id);
      await f.runTransaction(f.db, async tx => {
        const meeting = (await tx.get(ref)).data();
        if (!meeting || meeting.ownerUid !== window.sgcuAuth.auth.currentUser.uid) throw Error('เฉพาะประธานเจ้าของการประชุมเท่านั้น');
        if (meeting.status === 'closed') return;
        if (meeting.currentPollId) throw Error('กรุณาปิดรอบรับข้อมูลก่อนจบการประชุม');
        tx.update(ref, {status:'closed'});
      });
    },
    async open({ title, kind, options, voters, summary, rankCount, meetingId }) {
      const f = api();
      if (!voters.length) throw Error('ไม่มีฝ่ายที่มีสิทธิ์ลงคะแนน');
      const emails = new Set(), codes = new Set();
      for (const voter of voters) {
        if (!/^SGCU-\d{2}\.00$/.test(voter.code) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(voter.email)) throw Error('กรุณาระบุอีเมลผู้แทนทุกฝ่ายที่มีสิทธิ์');
        if (emails.has(voter.email) || codes.has(voter.code)) throw Error('บัญชีผู้แทนหนึ่งบัญชีใช้ได้เพียงฝ่ายเดียว');
        emails.add(voter.email); codes.add(voter.code);
      }
      const ref = f.doc(f.collection(f.db, 'budgetMeetingPolls'));
      if (rankCount !== undefined && (!Number.isInteger(rankCount) || rankCount < 1 || rankCount > options.length)) throw Error('จำนวนอันดับไม่ถูกต้อง');
      await f.setDoc(ref, { ownerUid: window.sgcuAuth.auth.currentUser.uid, status: 'draft', ...(liveProgressEnabled ? { progressVersion: 1 } : {}), ...(meetingId ? {meetingId} : {}), title, kind, summary, options, optionIds: options.map(o => o.id), voterCount: voters.length, ...(rankCount === undefined ? {} : { rankCount }), createdAt: f.serverTimestamp() });
      const batch = f.writeBatch(f.db);
      voters.forEach(v => batch.set(f.doc(ref, 'voters', v.code), { email: v.email, name: v.name, ...(kind === 'withdrawal' ? { allowedOptionIds: v.allowedOptionIds || [] } : {}) }));
      await batch.commit();
      if (meetingId) {
        const meetingRef = f.doc(f.db, 'budgetMeetings', meetingId);
        await f.runTransaction(f.db, async tx => {
          const meeting = (await tx.get(meetingRef)).data();
          if (!meeting || meeting.status !== 'active' || meeting.currentPollId) throw Error('การประชุมยังมีรอบเปิดอยู่ หรือสิ้นสุดแล้ว');
          tx.update(ref, {status:'open'});
          tx.update(meetingRef, {currentPollId:ref.id});
        });
      } else await f.updateDoc(ref, { status: 'open' });
      return ref.id;
    },
    url(id) { return new URL(`budget-meeting-vote.html?poll=${encodeURIComponent(id)}${window.sgcuMeetingEmulator ? '&meetingEmulator=1' : ''}`, location.href).href; },
    watchProgress(id, update, fail) {
      if (!liveProgressEnabled) { update(null); return () => {}; }
      const f = api(), ref = f.doc(f.db, 'budgetMeetingPolls', id);
      let stopReceipts = null;
      const stopPoll = f.onSnapshot(ref, snap => {
        const poll = snap.data();
        if (!poll || poll.progressVersion !== 1) { update(null); return; }
        if (!stopReceipts) stopReceipts = f.onSnapshot(f.collection(ref, 'participation'), receipts => {
          update({ count: receipts.size, total: poll.voterCount, cached: receipts.metadata?.fromCache === true });
        }, fail);
      }, fail);
      return () => { stopPoll(); stopReceipts?.(); };
    },
    async close(id, withDepartments = false) {
      const f = api(), ref = f.doc(f.db, 'budgetMeetingPolls', id);
      await f.runTransaction(f.db, async tx => {
        const poll = (await tx.get(ref)).data();
        if (!poll || poll.ownerUid !== window.sgcuAuth.auth.currentUser.uid) throw Error('เฉพาะประธานผู้เปิดลงคะแนนเท่านั้น');
        const meetingRef = poll.meetingId ? f.doc(f.db, 'budgetMeetings', poll.meetingId) : null;
        const meeting = meetingRef ? (await tx.get(meetingRef)).data() : null;
        if (poll.status === 'open') tx.update(ref, { status: 'closed', closedAt: f.serverTimestamp() });
        else if (poll.status !== 'closed') throw Error('รอบลงคะแนนยังไม่เปิด');
        if (meeting?.currentPollId === id) tx.update(meetingRef, {currentPollId:''});
      });
      // Read only after closure, so no late ballots can race the final tally.
      const ballots = await f.getDocs(f.collection(ref, 'ballots'));
      return ballots.docs.map(d => withDepartments ? { code: d.id, choices: d.data().choices } : d.data().choices);
    },
    async vote(id, code, choices) {
      const f = api();
      if (!liveProgressEnabled) {
        await f.setDoc(f.doc(f.db, 'budgetMeetingPolls', id, 'ballots', code), {
          uid: window.sgcuAuth.auth.currentUser.uid, choices, createdAt: f.serverTimestamp()
        });
        return;
      }
      const ref = f.doc(f.db, 'budgetMeetingPolls', id);
      const batch = f.writeBatch(f.db);
      batch.set(f.doc(ref, 'ballots', code), {
        uid: window.sgcuAuth.auth.currentUser.uid, choices, createdAt: f.serverTimestamp()
      });
      batch.set(f.doc(ref, 'participation', code), { createdAt: f.serverTimestamp() });
      await batch.commit();
    }
  };
})();
