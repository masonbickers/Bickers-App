import { routeColors } from "../../../lib/design/routePresentation/service-defects-js.js";
import { styles } from "../../../lib/design/screenStyles/service-defects-js.js";
import { AppText as Text, AppPressable as TouchableOpacity } from "../../../components/ui/AppPrimitives";

// app/(protected)/service/defects.jsx
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { designTokens as t } from "../../../lib/design/tokens";
import { useServiceCollection } from "../../../hooks/useServiceData";
import { isReportableCheckDefect } from "../../../lib/dailyVehicleCheck";
import {
  getVehicleDisplayName,
  getVehicleRegistration,
} from "../../../lib/fleetSchema";
import { useTheme } from "../../../providers/ThemeProvider";
import PageShell from "../../../components/layout/PageShell";

/* ---------- DEFECT HELPERS ---------- */

function normaliseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isApprovedDefect(review) {
  const status = normaliseKey(review?.status);
  const category = normaliseKey(review?.category);
  return (
    status === "approved" &&
    (category === "general" || category === "immediate")
  );
}

function isOpenMaintenance(status) {
  const value = normaliseKey(status);
  return value !== "resolved" && value !== "complete" && value !== "completed";
}

function buildDefectRouteId(source, docId, itemIndex = "") {
  return encodeURIComponent([source, docId, itemIndex].join("|"));
}

function getDateValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getVehicleLabel(record) {
  return (
    record?.vehicle ||
    record?.vehicleName ||
    record?.name ||
    record?.registration ||
    record?.reg ||
    "Unknown vehicle"
  );
}

function getIssueAssetLabel(issue) {
  if (issue?.assetType !== "equipment") return getVehicleLabel(issue);
  return (
    [issue?.equipmentName || issue?.assetName, issue?.serialNumber || issue?.equipmentId]
      .filter(Boolean)
      .join(" · ") || "Unknown equipment"
  );
}

function cleanRegistration(value) {
  const text = String(value || "").trim();
  return text && text.toLowerCase() !== "n/a" ? text : "";
}

function findVehicleForDefect(defect, vehicles) {
  if (defect.vehicleId) {
    const byId = vehicles.find((v) => v.id === defect.vehicleId);
    if (byId) return byId;
  }

  const defectVehicle = normaliseKey(defect.vehicleName);
  const defectReg = normaliseKey(defect.registration);

  return vehicles.find((v) => {
    const names = [
      v.name,
      v.vehicleName,
      v.vehicle,
      v.registration,
      v.reg,
    ].map(normaliseKey);
    return names.includes(defectVehicle) || (!!defectReg && names.includes(defectReg));
  });
}

function buildApprovedCheckDefects(checkDocs) {
  return checkDocs.flatMap((check) => {
    const items = Array.isArray(check.items) ? check.items : [];

    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => isReportableCheckDefect(check, item))
      .filter(({ item }) => isOpenMaintenance(item?.maintenance?.status))
      .map(({ item, index }) => {
        const label = item?.label || item?.title || item?.category || "Vehicle check";
        const note = item?.note || item?.description || "";
        const text = note ? `${label}: ${note}` : label;

        return {
          id: `${check.id}-${index}`,
          routeId: buildDefectRouteId("vehicleChecks", check.id, index),
          source: "vehicleChecks",
          docId: check.id,
          itemIndex: index,
          category: item.assessment === "dangerous" ? "immediate" : normaliseKey(item?.review?.category) || "general",
          text,
          vehicleId: check.vehicleId || check.vehicleDocId || null,
          vehicleName: getVehicleLabel(check),
          registration: check.registration || check.reg || "",
          reporter: check.driverName || check.reporterName || "",
          jobNumber: check.jobNumber || "",
          dateValue: getDateValue(check.dateISO || check.createdAt || check.date),
          maintenanceStatus: item?.maintenance?.status || "",
        };
      });
  });
}

