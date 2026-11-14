import { mkdir, writeFile, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateLiveBackup } from './live-store.mjs';
export async function createLiveBackupSchedule({ directory, datasetId, getBundle, now = () => Date.now() }) {
  await mkdir(directory,{ recursive:true,mode:0o700 });
  let last = null, failed = false, inFlight = null, retryAt = 0;
  const statusFile = path.join(directory,'status.json');
  try {
    const saved = JSON.parse(await readFile(statusFile,'utf8'));
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(saved.file) || saved.datasetId !== datasetId) throw Error('Invalid backup status');
    const bundle = JSON.parse(await readFile(path.join(directory,saved.file),'utf8'));
    const payload = validateLiveBackup(bundle);
    if (payload.datasetId !== datasetId || payload.createdAt !== saved.backupAt) throw Error('Backup metadata differs');
    last = saved;
  } catch(error) { if(error.code!=='ENOENT')failed=true; }
  const status = () => ({enabled:true,localOnly:true,backupAt:last?.backupAt || null,failed,overdue:!last || now()-Date.parse(last.backupAt)>86400000});
  async function run() {
    if (now()<retryAt || (!failed && last && now()-Date.parse(last.backupAt)<43200000))return;
    try {
      const bundle=await getBundle(), p=validateLiveBackup(bundle);
      if(p.datasetId!==datasetId || Math.abs(now()-Date.parse(p.createdAt))>300000)throw Error('Wrong or stale live backup');
      const file=`backup-${randomUUID()}.json`;
      await writeFile(path.join(directory,file),JSON.stringify(bundle),{flag:'wx',mode:0o600});
      const disk=JSON.parse(await readFile(path.join(directory,file),'utf8'));validateLiveBackup(disk);
      if(disk.checksum!==bundle.checksum)throw Error('Backup changed during write');
      const next={datasetId,file,backupAt:p.createdAt};
      const temporary=path.join(directory,`status-${randomUUID()}.tmp`);
      await writeFile(temporary,JSON.stringify(next),{flag:'wx',mode:0o600});await rename(temporary,statusFile);
      last=next;failed=false;retryAt=0;
    }catch{failed=true;retryAt=now()+3600000;}
  }
  const tick=()=>{if(!inFlight)inFlight=run().finally(()=>{inFlight=null;});return inFlight;};
  const timer=setInterval(()=>void tick(),60000);timer.unref();
  return {status,tick,stop:async()=>{clearInterval(timer);await inFlight;}};
}
