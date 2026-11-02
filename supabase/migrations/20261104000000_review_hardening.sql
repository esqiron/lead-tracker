-- =============================================================================
-- Fixes from the review of the inbox, weekly review, dashboards and goals
-- migrations:
--   1. Review sessions can't be forged, moved to another org or reopened.
--   2. Review answers point at tasks in the same org and on the same deal, and
--      are stamped with the database time.
--   3. Goals are only set for members, and record who really set them.
--   4. The contact and full exports include the newer data.
--
-- The review RPCs run as the caller, so the tables keep insert/update
-- policies; the triggers below make a direct API write no more powerful than
-- the RPCs. Only writes made as a user (the `authenticated` role) are
-- restricted; SECURITY DEFINER code, the service role and migrations are trusted.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Review sessions
--    - Starting one: the database records the time, the deal count and the
--      forecast; "everyone" needs an admin.
--    - Afterwards the only change is finishing it (completed_at null → now),
--      which also records the forecast after. A finished review is frozen.
-- -----------------------------------------------------------------------------
create function public.guard_review_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.started_at := now();
    new.completed_at := null;
    new.forecast_after := null;
    new.lead_count := (select count(*) from public.review_candidates(new.org_id, new.scope));
    new.forecast_before := public.review_forecast(new.org_id, new.scope);
    return new;
  end if;

  if old.completed_at is not null then
    raise exception 'A finished review can''t be changed' using errcode = '42501';
  end if;
  if new.id is distinct from old.id
     or new.org_id is distinct from old.org_id
     or new.user_id is distinct from old.user_id
     or new.scope is distinct from old.scope
     or new.started_at is distinct from old.started_at
     or new.lead_count is distinct from old.lead_count
     or new.forecast_before is distinct from old.forecast_before then
    raise exception 'A review can only be finished, not changed' using errcode = '42501';
  end if;
  if new.completed_at is null then
    if new.forecast_after is not null then
      raise exception 'The forecast after is recorded when the review is finished' using errcode = '42501';
    end if;
  else
    new.completed_at := now();
    new.forecast_after := public.review_forecast(new.org_id, new.scope);
  end if;
  return new;
end;
$$;

create trigger review_sessions_guard before insert or update on public.review_sessions
  for each row execute function public.guard_review_session();
revoke execute on function public.guard_review_session() from public, anon, authenticated;

drop policy "review_sessions: start own" on public.review_sessions;
create policy "review_sessions: start own" on public.review_sessions
  for insert to authenticated
  with check (
    public.can_edit_org_data(org_id)
    and user_id = (select auth.uid())
    and (scope = 'mine' or public.is_org_admin(org_id))
  );

drop policy "review_sessions: finish own" on public.review_sessions;
create policy "review_sessions: finish own" on public.review_sessions
  for update to authenticated
  using (user_id = (select auth.uid()) and public.can_edit_org_data(org_id))
  with check (user_id = (select auth.uid()) and public.can_edit_org_data(org_id));

-- The trigger now records the count and forecast; no need to work them out twice.
create or replace function public.start_review(p_org uuid, p_scope text default 'mine')
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
  insert into public.review_sessions (org_id, scope) values (p_org, p_scope)
  returning id into v_id;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Review answers
--    - next_task_id stays inside the org (composite key) and, for direct
--      writes, must be a task on the same deal that the author can see.
--    - reviewed_at is the database time.
-- -----------------------------------------------------------------------------
alter table public.activities add constraint activities_org_id_id_key unique (org_id, id);

alter table public.lead_reviews drop constraint lead_reviews_next_task_id_fkey;
alter table public.lead_reviews
  add constraint lead_reviews_org_id_next_task_id_fkey foreign key (org_id, next_task_id)
    references public.activities (org_id, id) on delete set null (next_task_id);

create function public.guard_lead_review_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.reviewed_at := now();
    new.reviewed_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger lead_reviews_guard before insert on public.lead_reviews
  for each row execute function public.guard_lead_review_insert();
revoke execute on function public.guard_lead_review_insert() from public, anon, authenticated;

