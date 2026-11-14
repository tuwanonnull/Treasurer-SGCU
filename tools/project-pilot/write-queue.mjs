// Process-local only: Firestore transactions still enforce correctness across servers.
// A rejection must release the next request, not poison the rest of the queue.
const tails = new Map();
export function serializeTrialWrite(key, work) {
  const previous = tails.get(key) || Promise.resolve();
  const result = previous.then(work);
  const tail = result.then(() => {}, () => {});
  tails.set(key, tail);
  tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
  return result;
}
