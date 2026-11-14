// Explicit operator workflow. Merely starting the API never invokes these operations.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createLiveRuntime } from './live-runtime.mjs';
import { loadProductionCandidate } from './production-candidate.mjs';
import { acceptBaseline } from './approved-baseline.mjs';
import { initializeLiveDataset,verifyInactiveLiveDataset,activateLiveDataset,restoreLiveBackup } from './live-store.mjs';
const [action,directory,datasetId,backupFile]=process.argv.slice(2);
if(!['plan','initialize','verify','activate','restore'].includes(action) || !directory || !datasetId)throw Error('Usage: live-admin.mjs plan|initialize|verify|activate|restore CANDIDATE_DIRECTORY DATASET_ID [BACKUP_FILE] [--firebase-cli] [--apply]');
if(['initialize','activate','restore'].includes(action) && !process.argv.includes('--apply'))throw Error('Mutation requires explicit --apply');
const candidate=await loadProductionCandidate(directory),acceptance=JSON.parse(await readFile(path.join(directory,'acceptance.json'),'utf8'));
if(JSON.stringify(acceptance)!==JSON.stringify(acceptBaseline(candidate)))throw Error('Acceptance differs');
const runtime=createLiveRuntime({useFirebaseCli:process.argv.includes('--firebase-cli')});
try{
  const head=await runtime.auth.getUserByEmail('6534324223@student.chula.ac.th');
  if(head.disabled || !head.emailVerified)throw Error('Head account unavailable');
  const options={candidate,acceptance,db:runtime.db,auth:runtime.auth,users:{[head.uid]:{id:head.uid,role:'head',name:'เหรัญญิกปี 2568'}},datasetId};
  let result;
  if(action==='plan'){
    const root=await runtime.db.collection('projectDatasets').doc(datasetId).get();
    const members=await runtime.db.collection('projectAccess').doc('2568').collection('members').get();
    result={action:'plan',academicYear:2568,projects:407,headEmail:head.email,datasetExists:root.exists,existingGrants:members.size,initializesInactive:true,writesPerformed:false};
  }else if(action==='initialize')result=await initializeLiveDataset(options);
  else if(action==='verify')result=await verifyInactiveLiveDataset(options);
  else if(action==='activate')result=await activateLiveDataset(options);
  else {if(!backupFile || backupFile.startsWith('--'))throw Error('Backup file required');result=await restoreLiveBackup({bundle:JSON.parse(await readFile(backupFile,'utf8')),db:runtime.db,datasetId});}
  console.log(JSON.stringify(result));
}finally{await runtime.close();}
