-- Dashboard data functions: numbers, parity with report(), drill-down and visibility. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

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
create function tests.source(p_name text) returns uuid language sql as $$
  select id from public.lead_sources where org_id = current_setting('test.org')::uuid and name = p_name
$$;
-- Runs a query as a user and returns its result as jsonb.
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
create function tests.ids(p_uid uuid, p_drill text) returns uuid[]
language plpgsql as $$
declare
  v uuid[];
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'select coalesce(array_agg(x order by x), ''{}'') from public.report_drill(' || p_drill || ') x' into v;
  execute 'reset role';
  return v;
end;
$$;

-- Drill parameters look up stages and sources while running as the user.
grant usage on schema tests to authenticated;
grant execute on function tests.stage(text), tests.source(text) to authenticated;

insert into public.api_keys (id, org_id, name, key_prefix, key_hash)
values ('eeeeeeee-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'Site', 'lt_test', 'hash-dashboards-test');

-- March 2026 (UTC):
--   A  owner, Website, 5000: New 2 Mar → Qualified 10 Mar → Won 20 Mar
--   B  rep, Referral, 1000:  New 5 Mar → Lost 25 Mar (Price)
--   C  rep, no source, 2000: Proposal since 10 Mar, open (we age it to 40 days below)
--   D  rep, Website, 300, via API 12 Mar 09:00: inbound email 09:30, call 11:00 (2 h reply)
--   E  nobody, Website, 0, via API 15 Mar: no reply yet
-- February: one 700 lead won, for the previous period.
insert into public.leads (id, org_id, title, owner_id, stage_id, source_id, value, created_at, api_key_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', current_setting('test.org')::uuid, 'A', '11111111-1111-1111-1111-111111111111', tests.stage('New'), tests.source('Website'), 5000, '2026-03-02 10:00+00', null),
  ('aaaaaaaa-0000-0000-0000-00000000000b', current_setting('test.org')::uuid, 'B', '22222222-2222-2222-2222-222222222222', tests.stage('New'), tests.source('Referral'), 1000, '2026-03-05 10:00+00', null),
  ('aaaaaaaa-0000-0000-0000-00000000000c', current_setting('test.org')::uuid, 'C', '22222222-2222-2222-2222-222222222222', tests.stage('Proposal'), null, 2000, '2026-03-10 10:00+00', null),
  ('aaaaaaaa-0000-0000-0000-00000000000d', current_setting('test.org')::uuid, 'D', '22222222-2222-2222-2222-222222222222', tests.stage('New'), tests.source('Website'), 300, '2026-03-12 09:00+00', 'eeeeeeee-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-00000000000e', current_setting('test.org')::uuid, 'E', null, tests.stage('New'), tests.source('Website'), 0, '2026-03-15 09:00+00', 'eeeeeeee-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-0000000000f0', current_setting('test.org')::uuid, 'Feb', '11111111-1111-1111-1111-111111111111', tests.stage('New'), null, 700, '2026-02-10 10:00+00', null);
update public.leads set stage_id = tests.stage('Qualified') where title = 'A';
update public.leads set stage_id = tests.stage('Won'), closed_at = '2026-03-20 10:00+00' where title = 'A';
update public.leads set stage_id = tests.stage('Lost'), closed_at = '2026-03-25 10:00+00', lost_reason = 'Price' where title = 'B';
update public.leads set stage_id = tests.stage('Won'), closed_at = '2026-02-20 10:00+00' where title = 'Feb';

-- Put the stage history on the dates above.
update public.lead_stage_history set changed_at = '2026-03-02 10:00+00' where lead_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and to_stage_id = tests.stage('New');
update public.lead_stage_history set changed_at = '2026-03-10 10:00+00' where lead_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and to_stage_id = tests.stage('Qualified');
update public.lead_stage_history set changed_at = '2026-03-20 10:00+00' where lead_id = 'aaaaaaaa-0000-0000-0000-00000000000a' and to_stage_id = tests.stage('Won');
update public.lead_stage_history set changed_at = '2026-03-05 10:00+00' where lead_id = 'aaaaaaaa-0000-0000-0000-00000000000b' and to_stage_id = tests.stage('New');
update public.lead_stage_history set changed_at = '2026-03-25 10:00+00' where lead_id = 'aaaaaaaa-0000-0000-0000-00000000000b' and to_stage_id = tests.stage('Lost');
update public.lead_stage_history set changed_at = now() - interval '40 days' where lead_id = 'aaaaaaaa-0000-0000-0000-00000000000c';

insert into public.activities (org_id, type, lead_id, body, created_by, created_at, direction) values
  (current_setting('test.org')::uuid, 'note', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Kickoff notes', '11111111-1111-1111-1111-111111111111', '2026-03-03 10:00+00', null),
  (current_setting('test.org')::uuid, 'email', 'aaaaaaaa-0000-0000-0000-00000000000d', 'They wrote back', '22222222-2222-2222-2222-222222222222', '2026-03-12 09:30+00', 'inbound'),
  (current_setting('test.org')::uuid, 'call', 'aaaaaaaa-0000-0000-0000-00000000000d', 'Intro call', '22222222-2222-2222-2222-222222222222', '2026-03-12 11:00+00', null);

-- As the owner, for March.
select set_config('test.r', tests.as_user('11111111-1111-1111-1111-111111111111', $$public.report(current_setting('test.org')::uuid, '2026-03-01', '2026-03-31')$$)::text, true);
select set_config('test.k', tests.as_user('11111111-1111-1111-1111-111111111111', $$public.report_kpis(current_setting('test.org')::uuid, '2026-03-01', '2026-03-31')$$)::text, true);

-- report_kpis
select is((current_setting('test.k')::jsonb #>> '{current,new_leads}')::int, (current_setting('test.r')::jsonb #>> '{kpis,new_leads}')::int, 'kpis: new leads match report()');
select is((current_setting('test.k')::jsonb #>> '{current,won_value}')::numeric, 5000::numeric, 'kpis: won value in the period');
select is((current_setting('test.k')::jsonb #>> '{previous,won_value}')::numeric, (current_setting('test.r')::jsonb #>> '{previous,won_value}')::numeric, 'kpis: previous period matches report()');
select is((current_setting('test.k')::jsonb #>> '{current,activities}')::int, 3, 'kpis: activities members logged in the period');
select is((current_setting('test.k')::jsonb #>> '{current,median_reply_hours}')::numeric, 2.0, 'kpis: median first reply ignores inbound emails and unanswered leads');
select is(jsonb_array_length(current_setting('test.k')::jsonb -> 'series'), 31, 'kpis: a month is bucketed by day');
select is(
  (select (s ->> 'weighted_value')::numeric from jsonb_array_elements(current_setting('test.k')::jsonb -> 'series') s where s ->> 'bucket' = '2026-03-15'),
  3330::numeric, 'kpis: weighted pipeline uses the stage each lead was in at the time');
select is(
  tests.as_user('11111111-1111-1111-1111-111111111111', $$(public.report_kpis(current_setting('test.org')::uuid, current_date - 6, current_date) #>> '{current,weighted_value}')::numeric$$),
  current_setting('test.r')::jsonb #> '{kpis,weighted_value}', 'kpis: weighted pipeline for a period ending today matches report()');

-- report_timeline_split
select set_config('test.t', tests.as_user('11111111-1111-1111-1111-111111111111', $$public.report_timeline_split(current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'won_value', 'source')$$)::text, true);
select is(
  (select (x ->> 'value')::numeric from jsonb_array_elements(current_setting('test.t')::jsonb -> 'rows') x where x ->> 'bucket' = '2026-03-20' and x ->> 'key' = tests.source('Website')::text),
  5000::numeric, 'split: won value lands on the close day under its source');
select is(
  (current_setting('test.t')::jsonb -> 'keys' -> -1 ->> 'name'), 'No source', 'split: keys end with "No source"');
select is(
  tests.as_user('11111111-1111-1111-1111-111111111111', $$(select array_agg(x ->> 'key' order by x ->> 'key' nulls last) from jsonb_array_elements(public.report_timeline_split(current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'new_leads', 'owner') -> 'rows') x)$$),
  to_jsonb(array['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', null]),
  'split: new leads by owner, with unowned leads under a null key');

-- report_aging
select set_config('test.a', tests.as_user('11111111-1111-1111-1111-111111111111', $$public.report_aging(current_setting('test.org')::uuid)$$)::text, true);
select is((select x -> 'counts' from jsonb_array_elements(current_setting('test.a')::jsonb) x where x ->> 'name' = 'Proposal'), '[0,0,0,1,0]'::jsonb, 'aging: 40 days in Proposal is in the 31–60 column');
select is((select x -> 'counts' from jsonb_array_elements(current_setting('test.a')::jsonb) x where x ->> 'name' = 'New'), '[2,0,0,0,0]'::jsonb, 'aging: fresh leads are in the first column');

-- report_first_reply and report_activity_days
select is(
  tests.as_user('11111111-1111-1111-1111-111111111111', $$public.report_first_reply(current_setting('test.org')::uuid, '2026-03-01', '2026-03-31')$$)
    - 'median_hours',
  '{"leads": 2, "replied": 1, "waiting": 1, "within_4h": 1, "buckets": [0, 1, 0, 0, 0]}'::jsonb,
  'first reply: counts form and API leads, replied and waiting');
select is(
  tests.as_user('11111111-1111-1111-1111-111111111111', $$(select (d ->> 'count')::int from jsonb_array_elements(public.report_activity_days(current_setting('test.org')::uuid, '2026-03-01', '2026-03-31')) d where d ->> 'day' = '2026-03-12')$$),
  '2'::jsonb, 'activity days: activities per local day');

-- report_drill
select is(
  tests.ids('11111111-1111-1111-1111-111111111111', $$current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'won', jsonb_build_object('split', 'source', 'key', tests.source('Website'))$$),
  array['aaaaaaaa-0000-0000-0000-00000000000a']::uuid[], 'drill: won by source');
select is(
  cardinality(tests.ids('11111111-1111-1111-1111-111111111111', $$current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'funnel', jsonb_build_object('stage_id', tests.stage('Proposal'))$$)),
  (select (f ->> 'reached')::int from jsonb_array_elements(current_setting('test.r')::jsonb -> 'funnel') f where f ->> 'name' = 'Proposal'),
  'drill: funnel step lists as many leads as report() counts');
select is(
  tests.ids('11111111-1111-1111-1111-111111111111', $$current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'aging', jsonb_build_object('stage_id', tests.stage('Proposal'), 'bucket', 3)$$),
  array['aaaaaaaa-0000-0000-0000-00000000000c']::uuid[], 'drill: aging cell');
select is(
  tests.ids('11111111-1111-1111-1111-111111111111', $$current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'reply', '{"waiting": true}'$$),
  array['aaaaaaaa-0000-0000-0000-00000000000e']::uuid[], 'drill: leads still waiting for a reply');

-- Drill cells add up to what report() shows for the same cell.
select is(
  cardinality(tests.ids('11111111-1111-1111-1111-111111111111', $$current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'lost', '{"reason": "Price"}'$$)),
  (select (r ->> 'count')::int from jsonb_array_elements(current_setting('test.r')::jsonb -> 'lost_reasons') r where r ->> 'reason' = 'Price'),
  'drill: a lost reason lists as many leads as report() counts');
select is(
  cardinality(tests.ids('11111111-1111-1111-1111-111111111111', $$current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'open', jsonb_build_object('stage_id', tests.stage('Proposal'))$$)),
  (select (x ->> 'count')::int from jsonb_array_elements(current_setting('test.r')::jsonb -> 'stages') x where x ->> 'name' = 'Proposal'),
  'drill: an open stage lists as many leads as report() counts');
select is(
  cardinality(tests.ids('11111111-1111-1111-1111-111111111111', $$current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'new', jsonb_build_object('split', 'source', 'key', tests.source('Website'))$$)),
  (select (x ->> 'leads')::int from jsonb_array_elements(current_setting('test.r')::jsonb -> 'sources') x where x ->> 'name' = 'Website'),
  'drill: new leads by source match report() sources');

-- Visibility and access.
update public.organizations set lead_visibility = 'own' where id = current_setting('test.org')::uuid;
select is(
  tests.as_user('22222222-2222-2222-2222-222222222222', $$public.report_kpis(current_setting('test.org')::uuid, '2026-03-01', '2026-03-31') #> '{current,new_leads}'$$),
  tests.as_user('22222222-2222-2222-2222-222222222222', $$public.report(current_setting('test.org')::uuid, '2026-03-01', '2026-03-31') #> '{kpis,new_leads}'$$),
  'visibility: kpis match report() for a member who sees only their own leads');
select ok(
  not ('aaaaaaaa-0000-0000-0000-00000000000a' = any(tests.ids('22222222-2222-2222-2222-222222222222', $$current_setting('test.org')::uuid, '2026-03-01', '2026-03-31', null, null, 'new', '{}'$$))),
  'visibility: drill-down never returns leads the member cannot see');
select throws_ok(
  $$select tests.as_user('99999999-9999-9999-9999-999999999999', 'public.report_kpis(current_setting(''test.org'')::uuid, ''2026-03-01'', ''2026-03-31'')')$$,
  '42501', null, 'non-members cannot read dashboard data');

select * from finish();
rollback;
