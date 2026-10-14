# Workshop submission permission audit — 5 October 2026

Checked the live `bickers-booking` Firestore release and primary Storage release. Both match `firebase/mobile-compat` exactly: Firestore ruleset `0573ad89-0476-4a2b-bb71-41792cd3af3a`, Storage ruleset `bf056989-e840-43a4-9400-8516a7eb9fa9`.

Read only company, role, enabled, app-access and password-setup fields from the 26 user accounts. Nine enabled accounts have service-workspace access, including six administrators. All nine have company IDs and none has `appPasswordSetupRequired: true`. This checks account flags; it does not certify an individual device's token/session freshness.

## Confirmed blockers

| Submission step | Current app behavior | Deployed rules result |
| --- | --- | --- |
| General repair record | `repair-form.jsx` creates `serviceRecords` without `companyId` | Denied for service users and admins |
| Service sheet record | `service-form/[id].jsx` creates `serviceRecords` without `companyId` | Denied for service users and admins |
| Unrepaired service defects | Creates `defectReports` without `companyId` | Denied |
| Service photos | Uploads to `serviceRecords/{recordId}/overall/...` or `/checks/...` | No matching allow rule; denied |
| Vehicle service completion | Directly writes `lastService` and `serviceHistory` | Denied; these completion fields are server-owned |
| Editing signed sheets | Directly updates a record with existing `signedBy` | Denied; only unsigned drafts are editable |

The rules permit new same-company service and repair records for valid service users and administrators. Ordinary user-workspace access alone does not authorize them. Tests also confirm same-company repair-history/mileage writes are permitted, foreign company/vehicle references are denied, and the existing `companies/{companyId}/vehicles/{vehicleId}/{field}/...` image path is permitted.

These are app/write-contract problems even for accounts with service access. Granting extra roles alone does not fix them. General repairs need authenticated company ownership on their records. Service sheets additionally need company ownership on defects, a permitted company-scoped upload path, and integration with the authenticated server completion workflow. Retain the existing protections on legal-maintenance fields and signed records.

## Verification

Ran ten emulator audit tests against freshly downloaded live rules: 10 passed, 0 failed. The tests explicitly assert the current rejected writes and permitted alternatives. No production business records were submitted, no user permissions were changed, and no app or rules changes were deployed.

Audit script: `tmp/workshop-permissions/audit.test.cjs`. Log: `tmp/workshop-permissions/audit.log`. Account counts: `tmp/workshop-permissions/account-summary.json`.

Repeat after refreshing the downloaded rules:

```sh
node scripts/run-with-jdk21.mjs -- firebase emulators:exec --only firestore,storage --project demo-mobile-permissions --config firebase.mobile-permissions-test.json 'node --test --test-concurrency=1 tmp/workshop-permissions/audit.test.cjs'
```
