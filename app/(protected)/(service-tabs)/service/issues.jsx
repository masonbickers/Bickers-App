import { routeColors } from "../../../../lib/design/routePresentation/service-tabs-service-issues-jsx.js";
import { styles } from "../../../../lib/design/screenStyles/service-tabs-service-issues-jsx.js";
import { getServiceOverviewState } from "../../../../lib/serviceOverview";
import { SectionCard, AppText as Text, AppPressable as TouchableOpacity, AppButton, Banner, StateView } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
import { useRouter } from "expo-router";
import { useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import PageShell from "../../../../components/layout/PageShell";
import { db } from "../../../../firebaseConfig";
import { designTokens as t } from "../../../../lib/design/tokens";
import { groupServiceIssuesByAsset } from "../../../../lib/serviceIssueGrouping";
import { isReportableCheckDefect } from "../../../../lib/dailyVehicleCheck";
import {
  isOpenAdvisoryItem,
  resolveMonitorReportItem,
} from "../../../../lib/serviceAdvisories";
import { useServiceCacheActions, useServiceCollection } from "../../../../hooks/useServiceData";
import { runOrQueueFirestoreMutations } from "../../../../lib/sync/firestoreQueue";
import { useTheme } from "../../../../providers/ThemeProvider";

function normaliseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isApprovedDefect(review) {
  const status = normaliseKey(review?.status);
  const category = normaliseKey(review?.category);
  return status === "approved" && (category === "general" || category === "immediate");
}

function isOpenMaintenance(status) {
  const value = normaliseKey(status);
  return value !== "resolved" && value !== "complete" && value !== "completed";
}

function buildDefectRouteId(source, docId, itemIndex = "") {
  return encodeURIComponent([source, docId, itemIndex].join("|"));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateMaybe(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  const d = toDateMaybe(value);
  if (!d) return "No date";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function getRecordDate(record) {
  return (
    record?.reportedAt ||
    record?.createdAt ||
    record?.inspectionDateISO ||
    record?.serviceDateOnly ||
    record?.completedDate ||
    record?.updatedAt ||
    null
  );
}

function getVehicleText(record) {
  return [record?.vehicleName || record?.vehicle || record?.name, record?.registration || record?.reg]
    .filter(Boolean)
    .join(" · ");
}

function getEquipmentText(record) {
  return [
    record?.equipmentName || record?.name,
    record?.serialNumber || record?.equipmentId,
    record?.asset,
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildOpenDefects({ vehicleChecks, vehicleIssues, defectReports }) {
  const checkDefects = vehicleChecks.flatMap((check) => {
    const items = Array.isArray(check.items) ? check.items : [];
    return items.flatMap((item, index) =>
      isReportableCheckDefect(check, item) &&
      isOpenMaintenance(item?.maintenance?.status)
        ? [
            {
              id: `check-${check.id}-${item?.id || index}`,
              title: item?.label || item?.title || item?.name || "Vehicle check defect",
              details: item?.note || item?.notes || item?.review?.notes || item?.maintenance?.notes || "Vehicle check defect.",
              asset: getVehicleText(check) || "Vehicle check",
              date: getRecordDate(check),
              route: `/service/defects/${buildDefectRouteId("vehicleChecks", check.id, index)}`,
            },
          ]
        : []
    );
  });

  const issueDefects = vehicleIssues
    .filter((issue) => isApprovedDefect(issue?.review) && isOpenMaintenance(issue?.maintenance?.status))
    .map((issue) => ({
      id: `issue-${issue.id}`,
      title:
        issue?.title ||
        issue?.category ||
        (issue?.assetType === "equipment" ? "Equipment issue" : "Vehicle issue"),
      details: issue?.description || issue?.notes || issue?.review?.notes || "Approved maintenance issue.",
      asset:
        getEquipmentText(issue) ||
        getVehicleText(issue) ||
        (issue?.assetType === "equipment" ? "Equipment issue" : "Vehicle issue"),
      date: getRecordDate(issue),
      route: `/service/defects/${buildDefectRouteId("vehicleIssues", issue.id)}`,
    }));

  const reportDefects = defectReports
    .filter((report) => isOpenMaintenance(report?.status))
    .map((report) => ({
      id: `defect-${report.id}`,
      title: report?.category || report?.title || "Defect report",
      details: report?.description || report?.notes || "Open defect report.",
      asset: getEquipmentText(report) || getVehicleText(report) || "Defect report",
      date: getRecordDate(report),
      route: report.id
        ? `/service/defects/${buildDefectRouteId("defectReports", report.id)}`
        : "/service/defects",
    }));

  return [...checkDefects, ...issueDefects, ...reportDefects].sort(
    (a, b) => (toDateMaybe(b.date)?.getTime() || 0) - (toDateMaybe(a.date)?.getTime() || 0)
  );
}

function buildAdvisories({ serviceRecords, equipmentInspections }) {
  const services = serviceRecords.flatMap((record) => {
    const report = Array.isArray(record?.monitorReport) ? record.monitorReport : [];
    return report.flatMap((item, index) =>
      isOpenAdvisoryItem(item)
        ? [
            {
              id: `service-advisory-${record.id}-${item?.key || index}`,
              title: item?.title || "Service advisory",
              details: item?.details || item?.note || "Amber service item recorded.",
              asset: getVehicleText(record) || "Unknown vehicle",
              date: getRecordDate(record),
              route: record.id ? `/service/service-record/${record.id}` : null,
              sourceCollection: "serviceRecords",
              sourceId: record.id,
              itemKey: item?.key || "",
              itemIndex: index,
            },
          ]
        : []
    );
  });

  const inspections = equipmentInspections.flatMap((record) => {
    const report = Array.isArray(record?.monitorReport) ? record.monitorReport : [];
    return report.flatMap((item, index) =>
      isOpenAdvisoryItem(item)
        ? [
            {
              id: `inspection-advisory-${record.id}-${item?.key || index}`,
              title: item?.title || "Equipment advisory",
              details: item?.details || item?.note || "Amber inspection item recorded.",
              asset: getEquipmentText(record) || "Unknown equipment",
              date: getRecordDate(record),
              route: record.id ? `/service/inspections/inspection-form/${record.id}` : null,
              sourceCollection: "equipmentInspections",
              sourceId: record.id,
              itemKey: item?.key || "",
              itemIndex: index,
            },
          ]
        : []
    );
  });

  return [...services, ...inspections].sort(
    (a, b) => (toDateMaybe(b.date)?.getTime() || 0) - (toDateMaybe(a.date)?.getTime() || 0)
  );
}

export default function ServiceIssuesScreen() {
  const router = useRouter();
  const { patchServiceRow } = useServiceCacheActions();
  const [resolvingId, setResolvingId] = useState(null);
  const [locallyResolvedIds, setLocallyResolvedIds] = useState(new Set());

  const checksResource = useServiceCollection("vehicleChecks");
  const issuesResource = useServiceCollection("vehicleIssues");
  const reportsResource = useServiceCollection("defectReports");
  const servicesResource = useServiceCollection("serviceRecords");
  const inspectionsResource = useServiceCollection("equipmentInspections");
  const resources = [checksResource, issuesResource, reportsResource, servicesResource, inspectionsResource];
  const state = getServiceOverviewState(resources);
  const retry = () => Promise.all(resources.map((resource) => resource.refresh()));
  const vehicleChecks = checksResource.rows;
  const vehicleIssues = issuesResource.rows;
  const defectReports = reportsResource.rows;
  const serviceRecords = servicesResource.rows;
  const equipmentInspections = inspectionsResource.rows;

  const defects = useMemo(
    () => buildOpenDefects({ vehicleChecks, vehicleIssues, defectReports }),
    [defectReports, vehicleChecks, vehicleIssues]
  );

  const advisories = useMemo(
    () => buildAdvisories({ serviceRecords, equipmentInspections }),
    [equipmentInspections, serviceRecords]
  );
  const visibleAdvisories = useMemo(
    () => advisories.filter((item) => !locallyResolvedIds.has(item.id)),
    [advisories, locallyResolvedIds]
  );

  const markAdvisoryFixed = async (item) => {
    if (!item?.sourceCollection || !item?.sourceId) return;

    setResolvingId(item.id);
    try {
      const sourceRows =
        item.sourceCollection === "serviceRecords"
          ? serviceRecords
          : equipmentInspections;
      const sourceRecord = sourceRows.find(
        (record) => String(record.id) === String(item.sourceId)
      );
      const { nextItems, changed } = resolveMonitorReportItem(
        sourceRecord?.monitorReport,
        {
          itemKey: item.itemKey,
          itemIndex: item.itemIndex,
          nowISO: new Date().toISOString(),
        }
      );

      if (!changed) {
        Alert.alert("Not found", "This advisory could not be found on the source record.");
        return;
      }

      const updateData = {
        monitorReport: nextItems,
        updatedAt: serverTimestamp(),
      };
      const { queued } = await runOrQueueFirestoreMutations([
        {
          run: () =>
            updateDoc(doc(db, item.sourceCollection, String(item.sourceId)), updateData),
          mutation: {
            operation: "update",
            docPath: `${item.sourceCollection}/${item.sourceId}`,
            data: updateData,
            entityType:
              item.sourceCollection === "serviceRecords"
                ? "serviceRecord"
                : "equipmentInspection",
            entityId: String(item.sourceId),
          },
        },
      ]);
      await patchServiceRow(item.sourceCollection, item.sourceId, updateData);

      setLocallyResolvedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });

      Alert.alert(
        queued ? "Saved offline" : "Marked fixed",
        queued
          ? "This advisory will be closed when the app syncs."
          : "This advisory has been removed from the open advisory list."
      );
    } catch (err) {
      console.error("Failed to mark advisory fixed:", err);
      Alert.alert("Error", "Could not mark this advisory fixed.");
    } finally {
      setResolvingId(null);
    }
  };

  const confirmMarkAdvisoryFixed = (item) => {
    Alert.alert(
      "Mark advisory fixed?",
      "This will close the amber monitor item and remove it from open advisory counts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark fixed",
          onPress: () => markAdvisoryFixed(item),
        },
      ]
    );
  };

  return <ServiceIssuesView state={state} retry={retry} defects={defects} advisories={visibleAdvisories} onOpen={(route) => { if (route) router.push(route); }} onResolve={confirmMarkAdvisoryFixed} resolvingId={resolvingId} />;
}

export function ServiceIssuesView({ state, retry, defects, advisories, onOpen, onResolve, resolvingId }) {
  const { colors } = useTheme();
  return (
    <PageShell
      header={{
        variant: "compact",
        eyebrow: "Workshop",
        title: "Issues",
        subtitle: "Open defects and amber advisories needing workshop attention.",
      }}
    >
      {state === "error" ? <StateView state="error" title="Couldn’t load issues" actionLabel="Retry issues" onAction={retry} /> : state === "loading" ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent || COLORS.primaryAction} />
          <Text tone={"muted"} style={[styles.loadingText]}>
            Loading issues...
          </Text>
        </View>
      ) : (
        <View style={styles.contentStack}>
          {state === "partial" ? <Banner tone="warning" title="Issue data is incomplete"><AppButton label="Retry issues" variant="secondary" onPress={retry} /></Banner> : null}
          <IssueSection
            title="Defects & Issues"
            subtitle="Red/open items that need repair or investigation."
            emptyText="No open defects."
            items={defects}
            icon="alert-triangle"
            tone="red"
            colors={colors}
            onOpen={onOpen}
          />

          <IssueSection
            title="Advisories"
            subtitle="Amber items to monitor before they become defects."
            emptyText="No amber advisories."
            items={advisories}
            icon="eye"
            tone="amber"
            colors={colors}
            onOpen={onOpen}
            onResolve={onResolve}
            resolvingId={resolvingId}
          />

        </View>
      )}
    </PageShell>
  );
}

