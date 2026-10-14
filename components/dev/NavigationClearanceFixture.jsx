import { useState } from "react";
import { StyleSheet, View } from "react-native";
import PageShell from "../layout/PageShell";
import BottomNavigationBar from "../app/BottomNavigationBar";
import { AppButton, ListRow } from "../ui/AppPrimitives";
import { NavigationAccessory, NavigationAccessoryProvider } from "../../providers/NavigationAccessoryProvider";
import { designTokens as t } from "../../lib/design/tokens";

function Content() {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.root}>
    <PageShell contentSpacing="compact" header={{ variant: "compact", title: "Navigation clearance" }} stickyAction={<AppButton testID="clearance-sticky" label="Continue" onPress={() => {}} />}>
      {Array.from({ length: 20 }, (_, index) => <ListRow key={index} title={`Record ${index + 1}`} subtitle="Scrollable content" divider />)}
      <AppButton testID="clearance-last" label="Last page action" onPress={() => {}} />
    </PageShell>
    <View style={styles.footer}>
      <BottomNavigationBar activeIndex={0} onSelect={() => {}} tabs={[{ route: "/home", label: "Home", iconActive: "home", iconInactive: "home-outline" }]} floatingContent={
        <NavigationAccessory>
          <View testID="clearance-accessory" style={styles.accessories}>
            <AppButton label={expanded ? "Hide extra accessory" : "Show extra accessory"} onPress={() => setExpanded(!expanded)} />
            {expanded ? <AppButton label="Another action with longer text that wraps on small screens" onPress={() => {}} /> : null}
          </View>
        </NavigationAccessory>
      } />
    </View>
  </View>;
}

export default function NavigationClearanceFixture() {
  return <NavigationAccessoryProvider><Content /></NavigationAccessoryProvider>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, footer: { position: "absolute", bottom: 0, left: 0, right: 0 }, accessories: { maxWidth: 230, gap: t.spacing.xs } });
