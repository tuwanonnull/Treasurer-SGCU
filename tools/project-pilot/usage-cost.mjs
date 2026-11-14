// Planning estimates for document operations only; not a Cloud Billing meter.
export const PLANNING_PRICES = Object.freeze({
  region: 'asia-southeast3', edition: 'Standard', checkedAt: '2026-11-14',
  readUsdPer100k: 0.0315, writeUsdPer100k: 0.0945,
  freeReadsPerDay: 50000, freeWritesPerDay: 20000,
  source: 'https://cloud.google.com/firestore/pricing',
  evidence: 'Bangkok region table in official page HTML, Default consumption model, USD',
  thbPerUsdAssumption: 35
});
const count = n => Number.isSafeInteger(n) && n >= 0;
export function estimateOperationCosts(days, { prices = PLANNING_PRICES, thbPerUsd = prices.thbPerUsdAssumption } = {}) {
  if (!Array.isArray(days) || !Number.isFinite(thbPerUsd) || thbPerUsd <= 0) throw new Error('Invalid planning inputs');
  if (![prices.readUsdPer100k, prices.writeUsdPer100k].every(n => Number.isFinite(n) && n >= 0) || ![prices.freeReadsPerDay, prices.freeWritesPerDay].every(count)) throw new Error('Invalid unit prices or quotas');
  const result = { days: days.length, projectReads: 0, projectWrites: 0, incrementalBillableReads: 0, incrementalBillableWrites: 0 };
  for (const day of days) {
    const { reads, writes, existingReads = 0, existingWrites = 0 } = day;
    if (![reads, writes, existingReads, existingWrites, reads + existingReads, writes + existingWrites].every(count)) throw new Error('Counts must be safe nonnegative integers');
    // Free quota resets daily. Subtract the old application's charge, not its usage.
    const delta = (added, existing, free) => Math.max(0, added + existing - free) - Math.max(0, existing - free);
    result.projectReads += reads; result.projectWrites += writes;
    result.incrementalBillableReads += delta(reads, existingReads, prices.freeReadsPerDay);
    result.incrementalBillableWrites += delta(writes, existingWrites, prices.freeWritesPerDay);
    if (![result.projectReads, result.projectWrites, result.incrementalBillableReads, result.incrementalBillableWrites].every(count)) throw new Error('Monthly counts exceed safe range');
  }
  result.incrementalUsd = (result.incrementalBillableReads * prices.readUsdPer100k + result.incrementalBillableWrites * prices.writeUsdPer100k) / 100000;
  result.incrementalThb = result.incrementalUsd * thbPerUsd;
  return result;
}
export function scenarioComparison(profile, { normalDays = 27, busyDays = 3, normalActions = 50, busyActions = 200 } = {}) {
  if (![normalDays, busyDays, normalActions, busyActions].every(count)) throw new Error('Invalid scenario counts');
  return [1, 23, 34].map(people => {
    const days = [...Array(normalDays).fill(normalActions), ...Array(busyDays).fill(busyActions)].map(actions => ({ reads: actions * people * profile.documentReadEstimate, writes: actions * people * profile.committedWrites }));
    return { scope: people === 1 ? 'whole_team' : 'per_person', people: people === 1 ? null : people,
      freeQuotaOtherwiseUnused: estimateOperationCosts(days),
      freeQuotaAlreadyUsedByOtherWork: estimateOperationCosts(days.map(day => ({ ...day, existingReads: 50000, existingWrites: 20000 }))) };
  });
}