function IssueSection({
  title,
  subtitle,
  emptyText,
  items,
  icon,
  tone,
  colors,
  onOpen,
  onResolve,
  resolvingId,
}) {
  const { colorScheme } = useTheme();
  const palette = getServiceStatusColors(tone === "red" ? "danger" : "warning", colorScheme);
  const badgeColor = palette.background;
  const iconColor = palette.onBackground;
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const toggleGroup = (groupKey) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            {title}
          </Text>
          <Text tone={"muted"} style={[styles.sectionSubtitle]}>
            {subtitle}
          </Text>
        </View>
        <Text tone={"muted"} style={[styles.sectionCount]}>
          {items.length}
        </Text>
      </View>

      {items.length === 0 ? (
        <SectionCard
          tone="subtle" layoutStyle={styles.emptyCard}
        >
          <Text tone={"muted"} style={[styles.emptyText]}>
            {emptyText}
          </Text>
        </SectionCard>
      ) : (
        groupServiceIssuesByAsset(items).map((group) =>
          group.items.length > 1 ? (
            <View key={group.key} style={styles.vehicleGroup}>
              <View style={styles.vehicleGroupHeader}>
                <Icon name="truck" size={t.iconSize.sm} color={colors.textMuted || COLORS.textMid} />
                <Text tone={"primary"} style={[styles.vehicleGroupTitle]}> 
                  {group.asset}
                </Text>
                <Text tone={"muted"} style={[styles.vehicleGroupCount]}> 
                  {group.items.length} items
                </Text>
              </View>
              <SectionCard
                tone="subtle" layoutStyle={styles.groupedIssueList}
              >
                {(expandedGroups.has(group.key) ? group.items : group.items.slice(0, 3)).map((item, index) => (
                  <GroupedIssueRow
                    key={item.id}
                    item={item}
                    icon={icon}
                    badgeColor={badgeColor}
                    iconColor={iconColor}
                    colors={colors}
                    onOpen={onOpen}
                    onResolve={onResolve}
                    isResolving={resolvingId === item.id}
                    showDivider={index > 0}
                  />
                ))}
                {group.items.length > 3 ? (
                  <TouchableOpacity
                    style={[styles.groupToggle, { borderTopColor: colors.border || COLORS.border }]}
                    onPress={() => toggleGroup(group.key)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={expandedGroups.has(group.key) ? `Show fewer ${group.asset} items` : `Show all ${group.asset} items`}
                  >
                    <Text tone={"link"} style={[styles.groupToggleText]}> 
                      {expandedGroups.has(group.key)
                        ? "Show less"
                        : `Show ${group.items.length - 3} more`}
                    </Text>
                    <Icon
                      name={expandedGroups.has(group.key) ? "chevron-up" : "chevron-down"}
                      size={t.iconSize.sm}
                      color={colors.link || colors.accent}
                    />
                  </TouchableOpacity>
                ) : null}
              </SectionCard>
            </View>
          ) : (
            <IssueCard
              key={group.items[0].id}
              item={group.items[0]}
              icon={icon}
              badgeColor={badgeColor}
              iconColor={iconColor}
              colors={colors}
              onOpen={onOpen}
              onResolve={onResolve}
              isResolving={resolvingId === group.items[0].id}
            />
          )
        )
      )}
    </View>
  );
}

