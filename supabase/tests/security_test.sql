-- Regression tests for the security review: each test replays an attack
-- through the same paths a user has (the `authenticated` role with their JWT).
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

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

-- A fresh single-org instance.
update public.instance_settings set allow_multiple_orgs = false, first_org_created_at = null;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated', now()),
  ('22222222-2222-2222-2222-222222222222', 'admin@test.local', 'authenticated', 'authenticated', now()),
  ('33333333-3333-3333-3333-333333333333', 'member@test.local', 'authenticated', 'authenticated', now()),
  ('44444444-4444-4444-4444-444444444444', 'viewer@test.local', 'authenticated', 'authenticated', now()),
  ('55555555-5555-5555-5555-555555555555', 'invitee@test.local', 'authenticated', 'authenticated', null);

select set_config('test.org', tests.as_user_value('11111111-1111-1111-1111-111111111111', $$select public.create_organization('Acme')::text$$), true);
select set_config('test.stage', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and position = 0), true);
insert into public.memberships (org_id, user_id, role) values
  (current_setting('test.org')::uuid, '22222222-2222-2222-2222-222222222222', 'admin'),
  (current_setting('test.org')::uuid, '33333333-3333-3333-3333-333333333333', 'member'),
  (current_setting('test.org')::uuid, '44444444-4444-4444-4444-444444444444', 'viewer');
update public.organizations set lead_visibility = 'own', setup_completed_at = now() where id = current_setting('test.org')::uuid;

insert into public.leads (id, org_id, title, owner_id, stage_id, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Owner lead', '11111111-1111-1111-1111-111111111111', current_setting('test.stage')::uuid, '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'Member lead', '33333333-3333-3333-3333-333333333333', current_setting('test.stage')::uuid, '33333333-3333-3333-3333-333333333333');

-- Organizations ---------------------------------------------------------------
select throws_ok(
  $$select tests.as_user('44444444-4444-4444-4444-444444444444', 'select public.create_organization(''Rogue'')')$$,
  '42501', null, 'a self-hosted instance refuses a second organization, even via the API');
select is(tests.as_user_value('44444444-4444-4444-4444-444444444444', 'select public.can_create_organization()::text'), 'false', 'can_create_organization() agrees');

-- Activities ----------------------------------------------------------------------
select throws_ok(
  format('select tests.as_user(%L, %L)', '33333333-3333-3333-3333-333333333333',
    format('insert into public.activities (org_id, type, lead_id, body) values (%L, %L, %L, %L)', current_setting('test.org'), 'note', 'aaaaaaaa-0000-0000-0000-000000000001', 'planted')),
  '42501', null, 'a member cannot attach notes to a lead they cannot see');
select tests.as_user('33333333-3333-3333-3333-333333333333',
  format('insert into public.activities (id, org_id, type, lead_id, body) values (%L, %L, %L, %L, %L)', 'bbbbbbbb-0000-0000-0000-000000000001', current_setting('test.org'), 'note', 'aaaaaaaa-0000-0000-0000-000000000002', 'mine'));
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.activities set lead_id = ''aaaaaaaa-0000-0000-0000-000000000001'' where id = ''bbbbbbbb-0000-0000-0000-000000000001''')$$,
  '42501', null, 'an activity cannot be moved onto another lead');
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.activities set created_by = ''11111111-1111-1111-1111-111111111111'' where id = ''bbbbbbbb-0000-0000-0000-000000000001''')$$,
  '42501', null, 'the author of an activity cannot be forged');
select throws_ok(
  format('select tests.as_user(%L, %L)', '33333333-3333-3333-3333-333333333333',
    format('insert into public.activities (org_id, type, lead_id, body, source) values (%L, %L, %L, %L, %L)', current_setting('test.org'), 'note', 'aaaaaaaa-0000-0000-0000-000000000002', 'x', 'form: fake')),
  '42501', null, 'users cannot label their own notes as captured');
update public.memberships set role = 'viewer' where user_id = '33333333-3333-3333-3333-333333333333';
select is(
  tests.as_user_value('33333333-3333-3333-3333-333333333333', $$with d as (delete from public.activities where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning 1) select count(*)::text from d$$),
  '0', 'a demoted viewer cannot delete activities');
update public.memberships set role = 'member' where user_id = '33333333-3333-3333-3333-333333333333';

