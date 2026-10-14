import { styles } from "../../../../lib/design/screenStyles/service-inspections-index-js.js";
import { AppText as Text, AppPressable as TouchableOpacity } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
// app/(protected)/service/inspections/index.js
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { useServiceCollection } from "../../../../hooks/useServiceData";
import { useTheme } from "../../../../providers/ThemeProvider";
import { designTokens as t } from "../../../../lib/design/tokens";
import PageShell from "../../../../components/layout/PageShell";

function formatDate(raw) {
  if (!raw) return "—";
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InspectionsScreen() {
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  const { rows: inspections, loading } = useServiceCollection(
    "equipmentInspections",
    {
      label: "equipment inspections",
      orderByField: "createdAt",
      orderDirection: "desc",
    }
  );

  const handleNew = () => {
    router.push(`/service/inspections/inspection-form/new-${Date.now()}`);
  };

  return (
    <PageShell customHeader={<View
        style={[
          styles.header,
          { borderBottomColor: colors.border || COLORS.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text
            tone={"primary"} style={[styles.pageTitle]}
          >
            Equipment Inspections
          </Text>
          <Text
            tone={"muted"} style={[
              styles.pageSubtitle,
            ]}
          >
            Pre-use and periodic equipment condition checks.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newButton}
          onPress={handleNew}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={18} color={COLORS.textHigh} />
          <Text style={styles.newButtonText}>New</Text>
        </TouchableOpacity>
      </View>} customHeaderPlacement="fixed">
      {/* HEADER */}
      

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryAction} />
        </View>
      ) : (
        <>
          {inspections.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                name="clipboard"
                size={36}
                color={colors.textMuted || COLORS.textLow}
              />
              <Text
                tone={"primary"} style={[
                  styles.emptyTitle,
                ]}
              >
                No inspections yet
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.emptySubtitle,
                ]}
              >
                Tap New to record your first equipment inspection.
              </Text>
            </View>
          ) : (
            inspections.map((insp) => {
              const statusKey =
                insp.overallResult === "pass"
                  ? "pass"
                  : insp.overallResult === "fail"
                  ? "fail"
                  : "incomplete";
              const sc = getServiceStatusColors({ pass: "success", fail: "danger", incomplete: "warning" }[statusKey], colorScheme);

              return (
                <TouchableOpacity
                  key={insp.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surfaceAlt || COLORS.card,
                      borderColor: colors.border || COLORS.border,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push(
                      `/service/inspections/inspection-form/${insp.id}`
                    )
                  }
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text
                        tone={"primary"} style={[
                          styles.cardTitle,
                        ]}
                        numberOfLines={1}
                      >
                        {insp.equipmentName || "Unnamed equipment"}
                      </Text>
                      {!!insp.equipmentId && (
                        <Text
                          tone={"muted"} style={[
                            styles.cardSub,
                          ]}
                        >
                          ID: {insp.equipmentId}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: sc.background }]}>
                      <Text style={[styles.statusPillText, { color: sc.onBackground }]}>
                        {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Icon
                        name="calendar"
                        size={12}
                        color={colors.textMuted || COLORS.textLow}
                        style={{ marginRight: t.spacing.xxs }}
                      />
                      <Text
                        tone={"muted"} style={[
                          styles.metaText,
                        ]}
                      >
                        {formatDate(insp.createdAt)}
                      </Text>
                    </View>
                    {!!insp.inspectedBy && (
                      <View style={styles.metaItem}>
                        <Icon
                          name="user"
                          size={12}
                          color={colors.textMuted || COLORS.textLow}
                          style={{ marginRight: t.spacing.xxs }}
                        />
                        <Text
                          tone={"muted"} style={[
                            styles.metaText,
                          ]}
                        >
                          {insp.inspectedBy}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Icon
                    name="chevron-right"
                    size={16}
                    color={colors.textMuted || COLORS.textLow}
                    style={styles.cardChevron}
                  />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </>
      )}
    </PageShell>
  );
}
