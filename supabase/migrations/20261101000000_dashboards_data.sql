-- =============================================================================
-- Dashboards: data functions
--
-- One small function per widget family, so a dashboard only pays for the
-- widgets it shows. report() stays as it is for the Reports page and its CSV
-- export. Everything runs as the caller (security invoker), so RLS applies:
-- members on lead_visibility = 'own' only get numbers about their own leads,
-- and report_drill() only returns leads they can open.
--
-- Periods follow report(): inclusive dates in the org's time zone, bucketed by
-- day (<= 31 days), week (<= 190 days) or month.
-- =============================================================================

create index if not exists activities_org_created_idx on public.activities (org_id, created_at);

-- Validates the caller and the dates, and resolves the period in the org's time zone.
create function public.report_period(
  p_org uuid, p_from date, p_to date,
  out tz text, out starts timestamptz, out ends timestamptz, out prev_start timestamptz, out bucket text
)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 3660 then
    raise exception 'Pick a period of up to 10 years' using errcode = '22023';
  end if;
  select o.timezone into tz from public.organizations o where o.id = p_org;
  starts := p_from::timestamp at time zone tz;
  ends := (p_to + 1)::timestamp at time zone tz;
  prev_start := starts - (ends - starts);
  bucket := case when p_to - p_from <= 31 then 'day' when p_to - p_from <= 190 then 'week' else 'month' end;
end;
$$;

-- Bucket starts (local dates) covering a period.
create function public.report_buckets(p_tz text, p_bucket text, p_start timestamptz, p_end timestamptz)
returns table (bucket timestamp, bucket_end timestamptz)
language sql
stable
set search_path = ''
as $$
  select b, least((b + ('1 ' || p_bucket)::interval) at time zone p_tz, p_end)
  from generate_series(
    date_trunc(p_bucket, p_start at time zone p_tz),
    date_trunc(p_bucket, (p_end - interval '1 second') at time zone p_tz),
    ('1 ' || p_bucket)::interval
  ) as g(b);
$$;

-- Weighted pipeline as it stood at a moment: leads open then, valued at the
-- win chance of the stage they were in then (from lead_stage_history; leads
-- with no history before that moment use their current stage).
create function public.report_weighted_at(p_org uuid, p_owner uuid, p_source uuid, p_at timestamptz)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(round(sum(l.value * s.probability / 100.0), 2), 0)
  from public.report_leads(p_org, p_owner, p_source) l
  left join lateral (
    select h.to_stage_id from public.lead_stage_history h
    where h.lead_id = l.id and h.changed_at < p_at
    order by h.changed_at desc, h.id desc
    limit 1
  ) st on true
  join public.pipeline_stages s on s.id = coalesce(st.to_stage_id, l.stage_id)
  where l.created_at < p_at
    and (l.closed_at is null or l.closed_at >= p_at)
    and not s.is_won and not s.is_lost;
$$;

-- Time to first reply for leads that came in through a capture form or the
-- API: hours until a member first called, met, or emailed them (not counting
-- emails logged as inbound). hours is null while nobody has replied.
-- No SET clause, so the planner can inline it (like report_leads).
create function public.report_reply_hours(p_org uuid, p_owner uuid, p_source uuid, p_start timestamptz, p_end timestamptz)
returns table (lead_id uuid, hours numeric)
language sql
stable
as $$
  select l.id, (
    select round((extract(epoch from min(a.created_at) - l.created_at) / 3600)::numeric, 2)
    from public.activities a
    where a.lead_id = l.id
      and a.created_by is not null
      and a.created_at >= l.created_at
      and (a.type in ('call', 'meeting') or (a.type = 'email' and a.direction is distinct from 'inbound'))
  )
  from public.report_leads(p_org, p_owner, p_source) l
  where (l.capture_form_id is not null or l.api_key_id is not null)
    and l.created_at >= p_start and l.created_at < p_end;
$$;

