import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../js/features/staff/app.staff-access.js', import.meta.url), 'utf8');
const previewSource = source.slice(source.indexOf('  const buildOrganizationCatalogCopyPreview ='), source.indexOf('  const askOrganizationCatalogCopyYearConfirm ='));
const copySource = source.slice(source.indexOf('  let organizationCatalogCopyYearPending ='), source.indexOf('  const buildOrganizationCatalogPayloadFromForm ='));
const updates = () => ['selected', 'excluded'].map((id) => ({ id, fields: { name: id } }));
let selection = new Set(['selected']);
let writes = [];
let stages = [];
let confirmCalls = 0;
let releaseWrite;
let holdWrite = false;
const context = vm.createContext({
  console,
  getRawOrganizationCatalogRows: () => [],
  getOrganizationCatalogBaseId: (item) => item.baseOrganizationId || item.id,
  normalizeOrganizationCatalogText: (value) => String(value || '').trim(),
  stripOrganizationCatalogDocumentRunYear: (value) => String(value || '').replace(/\/\d{4}$/, ''),
  getOrganizationCatalogItemAcademicYear: (item) => item.academicYear || "",
  getRawOrganizationCatalogItemById: (id) => id === 'existing' ? { name: 'Existing organization', group: 'Group' } : id === 'source' ? { name: 'Source name', academicYear: '2568' } : null,
  getOrganizationCatalogDisplayAcademicYear: () => '2569',
  organizationCatalogImportMessageEl: {}, organizationCatalogFormMessageEl: {},
  organizationCatalogCopyYearBtnEl: { disabled: false },
  resolveStore: () => true,
  firestore: { setDoc() {}, doc() {}, serverTimestamp: () => 'timestamp' },
  buildOrganizationCatalogBackfillUpdates: (options) => {
    assert.equal(options.sourceYear, '2567');
    assert.equal(options.academicYear, '2570');
    return updates();
  },
  buildOrganizationCatalogNormalizeYearUpdates: () => { stages.push(writes.length); return updates(); },
  buildOrganizationCatalogYearLinkUpdates: () => { stages.push(writes.length); return updates(); },
  askOrganizationCatalogCopyYearConfirm: async () => { confirmCalls++; return selection ? { selectedIds: selection, sourceYear: "2567", academicYear: "2570" } : null; },
  readCurrentUser: () => ({ email: 'test@example.com' }),
  setMessage() {},
  writeOrganizationCatalogUpdateItems: async (items) => {
    writes.push(items);
    if (holdWrite) await new Promise((resolve) => { releaseWrite = resolve; });
  },
  applyOrganizationCatalogUpdateItems() {},
  renderOrganizationCatalogTable() {}, renderOrgRepresentativeApplications() {}
});
vm.runInContext(`${previewSource}\n${copySource}\nglobalThis.preview = buildOrganizationCatalogCopyPreview; globalThis.copy = copyOrganizationCatalogSelectedYear;`, context);
const preview = context.preview({ backfill: updates(), normalize: updates(), link: [{ id: 'existing', fields: {} }] });
assert.equal(preview.length, 3, 'an organization appearing in two stages has one selection row');
assert.equal(preview.find((row) => row.id === 'selected').steps.length, 2);
assert.equal(preview.find((row) => row.id === 'existing').name, 'Existing organization', 'link-only updates display the existing name');
const ordered = context.preview({
  backfill: [
    { id: 'ten', fields: { name: 'Target ten', code: 'ORG-10', legacyOrganizationId: 'source' } },
    { id: 'two', fields: { name: 'Target two', code: 'ORG-2', legacyOrganizationId: 'source' } }
  ], normalize: [], link: []
});
assert.equal(ordered[0].id, 'two', 'codes use numeric ordering');
assert.equal(ordered[0].sources[0], 'Source name · ปีการศึกษา 2568');
assert.equal(ordered[0].name, 'Target two', 'destination retains its own name');
assert.equal(ordered[0].existing, false);
assert.equal(preview.find((row) => row.id === 'existing').existing, true);
await context.copy();
assert.equal(writes.length, 1);
assert.ok(writes.every((items) => items.length === 1 && items[0].id === 'selected'), 'writes exclude unselected destinations');
assert.equal(stages.length, 0, 'copying an explicit source year must not normalize or link unrelated years');
for (const cancelled of [null, new Set()]) {
  selection = cancelled;
  writes = [];
  await context.copy();
  assert.equal(writes.length, 0, 'cancellation or empty selection writes nothing');
}
selection = new Set(['selected']);
holdWrite = true;
const pending = context.copy();
await new Promise((resolve) => setImmediate(resolve));
const callsBefore = confirmCalls;
await context.copy();
assert.equal(confirmCalls, callsBefore, 'duplicate invocation is blocked during writes');
holdWrite = false;
releaseWrite();
await pending;
assert.equal(context.organizationCatalogCopyYearBtnEl.disabled, false);
console.log('Organization copy: grouped preview, selected-only writes with explicit source and destination years, cancellation, empty selection and duplicate guard passed.');

