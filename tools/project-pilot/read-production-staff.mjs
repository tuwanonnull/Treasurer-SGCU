import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { readStaffProjectAccess } from './staff-access-review.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo=fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const [snapshotFile, outputFile, project] = process.argv.slice(2);
if (!snapshotFile || !outputFile || project !== 'departmentwebsite-5aec1') throw new Error('Usage: node read-production-staff.mjs SNAPSHOT_FILE PRIVATE_OUTPUT_FILE departmentwebsite-5aec1');
const config=JSON.parse(await readFile(repo+'/.firebaserc','utf8'));
if(config.projects.default!=='departmentwebsite-5aec1') throw new Error('Unexpected Firebase project');
if(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Unexpected emulator configuration');
const require=createRequire(repo+'/functions/package.json');
const cli=require(path.join(process.env.FIREBASE_TOOLS_DIR || path.resolve(path.dirname(process.execPath), '../lib/node_modules/firebase-tools'), 'lib/auth.js'));
const account=cli.getProjectDefaultAccount(repo);
if(!account?.tokens?.refresh_token) throw new Error('Firebase CLI sign-in required');
const { initializeApp, deleteApp }=require('firebase-admin/app');

const { getAuth }=require('firebase-admin/auth');
const app=initializeApp({projectId:config.projects.default,credential:{async getAccessToken(){const t=await cli.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);return {access_token:t.access_token,expires_in:Math.max(60,Math.floor((t.expires_at-Date.now())/1000)||3000)};}}},'staff-read-only');
const decode = value => {
 if ('stringValue' in value) return value.stringValue;
 if ('booleanValue' in value) return value.booleanValue;
 if ('integerValue' in value) return Number(value.integerValue);
 if ('nullValue' in value) return null;
 if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
 if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k,v])=>[k,decode(v)]));
 throw new Error('Unsupported staff field type');
};
async function list(collection) {
 const masks=collection==='staffProfiles'?['position','positionCode','positions','email']:['uid','academicYear','active','projectRole'];
 if(!['staffProfiles','projectAccess/2568/members'].includes(collection)) throw new Error('Collection not allowed');
 const docs=[];let pageToken='';
 do {
  const url=new URL('https://firestore.googleapis.com/v1/projects/'+config.projects.default+'/databases/(default)/documents/'+collection);
  url.searchParams.set('pageSize','300'); for(const field of masks) url.searchParams.append('mask.fieldPaths',field);
  if(pageToken) url.searchParams.set('pageToken',pageToken);
  const token=await app.options.credential.getAccessToken();
  const response=await fetch(url,{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error('Firestore read failed: HTTP '+response.status);
  const result=await response.json();
  for(const doc of result.documents || []) {const data=Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,decode(v)]));docs.push({id:doc.name.split('/').at(-1),data:()=>data});}
  pageToken=result.nextPageToken || '';
 } while(pageToken);
 return {docs};
}
const ref = collection => ({get:()=>list(collection),doc:id=>({collection:name=>ref(collection+'/'+id+'/'+name)})});
const db={collection:ref};
try {
 const snapshot=JSON.parse(await readFile(snapshotFile,'utf8'));
 if(snapshot.year!==2568) throw new Error('Only academic year 2568 is selected for this review');
 const review=await readStaffProjectAccess({identity:{db,auth:getAuth(app)},academicYear:2568,projectIds:snapshot.projects.map(p=>p.id)});
 const result={...review,source:'production-snapshot',sourceProjectId:config.projects.default,checkedAt:new Date().toISOString()};
 const folder=path.dirname(path.resolve(outputFile));
 await mkdir(folder,{recursive:true,mode:0o700});
 await writeFile(outputFile,JSON.stringify(result,null,2),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({saved:true,project:result.sourceProjectId,candidates:result.candidateCount,roles:result.candidates.reduce((m,r)=>(m[r.role]=(m[r.role]||0)+1,m),{}),issues:result.issues.map(i=>i.reason),differences:result.differences.reduce((m,r)=>(m[r.kind]=(m[r.kind]||0)+1,m),{}),writesPerformed:result.writesPerformed}));
} finally {await deleteApp(app);}
