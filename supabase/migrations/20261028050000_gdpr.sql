-- =============================================================================
-- GDPR support: lawful basis per contact, consent withdrawal, do-not-contact,
-- per-contact data export (right of access), and retention rules.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Contact privacy fields
-- -----------------------------------------------------------------------------
create type public.lawful_basis as enum ('consent', 'contract', 'legitimate_interest', 'legal_obligation');

alter table public.contacts
  add column lawful_basis public.lawful_basis,
  add column consent_withdrawn_at timestamptz,
  -- Set when the person objects to being contacted, asks to restrict
  -- processing, or withdraws consent. Null means they can be contacted.
  add column do_not_contact_at timestamptz;

-- Consent records are evidence, so users can't write them: only capture forms
-- (and other trusted database code) record consent. Withdrawal and
-- do-not-contact are stamped with the database time. Members can mark someone
-- do-not-contact; only admins can lift it, and a withdrawal can't be undone.
create function public.guard_contact_privacy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_untrusted boolean := current_user in ('authenticated', 'anon');
begin
  if v_untrusted then
    if tg_op = 'INSERT' then
      if new.consent_text is not null or new.consented_at is not null or new.consent_source is not null
         or new.consent_withdrawn_at is not null then
        raise exception 'Consent is recorded by capture forms, not set by hand' using errcode = '42501';
      end if;
      if new.do_not_contact_at is not null then
        new.do_not_contact_at := now();
      end if;
    else
      if new.consent_text is distinct from old.consent_text
         or new.consented_at is distinct from old.consented_at
         or new.consent_source is distinct from old.consent_source then
        raise exception 'Consent is recorded by capture forms, not set by hand' using errcode = '42501';
      end if;
      if new.consent_withdrawn_at is distinct from old.consent_withdrawn_at then
        if old.consent_withdrawn_at is not null then
          raise exception 'A consent withdrawal can''t be undone' using errcode = '42501';
        end if;
        new.consent_withdrawn_at := now();
      end if;
      if new.do_not_contact_at is distinct from old.do_not_contact_at then
        if new.do_not_contact_at is null then
          if not public.is_org_admin(old.org_id) then
            raise exception 'Only admins can allow contact again' using errcode = '42501';
          end if;
          if new.consent_withdrawn_at is not null and new.lawful_basis = 'consent' then
            raise exception 'This person withdrew consent. Pick another lawful basis before allowing contact again.' using errcode = '42501';
          end if;
        elsif old.do_not_contact_at is not null then
          new.do_not_contact_at := old.do_not_contact_at;
        else
          new.do_not_contact_at := now();
        end if;
      end if;
    end if;
  end if;

  -- Recorded consent implies consent as the basis, unless one was picked.
  if new.consented_at is not null and new.lawful_basis is null then
    new.lawful_basis := 'consent';
  end if;
  -- Withdrawing consent stops contact.
  if new.consent_withdrawn_at is not null and new.do_not_contact_at is null
     and (tg_op = 'INSERT' or old.consent_withdrawn_at is null) then
    new.do_not_contact_at := new.consent_withdrawn_at;
  end if;
  return new;
end;
$$;

create trigger contacts_guard_privacy before insert or update on public.contacts
  for each row execute function public.guard_contact_privacy();
revoke execute on function public.guard_contact_privacy() from public, anon, authenticated;

-- Contacts that already have a consent record.
update public.contacts set lawful_basis = 'consent' where consented_at is not null and lawful_basis is null;

-- -----------------------------------------------------------------------------
-- 2. Right of access: everything held about one contact. Admins only, logged.
--    Includes the change history from the audit log, which holds copies of
--    their data. Other people's data (team members) is reduced to names.
-- -----------------------------------------------------------------------------
create function public.export_contact_data(p_contact uuid)
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
        'due_at', a.due_at, 'completed_at', a.completed_at, 'created_at', a.created_at,
        'author', (select p.full_name from public.profiles p where p.id = a.created_by)
      ) order by a.created_at), '[]')
      from public.activities a
      where a.contact_id = p_contact or a.lead_id = any (v_leads)),
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

