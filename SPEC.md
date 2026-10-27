# Lead Tracker — Spec (draft v0.1)

Open-source, self-hostable lead tracker with contacts and reporting. Same codebase powers an optional paid hosted version later.

Decisions locked: Next.js + Supabase · Contacts + leads · Inbound capture in v1 · AGPL-3.0.

---

## 1. Goals / non-goals

**Goals**
- Small teams track leads from first touch to won/lost.
- Self-host in < 15 minutes with a documented, mostly copy-paste setup.
- First-run wizard; afterwards users land on the dashboard.
- Multi-tenant-ready schema from day one (every row scoped by `org_id`), so the hosted version needs no rewrite.

**Non-goals (v1)**
- Email sync / inbox integration, calendar sync.
- Marketing automation, sequences, bulk email.
- Quotes, invoices, products.
- Native mobile apps (responsive web only).

---

## 2. Deployment modes

| Mode | Who runs it | Orgs per instance | Signup |
|---|---|---|---|
| **Self-hosted** (v1) | The customer | 1 (multi-org possible but hidden) | First user = owner, then invite-only |
| **Hosted** (later) | You, on your domain | Many | Open signup, each user creates an org |

A single env flag switches behavior: `DEPLOYMENT_MODE=self_hosted | hosted`.

### Hosted version & GDPR — heads-up
If customers store their leads (personal data) on your infrastructure, you are a **data processor** under GDPR regardless of how it's packaged. You can't fully avoid it, only minimize it. Minimum you'd need before charging: privacy policy, DPA template, sub-processor list (DB host, email provider), data export + deletion, EU region hosting. Recommendation: ship self-hosted first, defer hosted until there's demand. The architecture below keeps that door open.

---

## 3. Tech stack

**Next.js + Supabase (Postgres, Auth, RLS)**, deployable to Vercel/any Node host.
- Supabase Auth gives invites, magic links, password reset, email templates, custom SMTP out of the box — that's most of the "account creation / reset" setup burden gone.
- Row-Level Security enforces org isolation and roles at the DB level.
- Self-host path: free Supabase project + "Deploy to Vercel" button + env vars. Advanced users can self-host Supabase via Docker.

---

## 4. Data model (v1)

All tables have `id`, `org_id`, `created_at`, `updated_at`, `created_by`.

- **organizations** — name, slug, logo_url, currency, timezone, date_format, `setup_completed_at`, settings (jsonb: lead visibility, etc.)
- **memberships** — user_id, org_id, role, status (`active | invited | disabled`)
- **invitations** — org_id, email, role, token_hash, invited_by, expires_at (7 days), accepted_at
- **contacts** — first_name, last_name, email, phone, title, company_id?, owner_id, tags[], custom_fields jsonb, notes
- **companies** — name, website, industry, size, owner_id (optional in UI)
- **leads** — title, contact_id, company_id?, owner_id, stage_id, value, currency, source_id, expected_close_date, status (`open | won | lost`), lost_reason, closed_at
- **pipeline_stages** — name, position, probability %, is_won, is_lost (one pipeline in v1; schema allows `pipeline_id` later)
- **lead_sources** — name (Website, Referral, LinkedIn, Cold outreach, Event, Other…)
- **activities** — type (`note | call | email | meeting | task`), lead_id?, contact_id?, body, due_at, completed_at, assigned_to
- **lead_stage_history** — lead_id, from_stage, to_stage, changed_by, changed_at (powers funnel/velocity reports)
- **audit_log** — actor, action, entity, entity_id, diff (lightweight; helps GDPR + trust)

A contact is a person; a lead is an opportunity linked to one contact (and optionally a company). One contact can have many leads over time.

- **api_keys** — org_id, name, key_hash, last_used_at, revoked_at (for inbound capture)
- **capture_forms** — org_id, name, field mapping, default stage/source/owner, allowed_origins, redirect_url

---

## 5. Roles & permissions

| Capability | Owner | Admin | Member | Viewer |
|---|:-:|:-:|:-:|:-:|
| Org settings, billing (hosted), delete org | ✅ | — | — | — |
| Invite/remove members, change roles | ✅ | ✅ | — | — |
| Edit pipeline stages, sources, custom fields | ✅ | ✅ | — | — |
| Create/edit leads & contacts | ✅ | ✅ | ✅ | — |
| Delete leads & contacts | ✅ | ✅ | own only | — |
| See all leads | ✅ | ✅ | org setting* | ✅ |
| Reports | ✅ | ✅ | own / all* | ✅ |
| Export CSV | ✅ | ✅ | — | — |

\* Org setting `lead_visibility = all | own`. Default `all`.

