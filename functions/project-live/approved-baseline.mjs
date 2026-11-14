import { isDeepStrictEqual } from 'node:util';
import { validateProductionCandidate, sha256 } from './production-candidate.mjs';
export const APPROVED_BASELINE = Object.freeze({
  academicYear: 2568,
  sourceSha256: '1adccd392562c31b805cf4218b54082b1a130a82c8d900b2cc2d9b2a38e66004',
  snapshotSha256: 'fefaef67f6001f35acb2f56adebbabcb27824ba852d93c8580760447a4f3a869',
  projectCount: 407
});
export function acceptBaseline(candidate) {
  const { manifest } = candidate;
  for (const [key, value] of Object.entries(APPROVED_BASELINE)) {
    if (!isDeepStrictEqual(manifest[key], value)) throw new Error('This is not the baseline approved by the user');
  }
  validateProductionCandidate(Buffer.from(JSON.stringify(candidate.snapshot, null, 2)), manifest);
  return { schemaVersion: 1, kind: 'SGCU-baseline-acceptance', decision: 'accepted',
    acceptedOn: '2026-11-14', timezone: 'Asia/Bangkok', evidence: 'User confirmed the displayed 407-project year-2568 original-source totals in this conversation',
    ...structuredClone(APPROVED_BASELINE), totals: structuredClone(manifest.totals), scope: 'initial-data-only', accessActivated: false, productionWritten: false };
}
export function buildApprovedBaselineImport(candidate, acceptance) {
  const expected = acceptBaseline(candidate);
  if (!isDeepStrictEqual(acceptance, expected)) throw new Error('Acceptance does not match approved source and totals');
  const baselineId = `year2568-${expected.snapshotSha256}`;
  const root = `projectBaselines/${baselineId}`;
  const docs = candidate.snapshot.projects.map(project => ({ path: `${root}/projects/${sha256(project.id)}`,
    data: { sourceId: project.id, academicYear: 2568, payload: JSON.stringify(project) } }));
  const { projects, ...sourceMetadata } = candidate.snapshot;
  docs.push({ path: `${root}/metadata/source`, data: { payload: JSON.stringify(sourceMetadata) } });
  docs.push({ path: root, data: { format: 'SGCU-approved-baseline', version: 1, academicYear: 2568,
    snapshotSha256: expected.snapshotSha256, sourceSha256: expected.sourceSha256, projectCount: docs.length - 1,
    status: 'imported-inactive', accessActivated: false, acceptance: JSON.stringify(acceptance) } });
  // One atomic create batch: never expose a partially ready baseline or overwrite an existing one.
  if (docs.length > 450 || Buffer.byteLength(JSON.stringify(docs)) > 8 * 1024 * 1024) throw new Error('Baseline exceeds atomic import limit');
  return { format: 'SGCU-approved-baseline-import', version: 1, projectId: 'departmentwebsite-5aec1',
    baselineId, documentCount: docs.length, activatesAccess: false, writes: docs };
}
export async function importApprovedBaseline({ candidate, acceptance, db }) {
  const plan = buildApprovedBaselineImport(candidate, acceptance);
  const batch = db.batch();
  for (const write of plan.writes) batch.create(db.doc(write.path), write.data);
  await batch.commit();
  return { baselineId: plan.baselineId, documents: plan.documentCount, accessActivated: false };
}
export async function verifyApprovedBaseline({ candidate, acceptance, db }) {
  const plan = buildApprovedBaselineImport(candidate, acceptance);
  const projects = await db.collection(`projectBaselines/${plan.baselineId}/projects`).get();
  if (projects.size !== candidate.snapshot.projects.length) throw new Error('Imported baseline count differs');
  const all = new Map(projects.docs.map(doc => [doc.ref.path, doc.data()]));
  for (const write of plan.writes) {
    const actual = all.has(write.path) ? all.get(write.path) : (await db.doc(write.path).get()).data();
    if (!isDeepStrictEqual(actual, write.data)) throw new Error('Imported baseline differs from approved original');
  }
  return { verified: true, projects: projects.size, baselineId: plan.baselineId, accessActivated: false };
}
