import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeTrialWrite } from './write-queue.mjs';

test('writes to the same trial wait while unrelated trials can proceed', async () => {
  let release; const held = new Promise(resolve => { release = resolve; });
  const calls = [];
  const first = serializeTrialWrite('same', async () => { calls.push('first'); await held; calls.push('first-done'); });
  const second = serializeTrialWrite('same', async () => { calls.push('second'); });
  await serializeTrialWrite('other', async () => { calls.push('other'); });
  assert.deepEqual(calls, ['first', 'other']); release(); await Promise.all([first, second]);
  assert.deepEqual(calls, ['first', 'other', 'first-done', 'second']);
});
test('a failed write releases the queue and keeps its error for the caller', async () => {
  const first = serializeTrialWrite('failure', async () => { throw new Error('rejected'); });
  const second = serializeTrialWrite('failure', async () => 'saved');
  await assert.rejects(first, /rejected/); assert.equal(await second, 'saved');
  assert.equal(await serializeTrialWrite('failure', async () => 'later'), 'later');
});
