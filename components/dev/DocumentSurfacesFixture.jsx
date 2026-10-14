import { StyleSheet, View } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";
import { designTokens as t } from "../../lib/design/tokens";
import PageShell from "../layout/PageShell";
import { AppText } from "../ui/AppPrimitives";
import DocumentSurface from "../ui/DocumentSurface";

const states = ["Document content with a long title that wraps on small phones", "Opening document…", "Document unavailable"];
export default function DocumentSurfacesFixture() {
  const { colors } = useTheme();
  return <PageShell header={{ title: "Document frame equivalence" }}>
    {["page", "embedded"].map((variant) => states.map((text, index) => {
      const content = <AppText>{text}</AppText>;
      const layout = { minHeight: 80, padding: t.spacing.xs, overflow: "hidden", marginBottom: t.spacing.xs };
      // Frozen original frame presentation, independent of the shared component.
      const legacy = variant === "embedded"
        ? { backgroundColor: colors.surfaceAlt, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }
        : { backgroundColor: colors.background };
      return <View key={`${variant}-${index}`}>
        <View testID={`document-before-${variant}-${index}`}><View style={[legacy, layout]}>{content}</View></View>
        <View testID={`document-after-${variant}-${index}`}><DocumentSurface variant={variant} layoutStyle={layout}>{content}</DocumentSurface></View>
      </View>;
    }))}
  </PageShell>;
}
