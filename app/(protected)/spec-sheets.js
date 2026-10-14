import DocumentCard from "../../components/ui/DocumentCard";
import { styles } from "../../lib/design/screenStyles/spec-sheets-js.js";
import { AppText as Text, FormField } from "../../components/ui/AppPrimitives";
import { useRouter } from "expo-router";
import {
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
} from "firebase/storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import PageShell from "../../components/layout/PageShell";
import { storage } from "../../firebaseConfig";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";

// ✅ trailing slash avoids ambiguous matches and mirrors console pathing
const FOLDER_PATH = "spec sheets/";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const kb = (bytes) =>
  typeof bytes === "number" ? `${(bytes / 1024).toFixed(2)} KB` : "—";

export default function SpecSheetsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading: authLoading } = useAuth();

  const [files, setFiles] = useState([]); // [{name,size,updated,contentType,url}]
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return undefined;
    let alive = true;

    const load = async () => {
      try {
        setErr(null);

        const folderRef = ref(storage, FOLDER_PATH);
        const res = await listAll(folderRef);

        const details = await Promise.all(
          res.items.map(async (itemRef) => {
            const [meta, url] = await Promise.all([
              getMetadata(itemRef),
              getDownloadURL(itemRef),
            ]);
            return {
              name: meta.name,
              size: meta.size || 0,
              contentType: meta.contentType || "application/pdf",
              updated: meta.updated || meta.timeCreated || "",
              url,
            };
          })
        );

        details.sort((a, b) => a.name.localeCompare(b.name));
        if (alive) setFiles(details);
      } catch (e) {
        if (alive) setErr(e);
      } finally {
        if (alive) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [authLoading, reloadKey, user]);

  const reloadFiles = useCallback(() => {
    if (files.length > 0) setRefreshing(true);
    else setLoading(true);
    setReloadKey((value) => value + 1);
  }, [files.length]);

  const filtered = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (!v) return files;
    return files.filter((f) => f.name.toLowerCase().includes(v));
  }, [files, q]);

  const openPdf = (item) => {
    router.push({
      pathname: "/document-viewer",
      params: {
        url: item.url,
        name: item.name,
        contentType: item.contentType,
      },
    });
  };

  const renderItem = ({ item }) => (
    <DocumentCard
      title={item.name.replace(/\.pdf$/i, "")}
      subtitle={`${kb(item.size)} · ${item.contentType} · ${fmtDate(item.updated)}`}
      onPress={() => openPdf(item)}
    />
  );

  return (
    <PageShell
      appearance="grouped"
      header={{
        variant: "compact",
        eyebrow: "Technical Library",
        title: "Spec Sheets",
        onBack: router.back,
      }}
      state={{
        resources: [{ data: files, error: err, isInitialLoading: loading || authLoading, isRefreshing: refreshing }],
        hasContent: files.length > 0,
        onRetry: reloadFiles,
        loadingLabel: "Loading spec sheets…",
        errorTitle: "Spec sheets unavailable",
        errorMessage: "Could not load the technical library. Please try again.",
        refreshErrorMessage: "Could not refresh spec sheets. Showing the saved list.",
        empty: {
          when: !loading && !authLoading && !err && files.length === 0,
          icon: "file-text",
          title: "No spec sheets",
          message: "Technical documents will appear here when available.",
        },
      }}
      refresh={{ refreshing, onRefresh: reloadFiles }}
    >
      <>
        <View style={styles.sectionCard}>
          <FormField
            label="Search specification sheets"
            value={q}
            onChangeText={setQ}
            placeholder="Search e.g. ‘Silverado’, ‘Cheyenne’, ‘2025’…"
            inputProps={{ returnKeyType: "search" }}
          />
        </View>

        <View style={styles.sectionCard}>
          {filtered.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.groupedSurface,
                },
              ]}
            >
              <Text tone={"muted"} style={[styles.emptyText]}>
                No spec sheets match “{q}”.
              </Text>
            </View>
          ) : (
            <View style={styles.listContent}>
              {filtered.map((item) => (
                <View key={item.url}>{renderItem({ item })}</View>
              ))}
            </View>
          )}
        </View>
      </>
    </PageShell>
  );
}

