// Test transport only: the emulator's HTTP gateway cannot decode transaction
// BYTE_STRING fields. Run production REST adapter logic against real emulator
// gRPC transactions while asserting its request shapes. Never reaches a cloud host.
const {createRequire}=require('node:module');const path=require('node:path');
const load=createRequire(path.resolve(process.env.FIREBASE_RULES_TEST_DEPENDENCIES,'package.json'));
const {initializeApp,deleteApp}=load('firebase-admin/app');const {getFirestore,FieldPath,Timestamp}=load('firebase-admin/firestore');
function createTransactionTransport(project) {
 if(!project.startsWith('demo-') || !/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || ''))throw Error('Demo loopback emulator required');
 const app=initializeApp({projectId:project},`history-${Date.now()}`),db=getFirestore(app),transactions=new Map();let sequence=0;
 const root=`projects/${project}/databases/(default)/documents/`;
 const timestamp=t=>new Date(t.seconds*1000).toISOString().replace(/\.\d{3}Z$/,'.'+String(t.nanoseconds).padStart(9,'0')+'Z');
 function encode(value) {
  if(value===null || value===undefined)return {nullValue:null};if(value instanceof Timestamp)return {timestampValue:timestamp(value)};
  if(typeof value==='string')return {stringValue:value};if(typeof value==='boolean')return {booleanValue:value};if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};
  if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}};
 }
 function decode(value) {if('referenceValue' in value)return db.doc(value.referenceValue.slice(root.length));if('stringValue' in value)return value.stringValue;if('integerValue' in value)return Number(value.integerValue);if('doubleValue' in value)return value.doubleValue;if('booleanValue' in value)return value.booleanValue;if('nullValue' in value)return null;if('arrayValue' in value)return (value.arrayValue.values || []).map(decode);if('mapValue' in value)return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k,v])=>[k,decode(v)]));throw Error('Unexpected field encoding');}
 const document=snapshot=>({name:root+snapshot.ref.path,fields:Object.fromEntries(Object.entries(snapshot.data()).map(([k,v])=>[k,encode(v)])),createTime:timestamp(snapshot.createTime),updateTime:timestamp(snapshot.updateTime)});
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 async function fetchImpl(input,init={}) {
  const url=new URL(String(input));if(url.host!==process.env.FIRESTORE_EMULATOR_HOST || !url.pathname.startsWith(`/v1/projects/${project}/databases/(default)/documents`))throw Error('Non-emulator request rejected');
  const body=init.body?JSON.parse(init.body):{},kind=url.pathname.split(':').at(-1);
  if(kind==='beginTransaction') {
   const id=`tx-${++sequence}`;let ready,finish;const started=new Promise(resolve=>{ready=resolve;}),done=new Promise(resolve=>{finish=resolve;});const readOnly=Object.hasOwn(body.options || {},'readOnly');
   const entry={finish,readOnly};transactions.set(id,entry);
   entry.completed=db.runTransaction(async transaction=>{entry.transaction=transaction;ready();await done;},{maxAttempts:1,...(readOnly?{readOnly:true}:{})});entry.completed.catch(()=>{});await started;return json({transaction:id});
  }
  if(kind==='rollback') {const entry=transactions.get(body.transaction);if(entry){entry.finish();await entry.completed.catch(()=>{});transactions.delete(body.transaction);}return json({});}
  if(kind==='commit') {
   const entry=transactions.get(body.transaction);if(!entry || entry.readOnly)throw Error('Invalid write transaction');
   for(const write of body.writes || []) {
    const ref=db.doc(write.update.name.slice(root.length)),patch=Object.fromEntries(Object.entries(write.update.fields || {}).map(([k,v])=>[k,decode(v)]));
    const time=write.currentDocument?.updateTime;if(!time)throw Error('Observed version precondition required');const parsed=/^(.+)\.(\d+)Z$/.exec(time),seconds=Math.floor(Date.parse(parsed[1]+'Z')/1000),nanos=Number(parsed[2].padEnd(9,'0'));
    entry.transaction.update(ref,patch,{lastUpdateTime:new Timestamp(seconds,nanos)});
   }
   entry.finish();try{await entry.completed;transactions.delete(body.transaction);return json({commitTime:new Date().toISOString()});}catch{return json({error:{status:'FAILED_PRECONDITION'}},412);}
  }
  if(kind==='runQuery') {
   const query=body.structuredQuery;let q=db.collection(query.from[0].collectionId);const filters=query.where?.compositeFilter?.filters || (query.where?[query.where]:[]);
   for(const item of filters){const f=item.fieldFilter,field=f.field.fieldPath==='__name__'?FieldPath.documentId():f.field.fieldPath,ops={EQUAL:'==',GREATER_THAN_OR_EQUAL:'>=',LESS_THAN_OR_EQUAL:'<='};q=q.where(field,ops[f.op],decode(f.value));}
   if(query.select)q=q.select(...query.select.fields.map(field=>field.fieldPath));
   q=q.orderBy(FieldPath.documentId());if(query.startAt)q=q.startAfter(...query.startAt.values.map(decode));if(query.limit)q=q.limit(query.limit);
   const entry=transactions.get(body.transaction),snap=entry?await entry.transaction.get(q):await q.get();return json(snap.docs.map(d=>({document:document(d)})));
  }
  const prefix=`/v1/projects/${project}/databases/(default)/documents/`,ref=db.doc(decodeURIComponent(url.pathname.slice(prefix.length))),entry=transactions.get(url.searchParams.get('transaction')),snap=entry?await entry.transaction.get(ref):await ref.get();return snap.exists?json(document(snap)):json({},404);
 }
 return {fetch:fetchImpl,close:async()=>{for(const entry of transactions.values()){entry.finish();await entry.completed.catch(()=>{});}await db.terminate();await deleteApp(app);}};
}
module.exports={createTransactionTransport};
