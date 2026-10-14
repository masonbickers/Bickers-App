import { AppText as Text, AppPressable as TouchableOpacity, FormField, IconButton } from "../../../../components/ui/AppPrimitives";
// app/(protected)/timesheet-query/[id]/index.js
import {
  useLocalSearchParams,
  useRouter } from "expo-router";
import {
    addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  } from "firebase/firestore";
import { useEffect,
  useState } from "react";
import {
  ActivityIndicator,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";

import { db } from "../../../../firebaseConfig";
import { isCrewedBooking } from "../../../../lib/bookingVisibility";
import { useAuth } from "../../../../providers/AuthProvider";
import { useTheme } from "../../../../providers/ThemeProvider";
import { designTokens as t } from "../../../../lib/design/tokens";
import PageShell from "../../../../components/layout/PageShell";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function dateToISO(d) {
  return d.toISOString().slice(0, 10);
}
function getDayName(dateStr) {
  const i = new Date(dateStr).getDay();
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][i];
}
const fmt = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    : "—";

export default function TimesheetQuery() {
  const { id } = useLocalSearchParams(); // query doc ID
  const router = useRouter();
  const { employee, user } = useAuth();
  const companyId = String(employee?.companyId || "").trim();
  const { colors } = useTheme();

  const [queryData, setQueryData] = useState(null);
  const [timesheetEntry, setTimesheetEntry] = useState(null);
  const [jobsByDay, setJobsByDay] = useState({});
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [messageText, setMessageText] = useState("");

  /* -----------------------------------------------------------
      LOAD QUERY + MATCH DAY + JOBS
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!id || !employee || !companyId) return;

    (async () => {
      try {
        // 1) Load query
        const qRef = doc(db, "timesheetQueries", id);
        const qSnap = await getDoc(qRef);
        if (!qSnap.exists()) {
          setLoading(false);
          return;
        }
        const qData = { id, ...qSnap.data() };
        setQueryData(qData);

        const weekStart = qData.weekStart;
        const employeeCode = qData.employeeCode;
        const dayName = qData.day;

        // 2) Load timesheet entry
        const tsRef = doc(db, "timesheets", `${employeeCode}_${weekStart}`);
        const tsSnap = await getDoc(tsRef);

        if (tsSnap.exists()) {
          const ts = tsSnap.data();
          setTimesheetEntry(ts.days?.[dayName] || null);
        }

        // 3) Build week dates
        const start = new Date(`${weekStart}T00:00:00`);
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          weekDates.push(dateToISO(d));
        }

        // 4) Load employees
        const empSnap = await getDocs(query(collection(db, "employees"), where("companyId", "==", companyId)));
        const allEmps = empSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const nameToCode = {};
        allEmps.forEach((e) => {
          const nm = String(e.name || e.fullName || "")
            .trim()
            .toLowerCase();
          if (nm && e.userCode) nameToCode[nm] = e.userCode;
        });

        // 5) Load bookings
        const jobsQ = query(
          collection(db, "bookings"),
          where("companyId", "==", companyId),
          where("bookingDates", "array-contains-any", weekDates)
        );
        const jobSnap = await getDocs(jobsQ);
        const allJobs = jobSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const jobsMap = {};
        DAYS.forEach((d) => (jobsMap[d] = []));

        const deriveCodes = (list = []) =>
          list
            .map((emp) => {
              if (emp?.userCode) return emp.userCode;
              const nm = String(emp?.name || "")
                .trim()
                .toLowerCase();
              return nameToCode[nm] || null;
            })
            .filter(Boolean);

        // 6) Match jobs
        allJobs.forEach((job) => {
          if (!isCrewedBooking(job)) return;
          const bookingDates = Array.isArray(job.bookingDates)
            ? job.bookingDates
            : [];
          const employeesByDate = job.employeesByDate || {};

          const globalCodes = deriveCodes(job.employees || []);

          bookingDates.forEach((iso) => {
            if (!weekDates.includes(iso)) return;

            let isAssigned = false;

            if (Object.keys(employeesByDate).length > 0) {
              const list = Array.isArray(employeesByDate[iso])
                ? employeesByDate[iso]
                : [];
              const codes = deriveCodes(list);
              isAssigned = codes.includes(employeeCode);
            } else {
              isAssigned = globalCodes.includes(employeeCode);
            }

            if (!isAssigned) return;

            const dName = getDayName(iso);
            jobsMap[dName].push(job);
          });
        });

        setJobsByDay(jobsMap);
      } catch (err) {
        console.error("Query page load error", err);
      }

      setLoading(false);
    })();
  }, [id, employee, companyId]);

  /* -----------------------------------------------------------
      CHAT LISTENER
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!id) return;

    const msgRef = collection(db, "timesheetQueries", id, "messages");

    const unsub = onSnapshot(msgRef, (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

      setMessages(msgs);
    });

    return () => unsub();
  }, [id]);

  /* -----------------------------------------------------------
      SEND MESSAGE
  ----------------------------------------------------------- */
  async function sendMessage() {
    if (!messageText.trim()) return;
    try {
      await addDoc(collection(db, "timesheetQueries", id, "messages"), {
        text: messageText.trim(),
        sender: "employee",
        authorUid: user.uid,
        createdAt: serverTimestamp(),
      });
      setMessageText("");
    } catch (err) {
      console.error("Send message error:", err);
    }
  }

  /* -----------------------------------------------------------
      LOADING UI
  ----------------------------------------------------------- */
  if (loading) {
    return (
      <PageShell mode="form" width="form" header={{ variant: "compact", title: "Timesheet Query", onBack: router.back }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </PageShell>
    );
  }

  if (!queryData) {
    return (
      <PageShell mode="form" width="form" header={{ variant: "compact", title: "Timesheet Query", onBack: router.back }}>
        <Text tone={"primary"}>Query not found</Text>
      </PageShell>
    );
  }

  const dayName = queryData.day;
  const jobList = jobsByDay[dayName] || [];

  /* -----------------------------------------------------------
      UI RENDER
  ----------------------------------------------------------- */
  return (
    <PageShell mode="form" width="form" header={{ variant: "compact", title: "Timesheet Query", onBack: router.back }}>
          {/* ---------------- JOB INFO ---------------- */}
          <Text tone={"muted"} style={{ fontWeight: "700", fontSize: t.typography.bodyLarge.fontSize }}>
            Job Info — {dayName}
          </Text>

          <View
            style={{
              marginTop: t.spacing.xs,
              marginBottom: t.spacing.lg,
              padding: t.spacing.md,
              borderRadius: t.radius.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            {jobList.length === 0 ? (
              <Text tone={"muted"}>No job for this day.</Text>
            ) : (
              jobList.map((job) => (
                <View
                  key={job.id}
                  style={{
                    paddingBottom: t.spacing.xs,
                    marginBottom: t.spacing.xs,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text tone={"success"} style={{ fontWeight: "700", fontSize: t.typography.bodyLarge.fontSize }}>
                    {job.jobNumber || job.id} • {job.client || "Client"}
                  </Text>
                  <Text tone={"muted"} style={{ marginTop: t.spacing.none }}>
                    {job.location}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* ---------------- DAY ENTRY ---------------- */}
          <Text
            tone={"muted"} style={{
              fontWeight: "700",
              fontSize: t.typography.bodyLarge.fontSize,
              marginBottom: t.spacing.xxs,
            }}
          >
            Day Entry
          </Text>

          <View
            style={{
              padding: t.spacing.md,
              borderRadius: t.radius.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              marginBottom: t.spacing.lg,
            }}
          >
            {timesheetEntry ? (
              Object.entries(timesheetEntry).map(([key, val]) =>
                val ? (
                  <View key={key} style={{ marginBottom: t.spacing.xxs }}>
                    <Text tone={"muted"} style={{ fontSize: t.typography.metadata.fontSize }}>{key}</Text>
                    <Text tone={"primary"} style={{ fontSize: t.typography.bodyLarge.fontSize }}>{String(val)}</Text>
                  </View>
                ) : null
              )
            ) : (
              <Text tone={"muted"}>No entry recorded for this day.</Text>
            )}
          </View>

          {/* ---------------- QUERY CARD ---------------- */}
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: t.radius.md,
              borderColor: colors.border,
              borderWidth: 1,
              padding: t.spacing.md,
              marginBottom: t.spacing["2xl"],
            }}
          >
            <Text tone={"muted"} style={{ fontSize: t.typography.bodySmall.fontSize }}>Field Queried</Text>
            <Text tone={"primary"} style={{ fontSize: t.typography.bodyLarge.fontSize, fontWeight: "700", marginBottom: t.spacing.xs }}>
              {queryData.field}
            </Text>

            <Text tone={"muted"} style={{ fontWeight: "700" }}>Manager Note:</Text>
            <Text
              tone={"muted"} style={{
                fontStyle: "italic",
                marginTop: t.spacing.xxs,
                marginBottom: t.spacing.xs,
              }}
            >
              “{queryData.note || "No note provided"}”
            </Text>

            <Text tone={"muted"} style={{ fontSize: t.typography.metadata.fontSize, marginBottom: t.spacing.xs }}>
              Created: {fmt(queryData.createdAt)}
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push(`/(protected)/week/${queryData.weekStart}?day=${queryData.day}`)
              }
              style={{
                borderRadius: t.radius.sm,
                paddingVertical: t.spacing.xs,
                paddingHorizontal: t.spacing.sm,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                marginBottom: t.spacing.xxs,
              }}
            >
              <Icon name="edit-2" size={16} color={colors.text} />
              <Text
                tone={"primary"} variant="bodyStrong" style={{ marginLeft: t.spacing.xs }}
              >
                Open Timesheet
              </Text>
            </TouchableOpacity>
          </View>

          {/* ---------------- CHAT THREAD ---------------- */}
          <Text tone={"primary"} style={{ fontWeight: "700", fontSize: t.typography.bodyLarge.fontSize, marginBottom: t.spacing.xs }}>
            Messages
          </Text>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: t.radius.md,
              padding: t.spacing.md,
              borderColor: colors.border,
              borderWidth: 1,
              marginBottom: t.spacing.lg,
            }}
          >
            {messages.length === 0 ? (
              <Text tone={"muted"}>No messages yet.</Text>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={{
                    marginBottom: t.spacing.sm,
                    padding: t.spacing.xs,
                    borderRadius: t.radius.md,
                    alignSelf: msg.sender === "employee" ? "flex-end" : "flex-start",
                    backgroundColor:
                      msg.sender === "employee" ? colors.accentSoft : colors.surfaceAlt,
                    maxWidth: "80%",
                  }}
                >
                  <Text tone={"primary"}>{msg.text}</Text>
                  <Text
                    tone={"muted"} style={{
                      fontSize: t.typography.micro.fontSize,
                      marginTop: t.spacing.xxs,
                      textAlign: "right",
                    }}
                  >
                    {msg.createdAt ? fmt(msg.createdAt.toDate()) : ""}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 120 }} />
        {/* ---------------- MESSAGE COMPOSER ---------------- */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: t.spacing.sm,
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <FormField
            label="Message"
            placeholder="Write a message…"
            layoutStyle={{ flex: 1 }}
            value={messageText}
            onChangeText={setMessageText}
          />

          <IconButton icon="send" label="Send message" onPress={sendMessage} layoutStyle={{ marginLeft: t.spacing.sm }} />
        </View>
    </PageShell>
  );
}
