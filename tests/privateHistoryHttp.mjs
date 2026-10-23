import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['server/index.js'],{cwd:new URL('..',import.meta.url),env:{PATH:process.env.PATH,PORT:'3039',NODE_ENV:'test',FIREBASE_PROJECT_ID:'demo-history-http',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8187'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
try {
 let ready=false;
 for(let attempt=0;attempt<50;attempt++){try {const r=await fetch('http://127.0.0.1:3039/health');if(r.ok){ready=true;break;}}catch{}if(child.exitCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,100));}
 assert.equal(ready,true,output);
 const r=await fetch('http://127.0.0.1:3039/hr/history?collection=holidays');
 assert.equal(r.status,401);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.deepEqual(await r.json(),{error:'Sign in again.'});
 const health=await fetch('http://127.0.0.1:3039/health');assert.equal((await health.json()).ok,true);
 console.log('PASS: exact server starts; health unchanged; registered /hr/history returns protected JSON 401');
} finally {child.kill('SIGTERM');}
