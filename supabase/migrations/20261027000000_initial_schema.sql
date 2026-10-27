-- =============================================================================
-- Lead Tracker — initial schema
--
-- Every tenant-owned row carries org_id. Child tables reference parents through
-- composite (org_id, id) foreign keys, so a row can never point at a record in
-- another organization. Access is enforced with Row Level Security; writes that
-- need cross-row invariants (creating orgs, accepting invites, changing roles)
-- go through SECURITY DEFINER functions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.org_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.membership_status as enum ('active', 'disabled');
create type public.lead_status as enum ('open', 'won', 'lost');
create type public.activity_type as enum ('note', 'call', 'email', 'meeting', 'task');
create type public.lead_visibility as enum ('all', 'own');
-- Declaration order matters: the app compares steps to know how far setup got.
create type public.setup_step as enum ('organization', 'pipeline', 'sources', 'team', 'import', 'done');

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (one per auth user)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Organizations & memberships
-- -----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'UTC',
  date_format text not null default 'yyyy-MM-dd',
  lead_visibility public.lead_visibility not null default 'all',
  setup_step public.setup_step not null default 'pipeline',
  setup_completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'member',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create unique index memberships_one_owner on public.memberships (org_id) where role = 'owner';
create index memberships_user_id_idx on public.memberships (user_id);

create trigger memberships_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Authorization helpers (used by RLS policies)
-- SECURITY DEFINER so policies on memberships don't recurse into themselves.
-- -----------------------------------------------------------------------------
create function public.current_org_role(p_org uuid)
returns public.org_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  where m.org_id = p_org
    and m.user_id = (select auth.uid())
    and m.status = 'active';
$$;

create function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_org_role(p_org) is not null;
$$;

create function public.has_org_role(p_org uuid, p_roles public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_org_role(p_org) = any (p_roles), false);
$$;

create function public.is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_org_role(p_org, array['owner', 'admin']::public.org_role[]);
$$;

create function public.can_edit_org_data(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_org_role(p_org, array['owner', 'admin', 'member']::public.org_role[]);
$$;

-- Owners, admins and viewers always see everything; members depend on the
-- org's lead_visibility setting.
create function public.can_see_all_records(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_org_role(p_org)
    when 'owner' then true
    when 'admin' then true
    when 'viewer' then true
    when 'member' then (select o.lead_visibility = 'all' from public.organizations o where o.id = p_org)
    else false
  end;
$$;

create function public.can_view_record(p_org uuid, p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_see_all_records(p_org)
      or (public.is_org_member(p_org) and p_owner = (select auth.uid()));
$$;

create function public.shares_org_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.org_id = mine.org_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = p_user
  );
$$;

-- -----------------------------------------------------------------------------
-- Invitations
-- -----------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.org_role not null default 'member' check (role <> 'owner'),
  -- sha256 hex of the token in the invite link; the raw token is never stored.
  token_hash text not null unique,
  invited_by uuid references public.profiles (id) on delete set null default auth.uid(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invitations_one_pending_per_email
  on public.invitations (org_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- -----------------------------------------------------------------------------
-- Pipeline configuration
-- -----------------------------------------------------------------------------
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  position integer not null,
  probability integer not null default 0 check (probability between 0 and 100),
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  check (not (is_won and is_lost))
);
create unique index pipeline_stages_one_won on public.pipeline_stages (org_id) where is_won;
create unique index pipeline_stages_one_lost on public.pipeline_stages (org_id) where is_lost;
create index pipeline_stages_org_position_idx on public.pipeline_stages (org_id, position);

create trigger pipeline_stages_updated_at before update on public.pipeline_stages
  for each row execute function public.set_updated_at();

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, id)
);
create unique index lead_sources_org_name_key on public.lead_sources (org_id, lower(name));

-- -----------------------------------------------------------------------------
-- CRM records
-- -----------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  website text,
  industry text,
  size text,
  owner_id uuid references public.profiles (id) on delete set null,
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}',
  notes text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);
create index companies_org_idx on public.companies (org_id) where deleted_at is null;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  title text,
  company_id uuid,
  owner_id uuid references public.profiles (id) on delete set null,
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}',
  notes text,
  -- GDPR: what the person agreed to, when, and where (e.g. a capture form id).
  consent_text text,
  consented_at timestamptz,
  consent_source text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, company_id) references public.companies (org_id, id) on delete set null (company_id),
  check (coalesce(nullif(trim(first_name), ''), nullif(trim(last_name), ''), nullif(trim(email), '')) is not null)
);
create unique index contacts_org_email_key on public.contacts (org_id, lower(email))
  where email is not null and deleted_at is null;
