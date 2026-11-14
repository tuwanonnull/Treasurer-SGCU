import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createEmulatorIdentity } from './firebase-identity.mjs';
import { validateLiveBackup, restoreLiveBackup } from './live-store.mjs';
const bundle=JSON.parse(await readFile(process.argv[2],'utf8')),payload=validateLiveBackup(bundle);
const identity=createEmulatorIdentity(),datasetId=`year2568-drill-${randomUUID()}`,root=identity.db.collection('projectDatasets').doc(datasetId);
try{
  await restoreLiveBackup({bundle,db:identity.db,datasetId});
  const metadata=(await root.get()).data();assert.equal(metadata.status,'ready');assert.equal(metadata.active,false);
  const saved=await root.collection('projects').get();assert.equal(saved.size,payload.checkpoints.length);
  for(const doc of saved.docs){const state=JSON.parse(doc.data().payload),p=state.data.projects[0],old=payload.checkpoints.find(s=>s.data.projects[0].id===p.id).data.projects[0];
    for(const key of ['money','statuses','formulaInputs','sourceId','trialAssignee'])assert.deepEqual(p[key],old[key]);assert.notEqual(p.version,old.version);
  }
  const events=await root.collection('audit').orderBy('sequence').get();assert.deepEqual(events.docs.map(d=>d.id),payload.auditOrder);
  console.log(JSON.stringify({verified:true,projects:saved.size,audit:events.size,recoveredInactive:true,productionWrites:false}));
}finally{await identity.db.recursiveDelete(root);await identity.close();}
