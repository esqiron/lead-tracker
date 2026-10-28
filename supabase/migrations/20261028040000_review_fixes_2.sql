-- =============================================================================
-- More fixes from the security review: immutable authorship, activities tied
-- to visible records, lead status derived from the stage, ownership changes,
-- composite foreign keys for capture, invitation email checks, and auditing
-- full exports in the database.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Record guard v2 (leads, contacts, companies):
--    - org_id and created_by never change;
--    - members can only reassign records they own or that are unassigned;
--    - only admins or the record's owner can trash or restore it.
--    Only writes made directly as a user (the `authenticated` role, i.e.
--    through the API) are restricted. Our own SECURITY DEFINER functions, the
--    service role and migrations are trusted.
-- -----------------------------------------------------------------------------
create or replace function public.guard_record_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if new.org_id <> old.org_id then
    raise exception 'org_id cannot be changed' using errcode = '42501';
  end if;
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'The creator of a record can''t be changed' using errcode = '42501';
  end if;
  if not public.is_org_admin(old.org_id) then
    if new.owner_id is distinct from old.owner_id and old.owner_id is not null and old.owner_id <> v_uid then
      raise exception 'Only admins can reassign someone else''s record' using errcode = '42501';
    end if;
    if new.deleted_at is distinct from old.deleted_at and old.owner_id is distinct from v_uid then
      raise exception 'Only admins or the record owner can delete or restore this record' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Activities: org_id, created_by and the record they belong to are fixed
--    once written, and new activities must attach to records the author can
--    see. Viewers can't delete anything.
-- -----------------------------------------------------------------------------
create function public.guard_activity_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and (
    new.org_id is distinct from old.org_id
    or new.created_by is distinct from old.created_by
    or new.lead_id is distinct from old.lead_id
    or new.contact_id is distinct from old.contact_id
    or new.source is distinct from old.source
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Only an activity''s text, due date, assignee and completion can be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger activities_guard before update on public.activities
  for each row execute function public.guard_activity_update();

drop policy "activities: insert" on public.activities;
create policy "activities: insert" on public.activities
  for insert to authenticated
  with check (
    public.can_edit_org_data(org_id)
    and created_by = (select auth.uid())
    and source is null
    -- RLS on leads/contacts applies inside these subqueries.
    and (lead_id is null or exists (select 1 from public.leads l where l.id = lead_id))
    and (contact_id is null or exists (select 1 from public.contacts c where c.id = contact_id))
  );

drop policy "activities: delete" on public.activities;
create policy "activities: delete" on public.activities
  for delete to authenticated
  using (public.can_edit_org_data(org_id) and (created_by = (select auth.uid()) or public.is_org_admin(org_id)));

-- -----------------------------------------------------------------------------
-- 3. Lead status always follows the stage; closed_at is set by the database
--    when a lead closes (trusted writers such as imports may set it).
-- -----------------------------------------------------------------------------
create or replace function public.leads_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_stage public.pipeline_stages;
  v_trusted boolean := current_user not in ('authenticated', 'anon');
  v_was_closed boolean := tg_op = 'UPDATE' and old.status <> 'open';
begin
  if new.currency is null then
    select o.currency into new.currency from public.organizations o where o.id = new.org_id;
  end if;

  select * into v_stage from public.pipeline_stages s where s.id = new.stage_id;
  new.status := case when v_stage.is_won then 'won' when v_stage.is_lost then 'lost' else 'open' end;

  if new.status = 'open' then
    new.closed_at := null;
    new.lost_reason := null;
  elsif not v_trusted then
    -- Keep the original close time while it stays closed; otherwise now.
    new.closed_at := case when v_was_closed and old.status = new.status then old.closed_at else now() end;
  else
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  if new.status = 'won' then
    new.lost_reason := null;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Capture references stay inside the organization (composite keys).
-- -----------------------------------------------------------------------------
alter table public.capture_forms add constraint capture_forms_org_id_id_key unique (org_id, id);
alter table public.api_keys add constraint api_keys_org_id_id_key unique (org_id, id);
alter table public.leads drop constraint leads_capture_form_id_fkey;
alter table public.leads drop constraint leads_api_key_id_fkey;
alter table public.leads
  add constraint leads_org_id_capture_form_id_fkey foreign key (org_id, capture_form_id)
    references public.capture_forms (org_id, id) on delete set null (capture_form_id),
  add constraint leads_org_id_api_key_id_fkey foreign key (org_id, api_key_id)
    references public.api_keys (org_id, id) on delete set null (api_key_id);
-- capture_form_id / api_key_id are set by inbound capture only.
create function public.guard_lead_capture_refs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and (
    (tg_op = 'INSERT' and (new.capture_form_id is not null or new.api_key_id is not null))
    or (tg_op = 'UPDATE' and (new.capture_form_id is distinct from old.capture_form_id or new.api_key_id is distinct from old.api_key_id))
  ) then
    raise exception 'Where a lead came from can''t be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger leads_guard_capture_refs before insert or update on public.leads
  for each row execute function public.guard_lead_capture_refs();

-- -----------------------------------------------------------------------------
-- 5. Accepting an invitation requires a confirmed email that isn't in the
--    middle of being changed (defense in depth on top of Supabase's email
--    confirmation settings; see docs/self-hosting.md).
-- -----------------------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_user auth.users;
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

  select * into v_user from auth.users u where u.id = v_uid;
  if v_user.email is null or lower(v_user.email) is distinct from lower(v_inv.email) then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;
  if v_user.email_confirmed_at is null or coalesce(v_user.email_change, '') <> '' then
    raise exception 'Confirm your email address before accepting this invitation' using errcode = '42501';
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

-- -----------------------------------------------------------------------------
-- 6. A full export is logged by the database itself, so calling the RPC
--    directly also leaves a trace.
-- -----------------------------------------------------------------------------
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
    'audit_log', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]') from public.audit_log a where a.org_id = p_org)
  );

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id)
  values (p_org, (select auth.uid()), 'export', 'organizations', p_org);
  return v_result;
end;
$$;

revoke execute on function public.guard_activity_update() from public, anon, authenticated;
revoke execute on function public.guard_lead_capture_refs() from public, anon, authenticated;

-- Profile guard: restrict direct user writes, not trusted internal ones.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.id is distinct from old.id or new.email is distinct from old.email) then
    raise exception 'Email can only be changed through your account settings' using errcode = '42501';
  end if;
  return new;
end;
$$;