Rules: exactly one Owner per org (transferable); an Admin can't modify the Owner; you can't demote yourself if you're the last Owner/Admin.

---

## 6. Routing / first-run logic

```
unauthenticated            → /login  (or /setup on a fresh self-hosted instance with 0 users)
authenticated, no org      → /onboarding (hosted mode only)
org.setup_completed_at null AND role in (owner, admin) → /onboarding/<step>
org.setup_completed_at null AND other role → "Your workspace is being set up" screen
otherwise                  → /dashboard
```

Wizard progress is saved per step, so closing the tab resumes where they left off.

---

## 7. Setup wizard

1. **Create owner account** — name, email, password (self-hosted: only shown when instance has 0 users).
2. **Organization** — name, logo (optional), currency, timezone, date format.
3. **Pipeline** — pre-filled defaults (New → Contacted → Qualified → Proposal → Negotiation → Won / Lost), drag to reorder, rename, add/remove.
4. **Lead sources** — pre-filled defaults, editable.
5. **Invite team** — rows of email + role; "Skip for now". If email isn't configured, show copyable invite links instead of failing.
6. **Import (optional)** — CSV upload with column mapping for contacts/leads; or "Load sample data" toggle to explore.
7. **Done** → dashboard with a short checklist (add first lead, invite team, connect email).

---

## 8. Auth & invites

- Email + password, plus magic link. Google/Microsoft SSO later.
- **Invite flow**: admin enters email + role → invitation row + email with link `/invite/<token>` → recipient sets name + password (or signs in if account exists) → membership activated → lands on dashboard (skips wizard).
- Invites expire in 7 days; resend + revoke from Settings → Members.
- **Password reset**: standard email link, 1h expiry.
- Email delivery via SMTP env vars (works with Resend, Postmark, SES, Gmail SMTP, Mailgun). Docs include a section per provider.
- Fallback when SMTP isn't configured: admin can copy invite/reset links from the UI; a banner warns email isn't set up.

---

## 9. Core features (v1)

**Leads**
- Board (kanban by stage, drag to move) and table view (sort, filter, saved filters).
- Lead detail: fields, linked contact/company, activity timeline, tasks, stage history.
- Mark won/lost (lost requires reason).
- Quick-add from anywhere (keyboard shortcut).

**Contacts / companies**
- Table with search, filters, tags.
- Detail page: info, all leads, activity timeline.
- Duplicate detection on email.

**Activities & tasks**
- Log note/call/meeting/email manually; tasks with due dates and assignee.
- "My tasks" view: overdue / today / upcoming.

**Inbound lead capture**
- `POST /api/v1/leads` with org API key: creates/dedupes contact by email, then creates lead. Works with Zapier/Make/n8n.
- Embeddable form: hosted form URL + `<script>` embed snippet; per-form default stage, source, owner (or round-robin).
- Spam protection: honeypot + rate limit per IP/key + optional Cloudflare Turnstile.
- Consent checkbox + stored consent text/timestamp on the contact (GDPR).
- New-lead email notification to owner.

**Import / export**
- CSV import with mapping + dedupe; CSV export (admins).

**Settings**
- Org profile, members & invites, roles, pipeline stages, sources, custom fields (text/number/date/select), lead visibility, API keys, capture forms.

---

## 10. Reporting (v1)

Filterable by date range, owner, source.

- **Dashboard KPIs**: open pipeline value, weighted pipeline (value × stage probability), new leads, won value, win rate, avg deal size.
- **Pipeline by stage** (count + value).
- **Conversion funnel** stage-to-stage (from `lead_stage_history`).
- **Leads by source** + win rate per source.
- **Won/lost over time** (monthly) + lost reasons breakdown.
- **Leaderboard by owner** (won value, win rate, activities logged).
- **Sales velocity**: avg days per stage, avg time to close.
- Export any report to CSV.

---

## 11. Privacy & data handling (even for self-hosted)

- Full org export (JSON/CSV) and "delete contact + all related data" (right to erasure).
- Soft delete with 30-day trash, then hard delete.
- Audit log of create/update/delete.
- No telemetry by default; opt-in only.

---

## 12. Open-source packaging

- README with 3 install paths: one-click (Vercel + Supabase), Docker, local dev.
- `.env.example` fully documented; a `/setup/health` page that checks DB, migrations, email config.
- Migrations + seed (sample data) scripts.
- Docs: `docs/self-hosting.md`, `docs/email-setup.md`, `docs/roles.md`, `docs/upgrading.md`.
- License: **AGPL-3.0** (protects the hosted offering; self-hosting stays free).

---

## 13. Later / backlog

Multiple pipelines, email/calendar sync, SSO, API keys, webhooks out, notifications (email/Slack), hosted billing (Stripe), i18n.
