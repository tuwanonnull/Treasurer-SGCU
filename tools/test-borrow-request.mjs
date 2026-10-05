import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Run with a local Firestore emulator using firestore.rules:
// FIRESTORE_EMULATOR_HOST=127.0.0.1:8185 node tools/test-borrow-request.mjs
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host || "", /^(localhost|127\.0\.0\.1):\d+$/, "Use a local emulator");
const project = "demo-borrow-rules";
const root = `projects/${project}/databases/(default)/documents`;
const base = `http://${host}/v1/${root}`;
const email = "student@student.chula.ac.th";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (address) => `${encode({ alg: "none", typ: "JWT" })}.${encode({
  sub: address, user_id: address, email: address, aud: project,
  iss: `https://securetoken.google.com/${project}`,
  iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600
})}.`;
const fields = (data) => Object.fromEntries(Object.entries(data).map(([key, value]) => [
  key, Array.isArray(value) ? { arrayValue: { values: value.map(day => ({ integerValue: String(day) })) } } : value === null ? { nullValue: null } : value instanceof Date ? { timestampValue: value.toISOString() } : typeof value === "boolean" ? { booleanValue: value } : typeof value === "number" ? { integerValue: String(value) } : { stringValue: value }
]));
const write = (path, data) => ({ update: { name: `${root}/${path}`, fields: fields(data) } });
async function call(path, auth, body) {
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.text() };
}
async function expectStatus(expected, path, auth, body) {
  const result = await call(path, auth, body);
  assert.equal(result.status, expected, result.body);
  console.log(`Rules case: ${body?.writes?.[0]?.update?.name?.split("/").at(-1) || path} expected=${expected} actual=${result.status}`);
}
const id = `test-${Date.now()}`;
const counterPath = `borrowAssetRequestCounters/${id}`;
const requestPath = `borrowAssetRequests/${id}`;
const counter = (lastRunning) => ({ prefix: id, termYY: "69", orgCode: "TEST", lastRunning });
const student = token(email);
await expectStatus(404, `/${counterPath}`, student);
await expectStatus(200, ":commit", student, { writes: [
  write(counterPath, counter(1)), write(requestPath, { requesterEmail: email, status: "pending" })
] });
await expectStatus(200, ":commit", student, { writes: [write(counterPath, counter(2))] });
await expectStatus(403, ":commit", student, { writes: [write(counterPath, counter(4))] });
await expectStatus(200, `/${requestPath}`, student);
await expectStatus(200, ":runQuery", student, { structuredQuery: {
  from: [{ collectionId: "borrowAssetRequests" }],
  where: { fieldFilter: {
    field: { fieldPath: "requesterEmail" }, op: "EQUAL", value: { stringValue: email }
  } }
} });
await expectStatus(403, `/${requestPath}`, token("other@student.chula.ac.th"));
await expectStatus(403, ":commit", student, { writes: [
  write(`${requestPath}-forged`, { requesterEmail: "other@student.chula.ac.th", status: "pending" })
] });
await expectStatus(403, ":commit", student, { writes: [
  write(requestPath, { requesterEmail: email, status: "approved" })
] });
await expectStatus(403, ":commit", null, { writes: [write(counterPath, counter(3))] });
await expectStatus(403, ":commit", token("outsider@example.com"), { writes: [write(counterPath, counter(3))] });
await expectStatus(403, ":commit", student, { writes: [
  write(`borrowAssetStockReservations/${id}`, { reserved: 1 })
] });
await expectStatus(200, ":commit", student, { writes: [
  write(requestPath, { requesterEmail: email, status: "cancelled" })
] });
const headStaff = token("tuwanon.kimchiang@gmail.com");
await expectStatus(200, ":commit", headStaff, { writes: [
  write(requestPath, { requesterEmail: email, status: "approved" })
] });
await expectStatus(200, ":commit", headStaff, { writes: [write(counterPath, counter(10))] });

// Project lifecycle and submission windows are enforced by rules, not only the form.
const projectPath = `borrowProjects/${id}`;
const org = "องค์การบริหารสโมสรนิสิต";
const projectData = { source: "project-status", sourceCode: "SGCU-1", name: "โครงการทดสอบ", academicYear: "2569", orgGroup: org, active: true, updatedBy: "tuwanon.kimchiang@gmail.com" };
await expectStatus(403, ":commit", student, { writes: [write(projectPath, projectData)] });
await expectStatus(200, ":commit", headStaff, { writes: [write(projectPath, projectData)] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-legacy-form`, { requesterEmail: email, status: "pending", projectName: org })] });
const projectRequest = { requesterEmail: email, status: "pending", projectName: org, academicYear: "2569", borrowProjectId: id, borrowProjectName: projectData.name };
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-missing`, { ...projectRequest, borrowProjectId: "missing" })] });
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-wrong-year`, { ...projectRequest, academicYear: "2568" })] });
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-wrong-name`, { ...projectRequest, borrowProjectName: "ปลอม" })] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-no-project`, { requesterEmail: email, status: "pending", projectName: org, borrowProjectId: "" })] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-project`, projectRequest)] });
await expectStatus(200, ":commit", headStaff, { writes: [write(projectPath, { ...projectData, active: false })] });
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-closed-project`, projectRequest)] });
await expectStatus(200, `/${requestPath}-project`, student);
await expectStatus(200, ":commit", headStaff, { writes: [write(projectPath, projectData)] });
const settings = { from: "2000-01-01", to: "2000-01-02", opensAt: new Date("2000-01-01T00:00:00+07:00"), closesAt: new Date("2000-01-03T00:00:00+07:00"), updatedBy: "tuwanon.kimchiang@gmail.com" };
await expectStatus(403, ":commit", student, { writes: [write(projectPath, { ...projectData, ...settings })] });
await expectStatus(200, ":commit", headStaff, { writes: [write(projectPath, { ...projectData, ...settings })] });
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-closed-window`, projectRequest)] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-closed-external`, { requesterEmail: email, status: "pending" })] });
await expectStatus(200, ":commit", headStaff, { writes: [write(`${projectPath}-other`, projectData)] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-other-open-project`, { ...projectRequest, borrowProjectId: `${id}-other` })] });
// Closing submissions must not prevent staff processing or users cancelling existing requests.
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-project`, { ...projectRequest, status: "cancelled" })] });
await expectStatus(200, ":commit", headStaff, { writes: [write(requestPath, { requesterEmail: email, status: "returned" })] });
await expectStatus(200, ":commit", headStaff, { writes: [write(projectPath, { ...projectData, ...settings, from: "", to: "", opensAt: null, closesAt: null })] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-reopened`, projectRequest)] });

// Ordinary borrow staff can maintain the catalog and window without head-staff privileges.
const staffEmail = "borrow-staff@student.chula.ac.th";
await expectStatus(200, ":commit", "owner", { writes: [{ update: {
  name: `${root}/staffProfiles/${staffEmail}`,
  fields: { role: { stringValue: "staff" }, positionCodeYY: { stringValue: "01" }, divisionCodeYY: { stringValue: "01" },
    divisionCodesYY: { arrayValue: { values: [] } }, position: { stringValue: "staff" },
    allowedPages: { arrayValue: { values: [{ stringValue: "borrow-assets-staff" }] } } }
} }] });
const staff = token(staffEmail);
await expectStatus(200, ":commit", staff, { writes: [write(`${projectPath}-staff`, { ...projectData, updatedBy: staffEmail })] });
const now = Date.now();
await expectStatus(200, ":commit", staff, { writes: [write(projectPath, { ...projectData, ...settings, updatedBy: staffEmail, opensAt: new Date(now + 86400000), closesAt: new Date(now + 172800000) })] });
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-future-window`, projectRequest)] });
await expectStatus(200, ":commit", staff, { writes: [write(projectPath, { ...projectData, ...settings, updatedBy: staffEmail, opensAt: new Date(now - 86400000), closesAt: new Date(now + 86400000) })] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-open-window`, projectRequest)] });
await expectStatus(200, ":commit", staff, { writes: [write(projectPath, { ...projectData, ...settings, updatedBy: staffEmail, from: "", to: "", opensAt: null, closesAt: null })] });

// Project pickup schedules override global days; legacy return-day restrictions are ignored.
const weeklyProject = { ...projectData, customWeekdays: true, pickupDays: [1], returnDays: [0] };
await expectStatus(200, ":commit", staff, { writes: [write(projectPath, { ...weeklyProject, updatedBy: staffEmail })] });
const weeklyRequest = { ...projectRequest, pickupDate: "2026-10-05", returnDate: "2026-10-11" };
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-weekly-valid`, weeklyRequest)] });
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-weekly-pickup`, { ...weeklyRequest, pickupDate: "2026-10-06" })] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-weekly-return`, { ...weeklyRequest, returnDate: "2026-10-12" })] });
for (let day = 5; day <= 11; day++) {
  await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-return-any-day-${day}`, { ...weeklyRequest, returnDate: `2026-10-${String(day).padStart(2, "0")}` })] });
}
await expectStatus(200, ":commit", staff, { writes: [write(`${projectPath}-pickup-only`, { ...projectData, updatedBy: staffEmail, customWeekdays: true, pickupDays: [1] })] });
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-weekly-order`, { ...weeklyRequest, returnDate: "2026-10-04" })] });
await expectStatus(403, ":commit", staff, { writes: [write(projectPath, { ...weeklyProject, updatedBy: staffEmail, pickupDays: [] })] });
await expectStatus(403, ":commit", staff, { writes: [write(projectPath, { ...weeklyProject, updatedBy: staffEmail, pickupDays: [7] })] });
await expectStatus(200, ":commit", staff, { writes: [write(projectPath, { ...weeklyProject, updatedBy: staffEmail, customWeekdays: false })] });
await expectStatus(200, ":commit", student, { writes: [write(`${requestPath}-weekly-disabled`, { ...weeklyRequest, pickupDate: "2026-10-06" })] });

