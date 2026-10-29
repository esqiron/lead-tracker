# Inbox + review: build plan

Status: Phase 0 done (3f3c7d7). Phase 1 done (bbdb971): the inbox is home. Phase 2 done: New menu (C), compose sheet, slash composer.

This plan turns the chosen direction (mock: `design/look-and-feel/flows/inbox.js`, published at https://claude.ai/artifact/AmCviEPj1mdcPZXdEPNBDY) into the real app. Each phase ships on its own and leaves the app working. The existing board, table and detail pages stay reachable throughout. Before writing route code, read the Next 16 docs listed under Phase 1, because this Next version differs from older ones (see `AGENTS.md`).

## Model in one paragraph

A **thread is a lead.** Its conversation is the lead's activities, stage changes and (from Phase 3) review answers, merged by time, which is what `getTimeline` already does. Activities logged on a person with no lead appear on their People page. The **next step** is the lead's earliest open task (`activities` rows with `type='task'`, `completed_at is null`), so nothing new is needed for it. **Last touch** is the newest activity on the lead. Folders are computed per lead from those facts in one SQL view, so the rules live in one place and can be tuned.

## Folder rules (one `CASE`, first match wins)

| Folder | Rule (open leads only) |
|---|---|
| Needs reply | No owner · or the latest activity came from outside (`source` set, or `direction='inbound'` from Phase 2) · or the next step is due today or overdue |
| Going cold | Last touch is 14+ days ago (threshold kept in org settings) |
| Needs reply | No next step at all (nothing pinned means it's your move) |
| Waiting on them | Everything else: a future next step and a recent touch |
| Won | Won in the last 30 days (closed leads otherwise drop out of folders but stay searchable) |

Every folder has an "Everyone / Mine" scope. "Mine" means I own the lead or I'm assigned its next step. RLS already hides leads a member can't see.

---

## Phase 0: foundations (no visible workflow change)

- **Studio look as the app's design tokens.** Move the variant's palette, type (Manrope + Onest via `next/font`), radii and shadows into `globals.css` `@theme`, and restyle the primitives in `src/components/ui.tsx` (Button, Input, Card, Badge, PageHeader). Every existing page picks up the new look for free, which is a useful build-in-public moment.
- **Migration `…_inbox.sql`:**
  - Add the index `activities (lead_id, created_at desc)`. The current `activities_lead_idx` has no time column.
  - Add the view `lead_threads` with `security_invoker = on`, so RLS still applies. Columns: lead fields, contact and company names, `last_activity_at`, `last_activity_inbound`, `next_task_id / body / due_at / assigned_to` (via a lateral join), `days_quiet`, `folder`.
  - Add `organizations.settings` keys `cold_after_days` (default 14) and `review_day` (default 1 = Monday).
- **Tests:** add `supabase/tests/inbox_test.sql` (pgTAP, using the existing `tests.as_role` helper). It covers each folder rule, the "Mine" scope, and checks that a member on `lead_visibility='own'` doesn't see other people's threads through the view.

**Done when** `select folder, count(*) from lead_threads group by 1` matches the hand-counted sample data, and the app looks like Studio.

## Phase 1: the inbox becomes home (read, triage, log)

- **Read first** (in `node_modules/next/dist/docs/01-app/`):
  - `03-api-reference/03-file-conventions/` (layouts, dynamic segments, `default.md`)
  - `02-guides/server-actions.md`, `forms.md`, `instant-navigation.md`, `preserving-ui-state.md`
  - `01-getting-started/09-revalidating.md`
  - `02-guides/upgrading/version-16.md`

  Things to keep in mind:
  - `params` and `searchParams` are async.
  - `cacheComponents` is on, so request-time data goes behind `<Suspense>`.
  - Every parallel-route slot needs a `default.js`. The plan below avoids parallel routes.
- **Routes** (no parallel routes, so no `default.js` traps):
  - `src/app/(app)/inbox/[folder]/layout.tsx` renders the folder sidebar and the thread list for `params.folder`.
  - `…/[folder]/page.tsx` is the empty "pick a conversation" state.
  - `…/[folder]/[leadId]/page.tsx` is the thread.
  - `/inbox` redirects to `/inbox/needs-reply`.
  - `homePath` in `src/lib/onboarding.ts` sends signed-in users to `/inbox` instead of `/dashboard`.
- **Nav:** Inbox · People · Pipeline · Reports · Settings. People is today's `/contacts`. Pipeline is today's `/leads` board and table, unchanged for now. The dashboard's stat cards move to Reports; the sidebar keeps the "Open pipeline" total.
- **Thread view:**
  - **Header:** title, contact · company, stage chip (reuses `moveLead` and `lost-reason-dialog`), value, close date.
  - **Pinned "Your move":** the next step, with Mark done (`toggleTask`).
  - **Unowned leads:** a "Nobody owns this yet" bar with Take it / Assign to. This needs a small `assignLead` action; reassigning someone else's lead is already admin-only under RLS.
  - **Conversation:** `getTimeline` for the lead, rendered as bubbles and system lines. The existing "via … · unverified" marking and consent text carry over.
  - **Composer:** the current `ActivityComposer`, restyled.
  - **Revalidation:** extend `revalidate()` in `activities/actions.ts` to include `/inbox` paths.
- **Mobile:** below `md` the three panes become two pages: the folder and list, then the thread with a back link.

**Done when** you can run a day from `/inbox` alone: triage new form leads, log calls, tick next steps and move stages.

## Phase 2: adding things and logging faster

- **"New" menu** (button + key C): New conversation · Add a person (today's contact form) · Log on an existing deal (opens search) · Import from CSV (today's wizard) · Share your lead form (copies the hosted form link from Settings › Capture).
- **New conversation sheet**, written like an email: With → About → What happened → Next step, plus the lawful basis.
  - Backed by a new RPC `start_conversation(payload)`. It runs as the user (security **invoker**, so RLS and roles apply, unlike the service-role `capture_lead`). It does, in one transaction: find or create the company → reuse or create the contact (email unique per org) → create the lead → add the first activity → add the next-step task. Today `saveLead` does these steps one by one with no transaction.
  - **Duplicate check endpoint:** exact email match (the existing unique index), plus "similar" (same email domain → company, `ilike` on name). This is a warning only.
  - **Company from domain:** match `companies.website`, or suggest the domain's name.
  - **Paste-to-fill:** a client-side parser for email, phone, URL, name and title lines from a signature or forwarded email. No AI or network call, so nothing pasted leaves the browser.
  - **Undo** in the toast moves the new lead to trash (the soft delete already exists).
- **Slash composer:** `/call /note /email /meeting /task /move /lost`.
  - After `/call`: outcome chips, a suggested stage move and a next step with a date.
  - Submitted through one RPC `log_activity(payload)` that writes the activity, plus optionally the stage move and the next task, atomically.
  - Migration: `activities.direction` (`inbound | outbound`, nullable) so "They emailed / I emailed" feeds Needs reply. Optionally add `activities.outcome text`.

## Phase 3: weekly review

- **Migration:** a `lead_reviews` table (lead_id, reviewed_by, reviewed_at, answer `kept | pushed | lost | skipped`, `close_from`, `close_to`, `next_task_id`), with RLS like activities and pgTAP tests.
- **What's due:** a review is due when you have no review on or after the last `review_day`. Each user reviews the open leads they own; admins can choose "Everyone".
- **What needs a look:** close date passed · quiet past `cold_after_days` · no next step · no owner. All of this comes from `lead_threads`. The rest are listed as "look fine, confirm at the end".
- **UI:**
  - `/inbox/review` is the folder: count, time estimate, the deals that need a look and why.
  - `/inbox/review/[leadId]` shows the thread with the question dock in place of the composer. Keys K/P/L, 1–4 and Enter. The top bar shows progress.
- **Writes:** Keep → no change. Push → update `expected_close_date`. Lost → `moveLead` with a reason. Next step → a task. Every answer → one `lead_reviews` row.
- **Timeline:** `getTimeline` merges review rows as "Reviewed · close date 21 Oct → 15 Jan".
- **Summary:** what changed, plus the weighted forecast before and after (the same probability × value math `reports.ts` already uses) and the next steps created per owner.

## Phase 4: people and the pipeline lens

- **People page:**
  - The person's threads as the main content.
  - The existing Details and Privacy cards (lawful basis, consent, Withdraw / Stop contact / Export data) stay as they are.
  - A "New deal with …" button prefilled for the next conversation.
- **Views inside the inbox:**
  - "By stage": threads grouped by stage, with totals and weighted values, and flags from the last review.
  - "By owner".
- **Keyboard:** C (new), / (composer), j/k (next and previous thread), E (mark done). Show the keys in the menus.
- **Docs:** update `SPEC.md` (home is the inbox; email sync stays a non-goal) and `README` screenshots.

## Later, not planned yet

- Email in threads. Forwarding to a per-org address needs an inbound mail webhook, which is new infrastructure and still a non-goal in `SPEC.md`.
- Console as the dark theme.
- Activity audit logging. Activities aren't in `audit_log` today.

## Decisions needed (none block Phase 0)

1. Pipeline in the nav, or only as "By stage" inside the inbox? This affects Phase 1's nav and Phase 4. My suggestion: keep it in Phase 1, then decide.
2. Weekly review per person or for the whole team?
3. Does the old Dashboard go away entirely, or become a Reports tab?

## Risks

- **Folder rules feel wrong in real use.** They live in one SQL `CASE`, so tuning is a migration, not a UI rewrite.
- **View performance.** It's fine for small teams. If it gets slow, add a trigger-maintained `leads.last_activity_at`.
- **Big diff.** Ship Phase 0 alone first, because it's low-risk and visible.
