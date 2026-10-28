-- report() numbers and visibility. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- These tests create several organizations, like a hosted instance.
update public.instance_settings set allow_multiple_orgs = true, first_org_created_at = null;

create schema tests;
create function tests.report_as(p_uid uuid, p_from date, p_to date, p_owner uuid default null) returns jsonb
language plpgsql as $$
declare
  v jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v := public.report(current_setting('test.org')::uuid, p_from, p_to, p_owner, null);
  execute 'reset role';
  return v;
end;
$$;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'rep@test.local', 'authenticated', 'authenticated'),
  ('99999999-9999-9999-9999-999999999999', 'outsider@test.local', 'authenticated', 'authenticated');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select set_config('test.org', public.create_organization('Acme', 'EUR', 'UTC')::text, true);
reset role;
insert into public.memberships (org_id, user_id, role) values (current_setting('test.org')::uuid, '22222222-2222-2222-2222-222222222222', 'member');

-- Stages by position: New(0) Contacted(1) Qualified(2) Proposal(3) Negotiation(4) Won Lost
create function tests.stage(p_name text) returns uuid language sql as $$
  select id from public.pipeline_stages where org_id = current_setting('test.org')::uuid and name = p_name
$$;

-- March 2026: three leads created; one won (5000), one lost, one still open in Proposal.
insert into public.leads (id, org_id, title, owner_id, stage_id, value, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', current_setting('test.org')::uuid, 'A', '11111111-1111-1111-1111-111111111111', tests.stage('New'), 5000, '2026-03-02 10:00+00'),
  ('aaaaaaaa-0000-0000-0000-000000000002', current_setting('test.org')::uuid, 'B', '22222222-2222-2222-2222-222222222222', tests.stage('New'), 1000, '2026-03-05 10:00+00'),
  ('aaaaaaaa-0000-0000-0000-000000000003', current_setting('test.org')::uuid, 'C', '22222222-2222-2222-2222-222222222222', tests.stage('Proposal'), 2000, '2026-03-10 10:00+00');
update public.leads set stage_id = tests.stage('Qualified') where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.leads set stage_id = tests.stage('Won'), closed_at = '2026-03-20 10:00+00' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.leads set stage_id = tests.stage('Lost'), closed_at = '2026-03-25 10:00+00', lost_reason = 'Price' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
-- February: one lead won, for the previous-period comparison.
insert into public.leads (org_id, title, owner_id, stage_id, value, created_at) values
  (current_setting('test.org')::uuid, 'Feb', '11111111-1111-1111-1111-111111111111', tests.stage('New'), 700, '2026-02-10 10:00+00');
update public.leads set stage_id = tests.stage('Won'), closed_at = '2026-02-20 10:00+00' where title = 'Feb';

select set_config('test.r', tests.report_as('11111111-1111-1111-1111-111111111111', '2026-03-01', '2026-03-31')::text, true);

select is((current_setting('test.r')::jsonb #>> '{kpis,new_leads}')::int, 3, 'counts leads created in the period');
select is((current_setting('test.r')::jsonb #>> '{kpis,won_value}')::numeric, 5000::numeric, 'sums won value closed in the period');
select is((current_setting('test.r')::jsonb #>> '{kpis,avg_days_to_close}')::numeric, 18.0, 'average days from created to won');
select is((current_setting('test.r')::jsonb #>> '{previous,won_value}')::numeric, 700::numeric, 'previous period of the same length is reported');
select is((current_setting('test.r')::jsonb #>> '{kpis,open_value}')::numeric, 2000::numeric, 'open pipeline is a snapshot of open leads');
select is(
  (select string_agg(f ->> 'name' || '=' || (f ->> 'reached'), ',') from jsonb_array_elements(current_setting('test.r')::jsonb -> 'funnel') f),
  'New=3,Contacted=2,Qualified=2,Proposal=2,Negotiation=1,Won=1',
  'funnel counts how far each lead got (won leads pass every stage)');
select is((current_setting('test.r')::jsonb #>> '{lost_reasons,0,reason}'), 'Price', 'lost reasons are grouped');
select is(jsonb_array_length(current_setting('test.r')::jsonb -> 'timeline'), 31, 'a one-month period is bucketed by day');
select is(
  (select (x ->> 'won_value')::numeric from jsonb_array_elements(current_setting('test.r')::jsonb -> 'leaderboard') x where x ->> 'user_id' = '11111111-1111-1111-1111-111111111111'),
  5000::numeric, 'leaderboard credits the owner with won value');

-- Members on "own" visibility only get numbers about their own leads.
update public.organizations set lead_visibility = 'own' where id = current_setting('test.org')::uuid;
select is(
  (tests.report_as('22222222-2222-2222-2222-222222222222', '2026-03-01', '2026-03-31') #>> '{kpis,new_leads}')::int,
  2, 'reports respect lead visibility');
select is(
  (tests.report_as('11111111-1111-1111-1111-111111111111', '2026-03-01', '2026-03-31', '22222222-2222-2222-2222-222222222222') #>> '{kpis,lost_count}')::int,
  1, 'the owner filter narrows every number');
select throws_ok(
  $$select tests.report_as('99999999-9999-9999-9999-999999999999', '2026-03-01', '2026-03-31')$$,
  '42501', null, 'non-members cannot run reports');

select * from finish();
rollback;
