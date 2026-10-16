import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { setImmediate as nextTurn } from 'node:timers/promises';
import vm from 'node:vm';
import test from 'node:test';
import * as asyncState from '../lib/asyncState.js';
import * as bookingVisibility from '../lib/bookingVisibility.js';
import * as dailyVehicleCheck from '../lib/dailyVehicleCheck.js';
import * as fleetSchema from '../lib/fleetSchema.js';
import * as dateFormat from '../lib/dateFormat.js';
import * as assetSelectOptions from '../lib/assetSelectOptions.js';
import { navigationMetrics } from '../lib/design/navigation.js';

const require = createRequire(import.meta.url);
const React = require('react');
const { transformSync } = require('@babel/core');

// Compile the complete production modules. Unknown imports fail closed so this
// harness cannot accidentally initialize Firebase, storage, media or navigation.
function loadSource(relative, mocks, hooks = React) {
  const filename = new URL(`../${relative}`, import.meta.url).pathname;
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: [
      ['@babel/plugin-transform-typescript', { isTSX: true }],
      '@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs',
    ],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, React,
    console: { warn() {}, error() {} },
    require: name => {
      if (name === 'react') return { ...hooks, default: hooks, __esModule: true };
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${relative} -> ${name}`);
      return mocks[name];
    },
  }, { filename });
  return module.exports;
}
const defaultExport = value => ({ default: value, __esModule: true });
const native = {
  ...Object.fromEntries(['View', 'Image', 'ScrollView', 'FlatList', 'RefreshControl', 'KeyboardAvoidingView', 'ActivityIndicator'].map(name => [name, name])),
  Platform: { OS: 'ios', select: options => options.ios ?? options.default }, StyleSheet: { create: value => value },
};
const tokens = loadSource('lib/design/tokens.ts', {
  'react-native': native, './navigation.js': { navigationMetrics },
  './platform': loadSource('lib/design/platform.ts', {}),
}).designTokens;
const cardSurface = loadSource('lib/design/cardSurface.js', {
  './tokens': { designTokens: tokens }, './radius': loadSource('lib/design/radius.ts', {}),
});
const primitives = Object.fromEntries(['AppText', 'AppPressable', 'AppButton', 'FormField', 'TextArea', 'SelectField', 'Banner', 'SectionCard'].map(name => [name, name]));

function screenHarness(screen, { dark = false, failRead = false } = {}) {
  const slots = [], effects = [], alerts = [];
  let index = 0, tracking = false, collectEffects = true, backCount = 0;
  const hooks = {
    ...React,
    useState(initial) {
      if (!tracking) return [typeof initial === 'function' ? initial() : initial, () => {}];
      const slot = index++;
      if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
      return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useRef: value => ({ current: value }),
    useMemo: fn => fn(), useCallback: fn => fn,
    useEffect: effect => { if (tracking && collectEffects) effects.push(effect); },
  };
  const colors = {
    background: dark ? '#000' : '#fff', groupedSurface: dark ? '#222' : '#eee',
    surface: dark ? '#111' : '#fff', surfaceAlt: dark ? '#333' : '#eee',
    text: dark ? '#fff' : '#000', textMuted: dark ? '#ccc' : '#444',
    border: '#888', accent: '#c00', danger: '#c00', textOnAccent: '#fff',
  };
  const theme = { useTheme: () => ({ colors, tokens }) };
  const asyncUI = loadSource('components/AsyncState.js', {
    'react-native': native, 'react-native-vector-icons/Feather': defaultExport('Icon'),
    '../lib/asyncState': asyncState, '../lib/design/tokens': { designTokens: tokens },
    '../providers/ThemeProvider': theme, './ui/AppPrimitives': primitives,
  }, hooks);
  const PageShell = loadSource('components/layout/PageShell.tsx', {
    'expo-router': { usePathname: () => `/${screen}`, useSegments: () => ['(protected)'] },
    'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) },
    '../../lib/appChrome': { getPageShellBottomPadding: () => 0, resolveAppChrome: () => ({ tabsVisible: false }) },
    '../../lib/asyncState': asyncState,
    '../../lib/design/pageDensity': { resolvePageDensity: () => 'standard' },
    '../../lib/design/tokens': { designTokens: tokens },
    '../../hooks/useResponsiveLayout': { useResponsiveLayout: () => ({ pageGutter: 16, maxContentWidth: 900, maxFormWidth: 640, fontScale: 1 }) },
    '../../providers/ThemeProvider': theme,
    '../../providers/NavigationAccessoryProvider': { useNavigationAccessoryHeight: () => 0 },
    '../AsyncState': asyncUI, '../PageHeaderCard': defaultExport('PageHeaderCard'),
    '../ui/AppPrimitives': primitives,
  }, hooks).default;
  const employee = { companyId: 'synthetic-company', userCode: 'TEST', displayName: 'Test Driver' };
  const router = { back: () => { backCount++; } };
  const firestore = {
    doc: (_db, collection, id) => ({ collection, id }),
    getDoc: async reference => {
      if (failRead) throw new Error('synthetic read failure');
      return { id: reference.id, exists: () => reference.collection === 'bookings', data: () => ({ isCrewed: true, employeeCodes: ['TEST'], location: 'Test location' }) };
    },
    collection: (_db, name) => name, where: (...args) => args, query: (...args) => args,
    getDocs: async () => { if (failRead) throw new Error('synthetic read failure'); return { docs: [] }; },
  };
  const Screen = loadSource(`app/(protected)/${screen}.js`, {
    '../../components/layout/PageShell': defaultExport(PageShell),
    '../../components/ui/AppPrimitives': primitives,
    '../../lib/design/cardSurface': cardSurface,
    [`../../lib/design/routePresentation/${screen}-js.js`]: { reccePalette: {}, routeColors: {} },
    [`../../lib/design/screenStyles/${screen}-js.js`]: { styles: {} },
    '@react-native-async-storage/async-storage': defaultExport({ getItem: async () => null }),
    'expo-router': { useRouter: () => router, useLocalSearchParams: () => ({ jobId: 'synthetic-job', dateISO: '2026-10-16' }) },
    'react-native': { ...native, Alert: { alert: (...args) => alerts.push(args) } },
    'react-native-vector-icons/Feather': defaultExport('Icon'),
    'expo-image-manipulator': {}, 'expo-image-picker': { MediaTypeOptions: { Images: 'Images' } },
    'firebase/firestore': firestore, 'firebase/storage': {},
    '../../firebaseConfig': { auth: {}, db: {}, storage: {} },
    '../../lib/bookingVisibility': bookingVisibility,
    '../../lib/dateFormat': dateFormat, '../../lib/dailyVehicleCheck': dailyVehicleCheck,
    '../../lib/fleetSchema': fleetSchema, '../../lib/assetSelectOptions': assetSelectOptions,
    '../../lib/design/tokens': { designTokens: tokens },
    '../../hooks/useOperationalData': { useVehicles: () => ({ data: [] }) },
    '../../providers/AuthProvider': { useAuth: () => ({ employee, user: { uid: 'synthetic-user' }, isAuthed: true, loading: false }) },
    '../../providers/DataCacheProvider': { useDataCache: () => ({ invalidate: async () => {} }) },
    '../../providers/ThemeProvider': theme,
  }, hooks).default;

  // Expand real screen/shell/loading components into substituted native hosts.
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    if (typeof node.type === 'function') return visit(node.type(node.props));
    nodes.push(node); visit(node.props.children);
  }
  return {
    mount() {
      index = 0; tracking = true;
      let tree;
      try { tree = Screen(); } finally { tracking = false; collectEffects = false; }
      return tree;
    },
    render() {
      nodes.length = 0; visit(this.mount()); return nodes;
    },
    async settle() { effects.splice(0).forEach(effect => effect()); await nextTurn(); },
    recover() { failRead = false; },
    alerts, backCount: () => backCount,
  };
}
const cases = [
  { screen: 'recce-form', label: 'Loading Recce Form...', submit: 'Submit Recce Form' },
  { screen: 'vehicle-check', label: 'Loading vehicle check…', submit: 'Submit Check' },
];
for (const { screen, label, submit } of cases) {
  for (const dark of [false, true]) {
    test(`${screen}: production loading branch exposes shared labelled progress (${dark ? 'dark' : 'light'} fixture)`, () => {
      const nodes = screenHarness(screen, { dark }).render();
      const progress = nodes.filter(node => node.props.accessibilityRole === 'progressbar');
      assert.equal(progress.length, 1);
      assert.equal(progress[0].props.accessibilityLabel, label);
      assert.equal(nodes.filter(node => node.type === 'ActivityIndicator').length, 1);
      assert.ok(nodes.some(node => node.type === 'AppText' && node.props.children === label));
      assert.equal(nodes.some(node => node.type === 'AppButton' && node.props.label === submit), false);
    });
  }
  test(`${screen}: completing the existing loader replaces progress with the loaded form`, async () => {
    const harness = screenHarness(screen);
    harness.mount();
    await harness.settle();
    const nodes = harness.render();
    assert.equal(nodes.some(node => node.props.accessibilityRole === 'progressbar'), false);
    assert.ok(nodes.some(node => node.type === 'AppButton' && node.props.label === submit));
    assert.equal(harness.alerts.length, 0);
    assert.equal(harness.backCount(), 0);
  });
}

test('recce-form: read failure retains the existing load-error alert and back navigation', async () => {
  const harness = screenHarness('recce-form', { failRead: true });
  harness.mount();
  await harness.settle();
  assert.deepEqual(harness.alerts, [['Load Error', 'Failed to load form data.']]);
  assert.equal(harness.backCount(), 1);
});

test('vehicle-check: read failure retains the warning and retry; successful retry restores the form', async () => {
  const harness = screenHarness('vehicle-check', { failRead: true });
  harness.mount();
  await harness.settle();
  let nodes = harness.render();
  assert.equal(nodes.some(node => node.props.accessibilityRole === 'progressbar'), false);
  assert.ok(nodes.some(node => node.type === 'Banner' && node.props.title === 'Vehicle check unavailable'));
  const retry = nodes.find(node => node.type === 'AppButton' && node.props.label === 'Retry loading check');
  assert.ok(retry);
  harness.recover();
  await retry.props.onPress();
  nodes = harness.render();
  assert.equal(nodes.some(node => node.type === 'Banner' && node.props.title === 'Vehicle check unavailable'), false);
  assert.ok(nodes.some(node => node.type === 'AppButton' && node.props.label === 'Submit Check'));
  assert.equal(harness.backCount(), 0);
});