create index contacts_org_idx on public.contacts (org_id) where deleted_at is null;
create index contacts_company_idx on public.contacts (company_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  contact_id uuid,
  company_id uuid,
  owner_id uuid references public.profiles (id) on delete set null,
  stage_id uuid not null,
  source_id uuid,
  value numeric(14, 2) not null default 0 check (value >= 0),
  -- Defaults to the org currency (see leads_before_write).
  currency char(3) check (currency ~ '^[A-Z]{3}$'),
  expected_close_date date,
  status public.lead_status not null default 'open',
  lost_reason text,
  closed_at timestamptz,
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, contact_id) references public.contacts (org_id, id) on delete set null (contact_id),
  foreign key (org_id, company_id) references public.companies (org_id, id) on delete set null (company_id),
  foreign key (org_id, stage_id) references public.pipeline_stages (org_id, id) on delete restrict,
  foreign key (org_id, source_id) references public.lead_sources (org_id, id) on delete set null (source_id)
);
create index leads_org_stage_idx on public.leads (org_id, stage_id) where deleted_at is null;
create index leads_org_owner_idx on public.leads (org_id, owner_id) where deleted_at is null;
create index leads_contact_idx on public.leads (contact_id);
create index leads_company_idx on public.leads (company_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  type public.activity_type not null,
  lead_id uuid,
  contact_id uuid,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, lead_id) references public.leads (org_id, id) on delete cascade,
  foreign key (org_id, contact_id) references public.contacts (org_id, id) on delete cascade,
  check (lead_id is not null or contact_id is not null)
);
create index activities_lead_idx on public.activities (lead_id);
create index activities_contact_idx on public.activities (contact_id);
create index activities_assignee_due_idx on public.activities (org_id, assigned_to, due_at)
  where completed_at is null;

create table public.lead_stage_history (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  lead_id uuid not null,
  from_stage_id uuid,
  to_stage_id uuid,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  foreign key (org_id, lead_id) references public.leads (org_id, id) on delete cascade,
  foreign key (org_id, from_stage_id) references public.pipeline_stages (org_id, id) on delete set null (from_stage_id),
  foreign key (org_id, to_stage_id) references public.pipeline_stages (org_id, id) on delete set null (to_stage_id)
);
create index lead_stage_history_lead_idx on public.lead_stage_history (lead_id, changed_at);
create index lead_stage_history_org_idx on public.lead_stage_history (org_id, changed_at);

create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_created_idx on public.audit_log (org_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- -----------------------------------------------------------------------------
-- Inbound capture (API keys + embeddable forms)
-- -----------------------------------------------------------------------------
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  -- First characters of the key, shown in the UI so people can tell keys apart.
  key_prefix text not null,
  key_hash text not null unique,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_keys_org_idx on public.api_keys (org_id);

create table public.capture_forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Public identifier used in embed URLs (the uuid stays internal).
  public_id text not null unique default replace(gen_random_uuid()::text, '-', ''),
  name text not null check (char_length(trim(name)) between 1 and 80),
  fields jsonb not null default '[
    {"key": "first_name", "label": "First name", "required": true},
    {"key": "last_name", "label": "Last name", "required": false},
    {"key": "email", "label": "Email", "required": true},
    {"key": "phone", "label": "Phone", "required": false},
    {"key": "message", "label": "Message", "required": false}
  ]',
  default_stage_id uuid,
  default_source_id uuid,
  default_owner_id uuid references public.profiles (id) on delete set null,
  round_robin boolean not null default false,
  allowed_origins text[] not null default '{}',
  redirect_url text,
  consent_text text,
  notify_owner boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, default_stage_id) references public.pipeline_stages (org_id, id) on delete set null (default_stage_id),
  foreign key (org_id, default_source_id) references public.lead_sources (org_id, id) on delete set null (default_source_id)
);

