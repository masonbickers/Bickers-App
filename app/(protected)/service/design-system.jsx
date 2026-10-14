import ControlAlignmentFixture from "../../../components/dev/ControlAlignmentFixture";
import TimeChoiceFixture from "../../../components/dev/TimeChoiceFixture";
import DocumentSurfacesFixture from "../../../components/dev/DocumentSurfacesFixture";
import WorkshopChecklistRowsFixture from "../../../components/dev/WorkshopChecklistRowsFixture";
import RecordDetailsFixture from "../../../components/dev/RecordDetailsFixture";
import ServiceChecklistFixture from "../../../components/dev/ServiceChecklistFixture";
import RestoredDashboardFixture from "../../../components/dev/RestoredDashboardFixture";
import RestoredSettingsFixture from "../../../components/dev/RestoredSettingsFixture";
import RestoredWorkshopFixture from "../../../components/dev/RestoredWorkshopFixture";
import RestoredLandingFixture from "../../../components/dev/RestoredLandingFixture";
import RestoredIssuesFixture from "../../../components/dev/RestoredIssuesFixture";
import RestoredServiceFixtures from "../../../components/dev/RestoredServiceFixtures";
import { useLocalSearchParams } from "expo-router";

import { DesignSystemVisualFixture } from "../../../components/dev/DesignSystemVisualFixtures";
import PageShell from "../../../components/layout/PageShell";
import { ThemeProvider } from "../../../providers/ThemeProvider";

const SERVICE_SCENARIOS = new Set(["service-list", "service-form", "layout-stress", "asset-selector"]);

export default function ServiceDesignSystemShowcase() {
  const params = useLocalSearchParams();
  const requested = Array.isArray(params.scenario) ? params.scenario[0] : params.scenario;
  const requestedTheme = Array.isArray(params.theme) ? params.theme[0] : params.theme;
  const scenario = SERVICE_SCENARIOS.has(requested) ? requested : "service-list";
  const forcedTheme = requestedTheme === "dark" ? "dark" : "light";

  if (requested === "control-alignment") return <ThemeProvider forcedTheme={forcedTheme}><ControlAlignmentFixture /></ThemeProvider>;

  if (requested === "time-choice") return <ThemeProvider forcedTheme={forcedTheme}><TimeChoiceFixture /></ThemeProvider>;

  if (requested === "document-surfaces") return <ThemeProvider forcedTheme={forcedTheme}><DocumentSurfacesFixture /></ThemeProvider>;

  if (requested === "record-details") return <ThemeProvider forcedTheme={forcedTheme}><RecordDetailsFixture /></ThemeProvider>;

  if (requested === "workshop-checklist") return <ThemeProvider forcedTheme={forcedTheme}><WorkshopChecklistRowsFixture kind={params.kind} /></ThemeProvider>;

  if (requested === "service-checklist") return <ThemeProvider forcedTheme={forcedTheme}><ServiceChecklistFixture /></ThemeProvider>;

  if (requested === "restored-dashboard") return <ThemeProvider forcedTheme={forcedTheme}><RestoredDashboardFixture initialState={params.state} /></ThemeProvider>;

  if (requested === "restored-settings") return <ThemeProvider forcedTheme={forcedTheme}><RestoredSettingsFixture /></ThemeProvider>;

  if (requested === "restored-workshop") return <ThemeProvider forcedTheme={forcedTheme}><RestoredWorkshopFixture initialState={params.state} /></ThemeProvider>;

  if (requested === "restored-landing") return <ThemeProvider forcedTheme={forcedTheme}><RestoredLandingFixture initialState={params.state} /></ThemeProvider>;

  if (requested === "restored-issues") return <ThemeProvider forcedTheme={forcedTheme}><RestoredIssuesFixture initialState={params.state} /></ThemeProvider>;

  if (requested === "restored-equipment" || requested === "restored-fleet") return <ThemeProvider forcedTheme={forcedTheme}><RestoredServiceFixtures kind={requested === "restored-equipment" ? "equipment" : "fleet"} initialState={params.state === "error" ? "error" : "ready"} /></ThemeProvider>;

  return (
    <ThemeProvider forcedTheme={forcedTheme}>
      <PageShell
        contentSpacing="compact"
        header={{
          variant: "compact",
          eyebrow: "Development · Workshop",
          title: scenario === "asset-selector" ? "Asset selector" : scenario === "service-form" ? "Workshop form" : "Workshop list",
          subtitle: "Deterministic compact-density visual fixture",
        }}
      >
        <DesignSystemVisualFixture scenario={scenario} />
      </PageShell>
    </ThemeProvider>
  );
}
