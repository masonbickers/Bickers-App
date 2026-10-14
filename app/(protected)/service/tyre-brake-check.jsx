import { styles } from "../../../lib/design/screenStyles/service-tyre-brake-check-jsx.js";
import { SectionCard, AppText as Text } from "../../../components/ui/AppPrimitives";
import { useRouter } from "expo-router";
import {
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import PageShell from "../../../components/layout/PageShell";

import { useTheme } from "../../../providers/ThemeProvider";

export default function TyreBrakeCheckRoute() {
  const router = useRouter();
  const { colors } = useTheme();


  return (
    <PageShell
      header={{
        variant: "compact",
        title: "Tyre & Brake Check",
        subtitle: "Tyre tread, brake condition and pressure checks are coming soon.",
        onBack: router.back,
      }}
    >
      <View style={styles.content}>
        <SectionCard
          tone="subtle" layoutStyle={styles.card}
        >
          <View style={styles.iconCircle}>
            <Icon name="disc" size={24} color={colors.accent} />
          </View>
          <Text tone={"primary"} style={[styles.cardTitle]}>
            Coming soon
          </Text>
          <Text
            tone={"muted"} style={[
              styles.cardText,
            ]}
          >
            This workshop form is planned for a future update.
          </Text>
        </SectionCard>
      </View>
    </PageShell>
  );
}

