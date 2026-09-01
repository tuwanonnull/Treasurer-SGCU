import assert from "node:assert/strict";

globalThis.window = globalThis;
await import("../js/features/staff/app.staff-access.catalog.js");
await import("../js/features/staff/app.staff-access.catalog-view.js");

const catalog = globalThis.sgcuStaffAccessCatalog;
assert.ok(catalog, "catalog module should register its public API");
const catalogViewFactory = globalThis.sgcuStaffAccessCatalogView;
assert.ok(catalogViewFactory, "catalog view module should register its public API");

const prefixCases = [
  ["องค์การบริหารสโมสรนิสิต", "SGCU", "อบจ."],
  ["สภานิสิต", "SCCU", "สภจ."],
  ["ชมรมฝ่ายกีฬา", "SPT", "อบจ.กฬ."],
  ["ชมรมฝ่ายวิชาการ", "VCK", "อบจ.วชก."],
  ["ชมรมฝ่ายศิลปะและวัฒนธรรม", "ART", "อบจ.ศป."],
  ["ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์", "PHT", "อบจ.พฒ."]
];
prefixCases.forEach(([group, codePrefix, documentPrefix]) => {
  assert.equal(catalog.codePrefix(group), codePrefix, `code prefix for ${group}`);
  assert.equal(catalog.documentPrefix(group), documentPrefix, `document prefix for ${group}`);
});

assert.equal(catalog.normalizeAcademicYear("68"), "2568");
assert.equal(catalog.normalizeAcademicYear("2569"), "2569");
assert.equal(catalog.normalizeAcademicYear("ปี 2569"), "");
assert.equal(catalog.yearValue({ 2567: "previous", 2569: "current" }, "2569"), "current");
assert.equal(catalog.yearValue({ 2567: "previous" }, "2569"), "previous");
assert.equal(catalog.exactYearValue({ 2568: "exact" }, "2568"), "exact");
assert.equal(catalog.latestPreviousYearValue({ 2567: "old", 2568: "new" }, "2569"), "new");

assert.equal(catalog.stripRunYear("อบจ. 04.03/2568"), "04.03");
assert.deepEqual(catalog.parseManualRunBase("อบจ. 04.03/2568"), {
  divisionCode: "04",
  subCode: "03"
});
assert.deepEqual(catalog.buildDocumentRunMap({ documentRunCode: "อบจ. 04.03/2568" }), {
  2568: "04.03"
});
assert.deepEqual(catalog.buildCodeMap({
  group: "องค์การบริหารสโมสรนิสิต",
  documentRunCodeByAcademicYear: { 2568: "04.03" }
}), { 2568: "SGCU-04.03" });

const csvRows = catalog.parseCsvRows([
  ["ประเภท", "ชื่อองค์กร", "รหัส", "เลขที่หนังสือ", "บัญชี"],
  ["ชมรมฝ่ายกีฬา", "ชมรมทดสอบ", "SPT-99", "12", "123-4"],
  ["ชมรมฝ่ายกีฬา", "ชมรมทดสอบ", "SPT-99", "13", "567-8"]
], {
  generateCode: ({ code }) => code,
  resolveRunBase: ({ documentRunCode }) => documentRunCode
});
assert.equal(csvRows.length, 1, "duplicate CSV ids should merge");
assert.equal(csvRows[0].code, "SPT-99");
assert.equal(csvRows[0].documentRunCode, "13");
assert.equal(csvRows[0].accountNo, "567-8");

const fallbackWrites = [];
const fallbackFirestore = {
  db: {},
  doc: (_db, collection, id) => ({ collection, id }),
  setDoc: async (ref, data, options) => fallbackWrites.push({ ref, data, options }),
  serverTimestamp: () => "timestamp"
};
assert.equal(await catalog.writeItems(csvRows, "tester@example.com", {
  firestore: fallbackFirestore,
  collectionName: "organizationCatalog"
}), 1);
assert.equal(fallbackWrites.length, 1);
assert.equal(fallbackWrites[0].ref.collection, "organizationCatalog");
assert.equal(fallbackWrites[0].data.importedBy, "tester@example.com");
assert.deepEqual(fallbackWrites[0].options, { merge: true });

let batchSets = 0;
let batchCommits = 0;
const batchFirestore = {
  db: {},
  doc: (_db, collection, id) => ({ collection, id }),
  setDoc: async () => {},
  serverTimestamp: () => "timestamp",
  writeBatch: () => ({
    set: () => { batchSets += 1; },
    commit: async () => { batchCommits += 1; }
  })
};
const batchItems = Array.from({ length: 451 }, (_, index) => ({
  id: `organization-${index + 1}`,
  name: `Organization ${index + 1}`
}));
assert.equal(await catalog.writeItems(batchItems, "tester@example.com", {
  firestore: batchFirestore,
  collectionName: "organizationCatalog"
}), 451);
assert.equal(batchSets, 451);
assert.equal(batchCommits, 2, "451 writes should use two Firestore batches");

const viewSource = [
  { id: "sports-club", group: "ชมรมฝ่ายกีฬา", name: "ชื่อเดิม", code: "SPT-01", status: "active" },
  {
    id: "2569-sports-club",
    baseOrganizationId: "sports-club",
    academicYear: "2569",
    group: "ชมรมฝ่ายกีฬา",
    name: "ชื่อปีใหม่",
    code: "SPT-02",
    status: "active"
  },
  { id: "archived-club", group: "ชมรมฝ่ายกีฬา", name: "ไม่ควรแสดงใน raw rows", status: "archived" }
];
const catalogView = catalogViewFactory.create({
  getSource: () => viewSource,
  getDisplayAcademicYear: () => "2569",
  getSharedAccountNo: () => "",
  resolveRunBase: ({ documentRunCode = "" }) => catalog.stripRunYear(documentRunCode)
});
assert.equal(catalogView.getRawRows().length, 2, "raw rows should exclude archived organizations");
assert.equal(catalogView.getRawItemById("sports-club")?.name, "ชื่อเดิม");
const viewRows = catalogView.getRows();
const sportsRow = viewRows.find((item) => item.baseOrganizationId === "sports-club");
assert.equal(viewRows.filter((item) => item.baseOrganizationId === "sports-club").length, 1,
  "year-specific and legacy rows should deduplicate by base id");
assert.equal(sportsRow?.name, "ชื่อปีใหม่");
assert.equal(sportsRow?.code, "SPT-02");

console.log("Staff access catalog tests passed.");
