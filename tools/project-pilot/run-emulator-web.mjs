import { readFile } from 'node:fs/promises';
import { createLoginFixture } from './emulator-fixture.mjs';
import { createAuthenticatedPilotServer } from './emulator-server.mjs';
import path from 'node:path';
import { homedir } from 'node:os';

if (!process.argv[2]) throw new Error('Provide private year68 snapshot path');
const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
const fixture = await createLoginFixture(2568, 'local', { retain: true });
const seed = process.argv[3] ? JSON.parse(await readFile(process.argv[3], 'utf8')) : null;
const backupDirectory = path.join(homedir(), 'Library', 'Application Support', 'SGCU-Project-Pilot', 'automatic-backups');
const server = await createAuthenticatedPilotServer({ snapshot, identity: fixture.identity, users: fixture.users, academicYear: 2568, seed, trialId: process.env.PROJECT_TRIAL_ID || 'year68-local', backupDirectory, staffReviewFile: process.env.PROJECT_STAFF_REVIEW_FILE || null });
let stopping = false;
const stop = async () => {
  if (stopping) return; stopping = true;
  await server.stopBackups();
  await new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); });
  await fixture.close();
};
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop);
server.on('error', async error => { console.error(error.message); await fixture.close(); process.exitCode = 1; });
server.listen(4187, '127.0.0.1', () => {
  console.log('Authenticated local trial: http://127.0.0.1:4187');
  console.log('Emulator-only accounts: head-local@example.test, secretary-local@example.test, assistanta-local@example.test, assistantb-local@example.test');
  console.log('Shared emulator-only password: Local-trial-12345');
  console.log('Project changes saved in Firestore Emulator. Export emulator data before stopping the emulator.');
});
