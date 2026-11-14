import { createHash } from 'node:crypto';
import { createFinanceTrial } from './finance-trial.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createPortableBackup(source, checkpoint) {
  const verified = createFinanceTrial(source); verified.importState(checkpoint);
  const payload = { createdAt: new Date().toISOString(), source: structuredClone(source), checkpoint: verified.exportState() };
  return { format: 'SGCU-project-pilot-backup', version: 1, checksum: digest(payload), payload };
}

export function validatePortableBackup(bundle) {
  if (bundle?.format !== 'SGCU-project-pilot-backup' || bundle.version !== 1 || bundle.checksum !== digest(bundle.payload)) throw new Error('Invalid portable backup or checksum mismatch');
  const payload = bundle.payload;
  if (!Number.isFinite(Date.parse(payload.createdAt))) throw new Error('Invalid backup timestamp');
  const model = createFinanceTrial(payload.source); model.importState(payload.checkpoint);
  return { source: structuredClone(payload.source), checkpoint: model.exportState(), createdAt: payload.createdAt };
}
