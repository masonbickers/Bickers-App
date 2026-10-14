import { getCardSurfaceStyle } from "../../lib/design/cardSurface";
import { styles } from "../../lib/design/screenStyles/receipts-js.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Image, Linking, Platform, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { pickReceiptDocuments } from "../../lib/receipts/documentPicker";
import * as ImagePicker from "expo-image-picker";
import NetInfo from "@react-native-community/netinfo";
import { WebView } from "react-native-webview";
import Icon from "react-native-vector-icons/Feather";
import { AppModal, AppButton, AppText as Text, AppPressable, FormField, DateField, SelectField, SegmentedControl } from "../../components/ui/AppPrimitives";
import PageShell from "../../components/layout/PageShell";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { designTokens as t } from "../../lib/design/tokens";
import { getReceiptWorkspace } from "../../lib/receiptApi";
import { formatISODateDDMMYYYY } from "../../lib/dateFormat";
import { getDeviceReceiptCache, getDeviceReceiptQueue, MAX_FILE_BYTES, openSavedEvidence, preserveReceiptFile, receiptAndroidContentUri, syncDeviceReceipts } from "../../lib/receipts/native";
import { validateReceiptFields } from "../../lib/receipts/queue";
import { receiptAmountInput, RECEIPT_FILE_TYPES, signedReceiptPence } from "../../lib/receipts/capture";
import { defaultReceiptCardId, eligibleReceiptCards } from "../../lib/receipts/cardSelection";

import { actionableReceiptRequest, correctionNeedsReview, ownsReceipt, receiptAttachments, receiptFinanceUrl, receiptRouteParams, resolveReceiptNavigation } from "../../lib/receipts/navigation";
import { PRIVACY_POLICY_URL } from "../../lib/privacyPolicy";

const values = (map) => Object.values(map || {});
const reviewState = (receipt) => receipt.reviewState || receipt.status || "submitted";
const receiptLabel = (receipt) => ({ needs_action: "Needs action", approved: "Approved by finance", submitted: "With finance", legacy_hold: "Earlier receipt · finance review" })[reviewState(receipt)] || "With finance";
const amountLabel = (pence, currency = "GBP") => {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(pence || 0) / 100); }
  catch { return `${(Number(pence || 0) / 100).toFixed(2)} ${currency}`; }
};
const dateToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const blankFields = () => ({ supplier: "", purchaseDate: dateToday(), currency: "GBP", grossPence: 0, isRefund: false, purpose: "", cardId: "", jobId: "", missingReceiptReason: "" });
const noteFor = (row) => row.requestNote || row.queryNote || row.request?.note || row.note || "Finance needs a receipt for this purchase.";

