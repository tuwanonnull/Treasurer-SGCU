import assert from 'node:assert/strict';

// This test deliberately supports only the local demo emulator.
const base = 'http://127.0.0.1:8089/v1/projects/demo-budget-meeting/databases/(default)/documents';
const root = 'projects/demo-budget-meeting/databases/(default)/documents';
const token = (uid, email) => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: uid, user_id: uid, email, email_verified: true, aud: 'demo-budget-meeting', iss: 'https://securetoken.google.com/demo-budget-meeting', iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: 'password', identities: {} } })}.`;
};
const chair = token('chair', 'tuwanon.kimchiang@gmail.com');
const alice = token('alice', 'alice@chula.ac.th');
const bob = token('bob', 'bob@chula.ac.th');
function value(v) {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: fields(v) } };
}
const fields = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, value(v)]));
async function write(path, data, auth, timestamp, merge = false) {
  const update = { name: `${root}/${path}`, fields: fields(data) };
  const w = { update, ...(merge ? { updateMask: { fieldPaths: Object.keys(data) } } : {}) };
  if (timestamp) w.updateTransforms = [{ fieldPath: timestamp, setToServerValue: 'REQUEST_TIME' }];
  const response = await fetch(`${base}:commit`, { method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: [w] }) });
  return { status: response.status, body: await response.text() };
}
const expect = (result, status) => assert.equal(result.status, status, result.body);
const id = `rules-${Date.now()}`, path = `budgetMeetingPolls/${id}`;
const poll = { ownerUid: 'chair', status: 'draft', title: 'Test', kind: 'satisfaction', summary: 'Department budgets', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }], optionIds: ['yes', 'no'], voterCount: 2 };
expect(await write(path, poll, alice, 'createdAt'), 403);
expect(await write(path, poll, chair, 'createdAt'), 200);
expect(await write(`${path}/voters/SGCU-01.00`, { email: 'alice@chula.ac.th', name: 'A' }, chair), 200);
expect(await write(`${path}/voters/SGCU-02.00`, { email: 'bob@chula.ac.th', name: 'B' }, chair), 200);
const ballot = { uid: 'alice', choices: ['yes'] };
expect(await write(`${path}/ballots/SGCU-01.00`, ballot, alice, 'createdAt'), 403);
expect(await write(path, { status: 'open' }, chair, null, true), 200);
expect(await write(`${path}/voters/SGCU-03.00`, { email: 'alice@chula.ac.th', name: 'C' }, chair), 403);
expect(await write(`${path}/ballots/SGCU-02.00`, ballot, alice, 'createdAt'), 403);
expect(await write(`${path}/ballots/SGCU-01.00`, { ...ballot, uid: 'bob' }, alice, 'createdAt'), 403);
expect(await write(`${path}/ballots/SGCU-01.00`, { ...ballot, choices: ['other'] }, alice, 'createdAt'), 403);
expect(await write(`${path}/ballots/SGCU-01.00`, { ...ballot, choices: ['yes', 'no'] }, alice, 'createdAt'), 403);
expect(await write(`${path}/ballots/SGCU-01.00`, ballot, alice, 'createdAt'), 200);
expect(await write(`${path}/ballots/SGCU-01.00`, { ...ballot, choices: ['no'] }, alice, 'createdAt'), 403);
const get = async (p, auth) => fetch(`${base}/${p}`, { headers: { Authorization: `Bearer ${auth}` } });
assert.equal((await get(`${path}/ballots/SGCU-01.00`, bob)).status, 403);
assert.equal((await get(`${path}/ballots/SGCU-01.00`, chair)).status, 403);
assert.equal((await get(`${path}/voters/SGCU-01.00`, bob)).status, 403);
const ownRoster = await fetch(`${base}/${path}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${alice}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'voters' }], where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: 'alice@chula.ac.th' } } } } }) });
assert.equal(ownRoster.status, 200, await ownRoster.text());
expect(await write(path, { status: 'closed' }, alice, 'closedAt', true), 403);
expect(await write(path, { status: 'closed' }, chair, 'closedAt', true), 200);
expect(await write(`${path}/ballots/SGCU-02.00`, { uid: 'bob', choices: ['yes'] }, bob, 'createdAt'), 403);
expect(await write(path, { status: 'open' }, chair, null, true), 403);
assert.equal((await get(`${path}/ballots/SGCU-01.00`, chair)).status, 200);
const nomination = `${path}-nomination`;
const ids = Array.from({ length: 11 }, (_, i) => String(i));
expect(await write(nomination, { ...poll, kind: 'nomination', rankCount: 3, options: ids.map(id => ({ id, label: id })), optionIds: ids }, chair, 'createdAt'), 200);
expect(await write(`${nomination}/voters/SGCU-01.00`, { email: 'alice@chula.ac.th', name: 'A' }, chair), 200);
expect(await write(nomination, { status: 'open' }, chair, null, true), 200);
expect(await write(`${nomination}/ballots/SGCU-01.00`, { ...ballot, choices: ids }, alice, 'createdAt'), 403);
expect(await write(`${nomination}/ballots/SGCU-01.00`, { ...ballot, choices: ['0', '0'] }, alice, 'createdAt'), 403);
expect(await write(`${nomination}/ballots/SGCU-01.00`, { ...ballot, choices: ids.slice(0, 4) }, alice, 'createdAt'), 403);
expect(await write(`${nomination}/ballots/SGCU-01.00`, { ...ballot, choices: ['2', '0', '1'] }, alice, 'createdAt'), 200);
const extended = `${path}-extended`;
expect(await write(extended, { ...poll, kind: 'nomination', rankCount: 12, options: ids.map(id => ({id,label:id})), optionIds: ids }, chair, 'createdAt'), 403);
expect(await write(extended, { ...poll, kind: 'nomination', rankCount: 11, options: ids.map(id => ({id,label:id})), optionIds: ids }, chair, 'createdAt'), 200);
expect(await write(`${extended}/voters/SGCU-01.00`, {email:'alice@chula.ac.th',name:'A'}, chair), 200);
expect(await write(extended, {status:'open'}, chair, null, true), 200);
expect(await write(`${extended}/ballots/SGCU-01.00`, {...ballot,choices:ids}, alice, 'createdAt'), 200);
console.log('Passed: chair access, roster freeze, account ownership, duplicate ballot denial, valid choices, closed poll denial, privacy and nomination limits.');

