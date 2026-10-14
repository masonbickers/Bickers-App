# Shared vehicle preparation — compatible production release

14 October 2026. User authorized deployment after the local implementation. This release covers the diary read integration, mobile status/pending presentation and outbox acknowledgement reliability. Existing production completion writers remain in use. New revisioned transaction writers, statusEvents and candidate rules remain disabled; historical reconciliation/import is excluded.

## Mobile publication

Both production OTA updates target existing runtime 5.0.12, with the exact native dependency/configuration baselines from the previous 5 October platform-specific releases. No source from the unrelated dirty working tree was bundled.

- iOS group `99acb9eb-3d29-4602-9837-fea75b32dd2b`, update `01a139d2-587b-7c88-ae70-d27874054809`.
- Android group `ee68c1b3-7934-47ae-8157-ca7f7b8f1405`, update `01a139d2-664e-7966-9b22-0c254b6ea5d2`.
- Delivered manifests identify those exact updates; CDN bundle bytes equal the tested exports. iOS SHA256 `bb3f4543e358343250f37a6429878396593f33e8baeae6d18076dcfce6a20137`; Android `c1c1eea88555635656b5f8ae02b5e3aafa49ee47f2f72b344806231413246e04`.
- Each isolated mobile source suite:543pass,1skip,0fail; focused21pass; TypeScriptpass. Mobile lint retains the published source baseline98errors,0warnings with identical rule counts.
- Explicit export environment disables demo/visual/new-writer flags and uses the production API. The first EAS attempt stopped before upload because isolated snapshots lacked Git metadata; initialized/committed snapshots then published successfully.

## Web source and release checks

Reconstructed every current live application source file using its Vercel content hash. Existing549generated out/ artifacts were excluded; no application source was omitted.946submitted files; only9changed/additions, comprising2dashboard files,4reader utilities and3ProjectControlrecords. Prep-list, booking modal, layoutCSS, configurations, dependencies and Firestore policy remain unchanged.

Initial candidate `dpl_Fg3oFaukmHi9h3Dm3Peb8NiE91he` built and promoted successfully; the live PoolVan tooltip showed Mason2Bickers and14October09:02:01. Postrelease comparison caught equipment icons losing shared records because the existing equipment renderer still needed the disabled legacy listener. Restored original `dpl_9bSrvtvkdbpBpPHsMW3SFtVXYcet` immediately. No record writes or data rollback.

Correction bridges the new shared subscription back into the existing merged equipment map, preserves the original feature-flag fallback and equipment history, and leaves equipment matching/render functions untouched. Two regression tests fail before this bridge and pass afterward. Corrected web focused38pass; scoped lint/TypeScriptpass. Independent reviewer `/root/release_review` accepted corrected source scope, with actual uploaded hashes/hosted checks still required. Corrected candidate `dpl_8zdpQEoySFFRKea2PMtiyp32QTvL` is building at time of this entry.

## Preserved security and remaining limits

Active Firestore rules remain ruleset `5ee25047-09c8-4edf-99ec-2a41b4732ad2`, SHA256 `98b8d86c9acc61c92d5aa60efb6fba17a076ff383615ce193d42db723f833a1e`, confirmed with fresh read-only provider lookup. No rule deployment, deletion, migration, production test completion or historical backfill.

Full production write rollout requires a production gate, handling old revisionless offline operations, supported-client cutover and actual native/authenticated writer acceptance. Publishing strict rules now would reject older installed clients. Native installation/update adoption, physical-device offline/background replay and full prep-list/modal writer roundtrips are unverified. Observed live PoolVan completion is an existing real completion; no new production prep was performed by this release.

Automatic approval review rejected Vercelproduction environment download because it could copy secrets into the release directory. Used provider-side remote builds instead; no production environment file was downloaded. Expo CDN verification initially lacked protocol-supplied authorization headers; using the manifest assetRequestHeaders in memory verified exact delivery, without logging credentials. PythonCAstore also failed validation; curlused the functioning system store withTLSverification enabled.

Evidence and platform source archives: `output/shared-vehicle-prep-release-20261014/`; task staging: `/private/tmp/prep-release-20261014/`. Prior scoped implementation and read-only962section reconciliation remain unchanged.

## Second controlled check and final correction

