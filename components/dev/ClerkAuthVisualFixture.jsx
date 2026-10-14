import { useState } from 'react';
import PageShell from '../layout/PageShell';
import BickersLoginForm from '../auth/BickersLoginForm';

// Presentation only: this fixture cannot create a Clerk/Firebase session.
export default function ClerkAuthVisualFixture({ state = 'password' }) {
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [code, setCode] = useState('');
  const [notification, setNotification] = useState(null);
  const challenge = ['totp', 'email', 'backup'].includes(state);
  const clerk = {
    enabled: true, hasClerkSession: state === 'bridge-error',
    error: state === 'bridge-error' ? 'Your app session could not be verified. Check your connection or sign in again.' : null,
    flowState: { step: challenge ? 'challenge' : state === 'error' || state === 'bridge-error' ? 'password' : state,
      factor: state === 'email' ? 'email_code' : state === 'backup' ? 'backup_code' : 'totp',
      factors: ['totp', 'email_code', 'backup_code'], busy: false,
      error: state === 'error' ? 'Unable to sign in. Check your details and try again.' : null },
    startPasswordSignIn: async () => {},
    openRecovery: async () => {}, startBrowserSignIn: async () => {}, signOutAccount: async () => {}, reconcile: async () => {},
    flow: { selectFactor: async () => {}, verify: async () => {}, resend: async () => {}, cancel: async () => {} },
  };
  return <PageShell mode="form" width="full"><BickersLoginForm {...{ clerk, employeeEmail, setEmployeeEmail, password, setPassword, passwordVisible, setPasswordVisible,
    code, setCode, loading: false, resetting: false, notification, setNotification,
    handleLogin: () => setNotification({title:'Fixture',message:'Presentation preview only.',tone:'info'}),
    handlePasswordReset: () => setNotification({title:'Fixture',message:'Presentation preview only.',tone:'info'}) }} /></PageShell>;
}
