import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { createLiveRuntime } from './live-runtime.mjs';
import { loadProductionCandidate } from './production-candidate.mjs';
import { createLiveStore } from './live-store.mjs';
import { createLiveApiServer } from './live-api.mjs';
import { createLiveBackupSchedule } from './live-backup.mjs';
import { loadProjectRegistry } from '../../functions/project-live/auth.mjs';
const [directory,datasetId]=process.argv.slice(2);
if(!directory || !datasetId)throw Error('Provide approved candidate directory and existing live dataset ID');
const candidate=await loadProductionCandidate(directory), acceptance=JSON.parse(await readFile(path.join(directory,'acceptance.json'),'utf8'));
const runtime=createLiveRuntime({useFirebaseCli:process.argv.includes('--firebase-cli')});
try {
  const head=await runtime.auth.getUserByEmail('6534324223@student.chula.ac.th');
  if(head.disabled || !head.emailVerified)throw Error('Head account is not active and verified');
  const users=await loadProjectRegistry(runtime.auth);
  const store=await createLiveStore({candidate,acceptance,users,datasetId,db:runtime.db});
  const backups=await createLiveBackupSchedule({directory:path.join(homedir(),'Library','Application Support','SGCU-Project-Pilot','live-backups',datasetId),datasetId,getBundle:async()=>{
    const user=await runtime.auth.getUser(head.uid);
    if(user.disabled || !user.emailVerified || user.email?.toLowerCase()!=='6534324223@student.chula.ac.th')throw Error('Head account changed');
    return store.backup(head.uid);
  }});
  const server=createLiveApiServer({authenticate:runtime.authenticate,store:{...store,query:async(...args)=>({...await store.query(...args),automaticBackup:backups.status()})}});
  let closing=false;
  const close=async()=>{if(closing)return;closing=true;await backups.stop();await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});await runtime.close();};
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,close);
  server.on('error',async()=>{await close();process.exitCode=1;});
  server.listen(4189,'127.0.0.1',()=>{console.log('Live API: http://127.0.0.1:4189 (existing dataset only; never auto-imports or activates)');void backups.tick();});
}catch(error){await runtime.close();throw error;}
