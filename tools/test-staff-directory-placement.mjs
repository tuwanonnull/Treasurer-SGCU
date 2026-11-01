import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/features/staff/app.staff-access.js', import.meta.url), 'utf8');
const controls = Object.fromEntries(['TermInput', 'PositionSelect', 'OrderInput', 'PlacementHint', 'Advanced'].map(name => [`orgStructure${name}`, { value: '', textContent: '', open: false }]));
const fields = Object.fromEntries(['id', 'positionCode', 'position', 'studentId', 'firstName', 'status'].map(name => [name, { value: '' }]));
const context = vm.createContext({
  document: { getElementById: id => controls[id] },
  orgStructureFields: fields,
  orgStructureFilters: { term: 'SGCU68' },
  DEFAULT_POSITION_OPTIONS: [{ name: 'เหรัญญิก', divisionCodeYY: '00', levelCodeZZ: '01' }],
  currentPositionCatalog: [{ name: 'ผู้ช่วยฝ่ายทดสอบ', divisionCodeYY: '08', levelCodeZZ: '04' }],
  currentOrgStructureMembers: [
    { id: 'old', positionCode: 'SGCU68.10.00.01-004' },
    { id: 'different-term', positionCode: 'SGCU69.10.00.01-099' }
  ],
  normalizeOrgStructureText: value => String(value || '').trim(),
  normalizeCode2: value => String(value || '').padStart(2, '0'),
  escapeStaffHtml: value => value,
  getAcademicYearCodeXX: () => '69',
  updateOrgStructureStudentMeta() {},
  resolveOrgStructureStudentMeta: () => ({ isComplete: true }),
  buildOrgStructureRow: () => [],
  getOrgStructureTerm: code => code.slice(0, 6)
});
vm.runInContext(source.slice(source.indexOf('  const orgStructurePlacement = {'), source.indexOf('  const resetOrgStructureForm =')), context);
const run = code => vm.runInContext(code, context);
const select = controls.orgStructurePositionSelect;
const term = controls.orgStructureTermInput;
const order = controls.orgStructureOrderInput;
run('syncOrgStructurePlacementFromCode()');
assert.equal(term.value, '68');
select.value = '0';
run('updateOrgStructurePlacementCode(true, true)');
assert.equal(fields.positionCode.value, 'SGCU68.10.00.01-005');
assert.equal(fields.position.value, 'เหรัญญิก');
term.value = '69';
run('updateOrgStructurePlacementCode(true)');
assert.equal(fields.positionCode.value, 'SGCU69.10.00.01-100');
select.value = '1';
run('updateOrgStructurePlacementCode(true, true)');
assert.equal(fields.positionCode.value, 'SGCU69.10.08.04-001');
assert.equal(fields.position.value, 'ผู้ช่วยฝ่ายทดสอบ');
order.value = '2.5';
run('updateOrgStructurePlacementCode()');
assert.equal(fields.positionCode.value, '');

// Opening an existing/custom or legacy record must never rewrite its code/name.
for (const code of ['SGCU67.10.07.06-015', '10.07.06-015', 'SGCU68.10.00.01-000']) {
  fields.positionCode.value = code;
  fields.position.value = 'ตำแหน่งเฉพาะ';
  run('syncOrgStructurePlacementFromCode()');
  assert.equal(fields.positionCode.value, code);
  assert.equal(fields.position.value, 'ตำแหน่งเฉพาะ');
}
assert.equal(order.min, '0');
fields.positionCode.value = '10.07.06-015';
run('syncOrgStructurePlacementFromCode()');
assert.equal(controls.orgStructureAdvanced.open, true);

// Verify the payload validation prevents accidental replacement of another member.
const payloadStart = source.indexOf('  const readOrgStructurePayload =');
const payloadEnd = source.indexOf('\n  };', payloadStart) + '\n  };'.length;
run(source.slice(payloadStart, payloadEnd));
fields.positionCode.value = 'SGCU68.10.00.01-004';
fields.firstName.value = 'ทดสอบ';
assert.throws(() => run('readOrgStructurePayload()'), /ลำดับนี้มีผู้ใช้แล้ว/);
fields.id.value = 'old';
assert.equal(run('readOrgStructurePayload().positionCode'), fields.positionCode.value);
console.log('Staff directory placement: generation, scoped ordering, custom/legacy preservation and duplicate validation passed.');

