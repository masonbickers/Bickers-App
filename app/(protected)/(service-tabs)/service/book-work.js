import { routeColors } from "../../../../lib/design/routePresentation/service-tabs-service-book-work-js.js";
import { styles } from "../../../../lib/design/screenStyles/service-tabs-service-book-work-js.js";
import { SectionCard, AppText as Text, AppPressable as TouchableOpacity } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import PageShell from "../../../../components/layout/PageShell";

import { designTokens as t } from "../../../../lib/design/tokens";
import {
  getVehicleName,
  getVehicleNextService,
  getVehicleRegistration,
} from "../../../../lib/fleetSchema";
import { useServiceCollection, useServiceCollectionReader } from "../../../../hooks/useServiceData";
import { useAuth } from "../../../../providers/AuthProvider";
import { isWorkshopRequestVisible, routeForWorkshopRequest } from "../../../../lib/workshopRequests";
import { listServiceDrafts, SERVICE_DRAFTS_KEY } from "../../../../lib/serviceDrafts";
import { listOutboxMutations, subscribeOutbox } from "../../../../lib/sync/outbox";
import { useTheme } from "../../../../providers/ThemeProvider";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

const REQUEST_LABELS = {
  full_service: "Full service", minor_service: "Minor service", general_repair: "General repair",
  vehicle_check: "General vehicle check", equipment_inspection: "Equipment inspection", mot_precheck: "MOT pre-check",
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// normalise Firestore / string / Date into Date
function toJsDate(value) {
  if (!value) return null;

  if (value?.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    // allow plain "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    return new Date(value);
  }

  return new Date(value);
}

function formatDateShort(value) {
  const d = toJsDate(value);
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function BookWorkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { employee } = useAuth();
  const readServiceCollection = useServiceCollectionReader();
  const { rows: requestRows, loading: requestsLoading } = useServiceCollection("workshopRequests");

  const [filter, setFilter] = useState("open");
  const [pendingRequestIds, setPendingRequestIds] = useState(new Set());

  useEffect(() => {
    let active = true;
    const refreshPending = async () => {
      const queued = await listOutboxMutations();
      if (active) setPendingRequestIds(new Set(queued
        .filter((item) => item.entityType === "workshopRequest" && item.operation === "update")
        .map((item) => String(item.entityId))));
    };
    refreshPending().catch(() => {});
    const stop = subscribeOutbox(() => { refreshPending().catch(() => {}); });
    return () => { active = false; stop(); };
  }, []);

  // 👇 in-progress service form drafts (deduped: max 1 per vehicle)
  const [serviceDrafts, setServiceDrafts] = useState([]);

  // 🔍 service due lists
  const [serviceLoading, setServiceLoading] = useState(true);
  const [overdueServices, setOverdueServices] = useState([]);
  const [dueSoonServices, setDueSoonServices] = useState([]);

  const [currentDay, setCurrentDay] = useState(() => startOfDay(new Date()).getTime());

  useFocusEffect(useCallback(() => {
    const refreshDay = () => setCurrentDay(startOfDay(new Date()).getTime());
    refreshDay();
    const interval = setInterval(refreshDay, 60_000);
    return () => clearInterval(interval);
  }, []));

  /* ---------------- LOAD ALL SERVICE DRAFTS (DEDUPED PER VEHICLE) ---------------- */
  useFocusEffect(useCallback(() => {
    let active = true;
    const loadDrafts = async () => {
      try {
        const drafts = await listServiceDrafts(AsyncStorage);
        if (active) setServiceDrafts(drafts);
      } catch (err) {
        console.error("Failed to load service drafts:", err);
        if (active) setServiceDrafts([]);
      }
    };

    loadDrafts();
    return () => { active = false; };
  }, []));

  /* ---------------- LOAD VEHICLES & FIND SERVICE DUE ---------------- */
  useEffect(() => {
    const fetchServiceDueVehicles = async () => {
      setServiceLoading(true);
      try {
        const vehicleRows = await readServiceCollection("vehicles");

        const today = new Date(currentDay);
        const msPerDay = 1000 * 60 * 60 * 24;

        const overdue = [];
        const soon = [];

        vehicleRows.forEach((vehicle) => {
          const data = vehicle || {};
          const id = vehicle.id;


          const name = getVehicleName(data) || "Unnamed vehicle";
          const reg = getVehicleRegistration(data) || "";
          const nextService = getVehicleNextService(data);

          if (!nextService) return;

          const serviceDate = new Date(nextService);
          if (Number.isNaN(serviceDate.getTime())) return;

          const serviceDateOnly = new Date(
            serviceDate.getFullYear(),
            serviceDate.getMonth(),
            serviceDate.getDate(),
            0,
            0,
            0,
            0
          );

          const diffMs = serviceDateOnly.getTime() - today.getTime();
          const diffDays = Math.round(diffMs / msPerDay);

          if (diffDays < 0) {
            overdue.push({
              id,
              name,
              reg,
              nextService,
              daysOverdue: Math.abs(diffDays),
            });
          } else if (diffDays <= 30) {
            soon.push({
              id,
              name,
              reg,
              nextService,
              daysUntil: diffDays,
            });
          }
        });

        overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
        soon.sort((a, b) => a.daysUntil - b.daysUntil);

        setOverdueServices(overdue);
        setDueSoonServices(soon);
      } catch (err) {
        console.error("Failed to load vehicles for service due list:", err);
      } finally {
        setServiceLoading(false);
      }
    };

    fetchServiceDueVehicles();
  }, [readServiceCollection, currentDay]);

  const hasAnyServiceDue =
    overdueServices.length > 0 || dueSoonServices.length > 0;

  // 🧠 hide drafts that are *already represented* in the service-due list
  const serviceDueIds = useMemo(
    () => new Set([...overdueServices, ...dueSoonServices].map((v) => v.id)),
    [overdueServices, dueSoonServices]
  );

  const visibleDrafts = useMemo(
    () =>
      serviceDrafts.filter(
        (d) => !d.selectedVehicleId || !serviceDueIds.has(d.selectedVehicleId)
      ),
    [serviceDrafts, serviceDueIds]
  );

  const filteredTasks = useMemo(() => (requestRows || [])
    .filter((request) => isWorkshopRequestVisible(request, employee?.companyId, filter))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
  [requestRows, employee?.companyId, filter]);

  // 🔁 continue a specific draft
  const handleContinueServiceForm = (formId) => {
    const draft = serviceDrafts.find((item) => item.id === formId);
    const query = draft?.workshopRequestId && draft?.requestedVehicleId
      ? `?workshopRequestId=${encodeURIComponent(draft.workshopRequestId)}&vehicleId=${encodeURIComponent(draft.requestedVehicleId)}` : "";
    router.push(`/service/service-form/${formId}${query}`);
  };

  // ⚙️ when starting a service from this page for a specific vehicle
  const handleStartServiceForVehicle = async (vehicle) => {
    try {
      const name = getVehicleName(vehicle) || "Unnamed vehicle";
      const reg = getVehicleRegistration(vehicle) || "";

      const existingDraft = serviceDrafts.find(
        (d) => d.selectedVehicleId === vehicle.id
      );
      if (existingDraft) {
        handleContinueServiceForm(existingDraft.id);
        return;
      }

      const formId = `svc-${vehicle.id}-${Date.now()}`;

      const newDraft = {
        selectedVehicleId: vehicle.id,
        vehicleName: name,
        registration: reg,
        serviceType: "Full service",
        serviceDate: undefined,
        serviceTime: undefined,
        odometer: "",
        workSummary: "",
        partsUsed: "",
        extraNotes: "",
        signedBy: "",
        checks: {},
        checkRatings: {},
        checkNA: {},
        photoURIs: [],
      };

      const raw = await AsyncStorage.getItem(SERVICE_DRAFTS_KEY);
      const allDrafts = raw ? JSON.parse(raw) || {} : {};

      allDrafts[formId] = newDraft;
      await AsyncStorage.setItem(
        SERVICE_DRAFTS_KEY,
        JSON.stringify(allDrafts)
      );

      setServiceDrafts((prev) => [...prev, { id: formId, ...newDraft }]);

      router.push(`/service/service-form/${formId}`);
    } catch (err) {
      console.error("Failed to prep draft for service form:", err);
      router.push("/service/service-form/error");
    }
  };

  const priorityService = overdueServices[0] || dueSoonServices[0];
  const openRequests = (requestRows || [])
    .filter((request) => isWorkshopRequestVisible(request, employee?.companyId, "open"))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const priorityDraft = visibleDrafts[0];
  const priorityRequest = openRequests[0];
  const priorityTitle = requestsLoading || (serviceLoading && !priorityRequest)
    ? "Checking workshop priorities…"
    : priorityRequest
    ? `${priorityRequest.assetLabel || priorityRequest.assetId || "Workshop request"}`
    : priorityService
    ? `${priorityService.name}${priorityService.reg ? ` · ${priorityService.reg}` : ""}`
    : priorityDraft
    ? `${priorityDraft.vehicleName || "Vehicle"}${priorityDraft.registration ? ` · ${priorityDraft.registration}` : ""}`
    : "You’re caught up";
  const priorityDetail = requestsLoading || (serviceLoading && !priorityRequest)
    ? "Loading service work and requests"
    : priorityRequest
    ? "Open workshop request"
    : overdueServices.length
    ? `${priorityService.daysOverdue} days overdue for service`
    : dueSoonServices.length
    ? "Service due soon"
    : priorityDraft
    ? "Continue the saved service form"
    : "No service work or open requests right now";
  const openPriority = requestsLoading || (serviceLoading && !priorityRequest)
    ? undefined
    : priorityRequest
    ? () => router.push(routeForWorkshopRequest(priorityRequest))
    : priorityService
    ? () => handleStartServiceForVehicle(priorityService)
    : priorityDraft
    ? () => handleContinueServiceForm(priorityDraft.id)
    : undefined;
  const showRequestsFirst = requestsLoading || filteredTasks.length > 0;

  const requestSection = (
    <>
        {/* FILTERS */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    borderColor: active
                      ? colors.accent || COLORS.primaryAction
                      : colors.border || COLORS.border,
                    backgroundColor: active
                      ? getServiceStatusColors("danger").background
                      : colors.surfaceAlt || COLORS.card,
                  },
                ]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: active
                        ? getServiceStatusColors("danger").onBackground
                        : colors.textMuted || COLORS.textMid,
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.sectionHeaderRow, styles.requestsSectionHeader]}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Workshop requests
          </Text>
          <Text
            tone={"muted"} style={[
              styles.sectionSubtitle,
            ]}
          >
            Open a request to complete its workshop form.
          </Text>
        </View>

        {requestsLoading ? (
          <ActivityIndicator color={colors.accent || COLORS.primaryAction} />
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              name="check-circle"
              size={28}
              color={colors.textMuted || COLORS.textMid}
            />
            <Text
              tone={"primary"} style={[
                styles.emptyTitle,
              ]}
            >
              No requests in this view
            </Text>
            <Text
              tone={"muted"} style={[
                styles.emptySubtitle,
              ]}
            >
              Requests added from Vehicle Home appear here.
            </Text>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <TaskRow key={task.id} task={task} pending={pendingRequestIds.has(String(task.id))} onOpen={() => router.push(routeForWorkshopRequest(task))} />
          ))
        )}
    </>
  );

  return (
    <PageShell
      header={{
        variant: "hero",
        eyebrow: "Workshop",
        title: "Workshop To-Do",
        subtitle: "Service work and workshop requests.",
      }}
    >
        <TouchableOpacity
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surfaceAlt || COLORS.card,
              borderColor: colors.border || COLORS.border,
            },
          ]}
          onPress={openPriority}
          disabled={!openPriority}
          accessibilityRole={openPriority ? "button" : undefined}
          accessibilityLabel={openPriority ? `Next action: ${priorityTitle}. ${priorityDetail}` : undefined}
        >
          <View style={styles.priorityHeader}>
            <Text tone={"muted"} style={[styles.priorityEyebrow]}>NEXT ACTION</Text>
            {openPriority ? <Icon name="arrow-up-right" size={18} color={colors.accent || COLORS.primaryAction} /> : null}
          </View>
          <Text tone={"primary"} style={[styles.infoTitle]}>{priorityTitle}</Text>
          <Text tone={"muted"} style={[styles.infoSubtitle]}>{priorityDetail}</Text>
          <View style={[styles.priorityStats, { borderTopColor: colors.border || COLORS.border }]}>
            <Text tone={"danger"} style={[styles.priorityStat]}>{serviceLoading ? "…" : overdueServices.length} overdue service</Text>
            <Text tone={"warning"} style={[styles.priorityStat]}>{serviceLoading ? "…" : dueSoonServices.length} due soon</Text>
            <Text tone={"muted"} style={[styles.priorityStat]}>{requestsLoading ? "…" : openRequests.length} open requests</Text>
          </View>
        </TouchableOpacity>

        {showRequestsFirst && requestSection}

        {/* 🔧 SERVICE DUE SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Service due
          </Text>
          {hasAnyServiceDue && (
            <Text
              tone={"muted"} style={[
                styles.sectionSubtitle,
              ]}
            >
              Tap a vehicle to start or continue its service form.
            </Text>
          )}
        </View>

        <SectionCard
          tone="subtle" layoutStyle={styles.serviceCard}
        >
          {serviceLoading ? (
            <View style={styles.serviceLoadingRow}>
              <ActivityIndicator
                size="small"
                color={colors.danger || COLORS.primaryAction}
              />
              <Text
                tone={"muted"} style={[
                  styles.serviceLoadingText,
                ]}
              >
                Checking service dates…
              </Text>
            </View>
          ) : !hasAnyServiceDue ? (
            <View style={styles.emptyServiceState}>
              <Icon
                name="check"
                size={18}
                color={colors.textMuted || COLORS.textMid}
              />
              <Text
                tone={"muted"} style={[
                  styles.emptyServiceText,
                ]}
              >
                No services overdue or due in the next 30 days.
              </Text>
            </View>
          ) : (
            <>
              {overdueServices.length > 0 && (
                <View style={{ marginBottom: t.spacing.xs }}>
                  <Text
                    tone={"muted"} style={[
                      styles.serviceGroupTitle,
                    ]}
                  >
                    Overdue
                  </Text>
                  {overdueServices.map((v, idx) => {
                    const existingDraft = serviceDrafts.find(
                      (d) => d.selectedVehicleId === v.id
                    );
                    const isDraftVehicle = !!existingDraft;

                    const isTopRecommended = idx === 0;

                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.serviceRow,
                          isTopRecommended && styles.serviceRowRecommended,
                          { borderTopColor: colors.border || COLORS.border },
                        ]}
                        onPress={() =>
                          isDraftVehicle
                            ? handleContinueServiceForm(existingDraft.id)
                            : handleStartServiceForVehicle(v)
                        }
                        activeOpacity={0.9}
                      >
                        <View style={styles.serviceRowContent}>
                          <View style={styles.serviceTitleRow}>
                            <Text
                              tone={"primary"} style={[
                                styles.serviceVehicle,
                              ]}
                            >
                              {v.name}
                              {v.reg ? ` · ${v.reg}` : ""}
                            </Text>
                            {isTopRecommended && (
                              <Text
                                tone={"danger"} style={[
                                  styles.recommendedTag,
                                ]}
                              >
                                Start here
                              </Text>
                            )}
                          </View>
                          <Text
                            tone={"muted"} style={[
                              styles.serviceMeta,
                            ]}
                          >
                            Next service was due {formatDateShort(v.nextService) || v.nextService} ·{" "}
                            {v.daysOverdue} day
                            {v.daysOverdue === 1 ? "" : "s"} overdue
                          </Text>
                        </View>
                        <View style={styles.serviceBadgeOverdue}>
                          <Text style={styles.serviceBadgeText}>
                            {isDraftVehicle ? "In progress" : "Service"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {dueSoonServices.length > 0 && (
                <View style={{ marginTop: overdueServices.length ? 4 : 0 }}>
                  <Text
                    tone={"muted"} style={[
                      styles.serviceGroupTitle,
                    ]}
                  >
                    Due in next 30 days
                  </Text>
                  {dueSoonServices.map((v, idx) => {
                    const existingDraft = serviceDrafts.find(
                      (d) => d.selectedVehicleId === v.id
                    );
                    const isDraftVehicle = !!existingDraft;
                    const isNextPriority = idx === 0;

                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.serviceRow,
                          { borderTopColor: colors.border || COLORS.border },
                        ]}
                        onPress={() =>
                          isDraftVehicle
                            ? handleContinueServiceForm(existingDraft.id)
                            : handleStartServiceForVehicle(v)
                        }
                        activeOpacity={0.9}
                      >
                        <View style={styles.serviceRowContent}>
                          <View style={styles.serviceTitleRow}>
                            <Text
                              tone={"primary"} style={[
                                styles.serviceVehicle,
                              ]}
                            >
                              {v.name}
                              {v.reg ? ` · ${v.reg}` : ""}
                            </Text>
                            {isNextPriority && (
                              <Text style={styles.nextPriorityTag}>
                                Next up
                              </Text>
                            )}
                          </View>
                          <Text
                            tone={"muted"} style={[
                              styles.serviceMeta,
                            ]}
                          >
                            Next service {formatDateShort(v.nextService) || v.nextService} · due in {v.daysUntil}{" "}
                            day{v.daysUntil === 1 ? "" : "s"}
                          </Text>
                        </View>
                        <View style={styles.serviceBadgeSoon}>
                          <Text style={styles.serviceBadgeText}>
                            {isDraftVehicle ? "In progress" : "Service"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </SectionCard>

        {/* 🔴 IN-PROGRESS FORMS SECTION */}
        {visibleDrafts.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text
                tone={"primary"} style={[
                  styles.sectionTitle,
                ]}
              >
                In-progress forms
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.sectionSubtitle,
                ]}
              >
                Continue a saved workshop record.
              </Text>
            </View>

            {visibleDrafts.map((draft) => (
              <TouchableOpacity
                key={draft.id}
                style={[
                  styles.draftCard,
                  {
                    backgroundColor: colors.surfaceAlt || COLORS.card,
                    borderColor:
                      colors.danger || COLORS.primaryAction,
                  },
                ]}
                activeOpacity={0.9}
                onPress={() => handleContinueServiceForm(draft.id)}
              >
                <View style={styles.draftIconWrap}>
                  <Icon name="file-text" size={18} color={COLORS.textHigh} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    tone={"primary"} style={[
                      styles.draftTitle,
                    ]}
                  >
                    {draft.vehicleName || "Vehicle not selected yet"}
                    {draft.registration ? ` · ${draft.registration}` : ""}
                  </Text>
                  <Text
                    tone={"muted"} style={[
                      styles.draftMeta,
                    ]}
                  >
                    {(draft.serviceType || "Full service") +
                      " · " +
                      (draft.serviceDate || "In progress")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {!showRequestsFirst && requestSection}

    </PageShell>
  );
}

/* ---------- ROW COMPONENTS ---------- */

function TaskRow({ task, onOpen, pending = false }) {
  const { colors } = useTheme();
  const completed = task.status === "completed";

  let typeColour = colors.textMuted || routeColors.hex_999_yhltsv;
  const typeLower = String(task.workType || "").toLowerCase();
  if (typeLower.includes("mot")) typeColour = colors.danger || routeColors.hex_ed1c25_4py4qa;
  else if (typeLower.includes("service"))
    typeColour = colors.success || routeColors.hex_34c759_8tm7fd;
  else if (typeLower.includes("defect")) typeColour = routeColors.hex_ff9500_5c3jxm;
  else if (typeLower.includes("tyre")) typeColour = routeColors.hex_ffcc00_5c6g4m;
  else if (typeLower.includes("loler")) typeColour = routeColors.hex_5ac8fa_60jr0u;

  return (
    <TouchableOpacity
      style={[
        styles.taskRow,
        {
          opacity: completed || pending ? 0.55 : 1,
          borderBottomColor: colors.border || COLORS.border,
        },
      ]}
      activeOpacity={0.85}
      onPress={onOpen}
      disabled={completed || pending}
    >
      <View style={styles.taskCheckWrap}>
        {completed ? (
          <View
            style={[
              styles.taskCheckFilled,
              { backgroundColor: colors.danger || COLORS.primaryAction },
            ]}
          >
            <Icon name="check" size={14} color={COLORS.textHigh} />
          </View>
        ) : (
          <View
            style={[
              styles.taskCheckEmpty,
              { borderColor: colors.textMuted || COLORS.textMid },
            ]}
          />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          tone={(completed) ? "muted" : ("primary")} style={[
            styles.taskTitle,
            null,
            completed && { textDecorationLine: "line-through" },
          ]}
        >
          {task.assetLabel || task.assetId}
        </Text>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: t.spacing.xxs }}
        >
          <View
            style={[
              styles.taskTypePill,
              { borderColor: typeColour },
            ]}
          >
            <Text
              tone={"muted"} style={[
                styles.taskTypeText,
              ]}
            >
              {pending ? "Pending sync" : REQUEST_LABELS[task.workType] || task.workType}
            </Text>
          </View>
          {!!task.description && (
            <Text
              tone={"muted"} style={[
                styles.taskHint,
              ]}
            >
              {task.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ---------- STYLES ---------- */
