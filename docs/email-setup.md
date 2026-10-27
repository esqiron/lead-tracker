# Email setup

Lead Tracker sends all of its email (invitations and password resets) through **one SMTP account** that you configure with environment variables. Supabase's own auth emails aren't used.

| Without SMTP | With SMTP |
|---|---|
| Admins get an invite link per person to share themselves | Invitations are emailed |
| "Forgot password" tells people to ask an admin | Reset links are emailed |

## Variables

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587               # 587 = STARTTLS, 465 = implicit TLS
SMTP_USER=…
SMTP_PASSWORD=…
SMTP_SECURE=                # optional; "true" forces TLS. Defaults to true only on port 465
SMTP_FROM="Lead Tracker <no-reply@your-domain.com>"
```

Use a sender address on a domain you control, and set up SPF and DKIM for it (your provider walks you through this), or emails will land in spam.

## Providers

| Provider | Host | Port | User | Password |
|---|---|---|---|---|
| [Resend](https://resend.com/docs/send-with-smtp) | `smtp.resend.com` | 465 | `resend` | API key |
| [Postmark](https://postmarkapp.com/developer/user-guide/send-email-with-smtp) | `smtp.postmarkapp.com` | 587 | Server API token | Server API token |
| [Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html) | `email-smtp.<region>.amazonaws.com` | 587 | SMTP username | SMTP password |
| [Mailgun](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-smtp) | `smtp.mailgun.org` (EU: `smtp.eu.mailgun.org`) | 587 | SMTP login | SMTP password |
| Google Workspace / Gmail | `smtp.gmail.com` | 465 | Your address | [App password](https://support.google.com/accounts/answer/185833) |

## Local development

`supabase start` runs a mail catcher. Point the app at it:

```bash
SMTP_HOST=127.0.0.1
SMTP_PORT=54425
SMTP_FROM="Lead Tracker <no-reply@localhost>"
```

Read every message the app sends at http://127.0.0.1:54424.
