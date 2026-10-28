# Security model

How Lead Tracker protects data, what it guarantees, and what's up to the people running it. Found a vulnerability? See [SECURITY.md](../SECURITY.md).

## What we protect

| Asset | Why it matters |
|---|---|
| **Contact and lead data** | Personal data (names, emails, phones, notes, consent records) about people who aren't users of the app. Under GDPR the deploying organization is the controller. |
| **Isolation between organizations** | One instance can hold several organizations (hosted mode). One org must never read or change another's data. |
| **Accounts and roles** | Owner > Admin > Member > Viewer. Taking over an account, or gaining a higher role, exposes everything that role can see. |
| **Secrets** | `SUPABASE_SECRET_KEY` (bypasses all access rules), SMTP credentials, API keys, invite and reset links. |
| **The org's email reputation** | The app sends email on the org's behalf. It must not become a spam relay. |

## Who might attack, and from where

| Actor | Entry points |
|---|---|
| **Anyone on the internet** | `/login`, `/setup`, `/forgot-password`, `/invite/<token>`, `/auth/confirm`, hosted forms `/f/<id>`, `POST /api/v1/forms/<id>`, `POST /api/v1/leads` |
| **A holder of a leaked API key** | `POST /api/v1/leads` (can create leads in one org, nothing else) |
| **A signed-in user trying to go beyond their role** | Every page, server action and route handler; the Supabase REST API directly (with their own JWT and the public publishable key) |
| **A user of one organization targeting another** | Same as above, with IDs from another org |
| **Malicious data** | Values that end up in HTML, emails, CSV files, PostgREST filter strings, redirect URLs |

## How the app defends itself

- **Database-enforced access.** Every table has Row Level Security. Policies check active membership, role and the org's lead-visibility setting, and the app talks to Postgres as the signed-in user. A bug in a page can't skip the rules, and calling the REST API directly gets the same answers. Child rows reference parents through composite `(org_id, id)` foreign keys, so a record can't point into another org.
- **Privileged paths are narrow.** The secret key is only used server-side for: creating the first owner and invited accounts, generating password reset links, and inbound capture (resolved to one org from an API key or form). Changes to roles and memberships go through `SECURITY DEFINER` functions that check the caller.
- **Tokens are random and stored hashed.** Invite tokens (256-bit) and API keys (192-bit) are stored as SHA-256 hashes. Invites expire after 7 days and work for one email address only. Reset links are Supabase one-time tokens that expire after 1 hour.
- **No public sign-up.** The first visitor becomes the owner (optionally gated by `SETUP_TOKEN`); everyone else needs an invite. A self-hosted instance can only ever have one organization: the database refuses more unless the operator allows it.
- **Invites prove email ownership.** With email set up, invite links only travel by email. Accepting needs a confirmed address matching the invite, and an inviter who loses admin rights takes their pending invites with them.
- **Passwords.** Changing a password needs the current one, unless the session was opened by a reset link in the last 15 minutes. Other sessions are signed out after a change. Reset links go through a confirmation page, so email scanners can't burn them.
- **Sessions.** Supabase session cookies are HttpOnly, Secure in production and SameSite=Lax. Only same-origin redirect targets are accepted after sign-in.
- **Public endpoints accept little.** Forms only take the fields they show. The API needs a key and can't be called from browsers. Captured input never changes existing contacts, can't set won/lost or viewer owners, and is labelled unverified. Both endpoints cap body size, use database-backed rate limits that fail closed, and group IPv6 by /64.
- **Integrity guards.** Who created a record, which org and record it belongs to, and a lead's won/lost status are enforced by triggers, not trusted from clients. Members can only reassign their own records. Records can only be assigned to members of the org.
- **Output is escaped.** React escapes HTML. Emails escape inserted values. CSV exports neutralize formula cells. Search terms are stripped of PostgREST filter syntax.
- **Security headers.** CSP, HSTS, `frame-ancestors`, `nosniff`, a strict referrer policy and a permissions policy. Only hosted forms can be framed.
- **Audit trail.** Record changes and security events (role changes, invites, API keys, forms, org settings, exports, imports, erasures, admin-sent password resets) go to `audit_log`. Secret columns are never copied in. Admins see it under **Settings → Security log**.
- **Data protection.** Owners can export all org data as JSON (logged by the database). Admins can permanently erase a contact, including their leads, activity and audit history. Trashed records are purged after 30 days by a scheduled job.
- **Tests and CI.** Database tests (`supabase/tests/`) replay cross-org, role-escalation and forgery attacks, including every issue found in the security review. CI runs them with lint, a type check, a build and `npm audit` on every pull request. Dependabot keeps dependencies current.

## Shared responsibility

The project provides secure code, safe defaults and documentation. **Whoever deploys it is responsible for:**

- **Penetration testing** and security review of their own deployment.
- **Infrastructure:** HTTPS, the reverse proxy, OS and runtime patching, firewalling the database.
- **Supabase configuration:** keeping public sign-ups off and the Email provider on, auth rate limits, MFA on the Supabase dashboard account, network restrictions, backups and point-in-time recovery.
- **Secrets:** keeping `SUPABASE_SECRET_KEY` and SMTP credentials out of client code and logs, and rotating them if exposed.
- **Updates:** applying new releases and migrations, and watching security advisories.
- **Legal:** a privacy policy, data processing agreements with sub-processors (database host, email provider), a lawful basis for storing leads, and answering data subject requests (the export and erase features help).
- **Monitoring:** watching logs and the audit log, and alerting on unusual activity.

See the hardening checklist in [self-hosting.md](self-hosting.md#hardening-checklist).

## Known limitations

- **Per-IP rate limits trust `X-Forwarded-For`.** Behind Vercel or a correctly configured reverse proxy (`TRUSTED_PROXY_HOPS`) that's right. If the app is reachable directly, clients can spoof it and get around per-IP limits; the per-form and per-key limits still apply.
- **Sign-in limits.** Per account, only failed attempts count: 10 per 15 minutes per account and network, and 100 per hour per account overall. Someone deliberately failing 100 times an hour can block an account's sign-in for that hour; the owner can still reset their password.
- **Custom HTML forms** can't carry the signed "too fast" token, so they rely on the honeypot and rate limits. Prefer the iframe embed.
- **Existence checks.** In "own leads" mode a member can learn that a contact with a given email exists (the duplicate-email error). Supabase's change-email endpoint can reveal whether an address has an account on the instance.
- **Erasure scope.** Erasing a contact removes their leads and notes. Their name can remain in other places people typed it, such as another lead's title or a note on a different contact.
- **No built-in MFA for app users yet.** Supabase supports TOTP MFA; the UI for it isn't built.
- **Sign-in brute-force protection is Supabase's.** It's IP-based and configurable under Authentication → Rate Limits, but there's no per-account lockout in the app.
- **Without email** (self-hosted only), admins share invite links themselves, and the owner can copy a member's password reset link. Whoever holds such a link can create or sign in to that account, so share them only with the person they're for. Set up SMTP to avoid this.
