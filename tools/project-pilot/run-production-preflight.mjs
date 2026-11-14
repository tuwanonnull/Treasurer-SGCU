import { createProductionPreflightAdapter } from './production-preflight.mjs';
import { createPreflightServer } from './preflight-server.mjs';
import { loadProductionCandidate } from './production-candidate.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const adapter = createProductionPreflightAdapter({ useFirebaseCli: process.argv.includes('--firebase-cli') });
const directory = process.env.PROJECT_CANDIDATE_DIRECTORY;
if (directory) await loadProductionCandidate(directory); // Fail startup on invalid source, never serve stale totals.
const loadAcceptance = directory ? async () => {
  try { return JSON.parse(await readFile(path.join(directory, 'acceptance.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
} : undefined;
const server = createPreflightServer({ ...adapter, loadAcceptance, loadCandidate: directory ? () => loadProductionCandidate(directory) : undefined });
let closing = false;
const stop = async () => {
  if (closing) return; closing = true;
  await new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); });
  await adapter.close();
};
server.on('error', async () => { console.error('Unable to start preflight server'); await stop(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop);
server.listen(4188, '127.0.0.1', () => console.log('Login readiness only: http://127.0.0.1:4188 · no project writes'));