-- Leads ----------------------------------------------------------------------------
select tests.as_user('33333333-3333-3333-3333-333333333333', $$update public.leads set status = 'won', closed_at = '2020-01-01', value = 999999 where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$);
select is((select status::text || '|' || coalesce(closed_at::text, '-') from public.leads where id = 'aaaaaaaa-0000-0000-0000-000000000002'), 'open|-', 'status always follows the stage');
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.leads set created_by = ''11111111-1111-1111-1111-111111111111'' where id = ''aaaaaaaa-0000-0000-0000-000000000002''')$$,
  '42501', null, 'the creator of a lead cannot be changed');
update public.organizations set lead_visibility = 'all' where id = current_setting('test.org')::uuid;
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.leads set owner_id = ''33333333-3333-3333-3333-333333333333'' where id = ''aaaaaaaa-0000-0000-0000-000000000001''')$$,
  '42501', null, 'a member cannot take over someone else''s lead (and then trash it)');
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.leads set owner_id = ''55555555-5555-5555-5555-555555555555'' where id = ''aaaaaaaa-0000-0000-0000-000000000002''')$$,
  '23503', null, 'leads can only be assigned to members of the organization');
update public.organizations set lead_visibility = 'own' where id = current_setting('test.org')::uuid;

-- Capture references -------------------------------------------------------------
insert into public.capture_forms (id, org_id, name) values ('ffffffff-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Form');
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.leads set capture_form_id = ''ffffffff-0000-0000-0000-000000000001'' where id = ''aaaaaaaa-0000-0000-0000-000000000002''')$$,
  '42501', null, 'users cannot fake where a lead came from');

-- Invitations ----------------------------------------------------------------------
select tests.as_user('22222222-2222-2222-2222-222222222222',
  format('insert into public.invitations (id, org_id, email, role, token_hash, invited_by, expires_at) values (%L, %L, %L, %L, %L, %L, %L)',
    'cccccccc-0000-0000-0000-000000000001', current_setting('test.org'), 'invitee@test.local', 'admin', encode(sha256(convert_to('backdoor', 'UTF8')), 'hex'), '22222222-2222-2222-2222-222222222222', '2099-01-01'));
select ok((select expires_at < now() + interval '8 days' from public.invitations where id = 'cccccccc-0000-0000-0000-000000000001'), 'the database sets invitation expiry, ignoring the client');
select throws_ok(
  $$select tests.as_user('22222222-2222-2222-2222-222222222222', 'update public.invitations set expires_at = ''2099-01-01'' where id = ''cccccccc-0000-0000-0000-000000000001''')$$,
  '42501', null, 'admins cannot extend invitations');
select throws_ok(
  $$select tests.as_user('55555555-5555-5555-5555-555555555555', 'select public.accept_invitation(''backdoor'')')$$,
  '42501', null, 'an invitation cannot be accepted with an unconfirmed email');
update auth.users set email_confirmed_at = now() where id = '55555555-5555-5555-5555-555555555555';
update public.memberships set role = 'member' where user_id = '22222222-2222-2222-2222-222222222222';
select isnt((select revoked_at from public.invitations where id = 'cccccccc-0000-0000-0000-000000000001'), null, 'demoting an admin revokes their pending invitations');
select throws_ok(
  $$select tests.as_user('55555555-5555-5555-5555-555555555555', 'select public.accept_invitation(''backdoor'')')$$,
  'P0002', null, 'a revoked backdoor invitation cannot be used');

-- Profiles ----------------------------------------------------------------------------
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.profiles set email = ''ceo@victim.test'' where id = ''33333333-3333-3333-3333-333333333333''')$$,
  '42501', null, 'users cannot change the email the app trusts');

-- GDPR --------------------------------------------------------------------------------
insert into public.contacts (id, org_id, first_name, email, owner_id) values
  ('dddddddd-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Erin', 'erin@person.test', '11111111-1111-1111-1111-111111111111');
insert into public.leads (id, org_id, title, contact_id, owner_id, stage_id) values
  ('aaaaaaaa-0000-0000-0000-000000000003', current_setting('test.org')::uuid, 'Deal with Erin', 'dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', current_setting('test.stage')::uuid);
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'select public.erase_contact(''dddddddd-0000-0000-0000-000000000001'')')$$,
  '42501', null, 'members cannot erase contacts');
select tests.as_user('11111111-1111-1111-1111-111111111111', $$select public.erase_contact('dddddddd-0000-0000-0000-000000000001')$$);
select is(
  (select count(*)::int from public.audit_log where diff::text like '%erin@person.test%' or diff::text like '%Deal with Erin%'),
  0, 'erasing a contact leaves no copy of their data in the audit log');
select is((select count(*)::int from public.leads where id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0, 'their leads are gone');
select throws_ok(
  format('select tests.as_user(%L, %L)', '22222222-2222-2222-2222-222222222222', format('select public.export_org_data(%L)', current_setting('test.org'))),
  '42501', null, 'only the owner can export everything');
select tests.as_user('11111111-1111-1111-1111-111111111111', format('select public.export_org_data(%L)', current_setting('test.org')));
select is((select count(*)::int from public.audit_log where action = 'export' and entity = 'organizations'), 1, 'a full export is logged by the database');
update public.leads set deleted_at = now() - interval '31 days' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
select throws_ok($$select tests.as_user('11111111-1111-1111-1111-111111111111', 'select public.purge_trash(30)')$$, '42501', null, 'users cannot run the trash purge');
select is((public.purge_trash(30) ->> 'leads')::int, 1, 'the purge removes records trashed over 30 days ago');

select * from finish();
rollback;
