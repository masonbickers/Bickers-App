import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const display = await import('../lib/startup/display.js').catch(()=>({}));
const require = createRequire(import.meta.url);
const React = require('react');
const { transformSync } = require('@babel/core');
const filename = new URL('../app/_layout.jsx', import.meta.url).pathname;
const { code } = transformSync(readFileSync(filename, 'utf8') + '\nexport { ShellInner };', {
  filename, configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});
function render({ loading = true, isAuthed = false, group = '(auth)', securityTransition = null, startup = {enabled:false,restored:true,snapshot:null}, startupAccessStatus = 'restoring' } = {}) {
  const hooks = { ...React, useEffect() {}, useState: initial => [initial, () => {}], useRef: value => ({ current: value }) };
  const mocks = {
    react: { ...hooks, default: hooks, __esModule: true },
    'expo-router': { Slot: 'Slot', useSegments: () => [group], usePathname: () => group === '(auth)' ? '/login' : '/screens/homescreen', useRouter: () => ({ replace() {} }) },
    'react-native': { View: 'View', Platform: { OS: 'ios' } },
    'expo-splash-screen': { preventAutoHideAsync: async () => {} },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    '../providers/StartupSnapshotProvider': {useStartupSnapshot:()=>startup},
    '../providers/ClerkFirebaseProvider': {useClerkFirebase:()=>({enabled:startup.enabled,loading:true})},
    '../lib/startup/display': display,
    '../components/startup/StartupPreview':{default:'StartupPreview',__esModule:true},
    '../providers/AuthProvider': { useAuth: () => ({ loading, isAuthed, startupAccessStatus, employee: {}, workingTermsAccepted: true, securityTransition }) },
    '../providers/ThemeProvider': { useTheme: () => ({ colors: { background: 'black' }, colorScheme: 'dark' }) },
    '../lib/access': { resolveWorkspaceAccess: () => ({ user: true }) },
    '../lib/appChrome': { resolveAppChrome: () => ({ tabsVisible: true }) },
    '../hooks/useReceiptSync': { useReceiptSync() {} },
    '../lib/design/tokens': { designTokens: { spacing: { md: 16, xl: 24 }, navigation: { tabBarHeight: 50 } } },
    '../lib/errorMonitoring': { withErrorMonitoring: value => value },
    '../components/layout/RootSurface': { default: 'RootSurface', __esModule: true },
    '../components/AsyncState': { LoadingState: 'LoadingState' },
    '../components/app/footer': { default: 'Footer', __esModule: true },
    '../components/SecureAccount': { default: 'SecureAccount', __esModule: true },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, process: { env: {} }, require: name => mocks[name] || {} }, { filename });
  const tree = module.exports.ShellInner();
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    nodes.push(node); visit(node.props.children);
  }
  visit(tree);
  return nodes;
}
function routeContainer(nodes) { return nodes.find(n => n.type === 'View' && React.Children.toArray(n.props.children).some(c => c.type === 'Slot' || c.type === 'SecureAccount')); }
for (const options of [
  { loading: true, group: '(auth)' },
  { loading: true, isAuthed: true, group: '(protected)' },
  { loading: false, isAuthed: true, group: '(auth)' },
  { loading: false, isAuthed: false, group: '(protected)' },
]) {
  test(`restoration/redirect hides routed content without unmounting it: ${JSON.stringify(options)}`, () => {
    const nodes = render(options), route = routeContainer(nodes);
    assert.ok(route, 'keep the Slot mounted to preserve screen state');
    assert.equal(route.props.style.display, 'none');
    assert.equal(route.props.accessibilityElementsHidden, true);
    assert.equal(nodes.filter(n => n.type === 'LoadingState').length, 1);
    assert.equal(nodes.filter(n => n.type === 'Footer').length, 0);
  });
}
for (const options of [
  { loading: false, isAuthed: true, group: '(protected)' },
  { loading: false, isAuthed: false, group: '(auth)' },
  { loading: true, group: '(protected)', securityTransition: { error: 'Security check required' } },
]) {
  test(`settled sign-in, approved Home and security recovery remain visible: ${JSON.stringify(options)}`, () => {
    const nodes = render(options);
    assert.notEqual(routeContainer(nodes).props.style.display, 'none');
    assert.equal(nodes.filter(n => n.type === 'LoadingState').length, 0);
  });
}

test('eligible saved content replaces the waiting screen while protected routes and footer stay hidden',()=>{
  const now=Date.now();const cached={version:1,identity:{clerkUserId:'u',clerkSessionId:'s',uid:'f',companyId:'c',employeeId:'e'},generation:1,verifiedAt:now,savedAt:now,route:'home',selectedDateISO:'2026-10-16',selectedJobId:null,jobs:[],completeDates:['2026-10-16'],truncated:false};
  const nodes=render({startup:{enabled:true,restored:true,snapshot:cached}});
  assert.equal(nodes.filter(n=>n.type==='StartupPreview').length,1);assert.equal(routeContainer(nodes).props.style.display,'none');assert.equal(nodes.filter(n=>n.type==='Footer').length,0);
});
