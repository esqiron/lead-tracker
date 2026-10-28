-- =============================================================================
-- Inbound lead capture: public API (API keys) and hosted/embeddable forms.
--
-- Captured leads are written by the server with the service role, so the
-- functions here are callable by service_role only.
-- =============================================================================

-- Where a lead came from, for reporting and debugging.
alter table public.leads
  add column capture_form_id uuid references public.capture_forms (id) on delete set null,
  add column api_key_id uuid references public.api_keys (id) on delete set null;

-- Round-robin position per form.
alter table public.capture_forms
  add column round_robin_cursor integer not null default 0;

-- -----------------------------------------------------------------------------
-- Fixed-window rate limiting shared by every app instance (works on serverless
-- hosts where in-memory counters don't).
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table public.rate_limits enable row level security;

create function public.hit_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
  v_window interval := make_interval(secs => p_window_seconds);
begin
  insert into public.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set hits = case when r.window_start < now() - v_window then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - v_window then now() else r.window_start end
  returning hits into v_hits;

  -- Occasional cleanup so the table doesn't grow forever.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

-- -----------------------------------------------------------------------------
-- Next owner for a round-robin form: active owners, admins and members in
-- join order, cycling.
-- -----------------------------------------------------------------------------
create function public.next_round_robin_owner(p_form uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_cursor integer;
  v_count integer;
  v_owner uuid;
begin
  update public.capture_forms
  set round_robin_cursor = round_robin_cursor + 1
  where id = p_form
  returning org_id, round_robin_cursor - 1 into v_org, v_cursor;
  if v_org is null then
    return null;
  end if;

  select count(*) into v_count
  from public.memberships
  where org_id = v_org and status = 'active' and role in ('owner', 'admin', 'member');
  if v_count = 0 then
    return null;
  end if;

  select user_id into v_owner
  from public.memberships
  where org_id = v_org and status = 'active' and role in ('owner', 'admin', 'member')
  order by created_at, user_id
  offset (v_cursor % v_count)
  limit 1;
  return v_owner;
end;
$$;

-- -----------------------------------------------------------------------------
-- Creates a lead (and its contact, company and source when needed) from a
-- validated payload, in one transaction.
--
-- p_payload keys (all optional except one of first_name/last_name/email):
--   first_name, last_name, email, phone, company, title, message,
--   lead_title, value, stage, source, owner_email, tags (array), consent (bool)
-- Returns {lead_id, contact_id, owner_id, contact_created}.
-- -----------------------------------------------------------------------------
create function public.capture_lead(p_org uuid, p_payload jsonb, p_form uuid default null, p_api_key uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.capture_forms;
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
begin
  if p_form is not null then
    select * into v_form from public.capture_forms where id = p_form and org_id = p_org;
    if not found then
      raise exception 'Unknown form' using errcode = 'P0002';
    end if;
  end if;
  if v_first is null and v_last is null and v_email is null then
    raise exception 'A name or email is required' using errcode = '22023';
  end if;

  -- Owner: explicit member email, then the form's default, then round robin,
  -- then the organization owner so someone always gets the lead.
  if p_payload ? 'owner_email' then
    select m.user_id into v_owner
    from public.memberships m join public.profiles p on p.id = m.user_id
    where m.org_id = p_org and m.status = 'active' and lower(p.email) = lower(p_payload ->> 'owner_email');
  end if;
  if v_owner is null and v_form.default_owner_id is not null then
    select user_id into v_owner from public.memberships
    where org_id = p_org and user_id = v_form.default_owner_id and status = 'active';
  end if;
  if v_owner is null and v_form.round_robin then
    v_owner := public.next_round_robin_owner(p_form);
  end if;
  if v_owner is null then
    select user_id into v_owner from public.memberships where org_id = p_org and role = 'owner';
  end if;

  -- Company: case-insensitive match or create.
  if v_company_name is not null then
    select id into v_company from public.companies
    where org_id = p_org and deleted_at is null and lower(name) = lower(v_company_name)
    limit 1;
    if v_company is null then
      insert into public.companies (org_id, name, owner_id, created_by)
      values (p_org, left(v_company_name, 200), v_owner, null)
      returning id into v_company;
    end if;
  end if;

  -- Contact: reuse by email, filling only empty fields; otherwise create.
  if v_email is not null then
    select * into v_contact from public.contacts
    where org_id = p_org and deleted_at is null and lower(email) = v_email
    limit 1;
  end if;
  if v_contact.id is not null then
    update public.contacts set
      first_name = coalesce(first_name, v_first),
      last_name = coalesce(last_name, v_last),
      phone = coalesce(phone, nullif(trim(p_payload ->> 'phone'), '')),
      title = coalesce(title, nullif(trim(p_payload ->> 'title'), '')),
      company_id = coalesce(company_id, v_company),
      tags = (select coalesce(array_agg(distinct t), '{}') from unnest(tags || v_tags) t)
    where id = v_contact.id
    returning * into v_contact;
  else
    insert into public.contacts (org_id, first_name, last_name, email, phone, title, company_id, owner_id, tags, created_by)
    values (
      p_org, v_first, v_last, v_email,
      nullif(trim(p_payload ->> 'phone'), ''),
      nullif(trim(p_payload ->> 'title'), ''),
      v_company, v_owner, v_tags, null
    )
    returning * into v_contact;
    v_contact_created := true;
  end if;

  -- Consent, when the form asked for it and it was given.
  if coalesce((p_payload ->> 'consent')::boolean, false) and v_form.consent_text is not null then
    update public.contacts
    set consented_at = now(),
        consent_text = v_form.consent_text,
        consent_source = 'form:' || v_form.public_id
    where id = v_contact.id;
  end if;

  -- Stage: by name, then the form default, then the first open stage.
  if p_payload ? 'stage' then
    select id into v_stage from public.pipeline_stages
    where org_id = p_org and lower(name) = lower(trim(p_payload ->> 'stage'));
  end if;
  v_stage := coalesce(v_stage, v_form.default_stage_id);
  if v_stage is null then
    select id into v_stage from public.pipeline_stages
    where org_id = p_org and not is_won and not is_lost
    order by position limit 1;
  end if;

  -- Source: by name (created when new), then the form default.
  if nullif(trim(p_payload ->> 'source'), '') is not null then
    select id into v_source from public.lead_sources
    where org_id = p_org and lower(name) = lower(trim(p_payload ->> 'source'));
    if v_source is null then
      insert into public.lead_sources (org_id, name, position)
      values (
        p_org, left(trim(p_payload ->> 'source'), 60),
        (select coalesce(max(position), -1) + 1 from public.lead_sources where org_id = p_org)
      )
      returning id into v_source;
    end if;
  end if;
  v_source := coalesce(v_source, v_form.default_source_id);

  v_display := coalesce(nullif(trim(concat_ws(' ', v_contact.first_name, v_contact.last_name)), ''), v_contact.email);
  v_title := coalesce(
    nullif(trim(p_payload ->> 'lead_title'), ''),
    case when v_form.id is not null then v_form.name || ' — ' || v_display else 'Inbound — ' || v_display end
  );

  insert into public.leads (org_id, title, contact_id, company_id, owner_id, stage_id, source_id, value, capture_form_id, api_key_id, created_by)
  values (
    p_org, left(v_title, 200), v_contact.id, coalesce(v_company, v_contact.company_id), v_owner, v_stage, v_source,
    greatest(coalesce((p_payload ->> 'value')::numeric, 0), 0),
    v_form.id, p_api_key, null
  )
  returning id into v_lead;

  if nullif(trim(p_payload ->> 'message'), '') is not null then
    insert into public.activities (org_id, type, lead_id, contact_id, body, created_by)
    values (p_org, 'note', v_lead, v_contact.id, left(trim(p_payload ->> 'message'), 5000), null);
  end if;

  return jsonb_build_object(
    'lead_id', v_lead,
    'contact_id', v_contact.id,
    'owner_id', v_owner,
    'contact_created', v_contact_created
  );
end;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.next_round_robin_owner(uuid) from public, anon, authenticated;
revoke execute on function public.capture_lead(uuid, jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function public.next_round_robin_owner(uuid) to service_role;
grant execute on function public.capture_lead(uuid, jsonb, uuid, uuid) to service_role;