-- Reply-time buckets: < 1 h, 1–4 h, 4–24 h, 1–3 days, 3+ days.
create function public.report_reply_bucket(p_hours numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_hours is null then null when p_hours < 1 then 0 when p_hours < 4 then 1
              when p_hours < 24 then 2 when p_hours < 72 then 3 else 4 end;
$$;

-- Open leads with how long they've been in their current stage.
-- Age buckets: 0–7, 8–14, 15–30, 31–60, 61+ days.
create function public.report_open_age(p_org uuid, p_owner uuid, p_source uuid)
returns table (lead_id uuid, stage_id uuid, value numeric, days integer, age_bucket integer)
language sql
stable
as $$
  select x.id, x.stage_id, x.value, x.days,
    case when x.days <= 7 then 0 when x.days <= 14 then 1 when x.days <= 30 then 2 when x.days <= 60 then 3 else 4 end
  from (
    select l.id, l.stage_id, l.value,
      floor(extract(epoch from now() - coalesce(
        (select max(h.changed_at) from public.lead_stage_history h where h.lead_id = l.id and h.to_stage_id = l.stage_id),
        l.created_at
      )) / 86400)::integer as days
    from public.report_leads(p_org, p_owner, p_source) l
    where l.status = 'open'
  ) x;
$$;

-- Activities members logged in a window. The owner filter means "logged by";
-- the source filter keeps activities on leads from that source.
create function public.report_activity_count(p_org uuid, p_owner uuid, p_source uuid, p_start timestamptz, p_end timestamptz)
returns bigint
language sql
stable
set search_path = ''
as $$
  select count(*) from public.activities a
  where a.org_id = p_org
    and a.created_by is not null
    and a.created_at >= p_start and a.created_at < p_end
    and (p_owner is null or a.created_by = p_owner)
    and (p_source is null or a.lead_id in (select l.id from public.report_leads(p_org, null, p_source) l));
$$;

-- Headline numbers for one window.
create function public.report_totals(p_org uuid, p_owner uuid, p_source uuid, p_start timestamptz, p_end timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'new_leads', (select count(*) from public.report_leads(p_org, p_owner, p_source) l where l.created_at >= p_start and l.created_at < p_end),
    'won_count', (select count(*) from public.report_leads(p_org, p_owner, p_source) l where l.status = 'won' and l.closed_at >= p_start and l.closed_at < p_end),
    'won_value', (select coalesce(sum(l.value), 0) from public.report_leads(p_org, p_owner, p_source) l where l.status = 'won' and l.closed_at >= p_start and l.closed_at < p_end),
    'lost_count', (select count(*) from public.report_leads(p_org, p_owner, p_source) l where l.status = 'lost' and l.closed_at >= p_start and l.closed_at < p_end),
    'activities', public.report_activity_count(p_org, p_owner, p_source, p_start, p_end),
    'weighted_value', public.report_weighted_at(p_org, p_owner, p_source, least(p_end, now())),
    'median_reply_hours', (
      select round((percentile_cont(0.5) within group (order by r.hours))::numeric, 1)
      from public.report_reply_hours(p_org, p_owner, p_source, p_start, p_end) r where r.hours is not null
    )
  );
$$;

-- -----------------------------------------------------------------------------
-- Number widgets: totals for the period and the previous one, plus a series
-- per bucket for sparklines. Win rate and average deal are derived in the app.
-- weighted_value is the pipeline at the end of each window (or now).
-- -----------------------------------------------------------------------------
create function public.report_kpis(p_org uuid, p_from date, p_to date, p_owner uuid default null, p_source uuid default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  p record;
  v_series jsonb;
begin
  select * into p from public.report_period(p_org, p_from, p_to);

  with b as (select * from public.report_buckets(p.tz, p.bucket, p.starts, p.ends)),
  created as (
    select date_trunc(p.bucket, l.created_at at time zone p.tz) as bucket, count(*) as n
    from public.report_leads(p_org, p_owner, p_source) l
    where l.created_at >= p.starts and l.created_at < p.ends
    group by 1
  ),
  closed as (
    select date_trunc(p.bucket, l.closed_at at time zone p.tz) as bucket,
      count(*) filter (where l.status = 'won') as won,
      coalesce(sum(l.value) filter (where l.status = 'won'), 0) as won_value,
      count(*) filter (where l.status = 'lost') as lost
    from public.report_leads(p_org, p_owner, p_source) l
    where l.closed_at >= p.starts and l.closed_at < p.ends and l.status in ('won', 'lost')
    group by 1
  ),
  acts as (
    select date_trunc(p.bucket, a.created_at at time zone p.tz) as bucket, count(*) as n
    from public.activities a
    where a.org_id = p_org and a.created_by is not null
      and a.created_at >= p.starts and a.created_at < p.ends
      and (p_owner is null or a.created_by = p_owner)
      and (p_source is null or a.lead_id in (select l.id from public.report_leads(p_org, null, p_source) l))
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'bucket', to_char(b.bucket, 'YYYY-MM-DD'),
    'new_leads', coalesce(c.n, 0),
    'won_count', coalesce(x.won, 0),
    'won_value', coalesce(x.won_value, 0),
    'lost_count', coalesce(x.lost, 0),
    'activities', coalesce(a.n, 0),
    'weighted_value', public.report_weighted_at(p_org, p_owner, p_source, least(b.bucket_end, now())),
    'median_reply_hours', (
      select round((percentile_cont(0.5) within group (order by r.hours))::numeric, 1)
      from public.report_reply_hours(p_org, p_owner, p_source, b.bucket at time zone p.tz, b.bucket_end) r where r.hours is not null
    )
  ) order by b.bucket), '[]')
  into v_series
  from b
  left join created c on c.bucket = b.bucket
  left join closed x on x.bucket = b.bucket
  left join acts a on a.bucket = b.bucket;

  return jsonb_build_object(
    'bucket', p.bucket,
    'current', public.report_totals(p_org, p_owner, p_source, p.starts, p.ends),
    'previous', public.report_totals(p_org, p_owner, p_source, p.prev_start, p.starts),
    'series', v_series
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Over-time widgets: one measure per bucket, split by source, owner or nothing.
-- keys lists every possible series with a stable position (sources by their
-- order in settings, people by when they joined), so a series keeps its colour
-- whatever the filters. A null key is "No source" / "No owner".
-- -----------------------------------------------------------------------------
create function public.report_timeline_split(
  p_org uuid, p_from date, p_to date, p_owner uuid default null, p_source uuid default null,
  p_measure text default 'won_value', p_split text default 'source'
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  p record;
  v_keys jsonb;
  v_rows jsonb;
  v_buckets jsonb;
begin
  if p_measure not in ('won_value', 'won_count', 'new_leads') or p_split not in ('source', 'owner', 'none') then
    raise exception 'Unknown measure or split' using errcode = '22023';
  end if;
  select * into p from public.report_period(p_org, p_from, p_to);

  if p_split = 'source' then
    select coalesce(jsonb_agg(jsonb_build_object('key', s.id, 'name', s.name, 'position', s.position) order by s.position, s.name), '[]')
      || jsonb_build_array(jsonb_build_object('key', null, 'name', 'No source', 'position', null))
    into v_keys
    from public.lead_sources s where s.org_id = p_org;
  elsif p_split = 'owner' then
    with people as (
      select m.user_id as id, m.created_at from public.memberships m
      where m.org_id = p_org and m.status = 'active' and m.role <> 'viewer'
      union
      select l.owner_id, 'infinity'::timestamptz from public.report_leads(p_org, p_owner, p_source) l
      where l.owner_id is not null
        and not exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = l.owner_id and m.status = 'active' and m.role <> 'viewer')
    ),
    ranked as (
      select pe.id, coalesce(pr.full_name, pr.email) as name, row_number() over (order by min(pe.created_at), coalesce(pr.full_name, pr.email)) - 1 as position
      from people pe join public.profiles pr on pr.id = pe.id
      group by pe.id, pr.full_name, pr.email
    )
    select coalesce(jsonb_agg(jsonb_build_object('key', r.id, 'name', r.name, 'position', r.position) order by r.position), '[]')
      || jsonb_build_array(jsonb_build_object('key', null, 'name', 'No owner', 'position', null))
    into v_keys
    from ranked r;
  else
    v_keys := jsonb_build_array(jsonb_build_object('key', 'all', 'name', case p_measure when 'new_leads' then 'New leads' when 'won_count' then 'Won' else 'Won value' end, 'position', 0));
  end if;

  select coalesce(jsonb_agg(to_char(b.bucket, 'YYYY-MM-DD') order by b.bucket), '[]')
  into v_buckets
  from public.report_buckets(p.tz, p.bucket, p.starts, p.ends) b;

  with base as (
    select
      date_trunc(p.bucket, (case when p_measure = 'new_leads' then l.created_at else l.closed_at end) at time zone p.tz) as bucket,
      case p_split when 'source' then l.source_id::text when 'owner' then l.owner_id::text else 'all' end as k,
      l.value
    from public.report_leads(p_org, p_owner, p_source) l
    where case when p_measure = 'new_leads'
      then l.created_at >= p.starts and l.created_at < p.ends
      else l.status = 'won' and l.closed_at >= p.starts and l.closed_at < p.ends end
  )
  select coalesce(jsonb_agg(jsonb_build_object('bucket', to_char(bucket, 'YYYY-MM-DD'), 'key', k, 'value', v) order by bucket, k), '[]')
  into v_rows
  from (
    select bucket, k, case when p_measure = 'won_value' then sum(value) else count(*) end as v
    from base group by bucket, k
  ) g;

  return jsonb_build_object('bucket', p.bucket, 'buckets', v_buckets, 'keys', v_keys, 'rows', v_rows);
end;
$$;

-- -----------------------------------------------------------------------------
-- Deal aging: open leads per stage × days in that stage, right now.
-- -----------------------------------------------------------------------------
create function public.report_aging(p_org uuid, p_owner uuid default null, p_source uuid default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_org_member(p_org) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  with a as (select * from public.report_open_age(p_org, p_owner, p_source))
  select coalesce(jsonb_agg(jsonb_build_object(
    'stage_id', s.id,
    'name', s.name,
    'probability', s.probability,
    'counts', (select jsonb_agg((select count(*) from a where a.stage_id = s.id and a.age_bucket = i) order by i) from generate_series(0, 4) i),
    'values', (select jsonb_agg((select coalesce(sum(a.value), 0) from a where a.stage_id = s.id and a.age_bucket = i) order by i) from generate_series(0, 4) i)
  ) order by s.position), '[]')
  into v
  from public.pipeline_stages s
  where s.org_id = p_org and not s.is_won and not s.is_lost;

  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- Activity calendar: activities members logged per local day.
-- -----------------------------------------------------------------------------
create function public.report_activity_days(p_org uuid, p_from date, p_to date, p_owner uuid default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  p record;
  v jsonb;
begin
  select * into p from public.report_period(p_org, p_from, p_to);

  select coalesce(jsonb_agg(jsonb_build_object('day', to_char(d, 'YYYY-MM-DD'), 'count', coalesce(x.n, 0)) order by d), '[]')
  into v
  from generate_series(p_from, p_to, interval '1 day') d
  left join (
    select (a.created_at at time zone p.tz)::date as day, count(*) as n
    from public.activities a
    where a.org_id = p_org and a.created_by is not null
      and a.created_at >= p.starts and a.created_at < p.ends
      and (p_owner is null or a.created_by = p_owner)
    group by 1
  ) x on x.day = d::date;

  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- Time to first reply, for form and API leads created in the period.
-- -----------------------------------------------------------------------------
create function public.report_first_reply(p_org uuid, p_from date, p_to date, p_owner uuid default null, p_source uuid default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  p record;
  v jsonb;
begin
  select * into p from public.report_period(p_org, p_from, p_to);

  with r as (select r.hours, public.report_reply_bucket(r.hours) as b from public.report_reply_hours(p_org, p_owner, p_source, p.starts, p.ends) r)
  select jsonb_build_object(
    'leads', count(*),
    'replied', count(r.hours),
    'waiting', count(*) - count(r.hours),
    'median_hours', round((percentile_cont(0.5) within group (order by r.hours))::numeric, 1),
    'within_4h', count(*) filter (where r.hours < 4),
    'buckets', jsonb_build_array(
      count(*) filter (where r.b = 0), count(*) filter (where r.b = 1), count(*) filter (where r.b = 2),
      count(*) filter (where r.b = 3), count(*) filter (where r.b = 4)
    )
  )
  into v
  from r;

  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- Drill-down: the lead ids behind one number. p_from/p_to are the cell's own
-- dates (a bucket, or the whole period). p_params by kind:
--   new | won   {split?: 'source'|'owner'|'none', key?: uuid|'none'}
--   lost        {reason?: text}               ('No reason given' matches blanks)
--   open        {stage_id?: uuid}
--   funnel      {stage_id: uuid} | {won: true} (leads created in the period that got that far)
--   aging       {stage_id: uuid, bucket: 0..4}
--   reply       {bucket: 0..4} | {waiting: true}
-- -----------------------------------------------------------------------------
create function public.report_drill(
  p_org uuid, p_from date, p_to date, p_owner uuid, p_source uuid, p_kind text, p_params jsonb default '{}'
)
returns setof uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  p record;
  v_split text := coalesce(p_params ->> 'split', 'none');
  v_key uuid := nullif(nullif(p_params ->> 'key', 'none'), 'all')::uuid;
  v_stage uuid := (p_params ->> 'stage_id')::uuid;
  v_bucket integer := (p_params ->> 'bucket')::integer;
  v_position integer;
begin
  select * into p from public.report_period(p_org, p_from, p_to);

  if p_kind in ('new', 'won') then
    if v_split not in ('source', 'owner', 'none') then
      raise exception 'Unknown split' using errcode = '22023';
    end if;
    return query
      select l.id from public.report_leads(p_org, p_owner, p_source) l
      where case when p_kind = 'new'
          then l.created_at >= p.starts and l.created_at < p.ends
          else l.status = 'won' and l.closed_at >= p.starts and l.closed_at < p.ends end
        and case v_split
          when 'source' then l.source_id is not distinct from v_key
          when 'owner' then l.owner_id is not distinct from v_key
          else true end;
  elsif p_kind = 'lost' then
    return query
      select l.id from public.report_leads(p_org, p_owner, p_source) l
      where l.status = 'lost' and l.closed_at >= p.starts and l.closed_at < p.ends
        and (p_params ->> 'reason' is null or coalesce(nullif(trim(l.lost_reason), ''), 'No reason given') = p_params ->> 'reason');
  elsif p_kind = 'open' then
    return query
      select l.id from public.report_leads(p_org, p_owner, p_source) l
      where l.status = 'open' and (v_stage is null or l.stage_id = v_stage);
  elsif p_kind = 'funnel' then
    select s.position into v_position from public.pipeline_stages s where s.id = v_stage and s.org_id = p_org;
    return query
      with cohort as (
        select l.id, l.status,
          greatest(
            (select max(s.position) from public.lead_stage_history h
               join public.pipeline_stages s on s.id = h.to_stage_id
               where h.lead_id = l.id and not s.is_won and not s.is_lost),
            (select s.position from public.pipeline_stages s where s.id = l.stage_id and not s.is_won and not s.is_lost)
          ) as furthest
        from public.report_leads(p_org, p_owner, p_source) l
        where l.created_at >= p.starts and l.created_at < p.ends
      )
      select c.id from cohort c
      where case when (p_params ->> 'won')::boolean then c.status = 'won'
                 when v_stage is null then true
                 else c.status = 'won' or c.furthest >= v_position end;
  elsif p_kind = 'aging' then
    return query
      select a.lead_id from public.report_open_age(p_org, p_owner, p_source) a
      where a.stage_id = v_stage and a.age_bucket = v_bucket;
  elsif p_kind = 'reply' then
    return query
      select r.lead_id from public.report_reply_hours(p_org, p_owner, p_source, p.starts, p.ends) r
      where case when (p_params ->> 'waiting')::boolean then r.hours is null
                 else public.report_reply_bucket(r.hours) = v_bucket end;
  else
    raise exception 'Unknown drill kind' using errcode = '22023';
  end if;
end;
$$;

-- Callable by signed-in members only (each checks membership; RLS does the rest).
revoke execute on function public.report_period(uuid, date, date) from public, anon;
revoke execute on function public.report_buckets(text, text, timestamptz, timestamptz) from public, anon;
revoke execute on function public.report_weighted_at(uuid, uuid, uuid, timestamptz) from public, anon;
revoke execute on function public.report_reply_hours(uuid, uuid, uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.report_reply_bucket(numeric) from public, anon;
revoke execute on function public.report_open_age(uuid, uuid, uuid) from public, anon;
revoke execute on function public.report_activity_count(uuid, uuid, uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.report_totals(uuid, uuid, uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.report_kpis(uuid, date, date, uuid, uuid) from public, anon;
revoke execute on function public.report_timeline_split(uuid, date, date, uuid, uuid, text, text) from public, anon;
revoke execute on function public.report_aging(uuid, uuid, uuid) from public, anon;
revoke execute on function public.report_activity_days(uuid, date, date, uuid) from public, anon;
revoke execute on function public.report_first_reply(uuid, date, date, uuid, uuid) from public, anon;
revoke execute on function public.report_drill(uuid, date, date, uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.report_period(uuid, date, date) to authenticated, service_role;
grant execute on function public.report_buckets(text, text, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.report_weighted_at(uuid, uuid, uuid, timestamptz) to authenticated, service_role;
grant execute on function public.report_reply_hours(uuid, uuid, uuid, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.report_reply_bucket(numeric) to authenticated, service_role;
grant execute on function public.report_open_age(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.report_activity_count(uuid, uuid, uuid, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.report_totals(uuid, uuid, uuid, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.report_kpis(uuid, date, date, uuid, uuid) to authenticated, service_role;
grant execute on function public.report_timeline_split(uuid, date, date, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.report_aging(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.report_activity_days(uuid, date, date, uuid) to authenticated, service_role;
grant execute on function public.report_first_reply(uuid, date, date, uuid, uuid) to authenticated, service_role;
grant execute on function public.report_drill(uuid, date, date, uuid, uuid, text, jsonb) to authenticated, service_role;
