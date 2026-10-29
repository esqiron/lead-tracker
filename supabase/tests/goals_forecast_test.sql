-- Goals and report_forecast(). Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'rep@test.local', 'authenticated', 'authenticated'),
  ('99999999-9999-9999-9999-999999999999', 'outsider@test.local', 'authenticated', 'authenticated');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.org', public.create_organization('Acme', 'EUR', 'UTC')::text, true);
reset role;
insert into public.memberships (org_id, user_id, role) values (current_setting('test.org')::uuid, '22222222-2222-2222-2222-222222222222', 'member');

create schema tests;
create function tests.stage(p_name text) returns uuid language sql as $$
  select id from public.pipeline_stages where org_id = current_setting('test.org')::uuid and name = p_name
$$;
create function tests.as_user(p_uid uuid, p_sql text) returns jsonb
language plpgsql as $$
declare
  v jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'select to_jsonb((' || p_sql || '))' into v;
  execute 'reset role';
  return v;
end;
$$;
grant usage on schema tests to authenticated;

-- Quarters relative to today: Q = last quarter (fully past), P = the one before, C = this one.
select set_config('test.c', date_trunc('quarter', current_date)::date::text, true);
select set_config('test.q', (current_setting('test.c')::date - interval '3 months')::date::text, true);
select set_config('test.p', (current_setting('test.c')::date - interval '6 months')::date::text, true);

-- Last quarter: the owner won 1000 on day 5, the rep 500 on day 40. The quarter before: 300.
insert into public.leads (org_id, title, owner_id, stage_id, value, created_at) values
  (current_setting('test.org')::uuid, 'Q1', '11111111-1111-1111-1111-111111111111', tests.stage('New'), 1000, current_setting('test.p')::date),
  (current_setting('test.org')::uuid, 'Q2', '22222222-2222-2222-2222-222222222222', tests.stage('New'), 500, current_setting('test.p')::date),
  (current_setting('test.org')::uuid, 'P1', '11111111-1111-1111-1111-111111111111', tests.stage('New'), 300, current_setting('test.p')::date);
update public.leads set stage_id = tests.stage('Won'), closed_at = current_setting('test.q')::date + 5 + time '12:00' where title = 'Q1';
update public.leads set stage_id = tests.stage('Won'), closed_at = current_setting('test.q')::date + 40 + time '12:00' where title = 'Q2';
update public.leads set stage_id = tests.stage('Won'), closed_at = current_setting('test.p')::date + 2 + time '12:00' where title = 'P1';

-- This quarter: an open 1000 in Proposal (60%) due tomorrow, and a 500 in New (10%) with no close date.
insert into public.leads (org_id, title, owner_id, stage_id, value, expected_close_date) values
  (current_setting('test.org')::uuid, 'Open dated', '11111111-1111-1111-1111-111111111111', tests.stage('Proposal'), 1000, current_date + 1),
  (current_setting('test.org')::uuid, 'Open undated', '22222222-2222-2222-2222-222222222222', tests.stage('New'), 500, null);

insert into public.goals (org_id, user_id, period_start, amount) values
  (current_setting('test.org')::uuid, null, current_setting('test.q')::date, 2000),
  (current_setting('test.org')::uuid, '11111111-1111-1111-1111-111111111111', current_setting('test.q')::date, 1200),
  (current_setting('test.org')::uuid, '11111111-1111-1111-1111-111111111111', current_setting('test.c')::date, 900),
  (current_setting('test.org')::uuid, '22222222-2222-2222-2222-222222222222', current_setting('test.c')::date, 600);

select set_config('test.fq', tests.as_user('11111111-1111-1111-1111-111111111111', $$public.report_forecast(current_setting('test.org')::uuid, current_setting('test.q')::date)$$)::text, true);
select set_config('test.fc', tests.as_user('11111111-1111-1111-1111-111111111111', $$public.report_forecast(current_setting('test.org')::uuid)$$)::text, true);

-- A past quarter.
select is((current_setting('test.fq')::jsonb ->> 'won')::numeric, 1500::numeric, 'past quarter: won value in the quarter');
select is(jsonb_array_length(current_setting('test.fq')::jsonb -> 'actual'), (current_setting('test.c')::date - current_setting('test.q')::date), 'past quarter: one point per day');
select is((current_setting('test.fq')::jsonb -> 'actual' ->> 5)::numeric, 1000::numeric, 'past quarter: won counts from the day it closed');
select is((current_setting('test.fq')::jsonb -> 'previous' ->> -1)::numeric, 300::numeric, 'previous quarter is there for comparison');
select is(jsonb_array_length(current_setting('test.fq')::jsonb -> 'projection'), 1, 'past quarter: nothing left to project');
select is((current_setting('test.fq')::jsonb ->> 'goal')::numeric, 2000::numeric, 'the team goal applies without an owner filter');
select is(
  (tests.as_user('11111111-1111-1111-1111-111111111111', $$public.report_forecast(current_setting('test.org')::uuid, current_setting('test.q')::date, '11111111-1111-1111-1111-111111111111')$$) ->> 'goal')::numeric,
  1200::numeric, 'filtered to one person, their own goal applies');

-- This quarter (dates near the quarter's end can push a deal outside it, so the expectations follow the same rule).
select is((current_setting('test.fc')::jsonb ->> 'goal')::numeric, 1500::numeric, 'with no team goal, members'' goals add up');
select is(
  (current_setting('test.fc')::jsonb ->> 'forecast')::numeric - (current_setting('test.fc')::jsonb ->> 'won')::numeric,
  (case when current_date + 1 < current_setting('test.c')::date + interval '3 months' then 600 else 0 end
   + case when current_date + 10 < current_setting('test.c')::date + interval '3 months' then 50 else 0 end)::numeric,
  'this quarter: open deals add value × win chance by their close date');
select is(
  (current_setting('test.fc')::jsonb ->> 'assumed_count')::int,
  case when current_date + 10 < current_setting('test.c')::date + interval '3 months' then 1 else 0 end,
  'deals without a close date are counted as assumed');
select is(
  (select (o ->> 'goal')::numeric from jsonb_array_elements(current_setting('test.fc')::jsonb -> 'owners') o where o ->> 'user_id' = '22222222-2222-2222-2222-222222222222'),
  600::numeric, 'per person: goal for this quarter');

-- Goals: members read, only admins write.
select is(tests.as_user('22222222-2222-2222-2222-222222222222', $$(select count(*) from public.goals)$$), '4'::jsonb, 'members can read goals');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.goals (org_id, period_start, amount) values (current_setting('test.org')::uuid, current_setting('test.c')::date + interval '3 months', 5000)$$,
  '42501', null, 'only admins set goals');
reset role;
select throws_ok(
  $$select tests.as_user('99999999-9999-9999-9999-999999999999', 'public.report_forecast(current_setting(''test.org'')::uuid)')$$,
  '42501', null, 'non-members cannot read the forecast');

select * from finish();
rollback;
