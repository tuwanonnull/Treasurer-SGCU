import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Fetch only the position catalog; never read people or write to Firestore.
const repo = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const project = JSON.parse(await readFile(path.join(repo, '.firebaserc'), 'utf8')).projects.default;
if (project !== 'departmentwebsite-5aec1' || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Unexpected project/environment');
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const cli = require(path.join(process.env.FIREBASE_TOOLS_DIR || path.resolve(path.dirname(process.execPath), '../lib/node_modules/firebase-tools'), 'lib/auth.js'));
const decode = value => {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k,v]) => [k,decode(v)]));
  throw new Error('Unsupported catalog field type');
};
try {
  const account = cli.getProjectDefaultAccount(repo);
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI sign-in required');
  const token = await cli.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const positions = [];
  let pageToken = '';
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/staffPositionCatalog`);
    url.searchParams.set('pageSize', '300');
    for (const field of ['name','divisionCodeYY','divisionLabel','divisionName','levelCodeZZ','allowedPages']) url.searchParams.append('mask.fieldPaths', field);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Catalog read failed: HTTP ${response.status}`);
    const result = await response.json();
    for (const doc of result.documents || []) positions.push({ id: doc.name.split('/').at(-1), ...Object.fromEntries(Object.entries(doc.fields || {}).map(([k,v]) => [k,decode(v)])) });
    pageToken = result.nextPageToken || '';
  } while (pageToken);
  const output = path.join(repo, '.local/staff-position-preview/catalog.json');
  await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, JSON.stringify({ project, source: 'production-read-only', fetchedAt: new Date().toISOString(), positions }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ positions: positions.length, source: 'production-read-only', firestoreWrites: 0, output }));
} catch (error) {
  // Do not print SDK errors/requests, which may contain authorization details.
  console.error(error.message.startsWith('Catalog read failed:') ? error.message : 'Catalog read unavailable. Check Firebase CLI sign-in and network access.');
  process.exitCode = 1;
}
