-- =============================================================================
-- Dashboards
--
-- A dashboard is a named list of widgets (layout) plus default filters. The
-- layout is one jsonb array, validated by the app (src/lib/dashboards.ts) on
-- every write: a dashboard is always read and saved whole, so there is no
-- per-widget row to keep in sync. layout_version lets the app migrate old
-- layouts on read when widget options change.
--
-- Visibility: 'private' dashboards are seen by their creator only; 'org'
-- dashboards by every member. The creator edits their own; admins can also
-- edit (and soft-delete) dashboards shared with the org. Viewers can keep
-- private dashboards but can't share them.
-- =============================================================================

create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  visibility text not null default 'private' check (visibility in ('private', 'org')),
  -- Default filters: {period, from?, to?, owner?, source?, compare?}.
  filters jsonb not null default '{}' check (jsonb_typeof(filters) = 'object'),
  -- Widgets in display order: [{id, type, span, title?, options}].
  layout jsonb not null default '[]' check (jsonb_typeof(layout) = 'array' and jsonb_array_length(layout) <= 40),
  layout_version smallint not null default 1,
  -- Which template it started from, if any (lets "Reset to template" work).
  template text check (char_length(template) <= 40),
  position integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dashboards_org_idx on public.dashboards (org_id, position) where deleted_at is null;

create trigger dashboards_updated_at before update on public.dashboards
  for each row execute function public.set_updated_at();

-- The org and creator never change, whoever edits the dashboard.
create function public.dashboards_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.org_id := old.org_id;
  new.created_by := old.created_by;
  return new;
end;
$$;
create trigger dashboards_before_update before update on public.dashboards
  for each row execute function public.dashboards_before_update();
revoke execute on function public.dashboards_before_update() from public, anon, authenticated;

alter table public.dashboards enable row level security;

create policy "dashboards: read shared or own" on public.dashboards
  for select to authenticated
  using (public.is_org_member(org_id) and (visibility = 'org' or created_by = (select auth.uid())));

create policy "dashboards: create own" on public.dashboards
  for insert to authenticated
  with check (
    public.is_org_member(org_id)
    and created_by = (select auth.uid())
    and (visibility = 'private' or public.can_edit_org_data(org_id))
  );

create policy "dashboards: edit own, or shared as admin" on public.dashboards
  for update to authenticated
  using (
    public.is_org_member(org_id)
    and (created_by = (select auth.uid()) or (visibility = 'org' and public.is_org_admin(org_id)))
  )
  with check (
    public.is_org_member(org_id)
    and (visibility = 'private' or public.can_edit_org_data(org_id))
    and (created_by = (select auth.uid()) or (visibility = 'org' and public.is_org_admin(org_id)))
  );
-- No delete policy: dashboards are soft-deleted (deleted_at) and go with the org.
