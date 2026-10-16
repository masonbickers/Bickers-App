import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { useClerkFirebase } from '../providers/ClerkFirebaseProvider';
import { useStartupSnapshot } from '../providers/StartupSnapshotProvider';
import { captureStartupSnapshot } from '../lib/startup/capture';
import { projectStartupSnapshot } from '../lib/startup/snapshot';

/** Call only with the screen's already-filtered operational summaries. */
export function useStartupSnapshotCapture({ route, selectedDateISO, selectedJobId = null, jobs, completeDates, home, enabled }) {
  const { store } = useStartupSnapshot();
  const { user, employee, loading, isAuthed, workingTermsAccepted, startupAccessStatus } = useAuth();
  const clerk = useClerkFirebase();
  const pathname = usePathname();
  const lastSaved = useRef(null);
  const identity = { clerkUserId: clerk.clerkUserId, clerkSessionId: clerk.clerkSessionId, uid: user?.uid, companyId: employee?.companyId, employeeId: employee?.employeeId };
  const active = store?.getActive();
  const visible = pathname === (route === 'schedule' ? '/screens/schedule' : '/screens/homescreen');
  const eligible = enabled && visible && !loading && isAuthed && workingTermsAccepted && startupAccessStatus === 'verified';
  // Projection makes the comparison small and prevents unrelated HR refreshes from rewriting disk.
  const view = eligible && active ? projectStartupSnapshot({ identity, generation: active.generation, verifiedAt: active.verifiedAt, savedAt: active.verifiedAt, route, selectedDateISO, selectedJobId, jobs, completeDates, home }) : null;
  const serialized = view ? JSON.stringify(view) : null;
  useEffect(() => {
    if (!serialized || !store || serialized === lastSaved.current) return;
    const snapshot = JSON.parse(serialized);
    let cancelled = false;
    void captureStartupSnapshot({ store, identity: snapshot.identity, enabled: true, view: snapshot }).then(saved => {
      if (saved && !cancelled) lastSaved.current = serialized;
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [serialized, store]);
}
