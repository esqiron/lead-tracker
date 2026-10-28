-- GDPR support: consent records, withdrawal, do-not-contact, per-contact
-- export and retention rules. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

create schema tests;
create function tests.as_user(p_uid uuid, p_sql text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute p_sql;
  execute 'reset role';
end;
$$;
create function tests.as_user_value(p_uid uuid, p_sql text) returns text
language plpgsql as $$
declare
  v text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute p_sql into v;
  execute 'reset role';
  return v;
end;
$$;

update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated', now()),
  ('22222222-2222-2222-2222-222222222222', 'admin@test.local', 'authenticated', 'authenticated', now()),
  ('33333333-3333-3333-3333-333333333333', 'member@test.local', 'authenticated', 'authenticated', now()),
  ('66666666-6666-6666-6666-666666666666', 'other@test.local', 'authenticated', 'authenticated', now());

select set_config('test.org', tests.as_user_value('11111111-1111-1111-1111-111111111111', $$select public.create_organization('Acme')::text$$), true);
select set_config('test.other_org', tests.as_user_value('66666666-6666-6666-6666-666666666666', $$select public.create_organization('Other')::text$$), true);
select set_config('test.stage', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and position = 0), true);
select set_config('test.won', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and is_won), true);
insert into public.memberships (org_id, user_id, role) values
  (current_setting('test.org')::uuid, '22222222-2222-2222-2222-222222222222', 'admin'),
  (current_setting('test.org')::uuid, '33333333-3333-3333-3333-333333333333', 'member');
update public.organizations set setup_completed_at = now() where id = current_setting('test.org')::uuid;

-- A contact who consented through a form (written by trusted code).
insert into public.contacts (id, org_id, first_name, email, owner_id, consent_text, consented_at, consent_source) values
  ('cccccccc-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Ana', 'ana@example.com', '33333333-3333-3333-3333-333333333333',
   'You may contact me', now() - interval '1 day', 'form:abc');
insert into public.contacts (id, org_id, first_name, owner_id) values
  ('cccccccc-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'Bo', '33333333-3333-3333-3333-333333333333');
insert into public.leads (id, org_id, title, contact_id, stage_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Ana deal', 'cccccccc-0000-0000-0000-000000000001', current_setting('test.stage')::uuid);
insert into public.activities (org_id, type, contact_id, body) values
  (current_setting('test.org')::uuid, 'note', 'cccccccc-0000-0000-0000-000000000001', 'Called Ana');

-- Consent records ---------------------------------------------------------------
select is((select lawful_basis::text from public.contacts where id = 'cccccccc-0000-0000-0000-000000000001'), 'consent',
  'a recorded consent sets consent as the lawful basis');
select throws_ok(
  format('select tests.as_user(%L, %L)', '33333333-3333-3333-3333-333333333333',
    format('insert into public.contacts (org_id, first_name, consent_text, consented_at) values (%L, %L, %L, now())', current_setting('test.org'), 'Fake', 'agreed')),
  '42501', null, 'users cannot create contacts with a forged consent record');
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.contacts set consented_at = now() - interval ''5 years'' where id = ''cccccccc-0000-0000-0000-000000000001''')$$,
  '42501', null, 'users cannot change a consent record');
select throws_ok(
  $$select tests.as_user('22222222-2222-2222-2222-222222222222', 'update public.contacts set consent_text = null where id = ''cccccccc-0000-0000-0000-000000000001''')$$,
  '42501', null, 'admins cannot change a consent record either');

-- Withdrawal and do-not-contact -------------------------------------------------
select tests.as_user('33333333-3333-3333-3333-333333333333',
  $$update public.contacts set consent_withdrawn_at = '2000-01-01' where id = 'cccccccc-0000-0000-0000-000000000001'$$);
select is((select consent_withdrawn_at from public.contacts where id = 'cccccccc-0000-0000-0000-000000000001'), now(),
  'a member can withdraw consent, stamped with the database time');
select is((select do_not_contact_at from public.contacts where id = 'cccccccc-0000-0000-0000-000000000001'), now(),
  'withdrawing consent marks the contact do-not-contact');
select throws_ok(
  $$select tests.as_user('22222222-2222-2222-2222-222222222222', 'update public.contacts set consent_withdrawn_at = null where id = ''cccccccc-0000-0000-0000-000000000001''')$$,
  '42501', null, 'a withdrawal cannot be undone');
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.contacts set do_not_contact_at = null where id = ''cccccccc-0000-0000-0000-000000000001''')$$,
  '42501', null, 'members cannot lift do-not-contact');
select throws_ok(
  $$select tests.as_user('22222222-2222-2222-2222-222222222222', 'update public.contacts set do_not_contact_at = null where id = ''cccccccc-0000-0000-0000-000000000001''')$$,
  '42501', null, 'admins cannot lift do-not-contact while the basis is a withdrawn consent');
