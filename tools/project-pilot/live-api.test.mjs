import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveApiServer } from './live-api.mjs';
test('live API authenticates every call and refuses cross-origin, role-switch and restore routes', async t => {
  const calls=[]; let revoked=false;
  const server=createLiveApiServer({authenticate:async header=>{if(header!=='Bearer real' || revoked)throw Object.assign(Error('denied'),{status:401});return {authenticated:true,id:'head'};},store:{query:async uid=>{calls.push(uid);return {projects:[]};},history:async()=>({audit:[]}),backup:async()=>({format:'SGCU-live-backup'}),mutate:async(uid,action,body)=>{calls.push([uid,action,body]);return {saved:true};}}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
  const base=`http://127.0.0.1:${server.address().port}`, headers={Authorization:'Bearer real',Origin:base,'Content-Type':'application/json'};
  assert.equal((await fetch(base+'/api/year68/live')).status,401);assert.equal(calls.length,0);
  assert.equal((await fetch(base+'/api/year68/live',{headers})).status,200);assert.deepEqual(calls,['head']);
  assert.equal((await fetch(base+'/api/year68/live/commit',{method:'POST',headers,body:'{}'})).status,200);
  assert.equal((await fetch(base+'/api/year68/live/commit',{method:'POST',headers:{...headers,Origin:'https://other.test'},body:'{}'})).status,403);
  for(const route of ['/api/session','/api/year68/live/reset','/api/year68/live/restore','/api/year68/trial'])assert.equal((await fetch(base+route,{headers})).status,404);
  assert.equal((await fetch(base+'/api/year68/live/commit',{method:'POST',headers,body:'invalid'})).status,400);
  assert.equal((await fetch(base+'/api/year68/live/commit',{method:'POST',headers,body:' '.repeat(10001)})).status,413);
  revoked=true;assert.equal((await fetch(base+'/api/year68/live/backup',{headers})).status,401);
});
