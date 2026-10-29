-- =============================================================================
-- Goals and the quarter forecast
--
-- goals: a won-value target per quarter, for the team (user_id null) or one
-- person. Every member can read them; admins set them in Settings › Goals.
--
-- report_forecast(): won so far by day this quarter, what the open pipeline
-- should add by the quarter's end, a likely range, last quarter for
-- comparison, the goal, and the same per person. Runs as the caller, so RLS
-- applies like every other report.
-- =============================================================================

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- null = the whole team.
  user_id uuid references public.profiles (id) on delete cascade,
  -- First day of a quarter.
  period_start date not null check (period_start = date_trunc('quarter', period_start)::date),
  amount numeric(14, 2) not null check (amount >= 0),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (org_id, user_id, period_start)
);
create index goals_org_period_idx on public.goals (org_id, period_start);

create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy "goals: members read" on public.goals
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "goals: admins add" on public.goals
  for insert to authenticated
  with check (public.is_org_admin(org_id));
create policy "goals: admins change" on public.goals
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));
create policy "goals: admins remove" on public.goals
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- Forecast constants, in one place: the likely range around the weighted
-- projection, and where leads with a missing or past close date are assumed
-- to land (days from today).
create function public.forecast_settings(out range_low numeric, out range_high numeric, out assumed_days integer)
language sql
immutable
set search_path = ''
as $$
  select 0.6, 1.45, 10;
$$;