// Exercise modal lifecycle and draft protection without writing member records.
const firstName = { id: 'firstName', value: '', matches: () => true, focus() {} };
let restoredFocus = false;
let confirmDiscard = false;
let confirmations = 0;
let reducedMotion = true;
let closeTimer;
const animationListeners = new Map();
const editor = {
  open: false,
  classList: { add() {}, remove() {} },
  addEventListener(type, callback) { animationListeners.set(type, callback); },
  removeEventListener(type) { animationListeners.delete(type); },
  showModal() { this.open = true; },
  close() { this.open = false; }
};
const addButton = { setAttribute(key, value) { this[key] = value; } };
const bodyClasses = new Set();
const modalContext = vm.createContext({
  document: {
    getElementById: id => id === 'orgStructureEditor' ? editor : addButton,
    activeElement: { isConnected: true, focus() { restoredFocus = true; } },
    body: { classList: { add: value => bodyClasses.add(value), remove: value => bodyClasses.delete(value) } }
  },
  window: {
    confirm() { confirmations++; return confirmDiscard; },
    matchMedia: query => ({ matches: query.includes("prefers-reduced-motion") && reducedMotion }),
    setTimeout(callback) { closeTimer = callback; return 1; },
    clearTimeout() { closeTimer = null; }
  },
  orgStructureMemberFormEl: { elements: [firstName] },
  orgStructureFields: { firstName }
});
const modalRun = code => vm.runInContext(code, modalContext);
modalRun(source.slice(source.indexOf('  let orgStructureEditorReturnFocus ='), source.indexOf('  const fillOrgStructureForm =')));
modalRun('setOrgStructureEditorOpen(true)');
assert.equal(editor.open, true);
assert.equal(addButton['aria-expanded'], 'true');
assert.equal(bodyClasses.has('has-org-directory-modal'), true);
firstName.value = 'ยังไม่บันทึก';
modalRun('setOrgStructureEditorOpen(false)');
assert.equal(editor.open, true, 'Declining discard preserves the open draft');
assert.equal(firstName.value, 'ยังไม่บันทึก');
confirmDiscard = true;
modalRun('orgStructureSaving = true; setOrgStructureEditorOpen(false)');
assert.equal(editor.open, true, 'Saving blocks dismissal');
assert.equal(confirmations, 1);
modalRun('orgStructureSaving = false; setOrgStructureEditorOpen(false)');
assert.equal(editor.open, false);
assert.equal(restoredFocus, true);
assert.equal(bodyClasses.size, 0);
assert.equal(addButton['aria-expanded'], 'false');
modalRun('setOrgStructureEditorOpen(true); setOrgStructureEditorOpen(false)');
assert.equal(confirmations, 2, 'Unchanged forms close without confirmation');
console.log('Staff directory modal: opening, draft protection, save guard and focus restoration passed.');

reducedMotion = false;
restoredFocus = false;
modalRun('setOrgStructureEditorOpen(true); setOrgStructureEditorOpen(false)');
assert.equal(editor.open, true, 'Dialog stays open during the exit animation');
assert.equal(editor.inert, true);
assert.equal(bodyClasses.has('has-org-directory-modal'), true);
assert.equal(restoredFocus, false);
modalRun('setOrgStructureEditorOpen(false)');
assert.equal(animationListeners.size, 1, 'Repeated close does not queue duplicate animations');
animationListeners.get('animationend')({ target: editor, animationName: 'org-directory-modal-in' });
assert.equal(editor.open, true, 'An interrupted opening animation cannot finish dismissal');
animationListeners.get('animationend')({ target: editor, animationName: 'org-directory-modal-out' });
assert.equal(editor.open, false);
assert.equal(editor.inert, false);
assert.equal(restoredFocus, true);
assert.equal(closeTimer, null);
modalRun('setOrgStructureEditorOpen(true); setOrgStructureEditorOpen(false)');
closeTimer();
assert.equal(editor.open, false, 'Timer fallback closes the dialog if animationend is unavailable');
assert.equal(animationListeners.size, 0);
console.log('Staff directory modal animation: deferred dismissal, repeated close, cleanup and fallback passed.');
