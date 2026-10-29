-- Inbox foundations: every lead is a conversation thread. One view works out, per
-- lead, when it was last touched, its next step (earliest open task) and which
-- inbox folder it belongs to, so the folder rules live in one place.

-- Per-org thresholds for the inbox and the weekly review.
alter table public.organizations
  add column cold_after_days smallint not null default 14 check (cold_after_days between 1 and 365),
  add column review_day smallint not null default 1 check (review_day between 0 and 6); -- 0 = Sunday

-- Newest activity per lead. Replaces the plain lead_id index, which it covers.
create index activities_lead_created_idx on public.activities (lead_id, created_at desc);
drop index if exists public.activities_lead_idx;

-- security_invoker: the view runs with the caller's rights, so the RLS on leads,
-- activities, stage history and organizations still decides what each user sees.
create view public.lead_threads with (security_invoker = on) as
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
        a.source is not null as inbound
      from public.activities a
      where a.lead_id = l.id and (a.type <> 'task' or a.completed_at is not null)
      order by case when a.type = 'task' then a.completed_at else a.created_at end desc
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

comment on view public.lead_threads is
  'One row per lead with last touch, next step and inbox folder (needs_reply, waiting, going_cold, won). RLS applies via security_invoker.';

revoke all on public.lead_threads from public, anon;
grant select on public.lead_threads to authenticated, service_role;
