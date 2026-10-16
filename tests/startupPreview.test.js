import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';
import {projectStartupSnapshot} from '../lib/startup/snapshot.js';
const require=createRequire(import.meta.url),React=require('react'),{transformSync}=require('@babel/core');
const api=await import('../lib/startup/display.js').catch(()=>({}));
const now=Date.now(),identity={clerkUserId:'u',clerkSessionId:'s',uid:'f',companyId:'c',employeeId:'e'};
const snapshot=projectStartupSnapshot({identity,generation:1,verifiedAt:now,savedAt:now,route:'schedule',selectedDateISO:'2026-10-16',selectedJobId:null,jobs:[{id:'j',dateISO:'2026-10-16',title:'Saved job'}],completeDates:['2026-10-16']});
test('display eligibility is separate from authorization and rejects denial, identity mismatch, expiry and clock rollback',()=>{
  assert.equal(typeof api.resolveStartupDisplay,'function');
  const input={snapshot,enabled:true,clerk:{loading:true},startupAccessStatus:'restoring',loading:true,now};
  assert.equal(api.resolveStartupDisplay(input),snapshot);
  assert.equal(api.resolveStartupDisplay({...input,startupAccessStatus:'unavailable'}),snapshot);
  for(const change of [{startupAccessStatus:'denied'},{startupAccessStatus:'terms-required'},{startupAccessStatus:'signed-out'},{now:now+86400000},{now:now-1},{securityTransition:{}},{updateRequired:{}},{clerk:{loading:false,hasClerkSession:true,clerkUserId:'u',clerkSessionId:'different'}},{isAuthed:true,workingTermsAccepted:true,loading:false}])assert.equal(api.resolveStartupDisplay({...input,...change}),null);
});
test('actual preview shows saved summaries and timestamp with only local selection and retry callbacks',()=>{
  const filename=new URL('../components/startup/StartupPreview.jsx',import.meta.url).pathname;assert.equal(existsSync(filename),true);
  const {code}=transformSync(readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']});
  const mocks={react:{...React,default:React,__esModule:true},'react-native':{View:'View'},'../layout/PageShell':{default:'PageShell',__esModule:true},'../ui/AppPrimitives':{AppText:'Text',SectionCard:'Card',AppButton:'Button'},'../../lib/design/tokens':{designTokens:{spacing:{xs:8,md:16}}}};
  const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,Date,require:name=>mocks[name]||{}},{filename});
  let retry=0,selected;
  const tree=module.exports.default({snapshot,status:'unavailable',onRetry:()=>retry++,onSelectDate:()=>{},onSelectJob:id=>{selected=id;}});
  const nodes=[];function visit(n){if(Array.isArray(n))return n.forEach(visit);if(!React.isValidElement(n))return;nodes.push(n);visit(n.props.children);}visit(tree);
  const text=nodes.filter(n=>n.type==='Text').map(n=>n.props.children).flat().join(' ');
  assert.match(text,/Saved job/);assert.match(text,/Saved/);assert.match(text,/read.only/i);
  const buttons=nodes.filter(n=>n.type==='Button');assert.ok(buttons.length>0);
  const retryButton=buttons.find(n=>/retry/i.test(n.props.label));assert.ok(retryButton);retryButton.props.onPress();assert.equal(retry,1);
  const jobButton=buttons.find(n=>n.props.accessibilityLabel==='View saved job');assert.ok(jobButton);jobButton.props.onPress();assert.equal(selected,'j');
  assert.equal(buttons.some(n=>/submit|upload|edit|document|account/i.test(n.props.label||'')),false);
});

test('a restored Home selection retains its calendar date and rejects malformed route parameters',()=>{
  assert.equal(typeof api.restoreStartupDate,'function');
  const date=api.restoreStartupDate('2026-10-17');assert.equal(date.getFullYear(),2026);assert.equal(date.getMonth(),9);assert.equal(date.getDate(),17);
  assert.equal(api.restoreStartupDate('2026-02-31'),null);assert.equal(api.restoreStartupDate(['2026-10-17']),null);
});
