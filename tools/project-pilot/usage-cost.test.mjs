import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateOperationCosts, scenarioComparison } from './usage-cost.mjs';

test('unused free quota cannot be carried between days', () => {
  assert.equal(estimateOperationCosts([{ reads: 100000, writes: 0 }, { reads: 0, writes: 0 }]).incrementalBillableReads, 50000);
});
test('existing app consumes shared quota but its previous charges are not counted twice', () => {
  const result = estimateOperationCosts([{ reads: 1000, writes: 100, existingReads: 140000, existingWrites: 19950 }]);
  assert.equal(result.incrementalBillableReads, 1000); assert.equal(result.incrementalBillableWrites, 50);
  assert.equal(estimateOperationCosts([{ reads: 0, writes: 0, existingReads: 140000 }]).incrementalUsd, 0);
});
test('read and write free quotas are separate, and currency is an explicit assumption', () => {
  const result = estimateOperationCosts([{ reads: 0, writes: 120000 }], { thbPerUsd: 10 });
  assert.equal(result.incrementalBillableReads, 0); assert.equal(result.incrementalBillableWrites, 100000);
  assert.equal(result.incrementalUsd, 0.0945); assert.ok(Math.abs(result.incrementalThb - 0.945) < 1e-12);
});
test('scenario keeps busy days separate rather than averaging away their quota overruns', () => {
  const [team, low, high] = scenarioComparison({ documentReadEstimate: 85, committedWrites: 3 });
  assert.equal(team.freeQuotaOtherwiseUnused.incrementalThb, 0);
  assert.equal(low.people, 23); assert.equal(high.people, 34);
  assert.equal(high.freeQuotaOtherwiseUnused.incrementalBillableWrites, 1200);
  assert.ok(high.freeQuotaAlreadyUsedByOtherWork.incrementalThb > high.freeQuotaOtherwiseUnused.incrementalThb);
});
test('invalid and negative counts are rejected', () => {
  for (const reads of [-1, 1.1, NaN, Infinity]) assert.throws(() => estimateOperationCosts([{ reads, writes: 0 }]));
});
