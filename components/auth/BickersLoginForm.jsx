import React from 'react';
import { StyleSheet, View } from 'react-native';
import BrandArtwork from '../renderers/BrandArtwork';
import { AppButton, AppText as Text, Banner, FormField, SelectField } from '../ui/AppPrimitives';
import { designTokens as t } from '../../lib/design/tokens';
import { openPrivacyPolicy } from '../../lib/privacyPolicy';

export default function BickersLoginForm({ clerk, employeeEmail, setEmployeeEmail, password, setPassword, passwordVisible, setPasswordVisible, code, setCode, loading, resetting, notification, setNotification, handleLogin, handlePasswordReset }) {
  return (
    <>
      <View style={styles.scrollContainer}>
        <BrandArtwork variant="login" />

        <Text variant="titleSmall" align="center" layoutStyle={styles.title}>
          Welcome to Bickers Action
        </Text>

        <View style={styles.section}>
          <Text variant="sectionTitle" align="center" layoutStyle={styles.sectionTitle}>
            Sign In
          </Text>

          {(!clerk.enabled || clerk.flowState.step === "password") && !clerk.hasClerkSession ? <>
          <FormField
            label="Work email"
            placeholder="Work email"
            value={employeeEmail}
            onChangeText={setEmployeeEmail}
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: false,
              spellCheck: false,
              autoComplete: "email",
              textContentType: "emailAddress",
              keyboardType: "email-address",
            }}
          />
          <FormField
            label="Password"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            rightAction={{
              label: passwordVisible ? "Hide password" : "Show password",
              icon: passwordVisible ? "eye-off" : "eye",
              onPress: () => setPasswordVisible((visible) => !visible),
            }}
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: false,
              autoComplete: "password",
              textContentType: "password",
              secureTextEntry: !passwordVisible,
              onSubmitEditing: handleLogin,
            }}
          />
          </> : null}

          {clerk.enabled && clerk.flowState.step === "challenge" ? <>
            {clerk.flowState.factors.length > 1 ? <SelectField
              label="Verification method"
              value={clerk.flowState.factor}
              options={clerk.flowState.factors.map(value => ({ value, label: ({ totp: "Authenticator app", email_code: "Email code", phone_code: "Text message", backup_code: "Backup code" })[value] }))}
              onChange={value => { setCode(""); void clerk.flow.selectFactor(value); }}
              disabled={clerk.flowState.busy}
            /> : null}
            <FormField label={clerk.flowState.factor === "backup_code" ? "Backup code" : "Verification code"}
              value={code} onChangeText={setCode} disabled={clerk.flowState.busy}
              hint={({totp:"Enter the code from your authenticator app.",email_code:"Enter the code sent to your work email.",phone_code:"Enter the code from your text message.",backup_code:"Enter one of your unused backup codes."})[clerk.flowState.factor]}
              inputProps={{ autoCapitalize: "none", autoCorrect: false, autoComplete: "one-time-code", textContentType: "oneTimeCode", keyboardType: clerk.flowState.factor === "backup_code" ? "default" : "number-pad", onSubmitEditing: () => clerk.flow.verify(code) }} />
            <AppButton label="Verify and sign in" fullWidth loading={clerk.flowState.busy} onPress={() => clerk.flow.verify(code)} />
            {["email_code", "phone_code"].includes(clerk.flowState.factor) ? <AppButton label="Send a new code" variant="ghost" fullWidth disabled={clerk.flowState.busy} onPress={() => clerk.flow.resend()} /> : null}
          </> : null}
          {clerk.enabled && clerk.flowState.step === "browser" ? <>
            <Banner tone="info">Your account needs another security check. Continue in the secure browser to finish signing in.</Banner>
            <AppButton label="Continue in browser" fullWidth onPress={clerk.startBrowserSignIn} />
          </> : null}
          {clerk.enabled && clerk.flowState.step === "recovery" ? <>
            <Banner tone="info">Choose a new shared account password on the secure account page, then return here to sign in.</Banner>
            <AppButton label="Open password recovery" fullWidth onPress={handlePasswordReset} />
          </> : null}
          {clerk.enabled && clerk.flowState.step !== "password" && !clerk.hasClerkSession ? <AppButton
            label="Cancel verification" variant="ghost" fullWidth onPress={async () => { await clerk.flow.cancel(); setCode(""); setPassword(""); }} /> : null}
          {clerk.enabled && (clerk.flowState.error || clerk.error) ? <Banner tone="danger" icon="alert-circle">{clerk.flowState.error || clerk.error}</Banner> : null}
          {clerk.enabled && clerk.hasClerkSession ? <>
            <AppButton label="Retry account access" fullWidth onPress={() => clerk.reconcile({ requireFresh: true })} />
            <AppButton label="Use a different sign-in" fullWidth variant="ghost" onPress={clerk.signOutAccount} />
          </> : null}


          {notification ? (
            <Banner
              title={notification.title}
              tone={notification.tone}
              icon={notification.tone === "danger" ? "alert-circle" : "info"}
              onDismiss={() => setNotification(null)}
            >
              {notification.message}
            </Banner>
          ) : null}

          {(!clerk.enabled || clerk.flowState.step === "password") && !clerk.hasClerkSession ? <>
          <AppButton
            label={loading ? "Signing in..." : "Sign In"}
            pill
            onPress={handleLogin}
            loading={loading}
            disabled={resetting || clerk.enabled && !clerk.startPasswordSignIn}
            fullWidth
          />
          <AppButton
            label={resetting ? "Please wait..." : "Forgot password?"}
            variant="ghost"
            onPress={handlePasswordReset}
            disabled={loading || resetting || clerk.enabled && !clerk.openRecovery}
            fullWidth
          />
          </> : null}

          <Text tone="secondary" align="center" layoutStyle={styles.helperText}>
            Access must be approved by a Bickers administrator before you can sign in.
          </Text>
          <AppButton
            label="Privacy policy"
            variant="ghost"
            onPress={openPrivacyPolicy}
            fullWidth
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: t.spacing["2xl"],
    paddingVertical: t.spacing["2xl"],
  },
  title: {
    marginBottom: t.spacing.xl,
  },
  section: {
    width: "100%",
    maxWidth: 420,
    gap: t.spacing.md,
  },
  sectionTitle: {
    marginBottom: t.spacing.sm,
  },
  helperText: {
    marginTop: t.spacing.xs,
  },
});
