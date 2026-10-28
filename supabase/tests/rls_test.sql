-- Row Level Security and RPC permission tests. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- These tests create several organizations, like a hosted instance.
update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

-- Runs SQL as a given user (authenticated role + JWT sub), then switches back.
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

-- Users: owner, admin, member, viewer, outsider
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'admin@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'member@test.local', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'viewer@test.local', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'outsider@test.local', 'authenticated', 'authenticated');

select set_config('test.org', tests.as_user_value('11111111-1111-1111-1111-111111111111', $$select public.create_organization('Acme')::text$$), true);
select set_config('test.stage', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and position = 0), true);
select set_config('test.won', (select id::text from public.pipeline_stages where org_id = current_setting('test.org')::uuid and is_won), true);

insert into public.memberships (org_id, user_id, role) values
  (current_setting('test.org')::uuid, '22222222-2222-2222-2222-222222222222', 'admin'),
  (current_setting('test.org')::uuid, '33333333-3333-3333-3333-333333333333', 'member'),
  (current_setting('test.org')::uuid, '44444444-4444-4444-4444-444444444444', 'viewer');

insert into public.leads (id, org_id, title, owner_id, stage_id, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Owner lead',
   '11111111-1111-1111-1111-111111111111', current_setting('test.stage')::uuid, '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'Member lead',
   '33333333-3333-3333-3333-333333333333', current_setting('test.stage')::uuid, '33333333-3333-3333-3333-333333333333');

-- Defaults from create_organization
select is((select count(*)::int from public.pipeline_stages where org_id = current_setting('test.org')::uuid), 7, 'new org gets 7 default stages');
select is((select role::text from public.memberships where user_id = '11111111-1111-1111-1111-111111111111'), 'owner', 'creator becomes owner');

-- Tenant isolation
select is(tests.as_user_value('55555555-5555-5555-5555-555555555555', 'select count(*) from public.organizations'), '0', 'outsider sees no organizations');
select is(tests.as_user_value('55555555-5555-5555-5555-555555555555', 'select count(*) from public.leads'), '0', 'outsider sees no leads');

-- Visibility
select is(tests.as_user_value('33333333-3333-3333-3333-333333333333', 'select count(*) from public.leads'), '2', 'member sees all leads when visibility = all');
select tests.as_user('22222222-2222-2222-2222-222222222222', format($$update public.organizations set lead_visibility = 'own' where id = %L$$, current_setting('test.org')));
select is(tests.as_user_value('33333333-3333-3333-3333-333333333333', 'select count(*) from public.leads'), '1', 'member sees only own leads when visibility = own');
select is(tests.as_user_value('44444444-4444-4444-4444-444444444444', 'select count(*) from public.leads'), '2', 'viewer always sees all leads');
select tests.as_user('22222222-2222-2222-2222-222222222222', format($$update public.organizations set lead_visibility = 'all' where id = %L$$, current_setting('test.org')));

-- Write permissions
select throws_ok(
  format('select tests.as_user(%L, %L)', '44444444-4444-4444-4444-444444444444',
    format('insert into public.leads (org_id, title, stage_id) values (%L, %L, %L)', current_setting('test.org'), 'x', current_setting('test.stage'))),
  '42501', null, 'viewer cannot create leads');
select is(
  tests.as_user_value('33333333-3333-3333-3333-333333333333',
    format($$with u as (update public.organizations set name = 'Hacked' where id = %L returning 1) select count(*) from u$$, current_setting('test.org'))),
  '0', 'member cannot change organization settings');
select throws_ok(
  format('select tests.as_user(%L, %L)', '33333333-3333-3333-3333-333333333333',
    format('insert into public.invitations (org_id, email, role, token_hash, invited_by) values (%L, %L, %L, %L, %L)',
      current_setting('test.org'), 'x@test.local', 'member', 'h1', '33333333-3333-3333-3333-333333333333')),
  '42501', null, 'member cannot invite');
select throws_ok(
  format('select tests.as_user(%L, %L)', '22222222-2222-2222-2222-222222222222',
    format('insert into public.invitations (org_id, email, role, token_hash, invited_by) values (%L, %L, %L, %L, %L)',
      current_setting('test.org'), 'x@test.local', 'owner', 'h2', '22222222-2222-2222-2222-222222222222')),
  null, null, 'nobody can invite an owner');
select throws_ok(
  format('select tests.as_user(%L, %L)', '33333333-3333-3333-3333-333333333333',
    format('select public.load_sample_data(%L)', current_setting('test.org'))),
  '42501', null, 'member cannot load sample data');

-- Soft delete guard
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.leads set deleted_at = now() where id = ''aaaaaaaa-0000-0000-0000-000000000001''')$$,
  '42501', null, 'member cannot trash someone else''s lead');
select lives_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'update public.leads set deleted_at = now() where id = ''aaaaaaaa-0000-0000-0000-000000000002''')$$,
  'member can trash their own lead');

-- Role management
select throws_ok(
  $$select tests.as_user('33333333-3333-3333-3333-333333333333', 'select public.update_member_role((select id from public.memberships where user_id = ''44444444-4444-4444-4444-444444444444''), ''admin'')')$$,
  '42501', null, 'member cannot change roles');
select throws_ok(
  $$select tests.as_user('22222222-2222-2222-2222-222222222222', 'select public.update_member_role((select id from public.memberships where user_id = ''11111111-1111-1111-1111-111111111111''), ''member'')')$$,
  '42501', null, 'admin cannot demote the owner');

-- Pipeline triggers
select is((select count(*)::int from public.lead_stage_history where lead_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 1, 'creating a lead records stage history');
select tests.as_user('22222222-2222-2222-2222-222222222222',
  format($$update public.leads set stage_id = %L where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, current_setting('test.won')));
select is((select status::text from public.leads where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'won', 'moving to the Won stage marks the lead won');

-- Cross-org references are rejected by the composite foreign keys
select set_config('test.other_org', tests.as_user_value('55555555-5555-5555-5555-555555555555', $$select public.create_organization('Other')::text$$), true);
insert into public.contacts (id, org_id, first_name) values ('cccccccc-0000-0000-0000-000000000001', current_setting('test.other_org')::uuid, 'Elsewhere');
select throws_ok(
  format($$insert into public.leads (org_id, title, stage_id, contact_id) values (%L, 'Cross', %L, 'cccccccc-0000-0000-0000-000000000001')$$,
    current_setting('test.org'), current_setting('test.stage')),
  '23503', null, 'a lead cannot point at another org''s contact');

-- Invitations
insert into public.invitations (org_id, email, role, token_hash, invited_by)
values (current_setting('test.org')::uuid, 'invitee@test.local', 'member', encode(sha256(convert_to('tok-123', 'UTF8')), 'hex'), '11111111-1111-1111-1111-111111111111');
select throws_ok(
  $$select tests.as_user('55555555-5555-5555-5555-555555555555', 'select public.accept_invitation(''tok-123'')')$$,
  '42501', null, 'an invitation only works for the invited email');

-- Deleting an organization removes everything it owns
select lives_ok(
  format('select tests.as_user(%L, %L)', '11111111-1111-1111-1111-111111111111',
    format('delete from public.organizations where id = %L', current_setting('test.org'))),
  'owner can delete the organization');
select is((select count(*)::int from public.leads where org_id = current_setting('test.org')::uuid), 0, 'organization delete cascades to leads');

select * from finish();
rollback;
