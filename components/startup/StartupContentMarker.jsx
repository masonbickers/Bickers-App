import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePathname } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { useStartupSnapshot } from '../../providers/StartupSnapshotProvider';
import { isFreshInStartupCycle, startupTimings } from '../../lib/startup/timings';
/** Layout plus two frame callbacks keeps the preview over native route preparation. */
export default function StartupContentMarker({ enabled, updatedAt }) {
  const pathname = usePathname();
  const { isAuthed, loading, workingTermsAccepted } = useAuth();
  const { enabled: startupEnabled, markRouteReady, handoffCycle } = useStartupSnapshot();
  const [layoutCycle, setLayoutCycle] = useState(null);
  useEffect(() => {
    if (!startupEnabled || layoutCycle !== handoffCycle || loading || !isAuthed || !workingTermsAccepted) return undefined;
    let second;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => markRouteReady(pathname, handoffCycle)); });
    return () => { cancelAnimationFrame(first); if (second != null) cancelAnimationFrame(second); };
  }, [startupEnabled, layoutCycle, handoffCycle, loading, isAuthed, workingTermsAccepted, markRouteReady, pathname]);
  return <View style={{ position: 'absolute', width: 1, height: 1 }} collapsable={false} accessible={false} onLayout={event => { if (event.nativeEvent.layout.width > 0 && event.nativeEvent.layout.height > 0 && !loading && isAuthed && workingTermsAccepted) setLayoutCycle(handoffCycle); }}>
    {enabled && isFreshInStartupCycle(updatedAt) ? <View key={updatedAt} collapsable={false} accessible={false} onLayout={() => startupTimings.mark('first-fresh-layout')} /> : null}
  </View>;
}
