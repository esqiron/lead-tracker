-- Weekly review: once a week, walk your open deals one at a time and answer three
-- questions (still on track? close date? next step?). A session holds one run of
-- the review; each answer is a lead_reviews row and shows up in the deal's thread.
-- Everything runs as the caller (security invoker), so RLS and roles apply.

create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  -- 'mine' = open deals I own; 'everyone' = all open deals (admins).
  scope text not null default 'mine' check (scope in ('mine', 'everyone')),
  lead_count integer not null default 0,
  forecast_before numeric(14, 2) not null default 0,
  forecast_after numeric(14, 2),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (org_id, id)
);
create index review_sessions_user_idx on public.review_sessions (org_id, user_id, started_at desc);

create table public.lead_reviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null,
  lead_id uuid not null,
  reviewed_by uuid references public.profiles (id) on delete set null default auth.uid(),
  reviewed_at timestamptz not null default now(),
  answer text not null check (answer in ('kept', 'pushed', 'lost', 'skipped')),
  -- Why it needed a look at the time (close_passed, quiet, no_next_step, no_owner).
  reasons text[] not null default '{}',
  close_from date,
  close_to date,
  lost_reason text check (char_length(lost_reason) <= 300),
  next_task_id uuid references public.activities (id) on delete set null,
  foreign key (org_id, session_id) references public.review_sessions (org_id, id) on delete cascade,
  foreign key (org_id, lead_id) references public.leads (org_id, id) on delete cascade
);
create index lead_reviews_lead_idx on public.lead_reviews (lead_id, reviewed_at);
create index lead_reviews_session_idx on public.lead_reviews (session_id);

alter table public.review_sessions enable row level security;
alter table public.lead_reviews enable row level security;

create policy "review_sessions: read own or as admin" on public.review_sessions
  for select to authenticated
  using (public.is_org_member(org_id) and (user_id = (select auth.uid()) or public.is_org_admin(org_id)));
create policy "review_sessions: start own" on public.review_sessions
  for insert to authenticated
  with check (public.can_edit_org_data(org_id) and user_id = (select auth.uid()));
create policy "review_sessions: finish own" on public.review_sessions
  for update to authenticated
  using (user_id = (select auth.uid()) and public.can_edit_org_data(org_id))
  with check (user_id = (select auth.uid()));

-- Visible like the deal itself (RLS on leads applies inside the subquery).
create policy "lead_reviews: read" on public.lead_reviews
  for select to authenticated
  using (public.is_org_member(org_id) and exists (select 1 from public.leads l where l.id = lead_reviews.lead_id));
create policy "lead_reviews: write own" on public.lead_reviews
  for insert to authenticated
  with check (
    public.can_edit_org_data(org_id)
    and reviewed_by = (select auth.uid())
    and exists (select 1 from public.leads l where l.id = lead_id)
    and exists (select 1 from public.review_sessions s where s.id = session_id and s.user_id = (select auth.uid()) and s.completed_at is null)
  );

-- -----------------------------------------------------------------------------
-- The open deals a review covers, the ones that need a look first, and why.
-- Order: needs a look first, then the furthest stage, then the biggest deal.
-- -----------------------------------------------------------------------------
create function public.review_candidates(p_org uuid, p_scope text default 'mine')
returns table (
  lead_id uuid,
  title text,
  value numeric,
  stage_id uuid,
  stage_position integer,
  probability integer,
  owner_id uuid,
  contact_id uuid,
  company_id uuid,
  expected_close_date date,
  days_quiet integer,
  next_task_id uuid,
  next_task_body text,
  needs_look boolean,
  reasons text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.id, t.title, t.value, t.stage_id, s.position, s.probability, t.owner_id, t.contact_id, t.company_id,
    t.expected_close_date, t.days_quiet, t.next_task_id, t.next_task_body,
    cardinality(r.reasons) > 0, r.reasons
  from public.lead_threads t
  join public.pipeline_stages s on s.id = t.stage_id
  cross join lateral (
    select array_remove(array[
      case when t.expected_close_date < t.today then 'close_passed' end,
      case when t.days_quiet >= t.cold_after_days then 'quiet' end,
      case when t.next_task_id is null then 'no_next_step' end,
      case when t.owner_id is null then 'no_owner' end
    ], null) as reasons
  ) r
  where t.org_id = p_org
    and t.status = 'open'
    and (p_scope = 'everyone' or t.owner_id = (select auth.uid()))
  order by cardinality(r.reasons) > 0 desc, s.position desc, t.value desc, t.id
$$;

-- Weighted open pipeline (value × stage probability) for a review's scope.
create function public.review_forecast(p_org uuid, p_scope text default 'mine')
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(c.value * c.probability / 100.0), 0)::numeric(14, 2)
  from public.review_candidates(p_org, p_scope) c
$$;

