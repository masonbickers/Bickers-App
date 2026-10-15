import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createClerkBridgeClient, clerkClientConfig } from '../lib/clerkBridgeClient.js';
test('a production pilot can use only its fixed bridge and requires an explicit pilot role', () => {
  const pilot = { enabled: true, environment: 'production', publishableKey: 'pk_live_fixture', origin: 'https://pilot.bickers.co.uk', deploymentRole: 'pilot' };
  assert.equal(clerkClientConfig(pilot).origin, 'https://pilot.bickers.co.uk');
  assert.equal(clerkClientConfig(pilot).deploymentRole, 'pilot');
  for (const patch of [{ deploymentRole: 'primary' }, { deploymentRole: 'other' }, { origin: 'https://booking.bickers.co.uk' }, { environment: 'staging' }]) assert.throws(() => clerkClientConfig({ ...pilot, ...patch }));
});
test('release clients require live keys and the trusted HTTPS bridge',()=>{
  for(const patch of [{publishableKey:'pk_test_fixture'},{origin:'http://booking.bickers.co.uk'},{origin:'https://other.example'},{origin:'https://booking.bickers.co.uk/path'}]) assert.throws(()=>clerkClientConfig({enabled:true,environment:'production',publishableKey:'pk_live_fixture',origin:'https://booking.bickers.co.uk',...patch}));
  assert.equal(clerkClientConfig({enabled:false}).enabled,false);
  assert.throws(()=>clerkClientConfig({enabled:true,environment:'staging',publishableKey:'pk_live_fixture'}));
});
test('native exchange sends only provider proof with no cookies or redirects',async()=>{
  let request;const client=createClerkBridgeClient({origin:'https://booking.bickers.co.uk',fetchImpl:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({uid:'staff',customToken:'private-token',leaseExpiresAt:123})};}});
  assert.equal((await client({clerkToken:'provider-proof'})).uid,'staff');
  assert.equal(request.url,'https://booking.bickers.co.uk/api/auth/firebase-token');
  assert.equal(request.options.headers.Authorization,'Bearer provider-proof');assert.equal(request.options.credentials,'omit');assert.equal(request.options.redirect,'error');assert.equal(request.options.body,undefined);
});
test('bridge denial retains HTTP status for both-provider logout without exposing returned internals',async()=>{
  const client=createClerkBridgeClient({origin:'https://booking.bickers.co.uk',fetchImpl:async()=>({ok:false,status:403,json:async()=>({error:'private directory details'})})});
  await assert.rejects(client({clerkToken:'proof'}),error=>error.status===403&&!error.message.includes('private'));
});
test('native bridge timeout uses the installed React Native abort-controller and clears its timer',async()=>{
  const native=createRequire(import.meta.url)('abort-controller');let cancelled=false;
  const client=createClerkBridgeClient({origin:'https://booking.bickers.co.uk',AbortControllerImpl:native.AbortController,
    schedule:(_callback,delay)=>{assert.equal(delay,20000);return 'timer';},cancel:handle=>{assert.equal(handle,'timer');cancelled=true;},
    fetchImpl:async(_url,options)=>{assert.ok(options.signal instanceof native.AbortSignal);return {ok:true,json:async()=>({uid:'staff'})};}});
  assert.equal((await client({clerkToken:'proof'})).uid,'staff');assert.equal(cancelled,true);
});
