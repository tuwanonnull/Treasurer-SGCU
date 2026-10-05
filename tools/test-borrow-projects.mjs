import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../js/features/borrow/app.borrow-assets.js', import.meta.url), 'utf8');
const slice = (from, to) => source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { value: '', style: {}, innerHTML: '', textContent: '', focus() {} });
  return elements.get(id);
};
const listeners = [];
let messages = [];
let validations = 0;
const context = vm.createContext({
  console: { error() {} }, Date, Intl,
  document: { getElementById: element },
  borrowProjectName: { value: 'องค์การบริหารสโมสรนิสิต' },
  BORROW_PROJECT_ORG: 'องค์การบริหารสโมสรนิสิต',
  borrowManagedProject: element('borrowManagedProject'),
  staffBorrowRequestProjectFilter: element('staffBorrowRequestProjectFilter'),
  managedBorrowProjects: [], borrowRequests: [], submissionWindow: {},
  borrowCatalogReady: false, borrowCatalogSequence: 0, borrowCatalogUnsubscribes: [],
  getBorrowAcademicYearBE: () => '2569', safeEscape: value => String(value), formatDate: value => value,
  populateBorrowProjectDeptOptions() {}, updateBorrowPickupDateRule() {},
  resolveFirestoreBridge: () => true, readCurrentUserEmail: () => 'test@student.chula.ac.th',
  setBorrowMessage: message => messages.push(message),
  firestore: {
    db: {}, collection: (_db, name) => name, doc: (_db, collection, id) => `${collection}/${id}`,
    onSnapshot: (path, success, error) => { listeners.push({ path, success, error }); return () => {}; }
  },
  borrowRequestForm: { reportValidity() { validations++; return false; } }, borrowSubmitBtn: {}
});
vm.runInContext(slice('  const projectWeekdays =', '  const normalizeAllowedPickupDays =') +
  slice('    const dayKeyBangkok =', '  const renderStaffSummary =') +
  slice('  const submitBorrowRequest =', '  const updateBorrowRequestStatus =') +
  '\nglobalThis.subscribe = subscribeBorrowCatalog; globalThis.submit = submitBorrowRequest; globalThis.renderProjects = renderManagedBorrowProjects;', context);
const project = { id: 'project-1', name: 'โครงการทดสอบ', active: true, academicYear: '2569' };
const snapshot = projects => ({ docs: projects.map(({ id, ...data }) => ({ id, data: () => data })) });
context.subscribe();
listeners[0].success(snapshot([project, { ...project, id: 'old', academicYear: '2568' }]));
assert.equal(context.borrowCatalogReady, true);
assert.match(element('borrowManagedProject').innerHTML, /project-1/);
assert.doesNotMatch(element('borrowManagedProject').innerHTML, /value="old"/);
assert.equal(element('borrowManagedProject').required, false);
context.borrowManagedProject.value = project.id;
await context.submit();
assert.equal(validations, 1, 'An active project must pass the new submission gates');
context.managedBorrowProjects[0].from = '2000-01-01';
context.managedBorrowProjects[0].to = '2000-01-02';
await context.submit();
assert.match(messages.at(-1), /นอกช่วง/);
context.managedBorrowProjects[0].from = '2999-01-01';
context.managedBorrowProjects[0].to = '2999-01-02';
await context.submit();
assert.match(messages.at(-1), /นอกช่วง/);
context.submissionWindow = {};
listeners[0].success(snapshot([{ ...project, active: false }]));
await context.submit();
assert.match(messages.at(-1), /เลือกโครงการ/);
assert.doesNotMatch(element('borrowManagedProject').innerHTML, /project-1/);
context.borrowProjectName.value = 'หน่วยงานภายนอก';
context.renderProjects();
await context.submit();
assert.equal(validations, 2, 'Other organizations may submit without a managed project');
assert.equal(element('borrowManagedProject').required, false);
assert.equal(element('borrowManagedProjectField').hidden, true);
context.borrowRequests = [{ borrowProjectId: 'removed', borrowProjectName: 'โครงการเดิม' }];
context.renderProjects();
assert.match(element('staffBorrowRequestProjectFilter').innerHTML, /โครงการเดิม/, 'Historical projects remain filterable');
context.subscribe();
listeners[0].success(snapshot([project]));
assert.equal(context.managedBorrowProjects.length, 0, 'Ignore callbacks from the previous authenticated session');
listeners[1].error(new Error('offline'));
await context.submit();
assert.match(messages.at(-1), /กำลังโหลด/);
assert.equal(context.borrowCatalogReady, false);
assert.equal(vm.runInContext('dayKeyBangkok(new Date("2026-10-04T17:00:00Z"))', context), '2026-10-05');
assert.equal(vm.runInContext('dayKeyBangkok(new Date("2026-10-04T16:59:59Z"))', context), '2026-10-04');
console.log('Borrow project selection, subscription lifecycle, and submission window tests passed.');

