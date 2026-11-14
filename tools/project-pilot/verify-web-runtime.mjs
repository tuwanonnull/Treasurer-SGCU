import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createLiveRuntime} from './live-runtime.mjs';
import {createProductionPreflightAdapter} from './production-preflight.mjs';
import {loadProductionCandidate,sha256} from './production-candidate.mjs';
import {createLiveStore,validateLiveBackup} from './live-store.mjs';
const directory=process.argv[2],rt=createLiveRuntime({useFirebaseCli:true}),identity=createProductionPreflightAdapter({useFirebaseCli:true});
const bucket='sgcu-project-private-departmentwebsite-5aec1';
try{
 const cfg=(await rt.db.collection('projectLiveConfig').doc('2568').get()).data();
 const candidate=await loadProductionCandidate(directory),acceptance=JSON.parse(await readFile(path.join(directory,'acceptance.json'),'utf8'));
 const store=await createLiveStore({db:rt.db,candidate,acceptance,users:cfg.users,datasetId:cfg.datasetId});
 const admin=Object.values(cfg.users).find(u=>u.role==='admin');
 const state=await store.query(admin.id);console.log(JSON.stringify({administratorRole:state.user.role,projects:state.totalCount,datasetId:state.datasetId}));
 const request=async(url,options={})=>{const token=await identity.credential.getAccessToken();return fetch(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token.access_token}`}});};
 const policy=await request(`https://storage.googleapis.com/storage/v1/b/${bucket}/iam`);if(!policy.ok)throw Error(`Bucket IAM ${policy.status}`);
 const bindings=(await policy.json()).bindings||[];if(bindings.some(b=>b.members.some(m=>['allUsers','allAuthenticatedUsers'].includes(m))))throw Error('Bucket has public IAM');
 const source=await request(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(cfg.sourceObject)}?alt=media`);if(!source.ok || sha256(Buffer.from(await source.arrayBuffer()))!==cfg.sourceObjectSha256)throw Error('Private source mismatch');
 console.log('PASS: administrator reads current production data; private source and bucket IAM verified');
 if(process.argv.includes('--run-backup')){
  const result=await request('https://cloudscheduler.googleapis.com/v1/projects/departmentwebsite-5aec1/locations/asia-southeast1/jobs/firebase-schedule-projectLiveBackup-asia-southeast1:run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!result.ok)throw Error(`Backup job start failed: ${result.status} ${await result.text()}`);console.log('Cloud backup job requested');
 }
 const status=(await rt.db.collection('projectBackupStatus').doc('2568').get()).data();
 if(status?.verified){
  const response=await request(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(status.object)}?alt=media`);if(!response.ok)throw Error(`Backup download ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer()),bundle=JSON.parse(bytes),payload=validateLiveBackup(bundle);if(bundle.checksum!==status.checksum)throw Error('Backup status mismatch');
  const file=path.join(directory,`cloud-backup-${bundle.checksum}.json`);try{await writeFile(file,bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
  console.log(JSON.stringify({cloudBackupVerified:true,failed:status.failed,datasetId:payload.datasetId,backupAt:status.backupAt,auditCount:payload.auditOrder.length,privateLocalFile:file}));
 }else console.log('Cloud backup not verified yet');
}finally{await rt.close();await identity.close();}
