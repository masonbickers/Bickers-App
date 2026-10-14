# App users and permissions audit — 5 October 2026

Live account and rules checks completed at 2026-10-05T09:04:57.751Z. No production records, credentials or permissions were changed.

## Required app version

- iPhone: 5.0.12 on the production channel, with OTA group `2a84296c-cc37-455b-9a31-97730b471e4b`. Open online, allow the update to download, then fully close and reopen. Earlier runtimes do not receive this update. EAS production publication was re-read during this audit; delivery to individual devices was not verified.
- Android: 5.0.12, version code 21. The 4 October release receipt confirms publication to Google Play internal testers. Install the Play update using the enrolled tester account. Current Play availability was not rechecked during this audit.
- The live API currently enforces only 5.0.4 and Android API 24. This is the configured admission minimum, not evidence that 5.0.4 has the repairs. Android API 24 is Android 7.0.
- Device registration reports the app version but does not report which OTA bundle is running. An up-to-date device version alone cannot confirm OTA application.

## All employee records

“Invited” is approved to attempt login; successful identity synchronization should activate the account. Terms below indicate records found, rather than a device login test. Latest device version is a historical notification registration and may be stale.

| Employee | Mobile access | Identity/account checks | Latest recorded device | Working Terms 1.1 |
|---|---|---|---|---|
| Adam Crossman | Inactive / archived | Inactive | No registration | No record found |
| Adam Eastall | active | Linked; company, approved email and access match | ios 5.0.12 (2026-10-05) | Recorded on legacy identity; resolver must validate linkage |
| Andy Martin | invited | Linked; company, approved email and access match | android 5.0.5 (2026-10-04) | No record found |
| Ben Kerry | active | Linked; company, approved email and access match | ios 5.0.12 (2026-10-02) | Recorded on approved account |
| Brian Naunton | pending | No linked app account | No registration | No record found |
| Darren Short | active | Linked; company, approved email and access match | ios 5.0.12 (2026-10-05) | Recorded on legacy identity; resolver must validate linkage |
| Dave Tyrrell | Inactive / archived | Inactive | No registration | No record found |
| Demo | invited | Linked; company, approved email and access match | No registration | No record found |
| Gary Youngman | pending | No linked app account | No registration | No record found |
| Gavin Murray | pending | No linked app account | No registration | No record found |
| Jamie Evans-Payne | invited | Linked; company, approved email and access match | No registration | No record found |
| Karl Jones | invited | Linked; company, approved email and access match | No registration | Recorded on approved account |
| Liam Hamilton | active | Linked; company, approved email and access match | ios 5.0.12 (2026-10-05) | Recorded on approved account |
| Mason 2Bickers | active | Linked; company, approved email and access match | ios 5.0.12 (2026-10-05) | Recorded on approved account |
| Max Bickers | active | Linked; company, approved email and access match | ios 5.0.12 (2026-10-04) | Recorded on legacy identity; resolver must validate linkage |
| Mel Hadfield | active | Linked; company, approved email and access match | ios 5.0.12 (2026-10-05) | Recorded on approved account |
| Paul  Bickers | invited | Linked; company, approved email and access match | ios 5.0.9 (2026-09-04) | Recorded on legacy identity; resolver must validate linkage |
| Rick Berry | pending | No linked app account | No registration | No record found |
| Sharon Blewitt | pending | No linked app account | No registration | No record found |
| Shaun Brundle | invited | Linked; company, approved email and access match | No registration | No record found |
| Sophie Albrow | pending | No approved app account | ios 5.0.6 (2026-10-03) | Recorded on legacy identity; resolver must validate linkage |
| Tim Rogers | Inactive / archived | Inactive | No registration | No record found |
| Toby Oxley | active | Linked; company, approved email and access match | ios 5.0.9 (2026-09-29) | Recorded on approved account |

## Findings

- 23 employee records: 13 real staff have approved password accounts (8 active, 5 invited), 6 active staff remain pending, 1 demo account is invited, and 3 employee records are inactive or archived.
- Pending staff: Sophie Albrow, Gary Youngman, Brian Naunton, Sharon Blewitt, Gavin Murray and Rick Berry. Sophie has a password identity but no approved mobile status; the other five lack linked app user records.
- Andy Martin, Jamie Evans-Payne and Shaun Brundle have no Working Terms acceptance under any linked user record checked. They must sign to unlock app areas. The demo account has none either.
- Andy’s latest registration is Android 5.0.5 on 4 October. Sophie’s latest is iOS 5.0.6 on 3 October. Toby’s canonical record is iOS 5.0.10 on 7 September (an older alias registered 5.0.9 on 29 September). Their current installations need checking/update; registration records cannot prove current installed versions.
- Signed-in authentication activity alone does not prove successful mobile access: the same Firebase accounts are also used by web sessions.
- Full service, minor service, MOT pre-check and repair form source payloads still omit company ownership. Local emulator checks reproduce denial for serviceRecords, motPreChecks and defectReports payloads without companyId, and denial of direct vehicle lastService completion updates. Updating to 5.0.12 does not fix every workshop completion flow.
- Six enabled historical app user profiles still authorize authenticated anonymous Firestore sessions: Karl Jones, Paul Bickers, Toby Oxley, Darren Short, Adam Eastall and Max Bickers. The app API requires approved password identities, but the Firestore account predicate does not require mobile approval or reject the anonymous provider. Disabled historical Ben/Mason identities and unlinked anonymous identities are separate and were not included as usable accounts. Account retirement or a reviewed rules change is needed to close this legacy access; none was applied during the audit.
- Rules grant administrator roles broad service access even when the explicit service flag is false. Toby and Mel have that flag false; treat it as app workspace visibility, not a database security boundary.

## Verification and limits

- Live Firestore and primary Storage source hashes match firebase/mobile-compat exactly. Firestore: `e7bdf3b4bdea04b7c814f1f7ada7e54642aa49ae6505173520c736ba19f9534b`; Storage: `a4901dbee651b7fa3792586472fd5066d76a61f79392dc5be8361e249beaf690`.
- Application tests: 503 passed, 1 skipped, 0 failed.
- Existing local Firestore/Storage permission matrix: 11 passed, 0 failed. Covers own timesheets/legacy weeks, profile phone updates, vehicle checks/issues, upload ownership/MIME, tenant isolation, immutable submissions, disabled/unapproved/stale-password sessions and trusted web identity.
- Additional exact-live-rules matrix: 4 passed, 0 failed (including expected failure reproductions); see output/permissions-audit-20261005/extra-permissions.log. Checks employee collection reads, tenant query isolation, holiday/recce creates, service role isolation, workshop failure reproductions and six live legacy profiles.
- 26 Firestore user profiles, 23 employee records, 557 Firebase Auth identities and 24 device registrations were read. 531 Auth identities lack a corresponding app user profile and email; they were not counted as staff accounts.
- No staff credentials were used, no account was impersonated in production, and no authenticated phone smoke test was performed. Emulator authorization and profile consistency cannot certify every employee’s device/network/notification permission or every end-to-end workflow.
- Source-based app tests include assertions against older root rules; the deployed-rule claims above rely on the separate exact-live-rules emulator checks, not those source assertions.
