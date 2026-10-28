-- =============================================================================
-- Fixes from the security review (see docs/security.md).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Organization creation is decided by the database, not only the app.
--    Self-hosted instances hold one organization: once the first one has been
--    created (ever), nobody can create another, even by calling the RPC
--    directly. Hosted operators opt in to multiple orgs:
--      update public.instance_settings set allow_multiple_orgs = true;
-- -----------------------------------------------------------------------------
create table public.instance_settings (
  id boolean primary key default true check (id),
  allow_multiple_orgs boolean not null default false,
  first_org_created_at timestamptz
);
alter table public.instance_settings enable row level security;
insert into public.instance_settings (first_org_created_at)
select min(created_at) from public.organizations;

create function public.can_create_organization()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and (s.allow_multiple_orgs or s.first_org_created_at is null)
  from public.instance_settings s;
$$;

create function public.guard_organization_create()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.instance_settings;
begin
  select * into v_settings from public.instance_settings for update;
  if not v_settings.allow_multiple_orgs and v_settings.first_org_created_at is not null then
    raise exception 'This server already has its organization. Ask an admin for an invite.' using errcode = '42501';
  end if;
  -- Hosted: a single account can't mass-create organizations.
  if new.created_by is not null and (
    select count(*) from public.organizations o where o.created_by = new.created_by and o.created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'You''ve created several organizations today. Try again tomorrow.' using errcode = '42501';
  end if;
  update public.instance_settings set first_org_created_at = coalesce(first_org_created_at, now());
  return new;
end;
$$;

create trigger organizations_guard_create before insert on public.organizations
  for each row execute function public.guard_organization_create();

-- -----------------------------------------------------------------------------
-- 2. Invitations: the database owns expiry and acceptance. Admins can create
--    and revoke invitations; they can't extend them, re-point them to another
--    email or token, or mark them accepted.
-- -----------------------------------------------------------------------------
create function public.guard_invitation_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.expires_at := now() + interval '7 days';
    new.accepted_at := null;
    new.accepted_by := null;
    new.revoked_at := null;
    return new;
  end if;

  if new.org_id is distinct from old.org_id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.token_hash is distinct from old.token_hash
     or new.invited_by is distinct from old.invited_by
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Invitations can only be revoked, not edited' using errcode = '42501';
  end if;
  if (new.accepted_at is distinct from old.accepted_at or new.accepted_by is distinct from old.accepted_by)
     and current_setting('app.accepting_invitation', true) is distinct from 'on' then
    raise exception 'Invitations are accepted through the invite link' using errcode = '42501';
  end if;
  if old.revoked_at is not null and new.revoked_at is null then
    raise exception 'A revoked invitation can''t be restored' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger invitations_guard before insert or update on public.invitations
  for each row execute function public.guard_invitation_write();

-- An invitation only works while the person who sent it is still an admin,
-- and accepting never changes an existing membership's role.
create or replace function public.accept_invitation(p_token text)
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
  if not exists (
    select 1 from public.memberships m
    where m.org_id = v_inv.org_id and m.user_id = v_inv.invited_by and m.status = 'active' and m.role in ('owner', 'admin')
  ) then
    raise exception 'This invitation is no longer valid. Ask an admin for a new one.' using errcode = 'P0002';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;
  if lower(v_email) <> lower(v_inv.email) then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;

  insert into public.memberships (org_id, user_id, role, status)
  values (v_inv.org_id, v_uid, v_inv.role, 'active')
  on conflict (org_id, user_id) do nothing;

  perform set_config('app.accepting_invitation', 'on', true);
  update public.invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  perform set_config('app.accepting_invitation', 'off', true);

  return v_inv.org_id;
end;
$$;

-- Pending invitations die with their sender's admin rights.
create function public.revoke_invitations_of_former_admins()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or new.role not in ('owner', 'admin') or new.status <> 'active' then
    update public.invitations
    set revoked_at = now()
    where org_id = old.org_id and invited_by = old.user_id and accepted_at is null and revoked_at is null;
  end if;
  return null;
end;
$$;

create trigger memberships_revoke_invitations after update or delete on public.memberships
  for each row execute function public.revoke_invitations_of_former_admins();

-- -----------------------------------------------------------------------------
-- 3. Records can only be assigned to active members of their own organization.
--    Checked when the value changes, so records owned by someone who later
--    left stay valid.
-- -----------------------------------------------------------------------------
create function public.check_member_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_column text := tg_argv[0];
  v_new uuid := (to_jsonb(new) ->> v_column)::uuid;
  v_old uuid := case when tg_op = 'UPDATE' then (to_jsonb(old) ->> v_column)::uuid end;
begin
  if v_new is not null and v_new is distinct from v_old and not exists (
    select 1 from public.memberships m where m.org_id = new.org_id and m.user_id = v_new and m.status = 'active'
  ) then
    raise exception 'Records can only be assigned to members of this organization' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger leads_owner_member before insert or update of owner_id on public.leads
  for each row execute function public.check_member_reference('owner_id');
create trigger contacts_owner_member before insert or update of owner_id on public.contacts
  for each row execute function public.check_member_reference('owner_id');
create trigger companies_owner_member before insert or update of owner_id on public.companies
  for each row execute function public.check_member_reference('owner_id');
create trigger activities_assignee_member before insert or update of assigned_to on public.activities
  for each row execute function public.check_member_reference('assigned_to');
create trigger capture_forms_owner_member before insert or update of default_owner_id on public.capture_forms
  for each row execute function public.check_member_reference('default_owner_id');

-- -----------------------------------------------------------------------------
-- 4. Inbound capture can't rewrite existing contacts.
--    - An existing contact (same email) only gets the new lead and note.
--      Their fields, tags and consent are never changed by anonymous or API
--      input.
--    - Consent is recorded only on contacts the submission creates.
--    - Captured notes are labelled with where they came from.
--    - owner_email only matches members who can own leads (not viewers).
--    - Won/lost stages can't be set from outside; unknown stages and
--      sources fall back to the form's defaults instead of creating rows.
-- -----------------------------------------------------------------------------
alter table public.activities add column source text check (char_length(source) <= 120);

create or replace function public.capture_lead(p_org uuid, p_payload jsonb, p_form uuid default null, p_api_key uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.capture_forms;
  v_key_name text;
  v_email text := nullif(lower(trim(p_payload ->> 'email')), '');
  v_first text := nullif(trim(p_payload ->> 'first_name'), '');
  v_last text := nullif(trim(p_payload ->> 'last_name'), '');
  v_company_name text := nullif(trim(p_payload ->> 'company'), '');
  v_tags text[] := coalesce(
    (select array_agg(distinct lower(trim(t))) from jsonb_array_elements_text(coalesce(p_payload -> 'tags', '[]')) t where trim(t) <> ''),
    '{}'
  );
  v_company uuid;
  v_contact public.contacts;
  v_contact_created boolean := false;
  v_owner uuid;
  v_stage uuid;
  v_source uuid;
  v_lead uuid;
  v_title text;
  v_display text;
  v_via text;
begin
  if p_form is not null then
    select * into v_form from public.capture_forms where id = p_form and org_id = p_org;
    if not found then
      raise exception 'Unknown form' using errcode = 'P0002';
    end if;
    v_via := 'form: ' || v_form.name;
  elsif p_api_key is not null then
    select name into v_key_name from public.api_keys where id = p_api_key and org_id = p_org;
    v_via := 'API: ' || coalesce(v_key_name, 'key');
  end if;
  if v_first is null and v_last is null and v_email is null then
    raise exception 'A name or email is required' using errcode = '22023';
  end if;

  -- Owner: a member who can own leads, then the form default, then round
  -- robin, then the organization owner.
  if p_payload ? 'owner_email' then
    select m.user_id into v_owner
    from public.memberships m join public.profiles p on p.id = m.user_id
    where m.org_id = p_org and m.status = 'active' and m.role <> 'viewer'
      and lower(p.email) = lower(p_payload ->> 'owner_email');
  end if;
  if v_owner is null and v_form.default_owner_id is not null then
    select user_id into v_owner from public.memberships
    where org_id = p_org and user_id = v_form.default_owner_id and status = 'active';
  end if;
  if v_owner is null and v_form.round_robin then
    v_owner := public.next_round_robin_owner(p_form);
  end if;
  if v_owner is null then
    select user_id into v_owner from public.memberships
    where org_id = p_org and role = 'owner' and status = 'active'
    order by created_at limit 1;
  end if;

  -- Company: case-insensitive match or create.
  if v_company_name is not null then
    select id into v_company from public.companies
    where org_id = p_org and deleted_at is null and lower(name) = lower(v_company_name)
    order by created_at limit 1;
    if v_company is null then
      insert into public.companies (org_id, name, owner_id, created_by)
      values (p_org, left(v_company_name, 200), v_owner, null)
      returning id into v_company;
    end if;
  end if;

  -- Contact: an existing one is linked as is; otherwise create it.
  if v_email is not null then
    select * into v_contact from public.contacts
    where org_id = p_org and deleted_at is null and lower(email) = v_email
    order by created_at limit 1;
  end if;
  if v_contact.id is null then
    insert into public.contacts (org_id, first_name, last_name, email, phone, title, company_id, owner_id, tags, created_by)
    values (
      p_org, v_first, v_last, v_email,
      nullif(trim(p_payload ->> 'phone'), ''),
      nullif(trim(p_payload ->> 'title'), ''),
      v_company, v_owner, v_tags, null
    )
    returning * into v_contact;
    v_contact_created := true;

    if coalesce((p_payload ->> 'consent')::boolean, false) and v_form.consent_text is not null then
      update public.contacts
      set consented_at = now(), consent_text = v_form.consent_text, consent_source = 'form:' || v_form.public_id
      where id = v_contact.id;
    end if;
  end if;

  -- Stage: an open stage by name, then the form default, then the first stage.
  if p_payload ? 'stage' then
    select id into v_stage from public.pipeline_stages
    where org_id = p_org and not is_won and not is_lost and lower(name) = lower(trim(p_payload ->> 'stage'));
  end if;
  v_stage := coalesce(v_stage, v_form.default_stage_id);
  if v_stage is null then
    select id into v_stage from public.pipeline_stages
    where org_id = p_org and not is_won and not is_lost
    order by position limit 1;
  end if;

  -- Source: an existing source by name, then the form default.
  if nullif(trim(p_payload ->> 'source'), '') is not null then
    select id into v_source from public.lead_sources
    where org_id = p_org and lower(name) = lower(trim(p_payload ->> 'source'));
  end if;
  v_source := coalesce(v_source, v_form.default_source_id);

  v_display := coalesce(nullif(trim(concat_ws(' ', v_first, v_last)), ''), v_email, nullif(trim(concat_ws(' ', v_contact.first_name, v_contact.last_name)), ''));
  v_title := coalesce(
    nullif(trim(p_payload ->> 'lead_title'), ''),
    case when v_form.id is not null then v_form.name || ' — ' || v_display else 'Inbound — ' || v_display end
  );

  insert into public.leads (org_id, title, contact_id, company_id, owner_id, stage_id, source_id, value, capture_form_id, api_key_id, created_by)
  values (
    p_org, left(v_title, 200), v_contact.id, coalesce(v_contact.company_id, v_company), v_owner, v_stage, v_source,
    least(greatest(coalesce((p_payload ->> 'value')::numeric, 0), 0), 999999999999),
    v_form.id, p_api_key, null
  )
  returning id into v_lead;

  if nullif(trim(p_payload ->> 'message'), '') is not null then
    insert into public.activities (org_id, type, lead_id, contact_id, body, created_by, source)
    values (p_org, 'note', v_lead, v_contact.id, left(trim(p_payload ->> 'message'), 5000), null, left(v_via, 120));
  end if;

  return jsonb_build_object(
    'lead_id', v_lead,
    'contact_id', v_contact.id,
    'owner_id', v_owner,
    'contact_created', v_contact_created
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Rate limiter: a non-counting check (for "count failures only" limits),
--    and an index so cleanup doesn't scan the table.
-- -----------------------------------------------------------------------------
create index rate_limits_window_start_idx on public.rate_limits (window_start);

create function public.rate_limit_ok(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select r.hits < p_max or r.window_start < now() - make_interval(secs => p_window_seconds)
    from public.rate_limits r where r.bucket = p_bucket
  ), true);
$$;

-- -----------------------------------------------------------------------------
-- 6. Reports: report_leads() without SET so the planner can inline it, and
--    report() timeline/team sections as single grouped passes.
-- -----------------------------------------------------------------------------
create or replace function public.report_leads(p_org uuid, p_owner uuid, p_source uuid)
returns setof public.leads
language sql
stable
as $$
  select l.* from public.leads l
  where l.org_id = p_org
    and l.deleted_at is null
    and (p_owner is null or l.owner_id = p_owner)
    and (p_source is null or l.source_id = p_source);
$$;

create or replace function public.report(
  p_org uuid,
  p_from date,
  p_to date,
  p_owner uuid default null,
  p_source uuid default null
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_prev_start timestamptz;
  v_bucket text;
  v_kpis jsonb;
  v_prev jsonb;
  v_stages jsonb;
  v_funnel jsonb;
  v_sources jsonb;
  v_timeline jsonb;
  v_lost_reasons jsonb;
  v_leaderboard jsonb;
  v_velocity jsonb;
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 3660 then
    raise exception 'Pick a period of up to 10 years' using errcode = '22023';
  end if;

  select timezone into v_tz from public.organizations where id = p_org;
  v_start := p_from::timestamp at time zone v_tz;
  v_end := (p_to + 1)::timestamp at time zone v_tz;
  v_prev_start := v_start - (v_end - v_start);
  v_bucket := case when p_to - p_from <= 31 then 'day' when p_to - p_from <= 190 then 'week' else 'month' end;

  -- Headline numbers for a window.
  with w(kind, ws, we) as (values ('current', v_start, v_end), ('previous', v_prev_start, v_start))
  select
    jsonb_object_agg(kind, jsonb_build_object(
      'new_leads', (select count(*) from public.report_leads(p_org, p_owner, p_source) where created_at >= ws and created_at < we),
      'won_count', (select count(*) from public.report_leads(p_org, p_owner, p_source) where status = 'won' and closed_at >= ws and closed_at < we),
      'won_value', (select coalesce(sum(value), 0) from public.report_leads(p_org, p_owner, p_source) where status = 'won' and closed_at >= ws and closed_at < we),
      'lost_count', (select count(*) from public.report_leads(p_org, p_owner, p_source) where status = 'lost' and closed_at >= ws and closed_at < we),
      'avg_days_to_close', (
        select round(avg(extract(epoch from closed_at - created_at) / 86400)::numeric, 1)
        from public.report_leads(p_org, p_owner, p_source) where status = 'won' and closed_at >= ws and closed_at < we
      )
    ))
  into v_kpis
  from w;
  v_prev := v_kpis -> 'previous';
  v_kpis := (v_kpis -> 'current') || jsonb_build_object(
    'open_count', (select count(*) from public.report_leads(p_org, p_owner, p_source) where status = 'open'),
    'open_value', (select coalesce(sum(value), 0) from public.report_leads(p_org, p_owner, p_source) where status = 'open'),
    'weighted_value', (
      select coalesce(round(sum(l.value * s.probability / 100.0), 2), 0)
      from public.report_leads(p_org, p_owner, p_source) l join public.pipeline_stages s on s.id = l.stage_id
      where l.status = 'open'
    )
  );

  -- Open pipeline by stage, right now.
  select coalesce(jsonb_agg(jsonb_build_object(
    'stage_id', s.id, 'name', s.name, 'probability', s.probability,
    'count', coalesce(x.n, 0), 'value', coalesce(x.v, 0)
  ) order by s.position), '[]')
  into v_stages
  from public.pipeline_stages s
  left join (
    select stage_id, count(*) n, sum(value) v from public.report_leads(p_org, p_owner, p_source) where status = 'open' group by stage_id
  ) x on x.stage_id = s.id
  where s.org_id = p_org and not s.is_won and not s.is_lost;

  -- Funnel: of the leads created in the period, how many got at least as far
  -- as each open stage (won leads count as having passed every stage).
  with cohort as (
    select l.id, l.status,
      greatest(
        (select max(s.position) from public.lead_stage_history h
           join public.pipeline_stages s on s.id = h.to_stage_id
           where h.lead_id = l.id and not s.is_won and not s.is_lost),
        (select s.position from public.pipeline_stages s where s.id = l.stage_id and not s.is_won and not s.is_lost)
      ) as furthest
    from public.report_leads(p_org, p_owner, p_source) l
    where l.created_at >= v_start and l.created_at < v_end
  ),
  steps as (
    select s.id, s.name, s.position, false as is_won,
      (select count(*) from cohort c where c.status = 'won' or c.furthest >= s.position) as reached
    from public.pipeline_stages s
    where s.org_id = p_org and not s.is_won and not s.is_lost
    union all
    select s.id, s.name, s.position, true, (select count(*) from cohort c where c.status = 'won')
    from public.pipeline_stages s
    where s.org_id = p_org and s.is_won
  )
  select coalesce(jsonb_agg(jsonb_build_object('stage_id', id, 'name', name, 'is_won', is_won, 'reached', reached) order by is_won, position), '[]')
  into v_funnel
  from steps;

  -- By source, for leads created in the period.
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.leads desc, x.name), '[]')
  into v_sources
  from (
    select coalesce(src.name, 'No source') as name, l.source_id,
      count(*) as leads,
      count(*) filter (where l.status = 'won') as won,
      count(*) filter (where l.status = 'lost') as lost,
      coalesce(sum(l.value) filter (where l.status = 'won'), 0) as won_value,
      coalesce(sum(l.value) filter (where l.status = 'open'), 0) as open_value
    from public.report_leads(p_org, p_owner, p_source) l
    left join public.lead_sources src on src.id = l.source_id
    where l.created_at >= v_start and l.created_at < v_end
    group by src.name, l.source_id
  ) x;

  -- Over time, in day/week/month buckets of the org's time zone: one grouped
  -- pass over created and one over closed leads.
  with buckets as (
    select b.bucket
    from generate_series(
      date_trunc(v_bucket, v_start at time zone v_tz),
      date_trunc(v_bucket, (v_end - interval '1 second') at time zone v_tz),
      ('1 ' || v_bucket)::interval
    ) as b(bucket)
  ),
  created as (
    select date_trunc(v_bucket, l.created_at at time zone v_tz) as bucket, count(*) as n
    from public.report_leads(p_org, p_owner, p_source) l
    where l.created_at >= v_start and l.created_at < v_end
    group by 1
  ),
  closed as (
    select date_trunc(v_bucket, l.closed_at at time zone v_tz) as bucket,
      count(*) filter (where l.status = 'won') as won,
      coalesce(sum(l.value) filter (where l.status = 'won'), 0) as won_value,
      count(*) filter (where l.status = 'lost') as lost
    from public.report_leads(p_org, p_owner, p_source) l
    where l.closed_at >= v_start and l.closed_at < v_end and l.status in ('won', 'lost')
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'bucket', to_char(b.bucket, 'YYYY-MM-DD'),
    'new_leads', coalesce(c.n, 0),
    'won_count', coalesce(x.won, 0),
    'won_value', coalesce(x.won_value, 0),
    'lost_count', coalesce(x.lost, 0)
  ) order by b.bucket), '[]')
  into v_timeline
  from buckets b
  left join created c on c.bucket = b.bucket
  left join closed x on x.bucket = b.bucket;

  -- Why leads were lost in the period.
  select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'count', n, 'value', v) order by n desc, reason), '[]')
  into v_lost_reasons
  from (
    select coalesce(nullif(trim(lost_reason), ''), 'No reason given') reason, count(*) n, sum(value) v
    from public.report_leads(p_org, p_owner, p_source)
    where status = 'lost' and closed_at >= v_start and closed_at < v_end
    group by 1
    order by 2 desc
    limit 12
  ) r;

  -- Per person: active members who can own leads, plus anyone still owning
  -- leads. Leads and activities are each aggregated once.
  with per_owner as (
    select l.owner_id,
      count(*) filter (where l.created_at >= v_start and l.created_at < v_end) as new_leads,
      count(*) filter (where l.status = 'won' and l.closed_at >= v_start and l.closed_at < v_end) as won,
      count(*) filter (where l.status = 'lost' and l.closed_at >= v_start and l.closed_at < v_end) as lost,
      coalesce(sum(l.value) filter (where l.status = 'won' and l.closed_at >= v_start and l.closed_at < v_end), 0) as won_value,
      coalesce(sum(l.value) filter (where l.status = 'open'), 0) as open_value
    from public.report_leads(p_org, p_owner, p_source) l
    where l.owner_id is not null
    group by l.owner_id
  ),
  per_actor as (
    select a.created_by, count(*) as activities
    from public.activities a
    where a.org_id = p_org and a.created_at >= v_start and a.created_at < v_end
    group by a.created_by
  ),
  people as (
    select m.user_id as id from public.memberships m
    where m.org_id = p_org and m.status = 'active' and m.role <> 'viewer'
    union
    select owner_id from per_owner
  )
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.won_value desc, x.won desc, x.name), '[]')
  into v_leaderboard
  from (
    select p.id as user_id, coalesce(p.full_name, p.email) as name,
      coalesce(o.new_leads, 0) as new_leads, coalesce(o.won, 0) as won, coalesce(o.lost, 0) as lost,
      coalesce(o.won_value, 0) as won_value, coalesce(o.open_value, 0) as open_value,
      coalesce(a.activities, 0) as activities
    from people pe
    join public.profiles p on p.id = pe.id
    left join per_owner o on o.owner_id = p.id
    left join per_actor a on a.created_by = p.id
    where p_owner is null or p.id = p_owner
  ) x;

  -- Average days spent in each open stage, for stays that ended in the period.
  with stays as (
    select h.to_stage_id as stage_id,
      extract(epoch from (
        lead(h.changed_at) over (partition by h.lead_id order by h.changed_at, h.id) - h.changed_at
      )) / 86400 as days,
      lead(h.changed_at) over (partition by h.lead_id order by h.changed_at, h.id) as left_at
    from public.lead_stage_history h
    where h.lead_id in (select id from public.report_leads(p_org, p_owner, p_source))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'stage_id', s.id, 'name', s.name,
    'avg_days', (select round(avg(days)::numeric, 1) from stays st where st.stage_id = s.id and st.left_at >= v_start and st.left_at < v_end),
    'stays', (select count(*) from stays st where st.stage_id = s.id and st.left_at >= v_start and st.left_at < v_end)
  ) order by s.position), '[]')
  into v_velocity
  from public.pipeline_stages s
  where s.org_id = p_org and not s.is_won and not s.is_lost;

  return jsonb_build_object(
    'bucket', v_bucket,
    'kpis', v_kpis,
    'previous', v_prev,
    'stages', v_stages,
    'funnel', v_funnel,
    'sources', v_sources,
    'timeline', v_timeline,
    'lost_reasons', v_lost_reasons,
    'leaderboard', v_leaderboard,
    'velocity', v_velocity
  );
end;
$$;
revoke execute on function public.can_create_organization() from public, anon;
grant execute on function public.can_create_organization() to authenticated, service_role;
revoke execute on function public.rate_limit_ok(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_ok(text, integer, integer) to service_role;
revoke execute on function public.guard_organization_create() from public, anon, authenticated;
revoke execute on function public.guard_invitation_write() from public, anon, authenticated;
revoke execute on function public.revoke_invitations_of_former_admins() from public, anon, authenticated;
revoke execute on function public.check_member_reference() from public, anon, authenticated;