Candidate8zdp was Ready with946exact provider hashes and staged healthOK. Separate preview auth required login, so independent review accepted controlled primary promotion using the genuine session, with immediate restore on any failed validation. The check caught `ReferenceError: mergePrepRecordSources is not defined` in local-storage hydration; the correction had replaced that import although the original hydrate effect still used it. Original primary was restored immediately again. This is a regression introduced by the release author, not a pre-existing failure.

Final correction retains both merge imports. Explicit no-undef lint reproduces the published missing binding and passes on final source; focused38tests pass. The original equipment subscription/query/access gate is retained, with an additional company-scoped vehicle subscription. This preserves historical equipment that may lack company stamps while the new vehicle matching remains strict. Deliberate extra collection-read cost is accepted for this compatible stage. Another regression test fails without the historical map fallback and passes with it. Independent review accepts this final source and the same controlled promotion/restore procedure. Final candidate publication/runtime status will be appended after validation.

Final source upload candidate `dpl_25KGScpfrmg6KZTXkqRMtAxVnpNo` contains exactly946provider hashes matching the final manifest,9changed files and no omitted application source. Its CLI log stream disconnected with `fetch failed`; direct provider lookup confirmed the build continued inBUILDING, so no duplicate deployment was submitted. Final independent acceptance covers38focusedtests, explicitno-undeflint, equipment legacy source preservation and controlled promotion/restore.

## Final production acceptance

Final candidate `dpl_25KGScpfrmg6KZTXkqRMtAxVnpNo` becameReady after a5minute remote build despite the CLI stream disconnect. Provider source946/946exact and stagedhealthOK. Controlled promotion completed; fresh primaryalias selects exactly that deployment. Genuine administrator reload now renders without hydration error, shows PoolVanLM17WFG with `Vehicle prepped by Mason2Bickers · Completed14/10/2026,09:02:01`, and retains all4baselineequipment completions:HeavyDutyTowDolly,AFrame02,BrianJamesTriAxlecartrailer1,WadeCannonFiringSystem1. Page and data diagnostics areAuthorised/OK. Screenshot and JSONDOMreceipt are retained. No new production preparation save was performed.

Final source38focusedtests/scopedlintincludingno-undef/TypeScriptpass. Native543pass1skip on each snapshot;98identicalbaseline lint errors remain. ActiveFirestorepolicy was read again after release and is unchanged. Full guarded writer rollout and native installation/OSoffline verification remain pending. Local release report and canonicalPC109 describe that separation; no release-gate readiness credit added.

## Project Control metadata correction

The final diary runtime passed, but a separate hostedProjectControl check found itsAPIreturned503. The new check entry used unsupported statuspassed and omitted required critical:boolean; independent earlier parsed-record review did not exercise the actual model. This is another release-author regression, not an existing failure.

Changed only the added check to implemented/criticalfalse and appended a factual note to the added agentrun. Complete actualAPIinputs now pass validateProjectControl and summarizeProjectControl; a new regression test fails on the old entry and passes on the corrected entry. Full focused39pass. Independent review confirms application source byte-identical, only2metadatafiles differ, existing records unchanged. Calculated readiness decreases65%to64%; no verified credit or full-writer readiness is claimed. A metadata-only rebuild is pending hosted acceptance at this entry.

## Final records publication

Metadata-only candidate `dpl_3BTrXdx8XHb7pzp78MjLUtHEkwuY` builtReady and946/946submitted hashes match the validated manifest. Onlychecks.json/agent-runs.json differ from the accepted diary source. Promoted successfully; actual primaryalias now selects3BTr. Genuine authenticatedProjectControl reload renders its64%summary andPC109implemented record; fullwriter/historyactivation remains explicitly disabled. No state-unavailable error. The prior global release gate remainsFAIL and receives no invented readiness credit. Local ProjectControl working records were updated only for this task, preserving unrelated records.

Final deployment:https://bickers-v2.vercel.app. iOS/AndroidproductionOTAgroups remain99acb9eb/ee68c1b3,runtime5.0.12; individualdeviceinstallationunverified. Sourcearchives and provider/read/DOMreceipts are durable underoutput/shared-vehicle-prep-release-20261014. Fullcutover/nativeoffline/writeracceptance remain pending.

Independent final acceptance from `/root/release_review` confirms the restrictedread/status release complete: finalprimary3BTrReady,946exactproviderhashes, genuine diaryPoolVan/equipment/hydration receipts, ProjectControl64%render and39focusedtests/modelvalidation. Acceptance excludes native adoption/offline and fullguardedproductionwrites. PC109remainsimplemented, because those fullscopegates are unresolved.