const backfillSource = source.slice(source.indexOf('  const buildOrganizationCatalogBackfillUpdates ='), source.indexOf('  const backfillOrganizationCatalogCurrentYearFromPrevious ='));
let catalogRows = [];
const yearContext = vm.createContext({
  getOrganizationCatalogDisplayAcademicYear: () => '2570',
  normalizeOrganizationCatalogText: (value) => String(value || '').trim(),
  getRawOrganizationCatalogRows: () => catalogRows,
  getOrganizationCatalogItemAcademicYear: (item) => item.academicYear || '',
  getOrganizationCatalogBaseId: (item) => item.baseOrganizationId || item.id,
  slugifyOrganizationCatalogId: (text) => text,
  buildOrganizationCatalogYearTextMap: ({ textByAcademicYear }) => textByAcademicYear || {},
  buildOrganizationCatalogDocumentRunMap: ({ documentRunCodeByAcademicYear }) => documentRunCodeByAcademicYear || {},
  buildOrganizationCatalogCodeMap: ({ codeByAcademicYear }) => codeByAcademicYear || {},
  getOrganizationCatalogExactYearValue: (map, year) => map[year] || '',
  getOrganizationCatalogLatestPreviousYearValue: () => { throw new Error('Must not fall back to another source year'); },
  stripOrganizationCatalogDocumentRunYear: (value) => value || '',
  buildOrganizationCatalogManualCodeFromRunBase: () => '',
  buildOrganizationCatalogYearDocId: (id, year) => `${year}-${id}`
});
vm.runInContext(`${backfillSource}\nglobalThis.build = buildOrganizationCatalogBackfillUpdates;`, yearContext);
catalogRows = [
  { id: 'old', baseOrganizationId: 'club', academicYear: '2567', name: 'Chosen name', code: 'OLD' },
  { id: 'new', baseOrganizationId: 'club', academicYear: '2568', name: 'Wrong year', code: 'NEW' },
  { id: 'legacy', nameByAcademicYear: { 2567: 'Mapped name', 2568: 'Wrong mapped name' } },
  { id: 'other', nameByAcademicYear: { 2568: 'Not selected year' } }
];
let planned = yearContext.build({ sourceYear: '2567', academicYear: '2570' });
assert.equal(planned.length, 2);
assert.equal(planned.find((item) => item.id === '2570-club').fields.name, 'Chosen name');
assert.equal(planned.find((item) => item.id === '2570-legacy').fields.name, 'Mapped name');
assert.equal(yearContext.build({ sourceYear: '2567', academicYear: '2567' }).length, 0);
catalogRows.push({ id: 'destination', baseOrganizationId: 'club', academicYear: '2570', name: 'Keep destination name' });
planned = yearContext.build({ sourceYear: '2567', academicYear: '2570' });
assert.equal(planned.find((item) => item.id === 'destination').fields.name, undefined);
assert.equal(planned.find((item) => item.id === 'destination').fields.code, 'OLD');
console.log('Exact-year copy: selected year only, legacy maps, same-year rejection and existing destination preservation passed.');

const sourceYearsCode = source.slice(source.indexOf('  const getOrganizationCatalogCopySourceYears ='), source.indexOf('  const askOrganizationCatalogCopyYearConfirm ='));
vm.runInContext(`${sourceYearsCode}\nglobalThis.sourceYears = getOrganizationCatalogCopySourceYears;`, yearContext);
catalogRows = [
  { id: 'annual', academicYear: '2569', name: 'Annual organization' },
  { id: 'empty-year', academicYear: '2570', name: ' ' },
  { id: 'legacy', nameByAcademicYear: { 2567: 'Older name', 2568: ' ', 2571: '' } },
  { id: 'code-only', codeByAcademicYear: { 2566: 'ORG-01' } }
];
assert.equal(yearContext.sourceYears().join(','), '2569,2567,2566', 'source years only include nonempty annual or mapped organization data');
catalogRows = [];
assert.equal(yearContext.sourceYears().length, 0, 'empty catalog has no selectable source year');
console.log('Copy source years: empty years excluded, annual and legacy data included, empty catalog handled.');

