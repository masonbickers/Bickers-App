import assert from 'node:assert/strict';
import test from 'node:test';
import * as display from '../lib/startup/display.js';

test('saved Home handoff updates the mounted route instead of replacing it', () => {
  assert.equal(typeof display.restoreStartupRoute, 'function');
  const calls=[]; const router={setParams:params=>calls.push(['params',params]),replace:route=>calls.push(['replace',route])};
  display.restoreStartupRoute(router,{route:'home',date:'2026-10-18'},'/screens/homescreen');
  assert.deepEqual(calls,[['params',{date:'2026-10-18'}]]);
});

test('saved Schedule handoff keeps the existing Schedule mounted', () => {
  assert.equal(typeof display.restoreStartupRoute, 'function');
  const calls=[]; const router={setParams:params=>calls.push(['params',params]),replace:route=>calls.push(['replace',route])};
  display.restoreStartupRoute(router,{route:'schedule',date:'2026-10-18'},'/screens/schedule');
  assert.deepEqual(calls,[['params',{date:'2026-10-18'}]]);
});

for (const [route,pathname] of [['home','/(protected)/(main-tabs)/screens/homescreen'],['schedule','/(protected)/(main-tabs)/screens/schedule']]) {
  test(`saved ${route} navigates to its actual tab route when another page is open`,()=>{
    assert.equal(typeof display.restoreStartupRoute, 'function');
    const calls=[];const router={setParams:()=>assert.fail('not already on that route'),replace:route=>calls.push(route)};
    display.restoreStartupRoute(router,{route,date:'2026-10-18'},'/login');
    assert.deepEqual(calls,[{pathname,params:{date:'2026-10-18'}}]);
  });
}


test('saved preview covers the verified route until the destination has laid out', async () => {
  assert.equal(typeof display.resolveStartupHandoff, 'function');
  const { projectStartupSnapshot } = await import('../lib/startup/snapshot.js');
  const snapshot = projectStartupSnapshot({identity:{clerkUserId:'c',clerkSessionId:'s',uid:'u',companyId:'co',employeeId:'e'},generation:1,verifiedAt:1000,savedAt:1000,route:'home',selectedDateISO:'2026-10-17',jobs:[]});
  const args = {snapshot,enabled:true,clerk:{loading:false,hasClerkSession:true,clerkUserId:'c',clerkSessionId:'s'},startupAccessStatus:'verified',loading:false,isAuthed:true,workingTermsAccepted:true,now:2000,pathname:'/login',readyRoute:null,handoffCycle:2,readyCycle:2};
  assert.equal(display.resolveStartupHandoff(args),snapshot,'auth completion alone must not expose an empty route');
  assert.equal(display.resolveStartupHandoff({...args,pathname:'/screens/homescreen'}),snapshot,'wait for the actual native destination layout');
  assert.equal(display.resolveStartupHandoff({...args,pathname:'/screens/homescreen',readyRoute:'/screens/schedule'}),snapshot);
  assert.equal(display.resolveStartupHandoff({...args,pathname:'/screens/homescreen',readyRoute:'/screens/homescreen'}),null);
  assert.equal(display.resolveStartupHandoff({...args,pathname:'/screens/homescreen',readyRoute:'/screens/homescreen',readyCycle:1}),snapshot,'a previous restoration must not dismiss this preview');
  for (const status of ['denied','signed-out','terms-required']) assert.equal(display.resolveStartupHandoff({...args,startupAccessStatus:status}),null);
  assert.equal(display.resolveStartupHandoff({...args,clerk:{...args.clerk,clerkSessionId:'other'}}),null,'handoff cannot retain another session preview');
  assert.equal(display.resolveStartupHandoff({...args,securityTransition:{kind:'recovery'}}),null);
  assert.equal(display.resolveStartupHandoff({...args,isServiceOnlyUser:true,pathname:'/service/home'}),null,'revoked Work access must not retain a Work preview over Service');
});
