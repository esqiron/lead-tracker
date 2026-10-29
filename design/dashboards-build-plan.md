# Dashboards: build plan

Status: Phase 0 done (e50b1fa): chart tokens and primitives in `charts.tsx`, data functions in `…_dashboards_data.sql` with `dashboards_data_test.sql`. `report()` was left untouched rather than turned into a wrapper; the new functions are additive and tested for parity with it. Phase 1 done (10de97d): `dashboards` table, `/reports/[dashboardId]`, widgets in `reports/widgets.tsx`. Templates are rendered from code and never written on a page view. Phase 2 done: `reports/dashboard-editor.tsx` and `reports/actions.ts`. Editing the built-in dashboard saves a shared copy first; edit mode lives in the URL (`?edit=1`); option changes save and re-render in one round trip (`refresh()` in the action), while order and width changes are local and only saved. The built-in template keeps showing until the team has a shared dashboard. Phase 3 done: `reports/drill.tsx` (sheet and clickable wrappers) and `drillLeads` in `reports/actions.ts`; every widget drills except "Days in each stage" (its numbers are stage moves, not leads) and line charts. Mock: `design/dashboards/dashboards.html`, published at https://claude.ai/artifact/8iN9WgGmLi8V9REtMBeDz5 (preview locally with the `dashboards` entry in `.claude/launch.json`, port 4748).

This plan turns the mock into the real app. Each phase ships on its own and leaves the app working. Today's Reports page keeps working until Phase 1 replaces it with an equivalent dashboard, and its CSV export stays. Before writing route code, read the Next 16 docs listed under Phase 1, because this Next version differs from older ones (see `AGENTS.md`).

## Model in one paragraph

A **dashboard** is a saved, named list of **widgets** plus default **filters** (period, owner, source, compare). A widget is `{ id, type, span, title?, options }`. Its type picks one server-side data function and one renderer. Every data function runs as the caller (security invoker), so RLS decides what a member sees, exactly like `report()` today: a member on `lead_visibility='own'` gets dashboards about their own leads. Filters in the URL override the saved defaults, so any view can be shared as a link without saving. Every number can be **drilled into**: the same function, asked for lead ids instead of totals, feeds a side sheet that links each lead to its Inbox thread.

## Widget catalogue (from the mock)

| Type | Shows | Data source | Period |
|---|---|---|---|
| `kpi` | One metric with a change and a sparkline, or progress to goal | `report_kpis` per bucket | Dashboard period; `weighted` is "right now"; `wonQuarter` is this quarter |
| `trend` | Won value or new leads per bucket, split by source / owner / nothing, as stacked columns or lines | `report_timeline_split` | Dashboard period |
| `forecast` | Won so far, weighted forecast to quarter end with a likely range, the goal, last quarter | `report_forecast` + `goals` | This quarter |
| `funnel` | How far leads created in the period got | `report()` funnel section (exists) | Dashboard period |
| `lost` | Lost reasons with counts and value | `report()` lost_reasons (exists) | Dashboard period |
| `quota` | Each person's won + forecast against their goal | `report_forecast` per owner + `goals` | This quarter |
| `reply` | Time to first reply for form and API leads | `report_first_reply` | Dashboard period |
| `aging` | Open leads by stage × days in that stage | `report_aging` | Right now |
| `calendar` | Activities per day | `report_activity_days` | Last 13 weeks |
| `risk` | Open leads overdue, gone quiet or unowned | `lead_threads` (exists) | Right now |

KPI metrics: won, won this quarter, new leads, win rate, weighted pipeline, average deal, median first reply, activities logged. Each one is already computed by `report()` or is a small addition to it.

## Chart rules (carry over from the mock)

