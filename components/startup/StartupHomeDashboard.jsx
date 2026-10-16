import HomeDayStatus from '../home/HomeDayStatus';
import React from 'react';
import { View } from 'react-native';
import HomeDashboard from '../home/HomeDashboard';
import { AppText, AppButton, SectionCard } from '../ui/AppPrimitives';
import { useTheme } from '../../providers/ThemeProvider';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { getDashboardGridColumns } from '../../lib/design/dashboardLayout';
import { styles } from '../../lib/design/screenStyles/main-tabs-screens-homescreen-js';
import { designTokens as t } from '../../lib/design/tokens';

const dateISO = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

/** Display-only Home: consumes the existing account-scoped snapshot, never fetches or navigates. */
export default function StartupHomeDashboard({ snapshot, status, onRetry, account }) {
  const { colors } = useTheme();
  const layout = useResponsiveLayout();
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const planningDate = snapshot?.selectedDateISO ? new Date(`${snapshot.selectedDateISO}T12:00:00`) : tomorrow;
  const todayJobs = (snapshot?.jobs || []).filter(job => job.dateISO === dateISO(today));
  const planningJobs = (snapshot?.jobs || []).filter(job => job.dateISO === dateISO(planningDate));
  const unavailable = status === 'unavailable';
  const workContent = (jobs, day, upcoming = false) => {
    const savedDay = snapshot?.home?.days?.find(entry => entry.dateISO === dateISO(day));
    if (!jobs.length && savedDay && !snapshot.truncated && snapshot.completeDates?.includes(dateISO(day))) return <HomeDayStatus label={savedDay.label} upcoming={upcoming} />;
    return jobs.length ? jobs.map(job => (
    <SectionCard key={`${job.id}:${job.dateISO}`} tone="grouped">
      <AppText variant="sectionHeading">{job.title || (job.jobNumber ? `Job #${job.jobNumber}` : 'Assigned job')}</AppText>
      {!!job.jobNumber && <AppText variant="metadata" tone="secondary">Job #{job.jobNumber}</AppText>}
      {!!job.callTime && <AppText variant="body">Call time: {job.callTime}</AppText>}
      {!!job.location && <AppText variant="body" tone="secondary">{job.location}</AppText>}
    </SectionCard>
  )) : (
    <SectionCard tone="grouped" layoutStyle={styles.statusSummary}>
      <View style={styles.statusSummaryCopy}>
        <AppText variant="bodyStrong">{!snapshot?.truncated && snapshot?.completeDates?.includes(dateISO(day)) ? 'No jobs assigned' : 'No saved work details'}</AppText>
        <AppText variant="metadata" tone="secondary">{!snapshot?.truncated && snapshot?.completeDates?.includes(dateISO(day)) ? 'Your saved schedule has no jobs for this day.' : unavailable ? 'Please retry to check your schedule.' : 'Checking your schedule in the background.'}</AppText>
      </View>
    </SectionCard>
  );
  };
  const hour = today.getHours();
  return <>
    <HomeDashboard colors={colors} gridColumnCount={getDashboardGridColumns(layout.width, layout.fontScale)}
      account={account || snapshot?.home || {name:'Welcome back',userCode:''}}
      userInitials={(account?.name || snapshot?.home?.name || '').split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)}
      timeOfDay={hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'}
      dateLabel={today.toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}
      selectedDate={planningDate} todayCount={todayJobs.length}
      todayContent={workContent(todayJobs, today)} planningContent={workContent(planningJobs, planningDate, true)} refreshingAccess refreshUnavailable={unavailable} savedAt={snapshot?.savedAt}
    />
    {unavailable && <AppButton label="Retry" variant="secondary" onPress={onRetry} layoutStyle={{marginTop:t.spacing.md}} />}
  </>;
}
