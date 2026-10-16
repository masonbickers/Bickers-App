import React from 'react';
import PageShell from '../layout/PageShell';
import StartupHomeDashboard from './StartupHomeDashboard';

/** The same Home layout while verification runs; protected controls remain disabled. */
export default function StartupPreview(props) {
  return <PageShell appearance="grouped" contentSpacing="compact" scrollProps={{showsVerticalScrollIndicator:false}}>
    <StartupHomeDashboard {...props} />
  </PageShell>;
}
