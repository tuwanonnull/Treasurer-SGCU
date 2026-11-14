import { verifyRecoveryKit } from './recovery-kit.mjs';
const [, , manifest, backup] = process.argv;
if (!manifest || !backup) throw new Error('Usage: node verify-recovery-kit.mjs MANIFEST DOWNLOADED_BACKUP');
console.log(JSON.stringify(await verifyRecoveryKit(manifest, backup), null, 2));
