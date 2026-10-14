import { AppButton, AppText as Text, Avatar, Divider, FormField, ListRow, PageSection } from "../../components/ui/AppPrimitives";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { profilePhoneError } from "../../lib/profilePhone";
import {
  useRouter } from "expo-router";
import { doc,
  getDoc,
  updateDoc } from "firebase/firestore";
import { useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";

import { db } from "../../firebaseConfig";
import { useAuth } from "../../providers/AuthProvider";
import { useDataCache } from "../../providers/DataCacheProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { designTokens as t } from "../../lib/design/tokens";
import PageShell from "../../components/layout/PageShell";



export default function ProfilePage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { signOutAccount, user, employee, loading: authLoading, reloadSession } = useAuth();
  const { invalidate } = useDataCache();
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [initialPhone, setInitialPhone] = useState("");
  const [userCode, setUserCode] = useState("");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [allowLogout, setAllowLogout] = useState(false);

  const employeeDocId = employee?.employeeId || employee?.id || null;

  useEffect(() => {
    if (!authLoading) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, employeeDocId, user?.uid]);

  const avatarInitial = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0]?.[0]?.toUpperCase() || "U";
  }, [name]);
  const displayRole = useMemo(() => {
    const value = String(role || "").trim();
    if (!value || ["user", "employee"].includes(value.toLowerCase())) return "Employee";
    return value;
  }, [role]);
  const hasChanges = phone.trim() !== initialPhone.trim();
  usePreventRemove(hasChanges && !allowLogout, ({ data }) => {
    Alert.alert("Discard changes?", "Your phone number changes have not been saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard changes", style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const loadProfile = async () => {
    try {
      setLoading(true);

      if (employeeDocId) {
        const docRef = doc(db, "employees", employeeDocId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();

          setName(data.name || employee?.displayName || "");
          const contactNumber = data.mobile || data.phone || "";
          setPhone(contactNumber);
          setInitialPhone(contactNumber);
          setUserCode(data.userCode || employee?.userCode || "");
          setRole(data.role || employee?.role || "");
          setEmail(user?.email ?? data.email ?? employee?.email ?? "");
        } else if (user) {
          setName(user.displayName || employee?.displayName || "");
          setEmail(user.email || employee?.email || "");
        }
      } else if (user) {
        setName(user.displayName || employee?.displayName || "");
        setEmail(user.email || employee?.email || "");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      Alert.alert("Error", "There was a problem loading your profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const validationError = profilePhoneError(phone);
    setPhoneError(validationError);
    if (validationError) return;
    if (!employeeDocId) {
      Alert.alert("No profile", "No employee profile found to update.");
      return;
    }

    try {
      setSaving(true);

      const docRef = doc(db, "employees", employeeDocId);

      await updateDoc(docRef, {
        phone: phone.trim() || "",
        mobile: phone.trim() || "",
      });
      await Promise.all([
        invalidate("collection:employees"),
        invalidate("me-dashboard:"),
      ]);
      setInitialPhone(phone.trim());

      Alert.alert("Saved", "Your profile has been updated.");
    } catch (err) {
      console.error("Error saving profile:", err);
      Alert.alert("Error", "There was a problem saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      setAllowLogout(true);
      await AsyncStorage.multiRemove([
        "sessionRole",
        "sessionIsService",
        "sessionUserAccess",
        "sessionServiceAccess",
        "sessionCompanyId",
        "displayName",
        "employeeId",
        "employeeEmail",
        "employeeUserCode",
        "userCode",
        "timesheetYardStart",
        "timesheetYardEnd",
        "timesheetOfficeStart",
        "timesheetOfficeEnd",
        "timesheetWorkshopStart",
        "timesheetWorkshopEnd",
        "timesheetDefaultType",
      ]);

      global.employee = null;
      await signOutAccount();
      if (reloadSession) await reloadSession();
      router.replace("/(auth)/login");
    } catch (err) {
      setAllowLogout(false);
      console.error("Error logging out:", err);
      Alert.alert("Error", "There was a problem logging you out.");
    }
  };

  const confirmLogout = () => {
    Alert.alert("Log out?", "You will need to sign in again to use the app.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: handleLogout },
    ]);
  };

  const stillLoading = authLoading || loading;

  return (
    <PageShell mode="form" width="form" header={{ variant: "compact", title: "Edit Profile", eyebrow: "Profile & App", onBack: router.back }}>
      {stillLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text variant="body" tone="secondary">
            Loading your profile…
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.profileTop}>
            <Avatar initials={avatarInitial} label={name} size="large" />
            <View style={styles.profileText}>
              <Text variant="sectionTitle">{name || "Unnamed User"}</Text>
              <Text variant="metadata" tone="secondary">{displayRole}{userCode ? ` · Code ${userCode}` : ""}</Text>
            </View>
          </View>
          <Divider />
          <PageSection title="Account" divided={false}>
            <View>
              {[
                { icon: "user", label: "Name", value: name || "Not set" },
                { icon: "mail", label: "Email", value: email || "Not set" },
                { icon: "hash", label: "Employee code", value: userCode || "Not set" },
              ].map((item, index) => (
                <ListRow key={item.label} title={item.value} subtitle={item.label} leadingIcon={item.icon}
                  divider={index < 2} trailing={<Icon name="lock" size={t.iconSize.sm} color={colors.textMuted} />} />
              ))}
            </View>
            <Text variant="metadata" tone="secondary">Managed by your administrator.</Text>
          </PageSection>
          <PageSection title="Contact number" divided={false}>
            <FormField label="Phone number" value={phone} onChangeText={(value) => { setPhone(value); setPhoneError(null); }} error={phoneError}
              placeholder="Enter your phone number" disabled={saving}
              hint="Used by the crew directory and booking team."
              inputProps={{ keyboardType: "phone-pad", textContentType: "telephoneNumber" }} />
          </PageSection>
          <AppButton
            label={hasChanges ? "Save phone number" : "No changes"}
            icon="save"
            onPress={handleSave}
            disabled={!hasChanges || saving}
            loading={saving}
            fullWidth
            accessibilityLabel="Save phone number"
          />

          <Divider />
          <PageSection title="Account access" divided={false}>
            <AppButton label="Log out" icon="log-out" variant="secondary" onPress={confirmLogout}
              fullWidth accessibilityLabel="Log out" />
          </PageSection>
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: t.spacing.sm },
  content: { gap: t.spacing.md, paddingBottom: t.spacing.md },
  profileTop: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  profileText: { flex: 1, minWidth: 0, gap: t.spacing.xxs },
});
