# Bickers launch checklist — 13 October 2026

Scope: the internal Expo employee operations app for iPhone and Android, Firebase project `bickers-booking`, and the production Render mobile API. User confirmed there is no browser deployment or payment requirement. This is not an audit of the separate Next.js bookings, marketing or software projects. The checklist is not fully complete, and this document is not a production release approval.

Code changes are local and have not been submitted to EAS, published as an OTA update, or deployed to Render/web hosting. The Firebase password-reset email display name and reply-to changes below were applied live and read back successfully.

| Requested item | Result and remaining work |
| --- | --- |
| Error monitoring and uptime alerts | Better Stack recurring API monitoring configured live on 13 October: checks `/health` every 3 minutes and requires `"ok":true`. Monitor reports Up. Email alerts enabled; sole team member verified as Mason at `mason@bickers.co.uk`. Better Stack confirmed sending a test alert, and Mason confirmed receipt. Sentry SDK and EAS source-map uploads configured locally; synthetic ingestion and alert trigger verified. Native release/device crash acceptance and Sentry mailbox delivery remain pending. Health is a process check, not database readiness or a full employee journey. |
| Wipe test data | No production data was deleted. User explicitly requested keeping `demo@bickers.co.uk`, which remains needed for Apple review. Other test records have not been positively identified. Emulator fixtures and test files are isolated development data and should not be wiped from source. Identify exact production records before deletion. |
| Switch Stripe keys to live | Not applicable to this app as inspected: no Stripe integration, payment keys or checkout flow found. |
| Test signup through payment | Not applicable: approved employees sign in; this app has no public registration or payment journey. Previous reviewer sign-in evidence is in `apple-demo-login-2026-10-13.md`; this task did not perform fresh physical-device login acceptance. |
| Password reset | Existing login/settings use Firebase reset email. The isolated Auth emulator test passed the full request, reset, and new-password sign-in flow while preserving the UID. This does not prove live mailbox delivery or reset on the submitted native binary. No live password was changed. |
| Kill localhost URLs | Release API and sync bridge URL validation now rejects HTTP, loopback destinations including IPv6, and embedded credentials. Finance links require public HTTPS. EAS production/internal use the Render HTTPS API. Test/emulator URLs and Firebase's development authorized domain remain intentionally available. |
| Replace default favicon | Not a native release requirement. The optional web build already has a custom Bickers B image; visually inspected. |
| Social preview image | Not a native release requirement. Prepared an optional web asset using the supplied Bickers Action logo. There is no browser deployment to configure; no web origin is needed for the current native release. |
| Send emails from own domain | Not complete. Live Firebase email method is `DEFAULT`; custom domain state is `NOT_STARTED`. Reset emails now display “Bickers Action” and reply to `mason@bickers.co.uk`, verified by a fresh configuration read. An external company manages domain/email; Mason will contact them. From-domain verification/SMTP and DNS setup are still required. A reply-to address is not a custom From domain. |
| Search for lorem ipsum | No matches in application, component, provider, library or server source. |
| Strip console logs | Removed application debug `console.log` calls, including scheduled notification contents and employee code output. Kept error/warning diagnostics and CLI tooling output. Server startup now reports a port without a localhost URL. |
| Metadata on every page | Shared web metadata supplies route titles, descriptions, social text and `noindex, nofollow` for employee pages. Added `lang="en-GB"` to the document shell and disabled Router's public sitemap. Export validation checked every generated application HTML page for one nonempty title, description, robots policy and language. Native screens do not need web SEO tags. |
| Track signup and activation | No public signup to track. Existing production login code records `mobileAccess.activatedAt` once and updates `mobileAccess.lastLoginAt` and `auth.lastLoginAt`. These are operational timestamps, not a conversion dashboard or verified event analytics pipeline. |
| AI key spending cap | Not applicable to this app as inspected: no AI provider integration or AI key configuration found. Any unrelated account/API usage was not changed. |
| Connection forwarding and Switchboard risky features | Unidentified service/settings; user was unsure. No dependency on these features found in this app. Nothing enabled. |
| Status page | Published on Better Stack at https://bickers-app.betteruptime.com, verified without login. Displays generic Bickers app service availability and links support to Mason. Automatic detailed incident reports disabled. Monitoring history begins today. |
| Support email actually checked | User confirmed `mason@bickers.co.uk`. Help Centre now uses it and no longer lets generic company-email settings replace it. Firebase password-reset reply-to was also changed live. Mailbox access and staffed response coverage were not tested. |

