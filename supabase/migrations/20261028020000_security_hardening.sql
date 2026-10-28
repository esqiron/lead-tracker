-- =============================================================================
-- Security hardening: security audit events, GDPR export/erasure, trash purge,
-- and protecting profile identity fields.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Audit trigger, v2: works for tables without org_id (organizations) and drops
-- secret columns passed as trigger arguments, e.g. ('token_hash').
-- -----------------------------------------------------------------------------
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_org uuid := case when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid else (v_row ->> 'org_id')::uuid end;
  v_diff jsonb;
  v_secret text;
begin
  -- Rows deleted because their organization is being deleted: nothing to audit.
  if not exists (select 1 from public.organizations o where o.id = v_org) then
    return null;
  end if;

  foreach v_secret in array coalesce(tg_argv::text[], '{}') loop
    v_new := v_new - v_secret;
    v_old := v_old - v_secret;
  end loop;

  if tg_op = 'INSERT' then
    v_diff := v_new;
  elsif tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, n.value) into v_diff
    from jsonb_each(v_new) n
    where n.key not in ('updated_at', 'round_robin_cursor', 'last_used_at')
      and (v_old -> n.key) is distinct from n.value;
    if v_diff is null then
      return null;
    end if;
    -- Keep the previous value of changed fields, e.g. role: member -> admin.
    v_diff := jsonb_build_object('new', v_diff, 'old', (select jsonb_object_agg(k, v_old -> k) from jsonb_object_keys(v_diff) k));
  else
    v_diff := v_old;
  end if;

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, diff)
  values (v_org, (select auth.uid()), lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid, v_diff);
  return null;
end;
$$;

-- Security-relevant tables. Secret columns are never copied into the log.
create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function public.write_audit_log();
create trigger invitations_audit after insert or update or delete on public.invitations
  for each row execute function public.write_audit_log('token_hash');
create trigger api_keys_audit after insert or update or delete on public.api_keys
  for each row execute function public.write_audit_log('key_hash');
create trigger capture_forms_audit after insert or update or delete on public.capture_forms
  for each row execute function public.write_audit_log();
create trigger organizations_audit after update on public.organizations
  for each row execute function public.write_audit_log();
create trigger pipeline_stages_audit after insert or update or delete on public.pipeline_stages
  for each row execute function public.write_audit_log();
create trigger lead_sources_audit after insert or update or delete on public.lead_sources
  for each row execute function public.write_audit_log();

-- Stage moves and position shuffles while saving the pipeline are noise, but
-- the audit trigger above already skips unchanged rows; nothing else to do.

-- -----------------------------------------------------------------------------
-- Profiles: users may change their name and avatar, not their email or id.
-- Other code (invites, capture owner matching, notifications) trusts
-- profiles.email; it's kept in sync from auth.users by a trigger instead.
-- -----------------------------------------------------------------------------
create function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (new.id is distinct from old.id or new.email is distinct from old.email) then
    raise exception 'Email can only be changed through your account settings' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- -----------------------------------------------------------------------------
-- GDPR: erase one contact (right to erasure). Admins only. Removes the
-- contact, their activities, the leads attached to them, and the audit
-- entries that contain their data. Leaves one audit entry without personal data.
-- -----------------------------------------------------------------------------
create function public.erase_contact(p_contact uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_leads uuid[];
  v_activities integer;
begin
  select org_id into v_org from public.contacts where id = p_contact;
  if v_org is null or not public.is_org_admin(v_org) then
    raise exception 'Only admins can erase contacts' using errcode = '42501';
  end if;

  select coalesce(array_agg(id), '{}') into v_leads from public.leads where contact_id = p_contact;

  delete from public.activities where contact_id = p_contact or lead_id = any (v_leads);
  get diagnostics v_activities = row_count;
  delete from public.leads where id = any (v_leads);
  delete from public.contacts where id = p_contact;

  -- The audit rows for these records hold copies of the personal data.
  delete from public.audit_log
  where org_id = v_org
    and ((entity = 'contacts' and entity_id = p_contact) or (entity = 'leads' and entity_id = any (v_leads)));

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, diff)
  values (v_org, (select auth.uid()), 'erase', 'contacts', p_contact,
          jsonb_build_object('leads', cardinality(v_leads), 'activities', v_activities));

  return jsonb_build_object('leads', cardinality(v_leads), 'activities', v_activities);
end;
$$;

-- -----------------------------------------------------------------------------
-- GDPR: everything an organization holds, as one JSON document (data
-- portability, backups, leaving the service). Owner only. Secrets excluded.
-- -----------------------------------------------------------------------------
create function public.export_org_data(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_org_role(p_org, array['owner']::public.org_role[]) then
    raise exception 'Only the owner can export all data' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'organization', (select to_jsonb(o) - 'round_robin_cursor' from public.organizations o where o.id = p_org),
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
end;
$$;

-- -----------------------------------------------------------------------------
-- Trash: records soft-deleted more than p_days ago are deleted for good,
-- together with their audit entries. Runs daily via pg_cron when available.
-- -----------------------------------------------------------------------------
create function public.purge_trash(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => p_days);
  v_leads uuid[];
  v_contacts uuid[];
  v_companies uuid[];
begin
  select coalesce(array_agg(id), '{}') into v_leads from public.leads where deleted_at < v_cutoff;
  select coalesce(array_agg(id), '{}') into v_contacts from public.contacts where deleted_at < v_cutoff;
  select coalesce(array_agg(id), '{}') into v_companies from public.companies where deleted_at < v_cutoff;

  delete from public.leads where id = any (v_leads);
  delete from public.activities where contact_id = any (v_contacts);
  delete from public.contacts where id = any (v_contacts);
  delete from public.companies where id = any (v_companies);

  delete from public.audit_log
  where (entity = 'leads' and entity_id = any (v_leads))
     or (entity = 'contacts' and entity_id = any (v_contacts))
     or (entity = 'companies' and entity_id = any (v_companies));

  return jsonb_build_object('leads', cardinality(v_leads), 'contacts', cardinality(v_contacts), 'companies', cardinality(v_companies));
end;
$$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('lead-tracker-purge-trash', '17 3 * * *', 'select public.purge_trash(30)');
  else
    raise notice 'pg_cron is not available: schedule "select public.purge_trash(30)" daily yourself (see docs/self-hosting.md).';
  end if;
exception when others then
  raise notice 'Could not schedule the trash purge (%). Schedule "select public.purge_trash(30)" daily yourself.', sqlerrm;
end;
$$;

revoke execute on function public.erase_contact(uuid) from public, anon;
grant execute on function public.erase_contact(uuid) to authenticated, service_role;
revoke execute on function public.export_org_data(uuid) from public, anon;
grant execute on function public.export_org_data(uuid) to authenticated, service_role;
revoke execute on function public.purge_trash(integer) from public, anon, authenticated;
grant execute on function public.purge_trash(integer) to service_role;
revoke execute on function public.guard_profile_update() from public, anon;