const livePath = `${path}-progress`;
expect(await write(livePath, { ...poll, progressVersion: 1 }, chair, 'createdAt'), 200);
for (const [code, email] of [['01', 'alice'], ['02', 'bob']]) expect(await write(`${livePath}/voters/SGCU-${code}.00`, {email: `${email}@chula.ac.th`, name: email}, chair), 200);
expect(await write(livePath, {status:'open'}, chair, null, true), 200);
expect(await write(`${livePath}/participation/SGCU-01.00`, {}, alice, 'createdAt'), 403);
expect(await write(`${livePath}/ballots/SGCU-01.00`, ballot, alice, 'createdAt'), 403);
async function voteWithReceipt(code, auth, uid, choices = ['yes']) {
  const writes = [
    {update:{name:`${root}/${livePath}/ballots/${code}`,fields:fields({uid,choices})},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]},
    {update:{name:`${root}/${livePath}/participation/${code}`,fields:{}},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]}
  ];
  const result=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:`Bearer ${auth}`,'Content-Type':'application/json'},body:JSON.stringify({writes})});
  return {status:result.status,body:await result.text()};
}
expect(await voteWithReceipt('SGCU-02.00', alice, 'alice'), 403);
expect(await voteWithReceipt('SGCU-01.00', alice, 'alice', ['invalid']), 403);
expect(await voteWithReceipt('SGCU-01.00', alice, 'alice'), 200);
expect(await voteWithReceipt('SGCU-01.00', alice, 'alice'), 403);
const participation = await get(`${livePath}/participation`, chair);
assert.equal(participation.status, 200);
assert.equal((await participation.json()).documents.length, 1);
assert.equal((await get(`${livePath}/participation`, bob)).status, 403);
assert.equal((await get(`${livePath}/ballots/SGCU-01.00`, chair)).status, 403);
expect(await write(`${livePath}/participation/SGCU-01.00`, {}, alice, 'createdAt'), 403);
expect(await write(livePath, {status:'closed'}, chair, 'closedAt', true), 200);
expect(await voteWithReceipt('SGCU-02.00', bob, 'bob'), 403);
console.log('Passed: atomic participation receipts, accurate count, no fabricated/duplicate receipts, ballot privacy and closed-round protection.');