// Loading source options is read-only; adding selects one project and preserves other records.
const { webcrypto } = await import('node:crypto');
const catalog = new Map();
const sourceProjects = [
  { code: 'SGCU-1', name: 'โครงการหนึ่ง', orgGroup: context.BORROW_PROJECT_ORG },
  { code: 'SGCU-2', name: 'โครงการสอง', orgGroup: context.BORROW_PROJECT_ORG },
  { code: 'OTHER', name: 'ชมรมอื่น', orgGroup: 'อื่น' }
];
context.crypto = webcrypto;
context.TextEncoder = TextEncoder;
context.loadBorrowProjectsFromProjectStatus = async () => sourceProjects;
context.firestore.getDocs = async () => snapshot(Array.from(catalog, ([id, data]) => ({ id, ...data })));
context.firestore.serverTimestamp = () => 'timestamp';
context.firestore.runTransaction = async (_db, callback) => callback({
  get: async ref => ({ exists: () => catalog.has(ref.split('/')[1]) }),
  set: (ref, data) => catalog.set(ref.split('/')[1], data)
});
vm.runInContext('globalThis.loadOptions = loadBorrowProjectOptions; globalThis.addSelected = addSelectedBorrowProject;', context);
assert.equal((await context.loadOptions('2569')).length, 2);
assert.equal(catalog.size, 0, 'Loading ProjectStatus must never enable projects');
await context.addSelected('2569', sourceProjects[1], '', { from: '', to: '', opensAt: null, closesAt: null });
assert.equal(catalog.size, 1);
assert.equal(Array.from(catalog.values())[0].name, 'โครงการสอง');
await assert.rejects(context.addSelected('2569', sourceProjects[1], '', {}), /เพิ่มโครงการนี้แล้ว/);
await assert.rejects(context.addSelected('2569', null, 'โครงการหนึ่ง', {}), /ProjectStatus/);
await context.addSelected('2569', null, 'โครงการเพิ่มเติม', {});
assert.equal(catalog.size, 2);
assert.equal(Array.from(catalog.values())[1].source, 'manual');
console.log('Explicit project selection and read-only source loading tests passed.');

const dataSource = await readFile(new URL('../js/features/project/app.data.js', import.meta.url), 'utf8');
const loaderStart = dataSource.indexOf('async function loadBorrowProjectsFromProjectStatus(');
const loaderEnd = dataSource.indexOf('async function loadProjectsFromSheet(', loaderStart);
const fetched = [];
const loaderContext = vm.createContext({
  window: {}, PROJECT_SOURCES_CSV_URL: 'sources', SHEET_CSV_URL: 'fallback',
  fetchTextWithProgress: async url => { fetched.push(url); return url; },
  parseCsvRows: text => text === 'sources' ? ['source rows'] : [[], ['header'], ['data']],
  parseProjectSourceList: () => [{ year: '2568', projectUrl: 'old' }, { year: '2569', projectUrl: 'current' }],
  isPublishedHtmlSheetUrl: () => false,
  extractProjectsFromRows: (_rows, _header, year) => [{ name: 'real project', year }]
});
vm.runInContext(dataSource.slice(loaderStart, loaderEnd) + '\nglobalThis.loadProjects = loadBorrowProjectsFromProjectStatus;', loaderContext);
assert.equal((await loaderContext.loadProjects('2569'))[0].year, '2569');
assert.deepEqual(fetched, ['sources', 'current'], 'Borrowing must load the requested academic year, independent of ProjectStatus UI selection');
assert.equal((await loaderContext.loadProjects('2570')).length, 0, 'A year without a configured source allows manual projects');
loaderContext.fetchTextWithProgress = async () => { throw new Error('source unavailable'); };
await assert.rejects(loaderContext.loadProjects('2569'), /source unavailable/, 'Failed fetching must never import demo data');
console.log('ProjectStatus source-year selection and failure handling tests passed.');

