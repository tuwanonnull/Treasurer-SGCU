import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../js/features/borrow/app.borrow-assets.js', import.meta.url), 'utf8');
const part = (a,b) => source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const context = vm.createContext({});
vm.runInContext(part('  const formatBorrowStatusUpdateError =','  const applyStockDeltasInTransaction =')+'\nglobalThis.format = formatBorrowStatusUpdateError;', context);
assert.match(context.format({code:'resource-exhausted'}), /โควตาฐานข้อมูลเต็ม/);
assert.match(context.format({code:'firestore/resource-exhausted'}), /โควตาฐานข้อมูลเต็ม/);
assert.match(context.format({code:'borrow/insufficient-stock'}), /พัสดุคงเหลือไม่พอ/);
assert.match(context.format({code:'permission-denied'}), /ไม่มีสิทธิ์/);
// A failed transaction read must not delete the request or release reserved inventory.
let mutations = 0;
const item = {id:'request',status:'approved'};
const deletion = vm.createContext({
  resolveFirestoreBridge:()=>true,getBorrowRequestByKey:()=>item,
  BORROW_REQUEST_COLLECTION:'borrowAssetRequests',readCurrentUserEmail:()=> 'staff@example.test',
  firestore:{db:{},doc:()=>({}),runTransaction:async (_db,fn)=>fn({get:async()=>{throw {code:'resource-exhausted'};},delete:()=>mutations++})},
  buildReservationDeltas:()=>new Map(),applyStockDeltasInTransaction:()=>mutations++,
  STATUS_CANCELLED:'cancelled',window:{}
});
await assert.rejects(vm.runInContext(part('  const deleteBorrowRequest =','  if (hasBorrowFormSection)')+'\ndeleteBorrowRequest("request");',deletion),e=>e.code==='resource-exhausted');
assert.equal(mutations,0);assert.equal(item.isDeleted,undefined);
console.log('Staff errors distinguish quota from stock; failed deletion leaves data untouched.');
