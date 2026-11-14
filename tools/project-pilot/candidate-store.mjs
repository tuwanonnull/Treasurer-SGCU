// Staging only: production adapters cannot pass the emulator guard.
import { createFirestoreTrial } from './firestore-trial.mjs';
import { restoreFirestoreBackup, validateFirestoreBackup } from './firestore-backup.mjs';
import { validateProductionCandidate, sha256 } from './production-candidate.mjs';
import { assertProjectEmulators } from './firebase-identity.mjs';
import { isDeepStrictEqual } from 'node:util';
function checked(candidate, users, datasetId) {
  if (!/^candidate68-[a-zA-Z0-9_-]+$/.test(datasetId)) throw new Error('Candidate dataset ID required');
  // Revalidate caller-owned objects; only accept a single head registry.
  const raw = Buffer.from(JSON.stringify(candidate.snapshot, null, 2));
  validateProductionCandidate(raw, candidate.manifest);
  const entries = Object.entries(users);
  if (entries.length !== 1 || entries[0][0] !== entries[0][1].id || entries[0][1].role !== 'head') throw new Error('Head-only registry required');
}
export function candidateIdentity(identity, datasetId) {
  assertProjectEmulators();
  return { ...identity, grantRef: (uid, year) => {
    if (year !== 2568) throw new Error('Wrong candidate year');
    return identity.db.collection('projectCandidateAccess').doc(datasetId).collection('members').doc(uid);
  } };
}
export async function createCandidateStore({ candidate, identity, users, datasetId }) {
  checked(candidate, users, datasetId);
  const store = await createFirestoreTrial({ snapshot: candidate.snapshot, identity: candidateIdentity(identity, datasetId),
    users, academicYear: 2568, trialId: datasetId, storageCollection: 'projectCandidates' });
  return { query: store.query, mutate: store.mutate, history: store.history,
    async backup(uid) {
      const archive = await store.backup(uid);
      const payload = { environment: 'emulator-rehearsal', candidateManifest: candidate.manifest, archive };
      return { format: 'SGCU-candidate-rehearsal-backup', version: 1, payload, checksum: sha256(JSON.stringify(payload)) };
    }
  };
}
export async function restoreCandidateBackup({ bundle, candidate, identity, users, datasetId }) {
  checked(candidate, users, datasetId);
  if (bundle?.format !== 'SGCU-candidate-rehearsal-backup' || bundle.version !== 1 || bundle.checksum !== sha256(JSON.stringify(bundle.payload)) ||
      bundle.payload.environment !== 'emulator-rehearsal' || !isDeepStrictEqual(bundle.payload.candidateManifest, candidate.manifest)) throw new Error('Not a matching candidate rehearsal backup');
  const archive = validateFirestoreBackup(bundle.payload.archive);
  if (!isDeepStrictEqual(archive.source, candidate.snapshot) || !isDeepStrictEqual(archive.users, users)) throw new Error('Backup source or users differ');
  // Recovery never creates or restores access grants.
  return restoreFirestoreBackup({ bundle: bundle.payload.archive, identity: candidateIdentity(identity, datasetId), trialId: datasetId, storageCollection: 'projectCandidates' });
}