- One categorical set, six slots, validated with the dataviz checks against the card surfaces (`#ffffff` light, `#15181d` dark). Light: `#00899f #eb6834 #2a78d6 #eda100 #e87ba4 #6250d6`. Dark: `#2aa3b0 #d95926 #3987e5 #c98500 #d55181 #9085e9`. Slot 1 is the brand teal stepped up for chroma. Yellow and magenta are under 3:1 on white, so a legend and the table view are always there.
- A heat ramp in one hue (teal, `h1`–`h6`) for aging and the calendar, with its own dark steps.
- Colour follows the entity (Referral is always slot 1, Ana is always slot 1 in owner splits), assigned by the source's or member's stable position, never by rank in the current result. More than six sources or owners fold into "Other" (muted).
- Every chart has hover tooltips, a table view, and text in ink colours, never the series colour. No dual axes.

---

## Phase 0: foundations (no visible change)

- **Tokens:** add `--viz-1`…`--viz-6` and `--heat-1`…`--heat-6` (light and dark) to `globals.css` next to the existing `--viz-*` tokens.
- **Chart primitives** in `src/components/charts.tsx`, which is dependency-free today and stays that way:
  - Extend `ColumnChart` to stack series, with a 2px gap between segments and a rounded top only on the top segment. Add a click handler that reports `(bucket, seriesKey)`.
  - Add `LineChart` (crosshair tooltip, endpoint dots, direct end labels when there are four or fewer series), `Sparkline`, `HeatGrid`, `CalendarHeat`, `BulletList` and `ForecastChart`.
  - Size charts with a `ResizeObserver` on their container, because SVG text must not scale with the viewBox.
- **Data functions.** Split `report()` into per-section functions so each widget only pays for what it shows. Keep `report()` as a wrapper so the current page and `/reports/export` don't change. New migration `…_dashboards_data.sql`, every function `security invoker`, `stable`, `search_path = ''`, guarded by `is_org_member`:
  - `report_kpis(org, from, to, owner, source, bucket)` returns per-bucket rows for every KPI metric, so the sparkline and the headline come from one call.
  - `report_timeline_split(org, from, to, owner, source, measure, split)` returns `(bucket, key, value)`.
  - `report_aging(org, owner, source)`: days in the current stage = now − the latest `lead_stage_history.changed_at` for the lead, or `created_at` if it never moved.
  - `report_activity_days(org, from, to, owner)`: activities per day in the org's time zone.
  - `report_first_reply(org, from, to, owner, source)`: for leads with `source_id` set (form, API), the hours from `created_at` to the first activity by a member that is a call, meeting, or an email with `direction='outbound'`.
  - `report_drill(org, widget_type, params jsonb)` returns lead ids for any cell. It's one function with a `CASE` per widget type, so drill rules live next to the totals they explain.
  - Index: `activities (org_id, created_at)` for the calendar and reply time, if the existing ones don't cover it (check with `explain`).
- **Tests:** `supabase/tests/dashboards_data_test.sql` (pgTAP, `tests.as_role`). Check totals against hand-counted seed data, check that `report_kpis` matches `report()` for the same period, and check that a member on `lead_visibility='own'` only gets their own leads from every function, `report_drill` included.

**Done when** each function returns the same numbers as the current Reports page for the seed org, and the new chart components render in a scratch page in light and dark.

## Phase 1: read-only dashboards replace Reports

- **Read first** (in `node_modules/next/dist/docs/01-app/`): `03-api-reference/03-file-conventions/` (dynamic segments), `02-guides/server-actions.md`, `forms.md`, `preserving-ui-state.md`, `instant-navigation.md`, `01-getting-started/09-revalidating.md`. Keep in mind that `params` and `searchParams` are async, and that `cacheComponents` is on, so request-time data goes behind `<Suspense>`.
- **Migration `…_dashboards.sql`:**
  - Table `dashboards`: `id, org_id, created_by, name, visibility ('private' | 'org'), filters jsonb, layout jsonb, position int, created_at, updated_at, deleted_at`.
  - `layout` is one jsonb array instead of a widgets table. A dashboard is always read and written whole, reordering is a single update, and there's no per-widget RLS to get wrong. A `check (jsonb_typeof(layout) = 'array')` constraint plus a zod schema on every write (`src/lib/dashboards.ts`) keep it honest. Store `layout_version int default 1` so later shape changes can migrate.
  - RLS:
    - Read: `private` → the creator only; `org` → every org member.
    - Write: private → the creator; org-visible → its creator or an admin.
    - Delete: soft, same as leads.
  - pgTAP for each rule.