-- -----------------------------------------------------------------------------
-- updated_at triggers for CRM tables
-- -----------------------------------------------------------------------------
create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();
create trigger capture_forms_updated_at before update on public.capture_forms
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Record guards: org_id is immutable, and only admins or the record owner may
-- move a record to (or restore it from) the trash.
-- auth.uid() is null for service-role / migration writes, which are trusted.
-- -----------------------------------------------------------------------------
create function public.guard_record_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.org_id <> old.org_id then
    raise exception 'org_id cannot be changed' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at
     and (select auth.uid()) is not null
     and not public.is_org_admin(old.org_id)
     and old.owner_id is distinct from (select auth.uid()) then
    raise exception 'Only admins or the record owner can delete or restore this record'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger companies_guard before update on public.companies
  for each row execute function public.guard_record_update();
create trigger contacts_guard before update on public.contacts
  for each row execute function public.guard_record_update();
create trigger leads_guard before update on public.leads
  for each row execute function public.guard_record_update();

-- Keep lead status/closed_at in sync with the stage, and default the currency.
create function public.leads_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_stage public.pipeline_stages;
begin
  if new.currency is null then
    select o.currency into new.currency from public.organizations o where o.id = new.org_id;
  end if;

  if tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    select * into v_stage from public.pipeline_stages s where s.id = new.stage_id;
    if v_stage.is_won then
      new.status := 'won';
      new.closed_at := coalesce(new.closed_at, now());
      new.lost_reason := null;
    elsif v_stage.is_lost then
      new.status := 'lost';
      new.closed_at := coalesce(new.closed_at, now());
    else
      new.status := 'open';
      new.closed_at := null;
      new.lost_reason := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger leads_before_write before insert or update on public.leads
  for each row execute function public.leads_before_write();

create function public.record_lead_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    insert into public.lead_stage_history (org_id, lead_id, from_stage_id, to_stage_id, changed_by)
    values (
      new.org_id,
      new.id,
      case when tg_op = 'UPDATE' then old.stage_id end,
      new.stage_id,
      (select auth.uid())
    );
  end if;
  return null;
end;
$$;

create trigger leads_stage_history after insert or update of stage_id on public.leads
  for each row execute function public.record_lead_stage_change();

-- Lightweight audit trail for CRM records.
create function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := coalesce(new.org_id, old.org_id);
  v_diff jsonb;
begin
  -- Rows deleted because their organization is being deleted: nothing to audit.
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations o where o.id = v_org) then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_diff := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, n.value) into v_diff
    from jsonb_each(to_jsonb(new)) n
    where n.key <> 'updated_at'
      and (to_jsonb(old) -> n.key) is distinct from n.value;
    if v_diff is null then
      return null;
    end if;
  else
    v_diff := to_jsonb(old);
  end if;

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, diff)
  values (v_org, (select auth.uid()), lower(tg_op), tg_table_name, coalesce(new.id, old.id), v_diff);
  return null;
end;
$$;

create trigger companies_audit after insert or update or delete on public.companies
  for each row execute function public.write_audit_log();
create trigger contacts_audit after insert or update or delete on public.contacts
  for each row execute function public.write_audit_log();
create trigger leads_audit after insert or update or delete on public.leads
  for each row execute function public.write_audit_log();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.lead_sources enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.audit_log enable row level security;
alter table public.api_keys enable row level security;
alter table public.capture_forms enable row level security;

-- Profiles: yourself and people you share an organization with.
create policy "profiles: read self and teammates" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_org_with(id));
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Organizations: created via create_organization(); admins edit settings; only the owner deletes.
create policy "organizations: members read" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));
create policy "organizations: admins update" on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));
create policy "organizations: owner deletes" on public.organizations
  for delete to authenticated
  using (public.has_org_role(id, array['owner']::public.org_role[]));

-- Memberships: readable by fellow members; all changes go through RPCs.
create policy "memberships: members read" on public.memberships
  for select to authenticated
  using (public.is_org_member(org_id));

-- Invitations: admins only. Invitees use get_invitation()/accept_invitation().
create policy "invitations: admins read" on public.invitations
  for select to authenticated
  using (public.is_org_admin(org_id));
create policy "invitations: admins create" on public.invitations
  for insert to authenticated
  with check (public.is_org_admin(org_id) and role <> 'owner' and invited_by = (select auth.uid()));
create policy "invitations: admins update" on public.invitations
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id) and role <> 'owner');
create policy "invitations: admins delete" on public.invitations
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- Pipeline stages & lead sources: members read, admins manage.
create policy "pipeline_stages: members read" on public.pipeline_stages
  for select to authenticated using (public.is_org_member(org_id));
create policy "pipeline_stages: admins insert" on public.pipeline_stages
  for insert to authenticated with check (public.is_org_admin(org_id));