context.parseDateYmd = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value) : null;
vm.runInContext('globalThis.datePatch = borrowProjectDatePatch;', context);
const dates = context.datePatch('2026-10-05', '2026-10-05');
assert.equal(dates.opensAt.toISOString(), '2026-10-04T17:00:00.000Z');
assert.equal(dates.closesAt.toISOString(), '2026-10-05T17:00:00.000Z');
assert.throws(() => context.datePatch('2026-10-05', ''), /กรุณาระบุ/);
assert.throws(() => context.datePatch('2026-10-06', '2026-10-05'), /กรุณาระบุ/);
assert.equal(context.datePatch('', '').opensAt, null);
console.log('Per-project Bangkok date boundaries and date validation tests passed.');

// Closed records remain in the enable dropdown, while the staff list shows only open projects.
context.managedBorrowProjects = [
  { id: 'closed', name: 'โครงการปิด', academicYear: '2569', active: false },
  { id: 'open', name: 'โครงการเปิด', academicYear: '2569', active: true }
];
element('staffBorrowProjectSource').value = '';
element('staffBorrowProjectYear').value = '2569';
context.renderProjects();
assert.match(element('staffBorrowProjectSource').innerHTML, /โครงการปิด/);
assert.doesNotMatch(element('staffBorrowProjectSource').innerHTML, /โครงการเปิด/);
assert.equal(element('staffBorrowProjectSource').value, '', 'Never preselect a project after refresh');
assert.doesNotMatch(element('staffBorrowProjectList').innerHTML, /โครงการปิด/);
assert.match(element('staffBorrowProjectList').innerHTML, /โครงการเปิด/);
catalog.set('closed', { name: 'โครงการปิด', academicYear: '2569', active: false });
context.firestore.runTransaction = async (_db, callback) => callback({
  get: async ref => ({ exists: () => catalog.has(ref.split('/')[1]), data: () => catalog.get(ref.split('/')[1]) }),
  update: (ref, data) => catalog.set(ref.split('/')[1], { ...catalog.get(ref.split('/')[1]), ...data })
});
const countBeforeReopen = catalog.size;
await context.addSelected('2569', { existingId: 'closed' }, '', { from: '', to: '', opensAt: null, closesAt: null });
assert.equal(catalog.size, countBeforeReopen, 'Reopening must reuse the same record and ID');
assert.equal(catalog.get('closed').active, true);
await assert.rejects(context.addSelected('2569', { existingId: 'closed' }, '', {}), /เปิดใช้งานแล้ว/);
console.log('Dropdown-only reopening and empty initial selection tests passed.');

context.managedBorrowProjects = [
  { id: 'ten', sourceCode: 'SGCU-10', name: 'โครงการสิบ', academicYear: '2569', active: false },
  { id: 'missing', name: 'ไม่มีรหัส', academicYear: '2569', active: false },
  { id: 'two', sourceCode: 'SGCU-2', name: 'โครงการสอง', academicYear: '2569', active: false }
];
element('staffBorrowProjectSource').value = '';
context.renderProjects();
const sortedOptions = element('staffBorrowProjectSource').innerHTML;
assert.ok(sortedOptions.indexOf('SGCU-2') < sortedOptions.indexOf('SGCU-10'));
assert.ok(sortedOptions.indexOf('SGCU-10') < sortedOptions.indexOf('ยังไม่มีรหัส'));
element('staffBorrowProjectSource').value = '0';
vm.runInContext('renderStaffBorrowProjectName()', context);
assert.equal(element('staffBorrowProjectNameDisplay').textContent, 'โครงการสอง');
element('staffBorrowProjectSource').value = '';
vm.runInContext('renderStaffBorrowProjectName()', context);
assert.match(element('staffBorrowProjectNameDisplay').textContent, /เลือกรหัสโครงการ/);
console.log('Numeric project-code sorting and selected project-name display tests passed.');

const deptContext = vm.createContext({
  BORROW_PROJECT_ORG: 'องค์การบริหารสโมสรนิสิต', OTHER_ORG_VALUE: '__other__',
  borrowProjectName: { value: 'องค์การบริหารสโมสรนิสิต' },
  borrowManagedProject: { value: 'project-1' },
  borrowProjectDept: { value: 'ชมรมเดิม', style: {} },
  borrowProjectDeptOther: { value: ' ฝ่ายกิจกรรมโครงการ ', style: {} },
  document: { querySelector: () => ({}), getElementById: () => null },
  collectBorrowOrgNameOptions: () => ['ชมรมเดิม', 'ชมรมสอง'], safeEscape: String
});
vm.runInContext(slice('  const usesManualBorrowDept =', '  const normalizeOrgCode =') + '\nglobalThis.refresh = populateBorrowProjectDeptOptions; globalThis.readDept = getBorrowProjectDeptValueForSubmit;', deptContext);
deptContext.refresh();
assert.equal(deptContext.borrowProjectDept.disabled, true);
assert.equal(deptContext.readDept(), 'ฝ่ายกิจกรรมโครงการ');
deptContext.borrowProjectName.value = 'ชมรม';
deptContext.refresh();
assert.equal(deptContext.borrowProjectDept.disabled, false);
assert.equal(deptContext.borrowProjectDeptOther.required, false);
assert.equal(deptContext.readDept(), 'ชมรมเดิม');
deptContext.borrowProjectName.value = '__other__';
deptContext.refresh();
assert.equal(deptContext.borrowProjectDeptOther.required, true);
assert.equal(deptContext.readDept(), 'ฝ่ายกิจกรรมโครงการ');
console.log('Project/manual and other-organization dropdown department tests passed.');

