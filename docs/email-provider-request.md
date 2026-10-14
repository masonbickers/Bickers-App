# Draft enquiry to Bickers email/DNS provider

Subject: Bickers internal app — missing password-reset email and domain sender setup

Hi,

We need password-reset emails from our internal iPhone/Android app to use a verified bickers.co.uk sender. The app currently uses Firebase Authentication and its default email sender. The From address should be noreply@bickers.co.uk, with the display name Bickers Action. Replies should go to mason@bickers.co.uk.

We also need help tracing a missing password-reset email. On 13 October 2026, Firebase accepted a PASSWORD_RESET request for mason@bickers.co.uk, but Mason reports no email received. The Firebase account is enabled and has the password login provider. Firebase still uses its default email service; the new bickers.co.uk From domain has not been enabled.

Public MX records currently route bickers.co.uk through mx01–mx04.hornetsecurity.com. Please check Hornetsecurity message tracking/quarantine and the downstream mailbox logs for the reset email. Confirm whether a message was received, quarantined, rejected, delayed or not seen, including the sender and timestamp if available. We cannot determine delivery from Firebase's API acceptance alone. Please do not change filtering rules until the trace identifies the cause.

Please also trace Sentry alert emails to `mason@bickers.co.uk` on 13 October 2026 around 13:57 BST (12:57 UTC), plus the nearby test notification. Sentry records the BickersMonitoringSetup alert as triggered, but the email has not arrived. Check gateway quarantine and downstream delivery records; do not change filtering rules without identifying the cause. Better Stack's test email was received successfully.

Please also confirm:

- Who hosts our email and manages our DNS?
- Can you help verify a custom sender domain for Firebase Authentication, or provide an approved authenticated SMTP relay if that is your preferred supported route?
- Can you add the exact verification and email-authentication DNS records supplied by the chosen service once we have them?
- Are there any sender restrictions, sending limits or costs we should know about?

Please provide credentials through your usual secure process, rather than ordinary email. We have not generated verification DNS records yet, so please wait for the exact records before making changes.

Thanks,
Mason
