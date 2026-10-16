import React from 'react';
import { View } from 'react-native';
import PageShell from '../layout/PageShell';
import { AppText, SectionCard, AppButton } from '../ui/AppPrimitives';
import { designTokens as t } from '../../lib/design/tokens';

/** Display-only: callbacks select saved content or retry current verification. */
export default function StartupPreview({ snapshot, status, onRetry, onSelectDate, onSelectJob }) {
  const dates = [...new Set([snapshot.selectedDateISO, ...snapshot.completeDates, ...snapshot.jobs.map(job => job.dateISO)])].sort();
  const jobs = snapshot.jobs.filter(job => job.dateISO === snapshot.selectedDateISO);
  const unavailable = status === 'unavailable';
  return (
    <PageShell appearance="grouped" contentSpacing="standard" header={{ variant: 'compact', title: snapshot.route === 'schedule' ? 'Schedule' : 'Home', subtitle: 'Saved view' }}>
      <SectionCard tone="grouped">
        <AppText variant="bodyStrong">{unavailable ? 'Unable to refresh right now' : 'Refreshing your account…'}</AppText>
        <AppText variant="metadata" tone="secondary" layoutStyle={{ marginTop: t.spacing.xs }}>Saved {new Date(snapshot.savedAt).toLocaleString('en-GB')}</AppText>
        <AppText variant="body" tone="secondary" layoutStyle={{ marginTop: t.spacing.xs }}>This view is read-only until your account is verified.</AppText>
        {unavailable && <AppButton label="Retry" variant="secondary" onPress={onRetry} layoutStyle={{ marginTop: t.spacing.md }} />}
      </SectionCard>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs }}>
        {dates.map(date => <AppButton key={date} label={new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} variant="secondary" selected={date === snapshot.selectedDateISO} onPress={() => onSelectDate(date)} accessibilityLabel={`Show saved jobs for ${date}`} />)}
      </View>
      {jobs.map(job => (
        <SectionCard key={`${job.id}:${job.dateISO}`} tone="grouped">
          <AppText variant="sectionHeading">{job.title || (job.jobNumber ? `Job #${job.jobNumber}` : 'Assigned job')}</AppText>
          {!!job.jobNumber && <AppText variant="metadata" tone="secondary">Job #{job.jobNumber}</AppText>}
          {!!job.callTime && <AppText variant="body" layoutStyle={{ marginTop: t.spacing.xs }}>Call time: {job.callTime}</AppText>}
          {snapshot.selectedJobId === job.id && !!job.location && <AppText variant="body" layoutStyle={{ marginTop: t.spacing.xs }}>{job.location}</AppText>}
          <AppButton label={snapshot.selectedJobId === job.id ? 'Hide details' : 'Saved details'} variant="ghost" accessibilityLabel="View saved job" onPress={() => onSelectJob(snapshot.selectedJobId === job.id ? null : job.id)} layoutStyle={{ marginTop: t.spacing.xs }} />
        </SectionCard>
      ))}
      {!jobs.length && <AppText variant="body" tone="secondary">{snapshot.completeDates.includes(snapshot.selectedDateISO) && !snapshot.truncated ? 'No jobs in the saved schedule for this date.' : 'No job details saved for this date. Refresh to check your schedule.'}</AppText>}
      {snapshot.truncated && <AppText variant="metadata" tone="secondary">Only part of your schedule is saved. Refresh for the full schedule.</AppText>}
    </PageShell>
  );
}
