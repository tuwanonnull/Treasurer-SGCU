import { readFile, stat } from 'node:fs/promises';
import { createEmulatorIdentity } from './firebase-identity.mjs';
import { restoreFirestoreBackup } from './firestore-backup.mjs';

const [, , file, trialId] = process.argv;
if (!file || !trialId) throw new Error('Usage: node restore-firestore-backup.mjs backup.json NEW_TRIAL_ID');
if ((await stat(file)).size > 100 * 1024 * 1024) throw new Error('Backup too large');
const bundle = JSON.parse(await readFile(file, 'utf8')), identity = createEmulatorIdentity();
try { console.log(JSON.stringify(await restoreFirestoreBackup({ bundle, identity, trialId }))); }
finally { await identity.close(); }
