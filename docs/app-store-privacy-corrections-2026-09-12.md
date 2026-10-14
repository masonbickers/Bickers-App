# App Store privacy corrections — completed 13 September 2026

Live App Store Connect on 12 September showed a published label with Name, Email Address, Phone Number, User ID and Device ID, all linked to the user and used for app functionality. The policy URL is correct and publicly accessible.

The current source also retains the following data on Firebase. These were added and published on 13 September, with App Functionality, Linked to User = Yes, Tracking = No:

| Apple category | Evidence |
| --- | --- |
| Photos or Videos | Profile/report/recce photographs and receipt images are uploaded to Firebase Storage. |
| Emails or Text Messages | Private employee-office messages are saved in `timesheetQueries/{id}/messages`. Apple includes non-SMS private messaging in this category. |
| Other User Content | Work notes, vehicle reports, attachments, availability notes and working-terms signatures/acceptance records. |
| Purchase History | Monthly receipts capture the purchase, supplier and gross amount paid. |
| Other Financial Info | Expense claims retain the amount to reimburse and approval information. |

These are app functionality, with no advertising or cross-app tracking code identified in this audit. The public privacy policy already describes these data practices. App Store Connect confirmed all 10 data types, showed each addition as App Functionality and linked to the user, and displayed a fresh publication timestamp with no unfinished-setup warning. Each added category was explicitly answered Tracking = No.

[Apple category definitions and private-messaging guidance](https://developer.apple.com/app-store/app-privacy-details/).

App Information confirmed Business category and no third-party content. The age-rating questionnaire initially had Messaging and Chat = No; this was corrected to Yes for the private employee-office messaging feature and saved on 13 September. Apple calculated 4+. Other content-frequency answers were retained; no unsupported public social or advertising capability was added.

Pricing and Availability was verified on 13 September and explicitly shows Unlisted App URL with https://apps.apple.com/us/app/bickers/id6754837128. Unlisted distribution configuration is confirmed. App Review approval and download availability are separate and remain unconfirmed. The account holder subsequently completed the DSA declaration; their screenshot shows Active and all regulatory requirements complete. With user authorization, app availability was restricted to United Kingdom only and automatic availability in future countries was disabled. The saved page shows 1 available country and 174 not available. Version 5.0.12 remains Waiting for Review; see the current build report.