vm.runInContext('globalThis.conflicts = getOrganizationCatalogCopyConflicts;', context);
context.getRawOrganizationCatalogRows = () => [{ id: 'target-other', baseOrganizationId: 'other', academicYear: '2569', group: 'Sports', name: 'Other organization', code: 'XX.01', documentRunCode: '01/2569' }];
const copyPlan = [{ id: 'target-new', fields: { academicYear: '2569', baseOrganizationId: 'new', group: 'Sports', name: 'New organization', code: 'XX.01' } }];
assert.equal(context.conflicts(copyPlan, '2569').size, 1, 'another organization owning the destination code blocks copying');
copyPlan[0].fields.baseOrganizationId = 'other';
assert.equal(context.conflicts(copyPlan, '2569').size, 0, 'the same base organization may fill its own year data');
copyPlan[0].fields.baseOrganizationId = 'new';
copyPlan[0].fields.code = 'XX.02';
copyPlan[0].fields.documentRunCode = '01/2568';
assert.equal(context.conflicts(copyPlan, '2569').size, 1, 'document run collisions are checked without the year suffix');
context.getRawOrganizationCatalogRows = () => [];
const duplicatePlans = ['one', 'two'].map((id) => ({ id, fields: { group: 'Sports', code: 'XX.01', baseOrganizationId: id } }));
assert.equal(context.conflicts(duplicatePlans, '2569').size, 2, 'duplicate codes among proposed organizations are blocked');
context.getRawOrganizationCatalogRows = () => [{ id: 'legacy', group: 'Sports', name: 'Legacy org', codeByAcademicYear: { 2569: 'XX.01' } }];
assert.equal(context.conflicts(duplicatePlans, '2569').size, 2, 'year-specific codes in legacy maps reserve the code');
console.log('Copy collisions: destination owner, same organization, run code, proposed duplicates and legacy maps passed.');
selection = new Set(['selected']);
writes = [];
context.getRawOrganizationCatalogRows = () => [{ id: 'new-owner', baseOrganizationId: 'new-owner', academicYear: '2570', group: 'Sports', code: 'XX.01', name: 'Owner added before confirmation' }];
context.buildOrganizationCatalogBackfillUpdates = () => [{ id: 'selected', fields: { baseOrganizationId: 'selected', group: 'Sports', code: 'XX.01' } }];
context.console = { error() {} };
await context.copy();
assert.equal(writes.length, 1, 'a collision is assigned the next available code before writing');
assert.equal(writes[0][0].fields.code, 'XX.02');

vm.runInContext('globalThis.allocate = allocateOrganizationCatalogCopyCodes;', context);
context.getRawOrganizationCatalogRows = () => [
  { id: 'owner1', baseOrganizationId: 'owner1', academicYear: '2569', group: 'SGCU', code: 'SGCU-04.01', documentRunCode: '04.01' },
  { id: 'owner9', baseOrganizationId: 'owner9', academicYear: '2569', group: 'SGCU', code: 'SGCU-04.09', documentRunCode: '04.09' },
  { id: 'division5', academicYear: '2569', group: 'SGCU', code: 'SGCU-05.99', documentRunCode: '05.99' },
  { id: 'future', academicYear: '2570', group: 'SGCU', code: 'SGCU-04.99', documentRunCode: '04.99' }
];
const plan = ['a', 'b'].map((id) => ({ id, fields: { academicYear: '2569', baseOrganizationId: id, group: 'SGCU', code: 'SGCU-04.01', documentRunCode: '04.01', codeByAcademicYear: { 2569: 'SGCU-04.01' }, documentRunCodeByAcademicYear: { 2569: '04.01' } } }));
const allocated = context.allocate(plan, '2569');
assert.equal(allocated[0].fields.code, 'SGCU-04.10');
assert.equal(allocated[1].fields.code, 'SGCU-04.11');
assert.equal(allocated[0].fields.documentRunCode, '04.10');
assert.equal(allocated[1].fields.codeByAcademicYear['2569'], 'SGCU-04.11');
assert.equal(allocated[1].fields.documentRunCodeByAcademicYear['2569'], '04.11');
assert.equal(plan[0].fields.code, 'SGCU-04.01', 'allocation must not mutate source plans');
assert.equal(context.conflicts(allocated, '2569').size, 0);
assert.equal(allocated[0].copyRenumber, 'SGCU-04.01 → SGCU-04.10');
assert.equal(context.allocate([{ id: 'free', fields: { baseOrganizationId: 'free', group: 'SGCU', code: 'SGCU-04.05', documentRunCode: '04.05' } }], '2569')[0].fields.code, 'SGCU-04.05', 'nonconflicting code is retained');
console.log('Automatic copy numbering: sequential codes after division maximum, target year scope, matching run codes and maps, unchanged source and free codes passed.');
