# GDPR and privacy

Lead Tracker stores personal data about people who aren't its users: leads and contacts. Under the GDPR the organization using it is the **controller**. The app gives you tools for your obligations, but software alone can't make you compliant. That depends on how you use it and on the paperwork around it.

## What the app gives you

| GDPR need | In Lead Tracker | Who |
|---|---|---|
| **Lawful basis** (Art. 6) | Each contact has a lawful basis: Consent, Contract, Legitimate interest or Legal obligation. Set it when editing a contact. Contacts created by a form with a consent box get *Consent* automatically. | Members and up |
| **Proof of consent** (Art. 7) | Forms with a consent checkbox save the exact text, the time and the form on the contact. Nobody can create or edit a consent record by hand, so it holds up as evidence. | Automatic |
| **Withdrawing consent** (Art. 7(3)) | **Withdraw consent** on the contact page records the time and marks them do-not-contact. A withdrawal can't be undone. | Members and up |
| **Objection and restriction** (Art. 18, 21) | **Stop contact** marks someone do-not-contact, shown as a badge on the contact and in lists. Only admins can lift it, and not while the basis is a withdrawn consent. | Members set it, admins lift it |
| **Right of access and portability** (Art. 15, 20) | **Export data** on the contact page downloads everything held about the person as JSON: their details, leads, notes, consent and the change history. | Admins |
| **Rectification** (Art. 16) | Edit the contact. Changes are kept in the audit log. | Members and up |
| **Erasure** (Art. 17) | **Erase…** on the contact page permanently deletes the contact, their leads, activity and audit history. | Admins |
| **Storage limitation** (Art. 5(1)(e)) | **Settings → General → Data retention**: contacts with no open leads and no activity for a period you choose go to the trash with their leads, and are deleted 30 days later. Old audit log entries can be deleted the same way. Off by default. | Admins |
| **Security of processing** (Art. 32) | Access rules enforced in the database, an audit log, and the measures in the [security model](security.md). | Built in |
| **Accountability** (Art. 5(2)) | Exports, imports, erasures and retention runs show under **Settings → Security log**. Withdrawals, do-not-contact and other record changes show there under **Everything**. | Admins read it |

Every export and erasure is written to the audit log by the database itself, so it's recorded even when someone calls the API directly.

### Answering requests

- **"What do you have on me?"** Open the contact and choose **Export data**. Send them the JSON, or a readable summary of it.
- **"Stop emailing me."** **Withdraw consent** if they consented, otherwise **Stop contact**.
- **"Delete my data."** **Erase…**. Then search notes and lead titles for their name: erasure only removes what's linked to the contact (see below).
- **"Fix my details."** Edit the contact.

The GDPR gives you one month to answer.

## What's up to you

- **Privacy notice.** Tell people what you collect and why, and link it next to your forms. The consent text is set per form under **Settings → Lead capture**.
- **Pick a lawful basis** for contacts you add by hand or import. Imports don't set one. The contacts CSV export has a lawful basis column, so you can find the ones without one.
- **Processing agreements** with your sub-processors: your database host (e.g. Supabase) and email provider.
- **Hosting region.** For EU data, pick an EU region for your Supabase project.
- **Records of processing** (Art. 30), and a data protection impact assessment if your use needs one.
- **Breach notification** within 72 hours (Art. 33). The audit log and Supabase's logs help you find out what happened.
- **Backups.** Erased data stays in database backups until they expire. Say so in your privacy notice, and keep backup retention short.
- **Respecting do-not-contact.** The app shows it, but it can't stop someone emailing a person from their own mail client.

## Limitations

- **Erasure scope.** Erasing a contact removes their record, leads and notes. Their name can remain where people typed it somewhere else, such as another lead's title or a note on a different contact.
- **Retention looks at activity in the app.** Email exchanged outside Lead Tracker doesn't count as activity, so a contact you talk to only by email can still age out. Log calls and emails as activities, or keep retention off.
- **Retention needs the daily job.** It runs through `pg_cron` (`lead-tracker-retention`). Without pg_cron, run `select public.apply_retention();` daily yourself.
- **Consent can't be recorded by hand**, for example consent given on paper or by phone. Pick *Consent* as the basis and keep the proof outside the app, or capture it with a form.

## Hosting it for others

If you run Lead Tracker for other organizations, you're their **processor**. That needs a data processing agreement, a sub-processor list and support for their requests on top of the above. See the note in [SPEC.md](../SPEC.md).
