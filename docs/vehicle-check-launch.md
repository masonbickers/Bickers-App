# Daily vehicle check launch sign-off

The app keeps the existing four-section check and quick OK buttons. For a fleet vehicle classified as a lorry or HGV, one submitted check covers that vehicle for the selected day, including multiple jobs on that day; the next day needs a new check. For other vehicles, including trailers and unclassified fleet records, one submitted check covers that vehicle for the job across its days. A saved draft is not treated as a completed check.

The driver must complete an HGV check before the vehicle is used and select the correct vehicle and any attached trailer. The job screen shows whether the required check has been submitted; the app does not physically prevent a vehicle from being driven.

When an HGV tows a trailer, the driver must still include the attached trailer in each daily HGV walkaround check. A separate trailer record marked complete for the job does not replace that daily inspection.

## Verify before launch

- Confirm the fleet record has the correct vehicle registration and that it appears on the submitted check.
- On an HGV, submit one nil-defect check and one defect check in a test environment. Confirm the saved report includes the driver, registration, date and time, odometer, trailer ID when applicable, each item result, defect description and assessment, and who it was reported to.
- Confirm a defect appears in the workshop queue and that repair completion records the repair note, person and time while preserving the original submitted answers.
- Confirm a dangerous defect warns on later jobs using that vehicle until the workshop resolves it. The driver and operator remain responsible for keeping an unroadworthy vehicle off the road.
- Deploy and verify the updated Firestore rules. Check that a submitted version 2 report cannot be deleted or have its original submission snapshot changed by an app client.
- Establish and test a report retrieval and backup process that keeps check and repair records available for at least 15 months, including nil-defect records and records for vehicles removed from the fleet.

The checklist and record fields follow [DVSA's HGV walkaround guidance](https://www.gov.uk/guidance/carry-out-daily-heavy-goods-vehicle-hgv-walkaround-checks) and the [Guide to Maintaining Roadworthiness](https://www.gov.uk/government/publications/guide-to-maintaining-roadworthiness/guide-to-maintaining-roadworthiness-commercial-goods-and-passenger-carrying-vehicles). Legal sign-off requires the operator to verify the live workflow and retention process.
