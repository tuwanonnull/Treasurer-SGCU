import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { randomUUID } from 'node:crypto';
import { createProjectService } from './service.mjs';
import { validateLiveBackup, createLiveStore } from './live-store.mjs';
import { acceptBaseline } from './approved-baseline.mjs';
import { sha256 } from './production-candidate.mjs';
import { isDeepStrictEqual } from 'node:util';
const bucketName='sgcu-project-private-departmentwebsite-5aec1';
const origins=new Set(['https://treasurer.sgcu.in.th','https://treasurersgcu68.github.io','https://departmentwebsite-5aec1.web.app','https://departmentwebsite-5aec1.firebaseapp.com']);
const sourceCache=new Map();
function runtime(){
  if(!getApps().length)initializeApp();
  const db=getFirestore(),auth=getAuth(),bucket=getStorage().bucket(bucketName);
  const loadOptions=async()=>{
    const config=(await db.collection('projectLiveConfig').doc('2568').get()).data();
    if(!config || !/^project-live\/sources\/[a-f0-9]{64}\.json$/.test(config.sourceObject) || !/^[a-f0-9]{64}$/.test(config.sourceObjectSha256))throw Error('Project source configuration unavailable');
    let source=sourceCache.get(config.sourceObjectSha256);
    if(!source){
      const [bytes]=await bucket.file(config.sourceObject).download();
      if(sha256(bytes)!==config.sourceObjectSha256)throw Error('Source object integrity mismatch');
      source=JSON.parse(bytes);if(!isDeepStrictEqual(acceptBaseline(source.candidate),source.acceptance))throw Error('Source approval mismatch');
      sourceCache.clear();sourceCache.set(config.sourceObjectSha256,source);
    }
    return {...structuredClone(source),users:config.users,datasetId:config.datasetId,db};
  };
  const saveBackup=async(bundle,kind='scheduled')=>{
    const p=validateLiveBackup(bundle),object=`project-live/backups/${p.datasetId}/${kind}-${randomUUID()}.json`;
    const file=bucket.file(object);
    await file.save(JSON.stringify(bundle),{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:'application/json',cacheControl:'private, no-store'}});
    const [bytes]=await file.download(),disk=JSON.parse(bytes);validateLiveBackup(disk);
    if(disk.checksum!==bundle.checksum)throw Error('Offsite backup changed after upload');
    const status={object,backupAt:p.createdAt,datasetId:p.datasetId,auditCount:p.auditOrder.length,checksum:bundle.checksum,verified:true,failed:false};
    await db.collection('projectBackupStatus').doc('2568').set(status);
    return status;
  };
  return {db,auth,loadOptions,saveBackup};
}
export const projectLiveApi=onRequest({region:'asia-southeast1',memory:'512MiB',timeoutSeconds:120,maxInstances:1,concurrency:1,minInstances:0},async(req,res)=>{
  res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.set('Vary','Origin');
  const origin=req.get('origin');
  if(origin && !origins.has(origin))return res.status(403).json({error:'ไม่อนุญาตเว็บไซต์นี้'});
  if(origin){res.set('Access-Control-Allow-Origin',origin);res.set('Access-Control-Allow-Headers','Authorization, Content-Type');res.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');}
  if(req.method==='OPTIONS')return res.status(204).end();
  try{
    const rt=runtime(),service=createProjectService(rt);
    const url=new URL(req.originalUrl,'https://local.invalid'),action=url.pathname.replace(/^\/api\/year68\/live\/?/,'').replace(/^\//,'');
    if(!['','history','backup','preview','commit','status-preview','status','access','restore'].includes(action))return res.status(404).json({error:'ไม่พบคำสั่ง'});
    if(req.method==='POST' && (!req.is('application/json') || (req.rawBody?.length || 0)>(action==='restore'?8*1024*1024:10000)))return res.status(400).json({error:'รูปแบบหรือขนาดคำขอไม่ถูกต้อง'});
    const result=await service.handle({authorization:req.get('authorization'),method:req.method,action,body:req.body,params:url.searchParams});
    if(action==='backup')res.set('Content-Disposition','attachment; filename="sgcu-year2568-live-backup.json"');
    if(action===''){
      const backup=(await rt.db.collection('projectBackupStatus').doc('2568').get()).data();
      result.automaticBackup={enabled:true,localOnly:false,backupAt:backup?.backupAt || null,failed:backup?.failed===true,overdue:!backup?.backupAt || backup.datasetId!==result.datasetId || Date.now()-Date.parse(backup.backupAt)>86400000};
    }
    return res.status(200).json(result);
  }catch(error){console.error('projectLiveApi',error.status||error.code||'internal');return res.status(error.status||503).json({error:error.status?error.message:'ดำเนินการไม่สำเร็จ กรุณาลองใหม่'});}
});
export const projectLiveBackup=onSchedule({region:'asia-southeast1',schedule:'0 */12 * * *',timeZone:'Asia/Bangkok',memory:'512MiB',timeoutSeconds:300,maxInstances:1,minInstances:0,retryCount:3,minBackoffSeconds:3600},async()=>{
  const rt=runtime();
  try{
    const options=await rt.loadOptions(),store=await createLiveStore(options);
    const admin=Object.values(options.users).find(u=>u.role==='admin');
    if(!admin)throw Error('Backup administrator unavailable');
    const account=await rt.auth.getUser(admin.id);
    if(account.disabled || !account.emailVerified || account.email?.toLowerCase()!=='tuwanon.kimchiang@gmail.com')throw Error('Backup administrator disabled');
    await rt.saveBackup(await store.backup(admin.id));
  }catch(error){await rt.db.collection('projectBackupStatus').doc('2568').set({failed:true,failureAt:new Date().toISOString()},{merge:true});throw error;}
});
