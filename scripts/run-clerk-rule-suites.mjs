import { spawnSync } from 'node:child_process';
const projectId = process.env.GCLOUD_PROJECT;
if (!/^demo-/.test(projectId || '')) throw new Error('A demo emulator project is required.');
const base = { ...process.env,
  CLERK_FIRESTORE_RULES: 'firebase/clerk-auth/firestore.rules', CLERK_STORAGE_RULES: 'firebase/clerk-auth/storage.rules',
  SECURITY_FIRESTORE_RULES: 'firebase/clerk-auth/firestore.rules', SECURITY_STORAGE_RULES: 'firebase/clerk-auth/storage.rules',
  MOBILE_RULES_PATH: 'firebase/clerk-auth/firestore.rules', MOBILE_STORAGE_RULES_PATH: 'firebase/clerk-auth/storage.rules',
};
for (const suite of ['clerkSessionAccess', 'securitySessionRecovery', 'mobileOtherPermissions', 'timesheetPermissions']) {
  const result = spawnSync(process.execPath, ['--test', `tests/${suite}.rules.test.cjs`], { env: { ...base, SECURITY_TEST_PROJECT_ID: projectId }, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
