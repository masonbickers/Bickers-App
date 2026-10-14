import { AppButton, AppText, Divider, SectionCard, StateView, StatusChip } from "../../../components/ui/AppPrimitives";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { designTokens as t } from "../../../lib/design/tokens";
import { db } from "../../../firebaseConfig";
import { isBookingVisibleToEmployee } from "../../../lib/bookingVisibility";
import { bookingDetailRows } from "../../../lib/bookingDetailPresentation";
import { useAuth } from "../../../providers/AuthProvider";
import PageShell from "../../../components/layout/PageShell";

export default function BookingView() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { employee, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setBooking(null); setUnavailable(false); setLoading(true); setError(null);
    async function load() {
      try {
        const bookingId = Array.isArray(id) ? id[0] : id;
        if (!bookingId) { if (active) setUnavailable(true); return; }
        const snap = await getDoc(doc(db, "bookings", bookingId));
        if (!active) return;
        const nextBooking = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        if (nextBooking && isBookingVisibleToEmployee(nextBooking, employee)) setBooking(nextBooking);
        else setUnavailable(true);
      } catch (failure) {
        if (active) setError(failure);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [authLoading, employee, id, attempt]);
  const rows = booking ? bookingDetailRows(booking) : [];
  return (
    <PageShell appearance="grouped" contentSpacing="compact"
      header={{ variant: "compact", eyebrow: "Operations", title: booking?.jobNumber ? `Job #${booking.jobNumber}` : "Booking", onBack: router.back }}
      state={{ resources: [{ data: booking ? [booking] : [], error, isInitialLoading: loading || authLoading }], hasContent: Boolean(booking), loadingLabel: "Loading booking…", errorTitle: "Booking unavailable", errorMessage: "Could not load the booking. Check your connection or account access and retry.", onRetry: () => setAttempt((value) => value + 1) }}
    >
      {unavailable ? (
        <SectionCard tone="grouped">
          <StateView state="empty" title="Booking unavailable" message="This booking is not currently available in your employee app." />
          <AppButton label="Go back" variant="secondary" onPress={() => router.back()} />
        </SectionCard>
      ) : booking ? (
        <>
          <SectionCard tone="grouped">
            <AppText variant="sectionTitle">{booking.production || booking.client || "Booking details"}</AppText>
            {booking.status ? <StatusChip label={String(booking.status)} tone={String(booking.status).toLowerCase()} /> : null}
          </SectionCard>
          {rows.length ? <SectionCard tone="grouped">
            {rows.map((row, index) => <View key={row.label}>
              <View style={styles.detailRow} accessible accessibilityLabel={`${row.label}, ${row.value}`}>
                <AppText variant="metadata" tone="secondary">{row.label}</AppText>
                <AppText variant="body" selectable>{row.value}</AppText>
              </View>
              {index < rows.length - 1 ? <Divider /> : null}
            </View>)}
          </SectionCard> : null}
        </>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({ detailRow: { gap: t.spacing.xxs, paddingVertical: t.spacing.xs } });
