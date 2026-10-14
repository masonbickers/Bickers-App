# App Store review check — 7 October 2026

Verdict: submission configuration and the prior photo-permission repair are verified. Reviewer sign-in and full native access are not verified, so this is not an approval prediction or a complete physical-device acceptance test.

## Apple review status

Bickers, Apple ID 6754837128, version 5.0.12, build 90. Submission ed093135-6b97-492e-a0d9-53d060f12a80 shows Unresolved Issues; its app item is Ready for Review. Resubmit to App Review is available. Nothing was resubmitted, published, withdrawn, or changed during this audit.

Apple's 30 September review of build 90 could not sign in with the supplied account (Guideline 2.1). The 19 September review of build 87 requested a more specific photo-library purpose string (Guideline 5.1.1(ii)). The later sign-in failure does not prove Apple finished reviewing every other feature.

## Confirmed checks

| Area | Evidence and result |
| --- | --- |
| Binary | Apple shows Validated, correct bundle ID com.bickers.booking, build 90, iPhone and iPad, minimum iOS 15.1, non-exempt encryption No. |
| Exact downloaded artifact | EAS production build 0964151d-4a4d-4c81-8e0f-bcfdf100614a, completed, version 5.0.12/build 90. Downloaded IPA identity and version match Apple metadata. SHA-256 a4eb96770462fd9479a983420309bc7295f8ababa242e5d8005abae3ed417ed7. |
| Photo purpose | Packaged string: “Bickers uses photos you select from your library to attach receipts to expenses, profile photos to your account, and vehicle or job photos to work records.” Existing IPA verification script passed. |
| Other permissions | Specific camera purpose string, no microphone purpose key, arbitrary network loads disabled. 15 privacy manifests present; required-reason API declarations in aggregate manifest. This is manifest inspection, not independent validation of every declaration. |
| Packaged environment | Production API and public privacy-policy URL found; localhost:3002 API marker absent. Production update channel and runtime 5.0.12. |
| Production updates | Active production channel maps to production branch. Latest reported iOS update group d71a0ec9-0218-4cd9-955b-83293b629d44, runtime 5.0.12, 5 October: consistent 44-point filters. Installation on the reviewer device is unverified. |
| Listing | Description, promotional text, keywords, copyright, support/marketing URLs populated. Employee-only approved access accurately explained; review notes describe unlisted distribution and photo fix. Optional subtitle/header absent. |
| Screenshots | Four existing iPhone images and one iPad image observed. No exhaustive screenshot-to-current-OTA comparison performed. |
| Privacy | Published label has 10 types: Name, Email Address, Phone Number, Other Financial Info, Emails or Text Messages, Photos or Videos, Other User Content, User ID, Device ID, Purchase History; all shown linked to user and used for app functionality. Public privacy policy loads without authentication. Links exist in native source login and Settings and in packaged bundle. |
| Privacy scope | Public policy also covers wider web personnel records and web usage monitoring. Native source scan did not establish collection of personnel health/identity documents or page monitoring. Those policy mentions alone do not establish a missing native privacy-label category. SDK manifests inspected showed no collected-data declarations or tracking enabled; this does not replace a complete server/SDK behavior audit. |
| Age rating | Calculated global 4+; Messaging and Chat Yes, unrestricted browsing/ads/social feeds/broad UGC No. Remaining mature/medical/sexual/violence/gambling content answers None/No. Questionnaire inspected and cancelled without saving. |
| Distribution | Unlisted URL configured; United Kingdom is the only available country. UK price £0.00. Manual release selected. |
| Agreements | Free Apps Agreement Active, displayed effective period 11 September–15 October 2026. Digital Services Act Active. Paid Apps Agreement New; no configured in-app purchase/subscription items observed. |
| Backend | Public health endpoint returned ok true/service bickers-api. App config returned minimum app version 5.0.4 and minimum Android SDK 24; build 90 meets version admission. Health does not verify authenticated services. |
| Current source tests | With NODE_OPTIONS=--experimental-vm-modules: 529 passed, 0 failed, 1 skipped. First ordinary run had 3 failures because vm.SourceTextModule requires that runtime setting, not because the assertions failed. Skipped test requires Firebase Auth emulator. |
| Current source TypeScript | tsc --noEmit passed. |

## Findings that need attention

1. **Reviewer access remains unverified.** Browser observations substitute `<redacted>` for the username/password/contact fields, including in read-only DOM evaluation. Therefore this audit cannot determine the actual saved username/password, compare them with the rejected pair, or use them for sign-in. Earlier commentary suggesting the credentials changed or that the username was invalid was based on this masking and is withdrawn. No credential value or fingerprint derived from the placeholder is evidence about the real account. A sign-in permission question was issued, but no approval or actual login occurred in this run.
2. **Historical dedicated Demo account may encounter access gates if selected for review.** A fresh read-only Firebase check of the employee named Demo found an enabled password identity, approved invited status, correct company/employee links, employee workspace access, service workspace disabled, and no current Working Terms 1.1 acceptance. Password setup was not required. This account has not been established as the currently saved review account. If used, verify the actual post-login experience and provide appropriate access to reviewable features without inventing signatures or bypassing controls.
3. **Source quality checks are not fully clean.** Current checkout lint reports 2,070 errors and 71 warnings, dominated by existing shared design-system migration rules. This is not a count of reproduced runtime crashes. The working tree has many pre-existing changes, so current source checks do not certify the exact shipped or OTA bundle.
4. **Dependency maintenance is outstanding.** Fresh npm audit --omit=dev reports 38 affected package entries: 1 critical, 31 high, 6 moderate. Critical shell-quote 1.10.0 comes through react-native -> react-devtools-core; advisory GHSA-pqg4-j6r4-53mv describes command injection in quote(). This is not proof that the release binary exposes the vulnerable function. Do not apply npm audit force downgrades suggested for Expo/Firebase; assess compatible fixes and deployed/runtime reachability separately. Audit did not modify dependencies.
5. **Mac and Vision Pro distribution are enabled but untested here.** Apple Silicon compatibility is not marked manually verified. Keep these enabled only with appropriate compatibility testing.

## Remaining acceptance work before a readiness sign-off

Use the actual saved review credentials on a fresh installation of build 90, allow any compatible production update to load, and verify login, password/terms gates, employee and any service features included in the review scope, populated demo jobs/schedule, contacts, timesheets, holiday requests, documents, permissions, attachment capture/upload, sign-out, and cold relaunch. Avoid creating production work records during read-only QA. Physical camera, push notifications, offline recovery, actual iPhone/iPad rendering, Mac and Vision Pro were not exercised in this audit. No native simulator target was available through the computer-use tool.

Once reviewer access is verified, address the latest 2.1 issue and resubmit. Apple's final approval cannot be guaranteed.

[Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
[Apple privacy category definitions](https://developer.apple.com/app-store/app-privacy-details/)

Evidence: output/app-store-review-20261007/build90-inspection.json and the downloaded IPA. Fresh test/lint/TypeScript/dependency logs are copied into that evidence folder. Reviewer credentials and private contact details are omitted.
