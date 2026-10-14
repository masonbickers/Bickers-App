import { styles } from "../../../../lib/design/screenStyles/service-vehicles-file-viewer-jsx.js";
import { AppText, StateView } from "../../../../components/ui/AppPrimitives";
import { useLocalSearchParams,
  useRouter } from "expo-router";
import { useMemo } from "react";
import {
    ActivityIndicator,
  Image,
  View } from "react-native";
import { WebView } from "react-native-webview";

import DocumentSurface from "../../../../components/ui/DocumentSurface";
import PageShell from "../../../../components/layout/PageShell";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useRoute } from "@react-navigation/native";
import { documentUrlFromRoute } from "../../../../lib/documentUrl";

export default function FileViewerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const route = useRoute();

  const url = documentUrlFromRoute(route.params);

  const name = useMemo(() => {
    if (!params?.name) return "";
    return Array.isArray(params.name) ? params.name[0] : params.name;
  }, [params]);

  const isImage = useMemo(() => {
    if (!url) return false;
    const lower = url.split("?")[0].toLowerCase();
    return (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".heic") ||
      lower.endsWith(".heif")
    );
  }, [url]);

  return (
    <PageShell
      mode="static"
      width="full"
      header={{
        variant: "compact",
        title: name || "Attachment",
        subtitle: "Vehicle attachment",
        onBack: router.back,
      }}
    >
      <DocumentSurface layoutStyle={styles.viewer}>
        {!url ? (
          <StateView
            state="error"
            title="Attachment unavailable"
            message="No file URL was provided."
          />
        ) : isImage ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: url }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        ) : (
          <WebView
            source={{ uri: url }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accent} />
                <AppText variant="bodySmall" tone="secondary" layoutStyle={styles.loadingText}>
                  Loading file…
                </AppText>
              </View>
            )}
          />
        )}
      </DocumentSurface>
    </PageShell>
  );
}

