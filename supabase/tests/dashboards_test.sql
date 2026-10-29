-- Dashboards table: who sees and edits what. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'rep@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'viewer@test.local', 'authenticated', 'authenticated'),
  ('99999999-9999-9999-9999-999999999999', 'outsider@test.local', 'authenticated', 'authenticated');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.org', public.create_organization('Acme', 'EUR', 'UTC')::text, true);
reset role;
insert into public.memberships (org_id, user_id, role) values
  (current_setting('test.org')::uuid, '22222222-2222-2222-2222-222222222222', 'member'),
  (current_setting('test.org')::uuid, '33333333-3333-3333-3333-333333333333', 'viewer');

create schema tests;
create function tests.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
grant usage on schema tests to authenticated;
grant execute on function tests.as_user(uuid) to authenticated;

-- The owner (admin) shares one; the rep keeps one private and shares one.
select tests.as_user('11111111-1111-1111-1111-111111111111');
insert into public.dashboards (id, org_id, name, visibility) values ('dddddddd-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Team', 'org');
select tests.as_user('22222222-2222-2222-2222-222222222222');
insert into public.dashboards (id, org_id, name, visibility) values
  ('dddddddd-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'Mine', 'private'),
  ('dddddddd-0000-0000-0000-000000000003', current_setting('test.org')::uuid, 'Rep shared', 'org');

select results_eq(
  $$select name from public.dashboards order by name$$,
  array['Mine', 'Rep shared', 'Team'],
  'a member sees shared dashboards and their own private ones');

update public.dashboards set name = 'Renamed' where id = 'dddddddd-0000-0000-0000-000000000001';
select is((select name from public.dashboards where id = 'dddddddd-0000-0000-0000-000000000001'), 'Team', 'a member cannot edit someone else''s shared dashboard');

update public.dashboards set created_by = '11111111-1111-1111-1111-111111111111', name = 'Still mine' where id = 'dddddddd-0000-0000-0000-000000000002';
select is((select created_by::text || ' ' || name from public.dashboards where id = 'dddddddd-0000-0000-0000-000000000002'),
  '22222222-2222-2222-2222-222222222222 Still mine', 'the creator never changes');

select throws_ok(
  $$insert into public.dashboards (org_id, name, created_by) values (current_setting('test.org')::uuid, 'Spoof', '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'you can only create dashboards as yourself');

select throws_ok(
  $$insert into public.dashboards (org_id, name, layout) values (current_setting('test.org')::uuid, 'Bad', '{"not": "a list"}')$$,
  '23514', null, 'the layout must be a list');

select tests.as_user('11111111-1111-1111-1111-111111111111');
select results_eq($$select name from public.dashboards order by name$$, array['Rep shared', 'Team'], 'admins do not see other people''s private dashboards');

update public.dashboards set name = 'Rep shared (tidied)' where id = 'dddddddd-0000-0000-0000-000000000003';
select is((select name from public.dashboards where id = 'dddddddd-0000-0000-0000-000000000003'), 'Rep shared (tidied)', 'admins can edit dashboards shared with the org');

update public.dashboards set deleted_at = now() where id = 'dddddddd-0000-0000-0000-000000000003';
select isnt((select deleted_at from public.dashboards where id = 'dddddddd-0000-0000-0000-000000000003'), null, 'admins can soft-delete shared dashboards');

select tests.as_user('33333333-3333-3333-3333-333333333333');
select lives_ok(
  $$insert into public.dashboards (org_id, name) values (current_setting('test.org')::uuid, 'Viewer private')$$,
  'viewers can keep private dashboards');
select throws_ok(
  $$insert into public.dashboards (org_id, name, visibility) values (current_setting('test.org')::uuid, 'Viewer shared', 'org')$$,
  '42501', null, 'viewers cannot share dashboards with the org');

select tests.as_user('99999999-9999-9999-9999-999999999999');
select is((select count(*)::int from public.dashboards), 0, 'outsiders see no dashboards');

reset role;
select * from finish();
rollback;