- **Templates, not seed rows.** "Pipeline health", "My week" and "Marketing" are layouts in code. The first visit to `/reports` with no dashboards creates "Pipeline health" as an org dashboard. The rest are offered by "New dashboard".
- **Routes:**
  - `src/app/(app)/reports/page.tsx` redirects to the first dashboard the user can see.
  - `src/app/(app)/reports/[dashboardId]/page.tsx` has tabs for every visible dashboard (ordered by `position`, private ones after shared ones), the head (name, "Shared with the team" / "Only you"), and the filter row.
  - Filters live in `searchParams` (`period`, `owner`, `source`, `compare`). Missing params fall back to the dashboard's saved `filters`. Reuse `ParamSelect` and `PeriodPicker`, plus the existing custom from/to range.
- **Rendering:** the page maps the layout to `<Widget>` server components, each in its own `<Suspense>` with a skeleton the size of its span, so a slow aging query doesn't hold up the KPIs. A widget fetches its data with the dashboard filters merged with its own period override, then passes plain data to a client renderer for hover and the table toggle.
- **Parity:** the "Pipeline health" template has to cover everything today's Reports page shows (KPIs, won timeline, won/lost, funnel, stage pipeline, days in stage, lost reasons, sources, team table). Add `stage_value`, `velocity`, `sources_table` and `team_table` widget types if needed rather than drop anything. CSV export moves to each widget's menu (admin-only, as today) and calls the existing export route.
- **Nav:** still "Reports". The old `/dashboard` route redirects to `/reports`.

**Done when** `/reports` shows "Pipeline health" with the same numbers as the old page, filters round-trip through the URL, and members on `own` visibility see only their numbers.

## Phase 2: customize (edit mode)

- **Client island** `dashboard-editor.tsx`, shown only to people allowed to write the dashboard. "Edit dashboard" toggles it, and no route change is needed.
- **Moving and sizing:** native HTML5 drag to reorder, with Earlier/Later buttons and arrow keys for keyboard and touch users. Width steps ¼ ⅓ ½ ⅔ Full, mapped to a 12-column grid. No drag library.
- **Drawer:**
  - With nothing selected, it's the widget library, grouped as in the mock: Numbers, Over time, Breakdowns, Pipeline health.
  - With a widget selected, it shows the widget's settings: title, width, chart or table, and type-specific options such as metric, measure, split, chart style, and goal.
  - The options for each type come from a zod schema per widget type in `src/lib/dashboards.ts`, so the drawer, validation and defaults share one definition.
  - Below `lg` the drawer becomes a bottom sheet.
- **Saving:** one server action `saveDashboard({ id, name, filters, layout })`. It's validated with zod and debounced from the client (about 600 ms after the last change), with optimistic UI. Also "Reset to template" for template-based dashboards, plus New, Duplicate, Rename and Delete (soft, with an Undo toast as in the Inbox).
- **Describe a chart:** ship the keyword matcher from the mock (client-only, no network). A free-text LLM version needs the same privacy story as the Command line concept, so it's out of scope here.
- **Saved filters:** in edit mode, changing a filter updates the dashboard's defaults. Outside edit mode it only changes the URL.

**Done when** someone can build "My week" from a blank dashboard without help, reload, and find it as they left it on another device.

## Phase 3: drill-down

