-- Faster capture in the inbox: a new conversation (person, company, lead, first
-- entry, next step) and a logged activity (plus stage move and next step) are
-- each written in one transaction. Both functions run as the caller (security
-- invoker), so RLS, roles and the record guards apply exactly as for direct writes.

-- Which way an email or call went, and how a call ended.
alter table public.activities
  add column direction text check (direction in ('inbound', 'outbound')),
  add column outcome text check (char_length(outcome) <= 40);

-- "They wrote last" now also covers emails and calls logged as inbound.
create or replace view public.lead_threads with (security_invoker = on) as
select
  t.*,
  case t.reason
    when 'won' then 'won'
    when 'quiet' then 'going_cold'
    when 'scheduled' then 'waiting'
    when 'unowned' then 'needs_reply'
    when 'inbound' then 'needs_reply'
    when 'due' then 'needs_reply'
    when 'no_next_step' then 'needs_reply'
  end as folder
from (
  select
    s.*,
    -- First match wins. Closed leads only show in Won, for 30 days after closing.
    case
      when s.status = 'won' then case when s.closed_at >= now() - interval '30 days' then 'won' end
      when s.status = 'lost' then null
      when s.owner_id is null then 'unowned'
      when s.last_activity_inbound then 'inbound'
      when s.next_task_due_on <= s.today then 'due'
      when s.days_quiet >= s.cold_after_days then 'quiet'
      when s.next_task_id is null then 'no_next_step'
      else 'scheduled'
    end as reason
  from (
    select
      l.id,
      l.org_id,
      l.title,
      l.contact_id,
      l.company_id,
      l.owner_id,
      l.stage_id,
      l.source_id,
      l.value,
      l.currency,
      l.expected_close_date,
      l.status,
      l.closed_at,
      l.created_at,
      la.at as last_activity_at,
      coalesce(la.inbound, false) as last_activity_inbound,
      greatest(l.created_at, la.at, sh.at) as last_touch_at,
      (now() at time zone o.timezone)::date
        - (greatest(l.created_at, la.at, sh.at) at time zone o.timezone)::date as days_quiet,
      nt.id as next_task_id,
      nt.body as next_task_body,
      nt.due_at as next_task_due_at,
      (nt.due_at at time zone o.timezone)::date as next_task_due_on,
      nt.assigned_to as next_task_assigned_to,
      (now() at time zone o.timezone)::date as today,
      o.cold_after_days
    from public.leads l
    join public.organizations o on o.id = l.org_id
    -- Last touch: the newest logged activity. An open task is a plan, not a touch;
    -- a finished one counts from when it was done.
    left join lateral (
      select
        case when a.type = 'task' then a.completed_at else a.created_at end as at,
        a.source is not null or a.direction = 'inbound' as inbound
      from public.activities a
      where a.lead_id = l.id and (a.type <> 'task' or a.completed_at is not null)
      -- On a tie (logged in the same action), the message counts, not the ticked task.
      order by case when a.type = 'task' then a.completed_at else a.created_at end desc, a.type = 'task'
      limit 1
    ) la on true
    left join lateral (
      select max(h.changed_at) as at from public.lead_stage_history h where h.lead_id = l.id
    ) sh on true
    -- Next step: the earliest open task (undated ones last).
    left join lateral (
      select a.id, a.body, a.due_at, a.assigned_to
      from public.activities a
      where a.lead_id = l.id and a.type = 'task' and a.completed_at is null
      order by a.due_at nulls last, a.created_at
      limit 1
    ) nt on true
    where l.deleted_at is null
  ) s
) t;