create policy "pipeline_stages: admins update" on public.pipeline_stages
  for update to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "pipeline_stages: admins delete" on public.pipeline_stages
  for delete to authenticated using (public.is_org_admin(org_id));

create policy "lead_sources: members read" on public.lead_sources
  for select to authenticated using (public.is_org_member(org_id));
create policy "lead_sources: admins insert" on public.lead_sources
  for insert to authenticated with check (public.is_org_admin(org_id));
create policy "lead_sources: admins update" on public.lead_sources
  for update to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "lead_sources: admins delete" on public.lead_sources
  for delete to authenticated using (public.is_org_admin(org_id));

-- Companies / contacts / leads share one shape:
--   read:   visible per lead_visibility. Trashed rows (deleted_at set) stay
--           readable so they can be restored; app queries filter them out.
--           (Hiding them here would also block soft deletes, because Postgres
--           checks an updated row against SELECT policies too.)
--   write:  owner/admin/member (viewers are read-only)
--   delete: hard delete is admin-only (soft delete is guarded by guard_record_update)
create policy "companies: read" on public.companies
  for select to authenticated
  using (public.can_view_record(org_id, owner_id));
create policy "companies: insert" on public.companies
  for insert to authenticated
  with check (public.can_edit_org_data(org_id) and created_by = (select auth.uid()));
create policy "companies: update" on public.companies
  for update to authenticated
  using (public.can_edit_org_data(org_id) and public.can_view_record(org_id, owner_id))
  with check (public.can_edit_org_data(org_id));
create policy "companies: admins delete" on public.companies
  for delete to authenticated using (public.is_org_admin(org_id));

create policy "contacts: read" on public.contacts
  for select to authenticated
  using (public.can_view_record(org_id, owner_id));
create policy "contacts: insert" on public.contacts
  for insert to authenticated
  with check (public.can_edit_org_data(org_id) and created_by = (select auth.uid()));
create policy "contacts: update" on public.contacts
  for update to authenticated
  using (public.can_edit_org_data(org_id) and public.can_view_record(org_id, owner_id))
  with check (public.can_edit_org_data(org_id));
create policy "contacts: admins delete" on public.contacts
  for delete to authenticated using (public.is_org_admin(org_id));

create policy "leads: read" on public.leads
  for select to authenticated
  using (public.can_view_record(org_id, owner_id));
create policy "leads: insert" on public.leads
  for insert to authenticated
  with check (public.can_edit_org_data(org_id) and created_by = (select auth.uid()));
create policy "leads: update" on public.leads
  for update to authenticated
  using (public.can_edit_org_data(org_id) and public.can_view_record(org_id, owner_id))
  with check (public.can_edit_org_data(org_id));
create policy "leads: admins delete" on public.leads
  for delete to authenticated using (public.is_org_admin(org_id));

-- Activities: visible if you can see everything, wrote it, are assigned it,
-- or own the lead it belongs to.
create policy "activities: read" on public.activities
  for select to authenticated
  using (
    public.is_org_member(org_id) and (
      public.can_see_all_records(org_id)
      or created_by = (select auth.uid())
      or assigned_to = (select auth.uid())
      or exists (select 1 from public.leads l where l.id = activities.lead_id)
    )
  );
create policy "activities: insert" on public.activities
  for insert to authenticated
  with check (public.can_edit_org_data(org_id) and created_by = (select auth.uid()));
create policy "activities: update" on public.activities
  for update to authenticated
  using (
    public.can_edit_org_data(org_id)
    and (created_by = (select auth.uid()) or assigned_to = (select auth.uid()) or public.is_org_admin(org_id))
  )
  with check (public.can_edit_org_data(org_id));
create policy "activities: delete" on public.activities
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_org_admin(org_id));

-- Stage history follows lead visibility (leads RLS applies inside the subquery).
create policy "lead_stage_history: read" on public.lead_stage_history
  for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_stage_history.lead_id));

create policy "audit_log: admins read" on public.audit_log
  for select to authenticated using (public.is_org_admin(org_id));

create policy "api_keys: admins read" on public.api_keys
  for select to authenticated using (public.is_org_admin(org_id));
create policy "api_keys: admins insert" on public.api_keys
  for insert to authenticated with check (public.is_org_admin(org_id));
create policy "api_keys: admins update" on public.api_keys
  for update to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "api_keys: admins delete" on public.api_keys
  for delete to authenticated using (public.is_org_admin(org_id));

