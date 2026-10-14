import { StyleSheet, View } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";

// Frames for document rendering and its loading/error content. The caller
// retains renderer selection, URL handling, loading state and layout geometry.
export default function DocumentSurface({ variant = "page", children, layoutStyle }) {
  const { colors } = useTheme();
  const embedded = variant === "embedded";
  return (
    <View style={[
      embedded
        ? { backgroundColor: colors.surfaceAlt, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }
        : { backgroundColor: colors.background },
      layoutStyle,
    ]}>
      {children}
    </View>
  );
}
