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
  key, typeof value === "number" ? { integerValue: String(value) } : { stringValue: value }
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
