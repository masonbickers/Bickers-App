# Android release preparation — 4 October 2026

The user requested a new Android build and an update for Android users. The most recent completed Android production build in EAS is 5.0.6 (19), build `4741c92e-92fc-419a-90a6-45ef7951ad91`, completed 19 August 2026. Store installation/availability was not independently checked.

A release snapshot of the current app is prepared as 5.0.12, runtime 5.0.12, production channel, package `com.bickers.bickersapp`. EAS production configuration uses a store AAB, production API/environment, remote version codes and automatic increment. The snapshot includes the recent timesheet ownership/loading and employee form repairs. It excludes dotenv files, local build artifacts and signing key files using `.easignore`.

The workspace Expo CLI installation was incomplete (`serializeHtml` missing). A fresh locked dependency install in the isolated snapshot resolved the export error; both dependency patches applied successfully. Snapshot tests passed: 503 passed, 1 skipped, 0 failed, using Node's experimental VM module flag. Android production export completed successfully. Bundle inspection found the production API host, ownership fields and app route markers. No Android device smoke test was performed.

Evidence and the saved source snapshot are under `output/android-release-20261004/`. The prepared build folder is `/private/tmp/bickers-android-release-20261004`; its `.easignore` also excludes the local `ota-dist` verification export.

The user explicitly approved the source upload to Expo and Google Play submission. The first upload lost its connection after reserving version code 20. The retry succeeded and created production Android build `d364ccc6-08b1-40fb-ac73-0b8ac8236bdd`, version **5.0.12 (21)**, using the existing remote signing keystore. Expo confirms **FINISHED**. [Build details](https://expo.dev/accounts/masonbickers/projects/bickers-app/builds/d364ccc6-08b1-40fb-ac73-0b8ac8236bdd).

Before this release, Google Play Console confirmed that **5.0.5 (17)** was available to internal testers. This supersedes the earlier inference that the most recent completed Expo build, 5.0.6 (19), was also the shipped Google Play version. Production publishing has not been set up. The update uses the existing internal testing track and replaced the empty untitled draft release.

EAS Submit has no Google Play service-account key configured and cannot submit non-interactively. The signed-in Play Console was used for direct bundle upload; no new account permissions or credentials were created.

The downloaded AAB passed ZIP integrity checks and contained signing entries, package/version metadata, the production API host and the ownership/form route markers. Its SHA-256 is `e83974ee8829b278c256fcb68d33dd74c0e77177cedc5131c0e753248c0e786c`. Google Play accepted version code 21, target SDK 36, minimum API 24, four ABIs and native debug symbols. No supported devices were lost. Its only warning was the absence of a deobfuscation file for crash/ANR analysis.

**Published on 4 October 2026.** Save and publish, including its confirmation dialog, completed successfully. The track now shows **Latest release: 21 (5.0.12)** and **Available to internal testers**. [Google Play release](https://play.google.com/console/u/0/developers/6799095841455365254/app/4973394268939680490/tracks/4701646536491013789/releases/4/details). Publication evidence is saved as `output/android-release-20261004/google-play-published.png`.

Google states that changes usually appear within one hour, occasionally longer. Enrolled internal testers can update through Google Play when propagation completes. This is a new store binary, not an OTA; users need to install the update. Installation and authenticated Android device smoke testing were not independently performed.
