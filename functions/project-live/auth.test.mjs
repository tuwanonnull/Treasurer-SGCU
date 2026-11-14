import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectAuthenticator,ADMIN_EMAIL,HEAD_EMAIL} from './auth.mjs';
test('only verified head and designated admin authenticate; current account and token must agree',async()=>{
 for(const email of [HEAD_EMAIL,ADMIN_EMAIL]){let disabled=false;const auth={verifyIdToken:async(t,revoked)=>{assert.equal(revoked,true);return {uid:'u',email,email_verified:true};},getUser:async()=>({uid:'u',email,emailVerified:true,disabled})};const verify=createProjectAuthenticator(auth);assert.equal((await verify('Bearer signed')).role,email===ADMIN_EMAIL?'admin':'head');disabled=true;await assert.rejects(verify('Bearer signed'),e=>e.status===403);}
 for(const email of ['6740193226@student.chula.ac.th','someone@gmail.com'])await assert.rejects(createProjectAuthenticator({verifyIdToken:async()=>({uid:'u',email,email_verified:true}),getUser:async()=>({uid:'u',email,emailVerified:true})})('Bearer signed'),e=>e.status===403);
 await assert.rejects(createProjectAuthenticator({verifyIdToken:async()=>{throw Error('revoked');}})('Bearer signed'),e=>e.status===401);
});

test('v2 registers secretaries and assistants by UID without allowing an unlisted or renamed admin',async()=>{
 const user={uid:'s',email:'secretary@example.test',emailVerified:true,disabled:false};
 const auth={verifyIdToken:async()=>({uid:user.uid,email:user.email,email_verified:true}),getUser:async()=>user};
 for(const role of ['secretary','assistant'])assert.equal((await createProjectAuthenticator(auth,{registry:{s:{id:'s',role}}})('Bearer signed')).role,role);
 await assert.rejects(createProjectAuthenticator(auth,{registry:{other:{role:'secretary'}}})('Bearer signed'),e=>e.status===403);
 await assert.rejects(createProjectAuthenticator(auth,{registry:{s:{role:'admin'}}})('Bearer signed'),e=>e.status===403);
 user.disabled=true;await assert.rejects(createProjectAuthenticator(auth,{registry:{s:{role:'secretary'}}})('Bearer signed'),e=>e.status===403);
});