create policy "capture_forms: members read" on public.capture_forms
  for select to authenticated using (public.is_org_member(org_id));
create policy "capture_forms: admins insert" on public.capture_forms
  for insert to authenticated with check (public.is_org_admin(org_id));
create policy "capture_forms: admins update" on public.capture_forms
  for update to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "capture_forms: admins delete" on public.capture_forms
  for delete to authenticated using (public.is_org_admin(org_id));

-- =============================================================================
-- RPCs
-- =============================================================================

-- True once anyone has an account. Lets /setup know whether to show the
-- first-owner form. Callable without signing in.
create function public.instance_initialized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users);
$$;

-- Creates an organization, makes the caller its owner, and seeds default
-- pipeline stages and lead sources.
create function public.create_organization(
  p_name text,
  p_currency text default 'EUR',
  p_timezone text default 'UTC',
  p_date_format text default 'yyyy-MM-dd'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_base text;
  v_slug text;
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_base := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then
    v_base := 'org';
  end if;
  v_base := left(v_base, 48);
  v_slug := v_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_slug := v_base || '-' || substr(md5(random()::text), 1, 6);
  end loop;

  insert into public.organizations (name, slug, currency, timezone, date_format, created_by)
  values (trim(p_name), v_slug, upper(p_currency), p_timezone, p_date_format, v_uid)
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role) values (v_org, v_uid, 'owner');

  insert into public.pipeline_stages (org_id, name, position, probability, is_won, is_lost) values
    (v_org, 'New',         0, 10,  false, false),
    (v_org, 'Contacted',   1, 20,  false, false),
    (v_org, 'Qualified',   2, 40,  false, false),
    (v_org, 'Proposal',    3, 60,  false, false),
    (v_org, 'Negotiation', 4, 80,  false, false),
    (v_org, 'Won',         5, 100, true,  false),
    (v_org, 'Lost',        6, 0,   false, true);

  insert into public.lead_sources (org_id, name, position) values
    (v_org, 'Website', 0),
    (v_org, 'Referral', 1),
    (v_org, 'LinkedIn', 2),
    (v_org, 'Cold outreach', 3),
    (v_org, 'Event', 4),
    (v_org, 'Other', 5);

  return v_org;
end;
$$;

-- Replaces the pipeline. p_stages is an ordered array of
--   {"id": uuid|null, "name": text, "probability": int, "kind": "open"|"won"|"lost"}
-- Open stages keep the given order; Won and Lost always sit at the end.
create function public.save_pipeline_stages(p_org uuid, p_stages jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_kind text;
  v_id uuid;
  v_keep uuid[] := '{}';
  v_pos integer := 0;
  v_open integer;
begin
  if not public.is_org_admin(p_org) then
    raise exception 'Only admins can change the pipeline' using errcode = '42501';
  end if;
  if jsonb_typeof(p_stages) <> 'array' then
    raise exception 'Stages must be an array' using errcode = '22023';
  end if;

  select count(*) into v_open from jsonb_array_elements(p_stages) e where e ->> 'kind' = 'open';
  if v_open = 0 then
    raise exception 'Add at least one open stage' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements(p_stages) e where e ->> 'kind' = 'won') <> 1
     or (select count(*) from jsonb_array_elements(p_stages) e where e ->> 'kind' = 'lost') <> 1 then
    raise exception 'The pipeline needs exactly one Won and one Lost stage' using errcode = '22023';
  end if;

  -- Move positions out of the way so reordering never collides mid-update.
  update public.pipeline_stages set position = position + 10000 where org_id = p_org;

  for v_item in
    select e from jsonb_array_elements(p_stages) with ordinality as t(e, i)
    order by case e ->> 'kind' when 'open' then 0 when 'won' then 1 else 2 end, i
  loop
    v_kind := v_item ->> 'kind';
    v_id := nullif(v_item ->> 'id', '')::uuid;

    if v_id is not null and exists (select 1 from public.pipeline_stages where id = v_id and org_id = p_org) then
      update public.pipeline_stages
      set name = trim(v_item ->> 'name'),
          probability = coalesce((v_item ->> 'probability')::integer, 0),
          position = v_pos,
          is_won = v_kind = 'won',
          is_lost = v_kind = 'lost'
      where id = v_id;
    else
      insert into public.pipeline_stages (org_id, name, position, probability, is_won, is_lost)
      values (
        p_org,
        trim(v_item ->> 'name'),
        v_pos,
        coalesce((v_item ->> 'probability')::integer, 0),
        v_kind = 'won',
        v_kind = 'lost'
      )
      returning id into v_id;
    end if;

    v_keep := v_keep || v_id;
    v_pos := v_pos + 1;
  end loop;

  if exists (
    select 1 from public.leads l
    where l.org_id = p_org and l.stage_id <> all (v_keep)
  ) then
    raise exception 'A stage you removed still has leads. Move them first.' using errcode = '23503';
  end if;

  delete from public.pipeline_stages where org_id = p_org and id <> all (v_keep);
