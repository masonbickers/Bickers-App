// Local testing only. Never selects a real Firebase project or deploy command.
const {spawnSync}=require('node:child_process');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const rollback=process.argv.includes('--rollback');
const candidate=rollback?'firebase/security-rollback-2026-10-14':'firebase/security-remediation-2026-10-14';
const tests='node --test --test-concurrency=1 tests/security*.rules.test.cjs tests/timesheetPermissions.rules.test.cjs tests/mobileOtherPermissions.rules.test.cjs tests/vehicleCheckDraftRead.rules.test.cjs';
const result=spawnSync(process.execPath,['scripts/run-with-jdk21.mjs','--','firebase','emulators:exec','--only','auth,firestore,storage','--project','demo-bickers-security-remediation','--config',rollback?'firebase.security-rollback-test.json':'firebase.security-remediation-test.json',tests],{
 cwd:root,stdio:'inherit',env:{...process.env,SECURITY_TEST_PROJECT_ID:'demo-bickers-security-remediation',MOBILE_RULES_PATH:`${candidate}/firestore.rules`,MOBILE_STORAGE_RULES_PATH:`${candidate}/storage.rules`,SECURITY_FIRESTORE_RULES:`${candidate}/firestore.rules`,SECURITY_STORAGE_RULES:`${candidate}/storage.rules`},
});
if(result.error)console.error(result.error.message);
process.exit(result.status??1);