deptContext.borrowProjectName.value = 'องค์การบริหารสโมสรนิสิต';
deptContext.borrowManagedProject.value = '';
deptContext.refresh();
assert.equal(deptContext.borrowProjectDept.disabled, false);
assert.equal(deptContext.borrowProjectDeptOther.required, false);
assert.equal(deptContext.readDept(), 'ชมรมเดิม');
deptContext.borrowManagedProject.value = 'project-1';
deptContext.refresh();
assert.equal(deptContext.borrowProjectDept.disabled, true);
assert.equal(deptContext.readDept(), 'ฝ่ายกิจกรรมโครงการ');
context.borrowCatalogReady = true;
context.borrowProjectName.value = context.BORROW_PROJECT_ORG;
context.borrowManagedProject.value = '';
const validationsBeforeDeptRequest = validations;
await context.submit();
assert.equal(validations, validationsBeforeDeptRequest + 1, 'SGCU department-only borrowing must pass project selection validation');
console.log('Optional SGCU project and department mode switching tests passed.');

vm.runInContext('globalThis.deptLabel = getBorrowDeptLabel;', deptContext);
for (const [type, label] of [['องค์การบริหารสโมสรนิสิต', 'ฝ่าย'], ['สภานิสิต', 'ฝ่าย'], ['ชมรมฝ่ายกีฬา', 'ชมรม'], ['ชมรมฝ่ายวิชาการ', 'ชมรม'], ['__other__', 'หน่วยงาน']]) {
  deptContext.borrowProjectName.value = type;
  assert.equal(deptContext.deptLabel(), label);
}
console.log('Organization-specific department and club labels passed.');

context.borrowProjectName.value = context.BORROW_PROJECT_ORG;
context.borrowManagedProject.value = '';
element('borrowModeProject').checked = true;
vm.runInContext('renderBorrowMode()', context);
assert.equal(context.borrowManagedProject.required, true);
assert.equal(element('borrowProjectSelector').hidden, false);
await context.submit();
assert.match(messages.at(-1), /กรุณาเลือกโครงการ/);
element('borrowModeProject').checked = false;
vm.runInContext('renderBorrowMode()', context);
assert.equal(context.borrowManagedProject.required, false);
assert.equal(context.borrowManagedProject.disabled, true);
assert.equal(element('borrowProjectSelector').hidden, true);
console.log('Borrow mode card required fields and visibility tests passed.');

vm.runInContext('globalThis.projectWindowStatus = borrowProjectWindowStatus;', context);
assert.equal(context.projectWindowStatus({}).tone, 'open');
assert.equal(context.projectWindowStatus({ from: '2999-01-01', to: '2999-01-02' }).tone, 'upcoming');
assert.equal(context.projectWindowStatus({ from: '2000-01-01', to: '2000-01-02' }).tone, 'ended');
console.log('Staff project cards distinguish active, upcoming, and expired windows.');

const weeklyContext = vm.createContext({ Date });
vm.runInContext(slice('  const projectDateAllowed =', '  const renderManagedBorrowProjectFilter =') + '\nglobalThis.allowed = projectDateAllowed;', weeklyContext);
for (let day = 0; day < 7; day++) {
  const date = `2026-10-${String(4 + day).padStart(2, '0')}`;
  assert.equal(weeklyContext.allowed({customWeekdays:true,pickupDays:[day]}, 'pickupDays', date), true);
  assert.equal(weeklyContext.allowed({customWeekdays:true,pickupDays:[(day+1)%7]}, 'pickupDays', date), false);
}
assert.equal(weeklyContext.allowed({}, 'pickupDays', '2026-10-05'), true);
console.log('Per-project weekdays cover all seven calendar days and legacy fallback.');
