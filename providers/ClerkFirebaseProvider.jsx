import { describeClerkSessionFailure, withClerkAuthPhase } from '../lib/clerkSessionFailure';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClerkProvider, useAuth as useClerkAuth, useClerk, useSignIn, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { onIdTokenChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { auth } from '../firebaseConfig';
import { clearAccountSessionCache } from '../lib/accountSessionCache';
import { syncEmployeeAuth } from '../lib/authApi';
import { clerkClientConfig, createClerkBridgeClient } from '../lib/clerkBridgeClient';
import { createClerkSessionCoordinator } from '../lib/clerkSessionCoordinator';
import { createClerkSignInFlow } from '../lib/clerkSignInFlow';
import { clearLiveResourcePrefix } from '../lib/serviceLiveRegistry';
import { bindSyncIdentity } from '../lib/sync/identity';

const emptyFlow = { step: 'password', busy: false, error: null, factors: [], factor: null };
const legacy = {
  enabled: false, ready: true, loading: false, error: null, uid: null, revision: 0,
  flowState: emptyFlow, flow: null, passwordEnabled: false,
  isReady: () => true,
  signOutAccount: () => signOut(auth),
};
/**
 * @typedef {Object} ClerkFirebaseState
 * @property {boolean} enabled
 * @property {boolean} ready
 * @property {boolean} loading
 * @property {string|null} error
 * @property {string|null} uid
 * @property {number} revision
 * @property {string|null} [clerkUserId]
 * @property {string|null} [clerkSessionId]
 * @property {boolean} [hasClerkSession]
 * @property {() => boolean} isReady
 * @property {() => Promise<void>} signOutAccount
 */
/** @type {React.Context<ClerkFirebaseState>} */
const ClerkFirebaseContext = createContext(legacy);
export const useClerkFirebase = () => useContext(ClerkFirebaseContext);

function readConfig() {
  return clerkClientConfig({
    enabled: process.env.EXPO_PUBLIC_CLERK_SHARED_AUTH_ENABLED === '1',
    environment: process.env.EXPO_PUBLIC_APP_ENV,
    publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    origin: process.env.EXPO_PUBLIC_CLERK_BRIDGE_ORIGIN || 'https://booking.bickers.co.uk',
    deploymentRole: process.env.EXPO_PUBLIC_CLERK_DEPLOYMENT_ROLE || 'primary',
  });
}

export function ClerkFirebaseProvider({ children }) {
  const result = useMemo(() => { try { return { config: readConfig() }; } catch { return { error: 'Account sign-in is not configured for this build. Please contact Bickers support.' }; } }, []);
  if (result.error) return <ClerkFirebaseContext.Provider value={{ ...legacy, enabled: true, ready: false, isReady: () => false, error: result.error }}>{children}</ClerkFirebaseContext.Provider>;
  if (!result.config.enabled) return children;
  return (
    <ClerkProvider publishableKey={result.config.publishableKey} tokenCache={tokenCache}>
      <ClerkRuntime config={result.config}>{children}</ClerkRuntime>
    </ClerkProvider>
  );
}

function ClerkRuntime({ config, children }) {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useClerkAuth();
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { user } = useUser();
  const { startHostedAuth } = useHostedAuth();
  const sdk = useRef({});
  sdk.current = { isLoaded, isSignedIn, userId, sessionId, getToken, signIn };
  const coordinator = useRef(null);
  const mounted = useRef(true);
  const permit = useRef(null);
  const [bridge, setBridge] = useState({ uid: null, error: null, revision: 0 });
  const [flowState, setFlowState] = useState(emptyFlow);
  const flow = useRef(null);
  if (!flow.current) flow.current = createClerkSignInFlow({
    getSignIn: () => sdk.current.signIn,
    cancelSession: capturedId => clerk.signOut({ sessionId: capturedId }),
    onChange: state => { if (mounted.current) setFlowState(state); },
  });
  const identity = useCallback(() => sdk.current.isLoaded && sdk.current.isSignedIn && sdk.current.userId && sdk.current.sessionId
    ? { clerkUserId: sdk.current.userId, clerkSessionId: sdk.current.sessionId } : null, []);
  const isReady = () => !!coordinator.current?.isReady() && !!permit.current
    && permit.current.uid === auth.currentUser?.uid && permit.current.clerkUserId === sdk.current.userId
    && permit.current.clerkSessionId === sdk.current.sessionId && sdk.current.isSignedIn === true;

  useEffect(() => {
    mounted.current = true;
    const invalidate = error => {
      permit.current = null;
      bindSyncIdentity(null);
      global.employee = null;
      if (mounted.current) setBridge(current => ({ ...current, uid: null, error: error === undefined ? current.error : error }));
    };
    const next = createClerkSessionCoordinator({
      getClerkIdentity: identity,
      getClerkToken: () => sdk.current.getToken({ skipCache: true }),
      exchangeToken: createClerkBridgeClient({ origin: config.origin }),
      getFirebaseUid: () => auth.currentUser?.uid || null,
      signInFirebase: async customToken => {
        const credential = await withClerkAuthPhase('firebase-sign-in', () => signInWithCustomToken(auth, customToken));
        await withClerkAuthPhase('employee-sync', async () => syncEmployeeAuth({ idToken: await credential.user.getIdToken(true) }));
      },
      signOutFirebase: () => signOut(auth),
      signOutClerk: options => clerk.signOut(options),
      clearAccountCache: async () => {
        bindSyncIdentity(null);
        global.employee = null;
        clearLiveResourcePrefix();
        await clearAccountSessionCache(AsyncStorage);
      },
      onPending: () => invalidate(),
      onBlocked: (error, context) => invalidate(describeClerkSessionFailure(error, { ...context, diagnostic: config.deploymentRole === 'pilot' })),
      onSignedOut: () => invalidate(),
      onReady: response => {
        permit.current = { ...identity(), uid: response.uid };
        if (mounted.current) setBridge(current => ({ uid: response.uid, error: null, revision: current.revision + 1 }));
      },
    });
    coordinator.current = next;
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active' && sdk.current.isLoaded) void next.reconcile({ requireFresh: true });
    });
    // Covers older logout entry points while their shared session is active.
    const unsubscribe = onIdTokenChanged(auth, firebaseUser => {
      if (!firebaseUser && !auth.currentUser && next.isReady()) void next.signOut();
    });
    if (sdk.current.isLoaded) void next.reconcile();
    return () => {
      mounted.current = false;
      permit.current = null;
      bindSyncIdentity(null);
      next.dispose();
      foreground.remove();
      unsubscribe();
      void flow.current.cancel();
      if (coordinator.current === next) coordinator.current = null;
    };
  }, [clerk, config.origin, config.deploymentRole, identity]); // SDK methods/identity are read from the current ref.

  useEffect(() => {
    if (isLoaded) void coordinator.current?.reconcile();
  }, [isLoaded, isSignedIn, userId, sessionId]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) void flow.current.cancel();
  }, [isLoaded, isSignedIn]);

  const openRecovery = async () => {
    const url = process.env.EXPO_PUBLIC_APP_ENV === 'production'
      ? `https://auth.bickers.co.uk/reset-password${process.env.EXPO_PUBLIC_CLERK_DEPLOYMENT_ROLE === 'pilot' ? '?deployment=pilot' : ''}` : process.env.EXPO_PUBLIC_CLERK_RECOVERY_URL;
    if (!url) throw new Error('Password recovery is not configured for this development build.');
    await Linking.openURL(url);
  };
  return (
    <ClerkFirebaseContext.Provider value={{
      enabled: true, ready: isReady(), loading: !isLoaded,
      uid: bridge.uid, clerkUserId: userId, clerkSessionId: sessionId, hasClerkSession: isSignedIn === true,
      revision: bridge.revision, error: bridge.error, isReady,
      flow: flow.current, flowState, passwordEnabled: user?.passwordEnabled === true,
      startPasswordSignIn: async (email, password) => {
        setBridge(current => ({ ...current, error: null }));
        await flow.current.password(email, password);
      },
      reconcile: options => coordinator.current?.reconcile(options),
      signOutAccount: async () => {
        setBridge(current => ({ ...current, error: null }));
        await flow.current.cancel();
        if (coordinator.current) await coordinator.current.signOut();
        else { await signOut(auth); await clerk.signOut(); }
      },
      openRecovery,
      startBrowserSignIn: async () => {
        await flow.current.cancel();
        try { await startHostedAuth({ mode: 'sign-in' }); }
        catch { if (mounted.current) setBridge(current => ({ ...current, error: 'Browser sign-in was not completed. Please retry.' })); }
      },
    }}>
      {children}
    </ClerkFirebaseContext.Provider>
  );
}