function GroupedIssueRow({
  item,
  icon,
  badgeColor,
  iconColor,
  colors,
  onOpen,
  onResolve,
  isResolving,
  showDivider,
}) {
  const canResolve = typeof onResolve === "function";
  const CardShell = item.route ? TouchableOpacity : View;
  const cardProps = item.route
    ? {
        activeOpacity: 0.85,
        onPress: () => onOpen(item.route),
        accessibilityRole: "button",
        accessibilityLabel: `Open ${item.title}`,
      }
    : {};

  return (
    <CardShell
      testID={`issue-${item.id}`}
      style={[
        styles.groupedIssueRow,
        showDivider && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border || COLORS.border,
        },
      ]}
      {...cardProps}
    >
      <View style={[styles.groupedIssueIcon, { backgroundColor: badgeColor }]}> 
        <Icon name={icon} size={t.iconSize.xs} color={iconColor} />
      </View>
      <View style={styles.groupedIssueCopy}>
        <Text tone={"primary"} style={[styles.groupedIssueTitle]}> 
          {item.title}
        </Text>
        <View style={styles.groupedIssueMeta}>
          <Text numberOfLines={1} tone={"muted"} style={[styles.groupedIssueDetail]}> 
            {item.details}
          </Text>
          <Text tone={"muted"} style={[styles.issueDate]}> 
            {formatDate(item.date)}
          </Text>
          {!!item.route ? (
            <Icon name="arrow-up-right" size={t.iconSize.xs} color={colors.textMuted || COLORS.textMid} />
          ) : null}
        </View>
      </View>
      {canResolve ? (
        <TouchableOpacity
          style={[styles.compactResolveButton, { borderColor: colors.success || routeColors.hex_157347_a4inet }]}
          activeOpacity={0.8}
          disabled={isResolving}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.title} fixed`}
          accessibilityState={{ disabled: Boolean(isResolving), busy: Boolean(isResolving) }}
          onPress={(event) => {
            event?.stopPropagation?.();
            onResolve(item);
          }}
        >
          <Icon
            name={isResolving ? "loader" : "check"}
            size={t.iconSize.sm}
            color={colors.success || routeColors.hex_157347_a4inet}
          />
        </TouchableOpacity>
      ) : null}
    </CardShell>
  );
}

function IssueCard({
  item,
  icon,
  badgeColor,
  iconColor,
  colors,
  onOpen,
  onResolve,
  isResolving,
  showAsset = true,
}) {
  const CardShell = item.route ? TouchableOpacity : View;
  const cardProps = item.route
    ? {
        activeOpacity: 0.85,
        onPress: () => onOpen(item.route),
        accessibilityRole: "button",
        accessibilityLabel: `Open ${item.title}`,
      }
    : {};
  const canResolve = typeof onResolve === "function";

  return (
    <CardShell
      testID={`issue-${item.id}`}
      style={[
        styles.issueCard,
        {
          backgroundColor: colors.surfaceAlt || COLORS.card,
          borderColor: colors.border || COLORS.border,
        },
      ]}
      {...cardProps}
    >
      <View style={[styles.iconWrap, { backgroundColor: badgeColor }]}> 
        <Icon name={icon} size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text tone={"primary"} style={[styles.issueTitle]}> 
          {item.title}
        </Text>
        <View style={styles.issueMetaRow}>
          {showAsset ? (
            <Text
              tone={"muted"} style={[styles.assetText]}
            > 
              {item.asset}
            </Text>
          ) : (
            <View style={styles.assetSpacer} />
          )}
          <View style={styles.issueMetaAction}>
            <Text tone={"muted"} style={[styles.issueDate]}> 
              {formatDate(item.date)}
            </Text>
            {!!item.route && (
              <Icon name="arrow-up-right" size={t.iconSize.xs} color={colors.textMuted || COLORS.textMid} />
            )}
          </View>
        </View>
        <Text tone={"muted"} style={[styles.detailText]}> 
          {item.details}
        </Text>
        {canResolve && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.resolveButton,
                { borderColor: colors.success || routeColors.hex_157347_a4inet },
              ]}
              activeOpacity={0.85}
              disabled={isResolving}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${item.title} fixed`}
              accessibilityState={{ disabled: Boolean(isResolving), busy: Boolean(isResolving) }}
              onPress={(event) => {
                event?.stopPropagation?.();
                onResolve(item);
              }}
            >
              <Icon name="check-circle" size={13} color={colors.success || routeColors.hex_157347_a4inet} />
              <Text tone={"success"} style={[styles.actionText]}> 
                {isResolving ? "Saving..." : "Mark fixed"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </CardShell>
  );
}
