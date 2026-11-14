import { isDeepStrictEqual } from 'node:util';
import { createFinanceTrial } from './finance-trial.mjs';

// Full archives are loaded only for backup/migration, never for ordinary edits.
export function materializeCheckpoint(source, users, checkpoint, requests, events, options = {}) {
  const id = checkpoint.data.projects[0].id;
  const state = structuredClone(checkpoint);
  state.schemaVersion = 1; delete state.statusEditors;
  state.requests = requests.filter(r => r.projectId === id);
  state.audit = events.filter(e => e.projectId === id);
  const model = createFinanceTrial(source, { users, ...options }); model.importState(state);
  if (!isDeepStrictEqual(model.exportCompactState(), checkpoint)) throw new Error('Archived history does not match current checkpoint');
  return model.exportState();
}