create function public.start_review(p_org uuid, p_scope text default 'mine')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.can_edit_org_data(p_org) then
    raise exception 'You have view-only access.' using errcode = '42501';
  end if;
  if p_scope not in ('mine', 'everyone') then
    raise exception 'Pick whose deals to review.' using errcode = '22023';
  end if;
  if p_scope = 'everyone' and not public.is_org_admin(p_org) then
    raise exception 'Only admins can review everyone''s deals.' using errcode = '42501';
  end if;
  insert into public.review_sessions (org_id, scope, lead_count, forecast_before)
  values (
    p_org,
    p_scope,
    (select count(*) from public.review_candidates(p_org, p_scope)),
    public.review_forecast(p_org, p_scope)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- review_lead: one deal's answers.
-- p_payload: {
--   answer: kept | pushed | lost | skipped,
--   close_to?,                      -- pushed: the new close date
--   lost_reason?,                   -- lost
--   next?: {body, due_at?}          -- replaces the current next step, or adds one
-- }
-- -----------------------------------------------------------------------------
create function public.review_lead(p_org uuid, p_session uuid, p_lead uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.review_sessions;
  v_answer text := p_payload ->> 'answer';
  v_next jsonb := p_payload -> 'next';
  v_cand record;
  v_task uuid;
  v_lost uuid;
  v_id uuid;
begin
  select * into v_session from public.review_sessions s where s.id = p_session and s.org_id = p_org;
  if not found or v_session.user_id <> (select auth.uid()) or v_session.completed_at is not null then
    raise exception 'This review is finished or isn''t yours. Start a new one.' using errcode = 'P0001';
  end if;
  if v_answer not in ('kept', 'pushed', 'lost', 'skipped') then
    raise exception 'Pick an answer.' using errcode = '22023';
  end if;
  select * into v_cand from public.review_candidates(p_org, v_session.scope) c where c.lead_id = p_lead;
  if not found then
    raise exception 'That deal isn''t open in this review any more.' using errcode = 'P0002';
  end if;

  if v_answer = 'pushed' then
    if nullif(p_payload ->> 'close_to', '') is null then
      raise exception 'Pick the new close date.' using errcode = '22023';
    end if;
    update public.leads set expected_close_date = (p_payload ->> 'close_to')::date where id = p_lead;
  elsif v_answer = 'lost' then
    select s.id into v_lost from public.pipeline_stages s where s.org_id = p_org and s.is_lost limit 1;
    update public.leads set stage_id = v_lost, lost_reason = nullif(trim(p_payload ->> 'lost_reason'), '') where id = p_lead;
  end if;

  -- The next step: rewrite the current one, or add one if there's none (or if
  -- it isn't yours to edit: RLS lets you change only tasks you wrote or own).
  if v_answer <> 'lost' and nullif(trim(v_next ->> 'body'), '') is not null then
    if v_cand.next_task_id is not null then
      update public.activities
      set body = trim(v_next ->> 'body'), due_at = nullif(v_next ->> 'due_at', '')::timestamptz
      where id = v_cand.next_task_id
      returning id into v_task;
    end if;
    if v_task is null then
      insert into public.activities (org_id, type, lead_id, contact_id, body, due_at, assigned_to)
      values (p_org, 'task', p_lead, v_cand.contact_id, trim(v_next ->> 'body'),
              nullif(v_next ->> 'due_at', '')::timestamptz, coalesce(v_cand.owner_id, (select auth.uid())))
      returning id into v_task;
    end if;
  end if;

  insert into public.lead_reviews (org_id, session_id, lead_id, answer, reasons, close_from, close_to, lost_reason, next_task_id)
  values (
    p_org, p_session, p_lead, v_answer, v_cand.reasons, v_cand.expected_close_date,
    case when v_answer = 'pushed' then (p_payload ->> 'close_to')::date end,
    case when v_answer = 'lost' then nullif(trim(p_payload ->> 'lost_reason'), '') end,
    v_task
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Finishes a review: deals that looked fine and weren't opened are confirmed as
-- kept; ones that needed a look but weren't reached are recorded as skipped.
create function public.finish_review(p_org uuid, p_session uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.review_sessions;
begin
  select * into v_session from public.review_sessions s where s.id = p_session and s.org_id = p_org;
  if not found or v_session.user_id <> (select auth.uid()) then
    raise exception 'This review isn''t yours.' using errcode = '42501';
  end if;
  if v_session.completed_at is not null then
    return;
  end if;
  insert into public.lead_reviews (org_id, session_id, lead_id, answer, reasons, close_from)
  select p_org, p_session, c.lead_id, case when c.needs_look then 'skipped' else 'kept' end, c.reasons, c.expected_close_date
  from public.review_candidates(p_org, v_session.scope) c
  where not exists (select 1 from public.lead_reviews r where r.session_id = p_session and r.lead_id = c.lead_id);
  update public.review_sessions
  set completed_at = now(), forecast_after = public.review_forecast(p_org, v_session.scope)
  where id = p_session;
end;
$$;

revoke execute on function public.review_candidates(uuid, text) from public, anon;
revoke execute on function public.review_forecast(uuid, text) from public, anon;
revoke execute on function public.start_review(uuid, text) from public, anon;
revoke execute on function public.review_lead(uuid, uuid, uuid, jsonb) from public, anon;
revoke execute on function public.finish_review(uuid, uuid) from public, anon;
grant execute on function public.review_candidates(uuid, text) to authenticated;
grant execute on function public.review_forecast(uuid, text) to authenticated;
grant execute on function public.start_review(uuid, text) to authenticated;
grant execute on function public.review_lead(uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function public.finish_review(uuid, uuid) to authenticated;
revoke all on public.review_sessions, public.lead_reviews from anon;