function buildApprovedIssueDefects(issueDocs) {
  return issueDocs
    .filter((issue) => isApprovedDefect(issue?.review))
    .filter((issue) => isOpenMaintenance(issue?.maintenance?.status))
    .map((issue) => {
      const category = issue.category || issue.title || "Issue";
      const description = issue.description || issue.note || issue.summary || "";
      const text = description ? `${category}: ${description}` : category;

      return {
        id: issue.id,
        routeId: buildDefectRouteId("vehicleIssues", issue.id),
        source: "vehicleIssues",
        docId: issue.id,
        category: normaliseKey(issue.review.category),
        text,
        assetType: issue.assetType || "vehicle",
        vehicleId:
          issue.assetType === "equipment"
            ? null
            : issue.vehicleId || issue.vehicleDocId || null,
        vehicleName: getIssueAssetLabel(issue),
        registration:
          issue.assetType === "equipment"
            ? issue.serialNumber || issue.equipmentId || issue.asset || ""
            : issue.registration || issue.reg || "",
        reporter: issue.reporterName || issue.driverName || "",
        jobNumber: issue.jobNumber || "",
        dateValue: getDateValue(issue.createdAt || issue.dateISO || issue.date),
        maintenanceStatus: issue?.maintenance?.status || "",
      };
    });
}

function buildManualDefectReports(reports) {
  return reports
    .filter((report) => isOpenMaintenance(report?.status))
    .map((report) => {
      const severity = normaliseKey(report.severity);
      const priority = normaliseKey(report.priority);
      const isImmediate =
        severity === "immediate" || priority === "high" || !!report.offRoad;
      const title = report.category || report.title || report.severity || "Defect report";
      const description = report.description || report.note || report.summary || "";
      const text = description ? `${title}: ${description}` : title;

      return {
        id: report.id,
        routeId: buildDefectRouteId("defectReports", report.id),
        source: "defectReports",
        docId: report.id,
        category: isImmediate ? "immediate" : "general",
        text,
        vehicleId: report.vehicleId || report.vehicleDocId || null,
        vehicleName: getVehicleLabel(report),
        registration: report.registration || report.reg || "",
        reporter: report.reportedBy || report.reporterName || report.driverName || "",
        jobNumber: report.jobNumber || "",
        dateValue: getDateValue(report.createdAt || report.dateISO || report.date),
        maintenanceStatus: report.status || "open",
      };
    });
}

/* ---------- MAIN SCREEN ---------- */

