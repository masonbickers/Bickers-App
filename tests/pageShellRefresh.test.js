import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import { ASYNC_STATES, resolveAsyncState } from '../lib/asyncState.js';

const require = createRequire(import.meta.url);
const React = require('react');
const { transformSync } = require('@babel/core');
const filename = new URL('../components/layout/PageShell.tsx', import.meta.url).pathname;
const { code } = transformSync(readFileSync(filename, 'utf8'), {
  filename, configFile: false, babelrc: false,
  plugins: [
    ['@babel/plugin-transform-typescript', { isTSX: true }],
    '@babel/plugin-transform-react-jsx',
    '@babel/plugin-transform-modules-commonjs',
  ],
});

// Execute the actual shell and state resolver. Native hosts and hook context
// are substituted so the Node runner can inspect the composed element tree.
function renderShell({ platform = 'ios', refreshing = true, mode = 'scroll', resources, refresh = true, scrollProps } = {}) {
  const hooks = { ...React, useEffect() {}, useMemo: fn => fn(), useState: value => [value, () => {}] };
  const mocks = {
    react: { ...hooks, default: hooks, __esModule: true },
    'expo-router': { usePathname: () => '/screens/homescreen', useSegments: () => ['(protected)', '(main-tabs)'] },
    'react-native': {
      FlatList: 'FlatList', ScrollView: 'ScrollView', View: 'View', RefreshControl: 'RefreshControl',
      KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: platform }, StyleSheet: { create: x => x },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) },
    '../../lib/appChrome': { getPageShellBottomPadding: () => 80, resolveAppChrome: () => ({ tabsVisible: true }) },
    '../../lib/asyncState': { ASYNC_STATES, resolveAsyncState },
    '../../lib/design/pageDensity': { resolvePageDensity: () => 'standard' },
    '../../lib/design/tokens': { designTokens: { spacing: { none: 0, xs: 8, xxs: 4, sm: 12, md: 16 }, navigation: { contentGap: 8 } } },
    '../../hooks/useResponsiveLayout': { useResponsiveLayout: () => ({ pageGutter: 16, maxContentWidth: 900, fontScale: 1 }) },
    '../../providers/ThemeProvider': { useTheme: () => ({ colors: { accent: 'red', background: 'white' } }) },
    '../../providers/NavigationAccessoryProvider': { useNavigationAccessoryHeight: () => 0 },
    '../AsyncState': { LoadingState: 'LoadingState', EmptyState: 'EmptyState', ErrorState: 'ErrorState', RefreshingIndicator: 'RefreshingIndicator' },
    '../PageHeaderCard': { default: 'PageHeaderCard', __esModule: true },
    '../ui/AppPrimitives': { AppButton: 'AppButton' },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, require: name => {
    assert.ok(name in mocks, `Unexpected import ${name}`);
    return mocks[name];
  } }, { filename });
  const onRefresh = () => {};
  const tree = module.exports.default({
    mode,
    scrollProps,
    state: { resources: resources || [{ isRefreshing: true }], hasContent: true, onRetry: onRefresh },
    refresh: refresh ? { refreshing, onRefresh } : undefined,
    listProps: mode === 'list' ? { data: ['saved'], renderItem: () => null } : undefined,
    children: React.createElement('SavedContent'),
  });
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    nodes.push(node);
    visit(node.props.children);
    visit(node.props.refreshControl);
    visit(node.props.ListHeaderComponent);
  }
  visit(tree);
  return { nodes, onRefresh };
}

test('an iOS form using native keyboard insets has only one keyboard avoidance owner', () => {
  const { nodes } = renderShell({ mode: 'form', scrollProps: { automaticallyAdjustKeyboardInsets: true } });
  const scroll = nodes.find(n => n.type === 'ScrollView');
  assert.equal(scroll.props.automaticallyAdjustKeyboardInsets, true);
  assert.equal(nodes.filter(n => n.type === 'KeyboardAvoidingView').length, 0);
  assert.equal(scroll.props.keyboardShouldPersistTaps, 'handled');
  assert.equal(scroll.props.keyboardDismissMode, 'interactive');
  assert.equal(nodes.filter(n => n.type === 'SavedContent').length, 1);
});

for (const options of [
  { platform: 'ios' },
  { platform: 'ios', scrollProps: { automaticallyAdjustKeyboardInsets: false } },
  { platform: 'android', scrollProps: { automaticallyAdjustKeyboardInsets: true } },
]) {
  test(`other forms retain their keyboard avoidance: ${JSON.stringify(options)}`, () => {
    const { nodes } = renderShell({ mode: 'form', ...options });
    assert.equal(nodes.filter(n => n.type === 'KeyboardAvoidingView').length, 1);
  });
}

for (const platform of ['ios', 'android']) {
  for (const mode of ['scroll', 'list', 'form']) {
    test(`${platform} ${mode} uses one active pull-to-refresh indicator`, () => {
      const { nodes, onRefresh } = renderShell({ platform, mode });
      const control = nodes.filter(n => n.type === 'RefreshControl');
      assert.equal(control.length, 1);
      assert.equal(control[0].props.refreshing, true);
      assert.equal(control[0].props.onRefresh, onRefresh);
      assert.equal(nodes.filter(n => n.type === 'RefreshingIndicator').length, 0);
      if (mode !== 'list') assert.equal(nodes.filter(n => n.type === 'SavedContent').length, 1);
    });
  }
}

for (const options of [
  { platform: 'web' },
  { refreshing: false },
  { refresh: false },
  { mode: 'static' },
]) {
  test(`background/static/web refresh retains inline feedback: ${JSON.stringify(options)}`, () => {
    const { nodes } = renderShell(options);
    assert.equal(nodes.filter(n => n.type === 'RefreshingIndicator').length, 1);
  });
}

test('a refresh error retains its retry message during a native refresh', () => {
  const { nodes, onRefresh } = renderShell({ resources: [{ error: new Error('offline'), isRefreshing: true }] });
  const errors = nodes.filter(n => n.type === 'ErrorState');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].props.onRetry, onRefresh);
  assert.equal(errors[0].props.retrying, true);
  assert.equal(nodes.filter(n => n.type === 'RefreshingIndicator').length, 0);
});

test('settled content does not retain inline refresh feedback', () => {
  const { nodes } = renderShell({ refreshing: false, resources: [{}] });
  assert.equal(nodes.filter(n => n.type === 'RefreshingIndicator').length, 0);
  assert.equal(nodes.filter(n => n.type === 'SavedContent').length, 1);
});