export default function ReceiptsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetParams = receiptRouteParams(params);
  const targetSignature = JSON.stringify(targetParams);
  const handledTarget = useRef("");
  const routeActions = useRef({});
  const cardEditor = useRef(null);
  const { colors } = useTheme();
  const { user, employee } = useAuth();
  const companyId = String(employee?.companyId || "");
  const uid = user?.uid || "";
  const queue = useMemo(() => companyId && uid && employee?.employeeId ? getDeviceReceiptQueue(companyId, uid, employee.employeeId) : null, [companyId, uid, employee?.employeeId]);
  const scope = queue ? `${queue.scope}/${employee?.employeeId || ""}` : null;
  const cache = useMemo(() => queue ? getDeviceReceiptCache(queue) : null, [queue]);
  const [workspaceResponse, setWorkspaceResponse] = useState(null);
  const [localRows, setLocalRows] = useState([]);
  const [tab, setTab] = useState("To send");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [offline, setOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [remoteReceipt, setRemoteReceipt] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(blankFields);
  const [grossText, setGrossText] = useState("");
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [progress, setProgress] = useState({});
  const [preview, setPreview] = useState(null);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const assertCurrentScope = useCallback(() => {
    if (!queue || currentScope.current !== scope) throw new Error("The receipt account changed. Open receipts again to continue.");
  }, [queue, scope]);
  const workspace = workspaceResponse?.workspace || {};
  const actor = workspaceResponse?.actor || {};
  const selected = localRows.find((row) => row.localId === selectedId);
  const frozen = Boolean(selected?.sendOperation);
  const editorReadOnly = Boolean((remoteReceipt && !selected) || selected?.phase === "sent");
  const uploading = selected?.phase === "uploading" && syncing;
  const own = useCallback((row) => ownsReceipt(row, { personId: actor.personId, uid }), [actor.personId, uid]);
  const remoteRows = values(workspace.receipts).filter(own);
  const pending = localRows.filter((row) => row.phase !== "sent");
  const sentLocal = localRows.filter((row) => row.phase === "sent" && !remoteRows.some((receipt) => receipt.id === row.id));
  const needsAction = remoteRows.filter((row) => reviewState(row) === "needs_action");
  const requests = values(workspace.transactions).filter((row) => actionableReceiptRequest(row, actor.personId));
  const cards = eligibleReceiptCards(workspace.cards, actor.personId, form.purchaseDate, dateToday());
  const defaultCardId = defaultReceiptCardId(selected, workspaceResponse, dateToday());
  const cardOptions = cards.map((card) => ({ value: card.id, label: `${card.label}${card.last4 ? ` · ${card.last4}` : ""}` }));
  const bookingOptions = [{ value: "", label: "No booking" }, ...(workspaceResponse?.bookingJobs || []).map((job) => ({ value: job.id, label: [job.jobNumber || job.bookingNumber, job.name || job.label || job.customerName].filter(Boolean).join(" · ") || job.id }))];

  const reloadLocal = useCallback(async () => {
    if (!queue) return;
    const rows = await queue.list();
    if (currentScope.current === scope) setLocalRows(rows);
  }, [queue, scope]);
  const refresh = useCallback(async () => {
    if (!queue || !user) { setLoading(false); setLoadError("Sign in with your company account to use receipts."); return; }
    setRefreshing(true);
    try {
      await reloadLocal();
      const cached = await cache.read(employee?.employeeId);
      if (currentScope.current !== scope) return;
      if (cached) { queue.verifyWorkspace(cached); setWorkspaceResponse((previous) => previous || cached); }
      const result = await getReceiptWorkspace(user, queue.companyId, { assertAccount: assertCurrentScope });
      if (currentScope.current !== scope) return;
      queue.verifyWorkspace(result);
      setWorkspaceResponse(result);
      await cache.write(result);
      setLoadError("");
    } catch (error) { if (currentScope.current === scope) setLoadError(error.message); }
    finally { if (currentScope.current === scope) { setLoading(false); setRefreshing(false); } }
  }, [cache, employee?.employeeId, queue, scope, user, reloadLocal, assertCurrentScope]);
  const sync = useCallback(async () => {
    if (!queue || !user) return;
    setSyncing(true);
    try {
      await syncDeviceReceipts(queue, user, (id, value) => { if (currentScope.current === scope) setProgress((previous) => ({ ...previous, [id]: value })); }, assertCurrentScope);
      if (currentScope.current === scope) await refresh();
    } catch (error) { if (currentScope.current === scope) setLoadError(error.message); }
    finally { if (currentScope.current === scope) { setSyncing(false); await reloadLocal(); } }
  }, [queue, scope, user, refresh, reloadLocal, assertCurrentScope]);

  useEffect(() => {
    currentScope.current = scope;
    handledTarget.current = "";
    cardEditor.current = null;
    setWorkspaceResponse(null); setLocalRows([]); setSelectedId(""); setRemoteReceipt(null); setEditorOpen(false); setPreview(null); setForm(blankFields()); setGrossText(""); setAttachmentBusy(false); setSyncing(false); setProgress({}); setLoading(true); setLoadError("");
    if (!queue) { setLoading(false); return undefined; }
    const stop = queue.subscribe(() => { reloadLocal().catch((error) => setLoadError(error.message)); });
    refresh();
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      const disconnected = state.isConnected === false || state.isInternetReachable === false;
      setOffline(disconnected);
      if (!disconnected) sync();
    });
    const appListener = AppState.addEventListener("change", (state) => { if (state === "active") sync(); });
    return () => { if (currentScope.current === scope) currentScope.current = null; stop(); unsubscribeNetwork(); appListener.remove(); };
  }, [queue, scope, reloadLocal, refresh, sync]);

  const closeEditor = () => { cardEditor.current = null; setEditorOpen(false); setSelectedId(""); setRemoteReceipt(null); setPreview(null); };
  const discardDraft = () => {
    const draftId = selectedId;
    if (!selected || !queue) return;
    Alert.alert("Discard draft?", "This draft will be removed from To send. Any original files remain saved on this device.", [
      { text: "Keep draft", style: "cancel" },
      { text: "Discard draft", style: "destructive", onPress: async () => {
        try {
          assertCurrentScope();
          await queue.discard(draftId);
          assertCurrentScope();
          closeEditor();
          await reloadLocal();
        } catch (error) { Alert.alert("Draft not discarded", error.message); }
      } },
    ]);
  };
  const showDraft = (draft) => {
    if (draft.identityHold) { Alert.alert("Saved receipt retained", draft.error); return; }
    if (!queue || currentScope.current !== scope) return;
    cardEditor.current = { localId: draft.localId, touched: draft.cardTouched !== false, defaultedCardId: draft.defaultedCardId || "" };
    const amount = receiptAmountInput(draft.fields.grossPence, draft.fields.isRefund);
    setSelectedId(draft.localId); setRemoteReceipt(null); setForm({ ...blankFields(), ...draft.fields, isRefund: amount.isRefund });
    setGrossText(amount.text); setEditorOpen(true);
  };
  const createDraft = async (fields = {}, requestedTransactionId = "") => {
    if (!queue) return Alert.alert("Sign in required", "Sign in with your company account to save receipts.");
    try {
      const draft = await queue.create({ ...blankFields(), ...fields, requestedTransactionId });
      if (requestedTransactionId) await queue.patch(draft.localId, { requestedTransactionId });
      assertCurrentScope();
      showDraft(draft);
    } catch (error) { Alert.alert("Receipt not saved", error.message); }
  };
  const openReceipt = async (receipt) => {
    if (!queue || currentScope.current !== scope) return;
    if (reviewState(receipt) === "needs_action") {
      try {
        const draft = await queue.create({ ...blankFields(), ...receipt, grossPence: receipt.grossPence || receipt.valuePence || 0, expectedReceiptVersion: receipt.version, expectedRequestId: receipt.request?.id || receipt.request?.createdAt }, { receiptId: receipt.id, correct: true, evidenceIds: receipt.evidenceIds || [] });
        showDraft(draft);
      } catch (error) { Alert.alert("Receipt unavailable", error.message); }
    } else {
      cardEditor.current = null;
      const amount = receiptAmountInput(receipt.grossPence || receipt.valuePence || 0);
      setSelectedId(""); setRemoteReceipt(receipt); setForm({ ...blankFields(), ...receipt, isRefund: amount.isRefund });
      setGrossText(amount.text); setEditorOpen(true);
    }
  };
  routeActions.current = { showDraft, openReceipt, createDraft };
  useEffect(() => {
    const signature = `${scope || ""}:${targetSignature}`;
    if (handledTarget.current === signature || !queue || currentScope.current !== scope) return;
    const target = resolveReceiptNavigation(JSON.parse(targetSignature), workspaceResponse, localRows);
    if (target.kind === "waiting") return;
    handledTarget.current = signature;
    if (target.kind === "draft") { setTab("To send"); routeActions.current.showDraft(target.draft); }
    else if (target.kind === "receipt") { setTab(reviewState(target.receipt) === "needs_action" ? "Needs action" : "Sent"); routeActions.current.openReceipt(target.receipt); }
    else if (target.kind === "request") {
      setTab("Needs action");
      const row = target.transaction;
      routeActions.current.createDraft({ cardId: row.cardId, supplier: row.description || "", purchaseDate: row.postedDate, grossPence: row.amountPence, currency: row.currency || "GBP" }, row.id);
    } else if (target.kind === "unavailable") { setTab("Needs action"); setLoadError(target.message); }
  }, [localRows, queue, scope, targetSignature, workspaceResponse]);
  useEffect(() => {
    const editor = cardEditor.current;
    if (!queue || !editorOpen || !defaultCardId || form.cardId || !editor || editor.localId !== selectedId || editor.touched) return;
    queue.applyDefaultCard(selectedId, workspaceResponse, dateToday()).then((draft) => {
      if (currentScope.current !== scope || cardEditor.current !== editor || editor.touched || draft.cardTouched !== false) return;
      editor.defaultedCardId = draft.defaultedCardId || "";
      setForm((previous) => !previous.cardId && previous.purchaseDate === draft.fields.purchaseDate ? { ...previous, cardId: draft.fields.cardId } : previous);
    }).catch((error) => { if (currentScope.current === scope) setLoadError(error.message); });
  }, [defaultCardId, editorOpen, form.cardId, form.purchaseDate, queue, scope, selectedId, workspaceResponse]);
  const changeField = (key, value) => {
    const editor = cardEditor.current;
    const automaticCard = editor && !editor.touched ? editor.defaultedCardId : "";
    if (key === "cardId" && editor) editor.touched = true;
    if (key === "purchaseDate" && value !== form.purchaseDate && editor) editor.defaultedCardId = "";
    setForm((previous) => ({ ...previous, ...(key === "purchaseDate" && value !== previous.purchaseDate && automaticCard && automaticCard === previous.cardId ? { cardId: "" } : {}), [key]: value }));
    if (selectedId) queue.editFields(selectedId, { [key]: value }).catch((error) => Alert.alert("Change not saved", error.message));
  };
  const addAssets = async (assets) => {
    if (!selected || frozen) return;
    setAttachmentBusy(true);
    try {
      for (const asset of assets) {
        assertCurrentScope();
        if (Number(asset.fileSize || asset.size || 0) > MAX_FILE_BYTES) throw new Error("Choose files no larger than 15 MB each.");
        const file = await preserveReceiptFile(queue, asset);
        await queue.addFile(selected.localId, file);
      }
    } catch (error) { Alert.alert("Attachment not added", error.message); }
    finally { if (currentScope.current === scope) setAttachmentBusy(false); }
  };
  const choosePhotos = async (camera) => {
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : { granted: true };
      if (!permission.granted) return Alert.alert("Permission required", `Allow ${camera ? "camera" : "photo"} access to attach your receipt.`);
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 1, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
      if (!result.canceled) await addAssets(result.assets || []);
    } catch (error) { Alert.alert("Photos unavailable", error.message); }
  };
  const chooseFiles = async () => {
    try {
      const result = await pickReceiptDocuments({ type: [...RECEIPT_FILE_TYPES], copyToCacheDirectory: true, multiple: true });
      if (!result.canceled) await addAssets(result.assets || []);
    } catch (error) { Alert.alert("Files unavailable", error.message); }
  };
  const readReceipt = async () => {
    await queue.requestUpload(selectedId);
    await sync();
  };
  const applySuggestions = () => {
    const suggestion = selected?.suggestions || {};
    for (const field of ["supplier", "purchaseDate", "currency"]) if (suggestion[field]) changeField(field, suggestion[field]);
    if (Number.isSafeInteger(suggestion.grossPence) && suggestion.grossPence !== 0) {
      const amount = receiptAmountInput(suggestion.grossPence);
      changeField("grossPence", suggestion.grossPence); changeField("isRefund", amount.isRefund); setGrossText(amount.text);
    }
  };
  const send = async () => {
    try {
      if (correctionNeedsReview(selected, remoteRows.find((row) => row.id === selected?.id))) throw new Error("Review the current finance request before confirming this correction.");
      const fields = validateReceiptFields(form, (selected?.files.length || 0) + (selected?.existingEvidenceIds.length || 0));
      await queue.requestSend(selectedId, fields);
      setTab("To send"); closeEditor();
      await sync();
    } catch (error) { Alert.alert("Check your receipt", error.message); }
  };
  const viewAttachment = async (attachment) => {
    try {
      assertCurrentScope();
      const item = attachment.uri ? attachment : await openSavedEvidence(queue, user, attachment.id || attachment.evidenceId, attachment.fileType, assertCurrentScope);
      assertCurrentScope();
      if (item.fileType === "application/pdf" && Platform.OS === "android") {
        const contentUri = await receiptAndroidContentUri(item.uri); assertCurrentScope(); await Linking.openURL(contentUri);
      } else setPreview(item);
    } catch (error) { Alert.alert("Attachment unavailable", error.message); }
  };
  const attachments = receiptAttachments(selected, remoteReceipt, workspace.evidence, localRows);
  const heldAttachments = selected?.heldFiles || localRows.filter((row) => row.id === remoteReceipt?.id).flatMap((row) => row.heldFiles || []);
  const queryReceipt = selected ? remoteRows.find((row) => row.id === selected.id && reviewState(row) === "needs_action") : null;
  const staleCorrection = correctionNeedsReview(selected, queryReceipt);
  const reviewCurrentRequest = async () => {
    try {
      assertCurrentScope();
      if (!queryReceipt) throw new Error("Refresh receipts. This submission is no longer awaiting a correction.");
      const draft = await queue.reviewCorrection(selectedId, { ...blankFields(), ...queryReceipt, expectedReceiptVersion: queryReceipt.version, expectedRequestId: queryReceipt.request?.id || queryReceipt.request?.createdAt }, queryReceipt.evidenceIds);
      assertCurrentScope(); showDraft(draft);
    } catch (error) { Alert.alert("Current request unavailable", error.message); }
  };
  const tabCounts = { "To send": pending.length, Sent: remoteRows.filter((row) => reviewState(row) !== "needs_action").length + sentLocal.length, "Needs action": needsAction.length + requests.length };
  const rowButton = (key, title, subtitle, amount, onPress, danger = false) => <AppPressable key={key} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${subtitle}`} style={[styles.row, getCardSurfaceStyle(colors)]}><View style={styles.rowCopy}><Text variant="body" style={{ fontWeight: "700" }}>{title}</Text><Text variant="caption" tone={danger ? "danger" : "muted"}>{subtitle}</Text></View><Text variant="body" style={{ fontWeight: "700" }}>{amount}</Text><Icon name="chevron-right" size={18} color={colors.textMuted} /></AppPressable>;

  return <PageShell appearance="grouped" contentSpacing="compact" header={{ variant: "compact", title: "Company-card receipts", subtitle: "Send each purchase receipt to finance", onBack: () => router.back(), action: { label: "Add receipt", icon: "plus", onPress: () => createDraft(), disabled: !queue } }} refresh={{ refreshing, onRefresh: refresh }}>
    <SegmentedControl pill subtle density="compact" accessibilityLabel="Receipt delivery status" value={tab} onChange={setTab} options={["To send", "Sent", "Needs action"].map((label) => ({ value: label, label: `${label} · ${tabCounts[label]}` }))} />
    {targetParams.workspace === "finance" && actor.finance ? <View style={styles.notice}><Text>Review company receipts on the finance website.</Text><AppButton label="Open finance website" onPress={() => { try { const url = receiptFinanceUrl(targetParams, process.env.EXPO_PUBLIC_RECEIPTS_WEB_ORIGIN || PRIVACY_POLICY_URL); Linking.openURL(url).catch((error) => Alert.alert("Finance website unavailable", error.message)); } catch (error) { Alert.alert("Finance website unavailable", error.message); } }} /></View> : null}
    {offline ? <Text tone="secondary">Offline. New receipts stay on this device until they can be sent.</Text> : null}
    {loadError ? <View style={styles.notice}><Text tone={"danger"}>{loadError}</Text><AppButton label="Try again" variant="secondary" onPress={refresh} /></View> : null}
    {loading ? <ActivityIndicator color={colors.accent} /> : null}
    {tab === "To send" ? <>
      <Text tone="secondary">Saved on this device. Check the details and confirm before sending.</Text>
      {pending.map((row) => rowButton(row.localId, row.identityHold ? "Earlier receipt · identity review" : row.fields.supplier || row.fields.purpose || "New receipt", row.error || (row.phase === "sending" ? "Waiting for server confirmation" : row.phase === "uploading" ? `Uploading attachments${progress[row.localId] != null ? ` · ${progress[row.localId]}%` : ""}` : "Saved · check and send"), row.identityHold ? "" : amountLabel(row.fields.grossPence, row.fields.currency), () => showDraft(row), Boolean(row.error)))}
      {!pending.length ? <Text style={styles.empty} tone="secondary">Nothing waiting to send. Add a receipt as soon as you make a company-card purchase.</Text> : null}
      {pending.some((row) => row.uploadRequested) ? <AppButton label={syncing ? "Sending…" : "Retry saved receipts"} onPress={sync} loading={syncing} disabled={syncing} /> : null}
    </> : null}
    {tab === "Sent" ? <>
      {remoteRows.filter((row) => reviewState(row) !== "needs_action").map((row) => rowButton(row.id, row.supplier || row.purpose || "Receipt", `${receiptLabel(row)} · ${formatISODateDDMMYYYY(row.purchaseDate)}`, amountLabel(row.grossPence, row.currency), () => openReceipt(row)))}
      {sentLocal.map((row) => rowButton(row.localId, row.fields.supplier, "Sent · confirmed by server", amountLabel(row.fields.grossPence, row.fields.currency), () => openReceipt({ ...row.fields, id: row.id, evidenceIds: row.sendOperation.payload.evidenceIds })))}
      {!tabCounts.Sent ? <Text style={styles.empty} tone="secondary">Your confirmed submissions will appear here.</Text> : null}
    </> : null}
    {tab === "Needs action" ? <>
      {needsAction.map((row) => rowButton(row.id, row.supplier || row.purpose, noteFor(row), amountLabel(row.grossPence, row.currency), () => openReceipt(row), true))}
      {requests.map((row) => rowButton(`request-${row.id}`, row.description || "Missing company-card receipt", noteFor(row), amountLabel(row.amountPence, row.currency), () => {
        const draft = localRows.find((item) => item.requestedTransactionId === row.id && item.phase !== "sent");
        if (draft) showDraft(draft);
        else createDraft({ cardId: row.cardId, supplier: row.description || "", purchaseDate: row.postedDate, grossPence: row.amountPence, currency: row.currency || "GBP" }, row.id);
      }, true))}
      {!tabCounts["Needs action"] ? <Text style={styles.empty} tone="secondary">No changes or missing receipts requested by finance.</Text> : null}
    </> : null}
    <AppModal visible={editorOpen} title={preview ? preview.fileType === "application/pdf" ? "Receipt PDF" : "Receipt original" : editorReadOnly ? "Receipt details" : frozen ? "Waiting to send" : selected?.action === "receipt.correct" ? "Correct receipt" : "Company-card receipt"} onRequestClose={preview ? () => setPreview(null) : closeEditor} closeLabel={preview ? "Back to receipt" : "Close modal"} scrollable={!preview} presentation="adaptive" busy={attachmentBusy}>
      {preview ? <View style={styles.previewPanel}>
        <AppButton pill label="Back to receipt" variant="secondary" onPress={() => setPreview(null)} />
        {preview.fileName ? <Text numberOfLines={2} tone="secondary">{preview.fileName}</Text> : null}
        <View style={styles.attachmentPreview}>{preview.fileType === "application/pdf" ? <WebView source={{ uri: preview.uri }} originWhitelist={["file://*"]} allowingReadAccessToURL={preview.uri} allowFileAccess javaScriptEnabled={false} onShouldStartLoadWithRequest={(request) => request.url === preview.uri || request.url === "about:blank"} /> : <Image source={{ uri: preview.uri }} resizeMode="contain" accessibilityLabel="Receipt original" style={styles.previewImage} />}</View>
      </View> : <>
      {remoteReceipt?.historicalVersion ? <Text tone="secondary">Receipt version {remoteReceipt.version} · retained original submission</Text> : null}
      {queryReceipt ? <Text tone={"danger"}>{noteFor(queryReceipt)}</Text> : null}
      {staleCorrection && !frozen ? <View style={styles.notice}><Text>Finance has changed this request. Load the current submission and review it before sending. Your earlier draft and files remain saved.</Text><AppButton pill label="Review current finance request" variant="secondary" onPress={reviewCurrentRequest} disabled={!queryReceipt} /></View> : null}
      {selected?.error ? <Text tone={"danger"}>{selected.error}</Text> : null}
      {frozen ? <Text tone="secondary">Your confirmed details are saved. Retry the same submission to check whether the server received it.</Text> : null}
      {!editorReadOnly && !frozen ? <>
        <View style={styles.photoActions}><AppButton pill label="Camera" variant="secondary" onPress={() => choosePhotos(true)} disabled={attachmentBusy || uploading} /><AppButton pill label="Photos" variant="secondary" onPress={() => choosePhotos(false)} disabled={attachmentBusy || uploading} /><AppButton pill label="PDF / file" variant="secondary" onPress={chooseFiles} disabled={attachmentBusy || uploading} /></View>
        <Text variant="caption" tone="secondary">Add every page. Originals are saved on this device before upload, up to 15 MB per file.</Text>
      </> : null}
      {attachments.map((file, index) => <AppPressable key={file.evidenceId || file.id || index} onPress={() => viewAttachment(file)} accessibilityRole="button" accessibilityLabel={`View ${file.fileName}`} style={[styles.attachment, { borderColor: colors.border }]}>{file.uri && file.fileType?.startsWith("image/") ? <Image source={{ uri: file.uri }} style={styles.thumbnail} /> : <Icon name="file-text" size={24} color={colors.accent} />}<View style={styles.rowCopy}><Text numberOfLines={2}>{file.fileName}</Text><Text variant="caption" tone="secondary">Page / file {index + 1}{file.finalized ? " · uploaded" : ""}</Text></View></AppPressable>)}
      {heldAttachments.map((file) => <View key={`held-${file.evidenceId}`} style={[styles.attachment, { borderColor: colors.border }]}><View style={styles.rowCopy}><Text>{file.fileName}</Text><Text variant="caption" tone="secondary">Saved on this device · not included in this receipt yet</Text>{editorReadOnly || frozen ? <Text variant="caption" tone="secondary">The original is retained. Finance can request a correction if it belongs to this submission.</Text> : null}</View>{!editorReadOnly && !frozen ? <AppButton pill label="Attach saved file" variant="secondary" disabled={uploading} onPress={async () => { try { assertCurrentScope(); await queue.retryHeldFile(selectedId, file.evidenceId); } catch (error) { Alert.alert("File still saved", error.message); } }} /> : null}</View>)}
      {attachmentBusy ? <ActivityIndicator color={colors.accent} /> : null}
      {!editorReadOnly && !frozen && selected?.files.length ? <AppButton pill label={uploading ? "Reading receipt…" : "Read details from receipt"} variant="secondary" onPress={readReceipt} disabled={uploading || attachmentBusy} loading={uploading} /> : null}
      {selected?.suggestions && !frozen ? <View style={[styles.suggestions, { borderColor: colors.border }]}><Text style={{ fontWeight: "700" }}>Suggested details · check against the original</Text><Text>{[selected.suggestions.supplier, formatISODateDDMMYYYY(selected.suggestions.purchaseDate), selected.suggestions.currency, selected.suggestions.grossPence != null ? amountLabel(selected.suggestions.grossPence, selected.suggestions.currency) : ""].filter(Boolean).join(" · ")}</Text><AppButton pill label="Use suggestions, then review" variant="secondary" onPress={applySuggestions} /></View> : null}
      {selected?.extractionWarning ? <Text tone="secondary">{selected.extractionWarning}</Text> : null}
      <FormField label="Merchant" value={form.supplier} onChangeText={(value) => changeField("supplier", value)} disabled={editorReadOnly || frozen} maxLength={160} />
      <DateField label="Purchase date" value={form.purchaseDate} onChange={(value) => changeField("purchaseDate", value)} disabled={editorReadOnly || frozen} />
      <SelectField label="Company card" value={form.cardId} options={cardOptions} onChange={(value) => changeField("cardId", value)} disabled={editorReadOnly || frozen} emptyMessage="No card assigned for this purchase date. Ask finance to check your card assignment." />
      <SelectField label="Transaction type" value={form.isRefund ? "refund" : "purchase"} options={[{ value: "purchase", label: "Purchase" }, { value: "refund", label: "Refund" }]} onChange={(value) => { const refund = value === "refund"; changeField("isRefund", refund); changeField("grossPence", signedReceiptPence(grossText, refund)); }} disabled={editorReadOnly || frozen} />
      {form.isRefund ? <Text tone="secondary">Enter the amount refunded as a positive number. It will be sent to finance as a refund.</Text> : null}
      <View style={styles.amountFields}><View style={styles.rowCopy}><FormField label={form.isRefund ? "Refund amount" : "Gross amount"} value={grossText} onChangeText={(value) => { setGrossText(value); changeField("grossPence", signedReceiptPence(value, form.isRefund)); }} disabled={editorReadOnly || frozen} inputProps={{ keyboardType: "decimal-pad" }} /></View><View style={styles.currency}><FormField label="Currency" value={form.currency} onChangeText={(value) => changeField("currency", value.toUpperCase())} disabled={editorReadOnly || frozen} maxLength={3} inputProps={{ autoCapitalize: "characters" }} /></View></View>
      <FormField label="Business purpose" value={form.purpose} onChangeText={(value) => changeField("purpose", value)} disabled={editorReadOnly || frozen} multiline maxLength={500} />
      <SelectField label="Booking (optional)" value={form.jobId} options={bookingOptions} onChange={(value) => changeField("jobId", value)} searchable disabled={editorReadOnly || frozen} />
      {!attachments.length || form.missingReceiptReason ? <FormField label="If the receipt is missing, explain why" value={form.missingReceiptReason} onChangeText={(value) => changeField("missingReceiptReason", value)} disabled={editorReadOnly || frozen} multiline maxLength={1000} hint="Finance will review this explanation and request more evidence if needed." /> : null}
      {editorReadOnly ? <AppButton pill label="Done" variant="secondary" onPress={closeEditor} /> : frozen ? <AppButton pill label="Retry saved submission" onPress={sync} disabled={syncing} loading={syncing} /> : <><Text tone="secondary">Check the card, date, amount and original receipt before confirming.</Text><AppButton pill label={selected?.action === "receipt.correct" ? "Confirm details and resend" : "Confirm details and send"} onPress={send} disabled={attachmentBusy || uploading || staleCorrection} /><AppButton pill label="Keep on device for later" variant="secondary" onPress={closeEditor} /></>}
      {!editorReadOnly && !frozen && selected && ["draft", "review"].includes(selected.phase) ? <AppButton pill label="Discard draft" variant="ghost" icon="trash-2" onPress={discardDraft} disabled={attachmentBusy || uploading || syncing} /> : null}
      </>}
    </AppModal>
  </PageShell>;
}