revoke execute on function public.export_contact_data(uuid) from public, anon;
grant execute on function public.export_contact_data(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Retention rules, per organization. Off unless an admin sets them.
--    - Contacts with no open leads and no activity for `retention_months` move
--      to the trash with their leads, and are purged 30 days later.
--    - Audit log entries older than `audit_retention_months` are deleted.
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column retention_months integer check (retention_months between 1 and 120),
  add column audit_retention_months integer check (audit_retention_months between 1 and 120);

create function public.apply_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org record;
  v_cutoff timestamptz;
  v_contacts uuid[];
  v_leads integer;
  v_audit integer;
  v_total jsonb := '[]';
begin
  for v_org in
    select id, retention_months, audit_retention_months from public.organizations
    where retention_months is not null or audit_retention_months is not null
  loop
    v_contacts := '{}';
    v_leads := 0;
    v_audit := 0;

    if v_org.retention_months is not null then
      v_cutoff := now() - make_interval(months => v_org.retention_months);

      select coalesce(array_agg(c.id), '{}') into v_contacts
      from public.contacts c
      where c.org_id = v_org.id
        and c.deleted_at is null
        and c.updated_at < v_cutoff
        and not exists (
          select 1 from public.leads l
          where l.contact_id = c.id and l.deleted_at is null
            and (l.status = 'open' or l.updated_at >= v_cutoff))
        and not exists (
          select 1 from public.activities a
          where (a.contact_id = c.id or a.lead_id in (select l.id from public.leads l where l.contact_id = c.id))
            and (a.updated_at >= v_cutoff or (a.type = 'task' and a.completed_at is null)));

      update public.leads set deleted_at = now()
      where org_id = v_org.id and contact_id = any (v_contacts) and deleted_at is null;
      get diagnostics v_leads = row_count;
      update public.contacts set deleted_at = now() where id = any (v_contacts);
    end if;

    if v_org.audit_retention_months is not null then
      delete from public.audit_log
      where org_id = v_org.id and created_at < now() - make_interval(months => v_org.audit_retention_months);
      get diagnostics v_audit = row_count;
    end if;

    if cardinality(v_contacts) > 0 or v_audit > 0 then
      insert into public.audit_log (org_id, actor_id, action, entity, entity_id, diff)
      values (v_org.id, null, 'retention', 'organizations', v_org.id,
              jsonb_build_object('contacts_trashed', cardinality(v_contacts), 'leads_trashed', v_leads, 'audit_entries_deleted', v_audit));
      v_total := v_total || jsonb_build_object('org_id', v_org.id, 'contacts', cardinality(v_contacts), 'leads', v_leads, 'audit', v_audit);
    end if;
  end loop;
  return v_total;
end;
$$;

revoke execute on function public.apply_retention() from public, anon, authenticated;
grant execute on function public.apply_retention() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lead-tracker-retention', '7 3 * * *', 'select public.apply_retention()');
  else
    raise notice 'pg_cron is not available: schedule "select public.apply_retention()" daily yourself (see docs/self-hosting.md).';
  end if;
exception when others then
  raise notice 'Could not schedule retention (%). Schedule "select public.apply_retention()" daily yourself.', sqlerrm;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Fix: the single-org guard updated instance_settings without a WHERE
--    clause, which Supabase's API sessions (pg_safeupdate) refuse, so a fresh
--    install couldn't create its organization.
-- -----------------------------------------------------------------------------
create or replace function public.guard_organization_create()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.instance_settings;
begin
  select * into v_settings from public.instance_settings for update;
  if not v_settings.allow_multiple_orgs and v_settings.first_org_created_at is not null then
    raise exception 'This server already has its organization. Ask an admin for an invite.' using errcode = '42501';
  end if;
  -- Hosted: a single account can't mass-create organizations.
  if new.created_by is not null and (
    select count(*) from public.organizations o where o.created_by = new.created_by and o.created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'You''ve created several organizations today. Try again tomorrow.' using errcode = '42501';
  end if;
  update public.instance_settings set first_org_created_at = coalesce(first_org_created_at, now()) where id;
  return new;
end;
$$;
