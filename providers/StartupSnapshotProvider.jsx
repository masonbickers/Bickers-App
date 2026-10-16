import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { startupTimings } from '../lib/startup/timings';
import { createNativeSnapshotStore } from '../lib/startup/nativeSnapshotStorage';

const empty = { enabled: false, store: null, restored: true, status: 'empty', snapshot: null };
/** @typedef {ReturnType<typeof createNativeSnapshotStore>} SnapshotStore */
/** @type {React.Context<ReturnType<SnapshotStore['getState']> & {enabled:boolean,store:SnapshotStore|null}>} */
const StartupSnapshotContext = createContext(empty);
export const useStartupSnapshot = () => useContext(StartupSnapshotContext);
export function StartupSnapshotProvider({ children }) {
  const store = useMemo(() => Platform.OS !== 'web' && process.env.EXPO_PUBLIC_CLERK_SHARED_AUTH_ENABLED === '1' ? createNativeSnapshotStore() : null, []);
  const [state, setState] = useState(() => store?.getState() || empty);
  useEffect(() => {
    if (!store) return undefined;
    const update = () => setState(store.getState());
    const unsubscribe = store.subscribe(update);
    void startupTimings.measure('local-restore', () => store.restore());
    // Clock changes and age expiry also apply while the preview remains visible.
    const timer = setInterval(() => store.checkEligibility(), 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') store.checkEligibility(); });
    return () => { unsubscribe(); clearInterval(timer); subscription.remove(); };
  }, [store]);
  return <StartupSnapshotContext.Provider value={{ ...state, enabled: !!store, store }}>{children}</StartupSnapshotContext.Provider>;
}