// Only borrowing staff can delete catalog projects; historical requests remain readable.
await expectStatus(403, ":commit", student, { writes: [{ delete: `${root}/${projectPath}` }] });
await expectStatus(200, ":commit", staff, { writes: [{ delete: `${root}/${projectPath}` }] });
await expectStatus(404, `/${projectPath}`, staff);
await expectStatus(200, `/${requestPath}-project`, student);
await expectStatus(403, ":commit", student, { writes: [write(`${requestPath}-deleted-project`, projectRequest)] });

// Exercise the actual numbering function with a visible request ahead of the counter.
const source = await readFile(new URL("../js/features/borrow/app.borrow-assets.js", import.meta.url), "utf8");
const start = source.indexOf("  const createBorrowRequestWithNextNumber =");
const end = source.indexOf("  const readCurrentUserEmail =", start);
assert.ok(start >= 0 && end > start);
for (const [stored, visible, expected] of [[2, 8, 3], [undefined, 8, 9], [9, 2, 10]]) {
  const writes = [];
  const context = vm.createContext({
    getBorrowRequestNoParts: () => ({ termYY: "69", orgCode: "TEST", prefix: "B69.TEST" }),
    getNextBorrowRequestRunning: () => String(visible + 1),
    BORROW_REQUEST_COLLECTION: "borrowAssetRequests",
    BORROW_REQUEST_COUNTER_COLLECTION: "borrowAssetRequestCounters",
    firestore: {
      db: {}, doc: (...args) => args, collection: (...args) => args,
      serverTimestamp: () => "timestamp",
      runTransaction: async (_db, callback) => callback({
        get: async () => ({ exists: () => stored !== undefined, data: () => ({ lastRunning: stored }) }),
        set: (_ref, data) => writes.push(data)
      })
    }
  });
  await vm.runInContext(`${source.slice(start, end)}\ncreateBorrowRequestWithNextNumber({});`, context);
  assert.equal(writes[0].lastRunning, expected, `stored=${stored}, visible=${visible}`);
  assert.equal(writes[1].requestNo, `B69.TEST.${String(expected).padStart(3, "0")}`);
}
console.log("Borrow request rules and numbering tests passed.");