## Verification and release blockers

- `npm test`: 533 passed, zero failures, one skipped emulator test. The skipped test was separately run through `firebase emulators:exec` and passed.
- Corrected the test runner to include `--experimental-vm-modules`, required by the existing session-gate tests. The original command failed three tests because `vm.SourceTextModule` was unavailable.
- `npm run build:web`: successful export. Metadata was inspected in the generated HTML, rather than inferred from source alone. Social-image asset is present in the export.
- New metadata/URL helpers and changed URL wiring pass targeted ESLint checks.
- Full `npm run lint` remains red: **2,070 errors and 71 warnings**, largely existing design-system rule violations. These must be addressed or explicitly triaged before claiming the full project passes release checks. Existing `spec-sheets.js` styling violations also remain; removing its debug log did not repair those.
- No app deployment, live payment, live password change, test-data deletion, paid monitoring upgrade, or unidentified feature toggle occurred. Better Stack monitoring and its hosted status page were configured live.

Still needed: resolve lint failures; ship and validate the Sentry-enabled native build; verify a domain email sender and live inbox delivery; deploy the local fixes; and perform device acceptance on the actual release binary. Delete only specifically identified test records while preserving the reviewer account.

Firebase email configuration fields were checked against the [Identity Platform configuration reference](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/Config).

## Confirmed follow-up scope

Alerts go to `mason@bickers.co.uk`. No monitoring service currently exists. Domain/email changes need coordination with the external company. Public signup, checkout, Stripe and web-only presentation tasks are outside the native internal app release scope. A provider enquiry draft is in `email-provider-request.md`; it has not been sent.

## Additional user decisions

- Automated email From address: `noreply@bickers.co.uk`; reply-to remains `mason@bickers.co.uk`. The requested From domain is not enabled until provider/DNS verification is complete.
- Status page: accessible to anyone with its link, with generic service status only. Do not include employee information, internal records, stack traces or operational incident details.
- Live password-reset test account: Mason authorised using `mason@bickers.co.uk`; keep the Apple reviewer account unchanged.

Live reset request: verified that Mason’s Firebase account exists and is enabled, then requested one password-reset email. Firebase accepted the request. No password was changed by the agent. Mason reports no email received. Live inbox delivery has therefore not passed; reset completion and app sign-in remain untested.

## Missing reset-email investigation

- Fresh Admin SDK lookup confirmed `mason@bickers.co.uk` is enabled, email verified, and has `password` and `phone` providers.
- Fresh project configuration confirms password login enabled, improved email privacy enabled, default Firebase email service, and custom sender-domain setup not started.
- DNS MX lookup found `mx01.hornetsecurity.com` through `mx04.hornetsecurity.com`. This identifies the inbound mail gateway, not proof of a filtering failure or the downstream mailbox host.
- External provider message now asks for a mail trace and quarantine/downstream mailbox check. The cause cannot be established without those delivery records. No further reset request, mailbox policy change or password change was performed during this investigation.
- Mason will create/sign into Bickers-owned Sentry and Better Stack accounts. Better Stack access was subsequently provided and its uptime/status setup completed below. Sentry setup was subsequently configured as recorded below.

## Better Stack live setup — 13 October 2026