drop policy "lead_reviews: write own" on public.lead_reviews;
create policy "lead_reviews: write own" on public.lead_reviews
  for insert to authenticated
  with check (
    public.can_edit_org_data(org_id)
    and reviewed_by = (select auth.uid())
    -- RLS on leads/activities applies inside these subqueries.
    and exists (select 1 from public.leads l where l.id = lead_reviews.lead_id)
    and exists (
      select 1 from public.review_sessions s
      where s.id = lead_reviews.session_id and s.user_id = (select auth.uid()) and s.completed_at is null
    )
    and (
      lead_reviews.next_task_id is null
      or exists (
        select 1 from public.activities a
        where a.id = lead_reviews.next_task_id and a.lead_id = lead_reviews.lead_id and a.type = 'task'
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Goals: only for members of the org; updated_by is whoever saved it.
-- -----------------------------------------------------------------------------
create trigger goals_user_member before insert or update of user_id on public.goals
  for each row execute function public.check_member_reference('user_id');

create function public.goals_set_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.updated_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger goals_set_updated_by before insert or update on public.goals
  for each row execute function public.goals_set_updated_by();
revoke execute on function public.goals_set_updated_by() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Exports
-- -----------------------------------------------------------------------------
create or replace function public.export_contact_data(p_contact uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_leads uuid[];
  v_result jsonb;
begin
  select org_id into v_org from public.contacts where id = p_contact;
  if v_org is null or not public.is_org_admin(v_org) then
    raise exception 'Only admins can export a contact''s data' using errcode = '42501';
  end if;

  select coalesce(array_agg(id), '{}') into v_leads from public.leads where contact_id = p_contact;

  v_result := jsonb_build_object(
    'exported_at', now(),
    'controller', (select jsonb_build_object('organization', o.name) from public.organizations o where o.id = v_org),
    'contact', (
      select to_jsonb(c) - 'org_id' - 'created_by' - 'owner_id' - 'company_id'
        || jsonb_build_object(
             'company', (select jsonb_build_object('name', co.name, 'website', co.website) from public.companies co where co.id = c.company_id),
             'owner', (select p.full_name from public.profiles p where p.id = c.owner_id))
      from public.contacts c where c.id = p_contact),
    'leads', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', l.id, 'title', l.title, 'value', l.value, 'currency', l.currency, 'status', l.status,
          'stage', s.name, 'source', src.name, 'lost_reason', l.lost_reason,
          'created_at', l.created_at, 'closed_at', l.closed_at, 'deleted_at', l.deleted_at,
          'stage_history', (
            select coalesce(jsonb_agg(jsonb_build_object('stage', hs.name, 'entered_at', h.changed_at) order by h.changed_at), '[]')
            from public.lead_stage_history h left join public.pipeline_stages hs on hs.id = h.to_stage_id
            where h.lead_id = l.id)
        ) order by l.created_at), '[]')
      from public.leads l
      left join public.pipeline_stages s on s.id = l.stage_id
      left join public.lead_sources src on src.id = l.source_id
      where l.id = any (v_leads)),
    'activities', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', a.type, 'body', a.body, 'source', a.source, 'lead_id', a.lead_id,
        'direction', a.direction, 'outcome', a.outcome,
        'due_at', a.due_at, 'completed_at', a.completed_at, 'created_at', a.created_at,
        'author', (select p.full_name from public.profiles p where p.id = a.created_by)
      ) order by a.created_at), '[]')
      from public.activities a
      where a.contact_id = p_contact or a.lead_id = any (v_leads)),
    'reviews', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'lead_id', r.lead_id, 'reviewed_at', r.reviewed_at, 'answer', r.answer, 'reasons', r.reasons,
        'close_from', r.close_from, 'close_to', r.close_to, 'lost_reason', r.lost_reason,
        'reviewer', (select p.full_name from public.profiles p where p.id = r.reviewed_by)
      ) order by r.reviewed_at), '[]')
      from public.lead_reviews r
      where r.org_id = v_org and r.lead_id = any (v_leads)),
    'change_history', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'at', al.created_at, 'action', al.action, 'record', al.entity, 'record_id', al.entity_id, 'changes', al.diff
      ) order by al.created_at), '[]')
      from public.audit_log al
      where al.org_id = v_org
        and ((al.entity = 'contacts' and al.entity_id = p_contact) or (al.entity = 'leads' and al.entity_id = any (v_leads))))
  );

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id)
  values (v_org, (select auth.uid()), 'export', 'contacts', p_contact);
  return v_result;
end;
$$;

create or replace function public.export_org_data(p_org uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.has_org_role(p_org, array['owner']::public.org_role[]) then
    raise exception 'Only the owner can export all data' using errcode = '42501';
  end if;

  v_result := jsonb_build_object(
    'exported_at', now(),
    'organization', (select to_jsonb(o) from public.organizations o where o.id = p_org),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', p.email, 'name', p.full_name, 'role', m.role, 'status', m.status, 'joined_at', m.created_at)), '[]')
                from public.memberships m join public.profiles p on p.id = m.user_id where m.org_id = p_org),
    'pipeline_stages', (select coalesce(jsonb_agg(to_jsonb(s) order by s.position), '[]') from public.pipeline_stages s where s.org_id = p_org),
    'lead_sources', (select coalesce(jsonb_agg(to_jsonb(s) order by s.position), '[]') from public.lead_sources s where s.org_id = p_org),
    'companies', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.companies c where c.org_id = p_org),
    'contacts', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.contacts c where c.org_id = p_org),
    'leads', (select coalesce(jsonb_agg(to_jsonb(l)), '[]') from public.leads l where l.org_id = p_org),
    'activities', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.activities a where a.org_id = p_org),
    'lead_stage_history', (select coalesce(jsonb_agg(to_jsonb(h)), '[]') from public.lead_stage_history h where h.org_id = p_org),
    'capture_forms', (select coalesce(jsonb_agg(to_jsonb(f) - 'round_robin_cursor'), '[]') from public.capture_forms f where f.org_id = p_org),
    'api_keys', (select coalesce(jsonb_agg(to_jsonb(k) - 'key_hash'), '[]') from public.api_keys k where k.org_id = p_org),
    'invitations', (select coalesce(jsonb_agg(to_jsonb(i) - 'token_hash'), '[]') from public.invitations i where i.org_id = p_org),
    'dashboards', (select coalesce(jsonb_agg(to_jsonb(d) order by d.position, d.created_at), '[]') from public.dashboards d where d.org_id = p_org),
    'goals', (select coalesce(jsonb_agg(to_jsonb(g) order by g.period_start), '[]') from public.goals g where g.org_id = p_org),
    'review_sessions', (select coalesce(jsonb_agg(to_jsonb(s) order by s.started_at), '[]') from public.review_sessions s where s.org_id = p_org),
    'lead_reviews', (select coalesce(jsonb_agg(to_jsonb(r) order by r.reviewed_at), '[]') from public.lead_reviews r where r.org_id = p_org),
    'audit_log', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]') from public.audit_log a where a.org_id = p_org)
  );

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id)
  values (p_org, (select auth.uid()), 'export', 'organizations', p_org);
  return v_result;
end;
$$;