-- -----------------------------------------------------------------------------
-- start_conversation: one call from the "New conversation" sheet.
-- p_payload: {
--   contact_id?,                                   -- an existing person, or:
--   person?: {first_name, last_name, email, phone, title, lawful_basis},
--   company_name?, company_website?,
--   lead: {title, value?, stage_id?, owner_id?, source_id?, expected_close_date?},
--   first?: {type, body, direction?, outcome?},    -- what happened
--   next?: {body, due_at?}                         -- next step, assigned to the owner
-- }
-- Returns {lead_id, contact_id, company_id, contact_created, company_created}.
-- -----------------------------------------------------------------------------
create function public.start_conversation(p_org uuid, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_person jsonb := coalesce(p_payload -> 'person', '{}');
  v_lead jsonb := coalesce(p_payload -> 'lead', '{}');
  v_first jsonb := p_payload -> 'first';
  v_next jsonb := p_payload -> 'next';
  v_contact uuid := nullif(p_payload ->> 'contact_id', '')::uuid;
  v_company uuid;
  v_company_name text := nullif(trim(p_payload ->> 'company_name'), '');
  v_email text := nullif(lower(trim(v_person ->> 'email')), '');
  v_owner uuid := coalesce(nullif(v_lead ->> 'owner_id', '')::uuid, v_uid);
  v_stage uuid := nullif(v_lead ->> 'stage_id', '')::uuid;
  v_lead_id uuid;
  v_contact_created boolean := false;
  v_company_created boolean := false;
begin
  if not public.can_edit_org_data(p_org) then
    raise exception 'You have view-only access.' using errcode = '42501';
  end if;
  if nullif(trim(v_lead ->> 'title'), '') is null then
    raise exception 'Say what the deal is about.' using errcode = '22023';
  end if;

  -- Company: reuse one with the same name, otherwise create it.
  if v_company_name is not null then
    select c.id into v_company from public.companies c
    where c.org_id = p_org and c.deleted_at is null and lower(c.name) = lower(v_company_name)
    order by c.created_at limit 1;
    if v_company is null then
      insert into public.companies (org_id, name, website, owner_id)
      values (p_org, v_company_name, nullif(trim(p_payload ->> 'company_website'), ''), v_owner)
      returning id into v_company;
      v_company_created := true;
    end if;
  end if;

  -- Person: the one picked, else someone with the same email, else a new contact.
  if v_contact is not null then
    if not exists (select 1 from public.contacts c where c.id = v_contact and c.org_id = p_org and c.deleted_at is null) then
      raise exception 'That person no longer exists.' using errcode = 'P0002';
    end if;
  elsif v_email is not null then
    select c.id into v_contact from public.contacts c
    where c.org_id = p_org and c.deleted_at is null and lower(c.email) = v_email;
  end if;
  if v_contact is null then
    insert into public.contacts (org_id, first_name, last_name, email, phone, title, company_id, owner_id, lawful_basis)
    values (
      p_org,
      nullif(trim(v_person ->> 'first_name'), ''),
      nullif(trim(v_person ->> 'last_name'), ''),
      v_email,
      nullif(trim(v_person ->> 'phone'), ''),
      nullif(trim(v_person ->> 'title'), ''),
      v_company,
      v_owner,
      nullif(v_person ->> 'lawful_basis', '')::public.lawful_basis
    )
    returning id into v_contact;
    v_contact_created := true;
  elsif v_company is null then
    select c.company_id into v_company from public.contacts c where c.id = v_contact;
  end if;

  -- Deal: first open stage unless one was picked.
  if v_stage is null then
    select s.id into v_stage from public.pipeline_stages s
    where s.org_id = p_org and not s.is_won and not s.is_lost order by s.position limit 1;
  end if;
  insert into public.leads (org_id, title, contact_id, company_id, owner_id, stage_id, source_id, value, expected_close_date)
  values (
    p_org,
    trim(v_lead ->> 'title'),
    v_contact,
    v_company,
    v_owner,
    v_stage,
    nullif(v_lead ->> 'source_id', '')::uuid,
    coalesce(nullif(v_lead ->> 'value', '')::numeric, 0),
    nullif(v_lead ->> 'expected_close_date', '')::date
  )
  returning id into v_lead_id;

  if nullif(trim(v_first ->> 'body'), '') is not null then
    insert into public.activities (org_id, type, lead_id, contact_id, body, direction, outcome)
    values (
      p_org,
      coalesce(nullif(v_first ->> 'type', ''), 'note')::public.activity_type,
      v_lead_id,
      v_contact,
      trim(v_first ->> 'body'),
      nullif(v_first ->> 'direction', ''),
      nullif(trim(v_first ->> 'outcome'), '')
    );
  end if;

  if nullif(trim(v_next ->> 'body'), '') is not null then
    insert into public.activities (org_id, type, lead_id, contact_id, body, due_at, assigned_to)
    values (p_org, 'task', v_lead_id, v_contact, trim(v_next ->> 'body'), nullif(v_next ->> 'due_at', '')::timestamptz, v_owner);
  end if;

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'contact_id', v_contact,
    'company_id', v_company,
    'contact_created', v_contact_created,
    'company_created', v_company_created
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- log_activity: one call from the thread composer.
-- p_payload: {
--   lead_id, type, body?, direction?, outcome?,
--   move_to_stage_id?, lost_reason?,     -- also move the deal
--   complete_task_id?,                   -- also tick off the current next step
--   next?: {body, due_at?, assigned_to?} -- also set a new next step
-- }
-- A task with a body is the new next step itself. Returns the activity id, if any.
-- -----------------------------------------------------------------------------
create function public.log_activity(p_org uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_lead uuid := nullif(p_payload ->> 'lead_id', '')::uuid;
  v_type public.activity_type := coalesce(nullif(p_payload ->> 'type', ''), 'note')::public.activity_type;
  v_body text := nullif(trim(p_payload ->> 'body'), '');
  v_next jsonb := p_payload -> 'next';
  v_stage uuid := nullif(p_payload ->> 'move_to_stage_id', '')::uuid;
  v_contact uuid;
  v_id uuid;
begin
  if not public.can_edit_org_data(p_org) then
    raise exception 'You have view-only access.' using errcode = '42501';
  end if;
  select l.contact_id into v_contact from public.leads l
  where l.id = v_lead and l.org_id = p_org and l.deleted_at is null;
  if not found then
    raise exception 'That lead no longer exists.' using errcode = 'P0002';
  end if;
  if char_length(v_body) > 5000 then
    raise exception 'Keep it under 5,000 characters.' using errcode = '22023';
  end if;

  if v_body is not null then
    insert into public.activities (org_id, type, lead_id, contact_id, body, direction, outcome, due_at, assigned_to)
    values (
      p_org, v_type, v_lead, v_contact, v_body,
      case when v_type in ('email', 'call') then nullif(p_payload ->> 'direction', '') end,
      case when v_type = 'call' then nullif(trim(p_payload ->> 'outcome'), '') end,
      case when v_type = 'task' then nullif(p_payload ->> 'due_at', '')::timestamptz end,
      case when v_type = 'task' then coalesce(nullif(p_payload ->> 'assigned_to', '')::uuid, v_uid) end
    )
    returning id into v_id;
  end if;

  if nullif(p_payload ->> 'complete_task_id', '') is not null then
    update public.activities set completed_at = now()
    where id = (p_payload ->> 'complete_task_id')::uuid and lead_id = v_lead and type = 'task' and completed_at is null;
  end if;

  if v_stage is not null then
    update public.leads
    set stage_id = v_stage,
        lost_reason = case when (select s.is_lost from public.pipeline_stages s where s.id = v_stage)
                           then nullif(trim(p_payload ->> 'lost_reason'), '') else lost_reason end
    where id = v_lead and org_id = p_org;
  end if;

  if nullif(trim(v_next ->> 'body'), '') is not null then
    insert into public.activities (org_id, type, lead_id, contact_id, body, due_at, assigned_to)
    values (
      p_org, 'task', v_lead, v_contact, trim(v_next ->> 'body'),
      nullif(v_next ->> 'due_at', '')::timestamptz,
      coalesce(nullif(v_next ->> 'assigned_to', '')::uuid, v_uid)
    );
  end if;

  return v_id;
end;
$$;

revoke execute on function public.start_conversation(uuid, jsonb) from public, anon;
grant execute on function public.start_conversation(uuid, jsonb) to authenticated;
revoke execute on function public.log_activity(uuid, jsonb) from public, anon;
grant execute on function public.log_activity(uuid, jsonb) to authenticated;
