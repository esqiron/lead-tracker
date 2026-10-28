-- =============================================================================
-- Reports
--
-- One function returns every report section for a period, as jsonb. It runs
-- as the caller (security invoker), so RLS applies: members who only see
-- their own leads get reports about their own leads.
--
-- Period-based numbers use leads created in, or closed in, [p_from, p_to]
-- (inclusive dates in the org's time zone). Pipeline numbers ("open now") are
-- a snapshot and ignore the period.
-- =============================================================================

create index if not exists leads_org_closed_idx on public.leads (org_id, closed_at) where deleted_at is null;
create index if not exists leads_org_created_idx on public.leads (org_id, created_at) where deleted_at is null;

-- Leads in scope for a report: filters + RLS (security invoker).
create function public.report_leads(p_org uuid, p_owner uuid, p_source uuid)
returns setof public.leads
language sql
stable
set search_path = ''
as $$
  select l.* from public.leads l
  where l.org_id = p_org
    and l.deleted_at is null
    and (p_owner is null or l.owner_id = p_owner)
    and (p_source is null or l.source_id = p_source);
$$;

create function public.report(
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

  -- Over time, in day/week/month buckets of the org's time zone.
  select coalesce(jsonb_agg(jsonb_build_object(
    'bucket', to_char(b.bucket, 'YYYY-MM-DD'),
    'new_leads', (select count(*) from public.report_leads(p_org, p_owner, p_source) l where date_trunc(v_bucket, l.created_at at time zone v_tz) = b.bucket and l.created_at >= v_start and l.created_at < v_end),
    'won_count', (select count(*) from public.report_leads(p_org, p_owner, p_source) l where l.status = 'won' and date_trunc(v_bucket, l.closed_at at time zone v_tz) = b.bucket and l.closed_at >= v_start and l.closed_at < v_end),
    'won_value', (select coalesce(sum(value), 0) from public.report_leads(p_org, p_owner, p_source) l where l.status = 'won' and date_trunc(v_bucket, l.closed_at at time zone v_tz) = b.bucket and l.closed_at >= v_start and l.closed_at < v_end),
    'lost_count', (select count(*) from public.report_leads(p_org, p_owner, p_source) l where l.status = 'lost' and date_trunc(v_bucket, l.closed_at at time zone v_tz) = b.bucket and l.closed_at >= v_start and l.closed_at < v_end)
  ) order by b.bucket), '[]')
  into v_timeline
  from generate_series(
    date_trunc(v_bucket, v_start at time zone v_tz),
    date_trunc(v_bucket, (v_end - interval '1 second') at time zone v_tz),
    ('1 ' || v_bucket)::interval
  ) as b(bucket);

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

  -- Per person: active members who can own leads, plus anyone still owning leads.
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.won_value desc, x.won desc, x.name), '[]')
  into v_leaderboard
  from (
    select p.id as user_id, coalesce(p.full_name, p.email) as name,
      (select count(*) from public.report_leads(p_org, p_owner, p_source) l where l.owner_id = p.id and l.created_at >= v_start and l.created_at < v_end) as new_leads,
      (select count(*) from public.report_leads(p_org, p_owner, p_source) l where l.owner_id = p.id and l.status = 'won' and l.closed_at >= v_start and l.closed_at < v_end) as won,
      (select count(*) from public.report_leads(p_org, p_owner, p_source) l where l.owner_id = p.id and l.status = 'lost' and l.closed_at >= v_start and l.closed_at < v_end) as lost,
      (select coalesce(sum(value), 0) from public.report_leads(p_org, p_owner, p_source) l where l.owner_id = p.id and l.status = 'won' and l.closed_at >= v_start and l.closed_at < v_end) as won_value,
      (select coalesce(sum(value), 0) from public.report_leads(p_org, p_owner, p_source) l where l.owner_id = p.id and l.status = 'open') as open_value,
      (select count(*) from public.activities a where a.org_id = p_org and a.created_by = p.id and a.created_at >= v_start and a.created_at < v_end) as activities
    from public.profiles p
    where (p_owner is null or p.id = p_owner)
      and (
        exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = p.id and m.status = 'active' and m.role <> 'viewer')
        or exists (select 1 from public.report_leads(p_org, p_owner, p_source) l where l.owner_id = p.id)
      )
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

revoke execute on function public.report_leads(uuid, uuid, uuid) from public, anon;
grant execute on function public.report_leads(uuid, uuid, uuid) to authenticated, service_role;
revoke execute on function public.report(uuid, date, date, uuid, uuid) from public, anon;
grant execute on function public.report(uuid, date, date, uuid, uuid) to authenticated, service_role;
