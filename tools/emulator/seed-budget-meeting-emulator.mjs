const accounts = [
  { email: 'tuwanon.kimchiang@gmail.com', displayName: 'ประธานประชุมทดสอบ' },
  { email: 'chair01@chula.ac.th', displayName: 'ประธานฝ่าย 01 ทดสอบ' },
  { email: 'member01@chula.ac.th', displayName: 'สมาชิกฝ่าย 01 ทดสอบ' },
  { email: 'chair02@chula.ac.th', displayName: 'ประธานฝ่าย 02 ทดสอบ' },
  { email: 'outsider@chula.ac.th', displayName: 'บัญชีนอกฝ่ายทดสอบ' }
];
for (const account of accounts) {
  const response = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-budget-meeting', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...account, password: 'Meeting-test-123!', returnSecureToken: true })
  });
  const result = await response.json();
  if (!response.ok && result.error?.message !== 'EMAIL_EXISTS') throw Error(JSON.stringify(result));
}
console.log('Created local-only emulator accounts. Password: Meeting-test-123!');
console.log(accounts.map(a => `${a.displayName}: ${a.email}`).join('\n'));
