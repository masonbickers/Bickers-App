import VehiclePrepRuntimeFixture from "../../components/dev/VehiclePrepRuntimeFixture";
import { useLocalSearchParams } from "expo-router";

import { DesignSystemVisualFixture } from "../../components/dev/DesignSystemVisualFixtures";
import PageShell from "../../components/layout/PageShell";
import { ThemeProvider } from "../../providers/ThemeProvider";
import RestoredNotificationsFixture from "../../components/dev/RestoredNotificationsFixture";
import RestoredContactsFixture from "../../components/dev/RestoredContactsFixture";
import NavigationClearanceFixture from "../../components/dev/NavigationClearanceFixture";
import NativeUIPilotFixture from "../../components/dev/NativeUIPilotFixture";

const EMPLOYEE_SCENARIOS = new Set(["components", "employee-list", "employee-form", "layout-stress"]);

export default function DesignSystemShowcase() {
  const params = useLocalSearchParams();
  const requested = Array.isArray(params.scenario) ? params.scenario[0] : params.scenario;
  const requestedTheme = Array.isArray(params.theme) ? params.theme[0] : params.theme;
  const scenario = EMPLOYEE_SCENARIOS.has(requested) ? requested : "components";
  const forcedTheme = requestedTheme === "dark" ? "dark" : "light";
  if (requested === "shared-prep-runtime" && process.env.EXPO_PUBLIC_VISUAL_TEST_MODE === "1") return <ThemeProvider forcedTheme={forcedTheme}><VehiclePrepRuntimeFixture /></ThemeProvider>;

  if (requested === "native-ui-pilot") return <ThemeProvider forcedTheme={forcedTheme}><PageShell appearance="grouped" header={{ variant: "compact", title: "Native UI pilot" }}><NativeUIPilotFixture key={String(params.run || "default")} refreshOnly={params.control === "refresh"} /></PageShell></ThemeProvider>;

  if (requested === "restored-notifications") return <ThemeProvider forcedTheme={forcedTheme}><RestoredNotificationsFixture initialState={params.state} /></ThemeProvider>;

  if (requested === "restored-contacts") return <ThemeProvider forcedTheme={forcedTheme}><RestoredContactsFixture /></ThemeProvider>;

  if (requested === "navigation-clearance") return <ThemeProvider forcedTheme={forcedTheme}><NavigationClearanceFixture /></ThemeProvider>;

  return (
    <ThemeProvider forcedTheme={forcedTheme}>
      <PageShell
        contentSpacing="standard"
        header={{
          variant: "hero",
          eyebrow: "Development · Employee",
          title: scenario === "components" ? "Design system" : scenario === "employee-list" ? "Employee list" : "Employee form",
          subtitle: "Deterministic standard-density visual fixture",
        }}
      >
        <DesignSystemVisualFixture scenario={scenario} />
      </PageShell>
    </ThemeProvider>
  );
}
