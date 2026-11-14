import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createLiveRuntime} from './live-runtime.mjs';
import {createProductionPreflightAdapter} from './production-preflight.mjs';
import {loadProductionCandidate,sha256} from './production-candidate.mjs';
import {createLiveStore} from './live-store.mjs';
import {loadProjectRegistry,ADMIN_EMAIL} from '../../functions/project-live/auth.mjs';
const directory=process.argv[2],apply=process.argv.includes('--apply');
if(!directory)throw Error('Approved candidate directory required');
const candidate=await loadProductionCandidate(directory),acceptance=JSON.parse(await readFile(path.join(directory,'acceptance.json'),'utf8'));
const rt=createLiveRuntime({useFirebaseCli:true}),identity=createProductionPreflightAdapter({useFirebaseCli:true});
const bucket='sgcu-project-private-departmentwebsite-5aec1',project='departmentwebsite-5aec1';
try{
 const users=await loadProjectRegistry(rt.auth),head=Object.values(users).find(u=>u.role==='head'),admin=Object.values(users).find(u=>u.role==='admin');
 const account=await rt.auth.getUser(admin.id);if(account.disabled || !account.emailVerified || account.email?.toLowerCase()!==ADMIN_EMAIL)throw Error('Administrator account unavailable');
 const datasetId='year2568-initial';const store=await createLiveStore({candidate,acceptance,users,datasetId,db:rt.db});const view=await store.query(head.id);if(view.totalCount!==407)throw Error('Live source count changed');
 const bytes=Buffer.from(JSON.stringify({candidate,acceptance})),checksum=sha256(bytes),object=`project-live/sources/${checksum}.json`;
 const configRef=rt.db.collection('projectLiveConfig').doc('2568'),adminRef=rt.db.collection('projectSystemAdmins').doc(admin.id);
 if((await configRef.get()).exists || (await adminRef.get()).exists)throw Error('Runtime configuration or administrator already exists; review without overwriting');
 console.log(JSON.stringify({mode:apply?'apply':'plan',projects:view.totalCount,headEmail:'6534324223@student.chula.ac.th',adminEmail:ADMIN_EMAIL,privateBucket:bucket,sourceBytes:bytes.length,changesMoney:false}));
 if(!apply)process.exitCode=0;
 else{
  const request=async(url,options={})=>{const token=await identity.credential.getAccessToken();return fetch(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token.access_token}`}});};
  let response=await request(`https://storage.googleapis.com/storage/v1/b/${bucket}`);
  if(response.status===404)response=await request(`https://storage.googleapis.com/storage/v1/b?project=${project}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:bucket,location:'ASIA-SOUTHEAST3',storageClass:'STANDARD',iamConfiguration:{uniformBucketLevelAccess:{enabled:true},publicAccessPrevention:'enforced'}})});
  if(!response.ok)throw Error(`Private bucket unavailable: ${response.status}`);
  const metadata=await response.json();if(metadata.iamConfiguration?.publicAccessPrevention!=='enforced' || metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled!==true)throw Error('Private bucket access policy not enforced');
  const upload=await request(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&ifGenerationMatch=0&name=${encodeURIComponent(object)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:bytes});
  if(!upload.ok && upload.status!==412)throw Error(`Source upload failed: ${upload.status}`);
  const downloaded=await request(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(object)}?alt=media`);
  if(!downloaded.ok || sha256(Buffer.from(await downloaded.arrayBuffer()))!==checksum)throw Error('Uploaded source verification failed');
  await rt.db.runTransaction(async tx=>{
   const [config,existing,root]=await Promise.all([tx.get(configRef),tx.get(adminRef),tx.get(rt.db.collection('projectDatasets').doc(datasetId))]);
   if(config.exists || existing.exists || root.data()?.active!==true || root.data()?.headUid!==head.id)throw Error('Configuration changed');
   tx.create(configRef,{datasetId,sourceObject:object,sourceObjectSha256:checksum,users,academicYear:2568});
   tx.create(adminRef,{uid:admin.id,email:ADMIN_EMAIL,role:'admin',active:true});
   tx.create(rt.db.collection('projectAdminAudit').doc(),{action:'enable-administrator',actor:'operator-cli',authorization:'user-in-session',adminUid:admin.id,datasetId,at:new Date().toISOString()});
  });
  await writeFile(path.join(directory,'web-runtime-receipt.json'),JSON.stringify({datasetId,bucket,object,checksum,adminUid:admin.id,adminEnabled:true,financialDataChanged:false,preparedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({privateSourceVerified:true,adminEnabled:true,financialDataChanged:false}));
 }
}finally{await rt.close();await identity.close();}
