import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validateYear68Snapshot } from './year68.mjs';
import { calculateMoney } from './finance.mjs';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function validateProductionCandidate(snapshotBytes, manifest) {
  if (manifest?.schemaVersion !== 1 || manifest.academicYear !== 2568 || manifest.purpose !== 'production-candidate' ||
      manifest.status !== 'awaiting-review' || manifest.activated !== false || manifest.writesPerformed !== false ||
      manifest.sourceKind !== 'reviewed-original-xlsx' || manifest.trialDataImported !== false ||
      !/^[a-f0-9]{64}$/.test(manifest.sourceSha256) || manifest.snapshotSha256 !== sha256(snapshotBytes) ||
      ['assignments', 'grants', 'pendingRequests', 'audit'].some(k => !Array.isArray(manifest[k]) || manifest[k].length)) {
    throw new Error('Invalid production candidate provenance; trial data is not accepted');
  }
  const snapshot = validateYear68Snapshot(JSON.parse(snapshotBytes));
  if (!snapshot.projects.length || snapshot.sourceSha256 !== manifest.sourceSha256 || snapshot.projects.length !== manifest.projectCount ||
      !isDeepStrictEqual(snapshot.totals, manifest.totals)) throw new Error('Candidate does not match manifest');
  for (const p of snapshot.projects) {
    if (!isDeepStrictEqual(calculateMoney(p), p.money)) throw new Error('Candidate money reconciliation failed');
  }
  return { snapshot, manifest: structuredClone(manifest) };
}
export async function loadProductionCandidate(directory) {
  const [raw, manifest] = await Promise.all([readFile(path.join(directory, 'snapshot.json')), readFile(path.join(directory, 'manifest.json'), 'utf8')]);
  return validateProductionCandidate(raw, JSON.parse(manifest));
}
export function candidateSummary(candidate) {
  return { academicYear: 2568, status: 'awaiting-review', activated: false, sourceKind: 'reviewed-original-xlsx',
    projectCount: candidate.snapshot.projects.length, totals: candidate.snapshot.totals, moneyLabels: candidate.snapshot.moneyLabels,
    snapshotSha256: candidate.manifest.snapshotSha256, sourceSha256: candidate.manifest.sourceSha256,
    trialDataImported: false, externalDataFreshnessVerified: false };
}
