import FooterPageSkeleton from "../../../components/FooterPageSkeleton";
import { isCurrentEmployeeRecord } from "../../../lib/employeeVisibility";
import { getCardSurfaceStyle } from "../../../lib/design/cardSurface";
import { routeColors } from "../../../lib/design/routePresentation/main-tabs-contacts-js.js";
import { styles } from "../../../lib/design/screenStyles/main-tabs-contacts-js.js";
import { AppText as Text, AppPressable as TouchableOpacity, FormField } from "../../../components/ui/AppPrimitives";
// app/(protected)/contacts.js
import {
  Fragment,
  useMemo,
  useState } from "react";
import {
  Alert,
  Linking,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import PageHeaderCard from "../../../components/PageHeaderCard";
import { EmptyState } from "../../../components/AsyncState";
import PageShell from "../../../components/layout/PageShell";
import { useContacts } from "../../../hooks/useOperationalData";
import { designTokens as t } from "../../../lib/design/tokens";
import { callUrl, whatsappUrl, contactPhoneMatches } from "../../../lib/contactLinks";

import { useTheme } from "../../../providers/ThemeProvider";
import { withAlpha } from "../../../lib/design/color";

export default function ContactsPage() {
  const contactsResource = useContacts();
  return <ContactsView contactsResource={contactsResource} />;
}

export function ContactsView({ contactsResource, onCall, onMessage }) {
  const { colors, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const [q, setQ] = useState("");
  const employees = useMemo(
    () =>
      contactsResource.data.filter(isCurrentEmployeeRecord).sort((a, b) =>
        (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
      ),
    [contactsResource.data]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return employees;

    return employees.filter((emp) => {
      const name = (emp.name || "").toLowerCase();
      let titles = "";
      if (Array.isArray(emp.jobTitle)) {
        titles = emp.jobTitle.join(" ").toLowerCase();
      } else if (typeof emp.jobTitle === "string") {
        titles = emp.jobTitle.toLowerCase();
      }
      return (
        name.includes(needle) ||
        contactPhoneMatches(emp.mobile, needle) ||
        titles.includes(needle)
      );
    });
  }, [employees, q]);

  /* ---------- Actions ---------- */
  const callNumber = async (raw) => {
    const url = callUrl(raw);
    if (!url) {
      Alert.alert("No number", "This contact does not have a phone number.");
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Cannot call", "Calling is not supported on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Error", "Failed to start the call.");
      console.error(e);
    }
  };

  const messageWhatsApp = async (raw, name) => {
    const url = whatsappUrl(raw, name);
    if (!url) {
      Alert.alert(
        "Invalid number",
        "This number could not be formatted for WhatsApp."
      );
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Error", "Unable to open WhatsApp.");
      console.error(e);
    }
  };

  const totalCount = employees.length;
  const showingCount = filtered.length;
  const countLabel = q.trim()
    ? `${showingCount} of ${totalCount} contacts`
    : `${totalCount} contacts`;

  // 🔹 All colours from theme
  const cardBg = isDark ? colors.groupedSurface : colors.surface;
  const borderColor = colors.border;
  const textMuted = colors.textMuted ?? routeColors.hex_7a7a7a_7vh7e8;
  const iconMuted = textMuted;
  const avatarBg = cardBg;
  const avatarBorder = colors.border;
  const callColor = colors.accent ?? routeColors.hex_c8102e_6za5cb;
  const msgColor = routeColors.hex_23c063_74ohzl;
  const disabledBg = colors.disabled ?? (isDark ? routeColors.hex_2a2a2a_631aj9 : routeColors.hex_d1d1d6_pnsuhg);

  return (
    <PageShell
      appearance="grouped"
      contentSpacing="compact"
      customHeader={
        <PageHeaderCard
          eyebrow="Team"
          title="Contacts"
          subtitle="Reach crew quickly by phone or WhatsApp."
          style={styles.heroCard}
          contentStyle={styles.heroContent}
        >
          <View style={styles.heroMetaRow}>
              <View
                style={[
                  styles.heroMetaChip,
                  {
                    backgroundColor: withAlpha(colors.surfaceAlt, 0.8),
                    borderColor: withAlpha(colors.border, 0.8),
                  },
                ]}
              >
                <Icon name="users" size={12} color={textMuted} />
                <Text tone={"primary"} style={[styles.heroMetaText]}>{countLabel}</Text>
              </View>
          </View>
        </PageHeaderCard>
      }
      customHeaderPlacement="scroll"
      refresh={{
        refreshing: contactsResource.isRefreshing,
        onRefresh: contactsResource.refresh,
      }}
      state={{
        resources: [contactsResource],
        hasContent: employees.length > 0,
        onRetry: contactsResource.refresh,
        loadingLabel: "Loading contacts…",
        loadingContent: <FooterPageSkeleton page="contacts" />,
        empty: {
          when: employees.length === 0,
          icon: "user-x",
          title: "No employees found",
          message: "Add employees in the web app.",
        },
      }}
    >
      <View style={styles.contactsBody}>
          {/* Search bar */}
          <View style={styles.searchRow}>
              <FormField
                label="Search employee contacts"
                hint="Enter an employee name or phone number"
                placeholder="Search by name or phone"
                value={q}
                onChangeText={setQ}
                layoutStyle={{ flex: 1 }}
                inputProps={{ autoCapitalize: "none", autoCorrect: false, returnKeyType: "search" }}
              />
          </View>

          {/* List */}
          {filtered.length === 0 ? (
              <EmptyState
                icon="user-x"
                style={styles.contactEmptyState}
                title={q ? "No matches found" : "No employees found"}
                message={
                  q
                    ? "Try a different name or number."
                    : "Add employees in the web app."
                }
                compact
              />
            ) : (
              filtered.map((emp, index) => {
              const initials = (emp.name || "")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              const phone = emp.mobile || "";
              const hasPhone = Boolean(callUrl(phone));
              const role = Array.isArray(emp.jobTitle)
                ? emp.jobTitle.filter(Boolean).join(" · ")
                : String(emp.jobTitle || "").trim();
              const letter = (emp.name || "#").trim().charAt(0).toUpperCase() || "#";
              const previousLetter = index > 0
                ? (filtered[index - 1]?.name || "#").trim().charAt(0).toUpperCase() || "#"
                : null;

              return (
                <Fragment key={emp.id}>
                  {letter !== previousLetter ? (
                    <Text tone={"muted"} style={[styles.letterHeading]}>{letter}</Text>
                  ) : null}
                  <View
                    testID={`contact-card-${emp.id}`}
                    style={[styles.card, getCardSurfaceStyle(colors)]}
                  >
                  {/* Left avatar */}
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: avatarBg,
                        borderColor: avatarBorder,
                      },
                    ]}
                  >
                    <Text tone={"primary"} style={[styles.avatarText]}>
                      {initials || "—"}
                    </Text>
                  </View>

                  {/* Middle content */}
                  <View style={styles.contactCopy}>
                    <Text tone={"primary"} style={[styles.name]}>
                      {emp.name || "No Name"}
                    </Text>

                    <View style={styles.infoRow}>
                      <Icon
                        name="phone"
                        size={14}
                        color={hasPhone ? iconMuted : textMuted}
                        style={styles.infoIcon}
                      />
                      <Text tone={hasPhone ? "muted" : "muted"} style={[styles.meta]}>
                        {[role, phone || "No number"].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      style={[
                        styles.btn,
                        {
                          backgroundColor: hasPhone
                            ? withAlpha(msgColor, 0.14)
                            : disabledBg,
                          borderColor: hasPhone
                            ? withAlpha(msgColor, 0.4)
                            : withAlpha(borderColor, 0.7),
                        },
                      ]}
                      onPress={() => hasPhone && (onMessage || messageWhatsApp)(phone, emp.name)}
                      disabled={!hasPhone}
                      accessibilityRole="button"
                      accessibilityLabel={`Message ${emp.name || "employee"} on WhatsApp`}
                      accessibilityState={{ disabled: !hasPhone }}
                    >
                      <Icon
                        name="message-circle"
                        size={18}
                        color={hasPhone ? msgColor : textMuted}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.btn,
                        {
                          backgroundColor: hasPhone
                            ? withAlpha(callColor, 0.14)
                            : disabledBg,
                          borderColor: hasPhone
                            ? withAlpha(callColor, 0.4)
                            : withAlpha(borderColor, 0.7),
                        },
                      ]}
                      onPress={() => hasPhone && (onCall || callNumber)(phone)}
                      disabled={!hasPhone}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${emp.name || "employee"}`}
                      accessibilityState={{ disabled: !hasPhone }}
                    >
                      <Icon
                        name="phone-call"
                        size={18}
                        color={hasPhone ? callColor : textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  </View>
                </Fragment>
              );
              })
            )}
      </View>
    </PageShell>
  );
}
