import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';
import {projectStartupSnapshot} from '../lib/startup/snapshot.js';
const require=createRequire(import.meta.url),React=require('react'),{transformSync}=require('@babel/core');
const homeStatus=await import('../lib/homeDayStatus.js');
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
function renderStartup(props, verified = false) {
  const mocks = {
    react:{...React,default:React,__esModule:true},
    'react-native':{View:'View',ActivityIndicator:'Spinner',Platform:{OS:'ios'},StyleSheet:{hairlineWidth:1}},
    '../layout/PageShell':{default:'PageShell',__esModule:true},
    '../ui/AppPrimitives':{AppText:'Text',SectionCard:'Card',AppButton:'Button',AppPressable:'Pressable'},
    '../ui/AppleMaterialSurface':{default:'Material',__esModule:true},
    'expo-image':{Image:'Image'},'expo-symbols':{SymbolView:'Symbol'},
    'react-native-vector-icons/Feather':{default:'Icon',__esModule:true},
    '../../providers/ThemeProvider':{useTheme:()=>({colors:{text:'white',textMuted:'gray',accent:'red'}})},
    '../../hooks/useResponsiveLayout':{useResponsiveLayout:()=>({width:430,fontScale:1})},
    '../../lib/design/dashboardLayout':{getDashboardGridColumns:()=>2},
    '../../lib/design/dashboard':{createDashboardCardStyles:()=>({})},
    '../../lib/design/cardSurface':{getCardSurfaceStyle:()=>({})},
    '../../lib/design/homeDashboard':{getHomeActionSurfaces:()=>({}),getHomeCountSurface:()=>({})},
    '../../lib/homeDayStatus':homeStatus,
    '../../lib/design/tokens':{designTokens:{spacing:{md:16},materials:{pressScale:0.98}}},
    '../../lib/design/screenStyles/main-tabs-screens-homescreen-js':{styles:{}},
    '../../lib/design/routePresentation/main-tabs-screens-homescreen-js':{routeColors:{}},
  };
  function load(relative) {
    const filename=new URL(relative,import.meta.url).pathname;
    const {code}=transformSync(readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']});
    const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,Date,require:name=>mocks[name]||{}},{filename});
    return {default:module.exports.default,__esModule:true};
  }
  mocks['../home/HomeDashboard']=load('../components/home/HomeDashboard.jsx');
  mocks['../home/HomeDayStatus']=load('../components/home/HomeDayStatus.jsx');
  mocks['./StartupHomeDashboard']=load('../components/startup/StartupHomeDashboard.jsx');
  const Preview=load('../components/startup/StartupPreview.jsx').default;
  const nodes=[];
  function visit(n){if(Array.isArray(n))return n.forEach(visit);if(!React.isValidElement(n))return;
    if(typeof n.type==='function')return visit(n.type(n.props));
    nodes.push(n);visit(n.props.children);
  }
  visit(verified ? React.createElement(mocks['../home/HomeDashboard'].default, {
    colors:{text:'white',textMuted:'gray',accent:'red'}, account:{name:'Employee',userCode:'1234'},
    selectedDate:new Date(), todayContent:'Today', planningContent:'Tomorrow', ...props,
  }) : Preview(props));return nodes;
}
test('restoring Home shows its real saved time quietly and keeps protected controls disabled',()=>{
  const nodes=renderStartup({snapshot});
  const text=nodes.filter(n=>n.type==='Text').map(n=>n.props.children).flat().join(' ');
  for(const label of ["Today's Work",'Plan Ahead','Quick Actions','More',`Saved ${new Date(snapshot.savedAt).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}`,'Saved job'])assert.ok(text.includes(label),label);
  assert.doesNotMatch(text,/Saved view|read.only|Refreshing/);
  assert.equal(nodes.filter(n=>n.type==='Spinner').length,0);
  const controls=nodes.filter(n=>n.type==='Pressable');assert.ok(controls.length>=8);
  assert.ok(controls.every(n=>n.props.disabled===true));
  assert.ok(controls.every(n=>n.props.disabledAppearance==='preserve'));
});
test('Home can render immediately before disk restoration without exposing account data',()=>{
  const nodes=renderStartup({});
  const text=nodes.filter(n=>n.type==='Text').map(n=>n.props.children).flat().join(' ');
  assert.match(text,/Welcome back/);assert.match(text,/Today's Work/);assert.doesNotMatch(text,/Saved job|Yard Based|Off|Saved \d|Updated \d|Refreshing/);
  assert.equal(nodes.filter(n=>n.type==='Spinner').length,0);
});
test('unavailable account refresh keeps Home in place and offers retry',()=>{
  let retries=0;const nodes=renderStartup({snapshot,status:'unavailable',onRetry:()=>retries++});
  const retry=nodes.find(n=>n.type==='Button'&&n.props.label==='Retry');assert.ok(retry);retry.props.onPress();assert.equal(retries,1);
});

test('verified Home retains enabled navigation and the Work Diary permission filter',()=>{
  const routes=[];const nodes=renderStartup({onAction:route=>routes.push(route)},true);
  const controls=nodes.filter(n=>n.type==='Pressable');
  assert.ok(controls.every(n=>n.props.disabled===false));
  controls.find(n=>n.props.accessibilityLabel==='Schedule').props.onPress();
  controls.find(n=>n.props.accessibilityLabel==='Time Sheet').props.onPress();
  assert.deepEqual(routes,['screens/schedule','/timesheet']);
  assert.equal(controls.some(n=>n.props.accessibilityLabel==='Work Diary'),false);
  const permitted=renderStartup({workDiaryAccess:true,onAction:route=>routes.push(route)},true);
  permitted.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Work Diary').props.onPress();
  assert.equal(routes.at(-1),'/work-diary');
});

test('a restored Home selection retains its calendar date and rejects malformed route parameters',()=>{
  assert.equal(typeof api.restoreStartupDate,'function');
  const date=api.restoreStartupDate('2026-10-17');assert.equal(date.getFullYear(),2026);assert.equal(date.getMonth(),9);assert.equal(date.getDate(),17);
  assert.equal(api.restoreStartupDate('2026-02-31'),null);assert.equal(api.restoreStartupDate(['2026-10-17']),null);
});

const renderedText = nodes => nodes.filter(n => n.type === 'Text').map(n => n.props.children).flat().join(' ');
test('saved empty dates stay empty while access refreshes, including offline retries', () => {
  const today = new Date();
  const date = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const saved = {...snapshot, jobs: [], selectedDateISO: date(tomorrow), completeDates: [date(today), date(tomorrow)]};
  for (const status of ['restoring', 'unavailable']) {
    const text = renderedText(renderStartup({snapshot: saved, status}));
    assert.equal(text.split('No jobs assigned').length - 1, 2);
    assert.doesNotMatch(text, /Refreshing work details|Work details unavailable/);
  }
});
test('unknown and truncated dates never claim a confirmed empty schedule', () => {
  for (const saved of [null, {...snapshot, jobs: [], completeDates: []}, {...snapshot, jobs: [], completeDates: ['2026-10-16'], truncated: true, home:{name:'Employee',userCode:'123',days:[{dateISO:'2026-10-16',label:'Yard Based'}]}}]) {
    const text = renderedText(renderStartup({snapshot: saved}));
    assert.doesNotMatch(text, /No jobs assigned|Yard Based|No job assigned/);
    assert.match(text, /No saved work details/);
  }
});
test('saved jobs remain visible while current access is refreshing or unavailable', () => {
  for (const status of ['restoring', 'unavailable']) {
    const text = renderedText(renderStartup({snapshot, status}));
    assert.match(text, /Saved job/);
  }
});

test('startup restores the previous Home header and exact day labels instead of a generic saved-data screen', () => {
  const today = new Date(); const tomorrow = new Date(today);tomorrow.setDate(today.getDate()+1);
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const saved={...snapshot,jobs:[],selectedDateISO:iso(tomorrow),completeDates:[iso(today),iso(tomorrow)],home:{name:'Saved Employee',userCode:'123',days:[{dateISO:iso(today),label:'Yard Based'},{dateISO:iso(tomorrow),label:'Off'}]}};
  const text=renderedText(renderStartup({snapshot:saved}));
  for(const label of ['Saved Employee','Code 123','Yard Based','Off','No assigned job details for today.','No job assigned.'])assert.ok(text.includes(label),label);
  assert.doesNotMatch(text,/Welcome back|Your saved schedule|No jobs assigned/);
});
