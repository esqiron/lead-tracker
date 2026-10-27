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