select lives_ok(
  $$select tests.as_user('22222222-2222-2222-2222-222222222222', 'update public.contacts set lawful_basis = ''contract'', do_not_contact_at = null where id = ''cccccccc-0000-0000-0000-000000000001''')$$,
  'admins can lift do-not-contact under another lawful basis');

select tests.as_user('33333333-3333-3333-3333-333333333333',
  $$update public.contacts set do_not_contact_at = '2000-01-01' where id = 'cccccccc-0000-0000-0000-000000000002'$$);
select is((select do_not_contact_at from public.contacts where id = 'cccccccc-0000-0000-0000-000000000002'), now(),
  'a member can mark someone do-not-contact, stamped with the database time');
select throws_ok(
  format('select tests.as_user(%L, %L)', '33333333-3333-3333-3333-333333333333',
    format('insert into public.contacts (org_id, first_name, consent_withdrawn_at) values (%L, %L, now())', current_setting('test.org'), 'Withdrawn')),
  '42501', null, 'users cannot create a contact with a backdated withdrawal');

-- Right of access ------------------------------------------------------------------
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'select public.export_contact_data(''cccccccc-0000-0000-0000-000000000001'')')$$,
  '42501', null, 'members cannot export a contact''s data');
select throws_ok(
  $$select tests.as_user('66666666-6666-6666-6666-666666666666', 'select public.export_contact_data(''cccccccc-0000-0000-0000-000000000001'')')$$,
  '42501', null, 'admins of another organization cannot export the contact');
select set_config('test.export', tests.as_user_value('22222222-2222-2222-2222-222222222222',
  $$select public.export_contact_data('cccccccc-0000-0000-0000-000000000001')::text$$), true);
select is(current_setting('test.export')::jsonb #>> '{contact,email}', 'ana@example.com', 'the export holds the contact');
select is(jsonb_array_length(current_setting('test.export')::jsonb -> 'leads'), 1, 'the export holds their leads');
select is(current_setting('test.export')::jsonb #>> '{activities,0,body}', 'Called Ana', 'the export holds their activity');
select ok(jsonb_array_length(current_setting('test.export')::jsonb -> 'change_history') > 0, 'the export holds their change history');
select is((select count(*)::int from public.audit_log where action = 'export' and entity = 'contacts' and entity_id = 'cccccccc-0000-0000-0000-000000000001'), 1,
  'the export is logged');

-- Retention -----------------------------------------------------------------------------
select throws_ok($$select tests.as_user('11111111-1111-1111-1111-111111111111', 'select public.apply_retention()')$$,
  '42501', null, 'users cannot run the retention job');

insert into public.contacts (id, org_id, first_name, created_at, updated_at) values
  ('cccccccc-0000-0000-0000-000000000010', current_setting('test.org')::uuid, 'Stale', now() - interval '3 years', now() - interval '2 years'),
  ('cccccccc-0000-0000-0000-000000000011', current_setting('test.org')::uuid, 'Stale but open', now() - interval '3 years', now() - interval '2 years');
insert into public.leads (id, org_id, title, contact_id, stage_id, created_at, updated_at) values
  ('aaaaaaaa-0000-0000-0000-000000000010', current_setting('test.org')::uuid, 'Old won deal', 'cccccccc-0000-0000-0000-000000000010', current_setting('test.won')::uuid, now() - interval '3 years', now() - interval '2 years'),
  ('aaaaaaaa-0000-0000-0000-000000000011', current_setting('test.org')::uuid, 'Still open', 'cccccccc-0000-0000-0000-000000000011', current_setting('test.stage')::uuid, now() - interval '3 years', now() - interval '2 years');
insert into public.audit_log (org_id, action, entity, created_at) values
  (current_setting('test.org')::uuid, 'update', 'contacts', now() - interval '5 years');
update public.organizations set retention_months = 12, audit_retention_months = 24 where id = current_setting('test.org')::uuid;

select public.apply_retention();
select is(
  (select array_agg(first_name order by first_name) from public.contacts where org_id = current_setting('test.org')::uuid and deleted_at is not null),
  array['Stale'], 'only contacts with no open leads and no recent activity go to the trash');
select is((select deleted_at from public.leads where id = 'aaaaaaaa-0000-0000-0000-000000000010'), now(), 'their closed leads go with them');
select is((select count(*)::int from public.audit_log where org_id = current_setting('test.org')::uuid and created_at < now() - interval '24 months'), 0,
  'audit entries past the retention period are deleted');
select is((select diff ->> 'contacts_trashed' from public.audit_log where action = 'retention' and org_id = current_setting('test.org')::uuid), '1',
  'the retention run is logged');

select * from finish();
rollback;
