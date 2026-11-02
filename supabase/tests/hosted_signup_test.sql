-- Hosted sign-up: terms acceptance on profiles and organizations.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

create schema tests;
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
create function tests.as_user_sql(p_uid uuid, p_sql text) returns text
language sql as $$ select format('select tests.as_user_value(%L, %L)', p_uid, p_sql) $$;

update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

-- 1: signed up and accepted. 2: joined by invite, never accepted.
insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'signup@test.local', 'authenticated', 'authenticated', now()),
  ('22222222-2222-2222-2222-222222222222', 'invited@test.local', 'authenticated', 'authenticated', now());

-- What the sign-up action does with the service role.
update public.profiles
set terms_accepted_at = '2026-11-02 10:00+00', terms_version = '2 November 2026',
    special_clauses_accepted_at = '2026-11-02 10:00+00', special_clauses_version = '2 November 2026'
where id = '11111111-1111-1111-1111-111111111111';

-- -----------------------------------------------------------------------------
-- 1. Profiles
-- -----------------------------------------------------------------------------
select throws_ok(tests.as_user_sql('22222222-2222-2222-2222-222222222222',
    $$update public.profiles set terms_accepted_at = now(), terms_version = 'x' where id = auth.uid() returning id::text$$),
  '42501', null, 'users can''t record an acceptance on their own profile');
select throws_ok(tests.as_user_sql('11111111-1111-1111-1111-111111111111',
    $$update public.profiles set special_clauses_version = null where id = auth.uid() returning id::text$$),
  '42501', null, 'users can''t clear or change their acceptance');
select is(tests.as_user_value('11111111-1111-1111-1111-111111111111',
    $$update public.profiles set full_name = 'Sam' where id = auth.uid() returning full_name$$),
  'Sam', 'users can still change their name');

-- -----------------------------------------------------------------------------
-- 2. Organizations copy their creator's acceptance
-- -----------------------------------------------------------------------------
select set_config('test.org', tests.as_user_value('11111111-1111-1111-1111-111111111111',
  $$select public.create_organization('Signed up')::text$$), true);
select set_config('test.invited_org', tests.as_user_value('22222222-2222-2222-2222-222222222222',
  $$select public.create_organization('Invited')::text$$), true);

select is((select terms_version from public.organizations where id = current_setting('test.org')::uuid),
  '2 November 2026', 'a new organization records the terms version its creator accepted');
select is((select special_clauses_accepted_at from public.organizations where id = current_setting('test.org')::uuid),
  '2026-11-02 10:00+00'::timestamptz, 'and when the special clauses were accepted');
select is((select terms_accepted_by from public.organizations where id = current_setting('test.org')::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid, 'and who accepted them');
select ok((select terms_accepted_at is null and terms_accepted_by is null from public.organizations where id = current_setting('test.invited_org')::uuid),
  'an organization created by someone who never accepted records nothing');

select throws_ok(tests.as_user_sql('22222222-2222-2222-2222-222222222222',
    format($$update public.organizations set terms_accepted_at = now(), terms_version = 'x' where id = %L returning id::text$$, current_setting('test.invited_org'))),
  '42501', null, 'owners can''t write an acceptance on their organization');
select throws_ok(tests.as_user_sql('11111111-1111-1111-1111-111111111111',
    format($$update public.organizations set terms_accepted_by = null where id = %L returning id::text$$, current_setting('test.org'))),
  '42501', null, 'or change the recorded one');
select is(tests.as_user_value('11111111-1111-1111-1111-111111111111',
    format($$update public.organizations set name = 'Renamed' where id = %L returning name$$, current_setting('test.org'))),
  'Renamed', 'owners can still edit their organization');

-- The service role (what the app uses when someone re-accepts new terms) can.
update public.organizations set terms_version = '1 January 2027' where id = current_setting('test.org')::uuid;
select is((select terms_version from public.organizations where id = current_setting('test.org')::uuid),
  '1 January 2027', 'the server can update the acceptance');

select * from finish();
rollback;
