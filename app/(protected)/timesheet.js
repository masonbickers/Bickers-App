import { routeColors } from "../../lib/design/routePresentation/timesheet-js.js";
import { styles } from "../../lib/design/screenStyles/timesheet-js.js";
import { SettingsGroup, SettingsRow, AppText as Text } from "../../components/ui/AppPrimitives";
import NativeActionButton from "../../components/ui/NativeActionButton";
import NativeSettingsSheet from "../../components/ui/NativeSettingsSheet";
import NativeSegmentedControl from "../../components/ui/NativeSegmentedControl";
import NativeTimeSelect from "../../components/ui/NativeTimeSelect";
import { StackActions, useNavigation } from "@react-navigation/native";
import { timesheetBackCount } from "../../lib/timesheetNavigation";
// app/(protected)/timesheet-overview.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useRouter } from "expo-router";
import { doc,
  updateDoc } from "firebase/firestore";
import { useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import {
  Alert,
  Platform,
  useWindowDimensions,
  StyleSheet,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AsyncContentState, EmptyState } from "../../components/AsyncState";
import { db } from "../../firebaseConfig";
import {
  useEmployees,
  useEmployeeTimesheets,
  useTimesheetQueries,
} from "../../hooks/useOperationalData";
import { formatDateDDMMYYYY } from "../../lib/dateFormat";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { withAlpha } from "../../lib/design/color";
import { designTokens as t } from "../../lib/design/tokens";
import PageShell from "../../components/layout/PageShell"; // 👈 theme

/* helpers */
const DEFAULT_YARD_START = "08:00";
const DEFAULT_YARD_END = "16:30";
const DEFAULT_OFFICE_START = "09:00";
const DEFAULT_OFFICE_END = "17:00";
const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

function timeToMinutes(t) {
  if (!t) return null;
  const s = String(t).trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function minutesToHHMM(mins) {
  if (mins == null || Number.isNaN(mins)) return null;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normaliseTimeValue(v) {
  return minutesToHHMM(timeToMinutes(v));
}

function normaliseAutofillType(v) {
  const value = String(v || "").trim().toLowerCase();
  if (value === "office" || value === "workshop") return value;
  return "yard";
}

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
function formatWeekRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${formatDateDDMMYYYY(monday)} - ${formatDateDDMMYYYY(sunday)}`;
}
function safeStr(v) {
  return String(v ?? "").trim().toLowerCase();
}
function isTimesheetApproved(ts) {
  if (!ts) return false;
  const status = safeStr(ts.status);
  return (
    status === "approved" ||
    ts.approved === true ||
    !!ts.approvedAt
  );
}

function timesheetWeekKey(timesheet) {
  return timesheet?.weekStart || timesheet?.weekISO || "";
}

export default function TimesheetOverview() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const autofillSheet = Platform.OS === "ios" && width < t.layout.tabletBreakpoint;
  const router = useRouter();
  const navigation = useNavigation();
  const goBack = useCallback(() => {
    const state = navigation.getState();
    const count = timesheetBackCount(state);
    if (count > 1) navigation.dispatch({ ...StackActions.pop(count), target: state.key });
    else if (router.canGoBack()) router.back();
    else router.replace("/me");
  }, [navigation, router]);
  const { employee, isAuthed, loading, reloadSession } = useAuth();
  const { colors } = useTheme(); // 🎨
  const employeesResource = useEmployees();
  const timesheetsResource = useEmployeeTimesheets();
  const queriesResource = useTimesheetQueries();
  const timesheetRows = timesheetsResource.data;
  const timesheetQueries = queriesResource.data;
  const refreshTimesheets = timesheetsResource.refresh;
  const refreshTimesheetQueries = queriesResource.refresh;
  const employeeRows = employeesResource.data;
  const refreshEmployees = employeesResource.refresh;
  const upsertEmployee = employeesResource.upsertRow;
  const timesheets = useMemo(
    () => (isAuthed ? timesheetRows : []),
    [isAuthed, timesheetRows]
  );
  const queryWeeksMap = useMemo(() => {
    const weekMap = {};
    timesheetQueries.forEach((queryRow) => {
      const status = String(queryRow.status || "open").toLowerCase();
      if (!queryRow.weekStart || status === "closed" || status === "resolved") return;
      weekMap[queryRow.weekStart] = true;
    });
    return weekMap;
  }, [timesheetQueries]);
  const refreshing =
    timesheetsResource.isRefreshing ||
    queriesResource.isRefreshing ||
    employeesResource.isRefreshing;

  const [settingsDocId, setSettingsDocId] = useState("");
  const [autofillType, setAutofillType] = useState("yard");
  const [autofillStartTime, setAutofillStartTime] = useState(DEFAULT_YARD_START);
  const [autofillEndTime, setAutofillEndTime] = useState(DEFAULT_YARD_END);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadAutofillDefaults = useCallback(async () => {
    if (loading) return;
    if (!isAuthed || !employee?.userCode) {
      setSettingsDocId("");
      setAutofillType("yard");
      setAutofillStartTime(DEFAULT_YARD_START);
      setAutofillEndTime(DEFAULT_YARD_END);
      setSettingsBusy(false);
      return;
    }
    if (employeesResource.isInitialLoading && !employeeRows.length) {
      setSettingsBusy(true);
      return;
    }

    try {
      setSettingsBusy(false);
      const employeeId = String(employee?.employeeId || "").trim();
      const employeeCode = String(employee?.userCode || "").trim();
      const profile =
        employeeRows.find((row) => String(row.id || "").trim() === employeeId) ||
        employeeRows.find(
          (row) => String(row.userCode || "").trim() === employeeCode
        ) ||
        null;
      const profileId = String(profile?.id || employeeId || "").trim();

      const mode = normaliseAutofillType(
        profile?.timesheetDefaults?.defaultType ||
          profile?.timesheetDefaultType ||
          employee?.timesheetDefaults?.defaultType ||
          employee?.timesheetDefaultType ||
          "yard"
      );

      const start = normaliseTimeValue(
        mode === "workshop"
          ? profile?.timesheetDefaults?.workshopStart ||
              profile?.workshopStartTime ||
              employee?.workshopStartTime ||
              employee?.timesheetDefaults?.workshopStart ||
              DEFAULT_YARD_START
          : mode === "office"
          ? profile?.timesheetDefaults?.officeStart ||
              profile?.officeStartTime ||
              profile?.officeStart ||
              employee?.officeStartTime ||
              employee?.timesheetDefaults?.officeStart ||
              DEFAULT_OFFICE_START
          : profile?.timesheetDefaults?.yardStart ||
              profile?.yardStartTime ||
              profile?.yardStart ||
              employee?.yardStartTime ||
              employee?.timesheetDefaults?.yardStart ||
              DEFAULT_YARD_START
      );
      const end = normaliseTimeValue(
        mode === "workshop"
          ? profile?.timesheetDefaults?.workshopEnd ||
              profile?.workshopEndTime ||
              employee?.workshopEndTime ||
              employee?.timesheetDefaults?.workshopEnd ||
              DEFAULT_YARD_END
          : mode === "office"
          ? profile?.timesheetDefaults?.officeEnd ||
              profile?.officeEndTime ||
              profile?.officeEnd ||
              employee?.officeEndTime ||
              employee?.timesheetDefaults?.officeEnd ||
              DEFAULT_OFFICE_END
          : profile?.timesheetDefaults?.yardEnd ||
              profile?.yardEndTime ||
              profile?.yardEnd ||
              employee?.yardEndTime ||
              employee?.timesheetDefaults?.yardEnd ||
              DEFAULT_YARD_END
      );

      setSettingsDocId(profileId || "");
      setAutofillType(mode);
      setAutofillStartTime(start || (mode === "office" ? DEFAULT_OFFICE_START : DEFAULT_YARD_START));
      setAutofillEndTime(end || (mode === "office" ? DEFAULT_OFFICE_END : DEFAULT_YARD_END));
    } catch (err) {
      console.error("Error loading timesheet defaults:", err);
      const mode = normaliseAutofillType(
        employee?.timesheetDefaults?.defaultType || employee?.timesheetDefaultType || "yard"
      );
      setSettingsDocId(String(employee?.employeeId || "").trim());
      setAutofillType(mode);
      setAutofillStartTime(
        normaliseTimeValue(
          mode === "workshop"
            ? employee?.workshopStartTime || employee?.timesheetDefaults?.workshopStart
            : mode === "office"
            ? employee?.officeStartTime || employee?.timesheetDefaults?.officeStart
            : employee?.yardStartTime || employee?.timesheetDefaults?.yardStart
        ) || (mode === "office" ? DEFAULT_OFFICE_START : DEFAULT_YARD_START)
      );
      setAutofillEndTime(
        normaliseTimeValue(
          mode === "workshop"
            ? employee?.workshopEndTime || employee?.timesheetDefaults?.workshopEnd
            : mode === "office"
            ? employee?.officeEndTime || employee?.timesheetDefaults?.officeEnd
            : employee?.yardEndTime || employee?.timesheetDefaults?.yardEnd
        ) || (mode === "office" ? DEFAULT_OFFICE_END : DEFAULT_YARD_END)
      );
    } finally {
      setSettingsBusy(false);
    }
  }, [
    employee?.employeeId,
    employee?.officeEndTime,
    employee?.officeStartTime,
    employee?.timesheetDefaultType,
    employee?.timesheetDefaults?.defaultType,
    employee?.timesheetDefaults?.officeEnd,
    employee?.timesheetDefaults?.officeStart,
    employee?.timesheetDefaults?.workshopEnd,
    employee?.timesheetDefaults?.workshopStart,
    employee?.timesheetDefaults?.yardEnd,
    employee?.timesheetDefaults?.yardStart,
    employee?.userCode,
    employee?.workshopEndTime,
    employee?.workshopStartTime,
    employee?.yardEndTime,
    employee?.yardStartTime,
    employeeRows,
    employeesResource.isInitialLoading,
    isAuthed,
    loading,
  ]);

  const saveAutofillDefaults = useCallback(async () => {
    const mode = normaliseAutofillType(autofillType);
    const start = normaliseTimeValue(autofillStartTime);
    const end = normaliseTimeValue(autofillEndTime);

    if (!start || !end) {
      Alert.alert("Invalid time", "Please choose valid start and finish times.");
      return false;
    }

    if (!settingsDocId) {
      Alert.alert("Profile not found", "Could not find your employee profile to save defaults.");
      return false;
    }

    try {
      setSettingsSaving(true);

      const payload =
        mode === "office"
          ? {
              officeStartTime: start,
              officeEndTime: end,
              officeStart: start,
              officeEnd: end,
              timesheetDefaultType: "office",
              "timesheetDefaults.defaultType": "office",
              "timesheetDefaults.officeStart": start,
              "timesheetDefaults.officeEnd": end,
            }
          : mode === "workshop"
          ? {
              workshopStartTime: start,
              workshopEndTime: end,
              workshopStart: start,
              workshopEnd: end,
              timesheetDefaultType: "workshop",
              "timesheetDefaults.defaultType": "workshop",
              "timesheetDefaults.workshopStart": start,
              "timesheetDefaults.workshopEnd": end,
            }
          : {
              yardStartTime: start,
              yardEndTime: end,
              yardStart: start,
              yardEnd: end,
              timesheetDefaultType: "yard",
              "timesheetDefaults.defaultType": "yard",
              "timesheetDefaults.yardStart": start,
              "timesheetDefaults.yardEnd": end,
            };

      await updateDoc(doc(db, "employees", settingsDocId), payload);
      const cachedProfile =
        employeeRows.find((row) => String(row.id || "") === settingsDocId) || {};
      const startKey = `${mode}Start`;
      const endKey = `${mode}End`;
      await upsertEmployee({
        ...cachedProfile,
        id: settingsDocId,
        [`${mode}StartTime`]: start,
        [`${mode}EndTime`]: end,
        [startKey]: start,
        [endKey]: end,
        timesheetDefaultType: mode,
        timesheetDefaults: {
          ...(cachedProfile.timesheetDefaults || {}),
          defaultType: mode,
          [startKey]: start,
          [endKey]: end,
        },
      });

      const sessionPairs = [
        ["timesheetDefaultType", mode],
      ];
      if (mode === "office") {
        sessionPairs.push(["timesheetOfficeStart", start], ["timesheetOfficeEnd", end]);
      } else if (mode === "workshop") {
        sessionPairs.push(["timesheetWorkshopStart", start], ["timesheetWorkshopEnd", end]);
      } else {
        sessionPairs.push(["timesheetYardStart", start], ["timesheetYardEnd", end]);
      }
      await AsyncStorage.multiSet(sessionPairs);

      if (reloadSession) await reloadSession();

      setAutofillType(mode);
      setAutofillStartTime(start);
      setAutofillEndTime(end);
      Alert.alert("Saved", `Your default ${mode} autofill times have been updated.`);
      return true;
    } catch (err) {
      console.error("Error saving timesheet defaults:", err);
      Alert.alert("Error", "Could not save your autofill times.");
      return false;
    } finally {
      setSettingsSaving(false);
    }
  }, [
    autofillEndTime,
    autofillStartTime,
    autofillType,
    employeeRows,
    reloadSession,
    settingsDocId,
    upsertEmployee,
  ]);

  useEffect(() => {
    loadAutofillDefaults();
  }, [loadAutofillDefaults]);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      refreshTimesheets(),
      refreshTimesheetQueries(),
      refreshEmployees(),
    ]);
  }, [refreshEmployees, refreshTimesheetQueries, refreshTimesheets]);

  // Past 4 weeks (including current)
  const weekOptions = useMemo(() => {
    return [...Array(4)].map((_, i) => {
      const monday = getMonday(new Date());
      monday.setDate(monday.getDate() - 7 * i);
      return {
        key: monday.toISOString().split("T")[0],
        label: formatWeekRange(monday),
      };
    });
  }, []);

  // sort newest → oldest
  const sortedTimesheets = useMemo(
    () =>
      timesheets
        .slice()
        .sort((a, b) => new Date(timesheetWeekKey(b)) - new Date(timesheetWeekKey(a))),
    [timesheets]
  );

  // only real submissions for the bottom list
  const submittedSheets = useMemo(
    () => sortedTimesheets.filter((t) => t.submitted === true),
    [sortedTimesheets]
  );

  const thisMonthStatuses = useMemo(() => {
    return weekOptions.map((w) => {
      const existing = timesheets.find((t) => timesheetWeekKey(t) === w.key);
      if (!existing) return "none";
      if (isTimesheetApproved(existing)) return "approved";
      if (existing.submitted === true) return "submitted";
      return "draft";
    });
  }, [timesheets, weekOptions]);

  const thisMonthCompleteCount = thisMonthStatuses.filter(
    (s) => s === "approved" || s === "submitted"
  ).length;

  const WeekStatusPill = ({ status }) => {
    // status: "approved" | "submitted" | "draft" | "none"
    let bgStyle, textColor, iconName, label;

    if (status === "approved") {
      bgStyle = styles.pillApproved;
      textColor = routeColors.hex_022c22_8bgm6t;
      iconName = "check-circle";
      label = "Approved";
    } else if (status === "submitted") {
      bgStyle = styles.pillSubmitted;
      textColor = routeColors.hex_052e16_89ayk3;
      iconName = "check-circle";
      label = "Submitted";
    } else if (status === "draft") {
      bgStyle = styles.pillDraft;
      textColor = routeColors.hex_1e293b_95wh3c;
      iconName = "edit-3";
      label = "Draft saved";
    } else {
      bgStyle = styles.pillNotFilled;
      textColor = routeColors.hex_7c2d12_7wqog7;
      iconName = "alert-circle";
      label = "Not filled";
    }

    return (
      <View style={[styles.pill, bgStyle]}>
        <Icon
          name={iconName}
          size={14}
          color={textColor}
          style={{ marginRight: t.spacing.xxs }}
        />
        <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  const renderWeekCard = (weekKey, label, status, hasQuery = false, divider = false) => (
    <SettingsRow
      titleVariant="bodyLargeStrong"
      subtitleVariant="metadata"
      titleTone="primary"
      key={weekKey}
      title={label}
      subtitle={hasQuery ? "Monday → Sunday · Manager query pending" : "Monday → Sunday"}
      trailing={<WeekStatusPill status={status} />}
      divider={divider}
      onPress={() => router.push(`/week/${weekKey}`)}
      accessibilityLabel={`${label}, ${status === "approved" ? "approved" : status === "submitted" ? "submitted" : "not filled"}${hasQuery ? ", manager query pending" : ""}`}
    />
  );

  // follow me.js: render nothing while auth resolving or unauthenticated
  if (loading || !isAuthed) return null;

  return (
    <PageShell
      appearance="grouped"
      header={{
        variant: "compact",
        eyebrow: "Payroll",
        title: "Timesheets",
        onBack: goBack,
        metadata: <View style={styles.heroMetaRow}>
            <View
              style={[
                styles.heroMetaChip,
                {
                  backgroundColor: withAlpha(colors.surfaceAlt, 0.8),
                  borderColor: withAlpha(colors.border, 0.8),
                },
              ]}
            >
              <Icon name="calendar" size={12} color={colors.textMuted} />
              <Text tone={"primary"} style={[styles.heroMetaText]}>
                This month: {thisMonthCompleteCount}/{weekOptions.length}
              </Text>
            </View>

            <View
              style={[
                styles.heroMetaChip,
                {
                  backgroundColor: withAlpha(colors.surfaceAlt, 0.8),
                  borderColor: withAlpha(colors.border, 0.8),
                },
              ]}
            >
              <Icon name="archive" size={12} color={colors.textMuted} />
              <Text tone={"primary"} style={[styles.heroMetaText]}>
                Submitted: {submittedSheets.length}
              </Text>
            </View>
          </View>,
      }}
      refresh={{ refreshing, onRefresh }}
    >


      <SettingsGroup outlined>
        <SettingsRow
          titleVariant="bodyLargeStrong"
          subtitleVariant="metadata"
          titleTone="primary"
          title="Timesheet Autofill"
          subtitle={settingsBusy ? "Loading defaults…" : `${autofillType === "office" ? "Office" : autofillType === "workshop" ? "Workshop" : "Yard"} · ${autofillStartTime}–${autofillEndTime}`}
          onPress={() => setSettingsOpen(true)}
          disabled={settingsBusy}
          accessibilityLabel="Edit timesheet autofill settings"
        />
      </SettingsGroup>
      <Text variant="metadata" tone="secondary" layoutStyle={styles.settingsHelp}>
        Choose the default work type and times used for new entries.
      </Text>

      <NativeSettingsSheet
        visible={settingsOpen}
        title="Autofill Settings"
        appearance="grouped"
        presentation={autofillSheet ? "sheet" : "dialog"}
        actionsLayoutStyle={[styles.autofillModalActions, autofillSheet && { paddingBottom: Math.max(t.spacing.md, insets.bottom) }]}
        onRequestClose={() => setSettingsOpen(false)}
        busy={settingsSaving}
        actions={
          <>
            <NativeActionButton label="Cancel" role="cancel" variant="secondary" onPress={() => setSettingsOpen(false)} disabled={settingsSaving} />
            <NativeActionButton
              label={settingsSaving ? "Saving..." : "Save"}
              variant="glassPrimary"
              loading={settingsSaving}
              onPress={async () => {
                const ok = await saveAutofillDefaults();
                if (ok) setSettingsOpen(false);
              }}
            />
          </>
        }
      >
            <Text variant="settingsDetail" tone="secondary">
              Choose one default type and set its times.
            </Text>

            <NativeSegmentedControl
              options={[
                { label: "Yard", value: "yard" },
                { label: "Office", value: "office" },
                { label: "Workshop", value: "workshop" },
              ]}
              value={autofillType}
              disabled={settingsSaving}
              onChange={(type) => {
                if (settingsSaving) return;
                setAutofillType(type);
                if (type === "office") {
                  setAutofillStartTime(
                    normaliseTimeValue(
                      employee?.officeStartTime || employee?.timesheetDefaults?.officeStart
                    ) || DEFAULT_OFFICE_START
                  );
                  setAutofillEndTime(
                    normaliseTimeValue(
                      employee?.officeEndTime || employee?.timesheetDefaults?.officeEnd
                    ) || DEFAULT_OFFICE_END
                  );
                } else if (type === "workshop") {
                  setAutofillStartTime(
                    normaliseTimeValue(
                      employee?.workshopStartTime || employee?.timesheetDefaults?.workshopStart
                    ) || DEFAULT_YARD_START
                  );
                  setAutofillEndTime(
                    normaliseTimeValue(
                      employee?.workshopEndTime || employee?.timesheetDefaults?.workshopEnd
                    ) || DEFAULT_YARD_END
                  );
                } else {
                  setAutofillStartTime(
                    normaliseTimeValue(
                      employee?.yardStartTime || employee?.timesheetDefaults?.yardStart
                    ) || DEFAULT_YARD_START
                  );
                  setAutofillEndTime(
                    normaliseTimeValue(
                      employee?.yardEndTime || employee?.timesheetDefaults?.yardEnd
                    ) || DEFAULT_YARD_END
                  );
                }
              }}
            />

            <SettingsGroup outlined>
              <TimePickerField
                label="Start"
                divider
                value={autofillStartTime}
                onSelect={setAutofillStartTime}
                options={TIME_OPTIONS}
                disabled={settingsSaving}
              />
              <TimePickerField
                label="Finish"
                value={autofillEndTime}
                onSelect={setAutofillEndTime}
                options={TIME_OPTIONS}
                disabled={settingsSaving}
              />
            </SettingsGroup>

      </NativeSettingsSheet>

      <>
        <AsyncContentState
          resources={[timesheetsResource, queriesResource, employeesResource]}
          hasContent={timesheets.length > 0}
          onRetry={onRefresh}
          loadingLabel="Loading timesheets…"
        >
        {/* Legend row */}
        <View style={styles.legendRow}>
          <LegendSwatch
            color={routeColors.hex_22c55e_74qlvk}
            border={routeColors.hex_16a34a_a655dy}
            label="Approved"
            textColor={colors.text}
          />
          <LegendSwatch
            color={routeColors.hex_bbf7d0_ry6j9f}
            border={routeColors.hex_86efac_dg95e1}
            label="Submitted"
            textColor={colors.text}
          />
          <LegendSwatch
            color={routeColors.hex_fee2b3_pb1qcj}
            border={routeColors.hex_fed7aa_pb14l2}
            label="Draft saved"
            textColor={colors.text}
          />
          <LegendSwatch
            color={routeColors.hex_fed7aa_pb14l2}
            border={routeColors.hex_fdba74_pbro4k}
            label="Not filled"
            textColor={colors.text}
          />
        </View>

        {/* This month (interactive list of 4 weeks) */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="sectionHeading" tone="primary" layoutStyle={styles.sectionHeading}>
            This Month
          </Text>
        </View>
        <SettingsGroup outlined>
          {weekOptions.map((w, idx) => {
              const existing = timesheets.find((t) => timesheetWeekKey(t) === w.key);

              let status = "none"; // default: no timesheet
              if (existing) {
                const approved = isTimesheetApproved(existing);
                if (approved) {
                  status = "approved";
                } else if (existing.submitted === true) {
                  status = "submitted";
                } else {
                  status = "draft";
                }
              }

              // ❗ hide query badge if approved
              const hasQuery = !!queryWeeksMap[w.key] && status !== "approved";

              return (
                <View key={w.key}>
                  {renderWeekCard(w.key, w.label, status, hasQuery, idx < weekOptions.length - 1)}
                </View>
              );
            })}
        </SettingsGroup>

        {/* Past submissions list */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="sectionHeading" tone="primary" layoutStyle={styles.sectionHeading}>
            Past Submissions
          </Text>
          <NativeActionButton
            label="Refresh"
            variant="secondary"
            size="small"
            systemImage="arrow.clockwise"
            icon="refresh-ccw"
            onPress={onRefresh}
            loading={refreshing}
            accessibilityLabel="Refresh timesheets"
          />
        </View>

        {submittedSheets.length === 0 ? (
          <SettingsGroup outlined><EmptyState
            presentation="plain"
            icon="clock"
            title="No submitted timesheets"
            message="Submitted weeks will appear here."
            compact
          /></SettingsGroup>
        ) : (
          <SettingsGroup outlined>
            {submittedSheets.map((item, idx) => {
              const approved = isTimesheetApproved(item);
              const status = approved ? "approved" : "submitted";
              const weekKey = timesheetWeekKey(item);
              const hasQuery = !!queryWeeksMap[weekKey] && !approved;
              const isLast = idx === submittedSheets.length - 1;

              return (
                <View
                  key={item.id}

                >
                  {renderWeekCard(
                    weekKey,
                    formatWeekRange(new Date(weekKey)),
                    status,
                    hasQuery,
                    !isLast
                  )}
                </View>
              );
            })}
          </SettingsGroup>
        )}
        </AsyncContentState>
      </>
    </PageShell>
  );
}

/* tiny components */
function TimePickerField({ label, value, onSelect, options, disabled, divider }) {
  return (
    <View>
      <NativeTimeSelect
        label={label}
        value={value}
        onChange={onSelect}
        options={options}
        divider={divider}
        disabled={disabled}
      />
    </View>
  );
}

function LegendSwatch({ color, border, label, textColor }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color, borderColor: border },
        ]}
      />
      <Text style={[styles.legendText, { color: textColor }]}>{label}</Text>
    </View>
  );
}
function ShimmerLine({ width = "100%" }) {
  return <View style={[styles.shimmer, { width }]} />;
}

/* styles */
