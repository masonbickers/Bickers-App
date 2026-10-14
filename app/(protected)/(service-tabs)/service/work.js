import { routeColors } from "../../../../lib/design/routePresentation/service-tabs-service-work-js.js";
import { cardStyles, styles } from "../../../../lib/design/screenStyles/service-tabs-service-work-js.js";
import { readWorkshopDrafts, WORKSHOP_DRAFT_KEYS } from "../../../../lib/workshopForms";
import { formatISODateDDMMYYYY } from "../../../../lib/dateFormat";
import { AppText as Text, AppPressable as TouchableOpacity, AppButton, Banner, StateView } from "../../../../components/ui/AppPrimitives";
// app/(protected)/service/work.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFocusEffect,
  useRouter } from "expo-router";
import { useCallback,
  useRef, useState } from "react";
import { View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import PageShell from "../../../../components/layout/PageShell";
import { servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
import { designTokens as t } from "../../../../lib/design/tokens";
import { useTheme } from "../../../../providers/ThemeProvider";

const FEATURE_FLAGS = {
  motResultLog: false,
  tyreBrakeCheck: false,
  dailyCheck: false,
};

export default function WorkScreen() {
  const router = useRouter();
  const [serviceDrafts, setServiceDrafts] = useState([]);

  const [draftErrors, setDraftErrors] = useState(0);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const request = useRef(0);
  const loadDrafts = useCallback(async () => {
    const current = ++request.current;
    setDraftsLoading(true);
    const results = await Promise.allSettled(WORKSHOP_DRAFT_KEYS.map((key) => AsyncStorage.getItem(key)));
    const parsed = readWorkshopDrafts(...results.map((result) => result.status === "fulfilled" ? result.value : null));
    if (current !== request.current) return;
    setServiceDrafts(parsed.drafts);
    setDraftErrors(parsed.errors + results.filter((result) => result.status === "rejected").length);
    setDraftsLoading(false);
  }, []);
  useFocusEffect(useCallback(() => {
    loadDrafts();
    return () => { request.current += 1; };
  }, [loadDrafts]));

  return <WorkshopFormsView router={router} serviceDrafts={serviceDrafts} draftErrors={draftErrors} draftsLoading={draftsLoading} loadDrafts={loadDrafts} />;
}

export function WorkshopFormsView({ router, serviceDrafts, draftErrors, draftsLoading, loadDrafts }) {
  const { colors } = useTheme();
  const go = (route) => {
    router.push(route);
  };

  // 👉 start a brand-new Service Job Form
  const handleNewServiceJobForm = () => {
    // Keep existing drafts intact; the form autosaves under this unique id.
    const newId = `manual-${Date.now()}`;
    router.push(`/service/service-form/${newId}`);
  };

  // 👉 start a brand-new Minor / Interim Service form
  const handleNewMinorServiceForm = () => {
    const newId = `minor-${Date.now()}`;
    router.push(`/service/minor-service/${newId}`);
  };

  // 👉 start a brand-new MOT Pre-Check form
  const handleNewMotPrecheckForm = () => {
    // Keep existing MOT drafts intact; the form autosaves under this unique id.
    const newId = `mot-${Date.now()}`;
    router.push(`/service/mot-precheck/${newId}`);
  };

  const handleNewEquipmentInspection = () => {
    router.push(`/service/inspections/inspection-form/new-${Date.now()}`);
  };

  return (
    <PageShell
      mode="form"
      width="form"
      contentSpacing="compact"
      header={{
        variant: "compact",
        eyebrow: "Workshop",
        title: "Workshop Forms",
        subtitle: "Templates for servicing, MOT prep, defects and safety checks.",
      }}
    >

      {draftErrors ? <Banner tone="warning" title="Some drafts couldn’t be loaded"><AppButton label="Retry loading drafts" variant="secondary" onPress={loadDrafts} /></Banner> : null}
      {draftsLoading && !serviceDrafts.length ? <StateView compact state="loading" title="Loading saved drafts…" /> : null}
        {/* SECTION: SERVICE FORMS */}
        <View style={styles.sectionDivider}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Service Forms
          </Text>
        </View>

        <FormCard
          icon="tool"
          iconTone="service"
          title="Full Service"
          subtitle="Full service checklist, parts, labour and workshop notes."
          onPress={handleNewServiceJobForm}
          colors={colors}
        />

        <FormCard
          icon="refresh-ccw"
          iconTone="service"
          title="Interim / Minor Service"
          subtitle="Oil, filters and basic safety checks for shorter intervals."
          onPress={handleNewMinorServiceForm}
          colors={colors}
        />

        {serviceDrafts.length > 0 && (
          <View style={styles.draftsWrap}>
            <Text
              tone={"primary"} style={[
                styles.draftsTitle,
              ]}
            >
              Drafts
            </Text>
            {serviceDrafts.map((draft) => (
              <DraftCard
                key={`${draft.type}-${draft.id}`}
                draft={draft}
                onPress={() => router.push(draft.route)}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* SECTION: INSPECTIONS */}
        <View style={styles.sectionDivider}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Inspections
          </Text>
        </View>

        <FormCard
          icon="clipboard"
          iconTone="inspection"
          title="Equipment Inspection"
          subtitle="Pre-use condition check for stunt equipment, rigs and vehicles."
          onPress={handleNewEquipmentInspection}
          colors={colors}
        />

        {/* SECTION: MOT FORMS */}
        <View style={styles.sectionDivider}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            MOT & Compliance
          </Text>
        </View>

        <FormCard
          icon="clipboard"
          iconTone="inspection"
          title="MOT Pre-Check"
          subtitle="Lights, tyres, brakes, washer, emissions prep and advisories."
          onPress={handleNewMotPrecheckForm}
          colors={colors}
        />

        {FEATURE_FLAGS.motResultLog && (
          <FormCard
            icon="file-text"
            iconTone="inspection"
            title="MOT Result / Advisory Log"
            subtitle="Record pass/fail, advisories and next actions."
            onPress={() => go("/service/mot-result")}
            colors={colors}
          />
        )}

        {/* SECTION: DEFECTS / REPAIRS */}
        <View style={styles.sectionDivider}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Defects & Repairs
          </Text>
        </View>

        <FormCard
          icon="alert-triangle"
          iconTone="defect"
          title="Defect Report"
          subtitle="Driver or crew-reported issues that need investigation."
          onPress={() => go("/service/defect-form")}
          colors={colors}
        />

        <FormCard
          icon="tool"
          iconTone="repair"
          title="General Repairs"
          subtitle="Record ad-hoc repairs, rectification work and parts used."
          onPress={() => go("/service/repair-form")}
          colors={colors}
        />

        {(FEATURE_FLAGS.tyreBrakeCheck || FEATURE_FLAGS.dailyCheck) && (
          <>
            {/* SECTION: TYRES / SAFETY CHECKS */}
            <View style={styles.sectionDivider}>
              <Text
                tone={"primary"} style={[
                  styles.sectionTitle,
                ]}
              >
                Tyres & Safety Checks
              </Text>
            </View>

            {FEATURE_FLAGS.tyreBrakeCheck && (
              <FormCard
                icon="target"
                iconTone="inspection"
                title="Tyre & Brake Check"
                subtitle="Depth, wear pattern, pressures, discs & pads condition."
                onPress={() => go("/service/tyre-brake-check")}
                colors={colors}
              />
            )}

            {FEATURE_FLAGS.dailyCheck && (
              <FormCard
                icon="shield"
                iconTone="inspection"
                title="Pre-Shoot / Daily Check"
                subtitle="Fluids, damage, load security and on-set readiness."
                onPress={() => go("/service/daily-check")}
                colors={colors}
              />
            )}
          </>
        )}

    </PageShell>
  );
}

/* ---------- SMALL CARD COMPONENT ---------- */

function FormCard({ icon, iconTone = "service", title, subtitle, onPress, colors }) {
  const { colorScheme } = useTheme();
  const palette = getServiceStatusColors({ service: "info", inspection: "neutral", defect: "danger", repair: "warning" }[iconTone] || "neutral", colorScheme);

  return (
    <TouchableOpacity
      testID={`workshop-form-${iconTone}-${icon}`}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        cardStyles.card,
        {
          borderColor: colors.border || COLORS.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[cardStyles.iconWrap, { backgroundColor: palette.background }]}>
        <Icon testID={`workshop-icon-${title}`} name={icon} size={18} color={palette.onBackground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          tone={"primary"} style={[
            cardStyles.title,
          ]}
        >
          {title}
        </Text>
        <Text
          tone={"muted"} style={[
            cardStyles.subtitle,
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function DraftCard({ draft, onPress, colors }) {
  const { colorScheme } = useTheme();
  const palette = getServiceStatusColors("danger", colorScheme);
  return (
    <TouchableOpacity
      testID={`workshop-draft-${draft.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Resume ${draft.title}`}
      style={[
        cardStyles.draftCard,
        {
          borderColor: colors.primary || COLORS.primaryAction,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[cardStyles.draftIconWrap, { backgroundColor: palette.background }]}>
        <Icon testID={`workshop-icon-${draft.id}`} name="save" size={17} color={palette.onBackground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          tone={"primary"} style={[
            cardStyles.draftTitle,
          ]}
        >
          {draft.title}
          {draft.registration ? ` · ${draft.registration}` : ""}
        </Text>
        <Text
          tone={"muted"} style={[
            cardStyles.draftSubtitle,
          ]}
        >
          {draft.serviceType} · {formatISODateDDMMYYYY(draft.serviceDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ---------- STYLES ---------- */