export default function DefectsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const mutedColor = colors.textMuted;
  const cardBg = colors.surfaceAlt;
  const borderColor = colors.border;
  const dangerColor = colors.danger || colors.accent;
  const warningColor = colors.warning || routeColors.hex_ffcc00_5c6g4m;

  const { rows: vehicles, loading: vehiclesLoading } = useServiceCollection("vehicles", {
    label: "vehicles for defects",
    orderByField: "name",
  });
  const { rows: vehicleChecks, loading: checksLoading } = useServiceCollection(
    "vehicleChecks",
    { label: "approved vehicle checks" }
  );
  const { rows: vehicleIssues, loading: issuesLoading } = useServiceCollection(
    "vehicleIssues",
    { label: "approved vehicle issues" }
  );
  const { rows: defectReports, loading: reportsLoading } = useServiceCollection(
    "defectReports",
    { label: "manual defect reports" }
  );
  const loading = vehiclesLoading || checksLoading || issuesLoading || reportsLoading;

  // Attach approved split defects per vehicle/source.
  const withDefects = useMemo(() => {
    const approvedDefects = [
      ...buildApprovedCheckDefects(vehicleChecks),
      ...buildApprovedIssueDefects(vehicleIssues),
      ...buildManualDefectReports(defectReports),
    ].sort((a, b) => b.dateValue - a.dateValue);

    const grouped = new Map();

    approvedDefects.forEach((defect) => {
      const matchedVehicle = findVehicleForDefect(defect, vehicles);
      const embeddedVehicle =
        defect.vehicleName && defect.vehicleName !== defect.vehicleId
          ? { vehicleName: defect.vehicleName, registration: defect.registration }
          : {};
      const vehicleName = getVehicleDisplayName(
        matchedVehicle || embeddedVehicle,
        vehicles
      );
      const registration =
        cleanRegistration(
          getVehicleRegistration(matchedVehicle || embeddedVehicle) || ""
        );
      const groupKey =
        matchedVehicle?.id ||
        defect.vehicleId ||
        normaliseKey(`${vehicleName}-${registration}`) ||
        defect.id;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          id: groupKey,
          vehicleId: matchedVehicle?.id || defect.vehicleId || null,
          name: vehicleName,
          vehicleName,
          reg: registration,
          registration,
          immediateDefects: [],
          generalDefects: [],
          totalDefects: 0,
        });
      }

      const group = grouped.get(groupKey);
      if (defect.category === "immediate") {
        group.immediateDefects.push(defect);
      } else {
        group.generalDefects.push(defect);
      }
      group.totalDefects += 1;
    });

    return Array.from(grouped.values());
  }, [defectReports, vehicleChecks, vehicleIssues, vehicles]);

  const immediateVehicles = useMemo(
    () => withDefects.filter((v) => v.immediateDefects.length > 0),
    [withDefects]
  );

  const generalVehicles = useMemo(
    () => withDefects.filter((v) => v.generalDefects.length > 0),
    [withDefects]
  );

  const totalImmediate = immediateVehicles.reduce(
    (sum, v) => sum + v.immediateDefects.length,
    0
  );
  const totalGeneral = generalVehicles.reduce(
    (sum, v) => sum + v.generalDefects.length,
    0
  );

  const goDefect = (routeId) => {
    router.push(`/service/defects/${routeId}`);
  };

  return (
    <PageShell header={{
      variant: "compact",
      title: "Defects & Issues",
      subtitle: "Split into immediate maintenance and general follow-up.",
      onBack: router.back,
    }}>


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : withDefects.length === 0 ? (
        <View style={styles.emptyOuter}>
          <Icon
            name="check-circle"
            size={32}
            color={colors.textMuted}
          />
          <Text
            tone={"primary"} style={[
              styles.emptyTitle,
            ]}
          >
            No defects logged
          </Text>
          <Text
            tone={"muted"} style={[
              styles.emptySubtitle,
            ]}
          >
            Approved general and immediate defects from vehicle checks and
            vehicle issues will appear here automatically.
          </Text>
        </View>
      ) : (
        <>
          {/* SUMMARY CARD */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryPill}>
              <View
                style={[styles.summaryDot, { backgroundColor: routeColors.hex_ed1c25_4py4qa }]}
              />
              <Text style={styles.summaryText}>
                {totalImmediate} immediate
              </Text>
            </View>
            <View style={styles.summaryPill}>
              <View
                style={[styles.summaryDot, { backgroundColor: routeColors.hex_ffcc00_5c6g4m }]}
              />
              <Text style={styles.summaryText}>
                {totalGeneral} general
              </Text>
            </View>
          </View>

          {/* IMMEDIATE SECTION */}
          {immediateVehicles.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text tone={"primary"} style={[styles.sectionTitle]}>
                  Immediate maintenance
                </Text>
                <Text tone={"muted"} style={[styles.sectionHint]}>
                  Safety-critical / do not delay.
                </Text>
              </View>

              {immediateVehicles.map((v) => {
                const name = v.name || v.vehicleName || "Unnamed vehicle";
                const reg = cleanRegistration(v.reg || v.registration);
                const immediate = v.immediateDefects;
                const general = v.generalDefects;

                return (
                  <View
                    key={v.id}
                    style={[
                      styles.card,
                      {
                        borderColor,
                        backgroundColor: cardBg,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text tone={"primary"} style={[styles.cardTitle]}>{name}</Text>
                        {!!reg && (
                          <Text tone={"muted"} style={[styles.cardReg]}>{reg}</Text>
                        )}
                        <Text tone={"danger"} style={[styles.countImmediate]}>
                          {immediate.length} immediate issue
                          {immediate.length > 1 ? "s" : ""} ·{" "}
                          {v.totalDefects} total
                        </Text>
                      </View>
                      <View style={[styles.badgeImmediate, { borderColor: dangerColor }]}>
                        <Text tone={"danger"} style={[styles.badgeText]}>Immediate</Text>
                      </View>
                    </View>

                    {immediate.slice(0, 3).map((defect) => (
                      <TouchableOpacity
                        key={defect.id}
                        style={styles.defectRow}
                        onPress={() => goDefect(defect.routeId)}
                        activeOpacity={0.75}
                      >
                        <Icon
                          name="alert-triangle"
                          size={14}
                          color={dangerColor}
                          style={{ marginRight: t.spacing.xxs }}
                        />
                        <Text tone={"primary"} style={[styles.defectText]}>{defect.text}</Text>
                        <Icon name="chevron-right" size={14} color={mutedColor} />
                      </TouchableOpacity>
                    ))}

                    {general.length > 0 && (
                      <View style={{ marginTop: t.spacing.xxs }}>
                        <Text tone={"muted"} style={[styles.subSectionLabel]}>
                          Related general issue{general.length > 1 ? "s" : ""}
                        </Text>
                        {general.slice(0, 2).map((defect) => (
                          <TouchableOpacity
                            key={defect.id}
                            style={[styles.defectRow, { marginTop: t.spacing.none }]}
                            onPress={() => goDefect(defect.routeId)}
                            activeOpacity={0.75}
                          >
                            <Icon
                              name="minus-circle"
                              size={13}
                              color={warningColor}
                              style={{ marginRight: t.spacing.xxs }}
                            />
                            <Text tone={"primary"} style={[styles.defectText]}>{defect.text}</Text>
                            <Icon name="chevron-right" size={14} color={mutedColor} />
                          </TouchableOpacity>
                        ))}
                        {general.length > 2 && (
                          <Text tone={"muted"} style={[styles.moreText]}>
                            + {general.length - 2} more…
                          </Text>
                        )}
                      </View>
                    )}

                    {immediate.length > 3 && general.length === 0 && (
                      <Text tone={"muted"} style={[styles.moreText]}>
                        + {immediate.length - 3} more…
                      </Text>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* GENERAL SECTION */}
          {generalVehicles.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text tone={"primary"} style={[styles.sectionTitle]}>
                  General defects & follow-up
                </Text>
                <Text tone={"muted"} style={[styles.sectionHint]}>
                  Plan into future workshop slots.
                </Text>
              </View>

              {generalVehicles.map((v) => {
                const name = v.name || v.vehicleName || "Unnamed vehicle";
                const reg = cleanRegistration(v.reg || v.registration);
                const general = v.generalDefects;

                return (
                  <View
                    key={v.id}
                    style={[
                      styles.card,
                      {
                        borderColor,
                        backgroundColor: cardBg,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text tone={"primary"} style={[styles.cardTitle]}>{name}</Text>
                        {!!reg && (
                          <Text tone={"muted"} style={[styles.cardReg]}>{reg}</Text>
                        )}
                        <Text tone={"muted"} style={[styles.countGeneral]}>
                          {general.length} general issue
                          {general.length > 1 ? "s" : ""} open
                        </Text>
                      </View>
                      <View style={[styles.badgeGeneral, { borderColor: warningColor }]}>
                        <Text tone={"warning"} style={[styles.badgeText]}>General</Text>
                      </View>
                    </View>

                    {general.slice(0, 3).map((defect) => (
                      <TouchableOpacity
                        key={defect.id}
                        style={styles.defectRow}
                        onPress={() => goDefect(defect.routeId)}
                        activeOpacity={0.75}
                      >
                        <Icon
                          name="minus-circle"
                          size={14}
                          color={warningColor}
                          style={{ marginRight: t.spacing.xxs }}
                        />
                        <Text tone={"primary"} style={[styles.defectText]}>{defect.text}</Text>
                        <Icon name="chevron-right" size={14} color={mutedColor} />
                      </TouchableOpacity>
                    ))}

                    {general.length > 3 && (
                      <Text tone={"muted"} style={[styles.moreText]}>
                        + {general.length - 3} more…
                      </Text>
                    )}
                  </View>
                );
              })}
            </>
          )}

          <View style={{ height: 40 }} />
        </>
      )}
    </PageShell>
  );
}

/* ---------- STYLES ---------- */
