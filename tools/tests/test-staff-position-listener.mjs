import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../../web/js/features/staff/app.staff-access.js',import.meta.url),'utf8');
const start=source.indexOf('  const startPositionCatalogListener =');
const end=source.indexOf('  const startMyApplicationsListener',start);
function harness(){
 const calls=[];let user=null;let messages=[];let refreshes=0;
 const context={positionCatalogGeneration:0,positionCatalogHasListenerError:false,unsubscribePositionCatalog:null,currentPositionCatalog:[],positionCatalogLoadState:'idle',COLLECTION_POSITIONS:'staffPositionCatalog',currentApprovalView:'history',positionAllowedPagesEl:null,positionManageMessageEl:{},console:{error(){}},readCurrentUser:()=>user,getCurrentAuthEmail:()=> 'cached@example.com',resolveStore:()=>true,scheduleDeferredBootstrap(){},renderPositionDatalist(){},renderPositionCatalog(){},renderPositionAllowedPageOptions(){},renderApplicationPositionSelect(){},renderApprovedHistory(){},renderApprovalRows(){},sortPositionCatalogItems:x=>x,syncStaffProfilesWithPositionCatalog:()=>Promise.resolve(),setMessage:(_el,text)=>messages.push(text),buildListenerErrorText:(_text,e)=>e.code,firestore:{db:{},collection:()=>({}),query:x=>x,onSnapshot:(_q,ok,error)=>{const call={ok,error,unsubscribed:false};calls.push(call);return()=>{call.unsubscribed=true}}}};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+'\n globalThis.start = startPositionCatalogListener;',context);
 return{context,calls,messages,setUser(uid){user=uid?{uid,email:uid+'@example.com',getIdToken:async force=>{assert.equal(force,true);refreshes++}}:null},get refreshes(){return refreshes}};
}
const h=harness();h.context.start();assert.equal(h.calls.length,0,'cached email cannot open a listener without Firebase Auth');
h.setUser('head');h.context.start();await h.calls[0].error({code:'permission-denied'});assert.equal(h.refreshes,1);assert.equal(h.calls.length,2);assert.ok(h.calls[0].unsubscribed);
await h.calls[1].error({code:'permission-denied'});assert.equal(h.refreshes,1,'retry at most once');assert.equal(h.context.positionCatalogLoadState,'error');
h.context.start();h.calls[2].ok({docs:[]});assert.equal(h.context.positionCatalogLoadState,'loaded');assert.equal(h.messages.at(-1),'','successful retry clears previous listener error');
await h.calls[1].error({code:'permission-denied'});assert.equal(h.context.positionCatalogLoadState,'loaded','obsolete listener cannot overwrite latest success');
h.setUser(null);h.context.start();assert.ok(h.calls[2].unsubscribed);h.calls[2].ok({docs:[]});assert.equal(h.context.positionCatalogLoadState,'signed-out');
const racing=harness();racing.setUser('old');racing.context.start();const pending=racing.calls[0].error({code:'permission-denied'});racing.setUser('new');racing.context.start();await pending;assert.equal(racing.calls.length,2,'token refresh for previous account must not restart listener');
console.log('Staff position listener: real-auth gate, one token retry, stale callbacks, account switch, sign-out, and error recovery passed.');
