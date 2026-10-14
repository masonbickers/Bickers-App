import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { pickReceiptDocuments } from "../lib/receipts/documentPicker.js";

function receiptScreen() {
  const require = createRequire(import.meta.url), ts = require("typescript");
  const source = readFileSync(new URL("../app/(protected)/receipts.js", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const states = [], refs = [], edits = []; let stateIndex = 0, refIndex = 0;
  const actor = { uid: "demo", personId: "person" };
  const workspace = { actor, workspace: { companyId: "company", cards: {}, receipts: {} } };
  const files = [
    { id: "pdf", fileType: "application/pdf", fileName: "two-pages.pdf" },
    { id: "image", fileType: "image/png", fileName: "original.png" },
  ];
  const queue = { scope: "company/demo", companyId: "company", uid: "demo", create: async (fields) => ({ localId: "local", id: "receipt", fields, cardTouched: false, files: [] }), editFields: async (_id, fields) => { edits.push(fields); } };
  const jsx = (type, props) => ({ type, props });
  const componentNames = ["AppModal", "AppButton", "AppText", "AppPressable", "FormField", "DateField", "SelectField", "MediaViewerModal"];
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    react: {
      useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = index === 0 ? workspace : typeof initial === "function" ? initial() : initial; return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
      useRef(initial) { const index = refIndex++; return refs[index] ||= { current: initial }; },
      useMemo: (compute) => compute(), useCallback: (callback) => callback, useEffect() {},
    },
    "react-native": { ActivityIndicator: "ActivityIndicator", Alert: { alert: (_title, message) => { throw new Error(message); } }, AppState: {}, Image: "Image", Linking: {}, Platform: { OS: "ios" }, StyleSheet: { create: (value) => value }, View: "View" },
    "expo-router": { useLocalSearchParams: () => ({}), useRouter: () => ({}) },
    "../../lib/receipts/documentPicker": { pickReceiptDocuments }, "expo-image-picker": {}, "@react-native-community/netinfo": { default: {} },
    "react-native-webview": { WebView: "WebView" }, "react-native-vector-icons/Feather": { default: "Icon" },
    "../../lib/design/cardSurface": { getCardSurfaceStyle: () => ({}) },
    "../../components/ui/AppPrimitives": Object.fromEntries(componentNames.map((name) => [name, name])),
    "../../components/layout/PageShell": { default: "PageShell" },
    "../../providers/AuthProvider": { useAuth: () => ({ user: { uid: actor.uid }, employee: { employeeId: actor.personId, companyId: "company" } }) },
    "../../providers/ThemeProvider": { useTheme: () => ({ colors: {} }) },
    "../../lib/design/tokens": { designTokens: { spacing: {}, radius: {} } },
    "../../lib/receiptApi": {},
    "../../lib/dateFormat": { formatISODateDDMMYYYY: (value) => value || "" },
    "../../lib/receipts/native": { getDeviceReceiptQueue: () => queue, getDeviceReceiptCache: () => ({}), openSavedEvidence: async (_queue, _user, id) => ({ ...files.find((file) => file.id === id), uri: `file:///private/verified/${id}` }) },
    "../../lib/receipts/queue": {},
    "../../lib/receipts/capture": { receiptAmountInput: () => ({ text: "", isRefund: false }) },
    "../../lib/receipts/cardSelection": { eligibleReceiptCards: () => [], defaultReceiptCardId: () => "" },
    "../../lib/receipts/navigation": { receiptRouteParams: () => ({}), ownsReceipt: () => true, receiptAttachments: () => files, correctionNeedsReview: () => false },
    "../../lib/privacyPolicy": {},
    "../../lib/design/screenStyles/receipts-js.js": { styles: {} },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, Intl, Date, console, require: (id) => { assert.ok(Object.hasOwn(modules, id), `Unexpected import: ${id}`); return modules[id]; } });
  return { edits, render() { stateIndex = 0; refIndex = 0; return exports.default(); } };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const find = (tree, type, predicate = () => true) => nodes(tree).find((node) => node.type === type && predicate(node.props));

test("iOS attachment viewing stays in one receipt modal and Back preserves the edited draft", async () => {
  const screen = receiptScreen(); let tree = screen.render();
  await tree.props.header.action.onPress(); tree = screen.render();
  find(tree, "FormField", (props) => props.label === "Merchant").props.onChangeText("Edited merchant");
  tree = screen.render();
  await find(tree, "AppPressable", (props) => props.accessibilityLabel === "View two-pages.pdf").props.onPress();
  tree = screen.render();
  assert.equal(nodes(tree).filter((node) => node.type === "AppModal").length, 1);
  let modal = find(tree, "AppModal");
  assert.equal(modal.props.visible, true); assert.equal(modal.props.title, "Receipt PDF");
  assert.equal(modal.props.scrollable, false); assert.equal(modal.props.closeLabel, "Back to receipt");
  const pdf = find(tree, "WebView");
  assert.equal(pdf.props.source.uri, "file:///private/verified/pdf");
  assert.equal(pdf.props.allowingReadAccessToURL, pdf.props.source.uri);
  assert.equal(pdf.props.javaScriptEnabled, false);
  assert.equal(pdf.props.originWhitelist.join(), "file://*");
  assert.equal(pdf.props.onShouldStartLoadWithRequest({ url: pdf.props.source.uri }), true);
  assert.equal(pdf.props.onShouldStartLoadWithRequest({ url: "about:blank" }), true);
  assert.equal(pdf.props.onShouldStartLoadWithRequest({ url: "https://external.example" }), false);
  assert.equal(pdf.props.onShouldStartLoadWithRequest({ url: "file:///private/another-file" }), false);
  modal.props.onRequestClose(); tree = screen.render();
  assert.equal(find(tree, "AppModal").props.visible, true);
  assert.equal(find(tree, "FormField", (props) => props.label === "Merchant").props.value, "Edited merchant");
  assert.equal(screen.edits.length, 1);

  await find(tree, "AppPressable", (props) => props.accessibilityLabel === "View original.png").props.onPress();
  tree = screen.render(); modal = find(tree, "AppModal");
  assert.equal(modal.props.title, "Receipt original");
  assert.equal(nodes(tree).filter((node) => node.type === "AppModal").length, 1);
  assert.equal(find(tree, "MediaViewerModal"), undefined);
  const image = find(tree, "Image", (props) => props.accessibilityLabel === "Receipt original");
  assert.equal(image.props.resizeMode, "contain");
  assert.equal(image.props.source.uri, "file:///private/verified/image");
  find(tree, "AppButton", (props) => props.label === "Back to receipt").props.onPress(); tree = screen.render();
  assert.equal(find(tree, "FormField", (props) => props.label === "Merchant").props.value, "Edited merchant");
  assert.equal(screen.edits.length, 1);
});