end;
$$;

-- Replaces lead sources. p_sources is an ordered array of {"id": uuid|null, "name": text}.
-- Leads pointing at a removed source keep the lead and lose the source.
create function public.save_lead_sources(p_org uuid, p_sources jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_id uuid;
  v_keep uuid[] := '{}';
  v_pos integer := 0;
begin
  if not public.is_org_admin(p_org) then
    raise exception 'Only admins can change lead sources' using errcode = '42501';
  end if;
  if jsonb_typeof(p_sources) <> 'array' then
    raise exception 'Sources must be an array' using errcode = '22023';
  end if;

  -- Free up names first so renames like A↔B don't trip the unique index.
  update public.lead_sources set name = id::text where org_id = p_org;

  for v_item in select e from jsonb_array_elements(p_sources) with ordinality as t(e, i) order by i loop
    v_id := nullif(v_item ->> 'id', '')::uuid;
    if v_id is not null and exists (select 1 from public.lead_sources where id = v_id and org_id = p_org) then
      update public.lead_sources set name = trim(v_item ->> 'name'), position = v_pos where id = v_id;
    else
      insert into public.lead_sources (org_id, name, position)
      values (p_org, trim(v_item ->> 'name'), v_pos)
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
    v_pos := v_pos + 1;
  end loop;

  delete from public.lead_sources where org_id = p_org and id <> all (v_keep);
end;
$$;

-- Public lookup for the invite page. The token itself is the secret.
create function public.get_invitation(p_token text)
returns table (
  org_id uuid,
  org_name text,
  email text,
  role public.org_role,
  invited_by_name text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.org_id,
    o.name,
    i.email,
    i.role,
    coalesce(p.full_name, p.email),
    case
      when i.accepted_at is not null then 'accepted'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at < now() then 'expired'
      else 'pending'
    end
  from public.invitations i
  join public.organizations o on o.id = i.org_id
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- Accepts an invitation for the signed-in user. Their email must match.
create function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_inv public.invitations;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_inv
  from public.invitations
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;

  if not found or v_inv.revoked_at is not null then
    raise exception 'This invitation is not valid' using errcode = 'P0002';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'This invitation has already been used' using errcode = 'P0002';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'This invitation has expired' using errcode = 'P0002';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;
  if lower(v_email) <> lower(v_inv.email) then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;

  insert into public.memberships (org_id, user_id, role, status)
  values (v_inv.org_id, v_uid, v_inv.role, 'active')
  on conflict (org_id, user_id) do update
    set status = 'active',
        role = case when public.memberships.role = 'owner' then 'owner'::public.org_role else excluded.role end;

  update public.invitations
  set accepted_at = now(), accepted_by = v_uid
  where id = v_inv.id;

  return v_inv.org_id;
end;
$$;

-- Role changes. Admins can't touch the owner or create owners; nobody can
-- leave an org without an owner (use transfer_ownership for that).
create function public.update_member_role(p_membership uuid, p_role public.org_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m public.memberships;
begin
  select * into v_m from public.memberships where id = p_membership for update;
  if not found or not public.is_org_admin(v_m.org_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_m.role = 'owner' or p_role = 'owner' then
    raise exception 'Use transfer_ownership to change the owner' using errcode = '42501';
  end if;
  update public.memberships set role = p_role where id = p_membership;
end;
$$;

create function public.remove_member(p_membership uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m public.memberships;
begin
  select * into v_m from public.memberships where id = p_membership for update;
  if not found then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_m.role = 'owner' then
    raise exception 'The owner can''t be removed. Transfer ownership first.' using errcode = '42501';
  end if;
  -- Admins can remove anyone but the owner; anyone can leave on their own.
  if not public.is_org_admin(v_m.org_id) and v_m.user_id <> (select auth.uid()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.memberships where id = p_membership;
end;
$$;

create function public.transfer_ownership(p_org uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_org_role(p_org, array['owner']::public.org_role[]) then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = p_new_owner and status = 'active'
  ) then
    raise exception 'The new owner must be an active member' using errcode = '22023';
  end if;
  update public.memberships set role = 'admin' where org_id = p_org and role = 'owner';
  update public.memberships set role = 'owner' where org_id = p_org and user_id = p_new_owner;
end;
$$;

-- Sample data for exploring the app. Everything is tagged 'sample' so
-- clear_sample_data() can remove it again.
create function public.load_sample_data(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_stages uuid[];
  v_won uuid;
  v_lost uuid;
  v_sources uuid[];
  v_company uuid;
  v_contact uuid;
  v_lead uuid;
  v_i integer;
  v_companies text[] := array['Northwind Traders', 'Acme Robotics', 'Blue Harbor Studio', 'Greenfield Foods', 'Lumen Health', 'Atlas Logistics'];
  v_first text[] := array['Ana', 'Mihai', 'Sofia', 'Luca', 'Elena', 'David'];
  v_last text[] := array['Popescu', 'Ionescu', 'Marin', 'Rossi', 'Dumitru', 'Klein'];
  v_titles text[] := array['Website redesign', 'Annual support plan', 'Onboarding package', 'Pilot project', 'Team training', 'Integration setup'];
begin
  if not public.is_org_admin(p_org) then
    raise exception 'Only admins can load sample data' using errcode = '42501';
  end if;

  select array_agg(id order by position) into v_stages
  from public.pipeline_stages where org_id = p_org and not is_won and not is_lost;
  select id into v_won from public.pipeline_stages where org_id = p_org and is_won;
  select id into v_lost from public.pipeline_stages where org_id = p_org and is_lost;
  select array_agg(id order by position) into v_sources from public.lead_sources where org_id = p_org;

  for v_i in 1..array_length(v_companies, 1) loop
    insert into public.companies (org_id, name, website, owner_id, tags, created_by)
    values (
      p_org, v_companies[v_i],
      'https://' || replace(lower(v_companies[v_i]), ' ', '') || '.example',
      v_uid, array['sample'], v_uid
    )
    returning id into v_company;

    insert into public.contacts (org_id, first_name, last_name, email, title, company_id, owner_id, tags, created_by)
    values (
      p_org, v_first[v_i], v_last[v_i],
      lower(v_first[v_i] || '.' || v_last[v_i]) || '@example.com',
      'Head of Operations', v_company, v_uid, array['sample'], v_uid
    )
    returning id into v_contact;

    insert into public.leads (org_id, title, contact_id, company_id, owner_id, stage_id, source_id, value, expected_close_date, tags, created_by)
    values (
      p_org,
      v_titles[v_i] || ' — ' || v_companies[v_i],
      v_contact, v_company, v_uid,
      case
        when v_i = 5 then v_won
        when v_i = 6 then v_lost
        else v_stages[1 + ((v_i - 1) % array_length(v_stages, 1))]
      end,
      case when v_sources is null then null else v_sources[1 + ((v_i - 1) % array_length(v_sources, 1))] end,
      (v_i * 2500)::numeric,
      current_date + (v_i * 7),
      array['sample'], v_uid
    )
    returning id into v_lead;

    if v_i = 6 then
      update public.leads set lost_reason = 'Went with a competitor' where id = v_lead;
    end if;

    insert into public.activities (org_id, type, lead_id, contact_id, body, created_by, assigned_to, due_at)
    values (p_org, 'note', v_lead, v_contact, 'Intro call went well — they want a proposal.', v_uid, null, null),
           (p_org, 'task', v_lead, v_contact, 'Send follow-up email', v_uid, v_uid, now() + (v_i || ' days')::interval);
  end loop;
end;
$$;

create function public.clear_sample_data(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_org_admin(p_org) then
    raise exception 'Only admins can clear sample data' using errcode = '42501';
  end if;
  delete from public.leads where org_id = p_org and 'sample' = any (tags);
  delete from public.contacts where org_id = p_org and 'sample' = any (tags);
  delete from public.companies where org_id = p_org and 'sample' = any (tags);
end;
$$;

-- -----------------------------------------------------------------------------
-- Function privileges: nothing is callable anonymously except the two
-- functions the signed-out pages need.
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on function public.instance_initialized() to anon;
grant execute on function public.get_invitation(text) to anon;
