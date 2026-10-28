# Self-hosting

Lead Tracker needs two things: a **Supabase project** (database and auth) and somewhere to run a **Next.js app** (Vercel, Netlify, Railway, Fly, a VPS, …). A small team fits comfortably in the free tiers.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard). Pick a region close to your users. For EU data, pick an EU region.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), then from this repo:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   This creates every table, policy and function from `supabase/migrations/`.

3. In the dashboard, open **Authentication → Sign In / Providers**:
   - Turn **off** "Allow new users to sign up". The app creates accounts itself: the first owner, then each invited person.
   - Leave the **Email** provider **enabled**. Turning it off disables password sign-in.
   - Keep **Confirm email** on, and **Secure email change** on. Then changing an account's email needs a click on a link sent to the new address. The app creates accounts already confirmed, so invites aren't affected.
4. Open **Authentication → URL Configuration** and set **Site URL** to your app's URL, for example `https://leads.example.com`.
5. Open **Project Settings → API Keys** and copy the **Publishable** key and a **Secret** key.

## 2. Deploy the app

### Vercel

1. Import the repository in Vercel.
2. Add the environment variables from [`.env.example`](../.env.example):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key |
   | `NEXT_PUBLIC_SITE_URL` | Your app URL, no trailing slash |
   | `DEPLOYMENT_MODE` | `self_hosted` |
   | `SMTP_*` | See [email-setup.md](email-setup.md) |
   | `SETUP_TOKEN` | Optional but recommended: a long random string. `/setup` asks for it, so nobody else can claim a fresh deployment before you do. |
   | `TRUSTED_PROXY_HOPS` | Optional. Number of reverse proxies that append to `X-Forwarded-For` (default `1`, right for Vercel and a single nginx/Caddy). |

3. Deploy, then add your custom domain under **Settings → Domains**.

### Any Node host

```bash
npm ci
npm run build
npm start        # listens on $PORT (default 3000)
```

Set the same environment variables. Put it behind HTTPS: session cookies are marked `secure` in production.

## 3. First run

Open your domain. A fresh install shows **Set up Lead Tracker**:

1. Create the owner account.
2. Name the organization and pick its currency and time zone.
3. Adjust the pipeline stages and lead sources.
4. Invite your team. They get an email, or you share their links.
5. Start with sample data or with an empty workspace.

After that, `/setup` is closed. New people can only join by invitation.

## Hardening checklist

The app ships with safe defaults. These steps are on you as the operator. Background: [security.md](security.md).

**Before going live**
- [ ] Set `SETUP_TOKEN`, deploy, claim the instance at `/setup`, then remove the variable or keep it.
- [ ] Serve the app **only over HTTPS**. Production responses send HSTS.
- [ ] In Supabase, keep public sign-ups **off**, the Email provider **on**, and **Confirm email** and **Secure email change** **on**.
- [ ] Turn on **MFA** for every account with access to the Supabase dashboard, your host (Vercel, …) and the domain's DNS.
- [ ] Keep `SUPABASE_SECRET_KEY` server-side only. It bypasses every access rule. Never put it in a `NEXT_PUBLIC_*` variable, client code, logs or screenshots.
- [ ] Set up SMTP with SPF and DKIM for your sending domain ([email-setup.md](email-setup.md)).

**Supabase settings**
- [ ] **Authentication → Rate Limits:** every sign-in reaches Supabase from your app server's IP, so the per-IP sign-in limit there applies to all your users together. Raise it (e.g. to 300 per 5 minutes); the app limits sign-ins per client itself.
- [ ] **Database → Backups:** confirm daily backups. Consider point-in-time recovery for production data.
- [ ] **Database → Network restrictions:** allow only the addresses that need direct database access (usually none: the app uses the API).
- [ ] **Database → Extensions:** keep `pg_cron` enabled. The migrations schedule two daily jobs with it: the trash purge (`lead-tracker-purge-trash`) and retention rules (`lead-tracker-retention`). Without pg_cron, run `select public.apply_retention();` and then `select public.purge_trash(30);` daily yourself.
- [ ] **Privacy:** read [gdpr.md](gdpr.md) and set data retention under **Settings → General**. Pick an EU region for EU data.

**Reverse proxy (if not on Vercel)**
- [ ] Make your proxy **overwrite** `X-Forwarded-For`/`X-Real-IP` with the real client address, or append to it, and set `TRUSTED_PROXY_HOPS` to the number of proxies. Otherwise clients can spoof their IP and get around per-IP rate limits.
- [ ] Cap request bodies (e.g. `client_max_body_size 1m;`). The lead capture endpoints reject bodies over 64 KB themselves.

**Hosted mode only (several organizations on one instance)**
- [ ] `DEPLOYMENT_MODE=hosted` **and** in the database: `update public.instance_settings set allow_multiple_orgs = true;`. Without the database setting, only one organization can ever be created, whatever the app is told.
- [ ] SMTP is required. Invitations refuse to work without it, because the emailed link is what proves the invitee owns the address.
- [ ] Have your own legal basics in place: privacy policy, DPA, sub-processor list. See [security.md](security.md#shared-responsibility).

**Ongoing**
- [ ] Apply new releases and migrations promptly, and watch the repository's security advisories.
- [ ] Review **Settings → Security log** now and then, and rotate API keys you no longer use.
- [ ] If a secret leaks: rotate `SUPABASE_SECRET_KEY` (Supabase → API Keys), the SMTP password and any affected API keys, then redeploy.
- [ ] Get your deployment pentested if your risk calls for it. The project doesn't do it for you.

## Upgrading

```bash
git pull
supabase db push   # applies any new migrations
```

Then redeploy the app. Migrations are additive and run in order. Back up your database before upgrading (Supabase: **Database → Backups**).

## Troubleshooting

- **"Email logins are disabled"**: the Email provider is turned off in Supabase. Turn it back on and keep only "Allow new users to sign up" off.
- **Invite or reset links point to localhost**: set `NEXT_PUBLIC_SITE_URL` to your public URL and redeploy.
- **Invites show links instead of sending email**: SMTP isn't configured. See [email-setup.md](email-setup.md).
- **"This server already has its organization"**: a self-hosted instance holds one organization, ever (enforced in the database). To start over after deleting it, run `update public.instance_settings set first_org_created_at = null;`.
- **"Confirm your email address before accepting this invitation"**: the account's email change is still pending or the address was never confirmed. Finish the confirmation email, or ask the admin for a new invite.
