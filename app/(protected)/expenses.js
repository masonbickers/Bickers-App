import { getCardSurfaceStyle } from "../../lib/design/cardSurface";
import { routeColors } from "../../lib/design/routePresentation/expenses-js.js";
import { styles } from "../../lib/design/screenStyles/expenses-js.js";
import { SectionCard, AppModal, AppText as Text, AppPressable as TouchableOpacity, FormField, TextArea, SegmentedControl, AppButton } from "../../components/ui/AppPrimitives";
import {
  useRouter } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  } from "firebase/firestore";
import { getDownloadURL,
  ref,
  uploadBytesResumable } from "firebase/storage";
import { useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { EmptyState, ErrorState } from "../../components/AsyncState";
import { auth, db, storage } from "../../firebaseConfig";
import { useBookings } from "../../hooks/useOperationalData";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { designTokens as t } from "../../lib/design/tokens";
import PageShell from "../../components/layout/PageShell";

const TYPES = ["Parking", "Hotel", "Meal", "Other"];
const PAYMENT_METHODS = [
  { value: "personal", label: "Personal" },
  { value: "company_card", label: "Company card" },
];

function dateValue(value) {
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function expenseMonth(value) {
  const timestamp = dateValue(value);
  if (!timestamp) return { key: "earlier", label: "Earlier" };
  const date = new Date(timestamp);
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    label: date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
  };
}

function mostRecentBookingDate(booking) {
  const values = [
    ...(Array.isArray(booking?.bookingDates) ? booking.bookingDates : []),
    booking?.endDate,
    booking?.startDate,
    booking?.date,
    booking?.dateISO,
  ];
  return Math.max(0, ...values.map(dateValue));
}

function amountNumber(value) {
  const amount = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function pounds(value) {
  return `£${amountNumber(value).toFixed(2)}`;
}

function expenseLoadErrorCopy(error) {
  const code = String(error?.code || "").toLowerCase();
  if (code.includes("permission-denied")) {
    return {
      title: "Expense access needs enabling",
      message: "Your account is signed in, but it does not currently have access to expense claims. Contact the office if retrying does not resolve it.",
    };
  }
  if (code.includes("unavailable") || code.includes("network")) {
    return {
      title: "You appear to be offline",
      message: "Reconnect and retry to load your expense claims.",
    };
  }
  if (code.includes("session-missing") || code.includes("unauthenticated")) {
    return {
      title: "Sign in again",
      message: "Your session could not be verified. Sign out and back in before submitting an expense.",
    };
  }
  return {
    title: "Expenses unavailable",
    message: "Your claims could not be loaded. Please retry before adding another expense.",
  };
}

function ExpenseGuide({ colors }) {
  const items = [
    { icon: "camera", label: "Receipt", detail: "Photograph or attach the receipt" },
    { icon: "briefcase", label: "Job", detail: "Link the cost to a job when relevant" },
    { icon: "check-circle", label: "Review", detail: "Personal costs are submitted for approval" },
  ];

  return (
    <SectionCard tone="grouped" layoutStyle={styles.guideCard}> 
      <Text tone={"primary"} style={[styles.guideTitle]}>Before you submit</Text>
      <Text tone={"muted"} style={[styles.guideSubtitle]}>A complete claim is quicker for the office to approve.</Text>
      <View style={styles.guideItems}>
        {items.map((item) => (
          <View key={item.label} style={styles.guideItem}>
            <View style={[styles.guideIcon, { borderColor: colors.border }]}> 
              <Icon name={item.icon} size={16} color={colors.textMuted} />
            </View>
            <View style={styles.guideCopy}>
              <Text tone={"primary"} style={[styles.guideLabel]}>{item.label}</Text>
              <Text tone={"muted"} style={[styles.guideDetail]}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

function bookingLabel(booking) {
  const number = String(booking?.jobNumber || booking?.bookingNumber || booking?.number || "").trim();
  const client = String(booking?.client || booking?.clientName || booking?.company || "").trim();
  const title = String(booking?.title || booking?.jobTitle || booking?.name || "").trim();
  return [number, client || title].filter(Boolean).join(" — ") || "Job";
}

async function uploadReceipt(uri, ownerId, expenseId) {
  const prepared = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  const response = await fetch(prepared.uri);
  const blob = await response.blob();
  const safeOwner = String(ownerId || "employee").replace(/[^a-zA-Z0-9_-]/g, "_");
  const receiptRef = ref(storage, `expenses/${safeOwner}/${expenseId}.jpg`);
  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(receiptRef, blob, { contentType: "image/jpeg" });
    task.on("state_changed", undefined, reject, resolve);
  });
  return getDownloadURL(receiptRef);
}

const EMPTY = {
  type: "Parking",
  otherType: "",
  paymentMethod: "personal",
  amount: "",
  jobId: "",
  note: "",
  receiptUrl: "",
};

export default function ExpensesPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { employee, user } = useAuth();
  const companyId = String(employee?.companyId || "").trim();
  const bookingsResource = useBookings({ employeeOnly: true });
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [jobListOpen, setJobListOpen] = useState(false);
  const [receiptUri, setReceiptUri] = useState("");
  const [saving, setSaving] = useState(false);

  const employeeCode = String(employee?.userCode || employee?.employeeCode || "").trim();
  const employeeId = String(employee?.id || employee?.employeeId || "").trim();
  const ownerUid = auth.currentUser?.uid || user?.uid || "";
  const receiptOwnerId = ownerUid || employeeCode;
  const jobs = useMemo(
    () =>
      (bookingsResource.data || [])
        .map((booking) => ({
          id: String(booking.id || booking.bookingId || ""),
          jobNumber: String(booking.jobNumber || booking.bookingNumber || ""),
          label: bookingLabel(booking),
          date: mostRecentBookingDate(booking),
        }))
        .filter((job) => job.id)
        .sort((a, b) => b.date - a.date || b.jobNumber.localeCompare(a.jobNumber))
        .slice(0, 12),
    [bookingsResource.data]
  );

  const loadExpenses = useCallback(async () => {
    if (!ownerUid || !companyId) {
      setExpenses([]);
      const sessionError = new Error("Your session could not be verified.");
      sessionError.code = "auth/session-missing";
      setLoadError(sessionError);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoadError(null);
    try {
      const snapshot = await getDocs(
        query(collection(db, "expenses"), where("companyId", "==", companyId), where("ownerUid", "==", ownerUid))
      );
      const rows = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => dateValue(b.createdAt || b.updatedAt) - dateValue(a.createdAt || a.updatedAt));
      setExpenses(rows);
    } catch (error) {
      console.warn("Could not load expenses", error?.message || error);
      setLoadError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ownerUid, companyId]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const retryExpenses = useCallback(async () => {
    if (expenses.length > 0) setRefreshing(true);
    else setLoading(true);
    await loadExpenses();
  }, [expenses.length, loadExpenses]);

  const total = expenses
    .filter((item) => (item.paymentMethod || "personal") === "personal")
    .reduce((sum, item) => sum + amountNumber(item.amount), 0);
  const pending = expenses.filter((item) => !["approved", "rejected"].includes(String(item.status || "").toLowerCase())).length;
  const hasInitialLoadError = !loading && !!loadError && expenses.length === 0;
  const isEmpty = !loading && !loadError && expenses.length === 0;
  const loadErrorCopy = expenseLoadErrorCopy(loadError);
  const expenseAccessDenied = String(loadError?.code || "").toLowerCase().includes("permission-denied");
  const expenseSections = useMemo(() => {
    const sections = [];
    const sectionsByMonth = new Map();
    expenses.forEach((expense) => {
      const month = expenseMonth(expense.createdAt || expense.updatedAt);
      let section = sectionsByMonth.get(month.key);
      if (!section) {
        section = { ...month, items: [] };
        sectionsByMonth.set(month.key, section);
        sections.push(section);
      }
      section.items.push(expense);
    });
    return sections;
  }, [expenses]);

  const beginAdd = () => {
    setDraft({ ...EMPTY });
    setJobListOpen(false);
    setReceiptUri("");
    setEditorOpen(true);
  };

  const beginEdit = (expense) => {
    if (String(expense.status || "").toLowerCase() === "approved") {
      Alert.alert("Approved expense", "Approved expenses are locked. Contact your manager if it needs changing.");
      return;
    }
    setDraft({
      id: expense.id,
      type: expense.type || "Other",
      otherType: expense.otherType || "",
      paymentMethod: expense.paymentMethod || "personal",
      amount: String(expense.amount ?? ""),
      jobId: expense.jobId || "",
      note: expense.note || "",
      receiptUrl: expense.receiptUrl || "",
    });
    setJobListOpen(false);
    setReceiptUri("");
    setEditorOpen(true);
  };

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setReceiptUri(result.assets[0].uri);
  };

  const takeReceipt = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Camera permission needed", "Allow camera access to photograph a receipt.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: ImagePicker.CameraType.back,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setReceiptUri(result.assets[0].uri);
  };

  const saveExpense = async () => {
    const amount = amountNumber(draft.amount);
    if (amount <= 0) {
      Alert.alert("Amount required", "Enter the amount you are claiming.");
      return;
    }
    if (draft.type === "Other" && !String(draft.otherType || "").trim()) {
      Alert.alert("Expense type required", "Tell us what the expense was for.");
      return;
    }
    setSaving(true);
    try {
      if (!ownerUid) throw new Error("Your session could not be verified.");
      const id = draft.id || `${employeeCode}_${Date.now()}`;
      const selectedJob = jobs.find((job) => job.id === draft.jobId) || null;
      let receiptUrl = draft.receiptUrl || "";
      if (receiptUri) receiptUrl = await uploadReceipt(receiptUri, receiptOwnerId, id);
      const payload = {
        ownerUid,
        employeeId,
        employeeCode,
        employeeName: employee?.displayName || employee?.name || null,
        type: draft.type,
        otherType: draft.type === "Other" ? String(draft.otherType || "").trim() : null,
        paymentMethod: draft.paymentMethod,
        amount,
        jobId: selectedJob?.id || null,
        jobNumber: selectedJob?.jobNumber || null,
        jobLabel: selectedJob?.label || null,
        note: String(draft.note || "").trim(),
        receiptUrl,
        updatedAt: serverTimestamp(),
        ...(draft.id ? {} : { status: "submitted", createdAt: serverTimestamp() }),
      };
      await setDoc(doc(db, "expenses", id), payload, { merge: true });
      setEditorOpen(false);
      setReceiptUri("");
      await loadExpenses();
    } catch (error) {
      console.warn("Could not save expense", error?.message || error);
      Alert.alert("Expense not saved", error?.message || "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = (expense) => {
    if (String(expense.status || "").toLowerCase() === "approved") return;
    Alert.alert("Delete expense?", `${expense.type} · ${pounds(expense.amount)}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (!ownerUid || expense.ownerUid !== ownerUid) {
              throw new Error("This expense could not be verified for your account.");
            }
            await deleteDoc(doc(db, "expenses", expense.id));
            setExpenses((current) => current.filter((item) => item.id !== expense.id));
          } catch (error) {
            Alert.alert("Delete failed", error?.message || "Could not delete this expense.");
          }
        },
      },
    ]);
  };

  return (
    <PageShell
      appearance="grouped"
      contentSpacing="compact"
      header={{
        variant: "compact",
        eyebrow: "Claims",
        title: "Expenses",
        subtitle: "Receipts and job costs",
        onBack: router.back,
        action: {
          label: "Add Expense",
          icon: "plus",
          onPress: beginAdd,
          disabled: !ownerUid || expenseAccessDenied,
        },
      }}
      state={{
        resources: [{
          data: expenses,
          error: expenses.length > 0 ? loadError : null,
          isInitialLoading: loading,
          isRefreshing: refreshing,
        }],
        hasContent: expenses.length > 0,
        onRetry: retryExpenses,
        loadingLabel: "Loading expenses…",
        refreshErrorMessage: "Could not refresh expenses. Showing your saved claims.",
      }}
      refresh={{ refreshing, onRefresh: retryExpenses }}
    >


      <>
        {hasInitialLoadError ? (
          <>
            <ErrorState
              title={loadErrorCopy.title}
              message={loadErrorCopy.message}
              onRetry={retryExpenses}
            />
            <ExpenseGuide colors={colors} />
          </>
        ) : isEmpty ? (
          <>
            <EmptyState
              presentation="grouped"
              icon="credit-card"
              title="No expenses yet"
              message="Add a receipt or job cost when you are ready."
              actionLabel="Add Expense"
              onAction={beginAdd}
            />
            <ExpenseGuide colors={colors} />
          </>
        ) : (
          <>
            <View style={styles.statsRow}>
          <SectionCard tone="grouped" layoutStyle={styles.statCard}> 
            <Text tone={"muted"} style={[styles.statLabel]}>PERSONAL CLAIMS</Text>
            <Text tone={"primary"} style={[styles.statValue]}>{pounds(total)}</Text>
          </SectionCard>
          <SectionCard tone="grouped" layoutStyle={styles.statCard}>
            <Text tone={"muted"} style={[styles.statLabel]}>PENDING</Text>
            <Text tone={"primary"} style={[styles.statValue]}>{pending}</Text>
          </SectionCard>
            </View>

            {expenseSections.map((section) => (
            <View key={section.key} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <Text tone={"primary"} style={[styles.monthTitle]}>{section.label}</Text>
                <Text tone={"muted"} style={[styles.monthCount]}>
                  {section.items.length} {section.items.length === 1 ? "expense" : "expenses"}
                </Text>
              </View>
              <View style={styles.monthCards}>
                {section.items.map((expense) => {
                  const status = String(expense.status || "submitted").toLowerCase();
                  const statusColor = status === "approved" ? routeColors.hex_42c983_5qoknl : status === "rejected" ? colors.danger : routeColors.hex_d99a21_6chiqo;
                  return (
                    <TouchableOpacity key={expense.id} style={[styles.card, getCardSurfaceStyle(colors)]} onPress={() => beginEdit(expense)}>
                      <View style={styles.cardTop}>
                        {expense.receiptUrl ? <Image source={{ uri: expense.receiptUrl }} style={styles.thumb} /> : (
                          <View style={[styles.iconBox, { borderColor: colors.border }]}><Icon name="credit-card" size={18} color={colors.textMuted} /></View>
                        )}
                        <View style={styles.cardCopy}>
                          <Text tone={"primary"} style={[styles.cardTitle]}>{expense.type === "Other" && expense.otherType ? expense.otherType : expense.type}</Text>
                          <Text tone={"muted"} style={[styles.cardMeta]}>{expense.paymentMethod === "company_card" ? "Company card" : "Personal"}</Text>
                          <Text tone={"muted"} style={[styles.cardMeta]} numberOfLines={1}>{expense.jobLabel || "Not attached to a job"}</Text>
                        </View>
                        <View style={styles.cardAmountWrap}>
                          <Text tone={"primary"} style={[styles.cardAmount]}>{pounds(expense.amount)}</Text>
                          <Text style={[styles.status, { color: statusColor, borderColor: statusColor }]}>{status}</Text>
                        </View>
                      </View>
                      {expense.note ? <Text tone={"primary"} style={[styles.detail]}>{expense.note}</Text> : null}
                      {status !== "approved" && (
                        <TouchableOpacity style={styles.deleteButton} onPress={() => removeExpense(expense)}>
                          <Icon name="trash-2" size={14} color={colors.danger} />
                          <Text tone={"danger"} style={{ fontWeight: t.typography.bodyStrong.fontWeight, fontSize: t.typography.metadata.fontSize }}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
          </>
        )}
      </>

      <AppModal
        visible={editorOpen}
        title={draft.id ? "Edit expense" : "Add expense"}
        onRequestClose={() => { if (!saving) { setJobListOpen(false); setEditorOpen(false); } }}
        scrollable
        busy={saving}
      >
              <Text tone="secondary">Add the cost and choose its job.</Text>

              <Text tone={"muted"} style={[styles.label]}>Type</Text>
              <SegmentedControl pill subtle density="compact" selectionRole="radio" accessibilityLabel="Expense type" value={draft.type} options={TYPES.map((type) => ({ value: type, label: type }))} onChange={(type) => setDraft((current) => ({ ...current, type }))} />
              {draft.type === "Other" ? (
                <FormField
                  label="Other expense type"
                  value={draft.otherType}
                  onChangeText={(otherType) => setDraft((current) => ({ ...current, otherType }))}
                  placeholder="What type of expense?"
                  maxLength={60}
                  inputProps={{ autoFocus: true }}
                />
              ) : null}

              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <FormField label="Amount" value={draft.amount} onChangeText={(amount) => setDraft((current) => ({ ...current, amount }))} placeholder="£0.00" inputProps={{ keyboardType: "decimal-pad" }} />
                </View>
                <View style={styles.formColumnWide}>
                  <Text tone={"muted"} style={[styles.label]}>Paid with</Text>
                  <SegmentedControl pill subtle density="compact" selectionRole="radio" accessibilityLabel="Paid with" value={draft.paymentMethod} options={PAYMENT_METHODS} onChange={(paymentMethod) => setDraft((current) => ({ ...current, paymentMethod }))} />
                </View>
              </View>

              <Text tone={"muted"} style={[styles.label]}>Job</Text>
              <TouchableOpacity
                style={[styles.jobSelect, { borderColor: jobListOpen ? colors.accent : colors.inputBorder, backgroundColor: colors.inputBackground }]}
                onPress={() => setJobListOpen((open) => !open)}
              >
                <Text numberOfLines={1} tone={"primary"} style={[styles.jobSelectText]}>
                  {jobs.find((job) => job.id === draft.jobId)?.label || "No job"}
                </Text>
                <Icon name={jobListOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {jobListOpen ? (
                <View style={[styles.jobList, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {[{ id: "", label: "No job" }, ...jobs].map((job) => {
                      const selected = draft.jobId === job.id;
                      return (
                        <TouchableOpacity
                          key={job.id || "no-job"}
                          style={[styles.jobOption, { borderBottomColor: colors.border, backgroundColor: selected ? colors.accentSoft : "transparent" }]}
                          onPress={() => {
                            setDraft((current) => ({ ...current, jobId: job.id }));
                            setJobListOpen(false);
                          }}
                        >
                          <Text numberOfLines={1} style={[styles.jobOptionText, { color: selected ? colors.accent : colors.text }]}>{job.label}</Text>
                          {selected ? <Icon name="check" size={17} color={colors.accent} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <TextArea label="Notes" value={draft.note} onChangeText={(note) => setDraft((current) => ({ ...current, note }))} placeholder="What was this expense for?" />
              <Text tone={"muted"} style={[styles.label]}>Receipt photo</Text>
              <View style={styles.receiptRow}>
                {receiptUri || draft.receiptUrl ? <Image source={{ uri: receiptUri || draft.receiptUrl }} style={[styles.receiptPreview, { borderColor: colors.border }]} /> : null}
                <AppButton label="Choose photo" icon="image" variant="secondary" pill onPress={pickReceipt} layoutStyle={styles.receiptActionLayout} />
                <AppButton label="Take photo" icon="camera" variant="secondary" pill onPress={takeReceipt} layoutStyle={styles.receiptActionLayout} />
              </View>
              <AppButton label="Submit expense" pill onPress={saveExpense} loading={saving} disabled={saving} layoutStyle={styles.submitActionLayout} />
      </AppModal>
    </PageShell>
  );
}
