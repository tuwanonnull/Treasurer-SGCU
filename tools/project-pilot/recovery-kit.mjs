import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateFirestoreBackup } from './firestore-backup.mjs';

export async function readBackup(file) {
  if ((await stat(file)).size > 100 * 1024 * 1024) throw new Error('Backup too large');
  const bytes = await readFile(file), bundle = JSON.parse(bytes);
  validateFirestoreBackup(bundle);
  return { bytes, bundle };
}
export async function createRecoveryKit(file, directory) {
  const { bytes, bundle } = await readBackup(file);
  const manifest = { format: 'SGCU-recovery-kit', version: 1, preparedAt: new Date().toISOString(),
    backupAt: bundle.payload.createdAt, file: 'backup.json', bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    projects: bundle.payload.checkpoints.length, audit: bundle.payload.auditOrder.length,
    offsiteVerified: false, includesAccountsOrGrants: false };
  // Refuse existing directories; never replace the last working backup.
  await mkdir(directory, { mode: 0o700 });
  await writeFile(path.join(directory, 'backup.json'), bytes, { mode: 0o600, flag: 'wx' });
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });
  await writeFile(path.join(directory, 'RECOVERY.txt'), `ชุดสำรองส่วนโครงการ — ยังไม่ถือว่าสำรองนอกเครื่องจนส่งและดาวน์โหลดกลับมาตรวจแล้ว

1. เก็บทั้งโฟลเดอร์ในพื้นที่ที่จำกัดสิทธิ์ ห้ามเปิดลิงก์สาธารณะ ไฟล์นี้ไม่ได้เข้ารหัส
2. ดาวน์โหลด backup.json กลับจากปลายทาง แล้วตรวจด้วย:
   node tools/project-pilot/verify-recovery-kit.mjs PATH_TO_MANIFEST PATH_TO_DOWNLOADED_BACKUP
3. ในเครื่องที่มีโค้ดและ Auth/Firestore Emulator ตามคู่มือโครงการ ซ้อมกู้คืนด้วย:
   GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/recovery-drill.mjs PATH_TO_DOWNLOADED_BACKUP
4. หากต้องกู้ใช้งาน ให้ใช้ restore-firestore-backup.mjs ลงชื่อชุดใหม่ตาม README แล้วเลือกชุดนั้นด้วย PROJECT_TRIAL_ID ตรวจบัญชี สิทธิ์ ยอด สถานะ และคำขอ ก่อนเปิดให้ทีมใช้

ชุดนี้มีข้อมูลโครงการและประวัติ ไม่รวมบัญชีล็อกอิน รหัสผ่าน สิทธิ์เข้าใช้งาน โค้ด runtime หรือไฟล์ Google Drive ที่ลิงก์ไว้ ต้องเตรียมส่วนเหล่านี้แยกต่างหาก การซ้อมข้อมูลใน Emulator ที่เปิดอยู่ไม่ใช่การทดสอบกรณีเครื่องสูญหายทั้งเครื่อง
เก็บรุ่นก่อนหน้าที่ตรวจผ่านไว้จนกว่าจะตรวจรุ่นใหม่สำเร็จ การกู้คืนได้ถึงเวลาสำรองเท่านั้น งานหลังจากนั้นอาจหาย ระยะข้อมูลที่ยอมให้หายต้องตกลงเพิ่มเติม
`, { mode: 0o600, flag: 'wx' });
  return manifest;
}
export async function verifyRecoveryKit(manifestFile, backupFile) {
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const { bytes, bundle } = await readBackup(backupFile);
  if (manifest.format !== 'SGCU-recovery-kit' || manifest.version !== 1 || manifest.bytes !== bytes.length ||
      manifest.sha256 !== createHash('sha256').update(bytes).digest('hex') || manifest.backupAt !== bundle.payload.createdAt ||
      manifest.projects !== bundle.payload.checkpoints.length || manifest.audit !== bundle.payload.auditOrder.length) throw new Error('Recovery kit does not match backup');
  return { verified: true, projects: manifest.projects, audit: manifest.audit, backupAt: manifest.backupAt, sha256: manifest.sha256 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , file, directory] = process.argv;
  if (!file || !directory) throw new Error('Usage: node recovery-kit.mjs BACKUP_FILE NEW_DIRECTORY');
  console.log(JSON.stringify(await createRecoveryKit(file, directory), null, 2));
}
