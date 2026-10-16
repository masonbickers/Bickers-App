import React from 'react';
import { View } from 'react-native';
import { isFreshInStartupCycle, startupTimings } from '../../lib/startup/timings';
/** A layout callback is evidence of native layout, not proof of a painted frame. */
export default function StartupContentMarker({ enabled, updatedAt }) {
  if (!enabled || !isFreshInStartupCycle(updatedAt)) return null;
  return <View key={updatedAt} collapsable={false} accessible={false} onLayout={() => startupTimings.mark('first-fresh-layout')} />;
}