const withdrawal = `${path}-withdrawal`;
expect(await write(withdrawal, {...poll,kind:'withdrawal',options:[{id:'own',label:'Own'},{id:'other',label:'Other'}],optionIds:['own','other']},chair,'createdAt'),200);
expect(await write(`${withdrawal}/voters/SGCU-01.00`,{email:'alice@chula.ac.th',name:'A',allowedOptionIds:['own']},chair),200);
expect(await write(`${withdrawal}/voters/SGCU-02.00`,{email:'bob@chula.ac.th',name:'B',allowedOptionIds:['other']},chair),200);
expect(await write(withdrawal,{status:'open'},chair,null,true),200);
expect(await write(`${withdrawal}/ballots/SGCU-01.00`,{...ballot,choices:['other']},alice,'createdAt'),403);
expect(await write(`${withdrawal}/ballots/SGCU-01.00`,{...ballot,choices:['own']},alice,'createdAt'),200);
expect(await write(`${withdrawal}/ballots/SGCU-02.00`,{uid:'bob',choices:[]},bob,'createdAt'),200);
const recipient = `${path}-recipient`;
expect(await write(recipient,{...poll,kind:'recipient'},chair,'createdAt'),200);
expect(await write(`${recipient}/voters/SGCU-02.00`,{email:'bob@chula.ac.th',name:'B'},chair),200);
expect(await write(recipient,{status:'open'},chair,null,true),200);
expect(await write(`${recipient}/ballots/SGCU-01.00`,ballot,alice,'createdAt'),403);
expect(await write(`${recipient}/ballots/SGCU-02.00`,{uid:'bob',choices:['yes','no']},bob,'createdAt'),403);
expect(await write(`${recipient}/ballots/SGCU-02.00`,{uid:'bob',choices:['yes']},bob,'createdAt'),200);
console.log('Passed: withdrawal restricted to own projects, no-withdrawal submission, and recipient eligibility.');

const meetingId = `meeting-${Date.now()}`, meetingPath=`budgetMeetings/${meetingId}`;
const meeting = {ownerUid:'chair',title:'Meeting',status:'active',currentPollId:''};
expect(await write(meetingPath,meeting,alice,'createdAt'),403);
expect(await write(meetingPath,meeting,chair,'createdAt'),200);
const linked = `${path}-linked`;
expect(await write(linked,{...poll,meetingId},chair,'createdAt'),200);
expect(await write(linked,{status:'open'},chair,null,true),403);
expect(await write(meetingPath,{currentPollId:linked.split('/').pop()},alice,null,true),403);
async function linkedTransition(pollPath, pollStatus, currentPollId) {
 const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:`Bearer ${chair}`,'Content-Type':'application/json'},body:JSON.stringify({writes:[
  {update:{name:`${root}/${pollPath}`,fields:fields({status:pollStatus})},updateMask:{fieldPaths:['status',...(pollStatus==='closed'?['closedAt']:[])]},...(pollStatus==='closed'?{updateTransforms:[{fieldPath:'closedAt',setToServerValue:'REQUEST_TIME'}]}:{})},
  {update:{name:`${root}/${meetingPath}`,fields:fields({currentPollId})},updateMask:{fieldPaths:['currentPollId']}}
 ]})});return {status:response.status,body:await response.text()};
}
expect(await linkedTransition(linked,'open',linked.split('/').pop()),200);
expect(await write(meetingPath,{status:'closed',currentPollId:''},chair,null,true),403);
const otherLinked=`${path}-linked2`;
expect(await write(otherLinked,{...poll,meetingId},chair,'createdAt'),200);
expect(await linkedTransition(otherLinked,'open',otherLinked.split('/').pop()),403);
expect(await linkedTransition(linked,'closed',''),200);
expect(await linkedTransition(otherLinked,'open',otherLinked.split('/').pop()),200);
expect(await linkedTransition(otherLinked,'closed',''),200);
expect(await write(meetingPath,{status:'closed'},chair,null,true),200);
expect(await write(meetingPath,{status:'active'},chair,null,true),403);
console.log('Passed: stable meeting ownership, atomic round publication, no overlapping rounds, waiting state and final closure.');