- Monitor: **Bickers App API**, ID `5063732`, [manage monitor](https://incidents.betterstack.com/team/t614500/monitors/5063732).
- Target: `https://bickers-mobile-api.onrender.com/health`, HTTP GET; fail when response does not contain the literal `"ok":true`.
- Frequency: 3 minutes; failure confirmation: 1 minute; recovery confirmation: 3 minutes; request timeout: 1 minute to accommodate cold starts. SSL validation enabled and redirects disabled.
- Email alerts enabled. Free-plan on-call settings notify the team; verified team has exactly one member, Mason Bickers, `mason@bickers.co.uk`. Holiday mode is off. Better Stack visibly confirmed sending a test alert; Mason confirmed receipt at `mason@bickers.co.uk`. Alert email delivery is verified.
- Public status page: [Bickers App status](https://bickers-app.betteruptime.com), ID `267199`. Verified in a separate anonymous browser. It currently shows services online.
- Public component: **Bickers app services**. Generic description only, no employee information. Contact link is `mailto:mason@bickers.co.uk`. Automatic incident reports disabled.
- Status-page history starts today; its initial 100% display is not evidence of 90 days of monitoring.
- Existing `bickers.co.uk` monitor was preserved but removed from this app's status-page components. Organization name was preserved. No paid upgrade, SMS/call alerts, custom domain, API token, app SDK or credential was added.
- Screenshot: `output/bickers-status-page-2026-10-13.png`.

## Sentry setup — 13 October 2026

- Existing organisation `aurex-design`, project `react-native`, ID `4512249010782288`, retained. No paid upgrade or unrelated project changes.
- Official Expo 55-compatible `@sentry/react-native` 7.11.0 installed. Root layout wrapped; Expo plugin and Sentry Metro configuration added while preserving existing resolver settings.
- Monitoring enabled in release builds only. Replay, tracing, logging, screenshots, view hierarchy, breadcrumbs, and automatic session tracking disabled. Default PII collection disabled. JavaScript event filtering removes identity, request data, extra context, arbitrary tags, messages and exception values while preserving diagnostic stack frames and source-map identifiers. Native reports use native SDK privacy options; native crash behavior still needs device validation.
- App version advanced from `5.0.12` to `5.0.13`: this native dependency requires new binaries. With the existing appVersion runtime policy, the new version prevents OTA updates containing Sentry from targeting older binaries. No build submitted or OTA published.
- User approved the `org:ci` organisation token named **Bickers app EAS source maps**. Stored only in ignored `.env.local` (permissions 0600), and as sensitive project-scoped `SENTRY_AUTH_TOKEN` in EAS production and preview environments for `@masonbickers/bickers-app`. No public environment variable contains it.
- iOS and Android Hermes bundles/source maps exported and uploaded successfully. Token permission and source-map upload path verified; this is not a signed native binary or a device crash test.
- Synthetic event `a881efb5790b41e28e6575173f60861c` accepted by Sentry HTTP 200. [BickersMonitoringSetup issue](https://aurex-design.sentry.io/issues/153360903/?project=4512249010782288) visible with privacy filtering. Synthetic script uses no employee data and is manual only.
- [Issue alert](https://aurex-design.sentry.io/monitors/alerts/1367731/?project=4512249010782288), ID `1367731`: all environments for this project; new, resolved, escalated and regressed issues; direct member notification to Mason's `mason@bickers.co.uk` account. Account Issue Alerts is On and Delivery Method is Email; primary email confirmed. History shows one trigger for the synthetic error at 12:57 UTC / 13:57 BST. Mason reported no email received. Alert delivery is not verified; provider tracing remains needed.
- Final `npm test`: 543 pass, 1 fail, 1 skipped (545 total). The unrelated failure is `detail pages slide while footer-tab switches remain immediate` in `tests/appChrome.test.js:73`, whose source-text expectation no longer matches the current reduced-motion/platform animation expression in the protected layout. That file was not changed by this Sentry task. The release-runtime test was updated to require a runtime newer than 5.0.12. New privacy tests pass and cover request/identity removal and preservation of source-map diagnostics. Targeted ESLint passed. Web export passed; final iOS/Android Hermes export passed and matching source maps uploaded. Existing full-project lint blockers remain as documented above.
- Dependency installation reported 44 audit findings (7 moderate, 36 high, 1 critical) for the full dependency tree. This task did not apply broad dependency upgrades; dependency audit triage remains required before claiming a clean release.
- Initial `expo install` installed the dependency but automatic plugin addition failed due to a missing Expo CLI file. Configuration was applied manually; successful exports validate the resulting bundle configuration.
- Screenshot: `output/bickers-sentry-alert-2026-10-13.png`.

Next release: build `5.0.13` through EAS, validate a controlled error/native crash on actual iOS and Android binaries, confirm source-map symbolication and mailbox delivery, then complete the normal release review. For an OTA update after the native release, upload its matching source maps using `npx sentry-expo-upload-sourcemaps dist`.