- Clicking a KPI value, a column segment, a funnel step, a heat cell, a lost reason or a person's bar calls `report_drill` through a server action and opens a sheet: eyebrow (widget and period), title (the cell), count and total, then the leads (title, company · owner · source · date, stage badge, value).
- Each row links to the lead's thread at `/inbox/[scope]/[folder]/[leadId]`, using scope `all` and the folder the lead is in, or to `/leads/[id]` for closed leads that are no longer in a folder.
- The sheet is a client component. Escape closes it and focus returns to the clicked mark.
- pgTAP: for each widget type, the drill ids for a cell add up to that cell's total.

## Phase 4: goals and the forecast

- **Migration `…_goals.sql`:** table `goals (org_id, user_id null = team, period_start date, period_end date, amount numeric)`, unique on `(org_id, user_id, period_start)`. RLS: members read, admins write. pgTAP for it.
- **Settings › Goals** (admin): a quarter picker, a team goal, and a goal per member. Default the team goal to the sum of member goals when it's left blank.
- **`report_forecast(org, owner, source, quarter_start)`:**
  - Actual: cumulative won value by day.
  - Projection: the open leads' value × stage probability, placed on `expected_close_date`. Leads with a past or missing close date go to today + 10 days and are counted in an "assumed date" note, so the chart doesn't hide them.
  - Range: low = actual + 0.6 × projection, high = actual + 1.45 × projection (the mock's constants). Document the rule in the widget's info text and keep the constants in one place so they can be tuned.
  - Previous quarter: cumulative won by day, for the comparison line.
- **Widgets:** `forecast`, `quota`, and the `kpi` "won this quarter" with its pace mark (goal × share of the quarter elapsed) and an Ahead / Behind badge.
- **Weekly review tie-in:** the review summary already shows the forecast before and after. Make it call `report_forecast` so both screens use the same number.

## Phase 5: pipeline health widgets

- `aging` (with "31+ days counts as stale"; tie the threshold to `organizations.settings.cold_after_days` or a new `stale_after_days`), `calendar`, `reply`, `risk` (reuses `lead_threads`, so it matches the Inbox's Going cold / Needs reply rules exactly).
- `risk` rows open the thread directly, and "See all" opens the drill sheet.

## Later, not planned yet

- **Scheduled email** ("Emailed Mondays at 08:00"). `nodemailer` is there, but nothing runs on a schedule today. It needs a cron (pg_cron, or the host's cron hitting a signed route) and a self-hosting note in `docs/self-hosting.md`. The first version would send the KPI numbers and a link, not chart images.
- **Public share links** for building in public (read-only, numbers only, no names). This needs a token table and an anonymous route, and a GDPR review because owner and company names would leak.
- **Custom metrics** (a filter builder over any lead field). Wait until people ask for something the catalogue can't do.
- **Dashboards on the Inbox home**, such as pinning one KPI to the Inbox sidebar.

## Decisions needed (none block Phase 0)

1. **Nav label:** keep "Reports", or rename it to "Dashboards"? My suggestion: keep Reports, since it's what people look for, and call the things inside it dashboards.
2. **Who can make a dashboard visible to the whole org:** anyone, or admins only? My suggestion: anyone can share, and only the creator or an admin can edit or delete.
3. **Are goals visible to all members?** Sales teams differ. My suggestion: visible by default, with an org setting to show each member only their own goal and the team total.
4. **Remove `/dashboard`?** This is open from the Inbox plan. Dashboards make it redundant, so I'd redirect it in Phase 1.

## Risks

- **Query cost with many widgets.** Thirteen widgets means thirteen RPCs per page view. Each is small and indexed, and Suspense streams them. If it's still slow, cache per `(dashboard, filters)` for a minute with `"use cache"` and revalidate it from the existing lead and activity actions.
- **Forecast trust.** A forecast that's visibly wrong loses the whole page. Show the method on hover, flag leads with assumed close dates, and let the weekly review fix the dates. That's the loop that makes the forecast true.
- **Layout JSON drift.** Widget options will change. `layout_version` plus a pure `migrateLayout()` that runs on read keeps old dashboards rendering.
- **Big diff.** Phases 0–1 alone are a full replacement of Reports with parity. Ship them before any editing UI.
