import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import path from 'node:path';
import { resolveAsyncState, ASYNC_STATES } from '../lib/asyncState.js';
const require = createRequire(import.meta.url);
const React = require('react');
const { transformSync } = require('@babel/core');

// Exercise the actual route and saved presentation; substitute only native/services.
function harness({verified = true} = {}) {
  let resources, index = 0;
  const slots = [];
  const hooks = { ...React, useEffect() {}, useCallback: fn => fn, useMemo: fn => fn(),
    useRef: current => ({current}),
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
  };
  const employee = {uid:'u',companyId:'c',userCode:'1234',name:'Test Employee'};
  const mocks = {
    react: {...hooks,default:hooks,__esModule:true},
    'react-native': {View:'View',Image:'Image'},
    'expo-router': {useRouter:()=>({push(){},navigate(){}}),useLocalSearchParams:()=>({})},
    '@react-native-async-storage/async-storage': {default:{},__esModule:true},
    'expo-image-picker': {MediaTypeOptions:{Images:'images'}},
    'react-native-safe-area-context': {useSafeAreaInsets:()=>({bottom:0})},
  };
  const local = {
    'providers/StartupSnapshotProvider': {useStartupSnapshot:()=>({snapshot:{savedAt:Date.now(),jobs:[],home:{name:'Test Employee'},completeDates:[]}})},
    'providers/AuthProvider': {useAuth:()=>({employee:verified ? employee : null,user:{uid:'u'},isAuthed:verified,loading:!verified})},
    'providers/DataCacheProvider': {useDataCache:()=>({invalidate(){}})},
    'providers/ThemeProvider': {useTheme:()=>({colors:{},colorScheme:'dark'})},
    'hooks/useResponsiveLayout': {useResponsiveLayout:()=>({width:390,fontScale:1})},
    'hooks/useReducedMotion': {useReducedMotion:()=>false},
    'hooks/useStartupSnapshotCapture': {useStartupSnapshotCapture(){}},
    'hooks/useOperationalData': {useBookings:()=>resources.bookings,useHolidays:()=>resources.holidays,useVehicles:()=>resources.vehicles},
    'lib/notificationInbox': {collapseInboxDuplicates:rows=>rows},
    'lib/access': {resolveWorkspaceAccess:()=>({user:true})},
    'lib/bookingVisibility': {isCrewedBooking:()=>true},
    'lib/linkedBookingDays': {collapseLinkedJobsForDay:rows=>rows,displayJobNumber:job=>job.jobNumber},
    'lib/fleetSchema': {getBookingVehicleReferences:()=>[],getVehicleDisplayList:()=>[]},
    'lib/design/dashboardLayout': {getDashboardGridColumns:()=>2},
    'lib/design/screenStyles/main-tabs-screens-homescreen-js': {styles:{}},
    'lib/design/routePresentation/main-tabs-screens-homescreen-js': {routeColors:{}},
    'lib/design/tokens': {designTokens:{spacing:{md:16}}},
    'lib/startup/display': {restoreStartupDate:()=>null},
    'lib/dateDisplay': {formatLongBookingDate:value=>value},
    'lib/homeDayStatus': {getHomeDayLabel:()=> 'Yard Based'},
    'lib/design/semantics': {getStatusColors:()=>({})},
    'components/ui/AppPrimitives': {SectionCard:'SectionCard',AppText:'Text',AppButton:'Button'},
    'components/home/HomeDayStatus': {default:'HomeDayStatus',__esModule:true},
    'components/home/HomeDashboard': {default:'HomeDashboard',__esModule:true},
    'components/startup/StartupContentMarker': {default:'Marker',__esModule:true},
    'components/layout/PageShell': {default:props=>{
      const state=resolveAsyncState(props.state.resources,{hasContent:props.state.hasContent});
      return React.createElement('PageShell',{},state===ASYNC_STATES.INITIAL_LOADING ? props.state.loadingContent : props.children);
    },__esModule:true},
  };
  function load(relative) {
    const filename = new URL('../'+relative,import.meta.url).pathname;
    const {code} = transformSync(readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']});
    const module={exports:{}};
    vm.runInNewContext(code,{module,exports:module.exports,React,Date,console,process:{env:{}},require:name=>mocks[name]||local[path.relative(new URL('..',import.meta.url).pathname,path.resolve(path.dirname(filename),name)).replace(/\.js$/, '')]||{}},{filename});
    return module.exports;
  }
  local['components/startup/StartupHomeDashboard'] = load('components/startup/StartupHomeDashboard.jsx');
  const Home = load('app/(protected)/(main-tabs)/screens/homescreen.js').default;
  return {
    render(next) {
      resources=next;index=0;const found=[];
      function walk(node,path=[]) {
        if(Array.isArray(node)) return node.forEach((child,i)=>walk(child,[...path,i]));
        if(!React.isValidElement(node)) return;
        const type=node.type;
        const nextPath=[...path,typeof type==='function'?type:type?.toString()];
        if(type==='HomeDashboard') found.push({props:node.props,path:nextPath});
        else if(typeof type==='function' && !['AccountModal','JobDetailsModal','RecceModal'].includes(type.name)) walk(type(node.props),nextPath);
        else walk(node.props.children,nextPath);
      }
      walk(Home());assert.equal(found.length,1);return found[0];
    }
  };
}
const resource = extra => ({data:[],employees:[],lastUpdatedAt:1,isInitialLoading:false,refresh:async()=>{},...extra});
const state = extra => ({bookings:resource(extra),holidays:resource(extra),vehicles:resource(extra)});

test('Home keeps the dashboard at the same reconciliation position when data finishes loading',()=>{
  const app=harness();
  const saved=app.render(state({isInitialLoading:true,lastUpdatedAt:null}));
  const live=app.render(state());
  assert.deepEqual(live.path,saved.path,'do not replace/remount the saved dashboard');
  const initialError=app.render(state({error:Error('offline'),lastUpdatedAt:null}));
  assert.deepEqual(initialError.path,saved.path);
  assert.notEqual(initialError.props.refreshingAccess,true,'data failure must not disable verified account navigation');
  assert.notEqual(saved.props.refreshingAccess,true,'verified navigation must not wait for Home data');
  assert.equal(typeof saved.props.onAction,'function');
  assert.equal(saved.props.dataPending,true);
  assert.notEqual(live.props.refreshingAccess,true);
  const failed=app.render(state({isRefreshing:false,error:Error('offline')}));
  assert.deepEqual(failed.path,live.path,'refresh errors retain the mounted dashboard');
});

test('Home renders newly loaded assigned work immediately, without an intermediate empty day',()=>{
  const app=harness();app.render(state({isInitialLoading:true,lastUpdatedAt:null}));
  const now=new Date();const iso=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const next=state();next.bookings=resource({data:[{id:'job',jobNumber:'42',bookingDates:[iso],employeeCodes:['1234']}]});
  const live=app.render(next);
  assert.equal(live.props.todayCount,1,'fresh data must be presented in this render, before effects');
});

test('slow holidays and vehicles do not hold back loaded assigned jobs or verified navigation',()=>{
  const app=harness();
  const now=new Date();const iso=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const next=state({isInitialLoading:true,lastUpdatedAt:null});
  next.bookings=resource({data:[{id:'job',jobNumber:'42',bookingDates:[iso],employeeCodes:['1234']}]});
  const partial=app.render(next);
  assert.equal(partial.props.todayCount,1);
  assert.notEqual(partial.props.refreshingAccess,true);
  assert.equal(partial.props.dataPending,true);
});

test('unfinished empty work sections keep saved content rather than claiming a confirmed empty day',()=>{
  const app=harness();
  const next=state({isInitialLoading:true,lastUpdatedAt:null});
  next.bookings=resource();
  const partial=app.render(next);
  assert.notEqual(partial.props.todayContent?.type,'HomeDayStatus');
  assert.equal(partial.props.dataPending,true);
});

test('Home controls remain disabled until account verification succeeds',()=>{
  const pending=harness({verified:false}).render(state());
  assert.equal(pending.props.refreshingAccess,true);
});
