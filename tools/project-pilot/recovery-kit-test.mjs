import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRecoveryKit, verifyRecoveryKit } from './recovery-kit.mjs';
const file = process.argv[2];
if (!file) throw new Error('Provide backup file');
const temp = await mkdtemp(path.join(tmpdir(), 'sgcu-kit-test-'));
try {
  const kit = path.join(temp, 'kit');
  await createRecoveryKit(file, kit);
  const manifest = path.join(kit, 'manifest.json'), backup = path.join(kit, 'backup.json');
  assert.equal((await verifyRecoveryKit(manifest, backup)).verified, true);
  const original = await readFile(backup);
  await assert.rejects(createRecoveryKit(file, kit), e => e.code === 'EEXIST');
  assert.deepEqual(await readFile(backup), original);
  const changed = path.join(temp, 'changed.json');
  await writeFile(changed, original.toString() + '\n');
  await assert.rejects(verifyRecoveryKit(manifest, changed), /does not match/);
  await writeFile(changed, original.subarray(0, original.length / 2));
  await assert.rejects(verifyRecoveryKit(manifest, changed));
  const invalidDestination = path.join(temp, 'invalid');
  await assert.rejects(createRecoveryKit(changed, invalidDestination));
  await assert.rejects(readFile(path.join(invalidDestination, 'backup.json')), e => e.code === 'ENOENT');
  console.log('PASS: valid kit, no overwrite, byte changes and truncation detected, invalid input creates no kit');
} finally { await rm(temp, { recursive: true, force: true }); }