create function public.report_forecast(
  p_org uuid,
  p_quarter_start date default null,
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
  v_today date;
  v_qs date;
  v_qe date;
  v_pqs date;
  v_days integer;
  v_ti integer;
  v_live boolean;
  v_cfg record;
  v_actual jsonb;
  v_previous jsonb;
  v_projection jsonb;
  v_low jsonb;
  v_high jsonb;
  v_assumed integer;
  v_open integer;
  v_goal numeric;
  v_owners jsonb;
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select o.timezone into v_tz from public.organizations o where o.id = p_org;
  select * into v_cfg from public.forecast_settings();
  v_today := (now() at time zone v_tz)::date;
  v_qs := coalesce(p_quarter_start, date_trunc('quarter', v_today)::date);
  if v_qs <> date_trunc('quarter', v_qs)::date then
    raise exception 'Pick the first day of a quarter' using errcode = '22023';
  end if;
  v_qe := (v_qs + interval '3 months')::date;
  v_pqs := (v_qs - interval '3 months')::date;
  v_days := v_qe - v_qs;
  -- Today's position in the quarter (the last day for a past quarter).
  v_ti := least(greatest(v_today - v_qs, 0), v_days - 1);
  v_live := v_today >= v_qs and v_today < v_qe;

  -- Won so far, cumulative by local day, for this quarter and the one before.
  with won as (
    select (l.closed_at at time zone v_tz)::date as d, sum(l.value) as v
    from public.report_leads(p_org, p_owner, p_source) l
    where l.status = 'won'
      and l.closed_at >= v_pqs::timestamp at time zone v_tz
      and l.closed_at < v_qe::timestamp at time zone v_tz
    group by 1
  ),
  cur as (
    select i, sum(coalesce(w.v, 0)) over (order by i) as c
    from generate_series(0, v_ti) i left join won w on w.d = v_qs + i
  ),
  prev as (
    select i, sum(coalesce(w.v, 0)) over (order by i) as c
    from generate_series(0, (v_qs - v_pqs) - 1) i left join won w on w.d = v_pqs + i
  )
  select (select jsonb_agg(c order by i) from cur), (select jsonb_agg(c order by i) from prev)
  into v_actual, v_previous;

  -- What the open pipeline should add: value × stage win chance, on the
  -- expected close date (or a few days out when that's missing or passed).
  with open as (
    select l.value * s.probability / 100.0 as w,
      (l.expected_close_date is null or l.expected_close_date <= v_today) as assumed,
      case when l.expected_close_date is null or l.expected_close_date <= v_today
        then v_today + v_cfg.assumed_days else l.expected_close_date end as d
    from public.report_leads(p_org, p_owner, p_source) l
    join public.pipeline_stages s on s.id = l.stage_id
    where l.status = 'open' and not s.is_won and not s.is_lost
  ),
  due as (select * from open where v_live and d > v_today and d < v_qe),
  steps as (
    select k, coalesce((select sum(due.w) from due where due.d - v_qs <= v_ti + k), 0) as add
    from generate_series(0, case when v_live then v_days - 1 - v_ti else 0 end) k
  )
  select
    jsonb_agg(round(((v_actual ->> -1)::numeric + add), 2) order by k),
    jsonb_agg(round(((v_actual ->> -1)::numeric + add * v_cfg.range_low), 2) order by k),
    jsonb_agg(round(((v_actual ->> -1)::numeric + add * v_cfg.range_high), 2) order by k),
    (select count(*) from due where assumed),
    (select count(*) from due)
  into v_projection, v_low, v_high, v_assumed, v_open
  from steps;

  -- The goal: the person's when filtered to one, else the team's, else the
  -- sum of everyone's.
  if p_owner is not null then
    select g.amount into v_goal from public.goals g where g.org_id = p_org and g.user_id = p_owner and g.period_start = v_qs;
  else
    select g.amount into v_goal from public.goals g where g.org_id = p_org and g.user_id is null and g.period_start = v_qs;
    if v_goal is null then
      select sum(g.amount) into v_goal from public.goals g where g.org_id = p_org and g.user_id is not null and g.period_start = v_qs;
    end if;
  end if;

  -- Per person: won this quarter, weighted forecast still to come, goal.
  with people as (
    select m.user_id as id from public.memberships m
    where m.org_id = p_org and m.status = 'active' and m.role <> 'viewer'
    union
    select l.owner_id from public.report_leads(p_org, p_owner, p_source) l
    where l.owner_id is not null and (l.status = 'open' or l.closed_at >= v_qs::timestamp at time zone v_tz)
  ),
  per as (
    select pe.id,
      coalesce((select sum(l.value) from public.report_leads(p_org, pe.id, p_source) l
        where l.status = 'won' and l.closed_at >= v_qs::timestamp at time zone v_tz and l.closed_at < v_qe::timestamp at time zone v_tz), 0) as won,
      coalesce((select sum(l.value * s.probability / 100.0) from public.report_leads(p_org, pe.id, p_source) l
        join public.pipeline_stages s on s.id = l.stage_id
        where v_live and l.status = 'open' and not s.is_won and not s.is_lost
          and (case when l.expected_close_date is null or l.expected_close_date <= v_today
                then v_today + v_cfg.assumed_days else l.expected_close_date end) < v_qe), 0) as forecast,
      (select g.amount from public.goals g where g.org_id = p_org and g.user_id = pe.id and g.period_start = v_qs) as goal
    from people pe
    where p_owner is null or pe.id = p_owner
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', per.id, 'name', coalesce(pr.full_name, pr.email),
    'won', per.won, 'forecast', round(per.forecast, 2), 'goal', per.goal
  ) order by per.won desc, coalesce(pr.full_name, pr.email)), '[]')
  into v_owners
  from per join public.profiles pr on pr.id = per.id;

  return jsonb_build_object(
    'start', v_qs,
    'end', v_qe - 1,
    'days', v_days,
    'today', v_ti,
    'live', v_live,
    'actual', v_actual,
    'projection', v_projection,
    'low', v_low,
    'high', v_high,
    'previous', v_previous,
    'won', (v_actual ->> -1)::numeric,
    'forecast', (v_projection ->> -1)::numeric,
    'goal', v_goal,
    'open_count', v_open,
    'assumed_count', v_assumed,
    'owners', v_owners
  );
end;
$$;

revoke execute on function public.forecast_settings() from public, anon;
revoke execute on function public.report_forecast(uuid, date, uuid, uuid) from public, anon;
grant execute on function public.forecast_settings() to authenticated, service_role;
grant execute on function public.report_forecast(uuid, date, uuid, uuid) to authenticated, service_role;
