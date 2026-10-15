import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createSessionGate } from '../server/sessionGate.js';
import { mobilePasswordAccessAllowed } from '../server/appPasswordSetup.js';

async function request({confirmed=true,profilePatch={},tokenPatch={}}={}) {
  const profile={uid:'staff',companyId:'company',employeeId:'employee',isEnabled:true,mobileAccessStatus:'active',passwordResetRequired:true,firebasePasswordResetAfter:200000,...profilePatch};
  const token={uid:'staff',auth_time:202,firebase:{sign_in_provider:'password'},...tokenPatch};
  const handlers=[];let business=false,proofCalls=0,status=200;
  const source=readFileSync(new URL('../server/index.js',import.meta.url),'utf8');
  const ast=ts.createSourceFile('server.js',source,ts.ScriptTarget.Latest,true);
  const statements=ast.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(ast)==='app.use'&&node.expression.arguments.length===1&&
    (node.expression.arguments[0].getText(ast)==='createSessionGate()'||node.expression.arguments[0].getText(ast).includes('mobilePasswordAccessAllowed')));
  assert.equal(statements.length,2);
  new Function('app','admin','db','bearerToken','mobilePasswordAccessAllowed','createSessionGate',statements.map(node=>node.getText(ast)).join('\n'))(
    {use:handler=>handlers.push(handler)}, {auth:()=>({verifyIdToken:async()=>token})},
    {collection:()=>({doc:()=>({get:async()=>({data:()=>({...profile})})})})},()=> 'fixture',mobilePasswordAccessAllowed,
    ()=>createSessionGate({origin:'https://booking.bickers.co.uk',production:true,fetchImpl:async()=>{
      proofCalls++;if(confirmed){profile.passwordResetRequired=false;profile.firebasePasswordResetAfter=null;}
      return {ok:confirmed,status:confirmed?200:401};
    }}),
  );
  const req={headers:{authorization:'Bearer fixture'}};
  const res={status:value=>{status=value;return res;},json:()=>{}};
  const next=index=>index===handlers.length?(business=true):handlers[index](req,res,()=>next(index+1));
  await next(0);return {business,proofCalls,status,profile};
}
test('provider-confirmed legacy recovery runs before final canonical authorization in the real middleware order',async()=>{
  const result=await request();assert.equal(result.proofCalls,1);assert.equal(result.business,true);assert.equal(result.profile.passwordResetRequired,false);
});
test('unchanged passwords, stale sessions, disabled accounts and retired Firebase credentials stay blocked',async()=>{
  for(const options of [{confirmed:false},{profilePatch:{sessionValidAfter:203}},{profilePatch:{isEnabled:false}},{profilePatch:{authMigrationState:'clerk-only'}}]){
    const result=await request(options);assert.equal(result.business,false);assert.equal(result.proofCalls,1);assert.ok([401,403].includes(result.status));
  }
});
