# Lead Tracker

An open-source lead tracker with contacts and reporting, for small teams. Self-host it on your own domain with a free Supabase project.

- **Pipeline**: leads move through stages you define, and are marked won or lost.
- **Contacts & companies**: one contact can have many leads over time.
- **Reporting**: open and weighted pipeline, win rate, pipeline by stage.
- **Teams**: invite people by email as Admin, Member or Viewer. Row Level Security enforces access in the database.
- **Guided setup**: a first-run wizard for your organization, pipeline, lead sources and team.

> Status: early. Done: setup wizard, auth, invites, roles, leads (board, table, detail), contacts (table, detail), and the activity timeline with tasks. Next: members/settings page, CSV import and export, inbound capture (API and embeddable form), and full reports. See [SPEC.md](SPEC.md).

## Quick start (local)

Requirements: Node 20+, Docker, and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
npm install
supabase start          # starts Postgres, Auth and a local mail catcher; applies migrations
cp .env.example .env.local
```

Copy the `Publishable` and `Secret` keys that `supabase start` printed into `.env.local`. For the local values:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
SMTP_HOST=127.0.0.1
SMTP_PORT=54425
SMTP_FROM="Lead Tracker <no-reply@localhost>"
```

```bash
npm run dev
```

Open http://localhost:3000. You'll be asked to create the owner account, then walked through setup. Every email the app sends locally lands in the mail catcher at http://127.0.0.1:54424.

> The local Supabase ports are shifted to `544xx` (instead of the usual `543xx`) so this project can run alongside other Supabase projects.

## Deploy your own

See **[docs/self-hosting.md](docs/self-hosting.md)**. In short:

1. Create a Supabase project and push the database: `supabase link` then `supabase db push`.
2. In Supabase **Authentication → Sign In / Providers**, turn **off** "Allow new users to sign up" and keep the Email provider **on**.
3. Deploy this repo to Vercel (or any Node host) with the env vars from `.env.example`.
4. Open your domain and create the owner account.

## How access works

| | Owner | Admin | Member | Viewer |
|---|:-:|:-:|:-:|:-:|
| Delete organization, transfer ownership | ✅ | | | |
| Invite/remove people, change roles | ✅ | ✅ | | |
| Pipeline stages, sources, settings | ✅ | ✅ | | |
| Create and edit leads & contacts | ✅ | ✅ | ✅ | |
| See everyone's leads | ✅ | ✅ | org setting | ✅ |

Details in [docs/roles.md](docs/roles.md).

- **No public signup.** The first person to open a fresh install becomes the owner. Everyone else joins through an invite link, which creates their account already confirmed.
- **Email is optional.** Without SMTP, the wizard gives admins invite links to share themselves. Password resets need SMTP ([docs/email-setup.md](docs/email-setup.md)).

## Project layout

```
supabase/migrations/   schema, RLS policies, RPCs (single source of truth)
supabase/tests/        pgTAP tests for RLS and permissions (`npm run db:test`)
src/proxy.ts           session refresh + redirect to /login
src/lib/auth.ts        current user/org, routing rules, page guards
src/app/(auth)/        login, first-run setup, forgot password
src/app/invite/        accept an invitation
src/app/onboarding/    setup wizard steps
src/app/dashboard/     landing page once setup is complete
```

## Scripts

| | |
|---|---|
| `npm run dev` | Start the app |
| `npm run db:reset` | Recreate the local database from migrations |
| `npm run db:test` | Run the RLS/permission tests |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` after changing the schema |

## License

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html). You're free to self-host and modify it. If you offer a modified version as a hosted service, you must publish your changes.
